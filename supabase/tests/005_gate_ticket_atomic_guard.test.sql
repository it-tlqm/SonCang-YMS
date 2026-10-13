-- ==============================================================================
-- SƠN CẢNG YMS - PGTAP TEST CHO MIGRATION 005
-- File: supabase/tests/005_gate_ticket_atomic_guard.test.sql
-- Mục đích: Kiểm thử Backend Guard tính vé xe đầu kéo và RPC nguyên tử
-- ==============================================================================

BEGIN;
SELECT plan(15);

-- ------------------------------------------------------------------------------
-- 1. SETUP FIXTURES VÀ DATABASE ROLES
-- ------------------------------------------------------------------------------
SELECT has_table('public', 'app_yard_billing_settings', 'Bảng app_yard_billing_settings phải tồn tại');
SELECT has_function('public', 'sc_create_vehicle_and_container_visit_atomic', 'Hàm RPC sc_create_vehicle_and_container_visit_atomic phải tồn tại');

-- Lấy ID bãi và thiết lập fixture
DO $$
DECLARE
  v_yard_id uuid;
  v_user_sec uuid;
  v_role_sec_id uuid;
BEGIN
  SELECT id INTO v_yard_id FROM public.app_yards LIMIT 1;

  -- Tạo user an ninh mẫu
  INSERT INTO auth.users (id, email) 
  VALUES ('a0000000-0000-0000-0000-000000000005', 'sec_test_005@soncang.local')
  ON CONFLICT (id) DO NOTHING;

  -- Gán role SEC_STAFF theo schema RBAC V5 (app_user_role_assignments)
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, is_active)
  VALUES ('a0000000-0000-0000-0000-000000000005', 'SEC_STAFF', v_yard_id, true)
  ON CONFLICT DO NOTHING;
END $$;

-- ------------------------------------------------------------------------------
-- 2. KIỂM THỬ CẤU HÌNH BIỂU PHÍ BÃI (MẶC ĐỊNH OFF)
-- ------------------------------------------------------------------------------
SELECT ok(
  (SELECT empty_in_loaded_out_surcharge_enabled FROM public.app_yard_billing_settings LIMIT 1) = false,
  'empty_in_loaded_out_surcharge_enabled phải là false mặc định (chưa kích hoạt)'
);

-- ------------------------------------------------------------------------------
-- 3. TEST RPC NGUYÊN TỬ: XE ĐẦU KÉO KHÔNG CONTAINER (VÉ 0Đ, EXEMPT)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_yard_id uuid;
  v_res jsonb;
  v_veh_id uuid;
  v_amount numeric;
  v_status text;
BEGIN
  SELECT id INTO v_yard_id FROM public.app_yards LIMIT 1;

  -- Giả lập Auth Context của An ninh
  PERFORM set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000005', true);

  v_res := public.sc_create_vehicle_and_container_visit_atomic(
    p_yard_id => v_yard_id,
    p_vehicle_type => 'DAU_KEO',
    p_license_plate => '29C-00501',
    p_driver_name => 'Tài xế 005',
    p_has_container => false
  );

  v_veh_id := (v_res->>'vehicle_visit_id')::uuid;
  v_amount := (v_res->>'ticket_amount')::numeric;
  v_status := v_res->>'ticket_payment_status';

  -- Lưu biến kiểm tra
  PERFORM set_config('test.daukeo_nocont_amount', v_amount::text, true);
  PERFORM set_config('test.daukeo_nocont_status', v_status, true);
  PERFORM set_config('test.daukeo_nocont_has_cont', (v_res->>'container_visit_id' IS NULL)::text, true);
END $$;

SELECT is(current_setting('test.daukeo_nocont_amount')::numeric, 0::numeric, 'Xe đầu kéo không container vé phải là 0đ');
SELECT is(current_setting('test.daukeo_nocont_status'), 'EXEMPT', 'Xe đầu kéo không container trạng thái vé phải là EXEMPT');
SELECT is(current_setting('test.daukeo_nocont_has_cont'), 'true', 'Xe đầu kéo không container thì container_visit_id phải là NULL');


