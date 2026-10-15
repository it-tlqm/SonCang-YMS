'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { 
  VehicleVisit, 
  ContainerVisit, 
  ReeferPowerSession, 
  ChargeItem, 
  PaymentRecord, 
  VehicleType, 
  YardZoneInfo 
} from '@/types/domain.types';
import { 
  BarChart3, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Truck, 
  Container as ContainerIcon, 
  Zap, 
  Clock, 
  ArrowUpRight, 
  ArrowDownRight, 
  Download, 
  Printer, 
  RefreshCw, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  PieChart, 
  Layers, 
  ShieldCheck, 
  X, 
  ChevronRight, 
  Filter,
  CreditCard,
  Banknote,
  Activity,
  MapPin,
  ExternalLink,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { getVehicleTypeName, formatContainerSpec, formatMoneyInWords, formatDate, formatTime, formatDateTime } from '@/lib/display-formatters';
import { exportManagementReportToExcel } from '@/lib/export-excel';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { WorkspaceTabs } from '@/components/workspace/workspace-tabs';
import { SecondaryPanel } from '@/components/workspace/secondary-panel';
import { RightContextPanel } from '@/components/workspace/right-context-panel';
import { StatusBadge } from '@/components/workspace/status-badge';
import { EmptyState } from '@/components/workspace/empty-state';

type DateFilterType = 'TODAY' | 'YESTERDAY' | '7DAYS' | '30DAYS' | 'THIS_MONTH' | 'CUSTOM';
type ReportTabType = 'REVENUE' | 'VEHICLES' | 'REEFER_CONTAINER' | 'YARD_ZONES';

export default function ReportsManagementPage() {
  const { user, yardId, can, repository } = useAuth();

  // Kiểm tra quyền theo RBAC V5
  const canReadRevenue = can('report.revenue.read');
  const canExportRevenue = can('report.revenue.export');

  // Bộ lọc thời gian
  const [mounted, setMounted] = useState<boolean>(false);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterType>('7DAYS');
  const [customStartDate, setCustomStartDate] = useState<string>('2026-10-06');
  const [customEndDate, setCustomEndDate] = useState<string>('2026-10-13');
  const [deptFilter, setDeptFilter] = useState<'ALL' | 'AN_NINH' | 'CCKB'>('ALL');

  // Tab điều hướng báo cáo
  const [activeTab, setActiveTab] = useState<ReportTabType>('VEHICLES');

  // DS-02 Inspector Panel
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);

  // Modal in báo cáo
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);

  // Dữ liệu từ Repository
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [vehicles, setVehicles] = useState<VehicleVisit[]>([]);
  const [containers, setContainers] = useState<ContainerVisit[]>([]);
  const [sessions, setSessions] = useState<ReeferPowerSession[]>([]);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [yardZones, setYardZones] = useState<YardZoneInfo[]>([]);

  useEffect(() => {
    if (canReadRevenue) {
      setActiveTab('REVENUE');
    } else {
      setActiveTab('VEHICLES');
    }
  }, [canReadRevenue]);

  // Khởi tạo thời gian thực sau khi đã mount trên client
  useEffect(() => {
    const now = new Date();
    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    setCustomStartDate(d7.toISOString().slice(0, 10));
    setCustomEndDate(now.toISOString().slice(0, 10));
    setCurrentDate(now);
    setMounted(true);
  }, []);

  // Tải dữ liệu từ repository
  const loadReportData = async () => {
    setIsLoading(true);
    try {
      const [vList, cList, sList, chList, pList, vtList, zList] = await Promise.all([
        repository.getVehicles(yardId),
        repository.getContainers(yardId),
        repository.getReeferSessions(yardId),
        repository.getCharges(yardId),
        repository.getPayments({ yardId, collectorDept: deptFilter === 'ALL' ? undefined : deptFilter }),
        repository.getVehicleTypes(),
        repository.getYardZones(),
      ]);

      setVehicles(vList);
      setContainers(cList);
      setSessions(sList);
      setCharges(chList);
      setPayments(pList);
      setVehicleTypes(vtList);
      setYardZones(zList);
    } catch (err) {
      console.error('Lỗi nạp dữ liệu thống kê báo cáo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [yardId, deptFilter]);

  // Xác định khoảng thời gian lọc (date range)
  const { dateRangeStart, dateRangeEnd, periodDisplayTitle } = useMemo(() => {
    if (!currentDate) {
      return {
        dateRangeStart: 0,
        dateRangeEnd: Number.MAX_SAFE_INTEGER,
        periodDisplayTitle: 'Kỳ báo cáo 7 ngày qua',
      };
    }

    const now = currentDate;
    let start = new Date(now.getTime());
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    let title = '';

    switch (dateFilter) {
      case 'TODAY':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        title = `Hôm nay (${start.toLocaleDateString('vi-VN')})`;
        break;
      case 'YESTERDAY':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        title = `Hôm qua (${start.toLocaleDateString('vi-VN')})`;
        break;
      case '7DAYS':
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        title = `7 ngày qua (${start.toLocaleDateString('vi-VN')} - ${now.toLocaleDateString('vi-VN')})`;
        break;
      case '30DAYS':
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);
        title = `30 ngày qua (${start.toLocaleDateString('vi-VN')} - ${now.toLocaleDateString('vi-VN')})`;
        break;
      case 'THIS_MONTH':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        title = `Tháng ${now.getMonth() + 1}/${now.getFullYear()} (${start.toLocaleDateString('vi-VN')} - ${now.toLocaleDateString('vi-VN')})`;
        break;
      case 'CUSTOM':
        start = new Date(customStartDate + 'T00:00:00');
        end = new Date(customEndDate + 'T23:59:59');
        title = `Từ ${new Date(customStartDate).toLocaleDateString('vi-VN')} đến ${new Date(customEndDate).toLocaleDateString('vi-VN')}`;
        break;
    }

    return {
      dateRangeStart: start.getTime(),
      dateRangeEnd: end.getTime(),
      periodDisplayTitle: title,
    };
  }, [currentDate, dateFilter, customStartDate, customEndDate]);

  // Dữ liệu lọc theo khoảng thời gian
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const t = new Date(p.collected_at).getTime();
      return t >= dateRangeStart && t <= dateRangeEnd;
    });
  }, [payments, dateRangeStart, dateRangeEnd]);

  const filteredVehiclesIn = useMemo(() => {
    return vehicles.filter(v => {
      const t = new Date(v.entry_at).getTime();
      return t >= dateRangeStart && t <= dateRangeEnd;
    });
  }, [vehicles, dateRangeStart, dateRangeEnd]);

  const filteredVehiclesOut = useMemo(() => {
    return vehicles.filter(v => {
      if (!v.exit_at) return false;
      const t = new Date(v.exit_at).getTime();
      return t >= dateRangeStart && t <= dateRangeEnd;
    });
  }, [vehicles, dateRangeStart, dateRangeEnd]);

  const filteredContainersIn = useMemo(() => {
    return containers.filter(c => {
      const t = new Date(c.inbound_at).getTime();
      return t >= dateRangeStart && t <= dateRangeEnd;
    });
  }, [containers, dateRangeStart, dateRangeEnd]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const t = new Date(s.plugged_in_at).getTime();
      return t >= dateRangeStart && t <= dateRangeEnd;
    });
  }, [sessions, dateRangeStart, dateRangeEnd]);

  const filteredCharges = useMemo(() => {
    return charges.filter(c => {
      const t = new Date(c.created_at).getTime();
      return t >= dateRangeStart && t <= dateRangeEnd;
    });
  }, [charges, dateRangeStart, dateRangeEnd]);

  // Tính toán KPI chính
  const totalRevenue = useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + (p.payment_amount || 0), 0);
  }, [filteredPayments]);

  const cashRevenue = useMemo(() => {
    return filteredPayments
      .filter(p => p.payment_method === 'CASH')
      .reduce((acc, p) => acc + (p.payment_amount || 0), 0);
  }, [filteredPayments]);

  const transferRevenue = useMemo(() => {
    return filteredPayments
      .filter(p => p.payment_method === 'TRANSFER')
      .reduce((acc, p) => acc + (p.payment_amount || 0), 0);
  }, [filteredPayments]);

  const unpaidAmount = useMemo(() => {
    return filteredCharges
      .filter(c => c.status === 'UNPAID' || c.status === 'PARTIALLY_PAID')
      .reduce((acc, c) => acc + (c.amount - (c.paid_amount || 0)), 0);
  }, [filteredCharges]);

  const unpaidCount = useMemo(() => {
    return filteredCharges.filter(c => c.status === 'UNPAID' || c.status === 'PARTIALLY_PAID').length;
  }, [filteredCharges]);

  // Phân bổ 4 nguồn thu
  const revenueBreakdown = useMemo(() => {
    let ticket = 0;
    let reefer = 0;
    let storage = 0;
    let penalty = 0;

    for (const p of filteredPayments) {
      if (p.charge_type === 'TICKET') ticket += p.payment_amount;
      else if (p.charge_type === 'REEFER') reefer += p.payment_amount;
      else if (p.charge_type === 'STORAGE') storage += p.payment_amount;
      else penalty += p.payment_amount;
    }

    return { ticket, reefer, storage, penalty };
  }, [filteredPayments]);

  // Bảng kê doanh thu theo ngày
  const dailyBreakdown = useMemo(() => {
    const map = new Map<string, { date: string; ticketAmount: number; reeferAmount: number; storageAmount: number; penaltyAmount: number; totalAmount: number }>();

    for (const p of filteredPayments) {
      const d = p.collected_at.slice(0, 10);
      const cur = map.get(d) || { date: d, ticketAmount: 0, reeferAmount: 0, storageAmount: 0, penaltyAmount: 0, totalAmount: 0 };
      if (p.charge_type === 'TICKET') cur.ticketAmount += p.payment_amount;
      else if (p.charge_type === 'REEFER') cur.reeferAmount += p.payment_amount;
      else if (p.charge_type === 'STORAGE') cur.storageAmount += p.payment_amount;
      else cur.penaltyAmount += p.payment_amount;
      cur.totalAmount += p.payment_amount;
      map.set(d, cur);
    }

    return Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredPayments]);

  // Thống kê theo 7 loại xe V5
  const vehicleTypeStats = useMemo(() => {
    return vehicleTypes.map(vt => {
      const inCount = filteredVehiclesIn.filter(v => v.vehicle_type === vt.code).length;
      const outCount = filteredVehiclesOut.filter(v => v.vehicle_type === vt.code).length;
      const inYardCount = vehicles.filter(v => v.vehicle_type === vt.code && v.status === 'IN_YARD').length;

      return {
        code: vt.code,
        name: vt.name,
        ticketPrice: vt.default_ticket_amount,
        inCount,
        outCount,
        inYardCount,
      };
    });
  }, [vehicleTypes, filteredVehiclesIn, filteredVehiclesOut, vehicles]);

  // Thống kê giờ điện reefer
  const reeferHoursTotal = useMemo(() => {
    const mins = filteredSessions.reduce((acc, s) => acc + (s.billable_minutes || 0), 0);
    return Math.round((mins / 60) * 10) / 10;
  }, [filteredSessions]);

  const activePluggedCount = useMemo(() => {
    return sessions.filter(s => s.power_status === 'PLUGGED').length;
  }, [sessions]);

  // Thống kê container
  const containerStats = useMemo(() => {
    const totalInYard = containers.filter(c => c.status === 'IN_YARD').length;
    const count20 = containers.filter(c => c.status === 'IN_YARD' && c.container_size === '20').length;
    const count40 = containers.filter(c => c.status === 'IN_YARD' && (c.container_size === '40' || !c.container_size)).length;
    const count45 = containers.filter(c => c.status === 'IN_YARD' && c.container_size === '45').length;

    const countRF = containers.filter(c => c.status === 'IN_YARD' && (c.container_type === 'RF' || !c.container_type)).length;
    const countDC = containers.filter(c => c.status === 'IN_YARD' && c.container_type === 'DC').length;

    const countHang = containers.filter(c => c.status === 'IN_YARD' && c.cargo_status === 'HANG').length;
    const countRong = containers.filter(c => c.status === 'IN_YARD' && c.cargo_status === 'RONG').length;
    const countChuaXacDinh = containers.filter(c => c.status === 'IN_YARD' && c.cargo_status === 'CHUA_XAC_DINH').length;

    const clearedCount = containers.filter(c => c.status === 'IN_YARD' && c.clearance_status === 'CLEARED').length;
    const clearedWithDebtCount = containers.filter(c => c.status === 'IN_YARD' && c.clearance_status === 'CLEARED_WITH_DEBT').length;
    const pendingClearanceCount = containers.filter(c => c.status === 'IN_YARD' && (!c.clearance_status || c.clearance_status === 'PENDING')).length;

    return {
      totalInYard,
      count20,
      count40,
      count45,
      countRF,
      countDC,
      countHang,
      countRong,
      countChuaXacDinh,
      clearedCount,
      clearedWithDebtCount,
      pendingClearanceCount,
    };
  }, [containers]);

  // Thống kê Phân khu bãi
  const yardZoneStats = useMemo(() => {
    return yardZones.map(zone => {
      const vehInZone = vehicles.filter(v => v.status === 'IN_YARD' && v.yard_zone === zone.code).length;
      const contInZone = containers.filter(c => c.status === 'IN_YARD' && c.yard_zone === zone.code).length;
      const totalOccupied = zone.code === 'KHU_A_REEFER' || zone.code === 'KHU_B_DRY' ? contInZone : (vehInZone + contInZone);
      const occupancyRate = zone.capacity > 0 ? Math.min(100, Math.round((totalOccupied / zone.capacity) * 100)) : 0;

      return {
        ...zone,
        vehInZone,
        contInZone,
        totalOccupied,
        occupancyRate,
      };
    });
  }, [yardZones, vehicles, containers]);

  // Thời gian lưu bãi trung bình
  const averageDwellTime = useMemo(() => {
    if (filteredVehiclesOut.length === 0) return '0 giờ';
    let totalMinutes = 0;
    for (const v of filteredVehiclesOut) {
      if (v.entry_at && v.exit_at) {
        const diffMs = new Date(v.exit_at).getTime() - new Date(v.entry_at).getTime();
        totalMinutes += Math.max(0, Math.floor(diffMs / 60000));
      }
    }
    const avgMins = Math.round(totalMinutes / filteredVehiclesOut.length);
    const hrs = Math.floor(avgMins / 60);
    const mins = avgMins % 60;
    return `${hrs}h ${mins}p`;
  }, [filteredVehiclesOut]);

  // Xuất Excel
  const handleExportExcel = () => {
    exportManagementReportToExcel({
      periodTitle: periodDisplayTitle,
      totalRevenue,
      cashRevenue,
      transferRevenue,
      unpaidAmount,
      vehiclesInCount: filteredVehiclesIn.length,
      vehiclesOutCount: filteredVehiclesOut.length,
      containersInCount: filteredContainersIn.length,
      reeferPluggedCount: filteredSessions.length,
      totalReeferHours: reeferHoursTotal,
      dailyRows: dailyBreakdown,
      vehicleTypeRows: vehicleTypeStats.map(vt => ({
        typeName: vt.name,
        inCount: vt.inCount,
        outCount: vt.outCount,
        inYardCount: vt.inYardCount,
      })),
    });
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#FFFFFF] min-h-0">
      {/* ============================================================== */}
      {/* 1. SECONDARY PANEL: KỲ BÁO CÁO & BỘ LỌC                        */}
      {/* ============================================================== */}
      <SecondaryPanel
        title="Kỳ báo cáo & Bộ lọc"
        count={periodDisplayTitle ? 1 : 0}
        headerActions={
          <button
            type="button"
            onClick={loadReportData}
            disabled={isLoading}
            className="p-1.5 rounded-md text-[#667085] hover:text-[#17202E] hover:bg-[#F1F4F8] transition-colors cursor-pointer"
            title="Làm mới số liệu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        }
      >
        <div className="p-3.5 space-y-4">
          {/* Quick presets */}
          <div>
            <label className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-2">
              Khoảng thời gian
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'TODAY', label: 'Hôm nay' },
                { id: 'YESTERDAY', label: 'Hôm qua' },
                { id: '7DAYS', label: '7 ngày qua' },
                { id: '30DAYS', label: '30 ngày qua' },
                { id: 'THIS_MONTH', label: 'Tháng này' },
                { id: 'CUSTOM', label: 'Tùy chọn...' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setDateFilter(item.id as DateFilterType)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer border ${
                    dateFilter === item.id
                      ? 'bg-[#EAF1FD] border-[#326DD8] text-[#326DD8] font-semibold'
                      : 'bg-[#FFFFFF] border-[#E5E9F0] text-[#17202E] hover:bg-[#F5F7FA]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ô chọn từ ngày - đến ngày khi chọn tùy chọn */}
          {dateFilter === 'CUSTOM' && (
            <div className="p-3 bg-[#F8F9FB] rounded-lg border border-[#E5E9F0] space-y-2 text-xs">
              <div>
                <span className="block text-[10px] font-semibold text-[#667085] mb-1">Từ ngày:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs border border-[#E5E9F0] rounded bg-[#FFFFFF] font-mono text-[#17202E]"
                />
              </div>
              <div>
                <span className="block text-[10px] font-semibold text-[#667085] mb-1">Đến ngày:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs border border-[#E5E9F0] rounded bg-[#FFFFFF] font-mono text-[#17202E]"
                />
              </div>
            </div>
          )}

          {/* Bộ phận đối soát */}
          <div>
            <label className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-2">
              Bộ phận thực thu
            </label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value as any)}
              className="w-full px-3 py-1.5 text-xs font-medium border border-[#E5E9F0] rounded-lg bg-[#FFFFFF] text-[#17202E] cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#326DD8]"
            >
              <option value="ALL">Toàn bãi Sơn Cảng</option>
              <option value="AN_NINH">Bộ phận An ninh Cổng</option>
              <option value="CCKB">Thương vụ CCKB</option>
            </select>
          </div>

          {/* Tóm tắt nhanh trong Secondary Panel */}
          <div className="pt-3 border-t border-[#E5E9F0] space-y-2.5">
            <span className="block text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
              Chỉ số tóm tắt kỳ
            </span>

            {canReadRevenue && (
              <div className="p-2.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] space-y-1">
                <span className="text-[10px] text-[#667085] block">Doanh thu thực thu</span>
                <span className="text-sm font-bold font-mono text-[#0A9444]">
                  {totalRevenue.toLocaleString('vi-VN')} đ
                </span>
                <div className="flex justify-between text-[10px] text-[#98A2B3] pt-0.5">
                  <span>TM: {cashRevenue.toLocaleString('vi-VN')}đ</span>
                  <span>CK: {transferRevenue.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
            )}

            <div className="p-2.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] space-y-1">
              <span className="text-[10px] text-[#667085] block">Lưu lượng xe</span>
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-[#17202E] font-mono">
                  {filteredVehiclesIn.length} vào / {filteredVehiclesOut.length} ra
                </span>
                <span className="text-[10px] text-[#326DD8] font-mono">{averageDwellTime}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] space-y-1">
              <span className="text-[10px] text-[#667085] block">Container & Điện lạnh</span>
              <div className="flex justify-between items-baseline">
                <span className="text-xs font-semibold text-[#17202E] font-mono">
                  {filteredContainersIn.length} cont vào
                </span>
                <span className="text-[10px] text-[#0A9444] font-mono font-semibold">
                  {activePluggedCount} đang cắm
                </span>
              </div>
            </div>
          </div>
        </div>
      </SecondaryPanel>

      {/* ============================================================== */}
      {/* 2. MAIN WORKSPACE                                              */}
      {/* ============================================================== */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <WorkspaceHeader
          icon={BarChart3}
          title="Thống kê & Báo cáo Bến bãi"
          subtitle={`Công ty Cổ phần Tà Lùng Quang Minh — ${periodDisplayTitle}`}
          badge={
            <StatusBadge
              variant="neutral"
              label={deptFilter === 'ALL' ? 'Toàn bãi Sơn Cảng' : deptFilter === 'AN_NINH' ? 'An ninh Cổng' : 'Thương vụ CCKB'}
            />
          }
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadReportData}
                disabled={isLoading}
                className="h-8 px-2.5 rounded-lg border border-[#E5E9F0] text-xs font-medium text-[#17202E] hover:bg-[#F5F7FA] transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>

              {canExportRevenue && (
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="h-8 px-3 rounded-lg border border-[#0A9444]/30 bg-[#0A9444]/10 text-xs font-semibold text-[#0A9444] hover:bg-[#0A9444]/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Xuất Báo cáo Quản trị Đa Sheet sang file Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Xuất XLSX</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="h-8 px-3 rounded-lg bg-[#17202E] text-xs font-semibold text-white hover:bg-[#223873] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In Báo Cáo</span>
              </button>

              <button
                type="button"
                onClick={() => setIsInspectorOpen(prev => !prev)}
                className={`h-8 px-2.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer ${
                  isInspectorOpen
                    ? 'border-[#326DD8] bg-[#EAF1FD] text-[#326DD8]'
                    : 'border-[#E5E9F0] text-[#667085] hover:bg-[#F5F7FA]'
                }`}
                title={isInspectorOpen ? 'Ẩn thanh tra' : 'Hiện thanh tra'}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chỉ số</span>
              </button>
            </div>
          }
        />

        <WorkspaceTabs
          tabs={[
            ...(canReadRevenue ? [{ id: 'REVENUE', label: 'Doanh thu & Dòng tiền' }] : []),
            { id: 'VEHICLES', label: 'Lưu lượng Phương tiện', count: filteredVehiclesIn.length },
            { id: 'REEFER_CONTAINER', label: 'Container & Điện lạnh', count: filteredContainersIn.length },
            { id: 'YARD_ZONES', label: 'Phân khu & Công suất' },
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as ReportTabType)}
        />

        <div className="p-4 sm:p-6 space-y-5">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {canReadRevenue && (
              <div className="p-4 bg-[#FFFFFF] rounded-xl border border-[#E5E9F0] shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                  <span>Doanh thu thực thu</span>
                  <DollarSign className="w-4 h-4 text-[#0A9444]" />
                </div>
                <div className="text-xl font-bold font-mono text-[#0A9444]">
                  {totalRevenue.toLocaleString('vi-VN')} <span className="text-xs font-normal text-[#98A2B3]">đ</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#667085] pt-1 border-t border-[#E5E9F0]">
                  <span>TM: <strong className="font-mono text-[#17202E]">{cashRevenue.toLocaleString('vi-VN')}đ</strong></span>
                  <span>CK: <strong className="font-mono text-[#17202E]">{transferRevenue.toLocaleString('vi-VN')}đ</strong></span>
                </div>
              </div>
            )}

            {canReadRevenue && (
              <div className="p-4 bg-[#FFFFFF] rounded-xl border border-[#E5E9F0] shadow-2xs space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                  <span>Công nợ chưa thu</span>
                  <AlertTriangle className="w-4 h-4 text-[#D92D20]" />
                </div>
                <div className="text-xl font-bold font-mono text-[#D92D20]">
                  {unpaidAmount.toLocaleString('vi-VN')} <span className="text-xs font-normal text-[#98A2B3]">đ</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#667085] pt-1 border-t border-[#E5E9F0]">
                  <span>Số khoản nợ:</span>
                  <span className="font-mono font-semibold text-[#D92D20]">{unpaidCount} khoản</span>
                </div>
              </div>
            )}

            <div className="p-4 bg-[#FFFFFF] rounded-xl border border-[#E5E9F0] shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                <span>Lưu lượng xe</span>
                <Truck className="w-4 h-4 text-[#326DD8]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#17202E]">
                {filteredVehiclesIn.length} <span className="text-xs font-normal text-[#98A2B3]">vào</span> / {filteredVehiclesOut.length} <span className="text-xs font-normal text-[#98A2B3]">ra</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#667085] pt-1 border-t border-[#E5E9F0]">
                <span>Lưu bãi TB:</span>
                <span className="font-mono font-semibold text-[#326DD8]">{averageDwellTime}</span>
              </div>
            </div>

            <div className="p-4 bg-[#FFFFFF] rounded-xl border border-[#E5E9F0] shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#667085] uppercase tracking-wider">
                <span>Container & Reefer</span>
                <Zap className="w-4 h-4 text-[#0A9444]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#17202E]">
                {filteredContainersIn.length} <span className="text-xs font-normal text-[#98A2B3]">cont vào</span>
              </div>
              <div className="flex justify-between text-[11px] text-[#667085] pt-1 border-t border-[#E5E9F0]">
                <span>Đang cắm: <strong className="font-mono text-[#0A9444]">{activePluggedCount} cont</strong></span>
                <span>Tổng: <strong className="font-mono text-[#17202E]">{reeferHoursTotal}h</strong></span>
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* TAB 1: DOANH THU & DÒNG TIỀN                                       */}
          {/* =================================================================== */}
          {activeTab === 'REVENUE' && canReadRevenue && (
            <div className="space-y-5">
              {/* Phân rã 4 nguồn thu & Phương thức thanh toán */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-[#E5E9F0] bg-[#FFFFFF] shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-[#17202E] uppercase tracking-wider flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-[#326DD8]" />
                    Cơ cấu 4 Nguồn thu Dịch vụ Bến bãi
                  </h3>

                  <div className="space-y-3 pt-1">
                    {[
                      { label: 'Vé xe vào cổng (TICKET)', amount: revenueBreakdown.ticket, color: 'bg-[#326DD8]' },
                      { label: 'Tiền điện Container Lạnh (REEFER)', amount: revenueBreakdown.reefer, color: 'bg-[#0A9444]' },
                      { label: 'Phí lưu bãi Container (STORAGE)', amount: revenueBreakdown.storage, color: 'bg-[#F79009]' },
                      { label: 'Phạt mất vé & Khoản thu khác', amount: revenueBreakdown.penalty, color: 'bg-[#7A5AF8]' },
                    ].map((src, i) => {
                      const pct = totalRevenue > 0 ? Math.round((src.amount / totalRevenue) * 100) : 0;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium text-[#17202E]">{src.label}</span>
                            <span className="font-mono font-semibold text-[#17202E]">
                              {src.amount.toLocaleString('vi-VN')} đ <span className="text-[#98A2B3] font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-[#F5F7FA] rounded-full h-2 overflow-hidden border border-[#E5E9F0]">
                            <div className={`${src.color} h-2 transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#E5E9F0] bg-[#FFFFFF] shadow-2xs space-y-3">
                  <h3 className="text-xs font-bold text-[#17202E] uppercase tracking-wider flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-[#0A9444]" />
                    Đối soát Phương thức Thanh toán
                  </h3>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] space-y-1 text-center">
                      <div className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Tiền mặt (CASH)</div>
                      <div className="text-lg font-mono font-bold text-[#0A9444]">
                        {cashRevenue.toLocaleString('vi-VN')} đ
                      </div>
                      <div className="text-[10px] text-[#98A2B3] font-mono">
                        {totalRevenue > 0 ? Math.round((cashRevenue / totalRevenue) * 100) : 0}% tổng doanh thu
                      </div>
                    </div>

                    <div className="p-3.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] space-y-1 text-center">
                      <div className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider">Chuyển khoản (TRANSFER)</div>
                      <div className="text-lg font-mono font-bold text-[#326DD8]">
                        {transferRevenue.toLocaleString('vi-VN')} đ
                      </div>
                      <div className="text-[10px] text-[#98A2B3] font-mono">
                        {totalRevenue > 0 ? Math.round((transferRevenue / totalRevenue) * 100) : 0}% tổng doanh thu
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-[#667085] italic pt-1">
                    Toàn bộ các khoản thanh toán chuyển khoản đều sinh mã đối chiếu Napas 247 tương thích sao kê ngân hàng.
                  </p>
                </div>
              </div>

              {/* Bảng Kê Doanh Thu Theo Ngày */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#17202E] flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#667085]" />
                    Bảng Kê Doanh Thu Chi Tiết Theo Ngày ({dailyBreakdown.length} ngày)
                  </h3>
                  <span className="text-xs text-[#667085] font-mono">Kỳ: {periodDisplayTitle}</span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#E5E9F0]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F8F9FB] text-[#667085] font-semibold text-[11px] uppercase tracking-wider border-b border-[#E5E9F0]">
                        <th className="px-3.5 py-2.5">Ngày</th>
                        <th className="px-3.5 py-2.5 text-right">Vé vào cổng</th>
                        <th className="px-3.5 py-2.5 text-right">Điện Reefer</th>
                        <th className="px-3.5 py-2.5 text-right">Lưu bãi Cont</th>
                        <th className="px-3.5 py-2.5 text-right">Phạt mất vé</th>
                        <th className="px-3.5 py-2.5 text-right text-[#0A9444]">Tổng doanh thu ngày</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E9F0]">
                      {dailyBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-[#98A2B3]">
                            Không có phát sinh doanh thu nào trong khoảng thời gian đã chọn.
                          </td>
                        </tr>
                      ) : (
                        dailyBreakdown.map((row, idx) => (
                          <tr key={idx} className="hover:bg-[#F5F7FA] transition-colors">
                            <td className="px-3.5 py-2 font-mono font-semibold text-[#17202E]">{new Date(row.date).toLocaleDateString('vi-VN')}</td>
                            <td className="px-3.5 py-2 text-right font-mono text-[#667085]">{row.ticketAmount.toLocaleString('vi-VN')} đ</td>
                            <td className="px-3.5 py-2 text-right font-mono text-[#667085]">{row.reeferAmount.toLocaleString('vi-VN')} đ</td>
                            <td className="px-3.5 py-2 text-right font-mono text-[#667085]">{row.storageAmount.toLocaleString('vi-VN')} đ</td>
                            <td className="px-3.5 py-2 text-right font-mono text-[#667085]">{row.penaltyAmount.toLocaleString('vi-VN')} đ</td>
                            <td className="px-3.5 py-2 text-right font-mono font-bold text-[#0A9444]">{row.totalAmount.toLocaleString('vi-VN')} đ</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {dailyBreakdown.length > 0 && (
                      <tfoot>
                        <tr className="bg-[#F8F9FB] font-bold border-t border-[#E5E9F0]">
                          <td className="px-3.5 py-2.5 text-[#17202E] uppercase tracking-wider text-[11px]">TỔNG CỘNG:</td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-[#326DD8]">{revenueBreakdown.ticket.toLocaleString('vi-VN')} đ</td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-[#0A9444]">{revenueBreakdown.reefer.toLocaleString('vi-VN')} đ</td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-[#F79009]">{revenueBreakdown.storage.toLocaleString('vi-VN')} đ</td>
                          <td className="px-3.5 py-2.5 text-right font-mono text-[#7A5AF8]">{revenueBreakdown.penalty.toLocaleString('vi-VN')} đ</td>
                          <td className="px-3.5 py-2.5 text-right font-mono font-bold text-[#0A9444] text-sm">{totalRevenue.toLocaleString('vi-VN')} đ</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 2: LƯU LƯỢNG & LOẠI XE                                         */}
          {/* =================================================================== */}
          {activeTab === 'VEHICLES' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl border border-[#E5E9F0] bg-[#FFFFFF] shadow-2xs space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Lượt xe vào cổng</div>
                  <div className="text-xl font-mono font-bold text-[#17202E]">{filteredVehiclesIn.length} xe</div>
                  <div className="text-[10px] text-[#98A2B3] font-mono">Trong kỳ {periodDisplayTitle}</div>
                </div>

                <div className="p-4 rounded-xl border border-[#E5E9F0] bg-[#FFFFFF] shadow-2xs space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Lượt xe đã xuất bãi</div>
                  <div className="text-xl font-mono font-bold text-[#0A9444]">{filteredVehiclesOut.length} xe</div>
                  <div className="text-[10px] text-[#667085]">Đã kiểm soát xuất cổng an toàn</div>
                </div>

                <div className="p-4 rounded-xl border border-[#E5E9F0] bg-[#FFFFFF] shadow-2xs space-y-1">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Thời gian đỗ trung bình</div>
                  <div className="text-xl font-mono font-bold text-[#326DD8]">{averageDwellTime}</div>
                  <div className="text-[10px] text-[#667085]">Tính trên các xe đã xuất bãi</div>
                </div>
              </div>

              {/* Bảng thống kê theo 7 loại xe V5 */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#17202E] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#667085]" />
                  Sản Lượng Phương Tiện Theo 7 Loại Xe Niêm Yết V5
                </h3>

                <div className="overflow-x-auto rounded-xl border border-[#E5E9F0]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#F8F9FB] text-[#667085] font-semibold text-[11px] uppercase tracking-wider border-b border-[#E5E9F0]">
                        <th className="px-3.5 py-2.5">Mã loại xe</th>
                        <th className="px-3.5 py-2.5">Tên chủng loại xe niêm yết</th>
                        <th className="px-3.5 py-2.5 text-right">Đơn giá vé</th>
                        <th className="px-3.5 py-2.5 text-right">Lượt vào</th>
                        <th className="px-3.5 py-2.5 text-right">Lượt ra</th>
                        <th className="px-3.5 py-2.5 text-right text-[#326DD8]">Đang trong bãi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E9F0]">
                      {vehicleTypeStats.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#F5F7FA] transition-colors">
                          <td className="px-3.5 py-2 font-mono font-semibold text-[#667085]">{row.code}</td>
                          <td className="px-3.5 py-2 font-medium text-[#17202E]">{row.name}</td>
                          <td className="px-3.5 py-2 text-right font-mono text-[#667085]">{(row.ticketPrice || 0).toLocaleString('vi-VN')} đ</td>
                          <td className="px-3.5 py-2 text-right font-mono font-semibold text-[#17202E]">{row.inCount}</td>
                          <td className="px-3.5 py-2 text-right font-mono font-semibold text-[#17202E]">{row.outCount}</td>
                          <td className="px-3.5 py-2 text-right font-mono font-bold text-[#326DD8]">
                            <span className="px-2 py-0.5 rounded-md bg-[#EAF1FD] border border-[#326DD8]/20 text-[#326DD8] text-[11px]">
                              {row.inYardCount} xe
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 3: CONTAINER & ĐIỆN LẠNH                                       */}
          {/* =================================================================== */}
          {activeTab === 'REEFER_CONTAINER' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl border border-[#E5E9F0] bg-[#FFFFFF] shadow-2xs space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Kích thước Cont trong bãi</div>
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-[#667085]">40 Feet (Phổ biến):</span>
                    <strong className="text-[#17202E] font-mono font-bold">{containerStats.count40} cont</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#667085]">20 Feet:</span>
                    <strong className="text-[#17202E] font-mono font-bold">{containerStats.count20} cont</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#667085]">45 Feet:</span>
                    <strong className="text-[#17202E] font-mono font-bold">{containerStats.count45} cont</strong>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#E5E9F0] bg-[#FFFFFF] shadow-2xs space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Tình trạng Hàng Hóa</div>
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-[#0A9444] font-semibold">Container Có hàng (HÀNG):</span>
                    <strong className="text-[#0A9444] font-mono font-bold">{containerStats.countHang}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#326DD8] font-semibold">Vỏ rỗng (RỖNG):</span>
                    <strong className="text-[#326DD8] font-mono font-bold">{containerStats.countRong}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#667085]">Chưa xác định:</span>
                    <strong className="text-[#17202E] font-mono font-bold">{containerStats.countChuaXacDinh}</strong>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-[#E5E9F0] bg-[#FFFFFF] shadow-2xs space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#667085]">Duyệt Xuất Bãi (Clearance)</div>
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-[#0A9444] font-semibold">Đã duyệt xuất (CLEARED):</span>
                    <strong className="text-[#0A9444] font-mono font-bold">{containerStats.clearedCount}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#F79009] font-semibold">Duyệt nợ cước (DEBT):</span>
                    <strong className="text-[#F79009] font-mono font-bold">{containerStats.clearedWithDebtCount}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#667085]">Chờ duyệt (PENDING):</span>
                    <strong className="text-[#17202E] font-mono font-bold">{containerStats.pendingClearanceCount}</strong>
                  </div>
                </div>
              </div>

              {/* Dịch vụ Điện Reefer */}
              <div className="p-4 rounded-xl border border-[#E5E9F0] bg-[#FFFFFF] shadow-2xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#17202E] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#0A9444]" />
                  Hiệu Suất Dịch Vụ Điện Container Lạnh (Reefer Monitoring)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="p-3 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0]">
                    <div className="text-[10px] uppercase font-semibold text-[#667085]">Phiên cắm điện:</div>
                    <div className="text-lg font-mono font-bold text-[#17202E]">{filteredSessions.length} phiên</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0]">
                    <div className="text-[10px] uppercase font-semibold text-[#667085]">Tổng thời gian cắm:</div>
                    <div className="text-lg font-mono font-bold text-[#0A9444]">{reeferHoursTotal} giờ</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0]">
                    <div className="text-[10px] uppercase font-semibold text-[#667085]">Doanh thu tiền điện:</div>
                    <div className="text-lg font-mono font-bold text-[#0A9444]">{revenueBreakdown.reefer.toLocaleString('vi-VN')} đ</div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0]">
                    <div className="text-[10px] uppercase font-semibold text-[#667085]">Đang cấp điện:</div>
                    <div className="text-lg font-mono font-bold text-[#326DD8]">{activePluggedCount} container</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================== */}
          {/* TAB 4: PHÂN KHU & HIỆU SUẤT BÃI                                    */}
          {/* =================================================================== */}
          {activeTab === 'YARD_ZONES' && (
            <div className="space-y-4">
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#17202E] flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-[#667085]" />
                  Công Suất & Tỷ Lệ Lấp Đầy 4 Phân Khu Chức Năng Bãi Sơn Cảng
                </h3>
                <p className="text-xs text-[#667085]">
                  Tổng diện tích bến bãi cửa khẩu Tà Lùng phân thành 4 phân khu chuyên biệt.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {yardZoneStats.map(zone => (
                  <div key={zone.code} className="p-4 rounded-xl border border-[#E5E9F0] bg-[#FFFFFF] shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-[#E5E9F0] ${zone.color_badge}`}>
                          {zone.code}
                        </span>
                        <h4 className="text-sm font-bold text-[#17202E] mt-1">{zone.name}</h4>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-mono font-bold text-[#17202E]">{zone.occupancyRate}%</div>
                        <div className="text-[10px] text-[#667085] uppercase">Tỷ lệ lấp đầy</div>
                      </div>
                    </div>

                    <p className="text-xs text-[#667085]">{zone.description}</p>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-[#667085]">
                        <span>Đang đỗ: {zone.totalOccupied} PT/cont</span>
                        <span>Sức chứa: {zone.capacity}</span>
                      </div>
                      <div className="w-full bg-[#F5F7FA] rounded-full h-2 overflow-hidden border border-[#E5E9F0]">
                        <div
                          className={`h-2 transition-all duration-500 ${
                            zone.occupancyRate >= 90
                              ? 'bg-[#D92D20]'
                              : zone.occupancyRate >= 70
                              ? 'bg-[#F79009]'
                              : 'bg-[#0A9444]'
                          }`}
                          style={{ width: `${zone.occupancyRate}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E5E9F0] flex items-center justify-between text-xs text-[#667085]">
                      <span>Xe đang đỗ: <strong className="font-mono text-[#17202E]">{zone.vehInZone} xe</strong></span>
                      <span>Container đỗ: <strong className="font-mono text-[#17202E]">{zone.contInZone} cont</strong></span>
                      <span>{zone.has_power_outlets ? '30 Trụ điện' : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ============================================================== */}
      {/* 3. RIGHT CONTEXT PANEL: CHỈ SỐ TRỌNG YẾU                       */}
      {/* ============================================================== */}
      <RightContextPanel
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        title="Chỉ số trọng yếu"
        subtitle="Tổng hợp điều hành kỳ"
      >
        <div className="p-4 space-y-4 text-xs">
          {/* Tóm tắt vận hành */}
          <div className="p-3 bg-[#F8F9FB] rounded-xl border border-[#E5E9F0] space-y-2">
            <span className="text-[11px] font-bold text-[#17202E] block uppercase tracking-wider">
              Vận hành bến bãi
            </span>
            <div className="space-y-1.5 text-[#667085]">
              <div className="flex justify-between">
                <span>Xe vào kỳ này:</span>
                <strong className="text-[#17202E] font-mono">{filteredVehiclesIn.length} xe</strong>
              </div>
              <div className="flex justify-between">
                <span>Xe đã xuất bãi:</span>
                <strong className="text-[#0A9444] font-mono">{filteredVehiclesOut.length} xe</strong>
              </div>
              <div className="flex justify-between">
                <span>Dwell Time trung bình:</span>
                <strong className="text-[#326DD8] font-mono">{averageDwellTime}</strong>
              </div>
              <div className="flex justify-between">
                <span>Cont vào kỳ này:</span>
                <strong className="text-[#17202E] font-mono">{filteredContainersIn.length} cont</strong>
              </div>
              <div className="flex justify-between">
                <span>Cont đang cắm điện:</span>
                <strong className="text-[#0A9444] font-mono">{activePluggedCount} cont</strong>
              </div>
            </div>
          </div>

          {/* Tóm tắt tài chính */}
          {canReadRevenue && (
            <div className="p-3 bg-[#F8F9FB] rounded-xl border border-[#E5E9F0] space-y-2">
              <span className="text-[11px] font-bold text-[#17202E] block uppercase tracking-wider">
                Tài chính bến bãi
              </span>
              <div className="space-y-1.5 text-[#667085]">
                <div className="flex justify-between">
                  <span>Tổng thực thu:</span>
                  <strong className="text-[#0A9444] font-mono">{totalRevenue.toLocaleString('vi-VN')} đ</strong>
                </div>
                <div className="flex justify-between">
                  <span>Tiền mặt (CASH):</span>
                  <strong className="text-[#17202E] font-mono">{cashRevenue.toLocaleString('vi-VN')} đ</strong>
                </div>
                <div className="flex justify-between">
                  <span>Chuyển khoản (CK):</span>
                  <strong className="text-[#17202E] font-mono">{transferRevenue.toLocaleString('vi-VN')} đ</strong>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#E5E9F0]">
                  <span>Công nợ tồn:</span>
                  <strong className="text-[#D92D20] font-mono">{unpaidAmount.toLocaleString('vi-VN')} đ</strong>
                </div>
              </div>
            </div>
          )}

          {/* Thao tác nhanh */}
          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => setShowPrintModal(true)}
              className="w-full h-9 rounded-lg bg-[#17202E] hover:bg-[#223873] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Báo Cáo / Lưu PDF</span>
            </button>

            {canExportRevenue && (
              <button
                type="button"
                onClick={handleExportExcel}
                className="w-full h-9 rounded-lg border border-[#0A9444]/30 bg-[#0A9444]/10 text-[#0A9444] hover:bg-[#0A9444]/20 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất file Excel (.xlsx)</span>
              </button>
            )}
          </div>
        </div>
      </RightContextPanel>

      {/* ============================================================== */}
      {/* 4. MODAL IN BÁO CÁO (PRINT / PDF PREVIEW)                       */}
      {/* ============================================================== */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#FFFFFF] rounded-xl border border-[#E5E9F0] max-w-3xl w-full shadow-xl overflow-hidden my-6">
            {/* Thanh công cụ Modal */}
            <div className="bg-[#17202E] text-white px-5 py-3 flex items-center justify-between no-print border-b border-[#223873]">
              <div className="flex items-center space-x-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-xs uppercase tracking-wider">Xem trước Bản in Báo cáo Vận hành & Doanh thu</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In ngay / Lưu PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Nội dung bản in chuẩn hành chính */}
            <div className="p-6 sm:p-8 space-y-5 text-slate-900 text-xs printable-report bg-white">
              <div className="flex justify-between items-start border-b border-slate-300 pb-3">
                <div className="space-y-0.5">
                  <div className="font-bold text-xs uppercase tracking-wider text-slate-900">
                    CÔNG TY CỔ PHẦN TÀ LÙNG QUANG MINH
                  </div>
                  <div className="text-[11px] text-slate-700">
                    Bến bãi Cửa khẩu Quốc tế Tà Lùng — Tỉnh Cao Bằng
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Mã bãi: SC-TLQM-01 | Hotline: 0981.000.999
                  </div>
                </div>

                <div className="text-right space-y-0.5">
                  <div className="font-bold text-[11px] text-slate-700">Mẫu BC-VH/SC</div>
                  <div className="text-[10px] text-slate-500">Ban hành theo QĐ V5</div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    Ngày in: {currentDate ? currentDate.toLocaleDateString('vi-VN') : '—'}
                  </div>
                </div>
              </div>

              <div className="text-center space-y-1 py-1">
                <h2 className="text-lg font-bold text-slate-900 uppercase tracking-tight">
                  {canReadRevenue ? 'BÁO CÁO THỐNG KÊ VẬN HÀNH & TÀI CHÍNH BẾN BÃI' : 'BÁO CÁO THỐNG KÊ VẬN HÀNH BẾN BÃI'}
                </h2>
                <p className="text-xs font-semibold text-slate-700">
                  Kỳ báo cáo: <span className="font-bold text-slate-900 font-mono">{periodDisplayTitle}</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  Bộ phận đối soát: {deptFilter === 'ALL' ? 'Toàn bãi Sơn Cảng' : deptFilter === 'AN_NINH' ? 'Bộ phận An ninh Cổng' : 'Thương vụ CCKB'}
                </p>
              </div>

              {/* Bảng 1: Chỉ số KPI chính */}
              <div className="space-y-2">
                <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                  I. TỔNG HỢP CÁC CHỈ SỐ HOẠT ĐỘNG
                </div>
                <table className="w-full border-collapse border border-slate-300 text-xs">
                  <tbody>
                    {canReadRevenue && (
                      <>
                        <tr className="border-b border-slate-300">
                          <td className="p-2 bg-slate-100 font-semibold w-1/3">1. Tổng doanh thu thực thu:</td>
                          <td className="p-2 font-bold font-mono text-emerald-800">{totalRevenue.toLocaleString('vi-VN')} VNĐ</td>
                          <td className="p-2 bg-slate-100 font-semibold w-1/4">Viết bằng chữ:</td>
                          <td className="p-2 italic text-slate-700">{formatMoneyInWords(totalRevenue)}</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-2 bg-slate-100 font-semibold">- Tiền mặt thực thu (CASH):</td>
                          <td className="p-2 font-mono text-slate-900">{cashRevenue.toLocaleString('vi-VN')} VNĐ</td>
                          <td className="p-2 bg-slate-100 font-semibold">- Chuyển khoản (TRANSFER):</td>
                          <td className="p-2 font-mono text-slate-900">{transferRevenue.toLocaleString('vi-VN')} VNĐ</td>
                        </tr>
                        <tr className="border-b border-slate-300">
                          <td className="p-2 bg-slate-100 font-semibold">2. Công nợ / Chưa thu:</td>
                          <td className="p-2 font-mono text-amber-800 font-bold">{unpaidAmount.toLocaleString('vi-VN')} VNĐ</td>
                          <td className="p-2 bg-slate-100 font-semibold">Số khoản nợ:</td>
                          <td className="p-2 font-mono">{unpaidCount} khoản</td>
                        </tr>
                      </>
                    )}
                    <tr className="border-b border-slate-300">
                      <td className="p-2 bg-slate-100 font-semibold">{canReadRevenue ? '3. Lượt xe vào bãi:' : '1. Lượt xe vào bãi:'}</td>
                      <td className="p-2 font-bold font-mono">{filteredVehiclesIn.length} lượt</td>
                      <td className="p-2 bg-slate-100 font-semibold">{canReadRevenue ? '4. Lượt xe đã xuất bãi:' : '2. Lượt xe đã xuất bãi:'}</td>
                      <td className="p-2 font-bold font-mono">{filteredVehiclesOut.length} lượt</td>
                    </tr>
                    <tr>
                      <td className="p-2 bg-slate-100 font-semibold">{canReadRevenue ? '5. Container vào bãi:' : '3. Container vào bãi:'}</td>
                      <td className="p-2 font-bold font-mono">{filteredContainersIn.length} cont</td>
                      <td className="p-2 bg-slate-100 font-semibold">{canReadRevenue ? '6. Số giờ điện cắm cont lạnh:' : '4. Số giờ điện cắm cont lạnh:'}</td>
                      <td className="p-2 font-bold font-mono">{reeferHoursTotal} giờ ({filteredSessions.length} phiên)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bảng 2: Cơ cấu doanh thu */}
              {canReadRevenue && (
                <div className="space-y-2">
                  <div className="font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                    II. CHI TIẾT 4 NGUỒN THU DỊCH VỤ BẾN BÃI
                  </div>
                  <table className="w-full border-collapse border border-slate-300 text-xs text-left">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                        <th className="p-2">STT</th>
                        <th className="p-2">Danh mục dịch vụ</th>
                        <th className="p-2">Bộ phận quản lý</th>
                        <th className="p-2 text-right">Số tiền (VNĐ)</th>
                        <th className="p-2 text-right">Tỷ trọng (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr>
                        <td className="p-2 font-mono">1</td>
                        <td className="p-2 font-semibold text-slate-900">Vé xe vào cổng bến bãi</td>
                        <td className="p-2 text-slate-700">An ninh Cổng</td>
                        <td className="p-2 text-right font-mono text-slate-900">{revenueBreakdown.ticket.toLocaleString('vi-VN')}</td>
                        <td className="p-2 text-right font-mono text-slate-700">{totalRevenue > 0 ? Math.round((revenueBreakdown.ticket / totalRevenue) * 100) : 0}%</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">2</td>
                        <td className="p-2 font-semibold text-slate-900">Tiền điện Container Lạnh (Reefer)</td>
                        <td className="p-2 text-slate-700">Thương vụ CCKB</td>
                        <td className="p-2 text-right font-mono text-slate-900">{revenueBreakdown.reefer.toLocaleString('vi-VN')}</td>
                        <td className="p-2 text-right font-mono text-slate-700">{totalRevenue > 0 ? Math.round((revenueBreakdown.reefer / totalRevenue) * 100) : 0}%</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">3</td>
                        <td className="p-2 font-semibold text-slate-900">Phí lưu bãi Container qua đêm</td>
                        <td className="p-2 text-slate-700">An ninh / CCKB</td>
                        <td className="p-2 text-right font-mono text-slate-900">{revenueBreakdown.storage.toLocaleString('vi-VN')}</td>
                        <td className="p-2 text-right font-mono text-slate-700">{totalRevenue > 0 ? Math.round((revenueBreakdown.storage / totalRevenue) * 100) : 0}%</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-mono">4</td>
                        <td className="p-2 font-semibold text-slate-900">Tiền phạt mất vé giấy & Khác</td>
                        <td className="p-2 text-slate-700">An ninh Cổng</td>
                        <td className="p-2 text-right font-mono text-slate-900">{revenueBreakdown.penalty.toLocaleString('vi-VN')}</td>
                        <td className="p-2 text-right font-mono text-slate-700">{totalRevenue > 0 ? Math.round((revenueBreakdown.penalty / totalRevenue) * 100) : 0}%</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold border-t border-slate-300">
                        <td colSpan={3} className="p-2 text-right uppercase tracking-wider text-[11px] text-slate-800">TỔNG CỘNG:</td>
                        <td className="p-2 text-right font-mono text-emerald-800">{totalRevenue.toLocaleString('vi-VN')} đ</td>
                        <td className="p-2 text-right font-mono text-slate-800">100%</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Chữ ký 3 bên */}
              <div className="grid grid-cols-3 gap-4 text-center pt-6 border-t border-slate-300">
                <div className="space-y-10">
                  <div>
                    <div className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">NGƯỜI LẬP BÁO CÁO</div>
                    <div className="text-[10px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
                  </div>
                  <div className="font-bold text-slate-900 pt-6">{user?.fullName || 'Người lập biểu'}</div>
                </div>

                <div className="space-y-10">
                  <div>
                    <div className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">TRƯỞNG BỘ PHẬN ĐỐI SOÁT</div>
                    <div className="text-[10px] text-slate-500 italic">(Ký và ghi rõ họ tên)</div>
                  </div>
                  <div className="font-bold text-slate-900 pt-6">........................................</div>
                </div>

                <div className="space-y-10">
                  <div>
                    <div className="font-bold text-slate-900 uppercase text-[11px] tracking-wider">BAN GIÁM ĐỐC DUYỆT</div>
                    <div className="text-[10px] text-slate-500 italic">(Ký, đóng dấu công ty)</div>
                  </div>
                  <div className="font-bold text-slate-900 pt-6">........................................</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
