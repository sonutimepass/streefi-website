/**
 * Campaign Dispatcher Endpoint
 * 
 * CRITICAL: This endpoint is triggered by CloudWatch/cron every minute.
 * 
 * PURPOSE:
 * - Automatically processes active campaigns
 * - Prevents campaigns from stalling
 * - Distributes load across time
 * 
 * TRIGGER OPTIONS:
 * 
 * 1. AWS CloudWatch Events:
 *    Rule: rate(1 minute)
 *    Target: API Gateway → /api/campaigns/dispatch
 * 
 * 2. Vercel Cron (vercel.json):
 *    {
 *      "crons": [{
 *        "path": "/api/campaigns/dispatch",
 *        "schedule": "* * * * *"
 *      }]
 *    }
 * 
 * 3. External cron service:
 *    curl -X POST https://streefi.in/api/campaigns/dispatch \
 *      -H "x-dispatcher-key: SECRET"
 * 
 * SECURITY:
 * - Validates dispatcher secret key
 * - Prevents unauthorized triggering
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCampaignDispatcher } from '@/lib/whatsapp/campaignDispatcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 60s execution (for Vercel Pro)

/**
 * POST - Trigger campaign dispatch cycle
 */
export async function POST(request: NextRequest) {
  try {
    // 🔒 SECURITY: Verify dispatcher key
    const authHeader = request.headers.get('x-dispatcher-key');
    const expectedKey = process.env.DISPATCHER_SECRET_KEY || 'internal-dispatcher';
    
    if (authHeader !== expectedKey) {
      console.warn('⚠️ [Dispatch] Unauthorized dispatch attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 [Dispatch] Dispatcher triggered by cron');

    const dispatcher = getCampaignDispatcher();
    const result = await dispatcher.run();

    return NextResponse.json({
      success: true,
      dispatched: result.dispatched,
      failed: result.failed,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Dispatch] Dispatcher error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Dispatcher failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Health check for dispatcher
 */
export async function GET(request: NextRequest) {
  try {
    const dispatcher = getCampaignDispatcher();
    const campaigns = await dispatcher.findPendingCampaigns();

    return NextResponse.json({
      status: 'healthy',
      pendingCampaigns: campaigns.length,
      campaigns: campaigns.map(c => ({
        id: c.campaignId,
        sent: c.sentCount,
        total: c.totalRecipients,
        progress: `${((c.sentCount / c.totalRecipients) * 100).toFixed(1)}%`
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Failed to get dispatcher status' },
      { status: 500 }
    );
  }
}
