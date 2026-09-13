import { abortKind } from "@/lib/ai/abort-signal";
import { injectCozyElements } from "@/lib/preview/cozy-elements";
import { createServerFn } from "@tanstack/react-start";


export type AiProvider = "mistral" | "gemini" | "openai";

export type GenerateResult =
  | {
      ok: true;
      title: string;
      html: string;
      code: string;
      provider: AiProvider;
      model: string;
      validation?: {
        strategy: string;
        warnings: string[];
      };
    }
  | {
      ok: false;
      error: string;
      status?: number;
      retryAfter?: number;
      aborted?: boolean;
    };

export type AiStatus = {
  mistral: boolean;
  gemini: boolean;
  openai: boolean;
  locked: boolean;
};

// Enhanced system prompts for high-quality generation
const MAX_TOKENS = 8192;
const TEMPERATURE = 0.3;

// Self-repair loop configuration
const SELF_REPAIR_ENABLED = process.env.SELF_REPAIR_ENABLED !== 'false';
const MAX_REPAIR_RETRIES = Number(process.env.MAX_REPAIR_RETRIES || 2);
const VALIDATION_TIMEOUT_MS = Number(process.env.VALIDATION_TIMEOUT_MS || 5000);

const CREATE_SYSTEM = `You are a senior front-end engineer and product designer. You build polished,
production-quality, self-contained single-file web apps from a short user brief.

## Output contract (non-negotiable)
- Return ONLY one complete HTML document: from <!DOCTYPE html> through </html>.
- No Markdown, no code fences, no commentary before or after the HTML.
- One <style> in <head>, one <script> at the end of <body>.
- Fully self-contained. No external scripts, stylesheets, fonts, or libraries.
- Images: use ONLY inline SVG, CSS gradients, or emoji. NEVER use external URLs (https://...)
  in CSS or HTML. External requests will be BLOCKED by validation. Do NOT use images.unsplash.com,
  picsum.photos, or any other external hosts - these will cause generation to FAIL.
- All <img> tags MUST have alt attribute. Use descriptive text or empty alt="" for decorative.
- For avatars/placeholders: Use emoji as textContent (👩, 👨, 👤) with backgroundImage: 'none',
  NEVER use external image URLs.
- Vanilla JavaScript only (ES2020+). No frameworks. Wrap every localStorage
  read/write in try/catch so private browsing can never crash the app.

## Design quality bar (what separates good from great)
- Ship a real, finished product - never a wireframe or placeholder. Every
  section the brief implies is present, styled and functional.
- Clear visual hierarchy: one dominant headline, scannable sections, generous
  whitespace, a consistent 8px spacing rhythm, one intentional accent color.
- Real type scale: h1 clearly largest and fluid with clamp(); body 15-17px with
  line-height 1.5-1.6. Prefer system stacks: ui-sans-serif for UI chrome,
  ui-serif/Georgia for editorial text. Never more than three type styles at once.
- Color: derive a coherent palette from the brief's tone. Honor any color, mood,
  brand or audience the user names, and build a full palette around it
  (background / surface / border / text / muted / primary / accent) with
  readable contrast. ONLY when the user gives no style direction, default to a
  warm paper editorial look: background #f6f1e7, surface #fffdf7, ink #1c1915,
  muted #6f6558, accent #c45c38 used sparingly for primary actions.
- Polish: subtle layered shadows (not harsh), 1px borders, 8-16px radii,
  hover/focus/active states, transitions 200ms. Feel intentional, not busy.
- Handle empty, loading and edge states - never a broken or blank screen.

## Responsiveness (required)
- Mobile-first: fully usable at 360-390px and great at 1440px+.
- No horizontal overflow at any width. Use grid/flex, clamp(), min(100%, ).
- Touch targets 44-44px on mobile. Respect prefers-reduced-motion.

## Behavior & correctness
- Every control works: forms submit, filters filter, toggles toggle, lists
  add/remove, timers run. No dead buttons.
- Persist to localStorage wherever the brief implies "save", and restore on load.
- Semantic HTML (<header> <main> <section> <nav> <button> <label for>), ARIA
  where needed, keyboard operable, all inputs labeled.
- No console errors. Guard null refs, keep IDs unique, and set text via
  textContent (never inject raw user input into innerHTML).

## Cozy components (optional, already injected - do NOT redefine, no CDNs)
<cozy-app kicker heading lede>, <cozy-board>, <cozy-column name>, <cozy-card priority>,
<cozy-chip>, <cozy-btn variant=ghost type=submit>, <cozy-msg role=user|assistant>.
Use them only when they fit (kanban/board, chat, cards). Plain semantic HTML is
equally correct. Put visible copy in the light DOM (slots). Column titles go ONLY
on <cozy-column name=""> - do not nest a second heading with the same label.

## Before you write
1. Interpret the brief generously and infer missing pieces, but keep scope to
   ONE coherent primary use case - do not half-build many features.
2. If appearance is unspecified, pick a tasteful modern default. Never ask the
   user to choose.
3. Plan the sections mentally, then output the complete HTML document now.`;

