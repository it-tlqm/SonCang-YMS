'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, role, isDemoMode, switchDemoRole, logout, can } = useAuth();
  const pathname = usePathname();
  const [showRoleMenu, setShowRoleMenu] = React.useState(false);
  const isRealWriteEnabled = process.env.NEXT_PUBLIC_ENABLE_REAL_WRITE === 'true';

  // Không hiển thị shell trên trang /login
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Navigation Items chuẩn hóa theo Action Permissions V5 (R2-04 & ON-11)
  const navItems = [
    {
      name: 'Tổng quan Vận hành',
      href: '/dashboard',
      icon: LayoutDashboard,
      permissionsAny: ['vehicle.visit.read', 'container.visit.read'],
      badge: 'Tổng quan',
    },
    {
      name: 'Tiếp nhận vào cổng',
      href: '/entry',
      icon: Truck,
      permissionsAny: ['vehicle.visit.create', 'ticket.payment.collect'],
      badge: 'Cổng',
    },
    {
      name: 'Đang trong bãi',
      href: '/yard',
      icon: Layers,
      permissionsAny: ['container.visit.read', 'vehicle.visit.read'],
      badge: 'Bãi',
    },
    {
      name: 'Điện Container',
      href: '/reefer',
      icon: Zap,
      permissionsAny: ['reefer.session.read', 'reefer.request.read'],
      badge: 'Reefer',
    },
    {
      name: 'Thu phí & Sổ cái',
      href: '/billing',
      icon: Receipt,
      permissionsAny: [
        'storage.payment.collect',
        'ticket.payment.collect',
        'reefer.payment.collect',
        'report.revenue.read',
        'admin.billing_settings.manage'
      ],
      badge: 'Tài chính',
    },
    {
      name: 'Xuất bãi & Cổng ra',
      href: '/exit',
      icon: LogOut,
      permissionsAny: ['exit.clearance.read', 'exit.clearance.issue', 'exit.actual.confirm'],
      badge: 'Cổng ra',
    },
    {
      name: 'Danh mục loại xe',
      href: '/admin/vehicle-types',
      icon: Settings,
      permissionsAny: ['admin.billing_settings.manage', 'admin.roles.manage'],
      badge: 'Admin',
    },
  ];


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
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F8FA] text-slate-800">
      {/* BANNER THÔNG BÁO MÔI TRƯỜNG VẬN HÀNH NỘI BỘ */}
      {isDemoMode ? (
        <div className="bg-amber-500 text-slate-950 px-3 py-1.5 text-center text-xs font-bold border-b border-amber-600 flex items-center justify-center space-x-2">
          <span className="bg-slate-900 text-white text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
            BẢN MÔ PHỎNG
          </span>
          <span className="truncate">
            Chế độ duyệt thử nghiệm giao diện nội bộ — Dữ liệu tạm thời trên thiết bị.
          </span>
        </div>
      ) : isRealWriteEnabled ? (
        <div className="bg-emerald-700 text-white px-3 py-1.5 text-center text-xs font-bold border-b border-emerald-800 flex items-center justify-center space-x-2">
          <span className="bg-white text-emerald-900 text-[10px] px-1.5 py-0.5 rounded font-black tracking-wider uppercase">
            BẢN VẬN HÀNH THỬ NGHIỆM
          </span>
          <span className="truncate">
            Hệ thống đang mở chức năng ghi nhận dữ liệu thực tế theo ca trực.
          </span>
        </div>
      ) : (
        <div className="bg-[#223873] text-white px-3 py-1.5 text-center text-xs font-medium border-b border-blue-900 flex items-center justify-center space-x-2">
          <span className="bg-white/20 text-white text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wider uppercase">
            BẢN THỬ NGHIỆM
          </span>
          <span className="truncate">
            Chức năng lưu dữ liệu hiện chưa được mở.
          </span>
        </div>
      )}

      {/* 1. TOP HEADER (BRAND & IDENTITY) */}
      <header className="bg-white border-b border-[#E3E8EF] sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo & Brand Info */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-[#0A9444] flex items-center justify-center text-white font-bold text-lg shadow-sm">
                SC
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-[#223873]">
                    SƠN CẢNG YMS
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-[#0A9444] border border-emerald-200">
                    V5 PWA
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium hidden sm:block truncate">
                  Công ty Cổ phần Tà Lùng Quang Minh
                </div>
              </div>
            </div>

            {/* Yard Badge & User/Role Info */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                <MapPin className="w-3.5 h-3.5 text-[#0A9444]" />
                <span>{user?.yardName || 'Bãi 1 — Cảng cạn Sơn Cảng'}</span>
              </div>

              {/* Role Indicator & Demo Switcher Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${getRoleBadgeColor(role)}`}
                  title={isDemoMode ? 'Nhấn để đổi vai trò kiểm thử giao diện' : 'Thông tin tài khoản thực'}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span className="max-w-[110px] sm:max-w-none truncate">{user?.roleName || 'Chưa phân vai trò'}</span>
                  <ChevronDown className="w-3 h-3 opacity-60" />
                </button>

                {showRoleMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1.5 border-b border-slate-100">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {isDemoMode ? 'Chuyển đổi vai trò kiểm thử' : 'Tài khoản người dùng'}
                      </div>
                      <div className="text-xs text-slate-700 mt-0.5 truncate">
                        Người dùng: <strong className="text-slate-900">{user?.fullName}</strong>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {user?.email}
                      </div>
                    </div>

                    {/* Danh sách vai trò demo chỉ hiển thị khi ở Demo Mode */}
                    {isDemoMode ? (
                      <div className="py-1">
                        {DEMO_ACCOUNTS.map((acc) => (
                          <button
                            key={acc.roleCode}
                            type="button"
                            onClick={() => {
                              switchDemoRole(acc.roleCode);
                              setShowRoleMenu(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-xs flex flex-col transition-colors hover:bg-slate-50 cursor-pointer ${
                              role === acc.roleCode ? 'bg-emerald-50/60 font-semibold' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-slate-900 font-bold">{acc.roleName}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-700">
                                {acc.roleCode}
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
                        <div className="flex items-center space-x-1.5 text-blue-700 font-bold">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Phân quyền theo vị trí công tác</span>
                        </div>
                        <p className="text-[11px] leading-relaxed text-slate-600">
                          Quyền hạn và phạm vi bãi làm việc được quản lý tự động theo nhiệm vụ và vị trí đã phân công trên hệ thống.
                        </p>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-slate-100 px-3">
                      <button
                        type="button"
                        onClick={() => {
                          logout();
                          setShowRoleMenu(false);
                        }}
                        className="w-full text-left py-1.5 text-xs text-rose-600 font-semibold flex items-center space-x-1.5 hover:text-rose-700 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Đăng xuất khỏi hệ thống</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 2. DESKTOP / TABLET TOP NAVIGATION */}
      <nav className="bg-white border-b border-[#E3E8EF] hidden sm:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 sm:space-x-4 h-11 items-center">
            {navItems.map((item) => {
              const isAllowed = item.permissionsAny.some((p) => can(p));
              const isActive = pathname === item.href;
              const Icon = item.icon;

              if (!isAllowed) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center space-x-2 px-3 py-1.5 text-xs font-medium text-slate-300 cursor-not-allowed select-none"
                    title={`Yêu cầu một trong các quyền: ${item.permissionsAny.join(', ')}`}
                  >
                    <Icon className="w-4 h-4 opacity-40" />
                    <span>{item.name}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-400">Khóa</span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-50 text-[#0A9444] border-b-2 border-[#0A9444]'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#0A9444]' : 'text-slate-500'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 3. MAIN CONTENT CONTAINER */}
      <main className="flex-1 pb-20 sm:pb-8">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-3 sm:pt-6">
          {children}
        </div>
      </main>

      {/* 4. MOBILE BOTTOM NAVIGATION (390px Mobile-first friendly) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-[#E3E8EF] z-40 shadow-lg px-2 py-1">
        <div className="grid grid-cols-3 gap-1">
          {navItems.map((item) => {
            const isAllowed = item.permissionsAny.some((p) => can(p));
            const isActive = pathname === item.href;
            const Icon = item.icon;

            if (!isAllowed) {
              return (
                <div
                  key={item.href}
                  className="flex flex-col items-center justify-center py-1.5 text-[11px] font-medium text-slate-300 cursor-not-allowed"
                >
                  <Icon className="w-5 h-5 opacity-30" />
                  <span className="mt-0.5 line-through">{item.badge}</span>
                </div>
              );
            }


            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  isActive ? 'text-[#0A9444] bg-emerald-50/80' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-[#0A9444]' : 'text-slate-500'}`} />
                <span className="mt-0.5">{item.badge}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
