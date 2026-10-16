# Quy tắc làm việc cho Antigravity — Sơn Cảng (bắt buộc)

Đây là dự án **Website + PWA quản lý bến bãi Sơn Cảng** thuộc Công ty Cổ phần Tà Lùng Quang Minh. Toàn bộ tài liệu dự án đặt tại `ProjectContext/`.

## Khi bắt đầu MỖI phiên làm việc / nhận tác vụ

1. Đọc `ProjectContext/00_START_HERE.md`.
2. Đọc `ProjectContext/01_Nghiep_vu_V5/PROJECT_CONTEXT.md` (V5) và phần liên quan tới tác vụ.
3. Đọc `ProjectContext/05_Nhat_ky_du_an/CURRENT_STATUS.md` cùng `OPEN_DECISIONS_UAT.md`.
4. Nếu liên quan Auth/RBAC/ghi tiền: tra **workbook V5 thật**, đúng các tab 19–28, và `02_RBAC_V5/HUONG_DAN_TRIEN_KHAI_RBAC_PWA_SON_CANG.md`.
5. Nếu xung đột nguồn: quyết định mới nhất được người dùng xác nhận > context V5 + RBAC V5 > câu trả lời V3 > V4 lịch sử > giao diện Stitch > suy đoán. Không tự gán trạng thái CHỐT cho các mục UAT còn mở.

## Không được làm

- Không tự đổi quy trình nghiệp vụ theo JavaScript/copy demo từ Google Stitch. Stitch **chỉ tham khảo UI/UX**, không phải Backend hay dữ liệu thật.
- Không hardcode vai trò/giá, không dùng số container làm khóa chính, không gộp lượt xe và lượt cont, không khóa phí lưu trước khi cont ra thực tế.
- Không tự ghi `Đã thu`, `Đã xuất`, `Đã duyệt` trước phản hồi giao dịch của máy chủ; offline chỉ nháp.
- Không tự động sửa/gộp container theo 7 số cuối, check-digit hay fuzzy match.
- Không dùng service-role key ở client; không bỏ RLS/RBAC server để làm nhanh; không xóa/ghi đè khoản thu đã xác nhận.
- Không tự đưa chức năng QR/ANPR/IoT/in vé/hóa đơn điện tử/Zalo API vào V1.
- Không tạo migration production, thay cấu hình production hay nhập dữ liệu thật nếu chưa được phép.

## Trước khi hoàn tất tác vụ

- Kiểm tra build/test trong môi trường thực tế có sẵn, ghi rõ CHƯA CHẠY nếu chưa thể chạy; không tuyên bố hoàn tất bằng lời.
- Cập nhật `ProjectContext/05_Nhat_ky_du_an/CURRENT_STATUS.md` và bổ sung `WORK_LOG.md` với file đã sửa, test đã chạy, lỗi còn mở, bước tiếp.
- Mọi quyết định mới được người dùng chốt phải ghi `DECISION_LOG.md` (ngày, nội dung, nguồn/đối chiếu, tác động); mục chưa chốt thêm vào `OPEN_DECISIONS_UAT.md`.
- Báo cáo bằng tiếng Việt, theo mức độ thực hiện thật/đề xuất/chưa xác minh. Tên nghiệp vụ là **Phần mềm quản lý bến bãi/cảng cạn**, không dùng từ “BOS”.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
