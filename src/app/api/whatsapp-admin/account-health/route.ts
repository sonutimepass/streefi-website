import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { DynamoDBClient, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

export const dynamic = 'force-dynamic';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

const WHATSAPP_TABLE = process.env.DYNAMODB_TABLE_NAME || 'streefi_whatsapp';
const CAMPAIGNS_TABLE = process.env.CAMPAIGNS_TABLE_NAME || 'streefi_campaigns';

/**
 * GET /api/whatsapp-admin/account-health
 * 
 * Returns WhatsApp Business Account health metrics:
 * - Phone number quality score
 * - Recent account alerts
 * - Template status counts
 * - Messaging statistics (24h, 7d)
 * - Block rate
 */
export async function GET(request: NextRequest) {
  try {
    // Validate admin session
    const auth = await validateAdminSession(request, 'whatsapp-session');
    if (!auth.valid) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[AccountHealthAPI] Fetching account health data...');

    // Get phone quality score (stored from phone_number_quality_update webhook)
    const phoneQualityData = await getPhoneQuality();

    // Get recent account alerts (stored from account_alerts webhook)
    const recentAlerts = await getRecentAlerts();

    // Get template status counts
    const templates = await getTemplateStats();

    // Get messaging statistics
    const messaging = await getMessagingStats();

    const healthData = {
      phoneQuality: phoneQualityData,
      recentAlerts,
      templates,
      messaging,
    };

    console.log('[AccountHealthAPI] Health data compiled:', JSON.stringify(healthData, null, 2));

    return NextResponse.json(healthData, { status: 200 });
  } catch (error) {
    console.error('[AccountHealthAPI] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch account health',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get phone number quality score from DynamoDB
 * Stored from phone_number_quality_update webhook
 */
async function getPhoneQuality() {
  try {
    const result = await client.send(
      new QueryCommand({
        TableName: WHATSAPP_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': { S: 'ACCOUNT#phone_quality' },
        },
        ScanIndexForward: false, // Most recent first
        Limit: 1,
      })
    );

    if (result.Items && result.Items.length > 0) {
      const item = result.Items[0];
      return {
        score: item.quality_score?.S || 'UNKNOWN',
        lastUpdated: item.updated_at?.S || null,
        displayPhoneNumber: item.display_phone_number?.S || process.env.META_PHONE_NUMBER_ID || 'N/A',
      };
    }

    // No data yet - return default
    return {
      score: 'UNKNOWN',
      lastUpdated: null,
      displayPhoneNumber: process.env.META_PHONE_NUMBER_ID || 'N/A',
    };
  } catch (error) {
    console.error('[getPhoneQuality] Error:', error);
    return {
      score: 'UNKNOWN',
      lastUpdated: null,
      displayPhoneNumber: process.env.META_PHONE_NUMBER_ID || 'N/A',
    };
  }
}

/**
 * Get recent account alerts from DynamoDB
 * Stored from account_alerts webhook
 */
async function getRecentAlerts() {
  try {
    const result = await client.send(
      new QueryCommand({
        TableName: WHATSAPP_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': { S: 'ACCOUNT#alerts' },
        },
        ScanIndexForward: false, // Most recent first
        Limit: 10,
      })
    );

    if (result.Items && result.Items.length > 0) {
      return result.Items.map((item: Record<string, any>) => ({
        id: item.SK?.S || item.alert_id?.S || 'unknown',
        timestamp: item.timestamp?.S || item.created_at?.S || new Date().toISOString(),
        severity: item.alert_severity?.S || 'UNKNOWN',
        type: item.alert_type?.S || 'UNKNOWN',
        description: item.alert_description?.S || 'No description available',
        status: item.alert_status?.S || 'ACTIVE',
      }));
    }

    return [];
  } catch (error) {
    console.error('[getRecentAlerts] Error:', error);
    return [];
  }
}

/**
 * Get template status counts from DynamoDB
 * Templates are stored with PK=TEMPLATE#{template_id}
 */
async function getTemplateStats() {
  try {
    const result = await client.send(
      new ScanCommand({
        TableName: WHATSAPP_TABLE,
        FilterExpression: 'begins_with(PK, :pk)',
        ExpressionAttributeValues: {
          ':pk': { S: 'TEMPLATE#' },
        },
      })
    );

    const stats = {
      approved: 0,
      pending: 0,
      rejected: 0,
      paused: 0,
    };

    if (result.Items) {
      result.Items.forEach((item: Record<string, any>) => {
        const status = (item.status?.S || '').toUpperCase();
        if (status === 'APPROVED') stats.approved++;
        else if (status === 'PENDING') stats.pending++;
        else if (status === 'REJECTED') stats.rejected++;
        else if (status === 'PAUSED') stats.paused++;
      });
    }

    return stats;
  } catch (error) {
    console.error('[getTemplateStats] Error:', error);
    return {
      approved: 0,
      pending: 0,
      rejected: 0,
      paused: 0,
    };
  }
}

/**
 * Get messaging statistics
 * - Messages sent in last 24 hours
 * - Messages sent in last 7 days
 * - Block rate (from message_status webhooks)
 */
async function getMessagingStats() {
  try {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Query campaigns for recent message counts
    const result = await client.send(
      new ScanCommand({
        TableName: CAMPAIGNS_TABLE,
        FilterExpression: 'attribute_exists(sent_count) AND attribute_exists(started_at)',
      })
    );

    let last24Hours = 0;
    let last7Days = 0;
    let totalBlocked = 0;
    let totalSent = 0;

    if (result.Items) {
      result.Items.forEach((item: Record<string, any>) => {
        const startedAtStr = item.started_at?.S;
        const startedAt = startedAtStr ? new Date(startedAtStr).getTime() : 0;
        const sentCount = parseInt(item.sent_count?.N || '0', 10);
        const blockedCount = parseInt(item.blocked_count?.N || '0', 10);

        if (startedAt >= oneDayAgo) {
          last24Hours += sentCount;
        }
        if (startedAt >= sevenDaysAgo) {
          last7Days += sentCount;
        }

        totalSent += sentCount;
        totalBlocked += blockedCount;
      });
    }

    const blockRate = totalSent > 0 ? (totalBlocked / totalSent) * 100 : 0;

    return {
      last24Hours,
      last7Days,
      blockRate: Math.round(blockRate * 100) / 100, // Round to 2 decimals
    };
  } catch (error) {
    console.error('[getMessagingStats] Error:', error);
    return {
      last24Hours: 0,
      last7Days: 0,
      blockRate: 0,
    };
  }
}
