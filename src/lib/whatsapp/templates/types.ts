export type TemplateCategory = 
  | 'MARKETING'
  | 'UTILITY'
  | 'AUTHENTICATION';

/**
 * Internal status - controlled by admin
 */
export type TemplateStatus =
  | 'draft'
  | 'active'
  | 'archived';

/**
 * Meta/WhatsApp approval status
 */
export type MetaStatus =
  | 'NOT_SUBMITTED'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAUSED';

export interface WhatsAppTemplate {
  templateId: string;
  name: string;
  category: TemplateCategory;
  language: string;
  variables: string[];
  status: TemplateStatus;
  metaStatus: MetaStatus;
  createdAt: string;
  updatedAt: string;
}