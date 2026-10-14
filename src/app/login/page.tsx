'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { 
  AlertCircle, 
  ShieldCheck, 
  Mail, 
  KeyRound, 
  Database,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  LogIn
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ Email công vụ và Mật khẩu.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    const res = await loginWithPassword(cleanEmail, password);
    setIsSubmitting(false);

    if (res.success) {
      // Điều hướng trực tiếp theo vai trò nghiệp vụ thực tế
      const role = res.roleCode;
      if (role === 'SEC_STAFF' || role === 'SEC_LEAD') {
        router.push('/entry');
      } else if (role === 'PORT_STAFF' || role === 'PORT_LEAD') {
        router.push('/reefer');
      } else if (role === 'DIS_STAFF' || role === 'DIS_LEAD') {
        router.push('/yard');
      } else if (role === 'ACCOUNTANT') {
        router.push('/accounting');
      } else {
        router.push('/dashboard');
      }
    } else {
      setErrorMsg(
        res.error?.includes('Invalid login credentials')
          ? 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.'
          : res.error || 'Đăng nhập không thành công. Vui lòng kiểm tra lại kết nối mạng.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-[#F5F8FA] to-slate-200 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* Container chính căn giữa */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo & Định vị thương hiệu */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[#0A9444] flex items-center justify-center text-white font-black text-2xl shadow-lg border-2 border-emerald-400">
              SC
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#223873]">
            Phần mềm Quản lý Bến bãi Sơn Cảng
          </h1>
          <p className="text-xs font-semibold text-slate-500 max-w-sm mx-auto">
            Công ty Cổ phần Tà Lùng Quang Minh — Hệ thống Vận hành Cảng cạn & Bến bãi V5
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 mt-2 shadow-2xs">
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Supabase Cloud Database &bull; Bảo mật PostgreSQL RLS</span>
          </div>
        </div>

        {/* Khối Card Đăng nhập duy nhất */}
        <div className="mt-6 bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-md space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-50 text-blue-700">
                <ShieldCheck className="w-5 h-5 text-[#223873]" />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
                  Đăng nhập Tài khoản Công vụ
                </h2>
                <p className="text-[11px] text-slate-500">
                  Hệ thống phân quyền thời gian thực RBAC V5
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              SSL 256-bit
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-700 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email công vụ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="it@talunglogistics.com"
                  autoComplete="email"
                  className="block w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A9444] focus:border-transparent font-medium text-slate-900 bg-slate-50/50 focus:bg-white transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Mật khẩu ca trực <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="block w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A9444] focus:border-transparent font-medium text-slate-900 bg-slate-50/50 focus:bg-white transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Nút Đăng nhập */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0A9444] hover:bg-[#087b38] active:bg-[#06632c] transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xác thực Supabase...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Đăng nhập Hệ thống</span>
                </>
              )}
            </button>
          </form>

          {/* Hướng dẫn và Hỗ trợ kỹ thuật */}
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Tài khoản công vụ được khởi tạo và phân quyền bởi <strong>Ban Quản trị Hệ thống TLQM</strong> theo đúng vị trí ca trực.
              </span>
            </div>
            <p className="text-[11px] text-slate-400 text-center pt-1">
              Cần cấp tài khoản hoặc khôi phục mật khẩu? Vui lòng liên hệ IT Quản trị qua email:{' '}
              <a href="mailto:it@talunglogistics.com" className="font-semibold text-emerald-700 hover:underline">
                it@talunglogistics.com
              </a>
            </p>
          </div>
        </div>

        {/* Footer Bản quyền */}
        <p className="text-center text-[11px] text-slate-400 mt-6">
          &copy; 2026 Công ty Cổ phần Tà Lùng Quang Minh. Bảo lưu mọi quyền.
        </p>
      </div>
    </div>
  );
}
