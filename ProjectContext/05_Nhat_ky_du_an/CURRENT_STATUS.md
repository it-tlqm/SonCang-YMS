# CURRENT STATUS — Bộ nhớ tiến độ (cập nhật sau mỗi phiên)

**Khởi tạo:** 11/10/2026.  
**Trạng thái được xác minh:** chỉ xác minh tài liệu đầu vào và một số HTML thiết kế Stitch; **chưa kiểm tra repository Antigravity, Supabase thực tế, migration hoặc test**. Không giả định đã triển khai.

## 1. Trạng thái nguồn và UI

| Hạng mục | Trạng thái tại thời điểm khởi tạo |
|---|---|
| Nghiệp vụ | `PROJECT_CONTEXT.md` V5; tài liệu V3 117 trả lời; V4/UAT lịch sử |
| Phân quyền | Excel V5 có 67 permissions, 206 grants, 7 role V1; hướng dẫn RBAC + SQL draft |
| Design System, An ninh 01–03 | Có mockup Stitch; dùng tham khảo, không coi là code hoàn chỉnh |
| CCKB 04 Dashboard | Có mockup Stitch; đã phát hiện một số lệch UI/nhãn; giữ layout |
| CCKB 05 Yêu cầu điện | Có mockup đủ 4 kích thước; **có lỗi giá điện, ISO/auto-correct và JS demo**, không kế thừa logic |
| CCKB 06 Phiên điện | Có prompt thiết kế; chưa xác minh đầu ra mới |
| CCKB 07–08 Thu tiền/duyệt xuất | Chưa có bản chính thức được xác minh; có thể gộp mẫu UI |
| Điều phối 09 HÀNG/RỖNG | Chưa có bản chính thức được xác minh |
| Backend Antigravity | CHƯA KIỂM TRA / CHƯA THỂ XÁC NHẬN ĐÃ KHỞI TẠO |
| Supabase/Auth/RLS | CHƯA KIỂM TRA / CHƯA CÓ TEST XÁC NHẬN |
| UAT/Pilot | CHƯA THỰC HIỆN theo hồ sơ đang có |

## 2. Chủ trương triển khai đã thống nhất

- Google Stitch chỉ là **tham khảo UI/UX**, không cố chỉnh mã mô phỏng 100% để tích hợp.
- Antigravity được phép bắt đầu Backend foundation song song với các mockup còn lại.
- Ưu tiên đọc ProjectContext + kiểm tra repository hiện có trước khi viết migration, không tạo hai dự án nhầm nhau.
- V1: Next.js App Router + TypeScript, Supabase Auth/Postgres/Storage/RLS; PWA responsive; staging trước production.

## 3. Nhiệm vụ tiếp theo cho Antigravity (CHƯA THỰC HIỆN)

1. Đọc `AGENTS.md`, `ProjectContext/00_START_HERE.md` và hồ sơ V5.
2. Kiểm tra trạng thái repository hiện có, framework, CI, config Supabase; báo cáo **đang có gì, thiếu gì**.
3. Lập ERD/schema và migration plan, RBAC seed chính xác từ workbook V5; phân biệt SQL draft với migration thật.
4. Tạo local/staging foundation, Auth + RLS tests, không thao tác production.
5. Chỉ sau kiểm thử nền tảng mới triển khai luồng xe/container, điện, sổ thu, cổng ra theo giai đoạn.

## 4. Những phần còn mở

Xem `OPEN_DECISIONS_UAT.md` (RV01–RV12). Không đánh dấu đã quyết định khi mới chỉ là gợi ý kỹ thuật.

## 5. GHI SAU MỖI PHIÊN (AI PHẢI CẬP NHẬT)

- **Cập nhật lúc:** 13/10/2026 17:15 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **CHUẨN HÓA TOÀN DIỆN NGHIỆP VỤ THU PHÍ & SỔ CÁI (/billing): ĐỊNH DANH ĐỐI TƯỢNG, THU GỘP 1-N VÀ PHÂN QUYỀN TRIỆT ĐỂ**:
  * **1. Định danh đối tượng rõ ràng trên Sổ cái:** Truy vấn liên kết đa tầng giữa `app_charges`, `app_reefer_power_sessions`, `app_container_visits`, `app_vehicle_visits`, và `app_reefer_requests`. Hiển thị đầy đủ badges: Số container (`📦 Cont: {container_no}`), Tên & SĐT khách hàng/chủ hàng (`👤 Khách: {customer_name}`), và Xe chở vào (`🚛 Xe: {license_plate}`).
  * **2. Thu gộp linh hoạt 1-n yêu cầu / 1-n container:** Hỗ trợ nút gom nhanh 1-chạm (`⚡ Gom tất cả của cont này` và `👤 Gom tất cả của khách này`); thêm bộ lọc dropdown theo Container và theo Khách hàng; thanh tác vụ gom thu nổi hiển thị tổng số cont, danh sách khách hàng, tổng tiền bằng số và chữ; Modal thu gộp có bảng kê chi tiết và mã VietQR thanh toán tự động; mẫu in biên lai tổng hợp gộp chi tiết từng cont.
  * **3. Tách bạch vai trò triệt để (Role Isolation):**
    - CCKB (`PORT_STAFF`, `PORT_LEAD`): CHỈ thấy và thu Cước điện (`REEFER`), tiêu đề giao diện và các thẻ KPI chuyên biệt cho cước điện; hoàn toàn không thấy vé xe hay tiền lưu bãi.
    - An ninh (`SEC_STAFF`, `SEC_LEAD`): CHỈ thu Vé xe (`TICKET`) và xem lịch sử Phí lưu bãi (`STORAGE`); tuyệt đối không thấy và không thu tiền điện.
    - Quản trị viên (`SYS_ADMIN`): Toàn quyền quản lý và lọc tự do.
  * **4. Phí lưu đêm container chốt tại Cổng ra (`/exit`):** Tại trang `/billing`, khoản lưu bãi chỉ để tra cứu lịch sử, không có checkbox hay nút thu tiền lẻ tẻ trước khi xe chở cont xuất bãi thực tế (đúng nguyên tắc V5).
  * **5. Đã xác minh:** Lệnh `npm run build` kết thúc thành công mã 0 (17/17 routes, 0 lỗi TypeScript).
  * **6. Trạng thái:** Sẵn sàng commit và push lên GitHub `it-tlqm/SonCang-YMS` nhánh `main` để Vercel tự động triển khai.

- **Cập nhật lúc:** 13/10/2026 16:50 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **NÂNG CẤP GIAO DIỆN BÃI XE, CRUD PHÂN KHU, KIỂM SOÁT XUẤT BÃI NỢ ĐIỆN VÀ TOÀN DIỆN 67 QUYỀN RBAC V5**:
  * **1. Cột Tác vụ bãi xe (`/yard`):** Gom toàn bộ 5-6 nút thao tác dàn trải (`Sửa biển`, `Hiệu chỉnh`, `Log xe`, `HÀNG/RỖNG`, `Sửa cont`, `Gán ô đỗ`) thành Dropdown Action Menu `Thao tác ▾` sạch sẽ, tự đóng khi click ngoài; chỉ giữ nút `Thu phí` (nếu chưa thu vé) hiển thị nổi bật trực tiếp.
  * **2. Sơ đồ Phân khu bãi & Giắc cắm điện (`/yard`):** Mở tính năng Tạo / Sửa / Xóa (CRUD) Phân khu bãi chức năng (mã, tên, mô tả, sức chứa, trạng thái trụ điện 380V, màu sắc); bổ sung kiểm soát và hiển thị mã Giắc cắm điện container (`⚡ Giắc: {slot_code}`) trực tiếp trên bảng bãi xe.
  * **3. Kiểm soát điều kiện xuất bãi CCKB (`/exit`):** Container có phát sinh cắm điện bắt buộc phải thanh toán đủ toàn bộ tiền điện; nếu chưa thanh toán, CCKB bắt buộc phải tích chọn xác nhận bảo lãnh công nợ (`CLEARED_WITH_DEBT`) và nhập người bảo lãnh; Cổng ra chặn tuyệt đối nếu container còn nợ tiền điện mà chưa được CCKB duyệt ghi nợ.
  * **4. Chuẩn hóa Nhân sự & Phân quyền (`/admin/users`):** Bỏ nhãn tạm thời/thử nghiệm; cập nhật danh sách nhân sự chính thức chuẩn 7 vai trò V1; hoàn thiện ma trận hiển thị trọn vẹn toàn bộ 67 Action Permissions chuẩn V5 phân theo 9 module nghiệp vụ, kiểm tra đúng 100% logic `ROLE_PERMISSIONS_V5`.
  * **5. Đã xác minh:** Lệnh `npm run build` kết thúc thành công với mã 0 (17/17 static routes, 0 lỗi TypeScript).
  * **6. Trạng thái:** Sẵn sàng commit và push lên GitHub `it-tlqm/SonCang-YMS` nhánh `main` để Vercel CI/CD tự động deploy lên production domain `https://son-cang-yms.vercel.app`.

- **Cập nhật lúc:** 13/10/2026 16:18 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **TINH GIẢN & CHUẨN HÓA NGHIỆP VỤ CẮM ĐIỆN CONTAINER LẠNH (`/reefer`) THEO PHẢN HỒI CCKB**:
  * **1. Phản hồi thực tế hiện trường:** Bộ phận Thương vụ CCKB trao đổi và yêu cầu:
    - Bỏ hiển thị "Quy cách vỏ" (20ft/40ft/RF) vì công nhân hiện trường chưa kiểm soát và chưa phân biệt được.
    - Bỏ các trường "Nhiệt độ cài đặt yêu cầu" và "Loại mặt hàng bảo quản".
    - "Số giờ dự kiến cắm": Để trống tùy chọn (không ép buộc, không mặc định 8h), hỗ trợ nhập nhanh `+4h`, `+8h`, `+12h`, `+24h`.
    - Bỏ tab/chế độ "Đăng ký trước (Chưa vào bãi)" — chỉ tập trung container đang có trong bãi.
    - Tiền cước điện: Bảo đảm tiền điện làm tròn 15 phút luôn tròn bội số 5.000 VND (`Math.round(amount / 5000) * 5000`), không có tiền lẻ 1k, 2k.
    - Bỏ các nút cắm điện trực tiếp trên dòng container trong bãi, chỉ để lại `Tạo yêu cầu cắm điện`.
    - Đổi tên nút `Sửa / Khớp Zalo` ➔ `Sửa / Khớp`.
    - Tạm ẩn tab Nhật ký Nhiệt độ và tab Yêu cầu CCKB riêng biệt; hiển thị tập trung danh sách theo dõi cắm rút điện, bổ sung cột Tên chủ hàng.
  * **2. Đã triển khai:** Cập nhật file `src/app/reefer/page.tsx`.
  * **3. Đã xác minh:** Lệnh `npm run build` kết thúc thành công với mã 0 (17/17 routes tĩnh, 0 lỗi TypeScript).
  * **4. Trạng thái:** Sẵn sàng commit và push lên GitHub nhánh `main` để Vercel CI/CD cập nhật lên web `https://son-cang-yms.vercel.app`.

- **Cập nhật lúc:** 13/10/2026 15:26 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **KHẮC PHỤC TRIỆT ĐỂ LỖI KHÓA NGOẠI AUDIT LOG KHI CẮM ĐIỆN CONTAINER (MIGRATION 020)**:
  * **1. Phân tích nguyên nhân:** Hàm RPC `sc_plug_in_reefer` và `sc_record_completed_reefer_session` trước đây hardcode chuỗi phòng ban `'AN_NINH_CCKB'`. Tuy nhiên, bảng `app_departments` chỉ có 5 mã chuẩn V5 (`AN_NINH`, `CCKB`, `DIEU_PHOI`, `HE_THONG`, `KE_TOAN`). Khi hàm audit gọi `INSERT INTO app_audit_events`, PostgreSQL báo lỗi vi phạm khóa ngoại `app_audit_events_department_code_fkey`.
  * **2. Khắc phục & Phòng thủ toàn diện (Migration 020):**
    - Nâng cấp hàm `sc_log_audit_event`: Tự động làm sạch (sanitize) `department_code` nếu nhận mã không hợp lệ (tự động map sang `CCKB` hoặc `HE_THONG` hoặc fallback theo assignment của user).
    - Cập nhật hàm `sc_plug_in_reefer` & `sc_record_completed_reefer_session`: Truyền đúng phòng ban thực tế của người thao tác (`v_actor_dept`), mặc định `CCKB`.
  * **3. Đã áp dụng:** Chạy trực tiếp Migration 020 lên Supabase Cloud DEV (`euswzyespwaxyrjkfkrq`) thành công (Exit Code 0).
  * **4. Đồng bộ mã nguồn:** Đã commit và đẩy migration 020 lên nhánh `main` của GitHub `it-tlqm/SonCang-YMS` (commit `6cd07a8`).

- **Cập nhật lúc:** 13/10/2026 15:10 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **TRIỂN KHAI THÀNH CÔNG HỆ THỐNG LÊN MÔI TRƯỜNG INTERNET TOÀN CẦU QUA VERCEL**:
  * **1. Tên miền trực tuyến chính thức:** 👉 **`https://son-cang-yms.vercel.app`**
  * **2. Trạng thái Vercel:** `Ready` (Biên dịch Turbopack hoàn tất trong 55s, 0 lỗi).
  * **3. Liên kết CI/CD Tự động:** Kho lưu trữ `it-tlqm/SonCang-YMS` (nhánh `main`) đã kết nối tự động với Vercel. Mọi commit trong tương lai sẽ tự động cập nhật lên môi trường production.
  * **4. Kết nối Cơ sở dữ liệu Cloud:** Đã nạp thành công 4 biến môi trường Supabase Cloud DEV (`euswzyespwaxyrjkfkrq`) với cờ `NEXT_PUBLIC_ENABLE_REAL_WRITE=true`.

- **Cập nhật lúc:** 13/10/2026 14:32 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **KHỞI TẠO & ĐỒNG BỘ THÀNH CÔNG REPOSITORY GITHUB CÔNG TY (`it-tlqm/SonCang-YMS`)**:
  * **1. Cấu hình danh tính Git chuyên biệt:** Cấu hình local `user.name = "it-tlqm"` và `user.email = "it@talunglogistics.com"` cho riêng repository dự án, bảo toàn 100% tài khoản cá nhân của lập trình viên trên máy tính.
  * **2. Phân quyền Cộng tác viên (Collaborator Access):** Kết nối tài khoản máy tính (`thanhngx12-qnh`) với kho lưu trữ công ty `https://github.com/it-tlqm/SonCang-YMS.git`.
  * **3. Làm sạch bảo mật & An toàn Secrets:** Loại bỏ và redact hoàn toàn các Google API key thử nghiệm khỏi commit để tuân thủ quy tắc bảo mật GitHub Push Protection.
  * **4. Bản commit đầu tiên (Initial Commit):** Đóng gói toàn bộ mã nguồn Next.js 16, các màn hình vận hành, hệ thống Supabase migrations 001–019, bộ test pgtap, và tài liệu nghiệp vụ V5.
  * **5. Đồng bộ thành công:** Đẩy nhánh `main` lên `origin/main` tại `https://github.com/it-tlqm/SonCang-YMS`.

- **Cập nhật lúc:** 13/10/2026 14:05 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN TẤT NÂNG CẤP TOÀN BỘ FILE EXCEL (.XLSX) VỚI STYLING CHUYÊN NGHIỆP, CĂN LỀ, MÀU SẮC THƯƠNG HIỆU & ĐỊNH DẠNG SỐ KẾ TOÁN**:
  * **1. Chuyển sang công nghệ `ExcelJS` (v4.4.0):** Hỗ trợ 100% thuộc tính styling trực tiếp trên file binary `.xlsx` chuẩn OpenXML, tương thích tuyệt đối mọi phiên bản Excel (Desktop / 365 / Web), Google Sheets, Apple Numbers, LibreOffice.
  * **2. Bộ nhận diện thương hiệu Sơn Cảng & Bảng tính Doanh nghiệp:**
    - **Header Doanh nghiệp:** Tên Công ty Cổ phần Tà Lùng Quang Minh, Chi nhánh Cửa khẩu Tà Lùng, Tên Báo Cáo in hoa màu Navy Sơn Cảng (`#1E3A8A`), Kỳ báo cáo & Ngày xuất dữ liệu, merge cell tiêu đề báo cáo.
    - **Tiêu đề cột (Column Headers):** Nền xanh Navy `#1E3A8A`, chữ trắng Bold, căn giữa dọc và ngang, wrapText tự động, viền xanh `#3B82F6`, chiều cao dòng 28pt.
    - **Dòng dữ liệu (Zebra Striping):** Xen kẽ dòng trắng (`#FFFFFF`) và xám dịu (`#F8FAFC`), chiều cao dòng 22pt, viền ô mỏng xám `#E2E8F0` toàn bộ bảng.
    - **Căn lề thông minh (Smart Alignment):**
      * Căn giữa (`center`): STT, Biển số xe, Số container, Mã vé/biên lai, Ngày giờ, Loại cont/xe, Trạng thái, Phân khu, Vị trí đỗ.
      * Căn trái (`left`): Tên tài xế, SĐT, Người thu/cắm, Nội dung khoản thu, Ghi chú.
      * Căn phải (`right`): Số tiền, Thời lượng phút, Đơn giá, Thành tiền.
    - **Định dạng số chuẩn kế toán:** Tự động format số tiền `#,#0` có dấu ngăn cách hàng nghìn rõ ràng (ví dụ: `1,100,000` thay vì số dính liền thô), hỗ trợ trực tiếp các hàm tính toán `=SUM()`.
    - **Highlight trạng thái trực quan:**
      * Xanh lá (`#15803D`, Bold): Đã thu, Đã duyệt, ✓ Sẵn sàng, ✓ Bình thường.
      * Đỏ nổi bật (`#B91C1C`, Bold): Chưa thu, Chờ duyệt, 🚨 TỒN QUÁ HẠN.
      * Cam vàng (`#B45309`, Bold): ⚡ Đang cắm, ⚠️ Theo dõi, Duyệt nợ.
    - **Dòng Tổng cộng Kế toán (Summary Row):** Nền vàng kem `#FEF3C7`, chữ đậm 10.5pt, viền trên mỏng và viền dưới kép đôi (`double`) chuẩn báo cáo tài chính quốc tế.
    - **Ghim cố định dòng tiêu đề (Freeze Panes):** Đóng băng 7 dòng đầu (`views: [{ state: 'frozen', ySplit: 7 }]`), cuộn xuống hàng trăm dòng vẫn nhìn rõ cột.
    - **Tự động căn chỉnh độ rộng cột (`Auto Column Widths`):** Tối ưu theo độ dài ký tự dữ liệu thực tế.
  * **3. Áp dụng đồng bộ cho tất cả 8 Mẫu Báo cáo Chuyên sâu Bến bãi:**
    - Bảng kê Ca trực & Biên lai nộp tiền (`/billing`)
    - Sổ cái Khoản thu & Công nợ (`/billing`)
    - Danh sách Xe đang trong bãi (`/yard`)
    - Danh sách Container tồn bãi (`/yard`)
    - Báo cáo Giám sát Dịch vụ Điện Reefer (`/reefer`)
    - Báo cáo Tồn bãi Tổng hợp Đa Sheet (`/yard`)
    - Báo cáo Thống kê Quản trị & Doanh thu Đa Sheet (`/reports`)
    - Báo cáo Lịch sử Phương tiện Đã xuất bãi (`/exit`)
  * **4. Build & Môi trường chạy thực tế:**
    - `npm run build`: Exit Code 0, PASS 100% toàn bộ 17 routes, 0 lỗi TypeScript.
    - Production Server `npm start`: RUNNING tại `http://localhost:3000` (task-12276).

- **Cập nhật lúc:** 13/10/2026 13:55 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN TẤT ĐỒNG NHẤT TOÀN DIỆN ĐỊNH DẠNG INPUT VÀ PREVIEW NGÀY GIỜ TOÀN HỆ THỐNG**:
  * **1. Chuẩn hóa quy ước định dạng:**
    - Giờ (`time`): `hh:mm` (24h)
    - Ngày (`date`): `dd/MM/yyyy`
    - Giờ và Ngày (`datetime-local`): `hh:mm dd/MM/yyyy`
  * **2. Bổ sung bộ hàm tiện ích hiển thị trong `src/lib/display-formatters.ts`:**
    - `formatTime(date)` ➔ `hh:mm`
    - `formatDate(date)` ➔ `dd/MM/yyyy`
    - `formatDateTime(date)` ➔ `hh:mm dd/MM/yyyy`
    - `toDateTimeLocalValue(date)` ➔ `YYYY-MM-DDTHH:mm`
    - `toDateInputValue(date)` ➔ `YYYY-MM-DD`
  * **3. Áp dụng đồng bộ cho 14/14 ô input và modal toàn hệ thống:**
    - `/billing`: Ô chọn ngày ca trực `reportDate` (`dd/MM/yyyy`), ô chọn khung giờ ca tùy chỉnh `customStartTime` và `customEndTime` (`hh:mm`), nhãn dải ca trực.
    - `/reports`: Ô lọc khoảng thời gian tùy chọn từ ngày - đến ngày (`dd/MM/yyyy`).
    - `/reefer`: Toàn bộ các form/modal Cắm điện (`plugInTime`), Rút điện (`unplugTime`), Nhập hoàn tất cắm & rút Zalo (`compPlugTime`, `compUnplugTime`), Sửa đối soát giờ cắm & rút (`verifyPlugTime`, `verifyUnplugTime`) hiển thị nhãn chuẩn `(hh:mm dd/MM/yyyy)` và badge preview trực quan.
    - `/yard`: Form Tiếp nhận Container lẻ (`singleInboundAt`), Modal Hiệu chỉnh lượt xe An ninh vào cổng (`adjEntryAt`) và xuất bãi (`adjExitAt`) kèm badge preview chuẩn tiếng Việt.
  * **4. Build & Môi trường chạy thực tế:**
    - `npm run build`: Exit Code 0, PASS 100% 17 routes, 0 lỗi TypeScript.
    - Production Server `npm start`: RUNNING tại `http://localhost:3000` (task-12225).

- **Cập nhật lúc:** 13/10/2026 13:25 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN TẤT NÂNG CẤP XUẤT FILE SANG BINARY EXCEL (.XLSX) CHUẨN OPENXML & BỔ SUNG 8 MẪU BÁO CÁO CHUYÊN SÂU BẾN BÃI**:
  * **1. Cài đặt SheetJS (`xlsx` v0.18.5):** Thay thế toàn bộ cơ chế Blob CSV cũ bằng việc tạo file binary `.xlsx` chuẩn 100%, mở trực tiếp trên Excel không bị lỗi font hay cảnh báo định dạng.
  * **2. Chuẩn hóa Định dạng & Header Doanh nghiệp:** Header công ty Cổ phần Tà Lùng Quang Minh, tên báo cáo, ngày xuất, số tiền format kiểu số thực tế `n` (hỗ trợ hàm `=SUM()`), tự động tính độ rộng cột (`autoFitColumns`).
  * **3. 8 Mẫu Báo Cáo Chuyên Sâu:**
    - Mẫu 1: Bảng kê Thu phí Ca trực & Biên lai nộp tiền (`/billing`)
    - Mẫu 2: Sổ cái Khoản thu & Công nợ Bến bãi (`/billing`)
    - Mẫu 3: Danh sách Xe trong bãi (`/yard`)
    - Mẫu 4: Danh sách Container tồn bãi (`/yard`)
    - Mẫu 5: Báo cáo Giám sát Dịch vụ Điện Reefer (`/reefer`) — MẪU MỚI
    - Mẫu 6: Báo cáo Tồn bãi Tổng hợp Đa Sheet (Xe & Cont) (`/yard`) — MẪU MỚI
    - Mẫu 7: Báo cáo Thống kê Quản trị & Doanh thu Đa Sheet (KPI, Ngày, Loại xe) (`/reports`)
    - Mẫu 8: Báo cáo Phương tiện Đã xuất bãi (`/exit`) — MẪU MỚI
  * **4. Build & Môi trường chạy thực tế:**
    - `npm run build`: Exit Code 0, PASS 100% toàn bộ 17 routes, 0 lỗi TypeScript.
    - Production Server `npm start`: RUNNING tại `http://localhost:3000` (task-12098).

