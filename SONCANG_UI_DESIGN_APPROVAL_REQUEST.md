# TỜ TRÌNH XIN PHÊ DUYỆT THIẾT KẾ GIAO DIỆN UI/UX (ĐIỂM DỪNG 1)
**Kính gửi:** Chủ dự án — Công ty Cổ phần Tà Lùng Quang Minh  
**Đơn vị thực hiện:** Đội ngũ Kỹ thuật Antigravity  
**Ngày trình:** 12/10/2026  
**Văn bản căn cứ:** `SONCANG_UI_UX_REVIEW_FINDINGS_20261012.md` & `SONCANG_AG_STITCH_UI_PILOT_NEXT_20261012.md`

---

## 1. TỔNG QUAN CÔNG VIỆC ĐÃ HOÀN TẤT THEO YÊU CẦU

1. **Khắc phục 100% các tồn tại mức P0:**
   - **Làm sạch ngôn ngữ:** Loại bỏ triệt để các thuật ngữ kỹ thuật (`Supabase`, `Backend`, `RPC`, `RLS`, `RBAC`, `V5`, `PWA`, `YMS`, `AP06`, `AP07`, `Clearance`, `UNPAID`, mã enum/permission) khỏi toàn bộ giao diện nhân viên thao tác.
   - **Tối ưu Mobile Bottom Navigation:** Rút gọn tối đa 3–4 phân hệ được phân quyền + nút "Thêm", chiều cao chuẩn ~64px, có safe-area, tăng đệm `pb-28` chống che khuất nút bấm. Desktop chỉ hiển thị phân hệ có quyền.
   - **An toàn tính phí lưu bãi cổng ra:** Xóa bỏ hoàn toàn việc gán `fee = 0` khi lỗi; khóa cứng nút xác nhận xuất bãi khi chưa có kết quả tính phí hợp lệ, cung cấp nút "Thử tính lại phí".
   - **Chuẩn hóa thương hiệu:** Tiêu đề hệ thống: *"Quản lý bến bãi Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh"*; Banner: *"BẢN MÔ PHỎNG — Dữ liệu dùng thử, không ghi vào hệ thống"*.
2. **Cung cấp đầy đủ bằng chứng thực tế:**
   - **27 ảnh chụp PWA thật:** Chụp từ server đang chạy trên 3 kích thước màn hình (Desktop 1440px, Tablet 1024px, Mobile 390px) theo đúng 4 vai trò có quyền (`SEC_STAFF`, `DIS_STAFF`, `PORT_STAFF`, `SYS_ADMIN`). Form `/entry` có dữ liệu mẫu đầy đủ.
   - **10 ảnh Stitch độ phân giải cao (Full Resolution):** Xuất sắc nét 1440px, 1024px, 390px từ các file HTML đã làm sạch thuật ngữ, không dùng ảnh thumbnail mờ 512px.
   - **Kiểm thử hệ thống:** `npm run build` đạt **PASS 100%** (Exit Code 0), TypeScript kiểm tra 12/12 tuyến đường không có lỗi.

---

## 2. NỘI DUNG ĐỀ XUẤT PHÊ DUYỆT THIẾT KẾ (3 LUỒNG NGHIỆP VỤ TRỌNG TÂM)

Đội ngũ kỹ thuật đề xuất Chủ dự án xem xét và thông qua định hướng thiết kế 3 luồng tác nghiệp chính:

```
[LUỒNG A: AN NINH CỔNG VÀO]
Nhập biển số xe (Trọng tâm) ──► Chọn Có/Không cont ──► (Nếu có) Nhập số cont ──► Chọn phân loại xe/vé ──► Xác nhận nguyên tử

[LUỒNG B: AN NINH CỔNG RA]
Tra cứu xe/cont trong bãi ──► Kiểm tra điều kiện xuất bãi ──► Tự động chốt phí lưu bãi ──► Thu phí tại cổng (nếu có) ──► Cho xe rời bãi

[LUỒNG C: CCKB DUYỆT XUẤT BÃI]
Kiểm soát cắm/rút điện lạnh ──► Thu tiền điện (Chỉ CCKB) ──► Phê duyệt điều kiện xuất bãi (hoặc Bảo lãnh nợ có lý do)
```

