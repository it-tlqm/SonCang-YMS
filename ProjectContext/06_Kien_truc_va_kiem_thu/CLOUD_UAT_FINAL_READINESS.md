# BÁO CÁO CHỐT TÍCH HỢP PWA & SẴN SÀNG UAT CLOUD DEV
**Dự án:** Quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Môi trường Cloud DEV:** `son-cang-yms-dev` (Ref: `euswzyespwaxyrjkfkrq`, URL: `https://euswzyespwaxyrjkfkrq.supabase.co`)  
**Ngày lập:** 12/10/2026  
**Trạng thái tổng thể:** SẴN SÀNG UAT (READY FOR CLOUD DEV UAT)

---

## I. TỔNG HỢP KẾT QUẢ THỰC HIỆN

| Hạng mục | Yêu cầu | Kết quả thực tế | Trạng thái |
|---|---|---|---|
| **1. Loại bỏ Hard-block Real Mode** | Không hard-block các trang `/entry`, `/yard`, `/reefer`, `/billing`, `/exit` độc lập với feature flag | Đã xóa toàn bộ logic chặn tĩnh `authMode === 'REAL'`, giao diện mở khóa và điều hướng chuẩn xác | **ĐẠT (PASS)** |
| **2. Feature Flag Bảo vệ Ghi** | `NEXT_PUBLIC_ENABLE_REAL_WRITE` kiểm soát gọi ghi Supabase | Mặc định tắt (OFF). Khi tắt, hiển thị thông báo rõ ràng; khi bật, gọi SupabaseRepository với RBAC/RLS thực tế | **ĐẠT (PASS)** |
| **3. Tiếp nhận xe nguyên tử** | Xe có cont bắt buộc gọi RPC nguyên tử trong 1 transaction | Triển khai `sc_create_vehicle_and_container_visit_atomic`, xử lý đồng thời xe + container, không phân mảnh | **ĐẠT (PASS)** |
| **4. Yard ID chuẩn cơ sở dữ liệu** | Không dùng ID bãi giả cho bất kỳ vai trò nào (kể cả SYS_ADMIN) | `fetchRealUserProfile` tự động truy vấn `app_yards` lấy ID bãi thật "Bãi Sơn Cảng" (`fe83bb2b-833e-412c-aed4-b9a781a6decd`) | **ĐẠT (PASS)** |
| **5. Chuẩn hóa Kế hoạch UAT** | Cập nhật `UAT_ACCOUNTS_PLAN.md` theo schema thật 001–004 | Dùng `created_by`, `WHERE NOT EXISTS`, raise exception khi thiếu tài khoản, xác định đúng bãi Sơn Cảng | **ĐẠT (PASS)** |
| **6. Khởi tạo 7 tài khoản UAT** | Tạo qua Supabase Auth Admin API trên Cloud DEV với email `@example.com` | Tạo thành công 7 tài khoản, kích hoạt `email_confirm: true`, mật khẩu ngẫu nhiên >= 24 ký tự | **ĐẠT (PASS)** |
| **7. Gán 7 vai trò chuẩn RBAC V5** | Gán vai trò vào `app_user_role_assignments` trên Cloud DEV | Gán chính xác 7 vai trò tương ứng với ID bãi Sơn Cảng thực tế | **ĐẠT (PASS)** |
| **8. Kiểm thử đăng nhập & quyền** | Đăng nhập thực tế và gọi RPC `sc_my_permissions()` | 7/7 tài khoản đăng nhập thành công và nhận đủ quyền hạn chuẩn RBAC V5 | **ĐẠT (PASS)** |
| **9. Chất lượng mã nguồn** | TypeScript, ESLint, Next.js build, Smoke test | 0 errors TypeScript, 0 lỗi lint, Next.js build hoàn tất, Smoke test pass | **ĐẠT (PASS)** |

---

## II. CHI TIẾT TÍCH HỢP PWA FRONTEND

