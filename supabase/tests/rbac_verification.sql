-- ==============================================================================
-- RBAC VERIFICATION SUITE — SƠN CẢNG V5 (pgTAP INTEGRATION TEST)
-- Dự án: Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng
-- Khắc phục triệt để các phát hiện kiểm toán Vòng 5 (SC-R5-01 đến SC-R5-04):
-- 1. SC-R5-01: Fixture audit không hardcode ID (GENERATED ALWAYS), dùng RETURNING id; bắt đúng thông báo tiếng Việt.
-- 2. SC-R5-02: Kiểm thử RLS row-level visibility và privileges thực tế dưới database role authenticated:
--    * Nhân viên SEC_STAFF không có audit.read -> RLS ẩn hoàn toàn 0 bản ghi.
--    * Trưởng ban SEC_LEAD có audit.read (DEPARTMENT) -> Thấy AN_NINH, ẩn CCKB.
--    * Trưởng ban PORT_LEAD có audit.read (DEPARTMENT) -> Thấy CCKB Bãi 1, ẩn AN_NINH.
--    * SYS_ADMIN (ALL) -> Thấy toàn bộ.
-- 3. SC-R5-03: throws_ok() gọi đơn lẻ từng RPC, set auth trước, kiểm tra POSIX regex thông báo nghiệp vụ + request status giữ nguyên PENDING.
-- 4. SC-R5-04: Sử dụng hàm auth.uid() chuẩn của Supabase, không override hàm auth của hệ thống.
-- 5. Kế hoạch pgTAP: plan(49) chuẩn xác, chạy thành công trên Supabase Local PostgreSQL 17.
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

-- Khai báo kế hoạch kiểm thử: đúng 49 bài assertions
SELECT plan(49);

-- ------------------------------------------------------------------------------
-- 0. TẠO TEST FIXTURES & CẤU HÌNH PHIÊN XÁC THỰC
-- ------------------------------------------------------------------------------

-- Helper thiết lập JWT Context chuẩn của Supabase trong transaction
CREATE OR REPLACE FUNCTION pg_temp.set_test_auth(p_user_id uuid, p_role text DEFAULT 'authenticated')
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_user_id IS NULL THEN
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claim.role', 'anon', true);
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  ELSE
    PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
    PERFORM set_config('request.jwt.claim.role', p_role, true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id::text, 'role', p_role)::text, true);
  END IF;
END;
$$;

DO $$
DECLARE
  v_yard_1 uuid;
  v_yard_2 uuid;
  v_u_admin uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_u_sec uuid := '00000000-0000-0000-0000-000000000002'::uuid;
  v_u_port_lead uuid := '00000000-0000-0000-0000-000000000003'::uuid;
  v_u_dis uuid := '00000000-0000-0000-0000-000000000004'::uuid;
  v_u_expired uuid := '00000000-0000-0000-0000-000000000005'::uuid;
  v_u_inactive uuid := '00000000-0000-0000-0000-000000000006'::uuid;
  v_u_none uuid := '00000000-0000-0000-0000-000000000007'::uuid;
  v_u_other uuid := '00000000-0000-0000-0000-000000000008'::uuid;
  v_u_sec_lead uuid := '00000000-0000-0000-0000-000000000009'::uuid;
