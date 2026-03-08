/**
 * Conversion Tracking API
 * 
 * Records business outcomes (orders, purchases) from campaigns.
 * Called by authenticated admin users via the WhatsApp admin panel.
 * 
 * POST /api/campaigns/:id/conversion
 * Body: {
 *   phone: "919999999999",
 *   orderAmount: 1250,
 *   orderId?: "ORD123"
 * }
 * 
 * AUTHENTICATION:
 * Requires valid whatsapp-session cookie (admin login).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getCampaignMetrics } from '@/lib/whatsapp/campaignMetrics';
import { validateAdminSession } from '@/lib/adminAuth';
import { campaignRepository } from '@/lib/repositories/campaignRepository';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

/**
 * POST - Record conversion
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id: campaignId } = await params;

  try {
    // Require valid admin session
    const auth = await validateAdminSession(request, 'whatsapp-session');
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validate request
    if (!body.phone || !body.orderAmount) {
      return NextResponse.json(
        { error: 'Missing required fields: phone, orderAmount' },
        { status: 400 }
      );
    }

    // Validate campaign exists before recording anything (BUG-007)
    const campaign = await campaignRepository.getCampaign(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Validate phone format
    if (!/^\d{10,15}$/.test(body.phone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      );
    }

    // Validate order amount
    const orderAmount = parseFloat(body.orderAmount);
    if (isNaN(orderAmount) || orderAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid order amount' },
        { status: 400 }
      );
    }

    // Record conversion
    const metricsManager = getCampaignMetrics();
    await metricsManager.recordConversion(campaignId, body.phone, orderAmount);

    console.log(`✅ [ConversionAPI] Conversion recorded: ${campaignId} - ${body.phone} - ₹${orderAmount}`);

    return NextResponse.json({
      success: true,
      message: 'Conversion recorded successfully',
      campaignId,
      phone: body.phone,
      orderAmount,
      orderId: body.orderId
    });

  } catch (error) {
    console.error('[ConversionAPI] Error recording conversion:', error);
    return NextResponse.json(
      { error: 'Failed to record conversion' },
      { status: 500 }
    );
  }
}
