# WhatsApp Send Template - Testing Checklist

**Status:** Pre-Launch Validation  
**Date:** 2026-02-24

---

## 🎯 Goal

Send your first WhatsApp template message successfully.

---

## ✅ Phase 1: Meta Template Creation (MANUAL)

**Location:** Meta WhatsApp Business Platform

### Steps

- [ ] Login to Meta Business Manager
- [ ] Go to WhatsApp Manager
- [ ] Navigate to Message Templates
- [ ] Click "Create Template"
- [ ] Fill in template details:
  - **Name:** `streefi_test` (or your choice)
  - **Category:** MARKETING
  - **Language:** English
  - **Body:** `Hi {{1}}, welcome to Streefi!`
- [ ] Submit for approval
- [ ] Wait for status = **APPROVED** (usually 5-30 min)

**Proof:** Screenshot of approved template

---

## ✅ Phase 2: Database Insert (MANUAL)

**Location:** AWS DynamoDB Console → `streefi_whatsapp` table

### Action

Insert this item:

```json
{
  "PK": "TEMPLATE#streefi_test",
  "SK": "METADATA",
  "templateId": "streefi_test",
  "name": "streefi_test",
  "category": "MARKETING",
  "language": "en",
  "variables": ["{{1}}"],
  "status": "active",
  "metaStatus": "APPROVED",
  "createdAt": "2026-02-24T10:00:00.000Z",
  "updatedAt": "2026-02-24T10:00:00.000Z"
}
```

**Important:**
- `name` must match Meta template name exactly
- `status` must be `"active"`
- `metaStatus` must be `"APPROVED"`

**Checklist:**
- [ ] Item inserted in DynamoDB
- [ ] `PK` format correct: `TEMPLATE#streefi_test`
- [ ] `SK` is `METADATA`
- [ ] `status` = `active`
- [ ] `metaStatus` = `APPROVED`

---

## ✅ Phase 3: Environment Variables (PRODUCTION)

**Location:** AWS Amplify → Environment Variables

### Required Variables

- [ ] `META_ACCESS_TOKEN` - Your permanent Meta access token
- [ ] `META_PHONE_NUMBER_ID` - Your WhatsApp phone number ID (15+ digits)
- [ ] `DYNAMODB_TABLE_NAME` = `streefi_whatsapp`
- [ ] `AWS_REGION` = `ap-south-1` (or your region)

### How to Get Meta Credentials

1. **META_ACCESS_TOKEN:**
   - Go to Meta App Dashboard
   - Navigate to WhatsApp → Getting Started
   - Generate permanent access token (24-hour tokens expire!)
   - Copy full token

2. **META_PHONE_NUMBER_ID:**
   - Same page as access token
   - Find "Phone Number ID" (not the actual phone number)
   - Copy the numeric ID (looks like `123456789012345`)

**Validation:**
- [ ] Token length > 50 characters
- [ ] Phone ID is 15+ digits (numbers only)
- [ ] Variables saved in Amplify
- [ ] App redeployed after adding variables

---

## ✅ Phase 4: Pre-Flight Validation

**Endpoint:** `GET /api/whatsapp-admin/validate-setup`

### Test Request

```bash
curl https://streefi.com/api/whatsapp-admin/validate-setup \
  -H "Cookie: whatsapp-session=your_session_token"
```

### Expected Response

```json
{
  "timestamp": "2026-02-24T...",
  "ready": true,
  "checks": [
    {
      "name": "Admin Authentication",
      "status": "✅ PASS",
      "details": "Session valid"
    },
    {
      "name": "Environment Variables",
      "status": "✅ PASS",
      "details": "All required env vars present"
    },
    {
      "name": "Meta Credentials Format",
      "status": "✅ PASS",
      "details": "Token and Phone ID format valid"
    },
    {
      "name": "Database & Templates",
      "status": "✅ PASS",
      "details": "Found 1 ready template(s)",
      "templates": [
        {
          "name": "streefi_test",
          "category": "MARKETING",
          "language": "en",
          "variables": 1
        }
      ]
    }
  ]
}
```

