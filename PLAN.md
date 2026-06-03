# Alloy — Build Plan

## Progress Overview

| Phase | Status | Description |
|---|---|---|
| 1 — Foundation | ✅ Done | T3 scaffold, Prisma schema, env config, NextAuth, root redirect |
| 2 — Dashboard | ✅ Done | Session list, create / delete / duplicate, navigation |
| 3 — Session Page Layout | ✅ Done | Split-panel, header, chat panel, preview panel, version tabs |
| 4 — AI Generation + Versioning | ✅ Done | Claude API, version.generate, iframe preview, version nav |
| 5 — Polish & Deployment | ⏳ Blocked | Needs env vars filled → then run & test → then Vercel deploy |

---

## Phase Details

### ✅ Phase 1 — Foundation
- [x] T3 app scaffolded (`create-t3-app`, App Router, tRPC, Prisma, NextAuth, Tailwind)
- [x] `prisma/schema.prisma` — `Project`, `Version`, NextAuth adapter models
- [x] `src/env.js` — env validation for GitHub, Google, Anthropic, DB vars
- [x] `.env` — template with instructions for each variable
- [x] `src/server/auth/config.ts` — GitHub + Google providers (replaced Discord)
- [x] `src/app/page.tsx` — root redirect (logged in → dashboard, guest → login)
- [x] `CLAUDE.md` — project conventions
- [x] `README.md` — setup instructions + env var table

### ✅ Phase 2 — Dashboard
- [x] `session.list` — fetch all sessions for user, ordered by updatedAt
- [x] `session.create` — creates empty project, redirects to session page
- [x] `session.delete` — removes session + cascade versions
- [x] `session.duplicate` — deep copy: new project + all versions cloned
- [x] `/dashboard` page with `HydrateClient` prefetch
- [x] `SessionGrid` — grid layout, loading skeletons, empty state
- [x] `SessionCard` — title, version count, last prompt preview, hover actions
- [x] `NewSessionButton` integrated into grid header

### ✅ Phase 3 — Session Page Layout
- [x] `/session/[id]` page (server component with auth guard + prefetch)
- [x] `SessionView` — client root: orchestrates state, mutations
- [x] `SessionHeader` — back link, inline-editable title, duplicate button
- [x] `ChatPanel` — scrollable version history, auto-scroll to bottom
- [x] `PromptInput` — auto-resizing textarea, Enter to send, Shift+Enter for newline
- [x] `PreviewPanel` — versions tab bar + iframe area
- [x] `VersionsTab` — tab per version + generating indicator
- [x] `PreviewIframe` — sandboxed iframe, HTML written via `document.write`

### ✅ Phase 4 — AI Generation + Versioning
- [x] `src/lib/claude.ts` — `generateUI(prompt, previousHtml?)` using `claude-sonnet-4-6`
- [x] `version.generate` tRPC mutation:
  - Resolves parent HTML from active version (fork from any version)
  - Calls Claude API
  - Saves Version row with `versionNumber` sequence
  - Auto-sets session title from first prompt (first 60 chars)
  - Updates `project.updatedAt` in same transaction
- [x] New version tab activates automatically after generation
- [x] Clicking a version tab swaps iframe to that version's HTML
- [x] Generating indicator in tab bar + chat panel

### ⏳ Phase 5 — Polish & Deployment
- [ ] **Blocked: fill `.env` first** (see below)
- [ ] Run `pnpm db:push` to create tables
- [ ] Start `pnpm dev`, test end-to-end
- [ ] Fix any runtime issues found during testing
- [ ] Verify version forking works (send prompt from v1, confirm v3 forks from v1 HTML)
- [ ] Verify session duplicate carries all versions
- [ ] Vercel deployment + production env vars

---

## Blocked On: Fill `.env`

These 8 values must be filled before the app can start:

```env
DATABASE_URL=       # Step 1 below
DIRECT_URL=         # Step 1 below
AUTH_GITHUB_ID=     # Step 2 below
AUTH_GITHUB_SECRET= # Step 2 below
AUTH_GOOGLE_ID=     # Step 3 below
AUTH_GOOGLE_SECRET= # Step 3 below
ANTHROPIC_API_KEY=  # Step 4 below
AUTH_SECRET=        # Already generated — leave as-is
```

### Step 1 — Database (Supabase, free tier)
1. Go to https://supabase.com → New project
2. Settings → Database → Connection string
3. Copy **Transaction pooler** URI → `DATABASE_URL`
4. Copy **Direct connection** URI → `DIRECT_URL`
5. Replace `[YOUR-PASSWORD]` placeholder with your project password in both

### Step 2 — GitHub OAuth
1. https://github.com/settings/applications/new
2. App name: `Alloy` (or anything)
3. Homepage URL: `http://localhost:3000`
4. Callback URL: `http://localhost:3000/api/auth/callback/github`
5. Register → copy **Client ID** → `AUTH_GITHUB_ID`
6. Generate a client secret → `AUTH_GITHUB_SECRET`

### Step 3 — Google OAuth
1. https://console.cloud.google.com/apis/credentials
2. Create project (if needed) → Create Credentials → OAuth 2.0 Client ID
3. Application type: Web application
4. Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
5. Copy **Client ID** → `AUTH_GOOGLE_ID`
6. Copy **Client secret** → `AUTH_GOOGLE_SECRET`

### Step 4 — Anthropic API Key
1. https://console.anthropic.com/
2. API Keys → Create Key
3. Copy → `ANTHROPIC_API_KEY`
4. Make sure your account has access to `claude-sonnet-4-6`

---

## After Filling `.env`

```bash
pnpm db:push   # creates all tables in PostgreSQL
pnpm dev       # starts app at http://localhost:3000
```

---

## File Map

```
src/
  app/
    page.tsx                    ✅ root redirect
    login/page.tsx              ✅ GitHub + Google sign-in
    dashboard/page.tsx          ✅ session list
    session/[id]/page.tsx       ✅ main app view
  components/
    dashboard/
      SessionGrid.tsx           ✅ session list + create button
      SessionCard.tsx           ✅ card with duplicate/delete
    session/
      SessionView.tsx           ✅ root client component
      SessionHeader.tsx         ✅ title + duplicate
      ChatPanel.tsx             ✅ version history + scroll
      PromptInput.tsx           ✅ textarea + send
      PreviewPanel.tsx          ✅ versions tab + iframe area
      VersionsTab.tsx           ✅ tab bar
      PreviewIframe.tsx         ✅ sandboxed iframe
  server/api/routers/
    session.ts                  ✅ CRUD + duplicate
    version.ts                  ✅ Claude generation + versioning
  lib/
    claude.ts                   ✅ Anthropic SDK wrapper
    utils.ts                    ✅ formatDistanceToNow
  env.js                        ✅ env validation
prisma/
  schema.prisma                 ✅ Project, Version, NextAuth models
CLAUDE.md                       ✅ project conventions
README.md                       ✅ setup guide
PLAN.md                         ✅ this file
ARCHITECTURE.md                 ✅ decisions + tradeoffs
```
