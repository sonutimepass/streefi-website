# Conversation Log Storage Strategy

**Status:** Required for Phase 3-4 Implementation  
**Priority:** MEDIUM  
**Timeline:** Implement during WhatsApp operations migration

---

## Problem Statement

The `execute-batch` route creates conversation logs for sent messages, but the current storage location is undefined in documentation. This creates several risks:

### Risk 1: Table Bloat

If logs are stored in `streefi_campaigns` table alongside campaigns and recipients:

```
Campaign with 100k recipients:
- 1 campaign metadata row (CAMPAIGN#id / METADATA)
- 100k recipient rows (CAMPAIGN#id / RECIPIENT#phone)
- 100k+ conversation logs (CAMPAIGN#id / CONVERSATION#...)

Total: 200k+ rows per campaign
```

**Impact:**
- Slower queries (more items to scan)
- Higher storage costs
- Difficult retention management
- GSI overhead (if projected)

### Risk 2: Retention Management

WhatsApp conversation history requirements:
- **Compliance:** May need to retain for 90 days minimum
- **Analytics:** Historical analysis of message patterns
- **Debugging:** Troubleshoot delivery issues

**Without TTL or separate table:**
- Manual cleanup required
- Risk of hitting table size limits
- Expensive to archive

### Risk 3: Query Performance

Common queries requiring conversation logs:
- Get all messages for a phone number (customer support)
- Get conversation thread for a campaign
- Analyze delivery patterns
- Track message lifecycle (sent → delivered → read)

**If in campaigns table:**
- Must query across campaign partitions
- Inefficient for phone-based lookups
- Mixed with campaign data (conflicting access patterns)

---

## Recommended Solution: Separate `streefi_conversations` Table

### Table Schema

```typescript
// Base table
PK: CONVERSATION#<phone>
SK: MESSAGE#<timestamp>#<campaign_id>

// Attributes
phone: "+919876543210"
campaign_id: "abc123"
direction: "OUTBOUND" | "INBOUND"
status: "SENT" | "DELIVERED" | "READ" | "FAILED"
template_name: "promo_001"
message_id: "msg_def456"
wamid: "wamid.HBgNOTE2..." // Meta's message ID

// Timestamps
sent_at: 1709856000000
delivered_at: 1709856005000
read_at: 1709856010000
failed_at?: 1709856002000

// Error tracking
error_code?: "131047"
error_message?: "Re-engagement window expired"

// Template data
template_params?: { "discount": "20%" }

// TTL for automatic cleanup
ttl: 1717632000  // 90 days from sent_at
```

### Access Patterns

**1. Get conversation history for a phone number:**

```typescript
Query PK=CONVERSATION#+919876543210
→ Returns all messages sent to this number, sorted by timestamp
```

**2. Get messages for a specific campaign:**

```typescript
// Use GSI1
GSI1_PK = CAMPAIGN#abc123
GSI1_SK = MESSAGE#<timestamp>
```

**3. Get failed messages across all campaigns:**

```typescript
// Use GSI2 (optional)
GSI2_PK = STATUS#FAILED
GSI2_SK = MESSAGE#<timestamp>
```

---

## Table Configuration

### Base Table Keys

| Key | Type   | Value                                          |
|-----|--------|------------------------------------------------|
| PK  | String | `CONVERSATION#<phone>`                         |
| SK  | String | `MESSAGE#<timestamp>#<campaign_id>`            |

**Benefits:**
- Phone-based partitioning (efficient customer support queries)
- Sorted by timestamp (chronological order)
- Campaign ID in SK (can filter by campaign)

### GSI1: Campaign-Based Lookup

| Key     | Type   | Value                      |
|---------|--------|----------------------------|
| GSI1_PK | String | `CAMPAIGN#<campaign_id>`   |
| GSI1_SK | String | `MESSAGE#<timestamp>`      |

**Use case:** Get all messages for a campaign

### GSI2: Status-Based Lookup (Optional)

