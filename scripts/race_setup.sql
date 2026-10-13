DO $$
DECLARE
  v_yard_1 uuid := '20000000-0000-0000-0000-000000000001'::uuid;
  v_user_sec uuid := 'a0000000-0000-0000-0000-000000000099'::uuid;
BEGIN
  INSERT INTO public.app_yards (id, name, is_active)
  VALUES (v_yard_1, 'Bãi 1 - Cảng cạn Sơn Cảng', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.users (id, email)
  VALUES (v_user_sec, 'sec_concurrent_gate@soncang.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active)
  VALUES (v_user_sec, 'SEC_STAFF', v_yard_1, 'AN_NINH', true)
  ON CONFLICT DO NOTHING;
END $$;
