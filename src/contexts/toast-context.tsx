'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, duration: number = 3500) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, message, title, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Giữ tối đa 5 toast cùng lúc

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const success = useCallback((message: string, title?: string) => {
    showToast('success', message, title);
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    showToast('error', message, title, 5000); // Lỗi hiển thị 5s để đọc kịp
  }, [showToast]);

  const warning = useCallback((message: string, title?: string) => {
    showToast('warning', message, title);
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    showToast('info', message, title);
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, dismissToast }}>
      {children}
      {/* Toast Notification Container */}
      <div 
        aria-live="polite"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none select-none"
      >
        {toasts.map((toast) => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';
          const isInfo = toast.type === 'info';

          return (
            <div
              key={toast.id}
              role="status"
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
                isSuccess
                  ? 'bg-white/95 border-[#A6F4C5] text-[#17202E]'
                  : isError
                  ? 'bg-white/95 border-[#FECDCA] text-[#17202E]'
                  : isWarning
                  ? 'bg-white/95 border-[#FEDF89] text-[#17202E]'
                  : 'bg-white/95 border-[#B2DDFF] text-[#17202E]'
              }`}
            >
              {/* Icon */}
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-[#0A9444]" />}
                {isError && <AlertCircle className="w-5 h-5 text-[#D92D20]" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-[#B54708]" />}
                {isInfo && <Info className="w-5 h-5 text-[#326DD8]" />}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pr-1">
                {toast.title && (
                  <h4 className={`text-xs font-bold leading-tight mb-0.5 ${
                    isSuccess ? 'text-[#0A9444]' : isError ? 'text-[#D92D20]' : isWarning ? 'text-[#B54708]' : 'text-[#326DD8]'
                  }`}>
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs text-[#344054] leading-relaxed break-words font-medium">
                  {toast.message}
                </p>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="shrink-0 p-1 text-[#98A2B3] hover:text-[#17202E] hover:bg-[#F1F4F8] rounded-md transition-colors cursor-pointer"
                aria-label="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
