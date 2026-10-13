# BÁO CÁO NGHIỆM THU KIỂM THỬ POSTGRESQL RUNTIME MIGRATION 004 R4 (GATE B)
## DỰ ÁN: PHẦN MỀM QUẢN LÝ BẾN BÃI/CẢNG CẠN SƠN CẢNG
### Công ty Cổ phần Tà Lùng Quang Minh

- **Ngày thực hiện:** 11/10/2026
- **Phiên bản mã nguồn:** Migration 004 R4 (`20261011000004_domain_vehicles_containers.sql`)
- **Môi trường thực thi:** Supabase Local PostgreSQL 17.11 (Docker Container `supabase_db_YMS-project`, Port 54322)
- **Tình trạng Supabase Cloud DEV:** `son-cang-yms-dev` (`euswzyespwaxyrjkfkrq`) — **HOÀN TOÀN NGUYÊN VẸN, CHƯA ÁP DỤNG MIGRATION 004**.
- **Kết luận Gate B:** **ĐẠT XUẤT SẮC (PASS 100%)** — Sẵn sàng chuyển tiếp Gate C (`READY_FOR_CLOUD_DEV`).

---

## 1. TỔNG QUAN KẾT QUẢ KIỂM THỬ

Mọi khía cạnh kiểm thử từ tĩnh, dynamic pgTAP, đến runtime đa luồng (concurrency race) và bảo mật RLS thực tế trên engine PostgreSQL 17 đều đạt kết quả 100% không có ngoại lệ:

| Nhóm kiểm thử | Công cụ / Kịch bản | Số lượng kiểm thử | Kết quả | Trạng thái |
| :--- | :--- | :--- | :--- | :--- |
| **Áp dụng Migration** | `npx supabase migration up --local` | 1 migration (004) | Thành công (Exit code 0) | **PASS** |
| **pgTAP Migration 004** | `domain_vehicles_containers_004.sql` | 75 assertions | 75/75 PASS (0 FAIL) | **PASS** |
| **pgTAP RBAC Foundation** | `rbac_verification.sql` | 49 assertions | 49/49 PASS (0 FAIL) | **PASS** |
| **Kiểm toán tĩnh Test 004** | `scripts/audit_test_004.js` | 75 assertions, 0 PERFORM | Đạt chuẩn pg_prove | **PASS** |
| **Bảo mật RBAC Bất biến** | `scripts/verify_rbac_invariants.js` | 52 quy tắc kiểm toán | 52/52 PASS (0 FAIL) | **PASS** |
| **Kiểm tra TypeScript** | `pnpm exec tsc --noEmit` | Toàn bộ codebase | 0 errors (Exit code 0) | **PASS** |
| **Runtime Concurrency & RLS** | `scripts/run_gate_b_runtime_tests.py` | 17 ca kiểm thử runtime | 17/17 PASS (0 FAIL) | **PASS** |

---

## 2. CHI TIẾT 17 CA KIỂM THỬ RUNTIME ENGINE (GATE B)

Toàn bộ 17 ca kiểm thử runtime được thực thi bằng Python đa luồng (`threading.Barrier`) và kết nối trực tiếp PostgreSQL 17 qua giao thức client chuẩn:

### 2.1. Concurrency Races (Đa luồng với Barrier Sync)
- **`RACE-01` [PASS]:** Hai kết nối đồng thời gọi `sc_create_vehicle_visit` với cùng `idempotency_key = 'KEY-RACE-CONCURRENT-001'`.
  * *Kết quả:* Cả hai kết nối đều nhận về cùng một UUID lượt xe. Cơ chế idempotency an toàn, tổng số bản ghi trong bảng `app_vehicle_visits` bằng đúng **1**.
- **`RACE-02` [PASS]:** Hai kết nối đồng thời từ 2 xe khác nhau tạo container cùng số `CONCRACE888` (trạng thái `IN_YARD`).
  * *Kết quả:* Đúng 1 kết nối commit thành công (exit code 0); kết nối kia bị chặn ngay lập tức bởi partial unique index `idx_cont_yard_active_unique` (SQLSTATE 23505). Tổng số container `IN_YARD` bằng đúng **1**.

