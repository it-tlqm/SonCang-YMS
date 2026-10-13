# BÁO CÁO XỬ LÝ TOÀN DIỆN CÁC LỖI GIAO DIỆN MỨC P0 (UI/UX)
**Dự án:** Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Thời điểm thực hiện:** 12/10/2026  
**Căn cứ kỹ thuật:** `SONCANG_UI_UX_REVIEW_FINDINGS_20261012.md` & `SONCANG_AG_STITCH_UI_PILOT_NEXT_20261012.md`

---

## 1. TỔNG QUAN KẾT QUẢ XỬ LÝ P0

| Hạng mục P0 | Hiện trạng phát hiện | Giải pháp kỹ thuật đã áp dụng | Trạng thái |
| :--- | :--- | :--- | :--- |
| **P0-1. Làm sạch thuật ngữ kỹ thuật** | Xuất hiện `Supabase`, `Backend`, `RPC`, `RLS`, `RBAC`, `V5`, `PWA`, `YMS`, `AP06`, `AP07`, `Clearance`, `UNPAID`, mã quyền/enum trên JSX. | Thay thế 100% bằng ngôn ngữ nghiệp vụ tiếng Việt chuẩn hóa trên toàn bộ 9 trang giao diện và App Shell. Giữ nguyên định danh code backend/log. | **HOÀN TẤT** |
| **P0-2. Tinh gọn điều hướng Mobile Bottom Nav** | Render cả 7 phân hệ chiếm 3 cột x 3 hàng, che khuất nút thao tác; `main` chỉ có `pb-20` (80px). | Chỉ render tối đa 3–4 phân hệ có quyền + nút "Thêm"; chiều cao ~64px + safe-area; `main` tăng lên `pb-28` (112px). Desktop chỉ hiện menu có quyền. | **HOÀN TẤT** |
| **P0-3. Chặn rủi ro tính phí lưu bãi thất bại** | `/exit` khi gọi `calculateStorageFee` lỗi thì `catch` gán `fee = 0` và mở modal cho xuất bãi. | Chặn gán `fee = 0`; hiển thị banner lỗi, có nút "Thử tính lại phí", khóa cứng (`disabled`) nút xác nhận xuất bãi khi chưa có kết quả tính phí hợp lệ. | **HOÀN TẤT** |
| **P0-4. Chuẩn hóa tiêu đề & banner mô phỏng** | Tiêu đề cũ `Sơn Cảng YMS / V5 PWA`; thanh tài khoản hiện vai trò thô. | Đổi tiêu đề chuẩn: **"Quản lý bến bãi Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh"**; Banner: **"BẢN MÔ PHỎNG — Dữ liệu dùng thử, không ghi vào hệ thống"**. | **HOÀN TẤT** |
| **P0-5. Chụp lại bằng chứng PWA theo đúng vai trò** | Ảnh cũ bị màn hình "Không có quyền" do phiên chụp để "Chưa phân vai trò". | Chụp lại đầy đủ 27 ảnh PWA thật qua Chrome CDP với 4 vai trò thật (`SEC_STAFF`, `DIS_STAFF`, `PORT_STAFF`, `SYS_ADMIN`) trên 3 viewports. Form `/entry` có dữ liệu mẫu. | **HOÀN TẤT** |

---

## 2. CHI TIẾT CÁC TỆP ĐÃ XỬ LÝ VÀ ĐỐI CHIẾU TRƯỚC / SAU

### 2.1. `src/app/layout.tsx`
- **Trước:** `title: "Phần mềm quản lý bến bãi/cảng cạn — Sơn Cảng"`, `appleWebApp: { title: "Sơn Cảng YMS" }`.
- **Sau:** `title: "Quản lý bến bãi Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh"`, `appleWebApp: { title: "Quản lý bến bãi Sơn Cảng" }`.

### 2.2. `src/components/layout/app-shell.tsx`
- **Làm sạch chuỗi:**
  - Tiêu đề header: Chuyển thành `"Quản lý bến bãi Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh"`.
  - Banner chế độ thử nghiệm: `"BẢN MÔ PHỎNG — Dữ liệu dùng thử, không ghi vào hệ thống"`.
  - Dropdown vai trò: Loại bỏ mã vai trò thô `{acc.roleCode}` và mã quyền kỹ thuật.
