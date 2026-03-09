# AWS Amplify - Campaign Dispatcher Cron Setup

## 🔒 UPDATED FOR INTERNAL OPERATIONS SECURITY

**Your dispatcher endpoint has moved:**

- ❌ OLD: `/api/campaigns/dispatch`
- ✅ NEW: `/api/internal/campaigns/dispatch`

**New requirement**: Must include `x-internal-key` header with secret key.

---

## 🎯 Overview

Since you're using **AWS Amplify** (not Vercel), the campaign dispatcher needs to be triggered using **AWS EventBridge** (formerly CloudWatch Events).

**Your internal dispatcher endpoint:** `/api/internal/campaigns/dispatch`
**What you need:** EventBridge rule to call it every 5 minutes with secret key header

---

## 🔧 Setup Options

### **Option 1: AWS EventBridge + API Gateway (Recommended)**

This triggers your Next.js API route directly via HTTPS.

#### **Step 1: Get Your Amplify API URL**

```powershell
# Your Amplify app URL (e.g., https://main.d1a2b3c4d5e6f7.amplifyapp.com)
$AMPLIFY_URL = "YOUR_AMPLIFY_URL_HERE"
```

#### **Step 2: Generate Internal Operations Secret Key**

```powershell
# Generate random 32-char secret
$SECRET_KEY = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "INTERNAL_OPERATIONS_KEY=$SECRET_KEY" -ForegroundColor Green
```

#### **Step 3: Add to Amplify Environment Variables**

1. Go to AWS Amplify Console
2. Select your app → Environment variables
3. Add:
   - `INTERNAL_OPERATIONS_KEY` = (your generated key)
   - `WHATSAPP_RATE_LIMIT_PER_SEC` = `10`
4. Redeploy app

#### **Step 4: Create EventBridge Rule (AWS Console)**

1. Go to **AWS EventBridge** → Rules → Create rule
2. **Name:** `streefi-campaign-dispatcher`
3. **Event bus:** default
4. **Rule type:** Schedule
5. **Schedule pattern:**
   - Type: **Cron-based schedule**
   - Cron expression: `*/5 * * * ? *` (every 5 minutes)
   - Timezone: UTC
6. Click **Next**

#### **Step 5: Configure Target**

1. **Target type:** API destination
2. **Create new API destination:**
   - **Name:** `streefi-api-dispatcher`
   - **API endpoint:** `https://YOUR_AMPLIFY_URL/api/internal/campaigns/dispatch`
   - **HTTP method:** POST
   - **Connection:**
     - Create new connection
     - Name: `streefi-connection`
     - Authorization: API Key
     - API Key name: `x-internal-key`
     - API Key value: (your INTERNAL_OPERATIONS_KEY)
3. Click **Next** → **Create**

**Done!** EventBridge will now trigger your dispatcher every 5 minutes.

---

### **Option 2: AWS CLI (Faster for Developers)**

```powershell
# Variables (replace with your values)
$AMPLIFY_URL = "https://main.d1a2b3c4d5e6f7.amplifyapp.com"
$SECRET_KEY = "your_internal_operations_key_here"
$REGION = "us-east-1"

# 1. Create EventBridge connection (for auth)
aws events create-connection `
  --name streefi-dispatcher-connection `
  --authorization-type API_KEY `
  --auth-parameters "ApiKeyAuthParameters={ApiKeyName=x-internal-key,ApiKeyValue=$SECRET_KEY}" `
  --region $REGION

# Get connection ARN from output
$CONNECTION_ARN = "arn:aws:events:us-east-1:123456789012:connection/streefi-dispatcher-connection/abc123"

# 2. Create API destination
aws events create-api-destination `
  --name streefi-dispatcher-api `
  --connection-arn $CONNECTION_ARN `
  --invocation-endpoint "$AMPLIFY_URL/api/internal/campaigns/dispatch" `
  --http-method POST `
  --invocation-rate-limit-per-second 1 `
  --region $REGION

# Get API destination ARN from output
$API_DESTINATION_ARN = "arn:aws:events:us-east-1:123456789012:api-destination/streefi-dispatcher-api/abc123"

# 3. Create IAM role for EventBridge
$TRUST_POLICY = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "events.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@

$TRUST_POLICY | Out-File -FilePath trust-policy.json -Encoding utf8
aws iam create-role `
  --role-name EventBridgeApiDestinationRole `
  --assume-role-policy-document file://trust-policy.json

# Attach policy
$POLICY = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "events:InvokeApiDestination"
      ],
      "Resource": "$API_DESTINATION_ARN"
    }
  ]
}
"@

$POLICY | Out-File -FilePath invoke-policy.json -Encoding utf8
aws iam put-role-policy `
  --role-name EventBridgeApiDestinationRole `
  --policy-name InvokeApiDestinationPolicy `
  --policy-document file://invoke-policy.json

