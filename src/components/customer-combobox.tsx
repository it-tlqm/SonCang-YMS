'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Customer } from '@/types/domain.types';
import { useAuth } from '@/contexts/auth-context';
import { Search, Plus, Check, ChevronDown, User, Phone, X, Loader2 } from 'lucide-react';

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

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
        <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white border border-slate-300 rounded shadow-lg max-h-72 flex flex-col animate-in fade-in zoom-in-95 duration-100">
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
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCustomer(c)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-blue-50 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/70 font-bold text-[#223873]' : 'text-slate-800'
                    }`}
                  >
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900">{c.name}</span>
                      {c.phone && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5 font-mono">
                          <Phone className="w-2.5 h-2.5" />
                          {c.phone}
                        </span>
                      )}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#223873] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer nhỏ thông báo */}
          <div className="p-1.5 bg-slate-50 border-t border-slate-200 text-[10px] text-slate-400 text-center">
            {customers.length} khách hàng trong danh mục chuẩn Sơn Cảng
          </div>
        </div>
      )}
    </div>
  );
}
