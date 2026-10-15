# KẾ HOẠCH TRIỂN KHAI VÀ BÀN GIAO: DS-02 MODERN WORKSPACE
## PHẦN MỀM QUẢN LÝ BẾN BÃI/CẢNG CẠN SƠN CẢNG

**Đơn vị:** Công ty Cổ phần Tà Lùng Quang Minh  
**Phiên bản:** DS-02 (14/10/2026)  
**Quy tắc bất biến:** Không sửa Backend, Không đổi Database/Migrations, Giữ nguyên 100% RBAC V5 và nghiệp vụ bến bãi.

---

## 1. LỘ TRÌNH TRIỂN KHAI 3 GIAI ĐOẠN

```
+-------------------------------------------------------------------------------------------------------+
| GIAI ĐOẠN 1: NỀN TẢNG THIẾT KẾ & APP SHELL HIỆN ĐẠI (ĐANG THỰC HIỆN)                                  |
| • Cấu hình Tokens CSS & Fonts Inter (`globals.css`, `layout.tsx`)                                      |
| • Xây dựng bộ component cốt lõi DS-02 (`src/components/workspace/`)                                  |
| • Thiết kế lại toàn diện `AppShell` theo kiến trúc Modern Enterprise Workspace                        |
| • Tạo Design System DS-02 trên Google Stitch MCP                                                     |
+-------------------------------------------------------------------------------------------------------+
                                                  ↓
+-------------------------------------------------------------------------------------------------------+
| GIAI ĐOẠN 2: TRIỂN KHAI THÍ ĐIỂM (PILOT) HAI MÀN HÌNH CHỦ ĐẠO (ĐANG THỰC HIỆN)                        |
| • Pilot 1: Dashboard Vận hành Tổng quan (`/dashboard`) theo phong cách Workspace Overview             |
| • Pilot 2: Tiếp nhận Cổng vào (`/entry`) tối ưu thao tác nhanh cho An ninh bốt cổng                   |
| • Kiểm tra TypeScript (`tsc --noEmit`), ESLint và Production Build (`npm run build`)                  |
| • Chụp ảnh kiểm thử thực tế tại 3 kích thước: 1440px (Desktop), 1024px (Tablet), 390px (Mobile)       |
+-------------------------------------------------------------------------------------------------------+
                                                  ↓
+-------------------------------------------------------------------------------------------------------+
| [CỔNG KIỂM SOÁT PHÊ DUYỆT CỦA CHỦ DỰ ÁN]                                                              |
| Bàn giao báo cáo, đặc tả và ảnh chụp thực tế Pilot cho Chủ dự án đánh giá & phê duyệt.                |
| KHÔNG tự ý triển khai đại trà sang Giai đoạn 3 khi chưa có sự chấp thuận bằng văn bản/chốt.           |
+-------------------------------------------------------------------------------------------------------+
                                                  ↓ (Sau khi Chủ dự án phê duyệt)
+-------------------------------------------------------------------------------------------------------+
| GIAI ĐOẠN 3: TRIỂN KHAI ĐẠI TRÀ CÁC PHÂN HỆ CÒN LẠI (CHỜ PHÊ DUYỆT)                                   |
| • Xuất bãi & Cổng ra (`/exit`)                                                                        |
| • Cắm điện Container (`/reefer`)                                                                      |
| • Quản lý Bãi & Container (`/yard`)                                                                   |
| • Thu phí & Sổ cái (`/billing`) và Kế toán & Quỹ (`/accounting`)                                      |
| • Báo cáo (`/reports`) và Toàn bộ các trang Quản trị (`/admin/*`)                                     |
+-------------------------------------------------------------------------------------------------------+
```

---

## 2. NỘI DUNG CHI TIẾT GIAI ĐOẠN 1 & 2 (PILOT SCOPE)

### 2.1. Giai đoạn 1: Nền tảng và App Shell
1. **Thiết lập Tokens và Fonts:**
   - Thay thế font `Be Vietnam Pro` bằng `Inter` (Google Fonts tiếng Việt), giữ `Be Vietnam Pro` làm fallback an toàn.
   - Định nghĩa toàn bộ biến CSS của DS-02 trong `globals.css`: `--color-app-bg: #FFFFFF;`, `--color-sidebar-bg: #F8F9FB;`, `--color-secondary-surface: #F5F7FA;`, `--color-hover-surface: #F1F4F8;`, `--color-selected-item: #EAF1FD;`, `--color-border: #E5E9F0;`, `--color-nav-accent: #326DD8;`.
2. **App Shell Đa Vùng:**
   - **Global Top Bar (60–64px):** Thanh điều hướng trên cùng, hiển thị thương hiệu Sơn Cảng, thanh tìm kiếm nhanh, trạng thái ca trực, chip `Bản Thử nghiệm` tinh gọn và hồ sơ nhân viên.
   - **Primary Sidebar (220–240px):** Nền xám trắng `#F8F9FB`, border 1px `#E5E9F0`, 3 nhóm nghiệp vụ V5, trạng thái active `#EAF1FD` với viền accent `#326DD8`.
   - **Secondary Panel (280–340px):** Khung danh sách hàng đợi nghiệp vụ có thể bật/tắt linh hoạt.
   - **Main Workspace Canvas:** Vùng hiển thị form, bảng và thông tin nghiệp vụ.
   - **Right Context Panel (280–320px):** Khung chi tiết đối tượng được chọn có thể đóng/mở.
3. **Thư viện Component cơ bản:**
   - Tạo các thành phần trong `src/components/workspace/`: `WorkspaceHeader`, `WorkspaceTabs`, `SearchInput`, `FilterBar`, `StatusBadge`, `DataTable`, `FormField`, `EmptyState`.

### 2.2. Giai đoạn 2: Pilot Dashboard & Tiếp nhận xe
1. **Pilot 1 — Dashboard (`/dashboard`):**
   - Loại bỏ các card số liệu khổng lồ chiếm diện tích.
   - Thiết lập Compact KPI Strip thanh lịch gồm 5 chỉ số chính.
   - Tích hợp Secondary Panel hiển thị phương tiện vừa tiếp nhận trong ca và cảnh báo lưu bãi.
   - Main Canvas hiển thị bảng quản lý phương tiện/cont đang đỗ trong bãi và phân bổ loại xe.
   - Right Context Panel hiển thị tra cứu nhanh chi tiết phương tiện/container được nhấp chọn.
2. **Pilot 2 — Tiếp nhận Cổng vào (`/entry`):**
   - Form tiếp nhận xe được cấu trúc lại tinh gọn theo chiều dọc.
   - Section 1: Phương tiện (Biển số xe, Loại xe, Tài xế, Quét CCCD).
   - Section 2: Container (Số cont với validator ISO 6346 trực tiếp, Kích thước, Loại lạnh/hàng).
   - Section 3: Thu vé và In vé cổng vào (Số tiền vé, hình thức Tiền mặt / VietQR).
   - Nút xác nhận vào cổng nổi bật, đặt tại vị trí tự nhiên, không cần cuộn trang dài.
   - Secondary Panel bên trái: Danh sách các xe vừa vào cổng trong ca trực.
   - Right Context Panel: Cảnh báo xe trùng lặp hoặc phiếu yêu cầu cắm điện dự kiến đối chiếu.

---

## 3. NGUYÊN TẮC BẢO ĐẢM KỸ THUẬT & AN TOÀN

1. **Không sửa Backend:** Tuyệt đối không thay đổi schema PostgreSQL, không tạo migration mới, không sửa bất kỳ RPC hay trigger nào trên máy chủ Supabase.
2. **Không thay đổi cơ sở dữ liệu:** Mọi cấu trúc bảng, kiểu dữ liệu, ràng buộc khóa ngoại được giữ nguyên vẹn 100%.
3. **Không làm sai phân quyền RBAC:** Sử dụng đúng hook `useAuth()` và hàm `can(permission_code)` với các mã quyền V5 từ Excel gốc.
4. **Giữ nguyên các cờ bảo vệ:**
   - `NEXT_PUBLIC_ENABLE_REAL_WRITE=false` (chế độ an toàn).
   - Gate 2 tiếp tục tạm dừng theo quy định dự án.
5. **Tiêu chuẩn kiểm thử bắt buộc trước khi báo cáo:**
   - `npx tsc --noEmit` đạt 0 lỗi.
   - `npm run build` vượt qua 20/20 routes.
   - Chụp ảnh giao diện thực tế từ trình duyệt ở 3 độ phân giải (1440px Desktop, 1024px Tablet, 390px Mobile) để gửi kèm báo cáo.
