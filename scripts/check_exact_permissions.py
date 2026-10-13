import zipfile
import xml.etree.ElementTree as ET
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

wb_path = r'ProjectContext/02_RBAC_V5/PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx'
sql_path = r'supabase/migrations/20261011000002_seed_rbac_v5.sql'

# 1. Đọc permissions từ Excel
excel_perms = {}
with zipfile.ZipFile(wb_path, 'r') as z:
    shared_strings = []
    if 'xl/sharedStrings.xml' in z.namelist():
        ss_tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
        for si in ss_tree.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}si'):
            texts = [t.text for t in si.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text is not None]
            shared_strings.append(''.join(texts))
    
    wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
    sheets_elem = wb_tree.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheets')
    rels_tree = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
    rel_map = {rel.attrib['Id']: rel.attrib['Target'] for rel in rels_tree.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship')}
    
    target = None
    for s in sheets_elem.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheet'):
        if s.attrib['name'] == '20_V5_DANH_MUC_QUYEN':
            r_id = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
            target = rel_map[r_id]
            if target.startswith('/'): target = target[1:]
            elif not target.startswith('xl/'): target = 'xl/' + target
            break
            
    sheet_tree = ET.fromstring(z.read(target))
    for row in sheet_tree.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}sheetData').findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}row'):
        row_dict = {}
        for c in row.findall('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}c'):
            r_ref = c.attrib.get('r', '')
            t_attr = c.attrib.get('t')
            v_el = c.find('{http://schemas.openxmlformats.org/spreadsheetml/2006/main}v')
            val = None
            if t_attr == 's' and v_el is not None and v_el.text:
                val = shared_strings[int(v_el.text)]
            elif t_attr == 'inlineStr':
                val = ''.join([t.text for t in c.findall('.//{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t') if t.text])
            elif v_el is not None and v_el.text:
                val = v_el.text
            if val is not None:
                row_dict[r_ref] = val
        for k, v in row_dict.items():
            if k.startswith('A') and re.match(r'^[a-z]+(\.[a-z_]+)+$', str(v).strip()):
                row_idx = k[1:]
                code = v.strip()
                excel_perms[code] = {
                    'module': row_dict.get(f'B{row_idx}', ''),
                    'name': row_dict.get(f'C{row_idx}', '')
                }

# 2. Đọc permissions từ SQL migration 002
with open(sql_path, 'r', encoding='utf-8') as f:
    sql_text = f.read()

sql_perms = {}
for m in re.finditer(r"INSERT INTO public\.app_permissions\([^)]+\)\s*VALUES\s*\('([^']+)',\s*'([^']+)',\s*'([^']+)'", sql_text):
    code, module, name = m.groups()
    sql_perms[code] = {'module': module, 'name': name}

print("=" * 70)
print(f"Tổng số permissions trong Excel V5: {len(excel_perms)}")
print(f"Tổng số permissions trong SQL 002: {len(sql_perms)}")

missing_in_sql = set(excel_perms.keys()) - set(sql_perms.keys())
surplus_in_sql = set(sql_perms.keys()) - set(excel_perms.keys())

print(f"Số quyền có trong Excel nhưng thiếu trong SQL: {len(missing_in_sql)}")
if missing_in_sql:
    for p in sorted(missing_in_sql):
        print(f"  - {p}")

print(f"Số quyền có trong SQL nhưng thừa so với Excel: {len(surplus_in_sql)}")
if surplus_in_sql:
    for p in sorted(surplus_in_sql):
        print(f"  - {p}")

if not missing_in_sql and not surplus_in_sql and len(excel_perms) == 67:
    print("\n=> KẾT QUẢ: 67 PERMISSIONS TRONG SQL MIGRATION 002 HOÀN TOÀN TRÙNG KHỚP 100% VỚI EXCEL V5!")
else:
    print("\n=> CÓ SỰ KHÁC BIỆT GIỮA SQL VÀ EXCEL!")
print("=" * 70)
