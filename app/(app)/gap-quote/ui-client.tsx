"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AnalyzedGroup, AnalyzeGapQuoteResult, GroupCheck, NameConfidence, PricedGroup } from "@/lib/gapQuote/schema";

type Screen = "input" | "checks" | "tiers" | "results";

const MIN_LOADER_MS = 2000;
const STAGGER_MS = 420;
const CUSTOM_NAME = "__custom__";
const SELECT_CLASS =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function money(value: number): string {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function confidenceLabel(confidence: NameConfidence, proposedName: string): string {
  if (confidence === "high" && proposedName) return `Best guess: ${proposedName}`;
  if (confidence === "medium" && proposedName) return `Possible match: ${proposedName}`;
  return "No confident match — pick one";
}

function Preloader({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-4">
      <div className="flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-foreground" />
        <p className="text-sm text-foreground">{label}</p>
      </div>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded bg-muted">
        <div className="h-full w-2/3 rounded bg-primary animate-pulse" />
      </div>
    </div>
  );
}

function CheckRow({ check, visible }: { check: GroupCheck; visible: boolean }) {
  return (
    <div
      className="flex items-start gap-3 rounded-md border border-border bg-card px-3 py-2.5"
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 400ms cubic-bezier(0.22, 1, 0.36, 1), transform 400ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${
          check.passed
            ? "border-primary/30 bg-primary/10 text-primary"
            : "border-destructive/30 bg-destructive/10 text-destructive"
        }`}
      >
        {check.passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </span>
      <div>
        <p className="text-sm text-foreground">{check.label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
      </div>
    </div>
  );
}

export function GapQuoteClient() {
  const reducedMotion = useReducedMotion();
  const fileRef = useRef<HTMLInputElement>(null);
  const [screen, setScreen] = useState<Screen>("input");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeGapQuoteResult | null>(null);
  const [revealedChecks, setRevealedChecks] = useState(0);
  const [revealedTiers, setRevealedTiers] = useState(0);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [reviewGroupId, setReviewGroupId] = useState<string | null>(null);

  const passing = result?.groups.filter((group) => group.passed) ?? [];
  const reviewGroup = result?.groups.find((group) => group.id === reviewGroupId) ?? null;

  useEffect(() => {
    if (screen !== "checks" || !result || loading) return;
    const total = result.groups.reduce((sum, group) => sum + group.checks.length, 0);
    if (reducedMotion) {
      setRevealedChecks(total);
      return;
    }
    setRevealedChecks(0);
    let current = 0;
    const timer = window.setInterval(() => {
      current += 1;
      setRevealedChecks(current);
      if (current >= total) window.clearInterval(timer);
    }, STAGGER_MS);
    return () => window.clearInterval(timer);
  }, [screen, result, loading, reducedMotion]);

  useEffect(() => {
    if (screen !== "tiers" || loading) return;
    if (reducedMotion) {
      setRevealedTiers(passing.length);
      return;
    }
    setRevealedTiers(0);
    let current = 0;
    const timer = window.setInterval(() => {
      current += 1;
      setRevealedTiers(current);
      if (current >= passing.length) window.clearInterval(timer);
    }, STAGGER_MS);
    return () => window.clearInterval(timer);
  }, [screen, loading, reducedMotion, passing.length]);

  function patchGroup(id: string, patch: Partial<AnalyzedGroup>) {
    setResult((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        groups: prev.groups.map((group) => {
          if (group.id !== id) return group;
          const next: AnalyzedGroup = { ...group, ...patch };
          if (next.priced) {
            next.priced = {
              ...next.priced,
              employerName: next.employerName,
              nameConfirmed: next.nameConfirmed,
              nameConfidence: next.nameConfidence,
              proposedName: next.proposedName,
            };
          }
          return next;
        }),
      };
    });
  }

  function confirmEntityName(id: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    patchGroup(id, { employerName: trimmed, nameConfirmed: true, proposedName: trimmed });
  }

  function saveProposal(id: string, priced: PricedGroup) {
    patchGroup(id, { employerName: priced.employerName, nameConfirmed: true, priced });
  }

  function onPickFiles(list: FileList | null) {
    if (!list) return;
    const next = Array.from(list).filter((file) => file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls"));
    if (next.length === 0) {
      setError("Please upload .xlsx census files.");
      return;
    }
    setFiles((prev) => [...prev, ...next]);
    setError("");
  }

  async function submit() {
    if (files.length === 0) {
      setError("Attach at least one census spreadsheet.");
      return;
    }
    setError("");
    setLoading(true);
    setScreen("checks");
    const started = Date.now();
    try {
      const attachments = await Promise.all(
        files.map(async (file) => ({
          fileBase64: await fileToBase64(file),
          mediaType: file.type || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          fileName: file.name,
        }))
      );
      const response = await fetch("/api/gap-quote/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, body, attachments }),
      });
      const json = await response.json();
      const elapsed = Date.now() - started;
      if (elapsed < MIN_LOADER_MS) await sleep(MIN_LOADER_MS - elapsed);
      if (!json.success) {
        setError(json.error ?? "Analysis failed.");
        setScreen("input");
        return;
      }
      setResult(json.data as AnalyzeGapQuoteResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
      setScreen("input");
    } finally {
      setLoading(false);
    }
  }

  async function goToTiers() {
    setScreen("tiers");
    setLoading(true);
    await sleep(MIN_LOADER_MS);
    setLoading(false);
  }

  async function downloadPdf(priced: PricedGroup, fileName: string) {
    setDownloadingId(fileName);
    try {
      const { pdf } = await import("@react-pdf/renderer");
      const { GapQuoteProposalPdf } = await import("@/lib/gapQuote/proposalPdf");
      const issuedDate = priced.issuedDate || new Date().toLocaleDateString("en-US");
      const logoSrc = `${window.location.origin}/loomis-logo.png`;
      const blob = await pdf(
        <GapQuoteProposalPdf group={priced} issuedDate={issuedDate} logoSrc={logoSrc} />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `GAP_Quote_${priced.employerName.replace(/[^\w]+/g, "_")}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF export failed");
    } finally {
      setDownloadingId(null);
    }
  }

  function reset() {
    setScreen("input");
    setResult(null);
    setError("");
    setFiles([]);
    setSubject("");
    setBody("");
    setRevealedChecks(0);
    setRevealedTiers(0);
    setReviewGroupId(null);
  }

  const checksReady = !loading && result && revealedChecks >= result.groups.reduce((sum, group) => sum + group.checks.length, 0);
  const tiersReady = !loading && revealedTiers >= passing.length;

  return (
    <div>
      <h1 className="text-xl font-normal text-foreground">GAP Quote</h1>
      <p className="mt-2 text-sm text-muted-foreground mb-6">
        Paste a broker email, attach one census per billing group, and generate a Loomis GAP proposal.
      </p>

      {screen === "input" && (
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gap-subject">Subject</Label>
              <Input id="gap-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="GAP quote request — Ford Business Machines" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="gap-body">Body</Label>
              <Textarea
                id="gap-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Paste the email content here…"
                className="min-h-[180px]"
              />
            </div>
            <div>
              <Label>Attachment(s)</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className="mt-1.5 rounded-lg border-2 border-dashed border-border bg-muted/40 p-8 text-center cursor-pointer hover:bg-muted/60 transition-colors"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  multiple
                  className="hidden"
                  onChange={(e) => onPickFiles(e.target.files)}
                />
                <Upload className="w-4 h-4 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-foreground">Drop census spreadsheets, or click to upload</p>
                <p className="mt-1 text-xs text-muted-foreground">.xlsx — one file per billing group</p>
              </div>
              {files.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                      <span className="flex items-center gap-2 truncate">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-muted-foreground" />
                        {file.name}
                      </span>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button onClick={submit} disabled={loading}>
              Submit
            </Button>
          </CardContent>
        </Card>
      )}

      {screen === "checks" && (
        <div className="space-y-4">
          {loading && <Preloader label="Running eligibility checks…" />}
          {!loading && result && (
            <>
              {result.groups.map((group, groupIndex) => {
                const offset = result.groups.slice(0, groupIndex).reduce((sum, item) => sum + item.checks.length, 0);
                return (
                  <Card key={group.id}>
                    <CardHeader className="pb-3">
                      <GroupHeading
                        group={group}
                        badge={
                          <Badge variant={group.passed ? "default" : "secondary"}>
                            {group.passed ? "Pass" : "Excluded"}
                          </Badge>
                        }
                      />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <EntityNamePicker group={group} onConfirm={(name) => confirmEntityName(group.id, name)} />
                      {group.checks.map((check, checkIndex) => (
                        <CheckRow
                          key={check.id}
                          check={check}
                          visible={revealedChecks > offset + checkIndex}
                        />
                      ))}
                    </CardContent>
                  </Card>
                );
              })}
              {checksReady && (
                <div className="flex gap-2">
                  <Button onClick={goToTiers} disabled={passing.length === 0}>
                    Good to Go
                  </Button>
                  <Button variant="outline" onClick={reset}>
                    Start Over
                  </Button>
                </div>
              )}
              {checksReady && passing.length === 0 && (
                <p className="text-sm text-muted-foreground">No groups passed. Adjust the request or rate table and try again.</p>
              )}
            </>
          )}
        </div>
      )}

      {screen === "tiers" && (
        <div className="space-y-4">
          {loading && <Preloader label="Counting coverage tiers…" />}
          {!loading &&
            passing.map((group, index) => (
              <Card
                key={group.id}
                style={{
                  opacity: revealedTiers > index ? 1 : 0,
                  transform: revealedTiers > index ? "translateY(0)" : "translateY(8px)",
                  transition: "opacity 400ms cubic-bezier(0.22, 1, 0.36, 1), transform 400ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                <CardHeader>
                  <GroupHeading group={group} />
                </CardHeader>
                <CardContent>
                  <TierGrid group={group} />
                </CardContent>
              </Card>
            ))}
          {tiersReady && (
            <Button onClick={() => setScreen("results")}>Next</Button>
          )}
        </div>
      )}

      {screen === "results" && (
        <div className="space-y-4">
          {error && <p className="text-sm text-destructive">{error}</p>}
          {passing.map((group) => (
            <ResultCard
              key={group.id}
              group={group}
              downloading={downloadingId === group.fileName}
              onConfirmName={(name) => confirmEntityName(group.id, name)}
              onSeeProposal={() => setReviewGroupId(group.id)}
              onDownload={() => group.priced && downloadPdf(group.priced, group.fileName)}
            />
          ))}
          <Button variant="outline" onClick={reset}>
            New Quote
          </Button>
        </div>
      )}

      {reviewGroup?.priced && (
        <ProposalModal
          group={reviewGroup}
          downloading={downloadingId === reviewGroup.fileName}
          onClose={() => setReviewGroupId(null)}
          onSave={(priced) => {
            saveProposal(reviewGroup.id, priced);
            setReviewGroupId(null);
          }}
          onDownload={(priced) => downloadPdf(priced, reviewGroup.fileName)}
        />
      )}
    </div>
  );
}

function GroupHeading({ group, badge }: { group: AnalyzedGroup; badge?: ReactNode }) {
  const title = group.nameConfirmed ? group.employerName : group.fileName;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <CardTitle className="text-sm">{title}</CardTitle>
        <div className="flex items-center gap-2 shrink-0">{badge}</div>
      </div>
      <p className="text-xs text-muted-foreground mt-1">{group.fileName}</p>
    </div>
  );
}

function EntityNamePicker({
  group,
  onConfirm,
}: {
  group: AnalyzedGroup;
  onConfirm: (name: string) => void;
}) {
  const [selected, setSelected] = useState(group.proposedName || CUSTOM_NAME);
  const [custom, setCustom] = useState(group.proposedName && !group.candidateGroupNames.includes(group.proposedName) ? group.proposedName : "");
  const [editing, setEditing] = useState(!group.nameConfirmed);

  useEffect(() => {
    setSelected(group.proposedName || CUSTOM_NAME);
    setEditing(!group.nameConfirmed);
  }, [group.id, group.proposedName, group.nameConfirmed]);

  if (group.nameConfirmed && !editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
        <p className="text-sm text-foreground">
          Entity: <span className="font-medium">{group.employerName}</span>
        </p>
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)}>
          Change
        </Button>
      </div>
    );
  }

  const resolved = selected === CUSTOM_NAME ? custom : selected;

  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 space-y-2">
      <p className="text-xs text-muted-foreground">{confidenceLabel(group.nameConfidence, group.proposedName)}</p>
      {group.censusEmployerName && (
        <p className="text-xs text-muted-foreground">Census field: {group.censusEmployerName}</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
        <select
          className={SELECT_CLASS}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {group.candidateGroupNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
          <option value={CUSTOM_NAME}>Type a custom name</option>
        </select>
        {selected === CUSTOM_NAME && (
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Employer / group name"
          />
        )}
        <Button type="button" size="sm" onClick={() => onConfirm(resolved)} disabled={!resolved.trim()}>
          Confirm
        </Button>
      </div>
    </div>
  );
}

function TierGrid({ group }: { group: AnalyzedGroup }) {
  const items = [
    ["Employee Only", group.census.tiers.eeOnly],
    ["Employee + Spouse", group.census.tiers.eeSpouse],
    ["Employee + Child(ren)", group.census.tiers.eeChildren],
    ["Family", group.census.tiers.family],
  ] as const;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(([label, count]) => (
        <div key={label} className="rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-normal mt-1">{count}</p>
        </div>
      ))}
    </div>
  );
}

