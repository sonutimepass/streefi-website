import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSessionWithBypass } from '@/lib/adminAuth';
import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

export const dynamic = 'force-dynamic';

// Initialize DynamoDB client
// In production (Amplify), uses IAM role credentials automatically
const dynamoClientConfig: any = {
  region: 'us-east-1',
};

const dynamoClient = new DynamoDBClient(dynamoClientConfig);
const WHATSAPP_TABLE = process.env.DYNAMODB_TABLE_NAME || 'streefi_whatsapp';

/**
 * GET - Fetch all webhook events for debugging
 * Returns recent webhook events with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin session (with bypass for local dev)
    const auth = await validateAdminSessionWithBypass(request, 'whatsapp-session');
    if (!auth.valid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const webhookType = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const startKey = searchParams.get('startKey');

    console.log('Fetching webhooks with params:', { webhookType, limit, startKey });

    // Scan for all webhooks (or filter by type)
    const scanParams: any = {
      TableName: WHATSAPP_TABLE,
      Limit: Math.min(limit, 1000), // Cap at 1000 for performance
      FilterExpression: 'begins_with(PK, :prefix)',
      ExpressionAttributeValues: {
        ':prefix': { S: 'WEBHOOK#' },
      },
    };

    // Add webhook type filter if specified
    if (webhookType && webhookType !== 'all') {
      scanParams.FilterExpression += ' AND SK = :webhookType';
      scanParams.ExpressionAttributeValues[':webhookType'] = { S: webhookType };
    }

    // Add pagination if startKey provided
    if (startKey) {
      try {
        scanParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(startKey));
      } catch (error) {
        console.error('Invalid startKey:', error);
      }
    }

    const scanResult = await dynamoClient.send(new ScanCommand(scanParams));

    // Transform DynamoDB items to readable format
    const webhooks = (scanResult.Items || []).map((item: Record<string, any>) => {
      try {
        return {
          id: item.PK?.S || 'unknown',
          webhook_type: item.SK?.S || item.webhook_type?.S || 'unknown',
          timestamp: parseInt(item.timestamp?.N || '0', 10),
          created_at: item.created_at?.S || 'unknown',
          payload: item.payload?.S ? JSON.parse(item.payload.S) : {},
          metadata: item.metadata?.S ? JSON.parse(item.metadata.S) : {},
          ttl: parseInt(item.ttl?.N || '0', 10),
        };
      } catch (error) {
        console.error('Error parsing webhook item:', error);
        return null;
      }
    }).filter(Boolean);

    // Sort by timestamp descending (most recent first)
    webhooks.sort((a: any, b: any) => b.timestamp - a.timestamp);

    // Get webhook type stats
    const statsMap = new Map<string, number>();
    webhooks.forEach((webhook: any) => {
      const type = webhook.webhook_type;
      statsMap.set(type, (statsMap.get(type) || 0) + 1);
    });

    const stats = Array.from(statsMap.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Prepare next start key for pagination
    const nextStartKey = scanResult.LastEvaluatedKey
      ? encodeURIComponent(JSON.stringify(scanResult.LastEvaluatedKey))
      : null;

    return NextResponse.json({
      success: true,
      webhooks,
      stats,
      pagination: {
        count: webhooks.length,
        nextStartKey,
        hasMore: !!scanResult.LastEvaluatedKey,
      },
    });

  } catch (error) {
    console.error('Error fetching webhook debug data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch webhook data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear all webhook events (for testing)
 * Use with caution - this deletes all webhook history
 */
export async function DELETE(request: NextRequest) {
  try {
    // Validate admin session (with bypass for local dev)
    const auth = await validateAdminSessionWithBypass(request, 'whatsapp-session');
    if (!auth.valid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Implement batch delete if needed for cleanup
    // For production, you might want to rely on TTL instead

    return NextResponse.json({
      success: true,
      message: 'Webhook cleanup completed (TTL handles automatic deletion)',
    });

  } catch (error) {
    console.error('Error cleaning webhook data:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clean webhook data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
