"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { exportEmployerApplicationToExcel } from "@/lib/exportEmployerApplicationToExcel";
import type { EmployerExtractionResult, EmployerSectionResult } from "@/lib/employerApplication/schema";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
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

interface CollapsiblePanelProps {
  section: EmployerSectionResult;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  entranceReady: boolean;
  reducedMotion: boolean;
}

function CollapsiblePanel({ section, index, isOpen, onToggle, entranceReady, reducedMotion }: CollapsiblePanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<string>("0px");

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    if (isOpen) {
      setHeight(`${el.scrollHeight}px`);
    } else {
      // Snapshot the rendered height first so we can transition away from 'auto'
      const currentHeight = el.getBoundingClientRect().height;
      setHeight(`${currentHeight}px`);
      const frame = requestAnimationFrame(() => {
        requestAnimationFrame(() => setHeight("0px"));
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [isOpen]);

  function handleTransitionEnd(e: React.TransitionEvent<HTMLDivElement>) {
    if (e.propertyName !== "height") return;
    // After fully opening, switch to 'auto' so content reflow works
    if (isOpen) setHeight("auto");
  }

  const staggerDelay = reducedMotion ? 0 : Math.min(index, 12) * 60;

  const entranceStyle: React.CSSProperties = reducedMotion
    ? {}
    : {
        opacity: entranceReady ? 1 : 0,
        transform: entranceReady ? "translateY(0)" : "translateY(12px)",
        transition: entranceReady
          ? `opacity 400ms cubic-bezier(0.22, 1, 0.36, 1) ${staggerDelay}ms, transform 400ms cubic-bezier(0.22, 1, 0.36, 1) ${staggerDelay}ms`
          : "none",
      };

  const contentWrapperStyle: React.CSSProperties = {
    height,
    overflow: "hidden",
    transition: reducedMotion ? "none" : "height 320ms cubic-bezier(0.4, 0, 0.2, 1)",
  };

  const innerContentStyle: React.CSSProperties = {
    opacity: isOpen ? 1 : 0,
    transition: reducedMotion ? "none" : isOpen ? "opacity 200ms ease 80ms" : "opacity 100ms ease",
  };

  const chevronStyle: React.CSSProperties = {
    flexShrink: 0,
    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
    transition: reducedMotion ? "none" : "transform 280ms ease",
  };

  return (
    <div className="rounded-xl border border-line bg-white" style={entranceStyle}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left hover:bg-soft"
      >
        <h2 className="text-ink">{section.title}</h2>
        <div className="flex items-center gap-2">
          <span className={section.filled === section.total ? "text-accent" : "text-muted-foreground"}>
            {section.filled} / {section.total} Fields
          </span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="h-4 w-4 text-muted-foreground"
            style={chevronStyle}
          >
            <polyline points="6 9 12 15 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      <div ref={contentRef} style={contentWrapperStyle} onTransitionEnd={handleTransitionEnd}>
        <div className="border-t border-line px-4 pb-3" style={innerContentStyle}>
          <div className="mb-2.5 h-1.5 overflow-hidden rounded bg-muted">
            <div className="h-full rounded bg-primary transition-all duration-500" style={{ width: `${section.percent}%` }} />
          </div>
          <div className="space-y-2">
            {section.fields.map((field) => (
              <div key={field.id} className="grid grid-cols-[220px_1fr] gap-4 border-b border-border/60 py-1.5">
                <p className="text-xs text-muted-foreground">{field.label}</p>
                {field.isMissing ? (
                  <p className="text-xs text-destructive">Missing</p>
                ) : (
                  <p className="text-xs text-foreground whitespace-pre-wrap">{field.value}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmployerApplicationClient() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<EmployerExtractionResult | null>(null);
  const [loaderFrame, setLoaderFrame] = useState(0);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [panelsVisible, setPanelsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!loading) {
      setLoaderFrame(0);
      return;
    }
    const id = window.setInterval(() => setLoaderFrame((f) => f + 1), 750);
    return () => window.clearInterval(id);
  }, [loading]);

  // Trigger staggered entrance after results populate
  useEffect(() => {
    if (!result) {
      setPanelsVisible(false);
      setOpenSections(new Set());
      return;
    }
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(() => setPanelsVisible(true));
    });
    return () => cancelAnimationFrame(frame);
  }, [result]);

  function toggleSection(id: string) {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const sectionSummary = useMemo(() => {
    if (!result) return [];
    return result.sections.map((section) => ({
      id: section.id,
      title: section.title,
      filled: section.filled,
      total: section.total,
      percent: section.percent,
    }));
  }, [result]);

  const nameMismatchWarning = useMemo(() => {
    if (!result) return "";
    const byId = new Map<string, string>();
    for (const section of result.sections) {
      for (const field of section.fields) {
        byId.set(field.id, field.value.trim());
      }
    }
    const eligibilityName = byId.get("eligibility_contact_name") ?? "";
    const authorizedName = byId.get("authorized_rep_name") ?? "";
    if (!eligibilityName || !authorizedName) return "";
    if (eligibilityName.toLowerCase() === authorizedName.toLowerCase()) return "";
    return `Name mismatch detected: Eligibility Contact is "${eligibilityName}" while Authorized Representative is "${authorizedName}".`;
  }, [result]);

  const dynamicHints = [
    "Reading sections and field labels...",
    "Matching form data to known anchors...",
    "Checking for missing values...",
    "Building completion summaries...",
    "Validating contribution tables...",
    "Reviewing contact and eligibility blocks...",
    "Preparing section-by-section view...",
    "Finalizing export-ready field list...",
  ];

  const hint = dynamicHints[loaderFrame % dynamicHints.length];
  const fakeProgress = Math.min(92, 16 + loaderFrame * 2);

  function onPickFile(next: File | null) {
    if (!next) return;
    if (next.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    setFile(next);
    setError("");
    setResult(null);
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      setStage("Preparing upload...");
      const fileBase64 = await fileToBase64(file);

      setStage("Reading form fields...");
      const response = await fetch("/api/employer-application/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, mediaType: "application/pdf" }),
      });
      const json = await response.json();

      if (!json.success) {
        setError(json.error ?? "Extraction failed.");
        return;
      }

      setStage("Organizing sections...");
      setResult(json.data as EmployerExtractionResult);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    } finally {
      setLoading(false);
      setStage("");
    }
  }

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
      <div className="rounded-xl border border-line bg-white p-6">
        <h1 className="text-[15px] text-ink">Employer Application</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload an Employer Agreement PDF to extract all sections, identify missing fields, and export the result.
        </p>

        {!result && (
          <>
            <div
              onClick={() => inputRef.current?.click()}
              className="mt-6 cursor-pointer rounded-xl border border-dashed border-line bg-soft p-10 text-center hover:bg-white"
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              <p className="text-sm text-foreground">{file ? file.name : "Drag and drop a PDF here, or click to upload"}</p>
              <p className="mt-1 text-xs text-muted-foreground">Employer Agreement PDF only</p>
            </div>

            {loading && (
              <div className="mt-4 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
                  <p className="text-sm text-foreground">
                    {stage || "Analyzing"}
                    <span className="inline-flex w-6">
                      <span className={loaderFrame % 3 === 0 ? "opacity-100" : "opacity-20"}>.</span>
                      <span className={loaderFrame % 3 === 1 ? "opacity-100" : "opacity-20"}>.</span>
                      <span className={loaderFrame % 3 === 2 ? "opacity-100" : "opacity-20"}>.</span>
                    </span>
                  </p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded bg-muted">
                  <div className="h-full rounded bg-primary transition-all duration-300" style={{ width: `${fakeProgress}%` }} />
                </div>
              </div>
            )}

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            <button
              type="button"
              onClick={analyze}
              disabled={!file || loading}
              className="mt-5 rounded-lg border border-line px-3 py-2 text-muted-foreground hover:text-ink disabled:opacity-40"
            >
              {loading ? "Scanning..." : "Scan Employer Application"}
            </button>
          </>
        )}

        {result && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-line px-4 py-3">
              <div>
                <p className="text-sm text-foreground">Overall completion</p>
                <p className="text-xs text-muted-foreground">
                  {result.totalFilled} of {result.totalFields} fields filled ({result.totalPercent}%)
                </p>
              </div>
              <div className="text-muted-foreground">
                {result.extractionMethod === "hybrid-ai-fallback" ? "Hybrid + AI" : "Form fields"}
              </div>
            </div>

            {nameMismatchWarning && (
              <div className="rounded-xl border border-line bg-soft px-4 py-3 text-ink">
                {nameMismatchWarning}
              </div>
            )}

            <div className="space-y-4">
              {result.sections.map((section, index) => (
                <CollapsiblePanel
                  key={section.id}
                  section={section}
                  index={index}
                  isOpen={openSections.has(section.id)}
                  onToggle={() => toggleSection(section.id)}
                  entranceReady={panelsVisible}
                  reducedMotion={reducedMotion}
                />
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => exportEmployerApplicationToExcel(result)}
                className="rounded-lg border border-line px-3 py-2 text-muted-foreground hover:text-ink"
              >
                Export to Excel
              </button>
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setError("");
                }}
                className="rounded-lg border border-line px-3 py-2 text-muted-foreground hover:text-ink"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>

      <aside className="h-fit rounded-xl border border-line bg-white px-4 py-3 lg:sticky lg:top-6">
        <h3 className="text-ink">Section Summary</h3>
        <p className="mt-1 text-xs text-muted-foreground">Filled fields by section</p>

        <div className="mt-4 space-y-3">
          {sectionSummary.length === 0 && <p className="text-xs text-muted-foreground">Upload and scan a form to see completion stats.</p>}
          {sectionSummary.map((section) => (
            <div key={section.id}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-foreground">{section.title}</span>
                <span className="text-muted-foreground">
                  {section.filled}/{section.total}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded bg-muted">
                <div className="h-full rounded bg-primary" style={{ width: `${section.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
