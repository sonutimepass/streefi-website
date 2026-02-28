/**
 * Meta Message Service
 * 
 * This module handles all message-sending operations with Meta's WhatsApp Cloud API.
 * 
 * LAYER RESPONSIBILITY:
 * ✅ Message sending API calls to Meta
 * ✅ Response transformation
 * ✅ Contextual logging
 * ✅ Error propagation (preserves structured errors)
 * 
 * ❌ Database operations (belongs to services)
 * ❌ Route handling (belongs to API routes)
 * ❌ Business logic (belongs to services)
 * ❌ Error wrapping (destroys error structure)
 * 
 * ERROR HANDLING PRINCIPLE:
 * This service adds contextual logging but NEVER wraps errors.
 * MetaApiError instances must reach the route layer unchanged.
 */

import { getMetaClient, MetaAPIClient, MetaApiError } from './metaClient';
import { getDailyLimitGuard, type DailyLimitCheckResult } from '../guards';

export interface TemplateMessage {
  type: 'template';
  to: string; // Phone number in international format (e.g., "919876543210")
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: TemplateMessageComponent[];
  };
}

export interface TemplateMessageComponent {
  type: 'header' | 'body' | 'button';
  parameters: TemplateParameter[];
  sub_type?: 'url' | 'quick_reply'; // For buttons
  index?: string; // For buttons
}

export interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'video' | 'document';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
  video?: {
    link: string;
  };
  document?: {
    link: string;
    filename?: string;
  };
}

export interface TextMessage {
  type: 'text';
  to: string;
  text: {
    body: string;
    preview_url?: boolean;
  };
}

export interface MessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
    message_status?: string;
  }>;
}

export interface MessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id?: string;
  errors?: Array<{
    code: number;
    title: string;
    message: string;
    error_data?: {
      details: string;
    };
  }>;
}

/**
 * Custom error for daily limit exceeded
 */
export class DailyLimitExceededError extends Error {
  public readonly currentCount: number;
  public readonly limit: number;

  constructor(message: string, currentCount: number, limit: number) {
    super(message);
    this.name = 'DailyLimitExceededError';
    this.currentCount = currentCount;
    this.limit = limit;
  }
}

export class MessageService {
  private client: MetaAPIClient;
  private phoneNumberId: string;
  private limitGuard = getDailyLimitGuard();

  constructor(client?: MetaAPIClient) {
    this.client = client || getMetaClient();
    this.phoneNumberId = this.client.getPhoneNumberId();
  }

  /**
   * Send a template message
   * 
   * Templates must be pre-approved by Meta before use.
   * This is the primary method for sending WhatsApp messages.
   * 
   * INCLUDES: Daily limit guard check before sending
   */
  async sendTemplateMessage(message: TemplateMessage): Promise<MessageResponse> {
    try {
      // 🛡️ GUARD: Check daily conversation limit BEFORE API call
      const limitCheck = await this.limitGuard.checkLimit(message.to);
      
      if (!limitCheck.allowed) {
        console.warn('[MessageService] Daily limit exceeded:', {
          recipient: message.to,
          currentCount: limitCheck.currentCount,
          limit: limitCheck.limit,
          reason: limitCheck.reason,
        });
        
        throw new DailyLimitExceededError(
          limitCheck.reason || 'Daily conversation limit exceeded',
          limitCheck.currentCount || 0,
          limitCheck.limit || 200
        );
      }
      
      console.log('[MessageService] Limit check passed:', {
        recipient: message.to,
        existingConversation: limitCheck.existingConversation,
        reason: limitCheck.reason,
      });

      // 🧪 DRY RUN MODE: Simulate message send without hitting Meta API
      // SAFETY: This check happens BEFORE any real API call
      const isDryRun = process.env.META_DRY_RUN === "true";
      const hasRealCredentials = process.env.WHATSAPP_ACCESS_TOKEN && 
                                  process.env.WHATSAPP_ACCESS_TOKEN !== 'your_whatsapp_access_token';
      
      if (isDryRun || !hasRealCredentials) {
        const reason = isDryRun ? 'DRY_RUN_ENABLED' : 'NO_REAL_CREDENTIALS';
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🧪 [${reason}] SIMULATING WhatsApp Send`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 Recipient:', message.to);
        console.log('📋 Template:', message.template.name);
        console.log('🌐 Language:', message.template.language.code);
        console.log('⚠️  NO REAL API CALL MADE TO META');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const mockResponse: MessageResponse = {
          messaging_product: 'whatsapp',
          contacts: [{
            input: message.to,
            wa_id: message.to,
          }],
          messages: [{
            id: `wamid.mock_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          }],
        };

