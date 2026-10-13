/**
 * SƠN CẢNG YMS — SMOKE TEST LUỒNG TIẾP NHẬN NGUYÊN TỬ (ATOMIC ENTRY SMOKE TEST)
 * Phiên bản hoàn thiện:
 * 1. Dùng đúng 100% chữ ký tham số RPC Migration 005 (sc_create_vehicle_and_container_visit_atomic).
 * 2. Thực thi psql với cờ -v ON_ERROR_STOP=1.
 * 3. Bắt buộc kiểm tra nội dung thực tế (assert stdout/NOTICE), nếu có bất kỳ lỗi nào thì test phải FAIL.
 * 4. Đảm bảo ngữ cảnh RBAC hợp lệ (SEC_STAFF với vehicle.visit.create & container.visit.create).
 * 5. Kiểm tra Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE mặc định tắt (an toàn).
 */

import { execSync } from 'child_process';
import assert from 'assert';

console.log('=== BẮT ĐẦU SMOKE TEST LUỒNG TIẾP NHẬN NGUYÊN TỬ ===\n');

// 1. Kiểm tra biến môi trường NEXT_PUBLIC_ENABLE_REAL_WRITE
console.log('[Test 1] Kiểm tra Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE...');
const isRealWriteEnv = process.env.NEXT_PUBLIC_ENABLE_REAL_WRITE;
console.log(`-> NEXT_PUBLIC_ENABLE_REAL_WRITE hiện tại: "${isRealWriteEnv || 'undefined'}"`);
assert.strictEqual(
  isRealWriteEnv === 'true',
  false,
  'AN TOÀN: Feature flag ghi Cloud DEV BẮT BUỘC phải mặc định TẮT (false hoặc undefined)!'
);
console.log('-> [PASS] Feature flag ghi Cloud được bảo vệ an toàn (OFF).\n');

