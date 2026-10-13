-- ==============================================================================
-- SƠN CẢNG YMS - MIGRATION 009 (CLOUD DEV READY)
-- File: 20261012000009_dual_20ft_and_reefer_requests.sql
-- Mục đích:
--   1. Nâng cấp quy tắc container vào cổng: Hỗ trợ xe chở 2 container 20ft song song.
--   2. Tạo bảng quản lý Yêu cầu cắm điện dự kiến: app_reefer_requests (CCKB đăng ký trước khi cont vào bãi).
--   3. Cung cấp RPC sc_create_reefer_request và sc_match_reefer_request.
--   4. RLS & Audit Logs bảo vệ toàn vẹn.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. NÂNG CẤP sc_create_container_visit: HỖ TRỢ XE CHỞ 2 CONTAINER 20FT
-- ------------------------------------------------------------------------------
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
  v_first_cont_size text;
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

  -- QUY TẮC NÂNG CẤP: Cho phép tối đa 2 container nếu CẢ HAI đều là 20ft (chở cặp cont 20ft song song)
  SELECT count(*) INTO v_linked_cont_count
  FROM public.app_container_visits
  WHERE inbound_vehicle_visit_id = p_inbound_vehicle_visit_id 
    AND status <> 'CANCELLED';

  IF v_linked_cont_count >= 1 THEN
    IF v_linked_cont_count >= 2 THEN
      RAISE EXCEPTION 'Lượt xe % đã tiếp nhận tối đa 2 container. Không thể tiếp nhận thêm container thứ 3.', v_veh.license_plate;
    END IF;

    -- Kiểm tra quy cách: Cả cont trước và cont mới đều phải là 20ft
    SELECT container_size INTO v_first_cont_size
    FROM public.app_container_visits
    WHERE inbound_vehicle_visit_id = p_inbound_vehicle_visit_id AND status <> 'CANCELLED'
    LIMIT 1;

    IF coalesce(v_first_cont_size, '') <> '20' OR coalesce(trim(p_container_size), '') <> '20' THEN
      RAISE EXCEPTION 'Quy tắc tải trọng bến bãi: Xe chỉ được phép tiếp nhận tối đa 2 container khi CẢ HAI đều là cỡ 20 feet (20ft). Container hiện tại trên xe là %ft, container mới là %ft.',
        coalesce(v_first_cont_size, '40'), coalesce(trim(p_container_size), '40');
    END IF;
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
      'vehicle.ticket.upgrade', 'app_vehicle_visits', v_veh.id::text,
      p_yard_id, 'AN_NINH',
      jsonb_build_object('ticket_amount', 0, 'ticket_payment_status', 'EXEMPT'),
      jsonb_build_object('ticket_amount', 250000, 'ticket_payment_status', 'UNPAID'),
      'Guard tự động nâng vé xe đầu kéo lên 250k khi tiếp nhận container'
    );

    -- Cập nhật hoặc tạo mới khoản thu app_charges tương ứng nếu chưa có
    IF NOT EXISTS (
      SELECT 1 FROM public.app_charges 
      WHERE vehicle_visit_id = v_veh.id AND charge_type = 'TICKET'
    ) THEN
      INSERT INTO public.app_charges (
        yard_id, charge_type, title, vehicle_visit_id, container_visit_id,
        amount, paid_amount, status, notes
      ) VALUES (
        p_yard_id, 'TICKET', 'Vé xe vào cổng: DAU_KEO (gắn container)',
        v_veh.id, NULL, 250000, 0, 'UNPAID', 'Tạo tự động từ guard nâng vé đầu kéo'
      );
    ELSE
      UPDATE public.app_charges
      SET amount = 250000,
          status = 'UNPAID',
          notes = 'Vé xe đầu kéo gắn container (Guard tự động điều chỉnh 250k)'
      WHERE vehicle_visit_id = v_veh.id AND charge_type = 'TICKET' AND status = 'UNPAID';
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
-- 2. BẢNG QUẢN LÝ YÊU CẦU CẮM ĐIỆN DỰ KIẾN (app_reefer_requests)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_reefer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yard_id uuid NOT NULL REFERENCES public.app_yards(id) ON DELETE RESTRICT,
  
  -- Mã số container dự kiến (khách hoặc hãng tàu đăng ký trước khi cont vào bãi)
  container_no_planned text NOT NULL,
  
  -- Biển số xe dự kiến chở tới (tùy chọn)
  expected_license_plate text NULL,
  
  -- Thông tin khách hàng / Chủ hàng yêu cầu
  customer_name text NOT NULL,
  customer_phone text NULL,
  
  -- Chế độ cắm điện yêu cầu: CONTINUOUS (Cắm liên tục) hoặc HOURLY (Theo giờ)
  power_mode text NOT NULL DEFAULT 'CONTINUOUS' CHECK (power_mode IN ('HOURLY', 'CONTINUOUS')),
  
  -- Nhiệt độ yêu cầu duy trì (ví dụ: -18°C, +2°C...)
  temperature_setting text NULL,
  
  -- Trạng thái yêu cầu:
  -- - PLANNED: Đang chờ container đến bãi
  -- - CONTAINER_ARRIVED: Container đã qua cổng vào bãi, chờ An ninh/CCKB cắm điện
  -- - PLUGGED: Đã cắm điện thực tế
  -- - COMPLETED: Đã hoàn tất phiên điện
  -- - CANCELLED: Đã hủy yêu cầu
  status text NOT NULL DEFAULT 'PLANNED' 
    CHECK (status IN ('PLANNED', 'CONTAINER_ARRIVED', 'PLUGGED', 'COMPLETED', 'CANCELLED')),
  
  -- Khóa ngoại liên kết lượt container thực tế khi cont đã vào bãi
  matched_container_visit_id uuid NULL REFERENCES public.app_container_visits(id) ON DELETE SET NULL,
  
  notes text NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Chỉ mục tìm kiếm nhanh theo số cont dự kiến và trạng thái
