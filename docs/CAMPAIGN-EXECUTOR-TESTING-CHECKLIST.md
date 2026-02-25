# Campaign Executor Testing Checklist

## ✅ Pre-Test Setup

- [ ] Meta Access Token configured (`META_ACCESS_TOKEN`)
- [ ] Meta Phone Number ID configured (`META_PHONE_NUMBER_ID`)
- [ ] DynamoDB tables exist:
  - [ ] `CAMPAIGNS` table
  - [ ] `RECIPIENTS` table
  - [ ] `WHATSAPP` table (for conversations & daily counter)
- [ ] WhatsApp template approved in Meta (note template name)
- [ ] WhatsApp admin auth working (`/whatsapp-admin` accessible)
- [ ] Daily limit configured (`WHATSAPP_DAILY_LIMIT` env var, default: 200)

---

## 📋 Test Sequence

### Test 1: Create Campaign ✅

**Endpoint:** `POST /api/campaigns/create`

**Request:**
```json
{
  "name": "Phase 1A Test Campaign",
  "templateName": "your_approved_template_name",
  "channel": "WHATSAPP",
  "audienceType": "CSV"
}
```

**Expected Response:**
```json
{
  "success": true,
  "campaignId": "cmp_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

**Verify:**
- [ ] `campaignId` returned
- [ ] DynamoDB: Campaign record created with status `DRAFT`

**Save:** Campaign ID for next tests

---

### Test 2: Populate Recipients ✅

**Endpoint:** `POST /api/campaigns/{campaignId}/populate`

**Create CSV File:**
```csv
919876543210
918765432109
919812345678
```
(Use real phone numbers you own for testing)

**Request:**
```bash
curl -X POST \
  -F "file=@test-phones.csv" \
  -H "Cookie: whatsapp-session=YOUR_SESSION" \
  /api/campaigns/{campaignId}/populate
```

**Expected Response:**
```json
{
  "success": true,
  "inserted": 3
}
```

**Verify:**
- [ ] Response shows correct count
- [ ] DynamoDB: Recipients created with status `PENDING`
- [ ] Campaign `totalRecipients` updated to 3

---

### Test 3: Load Campaign (UI) ✅

**Location:** `/whatsapp-admin` → Campaign Executor section

**Action:**
1. Enter campaign ID
2. Click "Load"

**Expected:**
- [ ] Campaign details displayed
- [ ] Status shows `DRAFT`
- [ ] Metrics: Total = 3, Sent = 0, Failed = 0, Pending = 3
- [ ] Progress bar at 0%
- [ ] "Start Campaign" button visible

---

### Test 4: Start Campaign ✅

**Method 1 - UI:**
1. Click "Start Campaign" button

**Method 2 - API:**
```bash
POST /api/campaigns/{campaignId}/control
{
  "action": "start"
}
```

**Expected Response:**
```json
{
  "success": true,
  "newStatus": "RUNNING"
}
```

**Verify:**
- [ ] Status changes to `RUNNING`
- [ ] "Execute Batch (25)" button appears
- [ ] DynamoDB: Campaign status = `RUNNING`
- [ ] `startedAt` timestamp set

---

### Test 5: Execute First Batch ✅

**Method 1 - UI:**
1. Click "Execute Batch (25)"
2. Wait for completion

**Method 2 - API:**
```bash
POST /api/campaigns/{campaignId}/execute-batch
```

**Expected Response:**
```json
{
  "success": true,
  "result": {
    "processed": 3,
    "sent": 3,
    "failed": 0,
    "paused": false,
    "completed": true
  }
}
```

**Verify:**
- [ ] Response shows processed count
- [ ] WhatsApp messages received on test phones
- [ ] DynamoDB Recipients:
  - [ ] Status = `SENT`
  - [ ] `sentAt` timestamp set
  - [ ] `messageId` present (wamid.xxx)
  - [ ] `attempts` = 1
- [ ] DynamoDB Campaign:
  - [ ] `sentCount` = 3
  - [ ] Status = `COMPLETED` (since no pending)
- [ ] Daily Counter:
  - [ ] `DAILY_COUNTER#2026-02-25` count = 3
- [ ] Conversations:
  - [ ] 3 conversation records created
  - [ ] Status = `open`

**UI Verify:**
- [ ] Metrics update: Sent = 3
- [ ] Progress bar = 100%
- [ ] Success message displayed
- [ ] Last batch result shows sent count

---

### Test 6: Invalid State Transitions ✅

**Test 6a: Try to start RUNNING campaign**
```bash
POST /api/campaigns/{campaignId}/control
{ "action": "start" }
```

**Expected:**
- [ ] Error: "Cannot start campaign in RUNNING status"
- [ ] Status unchanged

---

**Test 6b: Try to pause DRAFT campaign**
```bash
POST /api/campaigns/{campaignId}/control
{ "action": "pause" }
```

