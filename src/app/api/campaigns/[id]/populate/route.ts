import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/adminAuth";
import { campaignRepository, recipientRepository } from "@/lib/repositories";
import { Readable } from "stream";
import readline from "readline";

const BATCH_SIZE = 100; // Process CSV in batches for memory efficiency

/**
 * Process CSV file and return array of valid phone numbers
 * 
 * MEMORY SAFETY:
 * - Streams file line-by-line (no full read into memory)
 * - Validates E.164 format (10-15 digits)
 * - Deduplicates in-memory (acceptable for <200k)
 * - Repository handles DB insertion with batching
 * 
 * CSV FORMAT:
 * One phone number per line (plain digits, no +)
 * 919876543210
 * 918765432109
 * 919812345678
 */
async function parseCSV(file: File): Promise<string[]> {
  // Convert File stream to Node.js Readable stream
  const webStream = file.stream();
  const nodeStream = Readable.fromWeb(webStream as any);

  const rl = readline.createInterface({
    input: nodeStream,
    crlfDelay: Infinity,
  });

  const validPhones: string[] = [];
  const seenNumbers = new Set<string>();

  for await (const line of rl) {
    const phone = line.trim();

    // Skip empty lines
    if (!phone) continue;

    // Basic E.164 validation: 10-15 digits only
    if (!/^\d{10,15}$/.test(phone)) {
      console.warn(`[CSV] Skipping invalid phone: ${phone}`);
      continue;
    }

    // Deduplicate
    if (seenNumbers.has(phone)) {
      console.warn(`[CSV] Skipping duplicate phone: ${phone}`);
      continue;
    }
    seenNumbers.add(phone);
    validPhones.push(phone);
  }

  console.log(`[CSV] Parsed ${validPhones.length} unique valid phone numbers`);
  return validPhones;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1️⃣ Validate Admin Session
    const validation = await validateAdminSession(req, "whatsapp-session");
    if (!validation.valid || !validation.session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: campaignId } = await params;
    const timestamp = Math.floor(Date.now() / 1000);

    // 2️⃣ Get CSV file from multipart/form-data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "CSV file required" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      return NextResponse.json(
        { error: "File must be a CSV" },
        { status: 400 }
      );
    }

    console.log(`[Populate] Starting population for campaign ${campaignId}`);
    console.log(`[Populate] File: ${file.name}, Size: ${file.size} bytes`);

    // 3️⃣ Set status → POPULATING
    await campaignRepository.updateCampaignStatus(campaignId, "DRAFT"); // Keep as DRAFT during population

    // 4️⃣ Parse CSV file (streaming, in-memory)
    const phones = await parseCSV(file);
    console.log(`[Populate] Parsed ${phones.length} valid phone numbers`);

    // 5️⃣ Insert recipients using repository (handles batching & retry)
    await recipientRepository.createRecipients(campaignId, phones);
    console.log(`[Populate] Inserted ${phones.length} recipients`);

    // 6️⃣ Update campaign with total recipients
    await campaignRepository.setTotalRecipients(campaignId, phones.length);
    console.log(`[Populate] Campaign ${campaignId} ready with ${phones.length} recipients`);

    // 7️⃣ Advance status to SCHEDULED so the campaign can be dispatched
    await campaignRepository.updateCampaignStatus(campaignId, "SCHEDULED");
    console.log(`[Populate] Campaign ${campaignId} status set to SCHEDULED`);

    return NextResponse.json({
      success: true,
      totalRecipients: phones.length,
    });

  } catch (error) {
    console.error("[Populate] Population error:", error);
    return NextResponse.json(
      { error: "Population failed" },
      { status: 500 }
    );
  }
}
