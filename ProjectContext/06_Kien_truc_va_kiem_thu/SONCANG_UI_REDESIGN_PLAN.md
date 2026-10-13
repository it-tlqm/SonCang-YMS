# KẾ HOẠCH TÁI THIẾT KẾ GIAO DIỆN VẬN HÀNH (UI REDESIGN PLAN) — SƠN CẢNG YMS

**Dự án:** Website + PWA Quản lý bến bãi/cảng cạn Sơn Cảng (Công ty Cổ phần Tà Lùng Quang Minh)  
**Tài liệu tham chiếu:** `DESIGN.md` (DS-01 Chuẩn V5), `tlqm-design-tokens.css`, `STITCH_DESIGN_CONTEXT.md`  
**Dự án Google Stitch:** `projects/8471320594998118450` ("Sơn Cảng Yard Management")  
**Trạng thái phê duyệt:** Đang trình duyệt 3 màn hình mẫu đại diện. **CHƯA VIẾT LẠI TOÀN BỘ FRONTEND.**  

---

## 1. NGUYÊN TẮC THIẾT KẾ CỐT LÕI (TLQM DESIGN SYSTEM DS-01)

1. **Phong cách & Tinh thần:**
   - Ứng dụng nghiệp vụ logistics 24/7 nội bộ doanh nghiệp: Đơn giản, thực dụng, tương phản cao, thao tác nhanh.
   - **Chỉ sử dụng Light Mode** — Tuyệt đối không dùng dark mode, neon glow, hay gradient sặc sỡ.
   - Phân cấp thông tin rõ ràng: Biển số xe, số container, mốc thời gian, số tiền và trạng thái công nợ phải nổi bật hàng đầu.
2. **Bộ thông số màu sắc (Tokens chuẩn):**
   - **Xanh lá cây thương hiệu:** `--brand-green: #0A9444` (Hành động chính, Đã hoàn tất, Đủ điều kiện).
   - **Xanh Navy công nghiệp:** `--brand-navy: #223873` (Tiêu đề, Thương hiệu, Thẻ chỉ số).
   - **Nền & Bề mặt:** `--canvas: #F5F8FA`, `--surface: #FFFFFF`, `--surface-soft: #F0F5F2`.
   - **Đường viền:** `--border: #E3E8EF`.
   - **Màu trạng thái nghiệp vụ:**
     * Thành công / Đã thu / Hợp lệ: `#067647` (Nền: `#ECFDF3`)
     * Cảnh báo / Công nợ / Chờ duyệt: `#9A4808` (Nền: `#FFFAEB`)
     * Chặn / Quá hạn / Sai lệch: `#B42318` (Nền: `#FEF3F2`)
     * Thông tin / Phiên điện: `#1D4ED8` (Nền: `#EFF6FF`)
3. **Thao tác chạm & Phím tắt:**
   - Chiều cao nút bấm và trường nhập liệu tối thiểu **44px** (`--touch-min: 44px`) cho các màn hình bốt trực ngoài trời.
   - Hỗ trợ phím tắt Enter xác nhận, phím F2/F5 làm mới dữ liệu cho nhân viên trực cổng.

---

## 2. TRÌNH DUYỆT 3 MÀN HÌNH MẪU ĐẠI DIỆN TỪ GOOGLE STITCH

Hệ thống đã trích xuất từ dự án Stitch `8471320594998118450` bộ 3 màn hình đại diện chuẩn để Chủ dự án đánh giá phong cách:

