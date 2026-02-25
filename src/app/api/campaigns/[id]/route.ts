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
