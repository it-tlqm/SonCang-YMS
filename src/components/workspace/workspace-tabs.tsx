'use client';

import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ComponentType<{ className?: string }>;
}

interface WorkspaceTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function WorkspaceTabs({
  tabs,
  activeTab,
  onChange,
  className = '',
}: WorkspaceTabsProps) {
  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
              isActive
                ? 'bg-[#EAF1FD] text-[#326DD8] font-semibold shadow-2xs border border-[#D0E1FD]'
                : 'text-[#667085] hover:text-[#17202E] hover:bg-[#F1F4F8] border border-transparent'
            }`}
          >
            {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#326DD8]' : 'text-[#667085]'}`} />}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[11px] font-semibold ${
                  isActive
                    ? 'bg-[#326DD8] text-white'
                    : 'bg-[#F1F4F8] text-[#667085]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
