# BÁO CÁO QA — STITCH BÃI SƠN CẢNG V5 (11/10/2026)
**Đầu vào:** ZIP xuất từ Google Stitch của dự án; đối chiếu `PROJECT_CONTEXT.md` V5 và danh mục RBAC 67 quyền. **Kết luận:** giữ để tham chiếu giao diện; chưa được sử dụng HTML/JavaScript nguyên trạng làm mã production.

## 1. Kiểm kê thực tế
- Gói có **19** file `code.html`; số bản chính thức nên dùng làm tham chiếu: **17** gồm 5 nền tảng, 8 An ninh, 4 CCKB. Có **2 bản cũ** còn trong ZIP.
- Header của 10/17 bản chính thức là `fixed`, 7/17 dùng `sticky`; chưa thống nhất Global App Shell.
- Hai bản Mobile còn khóa zoom: `02_an_ninh_xe_vao_mobile_390` và `04_cckb_tong_quan_mobile_390`.
- Bản Xe ra Desktop mới đã có nội dung; bản Xe vào Tablet ngang mới không trùng HTML ID. Bản cũ vẫn còn và phải loại khi bàn giao.

## 2. Vấn đề phải xử lý trước khi lập trình
| Mức | Nhóm | Lỗi xác nhận | Khuyến nghị |
|---|---|---|---|
| P0 | Bản cũ trong ZIP | `03_an_ninh_xe_ra_desktop_1440_1` có `<main>` trống; `02_an_ninh_xe_vao_tablet_landscape_1024_1` còn trùng `input-plate` và `input-vehicle-time`. | Chỉ bàn giao bản `_2` của hai màn hình này; tách lịch sử/không đưa vào source nhập Antigravity. |
| P0 | Thông báo giao dịch giả | 02 Xe vào Mobile/Desktop/Tablet, 03 Xe ra Mobile/Tablet và Dashboard CCKB Desktop/Tablet có nội dung JavaScript báo giao dịch thành công hoặc mở barie dù chưa có server. | Nút nhạy cảm chỉ mở preview/form hoặc trạng thái demo, không đổi sang Đã thu/Đã xuất/Đã duyệt; Next.js server sẽ xử lý thật. |
| P0 | CCKB xác nhận nợ | 04 Desktop vẫn có `Ghi nợ KH` trong radio phương thức thanh toán; 04 Tablet có lựa chọn lý do bảo lãnh/hợp đồng giả. | Ngoại lệ nợ là quy trình phê duyệt riêng, có quyền + lý do + khoản nợ mở, không coi là phương thức thu tiền. |
| P1 | RBAC không đúng V5 | Các màn hình CCKB dùng `reefer.request.manage`, `reefer.session.record` không nằm trong 67 permission_code; DS-01 dùng `gate.check_in`, `gate.checkout`, `reefer.manage`. | Tham chiếu đúng action code thật: `reefer.request.create/update`, `reefer.session.actual_start.record`, `reefer.session.actual_end.record`, `reefer.payment.collect`, `exit.clearance.issue`, v.v. |
| P1 | Header và zoom | 4 màn hình 04 CCKB dùng `fixed top-0`, 03 Xe ra Tablet dọc cũng fixed; DS-01 và Dashboard cũ vẫn fixed. 02 Xe vào Mobile và 04 CCKB Mobile khóa zoom. | Chuẩn hóa một App Shell; thay sticky/normal-flow hoặc tính offset chính xác và `scroll-margin-top`; bỏ `user-scalable=no`/`maximum-scale=1`. |
| P1 | Tự thêm nghiệp vụ chưa chốt | 04 CCKB Tablet dọc còn Quét OCR, giả định camera OCR phát hiện sai, Đổi Cột Cắm Dự Phòng, Xác Nhận Giữ Chỗ, Ghi log nhiệt độ; Desktop ghi 48/64 ổ điện. | Ẩn bỏ hoặc gắn nhãn ý tưởng/tùy chọn chưa triển khai; không tạo workflow/cấu hình nguồn điện, giữ chỗ, OCR khi chưa có quyết định. |
| P1 | Các nút CCKB tự chốt từ dashboard | 04 Desktop `confirmPayment()/approveClearance()` chỉ bắn toast Thu tiền thành công/Cấp quyền xuất bãi; 04 Tablet ngang `confirmPaymentSuccess` tự đổi badge Đã thu. | Chỉ điều hướng tới luồng chi tiết, đòi xác nhận/phân quyền backend/ledger trước trạng thái thành công. |

