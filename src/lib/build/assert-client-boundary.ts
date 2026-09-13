/**
 * Client / server import boundary.
 *
 * Server-only modules must not appear in the browser graph. This module is
 * shared by the Vite plugin (fail-fast + import chain) and the check script.
 */

export const BOUNDARY_STUB_SENTINEL = "client-boundary-node-stub";

const SERVER_FILE_RE = /\.server(?:\.(?:t|j)sx?)?$/;

const SERVER_PATH_HINTS = [
  "/src/lib/db.ts",
  "/src/lib/db/",
  "/src/lib/db",
  "@/lib/db",
  "/src/lib/auth/server.ts",
  "/src/lib/auth/server",
  "@/lib/auth/server",
  "/src/lib/auth/pglite-dialect",
  "/src/lib/app-data/server-only",
  "/src/lib/app-data/client.server",
  "@tanstack/react-start/server",
] as const;

export const FORBIDDEN_PACKAGES = [
  "pg",
  "postgres",
  "pg-native",
  "kysely",
  "@electric-sql/pglite",
  "better-auth/adapters",
  "stripe",
] as const;

export const TOOLING_STUB_PACKAGES = ["vite", "rolldown"] as const;

export const FORBIDDEN_BUILTINS = [
  "node:module",
  "node:fs",
  "node:path",
  "node:crypto",
  "node:os",
  "node:stream",
  "node:net",
  "node:tls",
  "node:child_process",
  "module",
  "fs",
  "crypto",
  "os",
  "stream",
  "net",
  "tls",
  "child_process",
] as const;

/** `path` is Node when bare; `./path` is local. Listed separately. */
const BARE_NODE_PATH = "path";

export type BoundaryKind = "ok" | "forbidden" | "stub-tooling" | "stub-server";

export type BoundaryDecision = {
  kind: BoundaryKind;
  spec: string;
  reason: string;
};

export function normalizeSpec(id: string): string {
  const noQuery = id.split("?")[0] ?? id;
  return noQuery.replace(/\\/g, "/");
}

export function isFromSrc(importer: string | undefined): boolean {
  if (!importer) return false;
  const n = importer.replace(/\\/g, "/");
  return n.includes("/src/") && !n.includes("/node_modules/");
}

export function isUiImporter(importer: string | undefined): boolean {
  if (!importer) return false;
  const n = importer.replace(/\\/g, "/");
  return (
    /\/src\/(components|routes|stores)\//.test(n) ||
    /\/src\/router\.tsx$/.test(n)
  );
}

export function isServerFileName(spec: string): boolean {
  return SERVER_FILE_RE.test(normalizeSpec(spec));
}

export function isServerPath(spec: string): boolean {
  const n = normalizeSpec(spec);
  if (SERVER_FILE_RE.test(n)) return true;
  return SERVER_PATH_HINTS.some((hint) => n.includes(hint) || n.endsWith(hint));
}

export function packageName(spec: string): string {
  const n = normalizeSpec(spec);
  if (n.startsWith("@")) {
    const parts = n.split("/");
    return parts.slice(0, 2).join("/");
  }
  return n.split("/")[0] ?? n;
}

function isForbiddenPackage(spec: string): boolean {
  const n = normalizeSpec(spec);
  if (n.startsWith(".") || n.startsWith("/")) return false;
  if (n.startsWith("@/")) return false;
  return FORBIDDEN_PACKAGES.some(
    (pkg) => n === pkg || n.startsWith(`${pkg}/`),
  );
}

function isToolingPackage(spec: string): boolean {
  const n = normalizeSpec(spec);
  if (n.startsWith(".") || n.startsWith("/") || n.startsWith("@/")) return false;
  return TOOLING_STUB_PACKAGES.some(
    (pkg) => n === pkg || n.startsWith(`${pkg}/`),
  );
}

function isForbiddenBuiltin(spec: string): boolean {
  const n = normalizeSpec(spec);
  if (n.startsWith(".") || n.startsWith("/") || n.startsWith("@/")) return false;
  if (n === BARE_NODE_PATH) return true;
  return (FORBIDDEN_BUILTINS as readonly string[]).includes(n);
}

/**
 * Dual createServerFn / createMiddleware modules may dynamically import
 * `*.server.ts` from the server half. UI files never may.
 */
export function classifyClientImport(
  spec: string,
  importer: string | undefined,
): BoundaryDecision {
  const normalized = normalizeSpec(spec);

  if (isToolingPackage(normalized)) {
    return {
      kind: "stub-tooling",
      spec: normalized,
      reason: "Vite/Rolldown must not ship into the browser; stub tooling only",
    };
  }

  if (isServerFileName(normalized) || isServerPath(normalized)) {
    if (isDualServerFnImporter(importer)) {
      return {
        kind: "stub-server",
        spec: normalized,
        reason: "client half of createServerFn must not load *.server.ts",
      };
    }
    return {
      kind: "forbidden",
      spec: normalized,
      reason: isUiImporter(importer)
        ? "UI / ssr:false graph imported a server-only module"
        : "Server-only module resolved in the client graph",
    };
  }

  if (isForbiddenPackage(normalized) || isForbiddenBuiltin(normalized)) {
    if (isFromSrc(importer) || isUiImporter(importer)) {
      return {
        kind: "forbidden",
        spec: normalized,
        reason: "Node / DB package resolved from src in the client graph",
      };
    }
    return {
      kind: "forbidden",
      spec: normalized,
      reason: "Node / DB package leaked into the client graph",
    };
  }

  return { kind: "ok", spec: normalized, reason: "allowed" };
}

export function isDualServerFnImporter(importer: string | undefined): boolean {
  if (!importer) return false;
  const n = importer.replace(/\\/g, "/");
  return (
    n.includes("/src/lib/ai/generate.ts") ||
    n.includes("/src/lib/auth/middleware.ts") ||
    n.includes("/src/lib/wordpress.ts") ||
    n.includes("/src/routes/api/auth/$.ts")
  );
}

export function formatBoundaryError(
  decision: BoundaryDecision,
  importer: string | undefined,
  chain: string[],
): string {
  const lines = [
    "[client-boundary] Refusing to put a server-only module in the browser bundle.",
    `  module : ${decision.spec}`,
    `  reason : ${decision.reason}`,
    `  importer: ${importer ?? "(entry)"}`,
  ];
  if (chain.length > 0) {
    lines.push("  import chain (importer → module):");
    for (const hop of chain) lines.push(`    ${hop}`);
  }
  lines.push(
    "  Fix: import server modules only from createServerFn / *.server.ts handlers.",
  );
  return lines.join("\n");
}

export function walkImportChain(
  startImporter: string | undefined,
  edges: Map<string, string>,
  maxHops = 16,
): string[] {
  const hops: string[] = [];
  let current = startImporter;
  const seen = new Set<string>();
  while (current && hops.length < maxHops && !seen.has(current)) {
    seen.add(current);
    hops.push(current);
    current = edges.get(current);
  }
  return hops;
}

const CREATE_REQUIRE_LEAK =
  /createRequire|node:module|from["']module["']|from["']pg["']|@electric-sql\/pglite/;

export function clientChunkLeak(code: string, fileName: string): string | null {
  if (code.includes(BOUNDARY_STUB_SENTINEL)) return null;
  if (!CREATE_REQUIRE_LEAK.test(code)) return null;
  const hit = code.match(CREATE_REQUIRE_LEAK)?.[0] ?? "server-only symbol";
  return `[client-boundary] ${hit} leaked into client chunk ${fileName}`;
}
