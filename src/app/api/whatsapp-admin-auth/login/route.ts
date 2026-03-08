import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { checkLoginRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/rateLimit';
import { sessionRepository } from '@/lib/repositories/sessionRepository';
import { getAdminByEmail, verifyAdminPassword } from '@/lib/adminService';
import { generateCSRFToken, } from '@/lib/crypto';
import { CSRF_COOKIE_NAME } from '@/lib/csrf';

// Force Node.js runtime for proper environment variable access
export const runtime = 'nodejs';

const COOKIE_NAME = 'wa_admin_session';
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

// POST - Authenticate with email + password
export async function POST(request: Request) {
  try {
    // Extract IP for rate limiting (handles AWS ALB, CloudFront, and direct access)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || request.headers.get('x-real-ip') 
      || 'unknown';
    
    console.log(`🔐 Login attempt from IP: ${ip}`);
    
    // Check rate limit BEFORE processing request
    const rateCheck = await checkLoginRateLimit(ip);
    if (rateCheck.blocked) {
      const minutes = Math.ceil((rateCheck.remainingTime || 0) / 60);
      return NextResponse.json(
        { 
          success: false, 
          error: `Too many failed attempts. Please try again in ${minutes} minute(s).`,
          retryAfter: rateCheck.remainingTime
        },
        { status: 429 }
      );
    }
    
    const body = await request.json();
    const email: string = (body.email || '').trim().toLowerCase();
    const password: string = body.password || '';
    
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Look up admin by email in DynamoDB
    const admin = await getAdminByEmail(email);

    if (!admin) {
      await recordFailedAttempt(ip);
      await new Promise(resolve => setTimeout(resolve, 100));
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Validate password
    const isValid = verifyAdminPassword(password, admin.password_hash);
    
    if (!isValid) {
      await recordFailedAttempt(ip);
      await new Promise(resolve => setTimeout(resolve, 100));
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }
    
    // Password correct — reset rate limit counter
    await resetAttempts(ip);
    
    // Create session in streefi_sessions table
    const sessionId = `sess_${randomUUID()}`;
    const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
    
    try {
      await sessionRepository.createSession({
        session_id: sessionId,
        email: admin.email,
        type: 'whatsapp-session',
        status: 'active',
        expiresAt: expiresAt,
        createdAt: new Date().toISOString()
      });
      
      console.log(`✅ Session created for ${admin.email} (${admin.role}):`, sessionId);
    } catch (dbError) {
      console.error('❌ Failed to create session in DynamoDB:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to create session' },
        { status: 500 }
      );
    }
    
    // Set httpOnly secure cookie with sessionId
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });

    // Issue CSRF token in a readable (non-HttpOnly) cookie so the browser JS can read it
    const csrfToken = generateCSRFToken();
    cookieStore.set(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false, // intentionally readable by JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
    
    return NextResponse.json({ success: true, role: admin.role });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

