# 🚀 AMPLIFY DEPLOYMENT CHECKLIST - Phase 1A Testing

## ✅ Pre-Deployment Checklist

### 1. Local Testing Complete
- [ ] All code changes saved
- [ ] Dev server restarted locally
- [ ] Health check passes: `http://localhost:3000/api/campaigns/health`
- [ ] No TypeScript errors in code

### 2. Safety Locks Verified
- [ ] `META_DRY_RUN=true` in `.env.local`
- [ ] `WHATSAPP_DAILY_LIMIT=5` in `.env.local`
- [ ] Placeholder Meta credentials in `.env.local`
- [ ] Auth bypass code added to `adminAuth.ts`
- [ ] Safety checks in `messageService.ts` verify real credentials

### 3. Files to Commit
```bash
git status
```

Should show changes in:
- `src/lib/whatsapp/meta/messageService.ts` (dry run safety)
- `src/lib/adminAuth.ts` (auth bypass for dry run)
- `src/lib/dynamoClient.ts` (table name fix)
- `src/lib/whatsapp/campaignValidator.ts` (startup validation - NEW)
- `src/instrumentation.ts` (startup hook - NEW)
- `src/app/api/campaigns/create/route.ts` (better errors)
- `src/app/api/campaigns/health/route.ts` (NEW - health check)
- `.env.local` (DO NOT COMMIT - local only)

---

## 🔐 Amplify Environment Variables Setup

Before deploying, configure these in **Amplify Console → Environment Variables**:

### Required for Phase 1A Testing:
```bash
# CRITICAL: Dry run mode
META_DRY_RUN=true

# Testing configuration
WHATSAPP_DAILY_LIMIT=5

# Placeholder Meta credentials (dry run will prevent real sends)
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=streefi_secure_token

# AWS Configuration (should already be set)
AWS_REGION=us-east-1

# DynamoDB Tables (should already be set)
CAMPAIGNS_TABLE_NAME=streefi_campaigns
RECIPIENTS_TABLE_NAME=streefi_campaigns_recipients
DYNAMODB_TABLE_NAME=streefi_whatsapp
ADMIN_TABLE_NAME=streefi_admins
SESSION_TABLE_NAME=streefi_sessions
```

### How to Set Them:
1. Go to Amplify Console
2. Select your app
3. Go to **App settings → Environment variables**
4. Add/update the variables above
5. Save changes
6. Redeploy if needed

---

## 🚀 Deployment Steps

### Option 1: Git Push (Automatic Deploy)
```bash
# Review changes
git status
git diff

# Stage changes
git add .

# Commit with clear message
git commit -m "feat: Add Phase 1A dry run safety locks and validation

- Add META_DRY_RUN safety checks to prevent accidental real sends
- Add startup validation with clear logging
- Fix table name mismatch (streefi_campaigns_recipients)
- Add auth bypass for dry run testing
- Add /api/campaigns/health diagnostic endpoint
- Improve error logging in campaign routes

Phase 1A: Safe offline testing mode
No real Meta API calls will be made"

# Push to trigger Amplify build
git push origin main
```

### Option 2: Manual Trigger
1. Go to Amplify Console
2. Click "Redeploy this version"

---

## 🧪 Post-Deployment Testing

### 1. Check Startup Logs

In Amplify Console → Build History → View Build Logs:

Look for:
```
═══════════════════════════════════════════════════════════════
🚀 CAMPAIGN SYSTEM STARTUP VALIDATION
═══════════════════════════════════════════════════════════════

✅ DRY RUN MODE: ENABLED
   └─ All WhatsApp sends will be SIMULATED
   
🛡️  SAFETY LOCK: No real Meta credentials detected
   └─ All sends will be SIMULATED automatically
   
🟢 SAFE MODE: All sends will be simulated
═══════════════════════════════════════════════════════════════
```

### 2. Run Health Check