### 2.2. Kiểm thử LG-01 (Idempotency Payload Alteration & Replay)
- **`LG-01a` [PASS]:** Tái sử dụng `idempotency_key` lượt xe nhưng thay đổi `driver_name` (từ 'Tài xế gốc' thành 'Tài xế KHÁC BIỆT').
  * *Kết quả:* Bị từ chối với ngoại lệ P0001: *"Idempotency key IDEM-LG01-VEH đã được sử dụng với thông tin lượt xe khác"*.
- **`LG-01c` [PASS]:** Tái sử dụng `idempotency_key` lượt xe với 100% payload giống hệt.
  * *Kết quả:* Tái hiện (replay) an toàn, trả về chính xác ID ban đầu, không phát sinh dòng mới.
- **`LG-01b` [PASS]:** Tái sử dụng `idempotency_key` lượt container nhưng thay đổi `container_size` (từ '40' thành '20').
  * *Kết quả:* Bị từ chối với ngoại lệ P0001: *"Idempotency key IDEM-LG01-CONT đã được sử dụng với thông tin lượt container khác"*.
- **`LG-01d` [PASS]:** Tái sử dụng `idempotency_key` lượt container với 100% payload giống hệt.
  * *Kết quả:* Tái hiện an toàn, trả về chính xác ID ban đầu.

### 2.3. Authenticated vs Anon Privileges & RLS Boundaries
- **`SEC-01` [PASS]:** Database role `anon` gọi trực tiếp RPC `sc_create_vehicle_visit`.
  * *Kết quả:* Bị chặn fail-closed (permission denied / yêu cầu đăng nhập).
- **`SEC-02` [PASS]:** Database role `anon` cố gắng SELECT trên bảng `app_container_number_changes`.
  * *Kết quả:* Bị PostgreSQL chặn hoàn toàn (`permission denied for table app_container_number_changes`).
- **`SEC-03` [PASS]:** Role `authenticated` với user Điều phối `DIS_STAFF` (không có quyền `discrepancy.view`) SELECT trên `app_container_number_changes`.
  * *Kết quả:* Chính sách RLS `p_container_changes_select` lọc dữ liệu trong suốt, trả về đúng **0** bản ghi.
- **`SEC-04` [PASS]:** Role An ninh `SEC_STAFF` gọi `sc_update_container_cargo` để tự ý đổi HÀNG/RỖNG.
  * *Kết quả:* Bị RPC từ chối fail-closed: *"Permission Denied: Chỉ bộ phận Điều phối hoặc Điều phối viên mới có quyền cập nhật trạng thái Hàng/Rỗng"*.
- **`SEC-05` [PASS]:** Quản trị `SYS_ADMIN` gọi `sc_manage_vehicle_type` đổi giá vé trực tiếp (`p_default_ticket_amount`).
  * *Kết quả:* Bị RPC chặn đứng theo nguyên tắc kiểm soát tài chính AP10 (Four-Eyes): *"Việc thay đổi giá vé yêu cầu quy trình phê duyệt bảng giá AP10 (Four-Eyes)"*.

### 2.4. Sửa số container, bảo toàn UUID & Lịch sử bất biến
- **`HIST-01` [PASS]:** An ninh `SEC_STAFF` gọi `sc_correct_container_number`:
  * Cập nhật `container_no_current` thành công.
  * Bản ghi `app_container_visits` giữ nguyên UUID `id` cũ 100%.
  * Tự động sinh bản ghi trong `app_container_number_changes` và ghi `app_audit_events` với action `container.number.correct`.
- **`HIST-02` [PASS]:** Thực thi lệnh `DELETE FROM app_container_number_changes WHERE id = ...`.
  * *Kết quả:* Bị trigger `sc_trg_container_number_changes_immutable` chặn đứng: *"Lịch sử sửa số container là bất biến (append-only). Nghiêm cấm xóa bản ghi."*
- **`HIST-03` [PASS]:** Thực thi lệnh `UPDATE app_container_number_changes SET evidence_url = '...'`.
  * *Kết quả:* Bị trigger chặn đứng do vi phạm tính bất biến của trường chứng cứ và dữ liệu gốc.

