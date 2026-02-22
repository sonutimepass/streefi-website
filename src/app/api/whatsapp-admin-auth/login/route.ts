import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyPassword } from '@/lib/crypto';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'crypto';
import { checkLoginRateLimit, recordFailedAttempt, resetAttempts } from '@/lib/rateLimit';

// Force Node.js runtime for proper environment variable access
export const runtime = 'nodejs';

const COOKIE_NAME = 'wa_admin_session';
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

// POST - Authenticate with password
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
    
    const { password } = await request.json();
    
    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }
    
    // Get admin password hash from environment variable
    // Generate hash using: import { hashPassword } from '@/lib/crypto'; console.log(hashPassword('your-password'));
    
    // Temporary debugging - log ALL available env keys
    console.log("ENV KEYS:", Object.keys(process.env));
    console.log("WA_ADMIN_PASSWORD_HASH:", process.env.WA_ADMIN_PASSWORD_HASH);
    
    const adminPasswordHash = process.env.WA_ADMIN_PASSWORD_HASH;
    
    // Debug logging
    console.log('Environment check:', {
      hasHash: !!adminPasswordHash,
      hashLength: adminPasswordHash?.length || 0,
      nodeEnv: process.env.NODE_ENV,
      allEnvKeys: Object.keys(process.env).filter(k => k.includes('ADMIN') || k.includes('WA')),
      hasZohoVars: !!process.env.ZOHO_CLIENT_ID
    });
    
    if (!adminPasswordHash) {
      console.error('❌ WA_ADMIN_PASSWORD_HASH environment variable not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error - missing WA_ADMIN_PASSWORD_HASH' },
        { status: 500 }
      );
    }
    
    // Validate password using secure hashing
    const isValid = verifyPassword(password, adminPasswordHash);
    
    if (!isValid) {
      // Record failed attempt for rate limiting
      await recordFailedAttempt(ip);
      
      // Add small delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }
    
    // Password correct - reset rate limit counter
    await resetAttempts(ip);
    
    // Password is correct - create session in DynamoDB
    const sessionId = `sess_${randomUUID()}`;
    const sessionKey = `SESSION#${sessionId}`;
    const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
    
    // Store session in DynamoDB
    const dynamoClient = new DynamoDBClient({
      region: process.env.AWS_REGION,
    });
    
    try {
      await dynamoClient.send(
        new PutItemCommand({
          TableName: process.env.DYNAMODB_TABLE_NAME || 'streefi_admins',
          Item: {
            email: { S: sessionKey }, // Partition key (using email attribute but storing session key)
            sessionId: { S: sessionId },
            adminEmail: { S: 'admin@streefi.in' }, // Actual admin email
            type: { S: 'whatsapp-session' },
            status: { S: 'active' },
            expiresAt: { N: expiresAt.toString() },
            createdAt: { S: new Date().toISOString() },
          },
        })
      );
      
      console.log('✅ Session created in DynamoDB:', sessionId);
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
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
