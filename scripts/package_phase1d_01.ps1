$destZip = "d:\thanhnx\OpenCode\YMS-project\phase1d_01_pwa_bundle.zip"
if (Test-Path $destZip) { Remove-Item $destZip -Force }

$tempDir = "d:\thanhnx\OpenCode\YMS-project\temp_pwa_bundle"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

Copy-Item -Path "d:\thanhnx\OpenCode\YMS-project\src" -Destination $tempDir -Recurse
if (Test-Path "d:\thanhnx\OpenCode\YMS-project\public") { 
    Copy-Item -Path "d:\thanhnx\OpenCode\YMS-project\public" -Destination $tempDir -Recurse 
}
Copy-Item -Path "d:\thanhnx\OpenCode\YMS-project\package.json" -Destination $tempDir
Copy-Item -Path "d:\thanhnx\OpenCode\YMS-project\tsconfig.json" -Destination $tempDir
Copy-Item -Path "d:\thanhnx\OpenCode\YMS-project\next.config.ts" -Destination $tempDir
Copy-Item -Path "d:\thanhnx\OpenCode\YMS-project\eslint.config.mjs" -Destination $tempDir
if (Test-Path "d:\thanhnx\OpenCode\YMS-project\postcss.config.mjs") { 
    Copy-Item -Path "d:\thanhnx\OpenCode\YMS-project\postcss.config.mjs" -Destination $tempDir 
}
if (Test-Path "d:\thanhnx\OpenCode\YMS-project\tailwind.config.ts") { 
    Copy-Item -Path "d:\thanhnx\OpenCode\YMS-project\tailwind.config.ts" -Destination $tempDir 
}

Compress-Archive -Path "$tempDir\*" -DestinationPath $destZip -Force
Remove-Item $tempDir -Recurse -Force

$hash = (Get-FileHash -Path $destZip -Algorithm SHA256).Hash
Write-Output "ZIP_CREATED: $destZip"
Write-Output "SHA256: $hash"
