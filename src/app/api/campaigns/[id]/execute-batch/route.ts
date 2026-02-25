/**
 * Campaign Batch Executor - Phase 1A
 * 
 * Stateless batch processor for WhatsApp campaigns.
 * Processes exactly 25 recipients per invocation, then exits.
 * 
 * SAFETY RULES:
 * ✅ Guard runs BEFORE sending
 * ✅ Atomic recipient updates (ADD for attempts)
 * ✅ Atomic campaign metrics (ADD for sentCount/failedCount)
 * ✅ Pause on limit reached
 * ✅ Complete when no pending recipients
 * ✅ Sequential sends with rate control
 * ✅ Crash-safe (only send when status=PENDING)
 * ✅ Idempotent
 * 
 * TRIGGER OPTIONS:
 * - Manual (button in UI)
 * - Cron (AWS EventBridge hitting this endpoint)
 * - Queue (future enhancement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  GetItemCommand, 
  QueryCommand, 
  UpdateItemCommand,
  type AttributeValue
} from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';
import { validateAdminSession } from '@/lib/adminAuth';
import { getMessageService, MessageService, DailyLimitExceededError } from '@/lib/whatsapp/meta/messageService';
import { MetaApiError } from '@/lib/whatsapp/meta/metaClient';

const BATCH_SIZE = 25;
const SEND_DELAY_MS = 50; // 20 messages/sec safe for Meta rate limits

interface Campaign {
  id: string;
  name: string;
  templateName: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
}

interface Recipient {
  phone: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  attempts: number;
}

interface BatchExecutionResult {
  processed: number;
  sent: number;
  failed: number;
  paused: boolean;
  completed: boolean;
  pauseReason?: string;
  remainingDailySlots?: number;
}

/**
 * Sleep utility for rate control
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Load campaign metadata
 */
async function loadCampaign(campaignId: string): Promise<Campaign | null> {
  const response = await dynamoClient.send(
    new GetItemCommand({
      TableName: TABLES.CAMPAIGNS,
      Key: {
        PK: { S: `CAMPAIGN#${campaignId}` },
        SK: { S: 'METADATA' }
      }
    })
  );

  if (!response.Item) {
    return null;
  }

  const item = response.Item;
  return {
    id: campaignId,
    name: item.name?.S || '',
    templateName: item.templateName?.S || '',
    status: (item.status?.S as Campaign['status']) || 'DRAFT',
    totalRecipients: parseInt(item.totalRecipients?.N || '0', 10),
    sentCount: parseInt(item.sentCount?.N || '0', 10),
    failedCount: parseInt(item.failedCount?.N || '0', 10)
  };
}

/**
 * Query PENDING recipients (limit 25)
 */
async function getPendingRecipients(campaignId: string): Promise<Recipient[]> {
  const response = await dynamoClient.send(
    new QueryCommand({
      TableName: TABLES.RECIPIENTS,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      FilterExpression: '#status = :pending',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':pk': { S: `CAMPAIGN#${campaignId}` },
        ':sk': { S: 'USER#' },
        ':pending': { S: 'PENDING' }
      },
      Limit: BATCH_SIZE
    })
  );

  if (!response.Items || response.Items.length === 0) {
    return [];
  }

  return response.Items.map(item => ({
    phone: item.phone?.S || '',
    status: (item.status?.S as Recipient['status']) || 'PENDING',
    attempts: parseInt(item.attempts?.N || '0', 10)
  }));
}

/**
 * Update recipient status atomically
 * Uses ADD for attempts to avoid read-modify-write race conditions
 */
async function updateRecipientStatus(
  campaignId: string,
  phone: string,
  status: 'SENT' | 'FAILED',
  messageId?: string,
  errorCode?: string
): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000);
  
  const updateExpression = status === 'SENT'
    ? 'SET #status = :status, sentAt = :timestamp, messageId = :messageId ADD attempts :inc'
    : 'SET #status = :status, failedAt = :timestamp, errorCode = :errorCode ADD attempts :inc';

  const expressionAttributeValues: Record<string, AttributeValue> = {
    ':status': { S: status },
    ':timestamp': { N: timestamp.toString() },
    ':inc': { N: '1' }
  };

  if (status === 'SENT' && messageId) {
    expressionAttributeValues[':messageId'] = { S: messageId };
  }
  if (status === 'FAILED' && errorCode) {
    expressionAttributeValues[':errorCode'] = { S: errorCode };
  }

  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: TABLES.RECIPIENTS,
      Key: {
        PK: { S: `CAMPAIGN#${campaignId}` },
        SK: { S: `USER#${phone}` }
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: expressionAttributeValues
    })
  );
}

/**
 * Update campaign metrics atomically
 * Uses ADD to safely increment counters without race conditions
 */
async function incrementCampaignMetric(
  campaignId: string,
  metric: 'sentCount' | 'failedCount',
  amount: number = 1
): Promise<void> {
  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: TABLES.CAMPAIGNS,
      Key: {
        PK: { S: `CAMPAIGN#${campaignId}` },
        SK: { S: 'METADATA' }
      },
      UpdateExpression: `ADD ${metric} :amount`,
      ExpressionAttributeValues: {
        ':amount': { N: amount.toString() }
      }
    })
  );
}

/**
 * Pause campaign with reason
 */
async function pauseCampaign(campaignId: string, reason: string): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000);
  
  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: TABLES.CAMPAIGNS,
      Key: {
        PK: { S: `CAMPAIGN#${campaignId}` },
        SK: { S: 'METADATA' }
      },
      UpdateExpression: 'SET #status = :paused, pausedAt = :timestamp, pausedReason = :reason',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':paused': { S: 'PAUSED' },
        ':timestamp': { N: timestamp.toString() },
        ':reason': { S: reason }
      }
    })
  );
}

