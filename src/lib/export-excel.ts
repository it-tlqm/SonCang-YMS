/**
 * Tiện ích xuất dữ liệu báo cáo sang file Excel (.xlsx) chuẩn Microsoft OpenXML với Styling Chuyên Nghiệp.
 * Tích hợp ExcelJS: Màu sắc thương hiệu, căn lề thông minh, viền ô, định dạng số tiền, ghim cố định dòng (freeze panes).
 * Tương thích 100% với Microsoft Excel (Desktop/Web), Google Sheets, Apple Numbers, LibreOffice.
 * Doanh nghiệp: Công ty Cổ phần Tà Lùng Quang Minh — Bến bãi Sơn Cảng.
 */

import ExcelJS from 'exceljs';
import { 
  ChargeItem, 
  PaymentRecord, 
  VehicleVisit, 
  ContainerVisit, 
  ReeferPowerSession,
  CashSettlement,
  YardInvoice,
  AccountingDebtItem
} from '@/types/domain.types';
import { getVehicleTypeName, formatDateTime } from './display-formatters';

export interface ColumnDefinition {
  label: string;
  align?: 'left' | 'center' | 'right';
  isCurrency?: boolean;
  isNumber?: boolean;
  minWidth?: number;
}

/**
 * Tải file Excel (.xlsx) chuẩn OpenXML workbook về máy client bằng ExcelJS Buffer
 */
export async function downloadWorkbook(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const validFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  link.setAttribute('download', validFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Tải file CSV về máy client (hỗ trợ dự phòng khi cần định dạng text UTF-8 BOM)
 */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const validFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', validFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Bảng màu & Style chuẩn cho Hệ thống Quản lý Bến bãi Sơn Cảng
const THEME = {
  fontFamily: 'Segoe UI',
  navyColor: 'FF1E3A8A',      // Xanh Navy thương hiệu Sơn Cảng
  navyLight: 'FF2563EB',      // Xanh tươi
  headerTextColor: 'FFFFFFFF',// Chữ trắng
  subHeaderBg: 'FFF1F5F9',    // Xám nhạt thanh lịch
  zebraBg: 'FFF8FAFC',        // Xen kẽ dòng
  summaryBg: 'FFFEF3C7',      // Vàng kem tổng cộng
  borderColor: 'FFE2E8F0',    // Viền ô mỏng xám
  borderHeader: 'FF3B82F6',   // Viền header
  borderSummary: 'FF94A3B8',  // Viền tổng cộng
};

/**
 * Helper: Tạo Worksheet với thiết kế chuẩn hóa, căn lề, font chữ, viền kẻ và đóng băng dòng
 */
function createStyledReportSheet(
  workbook: ExcelJS.Workbook,
  sheetName: string,
  reportTitle: string,
  columns: ColumnDefinition[],
  rows: (string | number | null | undefined)[][],
  subTitle?: string,
  summaryRow?: (string | number | null | undefined)[]
): ExcelJS.Worksheet {
  const ws = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 7 }], // Ghim cố định 7 dòng đầu khi cuộn
  });

  const totalCols = columns.length;

  // Dòng 1: Tên doanh nghiệp
  const r1 = ws.addRow(['CÔNG TY CỔ PHẦN TÀ LÙNG QUANG MINH']);
  r1.height = 20;
  r1.getCell(1).font = { name: THEME.fontFamily, size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
  r1.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // Dòng 2: Chi nhánh / Địa chỉ bến bãi
  const r2 = ws.addRow(['BẾN BÃI CỬA KHẨU QUỐC TẾ TÀ LÙNG — TỈNH CAO BẰNG']);
  r2.height = 18;
  r2.getCell(1).font = { name: THEME.fontFamily, size: 9, italic: true, color: { argb: 'FF64748B' } };
  r2.getCell(1).alignment = { vertical: 'middle', horizontal: 'left' };

  // Dòng 3: TÊN BÁO CÁO (Nổi bật, in hoa, màu xanh Navy)
  const r3 = ws.addRow([reportTitle.toUpperCase()]);
  r3.height = 28;
  r3.getCell(1).font = { name: THEME.fontFamily, size: 14, bold: true, color: { argb: THEME.navyColor } };
  r3.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  if (totalCols > 1) {
    ws.mergeCells(3, 1, 3, totalCols);
  }

  // Dòng 4: Phạm vi / Kỳ báo cáo
  const scopeText = subTitle ? `Phạm vi / Kỳ báo cáo: ${subTitle}` : `Thời điểm xuất dữ liệu: ${new Date().toLocaleString('vi-VN')}`;
  const r4 = ws.addRow([scopeText]);
  r4.height = 18;
  r4.getCell(1).font = { name: THEME.fontFamily, size: 9.5, italic: true, color: { argb: 'FF475569' } };
  r4.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  if (totalCols > 1) {
    ws.mergeCells(4, 1, 4, totalCols);
  }

  // Dòng 5: Thời gian lập & Ghi chú tiền tệ
  const r5 = ws.addRow([`Thời gian lập: ${new Date().toLocaleString('vi-VN')} | Đơn vị tiền tệ: Đồng Việt Nam (VNĐ)`]);
  r5.height = 18;
  r5.getCell(1).font = { name: THEME.fontFamily, size: 8.5, color: { argb: 'FF64748B' } };
  r5.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  if (totalCols > 1) {
    ws.mergeCells(5, 1, 5, totalCols);
  }

  // Dòng 6: Dòng trống ngăn cách
  const r6 = ws.addRow([]);
  r6.height = 8;

  // Dòng 7: HEADER CÁC CỘT DỮ LIỆU
  const headerLabels = columns.map((c) => c.label);
  const headerRow = ws.addRow(headerLabels);
  headerRow.height = 28;

  headerRow.eachCell((cell, colNumber) => {
    cell.font = {
      name: THEME.fontFamily,
      size: 10,
      bold: true,
      color: { argb: THEME.headerTextColor },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: THEME.navyColor },
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: THEME.borderHeader } },
      left: { style: 'thin', color: { argb: THEME.borderHeader } },
      bottom: { style: 'medium', color: { argb: THEME.navyColor } },
      right: { style: 'thin', color: { argb: THEME.borderHeader } },
    };
  });

  // Dòng 8 trở đi: DỮ LIỆU
  rows.forEach((rowData, rowIdx) => {
    const row = ws.addRow(rowData);
    row.height = 22;
    const isOdd = rowIdx % 2 === 1;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = columns[colNumber - 1];
      const align = colDef?.align || 'left';
      const isCur = colDef?.isCurrency || false;
      const isNum = colDef?.isNumber || false;

      // Font
      cell.font = {
        name: THEME.fontFamily,
        size: 9.5,
        color: { argb: 'FF1E293B' },
      };

      // Zebra striping
      if (isOdd) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: THEME.zebraBg },
        };
      }

      // Alignment
      cell.alignment = {
        vertical: 'middle',
        horizontal: align,
        wrapText: false,
      };

      // Border
      cell.border = {
        top: { style: 'thin', color: { argb: THEME.borderColor } },
        left: { style: 'thin', color: { argb: THEME.borderColor } },
        bottom: { style: 'thin', color: { argb: THEME.borderColor } },
        right: { style: 'thin', color: { argb: THEME.borderColor } },
      };

      // Number formatting
      if (isCur && typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
      } else if (isNum && typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
      }

      // Highlight trực quan trạng thái
      const strVal = String(cell.value || '');
      if (strVal.includes('Đã thu') || strVal.includes('Đã duyệt') || strVal.includes('✓ Sẵn sàng') || strVal.includes('✓ Bình thường')) {
        cell.font = { name: THEME.fontFamily, size: 9.5, bold: true, color: { argb: 'FF15803D' } };
      } else if (strVal.includes('Chưa thu') || strVal.includes('Chờ duyệt') || strVal.includes('🚨 TỒN QUÁ HẠN') || strVal.includes('⚠️ Chưa đủ')) {
        cell.font = { name: THEME.fontFamily, size: 9.5, bold: true, color: { argb: 'FFB91C1C' } };
      } else if (strVal.includes('⚡ Đang cắm') || strVal.includes('⚠️ Theo dõi') || strVal.includes('Duyệt nợ')) {
        cell.font = { name: THEME.fontFamily, size: 9.5, bold: true, color: { argb: 'FFB45309' } };
      }
    });
  });

  // Dòng TỔNG CỘNG (nếu có)
  if (summaryRow && summaryRow.length > 0) {
    const sumR = ws.addRow(summaryRow);
    sumR.height = 25;

    sumR.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const colDef = columns[colNumber - 1];
      const isCur = colDef?.isCurrency || false;
      const isNum = colDef?.isNumber || false;
      const align = colDef?.align || (isCur || isNum ? 'right' : 'left');

      cell.font = {
        name: THEME.fontFamily,
        size: 10,
        bold: true,
        color: { argb: 'FF0F172A' },
      };

      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: THEME.summaryBg },
      };

      cell.alignment = {
        vertical: 'middle',
        horizontal: colNumber === 1 ? 'center' : align,
      };

      cell.border = {
        top: { style: 'thin', color: { argb: THEME.borderSummary } },
        left: { style: 'thin', color: { argb: THEME.borderColor } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } }, // Viền kép kế toán
        right: { style: 'thin', color: { argb: THEME.borderColor } },
      };

      if ((isCur || isNum) && typeof cell.value === 'number') {
        cell.numFmt = '#,##0';
      }
    });
  }

  // Tự động tính chiều rộng cột tối ưu
  columns.forEach((colDef, idx) => {
    let maxLen = colDef.label.length;
    rows.forEach((r) => {
      const val = r[idx];
      if (val !== null && val !== undefined) {
        const len = typeof val === 'number' && colDef.isCurrency ? val.toLocaleString('vi-VN').length : String(val).length;
        if (len > maxLen) maxLen = len;
      }
    });
    if (summaryRow && summaryRow[idx]) {
      const sLen = String(summaryRow[idx]).length;
      if (sLen > maxLen) maxLen = sLen;
    }

    const calculatedWidth = Math.max(maxLen + 4, colDef.minWidth || 11);
    ws.getColumn(idx + 1).width = Math.min(calculatedWidth, 55);
  });

  return ws;
}

