-- ==============================================================================
-- MIGRATION 001: FOUNDATION RBAC & METADATA SCHEMAS — SƠN CẢNG V5
-- Dự án: Website + PWA Quản lý bến bãi Sơn Cảng (Tà Lùng Quang Minh)
-- Ngày tạo: 11/10/2026
-- ==============================================================================

BEGIN;

-- 1. Bảng danh mục Bộ phận
CREATE TABLE IF NOT EXISTS public.app_departments (
  code text PRIMARY KEY,
  display_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true
);

-- 2. Bảng danh mục Bãi (chuẩn bị mở rộng đa bãi)
CREATE TABLE IF NOT EXISTS public.app_yards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true
);

-- 3. Bảng Vai trò (Roles V1 và dự phòng)
CREATE TABLE IF NOT EXISTS public.app_roles (
  code text PRIMARY KEY,
  display_name text NOT NULL,
  department_code text REFERENCES public.app_departments(code) ON DELETE RESTRICT,
  seniority text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  release_phase text NOT NULL DEFAULT 'V1',
  description text NOT NULL DEFAULT ''
);

-- 4. Bảng Danh mục Quyền (67 Action Permissions chuẩn V5)
CREATE TABLE IF NOT EXISTS public.app_permissions (
  code text PRIMARY KEY,
  module text NOT NULL,
  display_name text NOT NULL,
  source_questions text NOT NULL DEFAULT '',
  release_phase text NOT NULL DEFAULT 'V1',
  feature_key text NOT NULL DEFAULT 'CORE',
  risk_level text NOT NULL DEFAULT 'Thông thường',
  description text NOT NULL DEFAULT '',
  is_active boolean NOT NULL DEFAULT true
);

-- 5. Bảng Cấp quyền theo vai trò (Role Permissions Grants)
CREATE TABLE IF NOT EXISTS public.app_role_permissions (
  role_code text NOT NULL REFERENCES public.app_roles(code) ON DELETE RESTRICT,
  permission_code text NOT NULL REFERENCES public.app_permissions(code) ON DELETE RESTRICT,
  scope text NOT NULL CHECK (scope IN ('SELF', 'DEPARTMENT', 'YARD', 'ALL')),
  is_enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (role_code, permission_code)
);

-- 6. Bảng Phân công vai trò cho người dùng (User Role Assignments)
CREATE TABLE IF NOT EXISTS public.app_user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_code text NOT NULL REFERENCES public.app_roles(code) ON DELETE RESTRICT,
  yard_id uuid REFERENCES public.app_yards(id) ON DELETE RESTRICT,
  department_code text REFERENCES public.app_departments(code) ON DELETE RESTRICT,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_valid_time_window CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE INDEX IF NOT EXISTS idx_sc_role_assign_user_active 
  ON public.app_user_role_assignments(user_id, is_active);

-- 7. Bảng Cờ tính năng (Feature Flags)
CREATE TABLE IF NOT EXISTS public.app_feature_flags (
  feature_key text PRIMARY KEY,
  display_name text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false
);

-- 8. Bảng Cấu hình tham số nghiệp vụ (App Settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
  setting_key text PRIMARY KEY,
  setting_value jsonb NOT NULL,
  setting_type text NOT NULL,
  decision_status text NOT NULL,
  notes text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Bảng Chính sách phê duyệt 4 mắt (Approval Policies)
CREATE TABLE IF NOT EXISTS public.app_approval_policies (
  policy_code text PRIMARY KEY,
  label text NOT NULL,
  request_permission_code text,
  approve_permission_code text,
  enforce_distinct_actor boolean NOT NULL DEFAULT true,
  reason_required boolean NOT NULL DEFAULT true,
  is_enabled boolean NOT NULL DEFAULT true,
  notes text NOT NULL DEFAULT ''
);

-- 10. Bảng Yêu cầu phê duyệt (Approval Requests)
CREATE TABLE IF NOT EXISTS public.app_approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_code text NOT NULL REFERENCES public.app_approval_policies(policy_code) ON DELETE RESTRICT,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  yard_id uuid REFERENCES public.app_yards(id) ON DELETE SET NULL,
  department_code text REFERENCES public.app_departments(code) ON DELETE SET NULL,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason text NOT NULL,
  before_snapshot jsonb,
  proposed_changes jsonb,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  decision_at timestamptz,
  CONSTRAINT chk_approval_reason_not_empty CHECK (length(trim(reason)) > 0),
  CONSTRAINT chk_approval_status_lifecycle CHECK (
    (status = 'PENDING' AND approved_by IS NULL AND decision_at IS NULL) OR
    (status IN ('APPROVED', 'REJECTED') AND approved_by IS NOT NULL AND decision_at IS NOT NULL) OR
    (status = 'CANCELLED' AND decision_at IS NOT NULL)
  ),
  CONSTRAINT chk_four_eyes_actor CHECK (approved_by IS NULL OR approved_by <> requested_by)
);

CREATE INDEX IF NOT EXISTS idx_sc_approval_target 
  ON public.app_approval_requests(target_type, target_id);

-- 11. Bảng Nhật ký kiểm toán bất biến (Audit Events — Append-Only)
CREATE TABLE IF NOT EXISTS public.app_audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid,
  action_code text NOT NULL,
  target_type text NOT NULL,
  target_id text,
  yard_id uuid REFERENCES public.app_yards(id) ON DELETE SET NULL,
  department_code text REFERENCES public.app_departments(code) ON DELETE SET NULL,
  before_data jsonb,
  after_data jsonb,
  reason text,
  request_id text,
  device_info jsonb
);

CREATE INDEX IF NOT EXISTS idx_sc_audit_event_time 
  ON public.app_audit_events(event_at DESC);

CREATE INDEX IF NOT EXISTS idx_sc_audit_scope 
  ON public.app_audit_events(yard_id, department_code, event_at DESC);

COMMIT;
