-- ==============================================================================
-- MIGRATION 20261014000028: PHÂN HỆ KẾ TOÁN BẾN BÃI, CHỐT THU TIỀN MẶT & HÓA ĐƠN MST/CCCD
-- Mục đích:
--   1. Đảm bảo bộ phận KE_TOAN và vai trò ACCOUNTANT (Kế toán Bến bãi).
--   2. Cấp các quyền nghiệp vụ kế toán V5: accounting.shift_cash.collect, accounting.invoice.prepare,
--      accounting.debt.manage, accounting.reports.view.
--   3. Mở rộng check constraint trên app_payments.collector_dept cho phép 'KE_TOAN'.
--   4. Tạo bảng app_cash_settlements: Theo dõi các đợt Kế toán đi chốt & thu gom tiền mặt linh hoạt (8h-16h / 16h-8h).
--   5. Tạo bảng app_cash_settlement_items: Liên kết đợt chốt với các phiếu thu tiền mặt (BẢO TOÀN SỔ CÁI BẤT BIẾN app_payments).
--   6. Tạo bảng app_invoices: Quản lý chuẩn bị và xuất hóa đơn GTGT theo Doanh nghiệp (MST) hoặc Cá nhân (Số CCCD 12 số).
--   7. Cung cấp 4 RPC bảo mật: sc_confirm_cash_settlement, sc_accounting_collect_debt, sc_create_or_update_invoice, sc_issue_invoice.
--   8. Seed tài khoản nhân sự Kế toán bến bãi: acc_01@soncang.vn (Bùi Thị Lan).
-- ==============================================================================

BEGIN;

-- 1. Thêm bộ phận Kế toán nếu chưa có (cột chuẩn: code, display_name, is_active)
INSERT INTO public.app_departments (code, display_name, is_active)
VALUES ('KE_TOAN', 'Bộ phận Kế toán - Tài chính', true)
ON CONFLICT (code) DO UPDATE SET display_name = EXCLUDED.display_name, is_active = true;

-- 2. Thêm vai trò ACCOUNTANT
INSERT INTO public.app_roles (code, display_name, department_code, seniority, is_active, release_phase, description)
VALUES ('ACCOUNTANT', 'Kế toán Bến bãi', 'KE_TOAN', 'Chuyên môn', true, 'V1', 'Kế toán đi chốt thu tiền mặt hiện trường, đối soát quỹ, quản lý xuất hóa đơn MST/CCCD, thu hồi nợ và báo cáo doanh thu')
ON CONFLICT (code) DO UPDATE SET 
  display_name = EXCLUDED.display_name, 
  department_code = EXCLUDED.department_code, 
  description = EXCLUDED.description, 
  is_active = true;

-- 3. Bổ sung các Action Permissions cho Kế toán (cột chuẩn: code, module, display_name, risk_level, release_phase)
INSERT INTO public.app_permissions (code, module, display_name, risk_level, release_phase) VALUES
  ('accounting.shift_cash.collect', 'Kế toán', 'Chốt và thu gom tiền mặt từ các bốt An ninh & CCKB', 'Tài chính', 'V1'),
  ('accounting.invoice.prepare', 'Hóa đơn', 'Lập phiếu và quản lý xuất hóa đơn GTGT theo MST hoặc CCCD', 'Tài chính', 'V1'),
  ('accounting.debt.manage', 'Công nợ', 'Theo dõi và thu hồi công nợ khách hàng bến bãi', 'Tài chính', 'V1'),
  ('accounting.reports.view', 'Báo cáo', 'Xem báo cáo doanh thu tổng hợp và sổ quỹ kế toán', 'Thông thường', 'V1')
ON CONFLICT (code) DO UPDATE SET 
  module = EXCLUDED.module, 
  display_name = EXCLUDED.display_name, 
  risk_level = EXCLUDED.risk_level;

