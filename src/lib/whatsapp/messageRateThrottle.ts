/**
 * Message Rate Throttle Service
 * 
 * CRITICAL: Prevents Meta API rate limit violations.
 * 
 * META RATE LIMITS:
 * - Standard tier: 80 messages/second
 * - But campaigns should send slower for quality
 * 
 * RECOMMENDED RATES:
 * - New accounts: 5 msg/sec (warmup)
 * - Established: 10-15 msg/sec (safe)
 * - High quality: 20 msg/sec (max)
 * 
 * WHY:
 * - Sending too fast = 429 errors
 * - 429 errors = quality score drop
 * - Quality drop = delivery rate drop
 * 
 * USAGE:
 * ```
 * await throttle.waitForSlot();
 * await sendMessage();
 * ```
 */

export class MessageRateThrottle {
  private lastSendTime: number = 0;
  private sendQueue: number[] = []; // Timestamps of recent sends
  private readonly windowMs: number = 1000; // 1 second window
  
  constructor(
    private readonly maxPerSecond: number = 10 // Default: 10 msg/sec (safe)
  ) {}

  /**
   * Wait until next send slot is available
   */
  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Clean old timestamps outside window
    this.sendQueue = this.sendQueue.filter(ts => now - ts < this.windowMs);
    
    // Check if we hit rate limit
    if (this.sendQueue.length >= this.maxPerSecond) {
      // Calculate wait time
      const oldestInWindow = this.sendQueue[0];
      const waitMs = this.windowMs - (now - oldestInWindow);
      
      if (waitMs > 0) {
        console.log(`⏸️ [RateThrottle] Rate limit reached (${this.maxPerSecond}/sec), waiting ${waitMs}ms`);
        await this.sleep(waitMs);
      }
    }
    
    // Record this send
    this.sendQueue.push(Date.now());
  }

  /**
   * Check if sending is currently allowed (without waiting)
   */
  canSend(): boolean {
    const now = Date.now();
    this.sendQueue = this.sendQueue.filter(ts => now - ts < this.windowMs);
    return this.sendQueue.length < this.maxPerSecond;
  }

  /**
   * Get current send rate (messages per second)
   */
  getCurrentRate(): number {
    const now = Date.now();
    this.sendQueue = this.sendQueue.filter(ts => now - ts < this.windowMs);
    return this.sendQueue.length;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Reset throttle state (useful for testing)
   */
  reset(): void {
    this.sendQueue = [];
    this.lastSendTime = 0;
  }
}

// Global throttle instance (shared across all message sends)
let globalThrottle: MessageRateThrottle | null = null;

/**
 * Get global rate throttle instance
 * Rate is configured based on account quality tier
 */
export function getMessageRateThrottle(): MessageRateThrottle {
  if (!globalThrottle) {
    // Determine rate from environment or default
    const rateLimit = parseInt(process.env.WHATSAPP_RATE_LIMIT_PER_SEC || '10', 10);
    globalThrottle = new MessageRateThrottle(rateLimit);
    console.log(`✅ [RateThrottle] Initialized with ${rateLimit} msg/sec limit`);
  }
  return globalThrottle;
}

/**
 * Create throttle with custom rate (for testing)
 */
export function createMessageRateThrottle(maxPerSecond: number): MessageRateThrottle {
  return new MessageRateThrottle(maxPerSecond);
}
