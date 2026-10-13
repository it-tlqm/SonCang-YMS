SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000099', false);
SELECT public.sc_create_vehicle_and_container_visit_atomic(
  p_yard_id => '20000000-0000-0000-0000-000000000001'::uuid,
  p_vehicle_type => 'CONT_LANH',
  p_license_plate => '29C-CONCUR-01',
  p_driver_name => 'Lái Xe Đồng Thời',
  p_driver_phone => '0912345678',
  p_ticket_code => 'VE-CONCUR-01',
  p_has_container => true,
  p_container_no => 'MSKUCONCUR1',
  p_idempotency_key => 'KEY-RACE-MATCH-001'
);