-- Gán quyền cho ACCOUNTANT và SYS_ADMIN
INSERT INTO public.app_role_permissions (role_code, permission_code, scope, is_enabled) VALUES
  ('ACCOUNTANT', 'accounting.shift_cash.collect', 'ALL', true),
  ('ACCOUNTANT', 'accounting.invoice.prepare', 'ALL', true),
  ('ACCOUNTANT', 'accounting.debt.manage', 'ALL', true),
  ('ACCOUNTANT', 'accounting.reports.view', 'ALL', true),
  ('ACCOUNTANT', 'report.revenue.read', 'ALL', true),
  ('ACCOUNTANT', 'report.revenue.export', 'ALL', true),
  ('ACCOUNTANT', 'vehicle.visit.read', 'ALL', true),
  ('ACCOUNTANT', 'container.visit.read', 'ALL', true),
  ('ACCOUNTANT', 'reefer.session.read', 'ALL', true),
  ('ACCOUNTANT', 'tariff.read', 'ALL', true),
  -- SYS_ADMIN toàn quyền
  ('SYS_ADMIN', 'accounting.shift_cash.collect', 'ALL', true),
  ('SYS_ADMIN', 'accounting.invoice.prepare', 'ALL', true),
  ('SYS_ADMIN', 'accounting.debt.manage', 'ALL', true),
  ('SYS_ADMIN', 'accounting.reports.view', 'ALL', true)
ON CONFLICT (role_code, permission_code) DO UPDATE SET is_enabled = true;

-- 4. Cập nhật check constraint trên app_payments.collector_dept cho phép 'KE_TOAN'
DO $$
DECLARE
  v_con text;
BEGIN
  FOR v_con IN (
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'public.app_payments'::regclass 
      AND contype = 'c' 
      AND pg_get_constraintdef(oid) LIKE '%collector_dept%'
  ) LOOP
    EXECUTE 'ALTER TABLE public.app_payments DROP CONSTRAINT ' || quote_ident(v_con);
  END LOOP;
END;
$$;

ALTER TABLE public.app_payments 
  ADD CONSTRAINT app_payments_collector_dept_check 
  CHECK (collector_dept IN ('AN_NINH', 'CCKB', 'KE_TOAN'));

-- 5. Bảng Đợt Chốt & Thu gom Tiền mặt Hiện trường (Cash Settlements)
CREATE TABLE IF NOT EXISTS public.app_cash_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_code text NOT NULL UNIQUE,       -- BB-YYYYMMDD-HHmm-DEPT
  yard_id uuid REFERENCES public.app_yards(id),
  collector_id uuid,                          -- Kế toán đi thu
  collector_name text NOT NULL,               -- Bùi Thị Lan (Kế toán)
  handover_dept text NOT NULL CHECK (handover_dept IN ('AN_NINH', 'CCKB', 'ALL')),
  period_from timestamptz NOT NULL,           -- Từ mốc chốt trước
  period_to timestamptz NOT NULL,             -- Đến thời điểm chốt hiện tại
  total_cash_expected numeric NOT NULL DEFAULT 0,  -- Tiền mặt sổ sách tính toán
  total_cash_counted numeric NOT NULL DEFAULT 0,   -- Tiền mặt thực đếm bàn giao
  difference_amount numeric NOT NULL DEFAULT 0,    -- Chênh lệch (thực đếm - sổ sách)
  total_transfer_amount numeric NOT NULL DEFAULT 0,-- Tiền chuyển khoản cùng kỳ (chỉ đối soát)
  difference_reason text,                     -- Lý do chênh lệch (nếu có)
  handover_person_name text NOT NULL,         -- Người bàn giao đại diện hiện trường
  notes text,
  status text NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'DRAFT', 'CANCELLED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Bảng Chi tiết Khoản thu Đã chốt (app_cash_settlement_items)
-- BẢO TOÀN NGUYÊN TẮC BẤT BIẾN CỦA app_payments (KHÔNG UPDATE app_payments)
CREATE TABLE IF NOT EXISTS public.app_cash_settlement_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id uuid NOT NULL REFERENCES public.app_cash_settlements(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES public.app_payments(id),
  settled_amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'CASH',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(settlement_id, payment_id)
);

CREATE INDEX IF NOT EXISTS idx_settlement_items_payment_id ON public.app_cash_settlement_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_settlement_items_settlement_id ON public.app_cash_settlement_items(settlement_id);

-- 7. Bổ sung các trường hóa đơn vào bảng app_charges
ALTER TABLE public.app_charges 
  ADD COLUMN IF NOT EXISTS invoice_status text NOT NULL DEFAULT 'UNINVOICED' CHECK (invoice_status IN ('UNINVOICED', 'PREPARED', 'INVOICED')),
  ADD COLUMN IF NOT EXISTS invoice_id uuid;

