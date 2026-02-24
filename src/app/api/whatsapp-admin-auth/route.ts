import { NextResponse } from 'next/server';

// Force Node.js runtime
export const runtime = 'nodejs';

// This is a placeholder route for the whatsapp-admin-auth directory
// Actual auth endpoints are in subdirectories: /login, /logout, /check
export async function GET() {
  return NextResponse.json(
    { 
      error: 'Not Found',
      message: 'Use /login, /logout, or /check endpoints'
    },
    { status: 404 }
  );
}

export async function POST() {
  return NextResponse.json(
    { 
      error: 'Not Found',
      message: 'Use /login, /logout, or /check endpoints'
    },
    { status: 404 }
  );
}
