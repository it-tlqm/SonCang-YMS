# KIỂM TOÁN ĐỘC LẬP RBAC V5 — VÒNG 2 (SAU KHẮC PHỤC)

**Dự án:** Website + PWA Quản lý bến bãi Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Ngày:** 11/10/2026  
**Mã nguồn được kiểm tra:** ZIP người dùng cung cấp `rbac_v5_verification_bundle(1).zip` (15 file, giải nén hợp lệ)  
**Nguồn đối chiếu:** Workbook V5 đã bàn giao `PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx`.  
**Phương pháp:** Đọc độc lập SQL/Python/JS/TypeScript; đọc workbook bằng openpyxl; chạy lại `audit_rbac_exact.py`, `verify_rbac_invariants.js`; thử nghiệm biến đổi trên bản sao tạm thời. **Chưa có kiểm thử PostgreSQL/RLS động trong môi trường Supabase Local.**

## Kết luận

- **Đạt ở mức đối chiếu dữ liệu nguồn:** Đúng 8 roles, 67 permission codes, 206 grants; 60 quyền V1/CORE hoạt động theo seed, 7 quyền sau V1 tắt. Đối chiếu từng grant bao gồm `(role_code, permission_code, scope, is_enabled)` với workbook trên file SQL 002: **0 thiếu / 0 thừa / 0 khác**.
- **Không đạt điều kiện nghiệm thu Phase 1B:** Migration 003 tồn tại điểm yếu nghiêm trọng tại API ghi nhật ký và RPC duyệt; RLS tạo yêu cầu có lỗi liên kết điều kiện; SQL test có fixture thiếu và test false-positive; script audit không phát hiện được sai `is_enabled`.
- **Trạng thái:** Giữ nguyên migrations 001–003 chưa nghiệm thu để chạy trên DB dùng thật. Không triển khai Phase 1C liên quan tiền/công nợ/xuất bãi trước khi sửa và kiểm chứng lại.

## Đã xác nhận khắc phục

1. Migration 002 đã seed **60 `is_active=TRUE` và 7 `is_active=FALSE`**, đúng tiêu chí `release_phase == 'V1' && feature_key == 'CORE'` trong script sinh dữ liệu. Feature flag `CORE` được bật, flags giai đoạn sau tắt.
2. Migration 001 có `chk_approval_status_lifecycle`, `chk_approval_reason_not_empty`, `chk_four_eyes_actor`.
3. Migration 003 không còn chính sách INSERT trực tiếp cho `app_audit_events`, có trigger audit gán vai trò và cấp quyền, có RLS audit theo `yard_id` + `department_code`.
4. Hai script trong ZIP chạy lại cho **42 PASS / 0 FAIL** và `audit_rbac_exact.py` exit 0 **trên bản hiện tại**. Điều này chỉ kiểm chứng các điều kiện hiện có trong các script, không chứng minh đủ an toàn.

## Phát hiện chưa được khắc phục

### SC-R2-01 — CRITICAL / BLOCKER: RPC ghi audit công khai cho mọi người dùng đã đăng nhập

**File:** `supabase/migrations/20261011000003_rbac_security_functions_rls.sql`, dòng **110–158**, nhất là **131–150, 157–158**.

- `public.sc_log_audit_event()` là `SECURITY DEFINER`, chấp nhận tham số `action_code`, `target_type`, `target_id`, `yard_id`, `department_code`, `before_data`, `after_data`, `reason` do caller cung cấp.
- `GRANT EXECUTE ... TO authenticated` cho phép người dùng đã đăng nhập gọi trực tiếp RPC, bất kể có quyền tạo audit hay không. `auth.uid()` chỉ cố định actor, **không xác thực nội dung sự kiện**.
- `p_yard_id`/`p_department_code` được caller cấp sẵn sẽ được sử dụng mà không xác minh; việc suy ra từ assignment chỉ thực hiện cho giá trị trống. Với nhiều role assignments, truy vấn mặc định còn chọn một assignment theo `created_at DESC` không kiểm tra thời hạn hay đối tượng nghiệp vụ.
- Vì vậy, **bỏ INSERT RLS nhưng vẫn mở RPC** không ngăn được giả mạo sự kiện audit.

