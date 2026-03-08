# Protected Files - DO NOT REFACTOR

**Status:** Production-Critical  
**Last Updated:** 2024  
**Purpose:** Document files that MUST NOT be refactored until repository layer is fully tested

---

## Overview

These files are production-critical and handle active campaign execution. Any bugs or changes could result in:
- ❌ Failed message delivery
- ❌ Incorrect metrics tracking
- ❌ Lost revenue (failed campaigns)
- ❌ Broken webhooks
- ❌ Data corruption

**DO NOT modify these files** until ALL other files have been successfully migrated and tested in production for at least 2 weeks.

---

## 🔥 CRITICAL FILES - HANDS OFF

### 1. src/app/api/campaigns/[id]/execute-batch/route.ts

**Why Critical:**
- Core campaign execution engine
- Processes batches of recipients
- Updates recipient status in real-time
- Handles rate limiting and throttling
- Manages concurrent execution
- 1100+ lines of complex logic

**Operations Count:** 15+ DynamoDB operations
- GetItemCommand - Get campaign metadata
- QueryCommand - Get pending recipients
- UpdateItemCommand (×12) - Update recipient status, campaign metrics
- PutItemCommand - Create conversation logs

**Used By:**
- Campaign dispatcher (cron job)
- Manual execution triggers
- Retry mechanisms
- Batch processing workflow

**Risk Level:** 🔥 CRITICAL

**Lines of Code:** ~1100

**Database Operations:**
```typescript
Line 128:  GetItemCommand        // Get campaign metadata
Line 173:  QueryCommand          // Get PENDING recipients
Line 208:  UpdateItemCommand     // Mark recipient as PROCESSING
Line 267:  UpdateItemCommand     // Mark recipient as SENT
Line 329:  PutItemCommand        // Create conversation log
Line 350:  UpdateItemCommand     // Increment campaign sent_count
Line 371:  UpdateItemCommand     // Update last_dispatch_at
Line 397:  UpdateItemCommand     // Mark recipient as FAILED (on error)
Line 426:  QueryCommand          // Get all recipients for completion check
Line 457:  UpdateItemCommand     // Update individual recipient status
Line 503:  UpdateItemCommand     // Mark campaign as COMPLETED
Line 839:  UpdateItemCommand     // Reset recipient to PENDING (rollback)
Line 852:  UpdateItemCommand     // Mark processing recipient
Line 990:  UpdateItemCommand     // Update recipient with delivery timestamp
Line 1064: UpdateItemCommand     // Final campaign status update
Line 1098: UpdateItemCommand     // Emergency status update
```

**Dependencies:**
- campaignDispatcher.ts (calls this route)
- webhookStatusHandler.ts (updates from this)
- campaignMetrics.ts (metrics tracked here)
- messageService.ts (sends messages)
- dailyLimitGuard.ts (enforces limits)
- blockRateCircuitBreaker.ts (prevents API overload)

**When to refactor:**
- ✅ After repository layer stable for 2+ weeks
- ✅ After Phases 1-5 of migration complete
- ✅ After extensive staging tests
- ✅ With full rollback plan ready
- ✅ During low-traffic period
- ✅ With no active campaigns running

---

### 2. src/lib/whatsapp/campaignDispatcher.ts

**Why Critical:**
- Scheduled cron job executor
- Scans for RUNNING campaigns
- Triggers execute-batch for each campaign
- Manages campaign lifecycle
- Handles concurrent campaign execution

**Operations Count:** 5+ DynamoDB operations
- ScanCommand - Find RUNNING campaigns (line 58)
- UpdateItemCommand - Update last_dispatch_at (line 158)
- QueryCommand - Get campaign details
- Multiple state transitions

**Used By:**
- AWS Amplify cron job (runs every X minutes)
- Manual dispatch triggers
- Campaign scheduler

**Risk Level:** 🔥 CRITICAL

**Lines of Code:** ~500

**Impact of Failure:**
- All campaigns stop executing
- Messages stop sending
- Business operations halted

**Dependencies:**
- execute-batch route (calls it)
- campaignMetrics.ts (reads metrics)
- dailyLimitGuard.ts (checks global limits)

**When to refactor:**
- ✅ After execute-batch migrated successfully
- ✅ After 1 month of stable repository layer
- ✅ With zero-downtime deployment
- ✅ During scheduled maintenance window

---

### 3. src/lib/whatsapp/webhookStatusHandler.ts

**Why Critical:**
- Handles Meta WhatsApp webhook callbacks
- Updates delivery status in real-time
- Processes message read receipts
- Tracks conversion events
- High-throughput endpoint

**Operations Count:** 8+ DynamoDB operations
- GetItemCommand (×2) - Get campaign and recipient (lines 112, 348)
- PutItemCommand - Store delivery log (line 146)
- UpdateItemCommand (×4) - Update recipient status (line 313)
- QueryCommand - Find recipients

**Used By:**
- Meta WhatsApp Cloud API (external webhook)
- Real-time status updates
- Analytics tracking
- Conversion tracking

**Risk Level:** 🔥 CRITICAL

**Lines of Code:** ~800

**Impact of Failure:**
- No delivery confirmation
- Incorrect metrics
- Conversion tracking broken
- Analytics corrupted

