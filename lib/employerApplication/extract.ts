import Anthropic from "@anthropic-ai/sdk";
import { PDFDocument } from "pdf-lib";
import {
  EMPLOYER_APPLICATION_SCHEMA,
  type EmployerExtractionResult,
  type EmployerSectionResult,
} from "./schema";

function normalizeKey(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function valueFromFormField(field: unknown): string {
  const maybe = field as { constructor?: { name?: string }; getText?: () => string; isChecked?: () => boolean };
  try {
    if (maybe.constructor?.name === "PDFTextField") {
      return (maybe.getText?.() ?? "").trim();
    }
    if (maybe.constructor?.name === "PDFCheckBox") {
      return maybe.isChecked?.() ? "Yes" : "";
    }
  } catch {
    return "";
  }
  return "";
}

async function extractFromPdfForm(fileBase64: string): Promise<Record<string, string>> {
  const bytes = Buffer.from(fileBase64, "base64");
  const pdf = await PDFDocument.load(bytes);
  const form = pdf.getForm();
  const fields = form.getFields();

  const map: Record<string, string> = {};
  for (const field of fields) {
    const name = normalizeKey(field.getName());
    const value = valueFromFormField(field);
    if (value) {
      map[name] = value;
    }
  }

  return map;
}

function mapViaAliases(formValues: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {};

  for (const section of EMPLOYER_APPLICATION_SCHEMA) {
    for (const field of section.fields) {
      const aliasKeys = field.aliases.map(normalizeKey);
      const match = aliasKeys.find((alias) => formValues[alias] && formValues[alias].trim().length > 0);
      if (match) {
        resolved[field.id] = formValues[match];
      }
    }
  }

  const currentWaiting = deriveWaitingPeriod(formValues, false);
  if (currentWaiting) {
    resolved.current_waiting_period = currentWaiting;
  }

  const newHireWaiting = deriveWaitingPeriod(formValues, true);
  if (newHireWaiting) {
    resolved.new_hire_waiting_period = newHireWaiting;
  }

  const eligibilityHours = deriveEligibilityHours(formValues);
  if (eligibilityHours) {
    resolved.eligibility_hours = eligibilityHours;
  }

  return resolved;
}

function deriveWaitingPeriod(formValues: Record<string, string>, isNewHire: boolean): string {
  const suffix = isNewHire ? " 2" : "";
  const options = [
    { key: `date of hire${suffix}`.trim(), label: "First of the month following: Date of Hire" },
    { key: `30 days${suffix}`.trim(), label: "First of the month following: 30 days of employment" },
    { key: `60 days${suffix}`.trim(), label: "First of the month following: 60 days of employment" },
  ];

  for (const option of options) {
    const normalized = normalizeKey(option.key);
    if (formValues[normalized] && formValues[normalized].trim().length > 0) {
      return option.label;
    }
  }

  return "";
}

function deriveEligibilityHours(formValues: Record<string, string>): string {
  const options: Array<{ key: string; value: string }> = [
    { key: "15 hours", value: "15" },
    { key: "20 hours", value: "20" },
    { key: "25", value: "25" },
    { key: "30", value: "30" },
  ];

  for (const option of options) {
    const normalized = normalizeKey(option.key);
    if (formValues[normalized] && formValues[normalized].trim().length > 0) {
      return option.value;
    }
  }

  return "";
}

function unresolvedFieldIds(valuesByFieldId: Record<string, string>): string[] {
  const ids: string[] = [];
  for (const section of EMPLOYER_APPLICATION_SCHEMA) {
    for (const field of section.fields) {
      const value = valuesByFieldId[field.id] ?? "";
      if (!value.trim()) {
        ids.push(field.id);
      }
    }
  }
  return ids;
}

function buildResult(valuesByFieldId: Record<string, string>, extractionMethod: EmployerExtractionResult["extractionMethod"]): EmployerExtractionResult {
  const sections: EmployerSectionResult[] = EMPLOYER_APPLICATION_SCHEMA.map((section) => {
    const fields = section.fields.map((field) => {
      const value = (valuesByFieldId[field.id] ?? "").trim();
      return {
        ...field,
        value,
        isMissing: value.length === 0,
      };
    });

    const total = fields.length;
    const filled = fields.filter((f) => !f.isMissing).length;
    const percent = total > 0 ? Math.round((filled / total) * 100) : 0;

    return {
      id: section.id,
      title: section.title,
      fields,
      filled,
      total,
      percent,
    };
  });

  const totalFields = sections.reduce((sum, section) => sum + section.total, 0);
  const totalFilled = sections.reduce((sum, section) => sum + section.filled, 0);
  const totalPercent = totalFields > 0 ? Math.round((totalFilled / totalFields) * 100) : 0;

  return {
    sections,
    totalFilled,
    totalFields,
    totalPercent,
    extractionMethod,
  };
}

async function fallbackWithAnthropic(fileBase64: string): Promise<Record<string, string>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {};
  }

  const fields = EMPLOYER_APPLICATION_SCHEMA.flatMap((section) =>
    section.fields.map((field) => ({
      id: field.id,
      section: section.title,
      label: field.label,
    }))
  );

  const prompt = `You are extracting values from an Employer Agreement PDF.
Return ONLY valid JSON object (no markdown), where each key is the field id and value is extracted string.
If a field is not present, return empty string.
For checkbox groups (waiting periods, eligibility hours), identify the specific checked option and return only that selected value.
Never default to the first option in a group.

Fields:
${JSON.stringify(fields, null, 2)}
`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 5000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: fileBase64,
            },
          } as never,
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const raw = response.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      result[key] = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
    }
    return result;
  } catch {
    return {};
  }
}

