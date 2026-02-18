import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyPassword } from '@/lib/crypto';

// Force Node.js runtime for proper environment variable access
export const runtime = 'nodejs';

const COOKIE_NAME = 'wa_admin_session';
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

// GET - Check authentication status
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    
    if (sessionCookie && sessionCookie.value === 'authenticated') {
      return NextResponse.json({ authenticated: true });
    }
    
    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

// POST - Authenticate with password
export async function POST(request: Request) {
  try {
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
    console.log("🔍 Available ENV KEYS:", Object.keys(process.env));
    console.log("🔍 Total env variables:", Object.keys(process.env).length);
    
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
      // Add small delay to prevent timing attacks
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return NextResponse.json(
        { success: false, error: 'Invalid password' },
        { status: 401 }
      );
    }
    
    // Password is correct - set httpOnly secure cookie
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, 'authenticated', {
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
