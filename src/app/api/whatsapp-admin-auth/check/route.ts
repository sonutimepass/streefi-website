import { NextResponse } from 'next/server';
import { validateAdminSession } from '@/lib/adminAuth';

// GET - Check authentication status
export async function GET(request: Request) {
  try {
    // Validate session from DynamoDB
    const auth = await validateAdminSession(request, 'whatsapp-session');
    
    if (auth.valid) {
      return NextResponse.json({ 
        authenticated: true,
        session: auth.session 
      });
    }
    
    return NextResponse.json({ authenticated: false });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
