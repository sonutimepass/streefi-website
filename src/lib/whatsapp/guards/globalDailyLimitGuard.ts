/**
 * Global Daily Limit Guard
 * 
 * Enforces Meta account-level daily sending limits across ALL campaigns.
 * 
 * WHY THIS EXISTS:
 * - Campaign-level caps are secondary controls
 * - Multiple campaigns can run simultaneously
 * - Without a global guard: Campaign A (700) + Campaign B (700) = 1400 sends
 * - Meta's account limit is typically 1000/day (verified number)
 * 
 * HOW IT WORKS:
 * - Tracks total sends across ALL campaigns per day
 * - Stored in DynamoDB: PK=GLOBAL_LIMIT, SK=DATE#{YYYY-MM-DD}
 * - Atomic increments prevent race conditions
 * - Resets automatically at midnight (UTC)
 * 
 * USAGE:
 * ```
 * const guard = getGlobalDailyLimitGuard();
 * const check = await guard.checkLimit();
 * if (!check.allowed) {
 *   // Pause all campaigns, trigger kill switch
 * }
 * await guard.incrementCount(); // After successful send
 * ```
 * 
 * CRITICAL: This guard must be checked BEFORE campaign-level caps
 */

import { 
  GetItemCommand, 
  UpdateItemCommand,
  PutItemCommand 
} from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';

export interface GlobalDailyLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  remainingSlots: number;
  reason?: string;
  resetAt: string; // ISO timestamp of next reset
}

export class GlobalDailyLimitGuard {
  // Meta's initial daily limit (increases over time with good reputation)
  private META_DAILY_LIMIT: number;
  
  // Safety buffer (prevent hitting exact limit)
  private SAFETY_BUFFER: number;
  
  // Effective limit = META_DAILY_LIMIT - SAFETY_BUFFER
  private EFFECTIVE_LIMIT: number;

  constructor(
    private readonly metaDailyLimit: number = 1000,
    private readonly safetyBuffer: number = 50
  ) {
    this.META_DAILY_LIMIT = metaDailyLimit;
    this.SAFETY_BUFFER = safetyBuffer;
    this.EFFECTIVE_LIMIT = this.META_DAILY_LIMIT - this.SAFETY_BUFFER;
  }

