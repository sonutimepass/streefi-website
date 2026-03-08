/**
 * Global Pause Control API
 * 
 * Admin endpoint to control system-wide pause state in DynamoDB.
 * Accessible only to authenticated admins.
 * 
 * POST /api/whatsapp-admin/global-pause
 * Body: { paused: boolean, reason?: string }
 * 
 * GET /api/whatsapp-admin/global-pause
 * Response: { paused: boolean, reason?: string, pausedAt?: number, pausedBy?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { campaignRepository } from '@/lib/repositories';

/**
 * GET - Check current global pause state
 */
export async function GET(request: NextRequest) {
  // Validate admin session
  const validation = await validateAdminSession(request, 'whatsapp-session');
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const state = await campaignRepository.getGlobalPauseState();
    
    return NextResponse.json({
      success: true,
      state
    });
  } catch (error) {
    console.error('[GlobalPauseAPI] Error getting global state:', error);
    return NextResponse.json(
      { error: 'Failed to get global pause state' },
      { status: 500 }
    );
  }
}

/**
 * POST - Set global pause state
 */
export async function POST(request: NextRequest) {
  // Validate admin session
  const validation = await validateAdminSession(request, 'whatsapp-session');
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    
    if (typeof body.paused !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request: paused must be a boolean' },
        { status: 400 }
      );
    }

    const adminEmail = validation.session?.email || 'admin';
    
    await campaignRepository.setGlobalPauseState(
      body.paused,
      adminEmail,
      body.reason
    );
    
    console.log(`✅ [GlobalPauseAPI] Global pause ${body.paused ? 'ENABLED' : 'DISABLED'} by ${adminEmail}`);
    if (body.reason) {
      console.log(`   Reason: ${body.reason}`);
    }
    
    return NextResponse.json({
      success: true,
      paused: body.paused,
      reason: body.reason,
      message: body.paused 
        ? 'All WhatsApp campaign sending has been paused'
        : 'WhatsApp campaign sending has been resumed'
    });
  } catch (error) {
    console.error('[GlobalPauseAPI] Error setting global pause:', error);
    return NextResponse.json(
      { error: 'Failed to set global pause state' },
      { status: 500 }
    );
  }
}
