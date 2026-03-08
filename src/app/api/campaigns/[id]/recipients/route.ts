/**
 * Campaign Recipients API
 *
 * GET /api/campaigns/[id]/recipients
 *   ?status=PENDING|PROCESSING|SENT|DELIVERED|FAILED|READ|RECEIVED
 *   &limit=50   (1-100, default 50)
 *   &cursor=... (opaque pagination cursor)
 *
 * Returns a paginated list of recipient records for the given campaign.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { campaignRepository, recipientRepository } from '@/lib/repositories';
import type { RecipientStatus } from '@/lib/repositories/recipientRepository';

const VALID_STATUSES: RecipientStatus[] = [
  'PENDING', 'PROCESSING', 'SENT', 'DELIVERED', 'RECEIVED', 'FAILED', 'READ',
];

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await validateAdminSession(req, 'whatsapp-session');
  if (!auth.valid || !auth.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: campaignId } = await params;

  // Verify campaign exists
  const campaign = await campaignRepository.getCampaign(campaignId);
  if (!campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
  }

  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status') ?? undefined;
  const limitParam = parseInt(url.searchParams.get('limit') ?? '50', 10);
  const cursor = url.searchParams.get('cursor') ?? undefined;

  if (statusParam && !VALID_STATUSES.includes(statusParam as RecipientStatus)) {
    return NextResponse.json({
      error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
    }, { status: 400 });
  }

  if (isNaN(limitParam) || limitParam < 1 || limitParam > 100) {
    return NextResponse.json({ error: 'limit must be between 1 and 100' }, { status: 400 });
  }

  try {
    const { items, nextCursor } = await recipientRepository.listRecipientsPaginated(
      campaignId,
      limitParam,
      statusParam as RecipientStatus | undefined,
      cursor
    );

    return NextResponse.json({
      campaignId,
      recipients: items,
      total: campaign.total_recipients,
      nextCursor,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Invalid pagination cursor') {
      return NextResponse.json({ error: 'Invalid pagination cursor' }, { status: 400 });
    }
    console.error('[RecipientsAPI] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 });
  }
}
