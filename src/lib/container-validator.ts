/**
 * Bộ kiểm tra mã số container theo chuẩn bến bãi Sơn Cảng (4 chữ cái + 7 chữ số = 11 ký tự)
 * Quản lý bến bãi Sơn Cảng — Công ty Cổ phần Tà Lùng Quang Minh
 */

export interface ContainerValidationResult {
  raw: string;
  clean: string;
  isValidFormat: boolean;
  message: string;
  level: 'SUCCESS' | 'ERROR' | 'INFO';
}

/**
 * Kiểm tra mã số container theo quy tắc thực tế:
 * - 4 ký tự đầu: bắt buộc là CHỮ CÁI (A-Z)
 * - 7 ký tự tiếp theo: bắt buộc là CHỮ SỐ (0-9)
 * - Tổng cộng: đúng 11 ký tự (ví dụ: TCLU1234567, AAAA1234567)
 * - Kiểm tra tức thời (real-time) để báo lỗi ngay khi gõ sai loại ký tự
 */
export function validateContainerNumber(containerNo: string): ContainerValidationResult {
  const clean = (containerNo || '').trim().replace(/\s+/g, '').toUpperCase();

  if (!clean) {
    return {
      raw: containerNo,
      clean: '',
      isValidFormat: false,
      message: 'Mã container gồm 4 chữ cái đầu và 7 chữ số tiếp theo (ví dụ: TCLU1234567).',
      level: 'INFO',
    };
  }

  // 1. Kiểm tra 4 ký tự đầu tiên
  const firstFour = clean.slice(0, 4);
  for (let i = 0; i < firstFour.length; i++) {
    const char = firstFour[i];
    if (char < 'A' || char > 'Z') {
      return {
        raw: containerNo,
        clean,
        isValidFormat: false,
        message: `4 ký tự đầu bắt buộc phải là chữ cái (A-Z). Ký tự thứ ${i + 1} đang là "${char}".`,
        level: 'ERROR',
      };
    }
  }

  // 2. Kiểm tra từ ký tự thứ 5 trở đi (nếu đã nhập từ 5 ký tự trở lên)
  if (clean.length >= 5) {
    const remaining = clean.slice(4);
    for (let i = 0; i < remaining.length; i++) {
      const char = remaining[i];
      if (char < '0' || char > '9') {
        return {
          raw: containerNo,
          clean,
          isValidFormat: false,
          message: `Từ ký tự thứ 5 trở đi bắt buộc phải là chữ số (0-9). Ký tự thứ ${i + 5} đang là chữ "${char}".`,
          level: 'ERROR',
        };
      }
    }
  }

  // 3. Kiểm tra độ dài quá 11 ký tự
  if (clean.length > 11) {
    return {
      raw: containerNo,
      clean,
      isValidFormat: false,
      message: `Quá 11 ký tự (${clean.length}/11). Mã container chỉ gồm đúng 11 ký tự.`,
      level: 'ERROR',
    };
  }

  // 4. Nếu chưa đủ 11 ký tự nhưng các ký tự đã nhập đều đúng loại
  if (clean.length < 11) {
    if (clean.length < 4) {
      return {
        raw: containerNo,
        clean,
        isValidFormat: false,
        message: `Đang nhập chữ cái: ${clean.length}/11 ký tự (cần thêm ${4 - clean.length} chữ cái và 7 chữ số).`,
        level: 'INFO',
      };
    }
    return {
      raw: containerNo,
      clean,
      isValidFormat: false,
      message: `Đang nhập chữ số: ${clean.length}/11 ký tự (cần thêm ${11 - clean.length} chữ số nữa).`,
      level: 'INFO',
    };
  }

  // 5. Đủ đúng 11 ký tự: 4 chữ cái + 7 chữ số
  return {
    raw: containerNo,
    clean,
    isValidFormat: true,
    message: 'Mã container hợp lệ (đủ 11 ký tự: 4 chữ cái + 7 chữ số).',
    level: 'SUCCESS',
  };
}

/**
 * Chuẩn hóa và lọc ký tự số container tức thì khi gõ:
 * - Tối đa 11 ký tự (chặn nếu quá 11 ký tự).
 * - 4 ký tự đầu: Chỉ cho phép chữ cái A-Z.
 * - 7 ký tự sau (ký tự 5..11): Chỉ cho phép chữ số 0-9.
 */
export function sanitizeContainerInput(raw: string): string {
  if (!raw) return '';
  const upper = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  let result = '';
  for (let i = 0; i < upper.length && result.length < 11; i++) {
    const char = upper[i];
    if (result.length < 4) {
      if (/[A-Z]/.test(char)) {
        result += char;
      }
    } else {
      if (/[0-9]/.test(char)) {
        result += char;
      }
    }
  }
  return result;
}