### 1. Loại bỏ toàn bộ Hard-Block tĩnh
Trước đây, các trang nghiệp vụ có điều kiện chặn cứng `if (authMode === 'REAL')` khiến người dùng ở chế độ thực tế không thể thao tác ngay cả khi đã cấu hình backend. Toàn bộ các điểm này đã được xử lý:
- `/entry`: Nút "Tiếp nhận xe" mở khóa; khi submit sẽ gọi `repository.createVehicleEntry(...)` tích hợp nguyên tử.
- `/yard`: Modal cập nhật trạng thái HÀNG/RỖNG và Modal sửa số container mở khóa cho các vai trò được phép.
- `/reefer`: Nút cắm điện và rút điện container lạnh mở khóa, gọi `repository.plugInReefer` và `repository.unplugReefer`.
- `/billing`: Nút thu tiền vé/phí mở khóa, xử lý thanh toán qua `repository.collectPayment`.
- `/exit`: Nút duyệt xuất bãi (Clearance) và nút xác nhận rời bãi (Gate Exit) mở khóa cho CCKB và An ninh.

### 2. Tiếp nhận xe và Container nguyên tử (Atomic Inbound)
- Mở rộng giao diện `IYardRepository.createVehicleEntry(params)` để nhận thông tin container đính kèm (`containerNo`, `containerSize`, `containerType`, `cargoStatus`).
- Trong `SupabaseRepository`: Khi `hasContainer === true`, tự động thực thi hàm RPC `sc_create_vehicle_and_container_visit_atomic` với đầy đủ tham số nghiệp vụ và `idempotency_key`. Toàn bộ quá trình tạo lượt xe và lượt container diễn ra trong một giao dịch cơ sở dữ liệu duy nhất, loại bỏ hoàn toàn rủi ro xe vào nhưng mất thông tin container.
- Trong `DemoRepository`: Mô phỏng chính xác tạo đồng thời `VehicleVisit` và `ContainerVisit` trong bộ nhớ cục bộ, bảo đảm tính nhất quán giữa hai chế độ.

### 3. Cơ chế Feature Flag ghi Cloud an toàn
- Kiểm soát qua hàm `isRealWriteEnabled()` dựa trên biến môi trường `NEXT_PUBLIC_ENABLE_REAL_WRITE`.
- **Mặc định:** `NEXT_PUBLIC_ENABLE_REAL_WRITE="false"` (hoặc không thiết lập). Khi đó:
  - Các thao tác đọc (`SELECT`) trên Supabase Cloud DEV vẫn hoạt động bình thường.
  - Các thao tác ghi nghiệp vụ (`INSERT`, `UPDATE`, `RPC write`) sẽ chủ động bị chặn an toàn ở tầng repository kèm thông báo hướng dẫn rõ ràng: *"Chế độ ghi Cloud DEV đang bị khóa bởi Feature Flag (NEXT_PUBLIC_ENABLE_REAL_WRITE=false)..."*
  - Khi chủ dự án chính thức cho phép thử nghiệm ghi trên Cloud DEV, chỉ cần đặt biến môi trường thành `"true"` mà không phải sửa thêm bất kỳ dòng mã nào.

---

## III. KẾT QUẢ KHỞI TẠO 7 TÀI KHOẢN UAT TRÊN SUPABASE CLOUD DEV

### 1. Thông tin định danh bãi thực tế
- **Tên bãi:** Bãi Sơn Cảng
- **Yard ID (Cloud DEV):** `fe83bb2b-833e-412c-aed4-b9a781a6decd`

### 2. Bảng kết quả xác thực và kiểm thử phân quyền (Live Test)

Kiểm thử được thực hiện bằng cách đăng nhập trực tiếp qua Supabase Auth SDK (`signInWithPassword`) với token JWT của từng tài khoản, sau đó gọi RPC `sc_my_permissions()` từ server:

