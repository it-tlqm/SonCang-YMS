'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { VehicleVisit, ContainerVisit, CargoStatus, CargoStatusUpdate, ContainerNumberChange } from '@/types/domain.types';
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
  AlertTriangle
} from 'lucide-react';

export default function YardMonitorPage() {
  const { role, yardId, can, repository, user, authMode } = useAuth();

  // Quyền xem lượt xe / lượt container theo RBAC V5
  const canReadYard = can('vehicle.visit.read') || can('container.visit.read');
  // Quyền cập nhật HÀNG / RỖNG theo RBAC V5 (chỉ DIS_STAFF, DIS_LEAD, SYS_ADMIN)
  const canUpdateCargo = can('container.cargo.update');
  // Quyền sửa số container (An ninh / CCKB trưởng)
  const canCorrectContainer = can('container.number.correct');

  const [activeTab, setActiveTab] = useState<'vehicles' | 'containers'>('containers');
  const [vehicles, setVehicles] = useState<VehicleVisit[]>([]);
  const [containers, setContainers] = useState<ContainerVisit[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCargo, setFilterCargo] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      repository.getVehicles(yardId),
      repository.getContainers(yardId),
    ])
      .then(([vList, cList]) => {
        if (isMounted) {
          setVehicles(vList.filter(v => v.status === 'IN_YARD'));
          setContainers(cList.filter(c => c.status === 'IN_YARD'));
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
    ])
      .then(([vList, cList]) => {
        setVehicles(vList.filter(v => v.status === 'IN_YARD'));
        setContainers(cList.filter(c => c.status === 'IN_YARD'));
      })
      .catch((err) => {
        console.error('Lỗi tải dữ liệu bãi:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Thống kê nhanh
  const totalVehicles = vehicles.length;
  const totalContainers = containers.length;
  const countHang = containers.filter(c => c.cargo_status === 'HANG').length;
  const countRong = containers.filter(c => c.cargo_status === 'RONG').length;
  const countChuaXD = containers.filter(c => c.cargo_status === 'CHUA_XAC_DINH').length;

  // Lọc dữ liệu
  const filteredVehicles = vehicles.filter(v => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      (v.license_plate && v.license_plate.toLowerCase().includes(q)) ||
      (v.driver_name && v.driver_name.toLowerCase().includes(q)) ||
      (v.ticket_code && v.ticket_code.toLowerCase().includes(q)) ||
      (v.vehicle_type_name && v.vehicle_type_name.toLowerCase().includes(q))
    );
  });

  const filteredContainers = containers.filter(c => {
    const q = searchQuery.toLowerCase().trim();
    const matchQuery = !q || (
      c.container_no_current.toLowerCase().includes(q) ||
      (c.inbound_license_plate && c.inbound_license_plate.toLowerCase().includes(q))
    );
    const matchCargo = filterCargo === 'ALL' || c.cargo_status === filterCargo;
    return matchQuery && matchCargo;
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
      setCorrectionError('Lý do sửa số bắt buộc nhập tối thiểu 3 ký tự theo quy định V5.');
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

  const renderCargoBadge = (status: CargoStatus) => {
    switch (status) {
      case 'HANG':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            HÀNG
          </span>
        );
      case 'RONG':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-300">
            RỖNG
          </span>
        );
      case 'CHUA_XAC_DINH':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            Chưa xác định
          </span>
        );
    }
  };

  if (!canReadYard) {
    return (
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 text-center max-w-lg mx-auto shadow-xs">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Không có quyền truy cập</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Tài khoản vai trò <strong>{role || 'Chưa phân quyền'}</strong> không được cấp quyền <code>vehicle.visit.read</code> hoặc <code>container.visit.read</code> theo RBAC V5.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. HEADER & THỐNG KÊ NHANH */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3E8EF] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#223873]">
              Bảng điều khiển Giám sát
            </span>
            <h1 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
              Phương tiện & Container đang trong bãi
            </h1>
          </div>
          <button
            type="button"
            onClick={handleReload}
            disabled={isLoading}
            className="self-start sm:self-auto flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Đang tải...' : 'Làm mới dữ liệu'}</span>
          </button>
        </div>

        {/* Thống kê dạng 5 Cards Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mt-4 pt-4 border-t border-slate-100">
          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500">Xe trong bãi</span>
            <div className="text-lg sm:text-xl font-black text-[#223873]">{totalVehicles}</div>
          </div>
          <div className="bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500">Container trong bãi</span>
            <div className="text-lg sm:text-xl font-black text-[#0A9444]">{totalContainers}</div>
          </div>
          <div className="bg-emerald-50/50 p-2.5 sm:p-3 rounded-xl border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-700">Cont có HÀNG</span>
            <div className="text-lg sm:text-xl font-black text-emerald-800">{countHang}</div>
          </div>
          <div className="bg-blue-50/50 p-2.5 sm:p-3 rounded-xl border border-blue-200">
            <span className="text-[11px] font-semibold text-blue-700">Cont RỖNG</span>
            <div className="text-lg sm:text-xl font-black text-blue-800">{countRong}</div>
          </div>
          <div className="bg-amber-50/50 p-2.5 sm:p-3 rounded-xl border border-amber-200 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-amber-700">Chưa xác định</span>
            <div className="text-lg sm:text-xl font-black text-amber-800">{countChuaXD}</div>
          </div>
        </div>
      </div>

      {/* 2. TABS & TÌM KIẾM BỘ LỌC */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#E3E8EF] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl max-w-sm">
            <button
              type="button"
              onClick={() => setActiveTab('containers')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'containers'
                  ? 'bg-white text-[#223873] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ContainerIcon className="w-3.5 h-3.5" />
              <span>Container ({totalContainers})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('vehicles')}
              className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
                activeTab === 'vehicles'
                  ? 'bg-white text-[#223873] shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Phương tiện ({totalVehicles})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'containers' ? 'Tìm số container, xe vào...' : 'Tìm biển số xe, tài xế...'}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A9444]"
              />
            </div>

            {activeTab === 'containers' && (
              <div className="flex items-center space-x-1 border border-slate-200 rounded-xl px-2 py-1.5 bg-white text-xs">
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
          </div>
        </div>
      </div>

      {/* 3. BẢNG CONTAINER */}
      {activeTab === 'containers' && (
        <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-xs overflow-hidden">
          {filteredContainers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold">
              Không tìm thấy container nào trong bãi phù hợp điều kiện lọc.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Số Container</th>
                    <th className="px-4 py-3">Kích cỡ / Loại</th>
                    <th className="px-4 py-3">Tình trạng Hàng</th>
                    <th className="px-4 py-3">Xe đưa vào</th>
                    <th className="px-4 py-3">Thời gian vào</th>
                    <th className="px-4 py-3 text-right">Tác vụ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredContainers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-black text-slate-900 text-sm">
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
                      <td className="px-4 py-3 text-slate-700">
                        {c.container_size}ft — {c.container_type}
                      </td>
                      <td className="px-4 py-3">
                        {renderCargoBadge(c.cargo_status)}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {c.inbound_license_plate || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {new Date(c.inbound_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {canCorrectContainer && (
                            <button
                              type="button"
                              onClick={() => handleOpenCorrectionModal(c)}
                              className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors font-bold text-[11px] cursor-pointer border border-amber-200"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Sửa số</span>
                            </button>
                          )}
                          {canUpdateCargo && (
                            <button
                              type="button"
                              onClick={() => handleOpenCargoModal(c)}
                              className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors font-bold text-[11px] cursor-pointer"
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
        <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-xs overflow-hidden">
          {filteredVehicles.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-semibold">
              Không tìm thấy phương tiện nào đang trong bãi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Biển số xe</th>
                    <th className="px-4 py-3">Loại xe</th>
                    <th className="px-4 py-3">Mã vé</th>
                    <th className="px-4 py-3">Tiền vé</th>
                    <th className="px-4 py-3">Thanh toán vé</th>
                    <th className="px-4 py-3">Tài xế</th>
                    <th className="px-4 py-3">Thời gian vào</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredVehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-black text-slate-900 text-sm">
                        {v.license_plate}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {v.vehicle_type_name || v.vehicle_type}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-600">
                        {v.ticket_code || '—'}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#0A9444]">
                        {v.ticket_amount !== null ? `${v.ticket_amount.toLocaleString('vi-VN')} đ` : 'Chưa có giá'}
                      </td>
                      <td className="px-4 py-3">
                        {v.ticket_payment_status === 'EXEMPT' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                            Miễn phí
                          </span>
                        ) : v.ticket_payment_status === 'PAID' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Đã thu
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            Chưa thu
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {v.driver_name || '—'} {v.driver_phone ? `(${v.driver_phone})` : ''}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {new Date(v.entry_at).toLocaleString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. MODAL ĐIỀU PHỐI CẬP NHẬT HÀNG / RỖNG (CHUẨN HÓA RPC V5: CHỈ HÀNG HOẶC RỖNG) */}
      {selectedCont && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-blue-700 uppercase">Quyền Điều phối viên (RBAC V5)</span>
                <h3 className="text-base font-black text-slate-900">Cập nhật HÀNG / RỖNG</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCont(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {updateError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold">
                {updateError}
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
              <div>Container: <strong className="text-slate-900 text-sm tracking-wide">{selectedCont.container_no_current}</strong></div>
              <div>Hiện tại: {renderCargoBadge(selectedCont.cargo_status)}</div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Chọn trạng thái hàng hóa mới:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { code: 'HANG', label: 'HÀNG (Có hàng)', color: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
                  { code: 'RONG', label: 'RỖNG (Vỏ rỗng)', color: 'bg-blue-50 text-blue-800 border-blue-300' },
                ].map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => setNewCargoStatus(item.code as CargoStatusUpdate)}
                    className={`p-3 rounded-xl text-xs font-black border transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 ${
                      newCargoStatus === item.code
                        ? `${item.color} ring-2 ring-blue-500 shadow-xs`
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setSelectedCont(null)}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSaveCargoStatus}
                disabled={isUpdating}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-black text-white bg-[#0A9444] hover:bg-[#087C3C] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isUpdating ? 'Đang lưu...' : 'Xác nhận lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL SỬA SỐ CONTAINER (RBAC V5: AN NINH / CCKB TRƯỞNG, KHÔNG THAY ĐỔI ID LƯỢT) */}
      {selectedContForCorrection && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[11px] font-bold text-amber-700 uppercase">Quyền sửa số cont (RBAC V5)</span>
                <h3 className="text-base font-black text-slate-900">Sửa số Container</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContForCorrection(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {correctionError && (
              <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 text-xs font-semibold flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{correctionError}</span>
              </div>
            )}

            <div className="bg-amber-50/60 p-3 rounded-xl text-xs space-y-1 border border-amber-200/60">
              <div className="text-slate-600">Số container hiện tại:</div>
              <div className="font-mono font-black text-base text-slate-900">{selectedContForCorrection.container_no_current}</div>
              <p className="text-[11px] text-amber-800 pt-1">
                Lưu ý: Quy trình V5 bảo toàn ID lượt, không đổi lượt container và lưu vết kiểm toán bất biến.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số container mới (Bắt buộc):
                </label>
                <input
                  type="text"
                  value={newContainerNo}
                  onChange={(e) => setNewContainerNo(e.target.value.toUpperCase())}
                  placeholder="VD: TCLU1234567"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono font-bold uppercase focus:outline-hidden focus:ring-2 focus:ring-amber-500"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                type="button"
                onClick={() => setSelectedContForCorrection(null)}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSaveCorrection}
                disabled={isCorrecting}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-black text-white bg-amber-600 hover:bg-amber-700 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isCorrecting ? 'Đang lưu...' : 'Xác nhận sửa số'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL XEM LỊCH SỬ SỬA SỐ CONTAINER */}
      {selectedContForHistory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-[#223873]" />
                <div>
                  <h3 className="text-base font-black text-slate-900">Lịch sử đổi số container</h3>
                  <span className="text-xs font-mono font-bold text-slate-500">{selectedContForHistory.container_no_current}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContForHistory(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="py-8 text-center text-xs text-slate-500 font-bold">
                Đang tải lịch sử đổi số...
              </div>
            ) : historyChanges.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-semibold">
                Chưa có lần sửa số nào được ghi nhận cho container này.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
                {historyChanges.map((item, idx) => (
                  <div key={item.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{new Date(item.changed_at).toLocaleString('vi-VN')}</span>
                      <span className="font-bold text-[#223873]">{item.changed_by_name || item.changed_by}</span>
                    </div>
                    <div className="flex items-center space-x-2 font-mono font-black text-sm">
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

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedContForHistory(null)}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