BEGIN
  -- Khởi tạo Bãi
  SELECT id INTO v_yard_1 FROM public.app_yards WHERE name = 'Bãi Sơn Cảng' LIMIT 1;
  IF v_yard_1 IS NULL THEN
    INSERT INTO public.app_yards (name, is_active) VALUES ('Bãi Sơn Cảng', true) RETURNING id INTO v_yard_1;
  END IF;

  SELECT id INTO v_yard_2 FROM public.app_yards WHERE name = 'Bãi Thử Nghiệm Số 2' LIMIT 1;
  IF v_yard_2 IS NULL THEN
    INSERT INTO public.app_yards (name, is_active) VALUES ('Bãi Thử Nghiệm Số 2', true) RETURNING id INTO v_yard_2;
  END IF;

  -- Lưu ID các bãi vào session để các bài test tái sử dụng
  PERFORM set_config('pg_temp.v_yard_1', v_yard_1::text, true);
  PERFORM set_config('pg_temp.v_yard_2', v_yard_2::text, true);

  -- Fixtures trong auth.users (nếu bảng tồn tại trong Supabase Auth)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
      (v_u_admin, 'admin_test@soncang.local', '{"role":"SYS_ADMIN"}'::jsonb),
      (v_u_sec, 'sec_test@soncang.local', '{"role":"SEC_STAFF"}'::jsonb),
      (v_u_port_lead, 'port_lead_test@soncang.local', '{"role":"PORT_LEAD"}'::jsonb),
      (v_u_dis, 'dis_test@soncang.local', '{"role":"DIS_STAFF"}'::jsonb),
      (v_u_expired, 'expired_test@soncang.local', '{"role":"SEC_STAFF"}'::jsonb),
      (v_u_inactive, 'inactive_test@soncang.local', '{"role":"SEC_STAFF"}'::jsonb),
      (v_u_none, 'none_test@soncang.local', '{"role":"NONE"}'::jsonb),
      (v_u_other, 'other_test@soncang.local', '{"role":"OTHER"}'::jsonb),
      (v_u_sec_lead, 'sec_lead_test@soncang.local', '{"role":"SEC_LEAD"}'::jsonb)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- 1. Admin: SYS_ADMIN (Scope ALL)
  INSERT INTO public.app_user_role_assignments (user_id, role_code, is_active)
  VALUES (v_u_admin, 'SYS_ADMIN', true);

  -- 2. An ninh: SEC_STAFF tại Bãi 1, Bộ phận AN_NINH (Scope YARD & SELF)
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active)
  VALUES (v_u_sec, 'SEC_STAFF', v_yard_1, 'AN_NINH', true);

  -- 3. CCKB Lead: PORT_LEAD tại Bãi 1, Bộ phận CCKB (Scope DEPARTMENT)
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active)
  VALUES (v_u_port_lead, 'PORT_LEAD', v_yard_1, 'CCKB', true);

  -- 4. Điều phối: DIS_STAFF tại Bãi 1, Bộ phận DIEU_PHOI
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active)
  VALUES (v_u_dis, 'DIS_STAFF', v_yard_1, 'DIEU_PHOI', true);

  -- 5. Expired assignment (SC-R4-01: valid_from < valid_until)
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, valid_from, valid_until)
  VALUES (v_u_expired, 'SEC_STAFF', v_yard_1, 'AN_NINH', true, now() - interval '2 hours', now() - interval '1 hour');

  -- 6. Inactive assignment
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active)
  VALUES (v_u_inactive, 'SEC_STAFF', v_yard_1, 'AN_NINH', false);

  -- 7. Trưởng ban An ninh: SEC_LEAD tại Bãi 1, Bộ phận AN_NINH (Scope DEPARTMENT)
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active)
  VALUES (v_u_sec_lead, 'SEC_LEAD', v_yard_1, 'AN_NINH', true);

  -- Dữ liệu mẫu phục vụ kiểm thử RLS Row-Level Visibility (SC-R5-02)
  INSERT INTO public.app_audit_events (action_code, target_type, target_id, yard_id, department_code, reason)
  VALUES 
    ('gate.in.log', 'vehicle_visit', 't1', v_yard_1, 'AN_NINH', 'Audit An Ninh Bãi 1'),
    ('reefer.plug.log', 'reefer_session', 't2', v_yard_1, 'CCKB', 'Audit CCKB Bãi 1'),
    ('reefer.plug.log', 'reefer_session', 't3', v_yard_2, 'CCKB', 'Audit CCKB Bãi 2');
END $$;


-- ==============================================================================
-- 1. TÍNH TOÀN VẸN SEED DỮ LIỆU & KÍCH HOẠT V1 CORE (7 tests)
-- ==============================================================================
SELECT is((SELECT count(*)::int FROM public.app_roles), 8, 'TEST 1.1: Phải có đúng 8 roles V5');
SELECT is((SELECT count(*)::int FROM public.app_roles WHERE is_active = true), 7, 'TEST 1.2: Phải có đúng 7 active roles V5');
SELECT is((SELECT count(*)::int FROM public.app_permissions), 67, 'TEST 1.3: Phải có đúng 67 permissions V5');
SELECT is((SELECT count(*)::int FROM public.app_permissions WHERE is_active = true), 60, 'TEST 1.4: Phải có đúng 60 V1 CORE active permissions');
SELECT is((SELECT count(*)::int FROM public.app_permissions WHERE is_active = false), 7, 'TEST 1.5: Phải có đúng 7 GĐ sau inactive permissions');
SELECT is((SELECT count(*)::int FROM public.app_role_permissions), 206, 'TEST 1.6: Phải có đúng 206 role grants');
SELECT is((SELECT count(*)::int FROM public.app_permissions WHERE code = '*' OR code LIKE '%*%'), 0, 'TEST 1.7: Không có wildcard *');


