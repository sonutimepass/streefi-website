/**
 * Repository Layer Index
 * 
 * Central export point for all repository classes.
 * Import repositories from here to ensure consistent usage across the application.
 * 
 * Example usage:
 * ```typescript
 * import { campaignRepository, recipientRepository } from '@/lib/repositories';
 * 
 * const campaign = await campaignRepository.getCampaign(campaignId);
 * const recipients = await recipientRepository.getPendingRecipients(campaignId);
 * ```
 */

export { AdminRepository, adminRepository } from './adminRepository';
export type { AdminRecord, AdminRole } from './adminRepository';

export { SessionRepository, sessionRepository } from './sessionRepository';
export type { SessionRecord } from './sessionRepository';

export { WhatsAppRepository, whatsappRepository } from './whatsappRepository';
export type { 
  WhatsAppTemplate, 
  TemplateCategory, 
  TemplateStatus, 
  MetaStatus,
  PlatformSettings, 
  SystemSettings, 
  KillSwitchStatus, 
  AccountWarmupState 
} from './whatsappRepository';

export { CampaignRepository, campaignRepository } from './campaignRepository';
export type { Campaign, CampaignStatus, CampaignLog, CampaignMetrics, CampaignMetricsRecord, CampaignAnalytics, GlobalPauseState } from './campaignRepository';

export { RecipientRepository, recipientRepository } from './recipientRepository';
export type { Recipient, RecipientStatus } from './recipientRepository';