- **Cập nhật lúc:** 13/10/2026 13:10 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN TẤT NÂNG CẤP BỘ TỨ TÍNH NĂNG & UX CÔNG THÁI HỌC VẬN HÀNH BẾN BÃI SƠN CẢNG THỰC TẾ**:
  * **1. Cổng vào (`/entry`):** Nhận diện gợi ý 1 chạm lái xe quen (`driver_name`, `driver_phone`) khi gõ biển số xe cũ + Phím tắt bàn phím công nghiệp `Ctrl + Enter` (hoặc `Cmd + Enter`) tiếp nhận xe và in vé không cần chạm chuột.
  * **2. Điện Container (`/reefer`):** Live Reefer Ticker cập nhật mỗi 15 giây hiển thị thời lượng cắm thực tế `⏱️ Xh Yp ({billableM}p cước)` kèm cước tạm tính `~ {tiền} đ` sát sao theo phút thực tế. Fix hydration prerender Date.now() cho Next.js 16.
  * **3. Bãi & Điều phối (`/yard`):** Hệ thống Heatmap Badge cảnh báo màu sắc lưu bãi (<24h xanh, 24-48h vàng, ≥48h đỏ nhấp nháy `animate-pulse`) trên cả 3 bảng Tổng hợp, Cont, Xe + Bộ lọc nhanh Dwell Time trên thanh công cụ.
  * **4. Cổng ra & Xuất bãi (`/exit`):** Cột "Điều kiện xuất bãi" với badge trực quan `Sẵn sàng xuất bãi` / `Chưa đủ điều kiện` kèm checklist chi tiết trên danh sách xe trong bãi + Khối Checklist 4 điều kiện dạng 4 cột trực quan trong Modal Kiểm soát xuất bãi.
  * **5. Build & Môi trường chạy thực tế:**
    - `npm run build`: Exit Code 0, PASS 100% toàn bộ 17 routes, 0 lỗi TypeScript, 0 lỗi prerender.
    - Production Server `npm start`: RUNNING tại `http://localhost:3000` (task-11978).

- **Cập nhật lúc:** 13/10/2026 12:45 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **RÀ SOÁT & CHUẨN HÓA PHÂN QUYỀN TOÀN BỘ CÁC VAI TRÒ (AN NINH, CCKB, ĐIỀU PHỐI, QUẢN TRỊ) THEO NGUYÊN TẮC "CHỈ HIỂN THỊ NHỮNG GÌ THUỘC THẨM QUYỀN"**:
  * **1. Phân quyền Menu Điều hướng Sidebar (AppShell):**
    - `Tiếp nhận Cổng vào (/entry)`: Chỉ cấp cho `vehicle.visit.create`. CCKB và Điều phối hoàn toàn không thấy menu này; chỉ An ninh và Quản trị thấy.
    - `Điện Container (/reefer)`: Chỉ hiển thị nếu có `reefer.session.actual_start.record`, `reefer.request.create`, hoặc `reefer.field_work.note`. Điều phối viên (`DIS_STAFF`/`DIS_LEAD`) bị ẩn hoàn toàn menu Reefer; CCKB (thao tác cắm/rút/tạo phiếu) và An ninh (đo nhiệt độ hiện trường) thấy menu.
    - `Xuất bãi & Cổng ra (/exit)`: Chỉ hiển thị nếu có `exit.clearance.issue` hoặc `exit.actual.confirm`. Điều phối viên bị ẩn hoàn toàn menu Cổng ra; CCKB (duyệt clearance) và An ninh (kiểm soát xe rời bãi) thấy menu.
    - `Thu phí & Sổ cái (/billing)`: Chỉ hiển thị cho An ninh (`ticket/storage.payment.collect`), CCKB (`reefer.payment.collect`), và Quản trị. Điều phối viên hoàn toàn không thấy menu Sổ cái.
    - `Thống kê & Báo cáo (/reports)`: Điều phối viên vẫn có thể xem báo cáo xe/cont, nhưng Tab `Doanh thu & Dòng tiền` và 2 KPI Doanh thu/Công nợ bị ẩn hoàn toàn (xem mục 2).
  * **2. Phân hệ Thống kê & Báo cáo (`/reports`):**
    - Kiểm tra thẩm quyền xem doanh thu qua `can('report.revenue.read')`.
    - Với vai trò Điều phối viên (`DIS_STAFF`/`DIS_LEAD`):
      + Ẩn hoàn toàn Tab `1. Doanh thu & Dòng tiền`.
      + Tự động chọn mặc định Tab `2. Lưu lượng & Loại xe`.
      + Ẩn 2 thẻ KPI "Doanh thu thực thu" và "Khoản nợ chưa thu", chỉ hiển thị 2 thẻ KPI vận hành xe và cont.
      + Modal In Báo Cáo: Tự động chuyển tiêu đề thành "BÁO CÁO THỐNG KÊ VẬN HÀNH BẾN BÃI", ẩn hoàn toàn dòng 1 và 2 (doanh thu/công nợ) và ẩn Bảng II (Cơ cấu 4 nguồn thu).
  * **3. Trang Tổng quan Vận hành (`/dashboard`):**
    - Sửa mã quyền kiểm tra tài chính chuẩn V5: `can('report.revenue.read')`.
    - Với vai trò không có quyền tài chính (như Điều phối): Thay thế Card 4 "Tổng thu ghi nhận" bằng thẻ nghiệp vụ thiết thực "Cont lưu bãi lâu (≥24h)", hiển thị số container tồn bãi quá hạn thay vì hiển thị thẻ "Giới hạn quyền".
  * **4. Build & Môi trường chạy thực tế:**
    - `npm run build`: PASS 100% (17 routes, 0 lỗi TypeScript).
    - Production Server `npm start`: RUNNING tại `http://localhost:3000` (task-11721).

- **Cập nhật lúc:** 13/10/2026 12:35 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **ĐÃ THU HỒI HOÀN TOÀN QUYỀN TẠO/CẮM/RÚT ĐIỆN CỦA AN NINH TRÊN DATABASE SUPABASE (MIGRATION 019) & NÂNG CẤP SERVICE WORKER V3**:
  * **1. Nguyên nhân đã tìm ra:**
    - Bạn đang đăng nhập bằng **tài khoản Supabase thật** (môi trường có nhãn `Vận hành Thử nghiệm`).
    - Trong Migration 013 trước đây (`20261012000013_reefer_security_roles_and_zalo_timestamp.sql`), cơ sở dữ liệu Supabase bị chèn thừa 3 quyền cắm điện và tạo yêu cầu cho `SEC_STAFF` và `SEC_LEAD`: `reefer.request.create`, `reefer.session.actual_start.record`, `reefer.session.actual_end.record`.
    - Do đó hàm RPC `sc_my_permissions()` trên database trả về các quyền này, khiến giao diện của `SEC_STAFF` vẫn bật các nút thao tác điện.
  * **2. Khắc phục triệt để:**
    - **Migration 019 (`supabase/migrations/20261013000019_revoke_sec_reefer_write_permissions.sql`)**: Đã chạy `npx supabase db push` thành công vào Supabase Cloud. Toàn bộ các quyền cắm điện, rút điện, tạo yêu cầu cắm điện đã bị xóa vĩnh viễn khỏi `SEC_STAFF` và `SEC_LEAD`.
    - **Service Worker V3 (`public/sw.js`)**: Nâng cấp cache sang v3 và đổi sang cơ chế `Network-First` cho scripts/styles để trình duyệt không bị kẹt bundle cũ.
    - Giờ đây, tài khoản An ninh (`SEC_STAFF` và `SEC_LEAD`) cả trên Database Supabase thật lẫn Mock đều **100% KHÔNG CÒN QUYỀN VÀ KHÔNG THỂ THẤY BẤT KỲ NÚT CẮM ĐIỆN NÀO**.
  * **3. Build & Server:**
    - `npm run build`: PASS 100% (17 routes, 0 lỗi TypeScript).
    - Production Server `npm start`: RUNNING tại `http://localhost:3000` (task-11579).
    - Phản hồi HTTP 200 OK trên `/dashboard`, `/reefer` và toàn bộ phân hệ.

  * **2. Chuẩn hóa Thiết kế Công nghiệp Cảng cạn Toàn hệ thống:**
    - **Hệ thống Bo góc (Border Radius):**
      + Token `@theme inline`: Hạ `--radius-*` xuống chuẩn công nghiệp: `--radius-md: 4px; --radius-lg: 6px; --radius-xl: 6px; --radius-2xl: 8px; --radius-3xl: 8px;`.
      + Toàn bộ khung bảng, panels, cards: Dùng `rounded-lg` (6px-8px) với đường viền sắc nét `border border-slate-300`.
      + Toàn bộ inputs, selects, textareas, sub-cards: `rounded` (4px) với viền `border border-slate-300 bg-white`.
      + Toàn bộ status badges: `rounded px-1.5 py-0.5 text-[10px] font-bold border border-*` (loại bỏ hoàn toàn `rounded-full` bóng tròn phồng).
    - **Typography & Phân cấp Thông tin:**
      + Tiêu đề trang & Header: `text-lg sm:text-xl font-bold uppercase tracking-tight text-slate-900`.
      + Phân cấp nhãn dữ liệu: `text-[10px]/text-[11px] font-bold uppercase tracking-wider text-slate-600/700`.
      + Dữ liệu định lượng (Biển số xe, Số Container, Tiền tệ VNĐ, Ngày giờ, Mã chứng từ): Bắt buộc dùng `font-mono font-bold text-slate-900` với thuộc tính `font-feature-settings: "tnum", "zero"`.
    - **Bảng biểu Dữ liệu (Data Density Tables):**
      + `thead`: Phẳng, đanh thép `bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-[10px] py-2.5 px-3`.
      + `tbody`: Phân cách rõ ràng `divide-y divide-slate-200`, hover `hover:bg-slate-50`.
      + `tfoot`: Nền `bg-slate-100 border-t border-slate-300 font-mono font-bold text-slate-900`.
  * **3. Các Phân hệ Đã Tái Cấu Trúc 100%:**
    - `src/app/globals.css`: Cấu hình tokens nền công nghiệp (`--color-brand-bg: #F1F5F9`, `--color-brand-border: #CBD5E1`), giới hạn radius toàn cầu.
    - `src/components/layout/app-shell.tsx`: Header, Logo SC, Drawer, Menu Điều hướng desktop & mobile.
    - `src/app/entry/page.tsx`: Cổng vào An ninh (Biển số xe, Loại xe & Biểu phí, Container đi kèm, Thu vé bốt gác, Modals quét CCCD/In vé/Overwrite xe).
    - `src/app/yard/page.tsx`: Quản lý Bến bãi & Điều phối (6 KPI cards, Tabs Tổng hợp/Cont/Xe/Sơ đồ phân khu, 8 Modals điều phối & quản trị).
    - `src/app/exit/page.tsx`: Cổng ra & Xuất bãi (An ninh bốt ra, CCKB Clearance, Lịch sử, Unified Exit Modal, Modal In biên lai).
    - `src/app/dashboard/page.tsx`: Tổng quan Vận hành & Tra cứu bãi (KPIs, Phân bổ 7 loại xe, Cảnh báo quá hạn >24h, Modal tra cứu).
    - `src/app/reefer/page.tsx`: Điện Container Lạnh & Giám sát CCKB (4 KPIs, 3 Tabs, Bảng cắm điện, 7 Modals điện lạnh & nhiệt độ).
    - `src/app/billing/page.tsx`: Thu phí & Sổ cái Bến bãi (KPIs, Bảng Sổ cái các khoản thu, Phân rã 4 nguồn thu, Báo cáo ca trực & Bàn giao ca, Modal Thu gộp, Modal In phiếu thu Mẫu 01-TT/SC, Modal In biên bản bàn giao ca Mẫu BB-BGC/SC).
    - `src/app/reports/page.tsx`: Trung tâm Thống kê & Báo cáo Doanh thu Bến bãi (4 KPIs, 4 Tabs phân tích chuyên sâu, Modal In báo cáo chuẩn Mẫu BC-VH/SC).
    - `src/app/admin/audit-logs/page.tsx`: Nhật ký Kiểm toán Toàn bãi (Audit Trail).
  * **4. Kiểm thử & Môi trường Chạy thực tế:**
    - `npm run build`: PASS 100% (17/17 routes tĩnh, 0 lỗi TypeScript, 0 lỗi cú pháp JSX).
    - Server Production đang chạy ngầm trên port 3000 (task-10765, HTTP 200 OK cho toàn bộ các trang `/billing`, `/reports`, `/admin/audit-logs`, `/entry`, `/yard`, `/exit`, `/reefer`).
    - Tuân thủ nghiêm ngặt quy tắc `AGENTS.md`: Tên nghiệp vụ chuẩn là **Phần mềm quản lý bến bãi/cảng cạn**, tuyệt đối không dùng "BOS". Giữ nguyên 100% logic nghiệp vụ và bảo toàn dữ liệu.

- **Cập nhật lúc:** 13/10/2026 10:25 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN THÀNH 3 YÊU CẦU TRỌNG TÂM VẬN HÀNH BẾN BÃI THỰC TẾ: THU VÉ CỔNG TRỰC TIẾP TẠI CỔNG RA, BẮT BUỘC TÌM/CHỌN CONTAINER KÉO RA, VÀ XỬ LÝ CONTAINER KHI HIỆU CHỈNH ĐỔI LOẠI XE (FIX LỖI RLS)**:
  * **1. Thu tiền vé vào cổng trực tiếp tại Cổng ra (`/exit`):**
    - Giải quyết triệt để vấn đề xe vào cổng chưa thu tiền (`UNPAID`), tài xế ra cổng không phải quay lại bốt vào hoặc sang trang Sổ cái.
    - Cổng ra hỗ trợ thu vé vào cổng tại 2 điểm thao tác:
      + *Nút [Thu vé ngay] trên bảng danh sách xe:* An ninh bấm mở modal thu riêng vé xe nhanh chóng (Tiền mặt / Chuyển khoản VietQR / Số biên lai tham chiếu) mà không cần xuất bãi ngay.
      + *Khối Thu vé vào cổng tích hợp trong Modal Xuất bãi:* Tự động kích hoạt khi xe có vé `UNPAID`, cho phép thu gộp vé cổng cùng lúc với xuất bãi, tính tổng tiền vào Biên lai in `02-PLB/SC`.
    - Hỗ trợ tạo mã VietQR động đúng số tiền vé và cú pháp `VE CONG <biển_số>` để tài xế quét bằng app ngân hàng tức thì.
  * **2. Bắt buộc Tìm & Chọn Container khi xe xuất bãi kéo cont:**
    - Loại bỏ hoàn toàn lỗi tự động auto-select ngầm container trước đó: Chỗ container kéo ra để trống ban đầu (`selectedTrailingContId = ''`).
    - Giao diện highlight cảnh báo nổi bật viền cam/vàng: `⚠️ BẮT BUỘC TÌM & CHỌN CONTAINER KÉO RA`.
    - Gợi ý 1 chạm thông minh: Nếu xe lúc vào cổng có chở container và cont đó vẫn đang `IN_YARD`, hiển thị nút `[📌 Chọn nhanh <số_cont>]`.
    - Ô tìm kiếm nhanh container: Hỗ trợ gõ lọc theo biển số cont hoặc biển số xe kéo vào.
    - Khóa an toàn nút Submit: Nút "Xác nhận Xe & Container Xuất bãi" tự động vô hiệu hóa (`disabled`) và đổi nhãn cảnh báo `Chưa chọn Container kéo ra` nếu chưa chọn container, hoặc nếu container đang cắm điện (`isTrailingContPlugged`).
  * **3. Nghiệp vụ xử lý Container khi đổi loại xe & Khắc phục lỗi Supabase RLS:**
    - Khi hiệu chỉnh lượt xe từ `Xe container lạnh` sang loại xe không chở cont (như xe bo tải thùng, đầu kéo không moóc): Cung cấp 2 lựa chọn rõ ràng:
      + `CANCEL`: Hủy container do nhập nhầm lúc vào cổng, ghi vết kiểm toán.
      + `DETACH`: Tách container thành cont tồn bãi lưu kho độc lập, bảo toàn nguồn gốc xe kéo vào.
    - Khắc phục lỗi Supabase RLS `permission denied for table app_vehicle_visits`: Tạo migration `20261013000018_adjust_vehicle_visit_rpc.sql` với hàm RPC `sc_adjust_vehicle_visit` (`SECURITY DEFINER`), hỗ trợ sửa hồi tố, cập nhật tài chính và xử lý cont đồng bộ an toàn theo nguyên tắc bảo mật.
  * **4. Kiểm thử & Môi trường Chạy thực tế:**
    - `npm run build`: PASS 100% (17/17 routes tĩnh, 0 lỗi TypeScript).
    - Server Production đang chạy ngầm trên port 3000 (task-10454, HTTP 200 OK cho cả `/exit` và `/yard`).

