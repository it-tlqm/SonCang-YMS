-- ==============================================================================
-- MIGRATION 20261013000022: QUẢN LÝ KHÁCH HÀNG & QUẢN TRỊ NHÂN SỰ / TÀI KHOẢN (RBAC V5)
-- Mục đích:
--   1. Tạo bảng app_customers lưu trữ danh mục Khách hàng / Chủ hàng chuẩn mực.
--   2. Tạo bảng app_staff_users lưu trữ danh mục Nhân sự / Người dùng trực ca & gán vai trò V1.
--   3. Cung cấp các chính sách RLS và hàm RPC quản trị an toàn (CRUD Khách hàng & Nhân sự).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. BẢNG DANH MỤC KHÁCH HÀNG / CHỦ HÀNG (app_customers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text,
  tax_code text,
  address text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed khách hàng ban đầu từ thực tế vận hành Sơn Cảng
INSERT INTO public.app_customers (name, phone, tax_code, notes, is_active) VALUES
  ('Công ty TNHH Vận tải & Thương mại Quốc tế Á Châu', '0912 345 678', '0102345678', 'Khách hàng thường xuyên chạy nông sản lạnh', true),
  ('Công ty Cổ phần Logistics Tà Lùng Xuyên Biên Giới', '0988 765 432', '0109876543', 'Chủ hàng container hoa quả tươi xuất khẩu', true),
  ('Hợp tác xã Vận tải Hữu Nghị Đông Hưng - Trà Lĩnh', '0934 567 890', '0103456789', 'Đội xe kéo container lạnh tuyến Cao Bằng - Trà Lĩnh', true),
  ('Doanh nghiệp Tư nhân Tiến Đạt Cao Bằng', '0977 123 999', '0107712399', 'Chuyên hàng bách hóa tổng hợp và sang tải', true),
  ('Chủ hàng cá nhân: Nguyễn Văn Hùng', '0903 888 777', NULL, 'Chủ hàng xe lẻ hoa quả sầu riêng', true),
  ('Chủ hàng cá nhân: Trần Thị Mai Lan', '0918 666 555', NULL, 'Chủ hàng thanh long Bình Thuận xuất khẩu', true)
ON CONFLICT DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_customers TO authenticated;
ALTER TABLE public.app_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_customers_select_policy ON public.app_customers;
CREATE POLICY app_customers_select_policy ON public.app_customers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS app_customers_modify_policy ON public.app_customers;
CREATE POLICY app_customers_modify_policy ON public.app_customers
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 2. BẢNG QUẢN TRỊ NHÂN SỰ / NGƯỜI DÙNG TRỰC CA (app_staff_users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_staff_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  role_code text NOT NULL REFERENCES public.app_roles(code),
  department_code text NOT NULL REFERENCES public.app_departments(code),
  yard_id uuid REFERENCES public.app_yards(id),
  is_active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Seed danh sách nhân sự chính thức 7 vai trò chuẩn V5
INSERT INTO public.app_staff_users (id, full_name, email, phone, role_code, department_code, is_active, notes) VALUES
  ('20000000-0000-0000-0000-000000000020', 'Trần Quốc Bảo', 'sec_gate_01@soncang.vn', '0981 123 456', 'SEC_STAFF', 'AN_NINH', true, 'Nhân viên An ninh Cổng vào/ra'),
  ('20000000-0000-0000-0000-000000000021', 'Nguyễn Văn An', 'sec_lead_01@soncang.vn', '0982 234 567', 'SEC_LEAD', 'AN_NINH', true, 'Trưởng bộ phận An ninh'),
  ('20000000-0000-0000-0000-000000000030', 'Lê Thị Dung', 'port_cckb_01@soncang.vn', '0983 345 678', 'PORT_STAFF', 'CCKB', true, 'Nhân viên Thương vụ CCKB'),
  ('20000000-0000-0000-0000-000000000031', 'Hoàng Minh Cường', 'port_lead_01@soncang.vn', '0984 456 789', 'PORT_LEAD', 'CCKB', true, 'Trưởng bộ phận CCKB'),
  ('20000000-0000-0000-0000-000000000040', 'Vũ Văn Giang', 'dis_yard_01@soncang.vn', '0985 567 890', 'DIS_STAFF', 'DIEU_PHOI', true, 'Nhân viên Điều phối Bãi'),
  ('20000000-0000-0000-0000-000000000041', 'Phạm Đình Hải', 'dis_lead_01@soncang.vn', '0986 678 901', 'DIS_LEAD', 'DIEU_PHOI', true, 'Trưởng bộ phận Điều phối'),
  ('20000000-0000-0000-0000-000000000010', 'Ban Quản trị Hệ thống TLQM', 'admin_01@soncang.vn', '0988 888 999', 'SYS_ADMIN', 'HE_THONG', true, 'Quản trị viên Hệ thống toàn quyền')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role_code = EXCLUDED.role_code,
  department_code = EXCLUDED.department_code,
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes,
  updated_at = now();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_staff_users TO authenticated;
ALTER TABLE public.app_staff_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_staff_users_select_policy ON public.app_staff_users;
CREATE POLICY app_staff_users_select_policy ON public.app_staff_users
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS app_staff_users_modify_policy ON public.app_staff_users;
CREATE POLICY app_staff_users_modify_policy ON public.app_staff_users
  FOR ALL TO authenticated USING (
    public.sc_can('admin.roles.manage', NULL) OR
    public.sc_can('admin.users.manage', NULL) OR
    public.sc_can('admin.billing_settings.manage', NULL)
  ) WITH CHECK (
    public.sc_can('admin.roles.manage', NULL) OR
    public.sc_can('admin.users.manage', NULL) OR
    public.sc_can('admin.billing_settings.manage', NULL)
  );


-- ------------------------------------------------------------------------------
-- 3. HÀM RPC QUẢN TRỊ AN TOÀN (SECURITY DEFINER)
-- ------------------------------------------------------------------------------

-- 3.1 Thêm / Sửa Nhân sự (sc_upsert_staff_user)
CREATE OR REPLACE FUNCTION public.sc_upsert_staff_user(
  p_id uuid DEFAULT NULL,
  p_full_name text DEFAULT '',
  p_email text DEFAULT '',
  p_phone text DEFAULT NULL,
  p_role_code text DEFAULT 'SEC_STAFF',
  p_department_code text DEFAULT 'AN_NINH',
  p_yard_id uuid DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_user_id uuid;
  v_target record;
  v_clean_email text;
  v_clean_name text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF NOT (
    public.sc_can('admin.roles.manage', NULL) OR 
    public.sc_can('admin.users.manage', NULL) OR
    public.sc_can('admin.billing_settings.manage', NULL)
  ) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền quản lý người dùng và phân quyền (admin.roles.manage).';
  END IF;

  v_clean_name := trim(p_full_name);
  v_clean_email := lower(trim(p_email));

  IF v_clean_name = '' THEN
    RAISE EXCEPTION 'Họ và tên nhân viên không được để trống.';
  END IF;

  IF v_clean_email = '' THEN
    RAISE EXCEPTION 'Email nhân viên không được để trống.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.app_roles WHERE code = p_role_code) THEN
    RAISE EXCEPTION 'Vai trò % không hợp lệ trong hệ thống.', p_role_code;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.app_departments WHERE code = p_department_code) THEN
    RAISE EXCEPTION 'Bộ phận % không hợp lệ trong hệ thống.', p_department_code;
  END IF;

  IF p_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.app_staff_users WHERE id = p_id) THEN
    -- Cập nhật nhân viên hiện có
    UPDATE public.app_staff_users
    SET full_name = v_clean_name,
        email = v_clean_email,
        phone = trim(p_phone),
        role_code = p_role_code,
        department_code = p_department_code,
        yard_id = p_yard_id,
        is_active = p_is_active,
        notes = trim(p_notes),
        updated_at = now()
    WHERE id = p_id
    RETURNING * INTO v_target;
    v_user_id := v_target.id;
  ELSE
    -- Thêm mới nhân viên
    INSERT INTO public.app_staff_users (
      id, full_name, email, phone, role_code, department_code, yard_id, is_active, notes
    ) VALUES (
      COALESCE(p_id, gen_random_uuid()),
      v_clean_name, v_clean_email, trim(p_phone),
      p_role_code, p_department_code, p_yard_id, p_is_active, trim(p_notes)
    ) RETURNING * INTO v_target;
    v_user_id := v_target.id;
  END IF;

  -- Ghi nhận Audit Log
  PERFORM public.sc_log_audit_event(
    'admin.users.manage', 'app_staff_users', v_user_id::text,
    p_yard_id, 'HE_THONG', NULL, to_jsonb(v_target),
    'Cập nhật thông tin nhân sự: ' || v_clean_name || ' (' || p_role_code || ')'
  );

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'user', to_jsonb(v_target)
  );
