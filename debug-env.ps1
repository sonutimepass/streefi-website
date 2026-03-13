# Debug Environment Variables and Auth Bypass
# Run this to check if your environment is configured correctly

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Environment Debug Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$baseUrl = Read-Host "Enter your app URL (default: http://localhost:3000)"
if ([string]::IsNullOrWhiteSpace($baseUrl)) {
    $baseUrl = "http://localhost:3000"
}
$baseUrl = $baseUrl.TrimEnd('/')

Write-Host ""
Write-Host "Checking: $baseUrl" -ForegroundColor Yellow
Write-Host ""

try {
    # Test the debug endpoint
    Write-Host "📋 Fetching environment variables..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "$baseUrl/api/debug/env-vars" -Method GET
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   ENVIRONMENT" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "NODE_ENV:              $($response.environment.NODE_ENV)" -ForegroundColor White
    Write-Host "BYPASS_AUTH:           $($response.environment.NEXT_PUBLIC_BYPASS_AUTH)" -ForegroundColor White
    Write-Host "VERCEL:                $($response.environment.VERCEL)" -ForegroundColor White
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   BYPASS CHECK" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    
    if ($response.bypassCheck.shouldBypass) {
        Write-Host "✅ Auth will be BYPASSED" -ForegroundColor Green
        Write-Host ""
        Write-Host "Reasons:" -ForegroundColor Cyan
        if ($response.bypassCheck.reasons.bypassAuthFlag) {
            Write-Host "  ✓ NEXT_PUBLIC_BYPASS_AUTH = true" -ForegroundColor Green
        }
        if ($response.bypassCheck.reasons.isDevelopment) {
            Write-Host "  ✓ NODE_ENV = development" -ForegroundColor Green
        }
        if ($response.bypassCheck.reasons.notOnVercel) {
            Write-Host "  ✓ Not on Vercel (local)" -ForegroundColor Green
        }
    } else {
        Write-Host "⚠️  Auth will NOT be bypassed" -ForegroundColor Yellow
        Write-Host "All conditions false - auth required" -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   META CREDENTIALS" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    
    if ($response.meta.META_ACCESS_TOKEN -like "SET*") {
        Write-Host "✅ META_ACCESS_TOKEN:     $($response.meta.META_ACCESS_TOKEN)" -ForegroundColor Green
    } else {
        Write-Host "❌ META_ACCESS_TOKEN:     NOT SET" -ForegroundColor Red
    }
    
    if ($response.meta.META_PHONE_NUMBER_ID -ne "NOT SET") {
        Write-Host "✅ META_PHONE_NUMBER_ID:  $($response.meta.META_PHONE_NUMBER_ID)" -ForegroundColor Green
    } else {
        Write-Host "❌ META_PHONE_NUMBER_ID:  NOT SET" -ForegroundColor Red
    }
    
    if ($response.meta.META_WABA_ID -ne "NOT SET") {
        Write-Host "✅ META_WABA_ID:          $($response.meta.META_WABA_ID)" -ForegroundColor Green
    } else {
        Write-Host "❌ META_WABA_ID:          NOT SET" -ForegroundColor Red
    }
    

    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "   NEXT STEPS" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    
    $allGood = $true
    
    if (-not $response.bypassCheck.shouldBypass) {
        Write-Host "⚠️  Add to .env.local:" -ForegroundColor Yellow
        Write-Host "   NODE_ENV=development" -ForegroundColor White
        Write-Host "   NEXT_PUBLIC_BYPASS_AUTH=true" -ForegroundColor White
        $allGood = $false
    }
    
    if ($response.meta.META_ACCESS_TOKEN -eq "NOT SET") {
        Write-Host "❌ Missing META_ACCESS_TOKEN" -ForegroundColor Red
        Write-Host "   Get from: Meta Developers > WhatsApp > API Setup" -ForegroundColor White
        $allGood = $false
    }
    
    if ($response.meta.META_PHONE_NUMBER_ID -eq "NOT SET") {
        Write-Host "❌ Missing META_PHONE_NUMBER_ID" -ForegroundColor Red
        Write-Host "   Get from: Meta Developers > WhatsApp > API Setup" -ForegroundColor White
        $allGood = $false
    }
    
    if ($response.meta.META_WABA_ID -eq "NOT SET") {
        Write-Host "❌ Missing META_WABA_ID" -ForegroundColor Red
        Write-Host "   Get from: Meta Developers > WhatsApp > Getting Started" -ForegroundColor White
        $allGood = $false
    }
    
    if ($allGood) {
        Write-Host "✅ Everything looks good!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Now test template sync:" -ForegroundColor Cyan
        Write-Host "1. Make sure dev server is running: npm run dev" -ForegroundColor White
        Write-Host "2. Visit: $baseUrl/whatsapp-admin/templates" -ForegroundColor White
        Write-Host "3. Click 'Sync from Meta' button" -ForegroundColor White
        Write-Host "4. Check terminal for debug logs" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "📝 After adding missing variables:" -ForegroundColor Yellow
        Write-Host "1. Stop dev server (Ctrl+C)" -ForegroundColor White
        Write-Host "2. Restart: npm run dev" -ForegroundColor White
        Write-Host "3. Run this script again to verify" -ForegroundColor White
    }
    
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   ERROR" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Failed to connect to: $baseUrl" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure:" -ForegroundColor Yellow
    Write-Host "1. Dev server is running (npm run dev)" -ForegroundColor White
    Write-Host "2. Server is accessible at $baseUrl" -ForegroundColor White
    Write-Host ""
    Write-Host "Error details:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}
