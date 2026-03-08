/**
 * Create Admin Script
 *
 * Creates a new admin user in the streefi_admins DynamoDB table.
 * Run this ONCE per admin before they can log in.
 *
 * Usage:
 *   node scripts/create-admin.js <email> <password> [role]
 *
 * Arguments:
 *   email    - Admin email address (used as login username)
 *   password - Plain-text password (will be hashed before storing)
 *   role     - Optional: "super_admin" or "admin" (default: "admin")
 *
 * Examples:
 *   node scripts/create-admin.js admin@streefi.in MySecurePass123!
 *   node scripts/create-admin.js nisar@streefi.in MySecurePass123! super_admin
 *   node scripts/create-admin.js team@streefi.in TeamPass456! admin
 *
 * Prerequisites:
 *   - Set AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY in your environment
 *     OR have AWS credentials configured via ~/.aws/credentials
 *   - ADMIN_TABLE_NAME env var (optional, defaults to "streefi_admins")
 *   - DYNAMODB_ENDPOINT (optional, for local DynamoDB testing)
 *
 * Security:
 *   - Password is hashed with PBKDF2-SHA512 (same as production)
 *   - Never stored in plain text
 *   - Script does not print the hash to avoid logging
 */

'use strict';

const crypto = require('crypto');
const { DynamoDBClient, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');

// ── PBKDF2 parameters (must match src/lib/crypto.ts) ──────────────────────
const SALT_LENGTH = 32;
const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

// ── Validate inputs ────────────────────────────────────────────────────────
const [,, emailArg, passwordArg, roleArg] = process.argv;

if (!emailArg || !passwordArg) {
  console.error('\n❌  Missing required arguments\n');
  console.log('Usage:');
  console.log('  node scripts/create-admin.js <email> <password> [role]\n');
  console.log('Examples:');
  console.log('  node scripts/create-admin.js admin@streefi.in MyPass123!');
  console.log('  node scripts/create-admin.js nisar@streefi.in MyPass123! super_admin\n');
  process.exit(1);
}

const email = emailArg.trim().toLowerCase();
const password = passwordArg;
const role = (roleArg || 'admin').trim();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error(`\n❌  Invalid email address: ${email}\n`);
  process.exit(1);
}

if (!['super_admin', 'admin'].includes(role)) {
  console.error(`\n❌  Invalid role "${role}". Must be "super_admin" or "admin"\n`);
  process.exit(1);
}

if (password.length < 8) {
  console.error('\n❌  Password must be at least 8 characters\n');
  process.exit(1);
}

// ── DynamoDB client ────────────────────────────────────────────────────────
const TABLE_NAME = process.env.ADMIN_TABLE_NAME || 'streefi_admins';
const region = process.env.AWS_REGION || 'us-east-1';

const clientConfig = { region };
if (process.env.DYNAMODB_ENDPOINT) {
  clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
}

const client = new DynamoDBClient(clientConfig);

async function run() {
  console.log(`\n🔐 Creating admin: ${email} (role: ${role})`);
  console.log(`   Table: ${TABLE_NAME}  |  Region: ${region}\n`);

  // Check if admin already exists
  const existing = await client.send(new GetItemCommand({
    TableName: TABLE_NAME,
    Key: { admin_id: { S: email } },
  }));

  if (existing.Item) {
    console.error(`❌  Admin already exists: ${email}`);
    console.log('   To update the password, delete the record first or use a separate update script.\n');
    process.exit(1);
  }

  const passwordHash = hashPassword(password);
  const now = Math.floor(Date.now() / 1000);

  await client.send(new PutItemCommand({
    TableName: TABLE_NAME,
    Item: {
      admin_id:      { S: email },
      email:         { S: email },
      password_hash: { S: passwordHash },
      role:          { S: role },
      created_at:    { N: now.toString() },
      updated_at:    { N: now.toString() },
    },
    ConditionExpression: 'attribute_not_exists(admin_id)',
  }));

  console.log('✅  Admin created successfully!\n');
  console.log(`   Email : ${email}`);
  console.log(`   Role  : ${role}`);
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('The admin can now log in at /whatsapp-admin');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

run().catch(err => {
  console.error('\n❌  Failed to create admin:', err.message || err);
  if (err.name === 'ConditionalCheckFailedException') {
    console.error('   Admin already exists with this email.\n');
  } else if (err.name === 'ResourceNotFoundException') {
    console.error(`   Table "${TABLE_NAME}" not found. Check ADMIN_TABLE_NAME env var.\n`);
  } else if (err.name === 'UnrecognizedClientException' || err.message?.includes('credentials')) {
    console.error('   AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.\n');
  }
  process.exit(1);
});
