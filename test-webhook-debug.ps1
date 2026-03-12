# Debug Webhook Endpoint
# Simple diagnostic script to test webhook connectivity

Write-Host "🔍 Webhook Endpoint Diagnostic Test" -ForegroundColor Cyan
Write-Host ""

# Test 1: Check if server is running
Write-Host "Test 1: Server connectivity" -ForegroundColor Yellow
try {
  $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 3 -ErrorAction Stop
  Write-Host "✅ Server is reachable (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
  Write-Host "❌ Server is NOT reachable" -ForegroundColor Red
  Write-Host "   Make sure you've started the dev server: npm run dev" -ForegroundColor Yellow
  exit 1
}
Write-Host ""

# Test 2: Minimal valid webhook payload
Write-Host "Test 2: Minimal webhook payload" -ForegroundColor Yellow
$minimalWebhook = @{
  object = "whatsapp_business_account"
  entry = @(
    @{
      id = "test_entry_123"
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

$json = $minimalWebhook | ConvertTo-Json -Depth 10
Write-Host "Payload:" -ForegroundColor Gray
Write-Host $json -ForegroundColor DarkGray
Write-Host ""

try {
  $headers = @{
    "Content-Type" = "application/json"
  }
  
  $response = Invoke-WebRequest `
    -Uri "http://localhost:3000/api/whatsapp" `
    -Method POST `
    -Body $json `
    -Headers $headers `
    -ErrorAction Stop
    
  Write-Host "✅ Webhook accepted (Status: $($response.StatusCode))" -ForegroundColor Green
  Write-Host "Response: $($response.Content)" -ForegroundColor Green
  Write-Host ""
  Write-Host "✅ Check your dev server console for handler logs!" -ForegroundColor Cyan
  Write-Host "   You should see:" -ForegroundColor Yellow
  Write-Host "   [Webhook:xxxxx] Event received:" -ForegroundColor Gray
  Write-Host "   [Webhook:xxxxx] Field: business_capability_update" -ForegroundColor Gray
  Write-Host "   [Router] Routing to business capability handler" -ForegroundColor Gray
  Write-Host "   ⚙️ Business capability update webhook received" -ForegroundColor Gray
  
} catch {
  Write-Host "❌ Webhook REJECTED (Status: $($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
  Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
  
  if ($_.Exception.Response) {
    try {
      $reader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
      $responseText = $reader.ReadToEnd()
      Write-Host "Response body: $responseText" -ForegroundColor Red
    } catch {}
  }
  
  Write-Host ""
  Write-Host "💡 Common issues:" -ForegroundColor Yellow
  Write-Host "   1. Server not running: npm run dev" -ForegroundColor Gray
  Write-Host "   2. Wrong port (check if it's actually 3000)" -ForegroundColor Gray
  Write-Host "   3. Build cache issue: delete .next folder and restart" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Cyan
