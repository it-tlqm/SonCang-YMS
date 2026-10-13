# BÁO CÁO NGHIỆM THU PHASE 1D-01: PWA SƠN CẢNG FIRST VERTICAL SLICE
**Dự án:** Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng  
**Đơn vị:** Công ty Cổ phần Tà Lùng Quang Minh  
**Môi trường:** Next.js 16 App Router + Tailwind CSS + Supabase Auth / Local Sandbox  
**Ngày báo cáo:** 11/10/2026  
**Mã băm Bundle Release (SHA-256):** `FAC4D6D9AC8D0EA8F208876191CE20DDE69C6D6789146EDC54DA26AA5E63A743` (`phase1d_01_pwa_bundle.zip`)

---

## 1. TỔNG QUAN KẾT QUẢ TRIỂN KHAI

Phase 1D-01 đã chuyển giao thành công **lát cắt dọc hoàn chỉnh đầu tiên (First Vertical Slice)** của ứng dụng PWA Sơn Cảng với giao diện người dùng thực tế chạy trên trình duyệt (`http://localhost:3000`).

### Các chức năng cốt lõi đã hoàn thành:
1. **Đăng nhập & Quản lý Định danh (Supabase Auth & Role Switcher):**
   - Hỗ trợ đăng nhập chuẩn Supabase Auth qua email/mật khẩu.
   - Thanh chuyển đổi vai trò tức thì (Role Switcher Demo) phục vụ chạy thử 4 nhóm chức danh:
     * **An ninh cổng:** `SEC_STAFF` (Nguyễn Văn An)
     * **Điều phối viên:** `DIS_STAFF` (Trần Thị Bình)
     * **Công chức kho bãi (CCKB):** `PORT_STAFF` (Lê Hoàng Cường)
     * **Quản trị hệ thống:** `SYS_ADMIN` (Phạm Minh Đức)
2. **Tiếp nhận Xe & Container tại Cổng vào (`/entry`):**
   - Thiết kế Mobile-first (tối ưu màn hình hẹp 390px và thao tác một tay).
   - Câu hỏi thực địa phân nhánh rõ ràng: **CÓ mang container / KHÔNG có container**.
   - Thực thi chính sách vé V5: Khi có container áp dụng vé 250.000đ; ngăn chặn chọn Đầu kéo 0đ.
   - Cơ chế bảo vệ Idempotency Key chống click trùng, double-submit.
   - Cảnh báo rủi ro P1 Backend Guard hiển thị minh bạch.
3. **Giám sát & Quản lý Container trong Bãi (`/yard`):**
   - Hiển thị danh sách phương tiện và container đang ở trạng thái `IN_YARD`.
   - 5 thẻ thống kê: Tổng xe, Tổng container, Cont HÀNG, Cont RỖNG, Chưa xác định.
   - Tìm kiếm nhanh theo biển số, số container, mã vé.
   - **Phân quyền Điều phối:** Chỉ vai trò `DIS_STAFF`, `DIS_LEAD`, `SYS_ADMIN` mới được mở Modal và cập nhật trạng thái HÀNG/RỖNG. An ninh và CCKB chỉ có quyền xem (Read-only).
4. **Quản trị Danh mục Phương tiện (`/admin/vehicle-types`):**
   - Chỉ tài khoản `SYS_ADMIN` mới có quyền truy cập.
   - Hiển thị 7 loại xe khởi tạo chuẩn của Migration 004.
   - Hộp cảnh báo AP10 Four-Eyes: Nghiêm cấm sửa đổi giá vé trực tiếp tại danh mục, biểu phí phiên bản quản lý qua quy trình phê duyệt 2 người.

---

## 2. KẾT QUẢ KIỂM THỬ TĨNH VÀ RUNTIME

### 2.1. Kiểm thử tĩnh (Static Verification)
| Hạng mục | Lệnh thực thi | Kết quả | Trạng thái |
| :--- | :--- | :--- | :---: |
| **TypeScript Typecheck** | `pnpm exec tsc --noEmit` | **0 errors** (Exit code 0) | **PASS** |
| **ESLint Rules** | `pnpm lint` | **0 errors, 0 warnings** (Exit code 0) | **PASS** |
| **Next.js Production Build** | `pnpm build` | **8/8 routes generated** (Exit code 0) | **PASS** |

