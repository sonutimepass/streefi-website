# WhatsApp Environment Variables Configuration

## Current Setup: AWS Amplify Environment Variables ✅

Your WhatsApp Cloud API credentials are correctly stored as **server-side environment variables** in AWS Amplify.

---

## Required Environment Variables

Configure these in **AWS Amplify Console** → Your App → Environment Variables:

```bash
# WhatsApp Cloud API Credentials (Server-side ONLY)
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_ID=106540352242922
WHATSAPP_VERIFY_TOKEN=your_custom_verify_token
WHATSAPP_APP_SECRET=your_meta_app_secret
WHATSAPP_BUSINESS_ACCOUNT_ID=102290129340398

# Optional: Rate limiting
WHATSAPP_DAILY_LIMIT=1000
WHATSAPP_RATE_LIMIT_PER_SEC=10
```

---

## ⚠️ Critical Security Rule

### ✅ SAFE - Server-side variables:
```javascript
// In API routes (/app/api/**/route.ts)
const token = process.env.WHATSAPP_ACCESS_TOKEN; // ✅ Server-side only
```

### ❌ DANGEROUS - Never use NEXT_PUBLIC_ prefix:
```javascript
// NEVER DO THIS - exposes token to frontend bundle
const token = process.env.NEXT_PUBLIC_WHATSAPP_TOKEN; // ❌ PUBLIC
```

**Why?** 
- `NEXT_PUBLIC_*` variables are embedded in the client JavaScript bundle
- Anyone can open DevTools and extract them
- Your WhatsApp API token would be publicly exposed

---

## How It Works

### Server-Side (API Routes)
```typescript
// ✅ src/app/api/whatsapp/route.ts
export async function POST(req: NextRequest) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN; // Secure
  
  await fetch(
    `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    }
  );
}
```

### Client-Side (React Components)
```tsx
// ✅ src/modules/whatsapp-admin/components/SendForm.tsx
const handleSend = async () => {
  // Call API route - credentials never exposed to client
  const response = await fetch('/api/whatsapp', {
    method: 'POST',
    body: JSON.stringify({ phone, message })
  });
};
```

---

## Where Credentials Are Used

| File | Purpose | Variables Used |
|------|---------|----------------|
| `src/lib/whatsapp/meta/metaClient.ts` | Meta API client | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_ID` |
| `src/app/api/whatsapp/route.ts` | Webhook handler | `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` |
| `src/lib/whatsapp/meta/messageService.ts` | Message sending | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_ID` |

All access is **server-side only** - never exposed to the frontend bundle.

---

## Local Development

### .env.local (Local Only)
```bash
# Local development - NOT committed to Git
WHATSAPP_ACCESS_TOKEN=your_local_token
WHATSAPP_PHONE_ID=123456789
NEXT_PUBLIC_BYPASS_AUTH=true  # ✅ Safe - just a dev flag
```

**Note:** The `.env.local` file is gitignored. Real credentials are stored in AWS Amplify.

---

## Deployment Checklist

### Before deploying to AWS Amplify:

- [ ] Set `WHATSAPP_ACCESS_TOKEN` in Amplify environment variables
- [ ] Set `WHATSAPP_PHONE_ID` in Amplify environment variables  
- [ ] Set `WHATSAPP_VERIFY_TOKEN` in Amplify environment variables
- [ ] Set `WHATSAPP_APP_SECRET` in Amplify environment variables
- [ ] Verify NO `NEXT_PUBLIC_WHATSAPP_*` variables exist
- [ ] Test in staging environment first
- [ ] Confirm webhook verification works

**Get credentials from:** Meta Developer Dashboard → Your App → WhatsApp → API Setup

---

## When to Upgrade to AWS Secrets Manager

You should **NOT** migrate to AWS Secrets Manager until one of these becomes true:

1. ✅ **Multiple services** need the same credentials (e.g., separate Lambda functions)
2. ✅ **Token rotation** is required (automatic credential cycling)
3. ✅ **Multi-team access control** is needed (IAM-based secret permissions)
4. ✅ **Compliance requirements** mandate centralized secret management
5. ✅ **Production traffic** is high enough to justify the complexity

### Current reality for Streefi:
- ❌ Single Next.js app (no multi-service architecture)
- ❌ Low traffic / early stage
- ❌ Small team
- ✅ **Recommendation:** Keep using Amplify environment variables

**Secrets Manager adds:**
- Additional AWS service to manage
- Extra API calls on every request
- More complex deployment
- Higher costs ($0.40/secret/month + $0.05/10k API calls)

---

## Production Best Practices

### ✅ Current Setup (Amplify Env Variables)
```
Complexity:    ★☆☆☆☆ (Low)
Security:      ★★★★☆ (Good for startup stage)
Cost:          ★★★★★ (Free)
Maintenance:   ★★★★★ (Minimal)
```

### ⚠️ AWS Secrets Manager (Future)
```
Complexity:    ★★★☆☆ (Moderate)
Security:      ★★★★★ (Enterprise-grade)
Cost:          ★★☆☆☆ (Paid)
Maintenance:   ★★★☆☆ (Requires monitoring)
```

---

## Next Critical Steps (Post-Token Storage)

After confirming environment variables are set:

1. **Message Queue** - Implement SQS/Redis queue for WhatsApp messages
   - Prevents rate limit violations during campaigns
   - See: `docs/PRODUCTION-SCALABILITY-PHASE-3.md`

2. **Rate Limit Monitoring** - Track WhatsApp API usage
   - Current limit: 1000 messages/day (unverified business)
   - Implement circuit breaker pattern

3. **Error Handling** - Add retry logic and dead letter queue
   - Handle temporary Meta API failures
   - Log failed messages for manual retry

---

## Troubleshooting

### "401 Unauthorized" from Meta API
- ✅ Check `WHATSAPP_ACCESS_TOKEN` is set in Amplify
- ✅ Verify token is not expired (60-day validity)
- ✅ Confirm token has WhatsApp messaging permissions

### "Invalid Phone Number ID"
- ✅ Check `WHATSAPP_PHONE_ID` matches Meta dashboard
- ✅ Ensure no typos in environment variable name
- ✅ Restart Amplify build after updating env vars

### Webhook Verification Fails
- ✅ Verify `WHATSAPP_VERIFY_TOKEN` matches Meta webhook config
- ✅ Check `WHATSAPP_APP_SECRET` is correct
- ✅ Test webhook with Meta's verification tool

---

## Reference

- **Meta WhatsApp Cloud API Docs:** https://developers.facebook.com/docs/whatsapp/cloud-api
- **Next.js Environment Variables:** https://nextjs.org/docs/basic-features/environment-variables
- **AWS Amplify Env Config:** https://docs.amplify.aws/guides/hosting/nextjs/environment-variables

---

**Last Updated:** 2026-03-09  
**Status:** Production-ready ✅  
**Security Review:** Passed ✅
