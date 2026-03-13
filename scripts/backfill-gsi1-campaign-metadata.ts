/**
 * Backfill GSI1 Attributes for Existing Campaigns
 * 
 * This script adds ENTITY_TYPE and CREATED_AT attributes to existing campaign
 * metadata rows in the streefi_campaigns table. These attributes are required
 * for GSI1 to function correctly.
 * 
 * GSI1 Design:
 * - PK: ENTITY_TYPE (value: "CAMPAIGN")
 * - SK: CREATED_AT (timestamp)
 * 
 * Run this AFTER creating GSI1 in AWS Console/IaC and BEFORE deploying
 * the updated repository layer code.
 * 
 * Usage:
 *   ts-node scripts/backfill-gsi1-campaign-metadata.ts
 *   
 * or
 * 
 *   npm run backfill:gsi1
 */

import { 
  DynamoDBClient, 
  ScanCommand, 
  UpdateItemCommand 
} from "@aws-sdk/client-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const TABLE_NAME = process.env.CAMPAIGNS_TABLE_NAME || "streefi_campaigns";

interface BackfillStats {
  scanned: number;
  updated: number;
  skipped: number;
  errors: number;
}

async function backfillCampaignMetadata(): Promise<BackfillStats> {
  const stats: BackfillStats = {
    scanned: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };

  let lastEvaluatedKey: any = undefined;
  let batchCount = 0;

  console.log("🚀 Starting GSI1 backfill for campaign metadata...");
  console.log(`   Table: ${TABLE_NAME}`);
  console.log(`   Region: ap-south-1\n`);

  do {
    try {
      // Scan for campaign metadata rows only
      const scanResult = await client.send(new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "SK = :metadata",
        ExpressionAttributeValues: {
          ":metadata": { S: "METADATA" }
        },
        ExclusiveStartKey: lastEvaluatedKey,
        Limit: 50  // Process in smaller batches to avoid throttling
      }));

      const items = scanResult.Items || [];
      batchCount++;
      
      console.log(`📦 Batch ${batchCount}: Found ${items.length} campaign metadata rows`);

      for (const item of items) {
        stats.scanned++;
        
        const campaignId = item.campaign_id?.S || "unknown";
        
        // Check if already has GSI attributes
        if (item.ENTITY_TYPE && item.CREATED_AT) {
          console.log(`   ⏭️  Skipping ${campaignId} (already has GSI attributes)`);
          stats.skipped++;
          continue;
        }

        try {
          // Get created_at timestamp (fallback to current time if missing)
          const createdAt = item.created_at?.N || Date.now().toString();

          // Update item with GSI attributes
          await client.send(new UpdateItemCommand({
            TableName: TABLE_NAME,
            Key: {
              PK: item.PK,
              SK: item.SK
            },
            UpdateExpression: "SET ENTITY_TYPE = :type, CREATED_AT = :created",
            ExpressionAttributeValues: {
              ":type": { S: "CAMPAIGN" },
              ":created": { N: createdAt }
            }
          }));

          console.log(`   ✅ Updated ${campaignId}`);
          stats.updated++;

          // Small delay to avoid throttling
          await sleep(50);

        } catch (updateError: any) {
          console.error(`   ❌ Error updating ${campaignId}:`, updateError.message);
          stats.errors++;
        }
      }

      lastEvaluatedKey = scanResult.LastEvaluatedKey;

      // Progress indicator
      if (lastEvaluatedKey) {
        console.log(`\n🔄 Continuing to next batch...\n`);
        await sleep(1000);  // Pause between batches
      }

    } catch (scanError) {
      console.error("❌ Error scanning table:", scanError);
      throw scanError;
    }

  } while (lastEvaluatedKey);

  return stats;
}

/**
 * Verify GSI1 is active and populated
 */
async function verifyGSI(): Promise<void> {
  console.log("\n🔍 Verifying GSI1...");
  
  try {
    const { DescribeTableCommand } = await import("@aws-sdk/client-dynamodb");
    
    const describeResult = await client.send(
      new DescribeTableCommand({ TableName: TABLE_NAME })
    );

    const gsi1 = describeResult.Table?.GlobalSecondaryIndexes?.find(
      gsi => gsi.IndexName === "GSI1"
    );

    if (!gsi1) {
      console.warn("⚠️  GSI1 not found on table. Please create it first:");
      console.log("   - PK: ENTITY_TYPE (String)");
      console.log("   - SK: CREATED_AT (Number)");
      console.log("   - Projection: ALL");
      return;
    }

    console.log(`   Status: ${gsi1.IndexStatus}`);
    console.log(`   Item Count: ${gsi1.ItemCount || 0}`);
    
    if (gsi1.IndexStatus !== "ACTIVE") {
      console.warn("⚠️  GSI1 is not ACTIVE yet. Wait for index creation to complete.");
    } else {
      console.log("✅ GSI1 is active and ready");
    }
  } catch (error: any) {
    console.error("❌ Error verifying GSI:", error.message);
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main execution
 */
async function main() {
  console.log("=" .repeat(60));
  console.log("  GSI1 Backfill Script - Campaign Metadata");
  console.log("=" .repeat(60) + "\n");

  // Verify GSI exists
  await verifyGSI();

  // Confirm before proceeding
  console.log("\n⚠️  This script will update campaign metadata rows.");
  console.log("   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n");
  await sleep(5000);

  const startTime = Date.now();

  try {
    const stats = await backfillCampaignMetadata();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n" + "=".repeat(60));
    console.log("✅ Backfill Complete!");
    console.log("=".repeat(60));
    console.log(`\n📊 Statistics:`);
    console.log(`   Scanned:  ${stats.scanned} campaigns`);
    console.log(`   Updated:  ${stats.updated} campaigns`);
    console.log(`   Skipped:  ${stats.skipped} campaigns (already had attributes)`);
    console.log(`   Errors:   ${stats.errors} campaigns`);
    console.log(`   Duration: ${duration}s`);

    if (stats.errors > 0) {
      console.log("\n⚠️  Some items failed to update. Check logs above for details.");
      process.exit(1);
    }

    console.log("\n✅ All campaigns updated successfully!");
    console.log("\n📝 Next Steps:");
    console.log("   1. Verify GSI1 item count matches campaign count");
    console.log("   2. Test GSI1 queries in staging");
    console.log("   3. Deploy updated repository layer code");
    console.log("   4. Begin Phase 1 migration\n");

  } catch (error: any) {
    console.error("\n❌ Backfill failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { backfillCampaignMetadata, verifyGSI };
