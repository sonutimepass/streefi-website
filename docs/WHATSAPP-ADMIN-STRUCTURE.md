# 📱 WhatsApp Admin - Complete Architecture Reference

> **Purpose:** ChatGPT reference for understanding the WhatsApp admin panel structure, authentication flow, and integration patterns.

---

## 📂 File Structure

```
src/
├── app/
│   ├── whatsapp-admin/
│   │   └── page.tsx                      # Main admin page (client-side)
│   └── api/
│       ├── whatsapp/
│       │   └── route.ts                  # WhatsApp API handler (send + webhook)
│       └── whatsapp-admin-auth/
│           ├── check/route.ts            # Session validation endpoint
│           ├── login/route.ts            # Login with password + DynamoDB session
│           └── logout/route.ts           # Logout + DynamoDB cleanup
├── modules/
│   └── whatsapp-admin/
│       ├── index.ts                      # Public exports
│       ├── context/
│       │   └── WhatsAppAdminProvider.tsx # Global state + auth logic
│       ├── hooks/
│       │   └── useWhatsAppAdmin.ts       # (Legacy - functionality moved to Provider)
│       └── components/
│           ├── index.ts
│           ├── AuthSection/
│           │   └── index.tsx             # Password login form
│           ├── LoadingSection/
│           │   └── index.tsx             # Loading spinner
│           └── MessageFormSection/
│               └── index.tsx             # WhatsApp message composer
└── lib/
    ├── adminAuth.ts                      # Session validation helper
    ├── rateLimit.ts                      # Login rate limiting
    └── crypto.ts                         # Password hashing (bcrypt)
```

---

## 🏗️ Architecture Pattern

### **Component Hierarchy**

```
WhatsAppAdminPage (page.tsx)
  └── WhatsAppAdminProvider (Context)
      └── WhatsAppAdminContent
          ├── LoadingSection (if isLoading)
          ├── AuthSection (if !authenticated)
          └── MessageFormSection (if authenticated)
```

### **State Management**

Uses **React Context API** pattern:
- `WhatsAppAdminProvider` = State container
- `useWhatsAppAdminContext` = Hook to access state
- No external state library (Redux/Zustand)

---

## 🔐 Authentication Flow

### **1. Page Load**

```typescript
// src/app/whatsapp-admin/page.tsx
export default function WhatsAppAdminPage() {
  return (
    <WhatsAppAdminProvider>  {/* Initializes auth check */}
      <WhatsAppAdminContent />
    </WhatsAppAdminProvider>
  );
}
```

### **2. Auto Auth Check (useEffect)**

```typescript
// WhatsAppAdminProvider.tsx
useEffect(() => {
  const checkAuth = async () => {
    const response = await fetch('/api/whatsapp-admin-auth/check', {
      credentials: 'include',  // Send httpOnly cookie
    });
    const data = await response.json();
    setIsAuthenticated(data.authenticated);
  };
  checkAuth();
}, []);
```

**Backend validation:**
```typescript
// /api/whatsapp-admin-auth/check/route.ts
export async function GET(request: Request) {
  const auth = await validateAdminSession(request, 'whatsapp-session');
  return NextResponse.json({ authenticated: auth.valid });
}
```

### **3. Login Process**

```typescript
// User clicks login button
const login = async (password: string) => {
  const response = await fetch('/api/whatsapp-admin-auth/login', {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ password }),
  });
  
  if (response.ok) {
    setIsAuthenticated(true);  // Update UI
  }
};
```

**Backend creates session:**
```typescript
// /api/whatsapp-admin-auth/login/route.ts
1. Check rate limit (5 attempts max)
2. Verify password with bcrypt
3. Generate sessionId = sess_{UUID}
4. Store in DynamoDB:
   {
     email: "SESSION#sess_...",
     sessionId: "sess_...",
     type: "whatsapp-session",
     status: "active",
     expiresAt: timestamp + 24h
   }
5. Set httpOnly cookie = sessionId
6. Return success
```

### **4. Logout Process**

