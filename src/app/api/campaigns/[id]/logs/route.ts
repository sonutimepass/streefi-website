/**
 * Campaign Logs API
 * 
 * Fetches execution logs for observability and debugging.
 * Returns last 50 events sorted by timestamp (newest first).
 */

import { NextRequest, NextResponse } from 'next/server';
import { campaignRepository } from '@/lib/repositories';
import { validateAdminSession } from '@/lib/adminAuth';

/**
 * GET /api/campaigns/[id]/logs
 * 
 * Fetch last 50 log events for a campaign
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1️⃣ Validate Admin Session
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // 2️⃣ Fetch logs from repository (uses Query on PK+SK, newest first)
    const logs = await campaignRepository.getCampaignLogs(campaignId, 50);

    return NextResponse.json({
      success: true,
      campaignId,
      logs,
      count: logs.length
    });

  } catch (error) {
    console.error('[CampaignLogs] Error fetching logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}
