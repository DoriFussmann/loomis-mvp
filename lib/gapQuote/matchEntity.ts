export type NameConfidence = "high" | "medium" | "none";

export interface EntityProposal {
  proposedName: string;
  nameConfidence: NameConfidence;
  nameConfirmed: boolean;
}

const CONFIDENT_SCORE = 80;

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

function signalScore(fileName: string, censusEmployerName: string, candidate: string): number {
  const signals = [fileStem(fileName), censusEmployerName].filter((value) => value.trim().length > 0);
  if (signals.length === 0) return 0;
  return Math.max(0, ...signals.map((signal) => scoreNameOverlap(signal, candidate)));
}

export function proposeEntityNamesForBatch(
  files: { fileName: string; censusEmployerName: string }[],
  candidateGroupNames: string[]
): EntityProposal[] {
  const named = Array.from(
    new Set(candidateGroupNames.map((name) => name.trim()).filter(Boolean))
  );

  if (files.length === 1 && named.length === 1) {
    return [{ proposedName: named[0], nameConfidence: "high", nameConfirmed: true }];
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
    named.map((candidate) => signalScore(file.fileName, file.censusEmployerName, candidate))
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
    proposals[claim.fileIndex] = {
      proposedName: candidate,
      nameConfidence: claim.score >= 85 ? "high" : "medium",
      nameConfirmed: false,
    };
  }

  const remainingFiles = files.map((_, index) => index).filter((index) => !fileAssigned[index]);
  const remainingCandidates = named.filter((name) => !candidateAssigned.has(name));

  if (remainingFiles.length === 1 && remainingCandidates.length === 1) {
    const fileIndex = remainingFiles[0];
    proposals[fileIndex] = {
      proposedName: remainingCandidates[0],
      nameConfidence: "medium",
      nameConfirmed: false,
    };
  }

  return proposals;
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