// ============================================================================
// MẪU 1: BẢNG KÊ THU PHÍ CA TRỰC & CHỨNG TỪ NỘP TIỀN
// ============================================================================
export async function exportShiftPaymentsToExcel(payments: PaymentRecord[], shiftTitle: string): Promise<void> {
  const columns: ColumnDefinition[] = [
    { label: 'STT', align: 'center', minWidth: 7 },
    { label: 'Thời gian thu', align: 'center', minWidth: 17 },
    { label: 'Mã biên lai', align: 'center', minWidth: 16 },
    { label: 'Loại phí', align: 'center', minWidth: 14 },
    { label: 'Nội dung khoản thu', align: 'left', minWidth: 28 },
    { label: 'Biển số xe', align: 'center', minWidth: 14 },
    { label: 'Số Container', align: 'center', minWidth: 16 },
    { label: 'Hình thức TT', align: 'center', minWidth: 14 },
    { label: 'Số tiền (VNĐ)', align: 'right', isCurrency: true, minWidth: 16 },
    { label: 'Người thu', align: 'left', minWidth: 18 },
    { label: 'Bộ phận', align: 'center', minWidth: 15 },
    { label: 'Ghi chú', align: 'left', minWidth: 20 },
  ];

  let totalCash = 0;
  let totalTransfer = 0;
  let totalAmount = 0;

  const rows = payments.map((p, idx) => {
    const amount = Number(p.payment_amount) || 0;
    totalAmount += amount;
    if (p.payment_method === 'CASH') totalCash += amount;
    else totalTransfer += amount;

    return [
      idx + 1,
      new Date(p.collected_at).toLocaleString('vi-VN'),
      p.receipt_code || '',
      p.charge_type || '',
      p.charge_title || p.notes || '',
      p.license_plate || '',
      p.container_no || '',
      p.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản',
      amount,
      p.collected_by_name || '',
      p.collector_dept === 'AN_NINH' ? 'An ninh Cổng' : 'Thương vụ CCKB',
      p.notes || '',
    ];
  });

  const summaryRow = [
    'TỔNG CỘNG',
    '',
    '',
    '',
    `Tiền mặt: ${totalCash.toLocaleString('vi-VN')} đ | CK: ${totalTransfer.toLocaleString('vi-VN')} đ`,
    '',
    '',
    '',
    totalAmount,
    '',
    '',
    `Tổng số: ${payments.length} chứng từ`,
  ];

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sơn Cảng YMS';
  wb.created = new Date();

  createStyledReportSheet(
    wb,
    'Bang_Ke_Ca_Truc',
    'BẢNG KÊ THU PHÍ CA TRỰC & CHỨNG TỪ NỘP TIỀN',
    columns,
    rows,
    shiftTitle,
    summaryRow
  );

  const cleanDate = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(wb, `Bao_Cao_Ca_Truc_Son_Cang_${cleanDate}.xlsx`);
}

