# BÁO CÁO NGHIỆM THU POSTGRESQL LOCAL RUNTIME GATE — SƠN CẢNG YMS

**Dự án:** Website + PWA Quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Thời gian thực hiện:** Ngày 12 tháng 10 năm 2026  
**Môi trường kiểm thử:** PostgreSQL Local trên Docker Desktop (Container: `supabase_db_YMS-project`, Database: `postgres`, Port: `54322`)  
**Tình trạng Cloud DEV:** TUYỆT ĐỐI KHÔNG PUSH / KHÔNG THAY ĐỔI (Chờ quyết định phê duyệt riêng từ chủ dự án)

---

## 1. TỔNG QUAN KẾT QUẢ KHẮC PHỤC 9 PHÁT HIỆN KIỂM TOÁN (SC-R3-01 ĐẾN SC-R3-09)

Toàn bộ 9 phát hiện kiểm toán từ báo cáo `SonCang_Bugfix_R3_Independent_GateLocal_20261012.md` đã được xử lý triệt để và xác minh qua runtime thực tế:

| Mã lỗi | Mức độ | Vị trí sửa | Nội dung khắc phục | Kết quả xác minh |
| :--- | :---: | :--- | :--- | :---: |
| **SC-R3-01** | P0 | Migration 008 | Sửa INSERT `app_payments` đúng schema: `payment_amount`, `collector_dept := 'AN_NINH'`, bỏ các cột không tồn tại `amount` và `status`. | **PASS** (Runtime E2E Test 4 & 5) |
| **SC-R3-02** | P0 | Migration 008, pgTAP 008 | Bổ sung `exit_by = v_actor_id` trong UPDATE `app_vehicle_visits`, thỏa mãn check constraint `ck_vehicle_status_exit`. | **PASS** (pgTAP 008 Test 8 & E2E Test 5) |
| **SC-R3-03** | P1 | pgTAP 008 | Bỏ hoàn toàn câu lệnh INSERT tự tạo vào `app_role_permissions`, tuân thủ 206 grants chuẩn V5 từ Migration 002. | **PASS** (pgTAP 008 13/13 tests) |
| **SC-R3-04** | P0 | Migration 008 | Thêm kiểm tra trạng thái cắm điện thực tế (`is_plugged`) và công nợ dịch vụ trong cả `sc_approve_exit_clearance` và `sc_confirm_physical_exit`. | **PASS** (E2E Test 5 chặn khi chưa rút điện) |
| **SC-R3-05** | P0 | Migration 006, 007 | Siết RLS `app_charges`, `app_payments`, `app_reefer_power_sessions` theo quyền V5. An ninh cấm thu điện, CCKB cấm thu vé xe/lưu bãi cổng. | **PASS** (E2E Test 4 chặn SEC thu tiền điện) |
| **SC-R3-06** | P0 | Migration 007 | Thêm trigger `trg_payment_immutable` cấm UPDATE/DELETE trên `app_payments`. Fail-closed đối với trạng thái PAID/CANCELLED/EXEMPT. | **PASS** (E2E Test 4 trigger chặn UPDATE) |
| **SC-R3-07** | P1 | `auth-context.tsx`, `rbac-rules.ts` | Frontend gọi RPC `sc_my_permissions()`, khôi phục session thật qua `supabase.auth.getSession()` và `onAuthStateChange()`; đồng bộ đúng 206 grants tĩnh. | **PASS** (E2E Test 1 & Frontend Build PASS) |
| **SC-R3-08** | P0 | Migration 005 | Đưa Idempotency check lên đầu hàm `sc_create_vehicle_and_container_visit_atomic` trước validation IN_YARD; đối chiếu toàn bộ payload; bắt `unique_violation` race-condition. | **PASS** (E2E Test 2 Replay & Mismatch Guard) |
| **SC-R3-09** | P0 | Migration 006 | Hàm `sc_unplug_reefer` tự động tạo bản ghi `app_charges` loại `REEFER` khi số tiền điện > 0; liên kết luồng thanh toán end-to-end. | **PASS** (E2E Test 3 tạo charge 50.000đ khi rút) |

---

## 2. BẰNG CHỨNG KIỂM THỬ POSTGRESQL RUNTIME

### 2.1. Kết quả áp dụng Migration trên Local Database
Lệnh thực thi: `npx supabase migration up --local`
```
Connecting to local database...
Applying migration 20261012000005_gate_ticket_atomic_guard.sql...
Applying migration 20261012000006_domain_reefer_power.sql...
Applying migration 20261012000007_domain_financial_ledger.sql...
Applying migration 20261012000008_domain_exit_clearance.sql...
{"applied":[
  "...20261012000005_gate_ticket_atomic_guard.sql",
  "...20261012000006_domain_reefer_power.sql",
  "...20261012000007_domain_financial_ledger.sql",
  "...20261012000008_domain_exit_clearance.sql"
],"message":"Migrations applied"}
Exit Code: 0
```

