# 🧪 DRY RUN TESTING GUIDE

## Quick Setup ✅

Your system is now configured for **100% offline testing**:

- ✅ `META_DRY_RUN=true` (no real Meta API calls)
- ✅ `WHATSAPP_DAILY_LIMIT=5` (aggressive testing)
- ✅ Table name bug fixed

---

## Option 1: Terminal Testing (Simplest)

### Step 1: Start Your Dev Server

```powershell
npm run dev
```

Wait for: `Ready on http://localhost:3000`

---

### Step 2: Run Tests in New Terminal

Open a **new PowerShell terminal** and run these commands:

#### Test 1 - Create Campaign

```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/campaigns/create" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"name":"Dry Run Test","templateName":"hello_world","channel":"WHATSAPP","audienceType":"CSV"}'

$campaignId = $response.campaignId
Write-Host "Campaign ID: $campaignId"
```

**Expected:** You get a campaign ID starting with `cmp_`

---

#### Test 2 - Populate 10 Recipients

Create a test file first:

```powershell
@"
919876543210
919876543211
919876543212
919876543213
919876543214
919876543215
919876543216
919876543217
919876543218
919876543219
"@ | Out-File -FilePath test-numbers.csv -Encoding UTF8
```

Then populate:

```powershell
curl.exe -X POST `
  -F "file=@test-numbers.csv" `
  "http://localhost:3000/api/campaigns/$campaignId/populate"
```

**Expected:** `"inserted": 10`

---

#### Test 3 - Start Campaign

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/campaigns/$campaignId/control" `
  -Method POST `
  -ContentType "application/json" `
  -Body '{"action":"start"}'
```

**Expected:** `"newStatus": "RUNNING"`

---

#### Test 4 - Execute Batch (First Run)

```powershell
$result = Invoke-RestMethod -Uri "http://localhost:3000/api/campaigns/$campaignId/execute-batch" `
  -Method POST

$result | ConvertTo-Json -Depth 5
```

**Expected:**

```json
{
  "processed": 5,
  "sent": 5,
  "failed": 0,
  "paused": true,
  "reason": "Daily conversation limit reached (5/5)"
}
```

---

#### Test 5 - Execute Batch (Second Run - Idempotency Test)

```powershell
$result2 = Invoke-RestMethod -Uri "http://localhost:3000/api/campaigns/$campaignId/execute-batch" `
  -Method POST

$result2 | ConvertTo-Json -Depth 5
```

**Expected:**

```json
{
  "processed": 0,
  "sent": 0,
  "reason": "Campaign is paused"
}
```

---

#### Test 6 - Verify Final State

```powershell
$status = Invoke-RestMethod -Uri "http://localhost:3000/api/campaigns/$campaignId"

Write-Host "`n=== FINAL RESULTS ===" -ForegroundColor Green
Write-Host "Campaign Status: $($status.status)"
Write-Host "Sent Count: $($status.metrics.sentCount)"
Write-Host "Failed Count: $($status.metrics.failedCount)"
Write-Host "Total Recipients: $($status.metrics.totalRecipients)"
Write-Host "Progress: $(($status.metrics.sentCount/$status.metrics.totalRecipients)*100)%"
```

**Expected Output:**

```
=== FINAL RESULTS ===
Campaign Status: PAUSED
Sent Count: 5
Failed Count: 0
Total Recipients: 10
Progress: 50%
```

---

## Option 2: UI Testing (Visual)

1. **Start dev server:**

   ```powershell
   npm run dev
   ```
2. **Open browser:**

   ```
   http://localhost:3000/whatsapp-admin
   ```
3. **Follow the UI flow:**

   - Enter campaign ID from Test 1
   - Click "Load Campaign"
   - Click "Start Campaign"
   - Click "Execute Batch"
   - Watch metrics update in real-time

---

## ✅ Success Criteria

After Test 6, you should see:

| Metric                  | Expected    | Critical?            |
| ----------------------- | ----------- | -------------------- |
| Campaign Status         | `PAUSED`  | ✅ YES               |
| sentCount               | `5`       | ✅ YES               |
| Recipients with SENT    | `5`       | ✅ YES               |
| Recipients with PENDING | `5`       | ✅ YES               |
| Daily Counter           | `5/5`     | ✅ YES               |
| Second execute-batch    | 0 processed | ✅ YES (idempotency) |

---

## 🎯 What This Validates

- ✅ Campaign lifecycle (DRAFT → RUNNING → PAUSED)
- ✅ Atomic counter correctness
- ✅ Daily limit enforcement
- ✅ Auto-pause logic
- ✅ Idempotency (no double-send)
- ✅ No Meta API calls made

---

## 🚨 If Something Fails

Check the terminal where `npm run dev` is running:

- Look for `[DRY RUN]` logs
- Check for `[GUARD]` logs showing limit checks
- Watch for `[CampaignExecutor]` logs

---

## Next Steps After Success

Once all 6 tests pass:

1. **Keep dry mode ON**
2. **Test crash recovery** (kill server mid-batch, restart)
3. **Test multiple campaigns** (isolation)
4. **Test daily limit reset** (change date, run again)

**DO NOT disable dry mode until Phase 1A.5**

---

## Quick All-in-One Test Script

Save this as `test-dry-run.ps1`:

```powershell
# Create campaign
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/campaigns/create" `
  -Method POST -ContentType "application/json" `
  -Body '{"name":"Dry Run Test","templateName":"hello_world","channel":"WHATSAPP","audienceType":"CSV"}'
$campaignId = $response.campaignId
Write-Host "Campaign: $campaignId" -ForegroundColor Cyan

# Create CSV
@"
919876543210
919876543211
919876543212
919876543213
919876543214
919876543215
919876543216
919876543217
919876543218
919876543219
"@ | Out-File -FilePath test-numbers.csv -Encoding UTF8

# Populate
curl.exe -X POST -F "file=@test-numbers.csv" "http://localhost:3000/api/campaigns/$campaignId/populate"

# Start
Invoke-RestMethod -Uri "http://localhost:3000/api/campaigns/$campaignId/control" `
  -Method POST -ContentType "application/json" -Body '{"action":"start"}'

# Execute
$result = Invoke-RestMethod -Uri "http://localhost:3000/api/campaigns/$campaignId/execute-batch" -Method POST
$result | ConvertTo-Json -Depth 5

# Status
$status = Invoke-RestMethod -Uri "http://localhost:3000/api/campaigns/$campaignId"
Write-Host "`n=== RESULTS ===" -ForegroundColor Green
Write-Host "Status: $($status.status) | Sent: $($status.metrics.sentCount)/10"
```

Run it: `.\test-dry-run.ps1`
