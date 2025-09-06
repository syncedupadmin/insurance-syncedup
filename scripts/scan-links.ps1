# Regression script to catch .html links
# Scans all HTML/JS files for .html or /public/ references

Write-Host "Scanning for .html links and /public/ references..." -ForegroundColor Green

$patterns = @(
    '/public/',
    '/[^"''`]+\.html(?![#?])'
)

$hits = @()
foreach ($pattern in $patterns) {
    $results = Select-String -Path ".\public\**\*.html", ".\public\**\*.js" -Pattern $pattern -AllMatches
    $hits += $results
}

if ($hits.Count -gt 0) {
    Write-Host "`nFound problematic links:" -ForegroundColor Red
    $hits | ForEach-Object {
        $relativePath = $_.Filename -replace [regex]::Escape($PWD.Path + "\"), ""
        Write-Host "  $relativePath`:$($_.LineNumber) - $($_.Line.Trim())" -ForegroundColor Yellow
    }
    Write-Host "`nTotal issues found: $($hits.Count)" -ForegroundColor Red
} else {
    Write-Host "`nOK: No .html links or /public/ references found" -ForegroundColor Green
}