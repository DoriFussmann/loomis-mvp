'use client'

import { useState, useRef } from 'react'
import { exportToExcel } from '@/lib/exportToExcel'

// ── Types ─────────────────────────────────────────────────────────────────────

interface LossSummary {
  total_claims: number | null
  open_claims: number | null
  closed_claims: number | null
  total_paid: number | null
  total_reserves: number | null
  total_incurred: number | null
  avg_cost_per_claim: number | null
}

interface ByYear {
  year: string
  claim_count: number
  total_paid: number
  total_reserves: number
  total_incurred: number
  open_claims: number | null
  closed_claims: number | null
}

interface Cause {
  cause: string
  claim_count: number
  total_incurred: number
}

interface ByCoverageLine {
  line: string
  claim_count: number
  total_incurred: number
  top_causes: Cause[]
}

interface LargeClaim {
  claimant?: string
  loss_date: string
  cause?: string
  description?: string
  body_part?: string | null
  total_incurred: number
  status?: string
}

interface WCDetail {
  financials: {
    indemnity: { paid: number | null; reserve: number | null; total: number | null }
    medical: { paid: number | null; reserve: number | null; total: number | null }
    expense: { paid: number | null; reserve: number | null; total: number | null }
  } | null
  claim_type_split: {
    indemnity_count: number | null
    medical_only_count: number | null
    incident_only_count: number | null
  } | null
  litigated_claims: {
    count: number | null
    total_incurred: number | null
  } | null
  reporting_lag: {
    avg_days: number | null
    within_3_days: number | null
    days_4_to_10: number | null
    days_11_plus: number | null
    note: string | null
  } | null
  injury_breakdown: Array<{
    cause: string
    body_parts: string[]
    claim_count: number
    total_incurred: number
    avg_cost: number
  }>
  top_body_parts: Array<{ body_part: string; claim_count: number; total_incurred: number }>
  by_age_at_injury: Array<{ age_bracket: string; claim_count: number; total_incurred: number }>
  by_day_of_week: Array<{ day: string; claim_count: number; total_incurred: number }>
  by_month: Array<{ month: string; claim_count: number; total_incurred: number }>
  by_state: Array<{ state: string; claim_count: number; total_incurred: number }>
  by_department: Array<{ department: string; claim_count: number; total_incurred: number }>
  repeat_claimants: Array<{ claimant: string; claim_count: number; total_incurred: number }>
  open_vs_closed: {
    open_count: number | null
    closed_count: number | null
    open_incurred: number | null
    closed_incurred: number | null
  } | null
  large_claims: Array<{
    claimant: string
    loss_date: string
    cause: string
    body_part: string | null
    total_incurred: number
    status: string
    claim_type: string | null
  }>
  summary: string
}

interface AutoGLDetail {
  reporting_lag: { avg_days: number | null; note: string | null } | null
  by_coverage_type: Array<{ coverage_type: string; claim_count: number; total_incurred: number }>
  loss_types: Array<{ loss_type: string; claim_count: number; total_incurred: number }>
  by_location: Array<{ location: string; claim_count: number; total_incurred: number }>
  large_claims: Array<{
    loss_date: string
    description: string
    claimant: string | null
    coverage_type: string | null
    total_incurred: number
    status: string
  }>
  summary: string
}

interface Report {
  insured_name: string | null
  carrier: string | null
  valued_as_of: string | null
  coverage_lines: string[]
  loss_summary: LossSummary | null
  by_year: ByYear[]
  by_coverage_line: ByCoverageLine[]
  wc_detail: WCDetail | null
  auto_gl_detail: AutoGLDetail | null
  observations: string[]
  data_quality_notes: string | null
}

interface Classifier {
  insured_name: string | null
  carrier: string | null
  document_format: string
  coverage_lines: string[]
  policy_years: string[]
  valued_as_of: string | null
  total_claim_count_approximate: number | null
  notes: string
}

