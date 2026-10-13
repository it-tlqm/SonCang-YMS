# SON CẢNG — BÁO CÁO KIỂM TRA TOÀN DIỆN TRƯỚC TRIỂN KHAI CLOUD DEV
# (SONCANG CLOUD DEV RELEASE CHECKLIST)

**Dự án:** Quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Môi trường đích:** Supabase Cloud DEV (`son-cang-yms-dev`, ref: `euswzyespwaxyrjkfkrq`, URL: `https://euswzyespwaxyrjkfkrq.supabase.co`)  
**Ngày thực hiện:** 12/10/2026  
**Trạng thái tổng thể:** **HOÀN TOÀN SẴN SÀNG (READY) — ĐANG DỪNG CHỜ PHÊ DUYỆT RIÊNG 2 BƯỚC CỦA CHỦ DỰ ÁN**

---

## 1. BẢNG TỔNG HỢP KIỂM TRA TIỀN TRIỂN KHAI (PRE-DEPLOYMENT CHECKLIST)

| STT | Hạng mục kiểm tra | Trạng thái | Minh chứng thực tế |
|---|---|---|---|
| 1 | Xác minh cú pháp Supabase CLI thực tế (`--help`) | **PASS** | Đã kiểm tra `db push --help` và `db dump --help`. Sử dụng đúng cờ `--linked`, `--dry-run`, `--data-only` (không phải `--data`). |
| 2 | Trích xuất Backup DDL Schema và Data từ Cloud DEV | **PASS** | File `backup_cloud_dev_pre_005_schema.sql` (94,000 bytes) và `backup_cloud_dev_pre_005_data.sql` (53,121 bytes) tại `supabase/backups/`. |
| 3 | Xác định rõ giới hạn sao lưu & quy trình khôi phục | **PASS** | Ghi rõ CLI không dump auth/storage, không có PITR free tier; quy trình khôi phục bằng `psql`, cấm tuyệt đối `db reset` và `migration repair`. |
| 4 | Cập nhật Deployment Plan theo chuẩn CLI | **PASS** | Đã ghi nhận trong `MIGRATION_005_008_CLOUD_DEPLOYMENT_PLAN.md`. |
| 5 | Hoàn thiện luồng Thu phí lưu bãi tại cổng trên PWA | **PASS** | Gỡ bỏ hardcode `p_paid_at_gate: false`. Hỗ trợ chọn thu tại cổng (`CASH`/`BANK_TRANSFER`, mã biên nhận). Chặn xuất bãi khi có phí chưa thu mà không có nợ AP06. |
| 6 | Kiểm thử thuật toán phí lưu bãi 22:00-06:00 V5 | **PASS** | 5/5 test case kiểm thử múi giờ VN (UTC+7), mốc đêm 22:00-06:00 và miễn phí đêm đầu đạt 100% PASS (`scripts/test_storage_fee_calc.mjs`). |
| 7 | Cập nhật Banner môi trường động theo Feature Flag | **PASS** | `src/components/layout/app-shell.tsx` phản ánh chính xác trạng thái `NEXT_PUBLIC_ENABLE_REAL_WRITE` (`Cloud DEV (Chỉ đọc)` khi false; `Cloud DEV (Ghi thực tế)` khi true). |
| 8 | Kiểm thử 3 Role đại diện trên Client / HTTP thật | **PASS** | `SEC_STAFF`, `PORT_LEAD`, `DIS_STAFF` đăng nhập Supabase Auth thật, kiểm tra RPC `sc_my_permissions`, gọi 6 HTTP routes Next.js (HTTP 200) và logout thành công (`scripts/test_browser_roles.mjs`). |
| 9 | Kiểm thử toàn bộ 7 tài khoản UAT | **PASS** | 7/7 tài khoản đăng nhập Cloud DEV thật thành công và đối soát khớp 100% phân quyền màn hình theo Action Permissions V5 (`scripts/verify_uat_screens.mjs`). |
| 10 | Kiểm thử Smoke Test RPC tiếp nhận xe nguyên tử | **PASS** | `scripts/smoke_test_atomic_entry.mjs` chạy với `psql -v ON_ERROR_STOP=1` và assert dữ liệu thực tế đạt 100% PASS. |
| 11 | Kiểm tra mã nguồn (Typecheck, Lint, Build) | **PASS** | `pnpm exec tsc --noEmit` PASS (0 lỗi), `pnpm lint` PASS (0 lỗi), `pnpm build` PASS (12/12 static pages). |
| 12 | Bảo mật Credentials UAT | **PASS** | File mật khẩu giữ nguyên an toàn tại `C:\Users\private\.soncang\uat_credentials.json`, hoàn toàn nằm ngoài Git repo và gói zip. |
| 13 | Ranh giới an toàn (Safety Gates) | **PASS** | **CHƯA push Migrations 005–008 lên Cloud DEV. CHƯA bật `NEXT_PUBLIC_ENABLE_REAL_WRITE`. ĐANG DỪNG CHỜ PHÊ DUYỆT.** |

