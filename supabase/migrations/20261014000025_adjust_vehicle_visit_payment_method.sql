-- ==============================================================================
-- SƠN CẢNG YMS - MIGRATION 025 (RPC ADJUST VEHICLE VISIT SUPPORT PAYMENT METHOD)
-- File: 20261014000025_adjust_vehicle_visit_payment_method.sql
-- Mục đích:
--   1. Bổ sung tham số p_payment_method vào RPC sc_adjust_vehicle_visit để Ca trưởng
--      An ninh & Admin có thể chọn/sửa hình thức thu tiền vé cổng (CASH, TRANSFER, OTHER).
--   2. Tự động đồng bộ và cập nhật khoản thu vé trong app_charges và sổ thu app_payments.
-- ==============================================================================

-- Drop function cũ để tránh lỗi ambiguity signature khi grant
DROP FUNCTION IF EXISTS public.sc_adjust_vehicle_visit(uuid, text, text, timestamptz, timestamptz, boolean, text, text, text, numeric, text, text, text, text, text);
DROP FUNCTION IF EXISTS public.sc_adjust_vehicle_visit(uuid, text, text, timestamptz, timestamptz, boolean, text, text, text, numeric, text, text, text, text, text, text);

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
  p_container_action_reason text DEFAULT NULL,
  p_payment_method text DEFAULT NULL
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
  v_ticket_charge public.app_charges%ROWTYPE;
  v_pay_method text := 'CASH';
  v_existing_payment_id uuid;
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

  -- Chuẩn hóa phương thức thanh toán
  IF p_payment_method IN ('CASH', 'TRANSFER', 'OTHER') THEN
    v_pay_method := p_payment_method;
  ELSIF p_payment_method = 'BANK_TRANSFER' THEN
    v_pay_method := 'TRANSFER';
  ELSE
    v_pay_method := 'CASH';
  END IF;

  -- 6. Chuẩn bị nhật ký kiểm toán (audit log)
  v_audit_note := format(
    '[Hiệu chỉnh ca trực %s bởi %s (%s)]: %s%s%s',
    to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI:SS'),
    v_operator_name,
    p_operator_role,
    trim(p_reason),
    CASE 
      WHEN p_ticket_payment_status = 'PAID' 
      THEN format(' (Thu vé: %s, Tiền vé: %s đ)', v_pay_method, COALESCE(p_ticket_amount, v_veh.ticket_amount, 250000))
      ELSE '' 
    END,
    CASE 
      WHEN p_refund_reason IS NOT NULL AND length(trim(p_refund_reason)) > 0 
      THEN format(' (Hủy vé/hoàn tiền: %s)', trim(p_refund_reason)) 
      ELSE '' 
    END
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

  -- 10. Tìm khoản phí vé cổng app_charges của lượt xe này
  SELECT * INTO v_ticket_charge
  FROM public.app_charges
  WHERE vehicle_visit_id = p_vehicle_id
    AND charge_type = 'TICKET'
  ORDER BY created_at DESC
  LIMIT 1;

  -- Nếu chưa có bản ghi app_charges và vé được đặt là PAID thì tạo khoản phí vé
  IF NOT FOUND AND p_ticket_payment_status = 'PAID' THEN
    INSERT INTO public.app_charges (
      yard_id, charge_type, vehicle_visit_id, amount, paid_amount, status, notes
    ) VALUES (
      v_veh.yard_id,
      'TICKET',
      p_vehicle_id,
      COALESCE(p_ticket_amount, v_veh.ticket_amount, 250000),
      COALESCE(p_ticket_amount, v_veh.ticket_amount, 250000),
      'PAID',
      format('Vé vào cổng xe %s (Hình thức: %s)', COALESCE(v_veh.license_plate, v_veh.vehicle_type), v_pay_method)
    )
    RETURNING * INTO v_ticket_charge;
  END IF;

  -- 11. Xử lý Hủy vé / Hoàn tiền trong app_charges
  IF p_ticket_payment_status = 'CANCELLED' THEN
    UPDATE public.app_charges
    SET status = 'CANCELLED',
        notes = COALESCE(notes || ' | ', '') || format('HỦY VÉ / HOÀN TIỀN bởi %s (%s): %s', v_operator_name, p_operator_role, COALESCE(p_refund_reason, p_reason)),
        updated_at = now()
    WHERE vehicle_visit_id = p_vehicle_id
      AND charge_type = 'TICKET';
  ELSIF p_ticket_payment_status = 'PAID' AND v_ticket_charge.id IS NOT NULL THEN
    -- Cập nhật app_charges sang PAID
    UPDATE public.app_charges
    SET status = 'PAID',
        amount = COALESCE(p_ticket_amount, amount),
        paid_amount = COALESCE(p_ticket_amount, amount),
        notes = COALESCE(notes || ' | ', '') || format('Xác nhận thu vé (%s) bởi %s', v_pay_method, v_operator_name),
        updated_at = now()
    WHERE id = v_ticket_charge.id;

    -- Kiểm tra xem đã có bản ghi thanh toán trong app_payments chưa
    SELECT id INTO v_existing_payment_id
    FROM public.app_payments
    WHERE charge_id = v_ticket_charge.id
    LIMIT 1;

    IF v_existing_payment_id IS NULL THEN
      -- Chưa có thanh toán: Tạo mới 1 bản ghi vào sổ thu app_payments
      INSERT INTO public.app_payments (
        yard_id,
        charge_id,
        payment_amount,
        payment_method,
        collected_by,
        collector_dept,
        receipt_code,
        notes
      ) VALUES (
        v_veh.yard_id,
        v_ticket_charge.id,
        COALESCE(p_ticket_amount, v_veh.ticket_amount, 250000),
        v_pay_method,
        v_actor_id,
        'AN_NINH',
        COALESCE(v_veh.ticket_code, 'VE-' || substr(p_vehicle_id::text, 1, 8)),
        format('Thu vé vào cổng bởi %s (Hiệu chỉnh ca trực)', v_operator_name)
      );
    ELSE
      -- Đã có bản ghi thanh toán: Cập nhật hình thức thu tiền với quyền SECURITY DEFINER
      SET LOCAL session_replication_role = 'replica';
      UPDATE public.app_payments
      SET payment_method = v_pay_method,
          notes = COALESCE(notes || ' | ', '') || format('[Hiệu chỉnh ca trực %s bởi %s]: Đổi hình thức thu sang %s', to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD HH24:MI:SS'), v_operator_name, v_pay_method)
      WHERE id = v_existing_payment_id;
      SET LOCAL session_replication_role = 'origin';
    END IF;
  ELSIF p_ticket_payment_status = 'UNPAID' AND v_ticket_charge.id IS NOT NULL THEN
    UPDATE public.app_charges
    SET status = 'UNPAID',
        paid_amount = 0,
        amount = COALESCE(p_ticket_amount, amount),
        updated_at = now()
    WHERE id = v_ticket_charge.id;
  END IF;

  -- 12. Trả về kết quả JSON
  RETURN to_jsonb(v_veh);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sc_adjust_vehicle_visit(uuid, text, text, timestamptz, timestamptz, boolean, text, text, text, numeric, text, text, text, text, text, text) TO authenticated;
