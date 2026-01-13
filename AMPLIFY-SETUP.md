# AWS Amplify Environment Variables Setup Guide

## Navigate to your Amplify Console:
1. Go to AWS Amplify Console
2. Select your app
3. Go to "Environment variables" in the left sidebar
4. Add the following variables:

## Required Environment Variables:

### Sentry Configuration
NEXT_PUBLIC_SENTRY_DSN=https://f030a7a544465d9e6a8941feec042724@o4510702448803840.ingest.de.sentry.io/4510702466039888
SENTRY_DSN=https://f030a7a544465d9e6a8941feec042724@o4510702448803840.ingest.de.sentry.io/4510702466039888
SENTRY_AUTH_TOKEN=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
SENTRY_ORG=streefi-private-limited
SENTRY_PROJECT=javascript-nextjs

### Build Configuration
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1

## Branch-Specific Variables:
- For your testing branch, you can set NODE_ENV=development if needed
- For production branch, keep NODE_ENV=production

## After Setting Variables:
1. Redeploy your testing branch
2. Check the build logs for any issues
3. Test the deployed application

## Verification:
- Check Sentry dashboard for error tracking
- Verify all pages load correctly
- Test error handling by triggering an error