# Internal Operations Security Guide

## ✅ Step 1 Complete: API Separation

Your campaign system has been refactored to separate **public APIs** from **internal system operations**.

---

## 🎯 Overview

### What Changed?

**BEFORE** (❌ Security Risk):
```
/api/campaigns/dispatch          → Anyone with admin login could trigger
/api/campaigns/[id]/execute-batch → Exposed as HTTP endpoint
/api/campaigns/[id]/retry-failed  → Manual button in UI
/api/campaigns/reconcile          → Public endpoint
```

**AFTER** (✅ Secure):
```
/api/internal/campaigns/dispatch       → Protected by secret key
/api/internal/campaigns/execute-batch  → Protected by secret key
/api/internal/campaigns/retry-failed   → Protected by secret key
/api/internal/campaigns/reconcile      → Protected by secret key
```

---

## 🔒 Security Model

### Public APIs (Admin Session Required)

Located in `/api/campaigns/`:
- `create` - Create new campaign
- `list` - List all campaigns
- `[id]` - Get campaign details
- `[id]/analytics` - View campaign analytics
- `[id]/control` - Start/Pause/Resume/Stop campaign
- `[id]/logs` - View campaign logs
- `[id]/recipients` - View recipient list
- `[id]/conversion` - Track conversions
- `[id]/populate` - Upload CSV recipients (one-time setup)

**Authentication**: Admin session cookie (`whatsapp-session`)

### Internal Operations (Secret Key Required)

Located in `/api/internal/campaigns/`:
- `dispatch` - Triggered by cron every 5 minutes
- `execute-batch` - Process 25 recipients per campaign
- `retry-failed` - Reset failed recipients to pending
- `reconcile` - Recover stuck recipients

**Authentication**: `x-internal-key` header with `INTERNAL_OPERATIONS_KEY`

---

## 🔧 Setup Instructions

### 1. Generate Secret Key

```powershell
# Generate a 32-character random secret
$SECRET = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "INTERNAL_OPERATIONS_KEY=$SECRET" -ForegroundColor Green
```

Example output:
```
INTERNAL_OPERATIONS_KEY=9f3a7f20e8c1446fbf9aab3d14c7d239
```

### 2. Add to Environment Variables

**AWS Amplify**:
1. Go to Amplify Console → Your App
2. Environment variables
3. Add new variable:
   - Key: `INTERNAL_OPERATIONS_KEY`
   - Value: (your generated secret)
4. Redeploy your app

**Local Development** (`.env.local`):
```env
INTERNAL_OPERATIONS_KEY=9f3a7f20e8c1446fbf9aab3d14c7d239
```

**CRITICAL**: Never commit this key to Git. Add to `.gitignore`:
```
.env.local
.env*.local
```

### 3. Update EventBridge Rules

Your AWS EventBridge cron jobs must now send the secret key header.

**OLD Configuration** (❌ Broken):
```
POST /api/campaigns/dispatch
```

**NEW Configuration** (✅ Correct):
```
POST /api/internal/campaigns/dispatch
Headers:
  x-internal-key: YOUR_SECRET_KEY
```

See [AWS-AMPLIFY-INTERNAL-CRON-SETUP.md](./AWS-AMPLIFY-INTERNAL-CRON-SETUP.md) for full instructions.

---

## 🚀 Usage Examples

### Dispatcher (Cron Job)

```powershell
curl -X POST https://streefi.in/api/internal/campaigns/dispatch `
  -H "x-internal-key: YOUR_SECRET_KEY"
```

**Response**:
```json
{
  "success": true,
  "dispatched": 3,
  "failed": 0,
  "timestamp": "2026-03-09T14:30:00.000Z"
}
```

### Execute Batch (Per Campaign)

```powershell
curl -X POST https://streefi.in/api/internal/campaigns/execute-batch `
  -H "x-internal-key: YOUR_SECRET_KEY" `
  -H "Content-Type: application/json" `
  -d '{"campaignId": "CAMPAIGN_01234567"}'
```

**Response**:
```json
{
  "success": true,
  "campaignId": "CAMPAIGN_01234567",
  "result": {
    "processed": 25,
    "sent": 24,
    "failed": 1,
    "paused": false,
    "completed": false
  }
}
```

### Reconcile (Fix Stuck Recipients)

```powershell
curl -X POST https://streefi.in/api/internal/campaigns/reconcile `
  -H "x-internal-key: YOUR_SECRET_KEY"
```

**Response**:
```json
{
  "success": true,
  "scanned": 12,
  "recovered": 12,
  "recipients": [...]
}
```

### Retry Failed (Reset to Pending)

```powershell
curl -X POST https://streefi.in/api/internal/campaigns/retry-failed `
  -H "x-internal-key: YOUR_SECRET_KEY" `
  -H "Content-Type: application/json" `
  -d '{"campaignId": "CAMPAIGN_01234567"}'
