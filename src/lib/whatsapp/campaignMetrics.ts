/**
 * Campaign Metrics Aggregation System
 * 
 * Real-time funnel analytics for WhatsApp campaigns.
 * 
 * METRICS TRACKED:
 * - sent: Messages sent (from campaign executor)
 * - delivered: Confirmed delivery (from webhook)
 * - read: Message opened (from webhook)
 * - clicked: Link clicks (from redirect endpoint)
 * - replied: User responses within 24h (from webhook)
 * - converted: Business outcomes (from conversion API)
 * 
 * USAGE:
 * ```
 * const metrics = getCampaignMetrics();
 * await metrics.incrementMetric(campaignId, 'delivered');
 * await metrics.incrementMetric(campaignId, 'read');
 * ```
 */

import { UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';

export type MetricType = 'sent' | 'delivered' | 'read' | 'clicked' | 'replied' | 'converted' | 'blocked';

export interface CampaignMetrics {
  campaignId: string;
  sent: number;
  delivered: number;
  read: number;
  clicked: number;
  replied: number;
  converted: number;
  blocked: number;  // 🚨 CRITICAL: Users who blocked sender
  revenue?: number; // Total revenue tracked (in rupees)
}

export interface CampaignAnalytics extends CampaignMetrics {
  deliveryRate: number;  // delivered / sent
  readRate: number;      // read / delivered
  ctr: number;           // clicked / read (Click Through Rate)
  replyRate: number;     // replied / delivered
  conversionRate: number;// converted / clicked
  blockRate: number;     // 🚨 blocked / delivered (META BAN RISK)
  engagementScore: number; // 🎯 clicked / read (Meta quality signal)
  roi?: number;          // revenue / cost
}

class CampaignMetricsManager {
  /**
   * Increment a campaign metric atomically
   * Thread-safe, works across distributed Lambda instances
   */
  async incrementMetric(
    campaignId: string,
    metricType: MetricType,
    incrementBy: number = 1
  ): Promise<void> {
    try {
      await dynamoClient.send(
        new UpdateItemCommand({
          TableName: TABLES.CAMPAIGNS,
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
      
      console.log(`✅ [CampaignMetrics] Incremented ${metricType} for campaign ${campaignId} by ${incrementBy}`);
    } catch (error) {
      console.error(`❌ [CampaignMetrics] Error incrementing ${metricType}:`, error);
      // Don't throw - metrics are best-effort
    }
  }

  /**
   * Track revenue for conversion
   */
  async recordConversion(
    campaignId: string,
    recipientPhone: string,
    orderAmount: number
  ): Promise<void> {
    try {
      // Increment conversion count
      await this.incrementMetric(campaignId, 'converted');
      
      // Add to total revenue
      await dynamoClient.send(
        new UpdateItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: 'METRICS' }
          },
          UpdateExpression: 'SET revenue = if_not_exists(revenue, :zero) + :amount',
          ExpressionAttributeValues: {
            ':zero': { N: '0' },
            ':amount': { N: orderAmount.toString() }
          }
        })
      );
      
      // Store individual conversion record for audit trail
      await dynamoClient.send(
        new UpdateItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `CONVERSION#${recipientPhone}#${Date.now()}` }
          },
          UpdateExpression: 'SET orderAmount = :amount, convertedAt = :now',
          ExpressionAttributeValues: {
            ':amount': { N: orderAmount.toString() },
            ':now': { N: Math.floor(Date.now() / 1000).toString() }
          }
        })
      );
      
      console.log(`✅ [CampaignMetrics] Recorded conversion: ${campaignId} - ${recipientPhone} - ₹${orderAmount}`);
    } catch (error) {
      console.error('[CampaignMetrics] Error recording conversion:', error);
    }
  }

  /**
   * Get campaign metrics
   */
  async getMetrics(campaignId: string): Promise<CampaignMetrics> {
    try {
      const response = await dynamoClient.send(
        new GetItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: 'METRICS' }
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
        converted: parseInt(response.Item.converted?.N || '0', 10),      blocked: parseInt(response.Item.blocked?.N || '0', 10),        revenue: response.Item.revenue?.N ? parseInt(response.Item.revenue.N, 10) : undefined
      };
    } catch (error) {
      console.error('[CampaignMetrics] Error getting metrics:', error);
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
   */
  async getAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    const metrics = await this.getMetrics(campaignId);

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

  /**
   * Track click (called from redirect endpoint)
   * Implements UNIQUE click deduplication - only counts first click per recipient
   */
  async trackClick(
    campaignId: string,
    recipientPhone: string
  ): Promise<void> {
    try {
      // 🛡️ DEDUPLICATION: Check if recipient already clicked
      const existingClick = await dynamoClient.send(
        new GetItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `CLICK#${recipientPhone}` }
          }
        })
      );

      if (existingClick.Item) {
        console.log(`⏭️ [CampaignMetrics] Duplicate click ignored: ${campaignId} - ${recipientPhone}`);
        
        // Still log repeat click for audit (separate SK with timestamp)
        const timestamp = Date.now();
        await dynamoClient.send(
          new UpdateItemCommand({
            TableName: TABLES.CAMPAIGNS,
            Key: {
              PK: { S: `CAMPAIGN#${campaignId}` },
              SK: { S: `CLICK_LOG#${recipientPhone}#${timestamp}` }
            },
            UpdateExpression: 'SET clickedAt = :now, phone = :phone, clickType = :type',
            ExpressionAttributeValues: {
              ':now': { N: Math.floor(timestamp / 1000).toString() },
              ':phone': { S: recipientPhone },
              ':type': { S: 'repeat' }
            }
          })
        );
        return; // Don't increment metric
      }

      // ✅ UNIQUE CLICK: Increment metric (only once per recipient)
      await this.incrementMetric(campaignId, 'clicked');
      
      // Store unique click record (no timestamp in SK = dedupe key)
      const timestamp = Date.now();
      await dynamoClient.send(
        new UpdateItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `CLICK#${recipientPhone}` }
          },
          UpdateExpression: 'SET firstClickAt = :now, phone = :phone, clickType = :type',
          ExpressionAttributeValues: {
            ':now': { N: Math.floor(timestamp / 1000).toString() },
            ':phone': { S: recipientPhone },
            ':type': { S: 'unique' }
          }
        })
      );
      
      console.log(`✅ [CampaignMetrics] Unique click tracked: ${campaignId} - ${recipientPhone}`);
    } catch (error) {
      console.error('[CampaignMetrics] Error tracking click:', error);
    }
  }

  /**
   * Check if message was sent within 24 hours
   * Used for reply tracking
   */
  async isRecentlySent(
    campaignId: string,
    recipientPhone: string
  ): Promise<boolean> {
    try {
      const response = await dynamoClient.send(
        new GetItemCommand({
          TableName: TABLES.RECIPIENTS,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: `RECIPIENT#${recipientPhone}` }
          }
        })
      );

      if (!response.Item || !response.Item.sentAt?.N) {
        return false;
      }

      const sentAt = parseInt(response.Item.sentAt.N, 10);
      const now = Math.floor(Date.now() / 1000);
      const hoursSinceSent = (now - sentAt) / 3600;

      return hoursSinceSent <= 24;
    } catch (error) {
      console.error('[CampaignMetrics] Error checking recent send:', error);
      return false;
    }
  }
}

// Singleton instance
let campaignMetricsManager: CampaignMetricsManager | null = null;

export function getCampaignMetrics(): CampaignMetricsManager {
  if (!campaignMetricsManager) {
    campaignMetricsManager = new CampaignMetricsManager();
  }
  return campaignMetricsManager;
}
