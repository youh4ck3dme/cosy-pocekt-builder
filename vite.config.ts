import { copyFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Plugin } from "vite";
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
// @ts-expect-error JS plugin alongside the TS vite config
import { grokPwaPlugin } from "./scripts/grok-pwa-plugin.mjs";
// @ts-expect-error JS plugin alongside the TS vite config
import { appEnvPlugin } from "./scripts/app-env-plugin.mjs";
import { isMigrationFile } from "./scripts/migration-plan.mjs";
import {
  classifyClientImport,
  clientChunkLeak,
  formatBoundaryError,
  walkImportChain,
} from "./src/lib/build/assert-client-boundary.ts";
import { toolingStubSource, emptyServerStubSource } from "./src/lib/build/client-node-stubs.ts";
// @ts-expect-error JS helper alongside the TS vite config
import { writeBundleReportFromChunks } from "./scripts/analyze-bundle.mjs";

/** The files `src/lib/db.ts` globs — same directory, same non-recursive scope. */
function hasGlobbedMigrations(root: string): boolean {
  try {
    return readdirSync(join(root, "migrations")).some(isMigrationFile);
  } catch {
    return false;
  }
}

/**
 * Finish PGLite bootstrap during dev-server setup (before traffic). Vite awaits
 * async `configureServer` hooks. Production: `src/lib/db` kicks `ensureDbReady`
 * on import.
 *
 * Vite awaiting the hook puts this on time-to-first-render, so an app with no
 * migrations — no schema to apply — skips it entirely rather than paying for a
 * PGLite instance it never queries.
 */
function pgliteBootstrapPlugin(): Plugin {
  return {
    name: "app-builder:pglite-bootstrap",
    apply: "serve",
    async configureServer(server) {
      if (!hasGlobbedMigrations(server.config.root)) return;
      try {
        const mod = (await server.ssrLoadModule("/src/lib/db.ts")) as {
          ensureDbReady?: () => Promise<void>;
        };
        if (typeof mod.ensureDbReady === "function") {
          await mod.ensureDbReady();
        }
      } catch (err) {
        console.error("[app-builder] DB bootstrap failed:", err);
        throw err;
      }
    },
  };
}

/**
 * Live-preview OAuth popup — handled HERE so the agent never has to create a
 * `/auth/popup` route (and cannot break it by scaffolding a React page that
 * paints the full app shell in the popup).
 *
 * `signIn` (client.ts) opens `/auth/popup?providerId=…` in a top-level window.
 * This middleware runs before TanStack Start, calls `handleAuthPopupRequest`,
 * and returns the 302 / completion HTML. Deployed apps do not use the popup
 * (full-page OAuth redirect), so `apply: "serve"` is enough.
 */
function authPopupPlugin(): Plugin {
  return {
    name: "app-builder:auth-popup",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const rawUrl = req.url ?? "";
          const pathOnly = rawUrl.split("?", 1)[0] ?? "";
          if (pathOnly !== "/auth/popup") {
            next();
            return;
          }
          if ((req.method ?? "GET").toUpperCase() !== "GET") {
            res.statusCode = 405;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("Method Not Allowed");
            return;
          }

          const host = String(
            req.headers["x-forwarded-host"] ?? req.headers.host ?? "localhost:8080",
          );
          const proto = String(
            req.headers["x-forwarded-proto"] ??
              ((req.socket as { encrypted?: boolean } | undefined)?.encrypted ? "https" : "http"),
          );
          const requestHeaders = new Headers();
          for (const [key, value] of Object.entries(req.headers)) {
            if (value === undefined) continue;
            if (Array.isArray(value)) {
              for (const v of value) requestHeaders.append(key, v);
            } else {
              requestHeaders.set(key, value);
            }
          }
          if (!requestHeaders.has("host")) requestHeaders.set("host", host);

          const request = new Request(`${proto}://${host}${rawUrl}`, {
            method: "GET",
            headers: requestHeaders,
          });

          const mod = (await server.ssrLoadModule("/src/lib/auth/popup.server.ts")) as {
            handleAuthPopupRequest: (req: Request) => Promise<Response>;
          };
          const response = await mod.handleAuthPopupRequest(request);

          res.statusCode = response.status;
          const setCookies =
            typeof response.headers.getSetCookie === "function"
              ? response.headers.getSetCookie()
              : [];
          response.headers.forEach((value, key) => {
            if (key.toLowerCase() === "set-cookie") return;
            res.setHeader(key, value);
          });
          for (const cookie of setCookies) {
            res.appendHeader("set-cookie", cookie);
          }
          const body = Buffer.from(await response.arrayBuffer());
          res.end(body);
        } catch (err) {
          console.error("[app-builder] /auth/popup handler failed:", err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader("content-type", "text/plain; charset=utf-8");
            res.end("auth popup failed");
          }
        }
      });
    },
  };
}

