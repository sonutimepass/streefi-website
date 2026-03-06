/**
 * Reply Attribution Manager
 * 
 * Tracks which campaign triggered a user reply.
 * 
 * PROBLEM:
 * User receives multiple campaigns → replies later → which campaign gets credit?
 * 
 * SOLUTION:
 * Store "last campaign context" per recipient with 24h window.
 * 
 * ARCHITECTURE:
 * ```
 * PK: USER#{phone}
 * SK: LAST_CAMPAIGN
 * campaignId
 * sentAt
 * ```
 * 
 * When reply arrives:
 * 1. Look up USER#{phone} → get last campaign
 * 2. Check if reply within 24h window
 * 3. Attribute reply to that campaign
 * 
 * USAGE:
 * ```
 * // When sending message:
 * await replyAttribution.updateLastCampaign(phone, campaignId);
 * 
 * // When reply received:
 * const campaign = await replyAttribution.attributeReply(phone);
 * if (campaign) {
 *   await metricsManager.incrementMetric(campaign, 'replied');
 * }
 * ```
 */

import { PutItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';

const REPLY_WINDOW_HOURS = 24;

export interface CampaignContext {
  campaignId: string;
  sentAt: number; // Unix timestamp (seconds)
}

export class ReplyAttributionManager {
  /**
   * Update last campaign sent to recipient
   * Call this after successfully sending a campaign message
   */
  async updateLastCampaign(
    recipientPhone: string,
    campaignId: string
  ): Promise<void> {
    try {
      const now = Math.floor(Date.now() / 1000);
      
      await dynamoClient.send(
        new PutItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Item: {
            PK: { S: `USER#${recipientPhone}` },
            SK: { S: 'LAST_CAMPAIGN' },
            campaignId: { S: campaignId },
            sentAt: { N: now.toString() },
            updatedAt: { N: now.toString() },
            // 7-day TTL (cleanup old records)
            ttl: { N: (now + (7 * 24 * 60 * 60)).toString() }
          }
        })
      );
      
      console.log(`✅ [ReplyAttribution] Updated last campaign for ${recipientPhone}: ${campaignId}`);
    } catch (error) {
      console.error('[ReplyAttribution] Failed to update last campaign:', error);
      // Don't throw - this is auxiliary tracking
    }
  }

  /**
   * Get last campaign context for recipient
   */
  private async getLastCampaign(recipientPhone: string): Promise<CampaignContext | null> {
    try {
      const response = await dynamoClient.send(
        new GetItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Key: {
            PK: { S: `USER#${recipientPhone}` },
            SK: { S: 'LAST_CAMPAIGN' }
          }
        })
      );

      if (!response.Item || !response.Item.campaignId?.S || !response.Item.sentAt?.N) {
        return null;
      }

      return {
        campaignId: response.Item.campaignId.S,
        sentAt: parseInt(response.Item.sentAt.N, 10)
      };
    } catch (error) {
      console.error('[ReplyAttribution] Failed to get last campaign:', error);
      return null;
    }
  }

  /**
   * Attribute reply to campaign if within 24h window
   * Returns campaignId to credit, or null if no attribution
   */
  async attributeReply(recipientPhone: string): Promise<string | null> {
    try {
      const context = await this.getLastCampaign(recipientPhone);
      
      if (!context) {
        console.log(`ℹ️ [ReplyAttribution] No campaign context for ${recipientPhone}`);
        return null;
      }

      const now = Math.floor(Date.now() / 1000);
      const hoursSinceSent = (now - context.sentAt) / 3600;

      if (hoursSinceSent > REPLY_WINDOW_HOURS) {
        console.log(`⏰ [ReplyAttribution] Reply from ${recipientPhone} outside 24h window (${hoursSinceSent.toFixed(1)}h ago)`);
        return null;
      }

      console.log(`✅ [ReplyAttribution] Reply from ${recipientPhone} attributed to campaign ${context.campaignId} (${hoursSinceSent.toFixed(1)}h after send)`);
      return context.campaignId;
    } catch (error) {
      console.error('[ReplyAttribution] Failed to attribute reply:', error);
      return null;
    }
  }

  /**
   * Check if recipient is within reply window for any campaign
   * Useful for checking if incoming message is likely a reply vs new conversation
   */
  async isWithinReplyWindow(recipientPhone: string): Promise<boolean> {
    const context = await this.getLastCampaign(recipientPhone);
    if (!context) return false;

    const now = Math.floor(Date.now() / 1000);
    const hoursSinceSent = (now - context.sentAt) / 3600;
    
    return hoursSinceSent <= REPLY_WINDOW_HOURS;
  }
}

// Singleton instance
let replyAttributionManager: ReplyAttributionManager | null = null;

export function getReplyAttribution(): ReplyAttributionManager {
  if (!replyAttributionManager) {
    replyAttributionManager = new ReplyAttributionManager();
  }
  return replyAttributionManager;
}
