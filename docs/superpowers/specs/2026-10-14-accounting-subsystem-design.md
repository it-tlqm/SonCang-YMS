# Thiết Kế Phân Hệ Kế Toán Bến Bãi Sơn Cảng (Accounting Subsystem Specification)

- **Đơn vị áp dụng:** Công ty Cổ phần Tà Lùng Quang Minh — Bến bãi Sơn Cảng (Cửa khẩu Quốc tế Tà Lùng, Cao Bằng)
- **Tài liệu tham chiếu:** 
  * `ProjectContext/01_Nghiep_vu_V5/PROJECT_CONTEXT.md` (V5)
  * `OPEN_DECISIONS_UAT.md` (RV08, RV12)
  * `DECISION_LOG.md`
  * Sổ kế toán thực tế: `Mẫu số 01:BPA (Theo dõi cắm công)`, `Bảng thu phí dịch vụ lưu đêm`, `Báo cáo thu chi hàng ngày & chốt ca 8h-16h / 16h-8h` do Kế toán công ty cung cấp ngày 14/10/2026.
- **Phiên bản:** 1.1 (Đã tích hợp mẫu biểu kế toán thực tế & phản hồi Chủ dự án)
- **Ngày lập:** 14/10/2026
- **Trạng thái:** DRAFT HOÀN THIỆN — CHỜ PHÊ DUYỆT ĐỂ LẬP KẾ HOẠCH TRIỂN KHAI

---

## 1. Bối cảnh & Mục đích (Intent and The Why)

### 1.1. Hiện trạng vận hành thực tế tại Sơn Cảng
- Bến bãi hoạt động 24/7 theo 2 ca 12 tiếng:
  * **Ca ngày:** 06:00 – 18:00
  * **Ca đêm:** 18:00 – 06:00 sáng hôm sau
- Hai bộ phận hiện trường trực tiếp thu tiền từ lái xe và chủ hàng:
  * **Bộ phận An ninh:** Thu tiền vé xe vào cổng (`TICKET`) và phí lưu bãi container chốt tại cổng ra (`STORAGE`).
  * **Bộ phận Thương vụ CCKB:** Thu tiền cước dịch vụ cắm điện container lạnh (`REEFER`).
- Hình thức thanh toán hiện trường: **Tiền mặt (TM)** hoặc **Chuyển khoản VietQR (CK)** vào tài khoản ngân hàng của Công ty Cổ phần Tà Lùng Quang Minh.

### 1.2. Nghiệp vụ Kế toán bến bãi theo Sổ sách thực tế công ty
Từ dữ liệu sổ kế toán thực tế (`Mẫu số 01:BPA`, `Bảng lưu đêm`, `Báo cáo thu chi ngày`), phân hệ Kế toán giải quyết 4 bài toán vận hành cốt lõi:
1. **Chốt & Thu gom tiền mặt linh hoạt (Cash Settlement):**
   - Kế toán làm việc giờ hành chính. Thường đi chốt và thu tiền mặt tại bốt lúc **16:00 chiều** (chốt ca ngày) hoặc **08:00 sáng hôm sau** (chốt ca đêm), hoặc bất kỳ thời điểm linh hoạt nào.
   - Sổ sách thực tế theo dõi chặt chẽ khung giờ chốt: **08:00 – 16:00** và **16:00 – 08:00 hôm sau**.
   - Kiểm đếm đối soát 4 mắt (Hiện trường giao — Kế toán nhận), lập Biên bản bàn giao tiền mặt có chữ ký xác nhận của 2 bên: **KẾ TOÁN** và **XÁC NHẬN VẬN HÀNH (Hiện trường)**.
