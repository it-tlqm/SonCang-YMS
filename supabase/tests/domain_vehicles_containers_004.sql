-- ==============================================================================
-- DOMAIN VEHICLES & CONTAINERS TEST SUITE — MIGRATION 004 (pgTAP R4 / 4 TABLES)
-- Dự án: Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng
-- Phạm vi: Kiểm thử tĩnh và cấu trúc Migration 004 (M004-T01 đến M004-T34)
--
-- CẢNH BÁO: TÀI LIỆU MÃ NGUỒN KIỂM THỬ (TEST SPEC ONLY).
-- TRẠNG THÁI: TESTS AUTHORED, NOT EXECUTED (Chưa chạy runtime trên PostgreSQL/Docker).
-- BẢO VỆ NGHIỆM THU VÒNG 4 (Khắc phục triệt để 9 phát hiện M004-R3-01 đến M004-R3-09):
-- 1. M004-R3-01: Tạo fixture xe tham chiếu TEST_RESTRICT_TYPE trước khi test ON DELETE RESTRICT (23503), không xóa seed row CONT_LANH.
-- 2. M004-R3-02: Kiểm thử regression patch semantics: Đổi tên CONT_LANH giữ nguyên giá 250k, allows_container=true và trạng thái hoạt động.
-- 3. M004-R3-03: Kiểm thử tài chính AP10 Four-Eyes: Chặn thay đổi giá vé xe hiện có và chặn gán giá xe mới qua sc_manage_vehicle_type.
-- 4. M004-R3-04: Kiểm thử Retry Safety & Idempotency: Lặp lại request cùng key trả về đúng ID cũ; khác payload bị từ chối.
-- 5. M004-R3-05: scripts/audit_test_004.js thiết lập process.exit(1) chặt chẽ khi có bất kỳ sai lệch nào.
-- 6. M004-R3-06: Ghi nhãn đúng Assertion 42 là Database uniqueness invariant (không tuyên bố chạy race concurrency).
-- 7. M004-R3-07: Kiểm thử sc_create_container_visit từ chối tiếp nhận container vào bãi đang bị vô hiệu hóa (is_active = false).
-- 8. M004-R3-08: Ràng buộc toàn vẹn vòng đời ck_container_status_outbound; tách biệt fixture CANCELLED hợp lệ từ IN_YARD.
-- 9. M004-R3-09: Thông báo lỗi chung (generic) khi loại xe không được tiếp nhận container theo cấu hình danh mục.
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

-- Khai báo kế hoạch kiểm thử: Đúng 75 assertions top-level chuẩn pgTAP
SELECT plan(75);

-- ------------------------------------------------------------------------------
-- 0. TẠO TEST FIXTURES & HELPER CONTEXT DÙNG CHUNG
-- ------------------------------------------------------------------------------

-- Bảng tạm lưu trữ biến và ID kiểm thử xuyên suốt session
-- Bảng tạm lưu trữ biến và ID kiểm thử (tự động rollback ở cuối file)
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

-- Thiết lập người dùng và bãi kiểm thử
DO $$
DECLARE
  v_yard_1 uuid;
  v_yard_2 uuid;
  v_yard_inact uuid;
  v_u_admin uuid := '10000000-0000-0000-0000-000000000001'::uuid;
  v_u_sec uuid := '10000000-0000-0000-0000-000000000002'::uuid;
  v_u_sec_lead uuid := '10000000-0000-0000-0000-000000000003'::uuid;
  v_u_port uuid := '10000000-0000-0000-0000-000000000004'::uuid;
  v_u_port_lead uuid := '10000000-0000-0000-0000-000000000005'::uuid;
  v_u_dis uuid := '10000000-0000-0000-0000-000000000006'::uuid;
  v_u_dis_lead uuid := '10000000-0000-0000-0000-000000000007'::uuid;
  v_u_sec_yard2 uuid := '10000000-0000-0000-0000-000000000008'::uuid;
  v_u_expired uuid := '10000000-0000-0000-0000-000000000009'::uuid;
  v_u_inactive uuid := '10000000-0000-0000-0000-000000000010'::uuid;
BEGIN
  -- 1. Bãi kiểm thử (hoạt động và vô hiệu hóa)
  SELECT id INTO v_yard_1 FROM public.app_yards WHERE name = 'Bãi Sơn Cảng 004 A' LIMIT 1;
  IF v_yard_1 IS NULL THEN
    INSERT INTO public.app_yards (name, is_active) VALUES ('Bãi Sơn Cảng 004 A', true) RETURNING id INTO v_yard_1;
  END IF;
  PERFORM public.set_val_004('yard_1', v_yard_1);

  SELECT id INTO v_yard_2 FROM public.app_yards WHERE name = 'Bãi Sơn Cảng 004 B' LIMIT 1;
  IF v_yard_2 IS NULL THEN
    INSERT INTO public.app_yards (name, is_active) VALUES ('Bãi Sơn Cảng 004 B', true) RETURNING id INTO v_yard_2;
  END IF;
  PERFORM public.set_val_004('yard_2', v_yard_2);

  -- M004-R3-07: Bãi vô hiệu hóa để kiểm thử từ chối container gate-in
  SELECT id INTO v_yard_inact FROM public.app_yards WHERE name = 'Bãi Sơn Cảng 004 Inactive' LIMIT 1;
  IF v_yard_inact IS NULL THEN
    INSERT INTO public.app_yards (name, is_active) VALUES ('Bãi Sơn Cảng 004 Inactive', false) RETURNING id INTO v_yard_inact;
  END IF;
  PERFORM public.set_val_004('yard_inactive', v_yard_inact);

  -- 2. Users trong auth.users
  INSERT INTO auth.users (id, email) VALUES
    (v_u_admin, 'admin004@soncang.vn'),
    (v_u_sec, 'sec004@soncang.vn'),
    (v_u_sec_lead, 'seclead004@soncang.vn'),
    (v_u_port, 'port004@soncang.vn'),
    (v_u_port_lead, 'portlead004@soncang.vn'),
    (v_u_dis, 'dis004@soncang.vn'),
    (v_u_dis_lead, 'dislead004@soncang.vn'),
    (v_u_sec_yard2, 'secyard2_004@soncang.vn'),
    (v_u_expired, 'expired004@soncang.vn'),
    (v_u_inactive, 'inactive004@soncang.vn')
  ON CONFLICT (id) DO NOTHING;

  -- 3. Gán Role Assignments chuẩn V5
  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, valid_from, valid_until) VALUES
    (v_u_admin, 'SYS_ADMIN', NULL, NULL, true, now() - interval '1 hour', now() + interval '10 days'),
    (v_u_sec, 'SEC_STAFF', v_yard_1, 'AN_NINH', true, now() - interval '1 hour', now() + interval '10 days'),
    (v_u_sec_lead, 'SEC_LEAD', v_yard_1, 'AN_NINH', true, now() - interval '1 hour', now() + interval '10 days'),
    (v_u_port, 'PORT_STAFF', v_yard_1, 'CCKB', true, now() - interval '1 hour', now() + interval '10 days'),
    (v_u_port_lead, 'PORT_LEAD', v_yard_1, 'CCKB', true, now() - interval '1 hour', now() + interval '10 days'),
    (v_u_dis, 'DIS_STAFF', v_yard_1, 'DIEU_PHOI', true, now() - interval '1 hour', now() + interval '10 days'),
    (v_u_dis_lead, 'DIS_LEAD', v_yard_1, 'DIEU_PHOI', true, now() - interval '1 hour', now() + interval '10 days'),
    (v_u_sec_yard2, 'SEC_STAFF', v_yard_2, 'AN_NINH', true, now() - interval '1 hour', now() + interval '10 days'),
    (v_u_expired, 'SEC_STAFF', v_yard_1, 'AN_NINH', true, now() - interval '2 hours', now() - interval '1 hour'),
    (v_u_inactive, 'SEC_STAFF', v_yard_1, 'AN_NINH', false, now() - interval '1 hour', now() + interval '10 days')
  ON CONFLICT DO NOTHING;
