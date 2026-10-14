'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { VehicleVisit, ContainerVisit, CargoStatus, CargoStatusUpdate, ContainerNumberChange, VehiclePlateChange, YardZoneInfo, TicketPaymentStatus, VehicleVisitStatus } from '@/types/domain.types';
import { 
  Truck, 
  Container as ContainerIcon, 
  Search, 
  Filter, 
  RefreshCw, 
  Edit3, 
  ShieldAlert,
  X,
  History,
  AlertTriangle,
  Layers,
  Clock,
  ArrowRightLeft,
  ExternalLink,
  CheckCircle2,
  FileText,
  Download,
  MapPin,
  Grid,
  PlusCircle,
  SlidersHorizontal,
  RotateCcw,
  DollarSign,
  AlertCircle,
  ChevronDown,
  Plus,
  Trash2,
  Settings,
  Zap
} from 'lucide-react';
import { getVehicleTypeName, formatContainerSpec, formatDateTime, formatDate, formatTime } from '@/lib/display-formatters';
import { exportYardVehiclesToExcel, exportYardContainersToExcel, exportYardInventoryReportToExcel } from '@/lib/export-excel';

export interface YardPairItem {
  id: string;
  vehicle: VehicleVisit | null;
  container: ContainerVisit | null;
  isPaired: boolean;
  pairIndex?: number;
  totalPairedConts?: number;
  inboundVehicleHistory?: VehicleVisit | null;
}

