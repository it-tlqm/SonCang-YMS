import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Next.js 16 Request Proxy Entrypoint (`src/proxy.ts`)
 * Cơ chế chuẩn hóa của Next.js 16 thay thế middleware truyền thống.
 * 
 * Chức năng:
 * 1. Đón bắt và ủy quyền các request qua tầng network/proxy.
 * 2. Tự động đồng bộ và làm mới (refresh) Supabase Auth session token qua cookies.
 * 
 * LƯU Ý BẢO MẬT:
 * Proxy/Middleware này KHÔNG PHẢI là lớp phân quyền duy nhất.
 * Toàn bộ quyền truy cập và toàn vẹn dữ liệu tài chính bắt buộc được bảo vệ
 * bởi PostgreSQL Row Level Security (RLS) và hàm sc_can() tại database server.
 */
export default async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Khớp toàn bộ request paths ngoại trừ:
     * - _next/static (static assets)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - các file ảnh/icon tĩnh
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
