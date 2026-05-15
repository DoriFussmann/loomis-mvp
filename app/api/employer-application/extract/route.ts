import { NextRequest, NextResponse } from "next/server";
import { extractEmployerApplication } from "@/lib/employerApplication/extract";

export async function POST(request: NextRequest) {
  try {
    const { fileBase64, mediaType = "application/pdf" } = await request.json();

    if (!fileBase64 || typeof fileBase64 !== "string") {
      return NextResponse.json({ success: false, error: "fileBase64 is required" }, { status: 400 });
    }

    if (mediaType !== "application/pdf") {
      return NextResponse.json({ success: false, error: "Only PDF files are supported" }, { status: 400 });
    }

    const result = await extractEmployerApplication(fileBase64);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to extract employer application";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
