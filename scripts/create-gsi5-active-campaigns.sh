#!/bin/bash

# Step 11: Create GSI5-ActiveCampaigns for campaign dispatcher queries
# 
# Purpose: Query campaigns by status for campaign dispatcher to pick up scheduled/running campaigns
# Pattern: GSI5PK='CAMPAIGN_STATUS', GSI5SK='{status}#{scheduledAt}'
# 
# Query examples:
#   1. All scheduled campaigns: GSI5PK = 'CAMPAIGN_STATUS' AND begins_with(GSI5SK, 'SCHEDULED#')
#   2. All running campaigns: GSI5PK = 'CAMPAIGN_STATUS' AND begins_with(GSI5SK, 'RUNNING#')

echo "🚀 Creating GSI5-ActiveCampaigns index..."
echo ""
echo "📊 Index Details:"
echo "   • GSI5PK: 'CAMPAIGN_STATUS' (constant for all campaigns)"
echo "   • GSI5SK: '{status}#{scheduledAt}' (enables status filter + time sort)"
echo "   • Projection: ALL (include all attributes)"
echo ""

aws dynamodb update-table \
  --table-name streefi_campaigns \
  --attribute-definitions \
    AttributeName=GSI5PK,AttributeType=S \
    AttributeName=GSI5SK,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{
      \"IndexName\":\"GSI5-ActiveCampaigns\",
      \"KeySchema\":[
        {\"AttributeName\":\"GSI5PK\",\"KeyType\":\"HASH\"},
        {\"AttributeName\":\"GSI5SK\",\"KeyType\":\"RANGE\"}
      ],
      \"Projection\":{\"ProjectionType\":\"ALL\"},
      \"ProvisionedThroughput\":{
        \"ReadCapacityUnits\":5,
        \"WriteCapacityUnits\":5
      }
    }}]"

echo ""
echo "✅ GSI5-ActiveCampaigns creation initiated!"
echo ""
echo "⏳ Index Status: CREATING (takes ~5-10 minutes)"
echo ""
echo "Check status with:"
echo "  aws dynamodb describe-table --table-name streefi_campaigns --query 'Table.GlobalSecondaryIndexes[?IndexName==\`GSI5-ActiveCampaigns\`].IndexStatus'"
echo ""
echo "When status = ACTIVE, run test:"
echo "  npx tsx scripts/test-gsi5-active-campaigns.ts"
