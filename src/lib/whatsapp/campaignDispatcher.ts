/**
 * Campaign Dispatcher
 * 
 * CRITICAL: This is the heart of campaign execution at scale.
 * 
 * PURPOSE:
 * - Finds active campaigns that need processing
 * - Schedules batch execution
 * - Prevents campaigns from stalling
 * - Enforces rate limits across all campaigns
 * 
 * TRIGGER:
 * - CloudWatch cron (every 1 minute): /api/campaigns/dispatch
 * - Or: EventBridge schedule
 * 
 * FLOW:
 * 1. Query campaigns with status=RUNNING
 * 2. Check daily limits (don't exceed)
 * 3. Prioritize campaigns (first-in-first-out or priority-based)
 * 4. Trigger execute-batch for each campaign
 * 5. Update dispatch queue state
 * 
 * WHY THIS MATTERS:
 * Without dispatcher, campaigns rely on:
 * - Manual triggers
 * - UI staying open
 * - Hope
 * 
 * With dispatcher:
 * - Campaigns run automatically
 * - Survive server restarts
 * - Scale to 100k+ messages
 */

import { ScanCommand, UpdateItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';

interface CampaignDispatchItem {
  campaignId: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  priority?: number;
  totalRecipients: number;
  sentCount: number;
  nextBatchTime?: number;
}

export class CampaignDispatcher {
  private readonly BATCH_SIZE = 100; // Messages per batch
  private readonly MAX_CONCURRENT_CAMPAIGNS = 3; // Process 3 campaigns simultaneously
  
  /**
   * Find campaigns that need processing
   */
  async findPendingCampaigns(): Promise<CampaignDispatchItem[]> {
    try {
      // Query campaigns with RUNNING status
      const response = await dynamoClient.send(
        new ScanCommand({
          TableName: TABLES.CAMPAIGNS,
          FilterExpression: 'campaign_status = :status AND SK = :sk',
          ExpressionAttributeValues: {
            ':status': { S: 'RUNNING' },
            ':sk': { S: 'METADATA' }
          }
        })
      );

      if (!response.Items || response.Items.length === 0) {
        console.log('📭 [Dispatcher] No active campaigns found');
        return [];
      }

      const campaigns: CampaignDispatchItem[] = response.Items.map(item => ({
        campaignId: item.PK?.S?.replace('CAMPAIGN#', '') || '',
        status: (item.campaign_status?.S as CampaignDispatchItem['status']) || 'DRAFT',
        priority: parseInt(item.priority?.N || '5', 10),
        totalRecipients: parseInt(item.totalRecipients?.N || '0', 10),
        sentCount: parseInt(item.sentCount?.N || '0', 10),
        nextBatchTime: parseInt(item.nextBatchTime?.N || '0', 10)
      }));

      // Filter campaigns that are ready for next batch
      const now = Math.floor(Date.now() / 1000);
      const readyCampaigns = campaigns.filter(c => {
        // Skip if already completed
        if (c.sentCount >= c.totalRecipients) return false;
        
        // Check if cooldown period passed
        if (c.nextBatchTime && c.nextBatchTime > now) return false;
        
        return true;
      });

      // Sort by priority (higher first), then by oldest first
      readyCampaigns.sort((a, b) => {
        if (a.priority !== b.priority) {
          return (b.priority || 5) - (a.priority || 5);
        }
        return 0;
      });

      console.log(`📋 [Dispatcher] Found ${readyCampaigns.length} campaigns ready for processing`);
      return readyCampaigns.slice(0, this.MAX_CONCURRENT_CAMPAIGNS);

    } catch (error) {
      console.error('[Dispatcher] Error finding pending campaigns:', error);
      return [];
    }
  }

  /**
   * Dispatch batch execution for a campaign
   * Triggers the execute-batch endpoint
   */
  async dispatchCampaign(campaignId: string): Promise<boolean> {
    try {
      console.log(`🚀 [Dispatcher] Dispatching campaign ${campaignId}`);

      // Call execute-batch endpoint
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const response = await fetch(`${baseUrl}/api/campaigns/${campaignId}/execute-batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dispatcher-key': process.env.DISPATCHER_SECRET_KEY || 'internal-dispatcher'
        },
        body: JSON.stringify({
          batchSize: this.BATCH_SIZE
        })
      });

      if (!response.ok) {
        console.error(`❌ [Dispatcher] Failed to dispatch campaign ${campaignId}: ${response.statusText}`);
        return false;
      }

      const result = await response.json();
      console.log(`✅ [Dispatcher] Campaign ${campaignId} dispatched: ${result.sent} messages sent`);

      // Update next batch time (1 minute cooldown)
      await this.updateNextBatchTime(campaignId, 60);

      return true;
    } catch (error) {
      console.error(`[Dispatcher] Error dispatching campaign ${campaignId}:`, error);
      return false;
    }
  }

  /**
   * Update campaign's next batch execution time
   */
  private async updateNextBatchTime(campaignId: string, cooldownSeconds: number): Promise<void> {
    try {
      const nextTime = Math.floor(Date.now() / 1000) + cooldownSeconds;
      
      await dynamoClient.send(
        new UpdateItemCommand({
          TableName: TABLES.CAMPAIGNS,
          Key: {
            PK: { S: `CAMPAIGN#${campaignId}` },
            SK: { S: 'METADATA' }
          },
          UpdateExpression: 'SET nextBatchTime = :time',
          ExpressionAttributeValues: {
            ':time': { N: nextTime.toString() }
          }
        })
      );
    } catch (error) {
      console.error('[Dispatcher] Failed to update next batch time:', error);
    }
  }

  /**
   * Main dispatch loop
   * Called by cron job every minute
   */
  async run(): Promise<{ dispatched: number; failed: number }> {
    console.log('🔄 [Dispatcher] Starting dispatch cycle...');

    const campaigns = await this.findPendingCampaigns();
    
    if (campaigns.length === 0) {
      return { dispatched: 0, failed: 0 };
    }

    let dispatched = 0;
    let failed = 0;

    // Dispatch campaigns sequentially (to respect rate limits)
    for (const campaign of campaigns) {
      const success = await this.dispatchCampaign(campaign.campaignId);
      if (success) {
        dispatched++;
      } else {
        failed++;
      }
      
      // Small delay between campaigns (rate control)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`✅ [Dispatcher] Cycle complete: ${dispatched} dispatched, ${failed} failed`);
    return { dispatched, failed };
  }
}

// Singleton instance
let dispatcherInstance: CampaignDispatcher | null = null;

export function getCampaignDispatcher(): CampaignDispatcher {
  if (!dispatcherInstance) {
    dispatcherInstance = new CampaignDispatcher();
  }
  return dispatcherInstance;
}
