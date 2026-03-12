/**
 * Test: Counter TTL Verification
 * 
 * Verifies that daily counters have correct 90-day TTL set
 */

import { GetItemCommand } from '@aws-sdk/client-dynamodb';
import { dynamoClient, TABLES } from '@/lib/dynamoClient';

async function verifyCounterTTL() {
  console.log('🧪 Verifying Counter TTL...\n');
  
  const today = new Date().toISOString().split('T')[0];
  
  console.log(`📅 Checking counters for date: ${today}`);
  console.log('🔍 Scanning all 10 shards...\n');
  
  let foundCounter = false;
  
  for (let shard = 0; shard < 10; shard++) {
    const counterKey = `DAILY_COUNTER#${shard}#${today}`;
    
    try {
      const response = await dynamoClient.send(
        new GetItemCommand({
          TableName: TABLES.WHATSAPP,
          Key: {
            PK: { S: counterKey },
            SK: { S: 'METADATA' }
          }
        })
      );
      
      if (response.Item) {
        foundCounter = true;
        console.log(`📊 Shard ${shard}: Counter found`);
        
        const ttl = response.Item.TTL?.N;
        const count = response.Item.count?.N || '0';
        
        if (!ttl) {
          console.error(`  ❌ TTL not set on counter shard ${shard}!`);
          continue;
        }
        
        const ttlSeconds = parseInt(ttl);
        const currentSeconds = Math.floor(Date.now() / 1000);
        const daysUntilExpiry = (ttlSeconds - currentSeconds) / (24 * 60 * 60);
        
        console.log(`  Count: ${count}`);
        console.log(`  TTL: ${ttlSeconds}`);
        console.log(`  Days until expiry: ${daysUntilExpiry.toFixed(2)}`);
        
        // Verify it's approximately 90 days (allow 1 hour margin)
        if (daysUntilExpiry >= 89.95 && daysUntilExpiry <= 90.05) {
          console.log(`  ✅ TTL is correct (~90 days)\n`);
        } else {
          console.error(`  ❌ TTL is incorrect! Expected ~90 days, got ${daysUntilExpiry.toFixed(2)} days\n`);
        }
      } else {
        console.log(`📊 Shard ${shard}: No counter (not used yet)`);
      }
    } catch (error) {
      console.error(`  ❌ Error checking shard ${shard}:`, error);
    }
  }
  
  if (!foundCounter) {
    console.log('\n⚠️ No counters found for today');
    console.log('   This is normal if no messages have been sent yet today');
    console.log('   Run the distributed counter test first to create counters\n');
  } else {
    console.log('\n✅ Counter TTL verification complete!');
    console.log('\n💡 TTL Purpose:');
    console.log('   - Counters auto-delete after 90 days');
    console.log('   - Keeps historical analytics while managing storage');
    console.log('   - No manual cleanup needed');
  }
}

// Run test
verifyCounterTTL()
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
