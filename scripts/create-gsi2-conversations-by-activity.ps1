# Step 8: Create GSI2-ConversationsByActivity for efficient conversation queries
# 
# Purpose: Query active conversations sorted by most recent activity
# Pattern: GSI2PK='CONVERSATION', GSI2SK='{status}#{timestamp}'
# 
# Query example:
#   GSI2PK = 'CONVERSATION' AND begins_with(GSI2SK, 'active#')
#   Order: DESC (most recent first)

Write-Host "🚀 Creating GSI2-ConversationsByActivity index..." -ForegroundColor Green
Write-Host ""
Write-Host "📊 Index Details:" -ForegroundColor Cyan
Write-Host "   • GSI2PK: 'CONVERSATION' (constant for all conversations)" -ForegroundColor White
Write-Host "   • GSI2SK: '{status}#{timestamp}' (enables status filter + time sort)" -ForegroundColor White
Write-Host "   • Projection: ALL (include all attributes)" -ForegroundColor White
Write-Host ""

$gsiUpdate = @"
[{
  "Create": {
    "IndexName": "GSI2-ConversationsByActivity",
    "KeySchema": [
      {"AttributeName": "GSI2PK", "KeyType": "HASH"},
      {"AttributeName": "GSI2SK", "KeyType": "RANGE"}
    ],
    "Projection": {"ProjectionType": "ALL"},
    "ProvisionedThroughput": {
      "ReadCapacityUnits": 5,
      "WriteCapacityUnits": 5
    }
  }
}]
"@

aws dynamodb update-table `
  --table-name whatsapp_conversations `
  --attribute-definitions AttributeName=GSI2PK,AttributeType=S AttributeName=GSI2SK,AttributeType=S `
  --global-secondary-index-updates $gsiUpdate

Write-Host ""
Write-Host "✅ GSI2-ConversationsByActivity creation initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "⏳ Index Status: CREATING (takes ~5-10 minutes)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Check status with:" -ForegroundColor Cyan
Write-Host "  aws dynamodb describe-table --table-name whatsapp_conversations --query 'Table.GlobalSecondaryIndexes[?IndexName==``GSI2-ConversationsByActivity``].IndexStatus'" -ForegroundColor White
Write-Host ""
Write-Host "When status = ACTIVE, run test:" -ForegroundColor Cyan
Write-Host "  npx tsx scripts/test-gsi2-conversations-by-activity.ts" -ForegroundColor White