interface AnalysisResult {
  classifier: Classifier
  report: Report
  meta: {
    clientName: string | null
    clientCompany: string | null
    analyzedAt: string
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const h = (v: string) => `hsl(${v})`

const C = {
  bg:           'hsl(var(--background))',
  fg:           'hsl(var(--foreground))',
  muted:        'hsl(var(--muted))',
  mutedFg:      'hsl(var(--muted-foreground))',
  border:       'hsl(var(--border))',
  primary:      'hsl(var(--primary))',
  primaryFg:    'hsl(var(--primary-foreground))',
  input:        'hsl(var(--input))',
}

function fmt$(n: number | null): string {
  if (n == null) return '—'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtN(n: number | null): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US')
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function lineBadge(line: string) {
  const map: Record<string, string> = {
    workers_comp: 'WC',
    auto: 'AUTO',
    general_liability: 'GL',
    property: 'PROP',
    umbrella: 'UMB',
    other: 'OTHER',
  }
  return map[line] ?? line.toUpperCase()
}

function lineLabel(line: string) {
  const map: Record<string, string> = {
    workers_comp: 'Workers Compensation',
    auto: 'Auto',
    general_liability: 'General Liability',
    property: 'Property',
    umbrella: 'Umbrella',
    other: 'Other',
  }
  return map[line] ?? line
}

// ── Components ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div
      style={{
        background: C.muted,
        border: `1px solid ${C.border}`,
        borderRadius: '0.5rem',
        padding: '1rem',
      }}
    >
      <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mutedFg, marginBottom: '0.25rem' }}>
        {label}
      </p>
      <p style={{ fontSize: '1.5rem', color: C.fg, lineHeight: 1.2 }}>
        {value}
      </p>
      {sub && (
        <p style={{ fontSize: '0.75rem', color: C.mutedFg, marginTop: '0.25rem' }}>{sub}</p>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <h3
        style={{
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          color: C.mutedFg,
          borderBottom: `1px solid ${C.border}`,
          paddingBottom: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

function BarChart({ data }: { data: ByYear[] }) {
  const max = Math.max(...data.map((d) => d.total_incurred), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
      {data.map((row) => (
        <div key={row.year} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 110px', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: C.mutedFg, textAlign: 'right' }}>{row.year}</span>
          <div style={{ height: '1.5rem', background: C.border, borderRadius: '0.25rem', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(row.total_incurred / max) * 100}%`,
                background: C.primary,
                borderRadius: '0.25rem',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: C.fg }}>{fmt$(row.total_incurred)}</span>
        </div>
      ))}
    </div>
  )
}

function Table({
  headers,
  rows,
}: {
  headers: string[]
  rows: (string | React.ReactNode)[][]
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                style={{
                  textAlign: 'left',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.7rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: C.mutedFg,
                  borderBottom: `2px solid ${C.border}`,
                  whiteSpace: 'nowrap',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              style={{
                borderBottom: `1px solid ${C.border}`,
                background: i % 2 === 0 ? 'transparent' : C.muted,
              }}
            >
              {row.map((cell, j) => (
                <td
                  key={j}
                  style={{
                    padding: '0.6rem 0.75rem',
                    color: C.fg,
                    verticalAlign: 'top',
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Badge({ text, variant = 'default' }: { text: string; variant?: 'default' | 'open' | 'closed' | 'line' }) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: C.muted, color: C.mutedFg },
    open:    { background: 'rgba(234,88,12,0.12)', color: 'rgb(194,65,12)' },
    closed:  { background: 'rgba(22,163,74,0.12)', color: 'rgb(15,118,54)' },
    line:    { background: C.primary, color: C.primaryFg },
  }
  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: '0.7rem',
        padding: '0.15rem 0.5rem',
        borderRadius: '999px',
        ...styles[variant],
      }}
    >
      {text}
    </span>
  )
}

// ── Report ────────────────────────────────────────────────────────────────────

function ReportView({ result }: { result: AnalysisResult }) {
  const { report } = result
  const ls = report.loss_summary

  const allLargeClaims = [
    ...(report.wc_detail?.large_claims ?? []),
    ...(report.auto_gl_detail?.large_claims ?? []),
  ].sort((a, b) => b.total_incurred - a.total_incurred)

  return (
    <div>
      {/* Header banner */}
      <div
        style={{
          background: C.primary,
          color: C.primaryFg,
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        <div>
          <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.7, marginBottom: '0.25rem' }}>
            Loss Run Analysis
          </p>
          <h2 style={{ fontSize: '1.4rem', margin: 0 }}>
            {report.insured_name ?? 'Unknown Insured'}
          </h2>
          <p style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '0.2rem' }}>
            {report.carrier}
          </p>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: '0.65rem', opacity: 0.7, marginBottom: '0.15rem' }}>Valued as of</p>
          <p style={{ fontSize: '0.9rem' }}>{report.valued_as_of ?? '—'}</p>
          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {report.coverage_lines.map((l) => (
              <span
                key={l}
                style={{
                  fontSize: '0.65rem',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '999px',
                  background: 'rgba(255,255,255,0.18)',
                  letterSpacing: '0.05em',
                }}
              >
                {lineBadge(l)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Summary cards */}
      {ls && (
        <Section title="Loss Summary">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <StatCard
              label="Total Claims"
              value={fmtN(ls.total_claims)}
              sub={ls.open_claims != null ? `${ls.open_claims} open · ${ls.closed_claims ?? 0} closed` : undefined}
            />
            <StatCard label="Total Incurred" value={fmt$(ls.total_incurred)} />
            <StatCard label="Total Paid" value={fmt$(ls.total_paid)} />
            <StatCard label="Avg Cost / Claim" value={fmt$(ls.avg_cost_per_claim)} />
          </div>
          {ls.total_reserves != null && ls.total_reserves > 0 && (
            <p style={{ fontSize: '0.8rem', color: C.mutedFg }}>
              Outstanding reserves:{' '}
              <span style={{ color: C.fg }}>{fmt$(ls.total_reserves)}</span>
            </p>
          )}
        </Section>
      )}

      {/* By year */}
      {report.by_year?.length > 0 && (
        <Section title="Losses by Policy Year">
          <BarChart data={report.by_year} />
          <Table
            headers={['Year', 'Claims', 'Total Paid', 'Reserves', 'Total Incurred']}
            rows={report.by_year.map((row) => [
              <span>{row.year}</span>,
              fmtN(row.claim_count),
              fmt$(row.total_paid),
              fmt$(row.total_reserves),
              <span>{fmt$(row.total_incurred)}</span>,
            ])}
          />
        </Section>
      )}

      {/* By coverage line */}
      {report.by_coverage_line?.length > 0 && (
        <Section title="By Coverage Line">
          {report.by_coverage_line.map((line) => (
            <div
              key={line.line}
              style={{
                border: `1px solid ${C.border}`,
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Badge text={lineBadge(line.line)} variant="line" />
                  <span style={{ fontSize: '0.9rem', color: C.fg }}>{lineLabel(line.line)}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.85rem', color: C.fg }}>{fmt$(line.total_incurred)}</span>
                  <span style={{ fontSize: '0.75rem', color: C.mutedFg, marginLeft: '0.5rem' }}>{line.claim_count} claims</span>
                </div>
              </div>
              {line.top_causes?.length > 0 && (
                <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '0.5rem' }}>
                  {line.top_causes.map((c) => (
                    <div
                      key={c.cause}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.78rem',
                        color: C.mutedFg,
                        padding: '0.2rem 0',
                      }}
                    >
                      <span>{c.cause}</span>
                      <span style={{ fontWeight: 500, color: C.fg }}>
                        {c.claim_count} · {fmt$(c.total_incurred)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* WC detail */}
      {report.wc_detail && (
        <Section title="Workers Compensation Detail">
          {/* Summary */}
          <p style={{ fontSize: '0.85rem', color: C.mutedFg, marginBottom: '1.5rem', lineHeight: 1.6 }}>
            {report.wc_detail.summary}
          </p>

          {/* Financials */}
          {report.wc_detail.financials && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mutedFg, marginBottom: '0.75rem' }}>Financials</p>
              <Table
                headers={['Type', 'Paid', 'Reserve', 'Total']}
                rows={[
                  ['Indemnity', fmt$(report.wc_detail.financials.indemnity?.paid), fmt$(report.wc_detail.financials.indemnity?.reserve), <span style={{ fontWeight: 700 }}>{fmt$(report.wc_detail.financials.indemnity?.total)}</span>],
                  ['Medical', fmt$(report.wc_detail.financials.medical?.paid), fmt$(report.wc_detail.financials.medical?.reserve), <span style={{ fontWeight: 700 }}>{fmt$(report.wc_detail.financials.medical?.total)}</span>],
                  ['Expense', fmt$(report.wc_detail.financials.expense?.paid), fmt$(report.wc_detail.financials.expense?.reserve), <span style={{ fontWeight: 700 }}>{fmt$(report.wc_detail.financials.expense?.total)}</span>],
                ]}
              />
            </div>
          )}

          {/* Claim type split + Litigated */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {report.wc_detail.claim_type_split && (
              <div style={{ border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '1rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mutedFg, marginBottom: '0.5rem' }}>Claim Types</p>
                {[
                  ['Indemnity', report.wc_detail.claim_type_split.indemnity_count],
                  ['Medical Only', report.wc_detail.claim_type_split.medical_only_count],
                  ['Incident Only', report.wc_detail.claim_type_split.incident_only_count],
                ].map(([label, val]) => (
                  <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.2rem 0', borderBottom: `1px solid ${C.border}` }}>
                    <span style={{ color: C.mutedFg }}>{label}</span>
                    <span style={{ fontWeight: 600, color: C.fg }}>{val ?? '—'}</span>
                  </div>
                ))}
              </div>
            )}
            {report.wc_detail.litigated_claims && (
              <div style={{ border: `1px solid ${C.border}`, borderRadius: '0.5rem', padding: '1rem' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mutedFg, marginBottom: '0.5rem' }}>Litigated Claims</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.2rem 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ color: C.mutedFg }}>Count</span>
                  <span style={{ fontWeight: 600, color: C.fg }}>{report.wc_detail.litigated_claims.count ?? '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', padding: '0.2rem 0' }}>
                  <span style={{ color: C.mutedFg }}>Total Incurred</span>
                  <span style={{ fontWeight: 600, color: C.fg }}>{fmt$(report.wc_detail.litigated_claims.total_incurred)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Reporting lag */}
          {report.wc_detail.reporting_lag && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mutedFg, marginBottom: '0.75rem' }}>Reporting Lag</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
                {[
                  ['0–3 Days', report.wc_detail.reporting_lag.within_3_days],
                  ['4–10 Days', report.wc_detail.reporting_lag.days_4_to_10],
                  ['11+ Days', report.wc_detail.reporting_lag.days_11_plus],
                ].map(([label, val]) => (
                  <div key={label as string} style={{ background: C.muted, border: `1px solid ${C.border}`, borderRadius: '0.375rem', padding: '0.6rem 0.75rem', textAlign: 'center' }}>
                    <p style={{ fontSize: '1.2rem', fontWeight: 700, color: C.fg }}>{val ?? '—'}</p>
                    <p style={{ fontSize: '0.7rem', color: C.mutedFg }}>{label}</p>
                  </div>
                ))}
              </div>
              {report.wc_detail.reporting_lag.avg_days != null && (
                <p style={{ fontSize: '0.8rem', color: C.mutedFg }}>
                  Avg days to report: <span style={{ fontWeight: 600, color: C.fg }}>{report.wc_detail.reporting_lag.avg_days}</span>
                </p>
              )}
              {report.wc_detail.reporting_lag.note && (
                <p style={{ fontSize: '0.8rem', color: C.mutedFg, marginTop: '0.25rem' }}>{report.wc_detail.reporting_lag.note}</p>
              )}
            </div>
          )}

          {/* Injury breakdown */}
          {report.wc_detail.injury_breakdown?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mutedFg, marginBottom: '0.75rem' }}>Cause of Injury</p>
              <Table
                headers={['Cause', 'Body Parts', 'Claims', 'Total Incurred', 'Avg Cost']}
                rows={report.wc_detail.injury_breakdown.map((row) => [
                  <span style={{ fontWeight: 600 }}>{row.cause}</span>,
                  <span style={{ fontSize: '0.75rem', color: C.mutedFg }}>{row.body_parts?.join(', ')}</span>,
                  row.claim_count,
                  fmt$(row.total_incurred),
                  fmt$(row.avg_cost),
                ])}
              />
            </div>
          )}

          {/* Top body parts */}
          {report.wc_detail.top_body_parts?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mutedFg, marginBottom: '0.75rem' }}>Top Body Parts</p>
              <Table
                headers={['Body Part', 'Claims', 'Total Incurred']}
                rows={report.wc_detail.top_body_parts.map((row) => [
                  <span style={{ fontWeight: 600 }}>{row.body_part}</span>,
                  row.claim_count,
                  fmt$(row.total_incurred),
                ])}
              />
            </div>
          )}

          {/* By age at injury */}
          {report.wc_detail.by_age_at_injury?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mutedFg, marginBottom: '0.75rem' }}>By Age at Injury</p>
              <Table
                headers={['Age Bracket', 'Claims', 'Total Incurred']}
                rows={report.wc_detail.by_age_at_injury.map((row) => [
                  row.age_bracket,
                  row.claim_count,
                  fmt$(row.total_incurred),
                ])}
              />
            </div>
          )}

          {/* By month */}
          {report.wc_detail.by_month?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mutedFg, marginBottom: '0.75rem' }}>By Month</p>
              <Table
                headers={['Month', 'Claims', 'Total Incurred']}
                rows={report.wc_detail.by_month.map((row) => [
                  row.month,
                  row.claim_count,
                  fmt$(row.total_incurred),
                ])}
              />
            </div>
          )}

          {/* By day of week */}
          {report.wc_detail.by_day_of_week?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mutedFg, marginBottom: '0.75rem' }}>By Day of Week</p>
              <Table
                headers={['Day', 'Claims', 'Total Incurred']}
                rows={report.wc_detail.by_day_of_week.map((row) => [
                  row.day,
                  row.claim_count,
                  fmt$(row.total_incurred),
                ])}
              />
            </div>
          )}

          {/* By department */}
          {report.wc_detail.by_department?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mutedFg, marginBottom: '0.75rem' }}>By Department</p>
              <Table
                headers={['Department', 'Claims', 'Total Incurred']}
                rows={report.wc_detail.by_department.map((row) => [
                  row.department,
                  row.claim_count,
                  fmt$(row.total_incurred),
                ])}
              />
            </div>
          )}

          {/* By state */}
          {report.wc_detail.by_state?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mutedFg, marginBottom: '0.75rem' }}>By State</p>
              <Table
                headers={['State', 'Claims', 'Total Incurred']}
                rows={report.wc_detail.by_state.map((row) => [
                  row.state,
                  row.claim_count,
                  fmt$(row.total_incurred),
                ])}
              />
            </div>
          )}

          {/* Repeat claimants */}
          {report.wc_detail.repeat_claimants?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mutedFg, marginBottom: '0.75rem' }}>Repeat Claimants</p>
              <Table
                headers={['Claimant', 'Claims', 'Total Incurred']}
                rows={report.wc_detail.repeat_claimants.map((row) => [
                  <span style={{ fontWeight: 600 }}>{row.claimant}</span>,
                  row.claim_count,
                  fmt$(row.total_incurred),
                ])}
              />
            </div>
          )}

          {/* Open vs Closed */}
          {report.wc_detail.open_vs_closed && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mutedFg, marginBottom: '0.75rem' }}>Open vs Closed</p>
              <Table
                headers={['Status', 'Count', 'Total Incurred']}
                rows={[
                  ['Open', report.wc_detail.open_vs_closed.open_count ?? '—', fmt$(report.wc_detail.open_vs_closed.open_incurred)],
                  ['Closed', report.wc_detail.open_vs_closed.closed_count ?? '—', fmt$(report.wc_detail.open_vs_closed.closed_incurred)],
                ]}
              />
            </div>
          )}

          {/* Large claims */}
          {report.wc_detail.large_claims?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: C.mutedFg, marginBottom: '0.75rem' }}>Large Claims</p>
              <Table
                headers={['Claimant', 'Date', 'Cause', 'Body Part', 'Type', 'Total Incurred', 'Status']}
                rows={report.wc_detail.large_claims.map((c) => [
                  <span style={{ fontWeight: 600 }}>{c.claimant}</span>,
                  <span style={{ fontSize: '0.75rem', color: C.mutedFg }}>{c.loss_date}</span>,
                  <span style={{ fontSize: '0.75rem' }}>{c.cause}</span>,
                  <span style={{ fontSize: '0.75rem', color: C.mutedFg }}>{c.body_part ?? '—'}</span>,
                  <span style={{ fontSize: '0.75rem', color: C.mutedFg }}>{c.claim_type ?? '—'}</span>,
                  <span style={{ fontWeight: 700 }}>{fmt$(c.total_incurred)}</span>,
                  c.status ? <Badge text={c.status} variant={c.status as 'open' | 'closed'} /> : '—',
                ])}
              />
            </div>
          )}
        </Section>
      )}

      {/* Auto/GL detail */}
      {report.auto_gl_detail && (
        <Section title="Auto & General Liability Detail">
          <p style={{ fontSize: '0.85rem', color: C.mutedFg, marginBottom: '1rem', lineHeight: 1.6 }}>
            {report.auto_gl_detail.summary}
          </p>
          {report.auto_gl_detail.loss_types?.length > 0 && (
            <Table
              headers={['Loss Type', 'Claims', 'Total Incurred']}
              rows={report.auto_gl_detail.loss_types.map((row) => [
                <span>{row.loss_type}</span>,
                row.claim_count,
                fmt$(row.total_incurred),
              ])}
            />
          )}
        </Section>
      )}

      {/* Large claims */}
      {allLargeClaims.length > 0 && (
        <Section title="Large Claims">
          <Table
            headers={['Date', 'Claimant / Description', 'Cause', 'Total Incurred', 'Status']}
            rows={allLargeClaims.map((c) => [
              <span style={{ fontSize: '0.75rem', color: C.mutedFg, whiteSpace: 'nowrap' }}>{c.loss_date}</span>,
              <span>{c.claimant ?? c.description ?? '—'}</span>,
              <span style={{ fontSize: '0.75rem', color: C.mutedFg }}>{c.cause ?? c.description ?? '—'}</span>,
              <span>{fmt$(c.total_incurred)}</span>,
              c.status ? <Badge text={c.status} variant={c.status as 'open' | 'closed'} /> : '—',
            ])}
          />
        </Section>
      )}

      {/* Observations */}
      {report.observations?.length > 0 && (
        <Section title="Key Observations">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {report.observations.map((obs, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  background: C.muted,
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  border: `1px solid ${C.border}`,
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: '1.4rem',
                    height: '1.4rem',
                    borderRadius: '50%',
                    background: C.primary,
                    color: C.primaryFg,
                    fontSize: '0.65rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {i + 1}
                </span>
                <p style={{ fontSize: '0.85rem', color: C.fg, lineHeight: 1.6, margin: 0 }}>{obs}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Data quality note */}
      {report.data_quality_notes && (
        <div
          style={{
            background: C.muted,
            border: `1px solid ${C.border}`,
            borderRadius: '0.5rem',
            padding: '0.75rem 1rem',
            fontSize: '0.75rem',
            color: C.mutedFg,
            lineHeight: 1.6,
          }}
        >
          <span>Data note: </span>
          {report.data_quality_notes}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LossRunAnalyzerPage() {
  const [file, setFile] = useState<File | null>(null)
  const [clientName, setClientName] = useState('')
  const [clientCompany, setClientCompany] = useState('')
  const [loading, setLoading] = useState(false)
  const [stage, setStage] = useState('')
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showReport, setShowReport] = useState(false)
  const [rawExpanded, setRawExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are supported.')
      return
    }
    setFile(f)
    setError(null)
    setResult(null)
    setShowReport(false)
  }

  async function handleAnalyze() {
    if (!file) return
    setLoading(true)
    setError(null)
    setResult(null)
    setShowReport(false)

    try {
      setStage('Stage 1 of 2 — Classifying document...')
      const base64 = await fileToBase64(file)

      const res = await fetch('/api/analyze-loss-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileBase64: base64,
          mediaType: 'application/pdf',
          clientName: clientName || undefined,
          clientCompany: clientCompany || undefined,
        }),
      })

      setStage('Stage 2 of 2 — Extracting data...')
      const json = await res.json()

      if (!json.success) {
        setError(json.error || 'Analysis failed.')
        if (json.raw) console.error('Raw model output:', json.raw)
        return
      }

      setResult(json.data)
    } catch (e: any) {
      setError(e.message || 'Something went wrong.')
    } finally {
      setLoading(false)
      setStage('')
    }
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.5rem 0.75rem',
    borderRadius: '0.375rem',
    border: `1px solid ${C.input}`,
    background: C.bg,
    color: C.fg,
    fontSize: '0.875rem',
    outline: 'none',
  }

  const btnPrimary: React.CSSProperties = {
    width: '100%',
    padding: '0.625rem 1rem',
    borderRadius: '0.375rem',
    background: C.primary,
    color: C.primaryFg,
    fontSize: '0.875rem',
    border: 'none',
    cursor: 'pointer',
  }

  const btnGhost: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8rem',
    color: C.mutedFg,
    padding: '0.25rem 0',
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg }}>
      <nav style={{ borderBottom: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center' }}>
          <a href="/" style={{ fontSize: '0.85rem', color: C.mutedFg, textDecoration: 'none' }}>← Home</a>
        </div>
      </nav>
      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '2.5rem 1rem' }}>

      {/* Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.4rem', color: C.fg, margin: 0 }}>
          Loss Run Analyzer
        </h1>
        <p style={{ fontSize: '0.85rem', color: C.mutedFg, marginTop: '0.25rem' }}>
          Upload a loss run PDF to extract structured claims data and generate a client-ready report.
        </p>
      </div>

      {/* Upload form — hide once report is showing */}
      {!showReport && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Client fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: C.fg, marginBottom: '0.25rem' }}>
                Client Name <span style={{ color: C.mutedFg }}>(optional)</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Jane Smith"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: C.fg, marginBottom: '0.25rem' }}>
                Company <span style={{ color: C.mutedFg }}>(optional)</span>
              </label>
              <input
                type="text"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="e.g. Just Ducky Farms"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${C.border}`,
              borderRadius: '0.5rem',
              padding: '2rem',
              textAlign: 'center',
              cursor: 'pointer',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {file ? (
              <>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: C.fg }}>{file.name}</p>
                <p style={{ fontSize: '0.75rem', color: C.mutedFg, marginTop: '0.25rem' }}>
                  {(file.size / 1024).toFixed(0)} KB · click to change
                </p>
              </>
            ) : (
              <>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: C.fg }}>
                  Click to upload a loss run PDF
                </p>
                <p style={{ fontSize: '0.75rem', color: C.mutedFg, marginTop: '0.25rem' }}>PDF only</p>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '0.75rem 1rem',
                borderRadius: '0.375rem',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
                color: 'rgb(185,28,28)',
                fontSize: '0.875rem',
              }}
            >
              {error}
            </div>
          )}

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            style={{ ...btnPrimary, opacity: !file || loading ? 0.45 : 1 }}
          >
            {loading ? stage || 'Analyzing...' : 'Analyze Loss Run'}
          </button>
        </div>
      )}

      {/* Post-analysis stage — classifier + raw JSON + continue */}
      {result && !showReport && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Classifier card */}
          <div
            style={{
              border: `1px solid ${C.border}`,
              borderRadius: '0.5rem',
              padding: '1rem 1.25rem',
              background: C.muted,
            }}
          >
            <p style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.mutedFg, marginBottom: '0.75rem' }}>
              Document Classified
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', rowGap: '0.4rem', columnGap: '2rem', fontSize: '0.85rem' }}>
              {[
                ['Insured', result.classifier.insured_name],
                ['Carrier', result.classifier.carrier],
                ['Format', result.classifier.document_format],
                ['Coverage', result.classifier.coverage_lines.join(', ')],
                ['Policy Years', result.classifier.policy_years.join(', ')],
                ['Valued As Of', result.classifier.valued_as_of],
                ['Approx Claims', result.classifier.total_claim_count_approximate],
              ]
                .filter(([, val]) => val != null)
                .map(([label, val]) => (
                  <>
                    <span key={`${label}-l`} style={{ color: C.mutedFg }}>{label}</span>
                    <span key={`${label}-v`} style={{ color: C.fg, fontWeight: 500 }}>{String(val)}</span>
                  </>
                ))}
            </div>
            {result.classifier.notes && (
              <p style={{ fontSize: '0.75rem', color: C.mutedFg, marginTop: '0.75rem', lineHeight: 1.5 }}>
                {result.classifier.notes}
              </p>
            )}
          </div>