END $$;


-- ------------------------------------------------------------------------------
-- SUITE 1: KIỂM TRA ĐỊNH NGHĨA SCHEMA & RLS CƠ BẢN 4 BẢNG (M004-T01, M004-T02, M004-T03)
-- ------------------------------------------------------------------------------

-- Assertion 1: Bảng app_vehicle_types tồn tại (Bảng thứ 4)
SELECT has_table('public', 'app_vehicle_types', 'M004-T01a: Bảng public.app_vehicle_types phải tồn tại');

-- Assertion 2: Bảng app_vehicle_visits tồn tại
SELECT has_table('public', 'app_vehicle_visits', 'M004-T01b: Bảng public.app_vehicle_visits phải tồn tại');

-- Assertion 3: Bảng app_container_visits tồn tại
SELECT has_table('public', 'app_container_visits', 'M004-T01c: Bảng public.app_container_visits phải tồn tại');

-- Assertion 4: Bảng app_container_number_changes tồn tại
SELECT has_table('public', 'app_container_number_changes', 'M004-T01d: Bảng public.app_container_number_changes phải tồn tại');

-- Assertion 5: RLS enabled trên cả 4 bảng
SELECT is(
  (SELECT count(*)::int FROM pg_class WHERE relname IN ('app_vehicle_types', 'app_vehicle_visits', 'app_container_visits', 'app_container_number_changes') AND relrowsecurity = true),
  4,
  'M004-T02: Cả 4 bảng miền phương tiện và container đều đã bật Row Level Security (RLS)'
);

-- M004-R2-01: Thay thế hasnt_table_privilege bằng ok(NOT pg_catalog.has_table_privilege(...))
-- Assertion 6: anon bị thu hồi quyền INSERT trực tiếp trên app_vehicle_types
SELECT ok(
  NOT pg_catalog.has_table_privilege('anon', 'public.app_vehicle_types', 'INSERT'),
  'M004-T03a: anon không có quyền INSERT trên app_vehicle_types (Fix M004-R2-01)'
);

-- Assertion 7: anon bị thu hồi quyền INSERT trực tiếp trên app_vehicle_visits
SELECT ok(
  NOT pg_catalog.has_table_privilege('anon', 'public.app_vehicle_visits', 'INSERT'),
  'M004-T03b: anon không có quyền INSERT trên app_vehicle_visits (Fix M004-R2-01)'
);

-- Assertion 8: anon bị thu hồi quyền SELECT trên app_vehicle_visits
SELECT ok(
  NOT pg_catalog.has_table_privilege('anon', 'public.app_vehicle_visits', 'SELECT'),
  'M004-T03c: anon không có quyền SELECT trên app_vehicle_visits (Fix M004-R2-01)'
);

-- Assertion 9: anon bị thu hồi quyền SELECT trên app_container_visits
SELECT ok(
  NOT pg_catalog.has_table_privilege('anon', 'public.app_container_visits', 'SELECT'),
  'M004-T03d: anon không có quyền SELECT trên app_container_visits (Fix M004-R2-01)'
);

-- Assertion 10: anon bị thu hồi quyền SELECT trên app_container_number_changes
SELECT ok(
  NOT pg_catalog.has_table_privilege('anon', 'public.app_container_number_changes', 'SELECT'),
  'M004-T03e: anon không có quyền SELECT trên app_container_number_changes (Fix M004-R2-01)'
);


-- ------------------------------------------------------------------------------
-- SUITE 2: DANH MỤC LOẠI PHƯƠNG TIỆN ĐỘNG & BẢO VỆ AP10 (M004-R3-02, M004-R3-03)
-- ------------------------------------------------------------------------------

-- Assertion 11: Seed đủ đúng 7 loại phương tiện chuẩn V5 có biểu phí
SELECT is(
  (SELECT count(*)::int FROM public.app_vehicle_types WHERE code IN ('CONT_LANH', 'DAU_KEO', 'XE_BO_4_CHAN', 'XE_BO_3_CHAN', 'XE_BO_8_TAN_2_CHAN', 'XE_BO_3_BANH', 'XE_SANG_TAI')),
  7,
  'M004-T29a: Bảng app_vehicle_types được khởi tạo đủ đúng 7 loại xe chuẩn V5 (Fix M004-R2-10)'
);

-- Thực hiện tạo loại xe mới dưới quyền SYS_ADMIN (không gán giá vé trước khi có biểu phí AP10)
DO $$
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000001'::uuid);
  PERFORM public.sc_manage_vehicle_type(
    p_code => 'TEST_SPECIAL',
    p_display_name => 'Xe chuyên dụng thử nghiệm',
    p_description => 'Xe thử nghiệm cấu hình động',
    p_allows_container => true,
    p_is_active => true,
    p_sort_order => 99
  );
END $$;

-- Assertion 12: SYS_ADMIN tạo loại xe mới thành công với giá vé mặc định NULL (ALLOW)
SELECT ok(
  (SELECT default_ticket_amount IS NULL AND allows_container = true FROM public.app_vehicle_types WHERE code = 'TEST_SPECIAL'),
  'M004-T29b: SYS_ADMIN tạo loại xe mới thành công, giá vé khởi tạo NULL chờ ban hành biểu phí AP10'
);

-- Assertion 13: M004-R3-03: Tạo loại xe mới truyền giá vé bị từ chối theo AP10 Four-Eyes (DENY)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000001'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_manage_vehicle_type(
      p_code => 'TEST_AP10_NEW',
      p_display_name => 'Xe mới AP10',
      p_default_ticket_amount => 100000.00
    );
  $$,
  'P0001',
  'Thiết lập biểu phí cho loại xe mới yêu cầu quy trình phê duyệt bảng giá AP10. Loại xe mới tạo sẽ có trạng thái chưa có giá cho đến khi ban hành biểu phí.',
  'M004-R3-03a: Tạo loại xe mới truyền giá vé bị từ chối theo kiểm soát tài chính AP10 (DENY)'
);

-- Assertion 14: M004-R3-03: Sửa đổi giá vé xe CONT_LANH bị từ chối theo AP10 Four-Eyes (DENY)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000001'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_manage_vehicle_type(
      p_code => 'CONT_LANH',
      p_default_ticket_amount => 300000.00
    );
  $$,
  'P0001',
  'Việc thay đổi giá vé yêu cầu quy trình phê duyệt bảng giá AP10 (Four-Eyes). Không được phép thay đổi giá trực tiếp qua danh mục loại xe.',
  'M004-R3-03b: Thay đổi giá vé xe hiện có bị từ chối theo kiểm soát tài chính AP10 (DENY)'
);

-- M004-R3-02: Cập nhật tên hiển thị CONT_LANH (Patch Semantics)
DO $$
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000001'::uuid);
  PERFORM public.sc_manage_vehicle_type(
    p_code => 'CONT_LANH',
    p_display_name => 'Container Lạnh (Đã cập nhật)'
  );
END $$;

-- Assertion 15: M004-R3-02: Patch Semantics bảo toàn nguyên vẹn giá vé 250k và cờ allows_container = true
SELECT ok(
  (SELECT default_ticket_amount = 250000.00 AND allows_container = true AND is_active = true AND display_name = 'Container Lạnh (Đã cập nhật)' 
   FROM public.app_vehicle_types WHERE code = 'CONT_LANH'),
  'M004-R3-02: Patch semantics bảo toàn nguyên vẹn giá vé 250k và allows_container của CONT_LANH khi đổi tên'
);

-- Assertion 16: An ninh gọi sc_manage_vehicle_type bị từ chối do thiếu quyền admin.billing_settings.manage (DENY)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_manage_vehicle_type(
      p_code => 'HACK_TYPE',
      p_display_name => 'Xe trái phép'
    );
  $$,
  'P0001',
  'Permission Denied: Yêu cầu quyền admin.billing_settings.manage để quản lý danh mục loại phương tiện.',
  'M004-T29c: An ninh không có quyền admin.billing_settings.manage bị từ chối quản lý danh mục xe (DENY - Fix M004-R2-02)'
);

