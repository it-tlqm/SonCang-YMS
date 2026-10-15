'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface WorkspaceHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function WorkspaceHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
  actions,
  children,
}: WorkspaceHeaderProps) {
  return (
    <div className="border-b border-[#E5E9F0] bg-white px-5 py-4 shrink-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-9 h-9 rounded-lg bg-[#EAF1FD] text-[#326DD8] flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-semibold text-[#17202E] tracking-tight truncate">
                {title}
              </h1>
              {badge}
            </div>
            {subtitle && (
              <p className="text-xs text-[#667085] mt-0.5 truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {children && (
        <div className="mt-3 pt-3 border-t border-[#F0F2F6]">
          {children}
        </div>
      )}
    </div>
  );
}
