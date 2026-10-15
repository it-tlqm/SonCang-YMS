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
    <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-[#E5E9F0] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 -mx-5 px-5 -mt-1">
          <div>
            <span className="text-[10px] font-bold text-[#0A9444] uppercase tracking-wider block">
              Kế toán Hóa đơn
            </span>
            <h2 className="text-sm font-bold text-[#17202E] flex items-center gap-1.5 mt-0.5">
              <FileCheck className="w-4 h-4 text-[#0A9444]" />
              Ghi Nhận Số Hóa Đơn Điện Tử
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
          {/* Thông tin hồ sơ hóa đơn */}
          <div className="bg-[#F8F9FB] border border-[#E5E9F0] rounded-xl p-3.5 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#667085] font-medium">Mã đề xuất:</span>
              <span className="font-mono font-bold text-[#17202E]">{invoice.invoice_code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085] font-medium">Người mua hàng:</span>
              <span className="font-semibold text-[#17202E]">{invoice.buyer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#667085] font-medium">Mã số thuế / CCCD:</span>
              <span className="font-mono font-bold text-[#326DD8]">
                {invoice.tax_code || invoice.id_card_no || '---'}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#E5E9F0] pt-1.5 mt-1">
              <span className="text-[#344054] font-semibold">Tổng tiền thanh toán:</span>
              <span className="font-mono font-bold text-[#0A9444] text-sm">
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Số Hóa Đơn Điện Tử (Kèm Ký hiệu nếu có) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="Vd: 0004521 (Ký hiệu: 1C26TQM)"
              value={eInvoiceNo}
              onChange={e => setEInvoiceNo(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-lg text-xs font-mono font-bold text-[#17202E] focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
            />
            <span className="text-[11px] text-[#667085] mt-1 block">
              Nhập số hóa đơn chính thức trả về từ phần mềm hóa đơn điện tử
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Ngày giờ ký phát hành
            </label>
            <input
              type="datetime-local"
              value={issuedAt}
              onChange={e => setIssuedAt(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-lg text-xs font-mono text-[#17202E] outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#344054] mb-1">
              Ghi chú thêm (Tùy chọn)
            </label>
            <input
              type="text"
              placeholder="Vd: Đã gửi email cho khách hàng..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-[#D0D5DD] rounded-lg text-xs font-medium text-[#17202E] outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
            />
          </div>

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
              disabled={isSubmitting || !eInvoiceNo.trim()}
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
                  <span>Xác Nhận Đã Xuất HĐĐT</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
