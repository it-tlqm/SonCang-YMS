'use client';

import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshCw, 
  ShieldCheck,
  CheckCircle2,
  Search,
  X,
  BarChart3,
  ExternalLink,
  MapPin,
  AlertTriangle,
  ChevronRight,
  Info,
  Calendar,
  AlertCircle,
  Eye,
  LogOut,
  ArrowRight,
  LayoutDashboard
} from 'lucide-react';
import { getVehicleTypeName, formatContainerSpec } from '@/lib/display-formatters';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { WorkspaceTabs } from '@/components/workspace/workspace-tabs';
import { SecondaryPanel } from '@/components/workspace/secondary-panel';
import { RightContextPanel } from '@/components/workspace/right-context-panel';
import { SearchInput } from '@/components/workspace/search-input';
import { StatusBadge } from '@/components/workspace/status-badge';
import { EmptyState } from '@/components/workspace/empty-state';

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

  // Active view tab in Main Workspace
  const [activeMainTab, setActiveMainTab] = useState<'vehicles' | 'containers' | 'reefer' | 'distribution'>('vehicles');

  // Secondary Panel State
  const [secondarySearch, setSecondarySearch] = useState<string>('');
  const [secondaryFilter, setSecondaryFilter] = useState<'ALL' | 'IN_YARD' | 'WARNING'>('IN_YARD');
  const [isSecondaryCollapsed, setIsSecondaryCollapsed] = useState<boolean>(false);

  // Right Context Panel Inspector State
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleVisit | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<ContainerVisit | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);

  // RBAC V5: Quyền xem tài chính
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

  // Tính toán số liệu thống kê chuẩn xác V5
  const totalVehiclesInYard = vehicles.length;
  const totalContainersInYard = containers.length;
  const activeReeferCount = reeferSessions.filter((s) => s.power_status === 'PLUGGED').length;
  const readyExitCount = vehicles.filter((v) => v.status === 'IN_YARD').length;

  // Tính doanh thu từ charges
  const paidCharges = charges.filter((ch) => ch.status === 'PAID');
  const unpaidCharges = charges.filter((ch) => ch.status === 'UNPAID');
  const totalReceivableAmount = unpaidCharges.reduce((acc, curr) => acc + (curr.amount - curr.paid_amount), 0);

  // Hàng đợi phương tiện lọc cho Secondary Panel
  const filteredQueueVehicles = useMemo(() => {
    return allVehicles.filter((v) => {
      const matchSearch = secondarySearch.trim() === '' || 
        (v.license_plate && v.license_plate.toUpperCase().includes(secondarySearch.trim().toUpperCase())) ||
        (v.ticket_code && v.ticket_code.toUpperCase().includes(secondarySearch.trim().toUpperCase()));
      
      if (!matchSearch) return false;

      if (secondaryFilter === 'IN_YARD') {
        return v.status === 'IN_YARD';
      }
      if (secondaryFilter === 'WARNING') {
        return v.status === 'IN_YARD' && (Date.now() - new Date(v.entry_at).getTime()) / (1000 * 60 * 60) >= 24;
      }
      return true;
    });
  }, [allVehicles, secondarySearch, secondaryFilter]);

  // Phân bổ phương tiện
  const vehicleDistribution = vehicleTypes.map((vt) => {
    const count = vehicles.filter((v) => v.vehicle_type === vt.code).length;
    return {
      type: vt,
      count,
      percent: totalVehiclesInYard > 0 ? Math.round((count / totalVehiclesInYard) * 100) : 0,
    };
  });

  const handleSelectVehicle = (v: VehicleVisit) => {
    setSelectedVehicle(v);
    // Tìm cont đi kèm nếu có
    const linkedCont = allContainers.find((c) => c.inbound_vehicle_visit_id === v.id);
    setSelectedContainer(linkedCont || null);
    setIsInspectorOpen(true);
  };

  const handleSelectContainer = (c: ContainerVisit) => {
    setSelectedContainer(c);
    const linkedVeh = allVehicles.find((v) => v.id === c.inbound_vehicle_visit_id);
    setSelectedVehicle(linkedVeh || null);
    setIsInspectorOpen(true);
  };

  const formatHoursInYard = (dateStr?: string | null) => {
    if (!dateStr) return '0h';
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const hrs = Math.floor(diffMs / (1000 * 60 * 60));
    return `${hrs}h`;
  };

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      {/* ============================================================== */}
      {/* 1. SECONDARY PANEL: HÀNG ĐỢI PHƯƠNG TIỆN & TRA CỨU NHANH         */}
      {/* ============================================================== */}
      <SecondaryPanel
        title="Hàng đợi Bến bãi"
        count={filteredQueueVehicles.length}
        isCollapsed={isSecondaryCollapsed}
        onToggleCollapse={() => setIsSecondaryCollapsed(!isSecondaryCollapsed)}
        searchSlot={
          <SearchInput
            value={secondarySearch}
            onChange={setSecondarySearch}
            placeholder="Tìm biển số, mã vé..."
          />
        }
        filterSlot={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSecondaryFilter('IN_YARD')}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                secondaryFilter === 'IN_YARD'
                  ? 'bg-white text-[#326DD8] font-semibold border border-[#E5E9F0] shadow-2xs'
                  : 'text-[#667085] hover:text-[#17202E]'
              }`}
            >
              Trong bãi ({vehicles.length})
            </button>
            <button
              type="button"
              onClick={() => setSecondaryFilter('ALL')}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                secondaryFilter === 'ALL'
                  ? 'bg-white text-[#326DD8] font-semibold border border-[#E5E9F0] shadow-2xs'
                  : 'text-[#667085] hover:text-[#17202E]'
              }`}
            >
              Tất cả ({allVehicles.length})
            </button>
            <button
              type="button"
              onClick={() => setSecondaryFilter('WARNING')}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                secondaryFilter === 'WARNING'
                  ? 'bg-white text-[#B54708] font-semibold border border-[#E5E9F0] shadow-2xs'
                  : 'text-[#667085] hover:text-[#B54708]'
              }`}
            >
              &gt;24h ({longStayContainers.length})
            </button>
          </div>
        }
      >
        {filteredQueueVehicles.length === 0 ? (
          <EmptyState
            title="Không tìm thấy phương tiện"
            description="Không có xe nào khớp với điều kiện lọc."
            className="py-12"
          />
        ) : (
          filteredQueueVehicles.map((v) => {
            const isSelected = selectedVehicle?.id === v.id;
            const hoursIn = formatHoursInYard(v.entry_at);
            const isLongStay = parseInt(hoursIn) >= 24;

            return (
              <div
                key={v.id}
                onClick={() => handleSelectVehicle(v)}
                className={`p-3 transition-colors cursor-pointer border-l-3 ${
                  isSelected
                    ? 'bg-[#EAF1FD] border-[#326DD8]'
                    : 'bg-white hover:bg-[#F8F9FB] border-transparent'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-mono font-semibold text-xs text-[#17202E]">
                    {v.license_plate || 'XE-BO-3-BANH'}
                  </span>
                  <StatusBadge
                    label={v.status === 'IN_YARD' ? 'Trong bãi' : 'Đã xuất'}
                    variant={v.status === 'IN_YARD' ? 'info' : 'success'}
                    showDot={false}
                    className="text-[10px] py-0 px-1.5"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#667085]">
                  <span className="truncate max-w-[130px]">
                    {getVehicleTypeName(v.vehicle_type)}
                  </span>
                  <span className={`font-mono ${isLongStay ? 'text-[#B54708] font-semibold' : ''}`}>
                    Lưu: {hoursIn}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </SecondaryPanel>

      {/* ============================================================== */}
      {/* 2. MAIN WORKSPACE: BÁO CÁO TỔNG QUAN & BẢNG VẬN HÀNH            */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white">
        {/* Workspace Top Header */}
        <WorkspaceHeader
          title="Tổng quan Vận hành Cảng cạn Sơn Cảng"
          subtitle="Hệ thống giám sát điều phối phương tiện & container theo thời gian thực"
          icon={LayoutDashboard}
          badge={
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF8FF] text-[#326DD8] border border-[#B2DDFF]">
              Bãi hoạt động
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleReload}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E9F0] text-xs font-medium text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#667085] ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
              </button>
              {can('vehicle.visit.create') && (
                <Link
                  href="/entry"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#087C3C] text-white text-xs font-semibold hover:bg-[#076934] transition-colors cursor-pointer shadow-2xs"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Tiếp nhận xe</span>
                </Link>
              )}
            </div>
          }
        />

        {/* COMPACT KPI METRIC STRIP (6 CHỈ SỐ GỌN GÀNG THEO YÊU CẦU) */}
        <div className="p-4 sm:p-5 border-b border-[#E5E9F0] bg-[#F8F9FB]/50">
          <div className="grid grid-cols-2 sm:grid-cols-3 2xl:grid-cols-6 gap-3">
            {/* 1. Xe trong bãi */}
            <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
              <div className="flex items-center justify-between text-[#667085] text-xs mb-1">
                <span>Xe trong bãi</span>
                <Truck className="w-3.5 h-3.5 text-[#326DD8]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#17202E]">
                {totalVehiclesInYard}
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5">
                Đang đỗ thực tế
              </div>
            </div>

            {/* 2. Container trong bãi */}
            <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
              <div className="flex items-center justify-between text-[#667085] text-xs mb-1">
                <span>Cont trong bãi</span>
                <Layers className="w-3.5 h-3.5 text-[#0A9444]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#17202E]">
                {totalContainersInYard}
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5">
                {containers.filter(c => c.cargo_status === 'HANG').length} hàng · {containers.filter(c => c.cargo_status === 'RONG').length} rỗng
              </div>
            </div>

            {/* 3. Container đang cắm điện */}
            <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
              <div className="flex items-center justify-between text-[#667085] text-xs mb-1">
                <span>Đang cắm điện</span>
                <Zap className="w-3.5 h-3.5 text-[#D97706]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#D97706]">
                {activeReeferCount}
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5">
                Container lạnh
              </div>
            </div>

            {/* 4. Xe chờ xuất bãi */}
            <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
              <div className="flex items-center justify-between text-[#667085] text-xs mb-1">
                <span>Xe chờ xuất</span>
                <LogOut className="w-3.5 h-3.5 text-[#475467]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#17202E]">
                {readyExitCount}
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5">
                Tại các luồng
              </div>
            </div>

            {/* 5. Khoản tiền chưa thu */}
            <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
              <div className="flex items-center justify-between text-[#667085] text-xs mb-1">
                <span>Chưa thanh toán</span>
                <Receipt className="w-3.5 h-3.5 text-[#D92D20]" />
              </div>
              <div className="text-base font-bold font-mono text-[#D92D20] truncate">
                {canReadFinance ? `${totalReceivableAmount.toLocaleString('vi-VN')} đ` : '••••••'}
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5 truncate">
                {canReadFinance ? `${unpaidCharges.length} khoản phí` : 'Phân quyền kế toán'}
              </div>
            </div>

            {/* 6. Việc cần xử lý */}
            <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
              <div className="flex items-center justify-between text-[#667085] text-xs mb-1">
                <span>Cần xử lý</span>
                <AlertTriangle className="w-3.5 h-3.5 text-[#B54708]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#B54708]">
                {longStayContainers.length}
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5">
                Lưu qua 24 giờ
              </div>
            </div>
          </div>
        </div>

        {/* WORKSPACE VIEW TABS */}
        <div className="px-5 pt-3 border-b border-[#E5E9F0] bg-white">
          <WorkspaceTabs
            tabs={[
              { id: 'vehicles', label: 'Phương tiện trong bãi', count: vehicles.length, icon: Truck },
              { id: 'containers', label: 'Container lưu bãi', count: containers.length, icon: Layers },
              { id: 'reefer', label: 'Phiên điện hoạt động', count: activeReeferCount, icon: Zap },
              { id: 'distribution', label: 'Phân loại phương tiện', icon: BarChart3 },
            ]}
            activeTab={activeMainTab}
            onChange={(id) => setActiveMainTab(id as any)}
          />
        </div>

        {/* DATA TABLE VIEW AREA */}
        <div className="p-5 flex-1">
          {activeMainTab === 'vehicles' && (
            <div className="border border-[#E5E9F0] rounded-lg overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FB] border-b border-[#E5E9F0] text-[#667085] uppercase text-[11px] font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Biển số / Mã vé</th>
                      <th className="px-4 py-2.5">Loại phương tiện</th>
                      <th className="px-4 py-2.5">Thời gian vào bãi</th>
                      <th className="px-4 py-2.5">Thời lượng lưu</th>
                      <th className="px-4 py-2.5">Trạng thái</th>
                      <th className="px-4 py-2.5 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E9F0]">
                    {vehicles.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#667085]">
                          Hiện không có phương tiện nào đang đỗ trong bãi.
                        </td>
                      </tr>
                    ) : (
                      vehicles.map((v) => {
                        const hours = formatHoursInYard(v.entry_at);
                        const isSelected = selectedVehicle?.id === v.id;

                        return (
                          <tr
                            key={v.id}
                            onClick={() => handleSelectVehicle(v)}
                            className={`transition-colors cursor-pointer ${
                              isSelected ? 'bg-[#EAF1FD]' : 'hover:bg-[#F8F9FB]'
                            }`}
                          >
                            <td className="px-4 py-2.5 font-mono font-semibold text-[#17202E]">
                              <div>{v.license_plate || 'XE-BO-3-BANH'}</div>
                              {v.ticket_code && (
                                <div className="text-[11px] text-[#667085] font-normal">{v.ticket_code}</div>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-[#475467]">
                              {getVehicleTypeName(v.vehicle_type)}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[#667085]">
                              {new Date(v.entry_at).toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-2.5 font-mono font-medium">
                              <span className={parseInt(hours) >= 24 ? 'text-[#B54708] font-bold' : 'text-[#17202E]'}>
                                {hours}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <StatusBadge label="Trong bãi" variant="info" />
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                type="button"
                                className="p-1 rounded text-[#98A2B3] hover:text-[#326DD8] hover:bg-[#EFF8FF] transition-colors"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMainTab === 'containers' && (
            <div className="border border-[#E5E9F0] rounded-lg overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FB] border-b border-[#E5E9F0] text-[#667085] uppercase text-[11px] font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Số Container</th>
                      <th className="px-4 py-2.5">Quy cách</th>
                      <th className="px-4 py-2.5">Hàng / Rỗng</th>
                      <th className="px-4 py-2.5">Thời gian vào bãi</th>
                      <th className="px-4 py-2.5">Lưu bãi</th>
                      <th className="px-4 py-2.5 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E9F0]">
                    {containers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#667085]">
                          Không có container nào đang lưu bãi.
                        </td>
                      </tr>
                    ) : (
                      containers.map((c) => {
                        const hours = formatHoursInYard(c.inbound_at);
                        const isSelected = selectedContainer?.id === c.id;

                        return (
                          <tr
                            key={c.id}
                            onClick={() => handleSelectContainer(c)}
                            className={`transition-colors cursor-pointer ${
                              isSelected ? 'bg-[#EAF1FD]' : 'hover:bg-[#F8F9FB]'
                            }`}
                          >
                            <td className="px-4 py-2.5 font-mono font-semibold text-[#17202E]">
                              {c.container_no_current}
                            </td>
                            <td className="px-4 py-2.5 text-[#475467] font-mono">
                              {formatContainerSpec(c.container_size, c.container_type)}
                            </td>
                            <td className="px-4 py-2.5">
                              {c.cargo_status === 'HANG' && (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF8FF] text-[#326DD8] border border-[#B2DDFF]">
                                  Có hàng
                                </span>
                              )}
                              {c.cargo_status === 'RONG' && (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F8F9FB] text-[#475467] border border-[#E5E9F0]">
                                  Vỏ rỗng
                                </span>
                              )}
                              {c.cargo_status === 'CHUA_XAC_DINH' && (
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]">
                                  Chưa định vị
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 font-mono text-[#667085]">
                              {new Date(c.inbound_at).toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-2.5 font-mono font-medium">
                              <span className={parseInt(hours) >= 24 ? 'text-[#B54708] font-bold' : 'text-[#17202E]'}>
                                {hours}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right">
                              <button
                                type="button"
                                className="p-1 rounded text-[#98A2B3] hover:text-[#326DD8] hover:bg-[#EFF8FF] transition-colors"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMainTab === 'reefer' && (
            <div className="border border-[#E5E9F0] rounded-lg overflow-hidden bg-white shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F8F9FB] border-b border-[#E5E9F0] text-[#667085] uppercase text-[11px] font-semibold">
                    <tr>
                      <th className="px-4 py-2.5">Số Container</th>
                      <th className="px-4 py-2.5">Giắc cắm</th>
                      <th className="px-4 py-2.5">Thời điểm cắm</th>
                      <th className="px-4 py-2.5">Thời lượng chạy</th>
                      <th className="px-4 py-2.5">Trạng thái điện</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E9F0]">
                    {reeferSessions.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#667085]">
                          Không có phiên cắm điện nào đang hoạt động.
                        </td>
                      </tr>
                    ) : (
                      reeferSessions.map((s) => (
                        <tr key={s.id} className="hover:bg-[#F8F9FB] transition-colors">
                          <td className="px-4 py-2.5 font-mono font-semibold text-[#17202E]">
                            {s.container_no || 'CONT-CHUA-GAN'}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[#475467]">
                            {s.plug_socket_code ? `Ổ cắm #${s.plug_socket_code}` : '---'}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-[#667085]">
                            {s.plugged_in_at
                              ? new Date(s.plugged_in_at).toLocaleString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  day: '2-digit',
                                  month: '2-digit',
                                })
                              : 'Chưa kích hoạt'}
                          </td>
                          <td className="px-4 py-2.5 font-mono font-medium text-[#17202E]">
                            {formatHoursInYard(s.plugged_in_at)}
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge
                              label={s.power_status === 'PLUGGED' ? 'Đang cắm điện' : 'Đã rút điện'}
                              variant={s.power_status === 'PLUGGED' ? 'warning' : 'neutral'}
                              icon={Zap}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeMainTab === 'distribution' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-[#E5E9F0] rounded-lg p-4 bg-white shadow-2xs">
                <h3 className="text-xs font-semibold uppercase text-[#667085] tracking-wide mb-3">
                  Tỷ lệ phân bổ theo 7 loại xe V5
                </h3>
                <div className="space-y-3">
                  {vehicleDistribution.map((item) => (
                    <div key={item.type.code} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-[#17202E]">{item.type.name}</span>
                        <span className="font-mono text-[#667085]">
                          {item.count} xe ({item.percent}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#F1F4F8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#326DD8] rounded-full transition-all duration-300"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-[#E5E9F0] rounded-lg p-4 bg-white shadow-2xs space-y-3">
                <h3 className="text-xs font-semibold uppercase text-[#667085] tracking-wide">
                  Quy định kiểm soát bến bãi V5
                </h3>
                <div className="p-3 bg-[#F8F9FB] rounded-lg border border-[#E5E9F0] text-xs text-[#475467] space-y-1.5 leading-relaxed">
                  <p className="font-semibold text-[#17202E]">Nguyên tắc cốt lõi:</p>
                  <p>1. Lượt xe và lượt container độc lập; phí lưu chốt tại thời điểm xe/cont ra bãi thực tế.</p>
                  <p>2. Phí lưu container miễn đêm đầu; tính theo từng đêm phát sinh (mốc 22:00 – 06:00).</p>
                  <p>3. Điện container làm tròn 15 phút do máy chủ tính tự động theo phiên.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. RIGHT CONTEXT PANEL: THANH TRA CHI TIẾT ĐỐI TƯỢNG ĐƯỢC CHỌN  */}
      {/* ============================================================== */}
      <RightContextPanel
        title={selectedVehicle ? 'Chi tiết Phương tiện' : 'Thông tin Bãi'}
        subtitle={selectedVehicle?.license_plate || 'Chọn xe để xem chi tiết'}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        footerActions={
          selectedVehicle ? (
            <div className="flex items-center gap-2">
              <Link
                href="/exit"
                className="flex-1 py-2 px-3 rounded-lg bg-[#326DD8] text-white text-xs font-semibold hover:bg-[#2557B4] transition-colors text-center cursor-pointer shadow-2xs"
              >
                Chuyển làm thủ tục Ra bãi
              </Link>
            </div>
          ) : undefined
        }
      >
        {selectedVehicle ? (
          <div className="space-y-4">
            {/* Tóm tắt Phương tiện */}
            <div className="p-3 bg-[#F8F9FB] rounded-lg border border-[#E5E9F0] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#667085]">Biển số xe</span>
                <span className="font-mono font-bold text-sm text-[#17202E]">
                  {selectedVehicle.license_plate || 'XE-BO-3-BANH'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#667085]">Loại phương tiện</span>
                <span className="font-medium text-[#17202E]">
                  {getVehicleTypeName(selectedVehicle.vehicle_type)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#667085]">Thời gian vào</span>
                <span className="font-mono text-[#17202E]">
                  {new Date(selectedVehicle.entry_at).toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#667085]">Thời lượng trong bãi</span>
                <span className="font-mono font-bold text-[#326DD8]">
                  {formatHoursInYard(selectedVehicle.entry_at)}
                </span>
              </div>
            </div>

            {/* Container gắn kèm nếu có */}
            {selectedContainer ? (
              <div className="p-3 bg-white rounded-lg border border-[#E5E9F0] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#667085]">Container cõng theo</span>
                  <StatusBadge
                    label={selectedContainer.cargo_status === 'HANG' ? 'Hàng' : 'Rỗng'}
                    variant={selectedContainer.cargo_status === 'HANG' ? 'info' : 'neutral'}
                    showDot={false}
                  />
                </div>
                <div className="font-mono font-bold text-sm text-[#0A9444]">
                  {selectedContainer.container_no_current}
                </div>
                <div className="text-xs text-[#667085]">
                  Quy cách: {formatContainerSpec(selectedContainer.container_size, selectedContainer.container_type)}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-[#F8F9FB] rounded-lg border border-[#E5E9F0] text-center text-xs text-[#667085]">
                Lượt xe này không kéo theo container khi vào cổng.
              </div>
            )}

            {/* Tài xế & Ghi chú */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[#667085] uppercase tracking-wide">
                Thông tin Tài xế
              </h4>
              <div className="text-xs text-[#17202E] space-y-1">
                <div><span className="text-[#667085]">Họ và tên:</span> {selectedVehicle.driver_name || 'Chưa ghi nhận'}</div>
                <div><span className="text-[#667085]">Số điện thoại:</span> {selectedVehicle.driver_phone || '---'}</div>
                <div><span className="text-[#667085]">Mã vé cổng:</span> <span className="font-mono">{selectedVehicle.ticket_code || '---'}</span></div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Chưa chọn đối tượng"
            description="Nhấp chọn một phương tiện hoặc container từ bảng để xem toàn bộ thông số kỹ thuật và lịch sử."
          />
        )}
      </RightContextPanel>
    </div>
  );
}
