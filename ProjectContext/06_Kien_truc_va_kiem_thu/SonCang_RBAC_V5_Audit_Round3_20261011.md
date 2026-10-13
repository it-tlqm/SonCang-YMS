# KIỂM TOÁN ĐỘC LẬP RBAC V5 — VÒNG 3
**Dự án:** Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Ngày:** 11/10/2026  
**Bản kiểm tra:** `rbac_v5_verification_bundle(2).zip` (16 file, 3 SQL migrations, 1 SQL test suite, scripts, dữ liệu JSON, types).  
**Kết luận:** Danh mục RBAC/seed đã khớp workbook V5. **Không nghiệm thu Phase 1B**; SQL test suite hiện chứa hai lỗi trực tiếp khiến chạy trên PostgreSQL thất bại, kiểm thử phân quyền theo người dùng còn thiếu, và generic approval RPC chưa xác minh đối tượng nghiệp vụ.

## A. Kết quả đã kiểm tra độc lập

| Phần kiểm tra | Kết quả | Phạm vi kết luận |
|---|---|---|
| Đọc ZIP và kiểm tra 16 file | Đạt | Tệp trong gói có thể đọc được |
| Đối chiếu trực tiếp workbook V5 với SQL 002 | **8/8 roles, 67/67 permissions, 206/206 grants khớp**, không có tuple thiếu/thừa; trạng thái 60 active/7 inactive | Dữ liệu **tĩnh**; chưa chứng minh quyền hoạt động runtime |
| `python scripts/audit_rbac_exact.py` | **Exit 0** | Kiểm toán tĩnh |
| `node scripts/verify_rbac_invariants.js` | **50 PASS, 0 FAIL**, Exit 0 | Test nhận diện chuỗi và dữ liệu JSON/SQL, không thực thi RLS |
| `python scripts/test_audit_mutation.py` | **4/4 PASS**, Exit 0 | Phát hiện mutation grant `is_enabled`, `scope`, permission `is_active` |
| Phép thử migration/RLS/approval trên PostgreSQL | **Chưa chạy** | Chưa có bằng chứng nghiệm thu runtime |

Các script được chạy lại trong một thư mục kiểm tra biệt lập với workbook gốc, không làm thay đổi ZIP người dùng. Không tự xác nhận kết quả `pnpm build` từ gói này vì không có mã nguồn ứng dụng Next.js đầy đủ.

## B. Phát hiện cần xử lý

### SC-R3-01 — BLOCKER: SQL test INSERT vào cột không tồn tại
- `supabase/migrations/20261011000001_foundation_rbac.sql` dòng **17–21**: `public.app_yards` có `id`, `name`, `is_active`, **không có `code`**.
- `supabase/tests/rbac_verification.sql` dòng **20–24**: fixture dùng `INSERT INTO public.app_yards (id, code, name, is_active)`.
- **Tác động:** Script không thể chạy trên schema vừa được tạo bằng migration 001; PostgreSQL sẽ báo cột `code` không tồn tại.
- **Sửa:** Fixture sử dụng chính xác schema (`id`, `name`, `is_active`); không tự thêm cột `code` vào nghiệp vụ nếu V5 không yêu cầu.

### SC-R3-02 — BLOCKER: Lệnh RAISE NOTICE ngoài khối PL/pgSQL
- `supabase/tests/rbac_verification.sql` dòng **346–347** có `ROLLBACK;` rồi `RAISE NOTICE ...;` độc lập.
- `RAISE` là câu lệnh PL/pgSQL trong function/`DO`, không phải câu lệnh SQL top-level.
- **Tác động:** Chạy test trọn vẹn sẽ lỗi cú pháp tại dòng này, kể cả các test trước đó đã hoàn tất.
- **Sửa:** Chuyển thông báo vào `DO $$ BEGIN RAISE NOTICE ...; END $$;` **trước** `ROLLBACK`, hoặc in kết quả ở script thực thi ngoài SQL.

