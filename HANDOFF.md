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
| Auth | JWT in httpOnly cookies | Simple, self-contained, no DB |
| Persistence | Flat JSON files in `/data/` | No DB setup, committed to repo |
| AI | Anthropic SDK (`claude-sonnet-4-20250514`) | Two-stage PDF extraction |
| Excel Export | `xlsx` npm package | Client-side Excel generation |
| Deployment | Vercel (GitHub integration) | Zero-config, works with App Router |

---

## Project Structure

```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Home — lists pages the logged-in user can access
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── users/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── pages/
│   │       ├── page.tsx
│   │       └── [id]/page.tsx
│   ├── loss-run-analyzer/
│   │   └── page.tsx                      # Loss Run Analyzer — primary production feature
│   └── test/
│       └── page.tsx                      # Demo page
├── components/
│   ├── ui/                               # Reusable primitives
│   └── admin/                            # Admin-specific components
├── data/
│   ├── users.json
│   ├── pages.json
│   └── prompts.json
├── lib/
│   ├── auth.ts                           # JWT sign/verify, session read, password hash
│   ├── data.ts                           # Type-safe read/write helpers for JSON files
│   ├── prompts.ts                        # Prompt lookup, {{variable}} interpolation
│   └── exportToExcel.ts                  # Client-side Excel export for loss run reports
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
│   │   └── prompts/[id]/route.ts
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

### `/data/users.json`
```json
[
  {
    "id": "uuid-v4",
    "name": "Jane Admin",
    "email": "jane@example.com",
    "passwordHash": "bcrypt-hash",
    "role": "admin",
    "allowedPages": []
  },
  {
    "id": "uuid-v4",
    "name": "John User",
    "email": "john@example.com",
    "passwordHash": "bcrypt-hash",
    "role": "user",
    "allowedPages": ["loss-run-analyzer", "test"]
  }
]
```

### `/data/pages.json`
```json
[
  {
    "id": "uuid-v4",
    "name": "Loss Run Analyzer",
    "slug": "loss-run-analyzer",
    "description": "Upload a loss run PDF to extract structured claims data and generate a client-ready report.",
    "variables": []
  }
]
```

---

## Environment Variables

### Required in `.env` (never commit)
```
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=a-long-random-string-minimum-32-chars
```

### `.env.example` (committed — template only)
```
ANTHROPIC_API_KEY=
JWT_SECRET=
```

**Generate JWT_SECRET:** `openssl rand -base64 32`

**Important:** If JWT_SECRET changes, all existing sessions are invalidated. Users must log out and log back in.

---

## Authentication & Authorization

### How it works
1. User POSTs to `/api/auth/login` with email + password
2. Server checks `users.json`, verifies bcrypt hash
3. On success: signs JWT `{ id, email, role, allowedPages }` with `JWT_SECRET`, sets as httpOnly cookie `session` (7-day expiry)
4. `middleware.ts` runs on every request:
   - `/admin/*` → requires `role === "admin"`, redirects to `/login` otherwise
   - `/api/admin/*` → same admin check, returns 401 JSON
   - `/api/analyze-loss-run` → requires valid session (any role)
   - `/loss-run-analyzer`, `/test` → requires valid session + slug in `allowedPages[]`
5. Logout clears cookie, redirects to `/login`

### middleware.ts matcher
```typescript
export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/api/analyze-loss-run", "/test", "/loss-run-analyzer"],
}
```

### Password Reset
Admin sets new password via Admin UI → PUT `/api/admin/users/[id]` with `{ password }` → bcrypt hashed, stored in `users.json`.

### Default Admin Account
- Email: `admin@admin.com`
- Password: `changeme` — **change immediately on first deploy**

---

## API Reference

All responses: `{ success: boolean, data?: any, error?: string }`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Login, sets session cookie |
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

---

## Design System Summary

- **Font:** Inter 300/400/500 from Google Fonts
- **Colors:** All via CSS custom properties (`hsl(var(--token))`), never hardcoded inline
- **Theme:** Light by default; dark mode via `.dark` class on `<html>`
- **Radius:** Base `0.5rem`
- **Shadows:** `shadow-sm` max
- **Icons:** Lucide React throughout
- **Inline styles:** Use `hsl(var(--token))` syntax — raw `var(--token)` will not render correctly

---

## Local Development

```bash
npm install
# ensure .env has ANTHROPIC_API_KEY and JWT_SECRET
npm run dev
# → http://localhost:3000
# Login: admin@admin.com / changeme
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel dashboard
3. Add env vars in Vercel project settings:
   - `ANTHROPIC_API_KEY`
   - `JWT_SECRET`
4. Deploy — zero config, Next.js auto-detected

**Note on flat files:** `/data/*.json` are committed and deployed with the build. Admin UI writes mutate the server filesystem. On Vercel serverless this works for low-traffic use but resets on redeploy. For production persistence, migrate to Postgres or Supabase.

---

## Known Limitations & Next Steps

| Item | Current State | Suggested Fix |
|---|---|---|
| Rate limits | 30K tokens/min hits on 32+ page PDFs | Upgrade Anthropic tier or add delay between classifier/extractor |
| Persistence | Flat JSON resets on redeploy | Add Postgres/Supabase |
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