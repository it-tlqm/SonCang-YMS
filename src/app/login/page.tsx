'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { 
  AlertCircle, 
  ShieldCheck, 
  Mail, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Building2, 
  CheckCircle2, 
  LogIn,
  Lock
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
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-xl bg-[#0A9444] flex items-center justify-center text-white font-extrabold text-xl shadow-xs border border-emerald-500">
              SC
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17202E]">
              Sơn Cảng
            </h1>
            <p className="text-xs font-semibold text-[#667085] mt-0.5">
              Phần mềm Quản lý Bến bãi & Cảng cạn
            </p>
            <p className="text-[11px] text-[#98A2B3]">
              Công ty Cổ phần Tà Lùng Quang Minh — Phiên bản V5
            </p>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-[#EAF1FD] text-[#326DD8] border border-[#E5E9F0]">
            <Lock className="w-3.5 h-3.5 text-[#326DD8]" />
            <span>Xác thực Tập trung &bull; Bảo mật Phân quyền RBAC</span>
          </div>
        </div>

        {/* Card Đăng nhập DS-02 */}
        <div className="mt-6 bg-[#FFFFFF] p-6 sm:p-8 rounded-xl border border-[#E5E9F0] shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E9F0]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#EAF1FD] text-[#326DD8] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-[#326DD8]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#17202E]">
                  Đăng nhập Tài khoản Công vụ
                </h2>
                <p className="text-[11px] text-[#667085]">
                  Xác thực danh tính ca trực bến bãi
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] text-[#0A9444] bg-[#0A9444]/10 px-2 py-0.5 rounded-md font-semibold border border-[#0A9444]/20">
              <CheckCircle2 className="w-3 h-3 text-[#0A9444]" />
              An toàn
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] flex items-start space-x-2 text-xs text-[#D92D20]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#D92D20]" />
                <span className="font-medium">{errorMsg}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-[#17202E] mb-1.5">
                Email công vụ <span className="text-[#D92D20]">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="it@talunglogistics.com"
                  autoComplete="email"
                  className="block w-full pl-10 pr-3.5 h-10 text-xs sm:text-sm border border-[#E5E9F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#326DD8] focus:border-transparent font-normal text-[#17202E] bg-[#FFFFFF] transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-[#17202E] mb-1.5">
                Mật khẩu ca trực <span className="text-[#D92D20]">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="block w-full pl-10 pr-10 h-10 text-xs sm:text-sm border border-[#E5E9F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#326DD8] focus:border-transparent font-normal text-[#17202E] bg-[#FFFFFF] transition-colors"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#17202E] p-1 cursor-pointer"
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
              className="w-full flex justify-center items-center gap-2 h-10 px-4 rounded-lg text-xs sm:text-sm font-semibold text-white bg-[#0A9444] hover:bg-[#087C3C] active:bg-[#06632c] transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A9444] focus:ring-offset-2 shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang xác thực tài khoản...</span>
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
          <div className="pt-3.5 border-t border-[#E5E9F0] space-y-2">
            <div className="flex items-start gap-2 text-[11px] text-[#667085] leading-relaxed">
              <Building2 className="w-4 h-4 text-[#98A2B3] shrink-0 mt-0.5" />
              <span>
                Tài khoản công vụ được cấp bởi <strong>Ban Quản trị Hệ thống TLQM</strong> theo đúng vị trí và ca trực được phê duyệt.
              </span>
            </div>
            <p className="text-[11px] text-[#98A2B3] text-center pt-1">
              Cần cấp tài khoản hoặc khôi phục mật khẩu? Vui lòng liên hệ IT qua email:{' '}
              <a href="mailto:it@talunglogistics.com" className="font-semibold text-[#326DD8] hover:underline">
                it@talunglogistics.com
              </a>
            </p>
          </div>
        </div>

        {/* Footer Bản quyền */}
        <p className="text-center text-[11px] text-[#98A2B3] mt-6">
          &copy; 2026 Công ty Cổ phần Tà Lùng Quang Minh. Bảo lưu mọi quyền.
        </p>
      </div>
    </div>
  );
}
