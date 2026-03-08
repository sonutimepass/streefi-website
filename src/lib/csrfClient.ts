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
 * Returns an empty string if the cookie is absent (e.g., not yet logged in).
 */
function readCsrfCookie(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${CSRF_COOKIE_NAME}=`));
  return match ? match.split('=')[1] : '';
}

/**
 * Returns a partial headers object that must be spread into every
 * non-GET fetch call made from the browser.
 *
 * Usage:
 *   fetch('/api/some-endpoint', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json', ...getCsrfHeader() },
 *     ...
 *   })
 */
export function getCsrfHeader(): Record<string, string> {
  const token = readCsrfCookie();
  if (!token) return {};
  return { [CSRF_HEADER_NAME]: token };
}
