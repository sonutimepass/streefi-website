/**
 * Campaign Repository
 * 
 * Abstracts DynamoDB operations for campaign metadata.
 * Table: streefi_campaigns
 * Schema: Composite keys (PK + SK)
 * 
 * PK/SK Pattern for Campaigns:
 * - PK: CAMPAIGN#{campaignId}
 * - SK: METADATA
 * 
 * Note: Recipient records also live in this table but are handled by RecipientRepository
 * 
 * Operations:
 * - getCampaign: Get campaign metadata by ID
 * - createCampaign: Create new campaign
 * - updateCampaignStatus: Update campaign status (RUNNING/PAUSED/COMPLETED)
 * - updateCampaignMetrics: Update campaign counters (sent/delivered/failed)
 * - deleteCampaign: Delete campaign metadata
 * - listCampaigns: List all campaigns (Scan with filter)
 */

import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  UpdateItemCommand,
  DeleteItemCommand,
  QueryCommand,
  BatchGetItemCommand
} from "@aws-sdk/client-dynamodb";
import { dynamoClient, TABLES } from "../dynamoClient";
import { MetricsBuffer } from "../utils/metricsBuffer";

/**
 * Campaign status enum
 */
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED";

/**
 * Campaign metadata entity
 * 
 * ⚠️ IMPORTANT: This record does NOT contain metrics (sent/delivered/failed counts).
 * Metrics are stored in a SEPARATE CampaignMetricsRecord to prevent hot partition.
 * 
 * To get metrics: Use getCampaignWithMetrics() or getCampaignMetrics()
 */
export interface Campaign {
  campaign_id: string;
  campaign_name: string;
  template_name: string;
  campaign_status: CampaignStatus;
  
  // Channel & audience
  channel?: 'WHATSAPP' | 'EMAIL';
  audience_type?: 'FIREBASE' | 'MONGODB' | 'CSV' | 'MIXED';
  created_by?: string; // Admin email
  
  // Template parameters
  template_params?: Record<string, string>;
  
  // Template rotation (Phase 1B)
  templates?: string[]; // Multiple templates for A/B testing
  template_weights?: number[]; // Weights for template selection
  template_strategy?: 'random' | 'weighted' | 'round-robin';
  
  // Total recipients (does NOT change during execution)
  total_recipients: number;
  
  // ⚠️ REMOVED: sent_count, delivered_count, failed_count, received_count, blocked_count
  // These are now in CampaignMetricsRecord (separate SK=METRICS record)
  
  // Limits
  daily_cap?: number;
  
  // Scheduling
  scheduled_at?: number;
  started_at?: number;
  completed_at?: number;
  paused_at?: number;
  paused_reason?: string;
  
  // Timestamps
  created_at: number;
  updated_at?: number;
  last_dispatch_at?: number;
  
  // Configuration
  batch_size?: number;
  rate_limit?: number;

  // Click tracking
  redirect_url?: string;
}

/**
 * Campaign log entry
 * Stored as: PK=CAMPAIGN#{campaignId}, SK=LOG#{timestamp}#{phone}
 */
export interface CampaignLog {
  timestamp: string;
  phone: string;
  status: 'SENT' | 'FAILED' | 'PROCESSING';
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  metaResponse?: string;
  attempts?: number;
}

/**
 * Campaign metrics (funnel counters)
 * Stored as SEPARATE record from METADATA to prevent hot partition
 * 
 * Record: PK=CAMPAIGN#{campaignId}, SK=METRICS
 * 
 * ⚠️ CRITICAL: Metrics are updated via MetricsBuffer (batched writes)
 * Direct writes to this record will cause hot partition at high volume!
 */
export interface CampaignMetricsRecord {
  PK: string;              // CAMPAIGN#{uuid}
  SK: string;              // METRICS
  TYPE: 'CAMPAIGN_METRICS';
  
  // Funnel counters (updated in batches)
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  replied: number;
  converted: number;
  blocked: number;
  revenue?: number;
  
  // Batch tracking (for monitoring write reduction)
  lastBatchUpdate: string; // ISO timestamp
  batchUpdateCount: number; // How many batches processed
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Campaign metrics (for API responses)
 * Flattened version without DynamoDB keys
 */
export interface CampaignMetrics {
  campaignId: string;
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  replied: number;
  converted: number;
  blocked: number;
  revenue?: number;
  
  // Batch tracking (optional - only present when metrics exist)
  batchUpdateCount?: number;
  lastBatchUpdate?: string;
}

/**
 * Campaign analytics with calculated rates
 */
export interface CampaignAnalytics extends CampaignMetrics {
  deliveryRate: number;    // delivered / sent
  readRate: number;        // read / delivered
  ctr: number;             // clicked / read (Click Through Rate)
  replyRate: number;       // replied / delivered
  conversionRate: number;  // converted / clicked
  blockRate: number;       // blocked / delivered (META BAN RISK)
  engagementScore: number; // clicked / read (Meta quality signal)
  roi?: number;            // revenue / cost
}

/**
 * Global pause state (system-wide pause control)
 * Stored as: PK=SYSTEM, SK=GLOBAL_STATE
 */
export interface GlobalPauseState {
  paused: boolean;
  reason?: string;
  pausedAt?: number;
  pausedBy?: string;
}

/**
 * Repository for campaign metadata operations
 */
export class CampaignRepository {
  private client: DynamoDBClient;
  private tableName: string;
  private metricsBuffer: MetricsBuffer;

  constructor(client: DynamoDBClient = dynamoClient, tableName: string = TABLES.CAMPAIGNS) {
    this.client = client;
    this.tableName = tableName;
    
    // Initialize metrics buffer with flush callback
    this.metricsBuffer = new MetricsBuffer(
      this.batchUpdateMetrics.bind(this),
      {
        threshold: 100,  // Flush after 100 updates
        interval: 30000  // Flush every 30 seconds
      }
    );
    
    console.log('[CampaignRepository] Initialized with buffered metrics (100 updates / 30s flush)');
  }

