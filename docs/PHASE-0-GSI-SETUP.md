# Phase 0: GSI Creation and Prerequisites

**Status:** REQUIRED BEFORE PHASE 1
**Estimated Time:** 15-30 minutes (GSI creation) + 30 minutes (backfill)
**Risk Level:** LOW (additive only, no breaking changes)

---

## Overview

Before beginning Phase 1 migration, you must create two Global Secondary Indexes (GSIs) on the `streefi_campaigns` table. These indexes eliminate expensive Scan operations and enable efficient queries.

**GSI1:** Campaign metadata queries (list campaigns, find RUNNING campaigns)
**GSI2:** Recipient phone lookups (optional but recommended)

---

## GSI1: Campaign Metadata Index (REQUIRED)

### Purpose

Enables efficient querying of campaign metadata without scanning the entire table (which includes millions of recipient records).

### Schema

| Attribute   | Type   | Description                           |
| ----------- | ------ | ------------------------------------- |
| ENTITY_TYPE | String | GSI Partition Key - Value: "CAMPAIGN" |
| CREATED_AT  | Number | GSI Sort Key - Unix timestamp         |

### Projection

**Type:** ALL (include all attributes)

**Why ALL:** Campaign list queries need all campaign fields (name, status, metrics, etc.). Projecting ALL avoids additional fetches.

### Capacity

**Read Capacity:** Start with 5 RCU (auto-scaling recommended)
**Write Capacity:** Start with 5 WCU (auto-scaling recommended)

**Note:** GSI writes consume capacity during:

- Campaign creation
- Backfill operation (one-time)

---

## GSI2: Recipient Lookup Index (RECOMMENDED)

### Purpose

Enables efficient recipient lookups by phone number without knowing their current status. Useful for webhook handlers and status checks.

### Schema

| Attribute | Type   | Description                       |
| --------- | ------ | --------------------------------- |
| PK        | String | GSI Partition Key - CAMPAIGN#{id} |
| phone     | String | GSI Sort Key - Phone number       |

### Projection

**Type:** KEYS_ONLY or INCLUDE (status, message_id, wamid)

**Why KEYS_ONLY:** Reduces storage cost. If full data needed, fetch from base table using PK+SK.

### Capacity

**Read Capacity:** Start with 10 RCU (webhook handlers query frequently)
**Write Capacity:** Start with 10 WCU (recipient creation/updates)

---

## Step-by-Step Setup

### Method 1: AWS Console

#### Create GSI1

1. Open AWS Console → DynamoDB → Tables → `streefi_campaigns`
2. Click **Indexes** tab → **Create index**
3. Configure:
   - **Partition key:** `ENTITY_TYPE` (String)
   - **Sort key:** `CREATED_AT` (Number)
   - **Index name:** `GSI1`
   - **Projected attributes:** All
   - **Read capacity:** 5 (or On-Demand)
   - **Write capacity:** 5 (or On-Demand)
4. Click **Create index**
5. Wait 5-10 minutes for `IndexStatus: ACTIVE`

#### Create GSI2 (Optional)

1. Repeat above steps with:
   - **Partition key:** `PK` (String) - *Note: Same as base table PK*
   - **Sort key:** `phone` (String)
   - **Index name:** `GSI2`
   - **Projected attributes:** Include (select: status, message_id, wamid)
   - **Capacity:** 10 RCU / 10 WCU

---

### Method 2: AWS CLI

#### Create GSI1

```bash
aws dynamodb update-table \\
  --table-name streefi_campaigns \\
  --region us-east-1 \\
  --attribute-definitions \\
      AttributeName=ENTITY_TYPE,AttributeType=S \\
      AttributeName=CREATED_AT,AttributeType=N \\
  --global-secondary-index-updates \\
    "[{
      \\"Create\\": {
        \\"IndexName\\": \\"GSI1\\",
        \\"KeySchema\\": [
          {\\"AttributeName\\": \\"ENTITY_TYPE\\", \\"KeyType\\": \\"HASH\\"},
          {\\"AttributeName\\": \\"CREATED_AT\\", \\"KeyType\\": \\"RANGE\\"}
        ],
        \\"Projection\\": {
          \\"ProjectionType\\": \\"ALL\\"
        },
        \\"ProvisionedThroughput\\": {
          \\"ReadCapacityUnits\\": 5,
          \\"WriteCapacityUnits\\": 5
        }
      }
    }]"
```