-- ==============================================================================
-- 2. PHÂN ĐỊNH TRÁCH NHIỆM — SOD (3 tests)
-- ==============================================================================
SELECT is(
  (SELECT count(*)::int FROM public.app_role_permissions WHERE role_code = 'SEC_STAFF' AND permission_code = 'reefer.payment.collect'),
  0,
  'TEST 2.1: An ninh không có quyền thu tiền điện'
);

SELECT is(
  (SELECT count(*)::int FROM public.app_role_permissions WHERE role_code = 'PORT_STAFF' AND permission_code = 'exit.actual.confirm'),
  0,
  'TEST 2.2: CCKB không có quyền xác nhận xe ra thực tế'
);

SELECT is(
  (SELECT count(*)::int FROM public.app_role_permissions WHERE role_code = 'DIS_STAFF' AND permission_code IN ('ticket.payment.collect', 'reefer.payment.collect', 'storage.payment.collect')),
  0,
  'TEST 2.3: Điều phối không có quyền thu các loại phí'
);


-- ==============================================================================
-- 3. QUYỀN DATABASE — PRIVILEGES CHECK (4 tests)
-- ==============================================================================
SELECT ok(
  NOT has_function_privilege('authenticated', 'public.sc_log_audit_event(text, text, text, uuid, text, jsonb, jsonb, text, text, jsonb)', 'EXECUTE'),
  'TEST 3.1: authenticated KHÔNG ĐƯỢC CÓ EXECUTE trên sc_log_audit_event (SC-R2-01)'
);

SELECT ok(
  has_function_privilege('service_role', 'public.sc_log_audit_event(text, text, text, uuid, text, jsonb, jsonb, text, text, jsonb)', 'EXECUTE'),
  'TEST 3.2: service_role ĐƯỢC CÓ EXECUTE trên sc_log_audit_event'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.app_approval_requests', 'INSERT'),
  'TEST 3.3: authenticated KHÔNG ĐƯỢC CÓ quyền INSERT trực tiếp trên app_approval_requests (SC-R4-02)'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.app_approval_requests', 'INSERT'),
  'TEST 3.4: anon KHÔNG ĐƯỢC CÓ quyền INSERT trên app_approval_requests'
);


-- ==============================================================================
-- 4. RÀNG BUỘC PHÊ DUYỆT & FOUR-EYES INTEGRITY (3 tests)
-- ==============================================================================
SELECT throws_ok(
  $$ INSERT INTO public.app_approval_requests(policy_code, target_type, target_id, requested_by, approved_by, reason, status)
     VALUES ('AP01', 'reefer_session', gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, NULL, 'Giả mạo APPROVED', 'APPROVED') $$,
  '23514',
  NULL,
  'TEST 4.1: DB phải chặn status APPROVED khi approved_by là NULL (chk_approval_status_lifecycle)'
);

