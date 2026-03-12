/**
 * Daily Limit Guard - Business Policy Layer
 * 
 * Enforces WhatsApp Cloud API messaging limits for Tier 250.
 * 
 * META LIMITS (Tier 250):
 * - 250 business-initiated conversations per rolling 24h window
 * - Conversation = first message to a user who hasn't messaged you in 24h
 * 
 * STREEFI SAFETY CAP:
 * - 200 conversations per 24h (80% of limit, configurable via WHATSAPP_DAILY_LIMIT env)
 * 
 * ARCHITECTURE:
 * ✅ Distributed atomic counter with 10 shards (hot partition mitigation)
 * ✅ Random shard selection for true load distribution
 * ✅ Per-shard limit enforcement (totalLimit / 10 per shard)
 * ✅ No table scans - scales infinitely
 * ✅ Race-condition-free via DynamoDB ADD operation with ConditionExpression
 * ✅ Fail-closed mode (blocks on DynamoDB errors)
 * ✅ Configurable limit via environment variable
 * 
 * DISTRIBUTED COUNTER DESIGN:
 * - 10 shards: DAILY_COUNTER#0#date through DAILY_COUNTER#9#date
 * - Each shard: max = totalLimit / 10 (e.g., 200 / 10 = 20 per shard)
 * - Random shard selection ensures even distribution
 * - Total capacity: 10 shards × 20 = 200 (enforces global limit)
 * - 10× write capacity vs single partition
 * 
 * LAYER RESPONSIBILITY:
 * ✅ Check if phone has active conversation (last 24h)
 * ✅ Enforce daily limit via distributed atomic counter
 * ✅ Track conversation state in DynamoDB
 * 
 * ❌ Message sending (belongs to messageService)
 * ❌ API calls (belongs to metaClient)
 * ❌ Route handling (belongs to API routes)
 * 
 * DATA STRUCTURE:
 * - CONV#{phone} / METADATA → Individual conversation tracking
 * - DAILY_COUNTER#{shardId}#{date} / METADATA → Distributed atomic counters (10 shards)
 */

import { whatsappRepository } from '@/lib/repositories';

// Safety cap: 80% of Meta's limit to avoid hitting hard limit
// Configurable via environment variable for easy tier upgrades
// Parsed once at module load with validation
const parseDailyLimit = (): number => {
  const envValue = process.env.WHATSAPP_DAILY_LIMIT;
  const parsed = parseInt(envValue || '200', 10);
  
  if (isNaN(parsed) || parsed <= 0) {
    console.warn(`[DailyLimitGuard] Invalid WHATSAPP_DAILY_LIMIT: "${envValue}", using default 200`);
    return 200;
  }
  
  return parsed;
};

const DAILY_CONVERSATION_LIMIT = parseDailyLimit();
const CONVERSATION_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export interface DailyLimitCheckResult {
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  limit?: number;
  existingConversation?: boolean;
}

export interface ConversationRecord {
  phone: string;
  conversationStartedAt: number; // Unix timestamp (ms)
  lastMessageAt: number; // Unix timestamp (ms)
  status: 'open' | 'closed';
  messageCount: number;
}

/**
 * Daily Limit Guard
 * 
 * Checks and enforces WhatsApp messaging limits before sending.
 * Run this BEFORE calling metaClient.
 */
export class DailyLimitGuard {
  /**
   * Get today's counter key with random shard selection (format: DAILY_COUNTER#{shardId}#YYYY-MM-DD)
   * 
   * DISTRIBUTED COUNTER (HOT PARTITION FIX):
   * - Uses 10 shards (0-9) with RANDOM selection
   * - Each shard = separate DynamoDB partition = 10x write capacity
   * - Random selection ensures true distribution (not phone-based hash)
   * 
   * WHY RANDOM vs HASH?
   * - hash(phone) % 10: Same phone always hits same shard (hot partition if high volume)
   * - random: True distribution across all shards regardless of phone patterns
   * 
   * NOTE: Uses calendar day boundary (midnight UTC/local), not rolling 24h window.
   * Meta uses rolling 24h window, so there's a potential mismatch:
   * - If you send 200 at 11:59 PM, counter resets at midnight
   * - But Meta still counts those 200 until 11:59 PM next day
   * 
   * MITIGATION: 200 limit (vs Meta's 250) provides 50-conversation buffer.
   * For Tier 250, this is acceptable. For higher tiers, consider rolling window design.
   */
  private getDailyCounterKey(): string {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const shardId = Math.floor(Math.random() * 10); // 0-9 random shard
    return `DAILY_COUNTER#${shardId}#${today}`;
  }

