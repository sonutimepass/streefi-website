# WhatsApp Webhook Testing Script
# Usage: .\test-webhook.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  WhatsApp Webhook Testing Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
# For local testing:
# $webhookUrl = "http://localhost:3000/api/whatsapp"

# For ngrok testing:
$webhookUrl = "https://johnathon-interacademic-awhile.ngrok-free.dev/api/whatsapp"

Write-Host "🎯 Target URL: $webhookUrl" -ForegroundColor Yellow
Write-Host ""

# Test 1: Webhook Verification (GET)
Write-Host "Test 1: Webhook Verification (GET)" -ForegroundColor Green
Write-Host "--------------------------------------" -ForegroundColor Gray

$verifyToken = "streefi_sonu_bodat_07"
$verifyUrl = "$webhookUrl`?hub.mode=subscribe&hub.verify_token=$verifyToken&hub.challenge=test_challenge_123"

Write-Host "📤 Sending GET request..."
try {
    $response = Invoke-WebRequest -Uri $verifyUrl -Method Get -UseBasicParsing
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "📥 Response: $($response.Content)"
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""

# Test 2: Incoming Message Webhook (POST)
Write-Host "Test 2: Incoming Message Webhook (POST)" -ForegroundColor Green
Write-Host "--------------------------------------" -ForegroundColor Gray

$webhookPayload = @{
    object = "whatsapp_business_account"
    entry = @(
        @{
            id = "123456789"
            changes = @(
                @{
                    field = "messages"
                    value = @{
                        messaging_product = "whatsapp"
                        metadata = @{
                            display_phone_number = "15551234567"
                            phone_number_id = "123456789"
                        }
                        contacts = @(
                            @{
                                profile = @{
                                    name = "Test User"
                                }
                                wa_id = "919876543210"
                            }
                        )
                        messages = @(
                            @{
                                from = "919876543210"
                                id = "wamid.test123"
                                timestamp = "1678901234"
                                type = "text"
                                text = @{
                                    body = "Hello, this is a test message!"
                                }
                            }
                        )
                    }
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "📤 Sending POST request..."
try {
    $response = Invoke-WebRequest -Uri $webhookUrl -Method Post -Body $webhookPayload -ContentType "application/json" -UseBasicParsing
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "📥 Response: $($response.Content)"
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "📥 Response Body: $responseBody" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host ""

# Test 3: Message Status Update Webhook (POST)
Write-Host "Test 3: Message Status Update Webhook (POST)" -ForegroundColor Green
Write-Host "--------------------------------------" -ForegroundColor Gray

$statusPayload = @{
    object = "whatsapp_business_account"
    entry = @(
        @{
            id = "123456789"
            changes = @(
                @{
                    field = "messages"
                    value = @{
                        messaging_product = "whatsapp"
                        metadata = @{
                            display_phone_number = "15551234567"
                            phone_number_id = "123456789"
                        }
                        statuses = @(
                            @{
                                id = "wamid.test123"
                                status = "delivered"
                                timestamp = "1678901234"
                                recipient_id = "919876543210"
                            }
                        )
                    }
                }
            )
        }
    )
} | ConvertTo-Json -Depth 10

Write-Host "📤 Sending POST request..."
try {
    $response = Invoke-WebRequest -Uri $webhookUrl -Method Post -Body $statusPayload -ContentType "application/json" -UseBasicParsing
    Write-Host "✅ Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "📥 Response: $($response.Content)"
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Testing Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Check your Next.js terminal for detailed logs"
Write-Host "  2. If using ngrok, check the Inspector at http://127.0.0.1:4040"
Write-Host "  3. Update the webhook URL in this script if using ngrok"
Write-Host ""
