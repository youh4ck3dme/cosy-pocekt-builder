# Cozy AI Studio

Brief → live HTML preview. Paper / ink / terracotta. Vanilla generated pages, no Tailwind in the iframe.

**Live:** [https://cozy-ai-studio.vercel.app](https://cozy-ai-studio.vercel.app)  
**Repo (personal Hobby):** [ENZO7700/cozy-ai-studio](https://github.com/ENZO7700/cozy-ai-studio)

> The Vercel URL currently serves the GitHub `main` build (option-B Speed Studio). This workspace is ahead of that deploy: Dashboard / Projekty / Promty / Blueprinty, Stop abort, paper PWA (`#12110f`). Until this tree is pushed to `ENZO7700/cozy-ai-studio` and Vercel rebuilds, live `/settings` `/prompts` `/blueprints` stay 404.

## Install

```bash
git clone https://github.com/ENZO7700/cozy-ai-studio.git
cd cozy-ai-studio
cp .env.example .env   # fill keys locally; never commit
npm install
npm run dev            # http://127.0.0.1:8080
```

`npm run build` runs Vite + client-boundary + bundle analyze/budget + migrate.

## Deploy (Vercel, personal account only)

Hobby project on **ENZO7700**, not a team/org.

1. Import `ENZO7700/cozy-ai-studio` in Vercel.
2. Set env from `.env.example` (server keys only).
3. Production URL: `https://cozy-ai-studio.vercel.app`.

Optional custom domain: add `canvas.h4ck3d.me` in Vercel → Domains, then CNAME `canvas` → `cname.vercel-dns.com`.

Auto-deploy: GitHub Action + `VERCEL_TOKEN` secret on the personal repo. Rotate the token after sharing it.

## PWA

Installable as **Cozy AI Studio**.

- Manifest: `/manifest.webmanifest` and `/__grok/manifest.webmanifest`
- `name` / `short_name`: Cozy AI Studio / Cozy Studio
- Theme / background: `#12110f`
- Icons: 192, 512, maskable 512
- Service worker `public/sw.js` precaches `/`, `/studio`, `/settings`, `/prompts`, `/blueprints`
- Chromium install CTA only when `beforeinstallprompt` fires
- Offline: app shell + last saved preview

In Chrome: DevTools → Application → Manifest. Hard-refresh (`Ctrl/Cmd+Shift+R`) after deploy.

## Client vs Server boundaries

Browser code and Node code must not share a module graph. A leak of `node:module` / `createRequire` (or `pg`, PGLite, Kysely) into the client bundle greys out `/studio`.

**Server-only (never import from a component, store, or `ssr: false` route)**

- `*.server.ts` / `*.server.tsx`
- `src/lib/db.ts` and anything under `src/lib/db/`
- `src/lib/auth/server.ts`, `src/lib/auth/pglite-dialect.server.ts`
- `src/lib/ai/generate-guard.server.ts`, `src/lib/ai/generate-abort.server.ts`
- Node builtins (`node:fs`, `node:module`, …) and `pg` / `kysely` / `@electric-sql/pglite`

**Client-safe**

- UI under `src/components`, `src/routes`, `src/stores`
- `src/lib/auth/client.ts`, `gates.tsx`, `providers.ts`
- `src/lib/ai/generate.ts` **RPC stubs** (`createServerFn` calls). The handler body stays on the server.

**How to call the server**

```ts
export const generatePreview = createServerFn({ method: "POST" })
  .handler(async ({ data }) => {
    const { gateGenerate } = await import("./generate-guard.server");
    gateGenerate();
    // ...
  });
```

Static `import` of a `*.server.ts` file from `StudioShell` / a route is forbidden. Dynamic `import()` inside the `createServerFn` handler is the allowed exception.

**Enforcement (fail-fast, stubs are not the main defense)**

1. Vite plugin `client-boundary` — client resolve of a server module throws with the import chain.
2. `generateBundle` — client chunks must not contain `createRequire` / `node:module`.
3. `npm run check:client-boundary` — static walk of the UI graph; `--dist` scans built assets.
4. `npm run check:bundle` / `npm run check:budget` — forbidden modules + size caps; report at `dist/report.html`.

Tooling packages `vite` / `rolldown` are stubbed so the bundler does not ship itself. `pg` and `node:module` are **not** stubbed away: they fail the build.

## Scripts

```bash
npm run dev
npm run build          # vite + boundary + analyze + bundle + budget + migrate
npm run analyze
npm run check:client-boundary
npm run check:bundle
npm run check:budget
npm run typecheck
npm test
npm audit --audit-level=high
```

## Generate protection

`generatePreview` is same-origin gated, optional `GENERATE_ACCESS_TOKEN` (httpOnly cookie, never in client JS), 10 req/min/IP and 100/day. Stop aborts the in-flight fetch (AbortController in the studio store + `request.signal` on the server). See `.env.example`.

## Preview sandbox

The live iframe uses a `blob:` URL and `sandbox="allow-scripts allow-forms"` **without** `allow-same-origin`, so generated HTML cannot read parent `localStorage`.
