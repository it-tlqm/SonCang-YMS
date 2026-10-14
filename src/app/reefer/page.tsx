'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { DEMO_ACCOUNTS } from '@/types/auth.types';
import { ContainerVisit, ReeferPowerSession, ReeferRequest, ReeferRequestStatus, ReeferPowerStatus, TariffItem, ReeferTemperatureLog } from '@/types/domain.types';
import { validateContainerNumber } from '@/lib/container-validator';
import { 
  Zap, 
  Clock, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Lock,
  Calendar,
  DollarSign,
  ExternalLink,
  Thermometer,
  Layers,
  Send,
  FileText,
  Truck,
  ArrowRight,
  Pencil,
  Edit3,
  Download
} from 'lucide-react';
import { exportReeferSessionsToExcel } from '@/lib/export-excel';
import { formatDateTime, formatDate, formatTime } from '@/lib/display-formatters';
import { CustomerCombobox } from '@/components/customer-combobox';

export default function ReeferMonitoringPage() {
  const { yardId, can, repository, user, role } = useAuth();

  // Phân quyền RBAC V5 chuẩn mực qua can() — Tuyệt đối không hardcode mở quyền theo role
  const canReadReefer = can('reefer.session.read');
  const canCreateRequest = can('reefer.request.create'); // Chỉ CCKB & SYS_ADMIN
  const canUpdateRequest = can('reefer.request.update'); // CCKB & SYS_ADMIN
  const canCancelRequest = can('reefer.request.cancel'); // CCKB & SYS_ADMIN
  const canPlugIn = can('reefer.session.actual_start.record'); // Chỉ người có quyền cắm điện (CCKB & SYS_ADMIN)
  const canUnplug = can('reefer.session.actual_end.record'); // Chỉ người có quyền rút điện (CCKB & SYS_ADMIN)
  const canEditSessionTime = can('reefer.session.time.edit_unpaid'); // CCKB sửa giờ trước thu
  const canApproveAmendment = can('reefer.session.amendment.approve'); // TBP duyệt điều chỉnh
  const canRecordTemp = can('reefer.field_work.note'); // An ninh / Kỹ thuật đo nhiệt độ hiện trường

  const [activeTab, setActiveTab] = useState<'SESSIONS' | 'REQUESTS' | 'TEMP_LOGS'>('SESSIONS');

  const [sessions, setSessions] = useState<ReeferPowerSession[]>([]);
  const [containers, setContainers] = useState<ContainerVisit[]>([]);
  const [requests, setRequests] = useState<ReeferRequest[]>([]);
  const [temperatureLogs, setTemperatureLogs] = useState<ReeferTemperatureLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PLUGGED' | 'UNPLUGGED' | 'PENDING_REVIEW'>('ALL');
  const [requestFilter, setRequestFilter] = useState<'ALL' | 'PLANNED' | 'CONTAINER_ARRIVED' | 'PLUGGED' | 'COMPLETED'>('ALL');

  // Modal Ghi nhận nhiệt độ container lạnh
  const [showTempModal, setShowTempModal] = useState<boolean>(false);
  const [tempContId, setTempContId] = useState<string>('');
  const [tempValue, setTempValue] = useState<string>('-18.0');
  const [tempStatus, setTempStatus] = useState<'RUNNING_NORMAL' | 'TEMP_WARNING' | 'POWER_TRIP' | 'DEFROST'>('RUNNING_NORMAL');
  const [tempNotes, setTempNotes] = useState<string>('');
  const [tempError, setTempError] = useState<string>('');
  const [isSavingTemp, setIsSavingTemp] = useState<boolean>(false);

  // Modal Cắm điện
  const [showPlugModal, setShowPlugModal] = useState<boolean>(false);
  const [selectedContId, setSelectedContId] = useState<string>('');
  const [plugInTime, setPlugInTime] = useState<string>('');
  const [plugPowerMode, setPlugPowerMode] = useState<'HOURLY' | 'CONTINUOUS'>('HOURLY');
  const [plugExpectedHours, setPlugExpectedHours] = useState<number | ''>('');
  const [plugNotes, setPlugNotes] = useState<string>('');
  const [plugSocketCode, setPlugSocketCode] = useState<string>('R01');
  const [plugError, setPlugError] = useState<string>('');
  const [linkingRequestId, setLinkingRequestId] = useState<string | null>(null);

  // Modal Rút điện
  const [showUnplugModal, setShowUnplugModal] = useState<boolean>(false);
  const [selectedSession, setSelectedSession] = useState<ReeferPowerSession | null>(null);
  const [unplugTime, setUnplugTime] = useState<string>('');
  const [unplugNotes, setUnplugNotes] = useState<string>('');
  const [unplugError, setUnplugError] = useState<string>('');
  const [calculatedPreview, setCalculatedPreview] = useState<{
    billableMinutes: number;
    amount: number;
  } | null>(null);

  // Modal Nhập phiên cắm & rút hoàn tất (hồi tố cả 2 mốc theo ảnh/video Zalo timestamp - E04)
  const [showCompletedModal, setShowCompletedModal] = useState<boolean>(false);
  const [compContId, setCompContId] = useState<string>('');
  const [compPlugTime, setCompPlugTime] = useState<string>('');
  const [compUnplugTime, setCompUnplugTime] = useState<string>('');
  const [compNotes, setCompNotes] = useState<string>('');
  const [compError, setCompError] = useState<string>('');
  const [compPreview, setCompPreview] = useState<{ durationMin: number; amount: number } | null>(null);

  // Modal CCKB Chỉnh sửa phiên cắm/rút điện thực tế & Đối chiếu Zalo
  const [showVerifyModal, setShowVerifyModal] = useState<boolean>(false);
  const [verifySession, setVerifySession] = useState<ReeferPowerSession | null>(null);
  const [verifyPlugTime, setVerifyPlugTime] = useState<string>('');
  const [verifyUnplugTime, setVerifyUnplugTime] = useState<string>('');
  const [verifyStatus, setVerifyStatus] = useState<ReeferPowerStatus>('PLUGGED');
  const [verifyNotes, setVerifyNotes] = useState<string>('');
  const [verifyError, setVerifyError] = useState<string>('');
  const [verifyPreview, setVerifyPreview] = useState<{ durationMin: number; amount: number } | null>(null);

  // Modal CCKB Chỉnh sửa Yêu cầu cắm điện container (Tab Requests)
  const [showEditReqModal, setShowEditReqModal] = useState<boolean>(false);
  const [editingReq, setEditingReq] = useState<ReeferRequest | null>(null);
  const [editReqContNo, setEditReqContNo] = useState<string>('');
  const [editReqPlate, setEditReqPlate] = useState<string>('');
  const [editReqCustomer, setEditReqCustomer] = useState<string>('');
  const [editReqPhone, setEditReqPhone] = useState<string>('');
  const [editReqCargo, setEditReqCargo] = useState<string>('');
  const [editReqTemp, setEditReqTemp] = useState<string>('-18°C');
  const [editReqMode, setEditReqMode] = useState<'HOURLY' | 'CONTINUOUS'>('HOURLY');
  const [editReqExpectedHours, setEditReqExpectedHours] = useState<number | ''>('');
  const [editReqStatus, setEditReqStatus] = useState<ReeferRequestStatus>('PLANNED');
  const [editReqNotes, setEditReqNotes] = useState<string>('');
  const [editReqError, setEditReqError] = useState<string>('');

  // Realtime validator cho modal sửa yêu cầu
  const editReqContValidation = validateContainerNumber(editReqContNo);

  // Modal Tạo yêu cầu cắm điện (Hỗ trợ container trong bãi)
  const [showCreateReqModal, setShowCreateReqModal] = useState<boolean>(false);
  const [reqSourceType, setReqSourceType] = useState<'YARD' | 'PRE_ARRIVAL'>('YARD');
  const [reqSelectedYardContId, setReqSelectedYardContId] = useState<string>('');
  const [reqContFilterQuery, setReqContFilterQuery] = useState<string>('');
  const [reqContainerNo, setReqContainerNo] = useState<string>('');
  const [reqPlate, setReqPlate] = useState<string>('');
  const [reqCustomer, setReqCustomer] = useState<string>('');
  const [reqCargo, setReqCargo] = useState<string>('');
  const [reqTemp, setReqTemp] = useState<string>('-18°C');
  const [reqMode, setReqMode] = useState<'HOURLY' | 'CONTINUOUS'>('HOURLY');
  const [reqExpectedHours, setReqExpectedHours] = useState<number | ''>('');
  const [reqStartTime, setReqStartTime] = useState<string>('');
  const [reqNotes, setReqNotes] = useState<string>('');
  const [reqError, setReqError] = useState<string>('');

  // Real-time validation cho mã container dự kiến
  const reqContValidation = validateContainerNumber(reqContainerNo);

  // Helper lấy tên chủ hàng từ phiếu yêu cầu hoặc ghi chú
  const getSessionCustomerName = (s: ReeferPowerSession): string => {
    const matchedReq = requests.find(
      (r) =>
        (r.container_no === s.container_no ||
          (s.container_visit_id && r.container_visit_id === s.container_visit_id)) &&
        r.customer_name
    );
    if (matchedReq?.customer_name) return matchedReq.customer_name;

    if (s.notes) {
      const match = s.notes.match(/(?:Khách|Chủ hàng)[:\s]+([^|;,\n\]]+)/i);
      if (match && match[1]?.trim()) return match[1].trim();
    }

    return '';
  };

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);
  const [currentTimeMs, setCurrentTimeMs] = useState<number>(0);

  // Đồng hồ thời gian thực tự động cập nhật Live Ticker các cont đang cắm mỗi 15 giây
  useEffect(() => {
    setCurrentTimeMs(Date.now());
    const timer = setInterval(() => {
      setCurrentTimeMs(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  // Tải dữ liệu ban đầu
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      repository.getReeferSessions(yardId),
      repository.getContainers(yardId),
      repository.getReeferRequests(yardId),
      repository.getTariffs(),
      repository.getReeferTemperatureLogs(),
    ])
      .then(([sessionList, containerList, requestList, tariffList, tempLogs]) => {
        if (isMounted) {
          setSessions(sessionList);
          setContainers(containerList);
          setRequests(requestList);
          setTariffs(tariffList);
          setTemperatureLogs(tempLogs);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải dữ liệu điện container:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [repository, yardId]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    Promise.all([
      repository.getReeferSessions(yardId),
      repository.getContainers(yardId),
      repository.getReeferRequests(yardId),
      repository.getTariffs(),
      repository.getReeferTemperatureLogs(),
    ])
      .then(([sessionList, containerList, requestList, tariffList, tempLogs]) => {
        setSessions(sessionList);
        setContainers(containerList);
        setRequests(requestList);
        setTariffs(tariffList);
        setTemperatureLogs(tempLogs);
      })
      .catch((err) => {
        console.error('Lỗi tải dữ liệu điện container:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Mở modal ghi nhận nhiệt độ container lạnh
  const handleOpenTempModal = (contId?: string) => {
    setTempError('');
    const pluggedContainers = containers.filter(c => c.is_plugged && c.status === 'IN_YARD');
    const firstId = contId || (pluggedContainers[0]?.id || containers[0]?.id || '');
    setTempContId(firstId);
    setTempValue('-18.0');
    setTempStatus('RUNNING_NORMAL');
    setTempNotes('Kiểm tra nhiệt độ định kỳ ca trực, máy lạnh chạy ổn định');
    setShowTempModal(true);
  };

  const handleConfirmSaveTemp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempContId) {
      setTempError('Vui lòng chọn container.');
      return;
    }
    const c = containers.find(item => item.id === tempContId);
    if (!c) {
      setTempError('Không tìm thấy container.');
      return;
    }
    const parsedTemp = parseFloat(tempValue);
    if (isNaN(parsedTemp)) {
      setTempError('Vui lòng nhập nhiệt độ hợp lệ (VD: -18.5).');
      return;
    }

    setIsSavingTemp(true);
    setTempError('');
    try {
      const res = await repository.recordReeferTemperatureLog({
        container_visit_id: c.id,
        container_no: c.container_no_current,
        temperature_celsius: parsedTemp,
        cooling_status: tempStatus,
        notes: tempNotes.trim() || undefined,
        logged_at: new Date().toISOString(),
        logged_by: user?.id || 'SYSTEM_OPERATOR',
        logged_by_name: user?.fullName || 'Kỹ thuật ca',
      });

      if (!res.success) {
        setTempError(res.error || 'Lỗi ghi nhận nhiệt độ.');
      } else {
        setShowTempModal(false);
        setActionSuccessMsg(`Đã ghi nhận nhiệt độ ${parsedTemp}°C cho container ${c.container_no_current}`);
        handleManualRefresh();
      }
    } catch (err: any) {
      setTempError(err?.message || 'Lỗi kết nối khi lưu log nhiệt độ.');
    } finally {
      setIsSavingTemp(false);
    }
  };

  // Đơn giá tiền điện container theo giờ từ Biểu phí niêm yết (DIEN_CONT_GIO)
  const reeferTariff = tariffs.find((t) => t.code === 'DIEN_CONT_GIO' && t.is_active);
  const reeferHourlyRate = reeferTariff ? reeferTariff.amount : 100000;

  // Tìm yêu cầu cắm điện tương ứng của một container
  const getRequestForContainer = (containerNo: string, containerId?: string) => {
    return requests.find(
      (r) =>
        (r.container_no === containerNo || (containerId && r.container_visit_id === containerId)) &&
        (r.status === 'CONTAINER_ARRIVED' || r.status === 'PLANNED')
    );
  };

  // Toàn bộ container trong bãi chưa cắm điện (bất kể đã có yêu cầu CCKB hay cắm phát sinh)
  const unpluggedContainersInYard = containers.filter((c) => {
    if (c.status !== 'IN_YARD') return false;
    const isAlreadyPlugged = c.is_plugged || sessions.some(
      (s) => s.container_visit_id === c.id && s.power_status === 'PLUGGED'
    );
    return !isAlreadyPlugged;
  });

  // Danh sách container trong bãi ĐÃ CÓ YÊU CẦU CẮM ĐIỆN VÀ CHƯA CẮM
  const requestedContainersInYard = unpluggedContainersInYard.filter((c) => {
    return requests.some(
      (r) =>
        (r.container_no === c.container_no_current || r.container_visit_id === c.id) &&
        (r.status === 'CONTAINER_ARRIVED' || r.status === 'PLANNED')
    );
  });

  // Container trong bãi CHƯA CÓ YÊU CẦU CẮM ĐIỆN (phát sinh ngoài bãi cần tạo/cắm ngay)
  const otherUnpluggedInYard = unpluggedContainersInYard.filter((c) => {
    return !requests.some(
      (r) =>
        (r.container_no === c.container_no_current || r.container_visit_id === c.id) &&
        (r.status === 'CONTAINER_ARRIVED' || r.status === 'PLANNED')
    );
  });

  const getEstimatedUnplugDate = (startTimeStr: string, hours: number): Date => {
    const d = startTimeStr ? new Date(startTimeStr) : new Date();
    return new Date(d.getTime() + (hours || 0) * 3600 * 1000);
  };

  const formatShortDateTime = (d: Date): string => {
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())} ngày ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  };

  const adjustDateTimeLocal = (currentStr: string, minutesDelta: number): string => {
    const d = currentStr ? new Date(currentStr) : new Date();
    const newD = new Date(d.getTime() + minutesDelta * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${newD.getFullYear()}-${pad(newD.getMonth() + 1)}-${pad(newD.getDate())}T${pad(newD.getHours())}:${pad(newD.getMinutes())}`;
  };

  const getNowLocalStr = (): string => {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };

  // Helper format tên nhân viên từ UUID tài khoản
  const formatOperatorName = (operatorId?: string | null): string => {
    if (!operatorId) return '—';
    if (operatorId.includes('-') && operatorId.length > 20) {
      const demo = DEMO_ACCOUNTS.find(a => a.id === operatorId);
      if (demo) return demo.fullName;
      return 'Nhân viên trực ca';
    }
    return operatorId;
  };

  // Mở modal nhập phiên điện hoàn tất hồi tố (E04 - Zalo timestamp)
  const handleOpenCompletedModal = (defaultContId?: string) => {
    setCompError('');
    setLinkingRequestId(null);
    const firstCont = defaultContId
      ? unpluggedContainersInYard.find(c => c.id === defaultContId) || unpluggedContainersInYard[0]
      : (requestedContainersInYard[0] || unpluggedContainersInYard[0]);
    setCompContId(firstCont?.id || '');
    if (firstCont) {
      const matchedReq = getRequestForContainer(firstCont.container_no_current, firstCont.id);
      if (matchedReq) {
        setLinkingRequestId(matchedReq.id);
        setCompNotes(`Khớp Zalo timestamp — Khách: ${matchedReq.customer_name || 'Vãng lai'} | Nhiệt độ: ${matchedReq.target_temperature || 'N/A'}`);
      } else {
        setCompNotes(firstCont.inbound_license_plate ? `Khớp Zalo timestamp xe ${firstCont.inbound_license_plate}` : 'Ảnh & Video Zalo timestamp lúc cắm và rút');
      }
    } else {
      setCompNotes('Ảnh & Video Zalo timestamp lúc cắm và rút');
    }
    const plugStr = adjustDateTimeLocal(getNowLocalStr(), -240);
    const unplugStr = getNowLocalStr();
    setCompPlugTime(plugStr);
    setCompUnplugTime(unplugStr);
    calculateCompletedPreview(plugStr, unplugStr);
    setShowCompletedModal(true);
  };

  // Mở modal hoàn tất Zalo trực tiếp từ 1 dòng Yêu cầu cắm điện (Tab Requests)
  const handleFastCompleteFromRequest = (req: ReeferRequest) => {
    setCompError('');
    setLinkingRequestId(req.id);

    // Tìm container trong bãi
    const matchedCont = containers.find(
      (c) => (c.container_no_current === req.container_no || c.id === req.container_visit_id) && c.status === 'IN_YARD'
    );

    if (!matchedCont) {
      alert(`Container ${req.container_no} chưa vào bãi (IN_YARD). Vui lòng tiếp nhận xe tại Cổng vào trước khi nhập cắm/rút hoàn tất!`);
      return;
    }

    setCompContId(matchedCont.id);
    const plugStr = adjustDateTimeLocal(getNowLocalStr(), -240);
    const unplugStr = getNowLocalStr();
    setCompPlugTime(plugStr);
    setCompUnplugTime(unplugStr);
    setCompNotes(`Khớp Zalo timestamp từ yêu cầu: Khách ${req.customer_name || 'Vãng lai'} | Nhiệt độ: ${req.target_temperature || 'N/A'}${req.notes ? ` | ${req.notes}` : ''}`);
    calculateCompletedPreview(plugStr, unplugStr);
    setShowCompletedModal(true);
  };

  const calculateCompletedPreview = (plug: string, unplug: string) => {
    if (!plug || !unplug) return;
    const pD = new Date(plug);
    const uD = new Date(unplug);
    const now = new Date();
    if (uD.getTime() <= pD.getTime()) {
      setCompError('Thời gian rút điện phải sau thời gian cắm điện.');
      setCompPreview(null);
      return;
    }
    if (uD.getTime() > now.getTime() + 60 * 1000) {
      setCompError('Thời gian rút thực tế không được vượt quá thời điểm hiện tại.');
      setCompPreview(null);
      return;
    }
    setCompError('');
    const sec = Math.max(0, Math.floor((uD.getTime() - pD.getTime()) / 1000));
    const mins = Math.ceil(sec / 900) * 15;
    const amount = Math.round((mins / 60) * reeferHourlyRate);
    setCompPreview({ durationMin: mins, amount });
  };

  const handleConfirmCompletedSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compContId) {
      setCompError('Vui lòng chọn container.');
      return;
    }
    const cont = containers.find(c => c.id === compContId);
    if (!cont) return;

    const pD = new Date(compPlugTime);
    const uD = new Date(compUnplugTime);
    const now = new Date();

    if (isNaN(pD.getTime()) || isNaN(uD.getTime())) {
      setCompError('Vui lòng chọn đầy đủ thời gian cắm và rút điện.');
      return;
    }
    if (uD.getTime() <= pD.getTime()) {
      setCompError('Thời gian rút điện phải sau thời gian cắm điện.');
      return;
    }
    if (uD.getTime() > now.getTime() + 60 * 1000) {
      setCompError('Thời gian rút thực tế không được vượt quá thời điểm hiện tại.');
      return;
    }

    const res = await repository.recordCompletedReeferSession({
      yardId,
      containerVisitId: compContId,
      containerNo: cont.container_no_current,
      pluggedInAt: new Date(compPlugTime).toISOString(),
      unpluggedAt: new Date(compUnplugTime).toISOString(),
      notes: compNotes.trim(),
      operatorId: user?.id || 'reefer-staff',
    });

    if (res.error) {
      setCompError(res.error);
    } else {
      // Cập nhật hoặc tự động tạo yêu cầu tương ứng sang COMPLETED
      if (linkingRequestId) {
        await repository.matchReeferRequest({
          requestId: linkingRequestId,
          status: 'COMPLETED',
        });
      } else {
        const autoMatchReq = requests.find(
          (r) => (r.container_no === cont.container_no_current || r.container_visit_id === cont.id) &&
                 (r.status === 'PLANNED' || r.status === 'CONTAINER_ARRIVED')
        );
        if (autoMatchReq) {
          await repository.matchReeferRequest({
            requestId: autoMatchReq.id,
            containerVisitId: cont.id,
            status: 'COMPLETED',
          });
        } else {
          await repository.createReeferRequest({
            yardId,
            containerNo: cont.container_no_current,
            containerVisitId: cont.id,
            status: 'COMPLETED',
            powerMode: 'HOURLY',
            notes: `Tự động sinh từ phiên hoàn tất Zalo: ${compNotes.trim()}`,
            createdBy: user?.id || 'SYSTEM_OPERATOR',
          });
        }
      }

      setShowCompletedModal(false);
      setActionSuccessMsg(`Đã ghi nhận phiên điện hoàn tất theo Zalo timestamp cho container ${cont.container_no_current}. Tiền điện: ${(res.session?.total_power_amount || 0).toLocaleString()}đ`);
      handleManualRefresh();
    }
  };

  const calculateVerifyPreview = (plug: string, unplug: string) => {
    if (!plug || !unplug) {
      setVerifyPreview(null);
      return;
    }
    const pD = new Date(plug);
    const uD = new Date(unplug);
    const now = new Date();
    if (uD.getTime() <= pD.getTime()) {
      setVerifyError('Thời gian rút điện phải sau thời gian cắm điện.');
      setVerifyPreview(null);
      return;
    }
    if (uD.getTime() > now.getTime() + 60 * 1000) {
      setVerifyError('Thời gian rút thực tế không được vượt quá thời điểm hiện tại.');
      setVerifyPreview(null);
      return;
    }
    setVerifyError('');
    const sec = Math.max(0, Math.floor((uD.getTime() - pD.getTime()) / 1000));
    const mins = Math.ceil(sec / 900) * 15;
    const rate = verifySession?.applied_hourly_rate || reeferHourlyRate;
    const rawAmount = (mins / 60) * rate;
    const amount = Math.round(rawAmount / 5000) * 5000;
    setVerifyPreview({ durationMin: mins, amount });
  };

  // Mở modal CCKB Chỉnh sửa phiên cắm/rút điện thực tế & Zalo
  const handleOpenVerifyModal = (session: ReeferPowerSession) => {
    setVerifySession(session);
    setVerifyError('');
    setVerifyStatus(session.power_status);
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toIso = (dStr: string) => {
      const d = new Date(dStr);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const plugStr = toIso(session.plugged_in_at);
    const unplugStr = session.unplugged_at ? toIso(session.unplugged_at) : '';
    setVerifyPlugTime(plugStr);
    setVerifyUnplugTime(unplugStr);
    setVerifyNotes(session.notes || 'Khớp giờ giắc theo ảnh/video Zalo timestamp');
    calculateVerifyPreview(plugStr, unplugStr);
    setShowVerifyModal(true);
  };

  const handleConfirmVerifyZalo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifySession) return;

    const pD = new Date(verifyPlugTime);
    const now = new Date();

    if (isNaN(pD.getTime())) {
      setVerifyError('Vui lòng chọn thời gian cắm điện hợp lệ.');
      return;
    }

    if (verifyUnplugTime) {
      const uD = new Date(verifyUnplugTime);
      if (isNaN(uD.getTime())) {
        setVerifyError('Vui lòng chọn thời gian rút điện hợp lệ.');
        return;
      }
      if (uD.getTime() <= pD.getTime()) {
        setVerifyError('Thời gian rút điện phải sau thời gian cắm điện.');
        return;
      }
      if (uD.getTime() > now.getTime() + 60 * 1000) {
        setVerifyError('Thời gian rút thực tế không được vượt quá thời điểm hiện tại.');
        return;
      }
    }

    const res = await repository.verifyReeferSessionZalo({
      sessionId: verifySession.id,
      adjustedPluggedInAt: new Date(verifyPlugTime).toISOString(),
      adjustedUnpluggedAt: verifyUnplugTime ? new Date(verifyUnplugTime).toISOString() : undefined,
      verificationNotes: verifyNotes.trim(),
      status: verifyStatus,
    });

    if (res.error) {
      setVerifyError(res.error);
    } else {
      setShowVerifyModal(false);
      setActionSuccessMsg(`CCKB đã cập nhật phiên cắm/rút điện thành công cho container ${verifySession.container_no}`);
      handleManualRefresh();
    }
  };

  // Mở modal CCKB Chỉnh sửa Yêu cầu cắm điện container
  const handleOpenEditReqModal = (req: ReeferRequest) => {
    setEditingReq(req);
    setEditReqError('');
    setEditReqContNo(req.container_no || req.container_no_planned || '');
    setEditReqPlate(req.expected_license_plate || '');
    setEditReqCustomer(req.customer_name || '');
    setEditReqPhone(req.customer_phone || '');
    setEditReqCargo(req.cargo_type || '');
    setEditReqTemp(req.temperature_setting || req.target_temperature || '-18°C');
    setEditReqMode(req.power_mode || 'HOURLY');
    setEditReqExpectedHours(req.expected_hours || 8);
    setEditReqStatus(req.status);
    setEditReqNotes(req.notes || '');
    setShowEditReqModal(true);
  };

  const handleConfirmEditRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReq) return;

    const cleanCont = editReqContNo.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanCont) {
      setEditReqError('Vui lòng nhập số container.');
      return;
    }

    if (!editReqContValidation.isValidFormat) {
      setEditReqError(`Mã container chưa đúng định dạng: ${editReqContValidation.message}`);
      return;
    }

    if (editReqMode === 'HOURLY' && (!editReqExpectedHours || editReqExpectedHours <= 0)) {
      setEditReqError('Vui lòng nhập số giờ dự kiến cắm.');
      return;
    }

    const res = await repository.updateReeferRequest({
      requestId: editingReq.id,
      containerNoPlanned: cleanCont,
      expectedLicensePlate: editReqPlate.trim().toUpperCase() || undefined,
      customerName: editReqCustomer.trim() || undefined,
      customerPhone: editReqPhone.trim() || undefined,
      powerMode: editReqMode,
      temperatureSetting: editReqTemp.trim() || undefined,
      status: editReqStatus,
      notes: editReqNotes.trim() || undefined,
    });

    if (res.error) {
      setEditReqError(res.error);
    } else {
      setShowEditReqModal(false);
      setActionSuccessMsg(`Đã cập nhật yêu cầu cắm điện container ${cleanCont} thành công!`);
      handleManualRefresh();
    }
  };

  // Mở modal cắm điện thông thường
  const handleOpenPlugModal = (defaultContId?: string, requestId?: string) => {
    setPlugError('');
    setLinkingRequestId(requestId || null);
    const targetCont = defaultContId
      ? unpluggedContainersInYard.find((c) => c.id === defaultContId) || unpluggedContainersInYard[0]
      : (requestedContainersInYard[0] || unpluggedContainersInYard[0]);
    setSelectedContId(targetCont?.id || '');
    if (targetCont) {
      const matchedReq = requestId 
        ? requests.find(r => r.id === requestId) 
        : getRequestForContainer(targetCont.container_no_current, targetCont.id);
      if (matchedReq) {
        setLinkingRequestId(matchedReq.id);
        setPlugPowerMode(matchedReq.power_mode || 'HOURLY');
        setPlugExpectedHours(matchedReq.expected_hours || '');
        setPlugNotes(matchedReq.customer_name ? `Khách: ${matchedReq.customer_name}` : '');
      } else {
        setLinkingRequestId(null);
        setPlugPowerMode('HOURLY');
        setPlugExpectedHours('');
        setPlugNotes(targetCont.inbound_license_plate ? `Xe kéo: ${targetCont.inbound_license_plate}` : '');
      }
    } else {
      setLinkingRequestId(null);
      setPlugPowerMode('HOURLY');
      setPlugExpectedHours('');
      setPlugNotes('');
    }
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setPlugInTime(localIso);

    // Tự động tìm giắc cắm điện trống đầu tiên trong 30 trụ điện Khu A
    const busySockets = new Set(
      sessions.filter(s => s.power_status === 'PLUGGED' && s.plug_socket_code).map(s => s.plug_socket_code)
    );
    let autoSocket = 'R01';
    for (let i = 1; i <= 30; i++) {
      const code = `R${String(i).padStart(2, '0')}`;
      if (!busySockets.has(code)) {
        autoSocket = code;
        break;
      }
    }
    setPlugSocketCode(autoSocket);

    setShowPlugModal(true);
  };

  // Mở modal cắm điện từ Yêu cầu đăng ký trước
  const handleFastPlugFromRequest = (req: ReeferRequest) => {
    setPlugError('');
    setLinkingRequestId(req.id);
    
    // Tìm cont trong danh sách
    const matchedCont = containers.find(
      (c) => (c.container_no_current === req.container_no || c.id === req.container_visit_id) && c.status === 'IN_YARD'
    );

    if (matchedCont) {
      setSelectedContId(matchedCont.id);
    } else if (unpluggedContainersInYard.length > 0) {
      setSelectedContId(unpluggedContainersInYard[0].id);
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setPlugInTime(localIso);
    setPlugPowerMode(req.power_mode || 'HOURLY');
    setPlugExpectedHours(req.expected_hours || '');
    setPlugNotes(
      req.customer_name ? `Khách: ${req.customer_name}${req.notes ? ` | ${req.notes}` : ''}` : (req.notes || '')
    );

    if (req.plug_socket_code) {
      setPlugSocketCode(req.plug_socket_code);
    } else {
      const busySockets = new Set(
        sessions.filter(s => s.power_status === 'PLUGGED' && s.plug_socket_code).map(s => s.plug_socket_code)
      );
      let autoSocket = 'R01';
      for (let i = 1; i <= 30; i++) {
        const code = `R${String(i).padStart(2, '0')}`;
        if (!busySockets.has(code)) {
          autoSocket = code;
          break;
        }
      }
      setPlugSocketCode(autoSocket);
    }

    setShowPlugModal(true);
  };

  // Xác nhận cắm điện
  const handleConfirmPlugIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContId) {
      setPlugError('Vui lòng chọn container cần cắm điện.');
      return;
    }

    const targetCont = containers.find((c) => c.id === selectedContId);
    if (!targetCont) return;

    let finalNotes = plugNotes.trim();
    const plugHoursVal = plugPowerMode === 'HOURLY' && plugExpectedHours !== '' && Number(plugExpectedHours) > 0
      ? Number(plugExpectedHours)
      : undefined;
    if (plugPowerMode === 'HOURLY' && plugHoursVal) {
      const estDate = getEstimatedUnplugDate(plugInTime, plugHoursVal);
      const estStr = formatShortDateTime(estDate);
      finalNotes = `[Dự kiến cắm: ${plugHoursVal}h (Rút: ${estStr}) - Ước tính: ${(plugHoursVal * reeferHourlyRate).toLocaleString('vi-VN')}đ] ${finalNotes}`.trim();
    }

    const res = await repository.plugInReefer({
      yardId,
      containerVisitId: selectedContId,
      containerNo: targetCont.container_no_current,
      pluggedInAt: new Date(plugInTime).toISOString(),
      plugSocketCode: plugSocketCode.trim(),
      operatorId: user?.id || '20000000-0000-0000-0000-000000000020',
      notes: finalNotes,
    });

    if (res.error) {
      setPlugError(res.error);
    } else {
      // Nếu có liên kết với yêu cầu trước, cập nhật trạng thái phiếu sang PLUGGED
      if (linkingRequestId) {
        await repository.matchReeferRequest({
          requestId: linkingRequestId,
          containerVisitId: selectedContId,
          status: 'PLUGGED',
        });
      } else {
        // Tự động tìm xem có phiếu nào trùng cont này không
        const autoMatchReq = requests.find(
          (r) => (r.container_no === targetCont.container_no_current || r.container_visit_id === targetCont.id) &&
                 (r.status === 'PLANNED' || r.status === 'CONTAINER_ARRIVED')
        );
        if (autoMatchReq) {
          await repository.matchReeferRequest({
            requestId: autoMatchReq.id,
            containerVisitId: selectedContId,
            status: 'PLUGGED',
          });
        } else {
          // Tự động tạo yêu cầu cắm điện để đồng bộ hồ sơ thương vụ CCKB
          await repository.createReeferRequest({
            yardId,
            containerNo: targetCont.container_no_current,
            containerVisitId: selectedContId,
            status: 'PLUGGED',
            powerMode: plugPowerMode,
            expectedHours: plugHoursVal,
            targetTemperature: '-18°C',
            notes: `Tự động tạo khi cắm điện thực tế: ${finalNotes}`,
            createdBy: user?.id || 'SYSTEM_OPERATOR',
          });
        }
      }

      setShowPlugModal(false);
      setActionSuccessMsg(`Đã ghi nhận cắm điện thành công cho container ${targetCont.container_no_current}`);
      handleManualRefresh();
    }
  };

  // Mở modal rút điện
  const handleOpenUnplugModal = (session: ReeferPowerSession) => {
    setSelectedSession(session);
    setUnplugError('');
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setUnplugTime(localIso);
    setUnplugNotes('');

    // Tính toán trước chi phí (Làm tròn 15p và làm tròn đến 5.000đ, không tiền lẻ)
    const plugDate = new Date(session.plugged_in_at);
    const durationSec = Math.max(0, Math.floor((now.getTime() - plugDate.getTime()) / 1000));
    const billableMins = Math.ceil(durationSec / 900) * 15;
    const rawAmount = (billableMins / 60) * session.applied_hourly_rate;
    const amount = Math.round(rawAmount / 5000) * 5000;

    setCalculatedPreview({ billableMinutes: billableMins, amount });
    setShowUnplugModal(true);
  };

  // Cập nhật preview khi người dùng đổi giờ rút điện
  const handleUnplugTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUnplugTime(val);
    setUnplugError('');
    if (!val || !selectedSession) return;

    const plugDate = new Date(selectedSession.plugged_in_at);
    const unplugDate = new Date(val);
    const now = new Date();

    if (isNaN(unplugDate.getTime())) {
      setCalculatedPreview(null);
      return;
    }
    if (unplugDate.getTime() <= plugDate.getTime()) {
      setUnplugError('Thời gian rút điện phải sau thời gian cắm điện (' + plugDate.toLocaleTimeString('vi-VN') + ' ' + plugDate.toLocaleDateString('vi-VN') + ').');
      setCalculatedPreview(null);
      return;
    }
    if (unplugDate.getTime() > now.getTime() + 60 * 1000) {
      setUnplugError('Thời gian rút thực tế không được vượt quá thời điểm hiện tại.');
      setCalculatedPreview(null);
      return;
    }

    const durationSec = Math.max(0, Math.floor((unplugDate.getTime() - plugDate.getTime()) / 1000));
    const billableMins = Math.ceil(durationSec / 900) * 15;
    const rawAmount = (billableMins / 60) * selectedSession.applied_hourly_rate;
    const amount = Math.round(rawAmount / 5000) * 5000;
    setCalculatedPreview({ billableMinutes: billableMins, amount });
  };

  // Xác nhận rút điện
  const handleConfirmUnplug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;

    const plugDate = new Date(selectedSession.plugged_in_at);
    const unplugDate = new Date(unplugTime);
    const now = new Date();

    if (isNaN(unplugDate.getTime())) {
      setUnplugError('Vui lòng chọn thời gian rút điện hợp lệ.');
      return;
    }
    if (unplugDate.getTime() <= plugDate.getTime()) {
      setUnplugError('Thời gian rút điện phải sau thời gian cắm điện (' + plugDate.toLocaleTimeString('vi-VN') + ' ' + plugDate.toLocaleDateString('vi-VN') + ').');
      return;
    }
    if (unplugDate.getTime() > now.getTime() + 60 * 1000) {
      setUnplugError('Thời gian rút thực tế không được vượt quá thời điểm hiện tại.');
      return;
    }

    const res = await repository.unplugReefer({
      sessionId: selectedSession.id,
      unpluggedAt: new Date(unplugTime).toISOString(),
      operatorId: user?.id || '20000000-0000-0000-0000-000000000020',
      notes: unplugNotes,
    });

    if (res.error) {
      setUnplugError(res.error);
    } else {
      // Cập nhật trạng thái phiếu đăng ký tương ứng (nếu có) sang COMPLETED
      const req = requests.find(r => r.container_no === selectedSession.container_no && r.status === 'PLUGGED');
      if (req) {
        await repository.matchReeferRequest({
          requestId: req.id,
          status: 'COMPLETED',
        });
      }

      setShowUnplugModal(false);
      setActionSuccessMsg(`Đã ghi nhận rút điện thành công cho container ${selectedSession.container_no}. Tiền điện: ${(res.session?.total_power_amount || 0).toLocaleString()}đ`);
      handleManualRefresh();
    }
  };

  // Mở modal tạo yêu cầu cắm điện
  const handleOpenCreateReqModal = (defaultContId?: string) => {
    setReqError('');
    setReqSourceType('YARD');
    const targetCont = defaultContId
      ? unpluggedContainersInYard.find((c) => c.id === defaultContId) || unpluggedContainersInYard[0]
      : unpluggedContainersInYard[0];
    setReqSelectedYardContId(targetCont?.id || '');
    setReqContainerNo(targetCont?.container_no_current || '');
    setReqPlate(targetCont?.inbound_license_plate || '');
    setReqCustomer('');
    setReqCargo('');
    setReqTemp('-18°C');
    setReqMode('HOURLY');
    setReqExpectedHours('');
    setReqNotes('');
    setReqContFilterQuery('');
    setShowCreateReqModal(true);
  };

  // Tạo Yêu cầu cắm điện cho container trong bãi
  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setReqError('');

    if (!reqSelectedYardContId) {
      setReqError('Vui lòng chọn container đang trong bãi.');
      return;
    }
    const yardCont = unpluggedContainersInYard.find((c) => c.id === reqSelectedYardContId);
    if (!yardCont) {
      setReqError('Container được chọn không còn trong bãi hoặc đã cắm điện.');
      return;
    }
    const cleanCont = yardCont.container_no_current;
    const matchedYardContId = yardCont.id;

    const expectedHoursVal = reqMode === 'HOURLY' && reqExpectedHours !== '' && Number(reqExpectedHours) > 0
      ? Number(reqExpectedHours)
      : undefined;

    const res = await repository.createReeferRequest({
      yardId,
      containerNo: cleanCont,
      containerVisitId: matchedYardContId,
      status: 'CONTAINER_ARRIVED',
      expectedLicensePlate: reqPlate.trim().toUpperCase() || undefined,
      customerName: reqCustomer.trim() || undefined,
      powerMode: reqMode,
      expectedHours: expectedHoursVal,
      notes: reqNotes.trim() || undefined,
      createdBy: user?.id || '20000000-0000-0000-0000-000000000020',
    });

    if (res.error) {
      setReqError(res.error);
    } else {
      setShowCreateReqModal(false);
      setReqContainerNo('');
      setReqPlate('');
      setReqCustomer('');
      setReqCargo('');
      setReqNotes('');
      setActionSuccessMsg(`Đã tạo yêu cầu cắm điện cho container ${cleanCont}.`);
      setActiveTab('SESSIONS');
      handleManualRefresh();
    }
  };

  // 1-Chạm: Lưu Yêu cầu & Kích hoạt Cắm điện ngay lập tức (dành cho container đang trong bãi)
  const handleSaveAndPlugImmediately = async () => {
    setReqError('');

    const matchedYardCont = unpluggedContainersInYard.find((c) => c.id === reqSelectedYardContId);
    if (!matchedYardCont) {
      setReqError('Vui lòng chọn container đang trong bãi!');
      return;
    }

    const cleanCont = matchedYardCont.container_no_current;
    const expectedHoursVal = reqMode === 'HOURLY' && reqExpectedHours !== '' && Number(reqExpectedHours) > 0
      ? Number(reqExpectedHours)
      : undefined;

    let finalNotes = reqNotes.trim();
    if (reqMode === 'HOURLY' && expectedHoursVal) {
      const nowStr = getNowLocalStr();
      const estDate = getEstimatedUnplugDate(nowStr, expectedHoursVal);
      const estStr = formatShortDateTime(estDate);
      finalNotes = `[Dự kiến cắm: ${expectedHoursVal}h (Rút: ${estStr}) - Ước tính: ${(expectedHoursVal * reeferHourlyRate).toLocaleString('vi-VN')}đ] ${finalNotes}`.trim();
    }

    // 1. Tạo yêu cầu với trạng thái PLUGGED
    const reqRes = await repository.createReeferRequest({
      yardId,
      containerNo: cleanCont,
      containerVisitId: matchedYardCont.id,
      status: 'PLUGGED',
      expectedLicensePlate: reqPlate.trim().toUpperCase() || matchedYardCont.inbound_license_plate || undefined,
      customerName: reqCustomer.trim() || undefined,
      powerMode: reqMode,
      expectedHours: expectedHoursVal,
      notes: finalNotes || undefined,
      createdBy: user?.id || '20000000-0000-0000-0000-000000000020',
    });

    if (reqRes.error) {
      setReqError(reqRes.error);
      return;
    }

    // 2. Kích hoạt cắm điện ngay lập tức
    const plugRes = await repository.plugInReefer({
      yardId,
      containerVisitId: matchedYardCont.id,
      containerNo: cleanCont,
      pluggedInAt: new Date().toISOString(),
      operatorId: user?.id || '20000000-0000-0000-0000-000000000020',
      notes: finalNotes || undefined,
    });

    if (plugRes.error) {
      setReqError(`Đã tạo yêu cầu nhưng lỗi kích hoạt cắm điện: ${plugRes.error}`);
    } else {
      setShowCreateReqModal(false);
      setActionSuccessMsg(`⚡ Đã lập yêu cầu và kích hoạt cắm điện thành công cho container ${cleanCont}!`);
      setActiveTab('SESSIONS');
      handleManualRefresh();
    }
  };

  // Hủy yêu cầu cắm điện trước
  const handleCancelRequest = async (reqId: string, contNo: string) => {
    if (!confirm(`Bạn có chắc muốn hủy yêu cầu cắm điện trước cho container ${contNo}?`)) return;
    const res = await repository.matchReeferRequest({
      requestId: reqId,
      status: 'CANCELLED',
    });
    if (!res.error) {
      setActionSuccessMsg(`Đã hủy yêu cầu cho container ${contNo}`);
      handleManualRefresh();
    }
  };

  // Lọc danh sách Phiên cắm điện
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = s.container_no.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.power_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Lọc danh sách Yêu cầu đăng ký trước
  const filteredRequests = requests.filter((r) => {
    const matchesSearch = 
      r.container_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.customer_name && r.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.expected_license_plate && r.expected_license_plate.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = requestFilter === 'ALL' || r.status === requestFilter;
    return matchesSearch && matchesStatus;
  });

  // Thống kê KPI
  const activeCount = sessions.filter((s) => s.power_status === 'PLUGGED').length;
  const unpaidCount = sessions.filter((s) => s.power_status === 'UNPLUGGED' && s.payment_status === 'UNPAID').length;
  const arrivedRequests = requests.filter((r) => r.status === 'CONTAINER_ARRIVED');
  const plannedRequests = requests.filter((r) => r.status === 'PLANNED');
  const totalAmountTemp = sessions
    .filter((s) => s.total_power_amount !== null)
    .reduce((acc, curr) => acc + (curr.total_power_amount || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 inline-block">
            Dịch vụ Điện Container & CCKB Bến bãi
          </span>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2 mt-1">
            <Zap className="w-6 h-6 text-amber-500" />
            Giám sát điện Container Lạnh (Reefer)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cắm/rút điện thực tế, xử lý xe chở cont lạnh vào bãi, đăng ký trước cắm điện & tính cước theo giờ
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>

          {/* Nút Xuất Báo cáo Điện Reefer sang XLSX */}
          <button
            onClick={() => exportReeferSessionsToExcel(sessions)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-blue-900 bg-blue-50 border border-blue-300 rounded font-bold shadow-2xs hover:bg-blue-100 transition-colors cursor-pointer"
            title="Xuất Sổ theo dõi cắm điện container lạnh sang file Excel (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất XLSX Reefer ({sessions.length})</span>
          </button>

          {/* Nút Tạo Yêu cầu cắm điện (CCKB) */}
          {canCreateRequest && (
            <button
              onClick={() => handleOpenCreateReqModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[#223873] hover:bg-[#1a2c5a] rounded font-bold shadow-2xs transition-colors cursor-pointer"
              title="Tạo yêu cầu cắm điện cho container đang trong bãi"
            >
              <Layers className="w-3.5 h-3.5" />
              + Tạo yêu cầu cắm điện
            </button>
          )}
        </div>
      </div>

      {/* Thông báo thao tác */}
      {actionSuccessMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg('')} className="text-emerald-700 font-bold hover:underline cursor-pointer">
            Đóng
          </button>
        </div>
      )}

      {/* Bảng KPI tóm tắt */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white p-3.5 rounded border border-slate-300 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Đang cắm điện</p>
            <p className="text-xl font-bold font-mono text-amber-600 mt-0.5">{activeCount} cont</p>
          </div>
          <div className="p-2 bg-amber-50 rounded border border-amber-200">
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
        </div>

        <div className={`p-3.5 rounded border shadow-2xs flex items-center justify-between ${
          unpluggedContainersInYard.length > 0 ? 'bg-amber-50/50 border-amber-300' : 'bg-white border-slate-300'
        }`}>
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cont trong bãi chờ cắm</p>
            <p className={`text-xl font-bold font-mono mt-0.5 ${
              unpluggedContainersInYard.length > 0 ? 'text-amber-700' : 'text-slate-800'
            }`}>
              {unpluggedContainersInYard.length} cont
            </p>
          </div>
          <div className="p-2 bg-amber-100/70 rounded border border-amber-200">
            <Truck className="w-5 h-5 text-amber-700" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded border border-slate-300 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng tiền điện đã tính</p>
            <p className="text-xl font-bold font-mono text-[#0A9444] mt-0.5">{totalAmountTemp.toLocaleString('vi-VN')} đ</p>
          </div>
          <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
            <DollarSign className="w-5 h-5 text-[#0A9444]" />
          </div>
        </div>
      </div>

      {/* KHỐI CHUYÊN DỤNG: CONTAINER ĐANG TRONG BÃI — SẴN SÀNG CẮM ĐIỆN & TẠO YÊU CẦU CCKB */}
      <div className="bg-white rounded border border-slate-300 shadow-2xs overflow-hidden">
        <div className="bg-slate-50 px-3.5 py-2.5 border-b border-slate-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-[#223873]" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
              Container đang trong bãi — Sẵn sàng cắm điện ({unpluggedContainersInYard.length})
            </h2>
            <span className="text-[10px] bg-blue-100 text-[#223873] font-bold px-1.5 py-0.5 rounded border border-blue-200">
              CCKB & An ninh
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-slate-500 hidden md:inline">
              {unpluggedContainersInYard.length > 0 
                ? 'Chọn cont để lập yêu cầu cắm điện' 
                : 'Tất cả cont lạnh trong bãi đã được cấp nguồn'}
            </span>
            {canCreateRequest && unpluggedContainersInYard.length > 0 && (
              <button
                type="button"
                onClick={() => handleOpenCreateReqModal()}
                className="text-xs font-bold text-[#223873] hover:text-[#1a2c5a] bg-white hover:bg-slate-100 px-2.5 py-1 rounded border border-slate-300 transition-colors cursor-pointer inline-flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Tạo yêu cầu cắm điện</span>
              </button>
            )}
          </div>
        </div>

        {unpluggedContainersInYard.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 bg-slate-50/50 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Hiện tại không có container nào trong bãi đang chờ cắm điện.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 border-b border-slate-300 text-[11px] text-slate-700 uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-3.5 py-2">Số Container</th>
                  <th className="px-3.5 py-2">Xe chở vào</th>
                  <th className="px-3.5 py-2">Thời điểm vào bãi</th>
                  <th className="px-3.5 py-2">Tình trạng Yêu cầu CCKB</th>
                  <th className="px-3.5 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {unpluggedContainersInYard.map((c) => {
                  const matchedReq = requests.find(
                    (r) =>
                      (r.container_no === c.container_no_current || r.container_visit_id === c.id) &&
                      (r.status === 'CONTAINER_ARRIVED' || r.status === 'PLANNED')
                  );
                  return (
                    <tr key={c.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-3.5 py-2 font-mono font-bold text-sm text-[#223873]">
                        {c.container_no_current}
                      </td>
                      <td className="px-3.5 py-2 font-mono text-slate-800">
                        {c.inbound_license_plate ? (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300 font-bold">
                            {c.inbound_license_plate}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Tồn bãi</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 font-mono text-slate-600 text-[11px]">
                        {new Date(c.inbound_at || c.created_at).toLocaleTimeString('vi-VN')} {new Date(c.inbound_at || c.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-3.5 py-2">
                        {matchedReq ? (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Zap className="w-3 h-3 text-amber-600" />
                              Đã có yêu cầu{matchedReq.expected_hours ? ` (${matchedReq.expected_hours}h)` : ''}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa tạo yêu cầu cắm điện</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {matchedReq ? (
                            <>
                              {canPlugIn && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenPlugModal(c.id, matchedReq.id)}
                                  className="px-2.5 py-1 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                                  title="Cắm điện container theo yêu cầu đã lập"
                                >
                                  <Zap className="w-3.5 h-3.5 fill-current" />
                                  <span>⚡ Cắm điện ngay</span>
                                </button>
                              )}
                              {canUpdateRequest && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditReqModal(matchedReq)}
                                  className="px-2 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded transition-colors cursor-pointer flex items-center gap-1"
                                  title="Chỉnh sửa thông tin yêu cầu cắm điện"
                                >
                                  <Pencil className="w-3 h-3 text-slate-500" />
                                  <span>Sửa yêu cầu</span>
                                </button>
                              )}
                            </>
                          ) : (
                            canCreateRequest ? (
                              <button
                                type="button"
                                onClick={() => handleOpenCreateReqModal(c.id)}
                                className="px-2.5 py-1 text-xs font-bold text-[#223873] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors cursor-pointer flex items-center gap-1"
                                title="Tạo yêu cầu cắm điện cho container này"
                              >
                                <Layers className="w-3.5 h-3.5 text-[#223873]" />
                                <span>Tạo yêu cầu cắm điện</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Chỉ xem hiện trường</span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* TIÊU ĐỀ KHỐI THEO DÕI */}
      <div className="flex items-center justify-between border-b border-slate-300 pb-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-wide">
            Theo dõi cắm rút điện container ({sessions.length})
          </h2>
        </div>
      </div>

      {/* NỘI DUNG THEO DÕI: PHIÊN CẮM ĐIỆN THỰC TẾ */}
      <div className="space-y-3.5">
          {/* Bộ lọc và Tìm kiếm */}
          <div className="bg-white p-3 rounded border border-slate-300 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm theo số container..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-[#223873] bg-white font-mono"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {(['ALL', 'PLUGGED', 'UNPLUGGED', 'PENDING_REVIEW'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-bold rounded transition-colors whitespace-nowrap cursor-pointer border ${
                    statusFilter === st
                      ? 'bg-[#223873] text-white border-[#223873]'
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {st === 'ALL' && 'Tất cả'}
                  {st === 'PLUGGED' && 'Đang cắm'}
                  {st === 'UNPLUGGED' && 'Đã rút'}
                  {st === 'PENDING_REVIEW' && 'Chờ CCKB duyệt (0s)'}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách phiên cắm điện */}
          <div className="bg-white rounded border border-slate-300 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-100 border-b border-slate-300 text-[11px] text-slate-700 uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5">Số Container</th>
                    <th className="px-3.5 py-2.5">Chủ hàng</th>
                    <th className="px-3.5 py-2.5">Thời gian cắm</th>
                    <th className="px-3.5 py-2.5">Thời gian rút</th>
                    <th className="px-3.5 py-2.5">Thời lượng (Làm tròn 15p)</th>
                    <th className="px-3.5 py-2.5">Đơn giá / Thành tiền</th>
                    <th className="px-3.5 py-2.5">Trạng thái</th>
                    <th className="px-3.5 py-2.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                        Không có phiên cắm điện nào phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((s) => {
                      const isPlugged = s.power_status === 'PLUGGED';
                      const plugDate = new Date(s.plugged_in_at);
                      const unplugDate = s.unplugged_at ? new Date(s.unplugged_at) : null;
                      const customerName = getSessionCustomerName(s);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono font-bold text-[#223873]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{s.container_no}</span>
                              {s.plug_socket_code && (
                                <span className="text-[10px] font-sans font-bold bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                  <span>⚡ Trụ:</span>
                                  <strong>{s.plug_socket_code}</strong>
                                </span>
                              )}
                            </div>
                            {s.notes && s.notes.includes('Dự kiến') && (
                              <div className="text-[10px] font-sans text-amber-800 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 mt-1 max-w-xs truncate" title={s.notes}>
                                {s.notes.split('|')[0]?.trim()}
                              </div>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-xs text-slate-800 font-medium">
                            {customerName ? (
                              <span className="font-semibold text-slate-800">{customerName}</span>
                            ) : (
                              <span className="text-slate-400 italic">—</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-xs text-slate-700 font-mono">
                            {plugDate.toLocaleTimeString('vi-VN')} {plugDate.toLocaleDateString('vi-VN')}
                            <div className="text-[10px] text-slate-500 font-sans mt-0.5">{formatOperatorName(s.plugged_in_by)}</div>
                          </td>
                          <td className="px-3.5 py-2.5 text-xs text-slate-700 font-mono">
                            {unplugDate ? (
                              <>
                                {unplugDate.toLocaleTimeString('vi-VN')} {unplugDate.toLocaleDateString('vi-VN')}
                                <div className="text-[10px] text-slate-500 font-sans mt-0.5">{formatOperatorName(s.unplugged_by)}</div>
                              </>
                            ) : (
                              <span className="text-amber-700 font-semibold flex items-center gap-1 font-sans">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                Đang kết nối nguồn
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-xs">
                            {isPlugged ? (
                              (() => {
                                const nowMs = currentTimeMs || plugDate.getTime();
                                const elapsedMs = Math.max(0, nowMs - plugDate.getTime());
                                const elapsedMins = Math.floor(elapsedMs / 60000);
                                const h = Math.floor(elapsedMins / 60);
                                const m = elapsedMins % 60;
                                const billableM = Math.ceil(elapsedMins / 15) * 15;
                                return (
                                  <div className="space-y-0.5">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-300">
                                      <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                                      <span>{h}h {m}p</span>
                                      <span className="text-[10px] text-amber-700 font-sans font-normal">({billableM}p cước)</span>
                                    </span>
                                  </div>
                                );
                              })()
                            ) : s.billable_minutes ? (
                              <span className="font-bold text-slate-800 font-mono">
                                {s.billable_minutes}p ({Math.round((s.billable_minutes / 60) * 100) / 100}h)
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold">0p (RV02)</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-xs font-mono">
                            <div>
                              <span className="text-slate-500 font-medium text-[11px]">
                                {s.applied_hourly_rate ? `${s.applied_hourly_rate.toLocaleString('vi-VN')} đ/h` : `${reeferHourlyRate.toLocaleString('vi-VN')} đ/h`}
                              </span>
                            </div>
                            {isPlugged ? (
                              (() => {
                                const rate = s.applied_hourly_rate || reeferHourlyRate;
                                const nowMs = currentTimeMs || plugDate.getTime();
                                const elapsedMs = Math.max(0, nowMs - plugDate.getTime());
                                const elapsedMins = Math.floor(elapsedMs / 60000);
                                const billableM = Math.ceil(elapsedMins / 15) * 15;
                                const rawEst = (billableM / 60) * rate;
                                const estAmount = Math.round(rawEst / 5000) * 5000;
                                return (
                                  <div className="font-bold text-amber-800 font-mono text-xs mt-0.5 flex items-center gap-1">
                                    <span>~ {estAmount.toLocaleString('vi-VN')} đ</span>
                                    <span className="text-[10px] font-sans font-normal text-slate-500">(Tạm tính)</span>
                                  </div>
                                );
                              })()
                            ) : s.total_power_amount !== null ? (
                              <div className="font-bold text-[#0A9444]">
                                {s.total_power_amount.toLocaleString('vi-VN')} đ
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3.5 py-2.5">
                            {s.power_status === 'PLUGGED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                <Zap className="w-3 h-3 text-amber-500" />
                                Đang cắm điện
                              </span>
                            )}
                            {s.power_status === 'UNPLUGGED' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                                Đã rút điện
                              </span>
                            )}
                            {s.power_status === 'PENDING_REVIEW' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
                                <AlertTriangle className="w-3 h-3" />
                                Chờ CCKB duyệt (0s)
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {(canEditSessionTime || canApproveAmendment) && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenVerifyModal(s)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-300 cursor-pointer"
                                  title="CCKB kiểm tra ảnh/video timestamp và điều chỉnh cắm/rút thực tế hoặc dự kiến"
                                >
                                  <Pencil className="w-3 h-3 text-blue-600" />
                                  <span>Sửa / Khớp</span>
                                </button>
                              )}
                              {isPlugged && canUnplug && (
                                <button
                                  onClick={() => handleOpenUnplugModal(s)}
                                  className="px-2.5 py-1 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded transition-colors cursor-pointer border border-amber-300"
                                >
                                  Rút điện & Tính cước
                                </button>
                              )}
                              {isPlugged && !canUnplug && (
                                <span className="text-xs text-slate-400 italic">Đang cắm điện</span>
                              )}
                              {!isPlugged && s.payment_status === 'PAID' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Đã thu tiền
                                </span>
                              )}
                              {!isPlugged && s.payment_status !== 'PAID' && (s.total_power_amount || 0) > 0 && (
                                can('reefer.payment.collect') ? (
                                  <Link
                                    href="/billing"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded transition-colors shadow-2xs"
                                    title="Chuyển sang Sổ cái để thu tiền điện"
                                  >
                                    <span>Thu tiền điện</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title="Chỉ CCKB được thu tiền điện theo chuẩn V5">
                                    Chờ CCKB thu
                                  </span>
                                )
                              )}
                              {!(canEditSessionTime || canApproveAmendment) && !(isPlugged && canUnplug) && isPlugged && (
                                <span className="text-[11px] text-slate-400 italic">Chỉ xem</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>


      {/* MODAL CẮM ĐIỆN */}
      {showPlugModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 max-w-2xl w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Cắm điện Container Lạnh
              </h3>
              <button
                onClick={() => setShowPlugModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {plugError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-700 rounded text-xs">
                {plugError}
              </div>
            )}

            <form onSubmit={handleConfirmPlugIn} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Chọn Container cần cắm điện <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {unpluggedContainersInYard.length} cont chờ cắm
                  </span>
                </div>
                {unpluggedContainersInYard.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-300 rounded space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Không có container nào trong bãi đang chờ cắm điện</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Tất cả container hiện tại trong bãi đã được cắm điện hoặc chưa tiếp nhận container mới.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowPlugModal(false);
                        handleOpenCreateReqModal();
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5a] rounded shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo Yêu cầu cắm điện trước (CCKB)</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <select
                      value={selectedContId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedContId(id);
                        const c = containers.find((item) => item.id === id);
                        if (c) {
                          const r = getRequestForContainer(c.container_no_current, c.id);
                          if (r) {
                            setLinkingRequestId(r.id);
                            setPlugPowerMode(r.power_mode || 'HOURLY');
                            setPlugExpectedHours(r.expected_hours || '');
                            setPlugNotes(`Yêu cầu từ khách: ${r.customer_name || 'Vãng lai'}`);
                          } else {
                            setLinkingRequestId(null);
                            setPlugPowerMode('HOURLY');
                            setPlugExpectedHours('');
                            setPlugNotes(c.inbound_license_plate ? `Xe kéo: ${c.inbound_license_plate}` : '');
                          }
                        }
                      }}
                      className="w-full p-2 border border-slate-300 rounded text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#0A9444]"
                    >
                      {requestedContainersInYard.length > 0 && (
                        <optgroup label={`⭐ ĐÃ CÓ YÊU CẦU CCKB (${requestedContainersInYard.length})`}>
                          {requestedContainersInYard.map((c) => {
                            const r = getRequestForContainer(c.container_no_current, c.id);
                            return (
                              <option key={c.id} value={c.id}>
                                {c.container_no_current}{c.inbound_license_plate ? ` (Xe: ${c.inbound_license_plate})` : ''}{r?.customer_name ? ` - Khách: ${r.customer_name}` : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
                      {otherUnpluggedInYard.length > 0 && (
                        <optgroup label={`📦 CONTAINER TRONG BÃI CHƯA CÓ YÊU CẦU (${otherUnpluggedInYard.length})`}>
                          {otherUnpluggedInYard.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.container_no_current}{c.inbound_license_plate ? ` (Xe: ${c.inbound_license_plate})` : ''} - Cắm phát sinh
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    {/* Banner ghi chú nếu cont chưa có yêu cầu */}
                    {selectedContId && otherUnpluggedInYard.some((c) => c.id === selectedContId) && (
                      <div className="mt-1.5 p-2 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-900 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>
                          Container này chưa có yêu cầu trước. Hệ thống sẽ tự động lập phiếu yêu cầu CCKB tương ứng khi cắm điện để lưu đầy đủ chứng từ thương vụ!
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* VỊ TRÍ TRỤ / GIẮC CẮM ĐIỆN 380V (KHU A REEFER) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Vị trí Trụ / Giắc cắm điện 380V (Khu A) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                    30 Trụ 3 pha (R01 - R30)
                  </span>
                </div>
                <select
                  value={plugSocketCode}
                  onChange={(e) => setPlugSocketCode(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs sm:text-sm font-bold font-mono focus:outline-none focus:ring-1 focus:ring-[#0A9444] bg-white"
                >
                  {Array.from({ length: 30 }, (_, i) => {
                    const code = `R${String(i + 1).padStart(2, '0')}`;
                    const activeSession = sessions.find(
                      (s) => s.power_status === 'PLUGGED' && s.plug_socket_code === code
                    );
                    const isBusy = Boolean(activeSession);
                    return (
                      <option 
                        key={code} 
                        value={code} 
                        disabled={isBusy && activeSession?.container_visit_id !== selectedContId}
                      >
                        {code} — {isBusy ? `🔴 Bận (${activeSession?.container_no})` : '🟢 Trống — Sẵn sàng (380V)'}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Hệ thống kiểm soát chống cắm trùng giắc. Khi rút điện, giắc cắm sẽ tự động được giải phóng về trạng thái trống.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Thời gian cắm thực tế (Khớp giờ giắc Zalo) <span className="font-normal text-slate-500">(hh:mm dd/MM/yyyy)</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="datetime-local"
                    value={plugInTime}
                    onChange={(e) => setPlugInTime(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded text-xs sm:text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#0A9444]"
                  />
                </div>
                {plugInTime && (
                  <div className="text-[11px] text-emerald-800 font-mono mt-1 font-semibold flex items-center gap-1">
                    <span>⏱️ Định dạng đã chọn:</span>
                    <strong className="bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">{formatDateTime(plugInTime)}</strong>
                  </div>
                )}
                {/* Nút lùi giờ nhanh theo bằng chứng Zalo */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-semibold">Khớp giờ giắc Zalo:</span>
                  {[
                    { label: 'Bây giờ', mins: 0 },
                    { label: '-5p', mins: -5 },
                    { label: '-15p', mins: -15 },
                    { label: '-30p', mins: -30 },
                    { label: '-1h', mins: -60 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => setPlugInTime(btn.mins === 0 ? getNowLocalStr() : adjustDateTimeLocal(getNowLocalStr(), btn.mins))}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* CHỌN CHẾ ĐỘ CẮM ĐIỆN VÀ SỐ GIỜ DỰ KIẾN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chế độ cắm điện
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPlugPowerMode('HOURLY')}
                    className={`py-1.5 px-3 rounded border text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                      plugPowerMode === 'HOURLY'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>Cắm theo tiếng ({Math.round(reeferHourlyRate / 1000)}k/h)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlugPowerMode('CONTINUOUS')}
                    className={`py-1.5 px-3 rounded border text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                      plugPowerMode === 'CONTINUOUS'
                        ? 'bg-[#223873] text-white border-[#223873] shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>Cắm thông (24/7)</span>
                  </button>
                </div>
              </div>

              {plugPowerMode === 'HOURLY' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-950">
                      Số giờ dự kiến cắm (Nhập nhanh / Tùy chọn)
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 font-mono">
                      Đơn giá {reeferHourlyRate.toLocaleString('vi-VN')} đ/h
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={plugExpectedHours}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPlugExpectedHours(v === '' ? '' : Math.max(1, parseInt(v) || 1));
                      }}
                      placeholder="Tùy chọn"
                      className="w-24 px-2.5 py-1 border border-amber-300 rounded text-sm font-bold bg-white text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <div className="flex items-center gap-1 flex-wrap">
                      {[4, 8, 12, 24].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setPlugExpectedHours(h)}
                          className={`px-2 py-1 text-xs font-bold rounded transition-colors cursor-pointer ${
                            plugExpectedHours === h
                              ? 'bg-amber-600 text-white'
                              : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                          }`}
                        >
                          +{h}h
                        </button>
                      ))}
                    </div>
                  </div>

                  {plugExpectedHours !== '' && Number(plugExpectedHours) > 0 ? (
                    <div className="pt-2 border-t border-amber-200 text-[11px] text-amber-900 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-amber-800">Dự kiến rút điện lúc:</span>
                        <span className="font-bold text-amber-950 font-mono">
                          {formatShortDateTime(getEstimatedUnplugDate(plugInTime, Number(plugExpectedHours)))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-800">Ước tính cước điện:</span>
                        <span className="font-bold text-[#0A9444] font-mono">
                          {Math.round((Number(plugExpectedHours) * reeferHourlyRate) / 5000 * 5000).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-800 italic pt-1 border-t border-amber-200">
                      Chưa nhập số giờ dự kiến (hệ thống sẽ chốt cước chính xác khi thực hiện thao tác rút điện).
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú hiện trường
                </label>
                <textarea
                  value={plugNotes}
                  onChange={(e) => setPlugNotes(e.target.value)}
                  placeholder="Vị trí ổ cắm, nhiệt độ cài đặt, loại hàng..."
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#0A9444]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPlugModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={unpluggedContainersInYard.length === 0}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] disabled:bg-slate-300 rounded cursor-pointer shadow-2xs"
                >
                  Xác nhận cắm điện
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RÚT ĐIỆN */}
      {showUnplugModal && selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 max-w-2xl w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Rút điện & Chốt cước Container
              </h3>
              <button
                onClick={() => setShowUnplugModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {unplugError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-700 rounded text-xs">
                {unplugError}
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1 text-xs">
              <p><span className="text-slate-500">Số container:</span> <span className="font-mono font-bold text-[#223873]">{selectedSession.container_no}</span></p>
              <p><span className="text-slate-500">Thời gian cắm:</span> <span className="font-mono font-semibold text-slate-800">{new Date(selectedSession.plugged_in_at).toLocaleString('vi-VN')}</span></p>
              <p><span className="text-slate-500">Đơn vị cắm:</span> {selectedSession.plugged_in_by}</p>
            </div>

            <form onSubmit={handleConfirmUnplug} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Thời gian rút thực tế (hh:mm dd/MM/yyyy — Khớp giờ giắc Zalo)
                </label>
                <input
                  type="datetime-local"
                  value={unplugTime}
                  onChange={handleUnplugTimeChange}
                  required
                  className="w-full p-2 border border-slate-300 rounded text-xs sm:text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
                {unplugTime && (
                  <p className="text-[11px] font-mono text-amber-700 mt-1 font-semibold flex items-center gap-1">
                    <span>⏱️ Định dạng đã chọn:</span>
                    <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
                      {formatDateTime(unplugTime)}
                    </span>
                  </p>
                )}
                {/* Nút lùi giờ nhanh theo bằng chứng Zalo */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-500 font-semibold">Khớp giờ giắc Zalo:</span>
                  {[
                    { label: 'Bây giờ', mins: 0 },
                    { label: '-5p', mins: -5 },
                    { label: '-15p', mins: -15 },
                    { label: '-30p', mins: -30 },
                    { label: '-1h', mins: -60 },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      type="button"
                      onClick={() => {
                        const targetTime = btn.mins === 0 ? getNowLocalStr() : adjustDateTimeLocal(getNowLocalStr(), btn.mins);
                        setUnplugTime(targetTime);
                        if (selectedSession) {
                          const plugDate = new Date(selectedSession.plugged_in_at);
                          const unplugDate = new Date(targetTime);
                          const durationSec = Math.max(0, Math.floor((unplugDate.getTime() - plugDate.getTime()) / 1000));
                          const billableMins = Math.ceil(durationSec / 900) * 15;
                          const amount = Math.round((billableMins / 60) * selectedSession.applied_hourly_rate);
                          setCalculatedPreview({ billableMinutes: billableMins, amount });
                        }
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>

              {calculatedPreview && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded space-y-1 text-xs text-emerald-900">
                  <p className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Tính cước theo quy tắc (Làm tròn 15 phút — Tròn 5.000đ, không tiền lẻ):
                  </p>
                  <p>• Thời lượng tính tiền: <span className="font-mono font-bold">{calculatedPreview.billableMinutes} phút</span></p>
                  <p>• Đơn giá: <span className="font-mono font-bold">{selectedSession.applied_hourly_rate.toLocaleString('vi-VN')} đ/giờ</span></p>
                  <p className="text-sm font-mono font-bold text-[#0A9444] pt-1">
                    • Tổng tiền điện: {calculatedPreview.amount.toLocaleString('vi-VN')} VND
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú khi rút điện & Bằng chứng Zalo
                </label>
                <textarea
                  value={unplugNotes}
                  onChange={(e) => setUnplugNotes(e.target.value)}
                  placeholder="Giờ giắc ảnh/video Zalo lúc rút, tình trạng nhiệt độ khi rút..."
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowUnplugModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded shadow-2xs cursor-pointer"
                >
                  Xác nhận rút điện
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NHẬP PHIÊN HOÀN TẤT HỒI TỐ (E04 - BẰNG CHỨNG ZALO) */}
      {showCompletedModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 max-w-2xl w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">Hồi tố ngoài bãi — Zalo Timestamp</span>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Nhập Hoàn Tất Phiên Điện (Cắm & Rút)
                </h3>
              </div>
              <button
                onClick={() => setShowCompletedModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {compError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-700 rounded text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{compError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmCompletedSession} className="space-y-3.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Chọn Container cần nhập cắm & rút hoàn tất <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {unpluggedContainersInYard.length} cont trong bãi
                  </span>
                </div>
                {unpluggedContainersInYard.length === 0 ? (
                  <div className="p-3 bg-slate-50 border border-slate-300 rounded space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Không có container nào trong bãi đang chờ cắm điện</span>
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Tất cả container hiện tại trong bãi đã được cắm điện hoặc chưa tiếp nhận container mới.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCompletedModal(false);
                        handleOpenCreateReqModal();
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5a] rounded shadow-2xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo Yêu cầu cắm điện trước (CCKB)</span>
                    </button>
                  </div>
                ) : (
                  <div>
                    <select
                      value={compContId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setCompContId(id);
                        const c = containers.find((item) => item.id === id);
                        if (c) {
                          const r = getRequestForContainer(c.container_no_current, c.id);
                          if (r) {
                            setLinkingRequestId(r.id);
                            setCompNotes(`Khớp Zalo timestamp — Khách: ${r.customer_name || 'Vãng lai'}`);
                          } else {
                            setLinkingRequestId(null);
                            setCompNotes(c.inbound_license_plate ? `Khớp Zalo timestamp xe ${c.inbound_license_plate}` : 'Ảnh & Video Zalo timestamp lúc cắm và rút');
                          }
                        }
                      }}
                      className="w-full p-2 border border-slate-300 rounded text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#0A9444]"
                    >
                      {requestedContainersInYard.length > 0 && (
                        <optgroup label={`⭐ ĐÃ CÓ YÊU CẦU CCKB (${requestedContainersInYard.length})`}>
                          {requestedContainersInYard.map((c) => {
                            const r = getRequestForContainer(c.container_no_current, c.id);
                            return (
                              <option key={c.id} value={c.id}>
                                {c.container_no_current}{c.inbound_license_plate ? ` (Xe: ${c.inbound_license_plate})` : ''}{r?.customer_name ? ` - Khách: ${r.customer_name}` : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      )}
                      {otherUnpluggedInYard.length > 0 && (
                        <optgroup label={`📦 CONTAINER TRONG BÃI CHƯA CÓ YÊU CẦU (${otherUnpluggedInYard.length})`}>
                          {otherUnpluggedInYard.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.container_no_current}{c.inbound_license_plate ? ` (Xe: ${c.inbound_license_plate})` : ''} - Cắm phát sinh
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>

                    {/* Banner ghi chú nếu cont chưa có yêu cầu */}
                    {compContId && otherUnpluggedInYard.some((c) => c.id === compContId) && (
                      <div className="mt-1.5 p-2 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-900 flex items-start gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <span>
                          Container này chưa có yêu cầu trước. Khi xác nhận, hệ thống sẽ tự động lập phiếu yêu cầu CCKB hoàn tất tương ứng để lưu đầy đủ chứng từ thương vụ!
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thời gian cắm (hh:mm dd/MM/yyyy — Zalo giắc) *
                  </label>
                  <input
                    type="datetime-local"
                    value={compPlugTime}
                    onChange={(e) => {
                      setCompPlugTime(e.target.value);
                      calculateCompletedPreview(e.target.value, compUnplugTime);
                    }}
                    required
                    className="w-full p-2 border border-slate-300 rounded text-xs sm:text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#0A9444]"
                  />
                  {compPlugTime && (
                    <p className="text-[11px] font-mono text-emerald-700 mt-1 font-semibold flex items-center gap-1">
                      <span>⏱️ Cắm:</span>
                      <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
                        {formatDateTime(compPlugTime)}
                      </span>
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {[
                      { label: '-1h', delta: -60 },
                      { label: '-2h', delta: -120 },
                      { label: '-4h', delta: -240 },
                    ].map((b) => (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => {
                          const p = adjustDateTimeLocal(getNowLocalStr(), b.delta);
                          setCompPlugTime(p);
                          calculateCompletedPreview(p, compUnplugTime);
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thời gian rút (hh:mm dd/MM/yyyy — Zalo giắc) *
                  </label>
                  <input
                    type="datetime-local"
                    value={compUnplugTime}
                    onChange={(e) => {
                      setCompUnplugTime(e.target.value);
                      calculateCompletedPreview(compPlugTime, e.target.value);
                    }}
                    required
                    className="w-full p-2 border border-slate-300 rounded text-xs sm:text-sm font-mono focus:outline-none focus:ring-1 focus:ring-[#0A9444]"
                  />
                  {compUnplugTime && (
                    <p className="text-[11px] font-mono text-emerald-700 mt-1 font-semibold flex items-center gap-1">
                      <span>⏱️ Rút:</span>
                      <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
                        {formatDateTime(compUnplugTime)}
                      </span>
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                    {[
                      { label: 'Bây giờ', delta: 0 },
                      { label: '-15p', delta: -15 },
                      { label: '-30p', delta: -30 },
                    ].map((b) => (
                      <button
                        key={b.label}
                        type="button"
                        onClick={() => {
                          const u = b.delta === 0 ? getNowLocalStr() : adjustDateTimeLocal(getNowLocalStr(), b.delta);
                          setCompUnplugTime(u);
                          calculateCompletedPreview(compPlugTime, u);
                        }}
                        className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                      >
                        {b.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {compPreview && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded space-y-1 text-xs text-emerald-900">
                  <p className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Cước phí tự động (Làm tròn 15 phút @ {reeferHourlyRate.toLocaleString('vi-VN')} đ/h):
                  </p>
                  <div className="flex justify-between items-center pt-1">
                    <span>Thời lượng tính tiền: <strong className="font-mono">{compPreview.durationMin} phút ({Math.round(compPreview.durationMin / 60 * 100) / 100}h)</strong></span>
                    <span className="text-sm font-bold font-mono text-[#0A9444]">{compPreview.amount.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú bằng chứng Zalo Timestamp & Hiện trường *
                </label>
                <textarea
                  value={compNotes}
                  onChange={(e) => setCompNotes(e.target.value)}
                  placeholder="Ảnh/video gửi nhóm Zalo lúc cắm & rút (có đồng hồ timestamp), vị trí giắc cắm..."
                  rows={2}
                  required
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#0A9444]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCompletedModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={unpluggedContainersInYard.length === 0}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] disabled:bg-slate-300 rounded shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Xác nhận & Ghi nhận Sổ cái</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CCKB CHỈNH SỬA PHIÊN CẮM / RÚT THỰC TẾ & ĐỐI CHIẾU ZALO */}
      {showVerifyModal && verifySession && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 max-w-2xl w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider">Thương vụ CCKB Bến bãi</span>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <Pencil className="w-5 h-5 text-blue-600" />
                  Sửa Cắm / Rút Thực tế & Khớp Giờ Zalo
                </h3>
              </div>
              <button
                onClick={() => setShowVerifyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {verifyError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-700 rounded text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Số container:</span>
                <span className="font-mono font-bold text-[#223873]">{verifySession.container_no}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Người ghi nhận ban đầu:</span>
                <span className="font-medium text-slate-800">{verifySession.plugged_in_by}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Đơn giá áp dụng:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {(verifySession.applied_hourly_rate || reeferHourlyRate).toLocaleString('vi-VN')} đ/giờ
                </span>
              </div>
              {verifySession.notes && (
                <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 mt-1">
                  <strong>Ghi chú hiện thời:</strong> {verifySession.notes}
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmVerifyZalo} className="space-y-3.5">
              {/* Giờ cắm thực tế */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Thời gian cắm thực tế (hh:mm dd/MM/yyyy) <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Bắt đầu tính cước</span>
                </div>
                <input
                  type="datetime-local"
                  value={verifyPlugTime}
                  onChange={(e) => {
                    setVerifyPlugTime(e.target.value);
                    calculateVerifyPreview(e.target.value, verifyUnplugTime);
                  }}
                  required
                  className="w-full p-2 border border-slate-300 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
                {verifyPlugTime && (
                  <p className="text-[11px] font-mono text-blue-700 mt-1 font-semibold flex items-center gap-1">
                    <span>⏱️ Cắm:</span>
                    <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-300">
                      {formatDateTime(verifyPlugTime)}
                    </span>
                  </p>
                )}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {[
                    { label: 'Bây giờ', delta: 0 },
                    { label: '-15p', delta: -15 },
                    { label: '-30p', delta: -30 },
                    { label: '-1h', delta: -60 },
                    { label: '-2h', delta: -120 },
                    { label: '-4h', delta: -240 },
                  ].map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => {
                        const newPlug = b.delta === 0 ? getNowLocalStr() : adjustDateTimeLocal(getNowLocalStr(), b.delta);
                        setVerifyPlugTime(newPlug);
                        calculateVerifyPreview(newPlug, verifyUnplugTime);
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Giờ rút thực tế */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Thời gian rút thực tế (hh:mm dd/MM/yyyy — để trống nếu đang tiếp tục cắm)
                  </label>
                  {verifyUnplugTime && (
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyUnplugTime('');
                        setVerifyStatus('PLUGGED');
                        setVerifyPreview(null);
                      }}
                      className="text-[10px] text-rose-600 font-bold hover:underline cursor-pointer"
                    >
                      ✕ Xóa giờ rút (đang cắm)
                    </button>
                  )}
                </div>
                <input
                  type="datetime-local"
                  value={verifyUnplugTime}
                  onChange={(e) => {
                    setVerifyUnplugTime(e.target.value);
                    if (e.target.value) {
                      setVerifyStatus('UNPLUGGED');
                      calculateVerifyPreview(verifyPlugTime, e.target.value);
                    } else {
                      setVerifyPreview(null);
                    }
                  }}
                  className="w-full p-2 border border-slate-300 rounded text-xs sm:text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                />
                {verifyUnplugTime && (
                  <p className="text-[11px] font-mono text-blue-700 mt-1 font-semibold flex items-center gap-1">
                    <span>⏱️ Rút:</span>
                    <span className="bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded border border-blue-300">
                      {formatDateTime(verifyUnplugTime)}
                    </span>
                  </p>
                )}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {[
                    { label: 'Bây giờ', delta: 0 },
                    { label: '-15p', delta: -15 },
                    { label: '-30p', delta: -30 },
                    { label: '-1h', delta: -60 },
                  ].map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => {
                        const newUnplug = b.delta === 0 ? getNowLocalStr() : adjustDateTimeLocal(getNowLocalStr(), b.delta);
                        setVerifyUnplugTime(newUnplug);
                        setVerifyStatus('UNPLUGGED');
                        calculateVerifyPreview(verifyPlugTime, newUnplug);
                      }}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Trạng thái phiên cắm điện */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Trạng thái phiên điện
                </label>
                <select
                  value={verifyStatus}
                  onChange={(e) => {
                    const st = e.target.value as ReeferPowerStatus;
                    setVerifyStatus(st);
                    if (st === 'PLUGGED') {
                      setVerifyUnplugTime('');
                      setVerifyPreview(null);
                    } else if (st === 'UNPLUGGED' && !verifyUnplugTime) {
                      const nowStr = getNowLocalStr();
                      setVerifyUnplugTime(nowStr);
                      calculateVerifyPreview(verifyPlugTime, nowStr);
                    }
                  }}
                  className="w-full p-2 border border-slate-300 rounded text-xs sm:text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="PLUGGED">PLUGGED — Đang cắm điện</option>
                  <option value="UNPLUGGED">UNPLUGGED — Đã rút điện (Chốt tính cước)</option>
                  <option value="PENDING_REVIEW">PENDING_REVIEW — Chờ CCKB xác minh (0s)</option>
                  <option value="CANCELLED">CANCELLED — Hủy phiên điện này</option>
                </select>
              </div>

              {/* Tự động tính cước preview khi có giờ rút */}
              {verifyPreview && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded space-y-1 text-xs text-emerald-900 animate-in fade-in">
                  <p className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Cước điện tính lại tự động (Làm tròn 15p — Tròn 5.000đ):
                  </p>
                  <div className="flex justify-between items-center pt-1">
                    <span>
                      Thời lượng: <strong className="font-mono">{verifyPreview.durationMin} phút ({Math.round((verifyPreview.durationMin / 60) * 100) / 100} giờ)</strong>
                    </span>
                    <span className="text-sm font-bold font-mono text-[#0A9444]">
                      {verifyPreview.amount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              )}

              {/* Ghi chú đối chiếu */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú đối chiếu / Lý do điều chỉnh *
                </label>
                <textarea
                  value={verifyNotes}
                  onChange={(e) => setVerifyNotes(e.target.value)}
                  placeholder="Khớp ảnh/video Zalo timestamp lúc 15:10, điều chỉnh cắm/rút thực tế theo đề nghị của khách..."
                  rows={2}
                  required
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="p-2.5 bg-blue-50 rounded border border-blue-200 text-[11px] text-blue-900 leading-relaxed">
                ℹ️ <strong>CCKB lưu ý:</strong> Khi lưu cập nhật, hệ thống tự động đồng bộ lại thời lượng làm tròn 15 phút và khoản thu tương ứng trong Sổ cái.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowVerifyModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu cập nhật phiên điện</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CCKB CHỈNH SỬA YÊU CẦU CẮM ĐIỆN CONTAINER (TAB REQUESTS) */}
      {showEditReqModal && editingReq && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 max-w-2xl w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider">CCKB Bến bãi</span>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <Pencil className="w-5 h-5 text-blue-600" />
                  Chỉnh sửa Yêu cầu Cắm điện Container
                </h3>
              </div>
              <button
                onClick={() => setShowEditReqModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {editReqError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-700 rounded text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editReqError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmEditRequest} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Số Container */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Số Container dự kiến <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {editReqContNo.trim().length}/11
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      value={editReqContNo}
                      onChange={(e) => setEditReqContNo(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                      required
                      maxLength={11}
                      className={`w-full px-3 py-1.5 border rounded font-mono text-xs sm:text-sm font-bold focus:outline-none transition-colors ${
                        editReqContValidation.level === 'SUCCESS'
                          ? 'border-emerald-500 text-emerald-950 bg-emerald-50/40 focus:ring-1 focus:ring-emerald-500'
                          : editReqContValidation.level === 'ERROR'
                          ? 'border-rose-400 text-rose-950 bg-rose-50/40 focus:ring-1 focus:ring-rose-500'
                          : 'border-slate-300 text-slate-900 focus:border-[#223873]'
                      }`}
                    />
                    {editReqContValidation.level === 'SUCCESS' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  {editReqContNo.trim().length > 0 && (
                    <div className={`mt-1.5 p-2 rounded text-[11px] flex items-start gap-1.5 ${
                      editReqContValidation.level === 'SUCCESS'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : editReqContValidation.level === 'ERROR'
                        ? 'bg-rose-50 text-rose-800 border border-rose-200'
                        : 'bg-slate-50 text-slate-600 border border-slate-200'
                    }`}>
                      {editReqContValidation.level === 'SUCCESS' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />}
                      {editReqContValidation.level === 'ERROR' && <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0 mt-0.5" />}
                      <span className="flex-1">{editReqContValidation.message}</span>
                    </div>
                  )}
                </div>

                {/* Biển số xe kéo dự kiến */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Biển số xe kéo dự kiến
                  </label>
                  <input
                    type="text"
                    value={editReqPlate}
                    onChange={(e) => setEditReqPlate(e.target.value.toUpperCase().replace(/\s+/g, ''))}
                    placeholder="VD: 14C-123.45"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono text-xs sm:text-sm focus:outline-none focus:border-[#223873]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Chủ hàng */}
                <div>
                  <CustomerCombobox
                    label="Tên chủ hàng"
                    value={editReqCustomer}
                    onChange={(name) => setEditReqCustomer(name)}
                    placeholder="VD: Công ty XNK Tà Lùng..."
                  />
                </div>

                {/* Số điện thoại */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Số điện thoại liên hệ
                  </label>
                  <input
                    type="text"
                    value={editReqPhone}
                    onChange={(e) => setEditReqPhone(e.target.value)}
                    placeholder="VD: 0912345678"
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs sm:text-sm focus:outline-none focus:border-[#223873]"
                  />
                </div>
              </div>

              <div>
                {/* Trạng thái yêu cầu */}
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng thái yêu cầu
                </label>
                <select
                  value={editReqStatus}
                  onChange={(e) => setEditReqStatus(e.target.value as ReeferRequestStatus)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#223873]"
                >
                  <option value="PLANNED">PLANNED — Chờ xe vào bãi</option>
                  <option value="CONTAINER_ARRIVED">CONTAINER_ARRIVED — Đã vào bãi (Cần cắm)</option>
                  <option value="PLUGGED">PLUGGED — Đang cắm điện</option>
                  <option value="COMPLETED">COMPLETED — Đã hoàn tất</option>
                  <option value="CANCELLED">CANCELLED — Đã hủy yêu cầu</option>
                </select>
              </div>

              {/* Chế độ cắm & số giờ dự kiến */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chế độ tính điện
                  </label>
                  <select
                    value={editReqMode}
                    onChange={(e) => setEditReqMode(e.target.value as 'HOURLY' | 'CONTINUOUS')}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#223873]"
                  >
                    <option value="HOURLY">Cắm theo giờ thực tế ({reeferHourlyRate.toLocaleString('vi-VN')} đ/h)</option>
                    <option value="CONTINUOUS">Cắm thông liên tục (24/7)</option>
                  </select>
                </div>

                {editReqMode === 'HOURLY' && (
                  <div>
                    <label className="block text-xs font-bold text-amber-950 mb-1">
                      Số giờ cắm dự kiến (Nhập nhanh / Tùy chọn)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={168}
                        value={editReqExpectedHours}
                        onChange={(e) => setEditReqExpectedHours(e.target.value === '' ? '' : Math.max(1, parseInt(e.target.value) || 1))}
                        placeholder="Tùy chọn"
                        className="w-24 px-2.5 py-1 border border-amber-300 rounded text-sm font-bold bg-white text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <div className="flex items-center gap-1">
                        {[4, 8, 12, 24].map((h) => (
                          <button
                            key={h}
                            type="button"
                            onClick={() => setEditReqExpectedHours(h)}
                            className={`px-2 py-0.5 text-xs font-bold rounded transition-colors cursor-pointer ${
                              editReqExpectedHours === h
                                ? 'bg-amber-600 text-white'
                                : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                            }`}
                          >
                            +{h}h
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {editReqMode === 'HOURLY' && editReqExpectedHours !== '' && Number(editReqExpectedHours) > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-300 rounded flex items-center justify-between text-xs text-amber-950">
                  <span>Ước tính cước điện theo dự kiến ({editReqExpectedHours}h):</span>
                  <span className="font-bold font-mono text-[#0A9444]">
                    {Math.round((Number(editReqExpectedHours) * reeferHourlyRate) / 5000 * 5000).toLocaleString('vi-VN')} đ
                  </span>
                </div>
              )}

              {/* Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú yêu cầu
                </label>
                <textarea
                  value={editReqNotes}
                  onChange={(e) => setEditReqNotes(e.target.value)}
                  placeholder="Ghi chú vị trí, ca trực hoặc lưu ý đặc biệt..."
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-[#223873]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowEditReqModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5a] rounded shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu cập nhật yêu cầu</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TẠO YÊU CẦU CẮM ĐIỆN (CCKB) */}
      {showCreateReqModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 max-w-2xl w-full p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-blue-800 tracking-wider">Thương vụ CCKB Bến bãi</span>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Tạo yêu cầu Cắm điện Container
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lập phiếu yêu cầu cắm điện cho container đang lưu trong bãi
                </p>
              </div>
              <button
                onClick={() => setShowCreateReqModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {reqError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-700 rounded text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{reqError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRequest} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Chọn Container đang trong bãi <span className="text-rose-500">*</span>
                </label>
                {unpluggedContainersInYard.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900">
                    Không có container nào trong bãi chưa cắm điện.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Ô tìm kiếm / lọc nhanh Container trong bãi */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Tìm theo số container hoặc biển số xe chở vào..."
                        value={reqContFilterQuery}
                        onChange={(e) => setReqContFilterQuery(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded text-xs bg-slate-50 font-mono focus:outline-none focus:ring-1 focus:ring-[#223873]"
                      />
                    </div>

                    {(() => {
                      const filteredList = unpluggedContainersInYard.filter((c) => {
                        const q = reqContFilterQuery.toLowerCase().trim();
                        if (!q) return true;
                        const matchCont = c.container_no_current.toLowerCase().includes(q);
                        const matchPlate = c.inbound_license_plate ? c.inbound_license_plate.toLowerCase().includes(q) : false;
                        return matchCont || matchPlate;
                      });

                      if (filteredList.length === 0) {
                        return (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                            Không tìm thấy container nào khớp với từ khóa &quot;{reqContFilterQuery}&quot;.
                          </div>
                        );
                      }

                      return (
                        <select
                          value={reqSelectedYardContId}
                          onChange={(e) => {
                            const id = e.target.value;
                            setReqSelectedYardContId(id);
                            const cont = unpluggedContainersInYard.find((c) => c.id === id);
                            if (cont) {
                              setReqContainerNo(cont.container_no_current);
                              setReqPlate(cont.inbound_license_plate || '');
                            }
                          }}
                          className="w-full p-2 border border-slate-300 rounded text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#223873]"
                        >
                          {filteredList.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.container_no_current}{c.inbound_license_plate ? ` (Xe: ${c.inbound_license_plate})` : ''}
                            </option>
                          ))}
                        </select>
                      );
                    })()}

                    {/* Hộp tóm tắt thông tin cont đang chọn */}
                    {(() => {
                      const selectedCont = unpluggedContainersInYard.find((c) => c.id === reqSelectedYardContId);
                      if (!selectedCont) return null;
                      return (
                        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Mã container:</span>
                            <span className="font-mono font-bold text-[#223873]">{selectedCont.container_no_current}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Xe chở vào bãi:</span>
                            <span className="font-mono font-bold text-slate-800">{selectedCont.inbound_license_plate || 'Chưa cập nhật'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Thời gian vào bãi:</span>
                            <span className="font-mono text-slate-700">{new Date(selectedCont.inbound_at || selectedCont.created_at).toLocaleString('vi-VN')}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <CustomerCombobox
                    label="Tên chủ hàng"
                    value={reqCustomer}
                    onChange={(name) => setReqCustomer(name)}
                    placeholder="VD: Công ty XNK Tà Lùng..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Chế độ tính điện
                  </label>
                  <select
                    value={reqMode}
                    onChange={(e) => setReqMode(e.target.value as 'HOURLY' | 'CONTINUOUS')}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#223873]"
                  >
                    <option value="HOURLY">Cắm theo giờ thực tế ({reeferHourlyRate.toLocaleString('vi-VN')} đ/giờ)</option>
                    <option value="CONTINUOUS">Cắm thông liên tục (24/7)</option>
                  </select>
                </div>
              </div>

              {/* KHI CHỌN CẮM THEO GIỜ: ĐIỀN SỐ GIỜ DỰ KIẾN (TÙY CHỌN) */}
              {reqMode === 'HOURLY' && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded space-y-2.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-amber-950">
                      Số giờ dự kiến cắm (Nhập nhanh / Tùy chọn)
                    </label>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 font-mono">
                      Biểu phí {reeferHourlyRate.toLocaleString('vi-VN')} đ/h
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={168}
                      value={reqExpectedHours}
                      onChange={(e) => {
                        const v = e.target.value;
                        setReqExpectedHours(v === '' ? '' : Math.max(1, parseInt(v) || 1));
                      }}
                      placeholder="Tùy chọn"
                      className="w-24 px-2.5 py-1 border border-amber-300 rounded text-sm font-bold bg-white text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                    <div className="flex items-center gap-1 flex-wrap">
                      {[4, 8, 12, 24].map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setReqExpectedHours(h)}
                          className={`px-2 py-0.5 text-xs font-bold rounded transition-colors cursor-pointer ${
                            reqExpectedHours === h
                              ? 'bg-amber-600 text-white'
                              : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
                          }`}
                        >
                          +{h}h
                        </button>
                      ))}
                    </div>
                  </div>

                  {reqExpectedHours !== '' && Number(reqExpectedHours) > 0 ? (
                    <div className="pt-2 border-t border-amber-200 text-[11px] text-amber-900 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-amber-800">Thời lượng đăng ký:</span>
                        <span className="font-bold text-amber-950 font-mono">{reqExpectedHours} tiếng</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-amber-800">Ước tính cước điện phát sinh:</span>
                        <span className="font-bold text-[#0A9444] font-mono">
                          {Math.round((Number(reqExpectedHours) * reeferHourlyRate) / 5000 * 5000).toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-800 italic pt-1 border-t border-amber-200">
                      Chưa nhập số giờ dự kiến (hệ thống sẽ tính cước chuẩn khi thực hiện rút điện).
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ghi chú yêu cầu đặc biệt
                </label>
                <textarea
                  value={reqNotes}
                  onChange={(e) => setReqNotes(e.target.value)}
                  placeholder="Vị trí đỗ ưu tiên gần trạm biến áp, số điện thoại người nhận hàng..."
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-[#223873]"
                />
              </div>

              <div className="flex justify-end items-center gap-2 pt-2 border-t border-slate-200 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowCreateReqModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={unpluggedContainersInYard.length === 0}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5a] disabled:bg-slate-300 rounded shadow-2xs cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Tạo yêu cầu cắm điện</span>
                </button>
                {unpluggedContainersInYard.length > 0 && canPlugIn && (
                  <button
                    type="button"
                    onClick={handleSaveAndPlugImmediately}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded shadow-2xs cursor-pointer flex items-center gap-1.5"
                    title="Tạo yêu cầu và kích hoạt cắm điện ngay trong 1 chạm"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>⚡ Lưu & Cắm điện ngay</span>
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GHI NHẬN NHIỆT ĐỘ CONTAINER LẠNH ĐỊNH KỲ */}
      {showTempModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded border border-slate-300 max-w-2xl w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">Kỹ thuật & Giám sát Reefer</span>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mt-0.5">
                  <Thermometer className="w-5 h-5 text-emerald-600" />
                  Ghi nhận Nhiệt độ Container Lạnh
                </h3>
              </div>
              <button
                onClick={() => setShowTempModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {tempError && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 text-rose-700 rounded text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{tempError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmSaveTemp} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn Container lạnh đang trong bãi <span className="text-rose-500">*</span>
                </label>
                <select
                  value={tempContId}
                  onChange={(e) => setTempContId(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs sm:text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {containers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.container_no_current} ({c.container_size || '40'}ft {c.container_type || 'RF'}{c.is_plugged ? ' — Đang cắm điện ⚡' : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nhiệt độ đo thực tế (°C) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    required
                    placeholder="VD: -18.5 hoặc +4.0"
                    className="w-full p-2 pr-10 border border-slate-300 rounded text-sm font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-2 text-sm font-bold text-slate-400">°C</span>
                </div>
                {/* Nút chọn nhanh nhiệt độ */}
                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                  {[
                    { label: '-18°C (Đông lạnh)', val: '-18.0' },
                    { label: '-20°C (Thịt/kem)', val: '-20.0' },
                    { label: '0°C (Hoa quả mát)', val: '0.0' },
                    { label: '+4°C (Rau tươi)', val: '4.0' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setTempValue(preset.val)}
                      className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Trạng thái vận hành máy lạnh:
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { code: 'RUNNING_NORMAL', label: 'Chạy bình thường' },
                    { code: 'TEMP_WARNING', label: 'Cảnh báo nhiệt độ' },
                    { code: 'DEFROST', label: 'Đang xả đá (Defrost)' },
                    { code: 'POWER_TRIP', label: 'Sự cố mất nguồn' },
                  ].map((s) => (
                    <button
                      key={s.code}
                      type="button"
                      onClick={() => setTempStatus(s.code as any)}
                      className={`p-2 rounded text-left font-bold border transition-colors cursor-pointer ${
                        tempStatus === s.code
                          ? 'bg-emerald-50 text-emerald-900 border-emerald-400 ring-1 ring-emerald-400'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ghi chú kiểm tra (Đối chiếu chủ hàng / máy nén):
                </label>
                <textarea
                  value={tempNotes}
                  onChange={(e) => setTempNotes(e.target.value)}
                  placeholder="Kiểm tra định kỳ ca trực, quạt gió hoạt động tốt..."
                  rows={2}
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowTempModal(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingTemp}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingTemp ? 'Đang lưu...' : 'Lưu nhật ký nhiệt độ'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