-- 8. Bảng Quản lý Xuất Hóa đơn Bến bãi (Hỗ trợ Doanh nghiệp MST & Cá nhân CCCD 12 số)
CREATE TABLE IF NOT EXISTS public.app_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_code text NOT NULL UNIQUE,          -- HD-YYYYMMDD-XXXX
  yard_id uuid REFERENCES public.app_yards(id),
  invoice_type text NOT NULL CHECK (invoice_type IN ('COMPANY', 'INDIVIDUAL')),
  buyer_name text NOT NULL,                   -- Tên công ty HOẶC Họ tên cá nhân
  tax_code text,                              -- Mã số thuế (nếu COMPANY)
  id_card_no text,                            -- Số CCCD 12 số (nếu INDIVIDUAL)
  buyer_address text NOT NULL,                -- Địa chỉ thường trú / doanh nghiệp
  buyer_email text,                           -- Email nhận HĐĐT
  buyer_phone text,                           -- Số điện thoại liên hệ
  vat_rate numeric NOT NULL DEFAULT 8,        -- Thuế suất VAT (8% hoặc 10%)
  subtotal_amount numeric NOT NULL DEFAULT 0, -- Doanh thu trước thuế (tách ngược)
  vat_amount numeric NOT NULL DEFAULT 0,      -- Tiền thuế VAT
  total_amount numeric NOT NULL DEFAULT 0,    -- Tổng tiền thanh toán (bằng tổng các khoản thu gộp)
  status text NOT NULL DEFAULT 'PREPARED' CHECK (status IN ('PREPARED', 'INVOICED', 'CANCELLED')),
  payment_status text NOT NULL DEFAULT 'PAID' CHECK (payment_status IN ('PAID', 'UNPAID')),
  e_invoice_no text,                          -- Số HĐĐT chính thức (vd: 0001234)
  invoice_issued_at timestamptz,              -- Ngày giờ phát hành HĐĐT
  notes text,
  created_by text NOT NULL,                   -- Người lập (Kế toán)
  charge_ids text[] DEFAULT '{}',             -- Mảng ID các khoản thu gom vào hóa đơn
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Seed tài khoản Kế toán Bến bãi
INSERT INTO public.app_staff_users (id, full_name, email, phone, role_code, department_code, is_active, notes)
VALUES (
  '20000000-0000-0000-0000-000000000050',
  'Bùi Thị Lan',
  'acc_01@soncang.vn',
  '0987 890 123',
  'ACCOUNTANT',
  'KE_TOAN',
  true,
  'Kế toán Bến bãi: Đi thu gom chốt tiền mặt bốt ca trực, quản lý hóa đơn MST/CCCD & nộp quỹ'
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  role_code = EXCLUDED.role_code,
  department_code = EXCLUDED.department_code,
  is_active = EXCLUDED.is_active,
  notes = EXCLUDED.notes,
  updated_at = now();

-- 10. Cấp quyền RLS & Truy cập
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_cash_settlements TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_cash_settlement_items TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_invoices TO anon, authenticated;

ALTER TABLE public.app_cash_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_cash_settlement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_cash_settlements_anon_all ON public.app_cash_settlements;
CREATE POLICY app_cash_settlements_anon_all ON public.app_cash_settlements FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS app_cash_settlements_auth_all ON public.app_cash_settlements;
CREATE POLICY app_cash_settlements_auth_all ON public.app_cash_settlements FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS app_cash_settlement_items_anon_all ON public.app_cash_settlement_items;
CREATE POLICY app_cash_settlement_items_anon_all ON public.app_cash_settlement_items FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS app_cash_settlement_items_auth_all ON public.app_cash_settlement_items;
CREATE POLICY app_cash_settlement_items_auth_all ON public.app_cash_settlement_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS app_invoices_anon_all ON public.app_invoices;
CREATE POLICY app_invoices_anon_all ON public.app_invoices FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS app_invoices_auth_all ON public.app_invoices;
CREATE POLICY app_invoices_auth_all ON public.app_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 11. RPC Kế toán xác nhận chốt & thu gom tiền mặt hiện trường
CREATE OR REPLACE FUNCTION public.sc_confirm_cash_settlement(
  p_handover_dept text,
  p_period_from timestamptz,
  p_period_to timestamptz,
  p_total_cash_counted numeric,
  p_handover_person_name text,
  p_difference_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_payment_ids uuid[] DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_settlement_id uuid;
  v_code text;
  v_expected_cash numeric := 0;
  v_expected_transfer numeric := 0;
  v_actor_name text := 'Bùi Thị Lan (Kế toán)';
  v_diff numeric := 0;
BEGIN
  -- Tạo mã biên bản bàn giao: BB-YYYYMMDD-HHMM-DEPT
  v_code := 'BB-' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYYMMDD-HH24MI') || '-' || p_handover_dept;

  -- 1. Tính toán kỳ vọng từ các khoản thanh toán CHƯA ĐƯỢC CHỐT trong kỳ
  IF array_length(p_payment_ids, 1) > 0 THEN
    SELECT 
      COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN payment_amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN payment_method <> 'CASH' THEN payment_amount ELSE 0 END), 0)
    INTO v_expected_cash, v_expected_transfer
    FROM public.app_payments
    WHERE id = ANY(p_payment_ids);
  ELSE
    SELECT 
      COALESCE(SUM(CASE WHEN payment_method = 'CASH' THEN payment_amount ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN payment_method <> 'CASH' THEN payment_amount ELSE 0 END), 0)
    INTO v_expected_cash, v_expected_transfer
    FROM public.app_payments
    WHERE collected_at >= p_period_from 
      AND collected_at <= p_period_to
      AND (p_handover_dept = 'ALL' OR collector_dept = p_handover_dept)
      AND id NOT IN (
        SELECT payment_id FROM public.app_cash_settlement_items
        WHERE settlement_id IN (SELECT id FROM public.app_cash_settlements WHERE status = 'COMPLETED')
      );
  END IF;

  v_diff := p_total_cash_counted - v_expected_cash;

  -- 2. Tạo bản ghi Cash Settlement
  INSERT INTO public.app_cash_settlements (
    settlement_code,
    collector_name,
    handover_dept,
    period_from,
    period_to,
    total_cash_expected,
    total_cash_counted,
    difference_amount,
    total_transfer_amount,
    difference_reason,
    handover_person_name,
    notes,
    status
  ) VALUES (
    v_code,
    v_actor_name,
    p_handover_dept,
    p_period_from,
    p_period_to,
    v_expected_cash,
    p_total_cash_counted,
    v_diff,
    v_expected_transfer,
    p_difference_reason,
    p_handover_person_name,
    p_notes,
    'COMPLETED'
  ) RETURNING id INTO v_settlement_id;

  -- 3. Chèn vào bảng trung gian app_cash_settlement_items (BẢO TOÀN app_payments BẤT BIẾN)
  IF array_length(p_payment_ids, 1) > 0 THEN
    INSERT INTO public.app_cash_settlement_items (settlement_id, payment_id, settled_amount, payment_method)
    SELECT v_settlement_id, id, payment_amount, payment_method
    FROM public.app_payments
    WHERE id = ANY(p_payment_ids)
    ON CONFLICT (settlement_id, payment_id) DO NOTHING;
  ELSE
    INSERT INTO public.app_cash_settlement_items (settlement_id, payment_id, settled_amount, payment_method)
    SELECT v_settlement_id, id, payment_amount, payment_method
    FROM public.app_payments
    WHERE collected_at >= p_period_from 
      AND collected_at <= p_period_to
      AND (p_handover_dept = 'ALL' OR collector_dept = p_handover_dept)
      AND id NOT IN (
        SELECT payment_id FROM public.app_cash_settlement_items
        WHERE settlement_id IN (SELECT id FROM public.app_cash_settlements WHERE status = 'COMPLETED')
      )
    ON CONFLICT (settlement_id, payment_id) DO NOTHING;
  END IF;

  -- 4. Ghi nhận sự kiện kiểm toán
  INSERT INTO public.app_audit_events (
    action_code,
    target_type,
    target_id,
    after_data,
    reason
  ) VALUES (
    'accounting.shift_cash.collect',
    'CASH_SETTLEMENT',
    v_settlement_id::text,
    jsonb_build_object(
      'code', v_code,
      'counted_cash', p_total_cash_counted,
      'expected_cash', v_expected_cash,
      'difference', v_diff,
      'handover_by', p_handover_person_name
    ),
    COALESCE(p_notes, 'Kế toán chốt và thu tiền mặt hiện trường ca trực')
  );

  RETURN jsonb_build_object(
    'success', true,
    'settlement_id', v_settlement_id,
    'settlement_code', v_code,
    'total_cash_counted', p_total_cash_counted,
    'difference_amount', v_diff,
    'message', 'Đã xác nhận thu tiền mặt và tạo biên bản bàn giao thành công'
  );
