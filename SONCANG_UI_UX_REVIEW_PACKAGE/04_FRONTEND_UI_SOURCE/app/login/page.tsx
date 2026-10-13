'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { DEMO_ACCOUNTS, RoleCode } from '@/types/auth.types';
import { ArrowRight, UserCheck, AlertCircle, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { loginWithPassword, loginDemo, isDemoEnabled } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    } else {
      router.push('/yard');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F8FA] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo & Header */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-[#0A9444] flex items-center justify-center text-white font-extrabold text-2xl shadow-md">
            SC
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-black tracking-tight text-[#223873]">
          SƠN CẢNG YMS
        </h2>
        <p className="mt-1 text-center text-xs font-semibold text-slate-500">
          Công ty Cổ phần Tà Lùng Quang Minh — Hệ thống Quản lý Bến bãi & Cảng cạn
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md space-y-4">
        {/* FORM 1: ĐĂNG NHẬP SUPABASE AUTH THẬT */}
        <div className="bg-white py-6 px-4 sm:px-8 shadow-sm rounded-2xl border border-[#E3E8EF] space-y-5">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <ShieldCheck className="w-4 h-4 text-blue-700" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Đăng nhập Tài khoản Hệ thống (Supabase Auth)
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 flex items-start space-x-2 text-xs text-rose-700 font-medium animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700">Email công vụ</label>
              <div className="mt-1">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ví dụ: user@soncang.vn"
                  className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A9444] focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700">Mật khẩu</label>
              <div className="mt-1">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A9444] focus:border-transparent"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#087C3C] hover:bg-[#0A9444] transition-colors focus:outline-none shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Đang xác thực Supabase...' : 'Đăng nhập vào hệ thống'}
            </button>
          </form>

          <div className="text-[11px] text-slate-400 text-center leading-relaxed pt-1">
            Xác thực trực tiếp với Supabase Auth. Vai trò & quyền hạn tải từ bảng phân quyền V5.
          </div>
        </div>

        {/* FORM 2: KHU VỰC TRẢI NGHIỆM GIAO DIỆN (CHẾ ĐỘ MÔ PHỎNG / DEMO) */}
        {isDemoEnabled && (
          <div className="bg-amber-50/60 p-4 sm:p-5 rounded-2xl border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                Môi trường Mô phỏng UI (Demo Mode)
              </span>
              <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-300">
                LocalStorage
              </span>
            </div>
            <p className="text-[11px] text-amber-900 leading-relaxed">
              Dành riêng cho Chủ dự án trải nghiệm trực quan giao diện 4 vai trò V5 mà không cần tạo tài khoản Cloud. Dữ liệu độc lập trong trình duyệt:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.roleCode}
                  type="button"
                  onClick={() => handleSelectDemo(acc.roleCode)}
                  className="flex flex-col text-left p-2.5 rounded-xl border border-amber-200 bg-white hover:border-[#0A9444] hover:bg-emerald-50/50 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold text-xs text-slate-900 group-hover:text-[#0A9444]">
                      {acc.roleName}
                    </span>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-[#0A9444] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                    {acc.fullName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
