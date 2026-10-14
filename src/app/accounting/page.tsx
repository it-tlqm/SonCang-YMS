'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { 
  CashSettlement, 
  YardInvoice, 
  AccountingDebtItem, 
  PaymentRecord,
  ChargeItem
} from '@/types/domain.types';
import { formatCurrency, formatDateTime } from '@/lib/display-formatters';
import { exportAccountingReportExcel } from '@/lib/export-excel';
import { 
  Landmark, 
  Receipt, 
  CreditCard, 
  BarChart3, 
  Plus, 
  Printer, 
  Download, 
  Search, 
  RefreshCw, 
  Building2, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileCheck, 
  ShieldAlert, 
  Filter,
  DollarSign,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  CheckSquare
} from 'lucide-react';

import { CreateSettlementModal } from '@/components/accounting/create-settlement-modal';
import { SettlementReceiptPrint } from '@/components/accounting/settlement-receipt-print';
import { CreateInvoiceModal } from '@/components/accounting/create-invoice-modal';
import { RecordEInvoiceModal } from '@/components/accounting/record-e-invoice-modal';
import { InvoiceStatementPrint } from '@/components/accounting/invoice-statement-print';
import { CollectDebtModal } from '@/components/accounting/collect-debt-modal';

type ActiveTab = 'CASH_SETTLEMENT' | 'INVOICES' | 'DEBTS' | 'REPORTS';

