/**
 * Campaign Control API - Start / Pause / Resume
 * 
 * Manages campaign execution state.
 * 
 * ALLOWED TRANSITIONS:
 * - DRAFT → RUNNING (start)
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

type CampaignStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
type ControlAction = 'start' | 'pause' | 'resume';

interface ControlRequest {
  action: ControlAction;
  reason?: string; // Optional reason for pause
}

/**
 * Load campaign status
 */
async function getCampaignStatus(campaignId: string): Promise<CampaignStatus | null> {
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

  return (response.Item.status?.S as CampaignStatus) || 'DRAFT';
}

/**
 * Validate state transition
 */
function validateTransition(currentStatus: CampaignStatus, action: ControlAction): { valid: boolean; error?: string } {
  switch (action) {
    case 'start':
      if (currentStatus !== 'DRAFT' && currentStatus !== 'PAUSED') {
        return {
          valid: false,
          error: `Cannot start campaign in ${currentStatus} status. Only DRAFT or PAUSED campaigns can be started.`
        };
      }
      break;

    case 'pause':
      if (currentStatus !== 'RUNNING') {
        return {
          valid: false,
          error: `Cannot pause campaign in ${currentStatus} status. Only RUNNING campaigns can be paused.`
        };
      }
      break;

    case 'resume':
      if (currentStatus !== 'PAUSED') {
        return {
          valid: false,
          error: `Cannot resume campaign in ${currentStatus} status. Only PAUSED campaigns can be resumed.`
        };
      }
      break;

    default:
      return {
        valid: false,
        error: `Unknown action: ${action}`
      };
  }

  return { valid: true };
}

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
  { params }: { params: { id: string } }
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

    const campaignId = params.id;

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      );
    }

    // 2️⃣ Parse request body
    const body: ControlRequest = await req.json();
    const { action, reason } = body;

    if (!action || !['start', 'pause', 'resume'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: start, pause, or resume' },
        { status: 400 }
      );
    }

    // 3️⃣ Load current campaign status
    const currentStatus = await getCampaignStatus(campaignId);

    if (!currentStatus) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // 4️⃣ Validate state transition
    const transitionValidation = validateTransition(currentStatus, action);
    
    if (!transitionValidation.valid) {
      return NextResponse.json(
        { error: transitionValidation.error },
        { status: 400 }
      );
    }

    // 5️⃣ Update campaign status
    await updateCampaignStatus(campaignId, action, reason);

    // 6️⃣ Return success
    return NextResponse.json({
      success: true,
      campaignId,
      action,
      previousStatus: currentStatus,
      newStatus: action === 'pause' ? 'PAUSED' : 'RUNNING',
      message: `Campaign ${action} successful`
    });

  } catch (error) {
    console.error('[CampaignControl] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Campaign control failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
