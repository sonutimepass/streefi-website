/**
 * Campaign Service
 * 
 * Business logic for campaign management.
 * Uses CampaignRepository and RecipientRepository.
 * 
 * Responsibilities:
 * - Create campaigns with validation
 * - Update campaign status with business rules
 * - Get campaign details with metrics
 * - List campaigns with filters
 * - Delete campaigns (with cascade to recipients)
 * - Campaign lifecycle management
 * 
 * NOTE: This is a skeleton - implement business logic gradually
 */

import { campaignRepository, recipientRepository } from "../lib/repositories";
import type {
  Campaign,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignMetrics,
  CampaignStatus
} from "../types/domain";

export class CampaignService {
  /**
   * Create new campaign
   * 
   * TODO: Add validation:
   * - Check template exists and is approved
   * - Validate phone numbers
   * - Check daily limits
   * - Validate scheduled time
   */
  async createCampaign(request: CreateCampaignRequest): Promise<Campaign> {
    try {
      const campaignId = Date.now().toString();
      const now = new Date();

      // Create campaign metadata
      const campaign: Campaign = {
        id: campaignId,
        name: request.name,
        status: request.scheduledAt ? "SCHEDULED" : "DRAFT",
        templateName: request.templateName,
        templateParams: request.templateParams,
        totalRecipients: request.recipients.length,
        sentCount: 0,
        deliveredCount: 0,
        receivedCount: 0,
        failedCount: 0,
        createdAt: now,
        scheduledAt: request.scheduledAt,
        batchSize: request.batchSize,
        rateLimit: request.rateLimit
      };

      // Save campaign to database
      await campaignRepository.createCampaign({
        campaign_id: campaignId,
        campaign_name: request.name,
        campaign_status: campaign.status,
        template_name: request.templateName,
        template_params: request.templateParams,
        total_recipients: request.recipients.length,
        sent_count: 0,
        delivered_count: 0,
        failed_count: 0,
        created_at: now.getTime(),
        batch_size: request.batchSize,
        rate_limit: request.rateLimit,
        ...(request.scheduledAt && {
          scheduled_at: request.scheduledAt.getTime()
        })
      });

      // Create recipients
      await recipientRepository.createRecipients(
        campaignId,
        request.recipients,
        request.templateParams
      );

      console.log(`[CampaignService] Campaign created: ${campaignId} with ${request.recipients.length} recipients`);
      return campaign;
    } catch (error) {
      console.error("[CampaignService] Create campaign error:", error);
      throw new Error("Failed to create campaign");
    }
  }

  /**
   * Get campaign by ID with full details
   */
  async getCampaign(campaignId: string): Promise<Campaign | null> {
    try {
      const campaignData = await campaignRepository.getCampaign(campaignId);
      
      if (!campaignData) {
        return null;
      }

      return {
        id: campaignData.campaign_id,
        name: campaignData.campaign_name,
        status: campaignData.campaign_status,
        templateName: campaignData.template_name,
        templateParams: campaignData.template_params,
        totalRecipients: campaignData.total_recipients,
        sentCount: campaignData.sent_count,
        deliveredCount: campaignData.delivered_count,
        receivedCount: campaignData.received_count || 0,
        failedCount: campaignData.failed_count,
        createdAt: new Date(campaignData.created_at),
        updatedAt: campaignData.updated_at ? new Date(campaignData.updated_at) : undefined,
        scheduledAt: campaignData.scheduled_at ? new Date(campaignData.scheduled_at) : undefined,
        startedAt: campaignData.started_at ? new Date(campaignData.started_at) : undefined,
        completedAt: campaignData.completed_at ? new Date(campaignData.completed_at) : undefined,
        lastDispatchAt: campaignData.last_dispatch_at ? new Date(campaignData.last_dispatch_at) : undefined,
        dailyCap: campaignData.daily_cap,
        batchSize: campaignData.batch_size,
        rateLimit: campaignData.rate_limit
      };
    } catch (error) {
      console.error("[CampaignService] Get campaign error:", error);
      throw new Error(`Failed to get campaign: ${campaignId}`);
    }
  }

  /**
   * Update campaign status
   * 
   * TODO: Add business rules:
   * - Validate status transitions (e.g., can't go from COMPLETED to RUNNING)
   * - Check if all recipients processed before marking COMPLETED
   * - Handle PAUSE logic (stop dispatching)
   */
  async updateCampaignStatus(campaignId: string, status: CampaignStatus): Promise<void> {
    try {
      await campaignRepository.updateCampaignStatus(campaignId, status);
      console.log(`[CampaignService] Campaign ${campaignId} status updated to: ${status}`);
    } catch (error) {
      console.error("[CampaignService] Update status error:", error);
      throw new Error(`Failed to update campaign status: ${campaignId}`);
    }
  }

