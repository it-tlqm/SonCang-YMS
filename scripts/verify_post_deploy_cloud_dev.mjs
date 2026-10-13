/**
 * SƠN CẢNG YMS — KIỂM TRA TOÀN DIỆN HẬU TRIỂN KHAI CLOUD DEV (GATE 1 POST-DEPLOY CHECK)
 * Kiểm tra các bảng mới 005-008, RLS, RPC nghiệp vụ và 7 tài khoản UAT trên Cloud DEV.
 */

import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const CRED_FILE = 'C:\\Users\\private\\.soncang\\uat_credentials.json';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://euswzyespwaxyrjkfkrq.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HjmQVCIeCxpMIPCCWHBT5w_E01JstPr';

async function main() {
  console.log('================================================================');
  console.log('BẮT ĐẦU KIỂM TRA HẬU TRIỂN KHAI CLOUD DEV (son-cang-yms-dev)');
  console.log('================================================================\n');

  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. KIỂM TRA RLS & TRUY CẬP CÁC BẢNG MỚI BẰNG ANON CLIENT
  console.log('[Mục 1] Kiểm tra 5 bảng mới 005–008 và chính sách bảo vệ RLS (Anon Client)...');
  const tablesToCheck = [
    'app_yard_billing_settings',
    'app_reefer_power_sessions',
    'app_tariffs',
    'app_charges',
    'app_payments',
  ];

  const tableResults = [];
  for (const tbl of tablesToCheck) {
    const { data, error, status } = await anonClient.from(tbl).select('*').limit(1);
    // Anon client KHÔNG được phép đọc dữ liệu nhạy cảm hoặc ghi dữ liệu
    // Nếu có RLS: error 42501 (permission denied) hoặc data rỗng (0 rows)
    const isProtected = status === 401 || status === 403 || error?.code === '42501' || (data && data.length === 0);
    tableResults.push({
      table: tbl,
      httpStatus: status,
      errorCode: error?.code || 'NONE',
      protected: isProtected ? 'PASS (BẢO VỆ RLS)' : 'WARN',
    });
  }
  console.table(tableResults);

  // 2. KIỂM TRA RPC NGHIỆP VỤ MỚI (READ-ONLY CALCULATION RPC)
  console.log('\n[Mục 2] Kiểm tra hàm RPC nghiệp vụ sc_calculate_storage_fee (Read-only)...');
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 3600 * 1000);
  const { data: storageCalc, error: storageCalcErr } = await anonClient.rpc('sc_calculate_storage_fee', {
    p_inbound_at: threeDaysAgo.toISOString(),
    p_outbound_at: now.toISOString(),
  });

  if (storageCalcErr) {
    console.error('[-] Lỗi gọi sc_calculate_storage_fee:', storageCalcErr.message);
  } else {
    console.log('[+] sc_calculate_storage_fee phản hồi thành công:', storageCalc);
  }

  // 3. KIỂM TRA 7 TÀI KHOẢN UAT & PHÂN QUYỀN RBAC TRÊN CLOUD DEV
  console.log('\n[Mục 3] Kiểm tra đăng nhập và phân quyền 7 tài khoản UAT qua Supabase Auth...');
  const rawCreds = JSON.parse(fs.readFileSync(CRED_FILE, 'utf-8'));
  const accounts = rawCreds.accounts || [];

  const uatResults = [];
  for (const acc of accounts) {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authErr } = await userClient.auth.signInWithPassword({
      email: acc.email,
      password: acc.password,
    });

    if (authErr || !authData.session) {
      uatResults.push({
        email: acc.email,
        role: acc.role,
        name: acc.fullName,
        login: 'FAIL',
        permsCount: 0,
        status: 'FAIL',
      });
      continue;
    }

    const { data: permsRpc, error: permsErr } = await userClient.rpc('sc_my_permissions');
    const perms = Array.isArray(permsRpc) ? permsRpc.map(p => p.permission_code || p) : [];

    // Kiểm tra đọc app_tariffs bằng tài khoản đã đăng nhập (authenticated)
    const { data: tariffsData, error: tariffsErr } = await userClient
      .from('app_tariffs')
      .select('code, name, amount')
      .limit(3);

    uatResults.push({
      email: acc.email,
      role: acc.role,
      name: acc.fullName,
      login: 'PASS',
      permsCount: perms.length,
      tariffsRead: tariffsErr ? `ERR: ${tariffsErr.message}` : `OK (${tariffsData?.length || 0} rows)`,
      status: perms.length > 0 ? 'PASS' : 'WARN',
    });

    await userClient.auth.signOut();
  }
  console.table(uatResults);

  // 4. KIỂM TRA AN TOÀN FEATURE FLAG
  console.log('\n[Mục 4] Xác nhận an toàn: Feature Flag Real Write vẫn tắt...');
  const isRealWriteEnv = process.env.NEXT_PUBLIC_ENABLE_REAL_WRITE;
  console.log(`-> NEXT_PUBLIC_ENABLE_REAL_WRITE hiện tại: "${isRealWriteEnv || 'undefined'}"`);
  const isSafe = isRealWriteEnv !== 'true';
  console.log(`-> Trạng thái an toàn: ${isSafe ? 'PASS (REAL WRITE ĐANG TẮT)' : 'FAIL (REAL WRITE ĐANG BẬT)'}`);

  const allUatPass = uatResults.every(r => r.login === 'PASS' && r.status === 'PASS');
  const allTablesProtected = tableResults.every(r => r.protected.startsWith('PASS'));

  if (allUatPass && allTablesProtected && !storageCalcErr && isSafe) {
    console.log('\n>>> KẾT LUẬN: TOÀN BỘ KIỂM TRA HẬU TRIỂN KHAI CLOUD DEV GATE 1 ĐẠT 100% (ALL PASS) <<<');
    process.exit(0);
  } else {
    console.error('\n>>> KẾT LUẬN: CÓ MỤC KIỂM TRA CHƯA ĐẠT <<<');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
