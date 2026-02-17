import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyPassword } from '@/lib/crypto';

const COOKIE_NAME = 'email_admin_session';
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

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
    const adminPasswordHash = process.env.EMAIL_ADMIN_PASSWORD_HASH;
    
    if (!adminPasswordHash) {
      console.error('EMAIL_ADMIN_PASSWORD_HASH environment variable not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
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