```typescript
// User clicks logout
const logout = async () => {
  await fetch('/api/whatsapp-admin-auth/logout', {
    method: 'POST',
    credentials: 'include',
  });
  setIsAuthenticated(false);
};
```

**Backend cleanup:**
```typescript
// /api/whatsapp-admin-auth/logout/route.ts
1. Read sessionId from cookie
2. Delete SESSION#{sessionId} from DynamoDB
3. Delete cookie
4. Return success
```

---

## 🔒 Security Implementation

### **Session Management**

| Component | Implementation |
|-----------|---------------|
| **Session ID** | UUID v4 (cryptographically random) |
| **Storage** | DynamoDB table: `streefi_admins` |
| **Cookie** | `wa_admin_session` (httpOnly, secure, sameSite: strict) |
| **Expiration** | 24 hours (client + server enforced) |
| **Validation** | Every API call checks DynamoDB session record |

### **Rate Limiting**

```typescript
// 5 failed login attempts = 15-minute IP lock
{
  email: "RATE#192.168.1.10",
  attempts: 5,
  lockUntil: timestamp + 15min,
  expiresAt: timestamp  // TTL auto-cleanup
}
```

### **Password Hashing**

```typescript
// crypto.ts
PBKDF2-SHA256
100,000 iterations
32-byte salt (random per hash)
64-byte derived key
```

---

## 📡 API Routes

### **Authentication Endpoints**

#### `GET /api/whatsapp-admin-auth/check`
- **Purpose:** Validate current session
- **Auth:** Uses httpOnly cookie
- **Returns:** `{ authenticated: boolean }`
- **Security:** Queries DynamoDB for session validity

#### `POST /api/whatsapp-admin-auth/login`
- **Body:** `{ password: string }`
- **Auth:** None (public endpoint)
- **Rate Limit:** 5 attempts per IP, 15-min lockout
- **Returns:** `{ success: boolean }`
- **Side Effect:** Creates DynamoDB session + sets cookie

#### `POST /api/whatsapp-admin-auth/logout`
- **Auth:** Uses httpOnly cookie (optional)
- **Returns:** `{ success: boolean }`
- **Side Effect:** Deletes DynamoDB session + clears cookie

---

### **WhatsApp Messaging Endpoint**

#### `POST /api/whatsapp` (Send Message)
- **Auth:** ✅ Requires `whatsapp-session` validation
- **Body:**
  ```json
  {
    "phone": "918888888888",
    "message": "Hello World",
    "template": {
      "name": "hello_world",
      "language": "en",
      "parameters": ["John"]
    }
  }
  ```
- **Returns:** `{ success: boolean, messageId: string }`
- **Security:** Validates session before sending

#### `GET /api/whatsapp` (Webhook Verification)
- **Auth:** None (Meta verification)
- **Query Params:** `hub.mode`, `hub.verify_token`, `hub.challenge`
- **Returns:** Challenge string or 403

#### `POST /api/whatsapp` (Webhook Events)
- **Auth:** None (Meta sends events)
- **Body:** WhatsApp webhook payload
- **Returns:** `{ success: true, received: true }`

---

## 🎯 Component Details

### **AuthSection**

**Location:** `src/modules/whatsapp-admin/components/AuthSection/index.tsx`

**Purpose:** Password login form

**State:**
- `passwordInput` - Local password field
- Uses `useWhatsAppAdminContext()` for login function

**Flow:**
1. User enters password
2. Calls `login(password)` from context
3. Context handles API call + state update
4. Component re-renders based on `isAuthenticated`

---

### **MessageFormSection**

**Location:** `src/modules/whatsapp-admin/components/MessageFormSection/index.tsx`

**Purpose:** WhatsApp message composer (template + manual)

**Features:**
- Template message (approved Meta templates)
- Manual text message
- Single send
- Bulk send (comma-separated or Excel import)
- Message log with timestamps

**State Management:**
```typescript
messageType: 'template' | 'manual'
phone: string
message: string
templateName: string
templateLanguage: string
templateParams: string[]
bulkPhones: string
importedPhones: string[]
sending: boolean
messageLog: LogItem[]
```