// ============================================================================
// MẪU 2: SỔ CÁI CÁC KHOẢN THU & CÔNG NỢ BẾN BÃI
// ============================================================================
export async function exportChargesToExcel(charges: ChargeItem[]): Promise<void> {
  const columns: ColumnDefinition[] = [
    { label: 'STT', align: 'center', minWidth: 7 },
    { label: 'Loại phí', align: 'center', minWidth: 15 },
    { label: 'Nội dung khoản thu', align: 'left', minWidth: 28 },
    { label: 'Biển số xe', align: 'center', minWidth: 14 },
    { label: 'Số Container', align: 'center', minWidth: 16 },
    { label: 'Phải thu (VNĐ)', align: 'right', isCurrency: true, minWidth: 16 },
    { label: 'Đã thu (VNĐ)', align: 'right', isCurrency: true, minWidth: 16 },
    { label: 'Còn nợ (VNĐ)', align: 'right', isCurrency: true, minWidth: 16 },
    { label: 'Trạng thái thu', align: 'center', minWidth: 15 },
    { label: 'Thời gian tạo', align: 'center', minWidth: 17 },
    { label: 'Ghi chú', align: 'left', minWidth: 20 },
  ];

  let sumAmount = 0;
  let sumPaid = 0;
  let sumDebt = 0;

  const rows = charges.map((c, idx) => {
    const amount = Number(c.amount) || 0;
    const paid = Number(c.paid_amount) || 0;
    const debt = Math.max(0, amount - paid);

    sumAmount += amount;
    sumPaid += paid;
    sumDebt += debt;

    return [
      idx + 1,
      c.charge_type === 'TICKET' ? 'Vé vào cổng' : c.charge_type === 'REEFER' ? 'Điện Container' : c.charge_type === 'STORAGE' ? 'Phí lưu bãi' : 'Khác',
      c.title,
      c.license_plate || '',
      c.container_no || '',
      amount,
      paid,
      debt,
      c.status === 'PAID' ? 'Đã thu' : c.status === 'UNPAID' ? 'Chưa thu' : c.status === 'EXEMPT' ? 'Miễn phí' : c.status,
      new Date(c.created_at).toLocaleString('vi-VN'),
      c.notes || '',
    ];
  });

  const summaryRow = [
    'TỔNG CỘNG',
    '',
    '',
    '',
    '',
    sumAmount,
    sumPaid,
    sumDebt,
    '',
    '',
    `Tổng: ${charges.length} khoản thu`,
  ];

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sơn Cảng YMS';
  wb.created = new Date();

  createStyledReportSheet(
    wb,
    'So_Cai_Khoan_Thu',
    'SỔ CÁI KHOẢN THU & CÔNG NỢ BẾN BÃI',
    columns,
    rows,
    `Toàn bộ dữ liệu sổ cái (${charges.length} khoản thu)`,
    summaryRow
  );

  const cleanDate = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(wb, `So_Cai_Khoan_Thu_Son_Cang_${cleanDate}.xlsx`);
}

// ============================================================================
// MẪU 3: DANH SÁCH PHƯƠNG TIỆN ĐANG LƯU BÃI (YARD VEHICLES INVENTORY)
// ============================================================================
export async function exportYardVehiclesToExcel(vehicles: VehicleVisit[]): Promise<void> {
  const columns: ColumnDefinition[] = [
    { label: 'STT', align: 'center', minWidth: 7 },
    { label: 'Biển số xe', align: 'center', minWidth: 14 },
    { label: 'Loại phương tiện', align: 'center', minWidth: 18 },
    { label: 'Tên tài xế', align: 'left', minWidth: 18 },
    { label: 'Số điện thoại', align: 'center', minWidth: 14 },
    { label: 'Thời gian vào bãi', align: 'center', minWidth: 17 },
    { label: 'Thời gian đã lưu', align: 'center', minWidth: 16 },
    { label: 'Cảnh báo tồn bãi', align: 'center', minWidth: 20 },
    { label: 'Mã vé cổng', align: 'center', minWidth: 16 },
    { label: 'Tiền vé (VNĐ)', align: 'right', isCurrency: true, minWidth: 15 },
    { label: 'Trạng thái vé', align: 'center', minWidth: 14 },
    { label: 'Phân khu bãi', align: 'center', minWidth: 13 },
    { label: 'Vị trí đỗ', align: 'center', minWidth: 12 },
    { label: 'Ghi chú', align: 'left', minWidth: 18 },
  ];

  let sumTicket = 0;
  const now = Date.now();

  const rows = vehicles.map((v, idx) => {
    const entryTime = new Date(v.entry_at).getTime();
    const diffHours = Math.max(0, (now - entryTime) / (1000 * 60 * 60));
    const dwellText = diffHours < 24 
      ? `${Math.floor(diffHours)}h ${Math.floor((diffHours % 1) * 60)}p` 
      : `${Math.floor(diffHours / 24)} ngày ${Math.floor(diffHours % 24)}h`;

    const dwellStatus = diffHours >= 48 ? '🚨 TỒN QUÁ HẠN (≥48h)' : diffHours >= 24 ? '⚠️ Theo dõi (≥24h)' : '✓ Bình thường (<24h)';
    const ticketAmt = Number(v.ticket_amount) || 0;
    sumTicket += ticketAmt;

    return [
      idx + 1,
      v.license_plate || 'Không biển số',
      getVehicleTypeName(v.vehicle_type_name || v.vehicle_type),
      v.driver_name || '',
      v.driver_phone || '',
      new Date(v.entry_at).toLocaleString('vi-VN'),
      dwellText,
      dwellStatus,
      v.ticket_code || '',
      ticketAmt,
      v.ticket_payment_status === 'PAID' ? 'Đã thu' : v.ticket_payment_status === 'EXEMPT' ? 'Miễn phí' : 'Chưa thu',
      v.yard_zone || '',
      v.slot_code || '',
      v.note || '',
    ];
  });

  const summaryRow = [
    'TỔNG CỘNG',
    `${vehicles.length} phương tiện`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    sumTicket,
    '',
    '',
    '',
    '',
  ];

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sơn Cảng YMS';
  wb.created = new Date();

  createStyledReportSheet(
    wb,
    'Xe_Dang_Trong_Bai',
    'DANH SÁCH PHƯƠNG TIỆN ĐANG TRONG BÃI SƠN CẢNG',
    columns,
    rows,
    `Tồn bãi thời gian thực (${vehicles.length} phương tiện)`,
    summaryRow
  );

  const cleanDate = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(wb, `Danh_Sach_Xe_Trong_Bai_Son_Cang_${cleanDate}.xlsx`);
}

