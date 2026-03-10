# Backend Architecture - WhatsApp Campaign Platform

**Document Version:** 1.0
**Last Updated:** March 8, 2026
**Status:** Architecture Analysis & 

Refactor Plan

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current System Analysis](#current-system-analysis)
3. [Table Responsibilities](#table-responsibilities)
4. [Service Layer Architecture](#service-layer-architecture)
5. [Repository Layer Design](#repository-layer-design)
6. [API Route Responsibilities](#api-route-responsibilities)
7. [Data Flow Diagrams](#data-flow-diagrams)
8. [TypeScript Interfaces](#typescript-interfaces)
9. [Refactor Recommendations](#refactor-recommendations)
10. [Implementation Roadmap](#implementation-roadmap)

---

## 1. Executive Summary

### System Overview

The Streefi WhatsApp Campaign Platform is a production-grade messaging system built on:

- **Frontend:** Next.js 14 (App Router)
- **Hosting:** AWS Amplify
- **Compute:** AWS Lambda (via Next.js API routes)
- **Database:** Amazon DynamoDB
- **Messaging:** Meta WhatsApp Cloud API

### Current Architecture State

**✅ Strengths:**

- Clean guard pattern for business policies (daily limits, block rate, circuit breaker)
- Single-table design with PK/SK pattern for campaigns
- Atomic operations for metrics and counters
- Separated MessageService and MetaClient layers
- Comprehensive campaign state machine

**⚠️ Issues Identified:**

1. **No repository layer** - Direct DynamoDB access scattered across 30+ API routes
2. **Minimal service layer** - Only `vendorService.ts` exists; campaigns/admin/session logic in routes
3. **Table confusion** - Documentation mentions 7 tables, code uses 5
4. **Inconsistent patterns** - Some routes use services, most access DB directly
5. **Data duplication risk** - No clear ownership of table write operations

### Scalability Assessment

**Current Capacity:** ✅ Proven at 100k+ messages

- Batch processing: 25 messages per execution
- Rate limiting: 10-20 msg/sec configurable
- Daily limits: 200 conversations (Tier 250)
- Concurrent campaigns: Supported via dispatcher

**Architectural Readiness:** ⚠️ Needs Refactoring

- Lambda execution: ✅ Stateless design
- DynamoDB access: ⚠️ Direct access causes coupling
- Error handling: ⚠️ Inconsistent across routes
- Testing: ⚠️ Difficult due to tight DB coupling

---

## 2. Current System Analysis

### 2.1 Table Usage Map

#### Actual Tables in Use (from code analysis)

| Table Name                      | Environment Variable      | Current Usage                                  |
| ------------------------------- | ------------------------- | ---------------------------------------------- |
| `streefi_admins`              | `ADMIN_TABLE_NAME`      | Admin credentials, rate limiting               |
| `streefi_sessions`            | `SESSION_TABLE_NAME`    | Multi-device session storage                   |
| `streefi_whatsapp`            | `DYNAMODB_TABLE_NAME`   | Templates, conversations, daily counters       |
| `streefi_campaigns`           | `CAMPAIGNS_TABLE_NAME`  | Campaign metadata, recipients, metrics         |
| `streefi_campaign_recipients` | `RECIPIENTS_TABLE_NAME` | ⚠️ Not used - data stored in campaigns table |

#### Tables Mentioned in Docs but Not Implemented

| Table Name                    | Status             | Notes                             |
| ----------------------------- | ------------------ | --------------------------------- |
| `streefi_campaign_contacts` | 🟡 Reserved | For future contact upload feature  |
| `streefi_whatsapp`          | 🟡 Reserved (Legacy) | Legacy table - functionality migrated to whatsapp_conversations |

**Recommendation:** Update documentation to reflect actual 4-table architecture.

### 2.2 Current API Routes Analysis

#### Routes with Direct DynamoDB Access

**Campaign Routes** (11 routes):

```
src/app/api/campaigns/
├── create/route.ts          → PutItemCommand, BatchWriteItemCommand
├── list/route.ts            → ScanCommand
├── dispatch/route.ts        → ScanCommand
├── [id]/route.ts            → GetItemCommand, QueryCommand, DeleteItemCommand
├── [id]/control/route.ts    → GetItemCommand, UpdateItemCommand
├── [id]/execute-batch/      → QueryCommand, UpdateItemCommand (×6)
├── [id]/populate/route.ts   → GetItemCommand, UpdateItemCommand
├── [id]/logs/route.ts       → QueryCommand
├── [id]/retry-failed/       → QueryCommand, UpdateItemCommand
└── [id]/analytics/route.ts  → Via campaignMetrics service ✅
```

**WhatsApp Admin Routes** (8 routes):

```
src/app/api/whatsapp-admin/
├── templates/route.ts       → Via template service ✅
├── settings/route.ts        → GetItemCommand, PutItemCommand
├── send-template/route.ts   → Via messageService ✅
├── validate-setup/route.ts  → Via metaClient ✅
└── warmup-status/route.ts   → Via warmupManager ✅
```

**Auth Routes** (4 routes):

```
src/app/api/whatsapp-admin-auth/
├── login/route.ts           → Direct DynamoDB (admins + sessions)
├── logout/route.ts          → Direct DynamoDB (sessions)
└── check/route.ts           → Via adminAuth.ts ✅

src/app/api/email-admin-auth/
├── login/route.ts           → Direct DynamoDB (admins + sessions)
└── logout/route.ts          → Direct DynamoDB (sessions)
```

**Total Direct DB Access:** ~25 API route files

### 2.3 Current Service Layer

**Existing Services:**

| Service                   | Location                        | Responsibility      | Quality                    |
| ------------------------- | ------------------------------- | ------------------- | -------------------------- |
| `adminAuth.ts`          | `src/lib/adminAuth.ts`        | Session validation  | ✅ Good                    |
| `messageService.ts`     | `src/lib/whatsapp/meta/`      | Message sending     | ✅ Good                    |
| `metaClient.ts`         | `src/lib/whatsapp/meta/`      | WhatsApp API calls  | ✅ Good                    |
| `templateService.ts`    | `src/lib/whatsapp/templates/` | Template CRUD       | ✅ Good                    |
| `campaignMetrics.ts`    | `src/lib/whatsapp/`           | Metrics aggregation | ✅ Good                    |
| `campaignDispatcher.ts` | `src/lib/whatsapp/`           | Campaign scheduling | ⚠️ Mixed (has DB access) |
| `vendorService.ts`      | `src/services/`               | Vendor API calls    | ✅ Good                    |

**Guard Services (Policy Layer):**

| Guard                          | Location                     | Responsibility      | Quality |
| ------------------------------ | ---------------------------- | ------------------- | ------- |
| `dailyLimitGuard.ts`         | `src/lib/whatsapp/guards/` | Conversation limits | ✅ Good |
| `globalDailyLimitGuard.ts`   | `src/lib/whatsapp/guards/` | System-wide limits  | ✅ Good |
| `blockRateCircuitBreaker.ts` | `src/lib/whatsapp/guards/` | Quality protection  | ✅ Good |
| `campaignStateValidator.ts`  | `src/lib/whatsapp/`        | State machine       | ✅ Good |

### 2.4 Current Patterns

**✅ Good Patterns Found:**

1. **Guard Pattern for Business Rules**

   ```typescript
   await getDailyLimitGuard().checkLimit(phoneNumber);
   await getBlockRateCircuitBreaker().checkBeforeSend(campaignId);
   ```
2. **Singleton Services**

   ```typescript
   export function getCampaignMetrics(): CampaignMetricsManager
   export function getMessageService(): MessageService
   ```
3. **Separation of Concerns (in some areas)**

   ```
   API Route → MessageService → DailyLimitGuard → MetaClient
   ```
4. **Single-Table Design with PK/SK**

   ```typescript
   PK: CAMPAIGN#{id}, SK: METADATA
   PK: CAMPAIGN#{id}, SK: RECIPIENT#{phone}
   PK: CAMPAIGN#{id}, SK: METRICS
   ```

**⚠️ Anti-Patterns Found:**

1. **Direct DynamoDB in Routes**

   ```typescript
   // Bad: Route directly calls DynamoDB
   await dynamoClient.send(new GetItemCommand({...}));
   ```
2. **Mixed Responsibilities**

   ```typescript
   // campaignDispatcher.ts does both business logic AND DB access
   const result = await dynamoClient.send(new ScanCommand({...}));
   ```
3. **Duplicate Logic**

   ```typescript
   // Campaign status updates repeated in 5+ files
   await dynamoClient.send(new UpdateItemCommand({
     UpdateExpression: 'SET #status = :status',
     ...
   }));
   ```
4. **No Interface Definitions**

   - Multiple `interface Campaign` definitions across files
   - No centralized type definitions for DB records

---

## 3. Table Responsibilities

### 3.1 streefi_admins

**Purpose:** Store admin user accounts who can access campaign dashboards.

**Schema:**

```typescript
Partition Key: email (String)

Fields:
{
  email: string;              // PK: admin@streefi.in
  passwordHash: string;       // bcrypt hash
  name?: string;              // Display name
  role: 'admin' | 'superadmin';
  status: 'active' | 'suspended';
  createdAt: string;          // ISO 8601
  lastLoginAt?: string;       // ISO 8601
  lastLoginIp?: string;
}
```

**Access Pattern:**

- **Read:** Login verification (by email)
- **Write:** Admin creation, password updates
- **Update:** Last login timestamp

**Used By:**

- Authentication routes (`/api/whatsapp-admin-auth/login`)
- Admin management routes (future)

**Service Responsibility:** `adminService.ts`

**Security:**

- ✅ Passwords never stored in plain text
- ✅ Rate limiting via separate records (PK: `RATE#{ip}`)
- ⚠️ No audit trail (future enhancement)

---

### 3.2 streefi_sessions

**Purpose:** Multi-device session management for authenticated admins.

**Schema:**

```typescript
Partition Key: session_id (String)

Fields:
{
  session_id: string;         // PK: sess_<uuid>
  email: string;              // Admin email
  type: 'email-session' | 'whatsapp-session';
  status: 'active' | 'expired';
  deviceId?: string;          // Browser fingerprint
  ipAddress?: string;         // Last known IP
  userAgent?: string;         // Browser info
  createdAt: string;          // ISO 8601
  expiresAt: number;          // Unix timestamp
  lastActivityAt?: number;    // Unix timestamp
}
```

**Access Pattern:**

- **Read:** Session validation (by session_id)
- **Write:** Login (create session)
- **Delete:** Logout (delete session)
- **Scan:** List active devices (by email) - requires GSI

**TTL Configuration:**

- DynamoDB TTL on `expiresAt` field (automatic cleanup)
- Default: 7 days

**Used By:**

- All authenticated API routes via `validateAdminSession()`
- Logout routes

**Service Responsibility:** `sessionService.ts`

**Multi-Device Support:**

- Multiple sessions per admin (different session_ids)
- Each device gets unique session
- Logout single device vs. all devices

---

### 3.3 whatsapp_conversations (formerly streefi_whatsapp)

**Purpose:** WhatsApp-specific data including templates, conversations, and daily counters.

**Schema (Single-Table Design):**

```typescript
Partition Key: PK (String)
Sort Key: SK (String)

// Pattern 1: Templates
{
  PK: "TEMPLATE#{templateId}",
  SK: "METADATA",
  templateId: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;           // e.g., 'en', 'hi', 'en_US'
  variables: string[];        // e.g., ['customer_name', 'order_id']
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  metaStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  metaTemplateId?: string;    // Meta's template ID
  createdAt: string;
  updatedAt: string;
}

// Pattern 2: Conversations (for 24h window tracking)
{
  PK: "CONVERSATION#{phone}",
  SK: "METADATA",
  phone: string;
  conversationStartedAt: number;  // Unix timestamp (ms)
  lastMessageAt: number;
  status: 'open' | 'closed';
  messageCount: number;
}

// Pattern 3: Daily Counter (atomic)
{
  PK: "DAILY_COUNTER#{YYYY-MM-DD}",
  SK: "METADATA",
  date: string;               // YYYY-MM-DD
  count: number;              // Atomic counter via ADD operation
  limit: number;              // Daily limit (e.g., 200)
  lastUpdated: number;        // Unix timestamp
}

// Pattern 4: System Settings
{
  PK: "SYSTEM",
  SK: "SETTINGS",
  maxMessagesPerSecond: number;
  defaultDailyCap: number;
  metaTierLimit: number;
  safetyBuffer: number;
  updatedBy: string;
  updatedAt: string;
}

// Pattern 5: Account Warmup State
{
  PK: "SYSTEM",
  SK: "ACCOUNT#{phoneNumberId}",
  phoneNumberId: string;
  phase: 'initial' | 'warming' | 'stable';
  dailyLimit: number;
  messagesThisPhase: number;
  phaseStartedAt: number;
  lastIncreasedAt: number;
}
```

**Access Patterns:**

1. **Get template** → Query: PK = TEMPLATE#{id}, SK = METADATA
2. **List templates** → Scan: begins_with(PK, "TEMPLATE#")
3. **Check conversation** → Query: PK = CONVERSATION#{phone}
4. **Get daily count** → Get: PK = DAILY_COUNTER#{date}
5. **Increment counter** → UpdateItem with ADD operation

**Used By:**

- Template management APIs
- Daily limit guard
- Message service (conversation tracking)
- System settings

**Service Responsibility:**

- `templateRepository.ts`
- `conversationRepository.ts`
- `dailyLimitGuard.ts` (policy layer)

---

### 3.4 streefi_campaigns

**Purpose:** Campaign lifecycle management including metadata, recipients, and analytics.

**Schema (Single-Table Design):**

```typescript
Partition Key: PK (String)
Sort Key: SK (String)

// Pattern 1: Campaign Metadata
{
  PK: "CAMPAIGN#{campaignId}",
  SK: "METADATA",
  campaignId: string;
  name: string;
  channel: 'WHATSAPP' | 'EMAIL';
  createdBy: string;          // Admin email
  status: 'DRAFT' | 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  audienceType: 'FIREBASE' | 'MONGODB' | 'CSV' | 'MIXED';
  
  // Template Configuration
  templateName?: string;      // Legacy: single template
  templates?: string[];       // New: multiple templates
  templateWeights?: number[]; // Weights for selection
  templateStrategy?: 'random' | 'weighted' | 'round-robin';
  
  // Counters
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  blockedCount: number;       // Circuit breaker metric
  dailyCap: number;
  
  // Execution Control
  executionLock?: boolean;
  lockedAt?: number;
  lastBatchAt?: number;
  
  // Timestamps
  createdAt: number;          // Unix timestamp
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  pausedAt?: number;
  pausedReason?: string;
}

// Pattern 2: Campaign Recipients (one per recipient)
{
  PK: "CAMPAIGN#{campaignId}",
  SK: "RECIPIENT#{phoneNumber}",
  phone: string;
  name?: string;
  variables?: Record<string, string>;
  status: 'PENDING' | 'SENT' | 'FAILED' | 'BLOCKED';
  attempts: number;
  messageId?: string;         // Meta message ID
  failureReason?: string;
  sentAt?: number;
  createdAt: number;
}

// Pattern 3: Campaign Metrics (aggregated)
{
  PK: "CAMPAIGN#{campaignId}",
  SK: "METRICS",
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  replied: number;
  converted: number;
  blocked: number;
  revenue?: number;
  updatedAt: number;
}

// Pattern 4: Message Tracking (for webhook attribution)
{
  PK: "MESSAGE#{messageId}",
  SK: "METADATA",
  messageId: string;          // Meta's message ID
  campaignId: string;
  recipientPhone: string;
  templateName: string;
  sentAt: number;
  trackingToken?: string;     // For click tracking
}

// Pattern 5: Message Status Idempotency (TTL enabled)
{
  PK: "MESSAGE_STATUS#{messageId}",
  SK: "STATUS#{statusType}#{errorCode?}",
  processedAt: number;
  ttl: number;                // 30 days expiry
}

// Pattern 6: Campaign Logs (execution history)
{
  PK: "CAMPAIGN#{campaignId}",
  SK: "LOG#{timestamp}",
  timestamp: number;
  level: 'info' | 'warning' | 'error';
  message: string;
  details?: any;
}
```

**Access Patterns:**

1. **Get campaign** → Query: PK = CAMPAIGN#{id}, SK = METADATA
2. **List campaigns** → Scan: SK = METADATA (filter)
3. **Get recipients** → Query: PK = CAMPAIGN#{id}, SK begins_with "RECIPIENT#"
4. **Find message** → Get: PK = MESSAGE#{messageId}
5. **Get metrics** → Get: PK = CAMPAIGN#{id}, SK = METRICS

**Performance Considerations:**

- Recipients use `Query` (not `Scan`) for batch fetching
- Status updates use `ADD` operations for atomic counters
- Message tracking has 30-day TTL for automatic cleanup
- Metrics are pre-aggregated (no real-time calculations)

**Used By:**

- All campaign management APIs
- Batch executor
- Webhook handler
- Analytics endpoints

**Service Responsibility:**

- `campaignRepository.ts`
- `recipientRepository.ts`
- `metricsRepository.ts`

---

### 3.5 Table Design Decisions

#### Why Single-Table Design?

**Benefits:**
✅ Fewer tables = simpler infrastructure
✅ Related data queries in single operation
✅ Cost-effective (fewer read/write units)
✅ Easier to manage in Lambda cold starts

**Trade-offs:**
⚠️ More complex query patterns
⚠️ Requires careful PK/SK design
⚠️ Limited to DynamoDB query capabilities

#### Why Separate Admin/Session Tables?

**Rationale:**

- Different access patterns (auth vs. business logic)
- Different security requirements
- Session table uses TTL (automatic cleanup)
- Admin table is write-once, read-many
- Clear separation of concerns

#### WhatsApp Table Consolidation

**Current:** Templates + Conversations + Counters in one table
**Alternative:** Separate tables for each

**Decision:** Keep consolidated

- All WhatsApp-specific data
- Infrequent cross-pattern queries
- Simpler infrastructure

---

## 4. Service Layer Architecture

### 4.1 Service Layer Principles

**Responsibilities:**
✅ Business logic orchestration
✅ Domain operations
✅ Transaction coordination
✅ Error handling and logging

**NOT Responsible For:**
❌ HTTP request/response handling (→ API routes)
❌ Database access (→ repositories)
❌ Business policy enforcement (→ guards)
❌ External API calls (→ clients)

### 4.2 Proposed Service Structure

```
src/services/
├── index.ts                    # Service exports
├── adminService.ts             # Admin management
├── sessionService.ts           # Session lifecycle
├── campaignService.ts          # Campaign orchestration
├── recipientService.ts         # Recipient management
├── whatsappService.ts          # WhatsApp operations
├── templateService.ts          # Template lifecycle
└── analyticsService.ts         # Metrics and reporting
```

### 4.3 Service Definitions

#### adminService.ts

**Responsibility:** Admin user management

```typescript
export class AdminService {
  constructor(
    private adminRepo: AdminRepository
  ) {}

  async createAdmin(data: CreateAdminInput): Promise<Admin>
  async getAdminByEmail(email: string): Promise<Admin | null>
  async authenticateAdmin(email: string, password: string): Promise<Admin | null>
  async updatePassword(email: string, newPassword: string): Promise<void>
  async updateLastLogin(email: string, ip: string): Promise<void>
  async listAdmins(): Promise<Admin[]>
  async suspendAdmin(email: string): Promise<void>
}
```

**Operations:**

- ✅ Password hashing (via crypto lib)
- ✅ Authentication logic
- ✅ Admin CRUD operations
- ❌ Session  management (→ sessionService)
- ❌ Rate limiting (→ rateLimit guard)

**Used By:**

- `/api/whatsapp-admin-auth/login`
- `/api/whatsapp-admin-auth/register` (future)
- `/api/admin/users` (future)

---

#### sessionService.ts

**Responsibility:** Session lifecycle management

```typescript
export class SessionService {
  constructor(
    private sessionRepo: SessionRepository
  ) {}

  async createSession(data: CreateSessionInput): Promise<Session>
  async getSession(sessionId: string): Promise<Session | null>
  async validateSession(sessionId: string, type: SessionType): Promise<ValidationResult>
  async refreshSession(sessionId: string): Promise<Session>
  async deleteSession(sessionId: string): Promise<void>
  async deleteAllSessions(email: string): Promise<void>
  async listActiveSessions(email: string): Promise<Session[]>
}
```

**Operations:**

- ✅ Session creation with expiry
- ✅ Multi-device support
- ✅ Session validation
- ✅ Automatic expiry handling
- ❌ Cookie management (→ API routes)

**Used By:**

- All authenticated routes (via `validateAdminSession()`)
- Login/logout routes

---

#### campaignService.ts

**Responsibility:** Campaign lifecycle orchestration

```typescript
export class CampaignService {
  constructor(
    private campaignRepo: CampaignRepository,
    private recipientRepo: RecipientRepository,
    private stateValidator: CampaignStateValidator
  ) {}

  async createCampaign(data: CreateCampaignInput): Promise<Campaign>
  async getCampaign(campaignId: string): Promise<Campaign | null>
  async listCampaigns(options?: ListOptions): Promise<Campaign[]>
  async updateCampaign(campaignId: string, updates: UpdateCampaignInput): Promise<Campaign>
  async deleteCampaign(campaignId: string): Promise<void>
  
  // State transitions
  async startCampaign(campaignId: string): Promise<void>
  async pauseCampaign(campaignId: string, reason: string): Promise<void>
  async resumeCampaign(campaignId: string): Promise<void>
  async completeCampaign(campaignId: string): Promise<void>
  
  // Execution
  async acquireExecutionLock(campaignId: string): Promise<boolean>
  async releaseExecutionLock(campaignId: string): Promise<void>
}
```

**Operations:**

- ✅ Campaign CRUD
- ✅ State machine transitions (via validator)
- ✅ Execution lock management
- ❌ Message sending (→ whatsappService)
- ❌ Recipient batch processing (→ recipientService)

**Used By:**

- `/api/campaigns/create`
- `/api/campaigns/[id]/control`
- `/api/campaigns/dispatch`

---

#### recipientService.ts

**Responsibility:** Campaign recipient management

```typescript
export class RecipientService {
  constructor(
    private recipientRepo: RecipientRepository,
    private audienceValidator: AudienceQualityValidator
  ) {}

  async addRecipients(campaignId: string, recipients: RecipientInput[]): Promise<void>
  async getRecipients(campaignId: string, status?: RecipientStatus): Promise<Recipient[]>
  async getRecipientsBatch(campaignId: string, limit: number): Promise<Recipient[]>
  async updateRecipientStatus(campaignId: string, phone: string, status: RecipientStatus): Promise<void>
  async markSent(campaignId: string, phone: string, messageId: string): Promise<void>
  async markFailed(campaignId: string, phone: string, reason: string): Promise<void>
  async getFailedRecipients(campaignId: string): Promise<Recipient[]>
  async retryFailed(campaignId: string): Promise<number>
}
```

**Operations:**

- ✅ Recipient CRUD
- ✅ Batch fetching for execution
- ✅ Status tracking
- ✅ Retry logic
- ❌ Message sending (→ whatsappService)
- ❌ Audience validation (→ guard, but used here)

**Used By:**

- `/api/campaigns/[id]/populate`
- `/api/campaigns/[id]/execute-batch`
- `/api/campaigns/[id]/retry-failed`

---

#### whatsappService.ts

**Responsibility:** WhatsApp messaging operations

```typescript
export class WhatsAppService {
  constructor(
    private messageService: MessageService,
    private templateRepo: TemplateRepository,
    private conversationRepo: ConversationRepository,
    private dailyLimitGuard: DailyLimitGuard,
    private rateThrottle: MessageRateThrottle
  ) {}

  // Messaging
  async sendTemplateMessage(
    to: string,
    templateName: string,
    variables: Record<string, string>,
    campaignId?: string
  ): Promise<MessageResponse>
  
  async sendBulkMessages(
    campaignId: string,
    recipients: Recipient[],
    templateName: string
  ): Promise<BulkSendResult>
  
  // Conversation tracking
  async checkConversationWindow(phone: string): Promise<boolean>
  async startConversation(phone: string): Promise<void>
  async getDailyCount(): Promise<number>
  
  // Webhooks
  async processStatusUpdate(status: WebhookStatus): Promise<void>
  async processInboundMessage(message: InboundMessage): Promise<void>
}
```

**Operations:**

- ✅ Message sending orchestration
- ✅ Conversation window tracking
- ✅ Webhook processing
- ✅ Guard enforcement (daily limits, rate throttle)
- ❌ Direct Meta API calls (→ metaClient)
- ❌ Template management (→ templateService)

**Used By:**

- `/api/campaigns/[id]/execute-batch`
- `/api/whatsapp-admin/send-template`
- `/api/whatsapp` (webhook)

---

#### analyticsService.ts

**Responsibility:** Campaign metrics and reporting

```typescript
export class AnalyticsService {
  constructor(
    private metricsRepo: MetricsRepository,
    private campaignRepo: CampaignRepository
  ) {}

  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics>
  async getSystemMetrics(): Promise<SystemMetrics>
  async incrementMetric(campaignId: string, metric: MetricType): Promise<void>
  async recordConversion(campaignId: string, phone: string, amount: number): Promise<void>
  async getEngagementScore(campaignId: string): Promise<number>
  async getBlockRate(campaignId: string): Promise<number>
}
```

**Operations:**

- ✅ Metrics aggregation
- ✅ Analytics calculations
- ✅ Conversion tracking
- ✅ Quality scores
- ❌ Real-time message tracking (→ webhookStatusHandler)

**Used By:**

- `/api/campaigns/[id]/analytics`
- Webhook status handler
- Dashboard APIs

---

### 4.4 Service Layer Benefits

**After Refactoring:**

✅ **Testability**

```typescript
// Can mock repositories for unit tests
const mockRepo = createMock<CampaignRepository>();
const service = new CampaignService(mockRepo);
```

✅ **Reusability**

```typescript
// Service used by multiple API routes
const campaign = await campaignService.createCampaign(data);
```

✅ **Consistency**

```typescript
// Same business logic across all entry points
await campaignService.startCampaign(id); // API
await campaignService.startCampaign(id); // Cron job
```

✅ **Error Handling**

```typescript
// Centralized error handling with context
try {
  await campaignService.deleteCampaign(id);
} catch (error) {
  if (error instanceof CampaignNotFoundError) { ... }
  if (error instanceof CampaignInUseError) { ... }
}
```

---

## 5. Repository Layer Design

### 5.1 Repository Pattern Principles

**Purpose:** Abstract database access from business logic

**Responsibilities:**
✅ Database CRUD operations
✅ Query construction
✅ Data mapping (DB ↔ Domain models)
✅ Transaction handling

**NOT Responsible For:**
❌ Business logic
❌ Validation (domain layer)
❌ Authentication
❌ External API calls

### 5.2 Repository Structure

```
src/lib/repositories/
├── index.ts                    # Repository exports
├── adminRepository.ts          # Admin table access
├── sessionRepository.ts        # Session table access
├── templateRepository.ts       # Template access (whatsapp table)
├── conversationRepository.ts   # Conversation tracking (whatsapp table)
├── campaignRepository.ts       # Campaign metadata
├── recipientRepository.ts      # Campaign recipients
├── metricsRepository.ts        # Campaign metrics
└── types.ts                    # Shared repository types
```

### 5.3 Repository Definitions

#### adminRepository.ts

```typescript
export class AdminRepository {
  constructor(
    private client: DynamoDBClient,
    private tableName: string
  ) {}

  async create(admin: AdminRecord): Promise<void>
  async findByEmail(email: string): Promise<AdminRecord | null>
  async update(email: string, updates: Partial<AdminRecord>): Promise<void>
  async delete(email: string): Promise<void>
  async list(): Promise<AdminRecord[]>
  
  // Rate limiting
  async getRateLimit(ip: string): Promise<RateLimitRecord | null>
  async setRateLimit(ip: string, record: RateLimitRecord): Promise<void>
  async deleteRateLimit(ip: string): Promise<void>
}
```

**Data Transformation:**

```typescript
// Internal: DynamoDB format (AttributeValue)
{ email: { S: 'admin@streefi.in' }, passwordHash: { S: '...' } }

// External: Domain model (TypeScript object)
{ email: 'admin@streefi.in', passwordHash: '...', ... }
```

---

#### sessionRepository.ts

```typescript
export class SessionRepository {
  constructor(
    private client: DynamoDBClient,
    private tableName: string
  ) {}

  async create(session: SessionRecord): Promise<void>
  async findById(sessionId: string): Promise<SessionRecord | null>
  async update(sessionId: string, updates: Partial<SessionRecord>): Promise<void>
  async delete(sessionId: string): Promise<void>
  async deleteByEmail(email: string): Promise<void>
  async findByEmail(email: string): Promise<SessionRecord[]>  // Requires GSI
}
```

**TTL Handling:**

```typescript
// Automatically set TTL field for DynamoDB auto-deletion
const expiresAt = Date.now() + (7 * 24 * 60 * 60 * 1000);
await sessionRepo.create({
  ...session,
  expiresAt: Math.floor(expiresAt / 1000)  // Unix timestamp for TTL
});
```

---

#### campaignRepository.ts

```typescript
export class CampaignRepository {
  constructor(
    private client: DynamoDBClient,
    private tableName: string
  ) {}

  async create(campaign: CampaignRecord): Promise<void>
  async findById(campaignId: string): Promise<CampaignRecord | null>
  async update(campaignId: string, updates: Partial<CampaignRecord>): Promise<void>
  async delete(campaignId: string): Promise<void>
  async list(options?: ListOptions): Promise<CampaignRecord[]>
  async findByStatus(status: CampaignStatus): Promise<CampaignRecord[]>
  
  // Atomic operations
  async incrementCounter(campaignId: string, field: string, by: number): Promise<void>
  async acquireLock(campaignId: string, ttlSeconds: number): Promise<boolean>
  async releaseLock(campaignId: string): Promise<void>
  
  // Logs
  async addLog(campaignId: string, log: CampaignLog): Promise<void>
  async getLogs(campaignId: string, limit?: number): Promise<CampaignLog[]>
}
```

**Atomic Counter Example:**

```typescript
// Race-condition-safe increment
await campaignRepo.incrementCounter(campaignId, 'sentCount', 1);

// DynamoDB backend:
UpdateExpression: 'ADD sentCount :inc',
ExpressionAttributeValues: { ':inc': { N: '1' } }
```

---

#### recipientRepository.ts

```typescript
export class RecipientRepository {
  constructor(
    private client: DynamoDBClient,
    private tableName: string
  ) {}

  async batchCreate(campaignId: string, recipients: RecipientRecord[]): Promise<void>
  async findByCampaign(campaignId: string, limit?: number): Promise<RecipientRecord[]>
  async findPending(campaignId: string, limit: number): Promise<RecipientRecord[]>
  async findFailed(campaignId: string): Promise<RecipientRecord[]>
  async updateStatus(campaignId: string, phone: string, status: RecipientStatus): Promise<void>
  async incrementAttempts(campaignId: string, phone: string): Promise<void>
}
```

**Batch Operations:**

```typescript
// DynamoDB BatchWriteItem (25 items max)
const batches = chunk(recipients, 25);
for (const batch of batches) {
  await recipientRepo.batchCreate(campaignId, batch);
}
```

---

#### metricsRepository.ts

```typescript
export class MetricsRepository {
  constructor(
    private client: DynamoDBClient,
    private tableName: string
  ) {}

  async get(campaignId: string): Promise<MetricsRecord | null>
  async increment(campaignId: string, metric: MetricType, by: number): Promise<void>
  async addRevenue(campaignId: string, amount: number): Promise<void>
  
  // Message tracking
  async createMessageRecord(record: MessageTrackingRecord): Promise<void>
  async findMessageByCampaign(messageId: string): Promise<string | null> // Returns campaignId
  
  // Idempotency
  async isStatusProcessed(messageId: string, status: string, errorCode?: number): Promise<boolean>
  async markStatusProcessed(messageId: string, status: string, errorCode?: number): Promise<void>
}
```

**Message Attribution:**

```typescript
// When sending
await metricsRepo.createMessageRecord({
  messageId: 'wamid.xxx',
  campaignId: 'cmp_123',
  recipientPhone: '919876543210',
  ...
});

// When webhook arrives
const campaignId = await metricsRepo.findMessageByCampaign('wamid.xxx');
await metricsRepo.increment(campaignId, 'delivered', 1);
```

---

### 5.4 Repository Layer Benefits

**Centralized Database Access:**

```typescript
// Before: 30+ files with dynamoClient.send()
await dynamoClient.send(new GetItemCommand({...}));

// After: All DB access through repositories
const campaign = await campaignRepo.findById(id);
```

**Easy to Mock for Testing:**

```typescript
const mockRepo = {
  findById: jest.fn().mockResolvedValue(mockCampaign),
  update: jest.fn().mockResolvedValue(undefined)
};
```

**Database Migration Path:**

```typescript
// Want to switch from DynamoDB to PostgreSQL?
// Only change repository implementations, not services!
export class CampaignRepositoryPostgres implements ICampaignRepository {
  async findById(id: string): Promise<Campaign | null> {
    return await db.query('SELECT * FROM campaigns WHERE id = $1', [id]);
  }
}
```

**Type Safety:**

```typescript
// Repositories handle AttributeValue ↔ TypeScript conversion
// Services work with clean TypeScript objects
const campaign: Campaign = await campaignRepo.findById(id);
console.log(campaign.name); // string, not { S: 'Campaign Name' }
```

---

## 6. API Route Responsibilities

### 6.1 API Route Principles

**Responsibilities:**
✅ HTTP request/response handling
✅ Input validation
✅ Authentication/authorization
✅ Request logging
✅ Error response formatting

**NOT Responsible For:**
❌ Business logic (→ services)
❌ Database access (→ repositories)
❌ Business rules (→ guards)

### 6.2 Refactored Route Example

**Before (Current):**

```typescript
// src/app/api/campaigns/create/route.ts (170 lines)
export async function POST(req: NextRequest) {
  // Auth
  const validation = await validateAdminSession(req, 'whatsapp-session');
  
  // Validation
  const body = await req.json();
  if (!body.name) return NextResponse.json({error: '...'}, {status: 400});
  
  // Business logic
  const campaignId = `cmp_${randomUUID()}`;
  const timestamp = Math.floor(Date.now() / 1000);
  
  // Direct DynamoDB access
  await dynamoClient.send(new PutItemCommand({
    TableName: TABLES.CAMPAIGNS,
    Item: {
      PK: { S: `CAMPAIGN#${campaignId}` },
      SK: { S: 'METADATA' },
      ...
    }
  }));
  
  // Batch recipient insert
  for (let i = 0; i < recipients.length; i += 25) {
    await dynamoClient.send(new BatchWriteItemCommand({...}));
  }
  
  return NextResponse.json({ campaignId });
}
```

**After (Refactored):**

```typescript
// src/app/api/campaigns/create/route.ts (40 lines)
export async function POST(req: NextRequest) {
  try {
    // 1. Authentication
    const auth = await validateAdminSession(req, 'whatsapp-session');
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  
    // 2. Input validation
    const body = await req.json();
    const input = CreateCampaignSchema.parse(body); // Zod validation
  
    // 3. Business logic (via service)
    const campaign = await campaignService.createCampaign({
      ...input,
      createdBy: auth.session!.email
    });
  
    // 4. Response
    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.campaignId,
        name: campaign.name,
        status: campaign.status
      }
    }, { status: 201 });
  
  } catch (error) {
    return handleApiError(error);
  }
}
```

**Benefits:**

- ✅ 70% fewer lines of code
- ✅ Business logic in testable service
- ✅ Database access in reusable repository
- ✅ Clear separation of concerns

---

### 6.3 API Route Map (Refactored)

#### Campaign Routes

| Route                                      | Service Calls                                                               | Description            |
| ------------------------------------------ | --------------------------------------------------------------------------- | ---------------------- |
| `POST /api/campaigns/create`             | `campaignService.createCampaign()`                                        | Create new campaign    |
| `GET /api/campaigns/list`                | `campaignService.listCampaigns()`                                         | List all campaigns     |
| `GET /api/campaigns/[id]`                | `campaignService.getCampaign()`                                           | Get campaign details   |
| `PATCH /api/campaigns/[id]`              | `campaignService.updateCampaign()`                                        | Update campaign        |
| `DELETE /api/campaigns/[id]`             | `campaignService.deleteCampaign()`                                        | Delete campaign        |
| `POST /api/campaigns/[id]/control`       | `campaignService.startCampaign()``campaignService.pauseCampaign()` | Control campaign state |
| `POST /api/campaigns/[id]/populate`      | `recipientService.addRecipients()`                                        | Upload recipient list  |
| `POST /api/campaigns/[id]/execute-batch` | `whatsappService.sendBulkMessages()`                                      | Execute message batch  |
| `GET /api/campaigns/[id]/analytics`      | `analyticsService.getCampaignAnalytics()`                                 | Get campaign metrics   |
| `POST /api/campaigns/[id]/retry-failed`  | `recipientService.retryFailed()`                                          | Retry failed messages  |
| `GET /api/campaigns/[id]/logs`           | `campaignService.getCampaignLogs()`                                       | Get execution logs     |

#### WhatsApp Admin Routes

| Route                                      | Service Calls                             | Description         |
| ------------------------------------------ | ----------------------------------------- | ------------------- |
| `GET /api/whatsapp-admin/templates`      | `templateService.listTemplates()`       | List templates      |
| `POST /api/whatsapp-admin/templates`     | `templateService.createTemplate()`      | Create template     |
| `GET /api/whatsapp-admin/settings`       | `whatsappService.getSettings()`         | Get system settings |
| `PUT /api/whatsapp-admin/settings`       | `whatsappService.updateSettings()`      | Update settings     |
| `POST /api/whatsapp-admin/send-template` | `whatsappService.sendTemplateMessage()` | Test send message   |

#### Auth Routes

| Route                                    | Service Calls                                                               | Description   |
| ---------------------------------------- | --------------------------------------------------------------------------- | ------------- |
| `POST /api/whatsapp-admin-auth/login`  | `adminService.authenticateAdmin()``sessionService.createSession()` | Admin login   |
| `POST /api/whatsapp-admin-auth/logout` | `sessionService.deleteSession()`                                          | Admin logout  |
| `GET /api/whatsapp-admin-auth/check`   | `sessionService.validateSession()`                                        | Check session |

#### Webhook Routes

| Route                  | Service Calls                                                                             | Description          |
| ---------------------- | ----------------------------------------------------------------------------------------- | -------------------- |
| `POST /api/whatsapp` | `whatsappService.processStatusUpdate()``whatsappService.processInboundMessage()` | Handle Meta webhooks |

---

## 7. Data Flow Diagrams

### 7.1 Campaign Creation Flow

```
User (Dashboard)
    ↓
    POST /api/campaigns/create
    { name, templateName, recipients[], dailyCap }
    ↓
┌───────────────────────────────────────────┐
│ API Route: campaigns/create/route.ts      │
│                                           │
│ 1. validateAdminSession()                │
│ 2. Parse & validate input                │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Service: campaignService.createCampaign() │
│                                           │
│ 1. Generate campaign ID                  │
│ 2. Validate audience quality             │
│ 3. Prepare campaign record               │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Repository: campaignRepository.create()   │
│                                           │
│ PutItem: CAMPAIGN#{id} / METADATA        │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Service: recipientService.addRecipients() │
│                                           │
│ Batch recipients (25 per call)           │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Repository: recipientRepository.batchCreate() │
│                                           │
│ BatchWriteItem: CAMPAIGN#{id} / RECIPIENT#{phone} │
└───────────────────────────────────────────┘
    ↓
    Response: { campaignId, status: 'DRAFT' }
```

---

### 7.2 Campaign Execution Flow

```
CloudWatch Cron (every 1 minute)
    ↓
    POST /api/campaigns/dispatch
    ↓
┌───────────────────────────────────────────┐
│ Service: campaignDispatcher.run()         │
│                                           │
│ 1. Find RUNNING campaigns                │
│ 2. Check daily limits                    │
│ 3. Prioritize campaigns                  │
└───────────────────────────────────────────┘
    ↓ (for each campaign)
    POST /api/campaigns/[id]/execute-batch
    ↓
┌───────────────────────────────────────────┐
│ API Route: execute-batch/route.ts         │
│                                           │
│ 1. Validate admin/system key             │
│ 2. Check kill switch                     │
│ 3. Acquire execution lock                │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Service: campaignService.acquireLock()    │
│                                           │
│ Atomic lock with TTL (prevents overlap)  │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Service: recipientService.getBatch()      │
│                                           │
│ Query 25 PENDING recipients              │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Repository: recipientRepository.findPending() │
│                                           │
│ Query: PK=CAMPAIGN#{id}, SK begins with RECIPIENT# │
│ Filter: status = PENDING, Limit: 25      │
└───────────────────────────────────────────┘
    ↓ (for each recipient)
┌───────────────────────────────────────────┐
│ Guard: dailyLimitGuard.checkLimit()      │
│                                           │
│ 1. Check existing conversation (24h)     │
│ 2. Check daily counter                   │
│ 3. Increment if allowed                  │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Guard: messageRateThrottle.waitForSlot() │
│                                           │
│ Token bucket (10-20 msg/sec)             │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Service: whatsappService.sendMessage()    │
│                                           │
│ Orchestrate message sending              │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Client: metaClient.sendTemplateMessage()  │
│                                           │
│ POST https://graph.facebook.com/...      │
└───────────────────────────────────────────┘
    ↓
    Meta Response: { messages: [{ id: 'wamid.xxx' }] }
    ↓
┌───────────────────────────────────────────┐
│ Service: recipientService.markSent()      │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Repository: recipientRepository.updateStatus() │
│                                           │
│ UpdateItem: status = SENT, messageId     │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Repository: campaignRepository.incrementCounter() │
│                                           │
│ UpdateItem: ADD sentCount 1              │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Repository: metricsRepository.createMessageRecord() │
│                                           │
│ PutItem: MESSAGE#{messageId}             │
│ (for webhook attribution)                │
└───────────────────────────────────────────┘
    ↓
    Release execution lock
```

---

### 7.3 Webhook Processing Flow (Inbound Status Updates)

```
Meta WhatsApp API
    ↓
    POST /api/whatsapp
    { entry: [{ changes: [{ value: { statuses: [...] } }] }] }
    ↓
┌───────────────────────────────────────────┐
│ API Route: whatsapp/route.ts              │
│                                           │
│ 1. Verify Meta signature                 │
│ 2. Parse webhook payload                 │
└───────────────────────────────────────────┘
    ↓ (for each status)
┌───────────────────────────────────────────┐
│ Service: whatsappService.processStatus()  │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Repository: metricsRepository.findMessage() │
│                                           │
│ Get: MESSAGE#{messageId} → campaignId    │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Repository: metricsRepository.isStatusProcessed() │
│                                           │
│ Idempotency check (prevent duplicates)  │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Service: analyticsService.incrementMetric() │
│                                           │
│ Status: delivered → increment delivered  │
│ Status: read → increment read            │
│ Status: failed → increment failed +      │
│                  check error code        │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Repository: metricsRepository.increment() │
│                                           │
│ UpdateItem: ADD delivered 1              │
│ (Atomic, race-condition safe)            │
└───────────────────────────────────────────┘
    ↓ (if error code = 131051 = user blocked)
┌───────────────────────────────────────────┐
│ Guard: blockRateCircuitBreaker.recordBlock() │
│                                           │
│ 1. Increment block counter               │
│ 2. Check block rate                      │
│ 3. Auto-pause if > 5%                    │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Repository: metricsRepository.markProcessed() │
│                                           │
│ PutItem: MESSAGE_STATUS#{messageId}      │
│ (TTL: 30 days, auto-cleanup)             │
└───────────────────────────────────────────┘
    ↓
    Response: 200 OK
```

---

### 7.4 Authentication Flow

```
User (Browser)
    ↓
    POST /api/whatsapp-admin-auth/login
    { email, password }
    ↓
┌───────────────────────────────────────────┐
│ API Route: login/route.ts                 │
│                                           │
│ 1. Parse credentials                      │
│ 2. Rate limit check (IP-based)          │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Service: adminService.authenticateAdmin() │
│                                           │
│ 1. Get admin by email                    │
│ 2. Verify password (bcrypt)              │
│ 3. Update last login                     │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Repository: adminRepository.findByEmail() │
│                                           │
│ GetItem: email = admin@streefi.in        │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Lib: crypto.verifyPassword()              │
│                                           │
│ bcrypt.compare(password, hash)           │
└───────────────────────────────────────────┘
    ↓ (if valid)
┌───────────────────────────────────────────┐
│ Service: sessionService.createSession()   │
│                                           │
│ 1. Generate session ID (sess_{uuid})    │
│ 2. Set expiry (7 days)                   │
│ 3. Store device info                     │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Repository: sessionRepository.create()    │
│                                           │
│ PutItem: session_id, email, expiresAt    │
│ (TTL enabled for auto-cleanup)           │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ API Route: Set httpOnly cookie           │
│                                           │
│ Set-Cookie: wa_admin_session=sess_xxx    │
│ httpOnly; secure; sameSite=strict        │
└───────────────────────────────────────────┘
    ↓
    Response: { success: true }

─────────────────────────────────────────────
Subsequent Authenticated Requests:
─────────────────────────────────────────────

User Request
    ↓
    GET /api/campaigns/list
    Cookie: wa_admin_session=sess_xxx
    ↓
┌───────────────────────────────────────────┐
│ Lib: validateAdminSession()               │
│                                           │
│ 1. Read session ID from cookie           │
│ 2. Validate format (sess_*)              │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Service: sessionService.validateSession() │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Repository: sessionRepository.findById()  │
│                                           │
│ GetItem: session_id = sess_xxx           │
└───────────────────────────────────────────┘
    ↓
┌───────────────────────────────────────────┐
│ Validation Checks:                        │
│                                           │
│ 1. Session exists?                       │
│ 2. Status = active?                      │
│ 3. Not expired?                          │
│ 4. Session type matches route?           │
└───────────────────────────────────────────┘
    ↓
    Return: { valid: true, session: {...} }
```

---

## 8. TypeScript Interfaces

### 8.1 Domain Models (Core Types)

```typescript
// src/types/admin.ts

export interface Admin {
  email: string;
  name?: string;
  passwordHash: string;
  role: 'admin' | 'superadmin';
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
}

export interface CreateAdminInput {
  email: string;
  name?: string;
  password: string;
  role: 'admin' | 'superadmin';
}

export interface UpdateAdminInput {
  name?: string;
  password?: string;
  status?: 'active' | 'suspended';
}
```

```typescript
// src/types/session.ts

export type SessionType = 'email-session' | 'whatsapp-session';

export interface Session {
  session_id: string;
  email: string;
  type: SessionType;
  status: 'active' | 'expired';
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  expiresAt: number;        // Unix timestamp
  lastActivityAt?: number;
}

export interface CreateSessionInput {
  email: string;
  type: SessionType;
  deviceId?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresInDays?: number;   // Default: 7
}

export interface ValidationResult {
  valid: boolean;
  session?: Session;
  error?: string;
}
```

```typescript
// src/types/campaign.ts

export type CampaignStatus = 
  | 'DRAFT' 
  | 'READY' 
  | 'RUNNING' 
  | 'PAUSED' 
  | 'COMPLETED' 
  | 'FAILED';

export type CampaignChannel = 'WHATSAPP' | 'EMAIL';

export type AudienceType = 'FIREBASE' | 'MONGODB' | 'CSV' | 'MIXED';

export interface Campaign {
  campaignId: string;
  name: string;
  channel: CampaignChannel;
  createdBy: string;
  status: CampaignStatus;
  audienceType: AudienceType;
  
  // Template configuration
  templateName?: string;          // Legacy: single template
  templates?: string[];           // New: multiple templates
  templateWeights?: number[];     // Weights for selection
  templateStrategy?: 'random' | 'weighted' | 'round-robin';
  
  // Counters
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  blockedCount: number;
  dailyCap: number;
  
  // Execution state
  executionLock?: boolean;
  lockedAt?: number;
  lockedBy?: string;              // Lambda execution ID
  lastBatchAt?: number;
  
  // Timestamps
  createdAt: number;
  updatedAt: number;
  startedAt?: number;
  completedAt?: number;
  pausedAt?: number;
  pausedReason?: string;
}

export interface CreateCampaignInput {
  name: string;
  channel?: CampaignChannel;      // Default: WHATSAPP
  audienceType?: AudienceType;    // Default: CSV
  templateName?: string;          // Legacy
  templates?: string[];           // New
  templateWeights?: number[];
  templateStrategy?: 'random' | 'weighted' | 'round-robin';
  recipients: RecipientInput[];
  dailyCap?: number;              // Default: 200
  createdBy: string;
}

export interface UpdateCampaignInput {
  name?: string;
  dailyCap?: number;
  status?: CampaignStatus;
  pausedReason?: string;
}
```

```typescript
// src/types/recipient.ts

export type RecipientStatus = 'PENDING' | 'SENT' | 'FAILED' | 'BLOCKED';

export interface Recipient {
  phone: string;
  name?: string;
  variables?: Record<string, string>;
  status: RecipientStatus;
  attempts: number;
  messageId?: string;
  failureReason?: string;
  sentAt?: number;
  createdAt: number;
}

export interface RecipientInput {
  phone: string;
  name?: string;
  variables?: Record<string, string>;
}

export interface BulkSendResult {
  total: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: Array<{
    phone: string;
    reason: string;
  }>;
}
```

```typescript
// src/types/metrics.ts

export type MetricType = 'sent' | 'delivered' | 'read' | 'clicked' | 'replied' | 'converted' | 'blocked';

export interface CampaignMetrics {
  campaignId: string;
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  replied: number;
  converted: number;
  blocked: number;
  revenue?: number;
  updatedAt: number;
}

export interface CampaignAnalytics extends CampaignMetrics {
  deliveryRate: number;       // delivered / sent
  readRate: number;           // read / delivered
  ctr: number;                // clicked / read (Click Through Rate)
  replyRate: number;          // replied / delivered
  conversionRate: number;     // converted / clicked
  blockRate: number;          // blocked / delivered (META BAN RISK)
  engagementScore: number;    // clicked / read (Meta quality signal)
  roi?: number;               // revenue / cost
}

export interface MessageTrackingRecord {
  messageId: string;
  campaignId: string;
  recipientPhone: string;
  templateName: string;
  sentAt: number;
  trackingToken?: string;
}
```

```typescript
// src/types/whatsapp.ts

export interface WhatsAppTemplate {
  templateId: string;
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  variables: string[];
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  metaStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  metaTemplateId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateInput {
  name: string;
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;
  variables?: string[];
}

export interface ConversationRecord {
  phone: string;
  conversationStartedAt: number;
  lastMessageAt: number;
  status: 'open' | 'closed';
  messageCount: number;
}

export interface WebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message: string;
    error_data?: {
      details: string;
    };
  }>;
  conversation?: {
    id: string;
    origin: {
      type: string;
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
}
```

### 8.2 Repository Record Types

```typescript
// src/lib/repositories/types.ts

import { AttributeValue } from '@aws-sdk/client-dynamodb';

/**
 * DynamoDB record types (internal to repositories)
 * These match the actual DynamoDB AttributeValue format
 */

export interface AdminRecord {
  email: { S: string };
  passwordHash: { S: string };
  name?: { S: string };
  role: { S: 'admin' | 'superadmin' };
  status: { S: 'active' | 'suspended' };
  createdAt: { S: string };
  lastLoginAt?: { S: string };
  lastLoginIp?: { S: string };
}

export interface SessionRecord {
  session_id: { S: string };
  email: { S: string };
  type: { S: 'email-session' | 'whatsapp-session' };
  status: { S: 'active' | 'expired' };
  deviceId?: { S: string };
  ipAddress?: { S: string };
  userAgent?: { S: string };
  createdAt: { S: string };
  expiresAt: { N: string };
  lastActivityAt?: { N: string };
}

export interface CampaignRecord {
  PK: { S: string };    // CAMPAIGN#{id}
  SK: { S: string };    // METADATA
  campaignId: { S: string };
  name: { S: string };
  channel: { S: string };
  createdBy: { S: string };
  status: { S: string };
  audienceType: { S: string };
  templateName?: { S: string };
  templates?: { L: Array<{ S: string }> };
  templateWeights?: { L: Array<{ N: string }> };
  templateStrategy?: { S: string };
  totalRecipients: { N: string };
  sentCount: { N: string };
  failedCount: { N: string };
  blockedCount: { N: string };
  dailyCap: { N: string };
  executionLock?: { BOOL: boolean };
  lockedAt?: { N: string };
  lockedBy?: { S: string };
  lastBatchAt?: { N: string };
  createdAt: { N: string };
  updatedAt: { N: string };
  startedAt?: { N: string };
  completedAt?: { N: string };
  pausedAt?: { N: string };
  pausedReason?: { S: string };
}

export interface RecipientRecord {
  PK: { S: string };    // CAMPAIGN#{id}
  SK: { S: string };    // RECIPIENT#{phone}
  phone: { S: string };
  name?: { S: string };
  variables?: { M: Record<string, { S: string }> };
  status: { S: string };
  attempts: { N: string };
  messageId?: { S: string };
  failureReason?: { S: string };
  sentAt?: { N: string };
  createdAt: { N: string };
}

/**
 * Helper type for repository method signatures
 */
export type DynamoRecord<T> = {
  [K in keyof T]: AttributeValue;
};

/**
 * Mapper utilities (to be implemented in repositories)
 */
export interface RecordMapper<Domain, Record> {
  toDomain(record: Record): Domain;
  toRecord(domain: Domain): Record;
}
```

### 8.3 Service Method Signatures

```typescript
// src/services/types.ts

export interface ICampaignService {
  createCampaign(input: CreateCampaignInput): Promise<Campaign>;
  getCampaign(campaignId: string): Promise<Campaign | null>;
  listCampaigns(options?: ListCampaignsOptions): Promise<Campaign[]>;
  updateCampaign(campaignId: string, updates: UpdateCampaignInput): Promise<Campaign>;
  deleteCampaign(campaignId: string): Promise<void>;
  
  startCampaign(campaignId: string): Promise<void>;
  pauseCampaign(campaignId: string, reason: string): Promise<void>;
  resumeCampaign(campaignId: string): Promise<void>;
  completeCampaign(campaignId: string): Promise<void>;
  
  acquireExecutionLock(campaignId: string, ttlSeconds: number): Promise<boolean>;
  releaseExecutionLock(campaignId: string): Promise<void>;
  
  addLog(campaignId: string, level: LogLevel, message: string, details?: any): Promise<void>;
  getLogs(campaignId: string, limit?: number): Promise<CampaignLog[]>;
}

export interface IRecipientService {
  addRecipients(campaignId: string, recipients: RecipientInput[]): Promise<void>;
  getRecipients(campaignId: string, status?: RecipientStatus): Promise<Recipient[]>;
  getRecipientsBatch(campaignId: string, limit: number): Promise<Recipient[]>;
  updateRecipientStatus(campaignId: string, phone: string, status: RecipientStatus): Promise<void>;
  markSent(campaignId: string, phone: string, messageId: string): Promise<void>;
  markFailed(campaignId: string, phone: string, reason: string): Promise<void>;
  incrementAttempts(campaignId: string, phone: string): Promise<void>;
  getFailedRecipients(campaignId: string): Promise<Recipient[]>;
  retryFailed(campaignId: string): Promise<number>;
}

export interface IAdminService {
  createAdmin(input: CreateAdminInput): Promise<Admin>;
  getAdminByEmail(email: string): Promise<Admin | null>;
  authenticateAdmin(email: string, password: string): Promise<Admin | null>;
  updatePassword(email: string, newPassword: string): Promise<void>;
  updateLastLogin(email: string, ip: string): Promise<void>;
  listAdmins(): Promise<Admin[]>;
  suspendAdmin(email: string): Promise<void>;
}

export interface ISessionService {
  createSession(input: CreateSessionInput): Promise<Session>;
  getSession(sessionId: string): Promise<Session | null>;
  validateSession(sessionId: string, type: SessionType): Promise<ValidationResult>;
  refreshSession(sessionId: string): Promise<Session>;
  deleteSession(sessionId: string): Promise<void>;
  deleteAllSessions(email: string): Promise<void>;
  listActiveSessions(email: string): Promise<Session[]>;
}

export interface IWhatsAppService {
  sendTemplateMessage(
    to: string,
    templateName: string,
    variables: Record<string, string>,
    campaignId?: string
  ): Promise<MessageResponse>;
  
  sendBulkMessages(
    campaignId: string,
    recipients: Recipient[],
    templateName: string
  ): Promise<BulkSendResult>;
  
  checkConversationWindow(phone: string): Promise<boolean>;
  startConversation(phone: string): Promise<void>;
  getDailyCount(): Promise<number>;
  
  processStatusUpdate(status: WebhookStatus): Promise<void>;
  processInboundMessage(message: InboundMessage): Promise<void>;
}

export interface IAnalyticsService {
  getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics>;
  getSystemMetrics(): Promise<SystemMetrics>;
  incrementMetric(campaignId: string, metric: MetricType, by?: number): Promise<void>;
  recordConversion(campaignId: string, phone: string, amount: number): Promise<void>;
  getEngagementScore(campaignId: string): Promise<number>;
  getBlockRate(campaignId: string): Promise<number>;
}

// Supporting types

export interface ListCampaignsOptions {
  status?: CampaignStatus;
  createdBy?: string;
  limit?: number;
  sortBy?: 'createdAt' | 'startedAt';
  sortOrder?: 'asc' | 'desc';
}

export type LogLevel = 'info' | 'warning' | 'error';

export interface CampaignLog {
  timestamp: number;
  level: LogLevel;
  message: string;
  details?: any;
}

export interface MessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export interface InboundMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'document' | 'audio' | 'video';
  text?: {
    body: string;
  };
  // ... other fields
}

export interface SystemMetrics {
  totalCampaigns: number;
  activeCampaigns: number;
  totalMessagesSent: number;
  messagesLast24h: number;
  dailyLimitUsage: number;
  dailyLimitRemaining: number;
  avgDeliveryRate: number;
  avgEngagementScore: number;
}
```

---

## 9. Refactor Recommendations

### 9.1 Priority 1: Critical (Do First)

#### 1. Create Repository Layer

**Impact:** High
**Effort:** Medium
**Risk:** Low

**Action Items:**

1. Create `/src/lib/repositories/` folder
2. Implement core repositories:

   - `adminRepository.ts`
   - `sessionRepository.ts`
   - `campaignRepository.ts`
   - `recipientRepository.ts`
   - `metricsRepository.ts`
3. Add mapper utilities for AttributeValue ↔ TypeScript conversion
4. Write unit tests for each repository (mock DynamoDB client)

**Benefits:**

- ✅ Centralized database access
- ✅ Easy to test
- ✅ Prepare for database migration if needed
- ✅ Consistent error handling

**Example PR:**

```
feat: add repository layer for DynamoDB access

- Create base repository interface
- Implement AdminRepository
- Implement SessionRepository
- Add AttributeValue mappers
- Add unit tests with mocked DynamoDB client

BREAKING CHANGE: None (additive only)
Files changed: +7 new files
Tests: 145 passing
```

---

#### 2. Create Service Layer

**Impact:** High
**Effort:** High
**Risk:** Medium (requires refactoring existing code)

**Action Items:**

1. Create `/src/services/` folder structure
2. Implement core services:

   - `adminService.ts`
   - `sessionService.ts`
   - `campaignService.ts`
   - `recipientService.ts`
   - `whatsappService.ts`
   - `analyticsService.ts`
3. Extract business logic from API routes
4. Use repositories for all database access
5. Maintain guard pattern for business policies
6. Write integration tests

**Migration Strategy:**

```typescript
// Phase 1: Create service (doesn't break existing code)
export class CampaignService {
  async createCampaign(input: CreateCampaignInput): Promise<Campaign> {
    // Business logic here
  }
}

// Phase 2: Update ONE route to use service
// src/app/api/campaigns/create/route.ts
const campaign = await campaignService.createCampaign(input);

// Phase 3: Gradually migrate other routes

// Phase 4: Remove direct DB access from routes
```

**Benefits:**

- ✅ Testable business logic
- ✅ Reusable across API routes, cron jobs, CLI tools
- ✅ Clear separation of concerns
- ✅ Easier onboarding for new developers

---

#### 3. Define TypeScript Interfaces

**Impact:** Medium
**Effort:** Low
**Risk:** Low

**Action Items:**

1. Create `/src/types/` folder
2. Define domain models:

   - `admin.ts`
   - `session.ts`
   - `campaign.ts`
   - `recipient.ts`
   - `metrics.ts`
   - `whatsapp.ts`
3. Remove duplicate interface definitions across files
4. Export from central `index.ts`

**Benefits:**

- ✅ Type safety
- ✅ Autocomplete in IDE
- ✅ Single source of truth
- ✅ Easier refactoring

---

### 9.2 Priority 2: Important (Do Soon)

#### 4. Update Documentation

**Impact:** Medium
**Effort:** Low
**Risk:** None

**Action Items:**

1. Update table documentation to reflect actual 4-table architecture
2. Remove references to `streefi_campaign_contacts` and `whatsapp_conversations`
3. Document PK/SK patterns used
4. Add architecture diagrams
5. Create developer onboarding guide

**Files to Update:**

- `docs/THREE-TABLE-ARCHITECTURE.md` → Rename to `FOUR-TABLE-ARCHITECTURE.md`
- `docs/WHATSAPP-DASHBOARD-ARCHITECTURE.md`
- `docs/CAMPAIGN-EXECUTOR-PHASE-1A.md`
- `docs/PHASE-4-SETUP-GUIDE.md`

---

#### 5. Add API Input Validation

**Impact:** Medium
**Effort:** Low
**Risk:** Low

**Action Items:**

1. Install Zod: `npm install zod`
2. Create validation schemas in `/src/schemas/`
3. Add validation to all API routes

**Example:**

```typescript
// src/schemas/campaign.ts
import { z } from 'zod';

export const CreateCampaignSchema = z.object({
  name: z.string().min(3).max(100),
  templateName: z.string().optional(),
  templates: z.array(z.string()).min(1).optional(),
  recipients: z.array(
    z.string().regex(/^\d{10,15}$/, 'Invalid phone number')
  ).min(1).max(10000),
  dailyCap: z.number().int().min(1).max(5000).optional()
});

// In route
const input = CreateCampaignSchema.parse(req.json());
```

**Benefits:**

- ✅ Catch invalid input before processing
- ✅ Better error messages
- ✅ Type inference from schemas
- ✅ Consistent validation across routes

---

#### 6. Implement Structured Logging

**Impact:** Medium
**Effort:** Low
**Risk:** None

**Action Items:**

1. Install logger: `npm install pino pino-pretty`
2. Create logging utility in `/src/lib/logger.ts`
3. Replace `console.log` with structured logging
4. Add request IDs for tracing

**Example:**

```typescript
// src/lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
});

