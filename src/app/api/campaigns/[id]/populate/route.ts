import { NextRequest, NextResponse } from "next/server";
import { BatchWriteItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { dynamoClient, TABLES } from "@/lib/dynamoClient";
import { validateAdminSession } from "@/lib/adminAuth";
import { Readable } from "stream";
import readline from "readline";

const BATCH_SIZE = 25;

/**
 * Execute BatchWriteItem with automatic retry for UnprocessedItems
 * 
 * DynamoDB may return unprocessed items if throttled.
 * This function retries until all items are written.
 * 
 * Production-safe: prevents data loss on throttling.
 */
async function batchWriteWithRetry(
  items: any[],
  tableName: string
): Promise<void> {
  let requestItems = {
    [tableName]: items,
  };

  let retryCount = 0;
  const maxRetries = 5;

  while (Object.keys(requestItems).length > 0 && retryCount < maxRetries) {
    const response = await dynamoClient.send(
      new BatchWriteItemCommand({
        RequestItems: requestItems,
      })
    );

    // Check for unprocessed items
    if (response.UnprocessedItems && Object.keys(response.UnprocessedItems).length > 0) {
      requestItems = response.UnprocessedItems;
      retryCount++;
      
      // Exponential backoff before retry
      if (retryCount < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
      }
    } else {
      // All items processed
      break;
    }
  }

  if (retryCount >= maxRetries) {
    throw new Error(`Failed to write batch after ${maxRetries} retries. Some items may be unprocessed.`);
  }
}

/**
 * Process CSV file and insert phone numbers into campaign
 * 
 * MEMORY SAFETY:
 * - Streams file line-by-line (no full read into memory)
 * - Batch inserts every 25 records
 * - Validates E.164 format (10-15 digits)
 * - Deduplicates in-memory (acceptable for <200k)
 * 
 * CSV FORMAT:
 * One phone number per line (plain digits, no +)
 * 919876543210
 * 918765432109
 * 919812345678
 */
async function processCSVAndInsert(
  campaignId: string,
  file: File
): Promise<number> {
  // Convert File stream to Node.js Readable stream
  const webStream = file.stream();
  const nodeStream = Readable.fromWeb(webStream as any);

  const rl = readline.createInterface({
    input: nodeStream,
    crlfDelay: Infinity,
  });

  const timestamp = Math.floor(Date.now() / 1000);

  let batch: any[] = [];
  let totalInserted = 0;
  const seenNumbers = new Set<string>();

  for await (const line of rl) {
    const phone = line.trim();

    // Skip empty lines
    if (!phone) continue;

    // Basic E.164 validation: 10-15 digits only
    if (!/^\d{10,15}$/.test(phone)) {
      console.warn(`[CSV] Skipping invalid phone: ${phone}`);
      continue;
    }

    // Deduplicate
    if (seenNumbers.has(phone)) {
      console.warn(`[CSV] Skipping duplicate phone: ${phone}`);
      continue;
    }
    seenNumbers.add(phone);

    // Add to batch
    batch.push({
      PutRequest: {
        Item: {
          PK: { S: `CAMPAIGN#${campaignId}` },
          SK: { S: `USER#${phone}` },
          phone: { S: phone },
          status: { S: "PENDING" },
          attempts: { N: "0" },
          createdAt: { N: timestamp.toString() },
        },
      },
    });

    // Flush batch when it reaches 25 items
    if (batch.length === BATCH_SIZE) {
      await batchWriteWithRetry(batch, TABLES.RECIPIENTS);
      totalInserted += batch.length;
      batch = [];
    }
  }

  // Flush remaining items
  if (batch.length > 0) {
    await batchWriteWithRetry(batch, TABLES.RECIPIENTS);
    totalInserted += batch.length;
  }

  console.log(`[CSV] Inserted ${totalInserted} unique phone numbers for campaign ${campaignId}`);

  return totalInserted;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1️⃣ Validate Admin Session
    const validation = await validateAdminSession(req, "whatsapp-session");
    if (!validation.valid || !validation.session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const campaignId = params.id;
    const timestamp = Math.floor(Date.now() / 1000);

    // 2️⃣ Get CSV file from multipart/form-data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "CSV file required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      return NextResponse.json(
        { error: "File must be a CSV" },
        { status: 400 }
      );
    }

    console.log(`[Populate] Starting population for campaign ${campaignId}`);
    console.log(`[Populate] File: ${file.name}, Size: ${file.size} bytes`);

    // 3️⃣ Set status → POPULATING
    await dynamoClient.send(
      new UpdateItemCommand({
        TableName: TABLES.CAMPAIGNS,
        Key: {
          PK: { S: `CAMPAIGN#${campaignId}` },
          SK: { S: "METADATA" },
        },
        UpdateExpression: "SET #status = :s, updatedAt = :u",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":s": { S: "POPULATING" },
          ":u": { N: timestamp.toString() },
        },
      })
    );

    // 4️⃣ Process CSV and insert recipients (streaming)
    const totalInserted = await processCSVAndInsert(campaignId, file);

    // 5️⃣ Update totalRecipients + status → READY
    await dynamoClient.send(
      new UpdateItemCommand({
        TableName: TABLES.CAMPAIGNS,
        Key: {
          PK: { S: `CAMPAIGN#${campaignId}` },
          SK: { S: "METADATA" },
        },
        UpdateExpression:
          "SET totalRecipients = :t, #status = :r, updatedAt = :u",
        ExpressionAttributeNames: {
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":t": { N: totalInserted.toString() },
          ":r": { S: "READY" },
          ":u": { N: timestamp.toString() },
        },
      })
    );

    console.log(`[Populate] Campaign ${campaignId} ready with ${totalInserted} recipients`);

    return NextResponse.json({
      success: true,
      totalRecipients: totalInserted,
    });

  } catch (error) {
    console.error("[Populate] Population error:", error);
    return NextResponse.json(
      { error: "Population failed" },
      { status: 500 }
    );
  }
}
