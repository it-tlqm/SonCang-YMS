import fs from 'fs';
import path from 'path';

const htmlDir = path.resolve('SONCANG_UI_UX_REVIEW_PACKAGE/01_STITCH_DESIGNS/HTML_EXPORTED_FROM_STITCH');

const files = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));

const replacements = [
  // 01_dashboard
  { from: /Phân định nghiệp vụ V5:/g, to: 'Phân định nghiệp vụ vận hành:' },
  { from: /Quy tắc chuẩn hóa CCKB V5:/g, to: 'Quy tắc vận hành CCKB:' },
  { from: />Duyệt Clearance</g, to: '>Duyệt xuất bãi<' },
  { from: /Duyệt Clearance \(/g, to: 'Duyệt xuất bãi (' },

  // 02_gate_in
  { from: /Tác nghiệp An ninh Xe vào V5/g, to: 'Tác nghiệp An ninh Cổng vào' },
  { from: /Quy chuẩn V5:/g, to: 'Quy chuẩn vận hành:' },
  { from: /LOẠI PHƯƠNG TIỆN &amp; ĐƠN GIÁ NIÊM YẾT \(BẢN V5\)/g, to: 'LOẠI PHƯƠNG TIỆN &amp; ĐƠN GIÁ NIÊM YẾT' },
  { from: /Biểu phí: 2026-V5/g, to: 'Biểu phí: Ban hành 2026' },
  { from: /Độc lập V5/g, to: 'Quy trình độc lập' },
  { from: /Nguyên tắc V5/g, to: 'Nguyên tắc vận hành' },

  // 03_gate_out
  { from: /Quy chuẩn V5 \/ DS-01/g, to: 'Quy chuẩn Bến bãi Sơn Cảng' },
  { from: /RBAC V5 Enforced/g, to: 'Đã phân quyền ca trực' },
  { from: /Phạm vi quyền hạn \(RBAC V5 Scopes\)/g, to: 'Phạm vi nhiệm vụ ca trực' },
  { from: />exit\.clearance\.issue</g, to: '>Duyệt điều kiện xuất bãi<' },
  { from: />exit\.clearance\.debt_exception</g, to: '>Duyệt bảo lãnh công nợ<' },
  { from: /AUDIT: BILLING-V5-OK/g, to: 'Kiểm soát tài chính hợp lệ' },
  { from: /Xác nhận ghi nhận thu tiền \(Xem trước - Chờ Backend\)/g, to: 'Xác nhận ghi nhận thu tiền' },
  { from: /Scope: exit\.clearance\.issue/g, to: 'Thẩm quyền: Duyệt xuất bãi' },
  { from: /exit\.clearance\.debt_exception/g, to: 'Duyệt bảo lãnh nợ' },
  { from: /Thẩm quyền phê duyệt \(Theo ma trận RBAC V5\)/g, to: 'Thẩm quyền phê duyệt (Theo quy định)' },
  { from: /Giao diện mẫu tham khảo cho Antigravity triển khai Next\.js \+ Supabase\. Không chứa logic giao dịch giả hoặc alert hoàn thành\./g, to: 'Giao diện mẫu tham khảo quy trình vận hành bến bãi Sơn Cảng.' },
  { from: /Clearance xuất bãi/g, to: 'Duyệt xuất bãi' },
  { from: /Clearance công nợ/g, to: 'Bảo lãnh công nợ' },
  { from: /Clearance/g, to: 'Duyệt xuất bãi' },

  // 04_design_system
  { from: /Chuẩn V5 Thực Tế/g, to: 'Chuẩn vận hành Sơn Cảng' },
  { from: /Phân quyền RBAC Động/g, to: 'Phân quyền vai trò' },
  { from: /Tải Tài liệu Quy chuẩn V5/g, to: 'Tải Tài liệu Quy chuẩn' },
  { from: /Đặc tả Nghiệp vụ V5/g, to: 'Đặc tả Nghiệp vụ' },
  { from: /02\. Kiểu chữ, Cấp độ Hierarchy &amp; Phân quyền RBAC Động/g, to: '02. Kiểu chữ, Cấp độ Hierarchy &amp; Phân quyền Vai trò' },
  { from: /Quy chuẩn RBAC Động \(Role-Based Access Control\)/g, to: 'Quy chuẩn Phân quyền theo Vai trò Công tác' },
  { from: /04\. Thư viện Nút Bấm &amp; Nút Hành Động \(Render theo Phân quyền RBAC\)/g, to: '04. Thư viện Nút Bấm &amp; Nút Hành Động (Theo Vai trò)' },
  { from: /RBAC/g, to: 'Phân quyền vai trò' },
];

for (const file of files) {
  const filePath = path.join(htmlDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;

  for (const { from, to } of replacements) {
    if (from.test(content)) {
      content = content.replace(from, to);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Cleaned jargon in: ${file}`);
  }
}
console.log('Finished cleaning Stitch HTML files.');
