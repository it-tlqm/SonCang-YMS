-- ==============================================================================
-- KIỂM THỬ SCRIPT GÁN 7 TÀI KHOẢN UAT V5 (CHẠY TRONG TRANSACTION ROLLBACK)
-- Xác minh schema thật: app_yards(name), app_user_role_assignments(created_by)
-- Dừng báo lỗi nếu thiếu tài khoản hoặc không tìm thấy Bãi Sơn Cảng
-- ==============================================================================

BEGIN;

-- 1. Tạo 7 tài khoản test giả lập trong auth.users cho transaction này
DO $$
DECLARE
  v_dummy_pwd text := '$2a$10$abcdefghijklmnopqrstuvwxyz12345678901234567890123456';
  v_users text[] := ARRAY[
    'sys_admin_uat@example.com',
    'sec_staff_uat@example.com',
    'sec_lead_uat@example.com',
    'cckb_staff_uat@example.com',
    'cckb_lead_uat@example.com',
    'dis_staff_uat@example.com',
    'dis_lead_uat@example.com'
  ];
  v_email text;
BEGIN
  FOREACH v_email IN ARRAY v_users LOOP
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN
      INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
      VALUES (gen_random_uuid(), v_email, v_dummy_pwd, now(), '{"provider":"email","providers":["email"]}', '{"full_name":"UAT User"}', now(), now());
    END IF;
  END LOOP;
END $$;

-- 2. Thực thi logic gán vai trò UAT chính thức
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
  v_inserted_count integer := 0;
