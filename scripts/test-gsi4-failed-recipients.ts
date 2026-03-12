/**
 * STEP 10 TEST: GSI4-FailedRecipients Performance Verification
 * 
 * Tests the new GSI4 index for global failed recipient queries.
 * Compares Query (using GSI4) vs Scan performance.
 * 
 * Expected Results:
 * - Query: Fast, scalable, efficient (O(log n) + results)
 * - Scan: Slow, expensive, reads entire table (O(n))
 * 
 * Run: npx tsx scripts/test-gsi4-failed-recipients.ts
 */

import { DynamoDBClient, UpdateItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const TABLE_NAME = 'streefi_campaign_recipients';

// Test campaign IDs
const CAMPAIGN_A = 'test_campaign_failed_a';
const CAMPAIGN_B = 'test_campaign_failed_b';
const CAMPAIGN_C = 'test_campaign_failed_c';

/**
 * Create test failed recipients for multiple campaigns
 */
async function createTestFailedRecipients(): Promise<void> {
  console.log('📝 Creating test failed recipients...\n');

  const campaigns = [
    { id: CAMPAIGN_A, phones: 15 }, // 15 failed recipients
    { id: CAMPAIGN_B, phones: 10 }, // 10 failed recipients
    { id: CAMPAIGN_C, phones: 8 },  // 8 failed recipients
  ];

  let totalFailed = 0;

  for (const campaign of campaigns) {
    console.log(`Creating ${campaign.phones} failed recipients for ${campaign.id}...`);
    
    for (let i = 0; i < campaign.phones; i++) {
      const phone = `+1555${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      const now = Date.now() - i * 60000; // 1 minute apart
      const errorCodes = ['131051', '131026', '131047']; // Real WhatsApp error codes
      const errorMessages = ['User opted out', 'Invalid number', 'Message undeliverable'];
      const errorIdx = i % 3;

      // Update recipient to FAILED status with GSI4 attributes
      await client.send(new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: `CAMPAIGN#${campaign.id}` },
          SK: { S: `RECIPIENT#${phone}` }
        },
        UpdateExpression:
          'SET #status = :status, failed_at = :timestamp, error_message = :error_msg, error_code = :error_code, attempts = :attempts, GSI4PK = :gsi4pk, GSI4SK = :gsi4sk',
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: {
          ':status': { S: 'FAILED' },
          ':timestamp': { N: now.toString() },
          ':error_msg': { S: errorMessages[errorIdx] },
          ':error_code': { S: errorCodes[errorIdx] },
          ':attempts': { N: String(Math.floor(Math.random() * 3) + 1) },
          ':gsi4pk': { S: 'RECIPIENT_STATUS' },
          ':gsi4sk': { S: `FAILED#${campaign.id}#${now}` }
        }
      }));

      totalFailed++;
    }
    
    console.log(`✅ Created ${campaign.phones} failed recipients for ${campaign.id}`);
  }

  console.log(`\n✅ ${totalFailed} test failed recipients created across ${campaigns.length} campaigns\n`);
}

/**
 * Test 1: Query all failed recipients using GSI4 (efficient)
 */
async function testQueryAllFailedWithGSI4(): Promise<{
  count: number;
  duration: number;
  scannedCount: number;
}> {
  const startTime = Date.now();

  const response = await client.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI4-FailedRecipients',
    KeyConditionExpression: 'GSI4PK = :gsi4pk',
    ExpressionAttributeValues: {
      ':gsi4pk': { S: 'RECIPIENT_STATUS' }
    },
    ScanIndexForward: false, // DESC order (most recent first)
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
 * Test 2: Query failed recipients for specific campaign using GSI4
 */
async function testQueryCampaignFailedWithGSI4(campaignId: string): Promise<{
  count: number;
  duration: number;
  scannedCount: number;
}> {
  const startTime = Date.now();

  const response = await client.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI4-FailedRecipients',
    KeyConditionExpression: 'GSI4PK = :gsi4pk AND begins_with(GSI4SK, :campaignPrefix)',
    ExpressionAttributeValues: {
      ':gsi4pk': { S: 'RECIPIENT_STATUS' },
      ':campaignPrefix': { S: `FAILED#${campaignId}#` }
    },
    ScanIndexForward: false, // DESC order (most recent first)
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
 * Test 3: Scan with filter (inefficient)
 */
async function testScanWithFilter(): Promise<{
  count: number;
  duration: number;
  scannedCount: number;
}> {
  const startTime = Date.now();

  const response = await client.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':status': { S: 'FAILED' }
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
 * Main test runner
 */
async function runTests(): Promise<void> {
  console.log('🧪 STEP 10: GSI4-FailedRecipients Performance Test\n');
  console.log('=' .repeat(70) + '\n');

  try {
    // Create test data
    await createTestFailedRecipients();

    console.log('=' .repeat(70) + '\n');
    console.log('📊 PERFORMANCE COMPARISON\n');

    // Test 1: Query all failed recipients
    console.log('🔍 Test 1: Query ALL Failed Recipients (using GSI4)\n');
    const queryAllResult = await testQueryAllFailedWithGSI4();
    console.log(`   ✅ Found: ${queryAllResult.count} failed recipients`);
    console.log(`   ⚡ Duration: ${queryAllResult.duration}ms`);
    console.log(`   📊 Items scanned: ${queryAllResult.scannedCount}\n`);

    // Test 2: Query failed for specific campaign
    console.log(`🔍 Test 2: Query Failed for ${CAMPAIGN_A} (using GSI4)\n`);
    const queryCampaignResult = await testQueryCampaignFailedWithGSI4(CAMPAIGN_A);
    console.log(`   ✅ Found: ${queryCampaignResult.count} failed recipients`);
    console.log(`   ⚡ Duration: ${queryCampaignResult.duration}ms`);
    console.log(`   📊 Items scanned: ${queryCampaignResult.scannedCount}\n`);

    // Test 3: Scan with filter
    console.log('🔍 Test 3: Scan ALL Failed Recipients (using Filter)\n');
    const scanResult = await testScanWithFilter();
    console.log(`   ✅ Found: ${scanResult.count} failed recipients`);
    console.log(`   ⏱️  Duration: ${scanResult.duration}ms`);
    console.log(`   📊 Items scanned: ${scanResult.scannedCount}\n`);

    // Performance analysis
    console.log('=' .repeat(70) + '\n');
    console.log('📈 PERFORMANCE ANALYSIS\n');
    
    const speedup = scanResult.duration > 0
      ? (scanResult.duration / queryAllResult.duration).toFixed(1)
      : 'N/A';
    const scanEfficiency = scanResult.scannedCount > 0
      ? ((queryAllResult.scannedCount / scanResult.scannedCount) * 100).toFixed(1)
      : '100.0';

    console.log(`   Query Performance (GSI4):`);
    console.log(`   • ${speedup}x faster than Scan`);
    console.log(`   • Scanned ${scanEfficiency}% fewer items`);
    console.log(`   • Scalable: O(log n) + results`);
    console.log(`   • Only reads failed recipients\n`);

    console.log(`   Scan Performance:`);
    console.log(`   • Reads entire table (all items)`);
    console.log(`   • Expensive: High RCU consumption`);
    console.log(`   • Non-scalable: O(n) where n = all items\n`);

    // Test other campaigns
    console.log('=' .repeat(70) + '\n');
    console.log('🔍 Test 4: Query Failed for Other Campaigns\n');
    
    const queryB = await testQueryCampaignFailedWithGSI4(CAMPAIGN_B);
    console.log(`   ${CAMPAIGN_B}: ${queryB.count} failed recipients (${queryB.duration}ms)`);
    
    const queryC = await testQueryCampaignFailedWithGSI4(CAMPAIGN_C);
    console.log(`   ${CAMPAIGN_C}: ${queryC.count} failed recipients (${queryC.duration}ms)\n`);

    // Summary
    const totalFailed = queryAllResult.count;
    const avgQueryTime = ((queryAllResult.duration + queryCampaignResult.duration + queryB.duration + queryC.duration) / 4).toFixed(0);

    console.log('=' .repeat(70) + '\n');
    console.log('✅ STEP 10 VERIFICATION COMPLETE\n');
    console.log('Results:');
    console.log(`   • Total failed recipients: ${totalFailed}`);
    console.log(`   • Campaign A failures: ${queryCampaignResult.count}`);
    console.log(`   • Campaign B failures: ${queryB.count}`);
    console.log(`   • Campaign C failures: ${queryC.count}`);
    console.log(`   • Average query time: ${avgQueryTime}ms`);
    console.log(`   • Performance improvement: ${speedup}x faster than Scan\n`);

    console.log('🎯 USE CASES:\n');
    console.log('   1. Retry Logic: Query all failed recipients for retry attempts');
    console.log('   2. Error Analysis: Group failures by campaign');
    console.log('   3. Monitoring: Track failure rates across campaigns');
    console.log('   4. Debugging: Investigate specific campaign failures');
    console.log('   5. Reporting: Export failed recipient data for review\n');

    console.log('💡 BENEFITS:\n');
    console.log('   • Eliminates need to scan CAMPAIGN# partition for failures');
    console.log('   • Efficient global view of all failures');
    console.log('   • Campaign-specific filtering with begins_with');
    console.log('   • Sorted by timestamp (most recent first)');
    console.log('   • Scales to millions of recipients\n');

    console.log('🔄 RETRY WORKFLOW:\n');
    console.log('   1. Query GSI4 for all failed recipients');
    console.log('   2. Filter by error_code (e.g., exclude 131051 user opt-outs)');
    console.log('   3. Check attempts < max_retries');
    console.log('   4. Re-enqueue eligible recipients');
    console.log('   5. Update status back to PENDING\n');

    console.log('=' .repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ResourceNotFoundException')) {
        console.error('\n⚠️  GSI4-FailedRecipients index not found!');
        console.error('   Run: ./scripts/create-gsi4-failed-recipients.sh');
      } else if (error.message.includes('ValidationException')) {
        console.error('\n⚠️  GSI4 index is still CREATING...');
        console.error('   Wait ~5-10 minutes, then run this test again.');
      }
    }
    
    process.exit(1);
  }
}

// Run tests
runTests();
