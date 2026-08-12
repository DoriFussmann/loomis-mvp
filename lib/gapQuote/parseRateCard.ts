import { v4 as uuidv4 } from "uuid";
import * as XLSX from "xlsx";
import type { GapQuoteBucketKey, GapQuoteRateRow, GapQuoteStateBucket } from "./schema";

/**
 * Locked mapping from reference/gap-quote/rate-card.xlsx
 * Sheet: "Rate cards"
 *
 * Row 15 (0-indexed): Deductible | Limit | then five repeating tier blocks
 *   EE | EE + SP | EE + CH | FAMILY
 * Row 14: bucket labels spanning each 4-column block
 * Row 16+: rate data
 *
 * Columns:
 *   A (0) Deductible
 *   B (1) Limit  (core benefit)
 *   C–F  (2–5)   Standard States
 *   G–J  (6–9)   60% LR states
 *   K–N  (10–13) OH
 *   O–R  (14–17) MI
 *   S–V  (18–21) FL 50-100 lives
 */
export const RATE_CARD_SHEET_NAME = "Rate cards";
export const RATE_CARD_DEDUCTIBLE_HEADER = "Deductible";
export const RATE_CARD_LIMIT_HEADER = "Limit";
export const RATE_CARD_TIER_HEADERS = ["EE", "EE + SP", "EE + CH", "FAMILY"] as const;

export const RATE_CARD_BUCKET_COLUMNS: {
  key: GapQuoteBucketKey;
  colStart: number;
  fallbackLabel: string;
  fallbackStates: string[];
  livesMin: number;
  livesMax: number;
  sortOrder: number;
}[] = [
  {
    key: "standard",
    colStart: 2,
    fallbackLabel: "Standard States",
    fallbackStates: [
      "AL", "AR", "AZ", "DC", "FL", "GA", "HI", "IA", "IL", "KS", "KY", "LA", "MA",
      "MS", "NE", "NC", "NV", "OK", "OR", "PA", "SC", "SD", "TN", "TX", "UT", "VA",
      "WI", "WV", "WY",
    ],
    livesMin: 5,
    livesMax: 100,
    sortOrder: 1,
  },
  {
    key: "lr60",
    colStart: 6,
    fallbackLabel: "60% LR states",
    fallbackStates: ["CO", "IN", "MO", "NH"],
    livesMin: 5,
    livesMax: 100,
    sortOrder: 2,
  },
  {
    key: "oh",
    colStart: 10,
    fallbackLabel: "OH",
    fallbackStates: ["OH"],
    livesMin: 5,
    livesMax: 100,
    sortOrder: 3,
  },
  {
    key: "mi",
    colStart: 14,
    fallbackLabel: "MI",
    fallbackStates: ["MI"],
    livesMin: 5,
    livesMax: 100,
    sortOrder: 4,
  },
  {
    key: "fl_50_100",
    colStart: 18,
    fallbackLabel: "FL 50-100 lives",
    fallbackStates: ["FL"],
    livesMin: 51,
    livesMax: 100,
    sortOrder: 5,
  },
];

const US_STATE_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "HI", "IA",
  "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS",
  "MT", "NC", "ND", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA",
  "RI", "SC", "SD", "TN", "TX", "UT", "VA", "VT", "WA", "WI", "WV", "WY",
]);

export function parseMoneyAmount(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return null;
  const cleaned = raw.replace(/[$,\s]/g, "").trim();
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function cell(row: unknown[], index: number): string {
  const value = row[index];
  if (value == null) return "";
  return String(value).trim();
}

function extractStateCodes(label: string): string[] {
  const matches = label.toUpperCase().match(/\b[A-Z]{2}\b/g) ?? [];
  const unique: string[] = [];
  for (const code of matches) {
    if (US_STATE_CODES.has(code) && !unique.includes(code)) unique.push(code);
  }
  return unique;
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const deductible = cell(rows[i], 0);
    const limit = cell(rows[i], 1);
    const ee = cell(rows[i], 2);
    if (
      deductible === RATE_CARD_DEDUCTIBLE_HEADER &&
      limit === RATE_CARD_LIMIT_HEADER &&
      ee === RATE_CARD_TIER_HEADERS[0]
    ) {
      return i;
    }
  }
  return -1;
}

export interface ParsedRateCard {
  buckets: GapQuoteStateBucket[];
  rates: GapQuoteRateRow[];
}

export function parseRateCardWorkbook(buffer: Buffer): ParsedRateCard {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames.includes(RATE_CARD_SHEET_NAME)
    ? RATE_CARD_SHEET_NAME
    : workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Rate card spreadsheet has no sheets");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  const headerRowIndex = findHeaderRow(rows);
  if (headerRowIndex < 0) {
    throw new Error(
      `Could not find header row with "${RATE_CARD_DEDUCTIBLE_HEADER}" / "${RATE_CARD_LIMIT_HEADER}" / "${RATE_CARD_TIER_HEADERS.join(", ")}"`
    );
  }

  const bucketLabelRow = headerRowIndex > 0 ? rows[headerRowIndex - 1] ?? [] : [];

  const buckets: GapQuoteStateBucket[] = RATE_CARD_BUCKET_COLUMNS.map((def) => {
    const labelFromSheet = cell(bucketLabelRow, def.colStart);
    const states = extractStateCodes(labelFromSheet);
    return {
      bucketKey: def.key,
      label: labelFromSheet || def.fallbackLabel,
      states: states.length > 0 ? states : def.fallbackStates,
      livesMin: def.livesMin,
      livesMax: def.livesMax,
      sortOrder: def.sortOrder,
    };
  });

  const rates: GapQuoteRateRow[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const deductible = parseMoneyAmount(row[0]);
    const benefit = parseMoneyAmount(row[1]);
    if (deductible == null || benefit == null) continue;

    for (const def of RATE_CARD_BUCKET_COLUMNS) {
      const ee = parseMoneyAmount(row[def.colStart]);
      const spouse = parseMoneyAmount(row[def.colStart + 1]);
      const children = parseMoneyAmount(row[def.colStart + 2]);
      const family = parseMoneyAmount(row[def.colStart + 3]);
      if (ee == null || spouse == null || children == null || family == null) continue;

      rates.push({
        id: uuidv4(),
        bucketKey: def.key,
        deductible,
        benefit,
        rateEeOnly: ee,
        rateEeSpouse: spouse,
        rateEeChildren: children,
        rateFamily: family,
      });
    }
  }

  if (rates.length === 0) {
    throw new Error("Rate card contained no rate rows");
  }

  return { buckets, rates };
}

export function parseRateCardBase64(fileBase64: string): ParsedRateCard {
  const buffer = Buffer.from(fileBase64, "base64");
  return parseRateCardWorkbook(buffer);
}
