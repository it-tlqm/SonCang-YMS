import json

def escape_sql(val):
    if val is None:
        return "NULL"
    s = str(val).replace("'", "''")
    return f"'{s}'"

def generate():
    with open('scripts/verified_roles.json', 'r', encoding='utf-8') as f:
        roles = json.load(f)
    with open('scripts/verified_permissions.json', 'r', encoding='utf-8') as f:
        permissions = json.load(f)
    with open('scripts/verified_grants.json', 'r', encoding='utf-8') as f:
        grants = json.load(f)

    lines = []
    lines.append("-- ==============================================================================")
    lines.append("-- MIGRATION 002: SEED DATA RBAC V5 — SƠN CẢNG")
    lines.append("-- Tự động đối chiếu 100% với Workbook RBAC V5 (tab 19, 20, 21, 23, 24)")
    lines.append(f"-- Tổng số: {len(roles)} roles (7 active + 1 inactive), {len(permissions)} permissions, {len(grants)} grants")
    lines.append("-- Không ghi đè ON CONFLICT dữ liệu tùy biến đã sửa trên môi trường live")
    lines.append("-- ==============================================================================")
    lines.append("")
    lines.append("BEGIN;")
    lines.append("")
    
    # 1. Departments
    lines.append("-- 1. Danh mục Bộ phận cơ sở")
    lines.append("INSERT INTO public.app_departments(code, display_name) VALUES")
    lines.append("  ('AN_NINH', 'Bộ phận An ninh'),")
    lines.append("  ('CCKB', 'Bộ phận Nghiệp vụ cổng cảng kho bãi'),")
    lines.append("  ('DIEU_PHOI', 'Bộ phận Điều phối'),")
    lines.append("  ('HE_THONG', 'Quản trị hệ thống'),")
    lines.append("  ('KE_TOAN', 'Kế toán')")
    lines.append("ON CONFLICT (code) DO NOTHING;")
    lines.append("")

    # 2. Yard
    lines.append("-- 2. Bãi Sơn Cảng")
    lines.append("INSERT INTO public.app_yards(name) VALUES ('Bãi Sơn Cảng') ON CONFLICT (name) DO NOTHING;")
    lines.append("")

    # 3. Roles
    lines.append(f"-- 3. Danh mục {len(roles)} Vai trò (7 vai trò hoạt động V1 + 1 dự phòng)")
    for r in roles:
        active_sql = "TRUE" if r['is_active'] else "FALSE"
        lines.append(f"INSERT INTO public.app_roles(code, display_name, department_code, seniority, is_active, release_phase, description) VALUES ({escape_sql(r['code'])}, {escape_sql(r['name'])}, {escape_sql(r['dept'])}, {escape_sql(r['seniority'])}, {active_sql}, {escape_sql(r['phase'])}, {escape_sql(r['desc'])}) ON CONFLICT (code) DO NOTHING;")
    lines.append("")

    # 4. Feature Flags
    lines.append("-- 4. Cờ tính năng nền tảng và tương lai")
    lines.append("INSERT INTO public.app_feature_flags(feature_key, display_name, is_enabled) VALUES")
    lines.append("  ('CORE', 'Chức năng cốt lõi V1', TRUE),")
    lines.append("  ('TICKET_AUTOPRINT', 'Tự động in vé giấy', FALSE),")
    lines.append("  ('YARD_SLOT_MANAGEMENT', 'Quản lý vị trí khu/dãy/ô container', FALSE),")
    lines.append("  ('CHARGE_DISCOUNT', 'Miễn/giảm và điều chỉnh phí', FALSE),")
    lines.append("  ('REFUNDS', 'Hoàn tiền / hủy bút toán thu', FALSE),")
    lines.append("  ('E_INVOICE', 'Phát hành hóa đơn điện tử', FALSE)")
    lines.append("ON CONFLICT (feature_key) DO NOTHING;")
    lines.append("")

    # 5. Permissions (67)
    lines.append(f"-- 5. Danh mục chuẩn {len(permissions)} Action Permissions V5")
    for p in permissions:
        active_sql = "TRUE" if p['is_active'] else "FALSE"
        lines.append(f"INSERT INTO public.app_permissions(code, module, display_name, source_questions, release_phase, feature_key, risk_level, description, is_active) VALUES ({escape_sql(p['code'])}, {escape_sql(p['module'])}, {escape_sql(p['name'])}, {escape_sql(p['source'])}, {escape_sql(p['phase'])}, {escape_sql(p['feature_key'])}, {escape_sql(p['risk'])}, {escape_sql(p['desc'])}, {active_sql}) ON CONFLICT (code) DO NOTHING;")
    lines.append("")

    # 6. Grants (206)
    lines.append(f"-- 6. Cấp quyền mặc định: {len(grants)} Role-Permission Grants V5")
    for g in grants:
        enabled_sql = "TRUE" if g['is_enabled'] else "FALSE"
        lines.append(f"INSERT INTO public.app_role_permissions(role_code, permission_code, scope, is_enabled) VALUES ({escape_sql(g['role_code'])}, {escape_sql(g['permission_code'])}, {escape_sql(g['scope'])}, {enabled_sql}) ON CONFLICT (role_code, permission_code) DO NOTHING;")
    lines.append("")

    # 7. App Settings
    lines.append("-- 7. Tham số cấu hình vận hành (App Settings)")
    settings = [
        ("REEFER_BILLING_INTERVAL_MINUTES", "15", "Quy tắc điện", "Đã chốt", "Mỗi phiên làm tròn lên bội số 15 phút."),
        ("REEFER_HOURLY_RATE_VND", "100000", "Bảng giá", "Đã chốt", "Đơn vị giờ, áp dụng cho cả DIEN_CONT_GIO và DIEN_CONT_LIEN_TUC."),
        ("STORAGE_NIGHT_FEE_VND", "100000", "Bảng giá", "Đã chốt", "100.000đ/container/đêm, khung 22:00-06:00."),
        ("STORAGE_FREE_INITIAL_NIGHTS", "1", "Quy tắc lưu", "Đã chốt", "Miễn phí đêm lưu đầu tiên."),
        ("STORAGE_CUTOFF_START", "\"22:00:00\"", "Quy tắc lưu", "Đã chốt", "Bắt đầu khung tính đêm Asia/Ho_Chi_Minh."),
        ("STORAGE_CUTOFF_END", "\"06:00:00\"", "Quy tắc lưu", "Đã chốt", "Kết thúc khung tính đêm Asia/Ho_Chi_Minh."),
        ("OFFLINE_GATE_EXIT_ALLOWED", "false", "An toàn", "Đã chốt", "Không tự xác nhận thành công ra cổng khi mất kết nối mạng."),
        ("AUTO_MERGE_CONTAINER_ALLOWED", "false", "An toàn", "Đã chốt", "Cấm tự động gộp số container theo 7 số cuối hoặc check-digit.")
    ]
    for k, v, t, s, n in settings:
        lines.append(f"INSERT INTO public.app_settings(setting_key, setting_value, setting_type, decision_status, notes) VALUES ({escape_sql(k)}, '{v}'::jsonb, {escape_sql(t)}, {escape_sql(s)}, {escape_sql(n)}) ON CONFLICT (setting_key) DO NOTHING;")
    lines.append("")

    # 8. Approval Policies
    lines.append("-- 8. Chính sách phê duyệt 4 mắt (Approval Policies)")
    policies = [
        ("AP01", "Sửa giờ điện/chênh tiền SAU khi thu", "reefer.session.amendment.request", "reefer.session.amendment.approve", True, True, True, "Giữ giao dịch đã thu; tạo điều chỉnh công nợ/hoàn trả, không ghi đè."),
        ("AP02", "Sửa giờ điện TRƯỚC khi thu", "reefer.session.time.edit_unpaid", None, False, True, True, "Ghi trước/sau, lý do, giờ thực tế khác giờ nhập."),
        ("AP03", "Điều chỉnh thời lượng điện trước thu", "reefer.session.billable.override_unpaid", None, False, True, True, "Lưu số tự tính làm tròn 15p và số sửa tay, hiện chênh lệch."),
        ("AP04", "Sửa số cont SAU đã thu", "container.number.correct", "payment.post_correction.approve", False, True, True, "Sửa mã ngay có audit/CCKB nhận cảnh báo. Chỉ sửa TIỀN chênh sau thu mới phải duyệt."),
        ("AP05", "Chỉnh HÀNG/RỖNG SAU cont ra", "container.cargo.post_exit.request", "container.cargo.post_exit.approve", True, True, True, "Không cấp sửa sau ra trực tiếp cho NV/An ninh."),
        ("AP06", "CCKB cho xuất còn công nợ", "exit.clearance.debt_exception", None, False, True, True, "Không xóa công nợ; thời điểm An ninh xác nhận cont ra vẫn tính tiền lưu mới."),
        ("AP07", "Có tiền lưu phát sinh ngay cửa ra", "storage.payment.collect", "exit.clearance.debt_exception", False, True, True, "Cảnh báo/đồng bộ lại số phí lưu tại giờ thực ra, không khóa tiền trước khi ra."),
        ("AP08", "Trạng thái PWA Đang cắm nhưng ngoài hiện trường đã rút", "exit.reefer_state.exception", None, False, True, True, "Không cho phép xuất khi cont thực tế vẫn đang nối điện; lưu giải trình khi dữ liệu app chưa cập nhật."),
        ("AP09", "Thu hồi CCKB đã xác nhận cho ra", "exit.clearance.revoke.request", "exit.clearance.revoke.approve", True, True, True, "Chỉ thu hồi trước khi xác nhận ra thực tế; sau ra dùng sửa lịch sử."),
        ("AP10", "Bảng giá thay đổi", "tariff.change.request", "tariff.change.publish", False, True, True, "Lưu phiên bản giá/hiệu lực; không thay tiền của lịch sử.")
    ]
    for p in policies:
        req_p = escape_sql(p[2]) if p[2] else "NULL"
        app_p = escape_sql(p[3]) if p[3] else "NULL"
        distinct_sql = "TRUE" if p[4] else "FALSE"
        reason_sql = "TRUE" if p[5] else "FALSE"
        enabled_sql = "TRUE" if p[6] else "FALSE"
        lines.append(f"INSERT INTO public.app_approval_policies(policy_code, label, request_permission_code, approve_permission_code, enforce_distinct_actor, reason_required, is_enabled, notes) VALUES ({escape_sql(p[0])}, {escape_sql(p[1])}, {req_p}, {app_p}, {distinct_sql}, {reason_sql}, {enabled_sql}, {escape_sql(p[7])}) ON CONFLICT (policy_code) DO NOTHING;")
    lines.append("")

    lines.append("COMMIT;")
    lines.append("")

    out_file = 'supabase/migrations/20261011000002_seed_rbac_v5.sql'
    with open(out_file, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))
    print(f"Generated {out_file} successfully.")

if __name__ == '__main__':
    generate()
