# Security Implementation Guide

This project implements enterprise-grade security features for the WhatsApp admin panel and overall application security.

## 🔐 Security Features Implemented

### 1. **Password Hashing** (PBKDF2)
- ✅ **No plaintext passwords** stored in environment variables
- ✅ **100,000 iterations** PBKDF2-SHA512 (OWASP recommended)
- ✅ **Timing-safe comparison** to prevent timing attacks
- ✅ **Random salts** for each password

### 2. **Security Headers** (Helmet-like)
All configured in [`next.config.ts`](../next.config.ts):
- ✅ **CSP (Content Security Policy)** - Prevents XSS and code injection
- ✅ **X-Frame-Options: DENY** - Prevents clickjacking
- ✅ **X-XSS-Protection** - Browser XSS filter
- ✅ **X-Content-Type-Options: nosniff** - Prevents MIME sniffing
- ✅ **Strict-Transport-Security (HSTS)** - Forces HTTPS
- ✅ **Referrer-Policy** - Controls referrer information
- ✅ **Permissions-Policy** - Restricts browser features
- ✅ **X-Powered-By removed** - Hides server information

### 3. **Secure Cookies**
WhatsApp admin authentication uses:
- ✅ **httpOnly** - Cannot be accessed via JavaScript
- ✅ **secure** - Only sent over HTTPS (production)
- ✅ **sameSite: strict** - Prevents CSRF attacks
- ✅ **24-hour expiry** - Limited session lifetime

### 4. **CSRF Protection**
Double-submit cookie pattern available in [`lib/csrf.ts`](../src/lib/csrf.ts):
- ✅ **Token generation** with crypto.randomBytes
- ✅ **Token validation** utilities
- ✅ **Hashed tokens** for server-side storage

---

## 📋 Setup Instructions

### Step 1: Generate Password Hash

Run the password hash generator script:

```bash
node scripts/generate-password-hash.js YourSecurePassword123!
```

**Output:**
```
✅ Hash generated successfully!

Add this to your .env.local file:

WA_ADMIN_PASSWORD_HASH="a3f2b8c1d4e5...long-hash-here"
```

### Step 2: Update Environment Variables

Add to your `.env.local` file:

```env
# WhatsApp Admin - Hashed Password
WA_ADMIN_PASSWORD_HASH="<paste-generated-hash-here>"
```

**⚠️ Security Notes:**
- Never commit `.env.local` to Git
- Use different passwords for dev/staging/production
- Keep the hash secret (treat like a password)

### Step 3: Verify Configuration

The admin auth route automatically uses hashed passwords. No code changes needed!

---

## 🧪 Testing Security

### Test Password Hashing
```bash
# In your terminal or a test file
node -e "const { hashPassword, verifyPassword } = require('./src/lib/crypto.ts'); const hash = hashPassword('test123'); console.log('Hash:', hash); console.log('Valid:', verifyPassword('test123', hash)); console.log('Invalid:', verifyPassword('wrong', hash));"
```

### Test CSRF Tokens
```typescript
import { createCSRFToken, validateCSRFToken } from '@/lib/csrf';

const { token } = createCSRFToken();
console.log('Valid:', validateCSRFToken(token, token)); // true
console.log('Invalid:', validateCSRFToken(token, 'fake')); // false
```

---

## 📁 File Structure

```
src/
├── lib/
│   ├── crypto.ts           # Password hashing & token utilities
│   └── csrf.ts             # CSRF protection utilities
├── app/api/
│   └── whatsapp-admin-auth/
│       └── route.ts        # Admin auth with secure hashing
└── middleware.ts           # (Optional) Route protection middleware

scripts/
└── generate-password-hash.js   # Password hash generator

next.config.ts              # Security headers configuration
```

---

## 🔄 Migration Guide

### From Plaintext Password

**Before (insecure):**
```env
WA_ADMIN_PASSWORD="mypassword123"
```

**After (secure):**
```env
WA_ADMIN_PASSWORD_HASH="a3f2b8c1d4e5f6...long-hash"
```

**Steps:**
1. Generate hash: `node scripts/generate-password-hash.js mypassword123`
2. Update `.env.local` with `WA_ADMIN_PASSWORD_HASH`
3. Remove old `WA_ADMIN_PASSWORD` variable
4. Test login works

---

## 🛡️ Security Best Practices

### ✅ DO
- Use strong passwords (12+ chars, mixed case, numbers, symbols)
- Rotate passwords every 90 days
- Use different passwords per environment
- Enable HTTPS in production
- Monitor failed login attempts
- Keep dependencies updated

### ❌ DON'T
- Store plaintext passwords
- Commit `.env.local` files
- Share passwords via email/chat
- Use same password for dev/prod
- Disable security headers
- Use short/simple passwords

---

## 🚀 Production Checklist

Before deploying to production:

- [ ] Generate production password hash
- [ ] Set `WA_ADMIN_PASSWORD_HASH` in production env
- [ ] Verify HTTPS is enabled
- [ ] Test security headers are applied
- [ ] Confirm cookies have `secure: true`
- [ ] Review CSP policy (add new domains if needed)
- [ ] Test admin login works
- [ ] Remove any debug logs
- [ ] Configure rate limiting (if needed)

---

## 📚 API Reference

### Password Hashing

```typescript
import { hashPassword, verifyPassword } from '@/lib/crypto';

// Generate hash (one-time, for env setup)
const hash = hashPassword('myPassword123');

// Verify password (in your API routes)
const isValid = verifyPassword(userInput, storedHash);
```

### CSRF Protection

```typescript
import { createCSRFToken, validateCSRFToken } from '@/lib/csrf';

// Generate token (send with form/cookie)
const { token, hash } = createCSRFToken();

// Validate token (in POST/PUT/DELETE endpoints)
const isValid = validateCSRFToken(cookieToken, headerToken);
```

### Token Generation

```typescript
import { generateSessionToken, hashToken } from '@/lib/crypto';

// Session tokens
const sessionId = generateSessionToken();

// Hash for storage
const hashedToken = hashToken(sessionId);
```

---

## 🆘 Troubleshooting

### "Invalid password" even with correct password
- Verify hash was generated correctly
- Check environment variable is set
- Ensure no extra spaces in `.env.local`
- Try regenerating the hash

### Headers not appearing in browser
- Check Next.js config syntax
- Verify deployment supports custom headers
- Test in production (some headers only work over HTTPS)

### CSRF validation failing
- Ensure cookie is set before validation
- Check SameSite settings
- Verify token matches exactly

---

## 📖 Additional Resources

- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [MDN Security Headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)

---

**Last Updated:** February 2026  
**Security Level:** Enterprise-grade  
**Compliance:** OWASP Top 10 compliant
