-- ==============================================================================
-- CLEAN_ALL_STAFF_KEEP_SUPER_ADMIN.SQL
-- Mục đích: Dọn dẹp toàn bộ tài khoản nhân sự tạm/thử nghiệm, chỉ giữ lại DUY NHẤT
-- Super Admin (SYS_ADMIN) để người dùng tự tạo mới toàn bộ tài khoản thực tế.
-- ==============================================================================

BEGIN;

-- 1. Xóa các phân quyền vai trò của các tài khoản nhân viên tạm
DELETE FROM public.app_user_role_assignments 
WHERE user_id != 'a4dbb64f-a8be-4fa1-995c-4e50423c840f';

-- 2. Đảm bảo Super Admin luôn có vai trò SYS_ADMIN và trạng thái kích hoạt (is_active = true)
INSERT INTO public.app_user_role_assignments (
  id,
  user_id,
  role_code,
  department_code,
  yard_id,
  is_active,
  created_by
) VALUES (
  'ff92fd04-a72c-4017-82b0-a8645fa1a20f',
  'a4dbb64f-a8be-4fa1-995c-4e50423c840f',
  'SYS_ADMIN',
  'HE_THONG',
  NULL,
  true,
  'a4dbb64f-a8be-4fa1-995c-4e50423c840f'
)
ON CONFLICT (id) DO UPDATE SET
  role_code = 'SYS_ADMIN',
  department_code = 'HE_THONG',
  yard_id = NULL,
  is_active = true;

-- 3. Xóa các tài khoản tạm trong auth.users (chỉ giữ lại tài khoản Super Admin)
DELETE FROM auth.users 
WHERE id != 'a4dbb64f-a8be-4fa1-995c-4e50423c840f';

-- 4. Dọn dẹp bảng app_staff_users: Xóa toàn bộ dữ liệu cũ
DELETE FROM public.app_staff_users;

-- Thêm lại duy nhất tài khoản Super Admin đã liên kết với auth_user_id
INSERT INTO public.app_staff_users (
  id,
  auth_user_id,
  full_name,
  email,
  phone,
  role_code,
  department_code,
  yard_id,
  is_active,
  notes,
  created_at,
  updated_at
) VALUES (
  '20000000-0000-0000-0000-000000000010',
  'a4dbb64f-a8be-4fa1-995c-4e50423c840f',
  'Ban Quản trị Hệ thống (Super Admin)',
  'sys_admin_uat@example.com',
  '0988 888 999',
  'SYS_ADMIN',
  'HE_THONG',
  NULL,
  true,
  'Tài khoản Quản trị cấp cao nhất (Super Admin) - Toàn quyền quản trị nhân sự, phân quyền vai trò, quản lý biểu phí và audit logs',
  now(),
  now()
);

-- 5. Ghi nhận Audit Event việc làm sạch nhân sự
ALTER TABLE public.app_audit_events DISABLE TRIGGER trg_sc_audit_immutable;

INSERT INTO public.app_audit_events (
  action_code,
  actor_user_id,
  target_type,
  target_id,
  reason,
  department_code,
  event_at
) VALUES (
  'CLEAN_STAFF_KEEP_SUPER_ADMIN_ONLY',
  'a4dbb64f-a8be-4fa1-995c-4e50423c840f',
  'USER_MANAGEMENT',
  'a4dbb64f-a8be-4fa1-995c-4e50423c840f',
  'Dọn dẹp toàn bộ tài khoản nhân viên tạm, chỉ giữ lại duy nhất Super Admin để bắt đầu thiết lập nhân sự thực tế',
  'HE_THONG',
  now()
);

ALTER TABLE public.app_audit_events ENABLE TRIGGER trg_sc_audit_immutable;

COMMIT;
