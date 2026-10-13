-- ==============================================================================
-- SƠN CẢNG YMS - MIGRATION 017
-- File: 20261012000017_vehicle_duplicate_policy.sql
-- Mục đích: 
--   1. Xây dựng bảng cấu hình kiểm soát Trùng lặp phương tiện chuyên sâu (Vehicle Duplicate Policies).
--      Hỗ trợ nhiều chế độ: Cảnh báo & Ghi đè có lý do, Chặn tuyệt đối, Tự động đóng lượt cũ, Cho phép tự do.
--      Hỗ trợ cài đặt Cooldown chống double-click, kiểm tra nợ vé cũ, danh sách loại xe ngoại lệ (xe bo, xe kéo),
--      cho phép An ninh đóng nhanh lượt cũ ngay tại cổng vào, danh mục lý do mẫu cấu hình được.
--   2. Bổ sung các cột truy vết trùng lặp vào app_vehicle_visits:
--      is_duplicate_entry, previous_visit_id, duplicate_override_reason, duplicate_override_by.
--   3. Cung cấp RPC kiểm tra trùng lặp thời gian thực: sc_check_vehicle_duplicate.
--   4. Cung cấp RPC quản trị cấu hình: sc_update_vehicle_duplicate_policy.
--   5. Cập nhật RPC tạo xe sc_create_vehicle_visit và sc_create_vehicle_and_container_visit_atomic
--      để chấp nhận tham số ghi đè p_override_duplicate, p_duplicate_reason, p_close_previous_visit.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BẢNG CẤU HÌNH KIỂM SOÁT TRÙNG LẶP PHƯƠNG TIỆN (app_vehicle_duplicate_policies)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_vehicle_duplicate_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yard_id uuid NOT NULL UNIQUE REFERENCES public.app_yards(id) ON DELETE RESTRICT,
  
  -- 1. Chế độ xử lý chính:
  -- - 'WARN_AND_ALLOW': Cảnh báo & yêu cầu An ninh chọn lý do ghi đè (Thực tế bãi Sơn Cảng)
  -- - 'BLOCK_STRICT': Chặn tuyệt đối không cho vào khi xe chưa xuất bãi
  -- - 'AUTO_CLOSE_PREVIOUS': Tự động đóng lượt cũ và tiếp nhận lượt mới
  -- - 'ALLOW_SILENT': Cho phép tự do không cảnh báo
  policy_mode text NOT NULL DEFAULT 'WARN_AND_ALLOW' 
    CHECK (policy_mode IN ('BLOCK_STRICT', 'WARN_AND_ALLOW', 'AUTO_CLOSE_PREVIOUS', 'ALLOW_SILENT')),
  
  -- 2. Ngưỡng thời gian trùng lặp ngắn (Cooldown / Anti double-entry) tính bằng phút
  cooldown_minutes integer NOT NULL DEFAULT 15 CHECK (cooldown_minutes >= 0),
  -- Hành vi khi vi phạm cooldown: 'BLOCK' (Chặn cứng) hoặc 'WARN' (Cảnh báo gắt gao)
  cooldown_action text NOT NULL DEFAULT 'BLOCK' CHECK (cooldown_action IN ('BLOCK', 'WARN')),
  
  -- 3. Kiểm tra công nợ vé vào cổng của lượt cũ
  check_unpaid_ticket boolean NOT NULL DEFAULT true,
  block_if_unpaid_ticket boolean NOT NULL DEFAULT false,
  
  -- 4. Bắt buộc nhập / chọn lý do khi ghi đè
  require_override_reason boolean NOT NULL DEFAULT true,
  
  -- 5. Cho phép nhân viên An ninh đóng nhanh lượt cũ ngay tại Cổng vào (làm sạch dữ liệu)
  allow_quick_exit_previous boolean NOT NULL DEFAULT true,
  
  -- 6. Danh sách loại phương tiện ngoại lệ (được phép vào nhiều lượt liên tục)
  exempt_vehicle_types text[] NOT NULL DEFAULT ARRAY['DAU_KEO', 'XE_BO_4_CHAN', 'XE_BO_3_CHAN', 'XE_BO_8_TAN_2_CHAN', 'XE_SANG_TAI'],
  
  -- 7. Danh mục lý do mẫu cấu hình được
  preset_reasons jsonb NOT NULL DEFAULT '[
    {"code": "XE_BO_CHAY_CHUYEN_MOI", "label": "Xe bo / xe kéo chạy chuyến mới trong ngày"},
    {"code": "QUEN_QUET_RA", "label": "Quên quẹt ra ca trước / Cổng ra chưa xác nhận"},
    {"code": "XE_QUAY_DAU", "label": "Xe quay đầu ra ngoài rồi quay lại bãi"},
    {"code": "NHAP_BU_DOI_SOAT", "label": "Nhập bù dữ liệu đối soát thực tế ca trực"},
    {"code": "LY_DO_KHAC", "label": "Lý do nghiệp vụ khác"}
  ]'::jsonb,
  
  updated_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Phân quyền bảo mật bảng app_vehicle_duplicate_policies
