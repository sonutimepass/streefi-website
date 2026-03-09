# Meta WhatsApp Cloud API - Credentials Checklist

**Status**: ⚠️ CRITICAL - Variable Name Inconsistencies Found  
**Date**: March 9, 2026

---

## 🚨 CRITICAL ISSUE: Inconsistent Environment Variable Names

Your code uses **DIFFERENT names** for the same credentials across files:

### Phone Number ID Inconsistency:
```
❌ WHATSAPP_PHONE_ID              → Used in: /api/whatsapp/route.ts (LINE 228)
❌ WHATSAPP_PHONE_NUMBER_ID       → Used in: execute-batch routes
❌ META_PHONE_NUMBER_ID           → Used in: validate-setup, metaClient.ts
```

### Access Token Inconsistency:
```
✅ WHATSAPP_ACCESS_TOKEN          → Used consistently (with META_ fallback)
✅ META_ACCESS_TOKEN              → Fallback supported in metaClient.ts
```

**IMPACT**: Different API endpoints expect different variable names!

---

## ✅ Required Environment Variables (5 Total)

Add these to your hosting environment (Vercel/AWS Amplify/.env.local):

### 1. Access Token
```bash
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OR
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Where to get**: Meta Developer Dashboard → Your App → WhatsApp → API Setup → Temporary Access Token  
**Format**: Starts with `EAA`, 150-200 characters long  
**Used in**: All message sending, webhook signature verification

---

### 2. Phone Number ID ⚠️ **FIX REQUIRED**
```bash
# YOU MUST CHOOSE ONE NAME AND UPDATE CODE:

# Option A: Use WHATSAPP_PHONE_ID everywhere
WHATSAPP_PHONE_ID=106540352242922

# Option B: Use META_PHONE_NUMBER_ID everywhere
META_PHONE_NUMBER_ID=106540352242922
```

**Where to get**: Meta Developer Dashboard → Your App → WhatsApp → API Setup → Phone Number ID  
**Format**: 15-digit number  
**Used in**: All message sending API calls

**Current Issue**: 
- `/api/whatsapp/route.ts` expects `WHATSAPP_PHONE_ID`
- Execute-batch routes expect `WHATSAPP_PHONE_NUMBER_ID`
- Validate-setup expects `META_PHONE_NUMBER_ID`

---

### 3. App Secret (for webhook signature verification)
```bash
WHATSAPP_APP_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Where to get**: Meta Developer Dashboard → Your App → Settings → Basic → App Secret  
**Format**: 32-character hex string  
**Used in**: Webhook POST signature verification (security)

---

### 4. Webhook Verify Token (for webhook setup)
```bash
WHATSAPP_VERIFY_TOKEN=my_custom_verification_token_12345
```

**Where to get**: YOU CREATE THIS - any random string  
**Format**: Any string (suggest 20+ characters)  
**Used in**: Webhook GET verification handshake  
**Important**: You enter this BOTH in your code AND in Meta's webhook config

---

### 5. Business Account ID (optional, for dashboard)
```bash
WHATSAPP_BUSINESS_ACCOUNT_ID=102290129340398
```

**Where to get**: Meta Developer Dashboard → Your App → WhatsApp → API Setup  
**Format**: 15-digit number  
**Used in**: Webhook payload validation, account management APIs

---

## 🔧 REQUIRED FIX: Standardize Variable Names

You MUST fix the phone number ID inconsistency before testing.

### Recommended Solution: Use `META_` prefix everywhere

**Why**: 
- Clearer that it's from Meta's platform
- Matches Meta's documentation
- Already used in validate-setup

### Files to Update:

#### 1. Fix `/api/whatsapp/route.ts` (Line 228)
```typescript
// CHANGE FROM:
const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

// CHANGE TO:
const phoneNumberId = process.env.META_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;
```

#### 2. Fix execute-batch routes (2 files)
```typescript
// CHANGE FROM:
const accountId = process.env.WHATSAPP_PHONE_NUMBER_ID!;

// CHANGE TO:
const accountId = process.env.META_PHONE_NUMBER_ID!;
```

Files to update:
- `src/app/api/campaigns/[id]/execute-batch/route.ts`
- `src/app/api/internal/campaigns/execute-batch/route.ts`

---

## 📋 Complete Environment Setup Checklist

### Step 1: Get Credentials from Meta Dashboard

1. ✅ Go to: https://developers.facebook.com/apps/
2. ✅ Select your app (or create new app)
3. ✅ Go to: **WhatsApp → API Setup**
4. ✅ Copy **Temporary access token** → Use as `WHATSAPP_ACCESS_TOKEN`
5. ✅ Copy **Phone number ID** → Use as `META_PHONE_NUMBER_ID`
6. ✅ Copy **WhatsApp Business Account ID** → Use as `WHATSAPP_BUSINESS_ACCOUNT_ID`
7. ✅ Go to: **Settings → Basic**
8. ✅ Copy **App Secret** → Use as `WHATSAPP_APP_SECRET`
9. ✅ Create your own verify token → Use as `WHATSAPP_VERIFY_TOKEN`

### Step 2: Add to Environment Variables

#### For Local Development (.env.local):
```bash
# Meta WhatsApp Cloud API Credentials
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxx
META_PHONE_NUMBER_ID=106540352242922
WHATSAPP_APP_SECRET=a1b2c3d4e5f6g7h8i9j0
WHATSAPP_VERIFY_TOKEN=my_secure_verify_token_xyz123
WHATSAPP_BUSINESS_ACCOUNT_ID=102290129340398

# Meta API Configuration
META_API_VERSION=v18.0
META_DRY_RUN=false
```

