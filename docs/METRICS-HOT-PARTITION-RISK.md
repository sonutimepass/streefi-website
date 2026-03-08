# Metrics Hot Partition Risk & Mitigation Strategies

**Status:** Monitoring Required in Phase 6  
**Priority:** HIGH (if throughput > 100 msg/sec)  
**Date:** March 8, 2026

---

## Problem Statement

All campaign metric updates target a single DynamoDB item:

```
PK = CAMPAIGN#abc123
SK = METADATA
```

**Concurrent updates from:**
- Execute batch worker → increments `sent_count`
- Webhook handler (Meta callbacks) → increments `delivered_count`, `read_count`
- Reconciliation jobs → updates metrics
- Analytics aggregators → reads metrics

**DynamoDB limit:** ~1,000 write requests/sec per partition

At scale, this creates a **hot partition** that throttles.

---

## When This Becomes a Problem

### Current Architecture (Safe)

```
Campaign: 1,000 recipients
Rate limit: 80 messages/min
Duration: ~12 minutes

Writes to METADATA item:
- 1,000 sent_count increments over 12 min = ~1.4 writes/sec
- 950+ delivered webhooks over 15 min = ~1 write/sec
- 500+ read webhooks over 20 min = ~0.4 writes/sec

Total: ~3 writes/sec to same item (well within limits)
```

**Status:** ✅ No throttling risk

### Future Scale (Risk Zone)

```
Campaign: 100,000 recipients
Rate limit: 500 messages/min (approved by Meta)
Duration: ~200 minutes

Writes to METADATA item:
- 100,000 sent_count increments = ~8 writes/sec
- 95,000 delivered webhooks = ~8 writes/sec
- 50,000 read webhooks = ~4 writes/sec

Total: ~20 writes/sec per campaign

With 5 concurrent campaigns: 100 writes/sec (approaching limits)
With 20 concurrent campaigns: 400 writes/sec (WILL THROTTLE)
```

**Status:** ⚠️ High throttling risk

---

## Symptoms of Hot Partition

1. **ProvisionedThroughputExceededException** errors in logs
2. **Webhook handler failures** (can't update delivered count)
3. **Metrics lag** (dashboard shows stale numbers)
4. **Increased latency** (UpdateItem takes 1-5 seconds instead of 10-50ms)
5. **Failed increments** (atomic ADD operations rejected)

**User impact:**
- Inaccurate campaign metrics
- Dashboard shows wrong numbers
- Retries create duplicate increments
- Webhooks dropped (message status unknown)

---

## Solution 1: Separate Metric Items (Simple)

### Current (Single Item)

```typescript
// All metrics in one item
PK = CAMPAIGN#abc123
SK = METADATA

sent_count: 50000
delivered_count: 48000
failed_count: 2000
read_count: 30000
```

**Problem:** All increments hit same item.

### Proposed (Separate Items)

```typescript
// Split metrics into separate items
PK = CAMPAIGN#abc123, SK = METRIC#SENT,      value: 50000
PK = CAMPAIGN#abc123, SK = METRIC#DELIVERED, value: 48000
PK = CAMPAIGN#abc123, SK = METRIC#FAILED,    value: 2000
PK = CAMPAIGN#abc123, SK = METRIC#READ,      value: 30000
```

**Benefit:** Each metric increments independently (4x throughput).

### Implementation

#### Repository Layer

```typescript
// src/lib/repositories/campaignMetricsRepository.ts
export class CampaignMetricsRepository {
  /**
   * Increment a specific metric (separate items)
   */
  async incrementMetric(
    campaignId: string,
    metric: 'SENT' | 'DELIVERED' | 'FAILED' | 'READ',
    incrementBy: number = 1
  ): Promise<void> {
    await dynamoClient.send(new UpdateItemCommand({
      TableName: TABLES.CAMPAIGNS,
      Key: {
        PK: { S: `CAMPAIGN#${campaignId}` },
        SK: { S: `METRIC#${metric}` }  // Separate item per metric
      },
      UpdateExpression: "ADD #value :increment",
      ExpressionAttributeNames: {
        "#value": "value"
      },
      ExpressionAttributeValues: {
        ":increment": { N: incrementBy.toString() }
      }
    }));
  }

  /**
   * Get all metrics for a campaign (Query by PK)
   */
  async getMetrics(campaignId: string): Promise<CampaignMetrics> {
    const response = await dynamoClient.send(new QueryCommand({
      TableName: TABLES.CAMPAIGNS,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": { S: `CAMPAIGN#${campaignId}` },
        ":prefix": { S: "METRIC#" }
      }
    }));

    const metrics = {
      sent_count: 0,
      delivered_count: 0,
      failed_count: 0,
      read_count: 0
    };

    for (const item of response.Items || []) {
      const metricType = item.SK?.S?.replace("METRIC#", "");
      const value = parseInt(item.value?.N || "0", 10);
      
      if (metricType === "SENT") metrics.sent_count = value;
      if (metricType === "DELIVERED") metrics.delivered_count = value;
      if (metricType === "FAILED") metrics.failed_count = value;
      if (metricType === "READ") metrics.read_count = value;
    }

    return metrics;
  }
}
```

#### Migration Strategy

1. **Phase 6a:** Add separate metric items (keep old item for backward compatibility)
2. **Phase 6b:** Dual-write (update both old and new)
3. **Phase 6c:** Switch reads to new items
4. **Phase 6d:** Stop writing to old item
5. **Phase 6e:** Delete old `sent_count`, `delivered_count` from METADATA item

**Timeline:** 2-3 weeks with production monitoring

---

## Solution 2: Distributed Counters (Advanced)

### Concept

**Shard the counter** across multiple items:

```typescript
// 4 shards per metric
PK = CAMPAIGN#abc123, SK = METRIC#SENT#SHARD_0, value: 12500
PK = CAMPAIGN#abc123, SK = METRIC#SENT#SHARD_1, value: 12300
PK = CAMPAIGN#abc123, SK = METRIC#SENT#SHARD_2, value: 12600
PK = CAMPAIGN#abc123, SK = METRIC#SENT#SHARD_3, value: 12600

