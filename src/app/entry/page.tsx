'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { SEED_VEHICLE_TYPES_V5 } from '@/lib/services/yard-service';
import { VehicleType, VehicleVisit, ContainerVisit, ReeferRequest, VehicleDuplicateCheckResult, TariffItem } from '@/types/domain.types';
import { validateContainerNumber } from '@/lib/container-validator';
import { 
  Truck, 
  Container as ContainerIcon, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ShieldAlert, 
  ArrowRight,
  Lock,
  CreditCard,
  QrCode,
  ScanLine,
  X,
  Clock,
  LayoutDashboard,
  Banknote,
  Printer,
  Zap,
  CopyCheck,
  AlertOctagon,
  Info,
  LogOut
} from 'lucide-react';
import { getVehicleTypeName, formatContainerSpec, formatMoneyInWords, getContainerTypeName } from '@/lib/display-formatters';
import { generateVietQrUrl } from '@/lib/vietqr-generator';

export default function EntryGatePage() {
  const { user, yardId, can, repository, authMode } = useAuth();

  // Kiểm tra quyền tiếp nhận xe theo mã chuẩn RBAC V5 (vehicle.visit.create)
  const isAllowed = can('vehicle.visit.create');

  // Form State
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>(() => SEED_VEHICLE_TYPES_V5);
  const [selectedType, setSelectedType] = useState<string>('CONT_LANH');
  const [licensePlate, setLicensePlate] = useState<string>('');
  const [driverName, setDriverName] = useState<string>('');
  const [driverPhone, setDriverPhone] = useState<string>('');
  const [driverIdCard, setDriverIdCard] = useState<string>('');
  const [note, setNote] = useState<string>('');

  // Quét mã QR CCCD (chuẩn chip Việt Nam)
  const [showIdCardScanner, setShowIdCardScanner] = useState<boolean>(false);
  const [scannerRawInput, setScannerRawInput] = useState<string>('');
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string>('');

  // Form Container khi loại xe là Container lạnh
  const [containerCarryMode, setContainerCarryMode] = useState<'SINGLE' | 'DUAL_20FT'>('SINGLE');
  const [containerNo, setContainerNo] = useState<string>('');
  const [containerSize, setContainerSize] = useState<string>('40');
  const [containerType, setContainerType] = useState<string>('RF');

  // Container thứ 2 (khi xe cõng 2 container 20ft)
  const [secondContainerNo, setSecondContainerNo] = useState<string>('');
  const [secondContainerType, setSecondContainerType] = useState<string>('RF');

  // Danh sách yêu cầu cắm điện dự kiến do CCKB tiếp nhận trước
  const [plannedReeferRequests, setPlannedReeferRequests] = useState<ReeferRequest[]>([]);
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);

  // Danh sách Container & Phương tiện đang lưu bãi (IN_YARD) để kiểm tra trùng lặp tức thì (as-you-type)
  const [activeContainers, setActiveContainers] = useState<ContainerVisit[]>([]);
  const [activeVehicles, setActiveVehicles] = useState<VehicleVisit[]>([]);
  const [allKnownVehicles, setAllKnownVehicles] = useState<VehicleVisit[]>([]);

  // Ghi nhận thu tiền vé cổng trực tiếp tại bốt gác An ninh (Quyền SEC_STAFF)
  const [collectPaymentNow, setCollectPaymentNow] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [receiptCode, setReceiptCode] = useState<string>('');

  // Status & Protection
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successResult, setSuccessResult] = useState<{
    vehicle: VehicleVisit;
    container?: ContainerVisit;
    secondContainer?: ContainerVisit;
    containers?: ContainerVisit[];
  } | null>(null);

  // Modal In Vé Vào Cổng
  const [showPrintTicketModal, setShowPrintTicketModal] = useState<boolean>(false);

  // Kiểm soát Trùng lặp Phương tiện chuyên sâu
  const [dupCheckResult, setDupCheckResult] = useState<VehicleDuplicateCheckResult | null>(null);
  const [isCheckingDup, setIsCheckingDup] = useState<boolean>(false);
  const [showDupModal, setShowDupModal] = useState<boolean>(false);
  const [showBlockModal, setShowBlockModal] = useState<boolean>(false);
  const [overrideReasonCode, setOverrideReasonCode] = useState<string>('XE_BO_CHAY_CHUYEN_MOI');
  const [customReasonText, setCustomReasonText] = useState<string>('');
  const [closePreviousOnEntry, setClosePreviousOnEntry] = useState<boolean>(true);

  // Đếm ngược tự động làm mới đón xe tiếp theo (Công thái học bến bãi)
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  // Hàm tải dữ liệu trạng thái xe & container đang trong bãi
  const loadYardActiveData = React.useCallback(async () => {
    try {
      const [cList, vList] = await Promise.all([
        repository.getContainers(yardId),
        repository.getVehicles(yardId),
      ]);
      setAllKnownVehicles(vList);
      setActiveContainers(cList.filter(c => c.status === 'IN_YARD'));
      setActiveVehicles(vList.filter(v => v.status === 'IN_YARD'));
    } catch (err) {
      console.warn('Lỗi nạp danh sách xe/cont đang trong bãi:', err);
    }
  }, [repository, yardId]);

  // Gợi ý thông tin tài xế quen tự động từ lịch sử xe cũ
  const suggestedDriver = React.useMemo(() => {
    const clean = licensePlate.trim().toUpperCase();
    if (clean.length < 3) return null;
    const match = allKnownVehicles.find(
      v => v.license_plate?.trim().toUpperCase() === clean && (v.driver_name || v.driver_phone)
    );
    if (!match) return null;
    if (driverName === match.driver_name && driverPhone === (match.driver_phone || '')) return null;
    return {
      driverName: match.driver_name || '',
      driverPhone: match.driver_phone || '',
    };
  }, [licensePlate, allKnownVehicles, driverName, driverPhone]);

  // Kiểm tra trùng lặp Container 1 tức thì (As-You-Type)
  const duplicateContainer = React.useMemo(() => {
    const clean = containerNo.trim().toUpperCase();
    if (clean.length < 4) return null;
    return activeContainers.find(c => c.container_no_current === clean && c.status === 'IN_YARD') || null;
  }, [containerNo, activeContainers]);

  // Kiểm tra trùng lặp Container 2 tức thì (As-You-Type)
  const duplicateSecondContainer = React.useMemo(() => {
    const clean2 = secondContainerNo.trim().toUpperCase();
    if (clean2.length < 4) return null;
    const clean1 = containerNo.trim().toUpperCase();
    if (clean2 === clean1) {
      return { isDuplicateWithFirst: true, container: null };
    }
    const found = activeContainers.find(c => c.container_no_current === clean2 && c.status === 'IN_YARD');
    return found ? { isDuplicateWithFirst: false, container: found } : null;
  }, [secondContainerNo, containerNo, activeContainers]);

  // Kiểm tra trùng xe local nhanh tức thì (0ms)
  const localDuplicateVehicle = React.useMemo(() => {
    const clean = licensePlate.trim().toUpperCase();
    if (clean.length < 3) return null;
    return activeVehicles.find(v => v.license_plate?.trim().toUpperCase() === clean && v.status === 'IN_YARD') || null;
  }, [licensePlate, activeVehicles]);

  // Kiểm tra trùng lặp phương tiện thời gian thực (Debounce 300ms)
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

  // Tải danh mục loại xe, yêu cầu điện dự kiến và danh sách xe/cont đang trong bãi
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      repository.getVehicleTypes(),
      repository.getReeferRequests(yardId),
      repository.getTariffs(),
      repository.getContainers(yardId),
      repository.getVehicles(yardId),
    ]).then(([types, reqs, tariffList, cList, vList]) => {
      if (isMounted) {
        if (types.length > 0) setVehicleTypes(types);
        if (reqs.length > 0) setPlannedReeferRequests(reqs);
        if (tariffList.length > 0) setTariffs(tariffList);
        setActiveContainers(cList.filter(c => c.status === 'IN_YARD'));
        setActiveVehicles(vList.filter(v => v.status === 'IN_YARD'));
      }
    }).catch(err => {
      console.warn('Lỗi nạp dữ liệu cổng vào:', err);
    });

    return () => { isMounted = false; };
  }, [repository, yardId]);

  // So khớp Yêu cầu cắm điện trước từ CCKB (Pre-arrival Reefer Request)
  const matchedReeferRequest = React.useMemo(() => {
    if (!plannedReeferRequests.length) return null;
    const cleanPlate = licensePlate.trim().toUpperCase();
    const cleanCont1 = containerNo.trim().toUpperCase();
    const cleanCont2 = secondContainerNo.trim().toUpperCase();

    return plannedReeferRequests.find((req) => {
      if (req.status !== 'PLANNED') return false;
      const plannedCont = (req.container_no || req.container_no_planned || '').trim().toUpperCase();
      const plannedPlate = req.expected_license_plate?.trim().toUpperCase();

      // Khớp biển số xe
      if (cleanPlate && plannedPlate && cleanPlate === plannedPlate) return true;

      // Khớp cont 1 (chính xác số container đầy đủ theo quy tắc AGENTS.md)
      if (cleanCont1.length >= 4 && cleanCont1 === plannedCont) return true;

      // Khớp cont 2 (chính xác số container đầy đủ theo quy tắc AGENTS.md)
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

  // Effect tự động đếm ngược làm mới form sau khi tạo phiếu thành công
  useEffect(() => {
    if (countdown === null || isPaused) return;

    if (countdown <= 0) {
      resetForm();
      return;
    }

    const timer = setTimeout(() => {
      setCountdown(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, isPaused]);

  // Trích xuất tự động thông tin từ chuỗi mã QR CCCD gắn chip
  const parseAndApplyCccdData = (rawText: string) => {
    const text = rawText.trim();
    if (text.includes('|')) {
      const parts = text.split('|');
      if (parts.length >= 3) {
        const cccdNumber = parts[0]?.trim();
        const fullName = parts[2]?.trim();
        if (cccdNumber) setDriverIdCard(cccdNumber);
        if (fullName) setDriverName(fullName);
        setScanSuccessMsg(`Đã trích xuất thành công: CCCD ${cccdNumber} - ${fullName}`);
        setShowIdCardScanner(false);
        setScannerRawInput('');
        return true;
      }
    }
    setDriverIdCard(text);
    return false;
  };

  // Chỉ DUY NHẤT loại xe Container lạnh mới có mang container
  const currentVehicleType = vehicleTypes.find(t => t.code === selectedType);
  const isContainerType = selectedType === 'CONT_LANH';
  const contTariffAmount = tariffs.find(t => t.code === 'VE_CONT_LANH')?.amount ?? 250000;
  const previewAmount: number | null = isContainerType 
    ? contTariffAmount 
    : (selectedType === 'DAU_KEO' ? 0 : (currentVehicleType?.default_ticket_amount ?? 0));

  // Kiểm tra số container theo thời gian thực
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
      // Gọi giao dịch tiếp nhận (nguyên tử xe + container nếu là loại xe chở container)
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
        collectPaymentNow: previewAmount && previewAmount > 0 ? collectPaymentNow : false,
        paymentMethod: previewAmount && previewAmount > 0 && collectPaymentNow ? paymentMethod : undefined,
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

      // Nếu có yêu cầu cắm điện trước từ CCKB khớp, tự động liên kết phiếu
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

      // Hoàn tất thành công (cả xe và container nếu có)
      setSuccessResult({
        vehicle: res.vehicle,
        container: res.container || undefined,
        secondContainer: res.secondContainer || undefined,
        containers: res.containers || (res.container ? [res.container] : []),
      });
      // Làm mới danh sách xe và container đang trong bãi để kiểm tra trùng tức thì
      loadYardActiveData();
      setCountdown(8);
      setIsPaused(false);
      setIsSubmitting(false);
      setShowDupModal(false);
      setShowBlockModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi giao dịch bến bãi.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensePlate.trim()) {
      setErrorMessage('Vui lòng nhập biển số xe vào cổng.');
      return;
    }

    if (isContainerType) {
      if (!containerNo.trim()) {
        setErrorMessage('Loại xe Container yêu cầu nhập mã số container.');
        return;
      }
      if (!contValidation.isValidFormat) {
        setErrorMessage(`Mã số container chưa đúng định dạng: ${contValidation.message}`);
        return;
      }

      // Chặn trùng lặp Container 1 với cont đang lưu bãi
      if (duplicateContainer) {
        setErrorMessage(
          `Cảnh báo trùng số container: Container ${duplicateContainer.container_no_current} hiện đang có một lượt lưu bãi khác ở trạng thái IN_YARD trong cùng bãi. Không tự động gộp lượt. Vui lòng xác minh thực tế.`
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
          setErrorMessage(`Mã số Container thứ hai chưa đúng định dạng: ${cont2Validation.message}`);
          return;
        }
        if (duplicateSecondContainer?.isDuplicateWithFirst) {
          setErrorMessage('Mã số Container #1 và Container #2 không được trùng nhau.');
          return;
        }
        if (duplicateSecondContainer?.container) {
          setErrorMessage(
            `Cảnh báo trùng số container: Container thứ hai ${duplicateSecondContainer.container.container_no_current} hiện đang có lượt lưu bãi IN_YARD trong bãi. Vui lòng xác minh thực tế.`
          );
          return;
        }
      }
    }

    // KIỂM TRA TRÙNG LẶP PHƯƠNG TIỆN CHUYÊN SÂU
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

  if (!isAllowed) {
    return (
      <div className="bg-white rounded p-6 sm:p-8 border border-slate-300 text-center max-w-lg mx-auto shadow-2xs">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Chưa được cấp quyền tiếp nhận xe</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Tài khoản <strong>{user?.roleName || 'Chưa chọn vai trò'}</strong> chưa được phân công nhiệm vụ tiếp nhận xe tại cổng. Vui lòng chuyển sang ca trực An ninh hoặc liên hệ quản trị viên.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl xl:max-w-6xl mx-auto space-y-4">
      {/* Tiêu đề & Thông tin bãi */}
      <div className="bg-white rounded-lg p-4 border border-slate-300 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#0A9444]">
              Quy trình Cổng vào (An ninh)
            </span>
            <h1 className="text-base sm:text-lg font-bold text-[#223873] mt-0.5">
              Tiếp nhận Phương tiện & Container
            </h1>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Trực ca</span>
            <div className="text-xs font-bold text-slate-800">{user?.fullName}</div>
          </div>
        </div>

        {/* THÔNG BÁO VẬN HÀNH & QUY TẮC VÉ CỔNG */}
        {process.env.NEXT_PUBLIC_ENABLE_REAL_WRITE !== 'true' && authMode === 'REAL' ? (
          <div className="mt-3 p-2.5 rounded bg-blue-50 border border-blue-200 text-blue-950 text-xs">
            <div className="flex items-start space-x-2">
              <Lock className="w-4 h-4 text-[#223873] shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-bold text-[#223873]">Bản thử nghiệm:</strong>
                <span className="text-[11px] ml-1 text-slate-700">
                  Chức năng lưu dữ liệu hiện chưa được mở. Vui lòng chuyển sang Chế độ mô phỏng để trải nghiệm đầy đủ quy trình tiếp nhận.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3 p-2.5 rounded bg-amber-50 border border-amber-300 text-amber-900 text-xs">
            <div className="flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <strong className="font-bold text-amber-950">Quy định vé cổng:</strong>
                <div className="text-[11px] mt-0.5 text-amber-800">
                  Xe chở container vào bãi áp dụng vé <strong>250.000đ</strong>; Đầu kéo vào không container áp dụng vé <strong>0đ (Miễn phí)</strong>. Hệ thống tự động kiểm soát đúng loại vé theo thực tế phương tiện.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* THÔNG BÁO TIẾP NHẬN THÀNH CÔNG */}
      {successResult ? (
        <div className="max-w-xl mx-auto bg-white rounded-lg p-5 border border-emerald-400 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 text-emerald-700">
            <CheckCircle2 className="w-7 h-7 text-[#0A9444] shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Tiếp nhận xe vào bãi thành công!</h2>
              <div className="text-xs text-slate-600">Mã vé: <strong className="font-mono text-slate-900">{successResult.vehicle.ticket_code}</strong></div>
            </div>
          </div>

          <div className="bg-slate-50 rounded p-3 border border-slate-300 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Biển số xe:</span>
              <span className="font-mono font-bold text-slate-900 text-sm">{successResult.vehicle.license_plate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Loại phương tiện:</span>
              <span className="font-semibold text-slate-800">
                {getVehicleTypeName(successResult.vehicle.vehicle_type_name || successResult.vehicle.vehicle_type)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Tiền vé cổng:</span>
              <div className="text-right">
                <span className="font-bold text-[#0A9444] text-sm">
                  {successResult.vehicle.ticket_amount !== null
                    ? `${successResult.vehicle.ticket_amount.toLocaleString('vi-VN')} đ`
                    : 'Chưa thiết lập'}
                </span>
                <span className={`ml-2 text-[10px] px-2 py-0.5 rounded font-bold ${
                  successResult.vehicle.ticket_payment_status === 'PAID'
                    ? 'bg-emerald-100 text-[#0A9444] border border-emerald-300'
                    : successResult.vehicle.ticket_payment_status === 'EXEMPT'
                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                }`}>
                  {successResult.vehicle.ticket_payment_status === 'PAID'
                    ? `ĐÃ THU (${paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'})`
                    : successResult.vehicle.ticket_payment_status === 'EXEMPT'
                    ? 'Miễn phí hợp lệ'
                    : 'Chưa thu tiền (Ghi nợ)'}
                </span>
              </div>
            </div>
            {receiptCode.trim() && (
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Số biên lai / Vé giấy:</span>
                <span className="font-mono font-bold text-slate-800">{receiptCode.trim()}</span>
              </div>
            )}
            {successResult.containers && successResult.containers.length > 0 ? (
              <div className="pt-2 border-t border-slate-200 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Container đi kèm ({successResult.containers.length}):</span>
                  {successResult.containers.length > 1 && (
                    <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded border border-purple-200">
                      Cặp 2 vỏ 20 Feet
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {successResult.containers.map((c, idx) => (
                    <div
                      key={c.id || idx}
                      className="font-bold text-blue-900 bg-blue-50/80 px-2.5 py-1.5 rounded border border-blue-200 flex items-center justify-between"
                    >
                      <span className="text-[11px] text-blue-600 font-semibold mr-1">Cont #{idx + 1}:</span>
                      <span className="font-mono">{c.container_no_current}</span>
                      <span className="text-[11px] text-slate-500 font-medium ml-1">({formatContainerSpec(c.container_size, c.container_type)})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : successResult.container ? (
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">Container đi kèm:</span>
                <span className="font-bold font-mono text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {successResult.container.container_no_current} ({formatContainerSpec(successResult.container.container_size, successResult.container.container_type)})
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span>Thời gian vào:</span>
              <span>{new Date(successResult.vehicle.entry_at).toLocaleTimeString('vi-VN')} {new Date(successResult.vehicle.entry_at).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          {/* THANH ĐẾM NGƯỢC TỰ ĐỘNG LÀM MỚI (CÔNG THÁI HỌC CỔNG VÀO) */}
          <div className="bg-emerald-50 rounded p-2.5 border border-emerald-300 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-emerald-900">
                <Clock className="w-4 h-4 text-[#0A9444] shrink-0" />
                <span>
                  {isPaused ? (
                    <span className="font-semibold text-slate-700">Đã tạm dừng đếm ngược tự động làm mới.</span>
                  ) : (
                    <span>
                      Tự động sẵn sàng đón xe tiếp theo sau: <strong className="text-emerald-700 font-bold text-sm">{countdown ?? 0}s</strong>
                    </span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPaused(!isPaused)}
                className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline px-2 py-0.5 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
              >
                {isPaused ? 'Tiếp tục đếm' : 'Giữ màn hình'}
              </button>
            </div>

            {!isPaused && countdown !== null && (
              <div className="w-full bg-emerald-200/60 rounded h-1.5 overflow-hidden">
                <div 
                  className="bg-[#0A9444] h-1.5 transition-all duration-1000 ease-linear rounded"
                  style={{ width: `${Math.max(0, Math.min(100, (countdown / 8) * 100))}%` }}
                />
              </div>
            )}
          </div>

          {/* CÁC THAO TÁC HÀNH ĐỘNG NHANH */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsPaused(true);
                  setShowPrintTicketModal(true);
                }}
                className="py-2 px-3 rounded font-bold text-xs text-[#223873] bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#223873]" />
                <span>In vé cổng vào</span>
              </button>

              <button
                type="button"
                onClick={resetForm}
                className="py-2 px-3 rounded font-bold text-xs text-white bg-[#0A9444] hover:bg-[#087C3C] transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Đón xe tiếp theo</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/yard"
                className="py-1.5 px-3 rounded font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center justify-center space-x-1.5 text-center"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Xem xe trong Bãi →</span>
              </Link>
              <Link
                href="/dashboard"
                className="py-1.5 px-3 rounded font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors flex items-center justify-center space-x-1.5 text-center"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Xem Tổng quan →</span>
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* FORM NHẬP TIẾP NHẬN BỐ CỤC 2 CỘT CÔNG THÁI HỌC CẢNG BẾN BÃI */
        <form 
          onSubmit={handleSubmit} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSubmit(e as any);
            }
          }}
          className="bg-white rounded-lg p-4 sm:p-5 border border-slate-300 shadow-xs space-y-4"
        >
          {errorMessage && (
            <div className="p-3 rounded bg-rose-50 border border-rose-300 text-rose-800 text-xs font-semibold flex items-start space-x-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* GRID BỐ CỤC: 2 CỘT TRÊN MÁY TÍNH (7:5) — 1 CỘT TRÊN DI ĐỘNG */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-5 items-start">
            
            {/* CỘT TRÁI (lg:col-span-7): THÔNG TIN PHƯƠNG TIỆN & CONTAINER */}
            <div className="lg:col-span-7 space-y-3.5">
              {/* 1. BIỂN SỐ XE TRỌNG TÂM (HỖ TRỢ VIỆT NAM, TRUNG QUỐC, LÀO) */}
              <div className="p-3.5 rounded bg-slate-50 border border-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                    1. Biển số xe vào cổng <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">VN, TQ (桂A-12345), Lào...</span>
                </div>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => {
                    setLicensePlate(e.target.value.toUpperCase());
                    if (errorMessage) setErrorMessage('');
                  }}
                  placeholder="VD: 14C-123.45 hoặc 桂A-12345"
                  className={`w-full px-3.5 py-2 text-base font-bold tracking-wider text-[#223873] border rounded font-mono focus:outline-none bg-white shadow-2xs transition-colors ${
                    dupCheckResult?.has_duplicate || localDuplicateVehicle
                      ? 'border-amber-400 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
                      : 'border-slate-300 focus:border-[#0A9444] focus:ring-1 focus:ring-emerald-500'
                  }`}
                  required
                  autoFocus
                />
                {/* Phím bấm gõ nhanh ký tự biển số xe Trung Quốc phổ biến tại cửa khẩu Tà Lùng */}
                <div className="flex items-center gap-1.5 pt-0.5 overflow-x-auto text-[11px] text-slate-500">
                  <span className="shrink-0 text-slate-400 font-medium">Gõ nhanh biển TQ:</span>
                  {[
                    { label: '桂 (Quảng Tây)', char: '桂' },
                    { label: '粤 (Quảng Đông)', char: '粤' },
                    { label: '云 (Vân Nam)', char: '云' },
                    { label: '湘 (Hồ Nam)', char: '湘' },
                    { label: '挂 (Moóc)', char: '挂' },
                  ].map((item) => (
                    <button
                      key={item.char}
                      type="button"
                      onClick={() => {
                        setLicensePlate((prev) => item.char === '挂' ? `${prev}挂` : `${item.char}${prev}`);
                        if (errorMessage) setErrorMessage('');
                      }}
                      className="px-2 py-0.5 rounded bg-white hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 transition-colors cursor-pointer shrink-0"
                      title={`Bấm để chèn ${item.label}`}
                    >
                      +{item.char}
                    </button>
                  ))}
                </div>

                {/* GỢI Ý TỰ ĐỘNG THÔNG TIN TÀI XẾ QUEN TỪ LỊCH SỬ XE (CÔNG THÁI HỌC CỔNG VÀO) */}
                {suggestedDriver && (
                  <div className="p-2.5 rounded bg-blue-50 border border-blue-200 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base shrink-0">💡</span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-blue-900 truncate">
                          Tài xế quen đã lưu: {suggestedDriver.driverName}
                        </div>
                        <div className="text-[10px] text-blue-700 font-mono truncate">
                          SĐT: {suggestedDriver.driverPhone || 'Chưa lưu'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (suggestedDriver.driverName) setDriverName(suggestedDriver.driverName);
                        if (suggestedDriver.driverPhone) setDriverPhone(suggestedDriver.driverPhone);
                      }}
                      className="px-2.5 py-1 rounded bg-[#223873] hover:bg-[#1a2c5a] text-white font-bold text-[11px] shrink-0 cursor-pointer shadow-2xs transition-colors"
                      title="Bấm để tự động điền thông tin tài xế quen này"
                    >
                      Điền ngay ↵
                    </button>
                  </div>
                )}

                {/* CẢNH BÁO TRÙNG LẶP PHƯƠNG TIỆN THỜI GIAN THỰC */}
                {isCheckingDup && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 italic pt-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                    <span>Đang kiểm tra biển số trong bãi...</span>
                  </div>
                )}

                {/* Cảnh báo nhanh tức thì (0ms) từ bộ nhớ bãi nếu chưa có phản hồi debounce */}
                {!dupCheckResult?.has_duplicate && localDuplicateVehicle && (
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1 animate-in fade-in">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>PHÁT HIỆN BIỂN SỐ TRONG BÃI (IN_YARD)</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      Xe <strong>{localDuplicateVehicle.license_plate}</strong> hiện đang có lượt lưu bãi (vào lúc {new Date(localDuplicateVehicle.entry_at).toLocaleTimeString('vi-VN')} {new Date(localDuplicateVehicle.entry_at).toLocaleDateString('vi-VN')}).
                    </p>
                  </div>
                )}

                {dupCheckResult?.has_duplicate && (
                  <div className={`p-3 rounded-xl border text-xs space-y-1.5 animate-in fade-in ${
                    !dupCheckResult.can_proceed 
                      ? 'bg-rose-50 border-rose-300 text-rose-900' 
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        {!dupCheckResult.can_proceed ? (
                          <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-bold">
                            {!dupCheckResult.can_proceed 
                              ? 'CẢNH BÁO CHẶN: Phương tiện vi phạm chính sách bến bãi' 
                              : 'PHÁT HIỆN TRÙNG LẶP: Phương tiện đang có 1 lượt trong bãi'}
                          </p>
                          <p className="text-[11px] leading-relaxed mt-0.5">
                            {dupCheckResult.message}
                          </p>
                          {dupCheckResult.has_unpaid_ticket && (
                            <p className="text-[11px] font-bold text-rose-700 mt-0.5">
                              ⚠️ Chú ý: Lượt xe cũ chưa thanh toán vé vào cổng ({dupCheckResult.existing_visit?.ticket_amount?.toLocaleString('vi-VN')} đ).
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!dupCheckResult.can_proceed) {
                            setShowBlockModal(true);
                          } else {
                            setShowDupModal(true);
                          }
                        }}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 border transition-colors cursor-pointer ${
                          !dupCheckResult.can_proceed
                            ? 'bg-rose-100 hover:bg-rose-200 text-rose-800 border-rose-300'
                            : 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                        }`}
                      >
                        {!dupCheckResult.can_proceed ? 'Chi tiết chặn' : 'Xử lý ghi đè'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. CHỌN LOẠI PHƯƠNG TIỆN */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-300 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                    2. Chọn loại phương tiện & Biểu phí vé <span className="text-rose-600">*</span>
                  </label>
                  {isContainerType && (
                    <span className="text-[11px] text-[#0A9444] font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                      Áp dụng vé Container 250.000 đ
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {vehicleTypes.map((t) => {
                    const isSelected = selectedType === t.code;
                    let priceLabel = 'Chưa có giá';
                    if (t.code === 'CONT_LANH') {
                      priceLabel = '250.000 đ';
                    } else if (t.code === 'DAU_KEO' || t.default_ticket_amount === 0) {
                      priceLabel = '0 đ (Miễn phí)';
                    } else if (t.default_ticket_amount !== null && t.default_ticket_amount > 0) {
                      priceLabel = `${t.default_ticket_amount.toLocaleString('vi-VN')} đ`;
                    }

                    return (
                      <button
                        key={t.code}
                        type="button"
                        onClick={() => {
                          setSelectedType(t.code);
                          setErrorMessage('');
                        }}
                        className={`text-left p-2.5 rounded border transition-colors cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-50/80 text-emerald-950 border-[#0A9444] ring-1 ring-[#0A9444] font-bold'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <div className="text-xs font-bold">{t.name}</div>
                        <div className="flex justify-between items-center mt-1 text-[11px]">
                          <span className="text-slate-500">Vé lượt</span>
                          <span className={`font-mono font-bold ${t.code === 'DAU_KEO' || t.default_ticket_amount === 0 ? 'text-blue-700' : 'text-[#0A9444]'}`}>
                            {priceLabel}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. THÔNG TIN CONTAINER (CHỈ HIỂN THỊ KHI CHỌN XE CONTAINER LẠNH) */}
              {isContainerType && (
                <div className="p-3.5 rounded-lg bg-blue-50/40 border border-blue-300 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-200 pb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-950 flex items-center space-x-1.5">
                      <ContainerIcon className="w-4 h-4 text-[#223873]" />
                      <span>3. Chi tiết Container đi kèm:</span>
                    </span>
                    <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded border border-blue-300">
                      Vé trọn gói: 250.000 đ
                    </span>
                  </div>

                  {/* CẢNH BÁO THÔNG MINH: YÊU CẦU CẮM ĐIỆN DỰ KIẾN TỪ CCKB */}
                  {matchedReeferRequest && (
                    <div className="p-3 bg-amber-50 border border-amber-400 rounded text-amber-950 text-xs space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                          <Zap className="w-4 h-4 text-amber-600" />
                          ⚡ CẢNH BÁO CẮM ĐIỆN TRƯỚC TỪ CCKB
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300">
                          {matchedReeferRequest.power_mode === 'CONTINUOUS' ? 'Cắm liên tục' : 'Theo giờ'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pt-1 border-t border-amber-300">
                        <div>
                          <span className="text-amber-700">Cont đăng ký:</span> <b className="font-mono text-amber-950">{matchedReeferRequest.container_no_planned}</b>
                        </div>
                        <div>
                          <span className="text-amber-700">Khách hàng:</span> <b className="text-amber-950">{matchedReeferRequest.customer_name}</b>
                        </div>
                        {matchedReeferRequest.temperature_setting && (
                          <div>
                            <span className="text-amber-700">Cài đặt nhiệt độ:</span> <b>{matchedReeferRequest.temperature_setting}</b>
                          </div>
                        )}
                        {matchedReeferRequest.notes && (
                          <div className="sm:col-span-2">
                            <span className="text-amber-700">Ghi chú CCKB:</span> <i className="text-amber-900">{matchedReeferRequest.notes}</i>
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-amber-800 font-bold pt-1">
                        👉 Đề nghị An ninh: Hướng dẫn tài xế đưa xe vào ngay khu cắm điện lạnh sau khi qua cổng!
                      </p>
                    </div>
                  )}

                  {/* FORM NHẬP CONTAINER CHÍNH */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-800">
                          {containerCarryMode === 'DUAL_20FT' ? (
                            <span className="flex items-center gap-1.5 text-[#0A9444]">
                              <span className="w-4 h-4 rounded bg-[#0A9444] text-white inline-flex items-center justify-center text-[10px] font-bold">1</span>
                              Mã số Container thứ nhất (20 Feet) <span className="text-rose-600">*</span>
                            </span>
                          ) : (
                            <>
                              Mã số Container (4 chữ cái + 7 chữ số) <span className="text-rose-600">*</span>
                            </>
                          )}
                        </label>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {containerNo.trim().length > 0 ? `${containerNo.trim().length}/11 ký tự` : 'VD: TCLU1234567'}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          value={containerNo}
                          onChange={(e) => {
                            setContainerNo(e.target.value.toUpperCase().replace(/\s+/g, ''));
                            if (errorMessage) setErrorMessage('');
                          }}
                          placeholder="TCLU1234567"
                          maxLength={11}
                          className={`w-full px-3 py-2 text-sm font-bold tracking-widest uppercase font-mono rounded border focus:outline-none transition-colors ${
                            duplicateContainer
                              ? 'border-rose-500 text-rose-950 bg-rose-50 ring-1 ring-rose-500'
                              : contValidation.level === 'SUCCESS'
                              ? 'border-emerald-500 text-emerald-950 bg-emerald-50/50 ring-1 ring-emerald-500'
                              : contValidation.level === 'ERROR'
                              ? 'border-rose-400 text-rose-950 bg-rose-50/50'
                              : 'border-slate-300 text-slate-900 bg-white focus:border-[#223873]'
                          }`}
                          required
                        />
                        {duplicateContainer ? (
                          <AlertOctagon className="w-4 h-4 text-rose-600 absolute right-3 top-1/2 -translate-y-1/2" />
                        ) : contValidation.level === 'SUCCESS' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
                        ) : null}
                      </div>

                      {/* CẢNH BÁO TRÙNG SỐ CONTAINER THỜI GIAN THỰC (IN_YARD) */}
                      {duplicateContainer ? (
                        <div className="mt-2 p-3 rounded border border-rose-400 bg-rose-50 text-rose-950 text-xs space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-rose-800 text-xs uppercase tracking-wide">
                                CẢNH BÁO: CONTAINER {duplicateContainer.container_no_current} ĐANG CÓ LƯỢT LƯU BÃI (IN_YARD)
                              </p>
                              <p className="text-[11px] text-rose-700 leading-relaxed mt-0.5">
                                Container này hiện đang nằm trong bãi và chưa làm thủ tục xuất bãi. Hệ thống <strong>không tự động gộp lượt</strong> và không cho phép tạo lượt vào mới khi cont cũ chưa rời bãi.
                              </p>
                            </div>
                          </div>

                          <div className="bg-white rounded p-2 border border-rose-200 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-medium text-slate-700">
                            <div>
                              <span className="text-slate-500">Thời gian vào bãi:</span>{' '}
                              <b className="font-mono text-slate-900">
                                {duplicateContainer.inbound_at ? new Date(duplicateContainer.inbound_at).toLocaleString('vi-VN') : '—'}
                              </b>
                            </div>
                            <div>
                              <span className="text-slate-500">Xe chở vào:</span>{' '}
                              <b className="font-mono text-slate-900">
                                {duplicateContainer.inbound_license_plate ||
                                 activeVehicles.find(v => v.id === duplicateContainer.inbound_vehicle_visit_id)?.license_plate ||
                                 'Hạ bãi không kèm xe'}
                              </b>
                            </div>
                            <div>
                              <span className="text-slate-500">Quy cách & Vỏ:</span>{' '}
                              <b>
                                {duplicateContainer.container_size || '40'}ft — {duplicateContainer.container_type || 'RF'} (
                                {duplicateContainer.cargo_status === 'HANG' ? 'Có hàng' : duplicateContainer.cargo_status === 'RONG' ? 'Vỏ rỗng' : 'Chưa xác định'})
                              </b>
                            </div>
                            <div>
                              <span className="text-slate-500">Vị trí lưu bãi:</span>{' '}
                              <b className="text-[#223873]">
                                {duplicateContainer.yard_zone ? `Khu ${duplicateContainer.yard_zone}` : 'Chưa xếp khu'}
                                {duplicateContainer.slot_code ? ` (Ô ${duplicateContainer.slot_code})` : ''}
                              </b>
                            </div>
                          </div>

                          <p className="text-[10px] text-rose-700 font-bold">
                            👉 Đề nghị An ninh: Kiểm tra lại số container thực tế trên vỏ xe hoặc liên hệ Điều phối viên trước khi cho xe vào!
                          </p>
                        </div>
                      ) : containerNo.trim().length > 0 ? (
                        <div className={`mt-1.5 p-2 rounded text-[11px] flex items-start gap-1.5 ${
                          contValidation.level === 'SUCCESS'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : contValidation.level === 'ERROR'
                            ? 'bg-rose-50 text-rose-800 border border-rose-300'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}>
                          {contValidation.level === 'SUCCESS' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                          {contValidation.level === 'ERROR' && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />}
                          {contValidation.level === 'INFO' && <span className="w-3.5 h-3.5 shrink-0 text-slate-500 font-bold">ℹ</span>}
                          <div className="flex-1">
                            <span>{contValidation.message}</span>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Kích cỡ</label>
                        <select
                          value={containerSize}
                          onChange={(e) => {
                            const newSize = e.target.value;
                            setContainerSize(newSize);
                            if (newSize !== '20') {
                              setContainerCarryMode('SINGLE');
                              setSecondContainerNo('');
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white cursor-pointer focus:border-[#223873]"
                        >
                          <option value="40">40 Feet (Phổ biến)</option>
                          <option value="20">20 Feet</option>
                          <option value="45">45 Feet</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Loại vỏ {containerCarryMode === 'DUAL_20FT' ? 'Cont #1' : 'container'}
                        </label>
                        <select
                          value={containerType}
                          onChange={(e) => setContainerType(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white cursor-pointer focus:border-[#223873]"
                        >
                          <option value="RF">RF — Lạnh (Reefer)</option>
                          <option value="DC">DC — Khô (Dry Cargo)</option>
                          <option value="OT">OT — Mở nóc (Open Top)</option>
                          <option value="FR">FR — Khung phẳng (Flat Rack)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* CHỈ KHI KÍCH CỠ LÀ 20 FEET: MỚI XUẤT HIỆN TÙY CHỌN CHỞ CẶP 2 CONTAINER 20FT SONG SONG */}
                  {containerSize === '20' && (
                    <div className="p-3 bg-emerald-50/50 border border-emerald-300 rounded space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs font-bold text-emerald-950 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={containerCarryMode === 'DUAL_20FT'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setContainerCarryMode('DUAL_20FT');
                              } else {
                                setContainerCarryMode('SINGLE');
                                setSecondContainerNo('');
                              }
                            }}
                            className="w-4 h-4 text-[#0A9444] rounded border-slate-300 focus:ring-[#0A9444] cursor-pointer"
                          />
                          <span>Xe chở cặp 2 Container 20 Feet song song</span>
                        </label>
                        <span className="text-[10px] bg-emerald-100 text-[#0A9444] font-bold px-2 py-0.5 rounded border border-emerald-300">
                          Áp dụng cho 20ft
                        </span>
                      </div>

                      {containerCarryMode === 'DUAL_20FT' && (
                        <div className="pt-2 border-t border-emerald-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-[#0A9444] uppercase flex items-center gap-1.5">
                              <span className="w-4 h-4 rounded bg-[#0A9444] text-white inline-flex items-center justify-center text-[10px] font-bold">2</span>
                              Mã số Container thứ hai (20 Feet) <span className="text-rose-600">*</span>
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {secondContainerNo.trim().length > 0 ? `${secondContainerNo.trim().length}/11 ký tự` : 'VD: SEGU7654321'}
                            </span>
                          </div>

                          <div className="relative">
                            <input
                              type="text"
                              value={secondContainerNo}
                              onChange={(e) => {
                                setSecondContainerNo(e.target.value.toUpperCase().replace(/\s+/g, ''));
                                if (errorMessage) setErrorMessage('');
                              }}
                              placeholder="SEGU7654321"
                              maxLength={11}
                              className={`w-full px-3 py-1.5 text-xs font-bold tracking-widest uppercase font-mono rounded border focus:outline-none transition-colors ${
                                duplicateSecondContainer
                                  ? 'border-rose-500 text-rose-950 bg-rose-50 ring-1 ring-rose-500'
                                  : secondContValidation.level === 'SUCCESS'
                                  ? 'border-emerald-500 text-emerald-950 bg-emerald-50/50 ring-1 ring-emerald-500'
                                  : secondContValidation.level === 'ERROR'
                                  ? 'border-rose-400 text-rose-950 bg-rose-50/50'
                                  : 'border-slate-300 text-slate-900 bg-white focus:border-[#223873]'
                              }`}
                              required
                            />
                            {duplicateSecondContainer ? (
                              <AlertOctagon className="w-4 h-4 text-rose-600 absolute right-3 top-1/2 -translate-y-1/2" />
                            ) : secondContValidation.level === 'SUCCESS' ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-3 top-1/2 -translate-y-1/2" />
                            ) : null}
                          </div>

                          {/* CẢNH BÁO TRÙNG CONTAINER THỨ HAI THỜI GIAN THỰC */}
                          {duplicateSecondContainer?.isDuplicateWithFirst ? (
                            <div className="p-2.5 rounded border border-rose-300 bg-rose-50 text-rose-900 text-xs space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-rose-800">
                                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>TRÙNG CONTAINER #1:</span>
                              </div>
                              <p className="text-[11px] text-rose-700">
                                Mã số Container #2 trùng hoàn toàn với Container #1 (<strong className="font-mono">{containerNo.trim().toUpperCase()}</strong>). Một xe không thể chở 2 container trùng số!
                              </p>
                            </div>
                          ) : duplicateSecondContainer?.container ? (
                            <div className="p-2.5 rounded border border-rose-400 bg-rose-50 text-rose-950 text-xs space-y-1">
                              <div className="flex items-start gap-1.5 font-bold text-rose-800 uppercase">
                                <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                                <span>CẢNH BÁO: CONTAINER {duplicateSecondContainer.container.container_no_current} ĐANG LƯU BÃI (IN_YARD)</span>
                              </div>
                              <p className="text-[11px] text-rose-700">
                                Container #2 này hiện đang có một lượt lưu bãi chưa xuất. Không thể tiếp nhận đè!
                              </p>
                              <div className="bg-white rounded p-2 text-[10px] space-y-0.5 text-slate-700 border border-rose-200">
                                <div><span className="text-slate-500">Giờ vào:</span> <b className="font-mono">{new Date(duplicateSecondContainer.container.inbound_at).toLocaleString('vi-VN')}</b></div>
                                <div><span className="text-slate-500">Vị trí:</span> <b>{duplicateSecondContainer.container.yard_zone ? `Khu ${duplicateSecondContainer.container.yard_zone}` : 'Chưa xếp'}</b></div>
                              </div>
                            </div>
                          ) : secondContainerNo.trim().length > 0 ? (
                            <div className={`p-2 rounded text-[11px] flex items-start gap-1.5 ${
                              secondContValidation.level === 'SUCCESS'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                : secondContValidation.level === 'ERROR'
                                ? 'bg-rose-50 text-rose-800 border border-rose-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}>
                              {secondContValidation.level === 'SUCCESS' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                              {secondContValidation.level === 'ERROR' && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />}
                              <span className="flex-1">{secondContValidation.message}</span>
                            </div>
                          ) : null}

                          <div className="flex items-center gap-2 pt-1">
                            <span className="text-[11px] font-bold text-slate-600 w-36 shrink-0">Loại vỏ Container #2:</span>
                            <select
                              value={secondContainerType}
                              onChange={(e) => setSecondContainerType(e.target.value)}
                              className="w-full px-2 py-1.5 text-xs font-bold border border-slate-300 rounded bg-white"
                            >
                              <option value="RF">RF — Lạnh (Reefer)</option>
                              <option value="DC">DC — Khô (Dry Cargo)</option>
                              <option value="OT">OT — Mở nóc (Open Top)</option>
                              <option value="FR">FR — Khung phẳng (Flat Rack)</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-500 italic">
                    * An ninh chỉ ghi nhận số container. Trạng thái HÀNG hoặc RỖNG do Điều phối viên cập nhật sau khi kiểm tra bãi.
                  </div>
                </div>
              )}
            </div>

            {/* CỘT PHẢI (lg:col-span-5): TÀI XẾ & THU TIỀN VÉ & XÁC NHẬN */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* 4. THÔNG TIN LÁI XE & BỔ SUNG (TÙY CHỌN) */}
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-300 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                    {isContainerType ? '4. Thông tin lái xe & Hàng:' : '3. Thông tin lái xe & Hàng:'}
                  </label>
                  {scanSuccessMsg && (
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                      {scanSuccessMsg}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Họ tên tài xế</label>
                    <input
                      type="text"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-300 rounded focus:border-[#0A9444] focus:outline-none bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại</label>
                    <input
                      type="tel"
                      value={driverPhone}
                      onChange={(e) => setDriverPhone(e.target.value)}
                      placeholder="0912.345.678"
                      className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-300 rounded focus:border-[#0A9444] focus:outline-none bg-white"
                    />
                  </div>
                </div>

                {/* Ô nhập Số CCCD / Hộ chiếu kèm tính năng quét mã QR CCCD gắn chip */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Số CCCD / Hộ chiếu tài xế
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowIdCardScanner(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0A9444] hover:text-[#087C3C] bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 transition-colors cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Quét CCCD (Mã QR)</span>
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={driverIdCard}
                      onChange={(e) => parseAndApplyCccdData(e.target.value)}
                      placeholder="Nhập 12 số CCCD hoặc quét mã QR chip..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs text-slate-800 border border-slate-300 rounded font-mono focus:border-[#0A9444] focus:outline-none bg-white"
                    />
                    <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú loại hàng / Lượt xe</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Nông sản xuất khẩu, hàng đông lạnh..."
                    className="w-full px-3 py-1.5 text-xs text-slate-800 border border-slate-300 rounded focus:border-[#0A9444] focus:outline-none bg-white"
                  />
                </div>
              </div>

              {/* 5. GHI NHẬN THU TIỀN VÉ CỔNG TRỰC TIẾP TẠI BỐT GÁC AN NINH */}
              <div className="p-3.5 rounded-lg bg-emerald-50/30 border border-emerald-300 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-800">
                    {isContainerType ? '5. Thu tiền vé cổng tại bốt gác:' : '4. Thu tiền vé cổng tại bốt gác:'}
                  </label>
                  {previewAmount === 0 ? (
                    <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-300">
                      Miễn phí (0 đ)
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-[#0A9444] bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300 font-mono">
                      Mức thu: {previewAmount?.toLocaleString('vi-VN')} đ
                    </span>
                  )}
                </div>

                {previewAmount === 0 ? (
                  <div className="p-2.5 rounded bg-white border border-slate-300 text-xs text-slate-600 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>Phương tiện miễn phí vé cổng (0 đ). Không phát sinh thu tiền.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* 2 Lựa chọn lớn: Thu tiền ngay tại cổng vs Thu sau */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCollectPaymentNow(true)}
                        className={`p-2 rounded border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 ${
                          collectPaymentNow
                            ? 'bg-[#0A9444] text-white border-[#0A9444] shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Thu tiền ngay</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setCollectPaymentNow(false)}
                        className={`p-2 rounded border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 ${
                          !collectPaymentNow
                            ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Thu sau (Ghi nợ)</span>
                      </button>
                    </div>

                    {/* Nếu chọn Thu tiền ngay: Cho phép chọn Tiền mặt / Chuyển khoản và số seri vé */}
                    {collectPaymentNow && (
                      <div className="space-y-2.5 pt-2 border-t border-emerald-200">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Phương thức thanh toán:
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('CASH')}
                              className={`p-1.5 rounded border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 ${
                                paymentMethod === 'CASH'
                                  ? 'bg-emerald-100 text-emerald-950 border-emerald-500 ring-1 ring-emerald-500'
                                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                              }`}
                            >
                              <Banknote className="w-3.5 h-3.5 text-[#0A9444]" />
                              <span>Tiền mặt (CASH)</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPaymentMethod('TRANSFER')}
                              className={`p-1.5 rounded border text-xs font-bold transition-colors cursor-pointer flex items-center justify-center space-x-1.5 ${
                                paymentMethod === 'TRANSFER'
                                  ? 'bg-emerald-100 text-emerald-950 border-emerald-500 ring-1 ring-emerald-500'
                                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
                              }`}
                            >
                              <CreditCard className="w-3.5 h-3.5 text-blue-700" />
                              <span>Chuyển khoản (CK)</span>
                            </button>
                          </div>
                        </div>

                        {paymentMethod === 'TRANSFER' && (previewAmount || 0) > 0 && (
                          <div className="p-3 bg-blue-50 border border-blue-300 rounded flex items-center gap-3">
                            <img
                              src={generateVietQrUrl(
                                previewAmount || 0,
                                `VE CONG ${licensePlate.trim().toUpperCase() || 'SON CANG'}`
                              )}
                              alt="VietQR Napas 247 Vé vào cổng"
                              className="w-20 h-20 object-contain bg-white p-1 rounded border border-slate-300 shadow-2xs shrink-0"
                            />
                            <div className="text-[11px] space-y-1">
                              <p className="font-bold text-[#223873] flex items-center gap-1">
                                <QrCode className="w-3.5 h-3.5 text-blue-600" />
                                Quét mã VietQR Napas 247
                              </p>
                              <p className="text-slate-600">
                                Thu vé cổng: <span className="font-mono font-bold text-emerald-700">{(previewAmount || 0).toLocaleString('vi-VN')} đ</span>
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                ND: VE CONG {licensePlate.trim().toUpperCase() || 'SON CANG'}
                              </p>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Số seri vé giấy / Số biên lai thu tiền (Tùy chọn):
                          </label>
                          <input
                            type="text"
                            value={receiptCode}
                            onChange={(e) => setReceiptCode(e.target.value.toUpperCase())}
                            placeholder="VD: VE-00123 hoặc Mã chuẩn chi..."
                            className="w-full px-3 py-1.5 text-xs font-mono text-slate-800 border border-slate-300 rounded bg-white focus:border-[#0A9444] focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* TỔNG KẾT VÉ & NÚT TIẾP NHẬN */}
              <div className="p-4 rounded-lg bg-white border border-slate-300 shadow-xs space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tổng tiền vé cổng:</span>
                  <span className="text-lg sm:text-xl font-bold font-mono text-[#0A9444]">
                    {previewAmount !== null ? `${previewAmount.toLocaleString('vi-VN')} đ` : 'Chưa thiết lập'}
                  </span>
                </div>

                {(duplicateContainer || duplicateSecondContainer?.container || duplicateSecondContainer?.isDuplicateWithFirst) && (
                  <div className="p-2.5 rounded border border-rose-300 bg-rose-50 text-rose-900 text-xs font-bold flex items-center gap-2">
                    <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      {duplicateContainer
                        ? `Không thể tiếp nhận: Container ${duplicateContainer.container_no_current} đang có lượt lưu bãi!`
                        : duplicateSecondContainer?.isDuplicateWithFirst
                        ? 'Không thể tiếp nhận: Container #1 và Container #2 trùng nhau!'
                        : `Không thể tiếp nhận: Container #2 đang có lượt lưu bãi!`}
                    </span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !!duplicateContainer || !!duplicateSecondContainer?.container || !!duplicateSecondContainer?.isDuplicateWithFirst}
                  className="w-full py-3 px-4 rounded font-bold text-sm text-white bg-[#0A9444] hover:bg-[#087C3C] transition-colors flex items-center justify-center space-x-2 shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-h-[44px]"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang ghi nhận lượt vào...</span>
                    </>
                  ) : (
                    <>
                      <span>XÁC NHẬN TIẾP NHẬN VÀO CỔNG</span>
                      <span className="text-[11px] font-normal opacity-85 ml-1 hidden sm:inline">(Ctrl + Enter)</span>
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

            </div>
          </div>
        </form>
      )}

      {/* MODAL QUÉT MÃ QR CĂN CƯỚC CÔNG DÂN (CCCD) */}
      {showIdCardScanner && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-md w-full p-5 shadow-xl border border-slate-300 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded bg-emerald-50 text-[#0A9444] border border-emerald-200">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Quét Căn cước công dân (CCCD)</h3>
                  <p className="text-[11px] text-slate-500">Chuẩn mã QR thẻ CCCD gắn chip</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowIdCardScanner(false);
                  setScannerRawInput('');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded bg-slate-50 border border-slate-300 text-center space-y-3">
              <div className="w-14 h-14 rounded bg-white border-2 border-dashed border-[#0A9444] flex items-center justify-center mx-auto text-[#0A9444]">
                <ScanLine className="w-7 h-7" />
              </div>
              <div className="text-xs text-slate-700 font-bold">
                Sẵn sàng nhận dữ liệu máy quét
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Đưa mã QR trên thẻ CCCD trước súng quét mã vạch 2D hoặc dán chuỗi quét vào ô bên dưới:
              </p>
              <input
                type="text"
                value={scannerRawInput}
                onChange={(e) => {
                  setScannerRawInput(e.target.value);
                  parseAndApplyCccdData(e.target.value);
                }}
                placeholder="Nhấp vào đây và bắn máy quét..."
                className="w-full px-3 py-2 text-xs border border-emerald-400 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#0A9444] bg-white text-center font-bold"
                autoFocus
              />
            </div>

            <div className="pt-1 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  parseAndApplyCccdData('001202012345|012345678|NGUYỄN VĂN AN|15051992|Nam|Hà Nội|10012022');
                }}
                className="text-[11px] font-bold text-[#0A9444] hover:underline cursor-pointer"
              >
                + Thử quét CCCD mẫu
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowIdCardScanner(false);
                  setScannerRawInput('');
                }}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IN VÉ VÀO CỔNG */}
      {showPrintTicketModal && successResult && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-xl w-full p-6 shadow-xl border border-slate-300 space-y-5 relative print:p-0 print:shadow-none print:max-w-full">
            {/* Thanh thao tác nhanh (ẩn khi in) */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <span className="text-sm font-bold text-[#223873] flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-[#0A9444]" />
                Xem trước Vé xe vào cổng bến bãi
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5a] rounded flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  In vé ngay
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintTicketModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded transition-colors cursor-pointer"
                >
                  ✕ Đóng
                </button>
              </div>
            </div>

            {/* Khung nội dung Vé xe vào bãi chuẩn Sơn Cảng */}
            <div className="border border-slate-300 rounded p-5 space-y-4 bg-white text-slate-900 print:border-none print:p-0">
              {/* Header đơn vị */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 border-b border-slate-200 pb-3">
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
                  <p className="text-[11px] font-mono text-slate-500 uppercase">Vé lượt cổng</p>
                  <p className="text-sm font-bold font-mono text-[#0A9444]">
                    {successResult.vehicle.ticket_code}
                  </p>
                </div>
              </div>

              {/* Tên vé */}
              <div className="text-center py-1">
                <h2 className="text-base sm:text-lg font-bold text-[#223873] uppercase tracking-wide">
                  VÉ KIỂM SOÁT XE VÀO BÃI
                </h2>
                <p className="text-xs italic text-slate-500 mt-0.5">
                  (Liên lưu giữ trên xe / Xuất trình khi ra cổng)
                </p>
              </div>

              {/* Chi tiết xe và container */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                  <span className="text-slate-500">Biển số phương tiện:</span>
                  <span className="font-mono font-bold text-sm text-slate-900 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                    {successResult.vehicle.license_plate}
                  </span>
                </div>

                <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                  <span className="text-slate-500">Loại phương tiện:</span>
                  <span className="font-bold text-slate-800">
                    {getVehicleTypeName(successResult.vehicle.vehicle_type_name || successResult.vehicle.vehicle_type)}
                  </span>
                </div>

                {successResult.containers && successResult.containers.length > 0 ? (
                  <div className="py-1 border-b border-slate-100 space-y-1">
                    <div className="flex justify-between items-baseline">
                      <span className="text-slate-500">Container đi kèm ({successResult.containers.length}):</span>
                      {successResult.containers.length > 1 && (
                        <span className="text-[10px] text-purple-700 font-bold bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                          Cặp 2 vỏ 20ft
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 pl-2">
                      {successResult.containers.map((c, idx) => (
                        <div key={c.id || idx} className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">#{idx + 1}:</span>
                          <span className="font-mono font-bold text-[#223873] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {c.container_no_current} ({formatContainerSpec(c.container_size, c.container_type)})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : successResult.container ? (
                  <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                    <span className="text-slate-500">Container đi kèm:</span>
                    <span className="font-mono font-bold text-[#223873] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      {successResult.container.container_no_current} ({formatContainerSpec(successResult.container.container_size, successResult.container.container_type)})
                    </span>
                  </div>
                ) : null}

                {successResult.vehicle.driver_name && (
                  <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                    <span className="text-slate-500">Họ tên lái xe:</span>
                    <span className="font-semibold text-slate-800">{successResult.vehicle.driver_name}</span>
                  </div>
                )}

                <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                  <span className="text-slate-500">Thời gian vào cổng:</span>
                  <span className="font-mono font-medium text-slate-800">
                    {new Date(successResult.vehicle.entry_at).toLocaleString('vi-VN')}
                  </span>
                </div>

                <div className="flex justify-between items-baseline py-1 border-b border-slate-100">
                  <span className="text-slate-500">Trạng thái thanh toán:</span>
                  <span className={`font-bold ${
                    successResult.vehicle.ticket_payment_status === 'PAID'
                      ? 'text-[#0A9444]'
                      : successResult.vehicle.ticket_payment_status === 'EXEMPT'
                      ? 'text-blue-700'
                      : 'text-amber-700'
                  }`}>
                    {successResult.vehicle.ticket_payment_status === 'PAID'
                      ? `ĐÃ THU (${paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}${receiptCode ? ` - BL: ${receiptCode}` : ''})`
                      : successResult.vehicle.ticket_payment_status === 'EXEMPT'
                      ? 'MIỄN PHÍ HỢP LỆ'
                      : 'CHƯA THU TIỀN (GHI NỢ)'}
                  </span>
                </div>

                <div className="pt-2 flex justify-between items-baseline">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Giá vé cổng:</span>
                  <span className="text-lg font-bold font-mono text-[#0A9444]">
                    {successResult.vehicle.ticket_amount !== null
                      ? `${successResult.vehicle.ticket_amount.toLocaleString('vi-VN')} VNĐ`
                      : '0 VNĐ'}
                  </span>
                </div>

                {successResult.vehicle.ticket_amount !== null && successResult.vehicle.ticket_amount > 0 && (
                  <div className="text-[11px] text-slate-500 italic text-right">
                    (Bằng chữ: {formatMoneyInWords(successResult.vehicle.ticket_amount)})
                  </div>
                )}
              </div>

              {/* Phần chữ ký & ghi chú */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-2 gap-4 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-800">Lái xe nhận vé</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký nhận)</p>
                  <div className="h-10" />
                </div>
                <div>
                  <p className="font-bold text-slate-800">Nhân viên An ninh Cổng</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký xác nhận)</p>
                  <div className="h-10 flex items-end justify-center">
                    <p className="font-bold text-slate-700">{user?.email || 'An ninh trực cổng'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 pt-2 text-center text-[10px] text-slate-400">
                Lưu ý: Quý khách vui lòng giữ vé cẩn thận để đối soát khi phương tiện làm thủ tục rời cổng.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: XÁC NHẬN PHƯƠNG TIỆN TRÙNG LẶP TRONG BÃI (WARN & OVERRIDE) */}
      {showDupModal && dupCheckResult?.has_duplicate && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-xl w-full shadow-xl border border-slate-300 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="px-5 py-3.5 bg-amber-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-bold text-sm leading-tight">Xác Nhận Xe Trùng Lặp Trong Bãi</h3>
                  <p className="text-[11px] text-amber-100">Kiểm soát an toàn bến bãi Sơn Cảng (V5)</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDupModal(false)}
                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung Modal */}
            <div className="p-5 overflow-y-auto space-y-3.5 text-xs">
              <div className="p-3 rounded bg-amber-50 border border-amber-300 text-amber-900 leading-relaxed">
                Biển số xe <span className="font-mono font-bold text-amber-950 text-sm">[{dupCheckResult.existing_visit?.license_plate}]</span> hiện đang có một lượt xe hoạt động trong bãi. Vui lòng đối chiếu thông tin trước khi tiếp nhận lượt mới:
              </div>

              {/* So sánh 2 lượt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Lượt đang có */}
                <div className="p-3 rounded bg-slate-50 border border-slate-300 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">1. Lượt xe đang trong bãi</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded border border-amber-300">IN_YARD</span>
                  </div>
                  <div className="space-y-1 text-slate-600">
                    <p><span className="text-slate-400">Loại xe:</span> <span className="font-semibold text-slate-800">{getVehicleTypeName(dupCheckResult.existing_visit?.vehicle_type || '')}</span></p>
                    <p><span className="text-slate-400">Giờ vào:</span> <span className="font-mono text-slate-700">{new Date(dupCheckResult.existing_visit?.entry_at || '').toLocaleTimeString('vi-VN')} {new Date(dupCheckResult.existing_visit?.entry_at || '').toLocaleDateString('vi-VN')}</span></p>
                    <p><span className="text-slate-400">Đã đỗ:</span> <span className="font-bold text-blue-700">{dupCheckResult.existing_visit?.duration_display}</span></p>
                    <p>
                      <span className="text-slate-400">Vé cổng:</span>{' '}
                      <span className={`font-mono font-bold ${dupCheckResult.existing_visit?.ticket_payment_status === 'PAID' ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {dupCheckResult.existing_visit?.ticket_payment_status === 'PAID' ? 'Đã thu' : 'Chưa thu'} ({dupCheckResult.existing_visit?.ticket_amount?.toLocaleString('vi-VN')} đ)
                      </span>
                    </p>
                    {dupCheckResult.existing_visit?.driver_name && (
                      <p><span className="text-slate-400">Tài xế:</span> {dupCheckResult.existing_visit.driver_name}</p>
                    )}
                  </div>
                </div>

                {/* Lượt mới sắp vào */}
                <div className="p-3 rounded bg-blue-50/50 border border-blue-300 space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-blue-200">
                    <span className="font-bold text-blue-900 uppercase tracking-wider text-[11px]">2. Lượt mới tiếp nhận</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-300">SẮP VÀO</span>
                  </div>
                  <div className="space-y-1 text-slate-600">
                    <p><span className="text-slate-400">Loại xe:</span> <span className="font-semibold text-blue-950">{getVehicleTypeName(selectedType)}</span></p>
                    <p><span className="text-slate-400">Thời gian:</span> <span className="font-mono text-blue-800">Hiện tại (Ca trực)</span></p>
                    <p><span className="text-slate-400">Giá vé:</span> <span className="font-mono font-bold text-emerald-700">{previewAmount?.toLocaleString('vi-VN')} đ</span></p>
                    {isContainerType && (
                      <p><span className="text-slate-400">Container:</span> <span className="font-mono font-bold text-slate-800">{containerNo}</span></p>
                    )}
                    {driverName.trim() && (
                      <p><span className="text-slate-400">Tài xế:</span> {driverName.trim()}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Lựa chọn Lý do ghi đè */}
              <div className="p-3 rounded bg-slate-50 border border-slate-300 space-y-2">
                <label className="block font-bold text-slate-800">
                  Lý do nghiệp vụ cho phép tiếp nhận lượt mới <span className="text-rose-600">*</span>
                </label>
                <select
                  value={overrideReasonCode}
                  onChange={(e) => setOverrideReasonCode(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                >
                  {(dupCheckResult.preset_reasons || []).map((r) => (
                    <option key={r.code} value={r.code}>
                      {r.label}
                    </option>
                  ))}
                  <option value="LY_DO_KHAC">Lý do nghiệp vụ khác (Tự nhập)</option>
                </select>

                {overrideReasonCode === 'LY_DO_KHAC' && (
                  <input
                    type="text"
                    value={customReasonText}
                    onChange={(e) => setCustomReasonText(e.target.value)}
                    placeholder="Nhập lý do cụ thể..."
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded bg-white font-medium text-slate-800 focus:border-amber-500 focus:outline-none"
                    autoFocus
                  />
                )}

                {/* Checkbox Đóng nhanh lượt cũ */}
                {dupCheckResult.allow_quick_exit && (
                  <label className="flex items-start space-x-2 pt-2 border-t border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={closePreviousOnEntry}
                      onChange={(e) => setClosePreviousOnEntry(e.target.checked)}
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 mt-0.5"
                    />
                    <div>
                      <span className="font-bold text-slate-800">Đồng thời xác nhận Xuất bãi (đóng) lượt cũ tại Cổng ra</span>
                      <p className="text-[11px] text-slate-500 leading-tight">
                        Tự động ghi nhận xe đã rời bãi lượt trước để làm sạch danh sách xe trong bãi (không cần qua Cổng ra thao tác lại).
                      </p>
                    </div>
                  </label>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowDupModal(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              >
                Hủy bỏ / Kiểm tra lại
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={async () => {
                  const selectedReasonObj = dupCheckResult.preset_reasons?.find(r => r.code === overrideReasonCode);
                  const finalReason = overrideReasonCode === 'LY_DO_KHAC' 
                    ? (customReasonText.trim() || 'Lý do khác') 
                    : (selectedReasonObj?.label || overrideReasonCode);
                  
                  await executeVehicleEntry(true, finalReason, closePreviousOnEntry);
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Xác nhận Cho Vào Lượt Mới</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: PHƯƠNG TIỆN BỊ CHẶN NGHIÊM NGẶT (BLOCK_STRICT / COOLDOWN / NỢ VÉ) */}
      {showBlockModal && dupCheckResult && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl border border-slate-300 overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertOctagon className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-bold text-sm leading-tight">Không Thể Tiếp Nhận Phương Tiện</h3>
                  <p className="text-[11px] text-rose-100">Vi phạm chính sách an toàn bến bãi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="text-center py-1">
                <span className="text-xl font-bold font-mono tracking-widest text-slate-800 bg-slate-100 px-4 py-1 rounded border border-slate-300">
                  {licensePlate.toUpperCase()}
                </span>
              </div>

              <div className="p-3 rounded bg-rose-50 border border-rose-300 text-rose-900 leading-relaxed font-medium">
                {dupCheckResult.block_reason || dupCheckResult.message}
              </div>

              <div className="p-3 rounded bg-slate-50 border border-slate-300 space-y-1.5 text-slate-600">
                <p className="font-bold text-slate-800">Hướng dẫn xử lý cho Nhân viên An ninh:</p>
                {dupCheckResult.is_within_cooldown ? (
                  <p>• Phương tiện vừa mới vào bãi dưới {dupCheckResult.cooldown_minutes} phút. Vui lòng kiểm tra lại để tránh thao tác lặp hoặc double-click.</p>
                ) : dupCheckResult.has_unpaid_ticket ? (
                  <p>• Phương tiện chưa hoàn thành thanh toán vé vào cổng của lượt trước. Yêu cầu tài xế nộp phí hoặc liên hệ Thương vụ CCKB.</p>
                ) : (
                  <p>• Phương tiện hiện đang ghi nhận trong bãi. Yêu cầu An ninh Cổng ra làm thủ tục xác nhận Xuất bãi trước khi cho xe vào lượt mới.</p>
                )}
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <Link
                href="/exit"
                className="px-3.5 py-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-300 rounded transition-colors flex items-center space-x-1 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Xem Cổng ra →</span>
              </Link>
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded transition-colors cursor-pointer"
              >
                Đã hiểu / Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
