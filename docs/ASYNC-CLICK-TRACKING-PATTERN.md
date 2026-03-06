# Async Click Tracking Pattern

**Priority**: Medium  
**Impact**: UX improvement (200ms → 10ms redirect latency)  
**Status**: Architecture documented, implementation pending

---

## Current Flow (Blocking)

```
User clicks link
    ↓
API Gateway receives request
    ↓
1. Verify token (10ms)
2. Write to DynamoDB (50ms)  ← BLOCKING
3. Increment metrics (50ms)  ← BLOCKING
4. Lookup campaign (30ms)    ← BLOCKING
5. Redirect user (10ms)
    ↓
Total: ~150-200ms
```

**Problem**: User sees loading spinner for 200ms

---

## Recommended Flow (Async)

```
User clicks link
    ↓
API Gateway receives request
    ↓
1. Verify token (10ms)
2. Redirect immediately (10ms)  ← FAST
    ↓
Total user-facing latency: 20ms

Meanwhile (async):
    ↓
Publish to SQS/EventBridge
    ↓
Lambda worker processes click
    ↓
- Write DynamoDB
- Increment metrics
- Log audit trail
```

---

## Implementation Options

### Option 1: SQS + Lambda (Recommended)

**Architecture**:
```
/r/{token} endpoint
    ↓
1. Verify token
2. Publish to SQS
3. Redirect (don't wait)

SQS Queue: click-tracking-queue
    ↓
Lambda Consumer: click-processor
    ↓
- trackClick()
- incrementMetric()
```

**Code Example**:
```typescript
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';

const sqs = new SQSClient({});

export async function GET(request: NextRequest, { params }: RouteParams) {
  const payload = verifyTrackingToken(params.token);
  if (!payload) return 403;
  
  // Get redirect URL
  const campaignData = await getCampaign(payload.campaignId);
  
  // Queue click tracking (fire-and-forget)
  sqs.send(new SendMessageCommand({
    QueueUrl: process.env.CLICK_QUEUE_URL,
    MessageBody: JSON.stringify({
      campaignId: payload.campaignId,
      recipientId: payload.recipientId,
      timestamp: Date.now()
    })
  })).catch(err => console.error('Queue failed:', err));
  
  // IMMEDIATE REDIRECT (don't wait for queue)
  return NextResponse.redirect(campaignData.redirectUrl);
}
```

**Lambda Worker**:
```typescript
export async function handler(event: SQSEvent) {
  for (const record of event.Records) {
    const { campaignId, recipientId } = JSON.parse(record.body);
    
    const metrics = getCampaignMetrics();
    await metrics.trackClick(campaignId, recipientId);
  }
}
```

**Pros**:
- Ultra-fast user experience
- Reliable (SQS retries on failure)
- Decouples tracking from redirect

**Cons**:
- Additional AWS cost (minimal: ~$0.40/million clicks)
- More infrastructure complexity

---

### Option 2: Promise.allSettled (Simpler)

**Code**:
```typescript
export async function GET(request: NextRequest, { params }: RouteParams) {
  const payload = verifyTrackingToken(params.token);
  if (!payload) return 403;
  
  // Fetch campaign + track click in parallel
  const [campaignData] = await Promise.allSettled([
    getCampaign(payload.campaignId),
    getCampaignMetrics().trackClick(payload.campaignId, payload.recipientId)
  ]);
  
  if (campaignData.status === 'rejected') return 404;
  
  return NextResponse.redirect(campaignData.value.redirectUrl);
}
```

**Pros**:
- No additional infrastructure
- Simple implementation
- Still faster than sequential

**Cons**:
- Not truly async (still blocks on getCampaign)
- No retry mechanism
- Still ~50ms latency

---

### Option 3: Next.js waitUntil (Best for Vercel)

**Vercel-specific API for background tasks**:

```typescript
import { waitUntil } from '@vercel/wait-until';

export async function GET(request: NextRequest, { params }: RouteParams) {
  const payload = verifyTrackingToken(params.token);
  if (!payload) return 403;
  
  const campaignData = await getCampaign(payload.campaignId);
  
  // Track click in background (doesn't block response)
  waitUntil(
    getCampaignMetrics().trackClick(payload.campaignId, payload.recipientId)
  );
  
  return NextResponse.redirect(campaignData.value.redirectUrl);
}
```

**Pros**:
- No infrastructure changes needed
- Works natively with Vercel
- True fire-and-forget

**Cons**:
- Vercel-specific (not portable)
- No retry mechanism
- Subject to function timeout (10s max)

---

## Recommendation

**For MVP/Testing**: Option 2 (Promise.allSettled)
- Quickest to implement
- No infrastructure changes
- Good enough for < 100k clicks/month

**For Production Scale**: Option 1 (SQS + Lambda)
- Best latency (~10ms redirects)
- Reliable with retries
- Scales to millions of clicks
- Decoupled architecture

**For Vercel Deploy**: Option 3 (waitUntil)
- Native Vercel integration
- Zero infrastructure
- Great developer experience

---

## Performance Impact

| Metric | Current | With Queue | Improvement |
|--------|---------|------------|-------------|
| User-facing latency | 200ms | 10ms | 95% faster |
| DynamoDB write pressure | Inline | Batched | 80% cheaper |
| Error impact | Breaks redirect | Silent retry | Resilient |

---

## Implementation Checklist

- [ ] Choose async pattern (SQS vs Promise vs waitUntil)
- [ ] Update /r/[token]/route.ts
- [ ] Add error logging for failed tracking
- [ ] Test redirect speed (should be <50ms)
- [ ] Monitor queue depth (if using SQS)
- [ ] Add CloudWatch alerts for failed clicks

---

## Cost Analysis

**Current**: $0.50/million clicks (inline writes)  
**With SQS**: $0.90/million clicks (+$0.40 for queue)  
**With waitUntil**: $0.50/million clicks (same)

**User value**: 95% faster redirects >>> $0.40/million cost

---

## Status

Architecture documented. Implementation deferred to after:
1. Reply attribution integration (higher priority)
2. Analytics API caching (higher ROI)
3. Audience segmentation (product priority)

Can ship current implementation to production. Async optimization is **polish, not blocker**.
