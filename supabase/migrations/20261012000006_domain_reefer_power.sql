-- ==============================================================================
-- SƠN CẢNG YMS - MIGRATION 006 (CODE-ONLY / LOCAL TESTED / DEPLOY PENDING)
-- File: 20261012000006_domain_reefer_power.sql
-- Mục đích: 
--   1. Tạo bảng quản lý phiên cắm điện container: app_reefer_power_sessions.
--   2. Ràng buộc chống 2 phiên ACTIVE đồng thời trên cùng 1 container.
--   3. RPC cắm điện sc_plug_in_reefer và rút điện sc_unplug_reefer.
--   4. Snapshot giá và quy tắc làm tròn 15 phút (CEIL(seconds / 900) * 15).
--   5. Xử lý ca 0 giây (giữ trạng thái chờ xử lý, không tự động miễn phí).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BẢNG PHIÊN CẮM ĐIỆN CONTAINER (app_reefer_power_sessions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_reefer_power_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yard_id uuid NOT NULL REFERENCES public.app_yards(id) ON DELETE RESTRICT,
  container_visit_id uuid NOT NULL REFERENCES public.app_container_visits(id) ON DELETE RESTRICT,
  
  -- Trạng thái phiên cắm điện
  power_status text NOT NULL DEFAULT 'PLUGGED' 
    CHECK (power_status IN ('PLUGGED', 'UNPLUGGED', 'CANCELLED', 'PENDING_REVIEW')),
  
  -- Thời gian và người ghi nhận cắm điện
  plugged_in_at timestamptz NOT NULL DEFAULT now(),
  plugged_in_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  -- Thời gian và người ghi nhận rút điện
  unplugged_at timestamptz NULL,
  unplugged_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  -- Thời lượng thực tế (giây) và số phút làm tròn tính tiền (bội số 15 phút)
  raw_duration_seconds integer NULL,
  billable_minutes integer NULL,
  
  -- Snapshot biểu phí hiệu lực tại thời điểm phát sinh (mặc định 100.000 VND / giờ)
  applied_hourly_rate numeric(12, 2) NOT NULL DEFAULT 100000,
  
  -- Thành tiền điện (VND)
  total_power_amount numeric(12, 2) NULL,
  
  -- Trạng thái thanh toán tiền điện: An ninh KHÔNG được thu; CCKB thu tiền điện
  payment_status text NOT NULL DEFAULT 'UNPAID' 
    CHECK (payment_status IN ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'EXEMPT', 'CANCELLED')),
  paid_at timestamptz NULL,
  paid_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ràng buộc không cho phép 2 phiên điện PLUGGED đồng thời trên cùng một lượt container
CREATE UNIQUE INDEX IF NOT EXISTS uq_reefer_active_session 
  ON public.app_reefer_power_sessions (container_visit_id) 
  WHERE power_status = 'PLUGGED';

-- GLC-01: Explicit REVOKE và GRANT bảo vệ bảng phiên cắm điện
REVOKE ALL ON TABLE public.app_reefer_power_sessions FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.app_reefer_power_sessions TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.app_reefer_power_sessions FROM authenticated;

-- RLS: SC-R3-05 Phân quyền đọc phiên điện container theo đúng chuẩn V5
ALTER TABLE public.app_reefer_power_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reefer_sessions_select_policy ON public.app_reefer_power_sessions;
CREATE POLICY reefer_sessions_select_policy 
  ON public.app_reefer_power_sessions FOR SELECT TO authenticated
  USING (
    public.sc_can('reefer.session.read', yard_id) OR
    public.sc_can('reefer.request.read', yard_id)
  );



