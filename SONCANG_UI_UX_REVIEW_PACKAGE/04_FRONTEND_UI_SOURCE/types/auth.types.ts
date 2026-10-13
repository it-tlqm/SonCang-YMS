export type RoleCode = 
  | 'SYS_ADMIN'
  | 'SEC_STAFF'
  | 'SEC_LEAD'
  | 'PORT_STAFF'
  | 'PORT_LEAD'
  | 'DIS_STAFF'
  | 'DIS_LEAD'
  | 'ACCOUNTING_FUTURE';

export type DepartmentCode = 'AN_NINH' | 'CCKB' | 'DIEU_PHOI' | 'HE_THONG' | 'KE_TOAN';

export type AuthMode = 'REAL' | 'DEMO';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roleCode: RoleCode | null;
  roleName: string;
  departmentCode: DepartmentCode | null;
  departmentName: string;
  yardId: string;
  yardName: string;
  permissions: string[]; // Danh sách quyền thực tế đã được resolve
  authMode: AuthMode;    // REAL: Supabase Auth thật; DEMO: Môi trường mô phỏng UI
}

export interface DemoAccount {
  id: string;
  email: string;
  roleCode: RoleCode;
  roleName: string;
  fullName: string;
  departmentCode: DepartmentCode;
  departmentName: string;
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: '20000000-0000-0000-0000-000000000020',
    email: 'anninh@soncang.vn',
    roleCode: 'SEC_STAFF',
    roleName: 'Nhân viên An ninh',
    fullName: 'Hoàng Văn An (Cổng chính)',
    departmentCode: 'AN_NINH',
    departmentName: 'Bộ phận An ninh',
    description: 'Ưu tiên Mobile-first: Tiếp nhận xe vào, ghi nhận container, in/thu vé cổng',
  },
  {
    id: '20000000-0000-0000-0000-000000000040',
    email: 'dieuphoi@soncang.vn',
    roleCode: 'DIS_STAFF',
    roleName: 'Nhân viên Điều phối',
    fullName: 'Trần Văn Phối (Hiện trường)',
    departmentCode: 'DIEU_PHOI',
    departmentName: 'Bộ phận Điều phối',
    description: 'Tablet/Desktop: Theo dõi bãi, tra cứu cont, cập nhật trạng thái HÀNG / RỖNG',
  },
  {
    id: '20000000-0000-0000-0000-000000000030',
    email: 'cckb@soncang.vn',
    roleCode: 'PORT_STAFF',
    roleName: 'Nhân viên CCKB',
    fullName: 'Lê Thị Cảng (Văn phòng)',
    departmentCode: 'CCKB',
    departmentName: 'Bộ phận Cổng cảng kho bãi (CCKB)',
    description: 'Tablet/Desktop: Quản lý yêu cầu điện, giờ cắm/rút, theo dõi lưu bãi và công nợ',
  },
  {
    id: '20000000-0000-0000-0000-000000000010',
    email: 'admin@soncang.vn',
    roleCode: 'SYS_ADMIN',
    roleName: 'Quản trị hệ thống',
    fullName: 'Phạm Minh Trị (Kỹ thuật)',
    departmentCode: 'HE_THONG',
    departmentName: 'Quản trị hệ thống',
    description: 'Toàn quyền cấu hình, tài khoản, danh mục xe, đối soát audit logs',
  },
];