### 🌟 MÀN HÌNH 1: TỔNG QUAN HOẠT ĐỘNG BÃI (DASHBOARD CCKB & AN NINH)
- **Tên màn hình Stitch:** `04_CCKB_Tong_quan_Desktop_1440` (ID: `bd7730dc2ef843369c2b56c7f4f56a33`) & `Tổng quan An ninh Bãi Sơn Cảng (Desktop Chuẩn V5)` (ID: `5e5464f405d44c5294f39259e801e27a`).
- **Hình ảnh xem trước:** `public/stitch_previews/01_dashboard_cckb.png`
- **Đặc điểm nổi bật:**
  * Header nhận diện: "TÀ LÙNG QUANG MINH | BÃI SƠN CẢNG", ca trực hiện hành (Ca 1: 06:00 - 14:00), tình trạng cột cắm điện sẵn sàng.
  * 6 Thẻ chỉ số tác nghiệp V5: Điện dự kiến (08), Đang cắm điện (14 cont), Đã rút + Quyết toán (06 cont), Tiền điện chưa thu (3.850.000đ), Chờ duyệt xuất bãi (09 cont), Sai lệch số cont cần xử lý (02 vụ việc).
  * Bảng công việc chi tiết chia cột rõ ràng: Container / Mã lượt, Dịch vụ / Biểu phí, Mốc giờ cắm/rút, Tài chính tiền điện, Thẩm định ra bãi, Tác vụ nhanh.
  * Panel bên phải: Xem nhanh chi tiết phiếu điện đang chọn, tính tiền chuẩn làm tròn 15 phút, hình thức thanh toán và nút xác nhận thu tiền điện tức thì.
  * Cảnh báo quy chế phân quyền rõ ràng: CCKB chỉ thu tiền điện lạnh và cấp cờ xuất bãi; phí lưu bãi container do An ninh thu tại cổng khi xe ra.

---

### 🌟 MÀN HÌNH 2: TIẾP NHẬN XE TẠI CỔNG — GÓC NHÌN AN NINH (GATE-IN ENTRY)
- **Tên màn hình Stitch:** `02_An_ninh_Xe_vao_Desktop_1440` (ID: `4c2a4f3f2505474a88937d469215e737`) & `02_An_ninh_Xe_vao_Mobile_390` (ID: `f4bf95f76a4b42c68fc7217bd240787e`).
- **Hình ảnh xem trước:** `public/stitch_previews/02_gate_in_entry.png`
- **Đặc điểm nổi bật:**
  * Khối 1 — Lượt phương tiện: Lựa chọn nhanh 7 loại xe V5. Xe container (vé 250.000đ), Đầu kéo không container (vé 0đ - Miễn phí), Xe tải 4 chân (200.000đ)... Nhập biển số đầu kéo/rơ-moóc với ô chữ lớn, font Mono in hoa.
  * Khối 2 — Lượt Container (Độc lập): Nhập số container (4 chữ cái + 7 số), tình trạng hàng hóa, nhiệt độ cài đặt, vị trí bãi hạ dự kiến.
  * Khối 3 — Khớp nối yêu cầu điện lạnh điện tử CCKB: Đối chiếu yêu cầu từ quầy thương vụ, tránh nhập trùng lặp.
  * Khối 4 — Thu vé và biên lai: Tính tiền vé cổng, chọn hình thức thanh toán (Tiền mặt / Chuyển khoản / Ghi nợ nội bộ).
  * Nút xác nhận hành động cực lớn: **XÁC NHẬN GHI NHẬN XE VÀO CỔNG [ENTER]** với độ cao tiêu chuẩn cảm ứng.
  * Cột bên phải: Lịch sử 5 xe vừa vào gần nhất, tra cứu nhanh, cảnh báo phương tiện nợ phí.

---

### 🌟 MÀN HÌNH 3: DUYỆT & TIẾN HÀNH XUẤT BÃI (GATE-OUT EXIT & THU TIỀN)
- **Tên màn hình Stitch:** `07_08_CCKB_Thu_tien_Duyet_xuat_Desktop_1440` (ID: `73d7eddc2da14cadbac6f71b1a77c9a0`) & `03_An_ninh_Xe_ra_Desktop_1440` (ID: `dfe50215863749519081fff8ec4e2993`).
- **Hình ảnh xem trước:** `public/stitch_previews/03_gate_out_exit_payment.png`
- **Đặc điểm nổi bật:**
  * Phân tách 2 bước độc lập chuẩn V5:
    1. **CCKB Thương vụ:** Kiểm tra số phiên điện lạnh, thu tiền điện, đối soát công nợ và duyệt cấp cờ xuất bãi (Đủ điều kiện xuất hoặc Bảo lãnh công nợ).
    2. **An ninh Cổng ra:** Kiểm tra cờ xuất bãi, tự động tính phí lưu bãi container (mốc đêm 22:00-06:00, đêm đầu miễn phí), thu tiền tại cổng (hoặc cho xuất theo bảo lãnh nợ), và ghi nhận xe rời bãi.
  * Bảng phân bổ cước theo từng phiên cắm/rút điện lạnh, mốc giờ chi tiết, số tiền đã thu, còn phải thu.
  * Form xác nhận xuất bãi an toàn: Kiểm tra biển số xe kéo container ra khỏi bãi, tình trạng kẹp chì và ghi chú bốt cổng.

