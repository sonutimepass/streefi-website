/**
 * Campaign Logs API
 * 
 * Fetches execution logs for observability and debugging.
 * Returns last 50 events sorted by timestamp (newest first).
 */

import { NextRequest, NextResponse } from 'next/server';
import { QueryCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';
import { validateAdminSession } from '@/lib/adminAuth';

interface LogEvent {
  timestamp: string;
  phone: string;
  status: 'SENT' | 'FAILED' | 'PROCESSING';
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
  metaResponse?: string;
  attempts?: number;
}

/**
 * GET /api/campaigns/[id]/logs
 * 
 * Fetch last 50 log events for a campaign
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

    // 2️⃣ Query logs from DynamoDB
    // Logs are stored as: PK=CAMPAIGN#${id}, SK=LOG#${timestamp}#${phone}
    const response = await dynamoClient.send(
      new QueryCommand({
        TableName: TABLES.CAMPAIGNS,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': { S: `CAMPAIGN#${campaignId}` },
          ':sk': { S: 'LOG#' }
        },
        ScanIndexForward: false, // Newest first
        Limit: 50
      })
    );

    // 3️⃣ Parse logs
    const logs: LogEvent[] = (response.Items || []).map(item => {
      const log: LogEvent = {
        timestamp: item.timestamp?.S || '',
        phone: item.phone?.S || '',
        status: (item.status?.S as LogEvent['status']) || 'PROCESSING',
        attempts: item.attempts?.N ? parseInt(item.attempts.N, 10) : undefined
      };

      if (item.messageId?.S) {
        log.messageId = item.messageId.S;
      }

      if (item.errorCode?.S) {
        log.errorCode = item.errorCode.S;
      }

      if (item.errorMessage?.S) {
        log.errorMessage = item.errorMessage.S;
      }

      if (item.metaResponse?.S) {
        log.metaResponse = item.metaResponse.S;
      }

      return log;
    });

    return NextResponse.json({
      success: true,
      campaignId,
      logs,
      count: logs.length
    });

  } catch (error) {
    console.error('[CampaignLogs] Error fetching logs:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
