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
  ShieldCheck,
  Search,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { ChangePasswordModal } from '@/components/modals/change-password-modal';
import { useToast } from '@/contexts/toast-context';
import { GlobalSearchModal } from '@/components/workspace/global-search-modal';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permissionsAny: string[];
  badge?: string;
  section: 'OPERATIONS' | 'FINANCE' | 'ADMIN';
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, role, isDemoMode, switchDemoRole, logout, can, isLoading, repository, yardId } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const pathname = usePathname();
  const router = useRouter();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [showResetYardModal, setShowResetYardModal] = useState(false);
  const [isResettingYard, setIsResettingYard] = useState(false);
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [liveCounts, setLiveCounts] = useState<{
    yardContCount: number;
    reeferActiveCount: number;
    exitWaitCount: number;
  }>({ yardContCount: 0, reeferActiveCount: 0, exitWaitCount: 0 });

  // Giám sát kết nối mạng Internet (PWA Offline Detection)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      toastSuccess('Đã khôi phục kết nối mạng Internet bến bãi!', 'Trực tuyến');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toastError('Thiết bị đang mất kết nối Internet! Hệ thống chuyển sang chế độ ngoại tuyến (Chỉ xem dữ liệu đệm).', 'Mất kết nối mạng');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toastSuccess, toastError]);

  const isRealWriteEnabled = process.env.NEXT_PUBLIC_ENABLE_REAL_WRITE === 'true';

  const handleResetYardClean = async () => {
    setIsResettingYard(true);
    try {
      const res = await repository.resetYardToClean();
      if (res.success) {
        setShowResetYardModal(false);
        toastSuccess('Đã dọn dẹp sạch toàn bộ dữ liệu bãi trống 100%!', 'Khởi tạo thành công');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toastError(res.error || 'Lỗi khi làm sạch dữ liệu bãi.', 'Lỗi thao tác');
      }
    } catch (err: any) {
      toastError('Lỗi hệ thống: ' + (err?.message || String(err)), 'Lỗi ngoại lệ');
    } finally {
      setIsResettingYard(false);
    }
  };

  // Nạp dữ liệu số lượng thực tế cho Live Badges (tự làm mới mỗi 15 giây)
  useEffect(() => {
    let isMounted = true;
    const fetchCounts = async () => {
      try {
        const [cList, rList, vList] = await Promise.all([
          repository.getContainers(yardId),
          repository.getReeferSessions(yardId),
          repository.getVehicles(yardId),
        ]);
        if (isMounted) {
          const inYardConts = cList.filter((c) => c.status === 'IN_YARD').length;
          const activeSessions = rList.filter((r) => r.power_status === 'PLUGGED').length;
          const waitExit = vList.filter((v) => v.status === 'IN_YARD' && v.ticket_payment_status !== 'PAID').length;
          setLiveCounts({
            yardContCount: inYardConts,
            reeferActiveCount: activeSessions,
            exitWaitCount: waitExit,
          });
        }
      } catch (err) {
        // im lặng nếu phiên chưa sẵn sàng
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [yardId, repository]);

  // Phím tắt bàn phím toàn cục (Global Keyboard Shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Ctrl + K hoặc Cmd + K: Mở / Đóng Hộp tra cứu nhanh toàn bãi
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
        return;
      }

      // 2. Esc: Đóng các menu và popup
      if (e.key === 'Escape') {
        setIsGlobalSearchOpen(false);
        setShowRoleMenu(false);
        setIsMobileOpen(false);
        return;
      }

      // 3. Alt + Phím số: Chuyển nhanh giữa các phân hệ cốt lõi
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            router.push('/entry');
            break;
          case '2':
            e.preventDefault();
            router.push('/yard');
            break;
          case '3':
            e.preventDefault();
            router.push('/reefer');
            break;
          case '4':
            e.preventDefault();
            router.push('/exit');
            break;
          case '5':
            e.preventDefault();
            router.push('/billing');
            break;
          case '6':
            e.preventDefault();
            router.push('/accounting');
            break;
          case '0':
          case 'g':
          case 'G':
            e.preventDefault();
            router.push('/guide');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  // Điều hướng người dùng chưa đăng nhập về trang /login
  useEffect(() => {
    if (!isLoading && !user && pathname !== '/login') {
      const p = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
      if (p?.get('demo_role')) return;
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
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sc_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Đóng mobile drawer khi chuyển trang
  useEffect(() => {
    setIsMobileOpen(false);
    setShowRoleMenu(false);
  }, [pathname]);

  // Không hiển thị shell trên trang /login
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Màn hình chờ xác thực phiên đăng nhập
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-[#326DD8] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-medium text-[#667085]">Đang đồng bộ phiên làm việc Sơn Cảng...</span>
        </div>
      </div>
    );
  }

  // Chặn hiển thị nội dung nội bộ nếu chưa đăng nhập thành công
  if (!user) {
    return null;
  }

  // Danh mục phân hệ điều hướng chuẩn hóa theo RBAC V5
  const navItems: NavItem[] = [
    // Nhóm 1: VẬN HÀNH BẾN BÃI
    {
      name: 'Giới thiệu & Hướng dẫn',
      href: '/guide',
      icon: BookOpen,
      permissionsAny: [
        'vehicle.visit.read',
        'container.visit.read',
        'ticket.payment.collect',
        'reefer.session.read',
        'admin.roles.manage',
      ],
      badge: 'Cẩm nang',
      section: 'OPERATIONS',
    },
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
      badge: liveCounts.yardContCount > 0 ? `${liveCounts.yardContCount} cont` : 'Bãi',
      section: 'OPERATIONS',
    },
    {
      name: 'Cắm điện Container',
      href: '/reefer',
      icon: Zap,
      permissionsAny: ['reefer.session.actual_start.record', 'reefer.request.create', 'reefer.field_work.note'],
      badge: liveCounts.reeferActiveCount > 0 ? `${liveCounts.reeferActiveCount} cắm điện` : 'Reefer',
      section: 'OPERATIONS',
    },
    {
      name: 'Xuất bãi & Cổng ra',
      href: '/exit',
      icon: LogOut,
      permissionsAny: ['exit.clearance.issue', 'exit.actual.confirm'],
      badge: liveCounts.exitWaitCount > 0 ? `${liveCounts.exitWaitCount} chờ ra` : 'Cổng ra',
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
        'admin.billing_settings.manage',
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
        'admin.roles.manage',
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
        return 'bg-[#ECFDF3] text-[#0A9444] border-[#A6F4C5]';
      case 'DIS_STAFF':
      case 'DIS_LEAD':
        return 'bg-[#EFF8FF] text-[#326DD8] border-[#B2DDFF]';
      case 'PORT_STAFF':
      case 'PORT_LEAD':
        return 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]';
      case 'SYS_ADMIN':
        return 'bg-[#F9F5FF] text-[#6941C6] border-[#E9D7FE]';
      case 'ACCOUNTANT':
        return 'bg-[#F0FDF9] text-[#0E9384] border-[#CCFBEF]';
      default:
        return 'bg-[#F8F9FB] text-[#475467] border-[#E5E9F0]';
    }
  };

  const sections: { key: 'OPERATIONS' | 'FINANCE' | 'ADMIN'; label: string }[] = [
    { key: 'OPERATIONS', label: 'VẬN HÀNH' },
    { key: 'FINANCE', label: 'TÀI CHÍNH & BÁO CÁO' },
    { key: 'ADMIN', label: 'QUẢN TRỊ HỆ THỐNG' },
  ];

  const renderNavSection = (sectionKey: 'OPERATIONS' | 'FINANCE' | 'ADMIN', sectionLabel: string, isCollapsedView: boolean) => {
    const items = allowedItems.filter((item) => item.section === sectionKey);
    if (items.length === 0) return null;

    return (
      <div key={sectionKey} className="space-y-0.5">
        {!isCollapsedView && (
          <div className="px-3 pt-3 pb-1 text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider">
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
                className={`relative flex items-center justify-center w-10 h-10 mx-auto rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#EAF1FD] text-[#326DD8] font-semibold'
                    : 'text-[#667085] hover:text-[#17202E] hover:bg-[#F1F4F8]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 bg-[#326DD8] rounded-r-full" />
                )}
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'text-[#326DD8]' : 'text-[#667085]'}`} />
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all relative ${
                isActive
                  ? 'bg-[#EAF1FD] text-[#326DD8] font-semibold'
                  : 'text-[#475467] hover:text-[#17202E] hover:bg-[#F1F4F8] font-medium'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#326DD8] rounded-r-full" />
              )}
              <div className="flex items-center gap-2.5 min-w-0 pl-1">
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#326DD8]' : 'text-[#667085] group-hover:text-[#17202E]'}`} />
                <span className="truncate">{item.name}</span>
              </div>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#326DD8] shrink-0" />
              )}
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white text-[#17202E]">
      {/* ============================================================== */}
      {/* 1. GLOBAL TOP BAR (60–64px) — MODERN WORKSPACE HEADER          */}
      {/* ============================================================== */}
      <header className="h-14 sm:h-15 border-b border-[#E5E9F0] bg-white flex items-center justify-between px-4 sm:px-5 shrink-0 z-40 select-none">
        {/* Left: Branding & App Title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="md:hidden p-1.5 rounded-lg text-[#667085] hover:bg-[#F1F4F8] hover:text-[#17202E] transition-colors"
            title="Mở menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo Sơn Cảng */}
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0 group">
            <div className="w-8 h-8 rounded-lg bg-[#0A9444] text-white font-bold text-xs flex items-center justify-center shrink-0 tracking-wider shadow-2xs group-hover:bg-[#087C3C] transition-colors">
              SC
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#17202E] tracking-tight truncate">
                  Sơn Cảng
                </span>
                <span className="hidden sm:inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#F5F7FA] text-[#667085] border border-[#E5E9F0]">
                  YMS
                </span>
              </div>
              <p className="text-[11px] text-[#667085] truncate font-normal hidden sm:block">
                Quản lý bến bãi
              </p>
            </div>
          </Link>

          {/* Separator */}
          <div className="hidden lg:block h-6 w-px bg-[#E5E9F0]" />

          {/* Active Module Indicator (Breadcrumb) */}
          <div className="hidden lg:flex items-center gap-2 text-xs min-w-0">
            <span className="text-[#98A2B3] font-medium">Bãi Sơn Cảng</span>
            <span className="text-[#CBD5E1]">/</span>
            <span className="font-semibold text-[#17202E] flex items-center gap-1.5 truncate">
              <CurrentIcon className="w-4 h-4 text-[#326DD8] shrink-0" />
              <span className="truncate">{currentItem?.name || 'Vận hành'}</span>
            </span>
          </div>
        </div>

        {/* Center: Global Quick Search Trigger */}
        <div className="flex items-center gap-2">
          {/* Quick Search Button (Desktop/Tablet) */}
          <button
            type="button"
            onClick={() => setIsGlobalSearchOpen(true)}
            className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-[#F8F9FB] hover:bg-[#EFF8FF] border border-[#E5E9F0] hover:border-[#B2DDFF] text-xs text-[#667085] hover:text-[#326DD8] transition-all cursor-pointer shadow-2xs"
            title="Tra cứu nhanh toàn bãi (Ctrl + K)"
          >
            <Search className="w-3.5 h-3.5 text-[#326DD8]" />
            <span className="hidden md:inline font-medium">Tra cứu xe, cont, mã vé...</span>
            <span className="md:hidden font-medium">Tra cứu...</span>
            <kbd className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono text-[#667085] bg-white border border-[#E5E9F0] shadow-2xs">
              Ctrl K
            </kbd>
          </button>

          {/* Quick Search Button (Mobile icon) */}
          <button
            type="button"
            onClick={() => setIsGlobalSearchOpen(true)}
            className="sm:hidden p-1.5 rounded-lg text-[#667085] hover:bg-[#F1F4F8] hover:text-[#326DD8] transition-colors"
            title="Tra cứu nhanh toàn bãi"
          >
            <Search className="w-5 h-5 text-[#326DD8]" />
          </button>
        </div>

        {/* Right: Environment, Clock, Yard, User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Subtle Environment Chip */}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F5F7FA] text-[#667085] border border-[#E5E9F0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0A9444]" />
            Bản Thử nghiệm
          </span>

          {/* Live Real-time Clock */}
          {currentTimeStr && (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 bg-[#F8F9FB] border border-[#E5E9F0] rounded-lg text-xs font-mono font-medium text-[#475467]">
              <Clock className="w-3.5 h-3.5 text-[#98A2B3]" />
              <span>{currentTimeStr}</span>
            </div>
          )}

          {/* Yard Location Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F8F9FB] text-[#475467] text-xs font-medium border border-[#E5E9F0]">
            <MapPin className="w-3.5 h-3.5 text-[#0A9444] shrink-0" />
            <span className="truncate max-w-[140px] lg:max-w-none">{user?.yardName || 'Cảng cạn Sơn Cảng'}</span>
          </div>

          {/* User Account / Role Trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="flex items-center gap-2 pl-2 pr-2.5 py-1 rounded-lg border border-[#E5E9F0] hover:bg-[#F8F9FB] transition-all text-xs font-medium text-[#17202E] cursor-pointer"
              title="Thông tin tài khoản"
            >
              <div className="w-6 h-6 rounded-full bg-[#EAF1FD] text-[#326DD8] font-semibold text-[11px] flex items-center justify-center shrink-0">
                {user?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left min-w-0">
                <span className="font-semibold text-xs text-[#17202E] truncate max-w-[120px]">
                  {user?.fullName || 'Người dùng'}
                </span>
                <span className="text-[10px] text-[#667085] truncate max-w-[120px]">
                  {user?.roleName || 'Chưa phân vai trò'}
                </span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${getRoleBadgeColor(role)}`}>
                {user?.roleName || 'Vận hành'}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#98A2B3] shrink-0" />
            </button>

            {/* Dropdown Menu */}
            {showRoleMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-[#E5E9F0] py-2 z-50 animate-in fade-in zoom-in-95">
                <div className="px-3.5 py-2 border-b border-[#F0F2F6]">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-[#98A2B3]">
                    {isDemoMode ? 'Chuyển đổi vai trò ca trực' : 'Tài khoản người dùng'}
                  </div>
                  <div className="text-xs text-[#17202E] font-semibold mt-0.5 truncate">
                    {user?.fullName}
                  </div>
                  <div className="text-[11px] text-[#667085] truncate">
                    {user?.email}
                  </div>
                </div>

                {isDemoMode ? (
                  <div className="py-1 max-h-64 overflow-y-auto">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.roleCode}
                        type="button"
                        onClick={() => {
                          switchDemoRole(acc.roleCode);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs flex flex-col transition-colors hover:bg-[#F8F9FB] cursor-pointer ${
                          role === acc.roleCode ? 'bg-[#EAF1FD] font-semibold text-[#326DD8]' : 'text-[#17202E]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">{acc.roleName}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#ECFDF3] text-[#0A9444] font-medium">
                            Ca trực
                          </span>
                        </div>
                        <span className="text-[11px] text-[#667085] line-clamp-1 mt-0.5">
                          {acc.description}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-xs text-[#667085] space-y-1">
                    <div className="flex items-center gap-1.5 text-[#326DD8] font-semibold">
                      <Lock className="w-3.5 h-3.5" />
                      <span>Phân quyền vị trí công tác</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Quyền hạn và phạm vi bãi làm việc được quản lý tự động theo vị trí và nhiệm vụ đã phân công.
                    </p>
                  </div>
                )}

                <div className="pt-1.5 border-t border-[#F0F2F6] px-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoleMenu(false);
                      setIsChangePasswordOpen(true);
                    }}
                    className="w-full text-left py-1.5 px-2 text-xs text-[#475467] font-medium flex items-center gap-2 hover:text-[#0A9444] hover:bg-[#F8F9FB] rounded-lg transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-[#0A9444]" />
                    <span>Đổi mật khẩu tài khoản</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRoleMenu(false);
                      setShowResetYardModal(true);
                    }}
                    className="w-full text-left py-1.5 px-2 text-xs text-[#B54708] font-medium flex items-center gap-2 hover:bg-[#FEF6EE] rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-[#B54708]" />
                    <span>Khởi tạo bãi trống 100%</span>
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setShowRoleMenu(false);
                      await logout();
                      window.location.href = '/login';
                    }}
                    className="w-full text-left py-1.5 px-2 text-xs text-[#D92D20] font-medium flex items-center gap-2 hover:bg-[#FEF3F2] rounded-lg transition-colors cursor-pointer"
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

      {/* ============================================================== */}
      {/* OFFLINE STATUS BANNER (PWA VÙNG BIÊN GIỚI TÀ LÙNG)             */}
      {/* ============================================================== */}
      {!isOnline && (
        <div className="bg-[#FFFAEB] border-b border-[#FEDF89] px-4 py-2 flex items-center justify-between text-xs text-[#B54708] select-none shrink-0 animate-in slide-in-from-top-1 z-40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#D92D20] animate-ping shrink-0" />
            <span className="font-bold">Cảnh báo Ngoại tuyến:</span>
            <span>Mất kết nối Internet cửa khẩu. Hệ thống đang hoạt động ở chế độ đệm — Vui lòng chờ có mạng trở lại để đồng bộ dữ liệu giao dịch tài chính.</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-[#FEDF89] text-[#B54708]">
            OFFLINE
          </span>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. BODY WORKSPACE WRAPPER (SIDEBAR + MAIN CANVAS)              */}
      {/* ============================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* PRIMARY SIDEBAR (Desktop/Tablet) */}
        <aside
          className={`hidden md:flex flex-col bg-[#F8F9FB] border-r border-[#E5E9F0] shrink-0 transition-all duration-200 z-30 select-none ${
            isSidebarCollapsed ? 'w-16' : 'w-56 lg:w-60'
          }`}
        >
          {/* Sidebar Top: Collapse Toggle & Status */}
          <div className="h-10 border-b border-[#E5E9F0] flex items-center justify-between px-3 shrink-0">
            {!isSidebarCollapsed ? (
              <span className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider">
                Điều hướng
              </span>
            ) : <span />}
            <button
              type="button"
              onClick={toggleSidebar}
              className="p-1 rounded-md text-[#98A2B3] hover:text-[#17202E] hover:bg-[#F1F4F8] transition-colors"
              title={isSidebarCollapsed ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4" />
              ) : (
                <PanelLeftClose className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Navigation Items (Scrollable) */}
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-3">
            {sections.map((sec) => renderNavSection(sec.key, sec.label, isSidebarCollapsed))}

            {allowedItems.length === 0 && !isSidebarCollapsed && (
              <div className="p-3 bg-[#FFFAEB] border border-[#FEDF89] rounded-lg text-xs text-[#B54708] space-y-1">
                <p className="font-semibold">Chưa chọn ca trực</p>
                <p className="text-[11px]">Vui lòng chọn vai trò trực ca ở góc trên để mở các phân hệ làm việc.</p>
              </div>
            )}
          </div>

          {/* Sidebar Footer: Compact User Summary */}
          <div className="border-t border-[#E5E9F0] p-2 bg-white shrink-0">
            {!isSidebarCollapsed ? (
              <div className="flex items-center justify-between gap-2 px-1 py-1">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#17202E] truncate">
                    {user?.fullName || 'Nhân viên trực'}
                  </div>
                  <div className="text-[11px] text-[#667085] truncate">
                    {user?.roleName || 'Chưa phân vai trò'}
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setIsChangePasswordOpen(true)}
                    className="p-1 rounded-md text-[#98A2B3] hover:text-[#0A9444] hover:bg-[#F8F9FB] transition-colors"
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
                    className="p-1 rounded-md text-[#98A2B3] hover:text-[#D92D20] hover:bg-[#FEF3F2] transition-colors"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-1">
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    window.location.href = '/login';
                  }}
                  className="p-2 rounded-md text-[#98A2B3] hover:text-[#D92D20] hover:bg-[#FEF3F2] transition-colors"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* MOBILE SLIDE-OVER DRAWER */}
        {isMobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileOpen(false)}
            />
            <div className="relative flex flex-col w-72 max-w-[85vw] bg-white h-full z-10 shadow-xl border-r border-[#E5E9F0]">
              <div className="h-14 border-b border-[#E5E9F0] flex items-center justify-between px-4 shrink-0 bg-[#F8F9FB]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#0A9444] text-white font-bold text-xs flex items-center justify-center">
                    SC
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-[#17202E]">Sơn Cảng YMS</div>
                    <div className="text-[10px] text-[#667085]">Tà Lùng Quang Minh</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(false)}
                  className="p-1 rounded-md text-[#98A2B3] hover:text-[#17202E]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {sections.map((sec) => renderNavSection(sec.key, sec.label, false))}
              </div>

              <div className="border-t border-[#E5E9F0] p-3 bg-[#F8F9FB] space-y-2 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#17202E]">{user?.fullName}</div>
                    <div className="text-[11px] text-[#667085]">{user?.roleName}</div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await logout();
                      window.location.href = '/login';
                    }}
                    className="p-1.5 rounded-md text-[#D92D20] hover:bg-[#FEF3F2]"
                    title="Đăng xuất"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MAIN WORKSPACE CANVAS (FLEXIBLE CENTRAL AREA) */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-white pb-14 md:pb-0">
          {children}
        </main>
      </div>

      {/* MOBILE PWA BOTTOM NAVIGATION BAR (Thumb-friendly) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-md border-t border-[#E5E9F0] flex items-center justify-around px-1 z-40 select-none pb-safe">
        <Link
          href="/entry"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === '/entry' ? 'text-[#0A9444] font-bold' : 'text-[#667085] hover:text-[#17202E]'
          }`}
        >
          <Truck className="w-4.5 h-4.5" />
          <span className="text-[10px] mt-0.5 font-medium">Cổng vào</span>
        </Link>

        <Link
          href="/yard"
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === '/yard' ? 'text-[#0A9444] font-bold' : 'text-[#667085] hover:text-[#17202E]'
          }`}
        >
          <Layers className="w-4.5 h-4.5" />
          <span className="text-[10px] mt-0.5 font-medium">Bến bãi</span>
          {liveCounts.yardContCount > 0 && (
            <span className="absolute top-1 right-3 px-1 py-0.2 rounded-full bg-[#0A9444] text-white text-[9px] font-bold leading-none">
              {liveCounts.yardContCount}
            </span>
          )}
        </Link>

        <Link
          href="/reefer"
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === '/reefer' ? 'text-[#326DD8] font-bold' : 'text-[#667085] hover:text-[#17202E]'
          }`}
        >
          <Zap className="w-4.5 h-4.5" />
          <span className="text-[10px] mt-0.5 font-medium">Cắm điện</span>
          {liveCounts.reeferActiveCount > 0 && (
            <span className="absolute top-1 right-3 px-1 py-0.2 rounded-full bg-[#B54708] text-white text-[9px] font-bold leading-none">
              {liveCounts.reeferActiveCount}
            </span>
          )}
        </Link>

        <Link
          href="/exit"
          className={`relative flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === '/exit' ? 'text-[#326DD8] font-bold' : 'text-[#667085] hover:text-[#17202E]'
          }`}
        >
          <LogOut className="w-4.5 h-4.5" />
          <span className="text-[10px] mt-0.5 font-medium">Cổng ra</span>
          {liveCounts.exitWaitCount > 0 && (
            <span className="absolute top-1 right-3 px-1 py-0.2 rounded-full bg-[#D92D20] text-white text-[9px] font-bold leading-none">
              {liveCounts.exitWaitCount}
            </span>
          )}
        </Link>

        <Link
          href="/guide"
          className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors ${
            pathname === '/guide' ? 'text-[#0A9444] font-bold' : 'text-[#667085] hover:text-[#17202E]'
          }`}
        >
          <BookOpen className="w-4.5 h-4.5" />
          <span className="text-[10px] mt-0.5 font-medium">Cẩm nang</span>
        </Link>
      </nav>

      {/* MODAL TRA CỨU NHANH TOÀN BÃI (Ctrl + K) */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
      />

      {/* MODAL ĐỔI MẬT KHẨU CÁ NHÂN */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* MODAL XÁC NHẬN KHỞI TẠO BÃI TRỐNG 100% */}
      {showResetYardModal && (
        <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-[#E5E9F0] shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF6EE] border border-[#FEE4E2] flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-[#B54708]" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-[#17202E]">
                  Khởi tạo bãi trống 100% (Clean Yard)
                </h3>
                <p className="text-xs text-[#667085] mt-1 leading-relaxed">
                  Hệ thống sẽ dọn dẹp sạch toàn bộ các lượt xe, container, phiên điện và công nợ thử nghiệm trong bãi, đưa số lượng tồn bãi về <strong>0 phương tiện, 0 container, 0 công nợ</strong> để sẵn sàng đón các lượt xe thực tế đầu tiên.
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#F8F9FB] rounded-xl border border-[#E5E9F0] text-[11px] text-[#667085] space-y-1.5">
              <div className="font-semibold text-[#17202E] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0A9444]" />
                <span>Bảo toàn Danh mục Cấu hình Master:</span>
              </div>
              <ul className="list-disc pl-4 space-y-0.5 text-[#667085]">
                <li>Biểu phí niêm yết 7 loại xe và dịch vụ cảng</li>
                <li>4 Phân khu chức năng bãi và 30 trụ điện 380V</li>
                <li>Danh bạ khách hàng và tài khoản nhân sự</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E9F0]">
              <button
                type="button"
                onClick={() => setShowResetYardModal(false)}
                disabled={isResettingYard}
                className="px-3.5 py-1.5 rounded-lg border border-[#E5E9F0] text-xs font-medium text-[#667085] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleResetYardClean}
                disabled={isResettingYard}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#D92D20] hover:bg-[#B42318] text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResettingYard ? 'animate-spin' : ''}`} />
                <span>{isResettingYard ? 'Đang làm sạch...' : 'Xác nhận Khởi tạo Bãi Trống'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
