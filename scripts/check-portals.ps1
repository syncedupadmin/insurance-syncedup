# Clean URL Check Script  
# Tests clean portal URLs for HTTP 200 status

$paths = @(
    '/',
    '/login',
    '/dashboard',
    '/admin',
    '/super-admin',
    '/super-admin-portal',
    '/leaderboard'
)

$base = 'https://insurance.syncedupsolutions.com'
Write-Host "Testing clean portal URLs..." -ForegroundColor Green

$results = foreach ($p in $paths) {
    try {
        $r = Invoke-WebRequest -Uri ($base + $p) -Method Get -UseBasicParsing -TimeoutSec 20
        [PSCustomObject]@{ 
            Path = $p
            Status = $r.StatusCode
            Result = if ($r.StatusCode -eq 200) { "PASS" } else { "FAIL" }
        }
    } catch {
        [PSCustomObject]@{ 
            Path = $p
            Status = $_.Exception.Response.StatusCode.value__
            Result = "FAIL"
        }
    }
}

$results | Format-Table -Auto

# Check for failures
$failures = $results | Where-Object { $_.Result -eq "FAIL" }
if ($failures.Count -gt 0) {
    Write-Host "`nFAILURES DETECTED:" -ForegroundColor Red
    $failures | ForEach-Object {
        Write-Host "  $($_.Path) -> HTTP $($_.Status)" -ForegroundColor Red
    }
} else {
    Write-Host "`nAll clean URLs returned HTTP 200 ✓" -ForegroundColor Green
}