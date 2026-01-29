# Flash Performance Test Script
# Measures time from upload to first response

$testFile = "c:\Users\diego\NotiAr\test-files\24.pdf"
$apiUrl = "http://localhost:3000/api/ingest"

Write-Host "=== FLASH PERFORMANCE TEST ===" -ForegroundColor Cyan
Write-Host "File: $testFile" -ForegroundColor Yellow
Write-Host "Target: less than 2 seconds to first response`n" -ForegroundColor Yellow

# Create multipart form data
$form = @{
    file = Get-Item -Path $testFile
    folderId = "test-flash-folder-001"
}

Write-Host "Starting upload..." -ForegroundColor Green
$startTime = Get-Date

try {
    $response = Invoke-WebRequest -Uri $apiUrl `
        -Method POST `
        -Form $form `
        -TimeoutSec 300

    $endTime = Get-Date
    $elapsed = ($endTime - $startTime).TotalSeconds

    Write-Host "`nResponse received in $([math]::Round($elapsed, 2)) seconds" -ForegroundColor Green
    Write-Host "`nStatus: $($response.StatusCode)" -ForegroundColor Cyan
    Write-Host "`nBody:" -ForegroundColor Cyan
    $response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10

    if ($elapsed -lt 2) {
        Write-Host "`nOBJETIVO CUMPLIDO: Menos de 2 segundos!" -ForegroundColor Green
    } else {
        Write-Host "`nOBJETIVO NO CUMPLIDO: Mas de 2 segundos" -ForegroundColor Red
    }

} catch {
    $endTime = Get-Date
    $elapsed = ($endTime - $startTime).TotalSeconds
    Write-Host "`nError after $([math]::Round($elapsed, 2)) seconds" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}
