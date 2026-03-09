/**
 * Campaign Recipient Reconciliation - DB Failure Recovery
 * 
 * **INTERNAL SYSTEM OPERATION - NOT A PUBLIC API**
 * 
 * Finds recipients stuck in PROCESSING status (likely due to DB write failures)
 * and marks them as FAILED so they can be retried.
 * 
 * USE CASES:
 * - Message sent successfully but status update failed
 * - Process crashed after send but before status write
 * - Network timeout during status update
 * 
 * SAFETY:
 * ✅ Only touches PROCESSING recipients older than 5 minutes
 * ✅ Idempotent (safe to run multiple times)
 * ✅ Scans all campaigns (not just one)
 * 
 * SECURITY:
 * ✅ Protected by INTERNAL_OPERATIONS_KEY
 * ✅ Must include header: x-internal-key
 * ✅ NO admin session required (internal only)
 * 
 * TRIGGER:
 * - Automated cron (AWS EventBridge every 10 minutes)
 * - Before batch execution (health check pattern)
 * - Emergency manual call with secret key
 * 
 * USAGE:
 * curl -X POST https://streefi.in/api/internal/campaigns/reconcile \
 *   -H "x-internal-key: YOUR_SECRET"
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyInternalRequest, createInternalAuthErrorResponse } from '@/lib/internalAuth';
import { recipientRepository } from '@/lib/repositories';

const STUCK_THRESHOLD_SECONDS = 5 * 60; // 5 minutes
const ERROR_CODE = 'DB_WRITE_TIMEOUT';
const ERROR_MESSAGE = 'Recipient stuck in PROCESSING - recovered by reconciliation';

interface ReconciliationResult {
  scanned: number;
  recovered: number;
  recipients: Array<{
    campaignId: string;
    phone: string;
    processingAt: number;
    stuckDuration: number;
  }>;
}

/**
 * POST /api/internal/campaigns/reconcile
 * 
 * Scans for stuck recipients and recovers them
 */
export async function POST(req: NextRequest) {
  console.log('🔧 [Reconcile API] Internal request received');
  
  try {
    // 🔒 SECURITY: Verify internal authentication
    verifyInternalRequest(req);
    console.log('✅ [Reconcile API] Internal auth verified');

    console.log('🔧 [Reconcile API] Starting recipient reconciliation');

    const now = Math.floor(Date.now() / 1000);
    const stuckThreshold = now - STUCK_THRESHOLD_SECONDS;

    // Get stuck recipients from repository
    console.log(`🔍 [Reconcile API] Scanning for recipients stuck longer than ${STUCK_THRESHOLD_SECONDS}s`);
    
    const stuckRecipients = await recipientRepository.getStuckRecipients(STUCK_THRESHOLD_SECONDS);
    console.log(`📊 [Reconcile API] Found ${stuckRecipients.length} stuck recipients`);

    if (stuckRecipients.length === 0) {
      console.log('✅ [Reconcile API] No stuck recipients found');
      return NextResponse.json({
        success: true,
        scanned: 0,
        recovered: 0,
        recipients: []
      });
    }

    // Recover each stuck recipient
    const recoveredRecipients: ReconciliationResult['recipients'] = [];
    let recoveredCount = 0;

    for (const recipient of stuckRecipients) {
      try {
        console.log(`🔄 [Reconcile API] Recovering ${recipient.phone} from campaign ${recipient.campaignId} (stuck for ${recipient.stuckDuration}s)`);
        
        await recipientRepository.markRecipientAsFailed(
          recipient.campaignId,
          recipient.phone,
          ERROR_CODE,
          ERROR_MESSAGE
        );

        recoveredCount++;
        recoveredRecipients.push({
          campaignId: recipient.campaignId,
          phone: recipient.phone,
          processingAt: recipient.processing_at || 0,
          stuckDuration: recipient.stuckDuration
        });

        console.log(`✅ [Reconcile API] Recovered ${recipient.phone}`);
      } catch (err) {
        console.error(`❌ [Reconcile API] Failed to recover ${recipient.phone}:`, err);
      }
    }

    console.log(`🎉 [Reconcile API] Reconciliation complete: ${recoveredCount}/${stuckRecipients.length} recovered`);

    return NextResponse.json({
      success: true,
      scanned: stuckRecipients.length,
      recovered: recoveredCount,
      recipients: recoveredRecipients
    });

  } catch (error) {
    // Handle internal auth errors
    const authError = createInternalAuthErrorResponse(error);
    if (authError) return authError;

    // Handle reconciliation errors
    console.error('❌ [Reconcile API] Reconciliation failed:', error);
    return NextResponse.json(
      { error: 'Reconciliation failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/internal/campaigns/reconcile
 * 
 * Check for stuck recipients without recovering them (dry-run)
 */
export async function GET(req: NextRequest) {
  console.log('🔍 [Reconcile API] Health check requested (dry-run)');
  
  try {
    // 🔒 SECURITY: Verify internal authentication
    verifyInternalRequest(req);
    console.log('✅ [Reconcile API] Internal auth verified');

    const now = Math.floor(Date.now() / 1000);
    const stuckThreshold = now - STUCK_THRESHOLD_SECONDS;

    // Get stuck recipients (dry-run)
    const stuckRecipients = await recipientRepository.getStuckRecipients(STUCK_THRESHOLD_SECONDS);

    console.log(`📊 [Reconcile API] Dry-run: Found ${stuckRecipients.length} stuck recipients`);

    return NextResponse.json({
      status: 'healthy',
      stuckCount: stuckRecipients.length,
      threshold: STUCK_THRESHOLD_SECONDS,
      recipients: stuckRecipients.map(r => ({
        campaignId: r.campaignId,
        phone: r.phone,
        stuckDuration: r.stuckDuration
      }))
    });

  } catch (error) {
    // Handle internal auth errors
    const authError = createInternalAuthErrorResponse(error);
    if (authError) return authError;

    // Handle dry-run errors
    return NextResponse.json(
      { status: 'unhealthy', error: 'Failed to check stuck recipients' },
      { status: 500 }
    );
  }
}