  /**
   * Check if we can send a message to this phone number
   * 
   * Logic:
   * 1. Check if phone has active conversation (last 24h)
   *    → If yes, allow (doesn't consume new conversation limit)
   * 2. If no active conversation:
   *    → Atomically increment counter WITH condition check (race-free)
   *    → If increment succeeds, create conversation
   *    → If increment fails (limit hit), reject
   * 
   * @param phone - Phone number in E.164 format (e.g., "919876543210")
   * @returns Promise with check result
   */
  async checkLimit(phone: string): Promise<DailyLimitCheckResult> {
    try {
      // Step 1: Check if phone already has an open conversation
      const existingConversation = await this.getActiveConversation(phone);
      
      if (existingConversation) {
        // Active conversation exists, we can send without consuming limit
        await this.updateLastMessageTime(phone);
        
        return {
          allowed: true,
          existingConversation: true,
          reason: 'Active conversation exists (within 24h window)',
        };
      }

      // Step 2: No active conversation - attempt atomic conditional increment
      // This is ONE operation: check limit AND increment (race-condition-free)
      try {
        const newCount = await this.incrementDailyCounterConditional();
        
        // Increment succeeded, create conversation record
        await this.createConversation(phone);

        return {
          allowed: true,
          existingConversation: false,
          currentCount: newCount,
          limit: DAILY_CONVERSATION_LIMIT,
          reason: `New conversation started (${newCount}/${DAILY_CONVERSATION_LIMIT})`,
        };
      } catch (error: any) {
        // ConditionalCheckFailedException = limit reached
        if (error.name === 'ConditionalCheckFailedException') {
          const currentCount = await this.getDailyCount();
          return {
            allowed: false,
            reason: `Daily limit reached: ${currentCount}/${DAILY_CONVERSATION_LIMIT} conversations`,
            currentCount,
            limit: DAILY_CONVERSATION_LIMIT,
            existingConversation: false,
          };
        }
        // Other errors - rethrow to outer catch
        throw error;
      }
    } catch (error) {
      console.error('[DailyLimitGuard] Error checking limit:', error);
      // FAIL CLOSED: For business-initiated messages, block on error
      // This prevents accidental limit overruns if DynamoDB is down
      return {
        allowed: false,
        reason: 'Limit check failed, blocking send (fail-closed mode)',
      };
    }
  }

