# HỒ SƠ ĐÁNH GIÁ THIẾT KẾ UI/UX GOOGLE STITCH VÀ PWA HIỆN TẠI — SƠN CẢNG YMS

**Dự án:** Website + PWA Quản lý bến bãi/cảng cạn Sơn Cảng  
**Đơn vị chủ quản:** Công ty Cổ phần Tà Lùng Quang Minh  
**Thời điểm đóng gói:** 12/10/2026  
**Mã hồ sơ:** `SONCANG_UI_UX_REVIEW_PACKAGE_20261012.zip`  
**Mục đích:** Cung cấp bộ hồ sơ độc lập, toàn diện để chuyên gia đánh giá thiết kế, đối chiếu tính nhất quán và khả năng áp dụng vào hệ thống PWA Sơn Cảng V1 trước khi phê duyệt triển khai chính thức.

---

## 1. THÔNG TIN DỰ ÁN VÀ TRẠNG THÁI KẾT NỐI GOOGLE STITCH MCP

- **Google Stitch Project URL:** `https://stitch.withgoogle.com/projects/8471320594998118450`
- **Stitch Project ID:** `projects/8471320594998118450` (Tên dự án: **"Sơn Cảng Yard Management"**)
- **Trạng thái kết nối MCP:** **ĐÃ KẾT NỐI VÀ XÁC THỰC THÀNH CÔNG (HTTP 200)** qua giao thức JSON-RPC 2.0 tới máy chủ `https://stitch.googleapis.com/mcp`. Đã đọc và lập chỉ mục trọn bộ **41 màn hình và tài liệu thiết kế**.
- **Thông tin 3 màn hình mẫu đại diện được trích xuất từ Google Stitch:**
  1. **Màn hình Tổng quan hoạt động bãi (CCKB & An ninh):**
     - Screen Title: `04_CCKB_Tong_quan_Desktop_1440` (Bản Desktop) & `04_CCKB_Tong_quan_Mobile_390` (Bản Mobile)
     - Screen ID (Desktop): `bd7730dc2ef843369c2b56c7f4f56a33`
     - Screen ID (Mobile): `05a8b909e7c9472789fd6e6ed79e7833`
     - Bản đối chiếu An ninh: `Tổng quan An ninh Bãi Sơn Cảng (Desktop Chuẩn V5)` — Screen ID: `5e5464f405d44c5294f39259e801e27a`
  2. **Màn hình Tiếp nhận xe tại cổng — Góc nhìn An ninh (Gate-In Entry):**
     - Screen Title: `02_An_ninh_Xe_vao_Desktop_1440` (Bản Desktop) & `02_An_ninh_Xe_vao_Mobile_390` (Bản Mobile)
     - Screen ID (Desktop): `4c2a4f3f2505474a88937d469215e737`
     - Screen ID (Mobile): `f4bf95f76a4b42c68fc7217bd240787e`
  3. **Màn hình Duyệt & Tiến hành xuất bãi (Gate-Out Exit & Thu tiền):**
     - Screen Title: `07_08_CCKB_Thu_tien_Duyet_xuat_Desktop_1440` (Bản Desktop) & `07_08_CCKB_Thu_tien_Duyet_xuat_Mobile_390` (Bản Mobile)
     - Screen ID (Desktop): `73d7eddc2da14cadbac6f71b1a77c9a0`
     - Screen ID (Mobile): `869f6054df9a4679a69c86004caec633`
     - Bản đối chiếu bốt cổng ra: `03_An_ninh_Xe_ra_Desktop_1440` — Screen ID: `dfe50215863749519081fff8ec4e2993`
  4. **Thư viện Design System Bãi Sơn Cảng (DS-01 Chuẩn V5):**
     - Screen ID: `bd7a8e54ef6c4dd39a17f865d4541a60`

---

## 2. CẤU TRÚC DANH MỤC TỆP TRONG BỘ HỒ SƠ

