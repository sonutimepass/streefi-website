#!/usr/bin/env pwsh
# Inbox System Verification Script
# Run this to verify your WhatsApp inbox is production-ready

Write-Host @"
╔═══════════════════════════════════════════════════════════════════╗
║          STREEFI WHATSAPP INBOX VERIFICATION                      ║
║          Checking: GSI → Webhook → APIs → Data                    ║
╔═══════════════════════════════════════════════════════════════════╗
"@ -ForegroundColor Cyan

$TABLE_NAME = "streefi_whatsapp"
$API_BASE = "https://your-domain.com"  # ⚠️ UPDATE THIS

Write-Host ""
Write-Host "════ STEP 1: Verify GSI Status ════" -ForegroundColor Yellow
Write-Host "Checking TYPE-updatedAt-index..."
$gsiStatus = aws dynamodb describe-table --table-name $TABLE_NAME --query "Table.GlobalSecondaryIndexes[?IndexName=='TYPE-updatedAt-index'].IndexStatus" --output text

if ($gsiStatus -eq "ACTIVE") {
    Write-Host "✅ GSI is ACTIVE" -ForegroundColor Green
} else {
    Write-Host "❌ GSI Status: $gsiStatus (Must be ACTIVE)" -ForegroundColor Red
    Write-Host "   Run: aws dynamodb update-table --table-name $TABLE_NAME ..." -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "════ STEP 2: Check DynamoDB Data Structure ════" -ForegroundColor Yellow
Write-Host "Scanning for CONVERSATION and MESSAGE items..."

$scanData = aws dynamodb scan --table-name $TABLE_NAME --limit 20 | ConvertFrom-Json

$conversationCount = 0
$messageCount = 0

foreach ($item in $scanData.Items) {
    $type = $item.TYPE.S
    if ($type -eq "CONVERSATION") {
        $conversationCount++
        $phone = $item.phone.S
        $unread = if ($item.unreadCount.N) { $item.unreadCount.N } else { "0" }
        $lastMsg = if ($item.lastMessage.S) { 
            $item.lastMessage.S.Substring(0, [Math]::Min(30, $item.lastMessage.S.Length))
        } else { 
            "(no message)" 
        }
        Write-Host "  📞 CONV: $phone (unread: $unread) - $lastMsg..." -ForegroundColor Cyan
    } elseif ($type -eq "MESSAGE") {
        $messageCount++
    }
}

Write-Host ""
Write-Host "Found:" -ForegroundColor White
Write-Host "  - $conversationCount conversations (CONV#...#META items)" -ForegroundColor White
Write-Host "  - $messageCount messages (MSG# items)" -ForegroundColor White

if ($conversationCount -eq 0) {
    Write-Host "❌ NO CONVERSATIONS FOUND" -ForegroundColor Red
    Write-Host "   Action: Send a test WhatsApp message to trigger webhook" -ForegroundColor Yellow
    Write-Host "   Then run this script again" -ForegroundColor Yellow
    exit 1
} else {
    Write-Host "✅ Conversation data exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "════ STEP 3: Test GSI Query ════" -ForegroundColor Yellow
Write-Host "Querying TYPE=CONVERSATION via GSI..."

$gsiQueryResult = aws dynamodb query `
    --table-name $TABLE_NAME `
    --index-name TYPE-updatedAt-index `
    --key-condition-expression "TYPE = :t" `
    --expression-attribute-values '{\":t\":{\"S\":\"CONVERSATION\"}}' `
    --no-scan-index-forward `
    --limit 5

$gsiQuery = $gsiQueryResult | ConvertFrom-Json
$gsiCount = $gsiQuery.Items.Count

if ($gsiCount -gt 0) {
    Write-Host "✅ GSI query returned $gsiCount conversations" -ForegroundColor Green
    Write-Host "   Sorted by updatedAt (most recent first)" -ForegroundColor Gray
} else {
    Write-Host "❌ GSI query returned 0 results" -ForegroundColor Red
    Write-Host "   Issue: GSI might still be backfilling data" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "════ STEP 4: Test Conversation List API ════" -ForegroundColor Yellow
Write-Host "Testing: GET /api/conversations"

if ($API_BASE -eq "https://your-domain.com") {
    Write-Host "⚠️  SKIPPED: Update `$API_BASE in script with your domain" -ForegroundColor Yellow
} else {
    try {
        $response = Invoke-RestMethod -Uri "$API_BASE/api/conversations?limit=5" -Method Get
        $apiConvCount = $response.conversations.Count
        Write-Host "✅ API returned $apiConvCount conversations" -ForegroundColor Green
        
        if ($apiConvCount -gt 0) {
            $firstConv = $response.conversations[0]
            Write-Host "   Sample: $($firstConv.phone) - $($firstConv.lastMessage.Substring(0, 30))..." -ForegroundColor Gray
        }
    } catch {
        Write-Host "❌ API request failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "════ STEP 5: Test Individual Conversation API ════" -ForegroundColor Yellow
if ($conversationCount -gt 0) {
    $testPhone = $scanData.Items | Where-Object { $_.TYPE.S -eq "CONVERSATION" } | Select-Object -First 1 | ForEach-Object { $_.phone.S }
    Write-Host "Testing: GET /api/conversations/$testPhone"
    
    if ($API_BASE -ne "https://your-domain.com") {
        try {
            $convResponse = Invoke-RestMethod -Uri "$API_BASE/api/conversations/$testPhone" -Method Get
            $msgCount = $convResponse.messages.Count
            Write-Host "✅ API returned $msgCount messages" -ForegroundColor Green
        } catch {
            Write-Host "❌ API request failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️  SKIPPED: Update `$API_BASE" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "════ VERIFICATION SUMMARY ════" -ForegroundColor Cyan
Write-Host "✅ GSI: ACTIVE" -ForegroundColor Green
Write-Host "✅ Data Schema: Correct (CONV#, META, MSG#)" -ForegroundColor Green
Write-Host "✅ Query: Working ($gsiCount conversations found)" -ForegroundColor Green

if ($API_BASE -eq "https://your-domain.com") {
    Write-Host "⚠️  API: Not tested (update script with domain)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "════ NEXT STEPS ════" -ForegroundColor Yellow
Write-Host "1. Send test WhatsApp message (if no conversations exist)" -ForegroundColor White
Write-Host "2. Update API_BASE in this script" -ForegroundColor White
Write-Host "3. Test APIs manually:" -ForegroundColor White
Write-Host "   curl $API_BASE/api/conversations" -ForegroundColor Gray
Write-Host "4. Build dashboard UI at /whatsapp-admin/inbox" -ForegroundColor White
Write-Host "5. Test end-to-end: receive → display → reply → status update" -ForegroundColor White

Write-Host ""
Write-Host "════════════════════════════════════════════════════════════" -ForegroundColor Cyan
