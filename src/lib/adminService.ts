/**
 * Admin Service
 *
 * Helper functions for multi-admin authentication.
 * Wraps adminRepository with password hashing utilities.
 */

import { adminRepository } from './repositories/adminRepository';
import type { AdminRecord, AdminRole } from './repositories/adminRepository';
import { hashPassword, verifyPassword } from './crypto';

export type { AdminRole };

/**
 * Look up an admin by email address.
 * Returns null if the admin does not exist.
 */
export async function getAdminByEmail(email: string): Promise<AdminRecord | null> {
  if (!email || typeof email !== 'string') return null;
  return adminRepository.getAdminByEmail(email);
}

/**
 * Create a new admin record.
 * Hashes the password before storing.
 * Throws if the email already exists.
 */
export async function createAdmin(
  email: string,
  password: string,
  role: AdminRole = 'admin'
): Promise<void> {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const passwordHash = hashPassword(password);
  await adminRepository.createAdminRecord(email, passwordHash, role);
}

/**
 * Verify a plain-text password against a stored PBKDF2 hash.
 */
export function verifyAdminPassword(password: string, hash: string): boolean {
  return verifyPassword(password, hash);
}
