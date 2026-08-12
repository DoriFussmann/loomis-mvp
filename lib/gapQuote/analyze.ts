import { v4 as uuidv4 } from "uuid";
import { extractGapQuoteEmail } from "./extract";
import { parseCensusBase64 } from "./parseCensus";
import { runGroupChecks } from "./eligibility";
import { findRate, formatPlanDesign, normalizeState } from "./rateLookup";
import { proposeEntityNamesForBatch } from "./matchEntity";
import type {
  AnalyzedGroup,
  AnalyzeGapQuoteInput,
  AnalyzeGapQuoteResult,
  EmailGroupExtract,
  GapQuoteBucketKey,
  GapQuoteCatalog,
  PricedGroup,
} from "./schema";

function uniqueString(values: string[]): string {
  const unique = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  return unique.length === 1 ? unique[0] : "";
}

function uniqueNumber(values: Array<number | null>): number | null {
  const unique = Array.from(new Set(values.filter((value): value is number => value != null)));
  return unique.length === 1 ? unique[0] : null;
}

function sharedExtract(extracts: EmailGroupExtract[]): EmailGroupExtract {
  return {
    groupName: "",
    situsState: uniqueString(extracts.map((item) => item.situsState)),
    effectiveDate: uniqueString(extracts.map((item) => item.effectiveDate)),
    deductible: uniqueNumber(extracts.map((item) => item.deductible)),
    benefit: uniqueNumber(extracts.map((item) => item.benefit)),
    sicCode: uniqueString(extracts.map((item) => item.sicCode)),
    planDesignLabel: uniqueString(extracts.map((item) => item.planDesignLabel)),
    presentedBy: uniqueString(extracts.map((item) => item.presentedBy)),
  };
}

function todayIssued(): string {
  return new Date().toLocaleDateString("en-US");
}

function priceGroup(
  extract: EmailGroupExtract,
  proposal: { proposedName: string; nameConfidence: "high" | "medium" | "none"; nameConfirmed: boolean },
  candidateGroupNames: string[],
  censusEmployerName: string,
  census: AnalyzedGroup["census"],
  catalog: GapQuoteCatalog,
  bucketKey: string,
  bucketLabel: string,
  stateCode: string
): PricedGroup | null {
  if (!bucketKey || extract.deductible == null || extract.benefit == null) return null;
  const rate = findRate(catalog, bucketKey as GapQuoteBucketKey, extract.deductible, extract.benefit);
  if (!rate) return null;

  const employerName = proposal.nameConfirmed
    ? proposal.proposedName
    : proposal.proposedName || census.fileName.replace(/\.[^.]+$/, "");

  return {
    employerName,
    nameConfirmed: proposal.nameConfirmed,
    nameConfidence: proposal.nameConfidence,
    proposedName: proposal.proposedName,
    candidateGroupNames,
    censusEmployerName,
    situsState: extract.situsState,
    situsStateCode: stateCode || normalizeState(extract.situsState),
    effectiveDate: extract.effectiveDate,
    issuedDate: todayIssued(),
    planDesignLabel: extract.planDesignLabel || formatPlanDesign(extract.deductible, extract.benefit),
    deductible: extract.deductible,
    benefit: extract.benefit,
    sicCode: extract.sicCode,
    presentedBy: extract.presentedBy,
    rateGuarantee: "1 Year",
    preExistingLimitation: "N/A",
    classesOfEligible: "Class 1 – Active Full Time Employees",
    waiverOfPremium: "N/A",
    coverageType: "24 Hour",
    underwritingBasis: "Guaranteed Issue",
    employerContribution: "100%",
    bucketKey: bucketKey as GapQuoteBucketKey,
    bucketLabel,
    subscriberCount: census.subscriberCount,
    tiers: census.tiers,
    baseRates: {
      eeOnly: rate.rateEeOnly,
      eeSpouse: rate.rateEeSpouse,
      eeChildren: rate.rateEeChildren,
      family: rate.rateFamily,
    },
    adminFee: catalog.settings.adminFee,
  };
}

export async function analyzeGapQuote(
  input: AnalyzeGapQuoteInput,
  catalog: GapQuoteCatalog
): Promise<AnalyzeGapQuoteResult> {
  if (!input.attachments.length) {
    throw new Error("At least one census spreadsheet is required");
  }

  const extracted = await extractGapQuoteEmail(input.subject, input.body);
  const groupCount = input.attachments.length;
  const candidateGroupNames = extracted.groups
    .map((item) => item.groupName.trim())
    .filter(Boolean);
  const shared = sharedExtract(extracted.groups);

  const parsed = input.attachments.map((attachment) => ({
    attachment,
    census: parseCensusBase64(attachment.fileBase64, attachment.fileName),
  }));

  const proposals = proposeEntityNamesForBatch(
    parsed.map((item) => ({
      fileName: item.attachment.fileName,
      censusEmployerName: item.census.censusEmployerName,
    })),
    candidateGroupNames
  );

  const groups: AnalyzedGroup[] = parsed.map((item, index) => {
    const { attachment, census } = item;
    const proposal = proposals[index];

    const matchedExtract =
      proposal.proposedName
        ? extracted.groups.find((group) => group.groupName.trim() === proposal.proposedName)
        : undefined;
    const extract = matchedExtract
      ? { ...shared, ...matchedExtract, presentedBy: matchedExtract.presentedBy || shared.presentedBy }
      : shared;

    const { checks, passed, stateCode, bucketKey, bucketLabel } = runGroupChecks({
      groupCount,
      fileName: attachment.fileName,
      situsState: extract.situsState,
      deductible: extract.deductible,
      benefit: extract.benefit,
      census,
      catalog,
    });

    const employerName = proposal.nameConfirmed
      ? proposal.proposedName
      : proposal.proposedName || attachment.fileName.replace(/\.[^.]+$/, "");

    const priced = passed
      ? priceGroup(
          extract,
          proposal,
          candidateGroupNames,
          census.censusEmployerName,
          census,
          catalog,
          bucketKey,
          bucketLabel,
          stateCode
        )
      : null;

    return {
      id: uuidv4(),
      fileName: attachment.fileName,
      employerName,
      nameConfirmed: proposal.nameConfirmed,
      nameConfidence: proposal.nameConfidence,
      proposedName: proposal.proposedName,
      candidateGroupNames,
      censusEmployerName: census.censusEmployerName,
      situsState: extract.situsState,
      situsStateCode: stateCode,
      effectiveDate: extract.effectiveDate,
      planDesignLabel: extract.planDesignLabel,
      deductible: extract.deductible,
      benefit: extract.benefit,
      sicCode: extract.sicCode,
      presentedBy: extract.presentedBy || extracted.presentedBy,
      census,
      checks,
      passed: passed && Boolean(priced),
      priced,
    };
  });

  return {
    groupCount,
    groups,
    passingCount: groups.filter((group) => group.passed).length,
  };
}
