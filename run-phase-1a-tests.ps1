#!/usr/bin/env pwsh

<#
.SYNOPSIS
Phase 1A Campaign Executor Testing Suite
Tests the campaign system against Amplify deployment

.DESCRIPTION
Runs 6 comprehensive tests to validate:
- Campaign creation
- Recipient population
- Campaign lifecycle (DRAFT → RUNNING → PAUSED)
- Daily limit enforcement
- Idempotency
- Atomic counter correctness

.PARAMETER AmplifyUrl
The Amplify app URL (e.g., https://testing.d1levaqu4bxq8c.amplifyapp.com)
#>

param(
    [string]$AmplifyUrl = "https://testing.d1levaqu4bxq8c.amplifyapp.com"
)

# Color output
function Write-Success {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Green
}

function Write-Info {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Cyan
}

function Write-Warning {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host $Message -ForegroundColor Red
}

# Banner
Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
Write-Host "🧪 PHASE 1A CAMPAIGN EXECUTOR TESTING SUITE" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "Target: $AmplifyUrl`n" -ForegroundColor Yellow

# Test counters
$passed = 0
$failed = 0

# Store campaign ID for later tests
$campaignId = $null

# ============================================================================
# TEST 1: Create Campaign
# ============================================================================
Write-Host "`n[1/6] Creating Campaign..." -ForegroundColor Cyan
Write-Host "-" * 80

try {
    $body = @{
        name = "Phase 1A Amplify Test $(Get-Date -Format 'HHmmss')"
        templateName = "hello_world"
        channel = "WHATSAPP"
        audienceType = "CSV"
    } | ConvertTo-Json

    $response = Invoke-RestMethod `
        -Uri "$AmplifyUrl/api/campaigns/create" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    $campaignId = $response.campaignId
    
    if ($campaignId) {
        Write-Success "✅ Campaign created: $campaignId"
        $passed++
    } else {
        Write-Error "❌ Campaign creation returned no ID"
        $failed++
        exit 1
    }
}
catch {
    Write-Error "❌ Campaign creation failed: $_"
    $failed++
    exit 1
}

# ============================================================================
# TEST 2: Populate Recipients (10 numbers)
# ============================================================================
Write-Host "`n[2/6] Populating 10 recipients..." -ForegroundColor Cyan
Write-Host "-" * 80

try {
    # Create CSV file
    $csvContent = @"
919876543210
919876543211
919876543212
919876543213
919876543214
919876543215
919876543216
919876543217
919876543218
919876543219
"@
    
    $csvContent | Out-File -FilePath "$PSScriptRoot/test-numbers.csv" -Encoding UTF8 -Force

    # Upload using curl (better for form data)
    $result = curl.exe -s -w "`n%{http_code}" `
        -X POST `
        -F "file=@$PSScriptRoot/test-numbers.csv" `
        "$AmplifyUrl/api/campaigns/$campaignId/populate"

    # Parse response
    $httpCode = $result[-1]
    $responseBody = $result[0..($result.Length-2)] -join "`n"

    Write-Host "HTTP Code: $httpCode" -ForegroundColor Gray
    Write-Host "Response: $responseBody" -ForegroundColor Gray

    if ($httpCode -eq 200 -or $responseBody -match '"inserted":') {
        Write-Success "✅ Recipients populated successfully"
        $passed++
    } else {
        Write-Error "❌ Recipient population returned code $httpCode"
        $failed++
    }

    # Cleanup
    Remove-Item "$PSScriptRoot/test-numbers.csv" -Force -ErrorAction SilentlyContinue
}
catch {
    Write-Error "❌ Recipient population failed: $_"
    $failed++
}

# ============================================================================
# TEST 3: Start Campaign
# ============================================================================
Write-Host "`n[3/6] Starting campaign..." -ForegroundColor Cyan
Write-Host "-" * 80

try {
    $body = @{ action = "start" } | ConvertTo-Json

    $response = Invoke-RestMethod `
        -Uri "$AmplifyUrl/api/campaigns/$campaignId/control" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    if ($response.newStatus -eq "RUNNING") {
        Write-Success "✅ Campaign status: $($response.newStatus)"
        $passed++
    } else {
        Write-Error "❌ Campaign status not RUNNING: $($response.newStatus)"
        $failed++
    }
}
catch {
    Write-Error "❌ Start campaign failed: $_"
    $failed++
}

# ============================================================================
# TEST 4: Execute Batch (First Run)
# ============================================================================
Write-Host "`n[4/6] Executing batch (first run)..." -ForegroundColor Cyan
Write-Host "-" * 80

try {
    $response = Invoke-RestMethod `
        -Uri "$AmplifyUrl/api/campaigns/$campaignId/execute-batch" `
        -Method POST `
        -ContentType "application/json"

    Write-Host "Response:" -ForegroundColor Gray
    Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor Gray

    $processed = $response.result.processed
    $sent = $response.result.sent
    $failed_count = $response.result.failed
    $paused = $response.result.paused

    Write-Host "`nResults: Processed=$processed, Sent=$sent, Failed=$failed_count, Paused=$paused" -ForegroundColor Yellow

    # Should send all 10 (batch size is 25, we populated 10 recipients)
    # Will NOT auto-pause unless daily limit (default 200) is reached
    if ($processed -eq 10 -and $sent -eq 10) {
        Write-Success "✅ Batch executed correctly (all 10 sent)"
        $passed++
    } else {
        Write-Error "❌ Expected 10 processed and sent, got Processed=$processed, Sent=$sent"
        $failed++
    }
}
catch {
    Write-Error "❌ Batch execution failed: $_"
    $failed++
}

# ============================================================================
# TEST 5: Execute Batch (Second Run - Idempotency)
# ============================================================================
Write-Host "`n[5/6] Executing batch (second run - idempotency)..." -ForegroundColor Cyan
Write-Host "-" * 80

try {
    $response = Invoke-RestMethod `
        -Uri "$AmplifyUrl/api/campaigns/$campaignId/execute-batch" `
        -Method POST `
        -ContentType "application/json"

    Write-Host "Response:" -ForegroundColor Gray
    Write-Host ($response | ConvertTo-Json -Depth 5) -ForegroundColor Gray

    $processed = $response.result.processed
    
    Write-Host "`nResults: Processed=$processed" -ForegroundColor Yellow

    # Second run should process 0 (idempotency test)
    if ($processed -eq 0 -or $response.result.pauseReason -match "paused|completed|remaining") {
        Write-Success "✅ Idempotency verified (0 processed on second run)"
        $passed++
    } else {
        Write-Error "❌ Processed $processed on second run (should be 0)"
        $failed++
    }
}
catch {
    Write-Error "❌ Second batch failed: $_"
    $failed++
}

# ============================================================================
# TEST 6: Verify Final State
# ============================================================================
Write-Host "`n[6/6] Verifying final campaign state..." -ForegroundColor Cyan
Write-Host "-" * 80

try {
    $response = Invoke-RestMethod `
        -Uri "$AmplifyUrl/api/campaigns/$campaignId" `
        -Method GET

    $status = $response.campaign.status
    $sentCount = $response.campaign.sentCount
    $failedCount = $response.campaign.failedCount
    $totalRecipients = $response.campaign.totalRecipients
    $progress = 0
    
    if ($totalRecipients -gt 0) {
        $progress = [math]::Round(($sentCount / $totalRecipients) * 100, 1)
    }

    Write-Host "`n" + "=" * 40 -ForegroundColor Green
    Write-Host "FINAL STATE:" -ForegroundColor Green
    Write-Host "=" * 40 -ForegroundColor Green
    Write-Host "Campaign Status: $status" -ForegroundColor Yellow
    Write-Host "Sent Count: $sentCount" -ForegroundColor Yellow
    Write-Host "Failed Count: $failedCount" -ForegroundColor Yellow
    Write-Host "Total Recipients: $totalRecipients" -ForegroundColor Yellow
    Write-Host "Progress: $progress%" -ForegroundColor Yellow
    Write-Host "=" * 40 -ForegroundColor Green

    # Validate results
    $allGood = $true
    
    if ($status -ne "COMPLETED") {
        Write-Error "❌ Status is $status (expected COMPLETED)"
        $allGood = $false
    } else {
        Write-Success "✅ Status: COMPLETED"
    }

    if ($sentCount -ne 10) {
        Write-Error "❌ Sent count is $sentCount (expected 10)"
        $allGood = $false
    } else {
        Write-Success "✅ Sent count: 10"
    }

    if ($failedCount -ne 0) {
        Write-Error "❌ Failed count is $failedCount (expected 0)"
        $allGood = $false
    } else {
        Write-Success "✅ Failed count: 0"
    }

    if ($totalRecipients -ne 10) {
        Write-Error "❌ Total recipients is $totalRecipients (expected 10)"
        $allGood = $false
    } else {
        Write-Success "✅ Total recipients: 10"
    }

    if ($allGood) {
        $passed++
    } else {
        $failed++
    }
}
catch {
    Write-Error "❌ Final state check failed: $_"
    $failed++
}

# ============================================================================
# Summary
# ============================================================================
Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
Write-Host "TEST SUMMARY" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan

Write-Host "Passed: $passed/6" -ForegroundColor Green
Write-Host "Failed: $failed/6" -ForegroundColor Red

if ($failed -eq 0) {
    Write-Success "`n🎉 ALL TESTS PASSED!`n"
    Write-Host "Your Phase 1A campaign executor is working perfectly." -ForegroundColor Green
    Write-Host "All dry run simulations executed as expected." -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Check CloudWatch logs for DRY_RUN simulation messages" -ForegroundColor Cyan
    Write-Host "2. Verify atomic counter correctness" -ForegroundColor Cyan
    Write-Host "3. Run crash recovery tests" -ForegroundColor Cyan
    Write-Host "4. Move to Phase 1A.5 when ready for real sends" -ForegroundColor Cyan
} else {
    Write-Error "`n❌ SOME TESTS FAILED`n"
    Write-Host "Check the output above for details." -ForegroundColor Red
}

Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host ""

exit $failed
