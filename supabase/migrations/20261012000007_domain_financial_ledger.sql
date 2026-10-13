-- ==============================================================================
-- SƠN CẢNG YMS - MIGRATION 007 (CODE-ONLY / LOCAL TESTED / DEPLOY PENDING)
-- File: 20261012000007_domain_financial_ledger.sql
-- Mục đích: 
--   1. Tạo bảng biểu phí versioned: app_tariffs.
--   2. Tạo sổ cái khoản phải thu: app_charges (TICKET, REEFER, STORAGE).
--   3. Tạo sổ cái thực thu bất biến: app_payments (Phân định rõ CCKB thu điện vs An ninh thu lưu bãi).
--   4. RPC sc_collect_payment tuân thủ AP07 và chặn An ninh thu tiền điện.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. BẢNG BIỂU PHÍ CÓ HIỆU LỰC THEO THỜI GIAN (app_tariffs - Versioned)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_tariffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  unit text NOT NULL,
  amount numeric(12, 2) NOT NULL,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_tariff_code_version UNIQUE (code, version)
);

-- Seed biểu phí cơ sở V5 (đồng bộ 100% với danh mục Migration 004 đã áp dụng)
INSERT INTO public.app_tariffs (code, version, name, unit, amount, valid_from, is_active) VALUES
  ('VE_CONT_LANH', 1, 'Vé xe container lạnh vào cổng', 'Lượt xe', 250000, now(), true),
  ('VE_DAU_KEO', 1, 'Vé xe đầu kéo không cont', 'Lượt xe', 0, now(), true),
  ('VE_XE_BO_4_CHAN', 1, 'Vé xe bo 4 chân tải thùng', 'Lượt xe', 200000, now(), true),
  ('VE_XE_BO_3_CHAN', 1, 'Vé xe bo 3 chân tải thùng', 'Lượt xe', 200000, now(), true),
  ('VE_XE_BO_8_TAN', 1, 'Vé xe bo 8 tấn (2 chân)', 'Lượt xe', 100000, now(), true),
  ('VE_XE_BO_3_BANH', 1, 'Vé xe bo 3 bánh nội bộ', 'Lượt xe', 40000, now(), true),
  ('VE_XE_SANG_TAI', 1, 'Vé xe sang tải nội bộ', 'Lượt xe', 0, now(), true),
  ('DIEN_CONT_GIO', 1, 'Tiền điện container theo giờ (Làm tròn 15p)', 'Giờ', 100000, now(), true),
  ('LUU_CONT_DEM', 1, 'Phí lưu container qua đêm (22:00-06:00, miễn đêm đầu)', 'Đêm', 100000, now(), true)
ON CONFLICT (code, version) DO NOTHING;


-- GLC-01 & GLC-08: Explicit REVOKE và GRANT bảo vệ bảng biểu phí app_tariffs
REVOKE ALL ON TABLE public.app_tariffs FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.app_tariffs TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.app_tariffs FROM authenticated;

ALTER TABLE public.app_tariffs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_tariffs_select_policy ON public.app_tariffs;
CREATE POLICY app_tariffs_select_policy 
  ON public.app_tariffs FOR SELECT TO authenticated
  USING (
    public.sc_can('tariff.read', NULL) OR
    public.sc_can('admin.billing_settings.manage', NULL)
  );
-- ------------------------------------------------------------------------------
-- 2. BẢNG KHOẢN PHẢI THU (app_charges)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yard_id uuid NOT NULL REFERENCES public.app_yards(id) ON DELETE RESTRICT,
  
  charge_type text NOT NULL CHECK (charge_type IN ('TICKET', 'REEFER', 'STORAGE', 'OTHER')),
  
  -- Liên kết thực thể
  vehicle_visit_id uuid NULL REFERENCES public.app_vehicle_visits(id) ON DELETE RESTRICT,
  container_visit_id uuid NULL REFERENCES public.app_container_visits(id) ON DELETE RESTRICT,
  reefer_session_id uuid NULL REFERENCES public.app_reefer_power_sessions(id) ON DELETE RESTRICT,
  tariff_id uuid NULL REFERENCES public.app_tariffs(id) ON DELETE RESTRICT,
  
  -- Số tiền
  amount numeric(12, 2) NOT NULL CHECK (amount >= 0),
  paid_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  
  status text NOT NULL DEFAULT 'UNPAID' 
    CHECK (status IN ('UNPAID', 'PAID', 'PARTIALLY_PAID', 'EXEMPT', 'CANCELLED')),
  
  notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- GLC-01: Explicit REVOKE và GRANT bảo vệ bảng khoản phải thu app_charges
