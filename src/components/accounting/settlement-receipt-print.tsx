'use client';

import React from 'react';
import { CashSettlement, PaymentRecord } from '@/types/domain.types';
import { Printer, X, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/display-formatters';

interface SettlementReceiptPrintProps {
  settlement: CashSettlement;
  items?: PaymentRecord[];
  onClose: () => void;
}

// Hàm đọc số tiền thành chữ tiếng Việt cho biên bản kế toán
function numberToVietnameseWords(num: number): string {
  if (num === 0) return 'Không đồng';
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readThreeDigits(n: number, showZeroHundred: boolean): string {
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;
    const tens = Math.floor(remainder / 10);
    const ones = remainder % 10;
    let res = '';

    if (hundreds > 0 || showZeroHundred) {
      res += digits[hundreds] + ' trăm ';
    }
    if (tens > 1) {
      res += digits[tens] + ' mươi ';
      if (ones === 1) res += 'mốt ';
      else if (ones === 5) res += 'lăm ';
      else if (ones > 0) res += digits[ones] + ' ';
    } else if (tens === 1) {
      res += 'mười ';
      if (ones === 5) res += 'lăm ';
      else if (ones > 0) res += digits[ones] + ' ';
    } else if (ones > 0) {
      if (hundreds > 0 || showZeroHundred) res += 'lẻ ';
      res += digits[ones] + ' ';
    }
    return res;
  }

  let s = '';
  let i = 0;
  let n = Math.abs(Math.round(num));

  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      const chunkStr = readThreeDigits(chunk, i > 0 && n >= 1000);
      s = chunkStr + units[i] + ' ' + s;
    }
    n = Math.floor(n / 1000);
    i++;
  }

  s = s.trim();
  if (s) {
    s = s.charAt(0).toUpperCase() + s.slice(1) + ' đồng chẵn.';
  }
  return s || 'Không đồng';
}

