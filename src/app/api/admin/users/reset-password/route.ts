import { NextResponse, type NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { staffId, newPassword, reason, mustChangePassword } = body;

    if (!staffId || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Thiếu mã nhân viên hoặc mật khẩu mới' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Mật khẩu mới phải có tối thiểu 6 ký tự' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Chưa cấu hình Supabase Server Environment' },
        { status: 500 }
      );
    }

    // Khởi tạo Supabase Client
    const supabase = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Tìm thông tin nhân sự từ app_staff_users
    const { data: staff, error: staffError } = await (supabase.from as any)('app_staff_users')
      .select('*')
      .eq('id', staffId)
      .maybeSingle();

    if (staffError || !staff) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy thông tin nhân viên trong cơ sở dữ liệu' },
        { status: 404 }
      );
    }

    // 2. Nếu có Service Role Key, quản trị trực tiếp trên auth.users
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (serviceRoleKey) {
      const adminAuthClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      try {
        // Tìm user theo email trong auth.users
        const { data: userList } = await adminAuthClient.auth.admin.listUsers();
        const existingAuthUser = userList?.users?.find(
          (u) => u.email?.toLowerCase() === staff.email.toLowerCase()
        );

        if (existingAuthUser) {
          // Cập nhật mật khẩu mới cho user
          await adminAuthClient.auth.admin.updateUserById(existingAuthUser.id, {
            password: newPassword,
          });
        } else {
          // Tạo mới tài khoản auth.users nếu nhân sự chưa có auth account
          const { data: createdAuthUser } = await adminAuthClient.auth.admin.createUser({
            email: staff.email,
            password: newPassword,
            email_confirm: true,
            user_metadata: {
              full_name: staff.full_name,
              role_code: staff.role_code,
            },
          });

          if (createdAuthUser?.user?.id) {
            // Liên kết auth_user_id vào app_staff_users
            await (supabase.from as any)('app_staff_users')
              .update({ auth_user_id: createdAuthUser.user.id })
              .eq('id', staffId);
          }
        }
      } catch (authErr) {
        console.warn('Lỗi đồng bộ Supabase Auth Admin (tiếp tục cập nhật DB):', authErr);
      }
    }

    // 3. Gọi RPC sc_admin_reset_staff_password để cập nhật DB & ghi vết audit events
    const { data: rpcRes, error: rpcError } = await (supabase.rpc as any)(
      'sc_admin_reset_staff_password',
      {
        p_staff_id: staffId,
        p_new_password_hint: newPassword,
        p_reason: reason || 'Admin đặt lại mật khẩu cho nhân sự',
        p_must_change: mustChangePassword !== false,
      }
    );

    if (rpcError) {
      return NextResponse.json(
        { success: false, error: rpcError.message || 'Lỗi cập nhật mật khẩu nhân sự' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Đã đặt lại mật khẩu cho nhân sự [${staff.full_name}] thành công.`,
      reset_at: (rpcRes as any)?.reset_at || new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
