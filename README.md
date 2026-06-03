# Alloy

AI-powered UI prototyping tool. Describe a UI in plain English, see it rendered instantly. Iterate with follow-up prompts, navigate between versions, and duplicate sessions.

## Stack

- Next.js 15 + TypeScript
- tRPC + React Query
- Prisma + PostgreSQL
- NextAuth (GitHub + Google)
- Anthropic Claude API
- Tailwind CSS

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Set up environment variables

Fill in the values in `.env`:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase: Settings → Database → Connection string → **Transaction pooler** URI |
| `DIRECT_URL` | Supabase: Settings → Database → Connection string → **Direct connection** URI |
| `AUTH_SECRET` | Run `npx auth secret` or `openssl rand -base64 32` |
| `AUTH_GITHUB_ID` | GitHub → Settings → Developer settings → OAuth Apps → New OAuth App. Set callback URL to `http://localhost:3000/api/auth/callback/github` |
| `AUTH_GITHUB_SECRET` | Same OAuth App page after creation |
| `AUTH_GOOGLE_ID` | Google Cloud Console → APIs & Services → Credentials → Create OAuth 2.0 Client. Set redirect URI to `http://localhost:3000/api/auth/callback/google` |
| `AUTH_GOOGLE_SECRET` | Same credentials page |
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/ → API Keys |

> **Tip for Neon (alternative to Supabase):** Use the **pooled connection string** for `DATABASE_URL` and the **direct connection string** for `DIRECT_URL`.

### 3. Push the database schema

```bash
pnpm db:push
```

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel
3. Add all environment variables from `.env` in Vercel project settings
4. Update OAuth callback URLs to your production domain:
   - GitHub: `https://your-domain.vercel.app/api/auth/callback/github`
   - Google: `https://your-domain.vercel.app/api/auth/callback/google`
5. Set `AUTH_SECRET` to a strong random value (`openssl rand -base64 32`)
6. Deploy

## Usage

1. **Sign in** with GitHub or Google
2. **Create a session** from the dashboard
3. **Type a prompt** in the left panel (e.g. "create an Instagram clone")
4. **See the UI** rendered in the right preview panel
5. **Type follow-up prompts** to iterate — each creates a new version
6. **Click version tabs** (v1, v2, v3…) to navigate between snapshots
7. **Duplicate a session** from the header to branch off a copy with full history

## Database Commands

```bash
pnpm db:push       # Sync schema to DB without migration files (dev)
pnpm db:generate   # Create a new migration file
pnpm db:migrate    # Apply pending migrations (production)
pnpm db:studio     # Open Prisma Studio (visual DB browser)
```
