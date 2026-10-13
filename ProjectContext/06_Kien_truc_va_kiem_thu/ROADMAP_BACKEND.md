# ROADMAP ANTIGRAVITY — XÂY HỆ THỐNG THẬT SONG SONG STITCH

Tài liệu là **kế hoạch triển khai đề xuất**, không phải tuyên bố đã code xong. Mốc thời gian cụ thể do chủ dự án xác nhận sau khi Antigravity audit repo.

## Phase 0 — Audit / đọc nguồn / hợp đồng dữ liệu

- Kiểm tra repo hiện có; không tạo project mới nếu đã có. Xác nhận thư mục App Router, TypeScript strict, package manager, Supabase config, CI và `.gitignore`.
- Đọc V5/RBAC/117 answers; lập **traceability** nghiệp vụ ↔ bảng ↔ permission ↔ API ↔ test.
- Lập ERD sơ bộ, migration plan, action registry, auth/session plan, khả năng backup, staging, migration rollback.
- Liệt kê câu hỏi UAT mở và rủi ro cần chủ dự án quyết định. Không gọi Phase 0 hoàn tất khi chưa có báo cáo file thực tế.

## Phase 1 — Auth, DB nền, RBAC động, cấu hình giá

- Dựng Supabase local/staging an toàn, migration versioned, Auth, departments/yards, app_roles, app_permissions, role_permissions, user_role_assignments, approval policies, feature flags, audit_events.
- **Seed workbook V5 chuẩn: 67 quyền, 206 grants, 7 role hoạt động + ACCOUNTING_FUTURE tắt.** Không hardcode role; kiểm tra scope SELF/DEPARTMENT/YARD/ALL.
- RLS và guard RPC phía DB/API; negative tests cho quyền không được cấp và quyền đã thu hồi.
- Bảng tariff version + billing rules có ngày hiệu lực. Tạo bảng lõi `vehicle_visits`, `container_visits`, `reefer_requests`, `reefer_sessions` và FK bắt buộc.
- Chưa chạm production; ghi test đã chạy/chưa chạy.

## Phase 2 — Cổng vào / Điện dự kiến / phiên điện

- API/RPC An ninh tạo lượt xe và lượt cont độc lập; phiếu điện dự kiến của CCKB trước cont vào; ghép xác nhận thủ công; điều phối HÀNG/RỖNG riêng.
- CCKB nhập giờ điện thực tế, nhiều phiên không chồng lấn; tính thời gian & số tiền từng phiên (15 phút), lưu actor/time thực/time nhập; audit khi sửa.
- Test ISO 6346 **thuật toán thật**, tìm 7 số cuối/trùng/sai lệch, không auto sửa hoặc auto merge; thay cont giữ UUID.

## Phase 3 — Sổ thu, duyệt tài chính và xuất bãi nguyên tử

- `charges`, `payments`, `payment_allocations`, `financial_adjustments`, `approval_requests`, `exit_clearances`, `exit_events`.
- Thanh toán một phần, công nợ, điều chỉnh sau thu, mã giá snapshot, phân quyền thu điện vs vé/lưu.
- Tính phí lưu theo giờ cont ra thực tế/khung đêm; chốt trong server transaction, double-click/retry idempotency, kiểm tra lại nợ sau duyệt.
- Chỉ sau khi test đầy đủ RV quan trọng mới mở giao dịch nhạy cảm trên staging.

## Phase 4 — Frontend Next.js / responsive / PWA

- Shared App Shell, routing/permission guards, danh sách, form, trạng thái loading/error/server-confirmed.
- Dùng Stitch làm mẫu thị giác; **không sao chép JS, giá sai, mock ISO**.
- Phone 390, tablet 820/1024, desktop 1440; offline chỉ nháp; audit hành động tài chính.
- Ưu tiên cổng vào ↔ điện dự kiến ↔ phiên điện ↔ thu & duyệt ↔ cổng ra; quản trị/báo cáo theo thứ tự rủi ro.

## Phase 5 — UAT / legacy migration / pilot

- UAT quy trình, 44 tình huống từ V4 và V5, RV01–RV12, phân quyền, audit, đối soát tiền, đồng thời hai người và mạng offline.
- Import AppSheet có `legacy_id`, khu `legacy_unverified`; không chuyển ghi chú không khớp thành công nợ V1.
- Pilot song song giấy/AppSheet, theo dõi lỗi, sao lưu và phê duyệt trước vận hành thật.

**Điều kiện chuyển pha:** Có migration/test/log/acceptance evidence; không dựa trên một bản báo cáo AI tự nhận đạt 100%.
