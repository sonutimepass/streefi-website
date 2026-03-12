#!/bin/bash

# Step 9: Create GSI3-MessagesByCampaign for campaign message analytics
# 
# Purpose: Query all messages sent in a specific campaign
# Pattern: GSI3PK='{campaignId}', GSI3SK='{timestamp}'
# 
# Query example:
#   GSI3PK = 'campaign_123' 
#   Order: ASC (chronological message history)

echo "🚀 Creating GSI3-MessagesByCampaign index..."
echo ""
echo "📊 Index Details:"
echo "   • GSI3PK: '{campaignId}' (partition by campaign)"
echo "   • GSI3SK: '{timestamp}' (sort chronologically)"
echo "   • Projection: ALL (include all attributes)"
echo ""

aws dynamodb update-table \
  --table-name streefi_campaigns \
  --attribute-definitions \
    AttributeName=GSI3PK,AttributeType=S \
    AttributeName=GSI3SK,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{
      \"IndexName\":\"GSI3-MessagesByCampaign\",
      \"KeySchema\":[
        {\"AttributeName\":\"GSI3PK\",\"KeyType\":\"HASH\"},
        {\"AttributeName\":\"GSI3SK\",\"KeyType\":\"RANGE\"}
      ],
      \"Projection\":{\"ProjectionType\":\"ALL\"},
      \"ProvisionedThroughput\":{
        \"ReadCapacityUnits\":5,
        \"WriteCapacityUnits\":5
      }
    }}]"

echo ""
echo "✅ GSI3-MessagesByCampaign creation initiated!"
echo ""
echo "⏳ Index Status: CREATING (takes ~5-10 minutes)"
echo ""
echo "Check status with:"
echo "  aws dynamodb describe-table --table-name streefi_campaigns --query 'Table.GlobalSecondaryIndexes[?IndexName==\`GSI3-MessagesByCampaign\`].IndexStatus'"
echo ""
echo "When status = ACTIVE, run test:"
echo "  npx tsx scripts/test-gsi3-messages-by-campaign.ts"