const REVISE_SYSTEM = `You are a senior front-end engineer revising an existing self-contained
single-file web app to satisfy a change request. You receive the current HTML
plus a change request.

## Contract
- Apply ONLY the requested change (plus minimal necessary cleanup). Do not
  rewrite, drop or regress features the user did not ask to remove.
- Return ONLY the complete updated HTML document: <!DOCTYPE html> through
  </html>. No Markdown, no fences, no commentary.
- Keep the existing palette, fonts and overall look unless the request changes
  them.
- Preserve the pre-injected <script data-cozy-elements> runtime and any
  <cozy-*> usage; do not strip or redefine them.
- Preserve all working behavior and persisted state you were not asked to touch.
- Stay self-contained: no external scripts/fonts/libs, vanilla JS, localStorage
  wrapped in try/catch.

## CRITICAL: Always fix these if present
- REMOVE ALL external URLs (https://...) from CSS and HTML. Replace with:
  - CSS gradients for backgrounds (match existing color scheme)
  - Inline SVG for images
  - Emoji (👩, 👨, 👤, etc.) for avatars
- ADD alt attribute to ALL <img> tags that don't have one.
- For avatars using background-image: Replace with emoji textContent and backgroundImage: 'none'.

## Revision quality
- Make the change feel native to the app - same spacing, type and component
  patterns - not bolted on.
- After editing, re-check: no external requests, no console errors, no layout breakage at 360px, no
  horizontal overflow, and unchanged features still work.

Output the full updated HTML document now.`;

function mistralKey(): string | null {
  return (process.env.MISTRAL_API_KEY ?? "").trim() || null;
}

function geminiKey(): string | null {
  return (process.env.GEMINI_API_KEY ?? "").trim() || null;
}

function openaiKey(): string | null {
  return (process.env.OPENAI_API_KEY ?? "").trim() || null;
}

interface ProviderConfig {
  provider: AiProvider;
  url: string;
  key: string;
  model: string;
}

function getAvailableProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];
  const mistral = mistralKey();
  if (mistral) {
    providers.push({
      provider: "mistral",
      url: "https://api.mistral.ai/v1/chat/completions",
      key: mistral,
      model: process.env.MISTRAL_MODEL || "mistral-large-latest",
    });
  }
  const gemini = geminiKey();
  if (gemini) {
    providers.push({
      provider: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: gemini,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    });
  }
  const openai = openaiKey();
  if (openai) {
    providers.push({
      provider: "openai",
      url: "https://api.openai.com/v1/chat/completions",
      key: openai,
      model: process.env.OPENAI_MODEL || "gpt-4o",
    });
  }
  return providers;
}

function extractHtml(text: string): string | null {
  const fenced = text.match(/```html\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();
  if (/<!DOCTYPE html>/i.test(raw) || /<html[\s>]/i.test(raw)) return raw;
  if (/<body[\s>]/i.test(raw)) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head>${raw}</html>`;
  }
  return null;
}

function titleFromHtml(html: string): string {
  return html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() || "Generated preview";
}

function formatProviderError(name: string, status: number, raw: string): string {
  if (status === 401 || status === 403) return `${name} auth failed (${status}). Check the API key.`;
  if (status === 402) return `${name} quota/billing issue (402).`;
  if (status === 429) return `${name} rate limit (429).`;
  if (status === 404) return `${name} model not found (404).`;
  const msg = raw.replace(/\s+/g, " ").trim().slice(0, 180);
  return `${name} error ${status}${msg ? `: ${msg}` : ""}`;
}

