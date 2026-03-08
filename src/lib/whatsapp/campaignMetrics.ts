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

import { campaignRepository, CampaignMetrics, CampaignAnalytics } from '@/lib/repositories/campaignRepository';
import { recipientRepository } from '@/lib/repositories/recipientRepository';

export type MetricType = 'sent' | 'delivered' | 'read' | 'clicked' | 'replied' | 'converted' | 'blocked';

export type { CampaignMetrics, CampaignAnalytics };

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
    await campaignRepository.incrementFunnelMetric(campaignId, metricType, incrementBy);
    console.log(`✅ [CampaignMetrics] Incremented ${metricType} for campaign ${campaignId} by ${incrementBy}`);
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
      const timestamp = Date.now();
      await this.incrementMetric(campaignId, 'converted');
      await campaignRepository.addRevenue(campaignId, orderAmount);
      await campaignRepository.addConversionRecord(campaignId, recipientPhone, orderAmount, timestamp);
      console.log(`✅ [CampaignMetrics] Recorded conversion: ${campaignId} - ${recipientPhone} - ₹${orderAmount}`);
    } catch (error) {
      console.error('[CampaignMetrics] Error recording conversion:', error);
    }
  }

  /**
   * Get campaign metrics
   */
  async getMetrics(campaignId: string): Promise<CampaignMetrics> {
    return campaignRepository.getCampaignMetrics(campaignId);
  }

  /**
   * Get campaign analytics with calculated rates
   */
  async getAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    return campaignRepository.getCampaignAnalytics(campaignId);
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
      const timestamp = Date.now();
      // 🛡️ DEDUPLICATION: Only count the first click per recipient
      const alreadyClicked = await campaignRepository.getClickRecord(campaignId, recipientPhone);

      if (alreadyClicked) {
        console.log(`⏭️ [CampaignMetrics] Duplicate click ignored: ${campaignId} - ${recipientPhone}`);
        await campaignRepository.addClickLog(campaignId, recipientPhone, timestamp, 'repeat');
        return; // Don't increment metric
      }

      // ✅ UNIQUE CLICK: Increment metric (only once per recipient)
      await this.incrementMetric(campaignId, 'clicked');
      await campaignRepository.addClickRecord(campaignId, recipientPhone, timestamp);
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
      const recipient = await recipientRepository.getRecipient(campaignId, recipientPhone);

      if (!recipient?.sent_at) {
        return false;
      }

      const now = Math.floor(Date.now() / 1000);
      const hoursSinceSent = (now - recipient.sent_at) / 3600;

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
