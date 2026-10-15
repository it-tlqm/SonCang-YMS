'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Customer } from '@/types/domain.types';
import { useAuth } from '@/contexts/auth-context';
import { 
  Search, 
  Plus, 
  Check, 
  ChevronDown, 
  User, 
  Phone, 
  X, 
  Loader2, 
  Pencil, 
  Trash2, 
  Building2, 
  Save, 
  ExternalLink 
} from 'lucide-react';

interface CustomerComboboxProps {
  value: string;
  onChange: (customerName: string, customer?: Customer) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function CustomerCombobox({
  value,
  onChange,
  placeholder = 'Chọn hoặc nhập tên khách hàng...',
  label,
  required = false,
  disabled = false,
  className = '',
}: CustomerComboboxProps) {
  const { repository } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State cho Modal Chỉnh sửa Khách hàng
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTaxCode, setEditTaxCode] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingCust, setIsDeletingCust] = useState(false);
  const [editError, setEditError] = useState('');

  // Load danh mục khách hàng
  useEffect(() => {
    let isMounted = true;
    async function loadCustomers() {
      try {
        setIsLoading(true);
        const list = await repository.getCustomers();
        if (isMounted) {
          setCustomers(list);
        }
      } catch (err) {
        console.error('Lỗi tải danh mục khách hàng:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadCustomers();
    return () => {
      isMounted = false;
    };
  }, [repository]);

  // Đóng dropdown khi click ra ngoài (trừ khi đang mở modal edit)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (editingCustomer) return;
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingCustomer]);

  // Tự động focus ô tìm kiếm khi mở popover
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Lọc danh sách theo từ khóa tìm kiếm
  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    const matchName = c.name.toLowerCase().includes(q);
    const matchPhone = c.phone ? c.phone.toLowerCase().includes(q) : false;
    const matchTax = c.tax_code ? c.tax_code.toLowerCase().includes(q) : false;
    return matchName || matchPhone || matchTax;
  });

  // Kiểm tra xem query hiện tại đã trùng khớp 100% với tên nào chưa
  const queryExactMatch = customers.some(
    (c) => c.name.trim().toLowerCase() === searchQuery.trim().toLowerCase()
  );

  // Xử lý tạo mới khách hàng nhanh (AppSheet Quick Add)
  const handleCreateNewCustomer = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newName = searchQuery.trim();
    if (!newName) return;

    try {
      setIsCreating(true);
      const res = await repository.createCustomer({ name: newName });
      if (res.success && res.customer) {
        setCustomers((prev) => {
          const exists = prev.some((c) => c.id === res.customer!.id);
          if (exists) return prev;
          return [res.customer!, ...prev];
        });
        onChange(res.customer.name, res.customer);
        setIsOpen(false);
        setSearchQuery('');
      }
    } catch (err) {
      console.error('Lỗi tạo khách hàng mới:', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectCustomer = (customer: Customer) => {
    onChange(customer.name, customer);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  // Mở Modal chỉnh sửa khách hàng
  const handleOpenEdit = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCustomer(c);
    setEditName(c.name);
    setEditPhone(c.phone || '');
    setEditTaxCode(c.tax_code || '');
    setEditNotes(c.notes || '');
    setEditError('');
  };

  // Lưu chỉnh sửa thông tin khách hàng
  const handleSaveEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    const trimmed = editName.trim();
    if (!trimmed) {
      setEditError('Tên khách hàng không được để trống.');
      return;
    }

    try {
      setIsSavingEdit(true);
      setEditError('');
      const res = await repository.updateCustomer({
        id: editingCustomer.id,
        name: trimmed,
        phone: editPhone.trim() || undefined,
        tax_code: editTaxCode.trim() || undefined,
        notes: editNotes.trim() || undefined,
      });

      if (!res.success || !res.customer) {
        setEditError(res.error || 'Lỗi cập nhật khách hàng.');
        return;
      }

      // Cập nhật danh sách local state
      setCustomers((prev) =>
        prev.map((c) => (c.id === editingCustomer.id ? res.customer! : c))
      );

      // Nếu khách hàng này đang được chọn ngoài form thì cập nhật tên hiển thị
      if (value.trim().toLowerCase() === editingCustomer.name.trim().toLowerCase()) {
        onChange(res.customer.name, res.customer);
      }

      setEditingCustomer(null);
    } catch (err: any) {
      setEditError('Lỗi cập nhật: ' + (err?.message || String(err)));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Xóa khách hàng
  const handleDeleteCustomer = async () => {
    if (!editingCustomer) return;
    if (!confirm(`Bạn có chắc chắn muốn xóa khách hàng "${editingCustomer.name}"?`)) {
      return;
    }

    try {
      setIsDeletingCust(true);
      const res = await repository.deleteCustomer(editingCustomer.id);
      if (!res.success) {
        setEditError(res.error || 'Lỗi xóa khách hàng.');
        return;
      }

      setCustomers((prev) => prev.filter((c) => c.id !== editingCustomer.id));
      if (value.trim().toLowerCase() === editingCustomer.name.trim().toLowerCase()) {
        onChange('');
      }
      setEditingCustomer(null);
    } catch (err: any) {
      setEditError('Lỗi xóa khách hàng: ' + (err?.message || String(err)));
    } finally {
      setIsDeletingCust(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Ô trigger hiển thị tên khách hàng được chọn */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3 py-1.5 border rounded text-xs sm:text-sm flex items-center justify-between cursor-pointer transition-colors ${
          disabled
            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
            ? 'border-[#223873] ring-1 ring-[#223873] bg-white'
            : 'border-slate-300 bg-white hover:border-slate-400 text-slate-900'
        }`}
      >
        <div className="flex items-center gap-2 truncate">
          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {value ? (
            <span className="font-semibold text-slate-900 truncate">{value}</span>
          ) : (
            <span className="text-slate-400 truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0 ml-1">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100"
              title="Xóa lựa chọn"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Popover Dropdown kiểu AppSheet */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-300 rounded shadow-lg max-h-80 flex flex-col animate-in fade-in zoom-in-95 duration-100">
          {/* Header tìm kiếm */}
          <div className="p-2 border-b border-slate-200 bg-slate-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Gõ tìm hoặc thêm tên mới..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (!queryExactMatch && searchQuery.trim()) {
                      handleCreateNewCustomer();
                    } else if (filteredCustomers.length > 0) {
                      handleSelectCustomer(filteredCustomers[0]);
                    }
                  }
                }}
                className="w-full pl-8 pr-2.5 py-1.5 border border-slate-300 rounded text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#223873]"
              />
            </div>
          </div>

          {/* Danh sách khách hàng & nút Quick Add */}
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {/* Quick Add Button nếu từ khóa chưa có trong danh mục */}
            {searchQuery.trim() !== '' && !queryExactMatch && (
              <button
                type="button"
                disabled={isCreating}
                onClick={handleCreateNewCustomer}
                className="w-full text-left px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-b border-emerald-200 flex items-center justify-between transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    {isCreating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-emerald-900 group-hover:underline">
                      + Thêm mới khách hàng: &quot;{searchQuery.trim()}&quot;
                    </div>
                    <div className="text-[10px] text-emerald-700">Lưu vào danh mục & chọn ngay</div>
                  </div>
                </div>
              </button>
            )}

            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#223873]" />
                <span>Đang tải danh mục khách hàng...</span>
              </div>
            ) : filteredCustomers.length === 0 && !searchQuery.trim() ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Chưa có danh mục khách hàng. Gõ tên để thêm mới.
              </div>
            ) : filteredCustomers.length === 0 && searchQuery.trim() && queryExactMatch ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Không tìm thấy khách hàng phù hợp.
              </div>
            ) : (
              filteredCustomers.map((c) => {
                const isSelected = value.trim().toLowerCase() === c.name.trim().toLowerCase();
                return (
                  <div
                    key={c.id}
                    className={`px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50/80 transition-colors group ${
                      isSelected ? 'bg-blue-50/70' : ''
                    }`}
                  >
                    <div 
                      onClick={() => handleSelectCustomer(c)}
                      className="flex-1 cursor-pointer pr-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${isSelected ? 'text-[#223873] font-bold' : 'text-slate-900'}`}>
                          {c.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#223873] shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-0.5">
                        {c.phone && (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="w-2.5 h-2.5" />
                            {c.phone}
                          </span>
                        )}
                        {c.tax_code && (
                          <span className="font-mono">MST: {c.tax_code}</span>
                        )}
                      </div>
                    </div>

                    {/* NÚT CHỈNH SỬA KHÁCH HÀNG (SỬA NHẦM TỨC THÌ) */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenEdit(c, e)}
                      title="Sửa thông tin khách hàng này"
                      className="p-1.5 text-slate-400 hover:text-blue-700 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors shrink-0 cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer liên kết quản lý danh mục */}
          <div className="p-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>{customers.length} khách hàng trong danh mục</span>
            <Link
              href="/admin/customers"
              onClick={() => setIsOpen(false)}
              className="text-[#223873] font-bold hover:underline flex items-center gap-1"
            >
              <span>Quản lý tất cả</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SỬA THÔNG TIN KHÁCH HÀNG TỨC THÌ (KHI THÊM NHẦM / SAI TÊN / SAI SĐT) */}
      {/* ========================================================================= */}
      {editingCustomer && (
        <div className="fixed inset-0 z-[60] bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 border border-[#E5E9F0] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 -mx-5 px-5 -mt-1">
              <div>
                <span className="text-[10px] font-bold text-[#326DD8] uppercase tracking-wider block">
                  Đối tác & Khách hàng
                </span>
                <h3 className="text-sm font-bold text-[#17202E] flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-4 h-4 text-[#326DD8]" />
                  <span>Chỉnh sửa thông tin Khách hàng / Chủ hàng</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="p-1.5 rounded-lg text-[#667085] hover:text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] rounded-lg text-xs font-semibold">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEditCustomer} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Tên Khách hàng / Doanh nghiệp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="VD: Công ty TNHH Vận tải Á Châu..."
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs font-medium text-[#17202E] bg-white focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="VD: 0912.345.678"
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-mono text-xs font-medium text-[#17202E] bg-white focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1">Mã số thuế (Tùy chọn)</label>
                  <input
                    type="text"
                    value={editTaxCode}
                    onChange={(e) => setEditTaxCode(e.target.value)}
                    placeholder="VD: 0102345678"
                    className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-mono text-xs font-medium text-[#17202E] bg-white focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">Ghi chú đối tác / Loại hàng</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="VD: Khách thường xuyên chạy hàng sầu riêng..."
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs font-medium text-[#17202E] bg-white focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#E5E9F0] -mx-5 px-5 -mb-1">
                <button
                  type="button"
                  disabled={isSavingEdit || isDeletingCust}
                  onClick={handleDeleteCustomer}
                  className="py-2 px-3.5 text-xs font-semibold text-[#D92D20] bg-[#FEF3F2] hover:bg-[#FEE4E2] border border-[#FECDCA] rounded-lg cursor-pointer flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa khách hàng</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={isSavingEdit || isDeletingCust}
                    onClick={() => setEditingCustomer(null)}
                    className="py-2 px-4 text-xs font-semibold text-[#344054] bg-white hover:bg-[#F8F9FB] rounded-lg border border-[#D0D5DD] transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit || isDeletingCust}
                    className="py-2 px-4 text-xs font-semibold text-white bg-[#0A9444] hover:bg-[#087a38] rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    {isSavingEdit ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Lưu thay đổi</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
