/**
 * Inbound Message Handler
 * 
 * Handles incoming messages from customers via WhatsApp webhook.
 * 
 * Responsibilities:
 * 1. Store message in DynamoDB (MSG item)
 * 2. Update conversation metadata (META item)
 * 
 * Schema:
 * - MSG item: CONV#{phone} / MSG#{timestamp}#IN
 * - META item: CONV#{phone} / META
 */

import { whatsappRepository } from '@/lib/repositories/whatsappRepository';
import { 
  WebhookMessage, 
  WebhookContact,
  extractMessageContent, 
  truncateText 
} from '../metaTypes';

/**
 * Process array of inbound messages from webhook
 */
export async function handleInboundMessages(
  messages: WebhookMessage[], 
  contacts?: WebhookContact[]
): Promise<void> {
  try {
    for (const message of messages) {
      await processInboundMessage(message, contacts);
    }
  } catch (error) {
    console.error('❌ Error handling inbound messages:', error);
    // Don't throw - webhook must return 200
  }
}

/**
 * Process single inbound message
 */
async function processInboundMessage(
  message: WebhookMessage,
  contacts?: WebhookContact[]
): Promise<void> {
  const phone = message.from;
  const timestamp = parseInt(message.timestamp, 10);
  const content = extractMessageContent(message);
  
  console.log(`📩 Inbound message from ${phone}:`, {
    messageId: message.id,
    type: message.type,
    contentPreview: truncateText(content, 50)
  });

  // Extract contact name if available
  const contactName = contacts?.find(c => c.wa_id === phone)?.profile?.name;

  try {
    // Write 1: Store message item
    await whatsappRepository.storeMessage({
      phone,
      direction: 'inbound',
      messageId: message.id,
      messageType: message.type,
      content,
      timestamp,
      status: 'received'
    });

    // Write 2: Update conversation metadata
    await whatsappRepository.updateConversationMeta({
      phone,
      name: contactName,
      lastMessage: truncateText(content, 100),
      lastMessageTimestamp: timestamp,
      lastDirection: 'inbound',
      incrementUnread: true
    });

    console.log(`✅ Stored inbound message: ${message.id}`);
  } catch (error) {
    console.error(`❌ Failed to store inbound message ${message.id}:`, error);
    // Continue processing other messages
  }
}
