/**
 * Meta Webhook Signature Verifier
 * 
 * Verifies X-Hub-Signature-256 header sent by Meta on every webhook POST.
 * 
 * Security:
 * - Uses timing-safe comparison to prevent side-channel attacks
 * - Validates HMAC-SHA256 signature of raw request body
 * - Required for production to prevent spoofed webhooks
 * 
 * Reference:
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify Meta webhook signature
 * 
 * @param rawBody - Raw request body (must be exact string Meta signed)
 * @param signature - X-Hub-Signature-256 header value
 * @param appSecret - WHATSAPP_APP_SECRET environment variable
 * @returns true if signature is valid, false otherwise
 */
export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string
): boolean {
  if (!signature) {
    console.warn('⚠️ No signature header provided');
    return false;
  }

  if (!appSecret) {
    console.error('❌ WHATSAPP_APP_SECRET not configured');
    return false;
  }

  try {
    // Calculate expected signature
    const expectedSignature = 'sha256=' + createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    // Timing-safe comparison (prevents timing attacks)
    const isValid = signature.length === expectedSignature.length &&
      timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );

    if (!isValid) {
      console.warn('⚠️ Webhook signature verification failed');
      console.warn('Signature preview:', signature.substring(0, 20) + '...');
      console.warn('Expected preview:', expectedSignature.substring(0, 20) + '...');
    }

    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}
