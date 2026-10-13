/**
 * SƠN CẢNG YMS — KIỂM THỬ TRÌNH DUYỆT / HTTP CLIENT CHO 3 ROLE ĐẠI DIỆN
 * Kiểm tra xác thực Supabase Cloud DEV thật, Next.js HTTP Server (localhost:3000),
 * RBAC Action Permissions V5, và phân quyền thu phí lưu bãi / cổng ra.
 */

import fs from 'fs';
import http from 'http';
import { createClient } from '@supabase/supabase-js';

const CRED_FILE = 'C:\\Users\\private\\.soncang\\uat_credentials.json';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://euswzyespwaxyrjkfkrq.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HjmQVCIeCxpMIPCCWHBT5w_E01JstPr';
const APP_URL = 'http://localhost:3000';

function checkHttpServer(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      resolve({ statusCode: res.statusCode });
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('HTTP request timeout'));
    });
  });
}

async function testRole(acc, client) {
  const roleCode = acc.role;
  console.log(`\n================================================================`);
  console.log(`KIỂM THỬ ROLE: ${roleCode} (${acc.fullName} - ${acc.email})`);
  console.log(`================================================================`);

  // 1. Đăng nhập Supabase Auth thật
  const { data: authData, error: authErr } = await client.auth.signInWithPassword({
    email: acc.email,
    password: acc.password,
  });

  if (authErr || !authData.session) {
    console.error(`[FAIL] Đăng nhập Supabase Auth thất bại:`, authErr?.message);
    return { role: roleCode, login: 'FAIL', rbac: 'FAIL', http: 'FAIL', logout: 'FAIL' };
  }
  console.log(`[PASS] Đăng nhập Supabase Auth thành công. User ID: ${authData.user.id}`);

  // 2. Kiểm tra RPC sc_my_permissions
  const { data: permsRpc, error: permsErr } = await client.rpc('sc_my_permissions');
  if (permsErr) {
    console.error(`[FAIL] Lỗi gọi sc_my_permissions:`, permsErr.message);
    return { role: roleCode, login: 'PASS', rbac: 'FAIL', http: 'FAIL', logout: 'FAIL' };
  }

  const perms = Array.isArray(permsRpc) ? permsRpc.map(p => p.permission_code || p) : [];
  console.log(`[PASS] sc_my_permissions trả về ${perms.length} quyền.`);

  // 3. Kiểm tra các quyền nghiệp vụ trọng yếu theo Role
  const hasPerm = (p) => perms.includes(p);
  let rbacPass = true;

  if (roleCode === 'SEC_STAFF') {
    const checks = [
      { name: 'storage.payment.collect (Thu phí lưu bãi tại cổng)', expected: true, actual: hasPerm('storage.payment.collect') },
      { name: 'exit.actual.confirm (An ninh xác nhận xuất bãi)', expected: true, actual: hasPerm('exit.actual.confirm') },
      { name: 'ticket.payment.collect (Thu tiền vé vào cổng)', expected: true, actual: hasPerm('ticket.payment.collect') },
      { name: 'exit.clearance.issue (CCKB duyệt clearance)', expected: false, actual: hasPerm('exit.clearance.issue') },
      { name: 'exit.clearance.debt_exception (Duyệt nợ AP06)', expected: false, actual: hasPerm('exit.clearance.debt_exception') },
    ];
    for (const c of checks) {
      const ok = c.actual === c.expected;
      if (!ok) rbacPass = false;
      console.log(`  ${ok ? '✓' : '✗'} [SEC_STAFF] ${c.name}: mong đợi=${c.expected}, thực tế=${c.actual}`);
    }
  } else if (roleCode === 'PORT_LEAD') {
    const checks = [
      { name: 'exit.clearance.issue (CCKB duyệt clearance)', expected: true, actual: hasPerm('exit.clearance.issue') },
      { name: 'exit.clearance.debt_exception (Duyệt ngoại lệ nợ AP06)', expected: true, actual: hasPerm('exit.clearance.debt_exception') },
      { name: 'storage.payment.collect (Thu phí lưu bãi tại cổng)', expected: false, actual: hasPerm('storage.payment.collect') },
      { name: 'exit.actual.confirm (An ninh xác nhận xuất bãi)', expected: false, actual: hasPerm('exit.actual.confirm') },
    ];
    for (const c of checks) {
      const ok = c.actual === c.expected;
      if (!ok) rbacPass = false;
      console.log(`  ${ok ? '✓' : '✗'} [PORT_LEAD] ${c.name}: mong đợi=${c.expected}, thực tế=${c.actual}`);
    }
  } else if (roleCode === 'DIS_STAFF') {
    const checks = [
      { name: 'container.cargo.update (Cập nhật loại hàng)', expected: true, actual: hasPerm('container.cargo.update') },
      { name: 'container.visit.read (Đọc thông tin container)', expected: true, actual: hasPerm('container.visit.read') },
      { name: 'storage.payment.collect (Thu phí lưu bãi tại cổng)', expected: false, actual: hasPerm('storage.payment.collect') },
      { name: 'exit.actual.confirm (An ninh xác nhận xuất bãi)', expected: false, actual: hasPerm('exit.actual.confirm') },
      { name: 'exit.clearance.issue (CCKB duyệt clearance)', expected: false, actual: hasPerm('exit.clearance.issue') },
    ];
    for (const c of checks) {
      const ok = c.actual === c.expected;
      if (!ok) rbacPass = false;
      console.log(`  ${ok ? '✓' : '✗'} [DIS_STAFF] ${c.name}: mong đợi=${c.expected}, thực tế=${c.actual}`);
    }
  }

  // 4. Kiểm tra HTTP Client truy cập Next.js Server
  const routesToTest = ['/dashboard', '/entry', '/yard', '/reefer', '/billing', '/exit'];
  let httpPass = true;
  for (const r of routesToTest) {
    try {
      const res = await checkHttpServer(`${APP_URL}${r}`);
      if (res.statusCode !== 200) {
        console.warn(`  [WARN] Route ${r} trả về HTTP ${res.statusCode}`);
        httpPass = false;
      }
    } catch (httpErr) {
      console.error(`  [FAIL] Lỗi gọi route ${r}:`, httpErr.message);
      httpPass = false;
    }
  }
  if (httpPass) {
    console.log(`[PASS] Tất cả 6 routes Next.js phản hồi HTTP 200 OK.`);
  }

  // 5. Đăng xuất sạch sẽ
  const { error: logoutErr } = await client.auth.signOut();
  if (logoutErr) {
    console.error(`[FAIL] Đăng xuất thất bại:`, logoutErr.message);
  } else {
    console.log(`[PASS] Đăng xuất Supabase Auth thành công.`);
  }

  return {
    role: roleCode,
    email: acc.email,
    login: 'PASS',
    totalPerms: perms.length,
    rbac: rbacPass ? 'PASS' : 'FAIL',
    http: httpPass ? 'PASS' : 'FAIL',
    logout: !logoutErr ? 'PASS' : 'FAIL',
  };
}

