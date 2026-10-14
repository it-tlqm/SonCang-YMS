SELECT 'app_vehicle_visits' as tbl, count(*) as total FROM public.app_vehicle_visits
UNION ALL SELECT 'app_container_visits', count(*) FROM public.app_container_visits
UNION ALL SELECT 'app_reefer_power_sessions', count(*) FROM public.app_reefer_power_sessions
UNION ALL SELECT 'app_reefer_requests', count(*) FROM public.app_reefer_requests
UNION ALL SELECT 'app_charges', count(*) FROM public.app_charges
UNION ALL SELECT 'app_payments', count(*) FROM public.app_payments
UNION ALL SELECT 'app_cash_settlements', count(*) FROM public.app_cash_settlements
UNION ALL SELECT 'app_cash_settlement_items', count(*) FROM public.app_cash_settlement_items
UNION ALL SELECT 'app_invoices', count(*) FROM public.app_invoices
UNION ALL SELECT 'app_vehicle_plate_changes', count(*) FROM public.app_vehicle_plate_changes
UNION ALL SELECT 'app_container_number_changes', count(*) FROM public.app_container_number_changes
UNION ALL SELECT 'app_approval_requests', count(*) FROM public.app_approval_requests
UNION ALL SELECT 'app_audit_events', count(*) FROM public.app_audit_events
UNION ALL SELECT 'app_staff_users', count(*) FROM public.app_staff_users
UNION ALL SELECT 'app_tariffs', count(*) FROM public.app_tariffs
UNION ALL SELECT 'app_power_sockets', count(*) FROM public.app_power_sockets
UNION ALL SELECT 'app_yard_zones', count(*) FROM public.app_yard_zones;
