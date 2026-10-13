# STITCH DESIGN CONTEXT — PWA Bãi Sơn Cảng

**Mục đích:** Tài liệu nghiệp vụ rút gọn CHỈ để Google Stitch thiết kế UI/UX, không phải spec thực thi SQL/Backend.  
**Áp dụng cùng:** `DESIGN.md` (Design System của Công ty Cổ phần Tà Lùng Quang Minh).  
**Phiên bản nguồn:** `PROJECT_CONTEXT.md` V5, bảng quyền RBAC V5, bộ 117 câu trả lời, cập nhật mới nhất 11/10/2026.  
**Lưu ý:** Quyết định mới nhất ưu tiên hơn đoạn giải thích cũ. Tất cả các mockup dùng **Light Mode only**, nhãn tiếng Việt, responsive phone/tablet/desktop.

## 1. Product goal

Design a unified **Website + PWA** for Bãi Sơn Cảng, operated under Công ty Cổ phần Tà Lùng Quang Minh. It will replace an AppSheet workflow only after UAT and migration. The primary users are field gate security (mobile first), CCKB business staff (tablet/desktop/mobile), Dispatch/Điều phối (tablet/desktop/mobile), team leaders, and administrators.

Avoid website-marketing designs: this is an **internal operational tool** used many times per day with real financial and gate-control workflows.

## 2. Users and visibility (seven active roles)

| Role ID | Nhãn hiển thị | Primary workflows |
|---|---|---|
| `SEC_STAFF` | Nhân viên An ninh | Xe vào/ra, vé vào, phí lưu container khi thực ra, yêu cầu điện dự kiến cần chú ý, xác minh và sửa sai số container, báo thực hiện cắm/rút |
| `SEC_LEAD` | Trưởng BP An ninh | Các nghiệp vụ An ninh + giám sát, xử lý ngoại lệ thuộc An ninh |
| `PORT_STAFF` | Nhân viên CCKB | Tạo điện dự kiến trước cont vào; nhập/sửa giờ cắm/rút; thu điện; duyệt tài chính cho xuất có xử lý nợ/cảnh báo; xử lý thông báo sai số cont |
| `PORT_LEAD` | Trưởng BP CCKB | Các nghiệp vụ CCKB + duyệt sửa tiền/giờ sau thu, theo dõi thu/đối soát |
| `DIS_STAFF` | Nhân viên Điều phối | Ghi HÀNG/RỖNG hoặc tạm để trống, tra container |
| `DIS_LEAD` | Trưởng BP Điều phối | Giám sát, duyệt sửa thông tin Điều phối sau khi ra |
| `SYS_ADMIN` | Quản trị | Người dùng, role, ma trận quyền, mức phạm vi, bảng giá, nhật ký, cấu hình |

`ACCOUNTING_FUTURE` là role dự phòng **chưa kích hoạt V1**. UI demo phải dùng menu theo role; không thể hiện vai trò của người khác như quyền được dùng của nhân viên hiện tại.

## 3. Chính sách không được vẽ sai

### Xe và lượt container là hai hồ sơ độc lập

- Xe có thể vào mang container A rồi ra không mang container; container A tiếp tục nằm trong bãi và tiếp tục được theo dõi.
- Đầu kéo không cont vào có vé 0đ, khi ra kéo cont không tự cộng thêm 250.000đ vé.
- Một xe có thể ra kéo container khác với lúc vào; UI phải đối chiếu `lượt container` riêng, không tự thay container theo chuỗi tương tự.
- Xe bo 3 bánh có vé 40.000đ nhưng không bắt buộc nhập biển số; sử dụng ID lượt xe duy nhất.
- Container có mặt trong bãi được tính đêm lưu, dù có hạ xuống nền bãi hay vẫn nằm trên xe.

### Phí lưu container

