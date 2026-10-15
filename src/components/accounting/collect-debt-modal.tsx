'use client';

import React, { useState } from 'react';
import { IYardRepository } from '@/lib/services/repository-interface';
import { AccountingDebtItem, PaymentMethod } from '@/types/domain.types';
import { formatCurrency, formatDateTime } from '@/lib/display-formatters';
import { 
  X, 
  CreditCard, 
  Banknote, 
  Building, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText,
  ShieldAlert
} from 'lucide-react';

interface CollectDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtItem: AccountingDebtItem | null;
  repository: IYardRepository;
  onSuccess: () => void;
}

export function CollectDebtModal({
  isOpen,
  onClose,
  debtItem,
  repository,
  onSuccess
}: CollectDebtModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [amountInput, setAmountInput] = useState<string>(debtItem ? String(debtItem.debt_amount) : '');
  const [receiptCode, setReceiptCode] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Cập nhật khi debtItem thay đổi
  React.useEffect(() => {
    if (debtItem) {
      setAmountInput(String(debtItem.debt_amount));
      setErrorMessage('');
      setNotes(`Kế toán thu nợ bến bãi cho xe ${debtItem.license_plate || debtItem.container_no || ''}`);
    }
  }, [debtItem]);

  if (!isOpen || !debtItem) return null;

  const collectAmount = Number(amountInput) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (collectAmount <= 0) {
      setErrorMessage('Số tiền thu nợ phải lớn hơn 0 VNĐ.');
      return;
    }

    if (collectAmount > debtItem.debt_amount) {
      setErrorMessage(`Số tiền thu nợ (${formatCurrency(collectAmount)}) không được vượt quá dư nợ hiện tại (${formatCurrency(debtItem.debt_amount)}).`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await repository.collectAccountingDebt({
        chargeId: debtItem.charge_id,
        amount: collectAmount,
        paymentMethod,
        receiptCode: receiptCode.trim() || undefined,
        notes: notes.trim() || undefined
      });

      if (!res.success) {
        throw new Error(res.error || 'Thu hồi công nợ thất bại');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi thu hồi công nợ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-[#E5E9F0] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 -mx-5 px-5 -mt-1">
          <div>
            <span className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider block">
              Kế toán Bến bãi
            </span>
            <h2 className="text-sm font-bold text-[#17202E] flex items-center gap-1.5 mt-0.5">
              <CreditCard className="w-4 h-4 text-[#D97706]" />
              Thu Hồi Công Nợ Bến Bãi (AP07)
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#667085] hover:text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] rounded-lg flex items-start gap-2.5 text-[#B42318] text-xs font-semibold">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-[#D92D20]" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Thông tin hồ sơ nợ */}
          <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#78350F]">Khách hàng / Chủ cont:</span>
              <span className="font-bold text-[#17202E]">{debtItem.customer_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#78350F]">Biển số / Số Container:</span>
              <span className="font-mono font-bold text-[#326DD8]">
                {debtItem.container_no || debtItem.license_plate || '---'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#78350F]">Nội dung phí nợ:</span>
              <span className="text-[#344054]">{debtItem.charge_title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#78350F]">Người duyệt bảo lãnh xuất bãi:</span>
              <span className="font-medium text-[#344054]">{debtItem.guarantor_name || 'Trưởng ca'}</span>
            </div>
            <div className="flex items-center justify-between border-t border-[#FDE68A] pt-2 mt-1">
              <span className="font-bold text-[#92400E]">DƯ NỢ CẦN THU:</span>
              <span className="font-mono font-black text-[#B45309] text-base">
                {formatCurrency(debtItem.debt_amount)}
              </span>
            </div>
          </div>

          {/* Phương thức thanh toán */}
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1.5">
              Hình thức khách thanh toán <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${paymentMethod === 'CASH' ? 'border-[#0A9444] bg-[#0A9444]/5 ring-2 ring-[#0A9444]/20' : 'border-[#D0D5DD] hover:bg-[#F8F9FB]'}`}
              >
                <div className="p-2 bg-[#E7F6EC] text-[#0A9444] rounded-lg">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-[#17202E] block text-xs">Tiền Mặt</span>
                  <span className="text-[10px] text-[#667085]">Kế toán thu trực tiếp</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('TRANSFER')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${paymentMethod === 'TRANSFER' ? 'border-[#326DD8] bg-[#326DD8]/5 ring-2 ring-[#326DD8]/20' : 'border-[#D0D5DD] hover:bg-[#F8F9FB]'}`}
              >
                <div className="p-2 bg-[#EFF4FE] text-[#326DD8] rounded-lg">
                  <Building className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-[#17202E] block text-xs">Chuyển Khoản</span>
                  <span className="text-[10px] text-[#667085]">VietQR / TK Công ty</span>
                </div>
              </button>
            </div>
          </div>

          {/* Số tiền thu */}
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Số tiền thu đợt này (VNĐ) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="1000"
              required
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-lg text-base font-mono font-bold text-[#17202E] focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
            />
            <div className="flex justify-between text-[11px] text-[#667085] mt-1">
              <span>Còn lại sau khi thu: <strong className="text-[#17202E]">{formatCurrency(Math.max(0, debtItem.debt_amount - collectAmount))}</strong></span>
              <button
                type="button"
                onClick={() => setAmountInput(String(debtItem.debt_amount))}
                className="text-[#D97706] hover:underline font-bold cursor-pointer"
              >
                Thu hết công nợ
              </button>
            </div>
          </div>

          {/* Mã giao dịch / Biên lai */}
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              {paymentMethod === 'TRANSFER' ? 'Mã tham chiếu ngân hàng (FT/Mã sao kê)' : 'Số phiếu thu tiền mặt'}
            </label>
            <input
              type="text"
              placeholder={paymentMethod === 'TRANSFER' ? 'Vd: FT261014892...' : 'Vd: PT-20261014-01'}
              value={receiptCode}
              onChange={e => setReceiptCode(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-lg text-xs font-mono font-medium text-[#17202E] outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
            />
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Ghi chú thu nợ
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-lg text-xs font-medium text-[#17202E] outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
            />
          </div>

          {/* Footer */}
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
              disabled={isSubmitting || collectAmount <= 0}
              className="py-2 px-4 text-xs font-semibold text-white bg-[#0A9444] hover:bg-[#087a38] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang ghi nhận...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác Nhận Thu Nợ & Gạch Sổ</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
