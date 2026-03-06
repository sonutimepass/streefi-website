# WhatsApp Campaign Operations Guide
*Post-Meta Approval Workflow*

---

## 🎯 Overview

This guide covers **day-to-day operations** after Meta has approved your WhatsApp templates. Follow this workflow to create, execute, and monitor campaigns safely.

---

## 📋 Prerequisites Checklist

Before creating your first campaign:

- [ ] ✅ Meta Business Account verified
- [ ] ✅ WhatsApp Business API credentials configured
- [ ] ✅ At least ONE template approved by Meta (status: `APPROVED`)
- [ ] ✅ Phone number verified and operational
- [ ] ✅ Daily messaging limit confirmed (check Meta dashboard)
- [ ] ✅ Admin credentials set up (`/whatsapp-admin` login)
- [ ] ✅ Vendor data populated in database (recipients)

---

## 🚀 Campaign Creation Flow

### Step 1: Access WhatsApp Admin Dashboard

1. Navigate to: `https://yourdomain.com/whatsapp-admin`
2. Log in with admin credentials
3. You'll see:
   - ⚙️ **Settings**: Meta credentials, daily limits
   - 📋 **Templates**: Approved templates from Meta
   - 🚀 **Campaigns**: Active, paused, completed campaigns
   - 🛑 **Kill Switch**: Emergency stop (normally OFF)

---

### Step 2: Sync Templates from Meta

**Before creating a campaign, sync templates:**

1. Go to **Templates** tab
2. Click **"Sync Templates from Meta"**
3. Wait for sync to complete (usually 2-5 seconds)
4. Verify you see your approved templates with:
   - ✅ Status: `APPROVED`
   - Language code (e.g., `en_US`)
   - Component structure (header, body, footer, buttons)

**⚠️ Important:** Only `APPROVED` templates can be used for campaigns. If status shows `PENDING` or `REJECTED`, you cannot use that template yet.

---

### Step 3: Create Campaign

1. Go to **Campaigns** tab
2. Click **"Create New Campaign"**
3. Fill in campaign details:

#### Campaign Configuration Form

| Field | Description | Example | Rules |
|-------|-------------|---------|-------|
| **Campaign Name** | Internal identifier | `Summer Sale 2026` | Required, unique |
| **Template Name** | Select approved template | `vendor_success_message` | Must be APPROVED |
| **Daily Cap** | Max messages per day | `500` | **CRITICAL**: Set conservatively |
| **Target Audience** | Who receives this? | `All Active Vendors` | Filter criteria |

#### ⚠️ Daily Cap Guidelines

**Meta Daily Limits** (check your Meta dashboard):
- New number: 250 messages/day
- Tier 1: 1,000 messages/day
- Tier 2: 10,000 messages/day
- Tier 3: 100,000 messages/day

**Your Campaign Daily Cap:**
- **RULE**: Set campaign `dailyCap` to **70% of Meta limit**
- **Why**: Leave buffer for other campaigns, errors, retries
- **Example**: If Meta limit is 1,000 → Set dailyCap to `700`

---

### Step 4: Populate Recipients

After creating the campaign:

1. Campaign appears with status: `DRAFT`
2. Click **"Populate Recipients"**
3. System will:
   - Query your vendor database
   - Filter eligible recipients (has phone number, active status, etc.)
   - Insert recipients into campaign with status `PENDING`
   - Display: `totalRecipients` count

**Example Output:**
```
✅ Campaign populated successfully
Total Recipients: 1,247
Status: DRAFT → READY
```

---

### Step 5: Start Campaign

1. Review campaign summary:
   - Template name
   - Total recipients
   - Daily cap
   - Current metrics (all zeros)
2. Click **"Start Campaign"**
3. Status changes: `READY → RUNNING`
4. Campaign is now active and ready for batch execution

---

## ⚡ Batch Execution (The Most Important Part)

### How Batch Execution Works

**Stateless Processing:**
- Each batch processes exactly **25 recipients**
- Sends messages sequentially with 50ms delay (20 msg/sec)
- Updates metrics atomically (crash-safe)
- Exits after batch completes
- **You must trigger each batch manually or via cron**

### Safety Protections (Your 7 Layers)

When you click **"Execute Batch"**, the system enforces:

1. **Execution Lock**: Prevents concurrent batches (409 if locked)
2. **Rate Limit**: Max 5 requests per 60 seconds per IP
3. **Authentication**: Must have valid admin session
4. **Kill Switch**: Stops immediately if emergency stop enabled
5. **Cooldown**: 30-second minimum between batches (server-enforced)
6. **Daily Cap**: Auto-pauses if `sentCount >= dailyCap`
7. **Metrics Integrity**: Auto-pauses if corruption detected

