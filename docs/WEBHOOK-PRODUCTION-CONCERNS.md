# WhatsApp Webhook - Production Readiness Assessment

**Status**: ✅ Production Ready with Recommended Improvements  
**Date**: March 9, 2026  
**Context**: Building customer reply dashboard

---

## ✅ Current Strengths

Your webhook implementation is **production-ready** with these solid features:

### 1. Security ✅
- HMAC-SHA256 signature verification
- Timing-safe comparison (prevents side-channel attacks)
- Proper 403 responses for unauthorized access
- Environment variable configuration

### 2. Data Persistence ✅
- Messages saved to DynamoDB with idempotency
- Schema: `CONVERSATION#{phone}` / `MSG#{timestamp}#{messageId}`
- Conversation tracking (last message, count)
- Supports all message types (text, media, interactive)

### 3. Reliability ✅
- Idempotency checks prevent duplicate processing
- Best-effort persistence (doesn't fail webhook on DB errors)
- Always returns 200 OK to Meta (prevents unnecessary retries)
- Error logging for debugging

### 4. Quality Monitoring ✅
- Status update tracking (sent/delivered/read/failed)
- Block-rate circuit breaker
- Campaign metrics integration
- Error code classification

---

## ⚠️ Recommended Improvements for Customer Dashboard

### 1. **Message Context - IMPORTANT** ⚠️

**Issue**: Inbound messages don't store customer profile or campaign context.

**Current Storage**:
```typescript
{
  phone: "16505551234",
  messageId: "wamid.xxx",
  content: "Does it come in another color?",
  type: "text"
  // ❌ Missing: customer name, campaign ID, vendor ID
}
```

**Dashboard Impact**:
- ❌ Can't show "John replied to Campaign X"
- ❌ Can't filter by campaign or vendor
- ❌ Can't show customer name without lookup

**Solution**:
```typescript
// Add to saveInboundMessage
async saveInboundMessage(params: {
  phone: string;
  messageId: string;
  type: string;
  timestamp: number;
  content: string;
  // ADD THESE:
  customerName?: string;      // From webhook: contact.profile.name
  campaignId?: string;        // Lookup from last sent message
  vendorId?: string;          // From campaign
  displayPhoneNumber?: string; // From metadata
}) {
  // Store enriched data
}
```

### 2. **Contact Profile Enrichment** 📋

**Issue**: Meta sends customer name in webhook, but you're not storing it.

**Webhook Data Available**:
```json
{
  "contacts": [{
    "profile": {
      "name": "Sheena Nelson"  // ⚠️ Not being stored
    },
    "wa_id": "16505551234"
  }]
}
```

**Fix in route.ts**:
```typescript
// Extract contact profile
const contact = value.contacts?.[0];
const customerName = contact?.profile?.name;

await whatsappRepository.saveInboundMessage({
  phone: message.from,
  messageId: message.id,
  type: message.type,
  timestamp: parseInt(message.timestamp, 10),
  content,
  customerName,  // ADD THIS
  displayPhoneNumber: value.metadata?.display_phone_number,
});
```

### 3. **Business Phone Number Tracking** 📞

**Issue**: If you have multiple WhatsApp numbers, you can't identify which received the message.

**Available in Webhook**:
```json
{
  "metadata": {
    "display_phone_number": "15550783881",  // ⚠️ Not stored
    "phone_number_id": "106540352242922"
  }
}
```

**Why It Matters**:
- Multi-vendor setups
- Multiple business lines
- Proper conversation threading

### 4. **Message Threading** 🧵

**Current**: Messages stored individually  
**Better**: Support conversation threads with context

**Add**:
```typescript
// Store conversation context
{
  conversationId: string;     // Link messages in same thread
  replyToMessageId?: string;  // If replying to specific message
  contextCampaignId?: string; // Last campaign customer received
}
```

### 5. **Read Receipts for Dashboard** 👁️

**Current**: You process `read` status but don't store it per message.

**Dashboard Need**: Show "✓✓ Read" badges in conversation view.

**Add to Status Handler**:
```typescript
// Update message with delivery/read status
async function updateMessageStatus(
  messageId: string,
  status: 'sent' | 'delivered' | 'read' | 'failed',
  timestamp: number
) {
  // Update the original message record
  await campaignRepository.updateMessageDeliveryStatus(
    messageId,
    status,
    timestamp
  );
}
```

### 6. **Media Handling** 📎

**Current**: Media messages serialized as JSON string.

**Dashboard Need**: Download and display images, documents, videos.

**Add**:
```typescript
if (message.type === 'image') {
  const media = message.image;
  // Store media metadata
  {
    mediaId: media.id,
    mimeType: media.mime_type,
    mediaUrl: null,  // Download later via Graph API
    caption: media.caption,
  }
}
```

**Download API Needed**:
```typescript
// GET /api/whatsapp/media/:mediaId
// Downloads media from Meta and returns to dashboard
```

### 7. **Error Visibility** 🚨

**Current**: Failed messages logged to console.

**Dashboard Need**: Show failure reasons to users.

**Store Error Details**:
```typescript
{
  status: 'failed',
  errorCode: 131051,
  errorMessage: "User blocked messages from this number",
  errorTimestamp: "2026-03-09T..."
}
```

### 8. **Webhook Event Types** 📊

**Current**: Only handles `messages` field.

**Meta Sends More** (per your docs):
- `account_alerts` - Messaging limit changes
- `message_template_status_update` - Template approvals
- `business_capability_update` - Account upgrades
- `phone_number_quality_update` - Quality ratings

**Dashboard Value**:
- Show template approval notifications
- Alert on quality downgrades
- Display messaging limit increases

**Add Field Handlers**:
```typescript
// In POST handler, add these:
if (change.field === 'message_template_status_update') {
  await handleTemplateStatusUpdate(change.value);
}

if (change.field === 'phone_number_quality_update') {
  await handleQualityUpdate(change.value);
}
```

---

## 🚀 Immediate Actions (Before Dashboard)

### High Priority:
1. ✅ **Store customer name** from `contacts[].profile.name`
2. ✅ **Add campaign context** to inbound messages
3. ✅ **Store business phone number** from metadata
4. ✅ **Add read receipt tracking** for message status

### Medium Priority:
5. ⚠️ **Media download endpoint** for dashboard image display
6. ⚠️ **Error detail storage** for user-facing error messages
7. ⚠️ **Conversation threading** for better UX

### Low Priority:
8. 📋 **Additional webhook fields** (template updates, quality alerts)
9. 📋 **Webhook retry handling** (already works, but could log retries)

---

## 📋 Dashboard Data Requirements

For a complete customer reply dashboard, you'll need to query:

```typescript
// 1. List conversations by vendor
GET /api/admin/conversations?vendorId=xyz
=> [{
  phone: "16505551234",
  customerName: "Sheena Nelson",
  lastMessage: "Does it come in another color?",
  lastMessageTime: "2026-03-09T10:30:00Z",
  unreadCount: 1,
  campaignName: "Spring Sale 2026"
}]

// 2. Get conversation messages
GET /api/admin/conversations/16505551234
=> [{
  id: "wamid.xxx",
  direction: "inbound",
  type: "text",
  content: "Does it come in another color?",
  timestamp: "2026-03-09T10:30:00Z",
  status: "delivered",  // for outbound
  customerName: "Sheena Nelson"
}]

// 3. Reply to customer
POST /api/whatsapp/reply
{
  phone: "16505551234",
  message: "Yes, we have blue and red",
  conversationId: "conv_xxx"
}
```

---

## ✅ Current Implementation is Safe

**Your webhook IS production-ready because:**
1. ✅ Secure signature verification
2. ✅ Idempotent message processing
3. ✅ Resilient error handling
4. ✅ Always returns 200 OK (prevents Meta retries)
5. ✅ Stores messages reliably
6. ✅ Integrates with circuit breaker

**The improvements above are for dashboard UX**, not safety.

---

## 🔧 Implementation Order

1. **Phase 1: Data Enrichment** (1-2 hours)
   - Add customer name storage
   - Add business phone tracking
   - Add campaign context lookup

2. **Phase 2: Dashboard APIs** (2-3 hours)
   - List conversations endpoint
   - Get conversation messages endpoint
   - Mark as read endpoint

3. **Phase 3: Media Support** (2-3 hours)
   - Media download endpoint
   - Image/document rendering

4. **Phase 4: Advanced Features** (optional)
   - Real-time updates (WebSocket/SSE)
   - Typing indicators
   - Message search

---

## 📚 References

- [WhatsApp Webhook Docs](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks)
- [Message Object](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#messages-object)
- [Status Object](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components#statuses-object)
- [Media Download](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/media#download-media)
