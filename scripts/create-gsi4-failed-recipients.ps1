# Step 10: Create GSI4-FailedRecipients for global failed recipient queries
# 
# Purpose: Query all failed recipients across ALL campaigns for retry logic
# Pattern: GSI4PK='RECIPIENT_STATUS', GSI4SK='FAILED#{campaignId}#{timestamp}'
# 
# Query examples:
#   1. All failed recipients: GSI4PK = 'RECIPIENT_STATUS'
#   2. Failed for specific campaign: GSI4PK = 'RECIPIENT_STATUS' AND begins_with(GSI4SK, 'FAILED#campaign_123#')

Write-Host "🚀 Creating GSI4-FailedRecipients index..." -ForegroundColor Green
Write-Host ""
Write-Host "📊 Index Details:" -ForegroundColor Cyan
Write-Host "   • GSI4PK: 'RECIPIENT_STATUS' (constant for all failed recipients)" -ForegroundColor White
Write-Host "   • GSI4SK: 'FAILED#{campaignId}#{timestamp}' (enables filtering and sorting)" -ForegroundColor White
Write-Host "   • Projection: ALL (include all attributes)" -ForegroundColor White
Write-Host ""

$gsiUpdate = @"
[{
  "Create": {
    "IndexName": "GSI4-FailedRecipients",
    "KeySchema": [
      {"AttributeName": "GSI4PK", "KeyType": "HASH"},
      {"AttributeName": "GSI4SK", "KeyType": "RANGE"}
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
  --table-name streefi_campaign_recipients `
  --attribute-definitions AttributeName=GSI4PK,AttributeType=S AttributeName=GSI4SK,AttributeType=S `
  --global-secondary-index-updates $gsiUpdate

Write-Host ""
Write-Host "✅ GSI4-FailedRecipients creation initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "⏳ Index Status: CREATING (takes ~5-10 minutes)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Check status with:" -ForegroundColor Cyan
Write-Host "  aws dynamodb describe-table --table-name streefi_campaign_recipients --query 'Table.GlobalSecondaryIndexes[?IndexName==``GSI4-FailedRecipients``].IndexStatus'" -ForegroundColor White
Write-Host ""
Write-Host "When status = ACTIVE, run test:" -ForegroundColor Cyan
Write-Host "  npx tsx scripts/test-gsi4-failed-recipients.ts" -ForegroundColor White
