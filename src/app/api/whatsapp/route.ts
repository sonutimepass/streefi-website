import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { validateAdminSession } from '@/lib/adminAuth';
import { handleMessageStatus, type WebhookStatus } from '@/lib/whatsapp/webhookStatusHandler';
import { whatsappRepository } from '@/lib/repositories/whatsappRepository';

export const dynamic = 'force-dynamic';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Verify the X-Hub-Signature-256 header sent by Meta on every webhook POST.
 * Returns true only when the HMAC-SHA256 of the raw body matches the header.
 */
function verifyWebhookSignature(rawBody: string, signature: string | null, appSecret: string): boolean {
  if (!signature) return false;
  const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
  // Use timing-safe comparison to prevent side-channel attacks
  try {
    return signature.length === expected.length &&
      timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

/**
 * GET - WhatsApp Webhook Verification
 * Security: Returns 403 Forbidden for unauthorized requests
 * Only allows Meta's webhook verification with proper parameters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // 🔍 DEBUG: Log all incoming verification parameters
    console.log('\n========== WEBHOOK VERIFICATION ATTEMPT ==========');
    console.log('📥 Request URL:', request.url);
    console.log('📝 Parameters:', {
      mode,
      token: token ? `${token.substring(0, 10)}...` : 'null',
      challenge: challenge ? 'present' : 'null'
    });

    // Security check: Return 403 for any unauthorized GET requests (like Zomato)
    if (!mode || !token || !challenge) {
      console.log('⚠️ Missing required parameters - returning 403');
      return new NextResponse(
        '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">\n<html><head>\n<title>403 Forbidden</title>\n</head><body>\n<h1>Forbidden</h1>\n<p>You don\'t have permission to access this resource.</p>\n</body></html>',
        { 
          status: 403,
          headers: {
            'Content-Type': 'text/html; charset=iso-8859-1',
            'Cache-Control': 'max-age=0, no-cache, no-store',
            'Pragma': 'no-cache',
          }
        }
      );
    }

    // 🔍 DEBUG: Check environment variable availability
    console.log('\n🔐 Environment Variable Check:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('NEXT_RUNTIME:', process.env.NEXT_RUNTIME);
    
    // List all WhatsApp-related env vars (safely)
    const whatsappEnvVars = {
      WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN ? '✅ SET' : '❌ NOT SET',
      WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET ? '✅ SET' : '❌ NOT SET',
      WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN ? '✅ SET' : '❌ NOT SET',
      META_PHONE_NUMBER_ID: process.env.META_PHONE_NUMBER_ID ? '✅ SET' : '❌ NOT SET',
      WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID ? '✅ SET' : '❌ NOT SET',
    };
    console.log('WhatsApp Environment Variables:', whatsappEnvVars);

    // Verify webhook from Meta
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!verifyToken) {
      console.error('\n❌ CRITICAL: WHATSAPP_VERIFY_TOKEN not configured in environment variables');
      console.error('💡 Solution:');
      console.error('   1. Go to AWS Amplify Console');
      console.error('   2. Navigate to: Environment variables');
      console.error('   3. Add: WHATSAPP_VERIFY_TOKEN = <your_token>');
      console.error('   4. Rebuild the application');
      console.log('==================================================\n');
      return new NextResponse('Forbidden', { status: 403 });
    }

    console.log('✅ WHATSAPP_VERIFY_TOKEN is configured');
    console.log('🔑 Token preview:', `${verifyToken.substring(0, 10)}...`);

    console.log('✅ WHATSAPP_VERIFY_TOKEN is configured');
    console.log('🔑 Token preview:', `${verifyToken.substring(0, 10)}...`);

    // 🔍 DEBUG: Compare tokens
    console.log('\n🔍 Token Comparison:');
    console.log('Mode:', mode);
    console.log('Expected token (first 15 chars):', verifyToken.substring(0, 15) + '...');
    console.log('Received token (first 15 chars):', token.substring(0, 15) + '...');
    console.log('Tokens match:', token === verifyToken);
    console.log('Token lengths - Expected:', verifyToken.length, 'Received:', token.length);

    // Simple string comparison for webhook verification
    if (mode === 'subscribe' && token === verifyToken) {
      // Respond with 200 OK and challenge token from the request
      console.log('\n✅ Webhook verified successfully!');
      console.log('📤 Sending challenge response:', challenge);
      console.log('==================================================\n');
      return new NextResponse(challenge, { 
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    // Invalid verification token
    console.warn('\n⚠️ Webhook verification failed - Token mismatch');
    console.warn('Details:', { 
      mode, 
      modeMatches: mode === 'subscribe',
      tokenMatches: token === verifyToken,
      tokenReceivedPreview: token?.substring(0, 10) + '...', 
      expectedTokenPreview: verifyToken.substring(0, 10) + '...' 
    });
    console.log('==================================================\n');
    return new NextResponse(
      '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">\n<html><head>\n<title>403 Forbidden</title>\n</head><body>\n<h1>Forbidden</h1>\n<p>You don\'t have permission to access this resource.</p>\n</body></html>',
      { 
        status: 403,
        headers: {
          'Content-Type': 'text/html; charset=iso-8859-1',
          'Cache-Control': 'max-age=0, no-cache, no-store',
          'Pragma': 'no-cache',
        }
      }
    );
  } catch (error) {
    console.error('❌ Webhook verification error:', error);
    return new NextResponse(
      '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">\n<html><head>\n<title>403 Forbidden</title>\n</head><body>\n<h1>Forbidden</h1>\n<p>You don\'t have permission to access this resource.</p>\n</body></html>',
      { 
        status: 403,
        headers: {
          'Content-Type': 'text/html; charset=iso-8859-1',
        }
      }
    );
  }
}

/**
 * POST - WhatsApp Webhook Handler
 * Receives incoming messages and events from Meta's WhatsApp Business API
 * Also handles sending WhatsApp messages (internal API)
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body first so we can verify the HMAC signature before parsing
    const rawBody = await request.text();
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Check if this is a webhook event from Meta (incoming message)
    if (body.object === 'whatsapp_business_account') {
      console.log('\n========== INCOMING WEBHOOK POST ==========');
      
      // 🔍 DEBUG: Check environment variables for POST
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      console.log('🔐 WHATSAPP_APP_SECRET:', appSecret ? '✅ SET' : '❌ NOT SET');
      
      // 🔒 SECURITY: Verify Meta webhook signature before processing any payload
      if (!appSecret) {
        console.error('❌ WHATSAPP_APP_SECRET not configured — cannot verify webhook signature');
        console.error('💡 Add WHATSAPP_APP_SECRET to Amplify Environment variables');
        console.log('===========================================\n');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      const signature = request.headers.get('x-hub-signature-256');
      console.log('🔐 Signature header:', signature ? 'present' : 'missing');
      
      if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
        console.warn('⚠️ Webhook signature verification failed — possible spoofed event, rejecting');
        console.log('===========================================\n');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      console.log('✅ Webhook signature verified');
      console.log('📨 Incoming WhatsApp webhook:', JSON.stringify(body, null, 2));

      // Process webhook entries
      if (body.entry && Array.isArray(body.entry)) {
        for (const entry of body.entry) {
          if (entry.changes && Array.isArray(entry.changes)) {
            for (const change of entry.changes) {
              if (change.value) {
                const value = change.value;

                // Handle incoming messages
                if (value.messages && Array.isArray(value.messages)) {
                  for (const message of value.messages) {
                    console.log('📩 Message received:', {
                      from: message.from,
                      type: message.type,
                      id: message.id,
                      timestamp: message.timestamp,
                    });

                    // Derive text content or serialise media payload
                    let content = '';
                    if (message.type === 'text') {
                      content = message.text?.body || '';
                    } else if (message.type === 'button' || message.type === 'interactive') {
                      content = JSON.stringify(message.interactive || message.button || {});
                    } else {
                      // image, document, audio, video, location, contacts, etc.
                      content = JSON.stringify(message[message.type] || {});
                    }

                    // Persist inbound message to DynamoDB (best-effort)
                    try {
                      await whatsappRepository.saveInboundMessage({
                        phone: message.from,
                        messageId: message.id,
                        type: message.type,
                        timestamp: parseInt(message.timestamp, 10) || Math.floor(Date.now() / 1000),
                        content,
                      });
                    } catch (saveErr) {
                      console.error('❌ Failed to persist inbound message:', saveErr);
                    }
                  }
                }

                // Handle message status updates
                if (value.statuses && Array.isArray(value.statuses)) {
                  for (const status of value.statuses) {
                    console.log('📊 Message status update:', {
                      id: status.id,
                      status: status.status,
                      timestamp: status.timestamp,
                      recipient: status.recipient_id,
                    });
                    
                    // 🛡️ CRITICAL: Process status for block-rate tracking
                    await handleMessageStatus(status as WebhookStatus);
                    
                    // Status values: sent, delivered, read, failed
                  }
                }
              }
            }
          }
        }
      }

      // Always return 200 OK to acknowledge receipt
      return NextResponse.json({ success: true, received: true }, { status: 200 });
    }

    // 🔒 SECURITY: For non-webhook requests (message sending), validate admin session
    const auth = await validateAdminSession(request, 'whatsapp-session');
    if (!auth.valid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // If not a webhook event, treat as message sending request (internal API)
    const { phone, message, template } = body;

    // Validate input - either message or template must be provided
    if (!phone || (!message && !template)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: phone and either message or template are required' 
        },
        { status: 400 }
      );
    }

    // Get credentials from environment variables
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_ID;

    // 🔍 DEBUG: Log credential availability
    console.log('\n========== MESSAGE SENDING REQUEST ==========');
    console.log('🔐 Credentials Check:');
    console.log('WHATSAPP_ACCESS_TOKEN:', accessToken ? '✅ SET' : '❌ NOT SET');
    console.log('META_PHONE_NUMBER_ID:', process.env.META_PHONE_NUMBER_ID ? '✅ SET' : '❌ NOT SET');
    console.log('WHATSAPP_PHONE_ID:', process.env.WHATSAPP_PHONE_ID ? '✅ SET' : '❌ NOT SET');
    console.log('Using phoneNumberId:', phoneNumberId || 'NOT CONFIGURED');

    if (!accessToken || !phoneNumberId) {
      console.error('❌ WhatsApp credentials not configured');
      console.error('💡 Required environment variables:');
      console.error('   - WHATSAPP_ACCESS_TOKEN');
      console.error('   - META_PHONE_NUMBER_ID or WHATSAPP_PHONE_ID');
      console.log('============================================\n');
      return NextResponse.json(
        { 
          success: false, 
          error: 'WhatsApp service not configured' 
        },
        { status: 500 }
      );
    }

    // Format phone number (remove any non-digit characters)
    const formattedPhone = phone.replace(/\D/g, '');

    // Prepare message payload based on type
    let messagePayload: any = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
    };

    if (template) {
      // Template message
      messagePayload.type = 'template';
      messagePayload.template = {
        name: template.name,
        language: {
          code: template.language || 'en',
        },
      };

      // Add template parameters if provided
      if (template.parameters && template.parameters.length > 0) {
        messagePayload.template.components = [
          {
            type: 'body',
            parameters: template.parameters.map((param: string) => ({
              type: 'text',
              text: param,
            })),
          },
        ];
      }
    } else {
      // Regular text message
      messagePayload.type = 'text';
      messagePayload.text = {
        body: message,
      };
    }

    // Send WhatsApp message via Meta Cloud API
    const whatsappResponse = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      }
    );

    const responseData = await whatsappResponse.json();

    if (!whatsappResponse.ok) {
      console.error('WhatsApp API error:', responseData);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send WhatsApp message',
          details: responseData.error?.message || 'Unknown error'
        },
        { status: whatsappResponse.status }
      );
    }

    // Success response
    return NextResponse.json(
      { 
        success: true, 
        message: template 
          ? `Template message sent successfully (${template.name})`
          : 'WhatsApp message sent successfully',
        messageId: responseData.messages?.[0]?.id,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('WhatsApp send error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error while sending message',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
