# Project Scaffold — Engineer Handoff Document

> **This file is auto-maintained.** Per `.cursorrules`, any change to architecture, auth, data shape, routes, env vars, or deployment must update this document. It is the single source of truth for any engineer picking up this project.

---

## What This Is

A lightweight multi-user web application built for **Loomis Insurance** with:
- An **Admin zone** for managing users, pages, and AI prompts
- **User-facing pages** with access controlled per-user by the admin
- **AI-powered interactions** driven entirely by prompts configured in the Admin UI (never hardcoded)
- A **Loss Run Analyzer** — the primary production feature: upload any loss run PDF, get a structured report + Excel export
- A **demo flow**: Home → Test page where users input 3 characters and get a short AI-generated story

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Vercel-native, unified frontend + API |
| Language | TypeScript (strict) | Type safety, maintainability |
| Styling | Tailwind CSS + inline styles | Matches design system spec; inline styles used where CSS variables require `hsl()` wrapping |
| Auth | Supabase Auth (email/password) | Managed auth, secure session cookies |
| Persistence | Supabase Postgres (`users`, `pages`, `prompts`, `clients`, `gap_quote_*`) | Durable production data on Vercel |
| AI | Anthropic SDK (`claude-sonnet-4-6`) | Two-stage PDF extraction + GAP email parse |
| Excel | `xlsx` npm package | Census parse, rate-card import, Excel export |
| PDF generation | `@react-pdf/renderer` | Branded GAP quote proposals |
| PDF read | `pdf-lib` | Form-field extraction only (not generation) |
| Deployment | Vercel (GitHub integration) | Zero-config, works with App Router |

---

## Project Structure

```
/
├── app/
│   ├── layout.tsx                        # Root layout — Inter font (next/font/google), html/body only
│   ├── page.tsx                          # Root router — sends user to /pnc, /benefits, /admin, or /login
│   ├── (auth)/
│   │   └── login/page.tsx                # Standalone login — no global header
│   ├── (app)/                            # Route group: all user-facing pages
│   │   ├── layout.tsx                    # Provides SiteHeader + max-w-[1280px] mx-auto px-6 py-8 main
│   │   ├── pnc/page.tsx                  # Property & Casualty dashboard
│   │   ├── benefits/page.tsx             # Benefits dashboard
│   │   ├── employer-application/
│   │   │   ├── page.tsx
│   │   │   └── ui-client.tsx             # Upload, scan, animated section results, summary, excel export
│   │   ├── claims-validation/
│   │   │   ├── page.tsx
│   │   │   └── ui-client.tsx
│   │   ├── gap-quote/
│   │   │   ├── page.tsx
│   │   │   └── ui-client.tsx             # Email + census → checks → tiers → proposal
│   │   ├── loss-run-analyzer/
│   │   │   └── page.tsx                  # Loss Run Analyzer — primary production feature
│   │   └── test/
│   │       └── page.tsx                  # Demo page
│   ├── admin/
│   │   ├── layout.tsx                    # Admin top nav (logo + Admin badge + nav links + logout)
│   │   ├── page.tsx
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── pages/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── gap-rates/
│   │       └── page.tsx                  # Rate-card import + admin fee + rate rows
├── components/
│   ├── site-header.tsx                   # Global top nav: Loomis logo + Sign out (used by (app)/ layout)
│   ├── department-dashboard.tsx          # Dept dashboard with collapsible sidebar + tool cards
│   ├── ui/                               # Reusable primitives
│   └── admin/                            # Admin-specific components
├── data/
│   ├── users.json
│   ├── pages.json
│   └── prompts.json
├── lib/
│   ├── auth.ts                           # Session payload from Supabase auth + profile row
│   ├── data.ts                           # Type-safe Supabase read/write helpers
│   ├── supabase/
│   │   ├── env.ts                        # Required env accessors
│   │   ├── admin.ts                      # Service-role Supabase client
│   │   ├── server.ts                     # Server/route Supabase client with cookie bridge
│   │   └── middleware.ts                 # Middleware Supabase client wrapper
│   ├── prompts.ts                        # Prompt lookup, {{variable}} interpolation
│   ├── employerApplication/
│   │   ├── schema.ts                     # Canonical section/field map for Employer Agreement
│   │   └── extract.ts                    # Hybrid extraction (form fields + AI fallback)
│   ├── gapQuote/
│   │   ├── schema.ts
│   │   ├── extract.ts                    # Anthropic parse of pasted broker email
│   │   ├── parseCensus.ts                # xlsx census → subscriber + tier counts
│   │   ├── parseRateCard.ts              # Locked mapping to Loomis U100 rate card
│   │   ├── eligibility.ts
│   │   ├── rateLookup.ts
│   │   ├── analyze.ts
│   │   └── proposalPdf.tsx               # 5-page branded proposal
│   └── exportToExcel.ts                  # Client-side Excel export for loss run reports
├── reference/gap-quote/
│   ├── rate-card.xlsx                    # Loomis U100 rate card (importer source of truth)
│   └── proposal-sample.pdf               # Branded proposal layout reference
├── app/api/employer-application/
│   └── extract/route.ts                  # POST — Employer Agreement field extraction
├── lib/exportEmployerApplicationToExcel.ts # Client-side Field/Value export for Employer Application
├── scripts/
│   ├── import-json-to-supabase.mjs       # One-time JSON -> Supabase import
│   └── verify-supabase-parity.mjs        # JSON vs Supabase parity check
├── supabase/
│   └── migrations/
│       ├── 20260515_initial_schema.sql   # Tables + RLS policies + helper functions
│       └── 20260812_gap_quote_rates.sql  # GAP rate buckets, rates, admin fee
├── app/api/
│   ├── auth/
│   │   ├── login/route.ts
│   │   └── logout/route.ts
│   ├── admin/
│   │   ├── users/route.ts
│   │   ├── users/[id]/route.ts
│   │   ├── pages/route.ts
│   │   ├── pages/[id]/route.ts
│   │   ├── prompts/route.ts
│   │   ├── prompts/[id]/route.ts
│   │   ├── gap-rates/route.ts
│   │   ├── gap-rates/[id]/route.ts
│   │   └── gap-rates/import/route.ts
│   ├── gap-quote/
│   │   └── analyze/route.ts              # POST — email + census → checks + pricing
│   ├── analyze-loss-run/
│   │   └── route.ts                      # POST — two-stage PDF extraction via Anthropic
│   └── run-prompt/route.ts
├── middleware.ts                          # Route protection
├── .cursorrules
├── .env                                   # Secrets (NOT committed)
├── .env.example
├── tailwind.config.ts
├── globals.css
└── HANDOFF.md
```

