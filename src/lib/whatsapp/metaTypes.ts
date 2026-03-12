/**
 * Meta WhatsApp Cloud API Webhook Types
 * 
 * Only includes fields that are actually stored or processed.
 * Excludes 30+ fields that are ignored for dashboard purposes.
 */

export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contacts' | 'interactive' | 'button';
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  video?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  audio?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
  document?: {
    id: string;
    mime_type: string;
    sha256: string;
    filename?: string;
    caption?: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  interactive?: any;
  button?: any;
}

export interface WebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin: {
      type: string;
    };
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
    type?: string; // e.g., 'free_customer_service', 'regular', etc.
  };
  errors?: Array<{
    code: number;
    title: string;
    message?: string;
    error_data?: {
      details: string;
    };
  }>;
}

export interface WebhookContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface WebhookValue {
  messaging_product: string;
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WebhookContact[];
  messages?: WebhookMessage[];
  statuses?: WebhookStatus[];
}

export interface WebhookChange {
  value: WebhookValue;
  field: string;
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WhatsAppWebhook {
  object: string;
  entry: WebhookEntry[];
}

/**
 * Extract text content from message based on type
 */
export function extractMessageContent(message: WebhookMessage): string {
  switch (message.type) {
    case 'text':
      return message.text?.body || '';
    
    case 'image':
      return message.image?.caption || '[Image]';
    
    case 'video':
      return message.video?.caption || '[Video]';
    
    case 'audio':
      return '[Audio]';
    
    case 'document':
      return message.document?.caption || message.document?.filename || '[Document]';
    
    case 'location':
      return message.location?.name || '[Location]';
    
    case 'interactive':
    case 'button':
      return JSON.stringify(message.interactive || message.button || {});
    
    default:
      return `[${message.type}]`;
  }
}

/**
 * Truncate text safely for preview/storage
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Safely truncate object for logging
 */
export function truncateSafely(obj: any, maxLength: number = 500): string {
  try {
    const str = JSON.stringify(obj);
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  } catch {
    return '[Unable to serialize]';
  }
}
