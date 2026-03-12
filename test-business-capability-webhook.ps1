# Test Business Capability Update Webhook
# 
# NOTE: Meta's "sample" format in the docs is NOT the actual webhook format!
# Meta shows: {"sample": {"field": "...", "value": {...}}}
# But ACTUALLY sends: {"object": "whatsapp_business_account", "entry": [...]}

Write-Host "🧪 Testing Business Capability Update Webhook Handler" -ForegroundColor Cyan
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

# Test 1: Standard capability update (ACTUAL webhook format)
Write-Host "Test 1: Standard capability update (250/day)" -ForegroundColor Yellow

# Build the ACTUAL webhook structure that Meta sends
$webhook1 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "123456789"  # Business Account ID
      changes = @(
        @{
          field = "business_capability_update"
          value = @{
            max_daily_conversation_per_phone = 250
            max_phone_numbers_per_business = 2
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
  Write-Host "✅ Test 1 passed - Response: $($response1 | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
  Write-Host "❌ Test 1 failed: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.Exception.Response) {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Write-Host "Status Code: $statusCode" -ForegroundColor Red
    try {
      $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
      $responseText = $reader.ReadToEnd()
      Write-Host "Response body: $responseText" -ForegroundColor Red
    } catch {
      Write-Host "Could not read response body" -ForegroundColor Red
    }
  }
}

Write-Host ""
Write-Host "---"
Write-Host ""

# Test 2: Tier upgrade (higher limits)
Write-Host "Test 2: Tier upgrade to 10K" -ForegroundColor Yellow
$webhook2 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "0"
      changes = @(
        @{
          field = "business_capability_update"
          value = @{
            max_daily_conversation_per_phone = 10000
            max_phone_numbers_per_business = 10
            display_phone_number = "+16505551234"
            phone_number_id = "123456789"
          }
        }
      )
    }
  )
} | ConvertTo-Json -Depth 10

try {
  $response2 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp" `
    -Method POST `
    -Body $webhook2 `
    -ContentType "application/json" `
    -ErrorAction Stop
  Write-Host "✅ Test 2 passed" -ForegroundColor Green
} catch {
  Write-Host "❌ Test 2 failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---"
Write-Host ""

# Test 3: Premium tier (100K+)
Write-Host "Test 3: Premium tier upgrade" -ForegroundColor Yellow
$webhook3 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "0"
      changes = @(
        @{
          field = "business_capability_update"
          value = @{
            max_daily_conversation_per_phone = 100000
            max_phone_numbers_per_business = 50
            max_phone_number_quality_rating = "HIGH"
            display_phone_number = "+16505551234"
            phone_number_id = "123456789"
          }
        }
      )
    }
  )
} | ConvertTo-Json -Depth 10

try {
  $response3 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp" `
    -Method POST `
    -Body $webhook3 `
    -ContentType "application/json" `
    -ErrorAction Stop
  Write-Host "✅ Test 3 passed" -ForegroundColor Green
} catch {
  Write-Host "❌ Test 3 failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---"
Write-Host ""
Write-Host "🎉 All business capability webhook tests completed!" -ForegroundColor Green
