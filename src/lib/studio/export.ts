export type ExportValidationIssue = {
  code:
    | "empty"
    | "doctype"
    | "structure"
    | "truncated"
    | "unbalanced"
    | "forbidden-runtime"
    | "forbidden-url"
    | "anchor"
    | "manifest";
  message: string;
};

export type ExportValidationResult =
  | { ok: true; html: string }
  | { ok: false; issues: ExportValidationIssue[] };

export type ExportDraft = {
  previousHtml: string;
  buffer: string;
};

export type FinalizedExportDraft =
  | { ok: true; html: string; exportHtml: string }
  | { ok: false; html: string; issues: ExportValidationIssue[] };

const COZY_RUNTIME_SCRIPT = /<script\b[^>]*data-cozy-elements\b[^>]*>[\s\S]*?<\/script>/gi;
const FORBIDDEN_RUNTIME =
  /\b(?:data-cozy-elements|customElements|CozyApp|CozyBoard|CozyColumn|CozyCard|CozyBtn|CozyMsg)\b/i;
const FORBIDDEN_URL =
  /(?:\b(?:blob|file):|(?:^|["'(=\s])(?:[A-Z]:\\|\/(?:Users|home|workspace|tmp|private)\/))/i;
const VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

function issue(code: ExportValidationIssue["code"], message: string): ExportValidationIssue {
  return { code, message };
}

function checkTagBalance(html: string): ExportValidationIssue[] {
  const issues: ExportValidationIssue[] = [];
  if (/<[^>]*$/s.test(html) || /<[^>]*["'][^>"']*$/s.test(html)) {
    issues.push(issue("truncated", "HTML obsahuje odrezaný tag alebo atribút."));
    return issues;
  }

  const stack: string[] = [];
  const tokens = /<!--[\s\S]*?-->|<![^>]*>|<script\b[^>]*>[\s\S]*?<\/script\s*>|<\/?([a-z][\w:-]*)\b[^>]*>/gi;
  for (const match of html.matchAll(tokens)) {
    const token = match[0];
    const name = match[1]?.toLowerCase();
    if (!name || token.startsWith("<!--") || token.startsWith("<!")) continue;
    if (token.startsWith("</")) {
      if (stack.pop() !== name) {
        issues.push(issue("unbalanced", `Neuzavretý alebo nesprávne uzavretý tag <${name}>.`));
        break;
      }
    } else if (!VOID_ELEMENTS.has(name) && !token.endsWith("/>")) {
      stack.push(name);
    }
  }
  if (issues.length === 0 && stack.length > 0) {
    issues.push(issue("unbalanced", `Chýba uzatvorenie tagu <${stack[stack.length - 1]}>.`));
  }
  return issues;
}

function validateManifest(manifest: string): ExportValidationIssue[] {
  const issues: ExportValidationIssue[] = [];
  try {
    const parsed = JSON.parse(manifest) as { icons?: unknown };
    if (!Array.isArray(parsed.icons)) return issues;
    for (const icon of parsed.icons) {
      if (!icon || typeof icon !== "object") {
        issues.push(issue("manifest", "Manifest obsahuje neplatnú ikonu."));
        continue;
      }
      const value = icon as Record<string, unknown>;
      if (
        typeof value.src !== "string" ||
        !value.src.trim() ||
        typeof value.sizes !== "string" ||
        !value.sizes.trim() ||
        typeof value.type !== "string" ||
        !value.type.trim()
      ) {
        issues.push(issue("manifest", "Každá manifest ikona musí mať src, sizes a type."));
      }
      if (value.purpose !== undefined) {
        const purposes = String(value.purpose).trim().split(/\s+/);
        if (purposes.some((purpose) => !["any", "maskable", "monochrome"].includes(purpose))) {
          issues.push(issue("manifest", "Manifest ikona má neplatný purpose."));
        }
      }
    }
  } catch {
    issues.push(issue("manifest", "Manifest nie je platný JSON."));
  }
  return issues;
}

export function stripPreviewRuntime(html: string): string {
  return html.replace(COZY_RUNTIME_SCRIPT, "").replace(/\s+data-cozy-elements(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi, "");
}

export function validateExportHtml(html: string, manifest?: string): ExportValidationResult {
  const source = html.trim();
  const issues: ExportValidationIssue[] = [];
  if (!source) return { ok: false, issues: [issue("empty", "Exportovaný HTML dokument je prázdny.")] };

  if (!/^<!doctype html>/i.test(source)) {
    issues.push(issue("doctype", "Dokument musí začínať deklaráciou <!DOCTYPE html>."));
  }
  for (const tag of ["html", "head", "body"]) {
    if (!new RegExp(`<${tag}\\b`, "i").test(source)) {
      issues.push(issue("structure", `Dokument musí obsahovať <${tag}>.`));
    }
  }
  if (!/<\/body>\s*<\/html>\s*$/i.test(source)) {
    issues.push(issue("structure", "Dokument musí končiť uzavretými tagmi </body></html>."));
  }
  issues.push(...checkTagBalance(source));

  if (FORBIDDEN_RUNTIME.test(source)) {
    issues.push(issue("forbidden-runtime", "Export obsahuje interný Cozy preview runtime."));
  }
  if (FORBIDDEN_URL.test(source)) {
    issues.push(issue("forbidden-url", "Export obsahuje blob:, file:// alebo lokálnu systémovú cestu."));
  }

  const ids = new Set<string>();
  for (const match of source.matchAll(/\bid\s*=\s*["']([^"']+)["']/gi)) ids.add(match[1]);
  for (const match of source.matchAll(/\bhref\s*=\s*["']#([^"']+)["']/gi)) {
    if (!ids.has(match[1])) {
      issues.push(issue("anchor", `Anchor #${match[1]} nemá zodpovedajúci element s rovnakým id.`));
    }
  }
  if (manifest) issues.push(...validateManifest(manifest));

  return issues.length > 0 ? { ok: false, issues } : { ok: true, html: source };
}

export function prepareHtmlExport(html: string, manifest?: string): ExportValidationResult {
  const clean = stripPreviewRuntime(html).trim();
  const result = validateExportHtml(clean, manifest);
  return result.ok ? { ok: true, html: clean } : result;
}

export function createExportDraft(previousHtml = ""): ExportDraft {
  return { previousHtml, buffer: "" };
}

export function appendExportDraft(draft: ExportDraft, chunk: string): ExportDraft {
  return { ...draft, buffer: `${draft.buffer}${chunk}` };
}

export function finalizeExportDraft(draft: ExportDraft): FinalizedExportDraft {
  const prepared = prepareHtmlExport(draft.buffer);
  if (!prepared.ok) {
    return { ok: false, html: draft.previousHtml, issues: prepared.issues };
  }
  return { ok: true, html: draft.buffer.trim(), exportHtml: prepared.html };
}

export function slugFromTitle(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "preview"
  );
}

export function downloadHtml(filename: string, html: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".html") ? filename : `${filename}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}
