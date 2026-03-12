/**
 * Test endpoint - NO AUTH REQUIRED
 * Tests Meta API connection directly
 * ONLY USE IN DEVELOPMENT
 */

import { NextResponse } from 'next/server';

export async function GET() {
  console.log('\n========================================');
  console.log('🧪 [TestMeta] Direct Meta API Test - NO AUTH');
  console.log('========================================\n');

  // Environment check
  console.log('Environment variables:');
  console.log('  NODE_ENV:', process.env.NODE_ENV);
  console.log('  NEXT_PUBLIC_BYPASS_AUTH:', process.env.NEXT_PUBLIC_BYPASS_AUTH);
  console.log('  META_ACCESS_TOKEN:', process.env.META_ACCESS_TOKEN ? 'SET' : 'NOT SET');
  console.log('  META_WABA_ID:', process.env.META_WABA_ID || 'NOT SET');
  console.log('  META_PHONE_NUMBER_ID:', process.env.META_PHONE_NUMBER_ID || 'NOT SET');

  try {
    const wabaId = process.env.META_WABA_ID;
    const accessToken = process.env.META_ACCESS_TOKEN;

    if (!wabaId || !accessToken) {
      return NextResponse.json({
        error: 'Missing credentials',
        details: {
          META_WABA_ID: wabaId ? 'SET' : 'MISSING',
          META_ACCESS_TOKEN: accessToken ? 'SET' : 'MISSING'
        }
      }, { status: 400 });
    }

    console.log('\n🌐 Calling Meta API...');
    console.log(`URL: https://graph.facebook.com/v25.0/${wabaId}/message_templates`);

    // Call Meta API directly
    const response = await fetch(
      `https://graph.facebook.com/v25.0/${wabaId}/message_templates?limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    const data = await response.json();

    console.log('Meta API Response Status:', response.status);
    console.log('Meta API Response:', JSON.stringify(data, null, 2));

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: 'Meta API call failed',
        status: response.status,
        metaError: data
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Meta API connection successful',
      templatesFound: data.data?.length || 0,
      templates: data.data || [],
      credentials: {
        wabaId: wabaId.substring(0, 4) + '...',
        tokenPreview: accessToken.substring(0, 15) + '...'
      }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
