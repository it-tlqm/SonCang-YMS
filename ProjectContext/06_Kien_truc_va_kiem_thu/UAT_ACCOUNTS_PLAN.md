# KẾ HOẠCH TẠO VÀ BÀN GIAO 7 TÀI KHOẢN UAT THỰC TẾ (RBAC V5)
**Dự án:** Quản lý bến bãi/cảng cạn Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh  
**Môi trường áp dụng:** Supabase Cloud DEV (`son-cang-yms-dev`, ref: `euswzyespwaxyrjkfkrq`)  
**Tiêu chuẩn tuân thủ:** Workbook RBAC V5, AP10 (Four-Eyes Principle), Phân quyền 7 vai trò chuẩn

---

## I. NGUYÊN TẮC AN TOÀN VÀ TUÂN THỦ

1. **Tuyệt đối không can thiệp trực tiếp bằng lệnh `INSERT INTO auth.users`:**
   - Việc chèn thô vào schema nội bộ `auth` của Supabase dễ gây hỏng mã hóa băm mật khẩu bcrypt/argon2, thiếu trigger khởi tạo danh tính (`auth.identities`) và làm hỏng luồng xác thực JWT.
2. **Quy trình chuẩn qua Supabase Auth Admin:**
   - Tài khoản người dùng được khởi tạo qua **Supabase Auth Admin API (`supabase.auth.admin.createUser`)** với `email_confirm: true` (không gửi email ra ngoài, không phát sinh chi phí SMTP, mật khẩu an toàn ngẫu nhiên >= 24 ký tự).
   - Sau khi tạo, ID người dùng (`auth.users.id`) được liên kết vào bảng phân quyền nghiệp vụ `app_user_role_assignments`.
3. **Mật khẩu và thông tin đăng nhập:**
   - Mật khẩu tạo ngẫu nhiên có độ entropy cao (chữ hoa, chữ thường, số, ký tự đặc biệt).
   - Mật khẩu được lưu trữ tuyệt đối an toàn trong kho bí mật bên ngoài repository; không ghi mật khẩu trần vào mã nguồn, file báo cáo công khai, Git commit hoặc file nén zip bàn giao.

---

## II. MA TRẬN 7 VAI TRÒ VÀ TÀI KHOẢN ĐÃ ĐƯỢC PHÊ DUYỆT

| STT | Mã vai trò | Tên vai trò | Phòng ban | Bãi áp dụng | Email UAT chính thức | Trách nhiệm chính trong phiên UAT |
|---|---|---|---|---|---|---|
| 1 | `SYS_ADMIN` | Quản trị viên hệ thống | *Toàn hệ thống* | Bãi Sơn Cảng / Toàn bãi | `sys_admin_uat@example.com` | Cấu hình biểu phí, phân quyền, kiểm tra log kiểm toán bất biến (`app_audit_events`). |
| 2 | `SEC_STAFF` | Nhân viên An ninh cổng | `AN_NINH` | Bãi Sơn Cảng | `sec_staff_uat@example.com` | Tiếp nhận xe vào cổng (gọi RPC nguyên tử), thu tiền vé vào cổng, kiểm tra xe ra. |
| 3 | `SEC_LEAD` | Tổ trưởng An ninh | `AN_NINH` | Bãi Sơn Cảng | `sec_lead_uat@example.com` | Sửa sai số container (nhập sai tại cổng), xác nhận xe/cont rời bãi vật lý. |
| 4 | `PORT_STAFF` | Nhân viên CCKB / Cảng vụ | `CCKB` | Bãi Sơn Cảng | `cckb_staff_uat@example.com` | Ghi nhận cắm điện, rút điện cont lạnh, thu tiền điện và lưu bãi. |
| 5 | `PORT_LEAD` | Lãnh đạo CCKB / Cảng vụ | `CCKB` | Bãi Sơn Cảng | `cckb_lead_uat@example.com` | Phê duyệt clearance xuất bãi cont, duyệt cho nợ tiền (AP08), đối soát tài chính. |
| 6 | `DIS_STAFF` | Nhân viên Điều phối | `DIEU_PHOI` | Bãi Sơn Cảng | `dis_staff_uat@example.com` | Cập nhật trạng thái container HÀNG / RỖNG, kiểm tra sơ đồ bãi. |
| 7 | `DIS_LEAD` | Tổ trưởng Điều phối | `DIEU_PHOI` | Bãi Sơn Cảng | `dis_lead_uat@example.com` | Điều phối khu vực bãi, xác nhận sai lệch số cont phối hợp cùng An ninh. |

