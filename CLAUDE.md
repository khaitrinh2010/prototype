# Alloy — CLAUDE.md

## Project Overview
AI-powered UI prototyping tool. Users create sessions, type prompts, and Claude generates HTML/CSS previews. Each prompt creates a versioned snapshot; users can navigate between versions and duplicate sessions.

## Tech Stack
- **Framework**: Next.js 15 (App Router), React 19
- **API**: tRPC v11 + React Query
- **DB**: Prisma + PostgreSQL (Supabase/Neon)
- **Auth**: NextAuth v5 (GitHub + Google)
- **AI**: Anthropic SDK (`claude-sonnet-4-6`)
- **Styles**: Tailwind CSS v4

## Key Conventions

### Naming
- Prisma model for user work sessions = `Project` (not `Session` — that's taken by NextAuth)
- tRPC router = `session.*` (user-facing API language)
- UI terminology = "session" throughout the UI

### File Structure
```
src/
  app/           # Next.js pages (server components)
  components/
    dashboard/   # Dashboard-specific components
    session/     # Session page components
  server/api/routers/  # tRPC routers (session.ts, version.ts)
  lib/           # Shared utilities (claude.ts, utils.ts)
```

### tRPC Routers
- `session.*` → CRUD for Project model
- `version.generate` → calls Claude API, creates Version row

### Auth
- All session/version routes use `protectedProcedure` (throws if not authed)
- Auth config: `src/server/auth/config.ts`

### AI Generation
- `src/lib/claude.ts` — single `generateUI(prompt, previousHtml?)` function
- Model: `claude-sonnet-4-6`, max 8192 tokens
- Returns raw HTML string; strips markdown fences if present

### Preview
- HTML rendered in `<iframe sandbox="allow-scripts allow-same-origin">`
- Written via `document.write()` on HTML changes

## Database Commands
```bash
pnpm db:push       # push schema changes to DB (dev)
pnpm db:generate   # create migration files
pnpm db:migrate    # apply migrations (prod)
pnpm db:studio     # open Prisma Studio
```

## Do Not
- Add Discord provider (removed in favor of GitHub + Google)
- Use `Post` model (removed from scaffold)
- Use `Session` as a model name (conflicts with NextAuth)
- Add streaming to Claude calls (intentionally all-at-once)
