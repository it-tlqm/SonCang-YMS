-- ==============================================================================
-- MIGRATION 013: PHÂN QUYỀN AN NINH CẮM/RÚT ĐIỆN & QUY TRÌNH ĐỐI CHIẾU ZALO TIMESTAMP
-- Nghiệp vụ thực tế Sơn Cảng:
--   1. An ninh là người trực tiếp cắm/rút điện ngoài bãi, quay video/ảnh timestamp gửi Zalo.
--   2. Cả An ninh lẫn CCKB đều có quyền ghi nhận cắm/rút điện trên hệ thống.
--   3. CCKB đối chiếu Zalo timestamp để xác nhận lại / điều chỉnh giờ giắc.
--   4. Hỗ trợ nhập hồi tố cả cắm và rút trong 1 biểu mẫu (E04).
--   5. Báo cắm là 1 chuyện, cắm thực tế là 1 chuyện: Cho phép hủy yêu cầu nếu thực tế không cắm.
-- ==============================================================================

-- 1. CẤP QUYỀN CẮM/RÚT ĐIỆN THỰC TẾ CHO AN NINH (SEC_STAFF, SEC_LEAD)
INSERT INTO public.app_role_permissions (role_code, permission_code, scope, is_enabled)
VALUES 
  ('SEC_STAFF', 'reefer.session.actual_start.record', 'YARD', TRUE),
  ('SEC_STAFF', 'reefer.session.actual_end.record', 'YARD', TRUE),
  ('SEC_STAFF', 'reefer.request.create', 'YARD', TRUE),
  ('SEC_LEAD', 'reefer.session.actual_start.record', 'YARD', TRUE),
  ('SEC_LEAD', 'reefer.session.actual_end.record', 'YARD', TRUE),
  ('SEC_LEAD', 'reefer.request.create', 'YARD', TRUE)
ON CONFLICT (role_code, permission_code) DO UPDATE SET is_enabled = TRUE;


-- 2. RPC: GHI NHẬN PHIÊN ĐIỆN HOÀN TẤT HỒI TỐ (CẢ CẮM VÀ RÚT THEO ZALO TIMESTAMP)
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
  v_duration_sec integer;
  v_fee_res jsonb;
  v_billable_min integer;
  v_amount numeric(12, 2);
  v_status text;
  v_charge_id uuid;
  v_new_row record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  -- Kiểm tra quyền
  IF NOT (public.sc_can('reefer.session.actual_start.record', p_yard_id) OR 
          public.sc_can('reefer.session.actual_end.record', p_yard_id)) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền ghi nhận phiên cắm điện container.';
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
    RAISE EXCEPTION 'Chỉ có thể ghi nhận điện cho container đang ở trong bãi (IN_YARD). Trạng thái hiện tại: %', v_cont.status;
  END IF;

  IF p_unplugged_at < p_plugged_in_at THEN
    RAISE EXCEPTION 'Thời gian rút điện (%) không thể trước thời gian cắm điện (%).', 
      p_unplugged_at, p_plugged_in_at;
  END IF;

  v_duration_sec := extract(epoch from (p_unplugged_at - p_plugged_in_at))::integer;

  -- Tính toán số phút làm tròn và thành tiền theo đơn giá V5 (35.000đ/giờ)
  v_fee_res := public.sc_calculate_reefer_fee(v_duration_sec, 35000);

  IF (v_fee_res->>'is_valid')::boolean = true THEN
    v_billable_min := (v_fee_res->>'billable_minutes')::integer;
    v_amount := (v_fee_res->>'amount')::numeric;
    v_status := 'UNPLUGGED';
  ELSE
    v_billable_min := 0;
    v_amount := 0;
    v_status := 'PENDING_REVIEW';
  END IF;

  -- Tạo phiên cắm điện đã hoàn tất
  INSERT INTO public.app_reefer_power_sessions (
    yard_id, container_visit_id, power_status,
    plugged_in_at, plugged_in_by,
    unplugged_at, unplugged_by,
    raw_duration_seconds, billable_minutes, applied_hourly_rate,
    total_power_amount, payment_status, notes
  ) VALUES (
    p_yard_id, p_container_visit_id, v_status,
    p_plugged_in_at, v_actor_id,
    p_unplugged_at, v_actor_id,
    v_duration_sec, v_billable_min, 35000,
    v_amount, 'UNPAID', trim(p_notes)
  ) RETURNING id INTO v_session_id;

  -- Ghi nhận khoản thu tiền điện vào sổ cái nếu hợp lệ
  IF v_status = 'UNPLUGGED' AND v_amount > 0 THEN
    INSERT INTO public.app_charges (
      yard_id, charge_type, container_visit_id, reefer_session_id,
      amount, paid_amount, status, notes
    ) VALUES (
      p_yard_id, 'REEFER', p_container_visit_id, v_session_id,
      v_amount, 0, 'UNPAID',
      coalesce(trim(p_notes), 'Cước điện container ' || v_cont.container_no_current || ' (' || v_billable_min || ' phút - Zalo timestamp)')
    ) RETURNING id INTO v_charge_id;
  END IF;

  SELECT * INTO v_new_row FROM public.app_reefer_power_sessions WHERE id = v_session_id;

  PERFORM public.sc_log_audit_event(
    'reefer.session.record_completed', 'app_reefer_power_sessions', v_session_id::text,
    p_yard_id, 'AN_NINH_CCKB', NULL, to_jsonb(v_new_row), 
    'Ghi nhận phiên cắm rút hoàn tất theo Zalo timestamp: ' || v_billable_min || ' phút, ' || v_amount || ' VND'
  );

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'status', v_status,
    'duration_seconds', v_duration_sec,
    'billable_minutes', v_billable_min,
    'total_amount', v_amount
  );
