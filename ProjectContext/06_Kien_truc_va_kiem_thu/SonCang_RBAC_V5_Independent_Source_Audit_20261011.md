# KẾT QUẢ KIỂM TOÁN ĐỘC LẬP RBAC V5 — SƠN CẢNG

**Ngày kiểm tra:** 11/10/2026  
**Đầu vào đã kiểm tra trực tiếp:** `rbac_v5_verification_bundle.zip` (11 tệp); workbook gốc `PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx`  
**Phạm vi:** kiểm tra tĩnh SQL/TypeScript/scripts, đối chiếu dữ liệu seed Excel–SQL. **Chưa chạy migration trên PostgreSQL/Supabase**.

## A. Kết quả đã xác minh bằng phép đối chiếu độc lập

| Tiêu chí | Kết quả |
|---|---|
| ZIP | Đọc và kiểm tra CRC thành công; 11 tệp |
| Danh mục mã vai trò | 8/8 khớp Excel |
| Danh mục mã quyền | 67/67 khớp Excel |
| Grant `(role_code, permission_code, scope, is_enabled)` | 206/206 khớp Excel, 206 tuple duy nhất |
| Bộ phận và trạng thái kích hoạt của 8 vai trò | Khớp Excel |
| Giai đoạn và cờ tính năng của 67 quyền | Khớp Excel |
| Quyền `V1 / CORE` trong workbook | 60 quyền |
| Giá trị `is_active` trong SQL seed của 67 quyền | **67 FALSE / 0 TRUE** |
| Trạng thái chạy PostgreSQL/Auth/RLS thật | **CHƯA THỰC THI / CHƯA NGHIỆM THU** |

**Kết luận dữ liệu:** SQL đã sao chép đúng danh mục mã và tuples cấp quyền. Không có dấu hiệu lấy nhầm một ma trận RBAC khác. Tuy nhiên việc khớp này **không** chứng minh các quyền hoạt động hay RLS an toàn.

## B. Phát hiện bắt buộc xử lý

### RBAC-01 — BLOCKER: Toàn bộ 67 permission bị vô hiệu hóa

- `supabase/migrations/20261011000002_seed_rbac_v5.sql`, dòng **43–109**: tất cả 67 INSERT vào `public.app_permissions` đều có `is_active = FALSE`; bao gồm 60 quyền `V1/CORE`.
- `scripts/generate_and_verify_seed.py`, dòng **49–50**: đọc `I{row}` làm cột kích hoạt quyền, mặc dù tab `20_V5_DANH_MUC_QUYEN` của workbook chỉ có thông tin nghiệp vụ đến **cột H**. Trống được suy ra là `FALSE`.
- `scripts/audit_rbac_exact.py`, dòng **100–102**: cũng đọc cột I không tồn tại, suy luận giống hệt. Phần đối chiếu permission ở dòng **212–219** chỉ so sánh `module` và `feature_key`, không xác thực việc V1/CORE phải có hiệu lực.
- `supabase/migrations/20261011000003_rbac_security_functions_rls.sql`, dòng **41–43** (và **92–94**): `sc_can()` và `sc_my_permissions()` bắt buộc `p.is_active = true`.

**Hậu quả trên database mới nếu áp dụng nguyên trạng:** `sc_can()` trả `false` cho mọi permission; `sc_my_permissions()` không trả ra quyền nào, kể cả `SYS_ADMIN`. Điều này có thể xác định từ điều kiện SQL và giá trị seed, nhưng vẫn cần kiểm thử DB để xác nhận vận hành tổng thể.

**Đề xuất:** Xác định rõ quy tắc kích hoạt quyền từ V5 thay vì đọc cột I không tồn tại; tối thiểu các quyền `release_phase='V1' AND feature_key='CORE'` phải được xem xét kích hoạt (60 quyền). Các quyền giai đoạn sau phải tiếp tục chịu feature flags/phase; không tự bật ngoài V1. Sinh lại seed, sửa script so sánh, thêm test bắt buộc fail nếu 60 quyền V1/CORE không hoạt động. Do `ON CONFLICT DO NOTHING`, sửa seed không tự cập nhật các bản ghi đã tồn tại; nếu đã migrate local, dùng reset local đã xác nhận an toàn hoặc migration hiệu chỉnh được quản lý. Không reset remote.