## 3. Điểm đã đạt
- Có bộ màu sáng #F5F8FA/#FFFFFF; xanh #0A9444, #223873; CTA #087C3C; font Be Vietnam Pro.
- Màn hình 02 hiển thị 7 loại xe/biểu giá đúng V5, tách lượt xe và container; bản Tablet ngang `_2` không còn ID trùng.
- Màn hình 03 Desktop `_2` có phần nghiệp vụ xe ra, phí lưu đêm đầu miễn phí và phân vai An ninh/CCKB.
- 04 CCKB có đủ 4 biến thể; hiển thị yêu cầu điện dự kiến, đang cắm, đã rút, chưa thu, chờ duyệt. Ví dụ 16h35 → 16h45 → 1.675.000đ là đúng ở giá 100.000đ/giờ.

## 4. Danh sách bản chính thức nên dùng làm **tham chiếu hình ảnh/bố cục**
| Nhóm | Thư mục ZIP | Header | Ghi chú |
|---|---|---|---|
| DS-01 | `th_vi_n_design_system_b_i_s_n_c_ng_ds_01_chu_n_v5` | fixed | — |
| An ninh Tong quan Desktop | `t_ng_quan_an_ninh_b_i_s_n_c_ng_desktop_chu_n_v5` | fixed | — |
| An ninh Tong quan Mobile | `t_ng_quan_an_ninh_b_i_s_n_c_ng_mobile_chu_n_v5` | fixed | — |
| An ninh Tong quan Tablet 1024 | `t_ng_quan_an_ninh_b_i_s_n_c_ng_tablet_landscape_1024px` | fixed | — |
| An ninh Tong quan Tablet 820 | `t_ng_quan_an_ninh_b_i_s_n_c_ng_tablet_portrait_820px` | fixed | — |
| 02 Xe vao Mobile 390 | `02_an_ninh_xe_vao_mobile_390` | sticky | viewport khóa zoom, chứa trạng thái thành công giả khi demo |
| 02 Xe vao Tablet 820 | `02_an_ninh_xe_vao_tablet_portrait_820` | sticky | chứa trạng thái thành công giả khi demo |
| 02 Xe vao Tablet 1024 | `02_an_ninh_xe_vao_tablet_landscape_1024_2` | sticky | chứa trạng thái thành công giả khi demo |
| 02 Xe vao Desktop 1440 | `02_an_ninh_xe_vao_desktop_1440` | sticky | — |
| 03 Xe ra Mobile 390 | `03_an_ninh_xe_ra_mobile_390` | sticky | chứa trạng thái thành công giả khi demo |
| 03 Xe ra Tablet 820 | `03_an_ninh_xe_ra_tablet_portrait_820` | fixed | chứa trạng thái thành công giả khi demo |
| 03 Xe ra Tablet 1024 | `03_an_ninh_xe_ra_tablet_landscape_1024` | sticky | chứa trạng thái thành công giả khi demo |
| 03 Xe ra Desktop 1440 | `03_an_ninh_xe_ra_desktop_1440_2` | sticky | — |
| 04 CCKB Tong quan Mobile 390 | `04_cckb_tong_quan_mobile_390` | fixed | viewport khóa zoom |
| 04 CCKB Tong quan Tablet 820 | `04_cckb_tong_quan_tablet_portrait_820` | fixed | — |
| 04 CCKB Tong quan Tablet 1024 | `04_cckb_tong_quan_tablet_landscape_1024` | fixed | chứa trạng thái thành công giả khi demo |
| 04 CCKB Tong quan Desktop 1440 | `04_cckb_tong_quan_desktop_1440` | fixed | chứa trạng thái thành công giả khi demo |

## 5. Tiêu chí chuyển sang Antigravity
1. Khóa bản chính thức theo manifest này, không import hai thư mục cũ.
2. Dùng Stitch làm **visual reference**, không copy nguyên JavaScript/CSS CDN/rules tiền vào production.
3. Backend Supabase/PostgreSQL tính tiền, thanh toán, phê duyệt nợ và xác nhận ra với audit, RLS, server transaction, chống bấm trùng.
4. Thực hiện UI test thực tế tại 390/820/1024/1440 và zoom 125%; review tất cả màn hình bằng ảnh chụp browser.
5. Chưa xem dashboard 04 là hoàn tất phân hệ CCKB: còn form điện dự kiến, phiên cắm/rút, thu tiền/phân bổ và duyệt tài chính.
