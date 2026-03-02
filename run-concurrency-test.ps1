#!/usr/bin/env pwsh

<#
.SYNOPSIS
Phase 1A Concurrency Stress Test

.DESCRIPTION
Tests parallel batch execution to detect:
- Race conditions
- Duplicate sends
- Counter inconsistencies
- Atomic update failures

.PARAMETER AmplifyUrl
The Amplify app URL (e.g., https://testing.d1levaqu4bxq8c.amplifyapp.com)

.PARAMETER ParallelExecutions
Number of parallel batch executions to launch (default: 5)

.PARAMETER Recipients
Number of test recipients (default: 10)
#>

param(
    [string]$AmplifyUrl = "https://testing.d1levaqu4bxq8c.amplifyapp.com",
    [int]$ParallelExecutions = 5,
    [int]$Recipients = 10
)

Write-Host "`n" + "=" * 80 -ForegroundColor Cyan
Write-Host "🔥 PHASE 1A - CONCURRENCY STRESS TEST" -ForegroundColor Cyan
Write-Host "=" * 80 -ForegroundColor Cyan
Write-Host "Target: $AmplifyUrl`n" -ForegroundColor Yellow

$baseUrl = $AmplifyUrl
$numParallelExecutions = $ParallelExecutions
$numRecipients = $Recipients

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Parallel Executions: $numParallelExecutions"
Write-Host "  Recipients: $numRecipients"
Write-Host "  Base URL: $baseUrl`n"

Write-Host "What This Test Does:" -ForegroundColor Yellow
Write-Host "  1. Creates campaign + populates $numRecipients recipients"
Write-Host "  2. Starts campaign (DRAFT → RUNNING)"
Write-Host "  3. Launches $numParallelExecutions parallel batch executions simultaneously"
Write-Host "  4. Verifies NO duplicate sends occurred"
Write-Host "  5. Verifies atomic counter integrity"
Write-Host "  6. Confirms idempotency on re-run`n"

Write-Host "Expected Outcome:" -ForegroundColor Yellow
Write-Host "  ✓ Total processed across all executions = $numRecipients (no more, no less)"
Write-Host "  ✓ Campaign sentCount = $numRecipients"
Write-Host "  ✓ Verification run processes 0 recipients`n"

Write-Host "If This Fails:" -ForegroundColor Red
Write-Host "  System has race conditions and is NOT production-ready`n"

Write-Host "-" * 80 -ForegroundColor Cyan

# ============================================================
# Step 1: Create Fresh Campaign
# ============================================================

Write-Host "[1/6] Creating fresh campaign..." -ForegroundColor Green

$createPayload = @{
    name = "Concurrency Test $(Get-Date -Format 'yyyyMMdd_HHmmss')"
    templateName = "hello_world"
    channel = "WHATSAPP"
    audienceType = "CSV"
} | ConvertTo-Json

try {
    $createResponse = Invoke-RestMethod -Uri "$baseUrl/api/campaigns/create" `
        -Method Post `
        -ContentType "application/json" `
        -Body $createPayload
    
    $campaignId = $createResponse.campaignId
    Write-Host "  ✓ Campaign created: $campaignId" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed to create campaign: $_" -ForegroundColor Red
    exit 1
}

# ============================================================
# Step 2: Create CSV and Populate Campaign
# ============================================================

Write-Host "`n[2/6] Populating campaign with $numRecipients recipients..." -ForegroundColor Green

# Create CSV file
$csvPath = "test-recipients-concurrency.csv"
$csvContent = ""
for ($i = 1; $i -le $numRecipients; $i++) {
    $phone = "919876543{0:D3}" -f $i
    $csvContent += "$phone`n"
}
Set-Content -Path $csvPath -Value $csvContent -NoNewline

try {
    # Upload CSV using multipart/form-data
    $boundary = [System.Guid]::NewGuid().ToString()
    $LF = "`r`n"
    
    $csvBytes = [System.IO.File]::ReadAllBytes($csvPath)
    
    $bodyLines = (
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"recipients.csv`"",
        "Content-Type: text/csv$LF",
        [System.Text.Encoding]::UTF8.GetString($csvBytes),
        "--$boundary--$LF"
    ) -join $LF
    
    $populateResponse = Invoke-RestMethod -Uri "$baseUrl/api/campaigns/$campaignId/populate" `
        -Method Post `
        -ContentType "multipart/form-data; boundary=$boundary" `
        -Body $bodyLines
    
    Write-Host "  ✓ Recipients populated: $($populateResponse.totalRecipients)" -ForegroundColor Green
    
    # Clean up CSV
    Remove-Item -Path $csvPath -Force
} catch {
    Write-Host "  ✗ Failed to populate campaign: $_" -ForegroundColor Red
    if (Test-Path $csvPath) { Remove-Item -Path $csvPath -Force }
    exit 1
}

# ============================================================
# Step 3: Start Campaign
# ============================================================

Write-Host "`n[3/6] Starting campaign..." -ForegroundColor Green

$startPayload = @{ action = "start" } | ConvertTo-Json

try {
    $startResponse = Invoke-RestMethod -Uri "$baseUrl/api/campaigns/$campaignId/control" `
        -Method Post `
        -ContentType "application/json" `
        -Body $startPayload
    
    Write-Host "  ✓ Campaign status: $($startResponse.newStatus)" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Failed to start campaign: $_" -ForegroundColor Red
    exit 1
}

# ============================================================
# Step 4: Launch Parallel Batch Executions
# ============================================================

Write-Host "`n[4/6] Launching $numParallelExecutions parallel batch executions..." -ForegroundColor Green

$jobs = @()
$startTime = Get-Date

for ($i = 1; $i -le $numParallelExecutions; $i++) {
    Write-Host "  → Launching execution #$i..." -ForegroundColor Cyan
    
    $job = Start-Job -ScriptBlock {
        param($url, $executionNumber)
        
        $startTime = Get-Date
        
        try {
            $response = Invoke-RestMethod -Uri $url `
                -Method Post `
                -TimeoutSec 30
            
            $duration = (Get-Date) - $startTime
            
            return @{
                ExecutionNumber = $executionNumber
                Success = $true
                Response = $response
                Duration = $duration.TotalSeconds
                Error = $null
            }
        } catch {
            $duration = (Get-Date) - $startTime
            
            return @{
                ExecutionNumber = $executionNumber
                Success = $false
                Response = $null
                Duration = $duration.TotalSeconds
                Error = $_.Exception.Message
            }
        }
    } -ArgumentList "$baseUrl/api/campaigns/$campaignId/execute-batch", $i
    
    $jobs += $job
}

Write-Host "  ✓ All $numParallelExecutions executions launched" -ForegroundColor Green

# ============================================================
# Step 5: Wait for All Executions to Complete
# ============================================================

Write-Host "`n[5/6] Waiting for parallel executions to complete..." -ForegroundColor Green

$results = @()
$completedCount = 0

while ($completedCount -lt $numParallelExecutions) {
    Start-Sleep -Milliseconds 500
    
    foreach ($job in $jobs) {
        if ($job.State -eq 'Completed' -and $job.JobStateInfo.State -eq 'Completed') {
            if (-not ($results | Where-Object { $_.ExecutionNumber -eq ($job | Receive-Job).ExecutionNumber })) {
                $result = Receive-Job -Job $job
                $results += $result
                $completedCount++
                
                if ($result.Success) {
                    Write-Host "  ✓ Execution #$($result.ExecutionNumber) completed in $([math]::Round($result.Duration, 2))s - Processed: $($result.Response.processed)" -ForegroundColor Green
                } else {
                    Write-Host "  ✗ Execution #$($result.ExecutionNumber) failed: $($result.Error)" -ForegroundColor Red
                }
            }
        }
    }
}

$totalDuration = (Get-Date) - $startTime
Write-Host "  ✓ All executions completed in $([math]::Round($totalDuration.TotalSeconds, 2))s" -ForegroundColor Green

# Clean up jobs
$jobs | Remove-Job

# ============================================================
# Step 6: Analyze Results
# ============================================================

Write-Host "`n[6/6] Analyzing concurrent execution results..." -ForegroundColor Green

$successfulExecutions = ($results | Where-Object { $_.Success }).Count
$failedExecutions = ($results | Where-Object { -not $_.Success }).Count
$totalProcessed = ($results | Where-Object { $_.Success } | ForEach-Object { $_.Response.processed } | Measure-Object -Sum).Sum

Write-Host "`n  Execution Summary:" -ForegroundColor Yellow
Write-Host "    Successful: $successfulExecutions"
Write-Host "    Failed: $failedExecutions"
Write-Host "    Total Processed (sum across all executions): $totalProcessed"

# ============================================================
# Step 7: Verify Data Integrity in DynamoDB
# ============================================================

Write-Host "`n[7/7] Verifying data integrity in DynamoDB..." -ForegroundColor Green

try {
    $statusResponse = Invoke-RestMethod -Uri "$baseUrl/api/campaigns/$campaignId" `
        -Method Get
    
    $campaign = $statusResponse.campaign
    
    Write-Host "`n  Campaign Final State:" -ForegroundColor Yellow
    Write-Host "    Status: $($campaign.status)"
    Write-Host "    Total Recipients: $($campaign.totalRecipients)"
    Write-Host "    Sent Count: $($campaign.sentCount)"
    Write-Host "    Failed Count: $($campaign.failedCount)"
    
    # Verify recipient processing
    $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/campaigns/$campaignId/execute-batch" `
        -Method Post
    
    Write-Host "`n  Verification Run (should process 0):" -ForegroundColor Yellow
    Write-Host "    Processed: $($verifyResponse.processed)"
    Write-Host "    Completed: $($verifyResponse.completed)"
    
} catch {
    Write-Host "  ✗ Failed to verify data integrity: $_" -ForegroundColor Red
    exit 1
}

# ============================================================
# Test Results
# ============================================================

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "TEST RESULTS - CONCURRENCY VERIFICATION" -ForegroundColor Cyan
Write-Host "============================================================`n" -ForegroundColor Cyan

$passed = $true
$issues = @()

# Check 1: All executions should succeed
if ($failedExecutions -gt 0) {
    $issues += "✗ $failedExecutions executions failed"
    $passed = $false
} else {
    Write-Host "✓ All $numParallelExecutions parallel executions succeeded" -ForegroundColor Green
}

# Check 2: Total processed should equal recipients (no duplicates)
if ($totalProcessed -ne $numRecipients) {
    $issues += "✗ Total processed ($totalProcessed) != Recipients ($numRecipients)"
    $passed = $false
} else {
    Write-Host "✓ No duplicate processing: $totalProcessed total processed across all executions" -ForegroundColor Green
}

# Check 3: Campaign sent count should match
if ($campaign.sentCount -ne $numRecipients) {
    $issues += "✗ Campaign sentCount ($($campaign.sentCount)) != Recipients ($numRecipients)"
    $passed = $false
} else {
    Write-Host "✓ Campaign sent count accurate: $($campaign.sentCount)" -ForegroundColor Green
}

# Check 4: Idempotency check (verification run should process 0)
if ($verifyResponse.processed -ne 0) {
    $issues += "✗ Verification run processed $($verifyResponse.processed) (should be 0)"
    $passed = $false
} else {
    Write-Host "✓ Idempotency preserved: verification run processed 0" -ForegroundColor Green
}

# Check 5: Campaign should be completed
if ($campaign.status -ne "COMPLETED") {
    $issues += "✗ Campaign status is $($campaign.status) (expected COMPLETED)"
    $passed = $false
} else {
    Write-Host "✓ Campaign completed successfully" -ForegroundColor Green
}

# Final verdict
Write-Host "`n============================================================" -ForegroundColor Cyan
if ($passed) {
    Write-Host "CONCURRENCY TEST PASSED" -ForegroundColor Green
    Write-Host "============================================================`n" -ForegroundColor Green
    Write-Host "System is production-safe under parallel load." -ForegroundColor Green
    Write-Host "No race conditions detected." -ForegroundColor Green
    Write-Host "Atomic updates working correctly.`n" -ForegroundColor Green
    exit 0
} else {
    Write-Host "CONCURRENCY TEST FAILED" -ForegroundColor Red
    Write-Host "============================================================`n" -ForegroundColor Red
    Write-Host "Issues detected:`n" -ForegroundColor Red
    foreach ($issue in $issues) {
        Write-Host "  $issue" -ForegroundColor Red
    }
    Write-Host "`nSystem has race conditions or consistency issues." -ForegroundColor Red
    Write-Host "NOT safe for production deployment.`n" -ForegroundColor Red
    exit 1
}
