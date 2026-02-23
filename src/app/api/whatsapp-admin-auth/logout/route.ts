import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';

const COOKIE_NAME = 'wa_admin_session';

// POST - Logout (delete session from DynamoDB and clear cookie)
export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(COOKIE_NAME);
    
    // If session exists, delete from streefi_sessions table
    if (sessionCookie?.value) {
      const sessionId = sessionCookie.value;
      
      const dynamoClient = new DynamoDBClient({
        region: process.env.AWS_REGION,
      });
      
      try {
        await dynamoClient.send(
          new DeleteItemCommand({
            TableName: process.env.SESSION_TABLE_NAME || 'streefi_sessions',
            Key: {
              session_id: { S: sessionId },
            },
          })
        );
        console.log('✅ Session deleted from streefi_sessions:', sessionId);
      } catch (dbError) {
        console.error('⚠️ Failed to delete session from DynamoDB:', dbError);
        // Continue with cookie deletion even if DB delete fails
      }
    }
    
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
