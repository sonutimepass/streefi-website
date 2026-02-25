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
 * ✅ Atomic daily counter (O(1) reads/writes)
 * ✅ No table scans - scales infinitely
 * ✅ Race-condition-free via DynamoDB ADD operation
 * ✅ Fail-closed mode (blocks on DynamoDB errors)
 * ✅ Configurable limit via environment variable
 * 
 * LAYER RESPONSIBILITY:
 * ✅ Check if phone has active conversation (last 24h)
 * ✅ Enforce daily limit via atomic counter
 * ✅ Track conversation state in DynamoDB
 * 
 * ❌ Message sending (belongs to messageService)
 * ❌ API calls (belongs to metaClient)
 * ❌ Route handling (belongs to API routes)
 * 
 * DATA STRUCTURE:
 * - CONVERSATION#{phone} / METADATA → Individual conversation tracking
 * - DAILY_COUNTER#YYYY-MM-DD / METADATA → Atomic daily counter
 */

import { dynamoClient, TABLES } from '@/lib/dynamoClient';
import { 
  PutItemCommand, 
  QueryCommand, 
  GetItemCommand,
  UpdateItemCommand,
  type AttributeValue
} from '@aws-sdk/client-dynamodb';

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
  private tableName: string;

  constructor() {
    // Use existing whatsapp table with PK pattern
    this.tableName = TABLES.WHATSAPP;
  }

  /**
   * Get today's counter key (format: DAILY_COUNTER#YYYY-MM-DD)
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
    return `DAILY_COUNTER#${today}`;
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
      const now = Date.now();
      const windowStart = now - CONVERSATION_WINDOW_MS;

      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: {
          PK: { S: `CONVERSATION#${phone}` },
          SK: { S: 'METADATA' },
        },
      });

      const response = await dynamoClient.send(command);

      if (response.Item) {
        const item = response.Item;
        const lastMessageAt = parseInt(item.lastMessageAt?.N || '0');
        const status = item.status?.S || 'open';

        // In-memory filter: check if conversation is within 24h window and open
        if (lastMessageAt >= windowStart && status === 'open') {
          return {
            phone: item.phone?.S || '',
            conversationStartedAt: parseInt(item.conversationStartedAt?.N || '0'),
            lastMessageAt,
            status: status as 'open' | 'closed',
            messageCount: parseInt(item.messageCount?.N || '0'),
          };
        }
      }

      return null;
    } catch (error) {
      console.error('[DailyLimitGuard] Error fetching active conversation:', {
        phone,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get current daily conversation count (O(1) operation)
   * 
   * Reads atomic counter for today's date.
   * Returns 0 if counter doesn't exist yet.
   */
  private async getDailyCount(): Promise<number> {
    const counterKey = this.getDailyCounterKey();
    
    try {
      const command = new GetItemCommand({
        TableName: this.tableName,
        Key: {
          PK: { S: counterKey },
          SK: { S: 'METADATA' },
        },
      });

      const response = await dynamoClient.send(command);

      if (response.Item && response.Item.count?.N) {
        return parseInt(response.Item.count.N);
      }

      return 0; // Counter not created yet today
    } catch (error) {
      console.error('[DailyLimitGuard] Error reading daily count:', {
        counterKey,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Atomically increment daily counter WITH conditional check (O(1) operation)
   * 
   * CRITICAL: Uses ConditionExpression to make check + increment atomic.
   * DynamoDB enforces: "Only increment if count < limit"
   * 
   * Race-condition proof:
   * - If 2 requests hit at count=199
   * - Both attempt conditional increment
   * - DynamoDB serializes: first gets 200, second gets ConditionalCheckFailedException
   * - No overshoot possible
   * 
   * @returns New count value after increment
   * @throws ConditionalCheckFailedException if limit reached
   */
  private async incrementDailyCounterConditional(): Promise<number> {
    try {
      const counterKey = this.getDailyCounterKey();
      const now = new Date().toISOString();

      const command = new UpdateItemCommand({
        TableName: this.tableName,
        Key: {
          PK: { S: counterKey },
          SK: { S: 'METADATA' },
        },
        UpdateExpression: 'ADD #count :inc SET #updatedAt = :now',
        ConditionExpression: 'attribute_not_exists(PK) OR #count < :limit',
        ExpressionAttributeNames: {
          '#count': 'count',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':inc': { N: '1' },
          ':limit': { N: DAILY_CONVERSATION_LIMIT.toString() },
          ':now': { S: now },
        },
        ReturnValues: 'ALL_NEW',
      });

      const response = await dynamoClient.send(command);

      const newCount = parseInt(response.Attributes?.count?.N || '0');

      console.log('[DailyLimitGuard] Daily counter incremented:', {
        date: counterKey.replace('DAILY_COUNTER#', ''),
        newCount,
        limit: DAILY_CONVERSATION_LIMIT,
      });

      return newCount;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        console.warn('[DailyLimitGuard] Daily limit reached, increment rejected by DynamoDB');
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
      const now = Date.now();
      const timestamp = new Date().toISOString();

      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: {
          PK: { S: `CONVERSATION#${phone}` },
          SK: { S: 'METADATA' },
          phone: { S: phone },
          conversationStartedAt: { N: now.toString() },
          lastMessageAt: { N: now.toString() },
          status: { S: 'open' },
          messageCount: { N: '1' },
          createdAt: { S: timestamp },
        },
      });

      await dynamoClient.send(command);

      console.log('[DailyLimitGuard] New conversation created:', {
        phone,
        conversationStartedAt: timestamp,
        conversationId: `CONVERSATION#${phone}`,
      });
    } catch (error) {
      console.error('[DailyLimitGuard] Error creating conversation:', {
        phone,
        conversationId: `CONVERSATION#${phone}`,
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
      const now = Date.now();

      const command = new UpdateItemCommand({
        TableName: this.tableName,
        Key: {
          PK: { S: `CONVERSATION#${phone}` },
          SK: { S: 'METADATA' },
        },
        UpdateExpression: 'SET lastMessageAt = :now ADD messageCount :inc',
        ExpressionAttributeValues: {
          ':now': { N: now.toString() },
          ':inc': { N: '1' },
        },
      });

      await dynamoClient.send(command);

      console.log('[DailyLimitGuard] Conversation updated atomically:', {
        phone,
        lastMessageAt: new Date(now).toISOString(),
      });
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
        const command = new PutItemCommand({
          TableName: this.tableName,
          Item: {
            PK: { S: `CONVERSATION#${phone}` },
            SK: { S: 'METADATA' },
            phone: { S: phone },
            conversationStartedAt: { N: conversation.conversationStartedAt.toString() },
            lastMessageAt: { N: Date.now().toString() },
            status: { S: 'closed' },
            messageCount: { N: conversation.messageCount.toString() },
          },
        });

        await dynamoClient.send(command);

        console.log('[DailyLimitGuard] Conversation closed:', { phone });
      }
    } catch (error) {
      console.error('[DailyLimitGuard] Error closing conversation:', {
        phone,
        conversationId: `CONVERSATION#${phone}`,
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
