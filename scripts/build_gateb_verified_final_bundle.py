#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script đóng gói Gói Bàn giao Cuối cùng: migration_004_gateb_verified_final.zip
Theo chỉ đạo độc lập Gate B Review / Gate C Preflight (2026-10-11)
"""

import os
import shutil
import hashlib
import subprocess
import zipfile
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

BUNDLE_DIR = "gateb_verified_final_bundle"
ZIP_NAME = "migration_004_gateb_verified_final.zip"

if os.path.exists(BUNDLE_DIR):
    shutil.rmtree(BUNDLE_DIR)
os.makedirs(BUNDLE_DIR, exist_ok=True)

# 1. Trích xuất diff so với ZIP R4 cũ
diff_content = []
if os.path.exists("migration_004_code_bundle_R4.zip"):
    with zipfile.ZipFile("migration_004_code_bundle_R4.zip", "r") as z:
        for fname in ["supabase/migrations/20261011000004_domain_vehicles_containers.sql", "supabase/tests/domain_vehicles_containers_004.sql"]:
            if fname in z.namelist():
                old_bytes = z.read(fname).decode("utf-8", errors="replace")
                with open(fname, "r", encoding="utf-8", errors="replace") as cur_f:
                    cur_bytes = cur_f.read()
                
                import difflib
                diff = list(difflib.unified_diff(
                    old_bytes.splitlines(keepends=True),
                    cur_bytes.splitlines(keepends=True),
                    fromfile=f"R4_ZIP/{fname}",
                    tofile=f"GATE_B_VERIFIED/{fname}"
                ))
                diff_content.extend(diff)

with open(os.path.join(BUNDLE_DIR, "diff_vs_r4_bundle.diff"), "w", encoding="utf-8") as f:
    f.writelines(diff_content)

# 2. Ghi git status
git_status = subprocess.run(["git", "status"], capture_output=True, text=True, encoding="utf-8", errors="replace")
with open(os.path.join(BUNDLE_DIR, "git_status.txt"), "w", encoding="utf-8") as f:
    f.write(git_status.stdout + "\n" + (git_status.stderr or ""))

# 3. Copy các file cốt lõi
core_files = [
    ("supabase/migrations/20261011000004_domain_vehicles_containers.sql", "20261011000004_domain_vehicles_containers.sql"),
    ("supabase/tests/domain_vehicles_containers_004.sql", "domain_vehicles_containers_004.sql"),
    ("src/types/database.types.ts", "database.types.ts"),
    ("scripts/run_gate_b_runtime_tests.py", "run_gate_b_runtime_tests.py"),
    ("scripts/audit_test_004.js", "audit_test_004.js"),
    ("scripts/verify_rbac_invariants.js", "verify_rbac_invariants.js"),
    ("ProjectContext/06_Kien_truc_va_kiem_thu/MIGRATION_004_RUNTIME_VERIFICATION.md", "MIGRATION_004_RUNTIME_VERIFICATION.md"),
]

for src, dst in core_files:
    if os.path.exists(src):
        shutil.copy(src, os.path.join(BUNDLE_DIR, dst))
    else:
        print(f"CẢNH BÁO: Không tìm thấy file {src}")

# 4. Copy thư mục bằng chứng logs
evidence_src = "gate_b_evidence"
evidence_dst = os.path.join(BUNDLE_DIR, "evidence_logs")
os.makedirs(evidence_dst, exist_ok=True)
if os.path.exists(evidence_src):
    for f in os.listdir(evidence_src):
        sp = os.path.join(evidence_src, f)
        if os.path.isfile(sp):
            shutil.copy(sp, os.path.join(evidence_dst, f))

# 5. Tính SHA-256 cho từng file và ghi MANIFEST
manifest_lines = []
for root, dirs, files in os.walk(BUNDLE_DIR):
    for file in sorted(files):
        fp = os.path.join(root, file)
        rel_p = os.path.relpath(fp, BUNDLE_DIR).replace("\\", "/")
        h = hashlib.sha256()
        with open(fp, "rb") as bf:
            while chunk := bf.read(65536):
                h.update(chunk)
        manifest_lines.append(f"{h.hexdigest()}  {rel_p}")

manifest_path = os.path.join(BUNDLE_DIR, "MANIFEST_SHA256.txt")
with open(manifest_path, "w", encoding="utf-8") as f:
    f.write("\n".join(manifest_lines) + "\n")

# 6. Đóng gói ZIP
with zipfile.ZipFile(ZIP_NAME, "w", zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(BUNDLE_DIR):
        for file in sorted(files):
            fp = os.path.join(root, file)
            arcname = os.path.relpath(fp, BUNDLE_DIR).replace("\\", "/")
            z.write(fp, arcname)

# 7. Tính SHA-256 cho toàn bộ file ZIP
h_zip = hashlib.sha256()
with open(ZIP_NAME, "rb") as bf:
    while chunk := bf.read(65536):
        h_zip.update(chunk)
zip_hash = h_zip.hexdigest()

print(f"ĐÃ TẠO THÀNH CÔNG: {ZIP_NAME}")
print(f"SHA-256 ({ZIP_NAME}): {zip_hash}")
print(f"Kích thước file: {os.path.getsize(ZIP_NAME)} bytes")
print("Chi tiết manifest:")
for line in manifest_lines:
    print(" ", line)
