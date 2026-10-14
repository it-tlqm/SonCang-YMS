import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database.types';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse;
  }

  // TỐI ƯU HIỆU NĂNG TỐC ĐỘ CAO:
  // Nếu request không chứa bất kỳ cookie auth session nào của Supabase (dạng sb-*-auth-token),
  // tuyệt đối KHÔNG thực hiện network round-trip đến Supabase Auth server.
  const cookies = request.cookies.getAll();
  const hasAuthSession = cookies.some((c) => c.name.startsWith('sb-') && c.name.includes('-auth-token'));
  if (!hasAuthSession) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Cập nhật session token với timeout bảo hiểm 2.5s, tuyệt đối không làm treo request
  try {
    const authTimeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Auth refresh timeout')), 2500)
    );
    await Promise.race([supabase.auth.getUser(), authTimeout]);
  } catch (err) {
    // Bỏ qua lỗi session refresh trên middleware để không làm nghẽn trang
    console.warn('Supabase middleware auth refresh skipped:', (err as Error)?.message || err);
  }

  return supabaseResponse;
}
