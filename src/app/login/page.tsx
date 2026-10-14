'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { DEMO_ACCOUNTS, RoleCode } from '@/types/auth.types';
import { 
  ArrowRight, 
  UserCheck, 
  AlertCircle, 
  ShieldCheck, 
  ShieldAlert, 
  Lock, 
  Mail, 
  KeyRound, 
  Sparkles,
  Database,
  Eye,
  EyeOff
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithPassword, loginDemo, isDemoEnabled } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    const res = await loginWithPassword(email, password);
    setIsSubmitting(false);

    if (res.success) {
      router.push('/');
    } else {
      setErrorMsg(res.error || 'Đăng nhập không thành công.');
    }
  };

  const handleSelectDemo = (roleCode: RoleCode) => {
    loginDemo(roleCode);
    if (roleCode === 'SEC_STAFF' || roleCode === 'SEC_LEAD') {
      router.push('/entry');
    } else if (roleCode === 'PORT_STAFF' || roleCode === 'PORT_LEAD') {
      router.push('/reefer');
    } else if (roleCode === 'SYS_ADMIN') {
      router.push('/dashboard');
    } else {
      router.push('/yard');
    }
  };

  // Màu sắc và nhãn theo từng nhóm vai trò V5
  const getRoleVisual = (roleCode: RoleCode) => {
    switch (roleCode) {
      case 'SEC_STAFF':
      case 'SEC_LEAD':
        return {
          border: 'border-emerald-200 hover:border-emerald-500',
          bg: 'bg-emerald-50/40 hover:bg-emerald-50',
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          tag: 'An ninh Cổng',
          dot: 'bg-emerald-500',
        };
      case 'PORT_STAFF':
      case 'PORT_LEAD':
        return {
          border: 'border-amber-200 hover:border-amber-500',
          bg: 'bg-amber-50/40 hover:bg-amber-50',
          badge: 'bg-amber-100 text-amber-800 border-amber-300',
          tag: 'Thương vụ CCKB',
          dot: 'bg-amber-500',
        };
      case 'DIS_STAFF':
      case 'DIS_LEAD':
        return {
          border: 'border-blue-200 hover:border-blue-500',
          bg: 'bg-blue-50/40 hover:bg-blue-50',
          badge: 'bg-blue-100 text-blue-800 border-blue-300',
          tag: 'Điều phối Bãi',
          dot: 'bg-blue-500',
        };
      case 'SYS_ADMIN':
      default:
        return {
          border: 'border-purple-200 hover:border-purple-500',
          bg: 'bg-purple-50/40 hover:bg-purple-50',
          badge: 'bg-purple-100 text-purple-800 border-purple-300',
          tag: 'Quản trị viên',
          dot: 'bg-purple-500',
        };
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FA] flex flex-col justify-center py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center space-y-1.5">
        {/* Logo & Header */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0A9444] flex items-center justify-center text-white font-black text-2xl shadow-md border-2 border-emerald-400">
            SC
          </div>
        </div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#223873]">
          Phần mềm Quản lý Bến bãi Sơn Cảng
        </h2>
        <p className="text-xs font-semibold text-slate-500">
          Công ty Cổ phần Tà Lùng Quang Minh — Hệ thống Vận hành Cảng cạn & Bến bãi V5
        </p>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 mt-1">
          <Database className="w-3 h-3 text-emerald-600" />
          <span>Kết nối Trực tiếp Supabase Cloud Database (PostgreSQL RLS)</span>
        </div>
      </div>

      <div className="mt-5 sm:mx-auto sm:w-full sm:max-w-2xl space-y-4">
        {/* KHỐI 1: ĐĂNG NHẬP NHANH THEO VAI TRÒ CA TRỰC (1-CHẠM) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                <Sparkles className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  Đăng nhập nhanh theo Vai trò Ca trực (1 chạm)
                </h3>
                <span className="text-[11px] text-slate-500">
                  Chọn vị trí làm việc để hệ thống tự động phân quyền chuẩn RBAC V5:
                </span>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full shrink-0">
              UAT / Vận hành
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {DEMO_ACCOUNTS.map((acc) => {
              const visual = getRoleVisual(acc.roleCode);

              return (
                <button
                  key={acc.roleCode}
                  type="button"
                  onClick={() => handleSelectDemo(acc.roleCode)}
                  className={`flex flex-col text-left p-3 rounded-xl border transition-all cursor-pointer group shadow-2xs ${visual.border} ${visual.bg}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${visual.dot}`}></span>
                      <span className="font-bold text-xs text-slate-900 group-hover:text-[#0A9444]">
                        {acc.roleName}
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${visual.badge}`}>
                      {acc.roleCode}
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold text-slate-700 mt-1">
                    {acc.fullName}
                  </span>

                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">
                    {acc.description}
                  </p>

                  <div className="flex items-center justify-between w-full pt-1.5 mt-1 border-t border-slate-200/50 text-[10px] text-slate-400 group-hover:text-[#0A9444]">
                    <span>{visual.tag}</span>
                    <span className="flex items-center gap-0.5 font-bold">
                      Vào việc ngay <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* KHỐI 2: ĐĂNG NHẬP BẰNG TÀI KHOẢN CÔNG VỤ (EMAIL & MẬT KHẨU) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-700" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Hoặc Đăng nhập bằng Mật khẩu (Supabase Auth)
              </h3>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Bảo mật SSL</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-700 font-medium animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email công vụ</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ví dụ: sec_gate_01@soncang.vn"
                    className="block w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A9444] focus:border-transparent font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mật khẩu</label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-8 pr-9 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A9444] focus:border-transparent font-mono"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5a] transition-colors focus:outline-none shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Đang xác thực Supabase...' : 'Đăng nhập bằng Mật khẩu'}</span>
            </button>

            <p className="text-[11px] text-center text-slate-400 pt-1 leading-relaxed">
              Quên hoặc cần cấp lại mật khẩu ca trực? Vui lòng liên hệ <strong>Trưởng bộ phận</strong> hoặc <strong>SYS_ADMIN</strong> để được đặt lại mật khẩu tức thì tại hệ thống.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
