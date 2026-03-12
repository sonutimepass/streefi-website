/**
 * Debug endpoint to check environment variables
 * ONLY USE IN DEVELOPMENT - REMOVE IN PRODUCTION
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development' && process.env.NEXT_PUBLIC_BYPASS_AUTH !== 'true') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  return NextResponse.json({
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_BYPASS_AUTH: process.env.NEXT_PUBLIC_BYPASS_AUTH,
      VERCEL: process.env.VERCEL || 'not set',
    },
    meta: {
      META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN 
        ? `SET (${process.env.META_ACCESS_TOKEN.substring(0, 15)}...)` 
        : 'NOT SET',
      META_PHONE_NUMBER_ID: process.env.META_PHONE_NUMBER_ID || 'NOT SET',
      META_WABA_ID: process.env.META_WABA_ID || 'NOT SET',
    },
    aws: {
      AWS_REGION: process.env.AWS_REGION || 'NOT SET',
      DYNAMODB_TABLE_NAME: process.env.DYNAMODB_TABLE_NAME || 'NOT SET',
      // In production: Uses IAM role attached to Amplify service (no explicit credentials needed)
      // In local dev: Optional AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY can be set
    },
    whatsapp: {
      WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN 
        ? `SET (${process.env.WHATSAPP_ACCESS_TOKEN.substring(0, 15)}...)` 
        : 'NOT SET',
      WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID || 'NOT SET',
      WHATSAPP_APP_SECRET: process.env.WHATSAPP_APP_SECRET ? 'SET' : 'NOT SET',
      WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN ? 'SET' : 'NOT SET',
    },
    bypassCheck: {
      shouldBypass: (
        process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true' ||
        process.env.NODE_ENV === 'development' ||
        !process.env.VERCEL
      ),
      reasons: {
        bypassAuthFlag: process.env.NEXT_PUBLIC_BYPASS_AUTH === 'true',
        isDevelopment: process.env.NODE_ENV === 'development',
        notOnVercel: !process.env.VERCEL
      }
    }
  });
}