// ============================================================================
// MẪU 4: DANH SÁCH CONTAINER ĐANG TỒN BÃI (CONTAINER INVENTORY)
// ============================================================================
export async function exportYardContainersToExcel(containers: ContainerVisit[]): Promise<void> {
  const columns: ColumnDefinition[] = [
    { label: 'STT', align: 'center', minWidth: 7 },
    { label: 'Số Container', align: 'center', minWidth: 16 },
    { label: 'Kích thước', align: 'center', minWidth: 12 },
    { label: 'Loại Cont', align: 'center', minWidth: 12 },
    { label: 'Hàng / Rỗng', align: 'center', minWidth: 14 },
    { label: 'Thời gian vào bãi', align: 'center', minWidth: 17 },
    { label: 'Thời gian lưu bãi', align: 'center', minWidth: 16 },
    { label: 'Cảnh báo lưu bãi', align: 'center', minWidth: 20 },
    { label: 'Biển số xe chở vào', align: 'center', minWidth: 16 },
    { label: 'Điện Reefer', align: 'center', minWidth: 15 },
    { label: 'Duyệt xuất CCKB', align: 'center', minWidth: 16 },
    { label: 'Phân khu', align: 'center', minWidth: 12 },
    { label: 'Vị trí đỗ', align: 'center', minWidth: 12 },
    { label: 'Ghi chú', align: 'left', minWidth: 18 },
  ];

  const now = Date.now();

  const rows = containers.map((c, idx) => {
    const inTime = new Date(c.inbound_at).getTime();
    const diffHours = Math.max(0, (now - inTime) / (1000 * 60 * 60));
    const dwellText = diffHours < 24 
      ? `${Math.floor(diffHours)}h ${Math.floor((diffHours % 1) * 60)}p` 
      : `${Math.floor(diffHours / 24)} ngày ${Math.floor(diffHours % 24)}h`;

    const dwellStatus = diffHours >= 48 ? '🚨 TỒN QUÁ HẠN (≥48h)' : diffHours >= 24 ? '⚠️ Theo dõi (≥24h)' : '✓ Bình thường (<24h)';

    return [
      idx + 1,
      c.container_no_current,
      c.container_size || '40ft',
      c.container_type || 'RF',
      c.cargo_status === 'HANG' ? 'HÀNG' : c.cargo_status === 'RONG' ? 'RỖNG' : 'Chưa rõ',
      new Date(c.inbound_at).toLocaleString('vi-VN'),
      dwellText,
      dwellStatus,
      c.inbound_license_plate || 'Tồn kho hạ bãi',
      c.is_plugged ? '⚡ Đang cắm điện' : 'Không cắm điện',
      c.clearance_status === 'CLEARED' ? '✓ Đã duyệt' : c.clearance_status === 'CLEARED_WITH_DEBT' ? '⚠️ Duyệt nợ' : 'Chờ CCKB duyệt',
      c.yard_zone || '',
      c.slot_code || '',
      c.notes || '',
    ];
  });

  const summaryRow = [
    'TỔNG CỘNG',
    `${containers.length} container`,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ];

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sơn Cảng YMS';
  wb.created = new Date();

  createStyledReportSheet(
    wb,
    'Container_Ton_Bai',
    'DANH SÁCH CONTAINER ĐANG TỒN BÃI SƠN CẢNG',
    columns,
    rows,
    `Tồn bãi thời gian thực (${containers.length} container)`,
    summaryRow
  );

  const cleanDate = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(wb, `Danh_Sach_Container_Trong_Bai_Son_Cang_${cleanDate}.xlsx`);
}

// ============================================================================
// MẪU 5: BÁO CÁO GIÁM SÁT DỊCH VỤ ĐIỆN CONTAINER LẠNH (REEFER LOGS)
// ============================================================================
export async function exportReeferSessionsToExcel(sessions: ReeferPowerSession[]): Promise<void> {
  const columns: ColumnDefinition[] = [
    { label: 'STT', align: 'center', minWidth: 7 },
    { label: 'Số Container', align: 'center', minWidth: 16 },
    { label: 'Trạng thái nguồn', align: 'center', minWidth: 16 },
    { label: 'Thời điểm cắm điện', align: 'center', minWidth: 17 },
    { label: 'Người cắm', align: 'left', minWidth: 16 },
    { label: 'Thời điểm rút điện', align: 'center', minWidth: 17 },
    { label: 'Người rút', align: 'left', minWidth: 16 },
    { label: 'Thời lượng thực (phút)', align: 'right', isNumber: true, minWidth: 16 },
    { label: 'Thời gian tính cước (Làm tròn 15p)', align: 'center', minWidth: 22 },
    { label: 'Đơn giá giờ (VNĐ/h)', align: 'right', isCurrency: true, minWidth: 16 },
    { label: 'Thành tiền (VNĐ)', align: 'right', isCurrency: true, minWidth: 16 },
    { label: 'Thanh toán', align: 'center', minWidth: 15 },
    { label: 'Ghi chú', align: 'left', minWidth: 18 },
  ];

  let sumAmount = 0;
  let totalBillableMinutes = 0;

  const rows = sessions.map((s, idx) => {
    const isPlugged = s.power_status === 'PLUGGED';
    const amount = Number(s.total_power_amount) || 0;
    sumAmount += amount;

    const billableM = Number(s.billable_minutes) || 0;
    totalBillableMinutes += billableM;

    const durationDisplay = isPlugged
      ? 'Đang kết nối nguồn...'
      : billableM > 0
      ? `${billableM} phút (${Math.round((billableM / 60) * 100) / 100}h)`
      : '0 phút';

    return [
      idx + 1,
      s.container_no,
      isPlugged ? '⚡ Đang cắm điện' : 'Đã rút điện',
      new Date(s.plugged_in_at).toLocaleString('vi-VN'),
      s.plugged_in_by || '',
      s.unplugged_at ? new Date(s.unplugged_at).toLocaleString('vi-VN') : '—',
      s.unplugged_by || '',
      s.raw_duration_seconds ? Math.round(s.raw_duration_seconds / 60) : isPlugged ? 0 : 0,
      durationDisplay,
      Number(s.applied_hourly_rate) || 100000,
      amount,
      s.payment_status === 'PAID' ? 'Đã thu tiền' : s.payment_status === 'EXEMPT' ? 'Miễn phí' : 'Chưa thu',
      s.notes || '',
    ];
  });

  const summaryRow = [
    'TỔNG CỘNG',
    `${sessions.length} phiên cắm`,
    '',
    '',
    '',
    '',
    '',
    '',
    `Tổng: ${totalBillableMinutes} phút (~${Math.round((totalBillableMinutes / 60) * 10) / 10}h)`,
    '',
    sumAmount,
    '',
    '',
  ];

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sơn Cảng YMS';
  wb.created = new Date();

  createStyledReportSheet(
    wb,
    'Dich_Vu_Dien_Reefer',
    'BÁO CÁO GIÁM SÁT DỊCH VỤ ĐIỆN CONTAINER LẠNH (REEFER)',
    columns,
    rows,
    `Thương vụ CCKB bến bãi (${sessions.length} phiên cắm)`,
    summaryRow
  );

  const cleanDate = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(wb, `Bao_Cao_Dien_Reefer_Son_Cang_${cleanDate}.xlsx`);
}

