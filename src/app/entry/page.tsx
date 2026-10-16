'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { SEED_VEHICLE_TYPES_V5 } from '@/lib/services/yard-service';
import { 
  VehicleType, 
  VehicleVisit, 
  ContainerVisit, 
  ReeferRequest, 
  VehicleDuplicateCheckResult, 
  TariffItem 
} from '@/types/domain.types';
import { validateContainerNumber } from '@/lib/container-validator';
import { 
  Truck, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ShieldAlert, 
  CreditCard, 
  QrCode, 
  ScanLine, 
  X, 
  Clock, 
  Receipt, 
  Printer, 
  Zap, 
  CopyCheck, 
  Info, 
  ChevronRight,
  ShieldCheck,
  Check,
  Building2,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { getVehicleTypeName, formatContainerSpec, formatMoneyInWords, getContainerTypeName } from '@/lib/display-formatters';
import { generateVietQrUrl } from '@/lib/vietqr-generator';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { SecondaryPanel } from '@/components/workspace/secondary-panel';
import { RightContextPanel } from '@/components/workspace/right-context-panel';
import { SearchInput } from '@/components/workspace/search-input';
import { StatusBadge } from '@/components/workspace/status-badge';
import { EmptyState } from '@/components/workspace/empty-state';

export default function EntryGatePage() {
  const { user, yardId, can, repository } = useAuth();

  // Quyền tiếp nhận xe theo mã chuẩn RBAC V5 (vehicle.visit.create)
  const isAllowed = can('vehicle.visit.create');

  // Form State
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>(() => SEED_VEHICLE_TYPES_V5);
  const [selectedType, setSelectedType] = useState<string>('CONT_LANH');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [driverIdCard, setDriverIdCard] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Quét mã QR CCCD
  const [showIdCardScanner, setShowIdCardScanner] = useState<boolean>(false);
  const [scannerRawInput, setScannerRawInput] = useState<string>('');
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string>('');

  // Container State (chỉ khi là loại xe chở container)
  const [containerCarryMode, setContainerCarryMode] = useState<'SINGLE' | 'DUAL_20FT'>('SINGLE');
  const [containerNo, setContainerNo] = useState<string>('');
  const [containerSize, setContainerSize] = useState<string>('40');
  const [containerType, setContainerType] = useState<string>('RF');

  // Container #2
  const [secondContainerNo, setSecondContainerNo] = useState<string>('');
  const [secondContainerType, setSecondContainerType] = useState<string>('RF');

  // Yêu cầu cắm điện dự kiến & Biểu phí
  const [plannedReeferRequests, setPlannedReeferRequests] = useState<ReeferRequest[]>([]);
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);

  // Dữ liệu bãi đang hoạt động (để kiểm tra trùng lặp)
  const [activeContainers, setActiveContainers] = useState<ContainerVisit[]>([]);
  const [activeVehicles, setActiveVehicles] = useState<VehicleVisit[]>([]);
  const [allKnownVehicles, setAllKnownVehicles] = useState<VehicleVisit[]>([]);

  // Thanh toán vé cổng
  const [collectPaymentNow, setCollectPaymentNow] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [receiptCode, setReceiptCode] = useState<string>('');

  // Trạng thái giao dịch
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successResult, setSuccessResult] = useState<{
    vehicle: VehicleVisit;
    container?: ContainerVisit;
    secondContainer?: ContainerVisit;
    containers?: ContainerVisit[];
  } | null>(null);

  // Modal in vé
  const [showPrintTicketModal, setShowPrintTicketModal] = useState<boolean>(false);

  // Kiểm soát trùng lặp xe
  const [dupCheckResult, setDupCheckResult] = useState<VehicleDuplicateCheckResult | null>(null);
  const [isCheckingDup, setIsCheckingDup] = useState<boolean>(false);
  const [showDupModal, setShowDupModal] = useState<boolean>(false);
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
  const [overrideReasonCode, setOverrideReasonCode] = useState<string>('XE_BO_CHAY_CHUYEN_MOI');
  const [customReasonText, setCustomReasonText] = useState<string>('');
  const [closePreviousOnEntry, setClosePreviousOnEntry] = useState<boolean>(true);

  // Đếm ngược tự động làm mới form sau khi tạo vé
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Secondary Panel State
  const [recentSearch, setRecentSearch] = useState<string>('');
  const [isSecondaryCollapsed, setIsSecondaryCollapsed] = useState<boolean>(true);
  const [selectedRecentVehicle, setSelectedRecentVehicle] = useState<VehicleVisit | null>(null);

  // Right Context Panel State (Mặc định mở trên Desktop >= 1280px, đóng trên Tablet/Mobile để không che form)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1280;
    }
    return true;
  });

  // Tải dữ liệu bãi
  const loadYardActiveData = useCallback(async () => {
    try {
      const [cList, vList] = await Promise.all([
        repository.getContainers(yardId),
        repository.getVehicles(yardId),
      ]);
      setAllKnownVehicles(vList);
      setActiveContainers(cList.filter((c) => c.status === 'IN_YARD'));
      setActiveVehicles(vList.filter((v) => v.status === 'IN_YARD'));
    } catch (err) {
      console.warn('Lỗi nạp danh sách xe/cont đang trong bãi:', err);
    }
  }, [repository, yardId]);

  // Kiểm tra trùng lặp Container 1
  const duplicateContainer = useMemo(() => {
    const clean = containerNo.trim().toUpperCase();
    if (clean.length < 4) return null;
    return activeContainers.find((c) => c.container_no_current === clean && c.status === 'IN_YARD') || null;
  }, [containerNo, activeContainers]);

  // Kiểm tra trùng lặp Container 2
  const duplicateSecondContainer = useMemo(() => {
    const clean2 = secondContainerNo.trim().toUpperCase();
    if (clean2.length < 4) return null;
    const clean1 = containerNo.trim().toUpperCase();
    if (clean2 === clean1) {
      return { isDuplicateWithFirst: true, container: null };
    }
    const found = activeContainers.find((c) => c.container_no_current === clean2 && c.status === 'IN_YARD');
    return found ? { isDuplicateWithFirst: false, container: found } : null;
  }, [secondContainerNo, containerNo, activeContainers]);

  // Kiểm tra trùng lặp xe tức thì (Debounced)
  useEffect(() => {
    const clean = licensePlate.trim().toUpperCase();
    if (clean.length < 3) {
      setDupCheckResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDup(true);
      try {
        const res = await repository.checkVehicleDuplicate(clean, selectedType, yardId);
        setDupCheckResult(res);
        if (res.preset_reasons && res.preset_reasons.length > 0) {
          setOverrideReasonCode(res.preset_reasons[0].code);
        }
      } catch (err) {
        console.warn('Lỗi kiểm tra trùng lặp xe:', err);
      } finally {
        setIsCheckingDup(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [licensePlate, selectedType, repository, yardId]);

  // Tải danh mục loại xe, yêu cầu điện dự kiến và bảng giá
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      repository.getVehicleTypes(),
      repository.getReeferRequests(yardId),
      repository.getTariffs(),
      repository.getContainers(yardId),
      repository.getVehicles(yardId),
    ])
      .then(([types, reqs, tariffList, cList, vList]) => {
        if (isMounted) {
          if (types.length > 0) setVehicleTypes(types);
          if (reqs.length > 0) setPlannedReeferRequests(reqs);
          if (tariffList.length > 0) setTariffs(tariffList);
          setActiveContainers(cList.filter((c) => c.status === 'IN_YARD'));
          setActiveVehicles(vList.filter((v) => v.status === 'IN_YARD'));
          setAllKnownVehicles(vList);
        }
      })
      .catch((err) => {
        console.warn('Lỗi nạp dữ liệu cổng vào:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [repository, yardId]);

  // Khớp yêu cầu cắm điện trước từ CCKB
  const matchedReeferRequest = useMemo(() => {
    if (!plannedReeferRequests.length) return null;
    const cleanPlate = licensePlate.trim().toUpperCase();
    const cleanCont1 = containerNo.trim().toUpperCase();
    const cleanCont2 = secondContainerNo.trim().toUpperCase();

    return plannedReeferRequests.find((req) => {
      if (req.status !== 'PLANNED') return false;
      const plannedCont = (req.container_no || req.container_no_planned || '').trim().toUpperCase();
      const plannedPlate = req.expected_license_plate?.trim().toUpperCase();

      if (cleanPlate && plannedPlate && cleanPlate === plannedPlate) return true;
      if (cleanCont1.length >= 4 && cleanCont1 === plannedCont) return true;
      if (cleanCont2.length >= 4 && cleanCont2 === plannedCont) return true;
      return false;
    }) || null;
  }, [plannedReeferRequests, licensePlate, containerNo, secondContainerNo]);

  const resetForm = () => {
    setCountdown(null);
    setIsPaused(false);
    setLicensePlate('');
    setSelectedType('CONT_LANH');
    setDriverName('');
    setDriverPhone('');
    setDriverIdCard('');
    setNote('');
    setContainerCarryMode('SINGLE');
    setContainerNo('');
    setContainerSize('40');
    setContainerType('RF');
    setSecondContainerNo('');
    setSecondContainerType('RF');
    setCollectPaymentNow(true);
    setPaymentMethod('CASH');
    setReceiptCode('');
    setErrorMessage('');
    setSuccessResult(null);
    setIdempotencyKey('');
    setScanSuccessMsg('');
    setDupCheckResult(null);
    setShowDupModal(false);
    setShowBlockModal(false);
  };

  // Tự động đếm ngược làm mới form
  useEffect(() => {
    if (countdown === null || isPaused) return;
    if (countdown <= 0) {
      resetForm();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, isPaused]);

  // Trích xuất CCCD gắn chip hoặc quét mã vạch
  const parseAndApplyCccdData = (rawText: string) => {
    const text = rawText.trim();
    if (text.includes('|')) {
      const parts = text.split('|');
      if (parts.length >= 3) {
        const cccdNumber = parts[0]?.trim();
        const fullName = parts[2]?.trim();
        if (cccdNumber) setDriverIdCard(cccdNumber);
        if (fullName) setDriverName(fullName);
        setScanSuccessMsg(`Đã trích xuất CCCD ${cccdNumber}: ${fullName}`);
        setShowIdCardScanner(false);
        setScannerRawInput('');
        return true;
      }
    }
    // Hỗ trợ mã vạch thuần túy hoặc số căn cước 9-12 chữ số
    if (/^\d{9,12}$/.test(text)) {
      setDriverIdCard(text);
      setScanSuccessMsg(`Đã nhận diện số CCCD/CMND: ${text}`);
      setShowIdCardScanner(false);
      setScannerRawInput('');
      return true;
    }
    setDriverIdCard(text);
    return false;
  };

  const currentVehicleType = vehicleTypes.find((t) => t.code === selectedType);
  const isContainerType = selectedType === 'CONT_LANH';
  const contTariffAmount = tariffs.find((t) => t.code === 'VE_CONT_LANH')?.amount ?? 250000;
  const previewAmount: number = isContainerType 
    ? contTariffAmount 
    : (selectedType === 'DAU_KEO' ? 0 : (currentVehicleType?.default_ticket_amount ?? 0));

  const contValidation = validateContainerNumber(containerNo);
  const secondContValidation = validateContainerNumber(secondContainerNo);

  const executeVehicleEntry = async (
    overrideDuplicate: boolean = false, 
    duplicateReason?: string, 
    closePrevious: boolean = false
  ) => {
    setErrorMessage('');
    setIsSubmitting(true);

    const activeKey = idempotencyKey || `GATEIN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    setIdempotencyKey(activeKey);

    const combinedNote = [
      driverIdCard.trim() ? `CCCD: ${driverIdCard.trim()}` : null,
      note.trim() ? note.trim() : null
    ].filter(Boolean).join(' | ');

    try {
      const res = await repository.createVehicleEntry({
        yardId,
        vehicleTypeCode: selectedType,
        licensePlate,
        driverName: driverName.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        note: combinedNote || undefined,
        hasContainer: isContainerType,
        containerNo: isContainerType ? containerNo.trim().toUpperCase() : undefined,
        containerSize: isContainerType ? (containerCarryMode === 'DUAL_20FT' ? '20' : containerSize) : undefined,
        containerType: isContainerType ? containerType : undefined,
        secondContainer: isContainerType && containerCarryMode === 'DUAL_20FT' ? {
          containerNo: secondContainerNo.trim().toUpperCase(),
          containerSize: '20',
          containerType: secondContainerType,
        } : undefined,
        operatorId: user?.id || 'demo-operator',
        operatorName: user?.fullName || 'Nhân viên Cổng',
        idempotencyKey: activeKey,
        collectPaymentNow: previewAmount > 0 ? collectPaymentNow : false,
        paymentMethod: previewAmount > 0 && collectPaymentNow ? paymentMethod : undefined,
        receiptCode: receiptCode.trim() || undefined,
        overrideDuplicate,
        duplicateReason,
        closePreviousVisit: closePrevious,
      });

      if (res.error || !res.vehicle) {
        setErrorMessage(res.error || 'Lỗi tiếp nhận lượt xe vào bãi.');
        setIsSubmitting(false);
        return;
      }

      if (matchedReeferRequest) {
        const targetContId = res.container?.id || res.secondContainer?.id;
        if (targetContId) {
          try {
            await repository.matchReeferRequest({
              requestId: matchedReeferRequest.id,
              containerVisitId: targetContId,
            });
          } catch (mErr) {
            console.warn('Lỗi tự động khớp yêu cầu điện dự kiến:', mErr);
          }
        }
      }

      setSuccessResult({
        vehicle: res.vehicle,
        container: res.container || undefined,
        secondContainer: res.secondContainer || undefined,
        containers: res.containers || (res.container ? [res.container] : []),
      });

      loadYardActiveData();
      setCountdown(8);
      setIsPaused(false);
      setIsSubmitting(false);
      setShowDupModal(false);
      setShowBlockModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi giao dịch tiếp nhận xe.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensePlate.trim()) {
      setErrorMessage('Vui lòng nhập biển số phương tiện vào cổng.');
      return;
    }

    if (isContainerType) {
      if (!containerNo.trim()) {
        setErrorMessage('Loại xe Container bắt buộc nhập mã số container.');
        return;
      }
      if (!contValidation.isValidFormat) {
        setErrorMessage(`Mã số container chưa đúng định dạng: ${contValidation.message}`);
        return;
      }
      if (duplicateContainer) {
        setErrorMessage(
          `Cảnh báo trùng số container: Container ${duplicateContainer.container_no_current} đang có lượt lưu bãi IN_YARD. Không tự động gộp lượt.`
        );
        return;
      }

      if (containerCarryMode === 'DUAL_20FT') {
        if (!secondContainerNo.trim()) {
          setErrorMessage('Vui lòng nhập mã số Container thứ hai (20ft).');
          return;
        }
        const cont2Validation = validateContainerNumber(secondContainerNo);
        if (!cont2Validation.isValidFormat) {
          setErrorMessage(`Container thứ hai chưa đúng chuẩn: ${cont2Validation.message}`);
          return;
        }
        if (duplicateSecondContainer?.isDuplicateWithFirst) {
          setErrorMessage('Mã số Container #1 và Container #2 không được trùng nhau.');
          return;
        }
      }
    }

    if (dupCheckResult?.has_duplicate) {
      if (!dupCheckResult.can_proceed) {
        setShowBlockModal(true);
        return;
      }
      if (dupCheckResult.requires_override) {
        setShowDupModal(true);
        return;
      }
    }

    await executeVehicleEntry(false, undefined, false);
  };

  // Danh sách xe vừa tiếp nhận cho Secondary Panel
  const recentIntakeVehicles = useMemo(() => {
    return allKnownVehicles
      .filter((v) => {
        if (!recentSearch.trim()) return true;
        const kw = recentSearch.trim().toUpperCase();
        return (
          v.license_plate?.toUpperCase().includes(kw) ||
          v.ticket_code?.toUpperCase().includes(kw)
        );
      })
      .slice(0, 20);
  }, [allKnownVehicles, recentSearch]);

  if (!isAllowed) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="max-w-md w-full p-6 text-center border border-[#E5E9F0] rounded-xl bg-[#F8F9FB]">
          <ShieldAlert className="w-10 h-10 text-[#D92D20] mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-[#17202E]">Chưa được cấp quyền tiếp nhận xe</h2>
          <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
            Tài khoản hiện tại chưa được phân công quyền <code>vehicle.visit.create</code> tại bốt An ninh cổng. Vui lòng liên hệ Trưởng bộ phận An ninh hoặc Quản trị hệ thống.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden h-full">
      {/* ============================================================== */}
      {/* 1. SECONDARY PANEL: HÀNG ĐỢI XE TIẾP NHẬN TRONG CA             */}
      {/* ============================================================== */}
      <SecondaryPanel
        title="Lượt xe gần đây"
        count={recentIntakeVehicles.length}
        isCollapsed={isSecondaryCollapsed}
        onToggleCollapse={() => setIsSecondaryCollapsed(!isSecondaryCollapsed)}
        searchSlot={
          <SearchInput
            value={recentSearch}
            onChange={setRecentSearch}
            placeholder="Tìm biển số, vé cổng..."
          />
        }
      >
        {recentIntakeVehicles.length === 0 ? (
          <EmptyState
            title="Chưa có dữ liệu"
            description="Chưa ghi nhận lượt xe nào trong ca trực hiện tại."
            className="py-12"
          />
        ) : (
          recentIntakeVehicles.map((v) => {
            const isSelected = selectedRecentVehicle?.id === v.id;
            return (
              <div
                key={v.id}
                onClick={() => {
                  setSelectedRecentVehicle(v);
                  setIsRightPanelOpen(true);
                }}
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
                    label={v.ticket_payment_status === 'PAID' ? 'Đã thu' : (v.ticket_payment_status === 'EXEMPT' ? '0đ' : 'Chưa thu')}
                    variant={v.ticket_payment_status === 'PAID' ? 'success' : (v.ticket_payment_status === 'EXEMPT' ? 'neutral' : 'warning')}
                    showDot={false}
                    className="text-[10px] py-0 px-1.5"
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#667085]">
                  <span className="truncate max-w-[130px]">
                    {getVehicleTypeName(v.vehicle_type)}
                  </span>
                  <span className="font-mono">
                    {new Date(v.entry_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </SecondaryPanel>

      {/* ============================================================== */}
      {/* 2. MAIN WORKSPACE: BIỂU MẪU TIẾP NHẬN XE CỔNG VÀO (V5)          */}
      {/* ============================================================== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white">
        {/* Workspace Header */}
        <WorkspaceHeader
          title="Tiếp nhận Phương tiện & Xe Cổng vào"
          subtitle="Bốt gác An ninh cổng — Kiểm soát lượt xe, số container và thu tiền vé vào bãi"
          icon={Truck}
          badge={
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ECFDF3] text-[#0A9444] border border-[#A6F4C5]">
              Bốt cổng trực tiếp
            </span>
          }
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsRightPanelOpen((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  isRightPanelOpen
                    ? 'border-[#B2DDFF] bg-[#EFF8FF] text-[#326DD8]'
                    : 'border-[#E5E9F0] text-[#17202E] hover:bg-[#F8F9FB]'
                }`}
                title="Bật/tắt bảng trợ giúp biểu phí và thông tin đối chiếu"
              >
                <Info className="w-3.5 h-3.5 text-[#326DD8]" />
                <span className="hidden sm:inline">Trợ giúp & Biểu phí</span>
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E9F0] text-xs font-medium text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#667085]" />
                <span>Làm mới form</span>
              </button>
            </div>
          }
        />

        {/* THÔNG BÁO HOÀN TẤT THÀNH CÔNG */}
        {successResult && (
          <div className="m-4 sm:m-5 lg:m-6 p-4 rounded-xl bg-[#ECFDF3] border border-[#A6F4C5] animate-in fade-in slide-in-from-top-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#0A9444] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-[#0A9444]">
                    Tiếp nhận xe vào bãi thành công!
                  </h3>
                  <div className="text-xs text-[#17202E] mt-1 space-y-0.5">
                    <p>
                      Biển số: <strong className="font-mono text-sm">{successResult.vehicle.license_plate}</strong> — Mã vé: <strong className="font-mono">{successResult.vehicle.ticket_code || '---'}</strong>
                    </p>
                    {successResult.container && (
                      <p>
                        Container: <strong className="font-mono">{successResult.container.container_no_current}</strong> ({formatContainerSpec(successResult.container.container_size, successResult.container.container_type)})
                      </p>
                    )}
                    <p className="text-[#667085]">
                      Thời gian ghi nhận: {new Date(successResult.vehicle.entry_at).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPrintTicketModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#A6F4C5] text-xs font-semibold text-[#0A9444] hover:bg-[#F0FDF4] transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In vé</span>
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-lg bg-[#0A9444] text-white text-xs font-semibold hover:bg-[#087C3C] transition-colors cursor-pointer"
                >
                  Xe tiếp theo {countdown !== null && `(${countdown}s)`}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* THÔNG BÁO LỖI NẾU CÓ */}
        {errorMessage && (
          <div className="mx-4 sm:mx-5 lg:mx-6 mt-4 p-3.5 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-xs text-[#D92D20] flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1 font-medium">{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage('')}
              className="p-1 text-[#D92D20] hover:bg-[#FEE4E2] rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* FORM TIẾP NHẬN CHÍNH (WIDTH LINH ĐỘNG THEO TOÀN BỘ KHÔNG GIAN WORKSPACE) */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-5 lg:p-6 w-full space-y-6">
          {/* SECTION 1: THÔNG TIN PHƯƠNG TIỆN */}
          <div className="border border-[#E5E9F0] rounded-xl p-4 sm:p-5 bg-white shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F6]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-[#EAF1FD] text-[#326DD8] flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <h3 className="text-sm font-semibold text-[#17202E]">
                  Thông tin Phương tiện
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIdCardScanner(!showIdCardScanner)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-[#326DD8] bg-[#EFF8FF] border border-[#B2DDFF] hover:bg-[#EAF1FD] transition-colors cursor-pointer"
              >
                <ScanLine className="w-3.5 h-3.5" />
                <span>Quét CCCD tài xế</span>
              </button>
            </div>

            {/* Quét CCCD Popup input */}
            {showIdCardScanner && (
              <div className="p-3 bg-[#F8F9FB] rounded-lg border border-[#E5E9F0] space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#17202E]">
                    Sẵn sàng quét mã QR CCCD gắn chip (Chế độ Typing/Bàn phím ảo):
                  </label>
                  <span className="text-[10px] text-[#667085]">
                    Cắm súng quét USB và bắn trực tiếp
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={scannerRawInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setScannerRawInput(val);
                      // Tự động nhận diện nếu súng quét bắn chuỗi QR có phân tách pipe '|' đủ 7 trường
                      if (val.includes('|') && val.split('|').length >= 3) {
                        parseAndApplyCccdData(val);
                      }
                    }}
                    onKeyDown={(e) => {
                      // Máy quét luôn gửi kèm phím Enter khi kết thúc chuỗi
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (scannerRawInput.trim()) {
                          parseAndApplyCccdData(scannerRawInput);
                        }
                      }
                    }}
                    placeholder="Đặt con trỏ tại đây và bấm máy quét 'tít' vào mã QR CCCD..."
                    className="flex-1 h-9 px-3 text-xs bg-white text-[#17202E] border border-[#326DD8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20"
                  />
                  <button
                    type="button"
                    onClick={() => parseAndApplyCccdData(scannerRawInput)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#326DD8] text-white text-xs font-semibold hover:bg-[#2557B4] cursor-pointer shadow-2xs shrink-0"
                  >
                    Áp dụng
                  </button>
                </div>
                <p className="text-[10px] text-[#667085] italic flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>Máy quét 2D/QR cắm cổng USB hoạt động như bàn phím gõ siêu tốc (Typing). Khi quét xong sẽ tự động bóc tách Số CCCD & Họ tên vào form ngay tức thì.</span>
                </p>
              </div>
            )}

            {scanSuccessMsg && (
              <div className="p-2 rounded bg-[#ECFDF3] border border-[#A6F4C5] text-xs text-[#0A9444]">
                {scanSuccessMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Biển số xe */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#17202E] flex items-center justify-between">
                  <span>Biển số xe vào cổng <span className="text-[#D92D20]">*</span></span>
                  {isCheckingDup && (
                    <span className="text-[10px] text-[#326DD8] animate-pulse">Đang kiểm tra trùng...</span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="VD: 11C-123.45 hoặc 29H-987.65"
                  className="w-full h-10 px-3 font-mono font-bold text-sm bg-white text-[#17202E] placeholder-[#98A2B3] border border-[#E5E9F0] rounded-lg focus:outline-none focus:border-[#326DD8] focus:ring-3 focus:ring-[rgba(50,109,216,0.12)]"
                />
              </div>

              {/* Loại phương tiện V5 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#17202E]">
                  Loại phương tiện <span className="text-[#D92D20]">*</span>
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full h-10 px-3 text-xs bg-white text-[#17202E] border border-[#E5E9F0] rounded-lg focus:outline-none focus:border-[#326DD8]"
                >
                  {vehicleTypes.map((t) => (
                    <option key={t.code} value={t.code}>
                      {t.name} {t.default_ticket_amount !== null ? `(${t.default_ticket_amount.toLocaleString('vi-VN')} đ)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* THÔNG TIN TÀI XẾ & ĐỊNH DANH CCCD */}
            <div className="pt-3 border-t border-[#F0F2F6]">
              <div className="text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Thông tin Tài xế & Định danh CCCD</span>
                {driverIdCard && (
                  <span className="text-[11px] font-semibold text-[#0A9444] bg-[#ECFDF3] px-2 py-0.5 rounded-md border border-[#A6F4C5] inline-flex items-center gap-1">
                    {driverIdCard.length === 12 ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-[#0A9444]" />
                        <span>Đủ 12 số CCCD hợp lệ</span>
                      </>
                    ) : (
                      <span>Định danh: {driverIdCard}</span>
                    )}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tên tài xế */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#17202E]">
                    Họ tên tài xế
                  </label>
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A"
                    className="w-full h-9 px-3 text-xs bg-white text-[#17202E] border border-[#E5E9F0] rounded-lg focus:outline-none focus:border-[#326DD8]"
                  />
                </div>

                {/* Số CCCD tài xế (Nhập tay hoặc quét QR) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#17202E] flex items-center justify-between">
                    <span>Số CCCD tài xế</span>
                    <span className="text-[10px] text-[#667085]">Nhập tay hoặc quét QR</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={15}
                      value={driverIdCard}
                      onChange={(e) => {
                        setDriverIdCard(e.target.value.replace(/\s+/g, ''));
                      }}
                      placeholder="VD: 001095012345"
                      className="w-full h-9 px-3 text-xs font-mono font-semibold bg-white text-[#17202E] border border-[#E5E9F0] rounded-lg focus:outline-none focus:border-[#326DD8] focus:ring-1 focus:ring-[#326DD8]"
                    />
                    {driverIdCard && (
                      <button
                        type="button"
                        onClick={() => setDriverIdCard('')}
                        title="Xóa nhanh số CCCD"
                        className="absolute right-2.5 top-2.5 text-[#98A2B3] hover:text-[#D92D20] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Số điện thoại */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#17202E]">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="tel"
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="VD: 0912345678"
                    className="w-full h-9 px-3 text-xs font-mono bg-white text-[#17202E] border border-[#E5E9F0] rounded-lg focus:outline-none focus:border-[#326DD8]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: THÔNG TIN CONTAINER (HIỂN THỊ KHI LÀ XE CONTAINER) */}
          {isContainerType && (
            <div className="border border-[#E5E9F0] rounded-xl p-4 sm:p-5 bg-white shadow-2xs space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F6]">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-[#ECFDF3] text-[#0A9444] flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <h3 className="text-sm font-semibold text-[#17202E]">
                    Thông tin Container mang theo
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setContainerCarryMode('SINGLE')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      containerCarryMode === 'SINGLE'
                        ? 'bg-[#EAF1FD] text-[#326DD8] font-semibold border border-[#D0E1FD]'
                        : 'text-[#667085] hover:bg-[#F8F9FB]'
                    }`}
                  >
                    1 Container (20/40/45ft)
                  </button>
                  <button
                    type="button"
                    onClick={() => setContainerCarryMode('DUAL_20FT')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      containerCarryMode === 'DUAL_20FT'
                        ? 'bg-[#EAF1FD] text-[#326DD8] font-semibold border border-[#D0E1FD]'
                        : 'text-[#667085] hover:bg-[#F8F9FB]'
                    }`}
                  >
                    Cõng 2 Cont 20ft
                  </button>
                </div>
              </div>

              {/* Container #1 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-[#17202E] flex items-center justify-between">
                    <span>Mã số Container #1 <span className="text-[#D92D20]">*</span></span>
                    {containerNo.trim() && (
                      <span className={`text-[11px] font-semibold inline-flex items-center gap-1 ${contValidation.isValidFormat ? 'text-[#0A9444]' : 'text-[#B54708]'}`}>
                        {contValidation.isValidFormat ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Đúng chuẩn 11 ký tự</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            <span>Kiểm tra định dạng</span>
                          </>
                        )}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    value={containerNo}
                    onChange={(e) => setContainerNo(e.target.value.toUpperCase())}
                    placeholder="VD: MSKU1234567 hoặc BMOU9876543"
                    className="w-full h-10 px-3 font-mono font-bold text-sm bg-white text-[#17202E] placeholder-[#98A2B3] border border-[#E5E9F0] rounded-lg focus:outline-none focus:border-[#326DD8]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#17202E]">
                    Chủng loại cont
                  </label>
                  <select
                    value={containerType}
                    onChange={(e) => setContainerType(e.target.value)}
                    className="w-full h-10 px-3 text-xs bg-white text-[#17202E] border border-[#E5E9F0] rounded-lg focus:outline-none focus:border-[#326DD8]"
                  >
                    <option value="RF">Lạnh (Reefer)</option>
                    <option value="DC">Khô (Dry Container)</option>
                    <option value="HC">Cao (High Cube)</option>
                    <option value="OT">Mở nóc (Open Top)</option>
                  </select>
                </div>
              </div>

              {/* Container #2 nếu là cõng 2 cont 20ft */}
              {containerCarryMode === 'DUAL_20FT' && (
                <div className="p-3 bg-[#F8F9FB] rounded-lg border border-[#E5E9F0] space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-semibold text-[#17202E]">
                    Container thứ hai (20ft)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[11px] font-semibold text-[#475467]">
                        Mã số Container #2 <span className="text-[#D92D20]">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={secondContainerNo}
                        onChange={(e) => setSecondContainerNo(e.target.value.toUpperCase())}
                        placeholder="VD: TCLU1234567"
                        className="w-full h-9 px-3 font-mono font-bold text-xs bg-white text-[#17202E] border border-[#E5E9F0] rounded-lg focus:outline-none focus:border-[#326DD8]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-[#475467]">
                        Loại vỏ #2
                      </label>
                      <select
                        value={secondContainerType}
                        onChange={(e) => setSecondContainerType(e.target.value)}
                        className="w-full h-9 px-2 text-xs bg-white text-[#17202E] border border-[#E5E9F0] rounded-lg focus:outline-none focus:border-[#326DD8]"
                      >
                        <option value="RF">Lạnh (RF)</option>
                        <option value="DC">Khô (DC)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: THÔNG TIN VÉ & THANH TOÁN CỔNG */}
          <div className="border border-[#E5E9F0] rounded-xl p-4 sm:p-5 bg-white shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0F2F6]">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-md bg-[#FFFAEB] text-[#B54708] flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <h3 className="text-sm font-semibold text-[#17202E]">
                  Vé vào bãi & Thanh toán cổng
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#667085] mr-1">Tiền vé:</span>
                <span className="font-mono font-bold text-base text-[#17202E]">
                  {previewAmount.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {previewAmount > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-xs font-medium text-[#17202E] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={collectPaymentNow}
                      onChange={(e) => setCollectPaymentNow(e.target.checked)}
                      className="w-4 h-4 rounded text-[#0A9444] focus:ring-[#0A9444]"
                    />
                    <span>Thu tiền vé ngay tại bốt cổng</span>
                  </label>
                </div>

                {collectPaymentNow && (
                  <div className="p-3 bg-[#F8F9FB] rounded-lg border border-[#E5E9F0] flex flex-wrap items-center gap-4">
                    <span className="text-xs font-semibold text-[#475467]">Hình thức thanh toán:</span>
                    <label className="flex items-center gap-1.5 text-xs text-[#17202E] cursor-pointer">
                      <input
                        type="radio"
                        name="payMethod"
                        value="CASH"
                        checked={paymentMethod === 'CASH'}
                        onChange={() => setPaymentMethod('CASH')}
                        className="text-[#0A9444] focus:ring-[#0A9444]"
                      />
                      <span>Tiền mặt</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-[#17202E] cursor-pointer">
                      <input
                        type="radio"
                        name="payMethod"
                        value="TRANSFER"
                        checked={paymentMethod === 'TRANSFER'}
                        onChange={() => setPaymentMethod('TRANSFER')}
                        className="text-[#326DD8] focus:ring-[#326DD8]"
                      />
                      <span>Chuyển khoản (VietQR)</span>
                    </label>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-[#F8F9FB] rounded-lg border border-[#E5E9F0] text-xs text-[#667085]">
                Loại phương tiện này được miễn phí vé cổng theo quy chế biểu phí V5 ({getVehicleTypeName(selectedType)}: 0đ).
              </div>
            )}
          </div>

          {/* ACTION BUTTON BAR */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2.5 rounded-lg border border-[#E5E9F0] text-xs font-medium text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#087C3C] text-white text-xs font-semibold hover:bg-[#076934] transition-colors cursor-pointer shadow-2xs disabled:bg-[#E5E9F0] disabled:text-[#98A2B3]"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang xử lý giao dịch...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Xác nhận xe vào bãi</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ============================================================== */}
      {/* 3. RIGHT CONTEXT PANEL: ĐỐI CHIẾU & CẢNH BÁO CA TRỰC           */}
      {/* ============================================================== */}
      <RightContextPanel
        title="Đối chiếu & Trợ giúp"
        subtitle="Bốt kiểm soát An ninh cổng"
        isOpen={isRightPanelOpen}
        onClose={() => setIsRightPanelOpen(false)}
      >
        <div className="space-y-4">
          {/* Cảnh báo khớp phiếu điện CCKB */}
          {matchedReeferRequest && (
            <div className="p-3 bg-[#EFF8FF] rounded-lg border border-[#B2DDFF] space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#326DD8]">
                <Zap className="w-3.5 h-3.5" />
                <span>Khớp yêu cầu cắm điện trước!</span>
              </div>
              <p className="text-[11px] text-[#17202E] leading-relaxed">
                Nghiệp vụ Cổng cảng Kho bãi đã tạo phiếu dự kiến cho cont <strong>{matchedReeferRequest.container_no}</strong>. Hệ thống sẽ tự động ghép lượt khi tiếp nhận.
              </p>
              <div className="text-[10px] text-[#667085]">
                Khách hàng: {matchedReeferRequest.customer_name || 'Vãng lai'} · Chế độ: {matchedReeferRequest.power_mode === 'HOURLY' ? 'Theo giờ' : 'Liên tục'}
              </div>
            </div>
          )}

          {/* Cảnh báo xe trùng lặp nếu phát hiện */}
          {dupCheckResult?.has_duplicate && (
            <div className="p-3 bg-[#FFFAEB] rounded-lg border border-[#FEDF89] space-y-1.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#B54708]">
                <CopyCheck className="w-3.5 h-3.5" />
                <span>Cảnh báo xe trùng lặp!</span>
              </div>
              <p className="text-[11px] text-[#17202E] leading-relaxed">
                Biển số {licensePlate} đang có lượt xe chưa ra khỏi bãi hoặc vào cổng quá gần nhau.
              </p>
            </div>
          )}

          {/* Bảng giá tham chiếu nhanh */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[#667085] uppercase tracking-wide">
              Biểu phí vé cổng V5
            </h4>
            <div className="divide-y divide-[#F0F2F6] text-xs">
              {vehicleTypes.map((vt) => (
                <div key={vt.code} className="py-2 flex items-center justify-between">
                  <span className="text-[#17202E] truncate max-w-[150px]">{vt.name}</span>
                  <span className="font-mono font-semibold text-[#475467]">
                    {vt.default_ticket_amount !== null
                      ? `${vt.default_ticket_amount.toLocaleString('vi-VN')} đ`
                      : '0 đ'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </RightContextPanel>

      {/* ============================================================== */}
      {/* 4. MODAL IN VÉ VÀO BÃI CHO XE & CONTAINER (CHUẨN IN NHIỆT POS) */}
      {/* ============================================================== */}
      {showPrintTicketModal && successResult && (
        <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in print:p-0 print:bg-white">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-[#E5E9F0] shadow-2xl space-y-4 print:border-none print:shadow-none print:max-w-none print:p-0">
            {/* Header điều khiển (ẩn khi in) */}
            <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 print:hidden">
              <span className="text-xs font-bold text-[#17202E] flex items-center gap-1.5 uppercase tracking-wider">
                <Printer className="w-4 h-4 text-[#0A9444]" />
                Xem trước & In vé xe vào bãi
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-1.5 px-3.5 text-xs font-semibold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>In vé ngay</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintTicketModal(false)}
                  className="py-1.5 px-3 text-xs font-semibold text-[#667085] hover:bg-[#F8F9FB] rounded-lg border border-[#E5E9F0] transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Đóng</span>
                </button>
              </div>
            </div>

            {/* Khổ vé in nhiệt 80mm / A5 */}
            <div className="border border-dashed border-[#CBD5E1] rounded-xl p-5 space-y-3 bg-[#FCFCFD] text-[#17202E] font-sans print:border-none print:bg-white print:p-0">
              {/* Header thương hiệu */}
              <div className="text-center pb-2 border-b border-[#E5E9F0]">
                <p className="font-bold text-xs uppercase text-[#223873] tracking-wide">
                  CÔNG TY CỔ PHẦN TÀ LÙNG QUANG MINH
                </p>
                <p className="text-[11px] font-semibold text-[#17202E] mt-0.5">
                  Bến bãi Quản lý & Cảng cạn Sơn Cảng
                </p>
                <p className="text-[10px] text-[#667085]">
                  Cửa khẩu Quốc tế Tà Lùng, Huyện Quảng Hòa, Cao Bằng
                </p>
                <div className="pt-2">
                  <h2 className="text-base sm:text-lg font-bold text-[#17202E] uppercase tracking-wider">
                    VÉ XE VÀO BÃI
                  </h2>
                  <p className="text-[10px] italic text-[#667085]">
                    (Liên kiểm soát bến bãi — Lưu giữ khi rời cổng)
                  </p>
                </div>
              </div>

              {/* Thông tin vé */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#667085]">Mã số vé vào bãi:</span>
                  <span className="font-mono font-bold text-sm text-[#0A9444]">
                    {successResult.vehicle.ticket_code || 'SC-IN-000000'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#667085]">Biển số phương tiện:</span>
                  <span className="font-mono font-bold text-sm text-[#17202E] px-2 py-0.5 bg-white border border-[#E5E9F0] rounded">
                    {successResult.vehicle.license_plate}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#667085]">Loại phương tiện:</span>
                  <span className="font-medium text-[#17202E]">
                    {getVehicleTypeName(successResult.vehicle.vehicle_type)}
                  </span>
                </div>

                {successResult.container && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#667085]">Container kéo theo:</span>
                    <span className="font-mono font-bold text-xs text-[#326DD8]">
                      {successResult.container.container_no_current} ({formatContainerSpec(successResult.container.container_size, successResult.container.container_type)})
                    </span>
                  </div>
                )}

                {successResult.secondContainer && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#667085]">Container #2 (20ft):</span>
                    <span className="font-mono font-bold text-xs text-[#326DD8]">
                      {successResult.secondContainer.container_no_current}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[#667085]">Thời gian xe vào cổng:</span>
                  <span className="font-mono font-medium text-[#17202E]">
                    {new Date(successResult.vehicle.entry_at).toLocaleTimeString('vi-VN')} — {new Date(successResult.vehicle.entry_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#E5E9F0] flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#17202E]">Tiền vé vào bãi:</span>
                  <span className="font-mono font-bold text-base text-[#0A9444]">
                    {successResult.vehicle.ticket_amount !== null && successResult.vehicle.ticket_amount > 0
                      ? `${successResult.vehicle.ticket_amount.toLocaleString('vi-VN')} đ`
                      : '0 đ (Miễn phí)'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#667085]">Trạng thái thanh toán:</span>
                  <span className="font-semibold text-[#0A9444]">
                    {successResult.vehicle.ticket_payment_status === 'PAID'
                      ? 'ĐÃ THU TIỀN VÉ TẠI CỔNG VÀO'
                      : (successResult.vehicle.ticket_payment_status === 'EXEMPT' ? 'MIỄN PHÍ VÉ CỔNG' : 'CHƯA THU (THU TẠI CỔNG RA)')}
                  </span>
                </div>
              </div>

              {/* Footer lưu ý & QR */}
              <div className="pt-3 border-t border-dashed border-[#CBD5E1] text-center space-y-1">
                <p className="text-[10px] text-[#667085] leading-relaxed">
                  Quý khách vui lòng giữ vé để xuất trình cho An ninh khi xe rời bãi.<br />
                  Cước lưu bãi container bắt đầu tính sau đêm miễn phí đầu tiên theo quy định biểu phí niêm yết.
                </p>
                <p className="text-[9px] font-mono text-[#98A2B3] pt-1">
                  In lúc: {new Date().toLocaleTimeString('vi-VN')} {new Date().toLocaleDateString('vi-VN')} · Bốt An ninh Cổng vào
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
