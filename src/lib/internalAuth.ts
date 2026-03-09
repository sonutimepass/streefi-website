/**
 * Internal Operations Authentication
 * 
 * Guards system-level operations from unauthorized access.
 * 
 * SECURITY:
 * - Required for all /api/internal/* endpoints
 * - Uses secret key (INTERNAL_OPERATIONS_KEY environment variable)
 * - Prevents accidental/malicious triggering of:
 *   - Campaign batch execution
 *   - System reconciliation
 *   - Dispatcher operations
 *   - Retry logic
 * 
 * USAGE:
 * ```typescript
 * import { verifyInternalRequest } from '@/lib/internalAuth';
 * 
 * export async function POST(request: Request) {
 *   try {
 *     verifyInternalRequest(request);
 *     // ... internal operation logic
 *   } catch (error) {
 *     return Response.json({ error: 'Unauthorized' }, { status: 403 });
 *   }
 * }
 * ```
 * 
 * CONFIGURATION:
 * Set in environment variables:
 * ```
 * INTERNAL_OPERATIONS_KEY=9f3a7f20e8c1446fbf9aab3d14c7d239
 * ```
 * 
 * CRON/EVENTBRIDGE:
 * Must send header:
 * ```
 * x-internal-key: YOUR_SECRET_KEY
 * ```
 */

export class InternalAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InternalAuthError';
  }
}

/**
 * Verifies that request is from authorized internal system
 * 
 * @throws {InternalAuthError} If authentication fails
 */
export function verifyInternalRequest(request: Request): void {
  const key = request.headers.get('x-internal-key');
  const expectedKey = process.env.INTERNAL_OPERATIONS_KEY;

  // Check if key is configured
  if (!expectedKey) {
    console.error('❌ INTERNAL_OPERATIONS_KEY not configured in environment');
    throw new InternalAuthError('Internal operations key not configured');
  }

  // Check if key was provided
  if (!key) {
    console.warn('⚠️ Internal operation attempted without x-internal-key header');
    throw new InternalAuthError('Missing internal operations key');
  }

  // Verify key matches
  if (key !== expectedKey) {
    console.warn('⚠️ Internal operation attempted with invalid key');
    throw new InternalAuthError('Invalid internal operations key');
  }

  // 🛡️ ORIGIN PROTECTION: Verify request is from trusted host
  // Prevents external attackers from triggering even with stolen key
  const host = request.headers.get('host');
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction && host) {
    const isTrustedHost = host.includes('amplifyapp.com') || 
                          host.includes('streefi.in') ||
                          host.includes('localhost'); // Allow localhost for testing
    
    if (!isTrustedHost) {
      console.warn(`⚠️ Internal operation attempted from untrusted host: ${host}`);
      throw new InternalAuthError('Invalid origin');
    }
  }

  // Success - log for audit trail
  console.log('✅ Internal operation authenticated');
}

/**
 * Helper to create standard error response for failed internal auth
 */
export function createInternalAuthErrorResponse(error: unknown) {
  if (error instanceof InternalAuthError) {
    return Response.json(
      { 
        error: 'Forbidden', 
        message: 'Unauthorized internal operation',
        hint: 'Ensure x-internal-key header is set with valid INTERNAL_OPERATIONS_KEY'
      },
      { status: 403 }
    );
  }

  // Generic error fallback
  return Response.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}
