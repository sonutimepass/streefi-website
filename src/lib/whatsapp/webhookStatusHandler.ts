/**
 * Webhook Status Handler
 * 
 * Processes message status updates from Meta's WhatsApp Cloud API webhook.
 * Integrates with block-rate circuit breaker for automatic quality monitoring.
 * 
 * WEBHOOK STATUS CODES (Meta):
 * - sent: Message successfully sent to Meta's servers
 * - delivered: Message delivered to recipient's device
 * - read: Message read by recipient
 * - failed: Message failed to deliver
 * 
 * ERROR CODES (Meta):
 * - 131051: User blocked your number (CRITICAL for circuit breaker)
 * - 131026: Message undeliverable
 * - 131047: Re-engagement message not sent (24hr window expired)
 * - 130472: User's phone number is part of an experiment (rare)
 * - 131045: Unsupported message type
 * 
 * USAGE:
 * ```
 * // In webhook handler
 * for (const status of value.statuses) {
 *   await handleMessageStatus(status);
 * }
 * ```
 */

import { getBlockRateCircuitBreaker } from '@/lib/whatsapp/guards';
import { QueryCommand, UpdateItemCommand, PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';
import { getCampaignMetrics } from '@/lib/whatsapp/campaignMetrics';

// Initialize metrics manager for analytics aggregation
const metricsManager = getCampaignMetrics();

export interface WebhookStatus {
  id: string;                    // Message ID
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;          // Recipient phone number
  errors?: Array<{
    code: number;
    title: string;
    message: string;
    error_data?: {
      details: string;
    };
  }>;
  conversation?: {
    id: string;
    origin: {
      type: string;
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
}

/**
 * Find campaign ID for a given message ID
 * Looks up message ID in campaign logs
 */
async function findCampaignByMessageId(messageId: string): Promise<string | null> {
  return await getCampaignIdFromMessageId(messageId);
}

/**
 * Determine if error code represents a block
 */
function isBlockError(errorCode: number): boolean {
  // Error codes that indicate user blocked the sender
  const blockErrorCodes = [
    131051  // User has blocked messages from this phone number
  ];
  
  return blockErrorCodes.includes(errorCode);
}

/**
 * Determine if error is undeliverable (quality issue)
 */
function isUndeliverableError(errorCode: number): boolean {
  const undeliverableErrorCodes = [
    131026,  // Message undeliverable
    131047,  // Re-engagement message (24hr window issue)
    130472,  // User part of experiment
    131005,  // Access denied (typically policy violation)
  ];
  
  return undeliverableErrorCodes.includes(errorCode);
}

/**
 * Check if message status already processed (idempotency)
 * Key includes error code to capture different failure types
 */
async function isStatusAlreadyProcessed(
  messageId: string,
  statusType: string,
  errorCode?: number
): Promise<boolean> {
  try {
    const sk = errorCode 
      ? `STATUS#${statusType}#${errorCode}`
      : `STATUS#${statusType}`;
    
    const response = await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLES.CAMPAIGNS,
        Key: {
          PK: { S: `MESSAGE_STATUS#${messageId}` },
          SK: { S: sk }
        }
      })
    );
    
    return !!response.Item;
  } catch (error) {
    console.error('[WebhookStatusHandler] Error checking idempotency:', error);
    return false; // On error, process to avoid losing data
  }
}

/**
 * Mark message status as processed (idempotency)
 * Key includes error code to capture different failure types
 */
async function markStatusProcessed(
  messageId: string,
  statusType: string,
  errorCode?: number
): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000);
  const ttl = timestamp + (30 * 24 * 60 * 60); // 30 days
  
  const sk = errorCode 
    ? `STATUS#${statusType}#${errorCode}`
    : `STATUS#${statusType}`;
  
  try {
    await dynamoClient.send(
      new PutItemCommand({
        TableName: TABLES.CAMPAIGNS,
        Item: {
          PK: { S: `MESSAGE_STATUS#${messageId}` },
          SK: { S: sk },
          processedAt: { N: timestamp.toString() },
          ...(errorCode && { errorCode: { N: errorCode.toString() } }),
          ttl: { N: ttl.toString() }
        }
      })
    );
  } catch (error) {
    console.error('[WebhookStatusHandler] Error marking status processed:', error);
    // Don't throw - logging is best-effort
  }
}