// Usage in service
logger.info({ campaignId, recipientCount }, 'Campaign created');
logger.error({ error, campaignId }, 'Failed to send message');
```

**Benefits:**

- ✅ Searchable logs in CloudWatch
- ✅ Structured data for monitoring
- ✅ Request tracing
- ✅ Better debugging

---

### 9.3 Priority 3: Nice to Have (Future)

#### 7. Add API Rate Limiting

**Current:** Rate limiting only on login routes
**Recommended:** Rate limiting on all write operations

**Example:**

```typescript
// Per user, per endpoint rate limiting
await rateLimit.check('api:campaigns:create', auth.session.email, {
  max: 10,      // 10 campaigns
  windowMs: 60000  // per minute
});
```

---

#### 8. Add Request Caching

**Opportunity:** Cache frequently accessed data

- Campaign list (cache for 10s)
- System settings (cache for 5 minutes)
- Template list (cache for 1 minute)

**Implementation:**

```typescript
// In-memory cache with TTL
import NodeCache from 'node-cache';

const cache = new NodeCache({ stdTTL: 60 });

async function listCampaigns() {
  const cached = cache.get('campaigns:list');
  if (cached) return cached;
  
  const campaigns = await campaignRepo.list();
  cache.set('campaigns:list', campaigns);
  return campaigns;
}
```

---

#### 9. Add Background Job Queue

**Current:** Cron-based dispatcher (works but limited)
**Recommended:** Use SQS for better control

**Benefits:**

- ✅ Retry failed batches automatically
- ✅ Priority queue for urgent campaigns
- ✅ Better visibility into pending work
- ✅ Dead letter queue for debugging

**Implementation:**

```typescript
// When campaign starts
await sqsClient.send(new SendMessageCommand({
  QueueUrl: process.env.CAMPAIGN_QUEUE_URL,
  MessageBody: JSON.stringify({
    campaignId,
    action: 'execute-batch'
  }),
  DelaySeconds: 0
}));

