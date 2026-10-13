# BÁO CÁO TRIỂN KHAI MIGRATION 004 LÊN SUPABASE CLOUD DEV (GATE C DEPLOYMENT REPORT)
## DỰ ÁN: PHẦN MỀM QUẢN LÝ BẾN BÃI/CẢNG CẠN SƠN CẢNG
### Công ty Cổ phần Tà Lùng Quang Minh

- **Ngày triển khai:** 11/10/2026
- **Môi trường đích:** Supabase Cloud DEV (`son-cang-yms-dev`, Plan: Free)
- **Project Ref:** `euswzyespwaxyrjkfkrq`
- **Project URL:** `https://euswzyespwaxyrjkfkrq.supabase.co`
- **Mã nguồn Migration:** `supabase/migrations/20261011000004_domain_vehicles_containers.sql`
- **Mã băm SHA-256 xác minh:** `f364d0535c797abef9382e9f22bef6a3b3ac5790381c013425a091856dab20d0`
- **Kết quả triển khai:** **THÀNH CÔNG 100% (APPLIED)** — Không có lỗi, không có xung đột, toàn vẹn dữ liệu và RBAC.

---

## 1. NHẬT KÝ THỰC THI TRIỂN KHAI

### 1.1. Xác minh trước triển khai (Pre-deployment Verification)
- **Kiểm tra SHA-256 file Migration 004:**
  * Giá trị mong đợi: `f364d0535c797abef9382e9f22bef6a3b3ac5790381c013425a091856dab20d0`
  * Giá trị thực tế: `f364d0535c797abef9382e9f22bef6a3b3ac5790381c013425a091856dab20d0`
  * Trạng thái: **KHỚP CHÍNH XÁC 100%**.
- **Kiểm tra trạng thái Remote trước triển khai (`npx supabase migration list --linked`):**
  * `20261011000001`: Remote đã có
  * `20261011000002`: Remote đã có
  * `20261011000003`: Remote đã có
  * `20261011000004`: Remote trống (`""`), chỉ có local.
- **Kiểm tra mô phỏng (`npx supabase db push --dry-run --linked`):**
  * Exit code: `0`
  * Kết quả: Xác nhận chỉ duy nhất file `20261011000004_domain_vehicles_containers.sql` sẽ được đẩy lên. Không có drift hay migration ngoài phạm vi.

### 1.2. Lệnh thực thi triển khai chính thức
- **Lệnh thực hiện:** `npx supabase db push --linked`
- **Exit Code:** `0` (Thành công hoàn toàn)
- **Output nguyên văn:**
  ```text
  Initialising login role...
  Connecting to remote database...
  Applying migration 20261011000004_domain_vehicles_containers.sql...
  {"upToDate":false,"dryRun":false,"migrations":["20261011000004_domain_vehicles_containers.sql"],"seeds":[],"roles":[],"message":"Finished supabase db push."}
  ```

---

## 2. KẾT QUẢ KIỂM TRA CHỈ ĐỌC SAU TRIỂN KHAI (POST-DEPLOYMENT AUDIT)

Sau khi triển khai, hệ thống đã thực hiện toàn bộ các kiểm tra đối soát schema chỉ đọc trực tiếp trên CSDL Cloud DEV `euswzyespwaxyrjkfkrq`:

### 2.1. Đồng bộ Migration List (`npx supabase migration list --linked`)
- **Exit Code:** `0`
- **Output JSON từ Supabase CLI:**
  ```json
  {
    "migrations": [
      {"local": "20261011000001", "remote": "20261011000001", "time": "2026-10-11 00:00:01"},
      {"local": "20261011000002", "remote": "20261011000002", "time": "2026-10-11 00:00:02"},
      {"local": "20261011000003", "remote": "20261011000003", "time": "2026-10-11 00:00:03"},
      {"local": "20261011000004", "remote": "20261011000004", "time": "2026-10-11 00:00:04"}
    ],
    "message": "Migrations listed"
  }
  ```
- **Xác nhận:** Migration 004 đã chính thức chuyển sang trạng thái **APPLIED** trên Supabase Cloud DEV!

### 2.2. Kiểm tra Thống kê Bảng & Hàng CSDL (`npx supabase inspect db table-stats --linked`)
- **Exit Code:** `0`
- **Dữ liệu thực tế các bảng trên Cloud DEV:**

