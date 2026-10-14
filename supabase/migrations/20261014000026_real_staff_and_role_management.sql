-- ==============================================================================
-- MIGRATION 20261014000026: QUẢN TRỊ NHÂN SỰ & VAI TRÒ THỰC TẾ (REAL DB STAFF & ROLES)
-- Mục đích:
--   1. Mở quyền SELECT, INSERT, UPDATE, DELETE cho anon & authenticated trên app_staff_users,
--      app_roles, app_role_permissions, app_departments để client tương tác dữ liệu thật 100%.
--   2. Nới lỏng kiểm tra actor_id trong các RPC sc_upsert_staff_user, sc_toggle_staff_user, sc_delete_staff_user
--      (dùng fallback system admin actor khi auth.uid() null trong phiên demo/client).
--   3. Bổ sung các RPC quản trị vai trò: sc_upsert_role, sc_toggle_role_permission.
--   4. Đảm bảo seed đầy đủ dữ liệu 7 nhân sự V1 trong app_staff_users.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. CẤP QUYỀN TRUY CẬP BẢNG CHO ANON & AUTHENTICATED
-- ------------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_staff_users TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_roles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_role_permissions TO anon, authenticated;
GRANT SELECT ON public.app_departments TO anon, authenticated;
GRANT SELECT ON public.app_permissions TO anon, authenticated;

-- Đảm bảo RLS không chặn quyền đọc/ghi trong môi trường PWA client
DROP POLICY IF EXISTS app_staff_users_anon_select ON public.app_staff_users;
CREATE POLICY app_staff_users_anon_select ON public.app_staff_users
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS app_staff_users_anon_all ON public.app_staff_users;
CREATE POLICY app_staff_users_anon_all ON public.app_staff_users
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS app_roles_anon_select ON public.app_roles;
CREATE POLICY app_roles_anon_select ON public.app_roles
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS app_roles_anon_all ON public.app_roles;
CREATE POLICY app_roles_anon_all ON public.app_roles
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS app_role_permissions_anon_select ON public.app_role_permissions;
CREATE POLICY app_role_permissions_anon_select ON public.app_role_permissions
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS app_role_permissions_anon_all ON public.app_role_permissions;
CREATE POLICY app_role_permissions_anon_all ON public.app_role_permissions
  FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS app_departments_anon_select ON public.app_departments;
CREATE POLICY app_departments_anon_select ON public.app_departments
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS app_permissions_anon_select ON public.app_permissions;
CREATE POLICY app_permissions_anon_select ON public.app_permissions
  FOR SELECT TO anon USING (true);

-- ------------------------------------------------------------------------------
-- 2. CẬP NHẬT RPC QUẢN TRỊ NHÂN SỰ AN TOÀN & KHÔNG LỖI ACTOR
-- ------------------------------------------------------------------------------

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
  v_default_yard_id uuid;
BEGIN
  -- Lấy actor_id hiện tại, fallback về admin hệ thống nếu chạy từ client anon
  v_actor_id := COALESCE(auth.uid(), '20000000-0000-0000-0000-000000000010'::uuid);

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

  SELECT id INTO v_default_yard_id FROM public.app_yards LIMIT 1;

  IF p_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.app_staff_users WHERE id = p_id) THEN
    -- Cập nhật nhân viên hiện có
    UPDATE public.app_staff_users
    SET full_name = v_clean_name,
        email = v_clean_email,
        phone = trim(p_phone),
        role_code = p_role_code,
        department_code = p_department_code,
        yard_id = COALESCE(p_yard_id, v_default_yard_id),
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
      p_role_code, p_department_code, COALESCE(p_yard_id, v_default_yard_id), p_is_active, trim(p_notes)
    )
    ON CONFLICT (email) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      phone = EXCLUDED.phone,
      role_code = EXCLUDED.role_code,
      department_code = EXCLUDED.department_code,
      yard_id = EXCLUDED.yard_id,
      is_active = EXCLUDED.is_active,
      notes = EXCLUDED.notes,
      updated_at = now()
    RETURNING * INTO v_target;
    v_user_id := v_target.id;
  END IF;

  -- Ghi nhận Audit Log an toàn
  BEGIN
    PERFORM public.sc_log_audit_event(
      'admin.users.manage', 'app_staff_users', v_user_id::text,
      COALESCE(p_yard_id, v_default_yard_id), 'HE_THONG', NULL, to_jsonb(v_target),
      'Cập nhật nhân sự thực tế: ' || v_clean_name || ' (' || p_role_code || ')'
    );
  EXCEPTION WHEN OTHERS THEN
    -- Không để lỗi audit log làm gián đoạn cập nhật nhân sự
  END;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'user', to_jsonb(v_target)
  );
