'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { VehicleVisit, ContainerVisit, ReeferPowerSession } from '@/types/domain.types';
import { 
  Search, 
  X, 
  Truck, 
  Layers, 
  Zap, 
  LogOut, 
  Receipt, 
  Clock, 
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { getVehicleTypeName, formatContainerSpec } from '@/lib/display-formatters';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const { yardId, repository } = useAuth();

  const [query, setQuery] = useState('');
  const [vehicles, setVehicles] = useState<VehicleVisit[]>([]);
  const [containers, setContainers] = useState<ContainerVisit[]>([]);
  const [reeferSessions, setReeferSessions] = useState<ReeferPowerSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Tải dữ liệu bãi khi mở modal
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      Promise.all([
        repository.getVehicles(yardId),
        repository.getContainers(yardId),
        repository.getReeferSessions(yardId),
      ])
        .then(([vList, cList, rList]) => {
          setVehicles(vList);
          setContainers(cList);
          setReeferSessions(rList);
        })
        .finally(() => {
          setIsLoading(false);
          setTimeout(() => inputRef.current?.focus(), 50);
        });
    } else {
      setQuery('');
    }
  }, [isOpen, yardId, repository]);

  // Phím Esc để đóng modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Chuẩn hóa chuỗi tìm kiếm (loại bỏ dấu gạch, dấu chấm, dấu cách)
  const normalize = (str: string) => str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

  // Lọc kết quả tìm kiếm
  const searchResults = useMemo(() => {
    const cleanQ = normalize(query);
    if (!cleanQ) return { matchedVehicles: [], matchedContainers: [] };

    // 1. Tìm xe theo biển số, CCCD, tên tài xế, mã vé
    const matchedVehicles = vehicles.filter((v) => {
      const plate = normalize(v.license_plate || '');
      const ticket = normalize(v.ticket_code || '');
      const note = normalize(v.note || '');
      return plate.includes(cleanQ) || ticket.includes(cleanQ) || note.includes(cleanQ);
    });

    // 2. Tìm container theo mã số cont, 7 số cuối
    const matchedContainers = containers.filter((c) => {
      const cNo = normalize(c.container_no_current);
      return cNo.includes(cleanQ);
    });

    return {
      matchedVehicles: matchedVehicles.slice(0, 8),
      matchedContainers: matchedContainers.slice(0, 8),
    };
  }, [query, vehicles, containers]);

  if (!isOpen) return null;

  const navigateTo = (url: string) => {
    onClose();
    router.push(url);
  };

  const hasResults = searchResults.matchedVehicles.length > 0 || searchResults.matchedContainers.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 md:p-16 animate-in fade-in">
      <div 
        className="bg-white rounded-2xl w-full max-w-2xl border border-[#E5E9F0] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header */}
        <div className="p-4 border-b border-[#E5E9F0] flex items-center gap-3 bg-[#F8F9FB]">
          <Search className="w-5 h-5 text-[#326DD8] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tra cứu nhanh biển số xe, số container, mã vé, CCCD... (VD: 11C, MSKU, 00109...)"
            className="flex-1 bg-transparent text-sm text-[#17202E] placeholder-[#98A2B3] focus:outline-none font-medium"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 text-[#98A2B3] hover:text-[#17202E] rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono text-[#667085] bg-white border border-[#E5E9F0]">
            ESC đóng
          </span>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-[#667085] space-y-2">
              <div className="w-6 h-6 border-2 border-[#326DD8] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs">Đang tải dữ liệu tra cứu toàn bãi...</span>
            </div>
          ) : !query.trim() ? (
            /* Hướng dẫn khi chưa gõ */
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EFF8FF] text-[#326DD8] flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#17202E]">Tra cứu nhanh toàn bộ Bến bãi Sơn Cảng</h4>
                <p className="text-[11px] text-[#667085] mt-1 max-w-sm mx-auto">
                  Gõ biển số xe hoặc mã container để định vị ngay vị trí đỗ, phiên điện lạnh, trạng thái thanh toán và hồ sơ xuất bãi.
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 pt-2">
                <span className="text-[11px] text-[#667085]">Gợi ý tra cứu:</span>
                <button
                  type="button"
                  onClick={() => setQuery('11C')}
                  className="px-2 py-0.5 rounded bg-[#F8F9FB] border border-[#E5E9F0] text-[11px] font-mono text-[#326DD8] hover:bg-[#EFF8FF]"
                >
                  11C
                </button>
                <button
                  type="button"
                  onClick={() => setQuery('MSKU')}
                  className="px-2 py-0.5 rounded bg-[#F8F9FB] border border-[#E5E9F0] text-[11px] font-mono text-[#326DD8] hover:bg-[#EFF8FF]"
                >
                  MSKU
                </button>
                <button
                  type="button"
                  onClick={() => setQuery('RF')}
                  className="px-2 py-0.5 rounded bg-[#F8F9FB] border border-[#E5E9F0] text-[11px] font-mono text-[#0A9444] hover:bg-[#ECFDF3]"
                >
                  Reefer (RF)
                </button>
              </div>
            </div>
          ) : !hasResults ? (
            /* Không tìm thấy */
            <div className="py-10 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-[#98A2B3] mx-auto" />
              <p className="text-xs font-semibold text-[#17202E]">Không tìm thấy phương tiện hoặc container khớp từ khóa &quot;{query}&quot;</p>
              <p className="text-[11px] text-[#667085]">Vui lòng kiểm tra lại biển số hoặc 7 chữ số cuối của container.</p>
            </div>
          ) : (
            /* Danh sách kết quả */
            <div className="space-y-4">
              {/* 1. KẾT QUẢ XE */}
              {searchResults.matchedVehicles.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#667085] uppercase tracking-wider px-1">
                    <span className="flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-[#326DD8]" />
                      <span>Phương tiện ({searchResults.matchedVehicles.length})</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {searchResults.matchedVehicles.map((v) => {
                      const isInYard = v.status === 'IN_YARD';
                      return (
                        <div
                          key={v.id}
                          onClick={() => navigateTo(isInYard ? `/yard?search=${encodeURIComponent(v.license_plate || '')}` : `/exit?search=${encodeURIComponent(v.license_plate || '')}`)}
                          className="p-3 rounded-xl border border-[#E5E9F0] hover:border-[#B2DDFF] hover:bg-[#F8FBFF] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isInYard ? 'bg-[#ECFDF3] text-[#0A9444]' : 'bg-[#F1F4F8] text-[#667085]'
                            }`}>
                              <Truck className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-[#17202E] group-hover:text-[#326DD8] transition-colors">
                                  {v.license_plate}
                                </span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                                  isInYard ? 'bg-[#ECFDF3] text-[#0A9444] border-[#A6F4C5]' : 'bg-[#F5F7FA] text-[#667085] border-[#E5E9F0]'
                                }`}>
                                  {isInYard ? 'Đang trong bãi' : 'Đã xuất bãi'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#667085] truncate mt-0.5">
                                {getVehicleTypeName(v.vehicle_type)} • Vé: {v.ticket_code || '---'} • Vào: {new Date(v.entry_at).toLocaleTimeString('vi-VN')} {new Date(v.entry_at).toLocaleDateString('vi-VN')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-semibold text-[#326DD8] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                              <span>Xem</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 2. KẾT QUẢ CONTAINER */}
              {searchResults.matchedContainers.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#667085] uppercase tracking-wider px-1">
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-[#0A9444]" />
                      <span>Container ({searchResults.matchedContainers.length})</span>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {searchResults.matchedContainers.map((c) => {
                      const isInYard = c.status === 'IN_YARD';
                      const activeSession = reeferSessions.find((s) => s.container_visit_id === c.id && s.power_status === 'PLUGGED');

                      return (
                        <div
                          key={c.id}
                          onClick={() => navigateTo(activeSession ? `/reefer?search=${encodeURIComponent(c.container_no_current)}` : `/yard?search=${encodeURIComponent(c.container_no_current)}`)}
                          className="p-3 rounded-xl border border-[#E5E9F0] hover:border-[#A6F4C5] hover:bg-[#F6FEF9] transition-all cursor-pointer flex items-center justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              activeSession ? 'bg-[#FEF6EE] text-[#B54708]' : (isInYard ? 'bg-[#ECFDF3] text-[#0A9444]' : 'bg-[#F1F4F8] text-[#667085]')
                            }`}>
                              {activeSession ? <Zap className="w-4 h-4 text-[#B54708] animate-pulse" /> : <Layers className="w-4 h-4" />}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-[#17202E] group-hover:text-[#0A9444] transition-colors">
                                  {c.container_no_current}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-[#F5F7FA] text-[#667085] border border-[#E5E9F0]">
                                  {formatContainerSpec(c.container_size, c.container_type)}
                                </span>
                                {activeSession && (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[#FEF6EE] text-[#B54708] border border-[#FEE4E2] flex items-center gap-1">
                                    <Zap className="w-3 h-3 text-[#B54708]" />
                                    <span>Đang cắm điện ({activeSession.plug_socket_code || 'Ổ 380V'})</span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-[#667085] truncate mt-0.5">
                                Trạng thái: {isInYard ? 'Trong bãi' : 'Đã xuất bãi'} • Vào bãi: {new Date(c.inbound_at).toLocaleString('vi-VN')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-semibold text-[#0A9444] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                              <span>Xem</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer: Shortcut Hints */}
        <div className="p-3 bg-[#F8F9FB] border-t border-[#E5E9F0] flex items-center justify-between text-[11px] text-[#667085]">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E9F0] rounded text-[10px] font-mono">Alt + 1</kbd> Cổng vào
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E9F0] rounded text-[10px] font-mono">Alt + 2</kbd> Bến bãi
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E9F0] rounded text-[10px] font-mono">Alt + 3</kbd> Cắm điện
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-[#E5E9F0] rounded text-[10px] font-mono">Alt + 4</kbd> Cổng ra
            </span>
          </div>
          <span>Bấm <strong>ESC</strong> để đóng</span>
        </div>
      </div>
    </div>
  );
}
