import { NextResponse } from 'next/server';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';
import { ListTablesCommand } from '@aws-sdk/client-dynamodb';

/**
 * Health check endpoint for campaign system
 * Tests DynamoDB connectivity and table existence
 */
export async function GET() {
  try {
    const checks = {
      dryRunMode: process.env.META_DRY_RUN === 'true',
      awsRegion: process.env.AWS_REGION || 'not set',
      tables: {
        campaigns: process.env.CAMPAIGNS_TABLE_NAME || TABLES.CAMPAIGNS,
        recipients: process.env.RECIPIENTS_TABLE_NAME || TABLES.RECIPIENTS,
      },
      dynamoConnection: false,
      tablesExist: {} as Record<string, boolean>,
    };

    // Test DynamoDB connection
    try {
      const listResult = await dynamoClient.send(new ListTablesCommand({}));
      checks.dynamoConnection = true;
      
      // Check if our tables exist
      const tableNames = listResult.TableNames || [];
      checks.tablesExist.campaigns = tableNames.includes(checks.tables.campaigns);
      checks.tablesExist.recipients = tableNames.includes(checks.tables.recipients);
    } catch (dbError) {
      console.error('[Health] DynamoDB connection error:', dbError);
      checks.dynamoConnection = false;
    }

    const allHealthy = checks.dynamoConnection && 
                       checks.tablesExist.campaigns && 
                       checks.tablesExist.recipients;

    return NextResponse.json({
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString(),
    }, {
      status: allHealthy ? 200 : 503
    });

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, {
      status: 500
    });
  }
}
