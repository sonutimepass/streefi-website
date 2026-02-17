import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'email_admin_session';

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
