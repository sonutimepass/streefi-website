/**
 * WhatsApp Account Warmup Strategy
 * 
 * CRITICAL: New WhatsApp numbers CANNOT send high volume immediately.
 * 
 * META ENFORCEMENT:
 * - New account: 250-1000 messages/day limit (enforced by Meta)
 * - Violating this = instant quality tier drop
 * - Quality drop = delivery rate plummets
 * 
 * WARMUP SCHEDULE:
 * Day 1-3:   200/day   (establishing trust)
 * Day 4-7:   500/day   (building reputation)
 * Day 8-14:  1,000/day (gradual increase)
 * Day 15-21: 2,500/day
 * Day 22-30: 5,000/day
 * Day 30+:   10,000+/day (mature account)
 * 
 * STRATEGY:
 * - Track account age (days since first send)
 * - Enforce daily limits based on maturity
 * - Gradually increase as trust builds
 * - Monitor quality metrics
 */

import { GetItemCommand, PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';

export interface WarmupState {
  accountId: string; // WhatsApp Phone Number ID
  accountAge: number; // Days since first send
  firstSendDate: number; // Unix timestamp of first send
  dailyLimit: number; // Current daily limit
  totalSent: number; // Lifetime total sends
  lastResetDate: string; // YYYY-MM-DD of last daily reset
  currentDaySent: number; // Sent today
  qualityTier: 'GREEN' | 'YELLOW' | 'RED';
}

export class AccountWarmupManager {
  private readonly WARMUP_SCHEDULE = [
    { days: 0, limit: 200 },    // Day 1-3
    { days: 4, limit: 500 },    // Day 4-7
    { days: 8, limit: 1000 },   // Day 8-14
    { days: 15, limit: 2500 },  // Day 15-21
    { days: 22, limit: 5000 },  // Day 22-30
    { days: 30, limit: 10000 }, // Day 30+
    { days: 60, limit: 25000 }, // Mature account
  ];

  /**
   * Get current warmup state for WhatsApp account
   */
  async getWarmupState(accountId: string): Promise<WarmupState> {
    try {
      const response = await dynamoClient.send(
        new GetItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Key: {
            PK: { S: 'SYSTEM' },
            SK: { S: `ACCOUNT#${accountId}` }
          }
        })
      );

      if (!response.Item) {
        // New account - initialize warmup state
        return await this.initializeAccount(accountId);
      }

      const state: WarmupState = {
        accountId,
        accountAge: parseInt(response.Item.accountAge?.N || '0', 10),
        firstSendDate: parseInt(response.Item.firstSendDate?.N || '0', 10),
        dailyLimit: parseInt(response.Item.dailyLimit?.N || '200', 10),
        totalSent: parseInt(response.Item.totalSent?.N || '0', 10),
        lastResetDate: response.Item.lastResetDate?.S || '',
        currentDaySent: parseInt(response.Item.currentDaySent?.N || '0', 10),
        qualityTier: (response.Item.qualityTier?.S as WarmupState['qualityTier']) || 'GREEN'
      };

      // Check if need to reset daily counter
      const today = new Date().toISOString().split('T')[0];
      if (state.lastResetDate !== today) {
        state.currentDaySent = 0;
        state.lastResetDate = today;
        
        // Update account age
        const daysSinceFirst = Math.floor(
          (Date.now() - (state.firstSendDate * 1000)) / (1000 * 60 * 60 * 24)
        );
        state.accountAge = daysSinceFirst;
        
        // Update daily limit based on age
        state.dailyLimit = this.calculateDailyLimit(daysSinceFirst);
        
        await this.saveWarmupState(state);
      }

      return state;
    } catch (error) {
      console.error('[Warmup] Error getting warmup state:', error);
      return await this.initializeAccount(accountId);
    }
  }

  /**
   * Initialize new account warmup state
   */
  private async initializeAccount(accountId: string): Promise<WarmupState> {
    const now = Math.floor(Date.now() / 1000);
    const today = new Date().toISOString().split('T')[0];

    const state: WarmupState = {
      accountId,
      accountAge: 0,
      firstSendDate: now,
      dailyLimit: 200, // Start conservative
      totalSent: 0,
      lastResetDate: today,
      currentDaySent: 0,
      qualityTier: 'GREEN'
    };

    await this.saveWarmupState(state);
    
    console.log(`✅ [Warmup] Initialized new account ${accountId} with ${state.dailyLimit} daily limit`);
    return state;
  }

  /**
   * Calculate daily limit based on account age
   */
  private calculateDailyLimit(accountAge: number): number {
    // Find appropriate tier
    for (let i = this.WARMUP_SCHEDULE.length - 1; i >= 0; i--) {
      const tier = this.WARMUP_SCHEDULE[i];
      if (accountAge >= tier.days) {
        return tier.limit;
      }
    }
    return 200; // Default to most conservative
  }

  /**
   * Check if sending is allowed (hasn't hit daily limit)
   */
  async canSend(accountId: string, messageCount: number = 1): Promise<{
    allowed: boolean;
    reason?: string;
    remainingToday: number;
    dailyLimit: number;
  }> {
    const state = await this.getWarmupState(accountId);

    const remainingToday = state.dailyLimit - state.currentDaySent;
    
    if (state.currentDaySent + messageCount > state.dailyLimit) {
      return {
        allowed: false,
        reason: `Daily limit reached (${state.currentDaySent}/${state.dailyLimit}). Account age: ${state.accountAge} days.`,
        remainingToday,
        dailyLimit: state.dailyLimit
      };
    }

    return {
      allowed: true,
      remainingToday,
      dailyLimit: state.dailyLimit
    };
  }

  /**
   * Record messages sent (increment counters)
   */
  async recordSent(accountId: string, count: number = 1): Promise<void> {
    try {
      await dynamoClient.send(
        new UpdateItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Key: {
            PK: { S: 'SYSTEM' },
            SK: { S: `ACCOUNT#${accountId}` }
          },
          UpdateExpression: 'ADD currentDaySent :count, totalSent :count',
          ExpressionAttributeValues: {
            ':count': { N: count.toString() }
          }
        })
      );
    } catch (error) {
      console.error('[Warmup] Error recording sent count:', error);
    }
  }

  /**
   * Save warmup state
   */
  private async saveWarmupState(state: WarmupState): Promise<void> {
    try {
      await dynamoClient.send(
        new PutItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Item: {
            PK: { S: 'SYSTEM' },
            SK: { S: `ACCOUNT#${state.accountId}` },
            accountAge: { N: state.accountAge.toString() },
            firstSendDate: { N: state.firstSendDate.toString() },
            dailyLimit: { N: state.dailyLimit.toString() },
            totalSent: { N: state.totalSent.toString() },
            lastResetDate: { S: state.lastResetDate },
            currentDaySent: { N: state.currentDaySent.toString() },
            qualityTier: { S: state.qualityTier },
            updatedAt: { N: Math.floor(Date.now() / 1000).toString() }
          }
        })
      );
    } catch (error) {
      console.error('[Warmup] Error saving warmup state:', error);
    }
  }

  /**
   * Get warmup progress info (for dashboard)
   */
  async getWarmupProgress(accountId: string): Promise<{
    currentTier: string;
    nextTier: string;
    daysUntilNext: number;
    progress: number;
  }> {
    const state = await this.getWarmupState(accountId);
    
    // Find current and next tier
    let currentTierIndex = 0;
    for (let i = 0; i < this.WARMUP_SCHEDULE.length; i++) {
      if (state.accountAge >= this.WARMUP_SCHEDULE[i].days) {
        currentTierIndex = i;
      }
    }

    const currentTier = this.WARMUP_SCHEDULE[currentTierIndex];
    const nextTier = this.WARMUP_SCHEDULE[currentTierIndex + 1];

    if (!nextTier) {
      return {
        currentTier: `${currentTier.limit}/day (Mature)`,
        nextTier: 'Max tier reached',
        daysUntilNext: 0,
        progress: 100
      };
    }

    const daysUntilNext = nextTier.days - state.accountAge;
    const progress = ((state.accountAge - currentTier.days) / (nextTier.days - currentTier.days)) * 100;

    return {
      currentTier: `${currentTier.limit}/day`,
      nextTier: `${nextTier.limit}/day`,
      daysUntilNext,
      progress: Math.min(100, Math.max(0, progress))
    };
  }
}

// Singleton instance
let warmupManager: AccountWarmupManager | null = null;

export function getAccountWarmupManager(): AccountWarmupManager {
  if (!warmupManager) {
    warmupManager = new AccountWarmupManager();
  }
  return warmupManager;
}
