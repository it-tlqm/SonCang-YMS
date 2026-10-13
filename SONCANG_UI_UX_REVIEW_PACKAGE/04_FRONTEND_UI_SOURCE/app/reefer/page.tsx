'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ContainerVisit, ReeferPowerSession } from '@/types/domain.types';
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
  DollarSign
} from 'lucide-react';

export default function ReeferMonitoringPage() {
  const { yardId, can, repository } = useAuth();

  // Kiểm tra quyền V5
  const canPlugIn = can('reefer.session.actual_start.record');
  const canUnplug = can('reefer.session.actual_end.record');

  const [sessions, setSessions] = useState<ReeferPowerSession[]>([]);
  const [containers, setContainers] = useState<ContainerVisit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PLUGGED' | 'UNPLUGGED' | 'PENDING_REVIEW'>('ALL');

  // Modal Cắm điện
  const [showPlugModal, setShowPlugModal] = useState<boolean>(false);
  const [selectedContId, setSelectedContId] = useState<string>('');
  const [plugInTime, setPlugInTime] = useState<string>('');
  const [plugNotes, setPlugNotes] = useState<string>('');
  const [plugError, setPlugError] = useState<string>('');

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

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // Tải dữ liệu ban đầu
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      repository.getReeferSessions(yardId),
      repository.getContainers(yardId),
    ])
      .then(([sessionList, containerList]) => {
        if (isMounted) {
          setSessions(sessionList);
          setContainers(containerList);
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
    ])
      .then(([sessionList, containerList]) => {
        setSessions(sessionList);
        setContainers(containerList);
      })
      .catch((err) => {
        console.error('Lỗi tải dữ liệu điện container:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Danh sách container lạnh chưa cắm điện trong bãi
  const availableRfContainers = containers.filter((c) => {
    const isReefer = c.container_type === 'RF' || c.container_no_current.startsWith('MSKU') || c.container_no_current.startsWith('TEMU');
    const isAlreadyPlugged = sessions.some(
      (s) => s.container_visit_id === c.id && s.power_status === 'PLUGGED'
    );
    return isReefer && !isAlreadyPlugged && c.status === 'IN_YARD';
  });

  // Mở modal cắm điện
  const handleOpenPlugModal = () => {
    setPlugError('');
    setSelectedContId(availableRfContainers[0]?.id || '');
    const now = new Date();
    // format datetime-local
    const pad = (n: number) => n.toString().padStart(2, '0');
    const localIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    setPlugInTime(localIso);
    setPlugNotes('');
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

    const res = await repository.plugInReefer({
      yardId,
      containerVisitId: selectedContId,
      containerNo: targetCont.container_no_current,
      pluggedInAt: new Date(plugInTime).toISOString(),
      operatorId: 'operator-current',
      notes: plugNotes,
    });

    if (res.error) {
      setPlugError(res.error);
    } else {
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

    // Tính toán trước chi phí
    const plugDate = new Date(session.plugged_in_at);
    const durationSec = Math.max(0, Math.floor((now.getTime() - plugDate.getTime()) / 1000));
    const billableMins = Math.ceil(durationSec / 900) * 15;
    const amount = Math.round((billableMins / 60) * session.applied_hourly_rate);

    setCalculatedPreview({ billableMinutes: billableMins, amount });
    setShowUnplugModal(true);
  };

  // Cập nhật preview khi người dùng đổi giờ rút điện
  const handleUnplugTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUnplugTime(val);
    if (!selectedSession) return;

    const plugDate = new Date(selectedSession.plugged_in_at);
    const unplugDate = new Date(val);
    const durationSec = Math.max(0, Math.floor((unplugDate.getTime() - plugDate.getTime()) / 1000));
    const billableMins = Math.ceil(durationSec / 900) * 15;
    const amount = Math.round((billableMins / 60) * selectedSession.applied_hourly_rate);
    setCalculatedPreview({ billableMinutes: billableMins, amount });
  };

  // Xác nhận rút điện
  const handleConfirmUnplug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSession) return;

    const res = await repository.unplugReefer({
      sessionId: selectedSession.id,
      unpluggedAt: new Date(unplugTime).toISOString(),
      operatorId: 'operator-current',
      notes: unplugNotes,
    });

    if (res.error) {
      setUnplugError(res.error);
    } else {
      setShowUnplugModal(false);
      setActionSuccessMsg(`Đã ghi nhận rút điện thành công cho container ${selectedSession.container_no}. Tiền điện: ${(res.session?.total_power_amount || 0).toLocaleString()}đ`);
      handleManualRefresh();
    }
  };

  // Lọc danh sách
  const filteredSessions = sessions.filter((s) => {
    const matchesSearch = s.container_no.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.power_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = sessions.filter((s) => s.power_status === 'PLUGGED').length;
  const unpaidCount = sessions.filter((s) => s.power_status === 'UNPLUGGED' && s.payment_status === 'UNPAID').length;
  const totalAmountTemp = sessions
    .filter((s) => s.total_power_amount !== null)
    .reduce((acc, curr) => acc + (curr.total_power_amount || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#223873] flex items-center gap-2">
            <Zap className="w-7 h-7 text-amber-500" />
            Giám sát điện Container Lạnh (Reefer)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Ghi nhận cắm/rút điện thực tế, snapshot đơn giá 100.000đ/h, quy tắc làm tròn 15 phút V5
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

          {canPlugIn ? (
            <button
              onClick={handleOpenPlugModal}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-lg font-semibold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Cắm điện Container
            </button>
          ) : (
            <button
              disabled
              title="Cần quyền reefer.session.actual_start.record"
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-400 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed font-medium"
            >
              <Lock className="w-4 h-4" />
              Cắm điện (Khóa quyền)
            </button>
          )}
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

      {/* Bảng KPI tóm tắt */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Đang cắm điện</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{activeCount} container</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl">
            <Zap className="w-6 h-6 text-amber-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Đã rút chờ thu tiền</p>
            <p className="text-2xl font-bold text-[#223873] mt-1">{unpaidCount} phiên</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl">
            <Clock className="w-6 h-6 text-[#223873]" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Tổng tiền điện đã tính</p>
            <p className="text-2xl font-bold text-[#0A9444] mt-1">{totalAmountTemp.toLocaleString()} đ</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <DollarSign className="w-6 h-6 text-[#0A9444]" />
          </div>
        </div>
      </div>

      {/* Bộ lọc và Tìm kiếm */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo số container..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#223873]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {(['ALL', 'PLUGGED', 'UNPLUGGED', 'PENDING_REVIEW'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === st
                  ? 'bg-[#223873] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'ALL' && 'Tất cả'}
              {st === 'PLUGGED' && 'Đang cắm'}
              {st === 'UNPLUGGED' && 'Đã rút'}
              {st === 'PENDING_REVIEW' && 'Chờ xử lý (0s)'}
            </button>
          ))}
        </div>
      </div>

      {/* Danh sách phiên cắm điện */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Số Container</th>
                <th className="px-4 py-3">Thời gian cắm</th>
                <th className="px-4 py-3">Thời gian rút</th>
                <th className="px-4 py-3">Thời lượng (Làm tròn 15p)</th>
                <th className="px-4 py-3">Đơn giá / Thành tiền</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Không có phiên cắm điện nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => {
                  const isPlugged = s.power_status === 'PLUGGED';
                  const plugDate = new Date(s.plugged_in_at);
                  const unplugDate = s.unplugged_at ? new Date(s.unplugged_at) : null;

                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-[#223873]">
                        {s.container_no}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {plugDate.toLocaleTimeString()} {plugDate.toLocaleDateString()}
                        <div className="text-[11px] text-gray-400">{s.plugged_in_by}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {unplugDate ? (
                          <>
                            {unplugDate.toLocaleTimeString()} {unplugDate.toLocaleDateString()}
                            <div className="text-[11px] text-gray-400">{s.unplugged_by}</div>
                          </>
                        ) : (
                          <span className="text-amber-600 font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            Đang kết nối
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {isPlugged ? (
                          <span className="text-gray-400 italic">Đang chạy...</span>
                        ) : s.billable_minutes ? (
                          <span className="font-semibold text-gray-700">
                            {s.billable_minutes} phút ({Math.round((s.billable_minutes / 60) * 100) / 100}h)
                          </span>
                        ) : (
                          <span className="text-amber-600">0 phút (RV02)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div>
                          <span className="text-gray-500">100.000đ/h</span>
                        </div>
                        {s.total_power_amount !== null && (
                          <div className="font-bold text-[#0A9444]">
                            {s.total_power_amount.toLocaleString()} đ
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {s.power_status === 'PLUGGED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Zap className="w-3 h-3 text-amber-500" />
                            Đang cắm điện
                          </span>
                        )}
                        {s.power_status === 'UNPLUGGED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            Đã rút
                          </span>
                        )}
                        {s.power_status === 'PENDING_REVIEW' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            Chờ CCKB duyệt (0s)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isPlugged && canUnplug && (
                          <button
                            onClick={() => handleOpenUnplugModal(s)}
                            className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                          >
                            Rút điện & Tính cước
                          </button>
                        )}
                        {isPlugged && !canUnplug && (
                          <span className="text-xs text-gray-400 italic">Chờ CCKB rút</span>
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

      {/* MODAL CẮM ĐIỆN */}
      {showPlugModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#223873] flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                Cắm điện Container Lạnh
              </h3>
              <button
                onClick={() => setShowPlugModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {plugError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {plugError}
              </div>
            )}

            <form onSubmit={handleConfirmPlugIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Chọn Container Lạnh trong bãi
                </label>
                {availableRfContainers.length === 0 ? (
                  <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">
                    Hiện không có container lạnh nào đang ở trong bãi chưa cắm điện.
                  </p>
                ) : (
                  <select
                    value={selectedContId}
                    onChange={(e) => setSelectedContId(e.target.value)}
                    className="w-full p-2.5 border border-gray-300 rounded-lg text-sm font-mono font-bold"
                  >
                    {availableRfContainers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.container_no_current} ({c.container_size || '40'}ft - {c.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Thời gian cắm thực tế (Hồi tố/Nhập bù)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={plugInTime}
                    onChange={(e) => setPlugInTime(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ghi chú hiện trường
                </label>
                <textarea
                  value={plugNotes}
                  onChange={(e) => setPlugNotes(e.target.value)}
                  placeholder="Vị trí ổ cắm, nhiệt độ cài đặt, loại hàng..."
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPlugModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={availableRfContainers.length === 0}
                  className="px-4 py-2 text-sm text-white bg-[#0A9444] hover:bg-[#087C3C] disabled:bg-gray-300 rounded-lg font-bold"
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#223873] flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Rút điện & Chốt cước Container
              </h3>
              <button
                onClick={() => setShowUnplugModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {unplugError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {unplugError}
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded-xl space-y-1 text-xs">
              <p><span className="text-gray-500">Số container:</span> <span className="font-mono font-bold text-[#223873]">{selectedSession.container_no}</span></p>
              <p><span className="text-gray-500">Thời gian cắm:</span> <span className="font-semibold">{new Date(selectedSession.plugged_in_at).toLocaleString()}</span></p>
              <p><span className="text-gray-500">Đơn vị cắm:</span> {selectedSession.plugged_in_by}</p>
            </div>

            <form onSubmit={handleConfirmUnplug} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Thời gian rút thực tế
                </label>
                <input
                  type="datetime-local"
                  value={unplugTime}
                  onChange={handleUnplugTimeChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>

              {calculatedPreview && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs text-emerald-900">
                  <p className="font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Tính cước theo quy tắc V5 (Làm tròn 15 phút):
                  </p>
                  <p>• Thời lượng tính tiền: <span className="font-bold">{calculatedPreview.billableMinutes} phút</span></p>
                  <p>• Đơn giá: <span className="font-bold">{selectedSession.applied_hourly_rate.toLocaleString()} đ/giờ</span></p>
                  <p className="text-sm font-bold text-[#0A9444] pt-1">
                    • Tổng tiền điện: {calculatedPreview.amount.toLocaleString()} VND
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ghi chú khi rút điện
                </label>
                <textarea
                  value={unplugNotes}
                  onChange={(e) => setUnplugNotes(e.target.value)}
                  placeholder="Lý do rút, tình trạng nhiệt độ khi rút..."
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUnplugModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-lg font-bold shadow-sm"
                >
                  Xác nhận rút điện
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
