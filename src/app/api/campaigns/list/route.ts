/**
 * Campaign List API - GET All Campaigns
 * 
 * Returns list of all campaigns with key metrics:
 * - Basic metadata (name, template, status)
 * - Counts (total, sent, failed, pending)
 * - Progress percentage
 * - Timestamps (created, started, completed)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { campaignService } from '@/services';

interface CampaignListItem {
  id: string;
  name: string;
  templateName: string;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  progressPercentage: number;
  dailyCap?: number;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  pausedReason?: string;
}

/**
 * GET /api/campaigns/list
 * 
 * List all campaigns with metrics
 */
export async function GET(req: NextRequest) {
  try {
    // 1️⃣ Validate Admin Session
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2️⃣ Get campaigns from service layer (uses GSI1 Query, not Scan)
    const campaigns = await campaignService.listCampaigns();

    if (campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        campaigns: [],
        count: 0
      });
    }

    // 3️⃣ Transform to list format with calculated fields
    const campaignList: CampaignListItem[] = campaigns.map(campaign => {
      const totalRecipients = campaign.totalRecipients;
      const sentCount = campaign.sentCount;
      const failedCount = campaign.failedCount;
      const pendingCount = totalRecipients - sentCount - failedCount;
      const progressPercentage = totalRecipients > 0 
        ? Math.round(((sentCount + failedCount) / totalRecipients) * 100)
        : 0;

      return {
        id: campaign.id,
        name: campaign.name,
        templateName: campaign.templateName,
        status: campaign.status as CampaignListItem['status'],
        totalRecipients,
        sentCount,
        failedCount,
        pendingCount,
        progressPercentage,
        dailyCap: campaign.dailyCap,
        createdAt: campaign.createdAt.getTime(),
        startedAt: campaign.startedAt?.getTime(),
        completedAt: campaign.completedAt?.getTime(),
        pausedReason: undefined // Not in current Campaign type
      };
    });

    // 4️⃣ Sort by most recent first
    campaignList.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({
      success: true,
      campaigns: campaignList,
      count: campaignList.length
    });

  } catch (error) {
    console.error('❌ List campaigns error:', error);
    return NextResponse.json(
      { error: 'Failed to list campaigns' },
      { status: 500 }
    );
  }
}
