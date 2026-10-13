#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GATE B RUNTIME VERIFICATION SCRIPT — SƠN CẢNG YMS (MIGRATION 004 R4)
Thực thi kiểm thử thực tế trên PostgreSQL 17 Local:
1. Concurrency Race Tests (2 kết nối đồng thời với barrier sync):
   - RACE-01: Trùng idempotency_key đồng thời -> Idempotent replay an toàn
   - RACE-02: Trùng số container IN_YARD đồng thời -> Unique constraint chặn an toàn
2. LG-01 Idempotency Payload Alteration & Replay:
   - LG-01a: Sai lệch payload xe bị từ chối P0001
   - LG-01b: Sai lệch payload cont bị từ chối P0001
   - LG-01c: Trùng payload xe replay thành công
   - LG-01d: Trùng payload cont replay thành công
3. Authenticated vs Anon Privileges & RLS Boundaries:
   - SEC-01: Anon gọi RPC bị từ chối
   - SEC-02: Anon SELECT lịch sử bị từ chối
   - SEC-03: RLS Điều phối không thấy lịch sử sửa số
   - SEC-04: An ninh đổi HÀNG/RỖNG bị từ chối fail-closed
   - SEC-05: SYS_ADMIN sửa giá vé trực tiếp bị chặn theo AP10 Four-Eyes
4. Sửa số container, bảo toàn UUID & Lịch sử bất biến:
   - HIST-01: Sửa số bảo toàn UUID & sinh audit log
   - HIST-02: Trigger chặn DELETE trên lịch sử sửa số
   - HIST-03: Trigger chặn UPDATE trên lịch sử sửa số
5. Lifecycle & Scope Protection:
   - LIFE-01: Không có RPC xuất bãi trong 004 (bảo vệ Migration 007)
   - LIFE-02: Constraint ck_container_status_outbound chặn dữ liệu sai
   - LIFE-03: Constraint ck_vehicle_status_exit chặn dữ liệu sai
"""

import subprocess
import threading
import time
import json
import re
import sys

# Configure UTF-8 for console output on Windows
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

CONTAINER = "supabase_db_YMS-project"

def run_psql(sql, user="postgres", db="postgres"):
    cmd = ["docker", "exec", "-i", CONTAINER, "psql", "-U", user, "-d", db, "-v", "ON_ERROR_STOP=1", "-t", "-A"]
    res = subprocess.run(cmd, input=sql, capture_output=True, text=True, encoding="utf-8")
    return res.returncode, res.stdout, res.stderr

def run_sql_query(sql):
    cmd = ["docker", "exec", "-i", CONTAINER, "psql", "-U", "postgres", "-d", "postgres", "-t", "-A", "-c", sql]
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8")
    return res.stdout.strip()

def extract_last_line(out):
    lines = [l.strip() for l in out.strip().splitlines() if l.strip()]
    return lines[-1] if lines else ""

def extract_uuid(out):
    m = re.findall(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', out, re.IGNORECASE)
    return m[-1] if m else ""

print("=" * 70)
print("GATE B: KIỂM THỬ POSTGRESQL RUNTIME MIGRATION 004 R4 — SƠN CẢNG")
print("=" * 70)

results = []

def record(test_id, name, status, details=""):
    results.append({"id": test_id, "name": name, "status": status, "details": details})
    mark = "PASS" if status == "PASS" else "FAIL"
    print(f"[{mark}] {test_id}: {name}")
    if details and status != "PASS":
        print(f"       Chi tiết lỗi: {details}")

# ------------------------------------------------------------------------------
# SETUP FIXTURES CHO RUNTIME VERIFICATION
# ------------------------------------------------------------------------------
cleanup_sql = """
SET session_replication_role = 'replica';
DELETE FROM public.app_container_number_changes WHERE yard_id = '20000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.app_container_visits WHERE yard_id = '20000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.app_vehicle_visits WHERE yard_id = '20000000-0000-0000-0000-000000000001'::uuid;
DELETE FROM public.app_audit_events WHERE yard_id = '20000000-0000-0000-0000-000000000001'::uuid;
SET session_replication_role = 'origin';
"""
run_psql(cleanup_sql)

setup_sql = """
BEGIN;
-- Tạo bãi test riêng cho Gate B
INSERT INTO public.app_yards (id, name, is_active)
VALUES ('20000000-0000-0000-0000-000000000001'::uuid, 'Bãi Gate B Runtime A', true)
ON CONFLICT (id) DO UPDATE SET is_active = true;

