import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { processInboundGapQuote } from "@/lib/gapQuote/inbound";
import { parseInboundJson, parseSendGridInboundForm } from "@/lib/gapQuote/parseInboundEmail";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function webhookAuthorized(request: NextRequest): boolean {
  const expected = process.env.GAP_QUOTE_INBOUND_WEBHOOK_SECRET?.trim();
  if (!expected) return false;
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  if (!webhookAuthorized(request)) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    const parsed = contentType.includes("application/json")
      ? await parseInboundJson((await request.json()) as Record<string, unknown>)
      : await parseSendGridInboundForm(await request.formData());

    const outcome = await processInboundGapQuote(parsed);
    return NextResponse.json({ success: true, data: outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to process inbound GAP quote email";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
