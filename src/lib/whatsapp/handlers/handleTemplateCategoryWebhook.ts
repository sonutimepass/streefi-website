/**
 * Template Category Update Webhook Handler
 * 
 * Handles template category updates from Meta:
 * - Category changes (MARKETING, UTILITY, AUTHENTICATION)
 * - Category compliance updates
 * 
 * Rare event - usually triggered by Meta policy reviews.
 */

interface TemplateCategoryWebhookValue {
  message_template_id?: number;
  message_template_name?: string;
  message_template_language?: string;
  previous_category?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  new_category?: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  reason?: string;
}

/**
 * Handle template category update webhook
 */
export async function handleTemplateCategoryWebhook(value: TemplateCategoryWebhookValue): Promise<void> {
  try {
    console.log('🏷️ Template category update webhook received');

    // Validate payload
    if (!value || typeof value !== 'object') {
      console.warn('⚠️ Invalid template category webhook payload');
      return;
    }

    const {
      message_template_name,
      message_template_language,
      previous_category,
      new_category,
      reason
    } = value;

    // Log category change (important for compliance)
    console.log(`🏷️ Template Category Change: ${message_template_name} (${message_template_language})`);
    console.log(`   Previous: ${previous_category} → New: ${new_category}`);
    if (reason) {
      console.log(`   Reason: ${reason}`);
    }

    // Category changes may affect usage policies
    console.warn(`⚠️ Category changed - review template usage policies for ${new_category}`);

    // TODO: Update template category in database
    // TODO: Send notification to admin about category change

    console.log('✅ Template category update logged');

  } catch (error) {
    console.error('❌ Error in handleTemplateCategoryWebhook:', error);
    // Don't throw - webhook must return 200 OK
  }
}
