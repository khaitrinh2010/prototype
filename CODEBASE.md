# Alloy — Codebase Explanation

## 1. The Big Picture

The app has four layers that work together:

```
Browser (React)
    ↕ tRPC (type-safe API calls over HTTP)
Next.js Server (API routes, auth)
    ↕ Prisma ORM
PostgreSQL Database
    + Anthropic API (Claude) — called server-side only
```

---

## 2. Entry Points

**`src/app/layout.tsx`** — runs on every page. Wraps everything in two providers:
- `SessionProvider` (from NextAuth) — makes the logged-in user accessible anywhere via `useSession()`
- `TRPCReactProvider` — sets up the tRPC client so components can call the API

**`src/app/page.tsx`** — the root `/` route. Runs server-side, checks if you're logged in, then redirects. If logged in → `/dashboard`. If not → `/login`. You never actually see this page render.

**`src/env.js`** — runs at startup and validates every environment variable. If you start the app with `ANTHROPIC_API_KEY` missing, it crashes immediately with a clear error instead of failing silently later. Every env var used anywhere in the app is declared here.

---

## 3. Database Layer

**`prisma/schema.prisma`** — defines three app models:

```
User → has many Projects (called "sessions" in the UI)
Project → has many Versions
Version → stores: prompt text, generated HTML, Claude's response message, version number
```

The `Project` model is named that way (not `Session`) because NextAuth already uses a model called `Session` for its own auth tokens. Two different concepts with the same name would break Prisma.

**`src/server/db.ts`** — creates one shared Prisma client for the whole app. The `globalForPrisma` trick prevents creating a new database connection on every hot-reload in development — without it you'd run out of connections within minutes of coding.

---

## 4. API Layer (tRPC)

tRPC lets you call server functions from the client as if they were normal TypeScript functions — with full type safety, no manual API contracts, no `fetch` calls.

**`src/server/api/trpc.ts`** — the foundation. Defines two types of procedures:
- `publicProcedure` — anyone can call
- `protectedProcedure` — throws `UNAUTHORIZED` if you're not logged in. Every single route in this app uses `protectedProcedure`, so you can never touch other users' data

**`src/server/api/routers/session.ts`** — 6 operations on the `Project` model:

| Procedure | Type | What it does |
|---|---|---|
| `list` | query | Fetch all your sessions ordered by most recently updated |
| `getById` | query | Fetch one session with all its versions |
| `create` | mutation | Create empty session, title defaults to "Untitled" |
| `updateTitle` | mutation | Rename a session |
| `delete` | mutation | Delete session, cascade deletes all versions |
| `duplicate` | mutation | Read the original, create a new project with all versions copied including `aiMessage` |

Every query has `userId: ctx.session.user.id` in the `where` clause — this is what prevents you from reading someone else's sessions.

**`src/server/api/routers/version.ts`** — one operation:
- `generate` — the core of the app. Takes `sessionId`, `prompt`, and optionally `parentVersionId`. Looks up the parent version's HTML (if given), calls Claude, saves the result in a database transaction, and if it's the first version in a session, auto-sets the project title from the prompt.

**`src/server/api/root.ts`** — combines both routers into one: `session.*` and `version.*`

---

## 5. AI Layer

**`src/lib/claude.ts`** — the only file that touches the Anthropic API.

The system prompt tells Claude two things:
1. Output format: full HTML document, then one line `ALLOY_MSG: [description]`
2. Update rules: when given existing HTML, preserve **everything** exactly, only make the requested change

The `generateUI` function behaves differently depending on whether it's a first prompt or a follow-up:

- **First prompt** (`previousHtml` is undefined):
  ```
  "Create a UI for: [prompt]"
  ```

- **Follow-up prompt** (`previousHtml` exists):
  ```
  "Here is the current UI. You must preserve its exact HTML structure and CSS.
  Only apply this specific change: [prompt]
  Current HTML: [full previous HTML]"
  ```
  The instruction comes **before** the HTML deliberately — Claude pays more attention to constraints stated early.

After Claude responds, two parsing steps:
1. Find `ALLOY_MSG:` anywhere in the raw text with a regex → extract the message
2. Find the last `</html>` in the raw text → slice everything up to it as the HTML. This handles Claude sometimes adding extra text after the document.

The model is `claude-haiku-4-5` — faster and cheaper than Sonnet, generates simpler but usable HTML (~1-2s vs ~5-8s).

---

## 6. Pages

| File | Type | Purpose |
|---|---|---|
| `src/app/login/page.tsx` | Client | One Google sign-in button. Calls `signIn("google")` |
| `src/app/dashboard/page.tsx` | Server | Auth check + prefetch session list + render `SessionGrid` |
| `src/app/session/[id]/page.tsx` | Server | Auth check + prefetch session by ID + render `SessionView` |

