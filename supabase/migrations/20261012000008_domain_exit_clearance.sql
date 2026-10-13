-- ==============================================================================
-- SƠN CẢNG YMS - MIGRATION 008 (CODE-ONLY / LOCAL TESTED / DEPLOY PENDING)
-- File: 20261012000008_domain_exit_clearance.sql
-- Mục đích: 
--   1. Bổ sung các cột Clearance và Phí lưu bãi vào app_container_visits.
--   2. Hàm sc_calculate_storage_fee tính số đêm 22h-06h (miễn đêm đầu, 100k/đêm).
--   3. RPC sc_approve_exit_clearance (CCKB duyệt clearance & ngoại lệ nợ AP06).
--   4. RPC sc_confirm_physical_exit (An ninh xác nhận xuất bãi vật lý & chốt phí lưu bãi AP07).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BỔ SUNG CỘT CLEARANCE VÀ PHÍ LƯU BÃI TRONG app_container_visits
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'app_container_visits' AND column_name = 'clearance_status'
  ) THEN
    ALTER TABLE public.app_container_visits 
      ADD COLUMN clearance_status text NOT NULL DEFAULT 'PENDING' 
        CHECK (clearance_status IN ('PENDING', 'CLEARED', 'CLEARED_WITH_DEBT', 'REJECTED')),
      ADD COLUMN clearance_notes text NULL,
      ADD COLUMN cleared_at timestamptz NULL,
      ADD COLUMN cleared_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
      ADD COLUMN storage_fee_amount numeric(12, 2) NOT NULL DEFAULT 0,
      ADD COLUMN storage_fee_payment_status text NOT NULL DEFAULT 'EXEMPT' 
        CHECK (storage_fee_payment_status IN ('UNPAID', 'PAID', 'EXEMPT')),
      ADD COLUMN storage_nights_charged integer NOT NULL DEFAULT 0;
  END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 2. HÀM TÍNH PHÍ LƯU BÃI CONTAINER (sc_calculate_storage_fee)
-- ------------------------------------------------------------------------------
-- Quy tắc V5: 100.000 VND / đêm qua mốc 22:00-06:00 Asia/Ho_Chi_Minh.
-- Đêm đầu tiên miễn phí (charged_nights = greatest(0, total_nights - 1)).
CREATE OR REPLACE FUNCTION public.sc_calculate_storage_fee(
  p_inbound_at timestamptz,
  p_outbound_at timestamptz DEFAULT now()
) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_in_vn timestamptz;
  v_out_vn timestamptz;
  v_cur_date date;
  v_end_date date;
  v_night_start timestamptz;
  v_night_end timestamptz;
  v_total_nights integer := 0;
  v_charged_nights integer;
  v_fee numeric(12, 2);
