/**
 * Retry Failed Recipients API Endpoint
 * 
 * Resets all FAILED recipients back to PENDING status
 * so they can be retried in the next batch execution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { campaignRepository, recipientRepository } from '@/lib/repositories';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 [Retry Failed API] Request received');
  try {
    // 1️⃣ Validate admin session
    console.log('🔐 [Retry Failed API] Validating admin session...');
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;
    console.log('📦 [Retry Failed API] Campaign ID:', campaignId);

    // 2️⃣ Reset all failed recipients to PENDING
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

    // 3️⃣ Decrement failed_count in campaign metadata
    console.log('💾 [Retry Failed API] Updating campaign metrics...');
    await campaignRepository.incrementMetric(campaignId, 'failed_count', -resetCount);
    
    console.log(`✅ [Retry Failed API] Successfully retried ${resetCount} recipient(s)`);
    return NextResponse.json({
      success: true,
      retriedCount: resetCount,
      message: `Successfully reset ${resetCount} failed recipient(s) to PENDING`
    });

  } catch (error) {
    console.error('❌ [Retry Failed API] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
