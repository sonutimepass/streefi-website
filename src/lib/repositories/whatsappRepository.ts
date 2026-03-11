/**
 * WhatsApp Repository
 * 
 * Abstracts DynamoDB operations for WhatsApp-related data.
 * Table: streefi_whatsapp (TABLES.WHATSAPP)
 * Purpose: WhatsApp templates, settings, system configuration
 * Note: whatsapp_conversations (TABLES.WHATSAPP_CONVERSATIONS) reserved for customer conversation storage
 * Schema: Composite keys (PK + SK)
 * 
 * PK/SK Patterns:
 * - Templates: PK=TEMPLATE#{name}, SK=METADATA
 * - Settings: PK=SETTINGS, SK=GLOBAL
 * - Warmup State: PK=WARMUP#{accountId}, SK=STATE
 * - Daily Counters: PK=DAILY_COUNTER, SK={date}
 * 
 * Operations:
 * - Template CRUD (create, get, update, delete, list)
 * - Settings management (get, update)
 * - Account warmup tracking
 * - Daily message counters
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  ScanCommand,
  QueryCommand,
  BatchWriteItemCommand
} from "@aws-sdk/client-dynamodb";
import { dynamoClient, TABLES } from "../dynamoClient";

/**
 * Template categories (Meta-defined)
 */
export type TemplateCategory = 
  | 'MARKETING'
  | 'UTILITY'
  | 'AUTHENTICATION';

/**
 * Internal status - controlled by admin
 */
export type TemplateStatus =
  | 'draft'
  | 'active'
  | 'archived';

/**
 * Meta/WhatsApp approval status
 */
export type MetaStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAUSED';

/**
 * WhatsApp template entity (matches production workflow)
 * Templates are created in Meta, approved, then synced to DB
 */
export interface WhatsAppTemplate {
  templateId: string;          // Internal UUID
  name: string;                // Template name (Meta identifier)
  category: TemplateCategory;  // MARKETING | UTILITY | AUTHENTICATION
  language: string;            // Language code (e.g., 'en', 'en_US')
  variables: string[];         // Variable names for template (e.g., ['customer_name', 'order_id'])
  status: TemplateStatus;      // Internal: draft | active | archived
  metaStatus: MetaStatus;      // Meta approval: APPROVED | PENDING | REJECTED | etc.
  createdAt: string;           // ISO timestamp
  updatedAt: string;           // ISO timestamp
  // Sync tracking (for fetching from Meta)
  syncedFromMeta?: boolean;    // Whether synced from Meta API
  lastSyncTime?: string;       // Last sync timestamp
  metaTemplateId?: string;     // Original Meta template ID
}

/**
 * Platform settings entity
 */
export interface PlatformSettings {
  kill_switch_enabled: boolean;
  daily_limit?: number;
  rate_limit?: number;
  warmup_enabled?: boolean;
  updated_at?: number;
}

/**
 * System settings entity (campaign system configuration)
 * Stored as: PK=SYSTEM, SK=SETTINGS
 */
export interface SystemSettings {
  maxMessagesPerSecond: number;       // Rate limit (e.g., 20)
  defaultDailyCap: number;            // Default cap for new campaigns (e.g., 200)
  metaTierLimit: number;              // Meta API tier limit (e.g., 250)
  safetyBuffer: number;               // Safety buffer % (e.g., 80 = 80%)
  updatedBy?: string;
  updatedAt?: string;
}

/**
 * Kill switch status (emergency system-wide disable)
 * Stored as: PK=SYSTEM, SK=KILL_SWITCH
 */
export interface KillSwitchStatus {
  enabled: boolean;
  reason?: string;
  enabledBy?: string;
  enabledAt?: string;
  disabledBy?: string;
  disabledAt?: string;
}

/**
 * Account warmup state
 */
export interface AccountWarmupState {
  account_id: string;
  phase: string;
  daily_limit: number;
  messages_today: number;
  last_updated: number;
}

/**
 * Repository for WhatsApp-related operations
 */
export class WhatsAppRepository {
  private client: DynamoDBClient;
  private tableName: string;

  constructor(client: DynamoDBClient = dynamoClient, tableName: string = TABLES.WHATSAPP) {
    this.client = client;
    this.tableName = tableName;
  }

  // ==================== TEMPLATE OPERATIONS ====================