#### For Production (Vercel/Amplify):
Add each variable in your hosting platform's environment variables section.

### Step 3: Verify Configuration

Run the validation endpoint:
```bash
curl -X GET https://yourdomain.com/api/whatsapp-admin/validate-setup \
  -H "Cookie: auth-session=your_session_token"
```

Expected response:
```json
{
  "checks": [
    {
      "name": "Environment Variables",
      "status": "✅ PASS"
    },
    {
      "name": "Meta Credentials Format",
      "status": "✅ PASS"
    }
  ],
  "ready": true
}
```

---

## 🧪 Testing Sequence (After Fix)

### Test 1: Webhook Verification
```bash
# Meta will call this during webhook setup:
GET https://yourdomain.com/api/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=12345

# Should return: 12345
```

**In Meta Dashboard:**
1. Go to: WhatsApp → Configuration
2. Click: Edit next to Webhook
3. Enter callback URL: `https://yourdomain.com/api/whatsapp`
4. Enter verify token: (same as `WHATSAPP_VERIFY_TOKEN`)
5. Click: Verify and Save

**Expected**: ✅ "Webhook verified successfully"

---

### Test 2: Send Test Message (Postman/cURL)
```bash
POST https://yourdomain.com/api/whatsapp
Content-Type: application/json
Cookie: auth-session=your_admin_session

{
  "phone": "919876543210",
  "template": {
    "name": "hello_world",
    "language": "en"
  }
}
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Template message sent successfully (hello_world)",
  "messageId": "wamid.HBgLMTY1MDM4Nzk0MzkVAgASGBQ..."
}
```

---

### Test 3: Receive Webhook Status Update

**What happens:**
1. You send message via API
2. Meta delivers message
3. Meta sends webhook to your endpoint

**Check logs for:**
```
✅ Webhook signature verified
📊 Message status update: { id: 'wamid.xxx', status: 'delivered' }
```

**Check DynamoDB for:**
```
PK: STATUS#wamid.xxx
SK: delivered
timestamp: 1234567890
```

---

### Test 4: Receive Inbound Message

**What to do:**
1. Send WhatsApp message FROM your phone TO business number
2. Meta sends webhook with message

**Expected webhook:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "from": "919876543210",
          "text": { "body": "Hello!" }
        }],
        "contacts": [{
          "profile": { "name": "John Doe" }
        }]
      }
    }]
  }]
}
```

**Check DynamoDB for:**
```
PK: CONVERSATION#919876543210
SK: MSG#1234567890#wamid.xxx
content: "Hello!"
direction: inbound
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Webhook signature verification failed"
**Cause**: `WHATSAPP_APP_SECRET` incorrect  
**Fix**: Copy exact value from Meta Dashboard → Settings → Basic → App Secret

### Issue 2: "WHATSAPP_PHONE_ID not configured"
**Cause**: Using wrong variable name  
**Fix**: Apply the variable name standardization fix above

### Issue 3: "Invalid access token"
**Cause**: Token expired (temporary tokens last 24 hours)  
**Fix**: Generate permanent token (System User + Business Manager)

### Issue 4: "Webhook verification failed: Token mismatch"
**Cause**: Verify token in code ≠ verify token in Meta dashboard  
**Fix**: Make sure both match exactly (case-sensitive)

### Issue 5: Message sends but webhook never arrives
**Cause**: Webhook not subscribed to correct fields  
**Fix**: Meta Dashboard → WhatsApp → Configuration → Webhook fields → Subscribe to `messages`

---

## 🚀 Production Readiness Checklist

- [ ] **Fix variable name inconsistencies** (see section above)
- [ ] **Add all 5 environment variables** to production
- [ ] **Generate permanent access token** (temporary expires in 24h)
- [ ] **Verify webhook** in Meta Dashboard
- [ ] **Subscribe webhook to `messages` field**
- [ ] **Test send message** via Postman
- [ ] **Test receive status update** (check logs)
- [ ] **Test receive inbound message** (send from phone)
- [ ] **Verify DynamoDB records** created
- [ ] **Check error logs** for any warnings
- [ ] **Request production access** from Meta (if using test mode)
- [ ] **Add business verification** (required for 1000+ users)

---

## 📚 Meta Dashboard URLs

- **Apps Dashboard**: https://developers.facebook.com/apps/
- **WhatsApp Setup**: https://developers.facebook.com/apps/YOUR_APP_ID/whatsapp-business/wa-dev-console/
- **Webhook Config**: https://developers.facebook.com/apps/YOUR_APP_ID/webhooks/
- **App Settings**: https://developers.facebook.com/apps/YOUR_APP_ID/settings/basic/
- **Business Manager**: https://business.facebook.com/settings/

---

## 🎯 What You Need To Do RIGHT NOW

1. ✅ **Apply the variable name fix** (3 files, 10 minutes)
2. ✅ **Get credentials from Meta** (15 minutes)
3. ✅ **Add to environment variables** (5 minutes)
4. ✅ **Test webhook verification** (5 minutes)
5. ✅ **Send test message** (5 minutes)

**Total time: ~40 minutes to full integration test**

After this, your system is ready for production testing! 🚀
