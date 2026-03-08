/**
 * Campaign Details API - GET Campaign Info
 * 
 * Returns detailed campaign information including:
 * - Metadata (name, template, status, timestamps)
 * - Metrics (total, sent, failed counts)
 * - Progress percentage
 * - Pause reason (if applicable)
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { campaignRepository, recipientRepository } from '@/lib/repositories';

interface CampaignDetails {
  id: string;
  name: string;
  templateName: string;
  channel: string;
  status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
  audienceType: string;
  createdBy: string;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  pendingCount: number;
  progressPercentage: number;
  createdAt: number;
  updatedAt?: number;
  startedAt?: number;
  pausedAt?: number;
  pausedReason?: string;
  completedAt?: number;
}

/**
 * GET /api/campaigns/[id]
 * 
 * Get campaign details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1️⃣ Validate Admin Session
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // 2️⃣ Load campaign from repository
    const campaign = await campaignRepository.getCampaign(campaignId);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // 3️⃣ Parse campaign data and calculate metrics
    const totalRecipients = campaign.total_recipients || 0;
    const sentCount = campaign.sent_count || 0;
    const failedCount = campaign.failed_count || 0;
    const pendingCount = totalRecipients - sentCount - failedCount;
    const progressPercentage = totalRecipients > 0 
      ? Math.round(((sentCount + failedCount) / totalRecipients) * 100)
      : 0;

    const details: CampaignDetails = {
      id: campaign.campaign_id,
      name: campaign.campaign_name,
      templateName: campaign.template_name,
      channel: campaign.channel || 'WHATSAPP',
      status: (campaign.campaign_status as CampaignDetails['status']) || 'DRAFT',
      audienceType: campaign.audience_type || '',
      createdBy: campaign.created_by || '',
      totalRecipients,
      sentCount,
      failedCount,
      pendingCount,
      progressPercentage,
      createdAt: campaign.created_at || 0,
      updatedAt: campaign.updated_at,
      startedAt: campaign.started_at,
      pausedAt: campaign.paused_at,
      pausedReason: campaign.paused_reason,
      completedAt: campaign.completed_at
    };

    // 4️⃣ Return campaign details
    return NextResponse.json({
      success: true,
      campaign: details
    });

  } catch (error) {
    console.error('[CampaignDetails] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign details' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/campaigns/[id]
 *
 * Update editable fields of a DRAFT campaign.
 * Body (all optional): { name, templateName, dailyCap, redirectUrl }
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const validation = await validateAdminSession(req, 'whatsapp-session');
  if (!validation.valid || !validation.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: campaignId } = await params;

  let body: {
    name?: unknown;
    templateName?: unknown;
    dailyCap?: unknown;
    redirectUrl?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Validate provided fields
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim())) {
    return NextResponse.json({ error: 'name must be a non-empty string' }, { status: 400 });
  }
  if (body.templateName !== undefined && (typeof body.templateName !== 'string' || !body.templateName.trim())) {
    return NextResponse.json({ error: 'templateName must be a non-empty string' }, { status: 400 });
  }
  if (body.dailyCap !== undefined) {
    const cap = Number(body.dailyCap);
    if (!Number.isInteger(cap) || cap < 1) {
      return NextResponse.json({ error: 'dailyCap must be a positive integer' }, { status: 400 });
    }
  }
  if (body.redirectUrl !== undefined && typeof body.redirectUrl !== 'string') {
    return NextResponse.json({ error: 'redirectUrl must be a string' }, { status: 400 });
  }

  // Must update at least one field
  if (body.name === undefined && body.templateName === undefined && body.dailyCap === undefined && body.redirectUrl === undefined) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 });
  }

  try {
    await campaignRepository.updateCampaignMetadata(campaignId, {
      ...(body.name !== undefined && { campaign_name: (body.name as string).trim() }),
      ...(body.templateName !== undefined && { template_name: (body.templateName as string).trim() }),
      ...(body.dailyCap !== undefined && { daily_cap: Number(body.dailyCap) }),
      ...(body.redirectUrl !== undefined && { redirect_url: body.redirectUrl as string }),
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('not in DRAFT status')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('[CampaignUpdateAPI] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update campaign' }, { status: 500 });
  }
}

/**
 * DELETE /api/campaigns/[id]
 * 
 * Delete campaign and all associated data (recipients, logs)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 [Campaign Delete API] Request received');
  try {
    // 1️⃣ Validate Admin Session
    console.log('🔐 [Campaign Delete API] Validating admin session...');
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;
    console.log('📦 [Campaign Delete API] Campaign ID:', campaignId);

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // 2️⃣ Delete campaign metadata
    console.log('🗑️ [Campaign Delete API] Deleting campaign metadata...');
    await campaignRepository.deleteCampaign(campaignId);

    // 3️⃣ Delete all recipients
    console.log('🗑️ [Campaign Delete API] Deleting recipients...');
    await recipientRepository.deleteAllRecipients(campaignId);

    // 4️⃣ Delete all logs
    console.log('🗑️ [Campaign Delete API] Deleting logs...');
    const logsDeleted = await campaignRepository.deleteAllLogs(campaignId);

    console.log('✅ [Campaign Delete API] Campaign deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully',
      campaignId,
      deletedItems: {
        metadata: 1,
        logs: logsDeleted
      }
    });

  } catch (error) {
    console.error('❌ [Campaign Delete API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