/**
 * Main webhook status handler
 */
export async function handleMessageStatus(status: WebhookStatus): Promise<void> {
  console.log(`📊 [WebhookStatusHandler] Processing status: ${status.status} for message ${status.id}`);
  
  try {
    // Extract error code for idempotency key
    const errorCode = (status.status === 'failed' && status.errors && status.errors.length > 0)
      ? status.errors[0].code
      : undefined;
    
    // 🛡️ IDEMPOTENCY CHECK: Prevent double-counting same status
    // Key includes error code to capture different failure types (131026 vs 131051)
    const alreadyProcessed = await isStatusAlreadyProcessed(status.id, status.status, errorCode);
    if (alreadyProcessed) {
      console.log(`⏭️ [WebhookStatusHandler] Status already processed for message ${status.id}, skipping`);
      return;
    }
    
    // Mark as processed FIRST to prevent race conditions
    await markStatusProcessed(status.id, status.status, errorCode);
    
    // Handle failed status (most critical for quality monitoring)
    if (status.status === 'failed' && status.errors && status.errors.length > 0) {
      for (const error of status.errors) {
        console.error(`❌ [WebhookStatusHandler] Message ${status.id} failed:`, {
          code: error.code,
          title: error.title,
          message: error.message,
          recipient: status.recipient_id
        });
        
        // Check if this is a block
        if (isBlockError(error.code)) {
          console.error(`🚫 [WebhookStatusHandler] USER BLOCKED: ${status.recipient_id} blocked message ${status.id}`);
          
          // Try to find the campaign this message belongs to
          const campaignId = await findCampaignByMessageId(status.id);
          
          if (campaignId) {
            console.log(`🔗 [WebhookStatusHandler] Message ${status.id} belongs to campaign ${campaignId}`);
            
            // 📊 ANALYTICS: Increment blocked metric
            await metricsManager.incrementMetric(campaignId, 'blocked').catch((err: unknown) => {
              console.error(`[WebhookStatusHandler] Failed to increment blocked metric:`, err);
            });
            
            // Increment block count for circuit breaker
            const circuitBreaker = getBlockRateCircuitBreaker();
            await circuitBreaker.incrementBlockedCount(campaignId);
            
            console.log(`✅ [WebhookStatusHandler] Block count incremented for campaign ${campaignId}`);
            
            // Check if campaign should be auto-paused
            const blockRateCheck = await circuitBreaker.checkCampaign(campaignId);
            
            if (blockRateCheck.shouldKillSwitch) {
              console.error(`🚨 [WebhookStatusHandler] KILL SWITCH THRESHOLD EXCEEDED for campaign ${campaignId}`);
              console.error(`🚨 [WebhookStatusHandler] Block rate: ${(blockRateCheck.blockRate * 100).toFixed(2)}%`);
              console.error(`🚨 [WebhookStatusHandler] Manual intervention required: Set WHATSAPP_GLOBAL_PAUSE=true`);
              // TODO: Auto-trigger kill switch
            } else if (blockRateCheck.shouldPause) {
              console.warn(`⚠️ [WebhookStatusHandler] Campaign ${campaignId} should be paused (block rate: ${(blockRateCheck.blockRate * 100).toFixed(2)}%)`);
              console.warn(`⚠️ [WebhookStatusHandler] Auto-pause will trigger on next batch execution`);
            }
          } else {
            console.warn(`⚠️ [WebhookStatusHandler] Could not find campaign for blocked message ${status.id}`);
            console.warn(`⚠️ [WebhookStatusHandler] Consider implementing message-to-campaign mapping for better tracking`);
          }
        } else if (isUndeliverableError(error.code)) {
          console.warn(`⚠️ [WebhookStatusHandler] Undeliverable error (code ${error.code}): ${error.message}`);
        }
      }
    }
    
    // Handle delivered status (positive signal)
    if (status.status === 'delivered') {
      console.log(`✅ [WebhookStatusHandler] Message ${status.id} delivered to ${status.recipient_id}`);
      
      // 📊 ANALYTICS: Increment delivered metric
      const campaignId = await findCampaignByMessageId(status.id);
      if (campaignId) {
        await metricsManager.incrementMetric(campaignId, 'delivered').catch((err: unknown) => {
          console.error(`[WebhookStatusHandler] Failed to increment delivered metric for campaign ${campaignId}:`, err);
        });
      }
    }
    
    // Handle read status (best signal - user engaged)
    if (status.status === 'read') {
      console.log(`👀 [WebhookStatusHandler] Message ${status.id} read by ${status.recipient_id}`);
      
      // 📊 ANALYTICS: Increment read metric
      const campaignId = await findCampaignByMessageId(status.id);
      if (campaignId) {
        await metricsManager.incrementMetric(campaignId, 'read').catch((err: unknown) => {
          console.error(`[WebhookStatusHandler] Failed to increment read metric for campaign ${campaignId}:`, err);
        });
      }
    }
    
    // Log pricing info if available (for cost tracking)
    if (status.pricing) {
      console.log(`💰 [WebhookStatusHandler] Message ${status.id} pricing:`, {
        billable: status.pricing.billable,
        category: status.pricing.category,
        model: status.pricing.pricing_model
      });
    }
    
  } catch (error) {
    console.error('[WebhookStatusHandler] Error processing status:', error);
    // Don't throw - webhook processing should be resilient
  }
}

