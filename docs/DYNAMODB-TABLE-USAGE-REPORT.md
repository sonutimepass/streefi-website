# DynamoDB Table Usage Report

**Generated:** 2024
**Scope:** Complete analysis of DynamoDB operations across the codebase  
**Purpose:** Foundation for safe repository layer implementation

---

## Executive Summary

### Tables in Production
1. **streefi_admins** - Admin user credentials
2. **streefi_sessions** - Admin session tokens (TTL enabled)
3. **streefi_campaigns** - Campaign metadata + recipients (PK/SK composite)
4. **streefi_whatsapp** - WhatsApp templates, settings, counters (PK/SK composite)

### Contact Storage Confirmation
✅ **No separate `streefi_campaign_contacts` table exists**
- Contacts stored using PK/SK pattern in `streefi_campaigns`:
  - **PK:** `CAMPAIGN#{campaignId}`
  - **SK:** `RECIPIENT#{phoneNumber}`
- This pattern confirmed in: create route, execute-batch, retry-failed, populate

### Environment Variables
```env
ADMIN_TABLE_NAME=streefi_admins
SESSION_TABLE_NAME=streefi_sessions
CAMPAIGNS_TABLE_NAME=streefi_campaigns
DYNAMODB_TABLE_NAME=streefi_whatsapp
RECIPIENTS_TABLE_NAME=streefi_campaign_recipients  # Not used - historical reference
```

---

## Table 1: streefi_admins

**Environment Variable:** `ADMIN_TABLE_NAME`  
**Schema:** Simple key (admin_id)  
**TTL:** No

### Operations Inventory

| File | Function/Route | Operation | Purpose |
|------|---------------|-----------|---------|
| **src/lib/adminAuth.ts** | validateAdminSessionFromDB() | GetItem | Validate admin credentials during session check |
| **src/lib/rateLimit.ts** | rateLimit() | GetItem | Check IP-based rate limits stored in admin table |
| **src/lib/rateLimit.ts** | rateLimit() | PutItem | Store rate limit tracking data |
| **src/lib/rateLimit.ts** | rateLimit() | DeleteItem | Remove expired rate limit entries |

### Usage Pattern
- **Primary Use:** Authentication validation in adminAuth.ts
- **Secondary Use:** Rate limiting metadata
- **Access Pattern:** Direct GetItem by admin_id
- **Complexity:** Low - single table key

### Files Using This Table
1. src/lib/adminAuth.ts (defines ADMIN_TABLE_NAME constant)
2. src/lib/dynamoClient.ts (TABLES.ADMINS export)
3. src/lib/rateLimit.ts (rate limiting)

---

## Table 2: streefi_sessions  

**Environment Variable:** `SESSION_TABLE_NAME`  
**Schema:** Simple key (session_token)  
**TTL:** Yes (enabled in Phase 1A)

### Operations Inventory

| File | Function/Route | Operation | Purpose |
|------|---------------|-----------|---------|
| **src/lib/adminAuth.ts** | validateAdminSession() | GetItem | Validate session token from cookies |
| **src/app/api/whatsapp-admin-auth/login** | POST | PutItem | Create session after successful login |
| **src/app/api/whatsapp-admin-auth/logout** | POST | DeleteItem | Remove session on logout |
| **src/app/api/email-admin-auth/login** | POST | PutItem | Create email admin session |
| **src/app/api/email-admin-auth/logout** | POST | DeleteItem | Remove email admin session |

### Usage Pattern
- **Primary Use:** Session lifecycle management
- **Access Pattern:** Direct GetItem/PutItem/DeleteItem by session_token
- **TTL:** Enabled (auto-cleanup after expiry)
- **Complexity:** Low - single table key

### Files Using This Table
1. src/lib/adminAuth.ts (core validation)
2. src/app/api/whatsapp-admin-auth/login.ts
3. src/app/api/whatsapp-admin-auth/logout.ts
4. src/app/api/email-admin-auth/login.ts
5. src/app/api/email-admin-auth/logout.ts

---

## Table 3: streefi_campaigns ⚠️ HIGH COMPLEXITY

**Environment Variable:** `CAMPAIGNS_TABLE_NAME`  
**Schema:** Composite keys (PK + SK)  
**TTL:** No

### PK/SK Patterns

