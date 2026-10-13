# SƠN CẢNG — KIỂM TOÁN ĐỘC LẬP RBAC V5, VÒNG 4

**Ngày:** 11/10/2026  
**Nguồn:** `rbac_v5_verification_bundle(3).zip` do người dùng cung cấp, 18 tệp; báo cáo Antigravity `Pasted text(20261011-104909).txt`; workbook gốc `PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx`.  
**SHA-256 ZIP:** `0433282d84cb3aec10b9f6ab10fcc4ff2c3be178f6cc0c610823cef3bafc4310`.  
**Giới hạn:** Chỉ kiểm tra tệp và chạy Python/Node trong môi trường kiểm toán độc lập. **Không** kết nối được Docker/PostgreSQL trên máy Windows của người dùng; **không** kết luận migrations hay RLS đã đạt runtime.

## 1. Phần đã xác minh đạt

- Đã mở hợp lệ toàn bộ **18/18** thành viên trong ZIP.
- Chạy `python scripts/audit_rbac_exact.py` với workbook V5 gốc: **exit 0**, 8 roles, 67 permissions, 206 grants khớp; 60 quyền V1/CORE kích hoạt và 7 quyền giai đoạn sau không kích hoạt.
- Chạy `python scripts/test_audit_mutation.py`: **4/4 PASS**, phát hiện đột biến `is_enabled`, `scope`, `is_active`.
- SQL Seed 002 có AP10 đề nghị/ban hành tách biệt (`enforce_distinct_actor = TRUE`), AP11 không kích hoạt, AP12 có khai báo V1. Đã đối chiếu các mã AP với tab `23_V5_PHÊ_DUYỆT` của workbook.
- Migration 003 đã có `REVOKE` quyền gọi hàm ghi audit trực tiếp đối với `PUBLIC` và `authenticated` (dòng 157–159); chưa xác minh quyền hiệu lực trên PostgreSQL.
- Đã bỏ cột `app_yards.code` khỏi fixture và không còn `RAISE NOTICE` trần sau `ROLLBACK`.

## 2. Các vấn đề còn tồn tại trong mã nguồn

### SC-R4-01 — BLOCKER: Fixture assignment hết hạn vi phạm CHECK

- **File:** `supabase/tests/rbac_verification.sql`, dòng 97–99.
- **Schema:** `supabase/migrations/20261011000001_foundation_rbac.sql`, dòng 63–68.
- Fixture thiết lập `valid_until = now() - interval '1 hour'` nhưng bỏ trống `valid_from`, nên `valid_from` nhận mặc định `now()`. Constraint `valid_until > valid_from` bắt buộc bị vi phạm ngay khi INSERT. Toàn bộ test script không thể hoàn tất với fixture như hiện tại.
- **Khắc phục:** Đặt rõ `valid_from = now() - interval '2 hours'`, `valid_until = now() - interval '1 hour'`, hoặc một khoảng đã hết hạn hợp lệ tương đương; vẫn giữ nguyên constraint schema.

### SC-R4-02 — HIGH: Fail-closed RPC tạo yêu cầu có thể bị đi vòng bằng INSERT bảng

- **File:** `supabase/migrations/20261011000003_rbac_security_functions_rls.sql`, dòng 284–286 (RPC `sc_create_approval_request()` luôn ném lỗi khi chưa xác thực được target) đối chiếu với dòng 530–550 (RLS `p_approval_insert` vẫn cho phép `authenticated` tạo PENDING trực tiếp với target/yard/department/snapshot do client khai báo).
- **Hệ quả có điều kiện:** Nếu database role `authenticated` còn quyền `INSERT` trên `public.app_approval_requests`, client có thể bỏ qua RPC đã khóa và tự tạo PENDING với target chưa xác minh. Các DEFAULT GRANT của Supabase thay đổi theo đời project, nên cần kiểm tra quyền **thực tế** bằng `has_table_privilege`, không giả định một cách tuyệt đối. **Mã migration này chưa có REVOKE INSERT tương ứng.**
- **Khắc phục:** Trước khi có Domain Schema tin cậy, `DROP POLICY p_approval_insert` và chủ động thu hồi quyền INSERT trực tiếp cho `anon/authenticated`; kiểm chứng với phiên `authenticated` thật. Mọi tạo yêu cầu sau này phải dùng giao dịch nghiệp vụ có tra cứu target và xác minh scope từ database. Kiểm tra đường phê duyệt tiếp theo để không xử lý hồ sơ giả.

### SC-R4-03 — HIGH: SQL tests chưa kiểm tra RLS dưới role authenticated

- **File:** `supabase/tests/rbac_verification.sql`, dòng 23–43, 366–370, 410–461.
- `pg_temp.set_test_auth()` thay đổi `request.jwt.claim.sub` và `request.jwt.claim.role`, nhưng **không** dùng `SET LOCAL ROLE authenticated`. Do đó `current_user` của kết nối kiểm thử vẫn có thể là `postgres`/chủ sở hữu DB, người có thể bypass RLS. Các khẳng định `sc_can()` vẫn hữu ích cho logic scope, nhưng **không phải** kiểm tra RLS đối với `SELECT/INSERT/UPDATE/DELETE` của người dùng thực tế.
- **Khắc phục:** Viết các kịch bản tách biệt thực thi dưới database role `authenticated`, JWT claim hợp lệ, kiểm tra `current_user`, thử truy vấn/ghi bảng thật và đối chiếu ALLOW/DENY; kiểm tra quyền gọi RPC và đối tượng ngoài phạm vi. Giữ test đặc quyền tạo fixture riêng.

