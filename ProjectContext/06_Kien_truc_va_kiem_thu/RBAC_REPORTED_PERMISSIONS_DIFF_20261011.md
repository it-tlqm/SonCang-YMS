# RBAC V5 — Đối chiếu độc lập danh sách mã quyền trong BÁO CÁO Antigravity

Ngày kiểm tra: 11/10/2026

## Phạm vi và giới hạn

Nguồn sự thật: `ProjectContext/02_RBAC_V5/PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx`, sheet `20_V5_DANH_MUC_QUYEN`, `19_V5_VAI_TRO`, `21_V5_CAP_QUYEN_SEED`.

Đối tượng so sánh: phần **B. 67 permission_code** trong báo cáo Antigravity `Pasted text(20261011-090935).txt` (báo cáo là VĂN BẢN, không phải SQL migration).

**KHÔNG có mã nguồn migration thực tế từ máy Antigravity để kiểm tra ở đây.** Các phát hiện bên dưới chỉ chứng minh báo cáo có sai lệch, không chứng minh code SQL đã bị thay đổi. Không dùng kết quả này để tuyên bố database đã được kiểm thử.

SHA-256 workbook gốc: `25ecea41d428d08d48d43cdfeaf8413abf77454860e2c817e531434dca5595cd`.
SHA-256 báo cáo được đối chiếu: `059b12d8c2dbb725da14be8ea3950c71c00ec87070d30f85620ddc73e7588f8a`.

## Kết quả

| Chỉ tiêu | Workbook V5 | Báo cáo Antigravity | Kết quả |
|---|---:|---:|---|
| Permission codes | 67 | 67 | Khớp tổng số, không khớp nội dung |
| Permission codes trùng chính xác | 67 | 25 | Chỉ 25/67 |
| Quyền hợp lệ bị thiếu trong báo cáo | 0 | 42 | 42 |
| Quyền báo cáo không tồn tại trong workbook | 0 | 42 | 42 |
| Tổng grants V5 | 206 | Báo cáo 206 | Phân bổ báo cáo trùng số lượng theo role; **chưa xác minh tuple trong SQL** |

## Phân bổ grants gốc theo vai trò

| Vai trò | Grants trong Workbook V5 |
|---|---:|
| `SEC_STAFF` | 26 |
| `SEC_LEAD` | 31 |
| `PORT_STAFF` | 31 |
| `PORT_LEAD` | 38 |
| `DIS_STAFF` | 9 |
| `DIS_LEAD` | 11 |
| `SYS_ADMIN` | 60 |
| `ACCOUNTING_FUTURE` | 0 |

## 42 mã quyền hợp lệ nhưng KHÔNG được liệt kê trong báo cáo

- `accounting.invoice.prepare`
- `admin.billing_settings.manage`
- `admin.legacy_correct`
- `admin.role_permissions.manage`
- `admin.roles.manage`
- `admin.users.manage`
- `charge.adjust.approve`
- `charge.adjust.request`
- `container.cargo.post_exit.approve`
- `container.cargo.post_exit.request`
- `container.cargo.update`
- `container.handling.record`
- `exit.clearance.debt_exception`
- `exit.clearance.issue`
- `exit.clearance.read`
- `exit.clearance.revoke.approve`
- `exit.clearance.revoke.request`
- `exit.reefer_state.exception`
- `payment.bank.reconcile`
- `payment.bank_evidence.attach`
- `payment.post_correction.approve`
- `payment.post_correction.request`
- `payment.refund.approve`
- `payment.refund.request`
- `reefer.field_work.note`
- `reefer.payment.partial_collect`
- `reefer.request.alert.view`
- `reefer.request.match_confirm`
- `reefer.request.update`
- `reefer.session.actual_end.record`
- `reefer.session.actual_start.record`
- `reefer.session.amendment.approve`
- `reefer.session.amendment.request`
- `reefer.session.billable.override_unpaid`
- `reefer.session.read`
- `reefer.session.time.edit_unpaid`
- `report.revenue.export`
- `report.revenue.read`
- `storage.payment.collect`
- `tariff.change.publish`
- `tariff.change.request`
- `tariff.read`

## 42 mã quyền được báo cáo liệt kê nhưng KHÔNG có trong workbook V5

- `audit.export_dept`
- `container.cargo.change.post_exit`
- `container.cargo.change.yard`
- `container.dwell.fee.calculate`
- `container.dwell.fee.collect`
- `container.dwell.read`
- `exit.actual.cancel`
- `exit.ticket.verify`
- `integration.external.config`
- `master.customer.manage`
- `master.vehicle_type.manage`
- `master.vendor.manage`
- `notification.alert.receive`
- `notification.broadcast.send`
- `offline.cache.read`
- `offline.sync.execute`
- `payment.adjustment.approve`
- `payment.adjustment.request`
- `payment.receipt.print`
- `pricing.special_rate.apply`
- `pricing.tariff.update`
- `pricing.tariff.view`
- `reefer.fee.calculate`
- `reefer.invoice_info.update`
- `reefer.monitoring.record`
- `reefer.request.update_before_connect`
- `reefer.service.connect`
- `reefer.service.disconnect`
- `reefer.service.time.adjust_after_paid`
- `reefer.service.time.adjust_pending`
- `report.export`
- `report.financial.view`
- `report.operational.view`
- `security.incident.report`
- `security.incident.resolve`
- `shift.cash.view`
- `shift.handover.create`
- `shift.handover.receive`
- `system.backup.run`
- `system.role.assign`
- `system.setting.update`
- `system.user.manage`

## Hành động bắt buộc trước nghiệm thu

1. Không tiếp tục Phase 1C, không chỉnh workbook V5.
2. Kiểm tra file `supabase/migrations/20261011000002_seed_rbac_v5.sql` **thực tế**, cùng `scripts/extract_excel_rbac.py`, `generate_and_verify_seed.py`, `audit_rbac_exact.py`, `verify_rbac_invariants.js`.
3. Chạy script đối chiếu 1-1 các tuple `(role_code, permission_code, scope, active)` trên workbook và SQL; đối chiếu toàn bộ 67 codes chứ không chỉ đếm.
4. In kết quả tự động được tạo từ script thành một report; người viết báo cáo không được gõ lại tên quyền bằng suy đoán.
5. Nếu SQL đúng, sửa lại báo cáo; nếu SQL sai, sao lưu rồi tái sinh từ workbook V5, kiểm tra lại tĩnh, và chờ kiểm thử PostgreSQL.
6. Đề nghị người dùng tải từ máy Antigravity và đính kèm **`rbac_v5_verification_bundle.zip` thực tế** để kiểm toán độc lập. Không suy ra rằng đường dẫn `D:\...` được đính kèm chỉ vì có trong báo cáo.

Ghi chú: Tất cả các kết luận về RLS/Auth động, SECURITY DEFINER, và quá trình migration đều **chưa kiểm chứng** nếu chưa chạy thử trên PostgreSQL thực tế.
