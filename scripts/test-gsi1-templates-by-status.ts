/**
 * Test Script: Step 7 - GSI1 TemplatesByStatus
 * 
 * This script verifies that GSI1-TemplatesByStatus is working correctly:
 * 1. Creates test templates with different statuses
 * 2. Queries templates by status using GSI (fast!)
 * 3. Compares performance vs Scan operation
 * 4. Verifies results accuracy
 * 
 * Prerequisites:
 * - Run: scripts/create-gsi1-templates-by-status.sh
 * - Wait for GSI status to be ACTIVE (check DynamoDB console)
 * 
 * Expected Results:
 * - Query returns correct templates filtered by status
 * - Query is 10-100× faster than Scan
 * - No errors when using GSI
 */

import { whatsappRepository } from '../src/lib/repositories';
import type { TemplateStatus } from '../src/lib/repositories/whatsappRepository';

async function testGSI1() {
  console.log('🧪 Step 7: Testing GSI1-TemplatesByStatus\n');
  
  try {
    // 1️⃣ Create test templates with different statuses
    console.log('📝 Creating test templates...\n');
    
    const testTemplates = [
      { name: 'Welcome Template', status: 'active' as TemplateStatus },
      { name: 'Order Confirmation', status: 'active' as TemplateStatus },
      { name: 'Shipping Notification', status: 'active' as TemplateStatus },
      { name: 'Draft Template 1', status: 'draft' as TemplateStatus },
      { name: 'Draft Template 2', status: 'draft' as TemplateStatus },
      { name: 'Archived Template', status: 'archived' as TemplateStatus }
    ];
    
    for (const template of testTemplates) {
      await whatsappRepository.saveTemplate({
        templateId: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: template.name,
        category: 'UTILITY',
        language: 'en_US',
        variables: ['customer_name'],
        status: template.status,
        metaStatus: 'APPROVED',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncedFromMeta: false
      });
      
      console.log(`   ✅ Created: ${template.name} (${template.status})`);
      await new Promise(resolve => setTimeout(resolve, 100)); // Small delay for unique IDs
    }
    
    console.log('\n✅ Test templates created\n');
    
    // Wait a moment for GSI to catch up
    console.log('⏳ Waiting for GSI to update...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('');
    
    // 2️⃣ Query templates by status using GSI (FAST)
    console.log('🔍 Querying templates by status using GSI1...\n');
    
    const queryStart = Date.now();
    const activeTemplates = await whatsappRepository.listTemplatesByStatus('active');
    const queryDuration = Date.now() - queryStart;
    
    console.log(`📊 Query Results (GSI1):`);
    console.log(`   Found: ${activeTemplates.length} active templates`);
    console.log(`   Duration: ${queryDuration}ms`);
    console.log('');
    
    activeTemplates.forEach((template, idx) => {
      console.log(`   ${idx + 1}. ${template.name} (${template.templateId})`);
    });
    
    console.log('');
    
    // 3️⃣ Compare with Scan operation (SLOW)
    console.log('🐌 Comparing with Scan operation (old method)...\n');
    
    const scanStart = Date.now();
    const allTemplates = await whatsappRepository.listTemplates();
    const scanDuration = Date.now() - scanStart;
    
    // Filter in-memory (what we had to do before GSI)
    const activeTemplatesScan = allTemplates.filter(t => t.status === 'active');
    
    console.log(`📊 Scan Results (FilterExpression):`);
    console.log(`   Found: ${activeTemplatesScan.length} active templates`);
    console.log(`   Duration: ${scanDuration}ms`);
    console.log(`   Total scanned: ${allTemplates.length} items`);
    console.log('');
    
    // 4️⃣ Performance comparison
    console.log('⚡ Performance Comparison:\n');
    
    const speedup = scanDuration > 0 ? (scanDuration / (queryDuration || 1)).toFixed(1) : 'N/A';
    const efficiency = scanDuration > 0 
      ? `${((1 - queryDuration / scanDuration) * 100).toFixed(1)}%` 
      : 'N/A';
    
    console.log(`   GSI Query:  ${queryDuration}ms`);
    console.log(`   Scan:       ${scanDuration}ms`);
    console.log(`   Speedup:    ${speedup}× faster`);
    console.log(`   Efficiency: ${efficiency} improvement`);
    console.log('');
    
    // 5️⃣ Verify results match
    const resultsMatch = activeTemplates.length === activeTemplatesScan.length;
    
    console.log('🎯 Verification:\n');
    console.log(`   ${resultsMatch ? '✅' : '❌'} Result counts match`);
    console.log(`   ${queryDuration < scanDuration ? '✅' : '⚠️'} Query faster than Scan`);
    console.log(`   ${activeTemplates.length >= 3 ? '✅' : '⚠️'} Found expected active templates`);
    console.log('');
    
    // 6️⃣ Test other statuses
    console.log('📋 Testing other statuses...\n');
    
    const draftTemplates = await whatsappRepository.listTemplatesByStatus('draft');
    const archivedTemplates = await whatsappRepository.listTemplatesByStatus('archived');
    
    console.log(`   Draft templates:    ${draftTemplates.length}`);
    console.log(`   Archived templates: ${archivedTemplates.length}`);
    console.log('');
    
    // Success criteria
    const success = 
      resultsMatch &&
      queryDuration <= scanDuration &&
      activeTemplates.length >= 3 &&
      draftTemplates.length >= 2;
    
    if (success) {
      console.log('🎉 Step 7 VERIFIED: GSI1-TemplatesByStatus working correctly!\n');
      console.log('✅ Key Benefits:');
      console.log(`   • ${speedup}× faster queries`);
      console.log(`   • No full table scans`);
      console.log(`   • Efficient status filtering`);
      console.log(`   • Scalable to millions of templates`);
      console.log('');
      
      process.exit(0);
    } else {
      console.log('⚠️  Some checks failed - review results above\n');
      
      if (!resultsMatch) {
        console.log('❌ Result mismatch between Query and Scan');
        console.log('   This could indicate GSI is not fully synced yet');
        console.log('   Try waiting a few more seconds and run again');
      }
      
      if (queryDuration > scanDuration) {
        console.log('⚠️  Query was slower than Scan');
        console.log('   This is unusual - GSI may still be building');
        console.log('   Check GSI status in DynamoDB console');
      }
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('ResourceNotFoundException')) {
        console.error('\n💡 GSI1-TemplatesByStatus not found!');
        console.error('   Run this first:');
        console.error('   bash scripts/create-gsi1-templates-by-status.sh');
        console.error('');
        console.error('   Then wait for GSI status to be ACTIVE');
      } else if (error.message.includes('ValidationException')) {
        console.error('\n💡 GSI may still be CREATING');
        console.error('   Check status with:');
        console.error('   aws dynamodb describe-table --table-name streefi_whatsapp');
        console.error('   Look for: GlobalSecondaryIndexes[].IndexStatus');
      }
    }
    
    process.exit(1);
  }
}

// Run the test
console.log('Starting GSI1 Test...\n');
testGSI1();