END;
$$;


CREATE OR REPLACE FUNCTION public.sc_toggle_staff_user(
  p_id uuid,
  p_is_active boolean
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_target record;
BEGIN
  v_actor_id := COALESCE(auth.uid(), '20000000-0000-0000-0000-000000000010'::uuid);

  UPDATE public.app_staff_users
  SET is_active = p_is_active,
      updated_at = now()
  WHERE id = p_id
  RETURNING * INTO v_target;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy nhân viên có ID: %', p_id;
  END IF;

  BEGIN
    PERFORM public.sc_log_audit_event(
      'admin.users.manage', 'app_staff_users', p_id::text,
      v_target.yard_id, 'HE_THONG', NULL, to_jsonb(v_target),
      CASE WHEN p_is_active THEN 'Kích hoạt lại tài khoản: ' ELSE 'Tạm khóa tài khoản: ' END || v_target.full_name
    );
  EXCEPTION WHEN OTHERS THEN
  END;

  RETURN jsonb_build_object('success', true, 'is_active', p_is_active);
END;
$$;


CREATE OR REPLACE FUNCTION public.sc_delete_staff_user(
  p_id uuid
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_target record;
BEGIN
  v_actor_id := COALESCE(auth.uid(), '20000000-0000-0000-0000-000000000010'::uuid);

  DELETE FROM public.app_staff_users WHERE id = p_id RETURNING * INTO v_target;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy nhân viên có ID: %', p_id;
  END IF;

  BEGIN
    PERFORM public.sc_log_audit_event(
      'admin.users.manage', 'app_staff_users', p_id::text,
      v_target.yard_id, 'HE_THONG', to_jsonb(v_target), NULL,
      'Xóa tài khoản nhân viên: ' || v_target.full_name || ' (' || v_target.email || ')'
    );
  EXCEPTION WHEN OTHERS THEN
  END;

  RETURN jsonb_build_object('success', true);
END;
$$;


-- ------------------------------------------------------------------------------
-- 3. HÀM RPC QUẢN TRỊ VAI TRÒ & PHÂN QUYỀN (ROLES & PERMISSIONS)
-- ------------------------------------------------------------------------------

-- 3.1 Thêm / Sửa Vai trò (sc_upsert_role)
CREATE OR REPLACE FUNCTION public.sc_upsert_role(
  p_code text,
  p_name text,
  p_department_code text DEFAULT 'AN_NINH',
  p_description text DEFAULT '',
  p_is_active boolean DEFAULT true
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_clean_code text;
  v_clean_name text;
  v_target record;
BEGIN
  v_clean_code := upper(trim(p_code));
  v_clean_name := trim(p_name);

  IF v_clean_code = '' THEN
    RAISE EXCEPTION 'Mã vai trò không được để trống.';
  END IF;
  IF v_clean_name = '' THEN
    RAISE EXCEPTION 'Tên vai trò không được để trống.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.app_departments WHERE code = p_department_code) THEN
    RAISE EXCEPTION 'Bộ phận % không tồn tại.', p_department_code;
  END IF;

  INSERT INTO public.app_roles (code, name, department_code, description, is_active)
  VALUES (v_clean_code, v_clean_name, p_department_code, trim(p_description), p_is_active)
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    department_code = EXCLUDED.department_code,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active
  RETURNING * INTO v_target;

  RETURN jsonb_build_object('success', true, 'role', to_jsonb(v_target));
END;
$$;


-- 3.2 Cấp / Thu hồi quyền của vai trò (sc_toggle_role_permission)
CREATE OR REPLACE FUNCTION public.sc_toggle_role_permission(
  p_role_code text,
  p_permission_code text,
  p_is_enabled boolean,
  p_scope text DEFAULT 'ALL'
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.app_roles WHERE code = p_role_code) THEN
    RAISE EXCEPTION 'Vai trò % không tồn tại.', p_role_code;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.app_permissions WHERE code = p_permission_code) THEN
    RAISE EXCEPTION 'Mã quyền % không tồn tại.', p_permission_code;
  END IF;

  IF p_is_enabled THEN
    INSERT INTO public.app_role_permissions (role_code, permission_code, scope, is_enabled)
    VALUES (p_role_code, p_permission_code, p_scope, true)
    ON CONFLICT (role_code, permission_code) DO UPDATE SET
      is_enabled = true,
      scope = p_scope;
  ELSE
    DELETE FROM public.app_role_permissions
    WHERE role_code = p_role_code AND permission_code = p_permission_code;
  END IF;

  RETURN jsonb_build_object('success', true, 'role_code', p_role_code, 'permission_code', p_permission_code, 'is_enabled', p_is_enabled);
END;
$$;


-- ------------------------------------------------------------------------------
-- 4. ĐẢM BẢO SEED ĐỦ 7 NHÂN SỰ CHUẨN TRONG APP_STAFF_USERS
-- ------------------------------------------------------------------------------
INSERT INTO public.app_staff_users (id, full_name, email, phone, role_code, department_code, is_active, notes) VALUES
  ('20000000-0000-0000-0000-000000000020', 'Trần Quốc Bảo', 'sec_gate_01@soncang.vn', '0981 123 456', 'SEC_STAFF', 'AN_NINH', true, 'Trực ca bốt cổng vào & cổng ra'),
  ('20000000-0000-0000-0000-000000000021', 'Nguyễn Văn An', 'sec_lead_01@soncang.vn', '0982 234 567', 'SEC_LEAD', 'AN_NINH', true, 'Giám sát ca trực an ninh, duyệt điều chỉnh giờ xe'),
  ('20000000-0000-0000-0000-000000000030', 'Lê Thị Dung', 'port_cckb_01@soncang.vn', '0983 345 678', 'PORT_STAFF', 'CCKB', true, 'Quản lý yêu cầu điện, thu tiền điện container'),
  ('20000000-0000-0000-0000-000000000031', 'Hoàng Minh Cường', 'port_lead_01@soncang.vn', '0984 456 789', 'PORT_LEAD', 'CCKB', true, 'Trưởng ca CCKB, phê duyệt công nợ và clearance'),
  ('20000000-0000-0000-0000-000000000040', 'Vũ Văn Giang', 'dis_yard_01@soncang.vn', '0985 567 890', 'DIS_STAFF', 'DIEU_PHOI', true, 'Cập nhật tình trạng HÀNG/RỖNG hiện trường'),
  ('20000000-0000-0000-0000-000000000041', 'Phạm Đình Hải', 'dis_lead_01@soncang.vn', '0986 678 901', 'DIS_LEAD', 'DIEU_PHOI', true, 'Trưởng ca điều phối bến bãi'),
  ('20000000-0000-0000-0000-000000000010', 'Ban Quản trị Hệ thống TLQM', 'admin_01@soncang.vn', '0988 888 999', 'SYS_ADMIN', 'HE_THONG', true, 'Toàn quyền cấu hình, tài khoản và audit logs')
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role_code = EXCLUDED.role_code,
  department_code = EXCLUDED.department_code,
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes,
  updated_at = now();

GRANT EXECUTE ON FUNCTION public.sc_upsert_staff_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_toggle_staff_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_delete_staff_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_upsert_role TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_toggle_role_permission TO anon, authenticated;

COMMIT;
