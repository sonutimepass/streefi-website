# Phase 1A - Campaign Executor Worker - Complete Guide

## 🎯 What is Phase 1A?

Phase 1A is the **production-safe campaign execution engine** for WhatsApp bulk messaging. It's a stateless batch processor that sends messages safely within Meta's rate limits and daily conversation caps.

---

## 📐 Architecture

### Execution Model: **Stateless Batch Executor**

Each invocation:
- Processes **exactly 25 recipients**
- Then **exits**
- Can be triggered manually or via scheduler
- Completely crash-safe and idempotent

### Why This Model?

✅ **Serverless-friendly** - No long-running processes  
✅ **Crash-safe** - Partial batches don't corrupt state  
✅ **Scalable** - Easy to add queue/cron triggers later  
✅ **Testable** - Each batch is independent  

---

## 🔧 Components Built

### 1. Batch Executor API
**Location:** `src/app/api/campaigns/[id]/execute-batch/route.ts`

**Endpoint:** `POST /api/campaigns/{id}/execute-batch`

**What it does:**
1. Validates campaign status == `RUNNING`
2. Queries 25 `PENDING` recipients
3. For each recipient:
   - ✅ Checks daily limit via `DailyLimitGuard`
   - ✅ Sends template via `MessageService`
   - ✅ Updates recipient status atomically
   - ✅ Updates campaign metrics atomically
4. If limit hit → Pauses campaign with reason
5. If no pending → Completes campaign
6. Returns batch summary

**Safety Features:**
- Guard runs **BEFORE** sending (never send first!)
- Atomic updates (uses DynamoDB `ADD` for counters)
- Sequential sends with 50ms delay (20 msg/sec safe)
- Only sends to `PENDING` recipients (idempotent)

---

### 2. Campaign Control API
**Location:** `src/app/api/campaigns/[id]/control/route.ts`

**Endpoint:** `POST /api/campaigns/{id}/control`

**Actions:**
- `start` - Start a DRAFT campaign → sets status to RUNNING
- `pause` - Pause a RUNNING campaign → sets status to PAUSED
- `resume` - Resume a PAUSED campaign → sets status to RUNNING

**State Transitions:**
```
DRAFT → RUNNING (start)
RUNNING → PAUSED (pause)
PAUSED → RUNNING (resume)
RUNNING → COMPLETED (auto, when no pending)
```

**Invalid Transitions Rejected:**
- Can't start a COMPLETED campaign
- Can't pause a DRAFT campaign
- Can't resume a RUNNING campaign

---

### 3. Campaign Details API
**Location:** `src/app/api/campaigns/[id]/route.ts`

**Endpoint:** `GET /api/campaigns/{id}`

**Returns:**
- Campaign metadata (name, template, status)
- Real-time metrics (sent, failed, pending counts)
- Progress percentage
- Pause reason (if paused)
- Timestamps (created, started, paused, completed)

---

### 4. Campaign Executor UI
**Location:** `src/modules/whatsapp-admin/components/CampaignSection/index.tsx`

**Features:**
- Load campaign by ID
- View real-time status and metrics
- Start/Pause/Resume controls
- Manual batch executor button
- Progress bar
- Last batch result display

**How It Works:**
1. Enter campaign ID (from create endpoint)
2. Click "Load" to fetch campaign details
3. Click "Start Campaign" to set status to RUNNING
4. Click "Execute Batch (25)" to process 25 recipients
5. Repeat step 4 until campaign completes or pauses
6. If paused (daily limit), resume tomorrow

---

## 🚀 How to Use

### Step 1: Create a Campaign

```bash
POST /api/campaigns/create
{
  "name": "Test Campaign",
  "templateName": "vendor_signup_confirmation",
  "channel": "WHATSAPP",
  "audienceType": "CSV"
}
```

**Response:**
```json
{
  "success": true,
  "campaignId": "cmp_12345678-1234-1234-1234-123456789abc"
}
```

---

### Step 2: Populate Recipients

```bash
POST /api/campaigns/cmp_12345678-1234-1234-1234-123456789abc/populate
Content-Type: multipart/form-data

# Upload CSV with phone numbers (one per line)
919876543210
918765432109
```

