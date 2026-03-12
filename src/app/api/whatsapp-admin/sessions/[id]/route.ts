/**
 * Session Management API — Single Resource
 *
 * DELETE /api/whatsapp-admin/sessions/[id] — Revoke (force-logout) a session
 *
 * A super_admin can revoke any session.
 * A regular admin can only revoke their own sessions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSessionWithBypass } from '@/lib/adminAuth';
import { sessionRepository } from '@/lib/repositories/sessionRepository';
import { adminRepository } from '@/lib/repositories/adminRepository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await validateAdminSessionWithBypass(req, 'whatsapp-session');
  if (!auth.valid || !auth.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: sessionId } = await params;

  // Validate the session ID format to prevent arbitrary DynamoDB key injection
  if (!sessionId.startsWith('sess_') || sessionId.length < 10) {
    return NextResponse.json({ error: 'Invalid session ID' }, { status: 400 });
  }

  // Look up the target session to enforce ownership / role rules
  const target = await sessionRepository.getSessionById(sessionId);
  if (!target) {
    // Return 404 — session not found or already expired
    return NextResponse.json({ error: 'Session not found or already expired' }, { status: 404 });
  }

  // Determine caller's role
  const callerRecord = await adminRepository.getAdminByEmail(auth.session.email);
  const callerRole = callerRecord?.role ?? 'admin';

  // Regular admins may only revoke their own sessions
  if (callerRole !== 'super_admin' && target.email !== auth.session.email) {
    return NextResponse.json({ error: 'Forbidden: cannot revoke another user\'s session' }, { status: 403 });
  }

  try {
    await sessionRepository.deleteSession(sessionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SessionsAPI] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
  }
}