#### Create GSI2 (Optional)

```bash
aws dynamodb update-table \\
  --table-name streefi_campaigns \\
  --region us-east-1 \\
  --attribute-definitions \\
      AttributeName=phone,AttributeType=S \\
  --global-secondary-index-updates \\
    "[{
      \\"Create\\": {
        \\"IndexName\\": \\"GSI2\\",
        \\"KeySchema\\": [
          {\\"AttributeName\\": \\"PK\\", \\"KeyType\\": \\"HASH\\"},
          {\\"AttributeName\\": \\"phone\\", \\"KeyType\\": \\"RANGE\\"}
        ],
        \\"Projection\\": {
          \\"ProjectionType\\": \\"INCLUDE\\",
          \\"NonKeyAttributes\\": [\\"status\\", \\"message_id\\", \\"wamid\\"]
        },
        \\"ProvisionedThroughput\\": {
          \\"ReadCapacityUnits\\": 10,
          \\"WriteCapacityUnits\\": 10
        }
      }
    }]"
```

---

### Method 3: Terraform

```hcl
resource "aws_dynamodb_table" "campaigns" {
  name           = "streefi_campaigns"
  billing_mode   = "PROVISIONED"
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "PK"
  range_key      = "SK"

  attribute {
    name = "PK"
    type = "S"
  }

  attribute {
    name = "SK"
    type = "S"
  }

  attribute {
    name = "ENTITY_TYPE"
    type = "S"
  }

  attribute {
    name = "CREATED_AT"
    type = "N"
  }

  attribute {
    name = "phone"
    type = "S"
  }

  # GSI1: Campaign metadata index
  global_secondary_index {
    name               = "GSI1"
    hash_key           = "ENTITY_TYPE"
    range_key          = "CREATED_AT"
    projection_type    = "ALL"
    read_capacity      = 5
    write_capacity     = 5
  }

  # GSI2: Recipient phone lookup (optional)
  global_secondary_index {
    name               = "GSI2"
    hash_key           = "PK"
    range_key          = "phone"
    projection_type    = "INCLUDE"
    non_key_attributes = ["status", "message_id", "wamid"]
    read_capacity      = 10
    write_capacity     = 10
  }

  # Auto-scaling (recommended)
  tags = {
    Environment = "production"
    Project     = "streefi-whatsapp"
  }
}
```

---

### Method 4: CloudFormation

```yaml
Resources:
  CampaignsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: streefi_campaigns
      BillingMode: PROVISIONED
      ProvisionedThroughput:
        ReadCapacityUnits: 5
        WriteCapacityUnits: 5
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
        - AttributeName: ENTITY_TYPE
          AttributeType: S
        - AttributeName: CREATED_AT
          AttributeType: N
        - AttributeName: phone
          AttributeType: S
      GlobalSecondaryIndexes:
        # GSI1: Campaign metadata
        - IndexName: GSI1
          KeySchema:
            - AttributeName: ENTITY_TYPE
              KeyType: HASH
            - AttributeName: CREATED_AT
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
          ProvisionedThroughput:
            ReadCapacityUnits: 5
            WriteCapacityUnits: 5
        # GSI2: Recipient lookup
        - IndexName: GSI2
          KeySchema:
            - AttributeName: PK
              KeyType: HASH
            - AttributeName: phone
              KeyType: RANGE
          Projection:
            ProjectionType: INCLUDE
            NonKeyAttributes:
              - status
              - message_id
              - wamid
          ProvisionedThroughput:
            ReadCapacityUnits: 10
            WriteCapacityUnits: 10
      Tags:
        - Key: Environment
          Value: production
        - Key: Project
          Value: streefi-whatsapp
```

