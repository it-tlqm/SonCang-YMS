'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { TariffItem } from '@/types/domain.types';
import { 
  DollarSign, 
  ShieldAlert, 
  AlertCircle, 
  ArrowLeft, 
  Edit3, 
  RefreshCw,
  Check, 
  X,
  Truck,
  CopyCheck
} from 'lucide-react';
import { WorkspaceHeader } from '@/components/workspace/workspace-header';
import { SearchInput } from '@/components/workspace/search-input';
import { StatusBadge } from '@/components/workspace/status-badge';

export default function TariffsAdminPage() {
  const { user, can, repository, role } = useAuth();

  // Kiểm tra quyền quản trị biểu phí theo RBAC V5
  const isAllowed = can('admin.billing_settings.manage') || role === 'SYS_ADMIN';

  const [tariffs, setTariffs] = useState<TariffItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal chỉnh sửa đơn giá
  const [editingTariff, setEditingTariff] = useState<TariffItem | null>(null);
  const [newAmount, setNewAmount] = useState<number>(0);
  const [editReason, setEditReason] = useState<string>('');
  const [editError, setEditError] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  useEffect(() => {
    let isMounted = true;
    repository.getTariffs().then((list) => {
      if (isMounted) {
        setTariffs(list);
        setIsLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [repository]);

  const handleRefresh = async () => {
    setIsLoading(true);
    const list = await repository.getTariffs();
    setTariffs(list);
    setIsLoading(false);
  };

  const handleOpenEdit = (item: TariffItem) => {
    setEditingTariff(item);
    setNewAmount(item.amount);
    setEditReason('');
    setEditError('');
  };

  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTariff) return;

    if (newAmount < 0) {
      setEditError('Đơn giá không được âm.');
      return;
    }

    if (!editReason.trim() || editReason.trim().length < 5) {
      setEditError('Bắt buộc nhập lý do điều chỉnh đơn giá theo quy định tài chính (tối thiểu 5 ký tự).');
      return;
    }

    // Cập nhật giá thông qua repository chuẩn
    repository.updateTariff(editingTariff.code, newAmount, editReason.trim()).then((res) => {
      if (!res.success) {
        setEditError(res.error || 'Lỗi khi cập nhật biểu phí.');
        return;
      }

      // Cập nhật giá trên danh sách hiển thị
      const updated = tariffs.map((t) =>
        t.code === editingTariff.code ? { ...t, amount: newAmount } : t
      );
      setTariffs(updated);

      setSuccessMsg(`Đã cập nhật đơn giá mới cho dịch vụ "${editingTariff.name}": ${newAmount.toLocaleString('vi-VN')} đ`);
      setEditingTariff(null);
    }).catch((err) => {
      setEditError(err?.message || 'Lỗi kết nối khi cập nhật đơn giá.');
    });
  };

  if (!isAllowed) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 bg-[#FFFFFF]">
        <div className="bg-white rounded-xl p-6 sm:p-8 border border-[#E5E9F0] text-center max-w-md w-full shadow-xs">
          <ShieldAlert className="w-10 h-10 text-[#D92D20] mx-auto mb-3" />
          <h2 className="text-base font-semibold text-[#17202E]">Giới hạn quyền truy cập</h2>
          <p className="text-xs text-[#667085] mt-2 leading-relaxed">
            Tài khoản của bạn không có quyền quản trị biểu phí. Chức năng này chỉ dành cho Quản trị viên hệ thống.
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

  const filteredTariffs = tariffs.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white">
      {/* 1. WORKSPACE HEADER */}
      <WorkspaceHeader
        title="Bảng giá & Biểu phí Dịch vụ Bến bãi"
        subtitle="Snapshot biểu phí dịch vụ niêm yết theo quy định tài chính Sơn Cảng"
        icon={DollarSign}
        badge={
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#ECFDF3] text-[#0A9444] border border-[#A6F4C5]">
            {tariffs.length} dịch vụ
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E9F0] text-xs font-medium text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
            <Link
              href="/admin/vehicle-types"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E9F0] text-xs font-medium text-[#17202E] hover:bg-[#F8F9FB] transition-colors"
            >
              <Truck className="w-3.5 h-3.5 text-[#667085]" />
              <span>Loại xe</span>
            </Link>
            <Link
              href="/admin/vehicle-duplicate"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] text-xs font-semibold text-[#326DD8] hover:bg-[#F1F4F8] transition-colors"
            >
              <CopyCheck className="w-3.5 h-3.5" />
              <span>Chính sách trùng xe</span>
            </Link>
          </div>
        }
      />

      <div className="p-4 sm:p-5 space-y-4 max-w-5xl">
        {/* THÔNG BÁO NGUYÊN TẮC BẤT BIẾN */}
        <div className="p-3.5 rounded-lg bg-[#F8F9FB] border border-[#E5E9F0] text-xs flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-[#0A9444] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-[#17202E]">Nguyên tắc toàn vẹn tài chính:</span>
            <p className="text-[12px] text-[#667085] mt-0.5">
              Hệ thống áp dụng snapshot biểu phí tại thời điểm giao dịch phát sinh. Việc điều chỉnh giá tại đây sẽ áp dụng cho các lượt xe/container <strong>vào bãi mới</strong>, không làm thay đổi các khoản thu và sổ cái lịch sử đã chốt.
            </p>
          </div>
        </div>

        {/* Thông báo cập nhật thành công */}
        {successMsg && (
          <div className="p-3 bg-[#ECFDF3] border border-[#A6F4C5] rounded-lg text-[#0A9444] text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-[#0A9444] shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button 
              type="button"
              onClick={() => setSuccessMsg('')} 
              className="text-[#0A9444] hover:underline cursor-pointer font-semibold text-xs"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Search & Table card */}
        <div className="bg-white rounded-lg border border-[#E5E9F0] overflow-hidden">
          <div className="p-3.5 border-b border-[#E5E9F0] bg-[#F8F9FB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="w-full sm:w-72">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Tìm mã hoặc tên dịch vụ..."
              />
            </div>
            <span className="text-xs text-[#667085]">
              Tổng số: <strong className="text-[#17202E]">{filteredTariffs.length}</strong> dịch vụ niêm yết
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FB] border-b border-[#E5E9F0] text-[#667085] font-semibold">
                <tr>
                  <th className="px-4 py-2.5 w-12 text-center">STT</th>
                  <th className="px-4 py-2.5">Mã biểu phí</th>
                  <th className="px-4 py-2.5">Tên dịch vụ niêm yết</th>
                  <th className="px-4 py-2.5">Đơn vị tính</th>
                  <th className="px-4 py-2.5">Đơn giá áp dụng</th>
                  <th className="px-4 py-2.5 text-center">Trạng thái</th>
                  <th className="px-4 py-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9F0]">
                {filteredTariffs.map((t, idx) => (
                  <tr key={t.code} className="hover:bg-[#F8F9FB] transition-colors">
                    <td className="px-4 py-3 text-[#98A2B3] text-center font-mono">{idx + 1}</td>
                    <td className="px-4 py-3 font-mono font-semibold text-[#17202E]">{t.code}</td>
                    <td className="px-4 py-3 font-medium text-[#17202E]">{t.name}</td>
                    <td className="px-4 py-3">
                      <span className="bg-[#F5F7FA] px-2 py-0.5 rounded text-[11px] font-medium text-[#667085] border border-[#E5E9F0]">
                        {t.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-xs text-[#0A9444]">
                        {t.amount.toLocaleString('vi-VN')} đ
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge variant="success" label="Hiệu lực" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(t)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F8F9FB] border border-[#E5E9F0] text-[#326DD8] hover:bg-[#EFF8FF] transition-colors font-medium text-xs cursor-pointer"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Sửa giá</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL ĐIỀU CHỈNH ĐƠN GIÁ */}
      {editingTariff && (
        <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#E5E9F0] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E5E9F0] pb-3 -mx-5 px-5 -mt-1">
              <div>
                <span className="text-[10px] font-bold text-[#326DD8] uppercase tracking-wider block">
                  Biểu phí Dịch vụ
                </span>
                <h3 className="text-sm font-bold text-[#17202E] flex items-center gap-1.5 mt-0.5">
                  <Edit3 className="w-4 h-4 text-[#326DD8]" />
                  Điều chỉnh Đơn giá Biểu phí
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTariff(null)}
                className="p-1.5 rounded-lg text-[#667085] hover:text-[#17202E] hover:bg-[#F8F9FB] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-lg bg-[#FEF3F2] border border-[#FECDCA] text-[#B42318] text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-[#D92D20]" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSavePrice} className="space-y-3.5 text-xs">
              <div className="bg-[#F8F9FB] p-3.5 rounded-xl border border-[#E5E9F0] space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#667085]">Mã dịch vụ:</span>
                  <span className="font-mono font-semibold text-[#17202E]">{editingTariff.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Tên dịch vụ:</span>
                  <span className="font-medium text-[#17202E] text-right truncate max-w-[220px]">{editingTariff.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#667085]">Đơn vị tính:</span>
                  <span className="text-[#17202E]">{editingTariff.unit}</span>
                </div>
                <div className="flex justify-between border-t border-[#E5E9F0] pt-1.5 mt-1">
                  <span className="text-[#667085]">Đơn giá hiện hành:</span>
                  <span className="font-mono font-bold text-[#17202E]">
                    {editingTariff.amount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Đơn giá mới (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  step={1000}
                  min={0}
                  required
                  className="w-full px-3 py-2 border border-[#D0D5DD] rounded-lg font-mono text-base font-bold text-[#0A9444] focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] bg-white transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#344054] mb-1">
                  Lý do / Căn cứ văn bản điều chỉnh <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="VD: Quyết định điều chỉnh giá số 05/QĐ-TLQM..."
                  rows={2}
                  required
                  className="w-full p-2.5 border border-[#D0D5DD] rounded-lg text-xs font-medium text-[#17202E] focus:outline-none focus:ring-2 focus:ring-[#326DD8]/20 focus:border-[#326DD8] bg-white transition-all resize-none"
                />
              </div>

              <div className="p-3 bg-[#F8F9FB] border border-[#E5E9F0] rounded-xl text-[11px] text-[#667085] leading-relaxed">
                Lưu ý: Thao tác điều chỉnh đơn giá sẽ được ghi nhận vào Nhật ký Kiểm toán của bến bãi.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E9F0] -mx-5 px-5 -mb-1">
                <button
                  type="button"
                  onClick={() => setEditingTariff(null)}
                  className="py-2 px-4 text-xs font-semibold text-[#344054] bg-white hover:bg-[#F8F9FB] rounded-lg border border-[#D0D5DD] transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="py-2 px-4 text-xs font-semibold text-white bg-[#0A9444] hover:bg-[#087a38] rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Áp dụng đơn giá</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
