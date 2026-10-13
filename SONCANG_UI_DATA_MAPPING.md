# BẢNG ĐỐI CHIẾU DỮ LIỆU GIAO DIỆN VỚI BACKEND VÀ NGUYÊN TẮC KỸ THUẬT (DATA MAPPING)
**Dự án:** Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Thời điểm lập:** 12/10/2026  
**Căn cứ:** `SONCANG_AG_STITCH_UI_PILOT_NEXT_20261012.md` & Kiến trúc Database Migrations 001–008

---

## 1. NGUYÊN TẮC KỸ THUẬT & KIẾN TRÚC FRONTEND

1. **Cơ chế CSS — Tailwind CSS v4:**
   - Dự án đang sử dụng **Tailwind CSS v4** với `@import "tailwindcss"` và định nghĩa biến giao diện trực tiếp tại `@theme inline` trong [globals.css](file:///d:/thanhnx/OpenCode/YMS-project/src/app/globals.css).
   - **Tuyệt đối không tạo hoặc sửa file `tailwind.config.ts`** (file này không tồn tại và không được dùng trong phiên bản Tailwind v4 của dự án).
   - Màu sắc thương hiệu quy chuẩn:
     - `brand-primary`: `#0A9444` (Xanh lá vận hành Sơn Cảng)
     - `brand-secondary`: `#223873` (Xanh navy Tà Lùng Quang Minh)
     - `brand-bg`: `#F5F8FA` (Xám sáng dịu mắt cho nhân viên ca trực)
2. **Nguyên tắc phân định nguồn dữ liệu:**
   - Mọi thông tin hiển thị phải phân tách rành mạch:
     - **Dữ liệu thực có sẵn:** Đọc/ghi qua `IYardRepository` (kết nối Supabase RPC và bảng PostgreSQL đã vượt Gate Local & Gate 1 Cloud DEV).
     - **Dữ liệu mô phỏng (`DEMO`):** Cung cấp qua `MockYardRepository` trên Local Storage khi `authMode === 'DEMO'`, có gắn banner cảnh báo minh bạch.
     - **Chưa hỗ trợ V1:** Tuyệt đối không tự ý thêm các tính năng ngoài phạm vi (QR scan tự động, camera ANPR, IoT cổng, Barie, Zalo/SMS, Hóa đơn điện tử).

---

## 2. BẢNG MAPPING CHI TIẾT THEO 3 LUỒNG NGHIỆP VỤ

### 2.1. LUỒNG A — AN NINH CỔNG VÀO (GATE IN ENTRY)

| Thành phần trên bản mẫu Stitch | Bản chất dữ liệu | Nguồn kỹ thuật tương ứng (DB/RPC/Repository) | Trạng thái hỗ trợ V1 |
| :--- | :--- | :--- | :--- |
| **Biển số xe** (Trường trọng tâm) | Dữ liệu bắt buộc | `app_vehicle_visits.license_plate` | **Có sẵn thực tế** |
| **Công tắc Có/Không mang Container** | Lựa chọn thực địa | Quyết định gọi RPC tạo xe riêng hay xe kèm container | **Có sẵn thực tế** |
| **Số Container** | Bắt buộc khi có cont | `app_container_visits.container_no_current` | **Có sẵn thực tế** |
| **Kích thước & Loại cont** (20ft/40ft, Khô/Lạnh) | Thông tin phân loại | `container_size`, `container_type` (`RF`/`GP`) | **Có sẵn thực tế** |
| **Phân loại phương tiện** (7 mã quy chuẩn) | Danh mục hệ thống | `app_vehicle_types` (Seed 7 loại phương tiện) | **Có sẵn thực tế** |
| **Giá vé cổng** (250.000đ có cont; 0đ đầu kéo không cont) | Biểu phí niêm yết | `app_tariffs` & tính toán tự động tại RPC Migration 005 | **Có sẵn thực tế** |
| **Tên lái xe & Số điện thoại** | Thông tin phụ liên hệ | `driver_name`, `driver_phone` trong `app_vehicle_visits` | **Có sẵn thực tế** |
| **Mô tả hàng hóa & Số kẹp chì (Seal)** | Thông tin kiểm soát | `cargo_description`, `seal_number` trong `app_container_visits` | **Có sẵn thực tế** |
| **Nút bấm Tiếp nhận xe vào bãi** | Giao dịch nguyên tử | RPC `sc_create_vehicle_and_container_visit_atomic` (có cont) hoặc `sc_register_vehicle_entry` (không cont) | **Có sẵn thực tế** |
| **Khóa chống bấm kép (Double-submit lock)** | Cơ chế an toàn UI | `isSubmitting` state trong React + Idempotency token | **Có sẵn thực tế** |
| *Quét biển số tự động qua Camera ANPR* | Tự động hóa IoT | Không có phần cứng / Chưa tích hợp | **CHƯA HỖ TRỢ V1 (Loại trừ)** |
| *In vé mã vạch tự động* | Phần cứng máy in cổng | Không kết nối máy in nhiệt tại V1 | **CHƯA HỖ TRỢ V1 (Loại trừ)** |

---

### 2.2. LUỒNG B — AN NINH CỔNG RA & THU PHÍ LƯU BÃI (GATE OUT EXIT)

| Thành phần trên bản mẫu Stitch | Bản chất dữ liệu | Nguồn kỹ thuật tương ứng (DB/RPC/Repository) | Trạng thái hỗ trợ V1 |
| :--- | :--- | :--- | :--- |
| **Tra cứu danh sách xe/cont trong bãi** | Danh sách tác nghiệp | `repository.getContainers(yardId)` & `getVehicles(yardId)` | **Có sẵn thực tế** |
| **Hiển thị Điều kiện xuất bãi** | Trạng thái phê duyệt | `clearance_status` (`CLEARED`, `CLEARED_WITH_DEBT`, `PENDING`) | **Có sẵn thực tế** |
| **Chốt phí lưu bãi container** | Tính cước tự động | `repository.calculateStorageFee(inbound_at)` (Mốc 22h-06h, đêm đầu miễn phí, 100.000đ/đêm từ đêm 2) | **Có sẵn thực tế** |
| **Cơ chế chặn khi lỗi tính phí** | An toàn tài chính | State `storageCalcError` + khóa nút xác nhận (không gán 0đ) | **Có sẵn thực tế** |
| **Hình thức thanh toán tại cổng** | Tiền mặt / Chuyển khoản | `payment_method` (`CASH`, `BANK_TRANSFER`), mã biên nhận | **Có sẵn thực tế** |
| **Biển số xe kéo container ra** | Phương tiện xuất bãi | `outbound_license_plate` trong `app_container_visits` | **Có sẵn thực tế** |
| **Xác nhận xe rời bãi không có cont** | Xe rời bãi độc lập | RPC `sc_confirm_vehicle_only_exit` | **Có sẵn thực tế** |
| **Nút Xác nhận cho container rời bãi** | Giao dịch chốt sổ | RPC `sc_confirm_gate_exit` kết hợp ghi sổ cái phí lưu bãi | **Có sẵn thực tế** |
| *Tự động nâng hạ Barie cổng ra* | Điều khiển phần cứng | Chưa trang bị cảm biến barie | **CHƯA HỖ TRỢ V1 (Loại trừ)** |
| *Xuất hóa đơn điện tử tự động* | Tích hợp thuế điện tử | Chưa tích hợp API hóa đơn điện tử tại V1 | **CHƯA HỖ TRỢ V1 (Loại trừ)** |

---

### 2.3. LUỒNG C — CCKB TỔNG QUAN, ĐIỆN LẠNH & DUYỆT XUẤT BÃI (CCKB / CLEARANCE)

| Thành phần trên bản mẫu Stitch | Bản chất dữ liệu | Nguồn kỹ thuật tương ứng (DB/RPC/Repository) | Trạng thái hỗ trợ V1 |
| :--- | :--- | :--- | :--- |
| **Danh sách phiên cắm điện cont lạnh** | Bảng giám sát điện | `app_reefer_sessions` | **Có sẵn thực tế** |
| **Ghi nhận giờ cắm điện / rút điện** | Thao tác hiện trường | RPC `sc_plug_in_reefer` & `sc_unplug_reefer` | **Có sẵn thực tế** |
| **Snapshot đơn giá & tính giờ làm tròn 15p** | Quy tắc tính cước điện | RPC `sc_unplug_reefer` (áp dụng snapshot rate 100.000đ/h) | **Có sẵn thực tế** |
| **Thu tiền điện container** | Nghiệp vụ tài chính | RPC `sc_record_payment_and_clearance` với charge type `REEFER` (Chỉ CCKB được phép) | **Có sẵn thực tế** |
| **Duyệt điều kiện xuất bãi tiêu chuẩn** | Phê duyệt thông quan | RPC `sc_approve_container_clearance` | **Có sẵn thực tế** |
| **Duyệt bảo lãnh công nợ** | Phê duyệt ngoại lệ | RPC `sc_approve_clearance_with_debt` (bắt buộc nhập lý do ≥ 5 ký tự) | **Có sẵn thực tế** |
| *Cổng thanh toán QR trực tuyến (VNPay/ZaloPay)* | Cổng thanh toán bên thứ 3 | Chưa tích hợp cổng thanh toán trực tuyến tại V1 | **CHƯA HỖ TRỢ V1 (Loại trừ)** |

---

## 3. KẾT LUẬN VỀ TÍNH KHẢ THI TRIỂN KHAI

Toàn bộ các trường dữ liệu và nghiệp vụ trong 3 luồng thiết kế được chọn lọc đều **100% khớp với cấu trúc Database Migrations 001–008 và các hàm RPC đã vượt qua kiểm thử pgTAP Local Gate**.  
Không có bất kỳ trường dữ liệu giả hoặc nghiệp vụ bịa đặt nào được đưa vào phần mềm thực tế.
