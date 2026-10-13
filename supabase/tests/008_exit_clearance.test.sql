-- ==============================================================================
-- SƠN CẢNG YMS - PGTAP TEST CHO MIGRATION 008 (EXIT CLEARANCE)
-- File: supabase/tests/008_exit_clearance.test.sql
-- Mục đích: Kiểm thử quy trình clearance CCKB, tính phí lưu bãi (miễn đêm đầu), xuất bãi vật lý
-- ==============================================================================

BEGIN;
SELECT plan(19);

-- 1. SETUP KIỂM TRA HÀM
SELECT has_function('public', 'sc_calculate_storage_fee', 'Hàm sc_calculate_storage_fee phải tồn tại');
SELECT has_function('public', 'sc_approve_exit_clearance', 'Hàm sc_approve_exit_clearance phải tồn tại');
SELECT has_function('public', 'sc_confirm_physical_exit', 'Hàm sc_confirm_physical_exit phải tồn tại');
SELECT has_function('public', 'sc_confirm_vehicle_only_exit', 'GLC-05: Hàm sc_confirm_vehicle_only_exit phải tồn tại');

-- 2. KIỂM THỬ QUY TẮC TÍNH PHÍ LƯU BÃI (MIỄN ĐÊM ĐẦU, 100K/ĐÊM)
-- Ca A: Cùng ngày -> 0đ
SELECT is(
  (public.sc_calculate_storage_fee(
    '2026-10-12 08:00:00+07'::timestamptz,
    '2026-10-12 17:00:00+07'::timestamptz
  )->>'storage_fee')::numeric,
  0::numeric,
  'Ra cùng ngày không qua đêm 22h-06h: 0đ lưu bãi'
);

-- Ca B: Qua 1 đêm (vào T2 10h, ra T3 14h) -> 1 đêm nhưng đêm đầu miễn phí -> 0đ
SELECT is(
  (public.sc_calculate_storage_fee(
    '2026-10-12 10:00:00+07'::timestamptz,
    '2026-10-13 14:00:00+07'::timestamptz
  )->>'storage_fee')::numeric,
  0::numeric,
  'Qua 1 đêm: đêm đầu miễn phí theo baseline V5 -> 0đ'
);

-- Ca C: Qua 2 đêm (vào T2, ra T4) -> 1 đêm chịu phí = 100.000đ
SELECT is(
  (public.sc_calculate_storage_fee(
    '2026-10-12 10:00:00+07'::timestamptz,
    '2026-10-14 14:00:00+07'::timestamptz
  )->>'storage_fee')::numeric,
  100000::numeric,
  'Qua 2 đêm: tính phí 1 đêm = 100.000đ'
);

-- Ca D: Qua 4 đêm -> tính phí 3 đêm = 300.000đ
SELECT is(
  (public.sc_calculate_storage_fee(
    '2026-10-10 10:00:00+07'::timestamptz,
    '2026-10-14 14:00:00+07'::timestamptz
  )->>'storage_fee')::numeric,
  300000::numeric,
  'Qua 4 đêm: tính phí 3 đêm = 300.000đ'
);

-- 3. TEST QUY TRÌNH CLEARANCE & XUẤT BÃI RUNTIME
DO $$
DECLARE
  v_yard_id uuid;
  v_user_sec uuid := 'a0000000-0000-0000-0000-000000000008'::uuid;
  v_user_cckb uuid := 'c0000000-0000-0000-0000-000000000008'::uuid;
  v_veh_id uuid;
  v_cont_id uuid;
  v_veh2_id uuid;
  v_cont2_id uuid;
  v_veh_out_id uuid;
  v_veh_out_rec record;
  v_exit_err boolean := false;
  v_debt_err boolean := false;
  v_clear_res jsonb;
  v_final_exit jsonb;
  v_paid_exit jsonb;
  -- Biến test GLC-03 & GLC-05
  v_veh3_id uuid;
  v_cont3_id uuid;
  v_pending_review_clear_err boolean := false;
  v_pending_review_exit_err boolean := false;
  v_truck_a_id uuid;
  v_cont_a_id uuid;
  v_veh_only_res jsonb;
  v_cont_a_status text;
  v_truck_b_id uuid;
  v_truck_b_res jsonb;
