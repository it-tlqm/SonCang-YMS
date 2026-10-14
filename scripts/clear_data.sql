-- ==============================================================================
-- DỌN DẸP TOÀN BỘ DỮ LIỆU TẠM / THỬ NGHIỆM ĐỂ CHUẨN BỊ VẬN HÀNH THỰC TẾ
-- Bảo toàn 100% Master Data: app_staff_users, app_tariffs, app_power_sockets,
-- app_vehicle_types, app_yard_zones, app_departments, app_roles, app_permissions,
-- app_role_permissions, app_customers, app_yards
-- ==============================================================================

BEGIN;

-- Vô hiệu hóa tạm thời các trigger bảo vệ bất biến để dọn dẹp dữ liệu test
ALTER TABLE public.app_payments DISABLE TRIGGER trg_payment_immutable;
ALTER TABLE public.app_audit_events DISABLE TRIGGER trg_sc_audit_immutable;

-- 1. Xóa toàn bộ dữ liệu kế toán, hóa đơn và sổ cái
DELETE FROM public.app_cash_settlement_items;
DELETE FROM public.app_cash_settlements;
DELETE FROM public.app_invoices;
DELETE FROM public.app_payments;
DELETE FROM public.app_charges;

-- 2. Xóa toàn bộ phiên cắm điện và yêu cầu cắm điện container
DELETE FROM public.app_reefer_power_sessions;
DELETE FROM public.app_reefer_requests;

-- 3. Xóa toàn bộ lượt container và lượt phương tiện
DELETE FROM public.app_container_number_changes;
DELETE FROM public.app_container_visits;
DELETE FROM public.app_vehicle_plate_changes;
DELETE FROM public.app_vehicle_visits;

-- 4. Xóa yêu cầu phê duyệt ngoại lệ thử nghiệm & audit logs test
DELETE FROM public.app_approval_requests;
DELETE FROM public.app_audit_events;

-- 5. Đặt lại toàn bộ 30 giắc cắm điện về trạng thái SẴN SÀNG (AVAILABLE)
UPDATE public.app_power_sockets SET status = 'AVAILABLE';

-- Kích hoạt lại toàn bộ các trigger bảo vệ bất biến
ALTER TABLE public.app_payments ENABLE TRIGGER trg_payment_immutable;
ALTER TABLE public.app_audit_events ENABLE TRIGGER trg_sc_audit_immutable;

-- Ghi nhận sự kiện kiểm toán khởi đầu vận hành chính thức
INSERT INTO public.app_audit_events (
  action_code,
  actor_user_id,
  department_code,
  target_type,
  reason
) VALUES (
  'SYSTEM_INIT_REAL_RUN',
  '20000000-0000-0000-0000-000000000001',
  'HE_THONG',
  'SYSTEM',
  'Dọn dẹp toàn bộ dữ liệu tạm và thử nghiệm để chuẩn bị vận hành thực tế bến bãi Sơn Cảng'
);

COMMIT;
