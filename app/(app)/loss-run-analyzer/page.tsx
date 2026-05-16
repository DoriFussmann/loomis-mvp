'use client'

import { useState, useRef } from 'react'
import { exportToExcel } from '@/lib/exportToExcel'
import { Button } from '@/components/ui/button'

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

const C = {
  bg:        'hsl(var(--background))',
  fg:        'hsl(var(--foreground))',
  muted:     'hsl(var(--muted))',
  mutedFg:   'hsl(var(--muted-foreground))',
  border:    'hsl(var(--border))',
  primary:   'hsl(var(--primary))',
  primaryFg: 'hsl(var(--primary-foreground))',
  input:     'hsl(var(--input))',
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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-muted border border-border rounded-lg p-4">
      <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-2xl text-foreground leading-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-[0.65rem] uppercase tracking-widest text-muted-foreground border-b border-border pb-2 mb-4">
        {title}
      </h3>
      {children}
    </div>
  )
}

function BarChart({ data }: { data: ByYear[] }) {
  const max = Math.max(...data.map((d) => d.total_incurred), 1)
  return (
    <div className="flex flex-col gap-2 mb-4">
      {data.map((row) => (
        <div key={row.year} className="grid items-center gap-3" style={{ gridTemplateColumns: '110px 1fr 110px' }}>
          <span className="text-xs text-muted-foreground text-right">{row.year}</span>
          <div className="h-6 bg-border rounded overflow-hidden">
            <div
              className="h-full bg-primary rounded transition-[width] duration-500"
              style={{ width: `${(row.total_incurred / max) * 100}%` }}
            />
          </div>
          <span className="text-xs text-foreground">{fmt$(row.total_incurred)}</span>
        </div>
      ))}
    </div>
  )
}

