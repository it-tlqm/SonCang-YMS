# Package clean code bundle for Son Cang YMS
$ErrorActionPreference = 'Stop'

$zipName = "soncang_overnight_code_bundle.zip"
if (Test-Path $zipName) { 
    Remove-Item -Force $zipName 
}

$baseDir = (Get-Location).Path
$excludePrefixes = @("node_modules\", ".next\", ".git\", ".supabase\")
$excludeExtensions = @(".zip")

$allFiles = Get-ChildItem -Path $baseDir -Recurse -File
$selectedFiles = @()

foreach ($f in $allFiles) {
    $rel = $f.FullName.Substring($baseDir.Length + 1)
    
    # Check dir prefix
    $skip = $false
    foreach ($p in $excludePrefixes) {
        if ($rel.StartsWith($p)) {
            $skip = $true
            break
        }
    }
    if ($skip) { continue }

    # Check env files
    if ($f.Name -like ".env*") {
        continue
    }

    # Check extensions
    if ($f.Extension -eq ".zip") {
        continue
    }

    $selectedFiles += $f
}

Write-Host "Total files to include in bundle: $($selectedFiles.Count)"

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipName, [System.IO.Compression.ZipArchiveMode]::Create)


foreach ($file in $selectedFiles) {
    $entryName = $file.FullName.Substring($baseDir.Length + 1).Replace("\", "/")
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $file.FullName, $entryName) | Out-Null
}

$zip.Dispose()

$hashObj = Get-FileHash -Path $zipName -Algorithm SHA256
$size = (Get-Item $zipName).Length

Write-Host "SUCCESS: Package created successfully!"
Write-Host "File: $zipName"
Write-Host "Size: $size bytes"
Write-Host "SHA256: $($hashObj.Hash)"