SELECT throws_ok(
  $$ INSERT INTO public.app_approval_requests(policy_code, target_type, target_id, requested_by, approved_by, reason, status, decision_at)
     VALUES ('AP01', 'reefer_session', gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000001'::uuid, 'Tự duyệt chính mình', 'APPROVED', now()) $$,
  '23514',
  NULL,
  'TEST 4.2: DB phải chặn requested_by = approved_by (chk_four_eyes_actor)'
);

SELECT throws_ok(
  $$ INSERT INTO public.app_approval_requests(policy_code, target_type, target_id, requested_by, reason, status)
     VALUES ('AP01', 'reefer_session', gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid, '   ', 'PENDING') $$,
  '23514',
  NULL,
  'TEST 4.3: DB phải chặn lý do phê duyệt rỗng (chk_approval_reason_not_empty)'
);


-- ==============================================================================
-- 5. TÍNH BẤT BIẾN CỦA AUDIT LOG — IMMUTABILITY (SC-R5-01) (2 tests)
-- ==============================================================================
DO $$
DECLARE
  v_audit_id bigint;
BEGIN
  -- SC-R5-01: Không hardcode ID, capture ID sinh tự động từ identity column
  INSERT INTO public.app_audit_events (action_code, target_type, target_id, department_code, reason)
  VALUES ('test.audit_action', 'system', 'test_target', 'AN_NINH', 'Kiểm tra tính bất biến của audit log')
  RETURNING id INTO v_audit_id;

  PERFORM set_config('pg_temp.audit_test_id', v_audit_id::text, true);
END $$;

SELECT throws_ok(
  format('UPDATE public.app_audit_events SET reason = ''Bị sửa đổi trái phép'' WHERE id = %s', current_setting('pg_temp.audit_test_id')),
  'P0001',
  'Audit log is immutable. Cấm sửa hoặc xóa nhật ký kiểm toán hệ thống.',
  'TEST 5.1: Trigger sc_audit_immutable chặn sửa đổi UPDATE nhật ký kiểm toán (SC-R5-01)'
);

SELECT throws_ok(
  format('DELETE FROM public.app_audit_events WHERE id = %s', current_setting('pg_temp.audit_test_id')),
  'P0001',
  'Audit log is immutable. Cấm sửa hoặc xóa nhật ký kiểm toán hệ thống.',
  'TEST 5.2: Trigger sc_audit_immutable chặn xóa DELETE nhật ký kiểm toán (SC-R5-01)'
);


-- ==============================================================================
-- 6. KIỂM THỬ THAO TÁC BẢNG TRỰC TIẾP DƯỚI ROLE AUTHENTICATED (2 tests)
-- ==============================================================================
SET LOCAL ROLE authenticated;
SELECT pg_temp.set_test_auth('00000000-0000-0000-0000-000000000002'::uuid);

SELECT throws_ok(
  $$ INSERT INTO public.app_approval_requests(policy_code, target_type, target_id, requested_by, reason, status)
     VALUES ('AP01', 'reefer_session', gen_random_uuid(), '00000000-0000-0000-0000-000000000002'::uuid, 'Thử ghi trực tiếp', 'PENDING') $$,
  '42501',
  NULL,
  'TEST 6.1: Database role authenticated bị từ chối 42501 khi cố INSERT app_approval_requests'
);

SELECT throws_ok(
  $$ INSERT INTO public.app_audit_events(action_code, target_type, target_id, department_code, reason)
     VALUES ('fake.action', 'system', 'x', 'AN_NINH', 'Thử chèn audit') $$,
  '42501',
  NULL,
  'TEST 6.2: Database role authenticated bị từ chối 42501 khi cố INSERT app_audit_events'
);

RESET ROLE;


-- ==============================================================================
-- 7. KIỂM THỬ PHÊ DUYỆT FAIL-CLOSED TÁC VỤ MỘT BƯỚC AP06 (SC-R5-03) (2 tests)
-- ==============================================================================
DO $$
DECLARE
  v_req_id uuid;
BEGIN
  INSERT INTO public.app_approval_requests(
    policy_code, target_type, target_id, requested_by, reason, status
  ) VALUES (
    'AP06', 'vehicle_exit', gen_random_uuid(),
    '00000000-0000-0000-0000-000000000002'::uuid, 'Yêu cầu ngoại lệ nợ xe ra', 'PENDING'
  ) RETURNING id INTO v_req_id;

  PERFORM set_config('pg_temp.ap06_req_id', v_req_id::text, true);
END $$;

-- Thiết lập phiên người duyệt PORT_LEAD trước khi gọi RPC
SELECT pg_temp.set_test_auth('00000000-0000-0000-0000-000000000003'::uuid);

-- SC-R5-03: throws_ok chỉ gọi 1 RPC duy nhất, kiểm tra mã lỗi và thông báo nghiệp vụ chính xác
SELECT throws_ok(
  format('SELECT public.sc_approve_request(%L::uuid, ''Thử duyệt AP06'')', current_setting('pg_temp.ap06_req_id')),
  'P0001',
  'Chính sách AP06 là tác vụ một bước / không áp dụng phê duyệt qua RPC sc_approve_request. Thao tác bị từ chối.',
  'TEST 7.1: sc_approve_request phải fail-closed với chính sách một bước AP06 (SC-R5-03)'
);

-- Kiểm tra trạng thái yêu cầu giữ nguyên PENDING
SELECT is(
  (SELECT status FROM public.app_approval_requests WHERE id = current_setting('pg_temp.ap06_req_id')::uuid),
  'PENDING',
  'TEST 7.2: Trạng thái yêu cầu AP06 phải giữ nguyên PENDING sau khi bị từ chối (SC-R5-03)'
);


-- ==============================================================================
-- 8. KIỂM THỬ FOUR-EYES TRONG RPC (SC-R5-03) (2 tests)
-- ==============================================================================
DO $$
DECLARE
  v_yard_1 uuid;
  v_req_id uuid;
BEGIN
  SELECT id INTO v_yard_1 FROM public.app_yards WHERE name = 'Bãi Sơn Cảng' LIMIT 1;
  INSERT INTO public.app_approval_requests(
    policy_code, target_type, target_id, yard_id, department_code,
    requested_by, reason, status
  ) VALUES (
    'AP01', 'reefer_session', gen_random_uuid(), v_yard_1, 'CCKB',
    '00000000-0000-0000-0000-000000000003'::uuid, 'Yêu cầu sửa giờ điện', 'PENDING'
  ) RETURNING id INTO v_req_id;

  PERFORM set_config('pg_temp.foureyes_req_id', v_req_id::text, true);
END $$;

-- Thiết lập phiên của chính người đề xuất
SELECT pg_temp.set_test_auth('00000000-0000-0000-0000-000000000003'::uuid);

-- SC-R5-03: throws_ok đơn lẻ, kiểm tra lỗi Four-Eyes chính xác
SELECT throws_ok(
  format('SELECT public.sc_approve_request(%L::uuid, ''Tự duyệt đề xuất của mình'')', current_setting('pg_temp.foureyes_req_id')),
  'P0001',
  'Four-Eyes Violation: Người yêu cầu không được phép tự phê duyệt đề xuất của chính mình.',
  'TEST 8.1: sc_approve_request chặn tự duyệt chính mình theo nguyên tắc Four-Eyes (SC-R5-03)'
);

SELECT is(
  (SELECT status FROM public.app_approval_requests WHERE id = current_setting('pg_temp.foureyes_req_id')::uuid),
  'PENDING',
  'TEST 8.2: Trạng thái yêu cầu giữ nguyên PENDING sau khi vi phạm Four-Eyes (SC-R5-03)'
);


-- ==============================================================================
-- 9. UNIT TESTS: KIỂM THỬ HÀM LOGIC sc_can() QUA 4 SCOPES (16 tests)
-- ==============================================================================
DO $$
DECLARE
  v_yard_1 uuid;
  v_yard_2 uuid;
  v_u_admin uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_u_sec uuid := '00000000-0000-0000-0000-000000000002'::uuid;
  v_u_port_lead uuid := '00000000-0000-0000-0000-000000000003'::uuid;
  v_u_expired uuid := '00000000-0000-0000-0000-000000000005'::uuid;
  v_u_inactive uuid := '00000000-0000-0000-0000-000000000006'::uuid;
  v_u_none uuid := '00000000-0000-0000-0000-000000000007'::uuid;
  v_u_other uuid := '00000000-0000-0000-0000-000000000008'::uuid;
BEGIN
  v_yard_1 := current_setting('pg_temp.v_yard_1')::uuid;
  v_yard_2 := current_setting('pg_temp.v_yard_2')::uuid;

  -- 9.1 SCOPE ALL: SYS_ADMIN
  PERFORM pg_temp.set_test_auth(v_u_admin);
  PERFORM set_config('pg_temp.s_all_1', public.sc_can('vehicle.visit.read', v_yard_1)::text, true);
  PERFORM set_config('pg_temp.s_all_2', public.sc_can('vehicle.visit.read', v_yard_2)::text, true);
  PERFORM set_config('pg_temp.s_all_manage', public.sc_can('admin.role_permissions.manage')::text, true);

  -- 9.2 SCOPE YARD: SEC_STAFF (Bãi 1)
  PERFORM pg_temp.set_test_auth(v_u_sec);
  PERFORM set_config('pg_temp.s_yard_ok', public.sc_can('vehicle.visit.read', v_yard_1)::text, true);
  PERFORM set_config('pg_temp.s_yard_diff', public.sc_can('vehicle.visit.read', v_yard_2)::text, true);
  PERFORM set_config('pg_temp.s_yard_null', public.sc_can('vehicle.visit.read', NULL)::text, true);

  -- 9.3 SCOPE DEPARTMENT: PORT_LEAD (Bãi 1, CCKB)
  PERFORM pg_temp.set_test_auth(v_u_port_lead);
  PERFORM set_config('pg_temp.s_dept_ok', public.sc_can('reefer.session.amendment.approve', v_yard_1, 'CCKB')::text, true);
  PERFORM set_config('pg_temp.s_dept_diff_dept', public.sc_can('reefer.session.amendment.approve', v_yard_1, 'AN_NINH')::text, true);
  PERFORM set_config('pg_temp.s_dept_diff_yard', public.sc_can('reefer.session.amendment.approve', v_yard_2, 'CCKB')::text, true);

  -- 9.4 SCOPE SELF: report.revenue.read của SEC_STAFF
  PERFORM pg_temp.set_test_auth(v_u_sec);
  PERFORM set_config('pg_temp.s_self_ok', public.sc_can('report.revenue.read', v_yard_1, 'AN_NINH', v_u_sec)::text, true);
  PERFORM set_config('pg_temp.s_self_diff_owner', public.sc_can('report.revenue.read', v_yard_1, 'AN_NINH', v_u_other)::text, true);
  PERFORM set_config('pg_temp.s_self_diff_yard', public.sc_can('report.revenue.read', v_yard_2, 'AN_NINH', v_u_sec)::text, true);
  PERFORM set_config('pg_temp.s_self_null_owner', public.sc_can('report.revenue.read', v_yard_1, 'AN_NINH', NULL)::text, true);

  -- 9.5 Expired, Inactive, No-role
  PERFORM pg_temp.set_test_auth(v_u_expired);
  PERFORM set_config('pg_temp.s_expired', public.sc_can('vehicle.visit.read', v_yard_1)::text, true);

  PERFORM pg_temp.set_test_auth(v_u_inactive);
  PERFORM set_config('pg_temp.s_inactive', public.sc_can('vehicle.visit.read', v_yard_1)::text, true);

  PERFORM pg_temp.set_test_auth(v_u_none);
  PERFORM set_config('pg_temp.s_none', public.sc_can('vehicle.visit.read', v_yard_1)::text, true);

  PERFORM pg_temp.set_test_auth(NULL);
END $$;

SELECT is(current_setting('pg_temp.s_all_1')::boolean, true, 'TEST 9.1: SCOPE ALL ALLOW Bãi 1');
SELECT is(current_setting('pg_temp.s_all_2')::boolean, true, 'TEST 9.2: SCOPE ALL ALLOW Bãi 2');
SELECT is(current_setting('pg_temp.s_all_manage')::boolean, true, 'TEST 9.3: SCOPE ALL ALLOW quản trị hệ thống');

SELECT is(current_setting('pg_temp.s_yard_ok')::boolean, true, 'TEST 9.4: SCOPE YARD ALLOW đúng Bãi 1');
SELECT is(current_setting('pg_temp.s_yard_diff')::boolean, false, 'TEST 9.5: SCOPE YARD DENY Bãi 2 khác');
SELECT is(current_setting('pg_temp.s_yard_null')::boolean, false, 'TEST 9.6: SCOPE YARD DENY khi không truyền yard');

SELECT is(current_setting('pg_temp.s_dept_ok')::boolean, true, 'TEST 9.7: SCOPE DEPARTMENT ALLOW đúng Bãi 1 và CCKB');
SELECT is(current_setting('pg_temp.s_dept_diff_dept')::boolean, false, 'TEST 9.8: SCOPE DEPARTMENT DENY khác bộ phận');
SELECT is(current_setting('pg_temp.s_dept_diff_yard')::boolean, false, 'TEST 9.9: SCOPE DEPARTMENT DENY khác bãi');

SELECT is(current_setting('pg_temp.s_self_ok')::boolean, true, 'TEST 9.10: SCOPE SELF ALLOW khi đúng owner_id (SC-R4-05)');
SELECT is(current_setting('pg_temp.s_self_diff_owner')::boolean, false, 'TEST 9.11: SCOPE SELF DENY khi sai owner_id (SC-R4-05)');
SELECT is(current_setting('pg_temp.s_self_diff_yard')::boolean, false, 'TEST 9.12: SCOPE SELF DENY khi sai bãi (SC-R4-05)');
SELECT is(current_setting('pg_temp.s_self_null_owner')::boolean, false, 'TEST 9.13: SCOPE SELF DENY khi bỏ trống owner_id (SC-R4-05)');

SELECT is(current_setting('pg_temp.s_expired')::boolean, false, 'TEST 9.14: Vai trò hết hạn DENY');
SELECT is(current_setting('pg_temp.s_inactive')::boolean, false, 'TEST 9.15: Vai trò inactive DENY');
SELECT is(current_setting('pg_temp.s_none')::boolean, false, 'TEST 9.16: Người dùng không có vai trò DENY');


-- ==============================================================================
-- 10. INTEGRATION TESTS: RLS ROW-LEVEL VISIBILITY DƯỚI ROLE AUTHENTICATED (SC-R5-02) (7 tests)
-- ==============================================================================
SET LOCAL ROLE authenticated;

-- 10.1: SEC_STAFF (Nhân viên thường không có quyền audit.read -> RLS ẩn toàn bộ)
SELECT pg_temp.set_test_auth('00000000-0000-0000-0000-000000000002'::uuid);
SELECT is(
  (SELECT count(*)::int FROM public.app_audit_events),
  0,
  'TEST 10.1: RLS ẩn toàn bộ audit rows đối với nhân viên thường SEC_STAFF (không có quyền audit.read)'
);

-- 10.2 & 10.3: SEC_LEAD (Trưởng bộ phận AN_NINH Bãi 1 -> thấy AN_NINH, ẩn CCKB)
SELECT pg_temp.set_test_auth('00000000-0000-0000-0000-000000000009'::uuid);
SELECT ok(
  EXISTS(SELECT 1 FROM public.app_audit_events WHERE department_code = 'AN_NINH' AND yard_id = current_setting('pg_temp.v_yard_1')::uuid),
  'TEST 10.2: RLS cho phép SEC_LEAD thấy audit rows thuộc bộ phận AN_NINH Bãi 1'
);
SELECT is(
  (SELECT count(*)::int FROM public.app_audit_events WHERE department_code = 'CCKB'),
  0,
  'TEST 10.3: RLS ẩn hoàn toàn audit rows của bộ phận CCKB đối với SEC_LEAD'
);

-- 10.4 & 10.5: PORT_LEAD (Trưởng bộ phận CCKB Bãi 1 -> thấy CCKB Bãi 1, ẩn AN_NINH)
SELECT pg_temp.set_test_auth('00000000-0000-0000-0000-000000000003'::uuid);
SELECT ok(
  EXISTS(SELECT 1 FROM public.app_audit_events WHERE department_code = 'CCKB' AND yard_id = current_setting('pg_temp.v_yard_1')::uuid),
  'TEST 10.4: RLS cho phép PORT_LEAD thấy audit rows thuộc bộ phận CCKB Bãi 1'
);
SELECT is(
  (SELECT count(*)::int FROM public.app_audit_events WHERE department_code = 'AN_NINH'),
  0,
  'TEST 10.5: RLS ẩn hoàn toàn audit rows của bộ phận AN_NINH đối với PORT_LEAD'
);

-- 10.6: SYS_ADMIN (Scope ALL)
SELECT pg_temp.set_test_auth('00000000-0000-0000-0000-000000000001'::uuid);
SELECT ok(
  (SELECT count(*)::int FROM public.app_audit_events) >= 3,
  'TEST 10.6: RLS cho phép SYS_ADMIN thấy toàn bộ audit rows trên tất cả các bãi và bộ phận'
);

-- 10.7: User không có vai trò (NONE)
SELECT pg_temp.set_test_auth('00000000-0000-0000-0000-000000000007'::uuid);
SELECT is(
  (SELECT count(*)::int FROM public.app_audit_events),
  0,
  'TEST 10.7: RLS ẩn toàn bộ audit rows đối với người dùng không có vai trò'
);

RESET ROLE;


-- ==============================================================================
-- 11. TRIGGER AUDIT TỰ ĐỘNG KHI THAY ĐỔI VAI TRÒ (1 test)
-- ==============================================================================
DO $$
DECLARE
  v_assign_id uuid;
BEGIN
  INSERT INTO public.app_user_role_assignments(user_id, role_code, is_active)
  VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'DIS_LEAD', true)
  RETURNING id INTO v_assign_id;

  PERFORM set_config('pg_temp.audit_target_id', v_assign_id::text, true);
END $$;

SELECT is(
  (SELECT count(*)::int FROM public.app_audit_events WHERE action_code = 'system.role.assign' AND target_id = current_setting('pg_temp.audit_target_id')),
  1,
  'TEST 11.1: Trigger tự động ghi audit event khi phân công vai trò'
);


-- ==============================================================================
-- KẾT THÚC TEST VÀ ROLLBACK
-- ==============================================================================
SELECT * FROM finish();

ROLLBACK;
