# Quick Send - Production Usage Guide

**Page:** `/whatsapp-admin/send`

## ✅ Production-Ready Features

### 1. **Single Send Tab**
- Send to one person at a time
- Perfect for testing & individual messages
- Auto-validates phone format (10-15 digits)
- Shows template info before sending
- Dynamic variable inputs

### 2. **Bulk Send Tab**
- Send to multiple users (1-20 recommended)
- One phone number per line
- Confirmation dialog before sending
- Live progress updates
- 1 message/second rate (prevents Meta rate limits)
- Detailed success/fail report

## 📋 Before You Start

### First Time Setup:
1. Navigate to `/whatsapp-admin/templates`
2. Click "Sync Templates from Meta"
3. Verify you see APPROVED templates

### Phone Number Format:
```
✅ CORRECT:
919876543210   (India)
14155551234    (USA)
447911123456   (UK)

❌ WRONG:
+919876543210  (no + sign)
91 9876543210  (no spaces)
9876543210     (missing country code)
```

## 🚀 Usage Flow

### For Your Number & Friends (Testing):

1. Go to `/whatsapp-admin/send`
2. Select **Single Send** tab
3. Choose template: `hello_world` (or your approved template)
4. Enter phone number: `919876543210`
5. Fill variables (if any)
6. Click "Send Message"
7. ✅ Check your WhatsApp!

### For 10 Initial Users (Bulk):

1. Go to `/whatsapp-admin/send`
2. Select **Bulk Send** tab
3. Choose template
4. Paste phone numbers (one per line):
   ```
   919876543210
   919876543211
   919876543212
   ...
   ```
5. Fill variables (applied to ALL)
6. Click "Send to All"
7. Confirm in dialog
8. Watch progress (takes ~10 seconds for 10 users)
9. See results: "✅ Success: 10 ❌ Failed: 0"

## 🛡️ Safety Features

1. **Kill Switch Check** - Won't send if system disabled
2. **Template Validation** - Only APPROVED templates
3. **Phone Format Check** - Validates before sending
4. **Variable Validation** - Must fill all required fields
5. **Rate Limiting** - 1 message/second (bulk)
6. **Confirmation Dialog** - Bulk sends require confirmation

## ⚠️ Important Notes

### This is SAFE for production because:
- ✅ Uses approved templates only
- ✅ Same API as campaigns
- ✅ Respects Meta policies
- ✅ Has validation & safety checks
- ✅ Won't cause Meta ban

### When to Switch to Campaigns:
- 50+ users
- Need scheduling
- Want detailed analytics
- Daily recurring sends
- Need approval workflows

## 📊 Comparison

| Feature | Quick Send | Campaigns |
|---------|-----------|-----------|
| **Setup Time** | Instant | 5 minutes |
| **Best For** | 1-20 users | 50+ users |
| **Tracking** | Basic | Advanced |
| **Scheduling** | No | Yes |
| **Rate Limits** | Manual | Automated |
| **Analytics** | Message ID only | Full metrics |

## 🎯 Your Workflow

```
Phase 1: Testing (NOW)
├─ Use: Quick Send - Single
├─ Send to: Your number
└─ Verify: Message received

Phase 2: Friends (NEXT)
├─ Use: Quick Send - Bulk
├─ Send to: 5-10 friend numbers
└─ Verify: All received

Phase 3: Initial Users (READY)
├─ Use: Quick Send - Bulk
├─ Send to: ~10 real users
└─ Monitor: Success rate

Phase 4: Scale Up (LATER)
├─ Use: Campaigns
├─ Send to: 50+ users
└─ Track: Full analytics
```

## 🔍 Troubleshooting

### "Template not found"
→ Go to Templates page, click "Sync Templates from Meta"

### "Template not approved"
→ Check Meta dashboard, wait for approval

### "Invalid phone number"
→ Must be digits only, 10-15 characters, with country code

### "Failed to send"
→ Check kill switch is OFF (in header)
→ Verify Meta access token is valid
→ Check phone number is real & active

### "Rate limit exceeded"
→ Wait 1 minute, try again
→ Check Meta daily limit not exceeded

## ✅ Production Checklist

Before sending to real users:

- [ ] Template is APPROVED by Meta (green status)
- [ ] Tested on your own number successfully
- [ ] Phone numbers in correct format (verified)
- [ ] Users have opted-in to receive messages
- [ ] Variables filled correctly (if any)
- [ ] Kill switch is OFF
- [ ] Meta daily limit not exceeded
- [ ] Message content reviewed

## 📱 Expected Results

```
Single Send:
✅ Message sent successfully to 919876543210!
Message ID: wamid.HBgNOTE5ODc2NTQzMjEwFQ...

Bulk Send:
✅ Bulk send completed!

✅ Success: 10
❌ Failed: 0
```

## 🎉 You're Ready!

Your Quick Send page is production-ready for:
1. ✅ Your number (testing)
2. ✅ Friends' numbers (validation)  
3. ✅ Initial 10 users (real launches)

After 10-20 users, graduate to **Campaigns** for scaling.

---

**Built:** March 9, 2026
**Status:** Production Ready ✅
**Location:** `/whatsapp-admin/send`
