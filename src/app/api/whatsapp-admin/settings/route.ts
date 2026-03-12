/**
 * System Settings API
 * 
 * Global WhatsApp system configuration:
 * - Rate limits (messages per second)
 * - Default daily caps
 * - System-wide controls
 * 
 * GET  /api/whatsapp-admin/settings - Get current settings
 * PUT  /api/whatsapp-admin/settings - Update settings (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { whatsappRepository, type SystemSettings } from '@/lib/repositories';
import { validateAdminSessionWithBypass } from '@/lib/adminAuth';

/**
 * GET - Get current system settings
 */
export async function GET(req: NextRequest) {
  try {
    // Validate admin session (with bypass for local dev)
    const auth = await validateAdminSessionWithBypass(req, 'whatsapp-session');
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get settings from repository (returns defaults if not found)
    const settings = await whatsappRepository.getSystemSettings();

    // Include Meta configuration (server-side only - never expose via NEXT_PUBLIC_)
    const metaConfig = {
      phoneNumberId: process.env.WHATSAPP_PHONE_ID || process.env.META_PHONE_NUMBER_ID || 'Not configured',
      businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || process.env.META_WABA_ID || 'Not configured'
    };

    return NextResponse.json({ settings, metaConfig });

  } catch (error) {
    console.error('❌ Settings GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update system settings
 * Body: Partial<SystemSettings>
 */
export async function PUT(req: NextRequest) {
  try {
    // Validate admin session (with bypass for local dev)
    const auth = await validateAdminSessionWithBypass(req, 'whatsapp-session');
    if (!auth.valid || !auth.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate settings
    if (body.maxMessagesPerSecond !== undefined) {
      const rate = parseInt(body.maxMessagesPerSecond, 10);
      if (isNaN(rate) || rate < 1 || rate > 50) {
        return NextResponse.json(
          { error: 'maxMessagesPerSecond must be between 1 and 50' },
          { status: 400 }
        );
      }
    }

    if (body.defaultDailyCap !== undefined) {
      const cap = parseInt(body.defaultDailyCap, 10);
      if (isNaN(cap) || cap < 1 || cap > 10000) {
        return NextResponse.json(
          { error: 'defaultDailyCap must be between 1 and 10000' },
          { status: 400 }
        );
      }
    }

    if (body.metaTierLimit !== undefined) {
      const limit = parseInt(body.metaTierLimit, 10);
      if (isNaN(limit) || limit < 1) {
        return NextResponse.json(
          { error: 'metaTierLimit must be positive' },
          { status: 400 }
        );
      }
    }

    if (body.safetyBuffer !== undefined) {
      const buffer = parseInt(body.safetyBuffer, 10);
      if (isNaN(buffer) || buffer < 1 || buffer > 100) {
        return NextResponse.json(
          { error: 'safetyBuffer must be between 1 and 100' },
          { status: 400 }
        );
      }
    }

    // Update settings via repository (handles merge and validation)
    const updated = await whatsappRepository.updateSystemSettings(
      body,
      auth.session.email
    );

    console.log(`⚙️ Settings updated by ${auth.session.email}:`, updated);

    return NextResponse.json({
      success: true,
      settings: updated
    });

  } catch (error) {
    console.error('❌ Settings PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get system settings (for use in other APIs)
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  return whatsappRepository.getSystemSettings();
}
