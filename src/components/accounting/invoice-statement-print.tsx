'use client';

import React from 'react';
import { YardInvoice, ChargeItem } from '@/types/domain.types';
import { Printer, X, FileSpreadsheet } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/display-formatters';

interface InvoiceStatementPrintProps {
  invoice: YardInvoice;
  charges?: ChargeItem[];
  onClose: () => void;
}

// Đọc số tiền thành chữ tiếng Việt
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

export function InvoiceStatementPrint({ invoice, charges = [], onClose }: InvoiceStatementPrintProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101828]/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in print:p-0 print:bg-white print:static print:inset-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl border border-[#E5E9F0] shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:border-none print:rounded-none">
        
        {/* Print Toolbar */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-[#E5E9F0] text-[#17202E] print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-sm text-[#17202E]">Bảng kê chi tiết Mẫu số 01:BPA</span>
            <span className="text-[11px] bg-[#EFF4FE] text-[#326DD8] border border-[#B2CCFF] px-2.5 py-0.5 rounded-full font-mono font-bold">
              {invoice.e_invoice_no ? `HĐ: ${invoice.e_invoice_no}` : invoice.invoice_code}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0A9444] hover:bg-[#087a38] text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Bảng Kê (Mẫu 01:BPA)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[#667085] hover:text-[#17202E] hover:bg-[#F8F9FB] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Paper Content */}
        <div className="p-8 sm:p-12 print:p-6 text-slate-900 bg-white font-sans text-xs">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-300 pb-5 mb-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">CÔNG TY CỔ PHẦN TÀ LÙNG QUANG MINH</p>
              <p className="font-bold text-sm text-blue-900 mt-0.5">BẾN BÃI / CẢNG CẠN SƠN CẢNG</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Mã số thuế: 4800889218</p>
              <p className="text-[11px] text-slate-500">Địa chỉ: Thị trấn Tà Lùng, Huyện Quảng Hòa, Tỉnh Cao Bằng</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-xs text-slate-800 uppercase">MẪU SỐ: 01:BPA</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Kèm theo HĐĐT số: <span className="font-mono font-bold text-slate-900">{invoice.e_invoice_no || invoice.invoice_code}</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Ngày: {formatDateTime(invoice.invoice_issued_at || invoice.created_at)}
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center my-5">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
              BẢNG KÊ CHI TIẾT DỊCH VỤ BẾN BÃI & CẮM ĐIỆN CONT LẠNH
            </h1>
            <p className="text-[11px] text-slate-500 italic mt-0.5">
              (Dùng đính kèm hóa đơn giá trị gia tăng gửi khách hàng / đối tác logistics)
            </p>
          </div>

          {/* Buyer Details */}
          <div className="border border-slate-300 rounded-lg p-3.5 mb-5 bg-slate-50/50 space-y-1.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <p className="text-slate-700">
                <span className="font-bold text-slate-900">
                  {invoice.invoice_type === 'COMPANY' ? 'Tên đơn vị mua hàng:' : 'Họ và tên người mua hàng:'}
                </span>{' '}
                <span className="font-semibold text-blue-950">{invoice.buyer_name}</span>
              </p>
              <p className="text-slate-700">
                <span className="font-bold text-slate-900">
                  {invoice.invoice_type === 'COMPANY' ? 'Mã số thuế doanh nghiệp:' : 'Số Căn cước công dân (12 số):'}
                </span>{' '}
                <span className="font-mono font-bold text-blue-900">
                  {invoice.tax_code || invoice.id_card_no || '---'}
                </span>
              </p>
            </div>
            <p className="text-slate-700">
              <span className="font-bold text-slate-900">Địa chỉ:</span> {invoice.buyer_address}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {invoice.buyer_phone && (
                <p className="text-slate-700">
                  <span className="font-bold text-slate-900">Điện thoại:</span> {invoice.buyer_phone}
                </p>
              )}
              {invoice.buyer_email && (
                <p className="text-slate-700">
                  <span className="font-bold text-slate-900">Email:</span> {invoice.buyer_email}
                </p>
              )}
            </div>
          </div>

          {/* Details Table */}
          <div className="mb-5">
            <table className="w-full border-collapse border border-slate-300 text-[11px]">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-300 px-2 py-1.5 text-center w-10">STT</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Số Container / Biển số xe</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left">Nội dung dịch vụ</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-center w-16">ĐVT</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-right w-16">SL</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-right w-28">Đơn giá đã VAT</th>
                  <th className="border border-slate-300 px-2 py-1.5 text-right w-32">Thành tiền (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                {charges.length > 0 ? (
                  charges.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="border border-slate-300 px-2 py-1 text-center">{idx + 1}</td>
                      <td className="border border-slate-300 px-2 py-1 font-mono font-bold text-slate-900">
                        {c.container_no || c.license_plate || '---'}
                      </td>
                      <td className="border border-slate-300 px-2 py-1">
                        {c.notes || (c.charge_type === 'REEFER' ? 'Dịch vụ cắm điện bảo quản container lạnh' : 'Phí dịch vụ bến bãi')}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-center">
                        {c.charge_type === 'REEFER' ? 'Giờ' : 'Lượt'}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono">1</td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatCurrency(c.amount)}</td>
                      <td className="border border-slate-300 px-2 py-1 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(c.amount)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="border border-slate-300 px-2 py-1 text-center">1</td>
                    <td className="border border-slate-300 px-2 py-1 font-mono font-bold text-slate-900">
                      Gộp {invoice.charge_ids.length} khoản thu
                    </td>
                    <td className="border border-slate-300 px-2 py-1">
                      {invoice.notes || 'Dịch vụ bến bãi và cắm điện container theo bảng kê'}
                    </td>
                    <td className="border border-slate-300 px-2 py-1 text-center">Lô</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">1</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono">{formatCurrency(invoice.total_amount)}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(invoice.total_amount)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={6} className="border border-slate-300 px-3 py-1.5 text-right">
                    Cộng tiền dịch vụ trước thuế GTGT (Tách ngược):
                  </td>
                  <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-bold">
                    {formatCurrency(invoice.subtotal_amount)}
                  </td>
                </tr>
                <tr className="bg-slate-50 font-semibold">
                  <td colSpan={6} className="border border-slate-300 px-3 py-1.5 text-right">
                    Thuế suất GTGT: {invoice.vat_rate}% — Tiền thuế GTGT:
                  </td>
                  <td className="border border-slate-300 px-3 py-1.5 text-right font-mono font-bold text-blue-900">
                    {formatCurrency(invoice.vat_amount)}
                  </td>
                </tr>
                <tr className="bg-blue-100/50 font-bold text-xs">
                  <td colSpan={6} className="border border-slate-300 px-3 py-2 text-right uppercase text-blue-950">
                    TỔNG CỘNG TIỀN THANH TOÁN (ĐÃ GỒM THUẾ GTGT):
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-right font-mono font-black text-blue-900 text-sm">
                    {formatCurrency(invoice.total_amount)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Bằng chữ */}
            <div className="mt-2.5 p-2.5 bg-slate-50 border border-slate-200 rounded text-xs">
              <span className="font-semibold text-slate-700">Số tiền viết bằng chữ: </span>
              <span className="italic font-bold text-slate-900">
                {numberToVietnameseWords(invoice.total_amount)}
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <p className="font-bold text-slate-800 uppercase">NGƯỜI MUA HÀNG</p>
              <p className="text-slate-500 text-[11px] mt-0.5">(Ký, ghi rõ họ tên)</p>
              <div className="h-20"></div>
              <p className="font-bold text-slate-900">{invoice.buyer_name}</p>
            </div>
            <div>
              <p className="font-bold text-slate-800 uppercase">NGƯỜI LẬP BIỂU</p>
              <p className="text-slate-500 text-[11px] mt-0.5">(Ký, ghi rõ họ tên)</p>
              <div className="h-20"></div>
              <p className="font-bold text-slate-900">{invoice.created_by}</p>
              <p className="text-slate-500 text-[11px]">Kế toán viên</p>
            </div>
            <div>
              <p className="font-bold text-slate-800 uppercase">THỦ TRƯỞNG ĐƠN VỊ</p>
              <p className="text-slate-500 text-[11px] mt-0.5">(Ký, đóng dấu)</p>
              <div className="h-20"></div>
              <p className="font-bold text-slate-900">BAN GIÁM ĐỐC</p>
              <p className="text-slate-500 text-[11px]">Cty CP Tà Lùng Quang Minh</p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
