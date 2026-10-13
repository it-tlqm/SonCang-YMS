-- ==============================================================================
-- SƠN CẢNG YMS - GATE LOCAL RUNTIME E2E & RBAC INTEGRATION VERIFICATION
-- File: supabase/tests/gate_local_e2e_verification.sql
-- Mục đích: Kiểm thử thực tế các luồng P0/P1 dưới database role 'authenticated'
-- Tuân thủ: Tất cả trong transaction ROLLBACK để bảo đảm database sạch sẽ.
-- ==============================================================================

BEGIN;

DO $$
DECLARE
  v_yard_1 uuid := '20000000-0000-0000-0000-000000000001'::uuid;
  v_yard_2 uuid := '20000000-0000-0000-0000-000000000002'::uuid;
  
  -- Test Users
  v_user_sec uuid := 'a0000000-0000-0000-0000-000000000099'::uuid;
  v_user_cckb uuid := 'c0000000-0000-0000-0000-000000000099'::uuid;
  v_user_dis uuid := 'd0000000-0000-0000-0000-000000000099'::uuid;

  -- Variables for execution
  v_atomic_res jsonb;
  v_veh_id uuid;
  v_cont_id uuid;
  v_charge_id uuid;
  v_payment_id uuid;
  v_clearance_id uuid;
  v_session_id uuid;
  v_err_caught boolean := false;
  v_perm_count int;
  v_payment_amount numeric;
  v_collector_dept text;