export default function YardMonitorPage() {
  const { role, yardId, can, repository, user, authMode } = useAuth();

  // Quyền xem lượt xe / lượt container theo RBAC V5
  const canReadYard = can('vehicle.visit.read') || can('container.visit.read');
  // Quyền cập nhật HÀNG / RỖNG theo RBAC V5 (chỉ DIS_STAFF, DIS_LEAD, SYS_ADMIN)
  const canUpdateCargo = can('container.cargo.update');
  // Quyền sửa số container (An ninh / CCKB trưởng)
  const canCorrectContainer = can('container.number.correct');

  // Tab: 'pairs' (Tổng hợp Xe — Cont), 'containers', 'vehicles', 'zones' (Sơ đồ phân khu bãi)
  const [activeTab, setActiveTab] = useState<'pairs' | 'containers' | 'vehicles' | 'zones'>('pairs');
  const [vehicles, setVehicles] = useState<VehicleVisit[]>([]);
  const [allVehicles, setAllVehicles] = useState<VehicleVisit[]>([]);
  const [containers, setContainers] = useState<ContainerVisit[]>([]);
  const [yardZones, setYardZones] = useState<YardZoneInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCargo, setFilterCargo] = useState<string>('ALL');
  const [filterPairType, setFilterPairType] = useState<string>('ALL');
  const [filterDwell, setFilterDwell] = useState<'ALL' | 'OVER_24H' | 'OVER_48H'>('ALL');
  const [nowMs, setNowMs] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Modal gán phân khu & vị trí đỗ bãi
  const [locationModalItem, setLocationModalItem] = useState<{
    type: 'VEHICLE' | 'CONTAINER';
    id: string;
    title: string;
    subtitle: string;
    currentZone?: string;
    currentSlot?: string;
  } | null>(null);
  const [selectedZoneCode, setSelectedZoneCode] = useState<string>('');
  const [inputSlotCode, setInputSlotCode] = useState<string>('');
  const [locationError, setLocationError] = useState<string>('');
  const [isUpdatingLocation, setIsUpdatingLocation] = useState<boolean>(false);

  // Modal cập nhật HÀNG/RỖNG của Điều phối
  const [selectedCont, setSelectedCont] = useState<ContainerVisit | null>(null);
  const [newCargoStatus, setNewCargoStatus] = useState<CargoStatusUpdate>('HANG');
  const [updateError, setUpdateError] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Modal sửa số Container (An ninh / CCKB trưởng)
  const [selectedContForCorrection, setSelectedContForCorrection] = useState<ContainerVisit | null>(null);
  const [newContainerNo, setNewContainerNo] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionEvidence, setCorrectionEvidence] = useState<string>('');
  const [correctionError, setCorrectionError] = useState<string>('');
  const [isCorrecting, setIsCorrecting] = useState<boolean>(false);

  // Modal xem lịch sử đổi số container
  const [selectedContForHistory, setSelectedContForHistory] = useState<ContainerVisit | null>(null);
  const [historyChanges, setHistoryChanges] = useState<ContainerNumberChange[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);

  // Modal sửa Biển số xe (An ninh / Điều phối)
  const [selectedVehForCorrection, setSelectedVehForCorrection] = useState<VehicleVisit | null>(null);
  const [newLicensePlate, setNewLicensePlate] = useState<string>('');
  const [plateCorrectionReason, setPlateCorrectionReason] = useState<string>('');
  const [plateCorrectionError, setPlateCorrectionError] = useState<string>('');
  const [isCorrectingPlate, setIsCorrectingPlate] = useState<boolean>(false);

  // Modal xem Lịch sử & Nhật ký lượt xe
  const [selectedVehForHistory, setSelectedVehForHistory] = useState<VehicleVisit | null>(null);
  const [vehHistoryChanges, setVehHistoryChanges] = useState<VehiclePlateChange[]>([]);
  const [isLoadingVehHistory, setIsLoadingVehHistory] = useState<boolean>(false);

  // Phân quyền chuẩn RBAC V5 qua can()
  const canUpdateVehicle = can('vehicle.visit.update_basic');
  const isLeadOrAdmin = can('vehicle.visit.time_correction.approve');
  const canCollectTicket = can('ticket.payment.collect');

  // Danh mục 7 loại xe niêm yết chuẩn V5 phục vụ sửa sai ca trực
  const VEHICLE_TYPES_OPTIONS = [
    { code: 'CONT_LANH', name: 'Xe container lạnh/khô có hàng', amount: 250000 },
    { code: 'DAU_KEO', name: 'Xe đầu kéo không cont (0đ)', amount: 0 },
    { code: 'XE_BO_4_CHAN', name: 'Xe bo 4 chân tải thùng', amount: 200000 },
    { code: 'XE_BO_3_CHAN', name: 'Xe bo 3 chân tải thùng', amount: 200000 },
    { code: 'XE_BO_8_TAN', name: 'Xe bo 8 tấn (2 chân)', amount: 100000 },
    { code: 'XE_BO_3_BANH', name: 'Xe bo 3 bánh nội bộ', amount: 40000 },
    { code: 'XE_SANG_TAI', name: 'Xe sang tải nội bộ (0đ)', amount: 0 },
  ];

  // Modal Tiếp nhận Container lẻ (Hạ bãi không theo xe / cont thuê ngoài)
  const [isSingleContModalOpen, setIsSingleContModalOpen] = useState<boolean>(false);
  const [singleContNo, setSingleContNo] = useState<string>('');
  const [singleContSize, setSingleContSize] = useState<string>('40');
  const [singleContType, setSingleContType] = useState<string>('RF');
  const [singleCargoStatus, setSingleCargoStatus] = useState<CargoStatus>('CHUA_XAC_DINH');
  const [singleYardZone, setSingleYardZone] = useState<string>('KHU_A_REEFER');
  const [singleSlotCode, setSingleSlotCode] = useState<string>('');
  const [singleInboundAt, setSingleInboundAt] = useState<string>('');
  const [singleSource, setSingleSource] = useState<string>('Xe cẩu nội bộ / Thuê ngoài');
  const [singleNotes, setSingleNotes] = useState<string>('');
  const [singleContError, setSingleContError] = useState<string>('');
  const [isSubmittingSingleCont, setIsSubmittingSingleCont] = useState<boolean>(false);

  // Modal Hiệu chỉnh Lượt xe (Backdate & Sửa sai ca trực cho SEC_LEAD / SYS_ADMIN)
  const [adjustingVehicle, setAdjustingVehicle] = useState<VehicleVisit | null>(null);
  const [adjEntryAt, setAdjEntryAt] = useState<string>('');
  const [adjExitAt, setAdjExitAt] = useState<string>('');
  const [adjStatus, setAdjStatus] = useState<VehicleVisitStatus>('IN_YARD');
  const [adjVehicleType, setAdjVehicleType] = useState<string>('CONT_LANH');
  const [adjTicketAmount, setAdjTicketAmount] = useState<number>(250000);
  const [adjTicketPaymentStatus, setAdjTicketPaymentStatus] = useState<TicketPaymentStatus>('UNPAID');
  const [adjRefundReason, setAdjRefundReason] = useState<string>('');
  const [adjDriverName, setAdjDriverName] = useState<string>('');
  const [adjDriverPhone, setAdjDriverPhone] = useState<string>('');
  const [adjReason, setAdjReason] = useState<string>('');
  const [adjError, setAdjError] = useState<string>('');
  const [adjContainerAction, setAdjContainerAction] = useState<'CANCEL' | 'DETACH' | 'KEEP'>('CANCEL');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState<boolean>(false);

  // Quản lý Action Dropdown popover trên từng dòng bảng
  const [openActionDropdownId, setOpenActionDropdownId] = useState<string | null>(null);

  // Quản lý Modal CRUD Phân khu bãi (YardZone)
  const [isZoneModalOpen, setIsZoneModalOpen] = useState<boolean>(false);
  const [editingZoneCode, setEditingZoneCode] = useState<string | null>(null);
  const [zoneFormCode, setZoneFormCode] = useState<string>('');
  const [zoneFormName, setZoneFormName] = useState<string>('');
  const [zoneFormDesc, setZoneFormDesc] = useState<string>('');
  const [zoneFormCapacity, setZoneFormCapacity] = useState<number>(50);
  const [zoneFormHasPower, setZoneFormHasPower] = useState<boolean>(false);
  const [zoneFormBadge, setZoneFormBadge] = useState<string>('bg-blue-100 text-blue-800 border-blue-300');
  const [zoneError, setZoneError] = useState<string>('');
  const [isSubmittingZone, setIsSubmittingZone] = useState<boolean>(false);

  // Tự động đóng Action Dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-action-dropdown]')) {
        setOpenActionDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setNowMs(Date.now());

    Promise.all([
      repository.getVehicles(yardId),
      repository.getContainers(yardId),
      repository.getYardZones(),
    ])
      .then(([vList, cList, zList]) => {
        if (isMounted) {
          setAllVehicles(vList);
          setVehicles(vList.filter(v => v.status === 'IN_YARD'));
          setContainers(cList.filter(c => c.status === 'IN_YARD'));
          setYardZones(zList);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải dữ liệu bãi:', err);
      });

    return () => { isMounted = false; };
  }, [repository, yardId]);

  const handleReload = () => {
    setIsLoading(true);
    Promise.all([
      repository.getVehicles(yardId),
      repository.getContainers(yardId),
      repository.getYardZones(),
    ])
      .then(([vList, cList, zList]) => {
        setAllVehicles(vList);
        setVehicles(vList.filter(v => v.status === 'IN_YARD'));
        setContainers(cList.filter(c => c.status === 'IN_YARD'));
        setYardZones(zList);
      })
      .catch((err) => {
        console.error('Lỗi tải dữ liệu bãi:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleOpenLocationModal = (
    type: 'VEHICLE' | 'CONTAINER',
    item: { id: string; title: string; subtitle: string; yard_zone?: string | null; slot_code?: string | null }
  ) => {
    setLocationModalItem({
      type,
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      currentZone: item.yard_zone || undefined,
      currentSlot: item.slot_code || undefined,
    });
    setSelectedZoneCode(item.yard_zone || (type === 'CONTAINER' ? 'KHU_A_REEFER' : 'KHU_D_TRACTOR'));
    setInputSlotCode(item.slot_code || '');
    setLocationError('');
  };

  const handleSaveLocation = async () => {
    if (!locationModalItem) return;
    setIsUpdatingLocation(true);
    setLocationError('');

    try {
      if (locationModalItem.type === 'VEHICLE') {
        const res = await repository.updateVehicleLocation({
          vehicleId: locationModalItem.id,
          yardZone: selectedZoneCode || undefined,
          slotCode: inputSlotCode.trim().toUpperCase() || undefined,
        });
        if (!res.success) {
          setLocationError(res.error || 'Lỗi cập nhật vị trí xe.');
          setIsUpdatingLocation(false);
          return;
        }
      } else {
        const res = await repository.updateContainerLocation({
          containerId: locationModalItem.id,
          yardZone: selectedZoneCode || undefined,
          slotCode: inputSlotCode.trim().toUpperCase() || undefined,
        });
        if (!res.success) {
          setLocationError(res.error || 'Lỗi cập nhật vị trí container.');
          setIsUpdatingLocation(false);
          return;
        }
      }

      setLocationModalItem(null);
      handleReload();
    } catch (err: any) {
      setLocationError(err?.message || 'Lỗi khi lưu vị trí bãi.');
    } finally {
      setIsUpdatingLocation(false);
    }
  };

  // --- TÁC VỤ QUẢN LÝ PHÂN KHU BÃI (YARD ZONES CRUD) ---
  const handleOpenCreateZoneModal = () => {
    setEditingZoneCode(null);
    setZoneFormCode('');
    setZoneFormName('');
    setZoneFormDesc('');
    setZoneFormCapacity(50);
    setZoneFormHasPower(false);
    setZoneFormBadge('bg-blue-100 text-blue-800 border-blue-300');
    setZoneError('');
    setIsZoneModalOpen(true);
  };

  const handleOpenEditZoneModal = (zone: YardZoneInfo) => {
    setEditingZoneCode(zone.code);
    setZoneFormCode(zone.code);
    setZoneFormName(zone.name);
    setZoneFormDesc(zone.description || '');
    setZoneFormCapacity(zone.capacity);
    setZoneFormHasPower(zone.has_power_outlets);
    setZoneFormBadge(zone.color_badge || 'bg-blue-100 text-blue-800 border-blue-300');
    setZoneError('');
    setIsZoneModalOpen(true);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneFormName.trim()) {
      setZoneError('Vui lòng nhập tên phân khu.');
      return;
    }
    setIsSubmittingZone(true);
    setZoneError('');
    try {
      if (editingZoneCode) {
        const res = await repository.updateYardZone(editingZoneCode, {
          name: zoneFormName.trim(),
          description: zoneFormDesc.trim(),
          capacity: Number(zoneFormCapacity) || 0,
          has_power_outlets: zoneFormHasPower,
          color_badge: zoneFormBadge,
        });
        if (!res.success) {
          setZoneError(res.error || 'Lỗi khi cập nhật phân khu.');
          setIsSubmittingZone(false);
          return;
        }
      } else {
        const code = zoneFormCode.trim().toUpperCase();
        if (!code) {
          setZoneError('Vui lòng nhập mã phân khu.');
          setIsSubmittingZone(false);
          return;
        }
        const res = await repository.createYardZone({
          code,
          name: zoneFormName.trim(),
          description: zoneFormDesc.trim(),
          capacity: Number(zoneFormCapacity) || 0,
          has_power_outlets: zoneFormHasPower,
          color_badge: zoneFormBadge,
        });
        if (!res.success) {
          setZoneError(res.error || 'Lỗi khi tạo phân khu.');
          setIsSubmittingZone(false);
          return;
        }
      }
      setIsZoneModalOpen(false);
      handleReload();
    } catch (err: any) {
      setZoneError(err?.message || 'Lỗi khi lưu phân khu.');
    } finally {
      setIsSubmittingZone(false);
    }
  };

  const handleDeleteZone = async (code: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa phân khu [${code}] khỏi sơ đồ bãi?`)) return;
    try {
      const res = await repository.deleteYardZone(code);
      if (!res.success) {
        alert(res.error || 'Không thể xóa phân khu này.');
        return;
      }
      handleReload();
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi xóa phân khu.');
    }
  };

  // --- TÁC VỤ TIẾP NHẬN CONTAINER LẺ (HẠ BÃI) ---
  const handleOpenSingleContModal = () => {
    setIsSingleContModalOpen(true);
    setSingleContNo('');
    setSingleContSize('40');
    setSingleContType('RF');
    setSingleCargoStatus('CHUA_XAC_DINH');
    setSingleYardZone(yardZones.length > 0 ? yardZones[0].code : 'KHU_A_REEFER');
    setSingleSlotCode('');
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setSingleInboundAt(localIso);
    setSingleSource('Xe cẩu nội bộ / Thuê ngoài');
    setSingleNotes('');
    setSingleContError('');
  };

  const setQuickSingleInboundHoursAgo = (hours: number) => {
    const d = new Date(Date.now() - hours * 3600 * 1000);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setSingleInboundAt(localIso);
  };

  const handleCreateSingleContainer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNo = singleContNo.trim().toUpperCase();
    if (!cleanNo) {
      setSingleContError('Vui lòng nhập số hiệu container.');
      return;
    }
    if (cleanNo.length < 4) {
      setSingleContError('Số hiệu container tối thiểu 4 ký tự.');
      return;
    }

    setIsSubmittingSingleCont(true);
    setSingleContError('');

    try {
      const res = await repository.createContainerEntry({
        yardId: yardId || '20000000-0000-0000-0000-000000000001',
        containerNo: cleanNo,
        containerSize: singleContSize,
        containerType: singleContType,
        cargoStatus: singleCargoStatus,
        yardZone: singleYardZone,
        slotCode: singleSlotCode.trim().toUpperCase() || undefined,
        inboundAt: singleInboundAt ? new Date(singleInboundAt).toISOString() : new Date().toISOString(),
        licensePlate: singleSource.trim() || 'Xe cẩu nội bộ / Thuê ngoài',
        notes: singleNotes.trim() ? `[Tiếp nhận cont lẻ/hạ bãi] ${singleNotes.trim()}` : '[Tiếp nhận cont lẻ/hạ bãi]',
        operatorId: user?.id || 'lead-an-ninh',
        operatorName: user?.fullName || 'Nhân viên Ca trực bãi',
      });

      if (res.error || !res.container) {
        setSingleContError(res.error || 'Lỗi khi tiếp nhận container.');
        setIsSubmittingSingleCont(false);
        return;
      }

      setIsSingleContModalOpen(false);
      handleReload();
    } catch (err: any) {
      setSingleContError(err?.message || 'Lỗi ngoại lệ khi tạo lượt container.');
    } finally {
      setIsSubmittingSingleCont(false);
    }
  };

  // --- TÁC VỤ HIỆU CHỈNH LƯỢT XE (SEC_LEAD / SYS_ADMIN) ---
  const handleOpenAdjustVehicleModal = (veh: VehicleVisit) => {
    setAdjustingVehicle(veh);
    const inDate = veh.entry_at ? new Date(veh.entry_at) : new Date();
    setAdjEntryAt(new Date(inDate.getTime() - inDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    if (veh.exit_at) {
      const outDate = new Date(veh.exit_at);
      setAdjExitAt(new Date(outDate.getTime() - outDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
    } else {
      setAdjExitAt('');
    }
    setAdjStatus(veh.status || 'IN_YARD');
    setAdjVehicleType(veh.vehicle_type || 'CONT_LANH');
    setAdjTicketAmount(veh.ticket_amount ?? 250000);
    setAdjTicketPaymentStatus(veh.ticket_payment_status || 'UNPAID');
    setAdjRefundReason('');
    setAdjDriverName(veh.driver_name || '');
    setAdjDriverPhone(veh.driver_phone || '');
    setAdjReason('');
    setAdjError('');
    setAdjContainerAction('CANCEL');
  };

  const setQuickAdjEntryHoursAgo = (hours: number) => {
    const d = new Date(Date.now() - hours * 3600 * 1000);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setAdjEntryAt(localIso);
  };

  const handleVehicleTypeChange = (newTypeCode: string) => {
    setAdjVehicleType(newTypeCode);
    const found = VEHICLE_TYPES_OPTIONS.find(v => v.code === newTypeCode);
    if (found) {
      setAdjTicketAmount(found.amount);
      if (found.amount === 0 && adjTicketPaymentStatus !== 'CANCELLED') {
        setAdjTicketPaymentStatus('EXEMPT');
      }
    }
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingVehicle) return;

    if (!adjReason.trim() || adjReason.trim().length < 5) {
      setAdjError('Bắt buộc nhập lý do hiệu chỉnh ca trực tối thiểu 5 ký tự để lưu vết kiểm toán.');
      return;
    }

    if (adjTicketPaymentStatus === 'CANCELLED' && (!adjRefundReason.trim() || adjRefundReason.trim().length < 3)) {
      setAdjError('Khi chọn Hủy vé / Hoàn tiền, bắt buộc nhập lý do hoàn trả tiền vé.');
      return;
    }

    // Kiểm tra nếu xe có cont đi kèm và đổi sang loại xe không chở cont
    const attachedConts = containers.filter(c => c.inbound_vehicle_visit_id === adjustingVehicle.id && c.status === 'IN_YARD');
    const isNewNonContType = adjVehicleType !== 'CONT_LANH';
    const needContAction = attachedConts.length > 0 && isNewNonContType;

    setIsSubmittingAdj(true);
    setAdjError('');

    try {
      const res = await repository.adjustVehicleVisit({
        vehicleId: adjustingVehicle.id,
        operatorId: user?.id || 'lead-an-ninh',
        operatorName: user?.fullName || (role === 'SYS_ADMIN' ? 'Quản trị viên' : 'Ca trưởng An ninh'),
        operatorRole: role || 'SEC_LEAD',
        reason: adjReason.trim(),
        entryAt: adjEntryAt ? new Date(adjEntryAt).toISOString() : undefined,
        exitAt: adjStatus === 'IN_YARD' ? null : (adjExitAt ? new Date(adjExitAt).toISOString() : undefined),
        status: adjStatus,
        vehicleType: adjVehicleType,
        ticketAmount: adjTicketAmount,
        ticketPaymentStatus: adjTicketPaymentStatus,
        refundReason: adjRefundReason.trim() || undefined,
        driverName: adjDriverName.trim() || undefined,
        driverPhone: adjDriverPhone.trim() || undefined,
        containerAction: needContAction ? adjContainerAction : undefined,
        containerActionReason: needContAction ? `Chuyển sang xe ${adjVehicleType}` : undefined,
      });

      if (!res.success) {
        setAdjError(res.error || 'Lỗi khi hiệu chỉnh lượt xe.');
        setIsSubmittingAdj(false);
        return;
      }

      setAdjustingVehicle(null);
      handleReload();
    } catch (err: any) {
      setAdjError(err?.message || 'Lỗi ngoại lệ khi lưu hiệu chỉnh lượt xe.');
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  // 1. Tạo bản đồ tra cứu toàn bộ xe (kể cả xe đã rời bãi) để truy xuất nguồn gốc xe kéo vào
  const allVehicleMap = new Map(allVehicles.map(v => [v.id, v]));
  const resolvedContainers = containers.map(c => {
    let resolvedPlate = c.inbound_license_plate;
    if (!resolvedPlate && c.inbound_vehicle_visit_id) {
      resolvedPlate = allVehicleMap.get(c.inbound_vehicle_visit_id)?.license_plate || null;
    }
    return {
      ...c,
      inbound_license_plate: resolvedPlate,
    };
  });

  // 2. Thuật toán ghép cặp Xe — Container chuẩn nghiệp vụ bến bãi
  const matchedContainerIds = new Set<string>();
  const pairItems: YardPairItem[] = [];

  // Ghép theo từng lượt xe trong bãi
  vehicles.forEach((v) => {
    const vPlate = v.license_plate?.trim().toUpperCase();
    const matchingConts = resolvedContainers.filter(c => 
      (c.inbound_vehicle_visit_id && c.inbound_vehicle_visit_id === v.id) ||
      (vPlate && c.inbound_license_plate && c.inbound_license_plate.trim().toUpperCase() === vPlate)
    );

    if (matchingConts.length > 0) {
      matchingConts.forEach((c, idx) => {
        matchedContainerIds.add(c.id);
        pairItems.push({
          id: `pair-${v.id}-${c.id}`,
          vehicle: v,
          container: c,
          isPaired: true,
          pairIndex: idx + 1,
          totalPairedConts: matchingConts.length,
          inboundVehicleHistory: v,
        });
      });
    } else {
      // Xe vào không chở container (xe lẻ, xe bơ, xe đầu kéo không cont)
      pairItems.push({
        id: `veh-${v.id}`,
        vehicle: v,
        container: null,
        isPaired: false,
      });
    }
  });

  // Container tồn bãi chưa gắn với xe nào đang có mặt (xe kéo vào đã rời bãi hoặc cont hạ bãi)
  resolvedContainers.forEach((c) => {
    if (!matchedContainerIds.has(c.id)) {
      let histVeh: VehicleVisit | null = null;
      if (c.inbound_vehicle_visit_id) {
        histVeh = allVehicleMap.get(c.inbound_vehicle_visit_id) || null;
      } else if (c.inbound_license_plate) {
        const cleanPlate = c.inbound_license_plate.trim().toUpperCase();
        histVeh = allVehicles.find(v => v.license_plate?.trim().toUpperCase() === cleanPlate) || null;
      }

      pairItems.push({
        id: `cont-${c.id}`,
        vehicle: null,
        container: c,
        isPaired: false,
        inboundVehicleHistory: histVeh,
      });
    }
  });

  // Tính thời gian lưu bãi trực quan
  const formatDurationInYard = (entryAt: string) => {
    const current = nowMs || (entryAt ? new Date(entryAt).getTime() : 0);
    const diffMs = Math.max(0, current - new Date(entryAt).getTime());
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} phút`;
    const hours = Math.floor(diffMins / 60);
    const remMins = diffMins % 60;
    if (hours < 24) return `${hours}h ${remMins}p`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days} ngày ${remHours}h`;
  };

  // Tính số giờ lưu bãi phục vụ cảnh báo Heatmap
  const getDwellHours = (entryAt: string) => {
    if (!entryAt) return 0;
    const current = nowMs || new Date(entryAt).getTime();
    const diffMs = Math.max(0, current - new Date(entryAt).getTime());
    return diffMs / (1000 * 60 * 60);
  };

  // Badge cảnh báo thời gian lưu bãi (Dwell Time Heatmap Badge)
  const renderDwellBadge = (entryAt: string) => {
    if (!entryAt) return <span className="text-slate-400">—</span>;
    const hours = getDwellHours(entryAt);
    const durationText = formatDurationInYard(entryAt);

    if (hours >= 48) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 border border-rose-300 text-rose-800 animate-pulse shadow-2xs" title={`Đã lưu ${durationText} - Cảnh báo tồn bãi quá 48h!`}>
          <span className="h-1.5 w-1.5 rounded-full bg-rose-600"></span>
          🚨 {durationText} (≥48h)
        </span>
      );
    }
    if (hours >= 24) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 border border-amber-300 text-amber-900 shadow-2xs" title={`Đã lưu ${durationText} - Cần theo dõi tồn bãi (≥24h)`}>
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
          ⚠️ {durationText} (≥24h)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 border border-emerald-200 text-emerald-800" title={`Đã lưu ${durationText}`}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
        ⏱️ {durationText}
      </span>
    );
  };

  // Thống kê nhanh
  const totalVehicles = vehicles.length;
  const totalContainers = resolvedContainers.length;
  const countPaired = pairItems.filter(p => p.vehicle && p.container).length;
  const countHang = resolvedContainers.filter(c => c.cargo_status === 'HANG').length;
  const countRong = resolvedContainers.filter(c => c.cargo_status === 'RONG').length;
  const countChuaXD = resolvedContainers.filter(c => c.cargo_status === 'CHUA_XAC_DINH').length;

  // Lọc dữ liệu bảng Tổng hợp Xe — Cont
  const filteredPairs = pairItems.filter((item) => {
    const q = searchQuery.toLowerCase().trim();
    const v = item.vehicle;
    const c = item.container;

    const matchQuery = !q || (
      (v?.license_plate && v.license_plate.toLowerCase().includes(q)) ||
      (v?.driver_name && v.driver_name.toLowerCase().includes(q)) ||
      (v?.ticket_code && v.ticket_code.toLowerCase().includes(q)) ||
      (v?.vehicle_type_name && v.vehicle_type_name.toLowerCase().includes(q)) ||
      (v?.note && v.note.toLowerCase().includes(q)) ||
      (c?.container_no_current && c.container_no_current.toLowerCase().includes(q)) ||
      (c?.inbound_license_plate && c.inbound_license_plate.toLowerCase().includes(q)) ||
      (item.inboundVehicleHistory?.license_plate && item.inboundVehicleHistory.license_plate.toLowerCase().includes(q)) ||
      (item.inboundVehicleHistory?.driver_name && item.inboundVehicleHistory.driver_name.toLowerCase().includes(q))
    );

    const matchCargo = filterCargo === 'ALL' || (c && c.cargo_status === filterCargo);

    const matchType = 
      filterPairType === 'ALL' ||
      (filterPairType === 'PAIRED' && item.vehicle && item.container) ||
      (filterPairType === 'NO_CONT' && item.vehicle && !item.container) ||
      (filterPairType === 'YARD_CONT' && !item.vehicle && item.container);

    const itemEntryAt = item.container?.inbound_at || item.vehicle?.entry_at || item.inboundVehicleHistory?.entry_at;
    const matchDwell =
      filterDwell === 'ALL' ||
      (filterDwell === 'OVER_24H' && !!itemEntryAt && getDwellHours(itemEntryAt) >= 24) ||
      (filterDwell === 'OVER_48H' && !!itemEntryAt && getDwellHours(itemEntryAt) >= 48);

    return matchQuery && matchCargo && matchType && matchDwell;
  });

  // Lọc dữ liệu Xe
  const filteredVehicles = vehicles.filter(v => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || (
      (v.license_plate && v.license_plate.toLowerCase().includes(q)) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(q)) ||
      (v.ticket_code && v.ticket_code.toLowerCase().includes(q)) ||
      (v.vehicle_type_name && v.vehicle_type_name.toLowerCase().includes(q)) ||
      (v.note && v.note.toLowerCase().includes(q))
    );
    const matchDwell =
      filterDwell === 'ALL' ||
      (filterDwell === 'OVER_24H' && getDwellHours(v.entry_at) >= 24) ||
      (filterDwell === 'OVER_48H' && getDwellHours(v.entry_at) >= 48);
    return matchQuery && matchDwell;
  });

  // Lọc dữ liệu Container
  const filteredContainers = resolvedContainers.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || (
      c.container_no_current.toLowerCase().includes(q) ||
      (c.inbound_license_plate && c.inbound_license_plate.toLowerCase().includes(q))
    );
    const matchCargo = filterCargo === 'ALL' || c.cargo_status === filterCargo;
    const matchDwell =
      filterDwell === 'ALL' ||
      (filterDwell === 'OVER_24H' && getDwellHours(c.inbound_at) >= 24) ||
      (filterDwell === 'OVER_48H' && getDwellHours(c.inbound_at) >= 48);
    return matchQuery && matchCargo && matchDwell;
  });

  const handleOpenCargoModal = (cont: ContainerVisit) => {
    setSelectedCont(cont);
    // Chỉ nhận HANG hoặc RONG
    setNewCargoStatus(cont.cargo_status === 'RONG' ? 'RONG' : 'HANG');
    setUpdateError('');
  };

  const handleSaveCargoStatus = async () => {
    if (!selectedCont) return;

    setIsUpdating(true);
    setUpdateError('');

    const res = await repository.updateCargoStatus(selectedCont.id, newCargoStatus, role || '');
    setIsUpdating(false);

    if (res.success) {
      setSelectedCont(null);
      handleReload();
    } else {
      setUpdateError(res.error || 'Lỗi cập nhật trạng thái.');
    }
  };

  const handleOpenCorrectionModal = (cont: ContainerVisit) => {
    setSelectedContForCorrection(cont);
    setNewContainerNo(cont.container_no_current);
    setCorrectionReason('');
    setCorrectionEvidence('');
    setCorrectionError('');
  };

  const handleSaveCorrection = async () => {
    if (!selectedContForCorrection) return;
    const trimmed = newContainerNo.trim().toUpperCase();
    if (!trimmed) {
      setCorrectionError('Vui lòng nhập số container mới.');
      return;
    }
    if (trimmed === selectedContForCorrection.container_no_current) {
      setCorrectionError('Số container mới phải khác số container hiện tại.');
      return;
    }
    if (!correctionReason.trim() || correctionReason.trim().length < 3) {
      setCorrectionError('Lý do sửa số bắt buộc nhập tối thiểu 3 ký tự theo quy định.');
      return;
    }

    setIsCorrecting(true);
    setCorrectionError('');

    const res = await repository.correctContainerNumber({
      containerId: selectedContForCorrection.id,
      newNumber: trimmed,
      reason: correctionReason.trim(),
      evidenceUrl: correctionEvidence.trim() || undefined,
      operatorId: user?.id || 'SEC-01',
      operatorName: user?.fullName || 'Nhân viên',
    });

    setIsCorrecting(false);

    if (res.success) {
      setSelectedContForCorrection(null);
      handleReload();
    } else {
      setCorrectionError(res.error || 'Lỗi khi sửa số container.');
    }
  };

  const handleOpenHistoryModal = async (cont: ContainerVisit) => {
    setSelectedContForHistory(cont);
    setIsLoadingHistory(true);
    try {
      const changes = await repository.getContainerNumberChanges(cont.id);
      setHistoryChanges(changes);
    } catch {
      setHistoryChanges([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleOpenPlateCorrectionModal = (veh: VehicleVisit) => {
    setSelectedVehForCorrection(veh);
    setNewLicensePlate(veh.license_plate || '');
    setPlateCorrectionReason('');
    setPlateCorrectionError('');
  };

  const handleSavePlateCorrection = async () => {
    if (!selectedVehForCorrection) return;
    const cleanPlate = newLicensePlate.trim().toUpperCase();
    if (!cleanPlate || cleanPlate.length < 3) {
      setPlateCorrectionError('Vui lòng nhập biển số xe hợp lệ (tối thiểu 3 ký tự).');
      return;
    }
    if (cleanPlate === selectedVehForCorrection.license_plate?.trim().toUpperCase()) {
      setPlateCorrectionError('Biển số mới trùng với biển số hiện tại. Không cần thay đổi.');
      return;
    }
    if (!plateCorrectionReason.trim() || plateCorrectionReason.trim().length < 3) {
      setPlateCorrectionError('Lý do sửa biển số xe là bắt buộc (tối thiểu 3 ký tự).');
      return;
    }

    setIsCorrectingPlate(true);
    setPlateCorrectionError('');

    try {
      const res = await repository.correctVehiclePlate({
        vehicleId: selectedVehForCorrection.id,
        newLicensePlate: cleanPlate,
        reason: plateCorrectionReason.trim(),
        operatorId: user?.id || 'SEC-01',
        operatorName: user?.fullName || 'Nhân viên trực',
      });

      if (res.success) {
        setSelectedVehForCorrection(null);
        handleReload();
      } else {
        setPlateCorrectionError(res.error || 'Lỗi khi sửa biển số xe.');
      }
    } catch (err) {
      setPlateCorrectionError('Lỗi kết nối: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsCorrectingPlate(false);
    }
  };

  const handleOpenVehHistoryModal = async (veh: VehicleVisit) => {
    setSelectedVehForHistory(veh);
    setIsLoadingVehHistory(true);
    try {
      const changes = await repository.getVehiclePlateChanges(veh.id);
      setVehHistoryChanges(changes);
    } catch {
      setVehHistoryChanges([]);
    } finally {
      setIsLoadingVehHistory(false);
    }
  };

  const renderCargoBadge = (status: CargoStatus) => {
    switch (status) {
      case 'HANG':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            HÀNG
          </span>
        );
      case 'RONG':
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
            RỖNG
          </span>
        );
      case 'CHUA_XAC_DINH':
      default:
        return (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            Chưa xác định
          </span>
        );
    }
  };

  if (!canReadYard) {
    return (
      <div className="bg-white rounded-lg p-6 border border-slate-300 text-center max-w-lg mx-auto shadow-2xs">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-2.5" />
        <h2 className="text-base font-bold text-slate-900">Không có quyền truy cập</h2>
        <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
          Tài khoản vai trò <strong>{role || 'Chưa phân quyền'}</strong> chưa được phân quyền theo dõi danh sách phương tiện hoặc container tại bến bãi.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {/* 1. HEADER & THỐNG KÊ NHANH */}
      <div className="bg-white rounded-lg p-3.5 sm:p-4 border border-slate-300 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#223873]">
              Bảng điều khiển Giám sát
            </span>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
              Phương tiện & Container đang trong bãi
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleOpenSingleContModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#223873] text-white text-xs font-bold hover:bg-[#1a2c5b] transition-colors cursor-pointer shadow-2xs"
              title="Tiếp nhận container riêng lẻ do cẩu hạ bãi hoặc thuê vỏ ngoài không theo xe vận tải vào cổng"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Tiếp nhận Cont lẻ (Hạ bãi)</span>
            </button>
            <button
              type="button"
              onClick={() => exportYardVehiclesToExcel(vehicles)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Xuất danh sách phương tiện đang trong bãi sang file Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
              <span>Xuất XLSX Xe ({vehicles.length})</span>
            </button>
            <button
              type="button"
              onClick={() => exportYardContainersToExcel(containers)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              title="Xuất danh sách container đang trong bãi sang file Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-[#0A9444]" />
              <span>Xuất XLSX Cont ({containers.length})</span>
            </button>
            <button
              type="button"
              onClick={() => exportYardInventoryReportToExcel(vehicles, containers)}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded bg-emerald-50 border border-emerald-300 text-xs font-bold text-emerald-900 hover:bg-emerald-100 transition-colors cursor-pointer shadow-2xs"
              title="Xuất Sổ theo dõi tồn bãi tổng hợp Đa Sheet (Xe & Cont) sang file Excel (.xlsx)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Xuất XLSX Tổng hợp</span>
            </button>
            <button
              type="button"
              onClick={handleReload}
              disabled={isLoading}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Đang tải...' : 'Làm mới'}</span>
            </button>
          </div>
        </div>

        {/* Thống kê dạng 6 Cards Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mt-3 pt-3 border-t border-slate-200">
          <div className="bg-slate-50 p-2.5 rounded border border-slate-300">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Xe trong bãi</span>
            <div className="text-lg font-bold font-mono text-[#223873]">{totalVehicles}</div>
          </div>
          <div className="bg-slate-50 p-2.5 rounded border border-slate-300">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Container trong bãi</span>
            <div className="text-lg font-bold font-mono text-[#0A9444]">{totalContainers}</div>
          </div>
          <div className="bg-indigo-50/50 p-2.5 rounded border border-indigo-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Cặp Xe — Cont</span>
            <div className="text-lg font-bold font-mono text-indigo-800">{countPaired}</div>
          </div>
          <div className="bg-emerald-50/50 p-2.5 rounded border border-emerald-300">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Cont có HÀNG</span>
            <div className="text-lg font-bold font-mono text-emerald-800">{countHang}</div>
          </div>
          <div className="bg-blue-50/50 p-2.5 rounded border border-blue-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Cont RỖNG</span>
            <div className="text-lg font-bold font-mono text-blue-800">{countRong}</div>
          </div>
          <div className="bg-amber-50/50 p-2.5 rounded border border-amber-300 col-span-2 sm:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Chưa xác định</span>
            <div className="text-lg font-bold font-mono text-amber-800">{countChuaXD}</div>
          </div>
        </div>
      </div>

      {/* 2. TABS & TÌM KIẾM BỘ LỌC */}
      <div className="bg-white rounded-lg p-3 border border-slate-300 shadow-2xs space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Tabs Switcher: 4 Tab chuẩn công thái học bến bãi */}
          <div className="flex p-0.5 bg-slate-100 rounded border border-slate-300 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('pairs')}
              className={`py-1.5 px-3 rounded text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'pairs'
                  ? 'bg-white text-[#223873] border border-slate-300 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Tổng hợp Xe & Cont ({pairItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('containers')}
              className={`py-1.5 px-3 rounded text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'containers'
                  ? 'bg-white text-[#223873] border border-slate-300 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ContainerIcon className="w-3.5 h-3.5" />
              <span>Container ({totalContainers})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vehicles')}
              className={`py-1.5 px-3 rounded text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'vehicles'
                  ? 'bg-white text-[#223873] border border-slate-300 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Phương tiện ({totalVehicles})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('zones')}
              className={`py-1.5 px-3 rounded text-xs font-bold transition-colors flex items-center justify-center space-x-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'zones'
                  ? 'bg-white text-[#223873] border border-slate-300 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-amber-600" />
              <span>Sơ đồ Phân khu ({yardZones.length} khu)</span>
            </button>
          </div>

          {/* Search Box & Filters */}
          <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap">
            <div className="relative flex-1 sm:w-64 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  activeTab === 'pairs'
                    ? 'Tìm biển số xe, số cont, tài xế...'
                    : activeTab === 'containers'
                    ? 'Tìm số container, xe vào...'
                    : 'Tìm biển số xe, tài xế...'
                }
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded focus:outline-none focus:border-[#0A9444] bg-white"
              />
            </div>

            {/* Bộ lọc cho Tab Tổng hợp */}
            {activeTab === 'pairs' && (
              <>
                <div className="flex items-center space-x-1 border border-slate-300 rounded px-2 py-1 bg-white text-xs">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  <select
                    value={filterPairType}
                    onChange={(e) => setFilterPairType(e.target.value)}
                    className="bg-transparent text-slate-700 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Tất cả xe & cont</option>
                    <option value="PAIRED">Xe chở Container</option>
                    <option value="NO_CONT">Xe lẻ không Cont</option>
                  </select>
                </div>
                <div className="flex items-center space-x-1 border border-slate-300 rounded px-2 py-1 bg-white text-xs">
                  <select
                    value={filterCargo}
                    onChange={(e) => setFilterCargo(e.target.value)}
                    className="bg-transparent text-slate-700 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Mọi loại hàng</option>
                    <option value="HANG">Có HÀNG</option>
                    <option value="RONG">RỖNG</option>
                    <option value="CHUA_XAC_DINH">Chưa XĐ</option>
                  </select>
                </div>
              </>
            )}

            {/* Bộ lọc cho Tab Container */}
            {activeTab === 'containers' && (
              <div className="flex items-center space-x-1 border border-slate-300 rounded px-2 py-1 bg-white text-xs">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={filterCargo}
                  onChange={(e) => setFilterCargo(e.target.value)}
                  className="bg-transparent text-slate-700 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Tất cả</option>
                  <option value="HANG">Có HÀNG</option>
                  <option value="RONG">RỖNG</option>
                  <option value="CHUA_XAC_DINH">Chưa XĐ</option>
                </select>
              </div>
            )}

            {/* Bộ lọc Dwell Time cho các tab (Pairs, Containers, Vehicles) */}
            {activeTab !== 'zones' && (
              <div className="flex items-center space-x-1 border border-slate-300 rounded px-2 py-1 bg-white text-xs">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={filterDwell}
                  onChange={(e) => setFilterDwell(e.target.value as 'ALL' | 'OVER_24H' | 'OVER_48H')}
                  className="bg-transparent text-slate-700 font-bold focus:outline-none cursor-pointer"
                  title="Lọc nhanh xe & container theo thời gian lưu bãi"
                >
                  <option value="ALL">Mọi thời gian lưu bãi</option>
                  <option value="OVER_24H">⚠️ Lưu bãi ≥ 24h</option>
                  <option value="OVER_48H">🚨 Tồn bãi ≥ 48h (Quá hạn)</option>
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. BẢNG TỔNG HỢP XE — CONTAINER (CẶP GHÉP MAPPING BẾN BÃI) */}
      {activeTab === 'pairs' && (
        <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
          {filteredPairs.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-semibold">
              Không tìm thấy cặp xe — container nào phù hợp điều kiện tìm kiếm.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5">Phương tiện vào</th>
                    <th className="px-3.5 py-2.5">Container đi kèm</th>
                    <th className="px-3.5 py-2.5">Tình trạng Hàng</th>
                    <th className="px-3.5 py-2.5">Thời gian & Lưu bãi</th>
                    <th className="px-3.5 py-2.5">Tài xế & CCCD / Ghi chú</th>
                    <th className="px-3.5 py-2.5 text-right">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {filteredPairs.map((item) => {
                    const v = item.vehicle;
                    const c = item.container;
                    const entryTime = v?.entry_at || c?.inbound_at || '';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        {/* 1. Phương tiện vào */}
                        <td className="px-3.5 py-2.5">
                          {v ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-mono font-bold text-slate-900 text-sm">
                                  {v.license_plate}
                                </span>
                                {(v.plate_changes_count || 0) > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenVehHistoryModal(v)}
                                    title="Xem lịch sử đổi biển số xe"
                                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer border border-amber-300"
                                  >
                                    <History className="w-2.5 h-2.5" />
                                    <span>{v.plate_changes_count} lần đổi</span>
                                  </button>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-600 font-medium">
                                {getVehicleTypeName(v.vehicle_type_name || v.vehicle_type)}
                              </div>
                              <div className="flex items-center space-x-1.5 pt-0.5">
                                <span className="font-mono font-bold text-[#0A9444] text-[11px]">
                                  {v.ticket_amount !== null
                                    ? `${v.ticket_amount.toLocaleString('vi-VN')} đ`
                                    : 'Chưa có giá'}
                                </span>
                                {v.ticket_payment_status === 'EXEMPT' ? (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                    Miễn phí
                                  </span>
                                ) : v.ticket_payment_status === 'PAID' ? (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Đã thu
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    Chưa thu
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            (() => {
                              const histVeh = item.inboundVehicleHistory;
                              const inboundPlate = c?.inbound_license_plate || histVeh?.license_plate;
                              if (inboundPlate) {
                                return (
                                  <div className="space-y-0.5">
                                    <div className="flex items-center space-x-1.5 flex-wrap">
                                      <span className="font-mono font-bold text-slate-900 text-sm bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                                        {inboundPlate}
                                      </span>
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                        Xe kéo vào (Đã ra)
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-slate-600 font-medium">
                                      {histVeh ? getVehicleTypeName(histVeh.vehicle_type_name || histVeh.vehicle_type) : 'Xe chở lúc vào cổng'}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      {histVeh?.exit_at ? (
                                        <span>Rời: {new Date(histVeh.exit_at).toLocaleTimeString('vi-VN')} {new Date(histVeh.exit_at).toLocaleDateString('vi-VN')}</span>
                                      ) : (
                                        <span>Đã hạ bãi lưu kho</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              return (
                                <div className="space-y-0.5">
                                  <div className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                                    <span>Tồn bãi (Chưa rõ xe kéo)</span>
                                  </div>
                                  <div className="text-[10px] text-slate-400 italic">
                                    Hạ bãi trước ca trực
                                  </div>
                                </div>
                              );
                            })()
                          )}
                        </td>

                        {/* 2. Container đi kèm */}
                        <td className="px-3.5 py-2.5">
                          {c ? (
                            <div className="space-y-1">
                              <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                                <span className="font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-300 text-xs">
                                  {c.container_no_current}
                                </span>
                                {item.totalPairedConts && item.totalPairedConts > 1 && (
                                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded border border-purple-200">
                                    Cont #{item.pairIndex}/{item.totalPairedConts} (Cặp 20ft)
                                  </span>
                                )}
                                {(c.number_changes_count || 0) > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenHistoryModal(c)}
                                    title="Xem lịch sử đổi số container"
                                    className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer border border-amber-300"
                                  >
                                    <History className="w-2.5 h-2.5" />
                                    <span>{c.number_changes_count} lần đổi</span>
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center space-x-2 text-[11px] text-slate-600 font-medium flex-wrap">
                                <span>{formatContainerSpec(c.container_size, c.container_type)}</span>
                                {c.is_plugged && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    ⚡ {c.slot_code ? `Giắc: ${c.slot_code}` : 'Đang cắm điện'}
                                  </span>
                                )}
                                {!c.is_plugged && c.slot_code && (
                                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
                                    Ô/Giắc: {c.slot_code}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="inline-block px-1.5 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200 italic">
                              Không mang cont (Xe lẻ)
                            </span>
                          )}
                        </td>

                        {/* 3. Tình trạng Hàng hóa */}
                        <td className="px-3.5 py-2.5">
                          {c ? renderCargoBadge(c.cargo_status) : <span className="text-slate-300">—</span>}
                        </td>

                        {/* 4. Thời gian vào & Lưu bãi */}
                        <td className="px-3.5 py-2.5">
                          <div className="space-y-0.5">
                            <div className="text-slate-700 text-[11px] font-mono">
                              {entryTime ? new Date(entryTime).toLocaleTimeString('vi-VN') : '—'} {entryTime ? new Date(entryTime).toLocaleDateString('vi-VN') : ''}
                            </div>
                            {entryTime && (
                              <div className="pt-0.5">
                                {renderDwellBadge(entryTime)}
                              </div>
                            )}
                          </div>
                        </td>

                        {/* 5. Tài xế & CCCD / Ghi chú */}
                        <td className="px-3.5 py-2.5">
                          {v ? (
                            <div className="space-y-0.5 text-[11px]">
                              <div className="font-bold text-slate-800">
                                {v.driver_name || 'Chưa có tên'} {v.driver_phone ? `— ${v.driver_phone}` : ''}
                              </div>
                              {v.note && (
                                <div className="text-slate-500 text-[10px] max-w-xs truncate" title={v.note}>
                                  {v.note}
                                </div>
                              )}
                            </div>
                          ) : item.inboundVehicleHistory?.driver_name ? (
                            <div className="space-y-0.5 text-[11px]">
                              <div className="font-bold text-slate-800">
                                {item.inboundVehicleHistory.driver_name} {item.inboundVehicleHistory.driver_phone ? `— ${item.inboundVehicleHistory.driver_phone}` : ''}
                              </div>
                              <div className="text-slate-500 text-[10px]">
                                (Lái xe đã chở cont vào bãi)
                              </div>
                              {item.inboundVehicleHistory.note && (
                                <div className="text-slate-500 text-[10px] max-w-xs truncate" title={item.inboundVehicleHistory.note}>
                                  {item.inboundVehicleHistory.note}
                                </div>
                              )}
                            </div>
                          ) : c?.notes ? (
                            <div className="text-slate-600 text-[11px] max-w-xs truncate" title={c.notes}>
                              {c.notes}
                            </div>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* 6. Tác vụ */}
                        <td className="px-3.5 py-2.5 text-right relative">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Nút Thu phí nổi bật bên ngoài nếu xe chưa thu phí vé vào */}
                            {v && v.ticket_payment_status === 'UNPAID' && canCollectTicket && (
                              <Link
                                href="/billing"
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#0A9444] hover:bg-[#087C3C] text-white font-bold text-xs shadow-2xs transition-colors shrink-0"
                                title="Chuyển sang thu phí vé cổng"
                              >
                                <span>Thu phí</span>
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            )}

                            {/* Dropdown Menu Thao tác gom gọn gàng các nút sửa đổi, nhật ký */}
                            <div className="relative inline-block text-left" data-action-dropdown>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenActionDropdownId(openActionDropdownId === item.id ? null : item.id);
                                }}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                                title="Mở danh sách thao tác"
                              >
                                <span>Thao tác</span>
                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                              </button>

                              {openActionDropdownId === item.id && (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 mt-1 w-52 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-40 text-left divide-y divide-slate-100 animate-in fade-in zoom-in-95"
                                >
                                  {/* Thao tác Phương tiện */}
                                  {v && (
                                    <div className="py-1">
                                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Phương tiện: {v.license_plate || 'Chưa biển'}
                                      </div>
                                      {canUpdateVehicle && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionDropdownId(null);
                                            handleOpenPlateCorrectionModal(v);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-900 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                                        >
                                          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Sửa biển số xe</span>
                                        </button>
                                      )}
                                      {isLeadOrAdmin && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionDropdownId(null);
                                            handleOpenAdjustVehicleModal(v);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                                        >
                                          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                                          <span>Hiệu chỉnh ca trực</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionDropdownId(null);
                                          handleOpenVehHistoryModal(v);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                                      >
                                        <History className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Nhật ký & Log xe</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionDropdownId(null);
                                          handleOpenLocationModal('VEHICLE', {
                                            id: v.id,
                                            title: v.license_plate || 'XE',
                                            subtitle: getVehicleTypeName(v.vehicle_type_name || v.vehicle_type),
                                            yard_zone: v.yard_zone,
                                            slot_code: v.slot_code,
                                          });
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                                      >
                                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                        <span>Gán phân khu / ô đỗ</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Xe chở cont vào bãi trước đó */}
                                  {!v && item.inboundVehicleHistory && (
                                    <div className="py-1">
                                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Xe kéo: {item.inboundVehicleHistory.license_plate}
                                      </div>
                                      {isLeadOrAdmin && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionDropdownId(null);
                                            handleOpenAdjustVehicleModal(item.inboundVehicleHistory!);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                                        >
                                          <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                                          <span>Hiệu chỉnh xe kéo</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionDropdownId(null);
                                          handleOpenVehHistoryModal(item.inboundVehicleHistory!);
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                                      >
                                        <History className="w-3.5 h-3.5 text-blue-600" />
                                        <span>Log xe kéo vào</span>
                                      </button>
                                    </div>
                                  )}

                                  {/* Thao tác Container */}
                                  {c && (
                                    <div className="py-1">
                                      <div className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                        Container: {c.container_no_current}
                                      </div>
                                      {canUpdateCargo && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionDropdownId(null);
                                            handleOpenCargoModal(c);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-xs text-blue-800 hover:bg-blue-50 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                                        >
                                          <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                          <span>Cập nhật HÀNG / RỖNG</span>
                                        </button>
                                      )}
                                      {canCorrectContainer && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setOpenActionDropdownId(null);
                                            handleOpenCorrectionModal(c);
                                          }}
                                          className="w-full text-left px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-50 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                                        >
                                          <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                          <span>Sửa mã số container</span>
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionDropdownId(null);
                                          handleOpenLocationModal('CONTAINER', {
                                            id: c.id,
                                            title: c.container_no_current,
                                            subtitle: formatContainerSpec(c.container_size, c.container_type),
                                            yard_zone: c.yard_zone,
                                            slot_code: c.slot_code,
                                          });
                                        }}
                                        className="w-full text-left px-3 py-1.5 text-xs text-emerald-800 hover:bg-emerald-50 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                                      >
                                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Gán phân khu / Giắc cắm</span>
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
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
      )}

      {/* 4. BẢNG CONTAINER */}
      {activeTab === 'containers' && (
        <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
          {filteredContainers.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-semibold">
              Không tìm thấy container nào trong bãi phù hợp điều kiện lọc.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5">Số Container</th>
                    <th className="px-3.5 py-2.5">Kích cỡ / Loại</th>
                    <th className="px-3.5 py-2.5">Tình trạng Hàng</th>
                    <th className="px-3.5 py-2.5">Xe đưa vào</th>
                    <th className="px-3.5 py-2.5">Thời gian vào</th>
                    <th className="px-3.5 py-2.5 text-right">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {filteredContainers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900 text-sm">
                            {c.container_no_current}
                          </span>
                          {(c.number_changes_count || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenHistoryModal(c)}
                              title="Xem lịch sử đổi số container"
                              className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer border border-amber-300"
                            >
                              <History className="w-2.5 h-2.5" />
                              <span>{c.number_changes_count} lần đổi</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-700 font-medium">
                        {formatContainerSpec(c.container_size, c.container_type)}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {renderCargoBadge(c.cargo_status)}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {c.inbound_license_plate ? (
                          <div className="space-y-0.5">
                            <span className="font-mono font-bold text-slate-900 text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                              {c.inbound_license_plate}
                            </span>
                            {allVehicleMap.get(c.inbound_vehicle_visit_id || '')?.status === 'EXITED' && (
                              <span className="text-[10px] text-amber-700 block font-semibold">
                                (Xe đã rời bãi)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Tồn bãi (Chưa rõ xe)</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="space-y-1">
                          <div className="text-slate-600 font-mono text-[11px]">
                            {new Date(c.inbound_at).toLocaleString('vi-VN')}
                          </div>
                          <div>{renderDwellBadge(c.inbound_at)}</div>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {canCorrectContainer && (
                            <button
                              type="button"
                              onClick={() => handleOpenCorrectionModal(c)}
                              className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors font-bold text-[11px] cursor-pointer border border-amber-300"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Sửa số</span>
                            </button>
                          )}
                          {canUpdateCargo && (
                            <button
                              type="button"
                              onClick={() => handleOpenCargoModal(c)}
                              className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors font-bold text-[11px] cursor-pointer border border-blue-300"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>HÀNG/RỖNG</span>
                            </button>
                          )}
                          {!canCorrectContainer && !canUpdateCargo && (
                            <span className="text-[11px] text-slate-400 font-semibold italic">
                              Chỉ xem
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4. BẢNG PHƯƠNG TIỆN */}
      {activeTab === 'vehicles' && (
        <div className="bg-white rounded-lg border border-slate-300 shadow-2xs overflow-hidden">
          {filteredVehicles.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-semibold">
              Không tìm thấy phương tiện nào đang trong bãi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-3.5 py-2.5">Biển số xe</th>
                    <th className="px-3.5 py-2.5">Loại xe</th>
                    <th className="px-3.5 py-2.5">Mã vé</th>
                    <th className="px-3.5 py-2.5">Tiền vé</th>
                    <th className="px-3.5 py-2.5">Thanh toán vé</th>
                    <th className="px-3.5 py-2.5">Tài xế</th>
                    <th className="px-3.5 py-2.5">Thời gian vào</th>
                    <th className="px-3.5 py-2.5 text-right">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {filteredVehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono font-bold text-slate-900 text-sm">
                        <div className="flex items-center space-x-1.5">
                          <span>{v.license_plate}</span>
                          {(v.plate_changes_count || 0) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenVehHistoryModal(v)}
                              title="Xem lịch sử đổi biển số xe"
                              className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition-colors cursor-pointer border border-amber-300 font-sans"
                            >
                              <History className="w-2.5 h-2.5" />
                              <span>{v.plate_changes_count} lần đổi</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-700 font-medium">
                        <div>{getVehicleTypeName(v.vehicle_type_name || v.vehicle_type)}</div>
                        {(() => {
                          const vPlate = v.license_plate?.trim().toUpperCase();
                          const attachedConts = resolvedContainers.filter(
                            (c) =>
                              (c.inbound_vehicle_visit_id && c.inbound_vehicle_visit_id === v.id) ||
                              (vPlate && c.inbound_license_plate && c.inbound_license_plate.trim().toUpperCase() === vPlate)
                          );
                          if (attachedConts.length === 0) return null;
                          return (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {attachedConts.map((c, idx) => (
                                <span
                                  key={c.id || idx}
                                  className="font-mono text-[10px] font-bold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200"
                                >
                                  {attachedConts.length > 1 ? `#${idx + 1}: ` : ''}
                                  {c.container_no_current} ({c.container_size || '40'}ft)
                                </span>
                              ))}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-600">
                        {v.ticket_code || '—'}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono font-bold text-[#0A9444]">
                        {v.ticket_amount !== null ? `${v.ticket_amount.toLocaleString('vi-VN')} đ` : 'Chưa có giá'}
                      </td>
                      <td className="px-3.5 py-2.5">
                        {v.ticket_payment_status === 'EXEMPT' ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Miễn phí
                          </span>
                        ) : v.ticket_payment_status === 'PAID' ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Đã thu
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Chưa thu
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-700">
                        {v.driver_name || '—'} {v.driver_phone ? `(${v.driver_phone})` : ''}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <div className="space-y-1">
                          <div className="text-slate-600 font-mono text-[11px]">
                            {new Date(v.entry_at).toLocaleString('vi-VN')}
                          </div>
                          <div>{renderDwellBadge(v.entry_at)}</div>
                        </div>
                      </td>
                      <td className="px-3.5 py-2.5 text-right relative">
                        <div className="flex items-center justify-end space-x-1.5">
                          {v.ticket_payment_status === 'UNPAID' && canCollectTicket && (
                            <Link
                              href="/billing"
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-[#0A9444] hover:bg-[#087C3C] text-white font-bold text-xs shadow-2xs transition-colors shrink-0"
                              title="Chuyển sang thu phí vé cổng"
                            >
                              <span>Thu phí</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          )}

                          <div className="relative inline-block text-left" data-action-dropdown>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionDropdownId(openActionDropdownId === v.id ? null : v.id);
                              }}
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                              title="Mở menu thao tác phương tiện"
                            >
                              <span>Thao tác</span>
                              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                            </button>

                            {openActionDropdownId === v.id && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 py-1.5 z-40 text-left divide-y divide-slate-100 animate-in fade-in zoom-in-95"
                              >
                                <div className="py-1">
                                  {canUpdateVehicle && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionDropdownId(null);
                                        handleOpenPlateCorrectionModal(v);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-amber-50 hover:text-amber-900 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                                      <span>Sửa biển số xe</span>
                                    </button>
                                  )}
                                  {isLeadOrAdmin && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionDropdownId(null);
                                        handleOpenAdjustVehicleModal(v);
                                      }}
                                      className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-900 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                                    >
                                      <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>Hiệu chỉnh ca trực</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionDropdownId(null);
                                      handleOpenVehHistoryModal(v);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                                  >
                                    <History className="w-3.5 h-3.5 text-blue-600" />
                                    <span>Nhật ký & Log xe</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionDropdownId(null);
                                      handleOpenLocationModal('VEHICLE', {
                                        id: v.id,
                                        title: v.license_plate || 'XE',
                                        subtitle: getVehicleTypeName(v.vehicle_type_name || v.vehicle_type),
                                        yard_zone: v.yard_zone,
                                        slot_code: v.slot_code,
                                      });
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 font-medium flex items-center space-x-2 transition-colors cursor-pointer"
                                  >
                                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Gán phân khu / ô đỗ</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 4B. SƠ ĐỒ PHÂN KHU BÃI SƠN CẢNG (YARD ZONES) */}
      {activeTab === 'zones' && (
        <div className="space-y-4">
          {/* Thanh công cụ quản lý phân khu */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-lg border border-slate-300 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Grid className="w-4 h-4 text-[#223873]" />
                Sơ đồ & Danh mục Phân khu bãi Sơn Cảng ({yardZones.length} phân khu)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý phân khu chức năng bến bãi, sức chứa xe/container và trụ điện 380V
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreateZoneModal}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#0A9444] hover:bg-[#087C3C] text-white font-bold text-xs shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Phân khu mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {yardZones.map((zone) => {
              const zoneVehicles = vehicles.filter(v => v.yard_zone === zone.code);
              const zoneContainers = containers.filter(c => c.yard_zone === zone.code);
              const totalCount = zoneVehicles.length + zoneContainers.length;
              const percent = zone.capacity > 0 ? Math.min(100, Math.round((totalCount / zone.capacity) * 100)) : 0;

              return (
                <div key={zone.code} className="bg-white rounded-lg border border-slate-300 p-3.5 shadow-2xs space-y-3 flex flex-col justify-between hover:border-slate-400 transition-colors">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${zone.color_badge || 'bg-slate-100 text-slate-800 border-slate-300'}`}>
                        {zone.code}
                      </span>
                      <div className="flex items-center space-x-1">
                        {zone.has_power_outlets && (
                          <span className="text-[10px] font-bold bg-amber-500 text-white px-1.5 py-0.5 rounded flex items-center space-x-1">
                            <span>⚡ Trụ 380V</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEditZoneModal(zone)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
                          title="Sửa thông tin phân khu"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteZone(zone.code)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Xóa phân khu"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <h3 className="font-bold text-xs text-slate-900">{zone.name}</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">
                      {zone.description}
                    </p>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-600">Đang đỗ / Sức chứa:</span>
                      <span className="font-bold font-mono text-slate-900">
                        {totalCount} / {zone.capacity} ({percent}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-100 rounded h-1.5 overflow-hidden border border-slate-200">
                      <div 
                        className={`h-1.5 rounded transition-all ${
                          percent > 90 ? 'bg-rose-500' : percent > 70 ? 'bg-amber-500' : 'bg-[#0A9444]'
                        }`} 
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1 text-slate-600 font-mono">
                      <span>Xe: <strong className="text-slate-900">{zoneVehicles.length}</strong></span>
                      <span>Cont: <strong className="text-slate-900">{zoneContainers.length}</strong></span>
                      {zone.code === 'KHU_A_REEFER' && (
                        <span>Cắm điện: <strong className="text-amber-600">{containers.filter(c => c.is_plugged).length}</strong></span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ========================================================================= */}
          {/* BẢNG ĐIỀU KHIỂN & KIỂM SOÁT 30 GIẮC CẮM ĐIỆN 380V (KHU A REEFER) */}
          {/* ========================================================================= */}
          <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500 fill-current" />
                  <span>Kiểm soát 30 Giắc cắm điện Container Lạnh 380V (Khu A Reefer)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Theo dõi thời gian thực tình trạng từng trụ điện 380V/32A. Nhận biết ngay trụ nào đang cấp điện cho cont nào, trụ nào đang trống.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {(() => {
                  const pluggedCount = containers.filter(c => c.is_plugged).length;
                  return (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded bg-amber-50 border border-amber-300 font-bold text-amber-900 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-600 fill-current" />
                        <span>Đang cắm: <strong>{pluggedCount}</strong> / 30</span>
                      </span>
                      <span className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-300 font-bold text-emerald-900 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Trống: <strong>{Math.max(0, 30 - pluggedCount)}</strong></span>
                      </span>
                      <Link
                        href="/reefer"
                        className="px-2.5 py-1 rounded bg-[#223873] hover:bg-[#1a2c5a] text-white font-bold text-xs transition-colors flex items-center gap-1"
                      >
                        <span>Mở Quản lý cắm điện CCKB</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* LƯỚI 30 GIẮC CẮM ĐIỆN (R01 ĐẾN R30) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
              {Array.from({ length: 30 }, (_, i) => {
                const socketCode = `R${String(i + 1).padStart(2, '0')}`;
                // Tìm container đang cắm vào giắc này
                const pluggedCont = containers.find(
                  (c) => c.is_plugged && (c.plug_socket_code === socketCode || c.slot_code === socketCode)
                );

                if (pluggedCont) {
                  return (
                    <div
                      key={socketCode}
                      className="p-2.5 rounded-lg border-2 border-amber-400 bg-amber-50/80 shadow-2xs space-y-1.5 transition-all hover:shadow-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-amber-950 bg-amber-200/80 px-1.5 py-0.5 rounded border border-amber-300">
                          {socketCode}
                        </span>
                        <span className="text-[10px] font-bold text-amber-800 flex items-center gap-0.5 animate-pulse">
                          <Zap className="w-3 h-3 fill-current text-amber-600" />
                          <span>Đang cắm</span>
                        </span>
                      </div>
                      <div>
                        <div className="font-mono font-bold text-xs text-blue-950 truncate" title={pluggedCont.container_no_current}>
                          {pluggedCont.container_no_current}
                        </div>
                        {pluggedCont.inbound_license_plate && (
                          <div className="text-[10px] text-slate-600 font-semibold truncate">
                            Xe: {pluggedCont.inbound_license_plate}
                          </div>
                        )}
                        <div className="text-[10px] text-amber-900 font-medium mt-0.5 flex items-center justify-between">
                          <span>{formatContainerSpec(pluggedCont.container_size, pluggedCont.container_type)}</span>
                          <span className="font-bold">{pluggedCont.cargo_status === 'HANG' ? 'HÀNG' : 'RỖNG'}</span>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={socketCode}
                    className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-colors space-y-1.5 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-300">
                        {socketCode}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Trống</span>
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      <span>380V / 3 pha</span>
                      <div className="text-slate-400">Sẵn sàng cắm</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chi tiết từng phân khu và danh sách xe / cont đang đỗ */}
          <div className="bg-white rounded-lg border border-slate-300 p-4 shadow-2xs space-y-3.5">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Chi tiết phân bổ xe & container theo phân khu</h3>
              <p className="text-xs text-slate-500">Điều phối viên và An ninh có thể gán hoặc điều chuyển vị trí đỗ (Khu A - D và ô đỗ/trụ điện)</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Cột Xe */}
              <div className="border border-slate-300 rounded p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-800">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Phương tiện trong bãi ({vehicles.length})</span>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {vehicles.map(v => (
                    <div key={v.id} className="p-2 bg-white rounded border border-slate-300 flex items-center justify-between hover:border-slate-400">
                      <div>
                        <div className="font-mono font-bold text-slate-900">{v.license_plate}</div>
                        <div className="text-[11px] text-slate-500">{getVehicleTypeName(v.vehicle_type_name || v.vehicle_type)}</div>
                        <div className="text-[10px] text-slate-600 mt-0.5">
                          Khu: <span className="font-bold text-blue-700">{v.yard_zone || 'Chưa gán'}</span>
                          {v.slot_code && <span> — Ô: <span className="font-bold text-amber-700">{v.slot_code}</span></span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenLocationModal('VEHICLE', {
                          id: v.id,
                          title: v.license_plate || 'XE',
                          subtitle: getVehicleTypeName(v.vehicle_type_name || v.vehicle_type),
                          yard_zone: v.yard_zone,
                          slot_code: v.slot_code,
                        })}
                        className="px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] border border-blue-300 cursor-pointer flex items-center space-x-1"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Gán vị trí</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cột Container */}
              <div className="border border-slate-300 rounded p-3 bg-slate-50 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <div className="flex items-center space-x-1.5 font-bold text-xs text-slate-800">
                    <ContainerIcon className="w-3.5 h-3.5 text-[#0A9444]" />
                    <span>Container trong bãi ({containers.length})</span>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {containers.map(c => (
                    <div key={c.id} className="p-2 bg-white rounded border border-slate-300 flex items-center justify-between hover:border-slate-400">
                      <div>
                        <div className="font-mono font-bold text-blue-900">{c.container_no_current}</div>
                        <div className="text-[11px] text-slate-500">
                          {formatContainerSpec(c.container_size, c.container_type)} — {renderCargoBadge(c.cargo_status)}
                          {c.is_plugged && <span className="ml-1 text-amber-600 font-bold">⚡ Đang cắm</span>}
                        </div>
                        <div className="text-[10px] text-slate-600 mt-0.5">
                          Khu: <span className="font-bold text-emerald-700">{c.yard_zone || 'Chưa gán'}</span>
                          {c.slot_code && <span> — Ô/Trụ: <span className="font-bold text-amber-700">{c.slot_code}</span></span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenLocationModal('CONTAINER', {
                          id: c.id,
                          title: c.container_no_current,
                          subtitle: formatContainerSpec(c.container_size, c.container_type),
                          yard_zone: c.yard_zone,
                          slot_code: c.slot_code,
                        })}
                        className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px] border border-emerald-300 cursor-pointer flex items-center space-x-1"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Gán vị trí</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL ĐIỀU PHỐI CẬP NHẬT HÀNG / RỖNG (CHUẨN HÓA RPC V5: CHỈ HÀNG HOẶC RỖNG) */}
      {selectedCont && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-sm w-full p-4.5 border border-slate-300 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">Phân hệ Điều phối bãi</span>
                <h3 className="text-sm font-bold text-slate-900">Cập nhật HÀNG / RỖNG</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCont(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {updateError && (
              <div className="p-2 rounded bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-200">
                {updateError}
              </div>
            )}

            <div className="bg-slate-50 p-2.5 rounded border border-slate-300 text-xs space-y-1">
              <div>Container: <strong className="font-mono text-slate-900 text-sm">{selectedCont.container_no_current}</strong></div>
              <div>Hiện tại: {renderCargoBadge(selectedCont.cargo_status)}</div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Chọn trạng thái hàng hóa mới:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { code: 'HANG', label: 'HÀNG (Có hàng)', color: 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-1 ring-emerald-500' },
                  { code: 'RONG', label: 'RỖNG (Vỏ rỗng)', color: 'bg-blue-50 text-blue-800 border-blue-400 ring-1 ring-blue-500' },
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setNewCargoStatus(item.code as CargoStatusUpdate)}
                    className={`p-2.5 rounded text-xs font-bold border transition-colors cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                      newCargoStatus === item.code
                        ? `${item.color} shadow-2xs`
                        : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-1 flex space-x-2">
              <button
                type="button"
                onClick={() => setSelectedCont(null)}
                className="flex-1 py-1.5 px-3 rounded text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSaveCargoStatus}
                disabled={isUpdating}
                className="flex-1 py-1.5 px-3 rounded text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isUpdating ? 'Đang lưu...' : 'Xác nhận lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL SỬA SỐ CONTAINER (RBAC V5: AN NINH / CCKB TRƯỞNG, KHÔNG THAY ĐỔI ID LƯỢT) */}
      {selectedContForCorrection && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-md w-full p-4.5 border border-slate-300 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Hiệu chỉnh số container</span>
                <h3 className="text-sm font-bold text-slate-900">Sửa số Container</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContForCorrection(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {correctionError && (
              <div className="p-2 rounded bg-rose-50 text-rose-700 text-xs font-semibold flex items-center space-x-1.5 border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{correctionError}</span>
              </div>
            )}

            <div className="bg-amber-50/60 p-2.5 rounded text-xs space-y-1 border border-amber-300">
              <div className="text-slate-600">Số container hiện tại:</div>
              <div className="font-mono font-bold text-sm text-slate-900">{selectedContForCorrection.container_no_current}</div>
              <p className="text-[11px] text-amber-800 pt-0.5">
                Lưu ý: Thao tác sửa số sẽ được ghi nhận vào nhật ký kiểm toán và không làm thay đổi lịch sử lượt xe.
              </p>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số container mới (Bắt buộc):
                </label>
                <input
                  type="text"
                  value={newContainerNo}
                  onChange={(e) => setNewContainerNo(e.target.value.toUpperCase())}
                  placeholder="VD: TCLU1234567"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold uppercase focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do sửa số (Bắt buộc tối thiểu 3 ký tự):
                </label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="VD: Nhân viên cổng gõ nhầm 1 ký tự, đã đối chiếu hình ảnh thực tế..."
                  rows={2}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bằng chứng / Ghi chú đối chiếu (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={correctionEvidence}
                  onChange={(e) => setCorrectionEvidence(e.target.value)}
                  placeholder="VD: Biên bản số 01/BB-AN hoặc link ảnh hiện trường..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>
            </div>

            <div className="pt-1 flex space-x-2">
              <button
                type="button"
                onClick={() => setSelectedContForCorrection(null)}
                className="flex-1 py-1.5 px-3 rounded text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSaveCorrection}
                disabled={isCorrecting}
                className="flex-1 py-1.5 px-3 rounded text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isCorrecting ? 'Đang lưu...' : 'Xác nhận sửa số'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL XEM LỊCH SỬ SỬA SỐ CONTAINER */}
      {selectedContForHistory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-md w-full p-4.5 border border-slate-300 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-[#223873]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Lịch sử đổi số container</h3>
                  <span className="text-xs font-mono font-bold text-slate-500">{selectedContForHistory.container_no_current}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContForHistory(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="py-6 text-center text-xs text-slate-500 font-bold">
                Đang tải lịch sử đổi số...
              </div>
            ) : historyChanges.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 font-semibold">
                Chưa có lần sửa số nào được ghi nhận cho container này.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
                {historyChanges.map((item, idx) => (
                  <div key={item.id || idx} className="p-2.5 rounded bg-slate-50 border border-slate-300 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{new Date(item.changed_at).toLocaleString('vi-VN')}</span>
                      <span className="font-bold text-[#223873]">{item.changed_by_name || item.changed_by}</span>
                    </div>
                    <div className="flex items-center space-x-2 font-mono font-bold text-xs">
                      <span className="text-rose-600 line-through">{item.old_number}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-emerald-700">{item.new_number}</span>
                    </div>
                    <div className="text-slate-700 text-xs pt-0.5">
                      <strong>Lý do:</strong> {item.reason}
                    </div>
                    {item.evidence_url && (
                      <div className="text-[11px] text-slate-500">
                        <strong>Bằng chứng:</strong> {item.evidence_url}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-1">
              <button
                type="button"
                onClick={() => setSelectedContForHistory(null)}
                className="w-full py-1.5 px-3 rounded text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL SỬA BIỂN SỐ XE (AN NINH / ĐIỀU PHỐI, BẢO TOÀN NGUYÊN VẸN ID LƯỢT XE VÀ TIỀN VÉ) */}
      {selectedVehForCorrection && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-md w-full p-4.5 border border-slate-300 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Hiệu chỉnh phương tiện</span>
                <h3 className="text-sm font-bold text-slate-900">Sửa biển số xe</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVehForCorrection(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {plateCorrectionError && (
              <div className="p-2 rounded bg-rose-50 text-rose-700 text-xs font-semibold flex items-center space-x-1.5 border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{plateCorrectionError}</span>
              </div>
            )}

            <div className="bg-amber-50/60 p-2.5 rounded text-xs space-y-1 border border-amber-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Biển số hiện tại:</span>
                <span className="font-mono font-bold text-sm text-slate-900">{selectedVehForCorrection.license_plate}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Loại xe:</span>
                <span className="font-bold text-slate-700">{getVehicleTypeName(selectedVehForCorrection.vehicle_type_name || selectedVehForCorrection.vehicle_type)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Tiền vé cổng:</span>
                <span className="font-bold font-mono text-[#0A9444]">
                  {selectedVehForCorrection.ticket_amount !== null ? `${selectedVehForCorrection.ticket_amount.toLocaleString('vi-VN')} đ` : '0 đ'}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 pt-0.5 border-t border-amber-200">
                Lưu ý: Thao tác sửa biển số xe sẽ tự động ghi nhật ký kiểm toán, bảo toàn nguyên vẹn ID lượt xe và trạng thái sổ cái thu phí.
              </p>
            </div>

            <div className="space-y-2.5">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700">
                    Biển số xe mới (Bắt buộc):
                  </label>
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-slate-400">Gõ nhanh biển TQ:</span>
                    {['桂', '粤', '云', '湘', '挂'].map((ch) => (
                      <button
                        key={ch}
                        type="button"
                        onClick={() => setNewLicensePlate((prev) => ch + prev)}
                        className="px-1 py-0.5 text-[10px] bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 font-bold rounded border border-slate-300 cursor-pointer"
                        title={`Thêm ký tự ${ch}`}
                      >
                        +{ch}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={newLicensePlate}
                  onChange={(e) => setNewLicensePlate(e.target.value.toUpperCase())}
                  placeholder="VD: 14C-123.45 hoặc 桂A-12345"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold uppercase focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Lý do sửa biển số xe (Bắt buộc tối thiểu 3 ký tự):
                </label>
                <textarea
                  value={plateCorrectionReason}
                  onChange={(e) => setPlateCorrectionReason(e.target.value)}
                  placeholder="VD: Nhập nhầm ký tự khi đón tiếp tại cổng, đã đối chiếu lại hình ảnh đăng kiểm..."
                  rows={2}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-amber-500 bg-white"
                />
              </div>
            </div>

            <div className="pt-1 flex space-x-2">
              <button
                type="button"
                onClick={() => setSelectedVehForCorrection(null)}
                className="flex-1 py-1.5 px-3 rounded text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSavePlateCorrection}
                disabled={isCorrectingPlate}
                className="flex-1 py-1.5 px-3 rounded text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isCorrectingPlate ? 'Đang lưu...' : 'Xác nhận sửa biển'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL XEM NHẬT KÝ & LỊCH SỬ LƯỢT XE */}
      {selectedVehForHistory && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-lg w-full p-4.5 border border-slate-300 shadow-xl space-y-3.5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center space-x-2">
                <History className="w-4 h-4 text-[#223873]" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Nhật ký & Lịch sử lượt xe</h3>
                  <span className="text-xs font-mono font-bold text-slate-500">{selectedVehForHistory.license_plate}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedVehForHistory(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Thông tin tổng quan lượt xe */}
            <div className="bg-slate-50 p-2.5 rounded text-xs grid grid-cols-2 gap-2 border border-slate-300 shrink-0">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Loại phương tiện:</span>
                <span className="font-bold text-slate-800">{getVehicleTypeName(selectedVehForHistory.vehicle_type_name || selectedVehForHistory.vehicle_type)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Mã vé cổng:</span>
                <span className="font-mono font-bold text-slate-800">{selectedVehForHistory.ticket_code || '—'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Tiền vé:</span>
                <span className="font-mono font-bold text-[#0A9444]">
                  {selectedVehForHistory.ticket_amount !== null ? `${selectedVehForHistory.ticket_amount.toLocaleString('vi-VN')} đ` : '0 đ'}
                </span>
                <span className="ml-1 text-[10px]">
                  ({selectedVehForHistory.ticket_payment_status === 'PAID' ? 'Đã thu' : selectedVehForHistory.ticket_payment_status === 'EXEMPT' ? 'Miễn phí' : 'Chưa thu'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Tài xế / SĐT:</span>
                <span className="font-bold text-slate-800">
                  {selectedVehForHistory.driver_name || 'Chưa ghi tên'} {selectedVehForHistory.driver_phone ? `(${selectedVehForHistory.driver_phone})` : ''}
                </span>
              </div>
            </div>

            {/* Dòng thời gian / Timeline các sự kiện */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>Tiến trình vận hành lượt xe</span>
              </h4>

              {/* Sự kiện 1: Vào cổng */}
              <div className="relative pl-4 pb-2.5 border-l-2 border-emerald-500 text-xs space-y-0.5">
                <div className="absolute -left-[5px] top-0 w-2 h-2 rounded bg-emerald-600"></div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-bold text-emerald-800">1. Tiếp nhận vào bãi</span>
                  <span className="font-mono">{new Date(selectedVehForHistory.entry_at).toLocaleString('vi-VN')}</span>
                </div>
                <div className="text-slate-700 text-[11px]">
                  Nhân viên tiếp nhận: <strong>{selectedVehForHistory.entry_by_name || 'Nhân viên An ninh'}</strong>
                </div>
              </div>

              {/* Sự kiện 2: Lịch sử đổi biển số xe nếu có */}
              {isLoadingVehHistory ? (
                <div className="py-4 text-center text-xs text-slate-500 font-bold">
                  Đang tải lịch sử đổi biển số...
                </div>
              ) : vehHistoryChanges.length > 0 ? (
                <div className="relative pl-4 pb-2.5 border-l-2 border-amber-500 text-xs space-y-2">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded bg-amber-600"></div>
                  <div className="font-bold text-amber-800 text-[11px]">
                    2. Lịch sử hiệu chỉnh biển số xe ({vehHistoryChanges.length} lần)
                  </div>
                  <div className="space-y-1.5">
                    {vehHistoryChanges.map((change, idx) => (
                      <div key={change.id || idx} className="p-2 rounded bg-amber-50 border border-amber-300 text-xs space-y-0.5">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>{new Date(change.changed_at).toLocaleString('vi-VN')}</span>
                          <span className="font-bold text-slate-700">{change.changed_by_name || change.changed_by}</span>
                        </div>
                        <div className="flex items-center space-x-2 font-mono font-bold text-xs">
                          <span className="text-rose-600 line-through">{change.old_plate}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-emerald-700">{change.new_plate}</span>
                        </div>
                        <div className="text-slate-700 text-[11px]">
                          <strong>Lý do:</strong> {change.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="relative pl-4 pb-2.5 border-l-2 border-slate-300 text-xs space-y-1">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded bg-slate-400"></div>
                  <div className="text-slate-500 text-[11px]">
                    Biển số xe giữ nguyên từ lúc vào bãi, chưa có lần chỉnh sửa nào.
                  </div>
                </div>
              )}

              {/* Sự kiện 3: Container đi kèm nếu có */}
              {(() => {
                const linkedCont = resolvedContainers.find(c => c.inbound_vehicle_visit_id === selectedVehForHistory.id);
                if (!linkedCont) return null;
                return (
                  <div className="relative pl-4 pb-2.5 border-l-2 border-blue-500 text-xs space-y-0.5">
                    <div className="absolute -left-[5px] top-0 w-2 h-2 rounded bg-blue-600"></div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-blue-800">3. Container đi kèm</span>
                      <span className="font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-300">
                        {linkedCont.container_no_current}
                      </span>
                    </div>
                    <div className="text-slate-600 text-[11px]">
                      Quy cách: {formatContainerSpec(linkedCont.container_size, linkedCont.container_type)} — Trạng thái: {renderCargoBadge(linkedCont.cargo_status)}
                    </div>
                  </div>
                );
              })()}

              {/* Sự kiện 4: Ghi chú lượt xe nếu có */}
              {selectedVehForHistory.note && (
                <div className="relative pl-4 pb-1 border-l-2 border-slate-300 text-xs space-y-1">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded bg-slate-400"></div>
                  <span className="font-bold text-slate-600 text-[11px]">Nhật ký ghi chú lượt xe:</span>
                  <div className="p-2 rounded bg-slate-50 border border-slate-300 text-slate-700 text-xs leading-relaxed">
                    {selectedVehForHistory.note}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-1 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedVehForHistory(null)}
                className="w-full py-1.5 px-3 rounded text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GÁN PHÂN KHU & VỊ TRÍ ĐỖ BÃI */}
      {locationModalItem && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-md w-full p-4.5 border border-slate-300 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-[#223873] uppercase tracking-wider">Phân hệ Điều phối & Quản lý Bãi</span>
                <h3 className="text-sm font-bold text-slate-900">Gán Phân khu & Vị trí đỗ</h3>
              </div>
              <button
                type="button"
                onClick={() => setLocationModalItem(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {locationError && (
              <div className="p-2 rounded bg-rose-50 text-rose-700 text-xs font-semibold flex items-center space-x-1.5 border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{locationError}</span>
              </div>
            )}

            <div className="bg-slate-50 p-2.5 rounded text-xs space-y-0.5 border border-slate-300">
              <div className="text-slate-500 font-medium">
                {locationModalItem.type === 'VEHICLE' ? 'Phương tiện:' : 'Container:'}
              </div>
              <div className="font-mono font-bold text-sm text-slate-900">{locationModalItem.title}</div>
              <div className="text-[11px] text-slate-600">{locationModalItem.subtitle}</div>
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Chọn Phân khu bãi (Bãi Sơn Cảng):
                </label>
                <select
                  value={selectedZoneCode}
                  onChange={(e) => setSelectedZoneCode(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0A9444]"
                >
                  {yardZones.map(z => (
                    <option key={z.code} value={z.code}>
                      {z.name} ({z.capacity} chỗ {z.has_power_outlets ? '— 30 Trụ điện' : ''})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã ô đỗ / Số trụ điện (Tùy chọn):
                </label>
                <input
                  type="text"
                  value={inputSlotCode}
                  onChange={(e) => setInputSlotCode(e.target.value.toUpperCase())}
                  placeholder={selectedZoneCode === 'KHU_A_REEFER' ? 'VD: R01, R02... (Trụ 1-30)' : 'VD: B-01, C-12...'}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#0A9444] bg-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  {selectedZoneCode === 'KHU_A_REEFER' 
                    ? 'Khu A có 30 trụ điện 380V đánh số từ R01 đến R30.'
                    : 'Nhập vị trí hàng / ô đỗ theo quy hoạch bãi để tài xế và an ninh dễ tìm kiếm.'}
                </p>
              </div>
            </div>

            <div className="pt-1 flex space-x-2">
              <button
                type="button"
                onClick={() => setLocationModalItem(null)}
                className="flex-1 py-1.5 px-3 rounded text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveLocation}
                disabled={isUpdatingLocation}
                className="flex-1 py-1.5 px-3 rounded text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              >
                {isUpdatingLocation ? 'Đang lưu...' : 'Lưu vị trí'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TIẾP NHẬN CONTAINER LẺ (HẠ BÃI / THUÊ NGOÀI) */}
      {isSingleContModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-lg w-full p-4.5 border border-slate-300 shadow-xl space-y-3.5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-[#223873] uppercase tracking-wider">Nghiệp vụ Tiếp nhận Bãi</span>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <ContainerIcon className="w-4 h-4 text-[#0A9444]" />
                  <span>Tiếp nhận Container lẻ (Hạ bãi)</span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSingleContModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {singleContError && (
              <div className="p-2 rounded bg-rose-50 text-rose-700 text-xs font-semibold flex items-center space-x-1.5 border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{singleContError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSingleContainer} className="space-y-3">
              <div className="p-2.5 bg-blue-50/60 rounded border border-blue-200 text-xs text-blue-900 leading-relaxed">
                Áp dụng khi bãi tiếp nhận container riêng lẻ do <strong>cẩu tự hành hạ bãi</strong>, <strong>thuê container ngoài</strong> hoặc <strong>xe nâng nội bộ chuyển vào</strong> không theo luồng xe vận tải qua cổng.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số hiệu Container (4 chữ + 7 số) *
                </label>
                <input
                  type="text"
                  required
                  value={singleContNo}
                  onChange={(e) => setSingleContNo(e.target.value.toUpperCase())}
                  placeholder="VD: TCLU1234567, RF40..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold uppercase text-blue-900 bg-white focus:outline-none focus:border-[#0A9444]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kích cỡ cont:</label>
                  <select
                    value={singleContSize}
                    onChange={(e) => setSingleContSize(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0A9444]"
                  >
                    <option value="40">40ft (Tiêu chuẩn)</option>
                    <option value="20">20ft (Ngắn)</option>
                    <option value="45">45ft (Dài)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại vỏ cont:</label>
                  <select
                    value={singleContType}
                    onChange={(e) => setSingleContType(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0A9444]"
                  >
                    <option value="RF">RF — Container Lạnh</option>
                    <option value="DC">DC — Container Khô</option>
                    <option value="OT">OT — Container Hở Mái</option>
                    <option value="FR">FR — Container Mặt Bằng</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tình trạng Hàng ban đầu:</label>
                  <select
                    value={singleCargoStatus}
                    onChange={(e) => setSingleCargoStatus(e.target.value as CargoStatus)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0A9444]"
                  >
                    <option value="CHUA_XAC_DINH">Chưa xác định</option>
                    <option value="HANG">Có HÀNG</option>
                    <option value="RONG">Vỏ RỖNG</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Phân khu hạ bãi:</label>
                  <select
                    value={singleYardZone}
                    onChange={(e) => setSingleYardZone(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-bold text-slate-800 bg-white focus:outline-none focus:border-[#0A9444]"
                  >
                    {yardZones.map(z => (
                      <option key={z.code} value={z.code}>{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ô đỗ / Trụ điện (Tùy chọn):</label>
                  <input
                    type="text"
                    value={singleSlotCode}
                    onChange={(e) => setSingleSlotCode(e.target.value.toUpperCase())}
                    placeholder="VD: R05, A-02..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#0A9444] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nguồn gốc / Phương tiện hạ bãi:</label>
                  <input
                    type="text"
                    value={singleSource}
                    onChange={(e) => setSingleSource(e.target.value)}
                    placeholder="VD: Cẩu 14C-8888, Cont thuê ngoài..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-medium focus:outline-none focus:border-[#0A9444] bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Thời gian vào bãi (hh:mm dd/MM/yyyy — Hỗ trợ Backdate):</span>
                  </label>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setQuickSingleInboundHoursAgo(0)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      Hiện tại
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickSingleInboundHoursAgo(2)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      -2h
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickSingleInboundHoursAgo(6)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      -6h
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickSingleInboundHoursAgo(24)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      -1 ngày
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={singleInboundAt}
                  onChange={(e) => setSingleInboundAt(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs font-mono font-medium bg-white focus:outline-none focus:border-[#0A9444]"
                />
                {singleInboundAt && (
                  <p className="text-[11px] font-mono text-emerald-700 mt-1 font-semibold flex items-center gap-1">
                    <span>⏱️ Định dạng đã chọn:</span>
                    <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-300">
                      {formatDateTime(singleInboundAt)}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú tiếp nhận:</label>
                <input
                  type="text"
                  value={singleNotes}
                  onChange={(e) => setSingleNotes(e.target.value)}
                  placeholder="Ghi chú về đơn vị thuê cont hoặc biên bản hạ bãi..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded text-xs focus:outline-none focus:border-[#0A9444] bg-white"
                />
              </div>

              <div className="pt-1 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSingleContModalOpen(false)}
                  className="flex-1 py-1.5 px-3 rounded text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSingleCont}
                  className="flex-1 py-1.5 px-3 rounded text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {isSubmittingSingleCont ? 'Đang tiếp nhận...' : 'Xác nhận Tiếp nhận Cont'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HIỆU CHỈNH LƯỢT XE (SEC_LEAD / SYS_ADMIN) */}
      {adjustingVehicle && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-lg w-full p-4.5 border border-slate-300 shadow-xl space-y-3.5 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200">
                    Lead An ninh & Admin
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Hiệu chỉnh Ca trực</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5 mt-0.5">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                  <span>Hiệu chỉnh Lượt xe: <span className="font-mono text-indigo-700">{adjustingVehicle.license_plate}</span></span>
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingVehicle(null)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {adjError && (
              <div className="p-2 rounded bg-rose-50 text-rose-700 text-xs font-semibold flex items-center space-x-1.5 border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{adjError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAdjustment} className="space-y-3 text-xs">
              {/* Thẻ tóm tắt thông tin hiện tại */}
              <div className="bg-slate-50 p-2.5 rounded border border-slate-300 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Mã lượt xe: <strong className="font-mono text-slate-800">{adjustingVehicle.id.slice(0, 13)}...</strong></span>
                  <span className="text-slate-500">Mã vé: <strong className="font-mono text-slate-800">{adjustingVehicle.ticket_code || 'Chưa cấp'}</strong></span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-500">Loại xe ban đầu: <strong>{getVehicleTypeName(adjustingVehicle.vehicle_type_name || adjustingVehicle.vehicle_type)}</strong></span>
                  <span className="text-slate-500">Tiền vé hiện tại: <strong className="text-emerald-700 font-bold font-mono">{adjustingVehicle.ticket_amount ? adjustingVehicle.ticket_amount.toLocaleString('vi-VN') + ' đ' : '0 đ'}</strong></span>
                </div>
              </div>

              {/* Sửa Ngày giờ vào cổng (Backdate) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700 flex items-center space-x-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Thời gian xe vào cổng (hh:mm dd/MM/yyyy — Backdate nếu quên nhập):</span>
                  </label>
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setQuickAdjEntryHoursAgo(0)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      Hiện tại
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickAdjEntryHoursAgo(2)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      -2h
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickAdjEntryHoursAgo(6)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      -6h
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickAdjEntryHoursAgo(24)}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      -1 ngày
                    </button>
                  </div>
                </div>
                <input
                  type="datetime-local"
                  value={adjEntryAt}
                  onChange={(e) => setAdjEntryAt(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-medium bg-white focus:outline-none focus:border-indigo-500"
                />
                {adjEntryAt && (
                  <p className="text-[11px] font-mono text-indigo-700 mt-1 font-semibold flex items-center gap-1">
                    <span>⏱️ Định dạng đã chọn:</span>
                    <span className="bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-300">
                      {formatDateTime(adjEntryAt)}
                    </span>
                  </p>
                )}
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Đồng bộ tự động thời gian tiếp nhận bãi cho các container chở theo xe.
                </p>
              </div>

              {/* Sửa Loại xe & Tiền vé */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Sửa Loại phương tiện:
                  </label>
                  <select
                    value={adjVehicleType}
                    onChange={(e) => handleVehicleTypeChange(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500"
                  >
                    {VEHICLE_TYPES_OPTIONS.map(vt => (
                      <option key={vt.code} value={vt.code}>{vt.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tiền vé cổng (VNĐ):
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={adjTicketAmount}
                    onChange={(e) => setAdjTicketAmount(Number(e.target.value))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold text-[#0A9444] bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* CẢNH BÁO & LỰA CHỌN XỬ LÝ CONTAINER ĐI KÈM KHI ĐỔI SANG XE KHÔNG CÕNG CONT */}
              {(() => {
                const attachedConts = containers.filter(c => c.inbound_vehicle_visit_id === adjustingVehicle.id && c.status === 'IN_YARD');
                const isNewNonContType = adjVehicleType !== 'CONT_LANH';
                if (attachedConts.length === 0 || !isNewNonContType) return null;

                return (
                  <div className="p-3 rounded bg-amber-50 border border-amber-300 space-y-2 animate-in fade-in">
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-amber-900 font-bold text-xs uppercase tracking-wide">
                          XỬ LÝ CONTAINER ĐI KÈM KHI ĐỔI SANG XE KHÔNG CHỞ CONT
                        </strong>
                        <p className="text-[11px] text-amber-800 leading-relaxed mt-0.5">
                          Xe này ban đầu gắn với container: <b className="font-mono text-slate-900">{attachedConts.map(c => c.container_no_current).join(', ')}</b>.
                          Bạn đang đổi sang loại xe không chở container. Vui lòng chọn cách xử lý container này:
                        </p>
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                        adjContainerAction === 'CANCEL'
                          ? 'bg-rose-50 border-rose-300 text-rose-950 font-semibold shadow-2xs'
                          : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-50/50'
                      }`}>
                        <input
                          type="radio"
                          name="containerAction"
                          value="CANCEL"
                          checked={adjContainerAction === 'CANCEL'}
                          onChange={() => setAdjContainerAction('CANCEL')}
                          className="mt-0.5 text-rose-600 focus:ring-rose-500 cursor-pointer"
                        />
                        <div className="flex-1 text-xs">
                          <span className="font-bold text-rose-700">1. HỦY BỎ LƯỢT CONTAINER (CANCELLED)</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Áp dụng khi <strong>nhập nhầm</strong> lúc vào cổng; thực tế xe này không chở container nào và không có cont này trong bãi.
                          </p>
                        </div>
                      </label>

                      <label className={`flex items-start gap-2 p-2 rounded border cursor-pointer transition-colors ${
                        adjContainerAction === 'DETACH'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-semibold shadow-2xs'
                          : 'bg-white border-amber-200 text-slate-700 hover:bg-amber-50/50'
                      }`}>
                        <input
                          type="radio"
                          name="containerAction"
                          value="DETACH"
                          checked={adjContainerAction === 'DETACH'}
                          onChange={() => setAdjContainerAction('DETACH')}
                          className="mt-0.5 text-[#0A9444] focus:ring-emerald-500 cursor-pointer"
                        />
                        <div className="flex-1 text-xs">
                          <span className="font-bold text-[#0A9444]">2. TÁCH THÀNH CONTAINER TỒN BÃI ĐỘC LẬP (HẠ BÃI)</span>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Áp dụng khi container <strong>đã hạ bãi lưu kho độc lập</strong> trong bãi, gỡ liên kết khỏi xe này để tiếp tục lưu bãi.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>
                );
              })()}

              {/* Trạng thái Lượt xe & Trạng thái thanh toán vé */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Trạng thái Lượt xe:
                  </label>
                  <select
                    value={adjStatus}
                    onChange={(e) => setAdjStatus(e.target.value as VehicleVisitStatus)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-bold text-slate-800 bg-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="IN_YARD">Đang trong bãi (IN_YARD)</option>
                    <option value="EXITED">Đã xuất bãi (EXITED)</option>
                    <option value="CANCELLED">Hủy lượt xe (CANCELLED)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Hình thức / Trạng thái thu vé:
                  </label>
                  <select
                    value={adjTicketPaymentStatus}
                    onChange={(e) => setAdjTicketPaymentStatus(e.target.value as TicketPaymentStatus)}
                    className={`w-full px-3 py-1.5 border rounded font-bold bg-white focus:outline-none focus:border-indigo-500 ${
                      adjTicketPaymentStatus === 'CANCELLED'
                        ? 'border-rose-400 text-rose-700 bg-rose-50/50'
                        : 'border-slate-300 text-slate-800'
                    }`}
                  >
                    <option value="PAID">Đã thu (PAID)</option>
                    <option value="UNPAID">Chưa thu (UNPAID)</option>
                    <option value="EXEMPT">Miễn phí (EXEMPT)</option>
                    <option value="CANCELLED">Hủy vé — Hoàn lại tiền (CANCELLED)</option>
                  </select>
                </div>
              </div>

              {/* Khối cảnh báo đặc biệt khi chọn Hủy vé / Hoàn tiền */}
              {adjTicketPaymentStatus === 'CANCELLED' && (
                <div className="p-2.5 rounded bg-rose-50 border border-rose-300 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-rose-800 font-bold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
                    <span>Nghiệp vụ Hủy vé cổng & Hoàn tiền tài xế</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Hệ thống sẽ cập nhật trạng thái khoản cước vé sang <strong>CANCELLED</strong> và trừ doanh thu ca trực tương ứng.
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold text-rose-900 mb-1">
                      Lý do hủy vé & hoàn tiền (Bắt buộc) *
                    </label>
                    <input
                      type="text"
                      required
                      value={adjRefundReason}
                      onChange={(e) => setAdjRefundReason(e.target.value)}
                      placeholder="VD: Xe nhầm cổng/quay đầu, đã trả lại 250k tiền mặt cho lái xe..."
                      className="w-full px-3 py-1.5 border border-rose-300 rounded text-xs bg-white text-rose-900 font-medium focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              )}

              {/* Giờ xuất bãi (nếu là EXITED hoặc muốn bổ sung) */}
              {adjStatus === 'EXITED' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Thời gian xe xuất bãi (hh:mm dd/MM/yyyy):</label>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        setAdjExitAt(new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
                      }}
                      className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      Giờ hiện tại
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={adjExitAt}
                    onChange={(e) => setAdjExitAt(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-medium bg-white focus:outline-none focus:border-indigo-500"
                  />
                  {adjExitAt && (
                    <p className="text-[11px] font-mono text-indigo-700 mt-1 font-semibold flex items-center gap-1">
                      <span>⏱️ Định dạng đã chọn:</span>
                      <span className="bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-300">
                        {formatDateTime(adjExitAt)}
                      </span>
                    </p>
                  )}
                </div>
              )}

              {/* Sửa thông tin tài xế nếu ghi sai */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ tên tài xế:</label>
                  <input
                    type="text"
                    value={adjDriverName}
                    onChange={(e) => setAdjDriverName(e.target.value)}
                    placeholder="VD: Nguyễn Văn A..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại:</label>
                  <input
                    type="text"
                    value={adjDriverPhone}
                    onChange={(e) => setAdjDriverPhone(e.target.value)}
                    placeholder="VD: 0912..."
                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:outline-none focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              {/* Lý do hiệu chỉnh (BẮT BUỘC) */}
              <div>
                <label className="block font-bold text-slate-900 mb-1 flex items-center justify-between">
                  <span>Lý do hiệu chỉnh ca trực (Bắt buộc tối thiểu 5 ký tự) *</span>
                  <span className="text-[10px] font-normal text-slate-400">Ghi vết kiểm toán</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="VD: Nhập bù giờ vào ca đêm do sự cố mạng; Chỉnh lại loại xe đúng thực tế đối soát ca..."
                  className="w-full px-3 py-1.5 border border-indigo-200 rounded text-xs bg-indigo-50/20 text-slate-900 font-medium focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="pt-1 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setAdjustingVehicle(null)}
                  className="flex-1 py-1.5 px-3 rounded font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdj}
                  className="flex-1 py-1.5 px-3 rounded font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {isSubmittingAdj ? 'Đang lưu...' : 'Xác nhận Hiệu chỉnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA PHÂN KHU BÃI (YARD ZONE CRUD) */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-lg max-w-md w-full p-4.5 border border-slate-300 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div>
                <span className="text-[10px] font-bold text-[#223873] uppercase tracking-wider">Cấu hình Quy hoạch Bến Bãi</span>
                <h3 className="text-sm font-bold text-slate-900">
                  {editingZoneCode ? `Sửa Phân khu: ${editingZoneCode}` : 'Thêm Phân khu bãi mới'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsZoneModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {zoneError && (
              <div className="p-2 rounded bg-rose-50 text-rose-700 text-xs font-semibold flex items-center space-x-1.5 border border-rose-200">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{zoneError}</span>
              </div>
            )}

            <form onSubmit={handleSaveZone} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mã phân khu (Viết hoa không dấu, VD: KHU_E_STORAGE) *
                </label>
                <input
                  type="text"
                  required
                  disabled={!!editingZoneCode}
                  value={zoneFormCode}
                  onChange={(e) => setZoneFormCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                  placeholder="VD: KHU_E_REEFER"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold uppercase bg-white focus:outline-none focus:border-[#0A9444] disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Tên phân khu chức năng *
                </label>
                <input
                  type="text"
                  required
                  value={zoneFormName}
                  onChange={(e) => setZoneFormName(e.target.value)}
                  placeholder="VD: Khu E — Bãi Container Lạnh Mở Rộng"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium bg-white focus:outline-none focus:border-[#0A9444]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Mô tả chức năng & quy hoạch:
                </label>
                <textarea
                  rows={2}
                  value={zoneFormDesc}
                  onChange={(e) => setZoneFormDesc(e.target.value)}
                  placeholder="VD: Khu vực bố trí thêm 20 trụ cắm điện cho cont lạnh hoa quả..."
                  className="w-full px-3 py-1.5 border border-slate-300 rounded font-medium bg-white focus:outline-none focus:border-[#0A9444] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sức chứa tối đa (xe/cont):</label>
                  <input
                    type="number"
                    min="1"
                    value={zoneFormCapacity}
                    onChange={(e) => setZoneFormCapacity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded font-mono font-bold bg-white focus:outline-none focus:border-[#0A9444]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Màu nhãn phân khu:</label>
                  <select
                    value={zoneFormBadge}
                    onChange={(e) => setZoneFormBadge(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white font-medium focus:outline-none focus:border-[#0A9444]"
                  >
                    <option value="bg-blue-100 text-blue-800 border-blue-300">Xanh dương (Blue)</option>
                    <option value="bg-amber-100 text-amber-800 border-amber-300">Vàng hổ phách (Amber)</option>
                    <option value="bg-emerald-100 text-emerald-800 border-emerald-300">Xanh lá (Emerald)</option>
                    <option value="bg-purple-100 text-purple-800 border-purple-300">Tím (Purple)</option>
                    <option value="bg-rose-100 text-rose-800 border-rose-300">Đỏ hồng (Rose)</option>
                    <option value="bg-slate-100 text-slate-800 border-slate-300">Xám (Slate)</option>
                  </select>
                </div>
              </div>

              <div className="p-2.5 rounded bg-amber-50 border border-amber-300 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="chkHasPower"
                  checked={zoneFormHasPower}
                  onChange={(e) => setZoneFormHasPower(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer"
                />
                <label htmlFor="chkHasPower" className="font-bold text-amber-900 cursor-pointer">
                  Khu vực có trang bị giắc cắm / Trụ điện công nghiệp 380V (Reefer)
                </label>
              </div>

              <div className="pt-1 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsZoneModalOpen(false)}
                  className="flex-1 py-1.5 px-3 rounded font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingZone}
                  className="flex-1 py-1.5 px-3 rounded font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  {isSubmittingZone ? 'Đang lưu...' : (editingZoneCode ? 'Lưu thay đổi' : 'Tạo phân khu')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
