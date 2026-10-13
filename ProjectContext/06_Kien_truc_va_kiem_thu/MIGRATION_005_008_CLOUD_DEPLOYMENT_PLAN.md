# PHƯƠNG ÁN TRIỂN KHAI CÓ KIỂM SOÁT MIGRATION 005–008 LÊN SUPABASE CLOUD DEV
**Dự án:** Quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Mục tiêu:** Chuẩn bị sẵn sàng triển khai Migrations 005–008 lên Supabase Cloud DEV sau khi đã vượt qua 100% kiểm thử Local Gate và Preflight Check.  
**Ranh giới an toàn:** **DỪNG CHỜ PHÊ DUYỆT RIÊNG CỦA CHỦ DỰ ÁN. TUYỆT ĐỐI KHÔNG TỰ Ý THỰC HIỆN KHI CHƯA CÓ LỆNH.**

---

## I. XÁC NHẬN MÔI TRƯỜNG VÀ DỰ ÁN MỤC TIÊU

- **Tên dự án:** `son-cang-yms-dev`
- **Project Ref:** `euswzyespwaxyrjkfkrq`
- **Region:** `ap-southeast-1`
- **Supabase URL:** `https://euswzyespwaxyrjkfkrq.supabase.co`
- **Tình trạng hiện tại:** Active & Healthy, đang chạy sạch sẽ ở mức Migrations 001–004 (Gate C).
- **Tài khoản UAT:** 7 tài khoản nghiệp vụ đang tồn tại trên `auth.users` và đã được phân quyền RBAC/RLS đầy đủ.
- **Ranh giới:** Tuyệt đối cấm thao tác trên Production hoặc bất kỳ Project Ref nào khác.

---

## II. KẾ HOẠCH SAO LƯU VÀ PHỤC HỒI (BACKUP & RESTORE PLAN)

### 1. Kế hoạch Sao lưu Trước Khi Triển Khai (Đã Thực Hiện Thành Công)
Cú pháp Supabase CLI đã được đối chiếu thực tế qua `npx supabase db dump --help`:
- Lệnh xuất DDL Schema: `npx supabase db dump --linked -f <file>`
- Lệnh xuất Dữ liệu (Data): `npx supabase db dump --linked --data-only -f <file>` (cờ chính xác là `--data-only`, không phải `--data`).

**Bằng chứng file sao lưu thực tế đã tạo tại thư mục `supabase/backups/`:**
1. **Schema DDL:** `supabase/backups/backup_cloud_dev_pre_005_schema.sql` (Kích thước: 94,000 bytes).
2. **Dữ liệu thực tế:** `supabase/backups/backup_cloud_dev_pre_005_data.sql` (Kích thước: 53,121 bytes).

### 2. Giới Hạn Kỹ Thuật Quan Trọng của Bản Sao Lưu CLI
1. **Phạm vi dữ liệu:** Supabase CLI `db dump` chỉ trích xuất các bảng thuộc schema `public` và custom schema của ứng dụng.
2. **Không sao lưu auth & storage:** CLI `db dump` **KHÔNG** sao lưu `auth.users`, `auth.identities`, bảng phiên đăng nhập hoặc dữ liệu tệp trong `storage.objects` (do Supabase quản lý độc lập).
3. **Không giả định snapshot tự động:** Dự án Cloud DEV chạy trên gói Free Tier của Supabase, **KHÔNG có tính năng sao lưu PITR (Point-in-Time Recovery) tự động**. Do đó, bản sao lưu SQL cục bộ là chốt chặn khôi phục duy nhất.

### 3. Quy Trình Phục Hồi Khi Có Sự Cố (Rollback Procedure)
- **Cơ chế Fail-Fast:** Supabase CLI thực thi mỗi file migration trong một transaction riêng biệt. Nếu có lỗi SQL ở file nào, file đó sẽ rollback hoàn toàn và quá trình dừng lại ngay.
- **Trường hợp cần khôi phục dữ liệu hoặc hoàn tác DDL:**
  Sử dụng công cụ `psql` với chuỗi kết nối trực tiếp Cloud DEV (`SUPABASE_DB_URL`):
  ```bash
  # Phục hồi DDL schema về mốc trước 005 nếu cần:
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/backups/backup_cloud_dev_pre_005_schema.sql

  # Phục hồi dữ liệu về trạng thái sạch ban đầu:
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f supabase/backups/backup_cloud_dev_pre_005_data.sql
  ```
- **Ranh giới cấm tuyệt đối:**
  - **TUYỆT ĐỐI CẤM** dùng lệnh `npx supabase db reset` trên Cloud DEV: Lệnh này sẽ xóa toàn bộ database và làm mất toàn bộ 7 tài khoản UAT đã tạo trong `auth.users`.
  - **TUYỆT ĐỐI CẤM** dùng lệnh `npx supabase migration repair` trừ khi có văn bản chỉ đạo và phê duyệt phương án chi tiết từ Chủ dự án.

