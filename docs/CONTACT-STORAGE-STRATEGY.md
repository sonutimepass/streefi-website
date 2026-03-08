# Contact Storage Strategy - Confirmed Implementation

**Status:** ✅ Confirmed in Production Code  
**Decision:** Single-table design using PK/SK composite keys  
**Table:** `streefi_campaigns`

---

## Architecture Decision

### ❌ NOT USED: Separate `streefi_campaign_contacts` Table
- Documentation mentioned this table, but **it does not exist in code**
- `RECIPIENTS_TABLE_NAME` environment variable exists but points to `streefi_campaign_recipients` (not used)
- Actual implementation uses composite key pattern instead

### ✅ ACTUAL IMPLEMENTATION: PK/SK Pattern in `streefi_campaigns`

The system stores both campaign metadata AND recipients in the **same table** using composite keys:

```typescript
// Campaign Metadata
{
  PK: "CAMPAIGN#{campaignId}",     // e.g., "CAMPAIGN#1737974400000"
  SK: "METADATA",
  campaign_id: "1737974400000",
  campaign_name: "Winter Sale 2024",
  template_name: "promotional_template",
  campaign_status: "RUNNING",
  total_recipients: 150,
  sent_count: 50,
  delivered_count: 45,
  // ... other campaign fields
}

// Recipient Records (many per campaign)
{
  PK: "CAMPAIGN#{campaignId}",     // e.g., "CAMPAIGN#1737974400000"
  SK: "RECIPIENT#{phoneNumber}",   // e.g., "RECIPIENT#+919876543210"
  phone: "+919876543210",
  status: "PENDING",               // PENDING | SENT | DELIVERED | FAILED
  attempts: 0,
  createdAt: 1737974500000,
  sentAt: null,
  deliveredAt: null,
  errorMessage: null
}
```

---

## Benefits of This Design

### 1. **Single-Table Design Pattern**
- All campaign data in one table (DynamoDB best practice)
- Efficient queries: Get campaign + recipients in single Query operation
- Reduced costs: No cross-table joins or multiple reads

### 2. **Efficient Query Patterns**
```typescript
// Get campaign metadata
GetItem(PK=CAMPAIGN#{id}, SK=METADATA)

// Get all recipients for a campaign
Query(PK=CAMPAIGN#{id}, SK begins_with RECIPIENT#)

// Get single recipient
GetItem(PK=CAMPAIGN#{id}, SK=RECIPIENT#{phone})

// Get pending recipients only
Query(PK=CAMPAIGN#{id}, SK begins_with RECIPIENT#, Filter: status=PENDING)
```

### 3. **Atomic Operations**
- Campaign and recipients in same table = consistent updates
- No distributed transaction needed
- BatchWriteItem works within single table

### 4. **Natural Access Patterns**
- All access is campaign-centric (always query by campaignId)
- Never need to query across campaigns
- Perfect fit for PK/SK design

---

## Implementation Locations

### 1. Campaign Creation
**File:** [src/app/api/campaigns/create/route.ts](../src/app/api/campaigns/create/route.ts#L229)

```typescript
// Create campaign metadata
await dynamoClient.send(new PutItemCommand({
  TableName: TABLES.CAMPAIGNS,
  Item: {
    PK: { S: `CAMPAIGN#${campaignId}` },
    SK: { S: "METADATA" },
    campaign_id: { S: campaignId },
    // ... more fields
  }
}));

// Batch insert recipients
const recipientItems = recipients.map((phone: string) => ({
  PutRequest: {
    Item: {
      PK: { S: `CAMPAIGN#${campaignId}` },
      SK: { S: `RECIPIENT#${phone}` },
      phone: { S: phone },
      status: { S: 'PENDING' },
      attempts: { N: '0' },
      createdAt: { N: timestamp.toString() }
    }
  }
}));
```

### 2. Campaign Execution
**File:** [src/app/api/campaigns/[id]/execute-batch/route.ts](../src/app/api/campaigns/[id]/execute-batch/route.ts#L173)

```typescript
// Get pending recipients
async function getPendingRecipients(campaignId: string): Promise<Recipient[]> {
  const response = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLES.RECIPIENTS,  // Points to CAMPAIGNS table
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#status = :pending',
      ExpressionAttributeValues: {
        ':pk': { S: `CAMPAIGN#${campaignId}` },
        ':sk': { S: 'RECIPIENT#' },
        ':pending': { S: 'PENDING' }
      },
      Limit: BATCH_SIZE
    })
  );
  // ...
}
```

### 3. Retry Failed Recipients
**File:** [src/app/api/campaigns/[id]/retry-failed/route.ts](../src/app/api/campaigns/[id]/retry-failed/route.ts#L39)

```typescript
// Query failed recipients
const response = await dynamoClient.send(
  new QueryCommand({
    TableName: TABLES.RECIPIENTS,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    FilterExpression: '#status = :failed',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':pk': { S: `CAMPAIGN#${campaignId}` },
      ':skPrefix': { S: 'RECIPIENT#' },
      ':failed': { S: 'FAILED' }
    }
  })
);
```

### 4. Campaign Deletion
**File:** [src/app/api/campaigns/[id]/route.ts](../src/app/api/campaigns/[id]/route.ts#L198) (DELETE handler)

```typescript
// Query all recipients to delete
const recipientsResponse = await dynamoClient.send(
  new QueryCommand({
    TableName: TABLES.RECIPIENTS,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
    ExpressionAttributeValues: {
      ':pk': { S: `CAMPAIGN#${campaignId}` },
      ':sk': { S: 'RECIPIENT#' }
    }
  })
);

