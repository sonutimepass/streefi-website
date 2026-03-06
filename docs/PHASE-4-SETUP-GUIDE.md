# Phase 4 Production Infrastructure Setup Guide

## 🚀 What You Just Built

You now have the **remaining 20%** that makes this system production-capable at 50k-200k message scale:

✅ **Campaign Dispatcher** - Automatic batch execution (no manual triggers)  
✅ **Message Rate Throttle** - Prevents Meta 429 errors (10 msg/sec default)  
✅ **Campaign State Machine** - Prevents illegal state transitions  
✅ **Account Warmup Manager** - Protects new accounts from quality drops  

---

## 📋 SETUP CHECKLIST

### **1. Create Missing DynamoDB Tables**

You already have `streefi_campaign_contacts`. Now create these additional tables:

#### **Table Schema:**

```powershell
# No need to create new tables - All data can be stored in existing streefi_campaigns table
# The system uses composite keys to separate different data types:
# - CAMPAIGN#{id} / METADATA = Campaign metadata
# - CAMPAIGN#{id} / METRICS = Campaign analytics
# - SYSTEM / ACCOUNT#{phoneNumberId} = Account warmup state
# - DISPATCH_QUEUE / {campaignId}#{priority} = Dispatcher queue

# Your existing streefi_campaigns table already supports these patterns
```

**Why no new tables?**
- Your existing `streefi_campaigns` table uses `PK/SK` composite keys
- Can store different entity types using key prefixes
- Saves money (fewer tables = fewer read/write units)
- Simplifies queries (no cross-table joins)

---

### **2. Add Environment Variables**

Add these to your `.env.local` (development) and Vercel dashboard (production):

```bash
# Campaign Dispatcher Security
DISPATCHER_SECRET_KEY=your_random_32_char_secret_key_here

# Message Rate Limiting (messages per second)
WHATSAPP_RATE_LIMIT_PER_SEC=10

# WhatsApp Credentials (you already have these)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
```

**Generate dispatcher secret:**
```powershell
# In PowerShell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

---

### **3. Integrate Rate Throttle into Message Sending**

**File:** `src/lib/whatsapp/meta/messageService.ts`

**Find this function:**
```typescript
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  components: any[],
  campaignId?: string
): Promise<WhatsAppMessageResponse> {
  // ... existing code
```

**Add rate throttle BEFORE the fetch call:**
```typescript
import { getMessageRateThrottle } from '@/lib/whatsapp/messageRateThrottle';

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  components: any[],
  campaignId?: string
): Promise<WhatsAppMessageResponse> {
  // 🚦 CRITICAL: Wait for rate throttle slot
  await getMessageRateThrottle().waitForSlot();

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en' },
      components
    }
  };

  const response = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );

  // ... rest of existing code
}
```

**Why this matters:**
- Meta enforces rate limits (80 msg/sec standard tier)
- Sending too fast → 429 errors → quality score drop → delivery rate plummets
- Rate throttle ensures you never hit that limit

---

### **4. Integrate Warmup Manager into Execute-Batch**

**File:** `src/app/api/campaigns/[id]/execute-batch/route.ts`

**Find the batch execution logic and add warmup check:**

```typescript
import { getAccountWarmupManager } from '@/lib/whatsapp/accountWarmupManager';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  // ... existing validation code

  // 🔥 NEW: Check account warmup limits
  const warmupManager = getAccountWarmupManager();
  const accountId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  
  const warmupCheck = await warmupManager.canSend(accountId, BATCH_SIZE);
  if (!warmupCheck.allowed) {
    console.warn(`⚠️ [Execute-Batch] Warmup limit reached: ${warmupCheck.reason}`);
    return NextResponse.json({
      success: false,
      error: warmupCheck.reason,
      remainingToday: warmupCheck.remainingToday
    }, { status: 429 });
  }

  // ... existing batch sending code

  // After sending messages successfully:
  await warmupManager.recordSent(accountId, successCount);

  return NextResponse.json({
    success: true,
    sent: successCount,
    failed: failCount,
    remainingToday: warmupCheck.remainingToday,
    dailyLimit: warmupCheck.dailyLimit
  });
}
```

**Why this matters:**
- New WhatsApp accounts CANNOT send high volume immediately
- Day 1 limit: 200/day → Day 30+: 10,000+/day
- Violating warmup = instant quality tier drop = delivery disaster

---

### **5. Set Up Cron Job (AWS EventBridge)**

**Since you're using AWS Amplify**, you need AWS EventBridge (not Vercel cron).

#### **Quick Setup (AWS Console):**

1. Go to **AWS EventBridge** → Rules → Create rule
2. **Name:** `streefi-campaign-dispatcher`
3. **Schedule:** Cron expression `*/5 * * * ? *` (every 5 minutes)
4. **Target:** API destination
   - **Endpoint:** `https://YOUR_AMPLIFY_URL/api/campaigns/dispatch`
   - **Method:** POST
   - **Auth:** API Key header `x-dispatcher-key` = your DISPATCHER_SECRET_KEY