Server components prefetch data before sending HTML to the browser — so the page loads with data already present, no loading spinners on first render.

---

## 7. Dashboard Components

**`SessionGrid`** (`src/components/dashboard/SessionGrid.tsx`)

The main dashboard client component. Owns all state and mutations:

- **Resizable sidebar**: `isDragging` ref tracks whether the mouse button is held. The `e.buttons === 0` check in `mousemove` handles the "stuck drag" bug — if you release the mouse outside the window, the next mouse movement automatically cancels the drag.
- **Homepage input box**: stores the typed prompt in `sessionStorage`, creates a new session, and navigates to it. The session page reads it back and pre-fills the chat input. Nothing auto-generates — the user decides when to send.
- **Search**: filters the session list client-side by title, no network call needed.

**`SessionCard`** (`src/components/dashboard/SessionCard.tsx`)

A card with a gradient thumbnail (color is derived from the session ID so each card has a consistent, stable color), version count badge, and hover-reveal actions for duplicate/delete.

---

## 8. Session Page Components

### `SessionView` — the orchestrator

**`src/components/session/SessionView.tsx`**

All the important state lives here:

| State | What it tracks |
|---|---|
| `activeVersionId` | Which version is currently shown in the preview |
| `aiMessages` | Map of `versionId → Claude's response text` |
| `sidebarCollapsed` | Whether the chat panel is visible |
| `showSessionsList` | Whether the sessions drawer is open |
| `showVersions` | Whether the version history popover is open |
| `editingTitle` | Whether the title input is active |

**On first load**, `useEffect` seeds `aiMessages` from the database — loops over all versions and populates the map with any stored `aiMessage` values. This is why AI responses persist when you navigate back to a session. The `aiMessagesSeeded` ref prevents this from running more than once.

