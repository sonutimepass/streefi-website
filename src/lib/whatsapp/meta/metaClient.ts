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
  public readonly retryAfter?: number;

  constructor(
    message: string,
    code: number,
    type: string,
    fbtraceId?: string,
    httpStatus?: number,
    retryAfter?: number
  ) {
    super(message);
    this.name = 'MetaApiError';
    this.code = code;
    this.type = type;
    this.fbtraceId = fbtraceId;
    this.httpStatus = httpStatus;
    this.retryAfter = retryAfter;
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
  error_subcode?: number;
  error_user_title?: string;
  error_user_msg?: string;
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
    console.log('\n🔧 [MetaClient] Initializing Meta API Client...');
    
    // Support both variable naming conventions (WHATSAPP_ and META_)
    this.accessToken = accessToken || 
                       process.env.WHATSAPP_ACCESS_TOKEN || 
                       process.env.META_ACCESS_TOKEN || '';
    this.phoneNumberId = phoneNumberId || 
                         process.env.WHATSAPP_PHONE_ID || 
                         process.env.META_PHONE_NUMBER_ID || '';

    // Debug: Log credential availability
    console.log('🔐 [MetaClient] Credential Check:', {
      hasAccessToken: !!this.accessToken,
      accessTokenLength: this.accessToken?.length || 0,
      accessTokenPreview: this.accessToken ? `${this.accessToken.substring(0, 15)}...` : 'NOT SET',
      hasPhoneNumberId: !!this.phoneNumberId,
      phoneNumberId: this.phoneNumberId || 'NOT SET',
      fromEnvVars: {
        WHATSAPP_ACCESS_TOKEN: !!process.env.WHATSAPP_ACCESS_TOKEN,
        META_ACCESS_TOKEN: !!process.env.META_ACCESS_TOKEN,
        WHATSAPP_PHONE_ID: !!process.env.WHATSAPP_PHONE_ID,
        META_PHONE_NUMBER_ID: !!process.env.META_PHONE_NUMBER_ID,
      }
    });

    // Production mode: Require real credentials
    if (!this.accessToken) {
      console.error('❌ [MetaClient] Access Token missing!');
      console.error('💡 Set WHATSAPP_ACCESS_TOKEN or META_ACCESS_TOKEN environment variable');
      throw new Error('Meta Access Token is required. Set WHATSAPP_ACCESS_TOKEN or META_ACCESS_TOKEN environment variable.');
    }
    if (!this.phoneNumberId) {
      console.error('❌ [MetaClient] Phone Number ID missing!');
      console.error('💡 Set META_PHONE_NUMBER_ID or WHATSAPP_PHONE_ID environment variable');
      throw new Error('Meta Phone Number ID is required. Set META_PHONE_NUMBER_ID or WHATSAPP_PHONE_ID environment variable.');
    }
    
    console.log('✅ [MetaClient] Client initialized successfully\n');
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

      console.log('📤 [MetaClient] POST Request:', {
        endpoint,
        url,
        bodyPreview: JSON.stringify(body).substring(0, 200) + '...',
        timestamp: new Date().toISOString(),
      });
      console.log('📦 [MetaClient] Full Request Body:', JSON.stringify(body, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log('📥 [MetaClient] POST Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: {
          'retry-after': response.headers.get('Retry-After'),
          'x-fb-trace-id': response.headers.get('x-fb-trace-id'),
        },
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
   * Execute request with exponential backoff retry logic
   * 
   * Retry strategy:
   * - Max 2 attempts (3 total tries)
   * - Exponential backoff: 300ms → 600ms → 1200ms
   * - Jitter: ±25% randomization to prevent thundering herd
   * - Only retry if error.isRetryable === true
   * - Respects Retry-After header from Meta API (429 responses)
   * - Throw immediately for non-retryable errors
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: MetaApiError | Error;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`🔄 [MetaClient] Retry attempt ${attempt}/${this.maxRetries}`);
        }
        return await fn();
      } catch (error) {
        lastError = error as MetaApiError | Error;
        const err = error as Error;
        
        console.error(`❌ [MetaClient] Request failed (attempt ${attempt}/${this.maxRetries}):`, {
          errorType: error instanceof MetaApiError ? 'MetaApiError' : (err.constructor?.name || 'Error'),
          message: err.message || String(error),
          ...(error instanceof MetaApiError ? {
            code: error.code,
            type: error.type,
            httpStatus: error.httpStatus,
            fbtraceId: error.fbtraceId,
            isRetryable: error.isRetryable,
            retryAfter: error.retryAfter,
          } : {}),
        });
        
        // If it's not a MetaApiError, don't retry (network errors, etc.)
        if (!(error instanceof MetaApiError)) {
          console.error('❌ [MetaClient] Non-Meta error, not retrying');
          throw error;
        }
        
        // If error is not retryable, throw immediately
        if (!error.isRetryable) {
          console.error('❌ [MetaClient] Error is not retryable, throwing immediately');
          throw error;
        }
        
        // If this was the last attempt, throw
        if (attempt === this.maxRetries) {
          console.error('❌ [MetaClient] Max retries reached, giving up');
          throw error;
        }
        
        // Calculate delay with exponential backoff and jitter
        let delayMs: number;
        
        // If Meta sent a Retry-After header, respect it
        if (error.retryAfter) {
          delayMs = error.retryAfter * 1000; // Convert seconds to ms
          console.log(`⏳ [MetaClient] Respecting Retry-After header: ${error.retryAfter}s`);
        } else {
          // Exponential backoff: 300ms * (2 ^ (attempt - 1))
          const exponentialDelay = this.retryDelay * Math.pow(2, attempt - 1);
          
          // Add jitter: ±25% randomization
          const jitterFactor = 0.75 + Math.random() * 0.5; // Random between 0.75 and 1.25
          delayMs = exponentialDelay * jitterFactor;
        }
        
        console.log(`⏳ [MetaClient] Waiting ${Math.round(delayMs)}ms before retry...`);
        // Wait before retrying
        await this.sleep(delayMs);
      }
    }
    
    throw lastError!;
  }

  /**
   * Handle API response and normalize errors
   * Extracts Retry-After header for rate limit responses
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Extract Retry-After header for rate limiting (429 responses)
    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : undefined;
    
    let data: MetaAPIResponse<T>;
    let responseText: string = '';
    
    try {
      responseText = await response.text();
      console.log('📥 [MetaClient] Response Body:', responseText.substring(0, 500));
      data = JSON.parse(responseText);
    } catch (parseError) {
      // If JSON parsing fails, create a structured error
      const err = parseError as Error;
      console.error('❌ [MetaClient] Failed to parse response:', {
        status: response.status,
        statusText: response.statusText,
        responsePreview: responseText?.substring(0, 200),
        parseError: err.message || String(parseError),
      });
      throw new MetaApiError(
        `Failed to parse Meta API response: ${response.statusText}`,
        response.status,
        'ParseError',
        undefined,
        response.status,
        retryAfter
      );
    }

    // Check for Meta API errors
    if (data.error) {
      console.error('❌ [MetaClient] Meta API Error Response:', {
        code: data.error.code,
        type: data.error.type,
        message: data.error.message,
        fbtrace_id: data.error.fbtrace_id,
        error_subcode: data.error.error_subcode,
        error_user_title: data.error.error_user_title,
        error_user_msg: data.error.error_user_msg,
      });
      throw new MetaApiError(
        data.error.message || 'Meta API Error',
        data.error.code,
        data.error.type,
        data.error.fbtrace_id,
        response.status,
        retryAfter
      );
    }

    // Check for HTTP errors without error body
    if (!response.ok) {
      console.error('❌ [MetaClient] HTTP Error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText,
      });
      throw new MetaApiError(
        `Meta API request failed: ${response.statusText}`,
        response.status,
        'HttpError',
        undefined,
        response.status,
        retryAfter
      );
    }

    console.log('✅ [MetaClient] Request successful');
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
