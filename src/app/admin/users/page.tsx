'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { RoleCode, DepartmentCode } from '@/types/auth.types';
import { StaffUser, AppRole, AppRolePermission } from '@/types/domain.types';
import { ROLE_PERMISSIONS_V5 } from '@/lib/rbac-rules';
import { 
  Users, 
  ShieldCheck, 
  ShieldAlert, 
  ArrowLeft, 
  CheckCircle2, 
  Search, 
  Key,
  Building2, 
  Lock, 
  Layers, 
  Settings, 
  UserCheck, 
  Filter, 
  Check, 
  Plus, 
  Pencil, 
  Trash2, 
  Phone, 
  Mail, 
  AlertCircle, 
  Loader2, 
  Save, 
  Power,
  UserPlus,
  Table as TableIcon,
  LayoutGrid,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
  KeyRound,
  X,
  Database,
  Info
} from 'lucide-react';

interface PermissionDefinition {
  code: string;
  module: string;
  action: string;
  risk: 'Thông thường' | 'Nhạy cảm' | 'Cao' | 'Tài chính';
  phase: 'V1' | 'GĐ sau';
  description?: string;
}

// 67 Action Permissions chuẩn V5 từ Migration 002 (20261011000002_seed_rbac_v5.sql)
const FULL_PERMISSIONS_V5: PermissionDefinition[] = [
  // 1. CỔNG XE (5)
  { code: 'vehicle.visit.read', module: 'Cổng xe', action: 'Xem lượt xe trong bãi', risk: 'Thông thường', phase: 'V1' },
  { code: 'vehicle.visit.create', module: 'Cổng xe', action: 'Tạo lượt xe & giờ vào bãi', risk: 'Thông thường', phase: 'V1' },
  { code: 'vehicle.visit.update_basic', module: 'Cổng xe', action: 'Sửa thông tin cơ bản xe (biển số/loại xe)', risk: 'Nhạy cảm', phase: 'V1' },
  { code: 'vehicle.visit.time_correction.request', module: 'Cổng xe', action: 'Yêu cầu sửa giờ vào sau khi phát sinh tiền', risk: 'Nhạy cảm', phase: 'V1' },
  { code: 'vehicle.visit.time_correction.approve', module: 'Cổng xe', action: 'Duyệt sửa giờ vào sau khi phát sinh tiền (AP01)', risk: 'Cao', phase: 'V1' },

  // 2. VÉ VÀO (3)
  { code: 'ticket.payment.collect', module: 'Vé vào', action: 'Ghi nhận thu tiền vé xe vào', risk: 'Tài chính', phase: 'V1' },
  { code: 'ticket.lost_fee.collect', module: 'Vé vào', action: 'Ghi nhận và thu phạt mất vé (250.000đ)', risk: 'Tài chính', phase: 'V1' },
  { code: 'ticket.paper_number.adjust', module: 'Vé vào', action: 'Chỉnh số seri vé giấy / in vé tự động', risk: 'Thông thường', phase: 'GĐ sau' },

  // 3. CONTAINER (8)
  { code: 'container.visit.read', module: 'Container', action: 'Xem lượt container trong bãi', risk: 'Thông thường', phase: 'V1' },
  { code: 'container.visit.create', module: 'Container', action: 'Tạo lượt container vào và giờ vào', risk: 'Thông thường', phase: 'V1' },
  { code: 'container.number.correct', module: 'Container', action: 'Sửa số container trên cùng ID lượt (Lưu vết)', risk: 'Cao', phase: 'V1' },
  { code: 'container.number.discrepancy.view', module: 'Container', action: 'Xem cảnh báo sai số container', risk: 'Thông thường', phase: 'V1' },
  { code: 'container.number.discrepancy.sec_ack', module: 'Container', action: 'An ninh xác nhận đã báo CCKB về sai lệch số', risk: 'Thông thường', phase: 'V1' },
  { code: 'container.number.discrepancy.port_reconcile', module: 'Container', action: 'CCKB đối chiếu sai số và đóng cảnh báo', risk: 'Nhạy cảm', phase: 'V1' },
  { code: 'container.number.evidence.attach', module: 'Container', action: 'Đính kèm ảnh/video xác minh số container', risk: 'Thông thường', phase: 'V1' },
  { code: 'container.visit.link_request', module: 'Container', action: 'Ghép yêu cầu cắm điện dự kiến vào cont thực tế', risk: 'Nhạy cảm', phase: 'V1' },
  { code: 'container.handling.record', module: 'Container', action: 'Ghi nhận hạ/xếp vỏ, vị trí dãy/ô', risk: 'Thông thường', phase: 'GĐ sau' },

  // 4. ĐIỀU PHỐI BÃI (4)
  { code: 'container.cargo.read', module: 'Điều phối', action: 'Xem trạng thái HÀNG / RỖNG', risk: 'Thông thường', phase: 'V1' },
  { code: 'container.cargo.update', module: 'Điều phối', action: 'Cập nhật HÀNG / RỖNG khi cont còn trong bãi', risk: 'Thông thường', phase: 'V1' },
  { code: 'container.cargo.post_exit.request', module: 'Điều phối', action: 'Đề nghị sửa HÀNG / RỖNG sau khi container đã ra bãi', risk: 'Nhạy cảm', phase: 'V1' },
  { code: 'container.cargo.post_exit.approve', module: 'Điều phối', action: 'Duyệt sửa HÀNG / RỖNG sau khi cont đã ra bãi', risk: 'Cao', phase: 'V1' },

  // 5. ĐIỆN DỰ KIẾN (6)
  { code: 'reefer.request.read', module: 'Điện dự kiến', action: 'Xem yêu cầu điện dự kiến / đang xử lý', risk: 'Thông thường', phase: 'V1' },
  { code: 'reefer.request.create', module: 'Điện dự kiến', action: 'Tạo phiếu yêu cầu cắm/rút điện (kể cả cont chưa vào)', risk: 'Thông thường', phase: 'V1' },
  { code: 'reefer.request.update', module: 'Điện dự kiến', action: 'Sửa thông tin phiếu yêu cầu điện dự kiến', risk: 'Thông thường', phase: 'V1' },
  { code: 'reefer.request.cancel', module: 'Điện dự kiến', action: 'Hủy phiếu yêu cầu điện chưa thực hiện', risk: 'Nhạy cảm', phase: 'V1' },
  { code: 'reefer.request.alert.view', module: 'Điện dự kiến', action: 'Xem cảnh báo yêu cầu điện khi xe vào cổng', risk: 'Thông thường', phase: 'V1' },
  { code: 'reefer.request.match_confirm', module: 'Điện dự kiến', action: 'Xác nhận ghép phiếu dự kiến với cont thực vào bãi', risk: 'Nhạy cảm', phase: 'V1' },

  // 6. CẮM ĐIỆN CONTAINER (8)
  { code: 'reefer.field_work.note', module: 'Cắm điện', action: 'Ghi nhận thông tin An ninh báo cắm/rút hiện trường', risk: 'Thông thường', phase: 'V1' },
  { code: 'reefer.session.read', module: 'Cắm điện', action: 'Xem danh sách phiên cắm điện & trạng thái', risk: 'Thông thường', phase: 'V1' },
  { code: 'reefer.session.actual_start.record', module: 'Cắm điện', action: 'CCKB nhập giờ cắm thực tế (khớp Zalo)', risk: 'Thông thường', phase: 'V1' },
  { code: 'reefer.session.actual_end.record', module: 'Cắm điện', action: 'CCKB nhập giờ rút thực tế (khớp Zalo)', risk: 'Thông thường', phase: 'V1' },
  { code: 'reefer.session.time.edit_unpaid', module: 'Cắm điện', action: 'CCKB sửa giờ cắm/rút trước khi thu tiền', risk: 'Nhạy cảm', phase: 'V1' },
  { code: 'reefer.session.billable.override_unpaid', module: 'Cắm điện', action: 'Chỉnh thời lượng tính tiền trước khi thu (Làm tròn 5k)', risk: 'Tài chính', phase: 'V1' },
  { code: 'reefer.session.amendment.request', module: 'Cắm điện', action: 'Đề nghị điều chỉnh giờ/tiền sau khi đã thu', risk: 'Tài chính', phase: 'V1' },
  { code: 'reefer.session.amendment.approve', module: 'Cắm điện', action: 'Duyệt chênh lệch sau thu điện (AP04)', risk: 'Cao', phase: 'V1' },

  // 7. THANH TOÁN & THU PHÍ (11)
  { code: 'reefer.payment.collect', module: 'Thanh toán', action: 'Thu tiền điện từng phiên hoặc tổng hợp', risk: 'Tài chính', phase: 'V1' },
  { code: 'reefer.payment.partial_collect', module: 'Thanh toán', action: 'Thu một phần phí điện container', risk: 'Tài chính', phase: 'V1' },
  { code: 'storage.payment.collect', module: 'Thanh toán', action: 'An ninh tính/thu phí lưu bãi container tại cổng ra', risk: 'Tài chính', phase: 'V1' },
  { code: 'payment.bank_evidence.attach', module: 'Thanh toán', action: 'Đính kèm ảnh chứng từ chuyển khoản ngân hàng', risk: 'Thông thường', phase: 'V1' },
  { code: 'payment.bank.reconcile', module: 'Thanh toán', action: 'Đối soát chuyển khoản theo bộ phận trực', risk: 'Tài chính', phase: 'V1' },
  { code: 'payment.post_correction.request', module: 'Thanh toán', action: 'Yêu cầu xử lý chênh lệch khi sửa mã cont đã thu', risk: 'Tài chính', phase: 'V1' },
  { code: 'payment.post_correction.approve', module: 'Thanh toán', action: 'Duyệt chênh lệch tiền do sửa số container', risk: 'Cao', phase: 'V1' },
  { code: 'charge.adjust.request', module: 'Thanh toán', action: 'Gửi đề nghị miễn/giảm/điều chỉnh tiền', risk: 'Tài chính', phase: 'GĐ sau' },
  { code: 'charge.adjust.approve', module: 'Thanh toán', action: 'Duyệt miễn/giảm/điều chỉnh tiền', risk: 'Cao', phase: 'GĐ sau' },
  { code: 'payment.refund.request', module: 'Thanh toán', action: 'Đề nghị hoàn tiền cho khách', risk: 'Tài chính', phase: 'GĐ sau' },
  { code: 'payment.refund.approve', module: 'Thanh toán', action: 'Duyệt hoàn tiền / hủy bút toán', risk: 'Cao', phase: 'GĐ sau' },

  // 8. CỔNG RA (8)
  { code: 'vehicle.visit.exit_confirm', module: 'Cổng ra', action: 'Xác nhận lượt xe thực tế ra qua cổng', risk: 'Cao', phase: 'V1' },
  { code: 'exit.clearance.read', module: 'Cổng ra', action: 'Xem tình trạng tài chính & điều kiện cho ra', risk: 'Thông thường', phase: 'V1' },
  { code: 'exit.clearance.issue', module: 'Cổng ra', action: 'CCKB xác nhận điều kiện tài chính xuất bãi (Clearance)', risk: 'Cao', phase: 'V1' },
  { code: 'exit.clearance.debt_exception', module: 'Cổng ra', action: 'CCKB xác nhận cho ra còn nợ cước (Bảo lãnh nợ - AP07)', risk: 'Cao', phase: 'V1' },
  { code: 'exit.clearance.revoke.request', module: 'Cổng ra', action: 'Đề nghị thu hồi chấp thuận xuất trước khi xe ra', risk: 'Nhạy cảm', phase: 'V1' },
  { code: 'exit.clearance.revoke.approve', module: 'Cổng ra', action: 'Thu hồi chấp thuận cho ra trước khi thực xuất', risk: 'Cao', phase: 'V1' },
  { code: 'exit.actual.confirm', module: 'Cổng ra', action: 'An ninh xác nhận cont/xe rời bãi thực tế', risk: 'Cao', phase: 'V1' },
  { code: 'exit.reefer_state.exception', module: 'Cổng ra', action: 'CCKB ghi ngoại lệ trạng thái điện chưa cập nhật', risk: 'Cao', phase: 'V1' },

  // 9. BÁO CÁO, GIÁM SÁT & QUẢN TRỊ (14)
  { code: 'report.revenue.read', module: 'Báo cáo', action: 'Xem doanh thu và khoản thu theo phạm vi', risk: 'Tài chính', phase: 'V1' },
  { code: 'report.revenue.export', module: 'Báo cáo', action: 'Xuất báo cáo doanh thu theo bộ phận', risk: 'Tài chính', phase: 'V1' },
  { code: 'audit.read', module: 'Giám sát', action: 'Xem lịch sử thao tác & nhật ký kiểm toán ca trực', risk: 'Thông thường', phase: 'V1' },
  { code: 'audit.export_all', module: 'Giám sát', action: 'Xuất nhật ký kiểm toán toàn hệ thống', risk: 'Cao', phase: 'V1' },
  { code: 'tariff.read', module: 'Bảng giá', action: 'Xem biểu giá dịch vụ bến bãi theo hiệu lực', risk: 'Thông thường', phase: 'V1' },
  { code: 'tariff.change.request', module: 'Bảng giá', action: 'Gửi đề nghị thay đổi bảng giá', risk: 'Tài chính', phase: 'V1' },
  { code: 'tariff.change.publish', module: 'Bảng giá', action: 'Ban hành mức giá và ngày hiệu lực biểu phí', risk: 'Cao', phase: 'V1' },
  { code: 'admin.users.manage', module: 'Quản trị', action: 'Tạo/khóa người dùng và gán vai trò theo phạm vi', risk: 'Cao', phase: 'V1' },
  { code: 'admin.roles.manage', module: 'Quản trị', action: 'Thêm/sửa tên vai trò và thành phần vai trò', risk: 'Cao', phase: 'V1' },
  { code: 'admin.role_permissions.manage', module: 'Quản trị', action: 'Cấp/thu hồi quyền của vai trò', risk: 'Cao', phase: 'V1' },
  { code: 'admin.billing_settings.manage', module: 'Quản trị', action: 'Quản lý tham số tính phí và chức năng mở rộng', risk: 'Cao', phase: 'V1' },
  { code: 'admin.legacy_correct', module: 'Quản trị', action: 'Sửa dữ liệu nhập lịch sử AppSheet có audit', risk: 'Cao', phase: 'V1' },
  { code: 'accounting.invoice.prepare', module: 'Hóa đơn', action: 'Nhập dữ liệu hóa đơn từ bộ phận Kế toán', risk: 'Nhạy cảm', phase: 'GĐ sau' },
];

