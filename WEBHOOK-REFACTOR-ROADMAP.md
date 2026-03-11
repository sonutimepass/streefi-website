# WhatsApp Webhook Refactor - CORRECTED Production Architecture

**Goal:** Transform the webhook from storing all events in DynamoDB to a production-grade system that only persists conversation data and logs critical operational signals to CloudWatch.

---

## 🎯 Current Problems

- ❌ **Every webhook event writes to DynamoDB** (expensive, unnecessary)
- ❌ **35+ different event types all stored identically**
- ❌ **No distinction between conversation data vs operational alerts**
- ❌ **No outbound message storage** (dashboard can't show full conversations)
- ❌ **Hundreds of unnecessary database writes per day**
- ❌ **~900 lines of repetitive if-statements**

---

## ✅ PRODUCTION-GRADE Architecture

```
Meta Webhook
     │
     ▼
route.ts (thin entry point)
     │
     ▼
signatureVerifier.ts
     │
     ▼
webhookRouter.ts
     │
     ├── messages.inbound → inboundMessageHandler → DynamoDB
     │
     ├── messages.statuses → statusHandler → DynamoDB (update)
     │
     ├── critical alerts → console.log → CloudWatch
     │        • account_alerts
     │        • phone_number_quality_update
     │        • message_template_quality_update
     │        • tracking_events
     │
     └── unknown events → ignored
```

**Key fixes:**

- CloudWatch logging (not files)
- Handler separation (not monolithic)
- Repository layer pattern
- Thin route.ts endpoint

---

## � Production Folder Structure

```
src/
│
├─ app/api/whatsapp/
│   └─ route.ts                        # Webhook endpoint (thin, ~150 lines)
│
├─ lib/whatsapp/
│   ├─ handlers/
│   │   ├─ inboundMessageHandler.ts   # Store incoming messages
│   │   └─ statusHandler.ts           # Update delivery/read status
│   │
│   ├─ webhookRouter.ts                # Event classification & routing
│   ├─ signatureVerifier.ts            # Meta signature validation
│   └─ metaTypes.ts                    # Webhook payload types
│
├─ lib/repositories/
│   └─ whatsappRepository.ts           # DynamoDB access layer (already exists)
│
└─ lib/dynamodb/
    └─ client.ts                       # DynamoDB client config
```

**Benefits:**

- Handler separation (not monolithic)
- Repository layer pattern
- Easy to test individual handlers
- Clear responsibility boundaries

---

## 📊 Production DynamoDB Schema

### Single-Table Design (Dashboard-Optimized)

**Table:** `streefi_whatsapp`
**Keys:** `PK` (partition), `SK` (sort)

---

### Item Type 1: Conversation Metadata (Chat List)

```json
{
  "PK": "CONV#919876543210",
  "SK": "META",
  "TYPE": "CONVERSATION",
  "phone": "919876543210",
  "name": "Ramesh Patel",
  "lastMessage": "Order confirmed",
  "lastMessageTimestamp": 1710162300,
  "lastDirection": "outbound",
  "unreadCount": 2,
  "updatedAt": 1710162300
}
```

**Purpose:** Powers conversation list UI
**Query:** `PK begins_with CONV#` + `SK = META`

---

### Item Type 2: Messages (Conversation Thread)

**Inbound:**

```json
{
  "PK": "CONV#919876543210",
  "SK": "MSG#1710162200#IN",
  "direction": "inbound",
  "messageId": "wamid.xxx",
  "type": "text",
  "content": "Hello",
  "timestamp": 1710162200,
  "status": "received"
}
```

**Outbound:**

```json
{
  "PK": "CONV#919876543210",
  "SK": "MSG#1710162300#OUT",
  "direction": "outbound",
  "messageId": "wamid.yyy",
  "type": "text",
  "content": "Hi there",
  "timestamp": 1710162300,
  "status": "delivered",
  "deliveredAt": 1710162310
}
```

**Purpose:** Full conversation history
**Query:** `PK = CONV#{phone}` + `SK begins_with MSG#`

---

### Item Type 3: Status Updates

Status events update existing message items with:

```json
{
  "status": "delivered|read|failed",
  "deliveredAt": 1710162310,
  "readAt": 1710162320
}
```

---

### Complete Table Layout Example

```
PK                     SK                  TYPE           unreadCount
────────────────────────────────────────────────────────────────────
CONV#919876543210      META                CONVERSATION   2
CONV#919876543210      MSG#1710162200#IN   -              -
CONV#919876543210      MSG#1710162210#IN   -              -
CONV#919876543210      MSG#1710162300#OUT  -              -
CONV#919876543210      MSG#1710162310#OUT  -              -
```

---

### GSI (Optional - Conversation Sorting)

```
GSI1PK = TYPE
GSI1SK = updatedAt
```

**Query:** Latest conversations sorted by activity

---

### Dashboard Queries

**Load conversation list:**

```
Scan where SK = META
→ Returns all conversations with unread counts, last message
```

**Open chat thread:**

```
Query PK = CONV#919876543210, SK begins_with MSG#
→ Returns all messages sorted by timestamp
```

**Mark as read:**

```
Update META item: unreadCount = 0
```

---

### Write Operations Per Inbound Message

**2 writes:**

1. Create MSG item
2. Update META item (lastMessage, lastMessageTimestamp, unreadCount++)

**Optimization:** Use BatchWrite for multiple messages

---

### Critical: Outbound Message Storage

When sending via Meta API, **immediately store:**

```typescript
{
  PK: `CONV#${phone}`,
  SK: `MSG#${timestamp}#OUT`,
  direction: 'outbound',
  messageId: response.messages[0].id,
  content: messageText,
  status: 'sent'
}
```

**Without this:** Dashboard shows only customer messages (broken UX)

---

## 📋 Implementation Steps

### **STEP 1: Build Core Webhook Infrastructure** ✋ START HERE

**What:** Create handler separation layer with production schema support

**Files to create:**

1. **`src/lib/whatsapp/handlers/inboundMessageHandler.ts`**

```typescript
export async function handleInboundMessages(messages: any[]) {
  for (const msg of messages) {
    const phone = msg.from;
    const timestamp = parseInt(msg.timestamp);
  
    // Write 1: Store message
    await whatsappRepository.storeMessage({
      phone,
      direction: 'inbound',
      messageId: msg.id,
      type: msg.type,
      content: extractContent(msg),
      timestamp,
      status: 'received'
    });
  
    // Write 2: Update conversation metadata
    await whatsappRepository.updateConversationMeta({
      phone,
      lastMessage: truncate(extractContent(msg), 100),
      lastMessageTimestamp: timestamp,
      lastDirection: 'inbound',
      incrementUnread: true
    });
  }
}
```

2. **`src/lib/whatsapp/handlers/statusHandler.ts`**

```typescript
export async function handleMessageStatuses(statuses: any[]) {
  for (const status of statuses) {
    await whatsappRepository.updateMessageStatus({
      messageId: status.id,
      status: status.status, // sent|delivered|read|failed
      timestamp: parseInt(status.timestamp)
    });
  }
}
```

3. **`src/lib/whatsapp/webhookRouter.ts`**

```typescript
const CRITICAL_ALERTS = new Set([
  'account_alerts',
  'phone_number_quality_update',
  'message_template_quality_update',
  'tracking_events'
]);

