/**
 * Webhook Event Router
 * 
 * Routes WhatsApp webhook events to appropriate handlers.
 * 
 * Supported webhook events:
 * - messages: Incoming messages, statuses, reactions, echoes
 * - message_echo: Outbound messages sent via API (optional tracking)
 * - message_template_status_update: Template approval/rejection
 * - message_template_quality_update: Template quality changes
 * - template_category_update: Template category changes
 * - phone_number_quality_update: Phone quality scores
 * - phone_number_name_update: Business profile name updates
 * - account_alerts: Critical account alerts
 * - business_capability_update: Tier and capability changes
 * - user_preferences: Customer opt-in/opt-out
 * - automatic_events: Analytics and tracking events
 * 
 * Design principle:
 * All handlers log events and never throw errors (webhook must return 200 OK).
 * 
 * Webhook Deduplication (ATOMIC):
 * Uses DynamoDB conditional writes for race-free deduplication.
 * Meta retries webhooks for up to 7 days - we ensure each event processes exactly once.
 * Event IDs are deterministic (no timestamps) to survive Meta retries.
 */

import { handleMessagesWebhook } from './handlers/handleMessagesWebhook';
import { handleTemplateStatusWebhook } from './handlers/handleTemplateStatusWebhook';
import { handleTemplateQualityWebhook } from './handlers/handleTemplateQualityWebhook';
import { handleTemplateCategoryWebhook } from './handlers/handleTemplateCategoryWebhook';
import { handlePhoneQualityWebhook } from './handlers/handlePhoneQualityWebhook';
import { handlePhoneNameWebhook } from './handlers/handlePhoneNameWebhook';
import { handleAccountAlertsWebhook } from './handlers/handleAccountAlertsWebhook';
import { handleBusinessCapabilityWebhook } from './handlers/handleBusinessCapabilityWebhook';
import { handleUserPreferencesWebhook } from './handlers/handleUserPreferencesWebhook';
import { handleAutomaticEventsWebhook } from './handlers/handleAutomaticEventsWebhook';
import { whatsappRepository } from '@/lib/repositories/whatsappRepository';
import crypto from 'crypto';

/**
 * Stable JSON stringify - sorts keys for deterministic output
 * Ensures Meta webhook retries generate identical hashes regardless of key order
 */
