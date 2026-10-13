'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
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
  QrCode
} from 'lucide-react';
import { formatMoneyInWords, formatDate, formatTime, formatDateTime } from '@/lib/display-formatters';
import { exportChargesToExcel, exportShiftPaymentsToExcel } from '@/lib/export-excel';
import { generateVietQrUrl } from '@/lib/vietqr-generator';

export default function CashierBillingPage() {
  const { user, role, yardId, can, repository } = useAuth();

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
      alert('Chưa được phân quyền: Thao tác thu tiền điện container thuộc thẩm quyền của bộ phận CCKB.');
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
        operatorName: user?.email || (isSecurityRole ? 'Nhân viên An ninh Cổng' : 'Thương vụ CCKB'),
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
      operatorName: user?.email || (isSecurityRole ? 'Nhân viên An ninh Cổng' : 'Thương vụ CCKB'),
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
      alert('Cảnh báo phân quyền: Danh sách chọn có khoản tiền điện Container Lạnh thuộc thẩm quyền thu của Thương vụ CCKB! Vui lòng bỏ chọn khoản điện để tiếp tục thu vé/lưu bãi.');
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
        operatorName: user?.email || (isSecurityRole ? 'Nhân viên An ninh Cổng' : 'Thương vụ CCKB'),
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

  // Lọc danh sách sổ cái theo tìm kiếm và bộ lọc
  const filteredCharges = useMemo(() => {
    return roleScopedCharges.filter((c) => {
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
    });
  }, [roleScopedCharges, searchQuery, typeFilter, statusFilter, contFilter, customerFilter]);

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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <span className={`text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded border inline-block ${
            isCCKBRole 
              ? 'text-amber-800 bg-amber-50 border-amber-300' 
              : isSecurityRole 
              ? 'text-blue-800 bg-blue-50 border-blue-300'
              : 'text-emerald-800 bg-emerald-50 border-emerald-300'
          }`}>
            {isCCKBRole 
              ? 'Thương vụ CCKB — Thu cước điện Container' 
              : isSecurityRole 
              ? 'An ninh Cổng — Thu vé xe & Tra cứu Lưu bãi' 
              : 'Tài chính Bến bãi & Thu ngân Ca trực'}
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            {isCCKBRole ? (
              <>
                <Zap className="w-6 h-6 text-amber-500" />
                Thu phí Cước điện Container Lạnh — Thương vụ CCKB
              </>
            ) : isSecurityRole ? (
              <>
                <Truck className="w-6 h-6 text-[#223873]" />
                Thu phí Vé xe & Tra cứu Phí lưu bãi — An ninh Cổng
              </>
            ) : (
              <>
                <Receipt className="w-6 h-6 text-[#0A9444]" />
                Thu phí, Sổ cái & Báo cáo Ca trực Sơn Cảng
              </>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {isCCKBRole 
              ? 'Chuyên trách thu cước cắm điện container, hỗ trợ gom thu nhiều lần cắm theo container hoặc theo khách hàng'
              : isSecurityRole 
              ? 'Thu vé vào cổng phương tiện. Phí lưu bãi container được chốt và thu trực tiếp tại Cổng ra (/exit)'
              : 'Quản lý toàn bộ các khoản phải thu bến bãi, thu gộp nhiều khoản, đối soát tiền mặt ca trực & in biên bản bàn giao'}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'LEDGER' ? (
            <button
              onClick={() => exportChargesToExcel(filteredCharges)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-900 bg-blue-50 border border-blue-300 rounded hover:bg-blue-100 font-bold shadow-2xs transition-colors cursor-pointer"
              title="Xuất Sổ cái các khoản thu sang file Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất XLSX Sổ cái ({filteredCharges.length})</span>
            </button>
          ) : (
            <button
              onClick={() => exportShiftPaymentsToExcel(shiftPayments, shiftTimeRange.label)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-emerald-900 bg-emerald-50 border border-emerald-300 rounded hover:bg-emerald-100 font-bold shadow-2xs transition-colors cursor-pointer"
              title="Xuất Bảng kê chứng từ ca trực sang file Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất XLSX Ca trực ({shiftPayments.length})</span>
            </button>
          )}

          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Tabs Chuyển đổi Phân hệ */}
      <div className="flex border-b border-slate-300 gap-1">
        <button
          onClick={() => setActiveTab('LEDGER')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'LEDGER'
              ? 'border-[#223873] text-[#223873] bg-blue-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Sổ cái Thu phí & Công nợ Bến bãi</span>
          <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-700 font-mono font-bold border border-slate-300">
            {charges.length}
          </span>
        </button>

        <button
          onClick={() => {
            setActiveTab('SHIFT_REPORT');
            handleSelectCurrentShift();
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
            activeTab === 'SHIFT_REPORT'
              ? 'border-[#0A9444] text-[#0A9444] bg-emerald-50/40'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Báo cáo Ca trực & Bàn giao Ca (Shift Handover)</span>
          <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-[#0A9444] font-mono font-bold border border-emerald-300">
            RV12
          </span>
        </button>
      </div>

      {/* Thông báo thao tác */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-emerald-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg('')} className="text-emerald-700 font-bold hover:underline cursor-pointer">
            Đóng
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SỔ CÁI & THU PHÍ TRỰC TIẾP (LEDGER & BATCH COLLECTION) */}
      {/* ========================================================================= */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-4">
          {/* KPI Tóm tắt tài chính */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white p-3.5 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">
                  {isCCKBRole ? 'Cước điện chưa thu' : isSecurityRole ? 'Vé xe chưa thu' : 'Công nợ / Chưa thanh toán'}
                </p>
                <p className="text-xl font-bold font-mono text-rose-600 mt-0.5">{totalUnpaid.toLocaleString()} đ</p>
              </div>
              <div className="p-2 bg-rose-50 rounded border border-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#0A9444] uppercase tracking-wider">
                  {isCCKBRole ? 'Cước điện đã thực thu' : isSecurityRole ? 'Vé xe đã thực thu' : 'Đã thực thu'}
                </p>
                <p className="text-xl font-bold font-mono text-[#0A9444] mt-0.5">{totalPaid.toLocaleString()} đ</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                <DollarSign className="w-5 h-5 text-[#0A9444]" />
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-between">
              <div>
                {isCCKBRole ? (
                  <>
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Container cắm điện</p>
                    <p className="text-xl font-bold font-mono text-amber-800 mt-0.5">
                      {availableContainers.length} cont <span className="text-xs font-normal text-slate-500">({availableCustomers.length} khách)</span>
                    </p>
                  </>
                ) : isSecurityRole ? (
                  <>
                    <p className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Lịch sử lưu bãi cổng ra</p>
                    <p className="text-xl font-bold font-mono text-purple-800 mt-0.5">
                      {roleScopedCharges
                        .filter(c => c.charge_type === 'STORAGE' && c.status === 'PAID')
                        .reduce((sum, c) => sum + c.paid_amount, 0)
                        .toLocaleString()} đ
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Biểu phí hiệu lực</p>
                    <p className="text-xl font-bold font-mono text-[#223873] mt-0.5">{tariffs.length} mục giá</p>
                  </>
                )}
              </div>
              <div className="p-2 bg-blue-50 rounded border border-blue-200">
                {isCCKBRole ? (
                  <Zap className="w-5 h-5 text-amber-500" />
                ) : isSecurityRole ? (
                  <Clock className="w-5 h-5 text-purple-500" />
                ) : (
                  <Tag className="w-5 h-5 text-[#223873]" />
                )}
              </div>
            </div>
          </div>

          {/* Bộ lọc và Tìm kiếm */}
          <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm cont, khách hàng, biển số xe..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs sm:text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#223873] bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Dropdown lọc theo Container (dành cho CCKB và Admin) */}
              {(isCCKBRole || isAdminRole) && availableContainers.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Cont:</span>
                  <select
                    value={contFilter}
                    onChange={(e) => setContFilter(e.target.value)}
                    className="px-2 py-1 border border-slate-300 rounded text-xs font-mono font-bold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
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
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-500 uppercase">Khách:</span>
                  <select
                    value={customerFilter}
                    onChange={(e) => setCustomerFilter(e.target.value)}
                    className="px-2 py-1 border border-slate-300 rounded text-xs font-semibold text-slate-800 bg-slate-50 focus:bg-white focus:outline-none max-w-[170px] truncate"
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
                      className={`px-2.5 py-1 text-xs font-bold rounded transition-colors border cursor-pointer ${
                        typeFilter === t
                          ? 'bg-[#223873] text-white border-[#223873]'
                          : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
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

              <span className="text-slate-300 hidden sm:inline">|</span>

              {/* Lọc trạng thái */}
              <div className="flex items-center gap-1">
                {(['ALL', 'UNPAID', 'PAID'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 text-xs font-bold rounded transition-colors border cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#0A9444] text-white border-[#0A9444]'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
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
                      <span className="bg-white/15 px-2 py-0.5 rounded text-[11px] font-mono text-amber-200">
                        📦 {selectedBatchConts.length} cont: {selectedBatchConts.join(', ')}
                      </span>
                    )}
                    {selectedBatchCustomers.length > 0 && (
                      <span className="bg-white/15 px-2 py-0.5 rounded text-[11px] text-emerald-200">
                        👤 Khách: {selectedBatchCustomers.join(', ')}
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

          {/* Layout 2 cột: Danh sách khoản thu (trái) và Biểu phí tham khảo V5 (phải) */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Danh sách khoản thu */}
            <div className="lg:col-span-3 bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
              <div className="p-3 border-b border-slate-300 bg-slate-50 flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-[#223873]" />
                  Sổ cái các khoản thu ({filteredCharges.length})
                </h2>
                <div className="text-xs flex items-center gap-2">
                  <button
                    onClick={handleSelectAllUnpaid}
                    className="text-xs text-[#223873] hover:underline font-bold cursor-pointer"
                  >
                    Chọn/Bỏ tất cả khoản chưa thu
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-100 border-b border-slate-300 text-[11px] text-slate-700 uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-3 py-2.5 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            filteredCharges.filter(c => c.status === 'UNPAID' && canCollectCharge(c) && c.charge_type !== 'STORAGE').length > 0 &&
                            filteredCharges.filter(c => c.status === 'UNPAID' && canCollectCharge(c) && c.charge_type !== 'STORAGE').every(c => selectedChargeIds.includes(c.id))
                          }
                          onChange={handleSelectAllUnpaid}
                          className="rounded border-slate-300 text-[#223873] focus:ring-[#223873]"
                          title="Chọn các khoản chưa thu thuộc quyền hạn của bạn"
                        />
                      </th>
                      <th className="px-3 py-2.5">Loại phí</th>
                      <th className="px-3.5 py-2.5">Nội dung / Đối tượng</th>
                      <th className="px-3.5 py-2.5">Số tiền</th>
                      <th className="px-3.5 py-2.5">Trạng thái</th>
                      <th className="px-3.5 py-2.5">Thời gian tạo</th>
                      <th className="px-3.5 py-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredCharges.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                          Không có khoản thu nào phù hợp.
                        </td>
                      </tr>
                    ) : (
                      filteredCharges.map((c) => {
                        const isPaid = c.status === 'PAID';
                        const isReefer = c.charge_type === 'REEFER';
                        const isStorage = c.charge_type === 'STORAGE';
                        const isTicket = c.charge_type === 'TICKET';
                        const isSelected = selectedChargeIds.includes(c.id);

                        const isForbidden = !canCollectCharge(c);
                        let forbiddenReason = '';
                        if (isForbidden) {
                          if (isReefer) forbiddenReason = 'Khoản thu điện lạnh thuộc thẩm quyền Thương vụ CCKB';
                          else if (isStorage) forbiddenReason = 'Phí lưu bãi container chỉ thu tại Cổng ra (/exit)';
                          else if (isTicket) forbiddenReason = 'Khoản thu vé xe cổng thuộc phân hệ An ninh';
                        }

                        return (
                          <tr 
                            key={c.id} 
                            className={`hover:bg-slate-50/80 transition-colors ${
                              isSelected ? 'bg-blue-50/60' : ''
                            }`}
                          >
                            <td className="px-3 py-2.5 text-center">
                              {!isPaid && !isForbidden && !isStorage ? (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleToggleSelectCharge(c.id)}
                                  className="rounded border-slate-300 text-[#223873] focus:ring-[#223873]"
                                />
                              ) : (
                                <span className="text-slate-300">•</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-xs">
                              {isTicket && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#223873] border border-blue-200">
                                  <Truck className="w-3 h-3" /> Vé xe
                                </span>
                              )}
                              {isReefer && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                  <Zap className="w-3 h-3 text-amber-500" /> Tiền điện
                                </span>
                              )}
                              {isStorage && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-300">
                                  <Clock className="w-3 h-3 text-purple-500" /> Lưu bãi
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs">
                              <p className="font-bold text-slate-900">{c.title}</p>
                              
                              {/* Thông tin đối tượng rõ ràng: Container, Khách hàng, Xe chở vào */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                {c.container_no ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-50 text-[#223873] border border-blue-200">
                                    📦 Cont: {c.container_no}
                                  </span>
                                ) : (
                                  isTicket && (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-slate-500 bg-slate-100 border border-slate-200">
                                      Xe lẻ (không cont)
                                    </span>
                                  )
                                )}

                                {c.customer_name && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-300">
                                    👤 Khách: {c.customer_name} {c.customer_phone ? `(${c.customer_phone})` : ''}
                                  </span>
                                )}

                                {c.license_plate && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300">
                                    🚛 Xe: {c.license_plate}
                                  </span>
                                )}
                              </div>

                              {/* Thao tác gom nhanh 1-chạm nếu là cước điện hoặc vé xe chưa thu */}
                              {!isPaid && !isStorage && (
                                <div className="flex items-center gap-2 mt-1.5 pt-1 border-t border-slate-100">
                                  {c.container_no && (
                                    <button
                                      type="button"
                                      onClick={() => handleSelectAllOfContainer(c.container_no!)}
                                      className="text-[11px] font-semibold text-[#223873] hover:text-blue-700 hover:underline flex items-center gap-1 cursor-pointer"
                                      title={`Tích chọn tất cả các khoản nợ của container ${c.container_no}`}
                                    >
                                      ⚡ Gom tất cả của cont này
                                    </button>
                                  )}
                                  {c.customer_name && (
                                    <>
                                      <span className="text-slate-300 text-[10px]">•</span>
                                      <button
                                        type="button"
                                        onClick={() => handleSelectAllOfCustomer(c.customer_name!)}
                                        className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline flex items-center gap-1 cursor-pointer"
                                        title={`Tích chọn tất cả các khoản nợ của khách hàng ${c.customer_name}`}
                                      >
                                        👤 Gom tất cả của khách này
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 font-bold font-mono text-xs sm:text-sm text-slate-900">
                              {c.amount.toLocaleString()} đ
                            </td>
                            <td className="px-3.5 py-2.5">
                              {isPaid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" /> Đã thu
                                </span>
                              ) : isStorage ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  <Clock className="w-3 h-3" /> Chốt tại Cổng ra
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
                                  <AlertTriangle className="w-3 h-3" /> Chưa thu
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-2.5 text-xs text-slate-600 font-mono">
                              {new Date(c.created_at).toLocaleString('vi-VN')}
                            </td>
                            <td className="px-3.5 py-2.5 text-right">
                              {!isPaid ? (
                                isStorage ? (
                                  <span
                                    title="Phí lưu bãi container chỉ được chốt và thu trực tiếp tại Cổng ra (/exit) khi xe chở cont rời bãi"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200"
                                  >
                                    <Clock className="w-3 h-3 text-purple-600" />
                                    Thu tại Cổng ra
                                  </span>
                                ) : isForbidden ? (
                                  <span
                                    title={forbiddenReason}
                                    className="text-[11px] text-slate-400 font-medium italic"
                                  >
                                    {isTicket ? 'An ninh thu' : 'CCKB thu'}
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleOpenCollect(c)}
                                    className="px-3 py-1 text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded shadow-2xs transition-colors cursor-pointer"
                                  >
                                    Thu tiền
                                  </button>
                                )
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPrintReceipt(c)}
                                  className="px-2.5 py-1 text-xs font-bold text-[#223873] bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded inline-flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Xem & In phiếu thu tiền / biên lai"
                                >
                                  <Printer className="w-3.5 h-3.5 text-[#223873]" />
                                  In biên lai
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
            </div>

            {/* Cột phụ: Biểu phí tham khảo V5 */}
            <div className="bg-white rounded-lg border border-slate-300 shadow-2xs p-3.5 space-y-3.5">
              <div className="border-b border-slate-200 pb-2">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-amber-500" />
                  Biểu phí áp dụng
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Biểu phí dịch vụ bến bãi ban hành</p>
              </div>

              <div className="space-y-2">
                {tariffs.map((tf) => (
                  <div key={tf.id} className="p-2 bg-slate-50 rounded border border-slate-200 text-xs">
                    <p className="font-bold text-slate-800">{tf.name}</p>
                    <div className="flex items-center justify-between mt-1 text-slate-500 text-[11px]">
                      <span>{tf.unit}</span>
                      <span className="font-bold font-mono text-[#223873]">
                        {tf.amount === 0 ? '0 đ (Miễn phí)' : `${tf.amount.toLocaleString()} đ`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-amber-900 text-[11px] space-y-1">
                <p className="font-bold">⚠️ Quy tắc phân công thu tiền:</p>
                <p>• <b>An ninh:</b> Thu vé cổng & phí lưu bãi phát sinh khi xe rời bãi.</p>
                <p>• <b>CCKB:</b> Quản lý thu tiền điện container & duyệt ngoại lệ nợ.</p>
                <p>• <b>An ninh không thu tiền điện.</b></p>
              </div>
            </div>
          </div>
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
                  className="px-2.5 py-1 text-xs font-bold text-[#0A9444] bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded transition-colors cursor-pointer"
                >
                  ⏱️ Chọn Ca Hiện Tại
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
                    <div className="text-[11px] text-slate-500 font-mono">
                      📅 Định dạng: <strong className="text-slate-800">{formatDate(reportDate)}</strong>
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
                  <option value="CCKB">Thương vụ CCKB (Điện Lạnh & Clearance)</option>
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
              <span className="text-slate-600 mt-1 sm:mt-0 font-mono text-[11px] font-medium">
                ⏱️ {formatDateTime(shiftTimeRange.startIso)} ➔ {formatDateTime(shiftTimeRange.endIso)}
              </span>
            </div>
          </div>

          {/* KPI BÀN GIAO TIỀN MẶT & ĐỐI SOÁT DOANH THU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* TIỀN MẶT BÀN GIAO */}
            <div className="bg-emerald-700 text-white p-3.5 rounded-lg border border-emerald-800 shadow-2xs space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
                  💵 Tiền mặt thực thu bàn giao
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
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#223873]">
                  📱 Chuyển khoản ngân hàng (QR)
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
          <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
            <div className="p-3 border-b border-slate-300 bg-slate-50 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5" />
                Bảng kê Chứng từ thu tiền trong Ca trực ({shiftPayments.length})
              </h3>
              <div className="flex items-center gap-1.5 text-xs">
                {/* Lọc phương thức thanh toán */}
                {(['ALL', 'CASH', 'TRANSFER'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setPayMethodFilter(m)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
                      payMethodFilter === m
                        ? 'bg-[#223873] text-white border-[#223873]'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    {m === 'ALL' && 'Tất cả'}
                    {m === 'CASH' && 'Tiền mặt'}
                    {m === 'TRANSFER' && 'Chuyển khoản'}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
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
                    shiftPayments.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 text-xs transition-colors">
                        <td className="px-3 py-2.5 text-center font-mono text-slate-400">
                          {idx + 1}
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
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              💵 Tiền mặt
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-[#223873] border border-blue-200">
                              📱 Chuyển khoản
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 font-bold font-mono text-xs sm:text-sm text-slate-900">
                          {Number(p.payment_amount).toLocaleString()} đ
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          <p className="font-semibold text-slate-800">{p.collected_by_name || 'Nhân viên trực ca'}</p>
                          <p className="text-[10px] text-slate-500">
                            {p.collector_dept === 'AN_NINH' ? 'An ninh Cổng' : 'Thương vụ CCKB'}
                          </p>
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
      {/* MODAL THU GỘP NHIỀU KHOẢN PHÍ (BATCH COLLECTION MODAL) */}
      {/* ========================================================================= */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-300 max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                Thu Gộp Nhiều Khoản Phí Bến Bãi
              </h3>
              <button
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {batchError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-700 rounded text-xs">
                {batchError}
              </div>
            )}

            {/* Danh sách các khoản được gộp */}
            <div className="border border-slate-300 rounded overflow-hidden text-xs max-h-56 overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-2">Khoản thu</th>
                    <th className="p-2">Container</th>
                    <th className="p-2">Khách hàng / Xe</th>
                    <th className="p-2 text-right">Số tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedChargesList.map((chg) => (
                    <tr key={chg.id} className="hover:bg-slate-50">
                      <td className="p-2 font-semibold text-slate-900">{chg.title}</td>
                      <td className="p-2 font-mono text-slate-700">
                        {chg.container_no ? (
                          <span className="font-bold text-[#223873] bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                            {chg.container_no}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-2 text-slate-700 text-[11px]">
                        <div>{chg.customer_name || 'Khách vãng lai'}</div>
                        {chg.license_plate && <div className="font-mono text-slate-500 font-bold">Xe: {chg.license_plate}</div>}
                      </td>
                      <td className="p-2 text-right font-mono font-bold text-slate-900">
                        {(chg.amount - chg.paid_amount).toLocaleString()} đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-300 rounded space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-600 font-bold uppercase tracking-wider">
                  Tổng số tiền thanh toán gộp ({selectedChargeIds.length} khoản):
                </span>
                <span className="text-lg font-mono font-bold text-emerald-700">
                  {selectedBatchTotal.toLocaleString()} VNĐ
                </span>
              </div>
              <p className="text-[11px] italic text-slate-600 text-right">
                (Bằng chữ: <strong className="not-italic text-slate-800">{formatMoneyInWords(selectedBatchTotal)}</strong>)
              </p>
            </div>

            <form onSubmit={handleConfirmBatchCollect} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Phương thức thanh toán gộp
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchPayMethod('CASH')}
                    className={`p-2 text-xs font-bold rounded border text-center transition-colors ${
                      batchPayMethod === 'CASH'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Tiền mặt (CASH)
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchPayMethod('TRANSFER')}
                    className={`p-2 text-xs font-bold rounded border text-center transition-colors ${
                      batchPayMethod === 'TRANSFER'
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Chuyển khoản (TRANSFER)
                  </button>
                </div>
              </div>

              {batchPayMethod === 'TRANSFER' && (
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded flex items-center gap-3">
                  <img
                    src={generateVietQrUrl(selectedBatchTotal, `THU GOP ${batchReceiptCode || 'SON CANG'}`)}
                    alt="VietQR Chuyển khoản"
                    className="w-20 h-20 object-contain bg-white p-1 rounded border border-slate-200 flex-shrink-0"
                  />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-slate-900 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      Mã VietQR Napas 247 Tự Động
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      Quét QR chuyển đúng <span className="font-mono font-bold text-blue-800">{selectedBatchTotal.toLocaleString()} đ</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Nội dung CK: <span className="font-bold text-slate-900">THU GOP {batchReceiptCode || 'SON CANG'}</span>
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mã biên lai / Phiếu thu gộp chung
                </label>
                <input
                  type="text"
                  value={batchReceiptCode}
                  onChange={(e) => setBatchReceiptCode(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Ghi chú đợt thu gộp
                </label>
                <textarea
                  value={batchNotes}
                  onChange={(e) => setBatchNotes(e.target.value)}
                  placeholder="Ghi chú người nộp, xe xuất bãi, thanh toán cùng lúc..."
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  disabled={isSubmittingBatch}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded font-semibold border border-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBatch}
                  className="px-3.5 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded font-bold shadow-sm flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-300 max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-600" />
                Lập Phiếu thu tiền dịch vụ
              </h3>
              <button
                onClick={() => setShowCollectModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {collectError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-700 rounded text-xs">
                {collectError}
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-1 text-xs">
              <p><span className="text-slate-500">Khoản thu:</span> <span className="font-bold text-slate-900">{selectedCharge.title}</span></p>
              <p><span className="text-slate-500">Số tiền cần thu:</span> <span className="font-mono font-bold text-base text-emerald-700">{(selectedCharge.amount - selectedCharge.paid_amount).toLocaleString()} VNĐ</span></p>
              <p><span className="text-slate-500">Bộ phận thu:</span> <span className="font-bold text-slate-800">{isSecurityRole ? 'An ninh Cổng' : 'Thương vụ CCKB'}</span></p>
            </div>

            <form onSubmit={handleConfirmCollect} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Phương thức thanh toán
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayMethod('CASH')}
                    className={`p-2 text-xs font-bold rounded border text-center transition-colors ${
                      payMethod === 'CASH'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Tiền mặt (CASH)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('TRANSFER')}
                    className={`p-2 text-xs font-bold rounded border text-center transition-colors ${
                      payMethod === 'TRANSFER'
                        ? 'border-blue-600 bg-blue-50 text-blue-800'
                        : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    Chuyển khoản (TRANSFER)
                  </button>
                </div>
              </div>

              {payMethod === 'TRANSFER' && (
                <div className="p-3 bg-blue-50/50 border border-blue-200 rounded flex items-center gap-3">
                  <img
                    src={generateVietQrUrl(
                      selectedCharge.amount - selectedCharge.paid_amount,
                      `THU ${selectedCharge.charge_type} ${selectedCharge.license_plate || selectedCharge.container_no || receiptCode || 'SC'}`
                    )}
                    alt="VietQR Chuyển khoản"
                    className="w-20 h-20 object-contain bg-white p-1 rounded border border-slate-200 flex-shrink-0"
                  />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-slate-900 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-blue-600" />
                      Mã VietQR Napas 247 Tự Động
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      Quét mã chuyển đúng <span className="font-mono font-bold text-blue-800">{(selectedCharge.amount - selectedCharge.paid_amount).toLocaleString()} đ</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Nội dung CK: <span className="font-bold text-slate-900">THU {selectedCharge.charge_type} {selectedCharge.license_plate || selectedCharge.container_no || ''}</span>
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Mã biên lai / Phiếu thu
                </label>
                <input
                  type="text"
                  value={receiptCode}
                  onChange={(e) => setReceiptCode(e.target.value)}
                  required
                  className="w-full p-2 border border-slate-300 rounded text-xs font-mono font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Ghi chú phiếu thu
                </label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ghi chú người nộp, số điện thoại hoặc lý do..."
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded font-semibold border border-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded font-bold shadow-sm"
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-300 max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 relative print:p-0 print:shadow-none print:max-w-full print:border-none">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-600" />
                Xem trước Biên lai / Phiếu thu tiền dịch vụ
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
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
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors cursor-pointer"
                >
                  ✕ Đóng
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-300 max-w-3xl w-full p-6 sm:p-7 shadow-2xl space-y-5 relative print:p-0 print:shadow-none print:max-w-full print:border-none">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-amber-600" />
                Xem trước Phiếu Thu Tiền Tổng Hợp Gộp Nhiều Khoản
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
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
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors cursor-pointer"
                >
                  ✕ Đóng
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-slate-300 max-w-3xl w-full p-6 sm:p-7 shadow-2xl space-y-5 relative print:p-0 print:shadow-none print:max-w-full print:border-none">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-600" />
                Xem trước Biên bản Bàn giao Ca trực & Đối soát Doanh thu Bến bãi
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In biên bản ngay
                </button>
                <button
                  type="button"
                  onClick={() => setShowShiftPrintModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors cursor-pointer"
                >
                  ✕ Đóng
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
                  <div>Bộ phận trực: {deptFilter === 'ALL' ? 'Toàn bãi' : deptFilter === 'AN_NINH' ? 'An ninh Cổng' : 'Thương vụ CCKB'}</div>
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