-- Vô hiệu hóa loại xe TEST_SPECIAL để kiểm thử chặn xe inactive
DO $$
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000001'::uuid);
  PERFORM public.sc_manage_vehicle_type(
    p_code => 'TEST_SPECIAL',
    p_is_active => false
  );
END $$;

-- Assertion 17: Loại xe is_active = false bị từ chối tiếp nhận vào bãi (DENY)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_create_vehicle_visit(
      p_yard_id => public.get_uuid_004('yard_1'),
      p_vehicle_type => 'TEST_SPECIAL',
      p_license_plate => '29H-INACT01'
    );
  $$,
  'P0001',
  'Loại xe TEST_SPECIAL đang bị vô hiệu hóa, không thể tiếp nhận vào bãi.',
  'M004-T29d: Loại xe đã vô hiệu hóa bị từ chối tạo lượt xe (DENY - Fix M004-R2-02)'
);

-- Kích hoạt lại TEST_SPECIAL (vẫn chưa có giá vé) để kiểm thử chặn xe chưa cấu hình giá
DO $$
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000001'::uuid);
  PERFORM public.sc_manage_vehicle_type(
    p_code => 'TEST_SPECIAL',
    p_is_active => true
  );
END $$;

-- Assertion 18: Loại xe chưa có giá vé bị từ chối, không tự động miễn phí (DENY)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_create_vehicle_visit(
      p_yard_id => public.get_uuid_004('yard_1'),
      p_vehicle_type => 'TEST_SPECIAL',
      p_license_plate => '29H-NOCONF01'
    );
  $$,
  'P0001',
  'Loại xe TEST_SPECIAL chưa được thiết lập biểu phí hợp lệ. Không thể tiếp nhận hoặc tự động miễn phí.',
  'M004-T29e: Loại xe chưa cấu hình giá bị từ chối, không tự động miễn phí (DENY - Fix M004-R2-10)'
);


-- ------------------------------------------------------------------------------
-- SUITE 3: CONSTRAINTS & RÀNG BUỘC TOÀN VẸN (DDL, FK & LIFECYCLE) (M004-R3-01, M004-R3-08)
-- ------------------------------------------------------------------------------

-- Assertion 19: FK tham chiếu app_vehicle_types từ chối loại xe không có trong danh mục (XE_KHAC)
SELECT throws_ok(
  $$
    INSERT INTO public.app_vehicle_visits (yard_id, license_plate, vehicle_type, entry_by)
    VALUES (public.get_uuid_004('yard_1'), '29H-99999', 'XE_KHAC', '10000000-0000-0000-0000-000000000002'::uuid);
  $$,
  '23503',
  NULL,
  'M004-T10a: Foreign Key từ chối mã loại xe không tồn tại trong app_vehicle_types (XE_KHAC)'
);

-- M004-R3-01: Tạo fixture riêng TEST_RESTRICT_TYPE và lượt xe tham chiếu để kiểm thử ON DELETE RESTRICT an toàn
DO $$
DECLARE
  v_veh_res uuid;
BEGIN
  INSERT INTO public.app_vehicle_types (code, display_name, description, allows_container, default_ticket_amount, is_active, sort_order)
  VALUES ('TEST_RESTRICT_TYPE', 'Xe test restrict', 'Loại xe test FK restrict', false, 50000.00, true, 999)
  ON CONFLICT (code) DO NOTHING;

  INSERT INTO public.app_vehicle_visits (yard_id, license_plate, vehicle_type, entry_by, status)
  VALUES (public.get_uuid_004('yard_1'), '29H-RESTRICT', 'TEST_RESTRICT_TYPE', '10000000-0000-0000-0000-000000000002'::uuid, 'IN_YARD')
  RETURNING id INTO v_veh_res;
  PERFORM public.set_val_004('veh_restrict', v_veh_res);
END $$;

-- Assertion 20: M004-R3-01: Fixture lượt xe tham chiếu TEST_RESTRICT_TYPE tồn tại hợp lệ
SELECT ok(
  public.get_uuid_004('veh_restrict') IS NOT NULL,
  'M004-R3-01a: Fixture lượt xe tham chiếu TEST_RESTRICT_TYPE được tạo thành công làm điều kiện kiểm thử FK'
);

-- Assertion 21: M004-R3-01: ON DELETE RESTRICT chặn xóa loại xe đã có lượt vào bãi (23503)
SELECT throws_ok(
  $$
    DELETE FROM public.app_vehicle_types WHERE code = 'TEST_RESTRICT_TYPE';
  $$,
  '23503',
  NULL,
  'M004-R3-01b: ON DELETE RESTRICT chặn xóa loại phương tiện đã phát sinh lịch sử lượt xe (Fix M004-R3-01)'
);

-- Assertion 22: M004-R3-01: Loại xe TEST_RESTRICT_TYPE vẫn tồn tại nguyên vẹn sau khi DELETE bị từ chối
SELECT ok(
  EXISTS(SELECT 1 FROM public.app_vehicle_types WHERE code = 'TEST_RESTRICT_TYPE'),
  'M004-R3-01c: Loại xe TEST_RESTRICT_TYPE vẫn tồn tại sau khi lệnh DELETE bị chặn đứng bởi FK'
);

-- Assertion 23: CHECK constraint ck_container_visits_size từ chối kích thước lạ
SELECT throws_ok(
  $$
    INSERT INTO public.app_container_visits (yard_id, container_no_current, container_no_original, container_size, created_by)
    VALUES (public.get_uuid_004('yard_1'), 'TEST1234567', 'TEST1234567', '50', '10000000-0000-0000-0000-000000000002'::uuid);
  $$,
  '23514',
  NULL,
  'M004-T10b: CHECK constraint ck_container_visits_size từ chối kích thước container không hợp lệ 50'
);

-- Assertion 24: CHECK constraint ck_container_outbound_after_inbound chặn outbound_at < inbound_at
SELECT throws_ok(
  $$
    INSERT INTO public.app_container_visits (yard_id, container_no_current, container_no_original, inbound_at, outbound_at, created_by)
    VALUES (public.get_uuid_004('yard_1'), 'TESTTIME123', 'TESTTIME123', now(), now() - interval '1 hour', '10000000-0000-0000-0000-000000000002'::uuid);
  $$,
  '23514',
  NULL,
  'M004-T13: Check constraint ck_container_outbound_after_inbound chặn giờ ra trước giờ vào'
);

-- Assertion 25: M004-R3-08: CHECK constraint ck_container_status_outbound chặn container IN_YARD có outbound_at
SELECT throws_ok(
  $$
    INSERT INTO public.app_container_visits (yard_id, container_no_current, container_no_original, status, outbound_at, created_by)
    VALUES (public.get_uuid_004('yard_1'), 'TESTOUTBND1', 'TESTOUTBND1', 'IN_YARD', now(), '10000000-0000-0000-0000-000000000002'::uuid);
  $$,
  '23514',
  NULL,
  'M004-R3-08a: CHECK constraint ck_container_status_outbound chặn container IN_YARD có outbound_at (Fix M004-R3-08)'
);

-- Chuẩn bị xe Bãi 2 để kiểm thử khóa ngoại liên kết chéo bãi
DO $$
DECLARE
  v_veh_yard2 uuid;
BEGIN
  INSERT INTO public.app_vehicle_visits (yard_id, license_plate, vehicle_type, entry_by, status)
  VALUES (public.get_uuid_004('yard_2'), '99B-CROSS01', 'DAU_KEO', '10000000-0000-0000-0000-000000000008'::uuid, 'IN_YARD')
  RETURNING id INTO v_veh_yard2;
  PERFORM public.set_val_004('veh_yard2', v_veh_yard2);
