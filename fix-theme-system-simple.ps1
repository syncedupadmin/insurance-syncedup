# Fix Professional Theme System - Simple version
$rootDir = "C:\Users\nicho\OneDrive\Desktop\Insurance.SyncedUp\public"

Write-Host "Starting Professional Theme System Fix..." -ForegroundColor Green

# Update admin portal files
Get-ChildItem "$rootDir\admin\*.html" | ForEach-Object {
    Write-Host "Processing: $($_.Name)" -ForegroundColor Cyan
    $content = Get-Content $_.FullName -Raw
    
    # Add professional CSS if not present
    if ($content -notmatch "/css/themes/professional\.css") {
        $content = $content -replace '(\s+<link rel="stylesheet" href="/admin/admin-global\.css">)', '$1' + "`n" + '    <link rel="stylesheet" href="/css/themes/professional.css">'
    }
    
    # Replace classic-mode.js with theme-switcher.js
    $content = $content -replace '<script src="/js/classic-mode\.js"></script>', '<script src="/js/theme-switcher.js"></script>'
    $content = $content -replace '<!-- Classic Mode Toggle System -->', '<!-- Professional Theme System -->'
    
    Set-Content $_.FullName $content -NoNewline
    Write-Host "  Updated: $($_.Name)" -ForegroundColor Green
}

# Update manager portal files
Get-ChildItem "$rootDir\manager\*.html" | ForEach-Object {
    Write-Host "Processing: $($_.Name)" -ForegroundColor Cyan
    $content = Get-Content $_.FullName -Raw
    
    # Add professional CSS if not present
    if ($content -notmatch "/css/themes/professional\.css") {
        $content = $content -replace '(\s+<link rel="stylesheet" href="/manager/manager-global\.css">)', '$1' + "`n" + '    <link rel="stylesheet" href="/css/themes/professional.css">'
    }
    
    # Replace classic-mode.js with theme-switcher.js
    $content = $content -replace '<script src="/js/classic-mode\.js"></script>', '<script src="/js/theme-switcher.js"></script>'
    $content = $content -replace '<!-- Classic Mode Toggle System -->', '<!-- Professional Theme System -->'
    
    Set-Content $_.FullName $content -NoNewline
    Write-Host "  Updated: $($_.Name)" -ForegroundColor Green
}

# Update agent portal files
Get-ChildItem "$rootDir\agent\*.html" | ForEach-Object {
    Write-Host "Processing: $($_.Name)" -ForegroundColor Cyan
    $content = Get-Content $_.FullName -Raw
    
    # Add professional CSS if not present
    if ($content -notmatch "/css/themes/professional\.css") {
        $content = $content -replace '(\s+<link rel="stylesheet" href="/agent/agent-global\.css">)', '$1' + "`n" + '    <link rel="stylesheet" href="/css/themes/professional.css">'
    }
    
    # Replace classic-mode.js with theme-switcher.js
    $content = $content -replace '<script src="/js/classic-mode\.js"></script>', '<script src="/js/theme-switcher.js"></script>'
    $content = $content -replace '<!-- Classic Mode Toggle System -->', '<!-- Professional Theme System -->'
    
    Set-Content $_.FullName $content -NoNewline
    Write-Host "  Updated: $($_.Name)" -ForegroundColor Green
}

Write-Host "Professional Theme System Fix Complete!" -ForegroundColor Green