**Response:**
```json
{
  "success": true,
  "inserted": 100
}
```

---

### Step 3: Start Campaign

```bash
POST /api/campaigns/cmp_12345678-1234-1234-1234-123456789abc/control
{
  "action": "start"
}
```

**Response:**
```json
{
  "success": true,
  "newStatus": "RUNNING"
}
```

---

### Step 4: Execute Batch (Manual Trigger)

```bash
POST /api/campaigns/cmp_12345678-1234-1234-1234-123456789abc/execute-batch
```

**Response:**
```json
{
  "success": true,
  "result": {
    "processed": 25,
    "sent": 23,
    "failed": 2,
    "paused": false,
    "completed": false
  }
}
```

---

### Step 5: Repeat or Pause

**If more recipients exist:**
- Repeat Step 4 to process next batch

**If daily limit reached:**
```json
{
  "result": {
    "processed": 10,
    "sent": 10,
    "paused": true,
    "pauseReason": "Daily limit reached: 200/200 conversations"
  }
}
```

**If completed:**
```json
{
  "result": {
    "processed": 0,
    "completed": true,
    "pauseReason": "No pending recipients remaining"
  }
}
```

---

## 🔐 Safety Rules (CRITICAL)

### 1️⃣ Guard Runs BEFORE Sending

```typescript
// ✅ CORRECT
const limitCheck = await guard.checkLimit(phone);
if (!limitCheck.allowed) {
  pauseCampaign();
  break;
}
await sendTemplate();
```

```typescript
// ❌ WRONG - Never send first!
await sendTemplate();
await guard.increment(); // Too late!
```

---

### 2️⃣ Atomic Recipient Updates

```typescript
// ✅ CORRECT - ADD for attempts
UpdateExpression: "SET status = :sent, sentAt = :now ADD attempts :inc"
```

```typescript
// ❌ WRONG - Read-modify-write race
const recipient = await get();
recipient.attempts += 1;
await put(recipient); // Lost updates!
```

---

### 3️⃣ Atomic Campaign Metrics

```typescript
// ✅ CORRECT - ADD for counters
UpdateExpression: "ADD sentCount :inc"
```

```typescript
// ❌ WRONG - Read-modify-write race
const campaign = await get();
campaign.sentCount += 1;
await put(campaign); // Lost updates!
```

---

### 4️⃣ Rate Control

```typescript
// ✅ CORRECT - Sequential with delay
for (const recipient of recipients) {
  await sendTemplate(recipient);
  await sleep(50); // 20 msg/sec
}
```

```typescript
// ❌ WRONG - Blasting all at once
await Promise.all(
  recipients.map(r => sendTemplate(r))
); // Rate limit hit!
```

---

## 🔄 Crash Recovery

**Scenario:** Lambda crashes mid-batch

**What happens:**
- Some recipients marked `SENT` ✅
- Some still `PENDING` ✅
- **No duplicates** (only sends to PENDING)

**Next invocation:**
- Picks up remaining `PENDING` recipients
- Continues cleanly from where it left off

This is **idempotent** - safe to run repeatedly.

---

## 📊 Monitoring

### Campaign Status

```bash
GET /api/campaigns/{id}
```

**Check:**
- Current status
- Sent/Failed/Pending counts
- Progress percentage
- Pause reason

### DynamoDB Tables

**Campaigns Table:**
```
PK: CAMPAIGN#cmp_xxx
SK: METADATA
status: RUNNING | PAUSED | COMPLETED
sentCount: 150
failedCount: 5
```

**Recipients Table:**
```
PK: CAMPAIGN#cmp_xxx
SK: USER#919876543210
status: PENDING | SENT | FAILED
attempts: 1
messageId: wamid.xxx (if SENT)
errorCode: META_131031 (if FAILED)
```

**Daily Counter:**
```
PK: DAILY_COUNTER#2026-02-25
SK: METADATA
count: 150 (conversations today)
```

---

## 🚦 Rate Limits

### Meta Tier 250
- **250 business-initiated conversations / 24h**
- Streefi safety cap: **200 / 24h** (80% buffer)
- Per-message rate: **20 msg/sec** (50ms delay)

