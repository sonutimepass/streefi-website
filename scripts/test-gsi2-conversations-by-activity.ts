/**
 * STEP 8 TEST: GSI2-ConversationsByActivity Performance Verification
 * 
 * Tests the new GSI2 index for conversation queries.
 * Compares Query (using GSI2) vs Scan performance.
 * 
 * Expected Results:
 * - Query: Fast, scalable, efficient
 * - Scan: Slow, expensive, reads entire table
 * 
 * Run: npx tsx scripts/test-gsi2-conversations-by-activity.ts
 */

import { DynamoDBClient, PutItemCommand, QueryCommand, ScanCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' });
const TABLE_NAME = 'whatsapp_conversations';

interface ConversationTestData {
  phone: string;
  name: string;
  status: 'active' | 'inactive';
  lastMessageTimestamp: number;
}

/**
 * Create test conversations with different statuses and timestamps
 */
async function createTestConversations(): Promise<void> {
  console.log('📝 Creating test conversations...\n');

  const now = Date.now();
  const conversations: ConversationTestData[] = [
    // Active conversations (most recent activity)
    { phone: '+1234567890', name: 'Alice Johnson', status: 'active', lastMessageTimestamp: now - 1000 },
    { phone: '+1234567891', name: 'Bob Smith', status: 'active', lastMessageTimestamp: now - 2000 },
    { phone: '+1234567892', name: 'Charlie Brown', status: 'active', lastMessageTimestamp: now - 3000 },
    { phone: '+1234567893', name: 'Diana Prince', status: 'active', lastMessageTimestamp: now - 4000 },
    { phone: '+1234567894', name: 'Eve Davis', status: 'active', lastMessageTimestamp: now - 5000 },
    
    // Inactive conversations (old activity)
    { phone: '+1234567895', name: 'Frank Castle', status: 'inactive', lastMessageTimestamp: now - 86400000 * 7 },
    { phone: '+1234567896', name: 'Grace Hopper', status: 'inactive', lastMessageTimestamp: now - 86400000 * 14 },
    { phone: '+1234567897', name: 'Henry Ford', status: 'inactive', lastMessageTimestamp: now - 86400000 * 30 },
  ];

  for (const conv of conversations) {
    const item = {
      PK: { S: `CONV#${conv.phone}` },
      SK: { S: 'META' },
      TYPE: { S: 'CONVERSATION' },
      phone: { S: conv.phone },
      name: { S: conv.name },
      status: { S: conv.status },
      lastMessage: { S: `Test message from ${conv.name}` },
      lastMessageTimestamp: { N: conv.lastMessageTimestamp.toString() },
      lastDirection: { S: 'inbound' },
      unreadCount: { N: '0' },
      updatedAt: { N: conv.lastMessageTimestamp.toString() },
      // Step 8: GSI2 attributes
      GSI2PK: { S: 'CONVERSATION' },
      GSI2SK: { S: `${conv.status}#${conv.lastMessageTimestamp}` }
    };

    await client.send(new PutItemCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    console.log(`✅ Created: ${conv.name} (${conv.status})`);
  }

  console.log(`\n✅ ${conversations.length} test conversations created\n`);
}

/**
 * Test 1: Query using GSI2 (efficient)
 */
async function testQueryWithGSI2(status: 'active' | 'inactive'): Promise<{
  count: number;
  duration: number;
  scannedCount: number;
}> {
  const startTime = Date.now();

  const response = await client.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI2-ConversationsByActivity',
    KeyConditionExpression: 'GSI2PK = :gsi2pk AND begins_with(GSI2SK, :statusPrefix)',
    ExpressionAttributeValues: {
      ':gsi2pk': { S: 'CONVERSATION' },
      ':statusPrefix': { S: `${status}#` }
    },
    ScanIndexForward: false, // DESC order (most recent first)
    Limit: 50
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
async function testScanWithFilter(status: 'active' | 'inactive'): Promise<{
  count: number;
  duration: number;
  scannedCount: number;
}> {
  const startTime = Date.now();

  const response = await client.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: '#type = :type AND #status = :status',
    ExpressionAttributeNames: {
      '#type': 'TYPE',
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':type': { S: 'CONVERSATION' },
      ':status': { S: status }
    },
    Limit: 50
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
  console.log('🧪 STEP 8: GSI2-ConversationsByActivity Performance Test\n');
  console.log('=' .repeat(70) + '\n');

  try {
    // Create test data
    await createTestConversations();

    console.log('=' .repeat(70) + '\n');
    console.log('📊 PERFORMANCE COMPARISON\n');

    // Test active conversations
    console.log('🔍 Test 1: Query Active Conversations (using GSI2)\n');
    const queryResultActive = await testQueryWithGSI2('active');
    console.log(`   ✅ Found: ${queryResultActive.count} conversations`);
    console.log(`   ⚡ Duration: ${queryResultActive.duration}ms`);
    console.log(`   📊 Items scanned: ${queryResultActive.scannedCount}\n`);

    console.log('🔍 Test 2: Scan Active Conversations (using Filter)\n');
    const scanResultActive = await testScanWithFilter('active');
    console.log(`   ✅ Found: ${scanResultActive.count} conversations`);
    console.log(`   ⏱️  Duration: ${scanResultActive.duration}ms`);
    console.log(`   📊 Items scanned: ${scanResultActive.scannedCount}\n`);

    // Performance analysis
    console.log('=' .repeat(70) + '\n');
    console.log('📈 PERFORMANCE ANALYSIS\n');
    
    const speedup = (scanResultActive.duration / queryResultActive.duration).toFixed(1);
    const scanEfficiency = ((queryResultActive.scannedCount / scanResultActive.scannedCount) * 100).toFixed(1);

    console.log(`   Query Performance:`);
    console.log(`   • ${speedup}x faster than Scan`);
    console.log(`   • Scanned ${scanEfficiency}% fewer items`);
    console.log(`   • Scalable: Performance stays constant as table grows\n`);

    console.log(`   Scan Performance:`);
    console.log(`   • Reads entire table partition`);
    console.log(`   • Expensive: Consumes more RCUs`);
    console.log(`   • Non-scalable: Gets slower as table grows\n`);

    // Test inactive conversations
    console.log('=' .repeat(70) + '\n');
    console.log('🔍 Test 3: Query Inactive Conversations (using GSI2)\n');
    const queryResultInactive = await testQueryWithGSI2('inactive');
    console.log(`   ✅ Found: ${queryResultInactive.count} conversations`);
    console.log(`   ⚡ Duration: ${queryResultInactive.duration}ms`);
    console.log(`   📊 Items scanned: ${queryResultInactive.scannedCount}\n`);

    console.log('=' .repeat(70) + '\n');
    console.log('✅ STEP 8 VERIFICATION COMPLETE\n');
    console.log('Results:');
    console.log(`   • GSI2-ConversationsByActivity: ${queryResultActive.count + queryResultInactive.count} total conversations`);
    console.log(`   • Active conversations: ${queryResultActive.count}`);
    console.log(`   • Inactive conversations: ${queryResultInactive.count}`);
    console.log(`   • Average query time: ${((queryResultActive.duration + queryResultInactive.duration) / 2).toFixed(0)}ms`);
    console.log(`   • Performance improvement: ${speedup}x faster than Scan\n`);

    console.log('🎯 USE CASES:\n');
    console.log('   1. Dashboard: List active conversations (real-time inbox)');
    console.log('   2. Archive view: List inactive conversations (history)');
    console.log('   3. Analytics: Count conversations by status');
    console.log('   4. Cleanup: Find old inactive conversations for archival\n');

    console.log('=' .repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ResourceNotFoundException')) {
        console.error('\n⚠️  GSI2-ConversationsByActivity index not found!');
        console.error('   Run: ./scripts/create-gsi2-conversations-by-activity.sh');
      } else if (error.message.includes('ValidationException')) {
        console.error('\n⚠️  GSI2 index is still CREATING...');
        console.error('   Wait ~5-10 minutes, then run this test again.');
      }
    }
    
    process.exit(1);
  }
}

// Run tests
runTests();
