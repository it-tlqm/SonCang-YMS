-- ==============================================================================
-- MIGRATION 20261016000030: QUY HOẠCH HẠ TẦNG CẤP ĐIỆN KHU A: 13 TỦ ĐIỆN & 50 GIẮC CẮM 380V
-- Mục đích:
--   1. Xóa bỏ hoàn toàn 30 trụ điện R01..R30 cũ theo yêu cầu hiện trường bến bãi Sơn Cảng.
--   2. Bổ sung các cột cabinet_code, cabinet_name, socket_index vào public.app_power_sockets nếu chưa có.
--   3. Nạp chuẩn 50 giắc cắm công nghiệp 3 pha 380V/32A phân bổ theo 13 Tủ điện:
--      T01 (3), T02 (4), T03 (4), T04 (3), T05 (8), T06 (3), T07 (3), T08 (2),
--      T09 (5), T10 (3), T11 (4), T12 (4), T13 (4). Tổng cộng = 50 giắc cắm.
-- ==============================================================================

BEGIN;

-- 1. Bổ sung các cột thông tin Tủ điện vào bảng app_power_sockets nếu chưa có
ALTER TABLE public.app_power_sockets 
  ADD COLUMN IF NOT EXISTS cabinet_code text,
  ADD COLUMN IF NOT EXISTS cabinet_name text,
  ADD COLUMN IF NOT EXISTS socket_index integer;

CREATE INDEX IF NOT EXISTS idx_power_sockets_cabinet ON public.app_power_sockets(cabinet_code);

-- 2. Xóa các bản ghi trụ điện R01..R30 cũ
DELETE FROM public.app_power_sockets 
WHERE socket_code LIKE 'R%';