// ============================================================================
// MẪU 6: BÁO CÁO TỔN BÃI & DWELL TIME TỔNG HỢP (WORKBOOK ĐA SHEET)
// ============================================================================
export async function exportYardInventoryReportToExcel(vehicles: VehicleVisit[], containers: ContainerVisit[]): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sơn Cảng YMS';
  wb.created = new Date();

  // Sheet 1: Phương tiện trong bãi
  const vehCols: ColumnDefinition[] = [
    { label: 'STT', align: 'center', minWidth: 7 },
    { label: 'Biển số xe', align: 'center', minWidth: 14 },
    { label: 'Loại xe', align: 'center', minWidth: 18 },
    { label: 'Tài xế', align: 'left', minWidth: 18 },
    { label: 'SĐT', align: 'center', minWidth: 14 },
    { label: 'Thời gian vào bãi', align: 'center', minWidth: 17 },
    { label: 'Mã vé', align: 'center', minWidth: 16 },
    { label: 'Tiền vé (VNĐ)', align: 'right', isCurrency: true, minWidth: 15 },
    { label: 'Tình trạng vé', align: 'center', minWidth: 14 },
    { label: 'Phân khu', align: 'center', minWidth: 12 },
    { label: 'Vị trí đỗ', align: 'center', minWidth: 12 },
  ];
  let totalTicketAmt = 0;
  const vehRows = vehicles.map((v, idx) => {
    const amt = Number(v.ticket_amount) || 0;
    totalTicketAmt += amt;
    return [
      idx + 1,
      v.license_plate || '',
      getVehicleTypeName(v.vehicle_type_name || v.vehicle_type),
      v.driver_name || '',
      v.driver_phone || '',
      new Date(v.entry_at).toLocaleString('vi-VN'),
      v.ticket_code || '',
      amt,
      v.ticket_payment_status === 'PAID' ? 'Đã thu' : 'Chưa thu',
      v.yard_zone || '',
      v.slot_code || '',
    ];
  });
  const vehSummary = ['TỔNG CỘNG', `${vehicles.length} xe`, '', '', '', '', '', totalTicketAmt, '', '', ''];
  createStyledReportSheet(
    wb,
    'Xe_Luu_Bai',
    'TỔNG HỢP PHƯƠNG TIỆN ĐANG LƯU BÃI',
    vehCols,
    vehRows,
    `Tổng số phương tiện: ${vehicles.length}`,
    vehSummary
  );

  // Sheet 2: Container tồn bãi
  const contCols: ColumnDefinition[] = [
    { label: 'STT', align: 'center', minWidth: 7 },
    { label: 'Số Container', align: 'center', minWidth: 16 },
    { label: 'Quy cách vỏ', align: 'center', minWidth: 14 },
    { label: 'Hàng / Rỗng', align: 'center', minWidth: 14 },
    { label: 'Thời gian vào bãi', align: 'center', minWidth: 17 },
    { label: 'Xe chở vào', align: 'center', minWidth: 16 },
    { label: 'Điện Reefer', align: 'center', minWidth: 15 },
    { label: 'Duyệt CCKB', align: 'center', minWidth: 15 },
    { label: 'Phân khu', align: 'center', minWidth: 12 },
    { label: 'Vị trí', align: 'center', minWidth: 12 },
  ];
  const contRows = containers.map((c, idx) => [
    idx + 1,
    c.container_no_current,
    `${c.container_size || '40ft'} — ${c.container_type || 'RF'}`,
    c.cargo_status === 'HANG' ? 'HÀNG' : c.cargo_status === 'RONG' ? 'RỖNG' : 'Chưa rõ',
    new Date(c.inbound_at).toLocaleString('vi-VN'),
    c.inbound_license_plate || '',
    c.is_plugged ? '⚡ Đang cắm' : 'Không cắm',
    c.clearance_status === 'CLEARED' ? '✓ Đã duyệt' : 'Chưa duyệt',
    c.yard_zone || '',
    c.slot_code || '',
  ]);
  const contSummary = ['TỔNG CỘNG', `${containers.length} container`, '', '', '', '', '', '', '', ''];
  createStyledReportSheet(
    wb,
    'Container_Ton_Bai',
    'TỔNG HỢP CONTAINER ĐANG TỒN BÃI',
    contCols,
    contRows,
    `Tổng số container: ${containers.length}`,
    contSummary
  );

  const cleanDate = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(wb, `Bao_Cao_Ton_Bai_Tong_Hop_Son_Cang_${cleanDate}.xlsx`);
}

