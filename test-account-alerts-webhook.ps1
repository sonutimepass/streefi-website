# Test Account Alerts Webhook
# 
# This script tests the account_alerts webhook handler

Write-Host "🧪 Testing Account Alerts Webhook Handler" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
Write-Host "⏳ Checking if dev server is running..." -ForegroundColor Yellow
try {
  $null = Invoke-RestMethod -Uri "http://localhost:3000" -Method GET -TimeoutSec 3 -ErrorAction Stop
  Write-Host "✅ Server is running" -ForegroundColor Green
} catch {
  Write-Host "❌ Server is NOT running. Please start it with: npm run dev" -ForegroundColor Red
  exit 1
}
Write-Host ""

# Test 1: INFORMATIONAL Alert (OBA_APPROVED)
Write-Host "Test 1: INFORMATIONAL Alert - OBA Approved" -ForegroundColor Yellow
$webhook1 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "123456789"
      changes = @(
        @{
          field = "account_alerts"
          value = @{
            entity_type = "WABA"
            entity_id = 123456
            alert_severity = "INFORMATIONAL"
            alert_status = "NONE"
            alert_type = "OBA_APPROVED"
            alert_description = "Your Official Business Account has been approved"
          }
        }
      )
    }
  )
}

$jsonPayload = $webhook1 | ConvertTo-Json -Depth 10
Write-Host "Sending payload:" -ForegroundColor Gray
Write-Host $jsonPayload -ForegroundColor DarkGray
Write-Host ""

try {
  $response1 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp" `
    -Method POST `
    -Body $jsonPayload `
    -ContentType "application/json; charset=utf-8" `
    -ErrorAction Stop
  Write-Host "✅ Test 1 passed" -ForegroundColor Green
} catch {
  Write-Host "❌ Test 1 failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---"
Write-Host ""

# Test 2: HIGH SEVERITY Alert - Rate Limit Warning
Write-Host "Test 2: HIGH Severity Alert - Rate Limit Warning" -ForegroundColor Yellow
$webhook2 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "123456789"
      changes = @(
        @{
          field = "account_alerts"
          value = @{
            entity_type = "WABA"
            entity_id = 123456
            alert_severity = "HIGH"
            alert_status = "ACTIVE"
            alert_type = "RATE_LIMIT_WARNING"
            alert_description = "You are approaching your messaging rate limit. Please reduce sending rate."
            alert_id = "alert_12345_67890"
          }
        }
      )
    }
  )
}

$jsonPayload = $webhook2 | ConvertTo-Json -Depth 10
Write-Host "Sending payload:" -ForegroundColor Gray
Write-Host $jsonPayload -ForegroundColor DarkGray
Write-Host ""

try {
  $response2 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp" `
    -Method POST `
    -Body $jsonPayload `
    -ContentType "application/json; charset=utf-8" `
    -ErrorAction Stop
  Write-Host "✅ Test 2 passed" -ForegroundColor Green
} catch {
  Write-Host "❌ Test 2 failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---"
Write-Host ""

# Test 3: CRITICAL Alert - Account Restriction
Write-Host "Test 3: CRITICAL Alert - Account Restriction" -ForegroundColor Yellow
$webhook3 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "123456789"
      changes = @(
        @{
          field = "account_alerts"
          value = @{
            entity_type = "WABA"
            entity_id = 123456
            alert_severity = "CRITICAL"
            alert_status = "ACTIVE"
            alert_type = "ACCOUNT_RESTRICTION"
            alert_description = "Your account has been restricted due to policy violations. Contact support immediately."
            alert_id = "alert_critical_99999"
          }
        }
      )
    }
  )
}

$jsonPayload = $webhook3 | ConvertTo-Json -Depth 10
Write-Host "Sending payload:" -ForegroundColor Gray
Write-Host $jsonPayload -ForegroundColor DarkGray
Write-Host ""

try {
  $response3 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp" `
    -Method POST `
    -Body $jsonPayload `
    -ContentType "application/json; charset=utf-8" `
    -ErrorAction Stop
  Write-Host "✅ Test 3 passed" -ForegroundColor Green
} catch {
  Write-Host "❌ Test 3 failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---"
Write-Host ""

# Test 4: MEDIUM Alert - Business Verification
Write-Host "Test 4: MEDIUM Alert - Business Verification" -ForegroundColor Yellow
$webhook4 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "123456789"
      changes = @(
        @{
          field = "account_alerts"
          value = @{
            entity_type = "WABA"
            entity_id = 123456
            alert_severity = "MEDIUM"
            alert_status = "PENDING"
            alert_type = "BUSINESS_VERIFICATION_PENDING"
            alert_description = "Your business verification is pending. Please complete the verification process."
          }
        }
      )
    }
  )
}

$jsonPayload = $webhook4 | ConvertTo-Json -Depth 10
Write-Host "Sending payload:" -ForegroundColor Gray
Write-Host $jsonPayload -ForegroundColor DarkGray
Write-Host ""

try {
  $response4 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp" `
    -Method POST `
    -Body $jsonPayload `
    -ContentType "application/json; charset=utf-8" `
    -ErrorAction Stop
  Write-Host "✅ Test 4 passed" -ForegroundColor Green
} catch {
  Write-Host "❌ Test 4 failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---"
Write-Host ""

Write-Host "🎉 All account alerts webhook tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Expected console output:" -ForegroundColor Cyan
Write-Host "   🚨 Account alert webhook received" -ForegroundColor Gray
Write-Host "   🚨 Account Alert [SEVERITY]: ALERT_TYPE" -ForegroundColor Gray
Write-Host "   ✅ Account alert stored in database" -ForegroundColor Gray
