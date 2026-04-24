import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const CLASSIFIER_PROMPT = `Analyze the attached loss run document and return ONLY a valid JSON object. No preamble, no explanation, no markdown, no code fences. Raw JSON only.

{
  "insured_name": "<name of insured entity, or null>",
  "carrier": "<insurance carrier name, or null>",
  "document_format": "<one of: claim_level_detail | summary_report | package_line_detail | unknown>",
  "coverage_lines": ["<list of lines found, each one of: workers_comp | auto | general_liability | property | umbrella | other>"],
  "policy_years": ["<list of policy year strings found, e.g. '2022', '2023-2024'>"],
  "valued_as_of": "<valuation date string, or null>",
  "available_fields": {
    "has_claim_numbers": <true|false>,
    "has_cause_of_loss": <true|false>,
    "has_body_part": <true|false>,
    "has_injury_description": <true|false>,
    "has_claimant_names": <true|false>,
    "has_paid_medical": <true|false>,
    "has_paid_indemnity": <true|false>,
    "has_paid_expense": <true|false>,
    "has_reserves": <true|false>,
    "has_open_closed_status": <true|false>,
    "has_loss_date": <true|false>,
    "has_location_codes": <true|false>,
    "has_payroll_data": <true|false>,
    "has_per_year_totals": <true|false>
  },
  "total_claim_count_approximate": <number or null>,
  "notes": "<any important structural notes about this document>"
}`

const EXTRACTOR_PROMPT = `You have already classified this loss run document. Here is the classification:

{{classifier_output}}

Now extract the full report data from the attached document. Return ONLY a valid JSON object. No preamble, no explanation, no markdown, no code fences. Raw JSON only.

Rules:
- Only populate a section if the classifier confirmed the required fields exist
- If a section cannot be populated, set it to null
- For arrays with no data, use []
- All dollar amounts as plain numbers — no dollar signs, no commas
- All plain-language notes must be clear, jargon-free, and actionable for a business owner
- total_incurred = paid + reserves, or use the document's own incurred figure if present
- Do not omit any key — set to null if unknown
- For large_claims: include top 10 by total_incurred, or any claim over $10,000 — whichever produces the smaller list. Exclude zero-dollar claims.

{
  "insured_name": "<string or null>",
  "carrier": "<string or null>",
  "valued_as_of": "<string or null>",
  "coverage_lines": ["<array of strings>"],

  "loss_summary": {
    "total_claims": <number or null>,
    "open_claims": <number or null>,
    "closed_claims": <number or null>,
    "total_paid": <number or null>,
    "total_reserves": <number or null>,
    "total_incurred": <number or null>,
    "avg_cost_per_claim": <number or null>
  },

  "by_year": [
    {
      "year": "<policy year label string>",
      "claim_count": <number>,
      "total_paid": <number>,
      "total_reserves": <number>,
      "total_incurred": <number>,
      "open_claims": <number or null>,
      "closed_claims": <number or null>
    }
  ],

  "by_coverage_line": [
    {
      "line": "<workers_comp|auto|general_liability|property|other>",
      "claim_count": <number>,
      "total_incurred": <number>,
      "top_causes": [
        { "cause": "<string>", "claim_count": <number>, "total_incurred": <number> }
      ]
    }
  ],

  "wc_detail": null,

  "auto_gl_detail": null,

  "observations": [
    "<observation 1 — specific, actionable, client-friendly>",
    "<observation 2>",
    "<observation 3>",
    "<observation 4>",
    "<observation 5>"
  ],

  "data_quality_notes": "<string or null>"
}

If the document contains workers comp data (coverage_lines includes workers_comp), replace the wc_detail null with:
{
  "injury_breakdown": [
    {
      "cause": "<cause of injury string>",
      "body_parts": ["<body part strings>"],
      "claim_count": <number>,
      "total_incurred": <number>,
      "avg_cost": <number>
    }
  ],
  "top_body_parts": [
    { "body_part": "<string>", "claim_count": <number>, "total_incurred": <number> }
  ],
  "open_vs_closed": {
    "open_count": <number or null>,
    "closed_count": <number or null>,
    "open_incurred": <number or null>,
    "closed_incurred": <number or null>
  },
  "large_claims": [
    {
      "claimant": "<name or claim number>",
      "loss_date": "<string>",
      "cause": "<string>",
      "body_part": "<string or null>",
      "total_incurred": <number>,
      "status": "<open|closed|unknown>"
    }
  ],
  "summary": "<2-3 sentence plain-language summary of WC loss pattern>"
}

If the document contains auto or general liability data, replace the auto_gl_detail null with:
{
  "loss_types": [
    { "loss_type": "<string>", "claim_count": <number>, "total_incurred": <number> }
  ],
  "large_claims": [
    {
      "loss_date": "<string>",
      "description": "<string>",
      "claimant": "<string or null>",
      "total_incurred": <number>
    }
  ],
  "summary": "<2-3 sentence plain-language summary of auto/GL loss pattern>"
}`

function parseJSON(raw: string): unknown {
  // Strip any accidental markdown fences the model might add
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
  return JSON.parse(cleaned)
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fileBase64, mediaType = 'application/pdf', clientName, clientCompany } = body

    if (!fileBase64) {
      return NextResponse.json({ success: false, error: 'fileBase64 is required' }, { status: 400 })
    }

    // ── STAGE 1: CLASSIFIER ──────────────────────────────────────────────────
    const classifierResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: 'You are an expert insurance document analyst. Your only job is to classify a loss run document and return a metadata JSON object. You do not analyze claims. You only identify what type of document this is and what data fields are present.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: fileBase64,
              },
            } as any,
            {
              type: 'text',
              text: CLASSIFIER_PROMPT,
            },
          ],
        },
      ],
    })

    const classifierRaw = classifierResponse.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as any).text)
      .join('')

    let classifier: unknown
    try {
      classifier = parseJSON(classifierRaw)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Classifier returned unparseable JSON',
          raw: classifierRaw,
        },
        { status: 500 }
      )
    }

    // ── STAGE 2: EXTRACTOR ───────────────────────────────────────────────────
    const extractorPrompt = EXTRACTOR_PROMPT.replace(
      '{{classifier_output}}',
      JSON.stringify(classifier, null, 2)
    )

    const extractorResponse = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8000,
      system: 'You are an expert insurance claims analyst. You extract structured data from loss run documents to produce client reports. You only populate fields supported by the actual document. You never invent or estimate figures. You write plain-language observations a business owner can understand.',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: fileBase64,
              },
            } as any,
            {
              type: 'text',
              text: extractorPrompt,
            },
          ],
        },
      ],
    })

    const extractorRaw = extractorResponse.content
      .filter((b) => b.type === 'text')
      .map((b) => (b as any).text)
      .join('')

    let report: unknown
    try {
      report = parseJSON(extractorRaw)
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Extractor returned unparseable JSON',
          classifier,
          raw: extractorRaw,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        classifier,
        report,
        meta: {
          clientName: clientName || null,
          clientCompany: clientCompany || null,
          analyzedAt: new Date().toISOString(),
        },
      },
    })
  } catch (err: any) {
    console.error('[analyze-loss-run]', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}