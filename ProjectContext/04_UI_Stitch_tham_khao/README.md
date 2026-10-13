# STITCH CHỈ DÙNG ĐỂ THAM KHẢO UI/UX

Tài liệu `DESIGN.md` và `STITCH_DESIGN_CONTEXT.md` là gợi ý layout, tone màu, interaction, responsive. KHÔNG coi thành phẩm của Stitch là mã nguồn ứng dụng đã chạy.

**Mức tiến độ UI theo cuộc trao đổi đến 11/10/2026:** nhóm 00/01 nền tảng và An ninh tổng quan; 02 Xe vào; 03 Xe ra; 04 CCKB tổng quan; 05 CCKB yêu cầu điện đã có mẫu. 06 CCKB phiên điện mới có prompt chứ chưa xác minh đã tạo; 07–09 dự kiến. Chưa có bằng chứng Antigravity đã build hoặc kết nối Backend thật.

**Cảnh báo từ kiểm tra HTML mẫu 05:** Mobile có mô phỏng gói cắm liên tục 2.200.000đ/ngày (SAI; cả hai mã giá hiện tại 100.000đ/giờ), mẫu không đáng tin về ISO 6346/check-digit, có nút tự thay mã cont, quét mã và JavaScript giả lập lưu thành công. Một vài trường bắt buộc ETA/nhiệt độ chưa được chốt, có giả định trụ/ổ điện. Dữ liệu cùng mã phiếu ở các kích thước chưa nhất quán. Bỏ các thao tác giả và triển khai lại dựa trên V5 + Backend thực.

Hai file `QA_Snapshot_20261011.md`, `Screen_Manifest_Snapshot_20261011.json` là **snapshot lịch sử của gói Stitch CŨ trước khi hoàn tất 05**, chỉ tham khảo quy trình rà soát, KHÔNG dùng làm manifest đầy đủ của bản giao cuối. Trước khi xuất mockup mới cần chọn phiên bản chính thức và loại mẫu trùng/trống.

Responsive production: mobile 390, tablet portrait 820, landscape 1024, desktop 1440; trải nghiệm từng thiết bị khác nhau dù chung component. Màn hình Desktop/Mobile tham khảo không được trở thành lý do bỏ tablet.

Nếu bổ sung mẫu Stitch mới, lưu **đường dẫn mockup, thời điểm xuất, trạng thái review và danh sách lỗi** vào `05_Nhat_ky_du_an/CURRENT_STATUS.md`, không kéo toàn bộ mã demo vào code production.
