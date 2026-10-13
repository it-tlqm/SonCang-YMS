# BÁO CÁO NGHIỆM THU KỸ THUẬT PHASE 1A & 1B
## Dự án: Website + PWA Quản lý bến bãi/cảng cạn Sơn Cảng
### Đơn vị: Công ty Cổ phần Tà Lùng Quang Minh
*Ngày lập: 11/10/2026*  
*Người thực hiện: Antigravity Pairing Assistant*

---

## I. TỔNG QUAN PHẠM VI NGHIỆM THU

Giai đoạn nghiệm thu kỹ thuật Phase 1A & 1B tập trung vào hai trụ cột nền tảng:
1. **Phase 1A — Project Foundation:** Khởi tạo Next.js 16.4 App Router, TypeScript Strict Mode, Tailwind CSS v4, Design Tokens ánh xạ nhận diện thương hiệu Sơn Cảng, Supabase SSR Clients và cấu hình Next.js 16 Proxy.
2. **Phase 1B — Auth, RBAC & Database Migrations:** Thiết kế Schema RBAC chuẩn V5 (11 bảng), trích xuất và seed chính xác 100% dữ liệu từ Workbook V5 (8 vai trò, 67 quyền hạn, 206 phân quyền vai trò), thiết lập hàm bảo mật `sc_can()`, trigger bảo vệ Audit Log bất biến và RLS deny-by-default.

---

## II. KẾT QUẢ KIỂM TRA NEXT.JS 16 & SUPABASE AUTH

### 1. Phiên bản & Môi trường thực thi
- **Next.js:** 16.4.0 (sử dụng Turbopack engine)
- **React:** 19.2.4
- **TypeScript:** 5.9.3 (Strict Mode: `noImplicitAny: true`, `strictNullChecks: true`)
- **Tailwind CSS:** 4.2.3
- **Supabase SSR:** `@supabase/ssr` 0.9.0 & `@supabase/supabase-js` 2.99.3

