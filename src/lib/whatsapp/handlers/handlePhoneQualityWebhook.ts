/**
 * Phone Number Quality Update Webhook Handler
 * 
 * Handles phone number quality rating updates:
 * - Quality score changes (GREEN, YELLOW, RED)
 * - Rate limiting implications
 * - Account health monitoring
 * 
 * CRITICAL: Low quality can severely impact messaging limits.
 */

import { whatsappRepository } from '@/lib/repositories/whatsappRepository';

interface PhoneQualityWebhookValue {
  phone_number?: string;
  display_phone_number?: string;
  quality_score?: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  previous_score?: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
  event?: 'FLAGGED' | 'UNFLAGGED';
  reason?: string;
}

/**
 * Handle phone number quality update webhook
 */
export async function handlePhoneQualityWebhook(value: PhoneQualityWebhookValue): Promise<void> {
  try {
    console.log('📞 Phone number quality update webhook received');

    // Validate payload
    if (!value || typeof value !== 'object') {
      console.warn('⚠️ Invalid phone quality webhook payload');
      return;
    }

    const {
      phone_number,
      display_phone_number,
      quality_score,
      previous_score,
      event,
      reason
    } = value;

    if (!phone_number && !display_phone_number) {
      console.warn('⚠️ Missing phone number in quality webhook');
      return;
    }

    const phoneNumberId = phone_number || display_phone_number || 'unknown';
    const displayPhone = display_phone_number || phone_number || 'N/A';

    // Log quality change (CRITICAL monitoring)
    console.log(`📞 Phone Quality Update: ${displayPhone}`);
    if (previous_score && quality_score) {
      console.log(`   Quality: ${previous_score} → ${quality_score}`);
    } else {
      console.log(`   Quality: ${quality_score || 'Unknown'}`);
    }
    if (event) {
      console.log(`   Event: ${event}`);
    }
    if (reason) {
      console.log(`   Reason: ${reason}`);
    }

    // CRITICAL: Quality degradation affects messaging limits
    if (quality_score === 'RED') {
      console.error(`🔴 CRITICAL: Phone number quality is RED`);
      console.error(`   Messaging limits severely restricted`);
      console.error(`   IMMEDIATE ACTION REQUIRED: Review and improve message quality`);
      
      // Store critical alert
      await whatsappRepository.storeAccountAlert({
        alertType: 'phone_quality_critical',
        severity: 'CRITICAL',
        title: `Phone Quality RED: ${displayPhone}`,
        description: reason || 'Phone number quality degraded to RED status',
        event: event || 'quality_update'
      });
    } else if (quality_score === 'YELLOW') {
      console.warn(`🟡 WARNING: Phone number quality is YELLOW`);
      console.warn(`   Messaging limits may be reduced`);
      console.warn(`   Take action: Review customer feedback and message quality`);
      
      // Store warning alert
      await whatsappRepository.storeAccountAlert({
        alertType: 'phone_quality_warning',
        severity: 'HIGH',
        title: `Phone Quality YELLOW: ${displayPhone}`,
        description: reason || 'Phone number quality degraded to YELLOW status',
        event: event || 'quality_update'
      });
    } else if (quality_score === 'GREEN') {
      console.log(`✅ Phone number quality is GREEN - normal operations`);
    }

    // Store quality metrics in database
    await whatsappRepository.updatePhoneQuality({
      phoneNumberId,
      displayPhone,
      qualityScore: quality_score || 'UNKNOWN',
      previousScore: previous_score,
      event,
      reason
    });

    console.log('✅ Phone quality update stored in database');

  } catch (error) {
    console.error('❌ Error in handlePhoneQualityWebhook:', error);
    // Don't throw - webhook must return 200 OK
  }
}
