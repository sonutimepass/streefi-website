/**
 * Click Tracking Redirect Endpoint (Signed Token Version)
 * 
 * Prevents fake/guessable click URLs using HMAC-signed tokens.
 * 
 * URL FORMAT (OLD - INSECURE):
 * ❌ https://streefi.in/r/{campaignId}/{recipientId}
 * 
 * URL FORMAT (NEW - SECURE):
 * ✅ https://streefi.in/r/{token}
 * 
 * Token payload: campaignId|recipientId|expiry|HMAC
 * 
 * FLOW:
 * 1. User clicks link in WhatsApp message
 * 2. Verify token signature (prevents fake clicks)
 * 3. Check expiry (prevents replay attacks)
 * 4. Record UNIQUE click (deduplicated per recipient)
 * 5. Redirect to vendor page (302)
 * 
 * SECURITY:
 * - HMAC prevents URL tampering
 * - 7-day expiry window
 * - Unique click deduplication
 * - Prevents analytics inflation from bots/repeated clicks
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCampaignMetrics } from '@/lib/whatsapp/campaignMetrics';
import { verifyTrackingToken } from '@/lib/whatsapp/trackingToken';
import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: {
    campaignId: string;
    recipientId: string;
  };
}

/**
 * GET - Track click and redirect to vendor page
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  // Handle both old format (2 params) and new format (1 token param)
  // Check if campaignId looks like a token (no dashes/common ID patterns)
  const isToken = params.campaignId.length > 50; // Tokens are base64, much longer
  
  let campaignId: string;
  let recipientId: string;
  
  if (isToken) {
    // NEW SECURE FORMAT: /r/{token}
    const token = params.campaignId;
    
    console.log(`🔐 [ClickTracker] Verifying signed token...`);
    
    const payload = verifyTrackingToken(token);
    if (!payload) {
      console.error('[ClickTracker] Invalid or expired token');
      return NextResponse.json(
        { error: 'Invalid or expired tracking link' },
        { status: 403 }
      );
    }
    
    campaignId = payload.campaignId;
    recipientId = payload.recipientId;
    
    console.log(`✅ [ClickTracker] Token verified: Campaign ${campaignId}, Recipient ${recipientId}`);
  } else {
    // OLD INSECURE FORMAT: /r/{campaignId}/{recipientId}
    // TODO: Remove this after migration period
    campaignId = params.campaignId;
    recipientId = params.recipientId;
    
    console.warn(`⚠️ [ClickTracker] Using legacy insecure URL format for campaign ${campaignId}`);
  }

  try {
    // 1. Track the click (async, non-blocking, with deduplication)
    const metricsManager = getCampaignMetrics();
    metricsManager.trackClick(campaignId, recipientId).catch((err: unknown) => {
      console.error('[ClickTracker] Failed to track click:', err);
    });

    // 2. Look up campaign to get redirect URL
    const campaignResponse = await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLES.CAMPAIGNS,
        Key: {
          PK: { S: `CAMPAIGN#${campaignId}` },
          SK: { S: 'METADATA' }
        }
      })
    );

    if (!campaignResponse.Item) {
      console.error('[ClickTracker] Campaign not found:', campaignId);
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // 3. Get redirect URL from campaign metadata
    const redirectUrl = campaignResponse.Item.redirectUrl?.S;
    
    if (!redirectUrl) {
      console.error('[ClickTracker] No redirect URL configured for campaign:', campaignId);
      return NextResponse.json(
        { error: 'Redirect URL not configured' },
        { status: 404 }
      );
    }

    // 4. Add tracking parameters to redirect URL
    const url = new URL(redirectUrl);
    url.searchParams.set('src', 'streefi');
    url.searchParams.set('campaign', campaignId);
    url.searchParams.set('phone', recipientId);

    console.log(`✅ [ClickTracker] Redirecting to: ${url.toString()}`);

    // 5. Redirect user (302 Found)
    return NextResponse.redirect(url.toString(), { status: 302 });

  } catch (error) {
    console.error('[ClickTracker] Error processing click:', error);
    
    // Fallback: redirect to Streefi homepage with error
    return NextResponse.redirect('https://streefi.in?error=tracking_failed', { status: 302 });
  }
}
