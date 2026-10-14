-- ==============================================================================
-- MIGRATION 20261014000027: QUẢN TRỊ MẬT KHẨU NHÂN SỰ & NHẬT KÝ KIỂM TOÁN
-- Mục đích:
--   1. Bổ sung các trường quản lý đặt lại mật khẩu trong app_staff_users:
--      - password_reset_at: Thời điểm reset mật khẩu gần nhất
--      - must_change_password: Cờ bắt buộc đổi mật khẩu ở lần đăng nhập tiếp theo
--      - temp_password_hint: Gợi ý mật khẩu tạm (dành cho bàn giao ca trực nội bộ)
--   2. Hàm RPC sc_admin_reset_staff_password: Admin/Trưởng ca đặt lại mật khẩu & tự động ghi vết audit
--   3. Hàm RPC sc_user_change_password_audit: Ghi vết khi người dùng tự đổi mật khẩu cá nhân
-- ==============================================================================

BEGIN;

-- 1. Bổ sung cột nếu chưa có trong app_staff_users
ALTER TABLE public.app_staff_users 
  ADD COLUMN IF NOT EXISTS password_reset_at timestamptz,
  ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS temp_password_hint text;

-- 2. RPC Admin/Lead đặt lại mật khẩu nhân viên
CREATE OR REPLACE FUNCTION public.sc_admin_reset_staff_password(
  p_staff_id uuid,
  p_new_password_hint text,
  p_reason text,
  p_must_change boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_staff record;
  v_actor_id uuid;
  v_actor_email text;
BEGIN
  -- Lấy actor ID hiện tại
  v_actor_id := auth.uid();
  IF v_actor_id IS NOT NULL THEN
    SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor_id;
  ELSE
    v_actor_email := 'sys_admin@soncang.vn';
  END IF;

  -- Kiểm tra sự tồn tại của nhân sự
  SELECT * INTO v_staff FROM public.app_staff_users WHERE id = p_staff_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Không tìm thấy nhân sự trong hệ thống'
    );
  END IF;

  -- Cập nhật thông tin mật khẩu tạm và cờ bắt buộc đổi MK
  UPDATE public.app_staff_users
  SET 
    password_reset_at = now(),
    must_change_password = COALESCE(p_must_change, true),
    temp_password_hint = p_new_password_hint,
    updated_at = now()
  WHERE id = p_staff_id;

  -- Tự động ghi nhật ký kiểm toán bất biến (Audit Events)
  INSERT INTO public.app_audit_events (
    actor_user_id,
    action_code,
    target_type,
    target_id,
    yard_id,
    department_code,
    before_data,
    after_data,
    reason
  ) VALUES (
    v_actor_id,
    'staff.password.reset',
    'STAFF_USER',
    p_staff_id::text,
    v_staff.yard_id,
    v_staff.department_code,
    jsonb_build_object(
      'email', v_staff.email,
      'full_name', v_staff.full_name,
      'previous_reset_at', v_staff.password_reset_at
    ),
    jsonb_build_object(
      'email', v_staff.email,
      'full_name', v_staff.full_name,
      'must_change_password', p_must_change,
      'reset_at', now(),
      'reset_by', v_actor_email
    ),
    COALESCE(p_reason, 'Admin đặt lại mật khẩu nhân viên trực ca')
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Đặt lại mật khẩu cho nhân viên thành công',
    'staff_id', p_staff_id,
    'email', v_staff.email,
    'reset_at', now()
  );
END;
$$;

-- 3. RPC Ghi vết kiểm toán khi người dùng tự đổi mật khẩu cá nhân
CREATE OR REPLACE FUNCTION public.sc_user_change_password_audit(
  p_email text,
  p_reason text DEFAULT 'Người dùng chủ động đổi mật khẩu định kỳ'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor_id uuid;
  v_staff record;
BEGIN
  v_actor_id := auth.uid();
  
  -- Tìm nhân viên tương ứng qua email hoặc auth_user_id
  SELECT * INTO v_staff 
  FROM public.app_staff_users 
  WHERE email = p_email OR (v_actor_id IS NOT NULL AND auth_user_id = v_actor_id)
  LIMIT 1;

  -- Nếu tìm thấy nhân sự, hủy cờ must_change_password và xóa mật khẩu tạm
  IF FOUND THEN
    UPDATE public.app_staff_users
    SET 
      must_change_password = false,
      temp_password_hint = NULL,
      updated_at = now()
    WHERE id = v_staff.id;
  END IF;

  -- Ghi nhận sự kiện kiểm toán
  INSERT INTO public.app_audit_events (
    actor_user_id,
    action_code,
    target_type,
    target_id,
    yard_id,
    department_code,
    after_data,
    reason
  ) VALUES (
    v_actor_id,
    'user.password.change',
    'USER_ACCOUNT',
    p_email,
    v_staff.yard_id,
    v_staff.department_code,
    jsonb_build_object(
      'email', p_email,
      'changed_at', now()
    ),
    p_reason
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Đã ghi nhận sự kiện đổi mật khẩu thành công'
  );
END;
$$;

-- 4. Phân quyền thực thi
GRANT EXECUTE ON FUNCTION public.sc_admin_reset_staff_password(uuid, text, text, boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_user_change_password_audit(text, text) TO anon, authenticated;

COMMIT;