### Manual Batch Execution

**Dashboard UI:**
1. Go to **Campaigns** tab
2. Find your `RUNNING` campaign
3. Click **"Execute Batch"** button
4. Button disables for 30 seconds (cooldown UI feedback)
5. Metrics update after completion:
   - `sentCount`: +X (successful sends)
   - `failedCount`: +Y (failures)
   - `processed`: X + Y

**⚠️ Spam-Click Protection:**
- UI disables button for 30s
- **BUT** server enforces cooldown independently
- If you somehow bypass UI → 429 Rate Limit or 409 Locked

### Automated Batch Execution (Recommended)

**Option A: AWS EventBridge Cron**

Set up a cron job to hit the endpoint:

```bash
# Every 1 minute (let server decide execution with cooldown + lock)
* * * * *

# EventBridge Target:
POST https://yourdomain.com/api/campaigns/{campaignId}/execute-batch
Authorization: Bearer {admin_session_token}
```

**⚠️ Critical: Cron Frequency Strategy**

- **Cron runs FASTER than batch interval** (every 1 min)
- **Server decides if batch should execute** (cooldown + lock)
- Why: Prevents lock conflicts as you scale
- Server cooldown (30s) + execution lock control actual throughput
- Never let cron dictate throughput - let system decide

**Option B: External Scheduler**

Use your preferred scheduler to call:
```bash
curl -X POST \
  https://yourdomain.com/api/campaigns/{campaignId}/execute-batch \
  -H "Cookie: wa_admin_session={token}" \
  -H "Content-Type: application/json"
```

---

## 📊 Monitoring & Metrics

### Real-Time Campaign Metrics

| Metric | Description | Watch For |
|--------|-------------|-----------|
| `totalRecipients` | Total users in campaign | Fixed after populate |
| `sentCount` | Successfully sent messages | Should increase steadily |
| `failedCount` | Failed deliveries | Should be < 5% |
| `processed` | sentCount + failedCount | Should never exceed totalRecipients |
| `status` | Current state | `RUNNING`, `PAUSED`, `COMPLETED` |

### Campaign Status States

```
DRAFT → (populate) → READY → (start) → RUNNING → (complete) → COMPLETED
                                      ↓
                                  (pause) 
                                      ↓
                                   PAUSED → (resume) → RUNNING
```

### Health Indicators

**✅ Healthy Campaign:**
- Status: `RUNNING`
- `sentCount` increasing with each batch
- `failedCount` < 5% of `sentCount`
- No `pauseReason` shown
- Batch executions completing in < 30 seconds

**⚠️ Warning Signs:**
- `failedCount` > 10% (check Meta API errors in logs)
- Batch execution taking > 60 seconds
- Campaign auto-paused (check `pauseReason`)
- Metrics not updating after execute-batch

**🚨 Critical Issues:**
- Campaign paused with `pauseReason: METRICS_CORRUPTION`
- Kill switch enabled
- `processed > totalRecipients` (should never happen)

---

## 🛠️ Campaign Management Operations

### Pause Campaign

**When to pause:**
- Need to review message content
- Meta API errors increasing
- End of business day
- Testing/debugging needed

**How to pause:**
1. Click **"Pause Campaign"**
2. Status: `RUNNING → PAUSED`
3. No more batches will execute
4. `pauseReason` logged (e.g., "Manual pause by admin")

### Resume Campaign

**Before resuming:**
- ✅ Verify Meta API credentials still valid
- ✅ Check daily limit not reached
- ✅ Review failed messages in logs
- ✅ Confirm template still approved

**How to resume:**
1. Click **"Resume Campaign"**
2. Status: `PAUSED → RUNNING`
3. Can execute batches again

### Retry Failed Recipients

**When to use:**
- Temporary Meta API errors (e.g., rate limits, network issues)
- Recipients marked `FAILED` but are retryable

**How to retry:**
1. Go to campaign details
2. Click **"Retry Failed Recipients"**
3. System resets `FAILED` recipients to `PENDING`
4. Execute batches again

**⚠️ Warning:** Don't retry if:
- Recipient phone number invalid
- Template rejected by Meta
- Persistent API errors

---

## 🛑 Emergency Operations

### Kill Switch

**What it does:**
- **Immediately stops ALL campaigns** system-wide
- No batches will execute (checked before every batch)
- Existing campaigns auto-pause

**When to use:**
1. **Meta account suspended** (stop sending immediately)
2. **Template violation** (message content issue)
3. **Wrong message sent** (urgent recall needed)
4. **System maintenance** (planned downtime)

