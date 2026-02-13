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
 * Validate CSRF token from request
 * @param cookieToken - Token from cookie
 * @param headerToken - Token from request header/body
 * @returns true if tokens match and are valid
 */
export function validateCSRFToken(
  cookieToken: string | undefined,
  headerToken: string | undefined
): boolean {
  if (!cookieToken || !headerToken) {
    return false;
  }
  
  // Both tokens should be identical (double-submit pattern)
  return cookieToken === headerToken;
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
