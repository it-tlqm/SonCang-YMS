'use client';

import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  Clock, 
  Layers, 
  LogOut, 
  ShieldAlert, 
  Search,
  Check,
  XCircle,
  LucideIcon
} from 'lucide-react';

export type StatusVariant = 
  | 'success' 
  | 'warning' 
  | 'error' 
  | 'info' 
  | 'neutral' 
  | 'navy';

interface StatusBadgeProps {
  label: string;
  variant?: StatusVariant;
  icon?: LucideIcon | null;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({
  label,
  variant = 'neutral',
  icon: IconComponent,
  showDot = true,
  className = '',
}: StatusBadgeProps) {
  // Bảng phối màu theo chuẩn DS-02: Chữ tương phản cao trên nền tinted 10%
  const variantStyles: Record<StatusVariant, { bg: string; text: string; border: string; dot: string; defaultIcon: LucideIcon }> = {
    success: {
      bg: 'bg-[#ECFDF3]',
      text: 'text-[#0A9444]',
      border: 'border-[#A6F4C5]',
      dot: 'bg-[#0A9444]',
      defaultIcon: CheckCircle2,
    },
    warning: {
      bg: 'bg-[#FFFAEB]',
      text: 'text-[#B54708]',
      border: 'border-[#FEDF89]',
      dot: 'bg-[#B54708]',
      defaultIcon: AlertTriangle,
    },
    error: {
      bg: 'bg-[#FEF3F2]',
      text: 'text-[#D92D20]',
      border: 'border-[#FECDCA]',
      dot: 'bg-[#D92D20]',
      defaultIcon: XCircle,
    },
    info: {
      bg: 'bg-[#EFF8FF]',
      text: 'text-[#326DD8]',
      border: 'border-[#B2DDFF]',
      dot: 'bg-[#326DD8]',
      defaultIcon: Zap,
    },
    neutral: {
      bg: 'bg-[#F8F9FB]',
      text: 'text-[#475467]',
      border: 'border-[#E5E9F0]',
      dot: 'bg-[#98A2B3]',
      defaultIcon: Clock,
    },
    navy: {
      bg: 'bg-[#EFF4FF]',
      text: 'text-[#223873]',
      border: 'border-[#C7D7FE]',
      dot: 'bg-[#223873]',
      defaultIcon: Layers,
    },
  };

  const style = variantStyles[variant] || variantStyles.neutral;
  const FinalIcon = IconComponent !== undefined ? IconComponent : style.defaultIcon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-semibold border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      )}
      {FinalIcon && (
        <FinalIcon className="w-3.5 h-3.5 shrink-0" />
      )}
      <span className="truncate">{label}</span>
    </span>
  );
}
