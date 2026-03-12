#!/bin/bash

# Script to create GSI1-TemplatesByStatus for Step 7
# This Global Secondary Index allows efficient queries for templates by status

echo "🚀 Creating GSI1-TemplatesByStatus..."
echo ""

# Get table name from environment or use default
TABLE_NAME="${DYNAMODB_TABLE_WHATSAPP:-streefi_whatsapp}"

echo "📊 Table: $TABLE_NAME"
echo "📋 Index: GSI1-TemplatesByStatus"
echo ""

# Create GSI
aws dynamodb update-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions \
    AttributeName=GSI1PK,AttributeType=S \
    AttributeName=GSI1SK,AttributeType=S \
  --global-secondary-index-updates \
    '[{
      "Create": {
        "IndexName": "GSI1-TemplatesByStatus",
        "KeySchema": [
          {"AttributeName": "GSI1PK", "KeyType": "HASH"},
          {"AttributeName": "GSI1SK", "KeyType": "RANGE"}
        ],
        "Projection": {
          "ProjectionType": "ALL"
        },
        "ProvisionedThroughput": {
          "ReadCapacityUnits": 1,
          "WriteCapacityUnits": 1
        }
      }
    }]'

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ GSI creation initiated successfully!"
  echo ""
  echo "📊 Index Status: CREATING (this may take a few minutes)"
  echo ""
  echo "To check status, run:"
  echo "  aws dynamodb describe-table --table-name $TABLE_NAME --query 'Table.GlobalSecondaryIndexes[?IndexName==\`GSI1-TemplatesByStatus\`].IndexStatus'"
  echo ""
  echo "Wait for status to change from CREATING to ACTIVE before running queries."
else
  echo ""
  echo "❌ Failed to create GSI. Check the error above."
  echo ""
  echo "Common issues:"
  echo "  - GSI with same name already exists"
  echo "  - Table doesn't exist"
  echo "  - AWS credentials not configured"
  exit 1
fi
