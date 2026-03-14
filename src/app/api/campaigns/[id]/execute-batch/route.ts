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
import { validateAdminSession } from '@/lib/adminAuth';
import { campaignRepository } from '@/lib/repositories/campaignRepository';
import { recipientRepository } from '@/lib/repositories/recipientRepository';
import { whatsappRepository } from '@/lib/repositories/whatsappRepository';
import { sessionRepository } from '@/lib/repositories/sessionRepository';
import { getMessageService, MessageService, DailyLimitExceededError } from '@/lib/whatsapp/meta/messageService';
import { MetaApiError } from '@/lib/whatsapp/meta/metaClient';
import { isKillSwitchEnabled } from '@/lib/whatsapp/kill-switch-utils';
import { getGlobalDailyLimitGuard } from '@/lib/whatsapp/guards';
import { getBlockRateCircuitBreaker } from '@/lib/whatsapp/guards';
import { getAccountWarmupManager } from '@/lib/whatsapp/accountWarmupManager';
import { parseTemplateConfig, selectTemplate } from '@/lib/whatsapp/templateRotation';
import { logMessageForWebhookTracking } from '@/lib/whatsapp/webhookStatusHandler';
import { getGlobalStateManager } from '@/lib/whatsapp/globalStateManager';

// Rate limiting constants (DynamoDB-backed via sessionRepository)
const RATE_LIMIT_MAX_REQUESTS = 5;
const RATE_LIMIT_WINDOW_MINUTES = 1;

const BATCH_SIZE = 25;
const SEND_DELAY_MS = 50; // 20 messages/sec safe for Meta rate limits

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
 * Main batch execution logic
 */
