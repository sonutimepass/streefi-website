/**
 * Admin Management API — Collection
 *
 * GET  /api/whatsapp-admin/admins  — List all admin accounts
 * POST /api/whatsapp-admin/admins  — Create a new admin (super_admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSessionWithBypass } from '@/lib/adminAuth';
import { adminRepository } from '@/lib/repositories/adminRepository';
import { createAdmin } from '@/lib/adminService';
import type { AdminRole } from '@/lib/repositories/adminRepository';

const VALID_ROLES: AdminRole[] = ['admin', 'super_admin'];

/** Resolve the authenticated caller's role. */
async function getCallerRole(email: string): Promise<AdminRole | null> {
  const record = await adminRepository.getAdminByEmail(email);
  return record?.role ?? null;
}

/**
 * GET — list all admins (password hashes excluded)
 */
export async function GET(req: NextRequest) {
  const auth = await validateAdminSessionWithBypass(req, 'whatsapp-session');
  if (!auth.valid || !auth.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const admins = await adminRepository.listAllAdmins();
    return NextResponse.json({ admins });
  } catch (error) {
    console.error('[AdminsAPI] GET error:', error);
    return NextResponse.json({ error: 'Failed to list admins' }, { status: 500 });
  }
}

/**
 * POST — create a new admin account (super_admin only)
 * Body: { email: string, password: string, role?: AdminRole }
 */
export async function POST(req: NextRequest) {
  const auth = await validateAdminSessionWithBypass(req, 'whatsapp-session');
  if (!auth.valid || !auth.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only super_admins may create accounts
  const callerRole = await getCallerRole(auth.session.email);
  if (callerRole !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: super_admin role required' }, { status: 403 });
  }

  let body: { email?: unknown; password?: unknown; role?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, password, role = 'admin' } = body;

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'password must be at least 8 characters' }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role as AdminRole)) {
    return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
  }

  // Basic email format guard
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
  }

  try {
    await createAdmin(email.trim(), password, role as AdminRole);
    return NextResponse.json({ success: true, email: email.trim().toLowerCase() }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'ConditionalCheckFailedException') {
      return NextResponse.json({ error: 'An admin with that email already exists' }, { status: 409 });
    }
    console.error('[AdminsAPI] POST error:', error);
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 });
  }
}
