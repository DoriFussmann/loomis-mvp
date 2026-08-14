import type { CensusAttachment } from "./schema";

export interface ParsedInboundEmail {
  senderEmail: string;
  subject: string;
  text: string;
  attachments: CensusAttachment[];
  allAttachmentNames: string[];
  messageId: string;
}

const SPREADSHEET_EXT = /\.(xlsx|xls)$/i;
const SPREADSHEET_TYPES = [
  "spreadsheet",
  "excel",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

export function parseEmailAddress(raw: string): string {
  const trimmed = raw.trim();
  const angled = trimmed.match(/<([^>]+)>/);
  const candidate = (angled?.[1] ?? trimmed).trim().replace(/^mailto:/i, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate)) return "";
  return candidate.toLowerCase();
}

export function isSpreadsheetAttachment(fileName: string, mediaType: string): boolean {
  if (SPREADSHEET_EXT.test(fileName)) return true;
  const type = mediaType.toLowerCase();
  return SPREADSHEET_TYPES.some((token) => type.includes(token));
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function headerValue(headers: string, name: string): string {
  const pattern = new RegExp(`^${name}:\\s*(.+)$`, "im");
  const match = headers.match(pattern);
  return match?.[1]?.trim() ?? "";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function jsonField(form: FormData, key: string): unknown {
  const raw = form.get(key);
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isFormFile(value: FormDataEntryValue | null): value is File {
  return Boolean(value) && typeof value === "object" && typeof (value as File).arrayBuffer === "function";
}

async function fileToAttachment(file: File, fallbackName: string, mediaType: string): Promise<CensusAttachment> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return {
    fileBase64: buffer.toString("base64"),
    mediaType: mediaType || file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    fileName: fallbackName || file.name,
  };
}

export async function parseSendGridInboundForm(form: FormData): Promise<ParsedInboundEmail> {
  const envelope = asRecord(jsonField(form, "envelope"));
  const envelopeFrom = typeof envelope?.from === "string" ? envelope.from : "";
  const fromField = typeof form.get("from") === "string" ? String(form.get("from")) : "";
  const senderEmail = parseEmailAddress(envelopeFrom) || parseEmailAddress(fromField);

  const subject = typeof form.get("subject") === "string" ? String(form.get("subject")).trim() : "";
  const textField = typeof form.get("text") === "string" ? String(form.get("text")) : "";
  const htmlField = typeof form.get("html") === "string" ? String(form.get("html")) : "";
  const text = textField.trim() || stripHtml(htmlField);

  const rawHeaders = typeof form.get("headers") === "string" ? String(form.get("headers")) : "";
  const messageId = headerValue(rawHeaders, "Message-ID") || headerValue(rawHeaders, "Message-Id");

  const attachmentInfo = asRecord(jsonField(form, "attachment-info")) ?? {};
  const allAttachmentNames: string[] = [];
  const attachments: CensusAttachment[] = [];

  const infoEntries = Object.entries(attachmentInfo);
  if (infoEntries.length > 0) {
    for (const [key, infoRaw] of infoEntries) {
      const info = asRecord(infoRaw);
      const fileName =
        (typeof info?.filename === "string" && info.filename) ||
        (typeof info?.name === "string" && info.name) ||
        `${key}.bin`;
      const mediaType = typeof info?.type === "string" ? info.type : "";
      allAttachmentNames.push(fileName);
      const file = form.get(key);
      if (!isFormFile(file)) continue;
      if (!isSpreadsheetAttachment(fileName, mediaType || file.type)) continue;
      attachments.push(await fileToAttachment(file, fileName, mediaType));
    }
  } else {
    const countRaw = form.get("attachments");
    const count = typeof countRaw === "string" ? Number(countRaw) : 0;
    for (let i = 1; i <= (Number.isFinite(count) ? count : 0); i += 1) {
      const file = form.get(`attachment${i}`);
      if (!isFormFile(file)) continue;
      allAttachmentNames.push(file.name);
      if (!isSpreadsheetAttachment(file.name, file.type)) continue;
      attachments.push(await fileToAttachment(file, file.name, file.type));
    }
  }

  return { senderEmail, subject, text, attachments, allAttachmentNames, messageId };
}

export async function parseInboundJson(body: Record<string, unknown>): Promise<ParsedInboundEmail> {
  const senderEmail =
    parseEmailAddress(typeof body.from === "string" ? body.from : "") ||
    parseEmailAddress(typeof body.senderEmail === "string" ? body.senderEmail : "");
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const text =
    (typeof body.text === "string" && body.text) ||
    (typeof body.body === "string" && body.body) ||
    (typeof body.html === "string" ? stripHtml(body.html) : "") ||
    "";
  const messageId =
    (typeof body.messageId === "string" && body.messageId) ||
    (typeof body.message_id === "string" && body.message_id) ||
    "";

  const rawAttachments = Array.isArray(body.attachments) ? body.attachments : [];
  const allAttachmentNames: string[] = [];
  const attachments: CensusAttachment[] = [];

  for (const item of rawAttachments) {
    const record = asRecord(item);
    if (!record) continue;
    const fileName =
      (typeof record.fileName === "string" && record.fileName) ||
      (typeof record.filename === "string" && record.filename) ||
      "attachment.bin";
    const mediaType =
      (typeof record.mediaType === "string" && record.mediaType) ||
      (typeof record.type === "string" && record.type) ||
      "";
    const fileBase64 = typeof record.fileBase64 === "string" ? record.fileBase64 : "";
    allAttachmentNames.push(fileName);
    if (!fileBase64 || !isSpreadsheetAttachment(fileName, mediaType)) continue;
    attachments.push({
      fileBase64,
      mediaType: mediaType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      fileName,
    });
  }

  return { senderEmail, subject, text, attachments, allAttachmentNames, messageId };
}
