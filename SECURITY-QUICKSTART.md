# 🔐 Security Quick Reference

## Generate Password Hash

```bash
npm run generate-hash YourPassword123!
```

Copy the output to `.env.local`:
```env
WA_ADMIN_PASSWORD_HASH="<generated-hash>"
```

---

## What Was Implemented

### ✅ Security Headers (next.config.ts)
- CSP - Content Security Policy
- X-Frame-Options: DENY
- X-XSS-Protection
- X-Content-Type-Options
- HSTS (HTTPS enforcement)
- Referrer-Policy
- Permissions-Policy

### ✅ Password Hashing (lib/crypto.ts)
- PBKDF2-SHA512 with 100k iterations
- Random salts
- Timing-safe comparison
- No plaintext passwords

### ✅ CSRF Protection (lib/csrf.ts)
- Double-submit cookie pattern
- Token generation utilities
- Secure token validation

### ✅ Secure Cookies (whatsapp-admin-auth)
- httpOnly (no JS access)
- secure (HTTPS only in prod)
- sameSite: strict (CSRF prevention)
- 24-hour expiry

---

## File Changes

```
✅ Created: src/lib/crypto.ts              (Password hashing)
✅ Created: src/lib/csrf.ts                (CSRF protection)
✅ Created: scripts/generate-password-hash.js
✅ Created: docs/SECURITY.md               (Full documentation)
✅ Updated: next.config.ts                 (X-Frame-Options: DENY)
✅ Updated: api/whatsapp-admin-auth/route.ts (Secure hashing)
✅ Updated: package.json                   (generate-hash script)
```

---

## Next Steps

1. **Generate your password hash:**
   ```bash
   npm run generate-hash YourSecurePassword123!
   ```

2. **Add to .env.local:**
   ```env
   WA_ADMIN_PASSWORD_HASH="<paste-hash-here>"
   ```

3. **Test admin login** - Should work the same but more secure!

4. **Remove old variable** (if exists):
   ```env
   # Delete this line:
   WA_ADMIN_PASSWORD="plaintext" ❌
   ```

---

## Security Checklist

- [ ] Password hash generated
- [ ] `.env.local` updated with `WA_ADMIN_PASSWORD_HASH`
- [ ] Old plaintext password removed
- [ ] Admin login tested
- [ ] `.env.local` in `.gitignore` ✓
- [ ] Different passwords for dev/prod
- [ ] Strong password (12+ chars) used

---

## Important Notes

⚠️ **Never commit `.env.local`** - Already in .gitignore  
⚠️ **Treat hash like password** - Keep it secret  
⚠️ **Use HTTPS in production** - Required for secure cookies  
✅ **All changes backward compatible** - Old setup still works until you migrate  

---

For full documentation, see [docs/SECURITY.md](./SECURITY.md)
