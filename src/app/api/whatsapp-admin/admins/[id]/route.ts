/**
 * Admin Management API — Single Resource
 *
 * PUT    /api/whatsapp-admin/admins/[id]  — Update role or password (super_admin only)
 * DELETE /api/whatsapp-admin/admins/[id]  — Delete admin (super_admin only, cannot self-delete)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { adminRepository } from '@/lib/repositories/adminRepository';
import { hashPassword } from '@/lib/crypto';
import type { AdminRole } from '@/lib/repositories/adminRepository';

const VALID_ROLES: AdminRole[] = ['admin', 'super_admin'];

async function getCallerRole(email: string): Promise<AdminRole | null> {
  const record = await adminRepository.getAdminByEmail(email);
  return record?.role ?? null;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT — update role and/or password (super_admin only)
 * Body: { role?: AdminRole, password?: string }
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await validateAdminSession(req, 'whatsapp-session');
  if (!auth.valid || !auth.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const callerRole = await getCallerRole(auth.session.email);
  if (callerRole !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: super_admin role required' }, { status: 403 });
  }

  const { id: targetId } = await params;

  // Validate target exists
  const target = await adminRepository.getAdminById(targetId);
  if (!target) {
    return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
  }

  let body: { role?: unknown; password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { role, password } = body;

  if (role === undefined && password === undefined) {
    return NextResponse.json({ error: 'Provide role and/or password to update' }, { status: 400 });
  }

  // Update role
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role as AdminRole)) {
      return NextResponse.json({ error: `role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 });
    }
    // Prevent a super_admin from demoting themselves
    if (targetId.toLowerCase() === auth.session.email.toLowerCase() && role !== 'super_admin') {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
    }
    try {
      await adminRepository.updateAdminRole(targetId, role as AdminRole);
    } catch (error) {
      console.error('[AdminsAPI] PUT role error:', error);
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
    }
  }

  // Update password
  if (password !== undefined) {
    if (typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'password must be at least 8 characters' }, { status: 400 });
    }
    try {
      const hash = hashPassword(password);
      await adminRepository.updateAdminPassword(targetId, hash);
    } catch (error) {
      console.error('[AdminsAPI] PUT password error:', error);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE — remove an admin account (super_admin only, cannot self-delete)
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  const auth = await validateAdminSession(req, 'whatsapp-session');
  if (!auth.valid || !auth.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const callerRole = await getCallerRole(auth.session.email);
  if (callerRole !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden: super_admin role required' }, { status: 403 });
  }

  const { id: targetId } = await params;

  // Prevent self-deletion
  if (targetId.toLowerCase() === auth.session.email.toLowerCase()) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  // Verify target exists
  const target = await adminRepository.getAdminById(targetId);
  if (!target) {
    return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
  }

  try {
    await adminRepository.deleteAdmin(targetId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[AdminsAPI] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete admin' }, { status: 500 });
  }
}
