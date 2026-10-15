# BẢNG DANH MỤC THÀNH PHẦN GIAO DIỆN (COMPONENT INVENTORY)
## SONCANG MODERN WORKSPACE DESIGN SYSTEM — DS-02

**Đơn vị:** Công ty Cổ phần Tà Lùng Quang Minh  
**Phần mềm:** Quản lý bến bãi/cảng cạn Sơn Cảng (Website + PWA)  
**Phiên bản:** DS-02 (14/10/2026)

---

## 1. DANH MỤC CÁC THÀNH PHẦN CỐT LÕI (CORE REUSABLE COMPONENTS)

| STT | Tên Component | Vị trí file đề xuất | Chức năng chính | Trạng thái tương tác |
|---|---|---|---|---|
| 1 | `AppShell` | `src/components/layout/app-shell.tsx` | Khung sườn bao bọc toàn ứng dụng, tích hợp Topbar, Sidebar chính, vùng làm việc và Drawer di động | Collapsible, Responsive, Mobile Drawer |
| 2 | `GlobalTopbar` | `src/components/workspace/global-topbar.tsx` | Thanh tiêu đề trên cùng (60–64px): Logo, phân hệ, đồng hồ ca trực, thông tin nhân sự, quyền và nút đăng xuất | Responsive, Dropdown menu |
| 3 | `PrimarySidebar` | `src/components/workspace/primary-sidebar.tsx` | Thanh điều hướng chính bên trái (220–240px) phân thành 3 nhóm quyền V5 (Vận hành, Tài chính, Quản trị) | Expand / Collapse, Active Pill, Hover |
| 4 | `SecondaryPanel` | `src/components/workspace/secondary-panel.tsx` | Cột danh sách hàng đợi nghiệp vụ bên trái Main Workspace (280–340px): Hàng đợi xe vào, danh sách cont, bộ lọc nhanh | Search, Filter, Item Select |
| 5 | `RightContextPanel`| `src/components/workspace/right-context-panel.tsx`| Cột thanh tra thông tin chi tiết bên phải (280–320px): Xem nhanh thông số xe, container, phiên điện, đối chiếu | Open / Close Toggle, Action shortcuts |
| 6 | `WorkspaceHeader` | `src/components/workspace/workspace-header.tsx` | Tiêu đề phân hệ, mô tả ngắn, breadcrumb và nhóm nút hành động chính của trang | Action Buttons, Badges |
| 7 | `WorkspaceTabs` | `src/components/workspace/workspace-tabs.tsx` | Thanh tab chuyển đổi các góc nhìn dữ liệu (Pill Tabs tinh tế) | Active, Inactive, Badge count |
| 8 | `SearchInput` | `src/components/workspace/search-input.tsx` | Ô tìm kiếm nhanh với biểu tượng kính lúp, nút xóa nhanh (x) và phím tắt gợi ý | Focus ring, Clear on click |
| 9 | `FilterBar` | `src/components/workspace/filter-bar.tsx` | Thanh công cụ lọc dữ liệu đa điều kiện (dropdown trạng thái, ngày, loại xe) | Dropdown select, Reset filters |
| 10 | `DataTable` | `src/components/workspace/data-table.tsx` | Bảng dữ liệu nghiệp vụ chuẩn hóa: header xám nhạt, border 1px mỏng, hover row mượt, font monospace cho số cont/tiền | Hover row, Sortable header, Pagination |
| 11 | `StatusBadge` | `src/components/workspace/status-badge.tsx` | Huy hiệu trạng thái nghiệp vụ (Đang cắm, Chưa thu, Đã thu, Đã xuất, Ngoại lệ...) với cặp màu tương phản chuẩn WCAG | Dot indicator, Semantic colors |
| 12 | `FormField` | `src/components/workspace/form-field.tsx` | Trường nhập liệu chuẩn form (Label, Input/Select, Error text, Hint, Icon prefix) | Focus `#326DD8`, Error state, Disabled |
| 13 | `DetailSection` | `src/components/workspace/detail-section.tsx` | Khối hiển thị chi tiết các cặp thông số (Key-Value pairs) có vách ngăn tinh tế | Compact, Highlight, Copyable |
| 14 | `ActionToolbar` | `src/components/workspace/action-toolbar.tsx` | Thanh công cụ nút bấm cố định hoặc dưới form (Xác nhận, In phiếu, Làm mới, Hủy) | Primary CTA `#087C3C`, Secondary, Danger |
| 15 | `Modal` | `src/components/workspace/modal.tsx` | Hộp thoại xác nhận / popup nghiệp vụ (In vé, Đổi mật khẩu, Phê duyệt) với backdrop mờ nhẹ | Keyboard ESC, Trap focus, Accessible |
| 16 | `EmptyState` | `src/components/workspace/empty-state.tsx` | Màn hình thông báo trạng thái rỗng (Không có dữ liệu, Chưa có xe trong hàng đợi) | Clean illustration/icon, Action button |
| 17 | `LoadingSkeleton` | `src/components/workspace/loading-skeleton.tsx` | Hiệu ứng tải dữ liệu mượt mà dạng khung xương | Pulse animation, Lightweight |