BEGIN
  SELECT id INTO v_yard_id FROM public.app_yards LIMIT 1;

  INSERT INTO auth.users (id, email) VALUES (v_user_sec, 'sec_008@soncang.local') ON CONFLICT DO NOTHING;
  INSERT INTO auth.users (id, email) VALUES (v_user_cckb, 'cckb_008@soncang.local') ON CONFLICT DO NOTHING;

  -- SC-R3-03: Sử dụng app_user_role_assignments với quyền có sẵn từ seed V5
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, is_active)
  VALUES (v_user_sec, 'SEC_STAFF', v_yard_id, true) ON CONFLICT DO NOTHING;
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, is_active)
  VALUES (v_user_cckb, 'PORT_STAFF', v_yard_id, true) ON CONFLICT DO NOTHING;

  -- Tạo container 1 vào bãi 3 ngày trước
  INSERT INTO public.app_vehicle_visits (
    yard_id, license_plate, vehicle_type, ticket_amount, ticket_payment_status, entry_by, status
  ) VALUES (
    v_yard_id, '14C-00801', 'CONT_LANH', 250000, 'PAID', v_user_sec, 'IN_YARD'
  ) RETURNING id INTO v_veh_id;

  INSERT INTO public.app_container_visits (
    yard_id, container_no_current, container_no_original, container_type,
    inbound_vehicle_visit_id, inbound_at, created_by, status
  ) VALUES (
    v_yard_id, 'MSKU0080011', 'MSKU0080011', 'RF',
    v_veh_id, now() - interval '3 days', v_user_sec, 'IN_YARD'
  ) RETURNING id INTO v_cont_id;

  -- BƯỚC 1: An ninh cố cho xuất khi chưa có clearance -> PHẢI BỊ CHẶN
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
  BEGIN
    PERFORM public.sc_confirm_physical_exit(v_cont_id);
  EXCEPTION WHEN OTHERS THEN
    v_exit_err := true;
  END;
  PERFORM set_config('test.no_clearance_err', v_exit_err::text, true);

  -- BƯỚC 2: CCKB DUYỆT CLEARANCE (AP06 ngoại lệ nợ)
  PERFORM set_config('request.jwt.claim.sub', v_user_cckb::text, true);
  v_clear_res := public.sc_approve_exit_clearance(
    v_cont_id, true, 'Khách hàng cam kết chuyển khoản trước 17h'
  );
  PERFORM set_config('test.clear_status', v_clear_res->>'clearance_status', true);

  -- BƯỚC 3: AN NINH XÁC NHẬN CHO XE RA VẬT LÝ VỚI NGOẠI LỆ NỢ
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
  v_final_exit := public.sc_confirm_physical_exit(v_cont_id);
  PERFORM set_config('test.final_exit_status', v_final_exit->>'status', true);

  -- BƯỚC 4 (ON-04 & SC-R3-01 & SC-R3-02): Container 2 có xe kéo ra và thu phí lưu tại cổng
  INSERT INTO public.app_vehicle_visits (
    yard_id, license_plate, vehicle_type, ticket_amount, ticket_payment_status, entry_by, status
  ) VALUES (
    v_yard_id, '14C-00802', 'CONT_LANH', 250000, 'PAID', v_user_sec, 'IN_YARD'
  ) RETURNING id INTO v_veh2_id;

  -- Xe đầu kéo vào nhận container ra (status IN_YARD)
  INSERT INTO public.app_vehicle_visits (
    yard_id, license_plate, vehicle_type, ticket_amount, ticket_payment_status, entry_by, status
  ) VALUES (
    v_yard_id, '14C-00899', 'DAU_KEO', 0, 'EXEMPT', v_user_sec, 'IN_YARD'
  ) RETURNING id INTO v_veh_out_id;

  INSERT INTO public.app_container_visits (
    yard_id, container_no_current, container_no_original, container_type,
    inbound_vehicle_visit_id, inbound_at, created_by, status
  ) VALUES (
    v_yard_id, 'MSKU0080022', 'MSKU0080022', 'RF',
    v_veh2_id, now() - interval '3 days', v_user_sec, 'IN_YARD'
  ) RETURNING id INTO v_cont2_id;

  -- CCKB duyệt clearance chuẩn (p_allow_debt = false)
  PERFORM set_config('request.jwt.claim.sub', v_user_cckb::text, true);
  PERFORM public.sc_approve_exit_clearance(v_cont2_id, false, 'Duyệt xuất bình thường');

  -- An ninh cố cho xuất mà KHÔNG thu tiền tại cổng (p_paid_at_gate = false) -> BẮT BUỘC PHẢI BỊ CHẶN (ON-04)
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
  BEGIN
    PERFORM public.sc_confirm_physical_exit(v_cont2_id, v_veh_out_id, null, false);
  EXCEPTION WHEN OTHERS THEN
    v_debt_err := true;
  END;
  PERFORM set_config('test.unpaid_debt_blocked', v_debt_err::text, true);

  -- An ninh thu tiền tại cổng và xác nhận cho container kèm xe ra (p_paid_at_gate = true) -> THÀNH CÔNG (SC-R3-01 & SC-R3-02)
  v_paid_exit := public.sc_confirm_physical_exit(v_cont2_id, v_veh_out_id, 'Thu tiền tại bốt', true, 'CASH');
  PERFORM set_config('test.paid_at_gate_exit_status', v_paid_exit->>'status', true);

  -- Kiểm tra xe ra được cập nhật EXITED và có exit_by (SC-R3-02)
  SELECT * INTO v_veh_out_rec FROM public.app_vehicle_visits WHERE id = v_veh_out_id;
  IF v_veh_out_rec.status = 'EXITED' AND v_veh_out_rec.exit_by = v_user_sec AND v_veh_out_rec.exit_at IS NOT NULL THEN
    PERFORM set_config('test.veh_exit_status', 'EXITED', true);
  ELSE
    PERFORM set_config('test.veh_exit_status', 'FAILED', true);
  END IF;

  -- BƯỚC 5 (GLC-03): Chặn clearance và physical exit khi có phiên reefer PENDING_REVIEW
  INSERT INTO public.app_vehicle_visits (
    yard_id, license_plate, vehicle_type, ticket_amount, ticket_payment_status, entry_by, status
  ) VALUES (
    v_yard_id, '14C-00803', 'CONT_LANH', 250000, 'PAID', v_user_sec, 'IN_YARD'
  ) RETURNING id INTO v_veh3_id;

  INSERT INTO public.app_container_visits (
    yard_id, container_no_current, container_no_original, container_type,
    inbound_vehicle_visit_id, inbound_at, created_by, status
  ) VALUES (
    v_yard_id, 'MSKU0080033', 'MSKU0080033', 'RF',
    v_veh3_id, now() - interval '1 days', v_user_sec, 'IN_YARD'
  ) RETURNING id INTO v_cont3_id;

  -- Tạo phiên cắm điện chưa giải quyết (PENDING_REVIEW)
  INSERT INTO public.app_reefer_power_sessions (
    yard_id, container_visit_id, plugged_in_at, plugged_in_by, power_status, total_power_amount, payment_status
  ) VALUES (
    v_yard_id, v_cont3_id, now(), v_user_sec, 'PENDING_REVIEW', 0, 'UNPAID'
  );

  -- CCKB duyệt clearance cho cont3 -> PHẢI BỊ CHẶN (GLC-03)
  PERFORM set_config('request.jwt.claim.sub', v_user_cckb::text, true);
  BEGIN
    PERFORM public.sc_approve_exit_clearance(v_cont3_id, false, 'Cố duyệt khi PENDING_REVIEW');
  EXCEPTION WHEN OTHERS THEN
    v_pending_review_clear_err := true;
  END;
  PERFORM set_config('test.pending_review_clear_err', v_pending_review_clear_err::text, true);

  -- An ninh cố cho xuất bãi cont3 -> PHẢI BỊ CHẶN (GLC-03)
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
  BEGIN
    PERFORM public.sc_confirm_physical_exit(v_cont3_id);
  EXCEPTION WHEN OTHERS THEN
    v_pending_review_exit_err := true;
  END;
  PERFORM set_config('test.pending_review_exit_err', v_pending_review_exit_err::text, true);

  -- BƯỚC 6 (GLC-05): Xe A đưa container vào -> Xe A ra một mình -> Xe B vào nhận container ra
  INSERT INTO public.app_vehicle_visits (
    yard_id, license_plate, vehicle_type, ticket_amount, ticket_payment_status, entry_by, status
  ) VALUES (
    v_yard_id, '14C-TRUCK-A', 'CONT_LANH', 250000, 'PAID', v_user_sec, 'IN_YARD'
  ) RETURNING id INTO v_truck_a_id;

  INSERT INTO public.app_container_visits (
    yard_id, container_no_current, container_no_original, container_type,
    inbound_vehicle_visit_id, inbound_at, created_by, status
  ) VALUES (
    v_yard_id, 'MSKU0080044', 'MSKU0080044', 'RF',
    v_truck_a_id, now() - interval '2 days', v_user_sec, 'IN_YARD'
  ) RETURNING id INTO v_cont_a_id;

  -- Xe A ra một mình qua sc_confirm_vehicle_only_exit
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
  v_veh_only_res := public.sc_confirm_vehicle_only_exit(v_truck_a_id, 'Xe A hạ bãi cont và ra về');
  PERFORM set_config('test.veh_only_exit_status', v_veh_only_res->>'status', true);

  -- Kiểm tra cont A vẫn IN_YARD
  SELECT status INTO v_cont_a_status FROM public.app_container_visits WHERE id = v_cont_a_id;
  PERFORM set_config('test.cont_still_in_yard', v_cont_a_status, true);

  -- Xe B vào nhận cont A
  INSERT INTO public.app_vehicle_visits (
    yard_id, license_plate, vehicle_type, ticket_amount, ticket_payment_status, entry_by, status
  ) VALUES (
    v_yard_id, '14C-TRUCK-B', 'DAU_KEO', 0, 'EXEMPT', v_user_sec, 'IN_YARD'
  ) RETURNING id INTO v_truck_b_id;

  -- CCKB duyệt clearance cho Cont A
  PERFORM set_config('request.jwt.claim.sub', v_user_cckb::text, true);
  PERFORM public.sc_approve_exit_clearance(v_cont_a_id, false, 'Duyệt xuất cho Xe B nhận');

  -- An ninh xuất bãi Cont A kèm Xe B
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
  v_truck_b_res := public.sc_confirm_physical_exit(v_cont_a_id, v_truck_b_id, 'Thu phí lưu tại cổng', true, 'TRANSFER');
  PERFORM set_config('test.truck_b_picks_cont_status', v_truck_b_res->>'status', true);