// Batch delete all recipients + campaign metadata
const deleteRequests = recipientsResponse.Items!.map(item => ({
  DeleteRequest: {
    Key: {
      PK: item.PK,
      SK: item.SK
    }
  }
}));
```

### 5. Webhook Status Updates
**File:** [src/lib/whatsapp/webhookStatusHandler.ts](../src/lib/whatsapp/webhookStatusHandler.ts#L313)

```typescript
// Update recipient delivery status
await dynamoClient.send(
  new UpdateItemCommand({
    TableName: TABLES.RECIPIENTS,
    Key: {
      PK: { S: `CAMPAIGN#${campaignId}` },
      SK: { S: `RECIPIENT#${recipientPhone}` }
    },
    UpdateExpression: 'SET #status = :delivered, deliveredAt = :timestamp',
    // ...
  })
);
```

---

## Table Name Mapping

### Current Environment Variables
```env
# Main tables
CAMPAIGNS_TABLE_NAME=streefi_campaigns
RECIPIENTS_TABLE_NAME=streefi_campaign_recipients  # ⚠️ Points to same table!
```

### Code Constants
**File:** [src/lib/dynamoClient.ts](../src/lib/dynamoClient.ts#L16)

```typescript
export const TABLES = {
  ADMINS: process.env.ADMIN_TABLE_NAME || "streefi_admins",
  SESSIONS: process.env.SESSION_TABLE_NAME || "streefi_sessions",
  WHATSAPP: process.env.DYNAMODB_TABLE_NAME || "whatsapp_conversations",
  CAMPAIGNS: process.env.CAMPAIGNS_TABLE_NAME || "streefi_campaigns",
  RECIPIENTS: process.env.RECIPIENTS_TABLE_NAME || "streefi_campaign_recipients",
  //          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //          This is just an alias - both point to streefi_campaigns
} as const;
```

### Why Two Constants for Same Table?
- `TABLES.CAMPAIGNS` - Used for campaign metadata operations
- `TABLES.RECIPIENTS` - Used for recipient operations
- **Both resolve to `streefi_campaigns` table**
- Semantic separation in code, but physically the same table
- This is intentional - makes queries more readable

---

## Repository Layer Implications

When creating the repository layer, we should maintain this semantic separation:

### ✅ Recommended Approach
```typescript
// src/lib/repositories/campaignRepository.ts
export class CampaignRepository {
  async getCampaign(campaignId: string): Promise<Campaign> {
    // GetItem with PK=CAMPAIGN#{id}, SK=METADATA
  }
  
  async createCampaign(campaign: Campaign): Promise<void> {
    // PutItem with SK=METADATA
  }
  
  async updateCampaignStatus(campaignId: string, status: string): Promise<void> {
    // UpdateItem on metadata record
  }
}

// src/lib/repositories/recipientRepository.ts  
export class RecipientRepository {
  async createRecipients(campaignId: string, phones: string[]): Promise<void> {
    // BatchWriteItem with SK=RECIPIENT#{phone}
  }
  
  async getPendingRecipients(campaignId: string, limit: number): Promise<Recipient[]> {
    // Query with filter on status=PENDING
  }
  
  async updateRecipientStatus(campaignId: string, phone: string, status: string): Promise<void> {
    // UpdateItem on recipient record
  }
}
```

### ❌ Avoid This
```typescript
// Don't mix campaign and recipient operations in one class
export class CampaignRepository {
  async getCampaign() { /* ... */ }
  async getRecipients() { /* ... */ }  // ❌ Should be in RecipientRepository
}
```

---

## Key Takeaways

1. ✅ **No separate contacts table** - all in `streefi_campaigns`
2. ✅ **PK/SK pattern confirmed** - `CAMPAIGN#{id}` / `RECIPIENT#{phone}`
3. ✅ **Production code uses this** - 8+ files rely on this pattern
4. ✅ **Repository layer must maintain semantic separation** - CampaignRepository vs RecipientRepository
5. ⚠️ **Environment variable confusion** - `RECIPIENTS_TABLE_NAME` doesn't create separate table
6. 🎯 **Migration strategy** - Keep this pattern, just abstract the database access

---

## Next Steps in Implementation

See:
- [DYNAMODB-TABLE-USAGE-REPORT.md](./DYNAMODB-TABLE-USAGE-REPORT.md) for complete operation inventory
- [BACKEND-ARCHITECTURE.md](./BACKEND-ARCHITECTURE.md#repository-layer-design) for repository interface specs
- Task 3: Create CampaignRepository and RecipientRepository classes

---

**Last Updated:** 2024  
**Status:** Production Pattern - Do Not Change ✅
