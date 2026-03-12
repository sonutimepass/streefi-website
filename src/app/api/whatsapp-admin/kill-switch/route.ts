/**
 * Emergency Kill Switch API
 * 
 * System-wide control to disable ALL WhatsApp sending immediately.
 * Critical for compliance emergencies (Meta flags, violations, etc.)
 * 
 * GET  /api/whatsapp-admin/kill-switch - Get current status
 * POST /api/whatsapp-admin/kill-switch - Toggle kill switch
 */

import { NextRequest, NextResponse } from 'next/server';
import { whatsappRepository, type KillSwitchStatus } from '@/lib/repositories';
import { validateAdminSessionWithBypass } from '@/lib/adminAuth';

/**
 * GET - Get current kill switch status
 */
export async function GET(req: NextRequest) {
  try {
    // Validate admin session (with bypass for local dev)
    const auth = await validateAdminSessionWithBypass(req, 'whatsapp-session');
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get kill switch status from repository
    const killSwitch = await whatsappRepository.getKillSwitchStatus();

    return NextResponse.json({ killSwitch });

  } catch (error) {
    console.error('❌ Kill switch GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get kill switch status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Toggle kill switch (enable/disable)
 * Body: { action: 'enable' | 'disable', reason?: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Validate admin session (with bypass for local dev)
    const auth = await validateAdminSessionWithBypass(req, 'whatsapp-session');
    if (!auth.valid || !auth.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, reason } = body;

    if (!action || (action !== 'enable' && action !== 'disable')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "enable" or "disable"' },
        { status: 400 }
      );
    }

    const enabled = action === 'enable';
    const adminEmail = auth.session.email;

    // Update kill switch via repository
    const killSwitch = await whatsappRepository.updateKillSwitchStatus(
      action,
      adminEmail,
      reason
    );

    console.log(`🛑 Kill switch ${action}d by ${adminEmail}`);

    return NextResponse.json({
      success: true,
      killSwitch
    });

  } catch (error) {
    console.error('❌ Kill switch POST error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle kill switch' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to check kill switch status (for use in other APIs)
 * Returns true if sending is DISABLED
 */
export async function isKillSwitchEnabled(): Promise<{ enabled: boolean; reason?: string }> {
  const status = await whatsappRepository.getKillSwitchStatus();
  return {
    enabled: status.enabled,
    reason: status.reason
  };
}
