import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

// DynamoDB region - AWS credentials managed by Amplify IAM policy
export const dynamoClient = new DynamoDBClient({
  region: "ap-south-1",
  maxAttempts: 3, // retry strategy for transient errors
});

export const TABLES = {
  ADMINS: process.env.ADMIN_TABLE_NAME || "streefi_admins",
  SESSIONS: process.env.SESSION_TABLE_NAME || "streefi_sessions",
  WHATSAPP: process.env.DYNAMODB_TABLE_NAME || "streefi_whatsapp",
  WHATSAPP_CONVERSATIONS: process.env.WHATSAPP_CONVERSATIONS_TABLE_NAME || "whatsapp_conversations",
  CAMPAIGNS: process.env.CAMPAIGNS_TABLE_NAME || "streefi_campaigns",
  RECIPIENTS: process.env.RECIPIENTS_TABLE_NAME || "streefi_campaign_recipients",
  CONTACTS: process.env.CONTACTS_TABLE_NAME || "streefi_campaign_contacts",
} as const;