async function complete(opts: {
  url: string;
  key: string;
  model: string;
  system: string;
  prompt: string;
  maxTokens: number;
  signal: AbortSignal;
}): Promise<{ ok: true; text: string } | { ok: false; error: string; aborted?: boolean }> {
  if (opts.signal.aborted) {
    return { ok: false, error: "Cancelled", aborted: true };
  }
  try {
    const res = await fetch(opts.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${opts.key}`,
      },
      signal: opts.signal,
      body: JSON.stringify({
        model: opts.model,
        max_tokens: opts.maxTokens,
        temperature: TEMPERATURE,
        messages: [
          { role: "system", content: opts.system },
          { role: "user", content: opts.prompt },
        ],
      }),
    });
    const raw = await res.text();
    if (opts.signal.aborted) {
      return { ok: false, error: "Cancelled", aborted: true };
    }
    if (!res.ok) {
      return { ok: false, error: formatProviderError(opts.model, res.status, raw) };
    }
    const body = JSON.parse(raw) as {
      choices?: { message?: { content?: string } }[];
    };
    return { ok: true, text: body.choices?.[0]?.message?.content ?? "" };
  } catch (e) {
    if (opts.signal.aborted) {
      if (abortKind(opts.signal) === "timeout") {
        return { ok: false, error: `${opts.model} timed out` };
      }
      return { ok: false, error: "Cancelled", aborted: true };
    }
    const msg = e instanceof Error ? e.message : "request failed";
    if (/abort|timeout/i.test(msg)) {
      return { ok: false, error: `${opts.model} timed out` };
    }
    return { ok: false, error: `${opts.model} ${msg}` };
  }
}

function pack(text: string, provider: AiProvider, model: string): GenerateResult {
  const extracted = extractHtml(text);
  if (!extracted) return { ok: false, error: `${provider} did not return HTML` };
  const html = injectCozyElements(extracted);
  return {
    ok: true,
    title: titleFromHtml(html),
    html,
    code: html,
    provider,
    model,
  };
}

async function generateWithCascade(opts: {
  system: string;
  prompt: string;
  signal: AbortSignal;
}): Promise<
  | { ok: true; text: string; provider: AiProvider; model: string }
  | { ok: false; error: string; status?: number; aborted?: boolean }
> {
  const providers = getAvailableProviders();
  if (providers.length === 0) {
    return {
      ok: false,
      error: "No AI API key configured. Set MISTRAL_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY",
      status: 503,
    };
  }

  const errors: string[] = [];
  for (const cfg of providers) {
    if (opts.signal.aborted) {
      return { ok: false, error: "Cancelled", aborted: true, status: 499 };
    }

    const res = await complete({
      url: cfg.url,
      key: cfg.key,
      model: cfg.model,
      system: opts.system,
      prompt: opts.prompt,
      maxTokens: MAX_TOKENS,
      signal: opts.signal,
    });

    if (res.ok) {
      return { ok: true, text: res.text, provider: cfg.provider, model: cfg.model };
    }

    if (res.aborted) {
      return { ok: false, error: "Cancelled", aborted: true, status: 499 };
    }

    console.warn(`[AI Studio] ${cfg.provider} failed: ${res.error}. Trying next provider...`);
    errors.push(`${cfg.provider}: ${res.error}`);
  }

  return {
    ok: false,
    error: `All AI providers failed: ${errors.join(" | ")}`,
    status: 502,
  };
}

/**
 * Self-repair loop: generates HTML and validates it, retrying with specific
 * error feedback if validation fails. Max 2 retries by default.
 */
async function generateWithRepair(
  prompt: string,
  html?: string,
  retryCount: number = 0,
  signal?: AbortSignal
): Promise<GenerateResult> {
  const revising = Boolean(html);
  const system = revising ? REVISE_SYSTEM : CREATE_SYSTEM;
  const generationPrompt = revising
    ? `Change request:\n${prompt || "Tighten the layout."}\n\nCurrent HTML:\n${html}`
    : prompt || "A calm personal studio landing page.";

  const activeSignal = signal || new AbortController().signal;

  // Check if we should abort
  if (activeSignal.aborted) {
    return { ok: false, error: "Cancelled", aborted: true };
  }

  // Generate with cascading failover
  const result = await generateWithCascade({
    system,
    prompt: generationPrompt,
    signal: activeSignal,
  });

  if (result.ok) {
    // Validate if self-repair is enabled
    if (SELF_REPAIR_ENABLED) {
      const { validateHtml } = await import("./validation/index.server");
      const validation = await validateHtml(result.text);

      if (validation.ok) {
        // Success - pack and return
        const packed = pack(result.text, result.provider, result.model);
        if (packed.ok) {
          packed.validation = {
            strategy: validation.strategy,
            warnings: validation.warnings,
          };
        }
        return packed;
      }

      // Validation failed - check if we should retry
      if (retryCount >= MAX_REPAIR_RETRIES) {
        console.warn(`Self-repair: Max retries (${MAX_REPAIR_RETRIES}) reached. Errors:`, validation.errors);
        return {
          ok: false,
          error: `Generated HTML failed validation after ${MAX_REPAIR_RETRIES + 1} attempt(s): ${validation.errors.map((e) => e.message).join("; ")}`,
          status: 422,
        };
      }

      // Build repair prompt
      const errorMessages = validation.errors
        .map((e, i) => `${i + 1}. [${e.type.toUpperCase()}] ${e.message}`)
        .join('\n');

      const repairPrompt = `Fix the following critical issues in your previous output:

ERRORS FOUND:
${errorMessages}

INSTRUCTIONS:
- Return ONLY the complete corrected HTML document from <!DOCTYPE html> through </html>
- Fix ALL listed errors
- Do NOT introduce new errors
- Maintain the same design and functionality as the original
- Ensure no console errors, no horizontal overflow, and valid HTML structure
- Use the same styling and content from the original

Previous HTML:
${result.text}`;

      // Retry with repair using REVISE_SYSTEM
      console.log(`Self-repair: Attempting fix for ${validation.errors.length} errors (attempt ${retryCount + 1}/${MAX_REPAIR_RETRIES})`);
      return generateWithRepair(
        repairPrompt,
        undefined, // Not revising, generating fresh
        retryCount + 1,
        activeSignal
      );
    } else {
      // Self-repair disabled, use normal flow
      return pack(result.text, result.provider, result.model);
    }
  }

  if (result.aborted) {
    return { ok: false, error: "Cancelled", status: 499, aborted: true };
  }

  return { ok: false, error: result.error, status: result.status };
}

export const getAiStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<AiStatus> => ({
    mistral: Boolean(mistralKey()),
    gemini: Boolean(geminiKey()),
    openai: Boolean(openaiKey()),
    locked: Boolean(
      (process.env.GENERATE_ACCESS_TOKEN ?? process.env.API_SECRET ?? "").trim(),
    ),
  }),
);

export const validationHealth = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    ok: boolean;
    strategy: string;
    browser: 'ok' | 'failed' | 'not_configured';
    static: 'ok';
    browserPoolSize?: number;
    activePages?: number;
    config: {
      enabled: boolean;
      maxRetries: number;
      timeoutMs: number;
      browserPoolSize: number;
      maxHtmlSize: number;
      strategy: string;
    };
  }> => {
    try {
      // Dynamic import to avoid client-side bundling
      const { validationHealthCheck, getValidationStrategy, getValidationConfig } = await import("@/lib/ai/validation/index.server");

      const healthResult = await validationHealthCheck();
      const strategy = getValidationStrategy();
      const config = getValidationConfig();

      const details = healthResult.details as Record<string, unknown> | undefined;

      return {
        ok: healthResult.ok,
        strategy,
        browser: details && 'browser' in details
          ? details.browser as 'ok' | 'failed' | 'not_configured'
          : 'not_configured',
        static: 'ok',
        browserPoolSize: details && typeof details.poolSize === 'number' ? details.poolSize : undefined,
        activePages: details && typeof details.activePages === 'number' ? details.activePages : undefined,
        config
      };
    } catch {
      return {
        ok: false,
        strategy: 'none',
        browser: 'failed',
        static: 'ok',
        config: {
          enabled: SELF_REPAIR_ENABLED,
          maxRetries: MAX_REPAIR_RETRIES,
          timeoutMs: VALIDATION_TIMEOUT_MS,
          browserPoolSize: Number(process.env.BROWSER_POOL_SIZE || 2),
          maxHtmlSize: Number(process.env.VALIDATION_MAX_HTML_SIZE || 500000),
          strategy: process.env.VALIDATION_STRATEGY || 'auto'
        }
      };
    }
  }
);

export const redeemGenerateAccess = createServerFn({ method: "POST" })
  .validator((input: { token: string }) => ({
    token: String(input?.token ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const { redeemAccess } = await import("./generate-guard.server");
    return redeemAccess(data.token);
  });

export const generatePreview = createServerFn({ method: "POST" })
  .validator((input: { prompt: string; html?: string }) => ({
    prompt: String(input?.prompt ?? "").slice(0, 4000),
    html: String(input?.html ?? "").slice(0, 32000),
  }))
  .handler(async ({ data }): Promise<GenerateResult> => {
    const { applyGateHttp, gateGenerate, GenerateGateError } = await import(
      "./generate-guard.server"
    );
    const { incomingGenerateSignal, logGenerateAbort } = await import(
      "./generate-abort.server"
    );
    const signal = incomingGenerateSignal();
    try {
      await gateGenerate();
    } catch (e) {
      if (e instanceof GenerateGateError) {
        applyGateHttp(e);
        return {
          ok: false,
          error: e.message,
          status: e.status,
          retryAfter: e.retryAfter,
        };
      }
      throw e;
    }

    if (signal.aborted) {
      logGenerateAbort(signal);
      return { ok: false, error: "Cancelled", status: 499, aborted: true };
    }

    if (!data.prompt.trim() && !data.html.trim()) {
      return { ok: false, error: "Brief is empty", status: 400 };
    }

    // Use the self-repair loop
    return generateWithRepair(data.prompt, data.html, 0, signal);
  });
