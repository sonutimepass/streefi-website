# Step 9: Create GSI3-MessagesByCampaign for campaign message analytics
# 
# Purpose: Query all messages sent in a specific campaign
# Pattern: GSI3PK='{campaignId}', GSI3SK='{timestamp}'
# 
# Query example:
#   GSI3PK = 'campaign_123' 
#   Order: ASC (chronological message history)

Write-Host "🚀 Creating GSI3-MessagesByCampaign index..." -ForegroundColor Green
Write-Host ""
Write-Host "📊 Index Details:" -ForegroundColor Cyan
Write-Host "   • GSI3PK: '{campaignId}' (partition by campaign)" -ForegroundColor White
Write-Host "   • GSI3SK: '{timestamp}' (sort chronologically)" -ForegroundColor White
Write-Host "   • Projection: ALL (include all attributes)" -ForegroundColor White
Write-Host ""

$gsiUpdate = @"
[{
  "Create": {
    "IndexName": "GSI3-MessagesByCampaign",
    "KeySchema": [
      {"AttributeName": "GSI3PK", "KeyType": "HASH"},
      {"AttributeName": "GSI3SK", "KeyType": "RANGE"}
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
  --table-name streefi_campaigns `
  --attribute-definitions AttributeName=GSI3PK,AttributeType=S AttributeName=GSI3SK,AttributeType=S `
  --global-secondary-index-updates $gsiUpdate

Write-Host ""
Write-Host "✅ GSI3-MessagesByCampaign creation initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "⏳ Index Status: CREATING (takes ~5-10 minutes)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Check status with:" -ForegroundColor Cyan
Write-Host "  aws dynamodb describe-table --table-name streefi_campaigns --query 'Table.GlobalSecondaryIndexes[?IndexName==``GSI3-MessagesByCampaign``].IndexStatus'" -ForegroundColor White
Write-Host ""
Write-Host "When status = ACTIVE, run test:" -ForegroundColor Cyan
Write-Host "  npx tsx scripts/test-gsi3-messages-by-campaign.ts" -ForegroundColor White