**Checklist:**
- [ ] All checks show ✅ PASS
- [ ] `ready: true`
- [ ] Template appears in list

**If ready = false:**
- Check which step failed
- Fix the issue
- Re-run validation

---

## ✅ Phase 5: First Live Send

**Endpoint:** `POST /api/whatsapp-admin/send-template`

### Test Request

```bash
curl -X POST https://streefi.com/api/whatsapp-admin/send-template \
  -H "Content-Type: application/json" \
  -H "Cookie: whatsapp-session=your_session_token" \
  -d '{
    "templateName": "streefi_test",
    "recipient": "YOUR_PHONE_NUMBER",
    "variables": ["Nisar"]
  }'
```

**Replace:**
- `YOUR_PHONE_NUMBER` with your WhatsApp number (e.g., `919876543210`)
  - Format: country code + number (no + or spaces)
  - Example: India +91 9876543210 → `919876543210`

### Expected Response

```json
{
  "success": true,
  "message": "Template message sent successfully",
  "data": {
    "messageId": "wamid.HBgNOTE5ODc2NTQzMjEwFQIAERgS...",
    "recipient": "919876543210",
    "template": "streefi_test",
    "status": "sent"
  }
}
```

**Checklist:**
- [ ] Response shows `success: true`
- [ ] `messageId` present
- [ ] No error returned

---

## ✅ Phase 6: Message Verification

### On Your Phone

- [ ] Message received on WhatsApp
- [ ] Message text matches template
- [ ] Variable replaced correctly (e.g., "Hi Nisar, welcome to Streefi!")
- [ ] Message came from your business number
- [ ] No errors or warnings

### In Server Logs

Check Amplify logs for:

```
=== SEND TEMPLATE START ===
✓ Session valid
✓ Template is active and approved
✓ Variables validated
✓ Message sent successfully
=== SEND TEMPLATE SUCCESS ===
```

**Checklist:**
- [ ] All ✓ marks in logs
- [ ] No errors in logs
- [ ] messageId logged

---

## 🚨 Common Issues & Fixes

### Issue 1: "Template not found"
**Cause:** Template name mismatch  
**Fix:** Ensure DB `name` exactly matches Meta template name

### Issue 2: "Template not approved"
**Cause:** `metaStatus` not `APPROVED` in DB  
**Fix:** Update DB item, set `metaStatus` to `"APPROVED"`

### Issue 3: "Meta API error: Invalid phone number"
**Cause:** Wrong phone format  
**Fix:** Use international format without +: `919876543210`

### Issue 4: "Meta API error: Template not found"
**Cause:** Meta template name ≠ DB name  
**Fix:** Check Meta dashboard for exact template name

### Issue 5: "Unauthorized"
**Cause:** WhatsApp session expired  
**Fix:** Login again at `/whatsapp-admin`

### Issue 6: 500 Error + "Meta Access Token is required"
**Cause:** Missing env vars  
**Fix:** Add META_ACCESS_TOKEN and META_PHONE_NUMBER_ID in Amplify

---

## 🎯 Success Criteria

All of these must be ✅:

- [ ] Template approved in Meta
- [ ] Template stored in DB as active + approved
- [ ] Environment variables set in production
- [ ] Validation endpoint returns `ready: true`
- [ ] Send endpoint returns `success: true`
- [ ] Message received on phone
- [ ] Message content correct

---

## 🚀 After Success

Once first message works:

1. ✅ You've proven the full flow
2. ✅ Infrastructure is solid
3. ✅ Ready for Phase 3: Campaigns

**Next:** Build campaign/bulk sender for revenue generation

---

## 📝 Notes

- **Test with your own number first** - don't spam customers
- **Check Meta message limits** - your account has daily limits
- **Message logs in Meta** - check Business Manager for delivery status
- **Delivery takes 1-5 seconds** - be patient
- **Template changes require re-approval** - don't edit approved templates

---

**Prepared By:** GitHub Copilot  
**Last Updated:** 2026-02-24  
**Status:** Ready for Execution
