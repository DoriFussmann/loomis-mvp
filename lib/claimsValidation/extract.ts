import Anthropic from "@anthropic-ai/sdk";
import type { ClaimsExtractionResult, FormType } from "./schema";

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

function isImageMediaType(mediaType: string): mediaType is ImageMediaType {
  return ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(mediaType);
}

function normalizeDate(raw: string): string {
  if (!raw) return "";
  // Convert MM/DD/YYYY or MM-DD-YYYY → YYYY-MM-DD
  const mdy = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    const [, mm, dd, yyyy] = mdy;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }
  // Already YYYY-MM-DD
  const ymd = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) return raw;
  return raw.trim();
}

function safe(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

export async function extractClaimsForm(
  fileBase64: string,
  mediaType: string
): Promise<ClaimsExtractionResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const prompt = `You are analyzing a healthcare claim form image or document.

Your task is to identify the form type and extract specific fields. Return ONLY valid JSON — no markdown fences, no explanation.

FORM IDENTIFICATION:
- UB-04 (also called UB-92 or CMS-1450): institutional/hospital claim. Recognizable by its wide landscape layout with numbered boxes, "NUBC" logo, and fields like "PATIENT NAME" at the top and large service line table at the bottom.
- CMS-1500 (also called HCFA-1500): professional/physician claim. Recognizable by a portrait layout with a pink/red header bar, insurance type checkboxes at top (Medicare, Medicaid, CHAMPUS, etc.) and Field 1 through 33.

FIELD EXTRACTION GUIDE:

For UB-04:
- member_id: Field 60 — "Insured's Unique ID" / "Cert.-SSN-HIC-ID No." (bottom section, three rows A/B/C — take row A)
- payer_name: Field 50 — "Payer Name" (bottom section, rows A/B/C — take row A primary payer)
- patient_last_name: Field 8 — "Patient Name" — extract only the last name (before the comma)
- patient_first_name: Field 8 — "Patient Name" — extract only the first name (after the comma)
- patient_dob: Field 10 — "Birthdate" (format MM/DD/YYYY)

For CMS-1500:
- member_id: Field 1a — "Insured's ID Number" (top section, right side)
- payer_name: Field 11c — "Insurance Plan Name or Program Name"
- patient_last_name: Field 2 — "Patient's Name" — extract only the last name
- patient_first_name: Field 2 — "Patient's Name" — extract only the first name
- patient_dob: Field 3 — "Patient's Birth Date" (format MM/DD/YYYY)

Return this exact JSON structure:
{
  "form_type": "UB-04" | "CMS-1500" | "unknown",
  "member_id": "...",
  "payer_name": "...",
  "patient_last_name": "...",
  "patient_first_name": "...",
  "patient_dob": "..."
}

If a field is blank or not present on the form, return an empty string for that field.
Do not guess or invent values. Only return what is visible on the form.`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let contentBlock: Anthropic.MessageParam["content"][number];

  if (mediaType === "application/pdf") {
    contentBlock = {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: fileBase64,
      },
    } as never;
  } else if (isImageMediaType(mediaType)) {
    contentBlock = {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: fileBase64,
      },
    };
  } else {
    throw new Error(`Unsupported media type: ${mediaType}`);
  }

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          contentBlock,
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const raw = response.content
    .filter((item) => item.type === "text")
    .map((item) => (item as { type: "text"; text: string }).text)
    .join("")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  const formType = (safe(parsed.form_type) as FormType) || "unknown";

  return {
    formType: formType === "UB-04" || formType === "CMS-1500" ? formType : "unknown",
    memberId: safe(parsed.member_id),
    payerName: safe(parsed.payer_name),
    patientLastName: safe(parsed.patient_last_name),
    patientFirstName: safe(parsed.patient_first_name),
    patientDob: normalizeDate(safe(parsed.patient_dob)),
  };
}
