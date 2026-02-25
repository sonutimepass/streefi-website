# Campaign Executor - Quick Reference Card

## 🎯 Phase 1A Overview

**What:** Stateless batch executor for WhatsApp campaigns  
**Batch Size:** 25 recipients per execution  
**Trigger:** Manual (button or API call)  
**Safety:** Guard-first, atomic updates, crash-safe, idempotent  

---

## 📍 API Endpoints

### Create Campaign
```http
POST /api/campaigns/create
Content-Type: application/json

{
  "name": "Campaign Name",
  "templateName": "your_template_name",
  "channel": "WHATSAPP",
  "audienceType": "CSV"
}
```

### Populate Recipients
```http
POST /api/campaigns/{campaignId}/populate
Content-Type: multipart/form-data

file: [CSV with phone numbers, one per line]
```

### Get Campaign Details
```http
GET /api/campaigns/{campaignId}
```

### Control Campaign
```http
POST /api/campaigns/{campaignId}/control
Content-Type: application/json

{ "action": "start" | "pause" | "resume" }
```

### Execute Batch
```http
POST /api/campaigns/{campaignId}/execute-batch
```

---

## 🔄 Workflow

```
1. Create campaign (DRAFT)
2. Populate recipients
3. Start campaign (RUNNING)
4. Execute batch → 25 sent
5. Execute batch → 25 sent
6. Repeat until complete or paused
7. If paused (limit) → Resume tomorrow
```

---

## 📊 Status Flow

```
DRAFT ──start──> RUNNING
                   │
                   ├──pause──> PAUSED ──resume──> RUNNING
                   │
                   └──auto──> COMPLETED (no pending)
```

---

## 🛡️ Safety Rules

1. **Guard before send**
   ```typescript
   const check = await guard.checkLimit(phone);
   if (!check.allowed) { pause(); break; }
   await sendTemplate();
   ```

2. **Atomic updates**
   ```typescript
   ADD sentCount :inc  // ✅ Safe
   ```

3. **Rate control**
   ```typescript
   await sendTemplate();
   await sleep(50);  // 20 msg/sec
   ```

4. **Idempotent**
   - Only sends to `PENDING` recipients
   - Safe to run repeatedly

---

## 🔢 Key Numbers

| Metric | Value |
|--------|-------|
| Meta Tier | 250 conversations/24h |
| Streefi Cap | 200 conversations/24h (safety) |
| Batch Size | 25 recipients |
| Send Rate | 20 messages/sec (50ms delay) |
| Max Retries | 3 attempts |

---

## 📁 File Locations

### API Routes
```
src/app/api/campaigns/
├── create/route.ts           # Create campaign
├── [id]/
│   ├── route.ts              # Get details
│   ├── populate/route.ts     # Upload recipients
│   ├── control/route.ts      # Start/pause/resume
│   └── execute-batch/route.ts # Process batch
```

### UI Component
```
src/modules/whatsapp-admin/components/CampaignSection/index.tsx
```

### Core Services
```
src/lib/whatsapp/
├── meta/
│   ├── metaClient.ts         # Meta API client
│   └── messageService.ts     # Message sending
└── guards/
    └── dailyLimitGuard.ts    # Daily limit enforcement
```

---

## 🗄️ DynamoDB Schema

### Campaigns Table
```
PK: CAMPAIGN#{id}
SK: METADATA
---
status: DRAFT | RUNNING | PAUSED | COMPLETED
totalRecipients: number
sentCount: number
failedCount: number
```

### Recipients Table
```
PK: CAMPAIGN#{campaignId}
SK: USER#{phone}
---
status: PENDING | SENT | FAILED
attempts: number
messageId?: string (if SENT)
errorCode?: string (if FAILED)
```

### Daily Counter
```
PK: DAILY_COUNTER#{YYYY-MM-DD}
SK: METADATA
---
count: number (conversations today)
TTL: auto-expire after 7 days
```

---

## 🧪 Quick Test

