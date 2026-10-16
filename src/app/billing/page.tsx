'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/contexts/toast-context';
import { 
  ChargeItem, 
  TariffItem, 
  ChargeType, 
  PaymentRecord, 
  ShiftType, 
  VehicleVisit, 
  ReeferPowerSession 
} from '@/types/domain.types';
import { 
  DollarSign, 
  Search, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Lock,
  Receipt,
  Truck,
  Zap,
  Clock,
  Tag,
  Printer,
  Calendar,
  Layers,
  ArrowRight,
  UserCheck,
  FileText,
  CheckSquare,
  Square,
  ShieldCheck,
  ChevronRight,
  Download,
  QrCode,
  Banknote,
  X,
  Package,
  User
} from 'lucide-react';
import { formatMoneyInWords, formatDate, formatTime, formatDateTime } from '@/lib/display-formatters';
import { exportChargesToExcel, exportShiftPaymentsToExcel } from '@/lib/export-excel';
import { generateVietQrUrl } from '@/lib/vietqr-generator';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { WorkspaceTabs } from '@/components/workspace/workspace-tabs';
import { SecondaryPanel } from '@/components/workspace/secondary-panel';
import { RightContextPanel } from '@/components/workspace/right-context-panel';
import { SearchInput } from '@/components/workspace/search-input';
import { StatusBadge } from '@/components/workspace/status-badge';
import { EmptyState } from '@/components/workspace/empty-state';
import { TablePagination } from '@/components/workspace/table-pagination';

