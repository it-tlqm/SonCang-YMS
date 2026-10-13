-- ==============================================================================
-- MIGRATION 004: DOMAIN SCHEMA — VEHICLES & CONTAINERS (PHASE 1C-B CODE DRAFT - R3 / 4 TABLES)
-- Dự án: Website + PWA Quản lý bến bãi/cảng cạn Sơn Cảng
-- Công ty Cổ phần Tà Lùng Quang Minh
-- Ngày cập nhật: 11/10/2026 (Khắc phục toàn diện 10 phát hiện Kiểm toán độc lập Vòng 2 & Thiết kế 4 bảng)
--
-- CẢNH BÁO: TÀI LIỆU MÃ NGUỒN DỰ THẢO (CODE-ONLY DRAFT).
-- TUYỆT ĐỐI CHƯA CHẠY MIGRATION LÊN BẤT KỲ CƠ SỞ DỮ LIỆU NÀO KHI CHƯA ĐƯỢC PHÊ DUYỆT.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. BẢNG DANH MỤC LOẠI PHƯƠNG TIỆN ĐỘNG (app_vehicle_types)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_vehicle_types (
  code text PRIMARY KEY,
  display_name text NOT NULL,
  description text NULL,
  allows_container boolean NOT NULL DEFAULT false,
  default_ticket_amount numeric(12, 2) NULL CHECK (default_ticket_amount IS NULL OR default_ticket_amount >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ràng buộc logic
  CONSTRAINT ck_vehicle_type_code_clean CHECK (code = upper(trim(code)) AND length(code) >= 2),
  CONSTRAINT ck_vehicle_type_name_not_empty CHECK (length(trim(display_name)) > 0)
);

-- Seed đúng 7 loại phương tiện chuẩn V5 có biểu phí
INSERT INTO public.app_vehicle_types (code, display_name, description, allows_container, default_ticket_amount, is_active, sort_order)
VALUES
  ('CONT_LANH', 'Xe container lạnh', 'Xe đầu kéo kéo rơ-moóc chở container lạnh', true, 250000.00, true, 10),
  ('DAU_KEO', 'Xe đầu kéo không moóc', 'Xe đầu kéo vào bãi nhận hoặc trả container/moóc', true, 0.00, true, 20),
  ('XE_BO_4_CHAN', 'Xe bo 4 chân tải thùng', 'Xe tải thùng 4 chân vận chuyển hàng hóa nội địa', false, 200000.00, true, 30),
  ('XE_BO_3_CHAN', 'Xe bo 3 chân tải thùng', 'Xe tải thùng 3 chân vận chuyển hàng hóa nội địa', false, 200000.00, true, 40),
  ('XE_BO_8_TAN_2_CHAN', 'Xe bo 8 tấn 2 chân', 'Xe tải trung 2 chân trọng tải 8 tấn', false, 100000.00, true, 50),
  ('XE_BO_3_BANH', 'Xe bo 3 bánh nội bộ', 'Xe ba gác/ba bánh chở hàng nội bộ không biển số', false, 40000.00, true, 60),
  ('XE_SANG_TAI', 'Xe sang tải nội bộ', 'Xe phục vụ tác nghiệp sang tải hàng hóa trong bãi', false, 0.00, true, 70)
ON CONFLICT (code) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  allows_container = EXCLUDED.allows_container,
  default_ticket_amount = EXCLUDED.default_ticket_amount,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = clock_timestamp();

-- ------------------------------------------------------------------------------
-- 2. BẢNG PHƯƠNG TIỆN & LƯỢT XE VÀO/RA (app_vehicle_visits)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_vehicle_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yard_id uuid NOT NULL REFERENCES public.app_yards(id) ON DELETE RESTRICT,
  
  -- Biển số phương tiện: Nullable với xe bo 3 bánh nội bộ; bắt buộc không khoảng trắng rỗng nếu có
  license_plate text NULL,
  
  -- Loại xe: Tham chiếu danh mục động app_vehicle_types; ON DELETE RESTRICT chống xóa loại xe đã có lịch sử
  vehicle_type text NOT NULL REFERENCES public.app_vehicle_types(code) ON DELETE RESTRICT,
  
  -- Thông tin tài xế / người liên hệ
  driver_name text NULL,
  driver_phone text NULL,
  
  -- Vòng đời lượt xe
  entry_at timestamptz NOT NULL DEFAULT now(),
  entry_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  exit_at timestamptz NULL,
  exit_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  -- Trạng thái lượt xe: IN_YARD (Trong bãi), EXITED (Đã xuất bãi), CANCELLED (Hủy do nhập nhầm)
  status text NOT NULL DEFAULT 'IN_YARD' CHECK (status IN ('IN_YARD', 'EXITED', 'CANCELLED')),
  
  -- Thông tin vé vào cổng giấy
  ticket_code text NULL,
  ticket_amount numeric(12, 2) NOT NULL DEFAULT 0.00 CHECK (ticket_amount >= 0),
  ticket_payment_status text NOT NULL DEFAULT 'UNPAID' CHECK (ticket_payment_status IN ('UNPAID', 'PAID', 'EXEMPT', 'CANCELLED')),
  
  -- M004-R3-04: Khóa chống tạo trùng do double-click / network retry
  idempotency_key text NULL,

  note text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ràng buộc logic
  CONSTRAINT ck_vehicle_exit_after_entry CHECK (exit_at IS NULL OR exit_at >= entry_at),
  -- M004-R3-08: Ràng buộc toàn vẹn vòng đời: Chỉ khi EXITED mới có exit_at/exit_by; ngược lại phải là NULL
  CONSTRAINT ck_vehicle_status_exit CHECK (
    (status = 'EXITED' AND exit_at IS NOT NULL AND exit_by IS NOT NULL) OR 
    (status <> 'EXITED' AND exit_at IS NULL AND exit_by IS NULL)
  ),
  CONSTRAINT ck_vehicle_license_plate_clean CHECK (license_plate IS NULL OR length(trim(license_plate)) > 0),
  CONSTRAINT ck_vehicle_idempotency_clean CHECK (idempotency_key IS NULL OR length(trim(idempotency_key)) > 0),
  
  -- Composite Unique để liên kết Foreign Key cùng bãi với Container
  CONSTRAINT uq_vehicle_visit_yard UNIQUE (id, yard_id)
);

CREATE INDEX IF NOT EXISTS idx_vehicle_visits_yard_status 
  ON public.app_vehicle_visits(yard_id, status);

