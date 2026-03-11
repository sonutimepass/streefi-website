import { NextRequest, NextResponse } from 'next/server';

/**
 * Centralized API Auth Enforcement (VULN-017)
 *
 * Runs on the Edge before any route handler.
 * Performs a fast cookie-presence check as a safety net — if a new route
 * handler ever forgets to call validateAdminSession(), this middleware
 * still blocks unauthenticated callers.
 *
 * NOTE: This only checks cookie existence, NOT validity.
 *       Full DynamoDB session validation (expiry, type, status) still
 *       happens inside each route handler via validateAdminSession().
 */

const WA_SESSION_COOKIE = 'wa_admin_session';
const EMAIL_SESSION_COOKIE = 'email_admin_session';

/**
 * Paths within /api/campaigns/ that use server-to-server authentication
 * (DISPATCHER_SECRET_KEY) and must not require a browser session cookie.
 */
const CAMPAIGNS_COOKIE_EXEMPT = [
  '/api/campaigns/dispatch',
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── WhatsApp Admin & Campaign routes ────────────────────────────────────
  // Require wa_admin_session cookie to be present.
  if (
    pathname.startsWith('/api/whatsapp-admin/') ||
    pathname.startsWith('/api/campaigns/')
  ) {
    const isExempt = CAMPAIGNS_COOKIE_EXEMPT.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

    if (!isExempt) {
      const cookie = request.cookies.get(WA_SESSION_COOKIE);
      if (!cookie?.value) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
  }

  // ── Email Admin route ────────────────────────────────────────────────────
  // Exact path to avoid matching /api/email-admin-auth/*.
  if (pathname === '/api/email') {
    const cookie = request.cookies.get(EMAIL_SESSION_COOKIE);
    if (!cookie?.value) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match all WA admin sub-routes (kill-switch, settings, templates, …)
    '/api/whatsapp-admin/:path*',
    // Match all campaign sub-routes (list, create, [id]/*, dispatch, …)
    '/api/campaigns/:path*',
    // Match the email sending endpoint (exact — does NOT match /api/email-admin-auth/*)
    '/api/email',
  ],
};
