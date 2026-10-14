-- ==============================================================================
-- MIGRATION 20261014000023: PHÂN KHU BÃI THẬT, KIỂM SOÁT GIẮC CẮM ĐIỆN & CẬP NHẬT BIỂU PHÍ
-- Mục đích:
--   1. Tạo bảng app_yard_zones lưu trữ Phân khu bãi (CRUD thực tế trên Database thay vì localStorage).
--   2. Bổ sung trường plug_socket_code quản lý Giắc cắm điện 380V của Container lạnh.
--   3. Tạo bảng app_vehicle_plate_changes lưu lịch sử sửa biển số xe bất biến.
--   4. Cung cấp RPC sc_update_tariff (SECURITY DEFINER) cập nhật biểu phí an toàn kèm Audit Log.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. BẢNG PHÂN KHU BÃI SƠN CẢNG (app_yard_zones)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_yard_zones (
  code text PRIMARY KEY,
  yard_id uuid REFERENCES public.app_yards(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  capacity integer NOT NULL DEFAULT 50,
  has_power_outlets boolean NOT NULL DEFAULT false,
  power_outlets_count integer NOT NULL DEFAULT 0,
  color_badge text NOT NULL DEFAULT 'bg-slate-100 text-slate-800 border-slate-300',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Nạp 4 phân khu chuẩn vận hành thực tế Sơn Cảng
INSERT INTO public.app_yard_zones (code, yard_id, name, description, capacity, has_power_outlets, power_outlets_count, color_badge) VALUES
  ('KHU_A_REEFER', (SELECT id FROM public.app_yards LIMIT 1), 'Khu A — Bãi Container Lạnh (Reefer Yard)', 'Khu vực chuyên dụng cho container lạnh với 30 trụ điện 380V 3 pha công suất cao.', 30, true, 30, 'bg-amber-100 text-amber-900 border-amber-300'),
  ('KHU_B_CONTAINER', (SELECT id FROM public.app_yards LIMIT 1), 'Khu B — Bãi Container Khô & Bách Hóa', 'Khu vực lưu bãi container khô, cont bách hóa tổng hợp chờ làm thủ tục hải quan xuất nhập.', 40, false, 0, 'bg-blue-100 text-blue-900 border-blue-300'),
  ('KHU_C_CARGO', (SELECT id FROM public.app_yards LIMIT 1), 'Khu C — Bãi Xe Bo & Sang Tải Hàng Hóa', 'Khu vực chuyên cho xe bo, xe tải sang tải hàng hóa nông sản, bách hóa nội địa.', 50, false, 0, 'bg-emerald-100 text-emerald-900 border-emerald-300'),
  ('KHU_D_EMPTY', (SELECT id FROM public.app_yards LIMIT 1), 'Khu D — Bãi Vỏ Container Rỗng & Chờ Xếp Hàng', 'Khu vực tập kết vỏ container rỗng sau khi rút hàng, chờ cấp vỏ hoặc xuất cảnh.', 30, false, 0, 'bg-purple-100 text-purple-900 border-purple-300')
ON CONFLICT (code) DO UPDATE SET
  yard_id = COALESCE(public.app_yard_zones.yard_id, EXCLUDED.yard_id),
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  capacity = EXCLUDED.capacity,
  has_power_outlets = EXCLUDED.has_power_outlets,
  power_outlets_count = EXCLUDED.power_outlets_count,
  color_badge = EXCLUDED.color_badge;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_yard_zones TO authenticated;
ALTER TABLE public.app_yard_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_yard_zones_select_policy ON public.app_yard_zones;
CREATE POLICY app_yard_zones_select_policy ON public.app_yard_zones
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS app_yard_zones_modify_policy ON public.app_yard_zones;
CREATE POLICY app_yard_zones_modify_policy ON public.app_yard_zones
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 2. QUẢN LÝ GIẮC CẮM ĐIỆN 380V CỦA CONTAINER (plug_socket_code)
-- ------------------------------------------------------------------------------
-- Bổ sung cột plug_socket_code vào lượt container, phiên cắm điện và yêu cầu cắm điện
ALTER TABLE public.app_container_visits 
  ADD COLUMN IF NOT EXISTS plug_socket_code text DEFAULT NULL;

ALTER TABLE public.app_reefer_power_sessions 
  ADD COLUMN IF NOT EXISTS plug_socket_code text DEFAULT NULL;

ALTER TABLE public.app_reefer_requests 
  ADD COLUMN IF NOT EXISTS plug_socket_code text DEFAULT NULL;


-- ------------------------------------------------------------------------------
-- 3. LỊCH SỬ SỬA BIỂN SỐ XE BẤT BIẾN (app_vehicle_plate_changes)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_vehicle_plate_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_visit_id uuid NOT NULL REFERENCES public.app_vehicle_visits(id) ON DELETE CASCADE,
  yard_id uuid REFERENCES public.app_yards(id) ON DELETE SET NULL,
  old_license_plate text NOT NULL,
  new_license_plate text NOT NULL,
  reason text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_by_name text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.app_vehicle_plate_changes TO authenticated;
ALTER TABLE public.app_vehicle_plate_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_vehicle_plate_changes_select_policy ON public.app_vehicle_plate_changes;
CREATE POLICY app_vehicle_plate_changes_select_policy ON public.app_vehicle_plate_changes 
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS app_vehicle_plate_changes_insert_policy ON public.app_vehicle_plate_changes;
CREATE POLICY app_vehicle_plate_changes_insert_policy ON public.app_vehicle_plate_changes 
  FOR INSERT TO authenticated WITH CHECK (true);


-- ------------------------------------------------------------------------------
-- 4. HÀM RPC CẬP NHẬT BIỂU PHÍ AN TOÀN KÈM AUDIT LOG (sc_update_tariff)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sc_update_tariff(
  p_code text,
  p_amount numeric(12, 2),
  p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_actor_id uuid;
  v_old record;
  v_new record;
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Chưa đăng nhập. Yêu cầu xác thực người dùng.';
  END IF;

  IF NOT (
    public.sc_can('admin.billing_settings.manage', NULL) OR
    public.sc_can('admin.roles.manage', NULL)
  ) THEN
    RAISE EXCEPTION 'Permission Denied: Bạn không có quyền quản lý biểu phí (admin.billing_settings.manage).';
  END IF;

  IF p_amount < 0 THEN
    RAISE EXCEPTION 'Đơn giá không được âm.';
  END IF;

  SELECT * INTO v_old FROM public.app_tariffs WHERE code = p_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy biểu phí có mã: %', p_code;
  END IF;

  UPDATE public.app_tariffs
  SET amount = p_amount,
      updated_at = now()
  WHERE code = p_code
  RETURNING * INTO v_new;

  PERFORM public.sc_log_audit_event(
    'tariff.updated', 'app_tariffs', v_new.id::text,
    NULL, 'QUAN_TRI', to_jsonb(v_old), to_jsonb(v_new),
    'Cập nhật đơn giá biểu phí ' || p_code || ': ' || v_old.amount || ' -> ' || p_amount || ' đ. Lý do: ' || COALESCE(p_reason, 'Điều chỉnh biểu phí')
  );

  RETURN jsonb_build_object(
    'success', true,
    'tariff', to_jsonb(v_new)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sc_update_tariff TO authenticated;

COMMIT;
