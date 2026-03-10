# 🚀 Production Deployment Roadmap

**Last Updated:** March 10, 2026  
**Status:** Testing Phase → Meta App Review → Production Launch

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current Status](#current-status)
3. [Phase 1: Testing with Meta Credentials](#phase-1-testing-with-meta-credentials)
4. [Phase 2: Meta App Review & Approval](#phase-2-meta-app-review--approval)
5. [Phase 3: Production Deployment](#phase-3-production-deployment)
6. [Phase 4: Post-Launch Monitoring](#phase-4-post-launch-monitoring)
7. [Rollback Plan](#rollback-plan)

---

## Overview

### ✅ Correct Deployment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: Testing (Current)                                     │
│  ├─ Test with Meta Test Credentials                             │
│  ├─ Send messages to your own numbers                           │
│  ├─ Verify templates work correctly                             │
│  └─ Test campaign execution flow                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2: Meta App Review                                       │
│  ├─ Submit app for Meta Business verification                   │
│  ├─ Provide use case documentation                              │
│  ├─ Privacy policy & terms of service                           │
│  └─ Wait for approval (7-14 days)                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3: Production Launch                                     │
│  ├─ Get permanent access token                                  │
│  ├─ Configure Amplify environment variables                     │
│  ├─ Deploy to production (streefi.in)                           │
│  └─ Enable production features                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Phase 4: Monitoring                                            │
│  ├─ Monitor message delivery rates                              │
│  ├─ Track Meta API quota usage                                  │
│  ├─ Watch for errors and edge cases                             │
│  └─ Scale limits based on Meta tier upgrades                    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Current Status

### ✅ Completed Setup

| Component | Status | Details |
|-----------|--------|---------|
| **DynamoDB Tables** | ✅ Ready | 4 active tables configured |
| **WhatsApp Template** | ✅ Created | "streefi" template approved & inserted |
| **Authentication** | ✅ Working | Admin login configured |
| **Environment Config** | ✅ Production Mode | `META_DRY_RUN=false`, Auth bypass removed |
| **Meta Credentials** | ⚠️ Testing | Using test/temporary tokens |

### 🔄 Current Phase: **Testing with Real Meta Credentials**

---

## Phase 1: Testing with Meta Credentials

**Duration:** 1-3 days  
**Goal:** Verify everything works with real Meta API before going to production

### Step 1.1: Verify Meta Credentials

✅ **Already configured in `.env.local`:**
```bash
WHATSAPP_ACCESS_TOKEN=<your_temp_token>
WHATSAPP_PHONE_ID=990969214103668
META_PHONE_NUMBER_ID=106540352242922
WHATSAPP_BUSINESS_ACCOUNT_ID=1232406501851826
WHATSAPP_VERIFY_TOKEN=<your_verify_token>
```

**Check validity:**
1. Go to [Meta Business Manager](https://business.facebook.com/)
2. Navigate to **WhatsApp → API Setup**
3. Verify token is valid (expires in 24-90 days for test tokens)

---

### Step 1.2: Test Message Sending

**Test with your own phone number:**

1. **Start development server:**
   ```powershell
   npm run dev
   ```

2. **Log in to WhatsApp Admin:**
   - URL: `http://localhost:3000/whatsapp-admin/dashboard`
   - Email: `admin@streefi.in`
   - Password: `SonuTheGreat@Streefi`

3. **Send test message:**
   - Go to **Send Message** page
   - Select template: `streefi`
   - Enter your WhatsApp number: `+91XXXXXXXXXX`
   - Fill variables:
     - {{1}}: Your name
     - {{2}}: Test date
   - Click **Send Message**

4. **Verify delivery:**
   - Check your WhatsApp for the message
   - Verify variables were replaced correctly
   - Check message format and content

---

### Step 1.3: Test Campaign Flow (Optional)

**Create a small test campaign:**

1. **Create Campaign:**
   - Go to **Campaigns** → **Create Campaign**
   - Name: "Test Campaign"
   - Template: `streefi`
   - Daily limit: 10
   - Recipients: 2-3 test phone numbers (your own numbers)

2. **Execute Campaign:**
   - Start the campaign
   - Monitor execution in real-time
   - Check logs for any errors

3. **Verify Results:**
   - All test messages delivered
   - No Meta API errors
   - Logs show correct timestamps

---

### Step 1.4: Checklist Before Moving Forward

**✅ Complete this checklist:**

- [ ] Test message sent successfully to your number
- [ ] Template variables replaced correctly
- [ ] No Meta API errors (check browser console & server logs)
- [ ] Message appears in WhatsApp correctly formatted
- [ ] Admin dashboard accessible (no auth bypass)
- [ ] Session persists across page refreshes
- [ ] Campaign execution works (if tested)

**⚠️ If any item fails:**
- Check server logs: `npm run dev` output
- Check browser console: F12 → Console tab
- Verify Meta credentials are correct
- Check DynamoDB tables have correct data

---

## Phase 2: Meta App Review & Approval

**Duration:** 7-14 days (Meta review process)  
**Goal:** Get your WhatsApp Business API app approved for production use

### Why Meta App Review is Required

**You MUST complete Meta App Review to:**
- ✅ Send messages to customers (not just test numbers)
- ✅ Get permanent access tokens (current tokens expire)
- ✅ Increase messaging tier limits (beyond Tier 1)
- ✅ Use business account features
- ✅ Comply with Meta's Business Policies

**⚠️ Without approval:**
- ❌ Can only send to test numbers registered in Meta Business Manager
- ❌ Access tokens expire frequently
- ❌ Limited to Tier 1 (250 conversations/day)
- ❌ Cannot scale to production volume

---

### Step 2.1: Prepare Required Documents

**Meta requires these for app review:**

#### 1. **Business Verification Documents**
- Company registration documents
- Business license
- Tax registration (GST certificate for India)
- Proof of business address

#### 2. **Privacy Policy** (publicly accessible URL)
**Must include:**
- What user data you collect via WhatsApp
- How you use WhatsApp message data
- Data retention policies
- User rights (opt-out, data deletion)
- Contact information for privacy concerns

**Example URL:** `https://streefi.in/privacy-policy`

#### 3. **Terms of Service** (publicly accessible URL)
**Must include:**
- Service description
- User responsibilities
- Prohibited uses
- Service availability disclaimers

**Example URL:** `https://streefi.in/terms-of-service`

#### 4. **Use Case Documentation**
**Describe your WhatsApp integration:**
- **Use case:** Customer service feedback collection
- **Message types:** Transactional (service completion notifications)
- **Template category:** UTILITY
- **Expected volume:** 200 conversations/day initially
- **User opt-in process:** Service agreement includes WhatsApp consent

---

### Step 2.2: Submit Meta App for Review

**Steps to submit:**

1. **Go to Meta Business Manager:**
   - URL: https://business.facebook.com/
   - Navigate to **Settings → WhatsApp Business API**

2. **Start App Review Process:**
   - Click **"Get Started"** or **"Submit for Review"**
   - Select **"WhatsApp Business API Access"**

3. **Fill Application Form:**
   - **App category:** Customer Service
   - **Use case:** Customer feedback collection after service completion
   - **Privacy Policy URL:** `https://streefi.in/privacy-policy`
   - **Terms of Service URL:** `https://streefi.in/terms-of-service`
   - **Expected message volume:** 200-500/day

4. **Upload Business Documents:**
   - Company registration
   - Business license
   - GST certificate (India)

5. **Template Approval:**
   - Your "streefi" template should already be approved
   - If not, submit for approval during app review

6. **Submit Application:**
   - Review all information
   - Submit for Meta review
   - Track status in Business Manager

---

### Step 2.3: During Meta Review

**Timeline:** 7-14 business days

**What Meta checks:**
- ✅ Business legitimacy (documents)
- ✅ Privacy policy compliance
- ✅ Template content follows guidelines
- ✅ Use case is legitimate
- ✅ No policy violations

**What you should do:**
- Monitor email for Meta communications
- Respond quickly to any questions
- Keep business manager notifications enabled
- Don't make major changes to templates during review

**Possible outcomes:**
- ✅ **Approved:** You're ready for production!
- ⚠️ **More info needed:** Respond within 48 hours
- ❌ **Rejected:** Address issues and resubmit

---

## Phase 3: Production Deployment

**Duration:** 1-2 hours  
**Goal:** Deploy approved app to production with permanent credentials

### Step 3.1: Get Permanent Access Token

**After Meta approval:**

1. **Go to Meta Business Settings:**
   - Navigate to **System Users**
   - Create new system user: "Streefi Production"
   - Assign permissions: **WhatsApp Business Management**

2. **Generate Permanent Token:**
   - Select system user
   - Click **"Generate New Token"**
   - Select your WhatsApp Business Account
   - Permissions: `whatsapp_business_management`, `whatsapp_business_messaging`
   - Token **NEVER EXPIRES** ✅

3. **Save token securely:**
   - Store in password manager
   - Never commit to git
   - Use for production only

---

### Step 3.2: Configure AWS Amplify Environment Variables

**Set these in Amplify Console:**

1. **Go to AWS Amplify Console:**
   - URL: https://console.aws.amazon.com/amplify/
   - Select your app: `streefi-website`

2. **Navigate to Environment Variables:**
   - Left sidebar → **Environment variables**
   - Branch: `main` (production)

3. **Add/Update variables:**

```bash
# DynamoDB Configuration
DYNAMODB_TABLE_NAME=streefi_whatsapp
WHATSAPP_CONVERSATIONS_TABLE_NAME=whatsapp_conversations
ADMIN_TABLE_NAME=streefi_admins
SESSION_TABLE_NAME=streefi_sessions
CAMPAIGNS_TABLE_NAME=streefi_campaigns
RECIPIENTS_TABLE_NAME=streefi_campaign_recipients
CONTACTS_TABLE_NAME=streefi_campaign_contacts

# WhatsApp Admin - NO BYPASS IN PRODUCTION!
# Do NOT set NEXT_PUBLIC_BYPASS_AUTH

# Admin credentials
WA_ADMIN_PASSWORD_HASH=baef7f0741609c48713cfa78d2de808fcdc8de40c6367a9dce0c24ed5d97ed98:97669544cb509391c7323d1abfe96f39710a29b19fc2f422b8f80397c400dab4b2eca115d85a4bacaa83821956e73420641fb46e5b9b7dd21faf1a14d9a4eaaa

# Production Mode
META_DRY_RUN=false
WHATSAPP_DAILY_LIMIT=200

# Meta WhatsApp API (PERMANENT TOKENS from Step 3.1)
WHATSAPP_ACCESS_TOKEN=<PERMANENT_TOKEN_FROM_SYSTEM_USER>
WHATSAPP_PHONE_ID=990969214103668
META_PHONE_NUMBER_ID=106540352242922
WHATSAPP_BUSINESS_ACCOUNT_ID=1232406501851826
WHATSAPP_VERIFY_TOKEN=<SECURE_RANDOM_STRING>
WHATSAPP_APP_SECRET=<APP_SECRET_FROM_META_DASHBOARD>

# Security
DISPATCHER_SECRET_KEY=<GENERATE_NEW_32_CHAR_RANDOM>
WHATSAPP_RATE_LIMIT_PER_SEC=10
INTERNAL_OPERATIONS_KEY=<GENERATE_NEW_32_CHAR_RANDOM>
TRACKING_TOKEN_SECRET=<GENERATE_NEW_64_CHAR_RANDOM>

# Site Config
NEXT_PUBLIC_SITE_URL=https://streefi.in

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-23ZXPRW9QQ
NEXT_PUBLIC_GTM_ID=GTM-5ZFVTDQV

# Zoho (if using)
ZOHO_CLIENT_ID=<YOUR_ZOHO_CLIENT_ID>
ZOHO_CLIENT_SECRET=<YOUR_ZOHO_CLIENT_SECRET>
ZOHO_REFRESH_TOKEN=<YOUR_ZOHO_REFRESH_TOKEN>
FROM_EMAIL=support@streefi.in
EMAIL_ADMIN_PASSWORD_HASH=<YOUR_EMAIL_ADMIN_HASH>
```

4. **Save changes**

---

### Step 3.3: Deploy to Production

**Deployment checklist:**

```bash
# 1. Verify all code changes committed
git status

# 2. Push to main branch (triggers Amplify build)
git checkout main
git merge testing  # or your feature branch
git push origin main

# 3. Monitor Amplify build
# Go to Amplify Console → Build details
# Watch for:
# - ✅ Provision (30s)
# - ✅ Build (3-5 min)
# - ✅ Deploy (1-2 min)
# - ✅ Verify (30s)

# 4. Build should complete successfully
# Check logs for any errors
```

**Watch for build errors:**
- Missing environment variables
- Build failures (check build logs)
- Deploy errors (check deploy logs)

---

### Step 3.4: Post-Deployment Verification

**Test production deployment:**

1. **Access Production Site:**
   - URL: `https://streefi.in/whatsapp-admin/dashboard`
   - Should redirect to login (no bypass enabled)

2. **Log In:**
   - Email: `admin@streefi.in`
   - Password: `SonuTheGreat@Streefi`
   - Should create session successfully

3. **Verify Templates Loaded:**
   - Go to **Templates** page
   - Verify "streefi" template appears
   - Status should be "ACTIVE" with "APPROVED"

4. **Send Production Test Message:**
   - Go to **Send Message**
   - Select "streefi" template
   - Send to your test number
   - **✅ Should send REAL message** (META_DRY_RUN=false)

5. **Check Production Logs:**
   - AWS Amplify Console → Monitoring → Logs
   - CloudWatch Logs for Lambda functions
   - Look for any errors

---

## Phase 4: Post-Launch Monitoring

**Duration:** Ongoing  
**Goal:** Monitor production performance and health

### Step 4.1: Daily Monitoring Checklist

**Check these daily for first 2 weeks:**

- [ ] **Message Delivery Rates**
  - Target: >95% delivery rate
  - Check WhatsApp Business Manager analytics

- [ ] **Meta API Quota Usage**
  - Monitor daily conversation limits
  - Check for approaching limits
  - Verify safety buffers working

- [ ] **Error Rates**
  - CloudWatch logs for errors
  - Check campaign execution logs
  - Monitor failed message attempts

- [ ] **DynamoDB Performance**
  - Check read/write capacity
  - Monitor throttling events
  - Verify backup completion

- [ ] **System Health**
  - Admin dashboard accessible
  - Template syncing working
  - Campaign execution smooth

---

### Step 4.2: Set Up CloudWatch Alarms

**Critical alarms to configure:**

1. **High Error Rate:**
   ```
   Metric: Lambda Errors
   Threshold: > 5 errors in 5 minutes
   Action: SNS notification to admin email
   ```

2. **Daily Limit Approaching:**
   ```
   Metric: Custom Metric - DailyMessageCount
   Threshold: > 180 (90% of 200 limit)
   Action: SNS notification
   ```

3. **Template Send Failures:**
   ```
   Metric: Custom Metric - TemplateSendFailures
   Threshold: > 3 consecutive failures
   Action: SNS notification
   ```

4. **DynamoDB Throttling:**
   ```
   Metric: ThrottledRequests
   Threshold: > 10 in 5 minutes
   Action: SNS notification
   ```

---

### Step 4.3: Performance Optimization

**After 1-2 weeks of monitoring:**

1. **Analyze Usage Patterns:**
   - Peak sending times
   - Average campaign size
   - Template usage distribution

2. **Optimize Limits:**
   - Adjust daily limits based on actual usage
   - Fine-tune rate limiting (msg/sec)
   - Configure batch sizes

3. **Request Meta Tier Upgrade (if needed):**
   - **Tier 1:** 250 conversations/day (current)
   - **Tier 2:** 1,000 conversations/day
   - **Tier 3:** 10,000 conversations/day
   - **Tier 4:** 100,000 conversations/day

4. **Scale Infrastructure (if needed):**
   - Increase DynamoDB capacity
   - Add read replicas
   - Configure DynamoDB auto-scaling

---

## Rollback Plan

**If production issues occur:**

### Emergency Rollback

**Fast rollback (< 5 minutes):**

```bash
# Option 1: Amplify Console Rollback
# 1. Go to AWS Amplify Console
# 2. Click on failed deployment
# 3. Click "Redeploy" on previous successful build

# Option 2: Git Rollback
git revert HEAD
git push origin main
# Wait for Amplify to rebuild (3-5 min)
```

---

### Enable Kill Switch

**If messages need to stop immediately:**

1. **Set kill switch via API:**
   ```bash
   # From admin dashboard
   # Go to Settings → Enable Kill Switch
   # Reason: "Emergency stop - investigating issue"
   ```

2. **Or set via DynamoDB directly:**
   ```powershell
   aws dynamodb put-item `
     --table-name streefi_whatsapp `
     --region ap-south-1 `
     --item '{
       "PK": {"S": "SYSTEM"},
       "SK": {"S": "KILL_SWITCH"},
       "enabled": {"BOOL": true},
       "reason": {"S": "Emergency stop"},
       "enabledAt": {"S": "'$(Get-Date -Format o)'"}
     }'
   ```

3. **All message sending stops immediately**
   - Campaigns pause
   - Manual sends blocked
   - Admin dashboard shows kill switch banner

---

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| **401 Unauthorized errors** | Invalid Meta token | Regenerate token in Meta Business Manager |
| **Messages not delivering** | Template not approved | Re-submit template for approval |
| **High error rates** | Rate limiting | Reduce `WHATSAPP_RATE_LIMIT_PER_SEC` |
| **Daily limit hit early** | Usage spike | Increase `WHATSAPP_DAILY_LIMIT` or enable kill switch |
| **Session timeouts** | Cookie issues | Check cookie settings, verify HTTPS |
| **Build failures** | Missing env vars | Check Amplify environment variables |

---

## Summary: Your Current Position

### ✅ You Are Here:

```
Phase 1: Testing with Meta Credentials
├─ ✅ Environment configured for production mode
├─ ✅ AUTH_BYPASS removed
├─ ✅ META_DRY_RUN=false (real sending enabled)
├─ ✅ Template inserted in DynamoDB
└─ 🔄 NEXT: Test message sending with real Meta credentials
```

### 🎯 Next Steps (in order):

1. **Test messaging thoroughly** (Phase 1.2-1.4)
   - Send test messages to your phone
   - Verify everything works
   - Complete checklist

2. **Prepare documents** (Phase 2.1)
   - Create privacy policy page
   - Create terms of service page
   - Gather business documents

3. **Submit Meta App Review** (Phase 2.2)
   - Fill application form
   - Upload documents
   - Wait 7-14 days

4. **Get permanent token** (Phase 3.1)
   - After Meta approval
   - Create system user
   - Generate non-expiring token

5. **Deploy to production** (Phase 3.2-3.4)
   - Configure Amplify env vars
   - Push to main branch
   - Verify deployment

6. **Monitor & optimize** (Phase 4)
   - Daily health checks
   - Set up alarms
   - Scale as needed

---

## 🚨 Critical Reminders

### ⚠️ DO NOT skip Meta App Review!

**Attempting to use production without approval will result in:**
- Account suspension
- Token revocation
- Business account ban
- Service disruption

### ⚠️ ALWAYS test before deploying!

**Test checklist:**
- Test on staging/dev first
- Verify all credentials work
- Check logs for errors
- Send test messages
- Monitor for 24 hours

### ⚠️ NEVER commit secrets to git!

**Secrets that must stay out of git:**
- Access tokens
- App secrets
- Admin password hashes
- API keys
- Database credentials

---

## Need Help?

### 📚 Meta Resources:
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Meta Business Help Center](https://www.facebook.com/business/help)
- [App Review Guidelines](https://developers.facebook.com/docs/app-review)

### 🛠️ Technical Support:
- Check server logs: AWS Amplify Console → Monitoring
- Check DynamoDB: AWS Console → DynamoDB → Tables
- Check Meta API: Meta Business Manager → WhatsApp → Insights

---

**Good luck with your deployment! 🚀**