async function executeBatch(
  campaignId: string,
  messageService: MessageService
): Promise<BatchExecutionResult> {
  const now = Math.floor(Date.now() / 1000);
  
  // 🔒 CRITICAL: Acquire execution lock (prevents concurrent batch execution)
  console.log('🔒 [Batch Executor] Attempting to acquire execution lock...');
  const lockAcquired = await campaignRepository.acquireExecutionLock(campaignId, now);
  if (!lockAcquired) {
    console.warn('⚠️ [Batch Executor] Batch execution already in progress');
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      paused: false,
      completed: false,
      pauseReason: 'Batch execution already in progress (locked)'
    };
  }
  console.log('✅ [Batch Executor] Execution lock acquired');

  try {
    // � CRITICAL: Global emergency pause check (environment variable)
    // This allows instant system-wide stop without deploying code
    const globalStateManager = getGlobalStateManager();
    const globalPauseCheck = await globalStateManager.isGloballyPaused();
    
    if (globalPauseCheck.paused) {
      console.error('🚨 [Batch Executor] GLOBAL EMERGENCY PAUSE ACTIVE');
      console.error('🚨 [Batch Executor] Reason:', globalPauseCheck.reason || 'Manual pause');
      
      const campaign = await campaignRepository.getCampaign(campaignId);
      if (campaign && campaign.campaign_status === 'RUNNING') {
        await campaignRepository.pauseCampaign(
          campaignId,
          `System-wide emergency pause: ${globalPauseCheck.reason || 'Manual pause'}`
        );
      }
      
      return {
        processed: 0,
        sent: 0,
        failed: 0,
        paused: true,
        completed: false,
        pauseReason: `GLOBAL_EMERGENCY_PAUSE: ${globalPauseCheck.reason || 'System paused via admin'}`
      };
    }
    
    // �🔧 AUTO-RECONCILIATION: Recover stuck recipients before batch starts
    console.log('🔧 [Batch Executor] Running auto-reconciliation...');
    const stuckRecipients = await recipientRepository.getStuckRecipients(120); // 2-minute threshold
    const campaignStuck = stuckRecipients.filter(r => r.campaignId === campaignId);
    let recovered = 0;
    for (const stuck of campaignStuck) {
      await recipientRepository.markRecipientAsFailed(
        campaignId,
        stuck.phone,
        'STUCK_PROCESSING',
        `Stuck in PROCESSING for ${stuck.stuckDuration}s - auto-recovered`
      );
      recovered++;
    }
    if (recovered > 0) {
      console.log(`✅ [Batch Executor] Auto-reconciliation recovered ${recovered} stuck recipients`);
    }
    
    // 🛑 CRITICAL: Check kill switch BEFORE starting batch
    console.log('🛡️ [Batch Executor] Checking emergency kill switch...');
    const killSwitch = await isKillSwitchEnabled();
  
    if (killSwitch.enabled) {
      console.warn('🚨 [Batch Executor] KILL SWITCH ENABLED - Stopping execution');
      console.warn('🚨 [Batch Executor] Reason:', killSwitch.reason);
      
      // Pause campaign if not already paused
      const campaign = await campaignRepository.getCampaign(campaignId);
      if (campaign && campaign.campaign_status === 'RUNNING') {
        await campaignRepository.pauseCampaign(
          campaignId,
          `Emergency stop: ${killSwitch.reason || 'Kill switch enabled'}`
        );
      }
      
      return {
        processed: 0,
        sent: 0,
        failed: 0,
        paused: true,
        completed: false,
        pauseReason: `EMERGENCY_STOP: ${killSwitch.reason || 'System-wide sending disabled'}`
      };
    }
    
    // 🛡️ CRITICAL: Check global daily limit (across all campaigns)
    console.log('🌐 [Batch Executor] Checking global daily limit...');
    const globalLimitGuard = getGlobalDailyLimitGuard();
    const globalLimitCheck = await globalLimitGuard.checkLimit();
    
    if (!globalLimitCheck.allowed) {
      console.warn('🚫 [Batch Executor] GLOBAL DAILY LIMIT REACHED');
      console.warn(`🚫 [Batch Executor] ${globalLimitCheck.currentCount}/${globalLimitCheck.limit} messages sent today`);
      
      // Pause this campaign
      const campaign = await campaignRepository.getCampaign(campaignId);
      if (campaign && campaign.campaign_status === 'RUNNING') {
        await campaignRepository.pauseCampaign(
          campaignId,
          globalLimitCheck.reason || 'Global daily limit reached'
        );
      }
      
      return {
        processed: 0,
        sent: 0,
        failed: 0,
        paused: true,
        completed: false,
        pauseReason: globalLimitCheck.reason,
        remainingDailySlots: 0
      };
    }
    
    console.log(`✅ [Batch Executor] Global limit OK: ${globalLimitCheck.currentCount}/${globalLimitCheck.limit} (${globalLimitCheck.remainingSlots} slots remaining)`);
    
    // 🔥 WARMUP: Check account age-based daily limits
    console.log('🌱 [Batch Executor] Checking account warmup limits...');
    const warmupManager = getAccountWarmupManager();
    const accountId = process.env.META_PHONE_NUMBER_ID || process.env.WHATSAPP_PHONE_NUMBER_ID!; // validated in POST handler before lock
    const warmupCheck = await warmupManager.canSend(accountId, BATCH_SIZE);
    
    if (!warmupCheck.allowed) {
      console.warn('🚫 [Batch Executor] WARMUP DAILY LIMIT REACHED');
      console.warn(`🚫 [Batch Executor] ${warmupCheck.reason}`);
      console.warn(`🚫 [Batch Executor] Remaining today: ${warmupCheck.remainingToday}/${warmupCheck.dailyLimit}`);
      
      // Pause this campaign
      const campaign = await campaignRepository.getCampaign(campaignId);
      if (campaign && campaign.campaign_status === 'RUNNING') {
        await campaignRepository.pauseCampaign(
          campaignId,
          warmupCheck.reason || 'Daily warmup limit reached'
        );
      }
      
      return {
        processed: 0,
        sent: 0,
        failed: 0,
        paused: true,
        completed: false,
        pauseReason: warmupCheck.reason,
        remainingDailySlots: warmupCheck.remainingToday
      };
    }
    
    console.log(`✅ [Batch Executor] Warmup limit OK: ${warmupCheck.remainingToday}/${warmupCheck.dailyLimit} remaining today`);
    
    console.log('📥 [Batch Executor] Loading campaign metadata...');
    // 1️⃣ Load campaign metadata WITH metrics
    const { campaign, metrics } = await campaignRepository.getCampaignWithMetrics(campaignId);
    
    if (!campaign) {
      console.error('❌ [Batch Executor] Campaign not found:', campaignId);
      throw new Error('Campaign not found');
    }
    
    // 🛡️ CRITICAL: Block-rate circuit breaker check
    console.log('🔍 [Batch Executor] Checking block-rate circuit breaker...');
    const circuitBreaker = getBlockRateCircuitBreaker();
    const blockRateCheck = await circuitBreaker.checkCampaign(campaignId);
    
    console.log(`📊 [Batch Executor] Block rate: ${(blockRateCheck.blockRate * 100).toFixed(2)}% (${blockRateCheck.blockedCount}/${blockRateCheck.totalProcessed}) - Severity: ${blockRateCheck.severity}`);
    
    if (blockRateCheck.shouldKillSwitch) {
      console.error('🚨 [Batch Executor] BLOCK RATE CRITICAL - TRIGGERING KILL SWITCH');
      console.error(`🚨 [Batch Executor] ${blockRateCheck.reason}`);
      
      // Trigger system-wide kill switch to halt all campaigns
      try {
        await whatsappRepository.updateKillSwitchStatus('enable', 'system', `Auto-triggered: ${blockRateCheck.reason}`);
        console.error('🚨 [Batch Executor] Global kill switch ENABLED');
      } catch (ksError) {
        console.error('🚨 [Batch Executor] Failed to enable kill switch:', ksError);
      }

      await campaignRepository.pauseCampaign(campaignId, blockRateCheck.reason!);
      
      return {
        processed: 0,
        sent: 0,
        failed: 0,
        paused: true,
        completed: false,
        pauseReason: `BLOCK_RATE_EMERGENCY: ${blockRateCheck.reason}`
      };
    }
    
    if (blockRateCheck.shouldPause) {
      console.warn('⚠️ [Batch Executor] BLOCK RATE ELEVATED - AUTO-PAUSING CAMPAIGN');
      console.warn(`⚠️ [Batch Executor] ${blockRateCheck.reason}`);
      
      await campaignRepository.pauseCampaign(campaignId, blockRateCheck.reason!);
      
      return {
        processed: 0,
        sent: 0,
        failed: 0,
        paused: true,
        completed: false,
        pauseReason: `BLOCK_RATE_HIGH: ${blockRateCheck.reason}`
      };
    }
    
    if (blockRateCheck.severity === 'WARNING') {
      console.warn('⚠️ [Batch Executor] Block rate elevated (warning level)');
      console.warn(`⚠️ [Batch Executor] ${blockRateCheck.reason}`);
    }

    // ⏱️ CRITICAL: Server-side cooldown check (30 seconds minimum between batches)
    if (campaign.last_dispatch_at) {
      const timeSinceLastBatch = now - campaign.last_dispatch_at;
      if (timeSinceLastBatch < 30) {
        const remainingCooldown = 30 - timeSinceLastBatch;
        console.warn(`⏱️ [Batch Executor] Cooldown active: ${remainingCooldown}s remaining`);
        return {
          processed: 0,
          sent: 0,
          failed: 0,
          paused: false,
          completed: false,
          pauseReason: `Cooldown active: wait ${remainingCooldown}s before next batch`
        };
      }
    }

    // 🎯 CRITICAL: Campaign daily cap enforcement
    if (metrics.sent >= (campaign.daily_cap ?? Infinity)) {
      console.warn(`🎯 [Batch Executor] Campaign daily cap reached: ${metrics.sent}/${campaign.daily_cap}`);
      await campaignRepository.pauseCampaign(campaignId, `Campaign daily cap reached: ${campaign.daily_cap} messages`);
      return {
        processed: 0,
        sent: 0,
        failed: 0,
        paused: true,
        completed: false,
        pauseReason: `Campaign daily cap reached: ${campaign.daily_cap} messages`
      };
    }

    // 📊 CRITICAL: Metrics integrity check
    const processedCount = metrics.sent + metrics.blocked;
    if (processedCount > campaign.total_recipients) {
      console.error(`❌ [Batch Executor] METRICS CORRUPTION: sentCount(${metrics.sent}) + failedCount(${metrics.blocked}) = ${processedCount} > totalRecipients(${campaign.total_recipients})`);
      await campaignRepository.pauseCampaign(campaignId, 'Metrics corruption detected - manual intervention required');
      return {
        processed: 0,
        sent: 0,
        failed: 0,
        paused: true,
        completed: false,
        pauseReason: 'METRICS_CORRUPTION: Manual intervention required'
      };
    }
  console.log('📊 [Batch Executor] Campaign loaded:', { id: campaign.campaign_id, status: campaign.campaign_status, template: campaign.template_name });

  // 2️⃣ Validate status == RUNNING
  if (campaign.campaign_status !== 'RUNNING') {
    console.log('⚠️ [Batch Executor] Campaign not RUNNING:', campaign.campaign_status);
    return {
      processed: 0,
      sent: 0,
      failed: 0,
      paused: false,
      completed: false,
      pauseReason: `Campaign status is ${campaign.campaign_status}, not RUNNING`
    };
  }

  // 3️⃣ Query PENDING recipients (limit 25)
  console.log('🔍 [Batch Executor] Querying pending recipients...');
  const recipients = await recipientRepository.getPendingRecipients(campaignId, BATCH_SIZE);
  console.log(`📊 [Batch Executor] Found ${recipients.length} pending recipients`);
  
  // 🛡️ CRITICAL: Limit batch size to remaining global slots
  // Bug fix: If currentCount=980 and batchSize=50, we'd exceed limit
  const effectiveBatchSize = Math.min(recipients.length, globalLimitCheck.remainingSlots);
  const limitedRecipients = recipients.slice(0, effectiveBatchSize);
  
  if (effectiveBatchSize < recipients.length) {
    console.warn(`⚠️ [Batch Executor] Batch size limited by global cap: ${effectiveBatchSize}/${recipients.length} recipients`);
    console.warn(`⚠️ [Batch Executor] Remaining daily slots: ${globalLimitCheck.remainingSlots}`);
  }
  
  console.log(`📊 [Batch Executor] Effective batch size: ${effectiveBatchSize} recipients`);
  
  // 4️⃣ If no recipients → mark COMPLETED
  if (limitedRecipients.length === 0) {
    console.log('✅ [Batch Executor] No pending recipients, marking campaign as COMPLETED');
    await campaignRepository.updateCampaignStatus(campaignId, 'COMPLETED');
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

  for (const recipient of limitedRecipients) {
    try {
      // 🔒 CRITICAL: Claim recipient atomically (optimistic lock)
      // This prevents race conditions in parallel executions
      const claimed = await recipientRepository.claimRecipient(campaignId, recipient.phone);
        
        if (!claimed) {
          // Another execution already claimed this recipient
          console.log(`⚠️ [Batch Executor] Recipient ${recipient.phone} already claimed, skipping`);
          continue;
        }
        
        console.log(`📨 [Batch Executor] Processing ${recipient.phone} (attempt ${recipient.attempts + 1})...`);
      processed++; // Successfully claimed
      
            
      const pauseCheck = await globalStateManager.isGloballyPaused();
      if (pauseCheck.paused) {
        console.warn('[Batch Executor] GLOBAL PAUSE DETECTED mid-batch - Stopping immediately');
        await recipientRepository.updateRecipientStatus(campaignId, recipient.phone, 'PENDING');
        await campaignRepository.pauseCampaign(campaignId, `Global pause: ${pauseCheck.reason || 'System paused'}`);
        limitReached = true;
        break;
      }
      // � CRITICAL: Check kill switch BEFORE each send
      const killSwitchCheck = await isKillSwitchEnabled();
      if (killSwitchCheck.enabled) {
        console.warn('🚨 [Batch Executor] KILL SWITCH ENABLED mid-batch - Pausing immediately');
        console.warn('🚨 [Batch Executor] Reason:', killSwitchCheck.reason);
        
        // Reset recipient back to PENDING (was claimed as PROCESSING)
        await recipientRepository.updateRecipientStatus(campaignId, recipient.phone, 'PENDING');
        
        // Pause campaign
        await campaignRepository.pauseCampaign(
          campaignId,
          `Emergency stop: ${killSwitchCheck.reason || 'Kill switch enabled'}`
        );
        
        // Stop processing immediately
        limitReached = true;
        break;
      }
      
      // 🛡️ Check daily limit guard BEFORE sending
      // MessageService already includes guard check, but we need to catch DailyLimitExceededError
      
      // ✨ Template rotation: select template dynamically
      const templateConfig = parseTemplateConfig({
        templateName: campaign.template_name,
        templates: campaign.templates,
        templateWeights: campaign.template_weights,
        templateStrategy: campaign.template_strategy
      });
      const selectedTemplate = selectTemplate(templateConfig) as string;
      console.log(`📋 [Batch Executor] Selected template: ${selectedTemplate}`);
      
      // Send template message
      const response = await messageService.sendTemplateMessage({
        type: 'template',
        to: recipient.phone,
        template: {
          name: selectedTemplate,
          language: {
            code: 'en' // Default to English, can be made dynamic later
          }
        }
      });

      // Extract message ID
      const messageId = response.messages[0]?.id;
      console.log(`✅ [Batch Executor] Sent to ${recipient.phone}, Template: ${selectedTemplate}, Message ID: ${messageId}`);

      // 🔗 Store message-to-campaign mapping for webhook tracking
      if (messageId) {
        await logMessageForWebhookTracking(campaignId, messageId, recipient.phone);
      }
      
      // 📊 ANALYTICS: Increment sent metric
      const { getCampaignMetrics } = await import('@/lib/whatsapp/campaignMetrics');
      const metricsManager = getCampaignMetrics();
      await metricsManager.incrementMetric(campaignId, 'sent').catch((err: unknown) => {
        console.error(`[Batch Executor] Failed to increment sent metric:`, err);
      });

      // Update recipient as SENT
      await recipientRepository.updateRecipientStatus(campaignId, recipient.phone, 'SENT', { message_id: messageId });
      
      // Increment campaign sentCount
      await campaignRepository.incrementMetric(campaignId, 'sent_count');
      
      // 🌐 Increment global daily counter
      await globalLimitGuard.incrementCount();
      
      // Write log entry for observability
      await campaignRepository.addCampaignLog(campaignId, recipient.phone, 'SENT', {
        messageId,
        metaResponse: JSON.stringify(response),
        attempts: recipient.attempts + 1
      });
      
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
        await campaignRepository.pauseCampaign(
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
          await recipientRepository.updateRecipientStatus(
            campaignId,
            recipient.phone,
            'FAILED', // Temporarily mark failed
            { error_code: `RETRYABLE_${error.code}` }
          );
          
          // Write log entry for retry
          await campaignRepository.addCampaignLog(campaignId, recipient.phone, 'FAILED', {
            errorCode: `RETRYABLE_${error.code}`,
            errorMessage: `${error.message} (Will retry)`,
            metaResponse: error.toLogString(),
            attempts: recipient.attempts + 1
          });
          
          // Reset to PENDING for retry (separate operation)
          await recipientRepository.updateRecipientStatus(campaignId, recipient.phone, 'PENDING');
        } else {
          // Non-retryable or max attempts reached
          await recipientRepository.updateRecipientStatus(
            campaignId,
            recipient.phone,
            'FAILED',
            { error_code: `META_${error.code}`, error_message: error.message }
          );
          
          // Write log entry for permanent failure
          await campaignRepository.addCampaignLog(campaignId, recipient.phone, 'FAILED', {
            errorCode: `META_${error.code}`,
            errorMessage: error.message,
            metaResponse: error.toLogString(),
            attempts: recipient.attempts + 1
          });
          
          await campaignRepository.incrementMetric(campaignId, 'failed_count');
          failed++;
        }
      } else {
        // Unknown error - mark as failed
        console.error(`[BatchExecutor] Unknown error for ${recipient.phone}:`, error);
        
        await recipientRepository.updateRecipientStatus(
          campaignId,
          recipient.phone,
          'FAILED',
          { error_code: 'UNKNOWN_ERROR', error_message: error instanceof Error ? error.message : 'Unknown error occurred' }
        );
        
        // Write log entry for unknown error
        await campaignRepository.addCampaignLog(campaignId, recipient.phone, 'FAILED', {
          errorCode: 'UNKNOWN_ERROR',
          errorMessage: error instanceof Error ? error.message : 'Unknown error occurred',
          attempts: recipient.attempts + 1
        });
        
        await campaignRepository.incrementMetric(campaignId, 'failed_count');
        failed++;
      }
    } // End catch (per-recipient error handling)
  } // End for loop

  console.log(`🏁 [Batch Executor] Batch complete: ${sent} sent, ${failed} failed, ${processed} processed`);
  
  // 🔓 CRITICAL: Release execution lock and update lastBatchAt
  await campaignRepository.releaseExecutionLock(campaignId, now);
  console.log('🔓 [Batch Executor] Execution lock released');
  
  // 🔥 WARMUP: Record sent messages to update daily count
  if (sent > 0) {
    console.log(`🌱 [Batch Executor] Recording ${sent} sent messages to warmup manager...`);
    await warmupManager.recordSent(accountId, sent);
  }
  
  return {
    processed, // Use actual claimed count, not recipients.length
    sent,
    failed,
    paused: limitReached,
    completed: false,
    pauseReason: limitReached ? 'DAILY_LIMIT_REACHED' : undefined
  };
} catch (processingError) {
    // 🔓 CRITICAL: Release lock even on error
    console.error('❌ [Batch Executor] Processing error:', processingError);
    try {
      await campaignRepository.releaseExecutionLockOnError(campaignId);
      console.log('🔓 [Batch Executor] Execution lock released (error path)');
    } catch (unlockError) {
      console.error('❌ [Batch Executor] Failed to release lock on error:', unlockError);
    }
    throw processingError;
  }
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
    // 1️⃣ Rate Limit Check (per-IP)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
               req.headers.get('x-real-ip') || 
               'unknown';
    
    // 1️⃣ Rate Limit Check (DynamoDB-backed — survives cold starts)
    const rateCheck = await sessionRepository.checkRateLimit(ip, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MINUTES);
    if (rateCheck.blocked) {
      console.warn(`⚠️ [Execute Batch API] Rate limit exceeded for IP: ${ip}`);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Too many requests. Try again in ${rateCheck.remainingTime}s.`,
          retryAfter: rateCheck.remainingTime
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateCheck.remainingTime?.toString() || '60'
          }
        }
      );
    }
    // Count this call toward the rate limit window (DynamoDB TTL cleans up automatically)
    await sessionRepository.recordFailedAttempt(ip, RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_MINUTES);
    
    // 2️⃣ Validate Admin Session
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

    // 3️⃣ Validate required environment variables early (before acquiring any lock)
    if (!process.env.META_PHONE_NUMBER_ID && !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.error('❌ [Execute Batch API] META_PHONE_NUMBER_ID not configured');
      return NextResponse.json(
        { error: 'WhatsApp account not configured' },
        { status: 500 }
      );
    }

    // 4️⃣ Initialize MessageService
    console.log('📦 [Execute Batch API] Campaign ID:', campaignId);
    console.log('⚙️ [Execute Batch API] Initializing message service...');
    const messageService = getMessageService();

    // 5️⃣ Execute batch
    console.log('⚡ [Execute Batch API] Executing batch...');
    const result = await executeBatch(campaignId, messageService);
    console.log('✅ [Execute Batch API] Batch execution completed:', result);

    // 6️⃣ Return summary
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