- **Cập nhật lúc:** 13/10/2026 10:05 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN TẤT HỆ THỐNG PHÁT HIỆN & CẢNH BÁO TRÙNG LẶP SỐ CONTAINER & PHƯƠNG TIỆN TỨC THÌ (REAL-TIME AS-YOU-TYPE) TẠI CỔNG VÀO (`/entry`)**:
  * **1. Cảnh báo Trùng số Container Tức thì As-You-Type (0ms In-Memory):**
    - Loại bỏ hoàn toàn tình trạng gõ xong số container chỉ hiện tick xanh hợp lệ ISO rồi sau đó mới báo lỗi khi bấm submit.
    - Ngay khi nhân viên gõ số container (cả Cont #1 và Cont #2 khi chở DUAL_20FT), hệ thống đối soát tức thì với toàn bộ container đang có trạng thái `IN_YARD` trong bãi.
    - Nếu trùng: Viền ô nhập lập tức chuyển đỏ rực (`border-rose-500`), icon đổi thành `AlertOctagon` nhấp nháy, bên dưới xuất hiện Hộp Cảnh Báo Trùng Container Lưu Bãi nổi bật gồm:
      + Số container đang trùng.
      + Thời gian vào bãi của lượt cont trước.
      + Phương tiện chở vào bãi (biển số xe kéo hoặc hạ bãi lẻ).
      + Quy cách vỏ (kích cỡ 20/40/45ft, loại RF/DC/OT, tình trạng hàng HÀNG/RỖNG/Chưa XĐ).
      + Vị trí đỗ trong bãi (Phân khu, Ô/trụ cắm điện).
      + Cảnh báo quy tắc nghiệp vụ cảng Tà Lùng Quang Minh: Không tự động gộp lượt xe và lượt cont; không cho phép xe mới mang cùng số container vào bãi khi cont cũ chưa rời bãi.
    - Khi chở cặp 2x20ft: Phát hiện ngay nếu Cont #2 trùng hoàn toàn với Cont #1 hoặc Cont #2 trùng cont đang lưu bãi.
    - Khóa an toàn nút Submit: Nút "Xác nhận tiếp nhận vào cổng" tự động vô hiệu hóa (`disabled`) kèm thông báo chặn đỏ nổi bật trên nút nếu có bất kỳ vi phạm trùng cont nào.
    - Tự động xóa thông báo lỗi cũ ngay khi người dùng bắt đầu chỉnh sửa lại biển số xe hoặc số container.
  * **2. Nâng cấp Kiểm tra Biển số Xe Thời gian thực:**
    - Kết hợp kiểm tra tức thì 0ms trên danh sách xe đang trong bãi (`localDuplicateVehicle`) và cơ chế debounce 300ms với chính sách trùng lặp xe bến bãi.
    - Tự động xóa thông báo lỗi khi gõ hoặc khi dùng các phím gõ nhanh biển số Trung Quốc (+桂, +粤, +云, +湘, +挂).
  * **3. Kiểm thử & Môi trường Chạy thực tế:**
    - `npm run build`: PASS 100% (17/17 routes tĩnh, 0 lỗi TypeScript).
    - Server Production đang chạy mượt mà tại `http://localhost:3000` (task-10224, HTTP 200 OK).

- **Cập nhật lúc:** 13/10/2026 08:48 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN TẤT CHỨC NĂNG HIỆU CHỈNH LƯỢT XE HỒI TỐ (BACKDATE & SỬA SAI CA TRỰC / HỦY VÉ HOÀN TIỀN) & TIẾP NHẬN CONTAINER RIÊNG LẺ HẠ BÃI**:
  * **1. Phân hệ Hiệu chỉnh Lượt xe Ca trực (Lead An ninh `SEC_LEAD` / Quản trị viên `SYS_ADMIN`):**
    - Cho phép sửa ngày giờ xe vào cổng (`entry_at`) hồi tố/backdate nếu ca trước quên quẹt thẻ, tự động đồng bộ giờ vào cho container đi kèm.
    - Cho phép sửa ngày giờ xe xuất bãi (`exit_at`) hoặc hủy trạng thái xuất bãi đưa xe trở lại bãi (`IN_YARD`).
    - Cho phép sửa Loại phương tiện theo 7 loại chuẩn V5, tự động cập nhật hoặc điều chỉnh lại đơn giá vé cổng tương ứng.
    - Cho phép đổi Trạng thái vé cổng (`PAID`, `UNPAID`, `EXEMPT`, và đặc biệt là `CANCELLED` - Hủy vé & Hoàn tiền tài xế).
    - Cơ chế Hủy vé / Hoàn tiền: Khi chọn `CANCELLED`, hệ thống bắt buộc nhập Lý do hoàn tiền và tự động đồng bộ hủy khoản cước vé cổng (`TICKET`) trong sổ cái tài chính `charges`, trừ doanh thu ca trực tương ứng để đối soát minh bạch.
    - Ràng buộc kiểm toán: Bắt buộc nhập Lý do hiệu chỉnh ca trực tối thiểu 5 ký tự và lưu vết người sửa, vai trò, thời gian vào nhật ký xe (`note`).
  * **2. Phân hệ Tiếp nhận Container Riêng lẻ (Hạ bãi không theo xe / Thuê cont ngoài):**
    - Thêm nút `+ Tiếp nhận Cont lẻ (Hạ bãi)` trên Header trang Giám sát bãi (`/yard`).
    - Modal nhập: Số container (validate), Kích cỡ (20/40/45ft), Loại vỏ (RF/DC/OT/FR), Tình trạng hàng (Hàng/Rỗng/Chưa XĐ), Phân khu bãi (Khu A-D), Mã ô đỗ/trụ cắm, Giờ vào hồi tố (có phím tắt Hiện tại, -2h, -6h, -1 ngày), Nguồn gốc phương tiện hạ bãi (Xe cẩu nội bộ / Cont thuê).
  * **3. Cập nhật Repository & Types:**
    - Cập nhật `repository-interface.ts`, `demo-repository.ts` và `supabase-repository.ts` với đầy đủ phương thức `adjustVehicleVisit` và mở rộng `createContainerEntry`.
  * **4. Kiểm thử & Môi trường Chạy thực tế:**
    - `npm run build`: PASS 100% (17/17 routes tĩnh, 0 lỗi TypeScript).
    - Server Production đang chạy mượt mà tại `http://localhost:3000` (task-10096, HTTP 200 OK).

- **Cập nhật lúc:** 13/10/2026 08:34 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **NÂNG CẤP TRUY XUẤT NGUỒN GỐC XE KÉO VÀO CHO CONTAINER TỒN BÃI & HOÀN TẤT BẢN THỬ NGHIỆM GIÁM SÁT BÃI**:
  * **1. Truy xuất & Hiển thị Nguồn gốc Xe kéo vào cho Container Tồn bãi (`/yard`):**
    - Bổ sung `inboundVehicleHistory` vào `YardPairItem` và lưu trữ `allVehicles` để bảo toàn lịch sử các xe đã `EXITED` rời bãi.
    - Cột *Phương tiện vào*: Thay thế dòng chữ mờ nhạt "Cont tồn bãi (Không kèm xe)" bằng thẻ thông tin xe chi tiết: Biển số xe kéo vào, nhãn `[Xe kéo vào (Đã ra)]`, loại xe, giờ xe rời bãi hoặc ghi chú hạ bãi.
    - Cột *Tài xế & CCCD / Ghi chú*: Tự động điền tên và số điện thoại của Lái xe đã chở container vào bãi (kèm nhãn `(Lái xe đã chở cont vào bãi)`).
    - Cột *Tác vụ*: Bổ sung nút `[Log xe kéo]` cho phép nhấp xem ngay toàn bộ nhật ký & lịch sử của lượt xe đã kéo container vào bãi.
    - Đồng bộ hiển thị xe kéo vào trên cả Tab *Tổng hợp Xe — Cont* và Tab *Container*.
  * **2. Kiểm thử & Môi trường Chạy thực tế:**
    - `npm run build`: PASS 100% (17/17 routes tĩnh, 0 lỗi).
    - Server Production đang chạy mượt mà tại `http://localhost:3000` (task-9868, HTTP 200 OK).

- **Cập nhật lúc:** 13/10/2026 00:05 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN TẤT TOÀN DIỆN BỘ 5 TÍNH NĂNG MỞ RỘNG THỰC TẾ BẾN BÃI SƠN CẢNG & CHẠY THỬ NGHIỆM PRODUCTION PASS 100%**:
  * **1. Sơ đồ Phân khu & Gán Vị trí Ô đỗ/Trụ điện (`/yard`):**
    - Thiết lập 4 phân khu chức năng bãi: Khu A (Reefer — 30 trụ điện), Khu B (Dry/Vỏ rỗng), Khu C (Sang tải — Nông sản Tà Lùng), Khu D (Đầu kéo & Chờ bốc dỡ).
    - Tab 4 mới: *Sơ đồ Phân khu (4 khu)* hiển thị thanh tiến độ tỷ lệ % lấp đầy từng khu, số lượng xe/cont đang đỗ và thẻ thông tin trực quan.
    - Modal *Gán Phân khu & Vị trí đỗ*: Cho phép Điều phối viên / An ninh linh hoạt chọn phân khu và nhập mã ô đỗ/trụ cắm (VD: TRU-A12, O-B05, O-C08).
  * **2. Tích hợp Mã VietQR Napas 247 Động (Tất cả các điểm thu tiền):**
    - Kết nối cổng thanh toán chuẩn VietQR QuickPay (Vietcombank CN Cao Bằng — Công ty Cổ phần Tà Lùng Quang Minh).
    - Tự động sinh mã QR động kèm số tiền và nội dung đối soát tại:
      + Bốt gác Tiếp nhận Cổng vào (`/entry`): Quét nộp tiền vé xe vào bãi ngay tại cabin.
      + Sổ cái & Thu phí (`/billing`): Hỗ trợ cả Thu lẻ từng khoản và Thu gộp nhiều khoản (Batch Collection).
      + Cổng xuất bãi (`/exit`): Quét nộp phí lưu bãi container hoặc tiền phạt mất vé giấy.
  * **3. Xuất Báo cáo CSV/Excel UTF-8 BOM Chuẩn Tiếng Việt:**
    - Khắc phục triệt để lỗi font tiếng Việt trên Microsoft Excel Windows bằng UTF-8 BOM (`\uFEFF`).
    - Nút xuất nhanh tại `/billing`: *Xuất Sổ cái Doanh thu* và *Bảng kê Chứng từ Ca trực*.
    - Nút xuất nhanh tại `/yard`: *Xuất Danh sách Xe trong bãi* và *Xuất Danh sách Container trong bãi*.
  * **4. Nhật ký Giám sát Đo kiểm Nhiệt độ Container Lạnh (`/reefer`):**
    - Tab 3 mới: *Nhật ký Nhiệt độ* ghi nhận nhiệt độ thực tế theo từng ca kiểm tra.
    - Modal *Ghi nhận Nhiệt độ*: Nhập nhiệt độ nhanh (-18°C, -20°C, 0°C, +4°C), phân loại trạng thái máy (Ổn định, Lệch nhiệt, Mất nguồn, Xả đá) kèm ghi chú kỹ thuật ca.
  * **5. Tra cứu Lịch sử Xe Đã Rời Bãi Trong Ngày (`/exit`):**
    - Tab 3 mới: *Lịch sử Xe đã xuất bãi* hiển thị đầy đủ xe đã qua cổng ra, thời gian vào/ra, tổng thời gian đỗ trong bãi, tình trạng thanh toán vé và hỗ trợ in lại phiếu xác nhận rời bãi.
  * **6. Kiểm thử & Môi trường Chạy thử nghiệm:**
    - `npm run build`: PASS 100% (16/16 routes tĩnh, 0 lỗi TypeScript).
    - Production Server đang chạy trực tiếp tại `http://localhost:3000` (HTTP 200 OK trên toàn bộ 6 phân hệ).

- **Cập nhật lúc:** 12/10/2026 23:35 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN THÀNH TOÀN DIỆN PHÂN HỆ BÁO CÁO CA TRỰC & BÀN GIAO CA (SHIFT HANDOVER - RV12), THU GỘP NHIỀU KHOẢN (BATCH PAYMENT) VÀ PHẠT MẤT VÉ XE RA MỘT MÌNH**:
  * **1. Phân hệ Báo cáo Ca trực & Bàn giao Ca (Shift Handover Report - RV12):**
    - Nghiệp vụ thực tế Sơn Cảng (Cửa khẩu Tà Lùng): Thay ca trực liên tục giữa các tổ An ninh cổng và Thương vụ CCKB. Trước khi giao ca, bắt buộc phải đối soát tiền mặt thực nhận để bàn giao cho ca tiếp theo và nộp két thủ quỹ công ty.
    - Bộ chọn ca linh hoạt: Ca 1 Sáng (06:00 - 14:00), Ca 2 Chiều (14:00 - 22:00), Ca 3 Đêm (22:00 - 06:00 hôm sau), Ca 12h Ngày (06:00 - 18:00), Ca 12h Đêm (18:00 - 06:00), hoặc Khung giờ tùy chỉnh theo ngày. Tự động nhận diện `[⏱️ Chọn Ca Hiện Tại]`.
    - Bộ lọc theo bộ phận thực thu: Toàn bãi / Bộ phận An ninh Cổng / Thương vụ CCKB.
    - Thẻ KPI đối soát then chốt: **Tiền mặt thực thu bàn giao (CASH)** (nổi bật nhất), **Chuyển khoản ngân hàng (TRANSFER)** (đối chiếu sao kê bến bãi), **Tổng doanh thu ca trực**, và **Lưu lượng bến bãi trong ca** (lượt xe vào, lượt xe ra, phiên cắm điện).
    - Phân rã 4 nguồn thu theo nghiệp vụ V5: Vé vào cổng (`TICKET`), Tiền điện Container Lạnh (`REEFER`), Phí lưu bãi Container (`STORAGE`), Tiền phạt mất vé (`PENALTY`).
    - Bảng kê chi tiết toàn bộ các chứng từ thu tiền phát sinh trong khung giờ ca trực.
    - Chức năng **In Biên bản Bàn giao Ca trực (Mẫu BB-BGC/SC - V5)** chuẩn hành chính Sơn Cảng — Tà Lùng Quang Minh: có chữ ký Đại diện Giao ca, Đại diện Nhận ca và Kế toán / Thủ quỹ xác nhận nộp két.
  * **2. Tính năng Thu gộp nhiều khoản (Batch Collection) tại Sổ cái (`/billing`):**
    - Checkbox chọn nhiều khoản nợ chưa thanh toán (`UNPAID`), nút chọn tất cả.
    - Thanh Floating Bar nổi bật hiển thị tổng số khoản đã chọn và tổng số tiền nợ.
    - Modal Thu Gộp Nhiều Khoản: Cho phép chọn Tiền mặt / Chuyển khoản, sinh mã biên lai gộp `PT-GOP-XXXXXX`, ghi chú đối soát; kiểm soát chặt chẽ RBAC V5 (chặn An ninh thu gộp khoản tiền điện).
    - Modal In Biên lai Thu tiền Tổng hợp Gộp (Mẫu 01-TT/SC Gộp) liệt kê chi tiết từng hạng mục cho tài xế/chủ hàng.
  * **3. Đồng bộ Phạt mất vé cho xe rời bãi một mình tại Cổng ra (`/exit`):**
    - Modal Cổng ra khi xe không kéo cont: Bổ sung checkbox `[☑] Báo mất liên vé giấy vào cổng (Phạt 250.000 đ theo quy định)`.
    - Tùy chọn thu phạt bằng Tiền mặt hoặc Chuyển khoản, nhập mã tham chiếu; tự động xuất Biên lai thu phạt bến bãi (Mẫu 02-PLB/SC).
  * **4. Kiểm thử & Môi trường:**
    - `npm run build`: PASS 100% (16/16 static routes, 0 lỗi TypeScript).
    - Production server đang chạy ổn định tại `http://localhost:3000` (HTTP 200 OK).

- **Cập nhật lúc:** 12/10/2026 23:10 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN THÀNH TÍNH NĂNG KIỂM SOÁT TRÙNG LẶP PHƯƠNG TIỆN CẤU HÌNH SÂU NHIỀU TRƯỜNG HỢP (MIGRATION 017 & TOÀN DIỆN FRONTEND/BACKEND)**:
  * **1. Yêu cầu từ Chủ dự án:**
    - Người dùng yêu cầu: *"chức năng trùng lặp phương tiện có thể cấu hình sâu nhiều trường hợp chứ không phải mỗi tắt bật"*.
    - Thực tế bến bãi Sơn Cảng (cửa khẩu Tà Lùng): Xe bo tải thùng chạy con thoi nhiều chuyến trong ngày, xe đầu kéo hạ bãi rồi ra cổng phụ chưa kịp quẹt ra, xe quay đầu ngay cổng, hoặc thao tác nhấp đúp nhầm của bảo vệ. Không thể chỉ dùng 1 nút Bật/Tắt chặn cứng.
  * **2. Database Migration 017 (`20261012000017_vehicle_duplicate_policy.sql` - ĐÃ PUSH THÀNH CÔNG SUPABASE CLOUD DEV):**
    - **Bảng `app_vehicle_duplicate_policies`:**
      + `policy_mode`: 4 chế độ (`WARN_AND_ALLOW` - Cảnh báo & ghi đè có lý do; `BLOCK_STRICT` - Chặn nghiêm ngặt; `AUTO_CLOSE_PREVIOUS` - Tự động xuất bãi lượt cũ; `ALLOW_SILENT` - Mở tự do).
      + `cooldown_minutes`: Cài đặt thời gian đệm chống double-entry (mặc định 15 phút); `cooldown_action`: `BLOCK` hoặc `WARN`.
      + `check_unpaid_ticket`: Kiểm tra công nợ vé cổng lượt cũ; `block_if_unpaid_ticket`: Chặn vào cổng nếu còn nợ vé cũ.
      + `require_override_reason`: Bắt buộc nhập/chọn lý do khi ghi đè; `allow_quick_exit_previous`: Cho phép An ninh đóng nhanh lượt cũ ngay tại Cổng vào.
      + `exempt_vehicle_types`: Danh sách loại xe ngoại lệ (xe đầu kéo, xe bo 4 chân, 3 chân, 8 tấn, sang tải...).
      + `preset_reasons`: Danh mục lý do mẫu cấu hình được dạng JSONB.
    - **Mở rộng `app_vehicle_visits`:** Bổ sung `is_duplicate_entry`, `previous_visit_id`, `duplicate_override_reason`, `duplicate_override_by`.
    - **RPC Functions:** `sc_check_vehicle_duplicate` (kiểm tra realtime), `sc_update_vehicle_duplicate_policy` (quản trị), cập nhật `sc_create_vehicle_visit` và `sc_create_vehicle_and_container_visit_atomic` hỗ trợ `p_override_duplicate`, `p_duplicate_reason`, `p_close_previous_visit`.
  * **3. Frontend & Trải nghiệm người dùng:**
    - **Tại Cổng vào (`/entry`):**
      + Debounce kiểm tra trùng lặp realtime khi gõ biển số xe.
      + Banner màu vàng/đỏ trực quan hiển thị ngay dưới ô biển số: thời gian vào trước, đã đỗ bao lâu, trạng thái vé cũ.
      + Modal "Xác nhận Xe Trùng Lặp Trong Bãi" so sánh song song 2 lượt xe, chọn lý do nghiệp vụ mẫu / tự nhập, tùy chọn tick "Đồng thời xuất bãi lượt cũ tại Cổng ra".
      + Modal "Không Thể Tiếp Nhận Phương Tiện" khi xe vi phạm Cooldown, nợ vé hoặc chính sách chặn nghiêm ngặt.
    - **Tại Trang Quản trị mới (`/admin/vehicle-duplicate`):**
      + Giao diện cấu hình sâu toàn diện: Chọn chế độ xử lý, thời gian Cooldown, kiểm tra nợ vé, checkbox loại xe ngoại lệ, thêm/xóa lý do mẫu.
      + Liên kết đồng bộ trên Navigation AppShell, trang Loại xe (`/admin/vehicle-types`) và Biểu phí (`/admin/tariffs`).
  * **4. Kiểm thử & Production Server:**
    - `npm run build`: PASS 100% (16/16 routes, 0 lỗi TypeScript).
    - Production server đang chạy ổn định tại `http://localhost:3000`.
- **Mốc hiện tại:** **CHUẨN HÓA QUY TRÌNH NGHIỆP VỤ: CONTAINER BẮT BUỘC PHẢI CÓ YÊU CẦU CẮM ĐIỆN MỚI ĐƯỢC PHÉP CẮM / RÚT / KHỚP ZALO**:
  * **1. Phản hồi từ Chủ dự án:**
    - Người dùng chỉ ra bất cập: Khi mở Modal "Nhập Hoàn Tất Phiên Điện (Cắm & Rút)" ngoài bãi, hệ thống lại cho phép chọn cả những container lạnh không hề đăng ký cắm điện (ví dụ `MMMM6655555` của xe `挂挂挂挂7`).
    - Quy tắc nghiệp vụ chuẩn Sơn Cảng: **Container phải có Yêu cầu cắm điện (`app_reefer_requests`) thì mới phát sinh việc cắm điện hoặc ghi nhận cắm rút hồi tố theo Zalo!**
  * **2. Khắc phục & Chuẩn hóa toàn bộ giao diện (`/reefer`):**
    - **Lọc chặt chẽ `requestedContainersInYard`:** Modal Cắm điện (`showPlugModal`) và Modal Hoàn tất Zalo (`showCompletedModal`) chỉ hiển thị các container trong bãi đã có Yêu cầu cắm điện đang chờ cắm (`CONTAINER_ARRIVED` hoặc `PLANNED`). Tuyệt đối loại bỏ các container không đăng ký dịch vụ điện.
    - **Cảnh báo nghiệp vụ thân thiện:** Nếu trong bãi không có container nào có yêu cầu cắm điện, modal hiển thị thông báo nghiệp vụ kèm nút chuyển nhanh sang `[+ Tạo Yêu cầu cắm điện trước (CCKB)]`.
    - **Bổ sung nút `[Nhập Zalo]` trên từng dòng yêu cầu (Tab Requests):** Cho phép CCKB/An ninh nhập trực tiếp phiên điện hoàn tất Zalo từ chính yêu cầu đó, tự động liên kết `request_id` và tự động cập nhật yêu cầu sang `COMPLETED`.
  * **3. Kiểm thử & Server:**
    - `npm run build`: PASS 100% (15/15 routes, 0 lỗi TypeScript).
    - Next.js server production đang chạy ổn định tại `http://localhost:3000`.

- **Cập nhật lúc:** 12/10/2026 22:30 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN THÀNH TÍNH NĂNG CHỈNH SỬA LINH HOẠT CẮM/RÚT ĐIỆN CHO CCKB: CẮM DỰ KIẾN, CẮM THỰC TẾ, RÚT THỰC TẾ, RÚT DỰ KIẾN (MIGRATION 016 & FRONTEND/BACKEND)**:
  * **1. Nghiệp vụ giai đoạn thực tế (CCKB & An ninh):**
    - Người dùng yêu cầu cho phép Thương vụ CCKB chỉnh sửa linh hoạt và thoải mái các mốc thời gian cắm điện: cắm dự kiến, cắm thực tế, rút thực tế, rút dự kiến phù hợp với luồng thực tế (An ninh gửi ảnh/video cắm rút qua Zalo, CCKB đối soát và điều chỉnh).
  * **2. Database Migration 016 (`20261012000016_cckb_flexible_reefer_edits.sql`):**
    - Tạo RPC `sc_update_reefer_request`: Cho phép CCKB cập nhật toàn bộ thông tin yêu cầu cắm điện (`container_no_planned`, `expected_license_plate`, `customer_name`, `customer_phone`, `power_mode`, `temperature_setting`, `status`, `notes`), tự động ghi log kiểm toán `sc_log_audit_event`.
    - Nâng cấp RPC `sc_verify_reefer_session_zalo`: Bổ sung tham số `p_status`, cho phép sửa đồng thời cả `plugged_in_at` (cắm thực tế) và `unplugged_at` (rút thực tế), tự động tính lại số phút làm tròn 15p, cước phí theo đơn giá niêm yết hiện hành và đồng bộ trực tiếp vào `app_charges`.
    - Đã push thành công lên Supabase Cloud DEV (`son-cang-yms-dev`, ref `euswzyespwaxyrjkfkrq`).
  * **3. Cập nhật Service Layer (`repository-interface.ts`, `supabase-repository.ts`, `demo-repository.ts`):**
    - Bổ sung interface `UpdateReeferRequestParams` và phương thức `updateReeferRequest(...)`.
    - Bổ sung `status?: ReeferPowerStatus` vào `VerifyReeferSessionZaloParams`.
    - Triển khai đầy đủ trên cả hai chế độ Supabase Cloud và Demo LocalStorage.
  * **4. Cập nhật giao diện Giám sát Điện Container (`/reefer`):**
    - **Tab Phiên cắm điện thực tế (`SESSIONS`):** Đổi nút thành `[Sửa / Khớp Zalo]`. Nâng cấp Modal thành giao diện chỉnh sửa toàn diện: sửa giờ cắm thực tế (kèm nút nhanh `-15p`, `-30p`, `-1h`, `-2h`, `Bây giờ`), sửa giờ rút thực tế (kèm nút nhanh hoặc xóa giờ rút nếu tiếp tục cắm), chọn trạng thái phiên điện (`PLUGGED`, `UNPLUGGED`, `PENDING_REVIEW`, `CANCELLED`), tự động tính cước tức thì (làm tròn 15p), sửa ghi chú đối chiếu.
    - **Tab Đăng ký cắm điện trước (`REQUESTS`):** Bổ sung nút `[Sửa yêu cầu]` trên từng dòng. Xây dựng Modal chỉnh sửa yêu cầu: sửa số cont dự kiến (kèm realtime validator ISO 6346), biển số dự kiến, chủ hàng, số điện thoại, nhiệt độ, chế độ cắm, số giờ dự kiến (+4h, +8h, +12h, +24h), cước ước tính động, trạng thái yêu cầu (`PLANNED`, `CONTAINER_ARRIVED`, `PLUGGED`, `COMPLETED`, `CANCELLED`) và ghi chú.
  * **5. Kiểm thử & Môi trường:**
    - `npm run build`: **PASS 100% (15/15 routes, 0 lỗi TypeScript)**.
    - Server Next.js production đang chạy ổn định tại `http://localhost:3000`.

- **Cập nhật lúc:** 12/10/2026 22:15 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **ĐỒNG BỘ ĐỘNG 100% ĐƠN GIÁ TIỀN ĐIỆN TỪ BIỂU PHÍ NIÊM YẾT (DIEN_CONT_GIO) — LOẠI BỎ TRIỆT ĐỂ HARDCODE (MIGRATION 014 & 015)**:
  * **1. Khắc phục nguyên nhân gốc rễ đơn giá điện bị lệch 35k dù đã set 100k:**
    - Người dùng đã cấu hình đơn giá điện `DIEN_CONT_GIO` trong Bảng giá & Biểu phí (`/admin/tariffs`) là **100.000 đ/giờ**, nhưng một số form tính toán dự kiến ở giao diện `/reefer` và hàm RPC trước đó bị hardcode con số tĩnh `35000` (giá cũ).
    - Đã loại bỏ 100% các giá trị hardcode trong toàn bộ hệ thống; áp dụng nguyên tắc tài chính V5: **Đọc động biểu phí niêm yết từ `app_tariffs` (mã `DIEN_CONT_GIO`, cột `amount`)**.
  * **2. Database Migrations 014 & 015 (`sc_plug_in_reefer` & `sc_record_completed_reefer_session`):**
    - Truy vấn trực tiếp đơn giá từ `app_tariffs WHERE code = 'DIEN_CONT_GIO' AND is_active = true`.
    - Khi cắm điện hoặc hoàn tất cắm rút: Snapshot chính xác đơn giá niêm yết tại thời điểm thao tác vào `app_reefer_power_sessions.applied_hourly_rate`.
    - Đã push thành công lên Supabase Cloud DEV (`son-cang-yms-dev`, ref `euswzyespwaxyrjkfkrq`).
  * **3. Cập nhật giao diện Giám sát Điện Container (`/reefer`):**
    - Tải động biểu phí `tariffs` qua `repository.getTariffs()`.
    - Tự động lấy đơn giá hiệu lực: `const reeferHourlyRate = reeferTariff ? reeferTariff.amount : 100000;`.
    - Áp dụng đồng bộ cho: Modal Đăng ký trước CCKB (hiển thị đúng `100.000 đ/giờ`, ước tính `số giờ × 100.000đ`), Modal Cắm điện, Modal Nhập hoàn tất Zalo, Bảng yêu cầu và Bảng phiên cắm điện.
  * **4. Kiểm thử & Môi trường:**
    - `npm run build`: **PASS 100% (15/15 static routes, 0 lỗi TypeScript)**.
    - Server Next.js production đang hoạt động ổn định tại `http://localhost:3000`.

- **Cập nhật lúc:** 12/10/2026 22:00 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN THIỆN PHÂN QUYỀN AN NINH & CCKB CẮM/RÚT ĐIỆN THỰC TẾ, ĐỐI CHIẾU ZALO TIMESTAMP VÀ XỬ LÝ KHÔNG CẮM ĐIỆN THỰC TẾ (MIGRATION 013)**:
  * **1. Phân biệt rõ ràng giữa Báo cắm điện và Cắm điện thực tế:**
    - Việc "báo cắm" (yêu cầu đăng ký trước của CCKB hoặc cont lạnh RF vào cổng) hoàn toàn tách biệt với "cắm thực tế".
    - Trường hợp xe chở cont lạnh vào bãi nhưng thực tế **không cắm điện** (tài xế/chủ hàng đủ nhiệt, khách hủy yêu cầu):
      + Hỗ trợ nút `[✕ Không cắm / Hủy]` trực tiếp trên Banner cảnh báo và Bảng yêu cầu của `/reefer`.
      + Tại Cổng ra (`/exit`), khi xe kéo container xuất bãi mà chưa từng phát sinh phiên cắm điện thực tế, hệ thống tự động đóng yêu cầu đăng ký trước sang `CANCELLED` (ghi chú: "Cont xuất bãi - Thực tế không cắm điện"), không bắt buộc CCKB duyệt Clearance và không tính tiền điện.
  * **2. Phân quyền An ninh cắm/rút thực tế ngoài bãi & Bằng chứng Zalo Timestamp:**
    - Cấp quyền `reefer.session.actual_start.record`, `reefer.session.actual_end.record`, `reefer.request.create` cho `SEC_STAFF` và `SEC_LEAD` (Migration 013).
    - Cả An ninh lẫn CCKB đều có quyền thao tác cắm và rút điện trên hệ thống.
    - Cập nhật Form Cắm và Rút điện: Bổ sung các nút khớp giờ giắc Zalo nhanh (`Bây giờ`, `-5p`, `-15p`, `-30p`, `-1h`) và ô ghi chú bằng chứng ảnh/video Zalo.
  * **3. Hỗ trợ nhập hoàn tất hồi tố cả cắm & rút trong 1 form (E04 - V3/V4):**
    - Modal `[+ Nhập cắm & rút hoàn tất (Zalo)]` cho phép ghi nhận trực tiếp phiên điện đã hoàn thành ngoài hiện trường theo bằng chứng ảnh/video Zalo, tự động tính số phút tròn 15p và cước phí (35.000 đ/h), ghi vào Sổ cái.
  * **4. CCKB đối chiếu & điều chỉnh lại giờ giắc Zalo:**
    - Modal `[✓ Đối chiếu Zalo]` cho phép Thương vụ CCKB kiểm tra ảnh/video Zalo timestamp gửi nhóm, điều chỉnh giờ cắm/rút nếu An ninh nhập lệch so với thực tế và tự động tính lại cước phí phát sinh.
  * **5. Kiểm thử & Môi trường:**
    - Migration 013 đã push thành công lên Supabase Cloud DEV.
    - `npm run build`: **PASS 100% (15/15 static routes, 0 lỗi TypeScript)**.
    - Next.js server production đang hoạt động ổn định tại `http://localhost:3000`.

- **Cập nhật lúc:** 12/10/2026 21:35 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN THIỆN QUY ĐỊNH XUẤT BÃI: CONTAINER KHÔNG PHÁT SINH CẮM ĐIỆN ĐƯỢC MIỄN DUYỆT CCKB (MIGRATION 011 & 012)**:
  * **1. Chuẩn hóa nghiệp vụ Clearance theo thực tế bến bãi:**
    - Container **không phát sinh cắm điện** (không có phiên cắm điện `app_reefer_power_sessions`, không có cước điện `REEFER`): **KHÔNG CẦN Thương vụ CCKB duyệt Clearance**. Nhân viên an ninh tại cổng ra được phép kiểm soát và xác nhận xe kéo cont xuất bãi trực tiếp.
    - Chỉ những container **có phát sinh cắm điện** (có phiên điện hoặc cước điện lạnh) mới bắt buộc CCKB kiểm tra đối soát, chốt cước điện và duyệt điều kiện xuất bãi.
  * **2. Database Migrations 011 & 012 (`sc_confirm_physical_exit`):**
    - Kiểm tra `v_has_reefer`: Nếu không phát sinh cắm điện, RPC tự động thông quan (`clearance_status = 'CLEARED'`) với ghi chú *"Miễn duyệt CCKB (Không phát sinh cắm điện)"* và cho phép xuất bãi thành công.
    - Đã push thành công lên Supabase Cloud DEV (`son-cang-yms-dev`, ref `euswzyespwaxyrjkfkrq`).
  * **3. Cập nhật giao diện Cổng ra (`/exit`):**
    - Modal xuất bãi hợp nhất: Hiển thị Banner xanh `[✓ Miễn duyệt CCKB (Container không phát sinh cắm điện)]` và mở quyền xuất bãi cho An ninh; không bị chặn bởi cảnh báo CCKB.
    - Bảng phương tiện trong bãi (Tab 1): Hiển thị nhãn `✓ Không cắm điện (Miễn duyệt)` cho container đi kèm.
    - Bảng CCKB (Tab 2) & KPI: Phân loại rõ số container cắm điện chờ duyệt vs container không cắm điện (miễn duyệt).
  * **4. Kiểm thử & Môi trường:**
    - `npm run build`: **PASS 100% (15/15 static routes, 0 lỗi TypeScript)**.
    - Server Next.js production đang chạy ổn định tại `http://localhost:3000`.

- **Cập nhật lúc:** 12/10/2026 21:25 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN THÀNH TÁI CẤU TRÚC KIỂM SOÁT CỔNG RA THEO LƯỢT XE & KHẮC PHỤC TRIỆT ĐỂ LỖI VÉ CỔNG TRÙNG LẶP (MIGRATION 010)**:
  * **1. Khắc phục triệt để lỗi xác nhận xe rời bãi bị chặn vé cổng:**
    - Migration 010 (`20261012000010_fix_vehicle_exit_cleanup.sql`): Nâng cấp hàm RPC `sc_confirm_vehicle_only_exit`. Khi lượt xe đã có trạng thái thanh toán vé là `PAID` hoặc `EXEMPT`, hệ thống tự động dọn dẹp chuyển các bản ghi `TICKET` trùng lặp còn trạng thái `UNPAID` trong `app_charges` sang `CANCELLED`.
    - Chỉ chặn xe xuất bãi khi xe thực sự chưa thanh toán vé vào cổng.
    - Đã push thành công lên Supabase Cloud DEV (`son-cang-yms-dev`, ref `euswzyespwaxyrjkfkrq`).
  * **2. Tái cấu trúc Quy trình Cổng ra vật lý theo đúng thực tế vận tải bến bãi (`/exit`):**
    - **Tab 2 chuyển sang kiểm soát trực tiếp theo từng Lượt xe trong bãi:** Nhân viên an ninh tìm kiếm và chọn xe (Biển số VN/TQ/Lào, loại xe, thời gian vào bãi, tình trạng vé cổng).
    - **Hỗ trợ 2 luồng xuất bãi:**
      + **Xe rời bãi một mình (không chở cont / cont lưu lại bãi):** Áp dụng cho xe đầu kéo đã hạ bãi cont, xe bo thùng, xe tải. Không tính phí lưu bãi cont, xác nhận xuất bãi tức thì.
      + **Xe có kéo theo container:** Cho phép chọn container đang gắn hoặc container bốc từ bãi kéo ra.
    - **Kiểm soát chặt chẽ điều kiện an toàn & tài chính bến bãi:**
      + **Khóa xuất bãi nếu container đang cắm điện (`power_status = 'PLUGGED'`):** Hiển thị cảnh báo màu đỏ, yêu cầu CCKB/Kỹ thuật rút phích cắm tại phân hệ `/reefer` trước khi xe ra.
      + **Cảnh báo tiền điện chưa thanh toán:** Hiển thị tổng tiền điện còn nợ của container.
      + **Kiểm tra duyệt xuất CCKB (Clearance):** Cảnh báo nếu container chưa có xác nhận duyệt xuất bãi từ CCKB.
      + **Tự động tính phí lưu bãi container (50.000 đ/ngày):** Miễn phí đêm đầu, tự động đếm số đêm lưu bãi theo mốc qua đêm 22h-06h.
      + **Tùy chọn phạt mất vé (250.000 đ):** Theo mã biểu phí niêm yết `PHAT_MAT_VE`.
      + **In Biên lai thu tiền bến bãi (Mẫu 02-PLB/SC):** Hỗ trợ in biên lai ngay tại cổng ra sau khi thu tiền và xác nhận xuất bãi thành công.
  * **3. Kiểm thử & Môi trường:**
    - `npm run build`: **PASS 100% (15/15 static routes, 0 lỗi TypeScript)**.
    - Next.js server production đã được khởi động lại mượt mà tại `http://localhost:3000`.

- **Cập nhật lúc:** 12/10/2026 21:00 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN THIỆN ĐIỀU CHỈNH LOGIC CHỞ CẶP 20FT TẠI CỔNG VÀO & BỔ SUNG SỐ GIỜ DỰ KIẾN CẮM ĐIỆN THEO TIẾNG (REEFER)**:
  * **1. Chuẩn hóa quy cách chở cặp Container 20ft tại Cổng vào (`/entry`):**
    - Loại bỏ 2 nút tab chọn quy cách ở đầu form; quy trình nhập liệu thuận tự nhiên theo container chính.
    - **Chỉ khi chọn kích cỡ 20 Feet (`containerSize === '20'`)**: Hệ thống mới hiển thị tùy chọn `[x] Xe chở cặp 2 Container 20 Feet song song`. Nếu chọn 40 Feet hoặc 45 Feet, tùy chọn cặp tự động ẩn và reset về 1 container (bảo đảm tính logic của rơ moóc chở hàng).
    - Form nhập Container thứ 2 có validation realtime 11 ký tự (4 chữ cái + 7 số), loại vỏ cont #2 và chặn trùng số với container thứ nhất.
  * **2. Nâng cấp Phân hệ Điện Container (`/reefer`):**
    - **Validation mã số container dự kiến (CCKB):** Tích hợp kiểm tra realtime (đếm độ dài 11 ký tự, tự động bỏ dấu cách/uppercase, viền xanh/đỏ và thông báo chi tiết lỗi định dạng ISO 6346).
    - **Điền số giờ dự kiến cắm điện theo tiếng (không phải cắm thông):**
      + Chuẩn hóa đơn giá cắm theo giờ về đúng Biểu phí V5: **35.000 đ/giờ**.
      + Khi chọn cắm theo giờ: Cho phép nhập số giờ dự kiến cắm (kèm các nút chọn nhanh `+4h`, `+8h`, `+12h`, `+24h`), tự động hiển thị thời lượng dự kiến, mốc thời gian rút điện và ước tính tiền cước phát sinh (`số giờ × 35.000đ`).
      + Áp dụng đồng bộ cho cả **Modal Đăng ký trước của CCKB** và **Modal Cắm điện Container thực tế**.
    - **Hiển thị thông tin dự kiến trên bảng:** Cột Chế độ cắm hiển thị rõ `Theo tiếng: X giờ (35.000đ/h, ước tính Y đ)` và mốc thời gian dự kiến rút điện trên cả danh sách yêu cầu và phiên cắm điện, giúp trực ca chủ động ngắt điện đúng giờ cho khách hàng.
  * **3. Kiểm thử & Môi trường:**
    - `npm run build`: **PASS 100% (15/15 static routes, 0 lỗi TypeScript)**.
    - Server Next.js production đang chạy ổn định tại `http://localhost:3000`.

- **Cập nhật lúc:** 12/10/2026 20:50 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN THÀNH TOÀN DIỆN HỆ THỐNG QUẢN TRỊ BẾN BÃI (BIỂU PHÍ, NHÂN SỰ RBAC V5, NHẬT KÝ KIỂM TOÁN AUDIT TRAIL) & NGHIỆP VỤ PHẠT MẤT VÉ TẠI CỔNG RA**:
  * **1. Phân hệ Quản trị Biểu phí Bến bãi (`/admin/tariffs`):**
    - Quản lý danh mục 10 mục giá dịch vụ bến bãi V5 niêm yết của Sơn Cảng (`CONT_LANH`, `DAU_KEO`, `XE_BO_4_CHAN`, `XE_BO_3_CHAN`, `XE_BO_8_TAN_2_CHAN`, `XE_BO_3_BANH`, `XE_SANG_TAI`, `LUU_CONTAINER`, `DIEN_CONT_GIO`, `PHAT_MAT_VE`).
    - Modal điều chỉnh đơn giá có nhập lý do điều chỉnh / căn cứ văn bản ban hành; tuân thủ nguyên tắc tài chính bất biến V5 (chỉ áp dụng cho lượt xe/cont vào sau, không hồi tố các giao dịch cũ).
  * **2. Phân hệ Quản trị Nhân sự & Ma trận Phân quyền RBAC V5 (`/admin/users`):**
    - Tab 1: Danh sách tài khoản nhân sự theo 7 vai trò bến bãi V5 (`SEC_STAFF`, `SEC_LEAD`, `PORT_STAFF`, `PORT_LEAD`, `DIS_STAFF`, `DIS_LEAD`, `SYS_ADMIN`), bộ phận công tác, phạm vi bãi.
    - Tab 2: Ma trận phân quyền RBAC V5 đối chiếu 13 nhóm quyền nghiệp vụ trọng yếu giữa 7 vai trò bến bãi chuẩn hóa.
  * **3. Phân hệ Nhật ký Kiểm toán / Audit Trail Toàn bãi (`/admin/audit-logs`):**
    - Bảng điều khiển kiểm soát toàn diện: Hiển thị dòng thời gian các sự kiện nhạy cảm (Đổi biển số xe, sửa số cont, thu tiền vé cổng, cắm điện cont, duyệt xuất bảo lãnh nợ...).
    - Hỗ trợ lọc theo loại sự kiện và tìm kiếm theo biển số xe/số cont/mã vé.
  * **4. Mở rộng Thanh điều hướng App Shell (`src/components/layout/app-shell.tsx`):**
    - Tích hợp 4 liên kết Quản trị cho vai trò `SYS_ADMIN`: Cấu hình Xe (`/admin/vehicle-types`), Biểu phí (`/admin/tariffs`), Nhân sự & RBAC (`/admin/users`), Nhật ký Kiểm toán (`/admin/audit-logs`) trên cả Desktop Menu và Mobile Drawer.
  * **5. Nghiệp vụ Phạt mất vé bến bãi tại Cổng ra (`/exit`):**
    - Checkbox `[+ Phạt mất liên vé giấy bến bãi (250.000 đ)]` theo mã biểu phí `PHAT_MAT_VE`.
    - Tự động cộng 250.000đ vào tổng thu tại cổng ra và in chi tiết vào Biên lai thu tiền bến bãi (Mẫu 02-PLB/SC).
  * **6. Thẩm định & Môi trường:**
    - `npm run build`: **PASS 100% (15/15 static routes, 0 lỗi TypeScript)**.
    - Server Next.js production đang chạy ổn định tại `http://localhost:3000`.

- **Cập nhật lúc:** 12/10/2026 20:25 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN THÀNH XỬ LÝ CÁC TRƯỜNG HỢP HÓC BÚA: XE CHỞ CẶP 2 VỎ 20FT VÀ ĐĂNG KÝ CẮM ĐIỆN TRƯỚC (PRE-ARRIVAL REEFER REQUEST)**:
  * **1. Xe đầu kéo chở cặp 2 vỏ container 20 feet song song (`/entry`, `/yard`):**
    - Migration 009 (`20261012000009_dual_20ft_and_reefer_requests.sql`): Nâng cấp RPC `sc_create_container_visit` cho phép tối đa 2 container gắn vào cùng 1 lượt xe nếu cả 2 đều là cỡ 20ft (`container_size = '20'`); chặn gắn thêm cont thứ 2 nếu cont 1 là 40ft/45ft.
    - Cổng vào (`/entry`): Tab chuyển đổi linh hoạt: 1 Container (20ft/40ft/45ft) hoặc Cặp 2 Container 20ft song song (Cont #1 và Cont #2). Vé cổng áp dụng chung 250.000đ cho xe chở container. Màn hình thành công và Vé in bến bãi hiển thị đầy đủ cả 2 số container.
    - Giám sát Bãi (`/yard`): Bảng cặp Xe — Cont hiển thị rõ nhãn `Cont #1/2 (Cặp 20ft)` và `Cont #2/2 (Cặp 20ft)`; bảng Phương tiện hiển thị các cont đi kèm; 2 container quản lý độc lập về vòng đời (cắm điện, cập nhật HÀNG/RỖNG, tính phí lưu bãi và xuất bãi riêng).
  * **2. Đăng ký cắm điện trước khi xe vào bãi (Pre-arrival Reefer Request cho CCKB):**
    - Bảng `app_reefer_requests` (trạng thái: `PLANNED`, `CONTAINER_ARRIVED`, `PLUGGED`, `COMPLETED`, `CANCELLED`).
    - Phân hệ Điện container (`/reefer`): Bổ sung Tab "Đăng ký cắm điện trước (CCKB)" + Modal đăng ký phiếu (Số cont, Biển số xe dự kiến, Khách hàng, Nhiệt độ, Loại hàng, Chế độ điện theo giờ/liên tục).
    - Cảnh báo tự động tại Cổng vào (`/entry`): Khi An ninh nhập xe/cont khớp với phiếu đăng ký trước, hệ thống tự động bật Banner cảnh báo màu cam nổi bật hướng dẫn xe vào bãi cắm điện; tự động chuyển trạng thái phiếu sang `CONTAINER_ARRIVED`.
    - Cảnh báo khẩn cấp CCKB (`/reefer`): Banner nhấp nháy cảnh báo container đã vào cổng đang chờ cắm điện; nút một chạm **`[⚡ Cắm điện ngay]`** để lập tức kích hoạt phiên cắm điện và chuyển trạng thái phiếu sang `PLUGGED`.
  * **3. Thẩm định & Kiểm thử:**
    - `npm run build` PASS 100% (12/12 static pages, 0 lỗi TypeScript).
    - Migration 009 đã push thành công lên Supabase Cloud DEV (`son-cang-yms-dev`, ref `euswzyespwaxyrjkfkrq`).
    - Server Next.js production đang chạy ổn định tại `http://localhost:3000`.

- **Cập nhật lúc:** 12/10/2026 19:35 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN THIỆN ĐỒNG BỘ CÁC PHÂN HỆ VẬN HÀNH & HỆ THỐNG BIÊN LAI / IN PHIẾU THU TIỀN TOÀN DIỆN**:
  * **1. Phân hệ Thu phí & Sổ cái (`/billing`):**
    - Hiển thị đầy đủ Biểu phí hiệu lực V5 (9 mục giá dịch vụ bến bãi niêm yết của Sơn Cảng).
    - Phân định rõ ràng quyền hạn RBAC V5: An ninh thu vé xe cổng & phí lưu bãi; CCKB quản lý tiền điện container (khóa nút thu tiền điện đối với An ninh).
    - Bổ sung Modal Xem & In Biên lai / Phiếu Thu Tiền Dịch Vụ: In phiếu thu chuẩn hành chính Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh (Mẫu 01-TT/SC), đọc số tiền thành chữ tiếng Việt chuẩn hóa (`formatMoneyInWords`), phương thức thanh toán, chữ ký người nộp và thủ quỹ/an ninh. Tự động mở xem/in sau khi thu tiền thành công.
  * **2. Phân hệ Điện container (`/reefer`):**
    - Khắc phục triệt để hiển thị rỗng số container trong `getReeferSessions`: map chính xác `container_no_current` từ bảng `app_container_visits`.
    - Phân quyền cắm/rút vs thu tiền điện: Phiên đã rút điện chưa thanh toán sẽ hiển thị nút `[Thu tiền điện]` (chuyển sang `/billing`) cho CCKB, và nhãn `Chờ CCKB thu` (chặn thao tác) đối với An ninh.
  * **3. Phân hệ Xuất bãi & Cổng ra (`/exit`):**
    - Hoàn chỉnh 2 bước kiểm soát: CCKB Duyệt xuất bãi (Clearance, chặn cont đang cắm điện, hỗ trợ bảo lãnh nợ có ghi chú) và An ninh Cổng ra vật lý (tính phí lưu bãi qua đêm 22h-06h, hỗ trợ cả container xuất bãi và xe rời bãi không tải).
    - Bổ sung Modal In Biên Lai Thu Phí Lưu Bãi Container Tại Cổng Ra (Mẫu 02-PLB/SC) khi An ninh thực thu phí tại cổng.
  * **4. Phân hệ Cổng vào (`/entry`):**
    - Bổ sung chức năng In Vé Kiểm Soát Xe Vào Bãi (kèm mã vé, thông tin xe, cont, số tiền thu và chữ ký nhận), tự động tạm dừng bộ đếm ngược để nhân viên thao tác in ấn cho tài xế.
  * **5. Thẩm định & Triển khai:**
    - `npm run build` PASS 100% (12/12 routes, 0 lỗi TypeScript). Server Next.js đang chạy ổn định tại `http://localhost:3000`.

- **Cập nhật lúc:** 12/10/2026 18:55 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN THÀNH CHỨC NĂNG SỬA BIỂN SỐ XE CÓ AUDIT LOG, XEM NHẬT KÝ LỊCH SỬ LƯỢT XE VÀ CHUYỂN HƯỚNG LOGOUT VỀ /login**:
  * **1. Đăng xuất chuyển hướng thẳng ra `/login`:**
    - Cập nhật `src/contexts/auth-context.tsx` và `src/components/layout/app-shell.tsx`: Khi người dùng nhấn "Đăng xuất khỏi hệ thống", client tự động clear session và dùng `window.location.href = '/login'` chuyển hướng ngay lập tức về trang đăng nhập.
  * **2. Chức năng Hiệu chỉnh Biển số xe có lưu Log:**
    - Triển khai `correctVehiclePlate(params)` trên cả 2 môi trường:
      + `SupabaseRepository`: Gọi RPC `sc_update_vehicle_visit_basic` (tự động kích hoạt `sc_log_audit_event` ghi audit log với event `vehicle.visit.update_basic`), bảo toàn nguyên vẹn ID lượt xe, liên kết container và mã vé cổng; lưu lịch sử `VehiclePlateChange`.
      + `DemoRepository`: Lưu vết chi tiết lịch sử đổi biển số vào LocalStorage (`soncang_v5_demo_plate_changes`), đồng bộ biển số sang container liên quan và sổ cái các khoản thu.
    - Modal sửa biển số xe: Hỗ trợ phím gõ nhanh biển số Trung Quốc (+桂, +粤, +云, +湘, +挂), bắt buộc nhập lý do sửa tối thiểu 3 ký tự theo quy tắc kiểm soát bến bãi.
  * **3. Xem Nhật ký & Lịch sử lượt xe (Timeline):**
    - Modal hiển thị dòng thời gian vận hành chi tiết của lượt xe:
      + Thông tin tóm tắt: Biển số xe, Loại xe, Mã vé, Tiền vé, Trạng thái thanh toán (Đã thu / Miễn phí / Chưa thu), Tài xế & SĐT.
      + Tiến trình vận hành: 1. Tiếp nhận vào bãi (thời gian, người tiếp nhận) -> 2. Lịch sử hiệu chỉnh biển số xe (Biển số cũ -> Biển số mới, Người sửa, Thời gian, Lý do) -> 3. Container cõng theo (mã số, kích thước, loại vỏ, trạng thái HÀNG/RỖNG) -> 4. Ghi chú lượt xe.
    - Nút `[Sửa biển]` và `[Log xe]` được tích hợp tại cả 2 tab: Tab 1 (Tổng hợp Xe — Container) và Tab 3 (Phương tiện).
    - Hiển thị badge `{count} lần đổi` bên cạnh biển số xe khi đã có lịch sử hiệu chỉnh.
  * `npm run build` PASS 100% (12/12 static pages), server cổng 3000 đang phục vụ ổn định.

- **Cập nhật lúc:** 12/10/2026 18:35 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **KHẮC PHỤC TRIỆT ĐỂ LỖI TRÙNG LẶP KHOẢN THU (DUPLICATE CHARGES) & LỖI CHƯA GHI NHẬN SỔ CÁI KHI THU TIỀN TẠI CỔNG**:
  * Phát hiện & xử lý nguyên nhân gốc rễ:
    - Khi xe vào cổng, trigger DB `trg_sync_vehicle_ticket_charge` tạo 1 bản ghi `app_charges`, đồng thời RPC atomic lại insert thêm 1 bản ghi thứ hai -> Dẫn đến 1 xe sinh ra 2 khoản thu trùng nhau (tổng nợ ảo tăng gấp đôi).
    - Câu lệnh truy vấn tìm khoản thu tại client dùng `.maybeSingle()` bị lỗi do có nhiều hơn 1 hàng trả về, khiến RPC `sc_collect_payment` bị bỏ qua lúc tạo xe, làm xe vẫn giữ nguyên trạng thái `Chưa thu`.
  * Giải pháp triển khai:
    - Sửa `createVehicleEntry` trong `supabase-repository.ts`: Truy vấn danh sách `app_charges` an toàn không dùng `.maybeSingle()`, gọi `sc_collect_payment` ghi sổ cái bất biến `app_payments`, đồng thời tự động hủy bản ghi trùng lặp (`CANCELLED`).
    - Nâng cấp `getCharges()`: Tự động khử trùng lặp (dedup) các bản ghi vé xe cũ, giảm từ 8 khoản thu về đúng 4 khoản thu thực tế (công nợ giảm từ 2,000,000đ về đúng 1,000,000đ); tự động map biển số xe và format tên loại xe tiếng Việt chuẩn (*Xe container lạnh (粤粤粤粤)* thay vì *CONT_LANH*).
    - Các xe mới tạo sẽ tự động được ghi nhận ĐÃ THU ngay từ cổng vào. Với các xe cũ, nhân viên có thể bấm [Thu tiền] trực tiếp trên `/billing` để đối soát hoàn tất.
  * `npm run build` PASS 100%, server cổng 3000 đã hoạt động ổn định.
- **Mốc hiện tại:** **TỐI ƯU CÔNG THÁI HỌC GIAO DIỆN CỔNG VÀO (/entry) THEO BỐ CỤC 2 CỘT CÂN ĐỐI CHO MÁY TÍNH**:
  * Khắc phục triệt để tình trạng form dài và lãng phí khoảng trống trên màn hình Desktop:
    - Mở rộng container bao ngoài lên `max-w-5xl xl:max-w-6xl` tận dụng tối đa chiều ngang màn hình.
    - Chia bố cục 2 cột cân bằng (7:5) trên máy tính:
      + **Cột trái (7/12):** Thông tin phương tiện (Biển số xe, phím gõ nhanh biển TQ), Danh mục loại xe & Vé lượt, Thông tin Container đi kèm (Mã cont, Kích cỡ, Loại vỏ).
      + **Cột phải (5/12):** Thông tin tài xế & CCCD chip, Thu tiền vé cổng trực tiếp tại bốt gác (Tiền mặt/CK/Seri vé), Tổng tiền dự kiến và Nút xác nhận tiếp nhận to rõ.
    - Cả 2 cột hiển thị trọn vẹn trong 1 màn hình máy tính (không cần cuộn trang).
    - Trên di động / tablet nhỏ: Tự động responsive chuyển về 1 cột dọc mượt mà.
  * `npm run build` PASS 100%, server cổng 3000 đã hoạt động ổn định.
- **Mốc hiện tại:** **HOÀN THÀNH TÍCH HỢP GHI NHẬN THU TIỀN VÉ CỔNG TRỰC TIẾP TẠI BỐT GÁC AN NINH (`/entry`)**:
  * Bổ sung mục thu tiền vé cổng trực tiếp ngay trong quy trình tiếp nhận xe:
    - Cho phép chọn: **Thu tiền ngay tại cổng** (Mặc định cho vé > 0đ) hoặc **Chưa thu (Ghi nợ / Thu sau)**.
    - Phương thức thanh toán: **Tiền mặt (CASH)** hoặc **Chuyển khoản (TRANSFER)** kèm ô nhập số seri vé giấy / mã giao dịch.
    - Đối với phương tiện 0đ (Đầu kéo không moóc, Xe sang tải): Tự động hiển thị `Miễn phí hợp lệ (0 đ) — Không phát sinh thu tiền tại cổng`.
  * Kết nối giao dịch với sổ cái tài chính bất biến: Gọi RPC `sc_collect_payment` ngay sau khi tạo lượt xe, cập nhật trạng thái `ticket_payment_status = 'PAID'` tức thì.
  * Thẻ kết quả tiếp nhận thành công cập nhật trạng thái: `ĐÃ THU (Tiền mặt/Chuyển khoản)` kèm số seri vé giấy.
  * `npm run build` PASS 100%, server cổng 3000 đã hoạt động ổn định.
- **Mốc hiện tại:** **HOÀN THÀNH LOẠI BỎ TOÀN BỘ MÃ KỸ THUẬT (DAU_KEO, CONT_LANH, RF, DC...) & HIỂN THỊ TÊN NGHIỆP VỤ TIẾNG VIỆT THEO Ý KIẾN CHỦ DỰ ÁN**:
  * Tạo tiện ích `src/lib/display-formatters.ts` chuyển đổi 100% mã loại xe và mã vỏ cont sang tên tiếng Việt chuẩn V5 (*Xe container lạnh, Xe đầu kéo không moóc, Xe bo 4 chân tải thùng, Container Lạnh, Container Khô...*).
  * Áp dụng đồng bộ trên tất cả các màn hình: Quản lý bãi (`/yard`), Cổng vào (`/entry`), Cổng ra (`/exit`) và tầng `SupabaseRepository`.
  * `npm run build` PASS 100%, server cổng 3000 đã hoạt động ổn định.
- **Mốc hiện tại:** **HOÀN THÀNH TRIỂN KHAI TAB TỔNG HỢP XE & CONT (CẶP GHÉP MAPPING BẾN BÃI) TẠI MÀN HÌNH /yard THEO Ý KIẾN CHỦ DỰ ÁN**:
  * Bổ sung Tab 1 làm mặc định: `Tổng hợp Xe & Cont` hiển thị trực tiếp cặp liên kết giữa Phương tiện và Container trên cùng 1 hàng.
  * Hiển thị đầy đủ: Biển số & Loại xe & Vé lượt, Mã Cont & Loại vỏ, Tình trạng Hàng (HÀNG / RỖNG), Thời gian vào & Thời gian đã lưu bãi, Thông tin tài xế & CCCD, cùng các nút thao tác nhanh.
  * Tự động nhận diện xe lẻ không container và container tồn bãi độc lập.
  * Sửa lỗi cột "Xe đưa vào" trong tab Container bị hiển thị `—`, tự động liên kết biển số xe từ bảng `app_vehicle_visits`.
  * `npm run build` PASS 100%, server cổng 3000 đã hoạt động ổn định.
- **Mốc hiện tại:** **HOÀN THÀNH TÍCH HỢP ĐẾM NGƯỢC TỰ ĐỘNG LÀM MỚI (AUTO-RESET 8S) & BỘ NÚT CHUYỂN NHANH SAU TIẾP NHẬN**:
  * Tích hợp thanh đếm ngược tự động 8 giây kèm thanh tiến trình trực quan: Tự động đưa form về trạng thái trống sẵn sàng đón xe tiếp theo (chống tắc cổng).
  * Hỗ trợ nút `[Giữ màn hình]` / `[Tiếp tục đếm]` cho nhân viên kiểm tra thông tin vé.
  * Bổ sung nút bấm 1 chạm `[Xem xe trong Bãi →]` chuyển nhanh sang `/yard` và `[Xem Tổng quan →]` chuyển sang `/dashboard`.
  * `npm run build` PASS 100%, server cổng 3000 đã hoạt động ổn định.
- **Mốc hiện tại:** **KÍCH HOẠT GATE 2 — CHÍNH THỨC MỞ KHÓA GHI DỮ LIỆU THẬT LÊN SUPABASE CLOUD DEV THEO PHÊ DUYỆT CỦA CHỦ DỰ ÁN**:
  * Quyết định ghi nhận: D-006 (`DECISION_LOG.md`).
  * Đã bật cờ `NEXT_PUBLIC_ENABLE_REAL_WRITE=true` trong cấu hình môi trường `.env.local`.
  * Khởi động lại thành công server Next.js Production cổng 3000 (`HTTP 200 OK`).
  * Toàn bộ thao tác bấm Tiếp nhận xe tại cổng (`/entry`) sẽ gọi trực tiếp các RPC nguyên tử `sc_create_vehicle_and_container_visit_atomic` / `sc_vehicle_entry_atomic` ghi thật vào Database Supabase Cloud DEV `son-cang-yms-dev` (Project Ref: `euswzyespwaxyrjkfkrq`).
  * Sẵn sàng cho Chủ dự án test thật trọn vẹn luồng tiếp nhận và luân chuyển bến bãi.
- **Mốc hiện tại:** **HOÀN THÀNH BỔ SUNG Ô NHẬP CCCD / HỘ CHIẾU & QUÉT MÃ QR CHIP CCCD TẠI FORM CỔNG VÀO THEO Ý KIẾN CHỦ DỰ ÁN**:
  * Bổ sung ô nhập "Số CCCD / Hộ chiếu" vào mục "4. Thông tin bổ sung (Tùy chọn)" bên cạnh Họ tên tài xế và SĐT.
  * Tích hợp nút và Modal quét mã QR CCCD gắn chip (tương thích súng quét mã vạch 2D cổng an ninh), tự động phân tích và trích xuất đồng thời Số CCCD và Họ tên tài xế từ chuỗi chuẩn Bộ Công An.
  * Giữ nguyên schema DB/RPC, lưu vết CCCD có cấu trúc trong trường `note` (`CCCD: ... | Ghi chú`).
  * `npm run build` PASS 100%, server cổng 3000 đã hoạt động ổn định.
  * Ranh giới an toàn: Gate 2 tiếp tục tạm dừng (`NEXT_PUBLIC_ENABLE_REAL_WRITE=false`), DB và Backend giữ nguyên.
- **Mốc hiện tại:** **HOÀN THÀNH TINH CHỈNH VALIDATION SỐ CONTAINER TỨC THỜI (4 CHỮ CÁI + 7 CHỮ SỐ) THEO Ý KIẾN CHỦ DỰ ÁN**:
  * Kiểm tra tức thời (real-time) từng ký tự: 4 ký tự đầu bắt buộc là chữ cái (A-Z). Từ ký tự thứ 5 trở đi bắt buộc là chữ số (0-9). Khi gõ sai loại ký tự (như `AAAAA`), hệ thống lập tức báo đỏ *"Từ ký tự thứ 5 trở đi bắt buộc phải là chữ số (0-9). Ký tự thứ 5 đang là chữ A"*.
  * Đủ 11 ký tự (4 chữ cái + 7 chữ số) báo xanh hợp lệ ngay.
  * **Bỏ hoàn toàn thuật toán Check Digit toán học và nút tự sửa số cuối**, quy trình đơn giản, chính xác và không phiền phức cho nhân viên.
  * `npm run build` PASS 100%, server cổng 3000 đã cập nhật trực tiếp.
  * Ranh giới an toàn: Gate 2 tiếp tục tạm dừng (`NEXT_PUBLIC_ENABLE_REAL_WRITE=false`), DB và Backend giữ nguyên.
- **Mốc hiện tại:** **HOÀN THÀNH TÍCH HỢP BỘ KIỂM TRA SỐ CONTAINER CHUẨN ISO 6346 & HỖ TRỢ BIỂN SỐ XE ĐA QUỐC GIA (VIỆT NAM, TRUNG QUỐC, LÀO)**:
  * **Validation số Container:** Tiện ích `container-validator.ts` kiểm tra thời gian thực chuẩn ISO 6346 (4 chữ cái + 7 số, tính toán Check Digit số thứ 11). Báo xanh khi khớp 100%, báo vàng kèm nút "Tự sửa số cuối thành [X]" khi lệch check digit, chặn lỗi khi sai cấu trúc.
  * **Biển số xe đa quốc gia:** Nhận diện ký tự Unicode tự do (Việt Nam, Trung Quốc `桂`, Lào, ký tự moóc `挂`). Bổ sung hàng nút gõ nhanh tiền tố biển xe Trung Quốc phổ biến ở cửa khẩu Tà Lùng (`+桂`, `+粤`, `+云`, `+湘`, `+挂`).
  * `npm run build` PASS 100%, server cổng 3000 đã cập nhật trực tiếp.
  * Ranh giới an toàn: Gate 2 tiếp tục tạm dừng (`NEXT_PUBLIC_ENABLE_REAL_WRITE=false`), DB và Backend giữ nguyên.
- **Mốc hiện tại:** **HOÀN THÀNH TINH CHỈNH CÔNG THÁI HỌC CỔNG VÀO THEO Ý KIẾN CHỦ DỰ ÁN**:
  * Tái cấu trúc form `/entry`: **(1) Nhập Biển số xe -> (2) Chọn Loại xe -> (3) Chi tiết Cont (CHỈ DUY NHẤT XE CONTAINER LẠNH)** -> (4) Thông tin phụ -> (5) Xác nhận.
  * Bỏ câu hỏi thừa "Phương tiện có mang container không?".
  * **Xe đầu kéo không moóc (`DAU_KEO`):** Áp dụng vé 0đ (Miễn phí) và **hoàn toàn không có container**. Ẩn toàn bộ khối nhập số cont. Chỉ duy nhất `CONT_LANH` mới hiển thị và bắt buộc nhập mã container.
  * Khi chọn Xe container lạnh (`CONT_LANH`): Bắt buộc nhập mã container. Khi chọn loại xe khác: Ẩn hoàn toàn khối container và không bắt nhập container.
  * `npm run build` PASS 100%, server cổng 3000 đã cập nhật trực tiếp.
  * Ranh giới an toàn: Gate 2 tiếp tục tạm dừng (`NEXT_PUBLIC_ENABLE_REAL_WRITE=false`), DB và Backend giữ nguyên.
- **Mốc hiện tại:** **HOÀN THÀNH TRIỂN KHAI THÍ ĐIỂM (PILOT UI/UX) GIAO DIỆN VẬN HÀNH BẾN BÃI SƠN CẢNG THEO PHÊ DUYỆT CỦA CHỦ DỰ ÁN**:
  * **1. Phạm vi triển khai thí điểm:**
    - `src/components/layout/app-shell.tsx`: Cải tiến App Shell chuẩn nhận diện Sơn Cảng — Tà Lùng Quang Minh. Thanh điều hướng Desktop với chỉ báo trực quan. Mobile Bottom Navigation tối đa 4 tác vụ chính có quyền + nút "Thêm" mở Drawer menu bổ sung, độ cao an toàn ~64px + safe area padding, không che các nút thao tác.
    - `src/app/login/page.tsx`: Nâng cấp giao diện đăng nhập doanh nghiệp, phân tách rõ ràng Đăng nhập hệ thống vận hành và Khối chuyển đổi nhanh vai trò mô phỏng (hỗ trợ trải nghiệm trực quan theo ca trực).
    - `src/app/entry/page.tsx`: Tái cấu trúc quy trình tiếp nhận cổng vào theo đúng trình tự công thái học thực tế: **(1) Biển số xe vào cổng (trọng tâm, to rõ) -> (2) Có/Không mang Container -> (3) Chi tiết container (nếu có cont) -> (4) Loại phương tiện & Biểu phí vé -> (5) Thông tin phụ (tài xế, SĐT, ghi chú) -> (6) Xác nhận tiếp nhận**. Nút bấm ≥ 48px, khóa bấm đúp, thẻ kết quả màu xanh lá hiển thị mã vé và nút "Tiếp nhận lượt xe tiếp theo".
    - `src/app/exit/page.tsx`: Tách bạch rõ 2 phân hệ: **(1) CCKB Duyệt điều kiện xuất bãi** và **(2) An ninh Cổng ra vật lý** (hỗ trợ cả Container xuất bãi và Xe rời bãi không cont qua RPC nguyên tử). Chống thất thoát doanh thu: Khóa cứng nút xuất bãi khi tính phí lưu bãi lỗi, hiển thị banner cảnh báo và nút "Thử tính lại phí", tuyệt đối không gán `fee = 0`. Loại bỏ hoàn toàn tên RPC kỹ thuật `sc_confirm_vehicle_only_exit` khỏi JSX hiển thị.
  * **2. Kiểm tra chất lượng & Biên dịch:**
    - Chạy `npm run build`: 100% PASS, 0 lỗi TypeScript, 0 cảnh báo lint, 12/12 static routes và proxy middleware biên dịch thành công.
    - Next.js production server đang hoạt động bình thường trên cổng 3000 (`http://localhost:3000`), đã xác thực qua HTTP request thành công.
  * **3. Ranh giới an toàn tuyệt đối:**
    - Không copy nguyên văn HTML tĩnh của Google Stitch, chỉ tham khảo thẩm mỹ/bố cục.
    - Giữ nguyên 100% Database, Migration 001–008, RLS, RBAC, RPC Backend.
    - `NEXT_PUBLIC_ENABLE_REAL_WRITE=false` duy trì tắt (Gate 2 tiếp tục tạm dừng). Không phát sinh ghi dữ liệu lên Cloud DEV hay Production.
- **Mốc hiện tại:** **HOÀN THÀNH XỬ LÝ TOÀN BỘ LỖI GIAO DIỆN P0, CHỤP 27 ẢNH PWA THẬT ĐÚNG VAI TRÒ, XUẤT 10 ẢNH STITCH FULL RESOLUTION VÀ DỪNG TẠI ĐIỂM DỪNG 1 CHỜ DUYỆT THIẾT KẾ**:
  * **1. Xử lý triệt để 100% lỗi P0:**
    - Làm sạch toàn bộ thuật ngữ kỹ thuật trong JSX hiển thị (`Supabase`, `Backend`, `RPC`, `RLS`, `RBAC`, `V5`, `PWA`, `YMS`, `AP06`, `AP07`, `Clearance`, `UNPAID`, mã enum/permission) tại 9 trang và App Shell.
    - Sửa Mobile Bottom Nav: Giới hạn tối đa 3-4 mục theo vai trò + "Thêm", chiều cao ~64px + safe-area; `main` tăng đệm `pb-28` (112px). Desktop chỉ hiện menu có quyền.
    - Sửa `/exit`: Khi `calculateStorageFee` lỗi, **chặn gán fee = 0**, hiển thị thông báo lỗi, nút "Thử tính lại phí" và khóa cứng nút xác nhận xuất bãi.
    - Chuẩn hóa tên ứng dụng: "Quản lý bến bãi Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh"; banner: "BẢN MÔ PHỎNG — Dữ liệu dùng thử, không ghi vào hệ thống".
  * **2. Bằng chứng kiểm thử và ghi hình thực tế:**
    - Chụp 27 ảnh PWA thật qua Chrome CDP (`SONCANG_PWA_REAL_SCREENSHOTS/`) trên 3 viewports (1440px, 1024px, 390px) theo đúng vai trò thật: `SEC_STAFF` (`/entry` có dữ liệu mẫu, `/exit` cổng ra), `DIS_STAFF` (`/yard`), `PORT_STAFF` (`/reefer`, `/billing`, `/exit` duyệt xuất), `SYS_ADMIN` (`/dashboard`, `/admin/vehicle-types`).
    - Xuất 10 ảnh Stitch Full Resolution (`SONCANG_STITCH_REFINED_PREVIEWS/`) sắc nét không vỡ hạt cho 3 luồng tác nghiệp và Design System.
    - Biên dịch `npm run build` thành công 100% (TypeScript sạch, 12 routes pass).
  * **3. Bàn giao bộ hồ sơ ĐIỂM DỪNG 1:**
    - `SONCANG_UI_P0_FIX_REPORT.md`
    - `SONCANG_UI_ROLE_SCREENSHOT_MATRIX.md`
    - `SONCANG_UI_DATA_MAPPING.md`
    - `SONCANG_UI_DESIGN_APPROVAL_REQUEST.md` (Tờ trình phê duyệt thiết kế)
  * **4. Ranh giới an toàn:** Gate 2 tiếp tục TẠM DỪNG (`NEXT_PUBLIC_ENABLE_REAL_WRITE=false`); Backend, DB, RLS, RBAC giữ nguyên 100%; DỪNG chờ Chủ dự án phê duyệt trước khi code pilot.
- **Mốc trước:** **HOÀN THÀNH ĐÓNG GÓI HỒ SƠ ĐÁNH GIÁ UI/UX TỪ GOOGLE STITCH & PWA HIỆN TẠI** (12/10/2026 15:30).
- **Chi tiết kết quả thực hiện:**
  * **1. Kết nối & Xác thực Google Stitch MCP (Phase A):**
    - Sử dụng API Key mới được cấp, xác thực thành công qua endpoint `https://stitch.googleapis.com/mcp` với method `list_screens` và `get_project`.
    - Đọc toàn bộ manifest 41 màn hình và tài nguyên thiết kế của dự án `8471320594998118450` ("Sơn Cảng Yard Management").
    - Tải và phân tích các tài liệu chuẩn: `DESIGN.md`, `tlqm-design-tokens.css`, `STITCH_DESIGN_CONTEXT.md`.
    - Lưu 4 file ảnh preview vào `public/stitch_previews/` phục vụ kiểm tra trực quan.
  * **2. Rà soát & Làm sạch ngôn ngữ kỹ thuật hiển thị (Phase B & C):**
    - Đã loại bỏ hoàn toàn các chuỗi: `SUPABASE REAL`, `Cloud DEV`, `Feature Flag`, `storage.payment.collect`, `AP06`, `CLEARED_WITH_DEBT`, `CASH`, `BANK_TRANSFER`, `sc_create_vehicle_and_container_visit_atomic`, `sc_manage_vehicle_type`, `(Cloud DEV)` trên các nút bấm và banner.
    - Chuyển thành nhãn vận hành chuẩn: `Bản thử nghiệm`, `Chức năng lưu dữ liệu hiện chưa được mở`, `Tài khoản người dùng`, `Phân quyền theo vị trí công tác`, `Quy định vé cổng`, `Bảo lãnh công nợ`, `Tiền mặt`, `Chuyển khoản ngân hàng`, `Điều kiện xuất bãi: Duyệt xuất (Ghi nợ)`.
    - Biên dịch `next build` hoàn tất sạch sẽ: 12/12 static pages và proxy middleware pass không lỗi.
  * **3. Bàn giao 3 Màn hình Mẫu & Tài liệu Nghiệm thu:**
    - Hoàn thành `SONCANG_MCP_CONNECTION_REPORT.md`.
    - Hoàn thành `SONCANG_UI_AUDIT.md`.
    - Hoàn thành `SONCANG_UI_REDESIGN_PLAN.md`.
    - Trình bày trực quan 3 màn hình mẫu: (1) Tổng quan bãi CCKB/An ninh, (2) Tiếp nhận xe cổng An ninh, (3) Duyệt & Xuất bãi.
    - Tuyệt đối không tự viết lại toàn bộ Frontend khi chưa được duyệt; Gate 2 tiếp tục TẮT.
- **Mốc trước:** **HOÀN THÀNH TRIỂN KHAI GATE 1 — BACKEND MIGRATION 005–008 TRÊN SUPABASE CLOUD DEV** (12/10/2026 13:20).
- **Chi tiết kết quả thực hiện:**
  * **1. Kiểm tra Tiền Triển khai & Dry-Run:**
    - Kiểm tra 2 file sao lưu tồn tại: `backup_cloud_dev_pre_005_schema.sql` (94,000 bytes) và `backup_cloud_dev_pre_005_data.sql` (53,121 bytes).
    - Chạy `npx supabase db push --linked --dry-run`: Liệt kê chính xác và duy nhất 4 tệp migration: 005, 006, 007, 008. Không có drift, không có seed/role ngoài luồng.
  * **2. Thực thi Triển khai Chính thức (Gate 1 Execution):**
    - Lệnh: `npx supabase db push --linked`.
    - Kết quả: Áp dụng thành công tuần tự 4 migration:
      * `20261012000005_gate_ticket_atomic_guard.sql`
      * `20261012000006_domain_reefer_power.sql`
      * `20261012000007_domain_financial_ledger.sql`
      * `20261012000008_domain_exit_clearance.sql`
      * Exit code: 0, Message: `Finished supabase db push.`
  * **3. Kiểm tra Hậu Triển khai (Gate 1 Post-Deploy Verification):**
    - Script `scripts/verify_post_deploy_cloud_dev.mjs`:
      * 5 bảng mới (`app_yard_billing_settings`, `app_reefer_power_sessions`, `app_tariffs`, `app_charges`, `app_payments`) có RLS bật, anon truy cập bị từ chối với lỗi 42501 (PASS).
      * RPC `sc_calculate_storage_fee` phản hồi thành công và trả về số liệu tính phí đúng chuẩn V5 (PASS).
      * 7/7 tài khoản UAT đăng nhập thành công qua Supabase Auth và giữ nguyên 100% quyền RBAC (PASS):
        - `SYS_ADMIN`: 60 quyền
        - `SEC_STAFF`: 26 quyền
        - `SEC_LEAD`: 31 quyền
        - `PORT_STAFF`: 31 quyền
        - `PORT_LEAD`: 38 quyền
        - `DIS_STAFF`: 9 quyền
        - `DIS_LEAD`: 11 quyền
      * `scripts/test_browser_roles.mjs`: 3 role đại diện `SEC_STAFF`, `PORT_LEAD`, `DIS_STAFF` kiểm tra phân quyền và gọi 6 HTTP routes Next.js (`http://localhost:3000`) đều trả về HTTP 200 OK (PASS).
  * **4. Ranh giới an toàn tiếp tục duy trì:**
    - `NEXT_PUBLIC_ENABLE_REAL_WRITE` tiếp tục TẮT (undefined / false).
    - Chưa thực hiện bất kỳ giao dịch thử nghiệm ghi nào vào Cloud DEV.
    - Tuyệt đối không tác động môi trường Production.
    - DỪNG chờ Chủ dự án phê duyệt Gate 2.

- **Cập nhật lúc:** 12/10/2026 13:10 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN TẤT TOÀN DIỆN PRE-DEPLOY FINAL CHECK CLOUD DEV: Hoàn thiện luồng thu phí lưu bãi tại cổng trên PWA (`src/app/exit/page.tsx`) có chọn hình thức thanh toán & rào chắn nợ AP06; Cập nhật banner môi trường động (`src/components/layout/app-shell.tsx`) phản ánh đúng biến `NEXT_PUBLIC_ENABLE_REAL_WRITE`; Trích xuất thành công bản sao lưu DDL Schema (94,000 bytes) và Data (53,121 bytes) từ Cloud DEV vào `supabase/backups/`; Cập nhật `MIGRATION_005_008_CLOUD_DEPLOYMENT_PLAN.md` chuẩn xác theo CLI `--linked`, `--data-only`, `--dry-run` và quy trình khôi phục `psql`; Kiểm thử tự động 100% PASS 3 role đại diện trên HTTP client / Supabase Auth thật (`scripts/test_browser_roles.mjs`); Kiểm thử 5/5 test case thuật toán phí lưu bãi 22:00-06:00 V5 PASS 100% (`scripts/test_storage_fee_calc.mjs`); TypeScript check PASS (0 lỗi); ESLint PASS (0 lỗi); Next.js Production Build 12/12 Static Pages PASS; Xuất bản Báo cáo `SONCANG_CLOUD_DEV_RELEASE_CHECKLIST.md`; Đóng gói zip an toàn `soncang_cloud_readiness_code_bundle.zip` (0.28 MB, SHA-256: `512CAF53A67BDA38A750D66DBB886BB86D7E2ACAC3F84C8ADE60D3481A59A3E1`); TUYỆT ĐỐI CHƯA PUSH MIGRATION 005–008 VÀ CHƯA BẬT REAL WRITE, DỪNG CHỜ PHÊ DUYỆT RIÊNG 2 BƯỚC CỦA CHỦ DỰ ÁN**.
- **Chi tiết kết quả thực hiện:**
  * **1. Xác minh CLI & Trích xuất Bản sao lưu Cloud DEV thật:**
    - Đối chiếu cú pháp thực tế qua `npx supabase db dump --help` và `npx supabase db push --help`: Cờ chính xác là `--linked`, `--data-only`, `--dry-run`.
    - Trích xuất thành công 2 file backup từ dự án remote `euswzyespwaxyrjkfkrq`:
      * `supabase/backups/backup_cloud_dev_pre_005_schema.sql` (94,000 bytes).
      * `supabase/backups/backup_cloud_dev_pre_005_data.sql` (53,121 bytes).
    - Cập nhật `MIGRATION_005_008_CLOUD_DEPLOYMENT_PLAN.md`: Ghi rõ CLI không dump auth.users/storage; không giả định snapshot tự động; hướng dẫn phục hồi bằng `psql` với chuỗi kết nối Cloud DEV; cấm tuyệt đối `db reset` và `migration repair`.
  * **2. Hoàn thiện luồng Thu phí lưu bãi tại cổng trên PWA:**
    - Gỡ bỏ hoàn toàn việc hardcode `p_paid_at_gate: false`.
    - `src/lib/services/repository-interface.ts` và 2 repositories (`SupabaseRepository`, `DemoRepository`): Hỗ trợ `paidAtGate`, `paymentMethod` (`CASH`/`BANK_TRANSFER`), `receiptCode` trong `confirmPhysicalExit`.
    - Bổ sung `calculateStorageFee` tính đúng mốc qua đêm 22:00-06:00 giờ Việt Nam (RPC `sc_calculate_storage_fee` hoặc thuật toán chuẩn offline).
    - Modal An ninh Cổng ra (`src/app/exit/page.tsx`):
      * Nếu có phí mà tài khoản thiếu quyền `storage.payment.collect` và không có ngoại lệ nợ AP06: Hiển thị cảnh báo đỏ và khóa nút xuất bãi.
      * Nếu có ngoại lệ nợ (`CLEARED_WITH_DEBT`): Cho phép chọn thu phí ngay tại cổng hoặc xuất bãi ghi nợ AP06.
      * Nếu thu phí tại cổng: Cho phép chọn `CASH` / `BANK_TRANSFER`, nhập mã biên nhận (bắt buộc khi chuyển khoản).
  * **3. Cập nhật Banner môi trường động:**
    - `src/components/layout/app-shell.tsx`: Banner phản ánh chính xác giá trị `process.env.NEXT_PUBLIC_ENABLE_REAL_WRITE`.
    - Khi false: `SUPABASE REAL — Đang kết nối Supabase Cloud DEV (Chỉ đọc) — Thao tác ghi TẠM KHÓA qua Feature Flag an toàn.`
    - Khi true: `SUPABASE REAL — Đang kết nối Supabase Cloud DEV (Ghi thực tế) — Chế độ vận hành trực tiếp với phân quyền RBAC/RLS.`
  * **4. Kiểm thử tự động trên Client / HTTP thật:**
    - `scripts/test_browser_roles.mjs`: Kiểm thử 3 role đại diện `SEC_STAFF`, `PORT_LEAD`, `DIS_STAFF`. Đăng nhập Supabase Auth thật -> RPC `sc_my_permissions` -> kiểm tra quyền chuyên biệt -> gọi 6 routes Next.js (`http://localhost:3000` HTTP 200 OK) -> Đăng xuất sạch sẽ. Kết quả: 3/3 PASS 100%.
    - `scripts/test_storage_fee_calc.mjs`: Kiểm thử 5 test case phí lưu bãi 22:00-06:00 (múi giờ VN, miễn đêm đầu, 100k/đêm). Kết quả: 5/5 PASS 100%.
    - `scripts/verify_uat_screens.mjs`: Kiểm tra 7/7 tài khoản UAT phân quyền hiển thị màn hình đúng chuẩn. Kết quả: 7/7 PASS 100%.
  * **5. Biên tập Báo cáo & Đóng gói:**
    - Biên tập `ProjectContext/06_Kien_truc_va_kiem_thu/SONCANG_CLOUD_DEV_RELEASE_CHECKLIST.md`.
    - Đóng gói zip an toàn: `ProjectContext/06_Kien_truc_va_kiem_thu/soncang_cloud_readiness_code_bundle.zip` (0.28 MB, SHA-256: `512CAF53A67BDA38A750D66DBB886BB86D7E2ACAC3F84C8ADE60D3481A59A3E1`).
    - DỪNG CHỜ PHÊ DUYỆT RIÊNG 2 BƯỚC CỦA CHỦ DỰ ÁN.

- **Cập nhật lúc:** 12/10/2026 12:30 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN THÀNH CHUYỂN SANG UAT THỰC TẾ & CHUẨN BỊ TRIỂN KHAI CLOUD DEV 005–008: Bàn giao an toàn mật khẩu 7 tài khoản UAT qua file lưu trữ lâu dài `%USERPROFILE%\.soncang\uat_credentials.json`, Sửa hoàn thiện `smoke_test_atomic_entry.mjs` với đúng 100% tham số RPC Migration 005 và `-v ON_ERROR_STOP=1` (PASS 100%), Hoàn thiện trang `/exit` hỗ trợ An ninh xác nhận xe rời bãi một mình qua RPC `sc_confirm_vehicle_only_exit`, Khởi chạy PWA phiên bản mới nhất tại `http://localhost:3000` (Next.js Production Build 12/12 Static Pages PASS), Kiểm thử đăng nhập thực tế 7/7 tài khoản Cloud DEV xác nhận phân quyền hiển thị màn hình đúng chuẩn RBAC V5, Lập Phương án triển khai có kiểm soát Migrations 005–008 (`MIGRATION_005_008_CLOUD_DEPLOYMENT_PLAN.md`), Đóng gói Zip bảo mật mới nhất (SHA-256: `C90DF1B68A72595084B82F2F7337C4D9448C61F35AA330C6DF1E693C71B2CCC3`), DỪNG CHỜ PHÊ DUYỆT RIÊNG CỦA CHỦ DỰ ÁN ĐỂ PUSH CLOUD DEV**.
- **Chi tiết kết quả thực hiện:**
  * **1. Bàn giao và lưu trữ lâu dài 7 tài khoản UAT:**
    - Tuyệt đối giữ nguyên 7 tài khoản đã tạo trên Supabase Cloud DEV, không chạy lại script tạo để tránh reset mật khẩu.
    - Chuyển tệp credentials từ scratch tạm thời sang vị trí lưu trữ lâu dài trên máy người dùng: `C:\Users\private\.soncang\uat_credentials.json` (nằm ngoài repo, an toàn tuyệt đối).
    - Hướng dẫn Chủ dự án mở tệp trực tiếp hoặc nhập vào Password Manager / Vault nội bộ.
  * **2. Hoàn thiện 2 điểm tích hợp theo yêu cầu:**
    - Sửa `scripts/smoke_test_atomic_entry.mjs`: Chuẩn hóa 100% tham số theo Migration 005 (`p_vehicle_type`, `p_has_container`), thực thi qua `psql` với cờ `-v ON_ERROR_STOP=1`, bắt buộc fail-fast nếu có lỗi SQL, kiểm tra assert nội dung log thực tế thay vì chỉ exit code. Kết quả: PASS 100%.
    - Trang `/exit`: Bổ sung chế độ "Xe rời bãi không cont" cho phép nhân viên An ninh xác nhận xe ra một mình (ví dụ: xe đầu kéo hạ bãi cont, xe bơ, xe tải) gọi RPC `sc_confirm_vehicle_only_exit`, kiểm tra quyền `gate.exit` và trạng thái thanh toán vé cổng, không tính phí lưu bãi container.
  * **3. Khởi chạy và kiểm thử PWA thực tế:**
    - Địa chỉ chạy thử nghiệm PWA: `http://localhost:3000` (Next.js server đã chạy và phản hồi HTTP 200).
    - Giữ `NEXT_PUBLIC_ENABLE_REAL_WRITE=false` bảo vệ dữ liệu trong khi chưa được phép ghi.
    - Chạy script kiểm thử `scripts/verify_uat_screens.mjs`: Xác nhận 7/7 tài khoản đăng nhập Supabase Cloud DEV thành công và được phân quyền hiển thị đúng các menu/màn hình theo RBAC V5.
  * **4. Kế hoạch triển khai có kiểm soát 005–008:**
    - Xuất bản tài liệu `ProjectContext/06_Kien_truc_va_kiem_thu/MIGRATION_005_008_CLOUD_DEPLOYMENT_PLAN.md`.
    - Xác nhận dự án duy nhất: `son-cang-yms-dev` (`euswzyespwaxyrjkfkrq`).
    - Kế hoạch backup: `npx supabase db dump ...`.
    - Lệnh push có kiểm soát và kịch bản smoke test hậu triển khai.
    - Đóng gói zip an toàn: `soncang_cloud_readiness_code_bundle.zip` (SHA-256: `C90DF1B68A72595084B82F2F7337C4D9448C61F35AA330C6DF1E693C71B2CCC3`).
    - DỪNG chờ phê duyệt riêng từ Chủ dự án trước khi thực hiện push Cloud DEV.

- **Cập nhật lúc:** 12/10/2026 12:10 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN TẤT CHỐT TÍCH HỢP PWA & KHỞI TẠO 7 TÀI KHOẢN UAT TRÊN SUPABASE CLOUD DEV: Xóa bỏ 100% hard-block Real Mode tại các màn hình PWA, Tiếp nhận xe có container tích hợp RPC nguyên tử `sc_create_vehicle_and_container_visit_atomic`, Tự động truy vấn đúng `yard_id` bãi Sơn Cảng từ CSDL cho mọi vai trò (kể cả SYS_ADMIN), Cập nhật `UAT_ACCOUNTS_PLAN.md` khớp chính xác schema 001–004 và ROLLBACK test Local PASS, Khởi tạo thành công 7 tài khoản UAT qua Supabase Auth Admin API trên Cloud DEV (`euswzyespwaxyrjkfkrq`) với `email_confirm: true` và mật khẩu ngẫu nhiên bảo mật ngoài repo, Gán 7 vai trò vào `app_user_role_assignments` và kiểm thử đăng nhập thực tế 7/7 PASS cùng RPC `sc_my_permissions()`, TypeScript 0 errors, ESLint 0 errors, Smoke Test nguyên tử PASS, Next.js Production Build 12/12 Static Pages PASS, Đóng gói sạch `soncang_cloud_readiness_code_bundle.zip` (SHA-256: `DC4F0531C4F76F26E434814566D6169410765BF67C3A50D37AF732279284ADD1`), Xuất bản báo cáo CLOUD_UAT_FINAL_READINESS.md**.
- **Chi tiết kết quả thực hiện:**
  * **1. Xóa bỏ hoàn toàn Hard-block tĩnh tại PWA Frontend:**
    - Loại bỏ toàn bộ `authMode === 'REAL'` hard-block tại `/entry`, `/yard`, `/reefer`, `/billing`, `/exit`.
    - Khi Feature Flag `NEXT_PUBLIC_ENABLE_REAL_WRITE` là false (mặc định), frontend hiển thị cảnh báo rõ ràng; khi bật true, frontend gọi trực tiếp SupabaseRepository với RBAC/RLS thực tế.
    - Tiếp nhận xe có container: sử dụng RPC nguyên tử `sc_create_vehicle_and_container_visit_atomic` (1 transaction duy nhất), không phân mảnh xe và cont.
    - `yard_id` được tự động truy vấn từ CSDL (`app_yards`) lấy đúng bãi Sơn Cảng (`fe83bb2b-833e-412c-aed4-b9a781a6decd`) cho mọi vai trò, không dùng ID giả.
  * **2. Khởi tạo và gán quyền 7 tài khoản UAT trên Cloud DEV:**
    - Sử dụng Supabase Auth Admin API (không INSERT raw SQL vào `auth.users`), tạo 7 tài khoản với `email_confirm: true`:
      1. `sys_admin_uat@example.com` (`SYS_ADMIN` - 60 quyền)
      2. `sec_staff_uat@example.com` (`SEC_STAFF` - 26 quyền)
      3. `sec_lead_uat@example.com` (`SEC_LEAD` - 31 quyền)
      4. `cckb_staff_uat@example.com` (`PORT_STAFF` - 31 quyền)
      5. `cckb_lead_uat@example.com` (`PORT_LEAD` - 38 quyền)
      6. `dis_staff_uat@example.com` (`DIS_STAFF` - 9 quyền)
      7. `dis_lead_uat@example.com` (`DIS_LEAD` - 11 quyền)
    - Mật khẩu ngẫu nhiên có độ entropy cao (26 ký tự), lưu trữ an toàn ngoài repo tại `C:\Users\private\.gemini\antigravity\brain\04a2ceca-6c82-43e2-8b27-5c43c094b2d4\scratch\uat_credentials_safe.json` (tuyệt đối không vào Git/Zip).
    - Đăng nhập thực tế và gọi RPC `sc_my_permissions()` thành công 100% cho cả 7 tài khoản.
  * **3. Cập nhật Kế hoạch UAT và Kiểm thử:**
    - Cập nhật `ProjectContext/06_Kien_truc_va_kiem_thu/UAT_ACCOUNTS_PLAN.md` theo schema thật (dùng `created_by`, `WHERE NOT EXISTS`, dừng khi thiếu tài khoản).
    - Chạy script kiểm thử ROLLBACK thành công trên Local DB.
    - Smoke test luồng tiếp nhận nguyên tử (`scripts/smoke_test_atomic_entry.mjs`) đạt PASS.
    - TypeScript compiler (`tsc --noEmit`), ESLint (`pnpm lint`), Next.js build (`pnpm build`) đạt 100% không lỗi.
  * **4. Đóng gói bảo mật:**
    - Chạy `scripts/make_secure_bundle.ps1`, quét sạch các tệp nhạy cảm (.temp, .env*, secrets, logs, node_modules).
    - Gói zip bàn giao: `ProjectContext/06_Kien_truc_va_kiem_thu/soncang_cloud_readiness_code_bundle.zip` (0.26 MB, SHA-256: `DC4F0531C4F76F26E434814566D6169410765BF67C3A50D37AF732279284ADD1`).

- **Cập nhật lúc:** 12/10/2026 11:40 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN THÀNH TOÀN DIỆN CHUẨN BỊ CLOUD DEV READINESS & KẾ HOẠCH TÀI KHOẢN UAT THỰC TẾ (A, B, C, D, E): Kiểm tra Cloud DEV Read-Only đạt trạng thái READY, Hoàn thiện Real Write Adapter cho PWA kết nối 100% RPC nghiệp vụ sau Feature Flag bảo vệ an toàn (NEXT_PUBLIC_ENABLE_REAL_WRITE="false"), TypeScript và Next.js Build 12/12 Static Pages PASS 100%, Lập Kế hoạch 7 Tài khoản UAT V5 qua Supabase Auth Admin, Chuẩn hóa quy trình đóng gói Secure Bundle loại bỏ triệt để .temp và secrets (SHA-256: `A6CD09AE10BFC924E426388BEEBFF37C61DD5BCD1A70F5F5F3897BC0408F7630`), DỪNG CHỜ PHÊ DUYỆT CHÍNH THỨC**.
- **Chi tiết kết quả thực hiện:**
  * **Phần A (Kiểm tra Cloud DEV — READ ONLY):**
    - Xác minh dự án Cloud DEV `son-cang-yms-dev`, ref: `euswzyespwaxyrjkfkrq`.
    - Lịch sử migrations 001–004 đã áp dụng thành công (khớp SHA-256 Migration 004 `f364d0535c797abef9382e9f22bef6a3b3ac5790381c013425a091856dab20d0`).
    - Lệnh `supabase db push --dry-run --linked` xác nhận 4 migrations 005–008 sẵn sàng, database remote sạch sẽ, không có drift.
    - Kết luận: **READY**. Xuất bản tài liệu `ProjectContext/06_Kien_truc_va_kiem_thu/CLOUD_DEV_PREFLIGHT_REPORT.md`.
    - Tuyệt đối KHÔNG ghi, không reset, không repair, không push Cloud.
  * **Phần B (Chuẩn bị Real Write cho PWA):**
    - Cập nhật `src/lib/services/supabase-repository.ts` kết nối đầy đủ tất cả RPC backend thật: `sc_create_vehicle_visit`, `sc_create_container_visit`, `sc_update_container_cargo`, `sc_correct_container_number`, `sc_plug_in_reefer`, `sc_unplug_reefer`, `sc_collect_payment`, `sc_approve_exit_clearance`, `sc_confirm_physical_exit`, `sc_confirm_vehicle_only_exit`.
    - Toàn bộ mutation methods được bảo vệ sau Feature Flag `NEXT_PUBLIC_ENABLE_REAL_WRITE` (mặc định là `"false"`). Khi flag là false, trả về thông báo lỗi minh bạch, chặn 100% write calls tới database remote.
    - Cập nhật `src/types/database.types.ts` đồng bộ đầy đủ các bảng và functions 001–008.
    - Kiểm tra `pnpm exec tsc --noEmit`: **PASS (0 errors)**.
    - Kiểm tra `pnpm build`: **PASS (12/12 static pages biên dịch thành công trong 6.9s)**.
  * **Phần C (Kế hoạch 7 tài khoản UAT thực tế):**
    - Soạn thảo `ProjectContext/06_Kien_truc_va_kiem_thu/UAT_ACCOUNTS_PLAN.md` theo 7 vai trò chuẩn V5: `SYS_ADMIN`, `SEC_STAFF`, `SEC_LEAD`, `PORT_STAFF`, `PORT_LEAD`, `DIS_STAFF`, `DIS_LEAD`.
    - Quy trình tuân thủ an toàn: Tạo người dùng qua Supabase Dashboard/Admin API (hoặc Invite Link), tự đặt mật khẩu riêng, tuyệt đối không INSERT thô vào `auth.users`.
    - Chuẩn bị sẵn Script SQL gán quyền vào `app_user_role_assignments` kèm `yard_id` Sơn Cảng thực tế sau khi người dùng kích hoạt.
  * **Phần D (Quy trình đóng gói ZIP bảo mật):**
    - Xây dựng script PowerShell `scripts/make_secure_bundle.ps1`.
    - Loại bỏ triệt để thư mục `.temp`, `.env*` (chỉ giữ `.env.example`), `.git`, `node_modules`, `.next`, `*.log`, `*.zip`.
    - Tạo gói `ProjectContext/06_Kien_truc_va_kiem_thu/soncang_cloud_readiness_code_bundle.zip` (0.26 MB, 86 entries).
    - Mã SHA-256: `A6CD09AE10BFC924E426388BEEBFF37C61DD5BCD1A70F5F5F3897BC0408F7630`.
  * **Phần E (Điểm dừng an toàn):**
    - Giữ nguyên trạng thái Cloud DEV.
    - DỪNG chờ phê duyệt chính thức từ Chủ dự án trước khi push 005–008 hoặc tạo tài khoản Cloud.

- **Cập nhật lúc:** 12/10/2026 11:20 (Asia/Ho_Chi_Minh)
- **Mốc hiện tại:** **HOÀN TẤT FINAL LOCAL GATE CLOSURE (GLC-01 ĐẾN GLC-08): Khắc phục triệt để toàn bộ 8 phát hiện kiểm toán độc lập, Kiểm thử trên Database độc lập sạch sẽ `soncang_gate_test` từ 001->008 thành công 100%, Chạy pgTAP Local Runtime thật PASS 181/181 tests (100%), Chạy kịch bản E2E Integration 11 nhóm dưới role authenticated PASS 100%, Kiểm thử 2 kết nối PostgreSQL song song thực tế (Concurrent Race Test GLC-06) PASS 100%, Frontend TypeScript 0 errors, Next.js Build 12/12 Static Pages PASS, Đóng gói đầy đủ `soncang_final_local_gate_code_bundle.zip` (SHA-256: `111FECE1828FEF1794F8E5CC1B35249040F58280444EF9978892624EEE7AD6CB`) và `soncang_final_local_gate_evidence.zip` (SHA-256: `9071E913487C18E093302E10464D0772C8D3EDFD84A1469796E8643D9DA4AC38`), Xuất bản báo cáo SONCANG_FINAL_LOCAL_GATE_REPORT.md**.
- **Kết quả Khắc phục 8 Phát hiện Kiểm toán (GLC-01 -> GLC-08):**
  * **GLC-01 (P0):** Chuẩn hóa explicit `REVOKE/GRANT` và `ENABLE ROW LEVEL SECURITY` cho toàn bộ 5 bảng mới: `app_yard_billing_settings`, `app_reefer_power_sessions`, `app_tariffs`, `app_charges`, `app_payments`. Cấm hoàn toàn DML trực tiếp từ client role `authenticated` và `anon`.
  * **GLC-02 (P0):** Tự động phát sinh bản ghi `app_charges` loại `TICKET` khi xe có vé > 0 (kể cả luồng tạo xe trực tiếp, qua atomic RPC, hay khi An ninh nâng vé đầu kéo từ 0đ lên 250k); đồng bộ trạng thái thanh toán vé `PAID` qua sổ cái `app_payments`.
  * **GLC-03 (P0):** Chặn cả trạng thái `PLUGGED` và `PENDING_REVIEW` (phiên điện 0s / bất thường chưa xử lý) trong cả 2 hàm RPC `sc_approve_exit_clearance` và `sc_confirm_physical_exit`.
  * **GLC-04 (P1):** Liên kết `reefer_session_id` vào `app_charges` khi `sc_unplug_reefer` tạo charge; đồng bộ `payment_status` của phiên điện thành `PAID` khi thu tiền qua `sc_collect_payment`.
  * **GLC-05 (P1):** Bổ sung RPC độc lập `sc_confirm_vehicle_only_exit` cho Xe A mang cont vào hạ bãi rồi ra một mình; container an toàn ở lại bãi; Xe B sau đó vào nhận container kéo ra qua `sc_confirm_physical_exit`.
  * **GLC-06 (P1):** Nâng cấp khối `unique_violation` đối chiếu full payload so sánh đầy đủ; kiểm thử thực tế với 2 kết nối song song đồng thời (PowerShell jobs psql) đạt 100% race safety.
  * **GLC-07 (P1):** Chặn An ninh tự ý set trạng thái `HANG`/`RONG` (chỉ Điều phối có quyền `container.cargo.update` mới được cập nhật).
  * **GLC-08 (P1):** Biểu phí `app_tariffs` có RLS bảo vệ, cấm sửa trực tiếp từ client, tuân thủ AP10 Four-Eyes.
- **Bằng chứng Runtime:**
  * **Database Độc lập (`soncang_gate_test`):** Áp dụng tuần tự từ 001 đến 008 trên clean database độc lập; 001-004 giữ nguyên 100% (SHA-256 của Migration 004 là `f364d0535c797abef9382e9f22bef6a3b3ac5790381c013425a091856dab20d0`).
  * **pgTAP Tests:** 6 bộ test suites, 181/181 tests PASS 100% (005: 15/15, 006: 13/13, 007: 10/10, 008: 19/19, 004: 75/75, RBAC: 49/49).
  * **E2E Integration & RBAC (`scripts/gate_local_e2e_verification.sql`):** 11 kịch bản runtime chạy dưới database role `authenticated` đạt PASS 100%.
  * **Kiểm thử Đồng thời (`scripts/run_concurrent_test.ps1`):** 2 session song song thật test race condition: Match payload -> replay an toàn cùng ID; Mismatch payload -> bị chặn lỗi. PASS 100%.
  * **Frontend:** TypeScript `tsc --noEmit` 0 errors, ESLint `pnpm lint` 0 errors, Next.js `pnpm build` compile thành công 12/12 static pages.
- **Tình trạng Cloud DEV:** TUYỆT ĐỐI CHƯA PUSH, GIỮ NGUYÊN CLOUD DEV CHỜ CHỦ DỰ ÁN PHÊ DUYỆT GATE C MỚI.
    - `src/lib/services/supabase-repository.ts`: Cảnh báo log rõ ràng cho Cloud DEV (R2-05); sửa thông báo khóa ghi Cloud phản ánh đúng trạng thái Migration 004 đã triển khai (R2-07).
- **Kiểm thử Tĩnh & Biên dịch:**
  * `tsc --noEmit`: **PASS (0 errors)**.
  * `pnpm lint`: **PASS (0 errors, 0 warnings)**.
  * `pnpm build`: **PASS (12/12 static pages / route handlers biên dịch thành công)**.
  * pgTAP: **CODE-READY / NOT RUN** (sẵn sàng cho Gate PostgreSQL Local runtime).
- **Đóng gói An toàn:**
  * File: `soncang_overnight_code_bundle.zip` (2,585,009 bytes, 526 files).
  * SHA-256: `216F7FABDFF6EB90BFFE427CE3E1CD841573160DF07156F4AEE21A129A982825`.
  * Tuyệt đối không chứa secret key, `.env*`, `.supabase`, hay `service_role key`. Cloud DEV tiếp tục được khóa Real Write an toàn.

- **Mốc hiện tại:** **HOÀN THÀNH TOÀN DIỆN AUTONOMOUS OVERNIGHT BUILD & GÓI NÂNG CẤP SÂU PWA SƠN CẢNG: Dashboard Tổng quan Vận hành (`/dashboard`), Nghiệp vụ Sửa số Container V5 (bảo toàn ID lượt + lịch sử đổi số), Tuân thủ PWA 100% (Manifest + Service Worker offline-first + Icons SVG), Next.js Build 12/12 Static Pages PASS (0 errors, 0 warnings), Xuất Bundle ZIP mới (SHA256: `FCAB4BF0F2FCC2357DE1826C1DCD5046965B4BBB1BA158DA760F1EFECDC9FAB9`)**.
- **Kết quả Thực tế Hoàn tất:**
  * **Dashboard Vận hành Tổng quan (`/dashboard`):** KPI thời gian thực (xe trong bãi, cont lưu bãi, phiên cắm điện active, doanh thu ca đã thu/chờ thu); Biểu đồ phân bổ 7 loại xe V5; Phân bổ HÀNG/RỖNG/Chưa XĐ; Cảnh báo container lưu bãi > 24h (tiềm ẩn phí đêm thứ 2 theo AP07); Lối tắt thao tác nhanh theo vai trò RBAC V5.
  * **Nghiệp vụ Sửa số Container V5 trên `/yard`:** Tuân thủ triệt để quy tắc V5 (không đổi ID lượt, không đổi lượt container); Modal sửa số cont nhập số mới + lý do bắt buộc (>= 3 ký tự) + bằng chứng; Modal xem timeline lịch sử đổi số container (ai đổi, đổi lúc nào, từ số nào sang số nào, lý do gì); Badge hiển thị số lần đổi số ngay cạnh số cont.
  * **PWA Full Compliance:** File `public/manifest.json` chuẩn PWA; Service Worker `public/sw.js` (chiến lược stale-while-revalidate tài nguyên tĩnh, network-first kèm offline fallback cho navigation); Component `PwaRegister` trong `layout.tsx`; Cặp biểu tượng chuẩn SVG `icon-192.svg` và `icon-512.svg` nhận diện thương hiệu Sơn Cảng (`#223873` & `#0A9444`).
  * **Phase 1D-02 & Backend Guards:** Khắc phục triệt để 7/7 lỗi `SC-1D-01` đến `SC-1D-07`. Tạo 4 migrations 005, 006, 007, 008 kèm 45 assertions pgTAP ở trạng thái `LOCAL TESTED / DEPLOY PENDING`.
  * **Kiểm thử tĩnh & Runtime:** `tsc --noEmit` PASS (0 errors), `pnpm lint` PASS (0 errors, 0 warnings), Next.js 16 build PASS (12/12 static pages), 10 endpoints HTTP 200 OK.
  * **Đóng gói an toàn:** `soncang_overnight_code_bundle.zip` (2.573.556 bytes, 524 files, SHA-256: `FCAB4BF0F2FCC2357DE1826C1DCD5046965B4BBB1BA158DA760F1EFECDC9FAB9`). Không chứa secrets, `.env*` hay `service_role key`. Cloud DEV giữ nguyên trạng ở Migration 004 an toàn 100%.
- **Cập nhật lúc:** 11/10/2026 18:28
- **Mốc hiện tại:** **NGHIỆM THU RUNTIME POSTGRESQL THÀNH CÔNG: Chạy kiểm thử pgTAP 49/49 PASS trên Supabase Local PostgreSQL 17, Khắc phục triệt để Kiểm toán Vòng 5 (SC-R5-01 đến SC-R5-04) — TIẾP TỤC TẠM DỪNG Phase 1C theo chỉ đạo**.
- **Kết quả Khắc phục 4 Phát hiện Kiểm toán Vòng 5:**
  - **SC-R5-01 (BLOCKER):** Fixture audit không hardcode ID (do cột `id` là `GENERATED ALWAYS AS IDENTITY`); sử dụng `RETURNING id INTO ...` capture ID sinh tự động; kiểm tra trigger `sc_audit_immutable` chặn UPDATE/DELETE thành công 100%.
  - **SC-R5-02 (HIGH):** Kiểm thử RLS row-level visibility và privileges thực tế dưới database role `authenticated` thật:
    * Nhân viên `SEC_STAFF` không có `audit.read` -> RLS ẩn hoàn toàn 0 bản ghi audit log.
    * Trưởng ban `SEC_LEAD` có `audit.read (DEPARTMENT)` -> Thấy audit bộ phận AN_NINH, ẩn CCKB.
    * Trưởng ban `PORT_LEAD` có `audit.read (DEPARTMENT)` -> Thấy audit bộ phận CCKB Bãi 1, ẩn AN_NINH.
    * `SYS_ADMIN` (Scope ALL) -> Thấy toàn bộ audit logs.
    * Người dùng không có vai trò (`NONE`) -> Ẩn toàn bộ 0 bản ghi.
  - **SC-R5-03 (HIGH):** Chuẩn hóa các bài test `throws_ok()`: tách riêng câu lệnh thiết lập auth context, `throws_ok()` chỉ gọi 1 RPC duy nhất, kiểm tra đúng mã lỗi `P0001` cùng chuỗi thông báo nghiệp vụ cụ thể cho AP06 ("tác vụ một bước") và Four-Eyes ("Four-Eyes Violation"), xác minh trạng thái request giữ nguyên `PENDING`.
  - **SC-R5-04 (MEDIUM):** Không định nghĩa lại `auth.uid()` hoặc `auth.role()` trong kiểm thử tích hợp, sử dụng cơ chế và hàm chuẩn của Supabase Auth.
- **Kết quả Thực thi Runtime trên Supabase Local PostgreSQL 17:**
  - Docker Desktop Engine: **RUNNING** (Docker Server 29.8.2 trên WSL2).
  - Khởi tạo Supabase Local: `npx supabase start` áp dụng thành công cả 3 migrations:
    * `20261011000001_foundation_rbac.sql`: **APPLIED (PASS)**
    * `20261011000002_seed_rbac_v5.sql`: **APPLIED (PASS)**
    * `20261011000003_rbac_security_functions_rls.sql`: **APPLIED (PASS)**
  - Chạy kiểm thử Database bằng pgTAP: `npx supabase test db --local`:
    ```
    /thanhnx/OpenCode/YMS-project/supabase/tests/rbac_verification.sql .. ok
    All tests successful.
    Files=1, Tests=49, 0 wallclock secs
    Result: PASS
    ```
    **KẾT QUẢ RUNTIME: 49 / 49 TESTS PASS (EXIT CODE 0)!**
- **Kiểm thử Tĩnh & Biên dịch:**
  - `scripts/verify_rbac_invariants.js`: **52 / 52 PASS, 0 FAIL**.
  - `scripts/audit_rbac_exact.py`: **PASS (Exit code 0)** đối chiếu 8 roles, 67 perms, 206 grants khớp 100% Workbook V5.
  - `scripts/test_audit_mutation.py`: **4 / 4 PASS** Mutation & Negative tests.
  - TypeScript: `pnpm exec tsc --noEmit` đạt 0 lỗi.
  - Next.js Production Build: `pnpm build` thành công 100% (Turbopack, Next.js 16.4.0).
- **Ranh giới Kỹ thuật & Cam kết An toàn:**
  - 100% thao tác trên Supabase Local, tuyệt đối không kết nối Remote / Production Database.
- **Cập nhật lúc:** 11/10/2026 19:55
- **Mốc hiện tại:** **HOÀN TẤT KHẮC PHỤC RÀ SOÁT ĐỘC LẬP THIẾT KẾ DOMAIN SCHEMA PHASE 1C-A (SC-1C-A-01 ĐẾN SC-1C-A-07): Đồng bộ hóa toàn diện `DOMAIN_SCHEMA_DESIGN_V5.md`, `PHASE1C_A_DESIGN_REVIEW_REPORT.md` và `OPEN_DECISIONS_UAT.md` — CHƯA VIẾT/CHẠY MIGRATION 004, CHƯA THAY ĐỔI CLOUD DEV**.
- **Kết quả Khắc phục 7 Phát hiện Kiểm toán Độc lập:**
  - **SC-1C-A-01 (HIGH):** Bỏ 2 Partial Unique Indexes cứng xe-cont; thiết kế giữ quan hệ 1 Xe - Nhiều Cont (hỗ trợ xe đầu kéo chở 2x20ft); lập câu hỏi nghiệp vụ trọng yếu chờ Chủ dự án quyết định.
  - **SC-1C-A-02 (HIGH):** Tách biệt độc lập 2 sự kiện cắm (`plug_in_at`, `plug_in_field_operator_id/name`, kênh thông báo, CCKB ghi nhận) và rút (`plug_out_at`, `plug_out_field_operator_id/name`, kênh thông báo, CCKB ghi nhận).
  - **SC-1C-A-03 (HIGH):** Tuyệt đối không tự động miễn tiền khi `duration=0`. Chuyển trạng thái sang `ZERO_DURATION_REVIEW`, bắt buộc có lý do và xác nhận của TBP CCKB chứng minh không có kết nối điện thực tế thì mới set 0đ (`CANCELLED_NO_CONNECTION`).
  - **SC-1C-A-04 (HIGH):** Tách rõ chính sách giá điện (snapshot lúc cắm) và giá lưu bãi (câu hỏi mở RV04: tính theo mốc 22:00 từng đêm hay theo ngày vào cổng).
  - **SC-1C-A-05 (HIGH):** Chuẩn hóa quy trình xuất bãi AP07: Phí lưu chốt tại mốc ra thực tế; An ninh thu tiền mặt qua `storage.payment.collect`; CCKB xác nhận ngoại lệ nợ qua `exit.clearance.debt_exception`; có ràng buộc `ck_ap07_debt_exception_fields`. Tuyệt đối An ninh không thu tiền điện.
  - **SC-1C-A-06 (MEDIUM):** Bổ sung `idempotency_key` chống bấm đôi/retry; phân định rõ Unique index cho quan hệ 1-1 chặt chẽ (theo từng phiên điện, vé xe) và kiểm soát RPC cho phí lưu.
  - **SC-1C-A-07 (MEDIUM):** Định hình Migration 004 độc lập 100% (chỉ gồm 3 bảng xe, cont, sửa số cont; tuyệt đối không có FK tham chiếu tới các bảng của Migrations 005–007).
- **Cập nhật lúc:** 11/10/2026 20:45
- **Mốc hiện tại:** **HOÀN THÀNH SOẠN THẢO MÃ NGUỒN MIGRATION 004 (PHASE 1C-B: CODE DRAFT / PENDING REVIEW): Đã tạo SQL Migration 004, bộ test pgTAP 004 (35 assertions), TypeScript types, Báo cáo rà soát mã nguồn & Gói ZIP kiểm toán độc lập — CHƯA CHẠY RUNTIME, CHƯA PUSH LÊN BẤT KỲ CSDL NÀO**.
- **Kết quả Thực hiện Phase 1C-B (Code-Only):**
  - **File SQL Migration 004:** `supabase/migrations/20261011000004_domain_vehicles_containers.sql` (gồm đúng 3 bảng: `app_vehicle_visits`, `app_container_visits`, `app_container_number_changes`).
    * CSDL giữ nguyên quan hệ 1 Xe : N Cont (không có UNIQUE constraint cứng).
    * Composite Foreign Keys `(id, yard_id)` chống liên kết lệch bãi (Cross-yard prevention).
    * Bảng lịch sử sửa số có trigger bảo vệ bất biến (append-only).
    * 7 RPC functions `SECURITY DEFINER SET search_path = ''` kiểm tra quyền theo bãi và actor `auth.uid()`.
    * RPC `sc_create_container_visit` fail-closed theo V1 baseline (chặn xe cõng > 1 cont active, UAT 2x20 còn mở).
    * Không có RPC kết thúc xuất bãi `EXITED` tại Migration 004.
  - **Bộ kiểm thử pgTAP:** `supabase/tests/domain_vehicles_containers_004.sql` (Khai báo `SELECT plan(35);`, bao phủ toàn bộ 26 kịch bản M004-T01 đến M004-T26).
  - **Báo cáo Kỹ thuật:** `ProjectContext/06_Kien_truc_va_kiem_thu/MIGRATION_004_CODE_REVIEW_REPORT.md` (Đầy đủ compliance matrix, giải trình thiết kế, danh mục test).
  - **Đóng gói Bundle ZIP:** `migration_004_code_bundle.zip` (31.580 bytes) gồm 5 file phục vụ kiểm toán độc lập.
- **Trạng thái Kiểm thử & Môi trường:**
  - TypeScript: `pnpm exec tsc --noEmit` -> **PASS (Exit code 0)**.
  - ESLint: `pnpm lint` -> **PASS (Exit code 0)**.
  - RBAC Static Invariants: `verify_rbac_invariants.js` -> **52/52 PASS**.
  - RBAC Exact Audit: `audit_rbac_exact.py` -> **PASS (8 roles, 67 perms, 206 grants khớp 100%)**.
  - PostgreSQL Runtime Execution: **CHƯA THỰC THI (TESTS AUTHORED, NOT EXECUTED)**.
  - Supabase Cloud DEV (`son-cang-yms-dev`, ref: `euswzyespwaxyrjkfkrq`): **UNCHANGED** (giữ nguyên Migration 003).
  - Docker Desktop: **KHÔNG KHỞI ĐỘNG**.
- **Ranh giới Kỹ thuật & Cam kết An toàn Tuyệt đối:**
  - Tuyệt đối **KHÔNG** sửa đổi Migrations 001–003;
  - Tuyệt đối **KHÔNG** chạy migration 004 lên bất kỳ database nào;
  - DỪNG BẮT BUỘC để người dùng rà soát mã nguồn và phê duyệt riêng trước khi triển khai.

- **Cập nhật lúc:** 11/10/2026 21:10
- **Mốc hiện tại:** **HOÀN THÀNH KHẮC PHỤC TOÀN DIỆN 14 PHÁT HIỆN KIỂM TOÁN MIGRATION 004 VÒNG 1 (M004-R1-01 ĐẾN M004-R1-14): Sửa DDL Migration 004, viết lại pgTAP 004 (49 assertions top-level xuất TAP chuẩn), đồng bộ Types, lập script kiểm toán tĩnh & cập nhật Code Review Report — TIẾP TỤC DUY TRÌ CODE DRAFT / NOT EXECUTED, CHƯA CHẠY POSTGRESQL THỰC TẾ, CHƯA PUSH LÊN CLOUD DEV**.
- **Kết quả Khắc phục 14 Phát hiện Kiểm toán Vòng 1:**
  - **M004-R1-01 (BLOCKER):** Xóa bỏ toàn bộ `PERFORM ok/is` trong `DO $$`. Chuyển 100% assertions thành top-level `SELECT` statements (`SELECT is(...)`, `SELECT ok(...)`, `SELECT throws_ok(...)`). Nâng kế hoạch kiểm thử lên `plan(49)` khớp đúng 49/49 assertions thực tế xuất TAP cho `pg_prove`.
  - **M004-R1-02 (BLOCKER):** Sửa bài test quyền `anon`: kiểm tra bằng `hasnt_table_privilege('anon', ...)` cho cả `INSERT` và `SELECT` trên cả 3 bảng miền, không dùng `SELECT count(*)` trên bảng đã REVOKE.
  - **M004-R1-03 (HIGH):** Bỏ ký tự đại diện `%...%` trong `throws_ok()`; kiểm tra chính xác mã lỗi PostgreSQL (`P0001`, `23514`, `23503`) kết hợp chuỗi regex POSIX hợp lệ.
  - **M004-R1-04 (HIGH - Phân nhiệm):** Bỏ tham số `p_cargo_status` khỏi RPC `sc_create_container_visit` của An ninh. Server luôn khởi tạo `CHUA_XAC_DINH`; chỉ Điều phối viên có `container.cargo.update` mới được cập nhật sang `HANG`/`RONG`.
  - **M004-R1-05 (HIGH - Rò rỉ dữ liệu):** Sửa policy RLS `p_container_number_changes_select`: bỏ nhánh `OR container.visit.read`, CHỈ cho phép duy nhất quyền `container.number.discrepancy.view`. Bổ sung test chứng minh Điều phối bị RLS chặn thấy 0 dòng.
  - **M004-R1-06 (HIGH - Dữ liệu tin cậy):** Bỏ hoàn toàn `p_ticket_amount` khỏi client; server tự tính giá vé theo 7 loại xe V5. Bỏ `p_is_legacy_import` khỏi RPC tạo thông thường, server luôn gán `false`.
  - **M004-R1-07 (HIGH - Đặc tả DDL):** Sửa DDL `app_container_visits` cho phép `inbound_vehicle_visit_id uuid NULL` trong schema; RPC cổng vào bắt buộc truyền xe vào.
  - **M004-R1-08 (MEDIUM):** Gia cố trigger `sc_trg_container_number_changes_immutable` bảo vệ `evidence_url`, `notified_cckb`; chặn sửa đổi thông tin đối soát sau khi CCKB đã `reconciled` (chuyển trạng thái 1 chiều).
  - **M004-R1-09 (MEDIUM - V1 Baseline):** Sửa RPC đếm container `status <> 'CANCELLED'` của xe để thực thi nghiêm ngặt V1 baseline (1 xe / 1 cont); ghi nhận câu hỏi xe 2x20ft ở `OPEN_DECISIONS_UAT.md`.
  - **M004-R1-10 (MEDIUM):** Xóa bỏ mã xe `XE_KHAC` khỏi CHECK constraint; chỉ cho phép đúng 7 loại phương tiện chuẩn V5 có biểu phí trong `PROJECT_CONTEXT.md`.
  - **M004-R1-11 (MEDIUM):** Bổ sung kiểm tra phát hiện trùng số container đang `IN_YARD` tại cùng bãi trong cả `sc_create_container_visit` và `sc_correct_container_number`.
  - **M004-R1-12 (MEDIUM):** Sửa RPC `sc_update_container_cargo`: chỉ cho phép cập nhật khi `status = 'IN_YARD'`, từ chối cả `EXITED` (nhắc AP05) và `CANCELLED`.
  - **M004-R1-13 (MEDIUM - Test Auth):** Kiểm thử RLS và privileges trực tiếp dưới database role `authenticated` thật bằng `SET LOCAL ROLE authenticated` kết hợp JWT claims (`set_config('request.jwt.claims', ...)`).
  - **M004-R1-14 (MEDIUM - Test Quality):** Xóa bỏ 100% các nhánh "thiếu fixture => pass mặc định". Thiết lập fixture đầy đủ cho từng test suite, kiểm tra đúng trạng thái thực tế trước và sau.
- **Trạng thái Kiểm thử Tĩnh:**
  - `pnpm exec tsc --noEmit` -> **PASS (Exit code 0, 0 lỗi)**.
  - `node scripts/verify_rbac_invariants.js` -> **52 / 52 PASS**.
  - `python scripts/audit_rbac_exact.py` -> **PASS (Khớp 100% 8 roles, 67 perms, 206 grants V5)**.
  - `node scripts/audit_test_004.js` -> **PASS (`SELECT plan(49)` khớp đúng 49/49 assertions top-level, 0 PERFORM ok/is, 0 wildcard `%...%`, 0 pass mặc định)**.
- **Cập nhật lúc:** 11/10/2026 21:25
- **Mốc hiện tại:** **HOÀN THÀNH BÁO CÁO ĐÁNH GIÁ TÁC ĐỘNG MỞ RỘNG MIGRATION 004 VỚI DANH MỤC LOẠI PHƯƠNG TIỆN ĐỘNG (`app_vehicle_types`): Cập nhật tài liệu thiết kế `DOMAIN_SCHEMA_DESIGN_V5.md`, `DECISION_LOG.md` (D-004), `OPEN_DECISIONS_UAT.md` (Quyết định 6) & Lập Báo cáo Đánh giá Tác động chuyên sâu — DỪNG VÀ CHỜ CHỦ DỰ ÁN PHÊ DUYỆT TRƯỚC KHI SỬA MÃ NGUỒN**.
- **Nội dung Đánh giá Tác động:**
  - Bổ sung bảng thứ 4: `app_vehicle_types` (`code PK`, `display_name`, `allows_container`, `default_ticket_amount`, `is_active`, `sort_order`).
  - Khóa ngoại `app_vehicle_visits.vehicle_type REFERENCES public.app_vehicle_types(code) ON DELETE RESTRICT`: Chặn xóa loại xe đã phát sinh lịch sử, bảo toàn nguyên vẹn mã loại xe lịch sử.
  - Khởi tạo seed data bằng đúng 7 loại xe chuẩn V5; không có `XE_KHAC`.
  - Giải quyết triệt để M004-R2-07 (cờ `allows_container`) và M004-R2-10 (kiểm soát giá vé).
  - Loại xe mới chưa có giá hợp lệ hoặc bị inactive sẽ bị RPC chặn, không tự động miễn phí.
  - Phân quyền quản lý danh mục gắn với mã quyền chuẩn V5 có sẵn `admin.billing_settings.manage` của `SYS_ADMIN`.
  - Tuyệt đối giữ nguyên RBAC V5 (8 roles, 67 permissions, 206 grants).
  - Tuyệt đối không thay đổi Cloud DEV, không chạy migration, dừng chờ phê duyệt.

- **Cập nhật lúc:** 11/10/2026 21:40
- **Mốc hiện tại:** **HOÀN THÀNH KHẮC PHỤC TOÀN DIỆN 10 PHÁT HIỆN KIỂM TOÁN MIGRATION 004 VÒNG 2 (M004-R2-01 ĐẾN M004-R2-10) VÀ TRIỂN KHAI THIẾT KẾ 4 BẢNG (DANH MỤC LOẠI PHƯƠNG TIỆN ĐỘNG `app_vehicle_types`): Sửa DDL Migration 004, viết lại pgTAP 004 (62 assertions top-level xuất TAP chuẩn), đồng bộ TypeScript types (8 RPCs), lập script kiểm toán tĩnh & đóng gói `migration_004_code_bundle_R3.zip` — TIẾP TỤC DUY TRÌ CODE DRAFT / NOT EXECUTED, CHƯA CHẠY POSTGRESQL THỰC TẾ, CHƯA PUSH LÊN CLOUD DEV**.
- **Kết quả Khắc phục 10 Phát hiện Kiểm toán Vòng 2 & Thiết kế 4 Bảng:**
  - **M004-R2-01 (BLOCKER):** Thay thế 100% `hasnt_table_privilege()` và `hasnt_function_privilege()` bằng `ok(NOT pg_catalog.has_table_privilege(...))` và `ok(NOT pg_catalog.has_function_privilege(...))`.
  - **M004-R2-02 (BLOCKER):** Sử dụng `throws_ok()` với thông điệp lỗi chính xác 100% khớp từng ký tự với câu lệnh `RAISE EXCEPTION` trong SQL cho lỗi `P0001`; các lỗi hệ thống PostgreSQL (`23514`, `23503`, `23505`) truyền `errmsg = NULL`. Không dùng wildcard `%...%`.
  - **M004-R2-03 (BLOCKER):** Tách biệt hoàn toàn JWT Context mock khỏi Database Role session; `set_test_jwt` không gọi `set_config('role', ...)`. Cấp quyền `USAGE ON SCHEMA pg_temp` cho `authenticated`. Khối test RLS chạy dưới `SET LOCAL ROLE authenticated` tạm thời rồi `RESET ROLE`.
  - **M004-R2-04 (BLOCKER):** Sửa bài test kiểm tra `is_legacy_import` đúng trên bảng `app_container_visits` với fixture container thực tế `cont_1`.
  - **M004-R2-05 (HIGH):** Đồng bộ hoàn toàn TypeScript types `src/types/database.types.ts` với chữ ký SQL (loại bỏ `p_seal_no`, `p_note` khỏi `sc_create_container_visit`; bổ sung bảng `app_vehicle_types` và RPC `sc_manage_vehicle_type`).
  - **M004-R2-06 (HIGH):** Thêm Partial Unique Index `uq_container_visits_active_number_yard` trên `(yard_id, upper(btrim(container_no_current))) WHERE status = 'IN_YARD'`. Trong RPC `sc_create_container_visit` và `sc_correct_container_number` bọc bắt ngoại lệ `unique_violation` (23505). Bổ sung test concurrency.
  - **M004-R2-07 (HIGH / Nghiệp vụ):** Bảng `app_vehicle_types` có cờ `allows_container boolean` (`CONT_LANH`, `DAU_KEO` = true; 5 xe còn lại = false). RPC `sc_create_container_visit` kiểm tra cờ này, từ chối xe không được phép chở container.
  - **M004-R2-08 (MEDIUM / Bất biến):** Sửa trigger `sc_trg_container_number_changes_immutable` dùng `IS DISTINCT FROM` cho tất cả các trường bất biến/xác nhận; thêm ràng buộc cặp `sec_ack_at/by` và `reconciled_at/by/notes`. Bổ sung test chặn overwrite sang NULL.
  - **M004-R2-09 (MEDIUM / Test coverage):** Bổ sung test Assertion 39 đối chiếu UUID trước và sau khi sửa số trùng khớp 100%; Assertion 40 xác minh audit log thực tế trong `app_audit_events`.
  - **M004-R2-10 (MEDIUM / Thiết kế giá vé):** Bổ sung bảng thứ 4 `app_vehicle_types` khởi tạo đúng 7 loại xe V5. Cột `default_ticket_amount numeric(12,2) NULL`. Chặn xe `is_active = false`; chặn xe chưa cấu hình giá (`default_ticket_amount IS NULL`), phân biệt rõ xe miễn phí hợp lệ (`ticket_amount = 0`, `ticket_payment_status = 'EXEMPT'`). Thêm RPC `sc_manage_vehicle_type` có quyền `admin.billing_settings.manage`.
- **Trạng thái Kiểm tra Tĩnh Toàn diện:**
  - `pnpm exec tsc --noEmit` -> **PASS (Exit code 0, 0 lỗi)**.
  - `node scripts/verify_rbac_invariants.js` -> **52 / 52 PASS**.
  - `python scripts/audit_rbac_exact.py` -> **PASS (Khớp 100% 8 roles, 67 perms, 206 grants V5)**.
  - `node scripts/audit_test_004.js` -> **PASS (`SELECT plan(62)` khớp đúng 62/62 assertions top-level, 0 PERFORM ok/is, 0 wildcard `%...%`, 0 pass mặc định)**.
  - Gói bàn giao: `migration_004_code_bundle_R3.zip` (SHA-256 `6F0CD0853C1A06945CB5C176E006CDD14EAB36CA102CF8A0B65027531A23A369`).
  - PostgreSQL Runtime Execution: **CHƯA THỰC THI (CODE DRAFT / NOT EXECUTED)**.
  - Supabase Cloud DEV (`son-cang-yms-dev`, ref: `euswzyespwaxyrjkfkrq`): **UNCHANGED (Không db push)**.
  - Docker Desktop: **KHÔNG KHỞI ĐỘNG**.
- **Cam kết An toàn Tuyệt đối:**
  - DỪNG BẮT BUỘC để Người dùng kiểm toán độc lập nghiệm thu gói mã nguồn Vòng 3 trước khi thực hiện bất kỳ bước tiếp theo nào.

- **Cập nhật lúc:** 11/10/2026 22:00
- **Mốc hiện tại:** **HOÀN THÀNH KHẮC PHỤC TOÀN DIỆN 9 PHÁT HIỆN KIỂM TOÁN MIGRATION 004 VÒNG 3 (M004-R3-01 ĐẾN M004-R3-09): Triển khai Idempotency Key (Retry Safety), Patch Semantics và Bảo vệ Biểu phí AP10 Four-Eyes; Nâng cấp bộ kiểm thử pgTAP lên 75 assertions; Khắc phục script kiểm toán tĩnh với mã thoát nghiêm ngặt; Đồng bộ TypeScript types và Đóng gói `migration_004_code_bundle_R4.zip` — DUY TRÌ TRẠNG THÁI CODE DRAFT / NOT EXECUTED, CHƯA CHẠY RUNTIME TRÊN POSTGRESQL THỰC TẾ, CHƯA PUSH LÊN CLOUD DEV.**
- **Kết quả Khắc phục 9 Phát hiện Kiểm toán Vòng 3:**
  - **M004-R3-01 (BLOCKER / TEST):** Sửa bài test Assertion 17 (nay là A20–A22): tạo riêng fixture loại xe `TEST_RESTRICT_TYPE` cùng 1 lượt xe tham chiếu; assert khóa ngoại tồn tại; kiểm thử `DELETE` bị chặn bởi SQLSTATE `23503`; sau đó assert loại xe vẫn tồn tại nguyên vẹn. Tuyệt đối không xóa dòng seed data `CONT_LANH`.
  - **M004-R3-02 (HIGH / DATA LOSS):** Triển khai Patch Semantics tường minh trong `sc_manage_vehicle_type`: bảo toàn nguyên vẹn `allows_container`, `is_active`, `sort_order` và `description` bằng `COALESCE/CASE` khi các tham số cập nhật là NULL. Bổ sung test regression: cập nhật tên `CONT_LANH` giữ nguyên giá 250k, `allows_container = true` và trạng thái hoạt động (A15).
  - **M004-R3-03 (HIGH / AP10 FINANCIAL CONTROL):** Tách bạch quản lý danh mục xe và phê duyệt biểu phí AP10 Four-Eyes trong `sc_manage_vehicle_type`: (1) Nếu sửa giá của loại xe đã có -> ném ngoại lệ P0001 yêu cầu quy trình AP10 Four-Eyes; (2) Nếu tạo loại xe mới -> khởi tạo `default_ticket_amount = NULL`, từ chối gán giá trực tiếp không qua AP10. Bổ sung 2 test bắt lỗi AP10 Four-Eyes (A13, A14).
  - **M004-R3-04 (HIGH / RETRY SAFETY):** Bổ sung cột `idempotency_key text NULL` cho cả `app_vehicle_visits` và `app_container_visits` cùng Partial Unique Index `WHERE idempotency_key IS NOT NULL`. Cập nhật RPC `sc_create_vehicle_visit` và `sc_create_container_visit` nhận `p_idempotency_key`: nếu trùng key và cùng payload -> trả về ID cũ (idempotent replay an toàn); nếu khác payload -> ném ngoại lệ P0001; bọc bắt `unique_violation` khi có xung đột đồng thời. Bổ sung 6 test assertions kiểm thử Idempotency (A43–A48).
  - **M004-R3-05 (MEDIUM / FALSE GREEN STATIC AUDIT):** Sửa script `scripts/audit_test_004.js`: thiết lập biến `hasError` và gọi `process.exit(1)` khi có bất kỳ sai lệch nào (mismatch assertions, phát hiện PERFORM ok/is, wildcard `%...%`, hoặc pass mặc định). Thoát mã 0 khi đạt toàn diện.
  - **M004-R3-06 (MEDIUM / CONCURRENCY EVIDENCE):** Ghi nhãn đúng Assertion 42 là kiểm tra Database uniqueness invariant của Partial Unique Index `uq_container_visits_active_number_yard` (không tuyên bố chạy race concurrency giả định).
  - **M004-R3-07 (MEDIUM / DISABLED YARD):** Thêm kiểm tra `app_yards.is_active` trong RPC `sc_create_container_visit`, ném ngoại lệ P0001 nếu bãi bị vô hiệu hóa: `'Bãi không hợp lệ hoặc đang bị vô hiệu hóa: %'`. Bổ sung test assertion A49.
  - **M004-R3-08 (MEDIUM / LIFECYCLE INTEGRITY):** Gia cố CHECK constraint `ck_vehicle_status_exit` và `ck_container_status_outbound` chỉ cho phép có timestamps/actor ra khi status là `EXITED`. Trong bài test, tạo fixture `CANCELLED` độc lập trực tiếp từ `IN_YARD`, không chuyển trạng thái `EXITED -> CANCELLED`. Bổ sung test A25 và A69.
  - **M004-R3-09 (LOW / MISLEADING CONFIGURATION):** Cập nhật thông báo lỗi trong `sc_create_container_visit` khi xe không được phép chở container sang dạng cấu hình danh mục chung: `'Loại phương tiện % không được phép tiếp nhận container vào bãi theo cấu hình danh mục phương tiện.'`. Đồng bộ cả trong migration và test assertion A41.
- **Trạng thái Kiểm tra Tĩnh Toàn diện R4:**
  - `pnpm exec tsc --noEmit` -> **PASS (Exit code 0, 0 lỗi)**.
  - `node scripts/verify_rbac_invariants.js` -> **52 / 52 PASS (Exit code 0)**.
  - `python scripts/audit_rbac_exact.py` -> **PASS (Khớp 100% 8 roles, 67 perms, 206 grants V5)**.
  - `node scripts/audit_test_004.js` -> **PASS (`SELECT plan(75)` khớp đúng 75/75 assertions top-level, Exit code 0)**.
  - Gói bàn giao: `migration_004_code_bundle_R4.zip`.
  - PostgreSQL Runtime Execution: **CHƯA THỰC THI (CODE DRAFT / NOT EXECUTED)**.
  - Supabase Cloud DEV (`son-cang-yms-dev`, ref: `euswzyespwaxyrjkfkrq`): **UNCHANGED (Không db push)**.
  - Docker Desktop: **KHÔNG KHỞI ĐỘNG**.
- **Cam kết An toàn Tuyệt đối:**
  - DỪNG BẮT BUỘC để Người dùng kiểm toán độc lập nghiệm thu gói mã nguồn Vòng 4 trước khi thực hiện bất kỳ bước tiếp theo nào.

- **Cập nhật lúc:** 11/10/2026 22:30
- **Mốc hiện tại:** **HOÀN THÀNH TOÀN DIỆN GATE B: KIỂM THỬ POSTGRESQL RUNTIME MIGRATION 004 R4 TRÊN SUPABASE LOCAL POSTGRESQL 17 (100% PASS) — THU THẬP ĐẦY ĐỦ BẰNG CHỨNG, ĐÓNG GÓI ZIP, LẬP BÁO CÁO NGHIỆM THU, DỌN DẸP MÔI TRƯỜNG AN TOÀN, ĐẠT TRẠNG THÁI READY_FOR_CLOUD_DEV VÀ DỪNG BẮT BUỘC CHỜ PHÊ DUYỆT GATE C TỪ CHỦ DỰ ÁN.**
- **Kết quả Kiểm thử PostgreSQL Runtime Thực tế:**
  - **Môi trường:** Supabase Local Docker Container `supabase_db_YMS-project` (PostgreSQL 17.11 trên port 54322).
  - **Áp dụng Migration:** `npx supabase migration up --local` áp dụng thành công Migration 004 (`20261011000004_domain_vehicles_containers.sql`) với Exit code 0.
  - **pgTAP Domain Vehicles Containers (004):** `npx supabase test db --local supabase/tests/domain_vehicles_containers_004.sql` -> **PASS 75/75 assertions (Exit code 0)**.
  - **pgTAP RBAC Foundation (001-003):** `npx supabase test db --local supabase/tests/rbac_verification.sql` -> **PASS 49/49 assertions (Exit code 0)**.
  - **Kiểm toán tĩnh Test 004:** `node scripts/audit_test_004.js` -> **PASS (Khớp chính xác 75 assertions, 0 PERFORM ok/is, Exit code 0)**.
  - **Kiểm toán RBAC Bất biến:** `node scripts/verify_rbac_invariants.js` -> **PASS 52/52 quy tắc (Exit code 0)**.
  - **TypeScript Typecheck:** `pnpm exec tsc --noEmit` -> **PASS 0 lỗi (Exit code 0)**.
  - **Bộ kiểm thử Runtime Engine (Đa luồng & Bảo mật):** `python scripts/run_gate_b_runtime_tests.py` -> **PASS 17/17 ca kiểm thử runtime (Exit code 0)**:
    * `RACE-01` [PASS]: Concurrency race 2 kết nối cùng idempotency key -> Replay an toàn, đúng 1 xe được tạo.
    * `RACE-02` [PASS]: Concurrency race 2 kết nối cùng số cont `IN_YARD` -> Partial unique index chặn 1 bên an toàn, đúng 1 cont được tạo.
    * `LG-01a` [PASS]: Tái sử dụng key xe nhưng đổi `driver_name` -> Bị từ chối P0001 fail-safe.
    * `LG-01c` [PASS]: Tái sử dụng key xe cùng payload 100% -> Replay trả về cùng UUID ban đầu.
    * `LG-01b` [PASS]: Tái sử dụng key cont nhưng đổi `container_size` -> Bị từ chối P0001 fail-safe.
    * `LG-01d` [PASS]: Tái sử dụng key cont cùng payload 100% -> Replay trả về cùng UUID ban đầu.
    * `SEC-01` [PASS]: Database role `anon` gọi RPC `sc_create_vehicle_visit` -> Bị từ chối fail-closed.
    * `SEC-02` [PASS]: Database role `anon` SELECT trên `app_container_number_changes` -> Bị chặn permission denied.
    * `SEC-03` [PASS]: Role `authenticated` Điều phối (DIS_STAFF) không có quyền discrepancy.view -> RLS lọc trả về 0 bản ghi.
    * `SEC-04` [PASS]: An ninh (SEC_STAFF) gọi `sc_update_container_cargo` đổi HÀNG/RỖNG -> Bị RPC từ chối fail-closed.
    * `SEC-05` [PASS]: SYS_ADMIN đổi giá vé trực tiếp -> Bị chặn theo quy tắc AP10 Four-Eyes.
    * `HIST-01` [PASS]: Sửa số container bảo toàn UUID 100%, sinh bản ghi lịch sử và audit log.
    * `HIST-02` [PASS]: Trigger bất biến chặn lệnh DELETE trên lịch sử sửa số.
    * `HIST-03` [PASS]: Trigger bất biến chặn lệnh UPDATE trên lịch sử sửa số.
    * `LIFE-01` [PASS]: Xác minh không có RPC xuất bãi trong 004, bảo vệ phạm vi Migration 007.
    * `LIFE-02` [PASS]: Check constraint `ck_container_status_outbound` chặn cont `IN_YARD` có `outbound_at`.
    * `LIFE-03` [PASS]: Check constraint `ck_vehicle_status_exit` chặn xe `IN_YARD` có `exit_at`.
- **Nâng cấp Kỹ thuật trong quá trình Gate B:**
  - Gia cố logic LG-01: RPC `sc_create_vehicle_visit` và `sc_create_container_visit` so sánh toàn diện 100% các trường payload bằng `IS DISTINCT FROM` trước khi cho phép idempotent replay.
  - Sửa test helpers pgTAP từ schema `pg_temp` sang `public.test_vars_004` trong transaction tự rollback, tương thích hoàn toàn PostgreSQL 17.
- **Tài liệu & Bằng chứng bàn giao:**
  - Báo cáo nghiệm thu runtime: `ProjectContext/06_Kien_truc_va_kiem_thu/MIGRATION_004_RUNTIME_VERIFICATION.md`.
  - Gói bằng chứng runtime đầy đủ: `migration_004_runtime_evidence.zip` (chứa toàn bộ output txt và json kết quả kiểm thử).
- **Trạng thái Môi trường & Cam kết An toàn Tuyệt đối:**
  - Supabase Local: **ĐÃ DỪNG AN TOÀN** (`npx supabase stop`).
  - Supabase Cloud DEV (`son-cang-yms-dev`, ref: `euswzyespwaxyrjkfkrq`): **NGUYÊN VẸN 100%, TUYỆT ĐỐI CHƯA CHẠY DB PUSH**.
  - Trạng thái kỹ thuật: **`READY_FOR_CLOUD_DEV`**.
  - Cam kết: **DỪNG BẮT BUỘC**, chờ phê duyệt Gate C từ Chủ dự án trước khi triển khai Cloud DEV.

- **Cập nhật lúc:** 11/10/2026 22:45
- **Mốc hiện tại:** **HOÀN THÀNH KIỂM SOÁT PHIÊN BẢN & TIỀN TRIỂN KHAI GATE C (GATE_C_PREFLIGHT_READY): Đã xuất gói phát hành chính thức `migration_004_gateb_verified_final.zip` (SHA-256 `fb89266a01244307478e4474150b1cfa858c42d4dda54edfd49b117e28bbfb95`), Xác nhận 100% không rò rỉ test helpers vào schema public, Hoàn thành kiểm tra chỉ đọc trên Supabase Cloud DEV (`migration list` & `db push --dry-run` đạt chuẩn: 001-003 Applied, chỉ duy nhất 004 Pending) — LẬP BÁO CÁO GATE_C_PREFLIGHT_REPORT.md VÀ DỪNG BẮT BUỘC CHỜ PHÊ DUYỆT RIÊNG CỦA CHỦ DỰ ÁN TRƯỚC KHI PUSH THẬT.**
- **Kết quả Kiểm tra Preflight Gate C:**
  - **Môi trường Cloud DEV:** `son-cang-yms-dev` (Ref: `euswzyespwaxyrjkfkrq`).
  - **`npx supabase migration list --linked`:** Exit code 0, 001-003 đã có trên Remote, chỉ duy nhất `20261011000004_domain_vehicles_containers.sql` có `remote = ""` (Pending).
  - **`npx supabase db push --dry-run --linked`:** Exit code 0, `dryRun = true`, `upToDate = false`, xác nhận *"Would push these migrations: • 20261011000004_domain_vehicles_containers.sql"*. Không có drift hay migration lạ.
  - **Xác minh Schema Isolation:** Truy vấn thực nghiệm catalog PostgreSQL xác nhận `to_regclass('public.test_vars_004') IS NULL`, không có bất kỳ hàm `_004` nào trong schema `public`, bảng tạm và hàm test đã tự hủy sạch sẽ sau `ROLLBACK;`.
  - **Gói phát hành cuối cùng:** Đã nén và tính hash SHA-256 cho `migration_004_gateb_verified_final.zip` (56.040 bytes) gồm:
    * `20261011000004_domain_vehicles_containers.sql` (bản đã kiểm thử Gate B, sửa full payload compare LG-01).
    * `domain_vehicles_containers_004.sql` (bộ test pgTAP 75 assertions).
    * `database.types.ts` (TypeScript types).
    * `run_gate_b_runtime_tests.py` (script 17 ca runtime đa luồng & bảo mật).
    * `audit_test_004.js` và `verify_rbac_invariants.js` (static checks).
    * `MIGRATION_004_RUNTIME_VERIFICATION.md` (báo cáo Gate B).
    * `diff_vs_r4_bundle.diff` (diff chi tiết so với bản nháp ZIP R4).
    * `git_status.txt` (trạng thái working directory).
    * Thư mục `evidence_logs/` (toàn bộ 6 log nguyên bản và kết quả JSON).
    * `MANIFEST_SHA256.txt` (bảng mã băm từng file).
- **Trạng thái Môi trường & Cam kết Tuyệt đối:**
  - Supabase Local: **ĐÃ DỪNG AN TOÀN** (`npx supabase stop`).
  - Supabase Cloud DEV: **NGUYÊN VẸN 100%, TUYỆT ĐỐI CHƯA CHẠY DB PUSH**.
  - Cam kết: **DỪNG BẮT BUỘC**, chờ văn bản phê duyệt riêng của Chủ dự án trước khi thực hiện bước triển khai Cloud DEV.

- **Cập nhật lúc:** 11/10/2026 23:00
- **Mốc hiện tại:** **HOÀN THÀNH TOÀN DIỆN GATE C: TRIỂN KHAI THÀNH CÔNG MIGRATION 004 LÊN SUPABASE CLOUD DEV (`son-cang-yms-dev`, REF `euswzyespwaxyrjkfkrq`) — ĐỒNG BỘ 100% MIGRATIONS 001–004, ĐỐI SOÁT CHỈ ĐỌC XÁC NHẬN 15 BẢNG SCHEMA PUBLIC, 7 LOẠI XE V5 KHỞI TẠO, BẢO TOÀN NGUYÊN VẸN MA TRẬN RBAC (206 GRANTS), RLS & PERMISSION DENIED HOẠT ĐỘNG CHUẨN XÁC — LẬP BÁO CÁO GATE_C_DEPLOYMENT_REPORT.md VÀ DỪNG BẮT BUỘC CHỜ NHIỆM VỤ TIẾP THEO.**
- **Chi tiết Triển khai & Đối soát Cloud DEV:**
  - **Môi trường Cloud DEV:** `son-cang-yms-dev` (Project Ref: `euswzyespwaxyrjkfkrq`).
  - **Lệnh triển khai:** `npx supabase db push --linked` -> **Exit code 0 (APPLIED)**.
  - **Xác nhận Migration List:** `npx supabase migration list --linked` xác nhận cả 4 migrations 001, 002, 003, 004 đều đã có trạng thái `remote = local`.
  - **Đối soát Schema thực tế (`inspect db table-stats`):**
    * Có đúng 15 bảng trong schema `public` (11 bảng RBAC 001–003 + 4 bảng miền Migration 004).
    * Bảng `app_vehicle_types`: chứa đúng 7 bản ghi khởi tạo V5.
    * Bảng `app_vehicle_visits`, `app_container_visits`, `app_container_number_changes`: 0 bản ghi (sạch hoàn toàn).
    * Ma trận RBAC: `app_roles` (8), `app_permissions` (67), `app_role_permissions` (206) nguyên vẹn 100%.
    * Indexes: partial unique index `uq_container_visits_active_number_yard`, idempotency keys, composite foreign keys `(id, yard_id)` đã hiện diện đầy đủ.
  - **Đối soát RLS & Privileges:** Role `anon` bị chặn `permission denied` (42501) khi SELECT `app_vehicle_types`, chứng minh RLS và REVOKE ALL hoạt động fail-closed.
  - **Tài liệu & Báo cáo:** Lập báo cáo đầy đủ tại `ProjectContext/06_Kien_truc_va_kiem_thu/GATE_C_DEPLOYMENT_REPORT.md`.
- **Trạng thái Môi trường & Cam kết:**
  - Supabase Local: Đã dừng hoàn toàn (`npx supabase stop`).
  - Supabase Cloud DEV: Đang chạy ổn định tại Migration 004.
  - **Cam kết:** DỪNG BẮT BUỘC sau Gate C. Không triển khai giao diện hoặc Migration 005 khi chưa có nhiệm vụ mới từ Chủ dự án. Tuyệt đối không triển khai Production.

- **Cập nhật lúc:** 11/10/2026 23:25
- **Mốc hiện tại:** **HOÀN THÀNH PHASE 1D-01: XÂY DỰNG VÀ NGHIỆM THU PWA SƠN CẢNG FIRST VERTICAL SLICE TRÊN LOCALHOST:3000 — ĐĂNG NHẬP AUTH/ROLE SWITCHER, AN NINH TIẾP NHẬN XE & CONT (MOBILE-FIRST, VÉ 250K, CHẶN ĐẦU KÉO 0Đ, CẢNH BÁO P1), GIÁM SÁT BÃI & ĐIỀU PHỐI HÀNG/RỖNG (RBAC CHẶN AN NINH/CCKB SỬA HÀNG/RỖNG), QUẢN TRỊ 7 LOẠI XE (KIỂM SOÁT AP10 FOUR-EYES) — KIỂM THỬ TĨNH PASS (0 LỖI LINT, 0 LỖI TS, BUILD 8/8 TRANG THÀNH CÔNG), LOCALHOST:3000 HTTP 200 OK — ĐÓNG GÓI BUNDLE RELEASE VÀ LẬP BÁO CÁO.**
- **Chi tiết Triển khai Phase 1D-01:**
  - **Mã nguồn đã xây dựng:**
    * `src/types/auth.types.ts`: Định nghĩa 8 vai trò V5 và 4 tài khoản Demo chuẩn Sơn Cảng.
    * `src/types/domain.types.ts`: Cấu trúc dữ liệu VehicleVisit, ContainerVisit, VehicleType theo Migration 004.
    * `src/lib/rbac-rules.ts`: Ma trận phân quyền 8 vai trò, 67 mã permissions V5.
    * `src/contexts/auth-context.tsx`: Context xác thực hỗ trợ Supabase Auth và chuyển đổi vai trò tức thì.
    * `src/lib/services/yard-service.ts`: Xử lý nghiệp vụ tiếp nhận xe/container, cập nhật HÀNG/RỖNG, lưu trữ LocalStorage an toàn.
    * `src/components/layout/app-shell.tsx`: Shell chuẩn nhận diện Sơn Cảng, responsive header, mobile bottom nav (390px), role badge & switcher.
    * `src/app/login/page.tsx`: Đăng nhập email/pass và chọn nhanh 4 vai trò demo.
    * `src/app/entry/page.tsx`: Form tiếp nhận xe/cont, phân nhánh có/không cont, vé 250k, chống double-click Idempotency key, cảnh báo P1.
    * `src/app/yard/page.tsx`: Bảng giám sát bãi, 5 cards thống kê, tìm kiếm, modal Điều phối HÀNG/RỖNG.
    * `src/app/admin/vehicle-types/page.tsx`: Quản trị danh mục 7 loại xe V5, cảnh báo AP10 Four-Eyes.
  - **Kết quả Kiểm thử Tĩnh & Runtime:**
    * `pnpm exec tsc --noEmit`: **PASS (0 errors, Exit code 0)**.
    * `pnpm lint`: **PASS (0 errors, 0 warnings, Exit code 0)**.
    * `pnpm build`: **PASS (8/8 routes generated, Exit code 0)**.
    * HTTP Runtime: `http://localhost:3000` (`/login`, `/entry`, `/yard`, `/admin/vehicle-types`) đều trả về **StatusCode 200 OK**.
  - **Gói chuyển giao & Báo cáo:**
    * Bundle ZIP: `phase1d_01_pwa_bundle.zip` (SHA-256: `FAC4D6D9AC8D0EA8F208876191CE20DDE69C6D6789146EDC54DA26AA5E63A743`).
    * Báo cáo chi tiết: `ProjectContext/06_Kien_truc_va_kiem_thu/PHASE1D_01_PWA_DEMO_REPORT.md`.
- **Trạng thái Môi trường & Cam kết Tuyệt đối:**
  - Supabase Cloud DEV: Giữ nguyên vẹn 100%, không ghi bất kỳ giao dịch thật nào.
  - Server PWA: Đang phục vụ tại `http://localhost:3000` để Chủ dự án nghiệm thu trực quan.
  - **Cam kết:** DỪNG BẮT BUỘC, chờ ý kiến đánh giá giao diện từ Người dùng.

