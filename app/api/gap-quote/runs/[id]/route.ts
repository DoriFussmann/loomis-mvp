import { NextRequest, NextResponse } from "next/server";
import { getGapQuoteRun, updateGapQuoteRun } from "@/lib/data";
import type { AnalyzeGapQuoteResult } from "@/lib/gapQuote/schema";

function isAnalyzeResult(value: unknown): value is AnalyzeGapQuoteResult {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return Array.isArray(record.groups) && typeof record.groupCount === "number";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const run = await getGapQuoteRun(params.id);
    if (!run || run.status !== "complete" || !run.result) {
      return NextResponse.json({ success: false, error: "Quote run not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: run });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load GAP quote run";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existing = await getGapQuoteRun(params.id);
    if (!existing || existing.status !== "complete" || !existing.result) {
      return NextResponse.json({ success: false, error: "Quote run not found" }, { status: 404 });
    }

    const body = await request.json();
    if (!isAnalyzeResult(body.result)) {
      return NextResponse.json({ success: false, error: "A valid analysis result is required" }, { status: 400 });
    }

    const run = await updateGapQuoteRun(params.id, { result: body.result });
    return NextResponse.json({ success: true, data: run });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update GAP quote run";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
