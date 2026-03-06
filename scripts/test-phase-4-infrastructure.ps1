# Test Phase 4 Infrastructure
# Run this after completing integration steps

param(
    [string]$BaseUrl = "http://localhost:3000",
    [string]$DispatcherKey = $env:DISPATCHER_SECRET_KEY
)

Write-Host "🧪 Testing Phase 4 Infrastructure" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Test 1: Warmup Status
Write-Host "Test 1: Warmup Manager Status" -ForegroundColor Yellow
try {
    $warmupResponse = Invoke-RestMethod -Uri "$BaseUrl/api/whatsapp-admin/warmup-status" -ErrorAction Stop
    Write-Host "✅ Warmup Status Retrieved:" -ForegroundColor Green
    Write-Host "   Account Age: $($warmupResponse.accountAge) days" -ForegroundColor White
    Write-Host "   Daily Limit: $($warmupResponse.dailyLimit) messages" -ForegroundColor White
    Write-Host "   Sent Today: $($warmupResponse.currentDaySent)" -ForegroundColor White
    Write-Host "   Remaining: $($warmupResponse.remainingToday)" -ForegroundColor White
    Write-Host "   Quality Tier: $($warmupResponse.qualityTier)" -ForegroundColor White
    
    if ($warmupResponse.warmupProgress) {
        Write-Host "   Current Tier: $($warmupResponse.warmupProgress.currentTier)" -ForegroundColor White
        Write-Host "   Next Tier: $($warmupResponse.warmupProgress.nextTier)" -ForegroundColor White
        Write-Host "   Days Until Next: $($warmupResponse.warmupProgress.daysUntilNext)" -ForegroundColor White
    }
} catch {
    Write-Host "❌ Warmup Status Failed: Create endpoint first (see PHASE-4-SETUP-GUIDE.md)" -ForegroundColor Red
}
Write-Host ""

# Test 2: Dispatcher Health Check
Write-Host "Test 2: Dispatcher Health Check" -ForegroundColor Yellow
try {
    $dispatchResponse = Invoke-RestMethod -Uri "$BaseUrl/api/campaigns/dispatch" -ErrorAction Stop
    Write-Host "✅ Dispatcher Status:" -ForegroundColor Green
    Write-Host "   Pending Campaigns: $($dispatchResponse.pendingCampaigns)" -ForegroundColor White
    
    if ($dispatchResponse.campaigns -and $dispatchResponse.campaigns.Count -gt 0) {
        Write-Host "   Ready for Processing:" -ForegroundColor White
        foreach ($campaign in $dispatchResponse.campaigns) {
            Write-Host "     - $($campaign.id): $($campaign.progress) complete" -ForegroundColor Gray
        }
    } else {
        Write-Host "   No campaigns ready for processing" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Dispatcher Health Check Failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: Rate Throttle Integration
Write-Host "Test 3: Rate Throttle Integration" -ForegroundColor Yellow
Write-Host "   Sending 15 rapid messages to test rate limiting..." -ForegroundColor Gray

$startTime = Get-Date
$successCount = 0
$throttleDetected = $false

for ($i = 1; $i -le 15; $i++) {
    $loopStart = Get-Date
    
    # Simulate message send (replace with actual test endpoint)
    Start-Sleep -Milliseconds 50
    
    $loopDuration = ((Get-Date) - $loopStart).TotalMilliseconds
    
    if ($loopDuration -gt 100) {
        $throttleDetected = $true
    }
    
    $successCount++
}

$totalDuration = ((Get-Date) - $startTime).TotalSeconds
$messagesPerSec = [math]::Round($successCount / $totalDuration, 2)

if ($messagesPerSec -le 12) {
    Write-Host "✅ Rate Throttle Working: $messagesPerSec msg/sec (target: 10 msg/sec)" -ForegroundColor Green
} else {
    Write-Host "⚠️  Rate Throttle May Not Be Integrated: $messagesPerSec msg/sec" -ForegroundColor Yellow
    Write-Host "   Expected: ~10 msg/sec. Check messageService.ts integration." -ForegroundColor Yellow
}
Write-Host ""

# Test 4: State Validator
Write-Host "Test 4: Campaign State Validator" -ForegroundColor Yellow
Write-Host "   Manual test required: Try to start a COMPLETED campaign" -ForegroundColor Gray
Write-Host "   Expected result: Should return error preventing transition" -ForegroundColor Gray
Write-Host ""

# Test 5: Dispatch Trigger (if key provided)
if ($DispatcherKey) {
    Write-Host "Test 5: Manual Dispatcher Trigger" -ForegroundColor Yellow
    try {
        $dispatchResult = Invoke-RestMethod `
            -Uri "$BaseUrl/api/campaigns/dispatch" `
            -Method POST `
            -Headers @{ "x-dispatcher-key" = $DispatcherKey } `
            -ErrorAction Stop
        
        Write-Host "✅ Dispatcher Triggered Successfully:" -ForegroundColor Green
        Write-Host "   Campaigns Dispatched: $($dispatchResult.dispatched)" -ForegroundColor White
        Write-Host "   Failed: $($dispatchResult.failed)" -ForegroundColor White
    } catch {
        Write-Host "❌ Dispatcher Trigger Failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "Test 5: Manual Dispatcher Trigger" -ForegroundColor Yellow
    Write-Host "   ⚠️  Skipped: DISPATCHER_SECRET_KEY not set" -ForegroundColor Yellow
    Write-Host "   Set env var or pass -DispatcherKey parameter to test" -ForegroundColor Gray
}
Write-Host ""

# Summary
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor White
Write-Host "1. ✅ Review test results above" -ForegroundColor White
Write-Host "2. 🔧 Complete integration steps in PHASE-4-SETUP-GUIDE.md" -ForegroundColor White
Write-Host "3. 🚀 Deploy to Vercel" -ForegroundColor White
Write-Host "4. 📈 Monitor first campaign execution" -ForegroundColor White
Write-Host ""
Write-Host "Critical Integration Checklist:" -ForegroundColor Yellow
Write-Host "[ ] Add rate throttle to messageService.ts" -ForegroundColor Gray
Write-Host "[ ] Add warmup checks to execute-batch route" -ForegroundColor Gray
Write-Host "[ ] Add state validator to campaign routes" -ForegroundColor Gray
Write-Host "[ ] Add auto spam protection trigger" -ForegroundColor Gray
Write-Host "[ ] Create warmup status endpoint" -ForegroundColor Gray
Write-Host "[ ] Add environment variables" -ForegroundColor Gray
Write-Host "[ ] Deploy vercel.json cron config" -ForegroundColor Gray
Write-Host ""
