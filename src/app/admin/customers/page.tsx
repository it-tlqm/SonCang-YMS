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
  Check, 
  AlertCircle, 
  Loader2, 
  Save, 
  X,
  Users
} from 'lucide-react';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { SearchInput } from '@/components/workspace/search-input';
import { StatusBadge } from '@/components/workspace/status-badge';

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

  // Lưu thông tin
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formName.trim();
    if (!cleanName) {
      setErrorMessage('Tên khách hàng không được để trống.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');

      if (modalMode === 'CREATE') {
        const res = await repository.createCustomer({
          name: cleanName,
          phone: formPhone.trim() || undefined,
          tax_code: formTaxCode.trim() || undefined,
          address: formAddress.trim() || undefined,
          notes: formNotes.trim() || undefined,
        });

        if (!res.success || !res.customer) {
          setErrorMessage(res.error || 'Lỗi khi thêm mới khách hàng.');
          return;
        }

        setSuccessMessage(`Đã thêm mới thành công đối tác "${res.customer.name}".`);
      } else if (selectedCustomer) {
        const res = await repository.updateCustomer({
          id: selectedCustomer.id,
          name: cleanName,
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
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white">
      {/* 1. WORKSPACE HEADER */}
      <WorkspaceHeader
        title="Danh mục Đối tác & Khách hàng"
        subtitle="Quản lý thông tin chủ hàng, mã số thuế doanh nghiệp và hồ sơ đối soát bến bãi"
        icon={Building2}
        badge={
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF8FF] text-[#326DD8] border border-[#B2DDFF]">
            {totalCount} đối tác
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0A9444] hover:bg-[#087C3C] text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm mới Khách hàng</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards Strip */}
      <div className="p-4 sm:p-5 border-b border-[#E5E9F0] bg-[#F8F9FB]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
          <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
            <span className="text-[#667085] block text-[11px]">Tổng số đối tác</span>
            <span className="text-xl font-bold font-mono text-[#17202E] mt-0.5 block">{totalCount}</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
            <span className="text-[#667085] block text-[11px]">Đang giao dịch hoạt động</span>
            <span className="text-xl font-bold font-mono text-[#0A9444] mt-0.5 block">{activeCount}</span>
          </div>
          <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
            <span className="text-[#667085] block text-[11px]">Doanh nghiệp có Mã số thuế</span>
            <span className="text-xl font-bold font-mono text-[#326DD8] mt-0.5 block">{enterpriseCount}</span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4 w-full flex-1 flex flex-col min-h-[calc(100vh-210px)]">
        {/* Thông báo thành công */}
        {successMessage && (
          <div className="p-3 bg-[#ECFDF3] border border-[#A6F4C5] rounded-lg text-[#0A9444] text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#0A9444] shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage('')}
              className="text-[#0A9444] hover:underline cursor-pointer font-semibold text-xs"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Thanh tìm kiếm & Bộ lọc */}
        <div className="bg-white rounded-xl border border-[#E5E9F0] overflow-hidden flex-1 flex flex-col min-h-[540px]">
          <div className="p-3.5 border-b border-[#E5E9F0] bg-[#F8F9FB] flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="w-full sm:w-80">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Tìm tên khách hàng, SĐT, MST, ghi chú..."
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E9F0] bg-white text-[#17202E] focus:outline-none focus:ring-2 focus:ring-[#326DD8]"
              >
                <option value="ALL">Tất cả trạng thái ({customers.length})</option>
                <option value="ACTIVE">Đang hoạt động ({activeCount})</option>
                <option value="INACTIVE">Tạm ngưng ({totalCount - activeCount})</option>
              </select>
            </div>
          </div>

          {/* Bảng danh sách khách hàng */}
          <div className="overflow-x-auto flex-1 min-h-[480px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FB] border-b border-[#E5E9F0] text-[#667085] font-semibold text-[11px]">
                <tr>
                  <th className="px-4 py-2.5">Tên Khách hàng / Doanh nghiệp</th>
                  <th className="px-3 py-2.5">Điện thoại liên hệ</th>
                  <th className="px-3 py-2.5">Mã số thuế</th>
                  <th className="px-3 py-2.5">Ghi chú đối tác / Loại hàng</th>
                  <th className="px-3 py-2.5 text-center">Trạng thái</th>
                  <th className="px-4 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9F0]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-[#98A2B3]">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-[#326DD8]" />
                      <span>Đang tải danh mục khách hàng...</span>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-[#98A2B3]">
                      Không tìm thấy đối tác nào phù hợp với bộ lọc tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => {
                    const isActive = c.is_active !== false;
                    return (
                      <tr key={c.id} className="hover:bg-[#F8F9FB] transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#17202E] text-xs">{c.name}</div>
                          {c.address && (
                            <div className="text-[11px] text-[#667085] mt-0.5 line-clamp-1">{c.address}</div>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {c.phone ? (
                            <span className="font-mono text-[#17202E] flex items-center gap-1">
                              <Phone className="w-3 h-3 text-[#98A2B3]" />
                              {c.phone}
                            </span>
                          ) : (
                            <span className="text-[#98A2B3]">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 font-mono text-[#17202E]">
                          {c.tax_code || <span className="text-[#98A2B3]">—</span>}
                        </td>
                        <td className="px-3 py-3 text-[#667085] max-w-xs truncate">
                          {c.notes || <span className="text-[#98A2B3]">—</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(c)}
                            title="Bấm để đổi trạng thái"
                            className="cursor-pointer"
                          >
                            <StatusBadge
                              variant={isActive ? 'success' : 'neutral'}
                              label={isActive ? 'Đang giao dịch' : 'Tạm ngưng'}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(c)}
                              title="Chỉnh sửa thông tin"
                              className="p-1.5 rounded-md text-[#667085] hover:text-[#326DD8] hover:bg-[#F1F4F8] transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c)}
                              title="Xóa khách hàng"
                              className="p-1.5 rounded-md text-[#667085] hover:text-[#D92D20] hover:bg-[#FEF3F2] transition-colors cursor-pointer"
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
      </div>

      {/* ========================================================================= */}
      {/* MODAL THÊM MỚI / CHỈNH SỬA KHÁCH HÀNG                                     */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-[#E5E9F0] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 -mx-5 px-5 -mt-1">
              <div>
                <span className="text-[10px] font-bold text-[#326DD8] uppercase tracking-wider block">
                  Đối tác & Khách hàng
                </span>
                <h3 className="text-sm font-bold text-[#17202E] flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-4 h-4 text-[#326DD8]" />
                  {modalMode === 'CREATE' ? 'Thêm mới Khách hàng / Chủ hàng' : 'Chỉnh sửa Khách hàng'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-[#667085] hover:text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] rounded-lg text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#D92D20]" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Tên Khách hàng / Doanh nghiệp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="VD: Công ty TNHH Vận tải Á Châu..."
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs font-medium text-[#17202E] bg-white focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="VD: 0912.345.678"
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-mono text-xs font-medium text-[#17202E] bg-white focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">Mã số thuế doanh nghiệp</label>
                  <input
                    type="text"
                    value={formTaxCode}
                    onChange={(e) => setFormTaxCode(e.target.value)}
                    placeholder="VD: 0102345678"
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-mono text-xs font-medium text-[#17202E] bg-white focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Địa chỉ trụ sở / Kho bãi</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="VD: Cửa khẩu Tà Lùng, Quảng Hòa, Cao Bằng..."
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs font-medium text-[#17202E] bg-white focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Ghi chú đối tác / Loại hàng chuyên tuyến</label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="VD: Khách thường xuyên chạy hoa quả lạnh..."
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs font-medium text-[#17202E] bg-white focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all resize-none"
                />
              </div>

              {modalMode === 'EDIT' && (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="chkIsActive"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#326DD8] rounded border-[#D0D5DD] focus:ring-[#326DD8] cursor-pointer"
                  />
                  <label htmlFor="chkIsActive" className="text-xs font-medium text-[#344054] cursor-pointer">
                    Đang giao dịch hoạt động
                  </label>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E9F0] -mx-5 px-5 -mb-1">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowModal(false)}
                  className="py-2 px-4 text-xs font-semibold text-[#344054] bg-white hover:bg-[#F8F9FB] rounded-lg border border-[#D0D5DD] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-4 text-xs font-semibold text-white bg-[#0A9444] hover:bg-[#087a38] rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{modalMode === 'CREATE' ? 'Thêm khách hàng' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
