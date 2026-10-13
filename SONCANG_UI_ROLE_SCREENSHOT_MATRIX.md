# MA TRẬN ẢNH CHỤP GIAO DIỆN PWA THẬT THEO VAI TRÒ VÀ KÍCH THƯỚC MÀN HÌNH
**Dự án:** Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Môi trường ghi hình:** PWA Next.js Production Server (`http://localhost:3000`) qua Chrome DevTools Protocol (CDP Headless)  
**Chế độ xác thực:** Chế độ mô phỏng theo vai trò phân quyền nghiệp vụ (`DEMO MODE`)  
**Thư mục lưu trữ:** `SONCANG_PWA_REAL_SCREENSHOTS/` (bản sao lưu đối soát tại `SONCANG_UI_UX_REVIEW_PACKAGE/02_CURRENT_PWA_SCREENSHOTS/`)

---

## 1. MA TRẬN TỔNG HỢP 27 ẢNH CHỤP THỰC TẾ

| STT | Phân hệ / Màn hình | Tuyến đường (Route) | Vai trò công tác | Chế độ / Dữ liệu đặc tả | Desktop (1440×900) | Tablet (1024×768) | Mobile (390×844) |
| :---: | :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **01** | Đăng nhập hệ thống | `/login` | Chung | Đăng nhập tập trung, chọn ca trực | `01_login_desktop_1440.png` | `01_login_tablet_1024.png` | `01_login_mobile_390.png` |
| **02** | Tổng quan vận hành | `/dashboard` | `SYS_ADMIN` (Quản trị) | Phân bổ phương tiện, trạng thái bãi | `02_dashboard_admin_desktop_1440.png` | `02_dashboard_admin_tablet_1024.png` | `02_dashboard_admin_mobile_390.png` |
| **03** | Tiếp nhận xe vào cổng | `/entry` | `SEC_STAFF` (An ninh) | **Đã điền form mẫu:** Xe `14C-888.88`, Cont `TCLU1234567`, Lái xe `Nguyễn Văn Lái` | `03_entry_security_desktop_1440.png` | `03_entry_security_tablet_1024.png` | `03_entry_security_mobile_390.png` |
| **04** | Quản lý bến bãi | `/yard` | `DIS_STAFF` (Điều phối) | Danh sách cont, trạng thái HÀNG/RỖNG | `04_yard_dispatcher_desktop_1440.png` | `04_yard_dispatcher_tablet_1024.png` | `04_yard_dispatcher_mobile_390.png` |
| **05** | Giám sát điện cont lạnh | `/reefer` | `PORT_STAFF` (CCKB) | Giờ cắm/rút, snapshot đơn giá, quy tắc 15p | `05_reefer_cckb_desktop_1440.png` | `05_reefer_cckb_tablet_1024.png` | `05_reefer_cckb_mobile_390.png` |
| **06** | Sổ cái & Biểu phí | `/billing` | `PORT_STAFF` (CCKB) | Danh sách khoản thu, biểu phí áp dụng | `06_billing_cckb_desktop_1440.png` | `06_billing_cckb_tablet_1024.png` | `06_billing_cckb_mobile_390.png` |
| **07** | Xác nhận Cổng ra vật lý | `/exit` (Tab Cổng ra) | `SEC_STAFF` (An ninh) | Xác nhận xe/cont rời bãi, thu phí lưu bãi | `07_exit_gate_security_desktop_1440.png` | `07_exit_gate_security_tablet_1024.png` | `07_exit_gate_security_mobile_390.png` |
| **08** | Duyệt điều kiện xuất bãi | `/exit` (Tab Duyệt xuất) | `PORT_STAFF` (CCKB) | Kiểm tra cước điện, duyệt xuất / bảo lãnh nợ | `08_exit_clearance_cckb_desktop_1440.png` | `08_exit_clearance_cckb_tablet_1024.png` | `08_exit_clearance_cckb_mobile_390.png` |
| **09** | Danh mục loại phương tiện | `/admin/vehicle-types` | `SYS_ADMIN` (Quản trị) | Phân loại phương tiện vận chuyển | `09_admin_vehicle_types_desktop_1440.png` | `09_admin_vehicle_types_tablet_1024.png` | `09_admin_vehicle_types_mobile_390.png` |

---

## 2. ĐỐI CHIẾU TIÊU CHUẨN NGHIỆM THU

1. **Không còn màn hình rỗng do thiếu vai trò:**  
   Toàn bộ ảnh chụp màn hình `/entry` và `/yard` thể hiện đầy đủ giao diện nghiệp vụ hoạt động, bảng danh sách phương tiện, form nhập liệu tương tác, không còn thông báo *"Không có quyền tiếp nhận xe"* hay *"Chưa phân vai trò"*.
2. **Khắc phục hoàn toàn lỗi thanh điều hướng Mobile:**  
   Các ảnh `mobile_390` xác nhận:
   - Thanh bottom navigation chỉ cao ~64px, tối đa 3-4 nút chính + nút "Thêm".
   - Không còn hiện tượng 7 nút dàn 3 cột che khuất giao diện.
   - Khoảng trống đệm chân trang (`pb-28`) giúp nội dung form và nút hành động dưới cùng hiển thị rõ ràng, không bị chèn ép.
3. **Làm sạch ngôn ngữ hiển thị:**  
   Tất cả 27 ảnh chụp đều hiển thị tiếng Việt nghiệp vụ chuẩn mực: không còn mã quyền, mã enum, mã quy trình hay tên công nghệ (`Supabase`, `Backend`, `RPC`, `RLS`, `RBAC`, `V5`, `PWA`, `YMS`, `AP06`, `AP07`, `Clearance`, `UNPAID`).
