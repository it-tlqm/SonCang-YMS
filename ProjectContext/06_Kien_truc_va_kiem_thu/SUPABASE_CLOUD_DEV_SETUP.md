# HƯỚNG DẪN KẾT NỐI VÀ LIÊN KẾT SUPABASE CLOUD FREE (DEV)

**Dự án:** Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng (Công ty Cổ phần Tà Lùng Quang Minh)  
**Ngày thiết lập:** 11/10/2026  
**Mục tiêu:** Chuyển môi trường Backend phát triển thường xuyên từ Supabase Local Docker sang Supabase Cloud Free nhằm giảm sử dụng RAM trên máy chủ phát triển Windows, trong khi vẫn duy trì chuẩn kiểm thử tự động và an toàn dữ liệu.

---

## 1. Thông tin Dự án Supabase Cloud Free

- **Tên dự án:** `son-cang-yms-dev`
- **Mã tham chiếu (Project Ref):** `euswzyespwaxyrjkfkrq`
- **Project URL:** `https://euswzyespwaxyrjkfkrq.supabase.co`
- **Môi trường:** `DEV` (Phát triển / Thử nghiệm)
- **Tình trạng:** `Healthy`
- **Gói:** `Free`
- *Lưu ý:* Mặc dù bảng điều khiển Supabase hiển thị nhánh `main / Production`, đây là project được khởi tạo riêng cho DEVELOPMENT, tuyệt đối không chứa dữ liệu vận hành sản xuất thực tế.

---

## 2. Trạng thái Mã nguồn & Cấu hình Ứng dụng

### 2.1. Cấu hình Biến môi trường (`.env.local`)
Đã cấu hình tại `d:\thanhnx\OpenCode\YMS-project\.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://euswzyespwaxyrjkfkrq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_HjmQVCIeCxpMIPCCWHBT5w_E01JstPr
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_HjmQVCIeCxpMIPCCWHBT5w_E01JstPr
NODE_ENV=development
```
- File `.env.local` đã được bảo vệ trong `.gitignore` (không commit lên Git).
- Tệp mẫu `.env.example` đã được cập nhật mô tả cú pháp hỗ trợ cả `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 2.2. Khả năng tương thích SSR & Next.js 16
Các client helper trong `src/lib/supabase/` (`client.ts`, `server.ts`, `middleware.ts`) đã được nâng cấp để tự động nhận diện cả hai biến:
```typescript
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
```
- **Kiểm tra TypeScript (`pnpm exec tsc --noEmit`):** PASS (0 lỗi).
- **Kiểm tra Next.js Build (`pnpm build`):** PASS 100% với Turbopack (Next.js 16.4.0).

---

## 3. Các Migrations Sẵn sàng Triển khai lên Cloud DEV

Hiện tại trong thư mục `supabase/migrations/` có chính xác 3 migrations nền tảng đã qua nghiệm thu pgTAP 49/49 PASS ở môi trường Local:
1. `20261011000001_foundation_rbac.sql`: Bảng nền tảng, ENUM, Audit log bất biến, trigger.
2. `20261011000002_seed_rbac_v5.sql`: Dữ liệu phân quyền RBAC V5 (8 roles, 67 permissions, 206 grants).
3. `20261011000003_rbac_security_functions_rls.sql`: Hàm kiểm tra quyền `sc_can()`, RPC phê duyệt AP01–AP12, Row Level Security (RLS).

*Xác nhận an toàn:* **Không có migration 004** trong thư mục migrations. Tài liệu thiết kế Phase 1C-A (`DOMAIN_SCHEMA_DESIGN_V5.md`) vẫn giữ nguyên trạng thái tài liệu thiết kế kiến trúc, chưa triển khai mã SQL.

---

## 4. Các Bước Thao tác Bảo mật trên Terminal Windows Của Bạn

Do Supabase CLI yêu cầu xác thực bằng Personal Access Token và Database Password trong phiên bảo mật (không nhập qua chat để tránh rò rỉ thông tin nhạy cảm), bạn hãy mở terminal Windows (PowerShell) tại thư mục `d:\thanhnx\OpenCode\YMS-project` và thực hiện lần lượt các lệnh sau:

### Bước 1: Đăng nhập Supabase CLI
```powershell
npx supabase login
```
- Trình duyệt sẽ mở trang quản lý Access Token của Supabase (hoặc truy cập: `https://supabase.com/dashboard/account/tokens`).
- Bấm **Generate new token**, đặt tên token (ví dụ: `son-cang-cli`), sau đó dán token vào terminal.

### Bước 2: Liên kết với Project Cloud DEV
```powershell
npx supabase link --project-ref euswzyespwaxyrjkfkrq
```
- CLI sẽ yêu cầu nhập **Database Password** (mật khẩu Postgres bạn đã đặt khi khởi tạo project `son-cang-yms-dev` trên Supabase Cloud).
- Nhập mật khẩu để CLI lưu cấu hình liên kết vào thư mục local.

