# Alloy — Architecture & Key Decisions

## System Overview

```
Browser
  │
  ├── Next.js App Router (React 19, Server + Client Components)
  │     ├── /login          → NextAuth sign-in page
  │     ├── /dashboard      → Server component + tRPC prefetch
  │     └── /session/[id]   → Server component + tRPC prefetch
  │
  ├── tRPC v11 (HTTP layer, type-safe API)
  │     ├── session.*       → CRUD on Project model
  │     └── version.*       → Claude generation + Version model
  │
  ├── Prisma ORM → PostgreSQL (Supabase / Neon)
  │
  ├── NextAuth v5 → GitHub + Google OAuth
  │
  └── Anthropic SDK → claude-sonnet-4-6
```

---

## Request Flows

### Flow 1 — User sends a prompt (core loop)

```
PromptInput (user hits Enter)
  └── onSend(prompt)
        └── SessionView.handleSendPrompt(prompt)
              └── version.generate.mutate({ sessionId, prompt, parentVersionId })
                    │
                    │  [HTTP POST /api/trpc/version.generate]
                    │
                    └── version.ts → generate()
                          ├── db.project.findFirst({ id, userId })     — auth check
                          ├── resolve parentVersion?.htmlContent        — fork context
                          ├── generateUI(prompt, previousHtml?)         — lib/claude.ts
                          │     └── anthropic.messages.create(...)      — Claude API
                          ├── db.$transaction([
                          │     version.create({ versionNumber, prompt, htmlContent }),
                          │     project.update({ title?, updatedAt })
                          │   ])
                          └── return Version
                                │
                                └── onSuccess → utils.session.getById.invalidate()
                                      └── React Query refetch
                                            └── SessionView re-renders
                                                  ├── setActiveVersionId(newVersion.id)
                                                  ├── VersionsTab shows new tab (active)
                                                  └── PreviewIframe.useEffect → document.write(html)
```

### Flow 2 — User clicks a version tab

```
VersionsTab → onSelect(versionId)
  └── SessionView.setActiveVersionId(versionId)      — local state, no network call
        └── PreviewPanel receives new activeVersionId
              └── activeVersion = versions.find(v => v.id === activeVersionId)
                    └── PreviewIframe receives new html prop
                          └── useEffect([html]) → doc.open() → doc.write(html) → doc.close()
```

No network call — all version HTML is already in memory from the initial `session.getById` fetch.

### Flow 3 — User opens a session from dashboard

```
/dashboard → SessionCard.onClick → router.push(/session/[id])
  │
  └── /session/[id]/page.tsx  (Server Component)
        ├── auth()                                    — NextAuth session check
        ├── api.session.getById.prefetch({ id })      — server-side tRPC call
        │     └── db.project.findFirst + versions[]   — single DB query
        └── <HydrateClient>
              └── SessionView (Client Component)
                    ├── api.session.getById.useQuery() — hydrated from prefetch (0 network round-trips)
                    ├── activeVersionId = last version by default
                    └── renders ChatPanel + PreviewPanel
```

### Flow 4 — User duplicates a session

```
SessionHeader → onDuplicate()
  └── session.duplicate.mutate({ id })
        └── session.ts → duplicate()
              ├── db.project.findFirst({ id, userId, include: versions })
              └── db.project.create({
                    title: original.title + " (copy)",
                    userId,
                    versions: { create: versions.map(v => ({ ...v })) }
                  })
                    └── onSuccess → router.push(/session/[newId])
```

### Flow 5 — Auth (first-time login)

```
/login → signIn("github") or signIn("google")
  └── NextAuth → OAuth provider redirect
        └── callback → /api/auth/callback/[provider]
              └── PrismaAdapter
                    ├── User.upsert (create if first login)
                    ├── Account.create (link OAuth account)
                    └── Session.create (DB session token)
                          └── redirect → /dashboard
```

---

## Data Model

```
User
  └── Project (called "session" in UI)
        └── Version[]
              ├── versionNumber   (1, 2, 3…)
              ├── prompt          (user's input text)
              └── htmlContent     (Claude's generated HTML)
```

**Why `Project` not `Session`:**
NextAuth v5 uses a `Session` model for auth session tokens. Naming our model `Session` would create a Prisma conflict. `Project` is used in the database layer; the word "session" is used everywhere in the UI.

---

## Key Decisions

### 1. HTML/CSS in a sandboxed iframe (not React components)

**Decision:** Claude returns raw `<!DOCTYPE html>` documents rendered in `<iframe sandbox="allow-scripts allow-same-origin">`.

**Why chosen over React components:**
- Claude generates HTML/CSS much more reliably than JSX
- No need for a transpiler (Babel/SWC) running in the browser
- Self-contained — no missing imports, no module resolution
- Isolated from the parent app (CSS can't leak out, JS can't navigate parent)

**Tradeoff:** The preview is a static snapshot — no real React interactivity. Good enough for UI prototyping.

