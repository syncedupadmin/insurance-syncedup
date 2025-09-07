# Fix Professional Theme System - Replace classic-mode.js with theme-switcher.js
# This script safely updates all portal HTML files

$rootDir = "C:\Users\nicho\OneDrive\Desktop\Insurance.SyncedUp\public"

# Files that need theme-switcher.js
$filesToUpdate = @(
    "admin/agent-performance.html",
    "admin/agents.html", 
    "admin/commissions.html",
    "admin/leads.html",
    "admin/licensing.html",
    "admin/reports.html",
    "admin/settings.html",
    "admin/users.html",
    "admin/vendors.html",
    "agent/commissions.html",
    "agent/customers.html",
    "agent/quotes.html", 
    "agent/sales.html",
    "agent/settings.html",
    "customer-service/index.html",
    "customer-service/member-profile.html",
    "customer-service/member-search.html",
    "customer-service/settings.html",
    "leaderboard/teams.html",
    "manager/leads.html",
    "manager/performance.html",
    "manager/reports.html",
    "manager/settings.html",
    "manager/team-management.html",
    "manager/vendors.html"
)

Write-Host "Starting Professional Theme System Fix..." -ForegroundColor Green
Write-Host "Found $($filesToUpdate.Count) files to update" -ForegroundColor Yellow

$successCount = 0
$errorCount = 0

foreach ($file in $filesToUpdate) {
    $fullPath = Join-Path $rootDir $file
    
    if (Test-Path $fullPath) {
        try {
            Write-Host "Processing: $file" -ForegroundColor Cyan
            
            # Read file content
            $content = Get-Content $fullPath -Raw
            
            # Backup original
            $backupPath = $fullPath + ".backup"
            Copy-Item $fullPath $backupPath
            
            # Make replacements
            $updated = $content
            
            # 1. Add professional.css if not already present
            if ($updated -notmatch "/css/themes/professional\.css") {
                # Find the existing global CSS link and add professional.css after it
                if ($file -like "admin/*") {
                    $updated = $updated -replace '(\s+<link rel="stylesheet" href="/admin/admin-global\.css">)', '$1' + "`n" + '    <link rel="stylesheet" href="/css/themes/professional.css">'
                }
                elseif ($file -like "manager/*") {
                    $updated = $updated -replace '(\s+<link rel="stylesheet" href="/manager/manager-global\.css">)', '$1' + "`n" + '    <link rel="stylesheet" href="/css/themes/professional.css">'
                }
                elseif ($file -like "agent/*") {
                    $updated = $updated -replace '(\s+<link rel="stylesheet" href="/agent/agent-global\.css">)', '$1' + "`n" + '    <link rel="stylesheet" href="/css/themes/professional.css">'
                }
                elseif ($file -like "customer-service/*") {
                    $updated = $updated -replace '(\s+<link rel="stylesheet" href="/customer-service/customer-service-global\.css">)', '$1' + "`n" + '    <link rel="stylesheet" href="/css/themes/professional.css">'
                }
                else {
                    # For other files, add it to head
                    $updated = $updated -replace '(\s+</head>)', '    <link rel="stylesheet" href="/css/themes/professional.css">' + "`n" + '$1'
                }
            }
            
            # 2. Replace classic-mode.js with theme-switcher.js
            $updated = $updated -replace '<script src="/js/classic-mode\.js"></script>', '<script src="/js/theme-switcher.js"></script>'
            
            # 3. Update comment
            $updated = $updated -replace '<!-- Classic Mode Toggle System -->', '<!-- Professional Theme System -->'
            
            # Write updated content
            Set-Content $fullPath $updated -NoNewline
            
            Write-Host "  ✓ Updated successfully" -ForegroundColor Green
            $successCount++
            
        } catch {
            Write-Host "  ✗ Error updating file: $($_.Exception.Message)" -ForegroundColor Red
            $errorCount++
        }
    } else {
        Write-Host "  ⚠ File not found: $fullPath" -ForegroundColor Yellow
    }
}

Write-Host "`nProfessional Theme System Fix Complete!" -ForegroundColor Green
Write-Host "Successfully updated: $successCount files" -ForegroundColor Green
if ($errorCount -gt 0) {
    Write-Host "Errors: $errorCount files" -ForegroundColor Red
}

Write-Host "`nChanges made:" -ForegroundColor Yellow
Write-Host "1. Added /css/themes/professional.css to all portal pages" -ForegroundColor White
Write-Host "2. Replaced /js/classic-mode.js with /js/theme-switcher.js" -ForegroundColor White
Write-Host "3. Updated comments to reflect Professional Theme System" -ForegroundColor White

Write-Host "`nTo test professional mode:" -ForegroundColor Cyan
Write-Host "1. Go to any portal settings page" -ForegroundColor White
Write-Host "2. Click 'Professional Mode' button" -ForegroundColor White
Write-Host "3. Or use keyboard shortcut: Alt + P" -ForegroundColor White