  /**
   * Get template by ID (primary key)
   */
  async getTemplate(templateId: string): Promise<WhatsAppTemplate | null> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `TEMPLATE#${templateId}` },
            SK: { S: "METADATA" }
          }
        })
      );

      if (!response.Item) {
        return null;
      }

      return this.parseTemplateItem(response.Item);
    } catch (error) {
      console.error("[WhatsAppRepository] Error fetching template:", error);
      throw new Error(`Failed to fetch template: ${templateId}`);
    }
  }

  /**
   * Get template by name (requires scan - use sparingly)
   */
  async getTemplateByName(name: string): Promise<WhatsAppTemplate | null> {
    try {
      const response = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: "begins_with(PK, :prefix) AND SK = :sk AND #name = :name",
          ExpressionAttributeNames: {
            "#name": "name"
          },
          ExpressionAttributeValues: {
            ":prefix": { S: "TEMPLATE#" },
            ":sk": { S: "METADATA" },
            ":name": { S: name }
          },
          Limit: 1
        })
      );

      if (!response.Items || response.Items.length === 0) {
        return null;
      }

      return this.parseTemplateItem(response.Items[0]);
    } catch (error) {
      console.error("[WhatsAppRepository] Error fetching template by name:", error);
      throw new Error(`Failed to fetch template: ${name}`);
    }
  }

  /**
   * Create or update template
   * Used when syncing from Meta or creating templates
   */
  async saveTemplate(template: WhatsAppTemplate): Promise<void> {
    try {
      const item: any = {
        PK: { S: `TEMPLATE#${template.templateId}` },
        SK: { S: "METADATA" },
        templateId: { S: template.templateId },
        name: { S: template.name },
        category: { S: template.category },
        language: { S: template.language },
        variables: { L: template.variables.map(v => ({ S: v })) },
        status: { S: template.status },
        metaStatus: { S: template.metaStatus },
        createdAt: { S: template.createdAt },
        updatedAt: { S: template.updatedAt }
      };

      // Optional fields
      if (template.syncedFromMeta !== undefined) {
        item.syncedFromMeta = { BOOL: template.syncedFromMeta };
      }
      if (template.lastSyncTime) {
        item.lastSyncTime = { S: template.lastSyncTime };
      }
      if (template.metaTemplateId) {
        item.metaTemplateId = { S: template.metaTemplateId };
      }

      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: item
        })
      );

      console.log("[WhatsAppRepository] Template saved:", template.name, template.templateId);
    } catch (error) {
      console.error("[WhatsAppRepository] Error saving template:", error);
      throw new Error(`Failed to save template: ${template.name}`);
    }
  }

  /**
   * Update template status (internal status: draft/active/archived)
   */
  async updateTemplateStatus(templateId: string, status: TemplateStatus): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `TEMPLATE#${templateId}` },
            SK: { S: "METADATA" }
          },
          UpdateExpression: "SET #status = :status, updatedAt = :timestamp",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":status": { S: status },
            ":timestamp": { S: new Date().toISOString() }
          }
        })
      );

      console.log("[WhatsAppRepository] Template status updated:", templateId, status);
    } catch (error) {
      console.error("[WhatsAppRepository] Error updating template status:", error);
      throw new Error(`Failed to update template status: ${templateId}`);
    }
  }

  /**
   * Update template Meta status (APPROVED/PENDING/REJECTED/etc)
   */
  async updateTemplateMetaStatus(templateId: string, metaStatus: MetaStatus): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `TEMPLATE#${templateId}` },
            SK: { S: "METADATA" }
          },
          UpdateExpression: "SET metaStatus = :status, updatedAt = :timestamp, lastSyncTime = :syncTime",
          ExpressionAttributeValues: {
            ":status": { S: metaStatus },
            ":timestamp": { S: new Date().toISOString() },
            ":syncTime": { S: new Date().toISOString() }
          }
        })
      );

      console.log("[WhatsAppRepository] Template Meta status updated:", templateId, metaStatus);
    } catch (error) {
      console.error("[WhatsAppRepository] Error updating template Meta status:", error);
      throw new Error(`Failed to update template Meta status: ${templateId}`);
    }
  }

  /**
   * Delete template by ID
   */
  async deleteTemplate(templateId: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `TEMPLATE#${templateId}` },
            SK: { S: "METADATA" }
          }
        })
      );

      console.log("[WhatsAppRepository] Template deleted:", templateId);
    } catch (error) {
      console.error("[WhatsAppRepository] Error deleting template:", error);
      throw new Error(`Failed to delete template: ${templateId}`);
    }
  }

  /**
   * List all templates
   */
  async listTemplates(): Promise<WhatsAppTemplate[]> {
    try {
      const response = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
          ExpressionAttributeValues: {
            ":prefix": { S: "TEMPLATE#" },
            ":sk": { S: "METADATA" }
          }
        })
      );

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items.map(item => this.parseTemplateItem(item));
    } catch (error) {
      console.error("[WhatsAppRepository] Error listing templates:", error);
      throw new Error("Failed to list templates");
    }
  }

  // ==================== SETTINGS OPERATIONS ====================

  /**
   * Get platform settings
   */
  async getSettings(): Promise<PlatformSettings | null> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: "SETTINGS" },
            SK: { S: "GLOBAL" }
          }
        })
      );

      if (!response.Item) {
        return null;
      }

      return {
        kill_switch_enabled: response.Item.kill_switch_enabled?.BOOL || false,
        daily_limit: response.Item.daily_limit?.N ? parseInt(response.Item.daily_limit.N, 10) : undefined,
        rate_limit: response.Item.rate_limit?.N ? parseInt(response.Item.rate_limit.N, 10) : undefined,
        warmup_enabled: response.Item.warmup_enabled?.BOOL,
        updated_at: response.Item.updated_at?.N ? parseInt(response.Item.updated_at.N, 10) : undefined
      };
    } catch (error) {
      console.error("[WhatsAppRepository] Error fetching settings:", error);
      throw new Error("Failed to fetch platform settings");
    }
  }

  /**
   * Update platform settings
   */
  async updateSettings(settings: Partial<PlatformSettings>): Promise<void> {
    try {
      const now = Date.now();
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: {
            PK: { S: "SETTINGS" },
            SK: { S: "GLOBAL" },
            ...(settings.kill_switch_enabled !== undefined && {
              kill_switch_enabled: { BOOL: settings.kill_switch_enabled }
            }),
            ...(settings.daily_limit && {
              daily_limit: { N: settings.daily_limit.toString() }
            }),
            ...(settings.rate_limit && {
              rate_limit: { N: settings.rate_limit.toString() }
            }),
            ...(settings.warmup_enabled !== undefined && {
              warmup_enabled: { BOOL: settings.warmup_enabled }
            }),
            updated_at: { N: now.toString() }
          }
        })
      );

      console.log("[WhatsAppRepository] Settings updated");
    } catch (error) {
      console.error("[WhatsAppRepository] Error updating settings:", error);
      throw new Error("Failed to update platform settings");
    }
  }

  // ==================== SYSTEM SETTINGS OPERATIONS ====================

  /**
   * Get system settings (campaign system configuration)
   * Returns defaults if no settings exist
   */
  async getSystemSettings(): Promise<SystemSettings> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: "SYSTEM" },
            SK: { S: "SETTINGS" }
          }
        })
      );

      if (!response.Item) {
        // Return defaults if no settings exist
        return {
          maxMessagesPerSecond: 20,
          defaultDailyCap: 200,
          metaTierLimit: 250,
          safetyBuffer: 80
        };
      }

      return {
        maxMessagesPerSecond: parseInt(response.Item.maxMessagesPerSecond?.N || '20', 10),
        defaultDailyCap: parseInt(response.Item.defaultDailyCap?.N || '200', 10),
        metaTierLimit: parseInt(response.Item.metaTierLimit?.N || '250', 10),
        safetyBuffer: parseInt(response.Item.safetyBuffer?.N || '80', 10),
        updatedBy: response.Item.updatedBy?.S,
        updatedAt: response.Item.updatedAt?.S
      };
    } catch (error) {
      console.error("[WhatsAppRepository] Error fetching system settings:", error);
      // Return defaults on error
      return {
        maxMessagesPerSecond: 20,
        defaultDailyCap: 200,
        metaTierLimit: 250,
        safetyBuffer: 80
      };
    }
  }

  /**
   * Update system settings
   */
  async updateSystemSettings(
    settings: Partial<SystemSettings>,
    updatedBy: string
  ): Promise<SystemSettings> {
    try {
      // Get current settings to merge with updates
      const current = await this.getSystemSettings();

      const updated: SystemSettings = {
        maxMessagesPerSecond: settings.maxMessagesPerSecond ?? current.maxMessagesPerSecond,
        defaultDailyCap: settings.defaultDailyCap ?? current.defaultDailyCap,
        metaTierLimit: settings.metaTierLimit ?? current.metaTierLimit,
        safetyBuffer: settings.safetyBuffer ?? current.safetyBuffer,
        updatedBy,
        updatedAt: new Date().toISOString()
      };

      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: {
            PK: { S: "SYSTEM" },
            SK: { S: "SETTINGS" },
            maxMessagesPerSecond: { N: updated.maxMessagesPerSecond.toString() },
            defaultDailyCap: { N: updated.defaultDailyCap.toString() },
            metaTierLimit: { N: updated.metaTierLimit.toString() },
            safetyBuffer: { N: updated.safetyBuffer.toString() },
            updatedBy: { S: updated.updatedBy! },
            updatedAt: { S: updated.updatedAt! }
          }
        })
      );

      console.log(`[WhatsAppRepository] System settings updated by ${updatedBy}`);
      return updated;
    } catch (error) {
      console.error("[WhatsAppRepository] Error updating system settings:", error);
      throw new Error("Failed to update system settings");
    }
  }

  // ==================== KILL SWITCH OPERATIONS ====================

  /**
   * Get kill switch status
   * Returns { enabled: false } if no record exists (safe default)
   */
  async getKillSwitchStatus(): Promise<KillSwitchStatus> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: "SYSTEM" },
            SK: { S: "KILL_SWITCH" }
          }
        })
      );

      if (!response.Item) {
        // No record = kill switch disabled (safe default)
        return { enabled: false };
      }

      return {
        enabled: response.Item.enabled?.BOOL ?? false,
        reason: response.Item.reason?.S,
        enabledBy: response.Item.enabledBy?.S,
        enabledAt: response.Item.enabledAt?.S,
        disabledBy: response.Item.disabledBy?.S,
        disabledAt: response.Item.disabledAt?.S
      };
    } catch (error) {
      console.error("[WhatsAppRepository] Error fetching kill switch status:", error);
      // Fail-safe: If we can't check, assume it's enabled (stop sending)
      return { enabled: true, reason: 'System error - fail-safe activated' };
    }
  }

  /**
   * Update kill switch status (enable or disable)
   */
  async updateKillSwitchStatus(
    action: 'enable' | 'disable',
    adminEmail: string,
    reason?: string
  ): Promise<KillSwitchStatus> {
    try {
      const enabled = action === 'enable';
      const timestamp = new Date().toISOString();

      // Build item
      const item: any = {
        PK: { S: "SYSTEM" },
        SK: { S: "KILL_SWITCH" },
        enabled: { BOOL: enabled },
        updatedAt: { S: timestamp }
      };

      if (enabled) {
        item.enabledBy = { S: adminEmail };
        item.enabledAt = { S: timestamp };
        if (reason) {
          item.reason = { S: reason };
        }
      } else {
        item.disabledBy = { S: adminEmail };
        item.disabledAt = { S: timestamp };
        // Clear reason when disabled
        item.reason = { S: '' };
      }

      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: item
        })
      );

      console.log(`[WhatsAppRepository] Kill switch ${action}d by ${adminEmail}`);

      const status: KillSwitchStatus = {
        enabled,
        reason: enabled ? reason : undefined,
        [enabled ? 'enabledBy' : 'disabledBy']: adminEmail,
        [enabled ? 'enabledAt' : 'disabledAt']: timestamp
      };

      return status;
    } catch (error) {
      console.error("[WhatsAppRepository] Error updating kill switch:", error);
      throw new Error("Failed to update kill switch");
    }
  }

  // ==================== WARMUP OPERATIONS ====================

  /**
   * Get account warmup state
   */
  async getWarmupState(accountId: string): Promise<AccountWarmupState | null> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `WARMUP#${accountId}` },
            SK: { S: "STATE" }
          }
        })
      );

      if (!response.Item) {
        return null;
      }

      return {
        account_id: accountId,
        phase: response.Item.phase?.S || "",
        daily_limit: parseInt(response.Item.daily_limit?.N || "0", 10),
        messages_today: parseInt(response.Item.messages_today?.N || "0", 10),
        last_updated: parseInt(response.Item.last_updated?.N || "0", 10)
      };
    } catch (error) {
      console.error("[WhatsAppRepository] Error fetching warmup state:", error);
      throw new Error(`Failed to fetch warmup state: ${accountId}`);
    }
  }

  /**
   * Save account warmup state
   */
  async saveWarmupState(state: AccountWarmupState): Promise<void> {
    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: {
            PK: { S: `WARMUP#${state.account_id}` },
            SK: { S: "STATE" },
            account_id: { S: state.account_id },
            phase: { S: state.phase },
            daily_limit: { N: state.daily_limit.toString() },
            messages_today: { N: state.messages_today.toString() },
            last_updated: { N: state.last_updated.toString() }
          }
        })
      );

      console.log("[WhatsAppRepository] Warmup state saved:", state.account_id);
    } catch (error) {
      console.error("[WhatsAppRepository] Error saving warmup state:", error);
      throw new Error(`Failed to save warmup state: ${state.account_id}`);
    }
  }

  // ==================== CONVERSATION TRACKING OPERATIONS ====================

  async getActiveConversation(phone: string, windowStart: number): Promise<{
    phone: string;
    conversationStartedAt: number;
    lastMessageAt: number;
    status: 'open' | 'closed';
    messageCount: number;
  } | null> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CONV#${phone}` },
            SK: { S: 'METADATA' }
          }
        })
      );
      if (!response.Item) return null;
      const lastMessageAt = parseInt(response.Item.lastMessageAt?.N || '0');
      const status = response.Item.status?.S || 'open';
      if (lastMessageAt >= windowStart && status === 'open') {
        return {
          phone: response.Item.phone?.S || '',
          conversationStartedAt: parseInt(response.Item.conversationStartedAt?.N || '0'),
          lastMessageAt,
          status: status as 'open' | 'closed',
          messageCount: parseInt(response.Item.messageCount?.N || '0')
        };
      }
      return null;
    } catch (error) {
      console.error('[WhatsAppRepository] Error fetching active conversation:', error);
      throw error;
    }
  }

  async getDailyConversationCount(counterKey: string): Promise<number> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: counterKey },
            SK: { S: 'METADATA' }
          }
        })
      );
      return response.Item?.count?.N ? parseInt(response.Item.count.N) : 0;
    } catch (error) {
      console.error('[WhatsAppRepository] Error reading daily conversation count:', error);
      throw error;
    }
  }

  async incrementDailyConversationCountConditional(
    counterKey: string,
    limit: number
  ): Promise<number> {
    const response = await this.client.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: {
          PK: { S: counterKey },
          SK: { S: 'METADATA' }
        },
        UpdateExpression: 'ADD #count :inc SET #updatedAt = :now',
        ConditionExpression: 'attribute_not_exists(PK) OR #count < :limit',
        ExpressionAttributeNames: {
          '#count': 'count',
          '#updatedAt': 'updatedAt'
        },
        ExpressionAttributeValues: {
          ':inc': { N: '1' },
          ':limit': { N: limit.toString() },
          ':now': { N: Date.now().toString() }
        },
        ReturnValues: 'ALL_NEW'
      })
    );
    return parseInt(response.Attributes?.count?.N || '0');
  }

  async createConversation(phone: string): Promise<void> {
    const now = Date.now();
    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: {
          PK: { S: `CONV#${phone}` },
          SK: { S: 'METADATA' },
          phone: { S: phone },
          conversationStartedAt: { N: now.toString() },
          lastMessageAt: { N: now.toString() },
          status: { S: 'open' },
          messageCount: { N: '1' },
          createdAt: { S: new Date().toISOString() }
        }
      })
    );
  }

  async closeConversation(
    phone: string,
    conversationStartedAt: number,
    messageCount: number
  ): Promise<void> {
    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: {
          PK: { S: `CONV#${phone}` },
          SK: { S: 'METADATA' },
          phone: { S: phone },
          conversationStartedAt: { N: conversationStartedAt.toString() },
          lastMessageAt: { N: Date.now().toString() },
          status: { S: 'closed' },
          messageCount: { N: messageCount.toString() }
        }
      })
    );
  }

  async updateConversationLastMessage(phone: string): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CONV#${phone}` },
            SK: { S: 'METADATA' }
          },
          UpdateExpression: 'SET lastMessageAt = :now ADD messageCount :inc',
          ExpressionAttributeValues: {
            ':now': { N: Date.now().toString() },
            ':inc': { N: '1' }
          }
        })
      );
    } catch (error) {
      console.error('[WhatsAppRepository] Error updating conversation last message:', error);
      // Don't throw - non-critical tracking
    }
  }

  // ==================== INBOUND MESSAGE OPERATIONS ====================

  /**
   * Persist an inbound message received via Meta webhook.
   * PK = CONV#{phone}, SK = MSG#{timestamp}#{messageId}
   * Also updates conversation tracking (last message + count).
   */
  async saveInboundMessage(params: {
    phone: string;
    messageId: string;
    type: string;
    timestamp: number;
    content: string; // text body, caption, or JSON-serialised media object
  }): Promise<void> {
    const { phone, messageId, type, timestamp, content } = params;
    const sk = `MSG#${timestamp}#${messageId}`;

    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: {
          PK: { S: `CONV#${phone}` },
          SK: { S: sk },
          phone: { S: phone },
          messageId: { S: messageId },
          direction: { S: 'inbound' },
          type: { S: type },
          content: { S: content },
          timestamp: { N: timestamp.toString() },
          receivedAt: { S: new Date().toISOString() },
        },
        // Idempotent: skip if already saved (same messageId arrives twice)
        ConditionExpression: 'attribute_not_exists(SK)',
      })
    );

    // Best-effort: update conversation metadata (last message time + count)
    await this.updateConversationLastMessage(phone);
  }

  // ==================== HELPER METHODS ====================

  private parseTemplateItem(item: any): WhatsAppTemplate {
    return {
      templateId: item.templateId?.S || "",
      name: item.name?.S || "",
      category: (item.category?.S || "UTILITY") as TemplateCategory,
      language: item.language?.S || "en",
      variables: item.variables?.L ? item.variables.L.map((v: any) => v.S || "") : [],
      status: (item.status?.S || "draft") as TemplateStatus,
      metaStatus: (item.metaStatus?.S || "NOT_SUBMITTED") as MetaStatus,
      createdAt: item.createdAt?.S || new Date().toISOString(),
      updatedAt: item.updatedAt?.S || new Date().toISOString(),
      syncedFromMeta: item.syncedFromMeta?.BOOL,
      lastSyncTime: item.lastSyncTime?.S,
      metaTemplateId: item.metaTemplateId?.S
    };
  }

  // ==================== PRODUCTION CONVERSATION SCHEMA (CONV# + META) ====================

  /**
   * Store message using production CONV# schema
   * 
   * Schema:
   * PK = CONV#{phone}
   * SK = MSG#{timestamp}#{direction}
   * 
   * Supports both inbound and outbound messages.
   * Partitioned by phone number for optimal DynamoDB scaling.
   */
  async storeMessage(params: {
    phone: string;
    direction: 'inbound' | 'outbound';
    messageId: string;
    messageType: string;
    content: string;
    timestamp: number;
    status: string;
    vendorId?: string;
  }): Promise<void> {
    const { phone, direction, messageId, messageType, content, timestamp, status, vendorId } = params;
    
    const sk = `MSG#${timestamp}#${direction.toUpperCase().substring(0, 3)}`;
    
    const item: any = {
      PK: { S: `CONV#${phone}` },
      SK: { S: sk },
      TYPE: { S: 'MESSAGE' },
      phone: { S: phone },
      direction: { S: direction },
      messageId: { S: messageId },
      messageType: { S: messageType },
      content: { S: content },
      timestamp: { N: timestamp.toString() },
      status: { S: status },
      createdAt: { S: new Date().toISOString() }
    };

    if (vendorId) {
      item.vendorId = { S: vendorId };
    }

    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: item,
          // Idempotent: skip if message already exists
          ConditionExpression: 'attribute_not_exists(SK)'
        })
      );
    } catch (error: any) {
      // Ignore ConditionalCheckFailedException (duplicate message)
      if (error.name !== 'ConditionalCheckFailedException') {
        throw error;
      }
    }
  }

  /**
   * Update or create conversation metadata (META item)
   * 
   * Schema:
   * PK = CONV#{phone}
   * SK = META
   * TYPE = CONVERSATION
   * 
   * Powers dashboard conversation list via GSI.
   */
  async updateConversationMeta(params: {
    phone: string;
    name?: string;
    lastMessage?: string;
    lastMessageTimestamp?: number;
    lastDirection?: 'inbound' | 'outbound';
    incrementUnread?: boolean;
    vendorId?: string;
  }): Promise<void> {
    const { 
      phone, 
      name, 
      lastMessage, 
      lastMessageTimestamp, 
      lastDirection, 
      incrementUnread,
      vendorId 
    } = params;

    const now = Date.now();
    const updateExpressions: string[] = ['updatedAt = :updatedAt'];
    const expressionAttributeValues: any = {
      ':updatedAt': { N: now.toString() }
    };
    const expressionAttributeNames: any = {};

    if (name) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = { S: name };
    }

    if (lastMessage) {
      updateExpressions.push('lastMessage = :lastMessage');
      expressionAttributeValues[':lastMessage'] = { S: lastMessage };
    }

    if (lastMessageTimestamp) {
      updateExpressions.push('lastMessageTimestamp = :lastMessageTimestamp');
      expressionAttributeValues[':lastMessageTimestamp'] = { N: lastMessageTimestamp.toString() };
    }

    if (lastDirection) {
      updateExpressions.push('lastDirection = :lastDirection');
      expressionAttributeValues[':lastDirection'] = { S: lastDirection };
    }

    if (vendorId) {
      updateExpressions.push('vendorId = :vendorId');
      expressionAttributeValues[':vendorId'] = { S: vendorId };
    }

    // Increment unread count for inbound messages
    if (incrementUnread) {
      updateExpressions.push('unreadCount = if_not_exists(unreadCount, :zero) + :one');
      expressionAttributeValues[':zero'] = { N: '0' };
      expressionAttributeValues[':one'] = { N: '1' };
    }

    // Set TYPE and phone on first creation (TYPE is a reserved keyword, use alias)
    updateExpressions.push('#type = if_not_exists(#type, :type)');
    updateExpressions.push('phone = if_not_exists(phone, :phone)');
    expressionAttributeNames['#type'] = 'TYPE';
    expressionAttributeValues[':type'] = { S: 'CONVERSATION' };
    expressionAttributeValues[':phone'] = { S: phone };

    const updateExpression = 'SET ' + updateExpressions.join(', ');

    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CONV#${phone}` },
            SK: { S: 'META' }
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeValues: expressionAttributeValues,
          ...(Object.keys(expressionAttributeNames).length > 0 && {
            ExpressionAttributeNames: expressionAttributeNames
          })
        })
      );
    } catch (error) {
      console.error('[WhatsAppRepository] Error updating conversation meta:', error);
      // Don't throw - non-critical for webhook processing
    }
  }

  /**
   * Update message delivery status
   * 
   * Updates existing message item with new status.
   * Status flow: sent → delivered → read
   */
  async updateMessageStatus(params: {
    messageId: string;
    status: string;
    timestamp: number;
  }): Promise<void> {
    const { messageId, status, timestamp } = params;

    // Note: We need to find the message first since we don't know the PK/SK
    // For now, we'll use the existing handleMessageStatus logic
    // TODO: Consider storing messageId → (PK, SK) mapping for faster lookups

    try {
      // Scan for message with this messageId (not optimal, but works)
      // In production, consider maintaining a GSI on messageId
      const scanResult = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: 'messageId = :messageId',
          ExpressionAttributeValues: {
            ':messageId': { S: messageId }
          },
          Limit: 1
        })
      );

      if (scanResult.Items && scanResult.Items.length > 0) {
        const item = scanResult.Items[0];
        const pk = item.PK?.S;
        const sk = item.SK?.S;

        if (pk && sk) {
          const updateExpression = 'SET #status = :status, statusUpdatedAt = :timestamp';
          const expressionAttributeNames = {
            '#status': 'status'
          };
          const expressionAttributeValues = {
            ':status': { S: status },
            ':timestamp': { N: timestamp.toString() }
          };

          // Add specific timestamp field based on status
          if (status === 'delivered') {
            await this.client.send(
              new UpdateItemCommand({
                TableName: this.tableName,
                Key: { PK: { S: pk }, SK: { S: sk } },
                UpdateExpression: updateExpression + ', deliveredAt = :timestamp',
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues
              })
            );
          } else if (status === 'read') {
            await this.client.send(
              new UpdateItemCommand({
                TableName: this.tableName,
                Key: { PK: { S: pk }, SK: { S: sk } },
                UpdateExpression: updateExpression + ', readAt = :timestamp',
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues
              })
            );
          } else {
            await this.client.send(
              new UpdateItemCommand({
                TableName: this.tableName,
                Key: { PK: { S: pk }, SK: { S: sk } },
                UpdateExpression: updateExpression,
                ExpressionAttributeNames: expressionAttributeNames,
                ExpressionAttributeValues: expressionAttributeValues
              })
            );
          }
        }
      }
    } catch (error) {
      console.error('[WhatsAppRepository] Error updating message status:', error);
      // Don't throw - non-critical for webhook processing
    }
  }

  /**
   * Reset unread count (when vendor opens chat)
   */
  async markConversationAsRead(phone: string): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CONV#${phone}` },
            SK: { S: 'META' }
          },
          UpdateExpression: 'SET unreadCount = :zero',
          ExpressionAttributeValues: {
            ':zero': { N: '0' }
          }
        })
      );
    } catch (error) {
      console.error('[WhatsAppRepository] Error marking conversation as read:', error);
    }
  }

  // ==================== CONVERSATION QUERIES (Dashboard) ====================

  /**
   * List all conversations (for dashboard)
   * 
   * Uses GSI: TYPE-updatedAt-index
   * Queries: TYPE=CONVERSATION, sorted by updatedAt DESC
   * 
   * Requires GSI to be created:
   * - Partition Key: TYPE (String)
   * - Sort Key: updatedAt (Number)
   */
  async listConversations(params?: {
    limit?: number;
    lastEvaluatedKey?: Record<string, any>;
    vendorId?: string;
  }): Promise<{
    conversations: Array<{
      phone: string;
      name?: string;
      lastMessage?: string;
      lastMessageTimestamp?: number;
      lastDirection?: 'inbound' | 'outbound';
      unreadCount?: number;
      updatedAt: number;
      vendorId?: string;
    }>;
    lastEvaluatedKey?: Record<string, any>;
  }> {
    try {
      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'TYPE-updatedAt-index',
        KeyConditionExpression: '#type = :type',
        ExpressionAttributeNames: {
          '#type': 'TYPE'
        },
        ExpressionAttributeValues: {
          ':type': { S: 'CONVERSATION' }
        },
        ScanIndexForward: false, // DESC order (most recent first)
        Limit: params?.limit || 50
      };

      // Add vendor filter if specified (for multi-vendor support)
      if (params?.vendorId) {
        queryParams.FilterExpression = 'vendorId = :vendorId';
        queryParams.ExpressionAttributeValues[':vendorId'] = { S: params.vendorId };
      }

      // Pagination support
      if (params?.lastEvaluatedKey) {
        queryParams.ExclusiveStartKey = params.lastEvaluatedKey;
      }

      const response = await this.client.send(new QueryCommand(queryParams));

      const conversations = (response.Items || []).map(item => ({
        phone: item.phone?.S || '',
        name: item.name?.S,
        lastMessage: item.lastMessage?.S,
        lastMessageTimestamp: item.lastMessageTimestamp?.N 
          ? parseInt(item.lastMessageTimestamp.N, 10) 
          : undefined,
        lastDirection: item.lastDirection?.S as 'inbound' | 'outbound' | undefined,
        unreadCount: item.unreadCount?.N ? parseInt(item.unreadCount.N, 10) : 0,
        updatedAt: item.updatedAt?.N ? parseInt(item.updatedAt.N, 10) : 0,
        vendorId: item.vendorId?.S
      }));

      return {
        conversations,
        lastEvaluatedKey: response.LastEvaluatedKey
      };
    } catch (error) {
      console.error('[WhatsAppRepository] Error listing conversations:', error);
      throw new Error('Failed to list conversations');
    }
  }

  /**
   * Get conversation metadata (META item)
   */
  async getConversation(phone: string): Promise<{
    phone: string;
    name?: string;
    lastMessage?: string;
    lastMessageTimestamp?: number;
    lastDirection?: 'inbound' | 'outbound';
    unreadCount: number;
    updatedAt: number;
    vendorId?: string;
  } | null> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CONV#${phone}` },
            SK: { S: 'META' }
          }
        })
      );

      if (!response.Item) {
        return null;
      }

      const item = response.Item;
      return {
        phone: item.phone?.S || phone,
        name: item.name?.S,
        lastMessage: item.lastMessage?.S,
        lastMessageTimestamp: item.lastMessageTimestamp?.N 
          ? parseInt(item.lastMessageTimestamp.N, 10) 
          : undefined,
        lastDirection: item.lastDirection?.S as 'inbound' | 'outbound' | undefined,
        unreadCount: item.unreadCount?.N ? parseInt(item.unreadCount.N, 10) : 0,
        updatedAt: item.updatedAt?.N ? parseInt(item.updatedAt.N, 10) : 0,
        vendorId: item.vendorId?.S
      };
    } catch (error) {
      console.error('[WhatsAppRepository] Error getting conversation:', error);
      return null;
    }
  }

  /**
   * Get conversation messages (message history)
   * 
   * Queries: PK=CONV#{phone}, SK begins_with MSG#
   * Returns messages sorted by timestamp (newest first)
   */
  async getConversationMessages(params: {
    phone: string;
    limit?: number;
    lastEvaluatedKey?: Record<string, any>;
  }): Promise<{
    messages: Array<{
      messageId: string;
      direction: 'inbound' | 'outbound';
      content: string;
      messageType: string;
      timestamp: number;
      status: string;
      createdAt: string;
      deliveredAt?: number;
      readAt?: number;
    }>;
    lastEvaluatedKey?: Record<string, any>;
  }> {
    const { phone, limit = 50, lastEvaluatedKey } = params;

    try {
      const queryParams: any = {
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        ExpressionAttributeValues: {
          ':pk': { S: `CONV#${phone}` },
          ':skPrefix': { S: 'MSG#' }
        },
        ScanIndexForward: false, // DESC order (newest first)
        Limit: limit
      };

      if (lastEvaluatedKey) {
        queryParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const response = await this.client.send(new QueryCommand(queryParams));

      const messages = (response.Items || []).map(item => ({
        messageId: item.messageId?.S || '',
        direction: (item.direction?.S || 'inbound') as 'inbound' | 'outbound',
        content: item.content?.S || '',
        messageType: item.messageType?.S || 'text',
        timestamp: item.timestamp?.N ? parseInt(item.timestamp.N, 10) : 0,
        status: item.status?.S || 'unknown',
        createdAt: item.createdAt?.S || '',
        deliveredAt: item.deliveredAt?.N ? parseInt(item.deliveredAt.N, 10) : undefined,
        readAt: item.readAt?.N ? parseInt(item.readAt.N, 10) : undefined
      }));

      return {
        messages,
        lastEvaluatedKey: response.LastEvaluatedKey
      };
    } catch (error) {
      console.error('[WhatsAppRepository] Error getting conversation messages:', error);
      throw new Error('Failed to get conversation messages');
    }
  }

  /**
   * Store outbound message (sent from dashboard)
   * 
   * When vendor sends a message via dashboard, we store it immediately
   * with status='sent'. The webhook will later update to delivered/read.
   * 
   * This enables full conversation history in the dashboard.
   */
  async storeOutboundMessage(params: {
    phone: string;
    messageId: string;
    content: string;
    timestamp: number;
    status: string;
  }): Promise<void> {
    const { phone, messageId, content, timestamp, status } = params;

    try {
      // Store message item
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: {
            PK: { S: `CONV#${phone}` },
            SK: { S: `MSG#${timestamp}#OUT` },
            messageId: { S: messageId },
            direction: { S: 'outbound' },
            content: { S: content },
            messageType: { S: 'text' },
            timestamp: { N: timestamp.toString() },
            status: { S: status },
            createdAt: { S: new Date(timestamp).toISOString() }
          }
        })
      );

      // Update conversation META
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CONV#${phone}` },
            SK: { S: 'META' }
          },
          UpdateExpression: 'SET lastMessage = :msg, lastMessageTimestamp = :ts, lastDirection = :dir, updatedAt = :updated, #type = :type',
          ExpressionAttributeNames: {
            '#type': 'TYPE'
          },
          ExpressionAttributeValues: {
            ':msg': { S: content.substring(0, 100) },
            ':ts': { N: timestamp.toString() },
            ':dir': { S: 'outbound' },
            ':updated': { N: timestamp.toString() },
            ':type': { S: 'CONVERSATION' }
          }
        })
      );

      console.log('[WhatsAppRepository] Outbound message stored:', messageId);
    } catch (error) {
      console.error('[WhatsAppRepository] Error storing outbound message:', error);
      // Non-critical - don't block message sending
    }
  }

  /**
   * Delete entire conversation (META + all messages)
   * 
   * Queries all items with PK=CONV#{phone} and deletes them in batches.
   * This is a destructive operation - use with caution!
   */
  async deleteConversation(phone: string): Promise<void> {
    try {
      console.log('[WhatsAppRepository] Deleting conversation:', phone);

      // Query all items for this conversation
      const queryResponse = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: 'PK = :pk',
          ExpressionAttributeValues: {
            ':pk': { S: `CONV#${phone}` }
          }
        })
      );

      const items = queryResponse.Items || [];

      if (items.length === 0) {
        console.log('[WhatsAppRepository] No items found for conversation:', phone);
        return;
      }

      console.log(`[WhatsAppRepository] Found ${items.length} items to delete`);

      // Delete in batches (DynamoDB BatchWriteItem limit = 25)
      const batchSize = 25;
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        await this.client.send(
          new BatchWriteItemCommand({
            RequestItems: {
              [this.tableName]: batch.map(item => ({
                DeleteRequest: {
                  Key: {
                    PK: item.PK,
                    SK: item.SK
                  }
                }
              }))
            }
          })
        );

        console.log(`[WhatsAppRepository] Deleted batch ${Math.floor(i / batchSize) + 1}`);
      }

      console.log('[WhatsAppRepository] Conversation deleted successfully:', phone);
    } catch (error) {
      console.error('[WhatsAppRepository] Error deleting conversation:', error);
      throw new Error('Failed to delete conversation');
    }
  }
}

// Export singleton instance
export const whatsappRepository = new WhatsAppRepository();
