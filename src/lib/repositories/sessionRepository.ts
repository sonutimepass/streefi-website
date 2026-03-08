/**
 * Session Repository
 * 
 * Abstracts DynamoDB operations for admin session records.
 * Table: streefi_sessions
 * Schema: Simple key (session_id) - matches current production schema
 * TTL: Enabled (auto-cleanup after expiry)
 * 
 * Operations:
 * - getSessionById: Retrieve session data by session_id
 * - createSession: Create new admin session
 * - deleteSession: Remove session (logout)
 */

import { 
  DynamoDBClient, 
  GetItemCommand, 
  PutItemCommand, 
  DeleteItemCommand,
  ScanCommand
} from "@aws-sdk/client-dynamodb";
import { dynamoClient, TABLES } from "../dynamoClient";

/**
 * Session entity from DynamoDB (matches current production schema)
 */
export interface SessionRecord {
  session_id: string;          // Partition key
  email: string;              // Admin email
  type: string;               // "whatsapp-session" | "email-session"
  status: string;             // "active"
  expiresAt: number;          // Unix timestamp (seconds)
  createdAt: string;          // ISO 8601 timestamp
}

/**
 * Repository for session operations
 */
export class SessionRepository {
  private client: DynamoDBClient;
  private tableName: string;

  constructor(client: DynamoDBClient = dynamoClient, tableName: string = TABLES.SESSIONS) {
    this.client = client;
    this.tableName = tableName;
  }

