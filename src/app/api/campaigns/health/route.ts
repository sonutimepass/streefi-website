import { NextRequest, NextResponse } from 'next/server';
import { campaignRepository } from '@/lib/repositories';
import { validateAdminSession } from '@/lib/adminAuth';

/**
 * Health check endpoint for campaign system
 * Tests DynamoDB connectivity via repository layer
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminSession(request, 'whatsapp-session');
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const checks = {
      dryRunMode: process.env.META_DRY_RUN === 'true',
      awsRegion: 'ap-south-1',
      tables: {
        campaigns: process.env.CAMPAIGNS_TABLE_NAME || 'streefi_campaigns',
        recipients: process.env.RECIPIENTS_TABLE_NAME || 'streefi_recipients',
      },
      dynamoConnection: false,
      repositoryHealth: false,
    };

    // Test DynamoDB connection via repository layer
    // This tests: repository layer, DynamoDB client, table access
    try {
      // Attempt to list campaigns (lightweight query via GSI1)
      await campaignRepository.listCampaigns();
      checks.dynamoConnection = true;
      checks.repositoryHealth = true;
    } catch (dbError) {
      console.error('[Health] Repository/DynamoDB connection error:', dbError);
      checks.dynamoConnection = false;
      checks.repositoryHealth = false;
    }

    const allHealthy = checks.dynamoConnection && checks.repositoryHealth;

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    }, {
      status: allHealthy ? 200 : 503
    });

  } catch (error) {
    console.error('[Health] Unexpected error:', error);
    return NextResponse.json({
      status: 'error',
      error: 'Health check failed',
      timestamp: new Date().toISOString(),
    }, {
      status: 500
    });
  }
}