---

## Loss Run Analyzer — Full Feature Documentation

### What it does
Accepts any insurance loss run PDF, runs a two-stage AI extraction, and produces:
- A structured visual report in the browser (summary cards, year-over-year chart, coverage breakdown, large claims table, observations)
- A downloadable Excel file with 4–6 tabs depending on coverage types present

### Supported input formats
Three formats have been validated:
| Format | Example | Coverage |
|---|---|---|
| WC claim-level detail | Just Ducky Farms (AF Group) | Workers Comp |
| Package auto/property | Joe's Duck Farm (Penn Millers) | Auto + Property |
| Auto/GL package | Construction Masters (Cincinnati) | Auto + GL |

### Two-stage extraction architecture

**Why two stages:** A single prompt trying to detect format AND extract data produces hallucinated fields. The classifier creates a contract — the extractor only attempts what the contract explicitly allows.

**Stage 1 — CLASSIFIER** (`/api/analyze-loss-run/route.ts`)
- Reads the PDF and returns a metadata JSON object
- Identifies: insured name, carrier, document format, coverage lines, policy years, valuation date, available fields (has_claim_numbers, has_body_part, has_reserves, etc.)
- Max tokens: 1000
- If classifier returns unparseable JSON → error returned, extraction aborted

**Stage 2 — EXTRACTOR**
- Receives classifier output as context + same PDF
- Only populates sections the classifier confirmed exist
- `wc_detail` is null unless `workers_comp` is in coverage_lines
- `auto_gl_detail` is null unless `auto` or `general_liability` is in coverage_lines
- Max tokens: 8000
- If extractor returns unparseable JSON → returns classifier + raw text for debugging

