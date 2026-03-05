# WhatsApp Admin: Pre-Launch Checklist

**Status**: Ready for Controlled Launch  
**Last Updated**: March 5, 2026  
**Reviewed By**: Structural Hardening Phase

---

## ✅ COMPLETED: Structural Hardening

### 1. Route Segmentation (DONE)
**Old**: Single `/whatsapp-admin` page with tabs  
**New**: Clean route-based navigation

```
/whatsapp-admin → redirects to /dashboard
/whatsapp-admin/dashboard → Landing page with quick navigation
/whatsapp-admin/campaigns → Campaign list
/whatsapp-admin/campaigns/[id] → Campaign detail (replaces modal)
/whatsapp-admin/templates → Template manager
/whatsapp-admin/settings → Global settings
```

**Benefits**:
- ✅ Sharable campaign URLs
- ✅ URL-driven state
- ✅ Cleaner data loading
- ✅ Better long-term maintainability

---

### 2. DynamoDB Access Patterns (SECURED)

**Critical Fix Applied**: Campaign list API now has hard limit
```typescript
// BEFORE: Unlimited scan (AWS bill explosion risk)
ScanCommand({ ... })

// AFTER: Capped at 1000 campaigns
ScanCommand({ 
  Limit: 1000  // Hard cap prevents runaway costs
})
```

**Verified Patterns**:
- ✅ Kill switch: Single-item fetch `PK=SYSTEM, SK=KILL_SWITCH`
- ✅ Settings: Single-item fetch `PK=SYSTEM, SK=SETTINGS`
- ✅ Campaign create: Proper PK/SK structure
- ✅ Campaign list: **NOW LIMITED** to 1000 items
- ⚠️ **Note**: If you exceed 1000 campaigns, implement pagination

---

### 3. Layer Boundaries (VERIFIED)

**Audit Results**: Clean separation maintained

```
app/api/*        → Orchestration only ✓
lib/*            → Pure logic (no UI) ✓
modules/*        → UI only ✓
services/*       → Business logic ✓
```

**No violations found**:
- ✅ No DynamoDB logic in UI components
- ✅ No UI code in API routes
- ✅ Clean imports and dependencies

---

### 4. Admin Separation (CONFIRMED)

**Email Admin vs WhatsApp Admin**: Hard separated

```typescript
// Separate session types
"email-session"    → "email_admin_session" cookie
"whatsapp-session" → "wa_admin_session" cookie

// Separate contexts
EmailAdminProvider    → modules/email-admin/
WhatsAppAdminProvider → modules/whatsapp-admin/
```

**Verified**:
- ✅ No shared auth confusion
- ✅ Separate context providers
- ✅ No cross-contamination possible

---

## 🚨 CRITICAL: Pre-Launch Validation

### Phase 1: Local Testing (30 minutes)

```bash
# 1. Clean install
npm ci

# 2. Build check
npm run build

# 3. Start dev server
npm run dev
```

**Manual Tests**:
1. Navigate to `/whatsapp-admin` → Should redirect to `/dashboard`
2. Click "Campaigns" card → Should navigate to `/whatsapp-admin/campaigns`
3. Click a campaign in list → Should navigate to `/whatsapp-admin/campaigns/[id]`
4. Test Emergency Kill Switch → Top-right button should work
5. Navigate to Settings tab → Should show global controls
6. Create a test campaign → Should refresh list and show new campaign
7. Click campaign detail → Should show full page (not modal)
8. Test back navigation → Should work cleanly

---

### Phase 2: Deploy to Staging

```bash
# 1. Run build locally
npm run build

# 2. Check for errors
# Verify no TypeScript errors
# Verify no bundle size bloat

# 3. Deploy to staging (Amplify/Vercel)
git push origin staging
```

**Staging Tests**:
1. Test all routes work in production build
2. Verify authentication works (not bypassed)
3. Test campaign creation with real Meta credentials (dry run mode)
4. Verify DynamoDB connections work
5. Test kill switch persists across sessions
6. Test settings updates save correctly

---

### Phase 3: Meta Integration Validation

**⚠️ DO NOT SKIP THIS**

Before sending to REAL users:
1. Verify `META_DRY_RUN=false` in production env
2. Test sending 1 message to YOUR phone number
3. Verify message delivery in WhatsApp
4. Check Meta Business Manager for API usage
5. Verify rate limits are respected
6. Test kill switch actually stops sending

**Meta API Checklist**:
- [ ] `WHATSAPP_PHONE_NUMBER_ID` set correctly
- [ ] `META_ACCESS_TOKEN` is production token (not dev)
- [ ] `META_BUSINESS_ACCOUNT_ID` verified
- [ ] Template IDs match Meta Business Manager
- [ ] Phone number is verified in Meta dashboard

