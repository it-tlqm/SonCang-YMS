# ĐẶC TẢ THIẾT KẾ: SONCANG MODERN WORKSPACE DESIGN SYSTEM (DS-02)

**Đơn vị:** Công ty Cổ phần Tà Lùng Quang Minh  
**Phần mềm:** Quản lý bến bãi/cảng cạn Sơn Cảng (Website + PWA)  
**Tài liệu tham chiếu thị giác:** MultiChat Studio / Modern Enterprise Workspace  
**Phiên bản:** DS-02 (14/10/2026)  
**Trạng thái:** Bản thiết kế chuẩn hóa và áp dụng thí điểm (Pilot App Shell + Dashboard + Tiếp nhận Cổng vào)

---

## 1. MỤC TIÊU VÀ NGUYÊN TẮC THIẾT KẾ

### 1.1. Mục tiêu
Nâng cấp toàn diện trải nghiệm giao diện người dùng (UI/UX) của Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng từ phong cách cũ sang chuẩn **Modern Enterprise Workspace / Minimal SaaS Dashboard** lấy cảm hứng từ cấu trúc đa vùng làm việc của MultiChat Studio.
- Giữ nguyên 100% nghiệp vụ quản lý bến bãi V5, phân quyền RBAC và các API/RPC Supabase.
- Không đưa tính năng chat vào phần mềm; chuyển đổi cấu trúc panel hội thoại thành **panel hàng đợi nghiệp vụ bến bãi** và **panel chi tiết đối tượng kiểm soát**.
- Tối ưu hóa cho nhân viên vận hành thực tế tại hiện trường (An ninh bốt cổng, Thương vụ CCKB, Hiện trường Điều phối, Kế toán).

### 1.2. Nguyên tắc thẩm mỹ cốt lõi
1. **Light Mode là giao diện mặc định:** Nền trắng tinh khiết (`#FFFFFF`) và các bề mặt xám nhạt (`#F8F9FB`, `#F5F7FA`).
2. **Không màu mè, không gradient trang trí:** Loại bỏ hoàn toàn gradient chuyển màu lòe loẹt, không dùng các khối màu đặc gây nặng nề mắt người vận hành.
3. **Đường viền 1px tinh tế thay cho đổ bóng nặng:** Toàn bộ ranh giới ngăn cách giữa các cột, thẻ và bảng dùng border `1px solid #E5E9F0`. Đổ bóng ambient cực nhẹ (`0 1px 2px rgba(16, 24, 40, 0.04)`).
4. **Căn chỉnh chính xác và nhịp khoảng trắng 4px/8px:** Khoảng cách có kiểm soát, phân cấp thị giác rõ ràng, không có khoảng trắng thừa vô nghĩa cũng không chật chội.
5. **Không dùng card KPI khổng lồ:** Chỉ số tóm tắt được thiết kế dạng Compact Metric Strip/Grid, thanh thoát, tập trung vào số liệu cần xử lý.
6. **Không dùng emoji thay cho biểu tượng:** Sử dụng 100% Lucide React Icons với độ dày nét đồng nhất (stroke width 1.75–2px).
7. **Cảm giác đạt được:** *Calm, Professional, Structured, Lightweight, Premium.*

---

## 2. DESIGN TOKENS BẮT BUỘC

### 2.1. Bảng màu (Color Palette)

