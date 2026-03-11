/**
 * Send WhatsApp Message API
 * 
 * POST /api/whatsapp/send
 * 
 * Sends a text message to a customer via WhatsApp.
 * Stores outbound message in DynamoDB for dashboard display.
 * 
 * Flow:
 * 1. Validate phone and message
 * 2. Send via Meta WhatsApp API
 * 3. Store outbound message in DynamoDB
 * 4. Webhook will later update status (delivered/read)
 * 
 * Security:
 * - Should require admin authentication
 * - Later: restrict by vendor ID
 * 
 * Rate Limiting:
 * - Enforced by messageService (20 msg/sec)
 * - Daily conversation limits apply
 * 
 * Use Cases:
 * - Reply to customer messages (within 24hr window)
 * - Dashboard inbox replies
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMessageService, DailyLimitExceededError } from '@/lib/whatsapp/meta/messageService';
import { whatsappRepository } from '@/lib/repositories/whatsappRepository';
import { MetaApiError } from '@/lib/whatsapp/meta/metaClient';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, message } = body;

    // Validate phone number
    if (!phone || !/^\d{10,15}$/.test(phone)) {
      return NextResponse.json(
        { 
          error: 'Invalid phone number',
          message: 'Phone must be 10-15 digits (e.g., 919876543210)'
        },
        { status: 400 }
      );
    }

    // Validate message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    if (message.length > 4096) {
      return NextResponse.json(
        { 
          error: 'Message too long',
          message: 'WhatsApp messages are limited to 4096 characters'
        },
        { status: 400 }
      );
    }

    // Send message via Meta API
    console.log(`[API] Sending message to ${phone}`);
    
    const messageService = getMessageService();
    const response = await messageService.sendTextMessage({
      type: 'text',
      to: phone,
      text: {
        body: message.trim(),
        preview_url: true // Enable link previews
      }
    });

    const messageId = response.messages[0]?.id;
    const timestamp = Date.now();

    if (!messageId) {
      throw new Error('No message ID returned from Meta API');
    }

    // Store outbound message in DynamoDB
    // This enables dashboard to show full conversation history
    await whatsappRepository.storeOutboundMessage({
      phone,
      messageId,
      content: message.trim(),
      timestamp,
      status: 'sent'
    });

    console.log(`[API] Message sent successfully: ${messageId}`);

    // Return success response
    return NextResponse.json({
      success: true,
      messageId,
      phone,
      timestamp,
      status: 'sent',
      note: 'Message sent. Delivery status will be updated via webhook.'
    });

  } catch (error) {
    console.error('[API] Error sending message:', error);

    // Handle daily limit exceeded
    if (error instanceof DailyLimitExceededError) {
      return NextResponse.json(
        {
          error: 'Daily conversation limit exceeded',
          message: error.message,
          currentCount: error.currentCount,
          limit: error.limit
        },
        { status: 429 }
      );
    }

    // Handle Meta API errors
    if (error instanceof MetaApiError) {
      // Map common Meta error codes to user-friendly messages
      const userMessage = getMetaErrorMessage(error.code);

      return NextResponse.json(
        {
          error: 'WhatsApp API error',
          message: userMessage,
          metaError: {
            code: error.code,
            type: error.type,
            fbtraceId: error.fbtraceId
          }
        },
        { status: error.httpStatus || 500 }
      );
    }

    // Generic error
    return NextResponse.json(
      { 
        error: 'Failed to send message',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Map Meta API error codes to user-friendly messages
 */
function getMetaErrorMessage(code: number | string | undefined): string {
  const errorCode = typeof code === 'string' ? parseInt(code, 10) : code;

  switch (errorCode) {
    case 131026:
      return 'Message undelivered: Customer may have blocked the business or deleted WhatsApp';
    case 131047:
      return 'Re-engagement message not sent: Customer has not replied within 24 hours';
    case 131051:
      return 'Message not allowed: Unsupported message type';
    case 131053:
      return 'Rate limit exceeded: Too many messages in a short time';
    case 133016:
      return 'Invalid phone number format';
    case 135000:
      return 'Generic user error: Check phone number and message format';
    case 368:
      return 'Account temporarily restricted due to policy violations';
    case 80007:
      return 'Rate limit exceeded by customer: Too many messages to this number';
    case 131031:
      return 'Cannot send message: 24-hour customer service window has expired';
    default:
      return 'Failed to send message to WhatsApp. Please try again.';
  }
}

/**
 * GET endpoint (not implemented)
 * Could be used for message history or status lookup in the future
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    { 
      error: 'Method not supported',
      message: 'Use POST to send messages'
    },
    { status: 405 }
  );
}
