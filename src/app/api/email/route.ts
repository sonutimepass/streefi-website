import { NextRequest, NextResponse } from 'next/server';

interface EmailRequest {
  to: string | string[];
  subject: string;
  message: string;
}

interface ZohoTokenResponse {
  access_token: string;
  api_domain: string;
  token_type: string;
  expires_in: number;
}

// Helper function to generate Zoho access token
async function getZohoAccessToken(): Promise<string> {
  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Zoho credentials in environment variables');
  }

  console.log('🔑 Generating Zoho access token...');

  const tokenUrl = 'https://accounts.zoho.in/oauth/v2/token';
  
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Token generation failed:', errorText);
      throw new Error(`Failed to get access token: ${errorText}`);
    }

    const data: ZohoTokenResponse = await response.json();
    console.log('✅ Access token generated successfully');
    
    return data.access_token;
  } catch (error) {
    console.error('❌ Error generating access token:', error);
    throw error;
  }
}

// Helper function to send a single email via Zoho
async function sendZohoEmail(
  accessToken: string,
  to: string,
  subject: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const fromEmail = process.env.FROM_EMAIL || 'support@streefi.in';
  const apiUrl = 'https://www.zohoapis.in/mail/v1/accounts/me/messages';

  console.log(`📧 Sending email to: ${to}`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromAddress: fromEmail,
        toAddress: to,
        subject: subject,
        content: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Email send failed to ${to}:`, errorText);
      return {
        success: false,
        error: errorText,
      };
    }

    const result = await response.json();
    console.log(`✅ Email sent successfully to: ${to}`);
    
    return { success: true };
  } catch (error) {
    console.error(`❌ Error sending email to ${to}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper function to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// POST handler - Send email
export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json();
    const { to, subject, message } = body;

    // Validate required fields
    if (!to || !subject || !message) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: to, subject, message',
        },
        { status: 400 }
      );
    }

    console.log('📬 Email API called');
    console.log('Recipients:', Array.isArray(to) ? `${to.length} recipients` : to);
    console.log('Subject:', subject);

    // Generate access token
    let accessToken: string;
    try {
      accessToken = await getZohoAccessToken();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to authenticate with Zoho',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 }
      );
    }

    // Handle bulk email
    if (Array.isArray(to)) {
      console.log(`📮 Bulk email mode: Sending to ${to.length} recipients`);

      let sent = 0;
      let failed = 0;
      const errors: Array<{ email: string; error: string }> = [];

      for (const recipient of to) {
        const result = await sendZohoEmail(accessToken, recipient, subject, message);

        if (result.success) {
          sent++;
        } else {
          failed++;
          errors.push({
            email: recipient,
            error: result.error || 'Unknown error',
          });
        }

        // Add delay between emails to avoid rate limiting
        if (to.indexOf(recipient) < to.length - 1) {
          await delay(500);
        }
      }

      console.log(`✅ Bulk send complete: ${sent} sent, ${failed} failed`);

      return NextResponse.json({
        success: true,
        total: to.length,
        sent,
        failed,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // Handle single email
    const result = await sendZohoEmail(accessToken, to, subject, message);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Zoho email failed',
          details: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
    });

  } catch (error) {
    console.error('❌ Email API error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
