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
import { validateContainerNumber, sanitizeContainerInput } from '@/lib/container-validator';
import { 
  OfflineEntryDraft, 
  getOfflineDrafts, 
  saveOfflineDraft, 
  updateOfflineDraftStatus, 
  removeOfflineDraft, 
  clearSyncedDrafts, 
  subscribeOfflineQueue 
} from '@/lib/offline-queue';
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
  AlertCircle,
  Wifi,
  WifiOff,
  CloudOff,
  UploadCloud,
  Trash2,
  ListChecks
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
  // Lượt xe vào cổng gần nhất (lưu giữ cố định để in vé bất cứ lúc nào, không bị tự động biến mất)
  const [recentVisit, setRecentVisit] = useState<{
    vehicle: VehicleVisit;
    container?: ContainerVisit;
    secondContainer?: ContainerVisit;
    containers?: ContainerVisit[];
  } | null>(null);

  // Modal in vé
  const [showPrintTicketModal, setShowPrintTicketModal] = useState<boolean>(false);

  // Chế độ Ngoại tuyến & Hàng đợi lưu nháp (Offline Queue PWA)
  const [isOnline, setIsOnline] = useState<boolean>(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [offlineDrafts, setOfflineDrafts] = useState<OfflineEntryDraft[]>([]);
  const [lastSavedOfflineDraft, setLastSavedOfflineDraft] = useState<OfflineEntryDraft | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState<boolean>(false);
  const [syncingDraftId, setSyncingDraftId] = useState<string | null>(null);
  const [showDraftQueueModal, setShowDraftQueueModal] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string>('');

  // Kiểm soát trùng lặp xe
  const [dupCheckResult, setDupCheckResult] = useState<VehicleDuplicateCheckResult | null>(null);
  const [isCheckingDup, setIsCheckingDup] = useState<boolean>(false);
  const [showDupModal, setShowDupModal] = useState<boolean>(false);
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
  const [overrideReasonCode, setOverrideReasonCode] = useState<string>('XE_BO_CHAY_CHUYEN_MOI');
  const [customReasonText, setCustomReasonText] = useState<string>('');
  const [closePreviousOnEntry, setClosePreviousOnEntry] = useState<boolean>(true);

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

  // Lắng nghe trạng thái kết nối mạng & hàng đợi lưu nháp ngoại tuyến
  useEffect(() => {
    setOfflineDrafts(getOfflineDrafts());
    const unsubscribe = subscribeOfflineQueue(() => {
      setOfflineDrafts(getOfflineDrafts());
    });

    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

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
    setIdempotencyKey('');
    setScanSuccessMsg('');
    setDupCheckResult(null);
    setShowDupModal(false);
    setShowBlockModal(false);
  };

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

  // Lưu nháp ngoại tuyến khi mất mạng
  const saveAsOfflineDraft = (activeKey: string, combinedNote: string) => {
    try {
      const cleanPlate = licensePlate.trim().toUpperCase();
      const saved = saveOfflineDraft({
        yardId,
        licensePlate: cleanPlate,
        vehicleType: selectedType,
        driverName: driverName.trim() || undefined,
        driverPhone: driverPhone.trim() || undefined,
        driverIdCard: driverIdCard.trim() || undefined,
        isContainer: isContainerType,
        containerNo: isContainerType ? containerNo.trim().toUpperCase() : undefined,
        containerSize: isContainerType ? (containerCarryMode === 'DUAL_20FT' ? '20' : containerSize) : undefined,
        containerType: isContainerType ? containerType : undefined,
        containerCarryMode: isContainerType ? containerCarryMode : undefined,
        secondContainerNo: isContainerType && containerCarryMode === 'DUAL_20FT' ? secondContainerNo.trim().toUpperCase() : undefined,
        secondContainerType: isContainerType && containerCarryMode === 'DUAL_20FT' ? secondContainerType : undefined,
        collectPaymentNow: previewAmount > 0 ? collectPaymentNow : false,
        paymentMethod: previewAmount > 0 && collectPaymentNow ? paymentMethod : 'CASH',
        receiptCode: receiptCode.trim() || undefined,
        note: combinedNote || undefined,
        ticketAmount: previewAmount,
      });

      setLastSavedOfflineDraft(saved);
      setIsSubmitting(false);
      setShowDupModal(false);
      setShowBlockModal(false);

      // Làm mới form để sẵn sàng đón xe tiếp theo
      resetForm();
    } catch (saveErr) {
      setErrorMessage('Không thể lưu nháp ngoại tuyến: ' + (saveErr instanceof Error ? saveErr.message : String(saveErr)));
      setIsSubmitting(false);
    }
  };

  const handleSyncDraft = async (draft: OfflineEntryDraft): Promise<boolean> => {
    setSyncingDraftId(draft.id);
    updateOfflineDraftStatus(draft.id, 'SYNCING');
    try {
      const res = await repository.createVehicleEntry({
        yardId: draft.yardId,
        vehicleTypeCode: draft.vehicleType,
        licensePlate: draft.licensePlate,
        driverName: draft.driverName,
        driverPhone: draft.driverPhone,
        note: draft.note,
        hasContainer: draft.isContainer,
        containerNo: draft.containerNo,
        containerSize: draft.containerSize,
        containerType: draft.containerType,
        secondContainer: draft.secondContainerNo ? {
          containerNo: draft.secondContainerNo,
          containerSize: '20',
          containerType: draft.secondContainerType || 'RF',
        } : undefined,
        operatorId: user?.id || 'demo-operator',
        operatorName: user?.fullName || 'Nhân viên Cổng (Đồng bộ offline)',
        idempotencyKey: draft.id,
        collectPaymentNow: draft.collectPaymentNow,
        paymentMethod: draft.paymentMethod,
        receiptCode: draft.receiptCode,
        overrideDuplicate: true,
        duplicateReason: 'DONG_BO_NGOAI_TUYEN_DO_MAT_MANG',
      });

      if (res.error || !res.vehicle) {
        updateOfflineDraftStatus(draft.id, 'FAILED', res.error || 'Lỗi phản hồi từ máy chủ.');
        setSyncingDraftId(null);
        return false;
      }

      // Xóa draft thành công khỏi hàng đợi
      removeOfflineDraft(draft.id);

      // Hiển thị vé xe chính thức cho nhân viên
      setRecentVisit({
        vehicle: res.vehicle,
        container: res.container || undefined,
        secondContainer: res.secondContainer || undefined,
        containers: res.containers || (res.container ? [res.container] : []),
      });

      setSyncingDraftId(null);
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi kết nối khi đồng bộ.';
      updateOfflineDraftStatus(draft.id, 'FAILED', msg);
      setSyncingDraftId(null);
      return false;
    }
  };

  const handleSyncAllDrafts = async () => {
    if (isSyncingAll) return;
    const pendingList = offlineDrafts.filter(d => d.status === 'PENDING' || d.status === 'FAILED');
    if (pendingList.length === 0) return;

    setIsSyncingAll(true);
    let successCount = 0;
    for (const draft of pendingList) {
      const ok = await handleSyncDraft(draft);
      if (ok) successCount++;
    }
    setIsSyncingAll(false);
    await loadYardActiveData();

    if (successCount > 0) {
      setSyncSuccessMsg(`Đã đồng bộ thành công ${successCount} lượt xe lên máy chủ!`);
      setTimeout(() => setSyncSuccessMsg(''), 5000);
    }
  };

  const handleDeleteDraft = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa lượt xe nháp này khỏi máy bốt trực?')) {
      removeOfflineDraft(id);
    }
  };

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

    // Nếu đang mất kết nối mạng: lưu trực tiếp vào hàng đợi ngoại tuyến
    const isNetworkDown = (typeof navigator !== 'undefined' && !navigator.onLine) || !isOnline;
    if (isNetworkDown) {
      saveAsOfflineDraft(activeKey, combinedNote);
      return;
    }

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

      setRecentVisit({
        vehicle: res.vehicle,
        container: res.container || undefined,
        secondContainer: res.secondContainer || undefined,
        containers: res.containers || (res.container ? [res.container] : []),
      });

      loadYardActiveData();
      setIsSubmitting(false);
      setShowDupModal(false);
      setShowBlockModal(false);

      // Tự động làm sạch form để sẵn sàng tiếp nhận lượt xe tiếp theo mà không làm mất thông tin lượt xe gần nhất
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi giao dịch tiếp nhận xe.';
      const isFetchError = msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('network') || !navigator.onLine;
      if (isFetchError) {
        // Tự động lưu nháp nếu lỗi do rớt mạng bất ngờ
        saveAsOfflineDraft(activeKey, combinedNote);
        return;
      }
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!licensePlate.trim()) {
      setErrorMessage('Vui lòng nhập biển số phương tiện vào cổng.');
      return;
    }

    if (isContainerType) {
      const cleanCont1 = containerNo.trim().toUpperCase();
      if (!cleanCont1) {
        setErrorMessage('Loại xe Container bắt buộc nhập mã số container.');
        return;
      }
      if (!/^[A-Z]{4}[0-9]{7}$/.test(cleanCont1)) {
        setErrorMessage(`Mã số Container #1 chưa đúng chuẩn: Bắt buộc gồm 4 chữ cái đầu và 7 chữ số sau (VD: TCLU1234567, MSKU9876543). Hiện tại: "${cleanCont1}".`);
        return;
      }
      if (duplicateContainer) {
        setErrorMessage(
          `Cảnh báo trùng số container: Container ${duplicateContainer.container_no_current} đang có lượt lưu bãi IN_YARD. Không tự động gộp lượt.`
        );
        return;
      }

      if (containerCarryMode === 'DUAL_20FT') {
        const cleanCont2 = secondContainerNo.trim().toUpperCase();
        if (!cleanCont2) {
          setErrorMessage('Vui lòng nhập mã số Container thứ hai (20ft).');
          return;
        }
        if (!/^[A-Z]{4}[0-9]{7}$/.test(cleanCont2)) {
          setErrorMessage(`Mã số Container thứ hai chưa đúng chuẩn: Bắt buộc gồm 4 chữ cái đầu và 7 chữ số sau (VD: TCLU1234567, MSKU9876543). Hiện tại: "${cleanCont2}".`);
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ECFDF3] text-[#0A9444] border border-[#A6F4C5]">
                Bốt cổng trực tiếp
              </span>
              {!isOnline && (
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#FEF3F2] text-[#D92D20] border border-[#FECDCA] inline-flex items-center gap-1">
                  <WifiOff className="w-3 h-3" />
                  <span>Ngoại tuyến (Offline)</span>
                </span>
              )}
              {offlineDrafts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDraftQueueModal(true)}
                  className="px-2 py-0.5 rounded text-[11px] font-bold bg-[#FFFAEB] text-[#B54708] border border-[#FEDF89] inline-flex items-center gap-1 hover:bg-[#FEE4E2] transition-colors cursor-pointer"
                  title="Xem danh sách các lượt xe lưu nháp lúc mất mạng"
                >
                  <CloudOff className="w-3 h-3" />
                  <span>{offlineDrafts.filter(d => d.status === 'PENDING' || d.status === 'FAILED').length} nháp chờ đồng bộ</span>
                </button>
              )}
            </div>
          }
          actions={
            <div className="flex items-center gap-2">
              {offlineDrafts.length > 0 && isOnline && (
                <button
                  type="button"
                  onClick={handleSyncAllDrafts}
                  disabled={isSyncingAll}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#087C3C] hover:bg-[#076934] disabled:bg-[#E5E9F0] disabled:text-[#98A2B3] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  title="Đồng bộ ngay các lượt xe lưu nháp lúc mất mạng lên máy chủ"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Đồng bộ ngay ({offlineDrafts.filter(d => d.status === 'PENDING' || d.status === 'FAILED').length})</span>
                </button>
              )}
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

        {/* THÔNG BÁO ĐỒNG BỘ THÀNH CÔNG */}
        {syncSuccessMsg && (
          <div className="mx-4 sm:mx-5 lg:mx-6 mt-4 p-3.5 rounded-lg bg-[#ECFDF3] border border-[#A6F4C5] text-xs text-[#0A9444] flex items-center justify-between gap-2.5 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#0A9444] shrink-0" />
              <span className="font-semibold">{syncSuccessMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncSuccessMsg('')}
              className="text-[#667085] hover:text-[#17202E] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* HÀNG ĐỢI LƯỢT XE NGOẠI TUYẾN CHỜ ĐỒNG BỘ (OFFLINE QUEUE) */}
        {offlineDrafts.length > 0 && (
          <div className="mx-4 sm:mx-5 lg:mx-6 mt-4 p-4 rounded-xl bg-[#FFFAEB] border border-[#FEDF89] shadow-2xs animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F79009] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <CloudOff className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#B54708]">
                      Lưu nháp ngoại tuyến (Mất mạng):
                    </span>
                    <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-[#FEDF89] text-[#B54708]">
                      {offlineDrafts.filter(d => d.status === 'PENDING' || d.status === 'FAILED').length} xe chờ đồng bộ
                    </span>
                    {isOnline ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#ECFDF3] text-[#0A9444] border border-[#A6F4C5] inline-flex items-center gap-1">
                        <Wifi className="w-3 h-3" />
                        <span>Đã có mạng Internet — Sẵn sàng đồng bộ</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#FEF3F2] text-[#D92D20] border border-[#FECDCA] inline-flex items-center gap-1">
                        <WifiOff className="w-3 h-3" />
                        <span>Đang mất kết nối</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#475467] mt-1">
                    Các xe này đã được cho vào bãi để giải phóng cổng. Khi bấm đồng bộ, hệ thống sẽ đẩy dữ liệu lên máy chủ và cấp mã vé chính thức.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSyncAllDrafts}
                  disabled={isSyncingAll || !isOnline}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#087C3C] hover:bg-[#076934] disabled:bg-[#E5E9F0] disabled:text-[#98A2B3] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {isSyncingAll ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang đồng bộ...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Đồng bộ ngay ({offlineDrafts.filter(d => d.status === 'PENDING' || d.status === 'FAILED').length})</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowDraftQueueModal(true)}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#D0D5DD] bg-white text-xs font-semibold text-[#344054] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
                >
                  <span>Xem chi tiết ({offlineDrafts.length})</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* THÔNG BÁO VỪA LƯU NHÁP MỘT XE MỚI (KHI MẤT MẠNG) */}
        {lastSavedOfflineDraft && (
          <div className="mx-4 sm:mx-5 lg:mx-6 mt-4 p-4 rounded-xl bg-[#EFF8FF] border border-[#B2DDFF] shadow-2xs animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#175CD3] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <CloudOff className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#175CD3]">
                      Đã lưu nháp vào máy bốt trực (Ngoại tuyến):
                    </span>
                    <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-[#B2DDFF] text-[#17202E]">
                      {lastSavedOfflineDraft.licensePlate}
                    </span>
                    <span className="text-xs text-[#475467] font-mono">
                      Mã nháp: <strong className="text-[#17202E]">{lastSavedOfflineDraft.id}</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-[#175CD3] border border-[#B2DDFF]">
                      Đã giải phóng cổng
                    </span>
                  </div>
                  <p className="text-xs text-[#344054] mt-1">
                    An ninh cho xe vào bãi bình thường. Dữ liệu xe đã được lưu an toàn trên máy tính bốt trực và sẽ đẩy lên máy chủ khi có mạng trở lại.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLastSavedOfflineDraft(null)}
                className="p-2 rounded-lg text-[#667085] hover:text-[#17202E] hover:bg-[#E0F2FE] transition-colors cursor-pointer"
                title="Đóng thông báo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* LƯỢT XE VÀO CỔNG GẦN NHẤT — CỐ ĐỊNH, KHÔNG ĐẾM NGƯỢC BIẾN MẤT, IN VÉ BẤT CỨ LÚC NÀO */}
        {recentVisit && (
          <div className="m-4 sm:m-5 lg:m-6 p-4 rounded-xl bg-[#ECFDF3] border border-[#A6F4C5] shadow-2xs animate-in fade-in slide-in-from-top-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#0A9444] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0A9444]">
                      Đã ghi nhận xe vào bãi thành công:
                    </span>
                    <span className="font-mono font-bold text-sm bg-white px-2 py-0.5 rounded border border-[#A6F4C5] text-[#17202E]">
                      {recentVisit.vehicle.license_plate || 'Không biển'}
                    </span>
                    <span className="text-xs text-[#475467] font-mono">
                      Mã vé: <strong className="text-[#17202E]">{recentVisit.vehicle.ticket_code || '---'}</strong>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      recentVisit.vehicle.ticket_payment_status === 'PAID'
                        ? 'bg-[#ECFDF3] text-[#0A9444] border-[#A6F4C5]'
                        : 'bg-[#FFFAEB] text-[#B54708] border-[#FEDF89]'
                    }`}>
                      {recentVisit.vehicle.ticket_payment_status === 'PAID' ? 'Đã thu vé' : 'Chưa thu vé'} ({recentVisit.vehicle.ticket_amount ? `${recentVisit.vehicle.ticket_amount.toLocaleString('vi-VN')} đ` : '0 đ'})
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white text-[#475467] border border-[#D0D5DD]">
                      Lưu điện tử · Không bắt buộc in giấy
                    </span>
                  </div>

                  <div className="text-xs text-[#344054] mt-1.5 flex items-center gap-3 flex-wrap">
                    <span className="text-[#667085]">Loại xe: <strong>{getVehicleTypeName(recentVisit.vehicle.vehicle_type)}</strong></span>
                    {recentVisit.container && (
                      <span>Container #1: <strong className="font-mono text-[#17202E]">{recentVisit.container.container_no_current}</strong> ({formatContainerSpec(recentVisit.container.container_size, recentVisit.container.container_type)})</span>
                    )}
                    {recentVisit.secondContainer && (
                      <span>Cont #2: <strong className="font-mono text-[#17202E]">{recentVisit.secondContainer.container_no_current}</strong></span>
                    )}
                    <span className="text-[#667085]">
                      Thời gian vào: {new Date(recentVisit.vehicle.entry_at).toLocaleTimeString('vi-VN')} {new Date(recentVisit.vehicle.entry_at).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPrintTicketModal(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white border border-[#CBD5E1] text-[#344054] hover:bg-[#F8F9FB] hover:text-[#17202E] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  title="In vé giấy cho tài xế nếu có yêu cầu (Không bắt buộc)"
                >
                  <Printer className="w-3.5 h-3.5 text-[#667085]" />
                  <span>In vé giấy (Tùy chọn)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRecentVisit(null)}
                  className="p-2 rounded-lg text-[#667085] hover:text-[#17202E] hover:bg-[#D1FADF] transition-colors cursor-pointer"
                  title="Đóng thông báo lượt xe này"
                >
                  <X className="w-4 h-4" />
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
                      maxLength={12}
                      value={driverIdCard}
                      onChange={(e) => {
                        setDriverIdCard(e.target.value.replace(/[^\d]/g, '').slice(0, 12));
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
                            <span>Đúng chuẩn (4 chữ + 7 số)</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3 h-3" />
                            <span>{containerNo.length}/11 ký tự (4 chữ + 7 số)</span>
                          </>
                        )}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={containerNo}
                    onChange={(e) => setContainerNo(sanitizeContainerInput(e.target.value))}
                    placeholder="VD: MSKU1234567 hoặc BMOU9876543"
                    className="w-full h-10 px-3 font-mono font-bold text-sm bg-white text-[#17202E] placeholder-[#98A2B3] border border-[#E5E9F0] rounded-lg focus:outline-none focus:border-[#326DD8]"
                  />
                  {containerNo && !contValidation.isValidFormat && (
                    <p className="text-[11px] text-[#B54708]">
                      Cần đúng chuẩn: 4 chữ cái đầu (mã hãng) + 7 chữ số sau (VD: MSKU1234567).
                    </p>
                  )}
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
                      <label className="text-[11px] font-semibold text-[#475467] flex items-center justify-between">
                        <span>Mã số Container #2 <span className="text-[#D92D20]">*</span></span>
                        {secondContainerNo.trim() && (
                          <span className={`text-[10px] font-semibold ${/^[A-Z]{4}[0-9]{7}$/.test(secondContainerNo.trim().toUpperCase()) ? 'text-[#0A9444]' : 'text-[#B54708]'}`}>
                            {/^[A-Z]{4}[0-9]{7}$/.test(secondContainerNo.trim().toUpperCase()) ? 'Đúng chuẩn' : `${secondContainerNo.length}/11 ký tự`}
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={11}
                        value={secondContainerNo}
                        onChange={(e) => setSecondContainerNo(sanitizeContainerInput(e.target.value))}
                        placeholder="VD: TCLU1234567"
                        className="w-full h-9 px-3 font-mono font-bold text-xs bg-white text-[#17202E] border border-[#E5E9F0] rounded-lg focus:outline-none focus:border-[#326DD8]"
                      />
                      {secondContainerNo && !/^[A-Z]{4}[0-9]{7}$/.test(secondContainerNo.trim().toUpperCase()) && (
                        <p className="text-[10px] text-[#B54708]">
                          Cần đúng chuẩn: 4 chữ cái đầu + 7 chữ số sau (VD: TCLU1234567).
                        </p>
                      )}
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
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-white text-xs font-semibold transition-colors cursor-pointer shadow-2xs disabled:bg-[#E5E9F0] disabled:text-[#98A2B3] ${
                !isOnline
                  ? 'bg-[#B54708] hover:bg-[#93370D]'
                  : 'bg-[#087C3C] hover:bg-[#076934]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{isOnline ? 'Đang xử lý giao dịch...' : 'Đang lưu vào bộ nhớ bốt...'}</span>
                </>
              ) : !isOnline ? (
                <>
                  <CloudOff className="w-4 h-4" />
                  <span>Lưu nháp ngoại tuyến (Mất mạng)</span>
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
          {/* Lượt xe vừa chọn từ danh sách gần đây */}
          {selectedRecentVehicle && (
            <div className="p-3 bg-[#F8F9FB] rounded-xl border border-[#D0E1FD] space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E9F0]">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#326DD8]" />
                  <span className="font-mono font-bold text-xs text-[#17202E]">
                    {selectedRecentVehicle.license_plate}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecentVehicle(null)}
                  className="text-[11px] text-[#667085] hover:text-[#17202E] cursor-pointer"
                >
                  Bỏ chọn
                </button>
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-[#667085]">
                  <span>Mã vé:</span>
                  <span className="font-mono font-semibold text-[#17202E]">
                    {selectedRecentVehicle.ticket_code || 'Chưa cấp'}
                  </span>
                </div>
                <div className="flex justify-between text-[#667085]">
                  <span>Loại xe:</span>
                  <span className="font-medium text-[#17202E]">
                    {getVehicleTypeName(selectedRecentVehicle.vehicle_type)}
                  </span>
                </div>
                <div className="flex justify-between text-[#667085]">
                  <span>Vào bãi:</span>
                  <span className="font-mono text-[#17202E]">
                    {new Date(selectedRecentVehicle.entry_at).toLocaleTimeString('vi-VN')} {new Date(selectedRecentVehicle.entry_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <div className="flex justify-between text-[#667085]">
                  <span>Tiền vé:</span>
                  <span className="font-mono font-bold text-[#0A9444]">
                    {selectedRecentVehicle.ticket_amount ? `${selectedRecentVehicle.ticket_amount.toLocaleString('vi-VN')} đ` : '0 đ'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const matchingCont = activeContainers.find(c => c.inbound_vehicle_visit_id === selectedRecentVehicle.id);
                  setRecentVisit({
                    vehicle: selectedRecentVehicle,
                    container: matchingCont,
                  });
                  setShowPrintTicketModal(true);
                }}
                className="w-full py-2 px-3 bg-white border border-[#CBD5E1] hover:bg-[#F8F9FB] text-[#344054] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-[#667085]" />
                <span>In vé giấy (Tùy chọn)</span>
              </button>
            </div>
          )}

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
      {showPrintTicketModal && recentVisit && (
        <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in print:p-0 print:bg-white">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 border border-[#E5E9F0] shadow-2xl space-y-4 print:border-none print:shadow-none print:max-w-none print:p-0">
            {/* Header điều khiển (ẩn khi in) */}
            <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 print:hidden">
              <span className="text-xs font-bold text-[#17202E] flex items-center gap-1.5 uppercase tracking-wider">
                <Printer className="w-4 h-4 text-[#0A9444]" />
                Xem trước & In vé xe (Tùy chọn)
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
                    (Dữ liệu đã lưu điện tử — Cấp vé giấy theo yêu cầu)
                  </p>
                </div>
              </div>

              {/* Thông tin vé */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#667085]">Mã số vé vào bãi:</span>
                  <span className="font-mono font-bold text-sm text-[#0A9444]">
                    {recentVisit.vehicle.ticket_code || 'SC-IN-000000'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#667085]">Biển số phương tiện:</span>
                  <span className="font-mono font-bold text-sm text-[#17202E] px-2 py-0.5 bg-white border border-[#E5E9F0] rounded">
                    {recentVisit.vehicle.license_plate}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#667085]">Loại phương tiện:</span>
                  <span className="font-medium text-[#17202E]">
                    {getVehicleTypeName(recentVisit.vehicle.vehicle_type)}
                  </span>
                </div>

                {recentVisit.container && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#667085]">Container kéo theo:</span>
                    <span className="font-mono font-bold text-xs text-[#326DD8]">
                      {recentVisit.container.container_no_current} ({formatContainerSpec(recentVisit.container.container_size, recentVisit.container.container_type)})
                    </span>
                  </div>
                )}

                {recentVisit.secondContainer && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#667085]">Container #2 (20ft):</span>
                    <span className="font-mono font-bold text-xs text-[#326DD8]">
                      {recentVisit.secondContainer.container_no_current}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[#667085]">Thời gian xe vào cổng:</span>
                  <span className="font-mono font-medium text-[#17202E]">
                    {new Date(recentVisit.vehicle.entry_at).toLocaleTimeString('vi-VN')} — {new Date(recentVisit.vehicle.entry_at).toLocaleDateString('vi-VN')}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#E5E9F0] flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#17202E]">Tiền vé vào bãi:</span>
                  <span className="font-mono font-bold text-base text-[#0A9444]">
                    {recentVisit.vehicle.ticket_amount !== null && recentVisit.vehicle.ticket_amount > 0
                      ? `${recentVisit.vehicle.ticket_amount.toLocaleString('vi-VN')} đ`
                      : '0 đ (Miễn phí)'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#667085]">Trạng thái thanh toán:</span>
                  <span className="font-semibold text-[#0A9444]">
                    {recentVisit.vehicle.ticket_payment_status === 'PAID'
                      ? 'ĐÃ THU TIỀN VÉ TẠI CỔNG VÀO'
                      : (recentVisit.vehicle.ticket_payment_status === 'EXEMPT' ? 'MIỄN PHÍ VÉ CỔNG' : 'CHƯA THU (THU TẠI CỔNG RA)')}
                  </span>
                </div>
              </div>

              {/* Footer lưu ý & QR */}
              <div className="pt-3 border-t border-dashed border-[#CBD5E1] text-center space-y-1">
                <p className="text-[10px] text-[#667085] leading-relaxed">
                  Lượt xe đã được ghi nhận trên hệ thống phần mềm quản lý bến bãi.<br />
                  Đối chiếu cổng ra tự động theo biển số xe. Cước lưu bãi tính theo quy định niêm yết.
                </p>
                <p className="text-[9px] font-mono text-[#98A2B3] pt-1">
                  In lúc: {new Date().toLocaleTimeString('vi-VN')} {new Date().toLocaleDateString('vi-VN')} · Bốt An ninh Cổng vào
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 5. MODAL HÀNG ĐỢI NHÁP NGOẠI TUYẾN KHI MẤT MẠNG               */}
      {/* ============================================================== */}
      {showDraftQueueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-[#E5E9F0] max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-[#E5E9F0] flex items-center justify-between bg-[#F8F9FB]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#E0F2FE] border border-[#B9E6FE] flex items-center justify-center text-[#026AA2]">
                  <ListChecks className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#17202E]">
                      Hàng đợi Tiếp nhận Ngoại tuyến (Offline Queue)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
                      {offlineDrafts.length} lượt xe
                    </span>
                  </div>
                  <p className="text-xs text-[#667085]">
                    Dữ liệu được lưu tạm tại trình duyệt máy bốt gác khi mất kết nối mạng.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDraftQueueModal(false)}
                className="p-1.5 rounded-lg text-[#667085] hover:bg-[#E5E9F0] hover:text-[#17202E] transition-colors cursor-pointer"
                title="Đóng modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quy chế vận hành & trạng thái mạng */}
            <div className="px-6 py-3 bg-[#FEF6EE] border-b border-[#FEE4E2] flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-[#B54708] shrink-0 mt-0.5" />
              <div className="text-xs text-[#7A2E0E] leading-relaxed">
                <span className="font-semibold">Quy chế Sơn Cảng V5:</span> Khi bốt gác mất mạng, nhân viên bấm lưu nháp để giải phóng xe vào bãi ngay, tránh ùn tắc cổng. Khi có mạng trở lại, bấm <strong>Đồng bộ tất cả</strong> để cập nhật lên máy chủ. Hệ thống dùng Idempotency Key bảo đảm không phát sinh trùng lặp.
              </div>
            </div>

            {/* Danh sách các lượt xe nháp */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3">
              {offlineDrafts.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-[#087C3C] mx-auto opacity-80" />
                  <p className="text-sm font-semibold text-[#17202E]">
                    Hàng đợi ngoại tuyến trống
                  </p>
                  <p className="text-xs text-[#667085]">
                    Tất cả các lượt xe tiếp nhận đều đã được ghi nhận trực tiếp lên máy chủ.
                  </p>
                </div>
              ) : (
                <div className="border border-[#E5E9F0] rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8F9FB] border-b border-[#E5E9F0] text-[#667085] font-semibold">
                      <tr>
                        <th className="p-3">Giờ lưu / Biển số</th>
                        <th className="p-3">Loại xe & Cont</th>
                        <th className="p-3">Tiền vé</th>
                        <th className="p-3">Trạng thái</th>
                        <th className="p-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E9F0]">
                      {offlineDrafts.map((draft) => {
                        const isThisSyncing = syncingDraftId === draft.id || isSyncingAll;
                        return (
                          <tr key={draft.id} className="hover:bg-[#F8F9FB]/60 transition-colors">
                            <td className="p-3 align-top">
                              <div className="font-mono font-bold text-sm text-[#17202E]">
                                {draft.licensePlate}
                              </div>
                              <div className="text-[11px] text-[#667085] flex items-center gap-1 mt-0.5">
                                <Clock className="w-3 h-3" />
                                {new Date(draft.createdAt).toLocaleTimeString('vi-VN')}
                              </div>
                              {draft.driverName && (
                                <div className="text-[11px] text-[#475467] mt-0.5">
                                  TX: {draft.driverName}
                                </div>
                              )}
                            </td>
                            <td className="p-3 align-top space-y-1">
                              <div className="font-medium text-[#17202E]">
                                {getVehicleTypeName(draft.vehicleType)}
                              </div>
                              {draft.containerNo && (
                                <div className="font-mono font-semibold text-[11px] text-[#326DD8]">
                                  Cont 1: {draft.containerNo} ({draft.containerType || 'RF'})
                                </div>
                              )}
                              {draft.secondContainerNo && (
                                <div className="font-mono font-semibold text-[11px] text-[#326DD8]">
                                  Cont 2: {draft.secondContainerNo}
                                </div>
                              )}
                            </td>
                            <td className="p-3 align-top">
                              <div className="font-mono font-bold text-[#17202E]">
                                {draft.ticketAmount.toLocaleString('vi-VN')} đ
                              </div>
                              <div className="text-[11px] text-[#667085]">
                                {draft.paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản VietQR'}
                              </div>
                            </td>
                            <td className="p-3 align-top">
                              {draft.status === 'PENDING' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF6EE] text-[#B54708] border border-[#FEE4E2]">
                                  Chờ đồng bộ
                                </span>
                              )}
                              {draft.status === 'SYNCING' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EFF8FF] text-[#175CD3] border border-[#B2DDFF]">
                                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                                  Đang gửi...
                                </span>
                              )}
                              {draft.status === 'FAILED' && (
                                <div className="space-y-0.5">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF3F2] text-[#B42318] border border-[#FECDCA]">
                                    Lỗi đồng bộ
                                  </span>
                                  {draft.errorMessage && (
                                    <div className="text-[10px] text-[#B42318] max-w-[180px] truncate" title={draft.errorMessage}>
                                      {draft.errorMessage}
                                    </div>
                                  )}
                                </div>
                              )}
                              {draft.status === 'SYNCED' && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#ECFDF3] text-[#027A48] border border-[#A6F4C5]">
                                  Đã đồng bộ
                                </span>
                              )}
                            </td>
                            <td className="p-3 align-top text-right space-x-1">
                              <button
                                type="button"
                                onClick={() => handleSyncDraft(draft)}
                                disabled={!isOnline || isThisSyncing}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#087C3C] text-white text-[11px] font-semibold hover:bg-[#076934] transition-colors cursor-pointer disabled:bg-[#E5E9F0] disabled:text-[#98A2B3]"
                                title="Đồng bộ lượt xe này lên máy chủ"
                              >
                                {isThisSyncing ? (
                                  <RefreshCw className="w-3 h-3 animate-spin" />
                                ) : (
                                  <UploadCloud className="w-3 h-3" />
                                )}
                                <span>Đồng bộ</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Xác nhận xóa nháp xe ${draft.licensePlate}? Thao tác này sẽ hủy lượt xe này khỏi máy bốt.`)) {
                                    removeOfflineDraft(draft.id);
                                  }
                                }}
                                disabled={isThisSyncing}
                                className="inline-flex items-center p-1.5 rounded-md border border-[#E5E9F0] text-[#B42318] hover:bg-[#FEF3F2] transition-colors cursor-pointer disabled:opacity-50"
                                title="Xóa nháp này nếu nhập nhầm"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-[#E5E9F0] bg-[#F8F9FB] flex items-center justify-between">
              <div>
                {offlineDrafts.some(d => d.status === 'SYNCED') && (
                  <button
                    type="button"
                    onClick={() => clearSyncedDrafts()}
                    className="text-xs text-[#667085] hover:text-[#17202E] underline cursor-pointer"
                  >
                    Xóa các lượt đã đồng bộ xong
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDraftQueueModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#E5E9F0] text-xs font-semibold text-[#17202E] hover:bg-white transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                {offlineDrafts.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSyncAllDrafts}
                    disabled={!isOnline || isSyncingAll}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#087C3C] text-white text-xs font-semibold hover:bg-[#076934] transition-colors cursor-pointer disabled:bg-[#E5E9F0] disabled:text-[#98A2B3]"
                  >
                    {isSyncingAll ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang đồng bộ tất cả...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Đồng bộ tất cả ({offlineDrafts.length} xe)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
