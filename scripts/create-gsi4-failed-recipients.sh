#!/bin/bash

# Step 10: Create GSI4-FailedRecipients for global failed recipient queries
# 
# Purpose: Query all failed recipients across ALL campaigns for retry logic
# Pattern: GSI4PK='RECIPIENT_STATUS', GSI4SK='FAILED#{campaignId}#{timestamp}'
# 
# Query examples:
#   1. All failed recipients: GSI4PK = 'RECIPIENT_STATUS'
#   2. Failed for specific campaign: GSI4PK = 'RECIPIENT_STATUS' AND begins_with(GSI4SK, 'FAILED#campaign_123#')

echo "🚀 Creating GSI4-FailedRecipients index..."
echo ""
echo "📊 Index Details:"
echo "   • GSI4PK: 'RECIPIENT_STATUS' (constant for all failed recipients)"
echo "   • GSI4SK: 'FAILED#{campaignId}#{timestamp}' (enables filtering and sorting)"
echo "   • Projection: ALL (include all attributes)"
echo ""

aws dynamodb update-table \
  --table-name streefi_campaign_recipients \
  --attribute-definitions \
    AttributeName=GSI4PK,AttributeType=S \
    AttributeName=GSI4SK,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{
      \"IndexName\":\"GSI4-FailedRecipients\",
      \"KeySchema\":[
        {\"AttributeName\":\"GSI4PK\",\"KeyType\":\"HASH\"},
        {\"AttributeName\":\"GSI4SK\",\"KeyType\":\"RANGE\"}
      ],
      \"Projection\":{\"ProjectionType\":\"ALL\"},
      \"ProvisionedThroughput\":{
        \"ReadCapacityUnits\":5,
        \"WriteCapacityUnits\":5
      }
    }}]"

echo ""
echo "✅ GSI4-FailedRecipients creation initiated!"
echo ""
echo "⏳ Index Status: CREATING (takes ~5-10 minutes)"
echo ""
echo "Check status with:"
echo "  aws dynamodb describe-table --table-name streefi_campaign_recipients --query 'Table.GlobalSecondaryIndexes[?IndexName==\`GSI4-FailedRecipients\`].IndexStatus'"
echo ""
echo "When status = ACTIVE, run test:"
echo "  npx tsx scripts/test-gsi4-failed-recipients.ts"