export default function CashierBillingPage() {
  const { user, role, yardId, can, repository } = useAuth();
  const { warning: toastWarning } = useToast();

  // Phân quyền tách bạch triệt để theo RBAC V5:
  // - CCKB (PORT_STAFF, PORT_LEAD): CHỈ thu và CHỈ thấy cước điện (REEFER)
  // - An ninh (SEC_STAFF, SEC_LEAD): CHỈ thu vé xe (TICKET) và xem lịch sử phí lưu bãi (STORAGE)
  // - Quản trị viên (SYS_ADMIN): Toàn quyền
  const isSecurityRole = role === 'SEC_STAFF' || role === 'SEC_LEAD';
  const isCCKBRole = role === 'PORT_STAFF' || role === 'PORT_LEAD';
  const isAdminRole = role === 'SYS_ADMIN' || !role;

  // Quyền hạn thu tiền theo vai trò
  const canCollectTicket = can('ticket.payment.collect') && (isSecurityRole || isAdminRole);
  const canCollectReefer = can('reefer.payment.collect') && (isCCKBRole || isAdminRole);

  const canCollectCharge = (c: ChargeItem) => {
    if (c.charge_type === 'TICKET') return canCollectTicket;
    if (c.charge_type === 'REEFER') return canCollectReefer;
    // Phí lưu bãi container chỉ được chốt và thu trực tiếp tại Cổng ra (/exit) khi xe chở cont rời bãi!
    if (c.charge_type === 'STORAGE') return false;
    return false;
  };

  // Tab điều hướng chính
  const [activeTab, setActiveTab] = useState<'LEDGER' | 'SHIFT_REPORT'>('LEDGER');

  // Dữ liệu chung
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleVisit[]>([]);
  const [reeferSessions, setReeferSessions] = useState<ReeferPowerSession[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showBillingQr, setShowBillingQr] = useState<boolean>(false);

  // Bộ lọc Tab Sổ cái (Ledger)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ChargeType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');
  const [contFilter, setContFilter] = useState<string>('ALL');
  const [customerFilter, setCustomerFilter] = useState<string>('ALL');

  // DS-02 Multi-pane Workspace: Secondary Panel & Inspector
  const [selectedInspectorCharge, setSelectedInspectorCharge] = useState<ChargeItem | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [secondarySearch, setSecondarySearch] = useState<string>('');
  const [secondaryFilter, setSecondaryFilter] = useState<'ALL' | 'UNPAID' | 'REEFER' | 'TICKET'>('ALL');
  const [isSecondaryCollapsed, setIsSecondaryCollapsed] = useState<boolean>(true);

  // Chọn nhiều khoản (Batch Collection)
  const [selectedChargeIds, setSelectedChargeIds] = useState<string[]>([]);
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchPayMethod, setBatchPayMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [batchReceiptCode, setBatchReceiptCode] = useState<string>('');
  const [batchNotes, setBatchNotes] = useState<string>('');
  const [batchError, setBatchError] = useState<string>('');
  const [isSubmittingBatch, setIsSubmittingBatch] = useState<boolean>(false);

  // Modal Thu tiền đơn lẻ
  const [showCollectModal, setShowCollectModal] = useState<boolean>(false);
  const [selectedCharge, setSelectedCharge] = useState<ChargeItem | null>(null);
  const [payMethod, setPayMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [receiptCode, setReceiptCode] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [collectError, setCollectError] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // Modal In Phiếu Thu / Biên lai Đơn lẻ
  const [receiptCharge, setReceiptCharge] = useState<ChargeItem | null>(null);
  const [receiptMeta, setReceiptMeta] = useState<{
    receiptCode: string;
    payMethod: 'CASH' | 'TRANSFER';
    payDate: string;
    operatorName: string;
    notes?: string;
  } | null>(null);

  // Modal In Phiếu Thu / Biên lai Tổng hợp Gộp
  const [batchReceiptItems, setBatchReceiptItems] = useState<ChargeItem[] | null>(null);
  const [batchReceiptMeta, setBatchReceiptMeta] = useState<{
    receiptCode: string;
    payMethod: 'CASH' | 'TRANSFER';
    payDate: string;
    operatorName: string;
    totalAmount: number;
    notes?: string;
  } | null>(null);

  // ==========================================
  // BỘ LỌC VÀ THAM SỐ CHO BÁO CÁO CA TRỰC (SHIFT)
  // ==========================================
  const [reportDate, setReportDate] = useState<string>('');
  const [currentDateTimeStr, setCurrentDateTimeStr] = useState<string>('');
  const [selectedShiftType, setSelectedShiftType] = useState<ShiftType>('SHIFT_1');
  const [customStartTime, setCustomStartTime] = useState<string>('06:00');
  const [customEndTime, setCustomEndTime] = useState<string>('14:00');
  const [deptFilter, setDeptFilter] = useState<'ALL' | 'AN_NINH' | 'CCKB'>('ALL');
  const [payMethodFilter, setPayMethodFilter] = useState<'ALL' | 'CASH' | 'TRANSFER'>('ALL');
  
  // Modal In Biên bản Bàn giao Ca trực
  const [showShiftPrintModal, setShowShiftPrintModal] = useState<boolean>(false);
  const [handoverReceiver, setHandoverReceiver] = useState<string>('');
  const [handoverNotes, setHandoverNotes] = useState<string>('');

  // Tải dữ liệu ban đầu
  const loadAllData = async () => {
    try {
      const [chargeList, tariffList, payList, vehList, reeferList] = await Promise.all([
        repository.getCharges(yardId),
        repository.getTariffs(),
        repository.getPayments ? repository.getPayments({ yardId }) : Promise.resolve([]),
        repository.getVehicles(yardId),
        repository.getReeferSessions(yardId),
      ]);
      setCharges(chargeList);
      setTariffs(tariffList);
      setPayments(payList);
      setVehicles(vehList);
      setReeferSessions(reeferList);
    } catch (err) {
      console.error('Lỗi tải dữ liệu tài chính:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    setReportDate(now.toISOString().slice(0, 10));
    setCurrentDateTimeStr(now.toLocaleString('vi-VN'));
    loadAllData();
  }, [repository, yardId]);

  // Deep-linking URL params cho chụp ảnh tài liệu & chia sẻ link
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const p = new URLSearchParams(window.location.search);
    const tabParam = p.get('tab');
    if (tabParam === 'LEDGER' || tabParam === 'SHIFT_REPORT') {
      setActiveTab(tabParam as any);
    }
    const modalParam = p.get('modal');
    if (modalParam === 'collect' && charges.length > 0 && !showCollectModal) {
      const unpaidCharge = charges.find(c => c.status === 'UNPAID') || charges[0];
      setSelectedCharge(unpaidCharge);
      setPayMethod('CASH');
      setReceiptCode('PT-SC-20261016-012');
      setPayNotes('Thu tiền cước điện container tại bến bãi theo phiếu dịch vụ');
      setShowCollectModal(true);
    } else if (modalParam === 'batch' && charges.length > 1 && !showBatchModal) {
      const unpaidList = charges.filter(c => c.status === 'UNPAID');
      const targetIds = unpaidList.length >= 2 ? [unpaidList[0].id, unpaidList[1].id] : [charges[0].id, charges[1].id];
      setSelectedChargeIds(targetIds);
      setBatchPayMethod('CASH');
      setBatchReceiptCode('PT-BATCH-20261016-004');
      setBatchNotes('Thu gộp cước lưu bãi + tiền điện cho xe 98C-123.45');
      setShowBatchModal(true);
    } else if (modalParam === 'receipt' && !receiptMeta) {
      setReceiptMeta({
        receiptCode: 'PT-SC-20261016-012',
        payMethod: 'CASH',
        payDate: '16/10/2026 21:00:00',
        operatorName: 'Nguyễn Văn An (Kế toán Sơn Cảng)',
        notes: 'Thu tiền cước cấp điện container lạnh 24 giờ',
      });
      if (charges.length > 0) setReceiptCharge(charges[0]);
    }
  }, [charges, showCollectModal, showBatchModal, receiptMeta]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    loadAllData();
  };

  // Tự động phát hiện ca hiện tại theo giờ đồng hồ
  const handleSelectCurrentShift = () => {
    const now = new Date();
    const curHour = now.getHours();
    setReportDate(now.toISOString().slice(0, 10));

    if (curHour >= 6 && curHour < 14) {
      setSelectedShiftType('SHIFT_1');
    } else if (curHour >= 14 && curHour < 22) {
      setSelectedShiftType('SHIFT_2');
    } else {
      setSelectedShiftType('SHIFT_3');
    }
  };

  // Tính toán thời gian bắt đầu và kết thúc của ca trực
  const shiftTimeRange = useMemo(() => {
    const baseDate = reportDate || '2026-10-12';
    let startIso = `${baseDate}T06:00:00`;
    let endIso = `${baseDate}T14:00:00`;
    let label = 'Ca 1 (06:00 - 14:00)';

    const d = new Date(baseDate);
    const nextDay = new Date(d);
    nextDay.setDate(d.getDate() + 1);
    const nextDayStr = nextDay.toISOString().slice(0, 10);

    switch (selectedShiftType) {
      case 'SHIFT_1':
        startIso = `${baseDate}T06:00:00`;
        endIso = `${baseDate}T14:00:00`;
        label = `Ca 1 Sáng (06:00 - 14:00) ngày ${new Date(baseDate).toLocaleDateString('vi-VN')}`;
        break;
      case 'SHIFT_2':
        startIso = `${baseDate}T14:00:00`;
        endIso = `${baseDate}T22:00:00`;
        label = `Ca 2 Chiều (14:00 - 22:00) ngày ${new Date(baseDate).toLocaleDateString('vi-VN')}`;
        break;
      case 'SHIFT_3':
        startIso = `${baseDate}T22:00:00`;
        endIso = `${nextDayStr}T06:00:00`;
        label = `Ca 3 Đêm (22:00 - 06:00 hôm sau) ngày ${new Date(baseDate).toLocaleDateString('vi-VN')}`;
        break;
      case 'SHIFT_12H_DAY':
        startIso = `${baseDate}T06:00:00`;
        endIso = `${baseDate}T18:00:00`;
        label = `Ca Ngày 12h (06:00 - 18:00) ngày ${new Date(baseDate).toLocaleDateString('vi-VN')}`;
        break;
      case 'SHIFT_12H_NIGHT':
        startIso = `${baseDate}T18:00:00`;
        endIso = `${nextDayStr}T06:00:00`;
        label = `Ca Đêm 12h (18:00 - 06:00 hôm sau) ngày ${new Date(baseDate).toLocaleDateString('vi-VN')}`;
        break;
      case 'CUSTOM':
        startIso = `${baseDate}T${customStartTime}:00`;
        endIso = `${baseDate}T${customEndTime}:00`;
        label = `Khung giờ tùy chọn (${customStartTime} - ${customEndTime}) ngày ${new Date(baseDate).toLocaleDateString('vi-VN')}`;
        break;
    }

    return { startIso, endIso, label };
  }, [selectedShiftType, reportDate, customStartTime, customEndTime]);

  // Lọc các giao dịch thanh toán trong ca trực
  const shiftPayments = useMemo(() => {
    const { startIso, endIso } = shiftTimeRange;
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();

    return payments.filter((p) => {
      const payMs = new Date(p.collected_at).getTime();
      const inRange = payMs >= startMs && payMs <= endMs;
      const matchDept = deptFilter === 'ALL' || p.collector_dept === deptFilter;
      const matchMethod = payMethodFilter === 'ALL' || p.payment_method === payMethodFilter;
      return inRange && matchDept && matchMethod;
    });
  }, [payments, shiftTimeRange, deptFilter, payMethodFilter]);

  // Thống kê đối soát ca trực
  const shiftSummary = useMemo(() => {
    let totalCash = 0;
    let totalTransfer = 0;
    let cashCount = 0;
    let transferCount = 0;

    let ticketAmount = 0;
    let ticketCount = 0;
    let reeferAmount = 0;
    let reeferCount = 0;
    let storageAmount = 0;
    let storageCount = 0;
    let penaltyAmount = 0;
    let penaltyCount = 0;

    shiftPayments.forEach((p) => {
      const amt = Number(p.payment_amount) || 0;
      if (p.payment_method === 'CASH') {
        totalCash += amt;
        cashCount++;
      } else {
        totalTransfer += amt;
        transferCount++;
      }

      const isPenalty = p.charge_title?.toLowerCase().includes('phạt') || p.notes?.toLowerCase().includes('phạt');
      if (isPenalty) {
        penaltyAmount += amt;
        penaltyCount++;
      } else if (p.charge_type === 'TICKET') {
        ticketAmount += amt;
        ticketCount++;
      } else if (p.charge_type === 'REEFER') {
        reeferAmount += amt;
        reeferCount++;
      } else if (p.charge_type === 'STORAGE') {
        storageAmount += amt;
        storageCount++;
      }
    });

    const totalRevenue = totalCash + totalTransfer;

    // Thống kê lưu lượng bến bãi trong khung giờ ca
    const { startIso, endIso } = shiftTimeRange;
    const startMs = new Date(startIso).getTime();
    const endMs = new Date(endIso).getTime();

    const inboundVehicles = vehicles.filter((v) => {
      const t = new Date(v.entry_at).getTime();
      return t >= startMs && t <= endMs;
    }).length;

    const outboundVehicles = vehicles.filter((v) => {
      if (!v.exit_at) return false;
      const t = new Date(v.exit_at).getTime();
      return t >= startMs && t <= endMs;
    }).length;

    const reeferSessionsInShift = reeferSessions.filter((s) => {
      const t = new Date(s.plugged_in_at).getTime();
      return t >= startMs && t <= endMs;
    }).length;

    return {
      totalCash,
      totalTransfer,
      totalRevenue,
      cashCount,
      transferCount,
      ticketAmount,
      ticketCount,
      reeferAmount,
      reeferCount,
      storageAmount,
      storageCount,
      penaltyAmount,
      penaltyCount,
      inboundVehicles,
      outboundVehicles,
      reeferSessionsInShift,
    };
  }, [shiftPayments, shiftTimeRange, vehicles, reeferSessions]);

  // ==========================================
  // THAO TÁC THU TIỀN ĐƠN LẺ & IN BIÊN LAI
  // ==========================================
  const handleOpenCollect = (charge: ChargeItem) => {
    if (charge.charge_type === 'REEFER' && isSecurityRole) {
      toastWarning('Chưa được phân quyền: Thao tác thu tiền điện container thuộc thẩm quyền của bộ phận CCKB.', 'Phân quyền thu phí');
      return;
    }

    setSelectedCharge(charge);
    setCollectError('');
    setPayMethod('CASH');
    const receiptSuffix = charge.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '000001';
    setReceiptCode(`PT-${receiptSuffix}`);
    setPayNotes('');
    setShowCollectModal(true);
  };

  const handleConfirmCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharge) return;

    const dept = isSecurityRole ? 'AN_NINH' : 'CCKB';

    const res = await repository.collectPayment({
      chargeId: selectedCharge.id,
      amount: selectedCharge.amount - selectedCharge.paid_amount,
      paymentMethod: payMethod,
      operatorId: user?.id || 'operator',
      operatorDept: dept,
      receiptCode,
      notes: payNotes,
    });

    if (res.error) {
      setCollectError(res.error);
    } else {
      setShowCollectModal(false);
      setActionSuccessMsg(`Đã ghi nhận thu thành công ${(selectedCharge.amount - selectedCharge.paid_amount).toLocaleString()}đ cho khoản "${selectedCharge.title}"`);
      setReceiptCharge({
        ...selectedCharge,
        status: 'PAID',
        paid_amount: selectedCharge.amount,
      });
      setReceiptMeta({
        receiptCode,
        payMethod,
        payDate: new Date().toISOString(),
        operatorName: user?.email || (isSecurityRole ? 'Nhân viên An ninh Cổng' : 'Nghiệp vụ Cổng cảng Kho bãi'),
        notes: payNotes,
      });
      handleManualRefresh();
    }
  };

  const handleOpenPrintReceipt = (charge: ChargeItem) => {
    const fallbackCode = `PT-${charge.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '000001'}`;
    setReceiptCharge(charge);
    setReceiptMeta({
      receiptCode: fallbackCode,
      payMethod: 'CASH',
      payDate: charge.created_at || new Date().toISOString(),
      operatorName: user?.email || (isSecurityRole ? 'Nhân viên An ninh Cổng' : 'Nghiệp vụ Cổng cảng Kho bãi'),
      notes: charge.notes || '',
    });
  };

  // ==========================================
  // THAO TÁC THU GỘP NHIỀU KHOẢN (BATCH)
  // ==========================================
  const handleToggleSelectCharge = (id: string) => {
    setSelectedChargeIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllUnpaid = () => {
    const collectableUnpaidIds = filteredCharges
      .filter(c => c.status === 'UNPAID' && canCollectCharge(c) && c.charge_type !== 'STORAGE')
      .map(c => c.id);
    
    if (collectableUnpaidIds.length > 0 && collectableUnpaidIds.every(id => selectedChargeIds.includes(id))) {
      setSelectedChargeIds(prev => prev.filter(id => !collectableUnpaidIds.includes(id)));
    } else {
      setSelectedChargeIds(prev => Array.from(new Set([...prev, ...collectableUnpaidIds])));
    }
  };

  // Gom nhanh tất cả khoản nợ của 1 container
  const handleSelectAllOfContainer = (contNo: string) => {
    const matchingIds = filteredCharges
      .filter(c => c.status === 'UNPAID' && c.container_no === contNo && canCollectCharge(c) && c.charge_type !== 'STORAGE')
      .map(c => c.id);
    if (matchingIds.length === 0) return;
    setSelectedChargeIds(prev => Array.from(new Set([...prev, ...matchingIds])));
  };

  // Gom nhanh tất cả khoản nợ của 1 khách hàng
  const handleSelectAllOfCustomer = (customerName: string) => {
    const matchingIds = filteredCharges
      .filter(c => c.status === 'UNPAID' && c.customer_name === customerName && canCollectCharge(c) && c.charge_type !== 'STORAGE')
      .map(c => c.id);
    if (matchingIds.length === 0) return;
    setSelectedChargeIds(prev => Array.from(new Set([...prev, ...matchingIds])));
  };

  const selectedChargesList = useMemo(() => {
    return charges.filter(c => selectedChargeIds.includes(c.id));
  }, [charges, selectedChargeIds]);

  const selectedBatchTotal = useMemo(() => {
    return selectedChargesList.reduce((sum, c) => sum + (c.amount - c.paid_amount), 0);
  }, [selectedChargesList]);

  const selectedBatchConts = useMemo(() => {
    const conts = selectedChargesList.map(c => c.container_no).filter((no): no is string => Boolean(no));
    return Array.from(new Set(conts));
  }, [selectedChargesList]);

  const selectedBatchCustomers = useMemo(() => {
    const custs = selectedChargesList.map(c => c.customer_name).filter((name): name is string => Boolean(name));
    return Array.from(new Set(custs));
  }, [selectedChargesList]);

  const handleOpenBatchModal = () => {
    if (selectedChargeIds.length === 0) return;

    // Kiểm tra nếu có khoản điện mà là an ninh
    const hasReefer = selectedChargesList.some(c => c.charge_type === 'REEFER');
    if (hasReefer && isSecurityRole) {
      toastWarning('Danh sách chọn có khoản tiền điện Container Lạnh thuộc thẩm quyền thu của Nghiệp vụ Cổng cảng Kho bãi! Vui lòng bỏ chọn khoản điện để tiếp tục thu vé/lưu bãi.', 'Cảnh báo phân quyền');
      return;
    }

    setBatchError('');
    setBatchPayMethod('CASH');
    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    setBatchReceiptCode(`PT-GOP-${randomSuffix}`);

    let defaultNotes = `Thu gộp ${selectedChargeIds.length} khoản phí dịch vụ`;
    if (selectedBatchConts.length === 1) {
      defaultNotes = `Thu gộp ${selectedChargeIds.length} phiên cước điện cho container ${selectedBatchConts[0]}`;
    } else if (selectedBatchCustomers.length === 1) {
      defaultNotes = `Thu gộp ${selectedChargeIds.length} khoản cho khách hàng ${selectedBatchCustomers[0]}`;
    }
    setBatchNotes(defaultNotes);
    setShowBatchModal(true);
  };

  const handleConfirmBatchCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedChargeIds.length === 0) return;

    setIsSubmittingBatch(true);
    setBatchError('');

    const dept = isSecurityRole ? 'AN_NINH' : 'CCKB';

    const res = await repository.batchCollectPayments({
      chargeIds: selectedChargeIds,
      paymentMethod: batchPayMethod,
      operatorId: user?.id || 'operator',
      operatorDept: dept,
      receiptCode: batchReceiptCode,
      notes: batchNotes || `Thu gộp ${selectedChargeIds.length} khoản phí bến bãi`,
    });

    setIsSubmittingBatch(false);

    if (res.error || !res.success) {
      setBatchError(res.error || 'Có lỗi xảy ra khi thực hiện thu gộp.');
    } else {
      setShowBatchModal(false);
      setActionSuccessMsg(`Đã thu gộp thành công ${res.collectedCount} khoản phí! Tổng số tiền: ${res.totalAmount.toLocaleString()} VNĐ (Mã biên lai: ${batchReceiptCode})`);
      
      // Mở modal in biên lai tổng hợp gộp
      setBatchReceiptItems([...selectedChargesList]);
      setBatchReceiptMeta({
        receiptCode: batchReceiptCode,
        payMethod: batchPayMethod,
        payDate: new Date().toISOString(),
        operatorName: user?.email || (isSecurityRole ? 'Nhân viên An ninh Cổng' : 'Nghiệp vụ Cổng cảng Kho bãi'),
        totalAmount: res.totalAmount,
        notes: batchNotes,
      });

      setSelectedChargeIds([]);
      handleManualRefresh();
    }
  };

  // Lọc tập dữ liệu theo vai trò (Role Isolation RBAC V5)
  const roleScopedCharges = useMemo(() => {
    if (isCCKBRole) {
      // CCKB CHỈ thấy cước điện container lạnh
      return charges.filter(c => c.charge_type === 'REEFER');
    }
    if (isSecurityRole) {
      // An ninh CHỈ thấy vé xe vào cổng và xem lịch sử phí lưu bãi (tuyệt đối không thấy cước điện)
      return charges.filter(c => c.charge_type === 'TICKET' || c.charge_type === 'STORAGE');
    }
    // Admin thấy toàn bộ
    return charges;
  }, [charges, isCCKBRole, isSecurityRole]);

  // Danh sách các container và khách hàng có trong tập dữ liệu của vai trò này
  const availableContainers = useMemo(() => {
    const conts = roleScopedCharges
      .map(c => c.container_no)
      .filter((no): no is string => Boolean(no));
    return Array.from(new Set(conts));
  }, [roleScopedCharges]);

  const availableCustomers = useMemo(() => {
    const custs = roleScopedCharges
      .map(c => c.customer_name)
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(custs));
  }, [roleScopedCharges]);

  // Lọc danh sách sổ cái theo tìm kiếm và bộ lọc, ưu tiên đẩy Chưa thu (UNPAID) lên trên đầu
  const filteredCharges = useMemo(() => {
    return roleScopedCharges
      .filter((c) => {
        const q = searchQuery.toLowerCase();
        const matchesSearch = 
          c.title.toLowerCase().includes(q) ||
          (c.container_no && c.container_no.toLowerCase().includes(q)) ||
          (c.license_plate && c.license_plate.toLowerCase().includes(q)) ||
          (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q));

        const matchesType = typeFilter === 'ALL' || c.charge_type === typeFilter;
        const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
        const matchesCont = contFilter === 'ALL' || c.container_no === contFilter;
        const matchesCustomer = customerFilter === 'ALL' || c.customer_name === customerFilter;

        return matchesSearch && matchesType && matchesStatus && matchesCont && matchesCustomer;
      })
      .sort((a, b) => {
        // 1. Ưu tiên các khoản CHƯA THU (UNPAID) lên trên cùng để thu ngân dễ thấy và xử lý ngay
        if (a.status === 'UNPAID' && b.status !== 'UNPAID') return -1;
        if (a.status !== 'UNPAID' && b.status === 'UNPAID') return 1;

        // 2. Cùng trạng thái: khoản tạo mới nhất xếp lên trước
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
  }, [roleScopedCharges, searchQuery, typeFilter, statusFilter, contFilter, customerFilter]);

  // Quản lý Phân trang (Pagination)
  const [pageCharges, setPageCharges] = useState<number>(1);
  const [pageSizeCharges, setPageSizeCharges] = useState<number>(20);

  const [pageShiftPayments, setPageShiftPayments] = useState<number>(1);
  const [pageSizeShiftPayments, setPageSizeShiftPayments] = useState<number>(20);

  useEffect(() => {
    setPageCharges(1);
  }, [searchQuery, typeFilter, statusFilter, contFilter, customerFilter]);

  useEffect(() => {
    setPageShiftPayments(1);
  }, [selectedShiftType, reportDate, deptFilter, payMethodFilter]);

  const pagedCharges = useMemo(() => {
    const start = (pageCharges - 1) * pageSizeCharges;
    return filteredCharges.slice(start, start + pageSizeCharges);
  }, [filteredCharges, pageCharges, pageSizeCharges]);

  const pagedShiftPayments = useMemo(() => {
    const start = (pageShiftPayments - 1) * pageSizeShiftPayments;
    return shiftPayments.slice(start, start + pageSizeShiftPayments);
  }, [shiftPayments, pageShiftPayments, pageSizeShiftPayments]);

  const totalUnpaid = useMemo(() => {
    // Chỉ tính các khoản nợ thực tế cần thu tại giao diện này (loại trừ STORAGE vì STORAGE thu tại /exit)
    return roleScopedCharges
      .filter((c) => c.status === 'UNPAID' && c.charge_type !== 'STORAGE')
      .reduce((acc, curr) => acc + (curr.amount - curr.paid_amount), 0);
  }, [roleScopedCharges]);

  const totalPaid = useMemo(() => {
    return roleScopedCharges
      .filter((c) => c.status === 'PAID')
      .reduce((acc, curr) => acc + curr.paid_amount, 0);
  }, [roleScopedCharges]);

  // DS-02 Secondary Panel Filtered List
  const filteredSecondaryCharges = useMemo(() => {
    return roleScopedCharges.filter((c) => {
      const q = secondarySearch.toLowerCase().trim();
      const matchQ = !q || (
        c.title?.toLowerCase().includes(q) ||
        (c.container_no && c.container_no.toLowerCase().includes(q)) ||
        (c.license_plate && c.license_plate.toLowerCase().includes(q)) ||
        (c.customer_name && c.customer_name.toLowerCase().includes(q))
      );
      if (!matchQ) return false;

      if (secondaryFilter === 'UNPAID') return c.status === 'UNPAID';
      if (secondaryFilter === 'REEFER') return c.charge_type === 'REEFER';
      if (secondaryFilter === 'TICKET') return c.charge_type === 'TICKET';
      return true;
    }).sort((a, b) => {
      if (a.status === 'UNPAID' && b.status !== 'UNPAID') return -1;
      if (a.status !== 'UNPAID' && b.status === 'UNPAID') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [roleScopedCharges, secondarySearch, secondaryFilter]);

  return (
    <div className="flex-1 flex overflow-hidden bg-[#FFFFFF] min-h-0">
      {/* ============================================================== */}
      {/* 1. SECONDARY PANEL: SỔ CÁI & QUEUE CHỜ THU                    */}
      {/* ============================================================== */}
      <SecondaryPanel
        title="Khoản chờ thu"
        count={roleScopedCharges.filter(c => c.status === 'UNPAID').length}
        isCollapsed={isSecondaryCollapsed}
        onToggleCollapse={() => setIsSecondaryCollapsed(!isSecondaryCollapsed)}
        headerActions={
          <button
            type="button"
            onClick={handleManualRefresh}
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
            placeholder="Tìm biển số, số cont..."
          />
        }
        filterSlot={
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setSecondaryFilter('ALL')}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                secondaryFilter === 'ALL'
                  ? 'bg-[#326DD8] text-white font-medium'
                  : 'bg-[#F5F7FA] text-[#667085] hover:bg-[#E5E9F0]'
              }`}
            >
              Tất cả ({roleScopedCharges.length})
            </button>
            <button
              type="button"
              onClick={() => setSecondaryFilter('UNPAID')}
              className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                secondaryFilter === 'UNPAID'
                  ? 'bg-[#D92D20] text-white font-medium'
                  : 'bg-[#F5F7FA] text-[#667085] hover:bg-[#E5E9F0]'
              }`}
            >
              Chưa thu ({roleScopedCharges.filter(c => c.status === 'UNPAID').length})
            </button>
            {isCCKBRole && (
              <button
                type="button"
                onClick={() => setSecondaryFilter('REEFER')}
                className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                  secondaryFilter === 'REEFER'
                    ? 'bg-[#B54708] text-white font-medium'
                    : 'bg-[#F5F7FA] text-[#667085] hover:bg-[#E5E9F0]'
                }`}
              >
                Cước điện ({roleScopedCharges.filter(c => c.charge_type === 'REEFER').length})
              </button>
            )}
            {isSecurityRole && (
              <button
                type="button"
                onClick={() => setSecondaryFilter('TICKET')}
                className={`px-2 py-0.5 rounded-full whitespace-nowrap transition-colors cursor-pointer ${
                  secondaryFilter === 'TICKET'
                    ? 'bg-[#223873] text-white font-medium'
                    : 'bg-[#F5F7FA] text-[#667085] hover:bg-[#E5E9F0]'
                }`}
              >
                Vé xe ({roleScopedCharges.filter(c => c.charge_type === 'TICKET').length})
              </button>
            )}
          </div>
        }
      >
        {filteredSecondaryCharges.length === 0 ? (
          <div className="p-4 text-center text-xs text-[#98A2B3]">
            Không tìm thấy khoản thu nào
          </div>
        ) : (
          filteredSecondaryCharges.map((c) => {
            const isSelected = selectedInspectorCharge?.id === c.id;
            const mainLabel = c.container_no || c.license_plate || c.title || 'Khoản thu';
            const typeLabel = c.charge_type === 'REEFER' ? 'CƯỚC ĐIỆN' : c.charge_type === 'TICKET' ? 'VÉ CỔNG' : 'LƯU BÃI';

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedInspectorCharge(c);
                  setIsInspectorOpen(true);
                }}
                className={`w-full text-left p-3 transition-colors cursor-pointer border-b border-[#F0F2F6] ${
                  isSelected ? 'bg-[#EAF1FD]' : 'hover:bg-[#F8F9FB]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-bold text-xs text-[#17202E]">
                    {mainLabel}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                    c.status === 'PAID'
                      ? 'bg-[#ECFDF3] text-[#0A9444]'
                      : 'bg-[#FEF3F2] text-[#D92D20]'
                  }`}>
                    {c.status === 'PAID' ? 'ĐÃ THU' : 'CHƯA THU'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#667085]">
                  <span className="truncate max-w-[150px]">{typeLabel} {c.customer_name ? `• ${c.customer_name}` : ''}</span>
                  <span className="font-mono font-bold text-[#0A9444]">
                    {c.amount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </button>
            );
          })
        )}
      </SecondaryPanel>

      {/* ============================================================== */}
      {/* 2. MAIN WORKSPACE                                              */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white">
        <WorkspaceHeader
          title={
            isCCKBRole
              ? 'Thu phí Cước điện Container — Nghiệp vụ Cổng cảng Kho bãi'
              : isSecurityRole
              ? 'Thu phí Vé xe & Tra cứu Lưu bãi — An ninh'
              : 'Sổ cái Tài chính & Thu ngân Bến bãi'
          }
          subtitle={
            isCCKBRole
              ? 'Thu cước cắm điện container, gom thu theo cont hoặc theo khách hàng, đối soát ca trực'
              : isSecurityRole
              ? 'Thu vé phương tiện vào cổng, theo dõi trạng thái thanh toán vé & tra cứu lưu bãi'
              : 'Quản lý toàn bộ khoản phải thu, thanh toán gộp, đối soát tiền mặt ca trực & in biên bản'
          }
          icon={Receipt}
          badge={
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF8FF] text-[#326DD8] border border-[#B2DDFF]">
              {isCCKBRole ? 'Nghiệp vụ Cổng cảng Kho bãi' : isSecurityRole ? 'An ninh Cổng' : 'Tài chính Thu ngân'}
            </span>
          }
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === 'LEDGER' ? (
                <button
                  type="button"
                  onClick={() => exportChargesToExcel(filteredCharges)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E9F0] text-xs font-medium text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
                  title="Xuất XLSX Sổ cái"
                >
                  <Download className="w-3.5 h-3.5 text-[#667085]" />
                  <span>Xuất XLSX ({filteredCharges.length})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => exportShiftPaymentsToExcel(shiftPayments, shiftTimeRange.label)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#ECFDF3] border border-[#A6F4C5] text-xs font-medium text-[#0A9444] hover:bg-[#D1FADF] transition-colors cursor-pointer"
                  title="Xuất XLSX Ca trực"
                >
                  <Download className="w-3.5 h-3.5 text-[#0A9444]" />
                  <span>Xuất XLSX Ca ({shiftPayments.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleManualRefresh}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E9F0] text-xs font-medium text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#667085] ${isLoading ? 'animate-spin' : ''}`} />
                <span>Làm mới</span>
              </button>
            </div>
          }
        />

        {/* Thông báo thao tác */}
        {actionSuccessMsg && (
          <div className="mx-5 mt-4 p-3.5 rounded-lg bg-[#ECFDF3] border border-[#A6F4C5] flex items-center justify-between text-xs text-[#0A9444]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#0A9444] shrink-0" />
              <span className="font-medium">{actionSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setActionSuccessMsg('')}
              className="p-1 rounded text-[#0A9444] hover:bg-[#D1FADF]"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Compact KPI strip (4 cards) */}
        <div className="p-4 sm:p-5 border-b border-[#E5E9F0] bg-[#F8F9FB]">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
              <div className="flex items-center justify-between text-[#667085] text-xs mb-1">
                <span>Chưa thanh toán</span>
                <AlertTriangle className="w-3.5 h-3.5 text-[#D92D20]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#D92D20]">
                {totalUnpaid.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5">cần thu bến bãi</div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
              <div className="flex items-center justify-between text-[#667085] text-xs mb-1">
                <span>Đã thực thu</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0A9444]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#0A9444]">
                {totalPaid.toLocaleString('vi-VN')} đ
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5">đã vào quỹ ca trực</div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
              <div className="flex items-center justify-between text-[#667085] text-xs mb-1">
                <span>Tổng khoản thu</span>
                <CreditCard className="w-3.5 h-3.5 text-[#326DD8]" />
              </div>
              <div className="text-xl font-bold font-mono text-[#17202E]">
                {roleScopedCharges.length}
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5">chứng từ trong sổ cái</div>
            </div>

            <div className="bg-white p-3 rounded-lg border border-[#E5E9F0]">
              <div className="flex items-center justify-between text-[#667085] text-xs mb-1">
                <span>{isCCKBRole ? 'Container cắm điện' : isSecurityRole ? 'Lưu bãi cổng ra' : 'Biểu phí hiệu lực'}</span>
                {isCCKBRole ? <Zap className="w-3.5 h-3.5 text-[#B54708]" /> : <Tag className="w-3.5 h-3.5 text-[#223873]" />}
              </div>
              <div className="text-xl font-bold font-mono text-[#17202E]">
                {isCCKBRole ? `${availableContainers.length} cont` : isSecurityRole ? `${roleScopedCharges.filter(c => c.charge_type === 'STORAGE' && c.status === 'PAID').length} lượt` : `${tariffs.length} mục`}
              </div>
              <div className="text-[11px] text-[#667085] mt-0.5">danh mục khai thác</div>
            </div>
          </div>
        </div>

        {/* WORKSPACE VIEW TABS */}
        <WorkspaceTabs
          tabs={[
            {
              id: 'LEDGER',
              label: 'Sổ cái Thu phí & Công nợ',
              count: roleScopedCharges.length,
              icon: CreditCard,
            },
            {
              id: 'SHIFT_REPORT',
              label: 'Báo cáo Ca trực & Bàn giao Ca',
              count: shiftPayments.length,
              icon: Calendar,
            },
          ]}
          activeTab={activeTab}
          onChange={(tabId) => {
            setActiveTab(tabId as any);
            if (tabId === 'SHIFT_REPORT') handleSelectCurrentShift();
          }}
        />

        <div className="p-4 sm:p-5 space-y-4 flex-1 flex flex-col min-h-[calc(100vh-210px)]">

      {/* ========================================================================= */}
      {/* TAB 1: SỔ CÁI & THU PHÍ TRỰC TIẾP (LEDGER & BATCH COLLECTION) */}
      {/* ========================================================================= */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-4 flex-1 flex flex-col">
          {/* Bộ lọc và Tìm kiếm */}
          <div className="bg-[#F8F9FB] p-3 rounded-xl border border-[#E5E9F0] flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
              <input
                type="text"
                placeholder="Tìm cont, khách hàng, biển số xe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-[#E5E9F0] rounded-lg text-xs sm:text-sm font-mono focus:outline-none focus:border-[#326DD8] bg-white text-[#17202E]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Dropdown lọc theo Container (dành cho CCKB và Admin) */}
              {(isCCKBRole || isAdminRole) && availableContainers.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-[#667085] uppercase">Cont:</span>
                  <select
                    value={contFilter}
                    onChange={(e) => setContFilter(e.target.value)}
                    className="px-2.5 py-1 border border-[#E5E9F0] rounded-lg text-xs font-mono font-semibold text-[#17202E] bg-white focus:outline-none focus:border-[#326DD8]"
                  >
                    <option value="ALL">Tất cả container ({availableContainers.length})</option>
                    {availableContainers.map((cn) => (
                      <option key={cn} value={cn}>
                        Cont {cn}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dropdown lọc theo Khách hàng (dành cho CCKB và Admin) */}
              {(isCCKBRole || isAdminRole) && availableCustomers.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-[#667085] uppercase">Khách:</span>
                  <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="px-2.5 py-1 border border-[#E5E9F0] rounded-lg text-xs font-semibold text-[#17202E] bg-white focus:outline-none focus:border-[#326DD8] max-w-[170px] truncate"
                  >
                    <option value="ALL">Tất cả khách ({availableCustomers.length})</option>
                    {availableCustomers.map((cust) => (
                      <option key={cust} value={cust}>
                        {cust}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Lọc loại phí (Ẩn đối với CCKB vì CCKB chỉ có cước điện) */}
              {!isCCKBRole && (
                <div className="flex items-center gap-1">
                  {(isSecurityRole
                    ? (['ALL', 'TICKET', 'STORAGE'] as const)
                    : (['ALL', 'TICKET', 'REEFER', 'STORAGE'] as const)
                  ).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors border cursor-pointer ${
                        typeFilter === t
                          ? 'bg-[#EAF1FD] text-[#326DD8] border-[#B2DDFF]'
                          : 'bg-white text-[#667085] border-[#E5E9F0] hover:bg-[#F8F9FB]'
                      }`}
                    >
                      {t === 'ALL' && 'Tất cả loại'}
                      {t === 'TICKET' && 'Vé vào cổng'}
                      {t === 'REEFER' && 'Tiền điện'}
                      {t === 'STORAGE' && 'Lịch sử lưu bãi'}
                    </button>
                  ))}
                </div>
              )}

              <span className="text-[#E5E9F0] hidden sm:inline">|</span>

              {/* Lọc trạng thái */}
              <div className="flex items-center gap-1">
                {(['ALL', 'UNPAID', 'PAID'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors border cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#ECFDF3] text-[#0A9444] border-[#A6F4C5]'
                        : 'bg-white text-[#667085] border-[#E5E9F0] hover:bg-[#F8F9FB]'
                    }`}
                  >
                    {st === 'ALL' && 'Tất cả'}
                    {st === 'UNPAID' && 'Chưa thu'}
                    {st === 'PAID' && 'Đã thu'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Thanh công cụ Thu gộp (Bar khi có tick chọn) */}
          {selectedChargeIds.length > 0 && (
            <div className="bg-[#223873] text-white p-3.5 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-blue-900">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-white/10 rounded flex-shrink-0">
                  <Layers className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-xs uppercase tracking-wide">
                      Đã chọn {selectedChargeIds.length} khoản nợ cần thanh toán
                    </p>
                    {selectedBatchConts.length > 0 && (
                      <span className="bg-white/15 px-2 py-0.5 rounded text-[11px] font-mono text-amber-200 inline-flex items-center gap-1">
                        <Package className="w-3 h-3 text-amber-300" />
                        <span>{selectedBatchConts.length} cont: {selectedBatchConts.join(', ')}</span>
                      </span>
                    )}
                    {selectedBatchCustomers.length > 0 && (
                      <span className="bg-white/15 px-2 py-0.5 rounded text-[11px] text-emerald-200 inline-flex items-center gap-1">
                        <User className="w-3 h-3 text-emerald-300" />
                        <span>Khách: {selectedBatchCustomers.join(', ')}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-blue-200 mt-0.5">
                    Tổng tiền thu gộp: <strong className="text-amber-300 text-sm font-mono font-bold">{selectedBatchTotal.toLocaleString()} đ</strong>
                    <span className="italic text-[11px] text-blue-300 ml-1.5">({formatMoneyInWords(selectedBatchTotal)})</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedChargeIds([])}
                  className="px-2.5 py-1 text-xs text-blue-200 hover:text-white bg-white/10 hover:bg-white/20 rounded font-semibold transition-colors cursor-pointer"
                >
                  Bỏ chọn tất cả
                </button>
                <button
                  type="button"
                  onClick={handleOpenBatchModal}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  Thu gộp {selectedChargeIds.length} khoản ngay
                </button>
              </div>
            </div>
          )}

          {/* Danh sách khoản thu - Full width */}
          <div className="bg-white rounded-xl border border-[#E5E9F0] flex-1 flex flex-col min-h-[540px]">
            <div className="p-3.5 border-b border-[#E5E9F0] bg-[#F8F9FB] flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[#17202E] uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-[#326DD8]" />
                Sổ cái các khoản thu ({filteredCharges.length})
              </h2>
              <div className="text-xs flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectAllUnpaid}
                  className="text-xs text-[#326DD8] hover:underline font-semibold cursor-pointer"
                >
                  Chọn/Bỏ tất cả khoản chưa thu
                </button>
              </div>
            </div>

            <div className="overflow-x-auto flex-1 min-h-[500px] pb-40">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-[#F8F9FB] border-b border-[#E5E9F0] text-[11px] text-[#667085] uppercase font-semibold tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredCharges.filter(c => c.status === 'UNPAID' && canCollectCharge(c) && c.charge_type !== 'STORAGE').length > 0 &&
                          filteredCharges.filter(c => c.status === 'UNPAID' && canCollectCharge(c) && c.charge_type !== 'STORAGE').every(c => selectedChargeIds.includes(c.id))
                        }
                        onChange={handleSelectAllUnpaid}
                        className="rounded border-[#E5E9F0] text-[#326DD8] focus:ring-[#326DD8]"
                        title="Chọn các khoản chưa thu thuộc quyền hạn của bạn"
                      />
                    </th>
                    <th className="px-3.5 py-2.5">Loại phí</th>
                    <th className="px-3.5 py-2.5">Nội dung / Đối tượng</th>
                    <th className="px-3.5 py-2.5">Số tiền</th>
                    <th className="px-3.5 py-2.5">Trạng thái</th>
                    <th className="px-3.5 py-2.5">Thời gian tạo</th>
                    <th className="px-3.5 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9F0]">
                  {filteredCharges.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-[#98A2B3]">
                        Không có khoản thu nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    pagedCharges.map((c) => {
                      const isPaid = c.status === 'PAID';
                      const isReefer = c.charge_type === 'REEFER';
                      const isStorage = c.charge_type === 'STORAGE';
                      const isTicket = c.charge_type === 'TICKET';
                      const isSelected = selectedChargeIds.includes(c.id);

                      const isForbidden = !canCollectCharge(c);
                      let forbiddenReason = '';
                      if (isForbidden) {
                        if (isReefer) forbiddenReason = 'Khoản thu điện lạnh thuộc thẩm quyền Nghiệp vụ Cổng cảng Kho bãi';
                        else if (isStorage) forbiddenReason = 'Phí lưu bãi container chỉ thu tại Cổng ra (/exit)';
                        else if (isTicket) forbiddenReason = 'Khoản thu vé xe cổng thuộc phân hệ An ninh';
                      }

                      return (
                        <tr 
                          key={c.id} 
                          className={`hover:bg-[#F8F9FB] transition-colors ${
                            isSelected ? 'bg-[#EAF1FD]' : ''
                          }`}
                        >
                          <td className="px-3.5 py-2.5 text-center">
                            {!isPaid && !isForbidden && !isStorage ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelectCharge(c.id)}
                                className="rounded border-[#E5E9F0] text-[#326DD8] focus:ring-[#326DD8]"
                              />
                            ) : (
                              <span className="text-[#98A2B3]">•</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-xs">
                            {isTicket && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF8FF] text-[#326DD8] border border-[#B2DDFF]">
                                <Truck className="w-3 h-3" /> Vé xe
                              </span>
                            )}
                            {isReefer && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]">
                                <Zap className="w-3 h-3 text-[#B54708]" /> Tiền điện
                              </span>
                            )}
                            {isStorage && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-[#F8F9FB] text-[#667085] border border-[#E5E9F0]">
                                <Clock className="w-3 h-3 text-[#667085]" /> Lưu bãi
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-xs">
                            <p className="font-semibold text-[#17202E]">{c.title}</p>
                            
                            {/* Thông tin đối tượng: Container, Khách hàng, Xe chở vào */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {c.container_no && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#EFF8FF] text-[#326DD8] border border-[#B2DDFF]">
                                  Cont: {c.container_no}
                                </span>
                              )}

                              {c.customer_name && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89]">
                                  Khách: {c.customer_name} {c.customer_phone ? `(${c.customer_phone})` : ''}
                                </span>
                              )}

                              {c.license_plate && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#F5F7FA] text-[#17202E] border border-[#E5E9F0]">
                                  Xe: {c.license_plate}
                                </span>
                              )}
                            </div>

                            {/* Thao tác gom nhanh 1-chạm nếu là cước điện hoặc vé xe chưa thu */}
                            {!isPaid && !isStorage && (
                              <div className="flex items-center gap-2 mt-1.5 pt-1 border-t border-[#E5E9F0]">
                                {c.container_no && (
                                  <button
                                    type="button"
                                    onClick={() => handleSelectAllOfContainer(c.container_no!)}
                                    className="text-[11px] font-medium text-[#326DD8] hover:underline flex items-center gap-1 cursor-pointer"
                                    title={`Tích chọn tất cả các khoản nợ của container ${c.container_no}`}
                                  >
                                    Gom tất cả của cont này
                                  </button>
                                )}
                                {c.customer_name && (
                                  <>
                                    <span className="text-[#E5E9F0] text-[10px]">•</span>
                                    <button
                                      type="button"
                                      onClick={() => handleSelectAllOfCustomer(c.customer_name!)}
                                      className="text-[11px] font-medium text-[#0A9444] hover:underline flex items-center gap-1 cursor-pointer"
                                      title={`Tích chọn tất cả các khoản nợ của khách hàng ${c.customer_name}`}
                                    >
                                      Gom tất cả của khách này
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-bold font-mono text-xs sm:text-sm text-[#17202E]">
                            {c.amount.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="px-3.5 py-2.5">
                            {isPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#ECFDF3] text-[#0A9444] border border-[#A6F4C5]">
                                <CheckCircle2 className="w-3 h-3" /> Đã thu
                              </span>
                            ) : isStorage ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#EFF8FF] text-[#326DD8] border border-[#B2DDFF]">
                                <Clock className="w-3 h-3" /> Chốt tại Cổng ra
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FEF3F2] text-[#D92D20] border border-[#FECDCA]">
                                <AlertTriangle className="w-3 h-3" /> Chưa thu
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-xs text-[#667085] font-mono">
                            {new Date(c.created_at).toLocaleString('vi-VN')}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            {!isPaid ? (
                              isStorage ? (
                                <span
                                  title="Phí lưu bãi container chỉ được chốt và thu trực tiếp tại Cổng ra (/exit) khi xe chở cont rời bãi"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-[#EFF8FF] text-[#326DD8] border border-[#B2DDFF]"
                                >
                                  <Clock className="w-3 h-3 text-[#326DD8]" />
                                  Thu tại Cổng ra
                                </span>
                              ) : isForbidden ? (
                                <span
                                  title={forbiddenReason}
                                  className="text-[11px] text-[#98A2B3] font-medium italic"
                                >
                                  {isTicket ? 'An ninh thu' : 'CCKB thu'}
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenCollect(c)}
                                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-lg shadow-2xs transition-colors cursor-pointer"
                                >
                                  Thu tiền
                                </button>
                              )
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenPrintReceipt(c)}
                                className="px-2.5 py-1 text-xs font-medium text-[#326DD8] bg-[#EFF8FF] hover:bg-[#EAF1FD] border border-[#B2DDFF] rounded-lg inline-flex items-center gap-1 transition-colors cursor-pointer"
                                title="Xem & In phiếu thu tiền / biên lai"
                              >
                                <Printer className="w-3.5 h-3.5 text-[#326DD8]" />
                                <span>In biên lai</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={pageCharges}
              totalItems={filteredCharges.length}
              pageSize={pageSizeCharges}
              onPageChange={setPageCharges}
              onPageSizeChange={setPageSizeCharges}
              itemLabel="khoản thu"
            />
          </div>

          {/* Khối tham khảo: Biểu phí & Quy tắc phân công thu tiền */}
          <details className="group bg-[#F8F9FB] rounded-xl border border-[#E5E9F0] p-4 text-xs">
            <summary className="font-semibold text-[#17202E] cursor-pointer flex items-center justify-between select-none">
              <span className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#326DD8]" />
                <span>Biểu phí dịch vụ bến bãi ban hành ({tariffs.length} mục) & Quy tắc phân công thu tiền</span>
              </span>
              <span className="text-[#667085] text-[11px] group-open:hidden">Nhấn để xem chi tiết ▼</span>
              <span className="text-[#667085] text-[11px] hidden group-open:inline">Thu gọn ▲</span>
            </summary>
            <div className="mt-4 pt-3 border-t border-[#E5E9F0] space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {tariffs.map((tf) => (
                  <div key={tf.id} className="p-2.5 bg-white rounded-lg border border-[#E5E9F0] text-xs">
                    <p className="font-semibold text-[#17202E]">{tf.name}</p>
                    <div className="flex items-center justify-between mt-1 text-[#667085] text-[11px]">
                      <span>{tf.unit}</span>
                      <span className="font-bold font-mono text-[#0A9444]">
                        {tf.amount === 0 ? '0 đ (Miễn phí)' : `${tf.amount.toLocaleString('vi-VN')} đ`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-[#EFF8FF] border border-[#B2DDFF] rounded-lg text-[#17202E] text-xs space-y-1">
                <p className="font-semibold text-[#326DD8]">Quy tắc phân công thu tiền:</p>
                <p>• <b>An ninh:</b> Thu vé cổng & phí lưu bãi phát sinh khi xe rời bãi.</p>
                <p>• <b>CCKB:</b> Quản lý thu tiền điện container & duyệt ngoại lệ nợ.</p>
                <p>• <b>An ninh không thu tiền điện.</b></p>
              </div>
            </div>
          </details>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BÁO CÁO CA TRỰC & BÀN GIAO CA (SHIFT HANDOVER REPORT - RV12) */}
      {/* ========================================================================= */}
      {activeTab === 'SHIFT_REPORT' && (
        <div className="space-y-4">
          {/* Thanh cấu hình & Chọn Ca trực */}
          <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#0A9444]" />
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Bộ lọc Ca trực & Khoảng thời gian Bàn giao
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSelectCurrentShift}
                  className="px-2.5 py-1 text-xs font-bold text-[#0A9444] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Chọn ca hiện tại</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowShiftPrintModal(true)}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5a] rounded shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In Biên bản Bàn giao Ca trực
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Chọn Ngày Báo cáo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày làm việc / Ngày ca trực <span className="text-[11px] font-normal text-slate-500">(dd/MM/yyyy)</span>
                </label>
                <div className="space-y-1">
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full p-1.5 border border-slate-300 rounded text-xs font-mono focus:ring-1 focus:ring-[#223873]"
                  />
                  {reportDate && (
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Định dạng: <strong className="text-slate-800">{formatDate(reportDate)}</strong></span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chọn Ca trực Chuẩn */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ca trực vận hành
                </label>
                <select
                  value={selectedShiftType}
                  onChange={(e) => setSelectedShiftType(e.target.value as ShiftType)}
                  className="w-full p-1.5 border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-[#223873]"
                >
                  <option value="SHIFT_1">Ca 1: 06:00 - 14:00 (Ca sáng 8h)</option>
                  <option value="SHIFT_2">Ca 2: 14:00 - 22:00 (Ca chiều 8h)</option>
                  <option value="SHIFT_3">Ca 3: 22:00 - 06:00 (Ca đêm 8h qua ngày)</option>
                  <option value="SHIFT_12H_DAY">Ca 12 tiếng: 06:00 - 18:00 (Ban ngày)</option>
                  <option value="SHIFT_12H_NIGHT">Ca 12 tiếng: 18:00 - 06:00 (Ban đêm)</option>
                  <option value="CUSTOM">-- Tự chọn khung giờ cụ thể --</option>
                </select>
              </div>

              {/* Lọc Bộ phận Thu */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bộ phận thực thu
                </label>
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value as any)}
                  className="w-full p-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#223873]"
                >
                  <option value="ALL">Tất cả bộ phận (Toàn bãi)</option>
                  <option value="AN_NINH">Bộ phận An ninh Cổng (Vé xe & Lưu bãi)</option>
                  <option value="CCKB">Nghiệp vụ Cổng cảng Kho bãi (Điện Lạnh & Clearance)</option>
                </select>
              </div>
            </div>

            {/* Khung giờ tùy chỉnh nếu chọn CUSTOM */}
            {selectedShiftType === 'CUSTOM' && (
              <div className="p-2.5 bg-slate-50 border border-slate-300 rounded flex items-center gap-4 text-xs animate-in fade-in flex-wrap">
                <span className="font-bold text-slate-700">Khung giờ tùy chỉnh (hh:mm):</span>
                <div className="flex items-center gap-2">
                  <span>Từ:</span>
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    placeholder="hh:mm"
                    className="p-1 border border-slate-300 rounded font-mono text-xs"
                  />
                  {customStartTime && <span className="font-mono text-slate-600 font-bold">({customStartTime})</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span>Đến:</span>
                  <input
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    placeholder="hh:mm"
                    className="p-1 border border-slate-300 rounded font-mono text-xs"
                  />
                  {customEndTime && <span className="font-mono text-slate-600 font-bold">({customEndTime})</span>}
                </div>
              </div>
            )}

            {/* Nhãn ca hiển thị */}
            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#223873]">
              <span className="font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#223873]" />
                Đang đối soát: <strong>{shiftTimeRange.label}</strong>
              </span>
              <span className="text-slate-600 mt-1 sm:mt-0 font-mono text-[11px] font-medium inline-flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-[#223873]" />
                <span>{formatDateTime(shiftTimeRange.startIso)}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span>{formatDateTime(shiftTimeRange.endIso)}</span>
              </span>
            </div>
          </div>

          {/* KPI BÀN GIAO TIỀN MẶT & ĐỐI SOÁT DOANH THU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* TIỀN MẶT BÀN GIAO */}
            <div className="bg-emerald-700 text-white p-3.5 rounded-lg border border-emerald-800 shadow-2xs space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Tiền mặt thực thu bàn giao</span>
                </p>
                <span className="px-1.5 py-0.2 bg-white/20 rounded text-[10px] font-mono font-bold">
                  {shiftSummary.cashCount} phiếu
                </span>
              </div>
              <p className="text-2xl font-bold font-mono">
                {shiftSummary.totalCash.toLocaleString()} đ
              </p>
              <p className="text-[11px] text-emerald-100 border-t border-white/20 pt-1">
                Bàn giao cho ca sau / Nộp két thủ quỹ
              </p>
            </div>

            {/* CHUYỂN KHOẢN NGÂN HÀNG */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-300 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#223873] flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-[#326DD8]" />
                  <span>Chuyển khoản ngân hàng (QR)</span>
                </p>
                <span className="px-1.5 py-0.2 bg-blue-50 text-[#223873] rounded text-[10px] font-mono font-bold border border-blue-200">
                  {shiftSummary.transferCount} phiếu
                </span>
              </div>
              <p className="text-xl font-bold font-mono text-[#223873]">
                {shiftSummary.totalTransfer.toLocaleString()} đ
              </p>
              <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-1">
                Đối chiếu sao kê tài khoản ngân hàng bến bãi
              </p>
            </div>

            {/* TỔNG DOANH THU CA */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-300 shadow-2xs space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                  Tổng doanh thu ca trực
                </p>
                <span className="px-1.5 py-0.2 bg-purple-50 text-purple-700 rounded text-[10px] font-mono font-bold border border-purple-200">
                  {shiftPayments.length} giao dịch
                </span>
              </div>
              <p className="text-xl font-bold font-mono text-purple-800">
                {shiftSummary.totalRevenue.toLocaleString()} đ
              </p>
              <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-1">
                Tiền mặt + Chuyển khoản
              </p>
            </div>

            {/* LƯU LƯỢNG XE & CONTAINER TRONG CA */}
            <div className="bg-white p-3.5 rounded-lg border border-slate-300 shadow-2xs space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                Lưu lượng bến bãi trong ca
              </p>
              <div className="grid grid-cols-3 gap-1 pt-0.5 text-center font-mono">
                <div className="bg-amber-50 p-1.5 rounded border border-amber-200">
                  <p className="text-[10px] text-slate-500 font-sans font-bold">Xe vào</p>
                  <p className="text-sm font-bold text-amber-800">{shiftSummary.inboundVehicles}</p>
                </div>
                <div className="bg-blue-50 p-1.5 rounded border border-blue-200">
                  <p className="text-[10px] text-slate-500 font-sans font-bold">Xe ra</p>
                  <p className="text-sm font-bold text-[#223873]">{shiftSummary.outboundVehicles}</p>
                </div>
                <div className="bg-emerald-50 p-1.5 rounded border border-emerald-200">
                  <p className="text-[10px] text-slate-500 font-sans font-bold">Cắm điện</p>
                  <p className="text-sm font-bold text-[#0A9444]">{shiftSummary.reeferSessionsInShift}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 border-t border-slate-100 pt-1 text-center font-sans">
                Hoạt động bến bãi theo giờ ca
              </p>
            </div>
          </div>

          {/* Phân rã Doanh thu theo Nghiệp vụ V5 */}
          <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#0A9444]" />
              Chi tiết Phân rã Nguồn thu theo Nghiệp vụ trong Ca
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Vé xe vào cổng</span>
                  <span className="font-bold font-mono">{shiftSummary.ticketCount} lượt</span>
                </div>
                <p className="text-base font-bold font-mono text-[#223873]">{shiftSummary.ticketAmount.toLocaleString()} đ</p>
              </div>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Tiền điện Container Lạnh</span>
                  <span className="font-bold font-mono">{shiftSummary.reeferCount} cont</span>
                </div>
                <p className="text-base font-bold font-mono text-amber-800">{shiftSummary.reeferAmount.toLocaleString()} đ</p>
              </div>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Phí lưu bãi Container</span>
                  <span className="font-bold font-mono">{shiftSummary.storageCount} cont</span>
                </div>
                <p className="text-base font-bold font-mono text-purple-800">{shiftSummary.storageAmount.toLocaleString()} đ</p>
              </div>

              <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Phạt mất vé bến bãi</span>
                  <span className="font-bold font-mono">{shiftSummary.penaltyCount} vụ</span>
                </div>
                <p className="text-base font-bold font-mono text-rose-700">{shiftSummary.penaltyAmount.toLocaleString()} đ</p>
              </div>
            </div>
          </div>

          {/* Bảng kê Chi tiết các Chứng từ / Biên lai Thu tiền trong Ca */}
          <div className="bg-white rounded-xl border border-[#E5E9F0] flex-1 flex flex-col min-h-[540px]">
            <div className="p-3 border-b border-[#E5E9F0] bg-[#F8F9FB] flex items-center justify-between">
              <h3 className="text-xs font-semibold text-[#17202E] uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-[#326DD8]" />
                Bảng kê Chứng từ thu tiền trong Ca trực ({shiftPayments.length})
              </h3>
              <div className="flex items-center gap-1.5 text-xs">
                {/* Lọc phương thức thanh toán */}
                {(['ALL', 'CASH', 'TRANSFER'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPayMethodFilter(m)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                      payMethodFilter === m
                        ? 'bg-[#326DD8] text-white border-[#326DD8]'
                        : 'bg-white text-[#667085] border-[#E5E9F0] hover:bg-[#F8F9FB]'
                    }`}
                  >
                    {m === 'ALL' && 'Tất cả'}
                    {m === 'CASH' && 'Tiền mặt'}
                    {m === 'TRANSFER' && 'Chuyển khoản'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto flex-1 min-h-[500px] pb-40">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 border-b border-slate-300 text-[11px] text-slate-700 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5 text-center">STT</th>
                    <th className="px-3 py-2.5">Giờ thu</th>
                    <th className="px-3 py-2.5">Số biên lai</th>
                    <th className="px-3 py-2.5">Đối tượng (Xe / Cont)</th>
                    <th className="px-3.5 py-2.5">Nội dung khoản thu</th>
                    <th className="px-3 py-2.5">Phương thức</th>
                    <th className="px-3.5 py-2.5">Số tiền</th>
                    <th className="px-3 py-2.5">Người thu / Bộ phận</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {shiftPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400 text-xs">
                        Không phát sinh khoản thu nào trong khung giờ ca trực này.
                      </td>
                    </tr>
                  ) : (
                    pagedShiftPayments.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 text-xs transition-colors">
                        <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                          {(pageShiftPayments - 1) * pageSizeShiftPayments + idx + 1}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-slate-700">
                          {new Date(p.collected_at).toLocaleTimeString('vi-VN')}
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-[#223873]">
                          {p.receipt_code || '—'}
                        </td>
                        <td className="px-3 py-2.5">
                          {p.license_plate && <p className="font-mono font-bold text-slate-900">Xe: {p.license_plate}</p>}
                          {p.container_no && <p className="font-mono text-[#223873] font-bold">Cont: {p.container_no}</p>}
                          {!p.license_plate && !p.container_no && <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3.5 py-2.5 text-slate-800 font-medium">
                          {p.charge_title || p.notes || `Khoản thu ${p.charge_type}`}
                        </td>
                        <td className="px-3 py-2.5">
                          {p.payment_method === 'CASH' ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <Banknote className="w-3 h-3 text-emerald-700" />
                              <span>Tiền mặt</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#223873] border border-blue-200">
                              <QrCode className="w-3 h-3 text-[#326DD8]" />
                              <span>Chuyển khoản</span>
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold font-mono text-xs sm:text-sm text-slate-900">
                          {Number(p.payment_amount).toLocaleString()} đ
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          <p className="font-semibold text-slate-800">{p.collected_by_name || 'Nhân viên trực ca'}</p>
                          <p className="text-[10px] text-slate-500">
                            {p.collector_dept === 'AN_NINH' ? 'An ninh Cổng' : 'Nghiệp vụ Cổng cảng Kho bãi'}
                          </p>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={pageShiftPayments}
              totalItems={shiftPayments.length}
              pageSize={pageSizeShiftPayments}
              onPageChange={setPageShiftPayments}
              onPageSizeChange={setPageSizeShiftPayments}
              itemLabel="chứng từ"
            />
          </div>
        </div>
      )}

        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. RIGHT CONTEXT PANEL: CHI TIẾT KHOẢN THU                    */}
      {/* ============================================================== */}
      <RightContextPanel
        isOpen={isInspectorOpen && !!selectedInspectorCharge}
        onClose={() => setIsInspectorOpen(false)}
        title={
          selectedInspectorCharge
            ? `${selectedInspectorCharge.amount.toLocaleString('vi-VN')} đ`
            : 'Chi tiết khoản thu'
        }
        subtitle={
          selectedInspectorCharge?.container_no
            ? `Container: ${selectedInspectorCharge.container_no}`
            : selectedInspectorCharge?.license_plate
            ? `Xe: ${selectedInspectorCharge.license_plate}`
            : selectedInspectorCharge?.title || 'Khoản thu bến bãi'
        }
        headerActions={
          selectedInspectorCharge ? (
            <StatusBadge
              variant={selectedInspectorCharge.status === 'PAID' ? 'success' : 'error'}
              label={selectedInspectorCharge.status === 'PAID' ? 'ĐÃ THU' : 'CHƯA THU'}
            />
          ) : undefined
        }
        footerActions={
          selectedInspectorCharge && selectedInspectorCharge.status === 'UNPAID' && canCollectCharge(selectedInspectorCharge) ? (
            <button
              type="button"
              onClick={() => handleOpenCollect(selectedInspectorCharge)}
              className="w-full py-2 px-3 rounded-lg bg-[#0A9444] text-white text-xs font-semibold hover:bg-[#087C3C] transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>Thu tiền ngay ({selectedInspectorCharge.amount.toLocaleString('vi-VN')} đ)</span>
            </button>
          ) : undefined
        }
      >
        {selectedInspectorCharge && (() => {
          const matchedPay = payments.find(p => p.charge_id === selectedInspectorCharge.id);
          return (
          <div className="space-y-4 text-xs">
            {/* Thông tin biểu phí & chứng từ */}
            <div className="p-3 rounded-lg border border-[#E5E9F0] bg-[#F8F9FB] space-y-2">
              <div className="flex items-center justify-between text-[#667085] text-[11px] font-semibold uppercase tracking-wider">
                <span>Dịch vụ</span>
                <span className="font-mono text-[#17202E] font-bold">
                  {selectedInspectorCharge.charge_type === 'REEFER' ? 'Cước điện' : selectedInspectorCharge.charge_type === 'TICKET' ? 'Vé cổng' : 'Lưu bãi'}
                </span>
              </div>
              <div className="text-sm font-semibold text-[#17202E]">
                {selectedInspectorCharge.title}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E9F0] text-[11px]">
                <div>
                  <span className="text-[#667085]">Số tiền: </span>
                  <span className="font-mono font-bold text-[#0A9444]">
                    {selectedInspectorCharge.amount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div>
                  <span className="text-[#667085]">Đã thu: </span>
                  <span className="font-mono font-semibold text-[#17202E]">
                    {selectedInspectorCharge.paid_amount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
                <div>
                  <span className="text-[#667085]">Hình thức: </span>
                  <span className="font-medium text-[#17202E]">
                    {matchedPay?.payment_method === 'TRANSFER' ? 'Chuyển khoản' : matchedPay?.payment_method === 'CASH' ? 'Tiền mặt' : selectedInspectorCharge.status === 'PAID' ? 'Đã thu' : 'Chưa thu'}
                  </span>
                </div>
                <div>
                  <span className="text-[#667085]">Số biên lai: </span>
                  <span className="font-mono font-medium text-[#17202E]">
                    {matchedPay?.receipt_code || '---'}
                  </span>
                </div>
              </div>
            </div>

            {/* Đối tượng liên quan */}
            {(selectedInspectorCharge.container_no || selectedInspectorCharge.license_plate || selectedInspectorCharge.customer_name) && (
              <div className="p-3 rounded-lg border border-[#E5E9F0] bg-[#F8F9FB] space-y-2">
                <span className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider block">
                  Đối tượng
                </span>
                <div className="space-y-1.5 text-[11px]">
                  {selectedInspectorCharge.container_no && (
                    <div className="flex justify-between">
                      <span className="text-[#667085]">Container:</span>
                      <span className="font-mono font-bold text-[#17202E]">{selectedInspectorCharge.container_no}</span>
                    </div>
                  )}
                  {selectedInspectorCharge.license_plate && (
                    <div className="flex justify-between">
                      <span className="text-[#667085]">Biển số xe:</span>
                      <span className="font-mono font-bold text-[#17202E]">{selectedInspectorCharge.license_plate}</span>
                    </div>
                  )}
                  {selectedInspectorCharge.customer_name && (
                    <div className="flex justify-between">
                      <span className="text-[#667085]">Khách hàng:</span>
                      <span className="font-medium text-[#17202E]">{selectedInspectorCharge.customer_name}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          );
        })()}
      </RightContextPanel>

      {/* ========================================================================= */}
      {/* MODAL THU GỘP NHIỀU KHOẢN PHÍ (BATCH COLLECTION MODAL) */}
      {/* ========================================================================= */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5E9F0] max-w-lg w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 -mx-5 px-5 -mt-1">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#D97706] tracking-wider">Nghiệp vụ Cổng cảng Kho bãi</span>
                <h3 className="text-sm font-bold text-[#17202E] flex items-center gap-2 mt-0.5">
                  <Layers className="w-4 h-4 text-[#D97706]" />
                  Thu Gộp Nhiều Khoản Phí Bến Bãi
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="p-1.5 rounded-lg text-[#667085] hover:text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {batchError && (
              <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D92D20] shrink-0" />
                <span>{batchError}</span>
              </div>
            )}

            {/* Danh sách các khoản được gộp */}
            <div className="border border-[#E5E9F0] rounded-xl overflow-hidden text-xs max-h-56 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-[#F8F9FB] border-b border-[#E5E9F0] text-[#667085] font-semibold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-2.5">Khoản thu</th>
                    <th className="p-2.5">Container</th>
                    <th className="p-2.5">Khách hàng / Xe</th>
                    <th className="p-2.5 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9F0]">
                  {selectedChargesList.map((chg) => (
                    <tr key={chg.id} className="hover:bg-[#F8F9FB] transition-colors">
                      <td className="p-2.5 font-medium text-[#17202E]">{chg.title}</td>
                      <td className="p-2.5 font-mono text-[#344054]">
                        {chg.container_no ? (
                          <span className="font-bold text-[#326DD8] bg-[#EFF8FF] px-2 py-0.5 rounded-md border border-[#B2DDFF]">
                            {chg.container_no}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-2.5 text-[#344054] text-[11px]">
                        <div>{chg.customer_name || 'Khách vãng lai'}</div>
                        {chg.license_plate && <div className="font-mono text-[#667085] font-semibold">Xe: {chg.license_plate}</div>}
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-[#17202E]">
                        {(chg.amount - chg.paid_amount).toLocaleString()} đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3.5 bg-[#F8F9FB] border border-[#E5E9F0] rounded-xl space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#667085] font-semibold uppercase tracking-wider">
                  Tổng số tiền thanh toán gộp ({selectedChargeIds.length} khoản):
                </span>
                <span className="text-lg font-mono font-bold text-[#027A48]">
                  {selectedBatchTotal.toLocaleString()} VNĐ
                </span>
              </div>
              <p className="text-[11px] italic text-[#667085] text-right">
                (Bằng chữ: <strong className="not-italic text-[#17202E]">{formatMoneyInWords(selectedBatchTotal)}</strong>)
              </p>
            </div>

            <form onSubmit={handleConfirmBatchCollect} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Phương thức thanh toán gộp
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchPayMethod('CASH')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                      batchPayMethod === 'CASH'
                        ? 'border-[#027A48] bg-[#ECFDF3] text-[#027A48] shadow-xs'
                        : 'border-[#D0D5DD] text-[#344054] hover:bg-[#F8F9FB]'
                    }`}
                  >
                    Tiền mặt (CASH)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchPayMethod('TRANSFER')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                      batchPayMethod === 'TRANSFER'
                        ? 'border-[#326DD8] bg-[#EFF8FF] text-[#175CD3] shadow-xs'
                        : 'border-[#D0D5DD] text-[#344054] hover:bg-[#F8F9FB]'
                    }`}
                  >
                    Chuyển khoản (TRANSFER)
                  </button>
                </div>
              </div>

              {batchPayMethod === 'TRANSFER' && (
                <div className="p-3.5 bg-[#EFF8FF] border border-[#B2DDFF] rounded-xl flex items-center gap-3">
                  <img
                    src={generateVietQrUrl(selectedBatchTotal, `THU GOP ${batchReceiptCode || 'SON CANG'}`)}
                    alt="VietQR Chuyển khoản"
                    className="w-20 h-20 object-contain bg-white p-1 rounded-lg border border-[#B2DDFF] flex-shrink-0"
                  />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-[#17202E] flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-[#326DD8]" />
                      Mã VietQR Napas 247 Tự Động
                    </p>
                    <p className="text-[#344054] text-[11px]">
                      Quét QR chuyển đúng <span className="font-mono font-bold text-[#175CD3]">{selectedBatchTotal.toLocaleString()} đ</span>
                    </p>
                    <p className="text-[10px] text-[#667085] font-mono">
                      Nội dung CK: <span className="font-bold text-[#17202E]">THU GOP {batchReceiptCode || 'SON CANG'}</span>
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Mã biên lai / Phiếu thu gộp chung
                </label>
                <input
                  type="text"
                  value={batchReceiptCode}
                  onChange={(e) => setBatchReceiptCode(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs font-mono font-bold text-[#17202E] bg-white focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Ghi chú đợt thu gộp
                </label>
                <textarea
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="Ghi chú người nộp, xe xuất bãi, thanh toán cùng lúc..."
                  rows={2}
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs text-[#17202E] bg-white focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] resize-none transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E9F0] -mx-5 px-5 -mb-1">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  disabled={isSubmittingBatch}
                  className="py-2 px-4 text-xs font-semibold text-[#344054] bg-white hover:bg-[#F8F9FB] rounded-lg border border-[#D0D5DD] transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBatch}
                  className="py-2 px-4 text-xs text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-lg font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingBatch ? 'Đang ghi nhận...' : 'Xác nhận Thu Gộp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL THU TIỀN ĐƠN LẺ */}
      {/* ========================================================================= */}
      {showCollectModal && selectedCharge && (
        <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5E9F0] max-w-md w-full p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 -mx-5 px-5 -mt-1">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#0A9444] tracking-wider">Chứng từ Thu phí</span>
                <h3 className="text-sm font-bold text-[#17202E] flex items-center gap-2 mt-0.5">
                  <Receipt className="w-4 h-4 text-[#0A9444]" />
                  Lập Phiếu thu tiền dịch vụ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCollectModal(false)}
                className="p-1.5 rounded-lg text-[#667085] hover:text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {collectError && (
              <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#D92D20] shrink-0" />
                <span>{collectError}</span>
              </div>
            )}

            <div className="bg-[#F8F9FB] border border-[#E5E9F0] p-3.5 rounded-xl space-y-1 text-xs">
              <p><span className="text-[#667085]">Khoản thu:</span> <span className="font-bold text-[#17202E]">{selectedCharge.title}</span></p>
              <p><span className="text-[#667085]">Số tiền cần thu:</span> <span className="font-mono font-bold text-base text-[#027A48]">{(selectedCharge.amount - selectedCharge.paid_amount).toLocaleString()} VNĐ</span></p>
              <p><span className="text-[#667085]">Bộ phận thu:</span> <span className="font-semibold text-[#17202E]">{isSecurityRole ? 'An ninh Cổng' : 'Nghiệp vụ Cổng cảng Kho bãi'}</span></p>
            </div>

            <form onSubmit={handleConfirmCollect} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Phương thức thanh toán
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('CASH')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                      payMethod === 'CASH'
                        ? 'border-[#027A48] bg-[#ECFDF3] text-[#027A48] shadow-xs'
                        : 'border-[#D0D5DD] text-[#344054] hover:bg-[#F8F9FB]'
                    }`}
                  >
                    Tiền mặt (CASH)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('TRANSFER')}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                      payMethod === 'TRANSFER'
                        ? 'border-[#326DD8] bg-[#EFF8FF] text-[#175CD3] shadow-xs'
                        : 'border-[#D0D5DD] text-[#344054] hover:bg-[#F8F9FB]'
                    }`}
                  >
                    Chuyển khoản (TRANSFER)
                  </button>
                </div>
              </div>

              {payMethod === 'TRANSFER' && (
                <div className="p-3.5 bg-[#EFF8FF] border border-[#B2DDFF] rounded-xl flex items-center gap-3">
                  <img
                    src={generateVietQrUrl(
                      selectedCharge.amount - selectedCharge.paid_amount,
                      `THU ${selectedCharge.charge_type} ${selectedCharge.license_plate || selectedCharge.container_no || receiptCode || 'SC'}`
                    )}
                    alt="VietQR Chuyển khoản"
                    className="w-20 h-20 object-contain bg-white p-1 rounded-lg border border-[#B2DDFF] flex-shrink-0"
                  />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-[#17202E] flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-[#326DD8]" />
                      Mã VietQR Napas 247 Tự Động
                    </p>
                    <p className="text-[#344054] text-[11px]">
                      Quét mã chuyển đúng <span className="font-mono font-bold text-[#175CD3]">{(selectedCharge.amount - selectedCharge.paid_amount).toLocaleString()} đ</span>
                    </p>
                    <p className="text-[10px] text-[#667085] font-mono">
                      Nội dung CK: <span className="font-bold text-[#17202E]">THU {selectedCharge.charge_type} {selectedCharge.license_plate || selectedCharge.container_no || ''}</span>
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Mã biên lai / Phiếu thu
                </label>
                <input
                  type="text"
                  value={receiptCode}
                  onChange={(e) => setReceiptCode(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs font-mono font-bold text-[#17202E] bg-white focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Ghi chú phiếu thu
                </label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ghi chú người nộp, số điện thoại hoặc lý do..."
                  rows={2}
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg text-xs text-[#17202E] bg-white focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] resize-none transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E9F0] -mx-5 px-5 -mb-1">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="py-2 px-4 text-xs font-semibold text-[#344054] bg-white hover:bg-[#F8F9FB] rounded-lg border border-[#D0D5DD] transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 text-xs text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-lg font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  Xác nhận Thu tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL IN BIÊN LAI ĐƠN LẺ (MẪU 01-TT/SC) */}
      {/* ========================================================================= */}
      {receiptCharge && (
        <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5E9F0] max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-4 relative print:p-0 print:shadow-none print:max-w-full print:border-none">
            <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-[#17202E] flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-[#0A9444]" />
                Xem trước Biên lai / Phiếu thu tiền dịch vụ
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2 px-3.5 text-xs font-semibold text-white bg-[#326DD8] hover:bg-[#2557B4] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In phiếu ngay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReceiptCharge(null);
                    setReceiptMeta(null);
                  }}
                  className="py-2 px-3.5 text-xs font-semibold text-[#344054] hover:bg-[#F8F9FB] bg-white rounded-lg border border-[#D0D5DD] transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Đóng</span>
                </button>
              </div>
            </div>

            <div className="border border-[#E5E9F0] rounded-xl p-6 sm:p-7 space-y-4 bg-white text-[#17202E] print:border-none print:p-0">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="font-bold text-xs uppercase text-slate-900 tracking-wider">
                    CÔNG TY CỔ PHẦN TÀ LÙNG QUANG MINH
                  </p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    Bến bãi & Cảng cạn Sơn Cảng — Cửa khẩu Quốc tế Tà Lùng
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Huyện Quảng Hòa, Tỉnh Cao Bằng
                  </p>
                </div>
                <div className="text-right sm:self-start">
                  <p className="text-[11px] font-mono text-slate-500 uppercase">Mẫu: 01-TT/SC</p>
                  <p className="text-xs font-bold font-mono text-slate-900">
                    Số: {receiptMeta?.receiptCode || `PT-${receiptCharge.id.slice(-6).toUpperCase()}`}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                    Ngày: {new Date(receiptMeta?.payDate || receiptCharge.created_at).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              <div className="text-center py-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-wide">
                  PHIẾU THU TIỀN DỊCH VỤ
                </h2>
                <p className="text-[11px] italic text-slate-500 mt-0.5">
                  (Liên giao khách hàng / Lưu đối soát chứng từ)
                </p>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-slate-500 sm:w-40 flex-shrink-0 text-xs uppercase font-semibold">Nội dung thu:</span>
                  <span className="font-bold text-slate-900">{receiptCharge.title}</span>
                </div>

                {receiptCharge.license_plate && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                    <span className="text-slate-500 sm:w-40 flex-shrink-0 text-xs uppercase font-semibold">Biển số phương tiện:</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block w-fit">
                      {receiptCharge.license_plate}
                    </span>
                  </div>
                )}

                {receiptCharge.container_no && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                    <span className="text-slate-500 sm:w-40 flex-shrink-0 text-xs uppercase font-semibold">Số Container:</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block w-fit">
                      {receiptCharge.container_no}
                    </span>
                  </div>
                )}

                {receiptCharge.customer_name && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                    <span className="text-slate-500 sm:w-40 flex-shrink-0 text-xs uppercase font-semibold">Khách hàng / Chủ hàng:</span>
                    <span className="font-semibold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block w-fit">
                      {receiptCharge.customer_name} {receiptCharge.customer_phone ? `(${receiptCharge.customer_phone})` : ''}
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-slate-500 sm:w-40 flex-shrink-0 text-xs uppercase font-semibold">Hình thức thanh toán:</span>
                  <span className="font-semibold text-slate-800">
                    {receiptMeta?.payMethod === 'TRANSFER' ? 'Chuyển khoản (QR / CK)' : 'Tiền mặt (CASH)'}
                  </span>
                </div>

                {receiptMeta?.notes && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                    <span className="text-slate-500 sm:w-40 flex-shrink-0 text-xs uppercase font-semibold">Ghi chú:</span>
                    <span className="text-slate-700 italic">{receiptMeta.notes}</span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-3 mt-3">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Tổng số tiền thu:</span>
                    <span className="text-lg sm:text-xl font-mono font-bold text-emerald-700">
                      {receiptCharge.amount.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600 italic">
                    (Bằng chữ: <strong className="text-slate-900 not-italic">{formatMoneyInWords(receiptCharge.amount)}</strong>)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">Người nộp tiền</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký, họ tên)</p>
                  <div className="h-14" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">Người thu tiền / Thủ quỹ</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
                  <div className="h-14 flex items-end justify-center">
                    <p className="font-bold text-slate-700">{receiptMeta?.operatorName || 'Nhân viên thu phí'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-3 text-center text-[10px] text-slate-400">
                Chứng từ điện tử trích xuất từ Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng — Tà Lùng Quang Minh
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL IN BIÊN LAI TỔNG HỢP GỘP NHIỀU KHOẢN (MẪU 01-TT/SC GỘP) */}
      {/* ========================================================================= */}
      {batchReceiptItems && batchReceiptMeta && (
        <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5E9F0] max-w-3xl w-full p-6 sm:p-7 shadow-2xl space-y-5 relative print:p-0 print:shadow-none print:max-w-full print:border-none">
            <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-[#17202E] flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-[#D97706]" />
                Xem trước Phiếu Thu Tiền Tổng Hợp Gộp Nhiều Khoản
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0A9444] hover:bg-[#087a38] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In phiếu ngay
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBatchReceiptItems(null);
                    setBatchReceiptMeta(null);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-[#344054] hover:text-[#17202E] bg-white hover:bg-[#F8F9FB] rounded-lg border border-[#D0D5DD] transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Đóng</span>
                </button>
              </div>
            </div>

            <div className="border border-slate-300 rounded p-6 sm:p-7 space-y-4 bg-white text-slate-900 print:border-none print:p-0">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="font-bold text-xs uppercase text-slate-900 tracking-wider">
                    CÔNG TY CỔ PHẦN TÀ LÙNG QUANG MINH
                  </p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    Bến bãi & Cảng cạn Sơn Cảng — Cửa khẩu Quốc tế Tà Lùng
                  </p>
                </div>
                <div className="text-right sm:self-start">
                  <p className="text-[11px] font-mono text-slate-500 uppercase">Mẫu: 01-TT/SC (Gộp)</p>
                  <p className="text-xs font-bold font-mono text-slate-900">
                    Số: {batchReceiptMeta.receiptCode}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                    Ngày: {new Date(batchReceiptMeta.payDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              <div className="text-center py-1">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-wide">
                  PHIẾU THU TIỀN TỔNG HỢP DỊCH VỤ
                </h2>
                <p className="text-[11px] italic text-slate-500 mt-0.5">
                  (Biên lai thu gộp nhiều khoản phí — Liên giao khách hàng)
                </p>
              </div>

              {/* Bảng chi tiết các khoản đã thu gộp */}
              <div className="border border-slate-300 rounded overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-2 text-center w-8">STT</th>
                      <th className="p-2">Hạng mục dịch vụ</th>
                      <th className="p-2">Số Container</th>
                      <th className="p-2">Khách hàng / Phương tiện</th>
                      <th className="p-2 text-right">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {batchReceiptItems.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="p-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-2 font-semibold text-slate-900">{item.title}</td>
                        <td className="p-2 font-mono text-slate-700">
                          {item.container_no ? (
                            <span className="font-bold text-[#223873]">Cont {item.container_no}</span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="p-2 text-slate-700 text-[11px]">
                          <div>{item.customer_name || 'Khách vãng lai'}</div>
                          {item.license_plate && <div className="font-mono text-slate-500 font-bold">Xe: {item.license_plate}</div>}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-900">
                          {(item.amount - item.paid_amount).toLocaleString()} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t border-slate-300 font-bold">
                    <tr>
                      <td colSpan={4} className="p-2.5 text-right text-slate-700 text-xs uppercase tracking-wider">
                        Tổng tiền đã thanh toán ({batchReceiptItems.length} khoản):
                      </td>
                      <td className="p-2.5 text-right text-sm font-mono font-bold text-emerald-700">
                        {batchReceiptMeta.totalAmount.toLocaleString()} VNĐ
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="space-y-1 text-xs sm:text-sm">
                <p className="text-slate-600 italic">
                  (Bằng chữ: <strong className="text-slate-900 not-italic">{formatMoneyInWords(batchReceiptMeta.totalAmount)}</strong>)
                </p>
                <p className="text-slate-700">
                  Phương thức thanh toán: <strong>{batchReceiptMeta.payMethod === 'TRANSFER' ? 'Chuyển khoản (QR / CK)' : 'Tiền mặt (CASH)'}</strong>
                </p>
                {batchReceiptMeta.notes && (
                  <p className="text-slate-600">
                    Ghi chú: <span className="italic">{batchReceiptMeta.notes}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">Người nộp tiền</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký, họ tên)</p>
                  <div className="h-14" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">Người thu tiền / Thủ quỹ</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
                  <div className="h-14 flex items-end justify-center">
                    <p className="font-bold text-slate-700">{batchReceiptMeta.operatorName}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL IN BIÊN BẢN BÀN GIAO CA TRỰC (MẪU BB-BGC/SC - RV12) */}
      {/* ========================================================================= */}
      {showShiftPrintModal && (
        <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl border border-[#E5E9F0] max-w-3xl w-full p-6 sm:p-7 shadow-2xl space-y-5 relative print:p-0 print:shadow-none print:max-w-full print:border-none">
            <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-[#17202E] flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-[#0A9444]" />
                Xem trước Biên bản Bàn giao Ca trực & Đối soát Doanh thu Bến bãi
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0A9444] hover:bg-[#087a38] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In biên bản ngay
                </button>
                <button
                  type="button"
                  onClick={() => setShowShiftPrintModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#344054] hover:text-[#17202E] bg-white hover:bg-[#F8F9FB] rounded-lg border border-[#D0D5DD] transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Đóng</span>
                </button>
              </div>
            </div>

            {/* Nội dung Biên bản Bàn giao Ca */}
            <div className="border border-slate-300 rounded p-6 sm:p-7 space-y-4 bg-white text-slate-900 print:border-none print:p-0">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-4">
                <div>
                  <p className="font-bold text-xs uppercase text-slate-900 tracking-wider">
                    CÔNG TY CỔ PHẦN TÀ LÙNG QUANG MINH
                  </p>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">
                    Bến bãi & Cảng cạn Sơn Cảng — Cửa khẩu Quốc tế Tà Lùng
                  </p>
                </div>
                <div className="text-right sm:self-start">
                  <p className="text-[11px] font-mono text-slate-500 uppercase">Mẫu: BB-BGC/SC (V5)</p>
                  <p className="text-xs font-bold font-mono text-slate-900">
                    Ngày lập: {currentDateTimeStr ? currentDateTimeStr.split(' ')[1] : reportDate}
                  </p>
                </div>
              </div>

              <div className="text-center py-2">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 uppercase tracking-wide">
                  BIÊN BẢN BÀN GIAO CA TRỰC & ĐỐI SOÁT DOANH THU
                </h2>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  Khung giờ: {shiftTimeRange.label}
                </p>
                <p className="text-[11px] text-slate-500 italic">
                  (Áp dụng bàn giao tiền mặt thực thu và chứng từ giữa 2 ca trực tại Sơn Cảng)
                </p>
              </div>

              {/* Thông tin người giao - nhận ca */}
              <div className="bg-slate-50 p-3 rounded text-xs space-y-2 border border-slate-200 print:bg-transparent">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-500">Đại diện Giao ca:</span>{' '}
                    <strong className="text-slate-900">{user?.email || 'Nhân viên trực ca trước'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Đại diện Nhận ca:</span>{' '}
                    <input
                      type="text"
                      placeholder="Nhập họ tên người nhận ca..."
                      value={handoverReceiver}
                      onChange={(e) => setHandoverReceiver(e.target.value)}
                      className="border-b border-slate-400 bg-transparent px-1 font-bold text-slate-900 print:border-none focus:outline-none"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-slate-500 font-mono text-[11px]">
                  <div>Thời gian chốt sổ: {currentDateTimeStr || reportDate}</div>
                  <div>Bộ phận trực: {deptFilter === 'ALL' ? 'Toàn bãi' : deptFilter === 'AN_NINH' ? 'An ninh Cổng' : 'Nghiệp vụ Cổng cảng Kho bãi'}</div>
                </div>
              </div>

              {/* Bảng tổng hợp số liệu tài chính bàn giao */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase text-slate-800 tracking-wider">
                  I. BẢNG TỔNG HỢP TIỀN THU BÀN GIAO TRONG CA
                </h4>
                <div className="border border-slate-300 rounded overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider border-b border-slate-300">
                      <tr>
                        <th className="p-2.5">Hình thức thanh toán</th>
                        <th className="p-2.5 text-center">Số lượng phiếu</th>
                        <th className="p-2.5 text-right">Tổng số tiền (VNĐ)</th>
                        <th className="p-2.5">Ghi chú đối soát</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      <tr className="bg-emerald-50/40 font-bold">
                        <td className="p-2.5 text-emerald-800">
                          1. Tiền mặt thực tế bàn giao (CASH)
                        </td>
                        <td className="p-2.5 text-center font-mono">{shiftSummary.cashCount}</td>
                        <td className="p-2.5 text-right font-mono text-sm text-emerald-700">
                          {shiftSummary.totalCash.toLocaleString()} đ
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-600 font-normal">
                          Bắt buộc đếm tiền mặt giao nhận tại bốt
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 text-blue-900 font-semibold">
                          2. Chuyển khoản ngân hàng (TRANSFER)
                        </td>
                        <td className="p-2.5 text-center font-mono">{shiftSummary.transferCount}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-blue-900">
                          {shiftSummary.totalTransfer.toLocaleString()} đ
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-500">
                          Đối chiếu sao kê tài khoản ngân hàng bến bãi
                        </td>
                      </tr>
                      <tr className="bg-slate-100 font-bold text-xs">
                        <td className="p-2.5 uppercase tracking-wider text-slate-900">TỔNG DOANH THU CA TRỰC</td>
                        <td className="p-2.5 text-center font-mono">{shiftPayments.length}</td>
                        <td className="p-2.5 text-right font-mono text-slate-900">
                          {shiftSummary.totalRevenue.toLocaleString()} đ
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-500 font-normal">Toàn bộ chứng từ phát sinh</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs italic text-slate-700">
                  Số tiền mặt bàn giao bằng chữ:{' '}
                  <strong className="text-slate-900 not-italic">
                    {formatMoneyInWords(shiftSummary.totalCash)}
                  </strong>
                </div>
              </div>

              {/* Bảng phân loại nguồn thu */}
              <div className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase text-slate-800 tracking-wider">
                  II. PHÂN LOẠI THEO NGUỒN THU NGHIỆP VỤ
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 border border-slate-200 rounded bg-slate-50">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Vé vào cổng:</p>
                    <p className="font-mono font-bold text-slate-900">{shiftSummary.ticketAmount.toLocaleString()} đ ({shiftSummary.ticketCount} lượt)</p>
                  </div>
                  <div className="p-2 border border-slate-200 rounded bg-slate-50">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Tiền điện Container:</p>
                    <p className="font-mono font-bold text-amber-800">{shiftSummary.reeferAmount.toLocaleString()} đ ({shiftSummary.reeferCount} cont)</p>
                  </div>
                  <div className="p-2 border border-slate-200 rounded bg-slate-50">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Phí lưu bãi Container:</p>
                    <p className="font-mono font-bold text-purple-800">{shiftSummary.storageAmount.toLocaleString()} đ ({shiftSummary.storageCount} cont)</p>
                  </div>
                  <div className="p-2 border border-slate-200 rounded bg-slate-50">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Phạt mất vé bến bãi:</p>
                    <p className="font-mono font-bold text-rose-800">{shiftSummary.penaltyAmount.toLocaleString()} đ ({shiftSummary.penaltyCount} vụ)</p>
                  </div>
                </div>
              </div>

              {/* Chữ ký 3 bên */}
              <div className="grid grid-cols-3 gap-2 pt-4 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">Đại diện Giao ca</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
                  <div className="h-14 flex items-end justify-center">
                    <p className="font-bold text-slate-700">{user?.email || 'Người giao'}</p>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">Đại diện Nhận ca</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
                  <div className="h-14 flex items-end justify-center">
                    <p className="font-bold text-slate-700">{handoverReceiver || '............................'}</p>
                  </div>
                </div>
                <div>
                  <p className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">Kế toán / Thủ quỹ</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký xác nhận nộp két)</p>
                  <div className="h-14 flex items-end justify-center">
                    <p className="font-bold text-slate-700">............................</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-3 text-center text-[10px] text-slate-400">
                Biên bản bàn giao tự động từ Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng — Tà Lùng Quang Minh (Mẫu RV12)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
