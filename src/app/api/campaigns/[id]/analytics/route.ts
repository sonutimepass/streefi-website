/**
 * Campaign Analytics API
 * 
 * Returns funnel metrics and calculated rates for a campaign.
 * 
 * GET /api/campaigns/:id/analytics
 * 
 * RESPONSE:
 * {
 *   sent: 5000,
 *   delivered: 4800,
 *   read: 4100,
 *   clicked: 600,
 *   replied: 120,
 *   converted: 92,
 *   revenue: 18400,
 *   deliveryRate: 0.96,
 *   readRate: 0.85,
 *   ctr: 0.14,
 *   replyRate: 0.025,
 *   conversionRate: 0.153,
 *   roi: 3.68
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { getCampaignMetrics } from '@/lib/whatsapp/campaignMetrics';

interface RouteParams {
  params: {
    id: string;
  };
}

/**
 * GET - Get campaign analytics
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  // Validate admin session
  const validation = await validateAdminSession(request, 'whatsapp-session');
  if (!validation.valid) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { id: campaignId } = params;

  try {
    const metricsManager = getCampaignMetrics();
    const analytics = await metricsManager.getAnalytics(campaignId);

    return NextResponse.json({
      success: true,
      campaignId,
      analytics: {
        // Raw counts
        sent: analytics.sent,
        delivered: analytics.delivered,
        read: analytics.read,
        clicked: analytics.clicked,
        replied: analytics.replied,
        converted: analytics.converted,
        blocked: analytics.blocked,
        revenue: analytics.revenue,
        
        // Calculated rates (percentages)
        deliveryRate: parseFloat((analytics.deliveryRate * 100).toFixed(2)),
        readRate: parseFloat((analytics.readRate * 100).toFixed(2)),
        ctr: parseFloat((analytics.ctr * 100).toFixed(2)),
        replyRate: parseFloat((analytics.replyRate * 100).toFixed(2)),
        conversionRate: parseFloat((analytics.conversionRate * 100).toFixed(2)),
        blockRate: parseFloat((analytics.blockRate * 100).toFixed(2)), // 🚨 META BAN RISK
        engagementScore: parseFloat((analytics.engagementScore * 100).toFixed(2)), // 🎯 <5% = low quality
        roi: analytics.roi ? parseFloat(analytics.roi.toFixed(2)) : undefined
      }
    });
  } catch (error) {
    console.error('[CampaignAnalytics] Error getting analytics:', error);
    return NextResponse.json(
      { error: 'Failed to get campaign analytics' },
      { status: 500 }
    );
  }
}
