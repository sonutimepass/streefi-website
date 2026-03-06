/**
 * Signed Tracking Token System
 * 
 * Prevents fake/guessable click tracking URLs.
 * 
 * ARCHITECTURE:
 * - Token format: base64(campaignId|recipientId|expiry|HMAC)
 * - HMAC prevents tampering
 * - Expiry prevents replay attacks
 * - Opaque tokens prevent URL guessing
 * 
 * USAGE:
 * ```
 * // Generate token for WhatsApp message
 * const token = generateTrackingToken(campaignId, recipientId);
 * const link = `https://streefi.in/r/${token}`;
 * 
 * // Verify token in redirect endpoint
 * const payload = verifyTrackingToken(token);
 * if (!payload) return 404;
 * ```
 * 
 * SECURITY:
 * - 7-day expiry (campaigns have limited lifetime)
 * - HMAC-SHA256 signature
 * - Secret from environment variable
 */

import { createHmac, timingSafeEqual } from 'crypto';

const SECRET = process.env.TRACKING_TOKEN_SECRET || 'streefi-tracking-secret-change-in-production';
const TOKEN_LIFETIME_DAYS = 7;

export interface TrackingTokenPayload {
  campaignId: string;
  recipientId: string;
  expiry: number;
}

/**
 * Generate signed tracking token
 */
export function generateTrackingToken(
  campaignId: string,
  recipientId: string
): string {
  const expiry = Math.floor(Date.now() / 1000) + (TOKEN_LIFETIME_DAYS * 24 * 60 * 60);
  
  // Create payload: campaignId|recipientId|expiry
  const payload = `${campaignId}|${recipientId}|${expiry}`;
  
  // Generate HMAC signature
  const hmac = createHmac('sha256', SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  
  // Combine payload + signature
  const tokenData = `${payload}|${signature}`;
  
  // Base64url encode (URL-safe)
  const token = Buffer.from(tokenData)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return token;
}

/**
 * Verify and decode tracking token
 * Returns null if invalid/expired
 */
export function verifyTrackingToken(token: string): TrackingTokenPayload | null {
  try {
    // Decode base64url
    const base64 = token
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    // Add padding if needed
    const padded = base64 + '==='.slice((base64.length + 3) % 4);
    const tokenData = Buffer.from(padded, 'base64').toString('utf-8');
    
    // Parse payload
    const parts = tokenData.split('|');
    if (parts.length !== 4) {
      console.error('[TrackingToken] Invalid token format');
      return null;
    }
    
    const [campaignId, recipientId, expiryStr, providedSignature] = parts;
    const expiry = parseInt(expiryStr, 10);
    
    if (isNaN(expiry)) {
      console.error('[TrackingToken] Invalid expiry');
      return null;
    }
    
    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (now > expiry) {
      console.error('[TrackingToken] Token expired');
      return null;
    }
    
    // Verify HMAC signature
    const payload = `${campaignId}|${recipientId}|${expiry}`;
    const hmac = createHmac('sha256', SECRET);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    // Timing-safe comparison to prevent timing attacks
    if (!timingSafeEqual(
      Buffer.from(providedSignature),
      Buffer.from(expectedSignature)
    )) {
      console.error('[TrackingToken] Invalid signature');
      return null;
    }
    
    // Token is valid
    return {
      campaignId,
      recipientId,
      expiry
    };
    
  } catch (error) {
    console.error('[TrackingToken] Token verification error:', error);
    return null;
  }
}

/**
 * Generate tracking URL for campaign message
 */
export function generateTrackingUrl(
  campaignId: string,
  recipientId: string,
  baseUrl: string = 'https://streefi.in'
): string {
  const token = generateTrackingToken(campaignId, recipientId);
  return `${baseUrl}/r/${token}`;
}