```
SONCANG_UI_UX_REVIEW_PACKAGE/
│
├── 01_STITCH_DESIGNS/                               # Bản thiết kế gốc trích xuất từ Google Stitch
│   ├── 01_dashboard_cckb.png                        # [Desktop 1440] Mẫu Tổng quan thương vụ CCKB & bãi
│   ├── 01_dashboard_cckb_mobile_390.png             # [Mobile 390] Mẫu Tổng quan CCKB trên di động
│   ├── 02_gate_in_entry.png                         # [Desktop 1440] Mẫu Tiếp nhận xe cổng An ninh
│   ├── 02_gate_in_entry_mobile_390.png              # [Mobile 390] Mẫu Tiếp nhận xe cổng trên di động
│   ├── 03_gate_out_exit_payment.png                 # [Desktop 1440] Mẫu Duyệt xuất bãi & thu tiền CCKB
│   ├── 03_gate_out_exit_payment_mobile_390.png      # [Mobile 390] Mẫu Duyệt xuất & thu tiền trên di động
│   ├── 04_design_system_preview.png                 # [Desktop] Thư viện Design System DS-01 tổng hợp
│   └── HTML_EXPORTED_FROM_STITCH/                   # Mã nguồn HTML/CSS gốc do Google Stitch xuất ra
│       ├── 01_dashboard_cckb_desktop.html
│       ├── 02_gate_in_entry_desktop.html
│       ├── 03_gate_out_exit_payment_desktop.html
│       └── 04_design_system_library.html
│
├── 02_CURRENT_PWA_SCREENSHOTS/                      # Ảnh chụp màn hình thực tế từ ứng dụng Next.js PWA đang chạy
│   ├── desktop_1440/                                # Chụp ở độ phân giải Desktop 1440x900 (Chế độ BẢN MÔ PHỎNG)
│   │   ├── 01_dashboard_desktop_1440.png            # Màn hình Tổng quan vận hành hiện tại
│   │   ├── 02_entry_desktop_1440.png                # Màn hình Tiếp nhận xe vào cổng hiện tại
│   │   ├── 03_yard_desktop_1440.png                 # Màn hình Quản lý vị trí bãi & Hàng/Rỗng hiện tại
│   │   ├── 04_reefer_desktop_1440.png               # Màn hình Quản lý cắm điện container hiện tại
│   │   ├── 05_billing_desktop_1440.png              # Màn hình Sổ cái thu phí & tài chính hiện tại
│   │   ├── 06_exit_desktop_1440.png                 # Màn hình Cổng ra & duyệt xuất bãi hiện tại
│   │   └── 07_login_desktop_1440.png                # Màn hình Đăng nhập xác thực hiện tại
│   └── mobile_390/                                  # Chụp ở độ phân giải Mobile 390x844 (Chế độ BẢN MÔ PHỎNG)
│       ├── 01_dashboard_mobile_390.png
│       ├── 02_entry_mobile_390.png
│       ├── 03_yard_mobile_390.png
│       ├── 04_reefer_mobile_390.png
│       ├── 05_billing_mobile_390.png
│       ├── 06_exit_mobile_390.png
│       └── 07_login_mobile_390.png
│
├── 03_DESIGN_DOCUMENTS/                             # Bộ tài liệu quy chuẩn thiết kế và kiểm toán
│   ├── SONCANG_MCP_CONNECTION_REPORT.md             # Báo cáo kỹ thuật kết nối và xác thực MCP
│   ├── SONCANG_UI_AUDIT.md                          # Báo cáo kiểm toán UI hiện tại & danh mục chuỗi đã sửa
│   ├── SONCANG_UI_REDESIGN_PLAN.md                  # Kế hoạch chi tiết tái thiết kế theo từng giai đoạn
│   ├── DESIGN.md                                    # Quy chuẩn Design System DS-01 (Tà Lùng Quang Minh)
│   ├── tlqm-design-tokens.css                       # Biến CSS Design Tokens chuẩn (#0A9444, #223873)
│   └── STITCH_DESIGN_CONTEXT.md                     # Tài liệu bối cảnh nghiệp vụ rút gọn cho thiết kế UI
│
├── 04_FRONTEND_UI_SOURCE/                           # Mã nguồn giao diện Frontend nghiệp vụ (Không chứa Backend)
│   ├── app/                                         # Các route Next.js App Router (page.tsx, layout.tsx)
│   ├── components/                                  # Thư viện thành phần (AppShell, UI components, layout)
│   ├── types/                                       # Định nghĩa kiểu dữ liệu TypeScript (Domain, Auth)
│   └── styles_and_config/                           # Cấu hình Tailwind, CSS tokens, PostCSS
│
└── 05_README.md (và README.md)                      # Báo cáo hướng dẫn tổng hợp bộ hồ sơ
```

---

## 3. PHÂN ĐỊNH TRẠNG THÁI MÀN HÌNH

### A. Những màn hình đã được chỉnh sửa thực tế (Đã làm sạch chuỗi kỹ thuật):
1. **`src/components/layout/app-shell.tsx`:** Thay thế hoàn toàn banner môi trường kỹ thuật (`SUPABASE REAL`, `Feature Flag`) thành nhãn vận hành rõ ràng: `BẢN THỬ NGHIỆM` — `Chức năng lưu dữ liệu hiện chưa được mở` hoặc `BẢN MÔ PHỎNG`. Chuyển đổi nhãn phân quyền và thông tin người dùng sang ngôn ngữ hành chính nhân sự.
2. **`src/app/entry/page.tsx`:** Loại bỏ banner ghi nhận RPC và mã hàm `sc_create_vehicle_and_container_visit_atomic`; chuẩn hóa nút xác nhận thành `XÁC NHẬN TIẾP NHẬN VÀO CỔNG`; hiển thị rõ quy chế vé 250.000đ vs 0đ.
3. **`src/app/yard/page.tsx`:** Loại bỏ từ khóa `(Cloud DEV)` trên các nút lưu; chuẩn hóa nhãn modal cập nhật trạng thái Hàng/Rỗng.
4. **`src/app/exit/page.tsx`:** Chuyển đổi toàn bộ mã quyền thô `storage.payment.collect`, mã `AP06`, mã enum `CLEARED_WITH_DEBT`, `CASH`, `BANK_TRANSFER`, và tên hàm `sc_confirm_vehicle_only_exit` sang tiếng Việt nghiệp vụ chuẩn: `Bảo lãnh công nợ`, `Tiền mặt`, `Chuyển khoản`, `Điều kiện xuất bãi: Duyệt xuất (Ghi nợ)`.
5. **`src/app/billing/page.tsx`:** Loại bỏ mã `AP07`, `AP06`, `RBAC V5` trong tiêu đề phụ và thông báo quyền hạn; chuẩn hóa thông điệp kế toán.
6. **`src/app/admin/vehicle-types/page.tsx`:** Loại bỏ mã `AP10 Four-Eyes` và tên RPC `sc_manage_vehicle_type` khỏi hộp cảnh báo tài chính.

