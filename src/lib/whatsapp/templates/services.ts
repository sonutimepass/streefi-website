import { 
  DynamoDBClient, 
  PutItemCommand, 
  GetItemCommand, 
  UpdateItemCommand,
  DeleteItemCommand, 
  ScanCommand 
} from "@aws-sdk/client-dynamodb";
import { randomUUID } from "crypto";
import { WhatsAppTemplate } from "./types";

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

// WhatsApp templates use streefi_whatsapp table (PK/SK schema)
// Admin auth uses streefi_admins table (email schema)
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "streefi_whatsapp";

/**
 * Create a new WhatsApp template
 * Uses Single Table Design with PK/SK pattern
 */
export async function createTemplate(
  data: Omit<WhatsAppTemplate, "templateId" | "createdAt" | "updatedAt" | "status" | "metaStatus">
): Promise<WhatsAppTemplate> {
  const templateId = randomUUID();
  const now = new Date().toISOString();

  const template: WhatsAppTemplate = {
    templateId,
    status: "draft",
    metaStatus: "NOT_SUBMITTED",
    createdAt: now,
    updatedAt: now,
    ...data,
  };

  const item = {
    PK: { S: `TEMPLATE#${templateId}` },
    SK: { S: "METADATA" },
    
    templateId: { S: templateId },
    name: { S: template.name },
    category: { S: template.category },
    language: { S: template.language },
    variables: { L: template.variables.map(v => ({ S: v })) }, // List allows empty arrays
    
    status: { S: template.status },
    metaStatus: { S: template.metaStatus },
    
    createdAt: { S: template.createdAt },
    updatedAt: { S: template.updatedAt },
  };

  console.log('[Template Service] Creating template:', {
    table: TABLE_NAME,
    templateId,
    name: template.name,
    PK: item.PK.S,
    SK: item.SK.S,
  });

  await dynamoClient.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  console.log('[Template Service] Template created successfully:', templateId);

  return template;
}

/**
 * List all templates
 * Uses Scan for now (can optimize with GSI later)
 */
export async function listTemplates(): Promise<WhatsAppTemplate[]> {
  console.log('[Template Service] Listing templates from table:', TABLE_NAME);

  const result = await dynamoClient.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: "begins_with(PK, :prefix) AND SK = :sk",
      ExpressionAttributeValues: {
        ":prefix": { S: "TEMPLATE#" },
        ":sk": { S: "METADATA" },
      },
    })
  );

  console.log('[Template Service] Scan result:', {
    count: result.Count,
    scannedCount: result.ScannedCount,
    itemCount: result.Items?.length || 0,
  });

  return (result.Items || []).map(item => ({
    templateId: item.templateId?.S || "",
    name: item.name?.S || "",
    category: item.category?.S as any,
    language: item.language?.S || "",
    variables: item.variables?.L?.map(v => v.S || "") || [],
    status: item.status?.S as any,
    metaStatus: item.metaStatus?.S as any,
    createdAt: item.createdAt?.S || "",
    updatedAt: item.updatedAt?.S || "",
  }));
}

/**
 * Get a single template by ID
 */
export async function getTemplate(templateId: string): Promise<WhatsAppTemplate | null> {
  const result = await dynamoClient.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: { S: `TEMPLATE#${templateId}` },
        SK: { S: "METADATA" },
      },
    })
  );

  if (!result.Item) {
    return null;
  }

  return {
    templateId: result.Item.templateId?.S || "",
    name: result.Item.name?.S || "",
    category: result.Item.category?.S as any,
    language: result.Item.language?.S || "",
    variables: result.Item.variables?.L?.map(v => v.S || "") || [],
    status: result.Item.status?.S as any,
    metaStatus: result.Item.metaStatus?.S as any,
    createdAt: result.Item.createdAt?.S || "",
    updatedAt: result.Item.updatedAt?.S || "",
  };
}

/**
 * Update a template
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<Omit<WhatsAppTemplate, "templateId" | "createdAt" | "updatedAt">>
): Promise<WhatsAppTemplate | null> {
  const updateParts: string[] = [];
  const expressionAttributeNames: Record<string, string> = {};
  const expressionAttributeValues: Record<string, any> = {};

  if (updates.name !== undefined) {
    updateParts.push("#name = :name");
    expressionAttributeNames["#name"] = "name";
    expressionAttributeValues[":name"] = { S: updates.name };
  }

  if (updates.category !== undefined) {
    updateParts.push("#category = :category");
    expressionAttributeNames["#category"] = "category";
    expressionAttributeValues[":category"] = { S: updates.category };
  }

  if (updates.language !== undefined) {
    updateParts.push("#language = :language");
    expressionAttributeNames["#language"] = "language";
    expressionAttributeValues[":language"] = { S: updates.language };
  }

  if (updates.variables !== undefined) {
    updateParts.push("#variables = :variables");
    expressionAttributeNames["#variables"] = "variables";
    expressionAttributeValues[":variables"] = { L: updates.variables.map(v => ({ S: v })) };
  }

  if (updates.status !== undefined) {
    updateParts.push("#status = :status");
    expressionAttributeNames["#status"] = "status";
    expressionAttributeValues[":status"] = { S: updates.status };
  }

  if (updates.metaStatus !== undefined) {
    updateParts.push("#metaStatus = :metaStatus");
    expressionAttributeNames["#metaStatus"] = "metaStatus";
    expressionAttributeValues[":metaStatus"] = { S: updates.metaStatus };
  }

  // Always update timestamp
  updateParts.push("#updatedAt = :updatedAt");
  expressionAttributeNames["#updatedAt"] = "updatedAt";
  expressionAttributeValues[":updatedAt"] = { S: new Date().toISOString() };

  if (updateParts.length === 1) {
    // No actual updates except timestamp
    return getTemplate(templateId);
  }

  await dynamoClient.send(
    new UpdateItemCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: { S: `TEMPLATE#${templateId}` },
        SK: { S: "METADATA" },
      },
      UpdateExpression: `SET ${updateParts.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    })
  );

  return getTemplate(templateId);
}

/**
 * Delete a template
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  await dynamoClient.send(
    new DeleteItemCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: { S: `TEMPLATE#${templateId}` },
        SK: { S: "METADATA" },
      },
    })
  );
}