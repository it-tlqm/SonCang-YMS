$zipPath = "ProjectContext/06_Kien_truc_va_kiem_thu/soncang_final_local_gate_code_bundle.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

$items = @(
    "src",
    "public",
    "scripts",
    "supabase",
    "package.json",
    "pnpm-lock.yaml",
    "tsconfig.json",
    "next.config.ts",
    "eslint.config.mjs",
    "AGENTS.md"
)

Write-Host "Compressing codebase into $zipPath..."
Compress-Archive -Path $items -DestinationPath $zipPath -Force

$item = Get-Item $zipPath
Write-Host "Bundle created successfully: $($item.Name) ($([math]::Round($item.Length / 1MB, 2)) MB)"
