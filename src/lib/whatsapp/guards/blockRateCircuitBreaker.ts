/**
 * Block-Rate Circuit Breaker
 * 
 * Automatically pauses/stops campaigns when user block rate exceeds thresholds.
 * 
 * WHY THIS EXISTS:
 * - Meta punishes based on RECIPIENT BEHAVIOR, not send speed
 * - Block rate is the most critical quality metric
 * - Manual monitoring is too slow - system must react automatically
 * 
 * THRESHOLDS (Meta's rough behavioral model):
 * - <0.5%  = healthy
 * - 0.5-1% = acceptable
 * - 1-3%   = warning territory
 * - >3%    = quality score degradation
 * - >5%    = serious restriction risk
 * 
 * CIRCUIT BREAKER BEHAVIOR:
 * - 2% = Auto-pause campaign
 * - 5% = Trigger system-wide kill switch (all campaigns stop)
 * 
 * HOW IT WORKS:
 * - Tracks blocks reported via webhook (status = 'failed', error_code = 131051)
 * - Calculates: block_rate = blocks / (sent + failed)
 * - Stored in campaign metadata: blockedCount
 * - Checked before each batch execution
 * 
 * USAGE:
 * ```
 * const breaker = getBlockRateCircuitBreaker();
 * const check = await breaker.checkCampaign(campaignId);
 * if (check.shouldPause) {
 *   await pauseCampaign(campaignId, check.reason);
 * }
 * if (check.shouldKillSwitch) {
 *   await enableKillSwitch(check.reason);
 * }
 * ```
 */

import { GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';

export interface BlockRateCheckResult {
  blockRate: number;
  blockedCount: number;
  sentCount: number;
  totalProcessed: number;
  shouldPause: boolean;
  shouldKillSwitch: boolean;
  reason?: string;
  severity: 'HEALTHY' | 'ACCEPTABLE' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
}

export class BlockRateCircuitBreaker {
  // Thresholds (configurable via constructor)
  private PAUSE_THRESHOLD: number;
  private KILL_SWITCH_THRESHOLD: number;
  private WARNING_THRESHOLD: number;
  private MIN_SAMPLE_SIZE: number; // 🚨 CRITICAL: Minimum messages before applying thresholds

  constructor(
    private readonly pauseThreshold: number = 0.02,
    private readonly killSwitchThreshold: number = 0.05,
    private readonly warningThreshold: number = 0.01,
    private readonly minSampleSize: number = 200 // Don't pause campaigns on noise
  ) {
    this.PAUSE_THRESHOLD = pauseThreshold;
    this.KILL_SWITCH_THRESHOLD = killSwitchThreshold;
    this.WARNING_THRESHOLD = warningThreshold;
    this.MIN_SAMPLE_SIZE = minSampleSize;
  }

  /**
   * Get campaign's current block count and sent count
   */
  private async getCampaignMetrics(campaignId: string): Promise<{
    blockedCount: number;
    sentCount: number;
    failedCount: number;
  }> {
    try {
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
        return { blockedCount: 0, sentCount: 0, failedCount: 0 };
      }

      return {
        blockedCount: parseInt(response.Item.blockedCount?.N || '0', 10),
        sentCount: parseInt(response.Item.sentCount?.N || '0', 10),
        failedCount: parseInt(response.Item.failedCount?.N || '0', 10)
      };
    } catch (error) {
      console.error('[BlockRateCircuitBreaker] Failed to get campaign metrics:', error);
      return { blockedCount: 0, sentCount: 0, failedCount: 0 };
    }
  }

  /**
   * Calculate block rate and determine severity
   */
  private calculateBlockRate(blockedCount: number, totalProcessed: number): {
    blockRate: number;
    severity: BlockRateCheckResult['severity'];
  } {
    if (totalProcessed === 0) {
      return { blockRate: 0, severity: 'HEALTHY' };
    }

    const blockRate = blockedCount / totalProcessed;

    let severity: BlockRateCheckResult['severity'];
    if (blockRate >= this.KILL_SWITCH_THRESHOLD) {
      severity = 'EMERGENCY';
    } else if (blockRate >= this.PAUSE_THRESHOLD) {
      severity = 'CRITICAL';
    } else if (blockRate >= this.WARNING_THRESHOLD) {
      severity = 'WARNING';
    } else if (blockRate >= 0.005) {
      severity = 'ACCEPTABLE';
    } else {
      severity = 'HEALTHY';
    }

    return { blockRate, severity };
  }

  /**
   * Check campaign's block rate and determine action
   * 🚨 CRITICAL FIX: Requires minimum sample size to avoid false positives
   */
  async checkCampaign(campaignId: string): Promise<BlockRateCheckResult> {
    const metrics = await this.getCampaignMetrics(campaignId);
    const totalProcessed = metrics.sentCount + metrics.failedCount;
    const { blockRate, severity } = this.calculateBlockRate(
      metrics.blockedCount,
      totalProcessed
    );

    // 🚨 MINIMUM SAMPLE SIZE CHECK
    // Don't pause campaigns on statistical noise
    // Example: 1 block out of 50 sends = 2% but not significant
    const hasSufficientSample = totalProcessed >= this.MIN_SAMPLE_SIZE;
    
    const shouldKillSwitch = hasSufficientSample && blockRate >= this.KILL_SWITCH_THRESHOLD;
    const shouldPause = hasSufficientSample && blockRate >= this.PAUSE_THRESHOLD;

    let reason: string | undefined;
    if (shouldKillSwitch) {
      reason = `EMERGENCY: Block rate ${(blockRate * 100).toFixed(2)}% exceeds kill switch threshold (${(this.KILL_SWITCH_THRESHOLD * 100)}%). ${metrics.blockedCount} blocks out of ${totalProcessed} messages. System-wide stop required.`;
    } else if (shouldPause) {
      reason = `CRITICAL: Block rate ${(blockRate * 100).toFixed(2)}% exceeds pause threshold (${(this.PAUSE_THRESHOLD * 100)}%). ${metrics.blockedCount} blocks out of ${totalProcessed} messages. Campaign auto-paused.`;
    } else if (!hasSufficientSample && totalProcessed > 0) {
      reason = `INSUFFICIENT SAMPLE: ${totalProcessed} messages (need ${this.MIN_SAMPLE_SIZE}). Current block rate: ${(blockRate * 100).toFixed(2)}% (${metrics.blockedCount} blocks). Monitoring...`;
    } else if (severity === 'WARNING') {
      reason = `WARNING: Block rate ${(blockRate * 100).toFixed(2)}% is elevated. Monitor closely.`;
    }

    return {
      blockRate,
      blockedCount: metrics.blockedCount,
      sentCount: metrics.sentCount,
      totalProcessed,
      shouldPause,
      shouldKillSwitch,
      reason,
      severity
    };
  }

  /**
   * Increment blocked count for a campaign
   * Call this when webhook reports a block (error_code 131051)
   */
  async incrementBlockedCount(campaignId: string, amount: number = 1): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);

    try {
      await dynamoClient.send(
        new UpdateItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: 'METADATA' }
          },
          UpdateExpression: 'ADD blockedCount :amount SET updatedAt = :timestamp',
          ExpressionAttributeValues: {
            ':amount': { N: amount.toString() },
            ':timestamp': { N: timestamp.toString() }
          }
        })
      );
    } catch (error) {
      console.error('[BlockRateCircuitBreaker] Failed to increment blocked count:', error);
      throw error;
    }
  }

  /**
   * Get block rate statistics for monitoring/dashboard
   */
  async getStats(campaignId: string): Promise<{
    blockRate: number;
    blockRatePercent: string;
    blockedCount: number;
    sentCount: number;
    failedCount: number;
    totalProcessed: number;
    severity: BlockRateCheckResult['severity'];
    health: string;
    recommendation: string;
  }> {
    const check = await this.checkCampaign(campaignId);

    let health: string;
    let recommendation: string;

    switch (check.severity) {
      case 'EMERGENCY':
        health = 'EMERGENCY - System-wide stop required';
        recommendation = 'Trigger kill switch immediately. Review recipient targeting and message quality.';
        break;
      case 'CRITICAL':
        health = 'CRITICAL - Auto-pause triggered';
        recommendation = 'Campaign paused. Review recipient list quality and message relevance before resuming.';
        break;
      case 'WARNING':
        health = 'WARNING - Elevated block rate';
        recommendation = 'Monitor closely. Consider improving message targeting or content.';
        break;
      case 'ACCEPTABLE':
        health = 'ACCEPTABLE - Within normal range';
        recommendation = 'Continue monitoring. Maintain current quality standards.';
        break;
      case 'HEALTHY':
        health = 'HEALTHY - Excellent quality';
        recommendation = 'No action needed. Block rate is optimal.';
        break;
    }

    return {
      blockRate: check.blockRate,
      blockRatePercent: `${(check.blockRate * 100).toFixed(2)}%`,
      blockedCount: check.blockedCount,
      sentCount: check.sentCount,
      failedCount: check.totalProcessed - check.sentCount,
      totalProcessed: check.totalProcessed,
      severity: check.severity,
      health,
      recommendation
    };
  }
}

// Singleton instance
let blockRateCircuitBreakerInstance: BlockRateCircuitBreaker | null = null;

/**
 * Get block-rate circuit breaker instance (singleton)
 */
export function getBlockRateCircuitBreaker(): BlockRateCircuitBreaker {
  if (!blockRateCircuitBreakerInstance) {
    // Read from environment or use defaults
    const pauseThreshold = parseFloat(process.env.BLOCK_RATE_PAUSE_THRESHOLD || '0.02');
    const killSwitchThreshold = parseFloat(process.env.BLOCK_RATE_KILL_THRESHOLD || '0.05');
    const warningThreshold = parseFloat(process.env.BLOCK_RATE_WARNING_THRESHOLD || '0.01');
    
    blockRateCircuitBreakerInstance = new BlockRateCircuitBreaker(
      pauseThreshold,
      killSwitchThreshold,
      warningThreshold
    );
  }
  return blockRateCircuitBreakerInstance;
}

/**
 * Create a custom circuit breaker instance (mainly for testing)
 */
export function createBlockRateCircuitBreaker(
  pauseThreshold: number,
  killSwitchThreshold: number,
  warningThreshold: number
): BlockRateCircuitBreaker {
  return new BlockRateCircuitBreaker(
    pauseThreshold,
    killSwitchThreshold,
    warningThreshold
  );
}
