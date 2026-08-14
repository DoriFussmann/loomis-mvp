const SENDGRID_SEND_URL = "https://api.sendgrid.com/v3/mail/send";

export function getGapQuoteFromEmail(): string {
  return process.env.GAP_QUOTE_FROM_EMAIL?.trim() || "gapquote@epicaiproducts.com";
}

export function getGapQuotePublicBaseUrl(): string {
  const raw =
    process.env.GAP_QUOTE_PUBLIC_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.epicaiproducts.com";
  return raw.replace(/\/$/, "");
}

export function gapQuoteResultsUrl(runId: string): string {
  return `${getGapQuotePublicBaseUrl()}/gap-quote/results/${runId}`;
}

export async function sendPlainEmail(input: {
  to: string;
  subject: string;
  text: string;
  inReplyTo?: string;
}): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("SENDGRID_API_KEY is not configured");
  }
  if (!input.to) {
    throw new Error("Cannot send email: missing recipient");
  }

  const headers: Record<string, string> = {};
  if (input.inReplyTo) {
    headers["In-Reply-To"] = input.inReplyTo;
    headers.References = input.inReplyTo;
  }

  const response = await fetch(SENDGRID_SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: input.to }] }],
      from: { email: getGapQuoteFromEmail(), name: "Loomis GAP Quote" },
      subject: input.subject,
      content: [{ type: "text/plain", value: input.text }],
      ...(Object.keys(headers).length > 0 ? { headers } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`SendGrid send failed (${response.status})${detail ? `: ${detail}` : ""}`);
  }
}
