import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { whatsappRepository } from '@/lib/repositories/whatsappRepository';
import { verifyWebhookSignature } from '@/lib/whatsapp/signatureVerifier';
import { routeWebhookEvent } from '@/lib/whatsapp/webhookRouter';
import { truncateText } from '@/lib/whatsapp/metaTypes';

export const dynamic = 'force-dynamic';

// Check if running locally
const isLocalDevelopment = process.env.NODE_ENV === 'development' || 
                          process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

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
 * POST - WhatsApp Webhook Handler & Message Sending API
 * 
 * Handles two types of requests:
 * 1. Webhook events from Meta (incoming messages, statuses, operational alerts)
 * 2. Internal message sending API (admin/vendor sends message to customer)
 */
export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();
    let body: any;
    
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // ═══════════════════════════════════════════════════════════
    // WEBHOOK EVENT FROM META (incoming messages/events)
    // ═══════════════════════════════════════════════════════════
    if (body.object === 'whatsapp_business_account') {
      console.log('\n========== INCOMING WEBHOOK ==========');
      console.log('🔍 Environment:', isLocalDevelopment ? 'LOCAL' : 'PRODUCTION');
      
      // 🔒 SECURITY: Verify Meta webhook signature (production only)
      if (!isLocalDevelopment) {
        const appSecret = process.env.WHATSAPP_APP_SECRET;
        
        if (!appSecret) {
          console.error('❌ WHATSAPP_APP_SECRET not configured');
          return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        const signature = request.headers.get('x-hub-signature-256');
        
        if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
          console.warn('⚠️ Webhook signature verification failed');
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        console.log('✅ Webhook signature verified');
      } else {
        console.warn('⚠️ LOCAL DEV: Skipping signature verification');
      }

      // Route webhook events to handlers
      if (body.entry && Array.isArray(body.entry)) {
        for (const entry of body.entry) {
          if (entry.changes && Array.isArray(entry.changes)) {
            for (const change of entry.changes) {
              await routeWebhookEvent(change.field, change.value, entry.id);
            }
          }
        }
      }

      // Always return 200 OK to acknowledge receipt
      console.log('✅ Webhook processed');
      console.log('======================================\n');
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

    // ═══════════════════════════════════════════════════════════
    // CRITICAL: Store outbound message for conversation history
    // ═══════════════════════════════════════════════════════════
    if (responseData.messages?.[0]?.id) {
      const messageContent = template 
        ? `[Template: ${template.name}]` 
        : message;

      try {
        // Write 1: Store outbound message
        await whatsappRepository.storeMessage({
          phone: formattedPhone,
          direction: 'outbound',
          messageId: responseData.messages[0].id,
          messageType: template ? 'template' : 'text',
          content: messageContent,
          timestamp: Math.floor(Date.now() / 1000),
          status: 'sent'
        });

        // Write 2: Update conversation metadata
        await whatsappRepository.updateConversationMeta({
          phone: formattedPhone,
          lastMessage: truncateText(messageContent, 100),
          lastMessageTimestamp: Math.floor(Date.now() / 1000),
          lastDirection: 'outbound',
          incrementUnread: false // Vendor replies don't increment unread
        });

        console.log('✅ Stored outbound message:', responseData.messages[0].id);
      } catch (storeError) {
        console.error('❌ Failed to store outbound message:', storeError);
        // Continue - message was sent successfully
      }
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