### 2. Kiến trúc Next.js 16 Proxy & Session Management
- **Quy ước Next.js 16:** Next.js 16 phân định rõ ràng giữa file `proxy.ts` và `middleware.ts`. Để tránh xung đột runtime (`Both middleware file and proxy file are detected`), hệ thống sử dụng duy nhất file [src/proxy.ts](file:///d:/thanhnx/OpenCode/YMS-project/src/proxy.ts).
- **Cơ chế cập nhật Cookie Session:** File `src/proxy.ts` gọi helper `updateSession()` tại [src/lib/supabase/middleware.ts](file:///d:/thanhnx/OpenCode/YMS-project/src/lib/supabase/middleware.ts), đảm bảo:
  - Khởi tạo `createServerClient` với cơ chế đọc/ghi cookie an toàn cho Server Components và Proxy.
  - Tự động làm mới Auth token (`supabase.auth.getUser()`) trước khi request chuyển đến Router.
  - Bảo vệ các route tác nghiệp `/portal/*` (yêu cầu đăng nhập, chuyển hướng `/auth/login` nếu chưa xác thực).
- **Nguyên tắc bảo mật:** Proxy chỉ đóng vai trò phân luồng trải nghiệm người dùng ban đầu. Lớp bảo vệ dữ liệu tối thượng vẫn được bảo đảm bởi Row Level Security (RLS) và RBAC tại PostgreSQL Server.

### 3. Kết quả chạy kiểm thử tĩnh & Biên dịch (Static Verification & Build)
- `pnpm exec tsc --noEmit`: **PASS (0 lỗi)**
- `pnpm lint`: **PASS (0 cảnh báo, 0 lỗi)**
- `pnpm build`: **PASS (100% thành công)**
  - Route static: `/`
  - Function: `ƒ Proxy (Middleware)` với matcher `['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']`

---

## III. CHUẨN BỊ MÔI TRƯỜNG SUPABASE LOCAL & TRẠNG THÁI ENGINE

### 1. Kiểm tra môi trường cục bộ
| Thành phần | Phiên bản / Trạng thái | Đánh giá |
| :--- | :--- | :--- |
| **WSL (Windows Subsystem for Linux)** | Default Version: 2 | ĐÃ SẴN SÀNG (Kernel Linux v2 hoạt động bình thường) |
| **Supabase CLI** | 2.120.0 (qua `npx supabase`) | ĐÃ SẴN SÀNG |
| **File cấu hình dự án** | `supabase/config.toml` | ĐÃ TẠO (`Finished supabase init`) |
| **Docker Desktop / Engine** | `C:\Program Files\Docker\Docker\Docker Desktop.exe` = False | **CHƯA CÀI ĐẶT** trên máy host Windows |

### 2. Hướng dẫn cài đặt Docker Desktop trên Windows (Dành cho Người dùng)
Do Antigravity tuân thủ quy tắc không tự ý cài đặt phần mềm yêu cầu quyền Quản trị viên (Administrator) vào hệ điều hành của người dùng, xin hướng dẫn các bước cài đặt Docker Desktop như sau:

1. **Tải bộ cài đặt:**
   - Truy cập trang chủ chính thức: `https://docs.docker.com/desktop/setup/install/windows-install/`
   - Chọn tải **Docker Desktop for Windows - x86_64**.
2. **Tiến hành cài đặt:**
   - Chạy file `Docker Desktop Installer.exe` với quyền Run as administrator.
   - Tại màn hình tùy chọn, tích chọn **Use WSL 2 instead of Hyper-V** (khuyến nghị cho Windows hiện đại).
   - Nhấn **OK** và chờ hoàn tất, sau đó khởi động lại máy tính (Restart) nếu được yêu cầu.
3. **Khởi động Docker:**
   - Mở ứng dụng Docker Desktop từ Start Menu.
   - Chấp thuận Điều khoản Dịch vụ (Service Agreement).
   - Kiểm tra biểu tượng cá voi Docker ở khay hệ thống hiển thị trạng thái "Docker Desktop is running".
4. **Kích hoạt Supabase Local:**
   - Sau khi Docker chạy, tại thư mục dự án chạy lệnh: `npx supabase start`.

---

## IV. TÌNH TRẠNG KIỂM THỬ SQL & MIGRATIONS

### 1. Danh mục Migration đã khởi tạo
1. [supabase/migrations/20261011000001_foundation_rbac.sql](file:///d:/thanhnx/OpenCode/YMS-project/supabase/migrations/20261011000001_foundation_rbac.sql):
   - 11 bảng RBAC cốt lõi: `roles`, `permissions`, `role_permissions`, `user_roles`, `user_permission_overrides`, `approval_policies`, `approval_requests`, `approval_steps`, `audit_logs`, `system_settings`, `departments`.
   - Ràng buộc Four-Eyes Integrity: `chk_four_eyes_actor` chống tự duyệt chính mình.
2. [supabase/migrations/20261011000002_seed_rbac_v5.sql](file:///d:/thanhnx/OpenCode/YMS-project/supabase/migrations/20261011000002_seed_rbac_v5.sql):
   - 8 vai trò (7 active, 1 inactive), 67 mã quyền danh mục chuẩn, 206 phân quyền vai trò.
   - Thiết lập cấu hình hệ thống & chính sách phê duyệt nghiệp vụ tài chính.
3. [supabase/migrations/20261011000003_rbac_security_functions_rls.sql](file:///d:/thanhnx/OpenCode/YMS-project/supabase/migrations/20261011000003_rbac_security_functions_rls.sql):
   - Hàm bảo mật: `sc_can(permission_code, required_scope)`, `sc_my_permissions()`.
   - Hàm và Trigger bảo vệ Audit Log: `sc_audit_immutable()` chặn UPDATE / DELETE.
   - Bật RLS và thiết lập chính sách Deny-by-default trên toàn bộ 11 bảng RBAC.

### 2. Kết quả kiểm chứng tĩnh đối chiếu Workbook V5 & Mutation Tests
Bộ script đối chiếu trích xuất trực tiếp từ [ProjectContext/02_RBAC_V5/PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx](file:///d:/thanhnx/OpenCode/YMS-project/ProjectContext/02_RBAC_V5/PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx):
- **Số bài kiểm tra tự động (`verify_rbac_invariants.js`):** **50 / 50 PASS (0 Fail)** (đã bổ sung assertions kiểm tra toàn diện SC-R2-01 đến SC-R2-08).
- **Script kiểm toán đối chiếu 1-1 (`audit_rbac_exact.py`):** **PASS (Exit code 0)** — so sánh đầy đủ cả 4 thành phần: `(role_code, permission_code, scope, is_enabled)`.
- **Bộ kiểm thử đột biến tự động (`test_audit_mutation.py`):** **4 / 4 PASS** (chứng minh script phát hiện chính xác lỗi `is_enabled`, `scope`, `is_active` với exit code != 0).
- **Trạng thái kích hoạt quyền:**
  * 60 quyền V1 / CORE: **ĐÃ KÍCH HOẠT (`is_active = TRUE`)**, phục vụ vận hành đầy đủ các vai trò.
  * 7 quyền GĐ sau / mở rộng (`TICKET_AUTOPRINT`, `YARD_SLOT_MANAGEMENT`, `CHARGE_DISCOUNT`, `REFUNDS`, `E_INVOICE`): **VÔ HIỆU HÓA (`is_active = FALSE`)**, không tự ý bật ngoài V1.
- **Chi tiết phân quyền 8 vai trò đối chiếu chính xác 100%:**
  1. `SEC_STAFF` (Nhân viên An ninh): 26 grants.
  2. `SEC_LEAD` (Trưởng bộ phận An ninh): 31 grants.
  3. `PORT_STAFF` (Nhân viên CCKB): 31 grants.
  4. `PORT_LEAD` (Trưởng bộ phận CCKB): 38 grants.
  5. `DIS_STAFF` (Nhân viên Điều phối): 9 grants.
  6. `DIS_LEAD` (Trưởng bộ phận Điều phối): 11 grants.
  7. `SYS_ADMIN` (Quản trị hệ thống): 60 grants.
  8. `ACCOUNTING_FUTURE` (Kế toán dự phòng): 0 grants (`is_active = FALSE`).
- **Tổng số grants:** 206 grants khớp 100% từng dòng, từng scope, từng trạng thái enabled giữa file SQL và Excel V5.

### 3. Kết quả khắc phục bảo mật Vòng 2 & Vòng 3 (SC-R2-01 .. SC-R2-08, SC-R3-01 .. SC-R3-06)
1. **SC-R2-01 (Thu hồi quyền ghi Audit tùy tiện):** Thu hồi toàn bộ quyền EXECUTE trên `sc_log_audit_event()` khỏi `authenticated` và `PUBLIC`. Quyền chỉ cấp cho `service_role` và các triggers nội bộ. Client không thể tự chèn log.
2. **SC-R2-02 (Phê duyệt Fail-Closed với chính sách một bước):** `sc_approve_request()` và `sc_reject_request()` từ chối ngay lập tức khi `approve_permission_code IS NULL`. Không tự ý gán thêm quyền duyệt mới vào workbook.
3. **SC-R2-03 (Bổ sung Scope Context khi tạo và duyệt):** `sc_approve_request()` và `sc_create_approval_request()` truyền đầy đủ `yard_id` và `department_code` vào `sc_can()`, chấm dứt việc nhân viên/trưởng bộ phận có scope `YARD`/`DEPARTMENT` bị từ chối oan.
4. **SC-R2-04 (Sửa unqualified binding RLS):** Thay thế `ap.policy_code = policy_code` bằng liên kết tường minh `ap.policy_code = app_approval_requests.policy_code`. Bổ sung RPC an toàn `sc_create_approval_request()`.
5. **SC-R2-05 (Đối chiếu đầy đủ is_enabled & Mutation Test):** Bổ sung so sánh `is_enabled` vào `audit_rbac_exact.py` và hoàn thiện `test_audit_mutation.py` đạt 4/4 PASS.
6. **SC-R2-06 (PostgreSQL Test Suite độc lập):** Tạo fixture users trong `auth.users`, bọc trong transaction `BEGIN ... ROLLBACK`, kiểm tra cả ALLOW và DENY, loại bỏ false-positive `WHEN OTHERS`.
7. **SC-R2-07 (Bổ sung bãi và bộ phận vào Approval):** Bảng `app_approval_requests` đã có thêm `yard_id` và `department_code`.
8. **SC-R2-08 (RLS đọc approval cho Trưởng bộ phận & Types):** Trưởng bộ phận được đọc pending requests đúng bãi và bộ phận của mình; TypeScript types cập nhật đầy đủ RPCs `sc_create_approval_request`, `sc_approve_request`, `sc_reject_request`.
9. **SC-R3-01 (Loại bỏ cột `code` không tồn tại trong `app_yards`):** Sửa toàn bộ câu lệnh INSERT fixtures trong `supabase/tests/rbac_verification.sql` về đúng schema migration 001 (`id, name, is_active`).
10. **SC-R3-02 (Loại bỏ `RAISE NOTICE` ngoài PL/pgSQL block):** Đưa toàn bộ thông báo kết quả kiểm thử vào bên trong khối `DO $$ BEGIN ... END $$;` trước khi `ROLLBACK;`, đảm bảo cú pháp SQL tương thích 100% với `psql` và Supabase CLI.
11. **SC-R3-03 (Kiểm thử thực chất từ chối duyệt tác vụ một bước AP06):** Giả lập phiên `authenticated` thực tế thông qua helper JWT session GUC; bắt đúng mã lỗi `P0001` và xác minh trạng thái request giữ nguyên `PENDING`, không bị cập nhật sai lệch.
12. **SC-R3-04 (Ma trận kiểm thử 4 Scopes thực chất):** Xây dựng ma trận kiểm thử đầy đủ 4 Scopes (`ALL`, `YARD`, `DEPARTMENT`, `SELF`) với phiên `authenticated`, kiểm tra toàn diện các ca ALLOW và DENY (hết hạn, vai trò inactive, không có quyền).
13. **SC-R3-05 (Khóa luồng duyệt generic khi thiếu Domain Schema):** Hàm `sc_create_approval_request()` thực thi nguyên tắc fail-closed, chặn mọi client gửi payload tự do trước khi có schema domain và trigger nghiệp vụ tương ứng ở Phase 1C.
14. **SC-R3-06 (Chuẩn hóa AP10 và seed đủ AP11, AP12):** Khôi phục `enforce_distinct_actor = TRUE` cho AP10 ("Bảng giá thay đổi" - 2 bước độc lập); bổ sung seed AP11 (`is_enabled = FALSE`, GĐ sau) và AP12 (`is_enabled = TRUE`, V1) khớp 100% tab 23 của Workbook V5.

### 4. Tình trạng thực thi trên Database Engine thật (Phân định Local vs Cloud DEV)

- **Môi trường Supabase Local PostgreSQL 17 (Docker/pgTAP):**
  - Đã chạy kiểm thử tự động toàn diện bằng pgTAP: `npx supabase test db --local`.
  - Kết quả: **49 / 49 TESTS SUCCESSFUL (PASS, EXIT CODE 0)**.
  - Đã khắc phục triệt để kiểm toán Vòng 5:
    * SC-R5-01: Capture ID từ identity column, trigger `sc_audit_immutable` chặn sửa/xóa audit log 100%.
    * SC-R5-02: Kiểm thử RLS row-level visibility dưới database role `authenticated` thật (SEC_STAFF ẩn hết; SEC_LEAD thấy AN_NINH; PORT_LEAD thấy CCKB; SYS_ADMIN thấy hết; NONE thấy 0).
    * SC-R5-03: `throws_ok()` riêng biệt kiểm tra mã lỗi `P0001` cho AP06 và Four-Eyes Violation; request giữ nguyên `PENDING`.
    * SC-R5-04: Giữ nguyên hàm chuẩn Supabase Auth, không override.

- **Môi trường Supabase Cloud Free DEV (`son-cang-yms-dev`, Ref: `euswzyespwaxyrjkfkrq`):**
  - **Triển khai Migrations:** Áp dụng thành công trọn vẹn 3 migrations 001–003 qua `npx supabase db push --linked`.
  - **Đối chiếu Dữ liệu RBAC:** 8 roles (7 active, 1 inactive), 67 permissions (60 active, 7 inactive), 206 grants khớp 100% Workbook V5.
  - **Trạng thái RLS:** Toàn bộ 11 bảng RBAC Foundation đã được bật RLS (`rls_enabled = true`).
  - **Bảo mật RPC & Privileges:**
    * `sc_can()` và `sc_my_permissions()` cấp quyền EXECUTE cho `authenticated`.
    * `sc_log_audit_event()` bị thu hồi EXECUTE khỏi `authenticated` (`auth_can_exec_audit_func = false`).
    * Bảng `app_audit_events` không có policy INSERT -> Chặn hoàn toàn việc client tạo audit log giả mạo.
    * Bảng `app_approval_requests` bị thu hồi quyền INSERT trực tiếp -> Chặn hoàn toàn việc tạo hồ sơ APPROVED tùy tiện.
  - **Kết nối Next.js 16 SSR & Smoke Test:**
    * Đọc URL và Publishable Key từ `.env.local` thành công.
    * Client ẩn danh gọi qua REST API bị RLS chặn hoàn toàn (trả về 0 bản ghi, đúng nguyên tắc Deny-by-default).
    * `pnpm exec tsc --noEmit` đạt 0 lỗi, ESLint PASS, Next.js build PASS 100% (Turbopack, Next.js 16.4.0).
  - **Kết luận:** Supabase Cloud DEV đã sẵn sàng 100% để thay thế Docker Local làm Backend phát triển thường xuyên nhằm tiết kiệm RAM trên máy host Windows.

---

## V. RÀ SOÁT MÃ NGUỒN, GIT & BẢO MẬT

1. **Git Repository:** Local git repo sạch; `.gitignore` bảo vệ chặt chẽ `.env*.local`.
2. **Cấu hình .env.local:** Đã cấu hình trỏ tới Cloud DEV với Publishable Key mới (`sb_publishable_...`), đã bỏ dòng `NODE_ENV=development`.
3. **Cấu hình .env.example:** Cập nhật hướng dẫn biến mới.
4. **TypeScript Database Types:** [src/types/database.types.ts](file:///d:/thanhnx/OpenCode/YMS-project/src/types/database.types.ts) và [src/types/rbac.types.ts](file:///d:/thanhnx/OpenCode/YMS-project/src/types/rbac.types.ts) đồng bộ 100% với schema Cloud DEV.

---

## VI. KẾT LUẬN & TRẠNG THÁI HIỆN TẠI

1. **Về Mã nguồn (SQL, Scripts, Types, Next.js SSR):** **HOÀN TẤT 100%**.
2. **Kiểm tra tĩnh (Static Invariants & Mutation Tests):** **52/52 PASS**, 4/4 Mutation PASS.
3. **Nghiệm thu Runtime:**
   - **Local pgTAP:** 49/49 PASS.
   - **Cloud DEV (`euswzyespwaxyrjkfkrq`):** Migrations 001-003 APPLIED thành công, 8 roles / 67 perms / 206 grants / 11 bảng RLS / RPC security invariants xác nhận đạt 100%.
4. **Tiến độ dự án:** Hoàn tất chuyển đổi môi trường sang Supabase Cloud DEV. **TIẾP TỤC TẠM DỪNG PHASE 1C** (Domain Schema vẫn ở mức tài liệu thiết kế kiến trúc [DOMAIN_SCHEMA_DESIGN_V5.md](file:///d:/thanhnx/OpenCode/YMS-project/ProjectContext/06_Kien_truc_va_kiem_thu/DOMAIN_SCHEMA_DESIGN_V5.md), chưa tạo migration 004) chờ người dùng phê duyệt bước tiếp theo.


