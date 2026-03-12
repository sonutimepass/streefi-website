/**
 * Test: Message TTL Verification
 * 
 * Verifies that messages have correct 7-day TTL set
 */

import { whatsappRepository } from '@/lib/repositories';
import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';

async function verifyMessageTTL() {
  console.log('🧪 Verifying Message TTL...\n');
  
  // Step 1: Store a test message
  const testPhone = '919876543210';
  const testMessage = {
    phone: testPhone,
    direction: 'outbound' as const,
    messageId: `test-${Date.now()}`,
    messageType: 'text',
    content: 'TTL test message',
    timestamp: Date.now(),
    status: 'sent',
    vendorId: 'test-wamid'
  };
  
  console.log('📝 Storing test message...');
  await whatsappRepository.storeMessage(testMessage);
  console.log('✅ Message stored');
  
  // Step 2: Read back the message and check TTL
  console.log('\n📖 Reading message back from DynamoDB...');
  const response = await dynamoClient.send(
    new GetItemCommand({
      TableName: TABLES.WHATSAPP,
      Key: {
        PK: { S: `CONV#${testPhone}` },
        SK: { S: `MSG#${testMessage.timestamp}#OUT` }
      }
    })
  );
  
  if (!response.Item) {
    console.error('❌ Message not found in DynamoDB!');
    process.exit(1);
  }
  
  console.log('✅ Message found in DynamoDB');
  
  // Step 3: Verify TTL exists and is correct
  const ttl = response.Item.TTL?.N;
  
  if (!ttl) {
    console.error('❌ TTL attribute not set on message!');
    console.log('Available attributes:', Object.keys(response.Item));
    process.exit(1);
  }
  
  const ttlSeconds = parseInt(ttl);
  const currentSeconds = Math.floor(Date.now() / 1000);
  const daysUntilExpiry = (ttlSeconds - currentSeconds) / (24 * 60 * 60);
  
  console.log(`\n📊 TTL Analysis:`);
  console.log(`  TTL value: ${ttlSeconds}`);
  console.log(`  Current time: ${currentSeconds}`);
  console.log(`  Difference: ${ttlSeconds - currentSeconds} seconds`);
  console.log(`  Days until expiry: ${daysUntilExpiry.toFixed(2)}`);
  
  // Verify it's approximately 7 days (allow 1 hour margin = 0.04 days)
  if (daysUntilExpiry >= 6.95 && daysUntilExpiry <= 7.05) {
    console.log(`\n✅ TTL is correct! (~7 days)`);
    console.log(`   Expected: 7.00 days`);
    console.log(`   Actual:   ${daysUntilExpiry.toFixed(2)} days`);
  } else {
    console.error(`\n❌ TTL is incorrect!`);
    console.error(`   Expected: ~7 days`);
    console.error(`   Actual:   ${daysUntilExpiry.toFixed(2)} days`);
    process.exit(1);
  }
  
  console.log('\n✅ Message TTL verification complete!');
  console.log('\n💡 Cost Impact at 50k users:');
  console.log('   - 7-day retention: 70GB = $17.50/month');
  console.log('   - 90-day retention: 900GB = $225/month');
  console.log('   - Savings: 92% cost reduction!');
}

// Run test
verifyMessageTTL()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
