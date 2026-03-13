import { NextRequest, NextResponse } from 'next/server';

/**
 * Debug endpoint to check environment variable configuration
 * ⚠️ IMPORTANT: Remove or protect this endpoint in production!
 */
export async function GET(request: NextRequest) {
  // Simple protection: only allow in development or with a secret key
  const debugKey = request.nextUrl.searchParams.get('key');
  const isAuthorized = process.env.NODE_ENV === 'development' || 
                       debugKey === process.env.INTERNAL_OPERATIONS_KEY;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const envCheck = {
    timestamp: new Date().toISOString(),
    runtime: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_RUNTIME: process.env.NEXT_RUNTIME,
      AWS_EXECUTION_ENV: process.env.AWS_EXECUTION_ENV,
      // AWS credentials managed by Amplify IAM policy (not exposed)
    },
    whatsapp: {
      WHATSAPP_VERIFY_TOKEN: checkEnv('WHATSAPP_VERIFY_TOKEN'),
      WHATSAPP_APP_SECRET: checkEnv('WHATSAPP_APP_SECRET'),
      WHATSAPP_ACCESS_TOKEN: checkEnv('WHATSAPP_ACCESS_TOKEN'),
      META_PHONE_NUMBER_ID: checkEnv('META_PHONE_NUMBER_ID'),
      WHATSAPP_PHONE_ID: checkEnv('WHATSAPP_PHONE_ID'),
      META_WABA_ID: checkEnv('META_WABA_ID'),
      META_DRY_RUN: process.env.META_DRY_RUN || 'not set',
      WHATSAPP_DAILY_LIMIT: process.env.WHATSAPP_DAILY_LIMIT || 'not set',
      WHATSAPP_RATE_LIMIT_PER_SEC: process.env.WHATSAPP_RATE_LIMIT_PER_SEC || 'not set',
    },
    dynamodb: {
      DYNAMODB_TABLE_NAME: checkEnv('DYNAMODB_TABLE_NAME'),
      WHATSAPP_CONVERSATIONS_TABLE_NAME: checkEnv('WHATSAPP_CONVERSATIONS_TABLE_NAME'),
      ADMIN_TABLE_NAME: checkEnv('ADMIN_TABLE_NAME'),
      SESSION_TABLE_NAME: checkEnv('SESSION_TABLE_NAME'),
      CAMPAIGNS_TABLE_NAME: checkEnv('CAMPAIGNS_TABLE_NAME'),
      RECIPIENTS_TABLE_NAME: checkEnv('RECIPIENTS_TABLE_NAME'),
      CONTACTS_TABLE_NAME: checkEnv('CONTACTS_TABLE_NAME'),
    },
    security: {
      INTERNAL_OPERATIONS_KEY: checkEnv('INTERNAL_OPERATIONS_KEY'),
      TRACKING_TOKEN_SECRET: checkEnv('TRACKING_TOKEN_SECRET'),
      EMAIL_ADMIN_PASSWORD_HASH: checkEnv('EMAIL_ADMIN_PASSWORD_HASH'),
      WA_ADMIN_PASSWORD_HASH: checkEnv('WA_ADMIN_PASSWORD_HASH'),
    },
    zoho: {
      ZOHO_CLIENT_ID: checkEnv('ZOHO_CLIENT_ID'),
      ZOHO_CLIENT_SECRET: checkEnv('ZOHO_CLIENT_SECRET'),
      ZOHO_REFRESH_TOKEN: checkEnv('ZOHO_REFRESH_TOKEN'),
      FROM_EMAIL: process.env.FROM_EMAIL || 'not set',
    },
    public: {
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'not set',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'not set',
      NEXT_PUBLIC_GA_MEASUREMENT_ID: checkEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID'),
      NEXT_PUBLIC_GTM_ID: checkEnv('NEXT_PUBLIC_GTM_ID'),
    },
  };

  // Count issues
  const issues = countIssues(envCheck);

  return NextResponse.json({
    status: issues === 0 ? '✅ All Good' : `⚠️ ${issues} Missing Variables`,
    ...envCheck,
  }, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}

function checkEnv(key: string): string {
  const value = process.env[key];
  if (!value) return '❌ NOT SET';
  if (value.length < 10) return `✅ SET (${value.length} chars)`;
  return `✅ SET (${value.substring(0, 10)}...${value.substring(value.length - 3)})`;
}

function countIssues(obj: any): number {
  let count = 0;
  for (const key in obj) {
    const value = obj[key];
    if (typeof value === 'object' && value !== null) {
      count += countIssues(value);
    } else if (typeof value === 'string' && (value.includes('NOT SET') || value === 'not set')) {
      count++;
    }
  }
  return count;
}
