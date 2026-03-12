/**
 * Template Quality Update Webhook Handler
 * 
 * Handles template quality rating updates from Meta:
 * - Quality changes (HIGH, MEDIUM, LOW)
 * - Quality scores
 * - Template quality flags
 * 
 * Important for monitoring template health and compliance.
 */

import { whatsappRepository } from '@/lib/repositories/whatsappRepository';

interface TemplateQualityWebhookValue {
  message_template_id?: number;
  message_template_name?: string;
  message_template_language?: string;
  previous_quality_score?: 'GREEN' | 'YELLOW' | 'RED';
  new_quality_score?: 'GREEN' | 'YELLOW' | 'RED';
  reason?: string;
}

/**
 * Handle template quality update webhook
 */
export async function handleTemplateQualityWebhook(value: TemplateQualityWebhookValue): Promise<void> {
  try {
    console.log('⚠️ Template quality update webhook received');

    // Validate payload
    if (!value || typeof value !== 'object') {
      console.warn('⚠️ Invalid template quality webhook payload');
      return;
    }

    const {
      message_template_name,
      message_template_language,
      previous_quality_score,
      new_quality_score,
      reason
    } = value;

    if (!message_template_name || !new_quality_score) {
      console.warn('⚠️ Missing required fields in template quality webhook');
      return;
    }

    // Log quality change (important for monitoring)
    console.log(`⚠️ Template Quality Change: ${message_template_name} (${message_template_language})`);
    console.log(`   Previous: ${previous_quality_score} → New: ${new_quality_score}`);
    if (reason) {
      console.log(`   Reason: ${reason}`);
    }

    // Quality degradation should be monitored closely
    if (new_quality_score === 'RED') {
      console.error(`🔴 CRITICAL: Template ${message_template_name} quality is RED`);
      console.error(`   This may affect delivery rates and could lead to template suspension`);
      console.error(`   IMMEDIATE ACTION REQUIRED: Review message content and user feedback`);
    } else if (new_quality_score === 'YELLOW') {
      console.warn(`🟡 WARNING: Template ${message_template_name} quality degraded to YELLOW`);
      console.warn(`   Monitor closely and improve message quality`);
    }

    // Update template quality in database
    await whatsappRepository.updateTemplateQuality({
      templateName: message_template_name,
      previousQuality: previous_quality_score,
      newQuality: new_quality_score,
      reason
    });

    console.log('✅ Template quality update stored in database');

  } catch (error) {
    console.error('❌ Error in handleTemplateQualityWebhook:', error);
    // Don't throw - webhook must return 200 OK
  }
}