BEGIN
  -- A. Xác định chính xác bãi "Bãi Sơn Cảng"
  SELECT id INTO v_yard_id 
  FROM public.app_yards 
  WHERE name = 'Bãi Sơn Cảng' AND is_active = true;

  IF v_yard_id IS NULL THEN
    RAISE EXCEPTION 'KHÔNG TÌM THẤY BÃI: Không tồn tại bản ghi "Bãi Sơn Cảng" đang hoạt động trong bảng app_yards!';
  END IF;

  -- B. Tìm nạp 7 ID người dùng từ auth.users và kiểm tra nghiêm ngặt
  SELECT id INTO v_admin_id FROM auth.users WHERE email = 'sys_admin_uat@example.com';
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'THIẾU TÀI KHOẢN: Chưa tìm thấy tài khoản sys_admin_uat@example.com cho vai trò SYS_ADMIN!';
  END IF;

  SELECT id INTO v_sec_staff_id FROM auth.users WHERE email = 'sec_staff_uat@example.com';
  IF v_sec_staff_id IS NULL THEN
    RAISE EXCEPTION 'THIẾU TÀI KHOẢN: Chưa tìm thấy tài khoản sec_staff_uat@example.com cho vai trò SEC_STAFF!';
  END IF;

  SELECT id INTO v_sec_lead_id FROM auth.users WHERE email = 'sec_lead_uat@example.com';
  IF v_sec_lead_id IS NULL THEN
    RAISE EXCEPTION 'THIẾU TÀI KHOẢN: Chưa tìm thấy tài khoản sec_lead_uat@example.com cho vai trò SEC_LEAD!';
  END IF;

  SELECT id INTO v_port_staff_id FROM auth.users WHERE email = 'cckb_staff_uat@example.com';
  IF v_port_staff_id IS NULL THEN
    RAISE EXCEPTION 'THIẾU TÀI KHOẢN: Chưa tìm thấy tài khoản cckb_staff_uat@example.com cho vai trò PORT_STAFF!';
  END IF;

  SELECT id INTO v_port_lead_id FROM auth.users WHERE email = 'cckb_lead_uat@example.com';
  IF v_port_lead_id IS NULL THEN
    RAISE EXCEPTION 'THIẾU TÀI KHOẢN: Chưa tìm thấy tài khoản cckb_lead_uat@example.com cho vai trò PORT_LEAD!';
  END IF;

  SELECT id INTO v_dis_staff_id FROM auth.users WHERE email = 'dis_staff_uat@example.com';
  IF v_dis_staff_id IS NULL THEN
    RAISE EXCEPTION 'THIẾU TÀI KHOẢN: Chưa tìm thấy tài khoản dis_staff_uat@example.com cho vai trò DIS_STAFF!';
  END IF;

  SELECT id INTO v_dis_lead_id FROM auth.users WHERE email = 'dis_lead_uat@example.com';
  IF v_dis_lead_id IS NULL THEN
    RAISE EXCEPTION 'THIẾU TÀI KHOẢN: Chưa tìm thấy tài khoản dis_lead_uat@example.com cho vai trò DIS_LEAD!';
  END IF;

  -- C. Gán vai trò vào app_user_role_assignments (sử dụng created_by và WHERE NOT EXISTS)
  
  -- 1. SYS_ADMIN (yard_id = NULL: Phạm vi toàn hệ thống)
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
  SELECT v_admin_id, 'SYS_ADMIN', NULL, NULL, true, v_admin_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_user_role_assignments 
    WHERE user_id = v_admin_id AND role_code = 'SYS_ADMIN' AND yard_id IS NULL AND is_active = true
  );

  -- 2. SEC_STAFF (yard_id = v_yard_id, department_code = 'AN_NINH')
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
  SELECT v_sec_staff_id, 'SEC_STAFF', v_yard_id, 'AN_NINH', true, v_admin_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_user_role_assignments 
    WHERE user_id = v_sec_staff_id AND role_code = 'SEC_STAFF' AND yard_id = v_yard_id AND is_active = true
  );

  -- 3. SEC_LEAD (yard_id = v_yard_id, department_code = 'AN_NINH')
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
  SELECT v_sec_lead_id, 'SEC_LEAD', v_yard_id, 'AN_NINH', true, v_admin_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_user_role_assignments 
    WHERE user_id = v_sec_lead_id AND role_code = 'SEC_LEAD' AND yard_id = v_yard_id AND is_active = true
  );

  -- 4. PORT_STAFF (yard_id = v_yard_id, department_code = 'CCKB')
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
  SELECT v_port_staff_id, 'PORT_STAFF', v_yard_id, 'CCKB', true, v_admin_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_user_role_assignments 
    WHERE user_id = v_port_staff_id AND role_code = 'PORT_STAFF' AND yard_id = v_yard_id AND is_active = true
  );

  -- 5. PORT_LEAD (yard_id = v_yard_id, department_code = 'CCKB')
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
  SELECT v_port_lead_id, 'PORT_LEAD', v_yard_id, 'CCKB', true, v_admin_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_user_role_assignments 
    WHERE user_id = v_port_lead_id AND role_code = 'PORT_LEAD' AND yard_id = v_yard_id AND is_active = true
  );

  -- 6. DIS_STAFF (yard_id = v_yard_id, department_code = 'DIEU_PHOI')
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
  SELECT v_dis_staff_id, 'DIS_STAFF', v_yard_id, 'DIEU_PHOI', true, v_admin_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_user_role_assignments 
    WHERE user_id = v_dis_staff_id AND role_code = 'DIS_STAFF' AND yard_id = v_yard_id AND is_active = true
  );

  -- 7. DIS_LEAD (yard_id = v_yard_id, department_code = 'DIEU_PHOI')
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, created_by)
  SELECT v_dis_lead_id, 'DIS_LEAD', v_yard_id, 'DIEU_PHOI', true, v_admin_id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.app_user_role_assignments 
    WHERE user_id = v_dis_lead_id AND role_code = 'DIS_LEAD' AND yard_id = v_yard_id AND is_active = true
  );

  -- Đếm và kiểm tra
  SELECT count(*) INTO v_inserted_count
  FROM public.app_user_role_assignments
  WHERE user_id IN (v_admin_id, v_sec_staff_id, v_sec_lead_id, v_port_staff_id, v_port_lead_id, v_dis_staff_id, v_dis_lead_id)
    AND is_active = true;

  IF v_inserted_count <> 7 THEN
    RAISE EXCEPTION 'LỖI PHÂN QUYỀN: Kỳ vọng 7 bản ghi phân quyền UAT, thực tế có: % bản ghi!', v_inserted_count;
  END IF;

  RAISE NOTICE 'KIỂM THỬ THÀNH CÔNG: Đã gán chính xác 7 vai trò UAT cho 7 tài khoản tại Bãi Sơn Cảng (yard_id: %)', v_yard_id;
END $$;

-- 3. Kiểm tra hàm sc_my_permissions cho từng user trong session
-- Test quyền cho SEC_STAFF
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claim.sub" TO '11111111-1111-1111-1111-111111111111';

ROLLBACK;