Total sent_count = sum of shards = 50000
```

**Benefit:** Writers randomly choose shard → distributes load.

**Throughput:** 
- 4 shards × 1000 writes/sec/shard = 4000 writes/sec per metric
- Supports 20+ concurrent high-volume campaigns

### Implementation

```typescript
export class DistributedCounterRepository {
  private readonly SHARD_COUNT = 4;

  /**
   * Increment distributed counter
   */
  async increment(
    campaignId: string,
    metric: 'SENT' | 'DELIVERED' | 'FAILED' | 'READ',
    incrementBy: number = 1
  ): Promise<void> {
    // Randomly select shard (distributes writes)
    const shardId = Math.floor(Math.random() * this.SHARD_COUNT);
    
    await dynamoClient.send(new UpdateItemCommand({
      TableName: TABLES.CAMPAIGNS,
      Key: {
        PK: { S: `CAMPAIGN#${campaignId}` },
        SK: { S: `METRIC#${metric}#SHARD_${shardId}` }
      },
      UpdateExpression: "ADD #value :increment",
      ExpressionAttributeNames: { "#value": "value" },
      ExpressionAttributeValues: {
        ":increment": { N: incrementBy.toString() }
      }
    }));
  }

  /**
   * Get aggregated counter value (sum all shards)
   */
  async getCount(
    campaignId: string,
    metric: 'SENT' | 'DELIVERED' | 'FAILED' | 'READ'
  ): Promise<number> {
    const response = await dynamoClient.send(new QueryCommand({
      TableName: TABLES.CAMPAIGNS,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :prefix)",
      ExpressionAttributeValues: {
        ":pk": { S: `CAMPAIGN#${campaignId}` },
        ":prefix": { S: `METRIC#${metric}#SHARD_` }
      }
    }));

    return (response.Items || [])
      .reduce((sum, item) => sum + parseInt(item.value?.N || "0", 10), 0);
  }
}
```

### When to Use

**Only if:**
- Running 10+ concurrent campaigns
- Each campaign > 50k recipients
- Seeing ProvisionedThroughputExceededException in CloudWatch
- Webhook handlers throttling

**Cost:** Minimal (4 shards per metric = 16 extra items per campaign)

---

## Solution 3: DynamoDB Streams + Lambda Aggregator

### Architecture

```
                     ┌──────────────┐
Webhook Handler  ──→ │  Recipient   │
                     │   Record     │ (status: DELIVERED)
                     └──────┬───────┘
                            │
                            ↓ DynamoDB Stream
                     ┌──────────────┐
                     │   Lambda     │
                     │  Aggregator  │ (batch process)
                     └──────┬───────┘
                            │
                            ↓ Batch Update
                     ┌──────────────┐
                     │  Metrics     │
                     │   Item       │ (delivered_count += 100)
                     └──────────────┘
```

### Benefits

- **No hot partition:** Updates batched (e.g., every 10 seconds)
- **Near real-time:** ~10-15 second delay
- **Resilient:** Lambda retries on failures
- **Cost-effective:** Serverless, scales automatically

### Trade-offs

- ❌ **Not truly atomic:** 10-15 sec lag in dashboard
- ❌ **More complexity:** Lambda code, DynamoDB Streams config
- ❌ **Harder to debug:** Distributed system

### When to Use

**Only if:**
- Throughput > 500 messages/sec across all campaigns
- Solutions 1-2 insufficient
- Can tolerate slight metric lag

---

## Solution 4: Increase WCU Temporarily

### Simple Mitigation

During high-traffic periods (e.g., large campaign execution):

```bash
# Temporarily increase WCU
aws dynamodb update-table \\
  --table-name streefi_campaigns \\
  --provisioned-throughput ReadCapacityUnits=10,WriteCapacityUnits=50