```powershell
$amplifyUrl = "https://your-amplify-domain.amplifyapp.com"
Invoke-RestMethod -Uri "$amplifyUrl/api/campaigns/health" | ConvertTo-Json -Depth 5
```

Expected:
```json
{
  "status": "healthy",
  "checks": {
    "dryRunMode": true,
    "dynamoConnection": true,
    "tablesExist": {
      "campaigns": true,
      "recipients": true
    }
  }
}
```

### 3. Run Phase 1A Tests

Follow the same test sequence from `TEST-DRY-RUN.md`, but use your Amplify URL:

```powershell
$baseUrl = "https://your-amplify-domain.amplifyapp.com"

# Test 1 - Create Campaign
$response = Invoke-RestMethod -Uri "$baseUrl/api/campaigns/create" `
  -Method POST -ContentType "application/json" `
  -Body '{"name":"Amplify Dry Run Test","templateName":"hello_world","channel":"WHATSAPP","audienceType":"CSV"}'

$campaignId = $response.campaignId
Write-Host "Campaign ID: $campaignId" -ForegroundColor Green

# Continue with populate, start, execute-batch...
```

### 4. Check CloudWatch Logs

In Amplify Console → Monitoring → View function logs:

Look for:
- `🧪 [DRY_RUN_ENABLED] SIMULATING WhatsApp Send`
- `⚠️  NO REAL API CALL MADE TO META`
- Campaign lifecycle logs
- Daily limit enforcement logs

---

## ✅ Success Criteria for Phase 1A

After running all tests on Amplify, verify:

- [ ] Health check returns `"status": "healthy"`
- [ ] Startup logs show "DRY RUN MODE: ENABLED"
- [ ] Campaign creates successfully
- [ ] Recipients populate successfully
- [ ] Campaign starts (DRAFT → RUNNING)
- [ ] Execute-batch sends 5 (not 10)
- [ ] Campaign auto-pauses at 5 sends
- [ ] Status becomes PAUSED with correct reason
- [ ] Second execute-batch processes 0 (idempotency)
- [ ] CloudWatch shows simulation logs (not real sends)
- [ ] No Meta API errors (because no real calls made)

---

## 🚨 What If Something Goes Wrong?

### Deployment Fails
- Check build logs in Amplify Console
- Verify all environment variables are set
- Check for TypeScript compilation errors

### Health Check Fails
- Verify DynamoDB tables exist in correct region
- Check IAM permissions for Amplify role
- Verify table names match environment variables

### Campaign Creation Fails
- Check CloudWatch logs for detailed error
- Verify `META_DRY_RUN=true` is set
- Check DynamoDB permissions

### Tests Work Locally But Not on Amplify
- Environment variables might be different
- Check Amplify environment variables match `.env.local`
- Verify AWS region matches where tables exist

---

## 🎯 After Phase 1A Success

DO NOT proceed to real sends until:
1. All Phase 1A tests pass on Amplify ✅
2. You have stable Meta Business Account ✅
3. You have real Meta Access Token ✅
4. You've read Meta's messaging policies ✅
5. You're ready to consume quota ✅

When ready for Phase 1A.5 (limited real sends):
1. Get real Meta credentials
2. Add them to Amplify environment variables
3. Keep `META_DRY_RUN=true` initially
4. Test health check shows new credentials
5. Do ONE manual test with `META_DRY_RUN=false`
6. If successful, proceed cautiously

---

## 📝 Deployment Notes

- `.env.local` is NOT committed (in `.gitignore`)
- Environment variables must be set in Amplify Console separately
- Each deployment triggers a fresh build with new environment variables
- CloudWatch logs persist for 30 days by default
- Test with small batches first (5-10 recipients max)

---

## 🆘 Need Help?

If you see unexpected behavior:
1. Check CloudWatch logs first
2. Verify environment variables in Amplify
3. Run health check endpoint
4. Check DynamoDB tables manually
5. Review startup validation logs

---

Ready to deploy? ✅ All safety locks are in place!
