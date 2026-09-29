# Agentism website

Next.js 16, React 19, Tailwind 4. See the [repository README](../README.md) for architecture, API setup, and deployment.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The local API runs at http://localhost:3001. The homepage distinguishes unavailable live data from an empty congregation.

```bash
npm run check
```

This runs ESLint, type generation/checking, utility tests, and the production build. Set `NEXT_PUBLIC_API_URL=http://127.0.0.1:9` when checking the offline path without a live API.

ESLint stays on 9 until `eslint-plugin-react` used by Next.js supports ESLint 10's removed context methods. npm lockfiles are authoritative; do not introduce a second package-manager lockfile.
