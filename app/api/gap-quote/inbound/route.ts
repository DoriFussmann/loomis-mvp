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

function errorFields(error: unknown): { name: string; message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message || "Failed to process inbound GAP quote email",
      stack: error.stack,
    };
  }
  return {
    name: "NonErrorThrow",
    message: typeof error === "string" ? error : "Failed to process inbound GAP quote email",
    stack: undefined,
  };
}

function logInboundFailure(error: unknown, extra: Record<string, unknown>): { name: string; message: string; stack?: string } {
  const fields = errorFields(error);
  console.error("[gap-quote/inbound] failed", {
    ...extra,
    name: fields.name,
    message: fields.message,
    stack: fields.stack,
  });
  if (error instanceof Error && error.cause !== undefined) {
    console.error("[gap-quote/inbound] cause", error.cause);
  }
  return fields;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let stage = "start";

  try {
    stage = "auth";
    if (!webhookAuthorized(request)) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    stage = "parse";
    const parsed = contentType.includes("application/json")
      ? await parseInboundJson((await request.json()) as Record<string, unknown>)
      : await parseSendGridInboundForm(await request.formData());

    stage = "process";
    const outcome = await processInboundGapQuote(parsed);

    stage = "respond";
    return NextResponse.json({ success: true, data: outcome });
  } catch (error) {
    const fields = logInboundFailure(error, { stage, contentType });
    return NextResponse.json({ success: false, error: fields.message }, { status: 500 });
  }
}