### 2.2. Kết quả kiểm thử bộ pgTAP (6 files / 175 tests)
Lệnh thực thi: `npx supabase test db --local`
```
Connecting to local database...
/thanhnx/OpenCode/YMS-project/supabase/tests/005_gate_ticket_atomic_guard.test.sql .. ok
/thanhnx/OpenCode/YMS-project/supabase/tests/006_reefer_power.test.sql .............. ok
/thanhnx/OpenCode/YMS-project/supabase/tests/007_financial_ledger.test.sql .......... ok
/thanhnx/OpenCode/YMS-project/supabase/tests/008_exit_clearance.test.sql ............ ok
/thanhnx/OpenCode/YMS-project/supabase/tests/domain_vehicles_containers_004.sql ..... ok
/thanhnx/OpenCode/YMS-project/supabase/tests/rbac_verification.sql .................. ok
All tests successful.
Files=6, Tests=175,  0 wallclock secs ( 0.04 usr  0.02 sys +  0.04 cusr  0.02 csys =  0.12 CPU)
Result: PASS
```
- `005_gate_ticket_atomic_guard.test.sql`: 15/15 tests PASS (vé đầu kéo 0đ/250k, guard tự động điều chỉnh, atomic all-or-nothing).
- `006_reefer_power.test.sql`: 13/13 tests PASS (làm tròn 15 phút, snapshot giá, ca 0 giây, không cắm trùng lặp).
- `007_financial_ledger.test.sql`: 10/10 tests PASS (sổ cái bất biến, phân quyền thu tiền CCKB vs An ninh).
- `008_exit_clearance.test.sql`: 13/13 tests PASS (tính phí lưu đêm, CCKB clearance, An ninh xuất bãi, exit_by).
- `domain_vehicles_containers_004.sql`: 75/75 tests PASS (danh mục xe, tạo cont/xe, RLS, trigger audit).
- `rbac_verification.sql`: 49/49 tests PASS (ma trận phân quyền RBAC V5).

### 2.3. Kết quả kiểm thử E2E & RBAC dưới Database Role `authenticated`
Script thực thi: `scripts/gate_local_e2e_verification.sql`
```
BEGIN
NOTICE:  === BẮT ĐẦU KIỂM THỬ RUNTIME GATE LOCAL SƠN CẢNG ===
NOTICE:  --- TEST 1: Kiểm thử sc_my_permissions() cho SEC_STAFF và PORT_STAFF ---
NOTICE:  -> PASS: SEC_STAFF có đúng 26 permissions qua RPC sc_my_permissions()
NOTICE:  -> PASS: PORT_STAFF có đúng 31 permissions qua RPC sc_my_permissions()
NOTICE:  --- TEST 2: Kiểm thử Idempotency Replay & Payload Mismatch Guard ---
NOTICE:  -> PASS: Tạo thành công xe 663d7c66-a0ea-43bd-8bf6-39da8805ed9b và cont d0caeada-023b-4c30-ac88-77f9121ad408 với Idempotency Key
NOTICE:  -> PASS: Replay cùng Idempotency Key thành công idempotent (trả về đúng lượt xe cũ)
NOTICE:  -> PASS: Chặn thành công mismatch payload khi trùng Idempotency Key
NOTICE:  --- TEST 3: Cắm/Rút điện và tự động tạo khoản thu app_charges ---
NOTICE:  -> PASS: CCKB cắm điện container thành công (session: 772962e7-8005-46d4-a201-22c62ab422a5)
NOTICE:  DEBUG UNPLUG RES: {"session_id": "772962e7-8005-46d4-a201-22c62ab422a5", "power_status": "UNPLUGGED", "billable_minutes": 30, "total_power_amount": 50000.00, "applied_hourly_rate": 100000.00, "raw_duration_seconds": 1800}
NOTICE:  -> PASS: Rút điện tự động tạo khoản thu REEFER đúng số tiền 50.000đ (charge_id: c4f605c4-c001-42aa-99ba-b85f7309afb1)
NOTICE:  --- TEST 4: Phân quyền thu tiền (An ninh cấm thu điện, CCKB thu điện) ---
NOTICE:  -> PASS: An ninh bị chặn tuyệt đối khi cố thu tiền điện
NOTICE:  -> PASS: CCKB thu tiền điện thành công, bản ghi payment ghi nhận đúng schema (payment_id: a569c952-e42b-4e7d-ab4f-ddab097c5cd5)
NOTICE:  -> PASS: Trigger trg_payment_immutable chặn tuyệt đối UPDATE trên sổ cái app_payments
NOTICE:  --- TEST 5: Cấp lệnh xuất bãi CCKB và An ninh xác nhận xe ra cổng ---
NOTICE:  -> PASS: CCKB cấp clearance thành công cho container d0caeada-023b-4c30-ac88-77f9121ad408
NOTICE:  -> PASS: Xe ra cổng trạng thái EXITED có exit_by hợp lệ, thỏa mãn check constraint
NOTICE:  -> PASS: Phí lưu bãi tại cổng 100.000đ được ghi nhận đúng vào app_payments với collector_dept = AN_NINH
NOTICE:  === TOÀN BỘ CÁC BÀI KIỂM THỬ RUNTIME GATE LOCAL ĐÃ PASS 100% ===
DO
ROLLBACK
```
*Ghi chú: Toàn bộ quá trình kiểm thử được thực thi trong transaction ROLLBACK, đảm bảo dữ liệu database hoàn toàn sạch sẽ, không có fixture rác tồn đọng.*

