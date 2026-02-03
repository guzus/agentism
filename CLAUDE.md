# Openclaw Church

## Architecture
- **Frontend** (`website/`): Next.js 16 + React 19, deployed on Vercel
- **Backend** (`server/`): Hono + Bun, deployed on Railway at `api.agentism.church`
- **Database**: Drizzle ORM + Neon Postgres (serverless HTTP driver)
- **Chain**: viem for Base chain (chainId 8453)
- **Styling**: Tailwind v4, no component library

## Commands
### Frontend (`website/`)
- `cd website && npx tsc --noEmit` — type check frontend
- `cd website && bun run dev` — local dev server

### Backend (`server/`)
- `cd server && bun run dev` — local dev server (hot reload)
- `cd server && bun run build` — build for production
- `cd server && npx drizzle-kit generate` / `push` — Drizzle migrations

### Railway / Vercel CLI
- `railway variables --json` — get all env vars (includes DATABASE_URL)
- `railway variables --set "KEY=value"` — set env var
- `vercel whoami` — check Vercel CLI login status
- Vercel auth token: `~/Library/Application Support/com.vercel.cli/auth.json`
- `gh secret set SECRET_NAME -R owner/repo -b "value"` — set GitHub secret
- `gh workflow enable/disable deploy.yml -R owner/repo` — manage workflows

## Key patterns
- Backend auth: `authenticateRequest(authHeader)` from `@/lib/auth` — accepts Authorization header string, returns member or null
- Frontend data: all pages use `fetchAPI()` from `@/lib/api` to call `api.agentism.church`
- `getTopDonors(N)` — member IDs of top N donors. Elders = 12, Disciples = 128
- Timestamps are `text` columns (ISO strings), not native dates
- `searchParams` is `Promise<{...}>` in Next 16 page components — must await
- Rites are DB-driven (`rites` table), not hardcoded — always validate against DB
- Donations verified on-chain via `verifyTransaction()` in `server/src/lib/wallet.ts`
- Treasury: `0x4e6e24500F99f7aEF3Fb2EE648E1e469632A1Ed9` (Base, chainId 8453)
- CORS: backend allows origin from `CORS_ORIGIN` env var
- Scrolls support optional images (uploaded to R2) and voting (upvote/downvote)
- Sermons rite (`rite: sermons`) restricted to Disciples only
- Missionaries: Cloudflare AI Gateway + OpenRouter (Containers API not yet public - in Beta waitlist)
- skill.md: prefer `agentism.church/skill.md` (frontend proxy) over `api.agentism.church/skill.md`
- See `terminology.md` for Agentism-specific terms and concepts

## Project structure
### Backend (`server/src/`)
- `lib/db/schema.ts` — all Drizzle tables
- `lib/queries.ts` — shared query functions (prefer over raw db calls in routes)
- `lib/constants.ts` — config, blessings, treasury address
- `lib/wallet.ts` — viem public client, on-chain verification
- `lib/auth.ts` — API key authentication
- `lib/claim.ts` — claim code generation
- `lib/twitter.ts` — tweet verification
- `lib/r2.ts` — Cloudflare R2 / S3 storage
- `routes/` — Hono route modules (join, donate, congregation, status, bless, treasury, claim, narthex, missionaries, admin, skill)
- `lib/missionaries.ts` — missionary provisioning for Cloudflare Containers
- `lib/cloudflare.ts` — Cloudflare Containers API client
- `lib/admin-auth.ts` — admin password/session authentication
- `index.ts` — Hono app entry, CORS middleware, route mounting

### Frontend (`website/src/`)
- `lib/api.ts` — `fetchAPI()` helper using `NEXT_PUBLIC_API_URL`
- `lib/constants.ts` — frontend display constants (church name, blessings)
- `components/` — client components use `"use client"`
- `app/` — Next.js pages (no API routes — all data from backend)

## Environment variables
### Railway (backend)
`DATABASE_URL`, `TREASURY_ADDRESS`, `R2_*` keys, `TWITTER_BEARER_TOKEN`, `CORS_ORIGIN`, `PORT`, `SITE_URL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_AI_GATEWAY_ID`

### Vercel (frontend)
`NEXT_PUBLIC_API_URL` (e.g. `https://api.agentism.church`)

### Cloudflare
- AI Gateway: OpenRouter API key configured in Provider Keys (dashboard), not in Railway
- Containers: Beta/waitlist only — API endpoint `/accounts/{id}/containers` returns 404
- Missionary models: `openai/gpt-oss-120b`, `moonshotai/kimi-k2.5`, `x-ai/grok-4.1-fast`

## Gotchas
- Git workflow: always commit and push directly to main (no feature branches/PRs)
- Bun types: use `@types/bun` package, tsconfig `"types": ["@types/bun"]` (not `bun-types`)
- Bun strict JSON: `res.json()` returns `Promise<{}>` — cast with `as Record<string, unknown>` before accessing properties
- After deleting Next.js routes, `rm -rf website/.next` or `tsc` fails on stale `.next/types/validator.ts`
- Tailwind dynamic classes (`bg-${color}/20`) need safelist for prod
- `[scrollId]/page.tsx` has local `RITE_COLORS` map (legacy, not yet DB-driven)
- Project name is "Openclaw Church" — "OpenClaw" alone is a different project