2. **Theo dõi đối soát Chuyển khoản Ngân hàng (VietQR / TK Công ty):**
   - Khách hàng/chủ hàng chuyển khoản thẳng vào tài khoản ngân hàng công ty.
   - Rất nhiều trường hợp chuyển khoản **gộp nhiều cont/lượt xe** (ví dụ: chuyển 1 món 11.483.000đ cho 10 phiên điện, 38.716.000đ cho nhiều xe, 50.000.000đ cọc/thanh toán lô).
   - Kế toán theo dõi "Ngày ghi nhận doanh thu", "Ngày tiền về", và "Ghi chú khớp món chuyển khoản" để đối soát sao kê ngân hàng.
3. **Quản lý Xuất Hóa đơn GTGT đa đối tượng (CCCD & MST):**
   - **Thực tế Sơn Cảng:** Phần lớn lái xe / chủ hàng là **Cá nhân yêu cầu xuất theo thông tin Căn cước công dân (CCCD)**: Họ tên lái xe/người mua, Số CCCD (12 chữ số), Địa chỉ thường trú (vd: Hải Phòng, Hải Dương, Hà Tĩnh, Ninh Bình, Bắc Giang, Nghệ An...).
   - Nhóm đối tượng thứ hai là **Doanh nghiệp có Mã số thuế (MST)** (vd: Công ty CPTM XNK Thiên An - MST 0200923894, Công ty Cổ phần VIMC Logistics...).
   - **Quy tắc Thuế VAT:** Biểu phí niêm yết hiện trường (Vé 250k, Điện 100k/h, Lưu bãi 100k/đêm) là **Giá đã bao gồm VAT (Gross)**. Khi Kế toán xuất hóa đơn GTGT (8% hoặc 10%), hệ thống tự bóc tách:
     $$\text{Doanh thu trước thuế} = \frac{\text{Tổng tiền thanh toán}}{1 + \text{Thuế suất}}$$
     $$\text{Thuế VAT} = \text{Tổng tiền thanh toán} - \text{Doanh thu trước thuế}$$
     Tổng tiền hóa đơn khớp 100% với số tiền đã thu trong sổ cái.
   - **Chính sách hóa đơn công nợ:** Hỗ trợ cả 2 chế độ:
     * *Chế độ 1 (Mặc định hiện tại):* Thu tiền xong 100% mới gom lập hóa đơn.
     * *Chế độ 2 (Mở rộng B2B):* Cho phép lập và xuất Hóa đơn GTGT + Bảng kê chi tiết gửi trước cho đối tác để phòng tài chính công ty họ giải ngân thanh toán sau.
4. **Quản lý Công nợ & Đối tác quen (AP07):**
   - Quản lý các lượt cont/xe nợ cước xuất bãi theo ngoại lệ AP07.
   - Kế toán có quyền thu hồi nợ trực tiếp bằng tiền mặt hoặc chuyển khoản.

---

## 2. Mục tiêu, Giới hạn & Chống mục tiêu (Goals, Non-goals, Anti-goals)

### 2.1. Mục tiêu (Goals)
1. **Chốt thu tiền mặt hiện trường:**
   - Hỗ trợ mốc chốt linh hoạt (bất kỳ thời điểm nào, mặc định tính từ lần chốt trước đến hiện tại).
   - Phân loại rõ điểm chốt: Bốt Cổng An ninh, Quầy Thương vụ CCKB, hoặc Toàn bãi.
   - Nhập tiền thực đếm, tính chênh lệch tự động, ghi nhận lý do nếu có lệch.
   - Sinh mã biên bản bàn giao duy nhất: `BB-YYYYMMDD-HHmm-DEPT`.
   - In Biên bản bàn giao tiền mặt chuẩn form kế toán có chữ ký Kế toán & Vận hành.
