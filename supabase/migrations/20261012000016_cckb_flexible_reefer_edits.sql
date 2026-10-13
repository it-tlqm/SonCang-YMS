-- ==============================================================================
-- Migration 016: Cho phép CCKB chỉnh sửa linh hoạt yêu cầu cắm điện & phiên điện
-- Sơn Cảng YMS - Hỗ trợ sửa cắm dự kiến, cắm thực tế, rút thực tế, rút dự kiến
-- ==============================================================================

-- 1. RPC: CHỈNH SỬA YÊU CẦU CẮM ĐIỆN DỰ KIẾN (sc_update_reefer_request)
CREATE OR REPLACE FUNCTION public.sc_update_reefer_request(
  p_request_id uuid,
  p_container_no_planned text DEFAULT NULL,
  p_expected_license_plate text DEFAULT NULL,
  p_customer_name text DEFAULT NULL,
  p_customer_phone text DEFAULT NULL,
  p_power_mode text DEFAULT NULL,
  p_temperature_setting text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_req record;
  v_updated record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  SELECT * INTO v_req 
  FROM public.app_reefer_requests 
  WHERE id = p_request_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy yêu cầu cắm điện: %', p_request_id;
  END IF;

  -- Kiểm tra quyền: CCKB hoặc An ninh
  IF NOT (public.sc_can('reefer.request.create', v_req.yard_id) OR
          public.sc_can('reefer.session.actual_start.record', v_req.yard_id)) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền chỉnh sửa yêu cầu cắm điện.';
  END IF;

  UPDATE public.app_reefer_requests
  SET container_no_planned = coalesce(trim(p_container_no_planned), container_no_planned),
      expected_license_plate = coalesce(trim(p_expected_license_plate), expected_license_plate),
      customer_name = coalesce(trim(p_customer_name), customer_name),
      customer_phone = coalesce(trim(p_customer_phone), customer_phone),
      power_mode = coalesce(p_power_mode, power_mode),
      temperature_setting = coalesce(trim(p_temperature_setting), temperature_setting),
      status = coalesce(p_status, status),
      notes = coalesce(trim(p_notes), notes),
      updated_at = now()
  WHERE id = p_request_id;

  SELECT * INTO v_updated FROM public.app_reefer_requests WHERE id = p_request_id;

  PERFORM public.sc_log_audit_event(
    'reefer.request.update', 'app_reefer_requests', p_request_id::text,
    v_req.yard_id, 'CCKB', to_jsonb(v_req), to_jsonb(v_updated),
    'CCKB chỉnh sửa yêu cầu cắm điện: ' || coalesce(p_container_no_planned, v_req.container_no_planned)
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id
  );
END;
$$;

-- Xóa chữ ký hàm cũ để tránh lỗi ambiguous function
DROP FUNCTION IF EXISTS public.sc_verify_reefer_session_zalo(uuid, timestamptz, timestamptz, text);
DROP FUNCTION IF EXISTS public.sc_verify_reefer_session_zalo(uuid, timestamptz, timestamptz, text, text);

-- 2. NÂNG CẤP sc_verify_reefer_session_zalo: Hỗ trợ CCKB sửa linh hoạt cắm/rút thực tế & dự kiến
CREATE OR REPLACE FUNCTION public.sc_verify_reefer_session_zalo(
  p_session_id uuid,
  p_adjusted_plugged_in_at timestamptz DEFAULT NULL,
  p_adjusted_unplugged_at timestamptz DEFAULT NULL,
  p_verification_notes text DEFAULT NULL,
  p_status text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_session record;
  v_new_plug timestamptz;
  v_new_unplug timestamptz;
  v_duration_sec integer;
  v_fee_res jsonb;
  v_billable_min integer;
  v_amount numeric(12, 2);
  v_final_status text;
  v_rate numeric(12, 2);
  v_updated record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  SELECT * INTO v_session 
  FROM public.app_reefer_power_sessions 
  WHERE id = p_session_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy phiên cắm điện: %', p_session_id;
  END IF;

  -- Kiểm tra quyền CCKB hoặc Quản trị
  IF NOT (public.sc_can('reefer.session.actual_start.record', v_session.yard_id) OR
          public.sc_can('reefer.session.actual_end.record', v_session.yard_id) OR
          public.sc_can('reefer.payment.collect', v_session.yard_id)) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền điều chỉnh phiên điện.';
  END IF;

  v_new_plug := coalesce(p_adjusted_plugged_in_at, v_session.plugged_in_at);
  v_new_unplug := coalesce(p_adjusted_unplugged_at, v_session.unplugged_at);

  -- Lấy đơn giá áp dụng của phiên (nếu chưa có thì lấy từ biểu phí niêm yết)
  v_rate := coalesce(v_session.applied_hourly_rate, 100000);
  IF v_rate <= 0 THEN
    SELECT amount INTO v_rate FROM public.app_tariffs WHERE code = 'DIEN_CONT_GIO' AND is_active = true LIMIT 1;
    v_rate := coalesce(v_rate, 100000);
  END IF;

  IF v_new_unplug IS NOT NULL THEN
    IF v_new_unplug < v_new_plug THEN
      RAISE EXCEPTION 'Thời gian rút điện không thể trước thời gian cắm điện.';
    END IF;

    v_duration_sec := extract(epoch from (v_new_unplug - v_new_plug))::integer;
    v_fee_res := public.sc_calculate_reefer_fee(v_duration_sec, v_rate);
    v_billable_min := (v_fee_res->>'billable_minutes')::integer;
    v_amount := (v_fee_res->>'amount')::numeric;
    v_final_status := coalesce(p_status, 'UNPLUGGED');

    UPDATE public.app_reefer_power_sessions
    SET plugged_in_at = v_new_plug,
        unplugged_at = v_new_unplug,
        power_status = v_final_status,
        raw_duration_seconds = v_duration_sec,
        billable_minutes = v_billable_min,
        applied_hourly_rate = v_rate,
        total_power_amount = v_amount,
        notes = coalesce(trim(p_verification_notes), notes),
        updated_at = now()
    WHERE id = p_session_id;

    -- Đồng bộ hoặc tạo mới khoản thu trong app_charges
    IF v_amount > 0 THEN
      IF EXISTS (SELECT 1 FROM public.app_charges WHERE reefer_session_id = p_session_id) THEN
        UPDATE public.app_charges
        SET amount = v_amount,
            notes = coalesce(trim(p_verification_notes), notes) || ' [CCKB điều chỉnh]',
            updated_at = now()
        WHERE reefer_session_id = p_session_id AND status = 'UNPAID';
      ELSE
        INSERT INTO public.app_charges (
          yard_id, charge_type, container_visit_id, reefer_session_id,
          amount, paid_amount, status, notes
        ) VALUES (
          v_session.yard_id, 'REEFER', v_session.container_visit_id, p_session_id,
          v_amount, 0, 'UNPAID',
          coalesce(trim(p_verification_notes), 'Cước điện container ' || coalesce(v_session.container_no, '') || ' (' || v_billable_min || ' phút - CCKB điều chỉnh)')
        );
      END IF;
    END IF;
  ELSE
    -- Phiên đang cắm
    v_final_status := coalesce(p_status, 'PLUGGED');
    UPDATE public.app_reefer_power_sessions
    SET plugged_in_at = v_new_plug,
        power_status = v_final_status,
        notes = coalesce(trim(p_verification_notes), notes),
        updated_at = now()
    WHERE id = p_session_id;
  END IF;

  SELECT * INTO v_updated FROM public.app_reefer_power_sessions WHERE id = p_session_id;

  PERFORM public.sc_log_audit_event(
    'reefer.session.verify_zalo', 'app_reefer_power_sessions', p_session_id::text,
    v_session.yard_id, 'CCKB', to_jsonb(v_session), to_jsonb(v_updated),
    'CCKB điều chỉnh thông tin phiên điện: ' || coalesce(p_verification_notes, 'Cập nhật mốc cắm/rút')
  );

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'status', v_final_status,
    'billable_minutes', v_billable_min,
    'amount', v_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sc_update_reefer_request TO authenticated;
GRANT EXECUTE ON FUNCTION public.sc_verify_reefer_session_zalo TO authenticated;