// ============================================================================
// MẪU 7: BÁO CÁO THỐNG KÊ QUẢN TRỊ & DOANH THU ĐA SHEET (MANAGEMENT REPORT)
// ============================================================================
export async function exportManagementReportToExcel(params: {
  periodTitle: string;
  totalRevenue: number;
  cashRevenue: number;
  transferRevenue: number;
  unpaidAmount: number;
  vehiclesInCount: number;
  vehiclesOutCount: number;
  containersInCount: number;
  reeferPluggedCount: number;
  totalReeferHours: number;
  dailyRows: {
    date: string;
    ticketAmount: number;
    reeferAmount: number;
    storageAmount: number;
    penaltyAmount: number;
    totalAmount: number;
  }[];
  vehicleTypeRows: {
    typeName: string;
    inCount: number;
    outCount: number;
    inYardCount: number;
  }[];
}): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sơn Cảng YMS';
  wb.created = new Date();

  // Sheet 1: Tổng hợp chỉ số KPI
  const kpiCols: ColumnDefinition[] = [
    { label: 'Chỉ số vận hành & tài chính', align: 'left', minWidth: 35 },
    { label: 'Giá trị', align: 'right', isNumber: true, minWidth: 18 },
    { label: 'Đơn vị tính', align: 'center', minWidth: 14 },
  ];
  const kpiRows: (string | number)[][] = [
    ['Tổng doanh thu thực thu', params.totalRevenue, 'VNĐ'],
    ['— Thu bằng Tiền mặt (CASH)', params.cashRevenue, 'VNĐ'],
    ['— Thu bằng Chuyển khoản (TRANSFER)', params.transferRevenue, 'VNĐ'],
    ['Tổng công nợ chưa thu (UNPAID)', params.unpaidAmount, 'VNĐ'],
    ['Tổng lượt phương tiện vào bãi', params.vehiclesInCount, 'Lượt xe'],
    ['Tổng lượt phương tiện rời bãi', params.vehiclesOutCount, 'Lượt xe'],
    ['Tổng số Container vào bãi', params.containersInCount, 'Container'],
    ['Số Container lạnh cắm điện', params.reeferPluggedCount, 'Container'],
    ['Tổng thời gian cắm điện container', params.totalReeferHours, 'Giờ'],
  ];
  createStyledReportSheet(
    wb,
    'Tong_Quan_KPI',
    'BÁO CÁO CHỈ SỐ KPI VẬN HÀNH & TÀI CHÍNH BẾN BÃI',
    kpiCols,
    kpiRows,
    params.periodTitle
  );

  // Sheet 2: Doanh thu theo ngày trong kỳ
  const dailyCols: ColumnDefinition[] = [
    { label: 'Ngày giao dịch', align: 'center', minWidth: 16 },
    { label: 'Vé vào cổng (VNĐ)', align: 'right', isCurrency: true, minWidth: 18 },
    { label: 'Điện Reefer (VNĐ)', align: 'right', isCurrency: true, minWidth: 18 },
    { label: 'Phí lưu bãi (VNĐ)', align: 'right', isCurrency: true, minWidth: 18 },
    { label: 'Phạt mất vé (VNĐ)', align: 'right', isCurrency: true, minWidth: 18 },
    { label: 'Tổng cộng ngày (VNĐ)', align: 'right', isCurrency: true, minWidth: 20 },
  ];
  let sumDailyTicket = 0;
  let sumDailyReefer = 0;
  let sumDailyStorage = 0;
  let sumDailyPenalty = 0;
  let sumDailyTotal = 0;
  const dailyRows = params.dailyRows.map((d) => {
    sumDailyTicket += d.ticketAmount;
    sumDailyReefer += d.reeferAmount;
    sumDailyStorage += d.storageAmount;
    sumDailyPenalty += d.penaltyAmount;
    sumDailyTotal += d.totalAmount;
    return [
      d.date,
      d.ticketAmount,
      d.reeferAmount,
      d.storageAmount,
      d.penaltyAmount,
      d.totalAmount,
    ];
  });
  const dailySummary = [
    'TỔNG CỘNG',
    sumDailyTicket,
    sumDailyReefer,
    sumDailyStorage,
    sumDailyPenalty,
    sumDailyTotal,
  ];
  createStyledReportSheet(
    wb,
    'Doanh_Thu_Theo_Ngay',
    'CHI TIẾT DOANH THU THEO TỪNG NGÀY TRONG KỲ',
    dailyCols,
    dailyRows,
    params.periodTitle,
    dailySummary
  );

  // Sheet 3: Sản lượng xe theo chủng loại
  const vehCols: ColumnDefinition[] = [
    { label: 'Loại phương tiện', align: 'left', minWidth: 26 },
    { label: 'Lượt vào trong kỳ', align: 'right', isNumber: true, minWidth: 18 },
    { label: 'Lượt ra trong kỳ', align: 'right', isNumber: true, minWidth: 18 },
    { label: 'Hiện đang lưu bãi', align: 'right', isNumber: true, minWidth: 18 },
  ];
  let totalIn = 0;
  let totalOut = 0;
  let totalInYard = 0;
  const vehRows = params.vehicleTypeRows.map((v) => {
    totalIn += v.inCount;
    totalOut += v.outCount;
    totalInYard += v.inYardCount;
    return [v.typeName, v.inCount, v.outCount, v.inYardCount];
  });
  const vehSummary = ['TỔNG CỘNG', totalIn, totalOut, totalInYard];
  createStyledReportSheet(
    wb,
    'San_Luong_Xe',
    'SẢN LƯỢNG PHƯƠNG TIỆN THEO CHỦNG LOẠI XE',
    vehCols,
    vehRows,
    params.periodTitle,
    vehSummary
  );

  const cleanDate = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(wb, `Bao_Cao_Thong_Ke_Quan_Tri_Son_Cang_${cleanDate}.xlsx`);
}

// ============================================================================
// MẪU 8: DANH SÁCH XE & CONTAINER ĐÃ XUẤT BÃI (EXIT CLEARANCE HISTORY)
// ============================================================================
export async function exportExitedVehiclesToExcel(exitedVehicles: VehicleVisit[]): Promise<void> {
  const columns: ColumnDefinition[] = [
    { label: 'STT', align: 'center', minWidth: 7 },
    { label: 'Biển số xe', align: 'center', minWidth: 14 },
    { label: 'Loại phương tiện', align: 'center', minWidth: 18 },
    { label: 'Tài xế / SĐT', align: 'left', minWidth: 22 },
    { label: 'Thời gian vào bãi', align: 'center', minWidth: 17 },
    { label: 'Thời gian xuất bãi', align: 'center', minWidth: 17 },
    { label: 'Thời lượng lưu bãi', align: 'center', minWidth: 16 },
    { label: 'Mã vé cổng', align: 'center', minWidth: 16 },
    { label: 'Tiền vé (VNĐ)', align: 'right', isCurrency: true, minWidth: 15 },
    { label: 'Tình trạng vé', align: 'center', minWidth: 14 },
    { label: 'Ghi chú xuất bãi', align: 'left', minWidth: 20 },
  ];

  let sumTicket = 0;

  const rows = exitedVehicles.map((v, idx) => {
    const entryTime = new Date(v.entry_at).getTime();
    const exitTime = v.exit_at ? new Date(v.exit_at).getTime() : entryTime;
    const diffHours = Math.max(0, (exitTime - entryTime) / (1000 * 60 * 60));
    const dwellText = diffHours < 24 
      ? `${Math.floor(diffHours)}h ${Math.floor((diffHours % 1) * 60)}p` 
      : `${Math.floor(diffHours / 24)} ngày ${Math.floor(diffHours % 24)}h`;

    const ticketAmt = Number(v.ticket_amount) || 0;
    sumTicket += ticketAmt;

    return [
      idx + 1,
      v.license_plate || 'Không biển số',
      getVehicleTypeName(v.vehicle_type_name || v.vehicle_type),
      `${v.driver_name || '—'} (${v.driver_phone || '—'})`,
      new Date(v.entry_at).toLocaleString('vi-VN'),
      v.exit_at ? new Date(v.exit_at).toLocaleString('vi-VN') : '—',
      dwellText,
      v.ticket_code || '',
      ticketAmt,
      v.ticket_payment_status === 'PAID' ? 'Đã thu' : v.ticket_payment_status === 'EXEMPT' ? 'Miễn phí' : 'Chưa thu',
      v.note || '',
    ];
  });

  const summaryRow = [
    'TỔNG CỘNG',
    `${exitedVehicles.length} lượt xe đã ra`,
    '',
    '',
    '',
    '',
    '',
    '',
    sumTicket,
    '',
    '',
  ];

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sơn Cảng YMS';
  wb.created = new Date();

  createStyledReportSheet(
    wb,
    'Lich_Su_Xuat_Bai',
    'BÁO CÁO PHƯƠNG TIỆN ĐÃ XUẤT BÃI SƠN CẢNG',
    columns,
    rows,
    `Lịch sử xe hoàn tất thủ tục xuất bãi (${exitedVehicles.length} lượt xe)`,
    summaryRow
  );

  const cleanDate = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(wb, `Lich_Su_Xuat_Bai_Son_Cang_${cleanDate}.xlsx`);
}