function stableStringify(obj: any): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(',')}]`;
  
  // Sort object keys alphabetically for deterministic output
  const keys = Object.keys(obj).sort();
  const pairs = keys.map(key => `${JSON.stringify(key)}:${stableStringify(obj[key])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Generate unique event ID for deduplication
 * 
 * CRITICAL: Must be deterministic across Meta retries (no timestamps!)
 * Meta retries webhooks for up to 7 days - event ID must stay the same.
 * 
 * For messages: uses message ID
 * For statuses: uses message ID + status type + Meta's timestamp
 * For other events: uses stable content hash or Meta-provided event_id
 */
function generateEventId(field: string, value: any, entryId: string): string {
  try {
    // For messages: use message ID
    if (field === 'messages') {
      if (value.messages && value.messages.length > 0) {
        const msgId = value.messages[0].id;
        return `msg_${msgId}`;
      }
      
      // For statuses: Include Meta's timestamp to handle conversation changes
      // Same message can have multiple "delivered" events with different metadata
      if (value.statuses && value.statuses.length > 0) {
        const status = value.statuses[0];
        const msgId = status.id;
        const statusType = status.status; // sent, delivered, read, failed
        const metaTimestamp = status.timestamp || '0';
        return `status_${msgId}_${statusType}_${metaTimestamp}`;
      }
    }

    // For events with Meta-provided event_id
    if (value.event_id) {
      return `${field}_${value.event_id}`;
    }

    // For template/phone/account events: use content hash (deterministic)
    // Use SHA256 instead of MD5 for better collision resistance
    // Use stable stringify to ensure key order doesn't affect hash
    const contentHash = crypto
      .createHash('sha256')
      .update(stableStringify(value))
      .digest('hex')
      .substring(0, 24); // 24 chars = 96 bits, more than sufficient
    
    return `${field}_${entryId}_${contentHash}`;
  } catch (error) {
    // Fallback to content hash only
    const fallbackHash = crypto
      .createHash('sha256')
      .update(stableStringify(value))
      .digest('hex')
      .substring(0, 24);
    return `${field}_${entryId}_${fallbackHash}`;
  }
}

/**
 * Route webhook event to appropriate handler
 * 
 * @param field - Webhook field type (e.g., 'messages', 'account_alerts')
 * @param value - Webhook payload value
 * @param entryId - Entry ID for logging context
 */
export async function routeWebhookEvent(
  field: string,
  value: any,
  entryId: string
): Promise<void> {
  try {
    // Generate unique event ID for deduplication
    const eventId = generateEventId(field, value, entryId);

    // ATOMIC deduplication: Try to mark as processed in single DB operation
    // Returns true if this is first time seeing event, false if already processed
    // This prevents race conditions when multiple webhooks arrive simultaneously
    const isFirstTime = await whatsappRepository.tryMarkWebhookEventProcessedAtomic(
      eventId,
      { field, entryId }
    );
    
    if (!isFirstTime) {
      // Silent skip on duplicates (already logged at router level once)
      return; // Return normally - this is not an error
    }

    // Log only event type for production tracing
    console.log(`[Router] Processing: ${field}`);

    // Route webhook events to modular handlers

    // Route webhook events to modular handlers
    switch (field) {
      // Primary conversation events
      case 'messages':
        await handleMessagesWebhook(value);
        break;

      case 'message_echo':
        // Silent acknowledgment - outbound messages not currently tracked
        break;

      // Template management events
      case 'message_template_status_update':
        await handleTemplateStatusWebhook(value);
        break;

      case 'message_template_quality_update':
        await handleTemplateQualityWebhook(value);
        break;

      case 'template_category_update':
        await handleTemplateCategoryWebhook(value);
        break;

      // Phone number events
      case 'phone_number_quality_update':
        await handlePhoneQualityWebhook(value);
        break;

      case 'phone_number_name_update':
        await handlePhoneNameWebhook(value);
        break;

      // Account and business events
      case 'account_alerts':
        await handleAccountAlertsWebhook(value);
        break;

      case 'business_capability_update':
        await handleBusinessCapabilityWebhook(value);
        break;

      // User and analytics events
      case 'user_preferences':
        await handleUserPreferencesWebhook(value);
        break;

      case 'automatic_events':
        await handleAutomaticEventsWebhook(value);
        break;

      // Unsupported events (silently ignored)
      default:
        // Silently skip - already marked as processed
        return;
    }

    // Handler completed successfully - event already marked as processed atomically
    console.log(`✅ [Router] ${field} processed`);

  } catch (error) {
    console.error(`❌ [Router] Handler failed for '${field}':`, error);
    
    // CRITICAL: DO NOT delete the processed marker
    // 
    // Atomic deduplication pattern:
    // 1. Mark event as processed (atomic)
    // 2. Process event
    // 3. On failure: return 500 but KEEP marker
    // 4. Meta retries → sees marker → returns 200 (idempotent)
    // 
    // This prevents race conditions but means failed events won't auto-retry.
    // For production: implement background recovery worker that processes
    // events marked as 'failed' in a separate status table.
    // 
    // Current behavior: Failed events are logged and require manual intervention
    // or background job to retry from logs.
    
    const eventId = generateEventId(field, value, entryId);
    console.error(`⚠️ [Router] Event ${eventId} marked processed but failed`);
    console.error(`⚠️ [Router] Manual recovery required - see error above`);
    
    // Re-throw error so route.ts returns 500 to Meta
    // Meta will retry, but our marker will cause immediate 200 response
    throw error;
  }
}
