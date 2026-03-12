import { cookies } from "next/headers";
import { sessionRepository } from "./repositories/sessionRepository";
import { validateRequestCSRF, CSRF_COOKIE_NAME } from "./csrf";

// Session types
export type SessionType = "email-session" | "whatsapp-session";

// Cookie name mapping
const COOKIE_NAMES: Record<SessionType, string> = {
  "email-session": "email_admin_session",
  "whatsapp-session": "wa_admin_session",
};

// Validation result type
export interface ValidationResult {
  valid: boolean;
  session?: {
    email: string;
    type: string;
    status: string;
    createdAt: string;
    expiresAt?: number;
  };
  error?: string;
}

/**
 * Validates admin session from DynamoDB
 * 
 * @param request - Next.js Request object
 * @param requiredType - Required session type ("email-session" | "whatsapp-session")
 * @returns ValidationResult with valid status and session data
 */
export async function validateAdminSession(
  request: Request,
  requiredType: SessionType
): Promise<ValidationResult> {
  try {
    console.log("[AdminAuth] Validating session for type:", requiredType);

    // Skip CSRF check in development/bypass mode
    const bypassMode = shouldBypassAuth();
    
    // Get cookies
    const cookieStore = await cookies();
    
    // 1. CSRF check — reject non-GET requests with invalid or missing CSRF token (unless bypassed)
    if (!bypassMode) {
      const csrfCookie = cookieStore.get(CSRF_COOKIE_NAME)?.value;
      if (!validateRequestCSRF(request, csrfCookie)) {
        console.warn("[AdminAuth] CSRF token validation failed");
        return { valid: false, error: "Invalid or missing CSRF token" };
      }
    } else {
      console.log("[AdminAuth] CSRF check skipped (bypass mode)");
    }
    
    // 2. Get cookie name for this session type
    const cookieName = COOKIE_NAMES[requiredType];
    console.log("[AdminAuth] Cookie name:", cookieName);
    
    // 3. Read session ID from cookie
    const sessionCookie = cookieStore.get(cookieName);

    if (!sessionCookie || !sessionCookie.value) {
      console.log("[AdminAuth] No session cookie found");
      return {
        valid: false,
        error: "No session cookie found",
      };
    }

    const sessionId = sessionCookie.value;
    console.log("[AdminAuth] Session ID:", sessionId);

    // 3. Validate session ID format (basic check)
    if (!sessionId.startsWith("sess_")) {
      console.log("[AdminAuth] Invalid session ID format");
      return {
        valid: false,
        error: "Invalid session ID format",
      };
    }

    // 5. Validate session against DynamoDB
    console.log("[AdminAuth] Validating against DynamoDB...");
    const result = await validateAdminSessionFromDB(sessionId, requiredType);
    console.log("[AdminAuth] DynamoDB validation result:", result.valid);
    return result;
    
  } catch (error) {
    console.error("[AdminAuth] Session validation error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Session validation failed",
    };
  }
}

/**
 * Validate session by looking up in DynamoDB sessions table
 * Sessions stored with partition key: session_id (supports multiple devices per admin)
 */
export async function validateAdminSessionFromDB(
  sessionId: string,
  requiredType: SessionType
): Promise<ValidationResult> {
  try {
    console.log('[AdminAuth] Validating session:', sessionId);
    
    // 1. Fetch session from streefi_sessions table using session_id key
    const sessionRecord = await sessionRepository.getSessionById(sessionId);

    // 2. Check if session exists (getSessionById returns null if not found or expired)
    if (!sessionRecord) {
      console.log('[AdminAuth] Session not found or expired');
      return {
        valid: false,
        error: "Session not found or expired",
      };
    }

    // 3. Parse session data
    const session = {
      email: sessionRecord.email,
      type: sessionRecord.type,
      status: sessionRecord.status,
      createdAt: sessionRecord.createdAt,
      expiresAt: sessionRecord.expiresAt,
    };

    console.log('[AdminAuth] Session found for email:', session.email);
    console.log('[AdminAuth] Session type:', session.type, 'Required:', requiredType);
    console.log('[AdminAuth] Session status:', session.status);

    // 4. Check session type matches
    if (session.type !== requiredType) {
      return {
        valid: false,
        error: `Invalid session type. Expected ${requiredType}, got ${session.type}`,
      };
    }

    // 5. Check if session is active
    if (session.status !== "active") {
      return {
        valid: false,
        error: "Session is not active",
      };
    }

    // 6. Expiration is already checked by repository layer

    // 7. Session is valid
    console.log('[AdminAuth] Session validation successful');
    return {
      valid: true,
      session,
    };
  } catch (error) {
    console.error("[AdminAuth] Session validation error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Database validation failed",
    };
  }
}

/**
 * Helper function to check if auth bypass is enabled for local development
 * @returns true if authentication should be bypassed
 */
export function shouldBypassAuth(): boolean {
  const bypass = (
    process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true' ||
    process.env.NODE_ENV === 'development' ||
    !process.env.VERCEL // Not on Vercel = local
  );
  
  console.log('🔍 [AdminAuth] shouldBypassAuth check:', {
    NEXT_PUBLIC_BYPASS_AUTH: process.env.NEXT_PUBLIC_BYPASS_AUTH,
    NODE_ENV: process.env.NODE_ENV,
    VERCEL: process.env.VERCEL,
    result: bypass
  });
  
  return bypass;
}

/**
 * Validates admin session with automatic bypass for local development
 * Use this in API routes for cleaner code
 * 
 * @param request - Next.js Request object
 * @param requiredType - Required session type
 * @returns ValidationResult - always returns valid if bypassed
 */
export async function validateAdminSessionWithBypass(
  request: Request,
  requiredType: SessionType
): Promise<ValidationResult> {
  const bypass = shouldBypassAuth();
  
  console.log(`[AdminAuth] validateAdminSessionWithBypass for ${requiredType}:`, { bypass });
  
  if (bypass) {
    console.log(`✅ [AdminAuth] Auth bypassed for ${requiredType} (local development)`);
    return {
      valid: true,
      session: {
        email: 'local-dev@bypass',
        type: requiredType,
        status: 'active',
        createdAt: new Date().toISOString(),
      }
    };
  }
  
  console.log(`[AdminAuth] No bypass - validating session normally...`);
  return validateAdminSession(request, requiredType);
}