```bash
# 1. Create
CAMPAIGN_ID=$(curl -X POST /api/campaigns/create \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","templateName":"template_name","channel":"WHATSAPP","audienceType":"CSV"}' \
  | jq -r '.campaignId')

# 2. Populate (create test.csv first)
curl -X POST /api/campaigns/$CAMPAIGN_ID/populate \
  -F "file=@test.csv"

# 3. Start
curl -X POST /api/campaigns/$CAMPAIGN_ID/control \
  -H "Content-Type: application/json" \
  -d '{"action":"start"}'

# 4. Execute
curl -X POST /api/campaigns/$CAMPAIGN_ID/execute-batch

# 5. Check status
curl /api/campaigns/$CAMPAIGN_ID
```

---

## 🐛 Common Issues

### Campaign won't start
- **Check:** Status must be `DRAFT` or `PAUSED`
- **Fix:** Call `/control` with correct action

### Batch returns 0 processed
- **Check:** Campaign status = `RUNNING`?
- **Fix:** Start or resume campaign first

### Daily limit reached
- **Check:** Daily counter >= 200
- **Fix:** Wait until tomorrow, resume campaign

### Messages not delivered
- **Check:** Template name matches Meta approved template
- **Check:** Phone numbers in E.164 (10-15 digits, no +)
- **Check:** Meta credentials valid

---

## 🔧 Environment Variables

```bash
# Required
META_ACCESS_TOKEN=your_token
META_PHONE_NUMBER_ID=your_phone_id

# Optional
WHATSAPP_DAILY_LIMIT=200  # Default: 200

# DynamoDB (via amplify)
CAMPAIGNS_TABLE_NAME
RECIPIENTS_TABLE_NAME
WHATSAPP_TABLE_NAME
```

---

## 📈 Monitoring Queries

### Campaign progress
```typescript
const { sentCount, totalRecipients } = campaign;
const progress = (sentCount / totalRecipients) * 100;
```

### Today's usage
```bash
aws dynamodb get-item --table-name WHATSAPP \
  --key '{"PK":{"S":"DAILY_COUNTER#'$(date +%Y-%m-%d)'"},"SK":{"S":"METADATA"}}'
```

### Failed recipients
```bash
aws dynamodb query --table-name RECIPIENTS \
  --key-condition-expression "PK = :pk" \
  --filter-expression "#status = :failed" \
  --expression-attribute-names '{"#status":"status"}' \
  --expression-attribute-values '{":pk":{"S":"CAMPAIGN#'$CAMPAIGN_ID'"},":failed":{"S":"FAILED"}}'
```

---

## 🚀 Next: Automation

### AWS EventBridge Setup
```yaml
Resources:
  CampaignExecutorRule:
    Type: AWS::Events::Rule
    Properties:
      ScheduleExpression: rate(1 minute)
      Targets:
        - Arn: !GetAtt CampaignExecutorFunction.Arn
          Input: |
            {
              "campaignId": "cmp_xxx",
              "action": "execute-batch"
            }
```

### Manual Cron (Simple)
```javascript
// run-campaign.js
const campaignId = process.env.CAMPAIGN_ID;

async function run() {
  const response = await fetch(
    `https://yourdomain.com/api/campaigns/${campaignId}/execute-batch`,
    { method: 'POST' }
  );
  console.log(await response.json());
}

run();
```

Then: `cron: */1 * * * * node run-campaign.js`

---

## 💡 Tips

- **For testing:** Use `WHATSAPP_DAILY_LIMIT=5` to test pause logic quickly
- **For speed:** Execute batch repeatedly (auto-stops when done)
- **For safety:** Let it pause on limit, resume tomorrow naturally
- **For scale:** Increase `WHATSAPP_DAILY_LIMIT` when Meta approves higher tier

---

## 📚 Documentation

- [Complete Guide](./CAMPAIGN-EXECUTOR-PHASE-1A.md) - Full architecture & usage
- [Testing Checklist](./CAMPAIGN-EXECUTOR-TESTING-CHECKLIST.md) - Comprehensive tests
- [Architecture Doc](./WHATSAPP-DASHBOARD-ARCHITECTURE.md) - System design

---

**Questions?** Check the complete guide or review the inline code comments.

**Phase 1A Status:** ✅ Complete and production-ready
