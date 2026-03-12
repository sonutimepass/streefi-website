/**
 * Business Capability Update Webhook Handler
 * 
 * Handles business capability updates:
 * - Daily conversation limits per phone
 * - Maximum phone numbers per business
 * - Account quality tier changes
 * - Feature enablement/disablement
 * 
 * Important for understanding account limits and features.
 */

interface BusinessCapabilityWebhookValue {
  max_daily_conversation_per_phone?: number;
  max_phone_numbers_per_business?: number;
  max_phone_number_quality_rating?: string;
  phone_number_id?: string;
  display_phone_number?: string;
  [key: string]: any; // Allow other capability fields
}

/**
 * Handle business capability update webhook
 */
export async function handleBusinessCapabilityWebhook(value: BusinessCapabilityWebhookValue): Promise<void> {
  try {
    console.log('⚙️ Business capability update webhook received');

    // Validate payload
    if (!value || typeof value !== 'object') {
      console.warn('⚠️ Invalid business capability webhook payload');
      return;
    }

    const {
      max_daily_conversation_per_phone,
      max_phone_numbers_per_business,
      max_phone_number_quality_rating,
      phone_number_id,
      display_phone_number
    } = value;

    // Log capability update
    console.log('⚙️ Business Capability Update');
    
    if (display_phone_number || phone_number_id) {
      console.log(`   Phone: ${display_phone_number || phone_number_id}`);
    }
    
    // Log conversation limits
    if (max_daily_conversation_per_phone !== undefined) {
      console.log(`   Max Daily Conversations: ${max_daily_conversation_per_phone}`);
      
      // Infer messaging tier from daily limit
      if (max_daily_conversation_per_phone >= 100000) {
        console.log('   🎉 Tier: UNLIMITED');
      } else if (max_daily_conversation_per_phone >= 10000) {
        console.log('   📈 Tier: ~100K');
      } else if (max_daily_conversation_per_phone >= 1000) {
        console.log('   📈 Tier: ~10K');
      } else {
        console.log('   📊 Tier: Standard/1K');
      }
    }
    
    // Log phone number limits
    if (max_phone_numbers_per_business !== undefined) {
      console.log(`   Max Phone Numbers: ${max_phone_numbers_per_business}`);
    }
    
    // Log quality rating
    if (max_phone_number_quality_rating) {
      console.log(`   Quality Rating: ${max_phone_number_quality_rating}`);
    }

    // Log any additional capability fields
    const knownFields = [
      'max_daily_conversation_per_phone',
      'max_phone_numbers_per_business', 
      'max_phone_number_quality_rating',
      'phone_number_id',
      'display_phone_number'
    ];
    
    const additionalFields = Object.keys(value).filter(key => !knownFields.includes(key));
    if (additionalFields.length > 0) {
      console.log('   Additional capabilities:');
      additionalFields.forEach(field => {
        console.log(`     ${field}: ${JSON.stringify(value[field])}`);
      });
    }

    // TODO: Store capability limits in database
    // TODO: Update system limits based on capabilities
    // TODO: Adjust campaign settings for new limits
    // TODO: Notify admin of significant capability changes

    console.log('✅ Business capability update logged');

  } catch (error) {
    console.error('❌ Error in handleBusinessCapabilityWebhook:', error);
    // Don't throw - webhook must return 200 OK
  }
}
