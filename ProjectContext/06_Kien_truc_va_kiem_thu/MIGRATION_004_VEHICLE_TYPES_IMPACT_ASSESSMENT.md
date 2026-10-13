# BÁO CÁO ĐÁNH GIÁ TÁC ĐỘNG: MỞ RỘNG MIGRATION 004 VỚI DANH MỤC LOẠI PHƯƠNG TIỆN ĐỘNG (app_vehicle_types)

**Dự án:** Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Môi trường:** Supabase Cloud DEV `son-cang-yms-dev` (Ref: `euswzyespwaxyrjkfkrq`)  
**Ngày lập:** 11/10/2026  
**Trạng thái:** **ĐỀ XUẤT KIẾN TRÚC — CHỜ CHỦ DỰ ÁN PHÊ DUYỆT TRƯỚC KHI SỬA MÃ NGUỒN.**

---

## I. BỐI CẢNH VÀ YÊU CẦU CỦA CHỦ DỰ ÁN

Trong bản nháp kỹ thuật Migration 004 trước đây:
- Bảng `app_vehicle_visits` sử dụng ràng buộc cứng `CHECK (vehicle_type IN ('CONT_LANH', 'DAU_KEO', 'XE_BO_4_CHAN', 'XE_BO_3_CHAN', 'XE_BO_8_TAN_2_CHAN', 'XE_BO_3_BANH', 'XE_SANG_TAI'))`.
- RPC `sc_create_vehicle_visit` hardcode giá vé bằng lệnh `CASE p_vehicle_type ...`.
- RPC `sc_create_container_visit` hardcode điều kiện xe được chở container `IF v_veh.vehicle_type NOT IN ('CONT_LANH', 'DAU_KEO')`.

Chủ dự án chỉ đạo:
1. **Loại bỏ thiết kế khóa cứng 7 loại xe trong CHECK constraint.**
2. **Chuyển sang danh mục loại phương tiện động (`app_vehicle_types`), khởi tạo bằng đúng 7 mã chuẩn V5.**
3. **Cho phép thêm, sửa tên, ngừng kích hoạt loại phương tiện theo phân quyền.**
4. **Tuyệt đối không xóa loại xe đã phát sinh lịch sử (`ON DELETE RESTRICT`); giữ nguyên mã loại xe trên các lượt cũ.**
5. **Giá vé quản lý có kiểm soát, loại xe mới chưa có giá hợp lệ phải bị chặn, không tự động miễn phí.**
6. **Không tự ý bổ sung `XE_KHAC` hoặc loại xe mới vào danh sách active.**
7. **Không thay đổi ma trận RBAC V5 (8 roles, 67 permissions, 206 grants).**
8. **Đánh giá tác động mở rộng từ 3 lên 4 bảng và chờ phê duyệt trước khi sửa code.**

---

## II. ĐÁNH GIÁ TÁC ĐỘNG TOÀN DIỆN (IMPACT ASSESSMENT)

### 1. Tác động đến Cấu trúc Dữ liệu (Schema Architecture) — Mở rộng từ 3 lên 4 bảng

| Bảng | Trạng thái | Thay đổi thiết kế & Vai trò |
| :--- | :---: | :--- |
| **`app_vehicle_types`** | **BẢNG MỚI (Bảng thứ 4)** | Quản lý danh mục phương tiện động: `code` (PK), `display_name`, `description`, `allows_container` (cờ cho phép cõng cont), `default_ticket_amount` (giá vé cơ sở), `is_active` (trạng thái sử dụng), `sort_order`, `created_at`, `updated_at`. |
| **`app_vehicle_visits`** | **SỬA ĐỔI** | Bỏ `CHECK (vehicle_type IN (...))`. Thay bằng Foreign Key: `vehicle_type text NOT NULL REFERENCES public.app_vehicle_types(code) ON DELETE RESTRICT`. |
| **`app_container_visits`** | **GIỮ NGUYÊN** | Giữ nguyên quan hệ 1:N và Partial Unique Index `uq_container_visits_active_number_yard` chống trùng số `IN_YARD`. |
| **`app_container_number_changes`** | **GIỮ NGUYÊN** | Giữ nguyên trigger append-only kiểm tra `IS DISTINCT FROM`. |

