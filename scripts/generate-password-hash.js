/**
 * Password Hash Generator Script
 * 
 * Run this script to generate a secure hash for your admin passwords
 * 
 * Usage:
 * 1. node scripts/generate-password-hash.js your-password-here
 * 2. Copy the generated hash
 * 3. Add to .env.local: 
 *    - WA_ADMIN_PASSWORD_HASH=<generated-hash> (for WhatsApp Admin)
 *    - EMAIL_ADMIN_PASSWORD_HASH=<generated-hash> (for Email Admin)
 */

const crypto = require('crypto');

const SALT_LENGTH = 32;
const ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex');
  return `${salt}:${hash}`;
}

// Get password from command line argument
const password = process.argv[2];

if (!password) {
  console.error('❌ Error: Please provide a password');
  console.log('\nUsage:');
  console.log('  node scripts/generate-password-hash.js <your-password>');
  console.log('\nExample:');
  console.log('  node scripts/generate-password-hash.js MySecurePassword123!');
  process.exit(1);
}

console.log('\n🔐 Generating secure password hash...\n');

const hash = hashPassword(password);

console.log('✅ Hash generated successfully!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('\nAdd this to your .env.local file:\n');
console.log('For WhatsApp Admin:');
console.log(`WA_ADMIN_PASSWORD_HASH="${hash}"`);
console.log('\nFor Email Admin:');
console.log(`EMAIL_ADMIN_PASSWORD_HASH="${hash}"`);
console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('⚠️  Security Notes:');
console.log('  • Never commit this hash to version control');
console.log('  • Keep .env.local in .gitignore');
console.log('  • Use different passwords for dev/staging/production');
console.log('  • This hash uses PBKDF2 with 100,000 iterations');
console.log('  • You can use the same hash for both admins or generate different ones\n');