END;
$$;

-- 12. RPC Kế toán thu nợ cước bến bãi AP07
CREATE OR REPLACE FUNCTION public.sc_accounting_collect_debt(
  p_charge_id uuid,
  p_payment_amount numeric,
  p_payment_method text DEFAULT 'TRANSFER',
  p_receipt_code text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_charge record;
  v_actor_id uuid;
  v_payment_id uuid;
  v_norm_method text;
  v_new_paid numeric;
  v_new_status text;
BEGIN
  v_actor_id := COALESCE(auth.uid(), '20000000-0000-0000-0000-000000000010'::uuid);

  -- 1. Tìm khoản phải thu
  SELECT * INTO v_charge
  FROM public.app_charges
  WHERE id = p_charge_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy khoản nợ cước có mã: %', p_charge_id;
  END IF;

  IF v_charge.status = 'PAID' THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_paid', true,
      'message', 'Khoản nợ cước này đã được thanh toán trước đó.'
    );
  END IF;

  v_norm_method := CASE 
    WHEN UPPER(COALESCE(p_payment_method, 'TRANSFER')) IN ('CASH', 'TM', 'TIEN_MAT') THEN 'CASH'
    ELSE 'TRANSFER'
  END;

  -- 2. Ghi nhận vào sổ cái app_payments với collector_dept = 'KE_TOAN'
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
    v_charge.yard_id,
    v_charge.id,
    p_payment_amount,
    v_norm_method,
    v_actor_id,
    'KE_TOAN',
    NULLIF(TRIM(p_receipt_code), ''),
    COALESCE(p_notes, 'Kế toán thu hồi công nợ bến bãi')
  ) RETURNING id INTO v_payment_id;

  -- 3. Cập nhật trạng thái app_charges
  v_new_paid := COALESCE(v_charge.paid_amount, 0) + p_payment_amount;
  IF v_new_paid >= v_charge.amount THEN
    v_new_status := 'PAID';
  ELSE
    v_new_status := 'PARTIAL_PAID';
  END IF;

  UPDATE public.app_charges
  SET paid_amount = v_new_paid,
      status = v_new_status,
      updated_at = now()
  WHERE id = v_charge.id;

  -- 4. Ghi nhận kiểm toán
  INSERT INTO public.app_audit_events (
    action_code,
    target_type,
    target_id,
    after_data,
    reason
  ) VALUES (
    'accounting.debt.manage',
    'CHARGE_DEBT_COLLECT',
    v_charge.id::text,
    jsonb_build_object(
      'charge_id', v_charge.id,
      'amount_collected', p_payment_amount,
      'method', v_norm_method,
      'new_status', v_new_status
    ),
    COALESCE(p_notes, 'Kế toán thu hồi nợ cước bến bãi')
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment_id,
    'charge_id', v_charge.id,
    'paid_amount', v_new_paid,
    'status', v_new_status,
    'message', 'Đã thu nợ cước thành công'
  );
