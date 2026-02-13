import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const VERIFY_TOKEN = 'streefi_secure_token';
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * GET - WhatsApp Webhook Verification
 * Meta will call this endpoint to verify the webhook
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        // Respond with 200 OK and challenge token from the request
        console.log('Webhook verified successfully!');
        return new NextResponse(challenge, { status: 200 });
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        return NextResponse.json(
          { error: 'Verification token mismatch' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Missing verification parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Webhook verification error:', error);
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 500 }
    );
  }
}

/**
 * POST - Send WhatsApp Message
 * Accepts: { phone: string, message?: string, template?: { name: string, language: string, parameters?: string[] } }
 * Sends message via Meta Cloud API (supports both text and template messages)
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
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
