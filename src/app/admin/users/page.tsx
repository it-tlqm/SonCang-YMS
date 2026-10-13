'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { RoleCode } from '@/types/auth.types';
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
  Check
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

// Danh sách Nhân sự chính thức chuẩn 7 vai trò V1 Sơn Cảng
const OFFICIAL_STAFF_ACCOUNTS = [
  {
    id: 'user-sec-01',
    fullName: 'Trần Quốc Bảo',
    email: 'sec_gate_01@soncang.vn',
    phone: '0981 123 456',
    roleCode: 'SEC_STAFF' as RoleCode,
    roleName: 'Nhân viên An ninh Cổng',
    department: 'Bộ phận An ninh & Bảo vệ',
    status: 'ACTIVE',
    yardName: 'Bãi Sơn Cảng',
  },
  {
    id: 'user-sec-lead-01',
    fullName: 'Nguyễn Văn An',
    email: 'sec_lead_01@soncang.vn',
    phone: '0982 234 567',
    roleCode: 'SEC_LEAD' as RoleCode,
    roleName: 'Trưởng bộ phận An ninh',
    department: 'Bộ phận An ninh & Bảo vệ',
    status: 'ACTIVE',
    yardName: 'Bãi Sơn Cảng',
  },
  {
    id: 'user-port-01',
    fullName: 'Lê Thị Dung',
    email: 'port_cckb_01@soncang.vn',
    phone: '0983 345 678',
    roleCode: 'PORT_STAFF' as RoleCode,
    roleName: 'Nhân viên Thương vụ CCKB',
    department: 'Bộ phận Thương vụ & Cảng cạn CCKB',
    status: 'ACTIVE',
    yardName: 'Bãi Sơn Cảng',
  },
  {
    id: 'user-port-lead-01',
    fullName: 'Hoàng Minh Cường',
    email: 'port_lead_01@soncang.vn',
    phone: '0984 456 789',
    roleCode: 'PORT_LEAD' as RoleCode,
    roleName: 'Trưởng bộ phận CCKB',
    department: 'Bộ phận Thương vụ & Cảng cạn CCKB',
    status: 'ACTIVE',
    yardName: 'Bãi Sơn Cảng',
  },
  {
    id: 'user-dis-01',
    fullName: 'Vũ Văn Giang',
    email: 'dis_yard_01@soncang.vn',
    phone: '0985 567 890',
    roleCode: 'DIS_STAFF' as RoleCode,
    roleName: 'Nhân viên Điều phối Bãi',
    department: 'Bộ phận Điều phối & Hiện trường',
    status: 'ACTIVE',
    yardName: 'Bãi Sơn Cảng',
  },
  {
    id: 'user-dis-lead-01',
    fullName: 'Phạm Đình Hải',
    email: 'dis_lead_01@soncang.vn',
    phone: '0986 678 901',
    roleCode: 'DIS_LEAD' as RoleCode,
    roleName: 'Trưởng bộ phận Điều phối',
    department: 'Bộ phận Điều phối & Hiện trường',
    status: 'ACTIVE',
    yardName: 'Bãi Sơn Cảng',
  },
  {
    id: 'user-admin-01',
    fullName: 'Ban Quản trị Hệ thống TLQM',
    email: 'admin_01@soncang.vn',
    phone: '0988 888 999',
    roleCode: 'SYS_ADMIN' as RoleCode,
    roleName: 'Quản trị viên Hệ thống',
    department: 'Ban Quản trị & Công nghệ',
    status: 'ACTIVE',
    yardName: 'Toàn hệ thống',
  },
];

