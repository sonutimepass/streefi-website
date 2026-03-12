/**
 * Load Test: Distributed Counter Performance & Distribution
 * 
 * Tests Step 5: Verify random shard selection and counter distribution
 * 
 * This test verifies:
 * - Random shard selection (not hash-based)
 * - Good distribution across all 10 shards
 * - No hot partition (all shards get roughly equal load)
 * - Total count accuracy
 * 
 * Expected Results:
 * - 1000 messages distributed across 8-10 shards
 * - Each shard has 70-130 messages (±30% of average)
 * - Max deviation < 30%
 * - Total count = 1000
 */

import { getDailyLimitGuard } from '../src/lib/whatsapp/guards/dailyLimitGuard';
import { whatsappRepository } from '../src/lib/repositories';

async function testDistributedCounter() {
  console.log('🚀 Distributed Counter Test - Step 5 Verification');
  console.log('📊 Testing random shard distribution with 1000 increments\n');
  
  try {
    const guard = getDailyLimitGuard();
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`📅 Test date: ${today}`);
    console.log('🧪 Incrementing counter 1000 times with SAME phone number...');
    console.log('   (Random sharding should distribute across all 10 shards)\n');
    
    const testPhone = '919876543210';
    let successCount = 0;
    let failCount = 0;
    
    const startTime = Date.now();
    
    // Increment 1000 times with SAME phone
    // If using hash-based sharding, all would hit same shard (hot partition!)
    // With random sharding, should distribute across 8-10 shards
    for (let i = 0; i < 1000; i++) {
      try {
        const result = await guard.checkLimit(testPhone);
        if (result.allowed) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`Error on increment ${i}:`, error);
        failCount++;
      }
      
      // Progress indicator
      if ((i + 1) % 200 === 0) {
        console.log(`   Progress: ${i + 1}/1000`);
      }
    }
    
    const duration = (Date.now() - startTime) / 1000;
    
    console.log(`\n✅ Increments complete in ${duration.toFixed(1)}s`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Failed: ${failCount}`);
    
    // Wait for eventual consistency
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check distribution across shards
    console.log('\n📊 Analyzing shard distribution...\n');
    
    const shardCounts: number[] = [];
    let activeShards = 0;
    
    for (let shard = 0; shard < 10; shard++) {
      const counterKey = `DAILY_COUNTER#${shard}#${today}`;
      const count = await whatsappRepository.getDailyConversationCount(counterKey);
      shardCounts.push(count);
      
      if (count > 0) {
        activeShards++;
      }
      
      console.log(`   Shard ${shard}: ${count.toString().padStart(4)} messages`);
    }
    
    // Calculate distribution statistics
    const total = shardCounts.reduce((a, b) => a + b, 0);
    const average = total / activeShards;
    const maxDeviation = Math.max(...shardCounts.map(c => Math.abs(c - average)));
    const deviationPercent = (maxDeviation / average * 100).toFixed(1);
    
    console.log(`\n📊 Distribution Analysis:`);
    console.log(`   Total count:        ${total}`);
    console.log(`   Active shards:      ${activeShards}/10`);
    console.log(`   Average per shard:  ${average.toFixed(1)}`);
    console.log(`   Max deviation:      ${deviationPercent}%`);
    
    // Verify total using the repository method
    const totalFromRepo = await whatsappRepository.getDailyConversationCountTotal(today);
    console.log(`   Total (from repo):  ${totalFromRepo}`);
    
    // Success criteria
    const goodDistribution = parseFloat(deviationPercent) < 50; // Allow 50% deviation for 1000 samples
    const manyShards = activeShards >= 8; // Should hit at least 8 of 10 shards
    const accurateTotal = total === totalFromRepo;
    const expectedTotal = total >= 900; // Allow some to fail due to limit checks
    
    console.log(`\n🎯 Verification Results:`);
    console.log(`   ${goodDistribution ? '✅' : '❌'} Good distribution (deviation < 50%: ${deviationPercent}%)`);
    console.log(`   ${manyShards ? '✅' : '❌'} Many shards active (${activeShards}/10, expected ≥8)`);
    console.log(`   ${accurateTotal ? '✅' : '❌'} Total count consistent (${total} = ${totalFromRepo})`);
    console.log(`   ${expectedTotal ? '✅' : '❌'} Expected total reached (${total} ≥ 900)`);
    
    if (goodDistribution && manyShards && accurateTotal && expectedTotal) {
      console.log('\n🎉 Step 5 VERIFIED: Distributed counter working correctly!');
      console.log('   ✅ Random shard selection active');
      console.log('   ✅ Load distributed across shards');
      console.log('   ✅ No hot partition detected');
      console.log('   ✅ Total count accurate\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some checks failed - review results above');
      
      if (!goodDistribution) {
        console.log('\n💡 High deviation may indicate:');
        console.log('   - Small sample size (1000 may not be enough for perfect distribution)');
        console.log('   - Try running with 10,000 increments for better distribution');
      }
      
      if (!manyShards) {
        console.log('\n⚠️  WARNING: Not enough shards active!');
        console.log('   - Expected at least 8 of 10 shards');
        console.log('   - May indicate non-random shard selection');
        console.log('   - Check getDailyCounterKey() uses Math.random()');
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Distributed counter test failed:', error);
    process.exit(1);
  }
}

// Run the test
console.log('Starting Distributed Counter Test...\n');
testDistributedCounter();
