/**
 * Campaign Recipient Reconciliation - DB Failure Recovery
 * 
 * Finds recipients stuck in PROCESSING status (likely due to DB write failures)
 * and marks them as FAILED so they can be retried.
 * 
 * USE CASES:
 * - Message sent successfully but status update failed
 * - Process crashed after send but before status write
 * - Network timeout during status update
 * 
 * SAFETY:
 * ✅ Only touches PROCESSING recipients older than 5 minutes
 * ✅ Idempotent (safe to run multiple times)
 * ✅ Can be triggered manually or via cron
 * ✅ Scans all campaigns (not just one)
 * 
 * TRIGGER OPTIONS:
 * - Manual (admin panel or API call)
 * - Cron (AWS EventBridge every 5-10 minutes)
 * - Before batch execution (health check pattern)
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  ScanCommand, 
  UpdateItemCommand,
  type AttributeValue
} from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';
import { validateAdminSession } from '@/lib/adminAuth';

const STUCK_THRESHOLD_SECONDS = 5 * 60; // 5 minutes
const ERROR_CODE = 'DB_WRITE_TIMEOUT';
const ERROR_MESSAGE = 'Recipient stuck in PROCESSING - recovered by reconciliation';

interface ReconciliationResult {
  scanned: number;
  recovered: number;
  recipients: Array<{
    campaignId: string;
    phone: string;
    processingAt: number;
    stuckDuration: number;
  }>;
}

/**
 * POST /api/campaigns/reconcile
 * 
 * Scans for stuck recipients and recovers them
 */
export async function POST(req: NextRequest) {
  console.log('🔧 [Reconcile API] Starting recipient reconciliation');
  
  try {
    // 1️⃣ Validate admin session
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      console.log('❌ [Reconcile API] Unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const stuckThreshold = now - STUCK_THRESHOLD_SECONDS;

    // 2️⃣ Scan for PROCESSING recipients older than threshold
    console.log(`🔍 [Reconcile API] Scanning for recipients stuck longer than ${STUCK_THRESHOLD_SECONDS}s`);
    
    const scanResponse = await dynamoClient.send(
      new ScanCommand({
        TableName: TABLES.RECIPIENTS,
        FilterExpression: '#status = :processing AND processingAt < :threshold',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':processing': { S: 'PROCESSING' },
          ':threshold': { N: stuckThreshold.toString() }
        }
      })
    );

    const stuckRecipients = scanResponse.Items || [];
    console.log(`📊 [Reconcile API] Found ${stuckRecipients.length} stuck recipients`);

    if (stuckRecipients.length === 0) {
      console.log('✅ [Reconcile API] No stuck recipients found');
      return NextResponse.json({
        success: true,
        scanned: scanResponse.ScannedCount || 0,
        recovered: 0,
        recipients: []
      });
    }

    // 3️⃣ Recover each stuck recipient
    const recoveredRecipients: ReconciliationResult['recipients'] = [];
    let recoveredCount = 0;

    for (const item of stuckRecipients) {
      const pk = item.PK?.S;
      const sk = item.SK?.S;
      const phone = item.phone?.S;
      const processingAt = parseInt(item.processingAt?.N || '0', 10);

      if (!pk || !sk || !phone) {
        console.log('⚠️ [Reconcile API] Skipping malformed recipient:', { pk, sk, phone });
        continue;
      }

      // Extract campaignId from PK (format: CAMPAIGN#${id})
      const campaignId = pk.replace('CAMPAIGN#', '');
      const stuckDuration = now - processingAt;

      try {
        console.log(`🔄 [Reconcile API] Recovering ${phone} from campaign ${campaignId} (stuck for ${stuckDuration}s)`);
        
        await dynamoClient.send(
          new UpdateItemCommand({
            TableName: TABLES.RECIPIENTS,
            Key: {
              PK: { S: pk },
              SK: { S: sk }
            },
            UpdateExpression: 'SET #status = :failed, failedAt = :timestamp, errorCode = :code, errorMessage = :message ADD attempts :inc',
            ExpressionAttributeNames: {
              '#status': 'status'
            },
            ExpressionAttributeValues: {
              ':failed': { S: 'FAILED' },
              ':timestamp': { N: now.toString() },
              ':code': { S: ERROR_CODE },
              ':message': { S: ERROR_MESSAGE },
              ':inc': { N: '1' }
            }
          })
        );

        recoveredCount++;
        recoveredRecipients.push({
          campaignId,
          phone,
          processingAt,
          stuckDuration
        });

        console.log(`✅ [Reconcile API] Recovered ${phone}`);
      } catch (err) {
        console.error(`❌ [Reconcile API] Failed to recover ${phone}:`, err);
      }
    }

    console.log(`🎉 [Reconcile API] Reconciliation complete: ${recoveredCount}/${stuckRecipients.length} recovered`);

    return NextResponse.json({
      success: true,
      scanned: scanResponse.ScannedCount || 0,
      recovered: recoveredCount,
      recipients: recoveredRecipients
    });

  } catch (error) {
    console.error('❌ [Reconcile API] Reconciliation failed:', error);
    return NextResponse.json(
      { 
        error: 'Reconciliation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/campaigns/reconcile
 * 
 * Check for stuck recipients without recovering them (dry-run)
 */
export async function GET(req: NextRequest) {
  console.log('🔍 [Reconcile API] Checking for stuck recipients (dry-run)');
  
  try {
    // 1️⃣ Validate admin session
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = Math.floor(Date.now() / 1000);
    const stuckThreshold = now - STUCK_THRESHOLD_SECONDS;

    // 2️⃣ Scan for PROCESSING recipients
    const scanResponse = await dynamoClient.send(
      new ScanCommand({
        TableName: TABLES.RECIPIENTS,
        FilterExpression: '#status = :processing AND processingAt < :threshold',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':processing': { S: 'PROCESSING' },
          ':threshold': { N: stuckThreshold.toString() }
        }
      })
    );

    const stuckRecipients = (scanResponse.Items || []).map(item => {
      const pk = item.PK?.S || '';
      const campaignId = pk.replace('CAMPAIGN#', '');
      const processingAt = parseInt(item.processingAt?.N || '0', 10);
      
      return {
        campaignId,
        phone: item.phone?.S || '',
        processingAt,
        stuckDuration: now - processingAt
      };
    });

    console.log(`📊 [Reconcile API] Found ${stuckRecipients.length} stuck recipients (dry-run)`);

    return NextResponse.json({
      success: true,
      count: stuckRecipients.length,
      threshold: STUCK_THRESHOLD_SECONDS,
      recipients: stuckRecipients
    });

  } catch (error) {
    console.error('❌ [Reconcile API] Check failed:', error);
    return NextResponse.json(
      { 
        error: 'Check failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
