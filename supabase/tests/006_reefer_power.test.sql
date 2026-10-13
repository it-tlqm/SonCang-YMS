-- ==============================================================================
-- SƠN CẢNG YMS - PGTAP TEST CHO MIGRATION 006 (REEFER POWER SESSIONS)
-- File: supabase/tests/006_reefer_power.test.sql
-- Mục đích: Kiểm thử quy tắc cắm/rút điện, làm tròn 15 phút, snapshot giá, ca 0 giây
-- ==============================================================================

BEGIN;
SELECT plan(13);

-- ------------------------------------------------------------------------------
-- 1. SETUP FIXTURES
-- ------------------------------------------------------------------------------
SELECT has_table('public', 'app_reefer_power_sessions', 'Bảng app_reefer_power_sessions phải tồn tại');
SELECT has_function('public', 'sc_calculate_reefer_fee', 'Hàm sc_calculate_reefer_fee phải tồn tại');
SELECT has_function('public', 'sc_plug_in_reefer', 'Hàm sc_plug_in_reefer phải tồn tại');
SELECT has_function('public', 'sc_unplug_reefer', 'Hàm sc_unplug_reefer phải tồn tại');

-- ------------------------------------------------------------------------------
-- 2. TEST QUY TẮC LÀM TRÒN 15 PHÚT VÀ TÍNH TIỀN ĐIỆN
-- ------------------------------------------------------------------------------
-- Ca A: 10 giây -> làm tròn 15 phút (0.25h * 100k = 25.000đ)
SELECT is(
  (public.sc_calculate_reefer_fee(10, 100000)->>'billable_minutes')::integer,
  15,
  '10 giây phải làm tròn thành 15 phút'
);
SELECT is(
  (public.sc_calculate_reefer_fee(10, 100000)->>'amount')::numeric,
  250000 * 0.1, -- 25000
  '15 phút điện phải có giá 25.000đ (đơn giá 100k/h)'
);

-- Ca B: 16 phút (960s) -> làm tròn 30 phút (0.5h * 100k = 50.000đ)
SELECT is(
  (public.sc_calculate_reefer_fee(960, 100000)->>'billable_minutes')::integer,
  30,
  '16 phút phải làm tròn thành 30 phút'
);
SELECT is(
  (public.sc_calculate_reefer_fee(960, 100000)->>'amount')::numeric,
  50000::numeric,
  '30 phút điện phải có giá 50.000đ'
);

-- Ca C: 0 giây -> is_valid = false (chờ xử lý RV02, không tự miễn)
SELECT is(
  (public.sc_calculate_reefer_fee(0, 100000)->>'is_valid')::boolean,
  false,
  '0 giây điện không được tự động tính hợp lệ/miễn phí, phải chuyển chờ xử lý'
);

-- ------------------------------------------------------------------------------
-- 3. TEST CẮM / RÚT ĐIỆN THỰC ĐỊA & CHỐNG 2 PHIÊN ACTIVE ĐỒNG THỜI
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_yard_id uuid;
  v_user_cckb uuid;
  v_veh_id uuid;
  v_cont_id uuid;
  v_session_id uuid;
  v_dup_error boolean := false;
  v_unplug_res jsonb;
BEGIN
  SELECT id INTO v_yard_id FROM public.app_yards LIMIT 1;

  -- Setup user CCKB
  v_user_cckb := 'c0000000-0000-0000-0000-000000000006'::uuid;
  INSERT INTO auth.users (id, email) VALUES (v_user_cckb, 'cckb_006@soncang.local')
  ON CONFLICT (id) DO NOTHING;

  -- Gán role PORT_STAFF theo schema RBAC V5 (app_user_role_assignments)
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, is_active)
  VALUES (v_user_cckb, 'PORT_STAFF', v_yard_id, true)
  ON CONFLICT DO NOTHING;

  PERFORM set_config('request.jwt.claim.sub', v_user_cckb::text, true);

  -- Tạo xe + container lạnh test
  INSERT INTO public.app_vehicle_visits (
    yard_id, license_plate, vehicle_type, ticket_amount, ticket_payment_status, entry_by, status
  ) VALUES (
    v_yard_id, '29C-00601', 'CONT_LANH', 250000, 'UNPAID', v_user_cckb, 'IN_YARD'
  ) RETURNING id INTO v_veh_id;

  INSERT INTO public.app_container_visits (
    yard_id, container_no_current, container_no_original, container_type,
    inbound_vehicle_visit_id, created_by, status
  ) VALUES (
    v_yard_id, 'MSKU0060011', 'MSKU0060011', 'RF', v_veh_id, v_user_cckb, 'IN_YARD'
  ) RETURNING id INTO v_cont_id;

  -- BƯỚC 1: CẮM ĐIỆN CONTAINER
  v_session_id := public.sc_plug_in_reefer(
    p_yard_id => v_yard_id,
    p_container_visit_id => v_cont_id,
    p_plugged_in_at => now() - interval '45 minutes',
    p_notes => 'Cắm điện bảo quản mít đông lạnh'
  );

  PERFORM set_config('test.reefer_session_created', (v_session_id IS NOT NULL)::text, true);

  -- BƯỚC 2: THỬ CẮM ĐIỆN LẦN 2 (CHỐNG DUPLICATE ACTIVE SESSION)
  BEGIN
    PERFORM public.sc_plug_in_reefer(
      p_yard_id => v_yard_id,
      p_container_visit_id => v_cont_id,
      p_plugged_in_at => now()
    );
  EXCEPTION WHEN OTHERS THEN
    v_dup_error := true;
  END;

  PERFORM set_config('test.reefer_dup_error', v_dup_error::text, true);

  -- BƯỚC 3: RÚT ĐIỆN CONTAINER
  v_unplug_res := public.sc_unplug_reefer(
    p_session_id => v_session_id,
    p_unplugged_at => now(),
    p_notes => 'Đã rút điện xuất kho'
  );

  PERFORM set_config('test.reefer_unplug_status', v_unplug_res->>'power_status', true);
  PERFORM set_config('test.reefer_unplug_billable_min', v_unplug_res->>'billable_minutes', true);
END $$;

SELECT is(current_setting('test.reefer_session_created'), 'true', 'Tạo phiên cắm điện thành công');
SELECT is(current_setting('test.reefer_dup_error'), 'true', 'Chặn cắm điện 2 phiên PLUGGED cùng lúc trên một container');
SELECT is(current_setting('test.reefer_unplug_status'), 'UNPLUGGED', 'Rút điện chuyển trạng thái thành UNPLUGGED');
SELECT is(current_setting('test.reefer_unplug_billable_min'), '45', '45 phút cắm điện được làm tròn 45 phút');

SELECT * FROM finish();
ROLLBACK;
