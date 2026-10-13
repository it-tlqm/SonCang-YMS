# QA bàn giao UI 09 — Điều phối HÀNG/RỖNG

Ngày: 11/10/2026  
Dự án: Website/PWA Quản lý bến bãi Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
Nguồn: HTML Google Stitch do người dùng cung cấp (`Pasted text(20261011-083531).txt`).

## 1. Quyết định nghiệm thu

**CHẤP NHẬN CÓ ĐIỀU KIỆN — làm tham khảo UI/UX; KHÔNG nhận mã giao dịch/client JS làm code production.**

- Đã nhận đúng 2 mẫu Desktop 1440px và Mobile 390px.
- Hỗ trợ ba trạng thái `HÀNG` / `RỖNG` / `CHƯA CẬP NHẬT`, với `CHƯA CẬP NHẬT` không tự suy luận `RỖNG`.
- Luồng A: xe vào có container, xe ra trước, container vẫn lưu bãi.
- Luồng B: đầu kéo vào không container (vé 0đ) lấy container đã có, nhưng Điều phối không thực hiện ghép lượt xe/gate exit.
- Luồng C: trạng thái hàng hóa chưa xác định không tự chặn ra.
- Giao diện có tìm kiếm, lọc, Master–Detail, lựa chọn trạng thái, lịch sử; hai quyền được hiển thị là `container.visit.read`, `container.cargo.update`.
- Tổng KPI minh họa 14 + 7 + 3 = 24 đúng về số học; không phải dữ liệu Supabase.

## 2. Những lỗi phải loại khi viết Next.js

| Ưu tiên | Sai lệch xác minh từ HTML | Chỉ dẫn cho Antigravity |
|---|---|---|
| **P0** | Mobile có `setTimeout()` tự báo **“Đã ghi nhận thành công”** sau khi bấm xác nhận, không có API/backend | Chỉ hiển thị thành công sau RPC trả kết quả và RLS/RBAC pass; không kế thừa handler này. |
| **P1** | Mobile Header `fixed top-0` + `<main>` dùng `pt-16`, trái báo cáo `sticky normal flow` | Dựng App Shell React chung; kiểm thử viewport/safe area, không sao CSS nguyên bản. |
| **P1** | `CMAU 8830190`: Desktop hiển thị lượt `CV-20261011-0089`, loại `20'GP`, còn Mobile hiển thị `CV-20261011-0062`, loại `20'RF` | Một nguồn DB duy nhất, dữ liệu thuộc đúng `container_visit_id`; không suy luận theo số container. |
| **P1** | Ở Desktop, bảng “Xe đưa vào/Giờ” chứa đầu kéo **14C-871.22** vào rỗng để *lấy cont ra* (kịch bản B); nhãn khiến hiểu nhầm là xe đã đưa container vào | Tách `xe đưa container vào` và `xe đến kéo container ra` / lượt xe liên quan. Quan hệ lượt xe/cont rõ khóa. |
| **P1** | Desktop đang hiển thị HÀNG, radio HÀNG và audit đã đổi sang HÀNG lúc 10:15, nhưng hộp xem trước vẫn “CHƯA CẬP NHẬT → HÀNG” | Lấy trạng thái trước từ DB và trạng thái mới từ form; hiển thị đúng delta thực tế, không hardcode. |
| **P1** | Desktop/Mobile có dữ liệu loại cont không nhất quán: `TCKU 9283417` Desktop `40'HC`, Mobile `40'RF` | Gộp mock seed nhất quán nếu dùng khi phát triển; không lấy dữ liệu ví dụ làm sự thật. |
| **P1** | Chỉ dẫn Desktop “hệ thống tạo tự động khi xe quét thẻ qua barie Cổng In 01” | V1 không tích hợp nhận diện/thẻ barie tự động; ghi cổng theo hành động nhân viên với backend confirmation. |
| **P1** | Mobile có nút **Quét mã QR**, chưa thuộc V1 | Ẩn hoặc loại bỏ; không tự thêm camera/OCR/QR. |
| **P2** | Có “Trực tuyến”, hostname giả `TLC-PRD-01`, “Đồng bộ 02 phút trước”, KPI sức chứa `78%` | Không mô phỏng trạng thái online/realtime, máy chủ hoặc công suất bãi khi chưa có dữ liệu và phạm vi nghiệp vụ. |
| **P2** | Mobile thêm ảnh “Zone RF-02 • 18 Vị Trí”, Desktop thêm vị trí `Bãi R-04`, `G-02`, `T-01`; bãi chưa xác nhận quản lý vị trí chi tiết trong V1 | Ẩn các vị trí số hóa giả định; `YARD_SLOT_MANAGEMENT_ENABLED=false`. |
| **P2** | Mobile input tìm kiếm `inputmode="numeric"` nhưng placeholder hứa tìm cả mã container đầy đủ dạng 4 chữ + 7 số | Dùng text input hỗ trợ cả chữ và số; vẫn có gợi ý/tìm 7 số cuối. |
| **P2** | Token Tailwind Mobile `primary-fixed: "dbe1ff"` thiếu `#` | Không copy nguyên cấu hình Stitch; sử dụng design tokens Next.js chuẩn. |
| **P2** | Phân khu vị trí và tên vai trò/ca/người dùng hardcode | Thông tin người cập nhật, thời điểm, quyền, scope phải do Auth/DB trả về. |

