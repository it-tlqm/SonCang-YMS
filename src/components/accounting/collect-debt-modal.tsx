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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-amber-700 to-orange-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <CreditCard className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 className="text-base font-bold">Thu Hồi Công Nợ Bến Bãi (AP07)</h2>
              <p className="text-xs text-amber-100">Ghi nhận thanh toán và gạch nợ trên hệ thống sổ cái</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-amber-200 hover:text-white hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Thông tin hồ sơ nợ */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Khách hàng / Chủ cont:</span>
              <span className="font-bold text-slate-900">{debtItem.customer_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Biển số / Số Container:</span>
              <span className="font-mono font-bold text-blue-900">
                {debtItem.container_no || debtItem.license_plate || '---'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Nội dung phí nợ:</span>
              <span className="text-slate-800">{debtItem.charge_title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Người duyệt bảo lãnh xuất bãi:</span>
              <span className="font-medium text-slate-800">{debtItem.guarantor_name || 'Trưởng ca'}</span>
            </div>
            <div className="flex items-center justify-between border-t border-amber-200/80 pt-2 mt-1">
              <span className="font-bold text-amber-950">DƯ NỢ CẦN THU:</span>
              <span className="font-mono font-black text-amber-800 text-base">
                {formatCurrency(debtItem.debt_amount)}
              </span>
            </div>
          </div>

          {/* Phương thức thanh toán */}
          <div>
            <label className="block font-bold text-slate-700 mb-2">
              Hình thức khách thanh toán *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${paymentMethod === 'CASH' ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-500/30' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Tiền Mặt</span>
                  <span className="text-[10px] text-slate-500">Kế toán thu trực tiếp</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('TRANSFER')}
                className={`p-3 rounded-xl border text-left flex items-center gap-3 transition ${paymentMethod === 'TRANSFER' ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/30' : 'border-slate-200 hover:bg-slate-50'}`}
              >
                <div className="p-2 bg-blue-100 text-blue-800 rounded-lg">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Chuyển Khoản</span>
                  <span className="text-[10px] text-slate-500">VietQR / TK Công ty</span>
                </div>
              </button>
            </div>
          </div>

          {/* Số tiền thu */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Số tiền thu đợt này (VNĐ) *
            </label>
            <input
              type="number"
              step="1000"
              required
              value={amountInput}
              onChange={e => setAmountInput(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-lg font-mono font-black text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1">
              <span>Còn lại sau khi thu: {formatCurrency(Math.max(0, debtItem.debt_amount - collectAmount))}</span>
              <button
                type="button"
                onClick={() => setAmountInput(String(debtItem.debt_amount))}
                className="text-amber-700 hover:underline font-bold"
              >
                Thu hết công nợ
              </button>
            </div>
          </div>

          {/* Mã giao dịch / Biên lai */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              {paymentMethod === 'TRANSFER' ? 'Mã tham chiếu ngân hàng (FT/Mã sao kê)' : 'Số phiếu thu tiền mặt'}
            </label>
            <input
              type="text"
              placeholder={paymentMethod === 'TRANSFER' ? 'Vd: FT261014892...' : 'Vd: PT-20261014-01'}
              value={receiptCode}
              onChange={e => setReceiptCode(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:bg-white focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ghi chú thu nợ
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:bg-white focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-semibold rounded-lg hover:bg-slate-100 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || collectAmount <= 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang ghi nhận...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Xác Nhận Thu Nợ & Gạch Sổ
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