2. **Quản lý Xuất Hóa đơn MST & CCCD:**
   - Bộ lọc gom các khoản thu (Vé cổng, Điện lạnh, Lưu bãi) theo Khách hàng, Container, Biển số xe.
   - Form thông tin người mua chuyển đổi linh hoạt giữa `[ 👤 Cá nhân (CCCD) ]` (Họ tên, CCCD 12 số, Địa chỉ, SĐT) và `[ 🏢 Doanh nghiệp (MST) ]` (Tên công ty, MST, Địa chỉ, Email).
   - Tự động tính tiền trước thuế, thuế VAT (8% hoặc 10%), tổng thanh toán.
   - Quản lý trạng thái: `PREPARED` (Chờ xuất HĐ) -> `INVOICED` (Đã xuất HĐĐT, ghi nhận Số hóa đơn, Ngày ký) -> `CANCELLED`.
   - In **Bảng kê chi tiết đính kèm hóa đơn** chuẩn form `Mẫu số 01:BPA`.
3. **Quản lý Công nợ & Thu nợ:**
   - Theo dõi danh sách container/xe nợ theo từng Khách hàng.
   - Cung cấp chức năng `[ Thu Nợ ]` do Kế toán thực hiện (ghi nhận vào sổ cái `app_payments` với phòng ban `KE_TOAN`).
4. **Báo cáo Doanh thu & Sổ quỹ Kế toán:**
   - Báo cáo phân loại theo Nguồn thu (Vé xe, Điện lạnh, Lưu bãi, Xe bo).
   - Phân loại theo Dòng tiền (Tiền mặt đã nộp về quỹ vs Tiền mặt tại bốt vs Tiền chuyển khoản ngân hàng).
   - Xuất file Excel (.xlsx) chuẩn OpenXML bằng ExcelJS với 4 sheet chi tiết: Doanh thu dòng tiền, Bảng kê chốt tiền mặt, Sổ hóa đơn MST/CCCD, Sổ theo dõi công nợ.

### 2.2. Giới hạn V1 (Non-goals)
- V1 chưa kết nối trực tiếp API máy chủ Hóa đơn điện tử (VNPT/Viettel/Misa) mà quản lý số hóa đơn và bảng kê nội bộ.
- V1 chưa kết nối Webhook ngân hàng tự động (đối soát chuyển khoản bán tự động theo sao kê).

### 2.3. Chống mục tiêu (Anti-goals — Nghiêm cấm)
- **KHÔNG xóa hoặc ghi đè** bất kỳ khoản thanh toán (`app_payments`) hoặc khoản phải thu (`app_charges`) nào của hiện trường.
- **KHÔNG sửa trực tiếp** bảng `app_payments` (giữ nguyên trigger bảo vệ bất biến `sc_trg_prevent_payment_modification`). Sử dụng bảng quan hệ trung gian `app_cash_settlement_items` để liên kết đợt chốt với các phiếu thu.
- **KHÔNG tính trùng** tiền mặt đã nộp quỹ vào các đợt chốt tiếp theo.
- **KHÔNG gộp** lượt xe và lượt container.

---

## 3. Kiến trúc Cơ sở Dữ liệu & Database Schema (Migration 28)

### 3.1. Danh mục Bộ phận, Quyền & Vai trò Kế toán
- **Bộ phận:** `KE_TOAN` (Bộ phận Kế toán - Tài chính).
- **Vai trò:** `ACCOUNTANT` (Kế toán Bến bãi).
- **Quyền hạn cấp cho `ACCOUNTANT`:**
  * `accounting.shift_cash.collect`: Chốt và thu gom tiền mặt hiện trường.
  * `accounting.invoice.prepare`: Lập hồ sơ và quản lý xuất hóa đơn GTGT theo MST hoặc CCCD.
  * `accounting.debt.manage`: Quản lý và thu hồi công nợ khách hàng bến bãi.
  * `accounting.reports.view`: Xem báo cáo doanh thu tổng hợp và sổ quỹ.
  * Kế thừa: `report.revenue.read`, `report.revenue.export`, `vehicle.visit.read`, `container.visit.read`, `reefer.session.read`, `tariff.read`.

