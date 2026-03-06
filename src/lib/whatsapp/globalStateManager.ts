/**
 * Global State Manager
 * 
 * Manages system-wide state in DynamoDB for distributed Lambda environments.
 * 
 * WHY THIS EXISTS:
 * - Environment variables are instance-local (Lambda A ≠ Lambda B)
 * - Global kill switch must affect ALL workers instantly
 * - DynamoDB provides single source of truth for distributed systems
 * 
 * USAGE:
 * ```
 * const stateManager = getGlobalStateManager();
 * const isPaused = await stateManager.isGloballyPaused();
 * if (isPaused) {
 *   // Stop all sending
 * }
 * ```
 * 
 * CONTROL OPERATIONS:
 * ```
 * await stateManager.setGlobalPause(true, 'Emergency: high block rate');
 * await stateManager.setGlobalPause(false);
 * ```
 */

import { GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';

export interface GlobalState {
  paused: boolean;
  reason?: string;
  pausedAt?: number;
  pausedBy?: string;
}

// Pause cache for reducing DynamoDB reads
interface PauseCache {
  paused: boolean;
  reason?: string;
  cachedAt: number;
}

class GlobalStateManager {
  private readonly PK = 'SYSTEM';
  private readonly SK = 'GLOBAL_STATE';
  private readonly CACHE_TTL_MS = 10000; // 10 seconds
  private pauseCache: PauseCache | null = null;

  /**
   * Check if global pause is active (with 10s cache)
   * Reduces DynamoDB reads and pause latency window
   * All workers must check this before sending
   */
  async isGloballyPaused(): Promise<{ paused: boolean; reason?: string }> {
    const now = Date.now();
    
    // Check cache first
    if (this.pauseCache && (now - this.pauseCache.cachedAt) < this.CACHE_TTL_MS) {
      return {
        paused: this.pauseCache.paused,
        reason: this.pauseCache.reason
      };
    }
    
    // Cache miss or expired - query DynamoDB
    try {
      const response = await dynamoClient.send(
        new GetItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Key: {
            PK: { S: this.PK },
            SK: { S: this.SK }
          }
        })
      );

      const paused = response.Item?.paused?.BOOL || false;
      const reason = response.Item?.reason?.S;
      
      // Update cache
      this.pauseCache = {
        paused,
        reason,
        cachedAt: now
      };

      return { paused, reason };
    } catch (error) {
      console.error('[GlobalStateManager] Error checking global pause state:', error);
      // On error, fail safe: assume not paused to avoid blocking legitimate sends
      // Consider changing this to fail closed (assume paused) for maximum safety
      return { paused: false };
    }
  }

  /**
   * Set global pause state
   * This affects ALL workers immediately (within DynamoDB consistency window)
   * Invalidates cache to ensure immediate effect
   */
  async setGlobalPause(
    paused: boolean,
    reason?: string,
    pausedBy?: string
  ): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);

    await dynamoClient.send(
      new PutItemCommand({
        TableName: TABLES.CAMPAIGNS,
        Item: {
          PK: { S: this.PK },
          SK: { S: this.SK },
          paused: { BOOL: paused },
          ...(reason && { reason: { S: reason } }),
          ...(paused && { pausedAt: { N: timestamp.toString() } }),
          ...(pausedBy && { pausedBy: { S: pausedBy } }),
          updatedAt: { N: timestamp.toString() }
        }
      })
    );
    
    // Invalidate cache immediately
    this.pauseCache = {
      paused,
      reason,
      cachedAt: Date.now()
    };

    console.log(`✅ [GlobalStateManager] Global pause ${paused ? 'ENABLED' : 'DISABLED'}`);
    if (reason) {
      console.log(`   Reason: ${reason}`);
    }
  }

  /**
   * Get full global state (for admin UI)
   */
  async getGlobalState(): Promise<GlobalState> {
    try {
      const response = await dynamoClient.send(
        new GetItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Key: {
            PK: { S: this.PK },
            SK: { S: this.SK }
          }
        })
      );

      if (!response.Item) {
        return { paused: false };
      }

      return {
        paused: response.Item.paused?.BOOL || false,
        reason: response.Item.reason?.S,
        pausedAt: response.Item.pausedAt?.N ? parseInt(response.Item.pausedAt.N, 10) : undefined,
        pausedBy: response.Item.pausedBy?.S
      };
    } catch (error) {
      console.error('[GlobalStateManager] Error getting global state:', error);
      return { paused: false };
    }
  }
}

// Singleton instance
let globalStateManager: GlobalStateManager | null = null;

export function getGlobalStateManager(): GlobalStateManager {
  if (!globalStateManager) {
    globalStateManager = new GlobalStateManager();
  }
  return globalStateManager;
}