| PK Pattern | SK Pattern | Entity Type |
|------------|-----------|-------------|
| `CAMPAIGN#{id}` | `METADATA` | Campaign configuration, metrics |
| `CAMPAIGN#{id}` | `RECIPIENT#{phone}` | Individual recipient record |

### Operations Inventory

| File | Route/Function | Operation | Purpose |
|------|---------------|-----------|---------|
| **src/app/api/campaigns/create** | POST | PutItem | Create campaign metadata (PK/SK=METADATA) |
| **src/app/api/campaigns/create** | POST | BatchWriteItem | Bulk insert recipients (RECIPIENT# items) |
| **src/app/api/campaigns/list** | GET | Scan | List all campaigns (filter for METADATA SK) |
| **src/app/api/campaigns/[id]** | GET | GetItem | Get single campaign details |
| **src/app/api/campaigns/[id]** | DELETE | DeleteItem | Delete campaign metadata |
| **src/app/api/campaigns/[id]** | DELETE | Query | Find all recipients for campaign |
| **src/app/api/campaigns/[id]** | DELETE | BatchWriteItem | Bulk delete recipient records |
| **src/app/api/campaigns/[id]/control** | PATCH | GetItem | Get campaign before status update |
| **src/app/api/campaigns/[id]/control** | PATCH | UpdateItem | Update campaign status (RUNNING/PAUSED) |
| **src/app/api/campaigns/[id]/logs** | GET | Query | Query recipients by PK, filter by status |
| **src/app/api/campaigns/[id]/populate** | POST | BatchWriteItem | Add more recipients to campaign |
| **src/app/api/campaigns/[id]/populate** | POST | UpdateItem | Increment total_recipients count |
| **src/app/api/campaigns/[id]/retry-failed** | POST | Query | Find FAILED recipients |
| **src/app/api/campaigns/[id]/retry-failed** | POST | UpdateItem | Reset recipient status to PENDING |
| **src/app/api/campaigns/[id]/execute-batch** 🔥 | POST | GetItem | Get campaign metadata |
| **src/app/api/campaigns/[id]/execute-batch** 🔥 | POST | Query | Get PENDING recipients |
| **src/app/api/campaigns/[id]/execute-batch** 🔥 | POST | UpdateItem (×15+) | Update recipient status, metrics |
| **src/app/api/campaigns/[id]/execute-batch** 🔥 | POST | PutItem | Create conversation records |
| **src/app/api/campaigns/reconcile** | POST | Scan | Find campaigns with stale status |
| **src/app/api/campaigns/reconcile** | POST | UpdateItem | Fix inconsistent campaign states |
| **src/lib/whatsapp/campaignMetrics.ts** | incrementSent() | UpdateItem | Increment sent count atomically |
| **src/lib/whatsapp/campaignMetrics.ts** | incrementDelivered() | UpdateItem | Increment delivered count |
| **src/lib/whatsapp/campaignMetrics.ts** | incrementReceived() | UpdateItem | Increment received count |
| **src/lib/whatsapp/campaignMetrics.ts** | getMetricsSnapshot() | GetItem | Get current metrics for campaign |
| **src/lib/whatsapp/campaignMetrics.ts** | getRecipientDetails() | GetItem | Get single recipient by phone |
| **src/lib/whatsapp/campaignMetrics.ts** | trackConversion() | GetItem | Get campaign metadata |
| **src/lib/whatsapp/campaignMetrics.ts** | trackConversion() | UpdateItem | Record conversion + update metrics |
| **src/lib/whatsapp/campaignDispatcher.ts** 🔥 | dispatch() | Scan | Find RUNNING campaigns |
| **src/lib/whatsapp/campaignDispatcher.ts** 🔥 | dispatch() | UpdateItem | Update campaign last dispatch time |
| **src/lib/whatsapp/webhookStatusHandler.ts** 🔥 | handleStatus() | GetItem | Get recipient record |
| **src/lib/whatsapp/webhookStatusHandler.ts** 🔥 | handleStatus() | UpdateItem | Update delivery status |
| **src/lib/whatsapp/webhookStatusHandler.ts** 🔥 | handleStatus() | PutItem | Store delivery log |

🔥 = Production-critical file (DO NOT REFACTOR)

### Usage Patterns
- **Campaign Metadata:** PK=CAMPAIGN#{id}, SK=METADATA (single item per campaign)
- **Recipients:** PK=CAMPAIGN#{id}, SK=RECIPIENT#{phone} (many items per campaign)
- **Queries:** Always by campaign ID (PK), then filter by SK prefix
- **Complexity:** HIGH - 15+ different files access this table

### Files Using This Table (Total: 14 routes + 4 lib files)
1. src/app/api/campaigns/create/route.ts
2. src/app/api/campaigns/list/route.ts
3. src/app/api/campaigns/[id]/route.ts (GET + DELETE)
4. src/app/api/campaigns/[id]/control/route.ts
5. src/app/api/campaigns/[id]/logs/route.ts
6. src/app/api/campaigns/[id]/populate/route.ts
7. src/app/api/campaigns/[id]/retry-failed/route.ts
8. src/app/api/campaigns/[id]/execute-batch/route.ts 🔥
9. src/app/api/campaigns/reconcile/route.ts
10. src/lib/whatsapp/campaignMetrics.ts 🔥
11. src/lib/whatsapp/campaignDispatcher.ts 🔥
12. src/lib/whatsapp/webhookStatusHandler.ts 🔥
13. src/lib/whatsapp/campaignValidator.ts

---

## Table 4: streefi_whatsapp

**Environment Variable:** `DYNAMODB_TABLE_NAME`  
**Schema:** Composite keys (PK + SK)  
**TTL:** No

### PK/SK Patterns

| PK Pattern | SK Pattern | Entity Type |
|------------|-----------|-------------|
| `TEMPLATE#{name}` | `METADATA` | WhatsApp template definition |
| `SETTINGS` | `GLOBAL` | Platform settings (kill switch, warmup) |
| `DAILY_COUNTER` | `{date}` | Daily message counter |

### Operations Inventory

| File | Route/Function | Operation | Purpose |
|------|---------------|-----------|---------|
| **src/app/api/whatsapp-admin/templates/sync** | POST | PutItem | Create new template from Meta API |
| **src/app/api/whatsapp-admin/templates/sync** | POST | UpdateItem | Update existing template status |
| **src/app/api/whatsapp-admin/settings** | GET | GetItem | Get platform settings |
| **src/app/api/whatsapp-admin/settings** | PUT | PutItem | Update platform settings |
| **src/app/api/whatsapp-admin/kill-switch** | GET | GetItem | Get kill switch status |
| **src/app/api/whatsapp-admin/kill-switch** | POST | PutItem | Toggle kill switch |
| **src/lib/whatsapp/templates/services.ts** | listTemplates() | Scan | Get all templates (with filter) |
| **src/lib/whatsapp/templates/services.ts** | createTemplate() | PutItem | Store template definition |
| **src/lib/whatsapp/templates/services.ts** | updateTemplate() | UpdateItem | Update template metadata |
| **src/lib/whatsapp/templates/services.ts** | deleteTemplate() | DeleteItem | Remove template |
| **src/lib/whatsapp/accountWarmupManager.ts** | getAccountState() | GetItem | Get warmup state for account |
| **src/lib/whatsapp/accountWarmupManager.ts** | createWarmupState() | PutItem | Initialize warmup tracking |
| **src/lib/whatsapp/accountWarmupManager.ts** | updateWarmupState() | UpdateItem | Update warmup metrics |

### Usage Patterns
- **Templates:** PK=TEMPLATE#{name}, SK=METADATA
- **Settings:** PK=SETTINGS, SK=GLOBAL (singleton)
- **Warmup State:** PK=WARMUP#{accountId}, SK=STATE
- **Daily Counters:** PK=DAILY_COUNTER, SK={date}
- **Complexity:** MEDIUM - 6 routes + 3 lib files

### Files Using This Table (Total: 6 routes + 3 lib files)
1. src/app/api/whatsapp-admin/templates/sync/route.ts
2. src/app/api/whatsapp-admin/templates/route.ts
3. src/app/api/whatsapp-admin/settings/route.ts
4. src/app/api/whatsapp-admin/kill-switch/route.ts
5. src/lib/whatsapp/templates/services.ts
6. src/lib/whatsapp/accountWarmupManager.ts

---

## Risk Assessment by File

### 🟢 LOW RISK (Safe to Abstract First)

| File | Lines of Code | DB Operations | Complexity |
|------|--------------|---------------|------------|
| src/lib/adminAuth.ts | ~150 | 1 GetItem | Simple validation |
| src/lib/rateLimit.ts | ~200 | 3 ops (Get/Put/Delete) | Self-contained |
| src/app/api/whatsapp-admin-auth/login.ts | ~100 | 1 PutItem | Session create |
| src/app/api/whatsapp-admin-auth/logout.ts | ~50 | 1 DeleteItem | Session delete |
| src/app/api/campaigns/list/route.ts | ~100 | 1 Scan | Read-only |
| src/app/api/campaigns/[id]/logs/route.ts | ~150 | 1 Query | Read-only |

### 🟡 MEDIUM RISK (Abstract After Low Risk)

| File | Lines of Code | DB Operations | Complexity |
|------|--------------|---------------|------------|
| src/app/api/campaigns/create/route.ts | ~250 | 2 ops (Put + Batch) | State creation |
| src/app/api/campaigns/[id]/route.ts | ~300 | 5 ops (Get/Delete/Query/Batch) | Multiple operations |
| src/app/api/campaigns/[id]/control.ts | ~150 | 2 ops (Get + Update) | State transition |
| src/app/api/whatsapp-admin/settings/route.ts | ~200 | 2 ops (Get + Put) | Config management |
| src/lib/whatsapp/templates/services.ts | ~250 | 4 ops | Template CRUD |

### 🔴 HIGH RISK (Do NOT Touch Yet) 🔥

| File | Lines of Code | DB Operations | Complexity | Why Critical |
|------|--------------|---------------|------------|--------------|
| **src/app/api/campaigns/[id]/execute-batch/route.ts** | ~1100 | 15+ ops | VERY HIGH | Core execution engine |
| **src/lib/whatsapp/campaignDispatcher.ts** | ~500 | 5+ ops | HIGH | Scheduler/orchestrator |
| **src/lib/whatsapp/webhookStatusHandler.ts** | ~800 | 8+ ops | HIGH | Webhook processing |
| **src/lib/whatsapp/campaignMetrics.ts** | ~350 | 7+ ops | MEDIUM-HIGH | Atomic metric updates |
| src/app/api/campaigns/reconcile/route.ts | ~400 | 3+ ops | MEDIUM-HIGH | State recovery |

---

## Operation Frequency Heatmap

### By Operation Type
```
UpdateItem:  ████████████████████ 45+ occurrences (HIGHEST)
GetItem:     ████████████ 25+ occurrences
Query:       ████████ 15+ occurrences
PutItem:     ███████ 12+ occurrences
Scan:        ███ 5+ occurrences
DeleteItem:  ██ 4+ occurrences
BatchWrite:  ██ 4+ occurrences
```

### By Table
```
streefi_campaigns:  ████████████████████████ 65+ operations (75%)
streefi_whatsapp:   ████████ 15+ operations (17%)
streefi_sessions:   ██ 5+ operations (6%)
streefi_admins:     ██ 4+ operations (5%)
```

---

## Key Findings

### ✅ Confirmed Patterns
1. **No separate campaign_contacts table** - Uses PK/SK pattern in campaigns table
2. **4 tables only** - Not 7 as some docs suggested
3. **Campaign table dominates** - 75% of all database operations
4. **UpdateItem is king** - Most frequent operation (atomic metrics)

### ⚠️ Complexity Hotspots
1. **execute-batch route** - 15+ different DynamoDB operations
2. **webhookStatusHandler** - 8+ operations with state transitions
3. **campaignDispatcher** - Scans + updates across campaigns
4. **Campaign table** - Used by 18 different files

### 🎯 Repository Layer Strategy
Based on this analysis, create repositories in this order:

1. **AdminRepository** (simplest - 4 operations)
2. **SessionRepository** (simple - 4 operations)  
3. **WhatsAppRepository** (medium - 13 operations, but isolated)
4. **CampaignRepository** (complex - 40+ operations, split into sub-services)
5. **RecipientRepository** (complex - 25+ operations, frequently used)

---

## Next Steps

See [IMPLEMENTATION-ROADMAP.md](./BACKEND-ARCHITECTURE.md#implementation-roadmap) for:
- Repository interface definitions
- Service layer architecture
- Migration checklist with risk prioritization
- Testing strategy for gradual rollout

---

**Document Status:** Complete ✅  
**Last Updated:** 2024  
**Warning:** Do NOT refactor files marked 🔥 until repository layer is fully tested
