/**
 * SƠN CẢNG YMS — THIẾT LẬP TÀI KHOẢN THỰC TẾ & SUPABASE AUTH
 * Tạo 2 tài khoản chính thức:
 * 1. it@talunglogistics.com (Super Admin - SYS_ADMIN)
 * 2. anninh.talunglogistics@gmail.com (An ninh Cổng - SEC_STAFF)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://euswzyespwaxyrjkfkrq.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3d6eWVzcHdheHlyamtma3JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTcxMjI0NSwiZXhwIjoyMTA3Mjg4MjQ1fQ.XGJfrft4TDzNSklhXDreXNCFoNXQ-TlOHEyjS_t2hrk';

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const ACCOUNTS = [
  {
    email: 'it@talunglogistics.com',
    password: 'SonCang@2026!IT',
    fullName: 'Ban Quản trị Hệ thống (IT Admin)',
    roleCode: 'SYS_ADMIN',
    departmentCode: 'HE_THONG',
    notes: 'Tài khoản Quản trị cấp cao nhất (Super Admin) thuộc Tà Lùng Logistics'
  },
  {
    email: 'anninh.talunglogistics@gmail.com',
    password: 'AnNinh@2026!SC',
    fullName: 'An Ninh Sơn Cảng',
    roleCode: 'SEC_STAFF',
    departmentCode: 'AN_NINH',
    notes: 'Tài khoản Trực ca bốt cổng An ninh Sơn Cảng'
  }
];

async function main() {
  console.log('=== BẮT ĐẦU THIẾT LẬP TÀI KHOẢN SUPABASE AUTH THỰC TẾ ===');

  // 1. Lấy Yard ID thực tế
  const { data: yards } = await admin.from('app_yards').select('id, name').limit(1);
  const yardId = yards?.[0]?.id || 'fe83bb2b-833e-412c-aed4-b9a781a6decd';
  console.log('Bãi thực tế:', yards?.[0]?.name, '(', yardId, ')');

  // 2. Lấy danh sách users hiện có trong auth.users
  const { data: userListData } = await admin.auth.admin.listUsers();
  const existingUsers = userListData?.users || [];

  for (const acc of ACCOUNTS) {
    let authUser = existingUsers.find(u => u.email?.toLowerCase() === acc.email.toLowerCase());

    if (authUser) {
      console.log(`\n[Auth] Cập nhật mật khẩu cho user đã tồn tại: ${acc.email} (ID: ${authUser.id})`);
      const { data: updated, error: updateErr } = await admin.auth.admin.updateUserById(authUser.id, {
        password: acc.password,
        user_metadata: {
          full_name: acc.fullName,
          role_code: acc.roleCode,
          department_code: acc.departmentCode
        }
      });
      if (updateErr) throw updateErr;
      authUser = updated.user;
    } else {
      console.log(`\n[Auth] Tạo mới user trong auth.users: ${acc.email}`);
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true,
        user_metadata: {
          full_name: acc.fullName,
          role_code: acc.roleCode,
          department_code: acc.departmentCode
        }
      });
      if (createErr) throw createErr;
      authUser = created.user;
    }

    console.log(`-> Auth User ID: ${authUser.id}`);

    // 3. Cập nhật / Thêm vào public.app_staff_users
    const { data: existingStaff } = await admin
      .from('app_staff_users')
      .select('id')
      .eq('email', acc.email)
      .maybeSingle();

    if (existingStaff) {
      console.log(`[Staff] Cập nhật app_staff_users cho ${acc.email}...`);
      await admin.from('app_staff_users').update({
        auth_user_id: authUser.id,
        full_name: acc.fullName,
        role_code: acc.roleCode,
        department_code: acc.departmentCode,
        yard_id: acc.roleCode === 'SYS_ADMIN' ? null : yardId,
        is_active: true,
        notes: acc.notes,
        updated_at: new Date().toISOString()
      }).eq('id', existingStaff.id);
    } else {
      console.log(`[Staff] Thêm mới vào app_staff_users cho ${acc.email}...`);
      await admin.from('app_staff_users').insert({
        auth_user_id: authUser.id,
        email: acc.email,
        full_name: acc.fullName,
        role_code: acc.roleCode,
        department_code: acc.departmentCode,
        yard_id: acc.roleCode === 'SYS_ADMIN' ? null : yardId,
        is_active: true,
        notes: acc.notes
      });
    }

    // 4. Cập nhật / Thêm vào public.app_user_role_assignments
    const { data: existingAssign } = await admin
      .from('app_user_role_assignments')
      .select('id')
      .eq('user_id', authUser.id)
      .maybeSingle();

    if (existingAssign) {
      console.log(`[RoleAssign] Cập nhật phân quyền cho ${acc.email}...`);
      await admin.from('app_user_role_assignments').update({
        role_code: acc.roleCode,
        department_code: acc.departmentCode,
        yard_id: acc.roleCode === 'SYS_ADMIN' ? null : yardId,
        is_active: true
      }).eq('id', existingAssign.id);
    } else {
      console.log(`[RoleAssign] Thêm mới phân quyền cho ${acc.email}...`);
      await admin.from('app_user_role_assignments').insert({
        user_id: authUser.id,
        role_code: acc.roleCode,
        department_code: acc.departmentCode,
        yard_id: acc.roleCode === 'SYS_ADMIN' ? null : yardId,
        is_active: true,
        created_by: authUser.id
      });
    }

    // 5. Kiểm thử ĐĂNG NHẬP THỰC TẾ với Client API
    console.log(`[Test Login] Kiểm tra đăng nhập với email & password...`);
    const anonClient = createClient(SUPABASE_URL, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3d6eWVzcHdheHlyamtma3JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MTIyNDUsImV4cCI6MjEwNzI4ODI0NX0.FrCSV3i7b4wGIhbJaNmmCnm5Hp84SZrg_9KdId45BnQ');
    const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
      email: acc.email,
      password: acc.password
    });

    if (signInErr) {
      console.error(`❌ ĐĂNG NHẬP THẤT BẠI cho ${acc.email}:`, signInErr.message);
    } else {
      console.log(`✅ ĐĂNG NHẬP THÀNH CÔNG cho ${acc.email}! AccessToken sinh thành công.`);
    }
  }

  // 6. Xóa tài khoản thử nghiệm cũ sys_admin_uat@example.com (nếu còn)
  console.log('\n[Cleanup] Dọn dẹp tài khoản cũ sys_admin_uat@example.com...');
  const oldUatUser = existingUsers.find(u => u.email === 'sys_admin_uat@example.com');
  if (oldUatUser) {
    await admin.from('app_user_role_assignments').delete().eq('user_id', oldUatUser.id);
    await admin.from('app_staff_users').delete().eq('email', 'sys_admin_uat@example.com');
    await admin.auth.admin.deleteUser(oldUatUser.id);
    console.log('-> Đã xóa tài khoản tạm sys_admin_uat@example.com khỏi hệ thống.');
  }

  console.log('\n=== HOÀN TẤT THIẾT LẬP TÀI KHOẢN THẬT ===');
}

main().catch(err => {
  console.error('LỖI KHỞI TẠO:', err);
  process.exit(1);
});