        return mockResponse;
      }
      
      // 🚨 REAL API CALL ABOUT TO HAPPEN
      console.warn('⚠️  REAL META API CALL INITIATED - This will count against your quota!');

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.to,
        type: 'template',
        template: message.template,
      };

      const response = await this.client.post<MessageResponse>(
        `/${this.phoneNumberId}/messages`,
        payload
      );

      console.log('[MessageService] Template message sent successfully:', {
        messageId: response.messages[0]?.id,
        recipient: message.to,
        template: message.template.name,
      });

      return response;
    } catch (error) {
      // Log contextual information for observability
      console.error('[MessageService] Template message send failed:', {
        recipient: message.to,
        template: message.template.name,
        error: error instanceof MetaApiError ? error.toLogString() : String(error),
      });
      
      // Propagate original error unchanged - DO NOT WRAP
      // Route layer needs MetaApiError properties (code, type, fbtraceId, isRetryable)
      throw error;
    }
  }

  /**
   * Send a simple text message
   * 
   * Note: Text messages can only be sent within 24 hours of the last
   * user-initiated message (customer service window).
   * 
   * INCLUDES: Daily limit guard check before sending
   */
  async sendTextMessage(message: TextMessage): Promise<MessageResponse> {
    try {
      // 🛡️ GUARD: Check daily conversation limit BEFORE API call
      const limitCheck = await this.limitGuard.checkLimit(message.to);
      
      if (!limitCheck.allowed) {
        console.warn('[MessageService] Daily limit exceeded:', {
          recipient: message.to,
          currentCount: limitCheck.currentCount,
          limit: limitCheck.limit,
          reason: limitCheck.reason,
        });
        
        throw new DailyLimitExceededError(
          limitCheck.reason || 'Daily conversation limit exceeded',
          limitCheck.currentCount || 0,
          limitCheck.limit || 200
        );
      }
      
      console.log('[MessageService] Limit check passed:', {
        recipient: message.to,
        existingConversation: limitCheck.existingConversation,
        reason: limitCheck.reason,
      });

      // 🧪 DRY RUN MODE: Simulate message send without hitting Meta API
      const isDryRun = process.env.META_DRY_RUN === "true";
      const hasRealCredentials = process.env.WHATSAPP_ACCESS_TOKEN && 
                                  process.env.WHATSAPP_ACCESS_TOKEN !== 'your_whatsapp_access_token';
      
      if (isDryRun || !hasRealCredentials) {
        const reason = isDryRun ? 'DRY_RUN_ENABLED' : 'NO_REAL_CREDENTIALS';
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`🧪 [${reason}] SIMULATING WhatsApp Text Send`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📱 Recipient:', message.to);
        console.log('💬 Message:', message.text.body.substring(0, 50) + '...');
        console.log('⚠️  NO REAL API CALL MADE TO META');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        const mockResponse: MessageResponse = {
          messaging_product: 'whatsapp',
          contacts: [{
            input: message.to,
            wa_id: message.to,
          }],
          messages: [{
            id: `wamid.mock_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          }],
        };

        return mockResponse;
      }
      
      // 🚨 REAL API CALL ABOUT TO HAPPEN
      console.warn('⚠️  REAL META API CALL INITIATED - This will count against your quota!');

      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: message.to,
        type: 'text',
        text: message.text,
      };

      const response = await this.client.post<MessageResponse>(
        `/${this.phoneNumberId}/messages`,
        payload
      );

      console.log('[MessageService] Text message sent successfully:', {
        messageId: response.messages[0]?.id,
        recipient: message.to,
      });

      return response;
    } catch (error) {
      // Log contextual information for observability
      console.error('[MessageService] Text message send failed:', {
        recipient: message.to,
        error: error instanceof MetaApiError ? error.toLogString() : String(error),
      });
      
      // Propagate original error unchanged - DO NOT WRAP
      throw error;
    }
  }

  /**
   * Mark a message as read
   * 
   * This should be called when processing incoming messages
   * to maintain proper conversation state.
   */
  async markMessageAsRead(messageId: string): Promise<{ success: boolean }> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId,
      };

      const response = await this.client.post<{ success: boolean }>(
        `/${this.phoneNumberId}/messages`,
        payload
      );

      return response;
    } catch (error) {
      // Log contextual information for observability
      console.error('[MessageService] Mark message as read failed:', {
        messageId,
        error: error instanceof MetaApiError ? error.toLogString() : String(error),
      });
      
      // Don't throw - marking as read is not critical for message delivery
      return { success: false };
    }
  }

  /**
   * Send a template message with dynamic parameters
   * 
   * Helper method to simplify sending templates with parameter substitution.
   */
  async sendTemplateWithParams(
    to: string,
    templateName: string,
    languageCode: string,
    headerParams?: string[],
    bodyParams?: string[],
    buttonParams?: Array<{ index: number; text: string }>
  ): Promise<MessageResponse> {
    const components: TemplateMessageComponent[] = [];

    // Add header parameters
    if (headerParams && headerParams.length > 0) {
      components.push({
        type: 'header',
        parameters: headerParams.map((text) => ({ type: 'text', text })),
      });
    }

    // Add body parameters
    if (bodyParams && bodyParams.length > 0) {
      components.push({
        type: 'body',
        parameters: bodyParams.map((text) => ({ type: 'text', text })),
      });
    }

    // Add button parameters
    if (buttonParams && buttonParams.length > 0) {
      buttonParams.forEach((button) => {
        components.push({
          type: 'button',
          sub_type: 'url',
          index: button.index.toString(),
          parameters: [{ type: 'text', text: button.text }],
        });
      });
    }

    const message: TemplateMessage = {
      type: 'template',
      to,
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components: components.length > 0 ? components : undefined,
      },
    };

    return this.sendTemplateMessage(message);
  }
}

/**
 * Create a singleton instance of the Message Service
 */
let serviceInstance: MessageService | null = null;

export function getMessageService(): MessageService {
  if (!serviceInstance) {
    serviceInstance = new MessageService();
  }
  return serviceInstance;
}

/**
 * Create a new Message Service with custom configuration
 */
export function createMessageService(client: MetaAPIClient): MessageService {
  return new MessageService(client);
}
