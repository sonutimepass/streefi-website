import { NextRequest, NextResponse } from 'next/server';
import { whatsappRepository } from '@/lib/repositories/whatsappRepository';
import { verifyWebhookSignature } from '@/lib/whatsapp/signatureVerifier';
import { routeWebhookEvent } from '@/lib/whatsapp/webhookRouter';
import crypto from 'crypto';

// Force Node.js runtime for crypto operations in signature verification
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Check if running locally (server-only env var)
const isLocalDevelopment = process.env.NODE_ENV === 'development' || 
                          process.env.WHATSAPP_SKIP_SIGNATURE === 'true';

/**
 * GET - WhatsApp Webhook Verification
 * Security: Returns 403 Forbidden for unauthorized requests
 * Only allows Meta's webhook verification with proper parameters
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mode = searchParams.get('hub.mode');
    const token = searchParams.get('hub.verify_token');
    const challenge = searchParams.get('hub.challenge');

    // Log verification attempt (summary only)
    console.log('\n[Webhook Verification]');
    console.log('Mode:', mode);
    console.log('Token:', token ? 'present' : 'missing');
    console.log('Challenge:', challenge ? 'present' : 'missing');

    // Security check: Return 403 for any unauthorized GET requests (like Zomato)
    if (!mode || !token || !challenge) {
      console.log('⚠️ Missing required parameters - returning 403');
      return new NextResponse(
        '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">\n<html><head>\n<title>403 Forbidden</title>\n</head><body>\n<h1>Forbidden</h1>\n<p>You don\'t have permission to access this resource.</p>\n</body></html>',
        { 
          status: 403,
          headers: {
            'Content-Type': 'text/html; charset=iso-8859-1',
            'Cache-Control': 'max-age=0, no-cache, no-store',
            'Pragma': 'no-cache',
          }
        }
      );
    }

    // Validate environment configuration
    if (!process.env.WHATSAPP_VERIFY_TOKEN) {
      console.error('[Webhook] WHATSAPP_VERIFY_TOKEN not configured');
      return new NextResponse('Forbidden', { status: 403 });
    }

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

    // Verify token and mode (explicit check)
    if (mode !== 'subscribe' || token !== verifyToken) {
      console.warn('[Webhook] Verification failed: Invalid mode or token');
      return new NextResponse(
        '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">\n<html><head>\n<title>403 Forbidden</title>\n</head><body>\n<h1>Forbidden</h1>\n<p>You don\'t have permission to access this resource.</p>\n</body></html>',
        { 
          status: 403,
          headers: {
            'Content-Type': 'text/html; charset=iso-8859-1',
            'Cache-Control': 'max-age=0, no-cache, no-store',
            'Pragma': 'no-cache',
          }
        }
      );
    }

    // Verification successful
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[Webhook] Verification successful');
      return new NextResponse(challenge, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      });
    }

    // Should never reach here (already handled above)
    console.warn('[Webhook] Verification failed: Unknown reason');
    return new NextResponse(
      '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">\n<html><head>\n<title>403 Forbidden</title>\n</head><body>\n<h1>Forbidden</h1>\n<p>You don\'t have permission to access this resource.</p>\n</body></html>',
      { 
        status: 403,
        headers: {
          'Content-Type': 'text/html; charset=iso-8859-1',
          'Cache-Control': 'max-age=0, no-cache, no-store',
          'Pragma': 'no-cache',
        }
      }
    );
  } catch (error) {
    console.error('[Webhook] Verification error:', error);
    return new NextResponse(
      '<!DOCTYPE HTML PUBLIC "-//IETF//DTD HTML 2.0//EN">\n<html><head>\n<title>403 Forbidden</title>\n</head><body>\n<h1>Forbidden</h1>\n<p>You don\'t have permission to access this resource.</p>\n</body></html>',
      { 
        status: 403,
        headers: {
          'Content-Type': 'text/html; charset=iso-8859-1',
        }
      }
    );
  }
}

/**
 * POST - WhatsApp Webhook Handler (Meta events only)
 * 
 * Handles webhook events from Meta:
 * - Incoming messages
 * - Message statuses
 * - Template updates
 * - Phone quality alerts
 * - Account alerts
 * 
 * For sending messages, use: POST /api/whatsapp/send
 */
export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  console.log(`[Webhook:${requestId}] Event received:`, new Date().toISOString());

  try {
    // Read raw body for signature verification
    const rawBody = await request.text();
    
    // Guard against extremely large payloads (Meta typically sends <100KB)
    if (rawBody.length > 1024 * 1024) {
      console.warn(`[Webhook:${requestId}] Payload too large:`, rawBody.length, 'bytes');
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
    }
    
    let body: any;
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      console.error(`[Webhook:${requestId}] Invalid JSON`);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Validate webhook object type
    if (body.object !== 'whatsapp_business_account') {
      console.warn(`[Webhook:${requestId}] Invalid object type:`, body.object);
      return NextResponse.json({ error: 'Invalid webhook object' }, { status: 400 });
    }

    console.log(`[Webhook:${requestId}] Object:`, body.object, '| Entries:', body.entry?.length || 0);
    // Verify webhook signature (production only)
    if (!isLocalDevelopment) {
      const appSecret = process.env.WHATSAPP_APP_SECRET;
      
      if (!appSecret) {
        console.error(`[Webhook:${requestId}] WHATSAPP_APP_SECRET not configured`);
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
      }

      const signature = request.headers.get('x-hub-signature-256');
      
      // Explicit signature header check
      if (!signature) {
        console.warn(`[Webhook:${requestId}] Missing signature header`);
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      
      if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
        console.warn(`[Webhook:${requestId}] Signature verification failed`);
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Process webhook entries
    if (!body.entry || !Array.isArray(body.entry)) {
      console.warn(`[Webhook:${requestId}] No entries in payload`);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Process entries SEQUENTIALLY to maintain consistency
    // Parallel processing can cause race conditions and inconsistent DB state
    for (const entry of body.entry) {
      if (!entry.changes || !Array.isArray(entry.changes)) {
        console.warn(`[Webhook:${requestId}] Entry ${entry.id} has no changes array`);
        continue;
      }
      
      console.log(`[Webhook:${requestId}] Processing ${entry.changes.length} change(s) for entry ${entry.id}`);
      
      // Process changes SEQUENTIALLY within each entry
      for (const change of entry.changes) {
        // Log summary (no PII)
        console.log(`[Webhook:${requestId}] Field:`, change.field, '| Entry:', entry.id);
        
        // Route to handler (includes deduplication check and processing)
        // If this throws, we'll return 500 to Meta for retry
        await routeWebhookEvent(change.field, change.value, entry.id);
      }
    }

    // Success - return 200 to Meta
    console.log(`[Webhook:${requestId}] Processed successfully`);
    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error(`[Webhook:${requestId}] Processing failed - returning 500 for Meta retry:`, error);
    // Return 500 so Meta will retry this event
    // The router has already removed the processed marker
    return NextResponse.json(
      { error: 'Processing failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