INSERT INTO public.app_yards (id, name, is_active)
VALUES ('20000000-0000-0000-0000-000000000002'::uuid, 'Bãi Gate B Inactive', false)
ON CONFLICT (id) DO UPDATE SET is_active = false;

-- Tạo users test trong auth.users
INSERT INTO auth.users (id, email) VALUES
  ('20000000-0000-0000-0000-000000000010'::uuid, 'admin_gateb@soncang.vn'),
  ('20000000-0000-0000-0000-000000000020'::uuid, 'sec_gateb@soncang.vn'),
  ('20000000-0000-0000-0000-000000000030'::uuid, 'port_gateb@soncang.vn'),
  ('20000000-0000-0000-0000-000000000040'::uuid, 'dis_gateb@soncang.vn')
ON CONFLICT (id) DO NOTHING;

-- Gán vai trò V5
INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active, valid_from, valid_until) VALUES
  ('20000000-0000-0000-0000-000000000010'::uuid, 'SYS_ADMIN', NULL, NULL, true, now() - interval '1 hour', now() + interval '10 days'),
  ('20000000-0000-0000-0000-000000000020'::uuid, 'SEC_STAFF', '20000000-0000-0000-0000-000000000001'::uuid, 'AN_NINH', true, now() - interval '1 hour', now() + interval '10 days'),
  ('20000000-0000-0000-0000-000000000030'::uuid, 'PORT_STAFF', '20000000-0000-0000-0000-000000000001'::uuid, 'CCKB', true, now() - interval '1 hour', now() + interval '10 days'),
  ('20000000-0000-0000-0000-000000000040'::uuid, 'DIS_STAFF', '20000000-0000-0000-0000-000000000001'::uuid, 'DIEU_PHOI', true, now() - interval '1 hour', now() + interval '10 days')
ON CONFLICT DO NOTHING;

