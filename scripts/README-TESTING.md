# Step 3: Testing Scripts

Ready-to-run test scripts for validating all production fixes.

## Quick Start

```bash
# Run all tests in sequence
npm run test:production

# Or run individual tests:
npx ts-node scripts/test-distributed-counter.ts
npx ts-node scripts/verify-message-ttl.ts
npx ts-node scripts/verify-counter-ttl.ts
```

## Test Scripts Overview

### 1. **test-distributed-counter.ts**

Tests the distributed counter system across 10 shards:

- ✅ Increments 50 times and checks distribution
- ✅ Verifies total count = sum of all shards
- ✅ Analyzes distribution variance (no hot partitions)
- ✅ Reports active shards and statistics

**Expected Results:**

- All 50 increments succeed
- Shards have relatively even distribution (std dev < 50% of average)
- Total count matches sum of individual shards

### 2. **verify-message-ttl.ts**

Verifies 7-day TTL on messages:

- ✅ Stores a test message
- ✅ Reads it back from DynamoDB
- ✅ Checks TTL attribute is set
- ✅ Verifies TTL is ~7 days (6.95-7.05 days)

**Expected Results:**

- Message has TTL attribute
- TTL expires in ~7 days
- Cost savings: 92% reduction ($17.50/month vs $225/month)

### 3. **verify-counter-ttl.ts**

Verifies 90-day TTL on daily counters:

- ✅ Scans all 10 counter shards
- ✅ Checks TTL on active shards
- ✅ Verifies TTL is ~90 days (89.95-90.05 days)

**Expected Results:**

- Active counter shards have TTL attribute
- TTL expires in ~90 days
- Automatic cleanup after retention period

## Prerequisites

1. **AWS Credentials**: Ensure AWS credentials are configured
2. **DynamoDB Tables**: Tables must exist (streefi_whatsapp)
3. **Environment Variables**: NEXT_PUBLIC_DYNAMODB_TABLE_WHATSAPP set

## Running Tests

### Option 1: Run All Tests (Recommended)

```bash
npm run test:production
```

### Option 2: Run Individual Tests

```bash
# Test 1: Distributed Counter
npx ts-node scripts/test-distributed-counter.ts

# Test 2: Message TTL
npx ts-node scripts/verify-message-ttl.ts

# Test 3: Counter TTL (run after Test 1)
npx ts-node scripts/verify-counter-ttl.ts
```

## Test Order

**Important:** Run tests in this order:

1. `test-distributed-counter.ts` — Creates test data
2. `verify-message-ttl.ts` — Checks message TTL
3. `verify-counter-ttl.ts` — Checks counter TTL

## Success Criteria

All tests must pass with:

- ✅ No throttling errors
- ✅ Distribution variance < 50% of average
- ✅ Message TTL = 7 days (±1 hour)
- ✅ Counter TTL = 90 days (±1 hour)
- ✅ Total count = sum of shard counts

## Troubleshooting

### "No counters found"

**Solution:** Run `test-distributed-counter.ts` first to create test data

### "TTL not set"

**Solution:** Enable TTL on production table:

```bash
aws dynamodb update-time-to-live \
  --table-name streefi_whatsapp \
  --time-to-live-specification "Enabled=true, AttributeName=TTL"
```

### "High variance"

**Solution:** Run more increments (increase test from 50 to 200+ for better distribution)

## Next Steps After Tests Pass

1. ✅ Review CloudWatch metrics
2. ✅ Check [STEP-3-TESTING-GUIDE.md](../docs/STEP-3-TESTING-GUIDE.md) for performance benchmarks
3. ✅ Complete production deployment checklist
4. ✅ Monitor for 24-48 hours

## Cost Impact Summary

| Component       | Retention | Storage (50k users) | Cost/Month       |
| --------------- | --------- | ------------------- | ---------------- |
| Messages        | 7 days    | 70GB                | $17.50           |
| Counters        | 90 days   | <1GB                | $0.25            |
| **Total** | -         | **71GB**      | **$17.75** |

**Savings vs 90-day message retention:** 92% reduction ($225 → $17.75)

## See Also

- [STEP-3-TESTING-GUIDE.md](../docs/STEP-3-TESTING-GUIDE.md) — Complete testing strategy
- [FINAL-PRODUCTION-DATABASE-SCHEMA.md](../docs/FINAL-PRODUCTION-DATABASE-SCHEMA.md) — Database schema
- [PRODUCTION-DEPLOYMENT-ROADMAP.md](../docs/PRODUCTION-DEPLOYMENT-ROADMAP.md) — Deployment guide