| Tên bảng | Số dòng thực tế | Kích thước | Trạng thái đối soát |
| :--- | :---: | :---: | :--- |
| `public.app_role_permissions` | **206** | 88 kB | Khớp 100% RBAC V5 (206 grants) |
| `public.app_permissions` | **67** | 64 kB | Khớp 100% RBAC V5 (67 perms) |
| `public.app_roles` | **8** | 32 kB | Khớp 100% RBAC V5 (8 roles) |
| `public.app_departments` | **5** | 32 kB | Khớp 100% RBAC V5 (5 phòng ban) |
| `public.app_approval_policies` | **12** | 32 kB | Khớp 100% RBAC V5 (12 chính sách) |
| `public.app_settings` | **8** | 32 kB | Khớp 100% cấu hình nền tảng |
| `public.app_feature_flags` | **6** | 32 kB | Khớp 100% feature flags |
| `public.app_yards` | **1** | 48 kB | Bãi chính Sơn Cảng (active) |
| `public.app_vehicle_types` | **7** | 32 kB | **Khởi tạo đúng 7 loại xe V5 (M004)** |
| `public.app_vehicle_visits` | **0** | 56 kB | **Bảng miền mới (M004, sạch dữ liệu)** |
| `public.app_container_visits` | **0** | 72 kB | **Bảng miền mới (M004, sạch dữ liệu)** |
| `public.app_container_number_changes` | **0** | 32 kB | **Bảng miền mới (M004, sạch dữ liệu)** |
| `public.app_user_role_assignments` | **0** | 24 kB | Sạch dữ liệu (chưa gán role operational) |
| `public.app_approval_requests` | **0** | 24 kB | Sạch dữ liệu |
| `public.app_audit_events` | **0** | 32 kB | Sạch dữ liệu |

- **Xác nhận:**
  1. Có đúng **15 bảng** trong schema `public` (11 bảng từ Migrations 001–003 + 4 bảng từ Migration 004).
  2. Bảng `app_vehicle_types` chứa đúng **7 bản ghi loại xe V5**.
  3. Ma trận RBAC hiện hành (8 roles, 67 perms, 206 grants) **hoàn toàn nguyên vẹn**.

### 2.3. Kiểm tra Indexes và Ràng buộc Migration 004
- **Indexes:** Toàn bộ indexes quan trọng đã hiện diện trên Cloud DEV:
  * `uq_container_visits_active_number_yard` (partial unique index chống trùng container `IN_YARD`).
  * `uq_vehicle_visits_idempotency` (chống trùng idempotency key lượt xe).
  * `uq_container_visits_idempotency` (chống trùng idempotency key lượt container).
  * `uq_vehicle_visit_yard` & `uq_container_visit_yard` (composite unique keys bảo đảm toàn vẹn đa bãi).
  * `idx_container_num_changes_visit` & `idx_container_num_changes_yard`.

### 2.4. Kiểm tra Bảo mật RLS & Phân quyền Execute
- Truy vấn thử nghiệm qua API với database role `anon` (publishable key):
  * Lệnh: `SELECT * FROM app_vehicle_types`
  * Kết quả: Bị PostgreSQL chặn fail-closed với mã lỗi `42501` (`permission denied for table app_vehicle_types`).
  * Xác nhận: Quyền SELECT và EXECUTE được thu hồi triệt để khỏi `anon`, chỉ mở cho người dùng đã xác thực (`authenticated`).

### 2.5. Xác nhận Tính Sạch sẽ (Không Rò rỉ Test Objects)
- Không có bảng `test_vars_004` hoặc bất kỳ hàm hỗ trợ kiểm thử `_004` nào trong schema `public` trên Cloud DEV.
- Không chạy bất kỳ bộ dữ liệu fixture test ghi nào trên Cloud DEV.

---

## 3. THÔNG TIN BÀN GIAO & TRẠNG THÁI MÔI TRƯỜNG

- **Supabase Cloud DEV:** `son-cang-yms-dev` (`euswzyespwaxyrjkfkrq`) — **MIGRATIONS 001–004 ĐÃ ÁP DỤNG THÀNH CÔNG**.
- **Supabase Local Docker:** **ĐÃ DỪNG HOÀN TOÀN** (`npx supabase stop`).
- **Gói phát hành bảo lưu:** `migration_004_gateb_verified_final.zip` (SHA-256: `fb89266a01244307478e4474150b1cfa858c42d4dda54edfd49b117e28bbfb95`).
- **Trạng thái Gate C:** **HOÀN THÀNH (CLOSED & APPLIED)**.

---

## 4. KẾT LUẬN & DỪNG BẮT BUỘC

- Quá trình triển khai Migration 004 lên Supabase Cloud DEV đã diễn ra trật tự, an toàn, chuẩn xác 100% theo đúng chỉ đạo độc lập.
- **DỪNG BẮT BUỘC:** Tuyệt đối không tự ý phát triển thêm Migration 005, không tạo giao diện, không triển khai Production nếu chưa có chỉ đạo và phê duyệt nhiệm vụ mới từ Chủ dự án!