```

**Response**:
```json
{
  "success": true,
  "retriedCount": 5,
  "message": "Successfully reset 5 failed recipient(s) to PENDING"
}
```

---

## 🛡️ Error Responses

### Missing Secret Key

```json
{
  "error": "Forbidden",
  "message": "Unauthorized internal operation",
  "hint": "Ensure x-internal-key header is set with valid INTERNAL_OPERATIONS_KEY"
}
```
**Status**: 403 Forbidden

### Invalid Secret Key

```json
{
  "error": "Forbidden",
  "message": "Unauthorized internal operation",
  "hint": "Ensure x-internal-key header is set with valid INTERNAL_OPERATIONS_KEY"
}
```
**Status**: 403 Forbidden

### Key Not Configured

```json
{
  "error": "Forbidden",
  "message": "Unauthorized internal operation",
  "hint": "Ensure x-internal-key header is set with valid INTERNAL_OPERATIONS_KEY"
}
```
**Status**: 403 Forbidden

---

## 📊 Verification Checklist

After completing this step, verify:

- [ ] **Environment Variable Set**
  ```powershell
  # Check if set in Amplify
  # Go to Console → App → Environment variables
  # Look for: INTERNAL_OPERATIONS_KEY
  ```

- [ ] **Old Endpoints Return 404**
  ```powershell
  curl https://streefi.in/api/campaigns/dispatch
  # Should return: 404 Not Found
  ```

- [ ] **New Endpoints Require Auth**
  ```powershell
  curl https://streefi.in/api/internal/campaigns/dispatch
  # Should return: 403 Forbidden (missing key)
  ```

- [ ] **New Endpoints Work With Key**
  ```powershell
  curl -H "x-internal-key: YOUR_KEY" https://streefi.in/api/internal/campaigns/dispatch
  # Should return: 200 OK with dispatcher result
  ```

- [ ] **UI Buttons Removed**
  - Open campaign detail modal
  - Verify "Execute Batch" button is gone
  - Verify "Retry Failed" button is gone
  - Verify Start/Pause/Resume/Stop still work

---

## 🎓 Architecture Benefits

### 1. Security

- Attack surface reduced
- No accidental triggering from UI
- Secret key rotation possible
- Audit trail via secret key

### 2. Code Clarity

```
/api/campaigns/     → User-facing admin operations
/api/internal/      → System automation only
```

Anyone reading the code immediately understands the separation.

### 3. Easier Scaling

When moving to Lambda/SQS later:

```
/api/internal/      → Lambda functions
/api/campaigns/     → API Gateway
```

Clean separation makes migration straightforward.

### 4. Production Safety

- UI can't spam execute-batch
- Manual retries prevented
- Cron controls execution pace
- Rate limits removed (cron-controlled)

---

## 🚨 Emergency Manual Trigger

If your cron fails and you need to manually trigger operations:

```powershell
# Set your secret key
$KEY = "YOUR_INTERNAL_OPERATIONS_KEY"

# Trigger dispatcher
curl -X POST https://streefi.in/api/internal/campaigns/dispatch `
  -H "x-internal-key: $KEY"

# Execute specific campaign
curl -X POST https://streefi.in/api/internal/campaigns/execute-batch `
  -H "x-internal-key: $KEY" `
  -H "Content-Type: application/json" `
  -d '{"campaignId": "CAMPAIGN_ID_HERE"}'
```

**This should ONLY be used in emergencies.** Normal operation is fully automated.

---

## 📚 Related Documentation

- [AWS-AMPLIFY-INTERNAL-CRON-SETUP.md](./AWS-AMPLIFY-INTERNAL-CRON-SETUP.md) - EventBridge configuration
- [CAMPAIGN-EXECUTOR-QUICK-REFERENCE.md](./CAMPAIGN-EXECUTOR-QUICK-REFERENCE.md) - How batch execution works
- [CAMPAIGN-EXECUTOR-TESTING-CHECKLIST.md](./CAMPAIGN-EXECUTOR-TESTING-CHECKLIST.md) - Testing guide

---

## 🎯 Next Steps

This completes **Step 1: API Layer Separation**.

**Do NOT proceed to queues/SQS/Lambda yet.**

First:
1. Deploy these changes to production
2. Update your EventBridge rules with the new endpoints and secret key
3. Verify campaigns execute automatically via cron
4. Monitor for 1-2 weeks to ensure stability

**Only then** consider Step 2 (moving to Lambda functions).

---

## ❓ FAQ

### Q: Can I still manually trigger campaigns in emergencies?

**A**: Yes, using curl with the secret key (see Emergency Manual Trigger section above). But this should be rare - normal operation is fully automated.

### Q: What if I forget the secret key?

**A**: Generate a new one and update:
1. Amplify environment variables
2. EventBridge rule headers
3. Your local `.env.local`
Then redeploy.

### Q: Why not use admin session for internal operations?

**A**: 
1. Cron jobs don't have browser sessions
2. Secret key is simpler for automation
3. Separates human operations from system operations
4. Secret keys can be rotated independently

### Q: Can I have different keys for different operations?

**A**: Not currently. All internal operations share one key (`INTERNAL_OPERATIONS_KEY`). If you need granular control, you can later add:
- `DISPATCHER_KEY`
- `EXECUTOR_KEY`
- `RECONCILE_KEY`

But for now, one key is sufficient.

---

**Status**: ✅ Step 1 Complete - API separation implemented and secured.
