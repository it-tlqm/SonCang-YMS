/**
 * display-formatters.ts — Tiện ích chuyển đổi mã kỹ thuật sang tên hiển thị tiếng Việt chuẩn nghiệp vụ Sơn Cảng
 * Loại bỏ hoàn toàn việc hiển thị mã cứng (CONT_LANH, DAU_KEO, RF, DC...) trên giao diện người dùng.
 */

// Bảng ánh xạ mã loại phương tiện chuẩn V5
export const VEHICLE_TYPE_NAMES: Record<string, string> = {
  CONT_LANH: 'Xe container lạnh',
  DAU_KEO: 'Xe đầu kéo không moóc',
  XE_BO_4_CHAN: 'Xe bo 4 chân tải thùng',
  XE_BO_3_CHAN: 'Xe bo 3 chân tải thùng',
  XE_BO_8_TAN_2_CHAN: 'Xe bo 8 tấn 2 chân',
  XE_BO_3_BANH: 'Xe bo 3 bánh nội bộ',
  XE_SANG_TAI: 'Xe sang tải nội bộ',
};

// Bảng ánh xạ loại vỏ container
export const CONTAINER_TYPE_NAMES: Record<string, string> = {
  RF: 'Container Lạnh',
  DC: 'Container Khô',
  OT: 'Container Mở nóc',
  FR: 'Container Mặt phẳng',
  HC: 'Container Cao (HC)',
};

/**
 * Trả về tên tiếng Việt của loại phương tiện
 */
export function getVehicleTypeName(code: string | null | undefined): string {
  if (!code) return 'Chưa phân loại';
  const clean = code.trim().toUpperCase();
  return VEHICLE_TYPE_NAMES[clean] || code;
}

/**
 * Trả về tên tiếng Việt của loại vỏ container
 */
export function getContainerTypeName(type: string | null | undefined): string {
  if (!type) return 'Lạnh (Reefer)';
  const clean = type.trim().toUpperCase();
  return CONTAINER_TYPE_NAMES[clean] || type;
}

/**
 * Định dạng quy cách container thân thiện (Ví dụ: 40ft — Container Lạnh)
 */
export function formatContainerSpec(size: string | null | undefined, type: string | null | undefined): string {
  const sizeText = size ? `${size}ft` : '40ft';
  const typeText = getContainerTypeName(type);
  return `${sizeText} — ${typeText}`;
}

/**
 * Trả về nhãn trạng thái thanh toán vé cổng
 */
export function getTicketPaymentStatusLabel(status: string | null | undefined): { label: string; variant: 'unpaid' | 'paid' | 'exempt' } {
  switch (status) {
    case 'PAID':
      return { label: 'Đã thu tiền', variant: 'paid' };
    case 'EXEMPT':
      return { label: 'Miễn phí hợp lệ', variant: 'exempt' };
    case 'UNPAID':
    default:
      return { label: 'Chưa thu tiền', variant: 'unpaid' };
  }
}

/**
 * Định dạng số tiền VNĐ (Ví dụ: 250.000 đ)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '0 đ';
  return `${Math.round(amount).toLocaleString('vi-VN')} đ`;
}

/**
 * Đọc số tiền thành chữ tiếng Việt chuẩn hóa cho biên lai / phiếu thu
 */
export function formatMoneyInWords(amount: number): string {
  if (amount === 0) return 'Không đồng';
  if (!amount || isNaN(amount)) return '';

  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readGroupOfThree(n: number, showZeroHundred: boolean): string {
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;
    let res = '';

    if (h > 0 || showZeroHundred) {
      res += digits[h] + ' trăm ';
    }

    if (t > 1) {
      res += digits[t] + ' mươi ';
      if (u === 1) res += 'mốt ';
      else if (u === 5) res += 'lăm ';
      else if (u > 0) res += digits[u] + ' ';
    } else if (t === 1) {
      res += 'mười ';
      if (u === 5) res += 'lăm ';
      else if (u > 0) res += digits[u] + ' ';
    } else if (t === 0 && u > 0) {
      if (h > 0 || showZeroHundred) res += 'lẻ ';
      res += digits[u] + ' ';
    }

    return res.trim();
  }

  let num = Math.abs(Math.round(amount));
  const groups: number[] = [];
  while (num > 0) {
    groups.push(num % 1000);
    num = Math.floor(num / 1000);
  }

  let result = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g > 0) {
      const showZero = i < groups.length - 1;
      const gText = readGroupOfThree(g, showZero);
      result += gText + ' ' + units[i] + ' ';
    }
  }

  result = result.trim() + ' đồng';
  return result.charAt(0).toUpperCase() + result.slice(1);
}

/**
 * Định dạng giờ chuẩn hh:mm (24h)
 * Ví dụ: 14:30
 */
export function formatTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * Định dạng ngày chuẩn dd/MM/yyyy
 * Ví dụ: 13/10/2026
 */
export function formatDate(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${MM}/${yyyy}`;
}

/**
 * Định dạng giờ ngày chuẩn hh:mm dd/MM/yyyy
 * Ví dụ: 14:30 13/10/2026
 */
export function formatDateTime(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '—';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${hh}:${mm} ${dd}/${MM}/${yyyy}`;
}

/**
 * Chuyển Date hoặc chuỗi ngày sang định dạng chuẩn dùng cho <input type="datetime-local">
 * Kết quả: YYYY-MM-DDTHH:mm
 */
export function toDateTimeLocalValue(dateInput?: string | number | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

/**
 * Chuyển Date hoặc chuỗi ngày sang định dạng chuẩn dùng cho <input type="date">
 * Kết quả: YYYY-MM-DD
 */
export function toDateInputValue(dateInput?: string | number | Date): string {
  const d = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${MM}-${dd}`;
}

