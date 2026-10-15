'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { VehicleType, VehicleDuplicatePolicy, DuplicatePolicyMode } from '@/types/domain.types';
import { 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Save, 
  RefreshCw, 
  Plus, 
  Trash2, 
  CopyCheck, 
  ArrowLeft,
  Truck,
  DollarSign,
  Check
} from 'lucide-react';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { StatusBadge } from '@/components/workspace/status-badge';

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
        yard_id: yardId || 'fe83bb2b-833e-412c-aed4-b9a781a6decd',
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
      <div className="flex-1 flex items-center justify-center p-6 bg-[#FFFFFF]">
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-[#E5E9F0] text-center max-w-md w-full shadow-xs">
          <ShieldAlert className="w-10 h-10 text-[#D92D20] mx-auto mb-3" />
          <h2 className="text-base font-semibold text-[#17202E]">Giới hạn quyền truy cập</h2>
          <p className="text-xs text-[#667085] mt-2 leading-relaxed">
            Tài khoản của bạn không có quyền quản trị chính sách kiểm soát trùng lặp xe. Chức năng này chỉ dành cho Quản trị viên hệ thống.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-xs font-medium text-white bg-[#326DD8] hover:bg-[#2557B4] rounded-lg transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về trang Tổng quan</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white">
      {/* 1. WORKSPACE HEADER */}
      <WorkspaceHeader
        title="Cấu hình Kiểm soát Trùng lặp Phương tiện"
        subtitle="Quy tắc phát hiện xe vào nhiều lần trong ngày, chống nhấp lặp và chính sách ngoại lệ xe bo"
        icon={CopyCheck}
        badge={
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#EFF8FF] text-[#326DD8] border border-[#B2DDFF]">
            Chính sách Cổng vào
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/admin/vehicle-types"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E9F0] text-xs font-medium text-[#17202E] hover:bg-[#F8F9FB] transition-colors"
            >
              <Truck className="w-3.5 h-3.5 text-[#667085]" />
              <span>Loại xe</span>
            </Link>
            <button
              type="button"
              onClick={handleSavePolicy}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0A9444] hover:bg-[#087C3C] text-xs font-semibold text-white shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu chính sách'}</span>
            </button>
          </div>
        }
      />

      <div className="p-4 sm:p-5 space-y-4 w-full pb-16">
        {/* HỘP QUY ĐỊNH NGHIỆP VỤ */}
        <div className="p-3.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#326DD8] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-[#17202E]">Nguyên tắc bến bãi Sơn Cảng:</span>
            <p className="text-[12px] text-[#667085] mt-0.5">
              Phương tiện ra vào phát sinh nhiều tình huống: xe bo chở hàng quay vòng nhiều chuyến trong ngày, xe đầu kéo hạ bãi rồi đi ra chưa kịp quẹt cổng ra, hoặc ca trước quên xác nhận xuất bãi. Hệ thống cho phép cấu hình sâu các kịch bản để An ninh kiểm soát chặt chẽ mà không làm tắc cổng.
            </p>
          </div>
        </div>

        {/* THÔNG BÁO PHẢN HỒI */}
        {successMessage && (
          <div className="p-3 bg-[#ECFDF3] border border-[#A6F4C5] rounded-lg text-[#0A9444] text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-[#0A9444] shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-[#FEF3F2] border border-[#FECDCA] text-[#D92D20] rounded-lg text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#D92D20] shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white rounded-lg p-12 text-center border border-[#E5E9F0]">
            <RefreshCw className="w-6 h-6 text-[#326DD8] animate-spin mx-auto mb-2" />
            <p className="text-xs text-[#667085]">Đang nạp cấu hình chính sách từ hệ thống...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* PHẦN 1: CHẾ ĐỘ XỬ LÝ CHÍNH */}
            <div className="bg-white rounded-lg p-4 sm:p-5 border border-[#E5E9F0] space-y-3">
              <div>
                <h2 className="text-xs font-semibold text-[#17202E] uppercase tracking-wider">
                  1. Chế độ xử lý khi phát hiện xe đang trong bãi
                </h2>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  Quyết định hành vi mặc định khi An ninh tiếp nhận biển số xe đang có bản ghi Trong bãi (IN_YARD).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  {
                    code: 'WARN_AND_ALLOW',
                    title: 'Cảnh báo & Cho phép ghi đè (Khuyên dùng)',
                    badge: 'Thực tế Sơn Cảng',
                    desc: 'Hiển thị cảnh báo thông tin lượt cũ. An ninh chọn lý do nghiệp vụ và có thể chọn tự động đóng lượt cũ ngay tại Cổng vào.',
                  },
                  {
                    code: 'BLOCK_STRICT',
                    title: 'Chặn nghiêm ngặt tuyệt đối',
                    badge: 'Khóa cổng',
                    desc: 'Cấm hoàn toàn tiếp nhận xe mới nếu biển số vẫn đang trong bãi (trừ loại xe miễn trừ). Bắt buộc phải xuất bãi tại Cổng ra trước.',
                  },
                  {
                    code: 'AUTO_CLOSE_PREVIOUS',
                    title: 'Tự động xuất bãi lượt cũ & Mở lượt mới',
                    badge: 'Lưu lượng cao',
                    desc: 'Hệ thống tự động kết thúc lượt xe cũ và mở lượt mới mà không cần xác nhận. Thích hợp giờ cao điểm chống ùn tắc.',
                  },
                  {
                    code: 'ALLOW_SILENT',
                    title: 'Cho phép tự do (Không cảnh báo)',
                    badge: 'Mở tự do',
                    desc: 'Bỏ qua kiểm tra trùng lặp xe trong bãi. Hệ thống cho phép tạo các lượt xe mới bình thường và chỉ ghi vết nhật ký audit log.',
                  },
                ].map((m) => {
                  const isSelected = policyMode === m.code;
                  return (
                    <label
                      key={m.code}
                      className={`p-3.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 ${
                        isSelected
                          ? 'border-[#326DD8] bg-[#EFF8FF]'
                          : 'border-[#E5E9F0] hover:border-[#D0D5DD] bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="policy_mode"
                            value={m.code}
                            checked={isSelected}
                            onChange={() => setPolicyMode(m.code as DuplicatePolicyMode)}
                            className="text-[#326DD8] focus:ring-[#326DD8]"
                          />
                          <span className="font-semibold text-xs text-[#17202E]">{m.title}</span>
                        </div>
                        <StatusBadge variant={isSelected ? 'info' : 'neutral'} label={m.badge} />
                      </div>
                      <p className="text-[11px] text-[#667085] leading-relaxed pl-5">
                        {m.desc}
                      </p>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* PHẦN 2: COOLDOWN & CHỐNG NHẤP LẶP */}
            <div className="bg-white rounded-lg p-4 sm:p-5 border border-[#E5E9F0] space-y-3">
              <div>
                <h2 className="text-xs font-semibold text-[#17202E] uppercase tracking-wider">
                  2. Ngưỡng thời gian trùng lặp ngắn (Anti Double-Entry / Cooldown Window)
                </h2>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  Bảo vệ hệ thống khỏi tình huống nhân viên bấm 2 lần liên tiếp hoặc 2 nhân viên cùng thao tác 1 phương tiện.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] space-y-1.5">
                  <label className="block font-semibold text-[#17202E]">
                    Thời gian Cooldown tối thiểu (Phút)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="180"
                      value={cooldownMinutes}
                      onChange={(e) => setCooldownMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                      className="w-28 px-3 py-1.5 font-mono text-sm font-bold border border-[#E5E9F0] rounded-lg bg-white focus:border-[#326DD8] focus:outline-none"
                    />
                    <span className="text-[#667085]">phút kể từ lần vào trước</span>
                  </div>
                  <p className="text-[11px] text-[#98A2B3]">
                    Mặc định: 15 phút.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] space-y-1.5">
                  <label className="block font-semibold text-[#17202E]">
                    Hành vi khi vi phạm Cooldown
                  </label>
                  <div className="space-y-2 pt-1 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cooldown_action"
                        value="BLOCK"
                        checked={cooldownAction === 'BLOCK'}
                        onChange={() => setCooldownAction('BLOCK')}
                        className="text-[#326DD8] focus:ring-[#326DD8]"
                      />
                      <span className="font-medium text-[#17202E]">Chặn tuyệt đối (Khuyên dùng)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="cooldown_action"
                        value="WARN"
                        checked={cooldownAction === 'WARN'}
                        onChange={() => setCooldownAction('WARN')}
                        className="text-[#326DD8] focus:ring-[#326DD8]"
                      />
                      <span className="font-medium text-[#17202E]">Cảnh báo (Cho phép xác nhận tiếp tục)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* PHẦN 3: KIỂM TRA CÔNG NỢ VÉ VÀ TIỆN ÍCH CỔNG VÀO */}
            <div className="bg-white rounded-lg p-4 sm:p-5 border border-[#E5E9F0] space-y-3">
              <div>
                <h2 className="text-xs font-semibold text-[#17202E] uppercase tracking-wider">
                  3. Kiểm soát Tài chính & Tiện ích Thao tác Cổng vào
                </h2>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  Ràng buộc công nợ vé vào cổng của lượt cũ và tiện ích xử lý nhanh cho nhân viên An ninh.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="p-3.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checkUnpaidTicket}
                    onChange={(e) => setCheckUnpaidTicket(e.target.checked)}
                    className="rounded border-[#E5E9F0] text-[#326DD8] focus:ring-[#326DD8] mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-[#17202E]">Kiểm tra công nợ vé lượt cũ</span>
                    <p className="text-[11px] text-[#667085] mt-0.5 leading-relaxed">
                      Phát hiện và cảnh báo nếu xe đang có lượt cũ trong bãi chưa thanh toán tiền vé cổng (UNPAID).
                    </p>
                  </div>
                </label>

                <label className="p-3.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blockIfUnpaidTicket}
                    disabled={!checkUnpaidTicket}
                    onChange={(e) => setBlockIfUnpaidTicket(e.target.checked)}
                    className="rounded border-[#E5E9F0] text-[#326DD8] focus:ring-[#326DD8] mt-0.5 disabled:opacity-50"
                  />
                  <div>
                    <span className="font-semibold text-[#17202E]">Chặn vào cổng nếu còn nợ vé cũ</span>
                    <p className="text-[11px] text-[#667085] mt-0.5 leading-relaxed">
                      Bắt buộc tài xế phải thanh toán vé lượt trước mới cho phép mở lượt xe vào bãi mới.
                    </p>
                  </div>
                </label>

                <label className="p-3.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requireOverrideReason}
                    onChange={(e) => setRequireOverrideReason(e.target.checked)}
                    className="rounded border-[#E5E9F0] text-[#326DD8] focus:ring-[#326DD8] mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-[#17202E]">Bắt buộc chọn lý do khi ghi đè</span>
                    <p className="text-[11px] text-[#667085] mt-0.5 leading-relaxed">
                      Yêu cầu An ninh phải chọn lý do nghiệp vụ giải trình cho việc tiếp nhận xe trùng lặp.
                    </p>
                  </div>
                </label>

                <label className="p-3.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowQuickExitPrevious}
                    onChange={(e) => setAllowQuickExitPrevious(e.target.checked)}
                    className="rounded border-[#E5E9F0] text-[#326DD8] focus:ring-[#326DD8] mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-[#17202E]">Cho phép đóng nhanh lượt cũ tại Cổng vào</span>
                    <p className="text-[11px] text-[#667085] mt-0.5 leading-relaxed">
                      An ninh có thể tick &quot;Đồng thời xuất bãi lượt cũ&quot; giúp làm sạch dữ liệu bãi ngay lập tức.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* PHẦN 4: DANH SÁCH LOẠI PHƯƠNG TIỆN NGOẠI LỆ */}
            <div className="bg-white rounded-lg p-4 sm:p-5 border border-[#E5E9F0] space-y-3">
              <div>
                <h2 className="text-xs font-semibold text-[#17202E] uppercase tracking-wider">
                  4. Danh sách Loại phương tiện Ngoại lệ (Chạy nhiều chuyến liên tục)
                </h2>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  Các loại xe được tích chọn bên dưới sẽ được phép vào nhiều lượt dễ dàng, không bị chặn bởi chế độ &quot;Chặn nghiêm ngặt&quot;.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                {vehicleTypes.map((vt) => {
                  const isExempt = exemptVehicleTypes.includes(vt.code);
                  return (
                    <label
                      key={vt.code}
                      className={`p-3 rounded-lg border transition-colors flex items-center gap-2.5 cursor-pointer ${
                        isExempt
                          ? 'bg-[#EFF8FF] border-[#B2DDFF] text-[#17202E] font-medium'
                          : 'bg-white border-[#E5E9F0] text-[#667085] hover:bg-[#F8F9FB]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isExempt}
                        onChange={() => handleToggleExemptType(vt.code)}
                        className="rounded border-[#E5E9F0] text-[#326DD8] focus:ring-[#326DD8]"
                      />
                      <div className="truncate">
                        <p className="truncate font-semibold text-[#17202E]">{vt.name}</p>
                        <p className="text-[10px] text-[#98A2B3] font-mono">{vt.code}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* PHẦN 5: DANH MỤC LÝ DO MẪU CẤU HÌNH ĐƯỢC */}
            <div className="bg-white rounded-lg p-4 sm:p-5 border border-[#E5E9F0] space-y-3">
              <div>
                <h2 className="text-xs font-semibold text-[#17202E] uppercase tracking-wider">
                  5. Danh mục Lý do mẫu khi tiếp nhận trùng lặp
                </h2>
                <p className="text-[11px] text-[#667085] mt-0.5">
                  Các lý do hiển thị trong hộp chọn trên màn hình Cổng vào để nhân viên An ninh thao tác nhanh.
                </p>
              </div>

              <div className="space-y-1.5">
                {presetReasons.map((r, idx) => (
                  <div
                    key={r.code || idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-white border border-[#E5E9F0] flex items-center justify-center font-mono text-[10px] text-[#667085]">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-[#17202E]">{r.label}</span>
                    </div>
                    {r.code !== 'LY_DO_KHAC' && (
                      <button
                        type="button"
                        onClick={() => handleRemoveReason(r.code)}
                        className="text-[#98A2B3] hover:text-[#D92D20] p-1 rounded hover:bg-[#FEF3F2] transition-colors cursor-pointer"
                        title="Xóa lý do này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Thêm lý do mới */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="text"
                  value={newReasonText}
                  onChange={(e) => setNewReasonText(e.target.value)}
                  placeholder="Nhập lý do nghiệp vụ mẫu mới..."
                  className="flex-1 px-3 py-1.5 text-xs border border-[#E5E9F0] rounded-lg bg-white text-[#17202E] focus:border-[#326DD8] focus:outline-none"
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
                  className="px-3.5 py-1.5 bg-[#326DD8] hover:bg-[#2557B4] text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Thêm lý do</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
