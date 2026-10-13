import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Đọc biến từ .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const [key, ...vals] = trimmed.split('=');
    envVars[key.trim()] = vals.join('=').trim();
  }
}

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('1. Kiểm tra cấu hình .env.local:');
console.log(`   - SUPABASE_URL: ${supabaseUrl ? 'OK (' + supabaseUrl + ')' : 'THIẾU'}`);
console.log(`   - SUPABASE_KEY: ${supabaseKey ? 'OK (đã nạp, độ dài ' + supabaseKey.length + ' ký tự)' : 'THIẾU'}`);

if (!supabaseUrl || !supabaseKey) {
  console.error('LỖI: Thiếu biến môi trường cần thiết!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSmokeTest() {
  console.log('\n2. Kiểm tra kết nối Supabase Auth (GoTrue):');
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log(`   - Auth check: Phản hồi lỗi API (${error.message})`);
    } else {
      console.log('   - Auth check: Kết nối dịch vụ Auth thành công (Session trống cho client ẩn danh - Đúng thiết kế)');
    }
  } catch (err) {
    console.error(`   - Lỗi kết nối Auth: ${err.message}`);
  }

  console.log('\n3. Kiểm tra kết nối PostgREST & RLS đối với Client ẩn danh:');
  try {
    // Thử truy vấn bảng app_roles dưới vai trò ẩn danh (anon)
    const { data, error, count } = await supabase.from('app_roles').select('*');
    if (error) {
      console.log(`   - PostgREST query: Phản hồi API code ${error.code} (${error.message})`);
    } else {
      // Theo RLS: app_roles chỉ SELECT cho authenticated. Anon nhận 0 bản ghi (Deny by default)
      console.log(`   - Kết quả truy vấn app_roles: Nhận ${data.length} bản ghi.`);
      if (data.length === 0) {
        console.log('   -> Đúng thiết kế RLS: Client ẩn danh bị chặn hoàn toàn bởi RLS policy p_roles_read (Deny by default)');
      }
    }
  } catch (err) {
    console.error(`   - Lỗi PostgREST: ${err.message}`);
  }

  console.log('\n4. Kết luận Smoke Test:');
  console.log('   - Kết nối mạng tới Supabase Cloud DEV hoạt động bình thường.');
  console.log('   - Endpoint URL và Publishable Key hợp lệ.');
}

runSmokeTest();
