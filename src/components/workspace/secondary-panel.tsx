'use client';

import React from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface SecondaryPanelProps {
  title: string;
  count?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  headerActions?: React.ReactNode;
  searchSlot?: React.ReactNode;
  filterSlot?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  widthClass?: string;
}

export function SecondaryPanel({
  title,
  count,
  isCollapsed = false,
  onToggleCollapse,
  headerActions,
  searchSlot,
  filterSlot,
  children,
  className = '',
  widthClass = 'w-72 lg:w-80',
}: SecondaryPanelProps) {
  if (isCollapsed) {
    return (
      <div className="hidden lg:flex flex-col items-center py-3 px-1 bg-[#F8F9FB] border-r border-[#E5E9F0] w-12 shrink-0">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1.5 rounded-lg text-[#667085] hover:text-[#17202E] hover:bg-[#F1F4F8] transition-colors"
          title={`Mở rộng ${title}`}
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
        <span
          className="mt-6 text-[11px] font-semibold text-[#667085] tracking-wider uppercase select-none"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          {title} {count !== undefined && `(${count})`}
        </span>
      </div>
    );
  }

  return (
    <aside
      className={`hidden md:flex flex-col bg-[#F8F9FB] border-r border-[#E5E9F0] shrink-0 h-full ${widthClass} ${className}`}
    >
      {/* Panel Top Header */}
      <div className="h-12 border-b border-[#E5E9F0] px-3.5 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="text-xs font-semibold text-[#17202E] uppercase tracking-wide truncate">
            {title}
          </h2>
          {count !== undefined && (
            <span className="px-1.5 py-0.2 rounded-full text-[11px] font-semibold bg-[#F1F4F8] text-[#667085]">
              {count}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {headerActions}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={onToggleCollapse}
              className="p-1 rounded-md text-[#98A2B3] hover:text-[#17202E] hover:bg-[#F1F4F8] transition-colors"
              title="Thu gọn cột danh sách"
            >
              <PanelLeftClose className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Optional Search Area */}
      {searchSlot && (
        <div className="p-2.5 border-b border-[#E5E9F0] bg-[#F8F9FB]">
          {searchSlot}
        </div>
      )}

      {/* Optional Filter Area */}
      {filterSlot && (
        <div className="px-2.5 py-1.5 border-b border-[#E5E9F0] bg-[#F8F9FB]">
          {filterSlot}
        </div>
      )}

      {/* Scrollable Items Container */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#F0F2F6]">
        {children}
      </div>
    </aside>
  );
}
