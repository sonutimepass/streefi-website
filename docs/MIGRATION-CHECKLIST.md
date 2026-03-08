# Migration Checklist - Repository & Service Layer Rollout

**Status:** Ready for Implementation  
**Priority:** Risk-Based (Low → High)  
**Strategy:** Incremental, file-by-file migration WITHOUT breaking production

---

## Overview

This checklist guides the safe migration from direct DynamoDB access to repository/service layer.

### ⚠️ CRITICAL RULES
1. **DO NOT refactor production-critical files yet** (marked 🔥 below)
2. **DO NOT modify files in active campaigns** - wait for campaign completion
3. **Test each file individually** before moving to next
4. **Keep both patterns working** - old direct access AND new repo layer
5. **Monitor error rates** after each migration

---

## Phase 1: Low-Risk Files (Week 1-2)

### 🟢 Priority 1: Authentication Routes (Lowest Risk)

| File | Current Operations | Migration Steps | Risk | Testing Strategy |
|------|-------------------|----------------|------|------------------|
| **src/lib/rateLimit.ts** | GetItem, PutItem, DeleteItem on admins table | Replace with `adminRepository` | LOW | Test rate limiting still works |
| **src/app/api/whatsapp-admin-auth/login** | PutItem on sessions | Replace with `sessionRepository.createSession()` | LOW | Test login flow |
| **src/app/api/whatsapp-admin-auth/logout** | DeleteItem on sessions | Replace with `sessionRepository.deleteSession()` | LOW | Test logout flow |
| **src/app/api/whatsapp-admin-auth/check** | Uses adminAuth.ts | Replace with `authService.validateSession()` | LOW | Test session validation |
| **src/app/api/email-admin-auth/login** | PutItem on sessions | Replace with `sessionRepository.createSession()` | LOW | Test email admin login |
| **src/app/api/email-admin-auth/logout** | DeleteItem on sessions | Replace with `sessionRepository.deleteSession()` | LOW | Test email admin logout |

**Migration Example:**
```typescript
// BEFORE
await dynamoClient.send(
  new PutItemCommand({
    TableName: SESSION_TABLE_NAME,
    Item: { session_token: { S: token }, /* ... */ }
  })
);

// AFTER
await sessionRepository.createSession({
  session_token: token,
  admin_id: adminId,
  created_at: now,
  expires_at: expiresAt,
  ttl: expiresAt
});
```

**Testing Checklist:**
- [ ] Login creates session correctly
- [ ] Session validation works
- [ ] Logout deletes session
- [ ] TTL still enabled
- [ ] No breaking changes to API responses

---

## Phase 2: Read-Only Campaign Routes (Week 2-3)

### 🟢 Priority 2: No-Write Campaign Operations

| File | Current Operations | Migration Steps | Risk | Testing Strategy |
|------|-------------------|----------------|------|------------------|
| **src/app/api/campaigns/list** | Scan campaigns table | Replace with `campaignService.listCampaigns()` | LOW | Compare output format |
| **src/app/api/campaigns/health** | Check table existence | Replace with `campaignRepository` health check | LOW | Test health endpoint |
| **src/app/api/campaigns/[id]/logs** | Query recipients | Replace with `recipientRepository.getAllRecipients()` | LOW | Test log pagination |
| **src/app/api/campaigns/[id]/analytics** | GetItem campaign | Replace with `campaignService.getCampaignMetrics()` | LOW | Test metrics calculation |

**Migration Example:**
```typescript
// BEFORE
const response = await dynamoClient.send(
  new ScanCommand({
    TableName: TABLES.CAMPAIGNS,
    FilterExpression: "SK = :sk",
    ExpressionAttributeValues: { ":sk": { S: "METADATA" } }
  })
);

// AFTER
const campaigns = await campaignService.listCampaigns();
```

**Testing Checklist:**
- [ ] List endpoint returns same data structure
- [ ] Pagination works correctly
- [ ] Filters still work
- [ ] Performance is comparable

---

## Phase 3: WhatsApp Settings & Templates (Week 3-4)

### 🟡 Priority 3: Settings Management

| File | Current Operations | Migration Steps | Risk | Testing Strategy |
|------|-------------------|----------------|------|------------------|
| **src/app/api/whatsapp-admin/settings** | GetItem, PutItem | Replace with `whatsappService.getSettings/updateSettings()` | MEDIUM | Test settings update |
| **src/app/api/whatsapp-admin/kill-switch** | GetItem, PutItem | Replace with `whatsappService.getKillSwitch/toggleKillSwitch()` | MEDIUM | Test kill switch behavior |
| **src/app/api/whatsapp-admin/templates** | Template operations | Replace with `whatsappService.getTemplate/listTemplates()` | MEDIUM | Test template CRUD |
| **src/app/api/whatsapp-admin/templates/sync** | PutItem, UpdateItem | Replace with `whatsappService.saveTemplate()` | MEDIUM | Test Meta API sync |
| **src/lib/whatsapp/templates/services.ts** | Scan, PutItem, UpdateItem, DeleteItem | Replace with `whatsappRepository` | MEDIUM | Test template services |

