/**
 * Emergency Kill Switch API
 * 
 * System-wide control to disable ALL WhatsApp sending immediately.
 * Critical for compliance emergencies (Meta flags, violations, etc.)
 * 
 * GET  /api/whatsapp-admin/kill-switch - Get current status
 * POST /api/whatsapp-admin/kill-switch - Toggle kill switch
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient } from '@/lib/dynamoClient';
import { validateAdminSession } from '@/lib/adminAuth';

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'streefi_whatsapp';

interface KillSwitchStatus {
  enabled: boolean;
  reason?: string;
  enabledBy?: string;
  enabledAt?: string;
  disabledBy?: string;
  disabledAt?: string;
}

/**
 * GET - Get current kill switch status
 */
export async function GET(req: NextRequest) {
  try {
    // Validate admin session
    const auth = await validateAdminSession(req, 'whatsapp-session');
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get kill switch status from DynamoDB
    const response = await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: 'SYSTEM' },
          SK: { S: 'KILL_SWITCH' }
        }
      })
    );

    if (!response.Item) {
      // No record = kill switch disabled (safe default)
      return NextResponse.json({
        killSwitch: {
          enabled: false
        }
      });
    }

    const killSwitch: KillSwitchStatus = {
      enabled: response.Item.enabled?.BOOL ?? false,
      reason: response.Item.reason?.S,
      enabledBy: response.Item.enabledBy?.S,
      enabledAt: response.Item.enabledAt?.S,
      disabledBy: response.Item.disabledBy?.S,
      disabledAt: response.Item.disabledAt?.S
    };

    return NextResponse.json({ killSwitch });

  } catch (error) {
    console.error('❌ Kill switch GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get kill switch status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Toggle kill switch (enable/disable)
 * Body: { action: 'enable' | 'disable', reason?: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Validate admin session
    const auth = await validateAdminSession(req, 'whatsapp-session');
    if (!auth.valid || !auth.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, reason } = body;

    if (!action || (action !== 'enable' && action !== 'disable')) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "enable" or "disable"' },
        { status: 400 }
      );
    }

    const enabled = action === 'enable';
    const timestamp = new Date().toISOString();
    const adminEmail = auth.session.email;

    // Build item
    const item: any = {
      PK: { S: 'SYSTEM' },
      SK: { S: 'KILL_SWITCH' },
      enabled: { BOOL: enabled },
      updatedAt: { S: timestamp }
    };

    if (enabled) {
      item.enabledBy = { S: adminEmail };
      item.enabledAt = { S: timestamp };
      if (reason) {
        item.reason = { S: reason };
      }
    } else {
      item.disabledBy = { S: adminEmail };
      item.disabledAt = { S: timestamp };
      // Clear reason when disabled
      item.reason = { S: '' };
    }

    // Save to DynamoDB
    await dynamoClient.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: item
      })
    );

    console.log(`🛑 Kill switch ${action}d by ${adminEmail}`);

    return NextResponse.json({
      success: true,
      killSwitch: {
        enabled,
        reason: enabled ? reason : undefined,
        [`${action}dBy`]: adminEmail,
        [`${action}dAt`]: timestamp
      }
    });

  } catch (error) {
    console.error('❌ Kill switch POST error:', error);
    return NextResponse.json(
      { error: 'Failed to toggle kill switch' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to check kill switch status (for use in other APIs)
 * Returns true if sending is DISABLED
 */
export async function isKillSwitchEnabled(): Promise<{ enabled: boolean; reason?: string }> {
  try {
    const response = await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: 'SYSTEM' },
          SK: { S: 'KILL_SWITCH' }
        }
      })
    );

    if (!response.Item) {
      return { enabled: false };
    }

    return {
      enabled: response.Item.enabled?.BOOL ?? false,
      reason: response.Item.reason?.S
    };
  } catch (error) {
    console.error('❌ Kill switch check error:', error);
    // Fail-safe: If we can't check, assume it's enabled (stop sending)
    return { enabled: true, reason: 'System error - fail-safe activated' };
  }
}