CREATE INDEX IF NOT EXISTS idx_vehicle_visits_entry_at 
  ON public.app_vehicle_visits(entry_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicle_visits_license_plate 
  ON public.app_vehicle_visits(license_plate) 
  WHERE license_plate IS NOT NULL;

-- M004-R3-04: Partial Unique Index bảo vệ chống trùng lặp idempotency key trong cùng bãi
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_visits_idempotency 
  ON public.app_vehicle_visits(yard_id, idempotency_key) 
  WHERE idempotency_key IS NOT NULL;


-- ------------------------------------------------------------------------------
-- 3. BẢNG LƯỢT CONTAINER ĐỘC LẬP (app_container_visits)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_container_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  yard_id uuid NOT NULL REFERENCES public.app_yards(id) ON DELETE RESTRICT,
  
  -- Số hiệu container: Hiện hành và ban đầu khi vào bãi
  container_no_current text NOT NULL,
  container_no_original text NOT NULL,
  
  -- Kích thước và phân loại
  container_size text NULL CHECK (container_size IS NULL OR container_size IN ('20', '40', '45', 'OTHER')),
  container_type text NULL DEFAULT 'RF',
  
  -- Liên kết lượt xe vào (Inbound) và lượt xe ra (Outbound) độc lập hoàn toàn
  -- M004-R1-07: inbound_vehicle_visit_id là NULLABLE để hỗ trợ dữ liệu legacy import hoặc cont chưa xác định xe vào
  -- KHÔNG CÓ UNIQUE CONSTRAINT TRÊN INBOUND/OUTBOUND: CSDL hỗ trợ quan hệ 1 Xe : N Cont (SC-1C-A-01)
  inbound_vehicle_visit_id uuid NULL REFERENCES public.app_vehicle_visits(id) ON DELETE RESTRICT,
  inbound_at timestamptz NOT NULL DEFAULT now(),
  
  outbound_vehicle_visit_id uuid NULL REFERENCES public.app_vehicle_visits(id) ON DELETE RESTRICT,
  outbound_at timestamptz NULL,
  
  -- Trạng thái container trong bãi
  status text NOT NULL DEFAULT 'IN_YARD' CHECK (status IN ('IN_YARD', 'EXITED', 'CANCELLED')),
  
  -- Trạng thái HÀNG / RỖNG do Bộ phận Điều phối phụ trách
  cargo_status text NOT NULL DEFAULT 'CHUA_XAC_DINH' CHECK (cargo_status IN ('HANG', 'RONG', 'CHUA_XAC_DINH')),
  cargo_status_updated_at timestamptz NULL,
  cargo_status_updated_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  -- Cờ nhận diện dữ liệu chuyển đổi lịch sử từ AppSheet
  is_legacy_import boolean NOT NULL DEFAULT false,
  legacy_import_notes text NULL,
  
  -- M004-R3-04: Khóa chống tạo trùng do double-click / network retry
  idempotency_key text NULL,

  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Ràng buộc logic
  CONSTRAINT ck_container_outbound_after_inbound CHECK (outbound_at IS NULL OR outbound_at >= inbound_at),
  CONSTRAINT ck_container_no_not_empty CHECK (length(trim(container_no_current)) > 0 AND length(trim(container_no_original)) > 0),
  -- M004-R3-08: Ràng buộc toàn vẹn vòng đời: Chỉ khi EXITED mới có outbound_at; ngược lại phải là NULL
  CONSTRAINT ck_container_status_outbound CHECK (
    (status = 'EXITED' AND outbound_at IS NOT NULL) OR 
    (status <> 'EXITED' AND outbound_at IS NULL)
  ),
  CONSTRAINT ck_container_idempotency_clean CHECK (idempotency_key IS NULL OR length(trim(idempotency_key)) > 0),
  
  -- Ràng buộc chống liên kết lệch bãi giữa Xe và Container (Cross-yard prevention)
  CONSTRAINT fk_container_inbound_vehicle_yard 
    FOREIGN KEY (inbound_vehicle_visit_id, yard_id) 
    REFERENCES public.app_vehicle_visits(id, yard_id) ON DELETE RESTRICT,
    
  CONSTRAINT fk_container_outbound_vehicle_yard 
    FOREIGN KEY (outbound_vehicle_visit_id, yard_id) 
    REFERENCES public.app_vehicle_visits(id, yard_id) ON DELETE RESTRICT,

  -- Composite Unique để liên kết Foreign Key cùng bãi với Lịch sử sửa số
  CONSTRAINT uq_container_visit_yard UNIQUE (id, yard_id)
);

CREATE INDEX IF NOT EXISTS idx_container_visits_yard_status 
  ON public.app_container_visits(yard_id, status);

CREATE INDEX IF NOT EXISTS idx_container_visits_no_current 
  ON public.app_container_visits(container_no_current);

-- M004-R2-06: Partial Unique Index bảo vệ chống trùng lặp số container IN_YARD trong cùng bãi (Concurrency Safe)
CREATE UNIQUE INDEX IF NOT EXISTS uq_container_visits_active_number_yard 
  ON public.app_container_visits(yard_id, upper(btrim(container_no_current))) 
  WHERE status = 'IN_YARD';

CREATE INDEX IF NOT EXISTS idx_container_visits_inbound_veh 
  ON public.app_container_visits(inbound_vehicle_visit_id);

CREATE INDEX IF NOT EXISTS idx_container_visits_outbound_veh 
  ON public.app_container_visits(outbound_vehicle_visit_id) 
  WHERE outbound_vehicle_visit_id IS NOT NULL;

-- M004-R3-04: Partial Unique Index bảo vệ chống trùng lặp idempotency key trong cùng bãi
CREATE UNIQUE INDEX IF NOT EXISTS uq_container_visits_idempotency 
  ON public.app_container_visits(yard_id, idempotency_key) 
  WHERE idempotency_key IS NOT NULL;