-- ------------------------------------------------------------------------------
-- 2. HÀM TÍNH TOÁN LÀM TRÒN VÀ TIỀN ĐIỆN (sc_calculate_reefer_fee)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sc_calculate_reefer_fee(
  p_duration_seconds integer,
  p_hourly_rate numeric(12, 2) DEFAULT 100000
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_billable_minutes integer;
  v_amount numeric(12, 2);
BEGIN
  -- Nếu thời lượng <= 0 (ca 0 giây hoặc lỗi nhập giờ): giữ cờ cần xử lý
  IF p_duration_seconds <= 0 THEN
    RETURN jsonb_build_object(
      'is_valid', false,
      'duration_seconds', p_duration_seconds,
      'billable_minutes', 0,
      'amount', 0,
      'notes', 'Thời lượng không hợp lệ hoặc 0 giây; cần xác minh thực tế'
    );
  END IF;

  -- Làm tròn 15 phút: CEIL(seconds / 900.0) * 15
  v_billable_minutes := ceil(p_duration_seconds::numeric / 900.0)::integer * 15;
  v_amount := round((v_billable_minutes::numeric / 60.0) * p_hourly_rate, 0);

  RETURN jsonb_build_object(
    'is_valid', true,
    'duration_seconds', p_duration_seconds,
    'billable_minutes', v_billable_minutes,
    'amount', v_amount,
    'notes', NULL
  );
END;
$$;


-- ------------------------------------------------------------------------------
-- 3. RPC: CẮM ĐIỆN CONTAINER (sc_plug_in_reefer)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sc_plug_in_reefer(
  p_yard_id uuid,
  p_container_visit_id uuid,
  p_plugged_in_at timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_cont record;
  v_existing_active record;
  v_session_id uuid;
  v_new_row record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  -- Kiểm tra quyền: reefer.session.actual_start.record
  IF NOT public.sc_can('reefer.session.actual_start.record', p_yard_id) THEN
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

  -- Tạo phiên cắm điện
  INSERT INTO public.app_reefer_power_sessions (
    yard_id, container_visit_id, power_status,
    plugged_in_at, plugged_in_by, applied_hourly_rate, notes
  ) VALUES (
    p_yard_id, p_container_visit_id, 'PLUGGED',
    coalesce(p_plugged_in_at, now()), v_actor_id, 100000, trim(p_notes)
  ) RETURNING id INTO v_session_id;

  SELECT * INTO v_new_row FROM public.app_reefer_power_sessions WHERE id = v_session_id;

  PERFORM public.sc_log_audit_event(
    'reefer.session.actual_start.record', 'app_reefer_power_sessions', v_session_id::text,
    p_yard_id, 'AN_NINH', NULL, to_jsonb(v_new_row), 'Ghi nhận cắm điện container'
  );

  RETURN v_session_id;
END;
$$;


-- ------------------------------------------------------------------------------
-- 4. RPC: RÚT ĐIỆN CONTAINER (sc_unplug_reefer)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sc_unplug_reefer(
  p_session_id uuid,
  p_unplugged_at timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_session record;
  v_unplug_time timestamptz;
  v_duration_sec integer;
  v_fee_res jsonb;
  v_billable_min integer;
  v_amount numeric(12, 2);
  v_status text;
  v_updated_row record;
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

  IF v_session.power_status <> 'PLUGGED' THEN
    RAISE EXCEPTION 'Phiên cắm điện không ở trạng thái PLUGGED. Trạng thái hiện tại: %', v_session.power_status;
  END IF;

  -- Kiểm tra quyền: reefer.session.actual_end.record
  IF NOT public.sc_can('reefer.session.actual_end.record', v_session.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền ghi nhận rút điện container.';
  END IF;

  v_unplug_time := coalesce(p_unplugged_at, now());

  IF v_unplug_time < v_session.plugged_in_at THEN
    RAISE EXCEPTION 'Thời gian rút điện (%) không thể trước thời gian cắm điện (%).', 
      v_unplug_time, v_session.plugged_in_at;
  END IF;

  v_duration_sec := extract(epoch from (v_unplug_time - v_session.plugged_in_at))::integer;

  -- Tính toán số phút làm tròn và thành tiền
  v_fee_res := public.sc_calculate_reefer_fee(v_duration_sec, v_session.applied_hourly_rate);

  IF (v_fee_res->>'is_valid')::boolean = true THEN
    v_billable_min := (v_fee_res->>'billable_minutes')::integer;
    v_amount := (v_fee_res->>'amount')::numeric;
    v_status := 'UNPLUGGED';
  ELSE
    -- Ca 0 giây: đưa về PENDING_REVIEW chờ CCKB xác nhận, không tự động miễn
    v_billable_min := 0;
    v_amount := 0;
    v_status := 'PENDING_REVIEW';
  END IF;

  UPDATE public.app_reefer_power_sessions
  SET power_status = v_status,
      unplugged_at = v_unplug_time,
      unplugged_by = v_actor_id,
      raw_duration_seconds = v_duration_sec,
      billable_minutes = v_billable_min,
      total_power_amount = v_amount,
      notes = coalesce(p_notes, notes),
      updated_at = now()
  WHERE id = p_session_id;

  -- SC-R3-09: Đồng bộ khoản phải thu REEFER vào sổ cái app_charges (nếu bảng app_charges đã tồn tại)
  IF v_amount > 0 AND EXISTS (
    SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_charges'
  ) THEN
    -- GLC-04: Liên kết trực tiếp reefer_session_id để đồng bộ trạng thái thanh toán phiên cắm điện
    INSERT INTO public.app_charges (
      yard_id, charge_type, container_visit_id, reefer_session_id, amount, paid_amount, status, notes
    ) VALUES (
      v_session.yard_id, 'REEFER', v_session.container_visit_id, p_session_id, v_amount, 0, 'UNPAID',
      'Cước cắm điện container ' || v_billable_min || ' phút (làm tròn 15p)'
    );
  END IF;

  SELECT * INTO v_updated_row FROM public.app_reefer_power_sessions WHERE id = p_session_id;


  PERFORM public.sc_log_audit_event(
    'reefer.session.actual_end.record', 'app_reefer_power_sessions', p_session_id::text,
    v_session.yard_id, 'CCKB', to_jsonb(v_session), to_jsonb(v_updated_row),
    'Ghi nhận rút điện container và tính cước'
  );

  RETURN jsonb_build_object(
    'session_id', p_session_id,
    'power_status', v_status,
    'raw_duration_seconds', v_duration_sec,
    'billable_minutes', v_billable_min,
    'applied_hourly_rate', v_session.applied_hourly_rate,
    'total_power_amount', v_amount
  );
END;
$$;

-- Cấp quyền
GRANT EXECUTE ON FUNCTION public.sc_calculate_reefer_fee TO authenticated;
GRANT EXECUTE ON FUNCTION public.sc_plug_in_reefer TO authenticated;
GRANT EXECUTE ON FUNCTION public.sc_unplug_reefer TO authenticated;
