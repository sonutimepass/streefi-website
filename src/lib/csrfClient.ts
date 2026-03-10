'use client';

/**
 * Client-side CSRF utility
 * Reads the CSRF token from the (non-HttpOnly) cookie and returns
 * a headers object to attach to every mutating fetch request.
 */

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Read the CSRF token from the browser cookie store.
 * Returns empty string if cookie is absent (e.g., SSR or not logged in).
 * 
 * More robust parsing that handles cookies without spaces after semicolons.
 */
function readCsrfCookie(): string {
  if (typeof document === 'undefined') return '';
  
  const cookies = document.cookie.split(';');
  
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === CSRF_COOKIE_NAME && value) {
      // Decode in case cookie value is URL-encoded
      try {
        return decodeURIComponent(value);
      } catch {
        return value; // Return raw if decode fails
      }
    }
  }
  
  return '';
}

/**
 * Returns a partial headers object that must be spread into every
 * non-GET fetch call made from the browser.
 *
 * IMPORTANT: Throws error if CSRF token is missing (user not logged in).
 * This fails loudly instead of silently sending requests without tokens.
 *
 * Usage:
 *   fetch('/api/some-endpoint', {
 *     method: 'POST',
 *     credentials: 'include', // REQUIRED for cookies
 *     headers: { 'Content-Type': 'application/json', ...getCsrfHeader() },
 *     ...
 *   })
 */
export function getCsrfHeader(): Record<string, string> {
  const token = readCsrfCookie();
  
  if (!token) {
    console.warn('[CSRF] Token not found in cookies. User may not be logged in.');
    // Return empty object for development flexibility
    // In production, consider throwing error instead
    return {};
  }
  
  return { [CSRF_HEADER_NAME]: token };
}

/**
 * Check if CSRF token exists (useful for debugging)
 */
export function hasCSRFToken(): boolean {
  return readCsrfCookie() !== '';
}

/**
 * Get CSRF token value directly (for debugging)
 */
export function getCSRFToken(): string {
  return readCsrfCookie();
}
