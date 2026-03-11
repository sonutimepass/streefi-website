# Local Webhook Testing Guide

## Problem Fixed
Webhooks weren't storing in DynamoDB during local testing because:
1. ❌ AWS credentials not configured locally
2. ❌ Signature verification blocked test webhooks
3. ❌ Silent failures with no error details

## Solution Implemented

### 1. **Automatic Local Development Detection**
```typescript
// Bypasses signature verification for localhost
const isLocalDevelopment = process.env.NODE_ENV === 'development' || 
                          process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';
```

### 2. **Optional DynamoDB Storage**
- ✅ Works without AWS credentials locally
- ✅ Shows clear warnings in console
- ✅ Detailed error logging

### 3. **Test Webhook Script**
Use `test-webhook.js` to send sample webhooks locally

## How to Test Locally

### Option 1: With DynamoDB (Full Testing)
```bash
# 1. Set environment variables in .env.local
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_REGION=us-east-1
DYNAMODB_TABLE_NAME=streefi_whatsapp

# 2. Start dev server
npm run dev

# 3. Send test webhooks
node test-webhook.js

# 4. View in debugger
# Open: http://localhost:3000/whatsapp-admin/webhook-debug
```

### Option 2: Without DynamoDB (CloudWatch Only)
```bash
# 1. Just start dev server
npm run dev

# 2. Send test webhooks
node test-webhook.js

# 3. Check terminal logs
# Webhooks logged to console but not stored
```

### Option 3: Manual Testing with cURL
```bash
# Send a test message webhook
curl -X POST http://localhost:3000/api/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "123456789",
      "changes": [{
        "field": "messages",
        "value": {
          "messages": [{
            "from": "919876543210",
            "id": "test123",
            "timestamp": "1710172234",
            "type": "text",
            "text": { "body": "Test message" }
          }]
        }
      }]
    }]
  }'
```

## What You'll See

### ✅ With AWS Credentials:
```
✅ DynamoDB client initialized
🔍 Environment: LOCAL DEVELOPMENT
⚠️ LOCAL DEV MODE: Skipping signature verification
📝 Attempting to store messages webhook to DynamoDB...
✅ Successfully stored messages webhook to DynamoDB (streefi_whatsapp)
```

### ⚠️ Without AWS Credentials:
```
⚠️ DynamoDB credentials not found - webhook storage disabled
🔍 Environment: LOCAL DEVELOPMENT
⚠️ LOCAL DEV MODE: Skipping signature verification
⚠️ Skipping DynamoDB storage for messages (client not initialized)
```

## Checking Results

### Terminal Logs
- All webhooks logged with full JSON payload
- Color-coded emojis for easy reading

### Webhook Debugger UI
- Go to: http://localhost:3000/whatsapp-admin/webhook-debug
- Filter by type
- View full payloads
- Auto-refresh every 10 seconds

### DynamoDB Console (if configured)
- Table: `streefi_whatsapp`
- Look for items with PK starting with `WEBHOOK#`

## Production Deployment

When you deploy to Amplify, it automatically:
- ✅ Enables signature verification
- ✅ Connects to DynamoDB
- ✅ Stores all webhooks
- ✅ Enforces security

No code changes needed - it detects the environment automatically!

## Troubleshooting

### "Cannot find module '@aws-sdk/client-dynamodb'"
```bash
npm install @aws-sdk/client-dynamodb
```

### "Signature verification failed"
- This is normal in local dev mode - it's bypassed automatically
- Check console for "LOCAL DEV MODE: Skipping signature verification"

### "DynamoDB credentials not found"
Two options:
1. Add credentials to `.env.local` (recommended for full testing)
2. Just use console logs (webhooks still work, just not stored)

### Webhooks not appearing in debugger
1. Check terminal for error messages
2. Verify webhook was sent (check console logs)
3. If no DynamoDB credentials, storage is skipped (expected)
4. Try running `node test-webhook.js` to send test data

## Security Notes

⚠️ **Local bypasses are ONLY active when:**
- `NODE_ENV=development`, OR
- `NEXT_PUBLIC_BYPASS_AUTH=true`

✅ **Production is always secure:**
- Signature verification enforced
- No bypasses active
- Full authentication required