**Output schema:**
```typescript
{
  insured_name, carrier, valued_as_of, coverage_lines,
  loss_summary: { total_claims, open_claims, closed_claims, total_paid, total_reserves, total_incurred, avg_cost_per_claim },
  by_year: [{ year, claim_count, total_paid, total_reserves, total_incurred, open_claims, closed_claims }],
  by_coverage_line: [{ line, claim_count, total_incurred, top_causes: [{ cause, claim_count, total_incurred }] }],
  wc_detail: null | { injury_breakdown, top_body_parts, open_vs_closed, large_claims, summary },
  auto_gl_detail: null | { loss_types, large_claims, summary },
  observations: string[],
  data_quality_notes: string | null
}
```

### API Route
**`POST /api/analyze-loss-run`**
- Auth: protected by middleware (valid session required, no role check)
- Body: `{ fileBase64: string, mediaType: "application/pdf", clientName?: string, clientCompany?: string }`
- Response: `{ success: true, data: { classifier, report, meta } }`
- PDF sent as base64 document block to Anthropic API

### Page flow (`app/loss-run-analyzer/page.tsx`)
1. Upload form (optional client name/company + PDF file picker)
2. Analyze → two API calls happen sequentially
3. Post-analysis view: classifier summary card + collapsed raw JSON panel + "Copy JSON" button + "Continue to Report →"
4. Report view: full visual report with Download Excel button in header

### Excel export (`lib/exportToExcel.ts`)
Client-side only — no server round trip. Uses `xlsx` npm package.
Tabs generated (conditionally):
- **Summary** — always present
- **By Year** — if by_year has data
- **By Coverage Line** — if by_coverage_line has data
- **Large Claims** — if wc or auto/GL large claims exist
- **WC Detail** — only if wc_detail is non-null
- **Observations** — always present

### Rate limit consideration
Anthropic API tier 1 limit is 30K input tokens/minute. Two sequential calls on large PDFs (32+ pages) will hit this limit. Current workaround: use trimmed PDFs for testing. Production fix: upgrade Anthropic account tier, or add a 60-second delay between classifier and extractor calls.

### CSS variable usage — important
All inline styles must wrap CSS variables in `hsl()`:
```typescript
// CORRECT
border: `1px solid hsl(var(--border))`
background: `hsl(var(--muted))`

// WRONG — renders as invalid CSS
border: `1px solid var(--border)`
```
This is because the design system uses raw HSL values without the wrapper (e.g., `35 12% 88%`).

---

## Data Schemas

Primary persistence now lives in Supabase Postgres:
- `public.users` (`id`, `auth_user_id`, `name`, `email`, `role`, `allowed_pages`, `departments`)
- `public.pages` (`id`, `name`, `slug`, `description`, `variables`)
- `public.prompts` (`id`, `name`, `page_slug`, `template`, `created_at`, `updated_at`)

RLS is enabled on all three tables. Policy intent:
- Admin users can read/write all rows.
- Non-admin users can read only rows tied to their allowed page slugs.
- User profile reads are scoped to self unless admin.

Migration SQL source of truth:
- `supabase/migrations/20260515_initial_schema.sql`

Legacy `data/*.json` files are treated as migration seed/backup inputs (not runtime source of truth).

---

## Environment Variables

### Required in `.env` (never commit)
```
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
IMPORT_USER_PASSWORD=<optional migration password default>
```

### `.env.example` (committed — template only)
```
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
IMPORT_USER_PASSWORD=
```

---

## Authentication & Authorization

### How it works
1. User POSTs to `/api/auth/login` with email + password
2. Server uses `supabase.auth.signInWithPassword(...)` to authenticate
3. App resolves authorization context from `public.users` row via `auth_user_id`
4. Supabase manages session cookies; app reads session via `lib/supabase/server.ts`
5. Login response includes a department-based destination:
   - P&C only → `/pnc`
   - Benefits only → `/benefits`
   - Both departments → `/admin`
6. `middleware.ts` runs on protected paths:
   - `/admin/*` → requires `role === "admin"`, redirects to `/login` otherwise
   - `/api/admin/*` → same admin check, returns 401 JSON
   - `/pnc` → requires `departments` contains `P&C` (or admin role)
   - `/benefits` → requires `departments` contains `Benefits` (or admin role)
   - `/employer-application` and `/api/employer-application/*` → requires `Benefits` department (or admin role)
   - `/api/analyze-loss-run` → requires valid session (any role)
   - `/loss-run-analyzer`, `/test` → requires valid session + slug in `allowedPages[]`
7. Logout calls `supabase.auth.signOut()` then redirects to `/login`

