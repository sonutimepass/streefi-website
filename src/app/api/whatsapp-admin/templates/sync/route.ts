/**
 * Template Sync API - Phase UI-4
 * 
 * Syncs templates from Meta WhatsApp Cloud API to local DynamoDB storage.
 * This allows admins to pull approved templates without manual entry.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PutItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient } from '@/lib/dynamoClient';
import { validateAdminSession } from '@/lib/adminAuth';
import { getTemplateService } from '@/lib/whatsapp/meta/templateService';
import { randomUUID } from 'crypto';

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'streefi_whatsapp';

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
  try {
    // 1️⃣ Validate Admin Session
    const validation = await validateAdminSession(req, 'whatsapp-session');
    if (!validation.valid || !validation.session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

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

        // Create/update template in DynamoDB
        const item = {
          PK: { S: `TEMPLATE#${templateId}` },
          SK: { S: 'METADATA' },
          
          templateId: { S: templateId },
          name: { S: metaTemplate.name },
          category: { S: metaTemplate.category },
          language: { S: metaTemplate.language },
          variables: { L: variables.map(v => ({ S: v })) },
          
          status: { S: 'active' }, // Mark synced templates as active
          metaStatus: { S: metaStatus },
          
          syncedFromMeta: { BOOL: true },
          lastSyncTime: { S: now },
          metaTemplateId: { S: metaTemplate.id },
          
          createdAt: { S: now },
          updatedAt: { S: now }
        };

        try {
          // Try to create new template
          await dynamoClient.send(
            new PutItemCommand({
              TableName: TABLE_NAME,
              Item: item,
              ConditionExpression: 'attribute_not_exists(PK)'
            })
          );
          
          result.imported++;
          
        } catch (error: any) {
          // If template exists, update it
          if (error.name === 'ConditionalCheckFailedException') {
            await dynamoClient.send(
              new UpdateItemCommand({
                TableName: TABLE_NAME,
                Key: {
                  PK: { S: `TEMPLATE#${templateId}` },
                  SK: { S: 'METADATA' }
                },
                UpdateExpression: 'SET metaStatus = :metaStatus, syncedFromMeta = :synced, lastSyncTime = :syncTime, updatedAt = :updated, #vars = :vars',
                ExpressionAttributeNames: {
                  '#vars': 'variables'
                },
                ExpressionAttributeValues: {
                  ':metaStatus': { S: metaStatus },
                  ':synced': { BOOL: true },
                  ':syncTime': { S: now },
                  ':updated': { S: now },
                  ':vars': { L: variables.map(v => ({ S: v })) }
                }
              })
            );
            
            result.updated++;
          } else {
            throw error;
          }
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
