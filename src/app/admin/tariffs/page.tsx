'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { TariffItem } from '@/types/domain.types';
import { 
  DollarSign, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft, 
  Edit3, 
  RefreshCw,
  Search,
  Check,
  X,
  Lock,
  Layers,
  Zap,
  Truck,
  FileText,
  CopyCheck
} from 'lucide-react';

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
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 text-center max-w-lg mx-auto shadow-xs mt-10">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Khu vực Quản trị Biểu phí</h2>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Tài khoản <strong>{user?.fullName || user?.roleName}</strong> không có quyền quản trị biểu phí (<code>admin.billing_settings.manage</code>). Chức năng này chỉ dành cho Quản trị viên hệ thống (<code>SYS_ADMIN</code>).
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-xs font-bold text-white bg-[#223873] hover:bg-[#1a2c5a] rounded-xl transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Về trang Tổng quan</span>
        </Link>
      </div>
    );
  }

  const filteredTariffs = tariffs.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Header & Điều hướng */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#E3E8EF] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#0A9444] flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase text-[#0A9444]">
                Quản trị Tài chính & Giá cước
              </span>
              <h1 className="text-lg sm:text-xl font-black text-[#223873] mt-0.5">
                Bảng giá & Biểu phí Dịch vụ Bến bãi Sơn Cảng
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>
            <Link
              href="/admin/vehicle-types"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-xs font-bold text-purple-800 hover:bg-purple-100 transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Xem Loại xe →</span>
            </Link>
            <Link
              href="/admin/vehicle-duplicate"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-xs font-bold text-blue-800 hover:bg-blue-100 transition-colors"
            >
              <CopyCheck className="w-3.5 h-3.5" />
              <span>Chính sách trùng xe →</span>
            </Link>
          </div>
        </div>

        {/* THÔNG BÁO NGUYÊN TẮC BẤT BIẾN V5 */}
        <div className="mt-4 p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-emerald-950 text-xs flex items-start space-x-2.5">
          <CheckCircle2 className="w-4 h-4 text-[#0A9444] shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-bold text-[#0A9444]">Nguyên tắc toàn vẹn tài chính V5:</strong>
            <p className="text-[11px] text-emerald-900 mt-0.5">
              Hệ thống áp dụng snapshot biểu phí tại thời điểm giao dịch phát sinh. Việc điều chỉnh giá tại đây sẽ áp dụng cho các lượt xe/container <strong>vào bãi mới</strong>, không làm thay đổi các khoản thu và sổ cái lịch sử đã chốt.
            </p>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0A9444] shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-700 hover:underline cursor-pointer font-bold">
            Đóng
          </button>
        </div>
      )}

      {/* Tìm kiếm & Bảng Biểu phí */}
      <div className="bg-white rounded-2xl border border-[#E3E8EF] shadow-xs overflow-hidden space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên dịch vụ, mã phí..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0A9444]"
            />
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            Tổng cộng: <strong>{filteredTariffs.length}</strong> mục giá
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Mã biểu phí</th>
                <th className="px-4 py-3">Tên dịch vụ niêm yết</th>
                <th className="px-4 py-3">Đơn vị tính</th>
                <th className="px-4 py-3">Đơn giá áp dụng</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredTariffs.map((t, idx) => (
                <tr key={t.code} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-4 py-3 text-slate-400 font-semibold">{idx + 1}</td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{t.code}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">
                    <div>{t.name}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-700">
                      {t.unit}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono font-black text-sm text-[#0A9444]">
                      {t.amount.toLocaleString('vi-VN')} đ
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-[#0A9444]" />
                      Đang hiệu lực
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(t)}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 text-[#223873] hover:bg-blue-100 transition-colors font-bold text-[11px] cursor-pointer border border-blue-200"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Sửa đơn giá</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ĐIỀU CHỈNH ĐƠN GIÁ */}
      {editingTariff && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center space-x-2 text-[#223873]">
                <Edit3 className="w-5 h-5 text-[#0A9444]" />
                <h3 className="text-base font-black">Điều chỉnh Đơn giá Biểu phí</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTariff(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSavePrice} className="space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã dịch vụ:</span>
                  <span className="font-mono font-bold text-slate-900">{editingTariff.code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tên dịch vụ:</span>
                  <span className="font-bold text-slate-800">{editingTariff.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đơn vị:</span>
                  <span className="font-semibold text-slate-700">{editingTariff.unit}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đơn giá hiện hành:</span>
                  <span className="font-mono font-bold text-slate-600">
                    {editingTariff.amount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  Đơn giá mới (VNĐ) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  step={1000}
                  min={0}
                  required
                  className="w-full px-3 py-2 border-2 border-slate-300 rounded-xl font-mono text-base font-black text-[#0A9444] focus:outline-none focus:border-[#0A9444]"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 mb-1">
                  Lý do / Căn cứ văn bản điều chỉnh <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="VD: Quyết định điều chỉnh giá số 05/QĐ-TLQM ngày 12/10/2026..."
                  rows={2}
                  required
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#223873]"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-relaxed">
                ⚠️ <strong>Lưu ý:</strong> Hành động này sẽ được ghi nhận vào Nhật ký Kiểm toán (Audit Logs) của hệ thống bến bãi.
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingTariff(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Xác nhận áp dụng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
