import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { cookies } from "next/headers";

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

// Admin auth always uses the admins table (with "email" key)
// WhatsApp templates use separate table (with PK/SK keys)
const TABLE_NAME = process.env.ADMIN_TABLE_NAME || "streefi_admins";

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
    
    // 1. Get cookie name for this session type
    const cookieName = COOKIE_NAMES[requiredType];
    console.log("[AdminAuth] Cookie name:", cookieName);
    
    // 2. Read session ID from cookie
    const cookieStore = await cookies();
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

    // 4. Validate session against DynamoDB
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
 * Validate session by looking up in DynamoDB
 * Sessions are stored with partition key: SESSION#{sessionId}
 */
export async function validateAdminSessionFromDB(
  sessionId: string,
  requiredType: SessionType
): Promise<ValidationResult> {
  try {
    // 1. Fetch session from DynamoDB using partition key pattern
    const sessionKey = `SESSION#${sessionId}`;
    
    const result = await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          email: { S: sessionKey }, // DynamoDB partition key is "email", but we store session key here
        },
      })
    );

    // 2. Check if session exists
    if (!result.Item) {
      return {
        valid: false,
        error: "Session not found in database",
      };
    }

    // 3. Parse session data
    const session = {
      email: result.Item.adminEmail?.S || "", // Actual admin email stored in adminEmail field
      type: result.Item.type?.S || "",
      status: result.Item.status?.S || "",
      createdAt: result.Item.createdAt?.S || "",
      expiresAt: result.Item.expiresAt?.N ? parseInt(result.Item.expiresAt.N) : undefined,
    };

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

    // 6. Check expiration
    if (session.expiresAt) {
      const now = Math.floor(Date.now() / 1000);
      if (now > session.expiresAt) {
        return {
          valid: false,
          error: "Session has expired",
        };
      }
    }

    // 7. Session is valid
    return {
      valid: true,
      session,
    };
  } catch (error) {
    console.error("DynamoDB session validation error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Database validation failed",
    };
  }
}