---

## 3. LỘ TRÌNH TRIỂN KHAI FRONTEND (CHỈ THỰC HIỆN KHI ĐƯỢC DUYỆT)

Sau khi Chủ dự án phê duyệt 3 màn hình mẫu, tiến trình nâng cấp giao diện sẽ diễn ra theo 4 giai đoạn an toàn:

### Giai đoạn 1: Chuẩn hóa Tokens & Thành phần giao diện dùng chung (Base Components)
- Cập nhật file cấu hình Tailwind (`tailwind.config.ts`) và `src/app/globals.css` tích hợp trọn bộ tokens từ `tlqm-design-tokens.css`:
  * Màu thương hiệu `#0A9444` và `#223873`.
  * Màu nền canvas `#F5F8FA` và card `#FFFFFF`.
  * Bộ nút bấm chuẩn Touch-Min 44px với trạng thái Hover/Active rõ rệt.
- Hoàn thiện các component cốt lõi: `AppShell`, `Card`, `Badge`, `StatusPill`, `Button`, `DataTable`, `ModalDialog`.

### Giai đoạn 2: Tái thiết kế phân hệ Cổng An ninh (Ưu tiên thực địa P0)
- Nâng cấp màn hình Tiếp nhận xe (`/entry`) theo mẫu `02_gate_in_entry.png`.
- Nâng cấp màn hình Cổng ra & Xe rời bãi (`/exit`) theo mẫu `03_gate_out_security.png`.
- Tối ưu hóa giao diện cho màn hình di động 390px và tablet của nhân viên bốt cổng.

### Giai đoạn 3: Tái thiết kế phân hệ Thương vụ CCKB & Điều phối bãi
- Nâng cấp Dashboard tổng quan (`/dashboard`) theo mẫu `01_dashboard_cckb.png`.
- Nâng cấp màn hình Quản lý điện lạnh (`/reefer`) và Sổ cái thu phí (`/billing`).
- Nâng cấp màn hình Quản lý vị trí bãi và Hàng/Rỗng (`/yard`).

### Giai đoạn 4: Kiểm thử hiển thị Responsive & Nghiệm thu trực quan
- Kiểm tra tính tương thích trên 3 độ phân giải: Desktop (1440/1366), Tablet (1024/820), Mobile (390).
- Chạy kiểm thử build production, type-check và lint.
- Đối chiếu pixel-level với bản thiết kế Stitch.

---

## 4. CAM KẾT RANH GIỚI AN TOÀN

1. **Tuyệt đối không sửa Backend:** Toàn bộ logic Supabase, PostgreSQL Migrations 001–008, RPC functions, RLS policies và RBAC catalog giữ nguyên vẹn 100%.
2. **Gate 2 tiếp tục TẠM DỪNG:** Biến môi trường `NEXT_PUBLIC_ENABLE_REAL_WRITE` tiếp tục duy trì trạng thái **TẮT** (`false`). Không có bất kỳ giao dịch ghi dữ liệu nào gửi lên Cloud DEV cho tới khi có phê duyệt bằng văn bản từ Chủ dự án.
3. **Bảo toàn chức năng:** Quá trình tái thiết kế chỉ nâng cấp lớp trình bày (Presentation Layer), tái sử dụng hoàn toàn `SupabaseRepository` và `DemoRepository` hiện có, không làm thay đổi luồng dữ liệu nghiệp vụ.