/**
 * Calculate shard for message ID to distribute load across partitions
 * Prevents single-partition hotspot at scale
 */
function getMessageShard(messageId: string): number {
  // Simple hash: sum of char codes % 10
  let hash = 0;
  for (let i = 0; i < messageId.length; i++) {
    hash += messageId.charCodeAt(i);
  }
  return hash % 10;
}

/**
 * Enhanced message logging with webhook tracking (SHARDED)
 * Store message ID → campaign ID mapping for webhook lookups
 * 
 * 🚨 SCALABILITY FIX: Uses sharded partition keys to prevent hotspot
 * Instead of: PK=MESSAGE#{messageId}
 * Uses: PK=MSG#{shard}, SK={messageId}
 * 
 * This distributes writes across 10 partitions instead of 1.
 */
export async function logMessageForWebhookTracking(
  campaignId: string,
  messageId: string,
  recipientPhone: string
): Promise<void> {
  try {
    const shard = getMessageShard(messageId);
    
    // 🚨 SHARDED KEY: Distributes load across partitions
    await dynamoClient.send(
      new UpdateItemCommand({
        TableName: TABLES.CAMPAIGNS,
        Key: {
          PK: { S: `MSG#${shard}` },
          SK: { S: messageId }
        },
        UpdateExpression: 'SET campaignId = :campaignId, recipientPhone = :phone, createdAt = :timestamp, #ttl = :ttl',
        ExpressionAttributeNames: {
          '#ttl': 'ttl'
        },
        ExpressionAttributeValues: {
          ':campaignId': { S: campaignId },
          ':phone': { S: recipientPhone },
          ':timestamp': { N: Math.floor(Date.now() / 1000).toString() },
          ':ttl': { N: (Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60)).toString() } // 30 days TTL
        }
      })
    );
    
    console.log(`🔗 [WebhookTracking] Stored message mapping (shard ${shard}): ${messageId} → campaign ${campaignId}`);
  } catch (error) {
    console.error('[WebhookTracking] Failed to store message mapping:', error);
    // Don't throw - this is auxiliary tracking
  }
}

/**
 * Lookup campaign ID by message ID (for webhook processing)
 * Uses sharded key lookup
 */
export async function getCampaignIdFromMessageId(messageId: string): Promise<string | null> {
  try {
    const shard = getMessageShard(messageId);
    
    const response = await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLES.CAMPAIGNS,
        Key: {
          PK: { S: `MSG#${shard}` },
          SK: { S: messageId }
        }
      })
    );
    
    if (response.Item && response.Item.campaignId?.S) {
      return response.Item.campaignId.S;
    }
    
    console.warn(`⚠️ [WebhookTracking] No campaign found for message ${messageId} (shard ${shard})`);
    return null;
  } catch (error) {
    console.error('[WebhookTracking] Error looking up campaign:', error);
    return null;
  }
}
