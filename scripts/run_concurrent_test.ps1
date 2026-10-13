$ErrorActionPreference = "Stop"

Write-Host "=== STARTING CONCURRENT RACE SAFETY TEST (GLC-06) ===" -ForegroundColor Cyan

# 1. Copy SQL files to container
docker cp scripts/race_setup.sql supabase_db_YMS-project:/tmp/race_setup.sql
docker cp scripts/race_a1.sql supabase_db_YMS-project:/tmp/race_a1.sql
docker cp scripts/race_a2.sql supabase_db_YMS-project:/tmp/race_a2.sql
docker cp scripts/race_b1.sql supabase_db_YMS-project:/tmp/race_b1.sql
docker cp scripts/race_b2.sql supabase_db_YMS-project:/tmp/race_b2.sql

# 2. Run setup
docker exec supabase_db_YMS-project psql -U postgres -d soncang_gate_test -f /tmp/race_setup.sql | Out-Null
Write-Host "-> Setup fixtures: READY" -ForegroundColor Green

# 3. SCENARIO A: 2 CONCURRENT CONNECTIONS WITH SAME KEY AND MATCHING PAYLOAD
Write-Host "`n--- SCENARIO A: 2 parallel connections with SAME key and MATCHING payload ---" -ForegroundColor Yellow
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

Write-Host "Result Session 1: $resA1" -ForegroundColor Gray
Write-Host "Result Session 2: $resA2" -ForegroundColor Gray

# Extract vehicle_visit_id from both JSON outputs
$m1 = [regex]::Match($resA1, '"vehicle_visit_id":\s*"([^"]+)"')
$m2 = [regex]::Match($resA2, '"vehicle_visit_id":\s*"([^"]+)"')

if ($m1.Success -and $m2.Success -and ($m1.Groups[1].Value -eq $m2.Groups[1].Value)) {
    Write-Host "-> PASS SCENARIO A: Both parallel sessions returned identical vehicle_visit_id: $($m1.Groups[1].Value). Idempotent replay safe under race condition!" -ForegroundColor Green
} else {
    Write-Host "-> FAIL SCENARIO A: Output did not match!" -ForegroundColor Red
    exit 1
}

# 4. SCENARIO B: 2 CONCURRENT CONNECTIONS WITH SAME KEY BUT MISMATCHING PAYLOAD
Write-Host "`n--- SCENARIO B: 2 parallel connections with SAME key but MISMATCHING payload ---" -ForegroundColor Yellow
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

Write-Host "Result Session 1 (Original): $resB1" -ForegroundColor Gray
Write-Host "Result Session 2 (Mismatch): $resB2" -ForegroundColor Gray

$hasCreated = ($resB1 -match "vehicle_visit_id" -or $resB2 -match "vehicle_visit_id")
$hasError = ($resB1 -match "ERROR" -or $resB2 -match "ERROR")

if ($hasCreated -and $hasError) {
    Write-Host "-> PASS SCENARIO B: One session succeeded, mismatched payload session was BLOCKED by exception handler! Full payload validation confirmed under concurrency!" -ForegroundColor Green
} else {
    Write-Host "-> FAIL SCENARIO B: Mismatch was not blocked!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== CONCURRENCY RACE SAFETY TEST (GLC-06): 100% PASS ===" -ForegroundColor Green