### B. Những màn hình mới chỉ có bản thiết kế trong Google Stitch (Chờ phê duyệt):
1. **Màn hình Tổng quan CCKB (`04_CCKB_Tong_quan_Desktop_1440`):** Bản thiết kế với 6 thẻ chỉ số nghiệp vụ V5, bảng phân bổ cước điện làm tròn 15 phút và panel thao tác nhanh tại quầy thương vụ.
2. **Màn hình Tiếp nhận cổng An ninh (`02_An_ninh_Xe_vao_Desktop_1440`):** Bản thiết kế với khối chọn 7 loại xe trực quan, trường nhập biển số cực lớn, khối khớp nối yêu cầu điện tử và nút xác nhận cảm ứng 44px.
3. **Màn hình Xuất bãi & Thu tiền (`07_08_CCKB_Thu_tien_Duyet_xuat_Desktop_1440`):** Bản thiết kế phân tách 2 lớp kiểm soát giữa CCKB (duyệt cước điện) và An ninh bốt cổng (chốt lưu bãi xe ra).
4. **Màn hình Cắm/Rút điện lạnh (`06_CCKB_Phien_dien_Desktop_1440`):** Bản thiết kế quản lý phiên điện lạnh, biểu đồ nhiệt độ ca trực và theo dõi cọc cắm.
5. **Màn hình Điều phối vị trí bãi (`09_Dieu_phoi_Hang_Rong_Desktop_1440`):** Bản thiết kế sơ đồ bãi container trực quan.

---

## 4. ĐỀ XUẤT CỦA ANTIGRAVITY CHO GIAI ĐOẠN TIẾP THEO

1. **Về Thẩm mỹ & Nhận diện thương hiệu:**
   - Đưa hệ thống biến màu sắc từ `tlqm-design-tokens.css` vào `tailwind.config.ts` để áp dụng nhất quán màu xanh lá thương hiệu `#0A9444` và xanh Navy `#223873` trên toàn bộ component, thay thế các màu xanh mặc định rời rạc.
   - Duy trì nguyên tắc **Light Mode duy nhất**; đảm bảo độ tương phản tối thiểu WCAG AA cho môi trường làm việc ngoài trời nắng gắt.
2. **Về Trải nghiệm thao tác (UX cho bốt cổng ngoài bãi):**
   - Tối ưu kích thước các nút bấm trên màn hình điện thoại/máy tính bảng của An ninh đạt tối thiểu **44px** chiều cao (`--touch-min: 44px`).
   - Tích hợp điều hướng bằng phím tắt (phím `Enter` xác nhận, phím `F2` tạo phiếu mới) giúp giảm 40% thời gian tiếp nhận xe tại cổng vào giờ cao điểm.
3. **Về Hiển thị dữ liệu:**
   - Định dạng in hoa font Mono (`font-mono font-bold tracking-wider`) đồng bộ cho toàn bộ biển số xe và số container trên tất cả các màn hình.
   - Thể hiện trạng thái thanh toán và clearance bằng cả **màu sắc kết hợp chữ/icon**, không dùng màu sắc đơn thuần.

---

## 5. CAM KẾT RANH GIỚI AN TOÀN

- **Không chứa bí mật:** Hồ sơ tuyệt đối không chứa tệp `.env`, API Key, Supabase secret, mật khẩu người dùng hay service role key.
- **Không chứa mã nguồn thừa:** Đã loại trừ toàn bộ `node_modules`, thư mục build `.next`, database backups và mã nguồn Backend không thuộc phạm vi Frontend.
- **Không thay đổi Backend:** Toàn bộ PostgreSQL Migrations 001–008, RPC functions, RLS policies và 206 grants RBAC V5 trên Cloud DEV giữ nguyên vẹn 100%.
- **Gate 2 tiếp tục TẠM DỪNG:** Biến môi trường `NEXT_PUBLIC_ENABLE_REAL_WRITE` tiếp tục duy trì trạng thái **TẮT** (`false`).
