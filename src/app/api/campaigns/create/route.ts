import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { PutItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';
import { validateAdminSession } from '@/lib/adminAuth';

// Supported campaign channels
type CampaignChannel = 'WHATSAPP' | 'EMAIL';

// Supported audience types
type AudienceType = 'FIREBASE' | 'MONGODB' | 'CSV' | 'MIXED';

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Validate Admin Session (WhatsApp admin for now, can be expanded)
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { name, templateName, channel, audienceType } = body;

    // 2️⃣ Validate Required Fields
    if (!name || !templateName || !channel || !audienceType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, templateName, channel, audienceType' },
        { status: 400 }
      );
    }

    // 3️⃣ Validate Channel Type
    if (channel !== 'WHATSAPP' && channel !== 'EMAIL') {
      return NextResponse.json(
        { error: 'Invalid channel. Must be WHATSAPP or EMAIL' },
        { status: 400 }
      );
    }

    // 4️⃣ Validate Audience Type
    const validAudienceTypes: AudienceType[] = ['FIREBASE', 'MONGODB', 'CSV', 'MIXED'];
    if (!validAudienceTypes.includes(audienceType as AudienceType)) {
      return NextResponse.json(
        { error: 'Invalid audienceType. Must be FIREBASE, MONGODB, CSV, or MIXED' },
        { status: 400 }
      );
    }

    // 5️⃣ Generate Campaign ID and Timestamp
    const campaignId = `cmp_${randomUUID()}`;
    const timestamp = Math.floor(Date.now() / 1000);

    // 6️⃣ Create Campaign Item (DynamoDB Format)
    const campaignItem = {
      PK: { S: `CAMPAIGN#${campaignId}` },
      SK: { S: 'METADATA' },
      name: { S: name },
      templateName: { S: templateName },
      channel: { S: channel },
      createdBy: { S: validation.session.email },
      status: { S: 'DRAFT' },
      audienceType: { S: audienceType },
      totalRecipients: { N: '0' },
      sentCount: { N: '0' },
      failedCount: { N: '0' },
      createdAt: { N: timestamp.toString() },
      updatedAt: { N: timestamp.toString() }
    };

    // 7️⃣ Insert into DynamoDB
    await dynamoClient.send(
      new PutItemCommand({
        TableName: TABLES.CAMPAIGNS,
        Item: campaignItem
      })
    );

    // 8️⃣ Return Success Response
    return NextResponse.json({
      success: true,
      campaignId,
      message: 'Campaign created successfully. Use populate endpoint to add recipients.'
    });

  } catch (error) {
    console.error('Campaign creation error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
