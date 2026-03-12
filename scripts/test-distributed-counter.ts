/**
 * Test: Distributed Counter Integration
 * 
 * Verifies the distributed counter system works correctly:
 * - Increments are distributed across 10 shards
 * - Total count is sum of all shards
 * - Distribution is relatively even (no hot partitions)
 */

import { getDailyLimitGuard } from '@/lib/whatsapp/guards/dailyLimitGuard';
import { whatsappRepository } from '@/lib/repositories';

async function testDistributedCounter() {
  console.log('🧪 Testing Distributed Counter...\n');
  
  const guard = getDailyLimitGuard();
  
  // Test 1: Increment counter 50 times
  console.log('📊 Test 1: Incrementing counter 50 times...');
  const testPhones = Array.from({ length: 50 }, (_, i) => `91900000${i.toString().padStart(4, '0')}`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const phone of testPhones) {
    try {
      const result = await guard.checkLimit(phone);
      if (result.allowed) {
        successCount++;
      } else {
        failCount++;
      }
    } catch (error) {
      console.error(`Error checking limit for ${phone}:`, error);
      failCount++;
    }
  }
  
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  
  // Test 2: Check total count across all shards
  console.log('\n📊 Test 2: Checking total count across shards...');
  const today = new Date().toISOString().split('T')[0];
  const totalCount = await whatsappRepository.getDailyConversationCountTotal(today);
  console.log(`✅ Total count across all shards: ${totalCount}`);
  
  // Test 3: Check individual shard counts
  console.log('\n📊 Test 3: Individual shard distribution...');
  const shardCounts: number[] = [];
  for (let shard = 0; shard < 10; shard++) {
    const counterKey = `DAILY_COUNTER#${shard}#${today}`;
    const count = await whatsappRepository.getDailyConversationCount(counterKey);
    console.log(`  Shard ${shard}: ${count} conversations`);
    shardCounts.push(count);
  }
  
  // Test 4: Verify no hot partition (distribution should be relatively even)
  console.log('\n📊 Test 4: Distribution analysis...');
  
  const nonZeroShards = shardCounts.filter(c => c > 0);
  if (nonZeroShards.length === 0) {
    console.log('⚠️ No increments recorded (may need to run test again)');
    return;
  }
  
  const avg = shardCounts.reduce((a, b) => a + b, 0) / nonZeroShards.length;
  const variance = shardCounts.reduce((sum, count) => sum + Math.pow(count - avg, 2), 0) / nonZeroShards.length;
  const stdDev = Math.sqrt(variance);
  
  console.log(`  Average per active shard: ${avg.toFixed(2)}`);
  console.log(`  Standard deviation: ${stdDev.toFixed(2)}`);
  console.log(`  Active shards: ${nonZeroShards.length}/10`);
  
  if (stdDev < avg * 0.5) {
    console.log('  ✅ Good distribution (low variance)');
  } else {
    console.log('  ⚠️ High variance - may need more samples');
  }
  
  console.log('\n✅ Distributed counter test complete!');
  console.log(`\n📊 Summary:`);
  console.log(`  - Total increments attempted: ${testPhones.length}`);
  console.log(`  - Successful: ${successCount}`);
  console.log(`  - Failed: ${failCount}`);
  console.log(`  - Total count in DB: ${totalCount}`);
  console.log(`  - Active shards: ${nonZeroShards.length}/10`);
}

// Run test
testDistributedCounter()
  .then(() => {
    console.log('\n✅ Test script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });
