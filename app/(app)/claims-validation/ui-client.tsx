"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { ValidationResult, FormType, ClientRecord } from "@/lib/claimsValidation/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepStatus = "pending" | "active" | "done" | "error";

interface Step {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDob(iso: string): string {
  if (!iso) return "—";
  const [yyyy, mm, dd] = iso.split("-");
  if (!yyyy || !mm || !dd) return iso;
  return `${mm}/${dd}/${yyyy}`;
}

function formTypeBadge(formType: FormType): string {
  if (formType === "UB-04") return "UB-04 (Institutional)";
  if (formType === "CMS-1500") return "CMS-1500 (Professional)";
  return "Unknown Form Type";
}

function formTypeBadgeColor(formType: FormType): string {
  if (formType === "UB-04") return "bg-blue-50 text-blue-700 border-blue-200";
  if (formType === "CMS-1500") return "bg-violet-50 text-violet-700 border-violet-200";
  return "bg-muted text-muted-foreground border-border";
}

function matchStepLabel(step: ValidationResult["matchStep"]): string {
  if (step === "member-id") return "Matched with Member ID · Last Name confirmed";
  if (step === "member-id-mismatch") return "Member ID matched — Last Name differs";
  if (step === "name-dob") return "Matched via Last Name + Date of Birth";
  if (step === "name-no-dob") return "Last Name found — Date of Birth did not match";
  return "No match found";
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({ steps }: { steps: Step[] }) {
  return (
    <div className="space-y-2">
      {steps.map((step, idx) => (
        <div key={step.id} className="flex items-start gap-3">
          {/* connector line */}
          <div className="flex flex-col items-center">
            <StepIcon status={step.status} index={idx + 1} />
            {idx < steps.length - 1 && (
              <div
                className={`w-px flex-1 mt-1 min-h-[16px] ${
                  step.status === "done" ? "bg-primary/40" : "bg-border"
                }`}
              />
            )}
          </div>
          <div className="pb-4">
            <p
              className={`text-sm font-medium leading-none ${
                step.status === "active"
                  ? "text-foreground"
                  : step.status === "done"
                  ? "text-foreground/70"
                  : step.status === "error"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {step.label}
            </p>
            {step.detail && (
              <p className="mt-1 text-xs text-muted-foreground">{step.detail}</p>
            )}
            {step.status === "active" && (
              <div className="mt-1.5 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StepIcon({
  status,
  index,
}: {
  status: StepStatus;
  index: number;
}) {
  if (status === "done") {
    return (
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
        <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
        <svg className="w-3 h-3 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }
  if (status === "active") {
    return (
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary border border-primary flex items-center justify-center">
        <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
      </span>
    );
  }
  return (
    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center">
      <span className="text-[10px] font-medium text-muted-foreground">{index}</span>
    </span>
  );
}

function MatchCard({ result }: { result: ValidationResult }) {
  const { matchedClient, matchStep, extractedFields, formType, insurerMatched, dobMatched, partialClient } = result;

  return (
    <div className="mt-6 space-y-4">
      {/* Form type badge */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${formTypeBadgeColor(formType)}`}>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {formTypeBadge(formType)}
        </span>
      </div>

      {/* Extracted fields */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Extracted from form</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <ExtractedField label="Member ID" value={extractedFields.memberId} />
          <ExtractedField label="Payer / Insurer" value={extractedFields.payerName} />
          <ExtractedField label="Patient Last Name" value={extractedFields.patientLastName} />
          <ExtractedField label="Patient First Name" value={extractedFields.patientFirstName} />
          <ExtractedField label="Date of Birth" value={extractedFields.patientDob ? formatDob(extractedFields.patientDob) : ""} />
        </div>
      </div>

      {/* Outcome card */}
      {matchStep === "member-id" && matchedClient && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckIcon color="green" />
            <p className="text-sm font-medium text-green-800">Patient identified</p>
          </div>
          <p className="text-xs text-green-700 mb-3">{matchStepLabel(matchStep)}</p>
          <ClientGrid client={matchedClient} />
          <div className="mt-3 flex gap-2 flex-wrap">
            <Badge
              icon="check"
              label="Last Name confirmed"
              style="bg-green-100 border-green-300 text-green-800"
            />
            <Badge
              icon={dobMatched ? "check" : "dash"}
              label={dobMatched ? "Date of Birth confirmed" : "Date of Birth not verified"}
              style={dobMatched ? "bg-green-100 border-green-300 text-green-800" : "bg-white border-border text-muted-foreground"}
            />
            <Badge
              icon={insurerMatched ? "check" : "dash"}
              label={insurerMatched ? "Insurer confirmed" : "Insurer not verified"}
              style={insurerMatched ? "bg-green-100 border-green-300 text-green-800" : "bg-white border-border text-muted-foreground"}
            />
          </div>
        </div>
      )}

      {matchStep === "member-id-mismatch" && matchedClient && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <WarnIcon color="amber" />
            <p className="text-sm font-medium text-amber-800">Member ID matched — Last Name differs</p>
          </div>
          <p className="text-xs text-amber-700 mb-3">
            The Member ID found a record in the database, but the patient last name on the form
            ({extractedFields.patientLastName || "blank"}) does not match the stored last name
            ({matchedClient.lastName}). Verify manually before proceeding.
          </p>
          <ClientGrid client={matchedClient} dimmed />
        </div>
      )}

      {matchStep === "name-dob" && matchedClient && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckIcon color="green" />
            <p className="text-sm font-medium text-green-800">Patient identified</p>
          </div>
          <p className="text-xs text-green-700 mb-3">{matchStepLabel(matchStep)}</p>
          <ClientGrid client={matchedClient} />
        </div>
      )}

      {matchStep === "name-no-dob" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <WarnIcon color="amber" />
            <p className="text-sm font-medium text-amber-800">Last Name found — Date of Birth did not match</p>
          </div>
          <p className="text-xs text-amber-700 mb-3">
            A record with last name <span className="font-medium">{extractedFields.patientLastName}</span> was found,
            but the Date of Birth on the form
            ({extractedFields.patientDob ? formatDob(extractedFields.patientDob) : "blank"}) did not match
            {partialClient ? ` (stored: ${formatDob(partialClient.dob)})` : ""}. This is not a confirmed match.
          </p>
        </div>
      )}

      {matchStep === "none" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-1">
            <WarnIcon color="amber" />
            <p className="text-sm font-medium text-amber-800">No match found in database</p>
          </div>
          <p className="text-xs text-amber-700">
            Searched by Member ID{extractedFields.memberId ? ` (${extractedFields.memberId})` : ""} and by
            patient last name{extractedFields.patientLastName ? ` (${extractedFields.patientLastName})` : ""}.
            No record matched.
          </p>
        </div>
      )}
    </div>
  );
}

function CheckIcon({ color }: { color: "green" }) {
  return (
    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${color === "green" ? "bg-green-600" : "bg-blue-500"}`}>
      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </span>
  );
}

function WarnIcon({ color }: { color: "amber" }) {
  return (
    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${color === "amber" ? "bg-amber-500" : "bg-blue-400"}`}>
      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </span>
  );
}

function Badge({ icon, label, style }: { icon: "check" | "dash"; label: string; style: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border ${style}`}>
      {icon === "check" ? (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      )}
      {label}
    </div>
  );
}

function ClientGrid({ client, dimmed = false }: { client: NonNullable<ValidationResult["matchedClient"]>; dimmed?: boolean }) {
  const text = dimmed ? "text-amber-900/70" : "text-green-900";
  const label = dimmed ? "text-amber-700/60" : "text-green-700/70";
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
      <MatchField label="First Name" value={client.firstName} colorClass={text} labelClass={label} />
      <MatchField label="Last Name" value={client.lastName} colorClass={text} labelClass={label} />
      <MatchField label="Date of Birth" value={formatDob(client.dob)} colorClass={text} labelClass={label} />
      <MatchField label="Member ID" value={client.memberId} colorClass={text} labelClass={label} />
    </div>
  );
}

function ExtractedField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm text-foreground font-normal">{value || <span className="text-muted-foreground italic">empty</span>}</p>
    </div>
  );
}

function MatchField({ label, value, labelClass = "text-green-700/70", colorClass = "text-green-900" }: { label: string; value: string; labelClass?: string; colorClass?: string }) {
  return (
    <div>
      <span className={`text-xs ${labelClass}`}>{label}</span>
      <p className={`text-sm font-medium ${colorClass}`}>{value || "—"}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Clients modal
// ---------------------------------------------------------------------------

function ClientsModal({ onClose }: { onClose: () => void }) {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/claims-validation/clients");
      const json = await res.json() as { success: boolean; data?: ClientRecord[]; error?: string };
      if (!json.success) throw new Error(json.error ?? "Failed to load clients");
      setClients(json.data ?? []);
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load clients");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const filtered = search.trim()
    ? clients.filter((c) => {
        const q = search.toLowerCase();
        return (
          c.firstName.toLowerCase().includes(q) ||
          c.lastName.toLowerCase().includes(q) ||
          c.memberId.toLowerCase().includes(q) ||
          c.insurerName.toLowerCase().includes(q)
        );
      })
    : clients;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl border border-border bg-card shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-medium text-foreground">Client Database</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {loading ? "Loading…" : `${filtered.length} of ${clients.length} clients`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-3 border-b border-border flex-shrink-0">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, member ID, or insurer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted/40 border border-border rounded-md focus:outline-none focus:ring-1 focus:ring-ring text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="w-2 h-2 rounded-full bg-primary/50 animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </div>
            </div>
          ) : fetchError ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-destructive">{fetchError}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">No clients match your search.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card border-b border-border">
                <tr>
                  <th className="text-left px-6 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">First Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Date of Birth</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Member ID</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Insurer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-2.5 font-medium text-foreground">{client.lastName}</td>
                    <td className="px-4 py-2.5 text-foreground">{client.firstName}</td>
                    <td className="px-4 py-2.5 text-foreground tabular-nums">{formatDob(client.dob)}</td>
                    <td className="px-4 py-2.5 text-foreground font-mono text-xs">{client.memberId}</td>
                    <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{client.insurerName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const initialSteps: Step[] = [
  { id: "identify", label: "Identifying form type", status: "pending" },
  { id: "extract", label: "Extracting patient fields", status: "pending" },
  { id: "member-id", label: "Step 1: Match by Member ID + Last Name", status: "pending" },
  { id: "name-dob", label: "Step 2: Match by Last Name + Date of Birth", status: "pending" },
];

export function ClaimsValidationClient() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [steps, setSteps] = useState<Step[]>(initialSteps);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showClients, setShowClients] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function updateStep(id: string, patch: Partial<Step>) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  }

  function resetState() {
    setSteps(initialSteps.map((s) => ({ ...s, status: "pending" as StepStatus, detail: undefined })));
    setResult(null);
    setError(null);
  }

  function handleFileSelect(selected: File) {
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      setError("Unsupported file type. Please upload a PDF, PNG, JPG, GIF, or WEBP.");
      return;
    }
    setFile(selected);
    resetState();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  }

  async function handleValidate() {
    if (!file) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    setSteps(initialSteps.map((s) => ({ ...s, status: "pending" as StepStatus, detail: undefined })));

    try {
      // Step 1 active: identifying form
      updateStep("identify", { status: "active" });

      const arrayBuffer = await file.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString("base64");

      const response = await fetch("/api/claims-validation/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64: base64, mediaType: file.type }),
      });

      const json = await response.json() as { success: boolean; data?: ValidationResult; error?: string };

      if (!json.success || !json.data) {
        updateStep("identify", { status: "error" });
        setError(json.error ?? "Validation failed");
        setProcessing(false);
        return;
      }

      const data = json.data;

      // Animate steps based on what happened
      updateStep("identify", {
        status: "done",
        detail: formTypeBadge(data.formType),
      });

      updateStep("extract", { status: "active" });
      await sleep(300);
      updateStep("extract", {
        status: "done",
        detail: [
          data.extractedFields.patientLastName,
          data.extractedFields.patientFirstName,
          data.extractedFields.memberId,
        ]
          .filter(Boolean)
          .join(" · ") || "Fields extracted",
      });

      updateStep("member-id", { status: "active" });
      await sleep(400);

      if (data.matchStep === "member-id") {
        const confirmations = ["Member ID matched", "Last Name confirmed"];
        if (data.dobMatched) confirmations.push("DoB confirmed");
        if (data.insurerMatched) confirmations.push("Insurer confirmed");
        updateStep("member-id", { status: "done", detail: confirmations.join(" · ") });
        updateStep("name-dob", { status: "pending", detail: "Not needed" });
      } else if (data.matchStep === "member-id-mismatch") {
        updateStep("member-id", {
          status: "done",
          detail: "Member ID matched — Last Name differs",
        });
        updateStep("name-dob", { status: "pending", detail: "Not needed" });
      } else {
        updateStep("member-id", {
          status: "done",
          detail: data.extractedFields.memberId ? "No match — trying Step 2" : "No Member ID — trying Step 2",
        });
        updateStep("name-dob", { status: "active" });
        await sleep(400);
        const nameDobDetail =
          data.matchStep === "name-dob" ? "Last Name + DoB confirmed" :
          data.matchStep === "name-no-dob" ? "Last Name found — DoB did not match" :
          "No match found";
        updateStep("name-dob", { status: "done", detail: nameDobDetail });
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      updateStep("identify", { status: "error" });
    } finally {
      setProcessing(false);
    }
  }

  function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const canValidate = !!file && !processing;

  return (
    <>
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
      {/* Main panel */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-xl font-normal text-foreground">Client Validation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a UB-04 or CMS-1500 claim form (PDF or image) to identify the form type and
          verify the patient identity against the client database.
        </p>

        {/* Upload zone */}
        <div
          className={`mt-5 rounded-lg border-2 border-dashed transition-colors duration-200 ${
            dragOver
              ? "border-primary bg-primary/5"
              : file
              ? "border-primary/40 bg-primary/5"
              : "border-border hover:border-border/80 hover:bg-muted/30"
          } cursor-pointer`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
            }}
          />
          <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
            {file ? (
              <>
                <span className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </span>
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {(file.size / 1024).toFixed(0)} KB · {file.type}
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs text-muted-foreground underline hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    resetState();
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Remove
                </button>
              </>
            ) : (
              <>
                <span className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </span>
                <p className="text-sm font-medium text-foreground">
                  Drop a claim form here, or{" "}
                  <span className="text-primary underline">browse</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">PDF, PNG, JPG, WEBP accepted</p>
              </>
            )}
          </div>
        </div>

        {/* Validate button + Clear Session */}
        <div className="mt-4 flex items-center gap-3">
          <Button
            onClick={handleValidate}
            disabled={!canValidate}
            className="w-full sm:w-auto"
          >
            {processing ? "Validating…" : "Validate Patient"}
          </Button>
          {(file || result || error) && !processing && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                resetState();
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear Session
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Result card */}
        {result && <MatchCard result={result} />}
      </div>

      {/* Sidebar */}
      <aside className="h-fit rounded-lg border border-border bg-card p-4 lg:sticky lg:top-6">
        <h3 className="text-sm font-medium text-foreground mb-3">Validation steps</h3>
        <StepIndicator steps={steps} />

        {!processing && !result && (
          <p className="mt-2 text-xs text-muted-foreground">
            Upload a form and click Validate Claim to begin.
          </p>
        )}

        <div className="mt-4 pt-4 border-t border-border space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Supported forms</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
              <span className="text-xs text-foreground">UB-04 / UB-92</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-violet-400 flex-shrink-0" />
              <span className="text-xs text-foreground">CMS-1500 / HCFA-1500</span>
            </div>
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mt-3">Accepted files</p>
          <p className="text-xs text-foreground">PDF, PNG, JPG, GIF, WEBP</p>
        </div>
      </aside>
    </div>

    {/* Floating Clients button */}
    <button
      onClick={() => setShowClients(true)}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-card border border-border shadow-md px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
    >
      <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
      Clients
    </button>

    {/* Clients modal */}
    {showClients && <ClientsModal onClose={() => setShowClients(false)} />}
    </>
  );
}