### Retry Strategy
- **Retryable errors:** Rate limit (130429), Server errors (500, 503)
- **Non-retryable:** Auth failures (190), Invalid params (100), Quality restrictions (131031)
- **Max retries:** 3 attempts
- **After max:** Mark as `FAILED`

---

## 🔮 Future Enhancements (Beyond Phase 1A)

### Phase 1B: Automated Triggers
- AWS EventBridge cron → hits `/execute-batch` every N minutes
- No code changes needed (same endpoint)

### Phase 2: Queue-Based Processing
- SQS queue for batches
- Lambda consumer processes queue
- Better concurrency control

### Phase 3: Advanced Features
- Multi-template support
- Dynamic parameter injection
- A/B testing
- Send time optimization

---

## 🧪 Testing Flow

### 1. Create Test Campaign
```bash
POST /api/campaigns/create
{
  "name": "Test Campaign",
  "templateName": "your_approved_template",
  "channel": "WHATSAPP",
  "audienceType": "CSV"
}
```

### 2. Add Test Recipients
Create `test-phones.csv`:
```
919876543210
918765432109
919812345678
```

Upload via `/populate` endpoint.

### 3. Test in WhatsApp Admin UI
1. Login to `/whatsapp-admin`
2. Navigate to Campaign Executor section
3. Enter campaign ID
4. Click "Start Campaign"
5. Click "Execute Batch (25)"
6. Watch metrics update in real-time

### 4. Verify Results
- Check WhatsApp messages received
- Check DynamoDB recipient statuses
- Check daily counter increments

---

## 🐛 Troubleshooting

### Campaign Won't Start
**Error:** "Campaign status is COMPLETED"  
**Fix:** Create a new campaign (can't restart completed ones)

### Batch Returns 0 Processed
**Reason:** Status != RUNNING  
**Fix:** Call `/control` with action `start` or `resume`

### Campaign Auto-Paused
**Reason:** Daily limit reached  
**Fix:** Wait until tomorrow, then call `/control` with action `resume`

### Messages Not Sending
**Check:**
1. Template name matches approved template in Meta
2. Phone numbers in E.164 format (no + prefix in DynamoDB)
3. Meta credentials valid (`META_ACCESS_TOKEN`, `META_PHONE_NUMBER_ID`)
4. Daily limit not reached (`GET /api/campaigns/{id}`)

### TypeScript Errors
**Run:**
```bash
npm run type-check
```

---

## 📝 API Reference Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/campaigns/create` | POST | Create new campaign |
| `/api/campaigns/{id}` | GET | Get campaign details |
| `/api/campaigns/{id}/populate` | POST | Upload recipients |
| `/api/campaigns/{id}/control` | POST | Start/Pause/Resume |
| `/api/campaigns/{id}/execute-batch` | POST | Process 25 recipients |

---

## 🎉 What You Now Have

✅ **Production-safe batch executor**  
✅ **Manual trigger capability**  
✅ **Atomic operations (no race conditions)**  
✅ **Crash-safe and idempotent**  
✅ **Daily limit enforcement**  
✅ **Pause/resume functionality**  
✅ **Real-time metrics**  
✅ **Clean UI for testing**  

This is the **foundation** for your entire campaign system.

Everything else (cron, queue, advanced features) builds on this rock-solid core.

---

## 🚀 Next Steps

Want to automate execution?

### Option A: AWS EventBridge (Recommended)
1. Create EventBridge rule
2. Trigger: `rate(1 minute)`
3. Target: API Gateway → `/execute-batch`
4. Add campaign ID to payload

### Option B: Simple Cron Script
```javascript
// cron-executor.js
setInterval(async () => {
  await fetch('/api/campaigns/{id}/execute-batch', { method: 'POST' });
}, 60000); // Every minute
```

### Option C: Keep Manual
For Tier 250 (200 daily), manual execution is viable:
- Takes ~4-8 batch executions to send 100-200
- 2-3 minutes total per day
- Good for MVP validation

---

**Phase 1A = Complete** 🎊

You now have a working campaign executor that respects all safety rules and can scale to higher tiers with zero code changes (just env var).
