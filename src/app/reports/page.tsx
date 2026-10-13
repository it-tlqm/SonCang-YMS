'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  ExternalLink
} from 'lucide-react';
import { getVehicleTypeName, formatContainerSpec, formatMoneyInWords, formatDate, formatTime, formatDateTime } from '@/lib/display-formatters';
import { exportManagementReportToExcel } from '@/lib/export-excel';

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

  useEffect(() => {
    if (canReadRevenue) {
      setActiveTab('REVENUE');
    } else {
      setActiveTab('VEHICLES');
    }
  }, [canReadRevenue]);

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

  // =========================================================================
  // TÍNH TOÁN CÁC CHỈ SỐ KPI CHÍNH
  // =========================================================================
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
      .reduce((acc, c) => acc + Math.max(0, (c.amount || 0) - (c.paid_amount || 0)), 0);
  }, [filteredCharges]);

  const unpaidCount = useMemo(() => {
    return filteredCharges.filter(c => c.status === 'UNPAID' || c.status === 'PARTIALLY_PAID').length;
  }, [filteredCharges]);

  // Phân rã 4 nguồn thu theo nghiệp vụ V5
  const revenueBreakdown = useMemo(() => {
    let ticket = 0;
    let reefer = 0;
    let storage = 0;
    let penalty = 0;

    for (const p of filteredPayments) {
      const cType = p.charge_type;
      const title = (p.charge_title || '').toUpperCase();
      const code = (p.receipt_code || '').toUpperCase();

      if (cType === 'TICKET' || title.includes('VÉ') || code.includes('VE-')) {
        ticket += p.payment_amount;
      } else if (cType === 'REEFER' || title.includes('ĐIỆN') || code.includes('RF-') || code.includes('PT-RF-')) {
        reefer += p.payment_amount;
      } else if (cType === 'STORAGE' || title.includes('LƯU BÃI') || code.includes('PLB-')) {
        storage += p.payment_amount;
      } else {
        penalty += p.payment_amount;
      }
    }

    return { ticket, reefer, storage, penalty };
  }, [filteredPayments]);

  // Doanh thu theo từng ngày trong kỳ
  const dailyBreakdown = useMemo(() => {
    const map = new Map<string, {
      ticketAmount: number;
      reeferAmount: number;
      storageAmount: number;
      penaltyAmount: number;
      totalAmount: number;
    }>();

    for (const p of filteredPayments) {
      const dateStr = p.collected_at.slice(0, 10);
      const curr = map.get(dateStr) || {
        ticketAmount: 0,
        reeferAmount: 0,
        storageAmount: 0,
        penaltyAmount: 0,
        totalAmount: 0,
      };

      const cType = p.charge_type;
      const title = (p.charge_title || '').toUpperCase();
      const code = (p.receipt_code || '').toUpperCase();

      if (cType === 'TICKET' || title.includes('VÉ') || code.includes('VE-')) {
        curr.ticketAmount += p.payment_amount;
      } else if (cType === 'REEFER' || title.includes('ĐIỆN') || code.includes('RF-')) {
        curr.reeferAmount += p.payment_amount;
      } else if (cType === 'STORAGE' || title.includes('LƯU BÃI') || code.includes('PLB-')) {
        curr.storageAmount += p.payment_amount;
      } else {
        curr.penaltyAmount += p.payment_amount;
      }

      curr.totalAmount += p.payment_amount;
      map.set(dateStr, curr);
    }

    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, vals]) => ({
        date,
        ...vals,
      }));
  }, [filteredPayments]);

  // Thống kê theo từng loại xe V5
  const vehicleTypeStats = useMemo(() => {
    return vehicleTypes.map(vt => {
      const inCount = filteredVehiclesIn.filter(v => v.vehicle_type === vt.code).length;
      const outCount = filteredVehiclesOut.filter(v => v.vehicle_type === vt.code).length;
      const inYardCount = vehicles.filter(v => v.vehicle_type === vt.code && v.status === 'IN_YARD').length;

      return {
        code: vt.code,
        name: vt.name,
        ticketPrice: vt.default_ticket_amount ?? 0,
        inCount,
        outCount,
        inYardCount,
      };
    });
  }, [vehicleTypes, filteredVehiclesIn, filteredVehiclesOut, vehicles]);

  // Thống kê Container & Điện lạnh
  const reeferHoursTotal = useMemo(() => {
    const mins = filteredSessions.reduce((acc, s) => acc + (s.billable_minutes || 0), 0);
    return Math.round((mins / 60) * 10) / 10;
  }, [filteredSessions]);

  const activePluggedCount = useMemo(() => {
    return sessions.filter(s => s.power_status === 'PLUGGED').length;
  }, [sessions]);

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

  // Thời gian lưu bãi trung bình của xe đã xuất bãi (Dwell Time)
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

  // Xử lý xuất file Excel (.xlsx) đa Sheet
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
    <div className="p-4 sm:p-5 space-y-4 max-w-7xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. HEADER & TOP FILTER BAR */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-slate-300">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-2 rounded bg-slate-100 border border-slate-300 text-slate-800">
                <BarChart3 className="w-5 h-5 text-blue-900" />
              </span>
              <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight text-slate-900">
                Trung tâm Thống kê & Báo cáo Bến bãi
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Công ty Cổ phần Tà Lùng Quang Minh — Bến bãi Cửa khẩu Quốc tế Tà Lùng
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadReportData}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors flex items-center space-x-1.5 cursor-pointer"
              title="Làm mới số liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            {canExportRevenue && (
              <button
                onClick={handleExportExcel}
                className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
                title="Xuất Báo cáo Quản trị Đa Sheet sang file Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-emerald-700" />
                <span>Xuất XLSX Báo cáo</span>
              </button>
            )}

            <button
              onClick={() => setShowPrintModal(true)}
              className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Báo Cáo / Lưu PDF</span>
            </button>
          </div>
        </div>

        {/* Thanh chọn khoảng thời gian */}
        <div className="pt-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-600 font-bold mr-1 flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              Kỳ báo cáo:
            </span>
            {[
              { id: 'TODAY', label: 'Hôm nay' },
              { id: 'YESTERDAY', label: 'Hôm qua' },
              { id: '7DAYS', label: '7 ngày qua' },
              { id: '30DAYS', label: '30 ngày qua' },
              { id: 'THIS_MONTH', label: 'Tháng này' },
              { id: 'CUSTOM', label: 'Tùy chọn ngày' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDateFilter(item.id as DateFilterType)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer border ${
                  dateFilter === item.id
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Ô chọn từ ngày - đến ngày khi chọn tùy chọn */}
          {dateFilter === 'CUSTOM' && (
            <div className="flex items-center gap-2 p-1.5 bg-slate-50 border border-slate-300 rounded flex-wrap">
              <span className="text-[11px] font-bold text-slate-700">Từ (dd/MM/yyyy):</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-2 py-0.5 text-xs border border-slate-300 rounded bg-white font-mono"
              />
              {customStartDate && <span className="text-[10px] text-slate-600 font-mono font-bold">({formatDate(customStartDate)})</span>}
              <span className="text-[11px] font-bold text-slate-700">Đến (dd/MM/yyyy):</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-2 py-0.5 text-xs border border-slate-300 rounded bg-white font-mono"
              />
              {customEndDate && <span className="text-[10px] text-slate-600 font-mono font-bold">({formatDate(customEndDate)})</span>}
            </div>
          )}

          {/* Lọc theo bộ phận thực thu */}
          <div className="flex items-center space-x-2">
            <span className="text-slate-600 font-bold flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Filter className="w-3 h-3 text-slate-500" />
              Bộ phận:
            </span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value as any)}
              className="px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded bg-white text-slate-800 cursor-pointer focus:ring-1 focus:ring-slate-900"
            >
              <option value="ALL">Toàn bãi Sơn Cảng</option>
              <option value="AN_NINH">An ninh Cổng</option>
              <option value="CCKB">Thương vụ CCKB</option>
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. KHỐI THẺ KPI TỔNG HỢP (EXECUTIVE METRICS) */}
      {/* ========================================================================= */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${canReadRevenue ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-3`}>
        {/* KPI 1: Doanh thu thực thu */}
        {canReadRevenue && (
          <div className="bg-white rounded-lg p-4 border border-slate-300 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Doanh thu thực thu
              </span>
              <span className="p-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-mono font-bold text-emerald-700">
              {totalRevenue.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-500">VNĐ</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200">
              <span className="flex items-center gap-1">
                <Banknote className="w-3 h-3 text-emerald-600" />
                TM: <strong className="font-mono text-slate-800">{cashRevenue.toLocaleString('vi-VN')}đ</strong>
              </span>
              <span className="flex items-center gap-1">
                <CreditCard className="w-3 h-3 text-blue-600" />
                CK: <strong className="font-mono text-slate-800">{transferRevenue.toLocaleString('vi-VN')}đ</strong>
              </span>
            </div>
          </div>
        )}

        {/* KPI 2: Công nợ / Chưa thu */}
        {canReadRevenue && (
          <div className="bg-white rounded-lg p-4 border border-slate-300 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Khoản nợ chưa thu
              </span>
              <span className="p-1.5 rounded bg-amber-50 border border-amber-200 text-amber-700">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-mono font-bold text-amber-800">
              {unpaidAmount.toLocaleString('vi-VN')} <span className="text-xs font-semibold text-slate-500">VNĐ</span>
            </div>
            <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200 flex items-center justify-between">
              <span>Số khoản nợ tồn:</span>
              <span className="font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 text-[10px]">
                {unpaidCount} khoản
              </span>
            </div>
          </div>
        )}

        {/* KPI 3: Lưu lượng phương tiện */}
        <div className="bg-white rounded-lg p-4 border border-slate-300 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Lưu lượng xe
            </span>
            <span className="p-1.5 rounded bg-blue-50 border border-blue-200 text-blue-800">
              <Truck className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-mono font-bold text-slate-900">
            {filteredVehiclesIn.length} <span className="text-xs font-semibold text-slate-500">lượt vào</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200">
            <span>Ra: <strong className="font-mono text-slate-800">{filteredVehiclesOut.length} lượt</strong></span>
            <span>Đỗ TB: <strong className="font-mono text-blue-900">{averageDwellTime}</strong></span>
          </div>
        </div>

        {/* KPI 4: Sản lượng Container & Điện */}
        <div className="bg-white rounded-lg p-4 border border-slate-300 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Container & Điện Lạnh
            </span>
            <span className="p-1.5 rounded bg-purple-50 border border-purple-200 text-purple-700">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="text-xl font-mono font-bold text-purple-900">
            {filteredContainersIn.length} <span className="text-xs font-semibold text-slate-500">cont vào</span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200">
            <span>Cắm điện: <strong className="font-mono text-emerald-800">{activePluggedCount} cont</strong></span>
            <span>Tổng giờ: <strong className="font-mono text-purple-900">{reeferHoursTotal}h</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TABS ĐIỀU HƯỚNG BÁO CÁO CHUYÊN SÂU */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-300 overflow-hidden">
        <div className="flex border-b border-slate-300 bg-slate-100 overflow-x-auto">
          {[
            ...(canReadRevenue ? [{ id: 'REVENUE', label: '1. Doanh thu & Dòng tiền', icon: DollarSign }] : []),
            { id: 'VEHICLES', label: '2. Lưu lượng & Loại xe', icon: Truck },
            { id: 'REEFER_CONTAINER', label: '3. Container & Điện lạnh', icon: Zap },
            { id: 'YARD_ZONES', label: '4. Phân khu & Hiệu suất bãi', icon: Layers },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ReportTabType)}
              className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 whitespace-nowrap flex items-center space-x-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900 bg-white'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-slate-900' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 sm:p-5">
          {/* ===================================================================== */}
          {/* TAB 1: DOANH THU & DÒNG TIỀN */}
          {/* ===================================================================== */}
          {activeTab === 'REVENUE' && canReadRevenue && (
            <div className="space-y-5">
              {/* Phân rã 4 nguồn thu V5 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded border border-slate-300 bg-slate-50 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <PieChart className="w-4 h-4 text-blue-900" />
                    Cơ cấu 4 Nguồn thu Dịch vụ Bến bãi
                  </h3>

                  <div className="space-y-2.5">
                    {[
                      { label: 'Vé xe vào cổng (TICKET)', amount: revenueBreakdown.ticket, color: 'bg-blue-600', text: 'text-blue-900' },
                      { label: 'Tiền điện Container Lạnh (REEFER)', amount: revenueBreakdown.reefer, color: 'bg-emerald-600', text: 'text-emerald-800' },
                      { label: 'Phí lưu bãi Container (STORAGE)', amount: revenueBreakdown.storage, color: 'bg-amber-600', text: 'text-amber-800' },
                      { label: 'Phạt mất vé & Khoản thu khác', amount: revenueBreakdown.penalty, color: 'bg-purple-600', text: 'text-purple-800' },
                    ].map((src, i) => {
                      const pct = totalRevenue > 0 ? Math.round((src.amount / totalRevenue) * 100) : 0;
                      return (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-semibold text-slate-800">{src.label}</span>
                            <span className={`font-mono font-bold ${src.text}`}>
                              {src.amount.toLocaleString('vi-VN')} đ <span className="text-slate-400 font-normal">({pct}%)</span>
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-sm h-1.5 overflow-hidden">
                            <div className={`${src.color} h-1.5 transition-all duration-500`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Phương thức thanh toán Tiền mặt vs Chuyển khoản */}
                <div className="p-4 rounded border border-slate-300 bg-slate-50 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-700" />
                    Đối soát Phương thức Thanh toán
                  </h3>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded bg-white border border-slate-300 space-y-1 text-center shadow-xs">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tiền mặt (CASH)</div>
                      <div className="text-lg font-mono font-bold text-emerald-700">
                        {cashRevenue.toLocaleString('vi-VN')} đ
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {totalRevenue > 0 ? Math.round((cashRevenue / totalRevenue) * 100) : 0}% tổng doanh thu
                      </div>
                    </div>

                    <div className="p-3 rounded bg-white border border-slate-300 space-y-1 text-center shadow-xs">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Chuyển khoản (TRANSFER)</div>
                      <div className="text-lg font-mono font-bold text-slate-900">
                        {transferRevenue.toLocaleString('vi-VN')} đ
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {totalRevenue > 0 ? Math.round((transferRevenue / totalRevenue) * 100) : 0}% tổng doanh thu
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    ℹ️ Toàn bộ các khoản thanh toán chuyển khoản đều sinh mã đối chiếu Napas 247 tương thích sao kê ngân hàng Vietcombank Cao Bằng.
                  </p>
                </div>
              </div>

              {/* Bảng Doanh thu theo từng ngày */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Bảng Kê Doanh Thu Chi Tiết Theo Ngày ({dailyBreakdown.length} ngày)
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">Kỳ: {periodDisplayTitle}</span>
                </div>

                <div className="overflow-x-auto rounded border border-slate-300">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider border-b border-slate-300">
                        <th className="px-3 py-2.5">Ngày</th>
                        <th className="px-3 py-2.5 text-right">Vé vào cổng</th>
                        <th className="px-3 py-2.5 text-right">Điện Reefer</th>
                        <th className="px-3 py-2.5 text-right">Lưu bãi Cont</th>
                        <th className="px-3 py-2.5 text-right">Phạt mất vé</th>
                        <th className="px-3 py-2.5 text-right text-emerald-800">Tổng doanh thu ngày</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {dailyBreakdown.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                            Không có phát sinh doanh thu nào trong khoảng thời gian đã chọn.
                          </td>
                        </tr>
                      ) : (
                        dailyBreakdown.map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{new Date(row.date).toLocaleDateString('vi-VN')}</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700">{row.ticketAmount.toLocaleString('vi-VN')} đ</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700">{row.reeferAmount.toLocaleString('vi-VN')} đ</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700">{row.storageAmount.toLocaleString('vi-VN')} đ</td>
                            <td className="px-3 py-2 text-right font-mono text-slate-700">{row.penaltyAmount.toLocaleString('vi-VN')} đ</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-700">{row.totalAmount.toLocaleString('vi-VN')} đ</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {dailyBreakdown.length > 0 && (
                      <tfoot>
                        <tr className="bg-slate-100 font-bold border-t border-slate-300">
                          <td className="px-3 py-2.5 text-slate-900 uppercase tracking-wider text-[11px]">TỔNG CỘNG:</td>
                          <td className="px-3 py-2.5 text-right font-mono text-blue-900">{revenueBreakdown.ticket.toLocaleString('vi-VN')} đ</td>
                          <td className="px-3 py-2.5 text-right font-mono text-emerald-800">{revenueBreakdown.reefer.toLocaleString('vi-VN')} đ</td>
                          <td className="px-3 py-2.5 text-right font-mono text-amber-800">{revenueBreakdown.storage.toLocaleString('vi-VN')} đ</td>
                          <td className="px-3 py-2.5 text-right font-mono text-purple-800">{revenueBreakdown.penalty.toLocaleString('vi-VN')} đ</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-700 text-sm">{totalRevenue.toLocaleString('vi-VN')} đ</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 2: LƯU LƯỢNG & LOẠI XE */}
          {/* ===================================================================== */}
          {activeTab === 'VEHICLES' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded border border-slate-300 bg-slate-50 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Lượt xe vào cổng</div>
                  <div className="text-xl font-mono font-bold text-slate-900">{filteredVehiclesIn.length} xe</div>
                  <div className="text-[10px] text-slate-500 font-mono">Trong kỳ {periodDisplayTitle}</div>
                </div>

                <div className="p-3.5 rounded border border-slate-300 bg-slate-50 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Lượt xe đã xuất bãi</div>
                  <div className="text-xl font-mono font-bold text-emerald-700">{filteredVehiclesOut.length} xe</div>
                  <div className="text-[10px] text-slate-500">Đã kiểm soát xuất cổng an toàn</div>
                </div>

                <div className="p-3.5 rounded border border-slate-300 bg-slate-50 space-y-1">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Thời gian đỗ trung bình</div>
                  <div className="text-xl font-mono font-bold text-purple-900">{averageDwellTime}</div>
                  <div className="text-[10px] text-slate-500">Tính trên các xe đã hoàn tất lượt</div>
                </div>
              </div>

              {/* Bảng thống kê theo 7 loại xe V5 */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-slate-500" />
                  Sản Lượng Phương Tiện Theo 7 Loại Xe Niêm Yết V5
                </h3>

                <div className="overflow-x-auto rounded border border-slate-300">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider border-b border-slate-300">
                        <th className="px-3 py-2.5">Mã loại xe</th>
                        <th className="px-3 py-2.5">Tên chủng loại xe niêm yết</th>
                        <th className="px-3 py-2.5 text-right">Đơn giá vé</th>
                        <th className="px-3 py-2.5 text-right">Lượt vào</th>
                        <th className="px-3 py-2.5 text-right">Lượt ra</th>
                        <th className="px-3 py-2.5 text-right text-blue-900">Đang trong bãi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {vehicleTypeStats.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-3 py-2 font-mono font-bold text-slate-600">{row.code}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{row.name}</td>
                          <td className="px-3 py-2 text-right font-mono text-slate-700">{(row.ticketPrice || 0).toLocaleString('vi-VN')} đ</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">{row.inCount}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-800">{row.outCount}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-blue-900">
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-900 text-[11px]">
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

          {/* ===================================================================== */}
          {/* TAB 3: CONTAINER & ĐIỆN LẠNH */}
          {/* ===================================================================== */}
          {activeTab === 'REEFER_CONTAINER' && (
            <div className="space-y-5">
              {/* Thẻ chỉ số Container */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded border border-slate-300 bg-slate-50 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Kích thước Container trong bãi</div>
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-slate-700">40 Feet (Phổ biến):</span>
                    <strong className="text-slate-900 font-mono font-bold">{containerStats.count40} cont</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700">20 Feet:</span>
                    <strong className="text-slate-900 font-mono font-bold">{containerStats.count20} cont</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700">45 Feet:</span>
                    <strong className="text-slate-900 font-mono font-bold">{containerStats.count45} cont</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded border border-slate-300 bg-slate-50 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Tình trạng Hàng Hóa</div>
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-emerald-800 font-semibold">Container Có hàng (HÀNG):</span>
                    <strong className="text-emerald-900 font-mono font-bold">{containerStats.countHang}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-800 font-semibold">Vỏ rỗng (RỖNG):</span>
                    <strong className="text-blue-900 font-mono font-bold">{containerStats.countRong}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Chưa xác định:</span>
                    <strong className="text-slate-800 font-mono font-bold">{containerStats.countChuaXacDinh}</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded border border-slate-300 bg-slate-50 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Duyệt Xuất Bãi (Clearance)</div>
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-emerald-800 font-semibold">Đã duyệt xuất (CLEARED):</span>
                    <strong className="text-emerald-900 font-mono font-bold">{containerStats.clearedCount}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-amber-800 font-semibold">Duyệt nợ cước (DEBT):</span>
                    <strong className="text-amber-900 font-mono font-bold">{containerStats.clearedWithDebtCount}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Chờ duyệt (PENDING):</span>
                    <strong className="text-slate-800 font-mono font-bold">{containerStats.pendingClearanceCount}</strong>
                  </div>
                </div>
              </div>

              {/* Thông tin Dịch vụ Điện Reefer */}
              <div className="p-4 rounded border border-slate-300 bg-slate-50 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-700" />
                  Hiệu Suất Dịch Vụ Điện Container Lạnh (Reefer Monitoring)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div className="p-2.5 rounded bg-white border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Phiên cắm điện:</div>
                    <div className="text-lg font-mono font-bold text-slate-900">{filteredSessions.length} phiên</div>
                  </div>
                  <div className="p-2.5 rounded bg-white border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Tổng thời gian cắm:</div>
                    <div className="text-lg font-mono font-bold text-emerald-700">{reeferHoursTotal} giờ</div>
                  </div>
                  <div className="p-2.5 rounded bg-white border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Doanh thu tiền điện:</div>
                    <div className="text-lg font-mono font-bold text-emerald-700">{revenueBreakdown.reefer.toLocaleString('vi-VN')} đ</div>
                  </div>
                  <div className="p-2.5 rounded bg-white border border-slate-200">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Đang cấp điện:</div>
                    <div className="text-lg font-mono font-bold text-blue-900">{activePluggedCount} container</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================== */}
          {/* TAB 4: PHÂN KHU & HIỆU SUẤT BÃI */}
          {/* ===================================================================== */}
          {activeTab === 'YARD_ZONES' && (
            <div className="space-y-4">
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  Công Suất & Tỷ Lệ Lấp Đầy 4 Phân Khu Chức Năng Bãi Sơn Cảng
                </h3>
                <p className="text-xs text-slate-500">
                  Tổng diện tích bến bãi cửa khẩu Tà Lùng phân thành 4 phân khu chuyên biệt.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {yardZoneStats.map(zone => (
                  <div key={zone.code} className="p-4 rounded border border-slate-300 bg-white shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-slate-300 ${zone.color_badge}`}>
                          {zone.code}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{zone.name}</h4>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-mono font-bold text-slate-900">{zone.occupancyRate}%</div>
                        <div className="text-[10px] text-slate-500 uppercase">Tỷ lệ lấp đầy</div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600">{zone.description}</p>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] font-mono text-slate-600">
                        <span>Đang đỗ: {zone.totalOccupied} PT/cont</span>
                        <span>Sức chứa: {zone.capacity}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-sm h-2 overflow-hidden border border-slate-300">
                        <div
                          className={`h-2 transition-all duration-500 ${
                            zone.occupancyRate >= 90
                              ? 'bg-rose-600'
                              : zone.occupancyRate >= 70
                              ? 'bg-amber-600'
                              : 'bg-emerald-600'
                          }`}
                          style={{ width: `${zone.occupancyRate}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                      <span>Xe đang đỗ: <strong className="font-mono text-slate-900">{zone.vehInZone} xe</strong></span>
                      <span>Container đỗ: <strong className="font-mono text-slate-900">{zone.contInZone} cont</strong></span>
                      <span>{zone.has_power_outlets ? '30 Trụ điện' : '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL IN BÁO CÁO MẪU CHUẨN SƠN CẢNG (PRINT / PDF PREVIEW) */}
      {/* ========================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-300 max-w-3xl w-full shadow-2xl overflow-hidden my-6">
            {/* Thanh công cụ Modal */}
            <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between no-print border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Printer className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs uppercase tracking-wider">Xem trước Bản in Báo cáo Vận hành & Doanh thu</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In ngay / Lưu PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Nội dung bản in chuẩn hành chính */}
            <div className="p-6 sm:p-8 space-y-5 text-slate-900 text-xs printable-report bg-white">
              {/* Quốc hiệu / Đơn vị */}
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

              {/* Tiêu đề báo cáo */}
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
