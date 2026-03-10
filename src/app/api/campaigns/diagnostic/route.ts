import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DescribeTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { validateAdminSession } from '@/lib/adminAuth';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Table configuration — must match dynamoClient.ts TABLES constants
const TABLE_CONFIG = {
  CAMPAIGNS: process.env.CAMPAIGNS_TABLE_NAME || 'streefi_campaigns',
  RECIPIENTS: process.env.RECIPIENTS_TABLE_NAME || 'streefi_campaign_recipients',
  WHATSAPP: process.env.DYNAMODB_TABLE_NAME || 'streefi_whatsapp',
  ADMINS: process.env.ADMIN_TABLE_NAME || 'streefi_admins',
  SESSIONS: process.env.SESSION_TABLE_NAME || 'streefi_sessions',
} as const;

/**
 * DynamoDB Tables Diagnostic Endpoint
 * Checks all tables exist and have correct schema
 * Access at: /api/campaigns/diagnostic
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await validateAdminSession(request, 'whatsapp-session');
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const diagnostics = {
      timestamp: new Date().toISOString(),
      region: process.env.AWS_REGION || 'not set',
      tables: [] as any[],
      allHealthy: true,
    };

    // List of tables to check
    const tablesToCheck = [
      { name: TABLE_CONFIG.CAMPAIGNS, expectedPK: 'PK', expectedSK: 'SK' },
      { name: TABLE_CONFIG.RECIPIENTS, expectedPK: 'PK', expectedSK: 'SK' },
      { name: TABLE_CONFIG.WHATSAPP, expectedPK: 'PK', expectedSK: 'SK' },
      { name: TABLE_CONFIG.ADMINS, expectedPK: 'email', expectedSK: null },
      { name: TABLE_CONFIG.SESSIONS, expectedPK: 'session_id', expectedSK: null },
    ];

    // First, get list of all tables
    let allTableNames: string[] = [];
    try {
      const listResult = await client.send(new ListTablesCommand({}));
      allTableNames = listResult.TableNames || [];
    } catch (error) {
      console.error('[Diagnostic] Failed to list tables:', error);
    }

    // Check each table
    for (const tableConfig of tablesToCheck) {
      const tableInfo: any = {
        name: tableConfig.name,
        exists: false,
        status: 'UNKNOWN',
        keySchema: [],
        pkMatches: false,
        skMatches: false,
        error: null,
      };

      try {
        // Check if table exists in list
        if (!allTableNames.includes(tableConfig.name)) {
          tableInfo.error = 'Table does not exist in region';
          tableInfo.exists = false;
          diagnostics.allHealthy = false;
        } else {
          // Describe table to get details
          const result = await client.send(
            new DescribeTableCommand({ TableName: tableConfig.name })
          );

          if (result.Table) {
            tableInfo.exists = true;
            tableInfo.status = result.Table.TableStatus || 'UNKNOWN';
            tableInfo.arn = result.Table.TableArn;
            tableInfo.itemCount = result.Table.ItemCount || 0;
            tableInfo.keySchema = result.Table.KeySchema || [];

            // Check PK
            const pkKey = tableInfo.keySchema.find((k: any) => k.KeyType === 'HASH');
            if (pkKey) {
              tableInfo.actualPK = pkKey.AttributeName;
              tableInfo.pkMatches = pkKey.AttributeName === tableConfig.expectedPK;
              
              if (!tableInfo.pkMatches) {
                tableInfo.error = `PK mismatch: expected ${tableConfig.expectedPK}, got ${pkKey.AttributeName}`;
                diagnostics.allHealthy = false;
              }
            } else {
              tableInfo.error = 'No partition key found';
              diagnostics.allHealthy = false;
            }

            // Check SK
            const skKey = tableInfo.keySchema.find((k: any) => k.KeyType === 'RANGE');
            if (tableConfig.expectedSK) {
              if (skKey) {
                tableInfo.actualSK = skKey.AttributeName;
                tableInfo.skMatches = skKey.AttributeName === tableConfig.expectedSK;
                
                if (!tableInfo.skMatches) {
                  tableInfo.error = `SK mismatch: expected ${tableConfig.expectedSK}, got ${skKey.AttributeName}`;
                  diagnostics.allHealthy = false;
                }
              } else {
                tableInfo.error = `Missing sort key: expected ${tableConfig.expectedSK}`;
                diagnostics.allHealthy = false;
              }
            } else {
              tableInfo.skMatches = !skKey; // Should not have SK
              if (skKey) {
                tableInfo.error = `Unexpected sort key: ${skKey.AttributeName}`;
              }
            }
          }
        }
      } catch (error: any) {
        tableInfo.error = error.message || String(error);
        tableInfo.exists = false;
        diagnostics.allHealthy = false;
      }

      diagnostics.tables.push(tableInfo);
    }

    return NextResponse.json(diagnostics, {
      status: diagnostics.allHealthy ? 200 : 503,
    });

  } catch (error) {
    console.error('[Diagnostic] Fatal error:', error);
    return NextResponse.json({
      error: 'Diagnostic failed',
    }, {
      status: 500,
    });
  }
}