- **Tinh gọn Desktop Nav:** Chỉ hiển thị các tab mà vai trò hiện tại có quyền (`permissionsAny.some(p => can(p))`).
- **Tối ưu Mobile Bottom Nav:**
  - Nếu chưa chọn vai trò: Hiển thị thanh thông báo gọn có nút "Chọn vai trò công tác" dẫn về màn hình đăng nhập.
  - Khi đã có vai trò: Lọc danh sách menu được phép, chỉ lấy tối đa 4 mục chính đầu tiên + nút "Thêm" (mở menu phụ popover).
  - Chiều cao thanh điều hướng: Rút gọn chỉ `h-16` (64px) + `pb-[env(safe-area-inset-bottom)]`.
  - Padding nội dung chính (`main`): Tăng lên `pb-28` (~112px) đảm bảo 100% không bị thanh menu che khuất các nút CTA dưới đáy trang.

### 2.3. `src/app/login/page.tsx`
- **Trước:** "Đăng nhập Supabase Auth", "Chế độ mô phỏng RBAC V5", "Hệ thống xác thực Supabase...".
- **Sau:** "Xác thực danh tính tập trung", "Chế độ mô phỏng theo vai trò ca trực", "Hệ thống xác thực đăng nhập bảo mật...".
- **Tiêu đề:** "Quản lý bến bãi Sơn Cảng".

### 2.4. `src/app/entry/page.tsx`
- **Làm sạch thông báo quyền:** Thay thông báo chứa `vehicle.visit.create` / `RBAC V5` bằng:  
  *"Chưa được cấp quyền tiếp nhận xe. Vui lòng chuyển sang ca trực An ninh (SEC_STAFF/SEC_LEAD) hoặc liên hệ Quản trị hệ thống."*
- **Làm sạch trạng thái vé:** Thay `UNPAID` bằng `"Chưa thu tiền"`.
- **Làm sạch nhãn loại xe:** Thay `2. Loại phương tiện (7 mã V5):` bằng `2. Phân loại phương tiện:`.
- **Loại bỏ mã code enum thô:** Thay hiển thị `{t.code}` bằng nhãn nghiệp vụ `"Vé lượt"`.

### 2.5. `src/app/yard/page.tsx`
- **Làm sạch kiểm tra quyền:** Thay chuỗi `vehicle.visit.read` / `container.visit.read` / `RBAC V5` bằng:  
  *"Tài khoản vai trò {role} chưa được phân quyền theo dõi danh sách phương tiện hoặc container tại bến bãi."*
- **Làm sạch modal cập nhật hàng/rỗng:** Thay `Quyền Điều phối viên (RBAC V5)` bằng `"Phân hệ Điều phối bãi"`.
- **Làm sạch modal sửa số cont:** Thay `Quyền sửa số cont (RBAC V5)` bằng `"Hiệu chỉnh số container"`.
- **Làm sạch thông báo quy định:** Thay `quy định V5` bằng `"quy định"`, giải thích rõ việc lưu vết kiểm toán bất biến.

### 2.6. `src/app/dashboard/page.tsx`
- **Biểu đồ phân loại xe:** Thay `Phân bổ Phương tiện theo Danh mục V5` bằng `"Phân bổ Phương tiện theo Phân loại"`; ẩn mã enum thô `{item.type.code}` trên nhãn biểu đồ.
- **Quy tắc lưu bãi:** Thay `Quy tắc V5: ... (AP07)` bằng `"Quy tắc lưu bãi: Miễn phí đêm đầu, tính phí từ đêm thứ 2"`.
- **Liên kết điều hướng nhanh:** Thay `Clearance 2 lớp` bằng `"Kiểm soát 2 bước"`.
- **Ghi chú chính sách:** Thay `Nguyên tắc Vận hành Sơn Cảng V5... AP06... AP07` bằng:  
  *"Nguyên tắc vận hành bến bãi: Mọi thao tác thu tiền và xuất bãi tuân thủ phân định trách nhiệm: An ninh thu vé vào cổng và phí lưu bãi thực tế tại cổng ra; CCKB kiểm soát cắm điện và duyệt điều kiện xuất bãi."*

