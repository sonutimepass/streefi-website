# Test User Preferences Webhook
# 
# This script tests different user preference webhook formats
# to ensure phone number extraction works in all variations

Write-Host "🧪 Testing User Preferences Webhook Handler" -ForegroundColor Cyan
Write-Host ""

# Test 1: Standard format with user_preferences array
Write-Host "Test 1: Standard format (user_preferences array)" -ForegroundColor Yellow
$webhook1 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "1232406501851826"
      changes = @(
        @{
          value = @{
            messaging_product = "whatsapp"
            metadata = @{
              display_phone_number = "15557518202"
              phone_number_id = "990969214103668"
            }
            user_preferences = @(
              @{
                wa_id = "16315551181"
                category = "marketing_messages"
                value = "stop"
                detail = "User requested to stop marketing messages"
                timestamp = [int](Get-Date -UFormat %s)
              }
            )
          }
          field = "user_preferences"
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

# Test 2: Legacy format with phone_number field
Write-Host "Test 2: Legacy format (phone_number field)" -ForegroundColor Yellow
$webhook2 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "1232406501851826"
      changes = @(
        @{
          value = @{
            phone_number = "16315551182"
            preference = "marketing"
            opt_out = $true
            event = "user_opt_out"
          }
          field = "user_preferences"
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

# Test 3: Format with user object
Write-Host "Test 3: User object format" -ForegroundColor Yellow
$webhook3 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "1232406501851826"
      changes = @(
        @{
          value = @{
            user = @{
              wa_id = "16315551183"
              phone_number = "16315551183"
            }
            preference = "notifications"
            opt_in = $true
            event = "user_opt_in"
          }
          field = "user_preferences"
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

# Test 4: Format with contacts array
Write-Host "Test 4: Contacts array format" -ForegroundColor Yellow
$webhook4 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "1232406501851826"
      changes = @(
        @{
          value = @{
            contacts = @(
              @{
                wa_id = "16315551184"
                profile = @{
                  name = "Test User"
                }
              }
            )
            preference = "all_messages"
            opt_out = $false
          }
          field = "user_preferences"
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

# Test 5: Format with from field
Write-Host "Test 5: From field format" -ForegroundColor Yellow
$webhook5 = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "1232406501851826"
      changes = @(
        @{
          value = @{
            from = "16315551185"
            preference = "service_messages"
            event = "preference_update"
          }
          field = "user_preferences"
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
  Write-Host "✅ Test 5 passed" -ForegroundColor Green
} catch {
  Write-Host "❌ Test 5 failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "---"
Write-Host ""
Write-Host "🎉 All tests completed!" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Check your server logs for detailed output" -ForegroundColor Gray
Write-Host "   Look for '[Handler] User preferences webhook received'" -ForegroundColor Gray