- Hiển thị `GIO_CONT_VAO` và `GIO_CONT_RA` rõ ràng; **chỉ tính/chốt phí lưu container khi container thực sự ra bãi**, dựa trên hai mốc này.
- Khung 22:00–06:00, miễn 01 đêm đầu, giá hiện hành 100.000đ/container/đêm.
- **Không có “khóa phí lưu” trước 22:00, không có bảo lưu phí lưu vì khách đã rút điện hoặc CCKB đã xác nhận tài chính.**
- **An ninh chốt giờ ra và thu phí lưu container**. CCKB kiểm tra tài chính, có thể duyệt xuất ngoại lệ còn công nợ; đánh dấu khoản còn nợ chứ không giả đã thu.

### Cắm điện container lạnh

- CCKB có thể nhận yêu cầu dự kiến cho container A/B/C **trước khi xe/container vào bãi**; mỗi container có một phiếu yêu cầu và có thể nhiều phiên cắm/rút. Dự kiến không tự tạo giờ vào, không tính tiền điện/lưu.
- Khi An ninh ghi container vào, giao diện cảnh báo yêu cầu điện dự kiến; tra cứu theo **số đủ / 7 số cuối / số gần giống** và bắt buộc **chọn xác nhận thủ công** trước khi liên kết.
- An ninh cắm/rút **ngoài hiện trường**, thường thông báo lại qua Zalo/nhóm kèm ảnh/video thời gian nếu có. **CCKB mới là bộ phận nhập/sửa `GIO_CAM_THUC_TE` và `GIO_RUT_THUC_TE`**; cho phép nhập sau khi thực tế đã diễn ra.
- Mỗi phiên điện tính độc lập: thời gian thực tế, `làm tròn lên từng 15 phút` tự động. Đơn giá hiện tại 100.000đ/giờ cho cả `Theo giờ` và `Cắm liên tục`. CCKB có thể điều chỉnh có lý do/nhật ký; chỉnh sau khi đã thu cần quy trình phê duyệt, không ghi đè tiền đã thu.
- Tiền điện chốt số giờ khi **rút điện thực tế**, có thể thu ngay hoặc cộng vào bước thanh toán khi container xuất. **KHÔNG nhầm thời điểm chốt tiền điện với phí lưu container.**

### Sửa sai số container và bằng chứng

- Khách hoặc hiện trường có thể báo sai mã container. An ninh cần nút `Sửa số container`, hiển thị mã trước/sau, lý do, ảnh/video nếu có và cảnh báo gửi về CCKB đối chiếu.
- Nếu không có ảnh/video phải ghi lý do; việc sửa giữ nguyên ID lượt container, các phiên điện và giao dịch thanh toán đã lưu. Không tự gộp lượt trùng, không tự chọn gần giống.

### Cho container ra: kiểm soát tài chính ≠ ra thực tế

- **CCKB xác nhận điều kiện tài chính**: xem tiền điện chưa thu, các khoản cần xử lý; có thể xác nhận cho ra khi còn khoản chưa thu theo quyền, với cảnh báo rõ và lý do.
- **An ninh là người kiểm tra thực tế, ghi giờ cont ra, tính phí lưu và thu phí lưu**, sau đó xác nhận ra cổng.
- Nếu PWA còn `Đang cắm` nhưng thực tế đã rút: phải xác minh/rà soát cập nhật, không tự đánh dấu đã rút và không cho container đang gắn điện vật lý rời đi.
- Bảo toàn sự phân biệt: `Được phép ra`, `Đã thanh toán`, `Đã ra thực tế`.

## 4. Information architecture — suggest these screens

**Role-aware navigation**, not an all-roles omniscient sidebar. Stitch screens may include a designer's role context label but production should not allow changing privileges through a UI selector.