| Mã Token | Giá trị Hex | Vai trò & Ứng dụng |
|---|---|---|
| `app-background` | `#FFFFFF` | Nền canvas làm việc chính của toàn ứng dụng |
| `sidebar-background` | `#F8F9FB` | Nền thanh điều hướng chính bên trái (Primary Sidebar) |
| `secondary-surface` | `#F5F7FA` | Nền bảng thứ cấp (Secondary Panel), thanh công cụ lọc |
| `hover-surface` | `#F1F4F8` | Trạng thái rê chuột trên dòng danh sách, hàng bảng, nút bấm |
| `selected-item` | `#EAF1FD` | Nền mục menu/danh sách đang được chọn |
| `border` | `#E5E9F0` | Đường viền ngăn cách cấu trúc 1px, ô nhập liệu, vách ngăn |
| `border-subtle` | `#F0F2F6` | Vách ngăn phụ bên trong panel |
| `text-primary` | `#17202E` | Chữ chính, tiêu đề, số liệu quan trọng, mã xe/container |
| `text-secondary` | `#667085` | Nhãn form, mô tả trường, thông tin phụ, ngày giờ |
| `text-muted` | `#98A2B3` | Chữ mờ, placeholder, biểu tượng bổ trợ |
| `nav-accent` | `#326DD8` | Điểm nhấn điều hướng, tab active, chỉ số chọn, focus ring |
| `brand-green` | `#0A9444` | Màu nhận diện thương hiệu Tà Lùng Quang Minh, trạng thái thành công |
| `brand-cta` | `#087C3C` | Nút hành động chính (Primary CTA) tương phản cao bảo đảm WCAG AA |
| `brand-navy` | `#223873` | Màu nhận diện thương hiệu công ty, huy hiệu hệ thống |
| `status-error` | `#D92D20` | Trạng thái lỗi, nợ chưa giải quyết, từ chối xe xuất |
| `status-error-bg` | `#FEF3F2` | Nền badge/thông báo cảnh báo đỏ |
| `status-warning` | `#B54708` | Chưa thu tiền, chờ đối soát, cắm điện chưa thanh toán |
| `status-warning-bg`| `#FFFAEB` | Nền badge trạng thái cảnh báo vàng cam |
| `status-success` | `#0A9444` | Đã thu tiền, đã xuất bãi, đã kiểm tra hợp lệ |
| `status-success-bg`| `#ECFDF3` | Nền badge trạng thái xanh lá |
| `status-info` | `#326DD8` | Đang cắm điện, có yêu cầu dự kiến, đang xử lý |
| `status-info-bg` | `#EFF8FF` | Nền badge trạng thái xanh dương |

### 2.2. Quy chuẩn Typography
- **Bộ font:** `Inter` (hỗ trợ đầy đủ bộ ký tự Tiếng Việt và Tabular Numbers `tnum`). Font bổ trợ: `Be Vietnam Pro`.
- **Phông chữ số liệu nghiệp vụ (Container, Biển số, Số tiền, Mã vé):** Font monospace công nghiệp kết hợp `font-feature-settings: "tnum" 1, "zero" 1`.
- **Thang kích thước & Trọng lượng:**
  * Page Title: `18–20px`, Semi-bold (600), line-height: `1.4`
  * Section Header: `15–16px`, Semi-bold (600), line-height: `1.45`
  * Body Text: `13–14px`, Regular (400) / Medium (500), line-height: `1.5`
  * Small / Metadata: `12–13px`, Regular (400) / Medium (500), line-height: `1.45`
  * Badge / Caption: `11–12px`, Medium (500) / Semi-bold (600), tracking: `0.02em`

### 2.3. Quy chuẩn Hình khối & Kích thước tương tác
- **Bán kính góc bo (Border Radius):**
  * Badge / Chip / Tag: `6px`
  * Input / Select / Button: `8px`
  * Card / Panel / Modal: `10–12px`
- **Chiều cao điều khiển (Control Heights):**
  * Desktop Input & Select: `38–40px`
  * Desktop Standard Button: `38px` (Compact Button: `32px`)
  * Mobile Input & Touch Target: tối thiểu `44px` theo chuẩn accessibility hiện trường

---

## 3. KIẾN TRÚC APP SHELL VÀ BỐ CỤC KHÔNG GIAN (5 VÙNG)

Ứng dụng bố cục 5 vùng hiện đại tương tự MultiChat Studio nhưng tối ưu hóa theo quy trình vận hành cảng cạn:

```
+---------------------------------------------------------------------------------------------------+
| 1. GLOBAL TOP BAR (60-64px) — Logo Sơn Cảng | Breadcrumb/Tabs | Search | Shift Status | User & Yard |
+-------------+-----------------------+---------------------------------------+---------------------+
| 2. PRIMARY  | 3. SECONDARY PANEL    | 4. MAIN WORKSPACE                     | 5. RIGHT CONTEXT    |
| SIDEBAR     | (280-340px)           | (Flexible Central Canvas)             | PANEL (280-320px)   |
| (220-240px) |                       |                                       |                     |
|             | • Hàng đợi lượt xe    | • Form tiếp nhận nhanh (Entry)        | • Chi tiết Cont/Xe  |
| • Vận hành  | • Lọc theo biển số    | • Bảng dữ liệu hiện trường (Yard)     | • Lịch sử phiên điện|
| • Tài chính | • Container lưu bãi   | • Bảng phiên cắm điện (Reefer)        | • Tình trạng phí    |
| • Quản trị  | • Trạng thái ca trực  | • Workspace Dashboard Overview        | • Phiếu cắm dự kiến |
|             |                       |                                       |                     |
| [Thu gọn]   | [Ẩn/hiện khi cần]     |                                       | [Đóng/mở linh hoạt] |
+-------------+-----------------------+---------------------------------------+---------------------+
```

