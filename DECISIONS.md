# Key Decisions, Tradeoffs & What Could Be Better

---

## 1. HTML/CSS in an iframe instead of React components

**Decision:** Claude generates raw `<!DOCTYPE html>` documents rendered via `srcDoc` in a sandboxed iframe.

**Why:** Claude generates HTML/CSS far more reliably than JSX. No transpiler needed in the browser, no import resolution, no missing dependencies. The output is self-contained — one string, drop it in an iframe, it works.

**Tradeoff:** The preview is not a real React app. It can't use `useState`, `useEffect`, or any React library. Interactive JavaScript (show/hide panels, button clicks) works fine because that's vanilla JS, but actual React component trees don't.

**What could be better:** Replace the iframe with [Sandpack](https://sandpack.codesandbox.io/) — CodeSandbox's in-browser bundler. It runs a full Node.js-like environment in a WebWorker, supports React, npm packages, and live reloading. Adds ~300KB to the bundle and significant complexity, but unlocks full React prototypes.

---

## 2. Model choice — Haiku over Sonnet

**Decision:** Using `claude-haiku-4-5` instead of `claude-sonnet-4-6`.

**Why:** Haiku generates in ~1-2 seconds vs Sonnet's ~5-8 seconds. For rapid UI iteration, speed matters more than perfection on the first pass.

**Tradeoff:** Haiku produces simpler HTML — less visual polish, shorter CSS, sometimes misses fine details on complex prompts like "recreate Stripe's pricing page exactly."

**What could be better:** Let users choose per-session. A toggle in the toolbar — "Fast" (Haiku) vs "Quality" (Sonnet) — where Fast is the default and Quality is used when the user needs higher fidelity. The model name could be stored on the `Project` model so each session remembers its setting.

---

## 3. All-at-once response instead of streaming

**Decision:** Wait for Claude to finish generating the full HTML before showing anything.

**Why:** Partial HTML in an iframe renders broken layouts. You need the closing `</style>` and `</body>` tags before the page looks right. Streaming is also more complex — it requires a raw Route Handler instead of tRPC, and the client needs to handle a `ReadableStream`.

**Tradeoff:** The user stares at a spinner for 1-8 seconds with no feedback that anything is happening.

**What could be better:** Stream the raw text into a code preview panel while generating, then swap in the iframe once the full HTML arrives. The user sees the code being written in real time — it feels instant even though the total time is the same. Roughly 50 extra lines of code using a Next.js Route Handler and `EventSource` on the client.

---

## 4. Ephemeral AI messages — stored in DB but not shown on page refresh before seeding

**Decision:** `aiMessage` is saved to the `Version` row in the database and seeded into React state on page load via a `useEffect`.

**Why:** Avoids passing `aiMessage` through every tRPC query response — the session data already includes it on the `Version` object, so we just extract it into a separate `Record<string, string>` map on first load.

**Tradeoff:** There's a brief moment on page load where the AI bubbles are empty before the `useEffect` fires and seeds them. On a fast connection this is imperceptible (~16ms), but technically they flash in.

**What could be better:** Initialize `aiMessages` state directly from the prefetched server data in the page component instead of seeding via `useEffect`. Since `dashboard/page.tsx` and `session/[id]/page.tsx` are server components that prefetch data, the initial state could be computed before the first render and passed as a prop, eliminating the flash entirely.

---

## 5. Version numbers are sequential, not a tree

**Decision:** Version numbers go 1, 2, 3… even when forking from an older version. If you fork v1 twice, you get v3 and v4, both based on v1, with no visual indication of the fork.

**Why:** Simple to implement. The `versionNumber` is just `versions.length + 1`.

**Tradeoff:** There's no way to tell which versions are related. You can't see "v3 came from v1, not v2." A complex branching history becomes confusing.

**What could be better:** Add a `parentVersionId` field to the `Version` model (already passed in the mutation but not stored). With that, you could render a tree diagram in the version history popover showing the branching structure — `v1 → v2 → v4` and `v1 → v3` as separate branches.

---

## 6. Session title auto-set from first prompt

**Decision:** When the first `version.generate` runs, the project title is automatically set to the first 60 characters of the user's prompt.

**Why:** Zero friction. Users don't have to name their work before starting.

**Tradeoff:** The auto-title is usually a full sentence like "create an instagram clone with a dark theme" — not a clean, short name. It truncates at 60 characters which can cut off mid-word.

**What could be better:** Ask Claude to generate a 3-5 word title alongside the HTML in the same API call. Add a second field to the output format: `ALLOY_TITLE: Instagram Dark Clone`. No extra API call, minimal prompt change, much cleaner titles.

---

## 7. No rate limiting or cost controls

**Decision:** Every authenticated user can call `version.generate` unlimited times.

**Why:** It's an MVP — adding rate limiting adds complexity before you know how the app will be used.

**Tradeoff:** One user could generate thousands of versions and run up a large Anthropic bill with no limit.

**What could be better:** Add a `generationCount` counter per user per day in the database, checked at the start of `version.generate`. If the count exceeds a threshold (e.g. 50/day), throw an error. Reset daily via a cron job or a timestamp-based check. Alternatively, pass your Anthropic spend limit through the Anthropic dashboard's built-in usage controls.

---

## 8. No real-time collaboration

**Decision:** Sessions are single-user only. The `userId` check in every query enforces this.

**Why:** Collaboration requires WebSockets or Server-Sent Events, operational transforms or CRDTs for conflict resolution, and shared session permissions. That's a significant engineering investment.

**Tradeoff:** You can't share a session with a teammate to iterate together.

**What could be better:** The simplest version of sharing: a read-only public link. Add a `isPublic: Boolean` field to `Project`. If true, `getById` skips the `userId` check and returns the session. Anyone with the link can view the versions and preview, but not generate new ones. The "Share" button in the header is already there — it just needs to be wired up.

---

## 9. Prisma model named `Project` instead of `Session`

**Decision:** The user-facing "session" concept is stored in the database as `Project`.

**Why:** NextAuth v5 already uses a model called `Session` for auth session tokens. Having two `Session` models in the same Prisma schema would cause a naming conflict.

**Tradeoff:** The codebase has a terminology mismatch — the UI says "session", the API routes say `session.*`, but the database says `project`. This trips up anyone reading the code for the first time.

**What could be better:** Rename NextAuth's `Session` model using Prisma's `@@map` directive:
```prisma
model AuthSession {
  @@map("Session")  // keeps the DB table name the same
  ...
}
```
This lets you name the app model `Session` while the DB table stays `Session` for NextAuth compatibility. No migration needed, purely a Prisma schema change.

---

## 10. Context HTML passed in full — no trimming

**Decision:** The entire previous version's HTML is sent to Claude on every follow-up prompt.

**Why:** Claude needs the full structure to make targeted edits. Stripping CSS means it regenerates styles from scratch, causing visual drift between versions.

**Tradeoff:** Large UIs (500+ lines of HTML) can be 4000-6000 tokens of input, which increases both cost and latency on every follow-up.

**What could be better:** Strip content that adds tokens without adding meaning — HTML comments, blank lines, and inline SVG path data (the long `d="M12 0C5.37..."` strings). A typical generated HTML goes from ~5000 tokens to ~3000 tokens with these removals alone, while the structure and all CSS stays intact. Estimated 20-30% faster on follow-ups with no quality loss.

---

## Summary Table

| Decision | Impact | Effort to fix |
|---|---|---|
| iframe instead of Sandpack | No real React previews | High |
| Haiku model | Simpler output | Trivial (one line) |
| No streaming | Blank wait time | Medium |
| Sequential version numbers | No branch visibility | Medium |
| Auto-title from prompt | Messy titles | Low |
| No rate limiting | Unlimited API cost | Low |
| No public sharing | Can't share work | Low |
| `Project` naming mismatch | Confusing codebase | Low |
| Full HTML context | Higher token cost | Low |