REVOKE ALL ON TABLE public.app_vehicle_duplicate_policies FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.app_vehicle_duplicate_policies TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.app_vehicle_duplicate_policies FROM authenticated;

ALTER TABLE public.app_vehicle_duplicate_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_vehicle_duplicate_policies_select_policy ON public.app_vehicle_duplicate_policies;
CREATE POLICY app_vehicle_duplicate_policies_select_policy 
  ON public.app_vehicle_duplicate_policies FOR SELECT TO authenticated
  USING (
    public.sc_can('admin.billing_settings.manage', yard_id) OR 
    public.sc_can('tariff.read', yard_id) OR 
    public.sc_can('vehicle.visit.create', yard_id) OR
    public.sc_can('vehicle.visit.read', yard_id)
  );

-- Seed bản ghi mặc định cho tất cả các bãi hiện có
INSERT INTO public.app_vehicle_duplicate_policies (
  yard_id, policy_mode, cooldown_minutes, cooldown_action, 
  check_unpaid_ticket, block_if_unpaid_ticket, require_override_reason, 
  allow_quick_exit_previous, exempt_vehicle_types
)
SELECT id, 'WARN_AND_ALLOW', 15, 'BLOCK', true, false, true, true, ARRAY['DAU_KEO', 'XE_BO_4_CHAN', 'XE_BO_3_CHAN', 'XE_BO_8_TAN_2_CHAN', 'XE_SANG_TAI']
FROM public.app_yards
ON CONFLICT (yard_id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. BỔ SUNG CỘT TRUY VẾT VÀO app_vehicle_visits
-- ------------------------------------------------------------------------------
ALTER TABLE public.app_vehicle_visits 
  ADD COLUMN IF NOT EXISTS is_duplicate_entry boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS previous_visit_id uuid NULL REFERENCES public.app_vehicle_visits(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duplicate_override_reason text NULL,
  ADD COLUMN IF NOT EXISTS duplicate_override_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_visits_dup_lookup 
  ON public.app_vehicle_visits (yard_id, license_plate, status) 
  WHERE status = 'IN_YARD';

-- ------------------------------------------------------------------------------
-- 3. RPC KIỂM TRA TRÙNG LẶP PHƯƠNG TIỆN (sc_check_vehicle_duplicate)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sc_check_vehicle_duplicate(
  p_yard_id uuid,
  p_license_plate text,
  p_vehicle_type text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_clean_plate text;
  v_dup_veh record;
  v_policy record;
  v_duration_mins numeric;
  v_duration_hours numeric;
  v_duration_display text;
  v_is_within_cooldown boolean := false;
  v_is_exempt boolean := false;
  v_has_unpaid_ticket boolean := false;
  v_can_proceed boolean := true;
  v_requires_override boolean := false;
  v_block_reason text := NULL;
  v_msg text;
BEGIN
  v_clean_plate := upper(trim(p_license_plate));
  IF v_clean_plate IS NULL OR length(v_clean_plate) < 2 THEN
    RETURN jsonb_build_object('has_duplicate', false, 'can_proceed', true);
  END IF;

  -- Đọc cấu hình chính sách của bãi
  SELECT * INTO v_policy 
  FROM public.app_vehicle_duplicate_policies 
  WHERE yard_id = p_yard_id;

  IF NOT FOUND THEN
    -- Cấu hình mặc định an toàn
    v_policy.policy_mode := 'WARN_AND_ALLOW';
    v_policy.cooldown_minutes := 15;
    v_policy.cooldown_action := 'BLOCK';
    v_policy.check_unpaid_ticket := true;
    v_policy.block_if_unpaid_ticket := false;
    v_policy.require_override_reason := true;
    v_policy.allow_quick_exit_previous := true;
    v_policy.exempt_vehicle_types := ARRAY['DAU_KEO', 'XE_BO_4_CHAN', 'XE_BO_3_CHAN', 'XE_BO_8_TAN_2_CHAN', 'XE_SANG_TAI'];
    v_policy.preset_reasons := '[
      {"code": "XE_BO_CHAY_CHUYEN_MOI", "label": "Xe bo / xe kéo chạy chuyến mới trong ngày"},
      {"code": "QUEN_QUET_RA", "label": "Quên quẹt ra ca trước / Cổng ra chưa xác nhận"},
      {"code": "XE_QUAY_DAU", "label": "Xe quay đầu ra ngoài rồi quay lại bãi"},
      {"code": "NHAP_BU_DOI_SOAT", "label": "Nhập bù dữ liệu đối soát thực tế ca trực"},
      {"code": "LY_DO_KHAC", "label": "Lý do nghiệp vụ khác"}
    ]'::jsonb;
  END IF;

  -- Nếu chế độ là ALLOW_SILENT thì bỏ qua kiểm tra
  IF v_policy.policy_mode = 'ALLOW_SILENT' THEN
    RETURN jsonb_build_object(
      'has_duplicate', false,
      'can_proceed', true,
      'policy_mode', 'ALLOW_SILENT'
    );
  END IF;

  -- Tìm lượt xe cùng biển số đang ở trạng thái IN_YARD
  SELECT * INTO v_dup_veh
  FROM public.app_vehicle_visits
  WHERE yard_id = p_yard_id 
    AND upper(trim(license_plate)) = v_clean_plate
    AND status = 'IN_YARD'
  ORDER BY entry_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'has_duplicate', false,
      'can_proceed', true,
      'policy_mode', v_policy.policy_mode
    );
  END IF;

  -- Tính thời gian lưu bãi của lượt trước
  v_duration_mins := ROUND(EXTRACT(EPOCH FROM (now() - v_dup_veh.entry_at)) / 60.0);
  v_duration_hours := ROUND(v_duration_mins / 60.0, 1);
  
  IF v_duration_mins < 60 THEN
    v_duration_display := v_duration_mins || ' phút';
  ELSE
    v_duration_display := v_duration_hours || ' giờ (' || v_duration_mins || ' phút)';
  END IF;

  -- Kiểm tra vi phạm cooldown
  IF v_duration_mins < v_policy.cooldown_minutes THEN
    v_is_within_cooldown := true;
  END IF;

  -- Kiểm tra xem loại xe này có thuộc danh mục ngoại lệ không
  IF (p_vehicle_type IS NOT NULL AND p_vehicle_type = ANY(v_policy.exempt_vehicle_types)) OR
     (v_dup_veh.vehicle_type = ANY(v_policy.exempt_vehicle_types)) THEN
    v_is_exempt := true;
  END IF;

  -- Kiểm tra nợ vé cũ
  IF v_policy.check_unpaid_ticket AND v_dup_veh.ticket_amount > 0 AND v_dup_veh.ticket_payment_status = 'UNPAID' THEN
    v_has_unpaid_ticket := true;
  END IF;

  -- Xác định xem có thể tiếp nhận và có cần override không
  IF v_is_within_cooldown AND v_policy.cooldown_action = 'BLOCK' THEN
    v_can_proceed := false;
    v_block_reason := 'Xe vừa mới vào bãi cách đây ' || v_duration_mins || ' phút (dưới ngưỡng tối thiểu ' || v_policy.cooldown_minutes || ' phút). Nghi vấn nhập lặp hoặc nhấp đúp.';
  ELSIF v_policy.policy_mode = 'BLOCK_STRICT' AND NOT v_is_exempt THEN
    v_can_proceed := false;
    v_block_reason := 'Chính sách bến bãi đang Chặn nghiêm ngặt: Biển số ' || v_clean_plate || ' hiện đang có lượt trong bãi. Yêu cầu làm thủ tục xuất bãi tại Cổng ra trước.';
  ELSIF v_has_unpaid_ticket AND v_policy.block_if_unpaid_ticket THEN
    v_can_proceed := false;
    v_block_reason := 'Xe còn nợ vé vào cổng lượt trước (' || to_char(v_dup_veh.ticket_amount, 'FM999,999,999') || ' đ). Yêu cầu thanh toán trước khi tiếp nhận lượt mới.';
  ELSE
    v_can_proceed := true;
    IF v_policy.policy_mode = 'WARN_AND_ALLOW' OR v_is_within_cooldown OR v_has_unpaid_ticket THEN
      v_requires_override := true;
    END IF;
  END IF;

  IF v_block_reason IS NOT NULL THEN
    v_msg := v_block_reason;
  ELSE
    v_msg := 'Phát hiện biển số ' || v_clean_plate || ' đang có 1 lượt trong bãi (Vào lúc ' || 
             to_char(v_dup_veh.entry_at AT TIME ZONE 'Asia/Bangkok', 'HH24:MI:SS DD/MM/YYYY') || 
             ', đã đỗ ' || v_duration_display || ').';
  END IF;

  RETURN jsonb_build_object(
    'has_duplicate', true,
    'can_proceed', v_can_proceed,
    'requires_override', v_requires_override,
    'requires_reason', v_policy.require_override_reason,
    'allow_quick_exit', v_policy.allow_quick_exit_previous,
    'is_within_cooldown', v_is_within_cooldown,
    'cooldown_minutes', v_policy.cooldown_minutes,
    'is_exempt_type', v_is_exempt,
    'has_unpaid_ticket', v_has_unpaid_ticket,
    'policy_mode', v_policy.policy_mode,
    'block_reason', v_block_reason,
    'message', v_msg,
    'existing_visit', jsonb_build_object(
      'id', v_dup_veh.id,
      'license_plate', v_dup_veh.license_plate,
      'vehicle_type', v_dup_veh.vehicle_type,
      'entry_at', v_dup_veh.entry_at,
      'duration_minutes', v_duration_mins,
      'duration_display', v_duration_display,
      'ticket_code', v_dup_veh.ticket_code,
      'ticket_amount', v_dup_veh.ticket_amount,
      'ticket_payment_status', v_dup_veh.ticket_payment_status,
      'driver_name', v_dup_veh.driver_name,
      'driver_phone', v_dup_veh.driver_phone,
      'note', v_dup_veh.note
    ),
    'preset_reasons', v_policy.preset_reasons
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sc_check_vehicle_duplicate FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_check_vehicle_duplicate TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. RPC QUẢN TRỊ: CẬP NHẬT CẤU HÌNH TRÙNG LẶP (sc_update_vehicle_duplicate_policy)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sc_update_vehicle_duplicate_policy(
  p_yard_id uuid,
  p_policy_mode text,
  p_cooldown_minutes integer,
  p_cooldown_action text,
  p_check_unpaid_ticket boolean,
  p_block_if_unpaid_ticket boolean,
  p_require_override_reason boolean,
  p_allow_quick_exit_previous boolean,
  p_exempt_vehicle_types text[],
  p_preset_reasons jsonb DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_old record;
  v_new record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  -- Kiểm tra quyền quản trị biểu phí / cấu hình bãi
  IF NOT (public.sc_can('admin.billing_settings.manage', p_yard_id) OR public.sc_has_role('SYS_ADMIN', p_yard_id)) THEN
    RAISE EXCEPTION 'Permission Denied: Chỉ Quản trị viên mới có quyền thay đổi chính sách kiểm soát trùng xe.';
  END IF;

  IF p_policy_mode NOT IN ('BLOCK_STRICT', 'WARN_AND_ALLOW', 'AUTO_CLOSE_PREVIOUS', 'ALLOW_SILENT') THEN
    RAISE EXCEPTION 'Chế độ chính sách không hợp lệ: %', p_policy_mode;
  END IF;

  IF p_cooldown_action NOT IN ('BLOCK', 'WARN') THEN
    RAISE EXCEPTION 'Hành vi Cooldown không hợp lệ: %', p_cooldown_action;
  END IF;

  SELECT * INTO v_old FROM public.app_vehicle_duplicate_policies WHERE yard_id = p_yard_id;

  INSERT INTO public.app_vehicle_duplicate_policies (
    yard_id, policy_mode, cooldown_minutes, cooldown_action,
    check_unpaid_ticket, block_if_unpaid_ticket, require_override_reason,
    allow_quick_exit_previous, exempt_vehicle_types,
    preset_reasons, updated_by, updated_at
  ) VALUES (
    p_yard_id, p_policy_mode, greatest(0, p_cooldown_minutes), p_cooldown_action,
    p_check_unpaid_ticket, p_block_if_unpaid_ticket, p_require_override_reason,
    p_allow_quick_exit_previous, p_exempt_vehicle_types,
    coalesce(p_preset_reasons, '[
      {"code": "XE_BO_CHAY_CHUYEN_MOI", "label": "Xe bo / xe kéo chạy chuyến mới trong ngày"},
      {"code": "QUEN_QUET_RA", "label": "Quên quẹt ra ca trước / Cổng ra chưa xác nhận"},
      {"code": "XE_QUAY_DAU", "label": "Xe quay đầu ra ngoài rồi quay lại bãi"},
      {"code": "NHAP_BU_DOI_SOAT", "label": "Nhập bù dữ liệu đối soát thực tế ca trực"},
      {"code": "LY_DO_KHAC", "label": "Lý do nghiệp vụ khác"}
    ]'::jsonb),
    v_actor_id, now()
  )
  ON CONFLICT (yard_id) DO UPDATE SET
    policy_mode = EXCLUDED.policy_mode,
    cooldown_minutes = EXCLUDED.cooldown_minutes,
    cooldown_action = EXCLUDED.cooldown_action,
    check_unpaid_ticket = EXCLUDED.check_unpaid_ticket,
    block_if_unpaid_ticket = EXCLUDED.block_if_unpaid_ticket,
    require_override_reason = EXCLUDED.require_override_reason,
    allow_quick_exit_previous = EXCLUDED.allow_quick_exit_previous,
    exempt_vehicle_types = EXCLUDED.exempt_vehicle_types,
    preset_reasons = coalesce(EXCLUDED.preset_reasons, public.app_vehicle_duplicate_policies.preset_reasons),
    updated_by = v_actor_id,
    updated_at = now()
  RETURNING * INTO v_new;

  -- Ghi nhận Audit Log
  PERFORM public.sc_log_audit_event(
    'policy.vehicle_duplicate.updated', 'app_vehicle_duplicate_policies', v_new.id::text,
    p_yard_id, 'QUAN_TRI', to_jsonb(v_old), to_jsonb(v_new),
    'Cập nhật chính sách kiểm soát trùng lặp phương tiện bến bãi'
  );

  RETURN to_jsonb(v_new);
END;
$$;

REVOKE ALL ON FUNCTION public.sc_update_vehicle_duplicate_policy FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_update_vehicle_duplicate_policy TO authenticated;

-- ------------------------------------------------------------------------------
-- 5. CẬP NHẬT sc_create_vehicle_visit HỖ TRỢ XỬ LÝ TRÙNG LẶP SÂU
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sc_create_vehicle_visit(
  p_yard_id uuid,
  p_vehicle_type text,
  p_license_plate text DEFAULT NULL,
  p_driver_name text DEFAULT NULL,
  p_driver_phone text DEFAULT NULL,
  p_ticket_code text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_override_duplicate boolean DEFAULT false,
  p_duplicate_reason text DEFAULT NULL,
  p_close_previous_visit boolean DEFAULT false
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_visit_id uuid;
  v_clean_plate text;
  v_clean_idem text;
  v_yard_active boolean;
  v_ticket_price numeric(12, 2);
  v_payment_status text;
  v_vtype record;
  v_existing_veh record;
  v_new_row record;
  v_dup_check jsonb;
  v_dup_veh_id uuid := NULL;
  v_is_dup boolean := false;
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

  -- Kiểm tra quyền tạo lượt xe
  IF NOT public.sc_can('vehicle.visit.create', p_yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền tạo lượt xe vào tại bãi tương ứng.';
  END IF;

  v_clean_plate := NULLIF(trim(p_license_plate), '');
  v_clean_idem := NULLIF(trim(p_idempotency_key), '');

  -- Xử lý Idempotency
  IF v_clean_idem IS NOT NULL THEN
    SELECT * INTO v_existing_veh 
    FROM public.app_vehicle_visits 
    WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

    IF FOUND THEN
      IF v_existing_veh.vehicle_type = p_vehicle_type AND 
         coalesce(v_existing_veh.license_plate, '') = coalesce(v_clean_plate, '') AND
         coalesce(v_existing_veh.driver_name, '') = coalesce(trim(p_driver_name), '') AND
         coalesce(v_existing_veh.driver_phone, '') = coalesce(trim(p_driver_phone), '') AND
         coalesce(v_existing_veh.ticket_code, '') = coalesce(trim(p_ticket_code), '') AND
         coalesce(v_existing_veh.note, '') = coalesce(trim(p_note), '') THEN
        RETURN v_existing_veh.id;
      ELSE
        RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin lượt xe khác.', v_clean_idem;
      END IF;
    END IF;
  END IF;

  -- Kiểm tra loại xe
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

  -- KIỂM TRA TRÙNG LẶP PHƯƠNG TIỆN
  IF v_clean_plate IS NOT NULL THEN
    v_dup_check := public.sc_check_vehicle_duplicate(p_yard_id, v_clean_plate, p_vehicle_type);
    
    IF (v_dup_check->>'has_duplicate')::boolean = true THEN
      v_is_dup := true;
      v_dup_veh_id := (v_dup_check->'existing_visit'->>'id')::uuid;

      -- Nếu vi phạm không thể tiếp nhận
      IF (v_dup_check->>'can_proceed')::boolean = false THEN
        RAISE EXCEPTION 'Không thể tiếp nhận phương tiện: %', (v_dup_check->>'message');
      END IF;

      -- Nếu yêu cầu ghi đè nhưng client chưa gửi xác nhận
      IF (v_dup_check->>'requires_override')::boolean = true AND p_override_duplicate IS NOT TRUE THEN
        RAISE EXCEPTION 'Cảnh báo trùng lặp xe trong bãi: %. Yêu cầu xác nhận ghi đè và chọn lý do nghiệp vụ.', (v_dup_check->>'message');
      END IF;

      -- Nếu bắt buộc lý do ghi đè
      IF (v_dup_check->>'requires_reason')::boolean = true AND (p_duplicate_reason IS NULL OR length(trim(p_duplicate_reason)) = 0) THEN
        RAISE EXCEPTION 'Chính sách bãi yêu cầu nhập lý do khi tiếp nhận phương tiện trùng lặp.';
      END IF;

      -- Nếu chọn đóng lượt cũ hoặc chính sách là AUTO_CLOSE_PREVIOUS
      IF (p_close_previous_visit = true OR (v_dup_check->>'policy_mode') = 'AUTO_CLOSE_PREVIOUS') AND v_dup_veh_id IS NOT NULL THEN
        UPDATE public.app_vehicle_visits
        SET status = 'EXITED',
            exit_at = now(),
            exit_by = v_actor_id,
            note = coalesce(note, '') || ' | Tự động xuất bãi do tiếp nhận lượt mới vào lúc ' || to_char(now() AT TIME ZONE 'Asia/Bangkok', 'HH24:MI:SS DD/MM/YYYY')
        WHERE id = v_dup_veh_id AND status = 'IN_YARD';
      END IF;
    END IF;
  END IF;

  v_ticket_price := v_vtype.default_ticket_amount;
  v_payment_status := CASE 
    WHEN v_ticket_price = 0 THEN 'EXEMPT'
    ELSE 'UNPAID'
  END;

  BEGIN
    INSERT INTO public.app_vehicle_visits (
      yard_id, license_plate, vehicle_type, driver_name, driver_phone,
      ticket_code, ticket_amount, ticket_payment_status, note, entry_by, status,
      idempotency_key, is_duplicate_entry, previous_visit_id, duplicate_override_reason,
      duplicate_override_by
    ) VALUES (
      p_yard_id, v_clean_plate, p_vehicle_type, trim(p_driver_name), trim(p_driver_phone),
      trim(p_ticket_code), v_ticket_price, v_payment_status, trim(p_note), v_actor_id, 'IN_YARD',
      v_clean_idem, v_is_dup, v_dup_veh_id, trim(p_duplicate_reason), 
      CASE WHEN v_is_dup THEN v_actor_id ELSE NULL END
    ) RETURNING id INTO v_visit_id;
  EXCEPTION WHEN unique_violation THEN
    IF v_clean_idem IS NOT NULL THEN
      SELECT * INTO v_existing_veh 
      FROM public.app_vehicle_visits 
      WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

      IF FOUND AND v_existing_veh.vehicle_type = p_vehicle_type AND 
         coalesce(v_existing_veh.license_plate, '') = coalesce(v_clean_plate, '') AND
         coalesce(v_existing_veh.driver_name, '') = coalesce(trim(p_driver_name), '') AND
         coalesce(v_existing_veh.driver_phone, '') = coalesce(trim(p_driver_phone), '') AND
         coalesce(v_existing_veh.ticket_code, '') = coalesce(trim(p_ticket_code), '') AND
         coalesce(v_existing_veh.note, '') = coalesce(trim(p_note), '') THEN
        RETURN v_existing_veh.id;
      ELSE
        RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin lượt xe khác.', v_clean_idem;
      END IF;
    ELSE
      RAISE;
    END IF;
  END;

  SELECT * INTO v_new_row FROM public.app_vehicle_visits WHERE id = v_visit_id;

  PERFORM public.sc_log_audit_event(
    'vehicle.visit.create', 'app_vehicle_visits', v_visit_id::text,
    p_yard_id, 'AN_NINH', NULL, to_jsonb(v_new_row), 
    CASE WHEN v_is_dup THEN 'Tạo lượt xe vào bãi (Ghi đè trùng lặp: ' || coalesce(p_duplicate_reason, 'N/A') || ')' ELSE 'Tạo lượt xe vào bãi' END
  );

  RETURN v_visit_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sc_create_vehicle_visit(uuid, text, text, text, text, text, text, text, boolean, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_create_vehicle_visit(uuid, text, text, text, text, text, text, text, boolean, text, boolean) TO authenticated;

-- Tương thích ngược: Overload wrapper 8 tham số cho các client cũ
CREATE OR REPLACE FUNCTION public.sc_create_vehicle_visit(
  p_yard_id uuid,
  p_vehicle_type text,
  p_license_plate text DEFAULT NULL,
  p_driver_name text DEFAULT NULL,
  p_driver_phone text DEFAULT NULL,
  p_ticket_code text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.sc_create_vehicle_visit(
    p_yard_id, p_vehicle_type, p_license_plate, p_driver_name, p_driver_phone,
    p_ticket_code, p_note, p_idempotency_key, false, NULL, false
  );
$$;

REVOKE ALL ON FUNCTION public.sc_create_vehicle_visit(uuid, text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_create_vehicle_visit(uuid, text, text, text, text, text, text, text) TO authenticated;

-- ------------------------------------------------------------------------------
-- 6. CẬP NHẬT sc_create_vehicle_and_container_visit_atomic HỖ TRỢ XỬ LÝ TRÙNG LẶP SÂU
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
  p_idempotency_key text DEFAULT NULL,
  p_override_duplicate boolean DEFAULT false,
  p_duplicate_reason text DEFAULT NULL,
  p_close_previous_visit boolean DEFAULT false
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
  v_dup_check jsonb;
  v_dup_veh_id uuid := NULL;
  v_is_dup boolean := false;
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

  IF v_cargo_status IN ('HANG', 'RONG') AND NOT public.sc_can('container.cargo.update', p_yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Chỉ bộ phận Điều phối mới có quyền thiết lập trạng thái hàng/rỗng (container.cargo.update). Lượt tiếp nhận tại cổng mặc định là CHUA_XAC_DINH.';
  END IF;

  IF p_has_container = true THEN
    v_clean_no := upper(trim(p_container_no));
  END IF;

  -- Xử lý Idempotency
  IF v_clean_idem IS NOT NULL THEN
    SELECT * INTO v_existing_veh 
    FROM public.app_vehicle_visits 
    WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

    IF FOUND THEN
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

    SELECT count(*) INTO v_dup_in_yard_count
    FROM public.app_container_visits
    WHERE yard_id = p_yard_id 
      AND container_no_current = v_clean_no 
      AND status = 'IN_YARD';

    IF v_dup_in_yard_count > 0 THEN
      RAISE EXCEPTION 'Cảnh báo trùng số container: Container % hiện đang có một lượt lưu bãi khác ở trạng thái IN_YARD trong cùng bãi. Không tự động gộp lượt. Vui lòng xác minh thực tế.', v_clean_no;
    END IF;
  END IF;

  -- KIỂM TRA TRÙNG LẶP PHƯƠNG TIỆN
  IF v_clean_plate IS NOT NULL THEN
    v_dup_check := public.sc_check_vehicle_duplicate(p_yard_id, v_clean_plate, p_vehicle_type);
    
    IF (v_dup_check->>'has_duplicate')::boolean = true THEN
      v_is_dup := true;
      v_dup_veh_id := (v_dup_check->'existing_visit'->>'id')::uuid;

      IF (v_dup_check->>'can_proceed')::boolean = false THEN
        RAISE EXCEPTION 'Không thể tiếp nhận phương tiện: %', (v_dup_check->>'message');
      END IF;

      IF (v_dup_check->>'requires_override')::boolean = true AND p_override_duplicate IS NOT TRUE THEN
        RAISE EXCEPTION 'Cảnh báo trùng lặp xe trong bãi: %. Yêu cầu xác nhận ghi đè và chọn lý do nghiệp vụ.', (v_dup_check->>'message');
      END IF;

      IF (v_dup_check->>'requires_reason')::boolean = true AND (p_duplicate_reason IS NULL OR length(trim(p_duplicate_reason)) = 0) THEN
        RAISE EXCEPTION 'Chính sách bãi yêu cầu nhập lý do khi tiếp nhận phương tiện trùng lặp.';
      END IF;

      IF (p_close_previous_visit = true OR (v_dup_check->>'policy_mode') = 'AUTO_CLOSE_PREVIOUS') AND v_dup_veh_id IS NOT NULL THEN
        UPDATE public.app_vehicle_visits
        SET status = 'EXITED',
            exit_at = now(),
            exit_by = v_actor_id,
            note = coalesce(note, '') || ' | Tự động xuất bãi do tiếp nhận lượt mới vào lúc ' || to_char(now() AT TIME ZONE 'Asia/Bangkok', 'HH24:MI:SS DD/MM/YYYY')
        WHERE id = v_dup_veh_id AND status = 'IN_YARD';
      END IF;
    END IF;
  END IF;

  -- Quy tắc tính giá vé
  IF p_vehicle_type = 'DAU_KEO' THEN
    IF p_has_container = true THEN
      v_ticket_price := 250000;
      v_payment_status := 'UNPAID';
    ELSE
      v_ticket_price := 0;
      v_payment_status := 'EXEMPT';
    END IF;
  ELSE
    v_ticket_price := v_vtype.default_ticket_amount;
    v_payment_status := CASE 
      WHEN v_ticket_price = 0 THEN 'EXEMPT'
      ELSE 'UNPAID'
    END;
  END IF;

  -- TẠO LƯỢT XE
  BEGIN
    INSERT INTO public.app_vehicle_visits (
      yard_id, license_plate, vehicle_type, driver_name, driver_phone,
      ticket_code, ticket_amount, ticket_payment_status, note, entry_by, status,
      idempotency_key, is_duplicate_entry, previous_visit_id, duplicate_override_reason,
      duplicate_override_by
    ) VALUES (
      p_yard_id, v_clean_plate, p_vehicle_type, trim(p_driver_name), trim(p_driver_phone),
      trim(p_ticket_code), v_ticket_price, v_payment_status, trim(p_note), v_actor_id, 'IN_YARD',
      v_clean_idem, v_is_dup, v_dup_veh_id, trim(p_duplicate_reason),
      CASE WHEN v_is_dup THEN v_actor_id ELSE NULL END
    ) RETURNING id INTO v_vehicle_id;
  EXCEPTION WHEN unique_violation THEN
    IF v_clean_idem IS NOT NULL THEN
      SELECT * INTO v_existing_veh 
      FROM public.app_vehicle_visits 
      WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

      IF FOUND THEN
        RETURN jsonb_build_object(
          'vehicle_visit_id', v_existing_veh.id,
          'is_replay', true
        );
      END IF;
    END IF;
    RAISE;
  END;

  SELECT * INTO v_new_veh FROM public.app_vehicle_visits WHERE id = v_vehicle_id;

  PERFORM public.sc_log_audit_event(
    'vehicle.visit.create', 'app_vehicle_visits', v_vehicle_id::text,
    p_yard_id, 'AN_NINH', NULL, to_jsonb(v_new_veh), 
    CASE WHEN v_is_dup THEN 'Tạo lượt xe vào bãi (Ghi đè trùng lặp: ' || coalesce(p_duplicate_reason, 'N/A') || ')' ELSE 'Tạo lượt xe vào bãi (Atomic)' END
  );

  -- TẠO LƯỢT CONTAINER NẾU CÓ
  IF p_has_container = true THEN
    INSERT INTO public.app_container_visits (
      yard_id, container_no_current, container_no_original, container_size,
      container_type, inbound_vehicle_visit_id, cargo_status, is_legacy_import,
      legacy_import_notes, created_by, status, idempotency_key
    ) VALUES (
      p_yard_id, v_clean_no, v_clean_no, p_container_size,
      p_container_type, v_vehicle_id, v_cargo_status, false,
      NULL, v_actor_id, 'IN_YARD', 
      CASE WHEN v_clean_idem IS NOT NULL THEN v_clean_idem || '-CONT' ELSE NULL END
    ) RETURNING id INTO v_container_id;

    SELECT * INTO v_new_cont FROM public.app_container_visits WHERE id = v_container_id;

    PERFORM public.sc_log_audit_event(
      'container.visit.create', 'app_container_visits', v_container_id::text,
      p_yard_id, 'AN_NINH', NULL, to_jsonb(v_new_cont), 'Tạo lượt container vào bãi đi cùng xe (Atomic)'
    );
  END IF;

  -- ĐỒNG BỘ KHOẢN PHẢI THU VÉ VÀO CỔNG NẾU CÓ PHÍ
  IF v_ticket_price > 0 AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_charges'
  ) THEN
    INSERT INTO public.app_charges (
      yard_id, charge_type, vehicle_visit_id, container_visit_id,
      amount, paid_amount, status, notes
    ) VALUES (
      p_yard_id, 'TICKET', v_vehicle_id, v_container_id,
      v_ticket_price, 0, 'UNPAID',
      'Phí vé vào cổng lượt xe ' || v_clean_plate || ' (' || v_vtype.display_name || ')'
    );
  END IF;

  RETURN jsonb_build_object(
    'vehicle_visit_id', v_vehicle_id,
    'container_visit_id', v_container_id,
    'ticket_amount', v_ticket_price,
    'ticket_payment_status', v_payment_status,
    'is_duplicate', v_is_dup,
    'previous_visit_id', v_dup_veh_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sc_create_vehicle_and_container_visit_atomic(uuid, text, text, text, text, text, text, boolean, text, text, text, text, text, boolean, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_create_vehicle_and_container_visit_atomic(uuid, text, text, text, text, text, text, boolean, text, text, text, text, text, boolean, text, boolean) TO authenticated;

-- Tương thích ngược: Overload wrapper 13 tham số cho các client cũ
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
) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT public.sc_create_vehicle_and_container_visit_atomic(
    p_yard_id, p_vehicle_type, p_license_plate, p_driver_name, p_driver_phone,
    p_ticket_code, p_note, p_has_container, p_container_no, p_container_size,
    p_container_type, p_cargo_status, p_idempotency_key, false, NULL, false
  );
$$;

REVOKE ALL ON FUNCTION public.sc_create_vehicle_and_container_visit_atomic(uuid, text, text, text, text, text, text, boolean, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_create_vehicle_and_container_visit_atomic(uuid, text, text, text, text, text, text, boolean, text, text, text, text, text) TO authenticated;