**Migration Example:**
```typescript
// BEFORE
await dynamoClient.send(
  new PutItemCommand({
    TableName: TABLE_NAME,
    Item: {
      PK: { S: "SETTINGS" },
      SK: { S: "GLOBAL" },
      kill_switch_enabled: { BOOL: enabled }
    }
  })
);

// AFTER
await whatsappService.toggleKillSwitch(enabled);
```

**Testing Checklist:**
- [ ] Settings persist correctly
- [ ] Kill switch blocks execution
- [ ] Template sync works
- [ ] No data loss during migration

---

## Phase 4: Campaign Write Operations (Week 4-5)

### 🟡 Priority 4: Campaign Creation & Updates

| File | Current Operations | Migration Steps | Risk | Testing Strategy |
|------|-------------------|----------------|------|------------------|
| **src/app/api/campaigns/create** | PutItem, BatchWriteItem | Replace with `campaignService.createCampaign()` | MEDIUM | Test end-to-end campaign creation |
| **src/app/api/campaigns/[id]** (GET) | GetItem | Replace with `campaignService.getCampaign()` | MEDIUM | Test campaign retrieval |
| **src/app/api/campaigns/[id]/control** | GetItem, UpdateItem | Replace with `campaignService.updateCampaignStatus()` | MEDIUM | Test status transitions |
| **src/app/api/campaigns/[id]/populate** | BatchWriteItem, UpdateItem | Replace with `campaignService.addRecipients()` | MEDIUM | Test adding recipients |

**Migration Example:**
```typescript
// BEFORE
await dynamoClient.send(
  new PutItemCommand({
    TableName: TABLES.CAMPAIGNS,
    Item: {
      PK: { S: `CAMPAIGN#${id}` },
      SK: { S: "METADATA" },
      /* ... many fields ... */
    }
  })
);
// ... then BatchWriteItem for recipients

// AFTER
await campaignService.createCampaign({
  name: "Winter Sale",
  templateName: "promo_001",
  recipients: phones,
  templateParams: { discount: "20%" }
});
```

**Testing Checklist:**
- [ ] Campaign creation works
- [ ] Recipients inserted correctly
- [ ] Campaign updates don't break
- [ ] Status transitions validated
- [ ] Metrics update correctly

---

## Phase 5: Retry & Reconciliation (Week 5-6)

### 🟡 Priority 5: Error Recovery Operations

| File | Current Operations | Migration Steps | Risk | Testing Strategy |
|------|-------------------|----------------|------|------------------|
| **src/app/api/campaigns/[id]/retry-failed** | Query, UpdateItem | Replace with `recipientRepository.getFailedRecipients()` + `resetRecipientToPending()` | MEDIUM | Test retry logic |
| **src/app/api/campaigns/reconcile** | Scan, UpdateItem | Replace with `campaignService` methods | MEDIUM-HIGH | Test reconciliation |
| **src/app/api/campaigns/[id]** (DELETE) | DeleteItem, Query, BatchWriteItem | Replace with `campaignService.deleteCampaign()` | MEDIUM | Test cascade delete |

**Migration Example:**
```typescript
// BEFORE
const failedRecipients = await dynamoClient.send(
  new QueryCommand({
    TableName: TABLES.RECIPIENTS,
    FilterExpression: "#status = :failed",
    /* ... */
  })
);
for (const recipient of failedRecipients.Items) {
  await dynamoClient.send(
    new UpdateItemCommand({ /* reset to PENDING */ })
  );
}

