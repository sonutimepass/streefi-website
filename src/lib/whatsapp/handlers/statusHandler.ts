/**
 * Message Status Handler
 * 
 * Handles delivery status updates for sent messages.
 * 
 * Status flow:
 * sent → delivered → read
 * 
 * Updates existing message items (does not create new records).
 */

import { whatsappRepository } from '@/lib/repositories/whatsappRepository';
import { WebhookStatus } from '../metaTypes';

/**
 * Process array of status updates from webhook
 */
export async function handleMessageStatuses(statuses: WebhookStatus[]): Promise<void> {
  try {
    for (const status of statuses) {
      await processStatusUpdate(status);
    }
  } catch (error) {
    console.error('❌ Error handling message statuses:', error);
    // Don't throw - webhook must return 200
  }
}

/**
 * Process single status update
 */
async function processStatusUpdate(status: WebhookStatus): Promise<void> {
  console.log(`📊 Status update: ${status.id} → ${status.status}`);

  try {
    await whatsappRepository.updateMessageStatus({
      messageId: status.id,
      status: status.status,
      timestamp: parseInt(status.timestamp, 10)
    });

    console.log(`✅ Updated message status: ${status.id} → ${status.status}`);
  } catch (error) {
    console.error(`❌ Failed to update status for ${status.id}:`, error);
    // Continue processing other statuses
  }
}