END;
$$;

-- 13. RPC Lập hồ sơ đề nghị xuất Hóa đơn GTGT (MST & CCCD)
CREATE OR REPLACE FUNCTION public.sc_create_or_update_invoice(
  p_invoice_type text,
  p_buyer_name text,
  p_buyer_address text,
  p_tax_code text DEFAULT NULL,
  p_id_card_no text DEFAULT NULL,
  p_buyer_email text DEFAULT NULL,
  p_buyer_phone text DEFAULT NULL,
  p_vat_rate numeric DEFAULT 8,
  p_charge_ids text[] DEFAULT '{}',
  p_notes text DEFAULT NULL,
  p_created_by text DEFAULT 'Bùi Thị Lan (Kế toán)'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_invoice_id uuid;
  v_code text;
  v_total numeric := 0;
  v_subtotal numeric := 0;
  v_vat numeric := 0;
  v_cid text;
  v_clean_type text;
BEGIN
  v_clean_type := UPPER(TRIM(p_invoice_type));
  IF v_clean_type NOT IN ('COMPANY', 'INDIVIDUAL') THEN
    RAISE EXCEPTION 'Loại hóa đơn không hợp lệ (phải là COMPANY hoặc INDIVIDUAL).';
  END IF;

  -- Tạo mã hồ sơ hóa đơn: HD-YYYYMMDD-XXXX
  v_code := 'HD-' || to_char(now() AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 4));

  -- Tính tổng tiền từ các charges được chọn
  IF array_length(p_charge_ids, 1) > 0 THEN
    SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM public.app_charges
    WHERE id::text = ANY(p_charge_ids);
  END IF;

  -- Quy tắc thuế Gross: Tách ngược doanh thu trước thuế và VAT
  v_subtotal := round(v_total / (1.0 + (COALESCE(p_vat_rate, 8) / 100.0)), 0);
  v_vat := v_total - v_subtotal;

  INSERT INTO public.app_invoices (
    invoice_code,
    invoice_type,
    buyer_name,
    tax_code,
    id_card_no,
    buyer_address,
    buyer_email,
    buyer_phone,
    vat_rate,
    subtotal_amount,
    vat_amount,
    total_amount,
    status,
    notes,
    created_by,
    charge_ids
  ) VALUES (
    v_code,
    v_clean_type,
    TRIM(p_buyer_name),
    NULLIF(TRIM(p_tax_code), ''),
    NULLIF(TRIM(p_id_card_no), ''),
    TRIM(p_buyer_address),
    NULLIF(TRIM(p_buyer_email), ''),
    NULLIF(TRIM(p_buyer_phone), ''),
    COALESCE(p_vat_rate, 8),
    v_subtotal,
    v_vat,
    v_total,
    'PREPARED',
    p_notes,
    p_created_by,
    p_charge_ids
  ) RETURNING id INTO v_invoice_id;

  -- Cập nhật invoice_status trên app_charges
  IF array_length(p_charge_ids, 1) > 0 THEN
    FOREACH v_cid IN ARRAY p_charge_ids LOOP
      UPDATE public.app_charges
      SET invoice_status = 'PREPARED',
          invoice_id = v_invoice_id,
          updated_at = now()
      WHERE id::text = v_cid;
    END LOOP;
  END IF;

  -- Ghi nhận sự kiện kiểm toán
  INSERT INTO public.app_audit_events (
    action_code,
    target_type,
    target_id,
    after_data,
    reason
  ) VALUES (
    'accounting.invoice.prepare',
    'INVOICE',
    v_invoice_id::text,
    jsonb_build_object(
      'code', v_code,
      'type', v_clean_type,
      'buyer', p_buyer_name,
      'total', v_total
    ),
    'Lập hồ sơ đề nghị xuất hóa đơn GTGT'
  );

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', v_invoice_id,
    'invoice_code', v_code,
    'total_amount', v_total,
    'subtotal_amount', v_subtotal,
    'vat_amount', v_vat,
    'message', 'Đã lập hồ sơ hóa đơn thành công'
  );
