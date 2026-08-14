import type { AnalyzedGroup } from "./schema";

export type NameConfidence = "high" | "medium" | "none";

export interface EntityProposal {
  proposedName: string;
  nameConfidence: NameConfidence;
  nameConfirmed: boolean;
}

const CONFIDENT_SCORE = 80;
const FILENAME_NOISE = new Set([
  "census",
  "file",
  "group",
  "quote",
  "sheet",
  "xls",
  "xlsx",
  "spreadsheet",
  "data",
  "list",
  "employees",
  "employee",
  "enrollment",
  "member",
  "members",
  "billing",
  "lives",
  "report",
]);

function fileStem(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

export function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(inc|llc|ltd|corp|co|company)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function distinctiveTokens(value: string): string[] {
  return normalizeName(value)
    .split(" ")
    .filter((token) => token.length >= 4 && !FILENAME_NOISE.has(token) && !/^\d+$/.test(token));
}

export function scoreNameOverlap(left: string, right: string): number {
  const a = normalizeName(left);
  const b = normalizeName(right);
  if (!a || !b) return 0;
  if (a === b) return 100;

  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  const shorterTokens = shorter.split(" ").filter((token) => token.length > 1);
  // A short shared token like "greco" must not count as a confident includes-match
  // against every candidate that contains it.
  if (longer.includes(shorter) && (shorter.length >= 8 || shorterTokens.length >= 2)) {
    return 85;
  }

  const tokensA = new Set(a.split(" ").filter((token) => token.length > 1));
  const tokensB = b.split(" ").filter((token) => token.length > 1);
  if (tokensB.length === 0) return 0;
  const hits = tokensB.filter((token) => tokensA.has(token)).length;
  return Math.round((100 * hits) / tokensB.length);
}

/** Unique / distinctive keywords in a filename or census field vs one candidate. */
function keywordScore(signal: string, candidate: string, otherCandidates: string[]): number {
  const haystack = normalizeName(signal);
  if (!haystack) return 0;

  const tokens = distinctiveTokens(candidate);
  let uniqueHits = 0;
  let sharedHits = 0;
  for (const token of tokens) {
    if (!haystack.includes(token)) continue;
    sharedHits += 1;
    const inOther = otherCandidates.some((other) => normalizeName(other).includes(token));
    if (!inOther) uniqueHits += 1;
  }

  if (uniqueHits >= 2) return 100;
  if (uniqueHits === 1) return 92;
  if (sharedHits >= 2) return 85;
  return 0;
}

function signalScore(
  fileName: string,
  censusEmployerName: string,
  candidate: string,
  otherCandidates: string[]
): number {
  const signals = [fileStem(fileName), censusEmployerName].filter((value) => value.trim().length > 0);
  if (signals.length === 0) return 0;
  return Math.max(
    0,
    ...signals.map((signal) =>
      Math.max(keywordScore(signal, candidate, otherCandidates), scoreNameOverlap(signal, candidate))
    )
  );
}

function confirmedProposal(proposedName: string, nameConfidence: NameConfidence): EntityProposal {
  return { proposedName, nameConfidence, nameConfirmed: true };
}

export function proposeEntityNamesForBatch(
  files: { fileName: string; censusEmployerName: string }[],
  candidateGroupNames: string[]
): EntityProposal[] {
  const named = Array.from(
    new Set(candidateGroupNames.map((name) => name.trim()).filter(Boolean))
  );

  if (files.length === 1 && named.length === 1) {
    return [confirmedProposal(named[0], "high")];
  }

  const proposals: EntityProposal[] = files.map(() => ({
    proposedName: "",
    nameConfidence: "none",
    nameConfirmed: false,
  }));

  if (files.length === 0 || named.length === 0) {
    return proposals;
  }

  const scores = files.map((file) =>
    named.map((candidate) => {
      const others = named.filter((name) => name !== candidate);
      return signalScore(file.fileName, file.censusEmployerName, candidate, others);
    })
  );

  const fileAssigned = files.map(() => false);
  const candidateAssigned = new Set<string>();

  type Claim = { fileIndex: number; candidateIndex: number; score: number };
  const claims: Claim[] = [];

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    for (let candidateIndex = 0; candidateIndex < named.length; candidateIndex++) {
      const score = scores[fileIndex][candidateIndex];
      if (score < CONFIDENT_SCORE) continue;

      const bestForFile = Math.max(...scores[fileIndex]);
      const bestForCandidate = Math.max(...scores.map((row) => row[candidateIndex]));
      const fileTie = scores[fileIndex].some((value, index) => index !== candidateIndex && value === score);
      const candidateTie = scores.some(
        (row, index) => index !== fileIndex && row[candidateIndex] === score
      );

      if (score === bestForFile && score === bestForCandidate && !fileTie && !candidateTie) {
        claims.push({ fileIndex, candidateIndex, score });
      }
    }
  }

  claims.sort((left, right) => right.score - left.score);

  for (const claim of claims) {
    const candidate = named[claim.candidateIndex];
    if (fileAssigned[claim.fileIndex] || candidateAssigned.has(candidate)) continue;
    fileAssigned[claim.fileIndex] = true;
    candidateAssigned.add(candidate);
    proposals[claim.fileIndex] = confirmedProposal(candidate, claim.score >= 85 ? "high" : "medium");
  }

  const remainingFiles = files.map((_, index) => index).filter((index) => !fileAssigned[index]);
  const remainingCandidates = named.filter((name) => !candidateAssigned.has(name));

  // N files / N names: if keyword matching locked N-1, the last pair is assigned by elimination.
  if (
    remainingFiles.length === 1 &&
    remainingCandidates.length === 1 &&
    files.length === named.length &&
    candidateAssigned.size > 0
  ) {
    proposals[remainingFiles[0]] = confirmedProposal(remainingCandidates[0], "medium");
  }

  return proposals;
}

export function applyEntityNameProposals(groups: AnalyzedGroup[]): AnalyzedGroup[] {
  if (groups.length === 0) return groups;
  const proposals = proposeEntityNamesForBatch(
    groups.map((group) => ({
      fileName: group.fileName,
      censusEmployerName: group.censusEmployerName,
    })),
    groups[0].candidateGroupNames
  );

  return groups.map((group, index) => {
    if (group.nameConfirmed) return group;
    const proposal = proposals[index];
    if (!proposal?.proposedName || !proposal.nameConfirmed) return group;
    return {
      ...group,
      employerName: proposal.proposedName,
      proposedName: proposal.proposedName,
      nameConfidence: proposal.nameConfidence,
      nameConfirmed: true,
      priced: group.priced
        ? {
            ...group.priced,
            employerName: proposal.proposedName,
            proposedName: proposal.proposedName,
            nameConfirmed: true,
            nameConfidence: proposal.nameConfidence,
          }
        : group.priced,
    };
  });
}

export function proposeEntityName(input: {
  fileName: string;
  censusEmployerName: string;
  candidateGroupNames: string[];
  fileCount: number;
}): EntityProposal {
  const files = Array.from({ length: Math.max(1, input.fileCount) }, (_, index) =>
    index === 0
      ? { fileName: input.fileName, censusEmployerName: input.censusEmployerName }
      : { fileName: "", censusEmployerName: "" }
  );
  return proposeEntityNamesForBatch(files, input.candidateGroupNames)[0];
}