function ResultCard({
  group,
  downloading,
  onConfirmName,
  onSeeProposal,
  onDownload,
}: {
  group: AnalyzedGroup;
  downloading: boolean;
  onConfirmName: (name: string) => void;
  onSeeProposal: () => void;
  onDownload: () => void;
}) {
  const priced: PricedGroup | null = group.priced;
  if (!priced) return null;
  const rows = [
    ["Employee Only", priced.baseRates.eeOnly],
    ["Employee + Spouse", priced.baseRates.eeSpouse],
    ["Employee + Child(ren)", priced.baseRates.eeChildren],
    ["Family", priced.baseRates.family],
  ] as const;

  return (
    <Card>
      <CardHeader>
        <GroupHeading group={group} />
        <p className="text-xs text-muted-foreground mt-1">
          {priced.situsStateCode || priced.situsState} · Effective {priced.effectiveDate || "—"} · {priced.planDesignLabel}
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <EntityNamePicker group={group} onConfirm={onConfirmName} />
        </div>
        <div className="space-y-2">
          {rows.map(([label, rate]) => (
            <div key={label} className="flex items-center justify-between text-sm border-b border-border pb-2">
              <span>{label}</span>
              <span>{money(rate)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between text-sm pt-1">
            <span>Admin Fee</span>
            <span>{money(priced.adminFee)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button onClick={onSeeProposal} disabled={!group.nameConfirmed}>
            See Proposal
          </Button>
          <Button variant="outline" onClick={onDownload} disabled={!group.nameConfirmed || downloading}>
            {downloading ? "Preparing PDF…" : "Download Proposal PDF"}
          </Button>
        </div>
        {!group.nameConfirmed && (
          <p className="text-xs text-muted-foreground mt-2">Confirm the entity name before reviewing or exporting the proposal.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ProposalModal({
  group,
  downloading,
  onClose,
  onSave,
  onDownload,
}: {
  group: AnalyzedGroup;
  downloading: boolean;
  onClose: () => void;
  onSave: (priced: PricedGroup) => void;
  onDownload: (priced: PricedGroup) => void;
}) {
  const source = group.priced;
  const [draft, setDraft] = useState<PricedGroup | null>(source ? { ...source, baseRates: { ...source.baseRates } } : null);

  if (!draft) return null;

  function setField<K extends keyof PricedGroup>(key: K, value: PricedGroup[K]) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setRate(key: keyof PricedGroup["baseRates"], value: number) {
    setDraft((prev) => (prev ? { ...prev, baseRates: { ...prev.baseRates, [key]: value } } : prev));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/20 p-6">
      <div className="w-full max-w-4xl rounded-lg border border-border bg-card shadow-sm my-8">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-normal">See Proposal</h2>
            <p className="text-xs text-muted-foreground mt-1">{group.fileName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Employer Name" value={draft.employerName} onChange={(value) => setField("employerName", value)} />
          <Field label="Presented By" value={draft.presentedBy} onChange={(value) => setField("presentedBy", value)} />
          <Field label="Situs State" value={draft.situsState} onChange={(value) => setField("situsState", value)} />
          <Field label="Situs State Code" value={draft.situsStateCode} onChange={(value) => setField("situsStateCode", value)} />
          <Field label="Effective Date" value={draft.effectiveDate} onChange={(value) => setField("effectiveDate", value)} />
          <Field label="Date of Quote Issuance" value={draft.issuedDate} onChange={(value) => setField("issuedDate", value)} />
          <Field label="Plan Design" value={draft.planDesignLabel} onChange={(value) => setField("planDesignLabel", value)} />
          <NumberField label="Deductible" value={draft.deductible} onChange={(value) => setField("deductible", value)} />
          <NumberField label="Benefit / Limit" value={draft.benefit} onChange={(value) => setField("benefit", value)} />
          <Field label="SIC Code" value={draft.sicCode} onChange={(value) => setField("sicCode", value)} />
          <Field label="Rate Guarantee" value={draft.rateGuarantee} onChange={(value) => setField("rateGuarantee", value)} />
          <Field label="Pre-existing Condition Limitation" value={draft.preExistingLimitation} onChange={(value) => setField("preExistingLimitation", value)} />
          <Field label="Classes of Eligible Persons" value={draft.classesOfEligible} onChange={(value) => setField("classesOfEligible", value)} />
          <Field label="Waiver of Premium" value={draft.waiverOfPremium} onChange={(value) => setField("waiverOfPremium", value)} />
          <Field label="Coverage Type" value={draft.coverageType} onChange={(value) => setField("coverageType", value)} />
          <Field label="Underwriting Basis" value={draft.underwritingBasis} onChange={(value) => setField("underwritingBasis", value)} />
          <Field label="Employer Contribution" value={draft.employerContribution} onChange={(value) => setField("employerContribution", value)} />
          <NumberField label="Employee Only Rate" value={draft.baseRates.eeOnly} onChange={(value) => setRate("eeOnly", value)} />
          <NumberField label="Employee + Spouse Rate" value={draft.baseRates.eeSpouse} onChange={(value) => setRate("eeSpouse", value)} />
          <NumberField label="Employee + Child(ren) Rate" value={draft.baseRates.eeChildren} onChange={(value) => setRate("eeChildren", value)} />
          <NumberField label="Family Rate" value={draft.baseRates.family} onChange={(value) => setRate("family", value)} />
          <NumberField label="Admin Fee" value={draft.adminFee} onChange={(value) => setField("adminFee", value)} />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-border px-6 py-4">
          <Button onClick={() => onSave(draft)}>Save</Button>
          <Button variant="outline" onClick={() => onDownload(draft)} disabled={downloading}>
            {downloading ? "Preparing PDF…" : "Download Proposal PDF"}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input
        type="number"
        step="0.01"
        value={Number.isFinite(value) ? String(value) : ""}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