### SC-R3-03 — HIGH: Test AP06 có thể PASS dù chưa kiểm tra chính sách
- `supabase/tests/rbac_verification.sql` dòng **297–310**: test gọi `sc_approve_request` khi không thiết lập `auth.uid()` và chấp nhận lỗi **"Chưa đăng nhập"** làm kết quả PASS.
- Trong SQL 003, `sc_approve_request` kiểm tra `auth.uid()` ở **318–321**, trước khi xem mã chính sách AP06 ở **342–345**. Test hiện tại sẽ có thể chỉ đi qua điều kiện chưa đăng nhập.
- **Sửa:** Tạo fixture đăng nhập đã cấp role thật; kiểm tra sai lệch thông báo/lỗi chính xác của AP06 khi **đã xác thực**, và kiểm tra trạng thái yêu cầu vẫn PENDING.

### SC-R3-04 — HIGH: Chưa có kiểm thử ALLOW/DENY thực sự theo 4 scopes
- `supabase/tests/rbac_verification.sql` dòng **319–341** có tiêu đề "4 scopes" nhưng chỉ gọi `sc_can` trong phiên không xác thực, rồi ASSERT `false`.
- Toàn bộ SQL suite không có `SET ROLE authenticated`, fixture JWT session (`request.jwt.claim.sub`) hay ma trận hai người/hai bãi/hai bộ phận để khẳng định `YARD/DEPARTMENT/SELF/ALL` hoạt động.
- Các phép INSERT/UPDATE vào bảng được thực thi theo tài khoản chạy migration/test; tài khoản đặc quyền có thể bypass RLS. Vì vậy các test schema/trigger không thay thế phép thử như người dùng nghiệp vụ.
- **Sửa:** Test theo nhiều `auth.uid()` giả lập an toàn trong local DB; bật vai trò `authenticated` theo phiên test; xác minh cả ALLOW và DENY cho từng scope, kể cả role hết hạn và actor không có quyền. Khi tạo fixture, không đưa mật khẩu/secrets thật vào log.

### SC-R3-05 — HIGH / PHỤ THUỘC DOMAIN: Generic approval dùng target/scope/snapshot do client khai báo
- `supabase/migrations/20261011000003_rbac_security_functions_rls.sql` dòng **230–301**: `sc_create_approval_request()` cho client truyền `p_target_type`, `p_target_id`, `p_yard_id`, `p_department_code`, `p_before_snapshot`, `p_proposed_changes`.
- Hàm có kiểm tra người đăng nhập và quyền request qua `sc_can`, nhưng **không truy vấn đối tượng nghiệp vụ theo `target_id`** để chứng minh nó tồn tại và xác định bãi/bộ phận/thông tin trước-sau đúng bản ghi.
- RLS `p_approval_insert` dòng **526–546** còn cho phép INSERT trực tiếp với các trường trên nếu điều kiện quyền thỏa mãn; các tham số target/scope vẫn là dữ liệu khai báo.
- `sc_approve_request` dòng **347–350** dùng `yard_id`/`department_code` đã lưu trong request, do đó quyền phê duyệt chưa được kiểm tra với scope truy xuất từ bản ghi mục tiêu thật.
- **Tác động:** Có nguy cơ tạo hồ sơ yêu cầu/nhật ký không đúng với đối tượng thật, và cấp duyệt dựa trên context sai khi gắn luồng vào nghiệp vụ tài chính. Chưa có bằng chứng khai thác hoặc xử lý tiền vì Domain Schema vẫn chưa triển khai.
- **Sửa:** Trong Phase 1B, **fail closed** với yêu cầu chưa thể kiểm chứng target: không expose generic INSERT/RPC tạo hoặc duyệt hồ sơ nhạy cảm; hoặc xây resolver theo từng target đã tồn tại. Khi có Domain Schema, backend/DB phải tự truy xuất target, bãi, bộ phận, owner và snapshot từ database trong cùng transaction; không tin client.