END;
$$;


-- 3. RPC: CCKB ĐỐI CHIẾU & XÁC NHẬN LẠI GIỜ GIẮC THEO ẢNH/VIDEO ZALO TIMESTAMP
CREATE OR REPLACE FUNCTION public.sc_verify_reefer_session_zalo(
  p_session_id uuid,
  p_adjusted_plugged_in_at timestamptz DEFAULT NULL,
  p_adjusted_unplugged_at timestamptz DEFAULT NULL,
  p_verification_notes text DEFAULT NULL
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

  -- Kiểm tra quyền CCKB
  IF NOT (public.sc_can('reefer.session.actual_start.record', v_session.yard_id) OR
          public.sc_can('reefer.payment.collect', v_session.yard_id)) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền xác nhận lại phiên điện.';
  END IF;

  v_new_plug := coalesce(p_adjusted_plugged_in_at, v_session.plugged_in_at);
  v_new_unplug := coalesce(p_adjusted_unplugged_at, v_session.unplugged_at);

  IF v_new_unplug IS NOT NULL THEN
    IF v_new_unplug < v_new_plug THEN
      RAISE EXCEPTION 'Thời gian rút điện không thể trước thời gian cắm điện.';
    END IF;

    v_duration_sec := extract(epoch from (v_new_unplug - v_new_plug))::integer;
    v_fee_res := public.sc_calculate_reefer_fee(v_duration_sec, v_session.applied_hourly_rate);
    v_billable_min := (v_fee_res->>'billable_minutes')::integer;
    v_amount := (v_fee_res->>'amount')::numeric;

    UPDATE public.app_reefer_power_sessions
    SET plugged_in_at = v_new_plug,
        unplugged_at = v_new_unplug,
        raw_duration_seconds = v_duration_sec,
        billable_minutes = v_billable_min,
        total_power_amount = v_amount,
        notes = coalesce(notes, '') || ' [CCKB xác nhận Zalo: ' || coalesce(p_verification_notes, 'Đã đối chiếu khớp giờ giắc') || ']',
        updated_at = now()
    WHERE id = p_session_id;

    -- Cập nhật lại số tiền trong app_charges nếu chưa thanh toán
    UPDATE public.app_charges
    SET amount = v_amount,
        notes = coalesce(notes, '') || ' [Điều chỉnh theo Zalo timestamp]'
    WHERE reefer_session_id = p_session_id AND status = 'UNPAID';
  ELSE
    UPDATE public.app_reefer_power_sessions
    SET plugged_in_at = v_new_plug,
        notes = coalesce(notes, '') || ' [CCKB xác nhận Zalo: ' || coalesce(p_verification_notes, 'Đã đối chiếu khớp giờ cắm') || ']',
        updated_at = now()
    WHERE id = p_session_id;
  END IF;

  SELECT * INTO v_updated FROM public.app_reefer_power_sessions WHERE id = p_session_id;

  PERFORM public.sc_log_audit_event(
    'reefer.session.verify_zalo', 'app_reefer_power_sessions', p_session_id::text,
    v_session.yard_id, 'CCKB', to_jsonb(v_session), to_jsonb(v_updated),
    'CCKB xác nhận đối chiếu Zalo timestamp: ' || coalesce(p_verification_notes, 'Đã kiểm tra ảnh/video')
  );

  RETURN jsonb_build_object(
    'session_id', p_session_id,
    'billable_minutes', v_billable_min,
    'total_amount', v_amount
  );
END;
$$;