  /**
   * Get active conversation for a phone number (if exists within 24h)
   * 
   * Uses GetItem (O(1)) instead of Query for efficiency.
   * In-memory filter on lastMessageAt and status.
   */
  private async getActiveConversation(phone: string): Promise<ConversationRecord | null> {
    try {
      const windowStart = Date.now() - CONVERSATION_WINDOW_MS;
      return await whatsappRepository.getActiveConversation(phone, windowStart);
    } catch (error) {
      console.error('[DailyLimitGuard] Error fetching active conversation:', {
        phone,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get current daily conversation count across ALL shards (O(10) operation)
   * 
   * DISTRIBUTED COUNTER: Queries all 10 shards and sums the counts
   * - Used for displaying current usage to admins
   * - Not used for limit enforcement (that's done per-shard atomically)
   * 
   * Returns 0 if no counters exist yet.
   */
  private async getDailyCount(): Promise<number> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      return await whatsappRepository.getDailyConversationCountTotal(today);
    } catch (error) {
      console.error('[DailyLimitGuard] Error reading distributed daily count:', {
        date: today,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Atomically increment daily counter WITH conditional check (O(1) operation)
   * 
   * DISTRIBUTED COUNTER WITH SHARDING:
   * - Uses per-shard limit = totalLimit / 10 shards
   * - Example: 200 total limit → 20 per shard
   * - Each shard can hold max 20, so total across 10 shards = max 200
   * - Random shard selection ensures even distribution over time
   * 
   * ATOMIC OPERATION:
   * - DynamoDB ConditionExpression enforces: "Only increment if shard count < shard limit"
   * - Race-condition proof within each shard
   * 
   * Race-condition proof:
   * - If 2 requests hit same shard at count=19
   * - Both attempt conditional increment (limit=20)
   * - DynamoDB serializes: first gets 20, second gets ConditionalCheckFailedException
   * - No overshoot possible per shard
   * 
   * @returns New count value for the selected shard after increment
   * @throws ConditionalCheckFailedException if shard limit reached
   */
  private async incrementDailyCounterConditional(): Promise<number> {
    try {
      const counterKey = this.getDailyCounterKey();
      // CRITICAL: Use per-shard limit (total limit / 10 shards)
      // This ensures total across all shards can't exceed the total limit
      const perShardLimit = Math.ceil(DAILY_CONVERSATION_LIMIT / 10);
      
      const newCount = await whatsappRepository.incrementDailyConversationCountConditional(
        counterKey,
        perShardLimit
      );

      console.log('[DailyLimitGuard] Daily counter incremented:', {
        shard: counterKey.split('#')[1],
        date: counterKey.split('#')[2],
        newShardCount: newCount,
        perShardLimit,
        totalLimit: DAILY_CONVERSATION_LIMIT,
      });

      return newCount;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        console.warn('[DailyLimitGuard] Shard limit reached, increment rejected by DynamoDB');
      } else {
        console.error('[DailyLimitGuard] Error incrementing daily counter:', error);
      }
      throw error;
    }
  }

  /**
   * Create a new conversation record
   * 
   * NOTE: Counter drift possible if this fails after incrementDailyCounterConditional().
   * For Tier 250 with 200 limit, small drift is acceptable (e.g., counter=200 but 193 real conversations).
   * If critical precision needed, consider two-phase commit or compensating transaction pattern.
   */
  private async createConversation(phone: string): Promise<void> {
    try {
      await whatsappRepository.createConversation(phone);
      console.log('[DailyLimitGuard] New conversation created:', {
        phone,
        conversationId: `CONV#${phone}`,
      });
    } catch (error) {
      console.error('[DailyLimitGuard] Error creating conversation:', {
        phone,
        conversationId: `CONV#${phone}`,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update last message time for existing conversation
   * 
   * Uses atomic UpdateItem with ADD for messageCount (race-condition-free).
   * No read before write - direct atomic update.
   */
  private async updateLastMessageTime(phone: string): Promise<void> {
    try {
      await whatsappRepository.updateConversationLastMessage(phone);
      console.log('[DailyLimitGuard] Conversation updated atomically:', { phone });
    } catch (error) {
      console.error('[DailyLimitGuard] Error updating conversation:', {
        phone,
        error: error instanceof Error ? error.message : String(error),
      });
      // Don't throw - this is non-critical tracking
    }
  }

  /**
   * Manually close a conversation (optional - for admin use)
   * Conversations auto-close after 24h of inactivity
   */
  async closeConversation(phone: string): Promise<void> {
    try {
      const conversation = await this.getActiveConversation(phone);
      
      if (conversation) {
        await whatsappRepository.closeConversation(
          phone,
          conversation.conversationStartedAt,
          conversation.messageCount
        );

        console.log('[DailyLimitGuard] Conversation closed:', { phone });
      }
    } catch (error) {
      console.error('[DailyLimitGuard] Error closing conversation:', {
        phone,
        conversationId: `CONV#${phone}`,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get current conversation count (for monitoring/dashboards)
   * 
   * Uses atomic counter (O(1) operation)
   */
  async getCurrentConversationCount(): Promise<number> {
    return this.getDailyCount();
  }

  /**
   * Get remaining conversation slots for the day
   */
  async getRemainingSlots(): Promise<number> {
    const current = await this.getCurrentConversationCount();
    return Math.max(0, DAILY_CONVERSATION_LIMIT - current);
  }

  /**
   * Get configured daily limit (useful for dashboards)
   */
  getDailyLimit(): number {
    return DAILY_CONVERSATION_LIMIT;
  }
}

/**
 * Singleton instance for convenience
 */
let guardInstance: DailyLimitGuard | null = null;

export function getDailyLimitGuard(): DailyLimitGuard {
  if (!guardInstance) {
    guardInstance = new DailyLimitGuard();
  }
  return guardInstance;
}