// ============================================================================
// BÁO CÁO KẾ TOÁN BẾN BÃI ĐA SHEET (ACCOUNTING SUB-SYSTEM)
// ============================================================================
export async function exportAccountingReportExcel(params: {
  settlements: CashSettlement[];
  invoices: YardInvoice[];
  debts: AccountingDebtItem[];
  payments: PaymentRecord[];
  dateRangeStr?: string;
}): Promise<void> {
  const { settlements, invoices, debts, payments, dateRangeStr } = params;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Phòng Kế toán — Bến bãi Sơn Cảng';
  wb.created = new Date();

  const subTitle = dateRangeStr || `Kỳ báo cáo đến ngày ${new Date().toLocaleDateString('vi-VN')}`;

  // --------------------------------------------------------------------------
  // SHEET 1: DOANH THU & DÒNG TIỀN (SỔ QUỸ)
  // --------------------------------------------------------------------------
  const sheet1Cols: ColumnDefinition[] = [
    { label: 'STT', align: 'center', isNumber: true, minWidth: 6 },
    { label: 'Mã phiếu / Giao dịch', align: 'left', minWidth: 20 },
    { label: 'Thời gian thu', align: 'center', minWidth: 18 },
    { label: 'Bộ phận thu', align: 'left', minWidth: 16 },
    { label: 'Nhân viên thu', align: 'left', minWidth: 22 },
    { label: 'Hình thức TT', align: 'center', minWidth: 16 },
    { label: 'Số tiền (VNĐ)', align: 'right', isCurrency: true, minWidth: 18 },
    { label: 'Ghi chú / Đối soát', align: 'left', minWidth: 30 }
  ];

  let sumPaymentAmount = 0;
  const sheet1Rows = payments.map((p, idx) => {
    sumPaymentAmount += p.payment_amount;
    const deptStr = p.collector_dept === 'AN_NINH' ? 'An ninh cổng' : p.collector_dept === 'CCKB' ? 'Thương vụ CCKB' : 'Kế toán';
    const methodStr = p.payment_method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản (VietQR)';
    return [
      idx + 1,
      p.receipt_code || p.id.substring(0, 12),
      formatDateTime(p.collected_at),
      deptStr,
      p.collected_by_name || 'Nhân viên',
      methodStr,
      p.payment_amount,
      p.notes || ''
    ];
  });

  const sheet1Summary = [
    'TỔNG CỘNG DOANH THU THU VỀ:',
    `${payments.length} giao dịch`,
    '',
    '',
    '',
    '',
    sumPaymentAmount,
    ''
  ];

  createStyledReportSheet(
    wb,
    'Doanh_Thu_Dong_Tien',
    'BÁO CÁO DOANH THU & DÒNG TIỀN BẾN BÃI SƠN CẢNG',
    sheet1Cols,
    sheet1Rows,
    subTitle,
    sheet1Summary
  );

  // --------------------------------------------------------------------------
  // SHEET 2: BẢNG KÊ CHỐT TIỀN MẶT HIỆN TRƯỜNG
  // --------------------------------------------------------------------------
  const sheet2Cols: ColumnDefinition[] = [
    { label: 'STT', align: 'center', isNumber: true, minWidth: 6 },
    { label: 'Mã biên bản chốt', align: 'left', minWidth: 24 },
    { label: 'Thời gian chốt', align: 'center', minWidth: 18 },
    { label: 'Bộ phận bàn giao', align: 'left', minWidth: 18 },
    { label: 'Người giao (Hiện trường)', align: 'left', minWidth: 24 },
    { label: 'Người nhận (Kế toán)', align: 'left', minWidth: 22 },
    { label: 'Tiền sổ sách (VNĐ)', align: 'right', isCurrency: true, minWidth: 18 },
    { label: 'Tiền thực đếm (VNĐ)', align: 'right', isCurrency: true, minWidth: 18 },
    { label: 'Chênh lệch (VNĐ)', align: 'right', isCurrency: true, minWidth: 16 },
    { label: 'Chuyển khoản đối soát', align: 'right', isCurrency: true, minWidth: 20 },
    { label: 'Lý do chênh lệch', align: 'left', minWidth: 26 },
    { label: 'Trạng thái', align: 'center', minWidth: 14 }
  ];

  let sumCashExpected = 0;
  let sumCashCounted = 0;
  let sumDiff = 0;
  let sumTransferSettle = 0;

  const sheet2Rows = settlements.map((s, idx) => {
    sumCashExpected += s.total_cash_expected;
    sumCashCounted += s.total_cash_counted;
    sumDiff += s.difference_amount;
    sumTransferSettle += s.total_transfer_amount;
    const deptStr = s.handover_dept === 'AN_NINH' ? 'An ninh cổng' : s.handover_dept === 'CCKB' ? 'Thương vụ CCKB' : 'Toàn bãi';

    return [
      idx + 1,
      s.settlement_code,
      formatDateTime(s.created_at),
      deptStr,
      s.handover_person_name,
      s.collector_name,
      s.total_cash_expected,
      s.total_cash_counted,
      s.difference_amount,
      s.total_transfer_amount,
      s.difference_reason || 'Khớp 100%',
      s.status === 'COMPLETED' ? 'Đã nộp quỹ' : s.status
    ];
  });

  const sheet2Summary = [
    'TỔNG CỘNG CHỐT TIỀN:',
    `${settlements.length} đợt chốt`,
    '',
    '',
    '',
    '',
    sumCashExpected,
    sumCashCounted,
    sumDiff,
    sumTransferSettle,
    '',
    ''
  ];

  createStyledReportSheet(
    wb,
    'Bang_Ke_Chot_Tien_Mat',
    'BẢNG KÊ CHỐT VÀ THU TIỀN MẶT HIỆN TRƯỜNG VỀ QUỸ',
    sheet2Cols,
    sheet2Rows,
    subTitle,
    sheet2Summary
  );

  // --------------------------------------------------------------------------
  // SHEET 3: SỔ HÓA ĐƠN GTGT (MST & CCCD)
  // --------------------------------------------------------------------------
  const sheet3Cols: ColumnDefinition[] = [
    { label: 'STT', align: 'center', isNumber: true, minWidth: 6 },
    { label: 'Mã đề xuất', align: 'left', minWidth: 18 },
    { label: 'Số HĐĐT', align: 'left', minWidth: 16 },
    { label: 'Đối tượng', align: 'center', minWidth: 16 },
    { label: 'Người mua hàng / Đơn vị', align: 'left', minWidth: 26 },
    { label: 'Mã số thuế / CCCD (12 số)', align: 'left', minWidth: 20 },
    { label: 'Địa chỉ người mua', align: 'left', minWidth: 32 },
    { label: 'Thuế suất', align: 'center', minWidth: 12 },
    { label: 'Doanh thu trước thuế', align: 'right', isCurrency: true, minWidth: 18 },
    { label: 'Tiền thuế VAT', align: 'right', isCurrency: true, minWidth: 16 },
    { label: 'Tổng tiền thanh toán', align: 'right', isCurrency: true, minWidth: 18 },
    { label: 'Trạng thái HĐ', align: 'center', minWidth: 16 },
    { label: 'Ngày phát hành', align: 'center', minWidth: 16 }
  ];

  let sumSubtotal = 0;
  let sumVat = 0;
  let sumInvoiceTotal = 0;

  const sheet3Rows = invoices.map((inv, idx) => {
    sumSubtotal += inv.subtotal_amount;
    sumVat += inv.vat_amount;
    sumInvoiceTotal += inv.total_amount;

    return [
      idx + 1,
      inv.invoice_code,
      inv.e_invoice_no || 'Chờ xuất',
      inv.invoice_type === 'COMPANY' ? 'Doanh nghiệp (MST)' : 'Cá nhân (CCCD)',
      inv.buyer_name,
      inv.tax_code || inv.id_card_no || '',
      inv.buyer_address,
      `${inv.vat_rate}%`,
      inv.subtotal_amount,
      inv.vat_amount,
      inv.total_amount,
      inv.status === 'INVOICED' ? 'Đã xuất HĐĐT' : 'Chờ xuất HĐ',
      inv.invoice_issued_at ? formatDateTime(inv.invoice_issued_at) : '---'
    ];
  });

  const sheet3Summary = [
    'TỔNG CỘNG HÓA ĐƠN:',
    `${invoices.length} hóa đơn`,
    '',
    '',
    '',
    '',
    '',
    '',
    sumSubtotal,
    sumVat,
    sumInvoiceTotal,
    '',
    ''
  ];

  createStyledReportSheet(
    wb,
    'So_Hoa_Don_GTGT',
    'SỔ THEO DÕI PHÁT HÀNH HÓA ĐƠN GTGT (MST & CCCD 12 SỐ)',
    sheet3Cols,
    sheet3Rows,
    subTitle,
    sheet3Summary
  );

  // --------------------------------------------------------------------------
  // SHEET 4: SỔ THEO DÕI CÔNG NỢ BẾN BÃI (AP07)
  // --------------------------------------------------------------------------
  const sheet4Cols: ColumnDefinition[] = [
    { label: 'STT', align: 'center', isNumber: true, minWidth: 6 },
    { label: 'Mã khoản nợ', align: 'left', minWidth: 16 },
    { label: 'Khách hàng / Chủ cont', align: 'left', minWidth: 24 },
    { label: 'Số điện thoại', align: 'center', minWidth: 14 },
    { label: 'Số Container', align: 'left', minWidth: 16 },
    { label: 'Biển số xe', align: 'left', minWidth: 14 },
    { label: 'Loại phí nợ', align: 'left', minWidth: 18 },
    { label: 'Người duyệt AP07', align: 'left', minWidth: 20 },
    { label: 'Tổng tiền nợ (VNĐ)', align: 'right', isCurrency: true, minWidth: 16 },
    { label: 'Đã thu (VNĐ)', align: 'right', isCurrency: true, minWidth: 16 },
    { label: 'Dư nợ còn lại (VNĐ)', align: 'right', isCurrency: true, minWidth: 18 },
    { label: 'Ghi chú', align: 'left', minWidth: 24 }
  ];

  let sumDebtTotal = 0;
  let sumDebtPaid = 0;
  let sumDebtRemaining = 0;

  const sheet4Rows = debts.map((d, idx) => {
    sumDebtTotal += d.total_amount;
    sumDebtPaid += d.paid_amount;
    sumDebtRemaining += d.debt_amount;

    return [
      idx + 1,
      d.charge_id.substring(0, 10),
      d.customer_name,
      d.customer_phone || '',
      d.container_no || '',
      d.license_plate || '',
      d.charge_title,
      d.guarantor_name || 'Trưởng ca',
      d.total_amount,
      d.paid_amount,
      d.debt_amount,
      d.notes || ''
    ];
  });

  const sheet4Summary = [
    'TỔNG CỘNG CÔNG NỢ:',
    `${debts.length} khoản nợ`,
    '',
    '',
    '',
    '',
    '',
    '',
    sumDebtTotal,
    sumDebtPaid,
    sumDebtRemaining,
    ''
  ];

  createStyledReportSheet(
    wb,
    'So_Theo_Doi_Cong_No',
    'SỔ THEO DÕI CÔNG NỢ BẾN BÃI XUẤT TRƯỚC TRẢ SAU (AP07)',
    sheet4Cols,
    sheet4Rows,
    subTitle,
    sheet4Summary
  );

  const cleanDate = new Date().toISOString().slice(0, 10);
  await downloadWorkbook(wb, `Bao_Cao_Ke_Toan_Son_Cang_${cleanDate}.xlsx`);
}

// ============================================================================
// TƯƠNG THÍCH NGƯỢC (BACKWARD COMPATIBILITY ALIASES)
// ============================================================================
export const exportShiftPaymentsToCsv = exportShiftPaymentsToExcel;
export const exportChargesToCsv = exportChargesToExcel;
export const exportYardVehiclesToCsv = exportYardVehiclesToExcel;
export const exportYardContainersToCsv = exportYardContainersToExcel;
export const exportManagementReportToCsv = exportManagementReportToExcel;

