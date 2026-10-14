import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://euswzyespwaxyrjkfkrq.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_HjmQVCIeCxpMIPCCWHBT5w_E01JstPr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runTest() {
  console.log('Testing Migration 28 on Supabase Cloud...');

  // 1. Kiểm tra tài khoản kế toán vừa seed
  const { data: staff, error: staffErr } = await supabase
    .from('app_staff_users')
    .select('*')
    .eq('email', 'acc_01@soncang.vn')
    .single();

  if (staffErr || !staff) {
    console.error('Failed to find accountant staff user:', staffErr);
    process.exit(1);
  }
  console.log('✓ Found accountant user:', staff.full_name, staff.role_code, staff.department_code);

  // 2. Kiểm tra bảng app_cash_settlements
  const { data: settlements, error: setErr } = await supabase
    .from('app_cash_settlements')
    .select('*')
    .limit(1);

  if (setErr) {
    console.error('Failed to query app_cash_settlements:', setErr);
    process.exit(1);
  }
  console.log('✓ app_cash_settlements accessible, count:', settlements.length);

  // 3. Kiểm tra bảng app_invoices
  const { data: invoices, error: invErr } = await supabase
    .from('app_invoices')
    .select('*')
    .limit(1);

  if (invErr) {
    console.error('Failed to query app_invoices:', invErr);
    process.exit(1);
  }
  console.log('✓ app_invoices accessible, count:', invoices.length);

  // 4. Kiểm tra RPC sc_confirm_cash_settlement
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('sc_confirm_cash_settlement', {
    p_handover_dept: 'AN_NINH',
    p_period_from: new Date(Date.now() - 3600000).toISOString(),
    p_period_to: new Date().toISOString(),
    p_total_cash_counted: 0,
    p_handover_person_name: 'Trần Quốc Bảo (An ninh bốt)',
    p_difference_reason: null,
    p_notes: 'Test settlement via node script',
    p_payment_ids: []
  });

  if (rpcErr) {
    console.error('Failed to call sc_confirm_cash_settlement:', rpcErr);
    process.exit(1);
  }
  console.log('✓ sc_confirm_cash_settlement RPC success:', rpcRes);

  console.log('ALL MIGRATION 28 TESTS PASSED 100%!');
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
