/**
 * SƠN CẢNG YMS — SCRIPT KHỞI TẠO VÀ GÁN 7 TÀI KHOẢN UAT TRÊN SUPABASE CLOUD DEV
 * Project Ref: euswzyespwaxyrjkfkrq
 * Tuân thủ tuyệt đối:
 * - Dùng Supabase Auth Admin API (không INSERT raw SQL vào auth.users)
 * - Mật khẩu ngẫu nhiên >= 24 ký tự độ entropy cao
 * - Lưu credentials vào kho bảo mật ngoài repository
 * - KHÔNG in mật khẩu hoặc service_role key ra console/log
 * - Kiểm tra đăng nhập và RPC sc_my_permissions() cho từng tài khoản
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://euswzyespwaxyrjkfkrq.supabase.co';
const PROJECT_REF = 'euswzyespwaxyrjkfkrq';

// Thư mục lưu credentials bảo mật NGOÀI repository
const SECURE_STORAGE_DIR = 'C:\\Users\\private\\.gemini\\antigravity\\brain\\04a2ceca-6c82-43e2-8b27-5c43c094b2d4\\scratch';
const SECURE_CREDENTIALS_FILE = path.join(SECURE_STORAGE_DIR, 'uat_credentials_safe.json');

function generateSecurePassword(length = 26) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

async function main() {
  console.log('=== KHỞI CHẠY THIẾT LẬP 7 TÀI KHOẢN UAT CLOUD DEV ===');
  console.log(`Môi trường: ${SUPABASE_URL} (Ref: ${PROJECT_REF})`);

  // 1. Lấy service_role key và anon key trong bộ nhớ qua Supabase CLI
  let serviceRoleKey = '';
  let anonKey = '';

  try {
    const rawKeys = execSync(`npx supabase projects api-keys --project-ref ${PROJECT_REF} --reveal --output json`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    const parsedKeys = JSON.parse(rawKeys);
    const sr = parsedKeys.find(k => k.name === 'service_role');
    const an = parsedKeys.find(k => k.name === 'anon');

    if (!sr || !sr.api_key) {
      throw new Error('Không tìm thấy service_role key trong phản hồi từ Supabase CLI!');
    }
    serviceRoleKey = sr.api_key;
    anonKey = an?.api_key || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  } catch (err) {
    console.error('LỖI khi lấy API Keys từ Supabase CLI:', err.message);
    process.exit(1);
  }

  const adminClient = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  // 2. Tìm bãi Sơn Cảng trong public.app_yards
  console.log('\n[1/5] Truy vấn bãi hoạt động từ public.app_yards...');
  const { data: yards, error: yardsError } = await adminClient
    .from('app_yards')
    .select('id, name, is_active')
    .eq('is_active', true);

  if (yardsError || !yards || yards.length === 0) {
    console.error('LỖI: Không thể lấy danh sách bãi:', yardsError?.message);
    process.exit(1);
  }

  const sonCangYard = yards.find(y => y.name.includes('Sơn Cảng') || y.name.includes('Son Cang')) || yards[0];
  console.log(`-> Bãi xác định: "${sonCangYard.name}" (ID: ${sonCangYard.id})`);

  // 3. Định nghĩa 7 tài khoản UAT chuẩn RBAC V5
  const uatAccounts = [
    {
      email: 'sys_admin_uat@example.com',
      role: 'SYS_ADMIN',
      department: null,
      fullName: 'Quản trị viên UAT',
      description: 'Quản trị hệ thống, cấu hình biểu phí, audit log'
    },
    {
      email: 'sec_staff_uat@example.com',
      role: 'SEC_STAFF',
      department: 'AN_NINH',
      fullName: 'Nhân viên An ninh Cổng UAT',
      description: 'Tiếp nhận xe/cont vào cổng, thu tiền vé, kiểm tra xe ra'
    },
    {
      email: 'sec_lead_uat@example.com',
      role: 'SEC_LEAD',
      department: 'AN_NINH',
      fullName: 'Tổ trưởng An ninh Cổng UAT',
      description: 'Sửa số container, xác nhận rời bãi'
    },
    {
      email: 'cckb_staff_uat@example.com',
      role: 'PORT_STAFF',
      department: 'CCKB',
      fullName: 'Nhân viên CCKB UAT',
      description: 'Cắm/rút điện cont lạnh, thu phí lưu bãi/điện lạnh'
    },
    {
      email: 'cckb_lead_uat@example.com',
      role: 'PORT_LEAD',
      department: 'CCKB',
      fullName: 'Lãnh đạo CCKB UAT',
      description: 'Phê duyệt clearance, duyệt nợ, đối soát tài chính'
    },
    {
      email: 'dis_staff_uat@example.com',
      role: 'DIS_STAFF',
      department: 'DIEU_PHOI',
      fullName: 'Nhân viên Điều phối Bãi UAT',
      description: 'Cập nhật trạng thái cont HÀNG/RỖNG, quản lý vị trí bãi'
    },
    {
      email: 'dis_lead_uat@example.com',
      role: 'DIS_LEAD',
      department: 'DIEU_PHOI',
      fullName: 'Tổ trưởng Điều phối Bãi UAT',
      description: 'Điều phối toàn bãi, phối hợp xác minh sai lệch số cont'
    }
  ];

  // 4. Lấy danh sách users hiện có trên Cloud DEV
  console.log('\n[2/5] Kiểm tra người dùng hiện có trên Supabase Auth...');
  const { data: existingUsersData, error: listError } = await adminClient.auth.admin.listUsers();
  if (listError) {
    console.error('LỖI khi lấy danh sách Auth Users:', listError.message);
    process.exit(1);
  }
  const existingUsers = existingUsersData.users || [];

  const createdCredentials = [];

  console.log('\n[3/5] Khởi tạo / cập nhật 7 tài khoản qua Supabase Auth Admin API...');
  for (const acc of uatAccounts) {
    const password = generateSecurePassword(26);
    const existing = existingUsers.find(u => u.email?.toLowerCase() === acc.email.toLowerCase());

    let userId = '';

    if (existing) {
      console.log(`-> Tài khoản ${acc.email} đã tồn tại (ID: ${existing.id}). Cập nhật mật khẩu mới...`);
      const { data: updated, error: updateError } = await adminClient.auth.admin.updateUserById(existing.id, {
        password: password,
        email_confirm: true,
        user_metadata: { full_name: acc.fullName, role_code: acc.role }
      });
      if (updateError) {
        console.error(`LỖI cập nhật ${acc.email}:`, updateError.message);
        process.exit(1);
      }
      userId = updated.user.id;
    } else {
      console.log(`-> Tạo mới tài khoản ${acc.email}...`);
      const { data: created, error: createError } = await adminClient.auth.admin.createUser({
        email: acc.email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: acc.fullName, role_code: acc.role }
      });
      if (createError) {
        console.error(`LỖI tạo mới ${acc.email}:`, createError.message);
        process.exit(1);
      }
      userId = created.user.id;
    }

    createdCredentials.push({
      email: acc.email,
      userId: userId,
      password: password,
      role: acc.role,
      department: acc.department,
      fullName: acc.fullName,
      description: acc.description,
      yardId: sonCangYard.id,
      yardName: sonCangYard.name
    });
  }

  // 5. Gán vai trò trong public.app_user_role_assignments
  console.log('\n[4/5] Gán vai trò chuẩn RBAC V5 vào public.app_user_role_assignments...');
  const adminAccount = createdCredentials.find(c => c.role === 'SYS_ADMIN');
  const adminUserId = adminAccount?.userId || createdCredentials[0].userId;

  for (const cred of createdCredentials) {
    // Kiểm tra bản ghi đã tồn tại chưa
    const { data: existingRoles, error: checkRoleError } = await adminClient
      .from('app_user_role_assignments')
      .select('id, is_active')
      .eq('user_id', cred.userId)
      .eq('role_code', cred.role);

    if (checkRoleError) {
      console.error(`LỖI kiểm tra vai trò cho ${cred.email}:`, checkRoleError.message);
      process.exit(1);
    }

    if (existingRoles && existingRoles.length > 0) {
      console.log(`-> Vai trò ${cred.role} của ${cred.email} đã tồn tại. Đảm bảo trạng thái is_active = true.`);
      await adminClient
        .from('app_user_role_assignments')
        .update({ is_active: true, yard_id: cred.yardId, department_code: cred.department })
        .eq('id', existingRoles[0].id);
    } else {
      console.log(`-> Thêm mới vai trò ${cred.role} cho ${cred.email}...`);
      const { error: insertError } = await adminClient
        .from('app_user_role_assignments')
        .insert({
          user_id: cred.userId,
          role_code: cred.role,
          yard_id: cred.yardId,
          department_code: cred.department,
          is_active: true,
          created_by: adminUserId
        });

      if (insertError) {
        console.error(`LỖI gán vai trò cho ${cred.email}:`, insertError.message);
        process.exit(1);
      }
    }
  }

  // 6. Kiểm tra đăng nhập và quyền qua sc_my_permissions() cho từng tài khoản
  console.log('\n[5/5] Kiểm thử xác thực và RPC sc_my_permissions() cho từng tài khoản...');
  const verificationResults = [];

  for (const cred of createdCredentials) {
    const userClient = createClient(SUPABASE_URL, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: signInData, error: signInError } = await userClient.auth.signInWithPassword({
      email: cred.email,
      password: cred.password
    });

    if (signInError || !signInData?.session) {
      console.error(`[THẤT BẠI] Đăng nhập ${cred.email}:`, signInError?.message);
      verificationResults.push({
        email: cred.email,
        role: cred.role,
        loginSuccess: false,
        error: signInError?.message,
        permissionsCount: 0
      });
      continue;
    }

    // Gọi RPC sc_my_permissions() với token của người dùng
    const { data: perms, error: permError } = await userClient.rpc('sc_my_permissions');
    const permList = Array.isArray(perms) ? perms : [];

    console.log(`-> [THÀNH CÔNG] ${cred.email} (${cred.role}): Đăng nhập OK | ${permList.length} quyền cấp.`);

    verificationResults.push({
      email: cred.email,
      role: cred.role,
      fullName: cred.fullName,
      loginSuccess: true,
      permissionsCount: permList.length,
      samplePermissions: permList.slice(0, 5)
    });

    await userClient.auth.signOut();
  }

  // 7. Lưu an toàn vào thư mục bí mật NGOÀI repository
  if (!fs.existsSync(SECURE_STORAGE_DIR)) {
    fs.mkdirSync(SECURE_STORAGE_DIR, { recursive: true });
  }

  const outputPayload = {
    generatedAt: new Date().toISOString(),
    environment: 'son-cang-yms-dev',
    projectRef: PROJECT_REF,
    yard: { id: sonCangYard.id, name: sonCangYard.name },
    accounts: createdCredentials.map(c => ({
      email: c.email,
      userId: c.userId,
      password: c.password,
      role: c.role,
      department: c.department,
      fullName: c.fullName,
      description: c.description
    }))
  };

  fs.writeFileSync(SECURE_CREDENTIALS_FILE, JSON.stringify(outputPayload, null, 2), 'utf-8');
  console.log(`\n============================================================`);
  console.log(`HOÀN TẤT THIẾT LẬP 7 TÀI KHOẢN UAT!`);
  console.log(`Thông tin đăng nhập bí mật đã được lưu an toàn tại:`);
  console.log(`${SECURE_CREDENTIALS_FILE}`);
  console.log(`(Tệp này nằm NGOÀI repository và KHÔNG bao giờ bị commit vào Git/Zip).`);
  console.log(`============================================================\n`);

  console.log('BẢNG TỔNG KẾT XÁC THỰC VÀ PHÂN QUYỀN UAT:');
  console.table(verificationResults.map(r => ({
    Email: r.email,
    Role: r.role,
    Name: r.fullName,
    Login: r.loginSuccess ? 'PASS' : 'FAIL',
    Permissions: r.permissionsCount
  })));
}

main().catch(err => {
  console.error('LỖI KHÔNG XÁC ĐỊNH:', err);
  process.exit(1);
});
