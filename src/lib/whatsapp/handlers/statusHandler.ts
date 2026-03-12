/**
 * Message Status Handler (Orchestrator)
 * 
 * Central orchestrator for message status updates.
 * Coordinates between persistence, campaign tracking, and quality monitoring.
 * 
 * Status flow:
 * sent → delivered → read → failed
 * 
 * Responsibilities:
 * 1. Persist status to database (data layer)
 * 2. Campaign analytics tracking (business logic)
 * 3. Quality monitoring and circuit breaker (quality layer)
 * 
 * Architecture:
 * Webhook → Router → Messages Handler → Status Handler (THIS)
 *                                           ↓
 *                                        Persistence
 *                                           ↓
 *                                        Campaign Logic
 *                                           ↓
 *                                        Quality Monitoring
 */

import { whatsappRepository } from '@/lib/repositories/whatsappRepository';
import { WebhookStatus } from '../metaTypes';
import { handleMessageStatus as handleCampaignTracking } from '../webhookStatusHandler';

/**
 * Process array of status updates from webhook
 * Central orchestrator - coordinates persistence, campaign tracking, and monitoring
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
 * Orchestrates: DB persistence → Campaign tracking → Quality monitoring
 */
async function processStatusUpdate(status: WebhookStatus): Promise<void> {
  try {
    // STEP 1: Persist status to database (data layer)
    await whatsappRepository.updateMessageStatus({
      messageId: status.id,
      status: status.status,
      timestamp: parseInt(status.timestamp, 10) * 1000 // Convert to milliseconds
    });

    // Log only failed statuses and blocks (critical events)
    if (status.status === 'failed' && status.errors && status.errors.length > 0) {
      const error = status.errors[0];
      console.error(`❌ Status failed: ${status.id} | ${error.title} (${error.code})`);
    }

    // STEP 2: Campaign tracking and quality monitoring (business logic layer)
    // Handles: campaign metrics, block tracking, circuit breaker, analytics
    await handleCampaignTracking(status as any);

  } catch (error) {
    console.error(`❌ Failed to process status for ${status.id}:`, error);
    // Continue processing other statuses
  }
}
