# 📧 Email Admin Dashboard - Setup Guide

## ✅ What's Complete

Your **production-ready email admin dashboard** is now live at `/email-admin`!

**Features:**
- 🔐 Secure password-protected admin panel
- 📨 Single email sender
- 📬 Bulk email sender (with CSV/Excel import)
- 📊 Real-time email log with success/failure tracking
- ⚡ Zoho Mail API integration
- 🔄 Automatic access token refresh

---

## 🚀 Production Setup (Required)

### Step 1: Environment Variables

Add these to your `.env.local` (development) and production environment:

```env
# Zoho Mail Credentials
ZOHO_CLIENT_ID=your_zoho_client_id
ZOHO_CLIENT_SECRET=your_zoho_client_secret
ZOHO_REFRESH_TOKEN=your_zoho_refresh_token
FROM_EMAIL=support@streefi.in

# Email Admin Authentication
EMAIL_ADMIN_PASSWORD_HASH=your_hashed_password_here
```

### Step 2: Generate Admin Password Hash

Run this command to generate secure password hash:

```bash
node scripts/generate-password-hash.js your-secure-password
```

Copy the generated hash and add it to `EMAIL_ADMIN_PASSWORD_HASH` in your environment variables.

---

## 📍 Access the Dashboard

### Development
```
http://localhost:3000/email-admin
```

### Production
```
https://streefi.in/email-admin
```

---

## 🎯 How to Use

### Single Email Sender

1. Log in with admin password
2. Click "Single Email" tab
3. Enter:
   - Recipient email
   - Subject
   - Message
4. Click "Send Email"
5. See real-time status and logs

### Bulk Email Sender

1. Click "Bulk Email" tab
2. **Option A:** Upload CSV/Excel file with email addresses
3. **Option B:** Paste emails (one per line)
4. Enter subject and message
5. Click "Send Bulk Emails"
6. Monitor progress and see detailed logs

---

## 📊 CSV/Excel Format

Your CSV/Excel file should contain email addresses. Examples:

**Simple format:**
```csv
email1@example.com
email2@example.com
email3@example.com
```

**With headers:**
```csv
Name,Email
John Doe,john@example.com
Jane Smith,jane@example.com
```

The system automatically extracts valid email addresses from any format.

---

## 🔒 Security Features

- ✅ Password-protected admin panel
- ✅ Secure bcrypt password hashing
- ✅ HTTP-only session cookies
- ✅ CSRF protection
- ✅ Environment variable protection
- ✅ No credentials in frontend
- ✅ Automatic session timeout (24 hours)

---

## 🎨 Features Comparison

| Feature | WhatsApp Admin | Email Admin |
|---------|---------------|-------------|
| Single Message | ✅ | ✅ |
| Bulk Messages | ✅ | ✅ |
| CSV Import | ✅ | ✅ |
| Message Log | ✅ | ✅ |
| Status Tracking | ✅ | ✅ |
| Secure Auth | ✅ | ✅ |

---

## 🎯 Use Cases for Streefi

### Vendor Communication
- Onboarding confirmation emails
- Payment notifications
- Order updates
- Monthly newsletters

### Customer Engagement
- Booking confirmations
- Service reminders
- Promotional campaigns
- Feedback requests

### Admin Alerts
- System notifications
- Error reports
- Daily summaries
- Performance metrics

---

## 🔧 API Endpoints

### Authentication
- `POST /api/email-admin-auth/login` - Admin login
- `GET /api/email-admin-auth/check` - Check auth status
- `POST /api/email-admin-auth/logout` - Logout

### Email Sending
- `POST /api/email` - Send single or bulk emails

**Request format:**
```json
{
  "to": "user@example.com",
  "subject": "Welcome to Streefi",
  "message": "Your email content here"
}
```

**Bulk request format:**
```json
{
  "to": ["email1@example.com", "email2@example.com"],
  "subject": "Bulk Email Subject",
  "message": "Your email content here"
}
```

---

## ⚠️ Important Notes

1. **Rate Limits:** Zoho has rate limits. For large campaigns, consider batching.
2. **Email Validation:** System validates email format before sending.
3. **Error Handling:** Failed emails are logged with error messages.
4. **Session Duration:** Admin session expires after 24 hours.
5. **Password Security:** Never share admin password or commit it to git.

---

## 🚀 Next Steps (Optional Enhancements)

### 1. Email Templates
Create pre-defined templates for common use cases:
- Welcome emails
- Order confirmations
- Payment receipts
- Promotional campaigns

### 2. Scheduling
Add ability to schedule emails for specific times:
- Campaign scheduling
- Time-zone targeting
- Automated follow-ups

### 3. Analytics
Track email performance:
- Open rates (requires tracking pixels)
- Click rates
- Delivery rates
- Bounce tracking

### 4. Advanced Filtering
Filter recipients by:
- Vendor category
- Location
- Activity status
- Custom criteria

### 5. Email Database Logging
Store sent emails in MongoDB:
- Full history
- Search capability
- Re-send functionality
- Template library

---

## 📚 Technical Architecture

```
┌─────────────────┐
│  Email Admin    │
│  Dashboard      │
│  (Next.js)      │
└────────┬────────┘
         │
    ┌────▼─────┐
    │ Auth API │
    │ (Secure) │
    └────┬─────┘
         │
    ┌────▼─────┐
    │ Email API│
    │  Route   │
    └────┬─────┘
         │
    ┌────▼─────────┐
    │ Token Refresh│ 
    │   (Auto)     │
    └────┬─────────┘
         │
    ┌────▼────────┐
    │  Zoho Mail  │
    │     API     │
    └─────────────┘
```

---

## 🎉 You're All Set!

Your email admin dashboard is production-ready and secure. 

**Access it at:** [/email-admin](/email-admin)

**First-time setup:**
1. Generate password hash
2. Set environment variables
3. Log in with admin password
4. Start sending emails! 🔥

---

Made with ❤️ for Streefi
