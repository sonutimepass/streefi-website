# Test Graph API Setup
# This script validates your Meta Graph API configuration

$ErrorActionPreference = "Stop"

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   Meta Graph API Setup Validator" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Get base URL
$baseUrl = Read-Host "Enter your app URL (e.g., https://yourdomain.com or http://localhost:3000)"
$baseUrl = $baseUrl.TrimEnd('/')

Write-Host ""
Write-Host "Testing endpoint: $baseUrl/api/whatsapp-admin/validate-setup" -ForegroundColor Yellow
Write-Host ""

try {
    # Test the validate-setup endpoint
    Write-Host "1. Checking environment variables..." -ForegroundColor Cyan
    $response = Invoke-RestMethod -Uri "$baseUrl/api/whatsapp-admin/validate-setup" -Method GET
    
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "   ENVIRONMENT VARIABLES" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    
    if ($response.envVariables) {
        foreach ($key in $response.envVariables.PSObject.Properties.Name) {
            $value = $response.envVariables.$key
            if ($value -eq $true) {
                Write-Host "✅ $key : SET" -ForegroundColor Green
            } else {
                Write-Host "❌ $key : MISSING" -ForegroundColor Red
            }
        }
    }
    
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "   GRAPH API CONNECTION" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    
    if ($response.graphApiConnection) {
        if ($response.graphApiConnection.success) {
            Write-Host "✅ Connection: SUCCESS" -ForegroundColor Green
            Write-Host "📱 Phone Number: $($response.graphApiConnection.phoneNumber)" -ForegroundColor Cyan
            if ($response.graphApiConnection.displayName) {
                Write-Host "🏢 Display Name: $($response.graphApiConnection.displayName)" -ForegroundColor Cyan
            }
            if ($response.graphApiConnection.verifiedName) {
                Write-Host "✓ Verified Name: $($response.graphApiConnection.verifiedName)" -ForegroundColor Cyan
            }
            if ($response.graphApiConnection.qualityRating) {
                Write-Host "⭐ Quality Rating: $($response.graphApiConnection.qualityRating)" -ForegroundColor Cyan
            }
        } else {
            Write-Host "❌ Connection: FAILED" -ForegroundColor Red
            if ($response.graphApiConnection.error) {
                Write-Host "   Error: $($response.graphApiConnection.error)" -ForegroundColor Red
            }
        }
    }
    
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Green
    Write-Host "   SUMMARY" -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
    
    if ($response.graphApiConnection.success -and 
        $response.envVariables.META_ACCESS_TOKEN -and 
        $response.envVariables.META_PHONE_NUMBER_ID) {
        Write-Host "✅ Graph API is configured correctly!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Sync templates: $baseUrl/whatsapp-admin/templates" -ForegroundColor White
        Write-Host "2. Send test message: $baseUrl/whatsapp-admin/send" -ForegroundColor White
        Write-Host "3. Check account health: $baseUrl/whatsapp-admin/account-health" -ForegroundColor White
    } else {
        Write-Host "⚠️  Configuration incomplete" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Missing items:" -ForegroundColor Yellow
        if (-not $response.envVariables.META_ACCESS_TOKEN) {
            Write-Host "- Set META_ACCESS_TOKEN environment variable" -ForegroundColor Red
        }
        if (-not $response.envVariables.META_PHONE_NUMBER_ID) {
            Write-Host "- Set META_PHONE_NUMBER_ID environment variable" -ForegroundColor Red
        }
        if (-not $response.graphApiConnection.success) {
            Write-Host "- Fix Graph API connection (check token validity)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host "   ERROR" -ForegroundColor Red
    Write-Host "==================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Failed to connect to: $baseUrl" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible issues:" -ForegroundColor Yellow
    Write-Host "1. App is not running at this URL" -ForegroundColor White
    Write-Host "2. /api/whatsapp-admin/validate-setup endpoint doesn't exist" -ForegroundColor White
    Write-Host "3. CORS or network issues" -ForegroundColor White
    Write-Host ""
    Write-Host "Error details:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "For detailed setup instructions, see:" -ForegroundColor Cyan
Write-Host "docs/GRAPH-API-DASHBOARD-SETUP.md" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
