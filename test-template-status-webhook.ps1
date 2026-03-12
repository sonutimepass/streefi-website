# Test Template Status Update Webhook
# 
# This script tests the message_template_status_update webhook handler

Write-Host "🧪 Testing Template Status Update Webhook Handler" -ForegroundColor Cyan
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

# Test 1: Template APPROVED
Write-Host "Test 1: Template APPROVED" -ForegroundColor Yellow
$webhook1 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "123456789"
      changes = @(
        @{
          field = "message_template_status_update"
          value = @{
            event = "APPROVED"
            message_template_id = 12345678
            message_template_name = "my_message_template"
            message_template_language = "pt-BR"
            reason = $null
            message_template_category = "MARKETING"
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

# Test 2: Template REJECTED (with reason)
Write-Host "Test 2: Template REJECTED" -ForegroundColor Yellow
$webhook2 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "123456789"
      changes = @(
        @{
          field = "message_template_status_update"
          value = @{
            event = "REJECTED"
            message_template_id = 87654321
            message_template_name = "invalid_template"
            message_template_language = "en_US"
            reason = "Template does not comply with WhatsApp policies"
            message_template_category = "UTILITY"
          }
        }
      )
    }
  )
}

$jsonPayload2 = $webhook2 | ConvertTo-Json -Depth 10
try {
  $response2 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp" `
    -Method POST `
    -Body $jsonPayload2 `
    -ContentType "application/json; charset=utf-8" `
    -ErrorAction Stop
  Write-Host "✅ Test 2 passed" -ForegroundColor Green
} catch {
  Write-Host "❌ Test 2 failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---"
Write-Host ""

# Test 3: Template PAUSED
Write-Host "Test 3: Template PAUSED" -ForegroundColor Yellow
$webhook3 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "123456789"
      changes = @(
        @{
          field = "message_template_status_update"
          value = @{
            event = "PAUSED"
            message_template_id = 11122233
            message_template_name = "paused_template"
            message_template_language = "en"
            reason = "Quality score dropped below threshold"
            message_template_category = "MARKETING"
          }
        }
      )
    }
  )
}

$jsonPayload3 = $webhook3 | ConvertTo-Json -Depth 10
try {
  $response3 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp" `
    -Method POST `
    -Body $jsonPayload3 `
    -ContentType "application/json; charset=utf-8" `
    -ErrorAction Stop
  Write-Host "✅ Test 3 passed" -ForegroundColor Green
} catch {
  Write-Host "❌ Test 3 failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---"
Write-Host ""
Write-Host "🎉 All template status webhook tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Check your dev server console for the handler logs:" -ForegroundColor Cyan
Write-Host "   📋 Template status update webhook received" -ForegroundColor Gray
Write-Host "   📋 Template: my_message_template" -ForegroundColor Gray
Write-Host "   ✅ Template APPROVED: ..." -ForegroundColor Gray