---

## Verification Steps

### 1. Check GSI Status

```bash
aws dynamodb describe-table \\
  --table-name streefi_campaigns \\
  --region us-east-1 \\
  --query "Table.GlobalSecondaryIndexes[*].[IndexName,IndexStatus,ItemCount]"
```

**Expected Output:**

```
[
  ["GSI1", "ACTIVE", 0],
  ["GSI2", "ACTIVE", 0]
]
```

**Note:** `ItemCount` will be 0 until backfill runs.

### 2. Monitor GSI Creation

GSI creation typically takes **5-15 minutes** depending on table size.

**Check progress:**

```bash
watch -n 10 'aws dynamodb describe-table \\
  --table-name streefi_campaigns \\
  --query "Table.GlobalSecondaryIndexes[?IndexName==\`GSI1\`].IndexStatus"'
```

**Statuses:**

- `CREATING` → GSI being built
- `BACKFILLING` → Copying existing data (if table has items)
- `ACTIVE` → Ready to use ✅

---

## Backfill Existing Data

Once GSI1 is `ACTIVE`, run the backfill script to add `ENTITY_TYPE` and `CREATED_AT` attributes to existing campaigns.

### Run Backfill Script

```bash
# Set environment variables
export CAMPAIGNS_TABLE_NAME=streefi_campaigns
export AWS_REGION=us-east-1

# Run script
cd scripts
ts-node backfill-gsi1-campaign-metadata.ts
```

**Or add to package.json:**

```json
{
  "scripts": {
    "backfill:gsi1": "ts-node scripts/backfill-gsi1-campaign-metadata.ts"
  }
}
```

Then run:

```bash
npm run backfill:gsi1
```

### What the Script Does

1. Scans for all campaign metadata rows (`SK = "METADATA"`)
2. Adds `ENTITY_TYPE = "CAMPAIGN"` to each row
3. Adds `CREATED_AT` (uses existing `created_at` or current timestamp)
4. Handles throttling with exponential backoff
5. Verifies GSI1 item count

### Expected Output

```
🚀 Starting GSI1 backfill for campaign metadata...
   Table: streefi_campaigns
   Region: us-east-1

🔍 Verifying GSI1...
   Status: ACTIVE
   Item Count: 0
✅ GSI1 is active and ready

📦 Batch 1: Found 50 campaign metadata rows
   ✅ Updated campaign_abc123
   ✅ Updated campaign_def456
   ...

=============================================================
✅ Backfill Complete!
=============================================================

📊 Statistics:
   Scanned:  127 campaigns
   Updated:  127 campaigns
   Skipped:  0 campaigns
   Errors:   0 campaigns
   Duration: 24.3s

✅ All campaigns updated successfully!
```

---

## Verify Backfill Success

### Check GSI1 Item Count

```bash
aws dynamodb describe-table \\
  --table-name streefi_campaigns \\
  --query "Table.GlobalSecondaryIndexes[?IndexName=='GSI1'].ItemCount"
```

**Should match campaign count** (not total table item count).

### Test GSI1 Query

```bash
aws dynamodb query \\
  --table-name streefi_campaigns \\
  --index-name GSI1 \\
  --key-condition-expression "ENTITY_TYPE = :type" \\
  --expression-attribute-values '{":type":{"S":"CAMPAIGN"}}' \\
  --limit 5
```

**Should return campaign metadata rows.**

---

## Troubleshooting

### Issue: GSI creation fails with "Limit exceeded"

**Cause:** DynamoDB allows max 20 GSIs per table.

**Solution:** Delete unused GSIs or contact AWS support to increase limit.

---

### Issue: Backfill script finds 0 campaigns

**Possible causes:**

