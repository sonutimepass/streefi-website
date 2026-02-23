/**
 * Meta WhatsApp API Layer
 * 
 * This module provides a clean interface to Meta's WhatsApp Cloud API.
 * 
 * SEPARATION OF CONCERNS:
 * - This layer ONLY handles Meta API communication
 * - NO database operations
 * - NO route/request handling
 * - NO business logic
 * 
 * Usage:
 * ```ts
 * import { getMessageService, getTemplateService } from '@/lib/whatsapp/meta';
 * 
 * const messageService = getMessageService();
 * await messageService.sendTemplateMessage({ ... });
 * ```
 */

// Client
export { 
  MetaAPIClient, 
  getMetaClient, 
  createMetaClient 
} from './metaClient';

// Template Service
export {
  TemplateService,
  getTemplateService,
  createTemplateService,
  type WhatsAppTemplate,
  type TemplateComponent,
  type TemplateButton,
  type CreateTemplateRequest,
  type TemplateListResponse,
} from './templateService';

// Message Service
export {
  MessageService,
  getMessageService,
  createMessageService,
  type TemplateMessage,
  type TemplateMessageComponent,
  type TemplateParameter,
  type TextMessage,
  type MessageResponse,
  type MessageStatus,
} from './messageService';
