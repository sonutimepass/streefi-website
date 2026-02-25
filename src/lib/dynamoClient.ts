import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

const region = process.env.AWS_REGION;

if (!region) {
  throw new Error("AWS_REGION is not defined");
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
  RECIPIENTS: process.env.RECIPIENTS_TABLE_NAME || "streefi_campaign_recipients",
} as const;
