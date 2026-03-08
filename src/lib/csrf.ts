import { timingSafeEqual } from 'crypto';
import { generateCSRFToken, hashToken, verifyToken } from './crypto';

/**
 * CSRF Protection Utility
 * Double-submit cookie pattern for stateless CSRF protection
 */

export const CSRF_COOKIE_NAME = 'csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generate a CSRF token pair (token + hash)
 * @returns Object with token (for cookie) and hash (for comparison)
 */
export function createCSRFToken(): { token: string; hash: string } {
  const token = generateCSRFToken();
  const hash = hashToken(token);
  
  return { token, hash };
}

/**
 * Validate CSRF token from request (double-submit cookie pattern).
 * Uses a timing-safe comparison to prevent oracle attacks.
 */
export function validateCSRFToken(
  cookieToken: string | undefined,
  headerToken: string | undefined
): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }
  // Tokens must be the same byte length for timingSafeEqual
  if (cookieToken.length !== headerToken.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken));
  } catch {
    return false;
  }
}

/**
 * Validate CSRF for an incoming Next.js Request.
 * Reads the cookie and the x-csrf-token header and compares them.
 * Returns true (skip check) for GET/HEAD/OPTIONS since they are safe methods.
 */
export function validateRequestCSRF(
  request: Request,
  cookieToken: string | undefined
): boolean {
  const method = request.method.toUpperCase();
  // Safe methods do not need CSRF protection
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }
  const headerToken = request.headers.get(CSRF_HEADER_NAME) ?? undefined;
  return validateCSRFToken(cookieToken, headerToken);
}

/**
 * Validate CSRF token with hash comparison
 * Use this if you store hashed tokens server-side
 * 
 * @param token - Token from request
 * @param storedHash - Hashed token from server storage
 * @returns true if token matches hash
 */
export function validateCSRFTokenWithHash(
  token: string | undefined,
  storedHash: string | undefined
): boolean {
  if (!token || !storedHash) {
    return false;
  }
  
  return verifyToken(token, storedHash);
}

/**
 * Get CSRF token configuration for cookie setting
 */
export function getCSRFCookieConfig(token: string) {
  return {
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: 60 * 60, // 1 hour
    path: '/',
  };
}
