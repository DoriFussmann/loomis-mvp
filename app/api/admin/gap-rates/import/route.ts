import { NextRequest, NextResponse } from "next/server";
import { parseRateCardBase64 } from "@/lib/gapQuote/parseRateCard";
import { replaceGapQuoteCatalog } from "@/lib/data";

export async function POST(request: NextRequest) {
  try {
    const { fileBase64, mediaType } = await request.json();
    if (!fileBase64 || typeof fileBase64 !== "string") {
      return NextResponse.json({ success: false, error: "fileBase64 is required" }, { status: 400 });
    }

    const allowed = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "text/csv",
      "application/octet-stream",
    ];
    if (mediaType && typeof mediaType === "string" && !allowed.includes(mediaType) && !mediaType.includes("spreadsheet") && mediaType !== "text/csv") {
      return NextResponse.json({ success: false, error: `Unsupported file type: ${mediaType}` }, { status: 400 });
    }

    const parsed = parseRateCardBase64(fileBase64);
    const catalog = await replaceGapQuoteCatalog(parsed);
    return NextResponse.json({
      success: true,
      data: {
        importedRates: parsed.rates.length,
        buckets: catalog.buckets.length,
        catalog,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import rate card";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