END $$;

-- Assertion 26: Composite FK fk_container_inbound_vehicle_yard chặn container Bãi 1 gắn xe Bãi 2
SELECT throws_ok(
  $$
    INSERT INTO public.app_container_visits (yard_id, container_no_current, container_no_original, inbound_vehicle_visit_id, created_by)
    VALUES (public.get_uuid_004('yard_1'), 'TESTCROSS01', 'TESTCROSS01', public.get_uuid_004('veh_yard2'), '10000000-0000-0000-0000-000000000002'::uuid);
  $$,
  '23503',
  NULL,
  'M004-T10c: Composite Foreign Key chặn đứng liên kết container và xe lệch bãi (DENY)'
);


-- ------------------------------------------------------------------------------
-- SUITE 4: TẠO LƯỢT XE & BIỂU PHÍ TÍNH TỰ ĐỘNG PHÍA SERVER (M004-T04, T05, T06, M004-R1-06)
-- ------------------------------------------------------------------------------

-- Thực hiện tạo lượt xe hợp lệ dưới quyền An ninh Bãi 1
DO $$
DECLARE
  v_veh_id uuid;
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
  v_veh_id := public.sc_create_vehicle_visit(
    p_yard_id => public.get_uuid_004('yard_1'),
    p_vehicle_type => 'CONT_LANH',
    p_license_plate => '29H-12345',
    p_driver_name => 'Nguyễn Văn Tài',
    p_driver_phone => '0912345678',
    p_ticket_code => 'VE-001',
    p_note => 'Xe vào kiểm thử'
  );
  PERFORM public.set_val_004('veh_1', v_veh_id);
END $$;

-- Assertion 27: An ninh Bãi 1 tạo lượt xe thành công tại Bãi 1 (ALLOW)
SELECT ok(public.get_uuid_004('veh_1') IS NOT NULL, 'M004-T04: An ninh Bãi 1 tạo lượt xe thành công tại Bãi 1 (ALLOW)');

-- Assertion 28: Server tự tính giá vé 250.000đ cho CONT_LANH từ app_vehicle_types (Fix M004-R1-06)
SELECT is(
  (SELECT ticket_amount FROM public.app_vehicle_visits WHERE id = public.get_uuid_004('veh_1')),
  250000.00,
  'M004-T06a: Server tự tính giá vé CONT_LANH là 250.000đ từ app_vehicle_types, không nhận từ client (Fix M004-R1-06)'
);

-- M004-R2-02: throws_ok với mã lỗi P0001 và thông điệp lỗi chính xác 100%
-- Assertion 29: An ninh Bãi 1 tạo xe tại Bãi 2 bị từ chối phạm vi bãi (DENY)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_create_vehicle_visit(
      p_yard_id => public.get_uuid_004('yard_2'),
      p_vehicle_type => 'CONT_LANH',
      p_license_plate => '29H-99999'
    );
  $$,
  'P0001',
  'Permission Denied: Không có quyền tạo lượt xe vào tại bãi tương ứng.',
  'M004-T05: An ninh Bãi 1 không được phép tạo xe tại Bãi 2 (DENY - Fix M004-R2-02)'
);

-- Assertion 30: Nhân viên CCKB gọi tạo xe bị từ chối do thiếu quyền vehicle.visit.create (DENY)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000004'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_create_vehicle_visit(
      p_yard_id => public.get_uuid_004('yard_1'),
      p_vehicle_type => 'CONT_LANH',
      p_license_plate => '29H-88888'
    );
  $$,
  'P0001',
  'Permission Denied: Không có quyền tạo lượt xe vào tại bãi tương ứng.',
  'M004-T06c: Nhân viên CCKB không có quyền vehicle.visit.create bị từ chối (DENY - Fix M004-R2-02)'
);


-- ------------------------------------------------------------------------------
-- SUITE 5: TẠO LƯỢT CONTAINER & VÒNG ĐỜI ĐỘC LẬP (M004-T07, T08, T09, M004-R1-04, M004-R2-04)
-- ------------------------------------------------------------------------------

-- Thực hiện tạo lượt container gắn với Xe 1 dưới quyền An ninh Bãi 1
DO $$
DECLARE
  v_cont_id uuid;
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
  v_cont_id := public.sc_create_container_visit(
    p_yard_id => public.get_uuid_004('yard_1'),
    p_container_no => 'MSCU1112223',
    p_inbound_vehicle_visit_id => public.get_uuid_004('veh_1'),
    p_container_size => '40',
    p_container_type => 'RF'
  );
  PERFORM public.set_val_004('cont_1', v_cont_id);
END $$;

-- Assertion 31: An ninh Bãi 1 tạo container visit thành công (ALLOW)
SELECT ok(public.get_uuid_004('cont_1') IS NOT NULL, 'M004-T07a: An ninh Bãi 1 tạo container visit thành công (ALLOW)');

-- Assertion 32: Container và Xe có UUID độc lập riêng biệt
SELECT ok(public.get_uuid_004('cont_1') <> public.get_uuid_004('veh_1'), 'M004-T07b: Container và Xe có 2 UUID độc lập riêng biệt');

-- Assertion 33: Server luôn khởi tạo cargo_status = CHUA_XAC_DINH (Fix M004-R1-04)
SELECT is(
  (SELECT cargo_status FROM public.app_container_visits WHERE id = public.get_uuid_004('cont_1')),
  'CHUA_XAC_DINH',
  'M004-R1-04: Container mới tạo luôn có cargo_status = CHUA_XAC_DINH do server thiết lập'
);

-- M004-R2-04: Assertion kiểm tra is_legacy_import đúng bảng app_container_visits (Fix M004-R2-04)
-- Assertion 34: Server tự gán is_legacy_import = false trên bảng container, không nhận từ client
SELECT is(
  (SELECT is_legacy_import FROM public.app_container_visits WHERE id = public.get_uuid_004('cont_1')),
  false,
  'M004-T06b: Server khởi tạo is_legacy_import = false cho lượt container mới (Fix M004-R2-04)'
);

-- Assertion 35: Điều phối viên gọi tạo container visit bị từ chối do thiếu quyền (DENY)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000006'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_create_container_visit(
      p_yard_id => public.get_uuid_004('yard_1'),
      p_container_no => 'TEMU1234567',
      p_inbound_vehicle_visit_id => public.get_uuid_004('veh_1')
    );
  $$,
  'P0001',
  'Permission Denied: Không có quyền tạo lượt container tại bãi tương ứng.',
  'M004-T06d: Nhân viên Điều phối không có quyền container.visit.create bị từ chối (DENY - Fix M004-R2-02)'
);

-- Mô phỏng Xe 1 rời bãi độc lập (vòng đời xe kết thúc)
UPDATE public.app_vehicle_visits
SET status = 'EXITED', exit_at = now(), exit_by = '10000000-0000-0000-0000-000000000002'::uuid
WHERE id = public.get_uuid_004('veh_1');

-- Assertion 36: Xe 1 rời bãi, Container 1 vẫn giữ trạng thái IN_YARD (M004-T08)
SELECT is(
  (SELECT status FROM public.app_container_visits WHERE id = public.get_uuid_004('cont_1')),
  'IN_YARD',
  'M004-T08: Xe vào xuất bãi không làm thay đổi trạng thái IN_YARD của container'
);

-- Mô phỏng Xe B vào bãi và nhận Container 1 ra khỏi bãi (M004-T09)
DO $$
DECLARE
  v_veh_b uuid;
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
  v_veh_b := public.sc_create_vehicle_visit(public.get_uuid_004('yard_1'), 'DAU_KEO', '29C-88888');
  PERFORM public.set_val_004('veh_b', v_veh_b);

  UPDATE public.app_container_visits
  SET outbound_vehicle_visit_id = v_veh_b
  WHERE id = public.get_uuid_004('cont_1');
END $$;

