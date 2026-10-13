-- ==============================================================================
-- MIGRATION 20261013000020: SỬA LỖI KHÓA NGOẠI DEPARTMENT_CODE TRONG AUDIT LOG
-- Khắc phục: Lỗi vi phạm khóa ngoại app_audit_events_department_code_fkey khi cắm/rút điện
-- Nguyên nhân: Chuỗi hardcode 'AN_NINH_CCKB' không tồn tại trong bảng app_departments (chỉ có AN_NINH, CCKB, DIEU_PHOI, HE_THONG, KE_TOAN)
-- Giải pháp:
-- 1. Nâng cấp sc_log_audit_event tự động làm sạch (sanitize) department_code hợp lệ.
-- 2. Cập nhật sc_plug_in_reefer & sc_record_completed_reefer_session truyền department_code chuẩn ('CCKB').
-- ==============================================================================

BEGIN;

-- 1. NÂNG CẤP sc_log_audit_event VỚI CƠ CHẾ SANITIZE PHÒNG THỦ TOÀN DIỆN
DROP FUNCTION IF EXISTS public.sc_log_audit_event(text, text, text, uuid, text, jsonb, jsonb, text, text, jsonb);

CREATE OR REPLACE FUNCTION public.sc_log_audit_event(
  p_action_code text,
  p_target_type text,
  p_target_id text,
  p_yard_id uuid DEFAULT NULL,
  p_department_code text DEFAULT NULL,
  p_before_data jsonb DEFAULT NULL,
  p_after_data jsonb DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_device_info jsonb DEFAULT NULL
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_id bigint;
  v_actor_id uuid;
  v_user_dept text;
  v_user_yard uuid;
BEGIN
  v_actor_id := auth.uid();
  
  -- Tự động lấy yard và department từ assignment của actor nếu không truyền
  IF v_actor_id IS NOT NULL AND (p_yard_id IS NULL OR p_department_code IS NULL) THEN
    SELECT ura.yard_id, ura.department_code 
    INTO v_user_yard, v_user_dept
    FROM public.app_user_role_assignments ura
    WHERE ura.user_id = v_actor_id AND ura.is_active = true
    ORDER BY ura.created_at DESC
    LIMIT 1;
    
    p_yard_id := COALESCE(p_yard_id, v_user_yard);
    p_department_code := COALESCE(p_department_code, v_user_dept);
  END IF;

  -- BẢO VỆ TOÀN DIỆN: Làm sạch department_code đảm bảo khớp khóa ngoại app_departments(code)
  IF p_department_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.app_departments WHERE code = p_department_code) THEN
    IF p_department_code IN ('AN_NINH_CCKB', 'REEFER', 'KHO_BAI') THEN
      p_department_code := 'CCKB';
    ELSIF p_department_code IN ('QUAN_TRI', 'ADMIN') THEN
      p_department_code := 'HE_THONG';
    ELSE
      -- Nếu không xác định được, thử lấy department từ user assignment hoặc để NULL (ON DELETE SET NULL an toàn)
      p_department_code := v_user_dept;
    END IF;
  END IF;

  INSERT INTO public.app_audit_events (
    event_at, actor_user_id, action_code, target_type, target_id,
    yard_id, department_code, before_data, after_data, reason,
    request_id, device_info
  ) VALUES (
    clock_timestamp(), v_actor_id, p_action_code, p_target_type, p_target_id,
    p_yard_id, p_department_code, p_before_data, p_after_data, p_reason,
    p_request_id, p_device_info
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sc_log_audit_event FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sc_log_audit_event FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sc_log_audit_event TO service_role;


-- 2. CẬP NHẬT sc_plug_in_reefer: GHI NHẬN AUDIT LOG VỚI DEPARTMENT 'CCKB'
CREATE OR REPLACE FUNCTION public.sc_plug_in_reefer(
  p_yard_id uuid,
  p_container_visit_id uuid,
  p_plugged_in_at timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_cont record;
  v_session_id uuid;
  v_existing_active record;
  v_new_row record;
  v_applied_rate numeric(12, 2);
  v_actor_dept text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  -- Kiểm tra quyền: An ninh hoặc CCKB đều có quyền cắm điện
  IF NOT (public.sc_can('reefer.session.actual_start.record', p_yard_id) OR
          public.sc_can('reefer.request.create', p_yard_id)) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền ghi nhận cắm điện container.';
  END IF;

  -- Lấy department của người thực hiện để audit chính xác
  SELECT ura.department_code INTO v_actor_dept
  FROM public.app_user_role_assignments ura
  WHERE ura.user_id = v_actor_id AND ura.is_active = true
  ORDER BY ura.created_at DESC
  LIMIT 1;

  IF v_actor_dept IS NULL OR v_actor_dept NOT IN ('AN_NINH', 'CCKB') THEN
    v_actor_dept := 'CCKB';
  END IF;

  -- Kiểm tra container tồn tại và đang ở trong bãi
  SELECT * INTO v_cont 
  FROM public.app_container_visits 
  WHERE id = p_container_visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt container: %', p_container_visit_id;
  END IF;

  IF v_cont.yard_id <> p_yard_id THEN
    RAISE EXCEPTION 'Container không thuộc bãi thao tác.';
  END IF;

  IF v_cont.status <> 'IN_YARD' THEN
    RAISE EXCEPTION 'Chỉ có thể cắm điện cho container đang ở trong bãi (IN_YARD). Trạng thái hiện tại: %', v_cont.status;
  END IF;

  -- Kiểm tra phiên active
  SELECT * INTO v_existing_active 
  FROM public.app_reefer_power_sessions 
  WHERE container_visit_id = p_container_visit_id AND power_status = 'PLUGGED';

  IF FOUND THEN
    RAISE EXCEPTION 'Container % hiện đang có một phiên cắm điện chưa rút (Bắt đầu lúc: %). Không thể cắm điện trùng lặp.', 
      v_cont.container_no_current, v_existing_active.plugged_in_at;
  END IF;

  -- Lấy đơn giá điện theo giờ từ biểu phí niêm yết app_tariffs (mã DIEN_CONT_GIO, cột amount)
  SELECT amount INTO v_applied_rate
  FROM public.app_tariffs
  WHERE code = 'DIEN_CONT_GIO' AND is_active = true
  LIMIT 1;

  IF v_applied_rate IS NULL OR v_applied_rate <= 0 THEN
    v_applied_rate := 100000; -- Mặc định an toàn nếu chưa thiết lập biểu phí
  END IF;

  -- Tạo phiên cắm điện với snapshot đơn giá tại thời điểm bắt đầu cắm
  INSERT INTO public.app_reefer_power_sessions (
    yard_id, container_visit_id, power_status,
    plugged_in_at, plugged_in_by, applied_hourly_rate, notes
  ) VALUES (
    p_yard_id, p_container_visit_id, 'PLUGGED',
    coalesce(p_plugged_in_at, now()), v_actor_id, v_applied_rate, trim(p_notes)
  ) RETURNING id INTO v_session_id;

  SELECT * INTO v_new_row FROM public.app_reefer_power_sessions WHERE id = v_session_id;

  -- Ghi nhận Audit log với phòng ban chuẩn (CCKB hoặc AN_NINH)
  PERFORM public.sc_log_audit_event(
    'reefer.session.actual_start.record', 'app_reefer_power_sessions', v_session_id::text,
    p_yard_id, v_actor_dept, NULL, to_jsonb(v_new_row), 
    'Ghi nhận cắm điện container: Đơn giá áp dụng ' || v_applied_rate || ' VND/giờ'
  );

  RETURN v_session_id;
END;
$$;


-- 3. CẬP NHẬT sc_record_completed_reefer_session: GHI NHẬN AUDIT LOG VỚI DEPARTMENT 'CCKB'
CREATE OR REPLACE FUNCTION public.sc_record_completed_reefer_session(
  p_yard_id uuid,
  p_container_visit_id uuid,
  p_plugged_in_at timestamptz,
  p_unplugged_at timestamptz,
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_cont record;
  v_session_id uuid;
  v_charge_id uuid;
  v_duration_sec integer;
  v_fee_res jsonb;
  v_billable_min integer;
  v_amount numeric(12, 2);
  v_status text;
  v_hourly_rate numeric(12, 2);
  v_new_row record;
  v_actor_dept text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  -- Kiểm tra quyền
  IF NOT (public.sc_can('reefer.session.actual_start.record', p_yard_id) OR
          public.sc_can('reefer.session.actual_end.record', p_yard_id) OR
          public.sc_can('reefer.request.create', p_yard_id)) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền ghi nhận hoàn tất phiên cắm điện.';
  END IF;

  -- Lấy department của actor
  SELECT ura.department_code INTO v_actor_dept
  FROM public.app_user_role_assignments ura
  WHERE ura.user_id = v_actor_id AND ura.is_active = true
  ORDER BY ura.created_at DESC
  LIMIT 1;

  IF v_actor_dept IS NULL OR v_actor_dept NOT IN ('AN_NINH', 'CCKB') THEN
    v_actor_dept := 'CCKB';
  END IF;

  IF p_plugged_in_at IS NULL OR p_unplugged_at IS NULL THEN
    RAISE EXCEPTION 'Thời điểm cắm điện và rút điện không được để trống.';
  END IF;

  IF p_unplugged_at <= p_plugged_in_at THEN
    RAISE EXCEPTION 'Thời điểm rút điện (%) phải sau thời điểm cắm điện (%).', p_unplugged_at, p_plugged_in_at;
  END IF;

  -- Kiểm tra container
  SELECT * INTO v_cont 
  FROM public.app_container_visits 
  WHERE id = p_container_visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt container: %', p_container_visit_id;
  END IF;

  IF v_cont.yard_id <> p_yard_id THEN
    RAISE EXCEPTION 'Container không thuộc bãi thao tác.';
  END IF;

  -- Kiểm tra không trùng với phiên PLUGGED khác đang chạy
  IF EXISTS (
    SELECT 1 FROM public.app_reefer_power_sessions 
    WHERE container_visit_id = p_container_visit_id AND power_status = 'PLUGGED'
  ) THEN
    RAISE EXCEPTION 'Container % đang có một phiên cắm điện đang chạy dở. Vui lòng rút điện phiên đó trước.', v_cont.container_no_current;
  END IF;

  -- Lấy đơn giá điện từ app_tariffs
  SELECT amount INTO v_hourly_rate
  FROM public.app_tariffs
  WHERE code = 'DIEN_CONT_GIO' AND is_active = true
  LIMIT 1;

  IF v_hourly_rate IS NULL OR v_hourly_rate <= 0 THEN
    v_hourly_rate := 100000;
  END IF;

  -- Tính toán thời gian và phí điện (block 15 phút, tối thiểu 1 block)
  v_duration_sec := extract(epoch from (p_unplugged_at - p_plugged_in_at))::integer;
  v_fee_res := public.sc_calculate_reefer_fee(v_duration_sec, v_hourly_rate);
  v_billable_min := (v_fee_res->>'billable_minutes')::integer;
  v_amount := (v_fee_res->>'amount')::numeric(12, 2);

  v_status := 'UNPAID';

  -- Tạo phiên hoàn tất
  INSERT INTO public.app_reefer_power_sessions (
    yard_id, container_visit_id, power_status,
    plugged_in_at, plugged_in_by,
    unplugged_at, unplugged_by,
    raw_duration_seconds, billable_minutes,
    applied_hourly_rate, total_power_amount,
    payment_status, notes
  ) VALUES (
    p_yard_id, p_container_visit_id, 'UNPLUGGED',
    p_plugged_in_at, v_actor_id,
    p_unplugged_at, v_actor_id,
    v_duration_sec, v_billable_min,
    v_hourly_rate, v_amount,
    v_status, trim(p_notes)
  ) RETURNING id INTO v_session_id;

  -- Tạo khoản thu sòng phẳng
  IF v_amount > 0 THEN
    INSERT INTO public.app_charges (
      yard_id, charge_type, container_visit_id, reefer_session_id,
      amount, paid_amount, status, notes
    ) VALUES (
      p_yard_id, 'REEFER', p_container_visit_id, v_session_id,
      v_amount, 0, v_status,
      'Cước điện container ' || coalesce(v_cont.container_no_current, '') || ' (' || v_billable_min || ' phút cước Zalo)'
    ) RETURNING id INTO v_charge_id;
  END IF;

  SELECT * INTO v_new_row FROM public.app_reefer_power_sessions WHERE id = v_session_id;

  -- Ghi nhận Audit log với phòng ban chuẩn (CCKB hoặc AN_NINH)
  PERFORM public.sc_log_audit_event(
    'reefer.session.record_completed', 'app_reefer_power_sessions', v_session_id::text,
    p_yard_id, v_actor_dept, NULL, to_jsonb(v_new_row), 
    'Ghi nhận phiên cắm rút hoàn tất theo Zalo timestamp: ' || v_billable_min || ' phút, ' || v_amount || ' VND (@' || v_hourly_rate || ' đ/h)'
  );

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'charge_id', v_charge_id,
    'billable_minutes', v_billable_min,
    'total_amount', v_amount,
    'duration_seconds', v_duration_sec,
    'payment_status', v_status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sc_plug_in_reefer TO authenticated;
GRANT EXECUTE ON FUNCTION public.sc_record_completed_reefer_session TO authenticated;

COMMIT;
