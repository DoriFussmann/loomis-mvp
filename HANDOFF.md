# Project Scaffold — Engineer Handoff Document

> **This file is auto-maintained.** Per `.cursorrules`, any change to architecture, auth, data shape, routes, env vars, or deployment must update this document. It is the single source of truth for any engineer picking up this project.

---

## What This Is

A lightweight multi-user web application with:
- An **Admin zone** for managing users, pages, and AI prompts
- **User-facing pages** with access controlled per-user by the admin
- **AI-powered interactions** driven entirely by prompts configured in the Admin UI (never hardcoded)
- A **demo flow**: Home → Test page where users input 3 characters and get a short AI-generated story

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Vercel-native, unified frontend + API |
| Language | TypeScript (strict) | Type safety, maintainability |
| Styling | Tailwind CSS | Matches design system spec |
| Auth | JWT in httpOnly cookies | Simple, self-contained, no DB |
| Persistence | Flat JSON files in `/data/` | No DB setup, committed to repo |
| AI | Anthropic SDK (`claude-sonnet-4-20250514`) | Prompt execution |
| Deployment | Vercel (GitHub integration) | Zero-config, works with App Router |

---

## Project Structure

```
/
├── app/
│   ├── layout.tsx                  # Root layout, font, theme
│   ├── page.tsx                    # Home page → dynamically lists pages the logged-in user can access
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx            # Login page (all users)
│   ├── admin/
│   │   ├── layout.tsx              # Admin shell layout + sidebar (max-w-[1080px] applied here)
│   │   ├── page.tsx                # Admin dashboard
│   │   ├── users/
│   │   │   ├── page.tsx            # User management (add/edit/reset password/permissions)
│   │   │   └── [id]/page.tsx       # Edit individual user
│   │   └── pages/
│   │       ├── page.tsx            # Pages & Prompts list (add page)
│   │       └── [id]/page.tsx       # Page detail: left = page fields/variables, right = prompts panel
│   └── test/
│       └── page.tsx                # Demo user-facing page (3 characters → AI story)
├── components/
│   ├── ui/                         # Reusable primitives (Button, Input, Card, Label, etc.)
│   └── admin/                      # Admin-specific components (UserTable, PromptEditor, etc.)
├── data/
│   ├── users.json                  # All user records (committed)
│   ├── pages.json                  # Page registry (committed)
│   └── prompts.json                # All AI prompts (committed)
├── lib/
│   ├── auth.ts                     # JWT sign/verify, session read, password hash (bcrypt)
│   ├── data.ts                     # Type-safe read/write helpers for all JSON files
│   └── prompts.ts                  # Prompt lookup, {{variable}} interpolation
├── app/api/
│   ├── auth/
│   │   ├── login/route.ts          # POST — validates credentials, sets session cookie
│   │   └── logout/route.ts         # POST — clears session cookie
│   ├── admin/
│   │   ├── users/route.ts          # GET/POST — list and create users
│   │   ├── users/[id]/route.ts     # PUT/DELETE — edit or remove a user
│   │   ├── pages/route.ts          # GET/POST — list and create pages
│   │   ├── pages/[id]/route.ts     # PUT/DELETE — edit or remove a page
│   │   ├── prompts/route.ts        # GET/POST — list and create prompts
│   │   └── prompts/[id]/route.ts   # PUT/DELETE — edit or remove a prompt
│   └── run-prompt/route.ts         # POST — executes a prompt with user inputs via Anthropic
├── middleware.ts                   # Route protection (admin role, page-level user access)
├── .cursorrules                    # AI coding rules — read before making changes
├── .env.local                      # Local secrets (NOT committed — see Env Vars section)
├── .env.example                    # Template for required env vars (committed)
├── tailwind.config.ts              # Design system tokens wired into Tailwind
├── globals.css                     # CSS variables (light/dark), base styles
└── HANDOFF.md                      # This file
```

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
    "allowedPages": ["test", "another-page-slug"]
  }
]
```

### `/data/pages.json`
```json
[
  {
    "id": "uuid-v4",
    "name": "Test Page",
    "slug": "test",
    "description": "Demo page with character story generator",
    "variables": [
      { "name": "character1", "description": "First character name" },
      { "name": "character2", "description": "Second character name" },
      { "name": "character3", "description": "Third character name" }
    ]
  }
]
```

### `/data/prompts.json`
```json
[
  {
    "id": "uuid-v4",
    "name": "Character Story",
    "pageSlug": "test",
    "template": "Write a short story of exactly 200 words featuring three characters: {{character1}}, {{character2}}, and {{character3}}. Make it engaging and fun.",
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }
]
```

**Variable syntax:** `{{variableName}}` — interpolated server-side before sending to Anthropic. Variable names must match entries in the page's `variables[]` array.

---

## Environment Variables

### Required in `.env.local` (never commit this file)
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

---

## Authentication & Authorization

### How it works
1. User POSTs to `/api/auth/login` with email + password
2. Server checks `users.json`, verifies bcrypt hash
3. On success: signs JWT `{ id, email, role, allowedPages }` with `JWT_SECRET`, sets as httpOnly cookie `session` (7-day expiry)
4. `middleware.ts` runs on every request:
   - `/admin/*` → requires `role === "admin"`, redirects to `/login` otherwise
   - `/test` (and other user pages) → requires valid session + page slug in `allowedPages[]` (read from JWT)
   - `/api/admin/*` → same admin check, returns 401 JSON instead of redirect
5. Logout (`POST /api/auth/logout`) clears the cookie and redirects to `/login`

### Password Reset
Admin sets a new password via Admin UI → `/api/admin/users/[id]` PUT with `{ password }` → hashed with bcrypt, stored in `users.json`. No email flow — admin communicates new password directly.

### Default Admin Account
Seeded in `users.json` on first deploy:
- Email: `admin@admin.com`
- Password: `changeme` (change immediately)

---

## API Reference

All responses: `{ success: boolean, data?: any, error?: string }`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | None | Login, sets session cookie |
| POST | `/api/auth/logout` | Any | Clears session cookie |
| GET | `/api/admin/users` | Admin | List all users |
| POST | `/api/admin/users` | Admin | Create user |
| PUT | `/api/admin/users/[id]` | Admin | Update user (name, email, password, role, allowedPages) |
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

---

## Prompt System (Critical)

**Rule:** Prompts are NEVER in source code. They live exclusively in `/data/prompts.json` and are managed via the Admin UI.

**How a prompt runs:**
1. User fills form on a page (e.g., 3 character names)
2. Frontend POSTs to `/api/run-prompt` with `{ promptId, variables: { character1: "...", ... } }`
3. Server loads prompt from `prompts.json`
4. `/lib/prompts.ts` interpolates `{{variable}}` placeholders with actual values
5. Resolved string is sent to Anthropic API
6. Response streamed back to client

**Variable Inspector (Admin UI):**
In the Pages & Prompts detail view (right panel), when adding or editing a prompt, the UI shows all `variables[]` defined for that page. Admin can click any variable chip to insert `{{variableName}}` at the cursor position in the template. No page selector is needed since prompts are always created in the context of their page.

---

## Adding a New Page (Process)

1. **Admin UI → Pages & Prompts → Add Page**: fill name, slug, description, define variables → writes to `/data/pages.json`
2. Create the actual Next.js page at `/app/[slug]/page.tsx` (see `/app/test/page.tsx` as reference)
3. Add the slug to the `protectedPages` array in `middleware.ts` so it is access-controlled
4. **Admin UI → Pages & Prompts → click the page → right panel → Add Prompt**: write the template using `{{variableName}}` chips
5. **Admin UI → Users → edit user**: add the new slug to their `allowedPages`
6. Update `HANDOFF.md` with the new page details

---

## Design System Summary

Full spec in `.cursorrules`. Key points:
- **Font:** Inter 300/400/500 from Google Fonts
- **Colors:** All via CSS custom properties (`hsl(var(--token))`), never hardcoded
- **Theme:** Light by default; dark mode via `.dark` class on `<html>`
- **Radius:** Base `0.5rem`, component variants lg/md/sm
- **Shadows:** `shadow-sm` max — never heavy
- **Icons:** Lucide React throughout

---

## Local Development

```bash
# Install
npm install

# Set up env
cp .env.example .env.local
# Fill in ANTHROPIC_API_KEY and JWT_SECRET

# Run
npm run dev
# → http://localhost:3000

# Login
# admin@admin.com / changeme
```

---

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in Vercel dashboard
3. Add env vars in Vercel project settings:
   - `ANTHROPIC_API_KEY`
   - `JWT_SECRET`
4. Deploy — zero config needed, Next.js is auto-detected

**Note on flat files:** `/data/*.json` are committed to the repo and deployed with the build. Writes via the Admin UI mutate these files on the server filesystem. On Vercel's serverless/edge this works for low-traffic use — the files persist within a deployment but reset on redeploy. For production persistence beyond a demo, migrate to a database (Postgres via Vercel, or Supabase).

---

## Known Limitations & Future Considerations

| Item | Current State | Suggested Fix |
|---|---|---|
| Persistence | Flat JSON files reset on redeploy | Add Postgres/Supabase |
| Password reset | Admin manual only | Add email flow (Resend/SendGrid) |
| Prompt versioning | None | Add history/audit log to prompts.json |
| File uploads | Not supported | Add S3/Vercel Blob if needed |
| Rate limiting | None on AI route | Add middleware rate limiting |
| Streaming | Full response, not streamed | Switch to Vercel AI SDK streaming |

---

## Contacts / Ownership

*Fill in before handoff:*
- Project owner:
- Original developer:
- Repository:
- Vercel project:
- Domain / DNS:
