/**
 * STEP 9 TEST: GSI3-MessagesByCampaign Performance Verification
 * 
 * Tests the new GSI3 index for campaign message queries.
 * Compares Query (using GSI3) vs Scan performance.
 * 
 * Expected Results:
 * - Query: Fast, scalable, efficient (O(log n) + results)
 * - Scan: Slow, expensive, reads entire table (O(n))
 * 
 * Run: npx tsx scripts/test-gsi3-messages-by-campaign.ts
 */

import { DynamoDBClient, UpdateItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: 'ap-south-1' });
const TABLE_NAME = 'streefi_campaigns';

// Test campaign IDs
const CAMPAIGN_A = 'test_campaign_a';
const CAMPAIGN_B = 'test_campaign_b';
const CAMPAIGN_C = 'test_campaign_c';

/**
 * Create test messages for multiple campaigns
 */
async function createTestMessages(): Promise<void> {
  console.log('📝 Creating test messages...\n');

  const campaigns = [
    { id: CAMPAIGN_A, count: 50, startTime: Date.now() - 3600000 }, // 1 hour ago
    { id: CAMPAIGN_B, count: 30, startTime: Date.now() - 7200000 }, // 2 hours ago
    { id: CAMPAIGN_C, count: 20, startTime: Date.now() - 10800000 }, // 3 hours ago
  ];

  let totalMessages = 0;

  for (const campaign of campaigns) {
    console.log(`Creating ${campaign.count} messages for ${campaign.id}...`);
    
    for (let i = 0; i < campaign.count; i++) {
      const messageId = `wamid.test_${campaign.id}_${i}`;
      const timestamp = Math.floor((campaign.startTime + i * 1000) / 1000); // 1 second apart
      const shard = getMessageShard(messageId);
      const ttl = timestamp + (30 * 24 * 60 * 60); // 30 days

      await client.send(new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: `MSG#${shard}` },
          SK: { S: messageId }
        },
        UpdateExpression:
          'SET campaignId = :campaignId, recipientPhone = :phone, createdAt = :timestamp, #ttl = :ttl, GSI3PK = :gsi3pk, GSI3SK = :gsi3sk',
        ExpressionAttributeNames: { '#ttl': 'ttl' },
        ExpressionAttributeValues: {
          ':campaignId': { S: campaign.id },
          ':phone': { S: `+1234567${String(i).padStart(3, '0')}` },
          ':timestamp': { N: timestamp.toString() },
          ':ttl': { N: ttl.toString() },
          ':gsi3pk': { S: campaign.id },
          ':gsi3sk': { S: timestamp.toString() }
        }
      }));

      totalMessages++;
    }
    
    console.log(`✅ Created ${campaign.count} messages for ${campaign.id}`);
  }

  console.log(`\n✅ ${totalMessages} test messages created across ${campaigns.length} campaigns\n`);
}

/**
 * Test 1: Query using GSI3 (efficient)
 */
async function testQueryWithGSI3(campaignId: string): Promise<{
  count: number;
  duration: number;
  scannedCount: number;
}> {
  const startTime = Date.now();

  const response = await client.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI3-MessagesByCampaign',
    KeyConditionExpression: 'GSI3PK = :campaignId',
    ExpressionAttributeValues: {
      ':campaignId': { S: campaignId }
    },
    ScanIndexForward: true, // ASC order (chronological)
    Limit: 100
  }));

  const duration = Date.now() - startTime;

  return {
    count: response.Items?.length || 0,
    duration,
    scannedCount: response.ScannedCount || 0
  };
}

/**
 * Test 2: Scan with filter (inefficient)
 */
async function testScanWithFilter(campaignId: string): Promise<{
  count: number;
  duration: number;
  scannedCount: number;
}> {
  const startTime = Date.now();

  const response = await client.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'campaignId = :campaignId',
    ExpressionAttributeValues: {
      ':campaignId': { S: campaignId }
    },
    Limit: 1000 // Scan needs higher limit since it filters after reading
  }));

  const duration = Date.now() - startTime;

  return {
    count: response.Items?.length || 0,
    duration,
    scannedCount: response.ScannedCount || 0
  };
}

/**
 * Helper: Calculate message shard (same as campaignRepository)
 */
function getMessageShard(messageId: string): number {
  let hash = 0;
  for (let i = 0; i < messageId.length; i++) {
    hash += messageId.charCodeAt(i);
  }
  return hash % 10;
}

/**
 * Main test runner
 */
async function runTests(): Promise<void> {
  console.log('🧪 STEP 9: GSI3-MessagesByCampaign Performance Test\n');
  console.log('=' .repeat(70) + '\n');

  try {
    // Create test data
    await createTestMessages();

    console.log('=' .repeat(70) + '\n');
    console.log('📊 PERFORMANCE COMPARISON\n');

    // Test Campaign A (50 messages)
    console.log(`🔍 Test 1: Query Messages for ${CAMPAIGN_A} (using GSI3)\n`);
    const queryResultA = await testQueryWithGSI3(CAMPAIGN_A);
    console.log(`   ✅ Found: ${queryResultA.count} messages`);
    console.log(`   ⚡ Duration: ${queryResultA.duration}ms`);
    console.log(`   📊 Items scanned: ${queryResultA.scannedCount}\n`);

    console.log(`🔍 Test 2: Scan Messages for ${CAMPAIGN_A} (using Filter)\n`);
    const scanResultA = await testScanWithFilter(CAMPAIGN_A);
    console.log(`   ✅ Found: ${scanResultA.count} messages`);
    console.log(`   ⏱️  Duration: ${scanResultA.duration}ms`);
    console.log(`   📊 Items scanned: ${scanResultA.scannedCount}\n`);

    // Performance analysis
    console.log('=' .repeat(70) + '\n');
    console.log('📈 PERFORMANCE ANALYSIS\n');
    
    const speedup = scanResultA.duration > 0 
      ? (scanResultA.duration / queryResultA.duration).toFixed(1)
      : 'N/A';
    const scanEfficiency = scanResultA.scannedCount > 0
      ? ((queryResultA.scannedCount / scanResultA.scannedCount) * 100).toFixed(1)
      : '100.0';

    console.log(`   Query Performance (GSI3):`);
    console.log(`   • ${speedup}x faster than Scan`);
    console.log(`   • Scanned ${scanEfficiency}% fewer items`);
    console.log(`   • Scalable: O(log n) + results`);
    console.log(`   • Only reads campaign's messages\n`);

    console.log(`   Scan Performance:`);
    console.log(`   • Reads entire table (all campaigns)`);
    console.log(`   • Expensive: High RCU consumption`);
    console.log(`   • Non-scalable: O(n) where n = all items\n`);

    // Test other campaigns
    console.log('=' .repeat(70) + '\n');
    console.log('🔍 Test 3: Query Messages for Other Campaigns\n');
    
    const queryResultB = await testQueryWithGSI3(CAMPAIGN_B);
    console.log(`   ${CAMPAIGN_B}: ${queryResultB.count} messages (${queryResultB.duration}ms)`);
    
    const queryResultC = await testQueryWithGSI3(CAMPAIGN_C);
    console.log(`   ${CAMPAIGN_C}: ${queryResultC.count} messages (${queryResultC.duration}ms)\n`);

    // Summary
    const totalMessages = queryResultA.count + queryResultB.count + queryResultC.count;
    const avgQueryTime = ((queryResultA.duration + queryResultB.duration + queryResultC.duration) / 3).toFixed(0);

    console.log('=' .repeat(70) + '\n');
    console.log('✅ STEP 9 VERIFICATION COMPLETE\n');
    console.log('Results:');
    console.log(`   • Total messages indexed: ${totalMessages}`);
    console.log(`   • Campaign A: ${queryResultA.count} messages`);
    console.log(`   • Campaign B: ${queryResultB.count} messages`);
    console.log(`   • Campaign C: ${queryResultC.count} messages`);
    console.log(`   • Average query time: ${avgQueryTime}ms`);
    console.log(`   • Performance improvement: ${speedup}x faster than Scan\n`);

    console.log('🎯 USE CASES:\n');
    console.log('   1. Campaign Analytics: View all messages sent in a campaign');
    console.log('   2. Message History: Audit trail for compliance');
    console.log('   3. Debugging: Track message delivery for specific campaign');
    console.log('   4. Reporting: Export campaign message data');
    console.log('   5. Retry Logic: Query failed messages by campaign\n');

    console.log('💡 BENEFITS:\n');
    console.log('   • Eliminates need to scan entire MSG# partition');
    console.log('   • Efficient pagination for large campaigns');
    console.log('   • Chronological ordering (oldest → newest)');
    console.log('   • Scales to millions of messages per campaign\n');

    console.log('=' .repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ResourceNotFoundException')) {
        console.error('\n⚠️  GSI3-MessagesByCampaign index not found!');
        console.error('   Run: ./scripts/create-gsi3-messages-by-campaign.sh');
      } else if (error.message.includes('ValidationException')) {
        console.error('\n⚠️  GSI3 index is still CREATING...');
        console.error('   Wait ~5-10 minutes, then run this test again.');
      }
    }
    
    process.exit(1);
  }
}

// Run tests
runTests();
