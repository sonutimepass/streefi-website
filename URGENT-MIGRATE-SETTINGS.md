# 🚨 URGENT: Migrate Your WhatsApp Settings Data

**Issue:** Your system settings are in the **wrong table**!

- ❌ **Current Location:** `streefi_whatsapp` (legacy table - NOT used by code)
- ✅ **Should Be In:** `whatsapp_conversations` (active table used by code)

Your app will **fail to load settings** until you migrate this data.

---

## 🎯 Quick Fix: Copy Item in AWS Console

### Step 1: Copy the Item
1. In AWS Console, go to **DynamoDB** → Tables → **streefi_whatsapp**
2. Click **"Explore table items"**
3. Find the item with:
   - **PK:** `SYSTEM`
   - **SK:** `SETTINGS`
4. Click the checkbox to select it
5. Click **"Actions"** → **"Duplicate item"**
6. In the dialog, **change the table name to:** `whatsapp_conversations`
7. Click **"Create item"**

### Step 2: Verify
1. Go to **whatsapp_conversations** table
2. Check that the item now exists there with:
   ```
   PK: SYSTEM
   SK: SETTINGS
   defaultDailyCap: 200
   maxMessagesPerSecond: 20
   metaTierLimit: 200
   safetyBuffer: 80
   updatedAt: 2026-03-02T21:10:24.544Z
   updatedBy: test@streefi.in
   ```

---

## 🔧 Alternative: Use PowerShell Script

Run the migration script I created:

```powershell
# Dry run first (see what will be migrated)
.\migrate-whatsapp-table.ps1 -DryRun

# Then run the actual migration
.\migrate-whatsapp-table.ps1
```

This will:
- ✅ Copy all items from `streefi_whatsapp` to `whatsapp_conversations`
- ✅ Safe to run multiple times
- ✅ Shows progress and summary

---

## 📋 What This Data Is

The `SYSTEM/SETTINGS` item contains critical configuration:

| Setting | Value | Purpose |
|---------|-------|---------|
| `defaultDailyCap` | 200 | Default daily message limit for campaigns |
| `maxMessagesPerSecond` | 20 | Rate limit (messages per second) |
| `metaTierLimit` | 200 | Meta API tier limit |
| `safetyBuffer` | 80 | Safety buffer % (80% of limit) |

Without this data, your app will use fallback defaults which may not match your Meta API tier.

---

## ⚠️ Why This Happened

Your code was recently updated to use the correct table name:
- **Old (wrong):** `streefi_whatsapp` 
- **New (correct):** `whatsapp_conversations`

But the data wasn't migrated at the same time.

---

## 🔍 Check If Data Exists

Run this to check both tables:

```powershell
# Check legacy table
aws dynamodb get-item `
  --table-name streefi_whatsapp `
  --key '{"PK":{"S":"SYSTEM"},"SK":{"S":"SETTINGS"}}' `
  --region ap-south-1

# Check active table
aws dynamodb get-item `
  --table-name whatsapp_conversations `
  --key '{"PK":{"S":"SYSTEM"},"SK":{"S":"SETTINGS"}}' `
  --region ap-south-1
```

---

## ✅ Next Steps

1. **Migrate the data** (using either method above)
2. **Verify** it's in `whatsapp_conversations`
3. **Test your app** - settings should now load correctly
4. **Optional:** Delete `streefi_whatsapp` table if no longer needed

---

## 🆘 Need Help?

If migration fails, you can temporarily update the code to read from legacy table:

```typescript
// In .env.local, temporarily swap:
DYNAMODB_TABLE_NAME=streefi_whatsapp  # TEMPORARY - until data migrated
```

But **migrate the data ASAP** - this is just a temporary workaround.