  /**
   * Get session by session_id
   * @param sessionId - The session ID from cookie
   * @returns Session record or null if not found/expired
   */
  async getSessionById(sessionId: string): Promise<SessionRecord | null> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            session_id: { S: sessionId }
          }
        })
      );

      if (!response.Item) {
        return null;
      }

      const expiresAt = parseInt(response.Item.expiresAt?.N || "0", 10);
      const now = Math.floor(Date.now() / 1000);

      // Check if session is expired
      if (expiresAt < now) {
        console.log("[SessionRepository] Session expired:", sessionId);
        return null;
      }

      return {
        session_id: response.Item.session_id?.S || "",
        email: response.Item.email?.S || "",
        type: response.Item.type?.S || "",
        status: response.Item.status?.S || "",
        expiresAt: expiresAt,
        createdAt: response.Item.createdAt?.S || ""
      };
    } catch (error) {
      console.error("[SessionRepository] Error fetching session:", error);
      throw new Error(`Failed to fetch session: ${sessionId}`);
    }
  }

  /**
   * Create new session
   * @param session - Session data to create
   * @returns Created session record
   */
  async createSession(session: SessionRecord): Promise<SessionRecord> {
    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: {
            session_id: { S: session.session_id },
            email: { S: session.email },
            type: { S: session.type },
            status: { S: session.status },
            expiresAt: { N: session.expiresAt.toString() },
            createdAt: { S: session.createdAt }
          }
        })
      );

      console.log("[SessionRepository] Session created:", session.session_id);
      return session;
    } catch (error) {
      console.error("[SessionRepository] Error creating session:", error);
      throw new Error("Failed to create session");
    }
  }

  /**
   * Delete session (logout)
   * @param sessionId - The session ID to delete
   */
  async deleteSession(sessionId: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteItemCommand({
          TableName: this.tableName,
          Key: {
            session_id: { S: sessionId }
          }
        })
      );

      console.log("[SessionRepository] Session deleted:", sessionId);
    } catch (error) {
      console.error("[SessionRepository] Error deleting session:", error);
      throw new Error("Failed to delete session");
    }
  }

  /**
   * Check if session is valid (exists and not expired)
   * @param sessionId - The session ID to check
   * @returns true if session is valid, false otherwise
   */
  async isSessionValid(sessionId: string): Promise<boolean> {
    const session = await this.getSessionById(sessionId);
    return session !== null;
  }

  /**
   * List all active sessions (excludes RATE# rate-limit records and expired sessions).
   * @param type - Optional filter by session type ("whatsapp-session" | "email-session")
   */
  async listActiveSessions(type?: string): Promise<SessionRecord[]> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const response = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression:
            'NOT begins_with(session_id, :ratePrefix) AND expiresAt > :now',
          ExpressionAttributeValues: {
            ':ratePrefix': { S: 'RATE#' },
            ':now': { N: now.toString() },
          },
        })
      );

      const sessions: SessionRecord[] = (response.Items || []).map(item => ({
        session_id: item.session_id?.S || '',
        email: item.email?.S || '',
        type: item.type?.S || '',
        status: item.status?.S || '',
        expiresAt: parseInt(item.expiresAt?.N || '0', 10),
        createdAt: item.createdAt?.S || '',
      }));

      return type ? sessions.filter(s => s.type === type) : sessions;
    } catch (error) {
      console.error('[SessionRepository] Error listing sessions:', error);
      throw new Error('Failed to list sessions');
    }
  }

  // ==================== RATE LIMITING ====================
  // Stored in sessions table as RATE#<ip> records (not polluting admins table)

  async checkRateLimit(
    ip: string,
    maxAttempts: number = 5,
    lockDurationMinutes: number = 15
  ): Promise<{ blocked: boolean; attempts?: number; lockUntil?: number; remainingTime?: number }> {
    try {
      const rateKey = `RATE#${ip}`;
      const result = await this.client.send(
        new GetItemCommand({ TableName: this.tableName, Key: { session_id: { S: rateKey } } })
      );

      if (!result.Item) return { blocked: false };

      const attempts = parseInt(result.Item.attempts?.N || '0');
      const lockUntil = result.Item.lockUntil?.N ? parseInt(result.Item.lockUntil.N) : undefined;

      if (lockUntil) {
        const now = Math.floor(Date.now() / 1000);
        if (now < lockUntil) {
          return { blocked: true, attempts, lockUntil, remainingTime: lockUntil - now };
        }
        // Lock expired — clean up
        await this.client.send(
          new DeleteItemCommand({ TableName: this.tableName, Key: { session_id: { S: rateKey } } })
        );
      }

      return { blocked: false, attempts };
    } catch (error) {
      console.error('[SessionRepository] Rate limit check error:', error);
      return { blocked: false }; // fail open to prevent lockout
    }
  }

  async recordFailedAttempt(
    ip: string,
    maxAttempts: number = 5,
    lockDurationMinutes: number = 15
  ): Promise<void> {
    try {
      const rateKey = `RATE#${ip}`;
      const existing = await this.client.send(
        new GetItemCommand({ TableName: this.tableName, Key: { session_id: { S: rateKey } } })
      );

      const currentAttempts = existing.Item?.attempts?.N ? parseInt(existing.Item.attempts.N) : 0;
      const newAttempts = currentAttempts + 1;
      const now = Math.floor(Date.now() / 1000);
      const ttl = now + 24 * 60 * 60;

      const item: Record<string, any> = {
        session_id: { S: rateKey },
        ip: { S: ip },
        type: { S: 'rate-limit' },
        attempts: { N: newAttempts.toString() },
        lastAttempt: { S: new Date().toISOString() },
        expiresAt: { N: ttl.toString() },
      };

      if (newAttempts >= maxAttempts) {
        const lockUntil = now + lockDurationMinutes * 60;
        item.lockUntil = { N: lockUntil.toString() };
        item.expiresAt = { N: lockUntil.toString() };
      }

      await this.client.send(new PutItemCommand({ TableName: this.tableName, Item: item }));
    } catch (error) {
      console.error('[SessionRepository] Failed to record failed attempt:', error);
    }
  }

  async resetRateLimit(ip: string): Promise<void> {
    try {
      const rateKey = `RATE#${ip}`;
      await this.client.send(
        new DeleteItemCommand({ TableName: this.tableName, Key: { session_id: { S: rateKey } } })
      );
    } catch (error) {
      console.error('[SessionRepository] Failed to reset rate limit:', error);
    }
  }
}

// Export singleton instance
export const sessionRepository = new SessionRepository();
