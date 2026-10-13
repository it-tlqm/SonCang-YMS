# ==============================================================================
# SƠN CẢNG YMS - KIỂM THỬ ĐỒNG THỜI (CONCURRENT RACE SAFETY TEST)
# File: scripts/test_concurrent_race.ps1
# Mục đích: Mở 2 kết nối PostgreSQL thực tế đồng thời để kiểm tra GLC-06 race condition
# ==============================================================================

Write-Host "=== BẮT ĐẦU KIỂM THỬ CONCURRENT RACE CONDITIONS (GLC-06) ===" -ForegroundColor Cyan

$dbName = "soncang_gate_test"
$container = "supabase_db_YMS-project"

# ------------------------------------------------------------------------------
# SETUP: Tạo sẵn bãi và user kiểm thử
# ------------------------------------------------------------------------------
$setupSql = @"
DO `$setup`$
DECLARE
  v_yard_1 uuid := '20000000-0000-0000-0000-000000000001'::uuid;
  v_user_sec uuid := 'a0000000-0000-0000-0000-000000000099'::uuid;
BEGIN
  INSERT INTO public.app_yards (id, name, is_active)
  VALUES (v_yard_1, 'Bãi 1 - Cảng cạn Sơn Cảng', true)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO auth.users (id, email)
  VALUES (v_user_sec, 'sec_concurrent_gate@soncang.local')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.app_user_role_assignments (user_id, role_code, yard_id, department_code, is_active)
  VALUES (v_user_sec, 'SEC_STAFF', v_yard_1, 'AN_NINH', true)
  ON CONFLICT DO NOTHING;
END `$setup`$;
"@

$setupFile = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($setupFile, $setupSql, [System.Text.Encoding]::UTF8)
docker cp $setupFile "${container}:/tmp/setup_race.sql" | Out-Null
Remove-Item $setupFile

docker exec $container psql -U postgres -d $dbName -f /tmp/setup_race.sql | Out-Null

Write-Host "Setup test fixtures: ĐÃ SẴN SÀNG." -ForegroundColor Green

# ------------------------------------------------------------------------------
# CASE A: 2 KẾT NỐI ĐỒNG THỜI VỚI CÙNG IDEMPOTENCY KEY VÀ CÙNG PAYLOAD (MATCHING)
# ------------------------------------------------------------------------------
Write-Host "`n--- CASE A: 2 kết nối đồng thời với CÙNG idempotency key và CÙNG payload ---" -ForegroundColor Yellow

$sqlCaseA1 = @"
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000099', true);
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
"@

$sqlCaseA2 = @"
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000099', true);
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
"@

