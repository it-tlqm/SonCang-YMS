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
    email: 'sec_gate_01@soncang.vn',
    roleCode: 'SEC_STAFF',
    roleName: 'Nhân viên An ninh Cổng',
    fullName: 'Trần Quốc Bảo (Bốt cổng)',
    departmentCode: 'AN_NINH',
    departmentName: 'Bộ phận An ninh & Bảo vệ',
    description: 'Trực ca cổng: Tiếp nhận xe, ghi nhận cont, thu vé vào & phí lưu bãi, xác nhận xe rời bãi',
  },
  {
    id: '20000000-0000-0000-0000-000000000021',
    email: 'sec_lead_01@soncang.vn',
    roleCode: 'SEC_LEAD',
    roleName: 'Trưởng bộ phận An ninh',
    fullName: 'Nguyễn Văn An (Trưởng ca An ninh)',
    departmentCode: 'AN_NINH',
    departmentName: 'Bộ phận An ninh & Bảo vệ',
    description: 'Giám sát ca trực an ninh, duyệt điều chỉnh giờ xe, đối soát doanh thu vé cổng ca trực',
  },
  {
    id: '20000000-0000-0000-0000-000000000030',
    email: 'port_cckb_01@soncang.vn',
    roleCode: 'PORT_STAFF',
    roleName: 'Nhân viên Thương vụ CCKB',
    fullName: 'Lê Thị Dung (Thương vụ bến bãi)',
    departmentCode: 'CCKB',
    departmentName: 'Bộ phận Thương vụ & Cảng cạn CCKB',
    description: 'Tiếp nhận yêu cầu cắm điện, quản lý phiên điện cont lạnh, thu tiền điện và duyệt clearance xuất bãi',
  },
  {
    id: '20000000-0000-0000-0000-000000000031',
    email: 'port_lead_01@soncang.vn',
    roleCode: 'PORT_LEAD',
    roleName: 'Trưởng bộ phận CCKB',
    fullName: 'Hoàng Minh Cường (Trưởng ca CCKB)',
    departmentCode: 'CCKB',
    departmentName: 'Bộ phận Thương vụ & Cảng cạn CCKB',
    description: 'Trưởng ca CCKB: Duyệt điều chỉnh giờ điện đã thu, duyệt xuất bãi ngoại lệ nợ (AP07), chốt sổ thu ca',
  },
  {
    id: '20000000-0000-0000-0000-000000000040',
    email: 'dis_yard_01@soncang.vn',
    roleCode: 'DIS_STAFF',
    roleName: 'Nhân viên Điều phối Bãi',
    fullName: 'Vũ Văn Giang (Điều phối hiện trường)',
    departmentCode: 'DIEU_PHOI',
    departmentName: 'Bộ phận Điều phối & Hiện trường',
    description: 'Hiện trường: Kiểm tra bãi, cập nhật tình trạng HÀNG / RỖNG, theo dõi vị trí cont trong bãi',
  },
  {
    id: '20000000-0000-0000-0000-000000000041',
    email: 'dis_lead_01@soncang.vn',
    roleCode: 'DIS_LEAD',
    roleName: 'Trưởng bộ phận Điều phối',
    fullName: 'Phạm Đình Hải (Trưởng ca Điều phối)',
    departmentCode: 'DIEU_PHOI',
    departmentName: 'Bộ phận Điều phối & Hiện trường',
    description: 'Giám sát mặt bằng lưu bãi, điều phối ô đỗ, duyệt điều chỉnh tình trạng container',
  },
  {
    id: '20000000-0000-0000-0000-000000000010',
    email: 'admin_01@soncang.vn',
    roleCode: 'SYS_ADMIN',
    roleName: 'Quản trị viên Hệ thống',
    fullName: 'Ban Quản trị Hệ thống TLQM',
    departmentCode: 'HE_THONG',
    departmentName: 'Ban Quản trị & Công nghệ',
    description: 'Toàn quyền cấu hình, tài khoản nhân sự, phân quyền vai trò, quản lý biểu phí và audit logs',
  },
];
