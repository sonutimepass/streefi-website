import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

// Use default region for build time, will be overridden at runtime
const region = process.env.AWS_REGION || "us-east-1";

// Validate region is configured at runtime (not during build)
if (typeof window === "undefined" && process.env.NODE_ENV !== "production" && !process.env.AWS_REGION) {
  console.warn("⚠️ AWS_REGION not configured. Using default: us-east-1");
}

export const dynamoClient = new DynamoDBClient({
  region,
  maxAttempts: 3, // retry strategy for transient errors
});

export const TABLES = {
  ADMINS: process.env.ADMIN_TABLE_NAME || "streefi_admins",
  SESSIONS: process.env.SESSION_TABLE_NAME || "streefi_sessions",
  WHATSAPP: process.env.DYNAMODB_TABLE_NAME || "streefi_whatsapp",
  CAMPAIGNS: process.env.CAMPAIGNS_TABLE_NAME || "streefi_campaigns",
  RECIPIENTS: process.env.RECIPIENTS_TABLE_NAME || "streefi_campaigns_recipients",
} as const;
