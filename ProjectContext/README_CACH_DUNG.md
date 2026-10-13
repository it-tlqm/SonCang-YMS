# CÁCH DÙNG `ProjectContext` TRONG ANTIGRAVITY

1. Giải nén gói **ngay tại thư mục gốc (workspace/repository) dự án Sơn Cảng**, để thấy `AGENTS.md`, `.agents/rules/` và `ProjectContext/` cùng cấp.
2. Mở đúng thư mục gốc đó trong Antigravity; nếu workspace có sẵn `AGENTS.md` hoặc rules, **hợp nhất nội dung**, không ghi đè bỏ chỉ dẫn đã có.
3. Giao prompt đầu tiên: “Đọc AGENTS.md và ProjectContext/00_START_HERE.md, kiểm tra repo hiện tại; chỉ báo cáo kế hoạch Phase 0, không tự kết nối production.”
4. Khi cần tạo migration/RBAC, Antigravity phải đọc workbook V5 tab 19–28 và guide RBAC. Không chạy SQL draft trực tiếp trên production.
5. Sau mỗi lần làm việc, yêu cầu agent cập nhật `05_Nhat_ky_du_an/CURRENT_STATUS.md`, `WORK_LOG.md` và danh mục vấn đề/decision. Đưa các file này vào Git để phiên sau luôn có lịch sử.
6. Không đưa `.env.local`, private keys, user mật khẩu, client data thực hoặc tài liệu nội bộ chứa bí mật vào Git public.

**Quan trọng:** `ProjectContext` lưu hồ sơ/bộ nhớ tiến độ; `AGENTS.md` và `.agents/rules/` giúp Antigravity tự áp dụng chỉ dẫn ở workspace. Tài liệu lớn vẫn phải được đọc đúng tác vụ; kiểm tra trạng thái file mỗi lần, không suy đoán từ chat.
