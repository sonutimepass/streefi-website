/**
 * Signed Token Click Tracking Endpoint
 * 
 * Secure click tracking using HMAC-signed tokens.
 * 
 * URL FORMAT:
 * ✅ https://streefi.in/r/{token}
 * 
 * Token payload: campaignId|recipientId|expiry|HMAC-SHA256
 * 
 * SECURITY:
 * - HMAC signature prevents URL tampering/guessing
 * - 7-day expiry prevents replay attacks  
 * - Unique click deduplication prevents inflation
 * 
 * FLOW:
 * 1. Verify token signature (reject if tampered)
 * 2. Check expiry (reject if expired)
 * 3. Track UNIQUE click (deduplicated per recipient)
 * 4. Redirect to vendor page with tracking params
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCampaignMetrics } from '@/lib/whatsapp/campaignMetrics';
import { verifyTrackingToken } from '@/lib/whatsapp/trackingToken';
import { campaignRepository } from '@/lib/repositories';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{
    token: string;
  }>;
}

/**
 * GET - Verify token, track unique click, redirect to vendor page
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { token } = await params;
  
  console.log(`🔐 [ClickTracker] Processing signed token...`);

  // 1. Verify token signature and expiry
  const payload = verifyTrackingToken(token);
  if (!payload) {
    console.error('[ClickTracker] Invalid or expired token');
    return NextResponse.json(
      { error: 'Invalid or expired tracking link' },
      { status: 403 }
    );
  }
  
  const { campaignId, recipientId } = payload;
  console.log(`✅ [ClickTracker] Token verified: Campaign ${campaignId}, Recipient ${recipientId}`);

  try {
    // 2. Track the click (with unique deduplication, async)
    const metricsManager = getCampaignMetrics();
    metricsManager.trackClick(campaignId, recipientId).catch((err: unknown) => {
      console.error('[ClickTracker] Failed to track click:', err);
    });

    // 3. Look up campaign to get redirect URL
    const campaign = await campaignRepository.getCampaign(campaignId);

    if (!campaign) {
      console.error('[ClickTracker] Campaign not found:', campaignId);
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // 4. Get redirect URL from campaign metadata
    const redirectUrl = campaign.redirect_url;
    
    if (!redirectUrl) {
      console.error('[ClickTracker] No redirect URL configured for campaign:', campaignId);
      return NextResponse.json(
        { error: 'Redirect URL not configured' },
        { status: 404 }
      );
    }

    // 5. Add tracking parameters to redirect URL
    const url = new URL(redirectUrl);
    url.searchParams.set('src', 'streefi');
    url.searchParams.set('campaign', campaignId);
    url.searchParams.set('phone', recipientId);

    console.log(`✅ [ClickTracker] Redirecting to: ${url.toString()}`);

    // 6. Redirect user (302 Found)
    return NextResponse.redirect(url.toString(), { status: 302 });

  } catch (error) {
    console.error('[ClickTracker] Error processing click:', error);
    
    // Fallback: redirect to Streefi homepage with error
    return NextResponse.redirect('https://streefi.in?error=tracking_failed', { status: 302 });
  }
}
