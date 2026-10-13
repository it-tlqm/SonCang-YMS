-- ==============================================================================
-- MIGRATION 003: RBAC SECURITY FUNCTIONS, RLS POLICIES & AUDIT PROTECTION — V5
-- Dự án: Website + PWA Quản lý bến bãi Sơn Cảng
-- Ngày cập nhật: 11/10/2026 (Khắc phục toàn diện theo kết quả Kiểm toán độc lập)
-- ==============================================================================

BEGIN;

-- 1. BẢO VỆ NHẬT KÝ KIỂM TOÁN (APPEND-ONLY, IMMUTABLE)
CREATE OR REPLACE FUNCTION public.sc_audit_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  RAISE EXCEPTION 'Audit log is immutable. Cấm sửa hoặc xóa nhật ký kiểm toán hệ thống.';
END;
$$;

DROP TRIGGER IF EXISTS trg_sc_audit_immutable ON public.app_audit_events;
CREATE TRIGGER trg_sc_audit_immutable
  BEFORE UPDATE OR DELETE ON public.app_audit_events
  FOR EACH ROW EXECUTE FUNCTION public.sc_audit_immutable();


-- 2. HÀM KIỂM TRA QUYỀN ĐỘNG TRÊN TỪNG DÒNG DỮ LIỆU (ROW-LEVEL AUTHORITY RESOLVER)
-- An toàn: SECURITY DEFINER, search_path rỗng để chống search_path injection.
-- Kiểm tra nghiêm ngặt: auth.uid(), assignment còn hạn, role active, feature flag active.
CREATE OR REPLACE FUNCTION public.sc_can(
  p_permission_code text,
  p_row_yard_id uuid DEFAULT NULL,
  p_row_department_code text DEFAULT NULL,
  p_row_owner_id uuid DEFAULT NULL
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_user_role_assignments ura
    JOIN public.app_roles r 
      ON r.code = ura.role_code 
     AND r.is_active = true
    JOIN public.app_role_permissions rp 
      ON rp.role_code = r.code 
     AND rp.is_enabled = true
    JOIN public.app_permissions p 
      ON p.code = rp.permission_code 
     AND p.is_active = true
    JOIN public.app_feature_flags f 
      ON f.feature_key = p.feature_key 
     AND f.is_enabled = true
    WHERE ura.user_id = auth.uid()
      AND ura.is_active = true
      AND ura.valid_from <= now()
      AND (ura.valid_until IS NULL OR ura.valid_until > now())
      AND p.code = p_permission_code
      AND (
        -- Scope 1: Toàn quyền hệ thống
        rp.scope = 'ALL'
        -- Scope 2: Phạm vi toàn Bãi Sơn Cảng
        OR (rp.scope = 'YARD' 
            AND p_row_yard_id IS NOT NULL 
            AND ura.yard_id = p_row_yard_id)
        -- Scope 3: Phạm vi cùng Bộ phận trong Bãi
        OR (rp.scope = 'DEPARTMENT' 
            AND p_row_yard_id IS NOT NULL 
            AND ura.yard_id = p_row_yard_id 
            AND p_row_department_code IS NOT NULL 
            AND ura.department_code = p_row_department_code)
        -- Scope 4: Phạm vi Cá nhân trực tiếp phụ trách / thu tiền
        OR (rp.scope = 'SELF' 
            AND p_row_yard_id IS NOT NULL 
            AND ura.yard_id = p_row_yard_id 
            AND p_row_owner_id IS NOT NULL 
            AND p_row_owner_id = auth.uid())
      )
  );
$$;

