# Graph API Quick Start - 5 Minutes Setup

**Goal**: Get your dashboard working with Meta Graph API

---

## 🚀 Quick Setup (5 Minutes)

### 1. Get Your Credentials (3 minutes)
Visit [Meta Developers](https://developers.facebook.com/apps)

```bash
# Write these down:
Access Token: EAA_________________________ (from WhatsApp → API Setup)
Phone Number ID: ______________ (15 digits, from WhatsApp → API Setup)  
WABA ID: ______________ (15 digits, from WhatsApp → Getting Started)
```

---

### 2. Set Environment Variables (2 minutes)

#### AWS Amplify:
1. Open AWS Amplify Console
2. Your App → **Environment variables**
3. Add these 3 variables:

```
META_ACCESS_TOKEN = EAA_your_token_here
META_PHONE_NUMBER_ID = your_15_digit_phone_id
META_WABA_ID = your_15_digit_waba_id
```

4. Click **Save** → Redeploy app

#### Vercel:
```
Settings → Environment Variables → Add:
META_ACCESS_TOKEN = [token]
META_PHONE_NUMBER_ID = [phone_id]
META_WABA_ID = [waba_id]
```

#### Local (.env.local):
```bash
META_ACCESS_TOKEN=EAA_your_token_here
META_PHONE_NUMBER_ID=your_phone_id_here
META_WABA_ID=your_waba_id_here
```

---

### 3. Test It (30 seconds)

Visit: `https://yourdomain.com/api/whatsapp-admin/validate-setup`

**✅ Success looks like**:
```json
{
  "envVariables": {
    "META_ACCESS_TOKEN": true,
    "META_PHONE_NUMBER_ID": true
  },
  "graphApiConnection": {
    "success": true,
    "phoneNumber": "+1234567890"
  }
}
```

**❌ Error looks like**:
```json
{
  "error": "META_ACCESS_TOKEN not found"
}
```
→ Go back to Step 2

---

## 🎯 Now Use Your Dashboard

### ✅ Feature: Sync Templates
1. Go to `/whatsapp-admin/templates`
2. Click **"Sync from Meta"**
3. See all your approved templates

### ✅ Feature: Send Message
1. Go to `/whatsapp-admin/send`
2. Enter test phone number
3. Select template
4. Click "Send"

### ✅ Feature: View Account Health
1. Go to `/whatsapp-admin/account-health`
2. See quality score, alerts, stats

---

## ⚠️ Common Issues

| Problem | Solution |
|---------|----------|
| "Invalid OAuth token" | Regenerate token in Meta Developers |
| "Phone number not found" | Double-check Phone Number ID (15 digits) |
| No templates showing | Add `META_WABA_ID` and sync again |
| 401 Unauthorized | Check environment variables were deployed |

---

## 📞 Where to Get Each ID

### Access Token:
```
Meta Developers 
→ Select Your App
→ WhatsApp 
→ API Setup
→ Temporary access token (copy button)
```

### Phone Number ID:
```
Meta Developers 
→ Select Your App
→ WhatsApp 
→ API Setup
→ "From" field 
→ Phone Number ID (NOT your actual phone number)
```

### WABA ID:
```
Meta Developers 
→ Select Your App
→ WhatsApp 
→ Getting Started
→ WhatsApp Business Account ID
(or check URL: waba_id=XXXXX)
```

---

## ✅ Done!

Your dashboard is now connected to Meta Graph API and can:
- ✅ Send WhatsApp messages
- ✅ Sync templates
- ✅ Run campaigns
- ✅ Track delivery status
- ✅ View account health

**Full Guide**: See `docs/GRAPH-API-DASHBOARD-SETUP.md` for advanced features

---

## 🔒 Security Note

**Never commit these to Git:**
- ❌ `.env.local` (in .gitignore)
- ❌ Access tokens
- ❌ App secrets

**Only set them in:**
- ✅ AWS Amplify environment variables
- ✅ Vercel environment variables
- ✅ Local `.env.local` file (not committed)
