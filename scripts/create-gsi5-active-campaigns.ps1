# Step 11: Create GSI5-ActiveCampaigns for campaign dispatcher queries
# 
# Purpose: Query campaigns by status for campaign dispatcher to pick up scheduled/running campaigns
# Pattern: GSI5PK='CAMPAIGN_STATUS', GSI5SK='{status}#{scheduledAt}'
# 
# Query examples:
#   1. All scheduled campaigns: GSI5PK = 'CAMPAIGN_STATUS' AND begins_with(GSI5SK, 'SCHEDULED#')
#   2. All running campaigns: GSI5PK = 'CAMPAIGN_STATUS' AND begins_with(GSI5SK, 'RUNNING#')

Write-Host "🚀 Creating GSI5-ActiveCampaigns index..." -ForegroundColor Green
Write-Host ""
Write-Host "📊 Index Details:" -ForegroundColor Cyan
Write-Host "   • GSI5PK: 'CAMPAIGN_STATUS' (constant for all campaigns)" -ForegroundColor White
Write-Host "   • GSI5SK: '{status}#{scheduledAt}' (enables status filter + time sort)" -ForegroundColor White
Write-Host "   • Projection: ALL (include all attributes)" -ForegroundColor White
Write-Host ""

$gsiUpdate = @"
[{
  "Create": {
    "IndexName": "GSI5-ActiveCampaigns",
    "KeySchema": [
      {"AttributeName": "GSI5PK", "KeyType": "HASH"},
      {"AttributeName": "GSI5SK", "KeyType": "RANGE"}
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
  --attribute-definitions AttributeName=GSI5PK,AttributeType=S AttributeName=GSI5SK,AttributeType=S `
  --global-secondary-index-updates $gsiUpdate

Write-Host ""
Write-Host "✅ GSI5-ActiveCampaigns creation initiated!" -ForegroundColor Green
Write-Host ""
Write-Host "⏳ Index Status: CREATING (takes ~5-10 minutes)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Check status with:" -ForegroundColor Cyan
Write-Host "  aws dynamodb describe-table --table-name streefi_campaigns --query 'Table.GlobalSecondaryIndexes[?IndexName==``GSI5-ActiveCampaigns``].IndexStatus'" -ForegroundColor White
Write-Host ""
Write-Host "When status = ACTIVE, run test:" -ForegroundColor Cyan
Write-Host "  npx tsx scripts/test-gsi5-active-campaigns.ts" -ForegroundColor White