| Screen / group | Key content and actions |
|---|---|
| `00_Design_System_Preview` | Colors, typography, buttons, status badges, forms, table/cards, nav and responsive examples |
| `01_Tong_quan` | Role-specific KPI dashboard: vehicles/containers in yard, planned plugs, active sessions, pending payments/clearances and relevant alerts |
| `02_An_ninh_Xe_vao` | One-hand fast entry form for car/truck + container conditional field + anticipated plug alert + ticket collected |
| `03_An_ninh_Xe_ra` | Verify vehicle + correct container visit, CCKB clearance, check electrical physical status, input actual exit time, compute & collect storage fee |
| `04_Danh_sach_Container` | Search full/last 7, live in-yard status, detail card, HÀNG/RỖNG where available, separate vehicle relationships |
| `05_CCKB_Dien_du_kien` | Register container requests before arrival, planned list, pending/unmatched/arrived, review incorrect codes |
| `06_CCKB_Quan_ly_dien` | Electricity requests, each plug/unplug session, editable actual time, real duration, billed duration, payment now/later |
| `07_CCKB_Thanh_toan_Duyet_ra` | Electricity payments, partial payment, unpaid debt warnings, finance clearance with manual exception reason |
| `08_Dieu_phoi_Hang_Rong` | Container list with HÀNG/RỖNG/Chưa xác định action, filters, timestamps |
| `09_Bao_cao` | Revenue by role/service/shift, fee pending, discrepancies, export by permission |
| `10_Quan_tri_Phan_quyen` | 7 active roles, user assignment, scopes SELF/DEPARTMENT/YARD/ALL, permission matrix, audit |
| `11_Quan_tri_Bang_gia` | Separate tariff codes, start date/effective version, editable via authorized UI |
| `12_Doi_chieu_so_cont` | Number before/after, evidence photos/video placeholders, CCKB acknowledgment/queue |

**First generation only:** Design `00_Design_System_Preview` plus **`01_Tong_quan` for An ninh** in desktop, tablet and mobile. Do not attempt all screens in first Stitch generation.

## 5. UI copy and demo data safeguards

- Vietnamese throughout (e.g., `Xe đang trong bãi`, `Container đang lưu`, `Có yêu cầu điện dự kiến`, `Đang cắm`, `Chờ CCKB đối chiếu`, `Phí lưu container`, `Tiền điện chưa thu`).
- Numeric and dates in Vietnamese locale: `100.000đ`, `11/10/2026 08:30`. No USD or US date style.
- Use obviously synthetic data: `ABCU1234567` (minh họa), `11A-123.45`, `Cont A/B/C`; label demo, do not show real personal info or secret credentials.
- Design for empty, loading, confirmation, error, debt warning, mismatch, disconnected and successful states.
- Never imply Stitch mockups actually perform calculations or persist money: these are visual prototypes only.

## 6. Responsive and interaction constraints

- **Light Mode only**, as defined in `DESIGN.md`. Mobile 390px, tablet portrait 820px, tablet landscape 1024px, desktop 1440px.
- An ninh: large search, big action buttons, compact cards, bottom navigation, quick photo/video evidence entry.
- CCKB: split-view lists/detail, datetime edit, 15-minute rounding breakdown, cashier panel; on phones use ordered multi-step form rather than a squeezed grid.
- Điều phối: fast HÀNG/RỖNG update, no finance-edit UI.
- Table-to-cards on mobile must retain all critical payment and identity fields; support touch, no hover-only actions.

## 7. Source-of-truth and exclusions

Priority: latest user decisions in this conversation > `PROJECT_CONTEXT.md` V5 > approved V5 RBAC Excel > 117 answered questions > older V4 discussion. Do NOT use historic `L04` interpretation about locking storage fee before 22:00; it is explicitly superseded.

Out of V1: electronic invoice issuing (only collect info for future accounting), QR/printed ticket automation, auto Zalo integration, live power socket IoT, heavy 3D yard map, full refund/discount management. Do not add as if implemented.

Design and technical implementation are separate: **Stitch defines UI; backend/RBAC/ledger/API are built in Supabase/Antigravity later**. This context is intentionally trimmed to prevent backend SQL details from polluting UI generation.