export async function routeWebhookEvent(field: string, value: any, entryId: string) {
  try {
    if (field === 'messages') {
      if (value.messages) {
        await handleInboundMessages(value.messages);
      }
      if (value.statuses) {
        await handleMessageStatuses(value.statuses);
      }
      return;
    }

    if (CRITICAL_ALERTS.has(field)) {
      console.info(JSON.stringify({
        timestamp: new Date().toISOString(),
        event: field,
        summary: truncateSafely(value, 200),
        entryId
      }));
      return;
    }
  
    // Unknown events: silently ignored
  } catch (error) {
    console.error('Router error:', error);
    // Never throw - webhook must return 200
  }
}
```

4. **`src/lib/whatsapp/signatureVerifier.ts`**

```typescript
import { createHmac, timingSafeEqual } from 'crypto';

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string
): boolean {
  if (!signature) return false;
  
  const expected = 'sha256=' + createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');
  
  try {
    return signature.length === expected.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
```

5. **`src/lib/whatsapp/metaTypes.ts`**

```typescript
export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  interactive?: any;
  button?: any;
  [key: string]: any;
}

export interface WebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}
```

**Repository Updates Needed:**

Update `whatsappRepository.ts` to support new schema:

- `storeMessage()` → Use `CONV#` prefix
- `updateConversationMeta()` → Update META item
- `updateMessageStatus()` → Update existing message item

**Success criteria:**

- Clean handler separation (each file < 100 lines)
- Router delegates to handlers
- CloudWatch logging for alerts
- Production schema support

---

### **STEP 2: Refactor Webhook Endpoint**

**What:** Replace 900-line monolith with thin endpoint

**Current structure (~900 lines):**

```typescript
// 35+ if-statements
if (webhookField === 'messages') { storeWebhookEvent(...) }
if (webhookField === 'account_alerts') { storeWebhookEvent(...) }
// ... 33 more ...
```