**Phải sửa:** Không công khai RPC ghi audit cho browser/`authenticated`; thu hồi EXECUTE trên hàm nội bộ và tốt nhất di chuyển vào schema không expose. Chỉ các transaction/trigger nghiệp vụ có đặc quyền phù hợp được ghi audit; `actor`, thời gian, đối tượng, phạm vi và snapshot trước/sau phải được lấy từ server/database, không nhận tùy ý từ client. Thử một tài khoản nghiệp vụ gọi RPC audit trực tiếp phải bị từ chối. Kiểm tra lại toàn bộ grants EXECUTE của các hàm SECURITY DEFINER.

### SC-R2-02 — CRITICAL / BLOCKER: RPC phê duyệt không bắt buộc kiểm tra quyền trong chính sách có mã duyệt NULL

**File:** SQL migration 003 dòng **250–263, 314–322**; migration 002 dòng **331, 332, 335, 337**.

- `IF v_pol.approve_permission_code IS NOT NULL AND NOT public.sc_can(...) THEN ...` đồng nghĩa **bỏ qua kiểm tra quyền** khi mã duyệt là `NULL`.
- Các chính sách **AP02, AP03, AP06, AP08** có `approve_permission_code=NULL`. Vì hàm `sc_approve_request` được cấp EXECUTE cho `authenticated`, người dùng khác người đề nghị có thể chuyển yêu cầu PENDING sang APPROVED nếu biết `request_id`, ngay cả khi không có quyền nghiệp vụ tương ứng; vẫn phải xét ràng buộc toàn cục `chk_four_eyes_actor`.
- Đây không phải bằng chứng rằng 4 chính sách V5 đều cần duyệt hai bước. Trường `NULL` có thể mang ý nghĩa **thao tác trực tiếp theo quyền nghiệp vụ**, vì vậy tuyệt đối không tự gán một permission mới vào workbook.

**Phải sửa:** Phân loại policy nào có approval hai bước và policy nào là tác vụ một bước. RPC duyệt **fail-closed** đối với policy không có `approve_permission_code`; tác vụ một bước phải đi qua RPC nghiệp vụ riêng, kiểm tra quyền action thực sự và target thuộc scope, ghi audit nguyên tử. Kiểm thử một user không có `exit.clearance.debt_exception` không thể tác động đến trường hợp AP06.

### SC-R2-03 — HIGH: Quyền theo YARD/DEPARTMENT bị bỏ qua trong việc tạo/duyệt request

**File:** SQL migration 003 dòng **260–263, 319–322, 427–443**; `sc_can` dòng **26–73**.

- Cả `sc_approve_request()` và `p_approval_insert` gọi `sc_can(permission_code)` mà không truyền `yard_id`, `department_code`, `owner_id` của **bản ghi mục tiêu thực tế**.
- `sc_can` với các tham số scope là `NULL` chỉ có thể trả true nếu người dùng có quyền cấp `ALL`. Theo grants hiện tại, chỉ `SYS_ADMIN` có `ALL` (60 grants). Các nhân viên/Trưởng bộ phận có `YARD` hoặc `DEPARTMENT` bị từ chối dù đã được cấp đúng quyền.
- Ví dụ, `PORT_LEAD` được cấp `reefer.session.amendment.approve` theo `DEPARTMENT`, nhưng RPC duyệt AP01 gọi `sc_can()` không có context nên không thực hiện đúng quyền.

**Phải sửa:** Context phải được lấy từ target thật trên DB/qua RPC nghiệp vụ tương ứng; không truyền tham số scope do client khai báo rồi coi là đáng tin. Tại Phase 1B khi target domain chưa tồn tại, cần đóng các đường gọi không thể xác minh, và ghi rõ phụ thuộc Phase 1C. Bổ sung test cho user cấp YARD/DEPARTMENT đúng và khác phạm vi.

### SC-R2-04 — HIGH: Chính sách tạo yêu cầu có điều kiện EXISTS sai liên kết

