'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { SEED_VEHICLE_TYPES_V5 } from '@/lib/services/yard-service';
import { VehicleType, VehicleVisit, ContainerVisit } from '@/types/domain.types';
import { 
  Truck, 
  Container as ContainerIcon, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  ShieldAlert, 
  ArrowRight,
  Lock
} from 'lucide-react';

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
  const [note, setNote] = useState<string>('');
  
  // Câu hỏi nghiệp vụ trọng yếu: Lúc vào có container không?
  const [hasContainer, setHasContainer] = useState<boolean>(true);

  // Form Container khi có cont
  const [containerNo, setContainerNo] = useState<string>('');
  const [containerSize, setContainerSize] = useState<string>('40');
  const [containerType, setContainerType] = useState<string>('RF');

  // Status & Protection
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successResult, setSuccessResult] = useState<{
    vehicle: VehicleVisit;
    container?: ContainerVisit;
  } | null>(null);

  // Tải danh mục loại xe từ repository (nếu ở Supabase thì tải từ DB)
  useEffect(() => {
    let isMounted = true;
    repository.getVehicleTypes().then((types) => {
      if (isMounted && types.length > 0) {
        setVehicleTypes(types);
      }
    });
    return () => { isMounted = false; };
  }, [repository]);

  const resetForm = () => {
    setLicensePlate('');
    setDriverName('');
    setDriverPhone('');
    setNote('');
    setContainerNo('');
    setContainerSize('40');
    setContainerType('RF');
    setErrorMessage('');
    setSuccessResult(null);
    setIdempotencyKey('');
  };

  // Tính toán số tiền vé hiển thị trước (Preview)
  const currentVehicleType = vehicleTypes.find(t => t.code === selectedType);
  let previewAmount: number | null = currentVehicleType?.default_ticket_amount ?? null;
  if (hasContainer) {
    previewAmount = 250000; // Quy tắc vé có container đã chốt V5
  }

  // Tự động điều chỉnh loại xe hợp lý khi bật/tắt mang container
  const handleToggleContainer = (value: boolean) => {
    setHasContainer(value);
    setErrorMessage('');
    if (value && selectedType === 'DAU_KEO') {
      // Nếu có container thì chuyển sang CONT_LANH, không cho chọn DAU_KEO 0đ
      setSelectedType('CONT_LANH');
    } else if (!value && selectedType === 'CONT_LANH') {
      setSelectedType('DAU_KEO');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensePlate.trim()) {
      setErrorMessage('Vui lòng nhập biển số xe.');
      return;
    }

    if (hasContainer && !containerNo.trim()) {
      setErrorMessage('Xe có container lúc vào cổng, vui lòng nhập mã số container.');
      return;
    }

    // Nghiệp vụ bảo vệ V5: Ngăn chặn chọn DAU_KEO 0đ khi có container
    if (hasContainer && selectedType === 'DAU_KEO') {
      setErrorMessage('Quy tắc vé cổng: Xe đầu kéo khi chở container vào bãi phải áp dụng loại vé Xe container (250.000đ). Không được chọn Đầu kéo không cont (0đ).');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    const activeKey = idempotencyKey || `GATEIN-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    setIdempotencyKey(activeKey);

    try {
      // Gọi giao dịch tiếp nhận (nguyên tử xe + container nếu có container)
      const res = await repository.createVehicleEntry({
        yardId,
        vehicleTypeCode: selectedType,
        licensePlate,
        driverName,
        driverPhone,
        note,
        hasContainer,
        containerNo: hasContainer ? containerNo.trim().toUpperCase() : undefined,
        containerSize: hasContainer ? containerSize : undefined,
        containerType: hasContainer ? containerType : undefined,
        operatorId: user?.id || 'demo-operator',
        operatorName: user?.fullName || 'Nhân viên Cổng',
        idempotencyKey: activeKey,
      });

      if (res.error || !res.vehicle) {
        setErrorMessage(res.error || 'Lỗi tiếp nhận lượt xe vào bãi.');
        setIsSubmitting(false);
        return;
      }

      // Hoàn tất thành công (cả xe và container nếu có)
      setSuccessResult({
        vehicle: res.vehicle,
        container: res.container || undefined,
      });
      setIsSubmitting(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi giao dịch bến bãi.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  if (!isAllowed) {
    return (
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 text-center max-w-lg mx-auto shadow-xs">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Không có quyền tiếp nhận xe</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Tài khoản vai trò <strong>{user?.roleName || 'Chưa phân quyền'}</strong> không được cấp quyền <code>vehicle.visit.create</code> theo phân quyền RBAC V5. Chức năng này dành cho Nhân viên An ninh cổng bãi.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-4">
      {/* Tiêu đề & Thông tin bãi */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3E8EF] shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#0A9444]">
              Quy trình Cổng vào (An ninh)
            </span>
            <h1 className="text-lg sm:text-xl font-black text-[#223873] mt-0.5">
              Tiếp nhận Phương tiện & Container
            </h1>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-semibold text-slate-400">Trực ca:</span>
            <div className="text-xs font-bold text-slate-700">{user?.fullName}</div>
          </div>
        </div>

        {/* THÔNG BÁO VẬN HÀNH & QUY TẮC VÉ CỔNG */}
        {process.env.NEXT_PUBLIC_ENABLE_REAL_WRITE !== 'true' && authMode === 'REAL' ? (
          <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 text-xs">
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
          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
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
        <div className="bg-white rounded-2xl p-6 border border-emerald-300 shadow-md animate-in fade-in zoom-in-95 space-y-4">
          <div className="flex items-center space-x-3 text-emerald-700">
            <CheckCircle2 className="w-8 h-8 text-[#0A9444] shrink-0" />
            <div>
              <h2 className="text-base font-black text-slate-900">Tiếp nhận xe vào bãi thành công!</h2>
              <div className="text-xs text-slate-500">Mã vé: <strong>{successResult.vehicle.ticket_code}</strong></div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Biển số xe:</span>
              <span className="font-bold text-slate-900 text-sm">{successResult.vehicle.license_plate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Loại phương tiện:</span>
              <span className="font-semibold text-slate-800">{successResult.vehicle.vehicle_type_name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Tiền vé cổng:</span>
              <div className="text-right">
                <span className="font-bold text-[#0A9444] text-sm">
                  {successResult.vehicle.ticket_amount !== null
                    ? `${successResult.vehicle.ticket_amount.toLocaleString('vi-VN')} đ`
                    : 'Chưa thiết lập'}
                </span>
                <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold bg-amber-100 text-amber-800">
                  {successResult.vehicle.ticket_payment_status === 'EXEMPT' ? 'Miễn phí hợp lệ' : 'Chưa thu tiền (UNPAID)'}
                </span>
              </div>
            </div>
            {successResult.container && (
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="text-slate-500">Container đi kèm:</span>
                <span className="font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {successResult.container.container_no_current} ({successResult.container.container_size}ft - {successResult.container.container_type})
                </span>
              </div>
            )}
            <div className="flex justify-between text-[11px] text-slate-400 pt-1">
              <span>Thời gian vào:</span>
              <span>{new Date(successResult.vehicle.entry_at).toLocaleTimeString('vi-VN')} {new Date(successResult.vehicle.entry_at).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={resetForm}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-[#0A9444] hover:bg-[#087C3C] transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tiếp nhận lượt xe tiếp theo</span>
          </button>
        </div>
      ) : (
        /* FORM NHẬP TIẾP NHẬN */
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-4 sm:p-6 border border-[#E3E8EF] shadow-xs space-y-5">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start space-x-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. CÂU HỎI THỰC ĐỊA: CÓ CONTAINER KHÔNG? */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              1. Tình trạng container lúc vào cổng:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleToggleContainer(true)}
                className={`py-3 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  hasContainer
                    ? 'bg-emerald-50 text-[#0A9444] border-[#0A9444] ring-2 ring-emerald-500/20 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <ContainerIcon className="w-4 h-4" />
                <span>CÓ mang container</span>
              </button>

              <button
                type="button"
                onClick={() => handleToggleContainer(false)}
                className={`py-3 px-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer ${
                  !hasContainer
                    ? 'bg-blue-50 text-blue-700 border-blue-600 ring-2 ring-blue-500/20 shadow-xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>KHÔNG có container</span>
              </button>
            </div>
          </div>

          {/* 2. CHỌN LOẠI PHƯƠNG TIỆN (7 LOẠI XE V5 CHUẨN) */}
          <div className="space-y-2">
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              2. Loại phương tiện (7 mã V5):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {vehicleTypes.map((t) => {
                const isSelected = selectedType === t.code;
                // Nếu có container thì vô hiệu hóa chọn Đầu kéo không cont
                const isDisabled = hasContainer && t.code === 'DAU_KEO';

                let priceLabel = 'Chưa có giá';
                if (hasContainer) {
                  priceLabel = '250.000 đ';
                } else if (t.default_ticket_amount === 0) {
                  priceLabel = '0 đ (Miễn phí)';
                } else if (t.default_ticket_amount !== null && t.default_ticket_amount > 0) {
                  priceLabel = `${t.default_ticket_amount.toLocaleString('vi-VN')} đ`;
                }

                return (
                  <button
                    key={t.code}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      setSelectedType(t.code);
                      setErrorMessage('');
                    }}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-50 text-emerald-950 border-[#0A9444] ring-2 ring-emerald-500/20 font-bold'
                        : isDisabled
                        ? 'bg-slate-100/70 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{t.name}</div>
                    <div className="flex justify-between items-center mt-1 text-[11px]">
                      <span className="text-slate-400">{t.code}</span>
                      <span className={`font-semibold ${t.default_ticket_amount === 0 ? 'text-blue-600' : 'text-[#0A9444]'}`}>
                        {priceLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. THÔNG TIN XE */}
          <div className="space-y-3 pt-1 border-t border-slate-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Biển số xe <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: 29C-123.45"
                  className="w-full px-3 py-2.5 text-sm font-black tracking-wider text-slate-900 border border-slate-300 rounded-xl uppercase focus:ring-2 focus:ring-[#0A9444] focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ tên tài xế</label>
                <input
                  type="text"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2.5 text-xs text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0A9444] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="0987.654.321"
                  className="w-full px-3 py-2.5 text-xs text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0A9444] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú lượt xe</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Nội dung hàng, ghi chú bãi..."
                  className="w-full px-3 py-2.5 text-xs text-slate-800 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#0A9444] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 4. THÔNG TIN CONTAINER (HIỂN THỊ KHI CÓ CONT) */}
          {hasContainer && (
            <div className="p-4 rounded-xl bg-slate-50 border border-blue-200 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-blue-900 flex items-center space-x-1.5">
                  <ContainerIcon className="w-4 h-4 text-blue-700" />
                  <span>3. Thông tin Container đi kèm:</span>
                </span>
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">
                  Chưa xác định Hàng/Rỗng
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mã số Container (11 ký tự) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={containerNo}
                  onChange={(e) => setContainerNo(e.target.value.toUpperCase())}
                  placeholder="Ví dụ: MSKU1234567"
                  className="w-full px-3 py-2.5 text-sm font-black tracking-widest text-blue-950 border border-blue-300 rounded-xl uppercase focus:ring-2 focus:ring-blue-600 focus:outline-none"
                  required={hasContainer}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kích cỡ</label>
                  <select
                    value={containerSize}
                    onChange={(e) => setContainerSize(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="20">20 Feet</option>
                    <option value="40">40 Feet (Phổ biến)</option>
                    <option value="45">45 Feet</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Loại vỏ container</label>
                  <select
                    value={containerType}
                    onChange={(e) => setContainerType(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="RF">RF — Lạnh (Reefer)</option>
                    <option value="DC">DC — Khô (Dry Cargo)</option>
                    <option value="OT">OT — Mở nóc (Open Top)</option>
                    <option value="FR">FR — Khung phẳng (Flat Rack)</option>
                  </select>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 italic">
                * Lưu ý: An ninh tiếp nhận chỉ ghi nhận số vỏ. Trạng thái HÀNG hoặc RỖNG do Điều phối viên cập nhật sau khi kiểm tra hiện trường.
              </div>
            </div>
          )}

          {/* 5. TỔNG KẾT VÉ & NÚT TIẾP NHẬN */}
          <div className="pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-slate-600">Tổng tiền vé cổng tính dự kiến:</span>
              <span className="text-base sm:text-lg font-black text-[#0A9444]">
                {previewAmount !== null ? `${previewAmount.toLocaleString('vi-VN')} đ` : 'Chưa thiết lập'}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-4 rounded-xl font-black text-sm text-white bg-[#087C3C] hover:bg-[#0A9444] transition-all flex items-center justify-center space-x-2 shadow-md hover:shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang ghi nhận lượt vào...</span>
                </>
              ) : (
                <>
                  <span>XÁC NHẬN TIẾP NHẬN VÀO CỔNG</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