REVOKE ALL ON FUNCTION public.sc_can(text, uuid, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sc_can(text, uuid, text, uuid) TO authenticated;


-- 3. HÀM TRẢ VỀ QUYỀN HIỆU LỰC CHO NGƯỜI DÙNG HIỆN TẠI (EFFECTIVE PERMISSIONS)
-- Dùng để Frontend hiển thị menu/nút theo quyền thật (Backend vẫn kiểm tra lại qua sc_can).
CREATE OR REPLACE FUNCTION public.sc_my_permissions()
RETURNS TABLE(permission_code text, scope text, yard_id uuid, department_code text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT DISTINCT p.code, rp.scope, ura.yard_id, ura.department_code
  FROM public.app_user_role_assignments ura
  JOIN public.app_roles r 
    ON r.code = ura.role_code 
   AND r.is_active = true
  JOIN public.app_role_permissions rp 
    ON rp.role_code = r.code 
   AND rp.is_enabled = true
  JOIN public.app_permissions p 
    ON p.code = rp.permission_code 
   AND p.is_active = true
  JOIN public.app_feature_flags f 
    ON f.feature_key = p.feature_key 
   AND f.is_enabled = true
  WHERE ura.user_id = auth.uid()
    AND ura.is_active = true
    AND ura.valid_from <= now()
    AND (ura.valid_until IS NULL OR ura.valid_until > now());
$$;

REVOKE ALL ON FUNCTION public.sc_my_permissions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sc_my_permissions() TO authenticated;


-- 4. HÀM GHI NHẬT KÝ KIỂM TOÁN AN TOÀN (AUDIT LOGGING RPC)
-- Client KHÔNG được phép INSERT trực tiếp vào app_audit_events. Mọi ghi nhận phải qua hàm này hoặc Trigger.
CREATE OR REPLACE FUNCTION public.sc_log_audit_event(
  p_action_code text,
  p_target_type text,
  p_target_id text DEFAULT NULL,
  p_yard_id uuid DEFAULT NULL,
  p_department_code text DEFAULT NULL,
  p_before_data jsonb DEFAULT NULL,
  p_after_data jsonb DEFAULT NULL,
  p_reason text DEFAULT NULL,
  p_request_id text DEFAULT NULL,
  p_device_info jsonb DEFAULT NULL
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_id bigint;
  v_actor_id uuid;
  v_user_dept text;
  v_user_yard uuid;
BEGIN
  v_actor_id := auth.uid();
  
  -- Tự động lấy yard và department từ assignment của actor nếu không truyền
  IF v_actor_id IS NOT NULL AND (p_yard_id IS NULL OR p_department_code IS NULL) THEN
    SELECT ura.yard_id, ura.department_code 
    INTO v_user_yard, v_user_dept
    FROM public.app_user_role_assignments ura
    WHERE ura.user_id = v_actor_id AND ura.is_active = true
    ORDER BY ura.created_at DESC
    LIMIT 1;
    
    p_yard_id := COALESCE(p_yard_id, v_user_yard);
    p_department_code := COALESCE(p_department_code, v_user_dept);
  END IF;

  INSERT INTO public.app_audit_events (
    event_at, actor_user_id, action_code, target_type, target_id,
    yard_id, department_code, before_data, after_data, reason,
    request_id, device_info
  ) VALUES (
    clock_timestamp(), v_actor_id, p_action_code, p_target_type, p_target_id,
    p_yard_id, p_department_code, p_before_data, p_after_data, p_reason,
    p_request_id, p_device_info
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sc_log_audit_event FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sc_log_audit_event FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sc_log_audit_event TO service_role;


-- 5. TRIGGER TỰ ĐỘNG GHI AUDIT KHI THAY ĐỔI ROLE ASSIGNMENT & ROLE PERMISSIONS (RBAC-05)
CREATE OR REPLACE FUNCTION public.sc_trg_audit_user_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.sc_log_audit_event(
      'system.role.assign', 'app_user_role_assignments', NEW.id::text,
      NEW.yard_id, NEW.department_code, NULL, to_jsonb(NEW),
      'Gán vai trò người dùng'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.sc_log_audit_event(
      'system.role.update_assignment', 'app_user_role_assignments', NEW.id::text,
      NEW.yard_id, NEW.department_code, to_jsonb(OLD), to_jsonb(NEW),
      'Cập nhật gán vai trò người dùng'
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.sc_log_audit_event(
      'system.role.revoke', 'app_user_role_assignments', OLD.id::text,
      OLD.yard_id, OLD.department_code, to_jsonb(OLD), NULL,
      'Thu hồi vai trò người dùng'
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.app_user_role_assignments;
CREATE TRIGGER trg_audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.app_user_role_assignments
  FOR EACH ROW EXECUTE FUNCTION public.sc_trg_audit_user_roles();


CREATE OR REPLACE FUNCTION public.sc_trg_audit_role_perms()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.sc_log_audit_event(
      'system.role_permissions.grant', 'app_role_permissions', NEW.role_code || ':' || NEW.permission_code,
      NULL, NULL, NULL, to_jsonb(NEW),
      'Cấp quyền cho vai trò'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.sc_log_audit_event(
      'system.role_permissions.update', 'app_role_permissions', NEW.role_code || ':' || NEW.permission_code,
      NULL, NULL, to_jsonb(OLD), to_jsonb(NEW),
      'Cập nhật quyền của vai trò'
    );
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.sc_log_audit_event(
      'system.role_permissions.revoke', 'app_role_permissions', OLD.role_code || ':' || OLD.permission_code,
      NULL, NULL, to_jsonb(OLD), NULL,
      'Thu hồi quyền của vai trò'
    );
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_role_perms ON public.app_role_permissions;
CREATE TRIGGER trg_audit_role_perms
  AFTER INSERT OR UPDATE OR DELETE ON public.app_role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.sc_trg_audit_role_perms();


-- 6. HÀM RPC PHÊ DUYỆT / TỪ CHỐI / TẠO YÊU CẦU AN TOÀN — FOUR-EYES ENFORCEMENT (RBAC-02)

-- 6.1 RPC Tạo yêu cầu phê duyệt an toàn (SC-R2-03 & SC-R2-04)
CREATE OR REPLACE FUNCTION public.sc_create_approval_request(
  p_policy_code text,
  p_target_type text,
  p_target_id uuid,
  p_yard_id uuid DEFAULT NULL,
  p_department_code text DEFAULT NULL,
  p_reason text DEFAULT '',
  p_before_snapshot jsonb DEFAULT NULL,
  p_proposed_changes jsonb DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_pol record;
  v_req_id uuid;
  v_user_yard uuid;
  v_user_dept text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Lý do yêu cầu phê duyệt không được để trống.';
  END IF;

  SELECT * INTO v_pol FROM public.app_approval_policies WHERE policy_code = p_policy_code;
  IF NOT FOUND OR v_pol.is_enabled = false THEN
    RAISE EXCEPTION 'Chính sách phê duyệt không hợp lệ hoặc đã bị vô hiệu hóa: %', p_policy_code;
  END IF;

  -- Fail-closed: Chỉ chính sách có quy trình duyệt hai bước (approve_permission_code IS NOT NULL) mới tạo approval request (SC-R2-02)
  IF v_pol.approve_permission_code IS NULL THEN
    RAISE EXCEPTION 'Chính sách % là tác vụ một bước, không áp dụng tạo yêu cầu phê duyệt hai bước.', p_policy_code;
  END IF;

  -- Tự động lấy yard_id và department_code từ assignment của user nếu chưa truyền
  IF p_yard_id IS NULL OR p_department_code IS NULL THEN
    SELECT ura.yard_id, ura.department_code 
    INTO v_user_yard, v_user_dept
    FROM public.app_user_role_assignments ura
    WHERE ura.user_id = v_actor_id AND ura.is_active = true
    ORDER BY ura.created_at DESC
    LIMIT 1;

    p_yard_id := COALESCE(p_yard_id, v_user_yard);
    p_department_code := COALESCE(p_department_code, v_user_dept);
  END IF;

  -- Kiểm tra quyền tạo đề xuất với context phạm vi (SC-R2-03)
  IF v_pol.request_permission_code IS NOT NULL AND NOT public.sc_can(v_pol.request_permission_code, p_yard_id, p_department_code) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền tạo đề xuất (%) cho chính sách % tại phạm vi bãi/bộ phận tương ứng.', v_pol.request_permission_code, p_policy_code;
  END IF;

  -- Fail-closed Guard (SC-R3-05): Chặn tạo phê duyệt dựa hoàn toàn trên target/snapshot do client tự khai báo
  -- Bắt buộc đối chiếu bản ghi mục tiêu từ Database. Trong Phase 1B chưa có Domain Schema, khóa an toàn luồng này.
  RAISE EXCEPTION 'Target Verification Required: Bảng nghiệp vụ mục tiêu (%) chưa tồn tại trong Phase 1B (phụ thuộc Phase 1C). Không chấp nhận hồ sơ tự khai báo từ client.', p_target_type;

  INSERT INTO public.app_approval_requests (
    policy_code, target_type, target_id, yard_id, department_code,
    requested_by, reason, before_snapshot, proposed_changes, status
  ) VALUES (
    p_policy_code, p_target_type, p_target_id, p_yard_id, p_department_code,
    v_actor_id, p_reason, p_before_snapshot, p_proposed_changes, 'PENDING'
  ) RETURNING id INTO v_req_id;

  -- Ghi nhận audit event nội bộ
  PERFORM public.sc_log_audit_event(
    'approval.request.create', 'app_approval_requests', v_req_id::text,
    p_yard_id, p_department_code, NULL, 
    jsonb_build_object('policy_code', p_policy_code, 'target_type', p_target_type, 'target_id', p_target_id, 'status', 'PENDING'),
    p_reason
  );

  RETURN v_req_id;
END;
$$;

REVOKE ALL ON FUNCTION public.sc_create_approval_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sc_create_approval_request TO authenticated;


-- 6.2 RPC Phê duyệt yêu cầu (Four-Eyes Enforcement & Context-Aware Scope)
CREATE OR REPLACE FUNCTION public.sc_approve_request(
  p_request_id uuid,
  p_reason text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_req record;
  v_pol record;
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  SELECT * INTO v_req FROM public.app_approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Yêu cầu phê duyệt không tồn tại: %', p_request_id;
  END IF;

  IF v_req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Yêu cầu không ở trạng thái chờ duyệt (status: %).', v_req.status;
  END IF;

  SELECT * INTO v_pol FROM public.app_approval_policies WHERE policy_code = v_req.policy_code;
  IF NOT FOUND OR v_pol.is_enabled = false THEN
    RAISE EXCEPTION 'Chính sách phê duyệt không hợp lệ hoặc đã bị vô hiệu hóa: %', v_req.policy_code;
  END IF;

  -- Kiểm tra nguyên tắc bốn mắt (Four-Eyes)
  IF v_pol.enforce_distinct_actor AND v_req.requested_by = v_actor_id THEN
    RAISE EXCEPTION 'Four-Eyes Violation: Người yêu cầu không được phép tự phê duyệt đề xuất của chính mình.';
  END IF;

  -- Fail-closed: Chính sách phải có mã quyền duyệt hợp lệ (SC-R2-02)
  IF v_pol.approve_permission_code IS NULL THEN
    RAISE EXCEPTION 'Chính sách % là tác vụ một bước / không áp dụng phê duyệt qua RPC sc_approve_request. Thao tác bị từ chối.', v_req.policy_code;
  END IF;

  -- Kiểm tra quyền phê duyệt có kèm context yard_id và department_code của request (SC-R2-03)
  IF NOT public.sc_can(v_pol.approve_permission_code, v_req.yard_id, v_req.department_code) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền phê duyệt (%) cho chính sách % tại phạm vi bãi/bộ phận tương ứng.', v_pol.approve_permission_code, v_pol.policy_code;
  END IF;

  UPDATE public.app_approval_requests
  SET status = 'APPROVED',
      approved_by = v_actor_id,
      decision_at = clock_timestamp()
  WHERE id = p_request_id;

  -- Ghi nhận audit event với context bãi và bộ phận
  PERFORM public.sc_log_audit_event(
    'approval.request.approve', 'app_approval_requests', p_request_id::text,
    v_req.yard_id, v_req.department_code, to_jsonb(v_req), 
    jsonb_build_object('status', 'APPROVED', 'approved_by', v_actor_id, 'decision_at', clock_timestamp()),
    COALESCE(p_reason, 'Phê duyệt yêu cầu theo chính sách ' || v_pol.policy_code)
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.sc_approve_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sc_approve_request TO authenticated;


-- 6.3 RPC Từ chối yêu cầu (Context-Aware Scope & Fail-Closed)
CREATE OR REPLACE FUNCTION public.sc_reject_request(
  p_request_id uuid,
  p_reason text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_req record;
  v_pol record;
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
    RAISE EXCEPTION 'Bắt buộc phải nhập lý do từ chối yêu cầu.';
  END IF;

  SELECT * INTO v_req FROM public.app_approval_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Yêu cầu phê duyệt không tồn tại: %', p_request_id;
  END IF;

  IF v_req.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Yêu cầu không ở trạng thái chờ duyệt (status: %).', v_req.status;
  END IF;

  SELECT * INTO v_pol FROM public.app_approval_policies WHERE policy_code = v_req.policy_code;
  IF NOT FOUND OR v_pol.is_enabled = false THEN
    RAISE EXCEPTION 'Chính sách phê duyệt không hợp lệ hoặc đã bị vô hiệu hóa: %', v_req.policy_code;
  END IF;

  -- Fail-closed: Chính sách phải có mã quyền duyệt hợp lệ (SC-R2-02)
  IF v_pol.approve_permission_code IS NULL THEN
    RAISE EXCEPTION 'Chính sách % là tác vụ một bước / không áp dụng xử lý qua RPC sc_reject_request. Thao tác bị từ chối.', v_req.policy_code;
  END IF;

  -- Kiểm tra quyền từ chối có kèm context yard_id và department_code của request (SC-R2-03)
  IF NOT public.sc_can(v_pol.approve_permission_code, v_req.yard_id, v_req.department_code) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền xử lý/từ chối yêu cầu (%) cho chính sách % tại phạm vi bãi/bộ phận tương ứng.', v_pol.approve_permission_code, v_pol.policy_code;
  END IF;

  UPDATE public.app_approval_requests
  SET status = 'REJECTED',
      approved_by = v_actor_id,
      decision_at = clock_timestamp()
  WHERE id = p_request_id;

  -- Ghi nhận audit event với context bãi và bộ phận
  PERFORM public.sc_log_audit_event(
    'approval.request.reject', 'app_approval_requests', p_request_id::text,
    v_req.yard_id, v_req.department_code, to_jsonb(v_req), 
    jsonb_build_object('status', 'REJECTED', 'rejected_by', v_actor_id, 'decision_at', clock_timestamp(), 'reject_reason', p_reason),
    p_reason
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.sc_reject_request FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sc_reject_request TO authenticated;



-- 7. BẬT ROW LEVEL SECURITY (RLS) TRÊN TOÀN BỘ 11 BẢNG RBAC
ALTER TABLE public.app_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_yards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_user_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_approval_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_audit_events ENABLE ROW LEVEL SECURITY;


-- 8. CHÍNH SÁCH RLS (POLICIES) — DENY-BY-DEFAULT, GIA CỐ BẢO MẬT

-- 8.1. Các bảng danh mục tra cứu: Authenticated được đọc công khai để hiển thị
DROP POLICY IF EXISTS p_departments_read ON public.app_departments;
CREATE POLICY p_departments_read ON public.app_departments
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_yards_read ON public.app_yards;
CREATE POLICY p_yards_read ON public.app_yards
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_roles_read ON public.app_roles;
CREATE POLICY p_roles_read ON public.app_roles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_permissions_read ON public.app_permissions;
CREATE POLICY p_permissions_read ON public.app_permissions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_feature_flags_read ON public.app_feature_flags;
CREATE POLICY p_feature_flags_read ON public.app_feature_flags
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_settings_read ON public.app_settings;
CREATE POLICY p_settings_read ON public.app_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS p_approval_policies_read ON public.app_approval_policies;
CREATE POLICY p_approval_policies_read ON public.app_approval_policies
  FOR SELECT TO authenticated USING (true);

-- 8.2. Role permissions: Chỉ đọc bởi admin có quyền quản trị; Thay đổi chỉ bởi admin (Trigger tự động log audit)
DROP POLICY IF EXISTS p_role_permissions_admin_read ON public.app_role_permissions;
CREATE POLICY p_role_permissions_admin_read ON public.app_role_permissions
  FOR SELECT TO authenticated 
  USING (public.sc_can('admin.role_permissions.manage'));

DROP POLICY IF EXISTS p_role_permissions_admin_write ON public.app_role_permissions;
CREATE POLICY p_role_permissions_admin_write ON public.app_role_permissions
  FOR ALL TO authenticated 
  USING (public.sc_can('admin.role_permissions.manage'))
  WITH CHECK (public.sc_can('admin.role_permissions.manage'));

-- 8.3. User role assignments: User xem của mình; Admin xem và quản lý (Trigger tự động log audit)
DROP POLICY IF EXISTS p_assignments_self_read ON public.app_user_role_assignments;
CREATE POLICY p_assignments_self_read ON public.app_user_role_assignments
  FOR SELECT TO authenticated 
  USING (user_id = auth.uid() OR public.sc_can('admin.users.manage'));

DROP POLICY IF EXISTS p_assignments_admin_manage ON public.app_user_role_assignments;
CREATE POLICY p_assignments_admin_manage ON public.app_user_role_assignments
  FOR ALL TO authenticated 
  USING (public.sc_can('admin.users.manage'))
  WITH CHECK (public.sc_can('admin.users.manage'));

-- 8.4. Approval requests (RBAC-02 GIA CỐ — SC-R2-04, SC-R2-07, SC-R2-08):
-- Quyền đọc: Người yêu cầu, người duyệt, người có quyền audit.export_all, hoặc người có quyền duyệt chính sách trong phạm vi bãi/bộ phận tương ứng
DROP POLICY IF EXISTS p_approval_read ON public.app_approval_requests;
CREATE POLICY p_approval_read ON public.app_approval_requests
  FOR SELECT TO authenticated 
  USING (
    requested_by = auth.uid() 
    OR approved_by = auth.uid()
    OR public.sc_can('audit.export_all')
    OR EXISTS (
      SELECT 1 FROM public.app_approval_policies ap
      WHERE ap.policy_code = app_approval_requests.policy_code
        AND ap.approve_permission_code IS NOT NULL
        AND public.sc_can(ap.approve_permission_code, app_approval_requests.yard_id, app_approval_requests.department_code)
    )
  );

-- SC-R4-02: KHÓA TRIỆT ĐỂ ĐƯỜNG INSERT TRỰC TIẾP TRÊN app_approval_requests
-- Client tuyệt đối không được tự INSERT bảng khi chưa có Domain Schema nghiệp vụ tin cậy.
DROP POLICY IF EXISTS p_approval_insert ON public.app_approval_requests;
REVOKE INSERT ON public.app_approval_requests FROM authenticated, anon, PUBLIC;

-- KHÔNG CÓ POLICY UPDATE / DELETE TRỰC TIẾP CHO CLIENT TRÊN app_approval_requests!
-- Chuyển trạng thái bắt buộc phải thông qua RPC: sc_approve_request hoặc sc_reject_request.

-- 8.5. Audit events (RBAC-03 & RBAC-04 GIA CỐ):
-- KHÔNG CÓ POLICY INSERT TRỰC TIẾP CHO CLIENT! Chỉ ghi qua sc_log_audit_event() hoặc trigger nội bộ.
DROP POLICY IF EXISTS p_audit_insert ON public.app_audit_events;

-- SELECT: Trưởng bộ phận chỉ xem nhật ký bãi & bộ phận của mình (DEPARTMENT). SYS_ADMIN xem toàn bộ (ALL).
DROP POLICY IF EXISTS p_audit_select ON public.app_audit_events;
CREATE POLICY p_audit_select ON public.app_audit_events
  FOR SELECT TO authenticated 
  USING (
    public.sc_can('audit.export_all')
    OR public.sc_can('audit.read', yard_id, department_code)
  );

COMMIT;
