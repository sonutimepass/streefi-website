import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'wa_admin_session';

// POST - Logout (clear session cookie)
export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Delete the session cookie
    cookieStore.delete(COOKIE_NAME);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, error: 'Logout failed' },
      { status: 500 }
    );
  }
}
