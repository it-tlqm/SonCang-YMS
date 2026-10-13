-- ==============================================================================
-- SƠN CẢNG YMS - MIGRATION 010 (CLOUD DEV READY)
-- File: 20261012000010_fix_vehicle_exit_cleanup.sql
-- Mục đích:
--   1. Khắc phục lỗi kiểm tra vé trùng lặp trong sc_confirm_vehicle_only_exit.
--   2. Tự động dọn dẹp các bản ghi TICKET trùng lặp UNPAID nếu xe đã PAID/EXEMPT.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sc_confirm_vehicle_only_exit(
  p_vehicle_visit_id uuid,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_veh public.app_vehicle_visits%ROWTYPE;
  v_updated_veh public.app_vehicle_visits%ROWTYPE;
  v_out_time timestamptz := now();
  v_has_unpaid_ticket boolean;
  v_inbound_cont_count integer;
BEGIN
  -- 1. Kiểm tra xác thực
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập hệ thống!' USING ERRCODE = '42501';
  END IF;

  -- 2. Tìm lượt xe
  SELECT * INTO v_veh
  FROM public.app_vehicle_visits
  WHERE id = p_vehicle_visit_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt xe: %', p_vehicle_visit_id;
  END IF;

  -- 3. Kiểm tra quyền An ninh xuất bãi xe (RBAC V5)
  IF NOT (
    public.sc_can('vehicle.visit.exit_confirm', v_veh.yard_id) OR
    public.sc_can('exit.actual.confirm', v_veh.yard_id)
  ) THEN
    RAISE EXCEPTION 'Người dùng không có quyền xác nhận xe ra bãi tại bãi này!' USING ERRCODE = '42501';
  END IF;

  -- 4. Kiểm tra trạng thái xe
  IF v_veh.status <> 'IN_YARD' THEN
    RAISE EXCEPTION 'Xe % không ở trạng thái trong bãi (IN_YARD). Trạng thái hiện tại: %',
      v_veh.license_plate, v_veh.status;
  END IF;

  -- 5. Xử lý và kiểm tra vé vào cổng:
  -- Nếu xe đã có trạng thái thanh toán là PAID hoặc EXEMPT:
  -- Tự động dọn dẹp (hủy) bất kỳ bản ghi TICKET UNPAID nào bị sinh thừa do trigger hoặc lỗi đồng bộ cũ
  IF v_veh.ticket_payment_status IN ('PAID', 'EXEMPT') THEN
    UPDATE public.app_charges
    SET status = 'CANCELLED',
        notes = COALESCE(notes || ' | ', '') || 'Dọn dẹp bản ghi thừa: Xe đã thanh toán vé cổng'
    WHERE vehicle_visit_id = p_vehicle_visit_id
      AND charge_type = 'TICKET'
      AND status NOT IN ('PAID', 'EXEMPT');
  ELSE
    -- Xe thực sự chưa thanh toán vé:
    IF v_veh.ticket_amount > 0 THEN
      RAISE EXCEPTION 'Lượt xe % chưa thanh toán vé vào cổng (số tiền: % VND, trạng thái: %)!',
        v_veh.license_plate, v_veh.ticket_amount, v_veh.ticket_payment_status;
    END IF;

    -- Kiểm tra trong bảng app_charges
    SELECT EXISTS (
      SELECT 1 FROM public.app_charges
      WHERE vehicle_visit_id = p_vehicle_visit_id
        AND charge_type = 'TICKET'
        AND status NOT IN ('PAID', 'EXEMPT')
    ) INTO v_has_unpaid_ticket;

    IF v_has_unpaid_ticket THEN
      RAISE EXCEPTION 'Lượt xe % còn khoản phí vé vào cổng chưa thanh toán trong sổ cái!',
        v_veh.license_plate;
    END IF;
  END IF;

  -- 6. Đếm số container mà xe này mang vào (nếu có) và vẫn đang ở trong bãi
  SELECT count(*) INTO v_inbound_cont_count
  FROM public.app_container_visits
  WHERE inbound_vehicle_visit_id = p_vehicle_visit_id
    AND status IN ('IN_YARD', 'PENDING_CLEARANCE', 'CLEARED_FOR_EXIT');

  -- 7. Cập nhật lượt xe thành EXITED
  UPDATE public.app_vehicle_visits
  SET status = 'EXITED',
      exit_at = v_out_time,
      exit_by = v_actor_id,
      note = CASE 
        WHEN p_notes IS NOT NULL AND length(trim(p_notes)) > 0 
        THEN COALESCE(note || ' | ', '') || 'Xuất bãi xe: ' || trim(p_notes)
        ELSE note 
      END,
      updated_at = v_out_time
  WHERE id = p_vehicle_visit_id;

  SELECT * INTO v_updated_veh FROM public.app_vehicle_visits WHERE id = p_vehicle_visit_id;

  -- 8. Ghi audit log
  PERFORM public.sc_log_audit_event(
    'vehicle.exit.confirm', 'app_vehicle_visits', p_vehicle_visit_id::text,
    v_veh.yard_id, 'AN_NINH', to_jsonb(v_veh), to_jsonb(v_updated_veh),
    'An ninh xác nhận xe ra bãi (không kéo cont). Biển số: ' || v_veh.license_plate || 
    '. Số cont đã hạ tại bãi: ' || v_inbound_cont_count
  );

  RETURN jsonb_build_object(
    'vehicle_visit_id', p_vehicle_visit_id,
    'license_plate', v_veh.license_plate,
    'status', 'EXITED',
    'exit_at', v_out_time,
    'containers_left_in_yard', v_inbound_cont_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sc_confirm_vehicle_only_exit TO authenticated;
