#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import os
import subprocess
import shutil
import zipfile
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

evidence_dir = "gate_b_evidence"
os.makedirs(evidence_dir, exist_ok=True)

def run_and_save(cmd, filename):
    print(f"Đang chạy: {' '.join(cmd) if isinstance(cmd, list) else cmd} -> {filename}")
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", shell=True)
    with open(os.path.join(evidence_dir, filename), "w", encoding="utf-8") as f:
        out = res.stdout or ""
        err = res.stderr or ""
        f.write(out + ("\n" + err if err else ""))
    return res.returncode

# 1. pgTAP 004
run_and_save("npx supabase test db --local supabase/tests/domain_vehicles_containers_004.sql", "pgtap_004_output.txt")

# 2. pgTAP RBAC
run_and_save("npx supabase test db --local supabase/tests/rbac_verification.sql", "pgtap_rbac_output.txt")

# 3. Static Audit 004
run_and_save("node scripts/audit_test_004.js", "audit_test_004_output.txt")

# 4. RBAC Invariants
run_and_save("node scripts/verify_rbac_invariants.js", "rbac_invariants_output.txt")

# 5. Runtime Concurrency & RLS Tests
run_and_save("python scripts/run_gate_b_runtime_tests.py", "gate_b_runtime_output.txt")

# Copy JSON kết quả
if os.path.exists("gate_b_runtime_results.json"):
    shutil.copy("gate_b_runtime_results.json", os.path.join(evidence_dir, "gate_b_runtime_results.json"))

# Package zip
zip_name = "migration_004_runtime_evidence.zip"
with zipfile.ZipFile(zip_name, "w", zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(evidence_dir):
        for file in files:
            p = os.path.join(root, file)
            z.write(p, os.path.relpath(p, evidence_dir))

print(f"ĐÃ THU THẬP VÀ ĐÓNG GÓI THÀNH CÔNG: {zip_name}")
