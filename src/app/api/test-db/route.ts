import { NextResponse } from 'next/server';
import { 
  DynamoDBClient, 
  PutItemCommand, 
  GetItemCommand,
  DeleteItemCommand,
  ScanCommand
} from "@aws-sdk/client-dynamodb";
import { validateAdminSession } from '@/lib/adminAuth';

// Force Node.js runtime (required for DynamoDB SDK)
export const runtime = 'nodejs';

// Explicitly set region - AWS_REGION is automatically available in AWS Amplify
const client = new DynamoDBClient({
  region: process.env.AWS_REGION,
});

const TABLE_NAME = "streefi_admins"; // Case-sensitive - must match exactly

export async function GET(request: Request) {
  // 🔒 PRODUCTION SAFETY: Disable test endpoint in production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  // 🔒 SECURITY: Protect test endpoint - requires email admin authentication
  const auth = await validateAdminSession(request, 'email-session');
  if (!auth.valid) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized - Admin access required' },
      { status: 401 }
    );
  }
  const results = {
    success: true,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    tests: [] as Array<{ name: string; status: string; data?: any; error?: string }>,
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  try {
    // Test 1: AWS Configuration Check
    try {
      const hasAccessKey = !!process.env.AWS_ACCESS_KEY_ID;
      const hasSecretKey = !!process.env.AWS_SECRET_ACCESS_KEY;
      const executionEnv = process.env.AWS_EXECUTION_ENV || "local";
      
      // In Amplify production, credentials should be false (using IAM Role)
      const isUsingIAMRole = !hasAccessKey && !hasSecretKey && executionEnv !== "local";
      
      const config = {
        region: process.env.AWS_REGION || client.config.region || "not-set",
        hasAccessKeyId: hasAccessKey,
        hasSecretAccessKey: hasSecretKey,
        hasSessionToken: !!process.env.AWS_SESSION_TOKEN,
        tableName: TABLE_NAME,
        credentialSource: executionEnv,
        authMethod: isUsingIAMRole ? "IAM Role (Secure ✅)" : hasAccessKey ? "Access Keys (Remove for production ⚠️)" : "Not configured",
      };
      results.tests.push({ 
        name: "AWS Configuration Check", 
        status: "✅ PASSED",
        data: config
      });
    } catch (error: any) {
      results.tests.push({ 
        name: "AWS Configuration Check", 
        status: "❌ FAILED", 
        error: error.message 
      });
    }

    // Test 2: Write Admin Session (Generic - for testing only)
    const testEmail = `test-${Date.now()}@streefi.com`;
    try {
      await client.send(
        new PutItemCommand({
          TableName: TABLE_NAME,
          Item: {
            email: { S: testEmail }, // MUST match partition key
            type: { S: "test-session" },
            createdAt: { S: new Date().toISOString() },
            expiresAt: { N: String(Math.floor(Date.now()/1000) + 86400) }, // 1 day from now
            status: { S: "active" }
          }
        })
      );
      results.tests.push({ 
        name: "Write Admin Session", 
        status: "✅ PASSED",
        data: { email: testEmail, note: "Session created successfully" }
      });
    } catch (error: any) {
      results.tests.push({ 
        name: "Write Admin Session", 
        status: "❌ FAILED", 
        error: error.message 
      });
    }

    // Test 3: Read Admin Session
    try {
      const getResult = await client.send(
        new GetItemCommand({
          TableName: TABLE_NAME,
          Key: {
            email: { S: testEmail } // MUST match partition key
          }
        })
      );
      
      const session = getResult.Item ? {
        email: getResult.Item.email?.S,
        type: getResult.Item.type?.S,
        status: getResult.Item.status?.S,
        createdAt: getResult.Item.createdAt?.S
      } : null;

      results.tests.push({ 
        name: "Read Admin Session", 
        status: session ? "✅ PASSED" : "❌ FAILED",
        data: session
      });
    } catch (error: any) {
      results.tests.push({ 
        name: "Read Admin Session", 
        status: "❌ FAILED", 
        error: error.message 
      });
    }

    // Test 4: Delete Test Session (cleanup)
    try {
      await client.send(
        new DeleteItemCommand({
          TableName: TABLE_NAME,
          Key: {
            email: { S: testEmail } // MUST match partition key
          }
        })
      );
      results.tests.push({ 
        name: "Delete Test Session (Cleanup)", 
        status: "✅ PASSED",
        data: { note: "Test data cleaned up successfully" }
      });
    } catch (error: any) {
      results.tests.push({ 
        name: "Delete Test Session", 
        status: "❌ FAILED", 
        error: error.message 
      });
    }

    // Test 5: Count total sessions (without listing data)
    // ⚠️ WARNING: Scan is expensive and slow at scale
    // Only use Scan for testing - in production use GetItem or Query
    try {
      const scanResult = await client.send(
        new ScanCommand({
          TableName: TABLE_NAME,
          Select: "COUNT"
        })
      );

      results.tests.push({ 
        name: "Count Sessions in Table", 
        status: "✅ PASSED",
        data: { totalCount: scanResult.Count || 0 }
      });
    } catch (error: any) {
      results.tests.push({ 
        name: "Count Sessions", 
        status: "❌ FAILED", 
        error: error.message 
      });
    }

    // Check if all tests passed
    const allPassed = results.tests.every(t => t.status.includes("✅"));
    results.success = allPassed;
    
    // Calculate summary
    results.summary.total = results.tests.length;
    results.summary.passed = results.tests.filter(t => t.status.includes("✅")).length;
    results.summary.failed = results.tests.filter(t => t.status.includes("❌")).length;

    return NextResponse.json(results, { status: allPassed ? 200 : 500 });
  } catch (error: any) {
    console.error("Test DB Error:", error);
    
    // Update summary for caught errors
    results.summary.total = results.tests.length;
    results.summary.passed = results.tests.filter(t => t.status.includes("✅")).length;
    results.summary.failed = results.tests.filter(t => t.status.includes("❌")).length;
    
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: error.stack,
      tests: results.tests,
      summary: results.summary
    }, { status: 500 });
  }
}
