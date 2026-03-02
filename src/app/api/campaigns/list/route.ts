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
import { ScanCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';
import { validateAdminSession } from '@/lib/adminAuth';

interface CampaignListItem {
  id: string;
  name: string;
  templateName: string;
  status: 'DRAFT' | 'READY' | 'RUNNING' | 'PAUSED' | 'COMPLETED';
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

    // 2️⃣ Scan campaigns table for all METADATA entries
    const response = await dynamoClient.send(
      new ScanCommand({
        TableName: TABLES.CAMPAIGNS,
        FilterExpression: 'SK = :metadata',
        ExpressionAttributeValues: {
          ':metadata': { S: 'METADATA' }
        }
      })
    );

    if (!response.Items || response.Items.length === 0) {
      return NextResponse.json({
        success: true,
        campaigns: [],
        count: 0
      });
    }

    // 3️⃣ Parse campaigns
    const campaigns: CampaignListItem[] = response.Items.map(item => {
      const campaignId = item.PK?.S?.replace('CAMPAIGN#', '') || '';
      const totalRecipients = parseInt(item.totalRecipients?.N || '0', 10);
      const sentCount = parseInt(item.sentCount?.N || '0', 10);
      const failedCount = parseInt(item.failedCount?.N || '0', 10);
      const pendingCount = totalRecipients - sentCount - failedCount;
      const progressPercentage = totalRecipients > 0 
        ? Math.round(((sentCount + failedCount) / totalRecipients) * 100)
        : 0;

      return {
        id: campaignId,
        name: item.name?.S || 'Untitled Campaign',
        templateName: item.templateName?.S || 'N/A',
        status: (item.status?.S as CampaignListItem['status']) || 'DRAFT',
        totalRecipients,
        sentCount,
        failedCount,
        pendingCount,
        progressPercentage,
        dailyCap: item.dailyCap?.N ? parseInt(item.dailyCap.N, 10) : undefined,
        createdAt: parseInt(item.createdAt?.N || '0', 10),
        startedAt: item.startedAt?.N ? parseInt(item.startedAt.N, 10) : undefined,
        completedAt: item.completedAt?.N ? parseInt(item.completedAt.N, 10) : undefined,
        pausedReason: item.pausedReason?.S
      };
    });

    // 4️⃣ Sort by most recent first
    campaigns.sort((a, b) => b.createdAt - a.createdAt);

    return NextResponse.json({
      success: true,
      campaigns,
      count: campaigns.length
    });

  } catch (error) {
    console.error('❌ List campaigns error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to list campaigns',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
