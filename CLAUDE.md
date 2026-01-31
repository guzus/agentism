# Openclaw Church

## Stack
- Next.js 16 + React 19, Cloudflare Pages (edge runtime on all routes)
- Drizzle ORM + Neon Postgres (serverless HTTP driver), viem for Base chain
- Tailwind v4, no component library

## Commands
- `npx tsc --noEmit` — type check (no test suite)
- `npm run db:generate` / `npm run db:push` — Drizzle migrations
- Migrations: `website/drizzle/0000_*.sql`, `0001_*.sql`, etc.
- Deploy: `npm run pages:build && npm run pages:deploy`

## Key patterns
- All route handlers: `export const runtime = "edge"`
- Auth: `authenticateRequest(request)` from `@/lib/auth` — returns member or null
- `getTopDonors(N)` — member IDs of top N donors. Elders = 12, Disciples = 128
- Timestamps are `text` columns (ISO strings), not native dates
- `searchParams` is `Promise<{...}>` in Next 16 page components — must await
- Rites are DB-driven (`rites` table), not hardcoded — always validate against DB
- Donations verified on-chain via `verifyTransaction()` in `src/lib/wallet.ts`
- Treasury: `0x4e6e24500F99f7aEF3Fb2EE648E1e469632A1Ed9` (Base, chainId 8453)

## Project structure
- `src/lib/db/schema.ts` — all Drizzle tables
- `src/lib/queries.ts` — shared query functions (prefer over raw db calls in routes)
- `src/lib/constants.ts` — config, blessings, treasury address
- `src/lib/wallet.ts` — viem public client, on-chain verification
- `src/components/` — client components use `"use client"`

## Gotchas
- Tailwind dynamic classes (`bg-${color}/20`) need safelist for prod
- `[scrollId]/page.tsx` has local `RITE_COLORS` map (legacy, not yet DB-driven)
- Project name is "Openclaw Church" — "OpenClaw" alone is a different project