// AFTER
const failedRecipients = await recipientRepository.getFailedRecipients(campaignId);
for (const recipient of failedRecipients) {
  await recipientRepository.resetRecipientToPending(campaignId, recipient.phone);
}
```

**Testing Checklist:**
- [ ] Retry finds failed recipients
- [ ] Status reset works
- [ ] Reconciliation doesn't corrupt data
- [ ] Delete cascades correctly

---

## Phase 6: 🔥 CRITICAL FILES - DO NOT TOUCH YET (Week 7-8)

### 🔴 Priority 6: Production-Critical Execution Engine

**⚠️ WARNING:** These files handle active campaign execution. Migration requires:
1. **Stop all running campaigns**
2. **Deploy repository layer first**
3. **Extensive testing in staging**
4. **Gradual rollout with monitoring**

| File | Current Operations | Migration Steps | Risk | Prerequisites |
|------|-------------------|----------------|------|---------------|
| **src/lib/whatsapp/campaignDispatcher.ts** 🔥 | Scan, UpdateItem | Replace with `campaignRepository.findCampaignsByStatus()` | VERY HIGH | Phases 1-5 complete |
| **src/lib/whatsapp/campaignMetrics.ts** 🔥 | UpdateItem (×7), GetItem (×3) | Replace with `campaignService.incrementSent/Delivered()` | VERY HIGH | Extensive testing |
| **src/lib/whatsapp/webhookStatusHandler.ts** 🔥 | GetItem, UpdateItem, PutItem | Replace with `recipientRepository.updateRecipientStatus()` | VERY HIGH | Webhook integration tested |
| **src/app/api/campaigns/[id]/execute-batch** 🔥 | 15+ operations | Replace with `campaignService` + `recipientRepository` | CRITICAL | **LAST TO MIGRATE** |

**Additional Requirements for Phase 6:**
- [ ] Repository layer fully tested in production (Phases 1-5)
- [ ] Zero-downtime deployment plan
- [ ] Rollback strategy ready
- [ ] Real-time monitoring dashboard
- [ ] No campaigns running during deployment
- [ ] Database backups taken
- [ ] Load testing completed

**DO NOT START PHASE 6 UNTIL:**
1. All previous phases completed successfully
2. Repository layer stable for 2+ weeks
3. No production incidents in Phase 1-5
4. Full team review and approval

---

## Phase 7: Metrics & Analytics Services (Week 8)

### 🟡 Priority 7: Read-Heavy Analytics

| File | Current Operations | Migration Steps | Risk | Testing Strategy |
|------|-------------------|----------------|------|------------------|
| **src/lib/whatsapp/accountWarmupManager.ts** | GetItem, PutItem, UpdateItem | Replace with `whatsappRepository.getWarmupState/saveWarmupState()` | MEDIUM | Test warmup progression |
| **src/lib/whatsapp/campaignValidator.ts** | Read operations | Replace with `campaignService.getCampaign()` | LOW | Test validation logic |

---

## Validation & Testing Strategy

### Per-File Testing Checklist

Before marking any file as "migrated":

1. **Unit Tests**
   - [ ] Repository methods tested
   - [ ] Service methods tested
   - [ ] Error handling tested

2. **Integration Tests**
   - [ ] API endpoint tested end-to-end
   - [ ] Database operations verified
   - [ ] Response format unchanged

3. **Regression Tests**
   - [ ] Existing functionality unchanged
   - [ ] Performance within 10% of original
   - [ ] No new errors in logs

4. **Staging Tests**
   - [ ] Deployed to staging environment
   - [ ] Manual testing completed
   - [ ] Load testing passed

5. **Production Deployment**
   - [ ] Gradual rollout (10% → 50% → 100%)
   - [ ] Monitoring dashboard watching
   - [ ] No error rate increase
   - [ ] Rollback plan ready

---

## Risk Matrix

| Risk Level | Files Count | Recommended Timeline | Prerequisites |
|-----------|-------------|---------------------|---------------|
| 🟢 LOW | 10 files | Week 1-3 | None |
| 🟡 MEDIUM | 12 files | Week 3-6 | Low-risk complete |
| 🔴 HIGH | 4 files | Week 7-8+ | Medium-risk complete + 2 weeks stable |
| 🔥 CRITICAL | 1 file (execute-batch) | Week 8+ | All others complete + extensive testing |

---

## Success Metrics

Track these metrics during migration:

- **Error Rate:** Should remain < 1%
- **Response Time:** Should not increase > 10%
- **Database Load:** Should decrease (fewer round trips)
- **Campaign Success Rate:** Should remain unchanged
- **Code Coverage:** Should increase to > 80%

---

## Rollback Plan

If any phase encounters issues:

1. **Immediate:** Revert changes to previous version
2. **Fix Forward:** Debug in non-production environment
3. **Re-test:** Complete all validation steps again
4. **Gradual Re-deploy:** Start at 10% traffic

---

## Final Checklist Before Production

- [ ] All phases 1-5 completed successfully
- [ ] Repository layer stable for 2+ weeks
- [ ] Documentation updated
- [ ] Team trained on new architecture
- [ ] Monitoring dashboards configured
- [ ] Rollback procedures tested
- [ ] Database backups confirmed
- [ ] Load testing passed
- [ ] Security review completed
- [ ] Stakeholder sign-off obtained

---

**Last Updated:** 2024  
**Status:** Ready for Phase 1 Implementation  
**Next Review:** After Phase 3 completion
