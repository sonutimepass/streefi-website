import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { PutItemCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';
import { validateAdminSession } from '@/lib/adminAuth';
import { validateAudienceQuality, getAudienceQualityRecommendation } from '@/lib/whatsapp/audienceQualityValidator';

// Supported campaign channels
type CampaignChannel = 'WHATSAPP' | 'EMAIL';

// Supported audience types
type AudienceType = 'FIREBASE' | 'MONGODB' | 'CSV' | 'MIXED';

export async function POST(req: NextRequest) {
  console.log('🚀 [Campaign Create API] Request received');
  try {
    // 1️⃣ Validate Admin Session (WhatsApp admin for now, can be expanded)
    console.log('🔐 [Campaign Create API] Validating admin session...');
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await req.json();
    console.log('📦 [Campaign Create API] Request body:', JSON.stringify(body, null, 2));
    const { 
      campaignName, 
      templateName,      // Legacy: single template
      templates,         // New: multiple templates for rotation
      templateWeights,   // Optional: weights for templates
      templateStrategy,  // Optional: 'random', 'weighted', 'round-robin'
      recipients,
      dailyCap,
      channel = 'WHATSAPP', 
      audienceType = 'CSV' 
    } = body;
    
    // Normalize template config (support both legacy and new format)
    let finalTemplates: string[];
    let finalTemplateWeights: number[] | undefined;
    let finalTemplateStrategy: 'random' | 'weighted' | 'round-robin' = 'weighted';
    
    if (templates && Array.isArray(templates) && templates.length > 0) {
      // New format: template rotation
      finalTemplates = templates;
      finalTemplateWeights = templateWeights;
      finalTemplateStrategy = templateStrategy || 'weighted';
      console.log(`📋 [Campaign Create API] Template rotation enabled: ${finalTemplates.length} templates`);
    } else if (templateName) {
      // Legacy format: single template
      finalTemplates = [templateName];
      console.log(`📋 [Campaign Create API] Legacy single template: ${templateName}`);
    } else {
      return NextResponse.json(
        { error: 'Missing required field: templateName or templates array' },
        { status: 400 }
      );
    }
    
    console.log(`📋 [Campaign Create API] Config - Name: ${campaignName}, Templates: [${finalTemplates.join(', ')}], Recipients: ${recipients?.length}, DailyCap: ${dailyCap}`);

    // 2️⃣ Validate Required Fields
    if (!campaignName) {
      return NextResponse.json(
        { error: 'Missing required field: campaignName' },
        { status: 400 }
      );
    }
    
    // Validate templates
    if (finalTemplates.some(t => !t || t.trim() === '')) {
      return NextResponse.json(
        { error: 'Templates array contains empty values' },
        { status: 400 }
      );
    }
    
    // Validate template weights if provided
    if (finalTemplateWeights) {
      if (finalTemplateWeights.length !== finalTemplates.length) {
        return NextResponse.json(
          { error: `Template weights array (${finalTemplateWeights.length}) must match templates array (${finalTemplates.length})` },
          { status: 400 }
        );
      }
      if (finalTemplateWeights.some(w => w < 0)) {
        return NextResponse.json(
          { error: 'Template weights must be non-negative' },
          { status: 400 }
        );
      }
      if (finalTemplateWeights.every(w => w === 0)) {
        return NextResponse.json(
          { error: 'At least one template weight must be greater than 0' },
          { status: 400 }
        );
      }
    }

    // 2.5 Validate recipients array
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Recipients array is required and must not be empty' },
        { status: 400 }
      );
    }

    // 🛡️ CRITICAL: Audience Quality Validation (Pre-send filtering)
    // This prevents bad lists from destroying sender reputation
    console.log('🔍 [Campaign Create API] Validating audience quality...');
    const audienceValidation = validateAudienceQuality(recipients, {
      maxDuplicateRate: 0.05,    // 5% max duplicates
      maxInvalidRate: 0.10,       // 10% max invalid
      minListSize: 10,            // Minimum 10 recipients for production
      maxListSize: 1000           // Enforce gradual ramp
    });
    
    console.log('📊 [Campaign Create API] Audience stats:', JSON.stringify(audienceValidation.stats, null, 2));
    
    if (!audienceValidation.valid) {
      console.error('❌ [Campaign Create API] Audience validation failed');
      console.error('❌ [Campaign Create API] Errors:', audienceValidation.errors);
      
      return NextResponse.json(
        { 
          error: 'Audience quality validation failed',
          details: audienceValidation.errors,
          stats: audienceValidation.stats,
          recommendation: getAudienceQualityRecommendation(audienceValidation)
        },
        { status: 400 }
      );
    }
    
    if (audienceValidation.warnings.length > 0) {
      console.warn('⚠️ [Campaign Create API] Audience quality warnings:', audienceValidation.warnings);
    }
    
    console.log('✅ [Campaign Create API] Audience quality validation passed');

    // Validate all recipients are valid phone numbers (double-check)
    const phoneRegex = /^\d{10,15}$/;
    const invalidPhones = recipients.filter((phone: string) => !phoneRegex.test(phone));
    if (invalidPhones.length > 0) {
      return NextResponse.json(
        { error: `Invalid phone numbers detected: ${invalidPhones.slice(0, 5).join(', ')}${invalidPhones.length > 5 ? '...' : ''}` },
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
    const totalRecipients = recipients.length;
    console.log(`🆔 [Campaign Create API] Generated campaign ID: ${campaignId}`);
    console.log(`👥 [Campaign Create API] Total recipients: ${totalRecipients}`);

    // 6️⃣ Create Campaign Item (DynamoDB Format)
    // PK/SK schema: PK = CAMPAIGN#{id}, SK = METADATA
    const campaignItem: Record<string, any> = {
      PK: { S: `CAMPAIGN#${campaignId}` },
      SK: { S: 'METADATA' },
      campaignId: { S: campaignId },
      name: { S: campaignName },
      channel: { S: channel },
      createdBy: { S: validation.session.email },
      status: { S: 'DRAFT' },
      audienceType: { S: audienceType },
      totalRecipients: { N: totalRecipients.toString() },
      sentCount: { N: '0' },
      failedCount: { N: '0' },
      blockedCount: { N: '0' }, // 🛡️ Circuit breaker: track blocks for auto-pause
      dailyCap: { N: (dailyCap || 1000).toString() },
      createdAt: { N: timestamp.toString() },
      updatedAt: { N: timestamp.toString() }
    };
    
    // ✨ Template Rotation Fields (Phase 1B)
    if (finalTemplates.length === 1) {
      // Legacy format: single template
      campaignItem.templateName = { S: finalTemplates[0] };
    } else {
      // New format: multiple templates
      campaignItem.templates = { L: finalTemplates.map(t => ({ S: t })) };
      
      if (finalTemplateWeights) {
        campaignItem.templateWeights = { L: finalTemplateWeights.map(w => ({ N: w.toString() })) };
      }
      
      campaignItem.templateStrategy = { S: finalTemplateStrategy };
      
      // Also store first template in templateName for backward compatibility
      campaignItem.templateName = { S: finalTemplates[0] };
    }
    
    console.log('📝 [Campaign Create API] Campaign item structure:', JSON.stringify(campaignItem, null, 2));

    // 7️⃣ Insert Campaign into DynamoDB
    console.log(`💾 [Campaign Create API] Writing campaign to DynamoDB table: ${TABLES.CAMPAIGNS}`);
    await dynamoClient.send(
      new PutItemCommand({
        TableName: TABLES.CAMPAIGNS,
        Item: campaignItem
      })
    );
    console.log('✅ [Campaign Create API] Campaign created successfully');

    // 8️⃣ Batch Insert Recipients (DynamoDB BatchWrite supports 25 items per call)
    // Recipient schema: PK = CAMPAIGN#{id}, SK = RECIPIENT#{phone}
    const recipientItems = recipients.map((phone: string) => ({
      PutRequest: {
        Item: {
          PK: { S: `CAMPAIGN#${campaignId}` },
          SK: { S: `RECIPIENT#${phone}` },
          phone: { S: phone },
          status: { S: 'PENDING' },
          attempts: { N: '0' },
          createdAt: { N: timestamp.toString() }
        }
      }
    }));

    // Process in batches of 25 (DynamoDB limit)
    const BATCH_SIZE = 25;
    console.log(`📤 [Campaign Create API] Writing ${recipientItems.length} recipients in batches of ${BATCH_SIZE}`);
    for (let i = 0; i < recipientItems.length; i += BATCH_SIZE) {
      const batch = recipientItems.slice(i, i + BATCH_SIZE);
      console.log(`📦 [Campaign Create API] Batch ${Math.floor(i / BATCH_SIZE) + 1}: Writing ${batch.length} recipients`);
      await dynamoClient.send(
        new BatchWriteItemCommand({
          RequestItems: {
            [TABLES.RECIPIENTS]: batch
          }
        })
      );
    }
    console.log('✅ [Campaign Create API] All recipients written successfully');

    // 9️⃣ Return Success Response
    console.log(`✨ [Campaign Create API] Success! Campaign ${campaignId} created with ${totalRecipients} recipients`);
    return NextResponse.json({
      success: true,
      campaignId,
      totalRecipients,
      message: `Campaign created successfully with ${totalRecipients} recipients.`
    });

  } catch (error) {
    console.error('Campaign creation error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { 
        error: 'Internal Server Error',
        details: error instanceof Error ? error.message : 'Unknown error',
        debug: process.env.META_DRY_RUN === 'true' ? {
          table: TABLES.CAMPAIGNS,
          region: process.env.AWS_REGION || 'not set'
        } : undefined
      },
      { status: 500 }
    );
  }
}
