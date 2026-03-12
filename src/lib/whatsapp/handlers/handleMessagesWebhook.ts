/**
 * Messages Webhook Handler
 * 
 * Handles all message-related webhook events:
 * - Incoming text messages
 * - Incoming media (image, video, audio, document)
 * - Message status updates (sent, delivered, read)
 * - Message reactions
 * 
 * This is the primary handler for conversation data.
 */

import { whatsappRepository } from '@/lib/repositories/whatsappRepository';
import { 
  WebhookMessage, 
  WebhookContact,
  WebhookStatus,
  extractMessageContent, 
  truncateText 
} from '../metaTypes';
import { handleMessageStatuses as processMessageStatuses } from './statusHandler';

interface WebhookReaction {
  message_id: string;
  emoji?: string;
  from?: string;
}

interface MessagesWebhookValue {
  messaging_product?: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: WebhookContact[];
  messages?: WebhookMessage[];
  statuses?: WebhookStatus[];
  reactions?: WebhookReaction[];
}

/**
 * Handle messages webhook event
 * 
 * Routes to sub-handlers based on event type within the messages field
 */
export async function handleMessagesWebhook(value: MessagesWebhookValue): Promise<void> {
  try {
    console.log('📨 Processing messages webhook');

    // Validate payload structure
    if (!value || typeof value !== 'object') {
      console.warn('⚠️ Invalid messages webhook payload');
      return;
    }

    // Handle incoming messages
    if (value.messages && Array.isArray(value.messages) && value.messages.length > 0) {
      await handleIncomingMessages(value.messages, value.contacts);
    }

    // Handle message status updates
    if (value.statuses && Array.isArray(value.statuses) && value.statuses.length > 0) {
      await handleMessageStatuses(value.statuses);
    }

    // Handle message reactions
    if (value.reactions && Array.isArray(value.reactions) && value.reactions.length > 0) {
      await handleMessageReactions(value.reactions);
    }

  } catch (error) {
    console.error('❌ Error in handleMessagesWebhook:', error);
    // Don't throw - webhook must return 200 OK
  }
}

/**
 * Handle incoming messages (text and media)
 */
async function handleIncomingMessages(
  messages: WebhookMessage[],
  contacts?: WebhookContact[]
): Promise<void> {
  for (const message of messages) {
    await processIncomingMessage(message, contacts);
  }
}

/**
 * Process single incoming message
 */
async function processIncomingMessage(
  message: WebhookMessage,
  contacts?: WebhookContact[]
): Promise<void> {
  const phone = message.from;
  const timestamp = parseInt(message.timestamp, 10);
  const content = extractMessageContent(message);
  const messageType = message.type;

  console.log(`📩 Incoming ${messageType} message from ${phone}:`, {
    messageId: message.id,
    contentPreview: truncateText(content, 50)
  });

  // Extract contact name if available
  const contactName = contacts?.find(c => c.wa_id === phone)?.profile?.name;

  try {
    // Store message in database
    await whatsappRepository.storeMessage({
      phone,
      direction: 'inbound',
      messageId: message.id,
      messageType,
      content,
      timestamp,
      status: 'received'
    });

    // Update conversation metadata
    await whatsappRepository.updateConversationMeta({
      phone,
      name: contactName,
      lastMessage: truncateText(content, 100),
      lastMessageTimestamp: timestamp,
      lastDirection: 'inbound',
      incrementUnread: true
    });

    console.log(`✅ Stored incoming message: ${message.id}`);
  } catch (error) {
    console.error(`❌ Failed to store incoming message ${message.id}:`, error);
    // Continue processing
  }
}

/**
 * Handle message status updates
 * Delegates to the centralized orchestrator for complete processing
 */
async function handleMessageStatuses(statuses: WebhookStatus[]): Promise<void> {
  await processMessageStatuses(statuses);
}

/**
 * Handle message reactions (emoji reactions to messages)
 */
async function handleMessageReactions(reactions: WebhookReaction[]): Promise<void> {
  for (const reaction of reactions) {
    await processReaction(reaction);
  }
}

/**
 * Process single reaction
 */
async function processReaction(reaction: WebhookReaction): Promise<void> {
  console.log(`👍 Reaction: ${reaction.emoji || 'removed'} on message ${reaction.message_id}`);

  try {
    // Store reaction as a special message type
    const reactionContent = `[Reaction: ${reaction.emoji || 'removed'}] on message ${reaction.message_id}`;
    
    await whatsappRepository.storeMessage({
      phone: reaction.from || 'unknown',
      direction: 'inbound',
      messageId: `${reaction.message_id}_reaction_${Date.now()}`,
      messageType: 'reaction',
      content: reactionContent,
      timestamp: Math.floor(Date.now() / 1000),
      status: 'received'
    });

    console.log(`✅ Stored reaction on message: ${reaction.message_id}`);
  } catch (error) {
    console.error(`❌ Failed to store reaction:`, error);
    // Continue processing
  }
}