### SC-R3-06 — MEDIUM: Báo cáo đang mô tả sai AP10; cần đối chiếu AP11/AP12
- Báo cáo Antigravity ghi AP10 là "tác vụ một bước", trong khi chính workbook tab **`23_V5_PHÊ_DUYỆT`** và SQL seed 002 dòng **339** cho biết **AP10 — Bảng giá thay đổi, yêu cầu `tariff.change.request`, duyệt/ban hành `tariff.change.publish`**. AP10 **không phải trường hợp `approve_permission_code IS NULL`**.
- AP08 là **ngoại lệ trạng thái điện thực tế**, không phải "ghi đè giá" như phần giải thích trong báo cáo Antigravity.
- Workbook liệt kê **AP01–AP12**, trong khi migration 002 mới seed **AP01–AP10**; AP11 là tương lai (hoàn tiền/giảm), AP12 là nhận diện người trực trên thiết bị chung V1. Cần xác nhận AP11 và AP12 được quản lý ở đâu, tránh vô ý bỏ sót; **không tự quyết định thêm chính sách hoặc bật chức năng**.
- SQL seed AP10 có `enforce_distinct_actor = FALSE` dù workbook ghi "đề nghị/ban hành tách biệt"; CHECK chung trong schema 001 hiện vẫn chặn `approved_by = requested_by`. Cần chuẩn hóa cấu hình để không mâu thuẫn với yêu cầu nghiệp vụ.

## C. Những cải tiến đã thấy trong mã mới

1. `sc_log_audit_event()` đã có `REVOKE ALL` khỏi `PUBLIC` và `authenticated` ở migration 003 dòng **157–159**; test quyền EXECUTE runtime vẫn cần thực hiện.
2. Approval RPC đã từ chối policy không có mã quyền duyệt, và truyền yard/department vào `sc_can`; điều này **chưa đủ** để xác thực scope của **target thật**.
3. Script đối chiếu đã kiểm tra `is_enabled`, và mutation test thực sự phát hiện 3 loại thay đổi kiểm thử.
4. Seed V5 hợp lệ: 60 quyền CORE active; 7 quyền giai đoạn sau inactive; 206 grants khớp workbook.

## D. Trình tự khắc phục / nghiệm thu đề xuất

1. **Sửa ngay hai lỗi SQL test (SC-R3-01/02)**; script phải chạy trọn vẹn, fail với non-zero exit code nếu có assertion/syntax error.
2. **Viết lại test AP06 và scopes (SC-R3-03/04)** để thực thi như tài khoản `authenticated`, gồm ca ALLOW/DENY, kiểm tra `has_function_privilege`, không lấy `auth.uid() = NULL` làm bằng chứng đủ.
3. **Khóa những đường tạo/duyệt approval không thể kiểm chứng target** cho đến khi Domain Schema có resolver đúng (SC-R3-05). Không gán nhãn "production secure" cho RPC tổng quát khi chưa có nghiệp vụ thật.
4. **Sửa văn bản AP10 và làm rõ AP11/AP12** theo workbook (SC-R3-06), không sửa workbook.
5. Cài/khởi động Docker Desktop, chạy Supabase Local từ DB sạch, áp dụng migration 001–003, chạy SQL tests thật và ghi bằng chứng terminal. Không đụng Remote/Production.
6. Chỉ xác nhận Phase 1B runtime sau khi cả SQL migration, auth, RLS, RPC và scope được test thực tế. Tiếp tục Phase 1C theo mốc nghiệm thu khi đủ điều kiện, không lặp đi lặp lại kiểm tra tĩnh thay cho PostgreSQL.

> Lưu ý: Báo cáo này là **kiểm toán mã nguồn tĩnh và đối chiếu dữ liệu**. Không có PostgreSQL runtime được dùng để xác thực hiệu quả RLS tại thời điểm viết.