### middleware.ts matcher
```typescript
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/analyze-loss-run", "/test", "/loss-run-analyzer", "/pnc", "/benefits", "/employer-application", "/api/employer-application/:path*"],
}
```

### Password Reset
Admin can set a new password via Admin UI. Backend calls `supabase.auth.admin.updateUserById(...)`.

### Default Admin Account
No hardcoded default admin is created in source code.
Create the first admin account in Supabase/Auth import flow before launch.

---

## API Reference

All responses: `{ success: boolean, data?: any, error?: string }`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Login, sets session cookie and returns destination route |
| POST | `/api/auth/logout` | Any | Clears session cookie |
| GET | `/api/admin/users` | Admin | List all users |
| POST | `/api/admin/users` | Admin | Create user |
| PUT | `/api/admin/users/[id]` | Admin | Update user |
| DELETE | `/api/admin/users/[id]` | Admin | Delete user |
| GET | `/api/admin/pages` | Admin | List all pages |
| POST | `/api/admin/pages` | Admin | Create page |
| PUT | `/api/admin/pages/[id]` | Admin | Update page |
| DELETE | `/api/admin/pages/[id]` | Admin | Delete page |
| GET | `/api/admin/prompts` | Admin | List all prompts |
| POST | `/api/admin/prompts` | Admin | Create prompt |
| PUT | `/api/admin/prompts/[id]` | Admin | Update prompt |
| DELETE | `/api/admin/prompts/[id]` | Admin | Delete prompt |
| POST | `/api/run-prompt` | User (page access) | Run a prompt with variable inputs |
| POST | `/api/analyze-loss-run` | User (session) | Two-stage loss run PDF extraction |
| POST | `/api/employer-application/extract` | Benefits/Admin | Extract employer agreement sections/fields, missing flags, and completion metrics |
| POST | `/api/gap-quote/analyze` | Benefits/Admin | Parse email + census, run eligibility checks, price passing groups |
| GET | `/api/admin/gap-rates` | Admin | Load GAP rate catalog (buckets, rates, admin fee) |
| POST | `/api/admin/gap-rates` | Admin | Create a rate row, or save admin fee when `adminFee` is sent without deductible |
| PATCH | `/api/admin/gap-rates/[id]` | Admin | Update a rate row |
| DELETE | `/api/admin/gap-rates/[id]` | Admin | Delete a rate row |
| POST | `/api/admin/gap-rates/import` | Admin | Replace-refresh rates from an uploaded U100 rate card (`fileBase64`) |

---

## GAP Quote Automation

Benefits-department tool (`department === "Benefits"` or admin). Embedded on `/benefits?tool=gap-quote` with `forceLive: true` (no `pages.json` row). Standalone route: `/gap-quote`.

### Flow
1. Paste email subject/body and attach one `.xlsx` census per billing group
2. Checks (staggered): split detection, subscriber lives 5–99, situs state bucket, plan-design match
3. Tier counts for passing groups: EE / EE+SP / EE+CH / Family
4. Results with base rates + admin fee as its own line; download a 5-page branded PDF per group

Census parsing keys off `Rel Code` when present (`SB` subscriber, `SP` spouse, `DE` dependent) and also accepts longer aliases (`Employee`, `Subscriber`, etc.) because broker formats vary. Subscriber tier counts prefer the `Tier Coverage` column on subscriber rows rather than reconstructing family composition. Entity names are proposed from filename, census employer/group fields, and email candidates, with a confidence label. A candidate name is assigned at most once per batch; if two files are genuinely ambiguous (no unique filename or in-file signal), both stay low-confidence with every candidate in the dropdown. The user must confirm (or type a custom name) before See Proposal / PDF export, except the 1-file / 1-group case which auto-confirms. Results include a **See Proposal** modal for inline edits; Save stays in React state, and PDF export uses the current (possibly edited) values.

Quotes are ephemeral (React state only). The only persisted data is the rate table.

### Rate card mapping (`reference/gap-quote/rate-card.xlsx`, sheet `Rate cards`)
Header row: `Deductible` | `Limit` | five repeating blocks of `EE` | `EE + SP` | `EE + CH` | `FAMILY`