### Bước 3: Kiểm tra Lịch sử Migration đã liên kết
```powershell
npx supabase migration list --linked
```
- Lệnh này liệt kê các migration đã áp dụng trên Remote và các migration chưa áp dụng (001, 002, 003).

### Bước 4: Kiểm tra Thử nghiệm (Dry-Run)
```powershell
npx supabase db push --dry-run --linked
```
- Lệnh `--dry-run` sẽ mô phỏng việc đẩy migrations mà **tuyệt đối không thay đổi cơ sở dữ liệu**.
- Xác nhận 3 migration (001, 002, 003) sẽ được áp dụng an toàn.

### Bước 5: Báo lại kết quả cho Antigravity
- Sau khi chạy xong lệnh `--dry-run`, bạn gửi phản hồi kết quả đầu ra cho tôi để kiểm tra lại tính an toàn trước khi chạy lệnh áp dụng thật (`npx supabase db push --linked`).

---

## 5. Ranh giới Kỹ thuật và Cam kết An toàn

1. **Tuyệt đối không chạy `db reset` hay `migration repair`** trên cơ sở dữ liệu Cloud.
2. Không ghi nhận hoặc lưu trữ bất kỳ mật khẩu Postgres hay access token nào vào mã nguồn, log hoặc tài liệu văn bản.
3. Không đưa dữ liệu khách hàng, xe hoặc giao dịch thật lên Cloud DEV.

---

## 6. Kết quả Triển khai Thực tế trên Cloud DEV (11/10/2026 19:00)

Sau khi được người dùng phê duyệt áp dụng:
1. **Lệnh thực thi:** `npx supabase db push --linked`
   - Áp dụng thành công trọn vẹn 3 migrations:
     * `20261011000001_foundation_rbac.sql`: **APPLIED**
     * `20261011000002_seed_rbac_v5.sql`: **APPLIED**
     * `20261011000003_rbac_security_functions_rls.sql`: **APPLIED**
   - Kết quả migration list sau push:
     * `20261011000001` -> Remote: `20261011000001`
     * `20261011000002` -> Remote: `20261011000002`
     * `20261011000003` -> Remote: `20261011000003`
2. **Kiểm tra Đối chiếu Dữ liệu RBAC V5 trên Cloud DEV (Chỉ đọc qua SQL API):**
   - **8 Roles:** 7 active, 1 inactive (`ACCOUNTING_FUTURE`) — Khớp 100% Workbook V5.
   - **67 Permissions:** 60 active (V1/CORE), 7 inactive (GĐ sau) — Khớp 100% Workbook V5.
   - **206 Grants:** 206 active grants gán theo 4 scopes — Khớp 100% Workbook V5.
   - **11 Bảng RBAC Foundation:** Đầy đủ 11 bảng, 100% đã được BẬT RLS (`rls_enabled = true`).
3. **Kiểm tra Bảo mật RLS & RPC Invariants trên Cloud DEV:**
   - RPC `sc_can()` và `sc_my_permissions()` có cờ SECURITY DEFINER và quyền EXECUTE cấp cho `authenticated`.
   - RPC `sc_log_audit_event()` đã bị **REVOKE EXECUTE** khỏi `authenticated` (`auth_can_exec_audit_func = false`).
   - Bảng `app_audit_events` chỉ có RLS SELECT policy `p_audit_select`, **không có policy INSERT** -> Ngăn chặn 100% việc tạo audit log giả từ client hoặc browser.
   - Bảng `app_approval_requests` đã bị **REVOKE INSERT** khỏi `authenticated` (`auth_can_insert_approval = false`), ngăn chặn tự ý tạo hồ sơ APPROVED.
4. **Kiểm tra Kết nối Next.js 16 SSR & Smoke Test:**
   - `.env.local` đã cấu hình URL và Publishable Key, bỏ dòng `NODE_ENV=development`.
   - Script `scripts/test_cloud_connection.mjs`: Gọi thành công tới Supabase Auth (GoTrue) và PostgREST; kiểm tra RLS đối với client ẩn danh trả về 0 bản ghi (Deny by default).
   - TypeScript `tsc --noEmit`: PASS (0 lỗi).
   - ESLint: PASS (0 cảnh báo, 0 lỗi).
   - Next.js Production Build (`pnpm build`): PASS 100% (Turbopack, Next.js 16.4.0).
5. **Kết luận:** Môi trường Supabase Cloud Free DEV (`son-cang-yms-dev`, ref: `euswzyespwaxyrjkfkrq`) **ĐÃ ĐỦ ĐIỀU KIỆN 100%** để sử dụng làm Backend phát triển thường xuyên cho dự án Sơn Cảng.

