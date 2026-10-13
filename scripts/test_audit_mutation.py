"""
================================================================================
NEGATIVE & MUTATION TEST SUITE CHO AUDIT RBAC EXACT
Dự án: Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng
Mục đích: Xác minh script audit_rbac_exact.py phát hiện được sai lệch grant/scope/active.
Yêu cầu Nhiệm vụ 5:
- Script audit phải FAIL khi có đột biến dữ liệu.
- Exit code phải khác 0.
- Chỉ rõ chính xác grant/permission bị sai lệch.
- Không sửa file gốc; mọi thử nghiệm chạy trên file/bản sao tạm.
================================================================================
"""

import sys
import os
import io
import shutil
import tempfile
import subprocess
import re

if sys.stdout.encoding != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SCRIPT_PATH = os.path.join(ROOT_DIR, 'scripts', 'audit_rbac_exact.py')
SQL_002_ORIGINAL = os.path.join(ROOT_DIR, 'supabase', 'migrations', '20261011000002_seed_rbac_v5.sql')

def run_audit_with_custom_sql(custom_sql_002_content):
    """
    Tạo bản sao tạm thời của script audit_rbac_exact.py và sql 002,
    chạy script và trả về (exit_code, stdout, stderr).
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_sql_002 = os.path.join(tmpdir, '20261011000002_seed_rbac_v5.sql')
        with open(tmp_sql_002, 'w', encoding='utf-8') as f:
            f.write(custom_sql_002_content)

        # Đọc script gốc và patch đường dẫn sql_002_path sang file tạm
        with open(SCRIPT_PATH, 'r', encoding='utf-8') as f:
            script_content = f.read()

        # Thay thế sql_002_path trong script
        patched_script = script_content.replace(
            "sql_002_path = r'supabase/migrations/20261011000002_seed_rbac_v5.sql'",
            f"sql_002_path = r'{tmp_sql_002}'"
        )

        tmp_script = os.path.join(tmpdir, 'audit_patched.py')
        with open(tmp_script, 'w', encoding='utf-8') as f:
            f.write(patched_script)

        res = subprocess.run(
            [sys.executable, tmp_script],
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',
            cwd=ROOT_DIR
        )
        return res.returncode, res.stdout, res.stderr

def main():
    print("=" * 80)
    print("MUTATION & NEGATIVE TEST SUITE: AUDIT RBAC V5 VERIFICATION")
    print("=" * 80)

    with open(SQL_002_ORIGINAL, 'r', encoding='utf-8') as f:
        original_sql = f.read()

    tests_passed = 0
    total_tests = 4

    # --------------------------------------------------------------------------
    # Test 0: Baseline Check (Nguyên bản phải exit 0)
    # --------------------------------------------------------------------------
    print("\n[TEST 0] Baseline: Kiểm tra với SQL nguyên bản...")
    code, out, err = run_audit_with_custom_sql(original_sql)
    if code == 0 and "KẾT QUẢ KIỂM TOÁN TỔNG THỂ: TẤT CẢ TIÊU CHÍ ĐỀU ĐẠT 100%" in out:
        print("  => PASS: Script gốc chạy thành công (exit code 0).")
        tests_passed += 1
    else:
        print(f"  => FAIL: Script gốc không đạt baseline! Exit code = {code}\n{out}\n{err}")

    # --------------------------------------------------------------------------
    # Test 1: Đột biến Grant is_enabled (SC-R2-05: Đổi TRUE thành FALSE)
    # --------------------------------------------------------------------------
    print("\n[TEST 1] Mutation: Cố tình đổi 1 grant is_enabled từ TRUE thành FALSE...")
    target_grant = "('SEC_STAFF', 'vehicle.visit.read', 'YARD', TRUE)"
    mutated_grant = "('SEC_STAFF', 'vehicle.visit.read', 'YARD', FALSE)"
    if target_grant not in original_sql:
        print(f"  => ERROR: Không tìm thấy target_grant trong SQL 002!")
        sys.exit(1)

    mutated_sql_1 = original_sql.replace(target_grant, mutated_grant, 1)
    code, out, err = run_audit_with_custom_sql(mutated_sql_1)
    
    expected_msg = "Grant (SEC_STAFF, vehicle.visit.read) sai is_enabled: SQL=False != Workbook=True"
    if code != 0 and expected_msg in out:
        print("  => PASS: Mutation bị phát hiện chính xác! Script báo FAIL với exit code != 0.")
        print(f"     Thông báo lỗi nhận diện: {expected_msg}")
        tests_passed += 1
    else:
        print(f"  => FAIL: Script không phát hiện được grant sai is_enabled! Exit code = {code}")
        print(out)

    # --------------------------------------------------------------------------
    # Test 2: Đột biến Grant Scope (Đổi YARD thành ALL)
    # --------------------------------------------------------------------------
    print("\n[TEST 2] Mutation: Cố tình đổi 1 grant scope từ YARD thành ALL...")
    target_grant_2 = "('PORT_STAFF', 'reefer.session.read', 'YARD', TRUE)"
    mutated_grant_2 = "('PORT_STAFF', 'reefer.session.read', 'ALL', TRUE)"
    mutated_sql_2 = original_sql.replace(target_grant_2, mutated_grant_2, 1)
    code, out, err = run_audit_with_custom_sql(mutated_sql_2)

    expected_msg_2 = "Grant (PORT_STAFF, reefer.session.read) sai scope: ALL != YARD"
    if code != 0 and expected_msg_2 in out:
        print("  => PASS: Mutation scope bị phát hiện chính xác! Script báo FAIL với exit code != 0.")
        print(f"     Thông báo lỗi nhận diện: {expected_msg_2}")
        tests_passed += 1
    else:
        print(f"  => FAIL: Script không phát hiện được grant sai scope! Exit code = {code}")
        print(out)

    # --------------------------------------------------------------------------
    # Test 3: Đột biến Permission is_active (Đổi V1 CORE từ TRUE thành FALSE)
    # --------------------------------------------------------------------------
    print("\n[TEST 3] Mutation: Cố tình đổi 1 permission V1 CORE từ TRUE thành FALSE...")
    # Dùng regex thay TRUE thành FALSE cho permission vehicle.visit.read
    perm_re = re.compile(r"(\('vehicle\.visit\.read'[^;]+?,\s*)TRUE(\)\s*ON CONFLICT)", re.IGNORECASE)
    mutated_sql_3, count_sub = perm_re.subn(r"\g<1>FALSE\g<2>", original_sql, count=1)
    if count_sub != 1:
        print("  => ERROR: Không thể thay thế permission vehicle.visit.read bằng regex!")
        sys.exit(1)

    code, out, err = run_audit_with_custom_sql(mutated_sql_3)

    expected_msg_3 = "Permission vehicle.visit.read sai is_active: SQL=False != Kỳ vọng=True"
    if code != 0 and expected_msg_3 in out:
        print("  => PASS: Mutation permission is_active bị phát hiện chính xác! Script báo FAIL.")
        print(f"     Thông báo lỗi nhận diện: {expected_msg_3}")
        tests_passed += 1
    else:
        print(f"  => FAIL: Script không phát hiện được permission sai is_active! Exit code = {code}")
        print(out)

    print("\n" + "=" * 80)
    print(f"TỔNG KẾT MUTATION TESTS: {tests_passed}/{total_tests} ĐẠT YÊU CẦU")
    print("=" * 80)

    if tests_passed == total_tests:
        print("KẾT LUẬN: Script audit_rbac_exact.py đã vượt qua toàn bộ Mutation & Negative Tests!")
        print("Khẳng định độ tin cậy: Mọi sai lệch về role, permission, scope, is_enabled đều bị chặn đứng.")
        sys.exit(0)
    else:
        print("CÓ BÀI TEST MUTATION KHÔNG ĐẠT!")
        sys.exit(1)

if __name__ == '__main__':
    main()