| Key     | Type   | Value                  |
|---------|--------|------------------------|
| GSI2_PK | String | `STATUS#<status>`      |
| GSI2_SK | String | `MESSAGE#<timestamp>`  |

**Use case:** Find all failed/delivered messages (analytics)

### TTL Configuration

**Attribute:** `ttl` (Number, Unix timestamp in seconds)  
**Retention:** 90 days from `sent_at`

```typescript
// Set TTL during message creation
const sentAt = Date.now();
const ttl = Math.floor(sentAt / 1000) + (90 * 24 * 60 * 60);  // 90 days

await dynamoClient.send(new PutItemCommand({
  TableName: "streefi_conversations",
  Item: {
    PK: { S: `CONVERSATION#${phone}` },
    SK: { S: `MESSAGE#${sentAt}#${campaignId}` },
    ttl: { N: ttl.toString() },  // DynamoDB auto-deletes when ttl < current time
    // ... other attributes
  }
}));
```

**DynamoDB handles deletion automatically** (within 48 hours of TTL expiry).

---

## Repository Implementation

### ConversationRepository

```typescript
// src/lib/repositories/conversationRepository.ts
import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand
} from "@aws-sdk/client-dynamodb";

export interface ConversationMessage {
  phone: string;
  campaign_id: string;
  direction: "OUTBOUND" | "INBOUND";
  status: "SENT" | "DELIVERED" | "READ" | "FAILED";
  
  template_name?: string;
  message_id?: string;
  wamid?: string;
  
  sent_at: number;
  delivered_at?: number;
  read_at?: number;
  failed_at?: number;
  
  error_code?: string;
  error_message?: string;
  
  template_params?: Record<string, string>;
}

export class ConversationRepository {
  private client: DynamoDBClient;
  private tableName: string;
  private readonly TTL_DAYS = 90;

  constructor(
    client = dynamoClient,
    tableName = process.env.CONVERSATIONS_TABLE_NAME || "streefi_conversations"
  ) {
    this.client = client;
    this.tableName = tableName;
  }

  /**
   * Log an outbound message
   */
  async logMessage(message: ConversationMessage): Promise<void> {
    const now = Date.now();
    const ttl = Math.floor(now / 1000) + (this.TTL_DAYS * 24 * 60 * 60);

    await this.client.send(new PutItemCommand({
      TableName: this.tableName,
      Item: {
        PK: { S: `CONVERSATION#${message.phone}` },
        SK: { S: `MESSAGE#${message.sent_at}#${message.campaign_id}` },
        
        // GSI1 keys
        GSI1_PK: { S: `CAMPAIGN#${message.campaign_id}` },
        GSI1_SK: { S: `MESSAGE#${message.sent_at}` },
        
        // GSI2 keys (optional)
        GSI2_PK: { S: `STATUS#${message.status}` },
        GSI2_SK: { S: `MESSAGE#${message.sent_at}` },
        
        phone: { S: message.phone },
        campaign_id: { S: message.campaign_id },
        direction: { S: message.direction },
        status: { S: message.status },
        
        ...(message.template_name && { template_name: { S: message.template_name } }),
        ...(message.message_id && { message_id: { S: message.message_id } }),
        ...(message.wamid && { wamid: { S: message.wamid } }),
        
        sent_at: { N: message.sent_at.toString() },
        ...(message.delivered_at && { delivered_at: { N: message.delivered_at.toString() } }),
        ...(message.read_at && { read_at: { N: message.read_at.toString() } }),
        ...(message.failed_at && { failed_at: { N: message.failed_at.toString() } }),
        
        ...(message.error_code && { error_code: { S: message.error_code } }),
        ...(message.error_message && { error_message: { S: message.error_message } }),
        
        ...(message.template_params && {
          template_params: { S: JSON.stringify(message.template_params) }
        }),
        
        ttl: { N: ttl.toString() }
      }
    }));

    console.log(`[ConversationRepository] Message logged:`, message.phone, message.campaign_id);
  }

