/**
 * Session Management API — Collection
 *
 * GET /api/whatsapp-admin/sessions          — List all active sessions
 * GET /api/whatsapp-admin/sessions?type=... — Filter by "whatsapp-session" | "email-session"
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSessionWithBypass } from '@/lib/adminAuth';
import { sessionRepository } from '@/lib/repositories/sessionRepository';

export async function GET(req: NextRequest) {
  const auth = await validateAdminSessionWithBypass(req, 'whatsapp-session');
  if (!auth.valid || !auth.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const type = new URL(req.url).searchParams.get('type') ?? undefined;
  const ALLOWED_TYPES = ['whatsapp-session', 'email-session'];
  if (type && !ALLOWED_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type filter' }, { status: 400 });
  }

  try {
    const sessions = await sessionRepository.listActiveSessions(type);
    return NextResponse.json({ sessions, total: sessions.length });
  } catch (error) {
    console.error('[SessionsAPI] GET error:', error);
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
  }
}