END $$;

SELECT is(current_setting('test.no_clearance_err'), 'true', 'Chặn xuất bãi khi chưa có clearance từ CCKB');
SELECT is(current_setting('test.clear_status'), 'CLEARED_WITH_DEBT', 'CCKB duyệt clearance ngoại lệ nợ thành công');
SELECT is(current_setting('test.final_exit_status'), 'EXITED', 'An ninh xác nhận xuất bãi với nợ chuyển trạng thái sang EXITED');
SELECT is(current_setting('test.unpaid_debt_blocked'), 'true', 'ON-04: Chặn xuất bãi khi nợ lưu bãi chưa thanh toán và không có ngoại lệ nợ');
SELECT is(current_setting('test.paid_at_gate_exit_status'), 'EXITED', 'SC-R3-01: Cho phép xuất bãi khi thu tiền phí lưu bãi tại cổng');
SELECT is(current_setting('test.veh_exit_status'), 'EXITED', 'SC-R3-02: Xe kéo ra cập nhật trạng thái EXITED kèm exit_by thỏa mãn constraint');

-- GLC-03 assertions
SELECT is(current_setting('test.pending_review_clear_err'), 'true', 'GLC-03: Chặn CCKB duyệt clearance khi có phiên reefer PENDING_REVIEW');
SELECT is(current_setting('test.pending_review_exit_err'), 'true', 'GLC-03: Chặn An ninh cho xuất bãi khi có phiên reefer PENDING_REVIEW');

-- GLC-05 assertions
SELECT is(current_setting('test.veh_only_exit_status'), 'EXITED', 'GLC-05: Xe A ra bãi độc lập thành công');
SELECT is(current_setting('test.cont_still_in_yard'), 'IN_YARD', 'GLC-05: Container vẫn ở lại bãi khi Xe A ra một mình');
SELECT is(current_setting('test.truck_b_picks_cont_status'), 'EXITED', 'GLC-05: Xe B vào kéo container ra bãi thành công');

SELECT * FROM finish();
ROLLBACK;


