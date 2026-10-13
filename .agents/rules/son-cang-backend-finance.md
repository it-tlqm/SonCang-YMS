---
trigger: model_decision
description: "Áp dụng khi thiết kế/triển khai hoặc sửa Supabase Auth, PostgreSQL, migrations, RLS, RBAC, tính phí, thu tiền, xuất bãi, audit và giao dịch server của Sơn Cảng."
---

# Quy tắc Backend, dữ liệu và tiền — Sơn Cảng V5

- Luôn đọc `ProjectContext/01_Nghiep_vu_V5/PROJECT_CONTEXT.md`, tài liệu RBAC V5 và nhật ký UAT trước khi can thiệp tính tiền/duyệt xuất.
- `vehicle_visit_id` khác `container_visit_id`. Một container có nhiều phiên điện; một số container có thể xuất hiện ở nhiều lượt theo thời gian. Primary key nội bộ dùng UUID.
- Khởi tạo `reefer_requests` trước xe vào **không** tạo `vehicle_visits`/`container_visits`, phiên điện hay charge.
- Giá cấu hình có phiên bản, giữ snapshot khi phát sinh charge. Điện hai mã `DIEN_CONT_GIO` và `DIEN_CONT_LIEN_TUC` đều 100.000đ/giờ tại baseline V5; thời lượng dương của MỖI phiên làm tròn lên 15 phút. Không tự tạo gói ngày.
- Phí lưu 100.000đ/container/đêm, khung 22:00–06:00, miễn đêm đầu; phí chính thức chỉ chốt tại `GIO_CONT_RA` thực tế. RV01–RV12 có phần cần UAT, không tự chọn phương án chưa duyệt.
- An ninh thao tác điện vật lý/thu vé/phí lưu/xác nhận ra; CCKB nhập giờ điện/thu điện/duyệt điều kiện tài chính; Điều phối cập nhật HÀNG/RỖNG.
- Các giao dịch tiền và chốt xuất cần transaction nguyên tử, idempotency, chống race, audit và phân quyền server/RLS; có debt exception theo quyền và lý do.
- Payment/charge/allocation độc lập; điều chỉnh sau thu không thay thế/xóa giao dịch ban đầu. Không tự phê duyệt đề nghị của chính mình.
- Bảo vệ bucket chứng từ/ảnh riêng tư. Không gửi secret/service-role sang browser. Không tự seed tài khoản với mật khẩu mẫu, không ghi đè grant cấu hình production khi chạy seed.
- Xác minh đủ 67 mã quyền và 206 grants gốc V5 trước khi đánh dấu RBAC đạt; giữ scope SELF/DEPARTMENT/YARD/ALL.
