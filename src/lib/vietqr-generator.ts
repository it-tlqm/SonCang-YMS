/**
 * Tiện ích tạo mã VietQR chuẩn Napas 247 cho Bến bãi Sơn Cảng — Tà Lùng Quang Minh
 * Hỗ trợ quét chuyển khoản qua 100% ứng dụng ngân hàng tại Việt Nam
 */

import { VietQrConfig } from '@/types/domain.types';

// Cấu hình tài khoản ngân hàng bến bãi Sơn Cảng mặc định
export const DEFAULT_SON_CANG_BANK: VietQrConfig = {
  bankId: '970436', // Vietcombank
  bankName: 'Vietcombank — CN Cao Bằng',
  accountNo: '0981000999999',
  accountName: 'CONG TY CP TA LUNG QUANG MINH',
};

export interface GenerateVietQrOptions {
  amount?: number;
  description?: string;
  config?: VietQrConfig;
}

/**
 * Sinh đường dẫn hình ảnh mã VietQR (chuẩn Napas 247 QuickPay)
 */
export function generateVietQrUrl(
  arg1?: number | GenerateVietQrOptions,
  arg2?: string,
  arg3?: VietQrConfig
): string {
  let amount = 0;
  let description = 'THANH TOAN BEN BAI SON CANG';
  let cfg = DEFAULT_SON_CANG_BANK;

  if (typeof arg1 === 'object' && arg1 !== null) {
    amount = arg1.amount && arg1.amount > 0 ? Math.round(arg1.amount) : 0;
    if (arg1.description) description = arg1.description;
    if (arg1.config) cfg = arg1.config;
  } else if (typeof arg1 === 'number') {
    amount = arg1 > 0 ? Math.round(arg1) : 0;
    if (arg2) description = arg2;
    if (arg3) cfg = arg3;
  }

  const memo = description
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Bỏ dấu tiếng Việt cho an toàn memo ngân hàng
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim()
    .slice(0, 50);

  const cleanAccName = cfg.accountName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  // Template compact2 bao gồm mã QR + Logo ngân hàng + Khung hiển thị số tiền
  let url = `https://img.vietqr.io/image/${cfg.bankId}-${cfg.accountNo}-compact2.png?accountName=${encodeURIComponent(cleanAccName)}`;
  
  if (amount > 0) {
    url += `&amount=${amount}`;
  }
  
  if (memo) {
    url += `&addInfo=${encodeURIComponent(memo)}`;
  }

  return url;
}
