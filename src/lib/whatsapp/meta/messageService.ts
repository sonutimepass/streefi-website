/**
 * Meta Message Service
 * 
 * This module handles all message-sending operations with Meta's WhatsApp Cloud API.
 * 
 * IMPORTANT: This layer should ONLY contain:
 * - Message sending API calls to Meta
 * - Response transformation
 * - Error handling specific to message operations
 * 
 * It should NEVER contain:
 * - Database operations
 * - Route handling
 * - Business logic beyond API communication
 */

import { getMetaClient, MetaAPIClient } from './metaClient';

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

export class MessageService {
  private client: MetaAPIClient;
  private phoneNumberId: string;

  constructor(client?: MetaAPIClient) {
    this.client = client || getMetaClient();
    this.phoneNumberId = this.client.getPhoneNumberId();
  }

  /**
   * Send a template message
   * 
   * Templates must be pre-approved by Meta before use.
   * This is the primary method for sending WhatsApp messages.
   */
  async sendTemplateMessage(message: TemplateMessage): Promise<MessageResponse> {
    try {
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
      console.error('[MessageService] Error sending template message:', {
        error: (error as Error).message,
        recipient: message.to,
        template: message.template.name,
      });
      throw new Error(`Failed to send template message: ${(error as Error).message}`);
    }
  }

  /**
   * Send a simple text message
   * 
   * Note: Text messages can only be sent within 24 hours of the last
   * user-initiated message (customer service window).
   */
  async sendTextMessage(message: TextMessage): Promise<MessageResponse> {
    try {
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
      console.error('[MessageService] Error sending text message:', {
        error: (error as Error).message,
        recipient: message.to,
      });
      throw new Error(`Failed to send text message: ${(error as Error).message}`);
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
      console.error('[MessageService] Error marking message as read:', {
        error: (error as Error).message,
        messageId,
      });
      // Don't throw - marking as read is not critical
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
