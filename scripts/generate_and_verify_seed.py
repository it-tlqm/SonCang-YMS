import json
import re

def parse_rbac():
    with open('scripts/extracted_rbac_v5.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 1. Parse Roles from 19_V5_VAI_TRO
    role_sheet = data.get('19_V5_VAI_TRO', [])
    roles = []
    for r in role_sheet:
        for k, v in r.items():
            if k.startswith('A') and v not in ['ROLE_CODE', 'V5 — DANH SÁCH VAI TRÒ (ROLE)'] and not str(v).startswith('7 vai trò'):
                row_num = k[1:]
                code = v.strip()
                name = r.get(f'B{row_num}', '').strip()
                dept = r.get(f'C{row_num}', '').strip()
                seniority = r.get(f'D{row_num}', '').strip()
                active_val = r.get(f'E{row_num}', '').strip()
                phase = r.get(f'F{row_num}', '').strip()
                desc = r.get(f'G{row_num}', '').strip()
                is_active = (active_val == 'Có' or active_val.upper() == 'TRUE')
                roles.append({
                    'code': code,
                    'name': name,
                    'dept': dept,
                    'seniority': seniority,
                    'is_active': is_active,
                    'phase': phase,
                    'desc': desc
                })
                break

    # 2. Parse Permissions from 20_V5_DANH_MUC_QUYEN
    perm_sheet = data.get('20_V5_DANH_MUC_QUYEN', [])
    permissions = []
    for r in perm_sheet:
        for k, v in r.items():
            if k.startswith('A') and re.match(r'^[a-z]+(\.[a-z_]+)+$', str(v).strip()):
                row_num = k[1:]
                code = v.strip()
                module = r.get(f'B{row_num}', '').strip()
                name = r.get(f'C{row_num}', '').strip()
                source = r.get(f'D{row_num}', '').strip()
                phase = r.get(f'E{row_num}', '').strip()
                feature_key = r.get(f'F{row_num}', '').strip() or 'CORE'
                risk = r.get(f'G{row_num}', '').strip() or 'Thông thường'
                desc = r.get(f'H{row_num}', '').strip()
                # Theo chuẩn V5: 60 quyền V1 CORE được kích hoạt, 7 quyền GĐ sau (feature flags tương lai) không kích hoạt
                is_active = (phase == 'V1' and feature_key == 'CORE')
                permissions.append({
                    'code': code,
                    'module': module,
                    'name': name,
                    'source': source,
                    'phase': phase,
                    'feature_key': feature_key,
                    'risk': risk,
                    'desc': desc,
                    'is_active': is_active
                })
                break

    # 3. Parse Grants from 21_V5_CAP_QUYEN_SEED
    grant_sheet = data.get('21_V5_CAP_QUYEN_SEED', [])
    grants = []
    for r in grant_sheet:
        for k, v in r.items():
            if k.startswith('A') and v not in ['ROLE_CODE', 'V5 — GÁN QUYỀN THEO VAI TRÒ (SEED)'] and not str(v).startswith('Dữ liệu mẫu'):
                row_num = k[1:]
                role_code = v.strip()
                perm_code = r.get(f'C{row_num}', '').strip()
                scope = r.get(f'D{row_num}', '').strip()
                active_val = r.get(f'E{row_num}', '').strip()
                is_enabled = (active_val == 'Có' or active_val.upper() == 'TRUE')
                if perm_code and scope in ['SELF', 'DEPARTMENT', 'YARD', 'ALL']:
                    grants.append({
                        'role_code': role_code,
                        'permission_code': perm_code,
                        'scope': scope,
                        'is_enabled': is_enabled
                    })
                break

    return roles, permissions, grants

if __name__ == '__main__':
    roles, permissions, grants = parse_rbac()

    with open('scripts/verified_roles.json', 'w', encoding='utf-8') as f:
        json.dump(roles, f, ensure_ascii=False, indent=2)

    with open('scripts/verified_permissions.json', 'w', encoding='utf-8') as f:
        json.dump(permissions, f, ensure_ascii=False, indent=2)

    with open('scripts/verified_grants.json', 'w', encoding='utf-8') as f:
        json.dump(grants, f, ensure_ascii=False, indent=2)

    active_roles = [r for r in roles if r['is_active']]
    inactive_roles = [r for r in roles if not r['is_active']]

    print(f"Roles: Total={len(roles)}, Active={len(active_roles)}, Inactive={len(inactive_roles)}")
    print(f"Permissions: Total={len(permissions)}")
    print(f"Grants: Total={len(grants)}")
