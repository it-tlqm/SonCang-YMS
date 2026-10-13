# SƠN CẢNG PWA — OVERNIGHT FILE CHANGELOG
**Thời gian:** 12/10/2026 09:20 (Asia/Ho_Chi_Minh)  
**Chế độ:** Autonomous Overnight Build & Deep PWA Upgrade

---

## 1. MIGRATIONS BACKEND MỚI (CODE-ONLY / LOCAL TESTED / DEPLOY PENDING)
1. `supabase/migrations/20261012000005_gate_ticket_atomic_guard.sql`:
   - Bổ sung bảng `app_yard_billing_settings` với `empty_in_loaded_out_surcharge_enabled` mặc định false.
   - Sửa `sc_create_container_visit` để tự động điều chỉnh vé xe đầu kéo từ 0đ thành 250.000đ khi phát hiện container inbound.
   - Bổ sung RPC nguyên tử `sc_create_vehicle_and_container_visit_atomic` (All-or-Nothing, idempotency).
2. `supabase/migrations/20261012000006_domain_reefer_power.sql`:
   - Bổ sung bảng `app_reefer_power_sessions` quản lý phiên cắm điện container.
   - Unique Partial Index chống 2 phiên `PLUGGED` đồng thời trên cùng một container.
   - Hàm `sc_calculate_reefer_fee` làm tròn 15 phút (`CEIL(seconds / 900) * 15`), đơn giá 100k/h, xử lý ca 0s (RV02).
   - RPC `sc_plug_in_reefer` và `sc_unplug_reefer`.
3. `supabase/migrations/20261012000007_domain_financial_ledger.sql`:
   - Bổ sung bảng `app_tariffs` (Biểu phí versioned).
   - Bổ sung bảng `app_charges` (Khoản phải thu: TICKET, REEFER, STORAGE).
   - Bổ sung bảng `app_payments` (Sổ cái thực thu bất biến - Immutable Ledger).
   - RPC `sc_collect_payment` kiểm soát phân quyền chặt chẽ: An ninh TUYỆT ĐỐI KHÔNG được thu tiền điện; CCKB thu tiền điện; An ninh thu lưu bãi (AP07).
4. `supabase/migrations/20261012000008_domain_exit_clearance.sql`:
   - Bổ sung cột clearance và phí lưu bãi trong `app_container_visits`.
   - Hàm `sc_calculate_storage_fee` tính số đêm 22h-06h, miễn đêm đầu, 100k/đêm.
   - RPC `sc_approve_exit_clearance` (CCKB duyệt clearance & ngoại lệ nợ AP06).
   - RPC `sc_confirm_physical_exit` (An ninh xác nhận xuất bãi vật lý tại cổng).

---

## 2. PGTAP TESTS MỚI
1. `supabase/tests/005_gate_ticket_atomic_guard.test.sql`: 15 assertions kiểm thử guard vé đầu kéo và RPC nguyên tử.
2. `supabase/tests/006_reefer_power.test.sql`: 12 assertions kiểm thử cắm/rút điện, làm tròn 15p, chống trùng active session.
3. `supabase/tests/007_financial_ledger.test.sql`: 8 assertions kiểm thử sổ cái bất biến và phân quyền thu tiền.
4. `supabase/tests/008_exit_clearance.test.sql`: 10 assertions kiểm thử tính phí lưu bãi, CCKB clearance và xuất bãi.

---

## 3. TYPES & SERVICES FRONTEND
1. `src/types/domain.types.ts`:
   - Thêm `ReeferPowerSession`, `ReeferPowerStatus`.
   - Thêm `ChargeItem`, `PaymentRecord`, `TariffItem`, `ChargeType`, `ChargeStatus`.
   - Thêm `ContainerNumberChange` (lưu vết lịch sử sửa số container).
   - Bổ sung các trường `clearance_status`, `storage_fee_amount`, `storage_nights_charged` vào `ContainerVisit`.
2. `src/lib/services/repository-interface.ts`:
   - Thêm các interface tham số: `PlugInReeferParams`, `UnplugReeferParams`, `CollectPaymentParams`, `ApproveClearanceParams`, `ConfirmExitParams`, `CorrectContainerNumberParams`.
   - Mở rộng `IYardRepository` với: `correctContainerNumber`, `getContainerNumberChanges`.
3. `src/lib/services/demo-repository.ts`:
   - Triển khai đầy đủ tất cả các nghiệp vụ trong Sandbox LocalStorage: điện container (làm tròn 15p), sổ cái thu tiền (chặn An ninh thu điện), duyệt clearance và chốt phí lưu bãi (miễn đêm đầu), sửa số container (bảo toàn ID lượt).
4. `src/lib/services/supabase-repository.ts`:
   - Đọc dữ liệu typed từ Supabase.
   - Toàn bộ các thao tác ghi Cloud DEV mới đều được khóa an toàn (`BLOCKED`) có chủ đích kèm thông báo minh bạch.

---

## 4. GIAO DIỆN PWA & APP SHELL
1. `src/app/dashboard/page.tsx` (MỚI):
   - Màn hình trung tâm tổng quan vận hành: KPI xe trong bãi, cont lưu bãi, cắm điện active, doanh thu ca.
   - Biểu đồ phân bổ 7 loại xe V5.
   - Cảnh báo container lưu bãi > 24h (nguy cơ tính phí đêm thứ 2 theo AP07).
   - Phân bổ HÀNG / RỖNG.
2. `src/app/yard/page.tsx` (CẬP NHẬT):
   - Bổ sung nút & Modal Sửa số container (nhập số mới, lý do >= 3 ký tự, bằng chứng).
   - Bổ sung Modal xem timeline lịch sử đổi số container.
   - Bổ sung badge hiển thị số lần đổi số cạnh mã container.
3. `src/components/layout/app-shell.tsx`:
   - Thêm mục `/dashboard` vào đầu menu điều hướng với icon `LayoutDashboard`.
4. `src/app/page.tsx`:
   - Điều hướng vai trò quản trị (`SYS_ADMIN`, `PORT_LEAD`) vào thẳng `/dashboard`.

---

## 5. PWA COMPLIANCE (OFFLINE-READY & MANIFEST)
1. `public/manifest.json`: Web App Manifest chuẩn PWA Sơn Cảng (`#223873`, `#F5F8FA`).
2. `public/sw.js`: Service Worker caching chiến lược stale-while-revalidate và network-first với offline fallback HTML.
3. `public/icons/icon-192.svg`: Icon chuẩn 192x192 SVG thương hiệu Sơn Cảng.
4. `public/icons/icon-512.svg`: Icon chuẩn 512x512 SVG thương hiệu Sơn Cảng.
5. `src/components/pwa-register.tsx`: Component client tự động đăng ký Service Worker khi tải trang.
6. `src/app/layout.tsx`: Gắn manifest, metadata PWA, và nạp component `PwaRegister`.