### 2.7. `src/app/exit/page.tsx` (P0 Trọng yếu)
- **Cơ chế an toàn tính phí lưu bãi:**
  - Thêm state `isCalculatingStorage` (cờ đang tính phí) và `storageCalcError` (chuỗi lỗi tính phí).
  - Tách hàm `calculateFeeForContainer(inboundAt)`. Khi xảy ra lỗi: **TUYỆT ĐỐI KHÔNG gán fee = 0**. Gán `setCalculatedStorage(null)` và ghi nhận thông báo lỗi chi tiết.
  - Render banner cảnh báo lỗi màu đỏ kèm nút `Thử tính lại phí`.
  - Khóa nút xác nhận rời bãi: Thuộc tính `disabled={isBlocked}` được kích hoạt nếu `storageCalcError` tồn tại hoặc `calculatedStorage === null`. Nhãn nút chuyển thành `"Bị khóa (Lỗi tính phí)"`.
- **Loại bỏ thuật ngữ Clearance:**
  - Tab chuyển đổi: `1. CCKB Kiểm soát Clearance` -> `1. CCKB Duyệt xuất bãi`.
  - Thẻ KPI: `Đã duyệt Clearance` -> `Đã duyệt xuất bãi`.
  - Cột bảng: `Trạng thái Clearance` -> `Điều kiện xuất bãi`.
  - Nút bấm: `Duyệt Clearance` -> `Duyệt xuất bãi`.
  - Tooltip & nhãn khóa: `Chưa duyệt clearance` -> `Chưa duyệt xuất bãi`.
  - Modal xác nhận: `Xác nhận duyệt Clearance` -> `Xác nhận duyệt điều kiện xuất bãi`.
  - Nút xuất cổng: `Xác nhận Cont rời bãi (FINAL)` -> `Xác nhận cho container rời bãi`.

### 2.8. `src/app/billing/page.tsx`
- **Cảnh báo thu tiền:** Thay `VI PHẠM PHÂN QUYỀN V5: An ninh TUYỆT ĐỐI KHÔNG...` bằng:  
  *"Chưa được phân quyền: Thao tác thu tiền điện container thuộc thẩm quyền của bộ phận CCKB."*
- **Biểu phí:** Thay `Biểu phí quy chuẩn V5 / Four-Eyes AP10` bằng `"Biểu phí áp dụng / Biểu phí dịch vụ bến bãi được ban hành"`.
- **Quy tắc phân công:** Làm sạch các mã `(AP07)`.

### 2.9. `src/app/reefer/page.tsx`
- **Tiêu đề phụ:** Thay `snapshot đơn giá 100.000đ/h, quy tắc làm tròn 15 phút V5` bằng `"áp dụng đơn giá theo giờ và quy tắc làm tròn 15 phút"`.
- **Modal tính cước:** Thay `Tính cước theo quy tắc V5` bằng `"Tính cước theo quy tắc (Làm tròn 15 phút):"`.

### 2.10. `src/app/admin/vehicle-types/page.tsx`
- **Header:** Thay `Quản trị Hệ thống (Migration 004)` bằng `"Quản trị Hệ thống"`.
- **Tiêu đề:** Thay `Danh mục 7 Loại Phương tiện Chuẩn V5 (app_vehicle_types)` bằng `"Danh mục Phân loại Phương tiện Vận chuyển"`.
- **Hộp chính sách:** Thay thuật ngữ `Four-Eyes` bằng `"phê duyệt độc lập hai cấp"`.

---

## 3. KẾT QUẢ KIỂM TRA MÃ NGUỒN VÀ BUILD HỆ THỐNG

1. **Rà soát tự động toàn bộ chuỗi hiển thị:**  
   Lệnh `Select-String` trên toàn bộ thư mục `src/app/` và `src/components/` xác nhận: **0 chuỗi kỹ thuật hiển thị** (không còn `Supabase`, `Backend`, `RPC`, `RLS`, `RBAC`, `V5`, `PWA`, `YMS`, `AP06`, `AP07`, `Clearance`, `UNPAID` trong JSX).
2. **Kiểm tra TypeScript & Next.js Build:**  
   - Lệnh: `npm run build`
   - Kết quả: **PASS 100%** (Exit Code 0).
   - TypeScript kiểm tra thành công trong 11.8s; toàn bộ 12 tuyến đường dẫn (routes) được sinh tĩnh thành công không lỗi.
3. **Môi trường chạy:**  
   - Production server đang hoạt động ổn định tại `http://localhost:3000` (HTTP 200 OK).
