#!/bin/bash

# Step 8: Create GSI2-ConversationsByActivity for efficient conversation queries
# 
# Purpose: Query active conversations sorted by most recent activity
# Pattern: GSI2PK='CONVERSATION', GSI2SK='{status}#{timestamp}'
# 
# Query example:
#   GSI2PK = 'CONVERSATION' AND begins_with(GSI2SK, 'active#')
#   Order: DESC (most recent first)

echo "🚀 Creating GSI2-ConversationsByActivity index..."
echo ""
echo "📊 Index Details:"
echo "   • GSI2PK: 'CONVERSATION' (constant for all conversations)"
echo "   • GSI2SK: '{status}#{timestamp}' (enables status filter + time sort)"
echo "   • Projection: ALL (include all attributes)"
echo ""

aws dynamodb update-table \
  --table-name whatsapp_conversations \
  --attribute-definitions \
    AttributeName=GSI2PK,AttributeType=S \
    AttributeName=GSI2SK,AttributeType=S \
  --global-secondary-index-updates \
    "[{\"Create\":{
      \"IndexName\":\"GSI2-ConversationsByActivity\",
      \"KeySchema\":[
        {\"AttributeName\":\"GSI2PK\",\"KeyType\":\"HASH\"},
        {\"AttributeName\":\"GSI2SK\",\"KeyType\":\"RANGE\"}
      ],
      \"Projection\":{\"ProjectionType\":\"ALL\"},
      \"ProvisionedThroughput\":{
        \"ReadCapacityUnits\":5,
        \"WriteCapacityUnits\":5
      }
    }}]"

echo ""
echo "✅ GSI2-ConversationsByActivity creation initiated!"
echo ""
echo "⏳ Index Status: CREATING (takes ~5-10 minutes)"
echo ""
echo "Check status with:"
echo "  aws dynamodb describe-table --table-name whatsapp_conversations --query 'Table.GlobalSecondaryIndexes[?IndexName==\`GSI2-ConversationsByActivity\`].IndexStatus'"
echo ""
echo "When status = ACTIVE, run test:"
echo "  npx tsx scripts/test-gsi2-conversations-by-activity.ts"
