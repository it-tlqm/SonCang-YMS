# SƠN CẢNG PWA — OVERNIGHT TEST RESULTS
**Thời gian:** 12/10/2026  
**Chế độ:** Autonomous Overnight Build

---

## 1. KIỂM THỬ TĨNH (STATIC ANALYSIS)

| Hạng mục kiểm thử | Lệnh thực thi | Kết quả | Chi tiết |
|---|---|---|---|
| **TypeScript Typecheck** | `pnpm exec tsc --noEmit` | **PASS (Exit code 0)** | 0 errors. Toàn bộ mã nguồn typed 100%. |
| **ESLint Analysis** | `pnpm lint` | **PASS (Exit code 0)** | 0 errors, 0 warnings. Tuân thủ nghiêm ngặt các quy tắc React 19 và Next.js 16. |
| **Production Build** | `pnpm build` (Turbopack) | **PASS (Exit code 0)** | Compiled trong 3.1s, biên dịch thành công 11/11 pages. |

---

## 2. KIỂM THỬ RUNTIME & HTTP SMOKE TEST

Đã khởi động Next.js production server trên `http://localhost:3000` và kiểm tra phản hồi của toàn bộ 7 routes ứng dụng:

| STT | Route PWA | Mục đích nghiệp vụ | HTTP Status | Màn hình Stitch đối chiếu |
|---|---|---|---|---|
| 1 | `/login` | Đăng nhập hệ thống (Tách biệt Real Mode & Demo Sandbox) | **200 OK** | Screen 1: `login_screen` |
| 2 | `/entry` | An ninh tiếp nhận xe & container vào cổng (Guard vé 250k) | **200 OK** | Screen 2 & 3: `gate_inbound_vehicle` / `gate_inbound_container` |
| 3 | `/yard` | Giám sát bãi xe/container & Điều phối cập nhật HÀNG/RỖNG | **200 OK** | Screen 4 & 5: `yard_inventory` / `cargo_status_modal` |
| 4 | `/reefer` | Giám sát cắm/rút điện container lạnh (Làm tròn 15p) | **200 OK** | Screen 7: `reefer_monitoring` |
| 5 | `/billing` | Sổ cái tài chính, thu phí (Chặn An ninh thu tiền điện) | **200 OK** | Screen 8: `cashier_billing` |
| 6 | `/exit` | CCKB duyệt Clearance & An ninh xác nhận cổng ra vật lý | **200 OK** | Screen 9: `gate_outbound_clearance` |
| 7 | `/admin/vehicle-types` | Quản trị danh mục 7 loại xe V5 & biểu phí | **200 OK** | Screen 6: `vehicle_types_config` |

---

## 3. KIỂM THỬ BACKEND PGTAP (CODE-ONLY TEST SUITE)

Các bộ test pgTAP đã được viết hoàn chỉnh để sẵn sàng chạy kiểm thử tại Gate tiếp theo:

| File Test | Module kiểm thử | Số assertions | Trạng thái mã |
|---|---|---|---|
| `supabase/tests/005_gate_ticket_atomic_guard.test.sql` | Guard vé đầu kéo mang cont (250k), đầu kéo không cont (0đ), RPC nguyên tử, all-or-nothing rollback | 15 assertions | **CODE_READY** (Chờ test Gate) |
| `supabase/tests/006_reefer_power.test.sql` | Quy tắc làm tròn 15 phút, snapshot giá 100k/h, xử lý ca 0s (RV02), chống 2 phiên cắm điện trùng lặp | 12 assertions | **CODE_READY** (Chờ test Gate) |
| `supabase/tests/007_financial_ledger.test.sql` | Sổ cái thực thu bất biến, kiểm tra phân quyền chặt chẽ (An ninh cấm thu điện, CCKB thu điện, An ninh thu lưu bãi AP07) | 8 assertions | **CODE_READY** (Chờ test Gate) |
| `supabase/tests/008_exit_clearance.test.sql` | Tính phí lưu bãi (miễn đêm đầu, 100k/đêm), CCKB duyệt clearance & ngoại lệ nợ AP06, An ninh chốt ra bãi | 10 assertions | **CODE_READY** (Chờ test Gate) |