### RBAC-02 — HIGH: Có thể chèn yêu cầu mang trạng thái APPROVED mà không qua phê duyệt

- Migration 001 dòng **110–117**: CHECK duy nhất yêu cầu `approved_by <> requested_by` **khi** `approved_by` khác NULL; không ràng buộc quan hệ status/approved_by/decision_at.
- Migration 003 dòng **187–193**: `p_approval_insert` chỉ xét `requested_by = auth.uid()` và `approved_by IS NULL`, không xét `status = 'PENDING'`, `decision_at IS NULL`, `policy_code`, quyền tạo yêu cầu và `reason` không rỗng.

**Rủi ro nếu role authenticated có quyền INSERT bảng:** Người dùng có thể chèn một dòng có `status='APPROVED'`, `approved_by=NULL`, `decision_at` tùy ý; trạng thái duyệt có thể bị giả nếu phần mềm tin cột status. Chưa kiểm chứng đặc quyền GRANT thực tế trên PostgreSQL.

**Đề xuất:** Không cho client ghi trực tiếp trạng thái phê duyệt. Tạo RPC/server transaction kiểm tra permission, policy còn hiệu lực, target, người đề nghị và nguyên tắc 4 mắt; ràng buộc DB cho chuyển trạng thái PENDING→APPROVED/REJECTED, người duyệt và thời gian. Bổ sung test INSERT giả mạo.

### RBAC-03 — HIGH: Audit log cho phép dữ liệu nhật ký từ client không được xác minh

- Migration 003 dòng **195–199** cho phép INSERT khi `actor_user_id = auth.uid()`; không xác minh `action_code`, `before_data`, `after_data`, `event_at` hay đích tác nghiệp.
- Migration 001 dòng **124–136** cho phép truyền `event_at`, `action_code`, dữ liệu thay đổi trực tiếp. Trigger migration 003 dòng **10–20** chỉ chặn UPDATE/DELETE.

**Rủi ro nếu client có quyền INSERT:** Tạo sự kiện audit giả mang actor là bản thân, giả thời điểm/nội dung/hành động; lịch sử không thể sửa/xóa nhưng chưa chắc đáng tin.

**Đề xuất:** Chỉ backend/DB transaction được ghi sự kiện audit, actor và giờ server tự xác định, snapshot lấy từ dữ liệu DB, chặn client INSERT trực tiếp. Test INSERT giả trực tiếp phải bị từ chối; test transaction hợp lệ vẫn tạo audit.

### RBAC-04 — HIGH: Scope DEPARTMENT cho lịch sử audit không hoạt động

- Migration 002 dòng **298–300**: `SEC_LEAD`, `PORT_LEAD`, `DIS_LEAD` đều có `audit.read` với `DEPARTMENT`.
- Migration 003 dòng **60–64**: `sc_can` đòi hỏi `p_row_department_code IS NOT NULL` để quyết định `DEPARTMENT`.
- Migration 003 dòng **201–207**: `p_audit_select` chỉ gọi `public.sc_can('audit.read', yard_id)`, không truyền department. Bảng audit migration 001 dòng 124–136 cũng không chứa department đáng tin cậy.
- `p_approval_read` migration 003 dòng **177–185** dùng `sc_can('audit.read')` không cung cấp context tương tự.

**Hậu quả:** Trưởng bộ phận không xem được nhật ký theo quyền DEPARTMENT (trừ khi họ đồng thời được cấp quyền ALL khác). SYS_ADMIN ALL vẫn có thể xem sau khi khắc phục RBAC-01.

**Đề xuất:** Lưu thông tin bộ phận/bãi tin cậy tại thời điểm phát sinh nhật ký, hoặc xây truy vấn an toàn từ quan hệ nghiệp vụ, rồi chuyển đầy đủ context cho RLS. Không tin department do client tự khai. Test xem đúng bộ phận, chặn khác bộ phận/bãi.

### RBAC-05 — HIGH/MEDIUM: Thay đổi gán quyền trực tiếp chưa có cơ chế audit giao dịch

- Migration 003 dòng **159–175** cho phép user có `admin.role_permissions.manage` hoặc `admin.users.manage` trực tiếp UPDATE/INSERT/DELETE grants/role assignments.
- Không có trigger audit cho hai bảng này trong ba migration.

