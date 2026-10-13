-- ==============================================================================
-- SƠN CẢNG YMS - PGTAP TEST CHO MIGRATION 007 (FINANCIAL LEDGER)
-- File: supabase/tests/007_financial_ledger.test.sql
-- Mục đích: Kiểm thử sổ cái bất biến, phân quyền thu tiền (CCKB thu điện vs An ninh thu lưu bãi)
-- ==============================================================================

BEGIN;
SELECT plan(10);

-- 1. SETUP KIỂM TRA BẢNG VÀ HÀM
SELECT has_table('public', 'app_tariffs', 'Bảng app_tariffs phải tồn tại');
SELECT has_table('public', 'app_charges', 'Bảng app_charges phải tồn tại');
SELECT has_table('public', 'app_payments', 'Bảng app_payments phải tồn tại');
SELECT has_function('public', 'sc_collect_payment', 'Hàm sc_collect_payment phải tồn tại');

-- 2. SETUP DỮ LIỆU VÀ USERS
DO $$
DECLARE
  v_yard_id uuid;
  v_user_sec uuid := 'a0000000-0000-0000-0000-000000000007'::uuid;
  v_user_cckb uuid := 'c0000000-0000-0000-0000-000000000007'::uuid;
  v_charge_reefer_id uuid;
  v_charge_storage_id uuid;
  v_charge_other_id uuid;
  v_sec_reefer_err boolean := false;
  v_cckb_reefer_res jsonb;
  v_sec_storage_res jsonb;
  v_overpay_err boolean := false;
  v_other_unauth_err boolean := false;
BEGIN
  SELECT id INTO v_yard_id FROM public.app_yards LIMIT 1;

  -- Tạo users
  INSERT INTO auth.users (id, email) VALUES (v_user_sec, 'sec_007@soncang.local') ON CONFLICT DO NOTHING;
  INSERT INTO auth.users (id, email) VALUES (v_user_cckb, 'cckb_007@soncang.local') ON CONFLICT DO NOTHING;

  -- Gán roles theo schema RBAC V5 (app_user_role_assignments)
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, is_active)
  VALUES (v_user_sec, 'SEC_STAFF', v_yard_id, true) ON CONFLICT DO NOTHING;

  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, is_active)
  VALUES (v_user_cckb, 'PORT_STAFF', v_yard_id, true) ON CONFLICT DO NOTHING;

  -- Tạo khoản thu tiền điện
  INSERT INTO public.app_charges (yard_id, charge_type, amount, status)
  VALUES (v_yard_id, 'REEFER', 150000, 'UNPAID')
  RETURNING id INTO v_charge_reefer_id;

  -- Tạo khoản thu phí lưu bãi
  INSERT INTO public.app_charges (yard_id, charge_type, amount, status)
  VALUES (v_yard_id, 'STORAGE', 200000, 'UNPAID')
  RETURNING id INTO v_charge_storage_id;

  -- Tạo khoản thu loại OTHER
  INSERT INTO public.app_charges (yard_id, charge_type, amount, status)
  VALUES (v_yard_id, 'OTHER', 50000, 'UNPAID')
  RETURNING id INTO v_charge_other_id;

  -- THỬ NGHIỆM 1: An ninh cố thu tiền điện -> PHẢI BỊ CHẶN
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
  BEGIN
    PERFORM public.sc_collect_payment(v_charge_reefer_id, 150000, 'CASH');
  EXCEPTION WHEN OTHERS THEN
    v_sec_reefer_err := true;
  END;
  PERFORM set_config('test.sec_reefer_err', v_sec_reefer_err::text, true);

  -- THỬ NGHIỆM 2: CCKB thu tiền điện -> THÀNH CÔNG
  PERFORM set_config('request.jwt.claim.sub', v_user_cckb::text, true);
  v_cckb_reefer_res := public.sc_collect_payment(v_charge_reefer_id, 150000, 'CASH');
  PERFORM set_config('test.cckb_reefer_status', v_cckb_reefer_res->>'status', true);

  -- THỬ NGHIỆM 3: An ninh thu phí lưu bãi (AP07) -> THÀNH CÔNG
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
  v_sec_storage_res := public.sc_collect_payment(v_charge_storage_id, 200000, 'CASH');
  PERFORM set_config('test.sec_storage_status', v_sec_storage_res->>'status', true);
  PERFORM set_config('test.sec_storage_dept', v_sec_storage_res->>'dept', true);

  -- THỬ NGHIỆM 4 (ON-08): Cố thu vượt quá số dư còn lại (khoản 200k đã trả, cố thu thêm 50k) -> PHẢI BỊ CHẶN
  BEGIN
    PERFORM public.sc_collect_payment(v_charge_storage_id, 50000, 'CASH');
  EXCEPTION WHEN OTHERS THEN
    v_overpay_err := true;
  END;
  PERFORM set_config('test.overpay_err', v_overpay_err::text, true);

  -- THỬ NGHIỆM 5 (ON-02): User không có quyền thu khoản OTHER -> PHẢI BỊ CHẶN (Fail-Closed)
  PERFORM set_config('request.jwt.claim.sub', v_user_sec::text, true);
  BEGIN
    PERFORM public.sc_collect_payment(v_charge_other_id, 50000, 'CASH');
  EXCEPTION WHEN OTHERS THEN
    v_other_unauth_err := true;
  END;
  PERFORM set_config('test.other_unauth_err', v_other_unauth_err::text, true);
END $$;

SELECT is(current_setting('test.sec_reefer_err'), 'true', 'An ninh TUYỆT ĐỐI KHÔNG được thu tiền điện container');
SELECT is(current_setting('test.cckb_reefer_status'), 'PAID', 'CCKB thu tiền điện chuyển trạng thái khoản thu sang PAID');
SELECT is(current_setting('test.sec_storage_status'), 'PAID', 'An ninh thu phí lưu bãi thành công theo AP07');
SELECT is(current_setting('test.sec_storage_dept'), 'AN_NINH', 'Khoản thu phí lưu ghi nhận đúng bộ phận AN_NINH');
SELECT is(current_setting('test.overpay_err'), 'true', 'Chặn thanh toán vượt quá số dư còn lại (ON-08)');
SELECT is(current_setting('test.other_unauth_err'), 'true', 'Khoản thu OTHER bắt buộc kiểm tra quyền, fail-closed (ON-02)');

SELECT * FROM finish();
ROLLBACK;
