/**
 * Automatic Events Webhook Handler
 * 
 * Handles automatic event tracking:
 * - Customer journey events
 * - Conversion tracking
 * - Click/view events
 * - Commerce events
 * 
 * Used for analytics and attribution.
 */

interface AutomaticEvent {
  id: string;
  event_name: string;
  timestamp: number;
  event_data?: Record<string, any>;
  value?: number;
  currency?: string;
  // Optional user identifiers (may not be present for all events)
  phone_number?: string;
  phone?: string;
  wa_id?: string;
  user_id?: string;
}

interface AutomaticEventWebhookValue {
  messaging_product: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  automatic_events?: AutomaticEvent[];
}

/**
 * Extract phone/user identifier from automatic event
 */
function extractUserIdentifier(event: AutomaticEvent): string | null {
  const possibleIdentifiers = [
    event.phone,
    event.phone_number,
    event.wa_id,
    event.user_id,
  ];

  for (const identifier of possibleIdentifiers) {
    if (identifier && typeof identifier === 'string' && identifier.trim().length > 0) {
      return identifier.trim();
    }
  }

  return null;
}

/**
 * Handle automatic events webhook
 */
export async function handleAutomaticEventsWebhook(value: AutomaticEventWebhookValue): Promise<void> {
  try {
    console.log('📊 Automatic events webhook received');

    // Validate payload
    if (!value || typeof value !== 'object') {
      console.warn('⚠️ Invalid automatic events webhook payload');
      return;
    }

    // Check for automatic_events array
    if (!value.automatic_events || !Array.isArray(value.automatic_events)) {
      console.warn('⚠️ No automatic_events array found in payload');
      console.warn('   Payload keys:', Object.keys(value));
      return;
    }

    // Log metadata context
    if (value.metadata) {
      console.log(`📱 Phone Number: ${value.metadata.display_phone_number || 'Unknown'}`);
      console.log(`📱 Phone ID: ${value.metadata.phone_number_id || 'Unknown'}`);
    }

    // Process each automatic event
    for (const event of value.automatic_events) {
      try {
        // Extract event details
        const {
          id,
          event_name,
          timestamp,
          event_data,
          value: eventValue,
          currency
        } = event;

        // Extract user identifier (may be null for tracking events)
        const userIdentifier = extractUserIdentifier(event);

        // Log automatic event
        console.log(`📊 Automatic Event: ${event_name || 'Unknown'}`);
        console.log(`   Event ID: ${id}`);
        if (userIdentifier) {
          console.log(`   User: ${userIdentifier}`);
        }
        if (timestamp) {
          const eventDate = new Date(timestamp * 1000);
          console.log(`   Timestamp: ${eventDate.toISOString()}`);
        }

        // Log conversion/commerce events
        if (eventValue !== undefined && currency) {
          console.log(`💰 Commerce Event Value: ${eventValue} ${currency}`);
        }

        // Log event data
        if (event_data && Object.keys(event_data).length > 0) {
          console.log(`   Data:`, JSON.stringify(event_data, null, 2));
        }

        // TODO: Store events for analytics dashboard
        // TODO: Track customer journey mapping
        // TODO: Build attribution models for campaign effectiveness

      } catch (eventError) {
        console.error(`❌ Error processing automatic event:`, eventError);
        // Continue processing other events
      }
    }

    console.log(`✅ Processed ${value.automatic_events.length} automatic event(s)`);

  } catch (error) {
    console.error('❌ Error in handleAutomaticEventsWebhook:', error);
    // Don't throw - webhook must return 200 OK
  }
}
