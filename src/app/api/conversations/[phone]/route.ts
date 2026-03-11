/**
 * Conversation Details API
 * 
 * GET /api/conversations/[phone]
 * 
 * Returns conversation metadata and message history for a specific phone number.
 * Powers the vendor dashboard conversation view.
 * 
 * Query Parameters:
 * - limit: Number of messages to return (default: 50, max: 200)
 * - cursor: Pagination cursor for messages
 * 
 * Response:
 * - conversation: Metadata (name, unread count, last message, etc.)
 * - messages: Array of messages (sorted newest first)
 * - pagination: Next cursor and hasMore flag
 */

import { NextRequest, NextResponse } from 'next/server';
import { whatsappRepository } from '@/lib/repositories/whatsappRepository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ phone: string }> }
) {
  try {
    const { phone } = await params;

    // Validate phone number format
    if (!phone || !/^\d{10,15}$/.test(phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format', received: phone },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const cursor = searchParams.get('cursor');

    // Decode pagination cursor
    let lastEvaluatedKey: Record<string, any> | undefined;
    if (cursor) {
      try {
        lastEvaluatedKey = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid pagination cursor' },
          { status: 400 }
        );
      }
    }

    // Fetch conversation metadata and messages in parallel
    const [conversation, messagesResult] = await Promise.all([
      whatsappRepository.getConversation(phone),
      whatsappRepository.getConversationMessages({
        phone,
        limit,
        lastEvaluatedKey
      })
    ]);

    // Check if conversation exists
    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Encode next cursor for pagination
    const nextCursor = messagesResult.lastEvaluatedKey
      ? Buffer.from(JSON.stringify(messagesResult.lastEvaluatedKey)).toString('base64')
      : null;

    return NextResponse.json({
      conversation,
      messages: messagesResult.messages,
      pagination: {
        nextCursor,
        hasMore: !!messagesResult.lastEvaluatedKey
      }
    });

  } catch (error) {
    console.error('[API] Error getting conversation:', error);
    return NextResponse.json(
      { error: 'Failed to get conversation details' },
      { status: 500 }
    );
  }
}
