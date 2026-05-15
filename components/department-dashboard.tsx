"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { AppPage, SessionPayload } from "@/lib/types";

// Nav items for the left sidebar (decorative except live items when interactive)
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
    <div style={{ minHeight: "100vh", background: "hsl(var(--background))", fontFamily: "inherit" }}>
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          minHeight: "100vh",
          display: "flex",
        }}
      >
        <aside
          style={{
            width: collapsed ? "52px" : "18%",
            flexShrink: 0,
            borderRight: "1px solid hsl(var(--border))",
            display: "flex",
            flexDirection: "column",
            padding: "1.5rem 0",
            background: "hsl(var(--background))",
            transition: "width 0.2s ease",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {/* Toggle chevron */}

          <div style={{ padding: collapsed ? "0 0 1.5rem" : "0 1.25rem 1.5rem", borderBottom: "1px solid hsl(var(--border))" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: collapsed ? "center" : "flex-start" }}>
              <div
                style={{
                  width: "28px",
                  height: "28px",
                  borderRadius: "6px",
                  background: "hsl(var(--primary))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ color: "hsl(var(--primary-foreground))", fontSize: "0.75rem", fontWeight: 700 }}>L</span>
              </div>
              {!collapsed && (
                <span style={{ fontSize: "0.9rem", fontWeight: 600, color: "hsl(var(--foreground))", whiteSpace: "nowrap" }}>Loomis AI</span>
              )}
            </div>
          </div>

          <nav style={{ flex: 1, padding: "1rem 0.5rem", display: "flex", flexDirection: "column", gap: "0.15rem" }}>
            {navItems.filter((item) => (showNavTools ? true : item.active)).map((item) => {
              const isLive =
                interactive && ((!!item.slug && accessiblePages.some((p) => p.slug === item.slug)) || item.forceLive === true);
              const isActive = item.active;

              const inner = (
                <div
                  title={collapsed ? item.label : undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: collapsed ? "center" : "flex-start",
                    gap: "0.6rem",
                    padding: collapsed ? "0.45rem" : "0.45rem 0.75rem",
                    borderRadius: "0.375rem",
                    background: isActive ? "hsl(var(--primary))" : "transparent",
                    cursor: isLive ? "pointer" : "default",
                    opacity: !isActive && !isLive ? 0.45 : 1,
                    transition: "background 0.15s",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                      flexShrink: 0,
                    }}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span
                      style={{
                        fontSize: "0.8rem",
                        fontWeight: isActive ? 600 : 400,
                        color: isActive ? "hsl(var(--primary-foreground))" : "hsl(var(--foreground))",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}
                    </span>
                  )}
                </div>
              );

              return isLive ? (
                <Link key={item.label} href={`/${item.slug}`} style={{ textDecoration: "none" }}>
                  {inner}
                </Link>
              ) : (
                <div key={item.label}>{inner}</div>
              );
            })}
          </nav>

          <div style={{ padding: "0.5rem 0.5rem 0.5rem", display: "flex", justifyContent: collapsed ? "center" : "flex-start" }}>
            <button
              onClick={() => setCollapsed((c) => !c)}
              style={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                cursor: "pointer",
                padding: "0.2rem",
                color: "hsl(var(--muted-foreground))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "0.3rem",
                width: "20px",
                height: "20px",
                boxShadow: "0 1px 3px hsl(var(--border))",
              }}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>
          </div>

          <div
            style={{
              padding: collapsed ? "1rem 0 0" : "1rem 1.25rem 0",
              borderTop: "1px solid hsl(var(--border))",
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "space-between",
            }}
          >
            {!collapsed && (
              <div>
                <p style={{ fontSize: "0.78rem", fontWeight: 500, color: "hsl(var(--foreground))", whiteSpace: "nowrap" }}>{session.name ?? session.email}</p>
                <p style={{ fontSize: "0.7rem", color: "hsl(var(--muted-foreground))", whiteSpace: "nowrap" }}>{session.email}</p>
              </div>
            )}
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                title="Sign out"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  color: "hsl(var(--muted-foreground))",
                  padding: "0.25rem",
                }}
              >
                →
              </button>
            </form>
          </div>
        </aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <header
            style={{
              borderBottom: "1px solid hsl(var(--border))",
              padding: "0.875rem 2rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "hsl(var(--background))",
            }}
          >
            <p style={{ fontSize: "0.82rem", color: "hsl(var(--muted-foreground))" }}>
              Good morning, <span style={{ fontWeight: 600, color: "hsl(var(--foreground))" }}>{session.name ?? "Sarah"}</span>
            </p>
            <p style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground))" }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </header>

          <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
            <main style={{ flex: 1, padding: "2rem", overflowY: "auto" }}>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "0.35rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  fontWeight: 600,
                }}
              >
                Platform
              </p>
              <h2 style={{ fontSize: "1.1rem", fontWeight: 600, color: "hsl(var(--foreground))", marginBottom: "1.5rem" }}>Explore the tools</h2>

              {showTools && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  {platformCards.map((card) => {
                    const isLive =
                      interactive &&
                      ((card.live && !!card.slug && accessiblePages.some((p) => p.slug === card.slug)) || card.forceLive === true);
                    const inner = (
                      <div
                        style={{
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.5rem",
                          padding: "1rem 1.25rem",
                          background: "hsl(var(--background))",
                          cursor: isLive ? "pointer" : "default",
                          opacity: card.live && !isLive ? 0.5 : 1,
                          transition: "border-color 0.15s",
                          position: "relative",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
                          <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "hsl(var(--foreground))" }}>{card.label}</p>
                          {!card.live && (
                            <span
                              style={{
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                padding: "0.1rem 0.4rem",
                                borderRadius: "999px",
                                background: "hsl(var(--muted))",
                                color: "hsl(var(--muted-foreground))",
                                letterSpacing: "0.05em",
                              }}
                            >
                              COMING SOON
                            </span>
                          )}
                          {isLive && (
                            <span
                              style={{
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                padding: "0.1rem 0.4rem",
                                borderRadius: "999px",
                                background: "hsl(var(--primary))",
                                color: "hsl(var(--primary-foreground))",
                                letterSpacing: "0.05em",
                              }}
                            >
                              LIVE
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: "0.78rem", color: "hsl(var(--muted-foreground))", lineHeight: 1.5 }}>{card.description}</p>
                      </div>
                    );

                    return isLive ? (
                      <Link key={card.label} href={`/${card.slug}`} style={{ textDecoration: "none" }}>
                        {inner}
                      </Link>
                    ) : (
                      <div key={card.label}>{inner}</div>
                    );
                  })}
                </div>
              )}
            </main>

            <aside
              style={{
                width: "30%",
                flexShrink: 0,
                borderLeft: "1px solid hsl(var(--border))",
                padding: "2rem 1.5rem",
                overflowY: "auto",
                background: "hsl(var(--background))",
              }}
            >
              <p style={{ fontSize: "0.875rem", fontWeight: 700, color: "hsl(var(--foreground))", marginBottom: "1.25rem" }}>Needs Attention</p>
              <p
                style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "hsl(var(--muted-foreground))",
                  marginBottom: "0.75rem",
                }}
              >
                Checklist
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
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
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0.6rem",
                        padding: "0.5rem 0.6rem",
                        borderRadius: "0.375rem",
                        background: "transparent",
                        border: `1px solid ${item.done ? "transparent" : "hsl(var(--border))"}`,
                        opacity: item.done ? 0.45 : 1,
                      }}
                    >
                      <div
                        style={{
                          width: "14px",
                          height: "14px",
                          borderRadius: "50%",
                          border: `2px solid ${dotColor}`,
                          flexShrink: 0,
                          marginTop: "1px",
                          background: item.done ? dotColor : "transparent",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {item.done && <span style={{ color: "hsl(var(--background))", fontSize: "0.5rem" }}>✓</span>}
                      </div>
                      <p
                        style={{
                          fontSize: "0.78rem",
                          color: "hsl(var(--foreground))",
                          lineHeight: 1.4,
                          textDecoration: item.done ? "line-through" : "none",
                        }}
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
      </div>
    </div>
  );
}
