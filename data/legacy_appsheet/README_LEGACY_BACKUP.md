# BÁO CÁO SAO LƯU & CHUYỂN ĐỔI DỮ LIỆU LỊCH SỬ GOOGLE APPSHEET
## HỆ THỐNG PHẦN MỀM QUẢN LÝ BẾN BÃI / CẢNG CẠN SƠN CẢNG

- **Đơn vị sở hữu:** Công ty Cổ phần Tà Lùng Quang Minh
- **Nguồn tệp tin gốc:** `docs/Xe-ra-vao_SC.xlsx`
- **Thời điểm trích xuất từ AppSheet:** 16/10/2026 10:44:31 (Asia/Ho_Chi_Minh)
- **Thời điểm hoàn thành sao lưu vào hệ thống:** 16/10/2026 12:41:00 (Asia/Ho_Chi_Minh)
- **Mục đích:** Lưu trữ dự phòng vĩnh viễn (Backup), bảo toàn lịch sử bến bãi và phục vụ đối soát kiểm toán (Legacy Audit).
- **Nguyên tắc an toàn (AGENTS.md & RV10):** Dữ liệu được lưu trữ độc lập, **không làm nhiễm bẩn dữ liệu runtime** hiện tại và **không tự động sinh công nợ giả**.

---

### 1. TỔNG HỢP CHỈ SỐ SAO LƯU

| Chỉ số nghiệp vụ | Giá trị thống kê | Ghi chú đối soát |
|---|---|---|
| **Khoảng thời gian hoạt động** | **27/08/2026 16:37** đến **16/10/2026 17:39** | Gần 2 tháng ghi nhận qua AppSheet |
| **Tổng số lượt xe (`VEHICLE`)** | **360 lượt xe** | Đầy đủ mã định danh `legacy_id` |
| - Xe đã xuất bãi (`EXITED`) | 290 lượt xe | Đã ghi nhận giờ ra và tiền vé |
| - Xe đang ở bãi (`IN_YARD`) | **70 lượt xe** | Khớp 100% Báo cáo tồn bãi `BC_SC_TON_BAI` |
| **Cơ cấu chủng loại xe** | | |
| - Xe container (`CONT_LANH`) | 304 lượt (84.4%) | Vé 250.000 đ |
| - Xe bo 8 tấn/2 chân (`XE_BO_8_TAN_2_CHAN`) | 53 lượt (14.7%) | Vé 100.000 đ |
| - Xe bo 3 bánh (`XE_BO_3_BANH`) | 3 lượt (0.8%) | Vé 40.000 đ |
| **Tổng doanh thu vé cổng ghi nhận** | **81.420.000 VNĐ** | |
| - Thu tiền mặt | 247 giao dịch (57.870.000 đ) | Thu trực tiếp tại bốt |
| - Thu chuyển khoản (VietQR) | 108 giao dịch (23.550.000 đ) | Chuyển khoản ngân hàng |
| - Chưa thu / Miễn phí / Khác | 5 lượt | |
| **Tổng số lượt container (`CONTAINER`)** | **304 lượt container** | |
| - Container đã xuất (`EXITED`) | 239 lượt | |
| - Container đang lưu (`IN_YARD`) | **65 container** | Khớp 100% Báo cáo tồn bãi `BC_SC_TON_BAI` |
| - Phân loại tình trạng hàng | 100% HÀNG (304 cont) | Không có cont rỗng trong ghi nhận cũ |
| **Tổng doanh thu phí lưu bãi ghi nhận** | **60.500.000 VNĐ** | Đơn giá 100.000 đ/đêm lưu |
| **Tài khoản nhân sự thao tác** | `anninh.talunglogistics@gmail.com` | Nhân viên An ninh bốt trực |

---

### 2. CÁC TỆP TIN DỮ LIỆU ĐÃ SAO LƯU

1. **`data/legacy_appsheet/legacy_vehicles.json`** (và bản sao tại `ProjectContext/06_Kien_truc_va_kiem_thu/legacy_appsheet/`):
   - Chứa toàn bộ 360 bản ghi xe.
   - Chuẩn hóa: Giờ vào/ra chuyển từ Excel serial date sang ISO-8601 UTC và giờ Việt Nam (`Asia/Ho_Chi_Minh`), phân loại trạng thái `IN_YARD` / `EXITED`, mã cont vào/ra, số tiền vé và hình thức thanh toán.

2. **`data/legacy_appsheet/legacy_containers.json`**:
   - Chứa toàn bộ 304 bản ghi container.
   - Chuẩn hóa: Số container chuẩn, liên kết xe vào/ra, số đêm lưu, tiền lưu bãi, tình trạng hàng hóa (`HÀNG`).

3. **`data/legacy_appsheet/legacy_summary.json`**:
   - Tệp JSON tổng kết các chỉ số KPI, phân bổ loại xe, phân bổ hình thức thanh toán và mốc thời gian phục vụ đọc tự động.

4. **`data/legacy_appsheet/legacy_appsheet_backup.sql`**:
   - Tệp mã nguồn SQL DDL & DML hoàn chỉnh (~392 KB).
   - Định nghĩa 2 bảng: `legacy_appsheet_vehicles` và `legacy_appsheet_containers`.
   - Chứa 360 câu lệnh `INSERT ... ON CONFLICT (legacy_id) DO NOTHING` cho xe và 304 câu lệnh cho container. Sẵn sàng chạy vào PostgreSQL / Supabase khi Ban Quản trị yêu cầu.

---

### 3. ĐẶC ĐIỂM DỮ LIỆU & LƯU Ý THEO YÊU CẦU CỦA CHỦ DỰ ÁN

1. **Thông tin lái xe:**
   - Trong ứng dụng AppSheet cũ, đội ngũ An ninh chưa thu thập họ tên, số điện thoại hay số CCCD của lái xe (chỉ ghi biển số, loại xe và số container).
   - Theo đúng yêu cầu của Chủ dự án: *"các thông tin như lái xe thì để sau bạn ạ"*, hệ thống để trống (NULL) các trường này và giữ nguyên vẹn toàn bộ các trường nghiệp vụ gốc.
2. **Khả năng tra cứu lịch sử:**
   - Có thể sử dụng các file JSON này hoặc bảng SQL để tra cứu lại lịch sử xe/cont của giai đoạn tháng 8 – tháng 10/2026 bất cứ khi nào có yêu cầu đối soát từ Ban Giám đốc hoặc cơ quan thuế.