// 2. Kiểm tra cờ ON_ERROR_STOP=1 hoạt động ngăn chặn lỗi âm thầm
console.log('[Test 2] Xác minh psql với -v ON_ERROR_STOP=1 chặn lỗi ngay lập tức...');
let onErrorStopWorks = false;
try {
  execSync(`docker exec -i supabase_db_YMS-project psql -v ON_ERROR_STOP=1 -U postgres -d soncang_gate_test`, {
    input: 'SELECT 1/0; SELECT 2;',
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
} catch (err) {
  onErrorStopWorks = true;
}
assert.strictEqual(onErrorStopWorks, true, 'Lỗi cơ sở hạ tầng: psql không dừng khi gặp lỗi dù có -v ON_ERROR_STOP=1!');
console.log('-> [PASS] Cờ -v ON_ERROR_STOP=1 hoạt động chính xác (fail-fast).\n');

// 3. Kiểm tra SQL RPC sc_create_vehicle_and_container_visit_atomic trên Local PostgreSQL
console.log('[Test 3] Kiểm tra hàm RPC sc_create_vehicle_and_container_visit_atomic trên PostgreSQL Local...');

const sqlTestScript = `
BEGIN;

DO $$
DECLARE
  v_yard_id uuid;
  v_operator_id uuid;
  v_res jsonb;
  v_veh_id uuid;
  v_cont_id uuid;
  v_veh_exists boolean;
  v_cont_exists boolean;
BEGIN
  -- Lấy user và yard có quyền SEC_STAFF
  SELECT r.user_id, r.yard_id INTO v_operator_id, v_yard_id
  FROM public.app_user_role_assignments r
  WHERE r.role_code = 'SEC_STAFF' AND r.is_active = true
  LIMIT 1;

  -- Nếu chưa có gán quyền, lấy yard và user rồi gán tạm thời trong transaction
  IF v_operator_id IS NULL OR v_yard_id IS NULL THEN
    SELECT id INTO v_yard_id FROM public.app_yards WHERE is_active = true LIMIT 1;
    SELECT id INTO v_operator_id FROM auth.users LIMIT 1;
    
    INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
    VALUES (v_operator_id, 'SEC_STAFF', v_yard_id, 'AN_NINH', true, v_operator_id);
  END IF;

  -- Thiết lập Session JWT của SEC_STAFF
  PERFORM set_config('request.jwt.claim.sub', v_operator_id::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);

  -- Kịch bản 1: Tạo xe CÓ container nguyên tử (Đúng 100% tham số Migration 005)
  SELECT public.sc_create_vehicle_and_container_visit_atomic(
    p_yard_id := v_yard_id,
    p_vehicle_type := 'CONT_LANH',
    p_license_plate := '11C-888.88',
    p_driver_name := 'Tài xế Smoke Test Cont',
    p_driver_phone := '0911223344',
    p_ticket_code := 'V-SMOKE-01',
    p_note := 'Test nguyên tử có cont',
    p_has_container := true,
    p_container_no := 'TGHU9998887',
    p_container_size := '40',
    p_container_type := 'RF',
    p_cargo_status := 'CHUA_XAC_DINH',
    p_idempotency_key := 'smoke-atomic-key-01'
  ) INTO v_res;

  v_veh_id := (v_res->>'vehicle_visit_id')::uuid;
  v_cont_id := (v_res->>'container_visit_id')::uuid;

  IF v_veh_id IS NULL OR v_cont_id IS NULL THEN
    RAISE EXCEPTION 'Kịch bản 1 thất bại: RPC không trả về đủ vehicle_visit_id và container_visit_id! Output: %', v_res;
  END IF;

  -- Kiểm tra 2 bản ghi cùng tồn tại
  SELECT EXISTS(SELECT 1 FROM public.app_vehicle_visits WHERE id = v_veh_id) INTO v_veh_exists;
  SELECT EXISTS(SELECT 1 FROM public.app_container_visits WHERE id = v_cont_id) INTO v_cont_exists;

  IF NOT (v_veh_exists AND v_cont_exists) THEN
    RAISE EXCEPTION 'Kịch bản 1 thất bại: CSDL thiếu 1 trong 2 bản ghi sau khi gọi RPC nguyên tử!';
  END IF;

  RAISE NOTICE '-> Kịch bản 1 PASS: Xe và Cont được tạo nguyên tử thành công (veh: %, cont: %)', v_veh_id, v_cont_id;

  -- Kịch bản 2: Tạo xe KHÔNG CÓ container (xe đầu kéo / bơ vào một mình)
  SELECT public.sc_create_vehicle_and_container_visit_atomic(
    p_yard_id := v_yard_id,
    p_vehicle_type := 'DAU_KEO',
    p_license_plate := '11C-999.99',
    p_driver_name := 'Tài xế Smoke Test Đầu Kéo',
    p_driver_phone := '0988776655',
    p_ticket_code := 'V-SMOKE-02',
    p_note := 'Test xe không cont',
    p_has_container := false,
    p_container_no := NULL,
    p_idempotency_key := 'smoke-atomic-key-02'
  ) INTO v_res;

  v_veh_id := (v_res->>'vehicle_visit_id')::uuid;
  v_cont_id := (v_res->>'container_visit_id')::uuid;

  IF v_veh_id IS NULL THEN
    RAISE EXCEPTION 'Kịch bản 2 thất bại: RPC không trả về vehicle_visit_id!';
  END IF;

  IF v_cont_id IS NOT NULL THEN
    RAISE EXCEPTION 'Kịch bản 2 thất bại: Xe không cont nhưng RPC lại tạo container_visit_id!';
  END IF;

  RAISE NOTICE '-> Kịch bản 2 PASS: Xe không cont tạo thành công, không sinh container_visit_id thừa.';

  -- Kịch bản 3: Idempotency Key bảo vệ lặp giao dịch (Replay cùng tham số)
  SELECT public.sc_create_vehicle_and_container_visit_atomic(
    p_yard_id := v_yard_id,
    p_vehicle_type := 'DAU_KEO',
    p_license_plate := '11C-999.99',
    p_driver_name := 'Tài xế Smoke Test Đầu Kéo',
    p_driver_phone := '0988776655',
    p_ticket_code := 'V-SMOKE-02',
    p_note := 'Test xe không cont',
    p_has_container := false,
    p_container_no := NULL,
    p_idempotency_key := 'smoke-atomic-key-02'
  ) INTO v_res;

  IF (v_res->>'is_replay')::boolean IS NOT TRUE THEN
    RAISE EXCEPTION 'Kịch bản 3 thất bại: Lệnh gọi trùng idempotency key không được đánh dấu là replay!';
  END IF;

  RAISE NOTICE '-> Kịch bản 3 PASS: Idempotency key hoạt động đúng (is_replay = true).';

END $$;

ROLLBACK;
`;

let psqlOutput = '';
try {
  psqlOutput = execSync(`docker exec -i supabase_db_YMS-project psql -v ON_ERROR_STOP=1 -U postgres -d soncang_gate_test 2>&1`, {
    input: sqlTestScript,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe']
  });
} catch (err) {
  console.error('[FAIL] LỖI khi chạy SQL smoke test (exit code khác 0):', err.stderr || err.stdout || err.message);
  process.exit(1);
}

// Phân tích và đối chiếu kết quả thực tế từ output psql
console.log('-> Phân tích kết quả thực tế từ PostgreSQL execution log...');
assert(psqlOutput.includes('Kịch bản 1 PASS: Xe và Cont được tạo nguyên tử thành công'), 'Thiếu xác nhận Kịch bản 1 PASS trong log thực tế');
assert(psqlOutput.includes('Kịch bản 2 PASS: Xe không cont tạo thành công'), 'Thiếu xác nhận Kịch bản 2 PASS trong log thực tế');
assert(psqlOutput.includes('Kịch bản 3 PASS: Idempotency key hoạt động đúng'), 'Thiếu xác nhận Kịch bản 3 PASS trong log thực tế');
assert(psqlOutput.includes('ROLLBACK'), 'Giao dịch kiểm thử bắt buộc phải kết thúc bằng ROLLBACK');
assert(!psqlOutput.includes('ERROR:'), 'Phát hiện lỗi SQL ERROR trong output: ' + psqlOutput);

console.log('-> [PASS] Kiểm thử RPC nguyên tử trên Local PostgreSQL hoàn tất xuất sắc (Toàn bộ 3 kịch bản PASS, ROLLBACK sạch)!\n');

console.log('============================================================');
console.log('TẤT CẢ SMOKE TESTS LUỒNG TIẾP NHẬN NGUYÊN TỬ ĐÃ VƯỢT QUA!');
console.log('============================================================\n');