**Expected:**
- [ ] Error: "Cannot pause campaign in DRAFT status"
- [ ] Status unchanged

---

### Test 7: Pause/Resume Flow ✅

**Create new campaign with 30 recipients**
(To test multiple batches)

**Steps:**
1. Start campaign → Status = `RUNNING`
2. Execute batch → 25 sent
3. Pause campaign manually:
   ```bash
   POST /api/campaigns/{campaignId}/control
   { "action": "pause", "reason": "Manual test pause" }
   ```
4. Verify status = `PAUSED`
5. Try to execute batch → Should fail (status not RUNNING)
6. Resume campaign:
   ```bash
   POST /api/campaigns/{campaignId}/control
   { "action": "resume" }
   ```
7. Execute batch → Remaining 5 sent
8. Verify completed

**Verify:**
- [ ] Pause prevents execution
- [ ] Resume allows execution to continue
- [ ] Pause reason stored correctly

---

### Test 8: Daily Limit Guard ✅

**Setup:**
Set `WHATSAPP_DAILY_LIMIT=5` (temporarily for testing)

**Create campaign with 10 recipients**

**Steps:**
1. Start campaign
2. Execute batch

**Expected:**
- [ ] First 5 recipients sent successfully
- [ ] 6th recipient triggers limit
- [ ] Campaign auto-pauses
- [ ] `pausedReason` = "Daily limit reached: 5/5 conversations"
- [ ] Remaining 5 recipients still `PENDING`

**Verify:**
- [ ] Campaign status = `PAUSED`
- [ ] Daily counter = 5
- [ ] UI shows pause reason
- [ ] Can resume tomorrow (or after manual counter reset)

---

### Test 9: Retry Logic ✅

**Simulate retryable error:**
(Temporarily break Meta token to get 401)

**Steps:**
1. Set invalid `META_ACCESS_TOKEN`
2. Execute batch
3. Check recipient status

**Expected:**
- [ ] Recipients marked `FAILED` temporarily
- [ ] `errorCode` contains error code
- [ ] `attempts` incremented
- [ ] Status reset to `PENDING` for retry
- [ ] Campaign `failedCount` NOT incremented (retryable)

**Restore token and retry:**
4. Fix `META_ACCESS_TOKEN`
5. Execute batch again

**Expected:**
- [ ] Same recipients picked up
- [ ] Send succeeds
- [ ] Status = `SENT`

---

### Test 10: Rate Control ✅

**Create campaign with 25 recipients**

**Monitor execution time:**
```bash
time curl -X POST /api/campaigns/{campaignId}/execute-batch
```

**Expected:**
- [ ] Time >= 1.25 seconds (25 * 50ms = 1250ms)
- [ ] Messages sent sequentially (check logs)
- [ ] No rate limit errors from Meta

---

### Test 11: Idempotency ✅

**Steps:**
1. Create campaign with 10 recipients
2. Start campaign
3. Execute batch → 10 sent
4. Execute batch again (campaign completed)

**Expected:**
- [ ] Second execution returns `completed: true`
- [ ] `processed: 0` (no pending)
- [ ] No duplicate messages sent
- [ ] Metrics unchanged

---

### Test 12: Crash Recovery Simulation ✅

**Setup:**
Temporarily add forced error after 3rd recipient in batch executor:
```typescript
if (sent === 3) throw new Error('Simulated crash');
```

**Steps:**
1. Create campaign with 10 recipients
2. Start and execute batch
3. Execution crashes after 3 sends

**Verify Database State:**
- [ ] First 3 recipients: Status = `SENT`
- [ ] Remaining 7: Status = `PENDING`
- [ ] Campaign metrics: `sentCount` = 3
- [ ] Daily counter: count = 3

**Remove forced error and retry:**
4. Remove crash code
5. Execute batch again

**Expected:**
- [ ] Picks up remaining 7 `PENDING` recipients
- [ ] Sends successfully
- [ ] Final counts: Sent = 10, Campaign completed
- [ ] No duplicates

---

### Test 13: Load Testing (Small Scale) ✅

**Create campaign with 100 recipients**

**Execute repeatedly:**
```bash
for i in {1..4}; do
  curl -X POST /api/campaigns/{campaignId}/execute-batch
  sleep 2
done
```

**Expected:**
- [ ] Batch 1: 25 sent
- [ ] Batch 2: 25 sent
- [ ] Batch 3: 25 sent
- [ ] Batch 4: 25 sent
- [ ] Total: 100 sent, 0 failed
- [ ] Campaign completed
- [ ] All metrics accurate
- [ ] Daily counter = 100 (or less if existing conversations)

---

### Test 14: UI Responsiveness ✅

**Test all UI interactions:**
- [ ] Load campaign updates display
- [ ] Start button → Status changes
- [ ] Execute button shows loading state
- [ ] Progress bar animates
- [ ] Reload button refreshes data
- [ ] Error messages display correctly
- [ ] Success messages display correctly
- [ ] Last batch result updates

