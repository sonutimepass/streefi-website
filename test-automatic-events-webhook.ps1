# Test Automatic Events Webhook
# 
# This script tests different automatic events webhook formats

Write-Host "🧪 Testing Automatic Events Webhook Handler" -ForegroundColor Cyan
Write-Host ""

# Test 1: Click tracking event
Write-Host "Test 1: Click tracking event" -ForegroundColor Yellow
$webhook1 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "1232406501851826"
      changes = @(
        @{
          value = @{
            event_type = "CLICK"
            from = "16315551190"
            timestamp = [string][int](Get-Date -UFormat %s)
            event_data = @{
              url = "https://example.com/product/123"
              button_text = "View Product"
            }
          }
          field = "automatic_events"
        }
      )
    }
  )
} | ConvertTo-Json -Depth 10

try {
  $response1 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp" `
    -Method POST `
    -Body $webhook1 `
    -ContentType "application/json" `
    -ErrorAction Stop
  Write-Host "✅ Test 1 passed" -ForegroundColor Green
} catch {
  Write-Host "❌ Test 1 failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---"
Write-Host ""

# Test 2: Conversion event with value
Write-Host "Test 2: Conversion tracking event" -ForegroundColor Yellow
$webhook2 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "1232406501851826"
      changes = @(
        @{
          value = @{
            event_type = "CONVERSION"
            phone_number = "16315551191"
            timestamp = [string][int](Get-Date -UFormat %s)
            conversion = @{
              event_name = "Purchase"
              value = 99.99
              currency = "USD"
            }
            event_data = @{
              product_id = "PROD-123"
              quantity = 2
            }
          }
          field = "automatic_events"
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

# Test 3: Event with user object
Write-Host "Test 3: Event with user object" -ForegroundColor Yellow
$webhook3 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "1232406501851826"
      changes = @(
        @{
          value = @{
            event_type = "VIEW"
            user = @{
              wa_id = "16315551192"
              phone_number = "16315551192"
            }
            timestamp = [string][int](Get-Date -UFormat %s)
            event_data = @{
              page = "product_catalog"
              duration_seconds = 45
            }
          }
          field = "automatic_events"
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

# Test 4: Event with wa_id field
Write-Host "Test 4: Event with wa_id directly" -ForegroundColor Yellow
$webhook4 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "1232406501851826"
      changes = @(
        @{
          value = @{
            event_type = "ADD_TO_CART"
            wa_id = "16315551193"
            timestamp = [string][int](Get-Date -UFormat %s)
            event_data = @{
              product_id = "PROD-456"
              price = 49.99
            }
          }
          field = "automatic_events"
        }
      )
    }
  )
} | ConvertTo-Json -Depth 10

try {
  $response4 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp" `
    -Method POST `
    -Body $webhook4 `
    -ContentType "application/json" `
    -ErrorAction Stop
  Write-Host "✅ Test 4 passed" -ForegroundColor Green
} catch {
  Write-Host "❌ Test 4 failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---"
Write-Host ""

# Test 5: Event with minimal data (should show "Unknown" but not error)
Write-Host "Test 5: Minimal event (no user identifier)" -ForegroundColor Yellow
$webhook5 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "1232406501851826"
      changes = @(
        @{
          value = @{
            event_type = "IMPRESSION"
            timestamp = [string][int](Get-Date -UFormat %s)
            event_data = @{
              campaign_id = "CAMP-789"
            }
          }
          field = "automatic_events"
        }
      )
    }
  )
} | ConvertTo-Json -Depth 10

try {
  $response5 = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp" `
    -Method POST `
    -Body $webhook5 `
    -ContentType "application/json" `
    -ErrorAction Stop
  Write-Host "✅ Test 5 passed (should show 'Unknown' user)" -ForegroundColor Green
} catch {
  Write-Host "❌ Test 5 failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---"
Write-Host ""
Write-Host "🎉 All tests completed!" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Check your server logs for detailed output" -ForegroundColor Gray
Write-Host "   Look for '📊 Automatic events webhook received'" -ForegroundColor Gray
