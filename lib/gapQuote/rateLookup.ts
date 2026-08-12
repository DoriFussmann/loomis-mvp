import type { GapQuoteBucketKey, GapQuoteCatalog, GapQuoteRateRow, GapQuoteStateBucket } from "./schema";

const STATE_NAME_TO_CODE: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", "district of columbia": "DC",
  florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA",
  maine: "ME", maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY",
};

export function normalizeState(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const upper = trimmed.toUpperCase().replace(/[^A-Z]/g, "");
  if (upper.length === 2) return upper;
  const named = STATE_NAME_TO_CODE[trimmed.toLowerCase().replace(/\./g, "").trim()];
  return named ?? "";
}

export function coveredStates(buckets: GapQuoteStateBucket[]): string[] {
  const codes = new Set<string>();
  for (const bucket of buckets) {
    for (const state of bucket.states) codes.add(state);
  }
  return Array.from(codes).sort();
}

export function resolveBucket(
  stateCode: string,
  lives: number,
  buckets: GapQuoteStateBucket[]
): GapQuoteStateBucket | null {
  if (!stateCode) return null;
  if (stateCode === "FL") {
    const key: GapQuoteBucketKey = lives <= 50 ? "standard" : "fl_50_100";
    return buckets.find((bucket) => bucket.bucketKey === key) ?? null;
  }
  return (
    buckets.find(
      (bucket) => bucket.bucketKey !== "fl_50_100" && bucket.states.includes(stateCode)
    ) ?? null
  );
}

export function findRate(
  catalog: GapQuoteCatalog,
  bucketKey: GapQuoteBucketKey,
  deductible: number,
  benefit: number
): GapQuoteRateRow | null {
  return (
    catalog.rates.find(
      (row) =>
        row.bucketKey === bucketKey &&
        row.deductible === deductible &&
        row.benefit === benefit
    ) ?? null
  );
}

export function formatPlanDesign(deductible: number, benefit: number): string {
  const money = (value: number) =>
    value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return `${money(deductible)} / ${money(benefit)}`;
}