export default function AccountingPage() {
  const { user, role, can, repository } = useAuth();

  // Kiểm soát phân quyền truy cập: Chỉ Kế toán hoặc Quản trị viên
  const hasAccess = role === 'ACCOUNTANT' || 
                    role === 'SYS_ADMIN' || 
                    can('accounting.shift_cash.collect') || 
                    can('accounting.invoice.prepare') || 
                    can('admin.roles.manage');

  const [activeTab, setActiveTab] = useState<ActiveTab>('CASH_SETTLEMENT');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Dữ liệu Phân hệ Kế toán
  const [settlements, setSettlements] = useState<CashSettlement[]>([]);
  const [unsettledCash, setUnsettledCash] = useState<PaymentRecord[]>([]);
  const [invoices, setInvoices] = useState<YardInvoice[]>([]);
  const [debts, setDebts] = useState<AccountingDebtItem[]>([]);
  const [allPayments, setAllPayments] = useState<PaymentRecord[]>([]);
  const [invoicableCharges, setInvoicableCharges] = useState<ChargeItem[]>([]);

  // Modals & Print Previews
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState<boolean>(false);
  const [selectedSettlementToPrint, setSelectedSettlementToPrint] = useState<{
    settlement: CashSettlement;
    items?: PaymentRecord[];
  } | null>(null);

  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState<boolean>(false);
  const [selectedInvoiceToRecord, setSelectedInvoiceToRecord] = useState<YardInvoice | null>(null);
  const [selectedInvoiceToPrint, setSelectedInvoiceToPrint] = useState<{
    invoice: YardInvoice;
    charges?: ChargeItem[];
  } | null>(null);

  const [selectedDebtToCollect, setSelectedDebtToCollect] = useState<AccountingDebtItem | null>(null);

  // Bộ lọc
  const [settlementDeptFilter, setSettlementDeptFilter] = useState<string>('ALL');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('ALL');
  const [debtSearchKeyword, setDebtSearchKeyword] = useState<string>('');

  // Tải dữ liệu từ Repository
  const loadData = async () => {
    if (!hasAccess) return;
    setIsLoading(true);
    try {
      const [
        settleData,
        unsettledData,
        invData,
        debtData,
        paymentsData,
        chargesData
      ] = await Promise.all([
        repository.getCashSettlements(),
        repository.getUnsettledCashPayments('ALL'),
        repository.getYardInvoices(),
        repository.getAccountingDebts(),
        repository.getPayments({}),
        repository.getInvoicableCharges()
      ]);

      setSettlements(settleData);
      setUnsettledCash(unsettledData);
      setInvoices(invData);
      setDebts(debtData);
      setAllPayments(paymentsData);
      setInvoicableCharges(chargesData);
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu Kế toán:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [hasAccess, repository]);

  const [todayDateStr, setTodayDateStr] = useState<string>('');

  useEffect(() => {
    setTodayDateStr(new Date().toISOString().substring(0, 10));
  }, []);

  // KPI Tab 1: Tiền mặt chờ thu
  const pendingCashAnNinh = useMemo(() => {
    return unsettledCash
      .filter(p => p.collector_dept === 'AN_NINH')
      .reduce((sum, p) => sum + p.payment_amount, 0);
  }, [unsettledCash]);

  const pendingCashCCKB = useMemo(() => {
    return unsettledCash
      .filter(p => p.collector_dept === 'CCKB')
      .reduce((sum, p) => sum + p.payment_amount, 0);
  }, [unsettledCash]);

  const totalSettledToday = useMemo(() => {
    if (!todayDateStr) return 0;
    return settlements
      .filter(s => s.created_at.startsWith(todayDateStr))
      .reduce((sum, s) => sum + s.total_cash_counted, 0);
  }, [settlements, todayDateStr]);

  const totalTransferInPeriod = useMemo(() => {
    return allPayments
      .filter(p => p.payment_method !== 'CASH')
      .reduce((sum, p) => sum + p.payment_amount, 0);
  }, [allPayments]);

  // KPI Tab 2: Hóa đơn
  const invoiceStats = useMemo(() => {
    const prepared = invoices.filter(i => i.status === 'PREPARED');
    const invoiced = invoices.filter(i => i.status === 'INVOICED');
    const company = invoices.filter(i => i.invoice_type === 'COMPANY');
    const individual = invoices.filter(i => i.invoice_type === 'INDIVIDUAL');
    return {
      preparedCount: prepared.length,
      preparedTotal: prepared.reduce((s, i) => s + i.total_amount, 0),
      invoicedCount: invoiced.length,
      invoicedTotal: invoiced.reduce((s, i) => s + i.total_amount, 0),
      companyCount: company.length,
      individualCount: individual.length
    };
  }, [invoices]);

  // KPI Tab 3: Công nợ
  const totalDebtRemaining = useMemo(() => {
    return debts.reduce((sum, d) => sum + d.debt_amount, 0);
  }, [debts]);

  const filteredDebts = useMemo(() => {
    if (!debtSearchKeyword.trim()) return debts;
    const kw = debtSearchKeyword.toLowerCase().trim();
    return debts.filter(d => 
      (d.customer_name && d.customer_name.toLowerCase().includes(kw)) ||
      (d.license_plate && d.license_plate.toLowerCase().includes(kw)) ||
      (d.container_no && d.container_no.toLowerCase().includes(kw)) ||
      (d.charge_title && d.charge_title.toLowerCase().includes(kw))
    );
  }, [debts, debtSearchKeyword]);

  // Lọc Hóa đơn
  const filteredInvoices = useMemo(() => {
    if (invoiceStatusFilter === 'ALL') return invoices;
    return invoices.filter(i => i.status === invoiceStatusFilter);
  }, [invoices, invoiceStatusFilter]);

  // Lọc Chốt tiền mặt
  const filteredSettlements = useMemo(() => {
    if (settlementDeptFilter === 'ALL') return settlements;
    return settlements.filter(s => s.handover_dept === settlementDeptFilter);
  }, [settlements, settlementDeptFilter]);

  // Xuất file Excel 4 Sheet
  const handleExportExcel = async () => {
    await exportAccountingReportExcel({
      settlements,
      invoices,
      debts,
      payments: allPayments,
      dateRangeStr: `Tính đến ngày ${new Date().toLocaleDateString('vi-VN')}`
    });
  };

  // Nếu không có quyền truy cập
  if (!hasAccess) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Truy Cập Bị Giới Hạn</h2>
          <p className="text-xs text-slate-600 mb-6">
            Phân hệ Kế toán & Sổ quỹ chỉ dành cho người dùng có vai trò <strong>Kế toán Bến bãi (ACCOUNTANT)</strong> hoặc Quản trị hệ thống (SYS_ADMIN). Nhân viên hiện trường không được phép xem sổ cái kế toán.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl text-left text-xs font-mono text-slate-600">
            <p>Tài khoản hiện tại: {user?.email || 'Chưa đăng nhập'}</p>
            <p>Vai trò: {role || 'Chưa phân vai trò'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-blue-900 text-white rounded-xl shadow-md">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900">Phân Hệ Kế Toán Bến Bãi</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                Sơn Cảng V5
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Chốt tiền mặt hiện trường, phát hành Hóa đơn GTGT (MST & CCCD) và Thu hồi công nợ AP07
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-sm transition"
          >
            <Download className="w-4 h-4" />
            Xuất Excel Kế Toán (.xlsx)
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-xl shadow-sm overflow-x-auto">
        <button
          onClick={() => setActiveTab('CASH_SETTLEMENT')}
          className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'CASH_SETTLEMENT'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          Chốt Tiền Hiện Trường
          {unsettledCash.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[10px]">
              {unsettledCash.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('INVOICES')}
          className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'INVOICES'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          Quản Lý Hóa Đơn (MST & CCCD)
          {invoiceStats.preparedCount > 0 && (
            <span className="ml-1.5 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px]">
              {invoiceStats.preparedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('DEBTS')}
          className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'DEBTS'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          Công Nợ Bến Bãi (AP07)
          {debts.length > 0 && (
            <span className="ml-1.5 px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px]">
              {debts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('REPORTS')}
          className={`flex items-center gap-2 py-3.5 px-4 text-xs font-bold border-b-2 transition whitespace-nowrap ${
            activeTab === 'REPORTS'
              ? 'border-blue-700 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Báo Cáo Sổ Quỹ & Dòng Tiền
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CHỐT TIỀN HIỆN TRƯỜNG */}
      {/* ========================================================================= */}
      {activeTab === 'CASH_SETTLEMENT' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Tiền mặt chờ thu An ninh</span>
              <span className="text-xl font-black font-mono text-amber-700 block mt-1">
                {formatCurrency(pendingCashAnNinh)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Bốt Cổng xe vào/ra</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Tiền mặt chờ thu CCKB</span>
              <span className="text-xl font-black font-mono text-amber-700 block mt-1">
                {formatCurrency(pendingCashCCKB)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Quầy Thương vụ cảng cạn</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Đã nộp Quỹ hôm nay</span>
              <span className="text-xl font-black font-mono text-emerald-700 block mt-1">
                {formatCurrency(totalSettledToday)}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Đã có biên bản bàn giao</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Chuyển khoản VietQR trong kỳ</span>
              <span className="text-xl font-black font-mono text-blue-700 block mt-1">
                {formatCurrency(totalTransferInPeriod)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Tài khoản ngân hàng công ty</span>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-700 shrink-0">Bộ phận bàn giao:</span>
              <select
                value={settlementDeptFilter}
                onChange={e => setSettlementDeptFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium outline-none focus:bg-white"
              >
                <option value="ALL">Tất cả bộ phận</option>
                <option value="AN_NINH">An ninh Cổng</option>
                <option value="CCKB">Thương vụ CCKB</option>
              </select>
            </div>

            <button
              onClick={() => setIsSettlementModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              Tạo Đợt Chốt Thu Tiền Mặt (Kiểm soát 4 mắt)
            </button>
          </div>

          {/* Settlements Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Lịch sử các đợt chốt tiền mặt hiện trường ({filteredSettlements.length} đợt)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-center">STT</th>
                    <th className="px-4 py-3">Mã biên bản</th>
                    <th className="px-4 py-3">Thời gian chốt</th>
                    <th className="px-4 py-3">Bộ phận</th>
                    <th className="px-4 py-3">Người giao (Hiện trường)</th>
                    <th className="px-4 py-3">Người nhận (Kế toán)</th>
                    <th className="px-4 py-3 text-right">Sổ sách</th>
                    <th className="px-4 py-3 text-right">Thực đếm</th>
                    <th className="px-4 py-3 text-right">Chênh lệch</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSettlements.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-slate-400 italic">
                        Chưa có đợt chốt tiền mặt nào được ghi nhận. Bấm "Tạo Đợt Chốt" để thực hiện.
                      </td>
                    </tr>
                  ) : (
                    filteredSettlements.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-900">{s.settlement_code}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDateTime(s.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {s.handover_dept === 'AN_NINH' ? 'An ninh cổng' : s.handover_dept === 'CCKB' ? 'Thương vụ CCKB' : 'Toàn bãi'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">{s.handover_person_name}</td>
                        <td className="px-4 py-3 text-slate-600">{s.collector_name}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(s.total_cash_expected)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(s.total_cash_counted)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">
                          {s.difference_amount === 0 ? (
                            <span className="text-emerald-700">0 đ</span>
                          ) : (
                            <span className="text-amber-700">
                              {s.difference_amount > 0 ? '+' : ''}{formatCurrency(s.difference_amount)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedSettlementToPrint({ settlement: s })}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold transition border border-slate-200"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            In Biên Bản
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUẢN LÝ HÓA ĐƠN (MST & CCCD) */}
      {/* ========================================================================= */}
      {activeTab === 'INVOICES' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Đề nghị chờ xuất HĐĐT</span>
              <span className="text-xl font-black font-mono text-blue-700 block mt-1">
                {invoiceStats.preparedCount} hóa đơn
              </span>
              <span className="text-[11px] text-blue-600 font-medium mt-1 block">
                Tổng: {formatCurrency(invoiceStats.preparedTotal)}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Đã phát hành HĐĐT</span>
              <span className="text-xl font-black font-mono text-emerald-700 block mt-1">
                {invoiceStats.invoicedCount} hóa đơn
              </span>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
                Tổng: {formatCurrency(invoiceStats.invoicedTotal)}
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Hóa đơn Doanh nghiệp (MST)</span>
              <span className="text-xl font-black font-mono text-slate-800 block mt-1">
                {invoiceStats.companyCount} hồ sơ
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Xuất theo Mã số thuế</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Hóa đơn Cá nhân (CCCD)</span>
              <span className="text-xl font-black font-mono text-slate-800 block mt-1">
                {invoiceStats.individualCount} hồ sơ
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Xuất theo CCCD 12 số</span>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-700 shrink-0">Trạng thái HĐ:</span>
              <select
                value={invoiceStatusFilter}
                onChange={e => setInvoiceStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium outline-none focus:bg-white"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PREPARED">Chờ xuất HĐĐT</option>
                <option value="INVOICED">Đã phát hành HĐĐT</option>
              </select>
            </div>

            <button
              onClick={() => setIsInvoiceModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold rounded-xl shadow-sm transition w-full sm:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              Lập Đề Nghị Xuất Hóa Đơn (Mẫu 01:BPA)
            </button>
          </div>

          {/* Invoices Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Danh sách hóa đơn GTGT đã lập ({filteredInvoices.length} hóa đơn)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-center">STT</th>
                    <th className="px-4 py-3">Mã đề xuất</th>
                    <th className="px-4 py-3">Số HĐĐT</th>
                    <th className="px-4 py-3">Đối tượng</th>
                    <th className="px-4 py-3">Người mua hàng / Đơn vị</th>
                    <th className="px-4 py-3">Mã số thuế / CCCD</th>
                    <th className="px-4 py-3 text-right">Trước thuế</th>
                    <th className="px-4 py-3 text-right">Thuế VAT</th>
                    <th className="px-4 py-3 text-right">Tổng tiền</th>
                    <th className="px-4 py-3 text-center">Trạng thái</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-slate-400 italic">
                        Chưa có đề nghị xuất hóa đơn nào. Bấm "Lập Đề Nghị Xuất Hóa Đơn" để gom khoản thu.
                      </td>
                    </tr>
                  ) : (
                    filteredInvoices.map((inv, idx) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-800">{inv.invoice_code}</td>
                        <td className="px-4 py-3 font-mono font-black text-emerald-800">
                          {inv.e_invoice_no || <span className="text-slate-400 font-normal">Chờ số</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold ${inv.invoice_type === 'COMPANY' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}`}>
                            {inv.invoice_type === 'COMPANY' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            {inv.invoice_type === 'COMPANY' ? 'Doanh nghiệp' : 'Cá nhân (CCCD)'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">{inv.buyer_name}</td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-900">
                          {inv.tax_code || inv.id_card_no || '---'}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(inv.subtotal_amount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-blue-800 font-semibold">{formatCurrency(inv.vat_amount)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(inv.total_amount)}</td>
                        <td className="px-4 py-3 text-center">
                          {inv.status === 'INVOICED' ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              ĐÃ XUẤT HĐĐT
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              CHỜ XUẤT HĐ
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedInvoiceToPrint({ invoice: inv })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-lg text-xs font-semibold transition border border-slate-200"
                            title="In Bảng kê chi tiết Mẫu 01:BPA đính kèm hóa đơn"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Bảng Kê
                          </button>
                          
                          {inv.status === 'PREPARED' && (
                            <button
                              onClick={() => setSelectedInvoiceToRecord(inv)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold transition border border-emerald-300"
                              title="Ghi nhận số HĐĐT chính thức sau khi xuất phần mềm HĐĐT"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              Ghi Số HĐ
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CÔNG NỢ BẾN BÃI (AP07) */}
      {/* ========================================================================= */}
      {activeTab === 'DEBTS' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Tổng dư nợ bến bãi (AP07)</span>
              <span className="text-2xl font-black font-mono text-rose-700 block mt-1">
                {formatCurrency(totalDebtRemaining)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Khách hàng xuất trước trả sau</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Số lượng xe/cont nợ cước</span>
              <span className="text-2xl font-black font-mono text-slate-800 block mt-1">
                {debts.length} hồ sơ nợ
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Được phê duyệt bảo lãnh AP07</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Chính sách xuất HĐ khi nợ</span>
              <span className="text-sm font-bold text-blue-900 block mt-1">
                Hỗ trợ song song 2 chế độ
              </span>
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Khách trả nợ xong gom xuất HĐ / Xuất HĐ trước kèm bảng kê cho DN giải ngân
              </span>
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm khách hàng, số cont, biển số xe nợ cước..."
                value={debtSearchKeyword}
                onChange={e => setDebtSearchKeyword(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs outline-none focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Debts Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Danh sách khoản nợ cước bến bãi ({filteredDebts.length} khoản)
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-center">STT</th>
                    <th className="px-4 py-3">Khách hàng / Chủ hàng</th>
                    <th className="px-4 py-3">Số ĐT</th>
                    <th className="px-4 py-3">Số Cont / Biển xe</th>
                    <th className="px-4 py-3">Loại phí nợ</th>
                    <th className="px-4 py-3">Người duyệt bảo lãnh</th>
                    <th className="px-4 py-3 text-right">Tổng nợ</th>
                    <th className="px-4 py-3 text-right">Đã thanh toán</th>
                    <th className="px-4 py-3 text-right">Dư nợ còn lại</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredDebts.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-slate-400 italic">
                        Hiện không có khoản công nợ nào chưa thu trên bến bãi.
                      </td>
                    </tr>
                  ) : (
                    filteredDebts.map((d, idx) => (
                      <tr key={d.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{d.customer_name}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{d.customer_phone || '---'}</td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-900">
                          {d.container_no || d.license_plate || '---'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {d.charge_title}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{d.guarantor_name || 'Trưởng ca'}</td>
                        <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(d.total_amount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700 font-medium">{formatCurrency(d.paid_amount)}</td>
                        <td className="px-4 py-3 text-right font-mono font-black text-rose-700 text-sm">
                          {formatCurrency(d.debt_amount)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => setSelectedDebtToCollect(d)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Thu Nợ
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: BÁO CÁO SỔ QUỸ & DÒNG TIỀN */}
      {/* ========================================================================= */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-6">
          {/* Summary Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Tổng doanh thu đã thu</span>
              <span className="text-xl font-black font-mono text-blue-900 block mt-1">
                {formatCurrency(allPayments.reduce((s, p) => s + p.payment_amount, 0))}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Cả tiền mặt và chuyển khoản</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Tiền mặt đã nộp về Quỹ</span>
              <span className="text-xl font-black font-mono text-emerald-700 block mt-1">
                {formatCurrency(settlements.reduce((s, st) => s + st.total_cash_counted, 0))}
              </span>
              <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
                Qua {settlements.length} đợt chốt bàn giao
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Tiền chuyển khoản ngân hàng</span>
              <span className="text-xl font-black font-mono text-indigo-700 block mt-1">
                {formatCurrency(totalTransferInPeriod)}
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Khớp sao kê VietQR</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-500 block">Dư nợ AP07 chưa thu hồi</span>
              <span className="text-xl font-black font-mono text-rose-700 block mt-1">
                {formatCurrency(totalDebtRemaining)}
              </span>
              <span className="text-[11px] text-rose-600 font-medium mt-1 block">Cần đối soát và nhắc nợ</span>
            </div>
          </div>

          {/* Big Export Banner */}
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <h2 className="text-base font-bold flex items-center gap-2 justify-center md:justify-start">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                Xuất Báo Cáo Kế Toán Đa Sheet Chuẩn OpenXML (.xlsx)
              </h2>
              <p className="text-xs text-blue-200 max-w-2xl">
                Tệp Excel gồm đầy đủ 04 sheet chuyên biệt: <strong>(1) Doanh thu & Dòng tiền</strong>, <strong>(2) Bảng kê Chốt tiền mặt</strong>, <strong>(3) Sổ Hóa đơn MST & CCCD</strong>, và <strong>(4) Sổ Theo dõi Công nợ</strong>. Được định dạng viền ô, màu thương hiệu Sơn Cảng Navy `#1E3A8A` và công thức kế toán tự động.
              </p>
            </div>

            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg hover:shadow-xl transition shrink-0"
            >
              <Download className="w-4 h-4" />
              Tải File Excel 4 Sheet (.xlsx)
            </button>
          </div>

          {/* Transactions Ledger Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                Sổ nhật ký thu tiền toàn bãi ({allPayments.length} giao dịch)
              </h2>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-center">STT</th>
                    <th className="px-4 py-3">Mã phiếu</th>
                    <th className="px-4 py-3">Thời gian thu</th>
                    <th className="px-4 py-3">Bộ phận</th>
                    <th className="px-4 py-3">Người thu</th>
                    <th className="px-4 py-3">Hình thức TT</th>
                    <th className="px-4 py-3 text-right">Số tiền</th>
                    <th className="px-4 py-3">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {allPayments.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-2.5 text-center font-mono text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-800">{p.receipt_code || p.id.substring(0, 10)}</td>
                      <td className="px-4 py-2.5 text-slate-600">{formatDateTime(p.collected_at)}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {p.collector_dept === 'AN_NINH' ? 'An ninh cổng' : p.collector_dept === 'CCKB' ? 'Thương vụ CCKB' : 'Kế toán'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{p.collected_by_name || 'Nhân viên'}</td>
                      <td className="px-4 py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${p.payment_method === 'CASH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                          {p.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">{formatCurrency(p.payment_amount)}</td>
                      <td className="px-4 py-2.5 text-slate-500">{p.notes || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALS VÀ PRINT PREVIEWS */}
      {/* ========================================================================= */}
      
      {/* Modal Chốt Tiền Mặt */}
      <CreateSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        repository={repository}
        onSuccess={(newSettlement, items) => {
          loadData();
          setSelectedSettlementToPrint({ settlement: newSettlement, items });
        }}
      />

      {/* Preview In Biên Bản Bàn Giao Tiền Mặt */}
      {selectedSettlementToPrint && (
        <SettlementReceiptPrint
          settlement={selectedSettlementToPrint.settlement}
          items={selectedSettlementToPrint.items}
          onClose={() => setSelectedSettlementToPrint(null)}
        />
      )}

      {/* Modal Lập Hóa Đơn (MST / CCCD) */}
      <CreateInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        repository={repository}
        onSuccess={(newInvoice) => {
          loadData();
          setSelectedInvoiceToPrint({ invoice: newInvoice });
        }}
      />

      {/* Modal Ghi Nhận Số HĐĐT */}
      <RecordEInvoiceModal
        isOpen={!!selectedInvoiceToRecord}
        onClose={() => setSelectedInvoiceToRecord(null)}
        invoice={selectedInvoiceToRecord}
        repository={repository}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* Preview In Bảng Kê Chi Tiết Hóa Đơn (Mẫu 01:BPA) */}
      {selectedInvoiceToPrint && (
        <InvoiceStatementPrint
          invoice={selectedInvoiceToPrint.invoice}
          charges={selectedInvoiceToPrint.charges}
          onClose={() => setSelectedInvoiceToPrint(null)}
        />
      )}

      {/* Modal Thu Hồi Công Nợ (AP07) */}
      <CollectDebtModal
        isOpen={!!selectedDebtToCollect}
        onClose={() => setSelectedDebtToCollect(null)}
        debtItem={selectedDebtToCollect}
        repository={repository}
        onSuccess={() => {
          loadData();
        }}
      />

    </div>
  );
}