CREATE INDEX IF NOT EXISTS idx_reefer_requests_lookup 
  ON public.app_reefer_requests (yard_id, container_no_planned, status);

-- GLC-01: Phân quyền truy cập
REVOKE ALL ON TABLE public.app_reefer_requests FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.app_reefer_requests TO authenticated;

-- RLS: RBAC V5 cho bảng app_reefer_requests
ALTER TABLE public.app_reefer_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reefer_requests_select_policy ON public.app_reefer_requests;
CREATE POLICY reefer_requests_select_policy 
  ON public.app_reefer_requests FOR SELECT TO authenticated
  USING (
    public.sc_can('reefer.request.read', yard_id) OR
    public.sc_can('reefer.session.read', yard_id) OR
    public.sc_can('vehicle.visit.create', yard_id)
  );

DROP POLICY IF EXISTS reefer_requests_insert_policy ON public.app_reefer_requests;
CREATE POLICY reefer_requests_insert_policy 
  ON public.app_reefer_requests FOR INSERT TO authenticated
  WITH CHECK (
    public.sc_can('reefer.request.create', yard_id) OR
    public.sc_can('reefer.session.actual_start.record', yard_id)
  );

DROP POLICY IF EXISTS reefer_requests_update_policy ON public.app_reefer_requests;
CREATE POLICY reefer_requests_update_policy 
  ON public.app_reefer_requests FOR UPDATE TO authenticated
  USING (
    public.sc_can('reefer.request.create', yard_id) OR
    public.sc_can('reefer.session.actual_start.record', yard_id) OR
    public.sc_can('vehicle.visit.create', yard_id)
  );


-- ------------------------------------------------------------------------------
-- 3. RPC: TẠO YÊU CẦU ĐIỆN DỰ KIẾN (sc_create_reefer_request)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sc_create_reefer_request(
  p_yard_id uuid,
  p_container_no_planned text,
  p_expected_license_plate text DEFAULT NULL,
  p_customer_name text DEFAULT 'Khách hàng vãng lai',
  p_customer_phone text DEFAULT NULL,
  p_power_mode text DEFAULT 'CONTINUOUS',
  p_temperature_setting text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_clean_cont text;
  v_clean_plate text;
  v_req_id uuid;
  v_new_row record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF NOT (public.sc_can('reefer.request.create', p_yard_id) OR public.sc_can('reefer.session.actual_start.record', p_yard_id)) THEN
    RAISE EXCEPTION 'Permission Denied: Thao tác tạo yêu cầu điện dự kiến thuộc thẩm quyền của bộ phận CCKB.';
  END IF;

  v_clean_cont := upper(trim(p_container_no_planned));
  IF v_clean_cont IS NULL OR length(v_clean_cont) < 4 THEN
    RAISE EXCEPTION 'Mã số container dự kiến không hợp lệ: %', p_container_no_planned;
  END IF;

  v_clean_plate := upper(trim(p_expected_license_plate));

  INSERT INTO public.app_reefer_requests (
    yard_id, container_no_planned, expected_license_plate, customer_name,
    customer_phone, power_mode, temperature_setting, status, notes, created_by
  ) VALUES (
    p_yard_id, v_clean_cont, v_clean_plate, trim(p_customer_name),
    trim(p_customer_phone), p_power_mode, trim(p_temperature_setting), 'PLANNED',
    trim(p_notes), v_actor_id
  ) RETURNING id INTO v_req_id;

  SELECT * INTO v_new_row FROM public.app_reefer_requests WHERE id = v_req_id;

  PERFORM public.sc_log_audit_event(
    'reefer.request.create', 'app_reefer_requests', v_req_id::text,
    p_yard_id, 'CCKB', NULL, to_jsonb(v_new_row), 'Tạo yêu cầu cắm điện dự kiến cho container chưa vào bãi'
  );

  RETURN v_req_id;
END;
$$;


-- ------------------------------------------------------------------------------
-- 4. RPC: KHỚP VÀ CHUYỂN TRẠNG THÁI YÊU CẦU ĐIỆN KHI CONTAINER VÀO BÃI (sc_match_reefer_request)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sc_match_reefer_request(
  p_request_id uuid,
  p_container_visit_id uuid
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_req record;
  v_cont record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  SELECT * INTO v_req FROM public.app_reefer_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy yêu cầu cắm điện dự kiến: %', p_request_id;
  END IF;

  SELECT * INTO v_cont FROM public.app_container_visits WHERE id = p_container_visit_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt container thực tế: %', p_container_visit_id;
  END IF;

  UPDATE public.app_reefer_requests
  SET matched_container_visit_id = p_container_visit_id,
      status = 'CONTAINER_ARRIVED',
      updated_at = now()
  WHERE id = p_request_id;

  PERFORM public.sc_log_audit_event(
    'reefer.request.match', 'app_reefer_requests', p_request_id::text,
    v_req.yard_id, 'AN_NINH',
    to_jsonb(v_req),
    jsonb_build_object('matched_container_visit_id', p_container_visit_id, 'status', 'CONTAINER_ARRIVED'),
    'Khớp yêu cầu cắm điện dự kiến với container thực tế đã vào bãi'
  );

  RETURN true;
END;
$$;
