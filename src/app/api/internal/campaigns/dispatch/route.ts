/**
 * Campaign Dispatcher Endpoint
 * 
 * **INTERNAL SYSTEM OPERATION - NOT A PUBLIC API**
 * 
 * PURPOSE:
 * - Automatically processes active campaigns
 * - Prevents campaigns from stalling
 * - Distributes load across time
 * 
 * SECURITY:
 * ✅ Protected by INTERNAL_OPERATIONS_KEY
 * ✅ Must include header: x-internal-key
 * ✅ NO admin session required (internal only)
 * 
 * TRIGGER:
 * AWS EventBridge cron (every 5 minutes):
 * Rule: rate(5 minutes)
 * Target: /api/internal/campaigns/dispatch
 * Headers: x-internal-key: YOUR_SECRET
 * 
 * USAGE:
 * curl -X POST https://streefi.in/api/internal/campaigns/dispatch \
 *   -H "x-internal-key: YOUR_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyInternalRequest, createInternalAuthErrorResponse } from '@/lib/internalAuth';
import { getCampaignDispatcher } from '@/lib/whatsapp/campaignDispatcher';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow 60s execution (for Vercel Pro/AWS Lambda)

/**
 * POST - Trigger campaign dispatch cycle
 * 
 * **INTERNAL ONLY** - Called by AWS EventBridge cron
 */
export async function POST(request: NextRequest) {
  console.log('🔄 [Dispatch] Internal request received');

  try {
    // 🔒 SECURITY: Verify internal authentication
    verifyInternalRequest(request);
    console.log('✅ [Dispatch] Internal auth verified');

    console.log('🔄 [Dispatch] Starting dispatcher...');

    const dispatcher = getCampaignDispatcher();
    const result = await dispatcher.run();

    console.log(`✅ [Dispatch] Dispatcher completed: ${result.dispatched} dispatched, ${result.failed} failed`);

    return NextResponse.json({
      success: true,
      dispatched: result.dispatched,
      failed: result.failed,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // Handle internal auth errors
    const authError = createInternalAuthErrorResponse(error);
    if (authError) return authError;

    // Handle dispatcher errors
    console.error('[Dispatch] Dispatcher error:', error);
    return NextResponse.json(
      { success: false, error: 'Dispatcher failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET - Health check for dispatcher
 * 
 * **INTERNAL ONLY** - For monitoring/debugging
 */
export async function GET(request: NextRequest) {
  console.log('📊 [Dispatch] Health check requested');

  try {
    // 🔒 SECURITY: Verify internal authentication
    verifyInternalRequest(request);
    console.log('✅ [Dispatch] Internal auth verified');

    const dispatcher = getCampaignDispatcher();
    const campaigns = await dispatcher.findPendingCampaigns();

    console.log(`📊 [Dispatch] Found ${campaigns.length} pending campaigns`);

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
    // Handle internal auth errors
    const authError = createInternalAuthErrorResponse(error);
    if (authError) return authError;

    // Handle health check errors
    return NextResponse.json(
      { status: 'unhealthy', error: 'Failed to get dispatcher status' },
      { status: 500 }
    );
  }
}
