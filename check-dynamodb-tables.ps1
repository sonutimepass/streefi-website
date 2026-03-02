#!/usr/bin/env pwsh

<#
.SYNOPSIS
Check DynamoDB Tables Status and Schema
Helps debug table creation and schema issues
#>

Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
Write-Host "🔍 DYNAMODB TABLES DIAGNOSTIC" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

# Tables to check
$tables = @(
    @{
        Name = "streefi_campaigns"
        PKName = "PK"
        SKName = "SK"
        Region = "ap-south-1"
    },
    @{
        Name = "streefi_campaigns_recipients"
        PKName = "PK"
        SKName = "SK"
        Region = "ap-south-1"
    },
    @{
        Name = "streefi_whatsapp"
        PKName = "PK"
        SKName = "SK"
        Region = "ap-south-1"
    },
    @{
        Name = "streefi_admins"
        PKName = "email"
        SKName = $null
        Region = "ap-south-1"
    },
    @{
        Name = "streefi_sessions"
        PKName = "session_id"
        SKName = $null
        Region = "ap-south-1"
    }
)

Write-Host "`nChecking $(($tables | Measure-Object).Count) tables..`n" -ForegroundColor Yellow

$allExist = $true

foreach ($table in $tables) {
    Write-Host "Checking: $($table.Name)" -ForegroundColor Cyan
    
    try {
        $result = aws dynamodb describe-table `
            --table-name $table.Name `
            --region $table.Region `
            --output json 2>&1 | ConvertFrom-Json
        
        if ($result.Table) {
            $tableInfo = $result.Table
            Write-Host "  ✅ EXISTS" -ForegroundColor Green
            Write-Host "  └─ Status: $($tableInfo.TableStatus)" -ForegroundColor Gray
            Write-Host "  └─ ARN: $($tableInfo.TableArn)" -ForegroundColor Gray
            
            # Check key schema
            Write-Host "  └─ Key Schema:" -ForegroundColor Gray
            foreach ($key in $tableInfo.KeySchema) {
                Write-Host "     └─ $($key.AttributeName) ($($key.KeyType))" -ForegroundColor Gray
            }
            
            # Validate expected keys
            $pkExists = $tableInfo.KeySchema | Where-Object { $_.AttributeName -eq $table.PKName }
            if ($pkExists) {
                Write-Host "  ✅ PK matches: $($table.PKName)" -ForegroundColor Green
            } else {
                Write-Host "  ❌ PK mismatch - Expected: $($table.PKName), Found: $($tableInfo.KeySchema[0].AttributeName)" -ForegroundColor Red
                $allExist = $false
            }
            
            if ($table.SKName) {
                $skExists = $tableInfo.KeySchema | Where-Object { $_.AttributeName -eq $table.SKName }
                if ($skExists) {
                    Write-Host "  ✅ SK matches: $($table.SKName)" -ForegroundColor Green
                } else {
                    Write-Host "  ❌ SK mismatch - Expected: $($table.SKName)" -ForegroundColor Red
                    $allExist = $false
                }
            }
        }
    }
    catch {
        Write-Host "  ❌ NOT FOUND or ERROR" -ForegroundColor Red
        Write-Host "  └─ Error: $($_ -replace '.*ResourceNotFoundException.*', 'Table does not exist')" -ForegroundColor Gray
        $allExist = $false
    }
    
    Write-Host ""
}

Write-Host "=" * 80 -ForegroundColor Cyan
if ($allExist) {
    Write-Host "✅ ALL TABLES EXIST WITH CORRECT SCHEMA" -ForegroundColor Green
} else {
    Write-Host "❌ SOME TABLES ARE MISSING OR HAVE WRONG SCHEMA" -ForegroundColor Red
    Write-Host "`nNext Steps:" -ForegroundColor Yellow
    Write-Host "1. Go to AWS DynamoDB Console (region: ap-south-1)" -ForegroundColor Yellow
    Write-Host "2. Check which tables exist" -ForegroundColor Yellow
    Write-Host "3. For missing tables, create them with correct schema" -ForegroundColor Yellow
    Write-Host "4. Re-run this diagnostic to verify" -ForegroundColor Yellow
}
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""