**Đánh giá an toàn DDL:**
- Việc bổ sung bảng `app_vehicle_types` không phá vỡ kiến trúc module. Đây là bảng danh mục hạt nhân (Master Catalog) thuộc phạm vi Quản lý Phương tiện (Vehicle Domain).
- Ràng buộc `ON DELETE RESTRICT` đảm bảo không bao giờ có thể xóa một loại xe đã có lượt vào bãi trong `app_vehicle_visits`.

---

### 2. Tác động đến Nghiệp vụ & Dữ liệu Khởi tạo (Seed Data)

- **7 mã loại phương tiện V5 được khởi tạo làm dữ liệu cơ sở:**
  1. `CONT_LANH`: Xe container lạnh | `allows_container = true` | `default_ticket_amount = 250,000đ` | `is_active = true`
  2. `DAU_KEO`: Xe đầu kéo | `allows_container = true` | `default_ticket_amount = 0đ` | `is_active = true`
  3. `XE_BO_4_CHAN`: Xe bo 4 chân tải thùng | `allows_container = false` | `default_ticket_amount = 200,000đ` | `is_active = true`
  4. `XE_BO_3_CHAN`: Xe bo 3 chân tải thùng | `allows_container = false` | `default_ticket_amount = 200,000đ` | `is_active = true`
  5. `XE_BO_8_TAN_2_CHAN`: Xe bo 8 tấn 2 chân | `allows_container = false` | `default_ticket_amount = 100,000đ` | `is_active = true`
  6. `XE_BO_3_BANH`: Xe bo 3 bánh nội bộ | `allows_container = false` | `default_ticket_amount = 40,000đ` | `is_active = true`
  7. `XE_SANG_TAI`: Xe sang tải nội bộ | `allows_container = false` | `default_ticket_amount = 0đ` | `is_active = true`
- **Không có `XE_KHAC`:** Tuân thủ 100% chỉ đạo không tự ý sinh mã xe lạ.

---

### 3. Tác động đến Lớp Nghiệp vụ (RPC Layer) & Loại bỏ Hardcode

- **Khắc phục triệt để Phát hiện M004-R2-07 (Loại xe được chở container):**
  * Nhờ có trường `allows_container boolean`, RPC `sc_create_container_visit` không cần hardcode `IF vehicle_type NOT IN ('CONT_LANH', 'DAU_KEO')`.
  * RPC chỉ cần đọc: `IF v_vtype.allows_container = false THEN RAISE EXCEPTION 'Loại phương tiện % không được phép tiếp nhận container vào bãi.'`.
  * Sau này khi bến bãi có thêm loại xe chở container mới (ví dụ mooc lùn, mooc chuyên dụng), Quản trị viên chỉ cần bật cờ `allows_container = true` mà không cần viết lại mã nguồn SQL hay sửa RPC!
- **Khắc phục triệt để Phát hiện M004-R2-10 (Quản lý giá vé có kiểm soát):**
  * Trong RPC `sc_create_vehicle_visit`: Đọc `v_vtype.default_ticket_amount`.
  * Kiểm tra chặt chẽ:
    - Nếu loại xe bị ngừng hoạt động (`is_active = false`): Từ chối tạo lượt xe.
    - Nếu loại xe mới chưa được cấu hình giá vé (`default_ticket_amount IS NULL`): Từ chối tạo lượt xe ("Loại xe chưa có biểu phí hợp lệ. Không tự động miễn phí.").
    - Nếu `default_ticket_amount = 0` (như `DAU_KEO`, `XE_SANG_TAI`): Đánh dấu `ticket_payment_status = 'EXEMPT'`.
    - Nếu `default_ticket_amount > 0`: Gán giá vé theo biểu phí và đánh dấu `ticket_payment_status = 'UNPAID'`.
  * Sẵn sàng chuyển giao cho Migration 006: Khi Migration 006 ra đời với hệ thống bảng giá versioned (`app_tariffs`), logic tính giá vé sẽ chuyển sang snapshot từ bảng giá có hiệu lực tại thời điểm xe vào cổng.