### 2.5. Vòng đời & Ranh giới Migration 007
- **`LIFE-01` [PASS]:** Quét toàn bộ hàm hệ thống (`pg_proc`) để xác minh sự tồn tại của các hàm xuất bãi (`sc_exit_vehicle`, `sc_exit_container`, `sc_confirm_exit`).
  * *Kết quả:* Số lượng = 0. Không có bất kỳ RPC nào cho phép xuất bãi vội vã, bảo vệ toàn vẹn phạm vi cho Migration 007.
- **`LIFE-02` [PASS]:** Thử INSERT container có `status = 'IN_YARD'` nhưng `outbound_at IS NOT NULL`.
  * *Kết quả:* Vi phạm check constraint `ck_container_status_outbound` (SQLSTATE 23514), giao dịch bị rollback.
- **`LIFE-03` [PASS]:** Thử INSERT xe có `status = 'IN_YARD'` nhưng `exit_at IS NOT NULL`.
  * *Kết quả:* Vi phạm check constraint `ck_vehicle_status_exit` (SQLSTATE 23514), giao dịch bị rollback.

---

## 3. CÁC NÂNG CẤP KỸ THUẬT QUAN TRỌNG ĐÃ TRIỂN KHAI

1. **Khắc phục triệt để LG-01 (Full-payload comparison):**
   - Đã nâng cấp RPC `sc_create_vehicle_visit` và `sc_create_container_visit` để đối chiếu từng trường dữ liệu (`driver_name`, `driver_phone`, `ticket_code`, `note`, `container_size`, `container_type`) bằng `IS DISTINCT FROM`. Ngăn chặn hoàn toàn lỗ hổng silent overwrite hoặc mismatch payload.
2. **Kiểm thử pgTAP không phụ thuộc schema `pg_temp`:**
   - Sử dụng bảng biến tạm thời `public.test_vars_004` trong transaction với quyền `GRANT` cho `authenticated`, tự động rollback sạch sẽ ở cuối bài test, tuân thủ hạn chế bảo mật của PostgreSQL 17.
3. **Mô phỏng Concurrency thực tế:**
   - Kịch bản race condition sử dụng `threading.Barrier` bảo đảm 2 kết nối gửi câu lệnh đồng thời ở mức micro-second, chứng minh index `idx_cont_yard_active_unique` và trigger `trg_check_duplicate_container_in_yard` hoạt động hoàn hảo dưới tải đồng thời.

---

## 4. GÓI BẰNG CHỨNG KIỂM THỬ RUNTIME

Toàn bộ nhật ký đầu ra nguyên bản đã được thu thập và đóng gói vào file:
📁 **`migration_004_runtime_evidence.zip`**

Bao gồm:
- `pgtap_004_output.txt`: Kết quả 75/75 tests pgTAP của Migration 004.
- `pgtap_rbac_output.txt`: Kết quả 49/49 tests pgTAP RBAC Foundation.
- `audit_test_004_output.txt`: Báo cáo phân tích tĩnh cấu trúc pgTAP.
- `rbac_invariants_output.txt`: Báo cáo 52 kiểm toán RBAC invariants.
- `gate_b_runtime_output.txt`: Nhật ký chi tiết 17 bài test runtime.
- `gate_b_runtime_results.json`: Kết quả có cấu trúc JSON của Gate B.

---

## 5. DỌN DẸP MÔI TRƯỜNG & KHUYẾN NGHỊ VẬN HÀNH

- **Môi trường Supabase Local:** Đã dừng an toàn thông qua lệnh `npx supabase stop`.
- **Docker Desktop:** Khuyến nghị người dùng có thể tắt Docker Desktop để giải phóng RAM cho hệ điều hành Windows.
- **Cam kết Cloud:** Chưa chạy bất kỳ lệnh `db push --linked` nào lên Supabase Cloud DEV.

---

## 6. KẾT LUẬN & TRẠNG THÁI GATE C

- **Kết luận:** Migration 004 R4 và bộ test pgTAP đã vượt qua toàn diện mọi kiểm toán tĩnh, động và runtime với tiêu chuẩn cao nhất.
- **Trạng thái:** **`READY_FOR_CLOUD_DEV`**.
- **Quy tắc tuân thủ:** **DỪNG BẮT BUỘC**, chờ văn bản phê duyệt Gate C từ Chủ dự án trước khi thực hiện bất kỳ thao tác triển khai nào lên Cloud DEV.