-- Assertion 37: Container 1 có thể liên kết với Xe B khác đến nhận ra khỏi bãi (M004-T09)
SELECT is(
  (SELECT outbound_vehicle_visit_id FROM public.app_container_visits WHERE id = public.get_uuid_004('cont_1')),
  public.get_uuid_004('veh_b'),
  'M004-T09: Container có thể liên kết với Xe B khác đến nhận ra khỏi bãi'
);


-- ------------------------------------------------------------------------------
-- SUITE 6: MÔ HÌNH 1:N VÀ BẢO TOÀN V1 OPERATIONAL BASELINE (M004-T11, T12, M004-R1-09, R1-11, M004-R2-06, R2-07, M004-R3-09)
-- ------------------------------------------------------------------------------

-- Chuẩn bị fixture 1 xe cõng 2 cont ở tầng cấu trúc DDL
DO $$
DECLARE
  v_veh_mooc uuid;
BEGIN
  INSERT INTO public.app_vehicle_visits (yard_id, license_plate, vehicle_type, entry_by, status)
  VALUES (public.get_uuid_004('yard_1'), '29H-MOOC2X20', 'DAU_KEO', '10000000-0000-0000-0000-000000000002'::uuid, 'IN_YARD')
  RETURNING id INTO v_veh_mooc;
  PERFORM public.set_val_004('veh_mooc', v_veh_mooc);

  INSERT INTO public.app_container_visits (yard_id, container_no_current, container_no_original, container_size, inbound_vehicle_visit_id, created_by)
  VALUES (public.get_uuid_004('yard_1'), 'TGHU2000001', 'TGHU2000001', '20', v_veh_mooc, '10000000-0000-0000-0000-000000000002'::uuid);

  INSERT INTO public.app_container_visits (yard_id, container_no_current, container_no_original, container_size, inbound_vehicle_visit_id, created_by)
  VALUES (public.get_uuid_004('yard_1'), 'TGHU2000002', 'TGHU2000002', '20', v_veh_mooc, '10000000-0000-0000-0000-000000000002'::uuid);
END $$;

-- Assertion 38: CSDL hỗ trợ quan hệ 1:N ở tầng cấu trúc (M004-T11)
SELECT is(
  (SELECT count(*)::int FROM public.app_container_visits WHERE inbound_vehicle_visit_id = public.get_uuid_004('veh_mooc')),
  2,
  'M004-T11: CSDL hỗ trợ quan hệ 1:N, cho phép 1 xe cõng nhiều cont trong cấu trúc DDL'
);

-- Chuẩn bị xe V1 để kiểm thử giới hạn 1 xe / 1 cont ở tầng RPC
DO $$
DECLARE
  v_veh_v1 uuid;
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
  v_veh_v1 := public.sc_create_vehicle_visit(public.get_uuid_004('yard_1'), 'CONT_LANH', '29C-V1CHECK');
  PERFORM public.set_val_004('veh_v1check', v_veh_v1);
  PERFORM public.sc_create_container_visit(public.get_uuid_004('yard_1'), 'V1CONT00001', v_veh_v1);
END $$;

-- Assertion 39: RPC V1 từ chối cont thứ 2 trên cùng xe (chưa CANCELLED) theo V1 baseline (M004-T12, Fix M004-R2-02 exact message)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_create_container_visit(public.get_uuid_004('yard_1'), 'V1CONT00002', public.get_uuid_004('veh_v1check'));
  $$,
  'P0001',
  'Quy tắc vận hành V1 hiện hành: Mỗi lượt xe chỉ tiếp nhận tối đa 1 container. Thao tác tiếp nhận nhiều container trên cùng một lượt xe chưa được phê duyệt UAT.',
  'M004-T12: RPC sc_create_container_visit từ chối xe chở nhiều container theo V1 baseline (DENY - Fix M004-R2-02)'
);

-- Chuẩn bị xe mới để kiểm thử trùng số container đang IN_YARD trong cùng bãi (Fix M004-R1-11)
DO $$
DECLARE
  v_veh_dup uuid;
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
  v_veh_dup := public.sc_create_vehicle_visit(public.get_uuid_004('yard_1'), 'CONT_LANH', '29C-DUPCHECK');
  PERFORM public.set_val_004('veh_dupcheck', v_veh_dup);
END $$;

-- Assertion 40: RPC sc_create_container_visit từ chối khi số container đang IN_YARD tại cùng bãi (Fix M004-R2-02 exact message)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_create_container_visit(public.get_uuid_004('yard_1'), 'MSCU1112223', public.get_uuid_004('veh_dupcheck'));
  $$,
  'P0001',
  'Cảnh báo trùng số container: Container MSCU1112223 hiện đang có một lượt lưu bãi khác ở trạng thái IN_YARD trong cùng bãi. Không tự động gộp lượt. Vui lòng xác minh thực tế.',
  'M004-R1-11a: RPC từ chối tạo container có số đang tồn tại IN_YARD trong cùng bãi (Fix M004-R2-02)'
);

-- Chuẩn bị xe bo 3 bánh để kiểm thử loại xe không được chở container (Fix M004-R2-07, M004-R3-09)
DO $$
DECLARE
  v_veh_bo uuid;
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
  v_veh_bo := public.sc_create_vehicle_visit(public.get_uuid_004('yard_1'), 'XE_BO_3_BANH', NULL);
  PERFORM public.set_val_004('veh_bo_3_banh', v_veh_bo);
END $$;

-- M004-R2-07 & M004-R3-09: Assertion 41 kiểm tra chặn gắn container vào loại xe không được phép theo cấu hình danh mục
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_create_container_visit(public.get_uuid_004('yard_1'), 'CONTVEHCHECK', public.get_uuid_004('veh_bo_3_banh'));
  $$,
  'P0001',
  'Loại phương tiện XE_BO_3_BANH không được phép tiếp nhận container vào bãi theo cấu hình danh mục phương tiện.',
  'M004-T27: Chặn gắn container vào xe không cho phép chở cont với thông báo cấu hình chung (Fix M004-R3-09)'
);

-- M004-R3-06: Assertion 42 kiểm tra Database uniqueness invariant của Partial Unique Index chặn trùng số IN_YARD
SELECT throws_ok(
  $$
    INSERT INTO public.app_container_visits (yard_id, container_no_current, container_no_original, created_by)
    VALUES (public.get_uuid_004('yard_1'), 'MSCU1112223', 'MSCU1112223', '10000000-0000-0000-0000-000000000002'::uuid);
  $$,
  '23505',
  NULL,
  'M004-T12c: Database uniqueness invariant - Partial Unique Index uq_container_visits_active_number_yard chặn trùng số container IN_YARD (Fix M004-R3-06)'
);


-- ------------------------------------------------------------------------------
-- SUITE 7: RETRY SAFETY & IDEMPOTENCY KEY (M004-R3-04)
-- ------------------------------------------------------------------------------

-- Chuẩn bị fixture kiểm thử Idempotency cho lượt xe
DO $$
DECLARE
  v_idem1 uuid;
  v_idem2 uuid;
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
  v_idem1 := public.sc_create_vehicle_visit(
    p_yard_id => public.get_uuid_004('yard_1'),
    p_vehicle_type => 'CONT_LANH',
    p_license_plate => '29C-IDEM01',
    p_idempotency_key => 'IDEM-VEH-001'
  );
  PERFORM public.set_val_004('veh_idem1', v_idem1);

  -- Gọi lại lần 2 cùng thông tin và idempotency key (mô phỏng network retry)
  v_idem2 := public.sc_create_vehicle_visit(
    p_yard_id => public.get_uuid_004('yard_1'),
    p_vehicle_type => 'CONT_LANH',
    p_license_plate => '29C-IDEM01',
    p_idempotency_key => 'IDEM-VEH-001'
  );
  PERFORM public.set_val_004('veh_idem2', v_idem2);
END $$;

