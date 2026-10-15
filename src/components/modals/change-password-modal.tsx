'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { createClient } from '@/lib/supabase/client';
import { 
  Lock, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  ShieldCheck,
  Sparkles
} from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const { user, repository } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Đánh giá độ mạnh mật khẩu
  const hasMinLength = newPassword.length >= 6;
  const hasNumber = /\d/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!hasMinLength) {
      setErrorMsg('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp với mật khẩu mới.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (user?.authMode === 'REAL') {
        const supabase = createClient();
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          throw new Error(error.message);
        }

        // Ghi vết audit log
        await repository.recordPasswordChangeAudit(
          user.email,
          'Người dùng chủ động đổi mật khẩu qua giao diện PWA'
        );
      } else {
        // Tài khoản UAT / Demo
        await repository.recordPasswordChangeAudit(
          user?.email || 'demo@soncang.vn',
          'Đổi mật khẩu tài khoản ca trực UAT'
        );
        // Lưu tạm vào localStorage
        if (typeof window !== 'undefined' && user?.email) {
          localStorage.setItem(`soncang_user_pwd_${user.email}`, newPassword);
        }
      }

      setSuccessMsg('Đổi mật khẩu thành công! Mật khẩu mới có hiệu lực ngay lập tức.');
      setTimeout(() => {
        setNewPassword('');
        setConfirmPassword('');
        setSuccessMsg('');
        onClose();
      }, 1800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật mật khẩu';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#E5E9F0] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 -mx-5 px-5 -mt-1">
          <div>
            <span className="text-[10px] font-bold text-[#0A9444] uppercase tracking-wider block">
              Tài khoản & Bảo mật
            </span>
            <h3 className="text-sm font-bold text-[#17202E] flex items-center gap-1.5 mt-0.5">
              <KeyRound className="w-4 h-4 text-[#0A9444]" />
              Đổi mật khẩu tài khoản
            </h3>
            <p className="text-[11px] text-[#667085] mt-0.5">
              Áp dụng cho: <strong className="text-[#17202E]">{user?.fullName || user?.email}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#667085] hover:text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {errorMsg && (
            <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] rounded-lg text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#D92D20]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-[#E7F6EC] border border-[#A6E3B8] text-[#0A9444] rounded-lg text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0A9444]" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Ô nhập Mật khẩu mới */}
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự..."
                className="w-full pl-3 pr-9 py-2 border border-[#D0D5DD] rounded-lg text-xs font-mono font-medium text-[#17202E] focus:outline-none focus:ring-2 focus:ring-[#0A9444]/20 focus:border-[#0A9444] bg-white transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] cursor-pointer p-0.5"
                title={showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Ô xác nhận Mật khẩu mới */}
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới..."
                className={`w-full pl-3 pr-9 py-2 border rounded-lg text-xs font-mono font-medium text-[#17202E] focus:outline-none focus:ring-2 bg-white transition-all ${
                  confirmPassword && !isMatch 
                    ? 'border-[#FDA29B] focus:ring-[#FDA29B]/20 focus:border-[#F04438]' 
                    : 'border-[#D0D5DD] focus:ring-[#0A9444]/20 focus:border-[#0A9444]'
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] cursor-pointer p-0.5"
                title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && !isMatch && (
              <span className="text-[11px] text-[#D92D20] mt-1 block">
                Mật khẩu xác nhận chưa khớp.
              </span>
            )}
          </div>

          {/* Tiêu chuẩn an toàn mật khẩu */}
          <div className="p-3 bg-[#F8F9FB] rounded-xl border border-[#E5E9F0] space-y-1.5 text-[11px] text-[#475467]">
            <span className="font-bold text-[#344054] block text-[10px] uppercase tracking-wider">
              Yêu cầu bảo mật:
            </span>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-[#0A9444]' : 'bg-[#D0D5DD]'}`} />
              <span className={hasMinLength ? 'text-[#0A9444] font-semibold' : ''}>
                Độ dài tối thiểu từ 6 ký tự
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${hasNumber ? 'bg-[#0A9444]' : 'bg-[#D0D5DD]'}`} />
              <span className={hasNumber ? 'text-[#0A9444] font-semibold' : ''}>
                Có chứa ít nhất một chữ số (0-9)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${hasUpper ? 'bg-[#0A9444]' : 'bg-[#D0D5DD]'}`} />
              <span className={hasUpper ? 'text-[#0A9444] font-semibold' : ''}>
                Nên có chữ cái in hoa (A-Z) để tăng tính bảo mật
              </span>
            </div>
          </div>

          {/* MODAL ACTIONS */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E9F0] -mx-5 px-5 -mb-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2 px-4 text-xs font-semibold text-[#344054] bg-white hover:bg-[#F8F9FB] rounded-lg border border-[#D0D5DD] transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasMinLength || !isMatch}
              className="py-2 px-4 text-xs font-semibold text-white bg-[#0A9444] hover:bg-[#087a38] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang cập nhật...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Xác nhận đổi mật khẩu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