### 3.2. Bảng `app_cash_settlements` (Đợt chốt & gom tiền mặt)
```sql
CREATE TABLE public.app_cash_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_code text NOT NULL UNIQUE,       -- BB-YYYYMMDD-HHmm-DEPT
  yard_id uuid REFERENCES public.app_yards(id),
  collector_id uuid,                          -- Kế toán đi thu
  collector_name text NOT NULL,               -- Bùi Thị Lan (Kế toán)
  handover_dept text NOT NULL CHECK (handover_dept IN ('AN_NINH', 'CCKB', 'ALL')),
  period_from timestamptz NOT NULL,           -- Từ mốc chốt trước
  period_to timestamptz NOT NULL,             -- Đến thời điểm chốt hiện tại
  total_cash_expected numeric NOT NULL DEFAULT 0,  -- Tiền mặt sổ sách tính toán
  total_cash_counted numeric NOT NULL DEFAULT 0,   -- Tiền mặt thực đếm bàn giao
  difference_amount numeric NOT NULL DEFAULT 0,    -- Chênh lệch (thực đếm - sổ sách)
  total_transfer_amount numeric NOT NULL DEFAULT 0,-- Tiền chuyển khoản cùng kỳ (chỉ đối soát)
  difference_reason text,                     -- Lý do chênh lệch (nếu có)
  handover_person_name text NOT NULL,         -- Người bàn giao đại diện hiện trường
  notes text,
  status text NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'DRAFT', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 3.3. Bảng `app_cash_settlement_items` (Bảo toàn tính bất biến của sổ cái)
Thay vì sửa trực tiếp bảng `app_payments` (bị trigger bất biến chặn), sử dụng bảng quan hệ:
```sql
CREATE TABLE public.app_cash_settlement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES public.app_cash_settlements(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.app_payments(id),
  settled_amount numeric NOT NULL,
  payment_method text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(settlement_id, payment_id)
);
```
Một khoản thanh toán `payment_id` chỉ được nằm trong tối đa 1 đợt chốt hoàn tất (`UNIQUE` hoặc kiểm tra `NOT EXISTS`).

### 3.4. Bảng `app_invoices` (Quản lý Xuất Hóa đơn MST & CCCD)
```sql
CREATE TABLE public.app_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_code text NOT NULL UNIQUE,          -- HD-YYYYMMDD-XXXX
  yard_id uuid REFERENCES public.app_yards(id),
  invoice_type text NOT NULL CHECK (invoice_type IN ('COMPANY', 'INDIVIDUAL')),
  buyer_name text NOT NULL,                   -- Tên công ty HOẶC Họ tên cá nhân
  tax_code text,                              -- Mã số thuế (nếu COMPANY)
  id_card_no text,                            -- Số CCCD 12 số (nếu INDIVIDUAL)
  buyer_address text NOT NULL,                -- Địa chỉ thường trú / doanh nghiệp
  buyer_email text,                           -- Email nhận HĐĐT
  buyer_phone text,                           -- Số điện thoại liên hệ
  vat_rate numeric NOT NULL DEFAULT 8,        -- Thuế suất VAT (8% hoặc 10%)
  subtotal_amount numeric NOT NULL DEFAULT 0, -- Doanh thu trước thuế (tách ngược)
  vat_amount numeric NOT NULL DEFAULT 0,      -- Tiền thuế VAT
  total_amount numeric NOT NULL DEFAULT 0,    -- Tổng tiền thanh toán (bằng tổng các khoản thu gộp)
  status text NOT NULL DEFAULT 'PREPARED' CHECK (status IN ('PREPARED', 'INVOICED', 'CANCELLED')),
  payment_status text NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'UNPAID')),
  e_invoice_no text,                          -- Số HĐĐT chính thức (vd: 0001234)
  invoice_issued_at timestamptz,              -- Ngày giờ phát hành HĐĐT
  notes text,
  created_by text NOT NULL,                   -- Người lập (Kế toán)
  charge_ids text[] DEFAULT '{}',             -- Mảng ID các khoản thu gom vào hóa đơn
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 3.5. Cập nhật Ràng buộc Bộ phận Thu tiền (`collector_dept`)
Mở rộng bảng `app_payments`:
```sql
-- Cho phép bộ phận KE_TOAN được ghi nhận giao dịch thu nợ
ALTER TABLE public.app_payments DROP CONSTRAINT IF EXISTS app_payments_collector_dept_check;
ALTER TABLE public.app_payments ADD CONSTRAINT app_payments_collector_dept_check 
  CHECK (collector_dept IN ('AN_NINH', 'CCKB', 'KE_TOAN'));
```

