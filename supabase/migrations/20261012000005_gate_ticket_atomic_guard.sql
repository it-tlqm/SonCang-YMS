-- ==============================================================================
-- SƠN CẢNG YMS - MIGRATION 005 (CODE-ONLY / LOCAL TESTED / DEPLOY PENDING)
-- File: 20261012000005_gate_ticket_atomic_guard.sql
-- Mục đích: 
--   1. Bảo vệ quy tắc vé vào cổng Sơn Cảng (Guard vé xe đầu kéo mang container: 250.000đ).
--   2. Cung cấp RPC nguyên tử sc_create_vehicle_and_container_visit_atomic (All-or-Nothing).
--   3. Cập nhật sc_create_container_visit để tự động điều chỉnh vé xe đầu kéo thành 250.000đ nếu phát hiện container đi cùng xe vào bãi.
--   4. Bổ sung bảng cấu hình app_yard_billing_settings với empty_in_loaded_out_surcharge mặc định OFF.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BẢNG CẤU HÌNH THAM SỐ BIỂU PHÍ BÃI (app_yard_billing_settings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_yard_billing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yard_id uuid NOT NULL UNIQUE REFERENCES public.app_yards(id) ON DELETE RESTRICT,
  
  -- Cờ cấu hình phụ thu xe đầu kéo vào rỗng nhận cont ra: MẶC ĐỊNH OFF (chưa phê duyệt UAT)
  empty_in_loaded_out_surcharge_enabled boolean NOT NULL DEFAULT false,
  empty_in_loaded_out_surcharge_amount numeric(12, 2) NULL,
  
  -- Ghi nhận cập nhật theo AP10 Four-Eyes / Quản trị
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- GLC-01: Explicit REVOKE và GRANT bảo vệ bảng cấu hình biểu phí
REVOKE ALL ON TABLE public.app_yard_billing_settings FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.app_yard_billing_settings TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.app_yard_billing_settings FROM authenticated;

-- RLS cho bảng app_yard_billing_settings: Cho phép người dùng có quyền quản trị biểu phí, xem biểu phí hoặc tiếp nhận xe
ALTER TABLE public.app_yard_billing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_yard_billing_settings_select_policy ON public.app_yard_billing_settings;
CREATE POLICY app_yard_billing_settings_select_policy 
  ON public.app_yard_billing_settings FOR SELECT TO authenticated
  USING (
    public.sc_can('admin.billing_settings.manage', yard_id) OR 
    public.sc_can('tariff.read', yard_id) OR 
    public.sc_can('vehicle.visit.create', yard_id)
  );


-- Khởi tạo cài đặt mặc định cho các bãi hiện có (mặc định OFF)
INSERT INTO public.app_yard_billing_settings (yard_id, empty_in_loaded_out_surcharge_enabled, empty_in_loaded_out_surcharge_amount)
SELECT id, false, NULL
FROM public.app_yards
ON CONFLICT (yard_id) DO NOTHING;


-- ------------------------------------------------------------------------------
-- 2. CẬP NHẬT sc_create_container_visit: GUARD VÉ XE ĐẦU KÉO
-- ------------------------------------------------------------------------------
-- Khi gắn container vào xe inbound: Nếu xe là DAU_KEO và đang có ticket_amount = 0 (EXEMPT),
-- hệ thống tự động điều chỉnh vé lên 250.000đ (UNPAID) để tránh thất thoát doanh thu.
CREATE OR REPLACE FUNCTION public.sc_create_container_visit(
  p_yard_id uuid,
  p_container_no text,
  p_inbound_vehicle_visit_id uuid,
  p_container_size text DEFAULT NULL,
  p_container_type text DEFAULT 'RF',
  p_idempotency_key text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_cont_id uuid;
  v_clean_no text;
  v_clean_idem text;
  v_veh record;
  v_allows_container boolean;
  v_linked_cont_count integer;
  v_dup_in_yard_count integer;
  v_yard_active boolean;
  v_existing_cont record;
  v_new_row record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  -- Kiểm tra Bãi tồn tại và hoạt động
  SELECT is_active INTO v_yard_active FROM public.app_yards WHERE id = p_yard_id;
  IF NOT FOUND OR v_yard_active = false THEN
    RAISE EXCEPTION 'Bãi không hợp lệ hoặc đang bị vô hiệu hóa: %', p_yard_id;
  END IF;

  IF NOT public.sc_can('container.visit.create', p_yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền tạo lượt container tại bãi tương ứng.';
  END IF;

  v_clean_no := upper(trim(p_container_no));
  IF v_clean_no IS NULL OR length(v_clean_no) < 4 THEN
    RAISE EXCEPTION 'Số container không hợp lệ: %', p_container_no;
  END IF;

  v_clean_idem := NULLIF(trim(p_idempotency_key), '');

  -- Xử lý Idempotency
  IF v_clean_idem IS NOT NULL THEN
    SELECT * INTO v_existing_cont 
    FROM public.app_container_visits 
    WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

    IF FOUND THEN
      IF v_existing_cont.container_no_current = v_clean_no AND 
         v_existing_cont.inbound_vehicle_visit_id = p_inbound_vehicle_visit_id AND
         coalesce(v_existing_cont.container_size, '') = coalesce(trim(p_container_size), '') AND
         coalesce(v_existing_cont.container_type, '') = coalesce(trim(p_container_type), '') THEN
        RETURN v_existing_cont.id;
      ELSE
        RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin lượt container khác.', v_clean_idem;
      END IF;
    END IF;
  END IF;

  -- Kiểm tra trùng số container đang ở trạng thái IN_YARD trong cùng bãi
  SELECT count(*) INTO v_dup_in_yard_count
  FROM public.app_container_visits
  WHERE yard_id = p_yard_id 
    AND container_no_current = v_clean_no 
    AND status = 'IN_YARD';

  IF v_dup_in_yard_count > 0 THEN
    RAISE EXCEPTION 'Cảnh báo trùng số container: Container % hiện đang có một lượt lưu bãi khác ở trạng thái IN_YARD trong cùng bãi. Không tự động gộp lượt. Vui lòng xác minh thực tế.', v_clean_no;
  END IF;

  -- Kiểm tra xe vào bắt buộc phải truyền và tồn tại
  IF p_inbound_vehicle_visit_id IS NULL THEN
    RAISE EXCEPTION 'Lượt xe vào là bắt buộc khi tạo container vào cổng.';
  END IF;

  SELECT * INTO v_veh 
  FROM public.app_vehicle_visits 
  WHERE id = p_inbound_vehicle_visit_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt xe vào: %', p_inbound_vehicle_visit_id;
  END IF;

  IF v_veh.yard_id <> p_yard_id THEN
    RAISE EXCEPTION 'Xe vào và container không cùng bãi. Xe bãi: %, Cont bãi: %', v_veh.yard_id, p_yard_id;
  END IF;

  IF v_veh.status <> 'IN_YARD' THEN
    RAISE EXCEPTION 'Xe đưa container vào phải đang ở trong bãi (IN_YARD). Trạng thái xe hiện tại: %', v_veh.status;
  END IF;

  -- Kiểm tra loại xe được phép chở/kéo container
  SELECT allows_container INTO v_allows_container
  FROM public.app_vehicle_types
  WHERE code = v_veh.vehicle_type;

  IF v_allows_container IS NOT TRUE THEN
    RAISE EXCEPTION 'Loại phương tiện % không được phép tiếp nhận container vào bãi theo cấu hình danh mục phương tiện.', v_veh.vehicle_type;
  END IF;

  -- V1 Baseline: 1 Xe : tối đa 1 Cont inbound
  SELECT count(*) INTO v_linked_cont_count
  FROM public.app_container_visits
  WHERE inbound_vehicle_visit_id = p_inbound_vehicle_visit_id 
    AND status <> 'CANCELLED';

  IF v_linked_cont_count >= 1 THEN
    RAISE EXCEPTION 'Quy tắc vận hành V1 hiện hành: Mỗi lượt xe chỉ tiếp nhận tối đa 1 container. Thao tác tiếp nhận nhiều container trên cùng một lượt xe chưa được phê duyệt UAT.';
  END IF;

  -- BACKEND GUARD: Nếu xe là DAU_KEO và vé xe trước đó đang là 0đ (EXEMPT), tự động điều chỉnh vé lên 250.000đ UNPAID
  IF v_veh.vehicle_type = 'DAU_KEO' AND (v_veh.ticket_amount = 0 OR v_veh.ticket_payment_status = 'EXEMPT') THEN
    UPDATE public.app_vehicle_visits
    SET ticket_amount = 250000,
        ticket_payment_status = 'UNPAID',
        updated_at = now()
    WHERE id = v_veh.id;

    -- Ghi audit log điều chỉnh vé
    PERFORM public.sc_log_audit_event(
      'vehicle.visit.ticket_auto_adjusted', 'app_vehicle_visits', v_veh.id::text,
      p_yard_id, 'AN_NINH', to_jsonb(v_veh),
      jsonb_build_object('ticket_amount', 250000, 'ticket_payment_status', 'UNPAID', 'reason', 'Tự động điều chỉnh vé 250k do gắn container đi vào cùng xe đầu kéo'),
      'Backend Guard: Điều chỉnh vé xe đầu kéo từ 0đ lên 250.000đ khi gắn container inbound'
    );

    -- GLC-02: Đồng bộ khoản phải thu TICKET 250.000đ vào app_charges nếu bảng đã tồn tại
    IF EXISTS (
      SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_charges'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.app_charges WHERE vehicle_visit_id = v_veh.id AND charge_type = 'TICKET'
      ) THEN
        INSERT INTO public.app_charges (
          yard_id, charge_type, vehicle_visit_id, amount, paid_amount, status, notes
        ) VALUES (
          p_yard_id, 'TICKET', v_veh.id, 250000, 0, 'UNPAID',
          'Vé xe đầu kéo gắn container (Guard tự động điều chỉnh 250k)'
        );
      ELSE
        UPDATE public.app_charges
        SET amount = 250000,
            status = 'UNPAID',
            notes = 'Vé xe đầu kéo gắn container (Guard tự động điều chỉnh 250k)'
        WHERE vehicle_visit_id = v_veh.id AND charge_type = 'TICKET' AND status = 'UNPAID';
      END IF;
    END IF;
  END IF;

  -- Thêm container vào bãi
  BEGIN
    INSERT INTO public.app_container_visits (
      yard_id, container_no_current, container_no_original, container_size,
      container_type, inbound_vehicle_visit_id, cargo_status, is_legacy_import,
      legacy_import_notes, created_by, status, idempotency_key
    ) VALUES (
      p_yard_id, v_clean_no, v_clean_no, p_container_size,
      p_container_type, p_inbound_vehicle_visit_id, 'CHUA_XAC_DINH', false,
      NULL, v_actor_id, 'IN_YARD', v_clean_idem
    ) RETURNING id INTO v_cont_id;
  EXCEPTION WHEN unique_violation THEN
    IF v_clean_idem IS NOT NULL THEN
      SELECT * INTO v_existing_cont 
      FROM public.app_container_visits 
      WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

      IF FOUND AND v_existing_cont.container_no_current = v_clean_no AND 
         v_existing_cont.inbound_vehicle_visit_id = p_inbound_vehicle_visit_id AND
         coalesce(v_existing_cont.container_size, '') = coalesce(trim(p_container_size), '') AND
         coalesce(v_existing_cont.container_type, '') = coalesce(trim(p_container_type), '') THEN
        RETURN v_existing_cont.id;
      ELSE
        RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin lượt container khác.', v_clean_idem;
      END IF;
    ELSE
      RAISE;
    END IF;
  END;

  SELECT * INTO v_new_row FROM public.app_container_visits WHERE id = v_cont_id;

  PERFORM public.sc_log_audit_event(
    'container.visit.create', 'app_container_visits', v_cont_id::text,
    p_yard_id, 'AN_NINH', NULL, to_jsonb(v_new_row), 'Tạo lượt container vào bãi'
  );

  RETURN v_cont_id;
END;
$$;


-- ------------------------------------------------------------------------------
-- 3. RPC NGUYÊN TỬ: sc_create_vehicle_and_container_visit_atomic (ALL-OR-NOTHING)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sc_create_vehicle_and_container_visit_atomic(
  p_yard_id uuid,
  p_vehicle_type text,
  p_license_plate text,
  p_driver_name text DEFAULT NULL,
  p_driver_phone text DEFAULT NULL,
  p_ticket_code text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_has_container boolean DEFAULT false,
  p_container_no text DEFAULT NULL,
  p_container_size text DEFAULT NULL,
  p_container_type text DEFAULT 'RF',
  p_cargo_status text DEFAULT 'CHUA_XAC_DINH',
  p_idempotency_key text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_clean_plate text;
  v_clean_idem text;
  v_clean_no text;
  v_cargo_status text;
  v_yard_active boolean;
  v_vtype record;
  v_ticket_price numeric(12, 2);
  v_payment_status text;
  v_vehicle_id uuid;
  v_container_id uuid;
  v_existing_veh record;
  v_existing_cont record;
  v_dup_in_yard_count integer;
  v_new_veh record;
  v_new_cont record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  -- Kiểm tra Bãi
  SELECT is_active INTO v_yard_active FROM public.app_yards WHERE id = p_yard_id;
  IF NOT FOUND OR v_yard_active = false THEN
    RAISE EXCEPTION 'Bãi không hợp lệ hoặc đang bị vô hiệu hóa: %', p_yard_id;
  END IF;

  -- Kiểm tra quyền tạo xe
  IF NOT public.sc_can('vehicle.visit.create', p_yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền tạo lượt xe tại bãi tương ứng.';
  END IF;

  -- Nếu có container, kiểm tra thêm quyền tạo container
  IF p_has_container = true AND NOT public.sc_can('container.visit.create', p_yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền tạo lượt container tại bãi tương ứng.';
  END IF;

  v_clean_plate := upper(trim(p_license_plate));
  v_clean_idem := NULLIF(trim(p_idempotency_key), '');
  v_cargo_status := coalesce(nullif(upper(trim(p_cargo_status)), ''), 'CHUA_XAC_DINH');

  IF v_cargo_status NOT IN ('HANG', 'RONG', 'CHUA_XAC_DINH') THEN
    RAISE EXCEPTION 'Trạng thái hàng/rỗng không hợp lệ: %. Chỉ chấp nhận HANG, RONG hoặc CHUA_XAC_DINH.', p_cargo_status;
  END IF;

  -- GLC-07: Quyền thiết lập trạng thái HÀNG/RỖNG thuộc về Điều phối (container.cargo.update).
  -- Nhân viên An ninh khi tạo lượt tại cổng mặc định là 'CHUA_XAC_DINH'. Nếu truyền 'HANG' hoặc 'RONG' mà không có quyền container.cargo.update thì bị từ chối fail-closed.
  IF v_cargo_status IN ('HANG', 'RONG') AND NOT public.sc_can('container.cargo.update', p_yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Chỉ bộ phận Điều phối mới có quyền thiết lập trạng thái hàng/rỗng (container.cargo.update). Lượt tiếp nhận tại cổng mặc định là CHUA_XAC_DINH.';
  END IF;

  IF p_has_container = true THEN
    v_clean_no := upper(trim(p_container_no));
  END IF;

  -- Xử lý Idempotency cho xe và container trước các validation tạo mới (SC-R3-08: Đối chiếu toàn bộ payload)
  IF v_clean_idem IS NOT NULL THEN
    SELECT * INTO v_existing_veh 
    FROM public.app_vehicle_visits 
    WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

    IF FOUND THEN
      -- Kiểm tra toàn bộ thông tin xe có khớp với lần gọi trước không
      IF v_existing_veh.vehicle_type <> p_vehicle_type OR
         coalesce(v_existing_veh.license_plate, '') <> coalesce(v_clean_plate, '') OR
         coalesce(v_existing_veh.driver_name, '') <> coalesce(trim(p_driver_name), '') OR
         coalesce(v_existing_veh.driver_phone, '') <> coalesce(trim(p_driver_phone), '') OR
         coalesce(v_existing_veh.ticket_code, '') <> coalesce(trim(p_ticket_code), '') OR
         coalesce(v_existing_veh.note, '') <> coalesce(trim(p_note), '') THEN
        RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin xe khác.', v_clean_idem;
      END IF;

      -- Kiểm tra container đi kèm
      SELECT * INTO v_existing_cont
      FROM public.app_container_visits
      WHERE inbound_vehicle_visit_id = v_existing_veh.id;

      IF p_has_container = true THEN
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Idempotency key % trước đó được gọi không có container, yêu cầu mới lại có container.', v_clean_idem;
        END IF;
        IF v_existing_cont.container_no_current <> v_clean_no OR
           coalesce(v_existing_cont.container_size, '') <> coalesce(trim(p_container_size), '') OR
           coalesce(v_existing_cont.container_type, '') <> coalesce(trim(p_container_type), '') OR
           coalesce(v_existing_cont.cargo_status, '') <> v_cargo_status THEN
          RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin container khác.', v_clean_idem;
        END IF;
      ELSE
        IF FOUND THEN
          RAISE EXCEPTION 'Idempotency key % trước đó được gọi có container, yêu cầu mới lại không có container.', v_clean_idem;
        END IF;
      END IF;

      RETURN jsonb_build_object(
        'vehicle_visit_id', v_existing_veh.id,
        'container_visit_id', v_existing_cont.id,
        'ticket_amount', v_existing_veh.ticket_amount,
        'ticket_payment_status', v_existing_veh.ticket_payment_status,
        'is_replay', true
      );
    END IF;
  END IF;

  -- Kiểm tra danh mục loại xe
  SELECT * INTO v_vtype FROM public.app_vehicle_types WHERE code = p_vehicle_type;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loại xe không tồn tại trong danh mục: %', p_vehicle_type;
  END IF;

  IF v_vtype.is_active = false THEN
    RAISE EXCEPTION 'Loại xe % đang bị vô hiệu hóa, không thể tiếp nhận vào bãi.', p_vehicle_type;
  END IF;

  IF v_vtype.default_ticket_amount IS NULL THEN
    RAISE EXCEPTION 'Loại xe % chưa được thiết lập biểu phí hợp lệ. Không thể tiếp nhận hoặc tự động miễn phí.', p_vehicle_type;
  END IF;

  IF p_vehicle_type <> 'XE_BO_3_BANH' AND v_clean_plate IS NULL THEN
    RAISE EXCEPTION 'Biển số xe là bắt buộc đối với loại xe %.', p_vehicle_type;
  END IF;

  -- Kiểm tra container nếu được khai báo
  IF p_has_container = true THEN
    IF v_vtype.allows_container IS NOT TRUE THEN
      RAISE EXCEPTION 'Loại phương tiện % không được phép tiếp nhận container vào bãi theo cấu hình danh mục phương tiện.', p_vehicle_type;
    END IF;

    IF v_clean_no IS NULL OR length(v_clean_no) < 4 THEN
      RAISE EXCEPTION 'Số container không hợp lệ khi khai báo có container đi cùng xe.';
    END IF;

    -- Kiểm tra trùng số container đang IN_YARD
    SELECT count(*) INTO v_dup_in_yard_count
    FROM public.app_container_visits
    WHERE yard_id = p_yard_id 
      AND container_no_current = v_clean_no 
      AND status = 'IN_YARD';

    IF v_dup_in_yard_count > 0 THEN
      RAISE EXCEPTION 'Cảnh báo trùng số container: Container % hiện đang có một lượt lưu bãi khác ở trạng thái IN_YARD trong cùng bãi. Không tự động gộp lượt. Vui lòng xác minh thực tế.', v_clean_no;
    END IF;
  END IF;

  -- ============================================================================
  -- QUY TẮC TÍNH GIÁ VÉ VÀO CỔNG SƠN CẢNG (SERVER GUARD)
  -- ============================================================================
  IF p_vehicle_type = 'DAU_KEO' THEN
    IF p_has_container = true THEN
      -- Xe đầu kéo mang container vào: Vé 250.000đ, trạng thái UNPAID
      v_ticket_price := 250000;
      v_payment_status := 'UNPAID';
    ELSE
      -- Xe đầu kéo vào không có container: Vé 0đ, trạng thái EXEMPT
      v_ticket_price := 0;
      v_payment_status := 'EXEMPT';
    END IF;
  ELSE
    -- Các loại xe khác
    v_ticket_price := v_vtype.default_ticket_amount;
    v_payment_status := CASE 
      WHEN v_ticket_price = 0 THEN 'EXEMPT'
      ELSE 'UNPAID'
    END;
  END IF;

  -- TẠO LƯỢT XE (SC-R3-08: Bắt unique_violation cho race-condition retry cùng idempotency key)
  BEGIN
    INSERT INTO public.app_vehicle_visits (
      yard_id, license_plate, vehicle_type, driver_name, driver_phone,
      ticket_code, ticket_amount, ticket_payment_status, note, entry_by, status,
      idempotency_key
    ) VALUES (
      p_yard_id, v_clean_plate, p_vehicle_type, trim(p_driver_name), trim(p_driver_phone),
      trim(p_ticket_code), v_ticket_price, v_payment_status, trim(p_note), v_actor_id, 'IN_YARD',
      v_clean_idem
    ) RETURNING id INTO v_vehicle_id;
  EXCEPTION WHEN unique_violation THEN
    IF v_clean_idem IS NOT NULL THEN
      SELECT * INTO v_existing_veh 
      FROM public.app_vehicle_visits 
      WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

      IF FOUND THEN
        -- GLC-06: Kiểm tra toàn bộ payload xe và container giống hệt nhánh pre-check để bảo vệ concurrency race
        IF v_existing_veh.vehicle_type <> p_vehicle_type OR
           coalesce(v_existing_veh.license_plate, '') <> coalesce(v_clean_plate, '') OR
           coalesce(v_existing_veh.driver_name, '') <> coalesce(trim(p_driver_name), '') OR
           coalesce(v_existing_veh.driver_phone, '') <> coalesce(trim(p_driver_phone), '') OR
           coalesce(v_existing_veh.ticket_code, '') <> coalesce(trim(p_ticket_code), '') OR
           coalesce(v_existing_veh.note, '') <> coalesce(trim(p_note), '') THEN
          RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin xe khác.', v_clean_idem;
        END IF;

        SELECT * INTO v_existing_cont
        FROM public.app_container_visits
        WHERE inbound_vehicle_visit_id = v_existing_veh.id;

        IF p_has_container = true THEN
          IF NOT FOUND THEN
            RAISE EXCEPTION 'Idempotency key % trước đó được gọi không có container, yêu cầu mới lại có container.', v_clean_idem;
          END IF;
          IF v_existing_cont.container_no_current <> v_clean_no OR
             coalesce(v_existing_cont.container_size, '') <> coalesce(trim(p_container_size), '') OR
             coalesce(v_existing_cont.container_type, '') <> coalesce(trim(p_container_type), '') OR
             coalesce(v_existing_cont.cargo_status, '') <> v_cargo_status THEN
            RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin container khác.', v_clean_idem;
          END IF;
        ELSE
          IF FOUND THEN
            RAISE EXCEPTION 'Idempotency key % trước đó được gọi có container, yêu cầu mới lại không có container.', v_clean_idem;
          END IF;
        END IF;

        RETURN jsonb_build_object(
          'vehicle_visit_id', v_existing_veh.id,
          'container_visit_id', v_existing_cont.id,
          'ticket_amount', v_existing_veh.ticket_amount,
          'ticket_payment_status', v_existing_veh.ticket_payment_status,
          'is_replay', true
        );
      ELSE
        RAISE;
      END IF;
    ELSE
      RAISE;
    END IF;
  END;

  SELECT * INTO v_new_veh FROM public.app_vehicle_visits WHERE id = v_vehicle_id;

  PERFORM public.sc_log_audit_event(
    'vehicle.visit.create', 'app_vehicle_visits', v_vehicle_id::text,
    p_yard_id, 'AN_NINH', NULL, to_jsonb(v_new_veh), 'Tạo lượt xe vào bãi (Atomic)'
  );

  -- GLC-02: Đồng bộ khoản phải thu TICKET vào app_charges nếu bảng đã tồn tại
  IF v_ticket_price > 0 AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_charges'
  ) THEN
    INSERT INTO public.app_charges (
      yard_id, charge_type, vehicle_visit_id, amount, paid_amount, status, notes
    ) VALUES (
      p_yard_id, 'TICKET', v_vehicle_id, v_ticket_price, 0, 'UNPAID',
      'Vé xe vào cổng: ' || p_vehicle_type
    );
  END IF;

  -- NẾU CÓ CONTAINER, TẠO LƯỢT CONTAINER TRONG CÙNG TRANSACTION
  IF p_has_container = true THEN
    INSERT INTO public.app_container_visits (
      yard_id, container_no_current, container_no_original, container_size,
      container_type, inbound_vehicle_visit_id, cargo_status, is_legacy_import,
      legacy_import_notes, created_by, status, idempotency_key
    ) VALUES (
      p_yard_id, v_clean_no, v_clean_no, p_container_size,
      p_container_type, v_vehicle_id, v_cargo_status, false,
      NULL, v_actor_id, 'IN_YARD', 
      CASE WHEN v_clean_idem IS NOT NULL THEN v_clean_idem || '_CONT' ELSE NULL END
    ) RETURNING id INTO v_container_id;

    SELECT * INTO v_new_cont FROM public.app_container_visits WHERE id = v_container_id;

    PERFORM public.sc_log_audit_event(
      'container.visit.create', 'app_container_visits', v_container_id::text,
      p_yard_id, 'AN_NINH', NULL, to_jsonb(v_new_cont), 'Tạo lượt container vào bãi (Atomic)'
    );
  END IF;


  RETURN jsonb_build_object(
    'vehicle_visit_id', v_vehicle_id,
    'container_visit_id', v_container_id,
    'ticket_amount', v_ticket_price,
    'ticket_payment_status', v_payment_status,
    'is_replay', false
  );
END;
$$;

-- Cấp quyền EXECUTE cho authenticated
GRANT EXECUTE ON FUNCTION public.sc_create_vehicle_and_container_visit_atomic TO authenticated;