## 3. Kiểm soát dữ liệu liên phân hệ

Một lượt `MSKU 7894561 / CV-20261011-0054` ở giao diện 09 ghi giờ container vào ngày **11/10 lúc 08:30**; trong mẫu 07–08, một phiên điện cùng hồ sơ mẫu lại bắt đầu từ **10/10 lúc 14:40**. Đây là mâu thuẫn dữ liệu demo giữa hai phân hệ nếu coi là cùng lượt. **Không chuyển các mẫu độc lập thành test fixture chung khi chưa chuẩn hóa timeline**. Các khoản tiền 07–08 chỉ là ví dụ khác thời điểm.

## 4. Quy định triển khai

- Khóa nội bộ là UUID bất biến `container_visit_id`; `CV-YYYYMMDD-XXXX` chỉ nên là mã đọc dễ hiểu nếu ứng dụng cần, không thay UUID.
- Backend kiểm tra `container.cargo.update` và scope phù hợp trước khi cập nhật; `container.visit.read` chỉ cho phép xem.
- Trạng thái chưa xác định cần thể hiện rõ, không ép `RỖNG`; không lấy trạng thái hàng hóa làm chốt chặn ra bãi trái V5.
- Khi thay đổi ghi audit `container_visit_id`, giá trị trước/sau, actor, thời điểm server và ghi chú/lý do theo quy định.
- Điều phối **không** sửa số container, phí, giờ cổng, thanh toán, xác nhận tài chính hay lượt xe ra.
- Không hiện “Đã cập nhật” khi chỉ đổi local state/offline; chỉ xác nhận khi server lưu thành công.
- Lịch sử phải phản ánh sự kiện thật từ audit backend, không giả lịch sử.
- Phối hợp Phase 1A–1B Antigravity nhưng **không sửa scope Backend được phê duyệt** để làm màn hình 09 sớm.

## 5. Tiêu chí hoàn tất giai đoạn Stitch

Bộ mockup 01–09 dùng **tham khảo bố cục**, không coi là hệ thống đã vận hành hoặc hoàn thiện 100%.
Từ thời điểm này dừng tạo mẫu Stitch mới theo kế hoạch; nếu thiếu UI trong khi phát triển, Antigravity tự xây Next.js + shadcn/ui với DS-01.

**Kết quả tiếp theo:** Phase 1A (Next.js scaffold), 1B (Auth/RBAC/RLS), 1C (bảng giá + core visits), sau đó kết nối Frontend từ nghiệp vụ cổng vào và Điều phối.