5. Click **Create**

**What this does:**
- Triggers `/api/campaigns/dispatch` every 5 minutes via HTTPS
- Dispatcher finds RUNNING campaigns
- Calls execute-batch for each campaign
- Respects 60-second cooldown between batches
- 5-minute polling is optimal for WhatsApp campaigns (not real-time)

**📖 Full instructions:** See [AWS-AMPLIFY-CRON-SETUP.md](AWS-AMPLIFY-CRON-SETUP.md) for detailed AWS CLI commands and troubleshooting.

---

### **6. Integrate State Validator into Campaign Routes**

**File:** `src/app/api/campaigns/[id]/start/route.ts`

```typescript
import { getCampaignStateValidator } from '@/lib/whatsapp/campaignStateValidator';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;

  // Fetch campaign from DynamoDB
  const campaign = await getCampaignMetadata(campaignId);

  // 🔒 Validate state transition
  const validator = getCampaignStateValidator();
  const canStartResult = validator.canStart(campaign.status, campaign.totalRecipients);

  if (!canStartResult.allowed) {
    return NextResponse.json({
      success: false,
      error: canStartResult.reason
    }, { status: 400 });
  }

  // Update campaign status to RUNNING
  await updateCampaignStatus(campaignId, 'RUNNING');

  return NextResponse.json({
    success: true,
    message: 'Campaign started'
  });
}
```

**Do the same for:**
- `/api/campaigns/[id]/pause` → Use `validator.canPause()`
- `/api/campaigns/[id]/complete` → Use `validator.canComplete()`
- Campaign edit routes → Use `validator.canEdit()`

---

### **7. Add Auto Spam Protection Trigger**

**File:** `src/app/api/campaigns/[id]/execute-batch/route.ts`

**Add this after sending batch:**

```typescript
import { getBlockRateCircuitBreaker } from '@/lib/whatsapp/guards/blockRateCircuitBreaker';

export async function POST(...) {
  // ... existing send logic

  // 🚨 Check if block rate is too high (auto-pause if needed)
  const circuitBreaker = getBlockRateCircuitBreaker();
  const metrics = await getCampaignMetrics(campaignId);
  
  const shouldKillSwitch = circuitBreaker.shouldKillSwitch({
    sent_count: metrics.sentCount,
    failed_count: metrics.failedCount,
    blocked_count: metrics.blockedCount
  });

  if (shouldKillSwitch) {
    console.error(`🚨 [Execute-Batch] Auto-pausing campaign ${campaignId}: Block rate >5%`);
    
    await updateCampaignStatus(campaignId, 'PAUSED');
    
    // TODO: Send alert email/SMS to admin
    
    return NextResponse.json({
      success: false,
      error: 'Campaign auto-paused: Block rate exceeded 5%',
      blockRate: ((metrics.blockedCount / metrics.sentCount) * 100).toFixed(1) + '%'
    }, { status: 429 });
  }

  // Continue normal flow
}
```

---

## 🧪 TESTING THE SYSTEM

### **Test 1: Rate Throttle Works**

```powershell
# Send 20 messages rapidly
for ($i = 1; $i -le 20; $i++) {
    Invoke-RestMethod -Uri "http://localhost:3000/api/campaigns/test-id/execute-batch" `
        -Method POST `
        -Headers @{ "x-dispatcher-key" = "your_secret_key" }
    Write-Host "Sent batch $i"
}
```

**Expected behavior:**
- First 10 messages: Instant (fills 1-second window)
- Messages 11-20: 100ms delay between each
- No 429 errors from Meta

### **Test 2: Warmup Enforces Limits**

```powershell
# Check warmup status
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/whatsapp-admin/warmup-status"
Write-Host "Daily limit: $($response.dailyLimit)"
Write-Host "Sent today: $($response.currentDaySent)"
Write-Host "Remaining: $($response.remainingToday)"
```

Try sending more than daily limit:
```powershell
# This should fail with 429 if you exceed warmup limit
Invoke-RestMethod -Uri "http://localhost:3000/api/campaigns/test-id/execute-batch" `
    -Method POST `
    -Headers @{ "x-dispatcher-key" = "your_secret_key" }
```

**Expected behavior:**
- Day 1: Stops at 200 messages
- Day 5: Stops at 500 messages
- Day 30: Allows 10,000 messages

### **Test 3: Dispatcher Runs Automatically**

1. Create a campaign with status RUNNING
2. Wait 1 minute (cron triggers)
3. Check campaign metrics:

