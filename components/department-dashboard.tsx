"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft, ChevronRight,
  LayoutGrid, FileBarChart2, RefreshCw, FileCheck2,
  BookOpen, TrendingUp, Shield, Building2,
  Briefcase, UserCheck, Layers, Calculator,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppPage, SessionPayload } from "@/lib/types";
import { EmployerApplicationClient } from "@/app/(app)/employer-application/ui-client";
import { ClaimsValidationClient } from "@/app/(app)/claims-validation/ui-client";
import { GapQuoteClient } from "@/app/(app)/gap-quote/ui-client";

const NAV_ICON_MAP: Record<string, LucideIcon> = {
  LayoutGrid, FileBarChart2, RefreshCw, FileCheck2,
  BookOpen, TrendingUp, Shield, Building2,
  Briefcase, UserCheck, Layers, Calculator,
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
  heading?: boolean;
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
      setCollapsed(true);
      setAttentionCollapsed(true);
      router.push(`/benefits?tool=${slug}`);
    }
  }

  return (
    <div className="-mx-8 -my-6 flex min-h-0 flex-1">
      <aside
        className="flex flex-shrink-0 flex-col border-r border-line bg-white p-3 transition-[width] duration-200"
        style={{ width: collapsed ? "52px" : "208px" }}
      >
        <div className="mb-3 flex" style={{ justifyContent: collapsed ? "center" : "flex-end" }}>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex h-5 w-5 items-center justify-center rounded-lg border border-line bg-white text-muted-foreground hover:text-ink"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        <nav
          className="flex flex-1 flex-col gap-3"
          style={{ alignItems: collapsed ? "center" : "stretch" }}
        >
          {navItems.filter((item) => (showNavTools ? true : item.active || item.heading)).map((item) => {
            if (item.heading) {
              if (collapsed) return <div key={item.label} className="h-2" />;
              return (
                <p key={item.label} className="px-3 pt-1 text-muted-foreground">
                  {item.label}
                </p>
              );
            }
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
                  "flex h-8 w-8 items-center justify-center rounded-lg border border-line",
                  isActive
                    ? "bg-soft text-ink"
                    : "text-muted-foreground hover:bg-soft hover:text-ink",
                ].join(" ")}
                style={{
                  cursor: isLive ? "pointer" : "default",
                  opacity: !isActive && !isLive ? 0.4 : 1,
                }}
              >
                {Icon && <Icon size={14} />}
              </div>
            ) : (
              <div
                className={[
                  "flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-left",
                  isActive
                    ? "bg-soft text-ink"
                    : "text-muted-foreground hover:bg-soft hover:text-ink",
                ].join(" ")}
                style={{
                  cursor: isLive ? "pointer" : "default",
                  opacity: !isActive && !isLive ? 0.4 : 1,
                }}
              >
                {Icon && <Icon size={14} className="flex-shrink-0" />}
                <span className="whitespace-nowrap">{item.label}</span>
              </div>
            );

            return isLive ? (
              <button
                key={item.label}
                className="w-full bg-transparent p-0 text-left"
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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="scroll-thin min-w-0 flex-1 overflow-y-auto px-8 py-6">
          {activeTool === "employer-application" && <EmployerApplicationClient />}
          {activeTool === "claims-validation" && <ClaimsValidationClient />}
          {activeTool === "gap-quote" && <GapQuoteClient />}

          {!activeTool && (
            <>
              <h2 className="mb-6 text-[15px] text-ink">Explore the Tools</h2>

              {showTools && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem", width: "100%" }}>
                  {platformCards.map((card) => {
                    const isLive =
                      interactive &&
                      ((card.live && !!card.slug && accessiblePages.some((p) => p.slug === card.slug)) || card.forceLive === true);
                    const inner = (
                      <div
                        className="rounded-xl border border-line bg-white px-4 py-3 hover:bg-soft"
                        style={{
                          cursor: isLive ? "pointer" : "default",
                          opacity: card.live && !isLive ? 0.5 : 1,
                          width: "100%",
                          height: "100%",
                          boxSizing: "border-box",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-ink">{card.label}</p>
                          {!card.live && !card.forceLive && (
                            <span className="text-muted-foreground">soon</span>
                          )}
                          {isLive && (
                            <span className="text-accent">live</span>
                          )}
                        </div>
                      </div>
                    );

                    return isLive ? (
                      <button
                        key={card.label}
                        onClick={() => { if (card.slug) { setCollapsed(true); setAttentionCollapsed(true); router.push(`/benefits?tool=${card.slug}`); } }}
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

        <aside
          className="flex flex-shrink-0 flex-col border-l border-line bg-white transition-[width] duration-200"
          style={{ width: attentionCollapsed ? "36px" : "30%" }}
        >
          <div className="flex justify-end p-3">
            <button
              onClick={() => setAttentionCollapsed((c) => !c)}
              className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-lg border border-line bg-white text-muted-foreground hover:text-ink"
              aria-label={attentionCollapsed ? "Expand panel" : "Collapse panel"}
            >
              {attentionCollapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
            </button>
          </div>

          {!attentionCollapsed && (
            <div className="scroll-thin flex-1 overflow-y-auto px-4 pb-6">
              <p className="mb-4 text-ink">Needs Attention</p>

              <div className="flex flex-col gap-3">
                {ATTENTION_ITEMS.map((item, i) => {
                  const dotColor = item.done
                    ? "#6a9a78"
                    : item.status === "alert" || item.status === "action"
                      ? "#2f5eff"
                      : "#8a8a8a";

                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 rounded-lg border px-3 py-2"
                      style={{
                        borderColor: item.done ? "transparent" : "#e6e6e6",
                        opacity: item.done ? 0.45 : 1,
                      }}
                    >
                      <div
                        className="flex h-3.5 w-3.5 flex-shrink-0 items-center justify-center rounded-full"
                        style={{
                          border: `1px solid ${dotColor}`,
                          background: item.done ? dotColor : "transparent",
                        }}
                      >
                        {item.done && <span className="text-[0.5rem] text-white">✓</span>}
                      </div>
                      <p
                        className="min-w-0 truncate text-ink"
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
