# AWS Amplify Redirect Setup Instructions

## Overview

This guide explains how to configure redirects for your Streefi static site hosted on AWS Amplify.

Since you're using `output: 'export'` (static export), Next.js redirects don't work in production. Instead, redirects must be configured in the AWS Amplify Console.

---

## Step 1: Access Amplify Console

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **AWS Amplify**
3. Select your **Streefi app**

---

## Step 2: Configure Redirects

1. In the left sidebar, click **"App settings"**
2. Click **"Rewrites and redirects"**
3. Click **"Manage redirects"** button
4. Click **"Open text editor"** (or "JSON editor")
5. **Delete all existing content**
6. Copy the entire content from `amplify-redirects.json`
7. Paste into the editor
8. Click **"Save"**

---

## Step 3: Verify Configuration

Redirects take effect **immediately** - no rebuild needed!

### Test Commands:

```bash
# Test home redirect
curl -I https://streefi.in/home
# Expected: HTTP/2 301, location: https://streefi.in/

# Test WWW redirect  
curl -I https://www.streefi.in/
# Expected: HTTP/2 301, location: https://streefi.in/

# Test policy redirect
curl -I https://streefi.in/privacy
# Expected: HTTP/2 301, location: https://streefi.in/policies/policy#privacy

# Test SPA fallback (any unknown route)
curl -I https://streefi.in/some-random-path
# Expected: HTTP/2 200 (serves index.html)
```

---

## Redirect Types Explained

| Status | Type | Use Case |
|--------|------|----------|
| `301` | Permanent | SEO-friendly, cached by browsers |
| `302` | Temporary | For pages that might change |
| `200` | Rewrite | SPA fallback (serves index.html) |
| `404` | Not Found | Block malicious paths |

---

## Important Notes

### 1. Keep next.config.ts Redirects
Don't remove redirects from `next.config.ts`! They work for local development with `npm run dev`.

### 2. SPA Fallback Rule
The last rule in `amplify-redirects.json` is critical:
```json
{
  "source": "</^[^.]+$|\\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json|webp|avif|mp4|webm)$)([^.]+$)/>",
  "target": "/index.html",
  "status": "200"
}
```
This ensures client-side routing works for your Next.js static site.

### 3. Order Matters
Amplify processes redirects in order. The SPA fallback must be **LAST**.

---

## Troubleshooting

### Redirect not working?
1. Check browser cache - try incognito/private mode
2. Verify JSON syntax is valid
3. Ensure the rule is in the correct order

### 404 on valid pages?
The SPA fallback rule might be missing or incorrect. Make sure it's the last rule.

### Hash fragments not working?
Hash fragments (#privacy, #terms, etc.) are handled client-side. The redirect just needs to get to the correct page.

---

## File Reference

| File | Purpose |
|------|---------|
| `amplify.yml` | Build configuration for Amplify |
| `amplify-redirects.json` | Redirect rules (paste into Amplify Console) |
| `next.config.ts` | Local dev redirects (keep as-is) |

---

## Support

If you encounter issues:
1. Check Amplify Console logs
2. Verify `out/` directory contains your static files
3. Test locally with `npm run build && npx serve out`