export default function UsersAndRbacAdminPage() {
  const { user, role, can } = useAuth();

  // Kiểm tra quyền quản trị RBAC
  const isAllowed = can('admin.roles.manage') || role === 'SYS_ADMIN';

  const [activeTab, setActiveTab] = useState<'USERS' | 'MATRIX'>('USERS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>('ALL');

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

  // Danh mục 7 vai trò hoạt động V1 theo chuẩn V5
  const rolesV5 = [
    {
      code: 'SEC_STAFF',
      name: 'Nhân viên An ninh Cổng',
      dept: 'Bộ phận An ninh & Bảo vệ',
      scope: 'Cổng vào & Cổng ra bến bãi',
      description: 'Tiếp nhận xe, kiểm tra container, thu tiền vé cổng, thu phí lưu bãi, xác nhận xe rời bãi.',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    {
      code: 'SEC_LEAD',
      name: 'Trưởng bộ phận An ninh',
      dept: 'Bộ phận An ninh & Bảo vệ',
      scope: 'Toàn bộ ca trực An ninh',
      description: 'Giám sát ca trực an ninh, duyệt điều chỉnh giờ xe, đối soát doanh thu vé cổng và phí lưu.',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    },
    {
      code: 'PORT_STAFF',
      name: 'Nhân viên Thương vụ CCKB',
      dept: 'Bộ phận Thương vụ & Cảng cạn CCKB',
      scope: 'Khu bãi & Trạm điện container',
      description: 'Tiếp nhận yêu cầu cắm điện trước, ghi nhận giờ cắm/rút điện, thu tiền điện, duyệt điều kiện xuất bãi.',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      code: 'PORT_LEAD',
      name: 'Trưởng bộ phận CCKB',
      dept: 'Bộ phận Thương vụ & Cảng cạn CCKB',
      scope: 'Toàn bộ phân hệ CCKB & Điện',
      description: 'Duyệt điều chỉnh giờ điện đã thu, duyệt xuất bãi ngoại lệ nợ (AP07), chốt doanh thu điện cont.',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    },
    {
      code: 'DIS_STAFF',
      name: 'Nhân viên Điều phối Bãi',
      dept: 'Bộ phận Điều phối & Hiện trường',
      scope: 'Khu vực xếp dỡ & Lưu bãi',
      description: 'Kiểm tra bãi, cập nhật tình trạng HÀNG hoặc RỖNG của container, theo dõi phương tiện trong bãi.',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    {
      code: 'DIS_LEAD',
      name: 'Trưởng bộ phận Điều phối',
      dept: 'Bộ phận Điều phối & Hiện trường',
      scope: 'Toàn bộ mặt bằng bến bãi',
      description: 'Giám sát mặt bằng lưu bãi, duyệt điều chỉnh tình trạng container sau khi đã xuất bãi.',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
    },
    {
      code: 'SYS_ADMIN',
      name: 'Quản trị viên Hệ thống',
      dept: 'Ban Quản trị & Công nghệ',
      scope: 'Toàn quyền cấu hình hệ thống',
      description: 'Quản trị biểu phí, cấu hình tham số, phân quyền vai trò, quản lý người dùng và audit logs.',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
    },
  ];

  // Danh sách các Module phân quyền
  const modulesList = Array.from(new Set(FULL_PERMISSIONS_V5.map(p => p.module)));

  // Lọc danh sách nhân viên
  const filteredAccounts = OFFICIAL_STAFF_ACCOUNTS.filter((acc) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      acc.fullName.toLowerCase().includes(q) ||
      acc.email.toLowerCase().includes(q) ||
      acc.roleName.toLowerCase().includes(q) ||
      acc.phone.includes(q);
    const matchesRole = selectedRoleFilter === 'ALL' || acc.roleCode === selectedRoleFilter;
    return matchesSearch && matchesRole;
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

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3E8EF] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#223873] flex items-center justify-center font-bold">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700">
                Quản trị Nhân sự & Phân quyền
              </span>
              <h1 className="text-lg sm:text-xl font-black text-[#223873] mt-0.5">
                Nhân viên Trực ca & Ma trận Quyền RBAC V5
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/tariffs"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-[#0A9444] hover:bg-emerald-100 transition-colors"
            >
              <span>Xem Biểu phí →</span>
            </Link>
          </div>
        </div>

        {/* THÔNG BÁO QUY ĐỊNH PHÂN QUYỀN V5 */}
        <div className="mt-4 p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 text-xs flex items-start space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-bold text-[#223873]">Tiêu chuẩn Phân định Trách nhiệm RBAC V5:</strong>
            <p className="text-[11px] text-blue-900 mt-0.5">
              Phân định độc lập 3 bộ phận: <strong>An ninh</strong> (thu vé vào cổng & phí lưu bãi, kiểm soát cổng), <strong>CCKB</strong> (quản lý tiền điện container & phê duyệt tài chính xuất bãi), <strong>Điều phối</strong> (cập nhật HÀNG/RỖNG). Tuyệt đối không để An ninh thu tiền điện container.
            </p>
          </div>
        </div>
      </div>

      {/* TABS CHUYỂN ĐỔI: TÀI KHOẢN VS MA TRẬN QUYỀN */}
      <div className="flex border-b border-slate-200 gap-2">
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
          <span>Danh sách Nhân sự ({OFFICIAL_STAFF_ACCOUNTS.length})</span>
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
          <span>Ma trận Phân quyền RBAC V5 (67 Quyền / 206 Grants)</span>
        </button>
      </div>

      {/* TAB 1: DANH SÁCH NHÂN SỰ & VAI TRÒ */}
      {activeTab === 'USERS' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Tìm nhân viên, email, vai trò, SĐT..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#223873] bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700"
              >
                <option value="ALL">Tất cả vai trò ({OFFICIAL_STAFF_ACCOUNTS.length})</option>
                {rolesV5.map((r) => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredAccounts.map((acc) => {
              const roleMeta = rolesV5.find((r) => r.code === acc.roleCode);
              const grantedCount = ROLE_PERMISSIONS_V5[acc.roleCode]?.length || 0;
              return (
                <div
                  key={acc.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{acc.fullName}</h3>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">{acc.email}</p>
                      <p className="text-[11px] text-slate-600 mt-0.5">📞 {acc.phone}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${roleMeta?.badgeColor || 'bg-slate-100 text-slate-800'}`}>
                      {acc.roleCode}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vai trò:</span>
                      <span className="font-bold text-slate-800">{acc.roleName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bộ phận:</span>
                      <span className="font-semibold text-slate-700">{acc.department}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Địa bàn / Bãi:</span>
                      <span className="font-semibold text-[#0A9444]">{acc.yardName}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-slate-500">Quyền thực thi:</span>
                      <span className="font-mono font-bold text-blue-700">{grantedCount} / 67 Quyền</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2">
                    {roleMeta?.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: MA TRẬN PHÂN QUYỀN RBAC V5 (67 QUYỀN CHUẨN) */}
      {activeTab === 'MATRIX' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-black text-[#223873]">
                Ma trận Cấp quyền Runtime theo Quyết định V5 (67 Quyền / 206 Grants)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Dấu check (✓) thể hiện quyền được cấp phép thực thi trên server PostgreSQL và giao diện
              </p>
            </div>

            {/* Bộ lọc Module */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                Lọc Module:
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
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3.5 py-3 min-w-[240px]">Hành động nghiệp vụ / Quyền</th>
                  <th className="px-2 py-3 text-center whitespace-nowrap" title="Nhân viên An ninh">
                    SEC_STAFF
                    <div className="text-[9px] font-normal lowercase text-slate-500 font-mono">(26)</div>
                  </th>
                  <th className="px-2 py-3 text-center whitespace-nowrap" title="Trưởng ca An ninh">
                    SEC_LEAD
                    <div className="text-[9px] font-normal lowercase text-slate-500 font-mono">(31)</div>
                  </th>
                  <th className="px-2 py-3 text-center whitespace-nowrap" title="Nhân viên CCKB">
                    PORT_STAFF
                    <div className="text-[9px] font-normal lowercase text-slate-500 font-mono">(31)</div>
                  </th>
                  <th className="px-2 py-3 text-center whitespace-nowrap" title="Trưởng ca CCKB">
                    PORT_LEAD
                    <div className="text-[9px] font-normal lowercase text-slate-500 font-mono">(38)</div>
                  </th>
                  <th className="px-2 py-3 text-center whitespace-nowrap" title="Nhân viên Điều phối">
                    DIS_STAFF
                    <div className="text-[9px] font-normal lowercase text-slate-500 font-mono">(9)</div>
                  </th>
                  <th className="px-2 py-3 text-center whitespace-nowrap" title="Trưởng ca Điều phối">
                    DIS_LEAD
                    <div className="text-[9px] font-normal lowercase text-slate-500 font-mono">(11)</div>
                  </th>
                  <th className="px-2 py-3 text-center whitespace-nowrap text-purple-900" title="Quản trị hệ thống">
                    SYS_ADMIN
                    <div className="text-[9px] font-normal lowercase text-purple-700 font-mono">(60)</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredPermissions.map((item) => {
                  const hasSecStaff = ROLE_PERMISSIONS_V5.SEC_STAFF.includes(item.code);
                  const hasSecLead = ROLE_PERMISSIONS_V5.SEC_LEAD.includes(item.code);
                  const hasPortStaff = ROLE_PERMISSIONS_V5.PORT_STAFF.includes(item.code);
                  const hasPortLead = ROLE_PERMISSIONS_V5.PORT_LEAD.includes(item.code);
                  const hasDisStaff = ROLE_PERMISSIONS_V5.DIS_STAFF.includes(item.code);
                  const hasDisLead = ROLE_PERMISSIONS_V5.DIS_LEAD.includes(item.code);
                  const hasAdmin = ROLE_PERMISSIONS_V5.SYS_ADMIN.includes(item.code);

                  return (
                    <tr key={item.code} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                            {item.module}
                          </span>
                          <span className="font-bold text-slate-900 text-xs">{item.action}</span>
                          {item.phase === 'GĐ sau' && (
                            <span className="text-[9px] font-semibold bg-slate-100 text-slate-500 px-1 rounded">
                              GĐ sau
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">{item.code}</div>
                      </td>

                      <td className="px-2 py-2 text-center">
                        {hasSecStaff ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-[#0A9444] text-[11px] font-black">✓</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-2 py-2 text-center">
                        {hasSecLead ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-100 text-[#0A9444] text-[11px] font-black">✓</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-2 py-2 text-center">
                        {hasPortStaff ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black">✓</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-2 py-2 text-center">
                        {hasPortLead ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-black">✓</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-2 py-2 text-center">
                        {hasDisStaff ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-black">✓</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-2 py-2 text-center">
                        {hasDisLead ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-black">✓</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      <td className="px-2 py-2 text-center bg-purple-50/30">
                        {hasAdmin ? (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-black">✓</span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