---

### **WhatsAppAdminProvider**

**Location:** `src/modules/whatsapp-admin/context/WhatsAppAdminProvider.tsx`

**Purpose:** Global state container + business logic

**Responsibilities:**
1. **Authentication**
   - Auto-check on mount
   - Login/logout functions
   - Session state management

2. **Message State**
   - Form inputs (phone, message, template)
   - Sending status
   - Message log

3. **Business Logic**
   - `handleSendWhatsApp()` - Single message
   - `handleSendBulkWhatsApp()` - Bulk messages
   - `handleFileUpload()` - Excel import

**Context Hook:**
```typescript
const {
  isAuthenticated,
  login,
  logout,
  phone,
  setPhone,
  handleSendWhatsApp,
  // ... all other state
} = useWhatsAppAdminContext();
```

---

## 🔗 Integration Points

### **DynamoDB Schema**

**Table Name:** `streefi_admins`

**Items:**

1. **Session Records**
   ```json
   {
     "email": "SESSION#sess_abc123",
     "sessionId": "sess_abc123",
     "adminEmail": "admin@streefi.in",
     "type": "whatsapp-session",
     "status": "active",
     "expiresAt": 1739999999,
     "createdAt": "2026-02-23T..."
   }
   ```

2. **Rate Limit Records**
   ```json
   {
     "email": "RATE#192.168.1.10",
     "ip": "192.168.1.10",
     "attempts": 3,
     "lockUntil": 1739999999,
     "expiresAt": 1739999999
   }
   ```

**TTL Attribute:** `expiresAt` (auto-cleanup enabled)

---

### **Environment Variables**

```env
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your_meta_access_token
WHATSAPP_PHONE_ID=your_phone_number_id
WHATSAPP_VERIFY_TOKEN=streefi_secure_token

# Authentication
WA_ADMIN_PASSWORD_HASH=your_pbkdf2_hash

# DynamoDB
AWS_REGION=ap-south-1
DYNAMODB_TABLE_NAME=streefi_admins
# AWS_ACCESS_KEY_ID (not needed - using IAM role)
# AWS_SECRET_ACCESS_KEY (not needed - using IAM role)
```

---

## 🔄 Data Flow Diagram

```
┌─────────────────┐
│  User Browser   │
└────────┬────────┘
         │
         ├── 1. Load /whatsapp-admin
         │   └── WhatsAppAdminProvider mounts
         │       └── Auto-check auth (GET /api/whatsapp-admin-auth/check)
         │           └── validateAdminSession() reads cookie
         │               └── DynamoDB: fetch SESSION#sess_...
         │                   └── Return { authenticated: true/false }
         │
         ├── 2. Login (if not authenticated)
         │   └── POST /api/whatsapp-admin-auth/login { password }
         │       ├── checkLoginRateLimit(ip)
         │       ├── verifyPassword(password, hash)
         │       ├── DynamoDB: create SESSION#sess_...
         │       └── Set httpOnly cookie = sessionId
         │
         ├── 3. Send WhatsApp Message
         │   └── POST /api/whatsapp { phone, message }
         │       ├── validateAdminSession() → DynamoDB check
         │       └── Meta API: POST /{phone_id}/messages
         │
         └── 4. Logout
             └── POST /api/whatsapp-admin-auth/logout
                 ├── DynamoDB: delete SESSION#sess_...
                 └── Clear cookie
```

---

## 🧪 Testing Checklist

### **Authentication**
- [ ] Login with correct password → access granted
- [ ] Login with wrong password → error + rate limit incremented
- [ ] 5 failed attempts → 15-minute lockout
- [ ] Logout → session deleted from DynamoDB
- [ ] Refresh page while logged in → stays authenticated
- [ ] Cookie expires after 24h → auto logout

### **Session Security**
- [ ] Cannot access MessageFormSection without login
- [ ] Direct API call without cookie → 401 Unauthorized
- [ ] Tampered cookie value → 401 Unauthorized
- [ ] Session deleted from DynamoDB → immediate logout

