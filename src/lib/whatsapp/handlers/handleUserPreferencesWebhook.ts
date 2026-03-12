/**
 * User Preferences Webhook Handler
 * 
 * Handles customer preference updates:
 * - Opt-in/opt-out from marketing messages
 * - Communication preferences
 * - Privacy settings
 * 
 * Important for compliance with customer preferences.
 */

import { whatsappRepository } from '@/lib/repositories/whatsappRepository';

interface UserPreference {
  wa_id: string;
  user_id?: string;
  detail?: string;
  category: string;
  value: string; // 'stop' or 'start'
  timestamp: number;
}

interface UserPreferencesWebhookValue {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  user_preferences?: UserPreference[];
  contacts?: Array<{
    profile?: {
      name?: string;
      username?: string;
    };
    wa_id?: string;
    user_id?: string;
  }>;
  // Additional phone number locations
  from?: string;
  phone?: string;
  phone_number?: string;
  wa_id?: string;
  user_id?: string;
  user?: {
    wa_id?: string;
    phone_number?: string;
    phone?: string;
    id?: string;
  };
  preference?: string;
  opt_in?: boolean;
  opt_out?: boolean;
  event?: string;
}

/**
 * Extract phone number from various possible locations in payload
 */
function extractPhoneNumber(value: UserPreferencesWebhookValue): string | null {
  // Try all possible locations for phone number
  const possiblePhones = [
    value.from,
    value.phone,
    value.phone_number,
    value.wa_id,
    value.user_id,
    value.user?.wa_id,
    value.user?.phone_number,
    value.user?.phone,
    value.user?.id,
    value.contacts?.[0]?.wa_id,
    value.contacts?.[0]?.user_id,
  ];

  // Return first non-null/non-empty value
  for (const phone of possiblePhones) {
    if (phone && typeof phone === 'string' && phone.trim().length > 0) {
      return phone.trim();
    }
  }

  return null;
}

/**
 * Handle user preferences webhook
 */
export async function handleUserPreferencesWebhook(value: UserPreferencesWebhookValue): Promise<void> {
  try {
    console.log('[Handler] User preferences webhook received');

    // Validate payload
    if (!value || typeof value !== 'object') {
      console.warn('[Handler] Invalid user preferences webhook payload');
      return;
    }

    // New format: user_preferences array
    if (value.user_preferences && Array.isArray(value.user_preferences)) {
      for (const pref of value.user_preferences) {
        if (!pref.wa_id) {
          console.warn('[Handler] Missing wa_id in user preference:', JSON.stringify(pref, null, 2));
          continue;
        }

        console.log(`[Handler] User Preference: ${pref.wa_id}`);
        console.log(`  Category: ${pref.category}`);
        console.log(`  Value: ${pref.value}`);
        console.log(`  Detail: ${pref.detail || 'none'}`);

        // Handle opt-out (value = 'stop')
        if (pref.value === 'stop') {
          console.warn(`[Handler] User OPTED OUT: ${pref.wa_id} (${pref.category})`);
          console.warn(`  COMPLIANCE: Stop sending ${pref.category} to this user`);
          
          await whatsappRepository.updateUserPreferences({
            phone: pref.wa_id,
            marketingOptIn: false,
            preference: pref.category,
            event: 'opt_out'
          });

          console.log(`[Handler] User added to suppression list: ${pref.wa_id}`);
        } 
        // Handle opt-in (value = 'start')
        else if (pref.value === 'start') {
          console.log(`[Handler] User OPTED IN: ${pref.wa_id} (${pref.category})`);
          
          await whatsappRepository.updateUserPreferences({
            phone: pref.wa_id,
            marketingOptIn: true,
            preference: pref.category,
            event: 'opt_in'
          });

          console.log(`[Handler] User opted in: ${pref.wa_id}`);
        }
      }
      return;
    }

    // Try to extract phone number from various locations
    const userPhone = extractPhoneNumber(value);

    if (!userPhone) {
      console.warn('[Handler] ⚠️ Missing phone number in user preferences webhook');
      console.warn('[Handler] Payload structure:', JSON.stringify({
        has_user_preferences: !!value.user_preferences,
        has_contacts: !!value.contacts,
        has_from: !!value.from,
        has_phone: !!value.phone,
        has_phone_number: !!value.phone_number,
        has_wa_id: !!value.wa_id,
        has_user: !!value.user,
        has_metadata: !!value.metadata,
        keys: Object.keys(value)
      }, null, 2));
      
      // Log partial payload for debugging (first 500 chars, no sensitive data)
      console.warn('[Handler] Payload preview:', JSON.stringify(value).substring(0, 500));
      return;
    }

    console.log(`[Handler] User Preferences Update: ${userPhone}`);

    // Legacy format handling
    const {
      preference,
      opt_in,
      opt_out,
      event
    } = value;

    // Handle opt-out (CRITICAL for marketing compliance)
    if (opt_out === true) {
      console.warn(`[Handler] User OPTED OUT: ${userPhone}`);
      console.warn(`  COMPLIANCE: Stop marketing messages to this user`);
      
      await whatsappRepository.updateUserPreferences({
        phone: userPhone,
        marketingOptIn: false,
        preference: preference || 'marketing',
        event: event || 'opt_out'
      });

      console.log(`[Handler] User opted out - added to suppression list: ${userPhone}`);
    } else if (opt_in === true) {
      console.log(`[Handler] User OPTED IN: ${userPhone}`);
      
      await whatsappRepository.updateUserPreferences({
        phone: userPhone,
        marketingOptIn: true,
        preference: preference || 'marketing',
        event: event || 'opt_in'
      });

      console.log(`[Handler] User opted in: ${userPhone}`);
    } else {
      // No explicit opt-in/opt-out flag - just log the preference update
      console.log(`[Handler] User preference noted: ${userPhone}`);
      console.log(`  Preference: ${preference || 'unknown'}`);
      console.log(`  Event: ${event || 'unknown'}`);
    }

    console.log('[Handler] User preferences processed');

  } catch (error) {
    console.error('[Handler] Error in user preferences webhook:', error);
    // Don't throw - webhook must return 200 OK
  }
}