COMMIT;
"""
code, out, err = run_psql(setup_sql)
if code != 0:
    print("Lỗi khởi tạo fixtures Gate B:", err)
    sys.exit(1)
else:
    print("Khởi tạo fixtures môi trường Gate B thành công.")

def make_jwt_header(user_id):
    if user_id:
        return f"""
        SELECT set_config('request.jwt.claim.sub', '{user_id}', false);
        SELECT set_config('request.jwt.claim.role', 'authenticated', false);
        SELECT set_config('request.jwt.claims', '{{"sub":"{user_id}","role":"authenticated"}}', false);
        """
    else:
        return """
        SELECT set_config('request.jwt.claim.sub', '', false);
        SELECT set_config('request.jwt.claim.role', 'anon', false);
        SELECT set_config('request.jwt.claims', '{"role":"anon"}', false);
        """

# ------------------------------------------------------------------------------
# 1. KIỂM THỬ CONCURRENCY RACES (HAI KẾT NỐI ĐỒNG THỜI VỚI BARRIER)
# ------------------------------------------------------------------------------
print("\n--- PHẦN 1: CONCURRENCY RACES (2 SESSIONS ĐỒNG THỜI VỚI BARRIER) ---")

# Race 1: Cùng idempotency_key đồng thời
race1_out = {}
barrier1 = threading.Barrier(2)

def worker_race1(session_name):
    barrier1.wait()
    sql = f"""
    {make_jwt_header('20000000-0000-0000-0000-000000000020')}
    SELECT public.sc_create_vehicle_visit(
      p_yard_id => '20000000-0000-0000-0000-000000000001'::uuid,
      p_vehicle_type => 'CONT_LANH',
      p_license_plate => '29C-RACE01',
      p_idempotency_key => 'KEY-RACE-CONCURRENT-001'
    );
    """
    c, stdout, stderr = run_psql(sql)
    race1_out[session_name] = {"code": c, "stdout": stdout.strip(), "stderr": stderr.strip()}

t1 = threading.Thread(target=worker_race1, args=("conn1",))
t2 = threading.Thread(target=worker_race1, args=("conn2",))
t1.start(); t2.start()
t1.join(); t2.join()

uuid1 = extract_uuid(race1_out["conn1"]["stdout"])
uuid2 = extract_uuid(race1_out["conn2"]["stdout"])
count_veh = run_sql_query("SELECT count(*) FROM public.app_vehicle_visits WHERE yard_id = '20000000-0000-0000-0000-000000000001' AND idempotency_key = 'KEY-RACE-CONCURRENT-001'")

if race1_out["conn1"]["code"] == 0 and race1_out["conn2"]["code"] == 0 and count_veh == "1" and uuid1 == uuid2 and uuid1 != "":
    record("RACE-01", "Hai kết nối đồng thời cùng idempotency_key: Replay ID cũ an toàn, chỉ tạo đúng 1 bản ghi", "PASS")
else:
    record("RACE-01", "Hai kết nối đồng thời cùng idempotency_key", "FAIL", f"conn1={race1_out['conn1']}, conn2={race1_out['conn2']}, count={count_veh}")


# Chuẩn bị 2 xe riêng biệt cho Race 2
sql_prep_a = f"""
{make_jwt_header('20000000-0000-0000-0000-000000000020')}
SELECT public.sc_create_vehicle_visit(
  p_yard_id => '20000000-0000-0000-0000-000000000001'::uuid,
  p_vehicle_type => 'CONT_LANH',
  p_license_plate => '29C-VEH-A',
  p_idempotency_key => 'KEY-VEH-A'
);
"""
_, out_a, _ = run_psql(sql_prep_a)
veh_a = extract_uuid(out_a)

sql_prep_b = f"""
{make_jwt_header('20000000-0000-0000-0000-000000000020')}
SELECT public.sc_create_vehicle_visit(
  p_yard_id => '20000000-0000-0000-0000-000000000001'::uuid,
  p_vehicle_type => 'CONT_LANH',
  p_license_plate => '29C-VEH-B',
  p_idempotency_key => 'KEY-VEH-B'
);
"""
_, out_b, _ = run_psql(sql_prep_b)
veh_b = extract_uuid(out_b)

# Race 2: Hai kết nối đồng thời tạo cùng số container CONCRACE888 (status IN_YARD)
race2_out = {}
barrier2 = threading.Barrier(2)

def worker_race2(session_name, v_id):
    barrier2.wait()
    sql = f"""
    {make_jwt_header('20000000-0000-0000-0000-000000000020')}
    SELECT public.sc_create_container_visit(
      p_yard_id => '20000000-0000-0000-0000-000000000001'::uuid,
      p_container_no => 'CONCRACE888',
      p_inbound_vehicle_visit_id => '{v_id}'::uuid
    );
    """
    c, stdout, stderr = run_psql(sql)
    race2_out[session_name] = {"code": c, "stdout": stdout.strip(), "stderr": stderr.strip()}

t1 = threading.Thread(target=worker_race2, args=("connA", veh_a))
t2 = threading.Thread(target=worker_race2, args=("connB", veh_b))
t1.start(); t2.start()
t1.join(); t2.join()

count_cont_race = run_sql_query("SELECT count(*) FROM public.app_container_visits WHERE yard_id = '20000000-0000-0000-0000-000000000001' AND container_no_current = 'CONCRACE888' AND status = 'IN_YARD'")
codes = sorted([race2_out["connA"]["code"], race2_out["connB"]["code"]])

# Đúng 1 kết nối commit thành công (code 0), 1 kết nối bị chặn bởi unique index / exception (code != 0)
if codes[0] == 0 and codes[1] != 0 and count_cont_race == "1":
    record("RACE-02", "Hai kết nối đồng thời tạo cùng số container: Đúng 1 kết nối thành công, kết nối kia bị chặn an toàn (Count = 1)", "PASS")
else:
    record("RACE-02", "Hai kết nối đồng thời tạo cùng số container", "FAIL", f"codes={codes}, count={count_cont_race}, outA={race2_out['connA']}, outB={race2_out['connB']}")


# ------------------------------------------------------------------------------
# 2. KIỂM THỬ LG-01: IDEMPOTENCY PAYLOAD ALTERATION & REPLAY
# ------------------------------------------------------------------------------
print("\n--- PHẦN 2: KIỂM THỬ LG-01 (IDEMPOTENCY PAYLOAD ALTERATION & REPLAY) ---")

# Tạo lượt xe ban đầu với key IDEM-LG01-VEH
sql_veh_base = f"""
{make_jwt_header('20000000-0000-0000-0000-000000000020')}
SELECT public.sc_create_vehicle_visit(
  p_yard_id => '20000000-0000-0000-0000-000000000001'::uuid,
  p_vehicle_type => 'CONT_LANH',
  p_license_plate => '29C-LG0101',
  p_driver_name => 'Tài xế gốc',
  p_idempotency_key => 'IDEM-LG01-VEH'
);
"""
c1, out1, err1 = run_psql(sql_veh_base)
veh_base_id = extract_uuid(out1)

# Test Case LG-01a: Gọi lại cùng key IDEM-LG01-VEH nhưng đổi tên tài xế -> Phải bị từ chối P0001
sql_veh_alt = f"""
{make_jwt_header('20000000-0000-0000-0000-000000000020')}
SELECT public.sc_create_vehicle_visit(
  p_yard_id => '20000000-0000-0000-0000-000000000001'::uuid,
  p_vehicle_type => 'CONT_LANH',
  p_license_plate => '29C-LG0101',
  p_driver_name => 'Tài xế KHÁC BIỆT',
  p_idempotency_key => 'IDEM-LG01-VEH'
);
"""
c2, out2, err2 = run_psql(sql_veh_alt)
if c2 != 0 and "Idempotency key IDEM-LG01-VEH đã được sử dụng với thông tin lượt xe khác" in err2:
    record("LG-01a", "Lượt xe: Tái sử dụng key nhưng thay đổi driver_name bị từ chối fail-safe", "PASS")
else:
    record("LG-01a", "Lượt xe: Tái sử dụng key nhưng thay đổi driver_name", "FAIL", err2)

# Test Case LG-01c: Gọi lại cùng key IDEM-LG01-VEH với payload giống hệt 100% -> Replay trả về cùng UUID
sql_veh_exact = f"""
{make_jwt_header('20000000-0000-0000-0000-000000000020')}
SELECT public.sc_create_vehicle_visit(
  p_yard_id => '20000000-0000-0000-0000-000000000001'::uuid,
  p_vehicle_type => 'CONT_LANH',
  p_license_plate => '29C-LG0101',
  p_driver_name => 'Tài xế gốc',
  p_idempotency_key => 'IDEM-LG01-VEH'
);
"""
c_exact, out_exact, err_exact = run_psql(sql_veh_exact)
veh_replayed_id = extract_uuid(out_exact)
if c_exact == 0 and veh_replayed_id == veh_base_id and veh_base_id != "":
    record("LG-01c", "Lượt xe: Tái sử dụng key cùng payload tái hiện an toàn đúng ID ban đầu", "PASS")
else:
    record("LG-01c", "Lượt xe: Replay payload giống nhau", "FAIL", f"base={veh_base_id}, replayed={veh_replayed_id}, err={err_exact}")

# Tạo lượt container ban đầu với key IDEM-LG01-CONT
sql_cont_base = f"""
{make_jwt_header('20000000-0000-0000-0000-000000000020')}
SELECT public.sc_create_container_visit(
  p_yard_id => '20000000-0000-0000-0000-000000000001'::uuid,
  p_container_no => 'LG01CONT01',
  p_inbound_vehicle_visit_id => '{veh_base_id}'::uuid,
  p_container_size => '40',
  p_container_type => 'RF',
  p_idempotency_key => 'IDEM-LG01-CONT'
);
"""
c3, out3, err3 = run_psql(sql_cont_base)
cont_base_id = extract_uuid(out3)

# Test Case LG-01b: Gọi lại cùng key IDEM-LG01-CONT nhưng đổi container_size thành 20 -> Phải bị từ chối
sql_cont_alt = f"""
{make_jwt_header('20000000-0000-0000-0000-000000000020')}
SELECT public.sc_create_container_visit(
  p_yard_id => '20000000-0000-0000-0000-000000000001'::uuid,
  p_container_no => 'LG01CONT01',
  p_inbound_vehicle_visit_id => '{veh_base_id}'::uuid,
  p_container_size => '20',
  p_container_type => 'RF',
  p_idempotency_key => 'IDEM-LG01-CONT'
);
"""
c4, out4, err4 = run_psql(sql_cont_alt)
if c4 != 0 and "Idempotency key IDEM-LG01-CONT đã được sử dụng với thông tin lượt container khác" in err4:
    record("LG-01b", "Lượt cont: Tái sử dụng key nhưng thay đổi container_size bị từ chối fail-safe", "PASS")
else:
    record("LG-01b", "Lượt cont: Tái sử dụng key nhưng thay đổi container_size", "FAIL", err4)

# Test Case LG-01d: Gọi lại cùng key IDEM-LG01-CONT với payload giống hệt -> Replay cùng UUID
sql_cont_exact = f"""
{make_jwt_header('20000000-0000-0000-0000-000000000020')}
SELECT public.sc_create_container_visit(
  p_yard_id => '20000000-0000-0000-0000-000000000001'::uuid,
  p_container_no => 'LG01CONT01',
  p_inbound_vehicle_visit_id => '{veh_base_id}'::uuid,
  p_container_size => '40',
  p_container_type => 'RF',
  p_idempotency_key => 'IDEM-LG01-CONT'
);
"""
c_cont_ex, out_cont_ex, err_cont_ex = run_psql(sql_cont_exact)
cont_replayed_id = extract_uuid(out_cont_ex)
if c_cont_ex == 0 and cont_replayed_id == cont_base_id and cont_base_id != "":
    record("LG-01d", "Lượt cont: Tái sử dụng key cùng payload tái hiện an toàn đúng ID ban đầu", "PASS")
else:
    record("LG-01d", "Lượt cont: Replay payload giống nhau", "FAIL", f"base={cont_base_id}, replayed={cont_replayed_id}, err={err_cont_ex}")


# ------------------------------------------------------------------------------
# 3. KIỂM THỬ QUYỀN EXECUTE AUTHENTICATED VS ANON VÀ RLS PRIVILEGES
# ------------------------------------------------------------------------------
print("\n--- PHẦN 3: KIỂM THỬ QUYỀN EXECUTE & RLS AUTHENTICATED VS ANON ---")

# Test SEC-01: Database role anon gọi trực tiếp sc_create_vehicle_visit bị từ chối
sql_anon_call = """
SET ROLE anon;
SELECT public.sc_create_vehicle_visit(
  '20000000-0000-0000-0000-000000000001'::uuid,
  'CONT_LANH',
  '29C-ANONFAIL'
);
"""
c, out, err = run_psql(sql_anon_call)
if c != 0 and ("permission denied" in err.lower() or "chưa đăng nhập" in err.lower()):
    record("SEC-01", "Database role anon bị từ chối gọi RPC sc_create_vehicle_visit", "PASS")
else:
    record("SEC-01", "Database role anon gọi RPC sc_create_vehicle_visit", "FAIL", err)

# Test SEC-02: Database role anon đọc trực tiếp app_container_number_changes
sql_anon_sel = """
SET ROLE anon;
SELECT count(*) FROM public.app_container_number_changes;
"""
c, out, err = run_psql(sql_anon_sel)
if c != 0 and "permission denied" in err.lower():
    record("SEC-02", "Database role anon bị từ chối SELECT trên app_container_number_changes", "PASS")
else:
    record("SEC-02", "Database role anon SELECT app_container_number_changes", "FAIL", err)

# Test SEC-03: Điều phối DIS_STAFF đọc app_container_number_changes qua RLS -> Trả về 0 dòng
sql_dis_rls = f"""
SET ROLE authenticated;
{make_jwt_header('20000000-0000-0000-0000-000000000040')}
SELECT count(*) FROM public.app_container_number_changes;
"""
c, out, err = run_psql(sql_dis_rls)
cnt_dis = extract_last_line(out)
if c == 0 and cnt_dis == "0":
    record("SEC-03", "RLS: Điều phối (DIS_STAFF) không có quyền discrepancy.view nhìn thấy 0 bản ghi", "PASS")
else:
    record("SEC-03", "RLS: Điều phối xem discrepancy", "FAIL", f"out={out}, err={err}")

# Test SEC-04: An ninh SEC_STAFF gọi sc_update_container_cargo bị từ chối
sql_sec_cargo = f"""
{make_jwt_header('20000000-0000-0000-0000-000000000020')}
SELECT public.sc_update_container_cargo(
  '{cont_base_id}'::uuid,
  'HANG'
);
"""
c, out, err = run_psql(sql_sec_cargo)
if c != 0 and "Permission Denied: Chỉ bộ phận Điều phối" in err:
    record("SEC-04", "An ninh (SEC_STAFF) không có quyền cập nhật HÀNG/RỖNG bị từ chối fail-closed", "PASS")
else:
    record("SEC-04", "An ninh cập nhật HÀNG/RỖNG", "FAIL", err)

# Test SEC-05: Quản trị SYS_ADMIN gọi sc_manage_vehicle_type đổi giá vé bị từ chối theo AP10 Four-Eyes
sql_admin_price = f"""
{make_jwt_header('20000000-0000-0000-0000-000000000010')}
SELECT public.sc_manage_vehicle_type(
  p_code => 'CONT_LANH',
  p_default_ticket_amount => 999000.00
);
"""
c, out, err = run_psql(sql_admin_price)
if c != 0 and "Việc thay đổi giá vé yêu cầu quy trình phê duyệt bảng giá AP10 (Four-Eyes)" in err:
    record("SEC-05", "SYS_ADMIN đổi giá vé trực tiếp bị chặn theo kiểm soát tài chính AP10 Four-Eyes", "PASS")
else:
    record("SEC-05", "SYS_ADMIN đổi giá vé qua danh mục", "FAIL", err)


# ------------------------------------------------------------------------------
# 4. KIỂM THỬ SỬA SỐ CONTAINER, BẢO TOÀN UUID & LỊCH SỬ BẤT BIẾN
# ------------------------------------------------------------------------------
print("\n--- PHẦN 4: SỬA SỐ CONTAINER & BẢO TOÀN UUID & LỊCH SỬ BẤT BIẾN ---")

# An ninh sửa số container LG01CONT01 sang LG01RIGHT99
sql_correct = f"""
{make_jwt_header('20000000-0000-0000-0000-000000000020')}
SELECT public.sc_correct_container_number(
  p_container_visit_id => '{cont_base_id}'::uuid,
  p_new_container_no => 'LG01RIGHT99',
  p_reason => 'Hiện trường ghi nhận sai ký tự cuối theo biên bản đối soát',
  p_evidence_url => 'https://storage.soncang.vn/audit/test.jpg'
);
"""
c, out, err = run_psql(sql_correct)
chg_id = extract_last_line(out)

# Kiểm tra UUID được bảo toàn
id_after = run_sql_query("SELECT id FROM public.app_container_visits WHERE container_no_current = 'LG01RIGHT99'")
uuid_preserved = (id_after == cont_base_id)

# Kiểm tra bản ghi audit
audit_count = run_sql_query(f"SELECT count(*) FROM public.app_audit_events WHERE action_code = 'container.number.correct' AND target_id = '{cont_base_id}'")

if c == 0 and uuid_preserved and audit_count == "1" and chg_id != "":
    record("HIST-01", "Sửa số container: UUID được bảo toàn 100%, sinh bản ghi lịch sử và audit log", "PASS")
else:
    record("HIST-01", "Sửa số container bảo toàn UUID", "FAIL", f"id_after={id_after}, base={cont_base_id}, audit={audit_count}, err={err}")

# Thử DELETE lịch sử sửa số -> Phải bị trigger chặn
sql_del_chg = f"DELETE FROM public.app_container_number_changes WHERE id = {chg_id};"
c, out, err = run_psql(sql_del_chg)
if c != 0 and "Lịch sử sửa số container là bất biến (append-only)" in err:
    record("HIST-02", "Trigger bất biến: Chặn lệnh DELETE trên app_container_number_changes", "PASS")
else:
    record("HIST-02", "Trigger DELETE trên lịch sử sửa số", "FAIL", err)

# Thử UPDATE thông tin gốc trong lịch sử sửa số -> Phải bị trigger chặn
sql_upd_chg = f"UPDATE public.app_container_number_changes SET evidence_url = 'https://hacked.com' WHERE id = {chg_id};"
c, out, err = run_psql(sql_upd_chg)
if c != 0 and "Dữ liệu lịch sử sửa số container và chứng cứ là bất biến" in err:
    record("HIST-03", "Trigger bất biến: Chặn chỉnh sửa evidence_url/dữ liệu gốc", "PASS")
else:
    record("HIST-03", "Trigger UPDATE trên lịch sử sửa số", "FAIL", err)


# ------------------------------------------------------------------------------
# 5. KIỂM THỬ LIFECYCLE CHECK CONSTRAINTS & BẢO VỆ MIGRATION 007
# ------------------------------------------------------------------------------
print("\n--- PHẦN 5: LIFECYCLE CHECK CONSTRAINTS & BẢO VỆ MIGRATION 007 ---")

# Kiểm tra không có RPC hoàn tất xuất bãi trong Migration 004
proc_exit_count = run_sql_query("SELECT count(*) FROM pg_proc WHERE proname IN ('sc_exit_vehicle', 'sc_exit_container', 'sc_confirm_exit');")
if proc_exit_count == "0":
    record("LIFE-01", "Bảo vệ phạm vi Migration 007: Chưa có RPC công khai nào hoàn tất xuất bãi trong 004", "PASS")
else:
    record("LIFE-01", "Kiểm tra RPC xuất bãi", "FAIL", f"proc_count={proc_exit_count}")

# Constraint: Chặn container status IN_YARD nhưng có outbound_at
sql_ck_cont = f"""
INSERT INTO public.app_container_visits (yard_id, container_no_current, container_no_original, status, outbound_at, created_by)
VALUES ('20000000-0000-0000-0000-000000000001'::uuid, 'CKCONTFAIL01', 'CKCONTFAIL01', 'IN_YARD', now(), '20000000-0000-0000-0000-000000000020'::uuid);
"""
c, out, err = run_psql(sql_ck_cont)
if c != 0 and "ck_container_status_outbound" in err:
    record("LIFE-02", "Ràng buộc toàn vẹn vòng đời: ck_container_status_outbound chặn container IN_YARD có outbound_at", "PASS")
else:
    record("LIFE-02", "Constraint ck_container_status_outbound", "FAIL", err)

# Constraint: Chặn vehicle status IN_YARD nhưng có exit_at
sql_ck_veh = f"""
INSERT INTO public.app_vehicle_visits (yard_id, license_plate, vehicle_type, status, exit_at, exit_by, entry_by)
VALUES ('20000000-0000-0000-0000-000000000001'::uuid, '29C-CKFAIL', 'CONT_LANH', 'IN_YARD', now(), '20000000-0000-0000-0000-000000000020'::uuid, '20000000-0000-0000-0000-000000000020'::uuid);
"""
c, out, err = run_psql(sql_ck_veh)
if c != 0 and "ck_vehicle_status_exit" in err:
    record("LIFE-03", "Ràng buộc toàn vẹn vòng đời: ck_vehicle_status_exit chặn xe IN_YARD có exit_at/exit_by", "PASS")
else:
    record("LIFE-03", "Constraint ck_vehicle_status_exit", "FAIL", err)

# ------------------------------------------------------------------------------
# TỔNG KẾT & XUẤT KẾT QUẢ
# ------------------------------------------------------------------------------
print("\n" + "=" * 70)
total_tests = len(results)
pass_tests = sum(1 for r in results if r["status"] == "PASS")
fail_tests = total_tests - pass_tests
print(f"KẾT QUẢ KIỂM THỬ RUNTIME: {pass_tests}/{total_tests} PASS (Thất bại: {fail_tests})")
print("=" * 70)

with open("gate_b_runtime_results.json", "w", encoding="utf-8") as f:
    json.dump({"total": total_tests, "pass": pass_tests, "fail": fail_tests, "details": results}, f, ensure_ascii=False, indent=2)

if fail_tests > 0:
    sys.exit(1)
else:
    sys.exit(0)