---

## 2. KẾT QUẢ KIỂM THỬ CHI TIẾT 3 ROLE ĐẠI DIỆN TRÊN CLIENT THẬT

Kịch bản chạy thực tế qua script `scripts/test_browser_roles.mjs`:
- **Server:** Next.js Production Build chạy tại `http://localhost:3000` (HTTP 200 OK).
- **Backend Auth:** Supabase Cloud DEV URL `https://euswzyespwaxyrjkfkrq.supabase.co`.

```
================================================================
BẢNG TỔNG HỢP KIỂM THỬ 3 ROLE ĐẠI DIỆN TRÊN CLIENT THẬT
================================================================
┌─────────┬─────────────┬─────────────────────────────┬────────┬────────────┬────────┬────────┬────────┐
│ (index) │ role        │ email                       │ login  │ totalPerms │ rbac   │ http   │ logout │
├─────────┼─────────────┼─────────────────────────────┼────────┼────────────┼────────┼────────┼────────┤
│ 0       │ 'SEC_STAFF' │ 'sec_staff_uat@example.com' │ 'PASS' │ 26         │ 'PASS' │ 'PASS' │ 'PASS' │
│ 1       │ 'PORT_LEAD' │ 'cckb_lead_uat@example.com' │ 'PASS' │ 38         │ 'PASS' │ 'PASS' │ 'PASS' │
│ 2       │ 'DIS_STAFF' │ 'dis_staff_uat@example.com' │ 'PASS' │ 9          │ 'PASS' │ 'PASS' │ 'PASS' │
└─────────┴───────────────────────────────────────────┴────────┴────────────┴────────┴────────┴────────┘
```

### Chi tiết phân quyền kiểm tra từng role:
1. **`SEC_STAFF` (Nhân viên An ninh Cổng UAT):**
   - `storage.payment.collect` (Thu phí lưu bãi tại cổng): **TRUE** (Khớp yêu cầu)
   - `exit.actual.confirm` (An ninh xác nhận xe/cont rời bãi): **TRUE** (Khớp yêu cầu)
   - `ticket.payment.collect` (Thu tiền vé vào cổng 250k): **TRUE** (Khớp yêu cầu)
   - `exit.clearance.issue` (CCKB duyệt clearance): **FALSE** (Không có quyền duyệt)
   - `exit.clearance.debt_exception` (Duyệt nợ AP06): **FALSE** (Không có quyền duyệt nợ)

2. **`PORT_LEAD` (Lãnh đạo CCKB UAT):**
   - `exit.clearance.issue` (CCKB duyệt clearance): **TRUE** (Khớp yêu cầu)
   - `exit.clearance.debt_exception` (Duyệt ngoại lệ nợ AP06): **TRUE** (Khớp yêu cầu)
   - `storage.payment.collect` (Thu phí lưu bãi tại cổng): **FALSE** (Không thu tiền tại cổng)
   - `exit.actual.confirm` (An ninh xác nhận xuất bãi): **FALSE** (Không xác nhận cổng vật lý)

3. **`DIS_STAFF` (Nhân viên Điều phối Bãi UAT):**
   - `container.cargo.update` (Cập nhật loại hàng hóa): **TRUE** (Khớp yêu cầu)
   - `container.visit.read` (Đọc thông tin container trong bãi): **TRUE** (Khớp yêu cầu)
   - `storage.payment.collect`: **FALSE**
   - `exit.actual.confirm`: **FALSE**
   - `exit.clearance.issue`: **FALSE**

---

## 3. KẾT QUẢ KIỂM THỬ THUẬT TOÁN TÍNH PHÍ LƯU BÃI 22:00-06:00 V5

