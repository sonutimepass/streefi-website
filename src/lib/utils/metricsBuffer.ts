/**
 * Metrics Buffer for Campaign Analytics
 * 
 * Batches campaign metric updates to prevent hot partition on campaign METADATA.
 * 
 * **Problem:** WhatsApp campaigns can send 1000s of messages, each updating the same
 * CAMPAIGN#xxx METADATA record → hot partition → throttling at high volume.
 * 
 * **Solution:** Buffer metric updates in memory and flush in batches:
 * - Flush after 100 updates (threshold)
 * - Flush every 30 seconds (interval)
 * - Flush on demand (manual flush)
 * 
 * **Write Reduction:** 1000 messages = 10 DynamoDB writes (100× reduction!)
 * 
 * Usage:
 * ```typescript
 * const buffer = new MetricsBuffer(async (updates) => {
 *   // Batch update DynamoDB
 *   for (const [campaignId, metrics] of updates) {
 *     await updateMetrics(campaignId, metrics);
 *   }
 * });
 * 
 * buffer.add({ campaignId: 'c123', type: 'sent', count: 1 });
 * // ... 99 more updates ...
 * // → Auto-flushes at 100
 * ```
 */

interface MetricUpdate {
  campaignId: string;
  type: 'sent' | 'delivered' | 'read' | 'failed' | 'blocked';
  count: number;
}

export class MetricsBuffer {
  private buffer: Map<string, Record<string, number>> = new Map();
  private flushThreshold: number;
  private flushInterval: number;
  private updateCount = 0;
  private timer?: NodeJS.Timeout;
  private isShuttingDown = false;
  
  constructor(
    private flushCallback: (updates: Map<string, Record<string, number>>) => Promise<void>,
    options?: {
      threshold?: number;  // Flush after N updates (default: 100)
      interval?: number;   // Flush every N ms (default: 30000)
    }
  ) {
    this.flushThreshold = options?.threshold || 100;
    this.flushInterval = options?.interval || 30000;
    
    // Auto-flush at regular intervals
    this.timer = setInterval(() => {
      this.flush().catch(err => {
        console.error('[MetricsBuffer] Auto-flush error:', err);
      });
    }, this.flushInterval);
  }
  
  /**
   * Add metric update to buffer
   * Auto-flushes when threshold is reached
   */
  add(update: MetricUpdate): void {
    if (this.isShuttingDown) {
      console.warn('[MetricsBuffer] Cannot add updates during shutdown');
      return;
    }
    
    const key = update.campaignId;
    
    if (!this.buffer.has(key)) {
      this.buffer.set(key, {});
    }
    
    const metrics = this.buffer.get(key)!;
    metrics[update.type] = (metrics[update.type] || 0) + update.count;
    
    this.updateCount++;
    
    // Auto-flush if threshold reached
    if (this.updateCount >= this.flushThreshold) {
      // Fire and forget - don't block the caller
      this.flush().catch(err => {
        console.error('[MetricsBuffer] Threshold flush error:', err);
      });
    }
  }
  
  /**
   * Flush all buffered updates to DynamoDB
   * Returns number of campaigns flushed
   */
  async flush(): Promise<number> {
    if (this.buffer.size === 0) {
      return 0;
    }
    
    // Take snapshot and clear buffer atomically
    const updates = new Map(this.buffer);
    this.buffer.clear();
    this.updateCount = 0;
    
    try {
      await this.flushCallback(updates);
      
      console.log(`✅ [MetricsBuffer] Flushed ${updates.size} campaign(s) to DynamoDB`);
      return updates.size;
    } catch (error) {
      console.error('[MetricsBuffer] Flush failed:', error);
      
      // On failure, restore updates to buffer (retry on next flush)
      for (const [campaignId, metrics] of updates) {
        if (!this.buffer.has(campaignId)) {
          this.buffer.set(campaignId, {});
        }
        
        const existing = this.buffer.get(campaignId)!;
        for (const [type, count] of Object.entries(metrics)) {
          existing[type] = (existing[type] || 0) + count;
        }
      }
      
      throw error;
    }
  }
  
  /**
   * Get current buffer size (number of campaigns with pending updates)
   */
  getBufferSize(): number {
    return this.buffer.size;
  }
  
  /**
   * Get total pending update count
   */
  getPendingUpdates(): number {
    return this.updateCount;
  }
  
  /**
   * Check if buffer has pending updates
   */
  hasPendingUpdates(): boolean {
    return this.buffer.size > 0;
  }
  
  /**
   * Cleanup and final flush
   * Call this before process exit
   */
  async destroy(): Promise<void> {
    this.isShuttingDown = true;
    
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    
    // Final flush of any remaining updates
    if (this.hasPendingUpdates()) {
      console.log('[MetricsBuffer] Final flush on shutdown...');
      await this.flush();
    }
  }
}

export type { MetricUpdate };
