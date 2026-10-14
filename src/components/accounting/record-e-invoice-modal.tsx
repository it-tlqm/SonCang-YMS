'use client';

import React, { useState } from 'react';
import { IYardRepository } from '@/lib/services/repository-interface';
import { YardInvoice } from '@/types/domain.types';
import { formatCurrency, formatDateTime } from '@/lib/display-formatters';
import { X, CheckCircle2, AlertCircle, FileCheck, Loader2 } from 'lucide-react';

interface RecordEInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: YardInvoice | null;
  repository: IYardRepository;
  onSuccess: () => void;
}

export function RecordEInvoiceModal({
  isOpen,
  onClose,
  invoice,
  repository,
  onSuccess
}: RecordEInvoiceModalProps) {
  const [eInvoiceNo, setEInvoiceNo] = useState<string>('');
  const [issuedAt, setIssuedAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      setIssuedAt(`${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`);
    }
  }, [isOpen]);

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen || !invoice) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!eInvoiceNo.trim()) {
      setErrorMessage('Vui lòng nhập Số hóa đơn điện tử chính thức.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await repository.issueYardInvoice(
        invoice.id,
        eInvoiceNo.trim(),
        new Date(issuedAt).toISOString(),
        notes.trim() || undefined
      );

      if (!res.success) {
        throw new Error(res.error || 'Không thể cập nhật số hóa đơn điện tử');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi ghi nhận số HĐĐT.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-emerald-800 to-teal-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <FileCheck className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h2 className="text-base font-bold">Ghi Nhận Số Hóa Đơn Điện Tử</h2>
              <p className="text-xs text-emerald-200">Cập nhật sau khi xuất thành công trên hệ thống HĐĐT (VNPT/Viettel/MISA)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white hover:bg-white/10 rounded-lg transition"
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
          {/* Thông tin hồ sơ hóa đơn */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Mã đề xuất:</span>
              <span className="font-mono font-bold text-slate-800">{invoice.invoice_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Người mua hàng:</span>
              <span className="font-semibold text-slate-800">{invoice.buyer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Mã số thuế / CCCD:</span>
              <span className="font-mono font-bold text-blue-900">
                {invoice.tax_code || invoice.id_card_no || '---'}
              </span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1">
              <span className="text-slate-600 font-semibold">Tổng tiền thanh toán:</span>
              <span className="font-mono font-black text-blue-700 text-sm">
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Số Hóa Đơn Điện Tử (Kèm Ký hiệu nếu có) *
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Vd: 0004521 (Ký hiệu: 1C26TQM)"
              value={eInvoiceNo}
              onChange={e => setEInvoiceNo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold text-emerald-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Nhập số hóa đơn chính thức trả về từ phần mềm hóa đơn điện tử
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ngày giờ ký phát hành
            </label>
            <input
              type="datetime-local"
              value={issuedAt}
              onChange={e => setIssuedAt(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Ghi chú thêm (Tùy chọn)
            </label>
            <input
              type="text"
              placeholder="Vd: Đã gửi email cho khách hàng..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

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
              disabled={isSubmitting || !eInvoiceNo.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang ghi nhận...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Xác Nhận Đã Xuất HĐĐT
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
