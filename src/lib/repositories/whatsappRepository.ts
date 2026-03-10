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
  ScanCommand
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
            PK: { S: `CONVERSATION#${phone}` },
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
          ':now': { S: new Date().toISOString() }
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
          PK: { S: `CONVERSATION#${phone}` },
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
          PK: { S: `CONVERSATION#${phone}` },
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
            PK: { S: `CONVERSATION#${phone}` },
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
   * PK = CONVERSATION#{phone}, SK = MSG#{timestamp}#{messageId}
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
          PK: { S: `CONVERSATION#${phone}` },
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
}

// Export singleton instance
export const whatsappRepository = new WhatsAppRepository();
