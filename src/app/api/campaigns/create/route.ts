import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { validateAdminSession } from '@/lib/adminAuth';
import { campaignRepository, recipientRepository } from '@/lib/repositories';
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

    // 5️⃣ Generate Campaign ID
    const campaignId = `cmp_${randomUUID()}`;

    // 6️⃣ Create Campaign Object
    const timestamp = Math.floor(Date.now() / 1000) * 1000; // Convert to milliseconds for consistency
    const totalRecipients = recipients.length;
    console.log(`🆔 [Campaign Create API] Generated campaign ID: ${campaignId}`);
    console.log(`👥 [Campaign Create API] Total recipients: ${totalRecipients}`);

    const campaign = {
      campaign_id: campaignId,
      campaign_name: campaignName,
      template_name: finalTemplates[0], // First template for backward compatibility
      campaign_status: 'DRAFT' as const,
      channel: channel as 'WHATSAPP' | 'EMAIL',
      audience_type: audienceType as 'FIREBASE' | 'MONGODB' | 'CSV' | 'MIXED',
      created_by: validation.session.email,
      total_recipients: totalRecipients,
      sent_count: 0,
      delivered_count: 0,
      failed_count: 0,
      blocked_count: 0,
      daily_cap: dailyCap || 1000,
      created_at: timestamp,
      // Template rotation fields
      templates: finalTemplates.length > 1 ? finalTemplates : undefined,
      template_weights: finalTemplateWeights,
      template_strategy: finalTemplates.length > 1 ? finalTemplateStrategy : undefined
    };
    
    console.log('📝 [Campaign Create API] Campaign object:', JSON.stringify(campaign, null, 2));

    // 7️⃣ Create Campaign using Repository
    console.log(`💾 [Campaign Create API] Creating campaign via repository`);
    await campaignRepository.createCampaign(campaign);
    console.log('✅ [Campaign Create API] Campaign created successfully');

    // 8️⃣ Create Recipients using Repository (handles batching automatically)
    console.log(`📤 [Campaign Create API] Creating ${recipients.length} recipients`);
    await recipientRepository.createRecipients(campaignId, recipients);
    console.log('✅ [Campaign Create API] All recipients created successfully');

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
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
