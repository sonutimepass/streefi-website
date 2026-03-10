#!/usr/bin/env pwsh
<#
.SYNOPSIS
Migrate data from streefi_whatsapp (legacy) to whatsapp_conversations (active)

.DESCRIPTION
This script copies all items from the legacy streefi_whatsapp table
to the new active whatsapp_conversations table.

Safe to run multiple times (will overwrite existing items).
#>

param(
    [string]$Region = "ap-south-1",
    [string]$SourceTable = "streefi_whatsapp",
    [string]$DestTable = "whatsapp_conversations",
    [switch]$DryRun = $false
)

Write-Host "`n" + ("=" * 80) -ForegroundColor Cyan
Write-Host "🔄 DYNAMODB TABLE MIGRATION" -ForegroundColor Cyan
Write-Host ("=" * 80) -ForegroundColor Cyan
Write-Host ""

if ($DryRun) {
    Write-Host "⚠️  DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Scan source table
Write-Host "📥 Reading data from source table: $SourceTable" -ForegroundColor Cyan
try {
    $scanResult = aws dynamodb scan `
        --table-name $SourceTable `
        --region $Region `
        2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ ERROR: Could not scan source table" -ForegroundColor Red
        Write-Host $scanResult
        exit 1
    }

    $items = ($scanResult | ConvertFrom-Json).Items
    $itemCount = $items.Count

    Write-Host "✅ Found $itemCount items in $SourceTable" -ForegroundColor Green
    Write-Host ""

    if ($itemCount -eq 0) {
        Write-Host "⚠️  No items to migrate" -ForegroundColor Yellow
        exit 0
    }

} catch {
    Write-Host "❌ ERROR: Failed to scan source table" -ForegroundColor Red
    Write-Host $_.Exception.Message
    exit 1
}

# Step 2: Display items
Write-Host "📋 Items to migrate:" -ForegroundColor Cyan
foreach ($item in $items) {
    $pk = if ($item.PK) { $item.PK.S } else { "N/A" }
    $sk = if ($item.SK) { $item.SK.S } else { "N/A" }
    Write-Host "  - PK: $pk | SK: $sk" -ForegroundColor White
}
Write-Host ""

# Step 3: Migrate items
if (-not $DryRun) {
    Write-Host "🔄 Migrating items to: $DestTable" -ForegroundColor Cyan
    
    $successCount = 0
    $errorCount = 0

    foreach ($item in $items) {
        $pk = if ($item.PK) { $item.PK.S } else { "N/A" }
        $sk = if ($item.SK) { $item.SK.S } else { "N/A" }
        
        try {
            # Convert item to JSON for put-item
            $itemJson = $item | ConvertTo-Json -Depth 10 -Compress
            
            $result = aws dynamodb put-item `
                --table-name $DestTable `
                --item $itemJson `
                --region $Region `
                2>&1

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✅ Migrated: PK=$pk, SK=$sk" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host "  ❌ Failed: PK=$pk, SK=$sk" -ForegroundColor Red
                Write-Host "     Error: $result" -ForegroundColor Red
                $errorCount++
            }

        } catch {
            Write-Host "  ❌ Failed: PK=$pk, SK=$sk" -ForegroundColor Red
            Write-Host "     Error: $($_.Exception.Message)" -ForegroundColor Red
            $errorCount++
        }
    }

    Write-Host ""
    Write-Host ("=" * 80) -ForegroundColor Cyan
    Write-Host "📊 MIGRATION SUMMARY" -ForegroundColor Cyan
    Write-Host ("=" * 80) -ForegroundColor Cyan
    Write-Host "Total Items:    $itemCount" -ForegroundColor White
    Write-Host "Migrated:       $successCount" -ForegroundColor Green
    Write-Host "Failed:         $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Green" })
    Write-Host ""

    if ($successCount -eq $itemCount) {
        Write-Host "✅ MIGRATION COMPLETE!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Verify data in $DestTable" -ForegroundColor White
        Write-Host "2. Test your application" -ForegroundColor White
        Write-Host "3. Delete $SourceTable if no longer needed" -ForegroundColor White
    } else {
        Write-Host "⚠️  MIGRATION INCOMPLETE - Some items failed" -ForegroundColor Yellow
    }

} else {
    Write-Host "✅ DRY RUN COMPLETE - No changes made" -ForegroundColor Green
    Write-Host ""
    Write-Host "To perform the migration, run:" -ForegroundColor Cyan
    Write-Host "  .\migrate-whatsapp-table.ps1" -ForegroundColor White
}

Write-Host ""