**File:** SQL migration 003 dòng **437–443**.

`SELECT 1 FROM public.app_approval_policies ap WHERE ap.policy_code = policy_code ...` dùng tên `policy_code` **không đủ định danh trong subquery có chính cột `ap.policy_code`**, vì vậy sẽ tham chiếu cột của `ap` thay vì cột ở request ngoài; biểu thức tương đương `ap.policy_code = ap.policy_code` trong trường hợp cột không null.

**Hệ quả:** Điều kiện kiểm tra chính sách thực sự của request không được ràng buộc chính xác. Cùng với SC-R2-03, phần lớn user nghiệp vụ sẽ không tạo được yêu cầu, trong khi kiểm tra policy có thể bị áp dụng cho một policy khác với policy được gửi lên.

**Phải sửa:** Dùng outer-row binding tường minh/kiến trúc RPC tạo yêu cầu, kiểm tra đúng policy và target. Nên bỏ direct INSERT của client vào `app_approval_requests` cho nghiệp vụ nhạy cảm cho tới khi RPC xác minh target và scope thực sự có sẵn.

### SC-R2-05 — HIGH: Script audit còn bỏ qua `is_enabled` của từng grant (đã chứng minh bằng thử nghiệm)

**File:** `scripts/audit_rbac_exact.py` dòng **195–212**.

Code có đọc `is_enabled` từ SQL và `Đang cấp` từ Excel nhưng chỉ so sánh `scope`, **không so sánh `s['is_enabled']` với `e['is_enabled']`**. Do đó không đáp ứng tuyên bố đối chiếu đầy đủ `(role, permission, scope, active)`.

**Thử nghiệm:** Trên một thư mục *bản sao tạm thời riêng biệt*, thay duy nhất grant `('SEC_STAFF','vehicle.visit.read','YARD',TRUE)` thành `FALSE`. Chạy `audit_rbac_exact.py` trên bản sao cho **exit code 0 và báo PASS**. File gốc của người dùng **không bị sửa**.

**Phải sửa:** So sánh full tuple và báo code khác 0 khi bất cứ scope/active nào đổi. Làm mutation/negative test tự động; script chỉ đáng tin nếu phát hiện được lỗi đã cố tình chèn.

### SC-R2-06 — HIGH: PostgreSQL test suite chưa chạy được độc lập trên local database sạch

**File:** `supabase/tests/rbac_verification.sql` dòng **166–211**.

- Test 6 dùng `v_uid := gen_random_uuid()` để INSERT `app_user_role_assignments`, nhưng `user_id` có FK tới `auth.users(id)`; UUID ngẫu nhiên chưa có người dùng tương ứng ⇒ **foreign key violation** trên DB sạch.
- Test 7 dùng UUID cố định `00000000-...-0002` làm `requested_by` mà không tạo fixture `auth.users`; cùng rủi ro FK.
- Test 7 `EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'PASS'` có thể **bắt chính lỗi do kiểm thử tự ném ra**, dẫn đến false-positive.
- Không có transaction `BEGIN/ROLLBACK` bọc suite; test audit tạo dữ liệu append-only có thể làm bẩn DB khi chạy không cô lập.
- Chưa có bài test đúng ngữ cảnh `authenticated`, danh tính JWT, policy RLS `INSERT/SELECT`, scope YARD/DEPARTMENT, RPC giả mạo audit và duyệt NULL-code.

**Phải sửa:** Chạy trong DB local disposable/transaction rollback, tạo fixture `auth.users` thật hoặc qua Supabase Auth test setup; thiết lập role `authenticated` và claim người dùng trong test; phân biệt SQLSTATE/expected error đúng; kiểm tra kết quả chấp nhận và từ chối, tránh `WHEN OTHERS` vô điều kiện PASS.

### SC-R2-07 — MEDIUM/HIGH: Đối tượng phê duyệt không được đối chiếu với dữ liệu nghiệp vụ

**File:** SQL migration 001 dòng **103–124**; SQL migration 003 dòng **241–280, 305–339**.

