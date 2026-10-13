'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Customer } from '@/types/domain.types';
import { useAuth } from '@/contexts/auth-context';
import { 
  Building2, 
  Search, 
  Plus, 
  Pencil, 
  Trash2, 
  Phone, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FileText, 
  Save, 
  ShieldCheck,
  Power
} from 'lucide-react';

export default function CustomersAdminPage() {
  const { repository, can, role } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal Thêm / Sửa
  const [showModal, setShowModal] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'CREATE' | 'EDIT'>('CREATE');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Form Fields
  const [formName, setFormName] = useState<string>('');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formTaxCode, setFormTaxCode] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Tải danh mục khách hàng
  const loadData = async () => {
    try {
      setIsLoading(true);
      const list = await repository.getCustomers();
      setCustomers(list);
    } catch (err) {
      console.error('Lỗi tải khách hàng:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [repository]);

  // Lọc danh sách
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = 
      !q ||
      c.name.toLowerCase().includes(q) ||
      (c.phone && c.phone.toLowerCase().includes(q)) ||
      (c.tax_code && c.tax_code.toLowerCase().includes(q)) ||
      (c.notes && c.notes.toLowerCase().includes(q));

    const matchStatus = 
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && c.is_active !== false) ||
      (statusFilter === 'INACTIVE' && c.is_active === false);

    return matchSearch && matchStatus;
  });

  // Mở modal tạo mới
  const handleOpenCreate = () => {
    setModalMode('CREATE');
    setSelectedCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormTaxCode('');
    setFormAddress('');
    setFormNotes('');
    setFormIsActive(true);
    setErrorMessage('');
    setShowModal(true);
  };

  // Mở modal sửa
  const handleOpenEdit = (c: Customer) => {
    setModalMode('EDIT');
    setSelectedCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone || '');
    setFormTaxCode(c.tax_code || '');
    setFormAddress(c.address || '');
    setFormNotes(c.notes || '');
    setFormIsActive(c.is_active !== false);
    setErrorMessage('');
    setShowModal(true);
  };

  // Lưu Khách hàng
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formName.trim();
    if (!trimmedName) {
      setErrorMessage('Tên Khách hàng / Doanh nghiệp không được để trống.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      if (modalMode === 'CREATE') {
        const res = await repository.createCustomer({
          name: trimmedName,
          phone: formPhone.trim() || undefined,
          tax_code: formTaxCode.trim() || undefined,
          address: formAddress.trim() || undefined,
          notes: formNotes.trim() || undefined,
        });

        if (!res.success || !res.customer) {
          setErrorMessage(res.error || 'Lỗi khi tạo mới khách hàng.');
          return;
        }

        setSuccessMessage(`Đã thêm mới thành công khách hàng "${res.customer.name}".`);
      } else if (selectedCustomer) {
        const res = await repository.updateCustomer({
          id: selectedCustomer.id,
          name: trimmedName,
          phone: formPhone.trim() || undefined,
          tax_code: formTaxCode.trim() || undefined,
          address: formAddress.trim() || undefined,
          notes: formNotes.trim() || undefined,
          is_active: formIsActive,
        });

        if (!res.success || !res.customer) {
          setErrorMessage(res.error || 'Lỗi khi cập nhật thông tin khách hàng.');
          return;
        }

        setSuccessMessage(`Đã cập nhật thành công thông tin khách hàng "${res.customer.name}".`);
      }

      setShowModal(false);
      await loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      setErrorMessage('Lỗi hệ thống: ' + (err?.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xóa Khách hàng
  const handleDelete = async (c: Customer) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa khách hàng "${c.name}" khỏi danh mục?`)) {
      return;
    }

    try {
      const res = await repository.deleteCustomer(c.id);
      if (!res.success) {
        alert(res.error || 'Không thể xóa khách hàng.');
        return;
      }
      setSuccessMessage(`Đã xóa khách hàng "${c.name}".`);
      await loadData();
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err: any) {
      alert('Lỗi xóa khách hàng: ' + (err?.message || String(err)));
    }
  };

  // Bật/tắt trạng thái hoạt động
  const handleToggleStatus = async (c: Customer) => {
    const nextStatus = c.is_active === false ? true : false;
    try {
      const res = await repository.updateCustomer({
        id: c.id,
        is_active: nextStatus,
      });
      if (res.success) {
        await loadData();
      }
    } catch (err) {
      console.error('Lỗi đổi trạng thái:', err);
    }
  };

  // Thống kê
  const totalCount = customers.length;
  const activeCount = customers.filter(c => c.is_active !== false).length;
  const enterpriseCount = customers.filter(c => Boolean(c.tax_code)).length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3E8EF] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#223873] flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-blue-700">
                Danh mục Đối tác & Khách hàng
              </span>
              <h1 className="text-lg sm:text-xl font-black text-[#223873] mt-0.5">
                Quản lý Khách hàng & Chủ hàng Bến bãi
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0A9444] hover:bg-[#087C3C] text-xs font-bold text-white shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm mới Khách hàng</span>
            </button>
          </div>
        </div>

        {/* Thông báo thành công */}
        {successMessage && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Thống kê thẻ tóm tắt */}
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-slate-500 block text-[11px]">Tổng số đối tác</span>
            <span className="text-base font-black text-slate-900 mt-0.5 block">{totalCount}</span>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
            <span className="text-emerald-700 block text-[11px]">Đang giao dịch</span>
            <span className="text-base font-black text-[#0A9444] mt-0.5 block">{activeCount}</span>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100">
            <span className="text-blue-700 block text-[11px]">Doanh nghiệp có MST</span>
            <span className="text-base font-black text-[#223873] mt-0.5 block">{enterpriseCount}</span>
          </div>
        </div>
      </div>

      {/* Thanh tìm kiếm & Bộ lọc */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm tên khách hàng, SĐT, MST, ghi chú..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#223873] bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none"
          >
            <option value="ALL">Tất cả trạng thái ({customers.length})</option>
            <option value="ACTIVE">Đang hoạt động ({activeCount})</option>
            <option value="INACTIVE">Tạm ngưng ({totalCount - activeCount})</option>
          </select>
        </div>
      </div>

      {/* Bảng danh sách khách hàng */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Tên Khách hàng / Doanh nghiệp</th>
                <th className="px-3 py-3">Điện thoại liên hệ</th>
                <th className="px-3 py-3">Mã số thuế</th>
                <th className="px-3 py-3">Ghi chú đối tác / Loại hàng</th>
                <th className="px-3 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#223873]" />
                    <span>Đang tải danh mục khách hàng...</span>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    Không tìm thấy khách hàng nào phù hợp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const isActive = c.is_active !== false;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-sm">{c.name}</div>
                        {c.address && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{c.address}</div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {c.phone ? (
                          <span className="font-mono font-semibold text-slate-800 flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {c.phone}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono font-semibold text-slate-700">
                        {c.tax_code || <span className="text-slate-400 font-sans font-normal">—</span>}
                      </td>
                      <td className="px-3 py-3 text-slate-600 max-w-xs">
                        {c.notes || <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(c)}
                          title="Bấm để đổi trạng thái hoạt động"
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer transition-colors ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {isActive ? '● Đang giao dịch' : '○ Tạm ngưng'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            title="Chỉnh sửa thông tin khách hàng"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            title="Xóa khách hàng"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL THÊM MỚI / CHỈNH SỬA KHÁCH HÀNG                                     */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4 border border-slate-300">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#223873]" />
                <span>{modalMode === 'CREATE' ? 'Thêm mới Khách hàng / Chủ hàng' : 'Chỉnh sửa Khách hàng'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên Khách hàng / Doanh nghiệp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Công ty TNHH Vận tải Á Châu..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#223873]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="VD: 0912.345.678"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#223873]"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Mã số thuế doanh nghiệp</label>
                  <input
                    type="text"
                    value={formTaxCode}
                    onChange={(e) => setFormTaxCode(e.target.value)}
                    placeholder="VD: 0102345678"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#223873]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Địa chỉ trụ sở / Kho bãi</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="VD: Khu kinh tế cửa khẩu Tà Lùng, Quảng Hòa, Cao Bằng..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#223873]"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Ghi chú đối tác / Loại hàng chuyên tuyến</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="VD: Khách thường xuyên chạy hoa quả lạnh, thanh toán chuyển khoản..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#223873]"
                />
              </div>

              {modalMode === 'EDIT' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="chkIsActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#223873] rounded border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="chkIsActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Trạng thái: Đang giao dịch hoạt động
                  </label>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{modalMode === 'CREATE' ? 'Tạo mới Khách hàng' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