### 3.6. Các hàm RPC Server-side bảo mật (`SECURITY DEFINER`)
1. `sc_confirm_cash_settlement`:
   - Tính toán tiền mặt và chuyển khoản phát sinh trong khoảng thời gian `period_from` đến `period_to` chưa được chốt (`NOT IN (SELECT payment_id FROM app_cash_settlement_items)`).
   - Tạo đợt chốt `app_cash_settlements`.
   - Chèn các bản ghi vào `app_cash_settlement_items`.
   - Ghi nhật ký kiểm toán `app_audit_events`.
2. `sc_accounting_collect_debt`:
   - Kế toán thu nợ tiền mặt hoặc chuyển khoản cho các khoản nợ `app_charges.status = 'UNPAID'`.
   - Ghi nhận `app_payments` với `collector_dept = 'KE_TOAN'`.
   - Cập nhật `app_charges.status = 'PAID'`.
   - Nếu thu tiền mặt, tự động chèn vào bảng chốt quỹ để không bị lẫn vào bốt hiện trường.
3. `sc_prepare_invoice` & `sc_issue_invoice`:
   - Lập và phát hành hóa đơn, cập nhật trạng thái `app_charges.invoice_status`.

---

## 4. Thiết kế Giao diện Người Dùng (UI/UX) Phân Hệ Kế Toán (`/accounting`)

### 4.1. Điều hướng và Menu
- Thêm menu **Kế toán & Hóa đơn** (`/accounting`, Icon: `Landmark`) vào Navbar / Sidebar.
- Phân quyền: Chỉ hiển thị cho vai trò `ACCOUNTANT` và `SYS_ADMIN`.
- Cấu trúc trang gồm 4 Tab chính:
  1. `[ 💵 Chốt Tiền Hiện Trường ]`: Tạo đợt chốt tiền mặt linh hoạt, in Biên bản bàn giao ca trực.
  2. `[ 🧾 Quản Lý Hóa Đơn (MST & CCCD) ]`: Lập hóa đơn gom cho doanh nghiệp (MST) hoặc cá nhân (CCCD), ghi nhận số HĐĐT, in Bảng kê chi tiết.
  3. `[ 📊 Công Nợ Bến Bãi ]`: Theo dõi danh sách cont/xe nợ cước theo AP07, thu hồi nợ.
  4. `[ 📈 Báo Cáo Sổ Quỹ ]`: Thống kê tổng hợp dòng tiền theo ngày, xuất file Excel đa sheet.

### 4.2. Tab 1: Chốt Tiền Hiện Trường (Cash Settlement)
- **Thẻ KPI thời gian thực:**
  * Tiền mặt chờ thu bốt Cổng An ninh: Số tiền mặt An ninh đang giữ chưa nộp.
  * Tiền mặt chờ thu quầy Thương vụ CCKB: Số tiền mặt CCKB đang giữ chưa nộp.
  * Tiền mặt đã thu về Quỹ hôm nay.
  * Tiền chuyển khoản VietQR trong kỳ (đối soát ngân hàng).
- **Thao tác tạo đợt chốt:**
  * Chọn điểm chốt: `Bộ phận An ninh`, `Thương vụ CCKB`, hoặc `Tất cả hiện trường`.
  * Tự động lấy mốc chốt lần trước làm mốc bắt đầu, mốc kết thúc là hiện tại (cho phép tùy chỉnh).
  * Nút `➕ Tạo Đợt Chốt Thu Tiền Mặt`.
- **Modal Chốt Thu Tiền Mặt:**
  * Danh sách chi tiết các phiếu thu tiền mặt trong kỳ (Biển số xe, Cont, Giờ thu, Người thu, Số tiền).
  * Khung kiểm đếm tiền: Số tiền hệ thống kỳ vọng vs Ô nhập số tiền mặt thực đếm của Kế toán.
  * Hiển thị chênh lệch tự động: Màu xanh nếu khớp (`0 đ`), màu đỏ/vàng nếu lệch kèm ô nhập `Lý do chênh lệch` bắt buộc.
  * Nhập họ tên người đại diện ca trực hiện trường bàn giao tiền.
  * Bấm `Xác nhận Thu Tiền Về Quỹ & In Biên Bản`.
- **Mẫu In Biên Bản Bàn Giao Tiền Mặt (Print Preview):**
  * Tiêu đề: **CÔNG TY CỔ PHẦN TÀ LÙNG QUANG MINH — BIÊN BẢN BÀN GIAO TIỀN MẶT CA TRỰC BẾN BÃI SƠN CẢNG**.
  * Mã biên bản: `BB-YYYYMMDD-HHmm-DEPT`.
  * Ngày giờ chốt, địa điểm, đại diện giao (hiện trường), đại diện nhận (kế toán).
  * Tổng số tiền bằng số và bằng chữ, chênh lệch (nếu có).
  * Bảng chữ ký: Đại diện Bên giao (Ký, họ tên) — Đại diện Bên nhận (Kế toán ký, họ tên).

### 4.3. Tab 2: Quản Lý Hóa Đơn (Hỗ trợ Doanh nghiệp MST & Cá nhân CCCD)
- **Nút hành động:** `➕ Lập Đề Nghị Xuất Hóa Đơn`.
- **Modal Lập Hóa Đơn:**
  * **Bước 1: Chọn các khoản thu cần gom hóa đơn:**
    - Tìm kiếm theo Khách hàng, Container, Biển số xe.
    - Checkbox chọn các khoản thu (Vé cổng, Cước điện, Phí lưu bãi).
    - Hiển thị danh sách và tổng số tiền gộp.
  * **Bước 2: Thông tin Người Mua (Toggle chuyển đổi 2 chế độ):**
    - Chế độ `[ 🏢 Doanh nghiệp (MST) ]`:
      + Tên doanh nghiệp / Đơn vị mua hàng (Bắt buộc).
      + Mã số thuế (MST) (Bắt buộc, tự động kiểm tra 10 hoặc 13 số).
      + Địa chỉ doanh nghiệp (Bắt buộc).
      + Email nhận HĐĐT, Người đại diện.
    - Chế độ `[ 👤 Cá nhân (CCCD) ]`:
      + Họ và tên người mua hàng (Bắt buộc, vd: VŨ TIẾN THÀNH, PHẠM HOÀNG THÁI...).
      + **Số Căn cước công dân (CCCD)** (Bắt buộc, 12 chữ số, vd: `031077007508`).
      + Địa chỉ thường trú (Bắt buộc, vd: Vĩnh Bảo, Hải Phòng).
      + Số điện thoại liên hệ, Email nhận HĐĐT (nếu có).
  * **Bước 3: Bóc tách Thuế VAT:**
    - Chọn thuế suất: `8%` hoặc `10%` hoặc `Không chịu thuế`.
    - Tự động tách ngược tiền trước thuế và tiền thuế VAT (Tổng tiền thanh toán bằng đúng số tiền đã thu gộp).
  * **Bước 4: Xác nhận lập hồ sơ:** Lưu vào danh sách ở trạng thái `CHỜ XUẤT HĐ` (`PREPARED`).