-- Assertion 43: Tạo lượt xe với idempotency_key thành công lần đầu
SELECT ok(
  public.get_uuid_004('veh_idem1') IS NOT NULL,
  'M004-R3-04a: Tạo lượt xe với idempotency_key thành công lần đầu'
);

-- Assertion 44: Retry gọi sc_create_vehicle_visit cùng key trả về đúng ID cũ (idempotent replay)
SELECT is(
  public.get_uuid_004('veh_idem2'),
  public.get_uuid_004('veh_idem1'),
  'M004-R3-04b: Idempotent replay: Retry gọi sc_create_vehicle_visit trả về đúng visit ID cũ mà không tạo trùng'
);

-- Assertion 45: Tái sử dụng idempotency_key của xe với thông tin khác bị từ chối fail-safe
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_create_vehicle_visit(
      p_yard_id => public.get_uuid_004('yard_1'),
      p_vehicle_type => 'CONT_LANH',
      p_license_plate => '29C-DIFFERENT',
      p_driver_name => NULL,
      p_driver_phone => NULL,
      p_ticket_code => NULL,
      p_note => NULL,
      p_idempotency_key => 'IDEM-VEH-001'
    );
  $$,
  'P0001',
  'Idempotency key IDEM-VEH-001 đã được sử dụng với thông tin lượt xe khác.',
  'M004-R3-04c: Idempotency key lượt xe bị tái sử dụng với thông tin khác bị từ chối'
);

-- Chuẩn bị fixture kiểm thử Idempotency cho lượt container
DO $$
DECLARE
  v_cidem1 uuid;
  v_cidem2 uuid;
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
  v_cidem1 := public.sc_create_container_visit(
    p_yard_id => public.get_uuid_004('yard_1'),
    p_container_no => 'IDEMCONT01',
    p_inbound_vehicle_visit_id => public.get_uuid_004('veh_idem1'),
    p_idempotency_key => 'IDEM-CONT-001'
  );
  PERFORM public.set_val_004('cont_idem1', v_cidem1);

  -- Gọi lại lần 2 cùng thông tin container và key
  v_cidem2 := public.sc_create_container_visit(
    p_yard_id => public.get_uuid_004('yard_1'),
    p_container_no => 'IDEMCONT01',
    p_inbound_vehicle_visit_id => public.get_uuid_004('veh_idem1'),
    p_idempotency_key => 'IDEM-CONT-001'
  );
  PERFORM public.set_val_004('cont_idem2', v_cidem2);
END $$;

-- Assertion 46: Tạo lượt container với idempotency_key thành công lần đầu
SELECT ok(
  public.get_uuid_004('cont_idem1') IS NOT NULL,
  'M004-R3-04d: Tạo lượt container với idempotency_key thành công lần đầu'
);

-- Assertion 47: Retry gọi sc_create_container_visit cùng key trả về đúng ID cũ (idempotent replay)
SELECT is(
  public.get_uuid_004('cont_idem2'),
  public.get_uuid_004('cont_idem1'),
  'M004-R3-04e: Idempotent replay: Retry gọi sc_create_container_visit trả về đúng container ID cũ'
);

-- Assertion 48: Tái sử dụng idempotency_key của container với thông tin khác bị từ chối fail-safe
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_create_container_visit(
      p_yard_id => public.get_uuid_004('yard_1'),
      p_container_no => 'IDEMCONT99',
      p_inbound_vehicle_visit_id => public.get_uuid_004('veh_idem1'),
      p_container_size => NULL,
      p_container_type => 'RF',
      p_idempotency_key => 'IDEM-CONT-001'
    );
  $$,
  'P0001',
  'Idempotency key IDEM-CONT-001 đã được sử dụng với thông tin lượt container khác.',
  'M004-R3-04f: Idempotency key container bị tái sử dụng với thông tin khác bị từ chối'
);


-- ------------------------------------------------------------------------------
-- SUITE 8: KIỂM SOÁT BÃI VÔ HIỆU HÓA (M004-R3-07)
-- ------------------------------------------------------------------------------

-- Assertion 49: M004-R3-07: sc_create_container_visit từ chối tiếp nhận container vào bãi đang bị vô hiệu hóa
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  format(
    $$ SELECT public.sc_create_container_visit('%s'::uuid, 'INACTCONT01', '%s'::uuid); $$,
    public.get_uuid_004('yard_inactive'),
    public.get_uuid_004('veh_1')
  ),
  'P0001',
  'Bãi không hợp lệ hoặc đang bị vô hiệu hóa: ' || public.get_uuid_004('yard_inactive')::text,
  'M004-T33: sc_create_container_visit từ chối tiếp nhận container vào bãi đang bị vô hiệu hóa (Fix M004-R3-07)'
);


-- ------------------------------------------------------------------------------
-- SUITE 9: SỬA SỐ CONTAINER & BẢO TOÀN LỊCH SỬ BẤT BIẾN (M004-T14, T15, T16, T17, M004-R1-08, M004-R2-08, R2-09)
-- ------------------------------------------------------------------------------

-- Chuẩn bị container để thực hiện sửa số dưới quyền An ninh Bãi 1
DO $$
DECLARE
  v_veh_chg uuid;
  v_cont_chg uuid;
  v_chg_id bigint;
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
  v_veh_chg := public.sc_create_vehicle_visit(public.get_uuid_004('yard_1'), 'CONT_LANH', '29C-NUMCHG');
  v_cont_chg := public.sc_create_container_visit(public.get_uuid_004('yard_1'), 'WRONG123456', v_veh_chg);
  PERFORM public.set_val_004('cont_chg', v_cont_chg);

  v_chg_id := public.sc_correct_container_number(
    p_container_visit_id => v_cont_chg,
    p_new_container_no => 'RIGHT123456',
    p_reason => 'Nhập sai ký tự số 4 theo biên bản hiện trường',
    p_evidence_url => 'https://storage.soncang.vn/evidence/001.jpg'
  );
  PERFORM public.set_val_004('chg_1', NULL, NULL, v_chg_id);
END $$;

-- Assertion 50: An ninh sửa số container thành công, sinh bản ghi lịch sử (M004-T14a)
SELECT ok(public.get_bigint_004('chg_1') IS NOT NULL, 'M004-T14a: An ninh sửa số container thành công, sinh bản ghi lịch sử');

-- Assertion 51: Số container hiện hành trong app_container_visits được đổi sang số mới
SELECT is(
  (SELECT container_no_current FROM public.app_container_visits WHERE id = public.get_uuid_004('cont_chg')),
  'RIGHT123456',
  'M004-T14b: Số container hiện hành được cập nhật sang số mới'
);

-- M004-R2-09: Assertion 52 đối chiếu UUID trước và sau khi sửa số container
SELECT is(
  (SELECT id FROM public.app_container_visits WHERE container_no_current = 'RIGHT123456'),
  public.get_uuid_004('cont_chg'),
  'M004-T16: UUID container trước và sau khi sửa số trùng khớp nhau 100% (Fix M004-R2-09)'
);

-- M004-R2-09: Assertion 53 xác minh audit log thực tế được sinh ra trong app_audit_events
SELECT is(
  (SELECT count(*)::int FROM public.app_audit_events WHERE action_code = 'container.number.correct' AND target_id = public.get_uuid_004('cont_chg')::text),
  1,
  'M004-T14c: Bản ghi audit log container.number.correct được sinh thực tế trong app_audit_events (Fix M004-R2-09)'
);

-- Assertion 54: Sửa số container không có lý do bị từ chối (M004-T15a, Fix M004-R2-02 exact message)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_correct_container_number(public.get_uuid_004('cont_chg'), 'NEWNUM999', '   ');
  $$,
  'P0001',
  'Lý do sửa số container là bắt buộc (tối thiểu 3 ký tự).',
  'M004-T15a: Sửa số container thiếu lý do bị từ chối (DENY - Fix M004-R2-02)'
);

