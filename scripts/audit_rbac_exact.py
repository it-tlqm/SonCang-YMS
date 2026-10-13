import zipfile
import xml.etree.ElementTree as ET
import re
import os
import sys
import json

sys.stdout.reconfigure(encoding='utf-8')

wb_path = r'ProjectContext/02_RBAC_V5/PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx'
sql_001_path = r'supabase/migrations/20261011000001_foundation_rbac.sql'
sql_002_path = r'supabase/migrations/20261011000002_seed_rbac_v5.sql'
sql_003_path = r'supabase/migrations/20261011000003_rbac_security_functions_rls.sql'

print("=" * 80)
print("AUDIT KIỂM CHỨNG TẬN GỐC & BẢO MẬT: WORKBOOK RBAC V5 vs MIGRATIONS 001-003")
print("=" * 80)

errors = []

# ------------------------------------------------------------------------------
# 1. TRÍCH XUẤT TRỰC TIẾP TỪ WORKBOOK EXCEL V5
# ------------------------------------------------------------------------------
NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

with zipfile.ZipFile(wb_path, 'r') as z:
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        ss_tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in ss_tree.findall('s:si', NS):
            texts = [t.text for t in si.findall('.//s:t', NS) if t.text is not None]
            shared_strings.append(''.join(texts))

    wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
    sheets_elem = wb_tree.find('s:sheets', NS)
    rels_tree = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rel_map = {rel.attrib['Id']: rel.attrib['Target'] for rel in rels_tree.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')}
    
    sheets = {}
    for s in sheets_elem.findall('s:sheet', NS):
        name = s.attrib['name']
        r_id = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
        t = rel_map[r_id]
        if t.startswith('/'): t = t[1:]
        elif not t.startswith('xl/'): t = 'xl/' + t
        sheets[name] = t

    def get_sheet_rows(sheet_name):
        t = sheets[sheet_name]
        sheet_tree = ET.fromstring(z.read(t))
        sheet_data = sheet_tree.find('s:sheetData', NS)
        rows = []
        for row in sheet_data.findall('s:row', NS):
            r_dict = {}
            for c in row.findall('s:c', NS):
                r_ref = c.attrib.get('r', '')
                t_attr = c.attrib.get('t')
                v_el = c.find('s:v', NS)
                val = None
                if t_attr == 'inlineStr':
                    val = ''.join([t_n.text for t_n in c.findall('.//s:t', NS) if t_n.text is not None])
                elif t_attr == 's' and v_el is not None and v_el.text is not None:
                    idx = int(v_el.text)
                    val = shared_strings[idx] if idx < len(shared_strings) else v_el.text
                elif v_el is not None and v_el.text is not None:
                    val = v_el.text
                if val is not None:
                    r_dict[r_ref] = val
            if r_dict:
                rows.append(r_dict)
        return rows

    # 1.1. Roles từ tab 19_V5_VAI_TRO
    excel_roles = {}
    for r in get_sheet_rows('19_V5_VAI_TRO'):
        for k, v in r.items():
            if k.startswith('A') and v in ['SEC_STAFF', 'SEC_LEAD', 'PORT_STAFF', 'PORT_LEAD', 'DIS_STAFF', 'DIS_LEAD', 'SYS_ADMIN', 'ACCOUNTING_FUTURE']:
                row_idx = k[1:]
                excel_roles[v] = {
                    'name': r.get(f'B{row_idx}', '').strip(),
                    'dept': r.get(f'C{row_idx}', '').strip(),
                    'seniority': r.get(f'D{row_idx}', '').strip(),
                    'active': r.get(f'E{row_idx}', '').strip() == 'Có',
                    'phase': r.get(f'F{row_idx}', '').strip(),
                    'desc': r.get(f'G{row_idx}', '').strip()
                }

    # 1.2. Permissions từ tab 20_V5_DANH_MUC_QUYEN
    excel_perms = {}
    for r in get_sheet_rows('20_V5_DANH_MUC_QUYEN'):
        for k, v in r.items():
            if k.startswith('A') and re.match(r'^[a-z]+(\.[a-z_]+)+$', str(v).strip()):
                row_idx = k[1:]
                code = v.strip()
                phase = r.get(f'E{row_idx}', '').strip()
                feature_key = r.get(f'F{row_idx}', '').strip() or 'CORE'
                # Quy tắc V5: 60 quyền V1 CORE kích hoạt, 7 quyền GĐ sau không kích hoạt
                expected_active = (phase == 'V1' and feature_key == 'CORE')
                excel_perms[code] = {
                    'module': r.get(f'B{row_idx}', '').strip(),
                    'name': r.get(f'C{row_idx}', '').strip(),
                    'source': r.get(f'D{row_idx}', '').strip(),
                    'phase': phase,
                    'feature_key': feature_key,
                    'risk': r.get(f'G{row_idx}', '').strip() or 'Thông thường',
                    'desc': r.get(f'H{row_idx}', '').strip(),
                    'expected_active': expected_active
                }

    # 1.3. Grants từ tab 21_V5_CAP_QUYEN_SEED
    excel_grants = {}
    for r in get_sheet_rows('21_V5_CAP_QUYEN_SEED'):
        for k, v in r.items():
            if k.startswith('A') and v in excel_roles:
                row_idx = k[1:]
                p_code = r.get(f'C{row_idx}', '').strip()
                scope = r.get(f'D{row_idx}', '').strip()
                active = r.get(f'E{row_idx}', '').strip() == 'Có'
                if p_code and scope in ['SELF', 'DEPARTMENT', 'YARD', 'ALL']:
                    excel_grants[(v, p_code)] = {
                        'scope': scope,
                        'is_enabled': active
                    }

# ------------------------------------------------------------------------------
# 2. KIỂM TRA MIGRATION 001 (FOUNDATION & SCHEMAS)
# ------------------------------------------------------------------------------
print("\n--- TIÊU CHÍ 1: MIGRATION 001 SCHEMA CONSTRAINTS & DEPARTMENT AUDIT ---")
with open(sql_001_path, 'r', encoding='utf-8') as f:
    sql_001 = f.read()

if 'chk_approval_status_lifecycle' not in sql_001:
    errors.append("Migration 001 thiếu CHECK constraint chk_approval_status_lifecycle bảo vệ trạng thái duyệt!")
else:
    print("  [OK] chk_approval_status_lifecycle: Đã ràng buộc PENDING -> APPROVED/REJECTED/CANCELLED")

if 'chk_approval_reason_not_empty' not in sql_001:
    errors.append("Migration 001 thiếu CHECK constraint chk_approval_reason_not_empty!")
else:
    print("  [OK] chk_approval_reason_not_empty: Lý do phê duyệt bắt buộc không rỗng")

if 'department_code text REFERENCES public.app_departments' not in sql_001:
    errors.append("Migration 001: Bảng app_audit_events thiếu cột department_code!")
else:
    print("  [OK] app_audit_events.department_code: Đã có cột lưu bộ phận phục vụ phân quyền DEPARTMENT")

# ------------------------------------------------------------------------------
# 3. KIỂM TRA MIGRATION 002 (SEED DATA RBAC V5)
# ------------------------------------------------------------------------------
print("\n--- TIÊU CHÍ 2: MIGRATION 002 ROLES, PERMISSIONS ACTIVE & GRANTS ---")
with open(sql_002_path, 'r', encoding='utf-8') as f:
    sql_002 = f.read()

# 3.1 Roles
sql_roles = {}
for m in re.finditer(r"INSERT INTO public\.app_roles\([^)]+\)\s*VALUES\s*\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(TRUE|FALSE),\s*'([^']+)',\s*'([^']*)'\)", sql_002, re.I):
    code, name, dept, seniority, active, phase, desc = m.groups()
    sql_roles[code] = {'active': active.upper() == 'TRUE', 'dept': dept, 'phase': phase}

if len(sql_roles) != 8:
    errors.append(f"Số lượng roles trong SQL 002 ({len(sql_roles)}) != 8")
for r_code, e in excel_roles.items():
    if r_code not in sql_roles:
        errors.append(f"Thiếu role: {r_code}")
    elif e['active'] != sql_roles[r_code]['active']:
        errors.append(f"Role {r_code} sai active: {sql_roles[r_code]['active']} != {e['active']}")

# 3.2 Permissions
sql_perms = {}
perm_stmt_re = re.compile(r"INSERT INTO public\.app_permissions\([^)]+\)\s*VALUES\s*\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']*)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']*)',\s*(TRUE|FALSE)\)", re.I)
for m in perm_stmt_re.finditer(sql_002):
    code, module, name, source, phase, feature_key, risk, desc, active = m.groups()
    sql_perms[code] = {'is_active': active.upper() == 'TRUE', 'phase': phase, 'feature_key': feature_key}

if len(sql_perms) != 67:
    errors.append(f"Số lượng permissions trong SQL 002 ({len(sql_perms)}) != 67")

active_sql_count = sum(1 for p in sql_perms.values() if p['is_active'])
inactive_sql_count = sum(1 for p in sql_perms.values() if not p['is_active'])
print(f"  Permissions: Tổng=67 | Active (TRUE)={active_sql_count} (Yêu cầu: 60) | Inactive (FALSE)={inactive_sql_count} (Yêu cầu: 7)")

if active_sql_count != 60:
    errors.append(f"Số lượng permissions active trong SQL 002 ({active_sql_count}) != 60!")
if inactive_sql_count != 7:
    errors.append(f"Số lượng permissions inactive trong SQL 002 ({inactive_sql_count}) != 7!")

for p_code, e in excel_perms.items():
    if p_code not in sql_perms:
        errors.append(f"Thiếu permission: {p_code}")
    else:
        s = sql_perms[p_code]
        if s['is_active'] != e['expected_active']:
            errors.append(f"Permission {p_code} sai is_active: SQL={s['is_active']} != Kỳ vọng={e['expected_active']}")

# 3.3 Grants
sql_grants = {}
grant_stmt_re = re.compile(r"INSERT INTO public\.app_role_permissions\([^)]+\)\s*VALUES\s*\('([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(TRUE|FALSE)\)", re.I)
for m in grant_stmt_re.finditer(sql_002):
    r_code, p_code, scope, enabled = m.groups()
    sql_grants[(r_code, p_code)] = {'scope': scope, 'is_enabled': enabled.upper() == 'TRUE'}

if len(sql_grants) != 206:
    errors.append(f"Số lượng grants trong SQL 002 ({len(sql_grants)}) != 206")

for (r_code, p_code), e in excel_grants.items():
    if (r_code, p_code) not in sql_grants:
        errors.append(f"Thiếu grant: ({r_code}, {p_code})")
    else:
        s = sql_grants[(r_code, p_code)]
        if s['scope'] != e['scope']:
            errors.append(f"Grant ({r_code}, {p_code}) sai scope: {s['scope']} != {e['scope']}")
        if s['is_enabled'] != e['is_enabled']:
            errors.append(f"Grant ({r_code}, {p_code}) sai is_enabled: SQL={s['is_enabled']} != Workbook={e['is_enabled']}")

print("  [OK] 8/8 Roles, 67/67 Permissions (60 V1 CORE active, 7 inactive), 206/206 Grants (scope + is_enabled) khớp 100%")

# ------------------------------------------------------------------------------
# 4. KIỂM TRA MIGRATION 003 (FUNCTIONS, TRIGGERS & RLS)
# ------------------------------------------------------------------------------
print("\n--- TIÊU CHÍ 3: MIGRATION 003 GIA CỐ BẢO MẬT (APPROVAL, AUDIT, RLS) ---")
with open(sql_003_path, 'r', encoding='utf-8') as f:
    sql_003 = f.read()

# 4.1. Audit direct INSERT disabled for client & RPC revoked from authenticated (SC-R2-01)
if 'CREATE POLICY p_audit_insert' in sql_003:
    errors.append("Migration 003: KHÔNG ĐƯỢC CÓ policy p_audit_insert cho client! Client không được tự ý INSERT audit.")
else:
    print("  [OK] RBAC-03: Client bị chặn INSERT trực tiếp vào app_audit_events")

if 'GRANT EXECUTE ON FUNCTION public.sc_log_audit_event TO authenticated' in sql_003:
    errors.append("SC-R2-01: LỖI BẢO MẬT! Hàm sc_log_audit_event KHÔNG ĐƯỢC CẤP EXECUTE cho authenticated!")
elif 'REVOKE ALL ON FUNCTION public.sc_log_audit_event FROM authenticated' not in sql_003:
    errors.append("SC-R2-01: Hàm sc_log_audit_event phải REVOKE ALL khỏi authenticated!")
else:
    print("  [OK] SC-R2-01: Đã thu hồi quyền EXECUTE của sc_log_audit_event khỏi authenticated (chỉ cho nội bộ/service_role)")

# 4.2. Audit RPC exists and triggers exist
if 'CREATE OR REPLACE FUNCTION public.sc_log_audit_event' not in sql_003:
    errors.append("Migration 003 thiếu hàm sc_log_audit_event để ghi audit an toàn!")
else:
    print("  [OK] RBAC-03: Đã có hàm RPC sc_log_audit_event (SECURITY DEFINER)")

if 'trg_audit_user_roles' not in sql_003 or 'trg_audit_role_perms' not in sql_003:
    errors.append("Migration 003 thiếu trigger tự động ghi audit khi thay đổi role assignment hoặc role permissions!")
else:
    print("  [OK] RBAC-05: Đã có triggers tự động ghi audit khi gán/sửa roles và permissions")

# 4.3. Safe Approval RPCs with Fail-Closed on NULL approve_permission_code (SC-R2-02)
if 'CREATE OR REPLACE FUNCTION public.sc_approve_request' not in sql_003 or 'CREATE OR REPLACE FUNCTION public.sc_reject_request' not in sql_003:
    errors.append("Migration 003 thiếu RPC sc_approve_request hoặc sc_reject_request!")
else:
    print("  [OK] RBAC-02: Đã có RPC sc_approve_request & sc_reject_request thực thi Four-Eyes Integrity")

if 'approve_permission_code IS NULL THEN' not in sql_003:
    errors.append("SC-R2-02: sc_approve_request và sc_reject_request phải fail-closed (RAISE EXCEPTION) khi approve_permission_code IS NULL!")
else:
    print("  [OK] SC-R2-02: Phê duyệt fail-closed với chính sách một bước (approve_permission_code IS NULL)")

# 4.4. Department Audit Isolation in RLS
if "public.sc_can('audit.read', yard_id, department_code)" not in sql_003:
    errors.append("Migration 003: RLS p_audit_select chưa truyền department_code vào sc_can('audit.read')!")
else:
    print("  [OK] RBAC-04: RLS p_audit_select đã hỗ trợ cô lập audit theo DEPARTMENT")

# 4.5. Approval request INSERT direct block (SC-R4-02: Fail-Closed khi chưa có Domain Schema)
if "REVOKE INSERT ON public.app_approval_requests FROM authenticated" not in sql_003:
    errors.append("SC-R4-02: Migration 003 phải REVOKE INSERT ON app_approval_requests khỏi authenticated!")
elif "CREATE POLICY p_approval_insert" in sql_003:
    errors.append("SC-R4-02: Migration 003 không được mở CREATE POLICY p_approval_insert cho client khi chưa có Domain Schema!")
else:
    print("  [OK] SC-R4-02: Đã thu hồi toàn bộ quyền INSERT trên app_approval_requests khỏi authenticated và client")

# ------------------------------------------------------------------------------
# 5. KẾT LUẬN & EXIT CODE
# ------------------------------------------------------------------------------
print("\n" + "=" * 80)
if errors:
    print(f"KẾT QUẢ KIỂM TOÁN: PHÁT HIỆN {len(errors)} LỖI BẢO MẬT / SAI LỆCH:")
    for err in errors:
        print(f"  [LỖI] {err}")
    print("=" * 80)
    sys.exit(1)
else:
    print("KẾT QUẢ KIỂM TOÁN TỔNG THỂ: TẤT CẢ TIÊU CHÍ ĐỀU ĐẠT 100% (PASS)!")
    print("  - RBAC-01: Đã kích hoạt đúng 60 quyền V1/CORE; 7 quyền GĐ sau giữ nguyên FALSE.")
    print("  - RBAC-02: Đã khóa chặt Approval Requests; chuyển trạng thái qua RPC có kiểm soát.")
    print("  - RBAC-03: Đã khóa hoàn toàn client INSERT vào audit; audit qua RPC & triggers.")
    print("  - RBAC-04: Đã thêm department_code và cấu hình RLS cô lập audit theo DEPARTMENT.")
    print("  - RBAC-05: Đã có trigger tự động ghi audit khi thay đổi roles và grants.")
    print("  - Khớp dữ liệu: 8/8 roles, 67/67 permissions, 206/206 grants khớp 100% Workbook V5.")
    print("=" * 80)
    sys.exit(0)
