-- ==============================================================================
-- SƠN CẢNG YMS - MIGRATION 018 (RPC ADJUST VEHICLE VISIT & ATTACHED CONTAINER ACTION)
-- File: 20261013000018_adjust_vehicle_visit_rpc.sql
-- Mục đích:
--   1. Giải quyết lỗi RLS "permission denied for table app_vehicle_visits" khi ca trưởng
--      An ninh (SEC_LEAD) hoặc Quản trị viên (SYS_ADMIN) hiệu chỉnh lượt xe.
--   2. Cung cấp hàm RPC an toàn (SECURITY DEFINER) cho phép sửa hồi tố giờ vào/ra,
--      loại xe, trạng thái vé, hủy vé / hoàn tiền tài xế kèm vết kiểm toán.
--   3. Xử lý nghiệp vụ container đi kèm khi đổi sang loại xe không chở container:
--      HỦY LƯỢT CONT (CANCEL) nếu nhập nhầm, hoặc TÁCH HẠ BÃI LƯU KHO (DETACH).
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sc_adjust_vehicle_visit(
  p_vehicle_id uuid,
  p_operator_role text,
  p_reason text,
  p_entry_at timestamptz DEFAULT NULL,
  p_exit_at timestamptz DEFAULT NULL,
  p_clear_exit_at boolean DEFAULT false,
  p_status text DEFAULT NULL,
  p_vehicle_type text DEFAULT NULL,
  p_ticket_payment_status text DEFAULT NULL,
  p_ticket_amount numeric DEFAULT NULL,
  p_refund_reason text DEFAULT NULL,
  p_driver_name text DEFAULT NULL,
  p_driver_phone text DEFAULT NULL,
  p_container_action text DEFAULT NULL,
  p_container_action_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_veh public.app_vehicle_visits%ROWTYPE;
  v_audit_note text;
  v_new_note text;
  v_user_profile record;
  v_operator_name text := 'Nhân viên';
BEGIN
  -- 1. Kiểm tra xác thực
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập hệ thống!' USING ERRCODE = '42501';
  END IF;

  -- 2. Kiểm tra vai trò được phép hiệu chỉnh ca trực
  IF p_operator_role NOT IN ('SEC_LEAD', 'SYS_ADMIN') THEN
    RAISE EXCEPTION 'Từ chối truy cập: Chỉ Ca trưởng An ninh (SEC_LEAD) hoặc Quản trị viên (SYS_ADMIN) mới có quyền hiệu chỉnh lượt xe!' USING ERRCODE = '42501';
  END IF;

  -- 3. Kiểm tra lý do hiệu chỉnh (bắt buộc >= 5 ký tự)
  IF p_reason IS NULL OR length(trim(p_reason)) < 5 THEN
    RAISE EXCEPTION 'Bắt buộc nhập lý do hiệu chỉnh ca trực tối thiểu 5 ký tự để lưu vết kiểm toán!';
  END IF;

  -- 4. Tìm lượt xe hiện tại
  SELECT * INTO v_veh
  FROM public.app_vehicle_visits
  WHERE id = p_vehicle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt xe có ID: %', p_vehicle_id;
  END IF;

  -- 5. Lấy tên hiển thị của người vận hành
  SELECT full_name INTO v_user_profile
  FROM public.app_users
  WHERE id = v_actor_id;
  IF FOUND AND v_user_profile.full_name IS NOT NULL THEN
    v_operator_name := v_user_profile.full_name;
  END IF;

  -- 6. Chuẩn bị nhật ký kiểm toán (audit log)
  v_audit_note := format(
    '[Hiệu chỉnh ca trực %s bởi %s (%s)]: %s%s',
    to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI:SS'),
    v_operator_name,
    p_operator_role,
    trim(p_reason),
    CASE WHEN p_refund_reason IS NOT NULL AND length(trim(p_refund_reason)) > 0 
         THEN format(' (Hủy vé/hoàn tiền: %s)', trim(p_refund_reason)) 
         ELSE '' END
  );

  v_new_note := CASE 
    WHEN v_veh.note IS NOT NULL AND length(trim(v_veh.note)) > 0 
    THEN v_veh.note || ' | ' || v_audit_note 
    ELSE v_audit_note 
  END;

  -- 7. Cập nhật bảng app_vehicle_visits
  UPDATE public.app_vehicle_visits
  SET
    entry_at = COALESCE(p_entry_at, entry_at),
    exit_at = CASE 
      WHEN p_clear_exit_at THEN NULL 
      WHEN p_exit_at IS NOT NULL THEN p_exit_at 
      ELSE exit_at 
    END,
    exit_by = CASE 
      WHEN p_clear_exit_at THEN NULL 
      WHEN p_exit_at IS NOT NULL THEN COALESCE(exit_by, v_actor_id) 
      ELSE exit_by 
    END,
    status = COALESCE(p_status, status),
    vehicle_type = COALESCE(p_vehicle_type, vehicle_type),
    ticket_payment_status = COALESCE(p_ticket_payment_status, ticket_payment_status),
    ticket_amount = COALESCE(p_ticket_amount, ticket_amount),
    driver_name = COALESCE(p_driver_name, driver_name),
    driver_phone = COALESCE(p_driver_phone, driver_phone),
    note = v_new_note,
    updated_at = now()
  WHERE id = p_vehicle_id
  RETURNING * INTO v_veh;

  -- 8. Đồng bộ giờ vào cho các container đi kèm (nếu có cập nhật giờ vào)
  IF p_entry_at IS NOT NULL THEN
    UPDATE public.app_container_visits
    SET inbound_at = p_entry_at,
        updated_at = now()
    WHERE inbound_vehicle_visit_id = p_vehicle_id;
  END IF;

  -- 9. Xử lý container đi kèm khi đổi sang loại xe không chở container
  IF p_container_action IS NOT NULL AND p_container_action <> 'KEEP' THEN
    IF p_container_action = 'CANCEL' THEN
      -- Hủy bỏ lượt container (do nhập nhầm, thực tế xe không chở cont)
      UPDATE public.app_container_visits
      SET status = 'CANCELLED',
          notes = COALESCE(notes || ' | ', '') || format('HỦY CONTAINER bởi %s (%s) do hiệu chỉnh loại xe: %s', v_operator_name, p_operator_role, COALESCE(p_container_action_reason, p_reason)),
          updated_at = now()
      WHERE inbound_vehicle_visit_id = p_vehicle_id
        AND status = 'IN_YARD';
    ELSIF p_container_action = 'DETACH' THEN
      -- Tách container thành cont tồn bãi hạ bãi độc lập
      UPDATE public.app_container_visits
      SET inbound_vehicle_visit_id = NULL,
          notes = COALESCE(notes || ' | ', '') || format('TÁCH CONT HẠ BÃI LƯU KHO ĐỘC LẬP do xe %s hiệu chỉnh loại xe: %s', v_veh.license_plate, COALESCE(p_container_action_reason, p_reason)),
          updated_at = now()
      WHERE inbound_vehicle_visit_id = p_vehicle_id
        AND status = 'IN_YARD';
    END IF;
  END IF;

  -- 10. Xử lý Hủy vé / hoàn tiền trong app_charges (nếu chuyển trạng thái sang CANCELLED)
  IF p_ticket_payment_status = 'CANCELLED' THEN
    UPDATE public.app_charges
    SET status = 'CANCELLED',
        notes = COALESCE(notes || ' | ', '') || format('HỦY VÉ / HOÀN TIỀN bởi %s (%s): %s', v_operator_name, p_operator_role, COALESCE(p_refund_reason, p_reason)),
        updated_at = now()
    WHERE vehicle_visit_id = p_vehicle_id
      AND charge_type = 'TICKET';
  ELSIF p_ticket_payment_status = 'PAID' THEN
    UPDATE public.app_charges
    SET status = 'PAID',
        paid_amount = amount,
        updated_at = now()
    WHERE vehicle_visit_id = p_vehicle_id
      AND charge_type = 'TICKET'
      AND status <> 'PAID';
  END IF;

  -- 11. Trả về kết quả JSON
  RETURN to_jsonb(v_veh);
END;
$$;

-- Cấp quyền thực thi hàm RPC cho authenticated
GRANT EXECUTE ON FUNCTION public.sc_adjust_vehicle_visit TO authenticated;
