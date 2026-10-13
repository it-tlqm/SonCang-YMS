import zipfile
import xml.etree.ElementTree as ET
import json
import os

NS = {'s': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def parse_excel(wb_path):
    with zipfile.ZipFile(wb_path, 'r') as z:
        # Load shared strings if any
        shared_strings = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss_tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in ss_tree.findall('s:si', NS):
                texts = [t.text for t in si.findall('.//s:t', NS) if t.text is not None]
                shared_strings.append("".join(texts))

        # Find sheet name to target mapping
        wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
        sheets_elem = wb_tree.find('s:sheets', NS)
        
        rels_tree = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        rel_map = {}
        for rel in rels_tree.findall('{http://schemas.openxmlformats.org/package/2006/relationships}Relationship'):
            rel_map[rel.attrib['Id']] = rel.attrib['Target']

        sheets = {}
        for s in sheets_elem.findall('s:sheet', NS):
            name = s.attrib['name']
            r_id = s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
            target = rel_map[r_id]
            if target.startswith('/'):
                target = target[1:]
            elif not target.startswith('xl/'):
                target = 'xl/' + target
            sheets[name] = target

        result = {}
        for sheet_name, target in sheets.items():
            # Chỉ lấy các tab V5 liên quan RBAC và cấu hình
            if not any(sheet_name.startswith(p) for p in ['19_', '20_', '21_', '23_', '24_']):
                continue

            sheet_tree = ET.fromstring(z.read(target))
            rows_data = []
            sheet_data = sheet_tree.find('s:sheetData', NS)
            if sheet_data is None:
                continue

            for row in sheet_data.findall('s:row', NS):
                row_dict = {}
                for c in row.findall('s:c', NS):
                    col_ref = c.attrib.get('r', '')
                    t = c.attrib.get('t')
                    val = None
                    if t == 'inlineStr':
                        texts = [t_node.text for t_node in c.findall('.//s:t', NS) if t_node.text is not None]
                        val = "".join(texts)
                    elif t == 's':
                        v_el = c.find('s:v', NS)
                        if v_el is not None and v_el.text is not None:
                            idx = int(v_el.text)
                            val = shared_strings[idx] if idx < len(shared_strings) else v_el.text
                    elif t == 'b':
                        v_el = c.find('s:v', NS)
                        val = (v_el.text == '1') if (v_el is not None and v_el.text) else False
                    else:
                        v_el = c.find('s:v', NS)
                        if v_el is not None and v_el.text is not None:
                            val = v_el.text
                    if val is not None:
                        row_dict[col_ref] = val
                if row_dict:
                    rows_data.append(row_dict)
            result[sheet_name] = rows_data

        return result

if __name__ == '__main__':
    wb = r'ProjectContext/02_RBAC_V5/PWA_Son_Cang_V5_Phan_quyen_RBAC_DONG_HOAN_THIEN.xlsx'
    data = parse_excel(wb)
    out_path = 'scripts/extracted_rbac_v5.json'
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print("Exported JSON successfully.")
    for k, v in data.items():
        print(f"Sheet rows count: {len(v)}")
