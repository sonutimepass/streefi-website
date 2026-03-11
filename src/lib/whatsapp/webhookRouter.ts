/**
 * Webhook Event Router
 * 
 * Routes WhatsApp webhook events to appropriate handlers.
 * 
 * Event classification:
 * - PERSISTENT: messages (inbound + statuses) → DynamoDB
 * - LOGGED: 4 critical operational alerts → CloudWatch
 * - IGNORED: 30+ other event types
 * 
 * Design principle:
 * Only store conversation data. Everything else is noise or logged.
 */

import { handleInboundMessages } from './handlers/inboundMessageHandler';
import { handleMessageStatuses } from './handlers/statusHandler';
import { WebhookValue, truncateSafely } from './metaTypes';

/**
 * Critical operational alerts worth logging to CloudWatch
 * 
 * These are actual system signals that may require action.
 * Everything else is ignored.
 */
const CRITICAL_ALERTS = new Set([
  'account_alerts',
  'phone_number_quality_update',
  'message_template_quality_update',
  'tracking_events'
]);

/**
 * Route webhook event to appropriate handler
 * 
 * @param field - Webhook field type (e.g., 'messages', 'account_alerts')
 * @param value - Webhook payload value
 * @param entryId - Entry ID for logging context
 */
export async function routeWebhookEvent(
  field: string,
  value: WebhookValue,
  entryId: string
): Promise<void> {
  try {
    console.log(`🔔 Webhook event: ${field}`);

    // Route: messages (persistent data)
    if (field === 'messages') {
      // Inbound messages from customers
      if (value.messages && value.messages.length > 0) {
        await handleInboundMessages(value.messages, value.contacts);
      }

      // Delivery/read status updates
      if (value.statuses && value.statuses.length > 0) {
        await handleMessageStatuses(value.statuses);
      }

      return;
    }

    // Route: critical operational alerts (CloudWatch logging)
    if (CRITICAL_ALERTS.has(field)) {
      logOperationalAlert(field, value, entryId);
      return;
    }

    // Route: unknown events (silently ignored)
    // No logging for ignored events to reduce noise
    // Includes: account_update, flows, calls, groups, etc.
    
  } catch (error) {
    console.error(`❌ Router error for field '${field}':`, error);
    // Never throw - webhook must always return 200 OK
  }
}

/**
 * Log critical operational alert to CloudWatch
 * 
 * These logs are queryable in AWS CloudWatch Logs.
 * Use for monitoring system health, not debugging.
 */
function logOperationalAlert(
  field: string,
  value: WebhookValue,
  entryId: string
): void {
  try {
    console.info(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: field,
      entryId,
      summary: truncateSafely(value, 200)
    }));
  } catch (error) {
    // Logging failures must never crash webhook
    console.error('Failed to log operational alert:', error);
  }
}