**`activeVersion` resolution**: if `activeVersionId` is null (user hasn't clicked anything), it falls back to the last version in the array. So after generating, the newest version is always shown automatically.

**`handleSendPrompt`** passes `parentVersionId: activeVersion?.id` — if you're on v1 and send a new prompt, the new v3 forks from v1's HTML, not the latest version. This is the version forking feature.

---

### `ChatPanel`

**`src/components/session/ChatPanel.tsx`**

Displays the conversation history. Each version renders as two bubbles:
- **User bubble** — dark background, right-aligned, shows the prompt text. Clicking it calls `onSelectVersion`, which updates `activeVersionId` in `SessionView`, which causes `PreviewPanel` to swap to that version's HTML.
- **AI bubble** — white card with indigo avatar, left-aligned, shows Claude's `aiMessage` response.

When `isGenerating` is true, the textarea is replaced entirely with an animated "Building your UI…" card — so there's no way to accidentally send another prompt mid-generation.

---

### `PromptInput`

**`src/components/session/PromptInput.tsx`**

- Auto-resizes the textarea by setting `el.style.height` to `el.scrollHeight` on every keystroke
- Enter sends, Shift+Enter adds a newline
- Accepts `initialValue` prop — populated from `sessionStorage` when coming from the homepage input box
- When `disabled` (generating), replaces itself with a bouncing-dots status card

---

### `PreviewPanel`

**`src/components/session/PreviewPanel.tsx`**

Finds the active version from the versions array and passes its `htmlContent` to `PreviewIframe`. Shows three states:
1. No versions yet → empty state with icon
2. Generating with no existing version → centered spinner
3. Has an active version → render iframe

Also shows an "Updating…" pill overlay in the bottom-right corner during regeneration so you can still see the current preview while waiting.

---

### `PreviewIframe`

**`src/components/session/PreviewIframe.tsx`**

The simplest component — 10 lines. Uses the `srcDoc` prop, which is the browser-native way to give an iframe its HTML content directly. When `srcDoc` changes, the browser re-renders the iframe completely.

```tsx
<iframe srcDoc={html} sandbox="allow-scripts allow-same-origin" />
```

`sandbox="allow-scripts allow-same-origin"` lets JavaScript and CSS animations run inside the preview (so interactive UIs work), but blocks the iframe from navigating your outer app or submitting forms to external servers.

---

### `SessionsSidebar`

**`src/components/session/SessionsSidebar.tsx`**

Fetches the full session list via `api.session.list.useQuery()` and renders it as a scrollable list. Highlights the current session in indigo. Clicking another session navigates there and closes the drawer. Has a "Dashboard" shortcut at the bottom.

Toggled by the hamburger `☰` button in the header of `SessionView`.

---

## 9. Auth Flow

`src/server/auth/config.ts` configures NextAuth with:
- **Google** as the only OAuth provider
- **Prisma adapter** — sessions are stored in the database (`Session` table) rather than JWT cookies. This means sessions can be revoked server-side.

`src/server/auth/index.ts` exports the `auth()` function used in server components to check who's logged in.

`src/app/api/auth/[...nextauth]/route.ts` — a catch-all route that handles all OAuth callbacks (`/api/auth/callback/google`, `/api/auth/signout`, etc.).

---

## 10. The Complete User Flow

```
1. User types "create Spotify" on dashboard and hits Enter
   → sessionStorage.set("initialPrompt", "create Spotify")
   → session.create mutation → new Project row in DB
   → router.push("/session/[newId]")

2. Session page loads
   → auth() check on server
   → api.session.getById prefetched server-side (zero loading time)
   → SessionView renders, reads sessionStorage → sets initialPrompt state
   → ChatPanel renders with "create Spotify" pre-filled in textarea

3. User hits Enter in the chat input
   → version.generate mutation fires with { sessionId, prompt, parentVersionId: undefined }
   → Server: no parentVersionId → previousHtml = undefined
   → generateUI("create Spotify", undefined)
   → Claude API: "Create a UI for: create Spotify"
   → Claude returns: full HTML + "ALLOY_MSG: Built a Spotify homepage..."
   → Parsed: html extracted, message extracted
   → DB transaction (atomic):
       - Version row created (prompt, htmlContent, aiMessage, versionNumber: 1)
       - Project.title set to "create Spotify"
   → Returns Version to client

4. Client receives the new Version
   → activeVersionId = new version's ID
   → aiMessages[versionId] = "Built a Spotify homepage..."
   → session.getById cache invalidated → React Query refetches project
   → ChatPanel re-renders: dark user bubble + indigo AI bubble appear
   → PreviewIframe srcDoc = htmlContent → Spotify UI renders in preview

5. User types "add a dark sidebar" while viewing v1
   → version.generate fires with { parentVersionId: v1.id }
   → Server: looks up v1's htmlContent → passes as previousHtml
   → generateUI("add a dark sidebar", previousHtml)
   → Claude API: "You must preserve its exact HTML structure... Only apply: add a dark sidebar"
   → Claude modifies only the sidebar, keeps everything else
   → Version 2 saved, activeVersionId updated → new version shown

6. User clicks version history clock icon
   → showVersions popover opens
   → All versions listed: v1 "create Spotify", v2 "add a dark sidebar"
   → User clicks v1
   → activeVersionId = v1.id → PreviewIframe swaps to v1's HTML (no network call)
```

---

## 11. File Reference

```
src/
  app/
    layout.tsx              Global providers (SessionProvider, TRPCReactProvider)
    page.tsx                Root redirect based on auth state
    login/page.tsx          Google OAuth sign-in page
    dashboard/page.tsx      Dashboard server component (auth + prefetch)
    session/[id]/page.tsx   Session server component (auth + prefetch)
    api/
      auth/[...nextauth]/   NextAuth OAuth callback handler
      trpc/[trpc]/          tRPC HTTP handler

  components/
    dashboard/
      SessionGrid.tsx       Dashboard layout, sidebar, hero input, session grid
      SessionCard.tsx       Individual session card with thumbnail + actions
    session/
      SessionView.tsx       Orchestrator: all state, header, layout
      ChatPanel.tsx         Conversation history (user + AI bubbles)
      PromptInput.tsx       Auto-resizing textarea + send button / generating status
      PreviewPanel.tsx      Iframe area with empty/loading/generating states
      PreviewIframe.tsx     Sandboxed iframe using srcDoc
      SessionsSidebar.tsx   Toggleable sessions list drawer

  server/
    db.ts                   Singleton Prisma client
    auth/
      config.ts             NextAuth config (Google provider + Prisma adapter)
      index.ts              Exports auth() helper
    api/
      trpc.ts               tRPC init, context, protectedProcedure
      root.ts               Combines session + version routers
      routers/
        session.ts          CRUD + duplicate for Project model
        version.ts          Claude generation + Version creation

  lib/
    claude.ts               Anthropic API wrapper (generateUI function)
    utils.ts                formatDistanceToNow helper

  trpc/
    react.tsx               Client-side tRPC provider + api export
    server.ts               Server-side tRPC caller for prefetching
    query-client.ts         React Query config

  env.js                    Environment variable validation (Zod)
  styles/globals.css        Tailwind CSS import

prisma/
  schema.prisma             Database schema (User, Project, Version + NextAuth tables)
```