`target_type` và `target_id` là trường chung không có FK tới lượt container/phiên điện/giao dịch tiền (do domain schema chưa triển khai). `sc_approve_request()` chỉ thay `status` của request và viết audit, **không kiểm tra target tồn tại hay áp dụng giao dịch nghiệp vụ**.

Điều này có thể là thiết kế placeholder hợp lý ở Phase 1B, nhưng **không được dùng trạng thái APPROVED làm bằng chứng đã duyệt xuất bãi/điều chỉnh tiền trong thực tế**. Kết nối đúng đối tượng, kỳ vọng trước/sau, phiên bản, phạm vi, nguyên tắc không tự duyệt và mutation nghiệp vụ trong một transaction chỉ làm được khi có domain schema ở Phase 1C. Trước thời điểm đó cần fail-closed.

### SC-R2-08 — MEDIUM: RLS đọc approval và Types chưa đáp ứng chức năng thực tế

- **SQL migration 003 dòng 417–425:** Policy đọc approval chỉ cho requester, người đã duyệt, hoặc `sc_can('audit.read')` không có context. `PORT_LEAD`/`DIS_LEAD` có quyền đọc audit theo `DEPARTMENT` nhưng không thể liệt kê pending requests thuộc phạm vi để xử lý.
- **`src/types/database.types.ts` dòng 335–355:** Chưa có khai báo các RPC mới `sc_log_audit_event`, `sc_approve_request`, `sc_reject_request`. Types cần được cập nhật/sinh lại từ DB thực tế sau migration; không coi các types thủ công là bản schema đồng bộ.

## Ma trận kiểm thử tối thiểu cần bổ sung (PostgreSQL/Supabase Local)

1. `authenticated` bình thường **không được EXECUTE** RPC audit tùy ý.
2. User không có quyền ngoại lệ nợ không thể duyệt/xử lý policy AP06 dù biết ID request.
3. User `PORT_STAFF` trong bãi đúng được yêu cầu AP01; ngoài bãi bị từ chối.
4. `PORT_LEAD` khác người đề nghị, cùng bãi/bộ phận có thể duyệt AP01; trưởng bộ phận khác bị từ chối.
5. `PORT_LEAD` nhìn thấy pending requests đúng phạm vi, không thấy yêu cầu của bộ phận khác.
6. Không thể tạo request với status khác PENDING; không thể tạo request cho policy khác quyền thực có.
7. Không được tự duyệt hoặc duyệt hai lần; request ID giả/target không tồn tại phải bị từ chối.
8. Trigger audit gán/thu hồi roles và sửa grants phải ghi đúng actor và snapshot trước/sau trong transaction.
9. Người đọc audit chỉ thấy log của đúng bộ phận và bãi; thử nhiều assignments/hết hạn.
10. Test dữ liệu Excel—SQL phải FAIL nếu cố tình đổi một `is_enabled = TRUE` sang `FALSE` ở bất kỳ grant nào.
11. SQL test fixture không dùng UUID của `auth.users` chưa tồn tại, không đánh dấu PASS do catch-all lỗi.
12. Chạy migrations trên **local disposable DB** và test với vai trò `anon/authenticated` + claim thực, không chỉ kiểm tra SQL text.

## Quy trình nghiệm thu đề xuất

- **Ngay bây giờ:** Sửa SC-R2-01 đến SC-R2-06, bổ sung negative tests và nhật ký. Không thay workbook, không thêm quyền mới.
- **Khi có Docker/Supabase Local:** Chạy migrations 001–003 trên PostgreSQL; kiểm tra lỗi SQL/permissions, test RLS/RPC như ma trận trên.
- **Sau khi Domain schema xuất hiện:** Kết nối approvals theo target thật, transaction và audit một cách bảo mật; đến khi đó các RPC generic nhạy cảm phải fail-closed.
- **Điều kiện nghiệm thu Phase 1B:** Không còn critical/high source defects; runtime RLS tests có cả `ALLOW` và `DENY`; các kịch bản actor/yard/dept/target được xác minh; không sử dụng `42 PASS` kiểm tra tĩnh thay cho runtime tests.
