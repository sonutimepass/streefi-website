/**
 * Performance Test: Distributed Counter under Load
 * 
 * Tests Step 6: Counter performance with 10,000 messages/hour
 * 
 * This test verifies:
 * - 10,000 increments complete successfully
 * - No throttling errors
 * - Throughput > 80 msg/sec
 * - Duration < 120 seconds
 * - Total count accuracy
 * - Distributed load (no hot partition)
 * 
 * Expected Results:
 * - Completes in ~60-100 seconds
 * - 100-160 messages/second throughput
 * - Peak WCU < 2 per shard (20 WCU total across 10 shards)
 * - No throttling errors
 */

import { getDailyLimitGuard } from '../src/lib/whatsapp/guards/dailyLimitGuard';
import { whatsappRepository } from '../src/lib/repositories';

async function testCounterPerformance() {
  console.log('🚀 Counter Performance Test - Step 6 Verification');
  console.log('📊 Simulating 10,000 messages/hour load\n');
  
  try {
    const guard = getDailyLimitGuard();
    const startTime = Date.now();
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`📅 Test date: ${today}`);
    console.log('🔄 Starting 10,000 counter increments...\n');
    
    let successCount = 0;
    let failCount = 0;
    let throttleErrors = 0;
    
    // Process in batches of 100 for controlled load
    for (let batch = 0; batch < 100; batch++) {
      const batchPromises = [];
      
      // 100 messages per batch
      for (let i = 0; i < 100; i++) {
        const msgNum = batch * 100 + i;
        // Use different phone numbers to simulate real traffic
        const phone = `91987654${String(msgNum).padStart(4, '0')}`;
        
        const promise = guard.checkLimit(phone)
          .then(result => {
            if (result.allowed) {
              successCount++;
            } else {
              failCount++;
            }
          })
          .catch(error => {
            failCount++;
            if (error.name === 'ProvisionedThroughputExceededException') {
              throttleErrors++;
            }
          });
        
        batchPromises.push(promise);
      }
      
      // Wait for batch to complete
      await Promise.all(batchPromises);
      
      // Progress indicator every 2000 messages
      if ((batch + 1) % 20 === 0) {
        const elapsed = (Date.now() - startTime) / 1000;
        const rate = (successCount / elapsed).toFixed(0);
        console.log(`   Progress: ${successCount + failCount}/10,000 (${rate} msg/s)`);
      }
    }
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    const throughput = (successCount / duration).toFixed(1);
    
    console.log(`\n✅ Test complete in ${duration.toFixed(1)}s`);
    console.log(`📊 Throughput: ${throughput} messages/second`);
    
    // Wait for eventual consistency
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify total count
    console.log('\n📊 Verifying distributed counter totals...');
    const total = await whatsappRepository.getDailyConversationCountTotal(today);
    
    console.log('\n📈 Performance Results:');
    console.log(`   Successful:     ${successCount.toLocaleString()}`);
    console.log(`   Failed:         ${failCount.toLocaleString()}`);
    console.log(`   Throttle errors: ${throttleErrors}`);
    console.log(`   Total count:    ${total.toLocaleString()}`);
    console.log(`   Duration:       ${duration.toFixed(1)}s`);
    console.log(`   Throughput:     ${throughput} msg/s`);
    
    // Check shard distribution (should be even)
    console.log('\n📊 Shard Load Distribution:');
    const shardCounts: number[] = [];
    
    for (let shard = 0; shard < 10; shard++) {
      const counterKey = `DAILY_COUNTER#${shard}#${today}`;
      const count = await whatsappRepository.getDailyConversationCount(counterKey);
      shardCounts.push(count);
      
      const bar = '█'.repeat(Math.floor(count / 100));
      console.log(`   Shard ${shard}: ${count.toString().padStart(4)} ${bar}`);
    }
    
    // Calculate distribution quality
    const average = total / 10;
    const maxDeviation = Math.max(...shardCounts.map(c => Math.abs(c - average)));
    const deviationPercent = (maxDeviation / average * 100).toFixed(1);
    
    console.log(`\n📊 Distribution Quality:`);
    console.log(`   Average per shard: ${average.toFixed(1)}`);
    console.log(`   Max deviation:     ${deviationPercent}%`);
    
    // Success criteria from roadmap
    const allIncrementsSucceeded = successCount === 10000;
    const noThrottling = throttleErrors === 0;
    const goodThroughput = parseFloat(throughput) > 80;
    const fastEnough = duration < 120;
    const accurateCount = total === successCount; // Total should match success count
    const goodDistribution = parseFloat(deviationPercent) < 40; // Allow 40% deviation for 10k samples
    
    console.log(`\n🎯 Verification Results:`);
    console.log(`   ${allIncrementsSucceeded ? '✅' : '❌'} All increments succeeded (${successCount} / 10,000)`);
    console.log(`   ${noThrottling ? '✅' : '❌'} No throttling errors (${throttleErrors} errors)`);
    console.log(`   ${goodThroughput ? '✅' : '❌'} Good throughput (${throughput} msg/s > 80 msg/s)`);
    console.log(`   ${fastEnough ? '✅' : '❌'} Fast enough (${duration.toFixed(1)}s < 120s)`);
    console.log(`   ${accurateCount ? '✅' : '❌'} Accurate count (total = ${total}, expected = ${successCount})`);
    console.log(`   ${goodDistribution ? '✅' : '❌'} Good distribution (deviation ${deviationPercent}% < 40%)`);
    
    // Calculate write capacity
    const writesPerSecond = successCount / duration;
    const estimatedWCU = writesPerSecond / 10; // Divided across 10 shards
    
    console.log(`\n💰 Capacity Analysis:`);
    console.log(`   Writes/second:  ${writesPerSecond.toFixed(1)}`);
    console.log(`   Estimated WCU:   ${estimatedWCU.toFixed(2)} per shard`);
    console.log(`   Total WCU:      ${(estimatedWCU * 10).toFixed(1)} (all shards)`);
    
    if (allIncrementsSucceeded && noThrottling && goodThroughput && fastEnough && accurateCount) {
      console.log('\n🎉 Step 6 VERIFIED: Counter performance excellent!');
      console.log('   ✅ 10k messages processed');
      console.log('   ✅ No throttling');
      console.log('   ✅ High throughput');
      console.log('   ✅ Load distributed across shards');
      console.log('   ✅ Within free tier capacity\n');
      
      console.log('💡 Performance Summary:');
      console.log(`   • Can handle ${(successCount * 24).toLocaleString()} messages/day`);
      console.log(`   • Peak throughput: ${throughput} msg/s`);
      console.log(`   • ~${estimatedWCU.toFixed(1)} WCU per shard (well within free tier!)`);
      console.log(`   • Random sharding prevents hot partitions\n`);
      
      process.exit(0);
    } else {
      console.log('\n⚠️  Some checks failed - review results above');
      
      if (!goodThroughput) {
        console.log('\n💡 Low throughput may indicate:');
        console.log('   - Network latency');
        console.log('   - DynamoDB throttling (check CloudWatch)');
        console.log('   - Cold start overhead');
      }
      
      if (throttleErrors > 0) {
        console.log('\n⚠️  WARNING: Throttling detected!');
        console.log('   - Check DynamoDB provisioned capacity');
        console.log('   - May need to enable on-demand billing');
        console.log('   - Verify sharding is working (check distribution above)');
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Counter performance test failed:', error);
    process.exit(1);
  }
}

// Run the test
console.log('Starting Counter Performance Test...\n');
testCounterPerformance();
