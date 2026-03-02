/**
 * Retry Failed Recipients API Endpoint
 * 
 * Resets all FAILED recipients back to PENDING status
 * so they can be retried in the next batch execution.
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  QueryCommand, 
  UpdateItemCommand,
  type AttributeValue
} from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';
import { validateAdminSession } from '@/lib/adminAuth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🚀 [Retry Failed API] Request received');
  try {
    // 1️⃣ Validate admin session
    console.log('🔐 [Retry Failed API] Validating admin session...');
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const campaignId = params.id;
    console.log('📦 [Retry Failed API] Campaign ID:', campaignId);

    // 2️⃣ Query all FAILED recipients
    console.log('🔍 [Retry Failed API] Querying failed recipients...');
    const queryResponse = await dynamoClient.send(
      new QueryCommand({
        TableName: TABLES.RECIPIENTS,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
        FilterExpression: '#status = :failed',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':pk': { S: `CAMPAIGN#${campaignId}` },
          ':skPrefix': { S: 'RECIPIENT#' },
          ':failed': { S: 'FAILED' }
        }
      })
    );

    const failedRecipients = queryResponse.Items || [];
    console.log(`📊 [Retry Failed API] Found ${failedRecipients.length} failed recipients`);

    if (failedRecipients.length === 0) {
      console.log('✅ [Retry Failed API] No failed recipients to retry');
      return NextResponse.json({
        success: true,
        retriedCount: 0,
        message: 'No failed recipients to retry'
      });
    }

    // 3️⃣ Update each failed recipient back to PENDING
    console.log('🔄 [Retry Failed API] Resetting recipients to PENDING...');
    let retriedCount = 0;
    for (const item of failedRecipients) {
      const phone = item.phone?.S;
      if (!phone) continue;

      try {
        await dynamoClient.send(
          new UpdateItemCommand({
            TableName: TABLES.RECIPIENTS,
            Key: {
              PK: { S: `CAMPAIGN#${campaignId}` },
              SK: { S: `RECIPIENT#${phone}` }
            },
            UpdateExpression: 'SET #status = :pending, attempts = :zero REMOVE errorCode, errorMessage, messageId',
            ExpressionAttributeNames: {
              '#status': 'status'
            },
            ExpressionAttributeValues: {
              ':pending': { S: 'PENDING' },
              ':zero': { N: '0' }
            }
          })
        );
        retriedCount++;
        console.log(`✅ [Retry Failed API] Reset ${phone} to PENDING`);
      } catch (err) {
        console.error(`❌ [Retry Failed API] Failed to reset recipient ${phone}:`, err);
      }
    }

    // 4️⃣ Update campaign metrics (reset failedCount, increase pendingCount)
    console.log('💾 [Retry Failed API] Updating campaign metrics...');
    await dynamoClient.send(
      new UpdateItemCommand({
        TableName: TABLES.CAMPAIGNS,
        Key: {
          PK: { S: `CAMPAIGN#${campaignId}` },
          SK: { S: 'METADATA' }
        },
        UpdateExpression: 'ADD failedCount :negRetried, pendingCount :posRetried',
        ExpressionAttributeValues: {
          ':negRetried': { N: (-retriedCount).toString() },
          ':posRetried': { N: retriedCount.toString() }
        }
      })
    );    console.log(`✅ [Retry Failed API] Successfully retried ${retriedCount} recipient(s)`);
    return NextResponse.json({
      success: true,
      retriedCount,
      message: `Successfully reset ${retriedCount} failed recipient(s) to PENDING`
    });

  } catch (error) {
    console.error('❌ [Retry Failed API] Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