### A. Global Top Bar (Chiều cao 60–64px)
- **Cột trái:** Huy hiệu viết tắt `SC` màu xanh thương hiệu, Tiêu đề ứng dụng `Sơn Cảng` (15px bold, màu `#17202E`), kèm dòng phụ ngữ cảnh `Quản lý bến bãi`.
- **Khu vực giữa:** Breadcrumb phân tầng tinh tế và Workspace Tabs cho các phân hệ đang mở; thanh tìm kiếm nhanh toàn bãi (`Cmd+K` hoặc icon kính lúp).
- **Cột phải:** 
  * Đồng hồ thời gian thực ca trực hiện trường (`HH:mm:ss — DD/MM/YYYY`).
  * Chip phân biệt môi trường: nhãn gọn `Bản Thử nghiệm` (không có dải banner đỏ/vàng chiếm không gian).
  * Thông tin tài khoản đăng nhập: Tên nhân sự, Vai trò ca trực (Badge màu chuẩn), Tên phân khu bãi đang trực, Nút đổi mật khẩu và Đăng xuất.

### B. Primary Sidebar (Chiều rộng 220–240px)
- Nền xám trắng `#F8F9FB`, đường viền phải `#E5E9F0`.
- Chia thành 3 nhóm rõ ràng có tiêu đề phụ:
  * **VẬN HÀNH BẾN BÃI:** Tổng quan Vận hành (`/dashboard`), Tiếp nhận Cổng vào (`/entry`), Quản lý Bãi & Cont (`/yard`), Điện Container (`/reefer`), Xuất bãi & Cổng ra (`/exit`).
  * **TÀI CHÍNH & BÁO CÁO:** Thu phí & Sổ cái (`/billing`), Kế toán & Hóa đơn (`/accounting`), Thống kê & Báo cáo (`/reports`).
  * **HỆ THỐNG & QUẢN TRỊ:** Danh mục khách hàng, Biểu phí bến bãi, Danh mục loại xe, Kiểm soát trùng xe, Nhân sự & Quyền V5, Nhật ký kiểm toán.
- Trạng thái Active: Nền xanh rất nhạt `#EAF1FD`, viền trái accent `3px solid #326DD8`, chữ `#17202E` đậm và icon `#326DD8`.
- Có thể thu gọn trên Desktop thành dải thanh biểu tượng 64px với tooltip gợi ý khi di chuột.

### C. Secondary Panel (Chiều rộng 280–340px)
- Đóng vai trò là danh sách hàng đợi / danh mục làm việc động:
  * Màn hình Cổng vào: Hàng đợi xe vừa tiếp nhận, bộ lọc xe mang container vs xe không cont, tìm kiếm biển số xe nhanh.
  * Màn hình Dashboard: Danh sách container lưu bãi lâu ngày hoặc cảnh báo cần xử lý tức thì.
- Phía trên có ô tìm kiếm nhanh và thanh phân loại trạng thái bằng tab mini hoặc dropdown lọc.
- Mỗi hàng trong danh sách gồm: Mã số chính in đậm dạng monospace, phụ đề phân loại phương tiện, thời gian ghi nhận và status chip nhỏ gọn.

### D. Main Workspace (Vùng trung tâm)
- Là không gian thao tác cốt lõi: Nền trắng `#FFFFFF`, bố cục phân cấp rành mạch.
- Không lạm dụng viền khung xếp chồng: Phân cách các khối nội dung bằng khoảng trống chuẩn xác và đường phân cách ngang 1px mờ.
- Nút bấm hành động chính (Primary CTA) luôn đặt tại vị trí tự nhiên của tầm mắt, không bắt nhân viên cuộn trang dài.

### E. Right Context Panel (Chiều rộng 280–320px)
- Mở rộng thông tin chi tiết của đối tượng đang được chọn ở Main Workspace hoặc Secondary Panel.
- Có nút thu gọn/mở rộng (`X` hoặc mũi tên trượt) để người dùng chủ động mở rộng diện tích Main Workspace khi cần hiển thị bảng dữ liệu nhiều cột.

---

## 4. CHI TIẾT THIẾT KẾ CHO HAI MÀN HÌNH PILOT

