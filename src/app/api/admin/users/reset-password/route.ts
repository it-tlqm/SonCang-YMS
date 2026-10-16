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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://euswzyespwaxyrjkfkrq.supabase.co';
    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV1c3d6eWVzcHdheHlyamtma3JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTcxMjI0NSwiZXhwIjoyMTA3Mjg4MjQ1fQ.XGJfrft4TDzNSklhXDreXNCFoNXQ-TlOHEyjS_t2hrk';

    // Khởi tạo Supabase Client với service role key để bypass RLS trên server
    const supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
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

    // 2. Quản trị trực tiếp trên auth.users với service role key
    let authUserId: string | null = staff.auth_user_id || null;
    try {
      const { data: userList } = await supabase.auth.admin.listUsers();
      const existingAuthUser = userList?.users?.find(
        (u) => u.email?.toLowerCase() === staff.email.toLowerCase()
      );

      if (existingAuthUser) {
        authUserId = existingAuthUser.id;
        // Cập nhật mật khẩu mới cho user
        await supabase.auth.admin.updateUserById(existingAuthUser.id, {
          password: newPassword,
          email_confirm: true,
          user_metadata: {
            full_name: staff.full_name,
            role_code: staff.role_code,
          },
        });
      } else {
        // Tạo mới tài khoản auth.users nếu nhân sự chưa có auth account
        const { data: createdAuthUser, error: createErr } = await supabase.auth.admin.createUser({
          email: staff.email,
          password: newPassword,
          email_confirm: true,
          user_metadata: {
            full_name: staff.full_name,
            role_code: staff.role_code,
          },
        });

        if (createErr) {
          console.error('Lỗi tạo auth user:', createErr);
        } else if (createdAuthUser?.user?.id) {
          authUserId = createdAuthUser.user.id;
        }
      }

      if (authUserId) {
        // Liên kết auth_user_id & temp_password_hint vào app_staff_users
        await (supabase.from as any)('app_staff_users')
          .update({ 
            auth_user_id: authUserId,
            temp_password_hint: newPassword,
            must_change_password: mustChangePassword !== false,
            password_reset_at: new Date().toISOString()
          })
          .eq('id', staffId);

        // Đảm bảo app_user_role_assignments có bản ghi active để sc_my_permissions() cấp quyền
        const { data: yard } = await (supabase.from as any)('app_yards')
          .select('id')
          .eq('name', 'Bãi Sơn Cảng')
          .maybeSingle();
        const yardId = yard?.id;

        const { data: existingAssign } = await (supabase.from as any)('app_user_role_assignments')
          .select('id')
          .eq('user_id', authUserId)
          .maybeSingle();

        if (!existingAssign) {
          await (supabase.from as any)('app_user_role_assignments').insert([{
            user_id: authUserId,
            role_code: staff.role_code,
            yard_id: staff.role_code === 'SYS_ADMIN' ? null : (staff.yard_id || yardId),
            department_code: staff.department_code,
            is_active: true
          }]);
        } else {
          await (supabase.from as any)('app_user_role_assignments').update({
            role_code: staff.role_code,
            yard_id: staff.role_code === 'SYS_ADMIN' ? null : (staff.yard_id || yardId),
            department_code: staff.department_code,
            is_active: true
          }).eq('id', existingAssign.id);
        }
      }
    } catch (authErr) {
      console.warn('Lỗi đồng bộ Supabase Auth Admin (tiếp tục cập nhật DB):', authErr);
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
