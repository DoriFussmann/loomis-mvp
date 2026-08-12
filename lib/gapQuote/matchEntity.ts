export type NameConfidence = "high" | "medium" | "none";

export interface EntityProposal {
  proposedName: string;
  nameConfidence: NameConfidence;
  nameConfirmed: boolean;
}

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
  if (a.includes(b) || b.includes(a)) return 85;
  const tokensA = new Set(a.split(" ").filter((token) => token.length > 1));
  const tokensB = b.split(" ").filter((token) => token.length > 1);
  if (tokensB.length === 0) return 0;
  const hits = tokensB.filter((token) => tokensA.has(token)).length;
  return Math.round((100 * hits) / tokensB.length);
}

export function proposeEntityName(input: {
  fileName: string;
  censusEmployerName: string;
  candidateGroupNames: string[];
  fileCount: number;
}): EntityProposal {
  const named = input.candidateGroupNames.map((name) => name.trim()).filter(Boolean);

  if (input.fileCount === 1 && named.length === 1) {
    return { proposedName: named[0], nameConfidence: "high", nameConfirmed: true };
  }

  const signals = [fileStem(input.fileName), input.censusEmployerName].filter((value) => value.trim().length > 0);

  let bestName = "";
  let bestScore = 0;
  for (const candidate of named) {
    const score = Math.max(0, ...signals.map((signal) => scoreNameOverlap(signal, candidate)));
    if (score > bestScore) {
      bestScore = score;
      bestName = candidate;
    }
  }

  if (!bestName && input.censusEmployerName.trim()) {
    return {
      proposedName: input.censusEmployerName.trim(),
      nameConfidence: "medium",
      nameConfirmed: false,
    };
  }

  if (bestScore >= 80) {
    return { proposedName: bestName, nameConfidence: "high", nameConfirmed: false };
  }
  if (bestScore >= 50 && bestName) {
    return { proposedName: bestName, nameConfidence: "medium", nameConfirmed: false };
  }

  return { proposedName: "", nameConfidence: "none", nameConfirmed: false };
}