**Can we do better?** Yes: switch to Sandpack (CodeSandbox's in-browser bundler) for full React previews. Adds ~300KB to the bundle and complexity. Worth it later if users need interactive React prototypes.

---

### 2. Version forking from the active tab

**Decision:** When you type a new prompt while viewing v1 (not the latest), the new version forks from v1's HTML — not the latest version.

**Why:** Lets users explore "what if" branches. Like git branches but for UI states.

**How it works:** `SessionView` tracks `activeVersionId`. When `version.generate` is called, it passes `parentVersionId: activeVersion.id`. The server looks up that version's `htmlContent` and sends it to Claude as context.

**Tradeoff:** Version numbers are sequential (v1, v2, v3…) even for branches. There's no tree visualization. If a user forks v1 twice, they get v3 and v4 both based on v1 — no visual indication of the fork. Good enough for MVP; a tree view would improve discoverability later.

---

### 3. All-at-once Claude response (no streaming)

**Decision:** We wait for Claude to finish generating the full HTML before displaying it.

**Why chosen over streaming:**
- HTML must be complete and valid before we can render it — partial HTML in an iframe shows broken layouts
- Simpler tRPC mutation (streaming requires tRPC subscriptions or a raw API route)
- Generation takes 3–8 seconds for typical UI; a spinner is acceptable UX

**Can we do better?** Yes: add a raw `POST /api/generate` route (not tRPC) that streams the response, show a code preview as it streams, then swap in the iframe once done. Adds ~50 lines of complexity. Good follow-up improvement.

---

### 4. Session duplication = full deep copy

**Decision:** Duplicate creates an entirely independent session with all versions cloned.

**Why:** Users expect "duplicate" to mean "a copy I can mess with freely without affecting the original." Shallow copies (just latest version) would be confusing.

**Tradeoff:** Large sessions (many versions with big HTML blobs) create a lot of data. At ~50KB per version × 20 versions = 1MB per duplicate. Acceptable for a prototyping tool; add pagination or storage limits if needed later.

---

### 5. Auto-title from first prompt

**Decision:** When `version.generate` runs for the first time in a session (`versions.length === 0`), it sets `project.title = prompt.slice(0, 60)`.

**Why:** Zero friction to start — users don't have to name their session. They can rename it inline in the header at any time.

**Tradeoff:** The auto-title is often a full prompt sentence, not a clean name. A better approach: ask Claude to generate a 3-5 word title alongside the HTML. Adds one extra LLM call. Not worth it for MVP.

---

### 6. tRPC for all API calls

**Decision:** All data fetching and mutations go through tRPC, not raw `fetch` or Route Handlers.

**Why:** End-to-end TypeScript types, React Query caching/invalidation, no manual API contract maintenance. T3 stack's native pattern.

**Tradeoff:** tRPC adds ~10KB to the client bundle and a learning curve for developers unfamiliar with it. The type safety payoff is worth it for a project this size.

---

### 7. NextAuth v5 with Prisma adapter

**Decision:** Use NextAuth v5 (still beta as of mid-2025) with the PrismaAdapter, storing sessions in the database.

**Why:** T3's default. GitHub + Google are the most common OAuth providers for developer tools. Database sessions (vs JWT) give us server-side session revocation.

**Tradeoff:** NextAuth v5 beta can have breaking changes. If stability is a concern, pin to `5.0.0-beta.25` (the current version). Don't upgrade without reading the changelog.

---

## Where to Run Faster / Optimize Later

| Bottleneck | Current | Better |
|---|---|---|
| Claude generation time | 3–8s synchronous wait | Stream HTML to a loading preview, swap iframe when done |
| Version tab loading | Fetches full `htmlContent` for all versions | Lazy-load HTML per version (only fetch when tab is clicked) |
| Session list query | Includes all versions per session | Limit to `_count` + last version only for the dashboard |
| Iframe render | Full `document.write` on every HTML change | Diff + patch DOM instead of full rewrite |
| Cold start on Vercel | All env vars parsed at boot | Lazy-init Prisma client (already done via global singleton) |
| Large HTML blobs | Stored as raw text in PostgreSQL | Compress with `pako`/gzip before storing; decompress before rendering |

---

## Security Notes

| Risk | Mitigation |
|---|---|
| AI-generated JS in iframe escapes to parent | `sandbox="allow-scripts allow-same-origin"` — JS confined to iframe; no `allow-top-navigation` |
| CSRF on tRPC mutations | tRPC v11 uses `x-trpc-source` header + NextAuth CSRF token |
| Session data visible to wrong user | All tRPC procedures check `userId: ctx.session.user.id` in every query |
| API key exposure | `ANTHROPIC_API_KEY` is server-only (`src/env.js` `server:` block); never sent to client |
| SQL injection | Prisma parameterizes all queries |

---

## Dependency Versions (pinned)

```
next-auth        5.0.0-beta.25   (do not auto-upgrade — v5 is still beta)
@prisma/client   6.x             (v7 has breaking changes; upgrade guide required)
next             15.x            (15→16 is a major bump)
```