REVOKE ALL ON TABLE public.app_charges FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.app_charges TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.app_charges FROM authenticated;

-- RLS app_charges: SC-R3-05 phân quyền đọc theo vai trò tài chính V5
ALTER TABLE public.app_charges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_charges_select_policy ON public.app_charges;
CREATE POLICY app_charges_select_policy ON public.app_charges FOR SELECT TO authenticated 
USING (
  public.sc_can('report.revenue.read', yard_id) OR
  public.sc_can('reefer.payment.collect', yard_id) OR
  public.sc_can('storage.payment.collect', yard_id) OR
  public.sc_can('ticket.payment.collect', yard_id) OR
  public.sc_can('admin.billing_settings.manage', yard_id)
);


-- ------------------------------------------------------------------------------
-- 3. BẢNG THỰC THU BẤT BIẾN (app_payments - IMMUTABLE LEDGER)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yard_id uuid NOT NULL REFERENCES public.app_yards(id) ON DELETE RESTRICT,
  charge_id uuid NOT NULL REFERENCES public.app_charges(id) ON DELETE RESTRICT,
  
  payment_amount numeric(12, 2) NOT NULL CHECK (payment_amount > 0),
  payment_method text NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'TRANSFER', 'OTHER')),
  
  collected_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  collector_dept text NOT NULL CHECK (collector_dept IN ('AN_NINH', 'CCKB')),
  collected_at timestamptz NOT NULL DEFAULT now(),
  
  receipt_code text NULL,
  idempotency_key text NULL,
  notes text NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_idempotency 
  ON public.app_payments (idempotency_key) 
  WHERE idempotency_key IS NOT NULL;

-- SC-R3-06: Trigger đảm bảo tính bất biến append-only của sổ thu app_payments
CREATE OR REPLACE FUNCTION public.sc_trg_prevent_payment_modification()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Sổ thanh toán app_payments là bất biến. Không được phép sửa (UPDATE) hoặc xóa (DELETE) giao dịch đã ghi nhận.';
END;
$$;

DROP TRIGGER IF EXISTS trg_payment_immutable ON public.app_payments;
CREATE TRIGGER trg_payment_immutable
  BEFORE UPDATE OR DELETE ON public.app_payments
  FOR EACH ROW EXECUTE FUNCTION public.sc_trg_prevent_payment_modification();

-- GLC-01: Explicit REVOKE và GRANT bảo vệ sổ thu app_payments
REVOKE ALL ON TABLE public.app_payments FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.app_payments TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.app_payments FROM authenticated;

-- RLS app_payments: SC-R3-05 chỉ cho phép tài khoản có quyền tài chính đọc sổ thu
ALTER TABLE public.app_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS app_payments_select_policy ON public.app_payments;
CREATE POLICY app_payments_select_policy ON public.app_payments FOR SELECT TO authenticated 
USING (
  public.sc_can('report.revenue.read', yard_id) OR
  public.sc_can('reefer.payment.collect', yard_id) OR
  public.sc_can('storage.payment.collect', yard_id) OR
  public.sc_can('ticket.payment.collect', yard_id) OR
  public.sc_can('payment.bank.reconcile', yard_id) OR
  public.sc_can('admin.billing_settings.manage', yard_id)
);


-- ------------------------------------------------------------------------------
-- 3b. TỰ ĐỘNG ĐỒNG BỘ KHOẢN PHẢI THU VÉ XE VÀO CỔNG (GLC-02)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sc_trg_sync_vehicle_ticket_charge()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.ticket_amount > 0 AND NEW.ticket_payment_status = 'UNPAID' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.app_charges 
      WHERE vehicle_visit_id = NEW.id AND charge_type = 'TICKET'
    ) THEN
      INSERT INTO public.app_charges (
        yard_id, charge_type, vehicle_visit_id, amount, paid_amount, status, notes
      ) VALUES (
        NEW.yard_id, 'TICKET', NEW.id, NEW.ticket_amount, 0, 'UNPAID',
        'Vé xe vào cổng: ' || NEW.vehicle_type || ' (' || coalesce(NEW.license_plate, '') || ')'
      );
    ELSE
      UPDATE public.app_charges
      SET amount = NEW.ticket_amount,
          status = 'UNPAID',
          updated_at = now()
      WHERE vehicle_visit_id = NEW.id AND charge_type = 'TICKET' AND status = 'UNPAID';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vehicle_ticket_charge ON public.app_vehicle_visits;