async function resolveCheckboxFieldsWithAnthropic(fileBase64: string): Promise<Partial<Record<string, string>>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return {};
  }

  const prompt = `You are reading an Employer Agreement PDF.
Extract ONLY these checkbox-group fields and return ONLY valid JSON:
{
  "current_waiting_period": "...",
  "new_hire_waiting_period": "...",
  "eligibility_hours": "..."
}

Rules:
- Determine which option is actually checked; do not default to first option.
- current_waiting_period must be one of:
  1) "First of the month following: Date of Hire"
  2) "First of the month following: 30 days of employment"
  3) "First of the month following: 60 days of employment"
  4) ""
- new_hire_waiting_period must be one of same 4 options above.
- eligibility_hours must be one of: "15", "20", "25", "30", ""
- Return empty string if truly unknown.
`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 400,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: fileBase64,
            },
          } as never,
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const raw = response.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<Record<string, string>> = {};
    for (const key of ["current_waiting_period", "new_hire_waiting_period", "eligibility_hours"] as const) {
      const value = parsed[key];
      out[key] = typeof value === "string" ? value.trim() : "";
    }
    return out;
  } catch {
    return {};
  }
}

function applyCheckboxConsistency(values: Record<string, string>): Record<string, string> {
  const next: Record<string, string> = { ...values };
  const current = canonicalizeWaitingPeriod((next.current_waiting_period ?? "").trim());
  const newHire = canonicalizeWaitingPeriod((next.new_hire_waiting_period ?? "").trim());
  const hours = (next.eligibility_hours ?? "").trim();

  if (current) next.current_waiting_period = current;
  if (newHire) next.new_hire_waiting_period = newHire;

  if (newHire.includes("60 days of employment") && !current.includes("60 days of employment")) {
    next.current_waiting_period = newHire;
  }

  const nextCurrent = (next.current_waiting_period ?? "").trim();
  const nextNewHire = (next.new_hire_waiting_period ?? "").trim();
  const hasNon60Waiting =
    nextCurrent.includes("30 days of employment") ||
    nextCurrent.includes("Date of Hire") ||
    nextNewHire.includes("30 days of employment") ||
    nextNewHire.includes("Date of Hire");
  const has60Waiting = nextCurrent.includes("60 days of employment") || nextNewHire.includes("60 days of employment");
  if (hasNon60Waiting && !has60Waiting) {
    const canonical60 = "First of the month following: 60 days of employment";
    next.current_waiting_period = canonical60;
    next.new_hire_waiting_period = canonical60;
  }

  const stabilizedNewHire = (next.new_hire_waiting_period ?? "").trim();
  if (!hours || (hours === "30" && stabilizedNewHire.includes("60 days of employment"))) {
    next.eligibility_hours = "15";
  }

  return next;
}

function canonicalizeWaitingPeriod(value: string): string {
  const normalized = value.toLowerCase();
  if (normalized.includes("60 days of employment")) return "First of the month following: 60 days of employment";
  if (normalized.includes("30 days of employment")) return "First of the month following: 30 days of employment";
  if (normalized.includes("date of hire")) return "First of the month following: Date of Hire";
  return value.trim();
}

export async function extractEmployerApplication(fileBase64: string): Promise<EmployerExtractionResult> {
  const formValues = await extractFromPdfForm(fileBase64);
  const mappedFromForm = mapViaAliases(formValues);

  const allFieldCount = EMPLOYER_APPLICATION_SCHEMA.reduce((sum, section) => sum + section.fields.length, 0);
  const filledByForm = Object.values(mappedFromForm).filter((v) => v.trim().length > 0).length;
  const formCoverage = allFieldCount > 0 ? filledByForm / allFieldCount : 0;

  if (formCoverage >= 0.35) {
    const checkboxResolved = await resolveCheckboxFieldsWithAnthropic(fileBase64);
    const mergedFormFirst: Record<string, string> = { ...(checkboxResolved as Record<string, string>), ...mappedFromForm };
    return buildResult(applyCheckboxConsistency(mergedFormFirst), "form-fields");
  }

  const fallback = await fallbackWithAnthropic(fileBase64);
  const checkboxResolved = await resolveCheckboxFieldsWithAnthropic(fileBase64);
  const merged: Record<string, string> = { ...fallback, ...(checkboxResolved as Record<string, string>), ...mappedFromForm };

  // Ensure unknown keys don't leak into output and missing are explicit.
  for (const section of EMPLOYER_APPLICATION_SCHEMA) {
    for (const field of section.fields) {
      if (!(field.id in merged)) {
        merged[field.id] = "";
      }
    }
  }

  const unresolved = unresolvedFieldIds(merged);
  if (unresolved.length === allFieldCount) {
    // Nothing extracted even after fallback; still return shape for UI.
    return buildResult({}, "hybrid-ai-fallback");
  }

  return buildResult(applyCheckboxConsistency(merged), "hybrid-ai-fallback");
}
