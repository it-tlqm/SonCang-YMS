'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { IYardRepository } from '@/lib/services/repository-interface';
import { ChargeItem, YardInvoice, InvoiceType } from '@/types/domain.types';
import { formatCurrency, formatDateTime } from '@/lib/display-formatters';
import { 
  X, 
  FileText, 
  Building2, 
  User, 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  CheckSquare,
  Square,
  Loader2,
  Percent
} from 'lucide-react';

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  repository: IYardRepository;
  onSuccess: (invoice: YardInvoice) => void;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  repository,
  onSuccess
}: CreateInvoiceModalProps) {
  const [invoiceType, setInvoiceType] = useState<InvoiceType>('INDIVIDUAL');
  
  // Thông tin người mua
  const [buyerName, setBuyerName] = useState<string>('');
  const [taxCode, setTaxCode] = useState<string>('');
  const [idCardNo, setIdCardNo] = useState<string>('');
  const [buyerAddress, setBuyerAddress] = useState<string>('');
  const [buyerEmail, setBuyerEmail] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>('');
  const [vatRate, setVatRate] = useState<number>(8);
  const [notes, setNotes] = useState<string>('');
  
  // Danh sách khoản thu
  const [availableCharges, setAvailableCharges] = useState<ChargeItem[]>([]);
  const [selectedChargeIds, setSelectedChargeIds] = useState<Set<string>>(new Set());
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Tải danh sách khoản thu chưa xuất hóa đơn
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage('');
    setSelectedChargeIds(new Set());
    setSearchKeyword('');

    repository.getInvoicableCharges()
      .then(charges => {
        if (!isMounted) return;
        setAvailableCharges(charges);
        setIsLoading(false);
      })
      .catch(err => {
        if (!isMounted) return;
        setErrorMessage(err.message || 'Lỗi khi tải danh sách khoản thu');
        setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [isOpen, repository]);

  // Lọc tìm kiếm khoản thu theo Biển số, Cont, Khách hàng
  const filteredCharges = useMemo(() => {
    if (!searchKeyword.trim()) return availableCharges;
    const kw = searchKeyword.toLowerCase().trim();
    return availableCharges.filter(c => 
      (c.license_plate && c.license_plate.toLowerCase().includes(kw)) ||
      (c.container_no && c.container_no.toLowerCase().includes(kw)) ||
      (c.customer_name && c.customer_name.toLowerCase().includes(kw)) ||
      (c.notes && c.notes.toLowerCase().includes(kw)) ||
      c.id.toLowerCase().includes(kw)
    );
  }, [availableCharges, searchKeyword]);

  // Chọn / Bỏ chọn khoản thu
  const toggleSelectCharge = (id: string) => {
    setSelectedChargeIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedChargeIds.size === filteredCharges.length) {
      setSelectedChargeIds(new Set());
    } else {
      setSelectedChargeIds(new Set(filteredCharges.map(c => c.id)));
    }
  };

  // Tính toán số tiền Gross VAT
  const totalAmount = useMemo(() => {
    return availableCharges
      .filter(c => selectedChargeIds.has(c.id))
      .reduce((sum, c) => sum + c.amount, 0);
  }, [availableCharges, selectedChargeIds]);

  const subtotalAmount = Math.round(totalAmount / (1 + vatRate / 100));
  const vatAmount = totalAmount - subtotalAmount;

  // Điền tự động thông tin từ khoản thu đầu tiên được chọn
  useEffect(() => {
    if (selectedChargeIds.size > 0 && !buyerName) {
      const firstSelected = availableCharges.find(c => selectedChargeIds.has(c.id));
      if (firstSelected?.customer_name) {
        setBuyerName(firstSelected.customer_name);
      }
    }
  }, [selectedChargeIds, availableCharges, buyerName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (selectedChargeIds.size === 0) {
      setErrorMessage('Vui lòng chọn ít nhất 01 khoản thu để lập hóa đơn.');
      return;
    }

    if (!buyerName.trim()) {
      setErrorMessage('Vui lòng nhập tên người mua hàng / tên đơn vị.');
      return;
    }

    if (!buyerAddress.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ người mua hàng / doanh nghiệp.');
      return;
    }

    // Kiểm tra CCCD 12 số nếu là cá nhân
    if (invoiceType === 'INDIVIDUAL') {
      const cccdRegex = /^[0-9]{12}$/;
      if (!idCardNo.trim() || !cccdRegex.test(idCardNo.trim())) {
        setErrorMessage('Số CCCD không hợp lệ! Bắt buộc phải đủ 12 chữ số theo quy định Căn cước công dân gắn chip.');
        return;
      }
    }

    // Kiểm tra MST nếu là Doanh nghiệp
    if (invoiceType === 'COMPANY') {
      const mstRegex = /^[0-9]{10}(-[0-9]{3})?$|^[0-9]{13}$/;
      if (!taxCode.trim() || !mstRegex.test(taxCode.trim())) {
        setErrorMessage('Mã số thuế doanh nghiệp không hợp lệ! MST phải gồm 10 hoặc 13 chữ số.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const res = await repository.createYardInvoice({
        invoiceType,
        buyerName: buyerName.trim(),
        taxCode: invoiceType === 'COMPANY' ? taxCode.trim() : undefined,
        idCardNo: invoiceType === 'INDIVIDUAL' ? idCardNo.trim() : undefined,
        buyerAddress: buyerAddress.trim(),
        buyerEmail: buyerEmail.trim() || undefined,
        buyerPhone: buyerPhone.trim() || undefined,
        vatRate,
        notes: notes.trim() || undefined,
        chargeIds: Array.from(selectedChargeIds),
        createdBy: 'Bùi Thị Lan (Kế toán)'
      });

      if (!res.success || !res.invoice) {
        throw new Error(res.error || 'Không thể lập đề nghị xuất hóa đơn');
      }

      onSuccess(res.invoice);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi lập hóa đơn.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-5 border border-[#E5E9F0] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 -mx-5 px-5 -mt-1">
          <div>
            <span className="text-[10px] font-bold text-[#326DD8] uppercase tracking-wider block">
              Kế toán Hóa đơn & Thuế
            </span>
            <h2 className="text-sm font-bold text-[#17202E] flex items-center gap-1.5 mt-0.5">
              <Receipt className="w-4 h-4 text-[#326DD8]" />
              Lập Đề Nghị Xuất Hóa Đơn GTGT Bến Bãi
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
          {/* Bước 1: Chọn khoản thu gom vào hóa đơn */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[10px]">1</span>
                Chọn các khoản thu gom vào hóa đơn ({selectedChargeIds.size} mục đã chọn)
              </h3>
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm biển số, số cont, KH..."
                  value={searchKeyword}
                  onChange={e => setSearchKeyword(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
              <div className="px-4 py-2 bg-slate-100/90 border-b border-slate-200 flex justify-between items-center text-xs">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 font-semibold text-slate-700 hover:text-blue-700"
                >
                  {selectedChargeIds.size === filteredCharges.length && filteredCharges.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-blue-700" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Chọn tất cả ({filteredCharges.length})</span>
                </button>
                <span className="font-mono font-bold text-blue-900">
                  Tổng tiền gộp: {formatCurrency(totalAmount)}
                </span>
              </div>

              <div className="max-h-44 overflow-y-auto divide-y divide-slate-200 text-xs">
                {isLoading ? (
                  <div className="p-6 text-center text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang tải danh sách khoản thu...
                  </div>
                ) : filteredCharges.length === 0 ? (
                  <div className="p-6 text-center text-slate-500 italic">
                    Không có khoản thu nào sẵn sàng gom vào hóa đơn.
                  </div>
                ) : (
                  filteredCharges.map(c => {
                    const isSelected = selectedChargeIds.has(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleSelectCharge(c.id)}
                        className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition ${isSelected ? 'bg-blue-50/80' : 'hover:bg-white'}`}
                      >
                        <div className="flex items-center gap-3">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-700 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-2 font-medium">
                              <span className="font-mono text-slate-900 font-bold">
                                {c.container_no || c.license_plate || 'Khoản thu bãi'}
                              </span>
                              {c.charge_type && (
                                <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded text-slate-700 font-mono">
                                  {c.charge_type}
                                </span>
                              )}
                              <span className="text-slate-500 font-normal">{c.notes || ''}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                              {c.customer_name && <span>KH: {c.customer_name}</span>}
                              <span>• {formatDateTime(c.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <span className="font-mono font-bold text-slate-800">
                          {formatCurrency(c.amount)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Bước 2: Thông tin Người Mua (Doanh nghiệp MST vs Cá nhân CCCD) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[10px]">2</span>
                Thông tin người mua hàng / đơn vị nhận hóa đơn
              </h3>

              {/* Toggle Doanh nghiệp vs Cá nhân */}
              <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setInvoiceType('INDIVIDUAL')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${invoiceType === 'INDIVIDUAL' ? 'bg-white text-blue-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <User className="w-3.5 h-3.5 text-blue-700" />
                  Cá nhân / Lái xe (CCCD)
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceType('COMPANY')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${invoiceType === 'COMPANY' ? 'bg-white text-blue-900 shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  <Building2 className="w-3.5 h-3.5 text-blue-700" />
                  Doanh nghiệp (MST)
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {invoiceType === 'INDIVIDUAL' ? (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Họ và tên người mua hàng (Lái xe / Chủ cont) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Vd: VŨ TIẾN THÀNH"
                      value={buyerName}
                      onChange={e => setBuyerName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Số Căn cước công dân (Bắt buộc đúng 12 chữ số) *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      placeholder="Vd: 031077007508"
                      value={idCardNo}
                      onChange={e => setIdCardNo(e.target.value.replace(/\D/g, ''))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-900 tracking-wider"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      Đã nhập: {idCardNo.length}/12 chữ số
                    </span>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Địa chỉ thường trú theo CCCD *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Vd: Thủy Nguyên, TP Hải Phòng / Nam Định / Nghệ An..."
                      value={buyerAddress}
                      onChange={e => setBuyerAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Số điện thoại liên hệ (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      placeholder="0912..."
                      value={buyerPhone}
                      onChange={e => setBuyerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Email nhận file HĐĐT (Tùy chọn)
                    </label>
                    <input
                      type="email"
                      placeholder="email@gmail.com"
                      value={buyerEmail}
                      onChange={e => setBuyerEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Tên doanh nghiệp / Đơn vị mua hàng *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Vd: CÔNG TY CPTM XNK THIÊN AN"
                      value={buyerName}
                      onChange={e => setBuyerName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Mã số thuế doanh nghiệp (10 hoặc 13 số) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Vd: 0200923894"
                      value={taxCode}
                      onChange={e => setTaxCode(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-900 tracking-wider"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      Địa chỉ trụ sở công ty *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Địa chỉ đăng ký kinh doanh..."
                      value={buyerAddress}
                      onChange={e => setBuyerAddress(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Email nhận hóa đơn điện tử
                    </label>
                    <input
                      type="email"
                      placeholder="ketoan@thienan.com"
                      value={buyerEmail}
                      onChange={e => setBuyerEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Số điện thoại phòng tài chính / kế toán
                    </label>
                    <input
                      type="text"
                      placeholder="0243..."
                      value={buyerPhone}
                      onChange={e => setBuyerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Bước 3: Tính Thuế VAT Gross (Đơn giá bến bãi đã gồm VAT) */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 p-4 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-900 text-white flex items-center justify-center text-[10px]">3</span>
                Cơ chế Thuế GTGT Gross (Đơn giá bến bãi đã gồm VAT)
              </h3>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-700">Thuế suất VAT:</span>
                <button
                  type="button"
                  onClick={() => setVatRate(8)}
                  className={`px-3 py-1 rounded-md font-bold text-xs transition ${vatRate === 8 ? 'bg-blue-700 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300'}`}
                >
                  8% (Nghị định 72)
                </button>
                <button
                  type="button"
                  onClick={() => setVatRate(10)}
                  className={`px-3 py-1 rounded-md font-bold text-xs transition ${vatRate === 10 ? 'bg-blue-700 text-white shadow-sm' : 'bg-white text-slate-700 border border-slate-300'}`}
                >
                  10% (Tiêu chuẩn)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 font-semibold block text-[11px]">Doanh thu trước thuế (Tách ngược)</span>
                <span className="text-base font-black font-mono text-slate-800 block mt-1">
                  {formatCurrency(subtotalAmount)}
                </span>
                <span className="text-[10px] text-slate-400">= Tổng tiền / (1 + {vatRate}%)</span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-slate-500 font-semibold block text-[11px]">Tiền thuế GTGT ({vatRate}%)</span>
                <span className="text-base font-black font-mono text-indigo-700 block mt-1">
                  {formatCurrency(vatAmount)}
                </span>
                <span className="text-[10px] text-slate-400">= Tổng tiền - Doanh thu</span>
              </div>

              <div className="p-3 bg-blue-900 text-white rounded-lg shadow-sm">
                <span className="text-blue-200 font-semibold block text-[11px]">TỔNG CỘNG HÓA ĐƠN</span>
                <span className="text-lg font-black font-mono text-white block mt-1">
                  {formatCurrency(totalAmount)}
                </span>
                <span className="text-[10px] text-emerald-300 font-medium">Khớp 100% số tiền đã thu</span>
              </div>
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú hóa đơn (Tùy chọn)
            </label>
            <input
              type="text"
              placeholder="Vd: Xuất kèm Bảng kê Mẫu 01:BPA ngày..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
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
              disabled={isSubmitting || selectedChargeIds.size === 0}
              className="py-2 px-4 text-xs font-semibold text-white bg-[#0A9444] hover:bg-[#087a38] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lập hóa đơn...</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  <span>Lưu Đề Nghị & In Bảng Kê (Mẫu 01:BPA)</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
