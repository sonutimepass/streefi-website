# Test Delivery Status Webhook
# 
# This script tests the delivery status webhook handler
# with a sample "delivered" status payload

$webhook = @{
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
            statuses = @(
              @{
                id = "wamid.TEST_DELIVERY_" + (Get-Date -Format "yyyyMMddHHmmss")
                status = "delivered"
                timestamp = [string][int](Get-Date -UFormat %s)
                recipient_id = "917486879126"
                pricing = @{
                  billable = $false
                  pricing_model = "PMP"
                  category = "service"
                  type = "free_customer_service"
                }
                conversation = @{
                  id = "conv_" + (Get-Random -Maximum 99999)
                  origin = @{
                    type = "service"
                  }
                }
              }
            )
          }
          field = "messages"
        }
      )
    }
  )
} | ConvertTo-Json -Depth 10

Write-Host "🚀 Testing Delivery Status Webhook..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Payload:" -ForegroundColor Yellow
Write-Host $webhook -ForegroundColor Gray
Write-Host ""

try {
  $response = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp" `
    -Method POST `
    -Body $webhook `
    -ContentType "application/json" `
    -ErrorAction Stop

  Write-Host "✅ Webhook delivered successfully!" -ForegroundColor Green
  Write-Host ""
  Write-Host "Response:" -ForegroundColor Yellow
  Write-Host ($response | ConvertTo-Json) -ForegroundColor Gray
} catch {
  Write-Host "❌ Webhook failed!" -ForegroundColor Red
  Write-Host ""
  Write-Host "Error:" -ForegroundColor Yellow
  Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "---"
Write-Host ""
Write-Host "💡 Test other statuses:" -ForegroundColor Cyan
Write-Host "  • Change 'delivered' to 'sent', 'read', or 'failed'" -ForegroundColor Gray
Write-Host "  • Modify pricing.billable to `$true for paid messages" -ForegroundColor Gray
Write-Host "  • Add errors array for failed status testing" -ForegroundColor Gray