  /**
   * Get campaign by ID
   */
  async getCampaign(campaignId: string): Promise<Campaign | null> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: "METADATA" }
          }
        })
      );

      if (!response.Item) {
        return null;
      }

      return this.parseCampaignItem(response.Item);
    } catch (error) {
      console.error("[CampaignRepository] Error fetching campaign:", error);
      throw new Error(`Failed to fetch campaign: ${campaignId}`);
    }
  }

  /**
   * Get campaign WITH metrics in a single batch operation
   * Returns both METADATA and METRICS records
   * 
   * Use this when you need both campaign info AND metrics (most common case)
   */
  async getCampaignWithMetrics(campaignId: string): Promise<{
    campaign: Campaign;
    metrics: CampaignMetrics;
  }> {
    try {
      // Batch get both METADATA and METRICS
      const result = await this.client.send(new BatchGetItemCommand({
        RequestItems: {
          [this.tableName]: {
            Keys: [
              {
                PK: { S: `CAMPAIGN#${campaignId}` },
                SK: { S: 'METADATA' }
              },
              {
                PK: { S: `CAMPAIGN#${campaignId}` },
                SK: { S: 'METRICS' }
              }
            ]
          }
        }
      }));
      
      const items = result.Responses?.[this.tableName] || [];
      
      if (items.length === 0) {
        throw new Error(`Campaign ${campaignId} not found`);
      }
      
      const metadataItem = items.find(item => item.SK?.S === 'METADATA');
      const metricsItem = items.find(item => item.SK?.S === 'METRICS');
      
      if (!metadataItem) {
        throw new Error(`Campaign ${campaignId} metadata not found`);
      }
      
      const campaign = this.parseCampaignItem(metadataItem);
      
      // Parse metrics (or return zeros if not found)
      let metrics: CampaignMetrics;
      if (metricsItem) {
        metrics = {
          campaignId,
          sent: parseInt(metricsItem.sent?.N || '0', 10),
          delivered: parseInt(metricsItem.delivered?.N || '0', 10),
          read: parseInt(metricsItem.read?.N || '0', 10),
          clicked: parseInt(metricsItem.clicked?.N || '0', 10),
          replied: parseInt(metricsItem.replied?.N || '0', 10),
          converted: parseInt(metricsItem.converted?.N || '0', 10),
          blocked: parseInt(metricsItem.blocked?.N || '0', 10),
          revenue: metricsItem.revenue?.N ? parseInt(metricsItem.revenue.N, 10) : undefined,
          batchUpdateCount: parseInt(metricsItem.batchUpdateCount?.N || '0', 10),
          lastBatchUpdate: metricsItem.lastBatchUpdate?.S
        };
      } else {
        // No metrics record yet - return zeros
        metrics = {
          campaignId,
          sent: 0,
          delivered: 0,
          read: 0,
          clicked: 0,
          replied: 0,
          converted: 0,
          blocked: 0
        };
      }
      
      return { campaign, metrics };
    } catch (error) {
      console.error("[CampaignRepository] Error fetching campaign with metrics:", error);
      throw new Error(`Failed to fetch campaign with metrics: ${campaignId}`);
    }
  }

  /**
   * Create new campaign
   * Creates BOTH metadata (METADATA) and metrics (METRICS) records
   * 
   * STEP 11: Adds GSI5 attributes for ActiveCampaigns index
   * - GSI5PK: 'CAMPAIGN_STATUS' (constant for all campaigns)
   * - GSI5SK: '{status}#{scheduledAt}' (enables status-based queries with time sorting)
   */
  async createCampaign(campaign: Campaign): Promise<Campaign> {
    try {
      const now = Date.now();
      const campaignId = campaign.campaign_id;
      const scheduledAt = campaign.scheduled_at || now;
      
      // 1. Create METADATA record (no counters! - prevents hot partition)
      const metadataItem: any = {
        PK: { S: `CAMPAIGN#${campaignId}` },
        SK: { S: "METADATA" },
        
        // GSI1 attributes for efficient querying
        ENTITY_TYPE: { S: "CAMPAIGN" },
        CREATED_AT: { N: (campaign.created_at || now).toString() },
        
        // Step 11: GSI5 attributes for CampaignStatus index
        GSI5PK: { S: 'CAMPAIGN_STATUS' },
        GSI5SK: { S: `${campaign.campaign_status}#${scheduledAt}` },
        
        campaign_id: { S: campaignId },
        campaign_name: { S: campaign.campaign_name },
        template_name: { S: campaign.template_name },
        campaign_status: { S: campaign.campaign_status },
        
        total_recipients: { N: campaign.total_recipients.toString() },
        
        // ⚠️ NO COUNTERS HERE! (sent_count, delivered_count, failed_count removed)
        // Counters are in separate METRICS record
        
        created_at: { N: (campaign.created_at || now).toString() },
        updated_at: { N: now.toString() }
      };
      
      // Optional fields
      if (campaign.channel) metadataItem.channel = { S: campaign.channel };
      if (campaign.audience_type) metadataItem.audience_type = { S: campaign.audience_type };
      if (campaign.created_by) metadataItem.created_by = { S: campaign.created_by };
      if (campaign.template_params) metadataItem.template_params = { S: JSON.stringify(campaign.template_params) };
      if (campaign.templates) metadataItem.templates = { L: campaign.templates.map(t => ({ S: t })) };
      if (campaign.template_weights) metadataItem.template_weights = { L: campaign.template_weights.map(w => ({ N: w.toString() })) };
      if (campaign.template_strategy) metadataItem.template_strategy = { S: campaign.template_strategy };
      if (campaign.daily_cap) metadataItem.daily_cap = { N: campaign.daily_cap.toString() };
      if (campaign.scheduled_at) metadataItem.scheduled_at = { N: campaign.scheduled_at.toString() };
      if (campaign.batch_size) metadataItem.batch_size = { N: campaign.batch_size.toString() };
      if (campaign.rate_limit) metadataItem.rate_limit = { N: campaign.rate_limit.toString() };
      if (campaign.redirect_url) metadataItem.redirect_url = { S: campaign.redirect_url };

      // 2. Create METRICS record (separate item! - prevents hot partition)
      const metricsNow = new Date().toISOString();
      const metricsItem: any = {
        PK: { S: `CAMPAIGN#${campaignId}` },
        SK: { S: 'METRICS' },
        TYPE: { S: 'CAMPAIGN_METRICS' },
        
        // Initialize counters to zero
        sent: { N: '0' },
        delivered: { N: '0' },
        read: { N: '0' },
        clicked: { N: '0' },
        replied: { N: '0' },
        converted: { N: '0' },
        blocked: { N: '0' },
        
        // Batch tracking
        lastBatchUpdate: { S: metricsNow },
        batchUpdateCount: { N: '0' },
        
        // Timestamps
        createdAt: { S: metricsNow },
        updatedAt: { S: metricsNow }
      };
      
      // 3. Write BOTH records to DynamoDB
      await Promise.all([
        this.client.send(new PutItemCommand({
          TableName: this.tableName,
          Item: metadataItem
        })),
        this.client.send(new PutItemCommand({
          TableName: this.tableName,
          Item: metricsItem
        }))
      ]);

      console.log("[CampaignRepository] Campaign created with separate METADATA + METRICS:", campaignId);
      return { ...campaign, created_at: campaign.created_at || now, updated_at: now };
    } catch (error) {
      console.error("[CampaignRepository] Error creating campaign:", error);
      throw new Error(`Failed to create campaign: ${campaign.campaign_id}`);
    }
  }

  /**
   * Update editable campaign metadata (only allowed on DRAFT campaigns).
   * Only provided fields are updated; omitted fields are left unchanged.
   */
  async updateCampaignMetadata(
    campaignId: string,
    fields: {
      campaign_name?: string;
      template_name?: string;
      daily_cap?: number;
      redirect_url?: string;
    }
  ): Promise<void> {
    const now = Date.now();
    const setExpressions: string[] = ['updated_at = :now'];
    const names: Record<string, string> = {};
    const values: Record<string, { S: string } | { N: string }> = {
      ':now': { N: now.toString() },
    };

    if (fields.campaign_name !== undefined) {
      setExpressions.push('campaign_name = :cname');
      values[':cname'] = { S: fields.campaign_name };
    }
    if (fields.template_name !== undefined) {
      setExpressions.push('template_name = :tname');
      values[':tname'] = { S: fields.template_name };
    }
    if (fields.daily_cap !== undefined) {
      setExpressions.push('daily_cap = :dcap');
      values[':dcap'] = { N: fields.daily_cap.toString() };
    }
    if (fields.redirect_url !== undefined) {
      setExpressions.push('redirect_url = :rurl');
      values[':rurl'] = { S: fields.redirect_url };
    }

    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: 'METADATA' },
          },
          ConditionExpression: 'attribute_exists(PK) AND campaign_status = :draft',
          UpdateExpression: `SET ${setExpressions.join(', ')}`,
          ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
          ExpressionAttributeValues: { ...values, ':draft': { S: 'DRAFT' } },
        })
      );
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new Error('Campaign not found or is not in DRAFT status');
      }
      console.error('[CampaignRepository] Error updating campaign metadata:', error);
      throw new Error(`Failed to update campaign: ${campaignId}`);
    }
  }

  /**
   * Update campaign status
   * 
   * STEP 11: Updates GSI5SK when status changes
   */
  async updateCampaignStatus(campaignId: string, status: CampaignStatus): Promise<void> {
    try {
      const now = Date.now();
      
      // Fetch current campaign to get scheduled_at for GSI5SK
      const campaign = await this.getCampaign(campaignId);
      if (!campaign) {
        throw new Error(`Campaign not found: ${campaignId}`);
      }
      const scheduledAt = campaign.scheduled_at || campaign.created_at || now;
      
      const updateExpressions: string[] = [
        "campaign_status = :status",
        "updated_at = :timestamp",
        "GSI5SK = :gsi5sk" // Step 11: Update GSI5SK when status changes
      ];
      const attributeValues: any = {
        ":status": { S: status },
        ":timestamp": { N: now.toString() },
        ":gsi5sk": { S: `${status}#${scheduledAt}` }
      };

      // Add timestamps based on status
      if (status === "RUNNING") {
        updateExpressions.push("started_at = :started_at");
        attributeValues[":started_at"] = { N: now.toString() };
      } else if (status === "COMPLETED" || status === "FAILED") {
        updateExpressions.push("completed_at = :completed_at");
        attributeValues[":completed_at"] = { N: now.toString() };
      }

      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: "METADATA" }
          },
          UpdateExpression: `SET ${updateExpressions.join(", ")}`,
          ExpressionAttributeValues: attributeValues
        })
      );

      console.log("[CampaignRepository] Campaign status updated:", campaignId, status);
    } catch (error) {
      console.error("[CampaignRepository] Error updating campaign status:", error);
      throw new Error(`Failed to update campaign status: ${campaignId}`);
    }
  }

  /**
   * Start or resume campaign - sets status to RUNNING
   * Removes paused_at and paused_reason if they exist
   */
  async startCampaign(campaignId: string): Promise<void> {
    try {
      const timestamp = Date.now();

      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: "METADATA" }
          },
          UpdateExpression: "SET #status = :running, started_at = :timestamp REMOVE paused_at, paused_reason",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":running": { S: "RUNNING" },
            ":timestamp": { N: timestamp.toString() }
          }
        })
      );

      console.log("[CampaignRepository] Campaign started:", campaignId);
    } catch (error) {
      console.error("[CampaignRepository] Error starting campaign:", error);
      throw new Error(`Failed to start campaign: ${campaignId}`);
    }
  }

  /**
   * Pause campaign - sets status to PAUSED with optional reason
   */
  async pauseCampaign(campaignId: string, reason?: string): Promise<void> {
    try {
      const timestamp = Date.now();

      const updateExpression = reason
        ? "SET #status = :paused, paused_at = :timestamp, paused_reason = :reason"
        : "SET #status = :paused, paused_at = :timestamp";

      const expressionAttributeValues: any = {
        ":paused": { S: "PAUSED" },
        ":timestamp": { N: timestamp.toString() }
      };

      if (reason) {
        expressionAttributeValues[":reason"] = { S: reason };
      }

      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: "METADATA" }
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: expressionAttributeValues
        })
      );

      console.log("[CampaignRepository] Campaign paused:", campaignId, reason || "no reason");
    } catch (error) {
      console.error("[CampaignRepository] Error pausing campaign:", error);
      throw new Error(`Failed to pause campaign: ${campaignId}`);
    }
  }

  /**
   * Increment campaign metric (BUFFERED - prevents hot partition)
   * 
   * ⚠️ IMPORTANT: This method BUFFERS updates in memory and flushes in batches!
   * - Auto-flushes every 100 updates OR every 30 seconds
   * - Call flushMetrics() manually before reading metrics for real-time accuracy
   * 
   * Old behavior (HOT PARTITION):
   *   1000 messages = 1000 DynamoDB writes to same partition = throttling
   * 
   * New behavior (DISTRIBUTED):
   *   1000 messages = 10 DynamoDB writes (100× reduction!) = no throttling
   * 
   * @deprecated Use `incrementBufferedMetric` instead (this is kept for backward compatibility)
   */
  async incrementMetric(
    campaignId: string,
    metric: "sent_count" | "delivered_count" | "failed_count" | "received_count" | "blocked_count",
    incrementBy: number = 1
  ): Promise<void> {
    // Map old metric names to new names
    const metricMap: Record<string, 'sent' | 'delivered' | 'failed' | 'blocked'> = {
      'sent_count': 'sent',
      'delivered_count': 'delivered',
      'failed_count': 'failed',
      'received_count': 'delivered', // Map received to delivered
      'blocked_count': 'blocked'
    };
    
    const newMetric = metricMap[metric];
    if (!newMetric) {
      console.warn(`[CampaignRepository] Unknown metric: ${metric}`);
      return;
    }
    
    // Use buffered update
    this.incrementBufferedMetric(campaignId, newMetric, incrementBy);
  }

  /**
   * Increment campaign metric (BUFFERED)
   * Adds update to buffer - will be flushed automatically or on demand
   */
  incrementBufferedMetric(
    campaignId: string,
    type: 'sent' | 'delivered' | 'read' | 'failed' | 'blocked',
    count: number = 1
  ): void {
    this.metricsBuffer.add({ campaignId, type, count });
  }
  
  /**
   * Batch update metrics (called by MetricsBuffer on flush)
   * This is where the actual DynamoDB writes happen  - ONE write per campaign
   * 
   * Example: 250 messages across 3 campaigns:
   *   - 250 individual increments → buffered in memory
   *   - Flush triggered (1 batch) → 3 DynamoDB writes (one per campaign)
   *   - Write reduction: 250 → 3 (83× improvement!)
   */
  private async batchUpdateMetrics(
    updates: Map<string, Record<string, number>>
  ): Promise<void> {
    const promises = [];
    
    for (const [campaignId, metrics] of updates) {
      // Build update expression for all metrics in this campaign
      const updateExpressions: string[] = [];
      const expressionValues: any = {};
      
      for (const [type, count] of Object.entries(metrics)) {
        updateExpressions.push(`${type} = if_not_exists(${type}, :zero) + :${type}`);
        expressionValues[`:${type}`] = { N: count.toString() };
      }
      
      // Add :zero for if_not_exists
      expressionValues[':zero'] = { N: '0' };
      expressionValues[':now'] = { S: new Date().toISOString() };
      expressionValues[':inc'] = { N: '1' };
      
      // Single atomic update for this campaign
      const promise = this.client.send(new UpdateItemCommand({
        TableName: this.tableName,
        Key: {
          PK: { S: `CAMPAIGN#${campaignId}` },
          SK: { S: 'METRICS' }
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}, lastBatchUpdate = :now, batchUpdateCount = if_not_exists(batchUpdateCount, :zero) + :inc, updatedAt = :now`,
        ExpressionAttributeValues: expressionValues
      }));
      
      promises.push(promise);
    }
    
    await Promise.all(promises);
    
    console.log(`[CampaignRepository] Batch metrics update: ${updates.size} campaign(s) flushed`);
  }
  
  /**
   * Force flush buffered metrics to DynamoDB
   * Call this before reading metrics for real-time accuracy
   * 
   * Example use cases:
   * - Before ending a test/simulation
   * - Before displaying campaign progress to user
   * - Before checking if campaign is complete
   * - On application shutdown
   */
  async flushMetrics(): Promise<void> {
    await this.metricsBuffer.flush();
  }
  
  /**
   * Cleanup metrics buffer (call on shutdown)
   */
  async destroy(): Promise<void> {
    await this.metricsBuffer.destroy();
  }

  /**
   * Update total recipients count (incremental)
   */
  async updateTotalRecipients(campaignId: string, additionalRecipients: number): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: "METADATA" }
          },
          UpdateExpression: "ADD total_recipients :additional SET updated_at = :timestamp",
          ExpressionAttributeValues: {
            ":additional": { N: additionalRecipients.toString() },
            ":timestamp": { N: Date.now().toString() }
          }
        })
      );

      console.log("[CampaignRepository] Total recipients updated:", campaignId);
    } catch (error) {
      console.error("[CampaignRepository] Error updating total recipients:", error);
      throw new Error(`Failed to update total recipients: ${campaignId}`);
    }
  }

  /**
   * Set total recipients count (absolute value)
   */
  async setTotalRecipients(campaignId: string, totalRecipients: number): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: "METADATA" }
          },
          UpdateExpression: "SET total_recipients = :total, updated_at = :timestamp",
          ExpressionAttributeValues: {
            ":total": { N: totalRecipients.toString() },
            ":timestamp": { N: Date.now().toString() }
          }
        })
      );

      console.log("[CampaignRepository] Total recipients set:", campaignId, totalRecipients);
    } catch (error) {
      console.error("[CampaignRepository] Error setting total recipients:", error);
      throw new Error(`Failed to set total recipients: ${campaignId}`);
    }
  }

  /**
   * Update last dispatch timestamp
   */
  async updateLastDispatch(campaignId: string): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: "METADATA" }
          },
          UpdateExpression: "SET last_dispatch_at = :timestamp, updated_at = :timestamp",
          ExpressionAttributeValues: {
            ":timestamp": { N: Date.now().toString() }
          }
        })
      );

      console.log("[CampaignRepository] Last dispatch updated:", campaignId);
    } catch (error) {
      console.error("[CampaignRepository] Error updating last dispatch:", error);
      throw new Error(`Failed to update last dispatch: ${campaignId}`);
    }
  }

  /**
   * Delete campaign metadata
   * Note: This does NOT delete recipients - use RecipientRepository for that
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: "METADATA" }
          }
        })
      );

      console.log("[CampaignRepository] Campaign deleted:", campaignId);
    } catch (error) {
      console.error("[CampaignRepository] Error deleting campaign:", error);
      throw new Error(`Failed to delete campaign: ${campaignId}`);
    }
  }

  /**
   * Delete all logs for a campaign
   * Queries for all LOG# items and deletes them in batches
   */
  async deleteAllLogs(campaignId: string): Promise<number> {
    try {
      const { QueryCommand, BatchWriteItemCommand } = await import('@aws-sdk/client-dynamodb');
      
      // Query for all log items
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :logPrefix)",
          ExpressionAttributeValues: {
            ":pk": { S: `CAMPAIGN#${campaignId}` },
            ":logPrefix": { S: "LOG#" }
          }
        })
      );

      const logs = response.Items || [];
      
      if (logs.length === 0) {
        console.log("[CampaignRepository] No logs to delete");
        return 0;
      }

      // Delete in batches of 25 (DynamoDB BatchWrite limit)
      for (let i = 0; i < logs.length; i += 25) {
        const batch = logs.slice(i, i + 25);
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
        console.log(`[CampaignRepository] Deleted log batch ${Math.floor(i / 25) + 1} (${batch.length} items)`);
      }

      console.log(`[CampaignRepository] Deleted ${logs.length} logs for campaign:`, campaignId);
      return logs.length;
    } catch (error) {
      console.error("[CampaignRepository] Error deleting logs:", error);
      throw new Error(`Failed to delete logs for campaign: ${campaignId}`);
    }
  }

  /**
   * List all campaigns using GSI1
   * REQUIRES: GSI1 with PK=ENTITY_TYPE, SK=CREATED_AT
   */
  async listCampaigns(): Promise<Campaign[]> {
    try {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: "GSI1",
          KeyConditionExpression: "ENTITY_TYPE = :type",
          ExpressionAttributeValues: {
            ":type": { S: "CAMPAIGN" }
          },
          ScanIndexForward: false  // Sort by CREATED_AT descending (newest first)
        })
      );

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items.map(item => this.parseCampaignItem(item));
    } catch (error) {
      console.error("[CampaignRepository] Error listing campaigns:", error);
      throw new Error("Failed to list campaigns");
    }
  }

  /**
   * Find campaigns by status using GSI1
   * REQUIRES: GSI1 with PK=ENTITY_TYPE, SK=CREATED_AT
   * Note: Still requires FilterExpression, but reads only campaign metadata rows (not recipients)
   */
  async findCampaignsByStatus(status: CampaignStatus): Promise<Campaign[]> {
    try {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: "GSI1",
          KeyConditionExpression: "ENTITY_TYPE = :type",
          FilterExpression: "campaign_status = :status",
          ExpressionAttributeValues: {
            ":type": { S: "CAMPAIGN" },
            ":status": { S: status }
          },
          ScanIndexForward: false
        })
      );

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items.map(item => this.parseCampaignItem(item));
    } catch (error) {
      console.error("[CampaignRepository] Error finding campaigns by status:", error);
      throw new Error(`Failed to find campaigns with status: ${status}`);
    }
  }

  /**
   * Get RUNNING campaigns (for campaignDispatcher)
   * Uses GSI1 for efficient queries
   */
  async getRunningCampaigns(): Promise<Campaign[]> {
    return this.findCampaignsByStatus("RUNNING");
  }

  /**
   * Get SCHEDULED campaigns ready to run
   */
  async getScheduledCampaignsReadyToRun(): Promise<Campaign[]> {
    try {
      const now = Date.now();
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: "GSI1",
          KeyConditionExpression: "ENTITY_TYPE = :type",
          FilterExpression: "campaign_status = :status AND scheduled_at <= :now",
          ExpressionAttributeValues: {
            ":type": { S: "CAMPAIGN" },
            ":status": { S: "SCHEDULED" },
            ":now": { N: now.toString() }
          }
        })
      );

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items.map(item => this.parseCampaignItem(item));
    } catch (error) {
      console.error("[CampaignRepository] Error getting scheduled campaigns:", error);
      throw new Error("Failed to get scheduled campaigns");
    }
  }

  /**
   * Get campaign logs
   * Logs are stored as: PK=CAMPAIGN#{campaignId}, SK=LOG#{timestamp}#{phone}
   * Returns last N logs sorted by timestamp (newest first)
   */
  async getCampaignLogs(campaignId: string, limit: number = 50): Promise<CampaignLog[]> {
    try {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": { S: `CAMPAIGN#${campaignId}` },
            ":sk": { S: "LOG#" }
          },
          ScanIndexForward: false, // Newest first
          Limit: limit
        })
      );

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items.map(item => this.parseLogItem(item));
    } catch (error) {
      console.error("[CampaignRepository] Error getting campaign logs:", error);
      throw new Error(`Failed to get logs for campaign: ${campaignId}`);
    }
  }

  /**
   * Add log entry for campaign execution (for observability)
   * Stored as: PK=CAMPAIGN#{id}, SK=LOG#{timestampMs}#{phone}
   * 
   * Log write failures are caught and logged, not thrown (non-blocking)
   */
  async addCampaignLog(
    campaignId: string,
    phone: string,
    status: 'SENT' | 'FAILED' | 'PROCESSING',
    options?: {
      messageId?: string;
      errorCode?: string;
      errorMessage?: string;
      metaResponse?: string;
      attempts?: number;
    }
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const timestampMs = Date.now();

      const item: Record<string, any> = {
        PK: { S: `CAMPAIGN#${campaignId}` },
        SK: { S: `LOG#${timestampMs}#${phone}` },
        timestamp: { S: timestamp },
        phone: { S: phone },
        status: { S: status }
      };

      if (options?.messageId) {
        item.messageId = { S: options.messageId };
      }
      if (options?.errorCode) {
        item.errorCode = { S: options.errorCode };
      }
      if (options?.errorMessage) {
        item.errorMessage = { S: options.errorMessage };
      }
      if (options?.metaResponse) {
        item.metaResponse = { S: options.metaResponse };
      }
      if (options?.attempts !== undefined) {
        item.attempts = { N: options.attempts.toString() };
      }

      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: item
        })
      );

      console.log("[CampaignRepository] Log entry added:", campaignId, phone, status);
    } catch (error) {
      // Log write failures shouldn't stop execution - just log the error
      console.error("[CampaignRepository] Failed to write log entry:", error);
      // Don't throw - log failures are non-critical
    }
  }

  /**
   * Get campaign metrics (funnel counters)
   * Metrics stored as: PK=CAMPAIGN#{campaignId}, SK=METRICS
   */
  async getCampaignMetrics(campaignId: string): Promise<CampaignMetrics> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: "METRICS" }
          }
        })
      );

      if (!response.Item) {
        // Return zeros if no metrics yet
        return {
          campaignId,
          sent: 0,
          delivered: 0,
          read: 0,
          clicked: 0,
          replied: 0,
          converted: 0,
          blocked: 0
        };
      }

      return {
        campaignId,
        sent: parseInt(response.Item.sent?.N || '0', 10),
        delivered: parseInt(response.Item.delivered?.N || '0', 10),
        read: parseInt(response.Item.read?.N || '0', 10),
        clicked: parseInt(response.Item.clicked?.N || '0', 10),
        replied: parseInt(response.Item.replied?.N || '0', 10),
        converted: parseInt(response.Item.converted?.N || '0', 10),
        blocked: parseInt(response.Item.blocked?.N || '0', 10),
        revenue: response.Item.revenue?.N ? parseInt(response.Item.revenue.N, 10) : undefined
      };
    } catch (error) {
      console.error("[CampaignRepository] Error getting campaign metrics:", error);
      // Return zeros on error (metrics are best-effort)
      return {
        campaignId,
        sent: 0,
        delivered: 0,
        read: 0,
        clicked: 0,
        replied: 0,
        converted: 0,
        blocked: 0
      };
    }
  }

  /**
   * Get campaign analytics with calculated rates
   * Combines metrics with calculated funnel rates
   */
  async getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    const metrics = await this.getCampaignMetrics(campaignId);

    const deliveryRate = metrics.sent > 0 ? metrics.delivered / metrics.sent : 0;
    const readRate = metrics.delivered > 0 ? metrics.read / metrics.delivered : 0;
    const ctr = metrics.read > 0 ? metrics.clicked / metrics.read : 0;
    const replyRate = metrics.delivered > 0 ? metrics.replied / metrics.delivered : 0;
    const conversionRate = metrics.clicked > 0 ? metrics.converted / metrics.clicked : 0;
    const blockRate = metrics.delivered > 0 ? metrics.blocked / metrics.delivered : 0;
    
    // 🎯 ENGAGEMENT SCORE: Most important quality signal for Meta
    // If this drops below 3-5%, messages are considered low-quality/spam
    const engagementScore = metrics.read > 0 ? metrics.clicked / metrics.read : 0;

    return {
      ...metrics,
      deliveryRate,
      readRate,
      ctr,
      replyRate,
      conversionRate,
      blockRate,
      engagementScore,
      roi: metrics.revenue && metrics.revenue > 0 ? metrics.revenue / (metrics.sent * 0.5) : undefined // Assuming ₹0.50 per message cost
    };
  }

  // ==================== FUNNEL METRICS WRITE OPERATIONS ====================

  /**
   * Increment a funnel metric counter
   * Stored as: PK=CAMPAIGN#{campaignId}, SK=METRICS
   */
  async incrementFunnelMetric(
    campaignId: string,
    metricType: 'sent' | 'delivered' | 'read' | 'clicked' | 'replied' | 'converted' | 'blocked',
    incrementBy: number = 1
  ): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: 'METRICS' }
          },
          UpdateExpression: `SET ${metricType} = if_not_exists(${metricType}, :zero) + :inc, updatedAt = :now`,
          ExpressionAttributeValues: {
            ':zero': { N: '0' },
            ':inc': { N: incrementBy.toString() },
            ':now': { N: Math.floor(Date.now() / 1000).toString() }
          }
        })
      );
    } catch (error) {
      console.error('[CampaignRepository] Error incrementing funnel metric:', error);
      // Don't throw — metrics are best-effort
    }
  }

  /**
   * Add revenue to campaign metrics (METRICS SK row)
   */
  async addRevenue(campaignId: string, amount: number): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: 'METRICS' }
          },
          UpdateExpression: 'SET revenue = if_not_exists(revenue, :zero) + :amount',
          ExpressionAttributeValues: {
            ':zero': { N: '0' },
            ':amount': { N: amount.toString() }
          }
        })
      );
    } catch (error) {
      console.error('[CampaignRepository] Error adding revenue:', error);
    }
  }

  /**
   * Check if a click deduplication record exists for a recipient
   */
  async getClickRecord(campaignId: string, phone: string): Promise<boolean> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `CLICK#${phone}` }
          }
        })
      );
      return !!response.Item;
    } catch (error) {
      console.error('[CampaignRepository] Error getting click record:', error);
      return false;
    }
  }

  /**
   * Store unique click deduplication record (persists first click per recipient)
   */
  async addClickRecord(campaignId: string, phone: string, timestamp: number): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `CLICK#${phone}` }
          },
          UpdateExpression: 'SET firstClickAt = :now, phone = :phone, clickType = :type',
          ExpressionAttributeValues: {
            ':now': { N: Math.floor(timestamp / 1000).toString() },
            ':phone': { S: phone },
            ':type': { S: 'unique' }
          }
        })
      );
    } catch (error) {
      console.error('[CampaignRepository] Error storing click record:', error);
    }
  }

  /**
   * Append click audit log entry (unique or repeat)
   */
  async addClickLog(
    campaignId: string,
    phone: string,
    timestamp: number,
    clickType: 'unique' | 'repeat'
  ): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `CLICK_LOG#${phone}#${timestamp}` }
          },
          UpdateExpression: 'SET clickedAt = :now, phone = :phone, clickType = :type',
          ExpressionAttributeValues: {
            ':now': { N: Math.floor(timestamp / 1000).toString() },
            ':phone': { S: phone },
            ':type': { S: clickType }
          }
        })
      );
    } catch (error) {
      console.error('[CampaignRepository] Error adding click log:', error);
    }
  }

  /**
   * Store an individual conversion record for audit trail
   */
  async addConversionRecord(
    campaignId: string,
    phone: string,
    orderAmount: number,
    timestamp: number
  ): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `CONVERSION#${phone}#${timestamp}` }
          },
          UpdateExpression: 'SET orderAmount = :amount, convertedAt = :now',
          ExpressionAttributeValues: {
            ':amount': { N: orderAmount.toString() },
            ':now': { N: Math.floor(timestamp / 1000).toString() }
          }
        })
      );
    } catch (error) {
      console.error('[CampaignRepository] Error storing conversion record:', error);
    }
  }

  // ==================== WEBHOOK IDEMPOTENCY ====================

  /**
   * Check if a webhook message status has already been processed
   * Key: PK=MESSAGE_STATUS#{messageId}, SK=STATUS#{statusType}#{timestamp}#{errorCode}
   * 
   * CRITICAL: Timestamp AND errorCode must be included to handle:
   * 1. Meta sending same status multiple times with different metadata
   * 2. Multiple failed statuses with same timestamp but different error codes
   * 
   * ErrorCode of 0 = non-failed status (delivered, sent, read)
   */
  async isStatusAlreadyProcessed(
    messageId: string,
    statusType: string,
    timestamp: string,
    errorCode: number
  ): Promise<boolean> {
    try {
      const sk = `STATUS#${statusType}#${timestamp}#${errorCode}`;
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `MESSAGE_STATUS#${messageId}` },
            SK: { S: sk }
          }
        })
      );
      return !!response.Item;
    } catch (error) {
      console.error('[CampaignRepository] Error checking webhook idempotency:', error);
      return false; // Fail open — process to avoid losing data
    }
  }

  /**
   * Mark a webhook message status as processed
   * TTL: 30 days
   * ErrorCode is always included (0 for non-failed statuses)
   */
  async markStatusProcessed(
    messageId: string,
    statusType: string,
    timestamp: string,
    errorCode: number
  ): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const ttl = now + 30 * 24 * 60 * 60;
      const sk = `STATUS#${statusType}#${timestamp}#${errorCode}`;

      const item: Record<string, { S: string } | { N: string }> = {
        PK: { S: `MESSAGE_STATUS#${messageId}` },
        SK: { S: sk },
        processedAt: { N: now.toString() },
        ttl: { N: ttl.toString() },
        errorCode: { N: errorCode.toString() }
      };

      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: item
        })
      );
    } catch (error) {
      console.error('[CampaignRepository] Error marking status processed:', error);
    }
  }

  // ==================== MESSAGE → CAMPAIGN MAPPING (SHARDED) ====================

  /**
   * Store sharded message-to-campaign mapping for webhook lookups
   * Uses 10-shard key to avoid hot partition: PK=MSG#{shard}, SK={messageId}
   * TTL: 30 days
   * 
   * STEP 9: Added GSI3 attributes for MessagesByCampaign index
   * - GSI3PK: {campaignId} (enables campaign-based queries)
   * - GSI3SK: {timestamp} (sorts messages chronologically)
   */
  async logMessageForWebhookTracking(
    campaignId: string,
    messageId: string,
    recipientPhone: string
  ): Promise<void> {
    try {
      const shard = this._getMessageShard(messageId);
      const now = Math.floor(Date.now() / 1000);
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `MSG#${shard}` },
            SK: { S: messageId }
          },
          UpdateExpression:
            'SET campaignId = :campaignId, recipientPhone = :phone, createdAt = :timestamp, #ttl = :ttl, GSI3PK = :gsi3pk, GSI3SK = :gsi3sk',
          ExpressionAttributeNames: { '#ttl': 'ttl' },
          ExpressionAttributeValues: {
            ':campaignId': { S: campaignId },
            ':phone': { S: recipientPhone },
            ':timestamp': { N: now.toString() },
            ':ttl': { N: (now + 30 * 24 * 60 * 60).toString() },
            ':gsi3pk': { S: campaignId },
            ':gsi3sk': { S: now.toString() }
          }
        })
      );
      console.log(`[CampaignRepository] Message mapped (shard ${shard}): ${messageId} → ${campaignId}`);
    } catch (error) {
      console.error('[CampaignRepository] Failed to store message mapping:', error);
    }
  }

  /**
   * Lookup campaign ID by message ID using sharded key
   */
  async getCampaignIdFromMessageId(messageId: string): Promise<string | null> {
    try {
      const shard = this._getMessageShard(messageId);
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `MSG#${shard}` },
            SK: { S: messageId }
          }
        })
      );
      return response.Item?.campaignId?.S ?? null;
    } catch (error) {
      console.error('[CampaignRepository] Error looking up campaign by message ID:', error);
      return null;
    }
  }

  /**
   * STEP 9: List messages by campaign using GSI3-MessagesByCampaign
   * 
   * Query all messages for a specific campaign, sorted chronologically.
   * Uses GSI3PK={campaignId} and GSI3SK={timestamp} for efficient queries.
   * 
   * Performance: Query (uses index) vs Scan (full table scan)
   * - Query: O(log n) + results
   * - Scan: O(n) where n = all items
   * 
   * @param campaignId - Campaign to query messages for
   * @param limit - Max messages to return (default: 100)
   */
  async listMessagesByCampaign(params: {
    campaignId: string;
    limit?: number;
    lastEvaluatedKey?: Record<string, any>;
  }): Promise<{
    messages: Array<{
      messageId: string;
      recipientPhone: string;
      createdAt: number;
      campaignId: string;
    }>;
    lastEvaluatedKey?: Record<string, any>;
  }> {
    try {
      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'GSI3-MessagesByCampaign',
        KeyConditionExpression: 'GSI3PK = :campaignId',
        ExpressionAttributeValues: {
          ':campaignId': { S: params.campaignId }
        },
        ScanIndexForward: true, // ASC order (oldest first - chronological)
        Limit: params.limit || 100
      };

      // Pagination support
      if (params.lastEvaluatedKey) {
        queryParams.ExclusiveStartKey = params.lastEvaluatedKey;
      }

      const response = await this.client.send(new QueryCommand(queryParams));

      const messages = (response.Items || []).map(item => ({
        messageId: item.SK?.S || '',
        recipientPhone: item.recipientPhone?.S || '',
        createdAt: item.createdAt?.N ? parseInt(item.createdAt.N, 10) : 0,
        campaignId: item.campaignId?.S || ''
      }));

      return {
        messages,
        lastEvaluatedKey: response.LastEvaluatedKey
      };
    } catch (error) {
      console.error('[CampaignRepository] Error listing messages by campaign:', error);
      throw new Error('Failed to list messages by campaign');
    }
  }

  /**
   * STEP 11: List campaigns by status using GSI5-ActiveCampaigns
   * 
   * Query campaigns by status, sorted by scheduled time.
   * Uses GSI5PK='CAMPAIGN_STATUS' and GSI5SK='{status}#{scheduledAt}' for efficient queries.
   * 
   * Performance: Query (uses index) vs Scan (full table scan)
   * - Query: O(log n) + results
   * - Scan: O(n) where n = all items
   * 
   * @param status - Campaign status to filter (DRAFT, SCHEDULED, RUNNING, etc.)
   * @param limit - Max campaigns to return (default: 50)
   */
  async listCampaignsByStatus(params: {
    status: CampaignStatus;
    limit?: number;
    lastEvaluatedKey?: Record<string, any>;
  }): Promise<{
    campaigns: Array<{
      campaignId: string;
      campaignName: string;
      status: string;
      scheduledAt: number;
      createdAt: number;
      totalRecipients: number;
    }>;
    lastEvaluatedKey?: Record<string, any>;
  }> {
    try {
      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'GSI5-ActiveCampaigns',
        KeyConditionExpression: 'GSI5PK = :gsi5pk AND begins_with(GSI5SK, :statusPrefix)',
        ExpressionAttributeValues: {
          ':gsi5pk': { S: 'CAMPAIGN_STATUS' },
          ':statusPrefix': { S: `${params.status}#` }
        },
        ScanIndexForward: true, // ASC order (earliest scheduled first)
        Limit: params.limit || 50
      };

      // Pagination support
      if (params.lastEvaluatedKey) {
        queryParams.ExclusiveStartKey = params.lastEvaluatedKey;
      }

      const response = await this.client.send(new QueryCommand(queryParams));

      const campaigns = (response.Items || []).map(item => ({
        campaignId: item.campaign_id?.S || '',
        campaignName: item.campaign_name?.S || '',
        status: item.campaign_status?.S || '',
        scheduledAt: item.scheduled_at?.N ? parseInt(item.scheduled_at.N, 10) : 0,
        createdAt: item.created_at?.N ? parseInt(item.created_at.N, 10) : 0,
        totalRecipients: item.total_recipients?.N ? parseInt(item.total_recipients.N, 10) : 0
      }));

      return {
        campaigns,
        lastEvaluatedKey: response.LastEvaluatedKey
      };
    } catch (error) {
      console.error('[CampaignRepository] Error listing campaigns by status:', error);
      throw new Error('Failed to list campaigns by status');
    }
  }

  /** Simple shard function: sum of char codes mod 10 */
  private _getMessageShard(messageId: string): number {
    let hash = 0;
    for (let i = 0; i < messageId.length; i++) {
      hash += messageId.charCodeAt(i);
    }
    return hash % 10;
  }

  // ==================== GLOBAL PAUSE OPERATIONS ====================

  /**
   * Get global pause state
   * Returns { paused: false } if no record exists (safe default)
   */
  async getGlobalPauseState(): Promise<GlobalPauseState> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: "SYSTEM" },
            SK: { S: "GLOBAL_STATE" }
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
      console.error("[CampaignRepository] Error getting global pause state:", error);
      // Fail-safe: return not paused on error
      return { paused: false };
    }
  }

  /**
   * Set global pause state (enable or disable system-wide pause)
   */
  async setGlobalPauseState(
    paused: boolean,
    adminEmail: string,
    reason?: string
  ): Promise<GlobalPauseState> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);

      const item: any = {
        PK: { S: "SYSTEM" },
        SK: { S: "GLOBAL_STATE" },
        paused: { BOOL: paused },
        updatedAt: { N: timestamp.toString() }
      };

      if (reason) {
        item.reason = { S: reason };
      }
      if (paused) {
        item.pausedAt = { N: timestamp.toString() };
        item.pausedBy = { S: adminEmail };
      }

      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: item
        })
      );

      console.log(`[CampaignRepository] Global pause ${paused ? 'ENABLED' : 'DISABLED'} by ${adminEmail}`);

      return {
        paused,
        reason,
        pausedAt: paused ? timestamp : undefined,
        pausedBy: paused ? adminEmail : undefined
      };
    } catch (error) {
      console.error("[CampaignRepository] Error setting global pause state:", error);
      throw new Error("Failed to set global pause state");
    }
  }

  // ==================== ACCOUNT WARMUP OPERATIONS ====================

  async getAccountWarmupData(accountId: string): Promise<{
    accountAge: number;
    firstSendDate: number;
    dailyLimit: number;
    totalSent: number;
    lastResetDate: string;
    currentDaySent: number;
    qualityTier: string;
  } | null> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: 'SYSTEM' },
            SK: { S: `ACCOUNT#${accountId}` }
          }
        })
      );
      if (!response.Item) return null;
      return {
        accountAge: parseInt(response.Item.accountAge?.N || '0', 10),
        firstSendDate: parseInt(response.Item.firstSendDate?.N || '0', 10),
        dailyLimit: parseInt(response.Item.dailyLimit?.N || '200', 10),
        totalSent: parseInt(response.Item.totalSent?.N || '0', 10),
        lastResetDate: response.Item.lastResetDate?.S || '',
        currentDaySent: parseInt(response.Item.currentDaySent?.N || '0', 10),
        qualityTier: response.Item.qualityTier?.S || 'GREEN'
      };
    } catch (error) {
      console.error('[CampaignRepository] Error getting account warmup data:', error);
      return null;
    }
  }

  async saveAccountWarmupData(accountId: string, data: {
    accountAge: number;
    firstSendDate: number;
    dailyLimit: number;
    totalSent: number;
    lastResetDate: string;
    currentDaySent: number;
    qualityTier: string;
  }): Promise<void> {
    try {
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: {
            PK: { S: 'SYSTEM' },
            SK: { S: `ACCOUNT#${accountId}` },
            accountAge: { N: data.accountAge.toString() },
            firstSendDate: { N: data.firstSendDate.toString() },
            dailyLimit: { N: data.dailyLimit.toString() },
            totalSent: { N: data.totalSent.toString() },
            lastResetDate: { S: data.lastResetDate },
            currentDaySent: { N: data.currentDaySent.toString() },
            qualityTier: { S: data.qualityTier },
            updatedAt: { N: Math.floor(Date.now() / 1000).toString() }
          }
        })
      );
    } catch (error) {
      console.error('[CampaignRepository] Error saving account warmup data:', error);
    }
  }

  async addAccountWarmupSent(accountId: string, count: number): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
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
      console.error('[CampaignRepository] Error recording warmup sent count:', error);
    }
  }

  // ==================== REPLY ATTRIBUTION OPERATIONS ====================

  async setLastCampaignForPhone(phone: string, campaignId: string): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      await this.client.send(
        new PutItemCommand({
          TableName: this.tableName,
          Item: {
            PK: { S: `USER#${phone}` },
            SK: { S: 'LAST_CAMPAIGN' },
            campaignId: { S: campaignId },
            sentAt: { N: now.toString() },
            updatedAt: { N: now.toString() },
            ttl: { N: (now + 7 * 24 * 60 * 60).toString() }
          }
        })
      );
    } catch (error) {
      console.error('[CampaignRepository] Failed to set last campaign for phone:', error);
    }
  }

  async getLastCampaignForPhone(phone: string): Promise<{ campaignId: string; sentAt: number } | null> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `USER#${phone}` },
            SK: { S: 'LAST_CAMPAIGN' }
          }
        })
      );
      if (!response.Item?.campaignId?.S || !response.Item?.sentAt?.N) return null;
      return {
        campaignId: response.Item.campaignId.S,
        sentAt: parseInt(response.Item.sentAt.N, 10)
      };
    } catch (error) {
      console.error('[CampaignRepository] Failed to get last campaign for phone:', error);
      return null;
    }
  }

  // ==================== GLOBAL DAILY LIMIT OPERATIONS ====================

  async getGlobalDailyCount(dateKey: string): Promise<number> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: 'GLOBAL_LIMIT' },
            SK: { S: `DATE#${dateKey}` }
          }
        })
      );
      return parseInt(response.Item?.count?.N || '0', 10);
    } catch (error) {
      console.error('[CampaignRepository] Failed to get global daily count:', error);
      return 0;
    }
  }

  async incrementGlobalDailyCount(dateKey: string, amount: number): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: 'GLOBAL_LIMIT' },
            SK: { S: `DATE#${dateKey}` }
          },
          UpdateExpression: 'ADD #count :amount SET updatedAt = :timestamp',
          ExpressionAttributeNames: { '#count': 'count' },
          ExpressionAttributeValues: {
            ':amount': { N: amount.toString() },
            ':timestamp': { N: timestamp.toString() }
          }
        })
      );
    } catch (error: any) {
      if (error.name === 'ValidationException') {
        try {
          await this.client.send(
            new PutItemCommand({
              TableName: this.tableName,
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
          if (putError.name === 'ConditionalCheckFailedException') {
            await this.incrementGlobalDailyCount(dateKey, amount);
          } else {
            throw putError;
          }
        }
      } else {
        throw error;
      }
    }
  }

  // ==================== EXECUTION LOCK OPERATIONS ====================

  /**
   * Acquire execution lock for a campaign batch run.
   * Uses a conditional write to prevent concurrent batch executions.
   * Returns true if lock acquired, false if already locked.
   */
  async acquireExecutionLock(campaignId: string, now: number): Promise<boolean> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: 'METADATA' }
          },
          UpdateExpression: 'SET executionLock = :true, lockedAt = :now',
          ConditionExpression:
            'attribute_not_exists(executionLock) OR executionLock = :false OR lockedAt < :staleThreshold',
          ExpressionAttributeValues: {
            ':true': { BOOL: true },
            ':false': { BOOL: false },
            ':now': { N: now.toString() },
            ':staleThreshold': { N: (now - 120).toString() } // 2-minute stale lock expiry
          }
        })
      );
      return true;
    } catch (error: any) {
      if (error.name === 'ConditionalCheckFailedException') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Release execution lock after a successful batch run.
   * Also records lastBatchAt for cooldown tracking.
   */
  async releaseExecutionLock(campaignId: string, now: number): Promise<void> {
    await this.client.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: {
          PK: { S: `CAMPAIGN#${campaignId}` },
          SK: { S: 'METADATA' }
        },
        UpdateExpression: 'SET executionLock = :false, lastBatchAt = :now REMOVE lockedAt',
        ExpressionAttributeValues: {
          ':false': { BOOL: false },
          ':now': { N: now.toString() }
        }
      })
    );
  }

  /**
   * Release execution lock after an error, without updating lastBatchAt.
   */
  async releaseExecutionLockOnError(campaignId: string): Promise<void> {
    await this.client.send(
      new UpdateItemCommand({
        TableName: this.tableName,
        Key: {
          PK: { S: `CAMPAIGN#${campaignId}` },
          SK: { S: 'METADATA' }
        },
        UpdateExpression: 'SET executionLock = :false REMOVE lockedAt',
        ExpressionAttributeValues: {
          ':false': { BOOL: false }
        }
      })
    );
  }

  // ==================== HELPER METHODS ====================

  private parseCampaignItem(item: any): Campaign {
    return {
      campaign_id: item.campaign_id?.S || "",
      campaign_name: item.campaign_name?.S || "",
      template_name: item.template_name?.S || "",
      campaign_status: (item.campaign_status?.S || "DRAFT") as CampaignStatus,

      // Channel & audience
      channel: item.channel?.S as Campaign['channel'],
      audience_type: item.audience_type?.S as Campaign['audience_type'],
      created_by: item.created_by?.S,

      template_params: item.template_params?.S ? JSON.parse(item.template_params.S) : undefined,

      total_recipients: parseInt(item.total_recipients?.N || "0", 10),
      
      // ⚠️ REMOVED: sent_count, delivered_count, failed_count, received_count, blocked_count
      // These are now in separate METRICS record - use getCampaignWithMetrics() or getCampaignMetrics()

      daily_cap: item.daily_cap?.N ? parseInt(item.daily_cap.N, 10) : undefined,

      scheduled_at: item.scheduled_at?.N ? parseInt(item.scheduled_at.N, 10) : undefined,
      started_at: item.started_at?.N ? parseInt(item.started_at.N, 10) : undefined,
      paused_at: item.paused_at?.N ? parseInt(item.paused_at.N, 10) : undefined,
      paused_reason: item.paused_reason?.S,
      completed_at: item.completed_at?.N ? parseInt(item.completed_at.N, 10) : undefined,

      created_at: parseInt(item.created_at?.N || "0", 10),
      updated_at: item.updated_at?.N ? parseInt(item.updated_at.N, 10) : undefined,
      last_dispatch_at: item.last_dispatch_at?.N ? parseInt(item.last_dispatch_at.N, 10) : undefined,

      batch_size: item.batch_size?.N ? parseInt(item.batch_size.N, 10) : undefined,
      rate_limit: item.rate_limit?.N ? parseInt(item.rate_limit.N, 10) : undefined,
      redirect_url: item.redirect_url?.S,
    };
  }

  private parseLogItem(item: any): CampaignLog {
    const log: CampaignLog = {
      timestamp: item.timestamp?.S || '',
      phone: item.phone?.S || '',
      status: (item.status?.S as CampaignLog['status']) || 'PROCESSING',
      attempts: item.attempts?.N ? parseInt(item.attempts.N, 10) : undefined
    };

    if (item.messageId?.S) {
      log.messageId = item.messageId.S;
    }
    if (item.errorCode?.S) {
      log.errorCode = item.errorCode.S;
    }
    if (item.errorMessage?.S) {
      log.errorMessage = item.errorMessage.S;
    }
    if (item.metaResponse?.S) {
      log.metaResponse = item.metaResponse.S;
    }

    return log;
  }
}

// Export singleton instance
export const campaignRepository = new CampaignRepository();
