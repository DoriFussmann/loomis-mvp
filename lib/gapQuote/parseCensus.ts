import * as XLSX from "xlsx";
import type { CensusParseResult, CoverageTier, TierCounts } from "./schema";

const REL_CODE_HEADERS = ["rel code", "relcode", "relationship code", "member code"];
const RELATIONSHIP_HEADERS = [
  "relationship",
  "relation",
  "member type",
  "member relationship",
  "rel",
];
const TIER_HEADERS = ["tier coverage", "coverage tier", "benefit tier", "enrolled tier", "tier"];
const GROUP_HEADERS = [
  "employee id",
  "ee id",
  "subscriber id",
  "member id",
  "family id",
  "census id",
  "ssn",
  "employee ssn",
  "ee ssn",
  "unique id",
];
const LAST_NAME_HEADERS = ["last name", "lastname", "employee last name", "surname"];
const EMPLOYER_HEADERS = [
  "employer name",
  "employer",
  "group name",
  "group",
  "company name",
  "company",
  "client name",
  "client",
  "account name",
  "billing group",
  "policyholder",
  "organization",
];

/** Short census codes seen in the wild, plus longer word forms. Not an exhaustive broker list. */
const SUBSCRIBER_CODES = new Set([
  "sb", "sub", "ee", "e", "self", "subscriber", "employee", "emp", "staff", "primary",
]);
const SPOUSE_CODES = new Set([
  "sp", "s", "spouse", "wife", "husband", "dp", "partner", "domestic partner",
]);
const DEPENDENT_CODES = new Set([
  "de", "dep", "ch", "c", "child", "children", "dependent", "son", "daughter", "stepchild",
]);

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findColumn(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const index = headers.findIndex((header) => header === alias);
    if (index >= 0) return index;
  }
  for (const alias of aliases) {
    const index = headers.findIndex((header) => header.includes(alias));
    if (index >= 0 && headerIsSafeMatch(headers[index], alias)) return index;
  }
  return -1;
}

function headerIsSafeMatch(header: string, alias: string): boolean {
  if (alias === "rel" && header.includes("tier")) return false;
  if (alias === "coverage" && header.includes("tier")) return false;
  if ((alias === "group" || alias === "employer" || alias === "client" || alias === "company") &&
    (header.includes("id") || header.includes("number") || header.includes("code") || header.includes("ssn"))) {
    return false;
  }
  return true;
}

function classifyRelationship(raw: string): "subscriber" | "spouse" | "dependent" | "unknown" {
  const value = raw.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (!value) return "unknown";
  const compact = value.replace(/\s+/g, "");
  if (SUBSCRIBER_CODES.has(value) || SUBSCRIBER_CODES.has(compact)) return "subscriber";
  if (SPOUSE_CODES.has(value) || SPOUSE_CODES.has(compact)) return "spouse";
  if (DEPENDENT_CODES.has(value) || DEPENDENT_CODES.has(compact)) return "dependent";
  if (value.startsWith("child") || value.includes("dependent")) return "dependent";
  if (value.includes("spouse") || value.includes("partner")) return "spouse";
  if (value.includes("employee") || value.includes("subscriber")) return "subscriber";
  return "unknown";
}

function parseTierCoverage(raw: string): CoverageTier | null {
  const value = raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!value) return null;
  if (/\bfamily\b/.test(value)) return "family";
  if (/\bchild/.test(value) || /\bchildren\b/.test(value)) return "ee_children";
  if (/\bspouse\b/.test(value)) return "ee_spouse";
  if (/\bonly\b/.test(value) || value === "ee" || value === "employee") return "ee_only";
  return null;
}

function emptyTiers(): TierCounts {
  return { eeOnly: 0, eeSpouse: 0, eeChildren: 0, family: 0 };
}

function tierFromMembers(hasSpouse: boolean, dependentCount: number): CoverageTier {
  if (hasSpouse && dependentCount > 0) return "family";
  if (hasSpouse) return "ee_spouse";
  if (dependentCount > 0) return "ee_children";
  return "ee_only";
}

function incrementTier(tiers: TierCounts, tier: CoverageTier): void {
  if (tier === "ee_only") tiers.eeOnly += 1;
  else if (tier === "ee_spouse") tiers.eeSpouse += 1;
  else if (tier === "ee_children") tiers.eeChildren += 1;
  else tiers.family += 1;
}

function findHeaderRow(rows: unknown[][]): number {
  const scan = Math.min(rows.length, 20);
  for (let i = 0; i < scan; i++) {
    const headers = (rows[i] ?? []).map(normalizeHeader);
    if (
      findColumn(headers, REL_CODE_HEADERS) >= 0 ||
      findColumn(headers, RELATIONSHIP_HEADERS) >= 0 ||
      findColumn(headers, TIER_HEADERS) >= 0
    ) {
      return i;
    }
  }
  return -1;
}