1. Wrong table name (check `CAMPAIGNS_TABLE_NAME` env var)
2. No campaigns exist yet (expected if dev environment)
3. Wrong AWS region/credentials

**Debug:**

```bash
aws dynamodb scan \\
  --table-name streefi_campaigns \\
  --filter-expression "SK = :metadata" \\
  --expression-attribute-values '{":metadata":{"S":"METADATA"}}' \\
  --select COUNT
```

---

### Issue: Backfill script reports throttling errors

**Cause:** Exceeding table write capacity.

**Solutions:**

1. Temporarily increase WCU (reduce after backfill)
2. Add delays between batches (already implemented in script)
3. Switch table to On-Demand billing during backfill

---

### Issue: GSI2 not populating with existing recipients

**Expected:** GSI2 only indexes rows that have the `phone` attribute.

**Solution:** Recipient rows already have `phone`, but backfill may be needed if:

- Rows created before GSI2 existed
- GSI2 has sparse projection

**Check:**

```bash
aws dynamodb query \\
  --table-name streefi_campaigns \\
  --index-name GSI2 \\
  --key-condition-expression "PK = :pk" \\
  --expression-attribute-values '{":pk":{"S":"CAMPAIGN#<some-campaign-id>"}}' \\
  --limit 5
```

---

## Cost Estimate

### GSI Storage

**GSI1:** All campaign metadata (~100 campaigns × 2KB each = 200KB)
**GSI2:** All recipients with selected attributes (~1M recipients × 100 bytes = 100MB)

**Total:** ~100MB additional storage
**Cost:** $0.25/GB/month → **$0.025/month** (negligible)

### GSI Read/Write Capacity

**Provisioned:**

- GSI1: 5 RCU + 5 WCU = ~$1.17/month
- GSI2: 10 RCU + 10 WCU = ~$2.34/month

**Total:** ~$3.50/month (if using provisioned capacity)

**On-Demand:** Pay per request (~$0.25 per million writes, $0.25 per million reads)

### Backfill Cost

**One-time operation:**

- 100 campaigns × 1 WCU each = 100 WCU-seconds
- Cost: < $0.01

---

## Phase 0 Checklist

Complete before starting Phase 1 migration:

- [ ] **Create GSI1** on streefi_campaigns table

  - [ ] PK: ENTITY_TYPE (String)
  - [ ] SK: CREATED_AT (Number)
  - [ ] Projection: ALL
  - [ ] Status: ACTIVE
- [ ] **Create GSI2** on streefi_campaigns table (optional but recommended)

  - [ ] PK: PK (String)
  - [ ] SK: phone (String)
  - [ ] Projection: INCLUDE (status, message_id, wamid)
  - [ ] Status: ACTIVE
- [ ] **Run backfill script** for GSI1

  - [ ] Script completed successfully
  - [ ] No errors reported
  - [ ] GSI1 ItemCount matches campaign count
- [ ] **Test GSI1 queries**

  - [ ] List campaigns query works
  - [ ] Find RUNNING campaigns query works
  - [ ] Performance improved vs Scan
- [ ] **Update repository code** (already done)

  - [ ] Pull latest code with GSI support
  - [ ] Update environment variables if needed
- [ ] **Monitor initial performance**

  - [ ] Enable CloudWatch metrics for GSIs
  - [ ] Set up alarms for throttling
  - [ ] Monitor RCU/WCU consumption

---

## Next Steps

Once Phase 0 is complete:

✅ **Proceed to Phase 1:** Migrate authentication routes
✅ **Repository layer ready:** GSI-based queries enabled
✅ **No more Scans:** All campaign queries use GSI1

**Estimated savings:**

- 99.9% reduction in RCU for campaign list queries
- Sub-100ms query latency (vs. multi-second Scans)
- Zero impact on existing functionality (additive only)

---

**Last Updated:** March 8, 2026
**Status:** Ready for Execution
**Risk Level:** LOW (no breaking changes)