          {/* Raw JSON collapsible */}
          <div style={{ border: `1px solid ${C.border}`, borderRadius: '0.5rem', overflow: 'hidden' }}>
            <button
              onClick={() => setRawExpanded(!rawExpanded)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: C.muted,
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.85rem',
                color: C.mutedFg,
              }}
            >
              <span style={{ fontWeight: 500 }}>Raw JSON Output</span>
              <span style={{ fontSize: '0.7rem' }}>{rawExpanded ? '▲ Collapse' : '▼ Expand'}</span>
            </button>
            {rawExpanded && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={handleCopy}
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '0.25rem',
                    background: C.muted,
                    border: `1px solid ${C.border}`,
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    color: C.mutedFg,
                  }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                <pre
                  style={{
                    padding: '1rem',
                    overflowX: 'auto',
                    fontSize: '0.72rem',
                    lineHeight: 1.5,
                    maxHeight: '24rem',
                    overflowY: 'auto',
                    background: C.bg,
                    color: C.fg,
                    margin: 0,
                  }}
                >
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>

          {/* Copy button (always visible) */}
          <button
            onClick={handleCopy}
            style={{
              ...btnGhost,
              border: `1px solid ${C.border}`,
              borderRadius: '0.375rem',
              padding: '0.5rem 1rem',
              width: '100%',
              background: C.muted,
            }}
          >
            {copied ? '✓ Copied to clipboard' : 'Copy JSON to share'}
          </button>

          {/* Continue */}
          <button onClick={() => setShowReport(true)} style={btnPrimary}>
            Continue to Report →
          </button>
        </div>
      )}

      {/* Report */}
      {result && showReport && (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
            }}
          >
            <button onClick={() => setShowReport(false)} style={btnGhost}>
              ← Back to Analysis
            </button>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={handleCopy} style={btnGhost}>
                {copied ? '✓ Copied' : 'Copy JSON'}
              </button>
              <button onClick={() => exportToExcel(result)} style={btnGhost}>
                Download Excel
              </button>
              <button
                onClick={() => { setFile(null); setResult(null); setShowReport(false) }}
                style={btnGhost}
              >
                Start Over
              </button>
            </div>
          </div>
          <ReportView result={result} />
        </div>
      )}
      </div>
    </div>
  )
}