import * as XLSX from 'xlsx'

function fmt$(n: number | null): string {
  if (n == null) return '—'
  return n.toString()
}

function fmtDisplay$(n: number | null): string {
  if (n == null) return '—'
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function lineLabel(line: string): string {
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

function headerStyle() {
  return {
    font: { bold: true, color: { rgb: 'FFFFFF' }, name: 'Arial', sz: 10 },
    fill: { fgColor: { rgb: '1C1917' }, patternType: 'solid' },
    alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
    border: {
      bottom: { style: 'thin', color: { rgb: '78716C' } },
    },
  }
}

function subHeaderStyle() {
  return {
    font: { bold: true, name: 'Arial', sz: 10, color: { rgb: '1C1917' } },
    fill: { fgColor: { rgb: 'E7E5E4' }, patternType: 'solid' },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      bottom: { style: 'thin', color: { rgb: 'A8A29E' } },
    },
  }
}

function titleStyle() {
  return {
    font: { bold: true, name: 'Arial', sz: 14, color: { rgb: '1C1917' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  }
}

function subtitleStyle() {
  return {
    font: { name: 'Arial', sz: 10, color: { rgb: '78716C' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  }
}

function dataStyle(bold = false) {
  return {
    font: { name: 'Arial', sz: 10, bold, color: { rgb: '1C1917' } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      bottom: { style: 'hair', color: { rgb: 'E7E5E4' } },
    },
  }
}

function currencyStyle(bold = false) {
  return {
    font: { name: 'Arial', sz: 10, bold, color: { rgb: '1C1917' } },
    numFmt: '$#,##0',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      bottom: { style: 'hair', color: { rgb: 'E7E5E4' } },
    },
  }
}

function numberStyle(bold = false) {
  return {
    font: { name: 'Arial', sz: 10, bold, color: { rgb: '1C1917' } },
    numFmt: '#,##0',
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      bottom: { style: 'hair', color: { rgb: 'E7E5E4' } },
    },
  }
}

function styleRange(ws: XLSX.WorkSheet, startRow: number, startCol: number, endRow: number, endCol: number, style: any) {
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cellRef = XLSX.utils.encode_cell({ r, c })
      if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' }
      ws[cellRef].s = style
    }
  }
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map((w) => ({ wch: w }))
}

// ── Sheet builders ────────────────────────────────────────────────────────────

function buildSummarySheet(report: any, meta: any): XLSX.WorkSheet {
  const ls = report.loss_summary
  const aoa: any[][] = [
    [],
    ['', 'LOSS RUN ANALYSIS REPORT'],
    ['', report.insured_name ?? ''],
    ['', `${report.carrier ?? ''} · Valued as of ${report.valued_as_of ?? ''}`],
    [],
    ['', 'Coverage Lines:', report.coverage_lines.map(lineLabel).join(', ')],
    ['', 'Generated:', new Date(meta.analyzedAt).toLocaleDateString()],
    [],
    [],
    ['', 'LOSS SUMMARY'],
    [],
    ['', 'Metric', 'Value'],
    ['', 'Total Claims', ls?.total_claims ?? '—'],
    ['', 'Open Claims', ls?.open_claims ?? '—'],
    ['', 'Closed Claims', ls?.closed_claims ?? '—'],
    ['', 'Total Paid', ls?.total_paid ?? 0],
    ['', 'Total Reserves', ls?.total_reserves ?? 0],
    ['', 'Total Incurred', ls?.total_incurred ?? 0],
    ['', 'Avg Cost per Claim', ls?.avg_cost_per_claim ?? 0],
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  if (ws['B2']) ws['B2'].s = titleStyle()
  if (ws['B3']) ws['B3'].s = { font: { bold: true, name: 'Arial', sz: 12, color: { rgb: '1C1917' } } }
  if (ws['B4']) ws['B4'].s = subtitleStyle()
  if (ws['B6']) ws['B6'].s = subtitleStyle()
  if (ws['B7']) ws['B7'].s = subtitleStyle()
  if (ws['B10']) ws['B10'].s = { font: { bold: true, name: 'Arial', sz: 11, color: { rgb: '1C1917' } } }

  styleRange(ws, 11, 1, 11, 2, headerStyle())

  for (let r = 12; r <= 18; r++) {
    const labelCell = XLSX.utils.encode_cell({ r, c: 1 })
    const valCell = XLSX.utils.encode_cell({ r, c: 2 })
    if (ws[labelCell]) ws[labelCell].s = dataStyle()
    if (ws[valCell]) {
      const isCurrency = r >= 15
      const isBold = r === 17
      ws[valCell].s = isCurrency ? currencyStyle(isBold) : numberStyle(isBold)
      if (isCurrency && ws[valCell].v !== '—') {
        ws[valCell].t = 'n'
      }
    }
  }

  setColWidths(ws, [2, 30, 20])
  return ws
}

function buildByYearSheet(report: any): XLSX.WorkSheet {
  const rows = report.by_year ?? []

  const aoa: any[][] = [
    [],
    ['', 'LOSSES BY POLICY YEAR'],
    [],
    ['', 'Policy Year', 'Claims', 'Total Paid ($)', 'Reserves ($)', 'Total Incurred ($)', 'Open', 'Closed'],
    ...rows.map((r: any) => [
      '',
      r.year,
      r.claim_count,
      r.total_paid ?? 0,
      r.total_reserves ?? 0,
      r.total_incurred ?? 0,
      r.open_claims ?? '—',
      r.closed_claims ?? '—',
    ]),
    [],
    ['', 'TOTAL', `=SUM(C5:C${4 + rows.length})`, `=SUM(D5:D${4 + rows.length})`, `=SUM(E5:E${4 + rows.length})`, `=SUM(F5:F${4 + rows.length})`],
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  if (ws['B2']) ws['B2'].s = { font: { bold: true, name: 'Arial', sz: 11, color: { rgb: '1C1917' } } }

  styleRange(ws, 3, 1, 3, 7, headerStyle())

  for (let i = 0; i < rows.length; i++) {
    const r = 4 + i
    const labelCell = XLSX.utils.encode_cell({ r, c: 1 })
    if (ws[labelCell]) ws[labelCell].s = dataStyle()
    for (let c = 2; c <= 7; c++) {
      const cell = XLSX.utils.encode_cell({ r, c })
      if (ws[cell]) {
        ws[cell].s = c >= 3 && c <= 5 ? currencyStyle() : numberStyle()
        if (c >= 3 && c <= 5) ws[cell].t = 'n'
      }
    }
  }

  const totalRow = 5 + rows.length
  styleRange(ws, totalRow, 1, totalRow, 5, subHeaderStyle())

  setColWidths(ws, [2, 18, 10, 18, 18, 20, 8, 8])
  return ws
}

function buildByCoverageSheet(report: any): XLSX.WorkSheet {
  const lines = report.by_coverage_line ?? []
  const aoa: any[][] = [
    [],
    ['', 'BY COVERAGE LINE'],
    [],
  ]

  let currentRow = 3

  lines.forEach((line: any) => {
    aoa.push(['', lineLabel(line.line).toUpperCase(), '', line.claim_count + ' claims', '', fmtDisplay$(line.total_incurred)])
    aoa.push(['', 'Cause', '', 'Claims', '', 'Total Incurred ($)'])
    currentRow += 2

    ;(line.top_causes ?? []).forEach((c: any) => {
      aoa.push(['', c.cause, '', c.claim_count, '', c.total_incurred ?? 0])
      currentRow++
    })

    aoa.push([])
    currentRow++
  })

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  if (ws['B2']) ws['B2'].s = { font: { bold: true, name: 'Arial', sz: 11, color: { rgb: '1C1917' } } }

  setColWidths(ws, [2, 35, 4, 12, 4, 20])
  return ws
}

function buildLargeClaimsSheet(report: any): XLSX.WorkSheet {
  const wcClaims = report.wc_detail?.large_claims ?? []
  const autoClaims = report.auto_gl_detail?.large_claims ?? []
  const all = [...wcClaims, ...autoClaims].sort((a: any, b: any) => b.total_incurred - a.total_incurred)

  const aoa: any[][] = [
    [],
    ['', 'LARGE CLAIMS'],
    [],
    ['', 'Loss Date', 'Claimant / Description', 'Cause', 'Body Part', 'Total Incurred ($)', 'Status'],
    ...all.map((c: any) => [
      '',
      c.loss_date,
      c.claimant ?? c.description ?? '—',
      c.cause ?? c.description ?? '—',
      c.body_part ?? '—',
      c.total_incurred ?? 0,
      c.status ?? '—',
    ]),
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  if (ws['B2']) ws['B2'].s = { font: { bold: true, name: 'Arial', sz: 11, color: { rgb: '1C1917' } } }
  styleRange(ws, 3, 1, 3, 6, headerStyle())

  for (let i = 0; i < all.length; i++) {
    const r = 4 + i
    for (let c = 1; c <= 6; c++) {
      const cell = XLSX.utils.encode_cell({ r, c })
      if (ws[cell]) {
        ws[cell].s = c === 5 ? currencyStyle(false) : dataStyle()
        if (c === 5) ws[cell].t = 'n'
      }
    }
  }

  setColWidths(ws, [2, 14, 35, 30, 20, 20, 10])
  return ws
}

function buildWCSheet(report: any): XLSX.WorkSheet | null {
  const wc = report.wc_detail
  if (!wc) return null

  const aoa: any[][] = [
    [],
    ['', 'WORKERS COMPENSATION DETAIL'],
    [],
    ['', wc.summary],
    [],
    ['', 'INJURY BREAKDOWN'],
    [],
    ['', 'Cause of Injury', 'Body Parts', 'Claims', 'Total Incurred ($)', 'Avg Cost ($)'],
    ...(wc.injury_breakdown ?? []).map((r: any) => [
      '',
      r.cause,
      r.body_parts?.join(', ') ?? '—',
      r.claim_count,
      r.total_incurred ?? 0,
      r.avg_cost ?? 0,
    ]),
    [],
    ['', 'OPEN vs CLOSED'],
    [],
    ['', 'Status', 'Count', 'Total Incurred ($)'],
    ['', 'Open', wc.open_vs_closed?.open_count ?? '—', wc.open_vs_closed?.open_incurred ?? 0],
    ['', 'Closed', wc.open_vs_closed?.closed_count ?? '—', wc.open_vs_closed?.closed_incurred ?? 0],
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  if (ws['B2']) ws['B2'].s = { font: { bold: true, name: 'Arial', sz: 11, color: { rgb: '1C1917' } } }

  setColWidths(ws, [2, 28, 35, 10, 18, 16])
  return ws
}

function buildObservationsSheet(report: any): XLSX.WorkSheet {
  const obs = report.observations ?? []

  const aoa: any[][] = [
    [],
    ['', 'KEY OBSERVATIONS'],
    [],
    ...obs.map((o: string, i: number) => ['', `${i + 1}.`, o]),
    [],
    ...(report.data_quality_notes
      ? [['', 'DATA NOTE'], [], ['', '', report.data_quality_notes]]
      : []),
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  if (ws['B2']) ws['B2'].s = { font: { bold: true, name: 'Arial', sz: 11, color: { rgb: '1C1917' } } }

  obs.forEach((_: any, i: number) => {
    const r = 3 + i
    const numCell = XLSX.utils.encode_cell({ r, c: 1 })
    const textCell = XLSX.utils.encode_cell({ r, c: 2 })
    if (ws[numCell]) ws[numCell].s = dataStyle(true)
    if (ws[textCell]) {
      ws[textCell].s = {
        font: { name: 'Arial', sz: 10, color: { rgb: '1C1917' } },
        alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
      }
      ws['!rows'] = ws['!rows'] ?? []
      ws['!rows'][r] = { hpt: 40 }
    }
  })

  setColWidths(ws, [2, 4, 90])
  return ws
}

// ── Main export function ──────────────────────────────────────────────────────

export function exportToExcel(result: any) {
  const { report, meta } = result

  const wb = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(wb, buildSummarySheet(report, meta), 'Summary')

  if (report.by_year?.length > 0) {
    XLSX.utils.book_append_sheet(wb, buildByYearSheet(report), 'By Year')
  }

  if (report.by_coverage_line?.length > 0) {
    XLSX.utils.book_append_sheet(wb, buildByCoverageSheet(report), 'By Coverage Line')
  }

  const hasLargeClaims =
    (report.wc_detail?.large_claims?.length ?? 0) > 0 ||
    (report.auto_gl_detail?.large_claims?.length ?? 0) > 0
  if (hasLargeClaims) {
    XLSX.utils.book_append_sheet(wb, buildLargeClaimsSheet(report), 'Large Claims')
  }

  const wcSheet = buildWCSheet(report)
  if (wcSheet) {
    XLSX.utils.book_append_sheet(wb, wcSheet, 'WC Detail')
  }

  if (report.observations?.length > 0) {
    XLSX.utils.book_append_sheet(wb, buildObservationsSheet(report), 'Observations')
  }

  const insured = (report.insured_name ?? 'Loss_Run')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 30)
  const date = new Date().toISOString().split('T')[0]
  const filename = `${insured}_Loss_Run_${date}.xlsx`

  XLSX.writeFile(wb, filename, { bookType: 'xlsx', type: 'binary', cellStyles: true })
}