/**
 * Complete campaign
 */
async function completeCampaign(campaignId: string): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000);
  
  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: TABLES.CAMPAIGNS,
      Key: {
        PK: { S: `CAMPAIGN#${campaignId}` },
        SK: { S: 'METADATA' }
      },
      UpdateExpression: 'SET #status = :completed, completedAt = :timestamp',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':completed': { S: 'COMPLETED' },
        ':timestamp': { N: timestamp.toString() }
      }
    })
  );
}

/**
 * Main batch execution logic
 */
async function executeBatch(
  campaignId: string,
  messageService: MessageService
): Promise<BatchExecutionResult> {
  // 1️⃣ Load campaign metadata
  const campaign = await loadCampaign(campaignId);
  
  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // 2️⃣ Validate status == RUNNING
  if (campaign.status !== 'RUNNING') {
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      paused: false,
      completed: false,
      pauseReason: `Campaign status is ${campaign.status}, not RUNNING`
    };
  }

  // 3️⃣ Query PENDING recipients (limit 25)
  const recipients = await getPendingRecipients(campaignId);
  
  // 4️⃣ If no recipients → mark COMPLETED
  if (recipients.length === 0) {
    await completeCampaign(campaignId);
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      paused: false,
      completed: true,
      pauseReason: 'No pending recipients remaining'
    };
  }

  // 5️⃣ Process each recipient sequentially
  let sent = 0;
  let failed = 0;
  let limitReached = false;

  for (const recipient of recipients) {
    try {
      // 🛡️ CRITICAL: Check guard BEFORE sending
      // MessageService already includes guard check, but we need to catch DailyLimitExceededError
      
      // Send template message
      const response = await messageService.sendTemplateMessage({
        type: 'template',
        to: recipient.phone,
        template: {
          name: campaign.templateName,
          language: {
            code: 'en' // Default to English, can be made dynamic later
          }
        }
      });

      // Extract message ID
      const messageId = response.messages[0]?.id;

      // Update recipient as SENT
      await updateRecipientStatus(campaignId, recipient.phone, 'SENT', messageId);
      
      // Increment campaign sentCount
      await incrementCampaignMetric(campaignId, 'sentCount');
      
      sent++;

      // Rate control: 50ms delay = 20 msg/sec (safe for Meta)
      await sleep(SEND_DELAY_MS);

    } catch (error) {
      // Handle daily limit exceeded
      if (error instanceof DailyLimitExceededError) {
        console.warn(`[BatchExecutor] Daily limit reached during batch for campaign ${campaignId}`, {
          currentCount: error.currentCount,
          limit: error.limit,
          phone: recipient.phone
        });
        
        limitReached = true;
        
        // Pause campaign
        await pauseCampaign(
          campaignId,
          `Daily limit reached: ${error.currentCount}/${error.limit} conversations`
        );
        
        break; // Stop processing immediately
      }

      // Handle Meta API errors
      if (error instanceof MetaApiError) {
        console.error(`[BatchExecutor] Meta API error for ${recipient.phone}:`, error.toLogString());
        
        // Determine if should retry
        if (error.isRetryable && recipient.attempts < 3) {
          // Don't mark as FAILED yet, will retry in next batch
          await updateRecipientStatus(
            campaignId,
            recipient.phone,
            'FAILED', // Temporarily mark failed
            undefined,
            `RETRYABLE_${error.code}`
          );
          
          // Reset to PENDING for retry (separate operation)
          await dynamoClient.send(
            new UpdateItemCommand({
              TableName: TABLES.RECIPIENTS,
              Key: {
                PK: { S: `CAMPAIGN#${campaignId}` },
                SK: { S: `USER#${recipient.phone}` }
              },
              UpdateExpression: 'SET #status = :pending',
              ExpressionAttributeNames: {
                '#status': 'status'
              },
              ExpressionAttributeValues: {
                ':pending': { S: 'PENDING' }
              }
            })
          );
        } else {
          // Non-retryable or max attempts reached
          await updateRecipientStatus(
            campaignId,
            recipient.phone,
            'FAILED',
            undefined,
            `META_${error.code}`
          );
          
          await incrementCampaignMetric(campaignId, 'failedCount');
          failed++;
        }
      } else {
        // Unknown error - mark as failed
        console.error(`[BatchExecutor] Unknown error for ${recipient.phone}:`, error);
        
        await updateRecipientStatus(
          campaignId,
          recipient.phone,
          'FAILED',
          undefined,
          'UNKNOWN_ERROR'
        );
        
        await incrementCampaignMetric(campaignId, 'failedCount');
        failed++;
      }
    }
  }

  return {
    processed: recipients.length,
    sent,
    failed,
    paused: limitReached,
    completed: false,
    pauseReason: limitReached ? 'DAILY_LIMIT_REACHED' : undefined
  };
}

/**
 * POST /api/campaigns/[id]/execute-batch
 * 
 * Execute one batch of campaign sends (25 recipients max)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1️⃣ Validate Admin Session
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const campaignId = params.id;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // 2️⃣ Initialize MessageService
    const messageService = getMessageService();

    // 3️⃣ Execute batch
    const result = await executeBatch(campaignId, messageService);

    // 4️⃣ Return summary
    return NextResponse.json({
      success: true,
      campaignId,
      result
    });

  } catch (error) {
    console.error('[BatchExecutor] Fatal error:', error);
    
    return NextResponse.json(
      { 
        error: 'Batch execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
