# WhatsApp Send Template API Guide

## Overview

Send pre-approved WhatsApp template messages to recipients.

**Endpoint:** `POST /api/whatsapp-admin/send-template`

**Auth:** Requires WhatsApp admin session

---

## 🎯 Prerequisites

### 1. Meta Setup (Done Outside System)

1. Go to **Meta WhatsApp Manager**
2. Create template manually
3. Submit for approval
4. Wait for status = **APPROVED**

### 2. Database Setup (Manual Insert)

Add approved template to your `streefi_whatsapp` table:

```json
{
  "PK": "TEMPLATE#your-template-id",
  "SK": "METADATA",
  "templateId": "your-template-id",
  "name": "streefi_offer",
  "category": "MARKETING",
  "language": "en",
  "variables": ["{{1}}"],
  "status": "active",
  "metaStatus": "APPROVED",
  "createdAt": "2026-02-24T10:00:00.000Z",
  "updatedAt": "2026-02-24T10:00:00.000Z"
}
```

**Critical Fields:**
- `status` must be `"active"`
- `metaStatus` must be `"APPROVED"`
- `name` must match Meta template name exactly

### 3. Environment Variables

Ensure these are set:

```bash
META_ACCESS_TOKEN=your_meta_access_token
META_PHONE_NUMBER_ID=your_phone_number_id
DYNAMODB_TABLE_NAME=streefi_whatsapp
```

---

## 📤 API Usage

### Request

```bash
POST /api/whatsapp-admin/send-template
Content-Type: application/json
Cookie: whatsapp-session=your_session_token

{
  "templateName": "streefi_offer",
  "recipient": "919876543210",
  "variables": ["John"]
}
```

**Fields:**
- `templateName` (required) - Template name from your DB
- `recipient` (required) - Phone number in international format (no + sign)
- `variables` (optional) - Array of variable values (must match template)

### Success Response

```json
{
  "success": true,
  "message": "Template message sent successfully",
  "data": {
    "messageId": "wamid.HBgNOTE5ODc2NTQzMjEwFQIAERgSMTYz...",
    "recipient": "919876543210",
    "template": "streefi_offer",
    "status": "sent"
  }
}
```

### Error Responses

#### Template Not Found
```json
{
  "error": "Template 'streefi_offer' not found in database"
}
```
**Status:** 404

#### Template Not Active
```json
{
  "error": "Template 'streefi_offer' is not active (status: draft)"
}
```
**Status:** 400

#### Template Not Approved
```json
{
  "error": "Template 'streefi_offer' is not approved by Meta (status: PENDING)"
}
```
**Status:** 400

#### Variable Mismatch
```json
{
  "error": "Template expects 2 variables, but 1 provided",
  "expectedVariables": ["{{1}}", "{{2}}"]
}
```
**Status:** 400

---

## 🧪 Testing Flow

### Step 1: Test with Your Own Number

```bash
curl -X POST http://localhost:3000/api/whatsapp-admin/send-template \
  -H "Content-Type: application/json" \
  -H "Cookie: whatsapp-session=your_token" \
  -d '{
    "templateName": "streefi_offer",
    "recipient": "YOUR_PHONE_NUMBER",
    "variables": ["Test User"]
  }'
```

Replace:
- `YOUR_PHONE_NUMBER` with your number (e.g., `919876543210`)
- Template and variables as per your setup

### Step 2: Check Message on WhatsApp

You should receive the message on your phone within seconds.

### Step 3: Verify in Console

Check your server logs:
```
=== SEND TEMPLATE START ===
✓ Session valid
✓ Template is active and approved
✓ Variables validated
✓ Message sent successfully
=== SEND TEMPLATE SUCCESS ===
```

---

## 🔒 Security Notes

### Validation Layers

The API validates:
1. ✅ Admin session (whatsapp-session cookie)
2. ✅ Template exists in DB
3. ✅ Template status = `active`
4. ✅ Template metaStatus = `APPROVED`
5. ✅ Variable count matches template
6. ✅ Phone number format

### Rate Limiting

**Not implemented yet** - Add later:
- Per-user rate limits
- Per-template rate limits
- Global rate limits

---

## 📋 Example Templates

### Simple Marketing Template

**Meta Template:**
```
Name: streefi_offer
Category: MARKETING
Language: en
Body: Hi {{1}}, get 20% off today! Visit streefi.com
```

**Usage:**
```json
{
  "templateName": "streefi_offer",
  "recipient": "919876543210",
  "variables": ["Raj"]
}
```

**Sent Message:**
```
Hi Raj, get 20% off today! Visit streefi.com
```

### Multi-Variable Template

**Meta Template:**
```
Name: order_confirmation
Category: UTILITY
Language: en
Body: Hi {{1}}, your order {{2}} is confirmed! Amount: ₹{{3}}
```

**Usage:**
```json
{
  "templateName": "order_confirmation",
  "recipient": "919876543210",
  "variables": ["Priya", "ORD123", "999"]
}
```

**Sent Message:**
```
Hi Priya, your order ORD123 is confirmed! Amount: ₹999
```

---

## 🚫 Common Errors

### "Meta API error: Template not found"

**Cause:** Template name in DB doesn't match Meta
**Fix:** Update DB template name to match Meta exactly

### "Meta API error: Invalid phone number"

**Cause:** Phone number format incorrect
**Fix:** Use international format without + (e.g., `919876543210`)

### "Template not approved by Meta"

**Cause:** Template still pending/rejected in Meta
**Fix:** Check Meta WhatsApp Manager and wait for approval

---

## 🎯 Next Steps

After successful testing:

1. ✅ Verify message delivered
2. ✅ Check Meta message logs
3. ✅ Add more approved templates
4. ✅ Build bulk send functionality (later)
5. ✅ Add rate limiting (later)
6. ✅ Add webhook for delivery status (later)

---

## 🔗 Related Docs

- [WHATSAPP-ADMIN-STRUCTURE.md](./WHATSAPP-ADMIN-STRUCTURE.md) - Overall architecture
- [WHATSAPP_WEBHOOK_SETUP.md](./WHATSAPP_WEBHOOK_SETUP.md) - Webhook setup (future)
- Meta Docs: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages

---

**Status:** ✅ Ready for Testing
**Last Updated:** 2026-02-24