  /**
   * Get campaign metrics
   */
  async getCampaignMetrics(campaignId: string): Promise<CampaignMetrics | null> {
    try {
      const campaign = await campaignRepository.getCampaign(campaignId);
      
      if (!campaign) {
        return null;
      }

      const pending = campaign.total_recipients - 
        (campaign.sent_count + campaign.failed_count);

      return {
        campaignId: campaign.campaign_id,
        totalRecipients: campaign.total_recipients,
        sent: campaign.sent_count,
        delivered: campaign.delivered_count,
        received: campaign.received_count || 0,
        read: 0, // TODO: Track read status
        failed: campaign.failed_count,
        pending: pending > 0 ? pending : 0,
        processing: 0, // TODO: Count processing recipients
        deliveryRate: campaign.sent_count > 0 
          ? (campaign.delivered_count / campaign.sent_count) * 100 
          : 0,
        failureRate: campaign.total_recipients > 0
          ? (campaign.failed_count / campaign.total_recipients) * 100
          : 0
      };
    } catch (error) {
      console.error("[CampaignService] Get metrics error:", error);
      throw new Error(`Failed to get campaign metrics: ${campaignId}`);
    }
  }

  /**
   * List all campaigns
   */
  async listCampaigns(): Promise<Campaign[]> {
    try {
      const campaigns = await campaignRepository.listCampaigns();
      
      return campaigns.map(c => ({
        id: c.campaign_id,
        name: c.campaign_name,
        status: c.campaign_status,
        templateName: c.template_name,
        templateParams: c.template_params,
        totalRecipients: c.total_recipients,
        sentCount: c.sent_count,
        deliveredCount: c.delivered_count,
        receivedCount: c.received_count || 0,
        failedCount: c.failed_count,
        createdAt: new Date(c.created_at),
        updatedAt: c.updated_at ? new Date(c.updated_at) : undefined,
        scheduledAt: c.scheduled_at ? new Date(c.scheduled_at) : undefined,
        startedAt: c.started_at ? new Date(c.started_at) : undefined,
        completedAt: c.completed_at ? new Date(c.completed_at) : undefined,
        dailyCap: c.daily_cap,
        batchSize: c.batch_size,
        rateLimit: c.rate_limit
      }));
    } catch (error) {
      console.error("[CampaignService] List campaigns error:", error);
      throw new Error("Failed to list campaigns");
    }
  }

  /**
   * Delete campaign (including all recipients)
   */
  async deleteCampaign(campaignId: string): Promise<void> {
    try {
      // Delete all recipients first
      await recipientRepository.deleteAllRecipients(campaignId);
      
      // Delete campaign metadata
      await campaignRepository.deleteCampaign(campaignId);
      
      console.log(`[CampaignService] Campaign deleted: ${campaignId}`);
    } catch (error) {
      console.error("[CampaignService] Delete campaign error:", error);
      throw new Error(`Failed to delete campaign: ${campaignId}`);
    }
  }

  /**
   * Increment campaign metrics (called by message dispatcher)
   */
  async incrementSent(campaignId: string, count: number = 1): Promise<void> {
    await campaignRepository.incrementMetric(campaignId, "sent_count", count);
  }

  async incrementDelivered(campaignId: string, count: number = 1): Promise<void> {
    await campaignRepository.incrementMetric(campaignId, "delivered_count", count);
  }

  async incrementFailed(campaignId: string, count: number = 1): Promise<void> {
    await campaignRepository.incrementMetric(campaignId, "failed_count", count);
  }

  /**
   * Add more recipients to existing campaign
   */
  async addRecipients(campaignId: string, phones: string[]): Promise<void> {
    try {
      await recipientRepository.createRecipients(campaignId, phones);
      await campaignRepository.updateTotalRecipients(campaignId, phones.length);
      
      console.log(`[CampaignService] Added ${phones.length} recipients to campaign: ${campaignId}`);
    } catch (error) {
      console.error("[CampaignService] Add recipients error:", error);
      throw new Error(`Failed to add recipients to campaign: ${campaignId}`);
    }
  }
}

// Export singleton instance
export const campaignService = new CampaignService();
