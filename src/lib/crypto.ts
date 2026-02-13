import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

/**
 * Security Utilities for Password Hashing and Token Generation
 * Uses Node.js built-in crypto module (no external dependencies)
 */

// ========================================
// PASSWORD HASHING (PBKDF2)
// ========================================

const SALT_LENGTH = 32;
const ITERATIONS = 100000; // Recommended by OWASP
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

/**
 * Hash a password using PBKDF2
 * @param password - Plain text password
 * @returns Hashed password string (format: salt:hash)
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a hash
 * @param password - Plain text password to verify
 * @param storedHash - Previously hashed password (format: salt:hash)
 * @returns true if password matches, false otherwise
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, originalHash] = storedHash.split(':');
    
    if (!salt || !originalHash) {
      return false;
    }
    
    const hash = pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
    
    // Timing-safe comparison to prevent timing attacks
    return timingSafeEqual(hash, originalHash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

// ========================================
// CSRF TOKEN GENERATION
// ========================================

/**
 * Generate a cryptographically secure CSRF token
 * @param length - Token length in bytes (default: 32)
 * @returns Hex-encoded random token
 */
export function generateCSRFToken(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a session token for authentication
 * @returns Secure random session token
 */
export function generateSessionToken(): string {
  return randomBytes(48).toString('hex');
}

// ========================================
// TOKEN HASHING (for storage)
// ========================================

/**
 * Hash a token for secure storage
 * @param token - Token to hash
 * @returns SHA-256 hash of the token
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Verify a token against its hash
 * @param token - Plain token
 * @param hashedToken - Stored hash
 * @returns true if token matches hash
 */
export function verifyToken(token: string, hashedToken: string): boolean {
  const hash = hashToken(token);
  return timingSafeEqual(hash, hashedToken);
}

// ========================================
// UTILITY: Generate Admin Password Hash
// ========================================

/**
 * Helper to generate a hashed password for environment variables
 * Run this once to generate a hash for WA_ADMIN_PASSWORD_HASH
 * 
 * Example usage:
 * ```
 * import { hashPassword } from '@/lib/crypto';
 * console.log(hashPassword('your-password-here'));
 * ```
 */
export function generateAdminPasswordHash(password: string): string {
  return hashPassword(password);
}
