/**
 * Domain Types
 * 
 * Business domain interfaces for the WhatsApp campaign platform.
 * These types represent the core business entities and their relationships.
 * 
 * Architecture:
 * - Domain types are framework-agnostic (no DynamoDB-specific types)
 * - Repository layer converts between DynamoDB and Domain types
 * - Service layer operates on Domain types
 * - API routes consume and return Domain types (after transformation)
 */

// ==================== ADMIN & AUTHENTICATION ====================

/**
 * Admin user in the system
 */
export interface Admin {
  id: string;
  email: string;
  passwordHash: string;
  role: "super_admin" | "admin" | "viewer";
  createdAt: Date;
  lastLoginAt?: Date;
}

/**
 * Admin session
 */
export interface Session {
  token: string;
  adminId: string;
  createdAt: Date;
  expiresAt: Date;
}

/**
 * Login request
 */
export interface LoginRequest {
  adminId: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  success: boolean;
  sessionToken?: string;
  expiresAt?: Date;
  message?: string;
}

// ==================== CAMPAIGN ====================

/**
 * Campaign status lifecycle
 */
export type CampaignStatus =
  | "DRAFT"        // Created but not scheduled
  | "SCHEDULED"    // Scheduled for future execution
  | "RUNNING"      // Currently being executed
  | "PAUSED"       // Paused by admin
  | "COMPLETED"    // All recipients processed
  | "FAILED";      // Campaign failed due to error

/**
 * Campaign metadata
 */
export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  
  // Template configuration
  templateName: string;
  templateParams?: Record<string, string>;
  
  // Recipient metrics
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  receivedCount: number;
  readCount?: number;
  failedCount: number;
  
  // Timing
  createdAt: Date;
  updatedAt?: Date;
  scheduledAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  lastDispatchAt?: Date;
  
  // Configuration
  dailyCap?: number;
  batchSize?: number;
  rateLimit?: number;
}

/**
 * Campaign creation request
 */
export interface CreateCampaignRequest {
  name: string;
  templateName: string;
  templateParams?: Record<string, string>;
  recipients: string[]; // Array of phone numbers
  scheduledAt?: Date;
  batchSize?: number;
  rateLimit?: number;
}

/**
 * Campaign update request
 */
export interface UpdateCampaignRequest {
  name?: string;
  status?: CampaignStatus;
  batchSize?: number;
  rateLimit?: number;
}

/**
 * Campaign metrics summary
 */
export interface CampaignMetrics {
  campaignId: string;
  totalRecipients: number;
  sent: number;
  delivered: number;
  received: number;
  read: number;
  failed: number;
  pending: number;
  processing: number;
  
  // Conversion tracking
  conversions?: number;
  conversionRate?: number;
  
  // Percentages
  deliveryRate: number;
  failureRate: number;
}

// ==================== RECIPIENT ====================

/**
 * Recipient delivery status
 */
export type RecipientStatus =
  | "PENDING"      // Waiting to be sent
  | "PROCESSING"   // Currently being processed
  | "SENT"         // Message sent to WhatsApp API
  | "DELIVERED"    // Delivered to recipient device
  | "RECEIVED"     // Received by recipient (double check)
  | "READ"         // Read by recipient (blue check)
  | "FAILED";      // Failed to send/deliver

/**
 * Campaign recipient
 */
export interface Recipient {
  campaignId: string;
  phone: string;
  status: RecipientStatus;
  attempts: number;
  
  // Timestamps
  createdAt: Date;
  processingAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  receivedAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  
  // Message tracking
  messageId?: string;
  wamid?: string; // WhatsApp message ID
  
  // Error information
  errorMessage?: string;
  errorCode?: string;
  
  // Personalization
  templateParams?: Record<string, string>;
}

/**
 * Bulk recipient creation
 */
export interface BulkRecipientRequest {
  campaignId: string;
  phones: string[];
  templateParams?: Record<string, string>;
}

/**
 * Recipient status update
 */
export interface RecipientStatusUpdate {
  campaignId: string;
  phone: string;
  status: RecipientStatus;
  messageId?: string;
  wamid?: string;
  errorMessage?: string;
  errorCode?: string;
}

// ==================== WHATSAPP TEMPLATE ====================

/**
 * WhatsApp template status
 */
export type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED";

/**
 * Template category
 */
export type TemplateCategory =
  | "MARKETING"
  | "UTILITY"
  | "AUTHENTICATION";

/**
 * WhatsApp template
 */
export interface WhatsAppTemplate {
  name: string;
  status: TemplateStatus;
  language: string;
  category: TemplateCategory;
  
  // Template structure
  components?: TemplateComponent[];
  
  // Metadata
  createdAt: Date;
  updatedAt?: Date;
  approvedAt?: Date;
}

/**
 * Template component (header, body, footer, buttons)
 */
export interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT";
  text?: string;
  example?: {
    header_handle?: string[];
    body_text?: string[][];
  };
  buttons?: TemplateButton[];
}

/**
 * Template button
 */
export interface TemplateButton {
  type: "QUICK_REPLY" | "URL" | "PHONE_NUMBER";
  text: string;
  url?: string;
  phone_number?: string;
}

// ==================== PLATFORM SETTINGS ====================

/**
 * Platform configuration
 */
export interface PlatformSettings {
  killSwitchEnabled: boolean;
  dailyLimit: number;
  rateLimit: number;
  warmupEnabled: boolean;
  updatedAt: Date;
  updatedBy?: string;
}

/**
 * Kill switch configuration
 */
export interface KillSwitch {
  enabled: boolean;
  reason?: string;
  enabledAt?: Date;
  enabledBy?: string;
}

// ==================== ACCOUNT WARMUP ====================

/**
 * Warmup phase
 */
export type WarmupPhase =
  | "PHASE_1"   // 50 messages/day
  | "PHASE_2"   // 100 messages/day
  | "PHASE_3"   // 200 messages/day
  | "PHASE_4"   // 500 messages/day
  | "PHASE_5"   // 1000 messages/day
  | "PRODUCTION"; // No limits

/**
 * Account warmup state
 */
export interface AccountWarmup {
  accountId: string;
  phase: WarmupPhase;
  dailyLimit: number;
  messagesToday: number;
  lastUpdated: Date;
  nextPhaseAt?: Date;
}

// ==================== WEBHOOK EVENTS ====================

/**
 * WhatsApp webhook event type
 */
export type WebhookEventType =
  | "message"
  | "message_status"
  | "error";

/**
 * Message status from webhook
 */
export type WebhookStatus =
  | "sent"
  | "delivered"
  | "read"
  | "failed";

/**
 * Webhook status update
 */
export interface WebhookStatusUpdate {
  messageId: string;
  wamid: string;
  recipientPhone: string;
  status: WebhookStatus;
  timestamp: number;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Webhook message event
 */
export interface WebhookMessageEvent {
  from: string;
  messageId: string;
  timestamp: number;
  type: "text" | "image" | "video" | "document";
  text?: string;
  mediaUrl?: string;
}

// ==================== ANALYTICS & REPORTING ====================

/**
 * Campaign analytics
 */
export interface CampaignAnalytics {
  campaignId: string;
  campaignName: string;
  
  // Timeline
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // in seconds
  
  // Metrics
  metrics: CampaignMetrics;
  
  // Performance
  averageDeliveryTime?: number; // in seconds
  messagesPerMinute?: number;
  
  // Conversion
  conversions?: number;
  conversionRate?: number;
  
  // Cost (if available)
  estimatedCost?: number;
  costPerConversion?: number;
}

/**
 * Daily message counter
 */
export interface DailyCounter {
  date: string; // YYYY-MM-DD
  messagesSent: number;
  messagesDelivered: number;
  messagesFailed: number;
  limit: number;
}

// ==================== ERROR HANDLING ====================

/**
 * Application error
 */
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

/**
 * Error codes
 */
export enum ErrorCode {
  // Authentication
  INVALID_CREDENTIALS = "AUTH_001",
  SESSION_EXPIRED = "AUTH_002",
  UNAUTHORIZED = "AUTH_003",
  
  // Campaign
  CAMPAIGN_NOT_FOUND = "CAMPAIGN_001",
  CAMPAIGN_INVALID_STATUS = "CAMPAIGN_002",
  CAMPAIGN_NO_RECIPIENTS = "CAMPAIGN_003",
  
  // Template
  TEMPLATE_NOT_FOUND = "TEMPLATE_001",
  TEMPLATE_NOT_APPROVED = "TEMPLATE_002",
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED = "RATE_001",
  DAILY_LIMIT_EXCEEDED = "RATE_002",
  
  // WhatsApp API
  WHATSAPP_API_ERROR = "WHATSAPP_001",
  WHATSAPP_INVALID_PHONE = "WHATSAPP_002",
  
  // System
  KILL_SWITCH_ENABLED = "SYSTEM_001",
  DATABASE_ERROR = "SYSTEM_002",
  INTERNAL_ERROR = "SYSTEM_003"
}

// ==================== UTILITY TYPES ====================

/**
 * Pagination request
 */
export interface PaginationRequest {
  limit?: number;
  lastEvaluatedKey?: string;
}

/**
 * Pagination response
 */
export interface PaginatedResponse<T> {
  items: T[];
  lastEvaluatedKey?: string;
  hasMore: boolean;
  total?: number;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: AppError;
  timestamp: Date;
}

/**
 * Health check response
 */
export interface HealthCheck {
  status: "healthy" | "degraded" | "down";
  timestamp: Date;
  services: {
    database: boolean;
    whatsapp: boolean;
    [key: string]: boolean;
  };
  version?: string;
}
