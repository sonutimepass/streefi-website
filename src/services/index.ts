/**
 * Service Layer Exports
 *
 * Central point for importing services across the application.
 * Services handle business logic and orchestration.
 */

// Legacy service (keep for backward compatibility)
export * from './vendorService';

// New architecture services (repository-backed)
export { AuthService, authService } from './authService';
export { CampaignService, campaignService } from './campaignService';
export { WhatsAppService, whatsappService } from './whatsappService';