1. **Luồng A — An ninh Cổng vào (`/entry`):**
   - Biển số xe là ô nhập liệu trung tâm, tự động viết hoa.
   - Chọn "Có mang cont" mới mở rộng khối thông tin container; chọn "Không mang cont" form thu gọn tối đa.
   - Vé đầu kéo không cont = 0đ; xe có cont = 250.000đ theo quy chuẩn.
   - Nút "Xác nhận vào bãi" lớn (chiều cao ≥ 44px), khóa chống bấm đúp, có nút "Tiếp nhận lượt xe tiếp theo" sau khi thành công.
2. **Luồng B — An ninh Cổng ra & Thu phí (`/exit` - Tab Cổng ra):**
   - Phân biệt rõ xe mang cont và xe riêng không cont (RPC `sc_confirm_vehicle_only_exit`).
   - Container bắt buộc phải có trạng thái "Đã duyệt" hoặc "Duyệt công nợ" mới mở khóa thao tác cho xe ra.
   - Phí lưu bãi được tính tự động; nếu phát sinh lỗi tính phí thì khóa cứng nút xuất bãi để bảo vệ thất thoát.
3. **Luồng C — CCKB Tổng quan & Duyệt xuất bãi (`/exit` - Tab Duyệt xuất):**
   - Tách bạch hoàn toàn trách nhiệm: An ninh không thu tiền điện lạnh; CCKB không xác nhận xe qua cổng vật lý.
   - Phê duyệt bảo lãnh công nợ bắt buộc nhập lý do chi tiết (tối thiểu 5 ký tự) để kiểm toán.

---

## 3. CÁC ĐIỂM CHỦ DỰ ÁN CẦN XÁC NHẬN ĐỂ BƯỚC VÀO PILOT CODE

Kính đề nghị Chủ dự án xem xét và phê duyệt các điểm sau:

1. **Phê duyệt định hướng thẩm mỹ & màu sắc:**  
   Chấp thuận bảng màu chuẩn: Xanh lá `#0A9444` (nút chính/hành động), Xanh navy `#223873` (tiêu đề/thẩm quyền), Nền `#F5F8FA` (chống mỏi mắt ca trực), phông chữ rõ ràng có số liệu dạng bảng (`tnum`).
2. **Phê duyệt bố cục 3 luồng tác nghiệp (A, B, C):**  
   Chấp thuận cấu trúc form rút gọn, tập trung trường bắt buộc, ẩn bớt trường phụ trên Mobile.
3. **Phê duyệt phạm vi triển khai Pilot (Giai đoạn tiếp theo):**  
   Cho phép tiến hành code thí điểm duy nhất trên 4 khu vực: `AppShell`, `/login`, `/entry`, `/exit` (giữ nguyên Backend, database, RLS, RBAC, RPC và repository hiện hữu).

---

## 4. CAM KẾT VÀ BẢO ĐẢM RANH GIỚI AN TOÀN

- **ĐIỂM DỪNG 1 TUÂN THỦ NGHIÊM NGẶT:** Sau tờ trình này, đội ngũ kỹ thuật **DỪNG MỌI THAO TÁC CODE LẠI FRONTEND HÀNG LOẠT** để chờ Chủ dự án đánh giá và phê duyệt thiết kế.
- **GATE 2 TIẾP TỤC TẠM DỪNG:** Biến môi trường duy trì `NEXT_PUBLIC_ENABLE_REAL_WRITE=false`.
- **AN TOÀN HỆ THỐNG:** Không tác động cơ sở dữ liệu Supabase Cloud DEV, không tạo migration mới, không ghi dữ liệu thử nghiệm ngoài demo, tuyệt đối không chạm môi trường Production.
