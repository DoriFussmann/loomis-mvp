import { NextRequest, NextResponse } from "next/server";
import { extractClaimsForm } from "@/lib/claimsValidation/extract";
import { matchByMemberId, matchByNameAndDob } from "@/lib/claimsValidation/match";
import type { ValidationResult } from "@/lib/claimsValidation/schema";

export async function POST(request: NextRequest) {
  try {
    const { fileBase64, mediaType = "application/pdf" } = await request.json();

    if (!fileBase64 || typeof fileBase64 !== "string") {
      return NextResponse.json({ success: false, error: "fileBase64 is required" }, { status: 400 });
    }

    const supportedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!supportedTypes.includes(mediaType)) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type: ${mediaType}` },
        { status: 400 }
      );
    }

    const extractedFields = await extractClaimsForm(fileBase64, mediaType);

    // Step 1: match by Member ID, then confirm last name
    const memberIdResult = await matchByMemberId(
      extractedFields.memberId,
      extractedFields.payerName,
      extractedFields.patientLastName,
      extractedFields.patientDob
    );

    if (memberIdResult) {
      const matchStep = memberIdResult.lastNameMatched ? "member-id" : "member-id-mismatch";
      const result: ValidationResult = {
        formType: extractedFields.formType,
        extractedFields,
        matchStep,
        matchedClient: memberIdResult.client,
        insurerMatched: memberIdResult.insurerMatched,
        lastNameMatched: memberIdResult.lastNameMatched,
        dobMatched: memberIdResult.dobMatched,
      };
      return NextResponse.json({ success: true, data: result });
    }

    // Step 2: match by last name + DoB
    const nameDobResult = await matchByNameAndDob(
      extractedFields.patientLastName,
      extractedFields.patientDob
    );

    if (nameDobResult) {
      const result: ValidationResult = {
        formType: extractedFields.formType,
        extractedFields,
        matchStep: nameDobResult.matchStep,
        matchedClient: nameDobResult.matchStep === "name-dob" ? nameDobResult.client : null,
        ...(nameDobResult.matchStep === "name-no-dob" && { partialClient: nameDobResult.client }),
        insurerMatched: false,
        lastNameMatched: true,
        dobMatched: nameDobResult.matchStep === "name-dob",
      };
      return NextResponse.json({ success: true, data: result });
    }

    // No match at all
    const result: ValidationResult = {
      formType: extractedFields.formType,
      extractedFields,
      matchStep: "none",
      matchedClient: null,
      insurerMatched: false,
      lastNameMatched: false,
      dobMatched: false,
    };
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to validate patient";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