-- 3. Tạo bảng quản lý Tủ điện (app_power_cabinets)
CREATE TABLE IF NOT EXISTS public.app_power_cabinets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cabinet_code text NOT NULL UNIQUE,
  cabinet_name text NOT NULL,
  total_sockets integer NOT NULL DEFAULT 4,
  description text,
  zone_code text NOT NULL DEFAULT 'KHU_A_REEFER' REFERENCES public.app_yard_zones(code) ON DELETE RESTRICT,
  yard_id uuid REFERENCES public.app_yards(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Phân quyền RLS cho app_power_cabinets
ALTER TABLE public.app_power_cabinets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS app_power_cabinets_select_policy ON public.app_power_cabinets;
CREATE POLICY app_power_cabinets_select_policy ON public.app_power_cabinets
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS app_power_cabinets_all_policy ON public.app_power_cabinets;
CREATE POLICY app_power_cabinets_all_policy ON public.app_power_cabinets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_power_cabinets TO authenticated, anon;

-- 4. Nạp danh mục 13 Tủ điện chuẩn bến bãi Sơn Cảng
INSERT INTO public.app_power_cabinets (cabinet_code, cabinet_name, total_sockets, description, zone_code, sort_order)
VALUES
  ('T01', 'Tủ 01', 3, 'Tủ điện T01 — 3 ổ cắm 380V (T01-01 -> T01-03)', 'KHU_A_REEFER', 1),
  ('T02', 'Tủ 02', 4, 'Tủ điện T02 — 4 ổ cắm 380V (T02-01 -> T02-04)', 'KHU_A_REEFER', 2),
  ('T03', 'Tủ 03', 4, 'Tủ điện T03 — 4 ổ cắm 380V (T03-01 -> T03-04)', 'KHU_A_REEFER', 3),
  ('T04', 'Tủ 04', 3, 'Tủ điện T04 — 3 ổ cắm 380V (T04-01 -> T04-03)', 'KHU_A_REEFER', 4),
  ('T05', 'Tủ 05', 8, 'Tủ điện T05 — 8 ổ cắm 380V công suất lớn trung tâm (T05-01 -> T05-08)', 'KHU_A_REEFER', 5),
  ('T06', 'Tủ 06', 3, 'Tủ điện T06 — 3 ổ cắm 380V (T06-01 -> T06-03)', 'KHU_A_REEFER', 6),
  ('T07', 'Tủ 07', 3, 'Tủ điện T07 — 3 ổ cắm 380V (T07-01 -> T07-03)', 'KHU_A_REEFER', 7),
  ('T08', 'Tủ 08', 2, 'Tủ điện T08 — 2 ổ cắm 380V (T08-01 -> T08-02)', 'KHU_A_REEFER', 8),
  ('T09', 'Tủ 09', 5, 'Tủ điện T09 — 5 ổ cắm 380V (T09-01 -> T09-05)', 'KHU_A_REEFER', 9),
  ('T10', 'Tủ 10', 3, 'Tủ điện T10 — 3 ổ cắm 380V (T10-01 -> T10-03)', 'KHU_A_REEFER', 10),
  ('T11', 'Tủ 11', 4, 'Tủ điện T11 — 4 ổ cắm 380V (T11-01 -> T11-04)', 'KHU_A_REEFER', 11),
  ('T12', 'Tủ 12', 4, 'Tủ điện T12 — 4 ổ cắm 380V (T12-01 -> T12-04)', 'KHU_A_REEFER', 12),
  ('T13', 'Tủ 13', 4, 'Tủ điện T13 — 4 ổ cắm 380V (T13-01 -> T13-04)', 'KHU_A_REEFER', 13)
ON CONFLICT (cabinet_code) DO UPDATE SET
  cabinet_name = EXCLUDED.cabinet_name,
  total_sockets = EXCLUDED.total_sockets,
  description = EXCLUDED.description;

-- 5. Nạp 50 ổ cắm vào public.app_power_sockets
INSERT INTO public.app_power_sockets (
  socket_code, socket_name, zone_code, voltage, amperage, phase, status, notes,
  cabinet_code, cabinet_name, socket_index
)
VALUES
  -- Tủ 01 (3 ổ)
  ('T01-01', 'Tủ 01 — Ổ 1', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 01 ổ 1 (380V/32A)', 'T01', 'Tủ 01', 1),
  ('T01-02', 'Tủ 01 — Ổ 2', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 01 ổ 2 (380V/32A)', 'T01', 'Tủ 01', 2),
  ('T01-03', 'Tủ 01 — Ổ 3', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 01 ổ 3 (380V/32A)', 'T01', 'Tủ 01', 3),

  -- Tủ 02 (4 ổ)
  ('T02-01', 'Tủ 02 — Ổ 1', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 02 ổ 1 (380V/32A)', 'T02', 'Tủ 02', 1),
  ('T02-02', 'Tủ 02 — Ổ 2', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 02 ổ 2 (380V/32A)', 'T02', 'Tủ 02', 2),
  ('T02-03', 'Tủ 02 — Ổ 3', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 02 ổ 3 (380V/32A)', 'T02', 'Tủ 02', 3),
  ('T02-04', 'Tủ 02 — Ổ 4', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 02 ổ 4 (380V/32A)', 'T02', 'Tủ 02', 4),

  -- Tủ 03 (4 ổ)
  ('T03-01', 'Tủ 03 — Ổ 1', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 03 ổ 1 (380V/32A)', 'T03', 'Tủ 03', 1),
  ('T03-02', 'Tủ 03 — Ổ 2', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 03 ổ 2 (380V/32A)', 'T03', 'Tủ 03', 2),
  ('T03-03', 'Tủ 03 — Ổ 3', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 03 ổ 3 (380V/32A)', 'T03', 'Tủ 03', 3),
  ('T03-04', 'Tủ 03 — Ổ 4', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 03 ổ 4 (380V/32A)', 'T03', 'Tủ 03', 4),

  -- Tủ 04 (3 ổ)
  ('T04-01', 'Tủ 04 — Ổ 1', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 04 ổ 1 (380V/32A)', 'T04', 'Tủ 04', 1),
  ('T04-02', 'Tủ 04 — Ổ 2', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 04 ổ 2 (380V/32A)', 'T04', 'Tủ 04', 2),
  ('T04-03', 'Tủ 04 — Ổ 3', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 04 ổ 3 (380V/32A)', 'T04', 'Tủ 04', 3),

  -- Tủ 05 (8 ổ - Công suất lớn)
  ('T05-01', 'Tủ 05 — Ổ 1', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 05 ổ 1 (380V/32A)', 'T05', 'Tủ 05', 1),
  ('T05-02', 'Tủ 05 — Ổ 2', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 05 ổ 2 (380V/32A)', 'T05', 'Tủ 05', 2),
  ('T05-03', 'Tủ 05 — Ổ 3', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 05 ổ 3 (380V/32A)', 'T05', 'Tủ 05', 3),
  ('T05-04', 'Tủ 05 — Ổ 4', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 05 ổ 4 (380V/32A)', 'T05', 'Tủ 05', 4),
  ('T05-05', 'Tủ 05 — Ổ 5', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 05 ổ 5 (380V/32A)', 'T05', 'Tủ 05', 5),
  ('T05-06', 'Tủ 05 — Ổ 6', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 05 ổ 6 (380V/32A)', 'T05', 'Tủ 05', 6),
  ('T05-07', 'Tủ 05 — Ổ 7', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 05 ổ 7 (380V/32A)', 'T05', 'Tủ 05', 7),
  ('T05-08', 'Tủ 05 — Ổ 8', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 05 ổ 8 (380V/32A)', 'T05', 'Tủ 05', 8),

  -- Tủ 06 (3 ổ)
  ('T06-01', 'Tủ 06 — Ổ 1', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 06 ổ 1 (380V/32A)', 'T06', 'Tủ 06', 1),
  ('T06-02', 'Tủ 06 — Ổ 2', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 06 ổ 2 (380V/32A)', 'T06', 'Tủ 06', 2),
  ('T06-03', 'Tủ 06 — Ổ 3', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 06 ổ 3 (380V/32A)', 'T06', 'Tủ 06', 3),

  -- Tủ 07 (3 ổ)
  ('T07-01', 'Tủ 07 — Ổ 1', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 07 ổ 1 (380V/32A)', 'T07', 'Tủ 07', 1),
  ('T07-02', 'Tủ 07 — Ổ 2', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 07 ổ 2 (380V/32A)', 'T07', 'Tủ 07', 2),
  ('T07-03', 'Tủ 07 — Ổ 3', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 07 ổ 3 (380V/32A)', 'T07', 'Tủ 07', 3),

  -- Tủ 08 (2 ổ)
  ('T08-01', 'Tủ 08 — Ổ 1', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 08 ổ 1 (380V/32A)', 'T08', 'Tủ 08', 1),
  ('T08-02', 'Tủ 08 — Ổ 2', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 08 ổ 2 (380V/32A)', 'T08', 'Tủ 08', 2),

  -- Tủ 09 (5 ổ)
  ('T09-01', 'Tủ 09 — Ổ 1', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 09 ổ 1 (380V/32A)', 'T09', 'Tủ 09', 1),
  ('T09-02', 'Tủ 09 — Ổ 2', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 09 ổ 2 (380V/32A)', 'T09', 'Tủ 09', 2),
  ('T09-03', 'Tủ 09 — Ổ 3', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 09 ổ 3 (380V/32A)', 'T09', 'Tủ 09', 3),
  ('T09-04', 'Tủ 09 — Ổ 4', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 09 ổ 4 (380V/32A)', 'T09', 'Tủ 09', 4),
  ('T09-05', 'Tủ 09 — Ổ 5', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 09 ổ 5 (380V/32A)', 'T09', 'Tủ 09', 5),

  -- Tủ 10 (3 ổ)
  ('T10-01', 'Tủ 10 — Ổ 1', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 10 ổ 1 (380V/32A)', 'T10', 'Tủ 10', 1),
  ('T10-02', 'Tủ 10 — Ổ 2', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 10 ổ 2 (380V/32A)', 'T10', 'Tủ 10', 2),
  ('T10-03', 'Tủ 10 — Ổ 3', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 10 ổ 3 (380V/32A)', 'T10', 'Tủ 10', 3),

  -- Tủ 11 (4 ổ)
  ('T11-01', 'Tủ 11 — Ổ 1', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 11 ổ 1 (380V/32A)', 'T11', 'Tủ 11', 1),
  ('T11-02', 'Tủ 11 — Ổ 2', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 11 ổ 2 (380V/32A)', 'T11', 'Tủ 11', 2),
  ('T11-03', 'Tủ 11 — Ổ 3', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 11 ổ 3 (380V/32A)', 'T11', 'Tủ 11', 3),
  ('T11-04', 'Tủ 11 — Ổ 4', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 11 ổ 4 (380V/32A)', 'T11', 'Tủ 11', 4),

  -- Tủ 12 (4 ổ)
  ('T12-01', 'Tủ 12 — Ổ 1', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 12 ổ 1 (380V/32A)', 'T12', 'Tủ 12', 1),
  ('T12-02', 'Tủ 12 — Ổ 2', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 12 ổ 2 (380V/32A)', 'T12', 'Tủ 12', 2),
  ('T12-03', 'Tủ 12 — Ổ 3', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 12 ổ 3 (380V/32A)', 'T12', 'Tủ 12', 3),
  ('T12-04', 'Tủ 12 — Ổ 4', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 12 ổ 4 (380V/32A)', 'T12', 'Tủ 12', 4),

  -- Tủ 13 (4 ổ)
  ('T13-01', 'Tủ 13 — Ổ 1', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 13 ổ 1 (380V/32A)', 'T13', 'Tủ 13', 1),
  ('T13-02', 'Tủ 13 — Ổ 2', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 13 ổ 2 (380V/32A)', 'T13', 'Tủ 13', 2),
  ('T13-03', 'Tủ 13 — Ổ 3', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 13 ổ 3 (380V/32A)', 'T13', 'Tủ 13', 3),
  ('T13-04', 'Tủ 13 — Ổ 4', 'KHU_A_REEFER', '380V', '32A', '3_PHASE', 'AVAILABLE', 'Tủ 13 ổ 4 (380V/32A)', 'T13', 'Tủ 13', 4)
ON CONFLICT (socket_code) DO UPDATE SET
  socket_name = EXCLUDED.socket_name,
  voltage = EXCLUDED.voltage,
  amperage = EXCLUDED.amperage,
  phase = EXCLUDED.phase,
  cabinet_code = EXCLUDED.cabinet_code,
  cabinet_name = EXCLUDED.cabinet_name,
  socket_index = EXCLUDED.socket_index;

-- 6. Cập nhật sức chứa Khu A thành 50 chỗ
UPDATE public.app_yard_zones
SET capacity = 50,
    description = 'Bãi cắm điện chuyên dụng, trang bị 13 Tủ điện với 50 ổ cắm/giắc 3 pha công nghiệp 380V (T01 - T13)'
WHERE code = 'KHU_A_REEFER';

COMMIT;
