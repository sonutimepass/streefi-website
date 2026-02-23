/**
 * Meta Template Service
 * 
 * This module handles all template-related operations with Meta's WhatsApp Cloud API.
 * 
 * IMPORTANT: This layer should ONLY contain:
 * - Template API calls to Meta
 * - Response transformation
 * - Error handling specific to template operations
 * 
 * It should NEVER contain:
 * - Database operations
 * - Route handling
 * - Business logic beyond API communication
 */

import { getMetaClient, MetaAPIClient } from './metaClient';

export interface WhatsAppTemplate {
  name: string;
  language: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED';
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  id: string;
  components?: TemplateComponent[];
  rejected_reason?: string;
}

export interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: TemplateButton[];
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
}

export interface TemplateButton {
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  text: string;
  url?: string;
  phone_number?: string;
}

export interface CreateTemplateRequest {
  name: string;
  language: string;
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  components: TemplateComponent[];
}

export interface TemplateListResponse {
  data: WhatsAppTemplate[];
  paging?: {
    cursors?: {
      before: string;
      after: string;
    };
    next?: string;
  };
}

export class TemplateService {
  private client: MetaAPIClient;
  private wabaId: string;

  constructor(client?: MetaAPIClient, wabaId?: string) {
    this.client = client || getMetaClient();
    this.wabaId = wabaId || process.env.META_WABA_ID || '';

    if (!this.wabaId) {
      throw new Error('WhatsApp Business Account ID (WABA ID) is required');
    }
  }

  /**
   * Fetch all message templates for the business account
   */
  async getTemplates(limit: number = 100): Promise<WhatsAppTemplate[]> {
    try {
      const response = await this.client.get<TemplateListResponse>(
        `/${this.wabaId}/message_templates`,
        {
          limit: limit.toString(),
        }
      );

      return response.data || [];
    } catch (error) {
      console.error('[TemplateService] Error fetching templates:', error);
      throw new Error(`Failed to fetch templates from Meta API: ${(error as Error).message}`);
    }
  }

  /**
   * Get a specific template by name and language
   */
  async getTemplateByName(name: string, language: string = 'en_US'): Promise<WhatsAppTemplate | null> {
    try {
      const templates = await this.getTemplates();
      const template = templates.find(
        (t) => t.name === name && t.language === language
      );

      return template || null;
    } catch (error) {
      console.error('[TemplateService] Error fetching template by name:', error);
      throw error;
    }
  }

  /**
   * Create a new message template
   * 
   * Note: Template creation requires Business Manager permissions.
   * Templates need Meta approval before they can be used.
   */
  async createTemplate(templateData: CreateTemplateRequest): Promise<{ id: string; status: string }> {
    try {
      const response = await this.client.post<{ id: string; status: string }>(
        `/${this.wabaId}/message_templates`,
        {
          name: templateData.name,
          language: templateData.language,
          category: templateData.category,
          components: templateData.components,
        }
      );

      return response;
    } catch (error) {
      console.error('[TemplateService] Error creating template:', error);
      throw new Error(`Failed to create template: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a message template
   * 
   * Note: This requires Business Manager permissions.
   */
  async deleteTemplate(templateName: string): Promise<{ success: boolean }> {
    try {
      const response = await this.client.delete<{ success: boolean }>(
        `/${this.wabaId}/message_templates`,
      );

      return response;
    } catch (error) {
      console.error('[TemplateService] Error deleting template:', error);
      throw new Error(`Failed to delete template: ${(error as Error).message}`);
    }
  }

  /**
   * Get templates filtered by status
   */
  async getTemplatesByStatus(
    status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'DISABLED'
  ): Promise<WhatsAppTemplate[]> {
    try {
      const templates = await this.getTemplates();
      return templates.filter((t) => t.status === status);
    } catch (error) {
      console.error('[TemplateService] Error fetching templates by status:', error);
      throw error;
    }
  }

  /**
   * Get only approved templates that can be used for sending messages
   */
  async getApprovedTemplates(): Promise<WhatsAppTemplate[]> {
    return this.getTemplatesByStatus('APPROVED');
  }
}

/**
 * Create a singleton instance of the Template Service
 */
let serviceInstance: TemplateService | null = null;

export function getTemplateService(): TemplateService {
  if (!serviceInstance) {
    serviceInstance = new TemplateService();
  }
  return serviceInstance;
}

/**
 * Create a new Template Service with custom configuration
 */
export function createTemplateService(client: MetaAPIClient, wabaId: string): TemplateService {
  return new TemplateService(client, wabaId);
}
