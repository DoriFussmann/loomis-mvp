import { v4 as uuidv4 } from "uuid";
import {
  createGapQuoteRun,
  getGapQuoteCatalog,
  getGapQuoteRunByMessageId,
  updateGapQuoteRun,
} from "@/lib/data";
import { gapQuoteResultsUrl, sendPlainEmail } from "@/lib/email/send";
import { analyzeGapQuote } from "./analyze";
import { extractGapQuoteEmail, isQualifyingGapQuoteExtract } from "./extract";
import type { ParsedInboundEmail } from "./parseInboundEmail";
import type { GapQuoteRun } from "./schema";

const NON_QUALIFYING_REASON =
  "couldn't find census attachment(s) or plan details in this email";
const PROCESSING_STALE_MS = 5 * 60 * 1000;

function replySubject(subject: string): string {
  const trimmed = subject.trim();
  if (!trimmed) return "Re: GAP quote request";
  return /^re:/i.test(trimmed) ? trimmed : `Re: ${trimmed}`;
}

function successBody(run: GapQuoteRun): string {
  const result = run.result;
  const passing = result?.passingCount ?? 0;
  const total = result?.groupCount ?? 0;
  const excluded = Math.max(total - passing, 0);
  const lines = [
    "We processed your GAP quote request.",
    "",
    `View results (sign in required): ${gapQuoteResultsUrl(run.id)}`,
    "",
  ];
  if (total > 0) {
    lines.push(
      `${passing} group(s) passed eligibility checks.${excluded > 0 ? ` ${excluded} were excluded.` : ""}`
    );
    lines.push("");
  }
  lines.push("This is an automated message from the Loomis GAP Quote tool.");
  return lines.join("\n");
}

function nonQualifyingBody(reason: string): string {
  return [
    "We received your email but could not start a GAP quote.",
    "",
    `Reason: ${reason}.`,
    "",
    "Forward a broker request that includes:",
    "- At least one census spreadsheet (.xlsx)",
    "- Group / employer information and plan design (deductible and benefit)",
    "",
    `You can also paste the request at ${process.env.GAP_QUOTE_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://www.epicaiproducts.com"}/gap-quote`,
    "",
    "This is an automated message from the Loomis GAP Quote tool.",
  ].join("\n");
}

function failureBody(errorMessage: string): string {
  return [
    "We received your GAP quote request but could not complete the analysis.",
    "",
    errorMessage,
    "",
    `You can retry by forwarding again, or paste the request at ${process.env.GAP_QUOTE_PUBLIC_BASE_URL?.replace(/\/$/, "") || "https://www.epicaiproducts.com"}/gap-quote`,
    "",
    "This is an automated message from the Loomis GAP Quote tool.",
  ].join("\n");
}

async function sendReply(run: GapQuoteRun, text: string): Promise<void> {
  if (!run.senderEmail) {
    throw new Error("Cannot reply: inbound email had no sender address");
  }
  await sendPlainEmail({
    to: run.senderEmail,
    subject: replySubject(run.subject),
    text,
    inReplyTo: run.inboundMessageId || undefined,
  });
  await updateGapQuoteRun(run.id, { replySentAt: new Date().toISOString() });
}

async function replyForExisting(run: GapQuoteRun): Promise<void> {
  if (run.replySentAt) return;
  if (run.status === "complete" && run.result) {
    await sendReply(run, successBody(run));
    return;
  }
  if (run.status === "non_qualifying") {
    await sendReply(run, nonQualifyingBody(run.errorMessage || NON_QUALIFYING_REASON));
    return;
  }
  if (run.status === "failed") {
    await sendReply(run, failureBody(run.errorMessage || "Unexpected analysis error"));
  }
}

export async function processInboundGapQuote(parsed: ParsedInboundEmail): Promise<{ runId: string; status: GapQuoteRun["status"] }> {
  const existing = parsed.messageId ? await getGapQuoteRunByMessageId(parsed.messageId) : undefined;
  if (existing && existing.status !== "processing") {
    await replyForExisting(existing);
    return { runId: existing.id, status: existing.status };
  }
  if (existing?.status === "processing") {
    const ageMs = Date.now() - new Date(existing.createdAt).getTime();
    if (ageMs < PROCESSING_STALE_MS) {
      return { runId: existing.id, status: existing.status };
    }
  }

  let run: GapQuoteRun;
  if (existing?.status === "processing") {
    run = existing;
  } else {
    try {
      run = await createGapQuoteRun({
        id: uuidv4(),
        source: "inbound",
        status: "processing",
        senderEmail: parsed.senderEmail,
        subject: parsed.subject,
        inboundMessageId: parsed.messageId,
      });
    } catch (error) {
      const raced = parsed.messageId ? await getGapQuoteRunByMessageId(parsed.messageId) : undefined;
      if (raced) {
        if (raced.status !== "processing") await replyForExisting(raced);
        return { runId: raced.id, status: raced.status };
      }
      throw error;
    }
  }

  try {
    if (parsed.attachments.length === 0) {
      const updated = await updateGapQuoteRun(run.id, {
        status: "non_qualifying",
        errorMessage: NON_QUALIFYING_REASON,
      });
      await sendReply(updated, nonQualifyingBody(NON_QUALIFYING_REASON));
      return { runId: updated.id, status: updated.status };
    }

    const extracted = await extractGapQuoteEmail(parsed.subject, parsed.text);
    if (!isQualifyingGapQuoteExtract(extracted)) {
      const updated = await updateGapQuoteRun(run.id, {
        status: "non_qualifying",
        extract: extracted,
        errorMessage: NON_QUALIFYING_REASON,
      });
      await sendReply(updated, nonQualifyingBody(NON_QUALIFYING_REASON));
      return { runId: updated.id, status: updated.status };
    }

    const catalog = await getGapQuoteCatalog();
    if (catalog.rates.length === 0) {
      throw new Error("GAP rate table is empty. Import the rate card in Admin → GAP Rates first.");
    }

    const result = await analyzeGapQuote(
      {
        subject: parsed.subject,
        body: parsed.text,
        attachments: parsed.attachments,
      },
      catalog,
      extracted
    );

    const updated = await updateGapQuoteRun(run.id, {
      status: "complete",
      extract: extracted,
      result,
      errorMessage: "",
    });
    await sendReply(updated, successBody(updated));
    return { runId: updated.id, status: updated.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected analysis error";
    const updated = await updateGapQuoteRun(run.id, {
      status: "failed",
      errorMessage: message,
    });
    try {
      await sendReply(updated, failureBody(message));
    } catch (replyError) {
      const replyMessage = replyError instanceof Error ? replyError.message : "Failed to send failure reply";
      await updateGapQuoteRun(run.id, {
        errorMessage: `${message} (reply failed: ${replyMessage})`,
      });
      throw error;
    }
    return { runId: updated.id, status: updated.status };
  }
}
