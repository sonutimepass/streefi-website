/**
 * Conversations List API
 * 
 * GET /api/conversations
 * 
 * Returns list of all WhatsApp conversations sorted by most recent activity.
 * Powers the vendor dashboard conversation list.
 * 
 * Query Parameters:
 * - limit: Number of conversations to return (default: 50, max: 100)
 * - cursor: Pagination cursor (base64 encoded lastEvaluatedKey)
 * - vendorId: Filter by vendor (for multi-vendor systems)
 * 
 * Uses GSI: TYPE-updatedAt-index
 */

import { NextRequest, NextResponse } from 'next/server';
import { whatsappRepository } from '@/lib/repositories/whatsappRepository';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);
    const cursor = searchParams.get('cursor');
    const vendorId = searchParams.get('vendorId') || undefined;

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

    // Query conversations from DynamoDB
    const result = await whatsappRepository.listConversations({
      limit,
      lastEvaluatedKey,
      vendorId
    });

    // Encode next cursor for pagination
    const nextCursor = result.lastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.lastEvaluatedKey)).toString('base64')
      : null;

    return NextResponse.json({
      conversations: result.conversations,
      pagination: {
        nextCursor,
        hasMore: !!result.lastEvaluatedKey
      }
    });

  } catch (error) {
    console.error('[API] Error listing conversations:', error);
    
    // Check for GSI not found error
    if (error instanceof Error && error.message.includes('index')) {
      return NextResponse.json(
        { 
          error: 'Conversation index not ready',
          message: 'The GSI "TYPE-updatedAt-index" is still creating. Please wait 2-5 minutes and try again.'
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to list conversations' },
      { status: 500 }
    );
  }
}
