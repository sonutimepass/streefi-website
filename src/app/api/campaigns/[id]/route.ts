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
import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';
import { validateAdminSession } from '@/lib/adminAuth';

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

    // 2️⃣ Load campaign metadata
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
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const item = response.Item;

    // 3️⃣ Parse campaign data
    const totalRecipients = parseInt(item.totalRecipients?.N || '0', 10);
    const sentCount = parseInt(item.sentCount?.N || '0', 10);
    const failedCount = parseInt(item.failedCount?.N || '0', 10);
    const pendingCount = totalRecipients - sentCount - failedCount;
    const progressPercentage = totalRecipients > 0 
      ? Math.round(((sentCount + failedCount) / totalRecipients) * 100)
      : 0;

    const details: CampaignDetails = {
      id: campaignId,
      name: item.name?.S || '',
      templateName: item.templateName?.S || '',
      channel: item.channel?.S || 'WHATSAPP',
      status: (item.status?.S as CampaignDetails['status']) || 'DRAFT',
      audienceType: item.audienceType?.S || '',
      createdBy: item.createdBy?.S || '',
      totalRecipients,
      sentCount,
      failedCount,
      pendingCount,
      progressPercentage,
      createdAt: parseInt(item.createdAt?.N || '0', 10),
      updatedAt: item.updatedAt?.N ? parseInt(item.updatedAt.N, 10) : undefined,
      startedAt: item.startedAt?.N ? parseInt(item.startedAt.N, 10) : undefined,
      pausedAt: item.pausedAt?.N ? parseInt(item.pausedAt.N, 10) : undefined,
      pausedReason: item.pausedReason?.S,
      completedAt: item.completedAt?.N ? parseInt(item.completedAt.N, 10) : undefined
    };

    // 4️⃣ Return campaign details
    return NextResponse.json({
      success: true,
      campaign: details
    });

  } catch (error) {
    console.error('[CampaignDetails] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch campaign details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
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

    // 2️⃣ Import required AWS SDK commands
    const { DeleteItemCommand, QueryCommand, BatchWriteItemCommand } = await import('@aws-sdk/client-dynamodb');

    // 3️⃣ Query all items for this campaign (recipients + logs)
    console.log('🔍 [Campaign Delete API] Querying campaign items...');
    const queryResponse = await dynamoClient.send(
      new QueryCommand({
        TableName: TABLES.CAMPAIGNS,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': { S: `CAMPAIGN#${campaignId}` }
        }
      })
    );

    const itemsToDelete = queryResponse.Items || [];
    console.log(`📊 [Campaign Delete API] Found ${itemsToDelete.length} items to delete`);

    // 4️⃣ Delete campaign metadata
    console.log('🗑️ [Campaign Delete API] Deleting campaign metadata...');
    await dynamoClient.send(
      new DeleteItemCommand({
        TableName: TABLES.CAMPAIGNS,
        Key: {
          PK: { S: `CAMPAIGN#${campaignId}` },
          SK: { S: 'METADATA' }
        }
      })
    );

    // 5️⃣ Delete recipients in batches (DynamoDB BatchWrite max 25 items)
    console.log('🔍 [Campaign Delete API] Querying recipients...');
    const recipientsResponse = await dynamoClient.send(
      new QueryCommand({
        TableName: TABLES.RECIPIENTS,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': { S: `CAMPAIGN#${campaignId}` }
        }
      })
    );

    const recipients = recipientsResponse.Items || [];
    console.log(`📊 [Campaign Delete API] Found ${recipients.length} recipients to delete`);

    // Delete recipients in batches of 25
    for (let i = 0; i < recipients.length; i += 25) {
      const batch = recipients.slice(i, i + 25);
      if (batch.length > 0) {
        console.log(`🗑️ [Campaign Delete API] Deleting recipient batch ${Math.floor(i / 25) + 1}...`);
        await dynamoClient.send(
          new BatchWriteItemCommand({
            RequestItems: {
              [TABLES.RECIPIENTS]: batch.map(item => ({
                DeleteRequest: {
                  Key: {
                    PK: item.PK,
                    SK: item.SK
                  }
                }
              }))
            }
          })
        );
      }
    }

    // 6️⃣ Delete logs in batches
    const logs = itemsToDelete.filter(item => item.SK?.S?.startsWith('LOG#'));
    console.log(`📊 [Campaign Delete API] Found ${logs.length} logs to delete`);
    
    for (let i = 0; i < logs.length; i += 25) {
      const batch = logs.slice(i, i + 25);
      if (batch.length > 0) {
        console.log(`🗑️ [Campaign Delete API] Deleting log batch ${Math.floor(i / 25) + 1}...`);
        await dynamoClient.send(
          new BatchWriteItemCommand({
            RequestItems: {
              [TABLES.CAMPAIGNS]: batch.map(item => ({
                DeleteRequest: {
                  Key: {
                    PK: item.PK,
                    SK: item.SK
                  }
                }
              }))
            }
          })
        );
      }
    }

    console.log('✅ [Campaign Delete API] Campaign deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully',
      campaignId,
      deletedItems: {
        metadata: 1,
        recipients: recipients.length,
        logs: logs.length
      }
    });

  } catch (error) {
    console.error('❌ [Campaign Delete API] Error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to delete campaign',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
