import { NextRequest, NextResponse } from "next/server";
import { analyzeGapQuote } from "@/lib/gapQuote/analyze";
import { getGapQuoteCatalog } from "@/lib/data";
import type { CensusAttachment } from "@/lib/gapQuote/schema";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const subject = typeof body.subject === "string" ? body.subject : "";
    const emailBody = typeof body.body === "string" ? body.body : "";
    const attachmentsRaw = Array.isArray(body.attachments) ? body.attachments : [];

    const attachments: CensusAttachment[] = attachmentsRaw
      .filter((item: unknown): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((item: Record<string, unknown>) => ({
        fileBase64: typeof item.fileBase64 === "string" ? item.fileBase64 : "",
        mediaType: typeof item.mediaType === "string" ? item.mediaType : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        fileName: typeof item.fileName === "string" ? item.fileName : "census.xlsx",
      }))
      .filter((item: CensusAttachment) => item.fileBase64.length > 0);

    if (!emailBody.trim() && attachments.length === 0) {
      return NextResponse.json(
        { success: false, error: "Email body or at least one census file is required" },
        { status: 400 }
      );
    }
    if (attachments.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one .xlsx census attachment is required" },
        { status: 400 }
      );
    }

    const catalog = await getGapQuoteCatalog();
    if (catalog.rates.length === 0) {
      return NextResponse.json(
        { success: false, error: "GAP rate table is empty. Import the rate card in Admin → GAP Rates first." },
        { status: 400 }
      );
    }

    const result = await analyzeGapQuote({ subject, body: emailBody, attachments }, catalog);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to analyze GAP quote request";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
