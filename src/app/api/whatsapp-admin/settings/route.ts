/**
 * System Settings API
 * 
 * Global WhatsApp system configuration:
 * - Rate limits (messages per second)
 * - Default daily caps
 * - System-wide controls
 * 
 * GET  /api/whatsapp-admin/settings - Get current settings
 * PUT  /api/whatsapp-admin/settings - Update settings (admin only)
 */

import { NextRequest, NextResponse } from 'next/server';
import { GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient } from '@/lib/dynamoClient';
import { validateAdminSession } from '@/lib/adminAuth';

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'streefi_whatsapp';

interface SystemSettings {
  maxMessagesPerSecond: number;       // Rate limit (e.g., 20)
  defaultDailyCap: number;            // Default cap for new campaigns (e.g., 200)
  metaTierLimit: number;              // Meta API tier limit (e.g., 250)
  safetyBuffer: number;               // Safety buffer % (e.g., 80 = 80%)
  updatedBy?: string;
  updatedAt?: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  maxMessagesPerSecond: 20,           // Meta allows ~20 msg/sec
  defaultDailyCap: 200,               // 80% of 250 tier limit
  metaTierLimit: 250,                 // Meta Tier 250
  safetyBuffer: 80                    // 80% safety buffer
};

/**
 * GET - Get current system settings
 */
export async function GET(req: NextRequest) {
  try {
    // Validate admin session
    const auth = await validateAdminSession(req, 'whatsapp-session');
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get settings from DynamoDB
    const response = await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: 'SYSTEM' },
          SK: { S: 'SETTINGS' }
        }
      })
    );

    if (!response.Item) {
      // Return defaults if no settings exist
      return NextResponse.json({ settings: DEFAULT_SETTINGS });
    }

    const settings: SystemSettings = {
      maxMessagesPerSecond: parseInt(response.Item.maxMessagesPerSecond?.N || '20', 10),
      defaultDailyCap: parseInt(response.Item.defaultDailyCap?.N || '200', 10),
      metaTierLimit: parseInt(response.Item.metaTierLimit?.N || '250', 10),
      safetyBuffer: parseInt(response.Item.safetyBuffer?.N || '80', 10),
      updatedBy: response.Item.updatedBy?.S,
      updatedAt: response.Item.updatedAt?.S
    };

    return NextResponse.json({ settings });

  } catch (error) {
    console.error('❌ Settings GET error:', error);
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update system settings
 * Body: Partial<SystemSettings>
 */
export async function PUT(req: NextRequest) {
  try {
    // Validate admin session
    const auth = await validateAdminSession(req, 'whatsapp-session');
    if (!auth.valid || !auth.session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Validate settings
    if (body.maxMessagesPerSecond !== undefined) {
      const rate = parseInt(body.maxMessagesPerSecond, 10);
      if (isNaN(rate) || rate < 1 || rate > 50) {
        return NextResponse.json(
          { error: 'maxMessagesPerSecond must be between 1 and 50' },
          { status: 400 }
        );
      }
    }

    if (body.defaultDailyCap !== undefined) {
      const cap = parseInt(body.defaultDailyCap, 10);
      if (isNaN(cap) || cap < 1 || cap > 10000) {
        return NextResponse.json(
          { error: 'defaultDailyCap must be between 1 and 10000' },
          { status: 400 }
        );
      }
    }

    if (body.metaTierLimit !== undefined) {
      const limit = parseInt(body.metaTierLimit, 10);
      if (isNaN(limit) || limit < 1) {
        return NextResponse.json(
          { error: 'metaTierLimit must be positive' },
          { status: 400 }
        );
      }
    }

    if (body.safetyBuffer !== undefined) {
      const buffer = parseInt(body.safetyBuffer, 10);
      if (isNaN(buffer) || buffer < 1 || buffer > 100) {
        return NextResponse.json(
          { error: 'safetyBuffer must be between 1 and 100' },
          { status: 400 }
        );
      }
    }

    // Get current settings
    const currentResponse = await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: 'SYSTEM' },
          SK: { S: 'SETTINGS' }
        }
      })
    );

    // Merge with updates
    const current = currentResponse.Item ? {
      maxMessagesPerSecond: parseInt(currentResponse.Item.maxMessagesPerSecond?.N || '20', 10),
      defaultDailyCap: parseInt(currentResponse.Item.defaultDailyCap?.N || '200', 10),
      metaTierLimit: parseInt(currentResponse.Item.metaTierLimit?.N || '250', 10),
      safetyBuffer: parseInt(currentResponse.Item.safetyBuffer?.N || '80', 10)
    } : DEFAULT_SETTINGS;

    const updated: SystemSettings = {
      maxMessagesPerSecond: body.maxMessagesPerSecond ?? current.maxMessagesPerSecond,
      defaultDailyCap: body.defaultDailyCap ?? current.defaultDailyCap,
      metaTierLimit: body.metaTierLimit ?? current.metaTierLimit,
      safetyBuffer: body.safetyBuffer ?? current.safetyBuffer,
      updatedBy: auth.session.email,
      updatedAt: new Date().toISOString()
    };

    // Save to DynamoDB
    await dynamoClient.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: { S: 'SYSTEM' },
          SK: { S: 'SETTINGS' },
          maxMessagesPerSecond: { N: updated.maxMessagesPerSecond.toString() },
          defaultDailyCap: { N: updated.defaultDailyCap.toString() },
          metaTierLimit: { N: updated.metaTierLimit.toString() },
          safetyBuffer: { N: updated.safetyBuffer.toString() },
          updatedBy: { S: updated.updatedBy! },
          updatedAt: { S: updated.updatedAt! }
        }
      })
    );

    console.log(`⚙️ Settings updated by ${auth.session.email}:`, updated);

    return NextResponse.json({
      success: true,
      settings: updated
    });

  } catch (error) {
    console.error('❌ Settings PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to get system settings (for use in other APIs)
 */
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const response = await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: 'SYSTEM' },
          SK: { S: 'SETTINGS' }
        }
      })
    );

    if (!response.Item) {
      return DEFAULT_SETTINGS;
    }

    return {
      maxMessagesPerSecond: parseInt(response.Item.maxMessagesPerSecond?.N || '20', 10),
      defaultDailyCap: parseInt(response.Item.defaultDailyCap?.N || '200', 10),
      metaTierLimit: parseInt(response.Item.metaTierLimit?.N || '250', 10),
      safetyBuffer: parseInt(response.Item.safetyBuffer?.N || '80', 10),
      updatedBy: response.Item.updatedBy?.S,
      updatedAt: response.Item.updatedAt?.S
    };
  } catch (error) {
    console.error('❌ Get settings error:', error);
    return DEFAULT_SETTINGS;
  }
}
