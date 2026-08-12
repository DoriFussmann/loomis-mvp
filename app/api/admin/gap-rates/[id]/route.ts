import { NextRequest, NextResponse } from "next/server";
import { deleteGapQuoteRate, updateGapQuoteRate } from "@/lib/data";
import type { GapQuoteBucketKey } from "@/lib/gapQuote/schema";

const BUCKET_KEYS: GapQuoteBucketKey[] = ["standard", "lr60", "oh", "mi", "fl_50_100"];

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const patch: Parameters<typeof updateGapQuoteRate>[1] = {};
    if (body.bucketKey !== undefined) {
      if (!BUCKET_KEYS.includes(body.bucketKey)) {
        return NextResponse.json({ success: false, error: "Invalid bucketKey" }, { status: 400 });
      }
      patch.bucketKey = body.bucketKey;
    }
    if (body.deductible !== undefined) patch.deductible = Number(body.deductible);
    if (body.benefit !== undefined) patch.benefit = Number(body.benefit);
    if (body.rateEeOnly !== undefined) patch.rateEeOnly = Number(body.rateEeOnly);
    if (body.rateEeSpouse !== undefined) patch.rateEeSpouse = Number(body.rateEeSpouse);
    if (body.rateEeChildren !== undefined) patch.rateEeChildren = Number(body.rateEeChildren);
    if (body.rateFamily !== undefined) patch.rateFamily = Number(body.rateFamily);

    const row = await updateGapQuoteRate(params.id, patch);
    return NextResponse.json({ success: true, data: row });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update GAP rate";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    await deleteGapQuoteRate(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete GAP rate";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
