# PowerShell script to create GSI1-TemplatesByStatus for Step 7
# This Global Secondary Index allows efficient queries for templates by status

Write-Host "🚀 Creating GSI1-TemplatesByStatus..." -ForegroundColor Cyan
Write-Host ""

# Get table name from environment or use default
$TABLE_NAME = if ($env:DYNAMODB_TABLE_WHATSAPP) { $env:DYNAMODB_TABLE_WHATSAPP } else { "streefi_whatsapp" }

Write-Host "📊 Table: $TABLE_NAME" -ForegroundColor White
Write-Host "📋 Index: GSI1-TemplatesByStatus" -ForegroundColor White
Write-Host ""

# Create GSI using AWS CLI
$gsiConfig = @'
[{
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
}]
'@

try {
    aws dynamodb update-table `
      --table-name $TABLE_NAME `
      --attribute-definitions `
        AttributeName=GSI1PK,AttributeType=S `
        AttributeName=GSI1SK,AttributeType=S `
      --global-secondary-index-updates $gsiConfig

    Write-Host ""
    Write-Host "✅ GSI creation initiated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Index Status: CREATING (this may take a few minutes)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To check status, run:" -ForegroundColor White
    Write-Host "  aws dynamodb describe-table --table-name $TABLE_NAME --query 'Table.GlobalSecondaryIndexes[?IndexName==``GSI1-TemplatesByStatus``].IndexStatus'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Wait for status to change from CREATING to ACTIVE before running queries." -ForegroundColor Yellow
}
catch {
    Write-Host ""
    Write-Host "❌ Failed to create GSI. Error:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  - GSI with same name already exists" -ForegroundColor White
    Write-Host "  - Table doesn't exist" -ForegroundColor White
    Write-Host "  - AWS credentials not configured" -ForegroundColor White
    Write-Host ""
    Write-Host "To check if GSI already exists:" -ForegroundColor White
    Write-Host "  aws dynamodb describe-table --table-name $TABLE_NAME --query 'Table.GlobalSecondaryIndexes[].IndexName'" -ForegroundColor Gray
    exit 1
}
