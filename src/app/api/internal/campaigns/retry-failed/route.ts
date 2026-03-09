/**
 * Retry Failed Recipients API Endpoint
 * 
 * **INTERNAL SYSTEM OPERATION - NOT A PUBLIC API**
 * 
 * Resets all FAILED recipients back to PENDING status
 * so they can be retried in the next batch execution.
 * 
 * SECURITY:
 * ✅ Protected by INTERNAL_OPERATIONS_KEY
 * ✅ Must include header: x-internal-key
 * ✅ NO admin session required (internal only)
 * 
 * TRIGGER:
 * - Automated cron (AWS EventBridge, hourly)
 * - Emergency manual call with secret key
 * 
 * USAGE:
 * curl -X POST https://streefi.in/api/internal/campaigns/retry-failed \
 *   -H "x-internal-key: YOUR_SECRET" \
 *   -H "Content-Type: application/json" \
 *   -d '{"campaignId": "CAMPAIGN_123"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyInternalRequest, createInternalAuthErrorResponse } from '@/lib/internalAuth';
import { campaignRepository, recipientRepository } from '@/lib/repositories';

export async function POST(req: NextRequest) {
  console.log('🚀 [Retry Failed API] Internal request received');
  
  try {
    // 🔒 SECURITY: Verify internal authentication
    verifyInternalRequest(req);
    console.log('✅ [Retry Failed API] Internal auth verified');

    // Parse request body
    const body = await req.json();
    const { campaignId } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required in request body' },
        { status: 400 }
      );
    }

    console.log('📦 [Retry Failed API] Campaign ID:', campaignId);

    // Reset all failed recipients to PENDING
    console.log('🔄 [Retry Failed API] Resetting failed recipients to PENDING...');
    const resetCount = await recipientRepository.resetAllFailedRecipients(campaignId);
    console.log(`📊 [Retry Failed API] Reset ${resetCount} recipients`);

    if (resetCount === 0) {
      console.log('✅ [Retry Failed API] No failed recipients to retry');
      return NextResponse.json({
        success: true,
        retriedCount: 0,
        message: 'No failed recipients to retry'
      });
    }

    // Decrement failed_count in campaign metadata
    console.log('💾 [Retry Failed API] Updating campaign metrics...');
    await campaignRepository.incrementMetric(campaignId, 'failed_count', -resetCount);
    
    console.log(`✅ [Retry Failed API] Successfully retried ${resetCount} recipient(s)`);
    return NextResponse.json({
      success: true,
      retriedCount: resetCount,
      message: `Successfully reset ${resetCount} failed recipient(s) to PENDING`
    });

  } catch (error) {
    // Handle internal auth errors
    const authError = createInternalAuthErrorResponse(error);
    if (authError) return authError;

    // Handle execution errors
    console.error('❌ [Retry Failed API] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
