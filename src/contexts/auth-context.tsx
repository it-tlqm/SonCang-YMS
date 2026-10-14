'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, RoleCode, AuthMode, DepartmentCode, DEMO_ACCOUNTS } from '@/types/auth.types';
import { hasPermission, ROLE_PERMISSIONS_V5 } from '@/lib/rbac-rules';
import { createClient } from '@/lib/supabase/client';
import { IYardRepository, getYardRepository } from '@/lib/services/yard-service';

interface AuthContextType {
  user: UserProfile | null;
  role: RoleCode | null;
  yardId: string;
  isDemoMode: boolean;
  isDemoEnabled: boolean;
  authMode: AuthMode;
  isLoading: boolean;
  repository: IYardRepository;
  can: (permissionCode: string) => boolean;
  switchDemoRole: (roleCode: RoleCode) => void;
  loginDemo: (roleCode: RoleCode) => void;
  loginWithPassword: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const DEFAULT_YARD_ID = '20000000-0000-0000-0000-000000000001';
const DEFAULT_YARD_NAME = 'Bãi 1 — Cảng cạn Sơn Cảng';

// Cờ cho phép Demo Mode: Mặc định LUÔN BẬT trong giai đoạn vận hành thử nghiệm / UAT của Sơn Cảng
// Cho phép nhân viên và ca trưởng đăng nhập 1 chạm theo vai trò kiểm thử quy trình
const IS_DEMO_ENABLED = process.env.NEXT_PUBLIC_DISABLE_DEMO_MODE !== 'true';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Tải UserProfile đầy đủ từ Supabase bằng RPC sc_my_permissions() chính thức theo SC-R3-07
 */
async function fetchRealUserProfile(
  supabase: ReturnType<typeof createClient>,
  authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }
): Promise<UserProfile> {
  let resolvedRole: RoleCode | null = null;
  let resolvedRoleName = 'Chưa phân vai trò';
  let resolvedYardId = '';
  let resolvedYardName = 'Bãi Sơn Cảng';
  let resolvedDepartmentCode: DepartmentCode | null = null;
  const resolvedDepartmentName = 'Chưa phân bộ phận';
  let resolvedPermissions: string[] = [];

  try {
    // 1. Tìm bãi Sơn Cảng thực tế làm mặc định hệ thống cho tài khoản
    const { data: defaultYard } = await supabase
      .from('app_yards')
      .select('id, name')
      .eq('name', 'Bãi Sơn Cảng')
      .eq('is_active', true)
      .maybeSingle();

    if (defaultYard) {
      resolvedYardId = defaultYard.id;
      resolvedYardName = defaultYard.name;
    } else {
      const { data: firstActiveYard } = await supabase
        .from('app_yards')
        .select('id, name')
        .eq('is_active', true)
        .order('name', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (firstActiveYard) {
        resolvedYardId = firstActiveYard.id;
        resolvedYardName = firstActiveYard.name;
      }
    }

    const { data: assignments } = await supabase
      .from('app_user_role_assignments')
      .select('role_code, yard_id, department_code, is_active')
      .eq('user_id', authUser.id)
      .eq('is_active', true);

    if (assignments && (assignments as unknown as { role_code: string; yard_id: string | null; department_code: string | null }[]).length > 0) {
      const list = assignments as unknown as { role_code: string; yard_id: string | null; department_code: string | null }[];
      const first = list[0];
      resolvedRole = first.role_code as RoleCode;
      resolvedRoleName = `Vai trò: ${first.role_code}`;
      
      // Nếu có yard_id cụ thể trong phân quyền, sử dụng yard_id đó
      if (first.yard_id) {
        resolvedYardId = first.yard_id;
        const { data: specificYard } = await supabase
          .from('app_yards')
          .select('name')
          .eq('id', first.yard_id)
          .maybeSingle();
        if (specificYard?.name) {
          resolvedYardName = specificYard.name;
        }
      }
      // Nếu first.yard_id là null (như SYS_ADMIN phạm vi ALL), resolvedYardId đã được gán là bãi Sơn Cảng thật ở trên
      
      if (first.department_code) resolvedDepartmentCode = first.department_code as DepartmentCode;

      // Lấy danh sách quyền thực tế bằng RPC sc_my_permissions() chính thức theo SC-R3-07
      const { data: permsRpc, error: rpcError } = await supabase.rpc('sc_my_permissions');
      if (rpcError) {
        console.error('Lỗi gọi sc_my_permissions:', rpcError);
        resolvedPermissions = [];
      } else if (permsRpc && Array.isArray(permsRpc)) {
        resolvedPermissions = Array.from(
          new Set(
            (permsRpc as { permission_code: string }[])
              .map((p) => p.permission_code)
              .filter(Boolean)
          )
        );
      }
    }
  } catch (assignErr) {
    console.warn('Không thể đọc assignments/permissions từ database:', assignErr);
    resolvedPermissions = [];
  }

  return {
    id: authUser.id,
    email: authUser.email || '',
    fullName: (authUser.user_metadata?.full_name as string) || authUser.email?.split('@')[0] || 'Nhân viên',
    roleCode: resolvedRole,
    roleName: resolvedRoleName,
    departmentCode: resolvedDepartmentCode,
    departmentName: resolvedDepartmentName,
    yardId: resolvedYardId,
    yardName: resolvedYardName,
    permissions: resolvedPermissions,
    authMode: 'REAL',
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') {
      const account = DEMO_ACCOUNTS[0];
      return {
        id: account.id,
        email: account.email,
        fullName: account.fullName,
        roleCode: account.roleCode,
        roleName: account.roleName,
        departmentCode: account.departmentCode,
        departmentName: account.departmentName,
        yardId: DEFAULT_YARD_ID,
        yardName: DEFAULT_YARD_NAME,
        permissions: ROLE_PERMISSIONS_V5[account.roleCode] || [],
        authMode: 'DEMO',
      };
    }

    const savedMode = (localStorage.getItem('soncang_v5_auth_mode') as AuthMode) || 'DEMO';
    
    // Nếu ở Demo Mode và Demo Mode được kích hoạt
    if (savedMode === 'DEMO' && IS_DEMO_ENABLED) {
      const savedRole = (localStorage.getItem('soncang_v5_demo_role') as RoleCode) || 'SEC_STAFF';
      const account = DEMO_ACCOUNTS.find(a => a.roleCode === savedRole) || DEMO_ACCOUNTS[0];
      return {
        id: account.id,
        email: account.email,
        fullName: account.fullName,
        roleCode: account.roleCode,
        roleName: account.roleName,
        departmentCode: account.departmentCode,
        departmentName: account.departmentName,
        yardId: DEFAULT_YARD_ID,
        yardName: DEFAULT_YARD_NAME,
        permissions: ROLE_PERMISSIONS_V5[account.roleCode] || [],
        authMode: 'DEMO',
      };
    }

    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Khôi phục session thật sau khi tải lại trang và lắng nghe thay đổi session (SC-R3-07)
  useEffect(() => {
    let isMounted = true;
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
    } catch {
      // Bỏ qua nếu thiếu biến môi trường trong môi trường build/test tĩnh
      return;
    }

    const initAuth = async () => {
      const savedMode = (localStorage.getItem('soncang_v5_auth_mode') as AuthMode) || 'DEMO';
      if (savedMode === 'REAL' && supabase) {
        setIsLoading(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && isMounted) {
            const profile = await fetchRealUserProfile(supabase, session.user);
            if (isMounted) setUser(profile);
          } else if (isMounted) {
            localStorage.removeItem('soncang_v5_auth_mode');
            setUser(null);
          }
        } catch (err) {
          console.error('Lỗi khôi phục session thật:', err);
          if (isMounted) setUser(null);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const savedMode = localStorage.getItem('soncang_v5_auth_mode');
      if (savedMode === 'REAL' && supabase) {
        if (event === 'SIGNED_OUT' || !session) {
          if (isMounted) setUser(null);
        } else if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session.user) {
          const profile = await fetchRealUserProfile(supabase, session.user);
          if (isMounted) setUser(profile);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Chuyển đổi vai trò trong Demo Mode
  const switchDemoRole = (roleCode: RoleCode) => {
    if (!IS_DEMO_ENABLED) {
      console.warn('Demo Mode bị tắt trong cấu hình.');
      return;
    }
    if (user?.authMode === 'REAL') {
      console.warn('Không thể chuyển đổi vai trò demo khi đang đăng nhập tài khoản Supabase thật.');
      return;
    }

    const account = DEMO_ACCOUNTS.find(a => a.roleCode === roleCode);
    if (!account) return;

    const newUser: UserProfile = {
      id: account.id,
      email: account.email,
      fullName: account.fullName,
      roleCode: account.roleCode,
      roleName: account.roleName,
      departmentCode: account.departmentCode,
      departmentName: account.departmentName,
      yardId: DEFAULT_YARD_ID,
      yardName: DEFAULT_YARD_NAME,
      permissions: ROLE_PERMISSIONS_V5[account.roleCode] || [],
      authMode: 'DEMO',
    };

    setUser(newUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem('soncang_v5_auth_mode', 'DEMO');
      localStorage.setItem('soncang_v5_demo_role', roleCode);
    }
  };

  const loginDemo = (roleCode: RoleCode) => {
    switchDemoRole(roleCode);
  };

  /**
   * Đăng nhập thật qua Supabase Auth:
   * TUYỆT ĐỐI KHÔNG FALLBACK bypass mật khẩu sang tài khoản Demo!
   * Tải roles và permissions từ Backend V5 thật qua RPC sc_my_permissions().
   */
  const loginWithPassword = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error || !data.user) {
        setIsLoading(false);
        return {
          success: false,
          error: error?.message || 'Email hoặc mật khẩu không chính xác trên Supabase Auth.',
        };
      }

      // Đăng nhập Supabase thành công -> Đọc thông tin phân quyền thật từ backend
      const realUser = await fetchRealUserProfile(supabase, data.user);

      setUser(realUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('soncang_v5_auth_mode', 'REAL');
        localStorage.removeItem('soncang_v5_demo_role');
      }
      setIsLoading(false);
      return { success: true };
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối máy chủ Supabase';
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      if (user?.authMode === 'REAL') {
        const supabase = createClient();
        await supabase.auth.signOut();
      }
    } catch {
      // bỏ qua lỗi signout nếu network trục trặc
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem('soncang_v5_auth_mode');
      localStorage.removeItem('soncang_v5_demo_role');

      // Gửi thông điệp dọn cache nhạy cảm đến Service Worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
      }

      setUser(null);
      window.location.href = '/login';
    } else {
      setUser(null);
    }
  };


  const can = (permissionCode: string): boolean => {
    return hasPermission(user?.roleCode, permissionCode, user?.permissions);
  };

  const authMode: AuthMode = user?.authMode || 'DEMO';
  const isDemoMode = authMode === 'DEMO';
  // Luôn kết nối Supabase Cloud thực tế khi có cấu hình Supabase URL hoặc cờ REAL_WRITE
  const repository = getYardRepository(
    authMode === 'REAL' || process.env.NEXT_PUBLIC_ENABLE_REAL_WRITE === 'true' || Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
      ? 'SUPABASE'
      : 'DEMO'
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.roleCode || null,
        yardId: user?.yardId || DEFAULT_YARD_ID,
        isDemoMode,
        isDemoEnabled: IS_DEMO_ENABLED,
        authMode,
        isLoading,
        repository,
        can,
        switchDemoRole,
        loginDemo,
        loginWithPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