END;
$$;

-- 3.2 Khóa / Mở khóa tài khoản nhân sự (sc_toggle_staff_user)
CREATE OR REPLACE FUNCTION public.sc_toggle_staff_user(
  p_id uuid,
  p_is_active boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_target record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF NOT (
    public.sc_can('admin.roles.manage', NULL) OR 
    public.sc_can('admin.users.manage', NULL)
  ) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền quản lý người dùng (admin.roles.manage).';
  END IF;

  UPDATE public.app_staff_users
  SET is_active = p_is_active,
      updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_target;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy nhân viên có ID: %', p_id;
  END IF;

  PERFORM public.sc_log_audit_event(
    'admin.users.manage', 'app_staff_users', p_id::text,
    v_target.yard_id, 'HE_THONG', NULL, to_jsonb(v_target),
    CASE WHEN p_is_active THEN 'Kích hoạt lại tài khoản: ' ELSE 'Tạm khóa tài khoản: ' END || v_target.full_name
  );

  RETURN jsonb_build_object('success', true, 'is_active', p_is_active);
END;
$$;

-- 3.3 Xóa tài khoản nhân sự (sc_delete_staff_user)
CREATE OR REPLACE FUNCTION public.sc_delete_staff_user(
  p_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_target record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF NOT (
    public.sc_can('admin.roles.manage', NULL) OR 
    public.sc_can('admin.users.manage', NULL)
  ) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền quản lý người dùng (admin.roles.manage).';
  END IF;

  DELETE FROM public.app_staff_users WHERE id = p_id RETURNING * INTO v_target;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy nhân viên có ID: %', p_id;
  END IF;

  PERFORM public.sc_log_audit_event(
    'admin.users.manage', 'app_staff_users', p_id::text,
    v_target.yard_id, 'HE_THONG', to_jsonb(v_target), NULL,
    'Xóa tài khoản nhân viên: ' || v_target.full_name || ' (' || v_target.email || ')'
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sc_upsert_staff_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.sc_toggle_staff_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.sc_delete_staff_user TO authenticated;

COMMIT;