---

## III. DANH MỤC 4 MIGRATIONS ĐƯỢC PHÉP TRIỂN KHAI

Chỉ triển khai duy nhất 4 tệp migration từ 005 đến 008 đã vượt qua 181/181 kiểm thử Local Gate:

| STT | Tên tệp Migration | Mục đích nghiệp vụ chính | Số lượng pgTAP Test |
|---|---|---|---|
| 1 | `20261012000005_gate_ticket_atomic_guard.sql` | Guard vé xe đầu kéo 250k, RPC nguyên tử `sc_create_vehicle_and_container_visit_atomic`, bảng `app_yard_billing_settings` | 15/15 PASS |
| 2 | `20261012000006_domain_reefer_power.sql` | Quản lý phiên cắm/rút điện cont lạnh `app_reefer_power_sessions`, liên kết `app_charges` | 13/13 PASS |
| 3 | `20261012000007_domain_financial_ledger.sql` | Sổ cái tài chính bất biến `app_tariffs`, `app_charges`, `app_payments`, trigger tự động đồng bộ vé | 10/10 PASS |
| 4 | `20261012000008_domain_exit_clearance.sql` | Quy trình xuất bãi 2 lớp: CCKB clearance, An ninh xuất vật lý, RPC xe riêng rời bãi `sc_confirm_vehicle_only_exit` | 19/19 PASS |

*Tổng cộng: 57 pgTAP tests chuyên biệt 005–008 (nằm trong tổng số 181 pgTAP tests toàn hệ thống).*

---

## IV. LỆNH THỰC THI CHÍNH THỨC (CHỈ CHẠY KHI ĐƯỢC CHỦ DỰ ÁN PHÊ DUYỆT BƯỚC 1)

### Bước 1: Kiểm tra khô (Dry-Run) lần cuối
Cú pháp thực tế với dự án đã liên kết (`--linked`):
```bash
npx supabase db push --linked --dry-run
```
*Yêu cầu:* Kết quả hiển thị đúng 4 migrations 005, 006, 007, 008 sẵn sàng áp dụng, không có thông báo schema drift ngoài ý muốn.

### Bước 2: Đẩy migration lên Cloud DEV
```bash
npx supabase db push --linked
```
*Yêu cầu:* Áp dụng thành công tuần tự 005 -> 006 -> 007 -> 008 mà không có bất kỳ lỗi nào.

---

## V. QUY TRÌNH HẬU TRIỂN KHAI (CHỈ THỰC HIỆN KHI BƯỚC IV HOÀN TẤT)

1. **Xác nhận 5 bảng mới đã có RLS và REVOKE anon trên Cloud DEV:**
   - `app_yard_billing_settings`
   - `app_reefer_power_sessions`
   - `app_tariffs`
   - `app_charges`
   - `app_payments`
2. **Xác nhận 7 tài khoản UAT đăng nhập và giữ nguyên quyền:**
   - Chạy script kiểm tra `sc_my_permissions()` xác nhận 7/7 tài khoản tiếp tục PASS.
3. **Xin phê duyệt Bước 2 từ Chủ dự án để bật Real Write trên Frontend:**
   - Chỉ sau khi Chủ dự án phê duyệt văn bản Bước 2, cấu hình biến môi trường:
     `NEXT_PUBLIC_ENABLE_REAL_WRITE="true"`
   - Rebuild và khởi động lại Next.js PWA:
     ```bash
     pnpm build
     pnpm start
     ```
   - Xác nhận banner trên UI tự động chuyển sang: `SUPABASE REAL — Đang kết nối Supabase Cloud DEV (Ghi thực tế)`.

---

## VI. TRẠNG THÁI HIỆN TẠI & RANH GIỚI AN TOÀN

- [x] Đã đối chiếu cú pháp CLI thực tế (`--linked`, `--data-only`, `--dry-run`).
- [x] Đã sao lưu thực tế schema và data của Cloud DEV vào `supabase/backups/`.
- [x] Đã xác định rõ giới hạn sao lưu (không bao gồm auth/storage, không có PITR free tier).
- [x] Đã quy định quy trình khôi phục bằng `psql` và cấm tuyệt đối `db reset` / `migration repair`.
- [x] PWA Frontend đã sẵn sàng với feature flag bảo vệ và hỗ trợ đầy đủ thu phí lưu bãi tại cổng.
- [ ] **ĐANG DỪNG CHỜ PHÊ DUYỆT RIÊNG BƯỚC 1 CỦA CHỦ DỰ ÁN ĐỂ CHẠY LỆNH PUSH.**
- [ ] **ĐANG DỪNG CHỜ PHÊ DUYỆT RIÊNG BƯỚC 2 CỦA CHỦ DỰ ÁN ĐỂ BẬT REAL WRITE.**
