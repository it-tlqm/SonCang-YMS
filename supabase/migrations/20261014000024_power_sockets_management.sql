-- ==============================================================================
-- MIGRATION 20261014000024: QUẢN TRỊ TRỤ ĐIỆN & GIẮC CẮM CONTAINER LẠNH (app_power_sockets)
-- Mục đích:
--   1. Xóa bỏ hoàn toàn hardcode 30 trụ điện tĩnh.
--   2. Tạo bảng public.app_power_sockets quản lý động danh mục trụ/giắc cắm 380V.
--   3. Hỗ trợ CRUD trụ điện (Thêm trụ mới, Sửa thông số 380V/32A, Bảo trì/Khóa trụ hỏng, Xóa trụ).
--   4. Theo dõi và kiểm soát trạng thái trụ thời gian thực (AVAILABLE, IN_USE, MAINTENANCE, FAULTY).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. BẢNG TRỤ / GIẮC CẮM ĐIỆN CONTAINER LẠNH (app_power_sockets)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.app_power_sockets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  socket_code text NOT NULL UNIQUE,
  socket_name text NOT NULL,
  zone_code text NOT NULL DEFAULT 'KHU_A_REEFER' REFERENCES public.app_yard_zones(code) ON DELETE RESTRICT,
  yard_id uuid REFERENCES public.app_yards(id) ON DELETE SET NULL,
  voltage text NOT NULL DEFAULT '380V',
  amperage text NOT NULL DEFAULT '32A',
  phase text NOT NULL DEFAULT '3_PHASE',
  status text NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'FAULTY')),
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tạo chỉ mục tìm kiếm nhanh
CREATE INDEX IF NOT EXISTS idx_power_sockets_zone ON public.app_power_sockets(zone_code);
CREATE INDEX IF NOT EXISTS idx_power_sockets_status ON public.app_power_sockets(status);

-- Seed 30 trụ điện 380V ban đầu (R01 đến R30) cho Khu A Reefer
INSERT INTO public.app_power_sockets (socket_code, socket_name, zone_code, yard_id, voltage, amperage, phase, status, notes)
SELECT 
  'R' || lpad(i::text, 2, '0') AS socket_code,
  'Trụ điện R' || lpad(i::text, 2, '0') AS socket_name,
  'KHU_A_REEFER' AS zone_code,
  (SELECT id FROM public.app_yards LIMIT 1) AS yard_id,
  '380V' AS voltage,
  '32A' AS amperage,
  '3_PHASE' AS phase,
  'AVAILABLE' AS status,
  'Trụ cấp điện container lạnh chuyên dụng 380V/32A chuẩn công nghiệp 3 pha' AS notes
FROM generate_series(1, 30) AS i
ON CONFLICT (socket_code) DO UPDATE SET
  socket_name = EXCLUDED.socket_name,
  voltage = EXCLUDED.voltage,
  amperage = EXCLUDED.amperage,
  phase = EXCLUDED.phase;

-- Đồng bộ trạng thái các trụ đang có phiên cắm điện đang chạy
UPDATE public.app_power_sockets ps
SET status = 'IN_USE'
FROM public.app_reefer_power_sessions s
WHERE s.power_status = 'PLUGGED'
  AND s.plug_socket_code = ps.socket_code;

-- Cấp quyền truy cập cho authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_power_sockets TO authenticated;
ALTER TABLE public.app_power_sockets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_power_sockets_select_policy ON public.app_power_sockets;
CREATE POLICY app_power_sockets_select_policy ON public.app_power_sockets
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS app_power_sockets_all_policy ON public.app_power_sockets;
CREATE POLICY app_power_sockets_all_policy ON public.app_power_sockets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 2. HÀM RPC ĐỒNG BỘ TRẠNG THÁI TRỤ KHI CẮM HOẶC RÚT ĐIỆN
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sc_set_socket_status(
  p_socket_code text,
  p_status text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid;
  v_old_status text;
BEGIN
  v_uid := auth.uid();

  SELECT status INTO v_old_status
  FROM public.app_power_sockets
  WHERE socket_code = p_socket_code;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy trụ điện ' || p_socket_code);
  END IF;

  UPDATE public.app_power_sockets
  SET 
    status = p_status,
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE socket_code = p_socket_code;

  -- Ghi nhận audit log nếu đổi trạng thái bảo trì/hỏng
  IF p_status IN ('MAINTENANCE', 'FAULTY') AND v_old_status <> p_status THEN
    PERFORM public.sc_log_audit_event(
      'UPDATE_POWER_SOCKET_STATUS',
      'Cập nhật trạng thái trụ ' || p_socket_code || ' sang ' || p_status,
      jsonb_build_object('socket_code', p_socket_code, 'old_status', v_old_status, 'new_status', p_status, 'notes', p_notes)
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'socket_code', p_socket_code, 'status', p_status);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sc_set_socket_status(text, text, text) TO authenticated;

COMMIT;
