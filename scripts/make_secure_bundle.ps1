# ==============================================================================
# SON CANG YMS - SECURE BUNDLE PACKAGING SCRIPT
# Excludes: .temp, .env*, secrets, credentials, node_modules, .next, .git, *.log, *.zip
# ==============================================================================

param (
    [string]$DestinationZip = "ProjectContext/06_Kien_truc_va_kiem_thu/soncang_cloud_readiness_code_bundle.zip"
)

$ErrorActionPreference = "Stop"

Write-Host "=== STARTING SECURE BUNDLE PACKAGING ===" -ForegroundColor Cyan

# 1. Clean existing zip
if (Test-Path $DestinationZip) {
    Remove-Item $DestinationZip -Force
    Write-Host "Removed existing zip: $DestinationZip" -ForegroundColor Yellow
}

# 2. Temporary staging directory
$guid = [System.Guid]::NewGuid().ToString("N")
$stagingDir = Join-Path $env:TEMP ("soncang_staging_" + $guid)
if (Test-Path $stagingDir) {
    Remove-Item $stagingDir -Recurse -Force
}
New-Item -ItemType Directory -Path $stagingDir | Out-Null
Write-Host "Temporary staging directory: $stagingDir" -ForegroundColor Gray

try {
    # 3. Copy src
    Write-Host "Copying src/..."
    Copy-Item -Path "src" -Destination $stagingDir -Recurse -Force

    # 4. Copy public
    Write-Host "Copying public/..."
    Copy-Item -Path "public" -Destination $stagingDir -Recurse -Force

    # 5. Copy supabase (migrations & configs ONLY, strictly exclude .temp)
    Write-Host "Copying supabase (migrations and configs only, excluding .temp)..."
    $stagingSupabase = Join-Path $stagingDir "supabase"
    New-Item -ItemType Directory -Path $stagingSupabase | Out-Null
    Copy-Item -Path "supabase/migrations" -Destination $stagingSupabase -Recurse -Force
    if (Test-Path "supabase/config.toml") {
        Copy-Item -Path "supabase/config.toml" -Destination $stagingSupabase -Force
    }

    # 6. Copy scripts (Exclude *.log, *.zip, __pycache__)
    Write-Host "Copying scripts/..."
    $stagingScripts = Join-Path $stagingDir "scripts"
    New-Item -ItemType Directory -Path $stagingScripts | Out-Null
    Get-ChildItem -Path "scripts" -File | Where-Object { 
        $_.Extension -ne ".log" -and $_.Extension -ne ".zip" 
    } | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $stagingScripts -Force
    }

    # 7. Copy root configuration files
    $rootFiles = @(
        "package.json",
        "pnpm-lock.yaml",
        "tsconfig.json",
        "next.config.ts",
        "eslint.config.mjs",
        "AGENTS.md",
        ".env.example"
    )

    foreach ($file in $rootFiles) {
        if (Test-Path $file) {
            Write-Host "Copying $file..."
            Copy-Item -Path $file -Destination $stagingDir -Force
        }
    }

    # 8. SECURITY AUDIT SCAN ON STAGING
    Write-Host "Running Security Audit Scan on staging directory..." -ForegroundColor Cyan
    $allFiles = Get-ChildItem -Path $stagingDir -Recurse
    $violations = @()

    foreach ($f in $allFiles) {
        $path = $f.FullName
        $name = $f.Name
        if ($path -match "\\\.temp" -or 
            $name -match "start-secrets" -or 
            $path -match "node_modules" -or 
            $path -match "\\\.next" -or 
            $path -match "\\\.git" -or 
            ($name -like "*.log") -or 
            ($name -like ".env*" -and $name -ne ".env.example")) {
            $violations += $path
        }
    }

    if ($violations.Count -gt 0) {
        Write-Host "SECURITY ERROR: Prohibited files found in staging!" -ForegroundColor Red
        foreach ($v in $violations) {
            Write-Host " - $v" -ForegroundColor Red
        }
        throw "Security audit failed. Sensitive or temporary files detected!"
    }
    Write-Host "Security Audit Scan: PASSED (No sensitive files found)." -ForegroundColor Green

    # 9. ARCHIVE TO ZIP
    Write-Host "Creating archive: $DestinationZip..." -ForegroundColor Cyan
    $destFolder = Split-Path $DestinationZip -Parent
    if (-not (Test-Path $destFolder)) {
        New-Item -ItemType Directory -Path $destFolder -Force | Out-Null
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($stagingDir, $DestinationZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

    # 10. CALCULATE SHA-256
    $hash = Get-FileHash -Path $DestinationZip -Algorithm SHA256
    $zipItem = Get-Item $DestinationZip
    $lengthBytes = $zipItem.Length
    $sizeMB = [math]::Round($lengthBytes / 1MB, 2)
    $hashValue = $hash.Hash

    Write-Host "=== BUNDLE PACKAGING SUCCESSFUL ===" -ForegroundColor Green
    Write-Host ("File name: " + $zipItem.Name) -ForegroundColor White
    Write-Host ("File size: " + $sizeMB + " MB (" + $lengthBytes + " bytes)") -ForegroundColor White
    Write-Host ("SHA-256:   " + $hashValue) -ForegroundColor Yellow

    # 11. POST-ARCHIVE INTEGRITY VERIFICATION
    $zipArchive = [System.IO.Compression.ZipFile]::OpenRead($DestinationZip)
    $entryCount = $zipArchive.Entries.Count
    $badEntries = @()
    foreach ($entry in $zipArchive.Entries) {
        $entryName = $entry.FullName
        if ($entryName -match "\.temp" -or 
            $entryName -match "start-secrets" -or 
            ($entryName -match "\.env" -and $entryName -notmatch "\.env\.example")) {
            $badEntries += $entryName
        }
    }

    if ($badEntries.Count -gt 0) {
        $zipArchive.Dispose()
        Remove-Item $DestinationZip -Force
        throw "Post-archive verification failed: ZIP contains prohibited entries!"
    }
    $zipArchive.Dispose()
    Write-Host ("Post-archive scan (" + $entryCount + " entries): 100% CLEAN AND SAFE.") -ForegroundColor Green

    # Output details
    [PSCustomObject]@{
        ZipPath = $DestinationZip
        SHA256 = $hashValue
        SizeMB = $sizeMB
        Entries = $entryCount
    }
}
finally {
    if (Test-Path $stagingDir) {
        Remove-Item $stagingDir -Recurse -Force
    }
}