// Lambda triggered by SQS
export async function handler(event: SQSEvent) {
  for (const record of event.Records) {
    const { campaignId } = JSON.parse(record.body);
    await executeBatch(campaignId);
  }
}
```

---

#### 10. Add Monitoring & Alerts

**Metrics to Track:**

- Campaign execution duration
- Message send rate (msg/sec)
- Daily limit usage (% of cap)
- Block rate (% of sent messages)
- API error rate
- DynamoDB throttles

**Alerts:**

- 🚨 Block rate > 3% (Meta ban risk)
- 🚨 Daily limit > 90% (approaching cap)
- ⚠️ Campaign stalled (no progress in 10 minutes)
- ⚠️ High API error rate (>5%)

**Tools:**

- AWS CloudWatch Alarms
- Sentry for error tracking
- Datadog/Grafana for dashboards

---

### 9.4 Refactor Safety Guidelines

**How to Refactor Without Breaking Production:**

1. **Additive Changes First**

   ```
   ✅ Add new service layer (doesn't affect existing routes)
   ✅ Add new repository layer (doesn't affect existing routes)
   ❌ Don't delete old code until new code is proven
   ```
2. **Feature Flags**

   ```typescript
   const useNewService = process.env.USE_NEW_CAMPAIGN_SERVICE === 'true';

   if (useNewService) {
     return await campaignService.createCampaign(input);
   } else {
     // Old direct DB access
     return await legacyCreateCampaign(input);
   }
   ```
3. **Gradual Migration**

   ```
   Week 1: Create repositories (no route changes)
   Week 2: Create services (no route changes)
   Week 3: Migrate 1-2 low-traffic routes
   Week 4: Monitor for errors
   Week 5: Migrate remaining routes
   Week 6: Remove old code
   ```
4. **Testing Strategy**

   ```
   ✅ Unit tests for repositories (mock DynamoDB)
   ✅ Unit tests for services (mock repositories)
   ✅ Integration tests for API routes (real DB)
   ✅ E2E tests for critical flows
   ```
5. **Rollback Plan**

   ```
   - Keep old code in parallel for 2 weeks
   - Monitor error rates closely
   - Have rollback commits ready
   - Test rollback in staging first
   ```

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Goal:** Create repository and service layers without breaking existing functionality

**Tasks:**

- [ ] Create `/src/lib/repositories/` folder structure
- [ ] Implement `adminRepository.ts`
- [ ] Implement `sessionRepository.ts`
- [ ] Implement `campaignRepository.ts`
- [ ] Implement `recipientRepository.ts`
- [ ] Implement `metricsRepository.ts`
- [ ] Add AttributeValue mappers
- [ ] Write unit tests for repositories (100% coverage)
- [ ] Create `/src/services/` folder structure
- [ ] Implement services (using repositories)
- [ ] Write unit tests for services

**Deliverable:** New code that doesn't affect existing routes

**Risk:** Low (additive only)

---

### Phase 2: Type Safety (Week 3)

**Goal:** Define all TypeScript interfaces and remove duplicates

**Tasks:**

- [ ] Create `/src/types/` folder
- [ ] Define domain models
- [ ] Define service interfaces
- [ ] Define repository interfaces
- [ ] Update existing code to use new types
- [ ] Remove duplicate interface definitions
- [ ] Add Zod schemas for validation

**Deliverable:** Single source of truth for types

**Risk:** Low (mostly TypeScript, no runtime changes)

---

### Phase 3: Migrate Low-Traffic Routes (Week 4)

**Goal:** Prove new architecture works in production

**Routes to Migrate:**

- [ ] `/api/campaigns/[id]/analytics` (read-only)
- [ ] `/api/campaigns/list` (read-only)
- [ ] `/api/whatsapp-admin/settings` (low traffic)

**Strategy:**

1. Add feature flag
2. Deploy with flag OFF
3. Enable flag for 10% traffic
4. Monitor for 48 hours
5. Enable for 100% traffic
6. Remove old code after 1 week

**Deliverable:** 3 routes using new architecture

**Risk:** Low (read-heavy routes, easy to rollback)

---

### Phase 4: Migrate Write Routes (Week 5-6)

**Goal:** Migrate critical campaign execution routes

**Routes to Migrate:**

- [ ] `/api/campaigns/create`
- [ ] `/api/campaigns/[id]/control`
- [ ] `/api/campaigns/[id]/populate`
- [ ] `/api/campaigns/[id]/execute-batch` (CRITICAL)

**Strategy:**

1. Add comprehensive integration tests
2. Deploy with feature flag
3. Test in staging with real data
4. Enable flag for 1 campaign
5. Monitor for 24 hours
6. Gradual rollout

**Deliverable:** All campaign routes using new architecture

**Risk:** Medium (write operations, high traffic)

---

### Phase 5: Migrate Auth Routes (Week 7)

**Goal:** Migrate authentication and session management

**Routes to Migrate:**

- [ ] `/api/whatsapp-admin-auth/login`
- [ ] `/api/whatsapp-admin-auth/logout`
- [ ] `/api/whatsapp-admin-auth/check`
- [ ] `/api/email-admin-auth/*`

**Deliverable:** All auth routes using new architecture

**Risk:** Medium (affects all authenticated requests)

---

### Phase 6: Cleanup (Week 8)

**Goal:** Remove old code and finalize architecture

**Tasks:**

- [ ] Remove feature flags
- [ ] Delete old direct DB access code
- [ ] Update all documentation
- [ ] Add architecture decision records (ADRs)
- [ ] Create developer onboarding guide
- [ ] Add runbook for common operations

**Deliverable:** Clean, well-documented codebase

**Risk:** Low (old code already unused)

---

### Phase 7: Enhancements (Week 9+)

**Goal:** Add nice-to-have improvements

**Tasks:**

- [ ] Add structured logging (pino)
- [ ] Add request tracing
- [ ] Add monitoring dashboards
- [ ] Add CloudWatch alarms
- [ ] Implement SQS-based job queue
- [ ] Add request caching
- [ ] Add comprehensive API documentation (OpenAPI)

**Deliverable:** Production-ready platform

---

## 11. File Modification Checklist

### Files That Need Modification

#### High Priority (Required for Refactor)

**Create New Files:**

```
src/lib/repositories/
├── index.ts                    # NEW
├── types.ts                    # NEW
├── adminRepository.ts          # NEW
├── sessionRepository.ts        # NEW
├── campaignRepository.ts       # NEW
├── recipientRepository.ts      # NEW
└── metricsRepository.ts        # NEW

src/services/
├── index.ts                    # NEW
├── adminService.ts             # NEW
├── sessionService.ts           # NEW
├── campaignService.ts          # NEW
├── recipientService.ts         # NEW
├── whatsappService.ts          # NEW
└── analyticsService.ts         # NEW

src/types/
├── index.ts                    # NEW
├── admin.ts                    # NEW
├── session.ts                  # NEW
├── campaign.ts                 # NEW
├── recipient.ts                # NEW
├── metrics.ts                  # NEW
└── whatsapp.ts                 # NEW
```

**Update Existing Files:**

```
src/app/api/campaigns/
├── create/route.ts             # MODIFY (use campaignService)
├── list/route.ts               # MODIFY (use campaignService)
├── dispatch/route.ts           # MODIFY (use campaignService)
├── [id]/route.ts               # MODIFY (use campaignService)
├── [id]/control/route.ts       # MODIFY (use campaignService)
├── [id]/populate/route.ts      # MODIFY (use recipientService)
├── [id]/execute-batch/route.ts # MODIFY (use whatsappService)
├── [id]/analytics/route.ts     # MODIFY (use analyticsService)
├── [id]/logs/route.ts          # MODIFY (use campaignService)
└── [id]/retry-failed/route.ts  # MODIFY (use recipientService)

src/app/api/whatsapp-admin-auth/
├── login/route.ts              # MODIFY (use adminService + sessionService)
├── logout/route.ts             # MODIFY (use sessionService)
└── check/route.ts              # MODIFY (use sessionService)

src/app/api/whatsapp-admin/
├── settings/route.ts           # MODIFY (use whatsappService)
└── send-template/route.ts      # MODIFY (use whatsappService)

src/lib/adminAuth.ts            # MODIFY (use sessionService)
src/lib/whatsapp/campaignDispatcher.ts # MODIFY (use campaignService)
src/lib/whatsapp/webhookStatusHandler.ts # MODIFY (use analyticsService)
```

### Estimated Impact

| Category        | Files to Create | Files to Modify | Lines of Code      |
| --------------- | --------------- | --------------- | ------------------ |
| Repositories    | 7               | 0               | ~1,500             |
| Services        | 7               | 0               | ~2,000             |
| Types           | 7               | 0               | ~800               |
| API Routes      | 0               | 25              | ~5,000 (reduction) |
| Documentation   | 5               | 10              | ~3,000             |
| Tests           | 30+             | 0               | ~4,000             |
| **Total** | **56**    | **35**    | **~16,300**  |

**Net Effect:**

- Code reduction: ~30% (due to removing duplication)
- Test coverage: +40% (new unit tests)
- Maintainability: Significantly improved

---

## 12. Conclusion

### Current State Summary

**Architecture:**

- ✅ Proven at 100k+ messages
- ⚠️ Scattered database access (30+ files)
- ⚠️ Minimal service layer
- ⚠️ No repository layer
- ✅ Good guard pattern for business rules

**Scalability:**

- ✅ Lambda handles concurrency well
- ✅ DynamoDB scales infinitely
- ✅ Message batching works
- ⚠️ Code coupling limits flexibility

### Proposed Architecture Benefits

**After Refactoring:**

1. **Testability:** 100% unit test coverage possible
2. **Maintainability:** Clear separation of concerns
3. **Scalability:** Easy to add new features
4. **Flexibility:** Can change databases without rewriting business logic
5. **Developer Experience:** Clear patterns, easy onboarding

### Success Metrics

**Goal:** Complete refactor without production incidents

**Metrics:**

- ✅ Zero production errors from refactor
- ✅ 90%+ code coverage for new code
- ✅ 50% reduction in API route complexity
- ✅ All routes migrated within 8 weeks
- ✅ Documentation updated

**Risk Mitigation:**

- Feature flags for gradual rollout
- Comprehensive test suite
- Monitoring and alerts
- Easy rollback plan

---

## Appendix A: Quick Reference

### Table Usage

| Table                 | Purpose                            | Access Pattern                     |
| --------------------- | ---------------------------------- | ---------------------------------- |
| `streefi_admins`    | Admin credentials                  | GetItem by email                   |
| `streefi_sessions`  | Session management                 | GetItem by session_id, TTL enabled |
| `whatsapp_conversations` | Templates, conversations, counters | Query by PK prefix                 |
| `streefi_campaigns` | Campaigns, recipients, metrics     | Query by PK/SK composite           |

### Service Responsibilities

| Service              | Responsibility             | Dependencies                       |
| -------------------- | -------------------------- | ---------------------------------- |
| `adminService`     | Admin CRUD, authentication | adminRepository, crypto            |
| `sessionService`   | Session lifecycle          | sessionRepository                  |
| `campaignService`  | Campaign orchestration     | campaignRepository, stateValidator |
| `recipientService` | Recipient management       | recipientRepository                |
| `whatsappService`  | Messaging operations       | messageService, guards             |
| `analyticsService` | Metrics aggregation        | metricsRepository                  |

### Guard Responsibilities

| Guard                       | Purpose                         | Enforcement         |
| --------------------------- | ------------------------------- | ------------------- |
| `dailyLimitGuard`         | Conversation limits (200/day)   | BEFORE sending      |
| `blockRateCircuitBreaker` | Quality protection (>5% blocks) | AFTER webhook       |
| `messageRateThrottle`     | Rate limiting (10-20 msg/sec)   | BEFORE API call     |
| `campaignStateValidator`  | State machine compliance        | BEFORE state change |

---

**Document End**

---

**Next Steps:**

1. Review this document with the team
2. Approve architecture approach
3. Begin Phase 1 implementation
4. Set up monitoring for refactor progress

**Questions?** Contact: [Your Team Lead]

**Last Updated:** March 8, 2026
**Version:** 1.0
**Status:** Ready for Review
