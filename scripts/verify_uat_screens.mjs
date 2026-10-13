/**
 * SƠN CẢNG YMS — XÁC MINH PHÂN QUYỀN MÀN HÌNH CHUẨN XÁC THEO APP-SHELL
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const CRED_FILE = 'C:\\Users\\private\\.soncang\\uat_credentials.json';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://euswzyespwaxyrjkfkrq.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HjmQVCIeCxpMIPCCWHBT5w_E01JstPr';

const navItems = [
  { name: 'Tổng quan Vận hành', href: '/dashboard', permissionsAny: ['vehicle.visit.read', 'container.visit.read'] },
  { name: 'Tiếp nhận vào cổng', href: '/entry', permissionsAny: ['vehicle.visit.create', 'ticket.payment.collect'] },
  { name: 'Đang trong bãi', href: '/yard', permissionsAny: ['container.visit.read', 'vehicle.visit.read'] },
  { name: 'Điện Container', href: '/reefer', permissionsAny: ['reefer.session.read', 'reefer.request.read'] },
  { name: 'Thu phí & Sổ cái', href: '/billing', permissionsAny: ['storage.payment.collect', 'ticket.payment.collect', 'reefer.payment.collect', 'report.revenue.read', 'admin.billing_settings.manage'] },
  { name: 'Xuất bãi & Cổng ra', href: '/exit', permissionsAny: ['exit.clearance.read', 'exit.clearance.issue', 'exit.actual.confirm'] },
  { name: 'Danh mục loại xe', href: '/admin/vehicle-types', permissionsAny: ['admin.billing_settings.manage', 'admin.roles.manage'] },
];

async function main() {
  const rawData = JSON.parse(fs.readFileSync(CRED_FILE, 'utf-8'));
  const accounts = rawData.accounts || [];

  const results = [];

  for (const acc of accounts) {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: authData, error: authErr } = await client.auth.signInWithPassword({
      email: acc.email,
      password: acc.password
    });

    if (authErr || !authData.session) {
      results.push({ email: acc.email, role: acc.role, name: acc.fullName, login: 'FAIL', totalPerms: 0, visibleScreens: 'N/A' });
      continue;
    }

    const { data: perms } = await client.rpc('sc_my_permissions');
    const permList = Array.isArray(perms) ? perms.map(p => p.permission_code || p) : [];

    const can = (p) => permList.includes(p) || acc.role === 'SYS_ADMIN';

    const visibleItems = navItems.filter(item => 
      acc.role === 'SYS_ADMIN' || item.permissionsAny.some(p => can(p))
    );

    results.push({
      email: acc.email,
      role: acc.role,
      name: acc.fullName,
      login: 'PASS',
      totalPerms: permList.length,
      visibleScreens: visibleItems.map(i => i.href).join(', ')
    });

    await client.auth.signOut();
  }

  console.log('=== KẾT QUẢ ĐỐI SOÁT ĐĂNG NHẬP & PHÂN QUYỀN MÀN HÌNH PWA THẬT (CLOUD DEV) ===\n');
  console.table(results.map(r => ({
    Email: r.email,
    Role: r.role,
    Name: r.name,
    Login: r.login,
    Perms: r.totalPerms,
    VisibleScreens: r.visibleScreens
  })));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