// Danh mục vai trò V1 chuẩn V5
const ROLES_V5_METADATA = [
  {
    code: 'SEC_STAFF' as RoleCode,
    name: 'Nhân viên An ninh Cổng',
    deptCode: 'AN_NINH' as DepartmentCode,
    deptName: 'Bộ phận An ninh & Bảo vệ',
    description: 'Tiếp nhận xe, kiểm tra container, thu tiền vé cổng, thu phí lưu bãi, xác nhận xe rời bãi.',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    avatarBg: 'bg-emerald-600',
  },
  {
    code: 'SEC_LEAD' as RoleCode,
    name: 'Trưởng bộ phận An ninh',
    deptCode: 'AN_NINH' as DepartmentCode,
    deptName: 'Bộ phận An ninh & Bảo vệ',
    description: 'Giám sát ca trực an ninh, duyệt điều chỉnh giờ xe, đối soát doanh thu vé cổng và phí lưu.',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    avatarBg: 'bg-emerald-700',
  },
  {
    code: 'PORT_STAFF' as RoleCode,
    name: 'Nhân viên Thương vụ CCKB',
    deptCode: 'CCKB' as DepartmentCode,
    deptName: 'Bộ phận Thương vụ & Cảng cạn CCKB',
    description: 'Tiếp nhận yêu cầu cắm điện trước, ghi nhận giờ cắm/rút điện, thu tiền điện, duyệt điều kiện xuất bãi.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    avatarBg: 'bg-amber-600',
  },
  {
    code: 'PORT_LEAD' as RoleCode,
    name: 'Trưởng bộ phận CCKB',
    deptCode: 'CCKB' as DepartmentCode,
    deptName: 'Bộ phận Thương vụ & Cảng cạn CCKB',
    description: 'Duyệt điều chỉnh giờ điện đã thu, duyệt xuất bãi ngoại lệ nợ (AP07), chốt doanh thu điện cont.',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    avatarBg: 'bg-amber-700',
  },
  {
    code: 'DIS_STAFF' as RoleCode,
    name: 'Nhân viên Điều phối Bãi',
    deptCode: 'DIEU_PHOI' as DepartmentCode,
    deptName: 'Bộ phận Điều phối & Hiện trường',
    description: 'Kiểm tra bãi, cập nhật tình trạng HÀNG hoặc RỖNG của container, theo dõi phương tiện trong bãi.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    avatarBg: 'bg-blue-600',
  },
  {
    code: 'DIS_LEAD' as RoleCode,
    name: 'Trưởng bộ phận Điều phối',
    deptCode: 'DIEU_PHOI' as DepartmentCode,
    deptName: 'Bộ phận Điều phối & Hiện trường',
    description: 'Giám sát mặt bằng lưu bãi, duyệt điều chỉnh tình trạng container sau khi đã xuất bãi.',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    avatarBg: 'bg-blue-700',
  },
  {
    code: 'SYS_ADMIN' as RoleCode,
    name: 'Quản trị viên Hệ thống',
    deptCode: 'HE_THONG' as DepartmentCode,
    deptName: 'Ban Quản trị & Công nghệ',
    description: 'Quản trị biểu phí, cấu hình tham số, phân quyền vai trò, quản lý người dùng và audit logs.',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    avatarBg: 'bg-purple-700',
  },
];

