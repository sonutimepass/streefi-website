/**
 * Phone Number Quality Update Webhook Handler
 * 
 * Handles phone number quality tier updates:
 * - Messaging tier changes (TIER_250, TIER_1K, TIER_10K, etc.)
 * - Daily conversation limit updates
 * - Onboarding and tier upgrade events
 * 
 * CRITICAL: Tier changes affect messaging limits and business capacity.
 */

import { whatsappRepository } from '@/lib/repositories/whatsappRepository';

interface PhoneQualityWebhookValue {
  display_phone_number?: string;
  event?: string;                                    // e.g., "ONBOARDING", "TIER_UPGRADE"
  current_limit?: string;                            // e.g., "TIER_250", "TIER_1K"
  old_limit?: string;                                // e.g., "TIER_NOT_SET", "TIER_250"
  max_daily_conversations_per_business?: string;     // e.g., "TIER_250"
}

/**
 * Parse tier limit to number
 */
function parseTierLimit(tier?: string): number {
  if (!tier) return 0;
  
  // Extract numeric value from tier string
  const match = tier.match(/TIER_(\d+K?)/i);
  if (!match) return 0;
  
  const value = match[1];
  if (value.endsWith('K')) {
    return parseInt(value.slice(0, -1)) * 1000;
  }
  return parseInt(value);
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
      display_phone_number,
      event,
      current_limit,
      old_limit,
      max_daily_conversations_per_business
    } = value;

    if (!display_phone_number) {
      console.warn('⚠️ Missing phone number in quality webhook');
      return;
    }

    // Log tier change
    console.log(`📞 Phone Tier Update: ${display_phone_number}`);
    if (event) {
      console.log(`   Event: ${event}`);
    }
    
    // Log tier progression
    if (old_limit && current_limit) {
      console.log(`   Tier Change: ${old_limit} → ${current_limit}`);
      
      const oldLimitNum = parseTierLimit(old_limit);
      const currentLimitNum = parseTierLimit(current_limit);
      
      if (currentLimitNum > oldLimitNum) {
        console.log(`   🎉 TIER UPGRADE: ${oldLimitNum} → ${currentLimitNum} daily conversations`);
        
        // Store upgrade alert
        await whatsappRepository.storeAccountAlert({
          alertType: 'phone_tier_upgrade',
          severity: 'INFORMATIONAL',
          title: `Phone Tier Upgraded: ${display_phone_number}`,
          description: `Messaging limit increased from ${old_limit} to ${current_limit}`,
          event: event || 'tier_upgrade',
          metadata: {
            display_phone_number,
            old_limit,
            current_limit,
            old_limit_num: oldLimitNum,
            current_limit_num: currentLimitNum
          }
        });
      } else if (currentLimitNum < oldLimitNum) {
        console.warn(`   ⚠️ TIER DOWNGRADE: ${oldLimitNum} → ${currentLimitNum} daily conversations`);
        
        // Store downgrade warning
        await whatsappRepository.storeAccountAlert({
          alertType: 'phone_tier_downgrade',
          severity: 'HIGH',
          title: `Phone Tier Downgraded: ${display_phone_number}`,
          description: `Messaging limit reduced from ${old_limit} to ${current_limit}`,
          event: event || 'tier_downgrade',
          metadata: {
            display_phone_number,
            old_limit,
            current_limit,
            old_limit_num: oldLimitNum,
            current_limit_num: currentLimitNum
          }
        });
      }
    } else if (current_limit) {
      console.log(`   Current Tier: ${current_limit}`);
      const limitNum = parseTierLimit(current_limit);
      console.log(`   Daily Limit: ${limitNum} conversations`);
    }
    
    if (max_daily_conversations_per_business) {
      console.log(`   Business Limit: ${max_daily_conversations_per_business}`);
    }

    // Log onboarding event
    if (event === 'ONBOARDING') {
      console.log(`   ✅ Phone number onboarded with tier: ${current_limit}`);
    }

    // TODO: Store tier information in database
    // Note: This webhook is about tier limits (TIER_250, TIER_1K), not quality scores (GREEN/YELLOW/RED)
    // The updatePhoneQuality method expects quality scores, so we need a separate storage method for tiers
    // For now, tier changes are logged and stored as account alerts above

    console.log('✅ Phone tier update logged');

  } catch (error) {
    console.error('❌ Error in handlePhoneQualityWebhook:', error);
    // Don't throw - webhook must return 200 OK
  }
}
