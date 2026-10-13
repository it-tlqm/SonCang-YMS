-- ==============================================================================
-- MIGRATION 20261013000021: RPC THU TIỀN VÉ VÀO CỔNG TẠI CỔNG RA (AN NINH)
-- Mục đích: 
--   Khắc phục dứt điểm lỗi "Bấm mãi không thu được" khi bấm "Thu vé ngay" tại Cổng ra.
--   Đảm bảo tuân thủ nghiêm ngặt chuẩn RBAC V5:
--   1. Ghi nhận giao dịch tài chính vào sổ cái thực thu bất biến app_payments.
--   2. Cập nhật trạng thái khoản phải thu app_charges thành PAID.
--   3. Đồng bộ trạng thái vé lượt xe app_vehicle_visits.ticket_payment_status = 'PAID'.
--   4. Kiểm soát phân quyền ticket.payment.collect và ghi log kiểm toán app_audit_events.
-- ==============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.sc_collect_vehicle_ticket(
  p_vehicle_id uuid,
  p_payment_method text DEFAULT 'CASH',
  p_receipt_code text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_veh record;
  v_charge record;
  v_payment_id uuid;
  v_ticket_amount numeric(12, 2);
  v_norm_method text;
  v_audit_note text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  -- 1. Tìm và khóa dòng lượt xe
  SELECT * INTO v_veh 
  FROM public.app_vehicle_visits 
  WHERE id = p_vehicle_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt xe có mã: %', p_vehicle_id;
  END IF;

  -- 2. Kiểm tra phân quyền RBAC V5
  IF NOT public.sc_can('ticket.payment.collect', v_veh.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền thu tiền vé xe vào cổng (ticket.payment.collect).';
  END IF;

  -- 3. Nếu đã thanh toán rồi thì trả về thành công an toàn (Idempotent)
  IF v_veh.ticket_payment_status = 'PAID' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_paid', true,
      'vehicle_id', p_vehicle_id,
      'message', 'Vé xe vào cổng đã được thanh toán trước đó.'
    );
  END IF;

  v_ticket_amount := COALESCE(v_veh.ticket_amount, 0);

  -- 4. Nếu vé xe 0đ (miễn phí, ví dụ xe đầu kéo không cont hoặc sang tải)
  IF v_ticket_amount <= 0 THEN
    UPDATE public.app_vehicle_visits
    SET ticket_payment_status = 'PAID',
        updated_at = now()
    WHERE id = p_vehicle_id;

    RETURN jsonb_build_object(
      'success', true,
      'vehicle_id', p_vehicle_id,
      'paid_amount', 0,
      'message', 'Vé xe miễn phí (0 đ), đã cập nhật trạng thái PAID.'
    );
  END IF;

  -- 5. Tìm hoặc tạo bản ghi app_charges (TICKET)
  SELECT * INTO v_charge
  FROM public.app_charges
  WHERE vehicle_visit_id = p_vehicle_id AND charge_type = 'TICKET'
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.app_charges (
      yard_id, charge_type, vehicle_visit_id, amount, paid_amount, status, notes
    ) VALUES (
      v_veh.yard_id, 'TICKET', v_veh.id, v_ticket_amount, 0, 'UNPAID',
      'Vé xe vào cổng: ' || COALESCE(v_veh.vehicle_type, 'Phương tiện') || ' (' || COALESCE(v_veh.license_plate, '') || ')'
    ) RETURNING * INTO v_charge;
  END IF;

  -- 6. Chuẩn hóa hình thức thanh toán (CASH | TRANSFER | OTHER)
  v_norm_method := CASE 
    WHEN UPPER(COALESCE(p_payment_method, 'CASH')) IN ('BANK_TRANSFER', 'TRANSFER', 'CK') THEN 'TRANSFER'
    ELSE 'CASH'
  END;

  v_audit_note := 'Thu vé cổng tại Cổng ra (' || 
    CASE WHEN v_norm_method = 'TRANSFER' THEN 'Chuyển khoản' ELSE 'Tiền mặt' END || 
    CASE WHEN p_receipt_code IS NOT NULL AND TRIM(p_receipt_code) != '' THEN ' - BL: ' || TRIM(p_receipt_code) ELSE '' END || ')';

  -- 7. Ghi nhận sổ thực thu bất biến app_payments
  INSERT INTO public.app_payments (
    yard_id, charge_id, payment_amount, payment_method,
    collected_by, collector_dept, receipt_code, notes
  ) VALUES (
    v_veh.yard_id, v_charge.id, v_ticket_amount, v_norm_method,
    v_actor_id, 'AN_NINH', NULLIF(TRIM(p_receipt_code), ''),
    COALESCE(NULLIF(TRIM(p_notes), ''), v_audit_note)
  ) RETURNING id INTO v_payment_id;

  -- 8. Cập nhật khoản phải thu app_charges thành PAID
  UPDATE public.app_charges
  SET paid_amount = v_ticket_amount,
      status = 'PAID',
      notes = COALESCE(notes, '') || ' | ' || v_audit_note,
      updated_at = now()
  WHERE id = v_charge.id;

  -- 9. Đồng bộ lượt xe app_vehicle_visits thành PAID
  UPDATE public.app_vehicle_visits
  SET ticket_payment_status = 'PAID',
      note = CASE 
        WHEN note IS NOT NULL AND TRIM(note) != '' THEN note || ' | ' || v_audit_note
        ELSE v_audit_note
      END,
      updated_at = now()
  WHERE id = p_vehicle_id;

  -- 10. Ghi nhận Audit Log
  PERFORM public.sc_log_audit_event(
    'ticket.payment.collect', 'app_payments', v_payment_id::text,
    v_veh.yard_id, 'AN_NINH', NULL, 
    jsonb_build_object(
      'payment_id', v_payment_id,
      'vehicle_id', p_vehicle_id,
      'charge_id', v_charge.id,
      'amount', v_ticket_amount,
      'method', v_norm_method,
      'receipt_code', p_receipt_code
    ),
    'Thu vé xe cổng tại Cổng ra: ' || COALESCE(v_veh.license_plate, '') || ' (' || v_ticket_amount || ' VND)'
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'charge_id', v_charge.id,
    'vehicle_id', p_vehicle_id,
    'paid_amount', v_ticket_amount,
    'status', 'PAID',
    'dept', 'AN_NINH'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.sc_collect_vehicle_ticket FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_collect_vehicle_ticket TO authenticated;

COMMIT;