BEGIN
  IF p_inbound_at IS NULL THEN
    RETURN jsonb_build_object('total_nights', 0, 'charged_nights', 0, 'free_nights', 0, 'unit_price', 100000, 'storage_fee', 0);
  END IF;

  -- Chuẩn hóa mốc thời gian theo múi giờ Việt Nam
  v_in_vn := p_inbound_at;
  v_out_vn := coalesce(p_outbound_at, now());

  IF v_out_vn <= v_in_vn THEN
    RETURN jsonb_build_object('total_nights', 0, 'charged_nights', 0, 'free_nights', 0, 'unit_price', 100000, 'storage_fee', 0);
  END IF;

  -- Duyệt từng ngày từ ngày vào - 1 ngày đến ngày ra để kiểm tra các đêm cắt mốc 22:00-06:00
  v_cur_date := ((v_in_vn AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) - 1;
  v_end_date := (v_out_vn AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;

  WHILE v_cur_date <= v_end_date LOOP
    -- Đêm của v_cur_date: bắt đầu 22:00 ngày v_cur_date đến 06:00 ngày hôm sau
    v_night_start := (v_cur_date::text || ' 22:00:00+07')::timestamptz;
    v_night_end := ((v_cur_date + 1)::text || ' 06:00:00+07')::timestamptz;

    -- Container có mặt trong đêm này nếu vào trước khi đêm kết thúc và ra sau khi đêm bắt đầu
    IF v_in_vn < v_night_end AND v_out_vn > v_night_start THEN
      v_total_nights := v_total_nights + 1;
    END IF;

    v_cur_date := v_cur_date + 1;
  END LOOP;

  -- Đêm đầu tiên miễn phí theo baseline V5
  v_charged_nights := greatest(0, v_total_nights - 1);
  v_fee := v_charged_nights * 100000;

  RETURN jsonb_build_object(
    'total_nights', v_total_nights,
    'free_nights', CASE WHEN v_total_nights > 0 THEN 1 ELSE 0 END,
    'charged_nights', v_charged_nights,
    'unit_price', 100000,
    'storage_fee', v_fee
  );
END;
$$;


-- ------------------------------------------------------------------------------
-- 3. RPC: CCKB DUYỆT CLEARANCE XUẤT BÃI (sc_approve_exit_clearance)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sc_approve_exit_clearance(
  p_container_visit_id uuid,
  p_allow_debt boolean DEFAULT false,
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_cont record;
  v_active_reefer record;
  v_unpaid_charge record;
  v_status text;
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
    RAISE EXCEPTION 'Chỉ có thể duyệt clearance cho container đang ở trong bãi (IN_YARD). Trạng thái hiện tại: %', v_cont.status;
  END IF;

  -- Kiểm tra quyền CCKB: exit.clearance.issue (ON-03)
  IF NOT public.sc_can('exit.clearance.issue', v_cont.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền kiểm soát và duyệt xuất bãi (exit.clearance.issue).';
  END IF;

  -- GLC-03: Kiểm tra trạng thái cắm điện thực tế hoặc phiên điện PENDING_REVIEW chưa giải quyết
  SELECT * INTO v_active_reefer 
  FROM public.app_reefer_power_sessions 
  WHERE container_visit_id = p_container_visit_id 
    AND power_status IN ('PLUGGED', 'PENDING_REVIEW')
  ORDER BY created_at DESC LIMIT 1;

  IF FOUND THEN
    IF v_active_reefer.power_status = 'PLUGGED' THEN
      -- Ngoại trừ nếu có quyền exit.reefer_state.exception (AP08)
      IF NOT public.sc_can('exit.reefer_state.exception', v_cont.yard_id) THEN
        RAISE EXCEPTION 'Container % hiện đang cắm điện chưa rút! Bắt buộc phải rút điện hoặc có ngoại lệ AP08 mới được duyệt clearance.', 
          v_cont.container_no_current;
      END IF;
    ELSE
      -- PENDING_REVIEW: Ca 0 giây / bất thường chưa xử lý
      RAISE EXCEPTION 'Container % có phiên cắm điện chưa được xử lý dứt điểm (Trạng thái: PENDING_REVIEW, Phiên: %). Yêu cầu CCKB giải quyết dứt điểm phiên điện trước khi duyệt clearance.',
        v_cont.container_no_current, v_active_reefer.id;
    END IF;
  END IF;

  -- SC-R3-04: Kiểm tra công nợ dịch vụ chưa thanh toán (tiền điện/vé/khoản thu khác)
  SELECT * INTO v_unpaid_charge 
  FROM public.app_charges 
  WHERE container_visit_id = p_container_visit_id 
    AND status IN ('UNPAID', 'PARTIALLY_PAID')
  LIMIT 1;

  IF FOUND THEN
    IF p_allow_debt = false THEN
      RAISE EXCEPTION 'Container % còn khoản nợ dịch vụ (% VND) chưa thanh toán! Yêu cầu thanh toán trước khi duyệt xuất hoặc cần CCKB duyệt ngoại lệ nợ (AP06).',
        v_cont.container_no_current, (v_unpaid_charge.amount - v_unpaid_charge.paid_amount);
    END IF;
  END IF;

  -- Xử lý ngoại lệ nợ (AP06): exit.clearance.debt_exception (ON-03)
  IF p_allow_debt = true THEN
    IF NOT public.sc_can('exit.clearance.debt_exception', v_cont.yard_id) THEN
      RAISE EXCEPTION 'Permission Denied: Bạn không có quyền duyệt ngoại lệ nợ xuất bãi (exit.clearance.debt_exception).';
    END IF;
    IF trim(p_notes) IS NULL OR length(trim(p_notes)) < 5 THEN
      RAISE EXCEPTION 'Duyệt ngoại lệ nợ bắt buộc phải nhập lý do/bảo lãnh cụ thể (tối thiểu 5 ký tự).';
    END IF;
    v_status := 'CLEARED_WITH_DEBT';
  ELSE
    v_status := 'CLEARED';
  END IF;

  UPDATE public.app_container_visits
  SET clearance_status = v_status,
      cleared_at = now(),
      cleared_by = v_actor_id,
      clearance_notes = trim(p_notes),
      updated_at = now()
  WHERE id = p_container_visit_id;

  SELECT * INTO v_updated FROM public.app_container_visits WHERE id = p_container_visit_id;

  PERFORM public.sc_log_audit_event(
    'exit.clearance.approve', 'app_container_visits', p_container_visit_id::text,
    v_cont.yard_id, 'CCKB', to_jsonb(v_cont), to_jsonb(v_updated),
    'CCKB duyệt điều kiện xuất bãi: ' || v_status
  );

  RETURN jsonb_build_object(
    'container_id', p_container_visit_id,
    'clearance_status', v_status,
    'cleared_at', now(),
    'notes', p_notes
  );
END;
$$;


-- ------------------------------------------------------------------------------
-- 4. RPC: AN NINH XÁC NHẬN XUẤT BÃI VẬT LÝ TẠI CỔNG RA (sc_confirm_physical_exit)
-- ------------------------------------------------------------------------------
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

  -- BẮT BUỘC ĐÃ ĐƯỢC CCKB DUYỆT CLEARANCE
  IF v_cont.clearance_status NOT IN ('CLEARED', 'CLEARED_WITH_DEBT') THEN
    RAISE EXCEPTION 'Container chưa được bộ phận CCKB duyệt clearance xuất bãi! Không thể xác nhận cho xe/cont rời bãi.';
  END IF;

  -- Kiểm tra quyền An ninh cổng ra: exit.actual.confirm (ON-03)
  IF NOT public.sc_can('exit.actual.confirm', v_cont.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền xác nhận xuất cổng vật lý (exit.actual.confirm).';
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

  -- Tính phí lưu bãi FINAL tại thời điểm ra vật lý
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

  -- CẬP NHẬT TRẠNG THÁI CONTAINER ĐÃ RỜI BÃI
  UPDATE public.app_container_visits
  SET status = 'EXITED',
      outbound_at = v_out_time,
      outbound_vehicle_visit_id = p_outbound_vehicle_id,
      storage_fee_amount = v_fee_amount,
      storage_nights_charged = v_charged_nights,
      storage_fee_payment_status = v_pay_status,
      updated_at = now()
  WHERE id = p_container_visit_id;

  -- SC-R3-02: Nếu có xe ra liên kết: kiểm tra hợp lệ và cập nhật exit_by + exit_at
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
    'An ninh xác nhận container ra bãi vật lý thành công. Phí lưu: ' || v_fee_amount || ' VND (' || v_pay_status || ')'
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

-- ------------------------------------------------------------------------------
-- 4. GLC-05: RPC XÁC NHẬN XE RA BÃI ĐỘC LẬP (XE HẠ CONT VÀ RA MỘT MÌNH)
-- ------------------------------------------------------------------------------
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

  -- 5. Kiểm tra vé vào cổng: nếu có vé > 0 thì phải đã thanh toán hoặc miễn phí
  IF v_veh.ticket_amount > 0 AND v_veh.ticket_payment_status NOT IN ('PAID', 'EXEMPT') THEN
    RAISE EXCEPTION 'Lượt xe % chưa thanh toán vé vào cổng (số tiền: % VND, trạng thái: %)!',
      v_veh.license_plate, v_veh.ticket_amount, v_veh.ticket_payment_status;
  END IF;

  -- Kiểm tra phụ trong bảng app_charges (nếu có bản ghi TICKET chưa thanh toán)
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
        THEN COALESCE(note || ' | ', '') || 'Xuất bãi xe riêng: ' || trim(p_notes)
        ELSE note 
      END,
      updated_at = v_out_time
  WHERE id = p_vehicle_visit_id;

  SELECT * INTO v_updated_veh FROM public.app_vehicle_visits WHERE id = p_vehicle_visit_id;

  -- 8. Ghi audit log
  PERFORM public.sc_log_audit_event(
    'vehicle.exit.confirm', 'app_vehicle_visits', p_vehicle_visit_id::text,
    v_veh.yard_id, 'AN_NINH', to_jsonb(v_veh), to_jsonb(v_updated_veh),
    'An ninh xác nhận xe ra bãi độc lập (không kéo cont). Biển số: ' || v_veh.license_plate || 
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

GRANT EXECUTE ON FUNCTION public.sc_calculate_storage_fee TO authenticated;
GRANT EXECUTE ON FUNCTION public.sc_approve_exit_clearance TO authenticated;
GRANT EXECUTE ON FUNCTION public.sc_confirm_physical_exit TO authenticated;
GRANT EXECUTE ON FUNCTION public.sc_confirm_vehicle_only_exit TO authenticated;

