/**
 * Meta Cloud API Client
 * 
 * This module handles all direct communication with Meta's WhatsApp Cloud API.
 * It provides a centralized, type-safe client for making API requests.
 * 
 * IMPORTANT: This layer should NEVER contain:
 * - Database logic
 * - Route/request handling logic
 * - Business logic
 * 
 * It ONLY handles HTTP communication with Meta's API.
 */

interface MetaAPIError {
  message: string;
  type: string;
  code: number;
  error_data?: {
    details: string;
  };
  fbtrace_id?: string;
}

interface MetaAPIResponse<T = any> {
  data?: T;
  error?: MetaAPIError;
}

export class MetaAPIClient {
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';
  private readonly accessToken: string;
  private readonly phoneNumberId: string;

  constructor(accessToken?: string, phoneNumberId?: string) {
    this.accessToken = accessToken || process.env.META_ACCESS_TOKEN || '';
    this.phoneNumberId = phoneNumberId || process.env.META_PHONE_NUMBER_ID || '';

    if (!this.accessToken) {
      throw new Error('Meta Access Token is required');
    }
    if (!this.phoneNumberId) {
      throw new Error('Meta Phone Number ID is required');
    }
  }

  /**
   * Make a GET request to Meta API
   */
  async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Make a POST request to Meta API
   */
  async post<T = any>(endpoint: string, body: any): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Make a DELETE request to Meta API
   */
  async delete<T = any>(endpoint: string): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Handle API response and errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    const data: MetaAPIResponse<T> = await response.json();

    // Check for Meta API errors
    if (data.error) {
      const error = new Error(data.error.message || 'Meta API Error');
      (error as any).code = data.error.code;
      (error as any).type = data.error.type;
      (error as any).fbtrace_id = data.error.fbtrace_id;
      throw error;
    }

    // Check for HTTP errors
    if (!response.ok) {
      throw new Error(`Meta API request failed: ${response.status} ${response.statusText}`);
    }

    return data as T;
  }

  /**
   * Get the configured phone number ID
   */
  getPhoneNumberId(): string {
    return this.phoneNumberId;
  }

  /**
   * Get the base URL for API requests
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

/**
 * Create a singleton instance of the Meta API client
 */
let clientInstance: MetaAPIClient | null = null;

export function getMetaClient(): MetaAPIClient {
  if (!clientInstance) {
    clientInstance = new MetaAPIClient();
  }
  return clientInstance;
}

/**
 * Create a new Meta API client with custom credentials
 */
export function createMetaClient(accessToken: string, phoneNumberId: string): MetaAPIClient {
  return new MetaAPIClient(accessToken, phoneNumberId);
}
