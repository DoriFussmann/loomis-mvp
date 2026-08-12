export type GapQuoteBucketKey = "standard" | "lr60" | "oh" | "mi" | "fl_50_100";

export type CoverageTier = "ee_only" | "ee_spouse" | "ee_children" | "family";

export interface GapQuoteStateBucket {
  bucketKey: GapQuoteBucketKey;
  label: string;
  states: string[];
  livesMin: number;
  livesMax: number;
  sortOrder: number;
}

export interface GapQuoteRateRow {
  id: string;
  bucketKey: GapQuoteBucketKey;
  deductible: number;
  benefit: number;
  rateEeOnly: number;
  rateEeSpouse: number;
  rateEeChildren: number;
  rateFamily: number;
}

export interface GapQuoteSettings {
  id: string;
  adminFee: number;
}

export interface GapQuoteCatalog {
  buckets: GapQuoteStateBucket[];
  rates: GapQuoteRateRow[];
  settings: GapQuoteSettings;
}

export interface EmailGroupExtract {
  groupName: string;
  situsState: string;
  effectiveDate: string;
  deductible: number | null;
  benefit: number | null;
  sicCode: string;
  planDesignLabel: string;
  presentedBy: string;
}

export interface EmailExtractionResult {
  presentedBy: string;
  groups: EmailGroupExtract[];
}

export interface CensusAttachment {
  fileBase64: string;
  mediaType: string;
  fileName: string;
}

export interface AnalyzeGapQuoteInput {
  subject: string;
  body: string;
  attachments: CensusAttachment[];
}

export interface TierCounts {
  eeOnly: number;
  eeSpouse: number;
  eeChildren: number;
  family: number;
}

export interface CensusParseResult {
  fileName: string;
  subscriberCount: number;
  dependentCount: number;
  tiers: TierCounts;
  warnings: string[];
  censusEmployerName: string;
}

export type CheckId = "split" | "lives" | "state" | "plan_design";

export interface GroupCheck {
  id: CheckId;
  label: string;
  passed: boolean;
  detail: string;
}

export interface TierRates {
  eeOnly: number;
  eeSpouse: number;
  eeChildren: number;
  family: number;
}

export type NameConfidence = "high" | "medium" | "none";

export interface PricedGroup {
  employerName: string;
  nameConfirmed: boolean;
  nameConfidence: NameConfidence;
  proposedName: string;
  candidateGroupNames: string[];
  censusEmployerName: string;
  situsState: string;
  situsStateCode: string;
  effectiveDate: string;
  issuedDate: string;
  planDesignLabel: string;
  deductible: number;
  benefit: number;
  sicCode: string;
  presentedBy: string;
  rateGuarantee: string;
  preExistingLimitation: string;
  classesOfEligible: string;
  waiverOfPremium: string;
  coverageType: string;
  underwritingBasis: string;
  employerContribution: string;
  bucketKey: GapQuoteBucketKey;
  bucketLabel: string;
  subscriberCount: number;
  tiers: TierCounts;
  baseRates: TierRates;
  adminFee: number;
}

export interface AnalyzedGroup {
  id: string;
  fileName: string;
  employerName: string;
  nameConfirmed: boolean;
  nameConfidence: NameConfidence;
  proposedName: string;
  candidateGroupNames: string[];
  censusEmployerName: string;
  situsState: string;
  situsStateCode: string;
  effectiveDate: string;
  planDesignLabel: string;
  deductible: number | null;
  benefit: number | null;
  sicCode: string;
  presentedBy: string;
  census: CensusParseResult;
  checks: GroupCheck[];
  passed: boolean;
  priced: PricedGroup | null;
}

export interface AnalyzeGapQuoteResult {
  groupCount: number;
  groups: AnalyzedGroup[];
  passingCount: number;
}
