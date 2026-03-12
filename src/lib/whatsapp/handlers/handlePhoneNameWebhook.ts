/**
 * Phone Number Name Update Webhook Handler
 * 
 * Handles phone number display name updates:
 * - Display name changes
 * - Business profile updates
 * - Verification status changes
 * 
 * Informational event for business profile management.
 */

interface PhoneNameWebhookValue {
  phone_number?: string;
  display_phone_number?: string;
  display_name?: string;
  verified_name?: string;
  event?: 'NAME_UPDATED' | 'NAME_APPROVED' | 'NAME_REJECTED';
  reason?: string;
}

/**
 * Handle phone number name update webhook
 */
export async function handlePhoneNameWebhook(value: PhoneNameWebhookValue): Promise<void> {
  try {
    console.log('🏷️ Phone number name update webhook received');

    // Validate payload
    if (!value || typeof value !== 'object') {
      console.warn('⚠️ Invalid phone name webhook payload');
      return;
    }

    const {
      display_phone_number,
      display_name,
      verified_name,
      event,
      reason
    } = value;

    // Log name update
    console.log(`🏷️ Phone Name Update: ${display_phone_number || 'N/A'}`);
    if (display_name) {
      console.log(`   Display Name: ${display_name}`);
    }
    if (verified_name) {
      console.log(`   Verified Name: ${verified_name}`);
    }
    if (event) {
      console.log(`   Event: ${event}`);
    }
    if (reason) {
      console.log(`   Reason: ${reason}`);
    }

    // Log verification events
    if (event === 'NAME_APPROVED') {
      console.log(`✅ Business name approved: ${verified_name}`);
    } else if (event === 'NAME_REJECTED') {
      console.warn(`⚠️ Business name rejected: ${reason || 'No reason provided'}`);
    }

    // TODO: Update business profile information in database
    // TODO: Notify admin of verification status changes

    console.log('✅ Phone name update logged');

  } catch (error) {
    console.error('❌ Error in handlePhoneNameWebhook:', error);
    // Don't throw - webhook must return 200 OK
  }
}