END;
$$;

-- 14. RPC Ghi nhận Số Hóa đơn Điện tử chính thức
CREATE OR REPLACE FUNCTION public.sc_issue_invoice(
  p_invoice_id uuid,
  p_e_invoice_no text,
  p_issued_at timestamptz DEFAULT now(),
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_inv record;
  v_cid text;
BEGIN
  SELECT * INTO v_inv
  FROM public.app_invoices
  WHERE id = p_invoice_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy hóa đơn có mã: %', p_invoice_id;
  END IF;

  UPDATE public.app_invoices
  SET status = 'INVOICED',
      e_invoice_no = TRIM(p_e_invoice_no),
      invoice_issued_at = COALESCE(p_issued_at, now()),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_invoice_id;

  -- Cập nhật các charges sang INVOICED
  IF array_length(v_inv.charge_ids, 1) > 0 THEN
    FOREACH v_cid IN ARRAY v_inv.charge_ids LOOP
      UPDATE public.app_charges
      SET invoice_status = 'INVOICED',
          updated_at = now()
      WHERE id::text = v_cid;
    END LOOP;
  END IF;

  -- Ghi nhận sự kiện kiểm toán
  INSERT INTO public.app_audit_events (
    action_code,
    target_type,
    target_id,
    after_data,
    reason
  ) VALUES (
    'accounting.invoice.prepare',
    'INVOICE_ISSUED',
    p_invoice_id::text,
    jsonb_build_object(
      'code', v_inv.invoice_code,
      'e_invoice_no', p_e_invoice_no,
      'issued_at', p_issued_at
    ),
    'Ghi nhận phát hành số HĐĐT chính thức'
  );

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', p_invoice_id,
    'e_invoice_no', p_e_invoice_no,
    'message', 'Đã ghi nhận số HĐĐT thành công'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sc_confirm_cash_settlement TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_accounting_collect_debt TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_create_or_update_invoice TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sc_issue_invoice TO anon, authenticated;

COMMIT;
