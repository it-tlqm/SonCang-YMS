const fs = require('fs');
const content = fs.readFileSync('supabase/tests/domain_vehicles_containers_004.sql', 'utf8');

const planMatch = content.match(/SELECT\s+plan\((\d+)\);/);
const planCount = planMatch ? parseInt(planMatch[1]) : 0;
console.log('Khai báo Plan:', planCount);

// Kiểm tra PERFORM ok / is
const performMatches = content.match(/PERFORM\s+(ok|is|throws_ok)\s*\(/g) || [];
console.log('Số lời gọi PERFORM ok/is trong file (yêu cầu 0):', performMatches.length);

// Đếm các top-level SELECT assertions
const lines = content.split('\n');
let selectAssertions = 0;
let inDoBlock = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('DO $$')) inDoBlock = true;
  if (inDoBlock) {
    if (line.includes('END $$;')) inDoBlock = false;
    continue;
  }
  // Check top-level SELECT calling pgTAP functions
  if (/^SELECT\s+(has_table|hasnt_table_privilege|hasnt_function_privilege|is|ok|throws_ok)\s*\(/.test(line)) {
    selectAssertions++;
    console.log(`Assertion #${selectAssertions} (dòng ${i+1}): ${line.substring(0, 70)}...`);
  }
}

console.log('Tổng số assertions cấp cao nhất tìm thấy:', selectAssertions);
let hasError = false;

if (selectAssertions === planCount && performMatches.length === 0) {
  console.log('=> KHỚP CHÍNH XÁC 100%! Bộ kiểm thử đạt tiêu chuẩn TAP cho pg_prove.');
} else {
  console.error(`=> LỖI: Không khớp! Plan=${planCount}, Thấy=${selectAssertions}, PERFORM=${performMatches.length}`);
  hasError = true;
}

// Kiểm tra không có wildcard %...% trong throws_ok
const wildcardThrows = content.match(/throws_ok\([^)]*'%[^']*%'[^)]*\)/g) || [];
console.log('Số lời gọi throws_ok dùng wildcard %...% (yêu cầu 0):', wildcardThrows.length);
if (wildcardThrows.length > 0) {
  console.error('=> LỖI: Phát hiện wildcard %...% trong throws_ok!');
  hasError = true;
}

// Kiểm tra không có nhánh "pass mặc định" trong code (bỏ qua comments)
const codeLines = lines.filter(l => !l.trim().startsWith('--'));
const passMacDinh = codeLines.filter(l => /pass mặc định/i.test(l));
console.log('Số nhánh pass mặc định trong SQL code (yêu cầu 0):', passMacDinh.length);
if (passMacDinh.length > 0) {
  console.error('=> LỖI: Phát hiện nhánh pass mặc định trong code!');
  hasError = true;
}

if (hasError) {
  process.exit(1);
} else {
  console.log('=> TOÀN BỘ KIỂM TOÁN TĨNH TEST 004 ĐẠT (PASS)!');
  process.exit(0);
}
