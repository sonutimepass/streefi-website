/**
 * Phone Number Name Update Webhook Handler
 * 
 * Handles phone number display name verification updates:
 * - Display name approval
 * - Display name rejection
 * - Business profile verification status
 * 
 * Informational event for business profile management.
 */

interface PhoneNameWebhookValue {
  display_phone_number?: string;
  decision?: 'APPROVED' | 'REJECTED' | 'PENDING';
  requested_verified_name?: string;
  rejection_reason?: string | null;
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
      decision,
      requested_verified_name,
      rejection_reason
    } = value;

    // Log name verification update
    console.log(`🏷️ Phone Name Verification: ${display_phone_number || 'N/A'}`);
    if (requested_verified_name) {
      console.log(`   Requested Name: ${requested_verified_name}`);
    }
    if (decision) {
      console.log(`   Decision: ${decision}`);
    }

    // Log decision outcome
    if (decision === 'APPROVED') {
      console.log(`✅ Business name approved: ${requested_verified_name}`);
    } else if (decision === 'REJECTED') {
      console.warn(`❌ Business name rejected`);
      if (rejection_reason) {
        console.warn(`   Reason: ${rejection_reason}`);
      }
    } else if (decision === 'PENDING') {
      console.log(`⏳ Business name verification pending: ${requested_verified_name}`);
    }

    // TODO: Update business profile information in database
    // TODO: Notify admin of verification status changes

    console.log('✅ Phone name update logged');

  } catch (error) {
    console.error('❌ Error in handlePhoneNameWebhook:', error);
    // Don't throw - webhook must return 200 OK
  }
}