$ROLE_ARN = (aws iam get-role --role-name EventBridgeApiDestinationRole --query 'Role.Arn' --output text)

# Create EventBridge rule (every 5 minutes)
aws events put-rule \
  --name streefi-campaign-dispatcher \
  --schedule-expression "cron(*/5 * * * ? *)" \
  --state ENABLED `
  --region $REGION

# 5. Add target to rule
$TARGET_INPUT = @"
{
  "RoleArn": "$ROLE_ARN",
  "Arn": "$API_DESTINATION_ARN",
  "HttpParameters": {
    "HeaderParameters": {
      "x-dispatcher-key": "$SECRET_KEY"
    }
  }
}
"@

$TARGET_INPUT | Out-File -FilePath target.json -Encoding utf8
aws events put-targets `
  --rule streefi-campaign-dispatcher `
  --targets "Id=1,Arn=$API_DESTINATION_ARN,RoleArn=$ROLE_ARN,HttpParameters={HeaderParameters={x-dispatcher-key=$SECRET_KEY}}" `
  --region $REGION

Write-Host "✅ EventBridge rule created successfully!" -ForegroundColor Green
```

---

### **Option 3: AWS Lambda + EventBridge (If API is private)**

If your Amplify app has authentication and you can't directly call the API:

#### **Create Lambda Function:**

```javascript
// lambda-dispatcher.js
const https = require('https');

exports.handler = async (event) => {
  const options = {
    hostname: 'YOUR_AMPLIFY_URL',
    path: '/api/campaigns/dispatch',
    method: 'POST',
    headers: {
      'x-dispatcher-key': process.env.DISPATCHER_SECRET_KEY,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('Response:', data);
        resolve({ statusCode: 200, body: data });
      });
    });

    req.on('error', (e) => {
      console.error('Error:', e);
      reject(e);
    });

    req.end();
  });
};
```

#### **Deploy Lambda:**

```powershell
# Zip function
Compress-Archive -Path lambda-dispatcher.js -DestinationPath lambda.zip -Force

# Create Lambda
aws lambda create-function `
  --function-name streefi-campaign-dispatcher `
  --runtime nodejs18.x `
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/lambda-execution-role `
  --handler lambda-dispatcher.handler `
  --zip-file fileb://lambda.zip `
  --environment "Variables={DISPATCHER_SECRET_KEY=your_secret_key_here}" `
  --region us-east-1

# Create EventBridge rule
aws events put-rule `
  --name streefi-dispatcher-trigger `
  --schedule-expression "cron(* * * * ? *)" `
  --state ENABLED

# Add Lambda as target
aws events put-targets `
  --rule streefi-dispatcher-trigger `
  --targets "Id=1,Arn=arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:streefi-campaign-dispatcher"

# Grant EventBridge permission to invoke Lambda
aws lambda add-permission `
  --function-name streefi-campaign-dispatcher `
  --statement-id EventBridgeInvoke `
  --action lambda:InvokeFunction `
  --principal events.amazonaws.com `
  --source-arn arn:aws:events:us-east-1:YOUR_ACCOUNT_ID:rule/streefi-dispatcher-trigger
```

---

## 🧪 Testing