-- ------------------------------------------------------------------------------
-- 4. BẢNG LỊCH SỬ CHỈNH SỬA SỐ CONTAINER (app_container_number_changes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_container_number_changes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  container_visit_id uuid NOT NULL REFERENCES public.app_container_visits(id) ON DELETE RESTRICT,
  yard_id uuid NOT NULL REFERENCES public.app_yards(id) ON DELETE RESTRICT,
  
  old_number text NOT NULL,
  new_number text NOT NULL,
  reason text NOT NULL,
  evidence_url text NULL,
  
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  changed_at timestamptz NOT NULL DEFAULT now(),
  
  -- Cảnh báo và đối soát nội bộ giữa An ninh và CCKB
  notified_cckb boolean NOT NULL DEFAULT true,
  sec_ack_at timestamptz NULL,
  sec_ack_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  
  reconciled_at timestamptz NULL,
  reconciled_by uuid NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reconcile_notes text NULL,
  
  created_at timestamptz NOT NULL DEFAULT now(),

  -- Ràng buộc logic
  CONSTRAINT ck_change_reason_not_empty CHECK (length(trim(reason)) >= 3),
  CONSTRAINT ck_change_numbers_differ CHECK (trim(old_number) <> trim(new_number)),
  CONSTRAINT ck_change_old_no_not_empty CHECK (length(trim(old_number)) > 0),
  CONSTRAINT ck_change_new_no_not_empty CHECK (length(trim(new_number)) > 0),
  
  -- Ràng buộc cùng bãi với Container Visit
  CONSTRAINT fk_change_container_yard 
    FOREIGN KEY (container_visit_id, yard_id) 
    REFERENCES public.app_container_visits(id, yard_id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_container_num_changes_visit 
  ON public.app_container_number_changes(container_visit_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_container_num_changes_yard 
  ON public.app_container_number_changes(yard_id, created_at DESC);


-- ------------------------------------------------------------------------------
-- 4. TRIGGERS BẢO VỆ TÍNH BẤT BIẾN VÀ THỜI GIAN
-- ------------------------------------------------------------------------------

-- 4.1 Trigger bảo vệ tính bất biến của bảng app_container_number_changes (Append-Only)
-- M004-R1-08 & M004-R2-08: So sánh NULL-safe bằng IS DISTINCT FROM chống ghi đè hoặc xóa dấu xác nhận về NULL
CREATE OR REPLACE FUNCTION public.sc_trg_container_number_changes_immutable()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Lịch sử sửa số container là bất biến (append-only). Nghiêm cấm xóa bản ghi.';
  ELSIF TG_OP = 'UPDATE' THEN
    -- Cấm tuyệt đối thay đổi các trường dữ liệu lịch sử cốt lõi và chứng cứ ban đầu (NULL-safe qua IS DISTINCT FROM)
    IF NEW.id IS DISTINCT FROM OLD.id OR
       NEW.container_visit_id IS DISTINCT FROM OLD.container_visit_id OR
       NEW.yard_id IS DISTINCT FROM OLD.yard_id OR
       NEW.old_number IS DISTINCT FROM OLD.old_number OR
       NEW.new_number IS DISTINCT FROM OLD.new_number OR
       NEW.reason IS DISTINCT FROM OLD.reason OR
       NEW.evidence_url IS DISTINCT FROM OLD.evidence_url OR
       NEW.changed_by IS DISTINCT FROM OLD.changed_by OR
       NEW.changed_at IS DISTINCT FROM OLD.changed_at OR
       NEW.notified_cckb IS DISTINCT FROM OLD.notified_cckb OR
       NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Dữ liệu lịch sử sửa số container và chứng cứ là bất biến. Không được phép chỉnh sửa các thông tin gốc.';
    END IF;

    -- Kiểm soát chuyển trạng thái 1 chiều của An ninh (chống ghi đè hoặc xóa về NULL)
    IF OLD.sec_ack_at IS NOT NULL AND (
       NEW.sec_ack_at IS DISTINCT FROM OLD.sec_ack_at OR 
       NEW.sec_ack_by IS DISTINCT FROM OLD.sec_ack_by
    ) THEN
      RAISE EXCEPTION 'Thông tin xác nhận của An ninh đã được ghi nhận trước đó, không được phép sửa đổi hoặc xóa bỏ.';
    END IF;

    -- Ràng buộc cặp An ninh: nếu có sec_ack_at thì sec_ack_by bắt buộc không được NULL
    IF NEW.sec_ack_at IS NOT NULL AND NEW.sec_ack_by IS NULL THEN
      RAISE EXCEPTION 'Thông tin xác nhận của An ninh không hợp lệ: thiếu sec_ack_by.';
    END IF;

    -- Kiểm soát chuyển trạng thái 1 chiều của CCKB (chống ghi đè hoặc xóa về NULL)
    IF OLD.reconciled_at IS NOT NULL AND (
       NEW.reconciled_at IS DISTINCT FROM OLD.reconciled_at OR 
       NEW.reconciled_by IS DISTINCT FROM OLD.reconciled_by OR 
       NEW.reconcile_notes IS DISTINCT FROM OLD.reconcile_notes
    ) THEN
      RAISE EXCEPTION 'Thông tin đối soát của CCKB đã được ghi nhận trước đó, không được phép sửa đổi hoặc xóa bỏ.';
    END IF;

    -- Ràng buộc cặp CCKB: nếu có reconciled_at thì reconciled_by và reconcile_notes bắt buộc không được NULL
    IF NEW.reconciled_at IS NOT NULL AND (NEW.reconciled_by IS NULL OR NEW.reconcile_notes IS NULL) THEN
      RAISE EXCEPTION 'Thông tin đối soát của CCKB không hợp lệ: thiếu reconciled_by hoặc reconcile_notes.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_container_number_changes_immutable ON public.app_container_number_changes;
CREATE TRIGGER trg_container_number_changes_immutable
  BEFORE UPDATE OR DELETE ON public.app_container_number_changes
  FOR EACH ROW EXECUTE FUNCTION public.sc_trg_container_number_changes_immutable();


-- 4.2 Trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.sc_trg_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at := clock_timestamp();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_vehicle_types ON public.app_vehicle_types;
CREATE TRIGGER trg_touch_vehicle_types
  BEFORE UPDATE ON public.app_vehicle_types
  FOR EACH ROW EXECUTE FUNCTION public.sc_trg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_vehicle_visits ON public.app_vehicle_visits;
CREATE TRIGGER trg_touch_vehicle_visits
  BEFORE UPDATE ON public.app_vehicle_visits
  FOR EACH ROW EXECUTE FUNCTION public.sc_trg_touch_updated_at();

DROP TRIGGER IF EXISTS trg_touch_container_visits ON public.app_container_visits;
CREATE TRIGGER trg_touch_container_visits
  BEFORE UPDATE ON public.app_container_visits
  FOR EACH ROW EXECUTE FUNCTION public.sc_trg_touch_updated_at();


-- ------------------------------------------------------------------------------
-- 5. PHÂN QUYỀN RLS (ROW LEVEL SECURITY)
-- ------------------------------------------------------------------------------

ALTER TABLE public.app_vehicle_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_vehicle_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_container_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_container_number_changes ENABLE ROW LEVEL SECURITY;

-- 5.0 RLS Policies: app_vehicle_types (Danh mục loại phương tiện dùng chung)
DROP POLICY IF EXISTS p_vehicle_types_select ON public.app_vehicle_types;
CREATE POLICY p_vehicle_types_select ON public.app_vehicle_types
  FOR SELECT TO authenticated
  USING (true);

-- 5.1 RLS Policies: app_vehicle_visits
DROP POLICY IF EXISTS p_vehicle_visits_select ON public.app_vehicle_visits;
CREATE POLICY p_vehicle_visits_select ON public.app_vehicle_visits
  FOR SELECT TO authenticated
  USING (public.sc_can('vehicle.visit.read', yard_id));

-- 5.2 RLS Policies: app_container_visits
DROP POLICY IF EXISTS p_container_visits_select ON public.app_container_visits;
CREATE POLICY p_container_visits_select ON public.app_container_visits
  FOR SELECT TO authenticated
  USING (public.sc_can('container.visit.read', yard_id));

-- 5.3 RLS Policies: app_container_number_changes
-- M004-R1-05: Sửa policy CHỈ cho phép vai trò có quyền container.number.discrepancy.view xem lịch sử sửa số
-- (Bỏ nhánh OR container.visit.read để ngăn chặn Điều phối viên DIS_STAFF/DIS_LEAD xem sai phân nhiệm)
DROP POLICY IF EXISTS p_container_number_changes_select ON public.app_container_number_changes;
CREATE POLICY p_container_number_changes_select ON public.app_container_number_changes
  FOR SELECT TO authenticated
  USING (public.sc_can('container.number.discrepancy.view', yard_id));

-- Thu hồi quyền ghi trực tiếp trên các bảng: Khóa direct INSERT, UPDATE, DELETE khỏi authenticated & anon
-- Mọi thao tác ghi phải đi qua các hàm RPC SECURITY DEFINER được kiểm soát nghiêm ngặt.
REVOKE ALL ON public.app_vehicle_types FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.app_vehicle_types TO authenticated;

REVOKE ALL ON public.app_vehicle_visits FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.app_vehicle_visits TO authenticated;

REVOKE ALL ON public.app_container_visits FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.app_container_visits TO authenticated;

REVOKE ALL ON public.app_container_number_changes FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.app_container_number_changes TO authenticated;


-- ------------------------------------------------------------------------------
-- 6. RPC ENTRY POINTS — CÁC HÀM THAO TÁC NGHIỆP VỤ AN TOÀN
-- ------------------------------------------------------------------------------

-- 6.0 RPC: Quản lý cấu hình danh mục loại phương tiện (Quản trị hệ thống SYS_ADMIN)
-- Phân quyền RBAC V5: admin.billing_settings.manage (Scope ALL)
CREATE OR REPLACE FUNCTION public.sc_manage_vehicle_type(
  p_code text,
  p_display_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_allows_container boolean DEFAULT NULL,
  p_default_ticket_amount numeric(12, 2) DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_sort_order integer DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_clean_code text;
  v_old_row record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF NOT public.sc_can('admin.billing_settings.manage', NULL) THEN
    RAISE EXCEPTION 'Permission Denied: Yêu cầu quyền admin.billing_settings.manage để quản lý danh mục loại phương tiện.';
  END IF;

  v_clean_code := upper(trim(p_code));
  IF v_clean_code IS NULL OR length(v_clean_code) < 2 THEN
    RAISE EXCEPTION 'Mã loại phương tiện không hợp lệ: %', p_code;
  END IF;

  SELECT * INTO v_old_row FROM public.app_vehicle_types WHERE code = v_clean_code;

  -- M004-R3-03: Kiểm soát tài chính theo AP10 Four-Eyes:
  -- Tuyệt đối không cho phép thay đổi giá vé của loại xe đã tồn tại qua RPC danh mục này
  IF v_old_row.code IS NOT NULL AND p_default_ticket_amount IS NOT NULL AND p_default_ticket_amount IS DISTINCT FROM v_old_row.default_ticket_amount THEN
    RAISE EXCEPTION 'Việc thay đổi giá vé yêu cầu quy trình phê duyệt bảng giá AP10 (Four-Eyes). Không được phép thay đổi giá trực tiếp qua danh mục loại xe.';
  END IF;

  -- M004-R3-03: Đối với loại xe mới, chưa cho phép tự ấn định giá không qua AP10
  IF v_old_row.code IS NULL AND p_default_ticket_amount IS NOT NULL THEN
    RAISE EXCEPTION 'Thiết lập biểu phí cho loại xe mới yêu cầu quy trình phê duyệt bảng giá AP10. Loại xe mới tạo sẽ có trạng thái chưa có giá cho đến khi ban hành biểu phí.';
  END IF;

  IF v_old_row.code IS NOT NULL THEN
    -- M004-R3-02: CẬP NHẬT LOẠI XE ĐÃ CÓ (PATCH SEMANTICS) — Bảo toàn các trường không truyền
    UPDATE public.app_vehicle_types
    SET display_name = CASE WHEN p_display_name IS NOT NULL AND length(trim(p_display_name)) > 0 THEN trim(p_display_name) ELSE v_old_row.display_name END,
        description = CASE WHEN p_description IS NOT NULL THEN trim(p_description) ELSE v_old_row.description END,
        allows_container = COALESCE(p_allows_container, v_old_row.allows_container),
        is_active = COALESCE(p_is_active, v_old_row.is_active),
        sort_order = COALESCE(p_sort_order, v_old_row.sort_order),
        updated_at = clock_timestamp()
    WHERE code = v_clean_code;
  ELSE
    -- TẠO LOẠI XE MỚI: Bắt buộc display_name không được để trống
    IF p_display_name IS NULL OR length(trim(p_display_name)) = 0 THEN
      RAISE EXCEPTION 'Tên hiển thị loại phương tiện không được để trống khi tạo mới.';
    END IF;

    INSERT INTO public.app_vehicle_types (
      code, display_name, description, allows_container,
      default_ticket_amount, is_active, sort_order, updated_at
    ) VALUES (
      v_clean_code, trim(p_display_name), trim(p_description),
      COALESCE(p_allows_container, false), NULL,
      COALESCE(p_is_active, true), COALESCE(p_sort_order, 0), clock_timestamp()
    );
  END IF;

  PERFORM public.sc_log_audit_event(
    'vehicle_type.manage', 'app_vehicle_types', v_clean_code,
    NULL, 'HE_THONG', to_jsonb(v_old_row),
    jsonb_build_object(
      'code', v_clean_code,
      'display_name', trim(p_display_name),
      'allows_container', p_allows_container,
      'is_active', p_is_active
    ),
    'Quản lý cấu hình danh mục loại phương tiện'
  );
END;
$$;


-- 6.1 RPC: Tạo lượt xe vào cổng (An ninh cổng vào)
-- M004-R1-06 & M004-R2-10: Server tự tính tiền vé theo bảng danh mục app_vehicle_types (không tin client)
-- M004-R3-04: Khóa chống tạo trùng Idempotency cho lượt xe
CREATE OR REPLACE FUNCTION public.sc_create_vehicle_visit(
  p_yard_id uuid,
  p_vehicle_type text,
  p_license_plate text DEFAULT NULL,
  p_driver_name text DEFAULT NULL,
  p_driver_phone text DEFAULT NULL,
  p_ticket_code text DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_visit_id uuid;
  v_clean_plate text;
  v_clean_idem text;
  v_yard_active boolean;
  v_ticket_price numeric(12, 2);
  v_payment_status text;
  v_vtype record;
  v_existing_veh record;
  v_new_row record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  -- Kiểm tra Bãi tồn tại và hoạt động
  SELECT is_active INTO v_yard_active FROM public.app_yards WHERE id = p_yard_id;
  IF NOT FOUND OR v_yard_active = false THEN
    RAISE EXCEPTION 'Bãi không hợp lệ hoặc đang bị vô hiệu hóa: %', p_yard_id;
  END IF;

  -- Kiểm tra quyền tạo lượt xe
  IF NOT public.sc_can('vehicle.visit.create', p_yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền tạo lượt xe vào tại bãi tương ứng.';
  END IF;

  v_clean_plate := NULLIF(trim(p_license_plate), '');
  v_clean_idem := NULLIF(trim(p_idempotency_key), '');

  -- M004-R3-04: Xử lý Idempotency chống tạo trùng do double-click / network retry
  IF v_clean_idem IS NOT NULL THEN
    SELECT * INTO v_existing_veh 
    FROM public.app_vehicle_visits 
    WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

    IF FOUND THEN
      -- Nếu cùng thông tin toàn bộ payload: trả về ID cũ (idempotent replay an toàn)
      IF v_existing_veh.vehicle_type = p_vehicle_type AND 
         coalesce(v_existing_veh.license_plate, '') = coalesce(v_clean_plate, '') AND
         coalesce(v_existing_veh.driver_name, '') = coalesce(trim(p_driver_name), '') AND
         coalesce(v_existing_veh.driver_phone, '') = coalesce(trim(p_driver_phone), '') AND
         coalesce(v_existing_veh.ticket_code, '') = coalesce(trim(p_ticket_code), '') AND
         coalesce(v_existing_veh.note, '') = coalesce(trim(p_note), '') THEN
        RETURN v_existing_veh.id;
      ELSE
        RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin lượt xe khác.', v_clean_idem;
      END IF;
    END IF;
  END IF;

  -- Kiểm tra loại xe tồn tại trong danh mục app_vehicle_types
  SELECT * INTO v_vtype FROM public.app_vehicle_types WHERE code = p_vehicle_type;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loại xe không tồn tại trong danh mục: %', p_vehicle_type;
  END IF;

  IF v_vtype.is_active = false THEN
    RAISE EXCEPTION 'Loại xe % đang bị vô hiệu hóa, không thể tiếp nhận vào bãi.', p_vehicle_type;
  END IF;

  -- M004-R2-10 & Quyết định Người dùng: Chặn xe chưa được thiết lập giá, không tự động miễn phí
  IF v_vtype.default_ticket_amount IS NULL THEN
    RAISE EXCEPTION 'Loại xe % chưa được thiết lập biểu phí hợp lệ. Không thể tiếp nhận hoặc tự động miễn phí.', p_vehicle_type;
  END IF;

  -- Kiểm tra tính hợp lệ của biển số
  IF p_vehicle_type <> 'XE_BO_3_BANH' AND v_clean_plate IS NULL THEN
    RAISE EXCEPTION 'Biển số xe là bắt buộc đối với loại xe %.', p_vehicle_type;
  END IF;

  -- Xác định giá vé server-side từ danh mục phương tiện (không tin client)
  v_ticket_price := v_vtype.default_ticket_amount;

  v_payment_status := CASE 
    WHEN v_ticket_price = 0 THEN 'EXEMPT'
    ELSE 'UNPAID'
  END;

  BEGIN
    INSERT INTO public.app_vehicle_visits (
      yard_id, license_plate, vehicle_type, driver_name, driver_phone,
      ticket_code, ticket_amount, ticket_payment_status, note, entry_by, status,
      idempotency_key
    ) VALUES (
      p_yard_id, v_clean_plate, p_vehicle_type, trim(p_driver_name), trim(p_driver_phone),
      trim(p_ticket_code), v_ticket_price, v_payment_status, trim(p_note), v_actor_id, 'IN_YARD',
      v_clean_idem
    ) RETURNING id INTO v_visit_id;
  EXCEPTION WHEN unique_violation THEN
    -- Nếu bị trùng idempotency_key do 2 request chạy đồng thời cùng thời điểm
    IF v_clean_idem IS NOT NULL THEN
      SELECT * INTO v_existing_veh 
      FROM public.app_vehicle_visits 
      WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

      IF FOUND AND v_existing_veh.vehicle_type = p_vehicle_type AND 
         coalesce(v_existing_veh.license_plate, '') = coalesce(v_clean_plate, '') AND
         coalesce(v_existing_veh.driver_name, '') = coalesce(trim(p_driver_name), '') AND
         coalesce(v_existing_veh.driver_phone, '') = coalesce(trim(p_driver_phone), '') AND
         coalesce(v_existing_veh.ticket_code, '') = coalesce(trim(p_ticket_code), '') AND
         coalesce(v_existing_veh.note, '') = coalesce(trim(p_note), '') THEN
        RETURN v_existing_veh.id;
      ELSE
        RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin lượt xe khác.', v_clean_idem;
      END IF;
    ELSE
      RAISE;
    END IF;
  END;

  SELECT * INTO v_new_row FROM public.app_vehicle_visits WHERE id = v_visit_id;

  -- Ghi nhận Audit Event
  PERFORM public.sc_log_audit_event(
    'vehicle.visit.create', 'app_vehicle_visits', v_visit_id::text,
    p_yard_id, 'AN_NINH', NULL, to_jsonb(v_new_row), 'Tạo lượt xe vào bãi'
  );

  RETURN v_visit_id;
END;
$$;


-- 6.2 RPC: Sửa thông tin cơ bản lượt xe (An ninh cổng)
CREATE OR REPLACE FUNCTION public.sc_update_vehicle_visit_basic(
  p_vehicle_visit_id uuid,
  p_license_plate text,
  p_driver_name text,
  p_driver_phone text,
  p_note text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_veh record;
  v_clean_plate text;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  SELECT * INTO v_veh 
  FROM public.app_vehicle_visits 
  WHERE id = p_vehicle_visit_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt xe: %', p_vehicle_visit_id;
  END IF;

  IF NOT public.sc_can('vehicle.visit.update_basic', v_veh.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền sửa thông tin cơ bản xe tại bãi này.';
  END IF;

  IF v_veh.status <> 'IN_YARD' THEN
    RAISE EXCEPTION 'Chỉ được phép sửa thông tin khi lượt xe đang trong bãi (IN_YARD). Trạng thái hiện tại: %', v_veh.status;
  END IF;

  v_clean_plate := NULLIF(trim(p_license_plate), '');
  IF v_veh.vehicle_type <> 'XE_BO_3_BANH' AND v_clean_plate IS NULL THEN
    RAISE EXCEPTION 'Biển số xe là bắt buộc đối với loại xe %.', v_veh.vehicle_type;
  END IF;

  UPDATE public.app_vehicle_visits
  SET license_plate = v_clean_plate,
      driver_name = trim(p_driver_name),
      driver_phone = trim(p_driver_phone),
      note = trim(p_note),
      updated_at = clock_timestamp()
  WHERE id = p_vehicle_visit_id;

  -- Ghi nhận Audit Event
  PERFORM public.sc_log_audit_event(
    'vehicle.visit.update_basic', 'app_vehicle_visits', p_vehicle_visit_id::text,
    v_veh.yard_id, 'AN_NINH', to_jsonb(v_veh), 
    jsonb_build_object('license_plate', v_clean_plate, 'driver_name', p_driver_name, 'driver_phone', p_driver_phone, 'note', p_note),
    'Cập nhật thông tin cơ bản lượt xe'
  );
END;
$$;


-- 6.3 RPC: Tạo lượt container vào bãi (An ninh cổng vào)
-- M004-R1-04: Loại bỏ p_cargo_status; server luôn khởi tạo 'CHUA_XAC_DINH' (chỉ Điều phối cập nhật)
-- M004-R1-06: Loại bỏ p_is_legacy_import và notes; server luôn khởi tạo false (không tin client)
-- M004-R1-09: Kiểm soát nghiêm ngặt V1 baseline (chặn xe đã từng gắn container không bị hủy)
-- M004-R1-11: Cảnh báo phát hiện 2 lượt container IN_YARD có cùng số hiệu trong bãi
CREATE OR REPLACE FUNCTION public.sc_create_container_visit(
  p_yard_id uuid,
  p_container_no text,
  p_inbound_vehicle_visit_id uuid,
  p_container_size text DEFAULT NULL,
  p_container_type text DEFAULT 'RF',
  p_idempotency_key text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_cont_id uuid;
  v_clean_no text;
  v_clean_idem text;
  v_veh record;
  v_allows_container boolean;
  v_linked_cont_count integer;
  v_dup_in_yard_count integer;
  v_yard_active boolean;
  v_existing_cont record;
  v_new_row record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  -- M004-R3-07: Kiểm tra Bãi tồn tại và hoạt động (nhất quán với lượt xe)
  SELECT is_active INTO v_yard_active FROM public.app_yards WHERE id = p_yard_id;
  IF NOT FOUND OR v_yard_active = false THEN
    RAISE EXCEPTION 'Bãi không hợp lệ hoặc đang bị vô hiệu hóa: %', p_yard_id;
  END IF;

  IF NOT public.sc_can('container.visit.create', p_yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền tạo lượt container tại bãi tương ứng.';
  END IF;

  v_clean_no := upper(trim(p_container_no));
  IF v_clean_no IS NULL OR length(v_clean_no) < 4 THEN
    RAISE EXCEPTION 'Số container không hợp lệ: %', p_container_no;
  END IF;

  v_clean_idem := NULLIF(trim(p_idempotency_key), '');

  -- M004-R3-04: Xử lý Idempotency chống tạo trùng do double-click / network retry
  IF v_clean_idem IS NOT NULL THEN
    SELECT * INTO v_existing_cont 
    FROM public.app_container_visits 
    WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

    IF FOUND THEN
      -- Nếu cùng thông tin toàn bộ payload: trả về ID cũ (idempotent replay an toàn)
      IF v_existing_cont.container_no_current = v_clean_no AND 
         v_existing_cont.inbound_vehicle_visit_id = p_inbound_vehicle_visit_id AND
         coalesce(v_existing_cont.container_size, '') = coalesce(trim(p_container_size), '') AND
         coalesce(v_existing_cont.container_type, '') = coalesce(trim(p_container_type), '') THEN
        RETURN v_existing_cont.id;
      ELSE
        RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin lượt container khác.', v_clean_idem;
      END IF;
    END IF;
  END IF;

  -- M004-R1-11: Kiểm tra phát hiện trùng số container đang ở trạng thái IN_YARD trong cùng bãi
  SELECT count(*) INTO v_dup_in_yard_count
  FROM public.app_container_visits
  WHERE yard_id = p_yard_id 
    AND container_no_current = v_clean_no 
    AND status = 'IN_YARD';

  IF v_dup_in_yard_count > 0 THEN
    RAISE EXCEPTION 'Cảnh báo trùng số container: Container % hiện đang có một lượt lưu bãi khác ở trạng thái IN_YARD trong cùng bãi. Không tự động gộp lượt. Vui lòng xác minh thực tế.', v_clean_no;
  END IF;

  -- Kiểm tra xe vào bắt buộc phải truyền và tồn tại
  IF p_inbound_vehicle_visit_id IS NULL THEN
    RAISE EXCEPTION 'Lượt xe vào là bắt buộc khi tạo container vào cổng.';
  END IF;

  SELECT * INTO v_veh 
  FROM public.app_vehicle_visits 
  WHERE id = p_inbound_vehicle_visit_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt xe vào: %', p_inbound_vehicle_visit_id;
  END IF;

  IF v_veh.yard_id <> p_yard_id THEN
    RAISE EXCEPTION 'Xe vào và container không cùng bãi. Xe bãi: %, Cont bãi: %', v_veh.yard_id, p_yard_id;
  END IF;

  IF v_veh.status <> 'IN_YARD' THEN
    RAISE EXCEPTION 'Xe đưa container vào phải đang ở trong bãi (IN_YARD). Trạng thái xe hiện tại: %', v_veh.status;
  END IF;

  -- M004-R2-07 & M004-R3-09: Kiểm tra loại xe được phép chở/kéo container theo cấu hình danh mục app_vehicle_types (Generic error description)
  SELECT allows_container INTO v_allows_container
  FROM public.app_vehicle_types
  WHERE code = v_veh.vehicle_type;

  IF v_allows_container IS NOT TRUE THEN
    RAISE EXCEPTION 'Loại phương tiện % không được phép tiếp nhận container vào bãi theo cấu hình danh mục phương tiện.', v_veh.vehicle_type;
  END IF;

  -- M004-R1-09: BẢO TOÀN QUY TẮC VẬN HÀNH V1 TẠI TẦNG RPC (Preserve V1 Baseline):
  -- Theo V1: Mỗi lượt xe chỉ liên kết tối đa 1 container. Chặn xe đã từng gắn container không bị CANCELLED.
  SELECT count(*) INTO v_linked_cont_count
  FROM public.app_container_visits
  WHERE inbound_vehicle_visit_id = p_inbound_vehicle_visit_id 
    AND status <> 'CANCELLED';

  IF v_linked_cont_count >= 1 THEN
    RAISE EXCEPTION 'Quy tắc vận hành V1 hiện hành: Mỗi lượt xe chỉ tiếp nhận tối đa 1 container. Thao tác tiếp nhận nhiều container trên cùng một lượt xe chưa được phê duyệt UAT.';
  END IF;

  -- M004-R1-04: cargo_status LUÔN khởi tạo 'CHUA_XAC_DINH', không cho An ninh truyền vào
  -- M004-R1-06: is_legacy_import LUÔN khởi tạo false, không nhận từ client
  -- M004-R2-06 & M004-R3-04: Bắt ngoại lệ unique_violation khi hai request chạy đồng thời
  BEGIN
    INSERT INTO public.app_container_visits (
      yard_id, container_no_current, container_no_original, container_size,
      container_type, inbound_vehicle_visit_id, cargo_status, is_legacy_import,
      legacy_import_notes, created_by, status, idempotency_key
    ) VALUES (
      p_yard_id, v_clean_no, v_clean_no, p_container_size,
      p_container_type, p_inbound_vehicle_visit_id, 'CHUA_XAC_DINH', false,
      NULL, v_actor_id, 'IN_YARD', v_clean_idem
    ) RETURNING id INTO v_cont_id;
  EXCEPTION WHEN unique_violation THEN
    -- Nếu bị trùng idempotency_key
    IF v_clean_idem IS NOT NULL THEN
      SELECT * INTO v_existing_cont 
      FROM public.app_container_visits 
      WHERE yard_id = p_yard_id AND idempotency_key = v_clean_idem;

      IF FOUND AND v_existing_cont.container_no_current = v_clean_no AND 
         v_existing_cont.inbound_vehicle_visit_id = p_inbound_vehicle_visit_id AND
         coalesce(v_existing_cont.container_size, '') = coalesce(trim(p_container_size), '') AND
         coalesce(v_existing_cont.container_type, '') = coalesce(trim(p_container_type), '') THEN
        RETURN v_existing_cont.id;
      ELSE
        RAISE EXCEPTION 'Idempotency key % đã được sử dụng với thông tin lượt container khác.', v_clean_idem;
      END IF;
    ELSE
      -- Nếu trùng uq_container_visits_active_number_yard
      RAISE EXCEPTION 'Cảnh báo trùng số container: Container % hiện đang có một lượt lưu bãi khác ở trạng thái IN_YARD trong cùng bãi. Không tự động gộp lượt. Vui lòng xác minh thực tế.', v_clean_no;
    END IF;
  END;

  SELECT * INTO v_new_row FROM public.app_container_visits WHERE id = v_cont_id;

  -- Ghi nhận Audit Event
  PERFORM public.sc_log_audit_event(
    'container.visit.create', 'app_container_visits', v_cont_id::text,
    p_yard_id, 'AN_NINH', NULL, to_jsonb(v_new_row), 'Tạo lượt container vào bãi'
  );

  RETURN v_cont_id;
END;
$$;


-- 6.4 RPC: Sửa số container trên cùng ID lượt (An ninh cổng / An ninh trưởng)
-- M004-R1-11: Cảnh báo nếu số mới trùng với một container khác đang IN_YARD trong cùng bãi
CREATE OR REPLACE FUNCTION public.sc_correct_container_number(
  p_container_visit_id uuid,
  p_new_container_no text,
  p_reason text,
  p_evidence_url text DEFAULT NULL
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_cont record;
  v_clean_new_no text;
  v_old_no text;
  v_dup_in_yard_count integer;
  v_change_id bigint;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'Lý do sửa số container là bắt buộc (tối thiểu 3 ký tự).';
  END IF;

  -- Khóa dòng container mục tiêu
  SELECT * INTO v_cont 
  FROM public.app_container_visits 
  WHERE id = p_container_visit_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt container: %', p_container_visit_id;
  END IF;

  IF NOT public.sc_can('container.number.correct', v_cont.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền sửa số container tại bãi tương ứng.';
  END IF;

  v_clean_new_no := upper(trim(p_new_container_no));
  IF v_clean_new_no IS NULL OR length(v_clean_new_no) < 4 THEN
    RAISE EXCEPTION 'Số container mới không hợp lệ: %', p_new_container_no;
  END IF;

  IF v_clean_new_no = v_cont.container_no_current THEN
    RAISE EXCEPTION 'Số container mới phải khác số container hiện tại (%).', v_cont.container_no_current;
  END IF;

  -- M004-R1-11: Cảnh báo nếu số mới trùng với một container khác đang IN_YARD
  SELECT count(*) INTO v_dup_in_yard_count
  FROM public.app_container_visits
  WHERE yard_id = v_cont.yard_id 
    AND container_no_current = v_clean_new_no 
    AND status = 'IN_YARD'
    AND id <> p_container_visit_id;

  IF v_dup_in_yard_count > 0 THEN
    RAISE EXCEPTION 'Cảnh báo trùng số container: Số container mới (%) hiện đang thuộc một lượt container khác đang ở trong bãi (IN_YARD). Không thể sửa trùng lặp.', v_clean_new_no;
  END IF;

  v_old_no := v_cont.container_no_current;

  -- Cập nhật số container hiện hành trên cùng UUID (giữ nguyên khóa chính, khóa ngoại, không sửa tiền)
  -- M004-R2-06: Bắt ngoại lệ unique_violation khi hai request sửa số đồng thời
  BEGIN
    UPDATE public.app_container_visits
    SET container_no_current = v_clean_new_no,
        updated_at = clock_timestamp()
    WHERE id = p_container_visit_id;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Cảnh báo trùng số container: Số container mới (%) hiện đang thuộc một lượt container khác đang ở trong bãi (IN_YARD). Không thể sửa trùng lặp.', v_clean_new_no;
  END;

  -- Thêm bản ghi lịch sử sửa số bất biến (append-only)
  INSERT INTO public.app_container_number_changes (
    container_visit_id, yard_id, old_number, new_number,
    reason, evidence_url, changed_by, notified_cckb
  ) VALUES (
    p_container_visit_id, v_cont.yard_id, v_old_no, v_clean_new_no,
    trim(p_reason), trim(p_evidence_url), v_actor_id, true
  ) RETURNING id INTO v_change_id;

  -- Ghi nhận Audit Event với dữ liệu trước và sau
  PERFORM public.sc_log_audit_event(
    'container.number.correct', 'app_container_visits', p_container_visit_id::text,
    v_cont.yard_id, 'AN_NINH', 
    jsonb_build_object('container_no_current', v_old_no), 
    jsonb_build_object('container_no_current', v_clean_new_no, 'change_id', v_change_id), 
    trim(p_reason)
  );

  RETURN v_change_id;
END;
$$;


-- 6.5 RPC: Cập nhật HÀNG/RỖNG (Bộ phận Điều phối)
-- M004-R1-12: Chỉ cho phép cập nhật khi status = 'IN_YARD'. Chặn EXITED (nhắc AP05) và chặn CANCELLED
CREATE OR REPLACE FUNCTION public.sc_update_container_cargo(
  p_container_visit_id uuid,
  p_cargo_status text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_cont record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF p_cargo_status NOT IN ('HANG', 'RONG') THEN
    RAISE EXCEPTION 'Trạng thái HÀNG/RỖNG không hợp lệ: %. Chỉ chấp nhận HANG hoặc RONG.', p_cargo_status;
  END IF;

  SELECT * INTO v_cont 
  FROM public.app_container_visits 
  WHERE id = p_container_visit_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy lượt container: %', p_container_visit_id;
  END IF;

  IF NOT public.sc_can('container.cargo.update', v_cont.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Chỉ bộ phận Điều phối (DIS_STAFF, DIS_LEAD) hoặc Quản trị mới có quyền cập nhật HÀNG/RỖNG tại bãi này.';
  END IF;

  -- M004-R1-12: Kiểm soát trạng thái nghiêm ngặt
  IF v_cont.status = 'EXITED' THEN
    RAISE EXCEPTION 'Container đã xuất bãi (EXITED). Sửa trạng thái HÀNG/RỖNG sau khi xuất bãi yêu cầu quy trình phê duyệt AP05 (container.cargo.post_exit.request/approve).';
  ELSIF v_cont.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Không thể cập nhật HÀNG/RỖNG cho container đã bị hủy (CANCELLED).';
  ELSIF v_cont.status <> 'IN_YARD' THEN
    RAISE EXCEPTION 'Chỉ được phép cập nhật HÀNG/RỖNG khi container đang trong bãi (IN_YARD). Trạng thái hiện tại: %', v_cont.status;
  END IF;

  UPDATE public.app_container_visits
  SET cargo_status = p_cargo_status,
      cargo_status_updated_at = clock_timestamp(),
      cargo_status_updated_by = v_actor_id,
      updated_at = clock_timestamp()
  WHERE id = p_container_visit_id;

  -- Ghi nhận Audit Event
  PERFORM public.sc_log_audit_event(
    'container.cargo.update', 'app_container_visits', p_container_visit_id::text,
    v_cont.yard_id, 'DIEU_PHOI', 
    jsonb_build_object('cargo_status', v_cont.cargo_status), 
    jsonb_build_object('cargo_status', p_cargo_status), 
    'Cập nhật trạng thái HÀNG/RỖNG container'
  );
END;
$$;


-- 6.6 RPC: An ninh xác nhận đã báo CCKB về sai lệch số container
CREATE OR REPLACE FUNCTION public.sc_ack_container_number_discrepancy(
  p_change_id bigint
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_change record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  SELECT * INTO v_change 
  FROM public.app_container_number_changes 
  WHERE id = p_change_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy bản ghi sửa số container: %', p_change_id;
  END IF;

  IF NOT public.sc_can('container.number.discrepancy.sec_ack', v_change.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Không có quyền xác nhận báo CCKB tại bãi này.';
  END IF;

  -- M004-R1-08: Kiểm tra chống ghi đè
  IF v_change.sec_ack_at IS NOT NULL THEN
    RAISE EXCEPTION 'Bản ghi này đã được An ninh xác nhận báo CCKB trước đó vào lúc %.', v_change.sec_ack_at;
  END IF;

  UPDATE public.app_container_number_changes
  SET sec_ack_at = clock_timestamp(),
      sec_ack_by = v_actor_id
  WHERE id = p_change_id;

  PERFORM public.sc_log_audit_event(
    'container.number.discrepancy.sec_ack', 'app_container_number_changes', p_change_id::text,
    v_change.yard_id, 'AN_NINH', NULL, 
    jsonb_build_object('sec_ack_by', v_actor_id, 'sec_ack_at', clock_timestamp()), 
    'An ninh xác nhận đã báo CCKB sai lệch số'
  );
END;
$$;


-- 6.7 RPC: CCKB đối chiếu sai số và đóng cảnh báo (Port Reconcile)
CREATE OR REPLACE FUNCTION public.sc_reconcile_container_number_discrepancy(
  p_change_id bigint,
  p_reconcile_notes text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_change record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF p_reconcile_notes IS NULL OR length(trim(p_reconcile_notes)) < 3 THEN
    RAISE EXCEPTION 'Ghi chú đối soát của CCKB là bắt buộc (tối thiểu 3 ký tự).';
  END IF;

  SELECT * INTO v_change 
  FROM public.app_container_number_changes 
  WHERE id = p_change_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy bản ghi sửa số container: %', p_change_id;
  END IF;

  IF NOT public.sc_can('container.number.discrepancy.port_reconcile', v_change.yard_id) THEN
    RAISE EXCEPTION 'Permission Denied: Chỉ bộ phận CCKB (PORT_STAFF, PORT_LEAD) hoặc Quản trị mới có quyền đối soát sai số container tại bãi này.';
  END IF;

  -- M004-R1-08: Kiểm tra chống ghi đè
  IF v_change.reconciled_at IS NOT NULL THEN
    RAISE EXCEPTION 'Bản ghi này đã được CCKB đối soát trước đó vào lúc %.', v_change.reconciled_at;
  END IF;

  UPDATE public.app_container_number_changes
  SET reconciled_at = clock_timestamp(),
      reconciled_by = v_actor_id,
      reconcile_notes = trim(p_reconcile_notes)
  WHERE id = p_change_id;

  PERFORM public.sc_log_audit_event(
    'container.number.discrepancy.port_reconcile', 'app_container_number_changes', p_change_id::text,
    v_change.yard_id, 'CCKB', NULL, 
    jsonb_build_object('reconciled_by', v_actor_id, 'reconcile_notes', p_reconcile_notes), 
    'CCKB đối soát sai lệch số container'
  );
END;
$$;


-- ------------------------------------------------------------------------------
-- 7. CẤP QUYỀN THỰC THI CHO CÁC HÀM RPC (LEAST PRIVILEGE)
-- ------------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.sc_manage_vehicle_type FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_manage_vehicle_type TO authenticated;

REVOKE ALL ON FUNCTION public.sc_create_vehicle_visit FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_create_vehicle_visit TO authenticated;

REVOKE ALL ON FUNCTION public.sc_update_vehicle_visit_basic FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_update_vehicle_visit_basic TO authenticated;

REVOKE ALL ON FUNCTION public.sc_create_container_visit FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_create_container_visit TO authenticated;

REVOKE ALL ON FUNCTION public.sc_correct_container_number FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_correct_container_number TO authenticated;

REVOKE ALL ON FUNCTION public.sc_update_container_cargo FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_update_container_cargo TO authenticated;

REVOKE ALL ON FUNCTION public.sc_ack_container_number_discrepancy FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_ack_container_number_discrepancy TO authenticated;

REVOKE ALL ON FUNCTION public.sc_reconcile_container_number_discrepancy FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.sc_reconcile_container_number_discrepancy TO authenticated;

COMMIT;
