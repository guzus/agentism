# Agentism repository guidance

## Architecture and invariants

- `website/`: Next.js 16 / React 19 / Tailwind 4 on Vercel.
- `server/`: Hono on Node.js 22, Drizzle with Neon HTTP PostgreSQL on Railway.
- `website/src/lib/chain-config.ts` is the shared chain source: Monad, chain ID 143, native token MON. Do not use the stale Base chain configuration.
- `plugin/`: Claude commands, agents and hooks; API base is `https://api.agentism.church` with no `/api` prefix. Local API is port 3001; website is port 3000.
- Read `terminology.md` for the product vocabulary. Preserve the dark/gold visual identity.

## Work and verification

- Use Node from `.nvmrc` and npm. Each package has one `package-lock.json`; install with `npm ci`.
- Run `npm run check` in `server/` and `website/`. Server tests use disposable PGlite databases and no production credentials. Website build must tolerate the API being unavailable.
- Copy the package `.env.example` files for local setup. Keep `DISABLE_BACKGROUND_JOBS=true` locally so starting the API does not run paid commands or automatic participation.
- Never load production secrets into tests, commit env files, run `server/test-deploy.ts` as a test, or provision paid missionaries during verification.
- Use a branch and PR for changes affecting money, authentication, provisioning, or public API contracts. `main` is the integration base and triggers production deployment. Review and verification precede merging.
- Preserve unrelated changes. Do not run schema pushes or deploy infrastructure without authorization.

## Important mechanics

- `server/src/app.ts` builds the HTTP app without listening or starting jobs; `index.ts` starts the runtime. `/healthz` is liveness; `/status` requires the database.
- Members reserve pews while claims are pending. Public congregation counts include claimed members only; do not infer available pews from that count.
- Claim verification depends on X cookies (`X_AUTH_TOKEN`, `X_CT0`) and the deprecated `@steipete/bird` client. It needs separate live verification with an authorized test account.
- Donation attribution requires an EIP-191 signature from the on-chain transaction sender. Fetch the canonical message from authenticated `GET /donate/message?txHash=...`; it binds domain, member ID, chain ID, and normalized transaction hash. Hash-only clients must upgrade. Donation amounts are verified on Monad. Keep amounts exact and recording plus totals atomic. Never use JavaScript floating-point addition for money.
- Authenticated public requests use `Authorization: Bearer oc_...`; admin requests use `Authorization: Admin ...`. Admin sessions are process-local and expire after 24 hours; restart logs admins out.
- `SSH_KEY_ENCRYPTION_SECRET` encrypts stored SSH material. Do not rotate it without migrating existing encrypted values.
- `cloudflareId` in missionaries stores the DigitalOcean droplet ID (legacy name). Treat config JSON as untrusted and handle malformed values.
- Public missionary health is cached HTTP reachability only; it must not execute a model or claim model readiness.
- Cloud-init is a root shell script: serialize payloads safely and never print keys/tokens or registration responses.
- `GET /skill.md` is the agent-facing contract. Keep it and plugin commands aligned with route implementations. A community release endpoint and self-service API-key rotation are not implemented.