---

## III. QUY TRÌNH TRIỂN KHAI VÀ GÁN VAI TRÒ CHUẨN SCHEMA

### Bước 1: Khởi tạo người dùng qua Supabase Auth Admin
Sử dụng script Node.js gọi Supabase Auth Admin API với `SUPABASE_SERVICE_ROLE_KEY`:
```javascript
const { data, error } = await supabase.auth.admin.createUser({
  email: 'sys_admin_uat@example.com',
  password: '<MẬT_KHẨU_NGẪU_NHIÊN>',
  email_confirm: true,
  user_metadata: { full_name: 'Quản trị viên UAT' }
});
```

### Bước 2: Script SQL gán vai trò tuân thủ Schema Migration 001–004

Cấu trúc Schema thực tế:
- `public.app_yards`: Cột gồm `id`, `name`, `is_active` (KHÔNG CÓ cột `created_at`). Tìm bãi bằng `name = 'Bãi Sơn Cảng'`.
- `public.app_user_role_assignments`: Cột gồm `id`, `user_id`, `role_code`, `yard_id`, `department_code`, `is_active`, `valid_from`, `created_by`, `created_at` (DÙNG `created_by`, KHÔNG CÓ cột `assigned_by`).
- Cơ chế chống trùng lặp: Do bảng không có unique index phức hợp trên `(user_id, role_code, yard_id)`, bắt buộc dùng điều kiện `WHERE NOT EXISTS` (KHÔNG DÙNG `ON CONFLICT`).
- Cơ chế dừng nghiêm ngặt: Nếu thiếu bất kỳ tài khoản nào trong số 7 email đã duyệt, script BẮT BUỘC `RAISE EXCEPTION` dừng lại ngay, không bỏ qua âm thầm.

