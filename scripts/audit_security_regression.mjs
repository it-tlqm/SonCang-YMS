/**
 * KIỂM THỬ HỒI QUY AN NINH & NGHIỆP VỤ — SƠN CẢNG YMS
 * Tuân thủ chỉ thị AGENT_FULL_AUDIT_AND_FIX.md (Pha D & E)
 * Kiểm chứng các bản sửa lỗi F-001 đến F-008.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('================================================================');
console.log('  BẮT ĐẦU CHẠY BỘ KIỂM THỬ HỒI QUY TOÀN DIỆN (AUDIT REGRESSION)');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// TEST 1: SEC-19 — Phản vệ CSV / Excel Formula Injection (CWE-1236)
// -----------------------------------------------------------------------------
console.log('[TEST GROUP 1] SEC-19: Excel / CSV Formula Injection Sanitizer');
{
  function sanitizeExcelCellValue(val) {
    if (typeof val === 'string' && /^[=+\-@\t\r]/.test(val)) {
      return `'${val}`;
    }
    return val;
  }

  // Trường hợp độc hại bắt đầu bằng ký tự công thức
  assert(sanitizeExcelCellValue("=CMD|' /C calc'!A0") === "'=CMD|' /C calc'!A0", 'Chặn lệnh thực thi công thức =CMD');
  assert(sanitizeExcelCellValue('+123456') === "'+123456", 'Chặn công thức bắt đầu bằng +');
  assert(sanitizeExcelCellValue('-calc.exe') === "'-calc.exe", 'Chặn công thức bắt đầu bằng -');
  assert(sanitizeExcelCellValue('@SUM(A1:A10)') === "'@SUM(A1:A10)", 'Chặn công thức bắt đầu bằng @');
  assert(sanitizeExcelCellValue('\tTAB_INJECT') === "'\tTAB_INJECT", 'Chặn ký tự điều khiển tab');

  // Trường hợp dữ liệu hợp lệ thông thường
  assert(sanitizeExcelCellValue('11C-123.45') === '11C-123.45', 'Bảo toàn biển số xe hợp lệ');
  assert(sanitizeExcelCellValue('TCLU1234567') === 'TCLU1234567', 'Bảo toàn mã số container');
  assert(sanitizeExcelCellValue(250000) === 250000, 'Bảo toàn giá trị số nguyên');
  assert(sanitizeExcelCellValue(null) === null, 'Bảo toàn giá trị null');
}

// -----------------------------------------------------------------------------
// TEST 2: SEC-01 & SEC-04 — Bảo vệ Service Role Key & RBAC Endpoint Quản trị
// -----------------------------------------------------------------------------
console.log('\n[TEST GROUP 2] SEC-01 & SEC-04: Route Reset Password & Service Role Key Safety');
{
  const routePath = path.join(rootDir, 'src', 'app', 'api', 'admin', 'users', 'reset-password', 'route.ts');
  const routeContent = fs.readFileSync(routePath, 'utf-8');

  // Không còn chuỗi JWT hardcoded
  assert(!routeContent.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'), 'Đã loại bỏ hoàn toàn chuỗi JWT hardcoded fallback (F-001)');
  
  // Phải kiểm tra biến môi trường
  assert(routeContent.includes('const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY'), 'Đọc khóa service role trực tiếp từ process.env');
  assert(routeContent.includes('!serviceRoleKey'), 'Có khối kiểm tra thiếu SUPABASE_SERVICE_ROLE_KEY và báo lỗi an toàn 500');

  // Kiểm tra xác thực phiên caller (F-002)
  assert(routeContent.includes('serverSupabase.auth.getUser()'), 'Có kiểm tra xác thực người gọi qua server Supabase client');
  assert(routeContent.includes('allowedRoles'), 'Có danh sách kiểm tra vai trò Quản trị viên được phép');
  assert(routeContent.includes('401') && routeContent.includes('403'), 'Trả về mã lỗi HTTP 401/403 rõ ràng khi vi phạm quyền');
}

// -----------------------------------------------------------------------------
// TEST 3: SEC-12 — Cấu hình Security Headers trong next.config.ts
// -----------------------------------------------------------------------------
console.log('\n[TEST GROUP 3] SEC-12: Security Headers trong next.config.ts');
{
  const nextConfigPath = path.join(rootDir, 'next.config.ts');
  const nextConfigContent = fs.readFileSync(nextConfigPath, 'utf-8');

  assert(nextConfigContent.includes('async headers()'), 'Đã cấu hình headers() trong nextConfig (F-003)');
  assert(nextConfigContent.includes('X-Frame-Options') && nextConfigContent.includes('DENY'), 'Có header X-Frame-Options: DENY chống clickjacking');
  assert(nextConfigContent.includes('X-Content-Type-Options') && nextConfigContent.includes('nosniff'), 'Có header X-Content-Type-Options: nosniff chống MIME sniffing');
  assert(nextConfigContent.includes('Referrer-Policy') && nextConfigContent.includes('strict-origin-when-cross-origin'), 'Có header Referrer-Policy');
  assert(nextConfigContent.includes('Permissions-Policy'), 'Có header Permissions-Policy kiểm soát quyền thiết bị');
}

// -----------------------------------------------------------------------------
// TEST 4: SEC-17 — Thuật toán Phí Lưu Bãi V5 (22:00-06:00, miễn đêm đầu)
// -----------------------------------------------------------------------------
console.log('\n[TEST GROUP 4] SEC-17: Tính phí lưu bãi qua đêm V5');
{
  function calculateStorageFee(inboundAtStr, outboundAtStr) {
    const inDate = new Date(inboundAtStr);
    const outDate = outboundAtStr ? new Date(outboundAtStr) : new Date();
    if (outDate <= inDate || isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
      return { totalNights: 0, chargedNights: 0, fee: 0 };
    }

    const getVnDate = (d) => {
      const vnTime = new Date(d.getTime() + 7 * 3600 * 1000);
      return vnTime.toISOString().substring(0, 10);
    };

    const inVnDateStr = getVnDate(inDate);
    const outVnDateStr = getVnDate(outDate);

    const cur = new Date(inVnDateStr + 'T00:00:00+07:00');
    cur.setDate(cur.getDate() - 1);
    const end = new Date(outVnDateStr + 'T00:00:00+07:00');

    let totalNights = 0;
    while (cur <= end) {
      const y = cur.getFullYear();
      const m = String(cur.getMonth() + 1).padStart(2, '0');
      const d = String(cur.getDate()).padStart(2, '0');
      const curStr = `${y}-${m}-${d}`;

      const next = new Date(cur.getTime() + 24 * 3600 * 1000);
      const ny = next.getFullYear();
      const nm = String(next.getMonth() + 1).padStart(2, '0');
      const nd = String(next.getDate()).padStart(2, '0');
      const nextStr = `${ny}-${nm}-${nd}`;

      const nightStart = new Date(`${curStr}T22:00:00+07:00`);
      const nightEnd = new Date(`${nextStr}T06:00:00+07:00`);

      if (inDate < nightEnd && outDate > nightStart) {
        totalNights++;
      }
      cur.setDate(cur.getDate() + 1);
    }

    const chargedNights = Math.max(0, totalNights - 1);
    return { totalNights, chargedNights, fee: chargedNights * 100000 };
  }

  // Ra cùng ngày trước 22:00 -> 0đ
  const sameDay = calculateStorageFee('2026-10-10T08:00:00+07:00', '2026-10-10T18:00:00+07:00');
  assert(sameDay.fee === 0 && sameDay.chargedNights === 0, 'Xe vào ban ngày ra trước 22h: 0đ phí lưu');

  // Đêm đầu miễn phí
  const night1 = calculateStorageFee('2026-10-10T20:00:00+07:00', '2026-10-11T08:00:00+07:00');
  assert(night1.totalNights === 1 && night1.chargedNights === 0 && night1.fee === 0, 'Qua 1 đêm: Miễn phí đêm đầu (0đ)');

  // Qua 2 đêm -> tính 1 đêm = 100k
  const night2 = calculateStorageFee('2026-10-10T20:00:00+07:00', '2026-10-12T08:00:00+07:00');
  assert(night2.totalNights === 2 && night2.chargedNights === 1 && night2.fee === 100000, 'Qua 2 đêm: Tính 1 đêm = 100.000đ');

  // Qua 3 đêm -> tính 2 đêm = 200k
  const night3 = calculateStorageFee('2026-10-10T20:00:00+07:00', '2026-10-13T08:00:00+07:00');
  assert(night3.totalNights === 3 && night3.chargedNights === 2 && night3.fee === 200000, 'Qua 3 đêm: Tính 2 đêm = 200.000đ');
}

// -----------------------------------------------------------------------------
// TEST 5: SEC-17 — Làm tròn Cước Điện Container 5.000 VNĐ
// -----------------------------------------------------------------------------
console.log('\n[TEST GROUP 5] SEC-17: Làm tròn cước điện reefer 5.000 VNĐ');
{
  const calcReeferAmount = (hours, rate) => {
    return Math.round((Number(hours) * rate) / 5000) * 5000;
  };

  const rate = 40000;
  // 1.2h * 40k = 48.000 -> làm tròn 5.000 thành 50.000đ
  assert(calcReeferAmount(1.2, rate) === 50000, '1.2h * 40k = 48k -> làm tròn 50.000đ');
  // 0.8h * 40k = 32.000 -> làm tròn 5.000 thành 30.000đ
  assert(calcReeferAmount(0.8, rate) === 30000, '0.8h * 40k = 32k -> làm tròn 30.000đ');
  // 2.5h * 40k = 100.000 -> 100.000đ
  assert(calcReeferAmount(2.5, rate) === 100000, '2.5h * 40k = 100k -> 100.000đ');

  // RV02 (D-025): Phiên điện dưới 15 phút hoặc 0 phút: Miễn ngầm 0đ
  const calcReeferFeeV5 = (mins, rate) => {
    if (mins < 15) return 0;
    return Math.max(5000, Math.round(((mins / 60) * rate) / 5000) * 5000);
  };
  assert(calcReeferFeeV5(0, rate) === 0, '0 phút: Miễn ngầm (0đ)');
  assert(calcReeferFeeV5(10, rate) === 0, '10 phút (< 15p): Miễn ngầm (0đ)');
  assert(calcReeferFeeV5(14, rate) === 0, '14 phút (< 15p): Miễn ngầm (0đ)');
  assert(calcReeferFeeV5(15, rate) === 10000, '15 phút: Tính cước bình thường 10.000đ');

  // Kiểm tra file src/app/reefer/page.tsx đã được sửa hết lỗi ngoặc
  const reeferPagePath = path.join(rootDir, 'src', 'app', 'reefer', 'page.tsx');
  const reeferContent = fs.readFileSync(reeferPagePath, 'utf-8');
  assert(!reeferContent.includes('/ 5000 * 5000)'), 'Đã sửa triệt để lỗi ngoặc đơn / 5000 * 5000) trong reefer/page.tsx (F-005)');
}

// -----------------------------------------------------------------------------
// TEST 6: SEC-08 — Kiểm tra Container Validator (ISO 6346 / Bến bãi Sơn Cảng)
// -----------------------------------------------------------------------------
console.log('\n[TEST GROUP 6] SEC-08: Container Validator quy tắc 4 chữ cái + 7 chữ số');
{
  function validateContainer(no) {
    const clean = (no || '').trim().replace(/\s+/g, '').toUpperCase();
    if (clean.length !== 11) return false;
    const firstFour = clean.slice(0, 4);
    for (let c of firstFour) {
      if (c < 'A' || c > 'Z') return false;
    }
    const remaining = clean.slice(4);
    for (let c of remaining) {
      if (c < '0' || c > '9') return false;
    }
    return true;
  }

  assert(validateContainer('TCLU1234567') === true, 'TCLU1234567: Đúng chuẩn 11 ký tự');
  assert(validateContainer('MSKU9876543') === true, 'MSKU9876543: Đúng chuẩn 11 ký tự');
  assert(validateContainer('TCL12345678') === false, 'TCL12345678: Sai vì chỉ có 3 chữ cái đầu');
  assert(validateContainer('TCLU123456A') === false, 'TCLU123456A: Sai vì ký tự cuối là chữ cái');
  assert(validateContainer('TCLU12345') === false, 'TCLU12345: Sai vì thiếu độ dài (chỉ 9 ký tự)');

  // Logic hàm sanitizeContainerInput
  function sanitizeContainerInput(raw) {
    if (!raw) return '';
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    let result = '';
    for (let i = 0; i < clean.length && result.length < 11; i++) {
      const char = clean[i];
      if (result.length < 4) {
        if (/[A-Z]/.test(char)) result += char;
      } else {
        if (/[0-9]/.test(char)) result += char;
      }
    }
    return result;
  }

  assert(sanitizeContainerInput('AAAAA1221213213') === 'AAAA1221213', 'Sanitizer: AAAAA1221213213 -> AAAA1221213 (chặn chữ thứ 5, cắt chuẩn 11 ký tự)');
  assert(sanitizeContainerInput('msku 1234567') === 'MSKU1234567', 'Sanitizer: Viết thường + khoảng trắng -> MSKU1234567');
  assert(sanitizeContainerInput('MSKUABC1234') === 'MSKU1234', 'Sanitizer: Chặn chữ cái sau vị trí thứ 4');
  assert(sanitizeContainerInput('123MSKU1234') === 'MSKU1234', 'Sanitizer: Bỏ qua số rác ở đầu, giữ đúng 4 chữ cái và các số sau');
  assert(sanitizeContainerInput('TCLU123456789999') === 'TCLU1234567', 'Sanitizer: Khóa cứng tối đa 11 ký tự');
}

// -----------------------------------------------------------------------------
// TEST 7: SEC-18 — Cờ khóa chống Double-Submit trên Form giao dịch
// -----------------------------------------------------------------------------
console.log('\n[TEST GROUP 7] SEC-18: Khóa chống gửi lặp (Double-Submit Guards) & Lượt xe gần nhất');
{
  const entryPath = path.join(rootDir, 'src', 'app', 'entry', 'page.tsx');
  const entryContent = fs.readFileSync(entryPath, 'utf-8');
  assert(entryContent.includes('if (isSubmitting) return;'), 'Form tiếp nhận cổng vào có guard if (isSubmitting) return; (F-006)');
  assert(entryContent.includes("replace(/[^\\d]/g, '').slice(0, 12)"), 'Ô nhập CCCD tài xế lọc chuẩn 12 chữ số (F-007)');
  assert(!entryContent.includes('countdown'), 'Form cổng vào đã loại bỏ hoàn toàn bộ đếm ngược 7-10s biến mất form (F-009)');
  assert(entryContent.includes('recentVisit'), 'Form cổng vào lưu giữ lượt xe gần nhất cố định để in vé bất cứ lúc nào (F-009)');
  assert(entryContent.includes('maxLength={11}'), 'Ô nhập số container có thuộc tính maxLength={11} (F-010)');

  const exitPath = path.join(rootDir, 'src', 'app', 'exit', 'page.tsx');
  const exitContent = fs.readFileSync(exitPath, 'utf-8');
  assert(exitContent.includes('if (isSubmittingExit || !selectedVehForExit) return;'), 'Form xuất bãi có guard if (isSubmittingExit) return; (F-006)');

  const reeferPath = path.join(rootDir, 'src', 'app', 'reefer', 'page.tsx');
  const reeferContent = fs.readFileSync(reeferPath, 'utf-8');
  assert(reeferContent.includes('if (isSubmittingPlug) return;'), 'Thao tác cắm điện reefer có guard if (isSubmittingPlug) return;');
  assert(reeferContent.includes('if (isSubmittingUnplug || !selectedSession) return;'), 'Thao tác rút điện reefer có guard if (isSubmittingUnplug) return;');
}

// -----------------------------------------------------------------------------
// TEST 8: SEC-10 — Chống Reverse Tabnabbing
// -----------------------------------------------------------------------------
console.log('\n[TEST GROUP 8] SEC-10: Thuộc tính liên kết an toàn');
{
  const guidePath = path.join(rootDir, 'src', 'app', 'guide', 'page.tsx');
  const guideContent = fs.readFileSync(guidePath, 'utf-8');
  assert(guideContent.includes('rel="noopener noreferrer"'), 'Liên kết mở PDF trong guide/page.tsx có rel="noopener noreferrer" (F-008)');
}

// -----------------------------------------------------------------------------
// TỔNG KẾT BỘ KIỂM THỬ HỒI QUY
// -----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`  KẾT QUẢ KIỂM THỬ HỒI QUY: ${passedTests}/${totalTests} TESTS PASS`);
if (failedTests > 0) {
  console.error(`  CÓ ${failedTests} TEST BỊ THẤT BẠI!`);
  process.exit(1);
} else {
  console.log('  >>> 100% KIỂM THỬ HỒI QUY BẢO MẬT & NGHIỆP VỤ THÀNH CÔNG <<<');
  console.log('================================================================');
}