# Wait 1 hour

# Reduce back to normal
aws dynamodb update-table \\
  --table-name streefi_campaigns \\
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

**Benefit:** Quick fix during emergencies  
**Cost:** ~$5-10/hour (WCU spike)  
**Downside:** Not scalable long-term

---

## Recommendation by Phase

### Phase 1-5 (Current)

**Action:** ✅ No changes needed  
**Reason:** Low throughput (< 10 writes/sec per campaign)  
**Monitoring:** Track CloudWatch metrics for baseline

---

### Phase 6 (CRITICAL files migration)

**Action:** ⚠️ Monitor closely  
**Reason:** execute-batch and webhook handler now using repository layer  
**Threshold:** If `UserErrors` > 10/hour, investigate

**If throttling occurs:**

1. **Immediate:** Increase WCU to 20-50 temporarily
2. **Short-term (Week 1):** Implement Solution 1 (Separate metric items)
3. **Long-term (Month 1+):** Implement Solution 2 (Distributed counters) if needed

---

### Phase 7+ (Scale to 100k+ recipients per campaign)

**Action:** 🔥 Implement Solution 1 or 2 BEFORE scaling  
**Reason:** Proactive prevention  
**Timing:** Before increasing rate limits or campaign sizes

---

## Monitoring & Alerting

### CloudWatch Metrics to Track

```yaml
Metric: UserErrors
Namespace: AWS/DynamoDB
Dimensions:
  - TableName: streefi_campaigns
  - Operation: UpdateItem
Alarm Threshold: > 10 errors in 5 minutes
```

```yaml
Metric: ThrottledRequests
Namespace: AWS/DynamoDB
Dimensions:
  - TableName: streefi_campaigns
Alarm Threshold: > 5 throttled requests in 1 minute
```

```yaml
Metric: ConsumedWriteCapacityUnits
Namespace: AWS/DynamoDB
Dimensions:
  - TableName: streefi_campaigns
Alarm Threshold: > 80% of provisioned WCU
```

### Custom Metrics

Log metric update latency:

```typescript
const startTime = Date.now();
await campaignRepository.incrementMetric(campaignId, 'sent_count');
const duration = Date.now() - startTime;

if (duration > 100) {
  console.warn(`[SLOW METRIC UPDATE] ${campaignId}: ${duration}ms`);
}
```

**Alert if P95 > 200ms** (indicates contention).

---

## Testing Hot Partition

### Load Test Script

```typescript
// scripts/test-metrics-load.ts
import { campaignRepository } from '../src/lib/repositories';

async function simulateHighLoad() {
  const campaignId = "test_campaign_123";
  const concurrentWorkers = 20;
  const incrementsPerWorker = 1000;

  console.log(`Simulating ${concurrentWorkers × incrementsPerWorker} increments...`);

  const workers = Array.from({ length: concurrentWorkers }, async (_, i) => {
    for (let j = 0; j < incrementsPerWorker; j++) {
      try {
        await campaignRepository.incrementMetric(campaignId, 'sent_count');
      } catch (error: any) {
        if (error.name === 'ProvisionedThroughputExceededException') {
          console.error(`Worker ${i} throttled at increment ${j}`);
        }
      }
    }
  });

  await Promise.all(workers);
  console.log("Load test complete");
}

simulateHighLoad();
```

Run in staging to measure throttling point.

---

## Decision Matrix

| Scenario                          | Recommendation         | Effort | Timeline |
|-----------------------------------|------------------------|--------|----------|
| Phase 1-5 (low traffic)           | No action              | None   | N/A      |
| Phase 6, throttling detected      | Increase WCU + Sol 1   | LOW    | 1 week   |
| 5-10 concurrent campaigns         | Solution 1             | LOW    | 1-2 weeks|
| 10-20 concurrent campaigns        | Solution 2             | MEDIUM | 2-3 weeks|
| >20 campaigns or >500 msg/sec     | Solution 3 (Streams)   | HIGH   | 4 weeks  |

---

## Conclusion

**Current status:** ✅ Safe (low throughput)  
**Action required:** 📊 Monitor in Phase 6  
**Future proofing:** Implement Solution 1 before scaling to 100k+ recipients

**Key takeaway:** Hot partition is a **future risk**, not an immediate blocker. Proceed with Phase 1-5 migration as planned, then evaluate metrics during Phase 6.

---

**Last Updated:** March 8, 2026  
**Status:** Monitoring Required  
**Next Review:** After Phase 6 deployment