**How to activate:**
1. Go to **Kill Switch** tab
2. Toggle: `OFF → ON`
3. Enter reason: "Meta account suspended - awaiting review"
4. Confirm

**How to deactivate:**
1. ✅ Verify issue resolved
2. Toggle: `ON → OFF`
3. Manually resume campaigns (they stay paused)

---

## � Meta Quality Monitoring (CRITICAL)

### Why This Matters More Than Infrastructure

**Your system protects:**
- ✅ Concurrency
- ✅ Rate limits
- ✅ Daily caps
- ✅ Abuse prevention

**But Meta cares about:**
- 📊 Quality Rating (High / Medium / Low)
- 🚫 Block rate %
- 📬 Conversation open rate
- 📝 Template approval status

**Infrastructure failure won't kill you. Policy violation will.**

### Meta Quality Rating Thresholds

**Check Meta Business Manager daily:**

| Quality Rating | Action Required |
|----------------|------------------|
| **High** (Green) | ✅ Operate normally |
| **Medium** (Yellow) | ⚠️ **Reduce dailyCap by 50%** immediately |
| **Low** (Red) | 🚨 **PAUSE ALL CAMPAIGNS** - investigate before resuming |

### Quality Indicators to Monitor

**1. Block Rate (%)**
- **Target**: < 1%
- **Warning**: 1-3%
- **Critical**: > 3% (users blocking your messages)
- **Where**: Meta Business Manager → WhatsApp → Insights

**2. Template Status Changes**
- Templates can move from `APPROVED` → `REJECTED` → `DISABLED`
- Sync templates every 3-7 days (never wait > 7 days)
- Using a rejected template = instant quality drop

**3. Phone Number Quality Score**
- Meta assigns score to your phone number
- Score drops → daily limits restricted
- Restrictions happen WITHOUT warning

**4. Delivery Failures**
- System tracks: `failedCount / (sentCount + failedCount)`
- **Target**: < 5%
- **Warning**: 5-8% (investigate causes)
- **Critical**: > 8% (pause and fix)

### Response Protocol

**If Quality Rating drops to Medium:**
```
1. Pause all running campaigns
2. Reduce all dailyCap values by 50%
3. Review recent message content for spam indicators
4. Check block rate in Meta dashboard
5. Sync templates (check for rejections)
6. Resume campaigns at reduced rate
7. Monitor for 48 hours before increasing
```

**If Quality Rating drops to Low:**
```
1. STOP EVERYTHING (use kill switch)
2. Contact Meta Business Support
3. Review ALL template content
4. Identify which campaign caused drop
5. DO NOT resume until:
   - Quality returns to Medium/High
   - Meta confirms issue resolved
   - You've fixed root cause
```

### Spam Indicators That Trigger Quality Drops

❌ **Avoid in templates:**
- All caps text: "FREE OFFER NOW"
- Multiple exclamation marks: "Buy now!!!"
- Urgency manipulation: "Last chance", "Expiring soon"
- Misleading claims: "Guaranteed income"
- Excessive emojis (> 3 per message)

✅ **Good practices:**
- Conversational tone
- Clear sender identification
- Honest, valuable content
- Easy opt-out instructions
- Respecting user preferences

### Dashboard Risk Warnings

**Your dashboard now shows:**
- 🚨 **Critical Risk** banner when:
  - failedRate > 8%
  - dailyCap > 80% of Meta limit
  - Templates not synced in > 7 days
  - No dailyCap configured

- ⚠️ **Warning** banner when:
  - failedRate > 5%
  - dailyCap > 70% of Meta limit
  - Templates not synced in > 3 days

**DO NOT ignore these warnings.**

---

## �📅 Daily Operations Checklist

### Morning (Start of Day)

- [ ] **Check Meta Quality Rating** (High / Medium / Low) - **MOST IMPORTANT**
- [ ] **Check Meta block rate %** (should be < 1%)
- [ ] Check Meta dashboard for daily limit status
- [ ] Review overnight campaign progress
- [ ] Check for failed messages (view logs)
- [ ] Review dashboard risk banners (red = critical, yellow = warning)
- [ ] Verify kill switch is OFF
- [ ] Sync templates if > 3 days since last sync

### During Campaign Execution

- [ ] Monitor `sentCount` vs `dailyCap` ratio
- [ ] Check `failedCount` percentage (should be < 5%, pause if > 8%)
- [ ] Review batch execution logs for errors
- [ ] Ensure cooldown working (30s between batches)
- [ ] Watch for auto-pause events (check `pauseReason`)
- [ ] Monitor Meta dashboard for quality changes