---

## 📋 Production Launch Checklist

### Infrastructure
- [ ] DynamoDB table exists: `streefi_whatsapp`
- [ ] DynamoDB TTL enabled on logs (if applicable)
- [ ] AWS credentials configured (not hardcoded)
- [ ] Environment variables set in production
- [ ] Error tracking configured (Sentry/Rollbar)
- [ ] Rate limits tested

### Safety Controls
- [ ] Emergency kill switch tested and working
- [ ] Global rate limits configured (20 msg/sec)
- [ ] Daily caps enforced (200 default)
- [ ] Safety buffer set (80%)
- [ ] Admin authentication working (not bypassed)

### Monitoring
- [ ] CloudWatch alarms set for DynamoDB
- [ ] Meta API error monitoring active
- [ ] Admin session expiry tested
- [ ] Campaign logs viewable
- [ ] Failed message tracking works

### Documentation
- [ ] Admin team trained on kill switch
- [ ] Emergency procedures documented
- [ ] Meta support contact info available
- [ ] Escalation path defined for API issues

---

## 🎯 Launch Day Protocol

### Start Small (First 24 Hours)
1. Launch with **1 campaign only**
2. Max **50 recipients** for first test
3. Monitor every send in real-time
4. Keep kill switch visible on screen
5. Have Meta Business Manager open

### If All Goes Well (Days 2-7)
1. Increase to 2-3 campaigns
2. Max **500 recipients per campaign**
3. Monitor daily usage vs Meta limits
4. Check for delivery issues
5. Verify daily caps are enforced

### Scale Phase (Week 2+)
1. Increase to production volume
2. Still stay under 80% of Meta tier limit
3. Monitor for rate limit errors
4. Keep kill switch accessible

---

## 🚫 DO NOT DO (Post-Launch)

**For the next 2-4 weeks, DO NOT**:
- Add analytics dashboards
- Add conversation tracking
- Add vendor-facing controls
- Add scheduled automation
- Add any new features that increase surface area

**Focus Only On**:
- Stability
- Monitoring
- Bug fixes
- Performance optimization
- User feedback

---

## 🔥 Emergency Contacts

**If Meta Flags Your Account**:
1. Hit Emergency Kill Switch immediately
2. Stop all campaigns
3. Contact Meta Business Support: [Meta Support Link]
4. Document the issue
5. Wait for Meta resolution before resuming

**If AWS Bills Spike**:
1. Check CloudWatch metrics
2. Verify no runaway Scan operations
3. Check campaign list API limit (should be 1000)
4. Reduce campaign creation if needed

**If Sending Fails**:
1. Check Meta API status
2. Verify access token is valid
3. Check phone number verification
4. Review error logs in campaign detail
5. Test with single message first

---

## 📈 Success Metrics (Week 1)

**Track These**:
- Total messages sent
- Success rate (target: >95%)
- Failed message count and reasons
- Meta API error rate
- Campaign completion time
- Admin actions taken
- Kill switch activations (should be 0 unless emergency)

**Red Flags**:
- Success rate < 90%
- Meta API errors > 5%
- Multiple kill switch activations
- Campaign stuck in RUNNING state
- Abnormal AWS costs

---

## ✅ Sign-Off

**Before launching to production, confirm**:
- [ ] All items in "Production Launch Checklist" completed
- [ ] Staging environment tested successfully
- [ ] Meta API tested with real sends
- [ ] Emergency procedures documented
- [ ] Admin team trained
- [ ] Monitoring configured
- [ ] Kill switch tested and working

**Signed**:  
Developer: __________________  
Date: __________________

Lead Engineer: __________________  
Date: __________________

---

## 🎯 What You Should NOT See After Launch

If you see these, you have a problem:

1. **Modal Hell**: Campaign details in modals instead of routes → Should be fixed now
2. **Unlimited Scans**: DynamoDB scan without limit → Fixed with 1000 cap
3. **Mixed Layers**: UI logic in API routes → Verified clean
4. **Auth Confusion**: Email and WhatsApp admins sharing sessions → Verified separated
5. **No Kill Switch**: Can't stop sending in emergency → Implemented in header

---

## Next Action

**You are now ready for**:
- ✅ Final staging deployment
- ✅ Production environment setup
- ✅ Controlled launch with low volume
- ✅ Monitoring and iteration

**After 2 weeks of stable operation**:
- Then consider adding analytics
- Then consider adding automation
- Then consider scaling features

**Right now**: Focus on stability, not features.
