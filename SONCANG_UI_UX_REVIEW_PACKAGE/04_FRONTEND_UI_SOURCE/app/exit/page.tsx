'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ContainerVisit, VehicleVisit } from '@/types/domain.types';
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
  Check
} from 'lucide-react';

export default function ExitClearancePage() {
  const { user, role, yardId, can, repository } = useAuth();

  const isCCKBRole = role === 'PORT_STAFF' || role === 'PORT_LEAD' || role === 'SYS_ADMIN';
  const isSecurityRole = role === 'SEC_STAFF' || role === 'SEC_LEAD' || role === 'SYS_ADMIN';
  const canGateExit = can('gate.exit') || isSecurityRole;
  const canCollectStorage = can('storage.payment.collect') || isSecurityRole;

  // Active Tab: CCKB Clearance vs An ninh Cổng ra
  const [activeTab, setActiveTab] = useState<'CLEARANCE' | 'GATE_EXIT'>(
    isCCKBRole && !isSecurityRole ? 'CLEARANCE' : 'GATE_EXIT'
  );

  // Sub-tab ở An ninh Cổng ra: Container xuất bãi vs Xe rời bãi không mang cont
  const [gateExitMode, setGateExitMode] = useState<'CONTAINER' | 'VEHICLE_ONLY'>('CONTAINER');

  const [containers, setContainers] = useState<ContainerVisit[]>([]);
  const [vehicles, setVehicles] = useState<VehicleVisit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal CCKB Duyệt Clearance
  const [showClearanceModal, setShowClearanceModal] = useState<boolean>(false);
  const [selectedCont, setSelectedCont] = useState<ContainerVisit | null>(null);
  const [allowDebt, setAllowDebt] = useState<boolean>(false);
  const [clearanceNotes, setClearanceNotes] = useState<string>('');
  const [clearanceError, setClearanceError] = useState<string>('');

  // Modal An ninh Cổng ra (Container)
  const [showGateExitModal, setShowGateExitModal] = useState<boolean>(false);
  const [exitOutboundPlate, setExitOutboundPlate] = useState<string>('');
  const [exitNotes, setExitNotes] = useState<string>('');
  const [exitError, setExitError] = useState<string>('');
  const [paidAtGate, setPaidAtGate] = useState<boolean>(true);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');
  const [receiptCode, setReceiptCode] = useState<string>('');
  const [calculatedStorage, setCalculatedStorage] = useState<{
    totalNights: number;
    chargedNights: number;
    fee: number;
  } | null>(null);

  // Modal An ninh Cổng ra (Xe riêng không cõng cont - sc_confirm_vehicle_only_exit)
  const [showVehicleExitModal, setShowVehicleExitModal] = useState<boolean>(false);
  const [selectedVehicleForExit, setSelectedVehicleForExit] = useState<VehicleVisit | null>(null);
  const [vehicleExitNotes, setVehicleExitNotes] = useState<string>('');
  const [vehicleExitError, setVehicleExitError] = useState<string>('');
  const [isExitingVehicle, setIsExitingVehicle] = useState<boolean>(false);

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // Tải dữ liệu ban đầu
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      repository.getContainers(yardId),
      repository.getVehicles(yardId),
    ])
      .then(([containerList, vehicleList]) => {
        if (isMounted) {
          setContainers(containerList);
          setVehicles(vehicleList);
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
    ])
      .then(([containerList, vehicleList]) => {
        setContainers(containerList);
        setVehicles(vehicleList);
      })
      .catch((err) => {
        console.error('Lỗi tải dữ liệu xuất bãi:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
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
      setActionSuccessMsg(`Đã duyệt điều kiện xuất bãi (Clearance) thành công cho container ${selectedCont.container_no_current}`);
      handleManualRefresh();
    }
  };

  // Mở modal An ninh Cổng ra Container
  const handleOpenGateExit = async (cont: ContainerVisit) => {
    setSelectedCont(cont);
    setExitError('');
    setExitOutboundPlate(cont.inbound_license_plate || '');
    setExitNotes('');

    // Tính toán phí lưu bãi dự kiến:
    // Mốc 22:00-06:00, miễn đêm đầu, 100k/đêm qua repository.calculateStorageFee
    try {
      const calc = await repository.calculateStorageFee(cont.inbound_at);
      setCalculatedStorage(calc);
      setPaidAtGate(calc.fee > 0);
      setPaymentMethod('CASH');
      setReceiptCode('');
    } catch (err) {
      console.error('Lỗi tính phí lưu bãi:', err);
      setCalculatedStorage({ totalNights: 0, chargedNights: 0, fee: 0 });
      setPaidAtGate(false);
    }

    setShowGateExitModal(true);
  };

  const handleConfirmGateExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCont) return;

    const fee = calculatedStorage?.fee || 0;
    const isDebtAllowed = selectedCont.clearance_status === 'CLEARED_WITH_DEBT';

    // Rào chắn bảo vệ quy trình thu phí:
    if (fee > 0) {
      if (!paidAtGate && !isDebtAllowed) {
        setExitError('Container phát sinh phí lưu bãi chưa thu. Container chưa được phê duyệt bảo lãnh công nợ, bắt buộc phải thu phí tại cổng trước khi xuất bãi!');
        return;
      }

      if (paidAtGate) {
        if (!canCollectStorage) {
          setExitError('Tài khoản không có quyền thu phí lưu bãi. Vui lòng chuyển nhân sự có thẩm quyền thu phí.');
          return;
        }
        if (paymentMethod === 'BANK_TRANSFER' && !receiptCode.trim()) {
          setExitError('Hình thức chuyển khoản bắt buộc phải nhập mã biên lai / tham chiếu giao dịch.');
          return;
        }
      }
    }

    // Tìm lượt xe nếu có biển số tương ứng trong bãi
    const matchingVeh = vehicles.find(v => v.license_plate === exitOutboundPlate && v.status === 'IN_YARD');

    const res = await repository.confirmPhysicalExit({
      containerId: selectedCont.id,
      outboundVehicleId: matchingVeh?.id,
      notes: exitNotes,
      operatorId: user?.id || 'sec-gate',
      paidAtGate: fee > 0 ? paidAtGate : false,
      paymentMethod: fee > 0 && paidAtGate ? paymentMethod : undefined,
      receiptCode: fee > 0 && paidAtGate ? (receiptCode.trim() || undefined) : undefined,
    });

    if (res.error) {
      setExitError(res.error);
    } else {
      setShowGateExitModal(false);
      const paidInfo = fee > 0 && paidAtGate 
        ? ` | Đã thu tại cổng: ${fee.toLocaleString()}đ (${paymentMethod === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}${receiptCode ? ` - BL: ${receiptCode}` : ''})` 
        : (fee > 0 ? ` | Xuất bãi ghi nợ: ${fee.toLocaleString()}đ` : '');
      setActionSuccessMsg(`Xác nhận xuất bãi thành công cho container ${selectedCont.container_no_current}. Phí lưu bãi chốt: ${res.storageFee.toLocaleString()}đ (${res.chargedNights} đêm chịu phí)${paidInfo}`);
      handleManualRefresh();
    }
  };

  // Mở modal An ninh Xe ra riêng không cont
  const handleOpenVehicleExit = (veh: VehicleVisit) => {
    setSelectedVehicleForExit(veh);
    setVehicleExitNotes('');
    setVehicleExitError('');
    setShowVehicleExitModal(true);
  };

  const handleConfirmVehicleExit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicleForExit) return;

    setIsExitingVehicle(true);
    setVehicleExitError('');

    const res = await repository.confirmVehicleOnlyExit({
      vehicleId: selectedVehicleForExit.id,
      notes: vehicleExitNotes,
      operatorId: user?.id || 'sec-gate',
    });

    setIsExitingVehicle(false);

    if (res.error) {
      setVehicleExitError(res.error);
    } else {
      setShowVehicleExitModal(false);
      setActionSuccessMsg(`Đã xác nhận xe ${selectedVehicleForExit.license_plate || selectedVehicleForExit.vehicle_type} rời bãi an toàn qua cổng (không cõng container).`);
      handleManualRefresh();
    }
  };

  // Lọc danh sách container IN_YARD
  const inYardContainers = containers.filter(c => c.status === 'IN_YARD');
  const filteredContainers = inYardContainers.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      c.container_no_current.toLowerCase().includes(q) ||
      (c.inbound_license_plate && c.inbound_license_plate.toLowerCase().includes(q))
    );
  });

  // Lọc danh sách xe IN_YARD
  const inYardVehicles = vehicles.filter(v => v.status === 'IN_YARD');
  const filteredVehicles = inYardVehicles.filter((v) => {
    const q = searchQuery.toLowerCase();
    return (
      (v.license_plate && v.license_plate.toLowerCase().includes(q)) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(q)) ||
      (v.ticket_code && v.ticket_code.toLowerCase().includes(q)) ||
      (v.vehicle_type && v.vehicle_type.toLowerCase().includes(q))
    );
  });

  const clearedCount = inYardContainers.filter(c => c.clearance_status === 'CLEARED' || c.clearance_status === 'CLEARED_WITH_DEBT').length;
  const pendingCount = inYardContainers.filter(c => !c.clearance_status || c.clearance_status === 'PENDING').length;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#223873] flex items-center gap-2">
            <LogOut className="w-7 h-7 text-[#0A9444]" />
            Cổng ra & Kiểm soát Xuất bãi Sơn Cảng
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quy trình kiểm soát xuất bãi 2 bước: CCKB duyệt điều kiện tài chính & An ninh xác nhận xe rời bãi tại cổng
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Thông báo thao tác */}
      {actionSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button onClick={() => setActionSuccessMsg('')} className="text-emerald-700 font-bold hover:underline">
            Đóng
          </button>
        </div>
      )}

      {/* Tabs Chuyển đổi nghiệp vụ */}
      <div className="flex items-center gap-3 border-b pb-2">
        <button
          onClick={() => setActiveTab('CLEARANCE')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'CLEARANCE'
              ? 'bg-[#223873] text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          1. CCKB Kiểm soát Clearance ({pendingCount} chờ duyệt)
        </button>

        <button
          onClick={() => setActiveTab('GATE_EXIT')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${
            activeTab === 'GATE_EXIT'
              ? 'bg-[#0A9444] text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          2. An ninh Cổng ra vật lý ({clearedCount} cont đã duyệt / {inYardVehicles.length} xe trong bãi)
        </button>
      </div>

      {/* KPI Tóm tắt */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Container trong bãi</p>
            <p className="text-2xl font-bold text-[#223873] mt-1">{inYardContainers.length} container</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl">
            <Truck className="w-6 h-6 text-[#223873]" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase">Đã duyệt Clearance</p>
            <p className="text-2xl font-bold text-[#0A9444] mt-1">{clearedCount} container</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <CheckCircle2 className="w-6 h-6 text-[#0A9444]" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-amber-600 uppercase">Chờ CCKB duyệt</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingCount} container</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <Clock className="w-6 h-6 text-amber-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-indigo-600 uppercase">Xe đang trong bãi</p>
            <p className="text-2xl font-bold text-indigo-700 mt-1">{inYardVehicles.length} lượt xe</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Truck className="w-6 h-6 text-indigo-600" />
          </div>
        </div>
      </div>

      {/* Thanh công cụ tìm kiếm và Sub-mode cho An ninh */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={activeTab === 'GATE_EXIT' && gateExitMode === 'VEHICLE_ONLY' ? "Tìm theo biển số xe, tài xế, mã vé..." : "Tìm theo số container hoặc biển số xe..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#223873]"
          />
        </div>

        {/* Chuyển đổi luồng tại Tab Cổng ra của An ninh */}
        {activeTab === 'GATE_EXIT' && (
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setGateExitMode('CONTAINER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                gateExitMode === 'CONTAINER'
                  ? 'bg-white text-[#0A9444] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Container xuất bãi ({clearedCount})
            </button>
            <button
              type="button"
              onClick={() => setGateExitMode('VEHICLE_ONLY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                gateExitMode === 'VEHICLE_ONLY'
                  ? 'bg-white text-[#223873] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Xe rời bãi không cont ({inYardVehicles.length})
            </button>
          </div>
        )}
      </div>

      {/* NỘI DUNG 1: BẢNG DANH SÁCH CONTAINER (Dùng cho CCKB hoặc An ninh chọn Container) */}
      {(activeTab === 'CLEARANCE' || gateExitMode === 'CONTAINER') && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#223873] uppercase tracking-wider flex items-center gap-2">
              {activeTab === 'CLEARANCE' ? (
                <>
                  <FileCheck className="w-4 h-4 text-[#223873]" />
                  CCKB: Danh sách duyệt điều kiện xuất bãi
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-[#0A9444]" />
                  An ninh: Danh sách container sẵn sàng qua cổng ra
                </>
              )}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Số Container</th>
                  <th className="px-4 py-3">Loại / Hàng</th>
                  <th className="px-4 py-3">Thời gian vào bãi</th>
                  <th className="px-4 py-3">Trạng thái Clearance</th>
                  <th className="px-4 py-3">Phí lưu bãi tạm tính</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredContainers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Không có container nào đang ở trong bãi phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredContainers.map((c) => {
                    const inDate = new Date(c.inbound_at);
                    const now = new Date();
                    const daysDiff = Math.max(0, Math.floor((now.getTime() - inDate.getTime()) / (1000 * 3600 * 24)));
                    const chargedNights = Math.max(0, daysDiff - 1);
                    const estFee = chargedNights * 100000;
                    const isCleared = c.clearance_status === 'CLEARED' || c.clearance_status === 'CLEARED_WITH_DEBT';

                    return (
                      <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-[#223873]">{c.container_no_current}</div>
                          {c.inbound_license_plate && (
                            <div className="text-xs text-gray-500">Xe vào: {c.inbound_license_plate}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold mr-1">
                            {c.container_type || 'RF'}
                          </span>
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            c.cargo_status === 'HANG' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {c.cargo_status === 'HANG' ? 'HÀNG' : c.cargo_status === 'RONG' ? 'RỖNG' : 'CHƯA RÕ'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {inDate.toLocaleTimeString()} {inDate.toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {c.clearance_status === 'CLEARED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-[#0A9444] border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đã duyệt (Đủ ĐK)
                            </span>
                          )}
                          {c.clearance_status === 'CLEARED_WITH_DEBT' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200" title={c.clearance_notes || ''}>
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Duyệt công nợ
                            </span>
                          )}
                          {(!c.clearance_status || c.clearance_status === 'PENDING') && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
                              <Clock className="w-3.5 h-3.5 text-gray-400" /> Chờ CCKB duyệt
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="font-semibold text-gray-800">
                            {estFee === 0 ? '0 đ (Đêm đầu miễn)' : `${estFee.toLocaleString()} đ (${chargedNights} đêm)`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {activeTab === 'CLEARANCE' ? (
                            !isCleared ? (
                              isCCKBRole ? (
                                <button
                                  onClick={() => handleOpenClearance(c)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5b] rounded-lg shadow-sm transition-colors cursor-pointer"
                                >
                                  Duyệt Clearance
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Chờ CCKB</span>
                              )
                            ) : (
                              <span className="text-xs text-emerald-700 font-bold">Đã duyệt</span>
                            )
                          ) : (
                            // Tab An ninh Cổng ra vật lý Container
                            isCleared ? (
                              canGateExit ? (
                                <button
                                  onClick={() => handleOpenGateExit(c)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-lg shadow-sm transition-colors cursor-pointer"
                                >
                                  Xác nhận cont ra bãi
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Chờ An ninh</span>
                              )
                            ) : (
                              <button
                                disabled
                                title="Bắt buộc phải có CCKB duyệt Clearance trước khi An ninh cho container rời bãi!"
                                className="px-3 py-1.5 text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed font-medium inline-flex items-center gap-1"
                              >
                                <Lock className="w-3 h-3" /> Chưa duyệt clearance
                              </button>
                            )
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

      {/* NỘI DUNG 2: BẢNG DANH SÁCH XE RỜI BÃI KHÔNG CONT (An ninh Cổng ra) */}
      {activeTab === 'GATE_EXIT' && gateExitMode === 'VEHICLE_ONLY' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#223873] uppercase tracking-wider flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#223873]" />
              An ninh: Danh sách xe đang trong bãi (Xác nhận xuất bãi không cõng container)
            </h2>
            <span className="text-xs text-gray-500 italic">
              Áp dụng cho xe đầu kéo hạ bãi cont rồi ra, xe bơ, xe chở hàng... (sc_confirm_vehicle_only_exit)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Biển số xe / Mã vé</th>
                  <th className="px-4 py-3">Loại phương tiện</th>
                  <th className="px-4 py-3">Thời gian vào bãi</th>
                  <th className="px-4 py-3">Tài xế / SĐT</th>
                  <th className="px-4 py-3">Tình trạng vé cổng</th>
                  <th className="px-4 py-3">Tình trạng Container</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      Không có phương tiện nào đang ở trong bãi phù hợp với tìm kiếm.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((v) => {
                    const inDate = new Date(v.entry_at);
                    const attachedCont = containers.find(c => c.inbound_vehicle_visit_id === v.id && c.status === 'IN_YARD');
                    const isTicketPaid = v.ticket_payment_status === 'PAID' || v.ticket_payment_status === 'EXEMPT';

                    return (
                      <tr key={v.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-[#223873]">{v.license_plate || 'Không biển số'}</div>
                          {v.ticket_code && (
                            <div className="text-xs text-gray-500">Mã vé: {v.ticket_code}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold">
                            {v.vehicle_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {inDate.toLocaleTimeString()} {inDate.toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="font-medium text-gray-800">{v.driver_name || 'Chưa cập nhật'}</div>
                          <div className="text-gray-500">{v.driver_phone || ''}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {v.ticket_payment_status === 'PAID' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-[#0A9444] border border-emerald-200">
                              <Check className="w-3.5 h-3.5" /> Đã thu ({v.ticket_amount?.toLocaleString() || 0}đ)
                            </span>
                          )}
                          {v.ticket_payment_status === 'EXEMPT' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Check className="w-3.5 h-3.5" /> Miễn phí (0đ)
                            </span>
                          )}
                          {v.ticket_payment_status === 'UNPAID' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Chưa thu ({v.ticket_amount?.toLocaleString() || 0}đ)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {attachedCont ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-medium">
                              Cont: {attachedCont.container_no_current} (lưu bãi)
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Không cont</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isTicketPaid ? (
                            <button
                              disabled
                              title="Vé vào cổng chưa được thu tiền! Vui lòng thu tiền tại Cổng vào hoặc Thu ngân trước."
                              className="px-3 py-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg cursor-not-allowed font-medium inline-flex items-center gap-1"
                            >
                              <Lock className="w-3 h-3" /> Chưa thu vé cổng
                            </button>
                          ) : canGateExit ? (
                            <button
                              onClick={() => handleOpenVehicleExit(v)}
                              className="px-3 py-1.5 text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-lg shadow-sm transition-colors cursor-pointer"
                            >
                              Xác nhận xe rời bãi
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">Chờ An ninh</span>
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

      {/* MODAL CCKB DUYỆT CLEARANCE */}
      {showClearanceModal && selectedCont && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#223873] flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#223873]" />
                CCKB Duyệt điều kiện Xuất bãi
              </h3>
              <button onClick={() => setShowClearanceModal(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
            </div>

            {clearanceError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {clearanceError}
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded-xl space-y-1 text-xs">
              <p><span className="text-gray-500">Số container:</span> <span className="font-mono font-bold text-[#223873]">{selectedCont.container_no_current}</span></p>
              <p><span className="text-gray-500">Thời gian vào bãi:</span> <span className="font-semibold text-gray-800">{new Date(selectedCont.inbound_at).toLocaleString()}</span></p>
              <p><span className="text-gray-500">Loại cont:</span> <span className="font-semibold text-gray-800">{selectedCont.container_type || 'RF'}</span></p>
              <p><span className="text-gray-500">Trạng thái hàng:</span> <span className="font-semibold text-gray-800">{selectedCont.cargo_status}</span></p>
            </div>

            <form onSubmit={handleConfirmClearance} className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <input
                  type="checkbox"
                  id="debt"
                  checked={allowDebt}
                  onChange={(e) => setAllowDebt(e.target.checked)}
                  className="mt-0.5 rounded text-[#223873]"
                />
                <label htmlFor="debt" className="text-xs text-amber-900 leading-tight">
                  <span className="font-bold">Bảo lãnh công nợ:</span> Áp dụng khi chưa thu đủ phí nhưng có bảo lãnh hoặc quyết định của lãnh đạo. Bắt buộc nhập lý do bên dưới.
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ghi chú điều kiện xuất bãi {allowDebt ? '(Bắt buộc)' : '(Tùy chọn)'}
                </label>
                <textarea
                  value={clearanceNotes}
                  onChange={(e) => setClearanceNotes(e.target.value)}
                  placeholder={allowDebt ? "Nhập tên người bảo lãnh hoặc số văn bản..." : "Ghi chú điều kiện xuất..."}
                  rows={3}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearanceModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-[#223873] hover:bg-[#1a2c5b] rounded-lg font-bold shadow-sm"
                >
                  Xác nhận duyệt Clearance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AN NINH CỔNG RA (CONTAINER) */}
      {showGateExitModal && selectedCont && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#0A9444] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#0A9444]" />
                An ninh Xác nhận Container Rời Bãi
              </h3>
              <button onClick={() => setShowGateExitModal(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
            </div>

            {exitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {exitError}
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded-xl space-y-1 text-xs">
              <p><span className="text-gray-500">Số container:</span> <span className="font-mono font-bold text-[#223873]">{selectedCont.container_no_current}</span></p>
              <p><span className="text-gray-500">Điều kiện xuất bãi:</span> <span className="font-bold text-[#0A9444]">{selectedCont.clearance_status === 'CLEARED' ? 'Đủ điều kiện xuất' : selectedCont.clearance_status === 'CLEARED_WITH_DEBT' ? 'Duyệt xuất (Ghi nợ)' : 'Chờ duyệt xuất'}</span></p>
              {selectedCont.clearance_notes && (
                <p><span className="text-gray-500">Ghi chú CCKB:</span> <span className="italic text-gray-700">{selectedCont.clearance_notes}</span></p>
              )}
            </div>

            {calculatedStorage && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1 text-xs text-blue-900">
                <p className="font-bold flex items-center gap-1 text-[#223873]">
                  <Clock className="w-4 h-4" />
                  Chốt phí lưu bãi container (Mốc 22:00-06:00 V5):
                </p>
                <p>• Tổng thời gian lưu qua đêm: <span className="font-bold">{calculatedStorage.totalNights} đêm</span></p>
                <p>• Số đêm chịu phí: <span className="font-bold">{calculatedStorage.chargedNights} đêm</span> (Đêm đầu miễn phí)</p>
                <p className={`text-sm font-bold pt-1 ${calculatedStorage.fee > 0 ? 'text-amber-700' : 'text-[#0A9444]'}`}>
                  • Phí lưu bãi phát sinh: {calculatedStorage.fee.toLocaleString()} VND
                </p>
              </div>
            )}

            {/* Xử lý thu phí lưu bãi tại cổng nếu có phát sinh phí */}
            {calculatedStorage && calculatedStorage.fee > 0 && (
              <>
                {/* Trường hợp 1: Không có quyền thu phí VÀ không có ngoại lệ nợ -> CHẶN */}
                {!canCollectStorage && selectedCont.clearance_status !== 'CLEARED_WITH_DEBT' ? (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl space-y-1 text-xs text-rose-800">
                    <p className="font-bold flex items-center gap-1 text-rose-900">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      CHƯA ĐỦ ĐIỀU KIỆN RỜI BÃI: Cần hoàn tất thu phí lưu bãi
                    </p>
                    <p>
                      Container phát sinh phí lưu bãi <span className="font-bold">{calculatedStorage.fee.toLocaleString()} VND</span> nhưng tài khoản hiện tại không có quyền thu phí và container chưa có phê duyệt bảo lãnh công nợ.
                    </p>
                    <p className="text-[11px] text-rose-700">
                      Vui lòng chuyển nhân sự An ninh có thẩm quyền thu phí hoặc liên hệ CCKB duyệt bảo lãnh công nợ trước khi xuất bãi.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Trường hợp 2: Có ngoại lệ nợ -> Cho chọn thu ngay hoặc nợ */}
                    {selectedCont.clearance_status === 'CLEARED_WITH_DEBT' ? (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900">
                        <div className="flex items-center gap-1 font-bold text-amber-950">
                          <AlertTriangle className="w-4 h-4 text-amber-700" />
                          Bảo lãnh công nợ đã được phê duyệt:
                        </div>
                        <p className="text-amber-800 text-[11px]">
                          Container có văn bản bảo lãnh công nợ. Có thể thu phí ngay tại cổng hoặc cho phép xe rời bãi ghi nhận công nợ.
                        </p>
                        <div className="flex gap-4 pt-1">
                          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-xs">
                            <input
                              type="radio"
                              name="debt_choice"
                              checked={paidAtGate}
                              onChange={() => setPaidAtGate(true)}
                              className="text-[#0A9444]"
                            />
                            Thu phí ngay tại cổng
                          </label>
                          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-xs">
                            <input
                              type="radio"
                              name="debt_choice"
                              checked={!paidAtGate}
                              onChange={() => setPaidAtGate(false)}
                              className="text-amber-700"
                            />
                            Xuất bãi ghi nhận công nợ
                          </label>
                        </div>
                      </div>
                    ) : (
                      /* Trường hợp 3: Bắt buộc thu tại cổng */
                      <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl space-y-1 text-xs text-emerald-900">
                        <p className="font-bold flex items-center gap-1 text-emerald-950">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                          Thu phí lưu bãi tại cổng (Bắt buộc thanh toán)
                        </p>
                        <p className="text-emerald-800 text-[11px]">
                          Số tiền phải thu: <span className="font-bold text-emerald-950">{calculatedStorage.fee.toLocaleString()} VND</span>
                        </p>
                      </div>
                    )}

                    {/* Chi tiết hình thức thanh toán khi thu tại cổng */}
                    {paidAtGate && (
                      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2.5 text-xs">
                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Hình thức thanh toán:
                          </label>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="payment_method"
                                value="CASH"
                                checked={paymentMethod === 'CASH'}
                                onChange={() => setPaymentMethod('CASH')}
                                className="text-[#0A9444]"
                              />
                              <span className="font-medium text-gray-800">Tiền mặt</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name="payment_method"
                                value="BANK_TRANSFER"
                                checked={paymentMethod === 'BANK_TRANSFER'}
                                onChange={() => setPaymentMethod('BANK_TRANSFER')}
                                className="text-[#223873]"
                              />
                              <span className="font-medium text-gray-800">Chuyển khoản</span>
                            </label>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 mb-1">
                            Mã biên nhận / Tham chiếu {paymentMethod === 'BANK_TRANSFER' ? '(Bắt buộc)' : '(Tùy chọn)'}
                          </label>
                          <input
                            type="text"
                            value={receiptCode}
                            onChange={(e) => setReceiptCode(e.target.value)}
                            placeholder={paymentMethod === 'BANK_TRANSFER' ? "VD: FT261012999..." : "VD: BL-20261012-01"}
                            className="w-full p-2 border border-gray-300 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            <form onSubmit={handleConfirmGateExit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Biển số xe kéo container ra
                </label>
                <input
                  type="text"
                  value={exitOutboundPlate}
                  onChange={(e) => setExitOutboundPlate(e.target.value)}
                  placeholder="VD: 14C-123.45"
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ghi chú cổng ra
                </label>
                <textarea
                  value={exitNotes}
                  onChange={(e) => setExitNotes(e.target.value)}
                  placeholder="Tình trạng kẹp chì, xe kéo..."
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowGateExitModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Hủy
                </button>
                {(() => {
                  const isBlocked = Boolean(calculatedStorage && calculatedStorage.fee > 0 && !canCollectStorage && selectedCont.clearance_status !== 'CLEARED_WITH_DEBT');
                  return (
                    <button
                      type="submit"
                      disabled={isBlocked}
                      className={`px-4 py-2 text-sm text-white rounded-lg font-bold shadow-sm ${
                        isBlocked ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-[#0A9444] hover:bg-[#087C3C] cursor-pointer'
                      }`}
                    >
                      {isBlocked ? 'Bị chặn (Chưa thu phí)' : 'Xác nhận Cont rời bãi (FINAL)'}
                    </button>
                  );
                })()}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL AN NINH CỔNG RA (XE RIÊNG KHÔNG CONT - sc_confirm_vehicle_only_exit) */}
      {showVehicleExitModal && selectedVehicleForExit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#223873] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#223873]" />
                Xác nhận Xe Rời Bãi (Không Cont)
              </h3>
              <button 
                onClick={() => setShowVehicleExitModal(false)} 
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {vehicleExitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {vehicleExitError}
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded-xl space-y-1.5 text-xs">
              <p><span className="text-gray-500">Biển số xe:</span> <span className="font-mono font-bold text-[#223873]">{selectedVehicleForExit.license_plate || 'Không biển'}</span></p>
              <p><span className="text-gray-500">Loại phương tiện:</span> <span className="font-semibold text-gray-800">{selectedVehicleForExit.vehicle_type}</span></p>
              <p><span className="text-gray-500">Mã vé cổng:</span> <span className="font-semibold text-gray-800">{selectedVehicleForExit.ticket_code || 'Không có'}</span></p>
              <p><span className="text-gray-500">Thời gian vào:</span> <span className="text-gray-700">{new Date(selectedVehicleForExit.entry_at).toLocaleString()}</span></p>
              <p><span className="text-gray-500">Tài xế / SĐT:</span> <span className="text-gray-700">{selectedVehicleForExit.driver_name || 'N/A'} {selectedVehicleForExit.driver_phone ? `(${selectedVehicleForExit.driver_phone})` : ''}</span></p>
              <p><span className="text-gray-500">Tình trạng vé cổng:</span> <span className="font-bold text-[#0A9444]">{selectedVehicleForExit.ticket_payment_status === 'PAID' ? 'Đã thu' : selectedVehicleForExit.ticket_payment_status === 'EXEMPT' ? 'Miễn vé' : selectedVehicleForExit.ticket_payment_status === 'UNPAID' ? 'Chưa thu' : selectedVehicleForExit.ticket_payment_status}</span></p>
            </div>

            {/* Thông báo quy định xuất xe */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1 text-xs text-blue-900">
              <p className="font-bold text-[#223873]">Quy định xác nhận xe rời bãi:</p>
              <p>• Áp dụng khi xe rời bãi một mình (ví dụ: xe đầu kéo đã hạ bãi container, xe bơ, xe tải).</p>
              <p>• Không tính phí lưu bãi container (container lưu bãi sẽ chốt phí khi có xe nhận kéo ra sau).</p>
            </div>

            <form onSubmit={handleConfirmVehicleExit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ghi chú xác nhận xe ra (Tùy chọn)
                </label>
                <textarea
                  value={vehicleExitNotes}
                  onChange={(e) => setVehicleExitNotes(e.target.value)}
                  placeholder="Ghi chú cổng ra: tình trạng xe, xuất bãi một mình..."
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowVehicleExitModal(false)}
                  disabled={isExitingVehicle}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isExitingVehicle}
                  className="px-4 py-2 text-sm text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-lg font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isExitingVehicle ? 'Đang xác nhận...' : 'Xác nhận xe rời bãi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