---

### 4. Tác động đến Phân quyền RBAC & RLS (Bảo toàn RBAC V5)

- **Nguyên tắc:** Tuyệt đối KHÔNG thay đổi ma trận RBAC V5 (8 roles, 67 permissions, 206 grants).
- **Quyền Quản lý Danh mục Phương tiện:**
  * Tra cứu từ Workbook RBAC V5: Sử dụng mã quyền chuẩn V5 có sẵn: **`admin.billing_settings.manage`** (Scope ALL) của vai trò **`SYS_ADMIN`**.
  * Bổ sung RPC quản trị: `sc_manage_vehicle_type(p_code, p_display_name, p_description, p_allows_container, p_default_ticket_amount, p_is_active, p_sort_order)`. RPC này kiểm tra `sc_can('admin.billing_settings.manage', NULL)`.
  * Chỉ `SYS_ADMIN` mới có quyền thêm loại xe mới, sửa tên, điều chỉnh giá hoặc tắt kích hoạt `is_active = false`.
- **Quyền Đọc Danh mục:**
  * RLS Policy: `CREATE POLICY p_vehicle_types_select ON public.app_vehicle_types FOR SELECT TO authenticated USING (true);`.
  * Cho phép các nhân viên An ninh, CCKB, Điều phối xem danh mục các loại xe đang hoạt động để hiển thị trên giao diện và thực hiện nghiệp vụ tạo lượt xe.

---

### 5. Tác động đến TypeScript Types & Kiểm thử

- **TypeScript (`src/types/database.types.ts`):**
  * Bổ sung định nghĩa Table `app_vehicle_types` (Row, Insert, Update).
  * Giữ nguyên chữ ký của 7 RPCs hiện có (không làm gãy contract).
  * Thêm RPC `sc_manage_vehicle_type` vào Functions.
- **pgTAP Test Suite (`domain_vehicles_containers_004.sql`):**
  * Bổ sung các test assertions:
    1. Bảng `app_vehicle_types` tồn tại, bật RLS.
    2. Seed đủ đúng 7 loại xe V5.
    3. `SYS_ADMIN` thêm/sửa loại xe thành công (ALLOW).
    4. An ninh hoặc nhân viên khác gọi sửa danh mục xe bị từ chối (DENY - thiếu quyền).
    5. Chặn xóa loại xe đã có dữ liệu trong `app_vehicle_visits` (`ON DELETE RESTRICT`).
    6. Tạo xe với loại xe đã bị vô hiệu hóa (`is_active = false`) bị từ chối (DENY).
    7. Gắn container vào loại xe có `allows_container = false` bị từ chối (DENY).

---

## III. SO SÁNH PHƯƠNG ÁN & ĐỀ XUẤT HÀNH ĐỘNG

| Tiêu chí | Phương án cũ (CHECK Constraint cứng 3 bảng) | Phương án mới (Danh mục động 4 bảng) |
| :--- | :--- | :--- |
| **Tính linh hoạt** | Kém. Mỗi khi có loại xe mới phải viết migration sửa DDL bảng. | Rất cao. Thêm loại xe mới qua giao diện quản trị có phân quyền. |
| **Kiểm soát giá vé** | Hardcode cố định trong RPC. | Quản lý theo cột cấu hình giá vé, chặn loại xe chưa có giá. |
| **Ràng buộc cõng container** | Hardcode `IN ('CONT_LANH', 'DAU_KEO')`. | Quản lý động qua cờ `allows_container`. |
| **Bảo toàn lịch sử** | Tốt. | Tốt hơn nhờ `ON DELETE RESTRICT`. |
| **Phù hợp RBAC V5** | Đạt. | Đạt 100% (gắn với `admin.billing_settings.manage`). |

**ĐỀ XUẤT CỦA ANTIGRAVITY:**
- Chấp thuận mở rộng Migration 004 từ 3 bảng lên 4 bảng với bảng `app_vehicle_types`.
- Duy trì nguyên tắc an toàn: Không sửa code ngay, chờ Người dùng phê duyệt đề xuất này trước khi thực hiện.
