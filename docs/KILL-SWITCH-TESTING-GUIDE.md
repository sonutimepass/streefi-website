# Kill Switch Integration - Testing Guide

**Status**: ✅ Implemented  
**Date**: March 5, 2026  
**Critical Fix**: Step 1 of 3 (Production Hardening)

---

## 🛡️ What Was Implemented

Kill switch checks added at **every sending point** in the system:

### 1. Execute-Batch API (`/api/campaigns/[id]/execute-batch`)

**Check Points**:
- ✅ **Before batch starts** (line ~350)
  - If enabled → Pauses campaign and returns immediately
  - No recipients processed
  
- ✅ **Before each recipient send** (line ~415)
  - If enabled mid-batch → Resets claimed recipient back to PENDING
  - Pauses campaign immediately
  - Stops loop execution
  - Prevents partial sends

**Behavior**:
```typescript
// Before batch
if (killSwitch.enabled) {
  → Pause campaign
  → Return: { paused: true, pauseReason: "EMERGENCY_STOP: ..." }
}

// During batch (in loop)
if (killSwitch.enabled) {
  → Reset current recipient to PENDING
  → Pause campaign
  → Break loop (stop immediately)
}
```

### 2. Control API (`/api/campaigns/[id]/control`)

**Check Point**:
- ✅ **Before START action** (blocks campaign start)
- ✅ **Before RESUME action** (blocks campaign resume)
- ⏭️ **PAUSE action** (allowed - no check needed)

**Behavior**:
```typescript
if (action === 'start' || action === 'resume') {
  if (killSwitch.enabled) {
    → Return 403 Forbidden
    → Message: "Cannot start/resume: Emergency kill switch is enabled"
  }
}
```

### 3. Test Send API (`/api/whatsapp-admin/send-template`)

**Check Point**:
- ✅ **Before sending test message** (line ~145)

**Behavior**:
```typescript
if (killSwitch.enabled) {
  → Return 403 Forbidden
  → Message: "Cannot send: Emergency kill switch is enabled"
}
```

---

## 🧪 Manual Testing Checklist

### Test 1: Kill Switch Blocks Batch Execution

**Setup**:
1. Create a test campaign with 10 recipients
2. Set campaign to READY status
3. Enable kill switch in UI (top-right button)

**Test**:
```bash
POST /api/campaigns/{campaignId}/execute-batch
```

**Expected Result**:
- ✅ No messages sent
- ✅ Response: `{ paused: true, pauseReason: "EMERGENCY_STOP: ..." }`
- ✅ Campaign status → PAUSED
- ✅ All recipients remain PENDING

**Verify in logs**:
```
🛡️ [Batch Executor] Checking emergency kill switch...
🚨 [Batch Executor] KILL SWITCH ENABLED - Stopping execution
```

---

### Test 2: Kill Switch Stops Mid-Batch

**Setup**:
1. Create campaign with 50 recipients
2. Start campaign (status → RUNNING)
3. Trigger execute-batch
4. **QUICKLY** enable kill switch while batch is running (within 2-3 seconds)

**Expected Result**:
- ✅ First few messages sent (before kill switch enabled)
- ✅ Remaining recipients NOT sent
- ✅ Current recipient reset to PENDING (not stuck in PROCESSING)
- ✅ Campaign paused immediately
- ✅ Loop stops (no more sends)

**Verify in DB**:
- Some recipients: SENT
- Current recipient: PENDING (was reset)
- Remaining recipients: PENDING
- Campaign status: PAUSED

---

### Test 3: Kill Switch Blocks Campaign Start

**Setup**:
1. Create campaign with status READY
2. Enable kill switch

**Test**:
```bash
POST /api/campaigns/{campaignId}/control
Body: { "action": "start" }
```

**Expected Result**:
- ✅ HTTP 403 Forbidden
- ✅ Response: `{ error: "Cannot start/resume: Emergency kill switch is enabled" }`
- ✅ Campaign status remains READY (not changed to RUNNING)

**Verify in logs**:
```
🛡️ [Campaign Control API] Checking emergency kill switch...
🚨 [Campaign Control API] KILL SWITCH ENABLED - Blocking start/resume
```

---

### Test 4: Kill Switch Blocks Campaign Resume

**Setup**:
1. Campaign with status PAUSED (paused manually)
2. Enable kill switch

**Test**:
```bash
POST /api/campaigns/{campaignId}/control
Body: { "action": "resume" }
```

**Expected Result**:
- ✅ HTTP 403 Forbidden
- ✅ Campaign remains PAUSED

---

### Test 5: Kill Switch Blocks Test Sends

**Setup**:
1. Enable kill switch
2. Go to Templates tab in admin UI
3. Try to send test message

**Test**:
```bash
POST /api/whatsapp-admin/send-template
Body: {
  "templateName": "hello_world",
  "recipient": "919876543210"
}
```