  /**
   * Update message status (from webhook)
   */
  async updateMessageStatus(
    phone: string,
    wamid: string,
    status: "DELIVERED" | "READ" | "FAILED",
    metadata?: {
      error_code?: string;
      error_message?: string;
    }
  ): Promise<void> {
    // Note: This requires querying by wamid first (needs GSI3)
    // For now, webhook handler can pass [phone, timestamp, campaign_id]
    
    const now = Date.now();
    const timestampField = status === "DELIVERED" ? "delivered_at" :
                           status === "READ" ? "read_at" : "failed_at";

    await this.client.send(new UpdateItemCommand({
      TableName: this.tableName,
      Key: {
        PK: { S: `CONVERSATION#${phone}` },
        SK: { S: `MESSAGE#...` }  // Need to know timestamp
      },
      UpdateExpression: `SET #status = :status, ${timestampField} = :timestamp`,
      ExpressionAttributeNames: {
        "#status": "status"
      },
      ExpressionAttributeValues: {
        ":status": { S: status },
        ":timestamp": { N: now.toString() }
      }
    }));
  }

  /**
   * Get conversation history for a phone number
   */
  async getConversationHistory(
    phone: string,
    limit: number = 50
  ): Promise<ConversationMessage[]> {
    const response = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: `CONVERSATION#${phone}` }
      },
      Limit: limit,
      ScanIndexForward: false  // Most recent first
    }));

    if (!response.Items || response.Items.length === 0) {
      return [];
    }

    return response.Items.map(item => this.parseMessageItem(item));
  }

  /**
   * Get messages for a campaign
   */
  async getCampaignMessages(
    campaignId: string,
    limit?: number
  ): Promise<ConversationMessage[]> {
    const response = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: "GSI1",
      KeyConditionExpression: "GSI1_PK = :pk",
      ExpressionAttributeValues: {
        ":pk": { S: `CAMPAIGN#${campaignId}` }
      },
      ...(limit && { Limit: limit }),
      ScanIndexForward: false
    }));

    if (!response.Items || response.Items.length === 0) {
      return [];
    }

    return response.Items.map(item => this.parseMessageItem(item));
  }

  private parseMessageItem(item: any): ConversationMessage {
    return {
      phone: item.phone?.S || "",
      campaign_id: item.campaign_id?.S || "",
      direction: (item.direction?.S || "OUTBOUND") as any,
      status: (item.status?.S || "SENT") as any,
      
      template_name: item.template_name?.S,
      message_id: item.message_id?.S,
      wamid: item.wamid?.S,
      
      sent_at: parseInt(item.sent_at?.N || "0", 10),
      delivered_at: item.delivered_at?.N ? parseInt(item.delivered_at.N, 10) : undefined,
      read_at: item.read_at?.N ? parseInt(item.read_at.N, 10) : undefined,
      failed_at: item.failed_at?.N ? parseInt(item.failed_at.N, 10) : undefined,
      
      error_code: item.error_code?.S,
      error_message: item.error_message?.S,
      
      template_params: item.template_params?.S ? JSON.parse(item.template_params.S) : undefined
    };
  }
}