-- Assertion 55: Sửa số mới trùng số cũ bị từ chối fail-safe (M004-T22, Fix M004-R2-02 exact message)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_correct_container_number(public.get_uuid_004('cont_chg'), 'RIGHT123456', 'Sửa trùng số');
  $$,
  'P0001',
  'Số container mới phải khác số container hiện tại (RIGHT123456).',
  'M004-T22: Sửa số mới trùng số cũ bị từ chối fail-safe (DENY - Fix M004-R2-02)'
);

-- Assertion 56: Sửa số mới trùng số container khác đang IN_YARD bị từ chối (Fix M004-R2-02 exact message)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_correct_container_number(public.get_uuid_004('cont_chg'), 'MSCU1112223', 'Sửa trùng cont đang trong bãi');
  $$,
  'P0001',
  'Cảnh báo trùng số container: Số container mới (MSCU1112223) hiện đang thuộc một lượt container khác đang ở trong bãi (IN_YARD). Không thể sửa trùng lặp.',
  'M004-R1-11b: Sửa số mới trùng số cont đang IN_YARD bị từ chối (Fix M004-R2-02)'
);

-- Assertion 57: An ninh Bãi 2 sửa container Bãi 1 bị từ chối phạm vi bãi (M004-T15b, Fix M004-R2-02 exact message)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000008'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_correct_container_number(public.get_uuid_004('cont_chg'), 'YARD2HACK01', 'An ninh bãi 2 can thiệp');
  $$,
  'P0001',
  'Permission Denied: Không có quyền sửa số container tại bãi tương ứng.',
  'M004-T15b: An ninh khác bãi gọi sửa số container bị từ chối (DENY - Fix M004-R2-02)'
);

-- Assertion 58: Trigger chặn DELETE trên bảng app_container_number_changes (append-only) (Fix M004-R2-02 exact message)
SELECT throws_ok(
  $$
    DELETE FROM public.app_container_number_changes WHERE id = public.get_bigint_004('chg_1');
  $$,
  'P0001',
  'Lịch sử sửa số container là bất biến (append-only). Nghiêm cấm xóa bản ghi.',
  'M004-T17a: Trigger chặn DELETE trên app_container_number_changes (DENY - Fix M004-R2-02)'
);

-- Assertion 59: Trigger chặn sửa evidence_url trên app_container_number_changes (Fix M004-R2-02 exact message)
SELECT throws_ok(
  $$
    UPDATE public.app_container_number_changes
    SET evidence_url = 'https://hacked.com/pic.jpg'
    WHERE id = public.get_bigint_004('chg_1');
  $$,
  'P0001',
  'Dữ liệu lịch sử sửa số container và chứng cứ là bất biến. Không được phép chỉnh sửa các thông tin gốc.',
  'M004-R1-08a: Trigger chặn sửa evidence_url (Fix M004-R2-02)'
);


-- ------------------------------------------------------------------------------
-- SUITE 10: ĐỐI SOÁT SAI LỆCH SỐ CONTAINER & PHÂN QUYỀN RLS (M004-T18, M004-R1-05, R1-08, M004-R2-08)
-- ------------------------------------------------------------------------------

-- An ninh xác nhận đã báo CCKB
DO $$
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
  PERFORM public.sc_ack_container_number_discrepancy(public.get_bigint_004('chg_1'));
END $$;

-- M004-R2-08: Assertion 60 kiểm tra trigger chặn xóa dấu xác nhận An ninh về NULL qua IS DISTINCT FROM
SELECT throws_ok(
  $$
    UPDATE public.app_container_number_changes
    SET sec_ack_at = NULL
    WHERE id = public.get_bigint_004('chg_1');
  $$,
  'P0001',
  'Thông tin xác nhận của An ninh đã được ghi nhận trước đó, không được phép sửa đổi hoặc xóa bỏ.',
  'M004-R2-08a: Trigger chặn xóa dấu sec_ack_at về NULL qua IS DISTINCT FROM (Fix M004-R2-08)'
);

-- CCKB Bãi 1 thực hiện đối soát bản ghi chg_1
DO $$
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000004'::uuid);
  PERFORM public.sc_reconcile_container_number_discrepancy(
    p_change_id => public.get_bigint_004('chg_1'),
    p_reconcile_notes => 'Đã đối chiếu với chứng từ điện tử hải quan'
  );
END $$;

-- Assertion 61: CCKB đối soát discrepancy thành công (M004-T18a)
SELECT ok(
  (SELECT reconciled_at FROM public.app_container_number_changes WHERE id = public.get_bigint_004('chg_1')) IS NOT NULL,
  'M004-T18a: CCKB đối soát sai lệch số container thành công (ALLOW)'
);

-- M004-R2-08: Assertion 62 kiểm tra trigger chặn xóa dấu đối soát CCKB về NULL qua IS DISTINCT FROM
SELECT throws_ok(
  $$
    UPDATE public.app_container_number_changes
    SET reconciled_at = NULL
    WHERE id = public.get_bigint_004('chg_1');
  $$,
  'P0001',
  'Thông tin đối soát của CCKB đã được ghi nhận trước đó, không được phép sửa đổi hoặc xóa bỏ.',
  'M004-R2-08b: Trigger chặn xóa dấu reconciled_at về NULL qua IS DISTINCT FROM (Fix M004-R2-08)'
);

-- Chuẩn bị bản ghi sửa số thứ 2 (chưa reconcile) để kiểm thử An ninh bị từ chối đối soát
DO $$
DECLARE
  v_veh_chg2 uuid;
  v_cont_chg2 uuid;
  v_chg_id2 bigint;
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
  v_veh_chg2 := public.sc_create_vehicle_visit(public.get_uuid_004('yard_1'), 'CONT_LANH', '29C-NUMCHG2');
  v_cont_chg2 := public.sc_create_container_visit(public.get_uuid_004('yard_1'), 'ORIGIN99999', v_veh_chg2);
  v_chg_id2 := public.sc_correct_container_number(v_cont_chg2, 'REVISE99999', 'Sửa lần 2 tạo fixture đối soát');
  PERFORM public.set_val_004('chg_2', NULL, NULL, v_chg_id2);
END $$;

-- Assertion 63: An ninh gọi đối soát CCKB bị từ chối do thiếu quyền (Fix M004-R2-02 exact message)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_reconcile_container_number_discrepancy(public.get_bigint_004('chg_2'), 'An ninh thử đối soát');
  $$,
  'P0001',
  'Permission Denied: Chỉ bộ phận CCKB (PORT_STAFF, PORT_LEAD) hoặc Quản trị mới có quyền đối soát sai số container tại bãi này.',
  'M004-T18b: An ninh gọi đối soát CCKB bị từ chối (DENY - Fix M004-R2-02)'
);

-- M004-R2-03: Kiểm thử RLS bằng SET LOCAL ROLE authenticated tạm thời, sau đó RESET ROLE
-- Assertion 64: RLS kiểm tra: CCKB có quyền container.number.discrepancy.view nhìn thấy 2 bản ghi
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000004'::uuid);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.app_container_number_changes WHERE yard_id = public.get_uuid_004('yard_1')),
  2,
  'M004-R1-05a: CCKB có quyền container.number.discrepancy.view nhìn thấy 2 bản ghi lịch sử sửa số qua RLS'
);
RESET ROLE;

-- Assertion 65: RLS kiểm tra: Điều phối (chỉ có container.visit.read, KHÔNG có discrepancy.view) thấy 0 bản ghi
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000006'::uuid);
SET LOCAL ROLE authenticated;
SELECT is(
  (SELECT count(*)::int FROM public.app_container_number_changes WHERE yard_id = public.get_uuid_004('yard_1')),
  0,
  'M004-R1-05b: Điều phối bị RLS chặn hoàn toàn không thấy lịch sử sửa số (Fix M004-R1-05)'
);
RESET ROLE;


