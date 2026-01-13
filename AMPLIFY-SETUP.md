# AWS Amplify Environment Variables Setup Guide

## 🚨 IMPORTANT: Set These Environment Variables in Amplify Console

### Navigate to Amplify Console:
1. Go to AWS Amplify Console
2. Select your streefi-website app  
3. Click on your testing branch
4. Go to "Environment variables" tab
5. Click "Manage variables"

## ✅ Required Environment Variables (Copy exactly as shown):

```
Variable Name: NEXT_PUBLIC_SENTRY_DSN
Value: https://f030a7a544465d9e6a8941feec042724@o4510702448803840.ingest.de.sentry.io/4510702466039888

Variable Name: SENTRY_DSN  
Value: https://f030a7a544465d9e6a8941feec042724@o4510702448803840.ingest.de.sentry.io/4510702466039888

Variable Name: SENTRY_AUTH_TOKEN
Value: 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

Variable Name: SENTRY_ORG
Value: streefi-private-limited

Variable Name: SENTRY_PROJECT  
Value: javascript-nextjs

Variable Name: NODE_ENV
Value: production

Variable Name: NEXT_TELEMETRY_DISABLED
Value: 1
```

## 🔧 After Setting Variables:
1. Save the environment variables
2. Go to "App settings" → "Rewrites and redirects" 
3. Add this rule if not present:
   - Source address: `</^[^.]+$|\.(?!(css|gif|ico|jpg|jpeg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>`
   - Target address: `/index.html`
   - Type: `200 (Rewrite)`

## 🚀 Trigger New Build:
1. Go to your app in Amplify Console
2. Click "Run build" or push to testing branch
3. Monitor the build logs - should complete successfully now

## ✅ Verification Checklist:
- [ ] Build completes without "Failed to fetch" errors
- [ ] No SSM secrets setup errors  
- [ ] Website loads correctly
- [ ] Check Sentry dashboard for error tracking
- [ ] Test error handling by triggering an error

## 🔍 If Build Still Fails:
Check the build logs for these specific issues:
- Missing environment variables
- Network connectivity issues
- Dependency installation problems