**Dependencies:**
- campaignMetrics.ts (updates metrics)
- Conversion tracking endpoints
- Analytics dashboard

**When to refactor:**
- ✅ After all campaign routes migrated
- ✅ After webhook integration fully tested
- ✅ With comprehensive monitoring
- ✅ During planned webhook maintenance

---

### 4. src/lib/whatsapp/campaignMetrics.ts

**Why Critical:**
- Atomic metric updates
- Thread-safe counter increments
- Real-time analytics tracking
- Multiple concurrent updates

**Operations Count:** 10+ DynamoDB operations
- UpdateItemCommand (×7) - Increment counters (lines 62, 98, 114, 243, 266)
- GetItemCommand (×3) - Read metric snapshots (lines 140, 228, 297)

**Used By:**
- execute-batch (increments sent count)
- webhookStatusHandler (increments delivered count)
- Analytics endpoints
- Dashboard metrics

**Risk Level:** 🔥 HIGH

**Lines of Code:** ~350

**Impact of Failure:**
- Metrics become inaccurate
- Analytics corrupted
- Dashboard shows wrong data
- Campaign progress incorrect

**Operations:**
```typescript
incrementSent()       // Called on message send
incrementDelivered()  // Called on webhook delivery
incrementReceived()   // Called on webhook received
incrementRead()       // Called on webhook read
getMetricsSnapshot()  // Dashboard queries
trackConversion()     // Conversion tracking
```

**When to refactor:**
- ✅ After execute-batch and webhook migrated
- ✅ With atomic operations preserved
- ✅ With metric accuracy validation
- ✅ After analytics testing

---

## 🟡 HIGH-RISK FILES (Refactor Carefully)

### 5. src/app/api/campaigns/reconcile/route.ts

**Why High-Risk:**
- Fixes inconsistent campaign states
- Scans entire campaigns table
- Can corrupt data if buggy

**Operations:** 3+ (Scan, UpdateItem)
**Lines of Code:** ~400
**Risk Level:** 🟡 HIGH

**When to refactor:**
- ✅ After Phases 1-4 complete
- ✅ With comprehensive testing
- ✅ With database backup

---

## General Migration Rules

### Before Refactoring ANY Protected File:

1. **Verify Prerequisites:**
   - [ ] Repository layer tested in production for 2+ weeks
   - [ ] All low-risk and medium-risk files migrated successfully
   - [ ] Zero production incidents in previous migrations
   - [ ] Database backup taken within 24 hours
   - [ ] Full rollback plan documented and rehearsed

2. **Testing Requirements:**
   - [ ] Unit tests written for new repository methods
   - [ ] Integration tests cover all scenarios
   - [ ] Load testing shows no performance degradation
   - [ ] Staging environment tests passed
   - [ ] Manual testing completed by QA team

3. **Deployment Strategy:**
   - [ ] Gradual rollout (10% → 25% → 50% → 100%)
   - [ ] Real-time monitoring dashboard watching
   - [ ] Error alerting configured
   - [ ] Rollback automation ready
   - [ ] On-call engineer assigned

4. **Monitoring Requirements:**
   - [ ] Campaign success rate tracked
   - [ ] Message delivery rate monitored
   - [ ] Error rate < 1%
   - [ ] Response time within 10% of baseline
   - [ ] Database query performance tracked

5. **Business Requirements:**
   - [ ] No active high-value campaigns running
   - [ ] Migration scheduled during low-traffic period
   - [ ] Stakeholders notified
   - [ ] Customer support team prepared
   - [ ] Rollback window identified (2+ hours)

---

## Refactoring Order (When Ready)

When ALL prerequisites are met, refactor in this order:

1. **Step 1:** `campaignMetrics.ts` (smallest, most isolated)
2. **Step 2:** `webhookStatusHandler.ts` (depends on metrics)
3. **Step 3:** `reconcile route` (recovery mechanism)
4. **Step 4:** `campaignDispatcher.ts` (orchestrator)
5. **Step 5:** `execute-batch route` (**LAST - most critical**)

**Wait 2-3 days between each step** to monitor for issues.

---

## Emergency Contacts

If ANY protected file needs emergency fix:

1. **DO NOT rush the migration**
2. **Fix the bug in existing code first**
3. **Deploy fix immediately**
4. **Then plan refactor separately**

Protection over perfection. These files keep the business running.

---

## File Status Tracking

| File | Status | Refactored? | Date | Notes |
|------|--------|-------------|------|-------|
| execute-batch | 🔥 PROTECTED | ❌ NO | - | Core execution engine |
| campaignDispatcher | 🔥 PROTECTED | ❌ NO | - | Cron job scheduler |
| webhookStatusHandler | 🔥 PROTECTED | ❌ NO | - | External webhook handler |
| campaignMetrics | 🔥 PROTECTED | ❌ NO | - | Atomic counter updates |
| reconcile route | 🟡 HIGH-RISK | ❌ NO | - | State recovery |

---

**Last Updated:** 2024  
**Review Frequency:** After each migration phase  
**Owner:** Engineering Team Lead  

**Remember:** These files make money. Don't break them. 💰
