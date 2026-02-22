import { DynamoDBClient, GetItemCommand, PutItemCommand, DeleteItemCommand } from "@aws-sdk/client-dynamodb";

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "streefi_admins";
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

// Rate limit check result
export interface RateLimitResult {
  blocked: boolean;
  attempts?: number;
  lockUntil?: number;
  remainingTime?: number;
}

/**
 * Check if IP address is rate limited
 * 
 * @param ip - Client IP address
 * @returns RateLimitResult indicating if access is blocked
 */
export async function checkLoginRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    const rateKey = `RATE#${ip}`;
    
    // Query DynamoDB for rate limit record
    const result = await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          email: { S: rateKey },
        },
      })
    );

    // No record found - allow access
    if (!result.Item) {
      return { blocked: false };
    }

    // Parse rate limit data
    const attempts = parseInt(result.Item.attempts?.N || "0");
    const lockUntil = result.Item.lockUntil?.N ? parseInt(result.Item.lockUntil.N) : undefined;

    // Check if currently locked
    if (lockUntil) {
      const now = Math.floor(Date.now() / 1000);
      
      if (now < lockUntil) {
        // Still locked
        const remainingTime = lockUntil - now;
        console.log(`⚠️ IP ${ip} is locked for ${remainingTime} more seconds`);
        
        return {
          blocked: true,
          attempts,
          lockUntil,
          remainingTime,
        };
      } else {
        // Lock expired - delete record and allow
        console.log(`✅ Lock expired for IP ${ip}, clearing record`);
        await dynamoClient.send(
          new DeleteItemCommand({
            TableName: TABLE_NAME,
            Key: {
              email: { S: rateKey },
            },
          })
        );
        
        return { blocked: false };
      }
    }

    // Not locked - allow access
    return {
      blocked: false,
      attempts,
    };
  } catch (error) {
    console.error("Rate limit check error:", error);
    // On error, fail open (allow access) to prevent lockout from system errors
    return { blocked: false };
  }
}

/**
 * Record a failed login attempt
 * Increments counter and locks IP after MAX_ATTEMPTS
 * 
 * @param ip - Client IP address
 */
export async function recordFailedAttempt(ip: string): Promise<void> {
  try {
    const rateKey = `RATE#${ip}`;
    
    // Get current record
    const result = await dynamoClient.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          email: { S: rateKey },
        },
      })
    );

    const currentAttempts = result.Item?.attempts?.N ? parseInt(result.Item.attempts.N) : 0;
    const newAttempts = currentAttempts + 1;

    // Prepare update data
    const now = Math.floor(Date.now() / 1000);
    const ttl = now + (24 * 60 * 60); // Default TTL: 24 hours
    
    const item: Record<string, any> = {
      email: { S: rateKey },
      ip: { S: ip },
      attempts: { N: newAttempts.toString() },
      lastAttempt: { S: new Date().toISOString() },
      expiresAt: { N: ttl.toString() }, // TTL for automatic cleanup
    };

    // Lock if threshold exceeded
    if (newAttempts >= MAX_ATTEMPTS) {
      const lockUntil = now + (LOCK_DURATION_MINUTES * 60);
      item.lockUntil = { N: lockUntil.toString() };
      // Update TTL to match lock expiration
      item.expiresAt = { N: lockUntil.toString() };
      
      console.log(`🔒 IP ${ip} locked after ${newAttempts} failed attempts (until ${new Date(lockUntil * 1000).toISOString()})`);
    } else {
      console.log(`⚠️ Failed attempt ${newAttempts}/${MAX_ATTEMPTS} for IP ${ip}`);
    }

    // Save to DynamoDB
    await dynamoClient.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: item,
      })
    );
  } catch (error) {
    console.error("Failed to record attempt:", error);
    // Don't throw - we don't want rate limiting errors to break login flow
  }
}

/**
 * Reset failed attempts for an IP (called on successful login)
 * 
 * @param ip - Client IP address
 */
export async function resetAttempts(ip: string): Promise<void> {
  try {
    const rateKey = `RATE#${ip}`;
    
    await dynamoClient.send(
      new DeleteItemCommand({
        TableName: TABLE_NAME,
        Key: {
          email: { S: rateKey },
        },
      })
    );
    
    console.log(`✅ Rate limit reset for IP ${ip}`);
  } catch (error) {
    console.error("Failed to reset attempts:", error);
    // Don't throw - we don't want rate limiting errors to break login flow
  }
}