### **Test EventBridge Rule:**

```powershell
# Check if rule exists
aws events list-rules --name-prefix streefi-campaign-dispatcher --region us-east-1

# Check rule targets
aws events list-targets-by-rule --rule streefi-campaign-dispatcher --region us-east-1
```

### **Manually Trigger Dispatcher:**

```powershell
# Test your API endpoint directly
$SECRET_KEY = "your_dispatcher_secret_key"
$AMPLIFY_URL = "https://your-app.amplifyapp.com"

Invoke-RestMethod `
  -Uri "$AMPLIFY_URL/api/campaigns/dispatch" `
  -Method POST `
  -Headers @{ "x-dispatcher-key" = $SECRET_KEY }
```

Expected response:

```json
{
  "success": true,
  "dispatched": 2,
  "failed": 0
}
```

### **Check CloudWatch Logs:**

```powershell
# View EventBridge execution logs
aws logs tail /aws/events/rules/streefi-campaign-dispatcher --follow --region us-east-1

# View your API logs (if using Lambda)
aws logs tail /aws/lambda/streefi-campaign-dispatcher --follow --region us-east-1
```

---

## 📊 Monitoring

### **EventBridge Metrics (CloudWatch):**

1. Go to CloudWatch → Metrics → EventBridge
2. Monitor:
   - `Invocations` - Should be ~12/hour (every 5 minutes)
   - `FailedInvocations` - Should be 0
   - `TriggeredRules` - Should match invocations

### **Dispatcher Health Check:**

```powershell
# Check dispatcher status
Invoke-RestMethod -Uri "$AMPLIFY_URL/api/campaigns/dispatch"
```

Returns:

```json
{
  "pendingCampaigns": 3,
  "campaigns": [
    { "id": "campaign-1", "progress": "45.2%" },
    { "id": "campaign-2", "progress": "78.9%" }
  ]
}
```

---

## 🔧 Troubleshooting

### **EventBridge rule not triggering:**

1. Check rule is ENABLED:

```powershell
aws events describe-rule --name streefi-campaign-dispatcher --region us-east-1
```

2. Check IAM role has permissions:

```powershell
aws iam get-role-policy --role-name EventBridgeApiDestinationRole --policy-name InvokeApiDestinationPolicy
```

3. Check CloudWatch Logs for errors:

```powershell
aws logs tail /aws/events/rules/streefi-campaign-dispatcher --region us-east-1
```

### **API returning 401 Unauthorized:**

- Verify `DISPATCHER_SECRET_KEY` matches in:
  1. Amplify environment variables
  2. EventBridge connection auth
- Check header name is `x-dispatcher-key` (lowercase)

### **Dispatcher returning 0 campaigns:**

- Verify campaigns exist with `status = 'RUNNING'`
- Check DynamoDB table has campaigns:

```powershell
aws dynamodb scan --table-name streefi_campaigns --filter-expression "campaign_status = :status" --expression-attribute-values '{":status":{"S":"RUNNING"}}' --region us-east-1
```

---

## 💰 Cost

### **EventBridge Pricing:**

- Invocations: $1.00 per million events
- At 1 event/5 minutes: 8,640 events/month = **$0.01/month**
- Well within free tier (100,000 events/month free)

### **API Gateway (included in Amplify):**

- First 1M requests/month: Free
- Dispatcher uses ~8,640 requests/month: **$0.00**

**Total cost: ~$0.01/month** (completely free - stays in free tier)

---

## 🎯 Summary

**For AWS Amplify deployments:**

1. ✅ Dispatcher endpoint already works (`/api/campaigns/dispatch`)
2. ✅ Use **AWS EventBridge** instead of Vercel cron
3. ✅ EventBridge triggers API every 5 minutes via HTTPS
4. ✅ Cost: ~$0.04/month

**Next Steps:**

1. Add environment variables to Amplify
2. Create EventBridge rule (AWS Console or CLI)
3. Test manually first
4. Monitor CloudWatch metrics

**Your system will then run 100% automatically at AWS-scale.**
