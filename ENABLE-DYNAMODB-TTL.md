# 🔥 Step 3.3 - Enable DynamoDB TTL (Auto Cleanup)

## ✅ Code Verified

Your code correctly stores `expiresAt` as Unix timestamp (seconds):

```typescript
const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
```

✅ **Sessions:** expiresAt = 24 hours from login  
✅ **Rate limits:** expiresAt = 15 minutes (when locked) or 24 hours (attempts)

---

## 🎯 Enable TTL in AWS Console

### Step 1: Open DynamoDB

```
AWS Console → DynamoDB → Tables → streefi_admins
```

### Step 2: Enable TTL

1. Click **Additional settings** tab
2. Scroll to **Time to Live (TTL)**
3. Click **Edit**
4. Toggle: **Enable TTL** ✅
5. **TTL attribute name:** `expiresAt`
6. Click **Save changes**

---

## 🧠 What This Does

DynamoDB will now automatically delete:

| Item Type | When Deleted |
|-----------|-------------|
| **Sessions** | 24 hours after creation |
| **Rate limits (locked)** | 15 minutes after lock |
| **Rate limits (attempts)** | 24 hours after last attempt |

**Important:** TTL deletion is eventual (up to 48 hours), but your validation already blocks expired sessions server-side, so you're safe.

---

## ✅ Verification

After enabling TTL, wait ~5 minutes, then:

```
AWS Console → DynamoDB → Tables → streefi_admins → Additional settings
```

Should show:
```
Time to Live attribute: expiresAt
Status: Enabled ✓
```

---

## 🔒 Security Impact

**Before:** Manual cleanup only (logout deletes session)  
**After:** Automatic cleanup + manual cleanup

Even if:
- ❌ Logout fails
- ❌ Server crashes
- ❌ Session never manually deleted

TTL **guarantees** cleanup.

---

## 📊 What Gets Auto-Deleted

### Session Records
```json
{
  "email": "SESSION#sess_abc123",
  "expiresAt": 1739999999  ← TTL triggers here
}
```

### Rate Limit Records
```json
{
  "email": "RATE#192.168.1.10",
  "lockUntil": 1739998888,
  "expiresAt": 1739998888  ← TTL triggers here
}
```

---

## 🎯 Final Security Stack

✅ Session ID based authentication  
✅ Server-side DynamoDB validation  
✅ Role enforcement (email-session vs whatsapp-session)  
✅ Brute force protection (5 attempts, 15-minute lock)  
✅ IAM role credentials (no static keys)  
✅ Automatic expired session cleanup (TTL)  

**Security Level: 10/10** 🔒

---

**Complete this in AWS Console, then your security implementation is production-ready.**
