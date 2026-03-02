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
  PutItemCommand,
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
 * Claim recipient for processing (optimistic lock)
 * Returns true if claimed successfully, false if already claimed by another execution
 */
async function claimRecipient(campaignId: string, phone: string): Promise<boolean> {
  try {
    await dynamoClient.send(
      new UpdateItemCommand({
        TableName: TABLES.RECIPIENTS,
        Key: {
          PK: { S: `CAMPAIGN#${campaignId}` },
          SK: { S: `USER#${phone}` }
        },
        UpdateExpression: 'SET #status = :processing',
        ConditionExpression: '#status = :pending',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':processing': { S: 'PROCESSING' },
          ':pending': { S: 'PENDING' }
        }
      })
    );
    return true;
  } catch (error: any) {
    // ConditionalCheckFailedException means another execution already claimed it
    if (error.name === 'ConditionalCheckFailedException') {
      return false;
    }
    throw error;
  }
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
 * Write log entry for observability (Phase UI-3)
 * Stored as: PK=CAMPAIGN#${id}, SK=LOG#${timestamp}#${phone}
 */
async function writeLogEntry(
  campaignId: string,
  phone: string,
  status: 'SENT' | 'FAILED' | 'PROCESSING',
  messageId?: string,
  errorCode?: string,
  errorMessage?: string,
  metaResponse?: string,
  attempts?: number
): Promise<void> {
  const timestamp = new Date().toISOString();
  const timestampMs = Date.now();
  
  const item: Record<string, AttributeValue> = {
    PK: { S: `CAMPAIGN#${campaignId}` },
    SK: { S: `LOG#${timestampMs}#${phone}` },
    timestamp: { S: timestamp },
    phone: { S: phone },
    status: { S: status }
  };

  if (messageId) {
    item.messageId = { S: messageId };
  }

  if (errorCode) {
    item.errorCode = { S: errorCode };
  }

  if (errorMessage) {
    item.errorMessage = { S: errorMessage };
  }

  if (metaResponse) {
    item.metaResponse = { S: metaResponse };
  }

  if (attempts !== undefined) {
    item.attempts = { N: attempts.toString() };
  }

  try {
    await dynamoClient.send(
      new PutItemCommand({
        TableName: TABLES.CAMPAIGNS,
        Item: item
      })
    );
  } catch (error) {
    // Log write failures shouldn't stop execution
    console.error(`[LogWriter] Failed to write log for ${phone}:`, error);
  }
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
  console.log('📥 [Batch Executor] Loading campaign metadata...');
  // 1️⃣ Load campaign metadata
  const campaign = await loadCampaign(campaignId);
  
  if (!campaign) {
    console.error('❌ [Batch Executor] Campaign not found:', campaignId);
    throw new Error('Campaign not found');
  }
  console.log('📊 [Batch Executor] Campaign loaded:', { id: campaign.id, status: campaign.status, template: campaign.templateName });

  // 2️⃣ Validate status == RUNNING
  if (campaign.status !== 'RUNNING') {
    console.log('⚠️ [Batch Executor] Campaign not RUNNING:', campaign.status);
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
  console.log('🔍 [Batch Executor] Querying pending recipients...');
  const recipients = await getPendingRecipients(campaignId);
  console.log(`📊 [Batch Executor] Found ${recipients.length} pending recipients`);
  
  // 4️⃣ If no recipients → mark COMPLETED
  if (recipients.length === 0) {
    console.log('✅ [Batch Executor] No pending recipients, marking campaign as COMPLETED');
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
  console.log('📨 [Batch Executor] Starting recipient processing...');
  let sent = 0;
  let failed = 0;
  let limitReached = false;
  let processed = 0; // Track actually processed (claimed)

  for (const recipient of recipients) {
    try {
      // 🔒 CRITICAL: Claim recipient atomically (optimistic lock)
      // This prevents race conditions in parallel executions
      const claimed = await claimRecipient(campaignId, recipient.phone);
      
      if (!claimed) {
        // Another execution already claimed this recipient
        console.log(`⚠️ [Batch Executor] Recipient ${recipient.phone} already claimed, skipping`);
        continue;
      }
      
      console.log(`📨 [Batch Executor] Processing ${recipient.phone} (attempt ${recipient.attempts + 1})...`);
      processed++; // Successfully claimed
      
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
      console.log(`✅ [Batch Executor] Sent to ${recipient.phone}, Message ID: ${messageId}`);

      // Update recipient as SENT
      await updateRecipientStatus(campaignId, recipient.phone, 'SENT', messageId);
      
      // Increment campaign sentCount
      await incrementCampaignMetric(campaignId, 'sentCount');
      
      // Write log entry for observability
      await writeLogEntry(
        campaignId,
        recipient.phone,
        'SENT',
        messageId,
        undefined,
        undefined,
        JSON.stringify(response),
        recipient.attempts + 1
      );
      
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
          
          // Write log entry for retry
          await writeLogEntry(
            campaignId,
            recipient.phone,
            'FAILED',
            undefined,
            `RETRYABLE_${error.code}`,
            `${error.message} (Will retry)`,
            error.toLogString(),
            recipient.attempts + 1
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
          
          // Write log entry for permanent failure
          await writeLogEntry(
            campaignId,
            recipient.phone,
            'FAILED',
            undefined,
            `META_${error.code}`,
            error.message,
            error.toLogString(),
            recipient.attempts + 1
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
        
        // Write log entry for unknown error
        await writeLogEntry(
          campaignId,
          recipient.phone,
          'FAILED',
          undefined,
          'UNKNOWN_ERROR',
          error instanceof Error ? error.message : 'Unknown error occurred',
          undefined,
          recipient.attempts + 1
        );
        
        await incrementCampaignMetric(campaignId, 'failedCount');
        failed++;
      }
    }
  }

  console.log(`🏁 [Batch Executor] Batch complete: ${sent} sent, ${failed} failed, ${processed} processed`);
  return {
    processed, // Use actual claimed count, not recipients.length
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
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 [Execute Batch API] Request received');
  try {
    // 1️⃣ Validate Admin Session
    console.log('🔐 [Execute Batch API] Validating admin session...');
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // 2️⃣ Initialize MessageService
    console.log('📦 [Execute Batch API] Campaign ID:', campaignId);
    console.log('⚙️ [Execute Batch API] Initializing message service...');
    const messageService = getMessageService();

    // 3️⃣ Execute batch
    console.log('⚡ [Execute Batch API] Executing batch...');
    const result = await executeBatch(campaignId, messageService);
    console.log('✅ [Execute Batch API] Batch execution completed:', result);

    // 4️⃣ Return summary
    return NextResponse.json({
      success: true,
      campaignId,
      result
    });

  } catch (error) {
    console.error('❌ [Execute Batch API] Fatal error:', error);
    
    return NextResponse.json(
      { 
        error: 'Batch execution failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