export const conversationRepository = new ConversationRepository();
```

---

## Migration Strategy

### Phase 1: Create Table (Week 1)

1. **Create `streefi_conversations` table** via IaC or Console
2. **Enable TTL** on `ttl` attribute
3. **Create GSI1** for campaign-based lookups
4. **Deploy repository code** (no usage yet)

### Phase 2: Dual-Write (Week 2-3)

Update `execute-batch` route to write to both:
- Current location (if any) - for backward compatibility
- New `streefi_conversations` table

**Test:** Verify both writes succeed

### Phase 3: Switch Reads (Week 4)

Update all conversation history queries to read from new table:
- Dashboard queries
- Customer support lookups
- Analytics jobs

**Test:** Verify no broken queries

### Phase 4: Remove Old Writes (Week 5+)

Stop writing to old location. Only write to `streefi_conversations`.

---

## Environment Variables

Add to `.env`:

```bash
# Conversations table
CONVERSATIONS_TABLE_NAME=streefi_conversations
CONVERSATION_TTL_DAYS=90  # Optional, default 90
```

Update `src/lib/dynamoClient.ts`:

```typescript
export const TABLES = {
  ADMINS: process.env.ADMIN_TABLE_NAME || "streefi_admins",
  SESSIONS: process.env.SESSION_TABLE_NAME || "streefi_sessions",
  CAMPAIGNS: process.env.CAMPAIGNS_TABLE_NAME || "streefi_campaigns",
  WHATSAPP: process.env.DYNAMODB_TABLE_NAME || "streefi_whatsapp",
  CONVERSATIONS: process.env.CONVERSATIONS_TABLE_NAME || "streefi_conversations"  // NEW
};
```

---

## CloudFormation Template

```yaml
Resources:
  ConversationsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: streefi_conversations
      BillingMode: PAY_PER_REQUEST  # On-demand recommended for variable load
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
        - AttributeName: GSI1_PK
          AttributeType: S
        - AttributeName: GSI1_SK
          AttributeType: S
      GlobalSecondaryIndexes:
        - IndexName: GSI1
          KeySchema:
            - AttributeName: GSI1_PK
              KeyType: HASH
            - AttributeName: GSI1_SK
              KeyType: RANGE
          Projection:
            ProjectionType: ALL
      TimeToLiveSpecification:
        AttributeName: ttl
        Enabled: true
      Tags:
        - Key: Environment
          Value: production
        - Key: Project
          Value: streefi-whatsapp
```

---

## Cost Estimate

### Storage

**Assumption:** 1M messages/month, 1KB per message, 90-day retention

```
Storage: 1M × 1KB × 3 months = 3GB
Cost: $0.25/GB/month × 3GB = $0.75/month
```

### Read/Write

**On-Demand pricing:**
- Writes: 1M messages/month = ~0.39 write req/sec average
- Reads: Customer support queries = ~100 reads/day
- Cost: ~$1.25/month (writes) + ~$0.03/month (reads) = **$1.30/month**

### TTL Deletes

**Free** (DynamoDB handles automatically)

### Total

**~$2/month** for 1M messages with 90-day retention

**Very affordable.**

---

## Benefits Summary

| Aspect              | Current (in campaigns table) | Proposed (separate table) |
|---------------------|------------------------------|---------------------------|
| Query performance   | Slow (mixed access patterns) | Fast (optimized)          |
| Retention           | Manual cleanup required      | Automatic (TTL)           |
| Table bloat         | Yes (200k+ rows/campaign)    | No (separate)             |
| Customer support    | Difficult (scan campaigns)   | Easy (query by phone)     |
| Analytics           | Complex queries              | Simple GSI queries        |
| Cost                | Higher (large table)         | Lower (small table)       |

---

## When to Implement

**Recommended:** During **Phase 3-4** (WhatsApp operations migration)

**Why then:**
- execute-batch route being refactored anyway
- Low risk (additive only)
- Before scale increases

**Don't wait until:** Table bloat causes query performance issues

---

## Testing Checklist

- [ ] Create `streefi_conversations` table in staging
- [ ] Enable TTL on `ttl` attribute
- [ ] Create GSI1 for campaign lookups
- [ ] Deploy ConversationRepository
- [ ] Test message logging
- [ ] Test conversation history query
- [ ] Test campaign messages query
- [ ] Verify TTL deletes after 90 days (check in 3 months)
- [ ] Monitor storage costs
- [ ] Compare query performance vs old approach

---

## Conclusion

**Verdict:** ✅ Create separate `streefi_conversations` table  
**Timeline:** Implement in Phase 3-4  
**Risk:** LOW (additive change)  
**Cost:** ~$2/month (negligible)  
**Benefit:** Clean separation of concerns, automatic retention, efficient queries

Proceed with creation during WhatsApp operations migration phase.

---

**Last Updated:** March 8, 2026  
**Status:** Design Complete, Awaiting Implementation  
**Priority:** MEDIUM (not blocking Phase 1-2)
