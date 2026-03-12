/**
 * Recipient Repository
 * 
 * Abstracts DynamoDB operations for campaign recipients.
 * Table: streefi_campaigns (same table as Campaign metadata)
 * Schema: Composite keys (PK + SK)
 * 
 * PK/SK Pattern for Recipients:
 * - PK: CAMPAIGN#{campaignId}
 * - SK: RECIPIENT#{phoneNumber}
 * 
 * This allows querying all recipients for a campaign efficiently.
 * 
 * Operations:
 * - getRecipient: Get single recipient by phone
 * - createRecipients: Bulk insert recipients (BatchWrite)
 * - updateRecipientStatus: Update delivery status
 * - getPendingRecipients: Query recipients with PENDING status
 * - getFailedRecipients: Query recipients with FAILED status
 * - getRecipientsByStatus: Query recipients by status
 * - countRecipients: Count total recipients for campaign
 * - deleteRecipients: Bulk delete recipients (BatchWrite)
 */

import {
  DynamoDBClient,
  GetItemCommand,
  BatchWriteItemCommand,
  BatchWriteItemCommandInput,
  UpdateItemCommand,
  QueryCommand,
  DeleteItemCommand
} from "@aws-sdk/client-dynamodb";
import { dynamoClient, TABLES } from "../dynamoClient";

/**
 * Recipient status enum
 */
export type RecipientStatus = "PENDING" | "PROCESSING" | "SENT" | "DELIVERED" | "RECEIVED" | "FAILED" | "READ";

/**
 * Recipient entity
 */
export interface Recipient {
  campaign_id: string;
  phone: string;
  status: RecipientStatus;
  attempts: number;
  
  // Timestamps
  created_at: number;
  processing_at?: number;
  sent_at?: number;
  delivered_at?: number;
  received_at?: number;
  read_at?: number;
  failed_at?: number;
  
  // Message tracking
  message_id?: string;
  wamid?: string;
  
  // Error tracking
  error_message?: string;
  error_code?: string;
  
  // Template parameters (for personalization)
  template_params?: Record<string, string>;
}

/**
 * Repository for recipient operations
 * 
 * Note: Recipients are stored in the CAMPAIGNS table using PK/SK pattern:
 * - PK: CAMPAIGN#{campaignId}
 * - SK: RECIPIENT#{phoneNumber}
 */
export class RecipientRepository {
  private client: DynamoDBClient;
  private tableName: string;
  private readonly BATCH_WRITE_LIMIT = 25; // DynamoDB limit

  constructor(client: DynamoDBClient = dynamoClient, tableName: string = TABLES.CAMPAIGNS) {
    this.client = client;
    this.tableName = tableName;
  }