-- ------------------------------------------------------------------------------
-- SUITE 11: QUẢN LÝ HÀNG/RỖNG & QUY TRÌNH AP05 (M004-T19, T20, T21, M004-R1-12, M004-R3-08)
-- ------------------------------------------------------------------------------

-- Chuẩn bị container để kiểm thử quản lý HÀNG/RỖNG
DO $$
DECLARE
  v_veh_cargo uuid;
  v_cont_cargo uuid;
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
  v_veh_cargo := public.sc_create_vehicle_visit(public.get_uuid_004('yard_1'), 'CONT_LANH', '29C-CARGOK');
  v_cont_cargo := public.sc_create_container_visit(public.get_uuid_004('yard_1'), 'CARGOCONT001', v_veh_cargo);
  PERFORM public.set_val_004('cont_cargo', v_cont_cargo);

  -- Điều phối cập nhật sang HANG
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000006'::uuid);
  PERFORM public.sc_update_container_cargo(v_cont_cargo, 'HANG');
END $$;

-- Assertion 66: Điều phối viên cập nhật HÀNG/RỖNG thành công khi cont IN_YARD (M004-T19)
SELECT is(
  (SELECT cargo_status FROM public.app_container_visits WHERE id = public.get_uuid_004('cont_cargo')),
  'HANG',
  'M004-T19: Điều phối cập nhật HÀNG/RỖNG thành công khi cont IN_YARD (ALLOW)'
);

-- Assertion 67: An ninh thử cập nhật HÀNG/RỖNG bị từ chối do thiếu quyền (Fix M004-R2-02 exact message)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_update_container_cargo(public.get_uuid_004('cont_cargo'), 'RONG');
  $$,
  'P0001',
  'Permission Denied: Chỉ bộ phận Điều phối (DIS_STAFF, DIS_LEAD) hoặc Quản trị mới có quyền cập nhật HÀNG/RỖNG tại bãi này.',
  'M004-T20: An ninh thử cập nhật HÀNG/RỖNG bị từ chối (DENY - Fix M004-R2-02)'
);

-- Giả lập container xuất bãi để kiểm thử quy tắc AP05 (đảm bảo outbound_at IS NOT NULL)
UPDATE public.app_container_visits
SET status = 'EXITED', outbound_at = now()
WHERE id = public.get_uuid_004('cont_cargo');

-- Assertion 68: Điều phối cập nhật HÀNG/RỖNG khi cont EXITED bị từ chối theo AP05 (Fix M004-R2-02 exact message)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000006'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_update_container_cargo(public.get_uuid_004('cont_cargo'), 'RONG');
  $$,
  'P0001',
  'Container đã xuất bãi (EXITED). Sửa trạng thái HÀNG/RỖNG sau khi xuất bãi yêu cầu quy trình phê duyệt AP05 (container.cargo.post_exit.request/approve).',
  'M004-T21: Sửa HÀNG/RỖNG khi cont EXITED bị từ chối theo AP05 (DENY - Fix M004-R2-02)'
);

-- M004-R3-08: Chuẩn bị fixture container CANCELLED độc lập từ IN_YARD (không qua EXITED)
DO $$
DECLARE
  v_veh_cfix uuid;
  v_cont_cfix uuid;
BEGIN
  PERFORM public.set_test_jwt_004('10000000-0000-0000-0000-000000000002'::uuid);
  v_veh_cfix := public.sc_create_vehicle_visit(public.get_uuid_004('yard_1'), 'CONT_LANH', '29C-CANCELFIX');
  v_cont_cfix := public.sc_create_container_visit(public.get_uuid_004('yard_1'), 'CANCELCONT01', v_veh_cfix);
  PERFORM public.set_val_004('cont_cancel_fix', v_cont_cfix);

  -- Hủy container trực tiếp từ trạng thái IN_YARD (outbound_at vẫn là NULL)
  UPDATE public.app_container_visits
  SET status = 'CANCELLED'
  WHERE id = v_cont_cfix;
END $$;

-- Assertion 69: M004-R3-08: Cập nhật HÀNG/RỖNG khi cont CANCELLED bị từ chối
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000006'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_update_container_cargo(public.get_uuid_004('cont_cancel_fix'), 'RONG');
  $$,
  'P0001',
  'Không thể cập nhật HÀNG/RỖNG cho container đã bị hủy (CANCELLED).',
  'M004-R1-12: Cập nhật HÀNG/RỖNG khi cont CANCELLED bị từ chối (DENY - Fix M004-R3-08)'
);


-- ------------------------------------------------------------------------------
-- SUITE 12: RÀNG BUỘC NGƯỜI DÙNG & BẢO MẬT HỆ THỐNG (M004-T24, T25, T26, M004-R2-01)
-- ------------------------------------------------------------------------------

-- Assertion 70: Assignment hết hạn bị từ chối gọi RPC (Fix M004-R2-02 exact message)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000009'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_create_vehicle_visit(public.get_uuid_004('yard_1'), 'CONT_LANH', '29C-EXPIRED');
  $$,
  'P0001',
  'Permission Denied: Không có quyền tạo lượt xe vào tại bãi tương ứng.',
  'M004-T24a: Người dùng có vai trò đã hết hạn bị từ chối gọi RPC (DENY - Fix M004-R2-02)'
);

-- Assertion 71: Assignment inactive bị từ chối gọi RPC (Fix M004-R2-02 exact message)
SELECT public.set_test_jwt_004('10000000-0000-0000-0000-000000000010'::uuid);
SELECT throws_ok(
  $$
    SELECT public.sc_create_vehicle_visit(public.get_uuid_004('yard_1'), 'CONT_LANH', '29C-INACTIVE');
  $$,
  'P0001',
  'Permission Denied: Không có quyền tạo lượt xe vào tại bãi tương ứng.',
  'M004-T24b: Người dùng có vai trò bị vô hiệu hóa (inactive) bị từ chối gọi RPC (DENY - Fix M004-R2-02)'
);

-- Assertion 72: Không có RPC public nào cho phép kết thúc xuất bãi tại Migration 004 (M004-T25)
SELECT is(
  (SELECT count(*)::int FROM pg_proc WHERE proname IN ('sc_exit_vehicle', 'sc_exit_container', 'sc_confirm_exit')),
  0,
  'M004-T25: Chưa có RPC public nào cho phép kết thúc xuất bãi tại Migration 004 (deferred to 007)'
);

-- M004-R2-01: Thay hasnt_function_privilege bằng ok(NOT pg_catalog.has_function_privilege(...))
-- Assertion 73: sc_manage_vehicle_type không cấp quyền EXECUTE cho anon
SELECT ok(
  NOT pg_catalog.has_function_privilege('anon', 'public.sc_manage_vehicle_type(text, text, text, boolean, numeric, boolean, integer)', 'EXECUTE'),
  'M004-T31: sc_manage_vehicle_type không cấp quyền EXECUTE cho anon (Fix M004-R2-01)'
);

-- Assertion 74: sc_create_vehicle_visit không cấp quyền EXECUTE cho anon (chữ ký 8 tham số có idempotency_key)
SELECT ok(
  NOT pg_catalog.has_function_privilege('anon', 'public.sc_create_vehicle_visit(uuid, text, text, text, text, text, text, text)', 'EXECUTE'),
  'M004-T26a: sc_create_vehicle_visit không cấp quyền EXECUTE cho anon (Fix M004-R3-04)'
);

-- Assertion 75: sc_log_audit_event bị thu hồi EXECUTE khỏi authenticated (chống spoof audit)
SELECT ok(
  NOT pg_catalog.has_function_privilege('authenticated', 'public.sc_log_audit_event(text, text, text, uuid, text, jsonb, jsonb, text, text, jsonb)', 'EXECUTE'),
  'M004-T26b: sc_log_audit_event bị thu hồi EXECUTE khỏi authenticated (chống spoof audit - Fix M004-R2-01)'
);

-- Kết thúc kiểm thử an toàn
SELECT finish();
ROLLBACK;
