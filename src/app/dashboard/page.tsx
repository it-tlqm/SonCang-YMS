'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { 
  VehicleVisit, 
  ContainerVisit, 
  ReeferPowerSession, 
  ChargeItem, 
  VehicleType 
} from '@/types/domain.types';
import { 
  Truck, 
  Layers, 
  Zap, 
  Receipt, 
  Clock, 
  ArrowUpRight, 
  RefreshCw, 
  ShieldCheck,
  CheckCircle2,
  Search,
  X,
  BarChart3,
  ExternalLink,
  MapPin,
  Eye,
  AlertTriangle,
  ChevronRight,
  Info
} from 'lucide-react';
import { getVehicleTypeName, formatContainerSpec } from '@/lib/display-formatters';

export default function DashboardPage() {
  const { yardId, repository, role, can } = useAuth();

  const [vehicles, setVehicles] = useState<VehicleVisit[]>([]);
  const [containers, setContainers] = useState<ContainerVisit[]>([]);
  const [allVehicles, setAllVehicles] = useState<VehicleVisit[]>([]);
  const [allContainers, setAllContainers] = useState<ContainerVisit[]>([]);
  const [reeferSessions, setReeferSessions] = useState<ReeferPowerSession[]>([]);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [longStayContainers, setLongStayContainers] = useState<ContainerVisit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // State Tra cứu nhanh Phương tiện & Container Toàn bãi
  const [quickSearchText, setQuickSearchText] = useState<string>('');
  const [selectedLookupVehicle, setSelectedLookupVehicle] = useState<VehicleVisit | null>(null);
  const [selectedLookupContainer, setSelectedLookupContainer] = useState<ContainerVisit | null>(null);

  // R2-04: Phân quyền xem số liệu tài chính theo RBAC V5 (report.revenue.read)
  const canReadFinance = can('report.revenue.read');

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      repository.getVehicles(yardId),
      repository.getContainers(yardId),
      repository.getReeferSessions(yardId),
      canReadFinance ? repository.getCharges(yardId) : Promise.resolve([]),
      repository.getVehicleTypes(),
    ])
      .then(([vList, cList, rList, chList, vtList]) => {
        if (isMounted) {
          setAllVehicles(vList);
          setAllContainers(cList);
          const inYardV = vList.filter((v) => v.status === 'IN_YARD');
          const inYardC = cList.filter((c) => c.status === 'IN_YARD');
          setVehicles(inYardV);
          setContainers(inYardC);
          setReeferSessions(rList);
          setCharges(chList);
          setVehicleTypes(vtList);

          const currentTime = Date.now();
          const longStay = inYardC.filter((c) => {
            const entryTime = new Date(c.inbound_at).getTime();
            return (currentTime - entryTime) / (1000 * 60 * 60) >= 24;
          });
          setLongStayContainers(longStay);
        }
      })
      .catch((err) => {
        console.error('Lỗi nạp dữ liệu Dashboard:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [repository, yardId, canReadFinance]);

  const handleReload = () => {
    setIsLoading(true);
    Promise.all([
      repository.getVehicles(yardId),
      repository.getContainers(yardId),
      repository.getReeferSessions(yardId),
      canReadFinance ? repository.getCharges(yardId) : Promise.resolve([]),
      repository.getVehicleTypes(),
    ])
      .then(([vList, cList, rList, chList, vtList]) => {
        setAllVehicles(vList);
        setAllContainers(cList);
        const inYardV = vList.filter((v) => v.status === 'IN_YARD');
        const inYardC = cList.filter((c) => c.status === 'IN_YARD');
        setVehicles(inYardV);
        setContainers(inYardC);
        setReeferSessions(rList);
        setCharges(chList);
        setVehicleTypes(vtList);

        const currentTime = Date.now();
        const longStay = inYardC.filter((c) => {
          const entryTime = new Date(c.inbound_at).getTime();
          return (currentTime - entryTime) / (1000 * 60 * 60) >= 24;
        });
        setLongStayContainers(longStay);
      })
      .catch((err) => {
        console.error('Lỗi làm mới dữ liệu Dashboard:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Tính toán số liệu thống kê
  const totalVehiclesInYard = vehicles.length;
  const totalContainersInYard = containers.length;
  const activeReeferCount = reeferSessions.filter((s) => s.power_status === 'PLUGGED').length;

  const containersHang = containers.filter((c) => c.cargo_status === 'HANG').length;
  const containersRong = containers.filter((c) => c.cargo_status === 'RONG').length;
  const containersChuaXD = containers.filter((c) => c.cargo_status === 'CHUA_XAC_DINH').length;

  // Tính doanh thu từ Sổ cái charges (nếu có quyền xem)
  const paidCharges = charges.filter((ch) => ch.status === 'PAID');
  const unpaidCharges = charges.filter((ch) => ch.status === 'UNPAID');

  const totalCollectedAmount = paidCharges.reduce((acc, curr) => acc + curr.paid_amount, 0);
  const totalReceivableAmount = unpaidCharges.reduce((acc, curr) => acc + (curr.amount - curr.paid_amount), 0);

  // Phân bổ phương tiện theo 7 loại xe V5
  const vehicleDistribution = vehicleTypes.map((vt) => {
    const count = vehicles.filter(
      (v) => v.vehicle_type === vt.code
    ).length;
    return {
      type: vt,
      count,
      percent: totalVehiclesInYard > 0 ? Math.round((count / totalVehiclesInYard) * 100) : 0,
    };
  });

  // Tra cứu nhanh toàn bãi
  const searchKeyword = quickSearchText.trim().toUpperCase();
  const isSearching = searchKeyword.length >= 2;

  const matchedVehicles = React.useMemo(() => {
    if (!isSearching) return [];
    return allVehicles.filter(v => 
      v.license_plate?.toUpperCase().includes(searchKeyword) ||
      v.ticket_code?.toUpperCase().includes(searchKeyword)
    ).slice(0, 8);
  }, [allVehicles, searchKeyword, isSearching]);

  const matchedContainers = React.useMemo(() => {
    if (!isSearching) return [];
    return allContainers.filter(c => 
      c.container_no_current?.toUpperCase().includes(searchKeyword) ||
      c.container_no_original?.toUpperCase().includes(searchKeyword)
    ).slice(0, 8);
  }, [allContainers, searchKeyword, isSearching]);

  return (
    <div className="space-y-4">
      {/* 1. HEADER & THỜI GIAN THỰC */}
      <div className="bg-white rounded-lg p-3.5 sm:p-4 border border-slate-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-200">
              Giám sát Vận hành
            </span>
            <span className="text-xs font-semibold text-slate-500 font-mono">
              Mã cảng: SC-TALUNG
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
            Tổng quan Vận hành Cảng cạn Sơn Cảng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cửa khẩu Quốc tế Tà Lùng — Công ty Cổ phần Tà Lùng Quang Minh
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleReload}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded border border-slate-300 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Đang cập nhật...' : 'Cập nhật số liệu'}</span>
          </button>
        </div>
      </div>

      {/* 1.1 THANH TRA CỨU NHANH PHƯƠNG TIỆN & CONTAINER TOÀN BÃI */}
      <div className="bg-white rounded-lg p-3.5 sm:p-4 border border-slate-300 shadow-2xs relative">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={quickSearchText}
              onChange={(e) => setQuickSearchText(e.target.value)}
              placeholder="Tra cứu nhanh toàn bãi theo Biển số xe hoặc Số Container... (Ví dụ: 11C, KKKK, BMOU)"
              className="w-full pl-9 pr-8 py-1.5 text-xs font-mono font-semibold bg-slate-50 border border-slate-300 rounded focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 text-slate-900 placeholder:text-slate-400 placeholder:font-sans"
            />
            {quickSearchText && (
              <button
                type="button"
                onClick={() => setQuickSearchText('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-slate-600 shrink-0">
            <span className="font-semibold">Khớp:</span>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-bold border border-blue-200 font-mono">
              {matchedVehicles.length} Xe
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 font-mono">
              {matchedContainers.length} Cont
            </span>
          </div>
        </div>

        {/* BẢNG KẾT QUẢ TRA CỨU NHANH (KHI ĐANG TÌM KIẾM) */}
        {isSearching && (
          <div className="mt-3 pt-3 border-t border-slate-200 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <span>Kết quả tra cứu cho:</span>
                <span className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                  &ldquo;{quickSearchText}&rdquo;
                </span>
              </span>
              <button
                type="button"
                onClick={() => setQuickSearchText('')}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Đóng kết quả [✕]
              </button>
            </div>

            {matchedVehicles.length === 0 && matchedContainers.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded border border-slate-200">
                Không tìm thấy phương tiện hoặc container nào khớp với từ khóa &ldquo;{quickSearchText}&rdquo;.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Cột Xe khớp */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1 border-b border-slate-200">
                    <span className="flex items-center space-x-1.5">
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      <span>Phương tiện ({matchedVehicles.length})</span>
                    </span>
                  </div>
                  {matchedVehicles.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic py-2">Không có xe khớp</div>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {matchedVehicles.map((v) => {
                        const inYard = v.status === 'IN_YARD';
                        return (
                          <div
                            key={v.id}
                            onClick={() => setSelectedLookupVehicle(v)}
                            className="p-2 rounded border border-slate-200 bg-white hover:border-slate-400 hover:shadow-2xs transition-all cursor-pointer flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  {v.license_plate}
                                </span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                  inYard ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                  {inYard ? 'Trong bãi' : 'Đã ra'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {getVehicleTypeName(v.vehicle_type)}
                                {v.yard_zone && ` • Khu ${v.yard_zone}`}
                                {v.slot_code && ` • Ô ${v.slot_code}`}
                              </div>
                            </div>
                            <div className="text-right flex items-center space-x-1.5">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                v.ticket_payment_status === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : v.ticket_payment_status === 'EXEMPT'
                                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                                  : 'bg-amber-50 text-amber-800 border-amber-300'
                              }`}>
                                {v.ticket_payment_status === 'PAID' ? 'Đã thu' : (v.ticket_payment_status === 'EXEMPT' ? 'Miễn phí' : 'Chưa thu')}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Cột Container khớp */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700 pb-1 border-b border-slate-200">
                    <span className="flex items-center space-x-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Container ({matchedContainers.length})</span>
                    </span>
                  </div>
                  {matchedContainers.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic py-2">Không có container khớp</div>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                      {matchedContainers.map((c) => {
                        const inYard = c.status === 'IN_YARD';
                        const isPlugged = reeferSessions.some(
                          (s) => s.container_visit_id === c.id && s.power_status === 'PLUGGED'
                        );
                        return (
                          <div
                            key={c.id}
                            onClick={() => setSelectedLookupContainer(c)}
                            className="p-2 rounded border border-slate-200 bg-white hover:border-slate-400 hover:shadow-2xs transition-all cursor-pointer flex items-center justify-between text-xs"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  {c.container_no_current}
                                </span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                  inYard ? 'bg-emerald-50 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                  {inYard ? 'Trong bãi' : 'Đã ra'}
                                </span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                                  c.cargo_status === 'HANG'
                                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                                    : c.cargo_status === 'RONG'
                                    ? 'bg-blue-50 text-blue-800 border-blue-300'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                  {c.cargo_status === 'HANG' ? 'HÀNG' : (c.cargo_status === 'RONG' ? 'RỖNG' : 'Chưa XĐ')}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                {formatContainerSpec(c.container_size, c.container_type)}
                                {c.yard_zone && ` • Khu ${c.yard_zone}`}
                                {c.slot_code && ` • Ô ${c.slot_code}`}
                              </div>
                            </div>
                            <div className="text-right flex items-center space-x-1.5">
                              {isPlugged && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-300 flex items-center space-x-0.5">
                                  <Zap className="w-2.5 h-2.5" />
                                  <span>Đang cắm</span>
                                </span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. 4 CARDS KPI CỐT LÕI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Xe trong bãi */}
        <div className="bg-white rounded-lg p-3.5 border border-slate-300 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Xe trong bãi</span>
            <div className="p-2 rounded bg-slate-100 text-slate-700 border border-slate-200">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold font-mono text-slate-900">{totalVehiclesInYard}</span>
            <span className="text-xs font-semibold text-slate-500">phương tiện</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Công suất bãi</span>
            <span className="font-bold text-[#0A9444]">Bình thường</span>
          </div>
        </div>

        {/* Card 2: Container trong bãi */}
        <div className="bg-white rounded-lg p-3.5 border border-slate-300 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Container tồn bãi</span>
            <div className="p-2 rounded bg-blue-50 text-[#223873] border border-blue-200">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold font-mono text-[#223873]">{totalContainersInYard}</span>
            <span className="text-xs font-semibold text-slate-500">cont</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Hàng: <strong className="text-emerald-800 font-mono font-bold">{containersHang}</strong></span>
            <span className="text-slate-500">Rỗng: <strong className="text-blue-800 font-mono font-bold">{containersRong}</strong></span>
          </div>
        </div>

        {/* Card 3: Cắm điện Reefer */}
        <div className="bg-white rounded-lg p-3.5 border border-slate-300 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Điện cont lạnh</span>
            <div className="p-2 rounded bg-amber-50 text-amber-700 border border-amber-200">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-bold font-mono text-amber-700">{activeReeferCount}</span>
            <span className="text-xs font-semibold text-slate-500">đang cắm</span>
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Đơn giá giờ</span>
            <span className="font-bold font-mono text-slate-800">100.000 đ/h</span>
          </div>
        </div>

        {/* Card 4: Doanh thu (khi có quyền tài chính) hoặc Cont lưu bãi lâu ngày (Điều phối) */}
        <div className="bg-white rounded-lg p-3.5 border border-slate-300 shadow-2xs">
          {canReadFinance ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Tổng thu ghi nhận</span>
                <div className="p-2 rounded bg-purple-50 text-purple-700 border border-purple-200">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline space-x-1">
                <span className="text-xl font-bold font-mono text-[#0A9444]">
                  {totalCollectedAmount.toLocaleString('vi-VN')}
                </span>
                <span className="text-xs font-bold text-slate-500">đ</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Phải thu:</span>
                <span className="font-bold font-mono text-amber-800">{totalReceivableAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Cont lưu bãi lâu (&ge;24h)</span>
                <div className="p-2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                  <Clock className="w-4 h-4 text-rose-600" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold font-mono text-rose-700">{longStayContainers.length}</span>
                <span className="text-xs font-semibold text-slate-500">cont</span>
              </div>
              <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Tình trạng bãi:</span>
                <span className={`font-bold ${longStayContainers.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {longStayContainers.length > 0 ? 'Cần giải phóng' : 'Bình thường'}
                </span>
              </div>
            </>
          )}
        </div>
      </div>


      {/* 3. PHÂN BỔ 7 LOẠI XE V5 & TÌNH TRẠNG CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Cột 1 & 2: Phân bổ 7 loại xe V5 */}
        <div className="lg:col-span-2 bg-white rounded-lg p-3.5 sm:p-4 border border-slate-300 shadow-2xs space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Phân bổ Phương tiện theo Phân loại
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                Theo dõi cơ cấu phương tiện đang lưu bãi
              </p>
            </div>
            <Link
              href="/yard"
              className="inline-flex items-center space-x-1 text-xs font-bold text-[#223873] hover:underline"
            >
              <span>Xem chi tiết bãi</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2 pt-1">
            {vehicleDistribution.map((item) => (
              <div key={item.type.code} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800">
                    {item.type.name}
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold font-mono text-slate-900">{item.count} xe</span>
                    <span className="text-[11px] font-mono text-slate-500">({item.percent}%)</span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded overflow-hidden border border-slate-200">
                  <div
                    className="h-full bg-slate-800 rounded transition-all duration-300"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cột 3: Trạng thái Container & Cảnh báo */}
        <div className="bg-white rounded-lg p-3.5 sm:p-4 border border-slate-300 shadow-2xs space-y-3.5">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Trạng thái Hàng & Cảnh báo Lưu bãi
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Quy tắc: Miễn phí đêm đầu, tính phí từ đêm thứ 2
            </p>
          </div>

          {/* Phân bổ Hàng / Rỗng */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-50 p-2 rounded border border-emerald-300">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">HÀNG</span>
              <div className="text-base font-bold font-mono text-emerald-900 mt-0.5">{containersHang}</div>
            </div>
            <div className="bg-blue-50 p-2 rounded border border-blue-300">
              <span className="text-[10px] font-bold text-blue-800 uppercase">RỖNG</span>
              <div className="text-base font-bold font-mono text-blue-900 mt-0.5">{containersRong}</div>
            </div>
            <div className="bg-slate-50 p-2 rounded border border-slate-300">
              <span className="text-[10px] font-bold text-slate-700 uppercase">Chưa XĐ</span>
              <div className="text-base font-bold font-mono text-slate-900 mt-0.5">{containersChuaXD}</div>
            </div>
          </div>

          {/* Danh sách cảnh báo container ở lâu */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Container lưu &gt; 24h</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-rose-50 text-rose-800 border border-rose-300 font-mono font-bold">
                {longStayContainers.length} cont
              </span>
            </div>

            {longStayContainers.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center text-xs text-slate-500 font-medium flex items-center justify-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Không có container nào lưu quá 24h</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {longStayContainers.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 rounded bg-rose-50/60 border border-rose-200 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-900">{c.container_no_current}</span>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Vào: {new Date(c.inbound_at).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-rose-800 bg-rose-100 px-1.5 py-0.5 rounded border border-rose-300">
                      Tính phí lưu
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. TRUY CẬP NHANH VẬN HÀNH (QUICK ACTIONS THEO RBAC V5) */}
      <div className="bg-white rounded-lg p-3.5 sm:p-4 border border-slate-300 shadow-2xs">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2.5">
          Lối tắt Thao tác Vận hành (Theo vai trò: {role || 'Nhân viên'})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Link
            href="/entry"
            className="p-2.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex flex-col items-center text-center space-y-1 group cursor-pointer shadow-2xs"
          >
            <div className="p-1.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
              <Truck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Tiếp nhận cổng</span>
            <span className="text-[10px] text-slate-500">Tạo lượt xe/cont</span>
          </Link>

          <Link
            href="/yard"
            className="p-2.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex flex-col items-center text-center space-y-1 group cursor-pointer shadow-2xs"
          >
            <div className="p-1.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Giám sát bãi</span>
            <span className="text-[10px] text-slate-500">Sửa số & Hàng/Rỗng</span>
          </Link>

          <Link
            href="/reefer"
            className="p-2.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex flex-col items-center text-center space-y-1 group cursor-pointer shadow-2xs"
          >
            <div className="p-1.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Cắm/Rút điện</span>
            <span className="text-[10px] text-slate-500">Tính tiền điện 15p</span>
          </Link>

          <Link
            href="/billing"
            className="p-2.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex flex-col items-center text-center space-y-1 group cursor-pointer shadow-2xs"
          >
            <div className="p-1.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
              <Receipt className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Sổ cái & Thu phí</span>
            <span className="text-[10px] text-slate-500">Ghi sổ bất biến</span>
          </Link>

          <Link
            href="/exit"
            className="p-2.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex flex-col items-center text-center space-y-1 group cursor-pointer shadow-2xs"
          >
            <div className="p-1.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Xuất bãi</span>
            <span className="text-[10px] text-slate-500">Kiểm soát theo xe</span>
          </Link>

          <Link
            href="/reports"
            className="p-2.5 rounded bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex flex-col items-center text-center space-y-1 group cursor-pointer shadow-2xs"
          >
            <div className="p-1.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
              <BarChart3 className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Thống kê & Báo cáo</span>
            <span className="text-[10px] text-slate-500">Doanh thu & Sản lượng</span>
          </Link>
        </div>
      </div>

      {/* 5. GHI CHÚ CHÍNH SÁCH */}
      <div className="p-3 rounded bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start space-x-2.5">
        <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <strong className="font-bold">Nguyên tắc vận hành bến bãi:</strong>
          <p className="text-[11px] text-blue-800">
            Mọi thao tác thu tiền và xuất bãi tuân thủ phân định trách nhiệm: An ninh thu vé vào cổng và phí lưu bãi thực tế tại cổng ra; CCKB kiểm soát cắm điện và duyệt điều kiện xuất bãi.
          </p>
        </div>
      </div>

      {/* 6. MODAL CHI TIẾT TRA CỨU NHANH PHƯƠNG TIỆN */}
      {selectedLookupVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-lg max-w-lg w-full p-5 shadow-xl border border-slate-300 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-mono">
                    Phương tiện: {selectedLookupVehicle.license_plate}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Mã vé: {selectedLookupVehicle.ticket_code || 'Chưa cấp'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLookupVehicle(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-500">Phân loại xe:</span>
                  <div className="font-bold text-slate-900">
                    {getVehicleTypeName(selectedLookupVehicle.vehicle_type)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Trạng thái:</span>
                  <div>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      selectedLookupVehicle.status === 'IN_YARD'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {selectedLookupVehicle.status === 'IN_YARD' ? 'Đang trong bãi' : 'Đã xuất bãi'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Thời gian vào cổng:</span>
                  <div className="font-mono font-semibold text-slate-800">
                    {new Date(selectedLookupVehicle.entry_at).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Thời gian xuất bãi:</span>
                  <div className="font-mono font-semibold text-slate-800">
                    {selectedLookupVehicle.exit_at
                      ? new Date(selectedLookupVehicle.exit_at).toLocaleString('vi-VN')
                      : 'Đang lưu bãi'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Vị trí đỗ:</span>
                  <div className="font-bold text-[#223873]">
                    {selectedLookupVehicle.yard_zone
                      ? `Phân khu ${selectedLookupVehicle.yard_zone}${selectedLookupVehicle.slot_code ? ` • Ô ${selectedLookupVehicle.slot_code}` : ''}`
                      : 'Chưa chỉ định ô đỗ'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Tình trạng vé cổng:</span>
                  <div className="font-bold font-mono text-[#0A9444]">
                    {selectedLookupVehicle.ticket_payment_status === 'PAID'
                      ? 'ĐÃ THU TIỀN'
                      : selectedLookupVehicle.ticket_payment_status === 'EXEMPT'
                      ? 'MIỄN PHÍ'
                      : 'CHƯA THU (NỢ)'}
                  </div>
                </div>
              </div>

              {selectedLookupVehicle.driver_name && (
                <div className="p-2 rounded bg-blue-50/50 border border-blue-200 text-[11px]">
                  <span className="text-slate-500">Tài xế: </span>
                  <strong className="text-slate-800">{selectedLookupVehicle.driver_name}</strong>
                  {selectedLookupVehicle.driver_phone && (
                    <span className="text-slate-600 font-mono"> • ĐT: {selectedLookupVehicle.driver_phone}</span>
                  )}
                </div>
              )}

              {selectedLookupVehicle.note && (
                <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-700">Ghi chú: </span>
                  {selectedLookupVehicle.note}
                </div>
              )}
            </div>

            <div className="pt-2.5 border-t border-slate-200 flex items-center justify-end space-x-2">
              <Link
                href="/yard"
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors inline-flex items-center space-x-1"
              >
                <span>Xem trên Sơ đồ Bãi</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              {selectedLookupVehicle.status === 'IN_YARD' && (
                <Link
                  href="/exit"
                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#223873] hover:bg-[#1A2C5B] rounded transition-colors inline-flex items-center space-x-1 shadow-2xs"
                >
                  <span>Xử lý Xuất bãi</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL CHI TIẾT TRA CỨU NHANH CONTAINER */}
      {selectedLookupContainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-lg max-w-lg w-full p-5 shadow-xl border border-slate-300 space-y-3.5">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-mono">
                    {selectedLookupContainer.container_no_current}
                  </h3>
                  <div className="text-[11px] text-slate-500 font-mono">
                    Quy cách: {formatContainerSpec(selectedLookupContainer.container_size, selectedLookupContainer.container_type)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLookupContainer(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-500">Trạng thái lưu bãi:</span>
                  <div>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      selectedLookupContainer.status === 'IN_YARD'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {selectedLookupContainer.status === 'IN_YARD' ? 'Đang trong bãi' : 'Đã xuất bãi'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Tình trạng hàng:</span>
                  <div>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                      selectedLookupContainer.cargo_status === 'HANG'
                        ? 'bg-amber-50 text-amber-800 border-amber-300'
                        : selectedLookupContainer.cargo_status === 'RONG'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {selectedLookupContainer.cargo_status === 'HANG'
                        ? 'HÀNG'
                        : selectedLookupContainer.cargo_status === 'RONG'
                        ? 'RỖNG'
                        : 'CHƯA XÁC ĐỊNH'}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Xe chở vào:</span>
                  <div className="font-mono font-bold text-slate-900">
                    {selectedLookupContainer.inbound_license_plate || 'Chưa ghi nhận'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Vị trí đỗ bãi:</span>
                  <div className="font-bold text-[#0A9444]">
                    {selectedLookupContainer.yard_zone
                      ? `Phân khu ${selectedLookupContainer.yard_zone}${selectedLookupContainer.slot_code ? ` • Ô ${selectedLookupContainer.slot_code}` : ''}`
                      : 'Chưa chỉ định ô đỗ'}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Thời gian vào bãi:</span>
                  <div className="font-mono font-semibold text-slate-800">
                    {new Date(selectedLookupContainer.inbound_at).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-slate-500">Duyệt xuất bãi (Clearance):</span>
                  <div className="font-bold">
                    {selectedLookupContainer.clearance_status === 'CLEARED' ? (
                      <span className="text-emerald-700">Đã duyệt xuất</span>
                    ) : selectedLookupContainer.clearance_status === 'CLEARED_WITH_DEBT' ? (
                      <span className="text-blue-700">Duyệt nợ (Bảo lãnh)</span>
                    ) : (
                      <span className="text-amber-700">Chưa duyệt</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Tình trạng Cắm điện Reefer */}
              {(() => {
                const activeSession = reeferSessions.find(
                  (s) => s.container_visit_id === selectedLookupContainer.id && s.power_status === 'PLUGGED'
                );
                return (
                  <div className={`p-2.5 rounded border flex items-center justify-between ${
                    activeSession
                      ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <Zap className={`w-4 h-4 ${activeSession ? 'text-amber-600' : 'text-slate-400'}`} />
                      <div>
                        <div className="font-bold">
                          {activeSession ? 'Container đang cắm điện lạnh' : 'Không cắm điện lúc này'}
                        </div>
                        {activeSession && (
                          <div className="text-[11px] text-amber-800 font-mono mt-0.5">
                            Cắm từ: {new Date(activeSession.plugged_in_at).toLocaleTimeString('vi-VN')} {new Date(activeSession.plugged_in_at).toLocaleDateString('vi-VN')}
                          </div>
                        )}
                      </div>
                    </div>
                    {activeSession && (
                      <Link
                        href="/reefer"
                        className="px-2 py-1 text-[11px] font-bold bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors inline-flex items-center space-x-1 shadow-2xs"
                      >
                        <span>Quản lý điện</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="pt-2.5 border-t border-slate-200 flex items-center justify-end space-x-2">
              <Link
                href="/yard"
                className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors inline-flex items-center space-x-1"
              >
                <span>Xem trên Sơ đồ Bãi</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              {selectedLookupContainer.status === 'IN_YARD' && (
                <Link
                  href="/reefer"
                  className="px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded border border-amber-300 transition-colors inline-flex items-center space-x-1 shadow-2xs"
                >
                  <span>Cắm/Rút điện</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