```powershell
$campaign = Invoke-RestMethod -Uri "http://localhost:3000/api/campaigns/your-campaign-id"
Write-Host "Sent: $($campaign.sentCount) / $($campaign.totalRecipients)"
```

**Expected behavior:**
- Every 1 minute, 100 messages sent (BATCH_SIZE)
- Continues until campaign complete
- No manual intervention needed

### **Test 4: State Validator Prevents Illegal Transitions**

```powershell
# Try to start a completed campaign (should fail)
Invoke-RestMethod -Uri "http://localhost:3000/api/campaigns/completed-id/start" `
    -Method POST `
    -ErrorAction SilentlyContinue
```

**Expected error:**
```json
{
  "success": false,
  "error": "Cannot transition from COMPLETED to RUNNING"
}
```

---

## 📊 MONITORING & DASHBOARDS

### **Health Check Endpoints**

**1. Dispatcher Status:**
```
GET /api/campaigns/dispatch
```
Returns pending campaigns ready for processing.

**2. Warmup Status:**
```
GET /api/whatsapp-admin/warmup-status
```
Returns account age, daily limit, current usage.

**3. Rate Throttle Status:**
```
GET /api/whatsapp-admin/rate-status
```
Returns current msg/sec, queue size.

### **Create Warmup Status Endpoint (Optional)**

**File:** `src/app/api/whatsapp-admin/warmup-status/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getAccountWarmupManager } from '@/lib/whatsapp/accountWarmupManager';

export async function GET() {
  const manager = getAccountWarmupManager();
  const accountId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  
  const state = await manager.getWarmupState(accountId);
  const progress = await manager.getWarmupProgress(accountId);
  
  return NextResponse.json({
    accountAge: state.accountAge,
    dailyLimit: state.dailyLimit,
    currentDaySent: state.currentDaySent,
    remainingToday: state.dailyLimit - state.currentDaySent,
    totalSent: state.totalSent,
    qualityTier: state.qualityTier,
    warmupProgress: progress
  });
}
```

---

## 🔥 WHAT HAPPENS NOW

### **Before (80% Complete):**
- ❌ Campaigns rely on manual triggers
- ❌ No rate limiting (risk of 429 errors)
- ❌ Can restart completed campaigns (data corruption)
- ❌ New accounts can send 10k on day 1 (instant quality drop)

### **After (95% Complete):**
- ✅ Campaigns run automatically (cron triggers dispatcher)
- ✅ Rate throttle prevents Meta 429 errors
- ✅ State machine prevents illegal transitions
- ✅ Warmup protects new accounts from quality issues
- ✅ System can handle 50k-200k messages safely

---

## 🚨 CRITICAL REMAINING TASKS

### **Priority 1: Integration (60 minutes)**
1. Add rate throttle to `messageService.ts` (5 min)
2. Add warmup checks to `execute-batch/route.ts` (10 min)
3. Add state validator to start/pause/complete routes (15 min)
4. Add auto spam protection to `execute-batch/route.ts` (10 min)
5. Add environment variables to AWS Amplify (5 min)
6. Create EventBridge cron rule (15 min) ← **See [AWS-AMPLIFY-CRON-SETUP.md](AWS-AMPLIFY-CRON-SETUP.md)**

### **Priority 2: Testing (30 minutes)**
1. Test rate throttle (10 min)
2. Test warmup limits (10 min)
3. Test dispatcher (5 min)
4. Test state validator (5 min)

### **Priority 3: Deployment (15 minutes)**
1. Deploy to AWS Amplify (5 min)
2. Verify EventBridge rule is triggering (5 min)
3. Monitor first campaign via CloudWatch (5 min)

---

## 📈 PRODUCTION CAPACITY

| Account Age | Daily Limit | Time to Process 10k | Time to Process 50k |
|-------------|-------------|---------------------|---------------------|
| Day 1-3     | 200/day     | N/A (blocked)       | N/A (blocked)       |
| Day 4-7     | 500/day     | N/A (blocked)       | N/A (blocked)       |
| Day 8-14    | 1,000/day   | N/A (blocked)       | N/A (blocked)       |
| Day 15-21   | 2,500/day   | 4 days              | 20 days             |
| Day 22-30   | 5,000/day   | 2 days              | 10 days             |
| Day 30+     | 10,000/day  | 1 day               | 5 days              |
| Day 60+     | 25,000/day  | 10 hours            | 2 days              |

**At 10 msg/sec rate limit:** 36,000 msg/hour max throughput

---

## 🎯 NEXT STEPS

1. **Now:** Follow integration checklist above
2. **Then:** Run test suite to verify all components
3. **Finally:** Deploy to production and monitor first campaign

**You're 95% production-ready. The remaining 5% is integration and testing.**
