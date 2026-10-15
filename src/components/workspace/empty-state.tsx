'use client';

import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <div className="w-12 h-12 rounded-xl bg-[#F8F9FB] border border-[#E5E9F0] text-[#98A2B3] flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 stroke-[1.5]" />
      </div>
      <h3 className="text-sm font-semibold text-[#17202E] mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-[#667085] max-w-sm mb-4 leading-relaxed">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
