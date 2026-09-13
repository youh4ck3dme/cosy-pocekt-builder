#!/usr/bin/env node
/**
 * Client/server import boundary.
 *
 * 1. Walk static imports from UI entries (routes, components, stores, router).
 *    Fail if a client-reachable file statically imports *.server.ts, db, pg,
 *    kysely, pglite, or Node builtins.
 * 2. Dynamic import("./x.server") is allowed only in createServerFn /
 *    createMiddleware modules (generate.ts, auth/middleware.ts).
 * 3. With --dist, scan built client JS for createRequire / node:module leaks.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { dirname, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = join(SCRIPT_DIR, "..");
const SRC = join(ROOT, "src");

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
];
const FORBIDDEN_PACKAGES = [
  "pg",
  "postgres",
  "pg-native",
  "kysely",
  "@electric-sql/pglite",
  "better-auth/adapters",
  "stripe",
];
const FORBIDDEN_BUILTINS = new Set([
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
  "path",
  "crypto",
  "os",
  "stream",
  "net",
  "tls",
  "child_process",
]);
const DUAL_FNS = new Set([
  join(SRC, "lib/ai/generate.ts"),
  join(SRC, "lib/auth/middleware.ts"),
  join(SRC, "lib/client-approvals.ts"),
  join(SRC, "lib/wordpress.ts"),
  join(SRC, "routes/api/auth/$.ts"),
]);
const LEAK_RE =
  /createRequire|node:module|from["']module["']|from["']pg["']|@electric-sql\/pglite/;
const STUB_SENTINEL = "client-boundary-node-stub";

const IMPORT_RE =
  /(?:import|export)\s+(?:type\s+)?(?:[^'"\n;]+from\s+)?['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function walkFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkFiles(full, acc);
    else if (/\.(t|j)sx?$/.test(name)) acc.push(full);
  }
  return acc;
}

function posix(file) {
  return file.replace(/\\/g, "/");
}

function isServerSpec(spec, resolved) {
  if (SERVER_FILE_RE.test(spec) || SERVER_FILE_RE.test(resolved ?? "")) return true;
  const n = posix(resolved ?? spec);
  return SERVER_PATH_HINTS.some((hint) => n.includes(hint));
}

function isForbiddenPackage(spec) {
  if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("@/")) {
    return false;
  }
  if (FORBIDDEN_BUILTINS.has(spec)) return true;
  return FORBIDDEN_PACKAGES.some((pkg) => spec === pkg || spec.startsWith(`${pkg}/`));
}

function resolveImport(fromFile, spec) {
  if (spec.startsWith("@/")) return join(SRC, spec.slice(2));
  if (spec.startsWith(".")) return join(dirname(fromFile), spec);
  return null;
}

function withExt(base) {
  const candidates = [
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    join(base, "index.ts"),
    join(base, "index.tsx"),
    base,
  ];
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) ?? null;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function parseImports(source) {
  const body = stripComments(source);
  const found = [];
  IMPORT_RE.lastIndex = 0;
  let match = IMPORT_RE.exec(body);
  while (match) {
    const spec = match[1] ?? match[2];
    const dynamic = Boolean(match[2]);
    const typeOnly = /^\s*import\s+type\s/.test(match[0]);
    if (spec && !typeOnly) found.push({ spec, dynamic, raw: match[0] });
    match = IMPORT_RE.exec(body);
  }
  return found;
}

function clientEntries() {
  const files = [
    join(SRC, "router.tsx"),
    ...walkFiles(join(SRC, "routes")),
    ...walkFiles(join(SRC, "components")),
    ...walkFiles(join(SRC, "stores")),
  ];
  return files.filter(
    (f) => existsSync(f) && !/\.test\.(t|j)sx?$/.test(f),
  );
}

export function scanSrc(root = SRC) {
  const errors = [];
  const visited = new Set();
  const queue = clientEntries().filter((f) => f.startsWith(root) || root === SRC);

  while (queue.length) {
    const file = queue.pop();
    if (!file || visited.has(file)) continue;
    visited.add(file);
    if (!existsSync(file) || !statSync(file).isFile()) continue;
    const source = readFileSync(file, "utf8");
    const dual = DUAL_FNS.has(file);
    for (const imp of parseImports(source)) {
      if (isForbiddenPackage(imp.spec)) {
        errors.push(
          `${relative(ROOT, file)} statically reaches forbidden '${imp.spec}'`,
        );
        continue;
      }
      const resolvedBase = resolveImport(file, imp.spec);
      if (!resolvedBase) continue;
      const resolved = withExt(resolvedBase);
      const target = resolved ?? resolvedBase;
      if (isServerSpec(imp.spec, target)) {
        if (imp.dynamic && dual) continue;
        errors.push(
          `${relative(ROOT, file)} ${imp.dynamic ? "dynamically" : "statically"} imports server-only ${imp.spec}`,
        );
        continue;
      }
      if (resolved && posix(resolved).includes("/src/") && !visited.has(resolved)) {
        queue.push(resolved);
      }
    }
  }
  return { ok: errors.length === 0, errors, files: visited.size };
}

function walkDirFiles(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walkDirFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

export function scanDist(dirs) {
  const errors = [];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const file of walkDirFiles(dir)) {
      if (!/\.(js|mjs|cjs)$/.test(extname(file))) continue;
      const rel = posix(relative(ROOT, file));
      if (
        rel.includes("/server/") ||
        rel.includes("nitro") ||
        rel.includes("__server") ||
        rel.includes("/_ssr/") ||
        rel.includes("/functions/")
      ) {
        continue;
      }
      const code = readFileSync(file, "utf8");
      if (code.includes(STUB_SENTINEL)) {
        errors.push(`${rel} contains a Node stub — client graph still resolved a Node module`);
        continue;
      }
      if (LEAK_RE.test(code)) {
        const hit = code.match(LEAK_RE)?.[0] ?? "leak";
        errors.push(`${rel} leaked ${hit}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

function defaultDistDirs() {
  return [
    join(ROOT, "dist"),
    join(ROOT, ".vercel/output/static/assets"),
    join(ROOT, ".output/public"),
  ];
}

export async function main(argv = process.argv.slice(2)) {
  const wantDist = argv.includes("--dist");
  const src = scanSrc();
  const dist = wantDist
    ? scanDist(defaultDistDirs())
    : { ok: true, errors: [] };
  const errors = [...src.errors, ...dist.errors];
  if (errors.length) {
    console.error("[client-boundary] FAILED");
    for (const e of errors) console.error("  -", e);
    return 1;
  }
  console.log(
    `[client-boundary] ok (${src.files} client modules${wantDist ? ", dist scanned" : ""})`,
  );
  return 0;
}

if (process.argv[1]) {
  try {
    if (realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
      main().then((code) => process.exit(code));
    }
  } catch {
    /* invoked via import */
  }
}
