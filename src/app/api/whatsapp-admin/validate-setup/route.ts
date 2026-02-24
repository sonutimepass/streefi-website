import { NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';
import { listTemplates } from '@/lib/whatsapp/templates/services';

/**
 * GET /api/whatsapp-admin/validate-setup
 * 
 * Pre-flight check before sending first template message.
 * Validates:
 * - Environment variables
 * - Database connection
 * - Template availability
 * - Meta credentials format
 */
export async function GET(request: Request) {
  const results = {
    timestamp: new Date().toISOString(),
    checks: [] as any[],
    ready: false,
  };

  try {
    // Check 1: Admin Authentication
    results.checks.push({ 
      name: 'Admin Authentication',
      status: 'checking...'
    });

    const auth = await validateAdminSession(request, 'whatsapp-session');
    
    if (auth.valid) {
      results.checks[0].status = '✅ PASS';
      results.checks[0].details = 'Session valid';
    } else {
      results.checks[0].status = '❌ FAIL';
      results.checks[0].details = 'No valid session - please login';
      results.ready = false;
      return NextResponse.json(results, { status: 200 });
    }

    // Check 2: Environment Variables
    results.checks.push({
      name: 'Environment Variables',
      status: 'checking...'
    });

    const envVars = {
      META_ACCESS_TOKEN: !!process.env.META_ACCESS_TOKEN,
      META_PHONE_NUMBER_ID: !!process.env.META_PHONE_NUMBER_ID,
      DYNAMODB_TABLE_NAME: !!process.env.DYNAMODB_TABLE_NAME,
      AWS_REGION: !!process.env.AWS_REGION,
    };

    const missingVars = Object.entries(envVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length === 0) {
      results.checks[1].status = '✅ PASS';
      results.checks[1].details = 'All required env vars present';
      results.checks[1].variables = envVars;
    } else {
      results.checks[1].status = '❌ FAIL';
      results.checks[1].details = `Missing: ${missingVars.join(', ')}`;
      results.checks[1].missing = missingVars;
      results.ready = false;
      return NextResponse.json(results, { status: 200 });
    }

    // Check 3: Meta Credentials Format
    results.checks.push({
      name: 'Meta Credentials Format',
      status: 'checking...'
    });

    const accessToken = process.env.META_ACCESS_TOKEN || '';
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID || '';

    const tokenValid = accessToken.length > 50; // Meta tokens are long
    const phoneIdValid = /^\d{15,}$/.test(phoneNumberId); // Phone ID is numeric, 15+ digits

    if (tokenValid && phoneIdValid) {
      results.checks[2].status = '✅ PASS';
      results.checks[2].details = 'Token and Phone ID format valid';
      results.checks[2].info = {
        tokenLength: accessToken.length,
        phoneIdLength: phoneNumberId.length,
        phoneIdPreview: phoneNumberId.substring(0, 4) + '...',
      };
    } else {
      results.checks[2].status = '⚠️ WARNING';
      results.checks[2].details = 'Credentials format may be incorrect';
      results.checks[2].issues = {
        token: tokenValid ? 'OK' : 'Too short or missing',
        phoneId: phoneIdValid ? 'OK' : 'Should be 15+ digits',
      };
    }

    // Check 4: Database Connection & Templates
    results.checks.push({
      name: 'Database & Templates',
      status: 'checking...'
    });

    try {
      const templates = await listTemplates();
      
      const activeApprovedTemplates = templates.filter(
        t => t.status === 'active' && t.metaStatus === 'APPROVED'
      );

      if (activeApprovedTemplates.length > 0) {
        results.checks[3].status = '✅ PASS';
        results.checks[3].details = `Found ${activeApprovedTemplates.length} ready template(s)`;
        results.checks[3].templates = activeApprovedTemplates.map(t => ({
          name: t.name,
          category: t.category,
          language: t.language,
          variables: t.variables.length,
        }));
      } else if (templates.length > 0) {
        results.checks[3].status = '⚠️ WARNING';
        results.checks[3].details = 'Templates exist but none are active + approved';
        results.checks[3].templates = templates.map(t => ({
          name: t.name,
          status: t.status,
          metaStatus: t.metaStatus,
        }));
      } else {
        results.checks[3].status = '❌ FAIL';
        results.checks[3].details = 'No templates found in database';
        results.checks[3].action = 'Create template in Meta and insert into DB';
      }
    } catch (error: any) {
      results.checks[3].status = '❌ FAIL';
      results.checks[3].details = 'Database connection failed';
      results.checks[3].error = error.message;
      results.ready = false;
      return NextResponse.json(results, { status: 200 });
    }

    // Check 5: Meta API Connectivity (optional - can be expensive)
    results.checks.push({
      name: 'Meta API Connectivity',
      status: '⏭️ SKIP',
      details: 'Run actual send to test',
    });

    // Final Status
    const passCount = results.checks.filter(c => c.status === '✅ PASS').length;
    const failCount = results.checks.filter(c => c.status === '❌ FAIL').length;
    
    results.ready = failCount === 0 && passCount >= 3;

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    console.error('[Validate Setup] Unexpected error:', error);
    return NextResponse.json({
      error: 'Validation failed',
      message: error.message,
      results,
    }, { status: 500 });
  }
}