- **Thao tác trên Danh sách Hóa đơn:**
  * `[ Ghi nhận Số HĐĐT ]`: Nhập Số hóa đơn điện tử chính thức (vd: `0004521`), Ký hiệu, Ngày phát hành để chuyển sang `ĐÃ XUẤT HĐĐT` (`INVOICED`).
  * `[ In Bảng kê Đính kèm ]`: Mẫu in chuẩn `Mẫu số 01:BPA` (Số cont, Biển xe, Người mua hàng, Số CCCD, Địa chỉ, Thời gian vào/ra, Số giờ/đêm, Thành tiền).

### 4.4. Tab 3: Quản Lý Công Nợ Bến Bãi
- Thống kê tổng dư nợ toàn bãi, nợ cước điện lạnh CCKB, nợ vé/lưu bãi An ninh.
- Danh sách công nợ theo Khách hàng: Tên khách hàng, SĐT, số lượng cont/xe nợ, chi tiết từng khoản nợ.
- Nút `[ Ghi nhận Thu Nợ ]`: Modal thu tiền nợ khách hàng (chọn Tiền mặt hoặc Chuyển khoản), tự động gạch nợ trong sổ cái.

### 4.5. Tab 4: Báo Cáo Sổ Quỹ & Xuất File Excel
- Thống kê doanh thu theo ngày / tuần / tháng.
- Phân tích cơ cấu dòng tiền: Tiền mặt về quỹ vs Tiền mặt tại bốt vs Tiền chuyển khoản ngân hàng.
- Nút `[ Xuất Excel Báo Cáo Kế Toán (.xlsx) ]`: Xuất file Excel 4 sheet chuẩn kế toán qua `ExcelJS`.

---

## 5. Kế Hoạch Triển Khai Cho Đội Ngũ Lập Trình (Implementation Steps)

1. **Migration 28 (`20261014000028_accounting_settlement_and_invoicing.sql`):**
   - Tạo bộ phận `KE_TOAN`, vai trò `ACCOUNTANT`.
   - Cấp 4 permissions kế toán.
   - Tạo bảng `app_cash_settlements`, bảng quan hệ `app_cash_settlement_items`, bảng `app_invoices`.
   - Mở rộng check constraint `collector_dept` trên `app_payments` cho phép `KE_TOAN`.
   - Tạo các RPC `sc_confirm_cash_settlement`, `sc_accounting_collect_debt`, `sc_prepare_invoice`, `sc_issue_invoice`.
   - Seed tài khoản kế toán `acc_01@soncang.vn` (Bùi Thị Lan).
   - Đẩy migration lên Supabase Cloud Database qua `npx supabase db push`.
2. **Domain Types & Repository Layer:**
   - Thêm types: `CashSettlement`, `CashSettlementItem`, `YardInvoice`, `InvoiceType`.
   - Cập nhật interface `IRepository`, `demo-repository.ts` và `supabase-repository.ts`.
3. **Frontend Implementation:**
   - Thêm menu Kế toán vào `AppShell`.
   - Dựng trang `/accounting` với 4 tab hoàn chỉnh, responsive, styling công nghiệp chuẩn Sơn Cảng.
   - Xây dựng các Modals: Chốt tiền mặt, Lập hóa đơn MST & CCCD, Ghi nhận số HĐĐT, Thu nợ.
   - Xây dựng 2 mẫu in ấn (Print Template): Biên bản bàn giao tiền mặt và Bảng kê chi tiết hóa đơn.
   - Tích hợp hàm xuất file Excel báo cáo kế toán.
4. **Kiểm thử & Bàn giao:**
   - Kiểm tra toàn bộ luồng chốt tiền và xuất hóa đơn trên database Cloud DEV.
   - `npm run build` xác minh 0 lỗi TypeScript.
   - Cập nhật nhật ký dự án (`CURRENT_STATUS.md`, `DECISION_LOG.md`, `WORK_LOG.md`).
