import { sessionRepository } from './repositories/sessionRepository';

// Rate limiting configuration
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

// Rate limit check result
export interface RateLimitResult {
  blocked: boolean;
  attempts?: number;
  lockUntil?: number;
  remainingTime?: number;
}

/**
 * Check if IP address is rate limited
 * 
 * @param ip - Client IP address
 * @returns RateLimitResult indicating if access is blocked
 */
export async function checkLoginRateLimit(ip: string): Promise<RateLimitResult> {
  const result = await sessionRepository.checkRateLimit(ip, MAX_ATTEMPTS, LOCK_DURATION_MINUTES);
  
  if (result.blocked) {
    console.log(`⚠️ IP ${ip} is locked for ${result.remainingTime} more seconds`);
  }
  
  return result;
}

/**
 * Record a failed login attempt
 * Increments counter and locks IP after MAX_ATTEMPTS
 * 
 * @param ip - Client IP address
 */
export async function recordFailedAttempt(ip: string): Promise<void> {
  await sessionRepository.recordFailedAttempt(ip, MAX_ATTEMPTS, LOCK_DURATION_MINUTES);
  
  // Log is handled in repository layer
}

/**
 * Reset failed attempts for an IP (called on successful login)
 * 
 * @param ip - Client IP address
 */
export async function resetAttempts(ip: string): Promise<void> {
  await sessionRepository.resetRateLimit(ip);
  console.log(`✅ Rate limit reset for IP ${ip}`);
}
