'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { 
  VehicleVisit, 
  ContainerVisit, 
  ReeferPowerSession, 
  ChargeItem, 
  VehicleType 
} from '@/types/domain.types';
import { 
  Truck, 
  Layers, 
  Zap, 
  Receipt, 
  Clock, 
  ArrowUpRight, 
  RefreshCw, 
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export default function DashboardPage() {
  const { yardId, repository, role, can } = useAuth();

  const [vehicles, setVehicles] = useState<VehicleVisit[]>([]);
  const [containers, setContainers] = useState<ContainerVisit[]>([]);
  const [reeferSessions, setReeferSessions] = useState<ReeferPowerSession[]>([]);
  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [longStayContainers, setLongStayContainers] = useState<ContainerVisit[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // R2-04: Phân quyền xem số liệu tài chính theo RBAC V5
  const canReadFinance = can('finance.payment.read') || can('billing.charge.read');

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      repository.getVehicles(yardId),
      repository.getContainers(yardId),
      repository.getReeferSessions(yardId),
      canReadFinance ? repository.getCharges(yardId) : Promise.resolve([]),
      repository.getVehicleTypes(),
    ])
      .then(([vList, cList, rList, chList, vtList]) => {
        if (isMounted) {
          const inYardV = vList.filter((v) => v.status === 'IN_YARD');
          const inYardC = cList.filter((c) => c.status === 'IN_YARD');
          setVehicles(inYardV);
          setContainers(inYardC);
          setReeferSessions(rList);
          setCharges(chList);
          setVehicleTypes(vtList);

          const currentTime = Date.now();
          const longStay = inYardC.filter((c) => {
            const entryTime = new Date(c.inbound_at).getTime();
            return (currentTime - entryTime) / (1000 * 60 * 60) >= 24;
          });
          setLongStayContainers(longStay);
        }
      })
      .catch((err) => {
        console.error('Lỗi nạp dữ liệu Dashboard:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [repository, yardId, canReadFinance]);

  const handleReload = () => {
    setIsLoading(true);
    Promise.all([
      repository.getVehicles(yardId),
      repository.getContainers(yardId),
      repository.getReeferSessions(yardId),
      canReadFinance ? repository.getCharges(yardId) : Promise.resolve([]),
      repository.getVehicleTypes(),
    ])
      .then(([vList, cList, rList, chList, vtList]) => {
        const inYardV = vList.filter((v) => v.status === 'IN_YARD');
        const inYardC = cList.filter((c) => c.status === 'IN_YARD');
        setVehicles(inYardV);
        setContainers(inYardC);
        setReeferSessions(rList);
        setCharges(chList);
        setVehicleTypes(vtList);

        const currentTime = Date.now();
        const longStay = inYardC.filter((c) => {
          const entryTime = new Date(c.inbound_at).getTime();
          return (currentTime - entryTime) / (1000 * 60 * 60) >= 24;
        });
        setLongStayContainers(longStay);
      })
      .catch((err) => {
        console.error('Lỗi làm mới dữ liệu Dashboard:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Tính toán số liệu thống kê
  const totalVehiclesInYard = vehicles.length;
  const totalContainersInYard = containers.length;
  const activeReeferCount = reeferSessions.filter((s) => s.power_status === 'PLUGGED').length;

  const containersHang = containers.filter((c) => c.cargo_status === 'HANG').length;
  const containersRong = containers.filter((c) => c.cargo_status === 'RONG').length;
  const containersChuaXD = containers.filter((c) => c.cargo_status === 'CHUA_XAC_DINH').length;

  // Tính doanh thu từ Sổ cái charges (nếu có quyền xem)
  const paidCharges = charges.filter((ch) => ch.status === 'PAID');
  const unpaidCharges = charges.filter((ch) => ch.status === 'UNPAID');

  const totalCollectedAmount = paidCharges.reduce((acc, curr) => acc + curr.paid_amount, 0);
  const totalReceivableAmount = unpaidCharges.reduce((acc, curr) => acc + (curr.amount - curr.paid_amount), 0);

  // Phân bổ phương tiện theo 7 loại xe V5
  const vehicleDistribution = vehicleTypes.map((vt) => {
    const count = vehicles.filter(
      (v) => v.vehicle_type === vt.code
    ).length;
    return {
      type: vt,
      count,
      percent: totalVehiclesInYard > 0 ? Math.round((count / totalVehiclesInYard) * 100) : 0,
    };
  });

  return (
    <div className="space-y-5">
      {/* 1. HEADER & THỜI GIAN THỰC */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3E8EF] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#223873]">
              Trung tâm điều hành bến bãi
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1" />
              Dữ liệu vận hành
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 mt-1">
            Tổng quan Vận hành Cảng cạn Sơn Cảng
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cửa khẩu Quốc tế Tà Lùng — Công ty Cổ phần Tà Lùng Quang Minh
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleReload}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Đang cập nhật...' : 'Cập nhật số liệu'}</span>
          </button>
        </div>
      </div>

      {/* 2. 4 CARDS KPI CỐT LÕI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Xe trong bãi */}
        <div className="bg-white rounded-2xl p-4 border border-[#E3E8EF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Xe trong bãi</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{totalVehiclesInYard}</span>
            <span className="text-xs font-semibold text-slate-500">phương tiện</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Công suất bãi</span>
            <span className="font-bold text-[#0A9444]">Bình thường</span>
          </div>
        </div>

        {/* Card 2: Container trong bãi */}
        <div className="bg-white rounded-2xl p-4 border border-[#E3E8EF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Container lưu bãi</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{totalContainersInYard}</span>
            <span className="text-xs font-semibold text-slate-500">Cont</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Hàng: <strong className="text-emerald-700">{containersHang}</strong></span>
            <span className="text-slate-500">Rỗng: <strong className="text-blue-700">{containersRong}</strong></span>
          </div>
        </div>

        {/* Card 3: Cắm điện Reefer */}
        <div className="bg-white rounded-2xl p-4 border border-[#E3E8EF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Điện cont lạnh</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{activeReeferCount}</span>
            <span className="text-xs font-semibold text-slate-500">đang cắm</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Đơn giá giờ</span>
            <span className="font-bold text-slate-700">100.000 đ/h</span>
          </div>
        </div>

        {/* Card 4: Doanh thu thu tiền (Gated RBAC V5) */}
        <div className="bg-white rounded-2xl p-4 border border-[#E3E8EF] shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Tổng thu ghi nhận</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-700">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          {canReadFinance ? (
            <>
              <div className="mt-2 flex items-baseline space-x-1">
                <span className="text-xl font-black text-[#0A9444]">
                  {totalCollectedAmount.toLocaleString('vi-VN')}
                </span>
                <span className="text-xs font-bold text-slate-500">đ</span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Chờ thu (Phải thu):</span>
                <span className="font-bold text-amber-700">{totalReceivableAmount.toLocaleString('vi-VN')} đ</span>
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 flex items-baseline space-x-1">
                <span className="text-base font-bold text-slate-400">
                  Giới hạn quyền
                </span>
              </div>
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Chính sách bảo mật:</span>
                <span className="font-semibold text-slate-500">Yêu cầu quyền Tài chính</span>
              </div>
            </>
          )}
        </div>
      </div>


      {/* 3. PHÂN BỔ 7 LOẠI XE V5 & TÌNH TRẠNG CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cột 1 & 2: Phân bổ 7 loại xe V5 */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-4 sm:p-5 border border-[#E3E8EF] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">
                Phân bổ Phương tiện theo Danh mục V5
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Quản lý động theo danh mục app_vehicle_types (Khởi tạo 7 loại xe V5)
              </p>
            </div>
            <Link
              href="/yard"
              className="inline-flex items-center space-x-1 text-xs font-bold text-[#223873] hover:underline"
            >
              <span>Xem chi tiết bãi</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5 pt-1">
            {vehicleDistribution.map((item) => (
              <div key={item.type.code} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    {item.type.name} ({item.type.code})
                  </span>
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-slate-900">{item.count} xe</span>
                    <span className="text-[11px] text-slate-400">({item.percent}%)</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#223873] rounded-full transition-all duration-300"
                    style={{ width: `${item.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cột 3: Trạng thái Container & Cảnh báo */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3E8EF] shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Trạng thái Hàng & Cảnh báo Lưu bãi
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Quy tắc V5: Miễn phí đêm đầu, thu phí từ đêm thứ 2 (AP07)
            </p>
          </div>

          {/* Phân bổ Hàng / Rỗng */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <span className="text-[10px] font-bold text-emerald-800 uppercase">HÀNG</span>
              <div className="text-base font-black text-emerald-900 mt-0.5">{containersHang}</div>
            </div>
            <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200">
              <span className="text-[10px] font-bold text-blue-800 uppercase">RỖNG</span>
              <div className="text-base font-black text-blue-900 mt-0.5">{containersRong}</div>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase">Chưa XĐ</span>
              <div className="text-base font-black text-amber-900 mt-0.5">{containersChuaXD}</div>
            </div>
          </div>

          {/* Danh sách cảnh báo container ở lâu */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Container lưu &gt; 24h</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
                {longStayContainers.length} cont
              </span>
            </div>

            {longStayContainers.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-400 font-semibold flex items-center justify-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Không có container nào lưu quá 24h</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {longStayContainers.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 rounded-xl bg-rose-50/60 border border-rose-200/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-black text-slate-900">{c.container_no_current}</span>
                      <div className="text-[10px] text-slate-500">
                        Vào: {new Date(c.inbound_at).toLocaleString('vi-VN')}
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                      Có phí lưu bãi
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. TRUY CẬP NHANH VẬN HÀNH (QUICK ACTIONS THEO RBAC V5) */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3E8EF] shadow-xs">
        <h2 className="text-sm font-black text-slate-900 mb-3">
          Lối tắt Thao tác Vận hành (Theo vai trò {role || 'Nhân viên'})
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <Link
            href="/entry"
            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex flex-col items-center text-center space-y-1.5 group cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700 group-hover:scale-105 transition-transform">
              <Truck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Tiếp nhận cổng</span>
            <span className="text-[10px] text-slate-400">Tạo lượt xe/cont</span>
          </Link>

          <Link
            href="/yard"
            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex flex-col items-center text-center space-y-1.5 group cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 group-hover:scale-105 transition-transform">
              <Layers className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Giám sát bãi</span>
            <span className="text-[10px] text-slate-400">Sửa số & Hàng/Rỗng</span>
          </Link>

          <Link
            href="/reefer"
            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex flex-col items-center text-center space-y-1.5 group cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 group-hover:scale-105 transition-transform">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Cắm/Rút điện</span>
            <span className="text-[10px] text-slate-400">Tính tiền điện 15p</span>
          </Link>

          <Link
            href="/billing"
            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex flex-col items-center text-center space-y-1.5 group cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-purple-100 text-purple-700 group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Sổ cái & Thu phí</span>
            <span className="text-[10px] text-slate-400">Ghi sổ bất biến</span>
          </Link>

          <Link
            href="/exit"
            className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors flex flex-col items-center text-center space-y-1.5 group cursor-pointer"
          >
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700 group-hover:scale-105 transition-transform">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Xuất bãi</span>
            <span className="text-[10px] text-slate-400">Clearance 2 lớp</span>
          </Link>
        </div>
      </div>

      {/* 5. GHI CHÚ CHÍNH SÁCH V5 */}
      <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 text-xs text-blue-900 flex items-start space-x-2.5">
        <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <strong>Nguyên tắc Vận hành Sơn Cảng V5:</strong>
          <p className="text-[11px] text-blue-800">
            Mọi thao tác thu tiền và xuất bãi tuân thủ phân quyền độc lập: An ninh thu vé vào cổng và phí lưu bãi thực tế (AP07); CCKB kiểm soát cắm điện và duyệt clearance xuất bãi (AP06).
          </p>
        </div>
      </div>
    </div>
  );
}