function mostFrequentValue(values: string[]): string {
  const counts = new Map<string, number>();
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    counts.set(trimmed, (counts.get(trimmed) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  const entries = Array.from(counts.entries());
  for (const [value, count] of entries) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function extractCensusEmployerName(rows: unknown[][], headerRowIndex: number, headers: string[]): string {
  const employerCol = findColumn(headers, EMPLOYER_HEADERS);
  if (employerCol >= 0) {
    const values: string[] = [];
    for (let i = headerRowIndex + 1; i < rows.length; i++) {
      const value = String((rows[i] ?? [])[employerCol] ?? "").trim();
      if (value) values.push(value);
    }
    const frequent = mostFrequentValue(values);
    if (frequent) return frequent;
  }

  const scan = Math.min(headerRowIndex, 8);
  for (let i = 0; i < scan; i++) {
    const cells = (rows[i] ?? []).map((cell) => String(cell ?? "").trim()).filter(Boolean);
    const candidate = cells.find((cell) => cell.length >= 4 && /[a-zA-Z]/.test(cell) && !/available states|rate|deductible/i.test(cell));
    if (candidate) return candidate;
  }
  return "";
}

type Member = {
  kind: "subscriber" | "spouse" | "dependent" | "unknown";
  groupKey: string;
  tier: CoverageTier | null;
};

export function parseCensusWorkbook(buffer: Buffer, fileName: string): CensusParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error(`${fileName}: spreadsheet has no sheets`);
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const headerRowIndex = findHeaderRow(rows);
  if (headerRowIndex < 0) {
    throw new Error(`${fileName}: could not find a Rel Code, Relationship, or Tier Coverage column`);
  }

  const headers = (rows[headerRowIndex] ?? []).map(normalizeHeader);
  const relCodeCol = findColumn(headers, REL_CODE_HEADERS);
  const relWordCol = findColumn(headers, RELATIONSHIP_HEADERS);
  const relCol = relCodeCol >= 0 ? relCodeCol : relWordCol;
  const tierCol = findColumn(headers, TIER_HEADERS);
  const groupCol = findColumn(headers, GROUP_HEADERS);
  const lastNameCol = findColumn(headers, LAST_NAME_HEADERS);
  const censusEmployerName = extractCensusEmployerName(rows, headerRowIndex, headers);
  const warnings: string[] = [];

  if (relCol < 0 && tierCol < 0) {
    throw new Error(`${fileName}: could not find a Rel Code, Relationship, or Tier Coverage column`);
  }

  const members: Member[] = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const relRaw = relCol >= 0 ? String(row[relCol] ?? "").trim() : "";
    const tierRaw = tierCol >= 0 ? String(row[tierCol] ?? "").trim() : "";
    if (!relRaw && !tierRaw) continue;

    const kind = relRaw ? classifyRelationship(relRaw) : "unknown";
    const groupFromId = groupCol >= 0 ? String(row[groupCol] ?? "").trim() : "";
    const groupFromName = lastNameCol >= 0 ? String(row[lastNameCol] ?? "").trim().toLowerCase() : "";
    members.push({
      kind,
      groupKey: groupFromId || groupFromName || `row-${i}`,
      tier: parseTierCoverage(tierRaw),
    });
  }

  const subscribers = members.filter((member) => member.kind === "subscriber");
  const dependents = members.filter((member) => member.kind === "spouse" || member.kind === "dependent");
  const unknown = members.filter((member) => member.kind === "unknown");
  if (unknown.length > 0 && relCol >= 0) {
    warnings.push(`${unknown.length} row(s) had an unrecognized relationship code and were ignored for lives count.`);
  }

  const tiers = emptyTiers();
  const usedTierColumn = subscribers.some((member) => member.tier != null);

  if (usedTierColumn) {
    for (const subscriber of subscribers) {
      if (subscriber.tier) {
        incrementTier(tiers, subscriber.tier);
      } else {
        incrementTier(tiers, "ee_only");
        warnings.push("A subscriber row was missing Tier Coverage and was counted as Employee Only.");
      }
    }
  } else {
    const grouped = new Map<string, Member[]>();
    for (const member of members) {
      const list = grouped.get(member.groupKey) ?? [];
      list.push(member);
      grouped.set(member.groupKey, list);
    }

    const groups = Array.from(grouped.values());
    for (const group of groups) {
      const groupSubscribers = group.filter((member: Member) => member.kind === "subscriber");
      if (groupSubscribers.length === 0) continue;
      const hasSpouse = group.some((member: Member) => member.kind === "spouse");
      const dependentCount = group.filter((member: Member) => member.kind === "dependent").length;
      for (let i = 0; i < groupSubscribers.length; i++) {
        incrementTier(tiers, tierFromMembers(hasSpouse, dependentCount));
      }
    }

    if (subscribers.length > 0 && tiers.eeOnly + tiers.eeSpouse + tiers.eeChildren + tiers.family === 0) {
      for (let i = 0; i < subscribers.length; i++) incrementTier(tiers, "ee_only");
      warnings.push("Could not group dependents to subscribers; all lives priced as Employee Only.");
    }
  }

  if (relCol < 0 && subscribers.length === 0 && tierCol >= 0) {
    warnings.push("No Rel Code column found; lives were not counted from relationship codes.");
  }

  return {
    fileName,
    subscriberCount: subscribers.length,
    dependentCount: dependents.length,
    tiers,
    warnings,
    censusEmployerName,
  };
}

export function parseCensusBase64(fileBase64: string, fileName: string): CensusParseResult {
  const buffer = Buffer.from(fileBase64, "base64");
  return parseCensusWorkbook(buffer, fileName);
}
