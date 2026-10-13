/**
 * RBAC Type Definitions — Sơn Cảng V5
 * Khớp với danh mục 67 permission_code và 7 active roles từ Workbook V5
 */

export type ScopeLevel = 'SELF' | 'DEPARTMENT' | 'YARD' | 'ALL';

export type DepartmentCode = 
  | 'AN_NINH'
  | 'CCKB'
  | 'DIEU_PHOI'
  | 'HE_THONG'
  | 'KE_TOAN';

export type RoleCode =
  | 'SEC_STAFF'         // Nhân viên An ninh
  | 'SEC_LEAD'          // Trưởng bộ phận An ninh
  | 'PORT_STAFF'        // Nhân viên CCKB
  | 'PORT_LEAD'         // Trưởng bộ phận CCKB
  | 'DIS_STAFF'         // Nhân viên Điều phối
  | 'DIS_LEAD'          // Trưởng bộ phận Điều phối
  | 'SYS_ADMIN'         // Quản trị hệ thống
  | 'ACCOUNTING_FUTURE'; // Kế toán (dự phòng, chưa bật V1)

export interface AppRole {
  code: RoleCode;
  display_name: string;
  department_code: DepartmentCode;
  seniority: string;
  is_active: boolean;
  release_phase: 'V1' | 'GĐ sau';
  description: string;
}

export interface AppPermission {
  code: string;
  module: string;
  display_name: string;
  source_questions: string;
  release_phase: 'V1' | 'GĐ sau';
  feature_key: string;
  risk_level: 'Thông thường' | 'Nhạy cảm' | 'Cao' | 'Tài chính';
  description: string;
  is_active: boolean;
}

export interface AppRolePermission {
  role_code: RoleCode;
  permission_code: string;
  scope: ScopeLevel;
  is_enabled: boolean;
}

export interface AppUserRoleAssignment {
  id: string;
  user_id: string;
  role_code: RoleCode;
  yard_id: string | null;
  department_code: DepartmentCode | null;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
}

export interface EffectivePermission {
  permission_code: string;
  scope: ScopeLevel;
  yard_id: string | null;
  department_code: DepartmentCode | null;
}

export interface ApprovalPolicy {
  policy_code: string;
  label: string;
  request_permission_code: string | null;
  approve_permission_code: string | null;
  enforce_distinct_actor: boolean;
  reason_required: boolean;
  is_enabled: boolean;
  notes: string;
}