BEGIN
  RAISE NOTICE '=== BẮT ĐẦU KIỂM THỬ RUNTIME GATE LOCAL SƠN CẢNG ===';

  -- ----------------------------------------------------------------------------
  -- BƯỚC 1: SETUP FIXTURE TEST USERS VÀ ROLES V5
  -- ----------------------------------------------------------------------------
  -- Đảm bảo bãi 1 và bãi 2 tồn tại
  INSERT INTO public.app_yards (id, name, is_active)
  VALUES 
    (v_yard_1, 'Bãi 1 - Cảng cạn Sơn Cảng', true),
    (v_yard_2, 'Bãi 2 - Cảng cạn Sơn Cảng', true)
  ON CONFLICT (id) DO NOTHING;

  -- Tạo user auth
  INSERT INTO auth.users (id, email)
  VALUES 
    (v_user_sec, 'sec_runtime_gate@soncang.local'),
    (v_user_cckb, 'cckb_runtime_gate@soncang.local'),
    (v_user_dis, 'dis_runtime_gate@soncang.local')
  ON CONFLICT (id) DO NOTHING;

  -- Gán role RBAC V5: SEC_STAFF (Bãi 1), PORT_STAFF (Bãi 1), DIS_STAFF (Bãi 1)
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active)
  VALUES
    (v_user_sec, 'SEC_STAFF', v_yard_1, 'AN_NINH', true),
    (v_user_cckb, 'PORT_STAFF', v_yard_1, 'CCKB', true),
    (v_user_dis, 'DIS_STAFF', v_yard_1, 'DIEU_PHOI', true)
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- BƯỚC 2: KIỂM THỬ RPC sc_my_permissions() DƯỚI ROLE 'authenticated' (SC-R3-07)
  -- ----------------------------------------------------------------------------
  RAISE NOTICE '--- TEST 1: Kiểm thử sc_my_permissions() cho SEC_STAFF và PORT_STAFF ---';
  
  -- Giả lập context SEC_STAFF
  SET ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);

  SELECT count(*) INTO v_perm_count FROM public.sc_my_permissions();
  IF v_perm_count <> 26 THEN
    RAISE EXCEPTION 'SC-R3-07 LỖI: SEC_STAFF phải có đúng 26 permissions, thực tế có: %', v_perm_count;
  END IF;
  RAISE NOTICE '-> PASS: SEC_STAFF có đúng 26 permissions qua RPC sc_my_permissions()';

  -- Giả lập context PORT_STAFF
  PERFORM set_config('request.jwt.claim.sub', v_user_cckb::text, true);
  SELECT count(*) INTO v_perm_count FROM public.sc_my_permissions();
  IF v_perm_count <> 31 THEN
    RAISE EXCEPTION 'SC-R3-07 LỖI: PORT_STAFF phải có đúng 31 permissions, thực tế có: %', v_perm_count;
  END IF;
  RAISE NOTICE '-> PASS: PORT_STAFF có đúng 31 permissions qua RPC sc_my_permissions()';

  -- ----------------------------------------------------------------------------
  -- BƯỚC 3: KIỂM THỬ IDEMPOTENCY KEY VÀ ATOMIC RETRY (SC-R3-08)
  -- ----------------------------------------------------------------------------
  RAISE NOTICE '--- TEST 2: Kiểm thử Idempotency Replay & Payload Mismatch Guard ---';
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);

  -- Lần 1: Gọi atomic tạo xe và cont với Idempotency Key 'KEY-RUNTIME-001'
  v_atomic_res := public.sc_create_vehicle_and_container_visit_atomic(
    p_yard_id => v_yard_1,
    p_vehicle_type => 'DAU_KEO',
    p_license_plate => '29C-88899',
    p_driver_name => 'Nguyễn Văn Test',
    p_driver_phone => '0988888888',
    p_ticket_code => 'VE-RT-001',
    p_has_container => true,
    p_container_no => 'MSKU9998881',
    p_idempotency_key => 'KEY-RUNTIME-001'
  );

  v_veh_id := (v_atomic_res->>'vehicle_visit_id')::uuid;
  v_cont_id := (v_atomic_res->>'container_visit_id')::uuid;
  IF v_veh_id IS NULL OR v_cont_id IS NULL THEN
    RAISE EXCEPTION 'Lỗi tạo lượt xe cont atomic';
  END IF;
  RAISE NOTICE '-> PASS: Tạo thành công xe % và cont % với Idempotency Key', v_veh_id, v_cont_id;

  -- Lần 2: Replay đúng nguyên văn payload -> Phải trả về đúng kết quả lần 1 không lỗi
  v_atomic_res := public.sc_create_vehicle_and_container_visit_atomic(
    p_yard_id => v_yard_1,
    p_vehicle_type => 'DAU_KEO',
    p_license_plate => '29C-88899',
    p_driver_name => 'Nguyễn Văn Test',
    p_driver_phone => '0988888888',
    p_ticket_code => 'VE-RT-001',
    p_has_container => true,
    p_container_no => 'MSKU9998881',
    p_idempotency_key => 'KEY-RUNTIME-001'
  );
  IF (v_atomic_res->>'vehicle_visit_id')::uuid <> v_veh_id THEN
    RAISE EXCEPTION 'Idempotency replay không trả về đúng record cũ!';
  END IF;
  RAISE NOTICE '-> PASS: Replay cùng Idempotency Key thành công idempotent (trả về đúng lượt xe cũ)';

  -- Lần 3: Dùng cùng Idempotency Key nhưng đổi driver_name -> Phải bị chặn lỗi MISMATCH
  v_err_caught := false;
  BEGIN
    PERFORM public.sc_create_vehicle_and_container_visit_atomic(
      p_yard_id => v_yard_1,
      p_vehicle_type => 'DAU_KEO',
      p_license_plate => '29C-88899',
      p_driver_name => 'Trần Văn Sai Payload',
      p_driver_phone => '0988888888',
      p_ticket_code => 'VE-RT-001',
      p_has_container => true,
      p_container_no => 'MSKU9998881',
      p_idempotency_key => 'KEY-RUNTIME-001'
    );
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'SC-R3-08 LỖI: Cùng idempotency key nhưng khác payload không bị chặn!';
  END IF;
  RAISE NOTICE '-> PASS: Chặn thành công mismatch payload khi trùng Idempotency Key';

  -- ----------------------------------------------------------------------------
  -- BƯỚC 4: KIỂM THỬ ĐIỆN CONT LẠNH: CẮM ĐIỆN, RÚT ĐIỆN VÀ PHÁT SINH CHARGE (SC-R3-09)
  -- ----------------------------------------------------------------------------
  RAISE NOTICE '--- TEST 3: Cắm/Rút điện và tự động tạo khoản thu app_charges ---';
  -- Đổi sang context CCKB (PORT_STAFF)
  PERFORM set_config('request.jwt.claim.sub', v_user_cckb::text, true);

  -- Cắm điện (giả lập cắm trước 30 phút qua tham số p_plugged_in_at)
  v_session_id := public.sc_plug_in_reefer(
    p_yard_id => v_yard_1,
    p_container_visit_id => v_cont_id,
    p_plugged_in_at => now() - interval '30 minutes',
    p_notes => 'Cắm điện container lạnh kiểm thử 30 phút'
  );
  RAISE NOTICE '-> PASS: CCKB cắm điện container thành công (session: %)', v_session_id;

  v_atomic_res := public.sc_unplug_reefer(
    p_session_id => v_session_id,
    p_unplugged_at => now(),
    p_notes => 'Rút điện kiểm thử'
  );
  RAISE NOTICE 'DEBUG UNPLUG RES: %', v_atomic_res;

  -- Lấy khoản thu tự động sinh ra trong app_charges
  SELECT id, amount INTO v_charge_id, v_payment_amount 
  FROM public.app_charges 
  WHERE container_visit_id = v_cont_id AND charge_type = 'REEFER'
  ORDER BY created_at DESC LIMIT 1;

  IF v_charge_id IS NULL THEN
    RAISE EXCEPTION 'SC-R3-09 LỖI: Rút điện không tạo khoản phải thu app_charges!';
  END IF;

  -- Kiểm tra chi tiết khoản thu trong app_charges
  SELECT amount INTO v_payment_amount FROM public.app_charges WHERE id = v_charge_id;
  IF v_payment_amount <> 50000 THEN
    RAISE EXCEPTION 'SC-R3-09 LỖI: Tiền điện 30 phút ở giá 100k/h phải là 50.000đ, thực tế: %', v_payment_amount;
  END IF;
  RAISE NOTICE '-> PASS: Rút điện tự động tạo khoản thu REEFER đúng số tiền 50.000đ (charge_id: %)', v_charge_id;

  -- ----------------------------------------------------------------------------
  -- BƯỚC 5: PHÂN QUYỀN THU TIỀN VÀ SỔ CÁI BẤT BIẾN (SC-R3-05, SC-R3-06)
  -- ----------------------------------------------------------------------------
  RAISE NOTICE '--- TEST 4: Phân quyền thu tiền (An ninh cấm thu điện, CCKB thu điện) ---';
  -- An ninh cố thu tiền điện -> Phải bị chặn fail-closed
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
  v_err_caught := false;
  BEGIN
    PERFORM public.sc_collect_payment(
      p_charge_id => v_charge_id,
      p_amount => 50000,
      p_payment_method => 'CASH'
    );
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'SC-R3-05 LỖI: An ninh không có reefer.payment.collect nhưng vẫn thu được tiền điện!';
  END IF;
  RAISE NOTICE '-> PASS: An ninh bị chặn tuyệt đối khi cố thu tiền điện';

  -- CCKB thu tiền điện -> Thành công
  PERFORM set_config('request.jwt.claim.sub', v_user_cckb::text, true);
  v_atomic_res := public.sc_collect_payment(
    p_charge_id => v_charge_id,
    p_amount => 50000,
    p_payment_method => 'CASH'
  );
  v_payment_id := (v_atomic_res->>'payment_id')::uuid;

  -- Xác minh schema app_payments (payment_amount, collector_dept = 'CCKB') (SC-R3-01)
  SELECT payment_amount, collector_dept INTO v_payment_amount, v_collector_dept
  FROM public.app_payments WHERE id = v_payment_id;
  IF v_payment_amount <> 50000 OR v_collector_dept <> 'CCKB' THEN
    RAISE EXCEPTION 'SC-R3-01 LỖI: Schema app_payments không khớp (amount: %, dept: %)', v_payment_amount, v_collector_dept;
  END IF;
  RAISE NOTICE '-> PASS: CCKB thu tiền điện thành công, bản ghi payment ghi nhận đúng schema (payment_id: %)', v_payment_id;

  -- Kiểm tra sổ cái bất biến: Cố tình UPDATE hoặc DELETE app_payments (SC-R3-06)
  RESET ROLE; -- Superuser cố sửa cũng phải bị chặn bởi trigger trg_payment_immutable
  v_err_caught := false;
  BEGIN
    UPDATE public.app_payments SET payment_amount = 999999 WHERE id = v_payment_id;
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'SC-R3-06 LỖI: Trigger trg_payment_immutable không chặn UPDATE trên app_payments!';
  END IF;
  RAISE NOTICE '-> PASS: Trigger trg_payment_immutable chặn tuyệt đối UPDATE trên sổ cái app_payments';

  -- ----------------------------------------------------------------------------
  -- BƯỚC 6: XUẤT BÃI VÀ THU PHÍ LƯU BÃI (SC-R3-01, SC-R3-02, SC-R3-04)
  -- ----------------------------------------------------------------------------
  RAISE NOTICE '--- TEST 5: Cấp lệnh xuất bãi CCKB và An ninh xác nhận xe ra cổng ---';
  -- CCKB cấp lệnh xuất bãi (Clearance)
  SET ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_user_cckb::text, true);

  PERFORM public.sc_approve_exit_clearance(
    p_container_visit_id => v_cont_id,
    p_allow_debt => false,
    p_notes => 'Đủ điều kiện xuất bãi'
  );
  RAISE NOTICE '-> PASS: CCKB cấp clearance thành công cho container %', v_cont_id;

  -- Giả lập container lưu bãi qua 2 đêm để phát sinh phí lưu bãi 100.000đ
  RESET ROLE;
  UPDATE public.app_container_visits
  SET inbound_at = now() - interval '2 days'
  WHERE id = v_cont_id;
  SET ROLE authenticated;

  -- An ninh xác nhận xe ra cổng và thu phí lưu bãi tại cổng (SC-R3-01, SC-R3-02)
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);

  PERFORM public.sc_confirm_physical_exit(
    p_container_visit_id => v_cont_id,
    p_outbound_vehicle_id => v_veh_id,
    p_notes => 'Xe ra cổng an toàn',
    p_paid_at_gate => true,
    p_payment_method => 'CASH'
  );

  -- Xác minh ràng buộc ck_vehicle_status_exit: status = 'EXITED' và exit_by = v_user_sec (SC-R3-02)
  SELECT exit_by INTO v_user_sec FROM public.app_vehicle_visits WHERE id = v_veh_id AND status = 'EXITED';
  IF v_user_sec IS NULL THEN
    RAISE EXCEPTION 'SC-R3-02 LỖI: Xe đã EXITED nhưng exit_by là NULL, vi phạm ràng buộc ck_vehicle_status_exit!';
  END IF;
  RAISE NOTICE '-> PASS: Xe ra cổng trạng thái EXITED có exit_by hợp lệ, thỏa mãn check constraint';

  -- Xác minh khoản thu lưu bãi tại cổng được ghi nhận vào app_payments với collector_dept = 'AN_NINH' (SC-R3-01)
  SELECT count(*) INTO v_perm_count 
  FROM public.app_payments 
  WHERE collector_dept = 'AN_NINH' AND payment_amount = 100000;
  IF v_perm_count <> 1 THEN
    RAISE EXCEPTION 'SC-R3-01 LỖI: Phí lưu bãi tại cổng không được ghi nhận đúng vào app_payments!';
  END IF;
  RAISE NOTICE '-> PASS: Phí lưu bãi tại cổng 100.000đ được ghi nhận đúng vào app_payments với collector_dept = AN_NINH';

  -- ----------------------------------------------------------------------------
  -- BƯỚC 7: GLC-01 & GLC-08: KIỂM THỬ BẢO VỆ TABLE PRIVILEGES VÀ RLS CHO CÁC BẢNG MỚI
  -- ----------------------------------------------------------------------------
  RAISE NOTICE '--- TEST 6 (GLC-01, GLC-08): Kiểm tra RLS và cấm client DML trên các bảng domain mới ---';
  RESET ROLE;
  -- Kiểm tra relrowsecurity = true trên tất cả bảng domain mới
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'app_tariffs' AND relrowsecurity = true) THEN
    RAISE EXCEPTION 'GLC-01 LỖI: app_tariffs chưa ENABLE ROW LEVEL SECURITY!';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'app_yard_billing_settings' AND relrowsecurity = true) THEN
    RAISE EXCEPTION 'GLC-01 LỖI: app_yard_billing_settings chưa ENABLE ROW LEVEL SECURITY!';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'app_reefer_power_sessions' AND relrowsecurity = true) THEN
    RAISE EXCEPTION 'GLC-01 LỖI: app_reefer_power_sessions chưa ENABLE ROW LEVEL SECURITY!';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'app_charges' AND relrowsecurity = true) THEN
    RAISE EXCEPTION 'GLC-01 LỖI: app_charges chưa ENABLE ROW LEVEL SECURITY!';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'app_payments' AND relrowsecurity = true) THEN
    RAISE EXCEPTION 'GLC-01 LỖI: app_payments chưa ENABLE ROW LEVEL SECURITY!';
  END IF;
  RAISE NOTICE '-> PASS: Toàn bộ 5 bảng domain mới 005-007 đều có relrowsecurity = true';

  -- Kiểm tra anon không có bất kỳ quyền DML nào
  IF has_table_privilege('anon', 'public.app_tariffs', 'SELECT') OR
     has_table_privilege('anon', 'public.app_charges', 'SELECT') OR
     has_table_privilege('anon', 'public.app_payments', 'SELECT') THEN
    RAISE EXCEPTION 'GLC-01 LỖI: Role anon có quyền SELECT trái phép trên bảng tài chính!';
  END IF;
  RAISE NOTICE '-> PASS: Role anon bị cấm SELECT trên các bảng tài chính domain';

  -- Kiểm tra authenticated không có quyền INSERT/UPDATE/DELETE trực tiếp
  IF has_table_privilege('authenticated', 'public.app_tariffs', 'INSERT') OR
     has_table_privilege('authenticated', 'public.app_charges', 'INSERT') OR
     has_table_privilege('authenticated', 'public.app_payments', 'INSERT') THEN
    RAISE EXCEPTION 'GLC-01 LỖI: Role authenticated có quyền INSERT trực tiếp trái phép!';
  END IF;

  -- Thử nghiệm trực tiếp dưới authenticated: Cố INSERT vào app_tariffs -> BỊ CHẶN
  SET ROLE authenticated;
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
  v_err_caught := false;
  BEGIN
    INSERT INTO public.app_tariffs (tariff_code, tariff_name, effective_from, status)
    VALUES ('HACK_TARIFF', 'Hacked', now(), 'ACTIVE');
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'GLC-08 LỖI: Client authenticated INSERT trực tiếp vào app_tariffs không bị chặn!';
  END IF;
  RAISE NOTICE '-> PASS: Client authenticated bị chặn tuyệt đối khi cố INSERT trực tiếp vào app_tariffs';

  -- ----------------------------------------------------------------------------
  -- BƯỚC 8: GLC-02: VÉ VÀO CỔNG TẠO CHARGE VÀ THU TIỀN ĐỐI SOÁT
  -- ----------------------------------------------------------------------------
  RAISE NOTICE '--- TEST 7 (GLC-02): Vé vào cổng tự động tạo app_charges TICKET và đối soát ---';
  -- SEC tạo xe vào có vé 250k (loại CONT_LANH tự động tính vé 250k)
  v_atomic_res := public.sc_create_vehicle_and_container_visit_atomic(
    p_yard_id => v_yard_1,
    p_vehicle_type => 'CONT_LANH',
    p_license_plate => '29C-TICKET-01',
    p_driver_name => 'Lái xe Vé Cổng',
    p_ticket_code => 'VE-PORT-01',
    p_has_container => true,
    p_container_no => 'MSKUTICKET1',
    p_idempotency_key => 'KEY-TICKET-TEST-01'
  );
  DECLARE
    v_veh_t_id uuid := (v_atomic_res->>'vehicle_visit_id')::uuid;
    v_ticket_charge record;
    v_veh_t_status text;
    v_charge_pay_res jsonb;
  BEGIN
    -- Kiểm tra bản ghi charge được tự động tạo
    SELECT * INTO v_ticket_charge 
    FROM public.app_charges 
    WHERE vehicle_visit_id = v_veh_t_id AND charge_type = 'TICKET';

    IF v_ticket_charge.id IS NULL OR v_ticket_charge.amount <> 250000 OR v_ticket_charge.status <> 'UNPAID' THEN
      RAISE EXCEPTION 'GLC-02 LỖI: Vé 250k không tự động tạo bản ghi charge TICKET UNPAID trong app_charges!';
    END IF;
    RAISE NOTICE '-> PASS: Vé 250k tự động phát sinh charge TICKET 250.000đ UNPAID trong sổ cái';

    -- An ninh thu tiền vé vào cổng qua sc_collect_payment
    v_charge_pay_res := public.sc_collect_payment(
      p_charge_id => v_ticket_charge.id,
      p_amount => 250000,
      p_payment_method => 'CASH',
      p_notes => 'Thu vé vào cổng bốt An ninh'
    );

    -- Kiểm tra cả charge và vehicle_visit đều đồng bộ trạng thái PAID
    SELECT ticket_payment_status INTO v_veh_t_status FROM public.app_vehicle_visits WHERE id = v_veh_t_id;
    SELECT status INTO v_ticket_charge.status FROM public.app_charges WHERE id = v_ticket_charge.id;

    IF v_veh_t_status <> 'PAID' OR v_ticket_charge.status <> 'PAID' THEN
      RAISE EXCEPTION 'GLC-02 LỖI: Sau khi thu tiền, trạng thái vé xe (%) hoặc charge (%) chưa đồng bộ PAID!',
        v_veh_t_status, v_ticket_charge.status;
    END IF;
    RAISE NOTICE '-> PASS: Thu tiền vé thành công, charge và vehicle_visit đều đồng bộ PAID';
  END;

  -- ----------------------------------------------------------------------------
  -- BƯỚC 9: GLC-03: CHẶN DUYỆT CLEARANCE VÀ XUẤT BÃI KHI CÓ PHIÊN PENDING_REVIEW
  -- ----------------------------------------------------------------------------
  RAISE NOTICE '--- TEST 8 (GLC-03): Chặn duyệt clearance và xuất bãi khi có phiên reefer PENDING_REVIEW ---';
  DECLARE
    v_veh_pr_id uuid;
    v_cont_pr_id uuid;
  BEGIN
    RESET ROLE; -- Superuser tạo fixtures
    -- Tạo xe và cont
    INSERT INTO public.app_vehicle_visits (
      yard_id, license_plate, vehicle_type, ticket_amount, ticket_payment_status, entry_by, status
    ) VALUES (
      v_yard_1, '14C-PR-001', 'CONT_LANH', 0, 'EXEMPT', v_user_sec, 'IN_YARD'
    ) RETURNING id INTO v_veh_pr_id;

    INSERT INTO public.app_container_visits (
      yard_id, container_no_current, container_no_original, container_type,
      inbound_vehicle_visit_id, created_by, status
    ) VALUES (
      v_yard_1, 'MSKUPREV001', 'MSKUPREV001', 'RF',
      v_veh_pr_id, v_user_sec, 'IN_YARD'
    ) RETURNING id INTO v_cont_pr_id;

    -- Thêm phiên cắm điện PENDING_REVIEW
    INSERT INTO public.app_reefer_power_sessions (
      yard_id, container_visit_id, plugged_in_at, plugged_in_by, power_status, total_power_amount, payment_status
    ) VALUES (
      v_yard_1, v_cont_pr_id, now(), v_user_sec, 'PENDING_REVIEW', 0, 'UNPAID'
    );

    SET ROLE authenticated;
    -- CCKB cố duyệt clearance -> Phải bị chặn
    PERFORM set_config('request.jwt.claim.sub', v_user_cckb::text, true);
    v_err_caught := false;
    BEGIN
      PERFORM public.sc_approve_exit_clearance(v_cont_pr_id, false);
    EXCEPTION WHEN OTHERS THEN
      v_err_caught := true;
    END;
    IF NOT v_err_caught THEN
      RAISE EXCEPTION 'GLC-03 LỖI: CCKB duyệt clearance cho cont có phiên PENDING_REVIEW không bị chặn!';
    END IF;
    RAISE NOTICE '-> PASS: CCKB bị chặn duyệt clearance khi container còn phiên điện PENDING_REVIEW';

    -- An ninh cố cho xuất bãi -> Phải bị chặn
    PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
    v_err_caught := false;
    BEGIN
      PERFORM public.sc_confirm_physical_exit(v_cont_pr_id);
    EXCEPTION WHEN OTHERS THEN
      v_err_caught := true;
    END;
    IF NOT v_err_caught THEN
      RAISE EXCEPTION 'GLC-03 LỖI: An ninh cho xuất bãi cont có phiên PENDING_REVIEW không bị chặn!';
    END IF;
    RAISE NOTICE '-> PASS: An ninh bị chặn xuất bãi khi container còn phiên điện PENDING_REVIEW';
  END;

  -- ----------------------------------------------------------------------------
  -- BƯỚC 10: GLC-04: ĐỒNG BỘ TRẠNG THÁI THANH TOÁN PHIÊN ĐIỆN KHI THU TIỀN
  -- ----------------------------------------------------------------------------
  RAISE NOTICE '--- TEST 9 (GLC-04): Đồng bộ payment_status của phiên điện khi thu tiền charge ---';
  DECLARE
    v_veh_rf_id uuid;
    v_cont_rf_id uuid;
    v_sess_rf_id uuid;
    v_charge_rf record;
    v_sess_status text;
  BEGIN
    RESET ROLE; -- Superuser tạo fixtures
    INSERT INTO public.app_vehicle_visits (
      yard_id, license_plate, vehicle_type, ticket_amount, ticket_payment_status, entry_by, status
    ) VALUES (
      v_yard_1, '14C-RF-002', 'CONT_LANH', 0, 'EXEMPT', v_user_sec, 'IN_YARD'
    ) RETURNING id INTO v_veh_rf_id;

    INSERT INTO public.app_container_visits (
      yard_id, container_no_current, container_no_original, container_type,
      inbound_vehicle_visit_id, created_by, status
    ) VALUES (
      v_yard_1, 'MSKURF00022', 'MSKURF00022', 'RF',
      v_veh_rf_id, v_user_sec, 'IN_YARD'
    ) RETURNING id INTO v_cont_rf_id;

    SET ROLE authenticated;
    -- Cắm điện và rút điện (2 tiếng)
    PERFORM set_config('request.jwt.claim.sub', v_user_cckb::text, true);
    v_sess_rf_id := public.sc_plug_in_reefer(
      p_yard_id => v_yard_1,
      p_container_visit_id => v_cont_rf_id,
      p_plugged_in_at => now() - interval '2 hours'
    );
    PERFORM public.sc_unplug_reefer(p_session_id => v_sess_rf_id, p_unplugged_at => now());

    -- Lấy charge được tạo
    SELECT * INTO v_charge_rf 
    FROM public.app_charges 
    WHERE reefer_session_id = v_sess_rf_id AND charge_type = 'REEFER';

    IF v_charge_rf.id IS NULL OR v_charge_rf.reefer_session_id <> v_sess_rf_id THEN
      RAISE EXCEPTION 'GLC-04 LỖI: Charge sinh ra không có liên kết reefer_session_id!';
    END IF;

    -- CCKB thu tiền
    PERFORM public.sc_collect_payment(
      p_charge_id => v_charge_rf.id,
      p_amount => v_charge_rf.amount,
      p_payment_method => 'CASH'
    );

    -- Kiểm tra payment_status của phiên điện
    SELECT payment_status INTO v_sess_status 
    FROM public.app_reefer_power_sessions 
    WHERE id = v_sess_rf_id;

    IF v_sess_status <> 'PAID' THEN
      RAISE EXCEPTION 'GLC-04 LỖI: Sau khi thu tiền, phiên điện có payment_status là % thay vì PAID!', v_sess_status;
    END IF;
    RAISE NOTICE '-> PASS: Thu tiền điện đồng bộ payment_status = PAID trên bảng app_reefer_power_sessions';
  END;

  -- ----------------------------------------------------------------------------
  -- BƯỚC 11: GLC-05: XE A HẠ CONT RA MỘT MÌNH, XE B VÀO LẤY CONT RA
  -- ----------------------------------------------------------------------------
  RAISE NOTICE '--- TEST 10 (GLC-05): Xe A hạ cont ra riêng, Xe B vào kéo cont ra ---';
  DECLARE
    v_truck_a_id uuid;
    v_cont_ab_id uuid;
    v_truck_b_id uuid;
    v_cont_status_check text;
    v_veh_b_exit record;
  BEGIN
    RESET ROLE; -- Superuser tạo fixtures
    -- Xe A đưa container vào bãi (có vé 250k đã trả)
    INSERT INTO public.app_vehicle_visits (
      yard_id, license_plate, vehicle_type, ticket_amount, ticket_payment_status, entry_by, status
    ) VALUES (
      v_yard_1, '29C-TRUCK-A', 'CONT_LANH', 250000, 'PAID', v_user_sec, 'IN_YARD'
    ) RETURNING id INTO v_truck_a_id;

    INSERT INTO public.app_container_visits (
      yard_id, container_no_current, container_no_original, container_type,
      inbound_vehicle_visit_id, created_by, status
    ) VALUES (
      v_yard_1, 'MSKUAB00001', 'MSKUAB00001', 'RF',
      v_truck_a_id, v_user_sec, 'IN_YARD'
    ) RETURNING id INTO v_cont_ab_id;

    SET ROLE authenticated;
    -- An ninh xác nhận Xe A ra một mình (sc_confirm_vehicle_only_exit)
    PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
    PERFORM public.sc_confirm_vehicle_only_exit(v_truck_a_id, 'Xe A hạ bãi cont và xuất bãi riêng');

    -- Kiểm tra trạng thái: Xe A EXITED, cont vẫn IN_YARD
    IF NOT EXISTS (SELECT 1 FROM public.app_vehicle_visits WHERE id = v_truck_a_id AND status = 'EXITED' AND exit_by = v_user_sec) THEN
      RAISE EXCEPTION 'GLC-05 LỖI: Xe A không ở trạng thái EXITED hoặc thiếu exit_by!';
    END IF;

    SELECT status INTO v_cont_status_check FROM public.app_container_visits WHERE id = v_cont_ab_id;
    IF v_cont_status_check <> 'IN_YARD' THEN
      RAISE EXCEPTION 'GLC-05 LỖI: Container không còn ở IN_YARD sau khi Xe A ra!';
    END IF;
    RAISE NOTICE '-> PASS: Xe A ra bãi một mình thành công, container an toàn ở lại trong bãi';

    -- Xe B vào bãi lấy container (xe đầu kéo, vé 0đ miễn phí)
    RESET ROLE; -- Superuser tạo fixture xe B
    INSERT INTO public.app_vehicle_visits (
      yard_id, license_plate, vehicle_type, ticket_amount, ticket_payment_status, entry_by, status
    ) VALUES (
      v_yard_1, '29C-TRUCK-B', 'DAU_KEO', 0, 'EXEMPT', v_user_sec, 'IN_YARD'
    ) RETURNING id INTO v_truck_b_id;

    SET ROLE authenticated;
    -- CCKB duyệt clearance cho container
    PERFORM set_config('request.jwt.claim.sub', v_user_cckb::text, true);
    PERFORM public.sc_approve_exit_clearance(v_cont_ab_id, false, 'Duyệt xuất cho Xe B nhận');

    -- An ninh xuất bãi container cùng Xe B (thu phí lưu bãi tại cổng nếu có)
    PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
    PERFORM public.sc_confirm_physical_exit(v_cont_ab_id, v_truck_b_id, 'Xe B kéo cont ra', true, 'CASH');

    -- Kiểm tra Xe B đã EXITED và container đã EXITED với outbound_vehicle_visit_id = Xe B
    SELECT * INTO v_veh_b_exit FROM public.app_vehicle_visits WHERE id = v_truck_b_id;
    IF v_veh_b_exit.status <> 'EXITED' OR v_veh_b_exit.exit_by IS NULL THEN
      RAISE EXCEPTION 'GLC-05 LỖI: Xe B kéo cont ra không chuyển thành EXITED!';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.app_container_visits WHERE id = v_cont_ab_id AND status = 'EXITED' AND outbound_vehicle_visit_id = v_truck_b_id) THEN
      RAISE EXCEPTION 'GLC-05 LỖI: Container không ghi nhận outbound_vehicle_visit_id = Xe B!';
    END IF;
    RAISE NOTICE '-> PASS: Xe B vào kéo container ra thành công hoàn chỉnh vòng đời Truck A -> Yard -> Truck B';
  END;

  -- ----------------------------------------------------------------------------
  -- BƯỚC 12: GLC-07: AN NINH CỐ SET HANG/RONG BỊ CHẶN (CHỈ ĐIỀU PHỐI ĐƯỢC SET)
  -- ----------------------------------------------------------------------------
  RAISE NOTICE '--- TEST 11 (GLC-07): An ninh không được set trạng thái HANG/RONG ---';
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
  v_err_caught := false;
  BEGIN
    PERFORM public.sc_create_vehicle_and_container_visit_atomic(
      p_yard_id => v_yard_1,
      p_vehicle_type => 'CONT_LANH',
      p_license_plate => '29C-DIS-01',
      p_driver_name => 'Lái xe Test Quyền Hàng Rỗng',
      p_has_container => true,
      p_container_no => 'MSKUCARGO1',
      p_cargo_status => 'HANG', -- An ninh cố tình set HANG
      p_idempotency_key => 'KEY-CARGO-TEST-01'
    );
  EXCEPTION WHEN OTHERS THEN
    v_err_caught := true;
  END;
  IF NOT v_err_caught THEN
    RAISE EXCEPTION 'GLC-07 LỖI: An ninh không có container.cargo.update nhưng vẫn set được p_cargo_status = HANG!';
  END IF;
  RAISE NOTICE '-> PASS: An ninh bị chặn 42501 khi cố tình gán trạng thái hàng/rỗng HANG';

  -- An ninh tạo container với trạng thái mặc định CHUA_XAC_DINH -> Thành công
  DECLARE
    v_cont_dis_res jsonb;
    v_cont_dis_id uuid;
  BEGIN
    v_cont_dis_res := public.sc_create_vehicle_and_container_visit_atomic(
      p_yard_id => v_yard_1,
      p_vehicle_type => 'CONT_LANH',
      p_license_plate => '29C-DIS-02',
      p_driver_name => 'Lái xe Bãi',
      p_has_container => true,
      p_container_no => 'MSKUCARGO2',
      p_cargo_status => 'CHUA_XAC_DINH',
      p_idempotency_key => 'KEY-CARGO-TEST-02'
    );
    v_cont_dis_id := (v_cont_dis_res->>'container_visit_id')::uuid;

    -- An ninh cố gọi hàm cập nhật hàng/rỗng -> Bị chặn
    v_err_caught := false;
    BEGIN
      PERFORM public.sc_update_container_cargo(v_cont_dis_id, 'HANG');
    EXCEPTION WHEN OTHERS THEN
      v_err_caught := true;
    END;
    IF NOT v_err_caught THEN
      RAISE EXCEPTION 'GLC-07 LỖI: An ninh không có container.cargo.update nhưng vẫn cập nhật được HANG!';
    END IF;
    RAISE NOTICE '-> PASS: An ninh bị chặn khi gọi sc_update_container_cargo';

    -- Điều phối (DIS_STAFF) cập nhật hàng/rỗng -> Thành công
    PERFORM set_config('request.jwt.claim.sub', v_user_dis::text, true);
    PERFORM public.sc_update_container_cargo(v_cont_dis_id, 'HANG');
    RAISE NOTICE '-> PASS: Điều phối (DIS_STAFF) cập nhật thành công trạng thái container sang HANG';
  END;

  RAISE NOTICE '=== TOÀN BỘ 11 TEST GROUP RUNTIME GATE LOCAL ĐÃ PASS 100%% ===';
END $$;

ROLLBACK; -- Đảm bảo database sạch sẽ hoàn toàn sau kiểm thử!
