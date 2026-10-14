'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { RoleCode, DEMO_ACCOUNTS } from '@/types/auth.types';
import { 
  Truck, 
  Settings, 
  LogOut, 
  UserCheck, 
  MapPin, 
  ChevronDown,
  Layers,
  Lock,
  Zap,
  Receipt,
  LayoutDashboard,
  X,
  DollarSign,
  Users,
  History,
  CopyCheck,
  BarChart3,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  Building2,
  KeyRound,
  Landmark,
} from 'lucide-react';
import { ChangePasswordModal } from '@/components/modals/change-password-modal';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionsAny: string[];
  badge?: string;
  section: 'OPERATIONS' | 'FINANCE' | 'ADMIN';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, role, isDemoMode, switchDemoRole, logout, can, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const isRealWriteEnabled = process.env.NEXT_PUBLIC_ENABLE_REAL_WRITE === 'true';

  // Điều hướng người dùng chưa đăng nhập về trang /login
  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isLoading, user, pathname, router]);

  // Đồng hồ thời gian thực ca trực
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const timePart = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const datePart = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
      setCurrentTimeStr(`${timePart} — ${datePart}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Tải trạng thái thu gọn sidebar từ localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sc_sidebar_collapsed');
    if (saved === 'true') {
      setIsSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sc_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Đóng mobile drawer khi chuyển trang
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  // Không hiển thị shell trên trang /login
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Màn hình chờ xác thực phiên đăng nhập
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F5F8FA]">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#0A9444] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-bold text-slate-600">Đang đồng bộ phiên làm việc Sơn Cảng...</span>
        </div>
      </div>
    );
  }

  // Chặn hiển thị nội dung nội bộ nếu chưa đăng nhập thành công
  if (!user) {
    return null;
  }

  // Navigation Items chuẩn hóa theo Action Permissions V5 (R2-04 & ON-11) phân chia 3 nhóm nghiệp vụ
  const navItems: NavItem[] = [
    // Nhóm 1: VẬN HÀNH BẾN BÃI
    {
      name: 'Tổng quan Vận hành',
      href: '/dashboard',
      icon: LayoutDashboard,
      permissionsAny: ['vehicle.visit.read', 'container.visit.read'],
      badge: 'Chung',
      section: 'OPERATIONS',
    },
    {
      name: 'Tiếp nhận Cổng vào',
      href: '/entry',
      icon: Truck,
      permissionsAny: ['vehicle.visit.create'],
      badge: 'Cổng vào',
      section: 'OPERATIONS',
    },
    {
      name: 'Quản lý Bãi & Cont',
      href: '/yard',
      icon: Layers,
      permissionsAny: ['container.visit.read', 'vehicle.visit.read'],
      badge: 'Bãi',
      section: 'OPERATIONS',
    },
    {
      name: 'Điện Container (Reefer)',
      href: '/reefer',
      icon: Zap,
      permissionsAny: ['reefer.session.actual_start.record', 'reefer.request.create', 'reefer.field_work.note'],
      badge: 'Reefer',
      section: 'OPERATIONS',
    },
    {
      name: 'Xuất bãi & Cổng ra',
      href: '/exit',
      icon: LogOut,
      permissionsAny: ['exit.clearance.issue', 'exit.actual.confirm'],
      badge: 'Cổng ra',
      section: 'OPERATIONS',
    },

    // Nhóm 2: TÀI CHÍNH & BÁO CÁO
    {
      name: 'Thu phí & Sổ cái',
      href: '/billing',
      icon: Receipt,
      permissionsAny: [
        'storage.payment.collect',
        'ticket.payment.collect',
        'reefer.payment.collect',
        'admin.billing_settings.manage'
      ],
      badge: 'Sổ cái',
      section: 'FINANCE',
    },
    {
      name: 'Kế toán & Hóa đơn',
      href: '/accounting',
      icon: Landmark,
      permissionsAny: [
        'accounting.shift_cash.collect',
        'accounting.invoice.prepare',
        'accounting.debt.manage',
        'accounting.reports.view',
        'admin.roles.manage'
      ],
      badge: 'Quỹ / HĐ',
      section: 'FINANCE',
    },
    {
      name: 'Thống kê & Báo cáo',
      href: '/reports',
      icon: BarChart3,
      permissionsAny: ['report.revenue.read', 'vehicle.visit.read', 'container.visit.read', 'admin.roles.manage'],
      badge: 'Báo cáo',
      section: 'FINANCE',
    },

    // Nhóm 3: HỆ THỐNG & QUẢN TRỊ
    {
      name: 'Danh mục khách hàng',
      href: '/admin/customers',
      icon: Building2,
      permissionsAny: ['reefer.request.create', 'admin.billing_settings.manage', 'admin.roles.manage'],
      badge: 'Khách hàng',
      section: 'ADMIN',
    },
    {
      name: 'Biểu phí bến bãi',
      href: '/admin/tariffs',
      icon: DollarSign,
      permissionsAny: ['admin.billing_settings.manage'],
      badge: 'Bảng giá',
      section: 'ADMIN',
    },
    {
      name: 'Danh mục loại xe',
      href: '/admin/vehicle-types',
      icon: Settings,
      permissionsAny: ['admin.billing_settings.manage', 'admin.roles.manage'],
      badge: 'Loại xe',
      section: 'ADMIN',
    },
    {
      name: 'Kiểm soát trùng xe',
      href: '/admin/vehicle-duplicate',
      icon: CopyCheck,
      permissionsAny: ['admin.billing_settings.manage', 'admin.roles.manage'],
      badge: 'Chính sách',
      section: 'ADMIN',
    },
    {
      name: 'Nhân sự & Quyền V5',
      href: '/admin/users',
      icon: Users,
      permissionsAny: ['admin.roles.manage'],
      badge: 'RBAC',
      section: 'ADMIN',
    },
    {
      name: 'Nhật ký kiểm toán',
      href: '/admin/audit-logs',
      icon: History,
      permissionsAny: ['audit.read', 'admin.roles.manage'],
      badge: 'Audit',
      section: 'ADMIN',
    },
  ];

  const allowedItems = navItems.filter((item) => item.permissionsAny.some((p) => can(p)));
  const currentItem = navItems.find((item) => item.href === pathname) || navItems[0];
  const CurrentIcon = currentItem?.icon || LayoutDashboard;

  const getRoleBadgeColor = (r: RoleCode | null) => {
    switch (r) {
      case 'SEC_STAFF':
      case 'SEC_LEAD':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'DIS_STAFF':
      case 'DIS_LEAD':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'PORT_STAFF':
      case 'PORT_LEAD':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'SYS_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'ACCOUNTANT':
        return 'bg-teal-100 text-teal-800 border-teal-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const sections: { key: 'OPERATIONS' | 'FINANCE' | 'ADMIN'; label: string }[] = [
    { key: 'OPERATIONS', label: 'VẬN HÀNH BẾN BÃI' },
    { key: 'FINANCE', label: 'TÀI CHÍNH & BÁO CÁO' },
    { key: 'ADMIN', label: 'HỆ THỐNG & QUẢN TRỊ' },
  ];

  const renderNavSection = (sectionKey: 'OPERATIONS' | 'FINANCE' | 'ADMIN', sectionLabel: string, isCollapsedView: boolean) => {
    const items = allowedItems.filter((item) => item.section === sectionKey);
    if (items.length === 0) return null;

    return (
      <div key={sectionKey} className="space-y-1">
        {!isCollapsedView && (
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            {sectionLabel}
          </div>
        )}
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          if (isCollapsedView) {
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.name}
                className={`flex items-center justify-center w-10 h-10 mx-auto rounded transition-all ${
                  isActive
                    ? 'bg-[#223873] text-white shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded text-xs transition-all ${
                isActive
                  ? 'bg-[#223873] text-white shadow-2xs font-bold'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 font-semibold'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="truncate">{item.name}</span>
              </div>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
              )}
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#F8FAFC] text-slate-800">
      {/* ============================================================== */}
      {/* 1. DESKTOP / TABLET SIDEBAR                                   */}
      {/* ============================================================== */}
      <aside
        className={`hidden md:flex flex-col bg-white border-r border-slate-200 shrink-0 transition-all duration-200 z-40 select-none ${
          isSidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 border-b border-slate-200 flex items-center justify-between px-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded bg-[#0A9444] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-2xs tracking-wider">
              SC
            </div>
            {!isSidebarCollapsed && (
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#223873] uppercase tracking-tight truncate">
                  Sơn Cảng YMS
                </div>
                <div className="text-[10px] text-slate-500 font-medium truncate">
                  Tà Lùng Quang Minh
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
            title={isSidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Live Yard Status Pill */}
        {!isSidebarCollapsed && (
          <div className="px-3 pt-3 pb-1">
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700">
              <div className="flex items-center gap-2 min-w-0">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span className="font-semibold truncate">{user?.yardName || 'Bãi 1 — Cảng cạn Sơn Cảng'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
          {sections.map((sec) => renderNavSection(sec.key, sec.label, isSidebarCollapsed))}

          {allowedItems.length === 0 && !isSidebarCollapsed && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 space-y-1">
              <p className="font-bold">Chưa chọn ca trực</p>
              <p className="text-[11px]">Vui lòng chọn vai trò trực ca ở góc trên để mở các phân hệ làm việc.</p>
            </div>
          )}
        </div>

        {/* Sidebar Footer (User Info & Shift) */}
        <div className="border-t border-slate-200 p-2.5 bg-slate-50/70 shrink-0">
          {!isSidebarCollapsed ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {user?.fullName || 'Nhân viên trực'}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {user?.roleName || 'Chưa phân vai trò'}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="p-1.5 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 cursor-pointer transition-colors"
                    title="Đổi mật khẩu"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      window.location.href = '/login';
                    }}
                    className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isDemoMode && (
                <button
                  type="button"
                  onClick={() => setShowRoleMenu(true)}
                  className="w-full py-1 px-2 rounded bg-white hover:bg-slate-100 border border-slate-300 text-[11px] font-bold text-slate-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#0A9444]" />
                  <span>Đổi vai trò ca trực</span>
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRoleMenu(true)}
                className="w-9 h-9 rounded bg-white hover:bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 cursor-pointer"
                title={`Đổi vai trò: ${user?.roleName}`}
              >
                <UserCheck className="w-4 h-4 text-[#0A9444]" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  window.location.href = '/login';
                }}
                className="w-9 h-9 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ============================================================== */}
      {/* 2. MOBILE DRAWER (SLIDE OVER)                                  */}
      {/* ============================================================== */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative flex flex-col w-72 max-w-[85vw] bg-white h-full z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-[#0A9444] text-white font-bold text-xs flex items-center justify-center shadow-2xs">
                  SC
                </div>
                <div>
                  <div className="text-xs font-bold text-[#223873] uppercase tracking-tight">
                    Sơn Cảng YMS
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Tà Lùng Quang Minh
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Navigation */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {sections.map((sec) => renderNavSection(sec.key, sec.label, false))}
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-slate-200 p-3 bg-slate-50 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">{user?.fullName}</div>
                  <div className="text-[11px] text-slate-500">{user?.roleName}</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    window.location.href = '/login';
                  }}
                  className="p-1.5 rounded text-rose-600 hover:bg-rose-50 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {isDemoMode && (
                <button
                  type="button"
                  onClick={() => setShowRoleMenu(true)}
                  className="w-full py-1.5 px-3 rounded bg-white hover:bg-slate-100 border border-slate-300 text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="w-3.5 h-3.5 text-[#0A9444]" />
                  <span>Đổi vai trò ca trực</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MAIN RIGHT CONTENT AREA (HEADER + CONTENT)                 */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* TOP ENTERPRISE HEADER */}
        <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-3 sm:px-5 shrink-0 z-30">
          {/* Header Left: Toggle / Breadcrumbs */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Hamburger on mobile */}
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="md:hidden p-1.5 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              title="Mở menu điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Breadcrumb section info */}
            <div className="flex items-center gap-1.5 text-xs min-w-0">
              <span className="text-slate-400 font-semibold uppercase tracking-wider hidden lg:inline">
                Sơn Cảng /
              </span>
              <span className="font-bold text-slate-900 flex items-center gap-1.5 truncate">
                <CurrentIcon className="w-4 h-4 text-[#223873] shrink-0" />
                <span className="truncate">{currentItem?.name || 'Vận hành'}</span>
              </span>
            </div>

            {/* Environment Badge */}
            {isDemoMode ? (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-300">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                Bản Mô phỏng
              </span>
            ) : isRealWriteEnabled ? (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                Vận hành Thử nghiệm
              </span>
            ) : (
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-900 border border-blue-300">
                Bản Thử nghiệm
              </span>
            )}
          </div>

          {/* Header Right: Live Clock & Shift Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Real-time Clock */}
            {currentTimeStr && (
              <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-mono font-bold text-slate-700">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentTimeStr}</span>
              </div>
            )}

            {/* Location Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-300">
              <MapPin className="w-3.5 h-3.5 text-[#0A9444]" />
              <span className="truncate">{user?.yardName || 'Bãi 1 — Tà Lùng'}</span>
            </div>

            {/* Role indicator & demo switch button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-bold cursor-pointer transition-all ${getRoleBadgeColor(role)}`}
                title={isDemoMode ? 'Nhấn để đổi vai trò kiểm thử' : 'Thông tin tài khoản'}
              >
                <UserCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="max-w-[100px] sm:max-w-none truncate">{user?.roleName || 'Chưa phân vai trò'}</span>
                <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
              </button>

              {/* Role Dropdown Menu */}
              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-300 py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {isDemoMode ? 'Chuyển đổi vai trò ca trực' : 'Tài khoản người dùng'}
                    </div>
                    <div className="text-xs text-slate-800 font-bold mt-0.5 truncate">
                      {user?.fullName}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">
                      {user?.email}
                    </div>
                  </div>

                  {isDemoMode ? (
                    <div className="py-1 max-h-72 overflow-y-auto">
                      {DEMO_ACCOUNTS.map((acc) => (
                        <button
                          key={acc.roleCode}
                          type="button"
                          onClick={() => {
                            switchDemoRole(acc.roleCode);
                            setShowRoleMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-xs flex flex-col transition-colors hover:bg-slate-50 cursor-pointer ${
                            role === acc.roleCode ? 'bg-emerald-50/70 font-bold' : ''
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-slate-900 font-bold">{acc.roleName}</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-medium">
                              Ca trực
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {acc.description}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-1 text-blue-700 font-bold">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Phân quyền vị trí công tác</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-slate-600">
                        Quyền hạn và phạm vi bãi làm việc được quản lý tự động theo vị trí và nhiệm vụ đã phân công.
                      </p>
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-slate-100 px-3 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRoleMenu(false);
                        setIsChangePasswordOpen(true);
                      }}
                      className="w-full text-left py-1.5 text-xs text-slate-700 font-bold flex items-center gap-1.5 hover:text-emerald-700 hover:bg-slate-50 rounded-lg px-1 transition-colors cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đổi mật khẩu tài khoản</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        setShowRoleMenu(false);
                        await logout();
                        window.location.href = '/login';
                      }}
                      className="w-full text-left py-1.5 text-xs text-rose-600 font-bold flex items-center gap-1.5 hover:text-rose-700 hover:bg-rose-50 rounded-lg px-1 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất khỏi hệ thống</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* SCROLLABLE MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-5 lg:p-6 bg-[#F8FAFC]">
          <div className="max-w-7xl mx-auto space-y-5">
            {children}
          </div>
        </main>
      </div>

      {/* MODAL ĐỔI MẬT KHẨU CÁ NHÂN */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
}
