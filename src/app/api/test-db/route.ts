import { NextResponse } from 'next/server';
// import { connectDB } from '@/lib/mongodb';

export async function GET() {
  // MongoDB connection disabled - using mock data only
  return NextResponse.json({ 
    success: true,
    message: 'MongoDB connection disabled. Using mock data.',
    note: 'To enable MongoDB, uncomment the code in this file and mongodb.ts'
  });
}
