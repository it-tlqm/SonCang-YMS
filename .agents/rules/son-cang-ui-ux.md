---
trigger: model_decision
description: "Áp dụng khi xây Next.js/React/PWA components, App Shell, form và responsive cho An ninh, CCKB, Điều phối hoặc Quản trị Sơn Cảng."
---

# UI/UX thật, KHÔNG sao chép JavaScript Stitch

- `ProjectContext/04_UI_Stitch_tham_khao/DESIGN.md` và `STITCH_DESIGN_CONTEXT.md` chỉ làm **mẫu thị giác/luồng**, không phải mã triển khai chuẩn.
- Light Mode. #0A9444 (xanh lá), #223873 (navy), #087C3C (CTA), #F5F8FA (nền), #FFFFFF (card), #E3E8EF (viền), Be Vietnam Pro.
- Dùng cùng App Shell thống nhất: header không che nội dung, navigation theo quyền thật, accessibility; mobile 390, tablet dọc 820, tablet ngang 1024, desktop 1440. Không chặn zoom.
- Form không tự đánh dấu thu tiền/chốt xuất/phê duyệt. Nút làm thay đổi dữ liệu phải gọi API/RPC hợp lệ, hiển thị loading/error/server-confirmed và chống click trùng.
- Tìm container theo đủ mã và 7 số cuối, nhận diện sai số và trùng; CHỈ ghép lượt sau xác nhận thủ công theo ID phù hợp. Thuật toán ISO 6346 phải kiểm thử thật, không tin ví dụ trong mockup Stitch.
- Không thiết kế quyền user qua role selector demo; quyền lấy từ permission registry và API/RLS. Mọi tên quyền phải tồn tại trong workbook V5.
- Ẩn hoặc disabled rõ lý do cho tính năng giai đoạn sau: QR, nhận diện biển số, điều khiển barie, máy in vé, IoT ổ cắm, ký số, hóa đơn điện tử, Zalo API.