**Expected Result**:
- ✅ HTTP 403 Forbidden
- ✅ No message sent to Meta API
- ✅ Response: `{ error: "Cannot send: Emergency kill switch is enabled" }`

---

### Test 6: Kill Switch Allows Pause (Sanity Check)

**Setup**:
1. Campaign RUNNING
2. Kill switch DISABLED

**Test**:
```bash
POST /api/campaigns/{campaignId}/control
Body: { "action": "pause", "reason": "Manual pause" }
```

**Expected Result**:
- ✅ HTTP 200 OK
- ✅ Campaign paused successfully
- ✅ No kill switch check (pause should always work)

---

### Test 7: Kill Switch Disabled → Everything Works

**Setup**:
1. Disable kill switch (UI or API)
2. Verify switch shows green/inactive state

**Test All Actions**:
- ✅ Start campaign → Works
- ✅ Resume campaign → Works
- ✅ Execute batch → Works
- ✅ Send test message → Works

---

## 🚨 Edge Cases to Verify

### Edge Case 1: Kill Switch DynamoDB Failure
**Scenario**: DynamoDB unavailable when checking kill switch

**Expected Behavior**:
```typescript
// In isKillSwitchEnabled() helper
catch (error) {
  // Fail-safe: If we can't check, assume it's enabled
  return { enabled: true, reason: 'System error - fail-safe activated' };
}
```

**Result**: System errs on side of caution (stops sending)

---

### Edge Case 2: Multiple Parallel Batch Executions
**Scenario**: 3 batch executions running simultaneously, kill switch enabled

**Expected Behavior**:
- Each execution checks kill switch independently
- All should stop within 1 send cycle
- All should pause campaign (last write wins, same end state)

---

### Edge Case 3: Kill Switch Race Condition
**Scenario**: Kill switch enabled between "check" and "send"

**Timeline**:
1. Check kill switch → disabled (passes)
2. **Kill switch enabled** ← race condition window
3. Send message → still proceeds

**Reality**: 
- ⚠️ Small race window (~100ms) exists
- Acceptable for emergency stop (not atomic at message level)
- Next recipient will be blocked
- Alternative: Would need distributed lock (overkill)

---

## 📊 Success Metrics

After testing, verify:
- [ ] Kill switch blocks all new batch executions
- [ ] Kill switch stops running batches within 1 send cycle
- [ ] Kill switch blocks campaign START/RESUME
- [ ] Kill switch blocks test sends
- [ ] Kill switch does NOT block PAUSE action
- [ ] Disabling kill switch resumes normal operation
- [ ] No recipients stuck in PROCESSING state after kill switch activation

---

## 🎯 Production Validation

Before launch:

### API Test (Automated)
```bash
# 1. Enable kill switch
curl -X POST /api/whatsapp-admin/kill-switch \
  -H "Content-Type: application/json" \
  -d '{"action": "enable", "reason": "Production kill switch test"}'

# 2. Try to execute batch (should fail)
curl -X POST /api/campaigns/{campaignId}/execute-batch
# Expected: 200 OK with paused: true

# 3. Try to start campaign (should fail)
curl -X POST /api/campaigns/{campaignId}/control \
  -d '{"action": "start"}'
# Expected: 403 Forbidden

# 4. Disable kill switch
curl -X POST /api/whatsapp-admin/kill-switch \
  -d '{"action": "disable"}'

# 5. Try again (should work)
curl -X POST /api/campaigns/{campaignId}/control \
  -d '{"action": "start"}'
# Expected: 200 OK
```

### UI Test
1. Open admin dashboard
2. Start a campaign
3. Click kill switch (top-right)
4. Confirm modal
5. Verify campaign pauses within 1-2 seconds
6. Try to start another campaign → Should be blocked with error message

---

## 🔧 Troubleshooting

### Issue: "Kill switch not stopping batch"
**Check**:
- Kill switch status in DynamoDB: `SYSTEM#KILL_SWITCH` record
- Batch executor logs: Search for "Checking emergency kill switch"
- Ensure import is correct: `import { isKillSwitchEnabled } from '@/app/api/whatsapp-admin/kill-switch/route'`

### Issue: "Recipients stuck in PROCESSING"
**Check**:
- Was kill switch enabled mid-batch?
- Verify reset logic in execute-batch loop (should set back to PENDING)
- Run manual query to reset: `SET status = 'PENDING' WHERE status = 'PROCESSING'`

### Issue: "Can't start campaigns even with kill switch disabled"
**Check**:
- Verify kill switch API GET returns `{ enabled: false }`
- Check browser console for JS errors
- Verify DynamoDB connection (network/credentials)

---

## ✅ Next Steps

After validating kill switch integration:

1. **Step 2**: Implement exponential backoff for 429 errors
2. **Step 3**: Add DB failure recovery for orphaned recipients
3. **Final**: Run full integration test with all 3 safeguards

**Current Status**: Ready for Step 1 testing ✅
