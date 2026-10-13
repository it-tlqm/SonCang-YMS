# BÁO CÁO KIỂM TOÁN VÀ ĐÍNH CHÍNH SAI LỆCH NGUỒN RBAC V5 (BẢN CHUẨN XÁC)
## Dự án: Website + PWA Quản lý bến bãi/cảng cạn Sơn Cảng
### Đơn vị: Công ty Cổ phần Tà Lùng Quang Minh
*Thời gian kiểm toán: 11/10/2026 16:15*  
*Công cụ thực hiện: `scripts/audit_rbac_exact.py` (Script kiểm toán tự động có exit code)*

---

## 1. NGUYÊN NHÂN PHÁT SINH 42 MÃ QUYỀN SAI LỆCH TRONG BÁO CÁO CŨ

Sau khi đối chiếu độc lập theo tài liệu [ProjectContext/06_Kien_truc_va_kiem_thu/RBAC_REPORTED_PERMISSIONS_DIFF_20261011.md](file:///d:/thanhnx/OpenCode/YMS-project/ProjectContext/06_Kien_truc_va_kiem_thu/RBAC_REPORTED_PERMISSIONS_DIFF_20261011.md), nguyên nhân gốc rễ được xác định rõ ràng:

1. **Sai lệch thuần túy nằm ở VĂN BẢN BÁO CÁO do AI tự gõ bằng suy luận:**
   - Trong phiên làm việc trước, khi giải trình mục "B. 67 permission_code thực tế là gì?", mô hình AI đã **không dùng script in dữ liệu thật**, mà tự gõ lại danh sách theo suy đoán/trí nhớ.
   - Do đó, văn bản báo cáo đã liệt kê 42 mã quyền hư cấu (như `audit.export_dept`, `master.customer.manage`, `reefer.service.connect`, `pricing.tariff.view`...) và bỏ sót 42 mã quyền hợp lệ của V5.
2. **Mã nguồn SQL thực tế hoàn toàn KHÔNG BỊ ẢNH HƯỞNG:**
   - File [supabase/migrations/20261011000002_seed_rbac_v5.sql](file:///d:/thanhnx/OpenCode/YMS-project/supabase/migrations/20261011000002_seed_rbac_v5.sql), [scripts/extract_excel_rbac.py](file:///d:/thanhnx/OpenCode/YMS-project/scripts/extract_excel_rbac.py), [scripts/verified_permissions.json](file:///d:/thanhnx/OpenCode/YMS-project/scripts/verified_permissions.json) và [src/types/rbac.types.ts](file:///d:/thanhnx/OpenCode/YMS-project/src/types/rbac.types.ts) đã được trích xuất tự động từ đầu từ Workbook V5 và **chứa 100% đầy đủ 42 mã quyền hợp lệ**, hoàn toàn không chứa bất kỳ mã quyền hư cấu nào.

---

## 2. DANH SÁCH FILE THỰC TẾ ĐÃ KIỂM TRA

Đã rà soát trực tiếp 11 file trên hệ thống:
1. `ProjectContext/02_RBAC_V5/PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx` (Nguồn sự thật tối thượng: SHA-256 `25ecea41d428d08d48d43cdfeaf8413abf77454860e2c817e531434dca5595cd`).
2. [supabase/migrations/20261011000001_foundation_rbac.sql](file:///d:/thanhnx/OpenCode/YMS-project/supabase/migrations/20261011000001_foundation_rbac.sql).
3. [supabase/migrations/20261011000002_seed_rbac_v5.sql](file:///d:/thanhnx/OpenCode/YMS-project/supabase/migrations/20261011000002_seed_rbac_v5.sql).
4. [supabase/migrations/20261011000003_rbac_security_functions_rls.sql](file:///d:/thanhnx/OpenCode/YMS-project/supabase/migrations/20261011000003_rbac_security_functions_rls.sql).
5. [supabase/tests/rbac_verification.sql](file:///d:/thanhnx/OpenCode/YMS-project/supabase/tests/rbac_verification.sql).
6. [scripts/extract_excel_rbac.py](file:///d:/thanhnx/OpenCode/YMS-project/scripts/extract_excel_rbac.py).
7. [scripts/generate_and_verify_seed.py](file:///d:/thanhnx/OpenCode/YMS-project/scripts/generate_and_verify_seed.py).
8. [scripts/verify_rbac_invariants.js](file:///d:/thanhnx/OpenCode/YMS-project/scripts/verify_rbac_invariants.js).
9. [scripts/audit_rbac_exact.py](file:///d:/thanhnx/OpenCode/YMS-project/scripts/audit_rbac_exact.py).
10. [src/types/rbac.types.ts](file:///d:/thanhnx/OpenCode/YMS-project/src/types/rbac.types.ts).
11. [src/types/database.types.ts](file:///d:/thanhnx/OpenCode/YMS-project/src/types/database.types.ts).

---

## 3. DANH SÁCH CHÍNH XÁC 67 PERMISSION_CODE (XUẤT TỰ ĐỘNG TỪ MÃ NGUỒN)

Dưới đây là danh mục chính xác 67 mã quyền được trích xuất từ Workbook V5 và đang có mặt 100% trong file [supabase/migrations/20261011000002_seed_rbac_v5.sql](file:///d:/thanhnx/OpenCode/YMS-project/supabase/migrations/20261011000002_seed_rbac_v5.sql) dòng 43–109:

```text
 1. accounting.invoice.prepare                 [Hóa đơn] (E_INVOICE)
 2. admin.billing_settings.manage              [Quản trị] (CORE)
 3. admin.legacy_correct                       [Quản trị] (CORE)
 4. admin.role_permissions.manage              [Quản trị] (CORE)
 5. admin.roles.manage                         [Quản trị] (CORE)
 6. admin.users.manage                         [Quản trị] (CORE)
 7. audit.export_all                           [Giám sát] (CORE)
 8. audit.read                                 [Giám sát] (CORE)
 9. charge.adjust.approve                      [Thanh toán] (CHARGE_DISCOUNT)
10. charge.adjust.request                      [Thanh toán] (CHARGE_DISCOUNT)
11. container.cargo.post_exit.approve          [Điều phối] (CORE)
12. container.cargo.post_exit.request          [Điều phối] (CORE)
13. container.cargo.read                       [Điều phối] (CORE)
14. container.cargo.update                     [Điều phối] (CORE)
15. container.handling.record                  [Container] (YARD_SLOT_MANAGEMENT)
16. container.number.correct                   [Container] (CORE)
17. container.number.discrepancy.port_reconcile [Container] (CORE)
18. container.number.discrepancy.sec_ack       [Container] (CORE)
19. container.number.discrepancy.view          [Container] (CORE)
20. container.number.evidence.attach           [Chứng từ] (CORE)
21. container.visit.create                     [Container] (CORE)
22. container.visit.link_request               [Container] (CORE)
23. container.visit.read                       [Container] (CORE)
24. exit.actual.confirm                        [Cổng ra] (CORE)
25. exit.clearance.debt_exception              [Cổng ra] (CORE)
26. exit.clearance.issue                       [Cổng ra] (CORE)
27. exit.clearance.read                        [Cổng ra] (CORE)
28. exit.clearance.revoke.approve              [Cổng ra] (CORE)
29. exit.clearance.revoke.request              [Cổng ra] (CORE)
30. exit.reefer_state.exception                [Cổng ra] (CORE)
31. payment.bank.reconcile                     [Thanh toán] (CORE)
32. payment.bank_evidence.attach               [Thanh toán] (CORE)
33. payment.post_correction.approve            [Thanh toán] (CORE)
34. payment.post_correction.request            [Thanh toán] (CORE)
35. payment.refund.approve                     [Thanh toán] (REFUNDS)
36. payment.refund.request                     [Thanh toán] (REFUNDS)
37. reefer.field_work.note                     [Cắm điện] (CORE)
38. reefer.payment.collect                     [Thanh toán] (CORE)
39. reefer.payment.partial_collect             [Thanh toán] (CORE)
40. reefer.request.alert.view                  [Điện dự kiến] (CORE)
41. reefer.request.cancel                      [Điện dự kiến] (CORE)
42. reefer.request.create                      [Điện dự kiến] (CORE)
43. reefer.request.match_confirm               [Điện dự kiến] (CORE)
44. reefer.request.read                        [Điện dự kiến] (CORE)
45. reefer.request.update                      [Điện dự kiến] (CORE)
46. reefer.session.actual_end.record           [Cắm điện] (CORE)
47. reefer.session.actual_start.record         [Cắm điện] (CORE)
48. reefer.session.amendment.approve           [Cắm điện] (CORE)
49. reefer.session.amendment.request           [Cắm điện] (CORE)
50. reefer.session.billable.override_unpaid    [Cắm điện] (CORE)
51. reefer.session.read                        [Cắm điện] (CORE)
52. reefer.session.time.edit_unpaid            [Cắm điện] (CORE)
53. report.revenue.export                      [Báo cáo] (CORE)
54. report.revenue.read                        [Báo cáo] (CORE)
55. storage.payment.collect                    [Thanh toán] (CORE)
56. tariff.change.publish                      [Bảng giá] (CORE)
57. tariff.change.request                      [Bảng giá] (CORE)
58. tariff.read                                [Bảng giá] (CORE)
59. ticket.lost_fee.collect                    [Vé vào] (CORE)
60. ticket.paper_number.adjust                 [Vé vào] (TICKET_AUTOPRINT)
61. ticket.payment.collect                     [Vé vào] (CORE)
62. vehicle.visit.create                       [Cổng xe] (CORE)
63. vehicle.visit.exit_confirm                 [Cổng ra] (CORE)
64. vehicle.visit.read                         [Cổng xe] (CORE)
65. vehicle.visit.time_correction.approve      [Cổng xe] (CORE)
66. vehicle.visit.time_correction.request      [Cổng xe] (CORE)
67. vehicle.visit.update_basic                 [Cổng xe] (CORE)
```

---

## 4. KẾT QUẢ ĐỐI CHIẾU 1-1 CHI TIẾT TỪ SCRIPT KIỂM TOÁN TỰ ĐỘNG

Khi chạy lệnh: `python scripts/audit_rbac_exact.py` (Script trả về exit code 0 nếu pass 100%, exit code 1 nếu có bất kỳ sai lệch nào):

```text
================================================================================
AUDIT KIỂM CHỨNG TẬN GỐC: WORKBOOK RBAC V5 vs MIGRATIONS SQL THỰC TẾ
================================================================================

--- TIÊU CHÍ 1: 8 ROLE CODES & THUỘC TÍNH ---
Excel count: 8 | SQL count: 8
  [OK] Role SEC_STAFF         : active=True | dept=AN_NINH | phase=V1
  [OK] Role SEC_LEAD          : active=True | dept=AN_NINH | phase=V1
  [OK] Role PORT_STAFF        : active=True | dept=CCKB | phase=V1
  [OK] Role PORT_LEAD         : active=True | dept=CCKB | phase=V1
  [OK] Role DIS_STAFF         : active=True | dept=DIEU_PHOI | phase=V1
  [OK] Role DIS_LEAD          : active=True | dept=DIEU_PHOI | phase=V1
  [OK] Role SYS_ADMIN         : active=True | dept=HE_THONG | phase=V1
  [OK] Role ACCOUNTING_FUTURE : active=False | dept=KE_TOAN | phase=GĐ sau

--- TIÊU CHÍ 2: 67 PERMISSION CODES CHÍNH THỨC ---
Excel count: 67 | SQL count: 67
Missing in SQL: 0
Surplus in SQL: 0

--- TIÊU CHÍ 3: 206 PHÂN QUYỀN GRANTS (ROLE, PERMISSION, SCOPE, ACTIVE) ---
Excel count: 206 | SQL count: 206

Phân bổ 206 grants theo từng vai trò:
  * ACCOUNTING_FUTURE : Excel =  0 | SQL =  0 -> [KHỚP]
  * DIS_LEAD          : Excel = 11 | SQL = 11 -> [KHỚP]
  * DIS_STAFF         : Excel =  9 | SQL =  9 -> [KHỚP]
  * PORT_LEAD         : Excel = 38 | SQL = 38 -> [KHỚP]
  * PORT_STAFF        : Excel = 31 | SQL = 31 -> [KHỚP]
  * SEC_LEAD          : Excel = 31 | SQL = 31 -> [KHỚP]
  * SEC_STAFF         : Excel = 26 | SQL = 26 -> [KHỚP]
  * SYS_ADMIN         : Excel = 60 | SQL = 60 -> [KHỚP]

================================================================================
KẾT QUẢ KIỂM TOÁN: HOÀN TOÀN TRÙNG KHỚP 100%!
  - 8/8 Role codes & attributes: KHỚP 100%
  - 67/67 Permission codes & modules: KHỚP 100%
  - 206/206 Grants tuples (role, permission, scope, active): KHỚP 100%
  => KHẲNG ĐỊNH: MÃ NGUỒN SQL THỰC TẾ LÀ CHUẨN XÁC 100% THEO WORKBOOK V5.
  => SAI LỆCH 42 MÃ QUYỀN CHỈ TỒN TẠI TRONG VĂN BẢN BÁO CÁO DO AI SUY ĐOÁN.
================================================================================
Process exited with code 0.
```

---

## 5. THỰC THI BÀN GIAO GÓI KIỂM ĐỊNH ĐỘC LẬP

Đã tạo và cập nhật tệp tin nén tại thư mục gốc của dự án:
- **Tên tệp tin:** `rbac_v5_verification_bundle.zip`
- **Đường dẫn tuyệt đối trên máy host:** `D:\thanhnx\OpenCode\YMS-project\rbac_v5_verification_bundle.zip`
- **Nội dung bên trong bao gồm:**
  1. `supabase/migrations/20261011000001_foundation_rbac.sql` (11 bảng RBAC, Four-Eyes constraint)
  2. `supabase/migrations/20261011000002_seed_rbac_v5.sql` (Seed 8 roles, 67 permissions, 206 grants chuẩn V5)
  3. `supabase/migrations/20261011000003_rbac_security_functions_rls.sql` (Hàm sc_can, trigger immutable, RLS)
  4. `supabase/tests/rbac_verification.sql` (Kịch bản kiểm thử PostgreSQL độc lập)
  5. `scripts/extract_excel_rbac.py` (Script trích xuất Workbook V5)
  6. `scripts/generate_and_verify_seed.py` (Script sinh dữ liệu seed)
  7. `scripts/verify_rbac_invariants.js` (Script kiểm tra 27 bất biến RBAC)
  8. `scripts/audit_rbac_exact.py` (Script đối chiếu 1-1 từng dòng với exit code chặt chẽ)
  9. `src/types/rbac.types.ts` (TypeScript types chuẩn V5)
  10. `src/types/database.types.ts` (Database schema types)

---

## 6. KẾT LUẬN & CAM KẾT

1. **Về Mã nguồn:** Mã nguồn thực tế đã được kiểm chứng chuẩn xác 100% theo Workbook V5 bằng script so sánh tự động có exit code = 0.
2. **Về Trạng thái Database:** Chưa chạy migration trên bất kỳ PostgreSQL engine nào (do máy host chưa cài Docker Desktop). Tuyệt đối không kết nối Remote Database.
3. **Về Tiến độ:** Tạm dừng Phase 1C theo đúng chỉ đạo. Chưa tuyên bố Phase 1B được nghiệm thu khi chưa có kiểm thử PostgreSQL thực tế.
