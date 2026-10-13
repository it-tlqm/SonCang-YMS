const fs = require('fs');
const path = require('path');

function verify() {
  console.log('================================================================');
  console.log('KIỂM TRA BẢO MẬT & BẤT BIẾN RBAC SƠN CẢNG (AUTOMATED TEST V2)');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Kiểm tra file verified
  const roles = JSON.parse(fs.readFileSync(path.join(__dirname, 'verified_roles.json'), 'utf8'));
  const perms = JSON.parse(fs.readFileSync(path.join(__dirname, 'verified_permissions.json'), 'utf8'));
  const grants = JSON.parse(fs.readFileSync(path.join(__dirname, 'verified_grants.json'), 'utf8'));

  assert(roles.length === 8, `Số vai trò phải đúng 8 (hiện có: ${roles.length})`);
  assert(roles.filter(r => r.is_active).length === 7, `Số vai trò active V1 phải là 7 (hiện có: ${roles.filter(r => r.is_active).length})`);
  assert(roles.find(r => r.code === 'ACCOUNTING_FUTURE')?.is_active === false, 'ACCOUNTING_FUTURE phải có is_active = false');
  assert(perms.length === 67, `Số mã quyền phải đúng 67 (hiện có: ${perms.length})`);
  
  // RBAC-01 Check
  const activePerms = perms.filter(p => p.is_active);
  const inactivePerms = perms.filter(p => !p.is_active);
  assert(activePerms.length === 60, `RBAC-01: Quyền V1 CORE active phải đúng 60 (hiện có: ${activePerms.length})`);
  assert(inactivePerms.length === 7, `RBAC-01: Quyền GĐ sau inactive phải đúng 7 (hiện có: ${inactivePerms.length})`);

  assert(grants.length === 206, `Số cấp quyền grants phải đúng 206 (hiện có: ${grants.length})`);

  // 2. Không có wildcard
  const wildcards = perms.filter(p => p.code.includes('*'));
  assert(wildcards.length === 0, 'Không được có mã quyền chứa ký tự đại diện wildcard (*)');

  // 3. Phân định vai trò
  const secCollectElectric = grants.find(g => g.role_code === 'SEC_STAFF' && g.permission_code === 'reefer.payment.collect');
  assert(!secCollectElectric, 'SEC_STAFF tuyệt đối không có quyền thu tiền điện (reefer.payment.collect)');

  const portConfirmExit = grants.find(g => g.role_code === 'PORT_STAFF' && g.permission_code === 'exit.actual.confirm');
  assert(!portConfirmExit, 'PORT_STAFF tuyệt đối không có quyền xác nhận xe ra thực tế (exit.actual.confirm)');

  const disFee = grants.find(g => g.role_code === 'DIS_STAFF' && ['ticket.payment.collect', 'reefer.payment.collect'].includes(g.permission_code));
  assert(!disFee, 'DIS_STAFF tuyệt đối không có quyền thu phí hoặc sửa tiền bến bãi/điện');

  // 4. Kiểm tra nội dung migration SQL 001
  const m1 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261011000001_foundation_rbac.sql'), 'utf8');
  assert(m1.includes('approved_by <> requested_by'), 'Migration 001 phải có CHECK constraint chk_four_eyes_actor (approved_by <> requested_by)');
  assert(m1.includes('chk_approval_status_lifecycle'), 'Migration 001 phải có CHECK constraint chk_approval_status_lifecycle (RBAC-02)');
  assert(m1.includes('chk_approval_reason_not_empty'), 'Migration 001 phải có CHECK constraint chk_approval_reason_not_empty (RBAC-02)');
  assert(m1.includes('department_code text REFERENCES public.app_departments'), 'Migration 001 bảng app_audit_events phải có department_code (RBAC-04)');

  // 5. Kiểm tra nội dung migration SQL 002
  const m2 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261011000002_seed_rbac_v5.sql'), 'utf8');
  const m2ActivePermsCount = (m2.match(/INSERT INTO public\.app_permissions.*?,\s*TRUE\) ON CONFLICT/g) || []).length;
  const m2InactivePermsCount = (m2.match(/INSERT INTO public\.app_permissions.*?,\s*FALSE\) ON CONFLICT/g) || []).length;
  assert(m2ActivePermsCount === 60, `Migration 002 phải seed đúng 60 quyền TRUE (hiện có: ${m2ActivePermsCount})`);
  assert(m2InactivePermsCount === 7, `Migration 002 phải seed đúng 7 quyền FALSE (hiện có: ${m2InactivePermsCount})`);

  // 6. Kiểm tra nội dung migration SQL 003
  const m3 = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261011000003_rbac_security_functions_rls.sql'), 'utf8');
  assert(m3.includes('BEFORE UPDATE OR DELETE ON public.app_audit_events'), 'Migration 003 phải có trigger chặn UPDATE/DELETE trên app_audit_events');
  assert(m3.includes('Audit log is immutable'), 'Hàm sc_audit_immutable phải raise exception thông báo audit log bất biến');
  assert(m3.includes('SECURITY DEFINER SET search_path = \'\''), 'Hàm sc_can và sc_my_permissions phải cấu hình SECURITY DEFINER và search_path = \'\'');
  
  // SC-R2-01 to SC-R2-08 Checks in Migration 001 & 003
  assert(m1.includes('yard_id uuid REFERENCES public.app_yards'), 'Migration 001 bảng app_approval_requests phải có yard_id (SC-R2-03)');
  assert(m1.includes('department_code text REFERENCES public.app_departments'), 'Migration 001 bảng app_approval_requests phải có department_code (SC-R2-03)');

  assert(m3.includes('CREATE OR REPLACE FUNCTION public.sc_log_audit_event'), 'Migration 003 phải có hàm sc_log_audit_event (RBAC-03)');
  assert(!m3.includes('CREATE POLICY p_audit_insert ON public.app_audit_events'), 'Migration 003 KHÔNG ĐƯỢC CÓ policy p_audit_insert cho client (RBAC-03)');
  assert(m3.includes('REVOKE ALL ON FUNCTION public.sc_log_audit_event FROM authenticated'), 'SC-R2-01: sc_log_audit_event phải REVOKE ALL khỏi authenticated');
  assert(!m3.includes('GRANT EXECUTE ON FUNCTION public.sc_log_audit_event TO authenticated'), 'SC-R2-01: sc_log_audit_event KHÔNG ĐƯỢC CẤP EXECUTE cho authenticated');

  assert(m3.includes('trg_audit_user_roles'), 'Migration 003 phải có trigger trg_audit_user_roles tự động log audit gán role (RBAC-05)');
  assert(m3.includes('trg_audit_role_perms'), 'Migration 003 phải có trigger trg_audit_role_perms tự động log audit cấp quyền (RBAC-05)');
  assert(m3.includes('CREATE OR REPLACE FUNCTION public.sc_create_approval_request'), 'Migration 003 phải có RPC sc_create_approval_request an toàn (SC-R2-04)');
  assert(m3.includes('CREATE OR REPLACE FUNCTION public.sc_approve_request'), 'Migration 003 phải có RPC sc_approve_request thực thi Four-Eyes (RBAC-02)');
  assert(m3.includes('CREATE OR REPLACE FUNCTION public.sc_reject_request'), 'Migration 003 phải có RPC sc_reject_request (RBAC-02)');
  assert(m3.includes('v_pol.approve_permission_code IS NULL THEN'), 'SC-R2-02: Phê duyệt phải fail-closed khi approve_permission_code IS NULL');
  assert(m3.includes('public.sc_can(v_pol.approve_permission_code, v_req.yard_id, v_req.department_code)'), 'SC-R2-03: sc_approve_request phải truyền yard_id và department_code vào sc_can');
  assert(m3.includes('ap.policy_code = app_approval_requests.policy_code'), 'SC-R2-04: RLS approval phải liên kết tường minh ap.policy_code = app_approval_requests.policy_code');
  assert(m3.includes('REVOKE INSERT ON public.app_approval_requests FROM authenticated'), 'SC-R4-02: Thu hồi quyền INSERT trực tiếp trên app_approval_requests khỏi authenticated');
  assert(!m3.includes('CREATE POLICY p_approval_insert'), 'SC-R4-02: Không cấp policy INSERT trực tiếp trên app_approval_requests cho client');
  assert(m3.includes("public.sc_can('audit.read', yard_id, department_code)"), 'Migration 003 RLS p_audit_select phải truyền department_code (RBAC-04)');

  // Check 4 scopes supported in sc_can
  assert(m3.includes("rp.scope = 'ALL'"), 'sc_can phải hỗ trợ scope ALL');
  assert(m3.includes("rp.scope = 'YARD'"), 'sc_can phải hỗ trợ scope YARD');
  assert(m3.includes("rp.scope = 'DEPARTMENT'"), 'sc_can phải hỗ trợ scope DEPARTMENT');
  assert(m3.includes("rp.scope = 'SELF'"), 'sc_can phải hỗ trợ scope SELF');

  // Check RLS enabled on all 11 tables
  const rlsTables = [
    'app_departments', 'app_yards', 'app_roles', 'app_permissions',
    'app_role_permissions', 'app_user_role_assignments', 'app_feature_flags',
    'app_settings', 'app_approval_policies', 'app_approval_requests', 'app_audit_events'
  ];
  for (const t of rlsTables) {
    assert(m3.includes(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY;`), `Bảng ${t} phải được ENABLE ROW LEVEL SECURITY`);
  }

  console.log('----------------------------------------------------------------');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passed} PASS, ${failed} FAIL`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

verify();