  /**
   * Get single recipient by phone
   */
  async getRecipient(campaignId: string, phone: string): Promise<Recipient | null> {
    try {
      const response = await this.client.send(
        new GetItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `RECIPIENT#${phone}` }
          }
        })
      );

      if (!response.Item) {
        return null;
      }

      return this.parseRecipientItem(response.Item, campaignId);
    } catch (error) {
      console.error("[RecipientRepository] Error fetching recipient:", error);
      throw new Error(`Failed to fetch recipient: ${phone}`);
    }
  }

  /**
   * Create recipients in bulk (handles batching and retries automatically)
   * Implements exponential backoff for UnprocessedItems
   */
  async createRecipients(campaignId: string, phones: string[], templateParams?: Record<string, string>): Promise<void> {
    try {
      const now = Date.now();
      const recipientItems = phones.map(phone => ({
        PutRequest: {
          Item: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `RECIPIENT#${phone}` },
            campaign_id: { S: campaignId },
            phone: { S: phone },
            status: { S: "PENDING" },
            attempts: { N: "0" },
            created_at: { N: now.toString() },
            ...(templateParams && {
              template_params: { S: JSON.stringify(templateParams) }
            })
          }
        }
      }));

      // Process in batches of 25 (DynamoDB BatchWrite limit)
      for (let i = 0; i < recipientItems.length; i += this.BATCH_WRITE_LIMIT) {
        const batch = recipientItems.slice(i, i + this.BATCH_WRITE_LIMIT);
        await this.batchWriteWithRetry({
          RequestItems: {
            [this.tableName]: batch
          }
        });
        console.log(`[RecipientRepository] Batch ${Math.floor(i / this.BATCH_WRITE_LIMIT) + 1}: Created ${batch.length} recipients`);
      }

      console.log(`[RecipientRepository] Total ${phones.length} recipients created for campaign: ${campaignId}`);
    } catch (error) {
      console.error("[RecipientRepository] Error creating recipients:", error);
      throw new Error(`Failed to create recipients for campaign: ${campaignId}`);
    }
  }

  /**
   * Update recipient status
   */
  async updateRecipientStatus(
    campaignId: string,
    phone: string,
    status: RecipientStatus,
    metadata?: {
      message_id?: string;
      wamid?: string;
      error_message?: string;
      error_code?: string;
    }
  ): Promise<void> {
    try {
      const now = Date.now();
      const updateExpressions: string[] = ["#status = :status"];
      const attributeNames: Record<string, string> = { "#status": "status" };
      const attributeValues: any = { ":status": { S: status } };

      // Add timestamp based on status
      switch (status) {
        case "PROCESSING":
          updateExpressions.push("processing_at = :timestamp");
          attributeValues[":timestamp"] = { N: now.toString() };
          break;
        case "SENT":
          updateExpressions.push("sent_at = :timestamp");
          attributeValues[":timestamp"] = { N: now.toString() };
          break;
        case "DELIVERED":
          updateExpressions.push("delivered_at = :timestamp");
          attributeValues[":timestamp"] = { N: now.toString() };
          break;
        case "RECEIVED":
          updateExpressions.push("received_at = :timestamp");
          attributeValues[":timestamp"] = { N: now.toString() };
          break;
        case "READ":
          updateExpressions.push("read_at = :timestamp");
          attributeValues[":timestamp"] = { N: now.toString() };
          break;
        case "FAILED":
          updateExpressions.push("failed_at = :timestamp");
          attributeValues[":timestamp"] = { N: now.toString() };
          // Step 10: Add GSI4 attributes for global failed recipient queries
          updateExpressions.push("GSI4PK = :gsi4pk");
          updateExpressions.push("GSI4SK = :gsi4sk");
          attributeValues[":gsi4pk"] = { S: "RECIPIENT_STATUS" };
          attributeValues[":gsi4sk"] = { S: `FAILED#${campaignId}#${now}` };
          break;
      }

      // Add optional metadata
      if (metadata?.message_id) {
        updateExpressions.push("message_id = :message_id");
        attributeValues[":message_id"] = { S: metadata.message_id };
      }
      if (metadata?.wamid) {
        updateExpressions.push("wamid = :wamid");
        attributeValues[":wamid"] = { S: metadata.wamid };
      }
      if (metadata?.error_message) {
        updateExpressions.push("error_message = :error_message");
        attributeValues[":error_message"] = { S: metadata.error_message };
      }
      if (metadata?.error_code) {
        updateExpressions.push("error_code = :error_code");
        attributeValues[":error_code"] = { S: metadata.error_code };
      }

      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `RECIPIENT#${phone}` }
          },
          UpdateExpression: `SET ${updateExpressions.join(", ")}`,
          ExpressionAttributeNames: attributeNames,
          ExpressionAttributeValues: attributeValues
        })
      );

      console.log(`[RecipientRepository] Recipient status updated to ${status}:`, phone);
    } catch (error) {
      console.error("[RecipientRepository] Error updating recipient status:", error);
      throw new Error(`Failed to update recipient status: ${phone}`);
    }
  }

  /**
   * Increment recipient attempts
   */
  async incrementAttempts(campaignId: string, phone: string): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `RECIPIENT#${phone}` }
          },
          UpdateExpression: "ADD attempts :increment",
          ExpressionAttributeValues: {
            ":increment": { N: "1" }
          }
        })
      );

      console.log("[RecipientRepository] Attempts incremented:", phone);
    } catch (error) {
      console.error("[RecipientRepository] Error incrementing attempts:", error);
      throw new Error(`Failed to increment attempts: ${phone}`);
    }
  }

  /**
   * Get recipients by status (with optional limit)
   */
  async getRecipientsByStatus(
    campaignId: string,
    status: RecipientStatus,
    limit?: number
  ): Promise<Recipient[]> {
    try {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          FilterExpression: "#status = :status",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":pk": { S: `CAMPAIGN#${campaignId}` },
            ":sk": { S: "RECIPIENT#" },
            ":status": { S: status }
          },
          ...(limit && { Limit: limit })
        })
      );

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items.map(item => this.parseRecipientItem(item, campaignId));
    } catch (error) {
      console.error("[RecipientRepository] Error getting recipients by status:", error);
      throw new Error(`Failed to get ${status} recipients for campaign: ${campaignId}`);
    }
  }

  /**
   * List recipients for a campaign with cursor-based pagination.
   *
   * @param campaignId  - campaign to query
   * @param limit       - max items per page (1–100, default 50)
   * @param status      - optional status filter
   * @param cursor      - opaque base64 cursor returned by a previous call
   * @returns items + nextCursor (null when no more pages)
   */
  async listRecipientsPaginated(
    campaignId: string,
    limit: number = 50,
    status?: RecipientStatus,
    cursor?: string
  ): Promise<{ items: Recipient[]; nextCursor: string | null }> {
    const pageSize = Math.max(1, Math.min(100, limit));

    // Decode cursor into ExclusiveStartKey
    let exclusiveStartKey: Record<string, { S: string }> | undefined;
    if (cursor) {
      try {
        exclusiveStartKey = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8'));
      } catch {
        throw new Error('Invalid pagination cursor');
      }
    }

    const filterByStatus = !!status;
    const queryInput = {
      TableName: this.tableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': { S: `CAMPAIGN#${campaignId}` },
        ':sk': { S: 'RECIPIENT#' },
        ...(filterByStatus && { ':status': { S: status! } }),
      },
      Limit: pageSize,
      ...(filterByStatus && {
        FilterExpression: '#status = :status',
        ExpressionAttributeNames: { '#status': 'status' },
      }),
      ...(exclusiveStartKey && { ExclusiveStartKey: exclusiveStartKey }),
    };

    try {
      const response = await this.client.send(new QueryCommand(queryInput));
      const items = (response.Items || []).map(item => this.parseRecipientItem(item, campaignId));

      let nextCursor: string | null = null;
      if (response.LastEvaluatedKey) {
        nextCursor = Buffer.from(JSON.stringify(response.LastEvaluatedKey)).toString('base64url');
      }

      return { items, nextCursor };
    } catch (error) {
      console.error('[RecipientRepository] Error listing recipients paginated:', error);
      throw new Error(`Failed to list recipients for campaign: ${campaignId}`);
    }
  }

  /**
   * Get pending recipients (convenience method)
   */
  async getPendingRecipients(campaignId: string, limit: number = 50): Promise<Recipient[]> {
    return this.getRecipientsByStatus(campaignId, "PENDING", limit);
  }

  /**
   * Claim recipient for processing (optimistic lock)
   * Sets status to PROCESSING only if currently PENDING
   * Returns true if claimed successfully, false if already claimed
   * 
   * @returns boolean - true if claimed, false if already processed by another execution
   */
  async claimRecipient(campaignId: string, phone: string): Promise<boolean> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);
      
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `RECIPIENT#${phone}` }
          },
          UpdateExpression: "SET #status = :processing, processing_at = :timestamp",
          ConditionExpression: "#status = :pending",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":processing": { S: "PROCESSING" },
            ":pending": { S: "PENDING" },
            ":timestamp": { N: timestamp.toString() }
          }
        })
      );
      
      console.log("[RecipientRepository] Recipient claimed:", phone);
      return true;
    } catch (error: any) {
      // ConditionalCheckFailedException means another execution already claimed it
      if (error.name === "ConditionalCheckFailed Exception") {
        console.log("[RecipientRepository] Recipient already claimed:", phone);
        return false;
      }
      console.error("[RecipientRepository] Error claiming recipient:", error);
      throw error;
    }
  }

  /**
   * Get failed recipients (convenience method)
   */
  async getFailedRecipients(campaignId: string): Promise<Recipient[]> {
    return this.getRecipientsByStatus(campaignId, "FAILED");
  }

  /**
   * STEP 10: List failed recipients globally using GSI4-FailedRecipients
   * 
   * Query all failed recipients across ALL campaigns, sorted by campaign and timestamp.
   * Uses GSI4PK='RECIPIENT_STATUS' and GSI4SK='FAILED#{campaignId}#{timestamp}' for efficient queries.
   * 
   * Performance: Query (uses index) vs Scan (full table scan)
   * - Query: O(log n) + results
   * - Scan: O(n) where n = all items
   * 
   * @param campaignId - Optional: Filter to specific campaign
   * @param limit - Max recipients to return (default: 100)
   */
  async listFailedRecipientsGlobally(params?: {
    campaignId?: string;
    limit?: number;
    lastEvaluatedKey?: Record<string, any>;
  }): Promise<{
    recipients: Array<{
      campaignId: string;
      phone: string;
      failedAt: number;
      errorMessage?: string;
      errorCode?: string;
      messageId?: string;
      attempts: number;
    }>;
    lastEvaluatedKey?: Record<string, any>;
  }> {
    try {
      const queryParams: any = {
        TableName: this.tableName,
        IndexName: 'GSI4-FailedRecipients',
        KeyConditionExpression: params?.campaignId
          ? 'GSI4PK = :gsi4pk AND begins_with(GSI4SK, :campaignPrefix)'
          : 'GSI4PK = :gsi4pk',
        ExpressionAttributeValues: {
          ':gsi4pk': { S: 'RECIPIENT_STATUS' },
          ...(params?.campaignId && { ':campaignPrefix': { S: `FAILED#${params.campaignId}#` } })
        },
        ScanIndexForward: false, // DESC order (most recent first)
        Limit: params?.limit || 100
      };

      // Pagination support
      if (params?.lastEvaluatedKey) {
        queryParams.ExclusiveStartKey = params.lastEvaluatedKey;
      }

      const response = await this.client.send(new QueryCommand(queryParams));

      const recipients = (response.Items || []).map(item => ({
        campaignId: item.campaign_id?.S || '',
        phone: item.phone?.S || '',
        failedAt: item.failed_at?.N ? parseInt(item.failed_at.N, 10) : 0,
        errorMessage: item.error_message?.S,
        errorCode: item.error_code?.S,
        messageId: item.message_id?.S,
        attempts: item.attempts?.N ? parseInt(item.attempts.N, 10) : 0
      }));

      return {
        recipients,
        lastEvaluatedKey: response.LastEvaluatedKey
      };
    } catch (error) {
      console.error('[RecipientRepository] Error listing failed recipients globally:', error);
      throw new Error('Failed to list failed recipients');
    }
  }

  /**
   * Get stuck recipients across ALL campaigns (for reconciliation)
   * Finds recipients in PROCESSING status older than threshold
   * 
   * @param thresholdSeconds - Recipients processing longer than this are considered stuck
   * @returns Array of stuck recipients with campaign info
   */
  async getStuckRecipients(thresholdSeconds: number = 300): Promise<Array<Recipient & { campaignId: string; stuckDuration: number }>> {
    try {
      const { ScanCommand } = await import('@aws-sdk/client-dynamodb');
      const now = Math.floor(Date.now() / 1000);
      const threshold = now - thresholdSeconds;

      const response = await this.client.send(
        new ScanCommand({
          TableName: this.tableName,
          FilterExpression: "#status = :processing AND processing_at < :threshold",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":processing": { S: "PROCESSING" },
            ":threshold": { N: threshold.toString() }
          }
        })
      );

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items.map(item => {
        const pk = item.PK?.S || '';
        const campaignId = pk.replace('CAMPAIGN#', '');
        const processingAt = parseInt(item.processing_at?.N || '0', 10);
        
        const recipient = this.parseRecipientItem(item, campaignId);
        return {
          ...recipient,
          campaignId,
          stuckDuration: now - processingAt
        };
      });
    } catch (error) {
      console.error("[RecipientRepository] Error getting stuck recipients:", error);
      throw new Error("Failed to get stuck recipients");
    }
  }

  /**
   * Mark recipient as FAILED with error details
   * Used by reconciliation to recover stuck recipients
   */
  async markRecipientAsFailed(
    campaignId: string, 
    phone: string, 
    errorCode: string, 
    errorMessage: string
  ): Promise<void> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);

      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `RECIPIENT#${phone}` }
          },
          UpdateExpression: "SET #status = :failed, failed_at = :timestamp, error_code = :code, error_message = :message ADD attempts :inc",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":failed": { S: "FAILED" },
            ":timestamp": { N: timestamp.toString() },
            ":code": { S: errorCode },
            ":message": { S: errorMessage },
            ":inc": { N: "1" }
          }
        })
      );

      console.log("[RecipientRepository] Recipient marked as FAILED:", phone, errorCode);
    } catch (error) {
      console.error("[RecipientRepository] Error marking recipient as failed:", error);
      throw new Error(`Failed to mark recipient as failed: ${phone}`);
    }
  }

  /**
   * Get all recipients for a campaign (paginated)
   */
  async getAllRecipients(campaignId: string, limit?: number): Promise<Recipient[]> {
    try {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
          ExpressionAttributeValues: {
            ":pk": { S: `CAMPAIGN#${campaignId}` },
            ":sk": { S: "RECIPIENT#" }
          },
          ...(limit && { Limit: limit })
        })
      );

      if (!response.Items || response.Items.length === 0) {
        return [];
      }

      return response.Items.map(item => this.parseRecipientItem(item, campaignId));
    } catch (error) {
      console.error("[RecipientRepository] Error getting all recipients:", error);
      throw new Error(`Failed to get recipients for campaign: ${campaignId}`);
    }
  }

  /**
   * Count recipients by status (requires full scan)
   */
  async countRecipientsByStatus(campaignId: string, status?: RecipientStatus): Promise<number> {
    try {
      const params: any = {
        TableName: this.tableName,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: {
          ":pk": { S: `CAMPAIGN#${campaignId}` },
          ":sk": { S: "RECIPIENT#" }
        },
        Select: "COUNT"
      };

      if (status) {
        params.FilterExpression = "#status = :status";
        params.ExpressionAttributeNames = { "#status": "status" };
        params.ExpressionAttributeValues[":status"] = { S: status };
      }

      const response = await this.client.send(new QueryCommand(params));
      return response.Count || 0;
    } catch (error) {
      console.error("[RecipientRepository] Error counting recipients:", error);
      throw new Error(`Failed to count recipients for campaign: ${campaignId}`);
    }
  }

  /**
   * Delete all recipients for a campaign (handles batching and retries)
   */
  async deleteAllRecipients(campaignId: string): Promise<void> {
    try {
      // First, get all recipients to delete
      const recipients = await this.getAllRecipients(campaignId);

      if (recipients.length === 0) {
        console.log("[RecipientRepository] No recipients to delete");
        return;
      }

      // Batch delete in groups of 25
      const deleteRequests = recipients.map(recipient => ({
        DeleteRequest: {
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `RECIPIENT#${recipient.phone}` }
          }
        }
      }));

      for (let i = 0; i < deleteRequests.length; i += this.BATCH_WRITE_LIMIT) {
        const batch = deleteRequests.slice(i, i + this.BATCH_WRITE_LIMIT);
        await this.batchWriteWithRetry({
          RequestItems: {
            [this.tableName]: batch
          }
        });
        console.log(`[RecipientRepository] Batch ${Math.floor(i / this.BATCH_WRITE_LIMIT) + 1}: Deleted ${batch.length} recipients`);
      }

      console.log(`[RecipientRepository] Total ${recipients.length} recipients deleted for campaign: ${campaignId}`);
    } catch (error) {
      console.error("[RecipientRepository] Error deleting recipients:", error);
      throw new Error(`Failed to delete recipients for campaign: ${campaignId}`);
    }
  }

  /**
   * Reset recipient to PENDING (for retry logic)
   */
  async resetRecipientToPending(campaignId: string, phone: string): Promise<void> {
    try {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.tableName,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `RECIPIENT#${phone}` }
          },
          UpdateExpression: "SET #status = :pending REMOVE processing_at",
          ExpressionAttributeNames: {
            "#status": "status"
          },
          ExpressionAttributeValues: {
            ":pending": { S: "PENDING" }
          }
        })
      );

      console.log("[RecipientRepository] Recipient reset to PENDING:", phone);
    } catch (error) {
      console.error("[RecipientRepository] Error resetting recipient:", error);
      throw new Error(`Failed to reset recipient: ${phone}`);
    }
  }

  /**
   * Reset all failed recipients to PENDING (for retry logic)
   * Returns the count of recipients that were reset
   */
  async resetAllFailedRecipients(campaignId: string): Promise<number> {
    try {
      // Get all failed recipients
      const failedRecipients = await this.getFailedRecipients(campaignId);
      
      if (failedRecipients.length === 0) {
        console.log("[RecipientRepository] No failed recipients to reset");
        return 0;
      }

      console.log(`[RecipientRepository] Resetting ${failedRecipients.length} failed recipients to PENDING`);

      // Reset each recipient to PENDING (DynamoDB doesn't support batch updates)
      let resetCount = 0;
      for (const recipient of failedRecipients) {
        try {
          await this.client.send(
            new UpdateItemCommand({
              TableName: this.tableName,
              Key: {
                PK: { S: `CAMPAIGN#${campaignId}` },
                SK: { S: `RECIPIENT#${recipient.phone}` }
              },
              UpdateExpression: "SET #status = :pending, attempts = :zero REMOVE error_code, error_message, message_id",
              ExpressionAttributeNames: {
                "#status": "status"
              },
              ExpressionAttributeValues: {
                ":pending": { S: "PENDING" },
                ":zero": { N: "0" }
              }
            })
          );
          resetCount++;
        } catch (err) {
          console.error(`[RecipientRepository] Failed to reset recipient ${recipient.phone}:`, err);
          // Continue with other recipients even if one fails
        }
      }

      console.log(`[RecipientRepository] Reset ${resetCount} recipients to PENDING`);
      return resetCount;
    } catch (error) {
      console.error("[RecipientRepository] Error resetting failed recipients:", error);
      throw new Error(`Failed to reset failed recipients for campaign: ${campaignId}`);
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * BatchWrite with automatic retry for UnprocessedItems
   * Implements exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms
   */
  private async batchWriteWithRetry(
    params: BatchWriteItemCommandInput,
    maxRetries: number = 5
  ): Promise<void> {
    let unprocessed = params.RequestItems;
    let attempt = 0;

    while (unprocessed && Object.keys(unprocessed).length > 0 && attempt < maxRetries) {
      try {
        const result = await this.client.send(
          new BatchWriteItemCommand({ RequestItems: unprocessed })
        );

        unprocessed = result.UnprocessedItems || {};

        if (Object.keys(unprocessed).length > 0) {
          const unprocessedCount = Object.values(unprocessed)
            .reduce((sum, items) => sum + items.length, 0);
          
          console.log(
            `[RecipientRepository] ${unprocessedCount} unprocessed items, retrying... (attempt ${attempt + 1}/${maxRetries})`
          );

          // Exponential backoff: 100ms, 200ms, 400ms, 800ms, 1600ms, max 5000ms
          const backoffMs = Math.min(100 * Math.pow(2, attempt), 5000);
          await this.sleep(backoffMs);
          attempt++;
        }
      } catch (error: any) {
        if (this.isRetryableError(error)) {
          attempt++;
          const backoffMs = Math.min(100 * Math.pow(2, attempt), 5000);
          console.log(
            `[RecipientRepository] Retryable error (${error.name}), backing off ${backoffMs}ms (attempt ${attempt}/${maxRetries})`
          );
          await this.sleep(backoffMs);
        } else {
          throw error;
        }
      }
    }

    // If still have unprocessed items after all retries, throw error
    if (unprocessed && Object.keys(unprocessed).length > 0) {
      const unprocessedCount = Object.values(unprocessed)
        .reduce((sum, items) => sum + items.length, 0);
      
      throw new Error(
        `Failed to write ${unprocessedCount} items after ${maxRetries} retries. ` +
        `This may indicate throttling or capacity issues.`
      );
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    const retryableErrors = [
      'ProvisionedThroughputExceededException',
      'ThrottlingException',
      'InternalServerError',
      'ServiceUnavailable',
      'RequestLimitExceeded'
    ];
    return retryableErrors.includes(error.name);
  }

  /**
   * Sleep utility for backoff
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private parseRecipientItem(item: any, campaignId: string): Recipient {
    return {
      campaign_id: campaignId,
      phone: item.phone?.S || "",
      status: (item.status?.S || "PENDING") as RecipientStatus,
      attempts: parseInt(item.attempts?.N || "0", 10),
      
      created_at: parseInt(item.created_at?.N || "0", 10),
      processing_at: item.processing_at?.N ? parseInt(item.processing_at.N, 10) : undefined,
      sent_at: item.sent_at?.N ? parseInt(item.sent_at.N, 10) : undefined,
      delivered_at: item.delivered_at?.N ? parseInt(item.delivered_at.N, 10) : undefined,
      received_at: item.received_at?.N ? parseInt(item.received_at.N, 10) : undefined,
      read_at: item.read_at?.N ? parseInt(item.read_at.N, 10) : undefined,
      failed_at: item.failed_at?.N ? parseInt(item.failed_at.N, 10) : undefined,
      
      message_id: item.message_id?.S,
      wamid: item.wamid?.S,
      
      error_message: item.error_message?.S,
      error_code: item.error_code?.S,
      
      template_params: item.template_params?.S ? JSON.parse(item.template_params.S) : undefined
    };
  }
}

// Export singleton instance
export const recipientRepository = new RecipientRepository();