export function SettlementReceiptPrint({ settlement, items = [], onClose }: SettlementReceiptPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  const getDeptName = (dept: string) => {
    switch (dept) {
      case 'AN_NINH': return 'Bốt An ninh Cổng';
      case 'CCKB': return 'Quầy Thương vụ Cảng cạn CCKB';
      default: return 'Toàn bộ Bến bãi Hiện trường';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto print:p-0 print:bg-white print:static print:inset-auto">
      {/* Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none">
        
        {/* Print Toolbar - ẩn khi in */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-lg">Biên bản Bàn giao Tiền mặt</span>
            <span className="text-xs bg-emerald-600 px-2.5 py-1 rounded-full font-mono">
              {settlement.settlement_code}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm transition"
            >
              <Printer className="w-4 h-4" />
              In Biên Bản
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Content for Printing */}
        <div className="p-8 sm:p-12 print:p-6 text-slate-900 bg-white font-sans text-sm">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-300 pb-6 mb-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">CÔNG TY CỔ PHẦN TÀ LÙNG QUANG MINH</p>
              <p className="font-bold text-base text-blue-900 mt-1">BẾN BÃI / CẢNG CẠN SƠN CẢNG</p>
              <p className="text-xs text-slate-500 mt-0.5">Địa chỉ: Cửa khẩu Quốc tế Tà Lùng, Phục Hòa, Cao Bằng</p>
              <p className="text-xs text-slate-500">Phòng Tài chính - Kế toán</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500">Mẫu số: 02/BB-BGTM</p>
              <p className="font-mono text-sm font-bold text-slate-900 mt-1">Số: {settlement.settlement_code}</p>
              <p className="text-xs text-slate-500 mt-0.5">Ngày lập: {formatDateTime(settlement.created_at)}</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center my-6">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
              BIÊN BẢN BÀN GIAO THU TIỀN MẶT CA TRỰC
            </h1>
            <p className="text-xs text-slate-600 mt-1 italic">
              (Kèm theo bảng kê chi tiết các phiếu thu hiện trường nộp về Quỹ Kế toán)
            </p>
          </div>

          {/* Metadata Section */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-800">Bộ phận bàn giao:</span>{' '}
                {getDeptName(settlement.handover_dept)}
              </p>
              <p className="text-slate-600 mt-1.5">
                <span className="font-semibold text-slate-800">Đại diện bên giao (Hiện trường):</span>{' '}
                <span className="font-medium text-slate-900">{settlement.handover_person_name}</span>
              </p>
              <p className="text-slate-600 mt-1.5">
                <span className="font-semibold text-slate-800">Khoảng thời gian ca trực:</span>{' '}
                Từ {formatDateTime(settlement.period_from)} đến {formatDateTime(settlement.period_to)}
              </p>
            </div>
            <div>
              <p className="text-slate-600">
                <span className="font-semibold text-slate-800">Đại diện bên nhận (Kế toán Quỹ):</span>{' '}
                <span className="font-medium text-slate-900">{settlement.collector_name}</span>
              </p>
              <p className="text-slate-600 mt-1.5">
                <span className="font-semibold text-slate-800">Địa điểm bàn giao:</span>{' '}
                Văn phòng Kế toán Bến bãi Sơn Cảng
              </p>
              <p className="text-slate-600 mt-1.5">
                <span className="font-semibold text-slate-800">Số lượng phiếu thu chốt:</span>{' '}
                <span className="font-bold text-blue-700">{settlement.item_count || items.length} phiếu</span>
              </p>
            </div>
          </div>

          {/* Tổng Hợp Tiền Bàn Giao */}
          <div className="mb-6">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              I. TỔNG HỢP TIỀN THỰC ĐẾM VÀ ĐỐI SOÁT SỔ SÁCH
            </h2>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-300 px-3 py-2 text-center w-12">STT</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">Chỉ tiêu bàn giao</th>
                  <th className="border border-slate-300 px-3 py-2 text-right w-44">Số tiền (VNĐ)</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">Ghi chú đối soát</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-3 py-2.5 text-center">1</td>
                  <td className="border border-slate-300 px-3 py-2.5 font-medium">Tiền mặt phát sinh theo hệ thống (Sổ cái)</td>
                  <td className="border border-slate-300 px-3 py-2.5 text-right font-mono font-semibold">
                    {formatCurrency(settlement.total_cash_expected)}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-slate-600">
                    Tổng cộng các phiếu thu tiền mặt trong ca
                  </td>
                </tr>
                <tr className="bg-blue-50/50">
                  <td className="border border-slate-300 px-3 py-2.5 text-center font-bold">2</td>
                  <td className="border border-slate-300 px-3 py-2.5 font-bold text-blue-900">
                    TIỀN MẶT THỰC ĐẾM BÀN GIAO NỘP QUÝ
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-right font-mono font-black text-blue-700 text-sm">
                    {formatCurrency(settlement.total_cash_counted)}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-blue-800 font-medium">
                    Kế toán đếm tay và xác nhận nhập quỹ
                  </td>
                </tr>
                <tr className={settlement.difference_amount !== 0 ? 'bg-amber-50' : ''}>
                  <td className="border border-slate-300 px-3 py-2.5 text-center">3</td>
                  <td className="border border-slate-300 px-3 py-2.5">
                    Chênh lệch kiểm đếm (Thực tế - Sổ sách)
                  </td>
                  <td className={`border border-slate-300 px-3 py-2.5 text-right font-mono font-bold ${settlement.difference_amount === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {settlement.difference_amount > 0 ? '+' : ''}{formatCurrency(settlement.difference_amount)}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-slate-700">
                    {settlement.difference_reason ? (
                      <span className="font-medium text-amber-800">Lý do: {settlement.difference_reason}</span>
                    ) : (
                      <span className="text-emerald-700 font-medium">Khớp 100% không lệch</span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-3 py-2.5 text-center">4</td>
                  <td className="border border-slate-300 px-3 py-2.5 text-slate-600">
                    Tiền chuyển khoản VietQR trong kỳ (Tham khảo)
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-right font-mono text-slate-600">
                    {formatCurrency(settlement.total_transfer_amount)}
                  </td>
                  <td className="border border-slate-300 px-3 py-2.5 text-slate-500 italic">
                    Tài khoản ngân hàng công ty (Không nộp tiền mặt)
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Đọc số tiền bằng chữ */}
            <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded text-xs">
              <span className="font-semibold text-slate-700">Số tiền nộp quỹ bằng chữ: </span>
              <span className="italic font-bold text-slate-900">
                {numberToVietnameseWords(settlement.total_cash_counted)}
              </span>
            </div>
          </div>

          {/* Danh Sách Chi Tiết Phiếu Thu (Nếu có) */}
          {items.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                II. DANH SÁCH CÁC PHIẾU THU TIỀN MẶT ĐÃ CHỐT VÀO BIÊN BẢN
              </h2>
              <table className="w-full border-collapse border border-slate-300 text-[11px]">
                <thead>
                  <tr className="bg-slate-100 text-slate-800">
                    <th className="border border-slate-300 px-2 py-1.5 text-center w-10">STT</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">Mã phiếu / Phiếu thu</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-center">Giờ thu</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">Bộ phận</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-left">Người thu</th>
                    <th className="border border-slate-300 px-2 py-1.5 text-right">Số tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => (
                    <tr key={it.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-2 py-1 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 px-2 py-1 font-mono font-medium">{it.receipt_code || it.id.substring(0, 13)}</td>
                      <td className="border border-slate-300 px-2 py-1 text-center text-slate-600">{formatDateTime(it.collected_at)}</td>
                      <td className="border border-slate-300 px-2 py-1">{it.collector_dept === 'AN_NINH' ? 'An ninh cổng' : 'CCKB thương vụ'}</td>
                      <td className="border border-slate-300 px-2 py-1 text-slate-700">{it.collected_by_name || 'Nhân viên'}</td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono font-medium">{formatCurrency(it.payment_amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signature Block */}
          <div className="mt-10 pt-4 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
            <div>
              <p className="font-bold text-slate-800 uppercase">ĐẠI DIỆN BÊN GIAO (HIỆN TRƯỜNG)</p>
              <p className="text-slate-500 text-[11px] mt-0.5">(Ký, ghi rõ họ tên)</p>
              <div className="h-24"></div>
              <p className="font-bold text-slate-900 text-sm">{settlement.handover_person_name}</p>
              <p className="text-slate-500 text-[11px]">{getDeptName(settlement.handover_dept)}</p>
            </div>
            <div>
              <p className="font-bold text-slate-800 uppercase">ĐẠI DIỆN BÊN NHẬN (KẾ TOÁN QUỸ)</p>
              <p className="text-slate-500 text-[11px] mt-0.5">(Ký, ghi rõ họ tên và đóng dấu)</p>
              <div className="h-24"></div>
              <p className="font-bold text-slate-900 text-sm">{settlement.collector_name}</p>
              <p className="text-slate-500 text-[11px]">Phòng Tài chính - Kế toán</p>
            </div>
          </div>

          <div className="mt-8 text-center text-[10px] text-slate-400 print:block">
            Biên bản được lập thành 02 bản có giá trị như nhau: 01 bản lưu tại Phòng Kế toán, 01 bản lưu tại Bốt trực hiện trường.
          </div>
        </div>

      </div>
    </div>
  );
}
