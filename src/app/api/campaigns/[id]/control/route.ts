/**
 * Campaign Control API - Start / Pause / Resume
 * 
 * Manages campaign execution state.
 * 
 * ALLOWED TRANSITIONS:
 * - DRAFT → RUNNING (start)
 * - READY → RUNNING (start - after population)
 * - RUNNING → PAUSED (pause)
 * - PAUSED → RUNNING (resume)
 * - RUNNING → COMPLETED (automatic when no pending recipients)
 * 
 * NOT ALLOWED:
 * - COMPLETED → RUNNING (create new campaign instead)
 * - DRAFT → PAUSED (must start first)
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';
import { validateAdminSession } from '@/lib/adminAuth';
import { isKillSwitchEnabled } from '@/app/api/whatsapp-admin/kill-switch/route';
import { getCampaignStateValidator, type CampaignStatus } from '@/lib/whatsapp/campaignStateValidator';

type ControlAction = 'start' | 'pause' | 'resume';

interface ControlRequest {
  action: ControlAction;
  reason?: string; // Optional reason for pause
}

/**
 * Load campaign metadata (status and totalRecipients for validation)
 */
async function getCampaignMetadata(campaignId: string): Promise<{ status: CampaignStatus; totalRecipients: number } | null> {
  const response = await dynamoClient.send(
    new GetItemCommand({
      TableName: TABLES.CAMPAIGNS,
      Key: {
        PK: { S: `CAMPAIGN#${campaignId}` },
        SK: { S: 'METADATA' }
      }
    })
  );

  if (!response.Item) {
    return null;
  }

  // Map legacy 'READY' status to 'POPULATED' for state validator compatibility
  let status = response.Item.status?.S || 'DRAFT';
  if (status === 'READY') {
    status = 'POPULATED';
  }

  return {
    status: status as CampaignStatus,
    totalRecipients: parseInt(response.Item.totalRecipients?.N || '0', 10)
  };
}

// Removed: validateTransition function replaced by state validator below

/**
 * Update campaign status
 */
async function updateCampaignStatus(
  campaignId: string,
  action: ControlAction,
  reason?: string
): Promise<void> {
  const timestamp = Math.floor(Date.now() / 1000);
  
  let updateExpression: string;
  let expressionAttributeValues: Record<string, any>;

  switch (action) {
    case 'start':
    case 'resume':
      updateExpression = 'SET #status = :running, startedAt = :timestamp REMOVE pausedAt, pausedReason';
      expressionAttributeValues = {
        ':running': { S: 'RUNNING' },
        ':timestamp': { N: timestamp.toString() }
      };
      break;

    case 'pause':
      updateExpression = reason
        ? 'SET #status = :paused, pausedAt = :timestamp, pausedReason = :reason'
        : 'SET #status = :paused, pausedAt = :timestamp';
      
      expressionAttributeValues = {
        ':paused': { S: 'PAUSED' },
        ':timestamp': { N: timestamp.toString() }
      };
      
      if (reason) {
        expressionAttributeValues[':reason'] = { S: reason };
      }
      break;

    default:
      throw new Error(`Unknown action: ${action}`);
  }

  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: TABLES.CAMPAIGNS,
      Key: {
        PK: { S: `CAMPAIGN#${campaignId}` },
        SK: { S: 'METADATA' }
      },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: expressionAttributeValues
    })
  );
}

/**
 * POST /api/campaigns/[id]/control
 * 
 * Control campaign execution state
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('🚀 [Campaign Control API] Request received');
  try {
    // 1️⃣ Validate Admin Session
    console.log('🔐 [Campaign Control API] Validating admin session...');
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

    // 2️⃣ Parse request body
    const body: ControlRequest = await req.json();
    const { action, reason } = body;
    console.log('📦 [Campaign Control API] Request body:', { campaignId, action, reason });

    if (!action || !['start', 'pause', 'resume'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: start, pause, or resume' },
        { status: 400 }
      );
    }

    // 3️⃣ Load current campaign metadata
    console.log('📥 [Campaign Control API] Loading campaign metadata...');
    const campaign = await getCampaignMetadata(campaignId);
    console.log('📊 [Campaign Control API] Current status:', campaign?.status);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // 4️⃣ Validate state transition using state validator
    console.log('🔒 [Campaign Control API] Validating transition:', { currentStatus: campaign.status, action });
    const validator = getCampaignStateValidator();
    
    let validationResult;
    switch (action) {
      case 'start':
      case 'resume':
        validationResult = validator.canStart(campaign.status, campaign.totalRecipients);
        break;
      case 'pause':
        validationResult = validator.canPause(campaign.status);
        break;
      default:
        validationResult = { allowed: false, reason: `Unknown action: ${action}` };
    }
    
    if (!validationResult.allowed) {
      console.error('❌ [Campaign Control API] Invalid transition:', validationResult.reason);
      return NextResponse.json(
        { error: validationResult.reason },
        { status: 400 }
      );
    }
    
    console.log('✅ [Campaign Control API] State transition validated');

    // 🛡️ CRITICAL: Check kill switch BEFORE starting/resuming campaigns
    if (action === 'start' || action === 'resume') {
      console.log('🛡️ [Campaign Control API] Checking emergency kill switch...');
      const killSwitch = await isKillSwitchEnabled();
      
      if (killSwitch.enabled) {
        console.warn('🚨 [Campaign Control API] KILL SWITCH ENABLED - Blocking start/resume');
        console.warn('🚨 [Campaign Control API] Reason:', killSwitch.reason);
        
        return NextResponse.json(
          { 
            error: 'Cannot start/resume: Emergency kill switch is enabled',
            killSwitch: {
              enabled: true,
              reason: killSwitch.reason || 'System-wide sending disabled'
            },
            action: 'Contact admin to disable kill switch before starting campaigns'
          },
          { status: 403 }
        );
      }
      
      console.log('✅ [Campaign Control API] Kill switch check passed');
    }

    // 5️⃣ Update campaign status
    console.log('💾 [Campaign Control API] Updating campaign status...');
    await updateCampaignStatus(campaignId, action, reason);
    console.log('✅ [Campaign Control API] Status updated successfully');

    // 6️⃣ Return success
    return NextResponse.json({
      success: true,
      campaignId,
      action,
      previousStatus: campaign.status,
      newStatus: action === 'pause' ? 'PAUSED' : 'RUNNING',
      message: `Campaign ${action} successful`
    });

  } catch (error) {
    console.error('❌ [Campaign Control API] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Campaign control failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