/**
 * Fail-fast client/server boundary. Stubs exist only for Vite/Rolldown tooling.
 * pg / node:module / *.server.ts in the UI graph fail the build with a chain.
 */
function clientBoundaryPlugin(): Plugin {
  const parentByFile = new Map<string, string>();

  return {
    name: "app-builder:client-boundary",
    enforce: "pre",
    resolveId(id, importer, options) {
      if (options?.ssr) return;
      if (importer) parentByFile.set(id, importer);

      const decision = classifyClientImport(id, importer);
      if (decision.kind === "ok") {
        if (importer) parentByFile.set(id, importer);
        return;
      }
      if (decision.kind === "stub-tooling") {
        return `\0client-tooling-stub:${decision.spec}`;
      }
      if (decision.kind === "stub-server") {
        return `\0client-server-stub:${decision.spec}`;
      }

      const chain = walkImportChain(importer, parentByFile);
      const err = new Error(formatBoundaryError(decision, importer, chain));
      err.name = "ClientBoundaryError";
      throw err;
    },
    load(id) {
      if (id.startsWith("\0client-tooling-stub:")) {
        return toolingStubSource(id.slice("\0client-tooling-stub:".length));
      }
      if (id.startsWith("\0client-server-stub:")) {
        return emptyServerStubSource();
      }
    },
    generateBundle(_options, bundle) {
      if (this.environment?.name !== "client") return;
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;
        if (/(_ssr|__server|\/server\/)/.test(chunk.fileName)) continue;
        const leak = clientChunkLeak(chunk.code, chunk.fileName);
        if (leak) {
          const err = new Error(leak);
          err.name = "ClientBoundaryError";
          throw err;
        }
      }
    },
  };
}

/**
 * Client-only treemap + gzip/brotli report → dist/report.html.
 * SSR / Nitro graphs are ignored so server Node APIs never inflate the budget.
 */
/**
 * PGLite loads companion sidecar files at runtime. The Nitro/Vercel
 * tracer includes the JS chunk but can miss that sidecar file on Windows builds,
 * which makes production preview crash before the first request when DATABASE_URL
 * is absent. Copy them next to the bundled PGLite library after Nitro writes the
 * function output.
 */
function pgliteDataAssetPlugin(): Plugin {
  return {
    name: "app-builder:pglite-data-asset",
    apply: "build",
    closeBundle() {
      const sourceDir = join(process.cwd(), "node_modules", "@electric-sql", "pglite", "dist");
      const targetDir = join(process.cwd(), ".vercel", "output", "functions", "__server.func", "_libs");
      for (const file of readdirSync(sourceDir)) {
        if (!/\.(?:wasm|data)$/.test(file)) continue;
        const source = join(sourceDir, file);
        const target = join(targetDir, file);
        if (!existsSync(source)) continue;
        mkdirSync(dirname(target), { recursive: true });
        copyFileSync(source, target);
      }
    },
  };
}

function bundleAnalyzerPlugin(): Plugin {
  const records: { name: string; code: string }[] = [];
  return {
    name: "app-builder:bundle-analyzer",
    apply: "build",
    generateBundle(_options, bundle) {
      if (this.environment?.name !== "client") return;
      records.length = 0;
      for (const item of Object.values(bundle)) {
        if (item.type === "chunk") {
          records.push({ name: item.fileName, code: item.code });
        } else if (item.type === "asset" && typeof item.source === "string") {
          records.push({ name: item.fileName, code: item.source });
        }
      }
    },
    closeBundle() {
      if (this.environment?.name !== "client") return;
      if (records.length === 0) return;
      const meta = writeBundleReportFromChunks(records);
      console.info(
        `[analyze] dist/report.html (${meta.assets.length} assets, gzip ${(meta.total.gzipBytes / 1024).toFixed(1)} kB)`,
      );
    },
  };
}

// `0.0.0.0:8080` is the live-preview contract — don't change host/port.
// The dev server starts once `src/router.tsx` and `src/routes/` exist — see
// AGENTS.md § "First scaffold".
export default defineConfig(({ command, isPreview }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    strictPort: true,
    allowedHosts: ["cozy.h4ck3d.me"],
  },
  preview: {
    host: process.env.PREVIEW_HOST ?? "127.0.0.1",
    port: Number(process.env.PREVIEW_PORT ?? process.env.PORT ?? 8081),
    strictPort: true,
  },
  resolve: { tsconfigPaths: true },
  plugins: [
    pgliteBootstrapPlugin(),
    authPopupPlugin(),
    appEnvPlugin(),
    grokPwaPlugin(),
    clientBoundaryPlugin(),
    bundleAnalyzerPlugin(),
    pgliteDataAssetPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" || isPreview
      ? [
          nitro({
            preset: "vercel",
            serverDir: "./server",
          }),
        ]
      : []),
    viteReact(),
  ],
}));
