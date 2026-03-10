/**
 * Campaign System Startup Validator
 * 
 * Validates configuration and prints safety warnings on server startup
 * This runs once when the server starts to catch configuration issues early
 */

export function validateCampaignSystemStartup() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🚀 CAMPAIGN SYSTEM STARTUP VALIDATION');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const checks = {
    // FORCE DRY RUN in Phase 1A for safety
    dryRunMode: true, // ⚠️ PHASE 1A: Always dry run until credentials stable
    hasMetaToken: !!process.env.WHATSAPP_ACCESS_TOKEN,
    hasRealMetaToken: process.env.WHATSAPP_ACCESS_TOKEN !== 'your_whatsapp_access_token',
    hasPhoneId: !!process.env.WHATSAPP_PHONE_ID,
    hasRealPhoneId: process.env.WHATSAPP_PHONE_ID !== 'your_phone_number_id',
    dailyLimit: parseInt(process.env.WHATSAPP_DAILY_LIMIT || '200'),
    hasAwsRegion: !!process.env.AWS_REGION,
    campaignsTable: process.env.CAMPAIGNS_TABLE_NAME || 'streefi_campaigns',
    recipientsTable: process.env.RECIPIENTS_TABLE_NAME || 'streefi_campaign_recipients',
    environmentDryRunSetting: process.env.META_DRY_RUN, // Debug: log actual value
  };

  // Check 1: Dry Run Mode
  if (checks.dryRunMode) {
    console.log('✅ DRY RUN MODE: ENABLED (PHASE 1A - FORCE ENABLED FOR SAFETY)');
    console.log('   └─ All WhatsApp sends will be SIMULATED');
    console.log('   └─ No real Meta API calls will be made');
    console.log('   └─ Safe for testing without quota impact');
    console.log('   └─ Env setting: ' + (checks.environmentDryRunSetting || 'not set') + '\n');
  } else {
    console.log('⚠️  DRY RUN MODE: DISABLED');
    console.log('   └─ Real WhatsApp messages WILL BE SENT');
    console.log('   └─ This will consume Meta API quota');
    console.log('   └─ Make sure you have real credentials!\n');
  }

  // Check 2: Meta Credentials
  const hasValidCredentials = checks.hasRealMetaToken && checks.hasRealPhoneId;
  
  if (!hasValidCredentials) {
    console.log('🛡️  SAFETY LOCK: No real Meta credentials detected');
    console.log('   └─ Placeholder tokens found');
    console.log('   └─ All sends will be SIMULATED automatically');
    console.log('   └─ This prevents accidental real sends\n');
  } else if (!checks.dryRunMode) {
    console.log('🚨 WARNING: REAL Meta credentials detected!');
    console.log('   └─ Token: Present and looks real');
    console.log('   └─ Phone ID: Present and looks real');
    console.log('   └─ Dry run: DISABLED');
    console.log('   └─ REAL MESSAGES WILL BE SENT!\n');
    
    // Extra warning in production
    if (process.env.NODE_ENV === 'production') {
      console.log('🔴 PRODUCTION MODE WITH REAL CREDENTIALS');
      console.log('   └─ Every send will hit Meta\'s API');
      console.log('   └─ Every send will count against quota');
      console.log('   └─ Make sure this is intentional!\n');
    }
  }

  // Check 3: Daily Limit
  console.log(`📊 Daily Limit: ${checks.dailyLimit} conversations`);
  if (checks.dailyLimit <= 10) {
    console.log('   └─ AGGRESSIVE limit (good for testing)');
  } else if (checks.dailyLimit <= 100) {
    console.log('   └─ Conservative limit');
  } else {
    console.log('   └─ Production limit');
  }
  console.log('');

  // Check 4: Database Configuration
  console.log('🗄️  Database Configuration:');
  console.log(`   └─ AWS Region: ${checks.hasAwsRegion ? process.env.AWS_REGION : '❌ NOT SET (using default: us-east-1)'}`);
  console.log(`   └─ Campaigns Table: ${checks.campaignsTable}`);
  console.log(`   └─ Recipients Table: ${checks.recipientsTable}`);
  console.log('');

  // Final Safety Summary
  const willSendRealMessages = !checks.dryRunMode && hasValidCredentials;
  
  console.log('═══════════════════════════════════════════════════════════════');
  if (willSendRealMessages) {
    console.log('🔴 REAL MODE: Messages will be sent to Meta\'s API');
  } else {
    console.log('🟢 SAFE MODE: All sends will be simulated');
  }
  console.log('═══════════════════════════════════════════════════════════════\n');

  return {
    isProduction: willSendRealMessages,
    checks,
  };
}

/**
 * Log a campaign execution start
 * Makes it very clear when a batch is about to run
 */
export function logCampaignExecutionStart(campaignId: string, batchSize: number, dryRun: boolean) {
  console.log('\n' + '═'.repeat(70));
  console.log(`🎯 CAMPAIGN EXECUTION STARTING: ${campaignId}`);
  console.log('═'.repeat(70));
  console.log(`📦 Batch Size: ${batchSize} recipients`);
  console.log(`🧪 Mode: ${dryRun ? '✅ DRY RUN (Simulated)' : '🚨 REAL (Live sends)'}`);
  console.log(`⏰ Started: ${new Date().toISOString()}`);
  console.log('═'.repeat(70) + '\n');
}

/**
 * Log a campaign execution result
 */
export function logCampaignExecutionResult(result: {
  campaignId: string;
  processed: number;
  sent: number;
  failed: number;
  paused: boolean;
  completed: boolean;
  reason?: string;
}) {
  console.log('\n' + '═'.repeat(70));
  console.log(`✅ CAMPAIGN EXECUTION COMPLETE: ${result.campaignId}`);
  console.log('═'.repeat(70));
  console.log(`📊 Results:`);
  console.log(`   └─ Processed: ${result.processed}`);
  console.log(`   └─ Sent: ${result.sent}`);
  console.log(`   └─ Failed: ${result.failed}`);
  console.log(`   └─ Status: ${result.completed ? 'COMPLETED' : result.paused ? 'PAUSED' : 'RUNNING'}`);
  if (result.reason) {
    console.log(`   └─ Reason: ${result.reason}`);
  }
  console.log(`⏰ Finished: ${new Date().toISOString()}`);
  console.log('═'.repeat(70) + '\n');
}