export default function UsersAndRbacAdminPage() {
  const { user, role, can, repository } = useAuth();

  // Kiểm tra quyền quản trị RBAC
  const isAllowed = can('admin.roles.manage') || role === 'SYS_ADMIN';

  const [activeTab, setActiveTab] = useState<'USERS' | 'MATRIX'>('USERS');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARD'>('TABLE');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | 'ACTIVE' | 'LOCKED'>('ALL');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('ALL');

  // Danh sách Nhân sự Động từ Supabase Database
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Danh sách Vai trò & Quyền Động từ Database
  const [rolesList, setRolesList] = useState<AppRole[]>([]);
  const [rolePermissionsList, setRolePermissionsList] = useState<AppRolePermission[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState<boolean>(false);

  // Modal Tạo / Sửa Nhân sự
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);

  // Modal Tạo Vai trò Mới
  const [showCreateRoleModal, setShowCreateRoleModal] = useState<boolean>(false);
  const [newRoleCode, setNewRoleCode] = useState<string>('');
  const [newRoleName, setNewRoleName] = useState<string>('');
  const [newRoleDeptCode, setNewRoleDeptCode] = useState<DepartmentCode>('AN_NINH');
  const [newRoleDescription, setNewRoleDescription] = useState<string>('');
  const [isSubmittingRole, setIsSubmittingRole] = useState<boolean>(false);
  const [createRoleError, setCreateRoleError] = useState<string>('');

  // Modal Xem Quyền Nhân sự
  const [viewPermsStaff, setViewPermsStaff] = useState<StaffUser | null>(null);

  // Modal Đặt lại Mật khẩu Nhân sự
  const [resetPwdStaff, setResetPwdStaff] = useState<StaffUser | null>(null);
  const [newStaffPassword, setNewStaffPassword] = useState<string>('');
  const [showNewStaffPassword, setShowNewStaffPassword] = useState<boolean>(false);
  const [resetReason, setResetReason] = useState<string>('Admin cấp lại mật khẩu cho nhân viên trực ca');
  const [mustChangePwd, setMustChangePwd] = useState<boolean>(true);
  const [isSubmittingResetPwd, setIsSubmittingResetPwd] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [resetPwdError, setResetPwdError] = useState<string>('');

  // Form Fields Nhân sự
  const [formFullName, setFormFullName] = useState<string>('');
  const [formEmail, setFormEmail] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formRoleCode, setFormRoleCode] = useState<RoleCode>('SEC_STAFF');
  const [formDepartmentCode, setFormDepartmentCode] = useState<DepartmentCode>('AN_NINH');
  const [formYardName, setFormYardName] = useState<string>('Bãi Sơn Cảng');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formNotes, setFormNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');

  // Tải danh sách nhân sự từ Supabase Cloud
  const loadStaffUsers = async () => {
    try {
      setIsLoadingStaff(true);
      const list = await repository.getStaffUsers();
      setStaffUsers(list);
    } catch (err) {
      console.error('Lỗi tải danh sách nhân sự:', err);
    } finally {
      setIsLoadingStaff(false);
      setIsRefreshing(false);
    }
  };

  // Tải danh mục vai trò & ma trận phân quyền từ DB
  const loadRolesAndPermissions = async () => {
    try {
      setIsLoadingRoles(true);
      const [roles, perms] = await Promise.all([
        repository.getRoles(),
        repository.getRolePermissions()
      ]);
      setRolesList(roles);
      setRolePermissionsList(perms);
    } catch (err) {
      console.error('Lỗi tải danh mục vai trò:', err);
    } finally {
      setIsLoadingRoles(false);
    }
  };

  useEffect(() => {
    if (isAllowed) {
      loadStaffUsers();
      loadRolesAndPermissions();
    }
  }, [isAllowed, repository]);

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    await Promise.all([loadStaffUsers(), loadRolesAndPermissions()]);
    setSuccessMsg('✓ Đã đồng bộ dữ liệu mới nhất từ Supabase Cloud (app_staff_users)');
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  // Tự động gán bộ phận chuẩn khi đổi vai trò trên form
  const handleRoleChange = (newRole: RoleCode) => {
    setFormRoleCode(newRole);
    const meta = ROLES_V5_METADATA.find(r => r.code === newRole);
    if (meta) {
      setFormDepartmentCode(meta.deptCode);
      if (newRole === 'SYS_ADMIN') {
        setFormYardName('Toàn hệ thống');
      } else {
        setFormYardName('Bãi Sơn Cảng');
      }
    }
  };

  // Mở modal tạo mới nhân sự
  const handleOpenCreateModal = () => {
    setModalMode('CREATE');
    setSelectedStaff(null);
    setFormFullName('');
    setFormEmail('');
    setFormPhone('');
    setFormRoleCode('SEC_STAFF');
    setFormDepartmentCode('AN_NINH');
    setFormYardName('Bãi Sơn Cảng');
    setFormIsActive(true);
    setFormNotes('');
    setModalError('');
    setShowModal(true);
  };

  // Mở modal chỉnh sửa nhân sự
  const handleOpenEditModal = (staff: StaffUser) => {
    setModalMode('EDIT');
    setSelectedStaff(staff);
    setFormFullName(staff.full_name);
    setFormEmail(staff.email);
    setFormPhone(staff.phone || '');
    setFormRoleCode(staff.role_code);
    setFormDepartmentCode(staff.department_code);
    setFormYardName(staff.yard_name || (staff.role_code === 'SYS_ADMIN' ? 'Toàn hệ thống' : 'Bãi Sơn Cảng'));
    setFormIsActive(staff.is_active);
    setFormNotes(staff.notes || '');
    setModalError('');
    setShowModal(true);
  };

  // Lưu thông tin nhân sự (Tạo mới hoặc Sửa)
  const handleSubmitStaffForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formFullName.trim();
    const cleanEmail = formEmail.trim().toLowerCase();

    if (!cleanName) {
      setModalError('Họ và tên nhân viên không được để trống.');
      return;
    }
    if (!cleanEmail) {
      setModalError('Email công vụ không được để trống.');
      return;
    }

    try {
      setIsSubmitting(true);
      setModalError('');

      const roleMeta = ROLES_V5_METADATA.find(r => r.code === formRoleCode);

      if (modalMode === 'CREATE') {
        const res = await repository.createStaffUser({
          full_name: cleanName,
          email: cleanEmail,
          phone: formPhone.trim() || undefined,
          role_code: formRoleCode,
          role_name: roleMeta?.name,
          department_code: formDepartmentCode,
          department_name: roleMeta?.deptName,
          yard_id: undefined, // Để cơ sở dữ liệu Supabase tự động gán ID bãi thực tế (app_yards)
          yard_name: formYardName,
          is_active: formIsActive,
          notes: formNotes.trim() || undefined,
        });

        if (!res.success || !res.user) {
          setModalError(res.error || 'Lỗi tạo nhân viên mới.');
          return;
        }

        setSuccessMsg(`✓ Đã lưu thành công nhân viên "${res.user.full_name}" vào cơ sở dữ liệu Supabase.`);
      } else if (selectedStaff) {
        const res = await repository.updateStaffUser({
          id: selectedStaff.id,
          full_name: cleanName,
          email: cleanEmail,
          phone: formPhone.trim() || undefined,
          role_code: formRoleCode,
          role_name: roleMeta?.name,
          department_code: formDepartmentCode,
          department_name: roleMeta?.deptName,
          yard_id: undefined,
          yard_name: formYardName,
          is_active: formIsActive,
          notes: formNotes.trim() || undefined,
        });

        if (!res.success || !res.user) {
          setModalError(res.error || 'Lỗi cập nhật nhân viên.');
          return;
        }

        setSuccessMsg(`✓ Đã cập nhật thành công nhân sự "${res.user.full_name}" trên cơ sở dữ liệu Supabase.`);
      }

      setShowModal(false);
      await loadStaffUsers();
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err: any) {
      setModalError('Lỗi thao tác: ' + (err?.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Khóa / Mở khóa tài khoản
  const handleToggleStatus = async (staff: StaffUser) => {
    const nextStatus = !staff.is_active;
    try {
      const res = await repository.toggleStaffUserStatus(staff.id, nextStatus);
      if (res.success) {
        setSuccessMsg(`✓ Đã ${nextStatus ? 'kích hoạt lại' : 'tạm khóa'} tài khoản "${staff.full_name}" trên Supabase.`);
        await loadStaffUsers();
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (err) {
      console.error('Lỗi đổi trạng thái:', err);
    }
  };

  // Xóa nhân sự
  const handleDeleteStaff = async (staff: StaffUser) => {
    if (!confirm(`XÁC NHẬN: Bạn có chắc chắn muốn xóa nhân viên "${staff.full_name}" (${staff.email}) khỏi cơ sở dữ liệu?`)) {
      return;
    }

    try {
      const res = await repository.deleteStaffUser(staff.id);
      if (res.success) {
        setSuccessMsg(`✓ Đã xóa vĩnh viễn nhân sự "${staff.full_name}" khỏi cơ sở dữ liệu Supabase.`);
        await loadStaffUsers();
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        alert(res.error || 'Không thể xóa nhân viên.');
      }
    } catch (err: any) {
      alert('Lỗi xóa nhân viên: ' + (err?.message || String(err)));
    }
  };

  // Tạo Vai trò Mới
  const handleCreateRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newRoleCode.trim().toUpperCase();
    const cleanName = newRoleName.trim();
    if (!cleanCode) {
      setCreateRoleError('Mã vai trò không được để trống.');
      return;
    }
    if (!cleanName) {
      setCreateRoleError('Tên vai trò không được để trống.');
      return;
    }

    try {
      setIsSubmittingRole(true);
      setCreateRoleError('');
      const res = await repository.createRole({
        code: cleanCode,
        name: cleanName,
        department_code: newRoleDeptCode,
        description: newRoleDescription.trim()
      });

      if (!res.success) {
        setCreateRoleError(res.error || 'Lỗi khi tạo vai trò mới');
        return;
      }

      setSuccessMsg(`✓ Đã tạo thành công vai trò mới "${cleanName}" (${cleanCode}) vào bảng app_roles.`);
      setShowCreateRoleModal(false);
      setNewRoleCode('');
      setNewRoleName('');
      setNewRoleDescription('');
      await loadRolesAndPermissions();
      setTimeout(() => setSuccessMsg(''), 4500);
    } catch (err: any) {
      setCreateRoleError(err?.message || 'Lỗi ngoại lệ khi tạo vai trò');
    } finally {
      setIsSubmittingRole(false);
    }
  };

  // Bật / Tắt trực tiếp quyền cho vai trò (Interactive Matrix)
  const handleTogglePermission = async (roleCode: string, permissionCode: string, currentEnabled: boolean) => {
    const nextEnabled = !currentEnabled;
    try {
      // Cập nhật UI optimistic
      setRolePermissionsList(prev => {
        if (nextEnabled) {
          return [...prev, { role_code: roleCode, permission_code: permissionCode, scope: 'ALL', is_enabled: true }];
        } else {
          return prev.filter(p => !(p.role_code === roleCode && p.permission_code === permissionCode));
        }
      });

      const res = await repository.toggleRolePermission(roleCode, permissionCode, nextEnabled, 'ALL');
      if (res.success) {
        setSuccessMsg(`✓ Đã ${nextEnabled ? 'cấp quyền' : 'thu hồi quyền'} [${permissionCode}] cho vai trò [${roleCode}] trên Supabase.`);
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        // Rollback nếu lỗi
        await loadRolesAndPermissions();
        alert(res.error || 'Lỗi khi cập nhật quyền');
      }
    } catch (err) {
      await loadRolesAndPermissions();
      console.error('Lỗi toggle quyền:', err);
    }
  };

  // Sinh mật khẩu ngẫu nhiên an toàn cho nhân sự
  const handleGenerateRandomPassword = () => {
    const prefixes = ['SonCang', 'TaLung', 'Yms', 'CangCan'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const specialChars = ['@', '#', '$', '!'];
    const special = specialChars[Math.floor(Math.random() * specialChars.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const pwd = `${prefix}${special}${randomNum}`;
    setNewStaffPassword(pwd);
    setIsCopied(false);
  };

  // Sao chép mật khẩu vào bộ nhớ tạm
  const handleCopyPassword = () => {
    if (!newStaffPassword) return;
    navigator.clipboard.writeText(newStaffPassword);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Mở modal đặt lại mật khẩu nhân viên
  const handleOpenResetPasswordModal = (staff: StaffUser) => {
    setResetPwdStaff(staff);
    setResetPwdError('');
    setIsCopied(false);
    setResetReason('Admin cấp lại mật khẩu cho nhân viên trực ca');
    setMustChangePwd(true);
    handleGenerateRandomPassword();
  };

  // Xác nhận đặt lại mật khẩu nhân viên
  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwdStaff || !newStaffPassword) return;
    if (newStaffPassword.length < 6) {
      setResetPwdError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    setIsSubmittingResetPwd(true);
    setResetPwdError('');
    try {
      const res = await repository.adminResetStaffPassword({
        staffId: resetPwdStaff.id,
        newPassword: newStaffPassword,
        reason: resetReason,
        mustChangePassword: mustChangePwd,
      });

      if (res.success) {
        setSuccessMsg(`✓ Đã đặt lại mật khẩu cho [${resetPwdStaff.full_name}] thành công! Mật khẩu mới: ${newStaffPassword}`);
        await loadStaffUsers();
        setResetPwdStaff(null);
        setNewStaffPassword('');
        setTimeout(() => setSuccessMsg(''), 5000);
      } else {
        setResetPwdError(res.error || 'Lỗi khi đặt lại mật khẩu');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setResetPwdError(msg);
    } finally {
      setIsSubmittingResetPwd(false);
    }
  };

  if (!isAllowed) {
    return (
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 text-center max-w-lg mx-auto shadow-xs mt-10">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Khu vực Quản trị Người dùng & Phân quyền</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Tài khoản <strong>{user?.fullName || user?.roleName}</strong> không có quyền quản trị phân quyền (<code>admin.roles.manage</code>). Chức năng này chỉ dành cho Quản trị viên hệ thống (<code>SYS_ADMIN</code>).
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5a] rounded-xl transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Về trang Tổng quan</span>
        </Link>
      </div>
    );
  }

  // Danh sách các Module phân quyền
  const modulesList = Array.from(new Set(FULL_PERMISSIONS_V5.map(p => p.module)));

  // Lọc danh sách nhân viên
  const filteredAccounts = staffUsers.filter((acc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      acc.full_name.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      (acc.role_name && acc.role_name.toLowerCase().includes(q)) ||
      (acc.phone && acc.phone.includes(q));
    const matchesRole = selectedRoleFilter === 'ALL' || acc.role_code === selectedRoleFilter;
    const matchesStatus = 
      selectedStatusFilter === 'ALL' ? true :
      selectedStatusFilter === 'ACTIVE' ? acc.is_active : !acc.is_active;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Lọc ma trận quyền theo Module & Từ khóa tìm kiếm
  const filteredPermissions = FULL_PERMISSIONS_V5.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      p.action.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q) ||
      p.module.toLowerCase().includes(q);
    const matchesModule = selectedModuleFilter === 'ALL' || p.module === selectedModuleFilter;
    return matchesSearch && matchesModule;
  });

  // Thống kê nhân sự
  const totalStaffCount = staffUsers.length;
  const activeStaffCount = staffUsers.filter(s => s.is_active).length;
  const secCount = staffUsers.filter(s => s.role_code.startsWith('SEC_')).length;
  const portCount = staffUsers.filter(s => s.role_code.startsWith('PORT_')).length;
  const disCount = staffUsers.filter(s => s.role_code.startsWith('DIS_')).length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-12">
      {/* HEADER QUẢN TRỊ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-black text-[#223873] tracking-tight">
              Quản trị Nhân sự & Phân quyền RBAC V5
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              <Database className="w-3 h-3 text-emerald-600" />
              <span>Dữ liệu thật Supabase</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý nhân viên trực ca bến bãi, cấu hình vai trò động và kiểm soát 67 quyền thực thi chuẩn V5
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleRefreshData}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors cursor-pointer"
            title="Đồng bộ lại danh sách nhân sự từ cơ sở dữ liệu Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <Link
            href="/admin/customers"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-300 transition-colors"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>Quản lý Khách hàng</span>
          </Link>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-xl shadow-2xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Thêm mới Nhân viên</span>
          </button>
        </div>
      </div>

      {/* THÔNG BÁO THÀNH CÔNG */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg('')}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* THẺ THỐNG KÊ NHÂN SỰ */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Tổng số tài khoản</span>
          <span className="text-xl font-black text-slate-800">{totalStaffCount}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Đang hoạt động</span>
          <span className="text-xl font-black text-emerald-600">{activeStaffCount}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">An ninh Cổng</span>
          <span className="text-xl font-black text-emerald-700">{secCount}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] text-slate-500 block">Thương vụ CCKB</span>
          <span className="text-xl font-black text-amber-600">{portCount}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs col-span-2 sm:col-span-1">
          <span className="text-[11px] text-slate-500 block">Điều phối Bãi</span>
          <span className="text-xl font-black text-blue-600">{disCount}</span>
        </div>
      </div>

      {/* TABS ĐIỀU HƯỚNG */}
      <div className="flex border-b border-slate-200 bg-white px-3 pt-2 rounded-t-2xl shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab('USERS')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'USERS'
              ? 'border-[#223873] text-[#223873]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4 text-[#223873]" />
          <span>Danh sách Nhân sự ({staffUsers.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('MATRIX')}
          className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === 'MATRIX'
              ? 'border-[#223873] text-[#223873]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Key className="w-4 h-4 text-[#0A9444]" />
          <span>Quản lý Vai trò & Ma trận Phân quyền ({rolesList.length || 7} Vai trò / 67 Quyền)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DANH SÁCH NHÂN SỰ & VAI TRÒ (HỖ TRỢ DẠNG TABLE & DẠNG CARD)         */}
      {/* ========================================================================= */}
      {activeTab === 'USERS' && (
        <div className="space-y-3">
          {/* THANH TÌM KIẾM, BỘ LỌC VÀ CHUYỂN ĐỔI GIAO DIỆN */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm tên nhân viên, email, vai trò, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#223873] bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 flex-wrap justify-end">
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none"
              >
                <option value="ALL">Tất cả vai trò ({staffUsers.length})</option>
                {ROLES_V5_METADATA.map((r) => (
                  <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                ))}
              </select>

              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ACTIVE">🟢 Đang hoạt động</option>
                <option value="LOCKED">🔴 Đã tạm khóa</option>
              </select>

              {/* NÚT CHUYỂN ĐỔI CHẾ ĐỘ HIỂN THỊ (TABLE / CARD) */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('TABLE')}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'TABLE'
                      ? 'bg-white text-[#223873] shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Xem danh sách nhân sự dạng Bảng (Table)"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dạng Bảng</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('CARD')}
                  className={`px-2.5 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1 transition-all cursor-pointer ${
                    viewMode === 'CARD'
                      ? 'bg-white text-[#223873] shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Xem danh sách nhân sự dạng Thẻ (Cards)"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Dạng Thẻ</span>
                </button>
              </div>
            </div>
          </div>

          {/* NỘI DUNG DANH SÁCH NHÂN SỰ */}
          {isLoadingStaff ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#223873]" />
              <span>Đang kết nối cơ sở dữ liệu Supabase tải danh sách nhân sự...</span>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
              Không tìm thấy nhân viên nào phù hợp với bộ lọc tìm kiếm.
            </div>
          ) : viewMode === 'TABLE' ? (
            /* =============================================================== */
            /* DẠNG BẢNG (TABLE VIEW) — CHUẨN MỰC NGHIỆP VỤ BẾN BÃI            */
            /* =============================================================== */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-3.5 text-center w-12">#</th>
                      <th className="py-3 px-3 min-w-[200px]">Nhân viên trực ca</th>
                      <th className="py-3 px-3 min-w-[180px]">Thông tin liên hệ</th>
                      <th className="py-3 px-3 min-w-[180px]">Vai trò & Bộ phận</th>
                      <th className="py-3 px-3 min-w-[120px]">Địa bàn trực</th>
                      <th className="py-3 px-3 text-center min-w-[120px]">Quyền thực thi</th>
                      <th className="py-3 px-3 text-center min-w-[110px]">Trạng thái</th>
                      <th className="py-3 px-3 min-w-[160px]">Ghi chú nhiệm vụ</th>
                      <th className="py-3 px-3 text-right min-w-[110px]">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAccounts.map((acc, index) => {
                      const roleMeta = ROLES_V5_METADATA.find((r) => r.code === acc.role_code);
                      const grantedCount = ROLE_PERMISSIONS_V5[acc.role_code]?.length || 0;
                      const isActive = acc.is_active;

                      return (
                        <tr 
                          key={acc.id} 
                          className={`hover:bg-slate-50/60 transition-colors ${
                            !isActive ? 'bg-slate-50/50 opacity-75' : ''
                          }`}
                        >
                          {/* STT */}
                          <td className="py-3 px-3.5 text-center font-mono text-slate-400 font-semibold text-[11px]">
                            {index + 1}
                          </td>

                          {/* NHÂN VIÊN */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${roleMeta?.avatarBg || 'bg-slate-600'}`}>
                                {acc.full_name ? acc.full_name.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 text-xs block hover:text-[#223873]">
                                  {acc.full_name}
                                </span>
                                <span className="text-[10px] font-mono text-slate-400 block">
                                  ID: {acc.id ? acc.id.slice(0, 8) + '...' : '—'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* LIÊN HỆ */}
                          <td className="py-3 px-3 font-mono text-xs">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <a href={`mailto:${acc.email}`} className="hover:underline hover:text-blue-700">
                                {acc.email}
                              </a>
                            </div>
                            {acc.phone && (
                              <div className="flex items-center gap-1.5 text-slate-500 mt-0.5 text-[11px]">
                                <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                                <a href={`tel:${acc.phone}`} className="hover:underline">
                                  {acc.phone}
                                </a>
                              </div>
                            )}
                          </td>

                          {/* VAI TRÒ & BỘ PHẬN */}
                          <td className="py-3 px-3">
                            <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mb-1 ${roleMeta?.badgeColor || 'bg-slate-100 text-slate-800'}`}>
                              {acc.role_code}
                            </span>
                            <span className="text-[11px] text-slate-600 block font-medium">
                              {roleMeta?.name || acc.role_name || acc.role_code}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              {acc.department_name || roleMeta?.deptName}
                            </span>
                          </td>

                          {/* ĐỊA BÀN TRỰC */}
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-700 text-xs flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              <span>{acc.yard_name || (acc.role_code === 'SYS_ADMIN' ? 'Toàn hệ thống' : 'Bãi Sơn Cảng')}</span>
                            </span>
                          </td>

                          {/* QUYỀN THỰC THI */}
                          <td className="py-3 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => setViewPermsStaff(acc)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-mono font-bold text-[11px] cursor-pointer transition-colors"
                              title="Bấm để xem danh sách 67 quyền chi tiết"
                            >
                              <Key className="w-3 h-3 text-blue-600" />
                              <span>{grantedCount} / 67 Quyền</span>
                            </button>
                          </td>

                          {/* TRẠNG THÁI */}
                          <td className="py-3 px-3 text-center">
                            {isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                <span>Hoạt động</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                                <span>Đã khóa</span>
                              </span>
                            )}
                          </td>

                          {/* GHI CHÚ NHIỆM VỤ */}
                          <td className="py-3 px-3 text-slate-500 text-[11px] italic">
                            {acc.notes ? (
                              <span className="line-clamp-2" title={acc.notes}>
                                “{acc.notes}”
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* THAO TÁC */}
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenResetPasswordModal(acc)}
                                title="Đặt lại mật khẩu cho nhân sự này"
                                className="p-1.5 rounded-lg text-purple-700 hover:bg-purple-50 border border-transparent hover:border-purple-200 transition-colors cursor-pointer"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(acc)}
                                title="Sửa thông tin & vai trò"
                                className="p-1.5 rounded-lg text-blue-700 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(acc)}
                                title={isActive ? 'Tạm khóa tài khoản' : 'Kích hoạt lại tài khoản'}
                                className={`p-1.5 rounded-lg border border-transparent transition-colors cursor-pointer ${
                                  isActive 
                                    ? 'text-slate-500 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200' 
                                    : 'text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteStaff(acc)}
                                title="Xóa tài khoản nhân viên"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* =============================================================== */
            /* DẠNG THẺ (CARD VIEW) CHO NGƯỜI DÙNG THÍCH XEM LƯỚI CARD         */
            /* =============================================================== */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredAccounts.map((acc) => {
                const roleMeta = ROLES_V5_METADATA.find((r) => r.code === acc.role_code);
                const grantedCount = ROLE_PERMISSIONS_V5[acc.role_code]?.length || 0;
                const isActive = acc.is_active;

                return (
                  <div
                    key={acc.id}
                    className={`bg-white rounded-2xl p-4 border transition-colors shadow-2xs space-y-3 ${
                      isActive ? 'border-slate-200 hover:border-blue-300' : 'border-slate-200 bg-slate-50/70 opacity-80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${roleMeta?.avatarBg || 'bg-slate-600'}`}>
                          {acc.full_name ? acc.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm">{acc.full_name}</h3>
                            {!isActive && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 bg-rose-100 text-rose-700 rounded border border-rose-200">
                                Đã khóa
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-slate-500 mt-0.5">{acc.email}</p>
                          {acc.phone && (
                            <p className="text-[11px] text-slate-600 mt-0.5 font-mono">📞 {acc.phone}</p>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${roleMeta?.badgeColor || 'bg-slate-100 text-slate-800'}`}>
                        {acc.role_code}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Vai trò:</span>
                        <span className="font-bold text-slate-800">{roleMeta?.name || acc.role_name || acc.role_code}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bộ phận:</span>
                        <span className="font-semibold text-slate-700">{acc.department_name || roleMeta?.deptName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Địa bàn / Bãi:</span>
                        <span className="font-semibold text-[#0A9444]">{acc.yard_name || 'Bãi Sơn Cảng'}</span>
                      </div>
                      <div className="flex justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500">Quyền thực thi:</span>
                        <button
                          type="button"
                          onClick={() => setViewPermsStaff(acc)}
                          className="font-mono font-bold text-blue-700 hover:underline cursor-pointer"
                        >
                          {grantedCount} / 67 Quyền (Xem)
                        </button>
                      </div>
                    </div>

                    {acc.notes && (
                      <p className="text-[11px] text-slate-500 italic line-clamp-2">
                        &ldquo;{acc.notes}&rdquo;
                      </p>
                    )}

                    {/* DÒNG NÚT THAO TÁC SỬA / KHÓA / XÓA */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(acc)}
                        title={isActive ? 'Bấm để tạm khóa tài khoản này' : 'Bấm để kích hoạt lại tài khoản này'}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer flex items-center gap-1 transition-colors ${
                          isActive
                            ? 'text-slate-600 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border-slate-200'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-300'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{isActive ? 'Khóa' : 'Kích hoạt'}</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenResetPasswordModal(acc)}
                          title="Đặt lại mật khẩu cho nhân sự"
                          className="px-2 py-1 rounded-lg text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <KeyRound className="w-3 h-3" />
                          <span>Đặt lại MK</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(acc)}
                          title="Sửa thông tin & đổi vai trò"
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Pencil className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(acc)}
                          title="Xóa tài khoản nhân viên"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUẢN LÝ VAI TRÒ & MA TRẬN PHÂN QUYỀN TƯƠNG TÁC THẬT               */}
      {/* ========================================================================= */}
      {activeTab === 'MATRIX' && (
        <div className="space-y-4">
          {/* KHỐI QUẢN LÝ VAI TRÒ (ROLES) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-[#223873] flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Danh mục Vai trò Hệ thống (Bảng app_roles trong DB)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Các vai trò đang hoạt động trong hệ thống Sơn Cảng, được gán các quyền thực thi chuẩn V5
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCreateRoleError('');
                  setShowCreateRoleModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5a] rounded-xl shadow-2xs cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>➕ Tạo mới Vai trò</span>
              </button>
            </div>

            {/* DANH SÁCH CÁC THẺ VAI TRÒ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 pt-1">
              {rolesList.map(r => (
                <div key={r.code} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[#223873] px-2 py-0.5 bg-white rounded border border-slate-200">
                      {r.code}
                    </span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                      {r.permissions_count !== undefined ? `${r.permissions_count} Quyền` : 'Đang tải...'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-800 text-xs">{r.name}</h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{r.description || 'Chưa có mô tả'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* BẢNG MA TRẬN PHÂN QUYỀN 67 QUYỀN */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-black text-[#223873]">
                  Ma trận Cấp quyền Runtime theo Quyết định V5 (67 Quyền / 206 Grants)
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Click vào từng ô để Bật / Tắt cấp quyền trực tiếp cho vai trò trên cơ sở dữ liệu Supabase Cloud
                </p>
              </div>

              {/* Bộ lọc Module */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  Lọc:
                </span>
                <select
                  value={selectedModuleFilter}
                  onChange={(e) => setSelectedModuleFilter(e.target.value)}
                  className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-none"
                >
                  <option value="ALL">Tất cả Module ({FULL_PERMISSIONS_V5.length})</option>
                  {modulesList.map((m) => (
                    <option key={m} value={m}>
                      {m} ({FULL_PERMISSIONS_V5.filter(p => p.module === m).length})
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Tìm quyền..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:outline-none w-36 sm:w-44"
                />
              </div>
            </div>

            {/* Bảng Ma trận */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="py-2.5 px-3 min-w-[120px]">Phân hệ / Module</th>
                    <th className="py-2.5 px-3 min-w-[280px]">Hành vi / Quyền thực thi</th>
                    <th className="py-2.5 px-2 text-center text-emerald-800 min-w-[70px]" title="Nhân viên An ninh Cổng">
                      SEC_STAFF
                    </th>
                    <th className="py-2.5 px-2 text-center text-emerald-900 min-w-[70px]" title="Trưởng bộ phận An ninh">
                      SEC_LEAD
                    </th>
                    <th className="py-2.5 px-2 text-center text-amber-800 min-w-[70px]" title="Nhân viên Thương vụ CCKB">
                      PORT_STAFF
                    </th>
                    <th className="py-2.5 px-2 text-center text-amber-900 min-w-[70px]" title="Trưởng bộ phận Thương vụ CCKB">
                      PORT_LEAD
                    </th>
                    <th className="py-2.5 px-2 text-center text-blue-800 min-w-[70px]" title="Nhân viên Điều phối Bãi">
                      DIS_STAFF
                    </th>
                    <th className="py-2.5 px-2 text-center text-blue-900 min-w-[70px]" title="Trưởng bộ phận Điều phối">
                      DIS_LEAD
                    </th>
                    <th className="py-2.5 px-2 text-center text-purple-900 bg-purple-50/50 min-w-[70px]" title="Quản trị viên Hệ thống">
                      SYS_ADMIN
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPermissions.map((item) => {
                    const checkPermission = (roleCode: string) => {
                      // Kiểm tra từ state động trước, nếu trống fallback từ mã seed V5
                      if (rolePermissionsList.length > 0) {
                        return rolePermissionsList.some(p => p.role_code === roleCode && p.permission_code === item.code && p.is_enabled);
                      }
                      return (ROLE_PERMISSIONS_V5[roleCode as RoleCode] || []).includes(item.code);
                    };

                    const hasSecStaff = checkPermission('SEC_STAFF');
                    const hasSecLead = checkPermission('SEC_LEAD');
                    const hasPortStaff = checkPermission('PORT_STAFF');
                    const hasPortLead = checkPermission('PORT_LEAD');
                    const hasDisStaff = checkPermission('DIS_STAFF');
                    const hasDisLead = checkPermission('DIS_LEAD');
                    const hasSysAdmin = checkPermission('SYS_ADMIN');

                    return (
                      <tr key={item.code} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 font-semibold text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-mono">
                            {item.module}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                            <span>{item.action}</span>
                            {item.risk === 'Tài chính' && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                Tài chính
                              </span>
                            )}
                            {item.risk === 'Cao' && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-rose-100 text-rose-800 border border-rose-300">
                                Rủi ro cao
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">{item.code}</div>
                        </td>

                        {/* CỘT SEC_STAFF */}
                        <td className="px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermission('SEC_STAFF', item.code, hasSecStaff)}
                            className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors cursor-pointer ${
                              hasSecStaff ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                            }`}
                            title={`Click để ${hasSecStaff ? 'thu hồi' : 'cấp'} quyền này cho SEC_STAFF`}
                          >
                            {hasSecStaff ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '—'}
                          </button>
                        </td>

                        {/* CỘT SEC_LEAD */}
                        <td className="px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermission('SEC_LEAD', item.code, hasSecLead)}
                            className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors cursor-pointer ${
                              hasSecLead ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                            }`}
                            title={`Click để ${hasSecLead ? 'thu hồi' : 'cấp'} quyền này cho SEC_LEAD`}
                          >
                            {hasSecLead ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '—'}
                          </button>
                        </td>

                        {/* CỘT PORT_STAFF */}
                        <td className="px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermission('PORT_STAFF', item.code, hasPortStaff)}
                            className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors cursor-pointer ${
                              hasPortStaff ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                            }`}
                            title={`Click để ${hasPortStaff ? 'thu hồi' : 'cấp'} quyền này cho PORT_STAFF`}
                          >
                            {hasPortStaff ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '—'}
                          </button>
                        </td>

                        {/* CỘT PORT_LEAD */}
                        <td className="px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermission('PORT_LEAD', item.code, hasPortLead)}
                            className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors cursor-pointer ${
                              hasPortLead ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                            }`}
                            title={`Click để ${hasPortLead ? 'thu hồi' : 'cấp'} quyền này cho PORT_LEAD`}
                          >
                            {hasPortLead ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '—'}
                          </button>
                        </td>

                        {/* CỘT DIS_STAFF */}
                        <td className="px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermission('DIS_STAFF', item.code, hasDisStaff)}
                            className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors cursor-pointer ${
                              hasDisStaff ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                            }`}
                            title={`Click để ${hasDisStaff ? 'thu hồi' : 'cấp'} quyền này cho DIS_STAFF`}
                          >
                            {hasDisStaff ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '—'}
                          </button>
                        </td>

                        {/* CỘT DIS_LEAD */}
                        <td className="px-2 py-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleTogglePermission('DIS_LEAD', item.code, hasDisLead)}
                            className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors cursor-pointer ${
                              hasDisLead ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                            }`}
                            title={`Click để ${hasDisLead ? 'thu hồi' : 'cấp'} quyền này cho DIS_LEAD`}
                          >
                            {hasDisLead ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '—'}
                          </button>
                        </td>

                        {/* CỘT SYS_ADMIN */}
                        <td className="px-2 py-2.5 text-center bg-purple-50/30">
                          <button
                            type="button"
                            onClick={() => handleTogglePermission('SYS_ADMIN', item.code, hasSysAdmin)}
                            className={`w-6 h-6 rounded flex items-center justify-center mx-auto transition-colors cursor-pointer ${
                              hasSysAdmin ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' : 'bg-slate-100 text-slate-300 hover:bg-slate-200'
                            }`}
                            title={`Click để ${hasSysAdmin ? 'thu hồi' : 'cấp'} quyền này cho SYS_ADMIN`}
                          >
                            {hasSysAdmin ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '—'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL THÊM MỚI / CHỈNH SỬA & ĐỔI VAI TRÒ NHÂN SỰ                          */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 border border-slate-300">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#223873]" />
                <span>{modalMode === 'CREATE' ? 'Thêm mới Tài khoản Nhân sự' : 'Chỉnh sửa Thông tin & Đổi Vai trò'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitStaffForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Họ và tên Nhân viên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formFullName}
                  onChange={(e) => setFormFullName(e.target.value)}
                  placeholder="VD: Hoàng Văn An..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#223873]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email công vụ <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="VD: an.hv@soncang.vn"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#223873]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="VD: 0981 123 456"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#223873]"
                  />
                </div>
              </div>

              {/* CHỌN VAI TRÒ CHUẨN RBAC V5 */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Phân công Vai trò (Role V1) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formRoleCode}
                  onChange={(e) => handleRoleChange(e.target.value as RoleCode)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#223873]"
                >
                  {ROLES_V5_METADATA.map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.name} — [{r.code}] ({r.deptName})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hệ thống tự động cấp đúng {ROLE_PERMISSIONS_V5[formRoleCode]?.length || 0} quyền theo ma trận RBAC V5.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Bộ phận công tác</label>
                  <input
                    type="text"
                    disabled
                    value={ROLES_V5_METADATA.find(r => r.code === formRoleCode)?.deptName || formDepartmentCode}
                    className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-xl text-slate-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Bãi phân công trực</label>
                  <input
                    type="text"
                    value={formYardName}
                    onChange={(e) => setFormYardName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#223873]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Ghi chú phân công / Vị trí trực ca</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="VD: Trực ca bốt gác Cổng vào ban ngày..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#223873]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkStaffIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 text-[#223873] rounded border-slate-300 cursor-pointer"
                />
                <label htmlFor="chkStaffIsActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Tài khoản đang hoạt động (Cho phép đăng nhập trực ca)
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{modalMode === 'CREATE' ? 'Tạo mới Tài khoản' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL TẠO MỚI VAI TRÒ (ROLE) TRONG DATABASE                                */}
      {/* ========================================================================= */}
      {showCreateRoleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4 border border-slate-300">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#223873]" />
                <span>Thêm mới Vai trò (Role) trong CSDL</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateRoleModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {createRoleError && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{createRoleError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mã Vai trò (Role Code) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: GATE_SUPERVISOR..."
                  value={newRoleCode}
                  onChange={(e) => setNewRoleCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-[#223873]"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Viết hoa, không dấu, dùng dấu gạch dưới (VD: SEC_SPECIALIST)</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên Vai trò hiển thị <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Giám sát Ca Cổng..."
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#223873]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Bộ phận trực thuộc <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newRoleDeptCode}
                  onChange={(e) => setNewRoleDeptCode(e.target.value as DepartmentCode)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#223873]"
                >
                  <option value="AN_NINH">Bộ phận An ninh & Bảo vệ (AN_NINH)</option>
                  <option value="CCKB">Bộ phận Thương vụ & Cảng cạn CCKB (CCKB)</option>
                  <option value="DIEU_PHOI">Bộ phận Điều phối & Hiện trường (DIEU_PHOI)</option>
                  <option value="HE_THONG">Ban Quản trị & Công nghệ (HE_THONG)</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Mô tả trách nhiệm vai trò</label>
                <textarea
                  rows={2}
                  placeholder="Mô tả phạm vi trách nhiệm của vai trò mới này..."
                  value={newRoleDescription}
                  onChange={(e) => setNewRoleDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#223873] resize-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSubmittingRole}
                  onClick={() => setShowCreateRoleModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRole}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5a] rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmittingRole ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>Lưu Vai trò vào CSDL</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL XEM CHI TIẾT QUYỀN CỦA TỪNG NHÂN SỰ                                 */}
      {/* ========================================================================= */}
      {viewPermsStaff && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-3.5 border border-slate-300 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-800">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Chi tiết Quyền hạn: {viewPermsStaff.full_name}
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    Vai trò: {viewPermsStaff.role_code} — {ROLE_PERMISSIONS_V5[viewPermsStaff.role_code]?.length || 0} / 67 Quyền
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewPermsStaff(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto space-y-2 flex-1 pr-1 text-xs">
              {(() => {
                const grantedCodes = ROLE_PERMISSIONS_V5[viewPermsStaff.role_code] || [];
                const grantedPerms = FULL_PERMISSIONS_V5.filter(p => grantedCodes.includes(p.code));

                return grantedPerms.map((p, idx) => (
                  <div key={p.code} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2.5">
                    <span className="font-mono text-slate-400 font-bold shrink-0 text-[10px] mt-0.5">#{idx + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{p.action}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                          {p.module}
                        </span>
                      </div>
                      <span className="font-mono text-[10px] text-blue-700 block mt-0.5">{p.code}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <div className="pt-2 border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setViewPermsStaff(null)}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ĐẶT LẠI MẬT KHẨU NHÂN SỰ (RESET PASSWORD & AUDIT LOGGING)          */}
      {/* ========================================================================= */}
      {resetPwdStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-purple-50/60">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-purple-100 text-purple-800">
                  <KeyRound className="w-4 h-4 text-purple-700" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    Đặt lại Mật khẩu Nhân sự
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Cấp mật khẩu mới và lưu vết kiểm toán (Audit Trail)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetPwdStaff(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* FORM BODY */}
            <form onSubmit={handleConfirmResetPassword} className="p-5 space-y-3.5 text-xs">
              {resetPwdError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{resetPwdError}</span>
                </div>
              )}

              {/* THÔNG TIN NHÂN SỰ ĐƯỢC CHỌN */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-xs">
                    {resetPwdStaff.full_name}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-purple-700 font-bold">
                    {resetPwdStaff.role_code}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500 font-mono text-[11px]">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{resetPwdStaff.email}</span>
                </div>
                {resetPwdStaff.phone && (
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{resetPwdStaff.phone}</span>
                  </div>
                )}
              </div>

              {/* Ô NHẬP MẬT KHẨU MỚI & NÚT RANDOM / COPY */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Mật khẩu mới cấp <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleGenerateRandomPassword}
                      className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200 transition-colors cursor-pointer flex items-center gap-1"
                      title="Tự động tạo mật khẩu mạnh ngẫu nhiên"
                    >
                      <span>🎲 Tạo ngẫu nhiên</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="text-[10px] font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md border border-slate-300 transition-colors cursor-pointer flex items-center gap-1"
                      title="Sao chép mật khẩu gửi nhân sự"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{isCopied ? 'Đã chép!' : 'Sao chép'}</span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <input
                    type={showNewStaffPassword ? 'text' : 'password'}
                    value={newStaffPassword}
                    onChange={(e) => setNewStaffPassword(e.target.value)}
                    placeholder="Nhập hoặc tạo mật khẩu mới (tối thiểu 6 ký tự)..."
                    className="w-full pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-600 bg-purple-50/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewStaffPassword(!showNewStaffPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    title={showNewStaffPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showNewStaffPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* LÝ DO ĐẶT LẠI MẬT KHẨU (GHI VẾT KIỂM TOÁN) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do cấp lại mật khẩu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={resetReason}
                  onChange={(e) => setResetReason(e.target.value)}
                  placeholder="Ví dụ: Nhân viên quên mật khẩu ca trực; Bàn giao tài khoản ca mới..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-purple-600 bg-slate-50/50"
                  required
                />
              </div>

              {/* TÙY CHỌN: BẮT BUỘC ĐỔI MẬT KHẨU LẦN ĐĂNG NHẬP SAU */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="mustChangePwd"
                  checked={mustChangePwd}
                  onChange={(e) => setMustChangePwd(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <label htmlFor="mustChangePwd" className="text-slate-700 font-medium cursor-pointer">
                  Yêu cầu nhân viên đổi mật khẩu ở lần đăng nhập tiếp theo
                </label>
              </div>

              {/* MODAL ACTIONS */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetPwdStaff(null)}
                  disabled={isSubmittingResetPwd}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold cursor-pointer transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResetPwd || !newStaffPassword || newStaffPassword.length < 6}
                  className="px-4 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold cursor-pointer transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmittingResetPwd ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Xác nhận Đặt lại Mật khẩu</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
