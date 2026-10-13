-- ==============================================================================
-- MIGRATION 011: MIỄN DUYỆT CLEARANCE CCKB CHO CONTAINER KHÔNG PHÁT SINH CẮM ĐIỆN
-- Quyết định nghiệp vụ bến bãi Sơn Cảng:
--   - Container không phát sinh cắm điện (không có phiên reefer, không có cước điện):
--     KHÔNG CẦN CCKB duyệt clearance. An ninh được phép xác nhận xe kéo cont xuất bãi trực tiếp.
--   - Chỉ container CÓ phát sinh cắm điện mới bắt buộc CCKB kiểm tra & duyệt clearance.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sc_confirm_physical_exit(
  p_container_visit_id uuid,
  p_outbound_vehicle_id uuid DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_paid_at_gate boolean DEFAULT false,
  p_payment_method text DEFAULT 'CASH',
  p_receipt_code text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_cont record;
  v_has_reefer boolean := false;
  v_active_reefer record;
  v_unpaid_charge record;
  v_veh_out record;
  v_out_time timestamptz := now();
  v_fee_res jsonb;
  v_fee_amount numeric(12, 2);
  v_charged_nights integer;
  v_pay_status text;
  v_charge_id uuid;
  v_receipt text;
  v_updated record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  SELECT * INTO v_cont 
  FROM public.app_container_visits 
  WHERE id = p_container_visit_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt container: %', p_container_visit_id;
  END IF;

  IF v_cont.status <> 'IN_YARD' THEN
    RAISE EXCEPTION 'Container đã xuất bãi hoặc bị hủy. Trạng thái hiện tại: %', v_cont.status;
  END IF;

  -- Kiểm tra quyền An ninh cổng ra: exit.actual.confirm (ON-03)
  IF NOT public.sc_can('exit.actual.confirm', v_cont.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền xác nhận xuất cổng vật lý (exit.actual.confirm).';
  END IF;

  -- 1. KIỂM TRA PHÁT SINH CẮM ĐIỆN REEFER
  SELECT EXISTS (
    SELECT 1 FROM public.app_reefer_power_sessions 
    WHERE container_visit_id = p_container_visit_id
  ) OR EXISTS (
    SELECT 1 FROM public.app_charges 
    WHERE container_visit_id = p_container_visit_id AND charge_type = 'REEFER'
  ) INTO v_has_reefer;

  -- 2. NẾU CÓ PHÁT SINH CẮM ĐIỆN: BẮT BUỘC ĐÃ ĐƯỢC CCKB DUYỆT CLEARANCE
  IF v_has_reefer THEN
    IF v_cont.clearance_status NOT IN ('CLEARED', 'CLEARED_WITH_DEBT') THEN
      RAISE EXCEPTION 'Container % có phát sinh cắm điện nhưng chưa được bộ phận CCKB duyệt clearance xuất bãi! Vui lòng liên hệ CCKB kiểm tra và duyệt trên hệ thống.',
        v_cont.container_no_current;
    END IF;

    -- GLC-03: Kiểm tra trạng thái cắm điện thực tế hoặc phiên điện PENDING_REVIEW tại thời điểm xuất cổng
    SELECT * INTO v_active_reefer 
    FROM public.app_reefer_power_sessions 
    WHERE container_visit_id = p_container_visit_id 
      AND power_status IN ('PLUGGED', 'PENDING_REVIEW')
    ORDER BY created_at DESC LIMIT 1;

    IF FOUND THEN
      IF v_active_reefer.power_status = 'PLUGGED' THEN
        RAISE EXCEPTION 'Container % hiện đang cắm điện thực tế tại bãi! Bắt buộc phải rút điện trước khi cho xe/cont rời cổng.',
          v_cont.container_no_current;
      ELSE
        RAISE EXCEPTION 'Container % có phiên cắm điện chưa được xử lý dứt điểm (Trạng thái: PENDING_REVIEW, Phiên: %). Không thể xuất bãi cho container có phiên điện chưa giải quyết.',
          v_cont.container_no_current, v_active_reefer.id;
      END IF;
    END IF;
  ELSE
    -- CONTAINER KHÔNG PHÁT SINH CẮM ĐIỆN:
    -- Tự động thông quan miễn duyệt CCKB nếu chưa được duyệt
    IF v_cont.clearance_status IS NULL OR v_cont.clearance_status = 'PENDING' THEN
      UPDATE public.app_container_visits
      SET clearance_status = 'CLEARED',
          cleared_at = now(),
          cleared_by = v_actor_id,
          clearance_notes = coalesce(v_cont.clearance_notes, 'Miễn duyệt CCKB (Không phát sinh cắm điện)')
      WHERE id = p_container_visit_id;
    END IF;
  END IF;

  -- SC-R3-04: Kiểm tra công nợ dịch vụ nếu chưa được duyệt ngoại lệ nợ
  IF v_cont.clearance_status <> 'CLEARED_WITH_DEBT' THEN
    SELECT * INTO v_unpaid_charge 
    FROM public.app_charges 
    WHERE container_visit_id = p_container_visit_id 
      AND status IN ('UNPAID', 'PARTIALLY_PAID')
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'Container % còn khoản nợ dịch vụ (% VND) chưa thanh toán và không có ngoại lệ nợ! Không thể xuất bãi.',
        v_cont.container_no_current, (v_unpaid_charge.amount - v_unpaid_charge.paid_amount);
    END IF;
  END IF;

  -- 3. Tính phí lưu bãi FINAL tại thời điểm ra vật lý
  v_fee_res := public.sc_calculate_storage_fee(v_cont.inbound_at, v_out_time);
  v_fee_amount := (v_fee_res->>'storage_fee')::numeric;
  v_charged_nights := (v_fee_res->>'charged_nights')::integer;

  -- XỬ LÝ PHÍ LƯU BÃI VÀ RÀO CHẮN NỢ (ON-04 & SC-R3-01)
  IF v_fee_amount > 0 THEN
    IF p_paid_at_gate = true THEN
      -- Thu tiền tại cổng: kiểm tra quyền thu tiền storage.payment.collect (SC-R3-05)
      IF NOT public.sc_can('storage.payment.collect', v_cont.yard_id) THEN
        RAISE EXCEPTION 'Permission Denied: Bạn không có quyền thu tiền phí lưu bãi tại cổng (storage.payment.collect).';
      END IF;

      v_pay_status := 'PAID';
      v_receipt := coalesce(p_receipt_code, 'STORAGE-' || to_char(now(), 'YYYYMMDD-HH24MISS'));

      -- Tạo charge PAID
      INSERT INTO public.app_charges (
        yard_id, charge_type, container_visit_id, amount, paid_amount, status, notes
      ) VALUES (
        v_cont.yard_id, 'STORAGE', p_container_visit_id, v_fee_amount, v_fee_amount, 'PAID',
        'Phí lưu bãi ' || v_charged_nights || ' đêm (thu trực tiếp tại cổng ra)'
      ) RETURNING id INTO v_charge_id;

      -- SC-R3-01: Ghi sổ thanh toán app_payments đúng 100% schema (payment_amount, collector_dept NOT NULL)
      INSERT INTO public.app_payments (
        yard_id, charge_id, payment_amount, payment_method, receipt_code, collected_by, collector_dept, notes
      ) VALUES (
        v_cont.yard_id, v_charge_id, v_fee_amount, coalesce(p_payment_method, 'CASH'),
        v_receipt, v_actor_id, 'AN_NINH', 'Thu tiền phí lưu bãi tại cổng khi xuất bãi'
      );
    ELSE
      -- Chưa thanh toán tại cổng: BẮT BUỘC phải có ngoại lệ nợ đã duyệt (AP06)
      IF v_cont.clearance_status <> 'CLEARED_WITH_DEBT' THEN
        RAISE EXCEPTION 'Container % phát sinh phí lưu bãi % VND (% đêm) chưa thanh toán! Yêu cầu thu tiền tại cổng (p_paid_at_gate = true) hoặc cần CCKB duyệt ngoại lệ nợ (CLEARED_WITH_DEBT).',
          v_cont.container_no_current, v_fee_amount, v_charged_nights;
      END IF;

      v_pay_status := 'UNPAID';

      -- Ghi nhận khoản nợ chưa thanh toán vào sổ cái
      INSERT INTO public.app_charges (
        yard_id, charge_type, container_visit_id, amount, paid_amount, status, notes
      ) VALUES (
        v_cont.yard_id, 'STORAGE', p_container_visit_id, v_fee_amount, 0, 'UNPAID',
        'Phí lưu bãi nợ ' || v_charged_nights || ' đêm (cho phép xuất với ngoại lệ nợ CLEARED_WITH_DEBT)'
      );
    END IF;
  ELSE
    v_pay_status := 'EXEMPT';
  END IF;

  -- 4. CẬP NHẬT TRẠNG THÁI CONTAINER ĐÃ RỜI BÃI
  UPDATE public.app_container_visits
  SET status = 'EXITED',
      outbound_at = v_out_time,
      outbound_vehicle_visit_id = p_outbound_vehicle_id,
      storage_fee_amount = v_fee_amount,
      storage_nights_charged = v_charged_nights,
      storage_fee_payment_status = v_pay_status,
      clearance_status = CASE 
        WHEN clearance_status IN ('CLEARED', 'CLEARED_WITH_DEBT') THEN clearance_status 
        ELSE 'CLEARED' 
      END,
      updated_at = now()
  WHERE id = p_container_visit_id;

  -- 5. SC-R3-02: Nếu có xe ra liên kết: kiểm tra hợp lệ và cập nhật exit_by + exit_at
  IF p_outbound_vehicle_id IS NOT NULL THEN
    SELECT * INTO v_veh_out
    FROM public.app_vehicle_visits
    WHERE id = p_outbound_vehicle_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Không tìm thấy lượt xe ra: %', p_outbound_vehicle_id;
    END IF;

    IF v_veh_out.status <> 'IN_YARD' THEN
      RAISE EXCEPTION 'Xe ra % không ở trạng thái trong bãi (IN_YARD). Trạng thái hiện tại: %',
        v_veh_out.license_plate, v_veh_out.status;
    END IF;

    IF v_veh_out.yard_id <> v_cont.yard_id THEN
      RAISE EXCEPTION 'Xe ra % thuộc bãi khác với container!', v_veh_out.license_plate;
    END IF;

    -- Dọn dẹp bản ghi vé TICKET UNPAID thừa nếu xe đã PAID/EXEMPT
    IF v_veh_out.ticket_payment_status IN ('PAID', 'EXEMPT') THEN
      UPDATE public.app_charges
      SET status = 'CANCELLED',
          notes = coalesce(notes, '') || ' [Hủy bản ghi vé thừa khi xe xuất cổng kèm cont]'
      WHERE vehicle_visit_id = p_outbound_vehicle_id
        AND charge_type = 'TICKET'
        AND status = 'UNPAID';
    END IF;

    UPDATE public.app_vehicle_visits
    SET status = 'EXITED',
        exit_at = v_out_time,
        exit_by = v_actor_id,
        updated_at = now()
    WHERE id = p_outbound_vehicle_id;
  END IF;

  SELECT * INTO v_updated FROM public.app_container_visits WHERE id = p_container_visit_id;

  PERFORM public.sc_log_audit_event(
    'exit.actual.confirm', 'app_container_visits', p_container_visit_id::text,
    v_cont.yard_id, 'AN_NINH', to_jsonb(v_cont), to_jsonb(v_updated),
    'An ninh xác nhận container ra bãi vật lý thành công. Phí lưu: ' || v_fee_amount || ' VND (' || v_pay_status || ')' || 
    CASE WHEN v_has_reefer THEN ' [Có cắm điện - CCKB duyệt]' ELSE ' [Không cắm điện - Miễn duyệt CCKB]' END
  );

  RETURN jsonb_build_object(
    'container_id', p_container_visit_id,
    'status', 'EXITED',
    'outbound_at', v_out_time,
    'charged_nights', v_charged_nights,
    'storage_fee', v_fee_amount,
    'payment_status', v_pay_status
  );
END;
$$;