function Table({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="text-left px-3 py-2 text-[0.7rem] uppercase tracking-wide text-muted-foreground border-b-2 border-border whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`border-b border-border ${i % 2 !== 0 ? 'bg-muted' : ''}`}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2.5 text-foreground align-top">
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
  const cls: Record<string, string> = {
    default: 'bg-muted text-muted-foreground',
    open:    'bg-orange-50 text-orange-700',
    closed:  'bg-green-50 text-green-700',
    line:    'bg-primary text-primary-foreground',
  }
  return (
    <span className={`inline-block text-[0.7rem] px-2 py-0.5 rounded-full ${cls[variant]}`}>
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
      <div className="bg-primary text-primary-foreground rounded-xl p-6 mb-8 flex justify-between items-start gap-4">
        <div>
          <p className="text-[0.65rem] uppercase tracking-widest opacity-70 mb-1">Loss Run Analysis</p>
          <h2 className="text-2xl font-normal m-0">{report.insured_name ?? 'Unknown Insured'}</h2>
          <p className="text-sm opacity-80 mt-1">{report.carrier}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[0.65rem] opacity-70 mb-1">Valued as of</p>
          <p className="text-base">{report.valued_as_of ?? '—'}</p>
          <div className="flex gap-1.5 mt-2 justify-end flex-wrap">
            {report.coverage_lines.map((l) => (
              <span
                key={l}
                className="text-[0.65rem] px-2 py-0.5 rounded-full tracking-wide"
                style={{ background: 'rgba(255,255,255,0.18)' }}
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
          <div className="grid grid-cols-2 gap-3 mb-3">
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
            <p className="text-sm text-muted-foreground">
              Outstanding reserves: <span className="text-foreground">{fmt$(ls.total_reserves)}</span>
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
              <span key="year">{row.year}</span>,
              fmtN(row.claim_count),
              fmt$(row.total_paid),
              fmt$(row.total_reserves),
              <span key="incurred">{fmt$(row.total_incurred)}</span>,
            ])}
          />
        </Section>
      )}

      {/* By coverage line */}
      {report.by_coverage_line?.length > 0 && (
        <Section title="By Coverage Line">
          {report.by_coverage_line.map((line) => (
            <div key={line.line} className="border border-border rounded-lg p-4 mb-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge text={lineBadge(line.line)} variant="line" />
                  <span className="text-sm text-foreground">{lineLabel(line.line)}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm text-foreground">{fmt$(line.total_incurred)}</span>
                  <span className="text-xs text-muted-foreground ml-2">{line.claim_count} claims</span>
                </div>
              </div>
              {line.top_causes?.length > 0 && (
                <div className="border-t border-border pt-2">
                  {line.top_causes.map((c) => (
                    <div key={c.cause} className="flex justify-between text-xs text-muted-foreground py-1">
                      <span>{c.cause}</span>
                      <span className="font-medium text-foreground">
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
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{report.wc_detail.summary}</p>

          {report.wc_detail.financials && (
            <div className="mb-6">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">Financials</p>
              <Table
                headers={['Type', 'Paid', 'Reserve', 'Total']}
                rows={[
                  ['Indemnity', fmt$(report.wc_detail.financials.indemnity?.paid), fmt$(report.wc_detail.financials.indemnity?.reserve), <span key="t" className="font-bold">{fmt$(report.wc_detail.financials.indemnity?.total)}</span>],
                  ['Medical', fmt$(report.wc_detail.financials.medical?.paid), fmt$(report.wc_detail.financials.medical?.reserve), <span key="t" className="font-bold">{fmt$(report.wc_detail.financials.medical?.total)}</span>],
                  ['Expense', fmt$(report.wc_detail.financials.expense?.paid), fmt$(report.wc_detail.financials.expense?.reserve), <span key="t" className="font-bold">{fmt$(report.wc_detail.financials.expense?.total)}</span>],
                ]}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mb-6">
            {report.wc_detail.claim_type_split && (
              <div className="border border-border rounded-lg p-4">
                <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-2">Claim Types</p>
                {[
                  ['Indemnity', report.wc_detail.claim_type_split.indemnity_count],
                  ['Medical Only', report.wc_detail.claim_type_split.medical_only_count],
                  ['Incident Only', report.wc_detail.claim_type_split.incident_only_count],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between text-sm py-1 border-b border-border">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground">{val ?? '—'}</span>
                  </div>
                ))}
              </div>
            )}
            {report.wc_detail.litigated_claims && (
              <div className="border border-border rounded-lg p-4">
                <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-2">Litigated Claims</p>
                <div className="flex justify-between text-sm py-1 border-b border-border">
                  <span className="text-muted-foreground">Count</span>
                  <span className="font-semibold text-foreground">{report.wc_detail.litigated_claims.count ?? '—'}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-muted-foreground">Total Incurred</span>
                  <span className="font-semibold text-foreground">{fmt$(report.wc_detail.litigated_claims.total_incurred)}</span>
                </div>
              </div>
            )}
          </div>

          {report.wc_detail.reporting_lag && (
            <div className="mb-6">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">Reporting Lag</p>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {[
                  ['0–3 Days', report.wc_detail.reporting_lag.within_3_days],
                  ['4–10 Days', report.wc_detail.reporting_lag.days_4_to_10],
                  ['11+ Days', report.wc_detail.reporting_lag.days_11_plus],
                ].map(([label, val]) => (
                  <div key={label as string} className="bg-muted border border-border rounded-md px-3 py-2.5 text-center">
                    <p className="text-xl font-bold text-foreground">{val ?? '—'}</p>
                    <p className="text-[0.7rem] text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              {report.wc_detail.reporting_lag.avg_days != null && (
                <p className="text-sm text-muted-foreground">
                  Avg days to report: <span className="font-semibold text-foreground">{report.wc_detail.reporting_lag.avg_days}</span>
                </p>
              )}
              {report.wc_detail.reporting_lag.note && (
                <p className="text-sm text-muted-foreground mt-1">{report.wc_detail.reporting_lag.note}</p>
              )}
            </div>
          )}

          {report.wc_detail.injury_breakdown?.length > 0 && (
            <div className="mb-6">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">Cause of Injury</p>
              <Table
                headers={['Cause', 'Body Parts', 'Claims', 'Total Incurred', 'Avg Cost']}
                rows={report.wc_detail.injury_breakdown.map((row) => [
                  <span key="c" className="font-semibold">{row.cause}</span>,
                  <span key="b" className="text-xs text-muted-foreground">{row.body_parts?.join(', ')}</span>,
                  row.claim_count,
                  fmt$(row.total_incurred),
                  fmt$(row.avg_cost),
                ])}
              />
            </div>
          )}

          {report.wc_detail.top_body_parts?.length > 0 && (
            <div className="mb-6">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">Top Body Parts</p>
              <Table
                headers={['Body Part', 'Claims', 'Total Incurred']}
                rows={report.wc_detail.top_body_parts.map((row) => [
                  <span key="b" className="font-semibold">{row.body_part}</span>,
                  row.claim_count,
                  fmt$(row.total_incurred),
                ])}
              />
            </div>
          )}

          {report.wc_detail.by_age_at_injury?.length > 0 && (
            <div className="mb-6">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">By Age at Injury</p>
              <Table
                headers={['Age Bracket', 'Claims', 'Total Incurred']}
                rows={report.wc_detail.by_age_at_injury.map((row) => [
                  row.age_bracket, row.claim_count, fmt$(row.total_incurred),
                ])}
              />
            </div>
          )}

          {report.wc_detail.by_month?.length > 0 && (
            <div className="mb-6">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">By Month</p>
              <Table
                headers={['Month', 'Claims', 'Total Incurred']}
                rows={report.wc_detail.by_month.map((row) => [
                  row.month, row.claim_count, fmt$(row.total_incurred),
                ])}
              />
            </div>
          )}

          {report.wc_detail.by_day_of_week?.length > 0 && (
            <div className="mb-6">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">By Day of Week</p>
              <Table
                headers={['Day', 'Claims', 'Total Incurred']}
                rows={report.wc_detail.by_day_of_week.map((row) => [
                  row.day, row.claim_count, fmt$(row.total_incurred),
                ])}
              />
            </div>
          )}

          {report.wc_detail.by_department?.length > 0 && (
            <div className="mb-6">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">By Department</p>
              <Table
                headers={['Department', 'Claims', 'Total Incurred']}
                rows={report.wc_detail.by_department.map((row) => [
                  row.department, row.claim_count, fmt$(row.total_incurred),
                ])}
              />
            </div>
          )}

          {report.wc_detail.by_state?.length > 0 && (
            <div className="mb-6">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">By State</p>
              <Table
                headers={['State', 'Claims', 'Total Incurred']}
                rows={report.wc_detail.by_state.map((row) => [
                  row.state, row.claim_count, fmt$(row.total_incurred),
                ])}
              />
            </div>
          )}

          {report.wc_detail.repeat_claimants?.length > 0 && (
            <div className="mb-6">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">Repeat Claimants</p>
              <Table
                headers={['Claimant', 'Claims', 'Total Incurred']}
                rows={report.wc_detail.repeat_claimants.map((row) => [
                  <span key="c" className="font-semibold">{row.claimant}</span>,
                  row.claim_count,
                  fmt$(row.total_incurred),
                ])}
              />
            </div>
          )}

          {report.wc_detail.open_vs_closed && (
            <div className="mb-6">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">Open vs Closed</p>
              <Table
                headers={['Status', 'Count', 'Total Incurred']}
                rows={[
                  ['Open', report.wc_detail.open_vs_closed.open_count ?? '—', fmt$(report.wc_detail.open_vs_closed.open_incurred)],
                  ['Closed', report.wc_detail.open_vs_closed.closed_count ?? '—', fmt$(report.wc_detail.open_vs_closed.closed_incurred)],
                ]}
              />
            </div>
          )}

          {report.wc_detail.large_claims?.length > 0 && (
            <div className="mb-6">
              <p className="text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">Large Claims</p>
              <Table
                headers={['Claimant', 'Date', 'Cause', 'Body Part', 'Type', 'Total Incurred', 'Status']}
                rows={report.wc_detail.large_claims.map((c) => [
                  <span key="cl" className="font-semibold">{c.claimant}</span>,
                  <span key="d" className="text-xs text-muted-foreground">{c.loss_date}</span>,
                  <span key="ca" className="text-xs">{c.cause}</span>,
                  <span key="b" className="text-xs text-muted-foreground">{c.body_part ?? '—'}</span>,
                  <span key="t" className="text-xs text-muted-foreground">{c.claim_type ?? '—'}</span>,
                  <span key="i" className="font-bold">{fmt$(c.total_incurred)}</span>,
                  c.status ? <Badge key="s" text={c.status} variant={c.status as 'open' | 'closed'} /> : '—',
                ])}
              />
            </div>
          )}
        </Section>
      )}

      {/* Auto/GL detail */}
      {report.auto_gl_detail && (
        <Section title="Auto & General Liability Detail">
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{report.auto_gl_detail.summary}</p>
          {report.auto_gl_detail.loss_types?.length > 0 && (
            <Table
              headers={['Loss Type', 'Claims', 'Total Incurred']}
              rows={report.auto_gl_detail.loss_types.map((row) => [
                <span key="l">{row.loss_type}</span>,
                row.claim_count,
                fmt$(row.total_incurred),
              ])}
            />
          )}
        </Section>
      )}

      {/* Combined large claims */}
      {allLargeClaims.length > 0 && (
        <Section title="Large Claims">
          <Table
            headers={['Date', 'Claimant / Description', 'Cause', 'Total Incurred', 'Status']}
            rows={allLargeClaims.map((c) => {
              const d = c as any
              return [
                <span key="d" className="text-xs text-muted-foreground whitespace-nowrap">{d.loss_date}</span>,
                <span key="cl">{d.claimant ?? d.description ?? '—'}</span>,
                <span key="ca" className="text-xs text-muted-foreground">{d.cause ?? d.description ?? '—'}</span>,
                <span key="i">{fmt$(d.total_incurred)}</span>,
                d.status ? <Badge key="s" text={d.status} variant={d.status as 'open' | 'closed'} /> : '—',
              ]
            })}
          />
        </Section>
      )}

      {/* Observations */}
      {report.observations?.length > 0 && (
        <Section title="Key Observations">
          <div className="flex flex-col gap-2.5">
            {report.observations.map((obs, i) => (
              <div key={i} className="flex gap-3 bg-muted rounded-lg px-4 py-3 border border-border">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-[0.65rem] flex items-center justify-center">
                  {i + 1}
                </span>
                <p className="text-sm text-foreground leading-relaxed m-0">{obs}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Data quality note */}
      {report.data_quality_notes && (
        <div className="bg-muted border border-border rounded-lg px-4 py-3 text-xs text-muted-foreground leading-relaxed">
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

  return (
    <div>
      {/* Title */}
      <div className="mb-6">
        <h1 className="text-xl font-normal text-foreground">Loss Run Analyzer</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a loss run PDF to extract structured claims data and generate a client-ready report.
        </p>
      </div>

      {/* Upload form */}
      {!showReport && (
        <div className="flex flex-col gap-4">
          {/* Client fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Client Name <span className="text-muted-foreground font-light">(optional)</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Jane Smith"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Company <span className="text-muted-foreground font-light">(optional)</span>
              </label>
              <input
                type="text"
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder="e.g. Just Ducky Farms"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm font-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring transition-colors"
              />
            </div>
          </div>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-ring transition-colors duration-200"
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />
            {file ? (
              <>
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(file.size / 1024).toFixed(0)} KB · click to change
                </p>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-foreground">Click to upload a loss run PDF</p>
                <p className="text-xs text-muted-foreground mt-1">PDF only</p>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-4 py-3 rounded-md bg-destructive/8 border border-destructive/25 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Analyze button */}
          <Button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? stage || 'Analyzing...' : 'Analyze Loss Run'}
          </Button>
        </div>
      )}

      {/* Post-analysis */}
      {result && !showReport && (
        <div className="mt-6 flex flex-col gap-4">
          {/* Classifier card */}
          <div className="border border-border rounded-lg p-5 bg-muted">
            <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground mb-3">
              Document Classified
            </p>
            <div className="grid text-sm gap-y-1.5 gap-x-8" style={{ gridTemplateColumns: '1fr 1fr' }}>
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
                    <span key={`${label}-l`} className="text-muted-foreground">{label}</span>
                    <span key={`${label}-v`} className="text-foreground font-medium">{String(val)}</span>
                  </>
                ))}
            </div>
            {result.classifier.notes && (
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{result.classifier.notes}</p>
            )}
          </div>

          {/* Raw JSON collapsible */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setRawExpanded(!rawExpanded)}
              className="w-full flex items-center justify-between px-4 py-3 bg-muted text-sm text-muted-foreground hover:bg-accent transition-colors duration-200"
            >
              <span className="font-medium">Raw JSON Output</span>
              <span className="text-xs">{rawExpanded ? '▲ Collapse' : '▼ Expand'}</span>
            </button>
            {rawExpanded && (
              <div className="relative">
                <button
                  onClick={handleCopy}
                  className="absolute top-2 right-2 px-2 py-1 rounded bg-muted border border-border text-xs text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
                <pre className="p-4 overflow-x-auto text-xs leading-relaxed max-h-96 overflow-y-auto bg-background text-foreground m-0">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>

          <button
            onClick={handleCopy}
            className="w-full px-4 py-2.5 rounded-md bg-muted border border-border text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
          >
            {copied ? '✓ Copied to clipboard' : 'Copy JSON to share'}
          </button>

          <Button onClick={() => setShowReport(true)} className="w-full">
            Continue to Report →
          </Button>
        </div>
      )}

      {/* Report view */}
      {result && showReport && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <Button variant="outline" size="sm" onClick={() => setShowReport(false)}>
              Back to Analysis
            </Button>
            <div className="flex gap-4">
              <button
                onClick={handleCopy}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                {copied ? '✓ Copied' : 'Copy JSON'}
              </button>
              <button
                onClick={() => exportToExcel(result)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Download Excel
              </button>
              <button
                onClick={() => { setFile(null); setResult(null); setShowReport(false) }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
              >
                Start Over
              </button>
            </div>
          </div>
          <ReportView result={result} />
        </div>
      )}
    </div>
  )
}
