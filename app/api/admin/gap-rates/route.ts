import { NextRequest, NextResponse } from "next/server";
import {
  createGapQuoteRate,
  getGapQuoteCatalog,
  saveGapQuoteSettings,
} from "@/lib/data";
import type { GapQuoteBucketKey } from "@/lib/gapQuote/schema";

const BUCKET_KEYS: GapQuoteBucketKey[] = ["standard", "lr60", "oh", "mi", "fl_50_100"];

export async function GET() {
  try {
    const catalog = await getGapQuoteCatalog();
    return NextResponse.json({ success: true, data: catalog });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load GAP rates";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.adminFee !== undefined && body.deductible === undefined) {
      const adminFee = Number(body.adminFee);
      if (!Number.isFinite(adminFee) || adminFee < 0) {
        return NextResponse.json({ success: false, error: "adminFee must be a non-negative number" }, { status: 400 });
      }
      const settings = await saveGapQuoteSettings(adminFee);
      return NextResponse.json({ success: true, data: settings });
    }

    const bucketKey = body.bucketKey as GapQuoteBucketKey;
    if (!BUCKET_KEYS.includes(bucketKey)) {
      return NextResponse.json({ success: false, error: "Valid bucketKey is required" }, { status: 400 });
    }

    const deductible = Number(body.deductible);
    const benefit = Number(body.benefit);
    const rateEeOnly = Number(body.rateEeOnly);
    const rateEeSpouse = Number(body.rateEeSpouse);
    const rateEeChildren = Number(body.rateEeChildren);
    const rateFamily = Number(body.rateFamily);
    const numbers = [deductible, benefit, rateEeOnly, rateEeSpouse, rateEeChildren, rateFamily];
    if (numbers.some((value) => !Number.isFinite(value))) {
      return NextResponse.json({ success: false, error: "All rate fields must be numbers" }, { status: 400 });
    }

    const row = await createGapQuoteRate({
      bucketKey,
      deductible,
      benefit,
      rateEeOnly,
      rateEeSpouse,
      rateEeChildren,
      rateFamily,
    });
    return NextResponse.json({ success: true, data: row }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save GAP rate";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