CREATE TRIGGER trg_sync_vehicle_ticket_charge
  AFTER INSERT OR UPDATE OF ticket_amount, ticket_payment_status ON public.app_vehicle_visits
  FOR EACH ROW EXECUTE FUNCTION public.sc_trg_sync_vehicle_ticket_charge();



-- ------------------------------------------------------------------------------
-- 4. RPC: THU TIỀN VÀ CẬP NHẬT SỔ CÁI (sc_collect_payment)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sc_collect_payment(
  p_charge_id uuid,
  p_amount numeric(12, 2),
  p_payment_method text DEFAULT 'CASH',
  p_receipt_code text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_charge record;
  v_dept text;
  v_payment_id uuid;
  v_new_paid numeric(12, 2);
  v_new_status text;
  v_pay_row record;
  v_existing_payment record;
  v_clean_idem text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  v_clean_idem := NULLIF(trim(p_idempotency_key), '');

  -- ON-08: Xử lý Idempotency thanh toán
  IF v_clean_idem IS NOT NULL THEN
    SELECT * INTO v_existing_payment 
    FROM public.app_payments 
    WHERE idempotency_key = v_clean_idem;

    IF FOUND THEN
      IF v_existing_payment.charge_id = p_charge_id AND v_existing_payment.payment_amount = p_amount THEN
        SELECT * INTO v_charge FROM public.app_charges WHERE id = p_charge_id;
        RETURN jsonb_build_object(
          'payment_id', v_existing_payment.id,
          'charge_id', p_charge_id,
          'paid_amount', v_charge.paid_amount,
          'status', v_charge.status,
          'dept', v_existing_payment.collector_dept,
          'is_replay', true
        );
      ELSE
        RAISE EXCEPTION 'Idempotency key % đã được sử dụng với giao dịch thanh toán khác.', v_clean_idem;
      END IF;
    END IF;
  END IF;

  SELECT * INTO v_charge 
  FROM public.app_charges 
  WHERE id = p_charge_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy khoản thu: %', p_charge_id;
  END IF;

  IF v_charge.status IN ('PAID', 'CANCELLED', 'EXEMPT') THEN
    RAISE EXCEPTION 'Khoản thu đang ở trạng thái %, không thể thu tiền.', v_charge.status;
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Số tiền thu phải lớn hơn 0.';
  END IF;

  -- ON-08: Chặn thanh toán vượt quá số dư còn phải thu
  IF p_amount > (v_charge.amount - v_charge.paid_amount) THEN
    RAISE EXCEPTION 'Số tiền thu (%) vượt quá số dư còn phải thu (%).', 
      p_amount, (v_charge.amount - v_charge.paid_amount);
  END IF;

  -- ============================================================================
  -- PHÂN ĐỊNH BỘ PHẬN VÀ QUYỀN THU THEO CHUẨN 67 ACTION V5 (SC-R3-05 & SC-R3-06)
  -- ============================================================================
  IF v_charge.charge_type = 'REEFER' THEN
    -- TIỀN ĐIỆN: Chỉ CCKB được thu; phân biệt thu một phần và thu đủ
    IF p_amount < (v_charge.amount - v_charge.paid_amount) THEN
      IF NOT public.sc_can('reefer.payment.partial_collect', v_charge.yard_id) THEN
        RAISE EXCEPTION 'Permission Denied: Bạn không có quyền thu tiền điện một phần (reefer.payment.partial_collect).';
      END IF;
    ELSE
      IF NOT public.sc_can('reefer.payment.collect', v_charge.yard_id) THEN
        RAISE EXCEPTION 'Permission Denied: Chỉ nhân viên CCKB mới có quyền thu tiền điện container (reefer.payment.collect).';
      END IF;
    END IF;
    v_dept := 'CCKB';

  ELSIF v_charge.charge_type = 'STORAGE' THEN
    -- PHÍ LƯU CONTAINER: An ninh thu tại cổng khi cont ra (storage.payment.collect - AP07)
    IF NOT public.sc_can('storage.payment.collect', v_charge.yard_id) THEN
      RAISE EXCEPTION 'Permission Denied: Bạn không có quyền thu phí lưu container (storage.payment.collect).';
    END IF;
    v_dept := 'AN_NINH';

  ELSIF v_charge.charge_type = 'TICKET' THEN
    -- VÉ XE: An ninh thu vé xe (ticket.payment.collect)
    IF NOT public.sc_can('ticket.payment.collect', v_charge.yard_id) THEN
      RAISE EXCEPTION 'Permission Denied: Bạn không có quyền thu tiền vé xe vào cổng (ticket.payment.collect).';
    END IF;
    -- SC-R3-06: Vé xe cổng không hỗ trợ thanh toán một phần (bắt buộc thu đủ 1 lần)
    IF p_amount < (v_charge.amount - v_charge.paid_amount) THEN
      RAISE EXCEPTION 'Vé xe vào cổng không hỗ trợ thanh toán một phần. Yêu cầu thu đủ số tiền vé: % VND', (v_charge.amount - v_charge.paid_amount);
    END IF;
    v_dept := 'AN_NINH';

  ELSE
    -- Khoản thu OTHER: Fail-closed, chỉ Quản trị được phép thu
    IF NOT public.sc_can('admin.billing_settings.manage', v_charge.yard_id) THEN
      RAISE EXCEPTION 'Permission Denied: Bạn không có quyền thu khoản phí loại OTHER (admin.billing_settings.manage).';
    END IF;
    v_dept := 'CCKB';
  END IF;

  -- GHI NHẬN SỔ THỰC THU BẤT BIẾN
  INSERT INTO public.app_payments (
    yard_id, charge_id, payment_amount, payment_method,
    collected_by, collector_dept, receipt_code, idempotency_key, notes
  ) VALUES (
    v_charge.yard_id, p_charge_id, p_amount, coalesce(p_payment_method, 'CASH'),
    v_actor_id, v_dept, trim(p_receipt_code), v_clean_idem, trim(p_notes)
  ) RETURNING id INTO v_payment_id;

  -- CẬP NHẬT KHOẢN PHẢI THU
  v_new_paid := v_charge.paid_amount + p_amount;
  IF v_new_paid >= v_charge.amount THEN
    v_new_status := 'PAID';
  ELSE
    v_new_status := 'PARTIALLY_PAID';
  END IF;

  UPDATE public.app_charges
  SET paid_amount = v_new_paid,
      status = v_new_status,
      updated_at = now()
  WHERE id = p_charge_id;

  -- Đồng bộ trạng thái thanh toán nếu là phiên cắm điện
  IF v_charge.charge_type = 'REEFER' AND v_charge.reefer_session_id IS NOT NULL THEN
    UPDATE public.app_reefer_power_sessions
    SET payment_status = v_new_status,
        paid_at = now(),
        paid_by = v_actor_id,
        updated_at = now()
    WHERE id = v_charge.reefer_session_id;
  END IF;

  -- Đồng bộ trạng thái vé xe nếu là khoản vé
  IF v_charge.charge_type = 'TICKET' AND v_charge.vehicle_visit_id IS NOT NULL THEN
    UPDATE public.app_vehicle_visits
    SET ticket_payment_status = v_new_status,
        updated_at = now()
    WHERE id = v_charge.vehicle_visit_id;
  END IF;

  SELECT * INTO v_pay_row FROM public.app_payments WHERE id = v_payment_id;

  PERFORM public.sc_log_audit_event(
    CASE v_charge.charge_type 
      WHEN 'TICKET' THEN 'ticket.payment.collect' 
      WHEN 'REEFER' THEN 'reefer.payment.collect' 
      WHEN 'STORAGE' THEN 'storage.payment.collect' 
      ELSE 'admin.billing_settings.manage' 
    END,
    'app_payments', v_payment_id::text,
    v_charge.yard_id, v_dept, NULL, to_jsonb(v_pay_row),
    'Ghi nhận phiếu thu tiền ' || v_charge.charge_type || ' (' || p_amount || ' VND)'
  );


  RETURN jsonb_build_object(
    'payment_id', v_payment_id,
    'charge_id', p_charge_id,
    'paid_amount', v_new_paid,
    'status', v_new_status,
    'dept', v_dept
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sc_collect_payment TO authenticated;
