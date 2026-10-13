import re

with open('supabase/tests/domain_vehicles_containers_004.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# Replace schema grant line that fails
sql = re.sub(
    r'CREATE TEMP TABLE IF NOT EXISTS pg_temp\.test_vars \([\s\S]*?END \$\$;\n',
    '''-- Bảng tạm lưu trữ biến và ID kiểm thử (tự động rollback ở cuối file)
CREATE TABLE IF NOT EXISTS public.test_vars_004 (
  var_key text PRIMARY KEY,
  val_uuid uuid,
  val_text text,
  val_bigint bigint
);

GRANT ALL ON public.test_vars_004 TO authenticated, anon;

-- Các helper truy xuất biến kiểm thử
CREATE OR REPLACE FUNCTION public.set_val_004(p_key text, p_uuid uuid DEFAULT NULL, p_text text DEFAULT NULL, p_bigint bigint DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.test_vars_004 (var_key, val_uuid, val_text, val_bigint)
  VALUES (p_key, p_uuid, p_text, p_bigint)
  ON CONFLICT (var_key) DO UPDATE
    SET val_uuid = COALESCE(EXCLUDED.val_uuid, public.test_vars_004.val_uuid),
        val_text = COALESCE(EXCLUDED.val_text, public.test_vars_004.val_text),
        val_bigint = COALESCE(EXCLUDED.val_bigint, public.test_vars_004.val_bigint);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_uuid_004(p_key text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT val_uuid FROM public.test_vars_004 WHERE var_key = p_key;
$$;

CREATE OR REPLACE FUNCTION public.get_bigint_004(p_key text) RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT val_bigint FROM public.test_vars_004 WHERE var_key = p_key;
$$;

-- Helper thiết lập JWT Context của Supabase (KHÔNG chuyển đổi database role session)
CREATE OR REPLACE FUNCTION public.set_test_jwt_004(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user_id IS NULL THEN
    PERFORM set_config('request.jwt.claim.sub', '', true);
    PERFORM set_config('request.jwt.claim.role', 'anon', true);
    PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  ELSE
    PERFORM set_config('request.jwt.claim.sub', p_user_id::text, true);
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claims', json_build_object('sub', p_user_id::text, 'role', 'authenticated')::text, true);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_val_004(text, uuid, text, bigint) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_uuid_004(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_bigint_004(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_test_jwt_004(uuid) TO authenticated, anon;
''',
    sql
)

# Replace all calls
sql = sql.replace('pg_temp.set_val(', 'public.set_val_004(')
sql = sql.replace('pg_temp.get_uuid(', 'public.get_uuid_004(')
sql = sql.replace('pg_temp.get_bigint(', 'public.get_bigint_004(')
sql = sql.replace('pg_temp.set_test_jwt(', 'public.set_test_jwt_004(')
sql = sql.replace('pg_temp.get_uuid', 'public.get_uuid_004')

with open('supabase/tests/domain_vehicles_containers_004.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print('Updated domain_vehicles_containers_004.sql successfully!')
