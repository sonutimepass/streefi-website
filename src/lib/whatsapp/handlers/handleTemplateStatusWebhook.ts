/**
 * Template Status Update Webhook Handler
 * 
 * Handles message template status updates from Meta:
 * - Template approved
 * - Template rejected
 * - Template paused
 * - Template disabled
 * 
 * Updates the metaStatus field in the database.
 */

import { whatsappRepository } from '@/lib/repositories/whatsappRepository';

interface TemplateStatusWebhookValue {
  event: 'APPROVED' | 'REJECTED' | 'PENDING' | 'PAUSED' | 'DISABLED';
  message_template_id: number;
  message_template_name: string;
  message_template_language: string;
  message_template_category?: string;
  reason?: string | null;
  rejection_reason?: string;
}

/**
 * Handle template status update webhook
 */
export async function handleTemplateStatusWebhook(value: TemplateStatusWebhookValue): Promise<void> {
  try {
    console.log('📋 Template status update webhook received');

    // Validate payload
    if (!value || typeof value !== 'object') {
      console.warn('⚠️ Invalid template status webhook payload');
      return;
    }

    const { 
      event,
      message_template_id,
      message_template_name, 
      message_template_language, 
      message_template_category,
      reason, 
      rejection_reason 
    } = value;

    if (!message_template_name || !event) {
      console.warn('⚠️ Missing required fields in template status webhook');
      console.warn('   Payload keys:', Object.keys(value));
      return;
    }

    // Log the status update
    console.log(`📋 Template: ${message_template_name}`);
    console.log(`   Language: ${message_template_language}`);
    console.log(`   Template ID: ${message_template_id}`);
    if (message_template_category) {
      console.log(`   Category: ${message_template_category}`);
    }
    console.log(`   Status: ${event}`);
    
    // Log rejection reason if present
    const rejectionInfo = reason || rejection_reason;
    if (rejectionInfo) {
      console.log(`   Reason: ${rejectionInfo}`);
    }

    // Update template status in database
    const template = await whatsappRepository.getTemplateByName(message_template_name);
    
    if (template) {
      // Map webhook event to MetaStatus
      const metaStatusMap: Record<string, 'APPROVED' | 'REJECTED' | 'PENDING' | 'PAUSED' | 'NOT_SUBMITTED'> = {
        'APPROVED': 'APPROVED',
        'REJECTED': 'REJECTED',
        'PENDING': 'PENDING',
        'PAUSED': 'PAUSED',
        'DISABLED': 'PAUSED', // Map DISABLED to PAUSED
      };

      const metaStatus = metaStatusMap[event] || 'PENDING';

      await whatsappRepository.updateTemplateMetaStatus(
        template.templateId,
        metaStatus
      );
      
      if (event === 'APPROVED') {
        console.log(`✅ Template APPROVED: ${message_template_name} → ${metaStatus}`);
      } else if (event === 'REJECTED') {
        console.log(`❌ Template REJECTED: ${message_template_name} → ${metaStatus}`);
      } else {
        console.log(`✅ Template status updated: ${message_template_name} → ${metaStatus}`);
      }
    } else {
      console.warn(`⚠️ Template not found in DB: ${message_template_name}`);
      console.warn('   Template may need to be synced from Meta');
    }

  } catch (error) {
    console.error('❌ Error in handleTemplateStatusWebhook:', error);
    // Don't throw - webhook must return 200 OK
  }
}
