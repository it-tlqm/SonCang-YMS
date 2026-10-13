'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { ChargeItem, TariffItem, ChargeType } from '@/types/domain.types';
import { 
  DollarSign, 
  Search, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Lock,
  Receipt,
  Truck,
  Zap,
  Clock,
  Tag
} from 'lucide-react';

export default function CashierBillingPage() {
  const { user, role, yardId, can, repository } = useAuth();

  // Kiểm tra quyền theo RBAC V5
  const canCollectReefer = can('reefer.payment.collect'); // Chỉ CCKB
  const canCollectStorage = can('storage.payment.collect'); // An ninh AP07 hoặc CCKB
  const isSecurityRole = role === 'SEC_STAFF' || role === 'SEC_LEAD';

  const [charges, setCharges] = useState<ChargeItem[]>([]);
  const [tariffs, setTariffs] = useState<TariffItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | ChargeType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNPAID' | 'PAID'>('ALL');

  // Modal Thu tiền
  const [showCollectModal, setShowCollectModal] = useState<boolean>(false);
  const [selectedCharge, setSelectedCharge] = useState<ChargeItem | null>(null);
  const [payMethod, setPayMethod] = useState<'CASH' | 'TRANSFER'>('CASH');
  const [receiptCode, setReceiptCode] = useState<string>('');
  const [payNotes, setPayNotes] = useState<string>('');
  const [collectError, setCollectError] = useState<string>('');
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string>('');

  // Tải dữ liệu ban đầu
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      repository.getCharges(yardId),
      repository.getTariffs(),
    ])
      .then(([chargeList, tariffList]) => {
        if (isMounted) {
          setCharges(chargeList);
          setTariffs(tariffList);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải dữ liệu tài chính:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => { isMounted = false; };
  }, [repository, yardId]);

  const handleManualRefresh = () => {
    setIsLoading(true);
    Promise.all([
      repository.getCharges(yardId),
      repository.getTariffs(),
    ])
      .then(([chargeList, tariffList]) => {
        setCharges(chargeList);
        setTariffs(tariffList);
      })
      .catch((err) => {
        console.error('Lỗi tải dữ liệu tài chính:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  // Mở modal thu tiền
  const handleOpenCollect = (charge: ChargeItem) => {
    // RBAC GUARD TRỌNG YẾU:
    if (charge.charge_type === 'REEFER' && isSecurityRole) {
      alert('VI PHẠM PHÂN QUYỀN V5: An ninh TUYỆT ĐỐI KHÔNG được phép thu tiền điện container! Thao tác này thuộc thẩm quyền của bộ phận CCKB.');
      return;
    }

    setSelectedCharge(charge);
    setCollectError('');
    setPayMethod('CASH');
    const receiptSuffix = charge.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || '000001';
    setReceiptCode(`PT-${receiptSuffix}`);
    setPayNotes('');
    setShowCollectModal(true);
  };

  const handleConfirmCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCharge) return;

    const dept = isSecurityRole ? 'AN_NINH' : 'CCKB';

    const res = await repository.collectPayment({
      chargeId: selectedCharge.id,
      amount: selectedCharge.amount - selectedCharge.paid_amount,
      paymentMethod: payMethod,
      operatorId: user?.id || 'operator',
      operatorDept: dept,
      receiptCode,
      notes: payNotes,
    });

    if (res.error) {
      setCollectError(res.error);
    } else {
      setShowCollectModal(false);
      setActionSuccessMsg(`Đã ghi nhận thu thành công ${(selectedCharge.amount - selectedCharge.paid_amount).toLocaleString()}đ cho khoản "${selectedCharge.title}"`);
      handleManualRefresh();
    }
  };

  // Lọc danh sách
  const filteredCharges = charges.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      c.title.toLowerCase().includes(q) ||
      (c.container_no && c.container_no.toLowerCase().includes(q)) ||
      (c.license_plate && c.license_plate.toLowerCase().includes(q));
    const matchesType = typeFilter === 'ALL' || c.charge_type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  const totalUnpaid = charges
    .filter((c) => c.status === 'UNPAID')
    .reduce((acc, curr) => acc + (curr.amount - curr.paid_amount), 0);

  const totalPaid = charges
    .filter((c) => c.status === 'PAID')
    .reduce((acc, curr) => acc + curr.paid_amount, 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-[#223873] flex items-center gap-2">
            <Receipt className="w-7 h-7 text-[#0A9444]" />
            Sổ cái Thu phí & Tài chính Sơn Cảng
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý các khoản phải thu, lịch sử thanh toán và đối soát tài chính bến bãi
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

      {/* KPI Tóm tắt tài chính */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-rose-500 uppercase">Công nợ / Chưa thanh toán</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">{totalUnpaid.toLocaleString()} đ</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#0A9444] uppercase">Đã thực thu</p>
            <p className="text-2xl font-bold text-[#0A9444] mt-1">{totalPaid.toLocaleString()} đ</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <DollarSign className="w-6 h-6 text-[#0A9444]" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Biểu phí hiệu lực</p>
            <p className="text-2xl font-bold text-[#223873] mt-1">{tariffs.length} mục giá</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl">
            <Tag className="w-6 h-6 text-[#223873]" />
          </div>
        </div>
      </div>

      {/* Bộ lọc và Tìm kiếm */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo cont, biển số, tên khoản thu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#223873]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Lọc loại phí */}
          {(['ALL', 'TICKET', 'REEFER', 'STORAGE'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                typeFilter === t
                  ? 'bg-[#223873] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t === 'ALL' && 'Tất cả loại'}
              {t === 'TICKET' && 'Vé vào cổng'}
              {t === 'REEFER' && 'Tiền điện'}
              {t === 'STORAGE' && 'Phí lưu cont'}
            </button>
          ))}

          <span className="text-gray-300">|</span>

          {/* Lọc trạng thái */}
          {(['ALL', 'UNPAID', 'PAID'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                statusFilter === st
                  ? 'bg-[#0A9444] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'ALL' && 'Tất cả'}
              {st === 'UNPAID' && 'Chưa thu'}
              {st === 'PAID' && 'Đã thu'}
            </button>
          ))}
        </div>
      </div>

      {/* Layout 2 cột: Danh sách khoản thu (trái) và Biểu phí tham khảo V5 (phải) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Danh sách khoản thu */}
        <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#223873] uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Sổ cái các khoản thu ({filteredCharges.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Loại phí</th>
                  <th className="px-4 py-3">Nội dung / Đối tượng</th>
                  <th className="px-4 py-3">Số tiền</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Thời gian tạo</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCharges.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                      Không có khoản thu nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredCharges.map((c) => {
                    const isPaid = c.status === 'PAID';
                    const isReefer = c.charge_type === 'REEFER';
                    const isStorage = c.charge_type === 'STORAGE';

                    // An ninh TUYỆT ĐỐI KHÔNG được thu tiền điện theo RBAC V5
                    // Phí lưu bãi cần quyền storage.payment.collect (AP07)
                    let isForbidden = false;
                    let forbiddenReason = '';

                    if (isReefer) {
                      if (isSecurityRole) {
                        isForbidden = true;
                        forbiddenReason = 'Nhân sự An ninh không thực hiện thu tiền điện lạnh (Nghiệp vụ thuộc Thương vụ CCKB)!';
                      } else if (!canCollectReefer) {
                        isForbidden = true;
                        forbiddenReason = 'Tài khoản cần có quyền thu phí điện lạnh để thực hiện thao tác này!';
                      }
                    } else if (isStorage && !canCollectStorage) {
                      isForbidden = true;
                      forbiddenReason = 'Tài khoản cần có quyền thu phí lưu bãi để thực hiện thao tác này!';
                    }

                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs">
                          {c.charge_type === 'TICKET' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#223873]">
                              <Truck className="w-3 h-3" /> Vé xe
                            </span>
                          )}
                          {c.charge_type === 'REEFER' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                              <Zap className="w-3 h-3 text-amber-500" /> Tiền điện
                            </span>
                          )}
                          {c.charge_type === 'STORAGE' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700">
                              <Clock className="w-3 h-3 text-purple-500" /> Phí lưu cont
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <p className="font-semibold text-gray-800">{c.title}</p>
                          <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                            {c.container_no && <span className="font-mono text-[#223873] font-bold">Cont: {c.container_no}</span>}
                            {c.license_plate && <span className="font-mono font-bold">Xe: {c.license_plate}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-bold text-sm text-gray-900">
                          {c.amount.toLocaleString()} đ
                        </td>
                        <td className="px-4 py-3">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#0A9444]">
                              <CheckCircle2 className="w-3 h-3" /> Đã thu
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
                              <AlertTriangle className="w-3 h-3" /> Chưa thu
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(c.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!isPaid ? (
                            isForbidden ? (
                              <button
                                disabled
                                title={forbiddenReason}
                                className="px-3 py-1.5 text-xs text-gray-400 bg-gray-100 border border-gray-200 rounded-lg cursor-not-allowed font-medium inline-flex items-center gap-1"
                              >
                                <Lock className="w-3 h-3" /> Khóa quyền
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenCollect(c)}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-lg shadow-sm transition-colors"
                              >
                                Thu tiền
                              </button>
                            )
                          ) : (
                            <span className="text-xs text-gray-400 italic">Hoàn tất</span>
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

        {/* Cột phụ: Biểu phí tham khảo V5 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
          <div className="border-b pb-2">
            <h2 className="text-sm font-bold text-[#223873] uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-amber-500" />
              Biểu phí quy chuẩn V5
            </h2>
            <p className="text-[11px] text-gray-500 mt-0.5">Biểu phí Sơn Cảng đã chốt, áp dụng Four-Eyes AP10</p>
          </div>

          <div className="space-y-3">
            {tariffs.map((tf) => (
              <div key={tf.id} className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                <p className="font-semibold text-gray-800">{tf.name}</p>
                <div className="flex items-center justify-between mt-1 text-gray-500 text-[11px]">
                  <span>{tf.unit}</span>
                  <span className="font-bold text-[#223873]">
                    {tf.amount === 0 ? '0 đ (Miễn phí)' : `${tf.amount.toLocaleString()} đ`}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] space-y-1">
            <p className="font-bold">⚠️ Quy tắc phân quyền thu tiền:</p>
            <p>• <b>An ninh:</b> Thu vé vào cổng & phí lưu bãi phát sinh khi cont ra (AP07).</p>
            <p>• <b>CCKB:</b> Quản lý thu tiền điện container & duyệt ngoại lệ nợ.</p>
            <p>• <b>An ninh KHÔNG được thu tiền điện.</b></p>
          </div>
        </div>
      </div>

      {/* MODAL THU TIỀN */}
      {showCollectModal && selectedCharge && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#223873] flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#0A9444]" />
                Lập Phiếu thu tiền
              </h3>
              <button
                onClick={() => setShowCollectModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {collectError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {collectError}
              </div>
            )}

            <div className="bg-gray-50 p-3 rounded-xl space-y-1 text-xs">
              <p><span className="text-gray-500">Khoản thu:</span> <span className="font-bold text-gray-800">{selectedCharge.title}</span></p>
              <p><span className="text-gray-500">Số tiền cần thu:</span> <span className="font-bold text-lg text-[#0A9444]">{(selectedCharge.amount - selectedCharge.paid_amount).toLocaleString()} VND</span></p>
              <p><span className="text-gray-500">Bộ phận thu:</span> <span className="font-semibold text-[#223873]">{isSecurityRole ? 'An ninh Cổng' : 'CCKB'}</span></p>
            </div>

            <form onSubmit={handleConfirmCollect} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Phương thức thanh toán
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayMethod('CASH')}
                    className={`p-2.5 text-xs font-bold rounded-lg border text-center transition-colors ${
                      payMethod === 'CASH'
                        ? 'border-[#0A9444] bg-emerald-50 text-[#0A9444]'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    💵 Tiền mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayMethod('TRANSFER')}
                    className={`p-2.5 text-xs font-bold rounded-lg border text-center transition-colors ${
                      payMethod === 'TRANSFER'
                        ? 'border-[#223873] bg-blue-50 text-[#223873]'
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    📱 Chuyển khoản
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mã biên lai / Phiếu thu
                </label>
                <input
                  type="text"
                  value={receiptCode}
                  onChange={(e) => setReceiptCode(e.target.value)}
                  required
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Ghi chú phiếu thu
                </label>
                <textarea
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Ghi chú người nộp, số điện thoại hoặc lý do..."
                  rows={2}
                  className="w-full p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCollectModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-white bg-[#0A9444] hover:bg-[#087C3C] rounded-lg font-bold shadow-sm"
                >
                  Xác nhận Thu tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
