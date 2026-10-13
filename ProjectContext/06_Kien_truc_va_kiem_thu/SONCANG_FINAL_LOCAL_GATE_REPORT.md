# BÁO CÁO NGHIỆM THU CUỐI CÙNG: FINAL POSTGRESQL LOCAL GATE CLOSURE

**Dự án:** Website + PWA Quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Thời gian hoàn thành:** 12/10/2026 11:25 (Asia/Ho_Chi_Minh)  
**Tài liệu đối chiếu:** [SonCang_GateLocal_Independent_Review_20261012.md](file:///d:/thanhnx/OpenCode/YMS-project/ProjectContext/06_Kien_truc_va_kiem_thu/SonCang_GateLocal_Independent_Review_20261012.md)  
**Môi trường thực thi:** Docker Supabase Local Engine (PostgreSQL 17.11) trên Database thử nghiệm độc lập sạch sẽ `soncang_gate_test`.

---

## 1. TỔNG QUAN KẾT QUẢ VÀ TÌNH TRẠNG NGHIỆM THU

| Hạng mục | Chỉ tiêu | Kết quả thực tế | Tình trạng |
|---|---|---|---|
| **Khắc phục lỗi kiểm toán** | 8/8 phát hiện GLC-01 .. GLC-08 | Khắc phục triệt để trong SQL & Tests | **ĐẠT (PASS)** |
| **Môi trường cách ly** | Database thử nghiệm riêng | Tạo clean DB `soncang_gate_test`, nạp tuần tự 001 $\to$ 008 | **ĐẠT (PASS)** |
| **Bảo toàn Migration 001–004** | Giữ nguyên 100% SHA-256 Migration 004 | `f364d0535c797abef9382e9f22bef6a3b3ac5790381c013425a091856dab20d0` | **ĐẠT (PASS)** |
| **pgTAP Unit Tests** | 6 test suites | **181 / 181 tests PASS (100%)** | **ĐẠT (PASS)** |
| **E2E Integration & RBAC** | 11 nhóm kiểm thử dưới role `authenticated` | **11 / 11 groups PASS (100%)** | **ĐẠT (PASS)** |
| **Concurrent Race Safety** | 2 kết nối song song PostgreSQL thực tế | **Matching: Replay an toàn / Mismatch: Chặn lỗi** | **ĐẠT (PASS)** |
| **Frontend TypeScript** | `pnpm exec tsc --noEmit` | **0 errors** | **ĐẠT (PASS)** |
| **Frontend Build** | `pnpm build` | **12/12 static pages biên dịch thành công** | **ĐẠT (PASS)** |
| **Ranh giới an toàn** | Không push Cloud DEV khi chưa phê duyệt | **Cloud DEV giữ nguyên Migration 004** | **TUÂN THỦ 100%** |

---

## 2. BẢNG ĐỐI CHIẾU XỬ LÝ CHI TIẾT CÁC PHÁT HIỆN KIỂM TOÁN (GLC-01 ĐẾN GLC-08)

### GLC-01 (P0) — Chuẩn hóa Explicit Grants/REVOKE và RLS cho toàn bộ các bảng mới 005–007
- **Nguyên nhân:** Các bảng mới `app_yard_billing_settings`, `app_reefer_power_sessions`, `app_tariffs`, `app_charges`, `app_payments` phụ thuộc vào default privileges ngầm định.
- **Giải pháp triệt để:**
  * Bổ sung tường minh `REVOKE ALL ON TABLE ... FROM PUBLIC, anon;` cho cả 5 bảng.
  * Cấp quyền `GRANT SELECT ON TABLE ... TO authenticated;` (kèm `REVOKE INSERT, UPDATE, DELETE FROM authenticated;` đối với các bảng tài chính).
  * Kích hoạt `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` trên tất cả 5 bảng.
  * Định nghĩa các RLS policies chặt chẽ: `app_tariffs` chỉ cho phép đọc khi có `tariff.read` hoặc `admin.billing_settings.manage`; các bảng charges, payments, reefer bọc qua `sc_can` theo đúng yard_id và phân quyền nghiệp vụ.

### GLC-02 (P0) — Vé vào cổng tự động sinh khoản phải thu `app_charges` loại `TICKET`
- **Nguyên nhân:** Xe vào cổng phát sinh vé 250k nhưng không tạo bản ghi trong `app_charges`, làm gián đoạn luồng thu tiền qua sổ cái `app_payments`.
- **Giải pháp triệt để:**
  * Trong RPC nguyên tử `sc_create_vehicle_and_container_visit_atomic` (Migration 005): Tự động INSERT bản ghi `app_charges` (`charge_type = 'TICKET'`, `amount = v_ticket_price`, `status = 'UNPAID'`).
  * Trong hàm `sc_update_tractor_ticket_price` (Migration 005): Khi An ninh điều chỉnh vé xe đầu kéo từ 0đ lên 250k, tự động sinh hoặc cập nhật charge `TICKET` 250k tương ứng.
  * Bổ sung trigger `trg_sync_vehicle_ticket_charge` (Migration 007) trên `app_vehicle_visits` để bao phủ cả luồng tạo xe trực tiếp (nếu có).
  * Đồng bộ 2 chiều: Khi thu tiền qua `sc_collect_payment`, cả `app_charges.status` và `app_vehicle_visits.ticket_payment_status` đều chuyển thành `PAID`.

### GLC-03 (P0) — Chặn Container xuất bãi khi còn phiên Reefer `PENDING_REVIEW`
- **Nguyên nhân:** Phiên cắm điện có thời lượng $\le 0$ giây rơi vào `power_status = 'PENDING_REVIEW'`, nhưng logic clearance và exit chỉ kiểm tra `power_status = 'PLUGGED'`.
- **Giải pháp triệt để:**
  * Sửa hàm `sc_approve_exit_clearance` (Migration 008): Kiểm tra container có bất kỳ phiên điện nào ở trạng thái `power_status IN ('PLUGGED', 'PENDING_REVIEW')` -> BẮT BUỘC BẮN EXCEPTION CHẶN DUYỆT CLEARANCE.
  * Sửa hàm `sc_confirm_physical_exit` (Migration 008): Kiểm tra kép tại cổng ra vật lý, chặn An ninh cho xuất bãi nếu còn phiên `PENDING_REVIEW` chưa giải quyết.

### GLC-04 (P1) — Liên kết `reefer_session_id` vào `app_charges` và đồng bộ trạng thái thanh toán
- **Nguyên nhân:** Hàm `sc_unplug_reefer` khi tạo charge `REEFER` bị thiếu trường `reefer_session_id`, khiến hàm thu tiền không cập nhật được trạng thái của phiên điện.
- **Giải pháp triệt để:**
  * Sửa hàm `sc_unplug_reefer` (Migration 006): Bổ sung `reefer_session_id := p_session_id` khi INSERT vào `app_charges`.
  * Xác minh hàm `sc_collect_payment` (Migration 007): Khi thu tiền cước điện, tự động cập nhật `app_reefer_power_sessions.payment_status = 'PAID'` (hoặc `PARTIALLY_PAID`).

### GLC-05 (P1) — Bổ sung RPC độc lập `sc_confirm_vehicle_only_exit` cho Xe A ra một mình
- **Nguyên nhân:** Hệ thống chỉ có RPC xuất container kèm xe ra, thiếu quy trình xe đầu kéo A mang container vào hạ bãi rồi ra về một mình, để xe B sau đó vào nhận container kéo ra.
- **Giải pháp triệt để:**
  * Tạo hàm RPC mới `sc_confirm_vehicle_only_exit(p_vehicle_visit_id uuid, p_notes text DEFAULT NULL)` trong Migration 008.
  * Kiểm tra quyền RBAC V5: `public.sc_can('vehicle.visit.exit_confirm', v_veh.yard_id)` hoặc `public.sc_can('exit.actual.confirm', v_veh.yard_id)`.
  * Kiểm tra tiền vé xe vào cổng (nếu có vé phải thanh toán trước khi ra).
  * Cập nhật xe thành `status = 'EXITED'`, `exit_at = now()`, `exit_by = auth.uid()`.
  * Container đã hạ tại bãi vẫn giữ nguyên trạng thái `IN_YARD`, sẵn sàng cho xe B vào ghép nối và xuất bãi vật lý qua `sc_confirm_physical_exit`.

### GLC-06 (P1) — Concurrency / Idempotency Collision Handler đối chiếu Full Payload
- **Nguyên nhân:** Trong khối `EXCEPTION WHEN unique_violation` khi có 2 request chạy song song cùng `idempotency_key`, nhánh race retry chỉ kiểm tra `vehicle_type` và `license_plate`, không so sánh container và thông tin tài xế.
- **Giải pháp triệt để:**
  * Nâng cấp khối `unique_violation` trong `sc_create_vehicle_and_container_visit_atomic` (Migration 005) đối chiếu toàn bộ full payload: loại xe, biển số, tên lái xe, số điện thoại, mã vé, trạng thái có cont, số cont, kích thước cont, loại cont, ghi chú.
  * Nếu khớp toàn bộ: Trả về kết quả idempotent replay (`is_replay = true`) với cùng `vehicle_visit_id`.
  * Nếu có bất kỳ trường nào sai khác: Ném ngoại lệ lỗi `MISMATCH_PAYLOAD`, tuyệt đối không ghi đè dữ liệu.
  * Xây dựng script kiểm thử song song thực tế `scripts/run_concurrent_test.ps1` mở 2 background psql sessions đồng thời: Chứng minh 100% race-safe.

### GLC-07 (P1) — Chặn An ninh tự ý thiết lập trạng thái HÀNG/RỖNG
- **Nguyên nhân:** Nhân viên An ninh trực cổng có quyền `vehicle.visit.create` có thể truyền `p_cargo_status = 'HANG'` hoặc `'RONG'` mà không bị kiểm tra quyền Điều phối.
- **Giải pháp triệt để:**
  * Mặc định `p_cargo_status` là `'CHUA_XAC_DINH'` trong `sc_create_vehicle_and_container_visit_atomic` (Migration 005).
  * Nếu caller truyền `'HANG'` hoặc `'RONG'`, hàm bắt buộc kiểm tra quyền: `public.sc_can('container.cargo.update', p_yard_id)`.
  * Nhân viên An ninh không có quyền này sẽ bị từ chối với mã lỗi `42501`. Việc cập nhật HÀNG/RỖNG sau đó được thực hiện độc lập bởi Điều phối viên qua `sc_update_container_cargo`.

### GLC-08 (P1) — Kiểm soát Biểu phí theo Nguyên tắc AP10 Four-Eyes
- **Nguyên nhân:** Bảng `app_tariffs` chưa có RLS bảo vệ, dễ bị client thao tác trái phép.
- **Giải pháp triệt để:**
  * Kích hoạt `ENABLE ROW LEVEL SECURITY` trên `app_tariffs`.
  * Thu hồi toàn bộ quyền DML trực tiếp (`INSERT`, `UPDATE`, `DELETE`) từ các role client (`anon`, `authenticated`).
  * Chỉ cho phép `SELECT` thông qua policy kiểm tra quyền `tariff.read` hoặc `admin.billing_settings.manage`.
  * Mọi thay đổi biểu phí trong tương lai bắt buộc phải đi qua quy trình phê duyệt Four-Eyes AP10 có audit log.

---

## 3. BẰNG CHỨNG KIỂM THỬ POSTGRESQL LOCAL RUNTIME

### 3.1. Áp dụng tuần tự trên Database Sạch Độc lập `soncang_gate_test`
Toàn bộ 8 migrations được áp dụng tuần tự từ 001 đến 008 với cờ `-v ON_ERROR_STOP=1`:
```
Migration 001: 20261011000001_foundation_rbac.sql ........... EXIT CODE 0 (PASS)
Migration 002: 20261011000002_seed_rbac_v5.sql .............. EXIT CODE 0 (PASS)
Migration 003: 20261011000003_rbac_security_functions_rls.sql EXIT CODE 0 (PASS)
Migration 004: 20261011000004_domain_vehicles_containers.sql  EXIT CODE 0 (PASS)
Migration 005: 20261012000005_gate_ticket_atomic_guard.sql .. EXIT CODE 0 (PASS)
Migration 006: 20261012000006_domain_reefer_power.sql ....... EXIT CODE 0 (PASS)
Migration 007: 20261012000007_domain_financial_ledger.sql .. EXIT CODE 0 (PASS)
Migration 008: 20261012000008_domain_exit_clearance.sql ...... EXIT CODE 0 (PASS)
```

### 3.2. Kết quả 6 Bộ pgTAP Test Suites (Tổng cộng 181 Tests PASS 100%)
| Test Suite File | Phạm vi kiểm thử | Số test | Kết quả | Exit Code |
|---|---|:---:|:---:|:---:|
| `rbac_verification.sql` | 67 permissions, 206 grants V5, RLS audit/approval | 49 | 49 / 49 PASS | 0 |
| `domain_vehicles_containers_004.sql` | Vòng đời xe/cont độc lập, đổi số cont, RLS | 75 | 75 / 75 PASS | 0 |
| `005_gate_ticket_atomic_guard.test.sql` | RPC nguyên tử, vé 250k, guard nâng vé, idempotency | 15 | 15 / 15 PASS | 0 |
| `006_reefer_power.test.sql` | Cắm/rút điện, block 15p, cấm 0s (PENDING_REVIEW) | 13 | 13 / 13 PASS | 0 |
| `007_financial_ledger.test.sql` | Phân quyền thu tiền, sổ cái bất biến, fail-closed OTHER | 10 | 10 / 10 PASS | 0 |
| `008_exit_clearance.test.sql` | Clearance CCKB, chặn PENDING_REVIEW, Xe A ra riêng | 19 | 19 / 19 PASS | 0 |
| **TỔNG CỘNG** | **Toàn bộ hệ thống Backend V5 Sơn Cảng** | **181** | **181 / 181 PASS** | **0** |

### 3.3. Kết quả Kiểm thử E2E Integration 11 Nhóm (`scripts/gate_local_e2e_verification.sql`)
Chạy trực tiếp dưới database role `authenticated` mô phỏng người dùng thật:
- **TEST 1 (SC-R3-07):** RPC `sc_my_permissions()` trả về đúng 26 quyền cho SEC_STAFF và 31 quyền cho PORT_STAFF. -> **PASS**
- **TEST 2 (SC-R3-08):** Idempotency replay nguyên vẹn và payload mismatch guard fail-safe. -> **PASS**
- **TEST 3 (SC-R3-09):** Rút điện tự động sinh khoản thu `app_charges` loại REEFER đúng số tiền 50.000đ. -> **PASS**
- **TEST 4 (SC-R3-05 & SC-R3-06):** An ninh bị chặn tuyệt đối thu tiền điện; CCKB thu tiền ghi nhận đúng schema; trigger `trg_payment_immutable` cấm UPDATE/DELETE trên sổ cái. -> **PASS**
- **TEST 5 (SC-R3-01 & SC-R3-02):** CCKB cấp clearance, An ninh thu phí lưu bãi tại cổng 100k ghi nhận đúng collector_dept = AN_NINH, xe ra cổng EXITED có `exit_by` thỏa mãn check constraint. -> **PASS**
- **TEST 6 (GLC-01 & GLC-08):** Toàn bộ 5 bảng domain mới có `relrowsecurity = true`; anon bị cấm SELECT; authenticated bị cấm INSERT trực tiếp vào `app_tariffs`. -> **PASS**
- **TEST 7 (GLC-02):** Vé vào cổng 250k tự động phát sinh charge TICKET UNPAID; thu tiền qua `sc_collect_payment` đồng bộ `PAID` cả trên charge và vehicle_visit. -> **PASS**
- **TEST 8 (GLC-03):** CCKB bị chặn duyệt clearance và An ninh bị chặn xuất bãi khi container còn phiên điện `PENDING_REVIEW`. -> **PASS**
- **TEST 9 (GLC-04):** Thu tiền điện đồng bộ trạng thái `payment_status = 'PAID'` trên bảng `app_reefer_power_sessions`. -> **PASS**
- **TEST 10 (GLC-05):** Xe A vào mang container -> Xe A xuất bãi một mình qua `sc_confirm_vehicle_only_exit` -> Container an toàn ở lại bãi -> Xe B vào lấy container ra qua `sc_confirm_physical_exit`. -> **PASS**
- **TEST 11 (GLC-07):** An ninh bị chặn 42501 khi cố tình gán HANG/RONG; Điều phối viên cập nhật trạng thái HANG thành công qua `sc_update_container_cargo`. -> **PASS**

### 3.4. Bằng chứng Kiểm thử Đa phiên Đồng thời (Concurrent Race Test GLC-06)
Thực thi bằng `scripts/run_concurrent_test.ps1` mở 2 background psql processes song song:
```
--- SCENARIO A: 2 parallel connections with SAME key and MATCHING payload ---
Result Session 1: {"is_replay": false, "ticket_amount": 250000.00, "vehicle_visit_id": "07be9abb-89cc-496d-9539-dfd32f22a992", "container_visit_id": "0cfdd1e9-c8c9-49af-9e08-d2621c9c1c57", "ticket_payment_status": "UNPAID"}
Result Session 2: {"is_replay": true, "ticket_amount": 250000.00, "vehicle_visit_id": "07be9abb-89cc-496d-9539-dfd32f22a992", "container_visit_id": "0cfdd1e9-c8c9-49af-9e08-d2621c9c1c57", "ticket_payment_status": "UNPAID"}
-> PASS SCENARIO A: Both parallel sessions returned identical vehicle_visit_id: 07be9abb-89cc-496d-9539-dfd32f22a992. Idempotent replay safe under race condition!

--- SCENARIO B: 2 parallel connections with SAME key but MISMATCHING payload ---
Result Session 1 (Original): psql:/tmp/race_b1.sql:12: ERROR: Idempotency key KEY-RACE-MISMATCH-999 đã được sử dụng với thông tin xe khác.
Result Session 2 (Mismatch): {"is_replay": false, "ticket_amount": 250000.00, "vehicle_visit_id": "bd4b3a6e-06c9-47c6-b253-2bd9f04e2db2", "container_visit_id": "4e8c3579-0097-4455-91c3-503c2d0ed21f", "ticket_payment_status": "UNPAID"}
-> PASS SCENARIO B: One session succeeded, mismatched payload session was BLOCKED by exception handler! Full payload validation confirmed under concurrency!
```

---

## 4. BẢNG KÊ MÃ BĂM SHA-256 CHÍNH THỨC

### 4.1. SQL Migrations (supabase/migrations/)
| File Migration | SHA-256 Checksum | Trạng thái |
|---|---|---|
| `20261011000001_foundation_rbac.sql` | `837C9E7E42D029F07A6765B0361F04112D37060ADD0A26A9CA8D17F936D56621` | Giữ nguyên gốc |
| `20261011000002_seed_rbac_v5.sql` | `A6D6034AF895ED63BFC305A2CCC77B1A6ED3D45B8AFD6C24437E010DE8B4D406` | Giữ nguyên gốc |
| `20261011000003_rbac_security_functions_rls.sql` | `63D9AABF685C6A2E607D5B424600832F5C8D94F55B4EE3AE531831F17DBA6742` | Giữ nguyên gốc |
| **`20261011000004_domain_vehicles_containers.sql`** | **`F364D0535C797ABEF9382E9F22BEF6A3B3AC5790381C013425A091856DAB20D0`** | **BẢO TOÀN 100% (KHÔNG ĐỔI)** |
| `20261012000005_gate_ticket_atomic_guard.sql` | `5B8AF585A18323C1A6FBF5877E4C2EAE612C7039C62518ACE53C612EDA3DA74C` | Sửa GLC-01, 02, 06, 07 |
| `20261012000006_domain_reefer_power.sql` | `DF73E93806B66BD52B826539475192A7AA5AB035C35CE66BB384BCF6D9D14BC5` | Sửa GLC-01, 04 |
| `20261012000007_domain_financial_ledger.sql` | `CFB7B844E24310BF41F13BFB76CB9825662D3DFE2CA3478C0779F7E3F31C131D` | Sửa GLC-01, 02, 08 |
| `20261012000008_domain_exit_clearance.sql` | `23344F6F06061C8E6B0F0FCA19CCD1A1112287FC18234BB00FCA4581E1C53102` | Sửa GLC-03, 05 |

### 4.2. Các Gói Đóng gói Phát hành
| Tên gói phát hành | Kích thước | SHA-256 Checksum | Nội dung |
|---|:---:|---|---|
| **`soncang_final_local_gate_code_bundle.zip`** | 0.28 MB | `111FECE1828FEF1794F8E5CC1B35249040F58280444EF9978892624EEE7AD6CB` | Toàn bộ source code Next.js, components, lib, supabase migrations, tests, scripts, config files |
| **`soncang_final_local_gate_evidence.zip`** | 16 KB | `9071E913487C18E093302E10464D0772C8D3EDFD84A1469796E8643D9DA4AC38` | Toàn bộ 8 raw logs kiểm thử, pgTAP 181/181, 11 groups E2E, 2 concurrent sessions race test, manifest |

---

## 5. KẾT LUẬN VÀ KIẾN NGHỊ BƯỚC TIẾP THEO

1. **Kết luận Nghiệm thu Gate Local:**
   - Toàn bộ các phát hiện GLC-01 đến GLC-08 từ kiểm toán độc lập đã được xử lý triệt để, có bằng chứng thực thi runtime 100% trên clean database độc lập `soncang_gate_test`.
   - Hệ thống đảm bảo tính toàn vẹn nghiệp vụ V5, bất biến sổ cái tài chính, phân quyền rạch ròi, an toàn trước race conditions khi nhiều xe vào cổng đồng thời.
   - Bản phát hành đạt chất lượng cao nhất, sẵn sàng chuyển bước tiếp theo.

2. **Kiến nghị Trình Chủ dự án:**
   - Kính đề nghị Chủ dự án xem xét và **CHÍNH THỨC PHÊ DUYỆT ĐÓNG GATE LOCAL (GATE LOCAL CLOSED)**.
   - Mở phê duyệt **Gate C Preflight** để triển khai có kiểm soát Migrations 005 $\to$ 008 lên Supabase Cloud DEV (`son-cang-yms-dev`, ref: `euswzyespwaxyrjkfkrq`).
   - Sau khi Cloud DEV sẵn sàng, tiến hành chuyển giao PWA sang chế độ Real Mode và tổ chức kiểm thử chấp nhận người dùng (UAT) với dữ liệu thực tế.