**Đề xuất:** Quản lý qua transaction/RPC có kiểm tra quyền, scope, audit trước/sau và ngăn tự cấp quyền không kiểm soát. Giữ phạm vi phù hợp V5; không tự áp dụng cơ chế bốn mắt cho thay đổi mà V5 chưa quy định nếu không có quyết định bổ sung.

### RBAC-06 — MEDIUM: Không sử dụng tham số context do client tự gửi để quyết định quyền trên bản ghi

- Migration 003 dòng **26–31, 56–70, 75–76**: `sc_can(permission, yard_id, department, owner)` nhận context qua tham số và cho role `authenticated` EXECUTE.

**Nhận định:** Không phải bằng chứng vượt RLS hiện tại vì các RLS hiện tại gọi `sc_can` bằng một số trường dữ liệu trong policy. Nhưng nếu API tương lai truyền trực tiếp `yard_id`, `department` hoặc `owner_id` từ client rồi tin vào giá trị `true`, người dùng có thể tự đưa context phù hợp để vượt lớp kiểm tra quyền của API đó.

**Đề xuất:** API/RPC tài chính chỉ nhận ID bản ghi, tự tải row và context từ DB. Không dùng kết quả `sc_can` gọi bằng context client làm chứng cứ cuối cùng để cho phép thao tác.

### RBAC-07 — TEST GAP: 27 PASS không chứng minh RLS/Auth hoạt động

- `scripts/verify_rbac_invariants.js` dòng **44–73** chủ yếu tìm đoạn text trong migration, không thực thi chức năng/role trong PostgreSQL.
- `supabase/tests/rbac_verification.sql` dòng **8–120** có 5 nhóm kiểm tra cơ bản, chưa có test đăng nhập các vai trò hoặc rò rỉ dữ liệu theo scope.
- ZIP không có `scripts/verified_roles.json`, `verified_permissions.json`, `verified_grants.json`; chạy trực tiếp JS checker từ ZIP dẫn đến `ENOENT` (đã tái hiện). Cần chạy lại các bước trích xuất/generate với workbook gốc hoặc kèm những đầu vào đã sinh ra trong bundle.

**Đề xuất:** Sửa bộ kiểm thử để kiểm tra trạng thái kích hoạt V1, quyền effective, 4 scope, quyền phê duyệt, INSERT audit, thực hiện thay đổi role có audit; thêm DB integration tests dưới danh tính `authenticated`/`anon` thực tế và cross-yard/cross-department. Chỉ nghiệm thu khi migration và test đều chạy trên Supabase Local/Staging an toàn.

## C. Ưu tiên sửa và nghiệm thu lại

1. **Sửa RBAC-01 trước tiên**, cập nhật script sinh seed và script audit; kết quả tiêu chí 67/206 phải giữ nguyên và bổ sung tiêu chí *effective permissions*.
2. **Khóa luồng chèn approval và audit (RBAC-02, 03)**; audit mọi thay đổi grants/assignments (RBAC-05).
3. **Sửa lọc theo DEPARTMENT (RBAC-04)** và rà soát an toàn khi gọi `sc_can` (RBAC-06).
4. Chạy kiểm thử trên **Supabase Local thực tế**; xác minh tối thiểu role An ninh/CCKB/Điều phối/SYS_ADMIN, 4 scope, khác bộ phận, khác bãi, no self-approval, no forgery, audit bất biến, quyền hết hạn. Không kết nối Production.
5. Giữ nguyên workbook V5. Cập nhật `ProjectContext/06_Kien_truc_va_kiem_thu/`, `CURRENT_STATUS.md` và `WORK_LOG.md` sau khi sửa và kiểm thử.

## D. Giới hạn đánh giá

Đã xác nhận độc lập các tập hợp 8 mã role, 67 mã permission, 206 tuple grant và một số metadata cốt lõi bằng `openpyxl` đối chiếu với SQL 002. **Chưa chứng minh tính hợp lệ cú pháp/tính khả thi runtime của tất cả SQL trên PostgreSQL**, cũng chưa kiểm tra đầy đủ các file ứng dụng Next.js vì không có trong ZIP.

**Kết luận nghiệm thu:** Chấp nhận danh mục mã RBAC và grants là **đúng về nội dung nguồn V5**; **không nghiệm thu Phase 1B về hoạt động và bảo mật**. Cần sửa các phát hiện nêu trên và chạy kiểm thử DB thật trước Phase 1C.