-- ------------------------------------------------------------------------------
-- 4. TEST RPC NGUYÊN TỬ: XE ĐẦU KÉO CÓ CONTAINER (VÉ 250.000Đ, UNPAID)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_yard_id uuid;
  v_res jsonb;
  v_veh_id uuid;
  v_cont_id uuid;
  v_amount numeric;
  v_status text;
BEGIN
  SELECT id INTO v_yard_id FROM public.app_yards LIMIT 1;
  PERFORM set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000005', true);

  v_res := public.sc_create_vehicle_and_container_visit_atomic(
    p_yard_id => v_yard_id,
    p_vehicle_type => 'DAU_KEO',
    p_license_plate => '29C-00502',
    p_has_container => true,
    p_container_no => 'MSKU0050021'
  );

  v_veh_id := (v_res->>'vehicle_visit_id')::uuid;
  v_cont_id := (v_res->>'container_visit_id')::uuid;
  v_amount := (v_res->>'ticket_amount')::numeric;
  v_status := v_res->>'ticket_payment_status';

  PERFORM set_config('test.daukeo_withcont_amount', v_amount::text, true);
  PERFORM set_config('test.daukeo_withcont_status', v_status, true);
  PERFORM set_config('test.daukeo_withcont_cont_ok', (v_cont_id IS NOT NULL)::text, true);
END $$;

SELECT is(current_setting('test.daukeo_withcont_amount')::numeric, 250000::numeric, 'Xe đầu kéo có container vé phải là 250.000đ');
SELECT is(current_setting('test.daukeo_withcont_status'), 'UNPAID', 'Xe đầu kéo có container trạng thái vé phải là UNPAID');
SELECT is(current_setting('test.daukeo_withcont_cont_ok'), 'true', 'Xe đầu kéo có container thì container_visit_id phải được tạo');


-- ------------------------------------------------------------------------------
-- 5. TEST GUARD: GẮN CONTAINER VÀO XE ĐẦU KÉO 0Đ ĐÃ TẠO TỰ ĐIỀU CHỈNH LÊN 250K
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_yard_id uuid;
  v_veh_id uuid;
  v_cont_id uuid;
  v_final_amount numeric;
  v_final_status text;
BEGIN
  SELECT id INTO v_yard_id FROM public.app_yards LIMIT 1;
  PERFORM set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000005', true);

  -- Bước 1: Tạo xe đầu kéo không cont qua RPC cũ (vé 0đ)
  v_veh_id := public.sc_create_vehicle_visit(
    p_yard_id => v_yard_id,
    p_vehicle_type => 'DAU_KEO',
    p_license_plate => '29C-00503'
  );

  -- Bước 2: Gọi sc_create_container_visit gắn container vào xe đó
  v_cont_id := public.sc_create_container_visit(
    p_yard_id => v_yard_id,
    p_container_no => 'TEMU0050033',
    p_inbound_vehicle_visit_id => v_veh_id
  );

  -- Bước 3: Lấy lại thông tin vé của xe
  SELECT ticket_amount, ticket_payment_status INTO v_final_amount, v_final_status
  FROM public.app_vehicle_visits WHERE id = v_veh_id;

  PERFORM set_config('test.guard_adjusted_amount', v_final_amount::text, true);
  PERFORM set_config('test.guard_adjusted_status', v_final_status, true);
END $$;

SELECT is(current_setting('test.guard_adjusted_amount')::numeric, 250000::numeric, 'Guard tự động điều chỉnh vé xe đầu kéo từ 0đ lên 250.000đ khi gắn cont');
SELECT is(current_setting('test.guard_adjusted_status'), 'UNPAID', 'Guard tự động chuyển trạng thái vé sang UNPAID khi gắn cont');