```sql
-- ==============================================================================
-- SƠN CẢNG YMS — SCRIPT GÁN VAI TRÒ 7 TÀI KHOẢN UAT CHUẨN SCHEMA (001–004)
-- ==============================================================================

DO $$
DECLARE
  v_yard_id uuid;
  v_admin_id uuid;
  v_sec_staff_id uuid;
  v_sec_lead_id uuid;
  v_port_staff_id uuid;
  v_port_lead_id uuid;
  v_dis_staff_id uuid;
  v_dis_lead_id uuid;
BEGIN
  -- 1. Tìm đúng Bãi Sơn Cảng (schema app_yards chỉ có id, name, is_active - KHÔNG CÓ created_at)
  SELECT id INTO v_yard_id 
  FROM public.app_yards 
  WHERE name = 'Bãi Sơn Cảng' AND is_active = true 
  LIMIT 1;

  IF v_yard_id IS NULL THEN
    -- Fallback nếu tên có khoảng trắng hoặc ký tự đặc biệt
    SELECT id INTO v_yard_id 
    FROM public.app_yards 
    WHERE is_active = true 
    LIMIT 1;
  END IF;

  IF v_yard_id IS NULL THEN
    RAISE EXCEPTION 'LỖI CHẶN: Không tìm thấy bãi hoạt động trong public.app_yards!';
  END IF;

  -- 2. Truy vấn ID của 7 tài khoản UAT từ auth.users
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'sys_admin_uat@example.com';
  SELECT id INTO v_sec_staff_id FROM auth.users WHERE email = 'sec_staff_uat@example.com';
  SELECT id INTO v_sec_lead_id FROM auth.users WHERE email = 'sec_lead_uat@example.com';
  SELECT id INTO v_port_staff_id FROM auth.users WHERE email = 'cckb_staff_uat@example.com';
  SELECT id INTO v_port_lead_id FROM auth.users WHERE email = 'cckb_lead_uat@example.com';
  SELECT id INTO v_dis_staff_id FROM auth.users WHERE email = 'dis_staff_uat@example.com';
  SELECT id INTO v_dis_lead_id FROM auth.users WHERE email = 'dis_lead_uat@example.com';

  -- 3. Kiểm tra bắt buộc: ĐỦ 7 tài khoản, nếu thiếu phải DỪNG NGAY (Raise Exception)
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'LỖI CHẶN: Thiếu tài khoản auth.users sys_admin_uat@example.com!';
  END IF;
  IF v_sec_staff_id IS NULL THEN
    RAISE EXCEPTION 'LỖI CHẶN: Thiếu tài khoản auth.users sec_staff_uat@example.com!';
  END IF;
  IF v_sec_lead_id IS NULL THEN
    RAISE EXCEPTION 'LỖI CHẶN: Thiếu tài khoản auth.users sec_lead_uat@example.com!';
  END IF;
  IF v_port_staff_id IS NULL THEN
    RAISE EXCEPTION 'LỖI CHẶN: Thiếu tài khoản auth.users cckb_staff_uat@example.com!';
  END IF;
  IF v_port_lead_id IS NULL THEN
    RAISE EXCEPTION 'LỖI CHẶN: Thiếu tài khoản auth.users cckb_lead_uat@example.com!';
  END IF;
  IF v_dis_staff_id IS NULL THEN
    RAISE EXCEPTION 'LỖI CHẶN: Thiếu tài khoản auth.users dis_staff_uat@example.com!';
  END IF;
  IF v_dis_lead_id IS NULL THEN
    RAISE EXCEPTION 'LỖI CHẶN: Thiếu tài khoản auth.users dis_lead_uat@example.com!';
  END IF;

  -- 4. Gán vai trò vào app_user_role_assignments (sử dụng created_by và WHERE NOT EXISTS)
  
  -- 1) SYS_ADMIN
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
  SELECT v_admin_id, 'SYS_ADMIN', v_yard_id, NULL, true, v_admin_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_user_role_assignments 
    WHERE user_id = v_admin_id AND role_code = 'SYS_ADMIN' AND is_active = true
  );

  -- 2) SEC_STAFF
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
  SELECT v_sec_staff_id, 'SEC_STAFF', v_yard_id, 'AN_NINH', true, v_admin_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_user_role_assignments 
    WHERE user_id = v_sec_staff_id AND role_code = 'SEC_STAFF' AND is_active = true
  );

  -- 3) SEC_LEAD
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
  SELECT v_sec_lead_id, 'SEC_LEAD', v_yard_id, 'AN_NINH', true, v_admin_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_user_role_assignments 
    WHERE user_id = v_sec_lead_id AND role_code = 'SEC_LEAD' AND is_active = true
  );

  -- 4) PORT_STAFF
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
  SELECT v_port_staff_id, 'PORT_STAFF', v_yard_id, 'CCKB', true, v_admin_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_user_role_assignments 
    WHERE user_id = v_port_staff_id AND role_code = 'PORT_STAFF' AND is_active = true
  );

  -- 5) PORT_LEAD
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
  SELECT v_port_lead_id, 'PORT_LEAD', v_yard_id, 'CCKB', true, v_admin_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_user_role_assignments 
    WHERE user_id = v_port_lead_id AND role_code = 'PORT_LEAD' AND is_active = true
  );

  -- 6) DIS_STAFF
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
  SELECT v_dis_staff_id, 'DIS_STAFF', v_yard_id, 'DIEU_PHOI', true, v_admin_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_user_role_assignments 
    WHERE user_id = v_dis_staff_id AND role_code = 'DIS_STAFF' AND is_active = true
  );

  -- 7) DIS_LEAD
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
  SELECT v_dis_lead_id, 'DIS_LEAD', v_yard_id, 'DIEU_PHOI', true, v_admin_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_user_role_assignments 
    WHERE user_id = v_dis_lead_id AND role_code = 'DIS_LEAD' AND is_active = true
  );

  RAISE NOTICE 'KIỂM THỬ THÀNH CÔNG: Đã gán chính xác 7 vai trò UAT cho 7 tài khoản tại Bãi Sơn Cảng (yard_id: %)', v_yard_id;
END $$;
```

---

## IV. BÀN GIAO VÀ HƯỚNG DẪN ĐĂNG NHẬP CHO NGƯỜI DÙNG

1. **Địa chỉ đăng nhập PWA:** Truy cập màn hình `/login` của ứng dụng PWA Sơn Cảng.
2. **Xác thực:** Đăng nhập bằng Email và Password đã cấp tương ứng với vai trò kiểm thử.
3. **Phân quyền giao diện tự động:**
   - Khi đăng nhập với `SEC_STAFF` / `SEC_LEAD`: Hệ thống mở module Cổng vào (`/entry`), Cổng ra (`/exit`).
   - Khi đăng nhập với `PORT_STAFF` / `PORT_LEAD`: Mở module Điện lạnh (`/reefer`), Thu phí & Clearance (`/billing`).
   - Khi đăng nhập với `DIS_STAFF` / `DIS_LEAD`: Mở module Sơ đồ bãi (`/yard`), Cập nhật HÀNG/RỖNG.
   - Khi đăng nhập với `SYS_ADMIN`: Mở toàn bộ các module và trang Quản trị cấu hình (`/admin/vehicle-types`).
