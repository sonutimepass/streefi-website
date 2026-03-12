/**
 * Template Sync API - Phase UI-4
 * 
 * Syncs templates from Meta WhatsApp Cloud API to local DynamoDB storage.
 * This allows admins to pull approved templates without manual entry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSessionWithBypass } from '@/lib/adminAuth';
import { getTemplateService } from '@/lib/whatsapp/meta/templateService';
import { whatsappRepository } from '@/lib/repositories';
import { randomUUID } from 'crypto';

interface SyncResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

/**
 * Extract variables from template text
 * Looks for {{1}}, {{2}}, etc.
 */
function extractVariables(components: any[]): string[] {
  const variables = new Set<string>();
  
  for (const component of components) {
    if (component.text) {
      const matches = component.text.matchAll(/\{\{(\d+)\}\}/g);
      for (const match of matches) {
        variables.add(match[1]);
      }
    }
  }
  
  return Array.from(variables).sort();
}

/**
 * POST /api/whatsapp-admin/templates/sync
 * 
 * Sync all templates from Meta to local storage
 */
export async function POST(req: NextRequest) {
  console.log('\n========================================');
  console.log('📝 [TemplateSync] Starting template sync...');
  console.log('========================================');
  
  // DEBUG: Environment check
  console.log('🔍 [TemplateSync] Environment Debug:');
  console.log('  - NODE_ENV:', process.env.NODE_ENV);
  console.log('  - NEXT_PUBLIC_BYPASS_AUTH:', process.env.NEXT_PUBLIC_BYPASS_AUTH);
  console.log('  - VERCEL:', process.env.VERCEL ? 'Yes' : 'No');
  console.log('  - META_ACCESS_TOKEN:', process.env.META_ACCESS_TOKEN ? `Set (${process.env.META_ACCESS_TOKEN.substring(0, 10)}...)` : 'NOT SET');
  console.log('  - META_WABA_ID:', process.env.META_WABA_ID || 'NOT SET');
  console.log('  - META_PHONE_NUMBER_ID:', process.env.META_PHONE_NUMBER_ID || 'NOT SET');
  
  try {
    // 1️⃣ Validate Admin Session (with automatic bypass for local dev)
    console.log('\n🔐 [TemplateSync] Validating admin session...');
    const validation = await validateAdminSessionWithBypass(req, 'whatsapp-session');
    
    console.log('  - Validation result:', {
      valid: validation.valid,
      error: validation.error,
      hasSession: !!validation.session
    });
    
    if (!validation.valid) {
      console.error('❌ [TemplateSync] Validation failed:', validation.error);
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          details: validation.error,
          debug: {
            NODE_ENV: process.env.NODE_ENV,
            BYPASS_AUTH: process.env.NEXT_PUBLIC_BYPASS_AUTH,
            VERCEL: !!process.env.VERCEL
          }
        },
        { status: 401 }
      );
    }
    
    console.log('✅ [TemplateSync] Authentication successful');

    // 2️⃣ Fetch templates from Meta
    const templateService = getTemplateService();
    const metaTemplates = await templateService.getTemplates();

    if (!metaTemplates || metaTemplates.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No templates found in Meta account',
        result: {
          imported: 0,
          updated: 0,
          skipped: 0,
          errors: []
        }
      });
    }

    // 3️⃣ Process each template
    const result: SyncResult = {
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    const now = new Date().toISOString();

    for (const metaTemplate of metaTemplates) {
      try {
        // Extract variables from template components
        const variables = extractVariables(metaTemplate.components || []);

        // Map Meta status to internal MetaStatus type
        let metaStatus: 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_SUBMITTED' | 'PAUSED';
        if (metaTemplate.status === 'APPROVED') {
          metaStatus = 'APPROVED';
        } else if (metaTemplate.status === 'PENDING') {
          metaStatus = 'PENDING';
        } else if (metaTemplate.status === 'REJECTED') {
          metaStatus = 'REJECTED';
        } else if (metaTemplate.status === 'DISABLED') {
          metaStatus = 'PAUSED';
        } else {
          metaStatus = 'NOT_SUBMITTED';
        }

        // Check if template already exists (by name and language)
        // For now, we'll use Meta template ID as our templateId
        const templateId = metaTemplate.id || randomUUID();

        // Create template object
        const template = {
          templateId,
          name: metaTemplate.name,
          category: metaTemplate.category as 'MARKETING' | 'UTILITY' | 'AUTHENTICATION',
          language: metaTemplate.language,
          variables,
          status: 'active' as const, // Mark synced templates as active
          metaStatus,
          syncedFromMeta: true,
          lastSyncTime: now,
          metaTemplateId: metaTemplate.id,
          createdAt: now,
          updatedAt: now
        };

        try {
          // Check if template already exists
          const existingTemplate = await whatsappRepository.getTemplate(templateId);
          
          if (existingTemplate) {
            // Update existing template with sync data
            await whatsappRepository.saveTemplate({
              ...existingTemplate,
              metaStatus,
              variables,
              syncedFromMeta: true,
              lastSyncTime: now,
              updatedAt: now
            });
            result.updated++;
          } else {
            // Create new template
            await whatsappRepository.saveTemplate(template);
            result.imported++;
          }
          
        } catch (error: any) {
          // If there's any error, log it
          throw error;
        }

      } catch (error) {
        console.error(`[TemplateSync] Error syncing template ${metaTemplate.name}:`, error);
        result.errors.push(`${metaTemplate.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('[TemplateSync] Sync completed:', result);

    return NextResponse.json({
      success: true,
      message: `Synced ${metaTemplates.length} templates from Meta`,
      result
    });

  } catch (error) {
    console.error('[TemplateSync] Fatal error:', error);
    
    return NextResponse.json(
      { 
        error: 'Template sync failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
