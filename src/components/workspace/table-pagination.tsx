'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  itemLabel?: string;
}

export function TablePagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  className = '',
  itemLabel = 'bản ghi',
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, safeCurrentPage * pageSize);

  // Sinh danh sách trang hiển thị thông minh (có dấu ...)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Luôn có trang 1
      pages.push(1);

      if (safeCurrentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (safeCurrentPage < totalPages - 2) {
        pages.push('...');
      }

      // Luôn có trang cuối
      pages.push(totalPages);
    }

    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`px-4 py-3 bg-white border-t border-[#E5E9F0] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs select-none rounded-b-xl ${className}`}
    >
      {/* 1. Thông tin bộ đếm và tùy chọn số dòng/trang */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="text-[#667085]">
          Hiển thị <span className="font-semibold text-[#17202E]">{startItem}</span> –{' '}
          <span className="font-semibold text-[#17202E]">{endItem}</span> trên{' '}
          <span className="font-semibold text-[#17202E]">{totalItems}</span> {itemLabel}
        </div>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-[#667085]">
            <span className="hidden md:inline">|</span>
            <span className="hidden md:inline">Xem:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1); // Reset về trang 1 khi đổi kích thước
              }}
              className="px-2 py-1 bg-[#F8F9FB] border border-[#D0D5DD] rounded-lg text-xs font-semibold text-[#17202E] focus:outline-none focus:ring-1 focus:ring-[#326DD8] focus:border-[#326DD8] cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} / trang
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Cụm nút điều hướng trang */}
      <div className="flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
        {/* Nút Về đầu trang */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage <= 1}
          title="Về trang đầu"
          className="p-1.5 rounded-lg border border-[#E5E9F0] text-[#667085] hover:bg-[#F1F4F8] hover:text-[#17202E] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Nút Trang trước */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          title="Trang trước"
          className="p-1.5 rounded-lg border border-[#E5E9F0] text-[#667085] hover:bg-[#F1F4F8] hover:text-[#17202E] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Danh sách số trang (ẩn trên mobile nhỏ, hiển thị text rút gọn) */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 py-1 text-[#98A2B3] font-medium">
                  ...
                </span>
              );
            }

            const pageNum = Number(p);
            const isActive = pageNum === safeCurrentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[30px] h-[30px] px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#326DD8] text-white shadow-xs'
                    : 'border border-[#E5E9F0] text-[#667085] hover:bg-[#F1F4F8] hover:text-[#17202E]'
                }`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Mobile: Hiển thị tóm tắt trang */}
        <div className="sm:hidden px-2 font-medium text-xs text-[#17202E]">
          {safeCurrentPage} / {totalPages}
        </div>

        {/* Nút Trang kế tiếp */}
        <button
          type="button"
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= totalPages}
          title="Trang sau"
          className="p-1.5 rounded-lg border border-[#E5E9F0] text-[#667085] hover:bg-[#F1F4F8] hover:text-[#17202E] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Nút Đến trang cuối */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage >= totalPages}
          title="Đến trang cuối"
          className="p-1.5 rounded-lg border border-[#E5E9F0] text-[#667085] hover:bg-[#F1F4F8] hover:text-[#17202E] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors cursor-pointer"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
