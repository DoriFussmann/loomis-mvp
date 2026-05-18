"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, ChevronRight,
  LayoutGrid, FileBarChart2, RefreshCw, FileCheck2,
  BookOpen, TrendingUp, Shield, Building2,
  Briefcase, UserCheck, Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppPage, SessionPayload } from "@/lib/types";
import { EmployerApplicationClient } from "@/app/(app)/employer-application/ui-client";
import { ClaimsValidationClient } from "@/app/(app)/claims-validation/ui-client";

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid, FileBarChart2, RefreshCw, FileCheck2,
  BookOpen, TrendingUp, Shield, Building2,
  Briefcase, UserCheck, Layers,
};

const NAV_ITEMS = [
  { label: "Dashboard", icon: "LayoutGrid", active: true },
  { label: "Loss Run Analyzer", icon: "FileBarChart2", slug: "loss-run-analyzer" },
  { label: "Policy Renewal", icon: "RefreshCw" },
  { label: "Claims Management", icon: "FileCheck2" },
  { label: "Client Reports", icon: "BookOpen" },
  { label: "Benchmarking", icon: "TrendingUp" },
  { label: "Compliance", icon: "Shield" },
  { label: "Carrier Insights", icon: "Building2" },
];

export interface DepartmentNavItem {
  label: string;
  icon?: string;
  active?: boolean;
  slug?: string;
  forceLive?: boolean;
}

export interface DepartmentToolCard {
  label: string;
  description: string;
  slug?: string;
  live?: boolean;
  forceLive?: boolean;
}

const ATTENTION_ITEMS = [
  { label: "3 loss runs ready to review", status: "action", done: false },
  { label: "Just Ducky Farms — WC renewal in 42 days", status: "warning", done: false },
  { label: "Construction Masters — auto loss up 3 yrs", status: "alert", done: false },
  { label: "Culver Duck — repeat claimant (P. Mendoza)", status: "warning", done: false },
  { label: "Penn Millers policy review done", status: "done", done: true },
  { label: "Cincinnati GL — frequency increasing", status: "alert", done: false },
  { label: "Q1 benchmarking report distributed", status: "done", done: true },
];

const PLATFORM_CARDS: DepartmentToolCard[] = [
  {
    label: "Loss Run Analyzer",
    description: "Upload a loss run PDF and get a structured report with Excel export.",
    slug: "loss-run-analyzer",
    live: true,
  },
  { label: "Policy Renewal", description: "Track renewals and surface coverage gaps before they become problems.", live: false },
  { label: "Claims Management", description: "Monitor open claims, reserves, and litigation exposure in one place.", live: false },
  { label: "Client Reports", description: "Generate branded, client-ready reports from structured loss data.", live: false },
  { label: "Benchmarking", description: "Compare client loss metrics against industry and peer benchmarks.", live: false },
  { label: "Carrier Insights", description: "Track carrier appetite changes, performance trends, and market shifts.", live: false },
  { label: "Consolidation Tool", description: "Consolidate multi-carrier data into a single unified view for reporting and analysis.", live: false },
];

interface DepartmentDashboardProps {
  session: SessionPayload;
  accessiblePages: AppPage[];
  interactive: boolean;
  showTools?: boolean;
  showNavTools?: boolean;
  navItems?: DepartmentNavItem[];
  platformCards?: DepartmentToolCard[];
}

