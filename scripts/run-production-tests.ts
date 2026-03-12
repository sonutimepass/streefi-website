#!/usr/bin/env node
/**
 * Production Test Runner
 * 
 * Runs all production validation tests in sequence
 */

import { spawn } from 'child_process';
import { resolve } from 'path';

const tests = [
  {
    name: 'Distributed Counter Test',
    script: 'scripts/test-distributed-counter.ts',
    description: 'Tests 10-shard distributed counter system'
  },
  {
    name: 'Message TTL Verification',
    script: 'scripts/verify-message-ttl.ts',
    description: 'Verifies 7-day TTL on messages'
  },
  {
    name: 'Counter TTL Verification',
    script: 'scripts/verify-counter-ttl.ts',
    description: 'Verifies 90-day TTL on counters'
  }
];

interface TestResult {
  name: string;
  success: boolean;
  duration: number;
  error?: string;
}

async function runTest(test: typeof tests[0]): Promise<TestResult> {
  const startTime = Date.now();
  
  return new Promise((resolve) => {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🧪 Running: ${test.name}`);
    console.log(`   ${test.description}`);
    console.log(`${'='.repeat(80)}\n`);
    
    const child = spawn('npx', ['ts-node', test.script], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      
      if (code === 0) {
        resolve({
          name: test.name,
          success: true,
          duration
        });
      } else {
        resolve({
          name: test.name,
          success: false,
          duration,
          error: `Exit code: ${code}`
        });
      }
    });
    
    child.on('error', (error) => {
      const duration = Date.now() - startTime;
      resolve({
        name: test.name,
        success: false,
        duration,
        error: error.message
      });
    });
  });
}

async function runAllTests() {
  console.log('🚀 Starting Production Test Suite');
  console.log(`   Running ${tests.length} test(s)\n`);
  
  const results: TestResult[] = [];
  
  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
    
    if (!result.success) {
      console.log(`\n❌ Test failed: ${test.name}`);
      console.log(`   Stopping test suite due to failure\n`);
      break;
    }
  }
  
  // Print summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('📊 TEST SUMMARY');
  console.log(`${'='.repeat(80)}\n`);
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  results.forEach((result) => {
    const icon = result.success ? '✅' : '❌';
    const status = result.success ? 'PASS' : 'FAIL';
    const time = (result.duration / 1000).toFixed(2);
    
    console.log(`${icon} ${status.padEnd(6)} ${result.name.padEnd(40)} ${time}s`);
    if (result.error) {
      console.log(`           ${result.error}`);
    }
  });
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed} | Time: ${(totalDuration / 1000).toFixed(2)}s`);
  console.log(`${'='.repeat(80)}\n`);
  
  if (failed === 0) {
    console.log('✅ All tests passed! Production fixes validated.\n');
    console.log('📋 Next Steps:');
    console.log('   1. Review CloudWatch metrics');
    console.log('   2. Check docs/STEP-3-TESTING-GUIDE.md for performance benchmarks');
    console.log('   3. Complete production deployment checklist');
    console.log('   4. Monitor for 24-48 hours\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review errors and fix before deploying.\n');
    process.exit(1);
  }
}

// Run tests
runAllTests().catch((error) => {
  console.error('❌ Test runner error:', error);
  process.exit(1);
});
