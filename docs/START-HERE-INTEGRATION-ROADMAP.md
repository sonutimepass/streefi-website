# 🚀 Phase 4 Complete Integration Roadmap
## What to do RIGHT NOW (Step-by-Step)

---

## 📍 YOU ARE HERE

✅ Infrastructure components created (dispatcher, rate throttle, warmup, state validator)  
⏳ **NEXT:** Integrate them into your existing code  
⏳ **THEN:** Set up AWS EventBridge cron trigger  

---

## 🎯 STEP-BY-STEP EXECUTION PLAN

### **STEP 1: Generate Secret Key (2 minutes)**

Open PowerShell and run:

```powershell
# Generate dispatcher secret key
$SECRET_KEY = -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
Write-Host "DISPATCHER_SECRET_KEY=$SECRET_KEY" -ForegroundColor Green
Write-Host ""
Write-Host "Copy this key - you'll need it in Step 2 and Step 6" -ForegroundColor Yellow
```

**Save this key somewhere!** You need it for both Amplify environment variables and EventBridge.

---

### **STEP 2: Add Environment Variables to AWS Amplify (5 minutes)**

1. Go to **AWS Amplify Console**
2. Select your app → **Environment variables** (left sidebar)
3. Click **Manage variables**
4. Add these two variables:

| Variable | Value |
|----------|-------|
| `DISPATCHER_SECRET_KEY` | (paste the key from Step 1) |
| `WHATSAPP_RATE_LIMIT_PER_SEC` | `10` |

5. Click **Save**
6. **Redeploy your app** (important!)

---

### **STEP 3: Integrate Rate Throttle (5 minutes)**

**File:** `src/lib/whatsapp/meta/messageService.ts`

**Find this function:**
```typescript
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  components: any[],
  campaignId?: string
): Promise<WhatsAppMessageResponse> {
```

**Add ONE LINE at the very top of the function (before any other code):**

```typescript
import { getMessageRateThrottle } from '@/lib/whatsapp/messageRateThrottle';

export async function sendTemplateMessage(
  to: string,
  templateName: string,
  components: any[],
  campaignId?: string
): Promise<WhatsAppMessageResponse> {
  
  // 🚦 RATE THROTTLE: Wait for available slot
  await getMessageRateThrottle().waitForSlot();
  
  // ... rest of your existing code (Meta API call, etc.)
```

**That's it!** This prevents Meta 429 errors by limiting to 10 msg/sec.

---

### **STEP 4: Integrate Warmup Manager (15 minutes)**

**File:** `src/app/api/campaigns/[id]/execute-batch/route.ts`

**Add these imports at the top:**
```typescript
import { getAccountWarmupManager } from '@/lib/whatsapp/accountWarmupManager';
```

**Find where you start sending messages (likely after fetching campaign data), add BEFORE sending:**

```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  
  // ... your existing validation code ...
  
  // 🔥 CHECK WARMUP LIMITS BEFORE SENDING
  const warmupManager = getAccountWarmupManager();
  const accountId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const BATCH_SIZE = 100; // Or whatever your batch size is
  
  const warmupCheck = await warmupManager.canSend(accountId, BATCH_SIZE);
  if (!warmupCheck.allowed) {
    console.warn(`⚠️ Daily limit reached: ${warmupCheck.reason}`);
    return NextResponse.json({
      success: false,
      error: warmupCheck.reason,
      remainingToday: warmupCheck.remainingToday,
      dailyLimit: warmupCheck.dailyLimit
    }, { status: 429 });
  }
  
  // ... your existing batch sending code ...
  
  // AFTER SUCCESSFUL SEND (at the end, before return):
  await warmupManager.recordSent(accountId, successCount);
  
  return NextResponse.json({
    success: true,
    sent: successCount,
    failed: failCount,
    remainingToday: warmupCheck.remainingToday - successCount,
    dailyLimit: warmupCheck.dailyLimit
  });
}
```

**What this does:** Stops sending if you hit daily limit (200/day for new accounts, scales up over time).

---

### **STEP 5: Integrate State Validator (15 minutes)**

#### **5A: Start Campaign Route**

**File:** `src/app/api/campaigns/[id]/start/route.ts`

**Add imports:**
```typescript
import { getCampaignStateValidator } from '@/lib/whatsapp/campaignStateValidator';
```

**Add validation BEFORE starting campaign:**
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const campaignId = params.id;
  
  // Fetch campaign from DynamoDB
  const campaign = await getCampaignMetadata(campaignId); // Your existing function
  
  // 🔒 VALIDATE STATE TRANSITION
  const validator = getCampaignStateValidator();
  const canStartResult = validator.canStart(campaign.status, campaign.totalRecipients || 0);
  
  if (!canStartResult.allowed) {
    return NextResponse.json({
      success: false,
      error: canStartResult.reason
    }, { status: 400 });
  }
  
  // ... rest of your existing start logic ...
}
```

#### **5B: Pause Campaign Route**

**File:** `src/app/api/campaigns/[id]/pause/route.ts`

```typescript
import { getCampaignStateValidator } from '@/lib/whatsapp/campaignStateValidator';

export async function POST(...) {
  const campaign = await getCampaignMetadata(campaignId);
  
  const validator = getCampaignStateValidator();
  const canPauseResult = validator.canPause(campaign.status);
  
  if (!canPauseResult.allowed) {
    return NextResponse.json({ success: false, error: canPauseResult.reason }, { status: 400 });
  }
  
  // ... existing pause logic ...
}
```

#### **5C: Complete Campaign Route** (if you have one)

Same pattern - call `validator.canComplete(campaign.status)` before completing.

**What this does:** Prevents illegal transitions (e.g., can't restart a completed campaign).

---

### **STEP 6: Set Up AWS EventBridge (15 minutes)**

Now that integration is done, set up the automatic trigger.

#### **Option A: AWS Console (Easiest for beginners)**

1. Go to **AWS Console** → Search for **EventBridge**
2. Click **Rules** → **Create rule**
3. Fill in:
   - **Name:** `streefi-campaign-dispatcher`
   - **Description:** `Triggers campaign dispatcher every 5 minutes`
   - **Event bus:** `default`
   - **Rule type:** `Schedule`
   
4. Click **Next**

5. **Schedule pattern:**
   - Choose: **A fine-grained schedule**
   - **Cron expression:** `*/5 * * * ? *` (every 5 minutes)
   - **Flexible time window:** Off
   
6. Click **Next**

7. **Select target:**
   - **Target type:** `EventBridge API destination`
   - Click **Create a new API destination**
   
8. **Create API destination:**
   - **Name:** `streefi-dispatcher-api`
   - **API destination endpoint:** `https://YOUR_AMPLIFY_URL/api/campaigns/dispatch`
     - Replace `YOUR_AMPLIFY_URL` with your actual Amplify URL (e.g., `main.d1a2b3c4.amplifyapp.com`)
   - **HTTP method:** `POST`
   - **Connection:**
     - Click **Create a new connection**
     - **Connection name:** `streefi-auth`
     - **Destination type:** Other
     - **Authorization type:** `API key`
     - **API key name:** `x-dispatcher-key`
     - **Value:** (paste your DISPATCHER_SECRET_KEY from Step 1)
     - Click **Create**
   
9. Click **Next** → **Next** → **Create rule**

**Done!** EventBridge will now trigger your dispatcher every 5 minutes.

**Why 5 minutes?** WhatsApp campaigns aren't real-time systems. 5-minute polling is perfect and reduces unnecessary compute by 80%.

#### **Option B: AWS CLI (For advanced users)**

See [AWS-AMPLIFY-CRON-SETUP.md](AWS-AMPLIFY-CRON-SETUP.md) for full CLI commands.

---

### **STEP 7: Test Everything (20 minutes)**

#### **Test 1: Warmup Status**

```powershell
# Replace with your Amplify URL
$AMPLIFY_URL = "https://your-app.amplifyapp.com"

Invoke-RestMethod -Uri "$AMPLIFY_URL/api/whatsapp-admin/warmup-status"
```

**Expected output:**
```json
{
  "accountAge": 0,
  "dailyLimit": 200,
  "currentDaySent": 0,
  "remainingToday": 200,
  "qualityTier": "GREEN"
}
```

#### **Test 2: Dispatcher Health Check**

```powershell
Invoke-RestMethod -Uri "$AMPLIFY_URL/api/campaigns/dispatch"
```

**Expected output:**
```json
{
  "pendingCampaigns": 2,
  "campaigns": [...]
}
```

#### **Test 3: Manual Dispatcher Trigger**

```powershell
# Use the secret key from Step 1
$SECRET_KEY = "your_secret_key_here"

Invoke-RestMethod `
  -Uri "$AMPLIFY_URL/api/campaigns/dispatch" `
  -Method POST `
  -Headers @{ "x-dispatcher-key" = $SECRET_KEY }
```

**Expected output:**
```json
{
  "success": true,
  "dispatched": 2,
  "failed": 0
}
```

#### **Test 4: Create and Run a Test Campaign**

1. Create a small test campaign (5-10 recipients)
2. Set status to `RUNNING`
3. Wait 1 minute
4. Check campaign metrics - should see messages being sent automatically

---

### **STEP 8: Monitor (Ongoing)**

#### **Check EventBridge is Working:**

1. **AWS EventBridge Console** → Rules → `streefi-campaign-dispatcher` → Metrics
2. Should see ~12 invocations/hour (every 5 minutes)

#### **Check CloudWatch Logs:**

```powershell
# View EventBridge execution logs
aws logs tail /aws/events/rules/streefi-campaign-dispatcher --follow
```

#### **Monitor Campaign Progress:**

```powershell
# Check specific campaign
Invoke-RestMethod -Uri "$AMPLIFY_URL/api/campaigns/YOUR_CAMPAIGN_ID"
```

---

## ✅ COMPLETION CHECKLIST

- [ ] Step 1: Generated dispatcher secret key
- [ ] Step 2: Added environment variables to Amplify (redeployed)
- [ ] Step 3: Integrated rate throttle into messageService.ts
- [ ] Step 4: Integrated warmup manager into execute-batch route
- [ ] Step 5: Integrated state validator into start/pause routes
- [ ] Step 6: Created EventBridge rule
- [ ] Step 7: Tested all endpoints (warmup, dispatcher, manual trigger)
- [ ] Step 8: Verified EventBridge is triggering every 5 minutes

---

## 🎉 WHEN COMPLETE

Your system will:
- ✅ Automatically execute campaigns (no manual intervention)
- ✅ Respect rate limits (10 msg/sec, prevents Meta 429 errors)
- ✅ Enforce warmup schedule (Day 1: 200/day → Day 30+: 10,000/day)
- ✅ Prevent illegal state transitions (can't restart completed campaigns)
- ✅ Handle 50,000-200,000 messages/day safely

**Total time: ~90 minutes**

---

## 🆘 IF YOU GET STUCK

**Integration issues?** → See [PHASE-4-SETUP-GUIDE.md](PHASE-4-SETUP-GUIDE.md) for detailed code examples

**EventBridge issues?** → See [AWS-AMPLIFY-CRON-SETUP.md](AWS-AMPLIFY-CRON-SETUP.md) for troubleshooting

**Questions?** → Check the docs or ask me!