  /**
   * Get today's date key (UTC timezone)
   */
  private getTodayKey(): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const day = String(now.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Get tomorrow's midnight UTC timestamp (for resetAt)
   */
  private getNextResetTime(): string {
    const now = new Date();
    const tomorrow = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1,
      0, 0, 0, 0
    ));
    return tomorrow.toISOString();
  }

  /**
   * Get current global daily count
   */
  async getCurrentCount(): Promise<number> {
    const dateKey = this.getTodayKey();
    
    try {
      const response = await dynamoClient.send(
        new GetItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Key: {
            PK: { S: 'GLOBAL_LIMIT' },
            SK: { S: `DATE#${dateKey}` }
          }
        })
      );

      if (!response.Item) {
        return 0;
      }

      return parseInt(response.Item.count?.N || '0', 10);
    } catch (error) {
      console.error('[GlobalDailyLimitGuard] Failed to get current count:', error);
      // Fail safe: assume 0 to allow operation (logged for monitoring)
      return 0;
    }
  }

  /**
   * Check if sending is allowed
   * Returns detailed check result with current count and remaining slots
   */
  async checkLimit(): Promise<GlobalDailyLimitCheckResult> {
    const currentCount = await this.getCurrentCount();
    const remainingSlots = Math.max(0, this.EFFECTIVE_LIMIT - currentCount);
    const resetAt = this.getNextResetTime();

    if (currentCount >= this.EFFECTIVE_LIMIT) {
      return {
        allowed: false,
        currentCount,
        limit: this.EFFECTIVE_LIMIT,
        remainingSlots: 0,
        resetAt,
        reason: `Global daily limit reached: ${currentCount}/${this.EFFECTIVE_LIMIT} messages (Meta limit: ${this.META_DAILY_LIMIT}, buffer: ${this.SAFETY_BUFFER})`
      };
    }

    return {
      allowed: true,
      currentCount,
      limit: this.EFFECTIVE_LIMIT,
      remainingSlots,
      resetAt
    };
  }

  /**
   * Increment global daily counter atomically
   * Uses ADD operation to prevent race conditions
   * 
   * IMPORTANT: Call this AFTER successful send, not before
   */
  async incrementCount(amount: number = 1): Promise<void> {
    const dateKey = this.getTodayKey();
    const timestamp = Math.floor(Date.now() / 1000);

    try {
      // Try to increment existing counter
      await dynamoClient.send(
        new UpdateItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Key: {
            PK: { S: 'GLOBAL_LIMIT' },
            SK: { S: `DATE#${dateKey}` }
          },
          UpdateExpression: 'ADD #count :amount SET updatedAt = :timestamp',
          ExpressionAttributeNames: {
            '#count': 'count'
          },
          ExpressionAttributeValues: {
            ':amount': { N: amount.toString() },
            ':timestamp': { N: timestamp.toString() }
          }
        })
      );
    } catch (error: any) {
      // If item doesn't exist, create it
      if (error.name === 'ValidationException') {
        try {
          await dynamoClient.send(
            new PutItemCommand({
              TableName: TABLES.CAMPAIGNS,
              Item: {
                PK: { S: 'GLOBAL_LIMIT' },
                SK: { S: `DATE#${dateKey}` },
                count: { N: amount.toString() },
                date: { S: dateKey },
                createdAt: { N: timestamp.toString() },
                updatedAt: { N: timestamp.toString() }
              },
              ConditionExpression: 'attribute_not_exists(PK)'
            })
          );
        } catch (putError: any) {
          // Race condition: another process created it first, retry increment
          if (putError.name === 'ConditionalCheckFailedException') {
            await this.incrementCount(amount);
          } else {
            throw putError;
          }
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Get detailed statistics for monitoring/dashboard
   */
  async getStats(): Promise<{
    date: string;
    currentCount: number;
    limit: number;
    metaLimit: number;
    safetyBuffer: number;
    remainingSlots: number;
    utilizationPercent: number;
    resetAt: string;
  }> {
    const currentCount = await this.getCurrentCount();
    const remainingSlots = Math.max(0, this.EFFECTIVE_LIMIT - currentCount);
    const utilizationPercent = Math.round((currentCount / this.EFFECTIVE_LIMIT) * 100);

    return {
      date: this.getTodayKey(),
      currentCount,
      limit: this.EFFECTIVE_LIMIT,
      metaLimit: this.META_DAILY_LIMIT,
      safetyBuffer: this.SAFETY_BUFFER,
      remainingSlots,
      utilizationPercent,
      resetAt: this.getNextResetTime()
    };
  }
}

// Singleton instance
let globalLimitGuardInstance: GlobalDailyLimitGuard | null = null;

/**
 * Get global daily limit guard instance (singleton)
 */
export function getGlobalDailyLimitGuard(): GlobalDailyLimitGuard {
  if (!globalLimitGuardInstance) {
    // Read from environment or use defaults
    const metaLimit = parseInt(process.env.META_DAILY_LIMIT || '1000', 10);
    const safetyBuffer = parseInt(process.env.META_SAFETY_BUFFER || '50', 10);
    
    globalLimitGuardInstance = new GlobalDailyLimitGuard(metaLimit, safetyBuffer);
  }
  return globalLimitGuardInstance;
}

/**
 * Create a custom guard instance (mainly for testing)
 */
export function createGlobalDailyLimitGuard(
  metaDailyLimit: number,
  safetyBuffer: number
): GlobalDailyLimitGuard {
  return new GlobalDailyLimitGuard(metaDailyLimit, safetyBuffer);
}
