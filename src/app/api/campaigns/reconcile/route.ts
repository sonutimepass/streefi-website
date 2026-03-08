/**
 * Campaign Recipient Reconciliation - DB Failure Recovery
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
 * ✅ Can be triggered manually or via cron
 * ✅ Scans all campaigns (not just one)
 * 
 * TRIGGER OPTIONS:
 * - Manual (admin panel or API call)
 * - Cron (AWS EventBridge every 5-10 minutes)
 * - Before batch execution (health check pattern)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
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
 * POST /api/campaigns/reconcile
 * 
 * Scans for stuck recipients and recovers them
 */
export async function POST(req: NextRequest) {
  console.log('🔧 [Reconcile API] Starting recipient reconciliation');
  
  try {
    // 1️⃣ Validate admin session
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      console.log('❌ [Reconcile API] Unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const stuckThreshold = now - STUCK_THRESHOLD_SECONDS;

    // 2️⃣ Get stuck recipients from repository
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

    // 3️⃣ Recover each stuck recipient
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
    console.error('❌ [Reconcile API] Reconciliation failed:', error);
    return NextResponse.json(
      { error: 'Reconciliation failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/campaigns/reconcile
 * 
 * Check for stuck recipients without recovering them (dry-run)
 */
export async function GET(req: NextRequest) {
  console.log('🔍 [Reconcile API] Checking for stuck recipients (dry-run)');
  
  try {
    // 1️⃣ Validate admin session
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const stuckThreshold = now - STUCK_THRESHOLD_SECONDS;

    // 2️⃣ Get stuck recipients (dry-run)
    const stuckRecipients = await recipientRepository.getStuckRecipients(STUCK_THRESHOLD_SECONDS);

    const recipientsInfo = stuckRecipients.map(recipient => ({
      campaignId: recipient.campaignId,
      phone: recipient.phone,
      processingAt: recipient.processing_at || 0,
      stuckDuration: recipient.stuckDuration
    }));

    console.log(`📊 [Reconcile API] Found ${stuckRecipients.length} stuck recipients (dry-run)`);

    return NextResponse.json({
      success: true,
      count: stuckRecipients.length,
      threshold: STUCK_THRESHOLD_SECONDS,
      recipients: recipientsInfo
    });

  } catch (error) {
    console.error('❌ [Reconcile API] Check failed:', error);
    return NextResponse.json(
      { error: 'Check failed' },
      { status: 500 }
    );
  }
}