### End of Day

- [ ] **Final Meta quality check** (any drops during day?)
- [ ] Review total messages sent today (across all campaigns)
- [ ] Check block rate % (any spike?)
- [ ] Pause campaigns if needed (avoid overnight sending)
- [ ] Export logs for failed messages
- [ ] Plan next day's campaigns (conservative dailyCap)
- [ ] Document any quality issues or unusual patterns

---

## 🎯 Best Practices

### Campaign Design

1. **Start Small**: First campaign → 100 recipients, test carefully
2. **Conservative Daily Caps**: Use 70% of Meta limit, not 100%
3. **One Template Per Campaign**: Don't mix templates
4. **Clear Naming**: `{Purpose}_{Date}_{Audience}` (e.g., `Promo_2026-03_ActiveVendors`)

### Batch Execution

1. **Manual for First Campaign**: Don't automate until you've tested
2. **Monitor First 5 Batches**: Watch metrics, logs, Meta dashboard
3. **Automate When Confident**: Set up cron AFTER manual testing
4. **Respect Cooldown**: 30s minimum (system enforces, but don't fight it)

### Risk Management

1. **Never Set dailyCap = Meta Limit**: Always leave 20-30% buffer
2. **First 30 Days Are Critical**: Meta is evaluating your quality score
   - Start at 50% of Meta limit (e.g., 500 if limit is 1,000)
   - Increase gradually if quality stays High
   - One quality drop early = permanent trust damage
3. **Test on Small Audience First**: 10-50 recipients before full campaign
4. **Check Template Approval**: Sync templates before every campaign
5. **Monitor Meta Dashboard Daily**: Quality rating is everything
6. **Never Ignore Dashboard Warnings**: Red banner = stop immediately

### Message Quality

1. **Avoid Spam Language**: No "FREE", "URGENT", "CLICK NOW"
2. **Respect Opt-Outs**: Filter recipients who requested removal
3. **Timing Matters**: Don't send late night (check recipient timezones)
4. **Personalization**: Use template variables (name, city, etc.)

---

## 📋 Campaign Example Walkthrough

### Scenario: Vendor Success Story Campaign

**Goal**: Send success story to 1,000 active vendors

**Step-by-Step:**

1. **Template**: `vendor_success_message` (already approved)
2. **Create Campaign**:
   - Name: `VendorSuccess_March2026`
   - Template: `vendor_success_message`
   - Daily Cap: `700` (Meta limit is 1,000)
   - Target: Active vendors with 4+ rating

3. **Populate Recipients**:
   - System finds 1,247 eligible vendors
   - All marked `PENDING`

4. **Start Campaign**:
   - Status: `READY → RUNNING`
   - Ready to execute batches

5. **Execute First Batch (Manual)**:
   - Click "Execute Batch"
   - Processes 25 recipients
   - Result: 24 sent, 1 failed
   - Metrics: `sentCount: 24`, `failedCount: 1`

6. **Monitor for 5 Batches**:
   - Batch 2: 25 sent, 0 failed (cumulative: 49 sent)
   - Batch 3: 23 sent, 2 failed (cumulative: 72 sent)
   - Batch 4: 25 sent, 0 failed (cumulative: 97 sent)
   - Batch 5: 24 sent, 1 failed (cumulative: 121 sent)
   - **Failure rate: 3.3% ✅ Acceptable**

7. **Set Up Automation**:
   - Cron job: Every 1 minute (server cooldown controls actual rate)
   - Monitor for next hour
   - Check daily cap not reached

8. **End of Day**:
   - Total sent: 687 messages (within 700 cap ✅)
   - Campaign auto-paused (daily cap reached)
   - Review failed messages (14 total)

9. **Next Day**:
   - Resume campaign
   - Continue batch execution
   - Complete after 2 days (1,247 recipients total)

---

## 🔧 Troubleshooting

### Campaign Won't Start

**Symptom**: "Start Campaign" button does nothing

**Causes & Fixes**:
- Campaign status not `READY` → Populate recipients first
- No recipients → Check vendor data, population filters
- Auth session expired → Log out and log back in

### Batch Execution Fails

**Symptom**: 429 or 409 error when clicking "Execute Batch"

**Causes & Fixes**:
- **429 (Rate Limit)**: Wait 60 seconds, try again
- **409 (Locked)**: Another batch running, wait 2 minutes
- **Cooldown**: Less than 30s since last batch, wait

### High Failure Rate

**Symptom**: `failedCount` > 10% of `sentCount`

**Causes & Fixes**:
1. **Meta API Errors**: Check logs for error codes
2. **Invalid Phone Numbers**: Filter data before populate
3. **Template Rejected**: Sync templates, verify status
4. **Daily Limit Reached**: Check Meta dashboard

### Campaign Auto-Paused

**Symptom**: Status changed to `PAUSED` automatically

**Check `pauseReason`**:
- `Daily limit reached` → Expected, resume tomorrow
- `Campaign daily cap reached` → Expected, review cap
- `METRICS_CORRUPTION` → **STOP**: Contact developer
- `Emergency stop: {reason}` → Kill switch enabled

### Metrics Not Updating

**Symptom**: Execute batch returns success, but metrics unchanged

**Causes & Fixes**:
1. Batch execution returned early (cooldown, daily cap)
2. No pending recipients remaining
3. Database write failed (check CloudWatch logs)
4. Campaign already completed

---

## 🔐 Security Reminders

### Admin Access

- **Never share credentials**: Each person should have own account
- **Use strong passwords**: 16+ characters, unique
- **Session timeout**: 24 hours, re-login required
- **IP logging**: All actions logged with IP address

### API Protection

System enforces:
- ✅ Authentication on ALL endpoints
- ✅ Rate limiting (5 req/min per IP)
- ✅ Execution lock (no concurrent batches)
- ✅ Cooldown (30s between batches)
- ✅ Daily cap (auto-pause)

**You cannot bypass these protections** (intentional design).

---

## 📊 Key Metrics to Track

### Campaign Performance

| Metric | Formula | Target |
|--------|---------|--------|
| **Delivery Rate** | `sentCount / totalRecipients` | > 95% |
| **Failure Rate** | `failedCount / processed` | < 5% |
| **Daily Progress** | `sentCount / dailyCap` | Monitor |
| **Batches Per Day** | `dailyCap / 25` | Estimate |

### System Health

- **Batch Duration**: Should be 1-30 seconds per batch
- **Cooldown Compliance**: No batches within 30s of each other
- **Lock Conflicts**: Should be zero (if automated properly)
- **Rate Limit Hits**: Should be zero (if cron spaced correctly)

---

## 🎓 Training Guide (For Team Handoff)

### Day 1: Observation

- Show admin dashboard
- Explain each tab (Settings, Templates, Campaigns, Kill Switch)
- Create test campaign (10 recipients)
- Execute 3 batches manually
- Review logs together

### Day 2: Hands-On

- Create real campaign (supervised)
- Populate recipients
- Execute first 5 batches
- Monitor metrics
- Pause/resume campaign

### Day 3: Independent

- Create campaign independently
- Set up monitoring
- Handle errors
- Review end-of-day metrics

### Day 4: Emergency Drills

- Practice kill switch activation
- Handle high failure rate
- Retry failed recipients
- Investigate metrics corruption

---

## 📞 Support & Escalation

### When to Handle Yourself

- Normal batch execution
- Campaign creation/pause/resume
- Template syncing
- Daily operations

### When to Escalate

- Metrics corruption detected
- Meta account suspended
- System errors persisting > 1 hour
- Database issues
- Authentication failures

### Emergency Contacts

- **Meta Business Support**: [Meta Business Help Center](https://business.facebook.com/help)
- **System Developer**: [Your contact info]
- **Database Admin**: [Your contact info]

---

## 🎉 Success Checklist

You're ready to operate when:

- [ ] ✅ Created test campaign successfully
- [ ] ✅ Executed 10+ batches manually
- [ ] ✅ Monitored metrics and logs
- [ ] ✅ Paused and resumed campaign
- [ ] ✅ Understand daily cap management
- [ ] ✅ Know when to use kill switch
- [ ] ✅ Can troubleshoot common errors
- [ ] ✅ Respect cooldown and rate limits
- [ ] ✅ Set conservative daily caps
- [ ] ✅ Check Meta dashboard daily

---

## 📚 Additional Resources

- [WHATSAPP-DASHBOARD-ARCHITECTURE.md](./WHATSAPP-DASHBOARD-ARCHITECTURE.md) - Technical architecture
- [WHATSAPP-TESTING-CHECKLIST.md](./WHATSAPP-TESTING-CHECKLIST.md) - Testing procedures
- [CAMPAIGN-EXECUTOR-PHASE-1A.md](./CAMPAIGN-EXECUTOR-PHASE-1A.md) - Batch executor internals
- [SECURITY.md](./SECURITY.md) - Security best practices

---

**Remember**: You have 7 layers of protection. The system will stop you from making critical mistakes. Trust the safeguards, operate conservatively, and monitor closely.

**Now go send those messages! 🚀**
