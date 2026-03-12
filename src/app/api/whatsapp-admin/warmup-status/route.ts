import { NextRequest, NextResponse } from 'next/server';
import { getAccountWarmupManager } from '@/lib/whatsapp/accountWarmupManager';
import { validateAdminSession } from '@/lib/adminAuth';

/**
 * GET /api/whatsapp-admin/warmup-status
 * 
 * Returns current warmup state for WhatsApp account
 * 
 * Used for:
 * - Dashboard display of account maturity
 * - Daily limit enforcement monitoring
 * - Warmup progress tracking
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminSessionWithBypass(request, 'whatsapp-session');
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = process.env.META_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID;
    
    if (!accountId) {
      return NextResponse.json({
        error: 'META_PHONE_NUMBER_ID not configured'
      }, { status: 500 });
    }

    const manager = getAccountWarmupManager();
    
    // Get current state
    const state = await manager.getWarmupState(accountId);
    
    // Get warmup progress info
    const progress = await manager.getWarmupProgress(accountId);
    
    // Calculate stats
    const remainingToday = state.dailyLimit - state.currentDaySent;
    const usagePercent = ((state.currentDaySent / state.dailyLimit) * 100).toFixed(1);
    
    return NextResponse.json({
      // Current Status
      accountAge: state.accountAge,
      dailyLimit: state.dailyLimit,
      currentDaySent: state.currentDaySent,
      remainingToday,
      usagePercent: parseFloat(usagePercent),
      
      // Lifetime Stats
      totalSent: state.totalSent,
      firstSendDate: new Date(state.firstSendDate * 1000).toISOString(),
      
      // Quality
      qualityTier: state.qualityTier,
      
      // Warmup Progress
      warmupProgress: {
        currentTier: progress.currentTier,
        nextTier: progress.nextTier,
        daysUntilNext: progress.daysUntilNext,
        progress: progress.progress
      },
      
      // Status Flags
      isMature: state.accountAge >= 30,
      canSendMore: remainingToday > 0,
      
      // Metadata
      lastResetDate: state.lastResetDate,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Warmup Status] Error:', error);
    return NextResponse.json({
      error: 'Failed to get warmup status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