function DepartmentDashboardInner({
  session,
  accessiblePages,
  interactive,
  showTools = true,
  showNavTools = true,
  navItems = NAV_ITEMS,
  platformCards = PLATFORM_CARDS,
}: DepartmentDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTool = searchParams.get("tool");

  const [collapsed, setCollapsed] = useState(false);
  const [attentionCollapsed, setAttentionCollapsed] = useState(false);

  function navigateTo(slug: string | undefined, isDashboard: boolean) {
    if (isDashboard) {
      router.push("/benefits");
    } else if (slug) {
      router.push(`/benefits?tool=${slug}`);
    }
  }

  return (
    <div className="flex -mx-6 -mt-8">
      {/* Left sidebar */}
      <aside
        className="flex-shrink-0 border-r border-border flex flex-col bg-background transition-[width] duration-200"
        style={{ width: collapsed ? "52px" : "18%" }}
      >
        {/* Collapse toggle */}
        <div className="px-2 pt-6 pb-2 flex" style={{ justifyContent: collapsed ? "center" : "flex-end" }}>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-5 h-5 flex items-center justify-center rounded border border-border bg-background text-muted-foreground shadow-sm"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* Nav items */}
        <nav
          className="flex-1 pb-4 flex flex-col"
          style={{ gap: "0.4rem", padding: collapsed ? "0 0 1rem" : "0 0.5rem 1rem", alignItems: collapsed ? "center" : "stretch" }}
        >
          {navItems.filter((item) => (showNavTools ? true : item.active)).map((item) => {
            const isDashboard = !item.slug && !!item.active;
            const isLive =
              isDashboard ||
              (interactive && ((!!item.slug && accessiblePages.some((p) => p.slug === item.slug)) || item.forceLive === true));
            const isActive = isDashboard ? !activeTool : activeTool === item.slug;

            const Icon = item.icon ? NAV_ICON_MAP[item.icon] : undefined;
            const inner = collapsed ? (
              <div
                title={item.label}
                className={[
                  "w-5 h-5 flex items-center justify-center rounded border transition-colors duration-150",
                  isActive
                    ? "bg-foreground/10 text-foreground border-foreground/30"
                    : "border-border text-foreground hover:bg-muted hover:border-foreground/40",
                ].join(" ")}
                style={{
                  cursor: isLive ? "pointer" : "default",
                  opacity: !isActive && !isLive ? 0.4 : 1,
                }}
              >
                {Icon && <Icon size={10} />}
              </div>
            ) : (
              <div
                className={[
                  "flex items-center gap-2 rounded-md border transition-colors duration-150",
                  isActive
                    ? "bg-foreground/10 text-foreground border-foreground/30"
                    : "border-border text-foreground hover:bg-muted hover:border-foreground/40",
                ].join(" ")}
                style={{
                  padding: "0.45rem 0.75rem",
                  cursor: isLive ? "pointer" : "default",
                  opacity: !isActive && !isLive ? 0.4 : 1,
                }}
              >
                {Icon && <Icon size={11} className="flex-shrink-0 opacity-60" />}
                <span className={["text-xs whitespace-nowrap", isActive ? "font-medium" : "font-light"].join(" ")}>
                  {item.label.toLowerCase()}
                </span>
              </div>
            );

            return isLive ? (
              <button
                key={item.label}
                className="text-left bg-transparent border-0 p-0"
                onClick={() => navigateTo(item.slug, isDashboard)}
              >
                {inner}
              </button>
            ) : (
              <div key={item.label}>{inner}</div>
            );
          })}
        </nav>

      </aside>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 min-w-0 p-6 overflow-y-auto">
          {activeTool === "employer-application" && <EmployerApplicationClient />}
          {activeTool === "claims-validation" && <ClaimsValidationClient />}

          {!activeTool && (
            <>
              <p className="text-[10px] font-medium uppercase tracking-widest text-foreground/40 mb-1.5">
                platform
              </p>
              <h2 className="text-lg font-light text-foreground mb-6">explore the tools</h2>

              {showTools && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", width: "100%" }}>
                  {platformCards.map((card) => {
                    const isLive =
                      interactive &&
                      ((card.live && !!card.slug && accessiblePages.some((p) => p.slug === card.slug)) || card.forceLive === true);
                    const inner = (
                      <div
                        className="border border-border rounded-lg p-4 bg-background transition-colors duration-150"
                        style={{
                          cursor: isLive ? "pointer" : "default",
                          opacity: card.live && !isLive ? 0.5 : 1,
                        width: "100%",
                        height: "100%",
                        boxSizing: "border-box",
                        }}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm font-medium text-foreground">{card.label}</p>
                          {!card.live && !card.forceLive && (
                            <span className="text-[0.6rem] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground tracking-wide uppercase">
                              coming soon
                            </span>
                          )}
                          {isLive && (
                            <span className="text-[0.6rem] font-medium px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground tracking-wide uppercase">
                              live
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
                      </div>
                    );

                    return isLive ? (
                      <button
                        key={card.label}
                        onClick={() => card.slug && router.push(`/benefits?tool=${card.slug}`)}
                        style={{ display: "block", width: "100%", height: "100%", textAlign: "left", background: "none", border: "none", padding: 0 }}
                      >
                        {inner}
                      </button>
                    ) : (
                      <div key={card.label} style={{ width: "100%", height: "100%" }}>{inner}</div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </main>

        {/* Needs attention panel */}
        <aside
          className="flex-shrink-0 border-l border-border flex flex-col bg-background transition-[width] duration-200"
          style={{ width: attentionCollapsed ? "36px" : "30%" }}
        >
          {/* Collapse toggle */}
          <div className="px-2 pt-6 pb-2 flex justify-end">
            <button
              onClick={() => setAttentionCollapsed((c) => !c)}
              className="w-5 h-5 flex items-center justify-center rounded border border-border bg-background text-muted-foreground shadow-sm flex-shrink-0"
              aria-label={attentionCollapsed ? "Expand panel" : "Collapse panel"}
            >
              {attentionCollapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
            </button>
          </div>

          {!attentionCollapsed && (
            <div className="px-8 pb-8 overflow-y-auto flex-1">
              <p className="text-sm font-medium text-foreground mb-5">needs attention</p>
              <p className="text-[10px] font-medium uppercase tracking-widest text-foreground/40 mb-3">
                checklist
              </p>

              <div className="flex flex-col gap-1.5">
                {ATTENTION_ITEMS.map((item, i) => {
                  const dotColor = item.done
                    ? "hsl(var(--muted-foreground))"
                    : item.status === "alert"
                      ? "rgb(220, 60, 40)"
                      : item.status === "warning"
                        ? "rgb(200, 130, 20)"
                        : "hsl(var(--primary))";

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-md"
                      style={{
                        border: `1px solid ${item.done ? "transparent" : "hsl(var(--border))"}`,
                        opacity: item.done ? 0.45 : 1,
                      }}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{
                          border: `2px solid ${dotColor}`,
                          background: item.done ? dotColor : "transparent",
                        }}
                      >
                        {item.done && <span className="text-background text-[0.5rem]">✓</span>}
                      </div>
                      <p
                        className="text-xs text-foreground truncate min-w-0"
                        style={{ textDecoration: item.done ? "line-through" : "none" }}
                      >
                        {item.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export function DepartmentDashboard(props: DepartmentDashboardProps) {
  return (
    <Suspense>
      <DepartmentDashboardInner {...props} />
    </Suspense>
  );
}