| STT | Tài khoản Email UAT | Mã vai trò | Tên vai trò | Trạng thái đăng nhập | Số lượng quyền (`sc_my_permissions`) | Các quyền trọng yếu |
|---|---|---|---|---|---|---|
| 1 | `sys_admin_uat@example.com` | `SYS_ADMIN` | Quản trị viên hệ thống | **PASS** | **60** | Toàn quyền quản trị, biểu phí, audit log |
| 2 | `sec_staff_uat@example.com` | `SEC_STAFF` | Nhân viên An ninh cổng | **PASS** | **26** | `vehicle.visit.create`, `ticket.payment.collect`, `gate.exit` |
| 3 | `sec_lead_uat@example.com` | `SEC_LEAD` | Tổ trưởng An ninh cổng | **PASS** | **31** | Gồm quyền An ninh + `container.number.correct` |
| 4 | `cckb_staff_uat@example.com` | `PORT_STAFF` | Nhân viên CCKB / Cảng vụ | **PASS** | **31** | `reefer.session.*`, `storage.payment.collect`, `reefer.payment.collect` |
| 5 | `cckb_lead_uat@example.com` | `PORT_LEAD` | Lãnh đạo CCKB / Cảng vụ | **PASS** | **38** | Gồm quyền CCKB + `container.clearance.approve`, `debt.allow` |
| 6 | `dis_staff_uat@example.com` | `DIS_STAFF` | Nhân viên Điều phối bãi | **PASS** | **9** | `container.cargo.update`, `yard.slot.*`, `container.visit.read` |
| 7 | `dis_lead_uat@example.com` | `DIS_LEAD` | Tổ trưởng Điều phối bãi | **PASS** | **11** | Gồm quyền Điều phối + giám sát toàn bãi, kiểm tra sai lệch |

### 3. An toàn bảo mật thông tin đăng nhập
- **Quy tắc tuân thủ:** Tuyệt đối không ghi mật khẩu trần hoặc Service Role Key vào git commit, báo cáo, log hay gói zip bàn giao.
- **Vị trí lưu trữ:** Toàn bộ danh sách tài khoản kèm mật khẩu ban đầu được lưu trữ tại kho lưu trữ bảo mật cục bộ của môi trường phát triển:
  `C:\Users\private\.gemini\antigravity\brain\04a2ceca-6c82-43e2-8b27-5c43c094b2d4\scratch\uat_credentials_safe.json` (nằm ngoài không gian làm việc Git).
- Thông tin đăng nhập cụ thể sẽ được bàn giao riêng qua kênh bảo mật cho Chủ dự án khi tiến hành phiên UAT.

---

## IV. BẰNG CHỨNG KIỂM THỬ KỸ THUẬT

1. **TypeScript Typecheck:**
   ```bash
   pnpm exec tsc --noEmit
   # Kết quả: Exit code 0, không có bất kỳ lỗi kiểu dữ liệu nào.
   ```

2. **ESLint Code Quality:**
   ```bash
   pnpm lint
   # Kết quả: Exit code 0, 0 errors, 0 warnings.
   ```

3. **Smoke Test Luồng Tiếp Nhận Nguyên Tử:**
   ```bash
   node scripts/smoke_test_atomic_entry.mjs
   # Kết quả:
   # [Test 1] Kiểm tra Feature Flag NEXT_PUBLIC_ENABLE_REAL_WRITE -> OFF (PASS)
   # [Test 2] Kiểm tra RPC sc_create_vehicle_and_container_visit_atomic trên Local DB -> PASS (ROLLBACK sạch)
   # Tất cả smoke tests vượt qua.
   ```

4. **Next.js Production Build:**
   ```bash
   pnpm build
   # Kết quả: Compile thành công trong 1606ms, 12/12 static pages tối ưu hóa hoàn tất.
   ```

---

## V. CAM KẾT VÀ GIỚI HẠN AN TOÀN

- [x] **KHÔNG tự ý áp dụng Migration 005–008 lên Supabase Cloud DEV** (vẫn giữ nguyên Cloud DEV ở mức Migration 001–004 đã được phê duyệt ở Gate C).
- [x] **KHÔNG bật Feature Flag ghi thực tế (`NEXT_PUBLIC_ENABLE_REAL_WRITE="false"`)**.
- [x] **KHÔNG để lộ Service Role Key hoặc Mật khẩu trong mã nguồn hay tài liệu bàn giao**.
- [x] Hệ thống đã sẵn sàng 100% để Chủ dự án nghiệm thu giao diện PWA và khởi động phiên kiểm thử UAT có kiểm soát trên Cloud DEV.