$f1 = [System.IO.Path]::GetTempFileName()
$f2 = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($f1, $sqlCaseA1, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($f2, $sqlCaseA2, [System.Text.Encoding]::UTF8)

docker cp $f1 "${container}:/tmp/race_a1.sql" | Out-Null
docker cp $f2 "${container}:/tmp/race_a2.sql" | Out-Null
Remove-Item $f1, $f2

$job1 = Start-Job -ScriptBlock {
    docker exec supabase_db_YMS-project psql -t -A -U postgres -d soncang_gate_test -f /tmp/race_a1.sql
}
$job2 = Start-Job -ScriptBlock {
    docker exec supabase_db_YMS-project psql -t -A -U postgres -d soncang_gate_test -f /tmp/race_a2.sql
}

Wait-Job $job1, $job2 | Out-Null
$resA1 = (Receive-Job $job1) -join "`n"
$resA2 = (Receive-Job $job2) -join "`n"
Remove-Job $job1, $job2

Write-Host "Kết quả Session 1: $resA1" -ForegroundColor Gray
Write-Host "Kết quả Session 2: $resA2" -ForegroundColor Gray

# Kiểm tra cả 2 session đều trả về cùng vehicle_visit_id
$json1 = $resA1 | ConvertFrom-Json
$json2 = $resA2 | ConvertFrom-Json

if ($json1.vehicle_visit_id -and ($json1.vehicle_visit_id -eq $json2.vehicle_visit_id)) {
    Write-Host "-> PASS CASE A: Cả 2 kết nối đồng thời trả về CÙNG vehicle_visit_id ($($json1.vehicle_visit_id)). Không crash, không duplicate!" -ForegroundColor Green
} else {
    Write-Host "-> FAIL CASE A: vehicle_visit_id không khớp hoặc bị lỗi!" -ForegroundColor Red
    exit 1
}

# ------------------------------------------------------------------------------
# CASE B: 2 KẾT NỐI ĐỒNG THỜI VỚI CÙNG IDEMPOTENCY KEY NHƯNG KHÁC PAYLOAD (MISMATCH)
# ------------------------------------------------------------------------------
Write-Host "`n--- CASE B: 2 kết nối với CÙNG idempotency key nhưng KHÁC payload ---" -ForegroundColor Yellow

$sqlCaseB1 = @"
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000099', true);
SELECT public.sc_create_vehicle_and_container_visit_atomic(
  p_yard_id => '20000000-0000-0000-0000-000000000001'::uuid,
  p_vehicle_type => 'CONT_LANH',
  p_license_plate => '29C-ORIGINAL-01',
  p_driver_name => 'Lái Xe Hợp Lệ',
  p_ticket_code => 'VE-ORIGINAL',
  p_has_container => true,
  p_container_no => 'MSKUORIG001',
  p_idempotency_key => 'KEY-RACE-MISMATCH-999'
);
"@

$sqlCaseB2 = @"
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000099', true);
SELECT public.sc_create_vehicle_and_container_visit_atomic(
  p_yard_id => '20000000-0000-0000-0000-000000000001'::uuid,
  p_vehicle_type => 'CONT_LANH',
  p_license_plate => '29C-MISMATCH-99', -- BIỂN SỐ KHÁC
  p_driver_name => 'Lái Xe Khác Payload',
  p_ticket_code => 'VE-MISMATCH',
  p_has_container => true,
  p_container_no => 'MSKUORIG001',
  p_idempotency_key => 'KEY-RACE-MISMATCH-999'
);
"@

$f3 = [System.IO.Path]::GetTempFileName()
$f4 = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($f3, $sqlCaseB1, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($f4, $sqlCaseB2, [System.Text.Encoding]::UTF8)

docker cp $f3 "${container}:/tmp/race_b1.sql" | Out-Null
docker cp $f4 "${container}:/tmp/race_b2.sql" | Out-Null
Remove-Item $f3, $f4

$job3 = Start-Job -ScriptBlock {
    docker exec supabase_db_YMS-project psql -t -A -U postgres -d soncang_gate_test -f /tmp/race_b1.sql 2>&1
}
$job4 = Start-Job -ScriptBlock {
    docker exec supabase_db_YMS-project psql -t -A -U postgres -d soncang_gate_test -f /tmp/race_b2.sql 2>&1
}

Wait-Job $job3, $job4 | Out-Null
$resB1 = (Receive-Job $job3) -join "`n"
$resB2 = (Receive-Job $job4) -join "`n"
Remove-Job $job3, $job4

Write-Host "Kết quả Session 1 (Original): $resB1" -ForegroundColor Gray
Write-Host "Kết quả Session 2 (Mismatch): $resB2" -ForegroundColor Gray

# Kiểm tra một session thành công và một session bị chặn với lỗi payload không khớp
$hasSuccess = ($resB1 -match "vehicle_visit_id" -or $resB2 -match "vehicle_visit_id")
$hasMismatchBlocked = ($resB1 -match "không khớp với yêu cầu trước đó" -or $resB2 -match "không khớp với yêu cầu trước đó" -or $resB1 -match "ERROR" -or $resB2 -match "ERROR")

if ($hasSuccess -and $hasMismatchBlocked) {
    Write-Host "-> PASS CASE B: Một kết nối thành công, kết nối trùng key nhưng sai payload bị CHẶN HOÀN TOÀN!" -ForegroundColor Green
} else {
    Write-Host "-> FAIL CASE B: Không phát hiện chặn mismatch payload!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== KIỂM THỬ ĐỒNG THỜI (CONCURRENT RACE SAFETY) ĐẠT 100% ===" -ForegroundColor Green
