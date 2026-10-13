'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { RoleCode, DEMO_ACCOUNTS } from '@/types/auth.types';
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
  UserCheck
} from 'lucide-react';

export default function UsersAndRbacAdminPage() {
  const { user, role, can } = useAuth();

  // Kiểm tra quyền quản trị RBAC
  const isAllowed = can('admin.roles.manage') || role === 'SYS_ADMIN';

  const [activeTab, setActiveTab] = useState<'USERS' | 'MATRIX'>('USERS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

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

  // Ma trận 12 nhóm quyền nghiệp vụ cốt lõi theo V5
  const permissionsMatrix = [
    {
      action: 'Tiếp nhận xe vào cổng (Tạo lượt xe)',
      code: 'vehicle.visit.create',
      secStaff: true, secLead: true, portStaff: false, portLead: false, disStaff: false, disLead: false, admin: true
    },
    {
      action: 'Thu tiền vé cổng vào',
      code: 'ticket.payment.collect',
      secStaff: true, secLead: true, portStaff: false, portLead: false, disStaff: false, disLead: false, admin: true
    },
    {
      action: 'Cập nhật tình trạng HÀNG / RỖNG',
      code: 'container.cargo.update',
      secStaff: false, secLead: false, portStaff: false, portLead: false, disStaff: true, disLead: true, admin: true
    },
    {
      action: 'Sửa số Container có lưu vết',
      code: 'container.number.correct',
      secStaff: true, secLead: true, portStaff: false, portLead: true, disStaff: false, disLead: false, admin: true
    },
    {
      action: 'Sửa Biển số xe có lưu vết',
      code: 'vehicle.plate.correct',
      secStaff: true, secLead: true, portStaff: false, portLead: false, disStaff: true, disLead: true, admin: true
    },
    {
      action: 'Đăng ký yêu cầu cắm điện trước',
      code: 'reefer.request.create',
      secStaff: false, secLead: false, portStaff: true, portLead: true, disStaff: false, disLead: false, admin: true
    },
    {
      action: 'Ghi nhận giờ cắm/rút điện thực tế',
      code: 'reefer.session.actual_start.record',
      secStaff: false, secLead: false, portStaff: true, portLead: true, disStaff: false, disLead: false, admin: true
    },
    {
      action: 'Thu tiền điện container lạnh',
      code: 'reefer.payment.collect',
      secStaff: false, secLead: false, portStaff: true, portLead: true, disStaff: false, disLead: false, admin: true
    },
    {
      action: 'Duyệt điều kiện xuất bãi (Clearance)',
      code: 'exit.clearance.issue',
      secStaff: false, secLead: false, portStaff: true, portLead: true, disStaff: false, disLead: false, admin: true
    },
    {
      action: 'Duyệt xuất bãi ngoại lệ nợ (AP07)',
      code: 'exit.clearance.debt_exception',
      secStaff: false, secLead: false, portStaff: false, portLead: true, disStaff: false, disLead: false, admin: true
    },
    {
      action: 'Thu phí lưu bãi container cổng ra',
      code: 'storage.payment.collect',
      secStaff: true, secLead: true, portStaff: false, portLead: false, disStaff: false, disLead: false, admin: true
    },
    {
      action: 'Xác nhận cont/xe rời bãi thực tế',
      code: 'exit.actual.confirm',
      secStaff: true, secLead: true, portStaff: false, portLead: false, disStaff: false, disLead: false, admin: true
    },
    {
      action: 'Quản trị Biểu phí & Tham số bãi',
      code: 'admin.billing_settings.manage',
      secStaff: false, secLead: false, portStaff: false, portLead: false, disStaff: false, disLead: false, admin: true
    },
  ];

  const filteredAccounts = DEMO_ACCOUNTS.filter((acc) => {
    const matchesSearch = 
      acc.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.roleName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRoleFilter === 'ALL' || acc.roleCode === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
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
          <span>Danh sách Nhân sự ({DEMO_ACCOUNTS.length})</span>
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
          <span>Ma trận Phân quyền RBAC V5 (67 Quyền)</span>
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
                placeholder="Tìm nhân viên, email, vai trò..."
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
                <option value="ALL">Tất cả vai trò</option>
                {rolesV5.map((r) => (
                  <option key={r.code} value={r.code}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredAccounts.map((acc) => {
              const roleMeta = rolesV5.find((r) => r.code === acc.roleCode);
              return (
                <div
                  key={acc.id}
                  className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-3 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">{acc.fullName}</h3>
                      <p className="text-[11px] font-mono text-slate-500 mt-0.5">{acc.email}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${roleMeta?.badgeColor || 'bg-slate-100 text-slate-800'}`}>
                      {acc.roleCode}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Vai trò:</span>
                      <span className="font-bold text-slate-800">{acc.roleName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bộ phận:</span>
                      <span className="font-semibold text-slate-700">{roleMeta?.dept || 'Bến bãi Sơn Cảng'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bãi trực:</span>
                      <span className="font-semibold text-[#0A9444]">Bãi Sơn Cảng</span>
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

      {/* TAB 2: MA TRẬN PHÂN QUYỀN RBAC V5 */}
      {activeTab === 'MATRIX' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/60">
            <h3 className="text-xs sm:text-sm font-black text-[#223873]">
              Bảng ma trận cấp quyền Runtime theo Quyết định V5 (206 Grants / 67 Permissions)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Dấu check xanh (✓) thể hiện quyền được cấp phép thực thi trên server và giao diện người dùng
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-3.5 py-3 min-w-[200px]">Hành động nghiệp vụ</th>
                  <th className="px-2 py-3 text-center">SEC_STAFF</th>
                  <th className="px-2 py-3 text-center">SEC_LEAD</th>
                  <th className="px-2 py-3 text-center">PORT_STAFF</th>
                  <th className="px-2 py-3 text-center">PORT_LEAD</th>
                  <th className="px-2 py-3 text-center">DIS_STAFF</th>
                  <th className="px-2 py-3 text-center">DIS_LEAD</th>
                  <th className="px-2 py-3 text-center">SYS_ADMIN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {permissionsMatrix.map((item) => (
                  <tr key={item.code} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-3.5 py-2.5">
                      <div className="font-bold text-slate-900">{item.action}</div>
                      <div className="font-mono text-[10px] text-slate-400">{item.code}</div>
                    </td>

                    <td className="px-2 py-2.5 text-center">
                      {item.secStaff ? <CheckCircle2 className="w-4 h-4 text-[#0A9444] mx-auto" /> : <span className="text-slate-300">—</span>}
                    </td>

                    <td className="px-2 py-2.5 text-center">
                      {item.secLead ? <CheckCircle2 className="w-4 h-4 text-[#0A9444] mx-auto" /> : <span className="text-slate-300">—</span>}
                    </td>

                    <td className="px-2 py-2.5 text-center">
                      {item.portStaff ? <CheckCircle2 className="w-4 h-4 text-[#0A9444] mx-auto" /> : <span className="text-slate-300">—</span>}
                    </td>

                    <td className="px-2 py-2.5 text-center">
                      {item.portLead ? <CheckCircle2 className="w-4 h-4 text-[#0A9444] mx-auto" /> : <span className="text-slate-300">—</span>}
                    </td>

                    <td className="px-2 py-2.5 text-center">
                      {item.disStaff ? <CheckCircle2 className="w-4 h-4 text-blue-600 mx-auto" /> : <span className="text-slate-300">—</span>}
                    </td>

                    <td className="px-2 py-2.5 text-center">
                      {item.disLead ? <CheckCircle2 className="w-4 h-4 text-blue-600 mx-auto" /> : <span className="text-slate-300">—</span>}
                    </td>

                    <td className="px-2 py-2.5 text-center">
                      {item.admin ? <CheckCircle2 className="w-4 h-4 text-purple-600 mx-auto" /> : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
