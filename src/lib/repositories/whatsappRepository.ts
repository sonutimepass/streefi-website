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
 * - Daily Counters (Distributed): PK=DAILY_COUNTER#{shardId}#{date}, SK=METADATA (10 shards for hot partition mitigation)
 * 
 * Operations:
 * - Template CRUD (create, get, update, delete, list)
 * - Settings management (get, update)
 * - Account warmup tracking
 * - Daily message counters (distributed across 10 shards)
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
      // Convert ISO strings to timestamps for DynamoDB
      const now = Date.now();
      const createdAtTimestamp = template.createdAt ? new Date(template.createdAt).getTime() : now;
      const updatedAtTimestamp = template.updatedAt ? new Date(template.updatedAt).getTime() : now;
      
      const item: any = {
        PK: { S: `TEMPLATE#${template.templateId}` },
        SK: { S: "METADATA" },
        
        // GSI1 attributes for status-based queries (Step 7)
        GSI1PK: { S: 'TEMPLATE' },
        GSI1SK: { S: `${template.status}#${template.templateId}` },
        
        templateId: { S: template.templateId },
        name: { S: template.name },
        category: { S: template.category },
        language: { S: template.language },
        variables: { L: template.variables.map(v => ({ S: v })) },
        status: { S: template.status },
        metaStatus: { S: template.metaStatus },
        createdAt: { N: createdAtTimestamp.toString() },
        updatedAt: { N: updatedAtTimestamp.toString() }
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
   * Also updates GSI1SK to maintain index consistency
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
          UpdateExpression: "SET #status = :status, GSI1SK = :gsi1sk, updatedAt = :timestamp",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":status": { S: status },
            ":gsi1sk": { S: `${status}#${templateId}` }, // Update GSI1SK for status queries
            ":timestamp": { N: Date.now().toString() }
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
            ":timestamp": { N: Date.now().toString() },
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

  /**
   * List templates by status using GSI1 (FAST - no Scan!)
   * 
   * Step 7: GSI1-TemplatesByStatus
   * - GSI1PK: 'TEMPLATE'
   * - GSI1SK: '{status}#{templateId}'
   * 
   * This is 10-100× faster than using Scan with FilterExpression
   * 
   * @param status - Template status (draft/active/archived)
   * @returns Array of templates with matching status
   */
  async listTemplatesByStatus(status: TemplateStatus): Promise<WhatsAppTemplate[]> {
    try {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'GSI1-TemplatesByStatus',
          KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :status)',
          ExpressionAttributeValues: {
            ':pk': { S: 'TEMPLATE' },
            ':status': { S: status }
          },
          ScanIndexForward: false // Sort by templateId descending (newest first)
        })
      );

      if (!response.Items || response.Items.length === 0) {
        console.log(`[WhatsAppRepository] No templates found with status: ${status}`);
        return [];
      }

      console.log(`[WhatsAppRepository] Found ${response.Items.length} templates with status: ${status}`);
      return response.Items.map(item => this.parseTemplateItem(item));
    } catch (error) {
      console.error("[WhatsAppRepository] Error querying templates by status:", error);
      
      // If GSI doesn't exist yet, provide helpful error message
      if (error instanceof Error && error.message.includes('ResourceNotFoundException')) {
        throw new Error(
          `GSI1-TemplatesByStatus index not found. Please create it first:\n` +
          `aws dynamodb update-table --table-name ${this.tableName} ` +
          `--attribute-definitions AttributeName=GSI1PK,AttributeType=S AttributeName=GSI1SK,AttributeType=S ` +
          `--global-secondary-index-updates '[{"Create":{"IndexName":"GSI1-TemplatesByStatus",...}}]'`
        );
      }
      
      throw new Error(`Failed to query templates by status: ${status}`);
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

  /**
   * Get total daily conversation count across all distributed shards
   * 
   * DISTRIBUTED COUNTER: Queries all 10 shards and sums the counts
   * - Handles hot partition mitigation with 10× write capacity
   * - Each shard: PK = DAILY_COUNTER#{shardId}#{date}
   * 
   * @param date - Date string in YYYY-MM-DD format
   * @returns Total count across all shards
   */
  async getDailyConversationCountTotal(date: string): Promise<number> {
    try {
      let total = 0;
      
      // Query all 10 shards in parallel for efficiency
      const shardPromises = [];
      for (let shardId = 0; shardId < 10; shardId++) {
        const counterKey = `DAILY_COUNTER#${shardId}#${date}`;
        shardPromises.push(this.getDailyConversationCount(counterKey));
      }
      
      const shardCounts = await Promise.all(shardPromises);
      total = shardCounts.reduce((sum, count) => sum + count, 0);
      
      return total;
    } catch (error) {
      console.error('[WhatsAppRepository] Error reading distributed daily conversation count:', error);
      throw error;
    }
  }

  async incrementDailyConversationCountConditional(
    counterKey: string,
    limit: number
  ): Promise<number> {
    // TTL: 90 days for historical analytics
    const ttl = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60);
    
    const response = await this.client.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: {
          PK: { S: counterKey },
          SK: { S: 'METADATA' }
        },
        UpdateExpression: 'ADD #count :inc SET #updatedAt = :now, #ttl = :ttl',
        ConditionExpression: 'attribute_not_exists(PK) OR #count < :limit',
        ExpressionAttributeNames: {
          '#count': 'count',
          '#updatedAt': 'updatedAt',
          '#ttl': 'TTL'
        },
        ExpressionAttributeValues: {
          ':inc': { N: '1' },
          ':limit': { N: limit.toString() },
          ':now': { N: Date.now().toString() },
          ':ttl': { N: ttl.toString() }
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
      createdAt: item.createdAt?.N ? new Date(parseInt(item.createdAt.N)).toISOString() : new Date().toISOString(),
      updatedAt: item.updatedAt?.N ? new Date(parseInt(item.updatedAt.N)).toISOString() : new Date().toISOString(),
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
    
    // TTL: 7 days (not 90!) for cost savings (92% reduction at scale)
    // 50k users × 100 msgs × 7 days = 70GB vs 90 days = 900GB
    const ttl = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    
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
      createdAt: { S: new Date().toISOString() },
      TTL: { N: ttl.toString() }
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
   * GSI2PK = CONVERSATION (for GSI2-ConversationsByActivity)
   * GSI2SK = {status}#{lastMessageTimestamp} (for sorted queries)
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
    status?: 'active' | 'inactive';
  }): Promise<void> {
    const { 
      phone, 
      name, 
      lastMessage, 
      lastMessageTimestamp, 
      lastDirection, 
      incrementUnread,
      vendorId,
      status = 'active'
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

    // Set conversation status (active/inactive)
    updateExpressions.push('#status = :status');
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeValues[':status'] = { S: status };

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

    // Step 8: Add GSI2 attributes for ConversationsByActivity index
    // GSI2PK = 'CONVERSATION' (constant for all conversations)
    // GSI2SK = '{status}#{timestamp}' (enables sorting by activity with status filter)
    const timestamp = lastMessageTimestamp || now;
    updateExpressions.push('GSI2PK = :gsi2pk');
    updateExpressions.push('GSI2SK = :gsi2sk');
    expressionAttributeValues[':gsi2pk'] = { S: 'CONVERSATION' };
    expressionAttributeValues[':gsi2sk'] = { S: `${status}#${timestamp}` };

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
   * STEP 8: List conversations by activity using GSI2-ConversationsByActivity
   * 
   * Query conversations sorted by most recent activity with optional status filter.
   * Uses GSI2PK='CONVERSATION' and GSI2SK='{status}#{timestamp}' for efficient queries.
   * 
   * Performance: Query (uses index) vs Scan (full table scan)
   * - Query: O(log n) + results
   * - Scan: O(n) where n = all items
   * 
   * @param status - Filter by conversation status (active/inactive), defaults to 'active'
   * @param limit - Max conversations to return (default: 50)
   */
  async listConversationsByActivity(params?: {
    status?: 'active' | 'inactive';
    limit?: number;
    lastEvaluatedKey?: Record<string, any>;
  }): Promise<{
    conversations: Array<{
      phone: string;
      name?: string;
      lastMessage?: string;
      lastMessageTimestamp?: number;
      lastDirection?: 'inbound' | 'outbound';
      unreadCount?: number;
      status?: string;
      vendorId?: string;
    }>;
    lastEvaluatedKey?: Record<string, any>;
  }> {
    try {
      const status = params?.status || 'active';
      
      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'GSI2-ConversationsByActivity',
        KeyConditionExpression: 'GSI2PK = :gsi2pk AND begins_with(GSI2SK, :statusPrefix)',
        ExpressionAttributeValues: {
          ':gsi2pk': { S: 'CONVERSATION' },
          ':statusPrefix': { S: `${status}#` }
        },
        ScanIndexForward: false, // DESC order (most recent first)
        Limit: params?.limit || 50
      };

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
        status: item.status?.S,
        vendorId: item.vendorId?.S
      }));

      return {
        conversations,
        lastEvaluatedKey: response.LastEvaluatedKey
      };
    } catch (error) {
      console.error('[WhatsAppRepository] Error listing conversations by activity:', error);
      throw new Error('Failed to list conversations by activity');
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

  // ==================== WEBHOOK DEDUPLICATION ====================

  /**
   * Check if webhook event was already processed
   * 
   * Schema: PK=WEBHOOK_EVENT#{eventId}, SK=METADATA
   * TTL: 7 days (Meta retry window)
   * 
   * Returns true if event was already processed (duplicate)
   */
  /**
   * Check if webhook event was already processed
   * 
   * @deprecated Use tryMarkWebhookEventProcessedAtomic instead for race-free deduplication
   */
  async isWebhookEventProcessed(eventId: string): Promise<boolean> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `WEBHOOK_EVENT#${eventId}` },
            SK: { S: 'METADATA' }
          }
        })
      );

      return !!response.Item;
    } catch (error) {
      console.error('[WhatsAppRepository] Error checking webhook event:', error);
      // On error, allow processing (false positive better than false negative)
      return false;
    }
  }

  /**
   * Atomically try to mark webhook event as processed
   * 
   * CRITICAL: This is the race-free deduplication method.
   * Uses DynamoDB conditional write to ensure only ONE webhook processes the event.
   * 
   * @returns true if this is the FIRST time seeing this event (proceed with processing)
   * @returns false if event was already processed (skip processing)
   * 
   * TTL: 7 days (Meta retry window)
   */
  async tryMarkWebhookEventProcessedAtomic(eventId: string, eventData?: any): Promise<boolean> {
    const ttl = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days

    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: {
            PK: { S: `WEBHOOK_EVENT#${eventId}` },
            SK: { S: 'METADATA' },
            eventId: { S: eventId },
            processedAt: { N: Date.now().toString() },
            eventData: { S: JSON.stringify(eventData || {}) },
            TTL: { N: ttl.toString() }
          },
          ConditionExpression: 'attribute_not_exists(PK)' // ATOMIC: Only create if not exists
        })
      );
      
      // Success - this is the first time we're seeing this event
      return true;
      
    } catch (error: any) {
      // ConditionalCheckFailedException = event already exists (duplicate)
      if (error.name === 'ConditionalCheckFailedException') {
        return false; // Already processed - skip
      }
      
      // Other errors - log and allow processing (fail open)
      console.error('[WhatsAppRepository] Error in atomic webhook dedupe:', error);
      return true; // On error, allow processing (false positive better than false negative)
    }
  }

  /**
   * Mark webhook event as processed
   * 
   * Idempotent - safe to call multiple times
   * TTL: 7 days (Meta retry window)
   */
  async markWebhookEventProcessed(eventId: string, eventData?: any): Promise<void> {
    const ttl = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days

    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: {
            PK: { S: `WEBHOOK_EVENT#${eventId}` },
            SK: { S: 'METADATA' },
            eventId: { S: eventId },
            processedAt: { N: Date.now().toString() },
            eventData: { S: JSON.stringify(eventData || {}) },
            TTL: { N: ttl.toString() }
          },
          ConditionExpression: 'attribute_not_exists(PK)' // Only create if not exists
        })
      );
    } catch (error: any) {
      // Ignore ConditionalCheckFailedException (already marked)
      if (error.name !== 'ConditionalCheckFailedException') {
        console.error('[WhatsAppRepository] Error marking webhook event:', error);
        // Don't throw - non-critical
      }
    }
  }

  /**
   * Delete webhook event processed marker
   * 
   * Used when handler fails to allow Meta to retry the event
   * Part of atomic deduplication with failure recovery
   */
  async deleteWebhookEventProcessed(eventId: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `WEBHOOK_EVENT#${eventId}` },
            SK: { S: 'METADATA' }
          }
        })
      );
    } catch (error) {
      console.error('[WhatsAppRepository] Error deleting webhook event marker:', error);
      // Don't throw - best effort cleanup
    }
  }

  // ==================== PHONE QUALITY TRACKING ====================

  /**
   * Store phone number quality update
   * 
   * Schema: PK=PHONE_QUALITY#{phoneNumberId}, SK=METADATA
   * 
   * Quality: GREEN, YELLOW, RED
   * Critical for monitoring account health
   */
  async updatePhoneQuality(params: {
    phoneNumberId: string;
    displayPhone: string;
    qualityScore: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    previousScore?: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    event?: string;
    reason?: string;
  }): Promise<void> {
    const { phoneNumberId, displayPhone, qualityScore, previousScore, event, reason } = params;
    const now = Date.now();

    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: {
            PK: { S: `PHONE_QUALITY#${phoneNumberId}` },
            SK: { S: 'METADATA' },
            phoneNumberId: { S: phoneNumberId },
            displayPhone: { S: displayPhone },
            qualityScore: { S: qualityScore },
            previousScore: { S: previousScore || 'UNKNOWN' },
            event: { S: event || 'quality_update' },
            reason: { S: reason || '' },
            updatedAt: { N: now.toString() },
            timestamp: { S: new Date().toISOString() }
          }
        })
      );

      console.log(`[WhatsAppRepository] Phone quality updated: ${displayPhone} → ${qualityScore}`);
    } catch (error) {
      console.error('[WhatsAppRepository] Error updating phone quality:', error);
      // Don't throw - non-critical for webhook processing
    }
  }

  /**
   * Get current phone quality status
   */
  async getPhoneQuality(phoneNumberId: string): Promise<{
    qualityScore: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
    displayPhone: string;
    updatedAt: number;
    reason?: string;
  } | null> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `PHONE_QUALITY#${phoneNumberId}` },
            SK: { S: 'METADATA' }
          }
        })
      );

      if (!response.Item) {
        return null;
      }

      const item = response.Item;
      return {
        qualityScore: item.qualityScore?.S as any || 'UNKNOWN',
        displayPhone: item.displayPhone?.S || '',
        updatedAt: item.updatedAt?.N ? parseInt(item.updatedAt.N, 10) : 0,
        reason: item.reason?.S
      };
    } catch (error) {
      console.error('[WhatsAppRepository] Error getting phone quality:', error);
      return null;
    }
  }

  // ==================== USER PREFERENCES (OPT-OUT TRACKING) ====================

  /**
   * Update user marketing preferences
   * 
   * Schema: PK=USER_PREF#{phone}, SK=METADATA
   * 
   * Critical for marketing compliance - MUST respect opt-outs
   */
  async updateUserPreferences(params: {
    phone: string;
    marketingOptIn: boolean;
    preference?: string;
    event?: string;
  }): Promise<void> {
    const { phone, marketingOptIn, preference, event } = params;
    const now = Date.now();

    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: {
            PK: { S: `USER_PREF#${phone}` },
            SK: { S: 'METADATA' },
            phone: { S: phone },
            marketingOptIn: { BOOL: marketingOptIn },
            preference: { S: preference || 'marketing' },
            event: { S: event || 'preference_update' },
            updatedAt: { N: now.toString() },
            timestamp: { S: new Date().toISOString() }
          }
        })
      );

      const status = marketingOptIn ? 'OPTED IN' : 'OPTED OUT';
      console.log(`[WhatsAppRepository] User preference updated: ${phone} → ${status}`);
    } catch (error) {
      console.error('[WhatsAppRepository] Error updating user preferences:', error);
      // Don't throw - non-critical for webhook processing
    }
  }

  /**
   * Check if user has opted out of marketing
   * 
   * Returns true if user opted out, false if opted in or no preference set
   */
  async isUserOptedOutOfMarketing(phone: string): Promise<boolean> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `USER_PREF#${phone}` },
            SK: { S: 'METADATA' }
          }
        })
      );

      if (!response.Item) {
        // No preference set - default to opted IN
        return false;
      }

      // If marketingOptIn is false, user is opted OUT
      return response.Item.marketingOptIn?.BOOL === false;
    } catch (error) {
      console.error('[WhatsAppRepository] Error checking opt-out status:', error);
      // On error, assume opted IN (fail open)
      return false;
    }
  }

  // ==================== TEMPLATE QUALITY TRACKING ====================

  /**
   * Update template quality score
   * 
   * Schema: Updates existing template item
   * 
   * Quality: GREEN, YELLOW, RED
   * Affects delivery rates and template status
   */
  async updateTemplateQuality(params: {
    templateName: string;
    previousQuality?: 'GREEN' | 'YELLOW' | 'RED';
    newQuality: 'GREEN' | 'YELLOW' | 'RED';
    reason?: string;
  }): Promise<void> {
    const { templateName, previousQuality, newQuality, reason } = params;

    try {
      // Find template by name
      const template = await this.getTemplateByName(templateName);
      
      if (!template) {
        console.warn(`[WhatsAppRepository] Template not found for quality update: ${templateName}`);
        return;
      }

      // Update template with quality info
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `TEMPLATE#${template.templateId}` },
            SK: { S: 'METADATA' }
          },
          UpdateExpression: 'SET qualityScore = :newQuality, previousQualityScore = :prevQuality, qualityReason = :reason, qualityUpdatedAt = :timestamp, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':newQuality': { S: newQuality },
            ':prevQuality': { S: previousQuality || 'UNKNOWN' },
            ':reason': { S: reason || '' },
            ':timestamp': { N: Date.now().toString() },
            ':updatedAt': { N: Date.now().toString() }
          }
        })
      );

      console.log(`[WhatsAppRepository] Template quality updated: ${templateName} → ${newQuality}`);
    } catch (error) {
      console.error('[WhatsAppRepository] Error updating template quality:', error);
      // Don't throw - non-critical for webhook processing
    }
  }

  // ==================== ACCOUNT ALERTS TRACKING ====================

  /**
   * Store account alert
   * 
   * Schema: PK=ACCOUNT_ALERT#{timestamp}, SK=METADATA
   * TTL: 90 days
   * 
   * For monitoring critical account issues
   */
  async storeAccountAlert(params: {
    alertType: string;
    severity: 'INFORMATIONAL' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    title: string;
    description?: string;
    event?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const { alertType, severity, title, description, event, metadata } = params;
    const now = Date.now();
    const ttl = Math.floor(now / 1000) + (90 * 24 * 60 * 60); // 90 days
    const alertId = `${alertType}_${now}`;

    try {
      const item: Record<string, any> = {
        PK: { S: `ACCOUNT_ALERT#${now}` },
        SK: { S: 'METADATA' },
        alertId: { S: alertId },
        alertType: { S: alertType },
        severity: { S: severity },
        title: { S: title },
        description: { S: description || '' },
        event: { S: event || '' },
        createdAt: { N: now.toString() },
        timestamp: { S: new Date().toISOString() },
        TTL: { N: ttl.toString() }
      };

      // Add metadata if provided
      if (metadata) {
        item.metadata = { S: JSON.stringify(metadata) };
      }

      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: item
        })
      );

      console.log(`[WhatsAppRepository] Account alert stored: ${title} [${severity}]`);
    } catch (error) {
      console.error('[WhatsAppRepository] Error storing account alert:', error);
      // Don't throw - non-critical
    }
  }
}

// Export singleton instance
export const whatsappRepository = new WhatsAppRepository();