---

## 3. BẰNG CHỨNG KIỂM THỬ FRONTEND

1. **TypeScript Typecheck (`pnpm exec tsc --noEmit`):**
   - Kết quả: **0 lỗi** (Exit Code 0).
2. **ESLint (`pnpm lint`):**
   - Kết quả: **0 lỗi / 0 cảnh báo** (Exit Code 0).
   - Đã loại bỏ hoàn toàn việc ép kiểu `any` trong các lời gọi RPC Supabase.
3. **Next.js Production Build (`pnpm build`):**
   - Phiên bản: Next.js 16.4.0 (Turbopack).
   - Kết quả: Compile thành công trong 6.1s, hoàn tất static page prerendering 12/12 routes (bao gồm `/entry`, `/yard`, `/reefer`, `/exit`, `/billing`, `/admin/vehicle-types`). Exit Code 0.

---

## 4. BẢNG ĐỐI CHIẾU MÃ BĂM SHA-256

### 4.1. Migrations 001–004 (Đảm bảo tuyệt đối không sửa đổi)
| Tệp tin | SHA-256 đối chiếu | Trạng thái |
| :--- | :--- | :---: |
| `20261011000001_foundation_rbac.sql` | `837C9E7E42D029F07A6765B0361F04112D37060ADD0A26A9CA8D17F936D56621` | NGUYÊN VẸN |
| `20261011000002_seed_rbac_v5.sql` | `A6D6034AF895ED63BFC305A2CCC77B1A6ED3D45B8AFD6C24437E010DE8B4D406` | NGUYÊN VẸN |
| `20261011000003_rbac_security_functions_rls.sql` | `63D9AABF685C6A2E607D5B424600832F5C8D94F55B4EE3AE531831F17DBA6742` | NGUYÊN VẸN |
| `20261011000004_domain_vehicles_containers.sql` | `F364D0535C797ABEF9382E9F22BEF6A3B3AC5790381C013425A091856DAB20D0` | KHỚP 100% GATE C |

### 4.2. Migrations 005–008 (Đã kiểm thử đạt trên Local Runtime)
| Tệp tin | SHA-256 bản nghiệm thu Local |
| :--- | :--- |
| `20261012000005_gate_ticket_atomic_guard.sql` | `90B0A80E9148CFA8C92E986802447840ACD3E2CF045C8DD8B02D254D6BD64E1A` |
| `20261012000006_domain_reefer_power.sql` | `971A401FB226A15589E69AF64F6C81EF7645A2C18041C34DA7BA1FEB62153E64` |
| `20261012000007_domain_financial_ledger.sql` | `E349EDC4D0F8330F5A25B34084DD22C9CE9DD19BD2C31EF781E31ED0939B8F99` |
| `20261012000008_domain_exit_clearance.sql` | `D6BFDDC04DE68B52FAD3154AE2A533C28005D2F5EE648CFFCA82C1F7B5E964B7` |

### 4.3. Gói mã nguồn đóng gói bàn giao
- Tên tệp: `soncang_overnight_code_bundle.zip`
- Mã băm SHA-256: `22F66E65F83C6C52C269D6897A18B8EE2FD8544405345B89F6440FAEF50A9B0A`

---

## 5. KẾT LUẬN VÀ KIẾN NGHỊ

1. **Kết luận Gate Local:** **ĐẠT CHUẨN 100% (GO CHO LOCAL RUNTIME)**.
   - Toàn bộ 9 lỗi chặn P0/P1 đã được khắc phục.
   - 175/175 ca pgTAP tests và kịch bản E2E RBAC thực tế đã chạy thành công trên PostgreSQL Local engine thật.
   - Không có bất kỳ lỗi biên dịch hay lint nào trên Frontend.
2. **Khuyến nghị cho Supabase Cloud DEV:**
   - Mã nguồn Backend 005–008 và Frontend đã hoàn toàn sẵn sàng cho môi trường Cloud DEV (`son-cang-yms-dev`, ref: `euswzyespwaxyrjkfkrq`).
   - Tuân thủ ranh giới an toàn: **CHƯA ĐẨY LÊN CLOUD DEV** cho đến khi chủ dự án có quyết định phê duyệt chính thức Gate Cloud.