async function main() {
  console.log('KIỂM TRA TÌNH TRẠNG HTTP SERVER NEXT.JS (http://localhost:3000)...');
  try {
    const srv = await checkHttpServer(APP_URL);
    console.log(`Next.js Server đang hoạt động tốt (HTTP ${srv.statusCode}).\n`);
  } catch (e) {
    console.error('Next.js server chưa chạy hoặc không phản hồi:', e.message);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(CRED_FILE, 'utf-8'));
  const accounts = raw.accounts || [];

  const targetRoles = ['SEC_STAFF', 'PORT_LEAD', 'DIS_STAFF'];
  const targetAccounts = accounts.filter(a => targetRoles.includes(a.role));

  const report = [];

  for (const acc of targetAccounts) {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const result = await testRole(acc, client);
    report.push(result);
  }

  console.log('\n================================================================');
  console.log('BẢNG TỔNG HỢP KIỂM THỬ 3 ROLE ĐẠI DIỆN TRÊN CLIENT THẬT');
  console.log('================================================================');
  console.table(report);

  const allPass = report.every(r => r.login === 'PASS' && r.rbac === 'PASS' && r.http === 'PASS' && r.logout === 'PASS');
  if (allPass) {
    console.log('\n>>> KẾT QUẢ: 100% KIỂM THỬ 3 ROLE ĐẠI DIỆN ĐẠT TIÊU CHUẨN (ALL PASS) <<<');
    process.exit(0);
  } else {
    console.error('\n>>> KẾT QUẢ: CÓ LỖI TRONG QUÁ TRÌNH KIỂM THỬ <<<');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
