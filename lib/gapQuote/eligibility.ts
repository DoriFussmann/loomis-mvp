import type { CensusParseResult, GapQuoteCatalog, GroupCheck } from "./schema";
import { coveredStates, findRate, formatPlanDesign, normalizeState, resolveBucket } from "./rateLookup";

const MIN_LIVES = 5;
const MAX_LIVES_EXCLUSIVE = 100;

export function runGroupChecks(input: {
  groupCount: number;
  fileName: string;
  situsState: string;
  deductible: number | null;
  benefit: number | null;
  census: CensusParseResult;
  catalog: GapQuoteCatalog;
}): { checks: GroupCheck[]; passed: boolean; stateCode: string; bucketKey: string; bucketLabel: string } {
  const stateCode = normalizeState(input.situsState);
  const lives = input.census.subscriberCount;
  const bucket = resolveBucket(stateCode, lives, input.catalog.buckets);
  const covered = coveredStates(input.catalog.buckets);

  const split: GroupCheck = {
    id: "split",
    label: "Split detection",
    passed: input.groupCount >= 1,
    detail:
      input.groupCount === 1
        ? `1 group detected from census file ${input.fileName}`
        : `${input.groupCount} groups detected — this file is ${input.fileName}`,
  };

  const livesOk = lives >= MIN_LIVES && lives < MAX_LIVES_EXCLUSIVE;
  const livesCheck: GroupCheck = {
    id: "lives",
    label: "Lives count",
    passed: livesOk,
    detail: livesOk
      ? `${lives} subscriber${lives === 1 ? "" : "s"} (under 100, 5–99 eligible)`
      : `${lives} subscriber${lives === 1 ? "" : "s"} — GAP U100 rates require 5–99 eligible lives`,
  };

  const stateOnList = Boolean(stateCode) && covered.includes(stateCode);
  const stateCheck: GroupCheck = {
    id: "state",
    label: "State check",
    passed: stateOnList && Boolean(bucket),
    detail: !input.situsState.trim()
      ? "No situs state found in the email"
      : !stateCode
        ? `Could not parse situs state "${input.situsState}"`
        : !stateOnList
          ? `${stateCode} is not on the covered list`
          : bucket
            ? `${stateCode} is covered — ${bucket.label}`
            : `${stateCode} is covered but no rate bucket matched for ${lives} lives`,
  };

  const hasPlan = input.deductible != null && input.benefit != null;
  const rate = bucket && hasPlan
    ? findRate(input.catalog, bucket.bucketKey, input.deductible as number, input.benefit as number)
    : null;
  const planCheck: GroupCheck = {
    id: "plan_design",
    label: "Plan-design match",
    passed: Boolean(rate),
    detail: !hasPlan
      ? "No deductible / benefit combination found in the email"
      : !bucket
        ? "Cannot match plan design until the state bucket is known"
        : rate
          ? `${formatPlanDesign(input.deductible as number, input.benefit as number)} exists in ${bucket.label}`
          : `${formatPlanDesign(input.deductible as number, input.benefit as number)} is not in the ${bucket.label} rate table`,
  };

  const checks = [split, livesCheck, stateCheck, planCheck];
  return {
    checks,
    passed: checks.every((check) => check.passed),
    stateCode,
    bucketKey: bucket?.bucketKey ?? "",
    bucketLabel: bucket?.label ?? "",
  };
}
