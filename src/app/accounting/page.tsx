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
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { WorkspaceTabs } from '@/components/workspace/workspace-tabs';
import { SecondaryPanel } from '@/components/workspace/secondary-panel';
import { RightContextPanel } from '@/components/workspace/right-context-panel';
import { SearchInput } from '@/components/workspace/search-input';
import { StatusBadge } from '@/components/workspace/status-badge';
import { EmptyState } from '@/components/workspace/empty-state';
import { TablePagination } from '@/components/workspace/table-pagination';

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

  // DS-02 Multi-pane Workspace States: Secondary Panel & Inspector
  const [selectedInspectorItem, setSelectedInspectorItem] = useState<{
    type: 'SETTLEMENT' | 'INVOICE' | 'DEBT';
    item: any;
  } | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [secondarySearch, setSecondarySearch] = useState<string>('');

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

  // Quản lý Phân trang (Pagination)
  const [pageSettlements, setPageSettlements] = useState<number>(1);
  const [pageSizeSettlements, setPageSizeSettlements] = useState<number>(20);

  const [pageInvoices, setPageInvoices] = useState<number>(1);
  const [pageSizeInvoices, setPageSizeInvoices] = useState<number>(20);

  const [pageDebts, setPageDebts] = useState<number>(1);
  const [pageSizeDebts, setPageSizeDebts] = useState<number>(20);

  useEffect(() => {
    setPageSettlements(1);
  }, [settlementDeptFilter]);

  useEffect(() => {
    setPageInvoices(1);
  }, [invoiceStatusFilter]);

  useEffect(() => {
    setPageDebts(1);
  }, [debtSearchKeyword]);

  const pagedSettlements = useMemo(() => {
    const start = (pageSettlements - 1) * pageSizeSettlements;
    return filteredSettlements.slice(start, start + pageSizeSettlements);
  }, [filteredSettlements, pageSettlements, pageSizeSettlements]);

  const pagedInvoices = useMemo(() => {
    const start = (pageInvoices - 1) * pageSizeInvoices;
    return filteredInvoices.slice(start, start + pageSizeInvoices);
  }, [filteredInvoices, pageInvoices, pageSizeInvoices]);

  const pagedDebts = useMemo(() => {
    const start = (pageDebts - 1) * pageSizeDebts;
    return filteredDebts.slice(start, start + pageSizeDebts);
  }, [filteredDebts, pageDebts, pageSizeDebts]);

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
    <div className="flex-1 flex overflow-hidden bg-[#FFFFFF] min-h-0">
      {/* ============================================================== */}
      {/* 1. SECONDARY PANEL: SỔ KẾ TOÁN & DANH MỤC                    */}
      {/* ============================================================== */}
      <SecondaryPanel
        title={
          activeTab === 'CASH_SETTLEMENT'
            ? 'Phiếu chốt ca'
            : activeTab === 'INVOICES'
            ? 'Hóa đơn'
            : activeTab === 'DEBTS'
            ? 'Hồ sơ nợ'
            : 'Giao dịch gần đây'
        }
        count={
          activeTab === 'CASH_SETTLEMENT'
            ? settlements.length
            : activeTab === 'INVOICES'
            ? invoices.length
            : activeTab === 'DEBTS'
            ? debts.length
            : allPayments.length
        }
        headerActions={
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-1 rounded text-[#667085] hover:text-[#17202E] hover:bg-[#F1F4F8] transition-colors"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        }
        searchSlot={
          <SearchInput
            value={secondarySearch}
            onChange={setSecondarySearch}
            placeholder="Tìm mã phiếu, đối tượng..."
          />
        }
      >
        {activeTab === 'CASH_SETTLEMENT' && (
          settlements.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#98A2B3]">Chưa có biên bản chốt tiền</div>
          ) : (
            settlements
              .filter(s => !secondarySearch || (s.settlement_code && s.settlement_code.toLowerCase().includes(secondarySearch.toLowerCase())))
              .map(s => {
                const isSelected = selectedInspectorItem?.item?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelectedInspectorItem({ type: 'SETTLEMENT', item: s });
                      setIsInspectorOpen(true);
                    }}
                    className={`w-full text-left p-3 transition-colors cursor-pointer border-b border-[#F0F2F6] ${
                      isSelected ? 'bg-[#EAF1FD]' : 'hover:bg-[#F8F9FB]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-[#17202E]">
                        {s.settlement_code || 'Phiếu chốt'}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#ECFDF3] text-[#0A9444]">
                        {s.handover_dept === 'AN_NINH' ? 'An ninh' : s.handover_dept === 'CCKB' ? 'CCKB' : 'Toàn bãi'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#667085]">
                      <span className="truncate max-w-[130px]">{s.handover_person_name || 'Người giao'}</span>
                      <span className="font-mono font-bold text-[#0A9444]">
                        {formatCurrency(s.total_cash_counted)}
                      </span>
                    </div>
                  </button>
                );
              })
          )
        )}

        {activeTab === 'INVOICES' && (
          invoices.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#98A2B3]">Chưa có hóa đơn nào</div>
          ) : (
            invoices
              .filter(inv => !secondarySearch || (inv.buyer_name && inv.buyer_name.toLowerCase().includes(secondarySearch.toLowerCase())) || (inv.invoice_code && inv.invoice_code.toLowerCase().includes(secondarySearch.toLowerCase())))
              .map(inv => {
                const isSelected = selectedInspectorItem?.item?.id === inv.id;
                return (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => {
                      setSelectedInspectorItem({ type: 'INVOICE', item: inv });
                      setIsInspectorOpen(true);
                    }}
                    className={`w-full text-left p-3 transition-colors cursor-pointer border-b border-[#F0F2F6] ${
                      isSelected ? 'bg-[#EAF1FD]' : 'hover:bg-[#F8F9FB]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-[#17202E]">
                        {inv.invoice_code || 'Bảng kê'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${inv.status === 'INVOICED' ? 'bg-[#ECFDF3] text-[#0A9444]' : 'bg-[#EFF8FF] text-[#326DD8]'}`}>
                        {inv.status === 'INVOICED' ? 'ĐÃ HĐ' : 'CHỜ HĐ'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#667085]">
                      <span className="truncate max-w-[150px]">{inv.buyer_name || 'Khách lẻ'}</span>
                      <span className="font-mono font-bold text-[#0A9444]">
                        {formatCurrency(inv.total_amount)}
                      </span>
                    </div>
                  </button>
                );
              })
          )
        )}

        {activeTab === 'DEBTS' && (
          debts.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#98A2B3]">Không có công nợ tồn đọng</div>
          ) : (
            debts
              .filter(d => !secondarySearch || (d.customer_name && d.customer_name.toLowerCase().includes(secondarySearch.toLowerCase())) || (d.container_no && d.container_no.toLowerCase().includes(secondarySearch.toLowerCase())))
              .map(d => {
                const isSelected = selectedInspectorItem?.item?.id === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSelectedInspectorItem({ type: 'DEBT', item: d });
                      setIsInspectorOpen(true);
                    }}
                    className={`w-full text-left p-3 transition-colors cursor-pointer border-b border-[#F0F2F6] ${
                      isSelected ? 'bg-[#EAF1FD]' : 'hover:bg-[#F8F9FB]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-xs text-[#17202E]">
                        {d.container_no}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FEF3F2] text-[#D92D20]">
                        NỢ AP07
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#667085]">
                      <span className="truncate max-w-[150px]">{d.customer_name}</span>
                      <span className="font-mono font-bold text-[#D92D20]">
                        {formatCurrency(d.debt_amount)}
                      </span>
                    </div>
                  </button>
                );
              })
          )
        )}

        {activeTab === 'REPORTS' && (
          allPayments.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#98A2B3]">Chưa có giao dịch</div>
          ) : (
            allPayments.slice(0, 30).map(p => (
              <div key={p.id} className="p-3 border-b border-[#F0F2F6] text-xs">
                <div className="flex justify-between font-mono font-bold text-[#17202E]">
                  <span>{p.receipt_code || 'Biên lai'}</span>
                  <span className="text-[#0A9444]">{formatCurrency(p.payment_amount)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#667085] mt-0.5">
                  <span>{p.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}</span>
                  <span>{formatDateTime(p.collected_at)}</span>
                </div>
              </div>
            ))
          )
        )}
      </SecondaryPanel>

      {/* ============================================================== */}
      {/* 2. MAIN WORKSPACE                                              */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white">
        <WorkspaceHeader
          title="Phân hệ Kế toán Bến bãi Sơn Cảng"
          subtitle="Chốt tiền mặt hiện trường, phát hành Hóa đơn GTGT (MST & CCCD) và Thu hồi công nợ AP07"
          icon={Landmark}
          badge={
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF8FF] text-[#326DD8] border border-[#B2DDFF]">
              Kế toán Bến bãi V5
            </span>
          }
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleExportExcel}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ECFDF3] border border-[#A6F4C5] text-xs font-semibold text-[#0A9444] hover:bg-[#D1FADF] transition-colors cursor-pointer"
                title="Xuất file Excel kế toán"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={loadData}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E9F0] text-xs font-medium text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>
          }
        />

        {/* Compact KPI strip (4 cards) */}
        <div className="p-4 sm:p-5 border-b border-[#E5E9F0] bg-[#F8F9FB]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
              <div className="flex items-center justify-between text-[#667085] text-xs mb-1">
                <span>Tiền mặt chưa chốt</span>
                <Clock className="w-3.5 h-3.5 text-[#B54708]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#B54708]">
                {formatCurrency(unsettledCash.reduce((acc, p) => acc + p.payment_amount, 0))}
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5">{unsettledCash.length} giao dịch tồn</div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
              <div className="flex items-center justify-between text-[#667085] text-xs mb-1">
                <span>Đã quyết toán</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0A9444]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#0A9444]">
                {formatCurrency(settlements.reduce((acc, s) => acc + s.total_cash_counted, 0))}
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5">{settlements.length} biên bản chốt</div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
              <div className="flex items-center justify-between text-[#667085] text-xs mb-1">
                <span>Hóa đơn cần lập</span>
                <Receipt className="w-3.5 h-3.5 text-[#326DD8]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#326DD8]">
                {invoiceStats.preparedCount}
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5">chờ phát hành HĐĐT</div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
              <div className="flex items-center justify-between text-[#667085] text-xs mb-1">
                <span>Công nợ tồn (AP07)</span>
                <AlertTriangle className="w-3.5 h-3.5 text-[#D92D20]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#D92D20]">
                {formatCurrency(debts.reduce((acc, d) => acc + d.debt_amount, 0))}
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5">{debts.length} hồ sơ nợ bến bãi</div>
            </div>
          </div>
        </div>

        {/* WORKSPACE VIEW TABS */}
        <WorkspaceTabs
          tabs={[
            {
              id: 'CASH_SETTLEMENT',
              label: 'Chốt Tiền Hiện Trường',
              count: unsettledCash.length,
              icon: DollarSign,
            },
            {
              id: 'INVOICES',
              label: 'Quản Lý Hóa Đơn (MST & CCCD)',
              count: invoiceStats.preparedCount,
              icon: Receipt,
            },
            {
              id: 'DEBTS',
              label: 'Công Nợ Bến Bãi (AP07)',
              count: debts.length,
              icon: CreditCard,
            },
            {
              id: 'REPORTS',
              label: 'Báo Cáo Sổ Quỹ & Dòng Tiền',
              icon: BarChart3,
            },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => setActiveTab(tabId as any)}
        />

        <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col min-h-[calc(100vh-210px)]">

      {/* ========================================================================= */}
      {/* TAB 1: CHỐT TIỀN HIỆN TRƯỜNG */}
      {/* ========================================================================= */}
      {activeTab === 'CASH_SETTLEMENT' && (
        <div className="space-y-6 flex-1 flex flex-col">
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
              <span className="text-[11px] text-slate-400 mt-1 block">Quầy Nghiệp vụ Cổng cảng Kho bãi</span>
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
                <option value="CCKB">Nghiệp vụ Cổng cảng Kho bãi</option>
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
          <div className="bg-white rounded-xl border border-[#E5E9F0] flex-1 flex flex-col min-h-[540px]">
            <div className="px-6 py-4 border-b border-[#E5E9F0] bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#17202E]">
                Lịch sử các đợt chốt tiền mặt hiện trường ({filteredSettlements.length} đợt)
              </h2>
            </div>

            <div className="overflow-x-auto flex-1 min-h-[500px] pb-40">
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
                    pagedSettlements.map((s, idx) => (
                      <tr key={s.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-center font-mono text-slate-500">
                          {(pageSettlements - 1) * pageSizeSettlements + idx + 1}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-blue-900">{s.settlement_code}</td>
                        <td className="px-4 py-3 text-slate-600">{formatDateTime(s.created_at)}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                            {s.handover_dept === 'AN_NINH' ? 'An ninh cổng' : s.handover_dept === 'CCKB' ? 'Nghiệp vụ Cổng cảng Kho bãi' : 'Toàn bãi'}
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
            <TablePagination
              currentPage={pageSettlements}
              totalItems={filteredSettlements.length}
              pageSize={pageSizeSettlements}
              onPageChange={setPageSettlements}
              onPageSizeChange={setPageSizeSettlements}
              itemLabel="đợt chốt"
            />
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
          <div className="bg-white rounded-xl border border-[#E5E9F0] flex-1 flex flex-col min-h-[540px]">
            <div className="px-6 py-4 border-b border-[#E5E9F0] bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#17202E]">
                Danh sách hóa đơn GTGT đã lập ({filteredInvoices.length} hóa đơn)
              </h2>
            </div>

            <div className="overflow-x-auto flex-1 min-h-[500px] pb-40">
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
                    pagedInvoices.map((inv, idx) => (
                      <tr key={inv.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-center font-mono text-slate-500">
                          {(pageInvoices - 1) * pageSizeInvoices + idx + 1}
                        </td>
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
            <TablePagination
              currentPage={pageInvoices}
              totalItems={filteredInvoices.length}
              pageSize={pageSizeInvoices}
              onPageChange={setPageInvoices}
              onPageSizeChange={setPageSizeInvoices}
              itemLabel="hóa đơn"
            />
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
          <div className="bg-white rounded-xl border border-[#E5E9F0] flex-1 flex flex-col min-h-[540px]">
            <div className="px-6 py-4 border-b border-[#E5E9F0] bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#17202E]">
                Danh sách khoản nợ cước bến bãi ({filteredDebts.length} khoản)
              </h2>
            </div>

            <div className="overflow-x-auto flex-1 min-h-[500px] pb-40">
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
                    pagedDebts.map((d, idx) => (
                      <tr key={d.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-center font-mono text-slate-500">
                          {(pageDebts - 1) * pageSizeDebts + idx + 1}
                        </td>
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
            <TablePagination
              currentPage={pageDebts}
              totalItems={filteredDebts.length}
              pageSize={pageSizeDebts}
              onPageChange={setPageDebts}
              onPageSizeChange={setPageSizeDebts}
              itemLabel="khoản nợ"
            />
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
                          {p.collector_dept === 'AN_NINH' ? 'An ninh cổng' : p.collector_dept === 'CCKB' ? 'Nghiệp vụ Cổng cảng Kho bãi' : 'Kế toán'}
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

        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. RIGHT CONTEXT PANEL: ĐỐI SOÁT & CHI TIẾT NGHIỆP VỤ         */}
      {/* ============================================================== */}
      <RightContextPanel
        title={
          selectedInspectorItem?.type === 'SETTLEMENT'
            ? 'Chi tiết chốt tiền mặt'
            : selectedInspectorItem?.type === 'INVOICE'
            ? 'Chi tiết hóa đơn'
            : selectedInspectorItem?.type === 'DEBT'
            ? 'Hồ sơ công nợ AP07'
            : 'Chi tiết nghiệp vụ'
        }
        subtitle={
          selectedInspectorItem?.type === 'SETTLEMENT'
            ? selectedInspectorItem.item.settlement_code
            : selectedInspectorItem?.type === 'INVOICE'
            ? (selectedInspectorItem.item.e_invoice_no ? `HĐ: ${selectedInspectorItem.item.e_invoice_no}` : selectedInspectorItem.item.invoice_code)
            : selectedInspectorItem?.type === 'DEBT'
            ? selectedInspectorItem.item.container_no || selectedInspectorItem.item.license_plate
            : undefined
        }
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        headerActions={
          selectedInspectorItem?.type === 'SETTLEMENT' ? (
            <StatusBadge
              variant={selectedInspectorItem.item.status === 'COMPLETED' ? 'success' : 'warning'}
              label={selectedInspectorItem.item.status === 'COMPLETED' ? 'Đã quyết toán' : 'Chờ xử lý'}
            />
          ) : selectedInspectorItem?.type === 'INVOICE' ? (
            <StatusBadge
              variant={selectedInspectorItem.item.status === 'INVOICED' ? 'success' : 'info'}
              label={selectedInspectorItem.item.status === 'INVOICED' ? 'Đã xuất HĐ' : 'Chờ xuất HĐ'}
            />
          ) : selectedInspectorItem?.type === 'DEBT' ? (
            <StatusBadge
              variant="error"
              label="Chưa thu hồi"
            />
          ) : undefined
        }
      >
        {!selectedInspectorItem ? (
          <EmptyState
            title="Chưa chọn đối tượng"
            description="Nhấp chọn một phiếu chốt tiền, hóa đơn hoặc hồ sơ công nợ từ danh sách bên trái để xem chi tiết và thao tác kế toán."
          />
        ) : selectedInspectorItem.type === 'SETTLEMENT' ? (
          <div className="space-y-4 text-xs">
            <div className="bg-[#F8F9FB] p-3 rounded-lg border border-[#E5E9F0] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#667085]">Mã biên bản:</span>
                <span className="font-mono font-bold text-[#17202E]">{selectedInspectorItem.item.settlement_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Bộ phận:</span>
                <span className="font-medium text-[#17202E]">
                  {selectedInspectorItem.item.handover_dept === 'AN_NINH' ? 'An ninh cổng' : selectedInspectorItem.item.handover_dept === 'CCKB' ? 'Nghiệp vụ Cổng cảng Kho bãi' : 'Toàn bãi'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Người giao:</span>
                <span className="font-medium text-[#17202E]">{selectedInspectorItem.item.handover_person_name || 'Nhân viên'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Kế toán nhận:</span>
                <span className="font-medium text-[#17202E]">{selectedInspectorItem.item.collector_name || 'Kế toán'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Thời gian:</span>
                <span className="text-[#17202E]">{formatDateTime(selectedInspectorItem.item.created_at)}</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-[#E5E9F0] space-y-2">
              <div className="text-[11px] font-semibold text-[#667085] uppercase">Kiểm kê tiền mặt</div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Sổ sách tính:</span>
                <span className="font-mono text-[#17202E]">{formatCurrency(selectedInspectorItem.item.total_cash_expected || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Thực tế kiểm đếm:</span>
                <span className="font-mono font-bold text-[#0A9444]">{formatCurrency(selectedInspectorItem.item.total_cash_counted || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-[#F0F2F6] pt-1">
                <span className="text-[#667085]">Chênh lệch:</span>
                <span className={`font-mono font-bold ${(selectedInspectorItem.item.difference_amount || 0) === 0 ? 'text-[#0A9444]' : 'text-[#D92D20]'}`}>
                  {formatCurrency(selectedInspectorItem.item.difference_amount || 0)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedSettlementToPrint({ settlement: selectedInspectorItem.item, items: [] });
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#326DD8] text-white font-medium hover:bg-[#2557B4] transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In biên bản bàn giao tiền</span>
            </button>
          </div>
        ) : selectedInspectorItem.type === 'INVOICE' ? (
          <div className="space-y-4 text-xs">
            <div className="bg-[#F8F9FB] p-3 rounded-lg border border-[#E5E9F0] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#667085]">Mã đề xuất:</span>
                <span className="font-mono font-bold text-[#17202E]">{selectedInspectorItem.item.invoice_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Số HĐ điện tử:</span>
                <span className="font-mono font-bold text-[#326DD8]">{selectedInspectorItem.item.e_invoice_no || 'Chưa ghi nhận'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Khách hàng:</span>
                <span className="font-medium text-[#17202E] text-right truncate max-w-[170px]">{selectedInspectorItem.item.buyer_name || 'Khách lẻ'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">MST / CCCD:</span>
                <span className="font-mono text-[#17202E]">{selectedInspectorItem.item.tax_code || selectedInspectorItem.item.id_card_no || '---'}</span>
              </div>
              <div className="flex justify-between border-t border-[#F0F2F6] pt-1">
                <span className="text-[#667085]">Tổng thanh toán:</span>
                <span className="font-mono font-bold text-[#0A9444]">{formatCurrency(selectedInspectorItem.item.total_amount)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedInvoiceToPrint({ invoice: selectedInspectorItem.item });
                }}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] text-[#17202E] font-medium hover:bg-[#F1F4F8] transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#667085]" />
                <span>In bảng kê kèm HĐ (Mẫu 01:BPA)</span>
              </button>

              {selectedInspectorItem.item.status !== 'INVOICED' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedInvoiceToRecord(selectedInspectorItem.item);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#326DD8] text-white font-medium hover:bg-[#2557B4] transition-colors cursor-pointer"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Ghi nhận số HĐĐT đã phát hành</span>
                </button>
              )}
            </div>
          </div>
        ) : selectedInspectorItem.type === 'DEBT' ? (
          <div className="space-y-4 text-xs">
            <div className="bg-[#F8F9FB] p-3 rounded-lg border border-[#E5E9F0] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#667085]">Khách hàng:</span>
                <span className="font-bold text-[#17202E]">{selectedInspectorItem.item.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Số điện thoại:</span>
                <span className="font-mono text-[#17202E]">{selectedInspectorItem.item.customer_phone || '---'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Cont / Biển số:</span>
                <span className="font-mono font-bold text-[#326DD8]">{selectedInspectorItem.item.container_no || selectedInspectorItem.item.license_plate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Khoản mục nợ:</span>
                <span className="font-medium text-[#17202E]">{selectedInspectorItem.item.charge_title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Người bảo lãnh:</span>
                <span className="text-[#17202E]">{selectedInspectorItem.item.guarantor_name || 'Trưởng ca'}</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-[#E5E9F0] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#667085]">Tổng tiền nợ:</span>
                <span className="font-mono text-[#17202E]">{formatCurrency(selectedInspectorItem.item.total_amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Đã thanh toán:</span>
                <span className="font-mono text-[#0A9444]">{formatCurrency(selectedInspectorItem.item.paid_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-[#F0F2F6] pt-1">
                <span className="text-[#667085] font-semibold">Dư nợ còn lại:</span>
                <span className="font-mono font-bold text-[#D92D20] text-sm">{formatCurrency(selectedInspectorItem.item.debt_amount)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedDebtToCollect(selectedInspectorItem.item);
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#D92D20] text-white font-medium hover:bg-[#B42318] transition-colors cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Thu hồi nợ cước này</span>
            </button>
          </div>
        ) : null}
      </RightContextPanel>

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