### SC-R4-04 — BLOCKER kiểm thử bằng CLI: File không tạo pgTAP results

- **File:** `supabase/tests/rbac_verification.sql`; toàn bộ 10 khối `DO $$ ... ASSERT ... $$` và `RAISE NOTICE` nhưng **không có** `SELECT plan(...)`, pgTAP assertions hoặc `SELECT * FROM finish()`.
- **Vấn đề:** Lệnh `npx supabase test db` thực thi qua `pg_prove`/pgTAP, không phải lệnh chạy SQL tổng quát. Không thể khẳng định file này sẽ cho ra 10/10 pgTAP PASS như báo cáo. Tài liệu chính thức: <https://supabase.com/docs/reference/cli/supabase-test-db> và <https://supabase.com/docs/guides/local-development/testing/overview>.
- **Khắc phục:** Chuyển thành bài test pgTAP hợp lệ (plan, assertions, finish), hoặc chạy bộ `DO/ASSERT` bằng `psql -v ON_ERROR_STOP=1` trên **local** riêng, đồng thời duy trì pgTAP suite chuẩn cho `supabase test db`. Cần quan sát process exit code, không coi riêng `RAISE NOTICE 'PASS'` là bằng chứng.

### SC-R4-05 — MEDIUM: Test SELF đang dùng quyền YARD

- **File:** `supabase/tests/rbac_verification.sql`, dòng 437–441.
- Workbook V5 cấp `SEC_STAFF / vehicle.visit.read` **YARD**, không phải `SELF`. Truyền `owner_id` trùng user trong test này không chứng minh nhánh SELF và không có ca `owner_id` sai bị từ chối.
- **Khắc phục:** Test `SEC_STAFF / report.revenue.read` (SELF trong workbook), kiểm tra đúng owner ALLOW, sai owner DENY, sai yard DENY và bỏ owner DENY.

### SC-R4-06 — MEDIUM: ZIP bàn giao không đủ để chạy lại toàn bộ bộ kiểm tra JS

- **File:** `scripts/verify_rbac_invariants.js`, dòng 23–25, phụ thuộc `scripts/verified_roles.json`, `scripts/verified_permissions.json`, `scripts/verified_grants.json`. Ba tệp JSON **không có trong ZIP mới**. Đã thử chạy trực tiếp từ bản giải nén: Node báo `ENOENT ... verified_roles.json` và thoát lỗi.
- **Khắc phục:** Bàn giao kèm dữ liệu `verified_*.json`, công cụ trích xuất nguồn và một lệnh tái sinh minh bạch; hoặc để JS kiểm tra trực tiếp workbook/SQL. Không dùng kết quả JS `50/50 PASS` trong workspace như bằng chứng ZIP kiểm chứng độc lập.

## 3. Kết luận nghiệm thu

**Có thể công nhận:** đối chiếu danh mục RBAC và kết quả mutation tests; AP10/AP11/AP12 đã đồng bộ ở mức seed tĩnh.  
**Chưa thể công nhận:** chạy migration 001–003 trên PostgreSQL thật; SQL test runtime; tính hiệu lực GRANT/RLS/RPC; đường tạo approval an toàn; tách biệt scope trên dữ liệu nghiệp vụ.

**Quyết định đề xuất:** Không mở Phase 1C hoặc kết nối tài chính thực tế cho đến khi chạy được PostgreSQL Local và giải quyết ít nhất SC-R4-01 đến SC-R4-04. Không yêu cầu làm lại 8 roles/67 permissions/206 grants.

## 4. Tiêu chí giao Antigravity vòng tiếp theo

1. Người dùng mở Docker Desktop đến trạng thái **Engine running**; Antigravity kiểm tra `docker info`, `npx supabase status` và chỉ khởi tạo local, không dùng `--linked` hoặc `--db-url` remote.
2. Sửa fixture `valid_from`/`valid_until`, kiểm tra tất cả inserts với schema.
3. Đóng đường INSERT trực tiếp approval và kiểm chứng `has_table_privilege`/RLS dưới role `authenticated`.
4. Bổ sung pgTAP hợp lệ cho `npx supabase test db` và test RLS với `SET LOCAL ROLE authenticated`; test các role cụ thể, ALLOW/DENY, AP06, audit EXECUTE, người tự duyệt, nhiều bãi/bộ phận.
5. Dùng đúng quyền SELF từ workbook; có test sai owner.
6. Chạy `npx supabase start` trên local sạch, ghi log migrations, chạy test với exit code; sửa theo thông báo PostgreSQL thực tế.
7. Đóng gói ZIP mới đầy đủ dependencies/script/log; tách rõ test tĩnh và test runtime. Không báo “PASS” khi chưa chạy được.
