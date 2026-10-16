try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    
    $files = @(
        @{
            Doc = "d:\thanhnx\OpenCode\YMS-project\docs\Tai_Lieu_Mo_Ta_He_Thong_Quan_Ly_Ben_Bai_Son_Cang.docx"
            Pdf = "d:\thanhnx\OpenCode\YMS-project\docs\Tai_Lieu_Mo_Ta_He_Thong_Quan_Ly_Ben_Bai_Son_Cang.pdf"
        },
        @{
            Doc = "d:\thanhnx\OpenCode\YMS-project\docs\Tai_Lieu_Huong_Dan_Su_Dung_Son_Cang_Co_Placeholder.docx"
            Pdf = "d:\thanhnx\OpenCode\YMS-project\docs\Tai_Lieu_Huong_Dan_Su_Dung_Son_Cang_Co_Placeholder.pdf"
        }
    )

    foreach ($item in $files) {
        if (Test-Path $item.Doc) {
            Write-Host "Opening: $($item.Doc)"
            $doc = $word.Documents.Open($item.Doc)
            $doc.SaveAs([ref]$item.Pdf, [ref]17) # 17 = wdFormatPDF
            $doc.Close()
            Write-Host "Exported PDF: $($item.Pdf)"
        }
    }
    $word.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($word) | Out-Null
    Write-Host "All PDFs generated successfully!"
} catch {
    Write-Host "Error converting to PDF:" $_.Exception.Message
}
