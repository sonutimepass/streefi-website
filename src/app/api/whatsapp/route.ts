import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'streefi_secure_token';
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

    // Security check: Return 403 for any unauthorized GET requests (like Zomato)
    if (!mode || !token || !challenge) {
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

    // Verify webhook from Meta
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Respond with 200 OK and challenge token from the request
      console.log('✅ Webhook verified successfully!');
      return new NextResponse(challenge, { 
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
        }
      });
    }

    // Invalid verification token
    console.warn('⚠️ Webhook verification failed: Token mismatch');
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
    const body = await request.json();

    // Check if this is a webhook event from Meta (incoming message)
    if (body.object === 'whatsapp_business_account') {
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

                    // Handle different message types
                    if (message.type === 'text') {
                      console.log('💬 Text message:', message.text.body);
                    } else if (message.type === 'image') {
                      console.log('🖼️ Image message:', message.image);
                    } else if (message.type === 'document') {
                      console.log('📄 Document message:', message.document);
                    } else if (message.type === 'audio') {
                      console.log('🎵 Audio message:', message.audio);
                    } else if (message.type === 'video') {
                      console.log('🎥 Video message:', message.video);
                    } else if (message.type === 'location') {
                      console.log('📍 Location message:', message.location);
                    } else if (message.type === 'contacts') {
                      console.log('👤 Contact message:', message.contacts);
                    } else if (message.type === 'button' || message.type === 'interactive') {
                      console.log('🔘 Interactive message:', message);
                    }

                    // TODO: Add your custom message handling logic here
                    // For example: save to database, trigger notifications, auto-reply, etc.
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
    const phoneNumberId = process.env.WHATSAPP_PHONE_ID;

    if (!accessToken || !phoneNumberId) {
      console.error('WhatsApp credentials not configured');
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