Kịch bản chạy thực tế qua script `scripts/test_storage_fee_calc.mjs`:
1. **Cùng ngày (08:00 đến 18:00):** 0 đêm qua mốc 22:00 -> 0 đêm tính phí -> **0 VND** (PASS).
2. **Qua 1 đêm (20:00 ngày 10 đến 08:00 ngày 11):** 1 đêm qua mốc 22:00-06:00 -> Miễn phí đêm đầu -> **0 VND** (PASS).
3. **Qua 2 đêm (20:00 ngày 10 đến 08:00 ngày 12):** 2 đêm tổng -> 1 đêm tính phí -> **100.000 VND** (PASS).
4. **Qua 3 đêm (20:00 ngày 10 đến 08:00 ngày 13):** 3 đêm tổng -> 2 đêm tính phí -> **200.000 VND** (PASS).
5. **Vào ban đêm (23:30 ngày 10 đến 05:30 ngày 11):** Cắt đêm trong khung 22:00-06:00 -> 1 đêm tổng, miễn đêm đầu -> **0 VND** (PASS).

---

## 4. CHI TIẾT SỬA ĐỔI CODEBASE TRONG ĐỢT NÀY

1. **`src/app/exit/page.tsx`:**
   - Mở rộng State: `paidAtGate`, `paymentMethod`, `receiptCode`, `canCollectStorage`.
   - `handleOpenGateExit`: Gọi `repository.calculateStorageFee(cont.inbound_at)` hiển thị tổng số đêm, số đêm tính phí và phí chính xác.
   - Modal Cổng ra:
     - Nếu có phí mà `!canCollectStorage` và không có nợ AP06: Hiển thị cảnh báo đỏ và khóa nút xác nhận xuất bãi (`isBlocked`).
     - Nếu có nợ AP06 (`CLEARED_WITH_DEBT`): Cho phép chọn thu phí ngay tại cổng hoặc xuất bãi ghi nợ AP06.
     - Nếu thu phí tại cổng: Cho phép chọn `CASH` hoặc `BANK_TRANSFER`, nhập mã biên nhận (bắt buộc với chuyển khoản).
   - `handleConfirmGateExit`: Kiểm tra ràng buộc và truyền đầy đủ `paidAtGate`, `paymentMethod`, `receiptCode`.

2. **`src/components/layout/app-shell.tsx`:**
   - Thay đổi banner môi trường sang động theo `process.env.NEXT_PUBLIC_ENABLE_REAL_WRITE === 'true'`.
   - Khi OFF: Hiển thị `SUPABASE REAL — Đang kết nối Supabase Cloud DEV (Chỉ đọc) — Thao tác ghi TẠM KHÓA qua Feature Flag an toàn.`
   - Khi ON: Hiển thị `SUPABASE REAL — Đang kết nối Supabase Cloud DEV (Ghi thực tế) — Chế độ vận hành trực tiếp với phân quyền RBAC/RLS.`

3. **`ProjectContext/06_Kien_truc_va_kiem_thu/MIGRATION_005_008_CLOUD_DEPLOYMENT_PLAN.md`:**
   - Cập nhật đúng các cờ `--linked`, `--data-only`, `--dry-run`.
   - Thêm phần giới hạn sao lưu của CLI (không dump auth.users/storage).
   - Thêm quy trình khôi phục bằng `psql` và các ranh giới cấm tuyệt đối (`db reset`, `migration repair`).

4. **Bộ test scripts:**
   - `scripts/test_browser_roles.mjs`: Kiểm thử tự động 3 role đại diện trên HTTP client / Supabase Auth thật.
   - `scripts/test_storage_fee_calc.mjs`: Kiểm thử độc lập thuật toán phí lưu bãi.
   - `scripts/smoke_test_atomic_entry.mjs`: Kiểm thử smoke test RPC tiếp nhận nguyên tử.

---

## 5. ĐIỂM DỪNG & ĐỀ XUẤT PHÊ DUYỆT BƯỚC TIẾP THEO

Toàn bộ công tác chuẩn bị đã hoàn tất 100%. Antigravity tuân thủ nghiêm ngặt ranh giới an toàn:
- **CHƯA THỰC HIỆN** lệnh `db push` Migrations 005–008 lên Supabase Cloud DEV.
- **CHƯA THỰC HIỆN** bật biến môi trường `NEXT_PUBLIC_ENABLE_REAL_WRITE="true"`.

Kính đề xuất Chủ dự án phê duyệt theo 2 bước riêng biệt:
1. **Phê duyệt Bước 1 (Triển khai Backend Cloud DEV):**  
   Cho phép chạy `npx supabase db push --linked` để áp dụng 4 migrations 005–008 lên Cloud DEV (`euswzyespwaxyrjkfkrq`).
2. **Phê duyệt Bước 2 (Kích hoạt Ghi Thực tế trên PWA):**  
   Sau khi kiểm tra Bước 1 thành công trên Cloud DEV, cho phép đặt `NEXT_PUBLIC_ENABLE_REAL_WRITE="true"` trên file `.env.local` của PWA.
