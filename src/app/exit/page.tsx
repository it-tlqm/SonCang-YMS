'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ContainerVisit, VehicleVisit, ReeferPowerSession, ChargeItem, ReeferRequest } from '@/types/domain.types';
import { 
  LogOut, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Lock, 
  Clock, 
  Truck, 
  FileCheck,
  Check,
  Printer,
  Zap,
  DollarSign,
  QrCode,
  CreditCard,
  Download
} from 'lucide-react';
import { getVehicleTypeName, formatMoneyInWords } from '@/lib/display-formatters';
import { generateVietQrUrl } from '@/lib/vietqr-generator';
import { exportExitedVehiclesToExcel } from '@/lib/export-excel';

export default function ExitClearancePage() {
  const { user, role, yardId, can, repository } = useAuth();

  const canExitConfirm = can('exit.actual.confirm');
  const canClearanceIssue = can('exit.clearance.issue');
  const canClearanceRead = can('exit.clearance.read');
  const canCollectTicket = can('ticket.payment.collect');
  const canCollectStorage = can('storage.payment.collect');

  // Active Tab: CCKB Clearance vs An ninh Cổng ra vs Lịch sử đã xuất bãi
  const [activeTab, setActiveTab] = useState<'CLEARANCE' | 'GATE_EXIT' | 'EXITED_HISTORY'>(
    canClearanceIssue && !canExitConfirm ? 'CLEARANCE' : 'GATE_EXIT'
  );

  const [containers, setContainers] = useState<ContainerVisit[]>([]);
  const [vehicles, setVehicles] = useState<VehicleVisit[]>([]);
  const [exitedVehicles, setExitedVehicles] = useState<VehicleVisit[]>([]);
  const [reeferSessions, setReeferSessions] = useState<ReeferPowerSession[]>([]);
  const [reeferRequests, setReeferRequests] = useState<ReeferRequest[]>([]);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showExitQr, setShowExitQr] = useState<boolean>(false);

  // Modal CCKB Duyệt Clearance
  const [showClearanceModal, setShowClearanceModal] = useState<boolean>(false);
  const [selectedCont, setSelectedCont] = useState<ContainerVisit | null>(null);
  const [allowDebt, setAllowDebt] = useState<boolean>(false);
  const [clearanceNotes, setClearanceNotes] = useState<string>('');
  const [clearanceError, setClearanceError] = useState<string>('');

  // Modal An ninh Cổng ra Hợp Nhất Kiểm Soát Theo Xe
  const [showUnifiedExitModal, setShowUnifiedExitModal] = useState<boolean>(false);
  const [selectedVehForExit, setSelectedVehForExit] = useState<VehicleVisit | null>(null);
  const [hasTrailingContainer, setHasTrailingContainer] = useState<boolean>(false);
  const [selectedTrailingContId, setSelectedTrailingContId] = useState<string>('');
  const [trailingContSearch, setTrailingContSearch] = useState<string>('');
  const [exitNotes, setExitNotes] = useState<string>('');
  const [exitError, setExitError] = useState<string>('');
  const [paidAtGate, setPaidAtGate] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [receiptCode, setReceiptCode] = useState<string>('');
  const [isSubmittingExit, setIsSubmittingExit] = useState<boolean>(false);

  // Thu tiền vé vào cổng trực tiếp tại Cổng ra (khi xe vào cổng chưa thanh toán)
  const [collectEntryTicketAtExit, setCollectEntryTicketAtExit] = useState<boolean>(true);
  const [entryTicketPayMethod, setEntryTicketPayMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [entryTicketReceiptCode, setEntryTicketReceiptCode] = useState<string>('');
  const [showEntryTicketQr, setShowEntryTicketQr] = useState<boolean>(false);

  // Modal Thu Vé Cổng Nhanh cho xe chưa thu
  const [quickCollectVeh, setQuickCollectVeh] = useState<VehicleVisit | null>(null);
  const [quickCollectMethod, setQuickCollectMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [quickCollectReceiptCode, setQuickCollectReceiptCode] = useState<string>('');
  const [showQuickCollectQr, setShowQuickCollectQr] = useState<boolean>(false);
  const [isSubmittingQuickCollect, setIsSubmittingQuickCollect] = useState<boolean>(false);
  const [quickCollectError, setQuickCollectError] = useState<string>('');

  // Phí lưu bãi Container tính toán
  const [calculatedStorage, setCalculatedStorage] = useState<{
    totalNights: number;
    chargedNights: number;
    fee: number;
  } | null>(null);
  const [isCalculatingStorage, setIsCalculatingStorage] = useState<boolean>(false);
  const [storageCalcError, setStorageCalcError] = useState<string>('');

  // Phạt mất vé bến bãi (250.000 đ theo mã PHAT_MAT_VE)
  const [isLostTicket, setIsLostTicket] = useState<boolean>(false);

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // Modal In Biên Lai Thu Phí Lưu Bãi Tại Cổng
  const [exitReceipt, setExitReceipt] = useState<{
    receiptCode: string;
    containerNo: string;
    licensePlate: string;
    fee: number;
    penaltyFee?: number;
    entryTicketFee?: number;
    chargedNights: number;
    totalNights: number;
    payMethod: 'CASH' | 'BANK_TRANSFER';
    payDate: string;
    notes?: string;
  } | null>(null);

  // Tải dữ liệu ban đầu
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      repository.getContainers(yardId),
      repository.getVehicles(yardId),
      repository.getReeferSessions(yardId),
      repository.getCharges(yardId),
      repository.getReeferRequests(yardId),
      repository.getExitedVehicles(yardId),
    ])
      .then(([containerList, vehicleList, reeferList, chargeList, requestList, exitedList]) => {
        if (isMounted) {
          setContainers(containerList);
          setVehicles(vehicleList);
          setReeferSessions(reeferList);
          setCharges(chargeList);
          setReeferRequests(requestList);
          setExitedVehicles(exitedList);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải dữ liệu xuất bãi:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [repository, yardId]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    Promise.all([
      repository.getContainers(yardId),
      repository.getVehicles(yardId),
      repository.getReeferSessions(yardId),
      repository.getCharges(yardId),
      repository.getReeferRequests(yardId),
      repository.getExitedVehicles(yardId),
    ])
      .then(([containerList, vehicleList, reeferList, chargeList, requestList, exitedList]) => {
        setContainers(containerList);
        setVehicles(vehicleList);
        setReeferSessions(reeferList);
        setCharges(chargeList);
        setReeferRequests(requestList);
        setExitedVehicles(exitedList);
      })
      .catch((err) => {
        console.error('Lỗi tải dữ liệu xuất bãi:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Tính phí lưu bãi container
  const calculateFeeForContainer = async (inboundAt: string) => {
    setIsCalculatingStorage(true);
    setStorageCalcError('');
    try {
      const calc = await repository.calculateStorageFee(inboundAt);
      setCalculatedStorage(calc);
      setPaidAtGate(calc.fee > 0);
      setPaymentMethod('CASH');
      setReceiptCode('');
    } catch (err: any) {
      console.error('Lỗi tính phí lưu bãi:', err);
      setCalculatedStorage(null);
      setStorageCalcError(err?.message || 'Không thể tính toán phí lưu bãi tự động.');
      setPaidAtGate(false);
    } finally {
      setIsCalculatingStorage(false);
    }
  };

  // Mở modal CCKB Clearance
  const handleOpenClearance = (cont: ContainerVisit) => {
    setSelectedCont(cont);
    setAllowDebt(false);
    setClearanceNotes('');
    setClearanceError('');
    setShowClearanceModal(true);
  };

  const handleConfirmClearance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCont) return;

    // Kiểm tra cước điện còn nợ
    const unpaidPowerForCont = charges
      .filter(ch => ch.container_visit_id === selectedCont.id && ch.charge_type === 'REEFER' && (ch.status === 'UNPAID' || ch.status === 'PARTIALLY_PAID'))
      .reduce((sum, ch) => sum + (ch.amount || 0), 0);

    if (unpaidPowerForCont > 0 && !allowDebt) {
      setClearanceError(`Container còn nợ ${unpaidPowerForCont.toLocaleString('vi-VN')} đ tiền điện! Để đủ điều kiện xuất bãi khi chưa thanh toán, CCKB bắt buộc phải tích chọn "Phê duyệt cho phép bảo lãnh công nợ" và nhập thông tin người bảo lãnh.`);
      return;
    }

    if (allowDebt && (!clearanceNotes.trim() || clearanceNotes.trim().length < 5)) {
      setClearanceError('Duyệt bảo lãnh công nợ bắt buộc phải nhập lý do bảo lãnh cụ thể (tối thiểu 5 ký tự).');
      return;
    }

    const res = await repository.approveClearance({
      containerId: selectedCont.id,
      allowDebt,
      notes: clearanceNotes,
      operatorId: user?.id || 'cckb-operator',
    });

    if (res.error) {
      setClearanceError(res.error);
    } else {
      setShowClearanceModal(false);
      setActionSuccessMsg(`Đã duyệt điều kiện xuất bãi thành công cho container ${selectedCont.container_no_current}${allowDebt ? ' (Xác nhận ghi nợ bảo lãnh)' : ''}`);
      handleManualRefresh();
    }
  };

  // Danh sách container đang trong bãi
  const inYardContainers = containers.filter(c => c.status === 'IN_YARD');
  const inYardVehicles = vehicles.filter(v => v.status === 'IN_YARD');

  // Mở modal Cổng ra Hợp Nhất Kiểm Soát Theo Xe
  const handleOpenUnifiedExit = async (veh: VehicleVisit) => {
    setSelectedVehForExit(veh);
    setExitError('');
    setExitNotes('');
    setIsLostTicket(false);
    setPaidAtGate(false);
    setPaymentMethod('CASH');
    setReceiptCode('');
    setCalculatedStorage(null);
    setStorageCalcError('');
    setShowExitQr(false);
    setShowEntryTicketQr(false);

    // Kiểm tra xe có vé vào cổng chưa thu không
    const isUnpaid = veh.ticket_payment_status === 'UNPAID' && (veh.ticket_amount || 0) > 0;
    setCollectEntryTicketAtExit(isUnpaid);
    setEntryTicketPayMethod('CASH');
    setEntryTicketReceiptCode('');

    // Quy cách phương tiện qua cổng ra:
    const isContVeh = veh.vehicle_type === 'CONT_LANH';
    setHasTrailingContainer(isContVeh);
    setTrailingContSearch('');

    // Tự động tìm container đi kèm lúc vào bãi (nếu còn trong bãi) để không bắt An ninh thao tác thủ công thừa
    const matchedInboundCont = inYardContainers.find(c => c.inbound_vehicle_visit_id === veh.id);
    if (isContVeh && matchedInboundCont) {
      setSelectedTrailingContId(matchedInboundCont.id);
      calculateFeeForContainer(matchedInboundCont.inbound_at);
    } else {
      setSelectedTrailingContId('');
    }

    setShowUnifiedExitModal(true);
  };

  // Thay đổi container kéo ra
  const handleTrailingContChange = async (contId: string) => {
    setSelectedTrailingContId(contId);
    if (!contId) {
      setCalculatedStorage(null);
      return;
    }
    const cont = inYardContainers.find(c => c.id === contId);
    if (cont) {
      await calculateFeeForContainer(cont.inbound_at);
    } else {
      setCalculatedStorage(null);
    }
  };

  // Thay đổi toggle kéo container (khi chuyển qua lại giữa xe lẻ và xe có kéo cont)
  const handleToggleHasTrailingCont = async (hasCont: boolean) => {
    setHasTrailingContainer(hasCont);
    setSelectedTrailingContId('');
    setTrailingContSearch('');
    setCalculatedStorage(null);
  };

  // Container được chọn kéo theo hiện tại
  const activeTrailingCont = hasTrailingContainer 
    ? inYardContainers.find(c => c.id === selectedTrailingContId) 
    : null;

  // Container lúc xe vào cổng (nếu có và còn trong bãi)
  const attachedInboundCont = selectedVehForExit 
    ? inYardContainers.find(c => c.inbound_vehicle_visit_id === selectedVehForExit.id) 
    : null;

  // Kiểm tra cắm điện và công nợ điện của container được chọn
  const isTrailingContPlugged = activeTrailingCont 
    ? reeferSessions.some(s => s.container_visit_id === activeTrailingCont.id && s.power_status === 'PLUGGED')
    : false;

  const unpaidReeferSessions = activeTrailingCont
    ? reeferSessions.filter(s => s.container_visit_id === activeTrailingCont.id && s.power_status === 'UNPLUGGED' && s.payment_status === 'UNPAID')
    : [];

  const totalUnpaidPowerAmount = unpaidReeferSessions.reduce((sum, s) => sum + (s.total_power_amount || 0), 0);

  // Quyết định V5: Container KHÔNG phát sinh cắm điện thì MIỄN DUYỆT CCKB (An ninh được cho xuất trực tiếp)
  const hasTrailingContReefer = activeTrailingCont
    ? reeferSessions.some(s => s.container_visit_id === activeTrailingCont.id) ||
      charges.some(c => c.container_visit_id === activeTrailingCont.id && c.charge_type === 'REEFER')
    : false;

  const isTrailingContCleared = activeTrailingCont
    ? (activeTrailingCont.clearance_status === 'CLEARED' || activeTrailingCont.clearance_status === 'CLEARED_WITH_DEBT')
    : false;

  // Mở modal Thu vé Cổng nhanh cho xe chưa thu vé
  const handleOpenQuickCollectTicket = (veh: VehicleVisit) => {
    setQuickCollectVeh(veh);
    setQuickCollectMethod('CASH');
    setQuickCollectReceiptCode('');
    setShowQuickCollectQr(false);
    setQuickCollectError('');
  };

  const handleConfirmQuickCollectTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCollectVeh) return;

    if (quickCollectMethod === 'BANK_TRANSFER' && !quickCollectReceiptCode.trim()) {
      setQuickCollectError('Hình thức chuyển khoản bắt buộc phải nhập mã biên lai / tham chiếu giao dịch.');
      return;
    }

    setIsSubmittingQuickCollect(true);
    setQuickCollectError('');
    try {
      const res = await repository.collectVehicleEntryTicket({
        vehicleId: quickCollectVeh.id,
        paymentMethod: quickCollectMethod,
        receiptCode: quickCollectReceiptCode.trim() || undefined,
        operatorId: user?.id || 'sec-gate',
      });

      if (res.error) {
        setQuickCollectError(res.error);
        setIsSubmittingQuickCollect(false);
        return;
      }

      setActionSuccessMsg(`Đã thu thành công vé vào cổng ${quickCollectVeh.ticket_amount?.toLocaleString()}đ cho phương tiện ${quickCollectVeh.license_plate || 'xe'}.`);
      setQuickCollectVeh(null);
      handleManualRefresh();
    } catch (err: any) {
      setQuickCollectError('Lỗi xử lý thu vé vào cổng: ' + (err?.message || String(err)));
    } finally {
      setIsSubmittingQuickCollect(false);
    }
  };

  // Xác nhận xuất bãi hợp nhất (Xe hoặc Xe + Container)
  const handleConfirmUnifiedExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehForExit) return;

    setExitError('');
    setIsSubmittingExit(true);

    try {
      // 0. XỬ LÝ THU TIỀN VÉ VÀO CỔNG TẠI CỔNG RA NẾU XE CHƯA THU VÉ VÀ CÓ CHỌN THU
      const hasUnpaidEntryTicket = selectedVehForExit.ticket_payment_status === 'UNPAID' && (selectedVehForExit.ticket_amount || 0) > 0;
      let entryTicketCollectedAmount = 0;

      if (hasUnpaidEntryTicket && collectEntryTicketAtExit) {
        if (entryTicketPayMethod === 'BANK_TRANSFER' && !entryTicketReceiptCode.trim()) {
          setExitError('Hình thức chuyển khoản tiền vé vào cổng bắt buộc phải nhập mã tham chiếu giao dịch / biên lai.');
          setIsSubmittingExit(false);
          return;
        }

        const collectRes = await repository.collectVehicleEntryTicket({
          vehicleId: selectedVehForExit.id,
          paymentMethod: entryTicketPayMethod,
          receiptCode: entryTicketReceiptCode.trim() || undefined,
          operatorId: user?.id || 'sec-gate',
        });

        if (collectRes.error) {
          setExitError('Lỗi thu tiền vé vào cổng: ' + collectRes.error);
          setIsSubmittingExit(false);
          return;
        }

        entryTicketCollectedAmount = selectedVehForExit.ticket_amount || 0;
      }

      // 1. TRƯỜNG HỢP XE RỜI BÃI MỘT MÌNH (KHÔNG KÉO CONTAINER)
      if (!hasTrailingContainer) {
        if (isLostTicket && paymentMethod === 'BANK_TRANSFER' && !receiptCode.trim()) {
          setExitError('Hình thức chuyển khoản tiền phạt bắt buộc phải nhập mã biên lai / tham chiếu giao dịch.');
          setIsSubmittingExit(false);
          return;
        }

        const effectiveNotes = isLostTicket
          ? (exitNotes.trim() ? `${exitNotes.trim()} | Phạt mất liên vé giấy bến bãi (250.000đ)` : 'Phạt mất liên vé giấy bến bãi (250.000đ)')
          : (exitNotes.trim() || undefined);

        const res = await repository.confirmVehicleOnlyExit({
          vehicleId: selectedVehForExit.id,
          notes: effectiveNotes,
          operatorId: user?.id || 'sec-gate',
        });

        if (res.error) {
          setExitError(res.error);
          setIsSubmittingExit(false);
          return;
        }

        // Nếu có phạt mất vé hoặc có thu vé vào cổng tại cổng ra: chuẩn bị dữ liệu mở modal in biên lai
        const totalVehOnlyFee = (isLostTicket ? 250000 : 0) + entryTicketCollectedAmount;
        if (totalVehOnlyFee > 0) {
          const receiptNo = (paymentMethod === 'BANK_TRANSFER' ? receiptCode.trim() : entryTicketReceiptCode.trim()) || `BL-${selectedVehForExit.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`;
          setExitReceipt({
            receiptCode: receiptNo,
            containerNo: 'XE RỜI BÃI (KHÔNG CONT)',
            licensePlate: selectedVehForExit.license_plate || '',
            fee: totalVehOnlyFee,
            penaltyFee: isLostTicket ? 250000 : undefined,
            entryTicketFee: entryTicketCollectedAmount > 0 ? entryTicketCollectedAmount : undefined,
            chargedNights: 0,
            totalNights: 0,
            payMethod: isLostTicket ? paymentMethod : entryTicketPayMethod,
            payDate: new Date().toISOString(),
            notes: effectiveNotes,
          });
        }

        setShowUnifiedExitModal(false);
        const ticketMsg = entryTicketCollectedAmount > 0 ? ` [Đã thu vé cổng: ${entryTicketCollectedAmount.toLocaleString()}đ]` : '';
        const penaltyMsg = isLostTicket ? ' [Đã thu phạt mất vé 250.000đ]' : '';
        setActionSuccessMsg(`Đã xác nhận xe ${selectedVehForExit.license_plate || selectedVehForExit.vehicle_type} rời bãi an toàn qua cổng (không kéo theo container)${ticketMsg}${penaltyMsg}.`);
        handleManualRefresh();
        setIsSubmittingExit(false);
        return;
      }

      // 2. TRƯỜNG HỢP XE CÓ KÉO THEO CONTAINER RA BÃI
      if (!selectedTrailingContId || !activeTrailingCont) {
        setExitError('Vui lòng chọn hoặc tìm container mà phương tiện đang kéo ra bãi trước khi xác nhận.');
        setIsSubmittingExit(false);
        return;
      }

      // Kiểm tra rút điện
      if (isTrailingContPlugged) {
        setExitError('CẢNH BÁO: Container đang cắm điện lạnh trong bãi! Yêu cầu CCKB thực hiện rút điện tại phân hệ Điện Container trước khi cho xe kéo ra cổng.');
        setIsSubmittingExit(false);
        return;
      }

      // Kiểm tra clearance CCKB và thanh toán tiền điện (Chỉ bắt buộc đối với container CÓ phát sinh cắm điện)
      if (hasTrailingContReefer) {
        const unpaidPower = charges
          .filter(c => c.container_visit_id === activeTrailingCont.id && c.charge_type === 'REEFER' && (c.status === 'UNPAID' || c.status === 'PARTIALLY_PAID'))
          .reduce((sum, ch) => sum + (ch.amount || 0), 0);

        if (unpaidPower > 0 && activeTrailingCont.clearance_status !== 'CLEARED_WITH_DEBT') {
          setExitError(
            `CẢNH BÁO CỔNG RA: Container còn nợ ${unpaidPower.toLocaleString('vi-VN')} đ tiền cắm điện chưa thanh toán và CCKB chưa xác nhận duyệt ghi nợ bảo lãnh (CLEARED_WITH_DEBT)! Cổng ra từ chối cho xuất bãi.`
          );
          setIsSubmittingExit(false);
          return;
        }

        if (!isTrailingContCleared) {
          setExitError('Container có phát sinh cắm điện nhưng chưa được Thương vụ CCKB phê duyệt điều kiện xuất bãi (Clearance)! Vui lòng liên hệ CCKB kiểm tra và duyệt trên hệ thống.');
          setIsSubmittingExit(false);
          return;
        }
      }

      // Kiểm tra tính phí lưu bãi
      if (isCalculatingStorage) {
        setExitError('Hệ thống đang tính toán phí lưu bãi container, vui lòng chờ trong giây lát.');
        setIsSubmittingExit(false);
        return;
      }

      if (storageCalcError || !calculatedStorage) {
        setExitError('Chưa xác định được phí lưu bãi do lỗi tính toán. Không thể xuất bãi khi chưa xác định phí lưu bãi!');
        setIsSubmittingExit(false);
        return;
      }

      const fee = calculatedStorage.fee;
      const penaltyFee = isLostTicket ? 250000 : 0;
      const totalContFeeToCollect = fee + penaltyFee;
      const isDebtAllowed = activeTrailingCont.clearance_status === 'CLEARED_WITH_DEBT';

      if (totalContFeeToCollect > 0) {
        if (!paidAtGate && !isDebtAllowed) {
          setExitError('Container phát sinh phí lưu bãi chưa thu. Container không có bảo lãnh công nợ, bắt buộc phải thu phí tại cổng trước khi xuất bãi!');
          setIsSubmittingExit(false);
          return;
        }

        if (paidAtGate) {
          if (!canCollectStorage) {
            setExitError('Tài khoản không có thẩm quyền thu phí tại cổng. Vui lòng chuyển nhân sự An ninh được phân quyền.');
            setIsSubmittingExit(false);
            return;
          }
          if (paymentMethod === 'BANK_TRANSFER' && !receiptCode.trim()) {
            setExitError('Hình thức chuyển khoản bắt buộc phải nhập mã biên lai / tham chiếu giao dịch.');
            setIsSubmittingExit(false);
            return;
          }
        }
      }

      const effectiveNotes = isLostTicket 
        ? (exitNotes ? `${exitNotes} | Phạt mất liên vé bến bãi (250.000đ)` : 'Phạt mất liên vé bến bãi (250.000đ)')
        : exitNotes;

      // Gọi xuất bãi container và liên kết xe kéo
      const res = await repository.confirmPhysicalExit({
        containerId: activeTrailingCont.id,
        outboundVehicleId: selectedVehForExit.id,
        notes: effectiveNotes,
        operatorId: user?.id || 'sec-gate',
        paidAtGate: totalContFeeToCollect > 0 ? paidAtGate : false,
        paymentMethod: totalContFeeToCollect > 0 && paidAtGate ? paymentMethod : undefined,
        receiptCode: totalContFeeToCollect > 0 && paidAtGate ? (receiptCode.trim() || undefined) : undefined,
      });

      if (res.error) {
        setExitError(res.error);
        setIsSubmittingExit(false);
        return;
      }

      // Đồng thời đảm bảo xe này cũng được xuất bãi
      await repository.confirmVehicleOnlyExit({
        vehicleId: selectedVehForExit.id,
        notes: `Kéo container ${activeTrailingCont.container_no_current} xuất bãi`,
        operatorId: user?.id || 'sec-gate',
      });

      // Tự động đóng yêu cầu cắm điện treo (nếu có đăng ký trước nhưng thực tế cont xuất bãi không cắm điện)
      const pendingReq = reeferRequests.find(r => 
        (r.container_no === activeTrailingCont.container_no_current || r.container_visit_id === activeTrailingCont.id) &&
        (r.status === 'PLANNED' || r.status === 'CONTAINER_ARRIVED')
      );
      if (pendingReq) {
        await repository.matchReeferRequest({
          requestId: pendingReq.id,
          status: 'CANCELLED',
        });
      }

      setShowUnifiedExitModal(false);
      const paidContInfo = totalContFeeToCollect > 0 && paidAtGate 
        ? ` | Phí lưu bãi đã thu: ${totalContFeeToCollect.toLocaleString()}đ (${paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}${receiptCode ? ` - BL: ${receiptCode}` : ''}${penaltyFee > 0 ? ' [Gồm phạt mất vé 250k]' : ''})` 
        : (totalContFeeToCollect > 0 ? ` | Xuất bãi ghi nợ phí lưu bãi: ${totalContFeeToCollect.toLocaleString()}đ` : '');
      const ticketInfo = entryTicketCollectedAmount > 0 
        ? ` | Vé vào cổng đã thu: ${entryTicketCollectedAmount.toLocaleString()}đ` 
        : '';

      setActionSuccessMsg(`Xác nhận xuất bãi thành công cho xe ${selectedVehForExit.license_plate} kéo theo container ${activeTrailingCont.container_no_current}.${paidContInfo}${ticketInfo}`);

      const totalActualCollected = (paidAtGate ? totalContFeeToCollect : 0) + entryTicketCollectedAmount;
      if (totalActualCollected > 0) {
        setExitReceipt({
          receiptCode: receiptCode.trim() || entryTicketReceiptCode.trim() || `PLB-${activeTrailingCont.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`,
          containerNo: activeTrailingCont.container_no_current,
          licensePlate: selectedVehForExit.license_plate || '',
          fee: totalActualCollected,
          penaltyFee: penaltyFee > 0 ? penaltyFee : undefined,
          entryTicketFee: entryTicketCollectedAmount > 0 ? entryTicketCollectedAmount : undefined,
          chargedNights: res.chargedNights,
          totalNights: calculatedStorage?.totalNights || res.chargedNights,
          payMethod: paidAtGate ? paymentMethod : entryTicketPayMethod,
          payDate: new Date().toISOString(),
          notes: effectiveNotes,
        });
      }

      handleManualRefresh();
    } catch (err: any) {
      setExitError('Lỗi xử lý xuất bãi: ' + (err?.message || String(err)));
    } finally {
      setIsSubmittingExit(false);
    }
  };

  // Lọc container chờ CCKB duyệt
  const filteredContainers = inYardContainers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.container_no_current.toLowerCase().includes(q) ||
      (c.inbound_license_plate && c.inbound_license_plate.toLowerCase().includes(q))
    );
  });

  // Lọc xe đang trong bãi cho An ninh
  const filteredVehicles = inYardVehicles.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      (v.license_plate && v.license_plate.toLowerCase().includes(q)) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(q)) ||
      (v.ticket_code && v.ticket_code.toLowerCase().includes(q)) ||
      (v.vehicle_type && v.vehicle_type.toLowerCase().includes(q))
    );
  });

  const reeferContainers = inYardContainers.filter(c => 
    reeferSessions.some(s => s.container_visit_id === c.id) ||
    charges.some(ch => ch.container_visit_id === c.id && ch.charge_type === 'REEFER')
  );
  const reeferPendingCount = reeferContainers.filter(c => !c.clearance_status || c.clearance_status === 'PENDING').length;
  const noReeferCount = inYardContainers.length - reeferContainers.length;
  const clearedCount = inYardContainers.filter(c => c.clearance_status === 'CLEARED' || c.clearance_status === 'CLEARED_WITH_DEBT').length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-200">
              Kiểm soát Xuất bãi
            </span>
            <span className="text-xs font-semibold text-slate-500">Bốt Cổng ra & Thương vụ CCKB</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2 mt-1">
            <LogOut className="w-6 h-6 text-[#0A9444]" />
            Cổng ra & Kiểm soát Xuất bãi Sơn Cảng
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Quy trình kiểm soát xuất bãi theo xe: An ninh xác nhận xe rời bãi, đối soát container kéo ra, tiền điện & phí lưu bãi
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 font-bold cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới dữ liệu
          </button>
        </div>
      </div>

      {/* Thông báo thao tác */}
      {actionSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded flex items-center justify-between text-emerald-900 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg('')} className="text-emerald-800 font-bold hover:underline cursor-pointer">
            Đóng
          </button>
        </div>
      )}

      {/* Tabs Chuyển đổi nghiệp vụ */}
      <div className="flex items-center gap-2 border-b border-slate-300 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('GATE_EXIT')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded font-bold text-xs transition-colors cursor-pointer border ${
            activeTab === 'GATE_EXIT'
              ? 'bg-[#0A9444] text-white border-[#0A9444] shadow-2xs'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>An ninh Cổng ra: Xe đang trong bãi ({inYardVehicles.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('CLEARANCE')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded font-bold text-xs transition-colors cursor-pointer border ${
            activeTab === 'CLEARANCE'
              ? 'bg-[#223873] text-white border-[#223873] shadow-2xs'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Thương vụ CCKB: Duyệt cont cắm điện ({reeferPendingCount} chờ duyệt / {reeferContainers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EXITED_HISTORY')}
          className={`flex items-center gap-2 px-3.5 py-2 rounded font-bold text-xs transition-colors cursor-pointer border ${
            activeTab === 'EXITED_HISTORY'
              ? 'bg-slate-800 text-white border-slate-800 shadow-2xs'
              : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Lịch sử Xe đã xuất bãi ({exitedVehicles.length})</span>
        </button>
      </div>

      {/* KPI Tóm tắt */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Xe trong bãi</p>
            <p className="text-xl font-bold font-mono text-slate-900 mt-0.5">{inYardVehicles.length} <span className="text-xs font-sans font-normal text-slate-500">lượt xe</span></p>
          </div>
          <div className="p-2.5 bg-slate-100 rounded border border-slate-200">
            <Truck className="w-5 h-5 text-slate-700" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Container tồn bãi</p>
            <p className="text-xl font-bold font-mono text-[#223873] mt-0.5">{inYardContainers.length} <span className="text-xs font-sans font-normal text-slate-500">cont</span></p>
          </div>
          <div className="p-2.5 bg-blue-50 rounded border border-blue-200">
            <Truck className="w-5 h-5 text-[#223873]" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Cont đã duyệt xuất</p>
            <p className="text-xl font-bold font-mono text-[#0A9444] mt-0.5">{clearedCount} <span className="text-xs font-sans font-normal text-slate-500">cont</span></p>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 text-[#0A9444]" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Chờ CCKB duyệt điện</p>
            <p className="text-xl font-bold font-mono text-amber-700 mt-0.5">{reeferPendingCount} <span className="text-xs font-sans font-normal text-slate-500">cont</span></p>
            <p className="text-[10px] text-emerald-700 font-bold mt-0.5">({noReeferCount} cont không cắm: Miễn duyệt)</p>
          </div>
          <div className="p-2.5 bg-amber-50 rounded border border-amber-200">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
        </div>
      </div>

      {/* Thanh tìm kiếm */}
      <div className="bg-white p-3 rounded-lg border border-slate-300 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'GATE_EXIT' ? "Tìm theo biển số xe, tài xế, mã vé..." : "Tìm theo số container, biển số xe..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-slate-500 focus:border-slate-500 font-mono"
          />
        </div>
        <div className="text-[11px] font-bold text-slate-600">
          {activeTab === 'GATE_EXIT' 
            ? `Hiển thị ${filteredVehicles.length}/${inYardVehicles.length} phương tiện`
            : `Hiển thị ${filteredContainers.length}/${inYardContainers.length} container`}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: AN NINH CỔNG RA VẬT LÝ — KIỂM SOÁT XUẤT BÃI THEO TỪNG XE          */}
      {/* ========================================================================= */}
      {activeTab === 'GATE_EXIT' && (
        <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
          <div className="p-3 border-b border-slate-300 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0A9444]" />
              An ninh Cổng ra: Phương tiện đang trong bãi
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              Kiểm soát theo xe: Xác nhận xe rời bãi, đối soát cont kéo ra, tiền điện & phí lưu bãi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-300 text-[11px] text-slate-700 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Biển số xe / Mã vé</th>
                  <th className="px-3 py-2.5">Loại phương tiện</th>
                  <th className="px-3 py-2.5">Thời gian vào bãi</th>
                  <th className="px-3 py-2.5">Tài xế / SĐT</th>
                  <th className="px-3 py-2.5">Vé vào cổng</th>
                  <th className="px-3 py-2.5">Container liên kết</th>
                  <th className="px-3 py-2.5">Điều kiện xuất bãi</th>
                  <th className="px-3 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      Không có phương tiện nào đang ở trong bãi phù hợp với tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((v) => {
                    const inDate = new Date(v.entry_at);
                    const attachedCont = inYardContainers.find(c => c.inbound_vehicle_visit_id === v.id);

                    // Kiểm tra trạng thái cắm điện của container đi kèm
                    const isContPlugged = attachedCont 
                      ? reeferSessions.some(s => s.container_visit_id === attachedCont.id && s.power_status === 'PLUGGED')
                      : false;

                    const isAttachedContReefer = attachedCont 
                      ? (reeferSessions.some(s => s.container_visit_id === attachedCont.id) || charges.some(c => c.container_visit_id === attachedCont.id && c.charge_type === 'REEFER'))
                      : false;

                    const isClearanceOk = !attachedCont || !isAttachedContReefer || attachedCont.clearance_status === 'CLEARED' || attachedCont.clearance_status === 'CLEARED_WITH_DEBT';
                    const isTicketOk = v.ticket_payment_status === 'PAID' || v.ticket_payment_status === 'EXEMPT';
                    const isPowerOk = !isContPlugged;
                    const isReadyForExit = isTicketOk && isPowerOk && isClearanceOk;

                    return (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="font-mono font-bold text-slate-900 tracking-tight text-sm">{v.license_plate || 'Không biển số'}</div>
                          {v.ticket_code && (
                            <div className="text-[11px] text-slate-500 font-mono">Vé: {v.ticket_code}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold border border-slate-200">
                            {getVehicleTypeName(v.vehicle_type_name || v.vehicle_type)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 font-mono">
                          {inDate.toLocaleTimeString('vi-VN')} {inDate.toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          <div className="font-semibold text-slate-800">{v.driver_name || 'Chưa cập nhật'}</div>
                          <div className="text-slate-500 font-mono text-[11px]">{v.driver_phone || ''}</div>
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          {v.ticket_payment_status === 'PAID' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300">
                              <Check className="w-3 h-3" /> Đã thu ({v.ticket_amount?.toLocaleString() || 0}đ)
                            </span>
                          )}
                          {v.ticket_payment_status === 'EXEMPT' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-blue-50 text-blue-800 border border-blue-300">
                              <Check className="w-3 h-3" /> Miễn phí (0đ)
                            </span>
                          )}
                          {v.ticket_payment_status === 'UNPAID' && (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-amber-50 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" /> Chưa thu ({v.ticket_amount?.toLocaleString() || 0}đ)
                              </span>
                              {canCollectTicket && (v.ticket_amount || 0) > 0 && (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenQuickCollectTicket(v)}
                                    className="px-2 py-0.5 rounded text-[10px] font-bold text-white bg-amber-600 hover:bg-amber-700 flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                  >
                                    <CreditCard className="w-3 h-3" />
                                    <span>Thu vé ngay</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          {attachedCont ? (
                            (() => {
                              return (
                                <div className="space-y-1">
                                  <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                                    <span>{attachedCont.container_no_current}</span>
                                    <span className="text-[10px] px-1 py-0.5 bg-slate-100 rounded text-slate-600 font-sans font-semibold border border-slate-200">
                                      {attachedCont.container_type || 'RF'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {isContPlugged ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300 animate-pulse">
                                        <Zap className="w-3 h-3 fill-rose-500 text-rose-500" /> Đang cắm điện
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-500 font-medium">Đã rút điện/Chưa cắm</span>
                                    )}
                                    {!isAttachedContReefer ? (
                                      <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                                        ✓ Không cắm điện (Miễn duyệt)
                                      </span>
                                    ) : (
                                      <>
                                        {attachedCont.clearance_status === 'CLEARED' && (
                                          <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-300">
                                            ✓ Đã duyệt
                                          </span>
                                        )}
                                        {attachedCont.clearance_status === 'CLEARED_WITH_DEBT' && (
                                          <span className="text-[10px] text-amber-800 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300">
                                            Duyệt nợ
                                          </span>
                                        )}
                                        {(!attachedCont.clearance_status || attachedCont.clearance_status === 'PENDING') && (
                                          <span className="text-[10px] text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-300 font-semibold">
                                            Chờ CCKB duyệt
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              );
                            })()
                          ) : (
                            <span className="text-slate-400 italic">Không mang cont</span>
                          )}
                        </td>
                        {/* Cột Điều kiện xuất bãi trực quan */}
                        <td className="px-3 py-2.5 text-xs">
                          <div className="space-y-1">
                            {isReadyForExit ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                                <CheckCircle2 className="w-3 h-3 text-[#0A9444]" />
                                <span>Sẵn sàng xuất bãi</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Chưa đủ điều kiện</span>
                              </span>
                            )}
                            <div className="flex items-center gap-1 flex-wrap text-[10px]">
                              <span className={`px-1.5 py-0.2 rounded font-medium border ${
                                isTicketOk ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                              }`}>
                                Vé: {isTicketOk ? '✓' : 'Chưa thu'}
                              </span>
                              {attachedCont && (
                                <span className={`px-1.5 py-0.2 rounded font-medium border ${
                                  !isContPlugged ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200 font-bold animate-pulse'
                                }`}>
                                  Điện: {!isContPlugged ? '✓' : '⚡Cắm'}
                                </span>
                              )}
                              {attachedCont && isAttachedContReefer && (
                                <span className={`px-1.5 py-0.2 rounded font-medium border ${
                                  isClearanceOk ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200 font-bold'
                                }`}>
                                  CCKB: {isClearanceOk ? '✓' : 'Chờ'}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {canExitConfirm ? (
                            <button
                              onClick={() => handleOpenUnifiedExit(v)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Kiểm soát xuất bãi</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Chờ An ninh</span>
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: THƯƠNG VỤ CCKB DUYỆT ĐIỀU KIỆN XUẤT BÃI (CLEARANCE)               */}
      {/* ========================================================================= */}
      {activeTab === 'CLEARANCE' && (
        <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
          <div className="p-3 border-b border-slate-300 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#223873]" />
              Thương vụ CCKB: Kiểm soát tài chính & Duyệt xuất bãi Container
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              Kiểm tra cước điện lạnh, công nợ, duyệt bảo lãnh trước khi container ra cổng
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-300 text-[11px] text-slate-700 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">Số Container</th>
                  <th className="px-3 py-2.5">Loại / Hàng</th>
                  <th className="px-3 py-2.5">Thời gian vào bãi</th>
                  <th className="px-3 py-2.5">Điều kiện xuất bãi</th>
                  <th className="px-3 py-2.5">Phí lưu bãi tạm tính</th>
                  <th className="px-3 py-2.5 text-right">Thao tác CCKB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredContainers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Không có container nào đang ở trong bãi phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredContainers.map((c) => {
                    const inDate = new Date(c.inbound_at);
                    const now = new Date();
                    const daysDiff = Math.max(0, Math.floor((now.getTime() - inDate.getTime()) / (1000 * 3600 * 24)));
                    const chargedNights = Math.max(0, daysDiff - 1);
                    const estFee = chargedNights * 50000;
                    const isCleared = c.clearance_status === 'CLEARED' || c.clearance_status === 'CLEARED_WITH_DEBT';

                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5">
                          <div className="font-mono font-bold text-slate-900 tracking-tight text-sm">{c.container_no_current}</div>
                          {c.inbound_license_plate && (
                            <div className="text-[11px] text-slate-500 font-mono">Xe vào: {c.inbound_license_plate}</div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border border-slate-200 mr-1 text-[10px]">
                            {c.container_type || 'RF'}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[10px] border ${
                            c.cargo_status === 'HANG' 
                              ? 'bg-amber-50 text-amber-800 border-amber-300' 
                              : c.cargo_status === 'RONG'
                              ? 'bg-blue-50 text-blue-800 border-blue-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {c.cargo_status === 'HANG' ? 'HÀNG' : c.cargo_status === 'RONG' ? 'RỖNG' : 'CHƯA RÕ'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 font-mono">
                          {inDate.toLocaleTimeString('vi-VN')} {inDate.toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          {(() => {
                            const isContReefer = reeferSessions.some(s => s.container_visit_id === c.id) ||
                              charges.some(ch => ch.container_visit_id === c.id && ch.charge_type === 'REEFER');
                            if (!isContReefer) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" /> Không cắm điện (Miễn duyệt)
                                </span>
                              );
                            }
                            if (c.clearance_status === 'CLEARED') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3" /> Đã duyệt (Đủ ĐK)
                                </span>
                              );
                            }
                            if (c.clearance_status === 'CLEARED_WITH_DEBT') {
                              return (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-amber-50 text-amber-800 border border-amber-300" title={c.clearance_notes || ''}>
                                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Duyệt công nợ
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-amber-50 text-amber-800 border border-amber-300">
                                <Clock className="w-3 h-3 text-amber-600" /> Chờ CCKB duyệt
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          <span className="font-mono font-bold text-slate-800">
                            {estFee === 0 ? '0 đ (Đêm đầu miễn)' : `${estFee.toLocaleString('vi-VN')} đ (${chargedNights} đêm)`}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {(() => {
                            const isContReefer = reeferSessions.some(s => s.container_visit_id === c.id) ||
                              charges.some(ch => ch.container_visit_id === c.id && ch.charge_type === 'REEFER');
                            if (!isContReefer) {
                              return (
                                <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                                  Miễn duyệt CCKB
                                </span>
                              );
                            }
                            if (!isCleared) {
                              return canClearanceIssue ? (
                                <button
                                  onClick={() => handleOpenClearance(c)}
                                  className="px-2.5 py-1 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5b] rounded shadow-2xs transition-colors cursor-pointer"
                                >
                                  Duyệt xuất bãi
                                </button>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Chờ CCKB duyệt</span>
                              );
                            }
                            return <span className="text-xs text-emerald-800 font-bold">✓ Đã duyệt</span>;
                          })()}
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

      {/* ========================================================================= */}
      {/* TAB 3: LỊCH SỬ PHƯƠNG TIỆN ĐÃ XUẤT BÃI TRONG NGÀY                         */}
      {/* ========================================================================= */}
      {activeTab === 'EXITED_HISTORY' && (
        <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
          <div className="p-3 border-b border-slate-300 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600" />
                Lịch sử Phương tiện đã rời bãi qua Cổng ra
              </h2>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Tra cứu đối soát lượt xe đã hoàn tất thủ tục xuất bãi, thời gian lưu bãi và in lại biên lai
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-800 rounded border border-emerald-300">
                Tổng cộng: {exitedVehicles.length} lượt xe
              </span>
              <button
                type="button"
                onClick={() => exportExitedVehiclesToExcel(exitedVehicles)}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-blue-900 bg-blue-50 border border-blue-300 rounded font-bold hover:bg-blue-100 transition-colors cursor-pointer shadow-2xs"
                title="Xuất Báo cáo Lịch sử xe xuất bãi sang file Excel (.xlsx)"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất XLSX ({exitedVehicles.length})</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 border-b border-slate-300 text-[11px] text-slate-700 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-3 py-2.5">STT</th>
                  <th className="px-3 py-2.5">Biển số xe / Loại xe</th>
                  <th className="px-3 py-2.5">Thời gian vào bãi</th>
                  <th className="px-3 py-2.5">Thời gian xuất bãi</th>
                  <th className="px-3 py-2.5">Vé vào cổng</th>
                  <th className="px-3 py-2.5">Cán bộ xác nhận</th>
                  <th className="px-3 py-2.5">Ghi chú xuất bãi</th>
                  <th className="px-3 py-2.5 text-right">Tác vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {exitedVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-xs text-slate-400">
                      Chưa có phương tiện nào xuất bãi trong ca trực này.
                    </td>
                  </tr>
                ) : (
                  exitedVehicles.map((v, idx) => {
                    const inDate = new Date(v.entry_at);
                    const outDate = v.exit_at ? new Date(v.exit_at) : null;
                    const durationMins = outDate 
                      ? Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / (60 * 1000))) 
                      : 0;
                    const durationDisplay = durationMins < 60 
                      ? `${durationMins} phút` 
                      : `${Math.floor(durationMins / 60)}h ${durationMins % 60}p`;

                    return (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-3 py-2.5 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-3 py-2.5">
                          <div className="font-mono font-bold text-sm text-slate-900 tracking-tight">{v.license_plate}</div>
                          <div className="text-[11px] text-slate-500">{getVehicleTypeName(v.vehicle_type_name || v.vehicle_type)}</div>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 font-mono">
                          {inDate.toLocaleTimeString('vi-VN')} {inDate.toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-emerald-800 font-mono font-semibold">
                          {outDate ? `${outDate.toLocaleTimeString('vi-VN')} ${outDate.toLocaleDateString('vi-VN')}` : '—'}
                          <div className="text-[10px] text-slate-500 font-normal">Đã đỗ: {durationDisplay}</div>
                        </td>
                        <td className="px-3 py-2.5 text-xs">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] border ${
                            v.ticket_payment_status === 'PAID' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                              : v.ticket_payment_status === 'EXEMPT' 
                              ? 'bg-blue-50 text-blue-800 border-blue-300' 
                              : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            {v.ticket_payment_status === 'PAID' 
                              ? `Đã thu (${v.ticket_amount?.toLocaleString() || 0}đ)` 
                              : v.ticket_payment_status === 'EXEMPT' 
                              ? 'Miễn phí' 
                              : `Chưa thu (${v.ticket_amount?.toLocaleString() || 0}đ)`}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-700">
                          {v.entry_by_name || (v as any).collected_by_name || 'An ninh Cổng'}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600 max-w-xs truncate" title={v.note || undefined}>
                          {v.note || '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <button
                            onClick={() => {
                              const receiptNo = `PLB-${v.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`;
                              setExitReceipt({
                                receiptCode: receiptNo,
                                containerNo: 'XE ĐÃ RỜI BÃI',
                                licensePlate: v.license_plate || '',
                                fee: v.ticket_amount || 0,
                                chargedNights: 0,
                                totalNights: 0,
                                payMethod: ((v as any).payment_method as any) || 'CASH',
                                payDate: v.exit_at || new Date().toISOString(),
                                notes: v.note || 'Biên lai lưu trữ đối soát',
                              });
                            }}
                            className="px-2 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 flex items-center gap-1 cursor-pointer ml-auto shadow-2xs"
                            title="In lại biên lai / phiếu xác nhận xuất bãi"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-600" />
                            <span>In phiếu</span>
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

      {/* ========================================================================= */}
      {/* MODAL HỢP NHẤT: AN NINH KIỂM SOÁT XUẤT BÃI PHƯƠNG TIỆN & CONTAINER       */}
      {/* ========================================================================= */}
      {showUnifiedExitModal && selectedVehForExit && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-4 sm:p-5 shadow-2xl space-y-3.5 my-auto border border-slate-300">
            {/* HEADER GỘP THÔNG TIN XE CÔNG THÁI HỌC CAO */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-2.5">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    <LogOut className="w-4 h-4 text-[#0A9444]" />
                    Xuất bãi phương tiện
                  </span>
                  <span className="font-mono font-bold text-base bg-[#223873] text-white px-2 py-0.5 rounded shadow-2xs">
                    {selectedVehForExit.license_plate || 'Không biển'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                  <span className="font-medium text-slate-700">
                    {getVehicleTypeName(selectedVehForExit.vehicle_type_name || selectedVehForExit.vehicle_type)}
                  </span>
                  <span>•</span>
                  <span className="font-mono">
                    Vào: {new Date(selectedVehForExit.entry_at).toLocaleTimeString('vi-VN')} {new Date(selectedVehForExit.entry_at).toLocaleDateString('vi-VN')}
                  </span>
                  <span>•</span>
                  <span className={`px-1.5 py-0.2 rounded font-bold text-[10px] border ${
                    selectedVehForExit.ticket_payment_status === 'PAID' 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                      : selectedVehForExit.ticket_payment_status === 'EXEMPT' 
                      ? 'bg-blue-50 text-blue-800 border-blue-300' 
                      : 'bg-amber-50 text-amber-800 border-amber-300'
                  }`}>
                    Vé cổng: {selectedVehForExit.ticket_payment_status === 'PAID' ? 'Đã thu' : selectedVehForExit.ticket_payment_status === 'EXEMPT' ? 'Miễn phí' : 'Chưa thu'}
                  </span>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowUnifiedExitModal(false)} 
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer p-0.5"
              >
                ✕
              </button>
            </div>

            {exitError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 rounded text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{exitError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmUnifiedExit} className="space-y-3">
              {/* CHECKLIST 4 ĐIỀU KIỆN XUẤT BÃI (DẠNG 4 PILLS NGANG SIÊU GỌN) */}
              {(() => {
                const modalTicketOk = selectedVehForExit.ticket_payment_status === 'PAID' || selectedVehForExit.ticket_payment_status === 'EXEMPT' || (collectEntryTicketAtExit && selectedVehForExit.ticket_payment_status === 'UNPAID');
                const modalPowerOk = !hasTrailingContainer || !isTrailingContPlugged;
                const modalClearanceOk = !hasTrailingContainer || !hasTrailingContReefer || isTrailingContCleared;
                const modalStorageOk = !hasTrailingContainer || !calculatedStorage || calculatedStorage.fee === 0 || paidAtGate;

                return (
                  <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                    <div className={`p-1.5 rounded border text-center ${modalTicketOk ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-300 text-rose-800 font-bold'}`}>
                      <div className="text-[10px] text-slate-500">1. Vé cổng</div>
                      <div className="font-bold truncate mt-0.5">{modalTicketOk ? '✓ Đã thu' : '⚠️ Chưa thu'}</div>
                    </div>
                    <div className={`p-1.5 rounded border text-center ${modalPowerOk ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-100 border-rose-400 text-rose-900 font-bold animate-pulse'}`}>
                      <div className="text-[10px] text-slate-500">2. Điện lạnh</div>
                      <div className="font-bold truncate mt-0.5">{!hasTrailingContainer ? '✓ Không cont' : !isTrailingContPlugged ? '✓ Đã ngắt' : '🚨 Đang cắm'}</div>
                    </div>
                    <div className={`p-1.5 rounded border text-center ${modalClearanceOk ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-300 text-amber-900 font-bold'}`}>
                      <div className="text-[10px] text-slate-500">3. CCKB</div>
                      <div className="font-bold truncate mt-0.5">{!hasTrailingContainer || !hasTrailingContReefer ? '✓ Miễn duyệt' : isTrailingContCleared ? '✓ Đã duyệt' : '⏳ Chờ duyệt'}</div>
                    </div>
                    <div className={`p-1.5 rounded border text-center ${modalStorageOk ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-300 text-amber-900 font-bold'}`}>
                      <div className="text-[10px] text-slate-500">4. Lưu bãi</div>
                      <div className="font-bold truncate mt-0.5">{!hasTrailingContainer || !calculatedStorage || calculatedStorage.fee === 0 ? '✓ 0đ' : paidAtGate ? '⚡ Thu cổng' : '⚠️ Chưa thu'}</div>
                    </div>
                  </div>
                );
              })()}

              {/* THU VÉ CỔNG TẠI BỐT RA NẾU CHƯA THU VÉ */}
              {selectedVehForExit.ticket_payment_status === 'UNPAID' && (selectedVehForExit.ticket_amount || 0) > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 font-bold text-amber-950 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={collectEntryTicketAtExit}
                        onChange={(e) => setCollectEntryTicketAtExit(e.target.checked)}
                        className="w-4 h-4 text-[#0A9444] rounded border-slate-300"
                      />
                      <span>Thu vé vào cổng: {(selectedVehForExit.ticket_amount || 0).toLocaleString('vi-VN')} đ</span>
                    </label>
                  </div>
                  {collectEntryTicketAtExit && (
                    <div className="flex items-center gap-3 pt-1 border-t border-amber-200">
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="entryTicketPayMethod"
                          value="CASH"
                          checked={entryTicketPayMethod === 'CASH'}
                          onChange={() => setEntryTicketPayMethod('CASH')}
                          className="text-[#0A9444]"
                        />
                        <span>Tiền mặt</span>
                      </label>
                      <label className="flex items-center space-x-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="entryTicketPayMethod"
                          value="BANK_TRANSFER"
                          checked={entryTicketPayMethod === 'BANK_TRANSFER'}
                          onChange={() => setEntryTicketPayMethod('BANK_TRANSFER')}
                          className="text-[#0A9444]"
                        />
                        <span>Chuyển khoản</span>
                      </label>
                      {entryTicketPayMethod === 'BANK_TRANSFER' && (
                        <input
                          type="text"
                          value={entryTicketReceiptCode}
                          onChange={(e) => setEntryTicketReceiptCode(e.target.value)}
                          placeholder="Mã tham chiếu CK..."
                          className="w-36 px-2 py-0.5 border border-slate-300 rounded text-xs font-mono"
                          required
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* QUY CÁCH PHƯƠNG TIỆN XUẤT BÃI (DẠNG 2 NÚT TAB NGANG NHỎ GỌN) */}
              {(selectedVehForExit.vehicle_type === 'CONT_LANH' || selectedVehForExit.vehicle_type === 'DAU_KEO') && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleHasTrailingCont(true)}
                      className={`flex-1 py-1.5 px-3 rounded text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        hasTrailingContainer
                          ? 'bg-[#0A9444] text-white border-[#0A9444] shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Xe có kéo Container</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleHasTrailingCont(false)}
                      className={`flex-1 py-1.5 px-3 rounded text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                        !hasTrailingContainer
                          ? 'bg-[#223873] text-white border-[#223873] shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Xe không cont (Xe lẻ)</span>
                    </button>
                  </div>

                  {/* KHI CHỌN XE CÓ KÉO CONTAINER */}
                  {hasTrailingContainer && (
                    <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded space-y-2 text-xs animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">
                          Container kéo ra:
                        </span>
                        {selectedTrailingContId ? (
                          <button
                            type="button"
                            onClick={() => handleTrailingContChange('')}
                            className="text-[11px] font-bold text-blue-700 hover:underline cursor-pointer"
                          >
                            Đổi cont khác
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">({inYardContainers.length} cont trong bãi)</span>
                        )}
                      </div>

                      {/* Khi đã chọn cont: Hiển thị thanh ngắn gọn, tinh tế */}
                      {selectedTrailingContId && activeTrailingCont ? (
                        <div className="p-2 bg-white rounded border border-blue-300 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#0A9444] shrink-0" />
                            <div>
                              <span className="font-mono font-bold text-sm text-[#223873]">
                                {activeTrailingCont.container_no_current}
                              </span>
                              <span className="text-[11px] text-slate-500 ml-2">
                                (Vào: {new Date(activeTrailingCont.inbound_at).toLocaleTimeString('vi-VN')} {new Date(activeTrailingCont.inbound_at).toLocaleDateString('vi-VN')})
                              </span>
                            </div>
                          </div>
                          {attachedInboundCont?.id === activeTrailingCont.id && (
                            <span className="text-[10px] bg-emerald-100 text-[#0A9444] font-bold px-1.5 py-0.5 rounded border border-emerald-300">
                              Khớp cont lúc vào
                            </span>
                          )}
                        </div>
                      ) : (
                        /* Khi chưa chọn cont: Gõ lọc hoặc chọn trực tiếp */
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={trailingContSearch}
                            onChange={(e) => setTrailingContSearch(e.target.value)}
                            placeholder="🔍 Gõ nhanh số container để lọc..."
                            className="w-full px-2.5 py-1 border border-slate-300 rounded text-xs font-mono"
                          />
                          <select
                            value={selectedTrailingContId}
                            onChange={(e) => handleTrailingContChange(e.target.value)}
                            className="w-full p-1.5 border border-amber-400 ring-1 ring-amber-300 rounded text-xs font-mono font-bold bg-white"
                          >
                            <option value="">-- Bấm chọn Container kéo ra --</option>
                            {inYardContainers
                              .filter(c => {
                                if (!trailingContSearch.trim()) return true;
                                const q = trailingContSearch.toLowerCase();
                                return c.container_no_current.toLowerCase().includes(q) || (c.inbound_license_plate && c.inbound_license_plate.toLowerCase().includes(q));
                              })
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.container_no_current} ({c.container_type || 'RF'} - Vào: {new Date(c.inbound_at).toLocaleTimeString('vi-VN')} {new Date(c.inbound_at).toLocaleDateString('vi-VN')})
                                </option>
                              ))}
                          </select>
                        </div>
                      )}

                      {/* Trạng thái & Tài chính Container */}
                      {activeTrailingCont && (
                        <div className="space-y-1.5 pt-0.5">
                          {isTrailingContPlugged && (
                            <div className="p-2 rounded bg-rose-50 border border-rose-300 text-rose-900 flex items-center gap-2 font-bold animate-bounce">
                              <Zap className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>⚠️ CONTAINER ĐANG CẮM ĐIỆN! Bắt buộc rút điện trước khi ra bãi!</span>
                            </div>
                          )}

                          {hasTrailingContReefer && !isTrailingContCleared && (
                            <div className="p-2 rounded bg-amber-50 border border-amber-300 text-amber-900 flex items-center gap-2">
                              <FileCheck className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>Chờ CCKB phê duyệt điều kiện xuất bãi (Clearance).</span>
                            </div>
                          )}

                          {/* Phí lưu bãi Container */}
                          {calculatedStorage && (
                            <div className="p-2 bg-white rounded border border-slate-200 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600">
                                  Phí lưu bãi ({calculatedStorage.totalNights} đêm):
                                </span>
                                <span className="font-mono font-bold text-slate-900">
                                  {calculatedStorage.fee.toLocaleString('vi-VN')} đ
                                </span>
                              </div>

                              {/* Tùy chọn phạt mất vé */}
                              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                                <label className="flex items-center space-x-1.5 text-rose-700 font-semibold cursor-pointer text-[11px]">
                                  <input
                                    type="checkbox"
                                    checked={isLostTicket}
                                    onChange={(e) => setIsLostTicket(e.target.checked)}
                                    className="w-3.5 h-3.5 text-rose-600 rounded border-slate-300"
                                  />
                                  <span>Phạt mất liên vé giấy bến bãi (+250.000 đ)</span>
                                </label>
                                {isLostTicket && <span className="font-mono font-bold text-rose-600 text-[11px]">250.000 đ</span>}
                              </div>

                              {/* Thu tiền tại cổng */}
                              {(calculatedStorage.fee > 0 || isLostTicket) && (
                                <div className="pt-1.5 border-t border-slate-100 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <label className="flex items-center space-x-1.5 font-bold text-[#0A9444] cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={paidAtGate}
                                        onChange={(e) => setPaidAtGate(e.target.checked)}
                                        className="w-4 h-4 text-[#0A9444] rounded border-slate-300"
                                      />
                                      <span>Thu tiền tại Cổng ra:</span>
                                    </label>
                                    <span className="font-mono font-bold text-sm text-[#0A9444]">
                                      {(calculatedStorage.fee + (isLostTicket ? 250000 : 0)).toLocaleString('vi-VN')} đ
                                    </span>
                                  </div>

                                  {paidAtGate && (
                                    <div className="flex items-center gap-3 pt-1">
                                      <label className="flex items-center space-x-1 cursor-pointer">
                                        <input
                                          type="radio"
                                          name="unifiedPaymentMethod"
                                          value="CASH"
                                          checked={paymentMethod === 'CASH'}
                                          onChange={() => setPaymentMethod('CASH')}
                                          className="text-[#0A9444]"
                                        />
                                        <span>Tiền mặt</span>
                                      </label>
                                      <label className="flex items-center space-x-1 cursor-pointer">
                                        <input
                                          type="radio"
                                          name="unifiedPaymentMethod"
                                          value="BANK_TRANSFER"
                                          checked={paymentMethod === 'BANK_TRANSFER'}
                                          onChange={() => setPaymentMethod('BANK_TRANSFER')}
                                          className="text-[#0A9444]"
                                        />
                                        <span>Chuyển khoản</span>
                                      </label>
                                      {paymentMethod === 'BANK_TRANSFER' && (
                                        <input
                                          type="text"
                                          value={receiptCode}
                                          onChange={(e) => setReceiptCode(e.target.value)}
                                          placeholder="Mã tham chiếu CK..."
                                          className="w-36 px-2 py-0.5 border border-slate-300 rounded text-xs font-mono"
                                          required
                                        />
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TÙY CHỌN PHẠT MẤT VÉ CHO XE LẺ (NẾU KHÔNG KÉO CONT) */}
              {!hasTrailingContainer && (
                <div className="p-2 bg-amber-50/80 border border-amber-200 rounded text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 text-rose-700 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isLostTicket}
                        onChange={(e) => {
                          setIsLostTicket(e.target.checked);
                          if (e.target.checked) setPaidAtGate(true);
                        }}
                        className="w-4 h-4 text-rose-600 rounded border-slate-300"
                      />
                      <span>Báo mất liên vé giấy vào cổng (Phạt 250.000 đ)</span>
                    </label>
                    {isLostTicket && <span className="font-mono font-bold text-rose-600">250.000 đ</span>}
                  </div>
                  {isLostTicket && (
                    <div className="flex items-center gap-3 pt-1 border-t border-amber-200">
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="vehicleOnlyPaymentMethod"
                          value="CASH"
                          checked={paymentMethod === 'CASH'}
                          onChange={() => setPaymentMethod('CASH')}
                          className="text-[#0A9444]"
                        />
                        <span>Tiền mặt</span>
                      </label>
                      <label className="flex items-center space-x-1 cursor-pointer">
                        <input
                          type="radio"
                          name="vehicleOnlyPaymentMethod"
                          value="BANK_TRANSFER"
                          checked={paymentMethod === 'BANK_TRANSFER'}
                          onChange={() => setPaymentMethod('BANK_TRANSFER')}
                          className="text-[#0A9444]"
                        />
                        <span>Chuyển khoản</span>
                      </label>
                      {paymentMethod === 'BANK_TRANSFER' && (
                        <input
                          type="text"
                          value={receiptCode}
                          onChange={(e) => setReceiptCode(e.target.value)}
                          placeholder="Mã tham chiếu CK..."
                          className="w-36 px-2 py-0.5 border border-slate-300 rounded text-xs font-mono"
                          required
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* GHI CHÚ XUẤT BÃI 1 DÒNG GỌN GÀNG */}
              <div>
                <input
                  type="text"
                  value={exitNotes}
                  onChange={(e) => setExitNotes(e.target.value)}
                  placeholder="Ghi chú xuất bãi (Tùy chọn, tình trạng xe khi ra cổng)..."
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-slate-500 focus:outline-none"
                />
              </div>

              {/* NÚT THAO TÁC */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUnifiedExitModal(false)}
                  disabled={isSubmittingExit}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer border border-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingExit || (hasTrailingContainer && (!selectedTrailingContId || isTrailingContPlugged))}
                  className={`px-4 py-1.5 text-xs font-bold text-white rounded shadow-2xs transition-colors flex items-center gap-1.5 ${
                    isSubmittingExit || (hasTrailingContainer && (!selectedTrailingContId || isTrailingContPlugged))
                      ? 'bg-slate-400 cursor-not-allowed opacity-60'
                      : 'bg-[#0A9444] hover:bg-[#087C3C] cursor-pointer'
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                  <span>
                    {isSubmittingExit 
                      ? 'Đang xử lý...' 
                      : hasTrailingContainer 
                      ? (!selectedTrailingContId ? 'Chưa chọn Cont kéo ra' : 'Xác nhận Xe & Cont Xuất bãi') 
                      : 'Xác nhận Xe rời bãi'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL CCKB DUYỆT CLEARANCE                                                */}
      {/* ========================================================================= */}
      {showClearanceModal && selectedCont && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-xl space-y-3.5 border border-slate-300">
            <div className="flex items-center justify-between border-b border-slate-300 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#223873]" />
                CCKB Duyệt Điều Kiện Xuất Bãi
              </h3>
              <button onClick={() => setShowClearanceModal(false)} className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer">
                ✕
              </button>
            </div>

            {clearanceError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 rounded text-xs font-semibold">
                {clearanceError}
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-1.5 text-xs">
              <p><span className="text-slate-500">Container:</span> <span className="font-mono font-bold text-slate-900">{selectedCont.container_no_current}</span></p>
              <p><span className="text-slate-500">Quy cách vỏ:</span> <span className="font-semibold">{selectedCont.container_type || 'RF'}</span></p>
              <p><span className="text-slate-500">Trạng thái hàng:</span> <span className="font-semibold">{selectedCont.cargo_status === 'HANG' ? 'Có hàng' : 'Vỏ rỗng'}</span></p>
              <p><span className="text-slate-500">Thời gian vào bãi:</span> <span className="text-slate-700 font-mono">{new Date(selectedCont.inbound_at).toLocaleString('vi-VN')}</span></p>
            </div>

            {/* Chi tiết cước cắm điện container */}
            {(() => {
              const contCharges = charges.filter(ch => ch.container_visit_id === selectedCont.id && ch.charge_type === 'REEFER');
              const unpaidPower = contCharges.filter(ch => ch.status === 'UNPAID' || ch.status === 'PARTIALLY_PAID').reduce((sum, ch) => sum + (ch.amount || 0), 0);
              const paidPower = contCharges.filter(ch => ch.status === 'PAID').reduce((sum, ch) => sum + (ch.amount || 0), 0);
              const hasReefer = contCharges.length > 0 || reeferSessions.some(s => s.container_visit_id === selectedCont.id);

              if (!hasReefer) {
                return (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                    ℹ️ Container không có phát sinh cắm điện trong bãi.
                  </div>
                );
              }

              if (unpaidPower === 0) {
                return (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-900 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Cước điện: Đã thanh toán đầy đủ (0 đ nợ)</span>
                    </div>
                    {paidPower > 0 && (
                      <div className="text-[11px] text-emerald-800">
                        Tổng tiền điện đã thu: <strong className="font-mono">{paidPower.toLocaleString('vi-VN')} đ</strong>. Đủ điều kiện duyệt xuất bãi bình thường.
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div className="p-2.5 bg-rose-50 border border-rose-300 rounded text-xs text-rose-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-rose-800">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Container CHƯA thanh toán tiền điện!</span>
                  </div>
                  <div className="text-[11px] text-rose-800">
                    Tiền cắm điện còn nợ: <strong className="font-mono text-sm text-rose-950 font-bold">{unpaidPower.toLocaleString('vi-VN')} đ</strong>
                  </div>
                  <p className="text-[10px] text-rose-700 italic leading-relaxed">
                    * Bắt buộc: Để cho xe kéo cont này ra bãi khi chưa thanh toán cước điện, CCKB phải tích chọn &quot;Phê duyệt cho phép bảo lãnh công nợ&quot; bên dưới và ghi rõ người bảo lãnh.
                  </p>
                </div>
              );
            })()}

            <form onSubmit={handleConfirmClearance} className="space-y-3.5">
              <div className="p-3 bg-amber-50 border border-amber-300 rounded space-y-1.5">
                <label className="flex items-center space-x-2 text-xs font-bold text-amber-950 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDebt}
                    onChange={(e) => setAllowDebt(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500"
                  />
                  <span>Phê duyệt cho phép bảo lãnh công nợ (Xuất bãi nợ cước)</span>
                </label>
                {allowDebt && (
                  <p className="text-[11px] text-amber-800 italic">
                    * Yêu cầu nhập lý do cụ thể và thông tin người bảo lãnh để kiểm toán tài chính.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú phê duyệt CCKB {allowDebt && <span className="text-rose-500">*</span>}
                </label>
                <textarea
                  value={clearanceNotes}
                  onChange={(e) => setClearanceNotes(e.target.value)}
                  placeholder={allowDebt ? "Bắt buộc nhập lý do bảo lãnh nợ, văn bản đồng ý..." : "Ghi chú thêm về điều kiện xuất bãi..."}
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-slate-500"
                  required={allowDebt}
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowClearanceModal(false)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer border border-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5a] rounded shadow-2xs cursor-pointer"
                >
                  Xác nhận duyệt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL IN BIÊN LAI THU PHÍ LƯU BÃI CONTAINER (MẪU 02-PLB/SC)             */}
      {/* ========================================================================= */}
      {exitReceipt && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-5 relative border border-slate-300 print:p-0 print:shadow-none print:max-w-full">
            <div className="flex items-center justify-between border-b border-slate-300 pb-3 print:hidden">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider">
                <Printer className="w-4 h-4 text-[#0A9444]" />
                Biên lai thu Phí lưu bãi Container tại cổng ra
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5a] rounded shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In phiếu ngay
                </button>
                <button
                  type="button"
                  onClick={() => setExitReceipt(null)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 transition-colors cursor-pointer"
                >
                  ✕ Đóng
                </button>
              </div>
            </div>

            <div className="border border-slate-300 rounded p-5 sm:p-6 space-y-4 bg-white text-slate-900 print:border-none print:p-0">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-200 pb-3">
                <div>
                  <p className="font-bold text-xs uppercase text-[#223873] tracking-wider">
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
                  <p className="text-[11px] font-mono text-slate-500 uppercase">Mẫu: 02-PLB/SC</p>
                  <p className="text-xs font-bold font-mono text-slate-900">
                    Số: {exitReceipt.receiptCode}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Ngày: {new Date(exitReceipt.payDate).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>

              <div className="text-center py-1">
                <h2 className="text-lg sm:text-xl font-bold text-[#223873] uppercase tracking-wide">
                  BIÊN LAI THU PHÍ LƯU BÃI CONTAINER
                </h2>
                <p className="text-xs italic text-slate-500 mt-0.5">
                  (Thu trực tiếp tại Cổng ra Sơn Cảng — Liên giao khách hàng)
                </p>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-slate-500 sm:w-40 flex-shrink-0 font-medium">Số Container:</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block w-fit">
                    {exitReceipt.containerNo}
                  </span>
                </div>

                {exitReceipt.licensePlate && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                    <span className="text-slate-500 sm:w-40 flex-shrink-0 font-medium">Xe chở ra cổng:</span>
                    <span className="font-mono font-bold text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 inline-block w-fit">
                      {exitReceipt.licensePlate}
                    </span>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-slate-500 sm:w-40 flex-shrink-0 font-medium">Thời gian lưu bãi:</span>
                  <span className="font-semibold text-slate-800">
                    Tổng cộng {exitReceipt.totalNights} đêm (Miễn phí 1 đêm đầu, tính phí {exitReceipt.chargedNights} đêm)
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  <span className="text-slate-500 sm:w-40 flex-shrink-0 font-medium">Hình thức thanh toán:</span>
                  <span className="font-semibold text-slate-800">
                    {exitReceipt.payMethod === 'BANK_TRANSFER' ? '📱 Chuyển khoản ngân hàng (QR / CK)' : '💵 Tiền mặt'}
                  </span>
                </div>

                {exitReceipt.entryTicketFee && exitReceipt.entryTicketFee > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                    <span className="text-slate-500 sm:w-40 flex-shrink-0 font-medium">Vé xe vào cổng:</span>
                    <span className="font-bold font-mono text-[#0A9444] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                      {exitReceipt.entryTicketFee.toLocaleString('vi-VN')} VNĐ (Thu tại cổng ra)
                    </span>
                  </div>
                )}

                {exitReceipt.penaltyFee && exitReceipt.penaltyFee > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                    <span className="text-slate-500 sm:w-40 flex-shrink-0 font-medium">Phạt mất liên vé giấy:</span>
                    <span className="font-bold font-mono text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-300">
                      {exitReceipt.penaltyFee.toLocaleString('vi-VN')} VNĐ (Mã PHAT_MAT_VE)
                    </span>
                  </div>
                )}

                <div className="border-t border-slate-200 pt-2.5 mt-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                    <span className="text-xs font-bold text-slate-700 uppercase">Tổng số tiền thực thu tại cổng:</span>
                    <span className="text-xl font-bold font-mono text-[#0A9444]">
                      {exitReceipt.fee.toLocaleString('vi-VN')} VNĐ
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-600 italic">
                    (Bằng chữ: <strong className="text-slate-900 not-italic font-bold">{formatMoneyInWords(exitReceipt.fee)}</strong>)
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-5 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-800 uppercase">Người nộp tiền / Lái xe</p>
                  <p className="text-[11px] text-slate-400 italic">(Ký, họ tên)</p>
                  <div className="h-14" />
                </div>
                <div>
                  <p className="font-bold text-slate-800 uppercase">Nhân viên An ninh Cổng ra</p>
                  <p className="text-[11px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
                  <div className="h-14 flex items-end justify-center">
                    <p className="font-bold text-slate-800">{user?.email || 'An ninh bốt cổng ra'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[10px] text-slate-500 font-mono">
                Chứng từ điện tử trích xuất từ Phần mềm quản lý bến bãi/cảng cạn Sơn Cảng — Tà Lùng Quang Minh
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL THU TIỀN VÉ VÀO CỔNG TẠI BỐT GÁC CHO XE CHƯA THU                  */}
      {/* ========================================================================= */}
      {quickCollectVeh && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-2xl space-y-3.5 border border-slate-300">
            <div className="flex items-center justify-between border-b border-slate-300 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#0A9444]" />
                Thu Vé Cổng Phương Tiện
              </h3>
              <button 
                type="button"
                onClick={() => setQuickCollectVeh(null)} 
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {quickCollectError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-800 rounded text-xs font-semibold">
                {quickCollectError}
              </div>
            )}

            <div className="bg-slate-50 border border-slate-200 p-3 rounded space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Biển số xe:</span>
                <span className="font-mono font-bold text-base text-slate-900">{quickCollectVeh.license_plate || 'Không biển'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Loại phương tiện:</span>
                <span className="font-semibold text-slate-800">{getVehicleTypeName(quickCollectVeh.vehicle_type_name || quickCollectVeh.vehicle_type)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Mức tiền vé:</span>
                <span className="text-sm font-bold font-mono text-[#0A9444]">{(quickCollectVeh.ticket_amount || 0).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>

            <form onSubmit={handleConfirmQuickCollectTicket} className="space-y-3.5">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Hình thức thanh toán:</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="quickCollectPayMethod"
                      value="CASH"
                      checked={quickCollectMethod === 'CASH'}
                      onChange={() => setQuickCollectMethod('CASH')}
                      className="text-[#0A9444]"
                    />
                    <span>💵 Tiền mặt</span>
                  </label>
                  <label className="flex items-center space-x-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="quickCollectPayMethod"
                      value="BANK_TRANSFER"
                      checked={quickCollectMethod === 'BANK_TRANSFER'}
                      onChange={() => setQuickCollectMethod('BANK_TRANSFER')}
                      className="text-[#0A9444]"
                    />
                    <span>📱 Chuyển khoản (VietQR / CK)</span>
                  </label>
                </div>

                {quickCollectMethod === 'BANK_TRANSFER' && (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={quickCollectReceiptCode}
                      onChange={(e) => setQuickCollectReceiptCode(e.target.value)}
                      placeholder="Mã tham chiếu CK / Số biên lai thu vé..."
                      className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-mono"
                      required
                    />
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900">Mã VietQR thu vé cổng</span>
                        <button
                          type="button"
                          onClick={() => setShowQuickCollectQr(!showQuickCollectQr)}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[11px] flex items-center gap-1 cursor-pointer shadow-2xs"
                        >
                          <QrCode className="w-3 h-3" />
                          <span>{showQuickCollectQr ? 'Ẩn QR' : 'Mở VietQR vé cổng'}</span>
                        </button>
                      </div>
                      {showQuickCollectQr && (
                        <div className="flex flex-col items-center justify-center p-2.5 bg-white border border-blue-300 rounded shadow-2xs">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={generateVietQrUrl({
                              amount: quickCollectVeh.ticket_amount || 0,
                              description: `VE CONG ${quickCollectVeh.license_plate || 'XE'}`
                            })}
                            alt="Mã VietQR vé cổng"
                            className="w-44 h-auto rounded border border-slate-200"
                          />
                          <span className="text-[10px] text-slate-500 mt-1 font-semibold">Tài xế quét mã bằng app ngân hàng</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setQuickCollectVeh(null)}
                  disabled={isSubmittingQuickCollect}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer border border-slate-300"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingQuickCollect}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>{isSubmittingQuickCollect ? 'Đang ghi nhận...' : 'Xác nhận Đã thu tiền vé'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