**New structure (~150 lines):**

```typescript
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const body = JSON.parse(rawBody);

  // Webhook from Meta
  if (body.object === 'whatsapp_business_account') {
  
    // Verify signature (production)
    if (!isLocalDevelopment) {
      const signature = request.headers.get('x-hub-signature-256');
      const appSecret = process.env.WHATSAPP_APP_SECRET;
    
      if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Route all events
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        await routeWebhookEvent(change.field, change.value, entry.id);
      }
    }

    return NextResponse.json({ success: true });
  }

  // ... (message sending logic remains)
}
```

**Files to modify:**

- `src/app/api/whatsapp/route.ts`

**What to remove:**

- All 35+ event-specific if-blocks
- `storeWebhookEvent()` function entirely
- DynamoDB client initialization in route.ts
- Inline signature verification (use signatureVerifier)

**What to keep:**

- GET verification (unchanged)
- Message sending logic (until Step 3)
- Admin auth for sending

**Expected result:** ~250-300 lines total (down from ~900)

---

### **STEP 3: Add Outbound Message Storage**

**What:** Store sent messages with same schema

**Where:** In message sending section of route.ts

**After successful Meta API call:**

```typescript
// Send to Meta
const response = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(messagePayload),
});

const result = await response.json();

// CRITICAL: Store outbound message
if (result.messages?.[0]?.id) {
  await whatsappRepository.storeMessage({
    phone: formattedPhone,
    direction: 'outbound',
    messageId: result.messages[0].id,
    type: template ? 'template' : 'text',
    content: message || template?.name || '',
    timestamp: Math.floor(Date.now() / 1000),
    status: 'sent'
  });
  
  // Update conversation metadata
  await whatsappRepository.updateConversationMeta({
    phone: formattedPhone,
    lastMessage: truncate(message || template?.name, 100),
    lastMessageTimestamp: Math.floor(Date.now() / 1000),
    lastDirection: 'outbound',
    incrementUnread: false // Vendor reply doesn't increment unread
  });
}
```

**Success criteria:**

- Outbound messages appear in DynamoDB
- Same CONV# / MSG# pattern
- Conversation META updated
- Full bidirectional threads work

---

## 📊 Expected Results

### Before:

- **DynamoDB writes:** 35+ per webhook
- **Response time:** 300-500ms
- **Code size:** ~900 lines
- **Conversation storage:** Inbound only
- **Architecture:** Monolithic if-statement chain

### After:

- **DynamoDB writes:** 2-4 per webhook (messages + statuses)
- **Response time:** <200ms
- **Code size:** ~250-300 lines
- **Conversation storage:** Full bidirectional
- **Architecture:** Clean handler separation

**Cost reduction:** ~85-90% fewer webhook-related writes

**Real numbers per typical webhook batch:**

- Old: 21 DynamoDB writes (messages + 20 event types)
- New: 3 DynamoDB writes (messages + statuses only)

---

## 🚦 Current Status

**→ WAITING FOR PRODUCTION DYNAMODB SCHEMA** ← YOU ARE HERE

Once schema is defined, implement Step 1 with proper repository methods.

---

## 🚨 Production Requirements Checklist

- ✅ **CloudWatch logging** (not file logs - Lambda ephemeral filesystem)
- ✅ **Handler separation** (not monolithic)
- ✅ **Repository layer** (abstract DynamoDB access)
- ✅ **Never crash webhook** (all operations wrapped in try-catch)
- ✅ **Always return 200** (Meta retries non-200 responses)
- ✅ **Store both directions** (inbound + outbound messages)
- ✅ **Fast response** (<200ms target)
- ⏳ **Production schema** (waiting for dashboard-ready design)

---

## 🔧 Architecture Improvements

| Aspect          | Original            | First Fix     | Production Grade         |
| --------------- | ------------------- | ------------- | ------------------------ |
| Logging         | DynamoDB all events | File logs     | CloudWatch (console.log) |
| Events logged   | 35+ types           | 4 critical    | 4 critical only          |
| Router          | 35+ if-blocks       | Single router | Router + handlers        |
| Structure       | Monolithic          | Single file   | Handler separation       |
| Message storage | Inbound<br /> only  | Inbound only  | Bidirectional            |
| Code size       | ~900 lines          | ~300 lines    | ~250 lines total         |
| Repository      | Mixed               | Suggested     | Enforced pattern         |

---

## ❓ Next: Production DynamoDB Schema

Waiting for the **production WhatsApp chat system schema**—the design used by CRM and marketing automation platforms for dashboard queries, conversation threads, and analytics.