-- ------------------------------------------------------------------------------
-- 6. TEST ATOMICITY (ALL-OR-NOTHING KHI LỖI)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_yard_id uuid;
  v_err_caught boolean := false;
  v_veh_count integer;
BEGIN
  SELECT id INTO v_yard_id FROM public.app_yards LIMIT 1;
  PERFORM set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000005', true);

  BEGIN
    -- Số cont không hợp lệ ('X') -> phải rollback toàn bộ giao dịch
    PERFORM public.sc_create_vehicle_and_container_visit_atomic(
      p_yard_id => v_yard_id,
      p_vehicle_type => 'DAU_KEO',
      p_license_plate => '29C-00504',
      p_has_container => true,
      p_container_no => 'X'
    );
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;

  SELECT count(*) INTO v_veh_count
  FROM public.app_vehicle_visits
  WHERE license_plate = '29C-00504';

  PERFORM set_config('test.atomic_err_caught', v_err_caught::text, true);
  PERFORM set_config('test.atomic_veh_rollback', (v_veh_count = 0)::text, true);
END $$;

SELECT is(current_setting('test.atomic_err_caught'), 'true', 'RPC nguyên tử phải bắn Exception khi số container không hợp lệ');
SELECT is(current_setting('test.atomic_veh_rollback'), 'true', 'Giao dịch phải rollback toàn bộ, không được tạo lượt xe mồ côi');


-- ------------------------------------------------------------------------------
-- 7. TEST BẢO VỆ CHỐNG LOẠI XE KHÔNG ĐƯỢC CHỞ CONT
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_yard_id uuid;
  v_err_caught boolean := false;
BEGIN
  SELECT id INTO v_yard_id FROM public.app_yards LIMIT 1;
  PERFORM set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000005', true);

  BEGIN
    -- XE_BO_3_BANH có allows_container = false
    PERFORM public.sc_create_vehicle_and_container_visit_atomic(
      p_yard_id => v_yard_id,
      p_vehicle_type => 'XE_BO_3_BANH',
      p_license_plate => '3B-005',
      p_has_container => true,
      p_container_no => 'CONT3B001'
    );
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;

  PERFORM set_config('test.forbid_cont_err', v_err_caught::text, true);
END $$;

SELECT is(current_setting('test.forbid_cont_err'), 'true', 'Chặn xe không được phép chở container (XE_BO_3_BANH)');

-- ------------------------------------------------------------------------------
-- 8. TEST IDEMPOTENCY REPLAY ĐỐI CHIẾU PAYLOAD
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  v_yard_id uuid;
  v_res1 jsonb;
  v_res2 jsonb;
BEGIN
  SELECT id INTO v_yard_id FROM public.app_yards LIMIT 1;
  PERFORM set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000005', true);

  v_res1 := public.sc_create_vehicle_and_container_visit_atomic(
    p_yard_id => v_yard_id,
    p_vehicle_type => 'DAU_KEO',
    p_license_plate => '29C-00508',
    p_has_container => false,
    p_idempotency_key => 'IDEM_ATOMIC_005_TEST'
  );

  v_res2 := public.sc_create_vehicle_and_container_visit_atomic(
    p_yard_id => v_yard_id,
    p_vehicle_type => 'DAU_KEO',
    p_license_plate => '29C-00508',
    p_has_container => false,
    p_idempotency_key => 'IDEM_ATOMIC_005_TEST'
  );

  PERFORM set_config('test.idem_replay_match', 
    ((v_res1->>'vehicle_visit_id' = v_res2->>'vehicle_visit_id') AND (v_res2->>'is_replay' = 'true'))::text, true);
END $$;

SELECT is(current_setting('test.idem_replay_match'), 'true', 'Gọi lại cùng idempotency key và payload trả về kết quả replay an toàn');

SELECT * FROM finish();
ROLLBACK;
