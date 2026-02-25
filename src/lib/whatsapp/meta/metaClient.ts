/**
 * Meta Cloud API Client
 * 
 * This module handles all direct communication with Meta's WhatsApp Cloud API.
 * It provides a centralized, type-safe client for making API requests.
 * 
 * LAYER RESPONSIBILITY:
 * ✅ Build requests
 * ✅ Send requests
 * ✅ Parse responses
 * ✅ Normalize errors
 * ✅ Simple retry for transient failures
 * 
 * ❌ Rate limiting (belongs to campaign orchestration)
 * ❌ Batching (belongs to campaign orchestration)
 * ❌ Queue management (belongs to campaign orchestration)
 * ❌ Circuit breaker (belongs to campaign orchestration)
 * ❌ Business logic (belongs to services)
 * 
 * Keep this layer thin, stateless, and deterministic.
 */

/**
 * Structured error class for Meta API failures
 * Provides clear error classification for upstream handling
 */
export class MetaApiError extends Error {
  public readonly code: number;
  public readonly type: string;
  public readonly fbtraceId?: string;
  public readonly isRetryable: boolean;
  public readonly httpStatus?: number;

  constructor(
    message: string,
    code: number,
    type: string,
    fbtraceId?: string,
    httpStatus?: number
  ) {
    super(message);
    this.name = 'MetaApiError';
    this.code = code;
    this.type = type;
    this.fbtraceId = fbtraceId;
    this.httpStatus = httpStatus;
    this.isRetryable = this.determineRetryability();
    
    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, MetaApiError.prototype);
  }

  /**
   * Classify error as retryable or permanent
   * 
   * Retryable:
   * - Network errors (ECONNRESET, ETIMEDOUT)
   * - Rate limits (130429)
   * - Server errors (500, 503)
   * - Temporary service issues
   * 
   * Non-retryable:
   * - Authentication failures (190)
   * - Invalid parameters (100, 132000)
   * - Quality restrictions (131031)
   * - Message template not approved
   */
  private determineRetryability(): boolean {
    // Network-level errors
    if (this.code === 500 || this.code === 503) return true;
    
    // Meta rate limit
    if (this.code === 130429) return true;
    
    // Authentication errors - don't retry
    if (this.code === 190 || this.type === 'OAuthException') return false;
    
    // Invalid parameters - don't retry
    if (this.code === 100 || this.code === 132000) return false;
    
    // Quality restrictions - don't retry
    if (this.code === 131031) return false;
    
    // HTTP status-based classification
    if (this.httpStatus) {
      if (this.httpStatus >= 500) return true; // Server errors
      if (this.httpStatus === 429) return true; // Rate limit
      if (this.httpStatus >= 400 && this.httpStatus < 500) return false; // Client errors
    }
    
    // Default to non-retryable for safety
    return false;
  }

  /**
   * Get human-readable error description for logging/debugging
   */
  toLogString(): string {
    return `[MetaApiError] ${this.message} (code: ${this.code}, type: ${this.type}, retryable: ${this.isRetryable}${this.fbtraceId ? `, fbtrace: ${this.fbtraceId}` : ''})`;
  }
}

/**
 * Internal interface for Meta API error responses
 */
interface MetaAPIErrorResponse {
  message: string;
  type: string;
  code: number;
  error_data?: {
    details: string;
  };
  fbtrace_id?: string;
}

/**
 * Internal interface for Meta API responses
 */
interface MetaAPIResponse<T = any> {
  data?: T;
  error?: MetaAPIErrorResponse;
}

export class MetaAPIClient {
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly maxRetries = 2; // Simple retry: 2 attempts for transient failures
  private readonly retryDelay = 300; // 300ms delay between retries

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
   * Make a GET request to Meta API with automatic retry for transient failures
   */
  async get<T = any>(endpoint: string, params?: Record<string, string>): Promise<T> {
    return this.executeWithRetry(async () => {
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
    });
  }

  /**
   * Make a POST request to Meta API with automatic retry for transient failures
   */
  async post<T = any>(endpoint: string, body: any): Promise<T> {
    return this.executeWithRetry(async () => {
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
    });
  }

  /**
   * Make a DELETE request to Meta API with automatic retry for transient failures
   */
  async delete<T = any>(endpoint: string): Promise<T> {
    return this.executeWithRetry(async () => {
      const url = `${this.baseUrl}${endpoint}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return this.handleResponse<T>(response);
    });
  }

  /**
   * Execute request with simple retry logic for transient failures
   * 
   * Retry strategy:
   * - Max 2 attempts
   * - 300ms delay between retries
   * - Only retry if error.isRetryable === true
   * - Throw immediately for non-retryable errors
   * 
   * This is intentionally simple. Complex retry orchestration
   * (exponential backoff, jitter, circuit breaker) belongs in
   * the campaign orchestration layer, not the HTTP client.
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: MetaApiError | Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as MetaApiError | Error;
        
        // If it's not a MetaApiError, don't retry (network errors, etc.)
        if (!(error instanceof MetaApiError)) {
          throw error;
        }
        
        // If error is not retryable, throw immediately
        if (!error.isRetryable) {
          throw error;
        }
        
        // If this was the last attempt, throw
        if (attempt === this.maxRetries) {
          throw error;
        }
        
        // Wait before retrying
        await this.sleep(this.retryDelay);
      }
    }
    
    throw lastError!;
  }

  /**
   * Handle API response and normalize errors
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    let data: MetaAPIResponse<T>;
    
    try {
      data = await response.json();
    } catch (parseError) {
      // If JSON parsing fails, create a structured error
      throw new MetaApiError(
        `Failed to parse Meta API response: ${response.statusText}`,
        response.status,
        'ParseError',
        undefined,
        response.status
      );
    }

    // Check for Meta API errors
    if (data.error) {
      throw new MetaApiError(
        data.error.message || 'Meta API Error',
        data.error.code,
        data.error.type,
        data.error.fbtrace_id,
        response.status
      );
    }

    // Check for HTTP errors without error body
    if (!response.ok) {
      throw new MetaApiError(
        `Meta API request failed: ${response.statusText}`,
        response.status,
        'HttpError',
        undefined,
        response.status
      );
    }

    return data as T;
  }

  /**
   * Simple sleep utility for retry delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