---

## 2. QUY CHUẨN THIẾT KẾ CÁC TRẠNG THÁI (INTERACTION STATES)

### 2.1. Nút bấm (Button Variants)
- **Primary Action (CTA):**
  * Bình thường: Nền `#087C3C`, chữ `#FFFFFF`, bo góc `8px`, chiều cao `38px` (desktop) / `44px` (mobile), font-weight `600`.
  * Rê chuột (Hover): Nền `#076934`, chuyển động nhẹ (transition `150ms`).
  * Nhấn (Active): Nền `#055228`, scale `0.99`.
  * Vô hiệu (Disabled): Nền `#E5E9F0`, chữ `#98A2B3`, con trỏ `not-allowed`.
- **Secondary / Outline Action:**
  * Bình thường: Nền `#FFFFFF`, viền `1px solid #E5E9F0`, chữ `#17202E`, font-weight `500`.
  * Hover: Nền `#F1F4F8`, viền `#CBD5E1`.
- **Accent / Navigation Action:**
  * Nền `#EAF1FD`, viền `1px solid #D0E1FD`, chữ `#326DD8`.
- **Destructive / Danger Action:**
  * Nền `#FEF3F2`, viền `1px solid #FECDCA`, chữ `#D92D20`. Hover: Nền `#D92D20`, chữ `#FFFFFF`.

### 2.2. Trường nhập liệu (Form Input States)
- **Default:** Nền `#FFFFFF`, viền `1px solid #E5E9F0`, chữ `#17202E`, placeholder `#98A2B3`, chiều cao `38px`.
- **Focus:** Viền `1px solid #326DD8`, bóng mờ vòng quanh `box-shadow: 0 0 0 3px rgba(50, 109, 216, 0.15)`.
- **Error:** Viền `1px solid #D92D20`, bóng mờ đỏ `box-shadow: 0 0 0 3px rgba(217, 45, 32, 0.12)`, hiển thị dòng báo lỗi đỏ `#D92D20` kèm icon cảnh báo.
- **Disabled / Read-only:** Nền `#F8F9FB`, viền `#E5E9F0`, chữ `#667085`.

### 2.3. Bảng dữ liệu (Data Table States)
- **Header:** Nền `#F8F9FB`, viền đáy `1px solid #E5E9F0`, chữ `#667085`, font-size `12px`, uppercase, font-weight `600`.
- **Row Default:** Nền `#FFFFFF`, viền đáy `1px solid #E5E9F0`, font-size `13px`, chữ `#17202E`.
- **Row Hover:** Nền `#F8F9FB` chuyển tiếp êm dịu, con trỏ pointer nếu dòng có hành động chọn.
- **Row Selected:** Nền `#EAF1FD`, viền trái `3px solid #326DD8`.

---

## 3. DANH MỤC TRẠNG THÁI NGHIỆP VỤ & BẢNG MÀU STATUS BADGE

| Trạng thái nghiệp vụ V5 | Nền (Background) | Chữ (Text) | Viền (Border) | Biểu tượng Lucide |
|---|---|---|---|---|
| **Trong bãi (IN_YARD)** | `#EFF8FF` | `#326DD8` | `#B2DDFF` | `Layers` |
| **Đã xuất bãi (EXITED)** | `#ECFDF3` | `#0A9444` | `#A6F4C5` | `CheckCircle2` |
| **Đang cắm điện (PLUGGED)** | `#EFF8FF` | `#175CD3` | `#B2DDFF` | `Zap` |
| **Đã rút điện (UNPLUGGED)** | `#F8F9FB` | `#475467` | `#EAECF0` | `Clock` |
| **Chờ cắm điện (PENDING_PLUG)** | `#FFFAEB` | `#B54708` | `#FEDF89` | `Clock` |
| **Đã thu đủ tiền (PAID)** | `#ECFDF3` | `#0A9444` | `#A6F4C5` | `Check` |
| **Chưa thu tiền (UNPAID)** | `#FEF3F2` | `#D92D20` | `#FECDCA` | `AlertTriangle` |
| **Còn nợ ngoại lệ (DEBT_EXCEPTION)**| `#FFFAEB` | `#B54708` | `#FEDF89` | `ShieldAlert` |
| **Chờ đối chiếu số cont** | `#FFFAEB` | `#B54708` | `#FEDF89` | `Search` |
| **Đã duyệt xuất (CLEARANCE_ISSUED)**| `#ECFDF3` | `#087C3C` | `#A6F4C5` | `CheckSquare` |

---

## 4. TÍCH HỢP VÀO NEXT.JS APP ROUTER & TAILWIND V4

Toàn bộ các component trên được thiết kế tối ưu với:
- **Tailwind CSS v4 (`@import "tailwindcss";`):** Sử dụng các biến CSS native của `:root` và `@theme inline`.
- **Client Side Components:** Đánh dấu `'use client'` hợp lý để hỗ trợ tương tác tức thì mà không ảnh hưởng Server-Side Rendering của Next.js.
- **Không cài thêm thư viện CSS nặng:** Tận dụng tối đa `lucide-react`, `clsx`, `tailwind-merge` đã có sẵn trong dự án.
