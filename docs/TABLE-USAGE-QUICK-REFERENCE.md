# DynamoDB Table Usage - Quick Reference

**Last Updated:** March 10, 2026  
**Status:** ✅ All tables properly configured

---

## 🎯 Active Tables (4)

### 1. **whatsapp_conversations**
```typescript
TABLES.WHATSAPP
env: DYNAMODB_TABLE_NAME=whatsapp_conversations
```
- **Purpose:** WhatsApp templates, platform settings, daily counters, kill switch
- **Repository:** `whatsappRepository.ts`
- **Keys:** PK (String), SK (String)
- **Patterns:**
  - `TEMPLATE#{id}` | `METADATA` → Templates
  - `SETTINGS` | `GLOBAL` → Platform config
  - `SYSTEM` | `KILL_SWITCH` → Emergency control
  - `DAILY_COUNTER` | `{date}` → Message counters

### 2. **streefi_admins**
```typescript
TABLES.ADMINS
env: ADMIN_TABLE_NAME=streefi_admins
```
- **Purpose:** Admin credentials & rate limiting
- **Repository:** `adminRepository.ts`
- **Keys:** email (String)
- **Size:** 586 bytes

### 3. **streefi_sessions**
```typescript
TABLES.SESSIONS
env: SESSION_TABLE_NAME=streefi_sessions
```
- **Purpose:** Multi-device session management with TTL
- **Repository:** `sessionRepository.ts`
- **Keys:** session_id (String)
- **Size:** 1.1 KB

### 4. **streefi_campaigns**
```typescript
TABLES.CAMPAIGNS
env: CAMPAIGNS_TABLE_NAME=streefi_campaigns
```
- **Purpose:** Campaign metadata + recipients (single-table design)
- **Repositories:** `campaignRepository.ts` + `recipientRepository.ts`
- **Keys:** PK (String), SK (String)
- **Patterns:**
  - `CAMPAIGN#{id}` | `METADATA` → Campaign config & metrics
  - `CAMPAIGN#{id}` | `RECIPIENT#{phone}` → Individual recipients

---

## 🟡 Reserved Tables (3)

### 5. **streefi_whatsapp** (Legacy)
```typescript
TABLES.WHATSAPP_LEGACY
env: WHATSAPP_LEGACY_TABLE_NAME=streefi_whatsapp
```
- **Status:** Not used in code
- **Size:** 143 bytes
- **Keep for:** Future migration/rollback or DELETE if not needed

### 6. **streefi_campaign_recipients** (Orphaned)
```typescript
TABLES.RECIPIENTS
env: RECIPIENTS_TABLE_NAME=streefi_campaign_recipients
```
- **Status:** NOT used - recipients stored in `streefi_campaigns` instead
- **Size:** 0 bytes
- **Note:** `recipientRepository` uses `CAMPAIGNS` table, not this one
- **Action:** DELETE or keep for future separate storage pattern

### 7. **streefi_campaign_contacts** (Future)
```typescript
TABLES.CONTACTS
env: CONTACTS_TABLE_NAME=streefi_campaign_contacts
```
- **Status:** Reserved for future contact upload feature
- **Size:** 0 bytes
- **Keys:** campaignId (String), phoneNumber (String)
- **Future use:** Pre-campaign contact validation

---

## 📊 Repository Mapping

| Repository | Table Used | Entities |
|-----------|-----------|----------|
| adminRepository | streefi_admins | Admin credentials |
| sessionRepository | streefi_sessions | Active sessions |
| whatsappRepository | whatsapp_conversations | Templates, settings |
| campaignRepository | streefi_campaigns | Campaign metadata |
| recipientRepository | streefi_campaigns | Recipients (PK/SK pattern) |

---

## ✅ No Overlaps Found

Each table serves a distinct purpose:
- ✅ `whatsapp_conversations` - WhatsApp business logic
- ✅ `streefi_admins` - Authentication
- ✅ `streefi_sessions` - Session management  
- ✅ `streefi_campaigns` - Campaign execution (both metadata + recipients)

---

## 🔧 Recent Fixes (March 10, 2026)

1. ✅ Fixed `recipientRepository.ts` default parameter
   - Changed from `TABLES.RECIPIENTS` → `TABLES.CAMPAIGNS`
   - Now matches actual usage

2. ✅ Updated `whatsappRepository.ts` comment
   - Changed from `streefi_whatsapp` → `whatsapp_conversations`
   - Added note about legacy table

3. ✅ Added all 7 tables to environment configuration
   - All tables now defined in `.env.local`
   - All tables mapped in `dynamoClient.ts`

---

## 📝 Environment Variables

```bash
# Active tables
DYNAMODB_TABLE_NAME=whatsapp_conversations
ADMIN_TABLE_NAME=streefi_admins
SESSION_TABLE_NAME=streefi_sessions
CAMPAIGNS_TABLE_NAME=streefi_campaigns

# Reserved tables
WHATSAPP_LEGACY_TABLE_NAME=streefi_whatsapp
RECIPIENTS_TABLE_NAME=streefi_campaign_recipients
CONTACTS_TABLE_NAME=streefi_campaign_contacts
```

---

## 🎯 Architecture Pattern

Your system uses **single-table design** for campaigns:

```
streefi_campaigns Table:
├── CAMPAIGN#123 | METADATA         ← Campaign config
├── CAMPAIGN#123 | RECIPIENT#+91... ← Recipient 1
├── CAMPAIGN#123 | RECIPIENT#+91... ← Recipient 2
└── CAMPAIGN#123 | RECIPIENT#+91... ← Recipient 3
```

**Benefits:**
- ✅ Efficient queries (one PK gets all campaign data)
- ✅ No cross-table joins
- ✅ Atomic operations within campaign scope
- ✅ DynamoDB best practice

---

For detailed analysis, see: [DYNAMODB-TABLE-ANALYSIS-2026.md](./DYNAMODB-TABLE-ANALYSIS-2026.md)
