'use client';

import React from 'react';
import { X } from 'lucide-react';

interface RightContextPanelProps {
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onClose: () => void;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
  widthClass?: string;
}

export function RightContextPanel({
  title,
  subtitle,
  isOpen,
  onClose,
  headerActions,
  children,
  footerActions,
  widthClass = 'w-80 2xl:w-88',
}: RightContextPanelProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop mờ chỉ hiển thị trên màn hình Tablet & Mobile (< xl) */}
      <div
        className="fixed inset-0 bg-slate-900/25 z-40 backdrop-blur-2xs xl:hidden animate-in fade-in duration-150"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel: Drawer trượt trên Tablet & Mobile, Cột cố định trên Desktop (>= xl) */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-white shadow-xl flex flex-col border-l border-[#E5E9F0] animate-in slide-in-from-right-4 duration-200 xl:relative xl:inset-auto xl:z-20 xl:shadow-none xl:h-full ${widthClass} shrink-0`}
      >
        {/* Panel Top Header */}
        <div className="h-12 border-b border-[#E5E9F0] px-4 flex items-center justify-between bg-[#F8F9FB] shrink-0">
          <div className="min-w-0">
            <h2 className="text-xs font-semibold text-[#17202E] uppercase tracking-wide truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[11px] text-[#667085] truncate">
                {subtitle}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {headerActions}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-[#98A2B3] hover:text-[#17202E] hover:bg-[#F1F4F8] transition-colors cursor-pointer"
              title="Đóng bảng thông tin"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {children}
        </div>

        {/* Optional Sticky Footer Actions */}
        {footerActions && (
          <div className="p-3.5 border-t border-[#E5E9F0] bg-[#F8F9FB] shrink-0">
            {footerActions}
          </div>
        )}
      </aside>
    </>
  );
}
