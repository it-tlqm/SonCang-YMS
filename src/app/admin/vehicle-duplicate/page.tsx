'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { VehicleType, VehicleDuplicatePolicy, DuplicatePolicyMode } from '@/types/domain.types';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  CopyCheck, 
  ArrowLeft,
  Truck,
  Settings,
  DollarSign
} from 'lucide-react';

export default function VehicleDuplicateAdminPage() {
  const { user, yardId, can, repository } = useAuth();

  // Quyền quản trị biểu phí / cấu hình bãi V5
  const isAllowed = can('admin.billing_settings.manage') || user?.roleCode === 'SYS_ADMIN';

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);

  // State Cấu hình chính sách
  const [policyMode, setPolicyMode] = useState<DuplicatePolicyMode>('WARN_AND_ALLOW');
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(15);
  const [cooldownAction, setCooldownAction] = useState<'BLOCK' | 'WARN'>('BLOCK');
  const [checkUnpaidTicket, setCheckUnpaidTicket] = useState<boolean>(true);
  const [blockIfUnpaidTicket, setBlockIfUnpaidTicket] = useState<boolean>(false);
  const [requireOverrideReason, setRequireOverrideReason] = useState<boolean>(true);
  const [allowQuickExitPrevious, setAllowQuickExitPrevious] = useState<boolean>(true);
  const [exemptVehicleTypes, setExemptVehicleTypes] = useState<string[]>([
    'DAU_KEO', 'XE_BO_4_CHAN', 'XE_BO_3_CHAN', 'XE_BO_8_TAN_2_CHAN', 'XE_SANG_TAI'
  ]);
  const [presetReasons, setPresetReasons] = useState<{ code: string; label: string }[]>([
    { code: 'XE_BO_CHAY_CHUYEN_MOI', label: 'Xe bo / xe kéo chạy chuyến mới trong ngày' },
    { code: 'QUEN_QUET_RA', label: 'Quên quẹt ra ca trước / Cổng ra chưa xác nhận' },
    { code: 'XE_QUAY_DAU', label: 'Xe quay đầu ra ngoài rồi quay lại bãi' },
    { code: 'NHAP_BU_DOI_SOAT', label: 'Nhập bù dữ liệu đối soát thực tế ca trực' },
    { code: 'LY_DO_KHAC', label: 'Lý do nghiệp vụ khác' },
  ]);

  const [newReasonText, setNewReasonText] = useState<string>('');

  // Nạp cấu hình từ Repository
  const loadPolicy = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [types, policy] = await Promise.all([
        repository.getVehicleTypes(),
        repository.getVehicleDuplicatePolicy(yardId)
      ]);

      if (types.length > 0) setVehicleTypes(types);

      if (policy) {
        setPolicyMode(policy.policy_mode);
        setCooldownMinutes(policy.cooldown_minutes);
        setCooldownAction(policy.cooldown_action);
        setCheckUnpaidTicket(policy.check_unpaid_ticket);
        setBlockIfUnpaidTicket(policy.block_if_unpaid_ticket);
        setRequireOverrideReason(policy.require_override_reason);
        setAllowQuickExitPrevious(policy.allow_quick_exit_previous);
        if (policy.exempt_vehicle_types) setExemptVehicleTypes(policy.exempt_vehicle_types);
        if (policy.preset_reasons && policy.preset_reasons.length > 0) setPresetReasons(policy.preset_reasons);
      }
    } catch (err: any) {
      console.error('Lỗi tải cấu hình trùng lặp:', err);
      setErrorMessage(err?.message || 'Không thể tải cấu hình chính sách trùng lặp.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy();
  }, [repository, yardId]);

  // Thêm lý do mẫu mới
  const handleAddReason = () => {
    if (!newReasonText.trim()) return;
    const code = `CUSTOM_${Date.now()}`;
    setPresetReasons(prev => [...prev, { code, label: newReasonText.trim() }]);
    setNewReasonText('');
  };

  // Xóa lý do mẫu
  const handleRemoveReason = (code: string) => {
    if (presetReasons.length <= 1) {
      alert('Bắt buộc phải giữ ít nhất 1 lý do mẫu!');
      return;
    }
    setPresetReasons(prev => prev.filter(r => r.code !== code));
  };

  // Toggle loại xe ngoại lệ
  const handleToggleExemptType = (typeCode: string) => {
    setExemptVehicleTypes(prev => 
      prev.includes(typeCode) 
        ? prev.filter(c => c !== typeCode) 
        : [...prev, typeCode]
    );
  };

  // Lưu cấu hình
  const handleSavePolicy = async () => {
    setIsSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const res = await repository.updateVehicleDuplicatePolicy({
        yard_id: yardId || '20000000-0000-0000-0000-000000000001',
        policy_mode: policyMode,
        cooldown_minutes: Number(cooldownMinutes) || 0,
        cooldown_action: cooldownAction,
        check_unpaid_ticket: checkUnpaidTicket,
        block_if_unpaid_ticket: blockIfUnpaidTicket,
        require_override_reason: requireOverrideReason,
        allow_quick_exit_previous: allowQuickExitPrevious,
        exempt_vehicle_types: exemptVehicleTypes,
        preset_reasons: presetReasons,
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setSuccessMessage('Đã cập nhật chính sách kiểm soát trùng lặp phương tiện thành công!');
        setTimeout(() => setSuccessMessage(''), 5000);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Lỗi khi lưu chính sách.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAllowed) {
    return (
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 text-center max-w-lg mx-auto shadow-xs">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Khu vực Quản trị Hệ thống</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Tài khoản <strong>{user?.roleName || 'Chưa phân vai trò'}</strong> không có quyền quản trị chính sách kiểm soát trùng lặp (<code>admin.billing_settings.manage</code>). Chức năng này chỉ dành cho Quản trị viên (<code>SYS_ADMIN</code>).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-12">
      {/* HEADER QUẢN TRỊ */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3E8EF] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <CopyCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-purple-700">
                Quản trị Nghiệp vụ & Vận hành
              </span>
              <h1 className="text-lg sm:text-xl font-black text-slate-900 mt-0.5">
                Cấu hình Kiểm soát Trùng lặp Phương tiện
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Link
              href="/admin/vehicle-types"
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-1"
            >
              <Truck className="w-3.5 h-3.5 text-slate-500" />
              <span>Loại xe</span>
            </Link>
            <Link
              href="/admin/tariffs"
              className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center space-x-1"
            >
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              <span>Biểu phí</span>
            </Link>
            <button
              onClick={loadPolicy}
              disabled={isLoading}
              className="p-1.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 transition-colors"
              title="Tải lại dữ liệu"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* HỘP QUY ĐỊNH NGHIỆP VỤ */}
        <div className="mt-4 p-3.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong>Nguyên tắc bến bãi Sơn Cảng (Cửa khẩu Tà Lùng):</strong> Phương tiện ra vào thực tế phát sinh nhiều tình huống: xe bo chở hàng quay vòng nhiều chuyến trong ngày, xe đầu kéo hạ bãi rồi đi ra chưa kịp quẹt cổng ra, hoặc ca trước quên xác nhận xuất bãi. Hệ thống cho phép cấu hình sâu nhiều kịch bản linh hoạt để An ninh kiểm soát chặt chẽ mà không làm tắc cổng.
          </div>
        </div>

        {/* THÔNG BÁO PHẢN HỒI */}
        {successMessage && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 font-semibold">Đang nạp cấu hình chính sách từ hệ thống...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* PHẦN 1: CHẾ ĐỘ XỬ LÝ CHÍNH */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3.5">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                <span>1. Chế độ xử lý khi phát hiện xe đang trong bãi</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quyết định hành vi mặc định khi An ninh tiếp nhận biển số xe đang có bản ghi Trong bãi (IN_YARD).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  code: 'WARN_AND_ALLOW',
                  title: 'Cảnh báo & Cho phép ghi đè kèm lý do (Khuyên dùng)',
                  badge: 'Thực tế Sơn Cảng',
                  badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  desc: 'Hiển thị cảnh báo thông tin lượt cũ (giờ vào, đỗ bao lâu, tình trạng vé). An ninh chọn lý do nghiệp vụ và có thể chọn tự động đóng lượt cũ ngay tại Cổng vào.',
                },
                {
                  code: 'BLOCK_STRICT',
                  title: 'Chặn nghiêm ngặt tuyệt đối',
                  badge: 'Khóa cổng',
                  badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
                  desc: 'Cấm hoàn toàn tiếp nhận xe mới nếu biển số vẫn đang trong bãi (trừ các loại xe thuộc danh mục miễn trừ). Bắt buộc phải xuất bãi tại Cổng ra trước.',
                },
                {
                  code: 'AUTO_CLOSE_PREVIOUS',
                  title: 'Tự động xuất bãi lượt cũ & Mở lượt mới',
                  badge: 'Lưu lượng cao',
                  badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
                  desc: 'Hệ thống tự động kết thúc lượt xe cũ (ghi chú: tự động xuất bãi) và mở lượt mới mà không cần xác nhận. Thích hợp giờ cao điểm chống ùn tắc.',
                },
                {
                  code: 'ALLOW_SILENT',
                  title: 'Cho phép tự do (Không cảnh báo)',
                  badge: 'Mở tự do',
                  badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
                  desc: 'Bỏ qua kiểm tra trùng lặp xe trong bãi. Hệ thống cho phép tạo các lượt xe mới bình thường và chỉ ghi vết nhật ký audit log.',
                },
              ].map((m) => {
                const isSelected = policyMode === m.code;
                return (
                  <label
                    key={m.code}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="policy_mode"
                          value={m.code}
                          checked={isSelected}
                          onChange={() => setPolicyMode(m.code as DuplicatePolicyMode)}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span className="font-bold text-xs text-slate-900">{m.title}</span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.badgeColor}`}>
                        {m.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed pl-5">
                      {m.desc}
                    </p>
                  </label>
                );
              })}
            </div>
          </div>

          {/* PHẦN 2: COOLDOWN & CHỐNG NHẤP LẶP */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                2. Ngưỡng thời gian trùng lặp ngắn (Anti Double-Entry / Cooldown Window)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bảo vệ hệ thống khỏi tình huống nhân viên bấm 2 lần liên tiếp hoặc 2 nhân viên cùng thao tác 1 phương tiện.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Thời gian Cooldown tối thiểu (Phút)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    max="180"
                    value={cooldownMinutes}
                    onChange={(e) => setCooldownMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-32 px-3 py-2 text-sm font-bold border border-slate-300 rounded-lg bg-white focus:border-purple-600 focus:outline-none"
                  />
                  <span className="text-xs text-slate-500">phút kể từ lần vào trước</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Nếu xe vào cách lần trước dưới số phút này sẽ kích hoạt cảnh báo nhấp lặp. Mặc định: 15 phút.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Hành vi khi vi phạm Cooldown
                </label>
                <div className="space-y-2 pt-1 text-xs">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cooldown_action"
                      value="BLOCK"
                      checked={cooldownAction === 'BLOCK'}
                      onChange={() => setCooldownAction('BLOCK')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-semibold text-slate-800">Chặn tuyệt đối (Khuyên dùng)</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="cooldown_action"
                      value="WARN"
                      checked={cooldownAction === 'WARN'}
                      onChange={() => setCooldownAction('WARN')}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span className="font-semibold text-slate-800">Cảnh báo nghiêm ngặt (Cho phép xác nhận tiếp tục)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* PHẦN 3: KIỂM TRA CÔNG NỢ VÉ VÀ TIỆN ÍCH CỔNG VÀO */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                3. Kiểm soát Tài chính & Tiện ích Thao tác Cổng vào
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ràng buộc công nợ vé vào cổng của lượt cũ và tính năng thao tác nhanh cho nhân viên An ninh.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Check Unpaid Ticket */}
              <label className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkUnpaidTicket}
                  onChange={(e) => setCheckUnpaidTicket(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-800">Kiểm tra công nợ vé lượt cũ</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Phát hiện và cảnh báo màu đỏ nếu xe đang có lượt cũ trong bãi chưa thanh toán tiền vé cổng (UNPAID).
                  </p>
                </div>
              </label>

              {/* Block if Unpaid Ticket */}
              <label className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={blockIfUnpaidTicket}
                  disabled={!checkUnpaidTicket}
                  onChange={(e) => setBlockIfUnpaidTicket(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 mt-0.5 disabled:opacity-50"
                />
                <div>
                  <span className="font-bold text-slate-800">Chặn vào cổng nếu còn nợ vé cũ</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Bắt buộc tài xế phải thanh toán vé lượt trước mới cho phép mở lượt xe vào bãi mới.
                  </p>
                </div>
              </label>

              {/* Require Reason */}
              <label className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireOverrideReason}
                  onChange={(e) => setRequireOverrideReason(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-800">Bắt buộc nhập / chọn lý do khi ghi đè</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Yêu cầu An ninh phải chọn lý do nghiệp vụ giải trình cho việc tiếp nhận xe trùng lặp để lưu vết audit log.
                  </p>
                </div>
              </label>

              {/* Allow Quick Exit */}
              <label className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowQuickExitPrevious}
                  onChange={(e) => setAllowQuickExitPrevious(e.target.checked)}
                  className="rounded border-slate-300 text-purple-600 focus:ring-purple-500 mt-0.5"
                />
                <div>
                  <span className="font-bold text-slate-800">Cho phép An ninh đóng nhanh lượt cũ tại Cổng vào</span>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Ngay tại modal tiếp nhận, an ninh có thể tick &quot;Đồng thời xuất bãi lượt cũ&quot; giúp làm sạch dữ liệu bãi ngay lập tức.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* PHẦN 4: DANH SÁCH LOẠI PHƯƠNG TIỆN NGOẠI LỆ */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                4. Danh sách Loại phương tiện Ngoại lệ (Chạy nhiều chuyến liên tục)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các loại xe được tích chọn bên dưới sẽ được phép vào nhiều lượt dễ dàng, không bị chặn bởi chế độ &quot;Chặn nghiêm ngặt&quot;.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
              {vehicleTypes.map((vt) => {
                const isExempt = exemptVehicleTypes.includes(vt.code);
                return (
                  <label
                    key={vt.code}
                    className={`p-3 rounded-xl border transition-colors flex items-center space-x-2.5 cursor-pointer ${
                      isExempt
                        ? 'bg-purple-50 border-purple-300 text-purple-950 font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isExempt}
                      onChange={() => handleToggleExemptType(vt.code)}
                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="truncate">
                      <p className="truncate font-bold">{vt.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{vt.code}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* PHẦN 5: DANH MỤC LÝ DO MẪU CẤU HÌNH ĐƯỢC */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                5. Danh mục Lý do mẫu khi tiếp nhận trùng lặp
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các lý do hiển thị trong hộp chọn trên màn hình Cổng vào để nhân viên An ninh thao tác nhanh.
              </p>
            </div>

            <div className="space-y-2">
              {presetReasons.map((r, idx) => (
                <div
                  key={r.code || idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-500 text-[11px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-800">{r.label}</span>
                  </div>
                  {r.code !== 'LY_DO_KHAC' && (
                    <button
                      type="button"
                      onClick={() => handleRemoveReason(r.code)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Xóa lý do này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Thêm lý do mới */}
            <div className="flex items-center space-x-2 pt-2">
              <input
                type="text"
                value={newReasonText}
                onChange={(e) => setNewReasonText(e.target.value)}
                placeholder="Nhập lý do nghiệp vụ mẫu mới..."
                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:border-purple-600 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddReason();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddReason}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors flex items-center space-x-1 cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm lý do</span>
              </button>
            </div>
          </div>

          {/* THANH THAO TÁC LƯU DƯỚI CÙNG */}
          <div className="sticky bottom-4 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg flex items-center justify-between">
            <div className="text-xs text-slate-500 font-medium hidden sm:block">
              Thay đổi chính sách sẽ áp dụng ngay lập tức cho các lượt xe vào cổng mới.
            </div>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSavePolicy}
              className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang lưu chính sách...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu Chính Sách Trùng Lặp</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
