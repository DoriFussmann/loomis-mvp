"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AppPage, SessionPayload } from "@/lib/types";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "⊞", active: true },
  { label: "Loss Run Analyzer", icon: "⬡", slug: "loss-run-analyzer" },
  { label: "Policy Renewal", icon: "↻" },
  { label: "Claims Management", icon: "≡" },
  { label: "Client Reports", icon: "↗" },
  { label: "Benchmarking", icon: "◈" },
  { label: "Compliance", icon: "◉" },
  { label: "Carrier Insights", icon: "◎" },
];

export interface DepartmentNavItem {
  label: string;
  icon: string;
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
  { label: "3 loss runs uploaded — reports ready to review", status: "action", done: false },
  { label: "Just Ducky Farms WC renewal due in 42 days", status: "warning", done: false },
  { label: "Construction Masters auto loss trend — 3 consecutive years up", status: "alert", done: false },
  { label: "Culver Duck Farms — repeat claimant flagged (Pedro Mendoza)", status: "warning", done: false },
  { label: "Penn Millers policy review completed", status: "done", done: true },
  { label: "Cincinnati package loss run — GL frequency increasing", status: "alert", done: false },
  { label: "Q1 benchmarking report ready for distribution", status: "done", done: true },
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

export function DepartmentDashboard({
  session,
  accessiblePages,
  interactive,
  showTools = true,
  showNavTools = true,
  navItems = NAV_ITEMS,
  platformCards = PLATFORM_CARDS,
}: DepartmentDashboardProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex -mx-6 -mt-8">
      {/* Left sidebar */}
      <aside
        className="flex-shrink-0 border-r border-border flex flex-col py-6 bg-background transition-[width] duration-200"
        style={{ width: collapsed ? "52px" : "18%" }}
      >
        {/* Logo mark */}
        <div
          className="border-b border-border pb-6"
          style={{ padding: collapsed ? "0 0 1.5rem" : "0 1.25rem 1.5rem" }}
        >
          <div
            className="flex items-center gap-2"
            style={{ justifyContent: collapsed ? "center" : "flex-start" }}
          >
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground text-xs font-bold">L</span>
            </div>
            {!collapsed && (
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">Loomis AI</span>
            )}
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-4 flex flex-col" style={{ gap: "0.15rem" }}>
          {navItems.filter((item) => (showNavTools ? true : item.active)).map((item) => {
            const isLive =
              interactive && ((!!item.slug && accessiblePages.some((p) => p.slug === item.slug)) || item.forceLive === true);
            const isActive = item.active;

            const inner = (
              <div
                title={collapsed ? item.label : undefined}
                className="flex items-center rounded-md transition-colors duration-150"
                style={{
                  justifyContent: collapsed ? "center" : "flex-start",
                  gap: "0.6rem",
                  padding: collapsed ? "0.45rem" : "0.45rem 0.75rem",
                  background: isActive ? "hsl(var(--primary))" : "transparent",
                  cursor: isLive ? "pointer" : "default",
                  opacity: !isActive && !isLive ? 0.45 : 1,
                }}
              >
                <span
                  className="text-xs flex-shrink-0"
                  style={{ color: isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))" }}
                >
                  {item.icon}
                </span>
                {!collapsed && (
                  <span
                    className="whitespace-nowrap"
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </div>
            );

            return isLive ? (
              <Link key={item.label} href={`/${item.slug}`} className="no-underline">
                {inner}
              </Link>
            ) : (
              <div key={item.label}>{inner}</div>
            );
          })}
        </nav>

        {/* Collapse toggle */}
        <div
          className="px-2 pb-2 flex"
          style={{ justifyContent: collapsed ? "center" : "flex-start" }}
        >
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="w-5 h-5 flex items-center justify-center rounded border border-border bg-background text-muted-foreground shadow-sm"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
          </button>
        </div>

        {/* User + logout */}
        <div
          className="border-t border-border pt-4 flex items-center"
          style={{
            padding: collapsed ? "1rem 0 0" : "1rem 1.25rem 0",
            justifyContent: collapsed ? "center" : "space-between",
          }}
        >
          {!collapsed && (
            <div>
              <p className="text-xs font-medium text-foreground whitespace-nowrap">{session.name ?? session.email}</p>
              <p className="text-xs text-muted-foreground whitespace-nowrap">{session.email}</p>
            </div>
          )}
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              title="Sign out"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-200 p-1"
              style={{ background: "transparent", border: "none", cursor: "pointer" }}
            >
              →
            </button>
          </form>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        <main className="flex-1 p-8 overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1.5">
            Platform
          </p>
          <h2 className="text-lg font-semibold text-foreground mb-6">Explore the tools</h2>

          {showTools && (
            <div className="grid grid-cols-2 gap-3">
              {platformCards.map((card) => {
                const isLive =
                  interactive &&
                  ((card.live && !!card.slug && accessiblePages.some((p) => p.slug === card.slug)) || card.forceLive === true);
                const inner = (
                  <div
                    className="border border-border rounded-lg p-4 bg-background transition-colors duration-150 relative"
                    style={{
                      cursor: isLive ? "pointer" : "default",
                      opacity: card.live && !isLive ? 0.5 : 1,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-semibold text-foreground">{card.label}</p>
                      {!card.live && (
                        <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground tracking-wide uppercase">
                          Coming Soon
                        </span>
                      )}
                      {isLive && (
                        <span className="text-[0.6rem] font-bold px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground tracking-wide uppercase">
                          Live
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{card.description}</p>
                  </div>
                );

                return isLive ? (
                  <Link key={card.label} href={`/${card.slug}`} className="no-underline">
                    {inner}
                  </Link>
                ) : (
                  <div key={card.label}>{inner}</div>
                );
              })}
            </div>
          )}
        </main>

        {/* Needs attention panel */}
        <aside className="w-[30%] flex-shrink-0 border-l border-border p-8 overflow-y-auto bg-background">
          <p className="text-sm font-bold text-foreground mb-5">Needs Attention</p>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">
            Checklist
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
                  className="flex items-start gap-2.5 px-2.5 py-2 rounded-md"
                  style={{
                    border: `1px solid ${item.done ? "transparent" : "hsl(var(--border))"}`,
                    opacity: item.done ? 0.45 : 1,
                  }}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center"
                    style={{
                      border: `2px solid ${dotColor}`,
                      background: item.done ? dotColor : "transparent",
                    }}
                  >
                    {item.done && <span className="text-background text-[0.5rem]">✓</span>}
                  </div>
                  <p
                    className="text-xs text-foreground leading-snug"
                    style={{ textDecoration: item.done ? "line-through" : "none" }}
                  >
                    {item.label}
                  </p>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