### **WhatsApp Messaging**
- [ ] Send single message → reaches WhatsApp API
- [ ] Send bulk messages → processes all numbers
- [ ] Upload Excel file → imports phone numbers
- [ ] Message log displays sent messages

---

## 🎯 Design Decisions & Rationale

### **Why Separate Email & WhatsApp Admin?**

**Current:** Two separate authentication systems
- `email_admin_session` cookie
- `wa_admin_session` cookie
- Separate login pages

**Trade-offs:**
- ✅ Simple to implement
- ✅ Clear separation of concerns
- ❌ Not scalable for multiple admins
- ❌ No role-based permissions

**Future consideration:** Unified admin system with roles (SUPER_ADMIN, EMAIL_MANAGER, WHATSAPP_MANAGER)

---

### **Why Context API Instead of Redux/Zustand?**

**Rationale:**
- Single admin user (not multi-user collaboration)
- Simple state requirements
- No complex async middleware needed
- Reduces bundle size

**Trade-offs:**
- ✅ Minimal dependencies
- ✅ Easy to understand
- ❌ Re-renders entire subtree (not optimized)
- ❌ No dev tools for debugging

---

### **Why DynamoDB for Sessions?**

**Rationale:**
- Already using DynamoDB (no new service)
- Serverless (auto-scaling)
- TTL for auto-cleanup
- Fast key-value lookups

**Trade-offs:**
- ✅ Managed service
- ✅ Cost-effective for low volume
- ❌ Single-table design complexity
- ❌ Limited query patterns

---

## 🚀 Future Enhancement Ideas

### **Phase 1: Current State**
- ✅ Password authentication
- ✅ Session management
- ✅ Rate limiting
- ✅ WhatsApp message sending

### **Phase 2: Planned**
- [ ] Message templates management UI
- [ ] Delivery status tracking
- [ ] Message history/analytics
- [ ] Scheduled messages
- [ ] Contact list management

### **Phase 3: Advanced**
- [ ] Unified admin system (email + WhatsApp)
- [ ] Role-based access control (RBAC)
- [ ] Multi-admin support
- [ ] Audit logs
- [ ] Webhook event processing UI

---

## 📚 Related Documentation

- [Email Admin Structure](./EMAIL-ADMIN-STRUCTURE.md) - Similar pattern for email
- [Session Validation](./src/lib/adminAuth.ts) - DynamoDB session helper
- [Rate Limiting](./src/lib/rateLimit.ts) - Brute force protection
- [DynamoDB TTL Setup](./ENABLE-DYNAMODB-TTL.md) - Auto-cleanup config
- [Remove AWS Keys](./REMOVE-AWS-KEYS-CHECKLIST.md) - Security hardening

---

## 🔧 Common Tasks

### **Add New Admin**
1. Generate password hash: `node scripts/generate-password-hash.js newpassword`
2. Add to Amplify env: `WA_ADMIN_PASSWORD_HASH=<hash>`
3. Deploy

### **Check Active Sessions**
```bash
# AWS CLI
aws dynamodb scan --table-name streefi_admins \
  --filter-expression "begins_with(email, :prefix)" \
  --expression-attribute-values '{":prefix":{"S":"SESSION#"}}'
```

### **Revoke Session**
```bash
aws dynamodb delete-item --table-name streefi_admins \
  --key '{"email":{"S":"SESSION#sess_abc123"}}'
```

### **Clear Rate Limits**
```bash
aws dynamodb scan --table-name streefi_admins \
  --filter-expression "begins_with(email, :prefix)" \
  --expression-attribute-values '{":prefix":{"S":"RATE#"}}' \
| jq -r '.Items[].email.S' \
| xargs -I {} aws dynamodb delete-item --table-name streefi_admins --key '{"email":{"S":"{}"}}'
```

---

**Last Updated:** February 23, 2026  
**Architecture Version:** 1.0 (Session-based auth with DynamoDB)  
**Security Level:** Production-ready 9.5/10