### 2.2. Kiểm thử Runtime HTTP (Localhost:3000)
| Endpoint Route | HTTP Method | Response Status | Nội dung hiển thị |
| :--- | :---: | :---: | :--- |
| `http://localhost:3000/login` | GET | **200 OK** | Màn hình đăng nhập & Chuyển đổi nhanh 4 vai trò demo |
| `http://localhost:3000/entry` | GET | **200 OK** | Form tiếp nhận cổng An ninh, Mobile-first |
| `http://localhost:3000/yard` | GET | **200 OK** | Bảng giám sát bãi, 5 card thống kê, modal điều phối |
| `http://localhost:3000/admin/vehicle-types` | GET | **200 OK** | Bảng danh mục 7 loại xe, kiểm soát AP10 |

---

## 3. BẢO ĐẢM AN TOÀN VÀ RANH GIỚI KỸ THUẬT

1. **Bảo toàn môi trường Supabase Cloud DEV:**
   - Hoàn toàn KHÔNG chạy `db push`, `db reset` hay thực thi SQL nào trong suốt Phase 1D-01.
   - Dự án `son-cang-yms-dev` (ref: `euswzyespwaxyrjkfkrq`) giữ nguyên vẹn 100% schema Migration 004 đã triển khai tại Gate C.
   - Dữ liệu demo chạy thử được lưu trữ hoàn toàn tại Local Storage của trình duyệt (`soncang_demo_vehicles`, `soncang_demo_containers`), không phát sinh dữ liệu rác trên Cloud DEV.
2. **Không dùng Secret Key:**
   - Phía Client chỉ sử dụng `NEXT_PUBLIC_SUPABASE_ANON_KEY`, tuyệt đối không dùng `service_role` key hay bypass RLS.
3. **Phân quyền chuẩn RBAC V5:**
   - 8 vai trò và 67 mã quyền được ánh xạ chính xác từ Workbook RBAC V5.

---

## 4. GHI NHẬN RỦI RO & KHUYẾN NGHỊ BACKEND

> [!WARNING]
> **Rủi ro P1 Backend Guard (Quy tắc Vé Xe chở Container):**
> Trong Migration 004, RPC Backend chưa có ràng buộc chặn trường hợp người dùng/API gửi `vehicle_type = 'DAU_KEO'` (giá 0đ) kèm theo `container_no`.
> Tại Phase 1D-01, giao diện Client đã chủ động thực thi validation này (ngăn chặn chọn Đầu kéo 0đ khi có container). Tuy nhiên, để đảm bảo toàn vẹn nghiệp vụ, **cần xây dựng một Migration bản vá Backend (Hotfix RPC)** bổ sung exception `SC_INVALID_TICKET_VEHICLE_TYPE` khi có container.

---

## 5. HƯỚNG DẪN TRẢI NGHIỆM TRỰC TIẾP TRÊN TRÌNH DUYỆT

Người dùng có thể kiểm tra trực tiếp giao diện đang chạy nền tại:
**`http://localhost:3000`**

### Kịch bản kiểm thử khuyến nghị:
1. **Kiểm thử An ninh tiếp nhận (`/entry`):**
   - Đăng nhập với vai trò **An ninh cổng** (Nguyễn Văn An).
   - Chọn **"CÓ mang container"** -> Thấy loại xe "Đầu kéo không cont (0đ)" bị disabled, tổng tiền vé tự động nhảy 250.000đ.
   - Nhập Biển số `98C-888.88`, Số container `TGHU9876543`, bấm **"XÁC NHẬN TIẾP NHẬN VÀO CỔNG"**.
   - Thấy vé cổng được cấp ngay lập tức, chuyển sang trang Giám sát bãi.
2. **Kiểm thử Điều phối cập nhật Hàng/Rỗng (`/yard`):**
   - Tại thanh Header, bấm vào Avatar vai trò và đổi sang **Điều phối viên** (Trần Thị Bình).
   - Ở bảng Container, tìm container `TGHU9876543` (đang có trạng thái *Chưa xác định*).
   - Bấm nút **"Cập nhật HÀNG/RỖNG"** -> Chọn **"HÀNG"** và bấm Lưu.
   - Đổi lại vai trò sang **An ninh cổng** hoặc **CCKB** -> Nút cập nhật biến mất, trạng thái trở thành Read-only (chỉ xem nhãn *HÀNG*).
3. **Kiểm thử Phân quyền Quản trị (`/admin/vehicle-types`):**
   - Khi ở vai trò An ninh/Điều phối/CCKB: Trang hiển thị thông báo **"Khu vực Quản trị Hệ thống - Từ chối truy cập"**.
   - Đổi vai trò sang **Quản trị hệ thống** (Phạm Minh Đức) -> Xem đầy đủ danh mục 7 loại xe và cảnh báo AP10 Four-Eyes.
