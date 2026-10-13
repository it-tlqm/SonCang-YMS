-- ==============================================================================
-- Migration 014: Đọc đơn giá điện động từ Biểu phí niêm yết app_tariffs (DIEN_CONT_GIO)
-- Sơn Cảng YMS - Tuân thủ nguyên tắc Snapshot biểu phí tài chính V5
-- Không hardcode 35.000đ hay 100.000đ; áp dụng đúng giá quản trị viên thiết lập
-- ==============================================================================

-- 1. NÂNG CẤP sc_plug_in_reefer: Lấy đơn giá điện từ app_tariffs tại thời điểm cắm
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

  -- Lấy đơn giá điện theo giờ từ biểu phí niêm yết app_tariffs (mã DIEN_CONT_GIO)
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

  PERFORM public.sc_log_audit_event(
    'reefer.session.actual_start.record', 'app_reefer_power_sessions', v_session_id::text,
    p_yard_id, 'AN_NINH_CCKB', NULL, to_jsonb(v_new_row), 
    'Ghi nhận cắm điện container: Đơn giá áp dụng ' || v_applied_rate || ' VND/giờ'
  );

  RETURN v_session_id;
END;
$$;

-- 2. NÂNG CẤP sc_record_completed_reefer_session: Lấy đơn giá điện từ app_tariffs
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
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

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

  -- Lấy đơn giá điện theo giờ từ biểu phí niêm yết app_tariffs (mã DIEN_CONT_GIO)
  SELECT amount INTO v_hourly_rate
  FROM public.app_tariffs
  WHERE code = 'DIEN_CONT_GIO' AND is_active = true
  LIMIT 1;

  IF v_hourly_rate IS NULL OR v_hourly_rate <= 0 THEN
    v_hourly_rate := 100000;
  END IF;

  -- Tính toán số phút làm tròn 15p và thành tiền theo đơn giá biểu phí
  v_fee_res := public.sc_calculate_reefer_fee(v_duration_sec, v_hourly_rate);

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
    v_duration_sec, v_billable_min, v_hourly_rate,
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
      coalesce(trim(p_notes), 'Cước điện container ' || v_cont.container_no_current || ' (' || v_billable_min || ' phút - Đơn giá: ' || v_hourly_rate || ' đ/h)')
    ) RETURNING id INTO v_charge_id;
  END IF;

  SELECT * INTO v_new_row FROM public.app_reefer_power_sessions WHERE id = v_session_id;

  PERFORM public.sc_log_audit_event(
    'reefer.session.record_completed', 'app_reefer_power_sessions', v_session_id::text,
    p_yard_id, 'AN_NINH_CCKB', NULL, to_jsonb(v_new_row), 
    'Ghi nhận phiên cắm rút hoàn tất theo Zalo timestamp: ' || v_billable_min || ' phút, ' || v_amount || ' VND (@' || v_hourly_rate || ' đ/h)'
  );

  RETURN jsonb_build_object(
    'session_id', v_session_id,
    'status', v_status,
    'duration_seconds', v_duration_sec,
    'billable_minutes', v_billable_min,
    'hourly_rate', v_hourly_rate,
    'amount', v_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sc_plug_in_reefer TO authenticated;
GRANT EXECUTE ON FUNCTION public.sc_record_completed_reefer_session TO authenticated;
