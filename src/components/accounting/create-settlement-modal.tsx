'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { IYardRepository } from '@/lib/services/repository-interface';
import { PaymentRecord, CashSettlement } from '@/types/domain.types';
import { formatCurrency, formatDateTime } from '@/lib/display-formatters';
import { 
  X, 
  Calculator, 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Building2, 
  Clock, 
  UserCheck, 
  FileText,
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface CreateSettlementModalProps {
  isOpen: boolean;
  onClose: () => void;
  repository: IYardRepository;
  onSuccess: (settlement: CashSettlement, items: PaymentRecord[]) => void;
}

export function CreateSettlementModal({
  isOpen,
  onClose,
  repository,
  onSuccess,
}: CreateSettlementModalProps) {
  const [handoverDept, setHandoverDept] = useState<'AN_NINH' | 'CCKB' | 'ALL'>('AN_NINH');
  const [periodFrom, setPeriodFrom] = useState<string>('');
  const [periodTo, setPeriodTo] = useState<string>('');
  const [handoverPersonName, setHandoverPersonName] = useState<string>('');
  const [cashCountedInput, setCashCountedInput] = useState<string>('');
  const [differenceReason, setDifferenceReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [unsettledPayments, setUnsettledPayments] = useState<PaymentRecord[]>([]);

  // Khởi tạo mốc thời gian mặc định: 00:00 hôm nay đến hiện tại
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      
      const formatLocalISO = (d: Date) => {
        const pad = (n: number) => n.toString().padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };

      setPeriodFrom(formatLocalISO(todayStart));
      setPeriodTo(formatLocalISO(now));
      setHandoverPersonName(handoverDept === 'AN_NINH' ? 'Hoàng Văn Tuấn (Ca trưởng An ninh)' : 'Lê Thị Dung (Nghiệp vụ CCKB)');
      setErrorMessage('');
      setDifferenceReason('');
      setNotes('');
    }
  }, [isOpen, handoverDept]);

  // Tải danh sách phiếu thu tiền mặt chưa chốt
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage('');

    repository.getUnsettledCashPayments(handoverDept)
      .then(payments => {
        if (!isMounted) return;
        setUnsettledPayments(payments);
        
        // Tự động gán số tiền đếm mặc định khớp với hệ thống
        const total = payments.reduce((sum, p) => sum + p.payment_amount, 0);
        setCashCountedInput(String(total));
        setIsLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        setErrorMessage(err.message || 'Lỗi khi tải danh sách phiếu thu');
        setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [isOpen, handoverDept, repository]);

  // Lọc theo mốc thời gian đã chọn
  const filteredPayments = useMemo(() => {
    if (!periodFrom || !periodTo) return unsettledPayments;
    const fromTime = new Date(periodFrom).getTime();
    const toTime = new Date(periodTo).getTime();
    return unsettledPayments.filter(p => {
      const pTime = new Date(p.collected_at).getTime();
      return pTime >= fromTime && pTime <= toTime;
    });
  }, [unsettledPayments, periodFrom, periodTo]);

  const expectedCash = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + p.payment_amount, 0);
  }, [filteredPayments]);

  const countedCash = Number(cashCountedInput) || 0;
  const difference = countedCash - expectedCash;
  const isDiff = difference !== 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!handoverPersonName.trim()) {
      setErrorMessage('Vui lòng nhập họ tên người đại diện ca trực hiện trường bàn giao.');
      return;
    }

    if (filteredPayments.length === 0) {
      setErrorMessage('Không có phiếu thu tiền mặt nào trong kỳ chốt này để bàn giao.');
      return;
    }

    if (isDiff && !differenceReason.trim()) {
      setErrorMessage('Tiền thực đếm lệch so với sổ sách! Bắt buộc phải nhập Lý do chênh lệch.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await repository.confirmCashSettlement({
        handoverDept,
        periodFrom: new Date(periodFrom).toISOString(),
        periodTo: new Date(periodTo).toISOString(),
        totalCashCounted: countedCash,
        differenceReason: isDiff ? differenceReason.trim() : undefined,
        handoverPersonName: handoverPersonName.trim(),
        notes: notes.trim() || undefined,
        paymentIds: filteredPayments.map(p => p.id)
      });

      if (!res.success || !res.settlement) {
        throw new Error(res.error || 'Không thể tạo đợt chốt tiền mặt');
      }

      onSuccess(res.settlement, filteredPayments);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi trong quá trình xác nhận chốt tiền.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-5 border border-[#E5E9F0] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 -mx-5 px-5 -mt-1">
          <div>
            <span className="text-[10px] font-bold text-[#0A9444] uppercase tracking-wider block">
              Thủ quỹ & Sổ quỹ Ca
            </span>
            <h2 className="text-sm font-bold text-[#17202E] flex items-center gap-1.5 mt-0.5">
              <Calculator className="w-4 h-4 text-[#0A9444]" />
              Chốt & Bàn Giao Tiền Mặt Hiện Trường
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

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Bộ phận & Khoảng thời gian */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Điểm / Bộ phận chốt
              </label>
              <select
                value={handoverDept}
                onChange={e => setHandoverDept(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="AN_NINH">Bốt An ninh Cổng vào/ra</option>
                <option value="CCKB">Quầy Nghiệp vụ Cổng cảng Kho bãi</option>
                <option value="ALL">Toàn bộ Hiện trường</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Từ mốc thời gian
              </label>
              <input
                type="datetime-local"
                value={periodFrom}
                onChange={e => setPeriodFrom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Đến mốc thời gian
              </label>
              <input
                type="datetime-local"
                value={periodTo}
                onChange={e => setPeriodTo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
            </div>
          </div>

          {/* Bảng danh sách phiếu thu chưa chốt trong kỳ */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
            <div className="px-4 py-2.5 bg-slate-100/80 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">
                Phiếu thu tiền mặt trong kỳ ({filteredPayments.length} phiếu)
              </span>
              <span className="text-xs font-mono font-bold text-blue-900">
                Sổ sách kỳ vọng: {formatCurrency(expectedCash)}
              </span>
            </div>

            <div className="max-h-40 overflow-y-auto divide-y divide-slate-200 text-xs">
              {isLoading ? (
                <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang tải phiếu thu...
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="p-6 text-center text-slate-500 italic">
                  Không tìm thấy phiếu thu tiền mặt nào chưa chốt trong khoảng thời gian này.
                </div>
              ) : (
                filteredPayments.map(p => (
                  <div key={p.id} className="px-4 py-2 flex items-center justify-between hover:bg-white transition">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium text-slate-900">{p.receipt_code || p.id.substring(0, 8)}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600">{p.collected_by_name || 'NV Hiện trường'}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-500">{formatDateTime(p.collected_at)}</span>
                    </div>
                    <span className="font-mono font-semibold text-slate-800">
                      {formatCurrency(p.payment_amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Khung Kiểm Đếm 4 Mắt & Tính Chênh Lệch */}
          <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-5 rounded-xl border border-blue-200/60 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-blue-700" />
              Kiểm đếm tiền mặt thực tế & Xác nhận nộp quỹ
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 block">Tiền mặt sổ sách tính toán</span>
                <span className="text-lg font-black font-mono text-slate-800 block mt-1">
                  {formatCurrency(expectedCash)}
                </span>
                <span className="text-[10px] text-slate-400">Từ {filteredPayments.length} phiếu thu</span>
              </div>

              <div className="p-3 bg-white rounded-lg border-2 border-blue-600 shadow-sm">
                <label className="text-[11px] font-bold text-blue-900 block">
                  Tiền mặt thực đếm bàn giao (VNĐ) *
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={cashCountedInput}
                  onChange={e => setCashCountedInput(e.target.value)}
                  className="w-full mt-1 text-lg font-black font-mono text-blue-700 outline-none bg-transparent"
                  placeholder="0"
                />
                <span className="text-[10px] text-blue-600 font-medium">Nhập số tiền đếm tay thực tế</span>
              </div>

              <div className={`p-3 rounded-lg border ${difference === 0 ? 'bg-emerald-50/80 border-emerald-300' : 'bg-amber-50/80 border-amber-300'}`}>
                <span className="text-[11px] font-semibold block text-slate-600">Chênh lệch kiểm đếm</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {difference === 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  )}
                  <span className={`text-lg font-black font-mono ${difference === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {difference > 0 ? '+' : ''}{formatCurrency(difference)}
                  </span>
                </div>
                <span className={`text-[10px] font-medium ${difference === 0 ? 'text-emerald-600' : 'text-amber-800'}`}>
                  {difference === 0 ? 'Khớp 100% không lệch' : 'Có chênh lệch tiền mặt'}
                </span>
              </div>
            </div>

            {/* Bắt buộc nhập lý do nếu chênh lệch */}
            {isDiff && (
              <div className="p-3 bg-amber-100/60 border border-amber-300 rounded-lg">
                <label className="block text-xs font-bold text-amber-900 mb-1">
                  Lý do chênh lệch tiền mặt (Bắt buộc) *
                </label>
                <input
                  type="text"
                  required
                  value={differenceReason}
                  onChange={e => setDifferenceReason(e.target.value)}
                  placeholder="Vd: Tiền lẻ phụ thu chưa thanh toán, thừa tiền tip, trả lại lái xe sau..."
                  className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded text-xs text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            )}
          </div>

          {/* Thông tin đại diện bàn giao */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Đại diện bên giao (Hiện trường) *
              </label>
              <input
                type="text"
                required
                value={handoverPersonName}
                onChange={e => setHandoverPersonName(e.target.value)}
                placeholder="Họ tên nhân viên/trưởng ca bàn giao tiền"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ghi chú đợt chốt (Tùy chọn)
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ghi chú thêm về ca trực..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E9F0] -mx-5 px-5 -mb-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2 px-4 text-xs font-semibold text-[#344054] bg-white hover:bg-[#F8F9FB] rounded-lg border border-[#D0D5DD] transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || filteredPayments.length === 0}
              className="py-2 px-4 text-xs font-semibold text-white bg-[#0A9444] hover:bg-[#087a38] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang ghi nhận quỹ...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác Nhận Nộp Quỹ & In Biên Bản</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
