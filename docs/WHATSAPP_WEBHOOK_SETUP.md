# WhatsApp Webhook Setup Guide

## Overview
Your WhatsApp API endpoint (`/api/whatsapp`) now implements secure webhook handling similar to Zomato's approach, with 403 Forbidden responses for unauthorized access.

## Security Features
✅ **403 Forbidden by default** - Any unauthorized GET request returns a 403 error (like Zomato)
✅ **Webhook verification** - Meta's webhook verification requests are properly handled
✅ **Webhook events processing** - Receives and logs incoming messages and status updates
✅ **Message sending** - Internal API for sending WhatsApp messages

## Environment Variables Required

Add these to your `.env.local` file:

```env
# WhatsApp Verification Token (for webhook verification)
WHATSAPP_VERIFY_TOKEN=your_secure_random_token_here

# WhatsApp Business API Credentials
WHATSAPP_ACCESS_TOKEN=your_meta_access_token
WHATSAPP_PHONE_ID=your_whatsapp_phone_number_id
```

## Meta Webhook Configuration

### Step 1: Set Up Webhook in Meta Developer Console
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Navigate to your WhatsApp Business App
3. Go to **WhatsApp > Configuration**
4. Click **Edit** in the Webhook section

### Step 2: Configure Webhook URL
- **Callback URL**: `https://yourdomain.com/api/whatsapp`
- **Verify Token**: Use the same value as `WHATSAPP_VERIFY_TOKEN` in your `.env.local`

### Step 3: Subscribe to Webhook Events
Subscribe to these events:
- ✅ `messages` - Incoming messages from users
- ✅ `message_status` - Message delivery status updates

### Step 4: Verify Webhook
Click **Verify and Save** - Meta will send a GET request to verify your endpoint.

## Endpoint Behavior

### GET Requests
- **Without parameters** → 403 Forbidden (security measure, like Zomato)
- **With Meta's verification parameters** → 200 OK with challenge response
- **With invalid token** → 403 Forbidden

### POST Requests
Handles two types of requests:

#### 1. Incoming Webhooks from Meta
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "value": {
            "messages": [
              {
                "from": "919876543210",
                "type": "text",
                "text": { "body": "Hello!" }
              }
            ]
          }
        }
      ]
    }
  ]
}
```
**Response**: `200 OK` with `{ "success": true, "received": true }`

#### 2. Send Message (Internal API)
```json
{
  "phone": "+919876543210",
  "message": "Hello from Streefi!"
}
```
**Response**: `200 OK` with message details

## Message Types Handled

The webhook automatically detects and logs these message types:
- 💬 **Text** - Plain text messages
- 🖼️ **Image** - Photos and images
- 📄 **Document** - PDF, DOCX, etc.
- 🎵 **Audio** - Voice messages and audio files
- 🎥 **Video** - Video files
- 📍 **Location** - GPS coordinates
- 👤 **Contacts** - Contact cards
- 🔘 **Interactive** - Button and list replies

## Testing

### Test 403 Forbidden Response
Open in browser: `https://yourdomain.com/api/whatsapp`

Expected response:
```html
<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">
<html><head>
<title>403 Forbidden</title>
</head><body>
<h1>Forbidden</h1>
<p>You don't have permission to access this resource.</p>
</body></html>
```

### Test Webhook Verification
```bash
curl "https://yourdomain.com/api/whatsapp?hub.mode=subscribe&hub.verify_token=your_token&hub.challenge=test123"
```

Expected response: `test123`

### Test Send Message
```bash
curl -X POST https://yourdomain.com/api/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "message": "Test message"
  }'
```

## Webhook Event Logs

When a message is received, you'll see logs like:
```
📨 Incoming WhatsApp webhook: { ... }
📩 Message received: { from: "919876543210", type: "text", ... }
💬 Text message: Hello!
```

For status updates:
```
📊 Message status update: { id: "wamid.xxx", status: "delivered", ... }
```

## Custom Message Handling

Add your custom logic in the webhook handler (line ~130 in route.ts):
```typescript
// TODO: Add your custom message handling logic here
// For example:
// - Save message to database
// - Send notification to admin
// - Auto-reply based on message content
// - Integrate with CRM system
```

## Security Best Practices

1. **Strong Verify Token**: Use a long, random string for `WHATSAPP_VERIFY_TOKEN`
2. **HTTPS Only**: Always use HTTPS in production
3. **Environment Variables**: Never commit tokens to version control
4. **Rate Limiting**: Consider adding rate limiting for the endpoint
5. **IP Whitelisting**: Optionally whitelist Meta's IP ranges

## Troubleshooting

### Issue: 403 Forbidden when testing
✅ This is expected! The endpoint is secured like Zomato's implementation.

### Issue: Webhook verification fails
- Check that `WHATSAPP_VERIFY_TOKEN` matches in both .env and Meta console
- Ensure your app is deployed and accessible via HTTPS
- Check server logs for verification attempts

### Issue: Not receiving webhooks
- Verify webhook subscription is active in Meta console
- Check that you're subscribed to the correct events
- Review server logs for incoming requests

## Learn More
- [Meta WhatsApp Business Platform Documentation](https://developers.facebook.com/docs/whatsapp)
- [Webhook Setup Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks)
