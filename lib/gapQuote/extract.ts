import Anthropic from "@anthropic-ai/sdk";
import { parseMoneyAmount } from "./parseRateCard";
import type { EmailExtractionResult, EmailGroupExtract } from "./schema";

function safe(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (value == null) return "";
  return String(value).trim();
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return parseMoneyAmount(value);
}

function parseGroup(raw: Record<string, unknown>, presentedByFallback: string): EmailGroupExtract {
  const deductible = asNumber(raw.deductible);
  const benefit = asNumber(raw.benefit);
  const planDesignLabel = safe(raw.plan_design_label);
  return {
    groupName: safe(raw.group_name),
    situsState: safe(raw.situs_state),
    effectiveDate: safe(raw.effective_date),
    deductible,
    benefit,
    sicCode: safe(raw.sic_code),
    planDesignLabel:
      planDesignLabel ||
      (deductible != null && benefit != null
        ? `$${deductible.toLocaleString("en-US")} / $${benefit.toLocaleString("en-US")}`
        : ""),
    presentedBy: safe(raw.presented_by) || presentedByFallback,
  };
}

export async function extractGapQuoteEmail(subject: string, body: string): Promise<EmailExtractionResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const prompt = `You are extracting structured fields from a broker email requesting a GAP Medical quote.

Return ONLY valid JSON — no markdown fences, no explanation.

Extract:
- presented_by: the broker / agency presenting the quote if mentioned (name and/or agency). Empty string if unknown.
- groups: one object per distinct employer / billing group mentioned. If the email is about a single group, return an array of one.

For each group:
- group_name: employer / group legal name
- situs_state: 2-letter US state code if possible (e.g. PA), otherwise the state name as written
- effective_date: coverage effective date as MM/DD/YYYY if possible
- deductible: the requested plan deductible as a number (e.g. 1000). null if not stated
- benefit: the requested core / combined inpatient & outpatient benefit (the "limit") as a number (e.g. 2500). null if not stated
- plan_design_label: human label like "$1,000 / $2,500" when deductible and benefit are known
- sic_code: SIC code if mentioned, else empty string
- presented_by: broker line for this group if it differs from the top-level value

If multiple plan designs are requested for the SAME group, use the first one mentioned.
Do not invent values. Use empty string or null when not present.
Do not guess which census file belongs to which employer. If the email names multiple groups but does not map them to specific attachments, still list each named group; the application will keep file-to-entity assignment unconfirmed.

Return this exact JSON structure:
{
  "presented_by": "",
  "groups": [
    {
      "group_name": "",
      "situs_state": "",
      "effective_date": "",
      "deductible": null,
      "benefit": null,
      "plan_design_label": "",
      "sic_code": "",
      "presented_by": ""
    }
  ]
}

EMAIL SUBJECT:
${subject || "(none)"}

EMAIL BODY:
${body || "(none)"}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const rawText = response.content
    .filter((item) => item.type === "text")
    .map((item) => (item as { type: "text"; text: string }).text)
    .join("")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    parsed = {};
  }

  const presentedBy = safe(parsed.presented_by);
  const rawGroups = Array.isArray(parsed.groups) ? parsed.groups : [];
  const groups = rawGroups
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => parseGroup(item, presentedBy));

  if (groups.length === 0) {
    groups.push(
      parseGroup(
        {
          group_name: "",
          situs_state: "",
          effective_date: "",
          deductible: null,
          benefit: null,
          plan_design_label: "",
          sic_code: "",
          presented_by: presentedBy,
        },
        presentedBy
      )
    );
  }

  return { presentedBy, groups };
}