---

### Test 15: Multi-Campaign Isolation ✅

**Create 2 separate campaigns (A & B)**

**Steps:**
1. Start Campaign A, execute batch
2. Start Campaign B, execute batch
3. Check metrics for both

**Expected:**
- [ ] Campaign A metrics independent of B
- [ ] Each campaign processes own recipients
- [ ] Daily counter shared (counts all conversations)
- [ ] No cross-contamination

---

## 🐛 Error Scenarios to Test

### Scenario 1: Invalid Campaign ID
```bash
GET /api/campaigns/invalid-id
```
**Expected:**
- [ ] 404 error
- [ ] Clear error message

---

### Scenario 2: Missing Template
Create campaign with non-existent template name

**Expected:**
- [ ] Campaign creates successfully (template name not validated yet)
- [ ] Execute batch → Meta error
- [ ] Recipient marked `FAILED` with error code
- [ ] Campaign continues (non-retryable error)

---

### Scenario 3: Invalid Phone Number Format
Populate with invalid numbers:
```csv
123456
999999999999999999
abc123
```

**Expected:**
- [ ] Populate endpoint validates and skips invalid
- [ ] Only valid numbers inserted
- [ ] Warning logs for skipped numbers

---

### Scenario 4: DynamoDB Timeout
(Simulate by throttling DynamoDB capacity)

**Expected:**
- [ ] Batch executor returns 500 error
- [ ] No partial updates (atomic operations)
- [ ] Retry successful after capacity restored

---

## 📊 Post-Test Verification

### DynamoDB Table Counts
```bash
# Count total campaigns
aws dynamodb scan --table-name CAMPAIGNS

# Count total recipients
aws dynamodb scan --table-name RECIPIENTS

# Check daily counter
aws dynamodb get-item --table-name WHATSAPP \
  --key '{"PK":{"S":"DAILY_COUNTER#2026-02-25"},"SK":{"S":"METADATA"}}'
```

### Check Logs
- [ ] Review CloudWatch logs for errors
- [ ] Verify guard check logs
- [ ] Verify message send logs

### Meta Dashboard
- [ ] Login to Meta Business Manager
- [ ] Check message delivery stats
- [ ] Verify conversation counts

---

## ✅ Success Criteria

Phase 1A is fully working if:

- [ ] ✅ All 15 tests pass
- [ ] ✅ No duplicate messages sent
- [ ] ✅ Daily limit enforced correctly
- [ ] ✅ Atomic updates work (no race conditions)
- [ ] ✅ Crash recovery works
- [ ] ✅ UI responsive and accurate
- [ ] ✅ Pause/resume functional
- [ ] ✅ Rate limiting respected
- [ ] ✅ Idempotent execution
- [ ] ✅ Error handling robust

---

## 🔧 Useful SQL Queries (DynamoDB)

### View all campaigns
```bash
aws dynamodb query --table-name CAMPAIGNS \
  --key-condition-expression "begins_with(PK, :pk)" \
  --expression-attribute-values '{":pk":{"S":"CAMPAIGN#"}}'
```

### View campaign recipients
```bash
aws dynamodb query --table-name RECIPIENTS \
  --key-condition-expression "PK = :pk" \
  --expression-attribute-values '{":pk":{"S":"CAMPAIGN#cmp_xxx"}}'
```

### View daily counter
```bash
aws dynamodb get-item --table-name WHATSAPP \
  --key '{
    "PK": {"S": "DAILY_COUNTER#2026-02-25"},
    "SK": {"S": "METADATA"}
  }'
```

### Reset daily counter (for testing)
```bash
aws dynamodb delete-item --table-name WHATSAPP \
  --key '{
    "PK": {"S": "DAILY_COUNTER#2026-02-25"},
    "SK": {"S": "METADATA"}
  }'
```

---

## 🚨 Known Limitations (By Design)

These are NOT bugs, they're MVP constraints:

- ❌ No campaign list view (enter ID manually)
- ❌ No template parameter customization (uses default template)
- ❌ No scheduling (manual trigger only)
- ❌ No retry queue UI (auto-retry logic exists)
- ❌ No delivery reports UI (stored in DynamoDB)

These are Phase 2+ features. Phase 1A is the **engine**, not the full dashboard.

---

## 📝 Test Results Template

Copy and fill out:

```
# Phase 1A Test Results - [Date]

Tester: [Name]
Environment: [Dev/Staging/Prod]

## Test Summary
- Total Tests: 15
- Passed: __
- Failed: __
- Skipped: __

## Failed Tests
1. [Test Name] - [Reason] - [Action Needed]

## Notes
[Any observations or concerns]

## Recommendation
[ ] ✅ Ready for production
[ ] ⚠️ Minor fixes needed
[ ] ❌ Major issues found
```

---

**Happy Testing!** 🧪🚀
