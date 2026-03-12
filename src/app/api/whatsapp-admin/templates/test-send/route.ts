/**
 * Send Test Message API - Phase UI-4
 * 
 * Sends a test WhatsApp template message to verify template is working correctly.
 * Useful for testing templates before using them in campaigns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSessionWithBypass } from '@/lib/adminAuth';
import { getMessageService } from '@/lib/whatsapp/meta/messageService';
import { isKillSwitchEnabled } from '@/app/api/whatsapp-admin/kill-switch/route';

interface SendTestRequest {
  templateName: string;
  toPhone: string;
  variables?: string[];
}

/**
 * POST /api/whatsapp-admin/templates/test-send
 * 
 * Send a test template message
 */
export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Validate Admin Session
    const validation = await validateAdminSessionWithBypass(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2️⃣ Parse request body
    const body: SendTestRequest = await req.json();
    const { templateName, toPhone, variables } = body;

    if (!templateName) {
      return NextResponse.json(
        { error: 'Template name is required' },
        { status: 400 }
      );
    }

    if (!toPhone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // 3️⃣ Validate phone number format (should be international format without +)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(toPhone)) {
      return NextResponse.json(
        { 
          error: 'Invalid phone number format',
          details: 'Phone must be 10-15 digits without + or spaces (e.g., 919876543210)'
        },
        { status: 400 }
      );
    }

    // 4️⃣ Check kill switch before sending
    const killSwitch = await isKillSwitchEnabled();
    if (killSwitch.enabled) {
      return NextResponse.json(
        { error: 'Sending is currently disabled by kill switch', reason: killSwitch.reason },
        { status: 503 }
      );
    }

    // 5️⃣ Build template message
    const messageService = getMessageService();
    
    const templateMessage: any = {
      type: 'template',
      to: toPhone,
      template: {
        name: templateName,
        language: {
          code: 'en' // Default to English, can be made dynamic
        }
      }
    };

    // Add variables if provided
    if (variables && variables.length > 0) {
      templateMessage.template.components = [
        {
          type: 'body',
          parameters: variables.map(v => ({
            type: 'text',
            text: v
          }))
        }
      ];
    }

    // 6️⃣ Send test message
    const response = await messageService.sendTemplateMessage(templateMessage);

    // Extract message ID from response
    const messageId = response.messages[0]?.id;

    console.log('[TestMessage] Successfully sent test message:', {
      templateName,
      toPhone,
      messageId,
      variables
    });

    return NextResponse.json({
      success: true,
      message: 'Test message sent successfully',
      messageId,
      sentTo: toPhone,
      templateName
    });

  } catch (error: any) {
    console.error('[TestMessage] Error sending test message:', error);
    
    // Handle specific error types
    let errorMessage = 'Failed to send test message';
    let statusCode = 500;

    if (error.message?.includes('template')) {
      errorMessage = 'Template not found or not approved in Meta';
      statusCode = 400;
    } else if (error.message?.includes('phone')) {
      errorMessage = 'Invalid phone number or user not registered on WhatsApp';
      statusCode = 400;
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again later';
      statusCode = 429;
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message || 'Unknown error'
      },
      { status: statusCode }
    );
  }
}
