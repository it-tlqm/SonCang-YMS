'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export default function HomePage() {
  const { user, role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }

      // Điều hướng theo vai trò nghiệp vụ V5
      switch (role) {
        case 'SEC_STAFF':
        case 'SEC_LEAD':
          router.replace('/entry');
          break;
        case 'SYS_ADMIN':
        case 'PORT_LEAD':
          router.replace('/dashboard');
          break;
        case 'DIS_STAFF':
        case 'DIS_LEAD':
        case 'PORT_STAFF':
        default:
          router.replace('/yard');
          break;
      }
    }

    // Fallback bảo hiểm sau 1200ms nếu state isLoading bị kẹt
    const timer = setTimeout(() => {
      if (!user) {
        router.replace('/login');
      } else {
        router.replace('/dashboard');
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [user, role, isLoading, router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-semibold text-slate-500">Đang tải phân quyền Sơn Cảng...</span>
      </div>
    </div>
  );
}
