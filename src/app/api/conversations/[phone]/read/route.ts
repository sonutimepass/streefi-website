/**
 * Mark Conversation as Read API
 * 
 * POST /api/conversations/[phone]/read
 * 
 * Resets the unread count to 0 for a conversation.
 * Called when vendor opens a conversation in the dashboard.
 * 
 * Security:
 * - Should be protected by admin authentication
 * - Consider adding rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { whatsappRepository } from '@/lib/repositories/whatsappRepository';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;

    // Validate phone number format
    if (!phone || !/^\d{10,15}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Mark conversation as read (reset unreadCount to 0)
    await whatsappRepository.markConversationAsRead(phone);

    return NextResponse.json({
      success: true,
      message: 'Conversation marked as read',
      phone
    });

  } catch (error) {
    console.error('[API] Error marking conversation as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark conversation as read' },
      { status: 500 }
    );
  }
}