| Columns | Bucket | States |
|---|---|---|
| C–F | Standard States | AL, AR, AZ, DC, FL (5–50 lives), GA, HI, IA, IL, KS, KY, LA, MA, MS, NE, NC, NV, OK, OR, PA, SC, SD, TN, TX, UT, VA, WI, WV, WY |
| G–J | 60% LR states | CO, IN, MO, NH |
| K–N | OH | OH |
| O–R | MI | MI |
| S–V | FL 50–100 lives | FL when subscriber count is 51–99 |

FL uses Standard when lives ≤ 50 and the FL 50–100 bucket when lives ≥ 51. Plan design is deductible × Limit (core benefit).

### Admin
`/admin/gap-rates` — import the spreadsheet (replace-refresh), edit the flat admin fee, add/delete rate rows. Apply `supabase/migrations/20260812_gap_quote_rates.sql` in the Supabase SQL editor before first use, then import `reference/gap-quote/rate-card.xlsx`.

### PDF
`@react-pdf/renderer` 5-page layout matching `reference/gap-quote/proposal-sample.pdf` (cover, about, policyholder info, plan details + monthly rates, bind/signature). `pdf-lib` is not used for generation.

---

## Design System Summary

- **Font:** Inter 300/400/500 via `next/font/google` (CSS variable `--font-inter`)
- **Colors:** All via CSS custom properties (`hsl(var(--token))`), never hardcoded inline
- **Theme:** Light by default; dark mode via `.dark` class on `<html>`
- **Radius:** Base `0.5rem`
- **Shadows:** `shadow-sm` max
- **Icons:** Lucide React throughout
- **Inline styles:** Use `hsl(var(--token))` syntax — raw `var(--token)` will not render correctly
- **Max content width:** 1280px (`max-w-[1280px]`) everywhere
- **Page spacing:** `px-6 py-8` on content wrappers, `gap-6` between cards, `mb-6` below headings
- **Global header height:** `h-14` (56px) — provided by `SiteHeader` or `AdminLayout`
- **Route groups:** `(auth)/` = no header; `(app)/` = SiteHeader + standard padding; `admin/` = admin top nav

---

## Local Development

```bash
npm install
# ensure .env has ANTHROPIC_API_KEY + Supabase env vars
npm run dev
# → http://localhost:3000
```

### One-time migration commands
```bash
# 1) Apply SQL in Supabase SQL editor:
#    supabase/migrations/20260515_initial_schema.sql
#    supabase/migrations/20260812_gap_quote_rates.sql

# 2) Import legacy JSON data into Supabase:
npm run import:supabase

# 3) Verify parity (IDs/counts) between data/*.json and Supabase:
npm run verify:supabase
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel dashboard
3. Add env vars in Vercel project settings:
   - `ANTHROPIC_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy — zero config, Next.js auto-detected

---

## Known Limitations & Next Steps

| Item | Current State | Suggested Fix |
|---|---|---|
| Rate limits | 30K tokens/min hits on 32+ page PDFs | Upgrade Anthropic tier or add delay between classifier/extractor |
| Persistence | Supabase-backed, durable | Add backups and point-in-time restore policy |
| Password reset | Admin manual only | Add email flow (Resend/SendGrid) |
| Multi-file upload | Single PDF only | Combine classifier outputs, send all PDFs to one extractor call |
| Excel styling | Basic — no charts | Add chart sheets using xlsx chart API |
| Benchmarking | Removed (no reliable data source) | Add if Loomis provides benchmark data |
| Streaming | Full response only | Switch to Vercel AI SDK streaming for better UX on large files |

---

## Client Context — Loomis Insurance

- **James** — owner/decision maker (son of founder). Responds to demos, asked for Excel export specifically.
- **Michelle** — account management, originated the loss run request, defines requirements.
- **Jon** — internal contact who brought this project in.
- **Sheri** — account management, sends sample files.

**What they want:** Drop loss run PDFs in → get client-ready reports without manual work. Currently takes many man-hours to produce these reports manually.

**Key signal from James:** He forwarded the first demo internally and asked for Excel output unprompted. That's the green light.

**Next likely asks:**
- Multi-year package loss runs with many lines of business
- Benchmarking against industry averages (they'll need to provide data)
- More polished output matching their existing report style (Example.pdf in repo)
- User accounts for individual brokers/clients

---

## Contacts / Ownership

- Project owner: Dori / The Night Ventures
- Vercel project: (fill in)
- Domain / DNS: epicaiproducts.com (fill in Vercel domain config)