### 4.1. Màn hình Dashboard (Workspace Overview)
- **Hàng chỉ số tinh gọn (Compact Metric Bar):** Thay vì các ô thẻ lớn chiếm nửa màn hình, chuyển sang dải thẻ phẳng thanh mảnh:
  * Xe trong bãi (Xe đang đỗ thực tế)
  * Container đang lưu bãi (Phân rõ Hàng / Rỗng)
  * Container cắm điện (Số phiên đang hoạt động)
  * Xe chờ thủ tục xuất bãi
  * Khoản phí chưa thu (Dành riêng cho vai trò có quyền tài chính)
- **Secondary Panel bên trái:** Danh sách phương tiện vừa vào bãi trong 24h qua với tìm kiếm biển số và lọc nhanh.
- **Main Canvas:**
  * Bảng phân bố phương tiện và container đang xử lý.
  * Biểu đồ tải bãi thanh lịch hoặc thanh tiến độ công suất bến bãi.
  * Khu vực lối tắt tác nghiệp nhanh một chạm theo quyền.
- **Right Context Panel:** Thanh thông tin nhanh hiển thị đầy đủ chi tiết của phương tiện/container được chọn để tra cứu ngay mà không cần rời trang.

### 4.2. Màn hình Tiếp nhận Cổng vào (`/entry`)
- **Tối ưu hóa tốc độ tiếp nhận cho An ninh bốt cổng:**
  * Cấu trúc form một cột có thứ tự thao tác logic từ trên xuống dưới.
  * Section 1: Thông tin Phương tiện (Biển số xe nổi bật, Loại phương tiện chọn nhanh bằng chip/dropdown gọn, Tài xế, SĐT, Quét CCCD).
  * Section 2: Thông tin Container (Số container tự động kiểm tra ISO 6346, Kích thước 20/40/45ft, Chủng loại Hàng/Lạnh).
  * Section 3: Thu vé và Thanh toán cổng (Xác nhận thu vé vào bãi, phương thức Tiền mặt / VietQR, mã phiếu thu).
- **Secondary Panel:** Danh sách các lượt xe vừa tạo vé thành công trong ca trực, hiển thị biển số, giờ vào và trạng thái vé.
- **Right Context Panel:** Đối chiếu cảnh báo trùng lặp xe hoặc đối chiếu Phiếu cắm điện dự kiến do CCKB tạo trước để An ninh ghép thủ công chuẩn xác.

---

## 5. THÍCH ỨNG ĐA THIẾT BỊ (RESPONSIVE BEHAVIOR)

| Kích thước | Điểm cắt | Cơ chế hiển thị |
|---|---|---|
| **Desktop** | `>= 1280px` (Mục tiêu 1440px) | Hiển thị đủ 4-5 cột: Topbar + Primary Sidebar + Secondary Panel + Main Workspace + Right Context Panel |
| **Tablet Ngang** | `1024px – 1279px` | Primary Sidebar thu gọn thành Icon Rail (64px); Right Context Panel thu gọn dạng Drawer trượt khi bấm xem chi tiết |
| **Tablet Dọc** | `768px – 1023px` | Primary Sidebar ẩn vào menu trượt; Secondary Panel chuyển thành thanh chọn dạng Accordion/Dropdown trên đầu trang |
| **Mobile** | `< 768px` (Mục tiêu 390px) | Ẩn toàn bộ Sidebar; Topbar 56px với nút Menu; Form chuyển thành 1 cột duy nhất; Nút xác nhận dính cố định ở đáy màn hình (Sticky Bottom Action Bar) với chiều cao `48px` dễ bấm ngoài nắng; các panel chi tiết mở dạng Bottom Sheet |

---

## 6. QUY TẮC AN TOÀN NGHIỆP VỤ & DỮ LIỆU
1. Giữ nguyên toàn bộ mã quyền V5, không kiểm tra theo tên chuỗi hiển thị.
2. Không tự động đánh dấu "Đã thu", "Đã xuất", "Đã duyệt" trên giao diện khi chưa có phản hồi transaction thành công từ máy chủ.
3. Không sửa tên database column, RPC hay trigger PostgreSQL.
4. Mọi văn bản hiển thị trên giao diện người dùng phải là Tiếng Việt nghiệp vụ chuẩn xác (không để lộ tên biến code, enum tiếng Anh hoặc mã lỗi cơ sở dữ liệu).
