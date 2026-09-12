import { createServerFn } from "@tanstack/react-start";
import { abortKind } from "@/lib/ai/abort-signal";
import { injectCozyElements } from "@/lib/preview/cozy-elements";

export type AiProvider = "grok";

export type GenerateResult =
  | {
      ok: true;
      title: string;
      html: string;
      code: string;
      provider: AiProvider;
      model: string;
    }
  | {
      ok: false;
      error: string;
      status?: number;
      retryAfter?: number;
      aborted?: boolean;
    };

export type AiStatus = {
  grok: boolean;
  locked: boolean;
};

const WC =
  " A Cozy Web Components runtime is already injected (do not redefine, no CDNs). Prefer: <cozy-app kicker heading lede>, <cozy-board>, <cozy-column name>, <cozy-card priority>, <cozy-chip>, <cozy-btn variant=ghost type=submit>, <cozy-msg role=user|assistant>. Put copy in light DOM (slots). Native inputs are fine inside <cozy-app>. Column titles live only on cozy-column name — do not nest a second heading with the same label.";

const CREATE_SYSTEM =
  "You generate a single self-contained HTML document for the user's brief. Output ONLY a complete HTML file (doctype through </html>). No markdown. Warm paper background #f4efe6, ink text #1c1915, terracotta #c45c38 for primary actions. Vanilla JS only. Wrap localStorage in try/catch. No Tailwind, no CDNs, no external scripts, no Node APIs, no Vite." +
  WC;

const REVISE_SYSTEM =
  "You revise an existing self-contained HTML document. Apply the user's change request. Output ONLY a complete HTML file (doctype through </html>). No markdown. Keep warm paper background #f4efe6, ink text #1c1915, terracotta #c45c38. Vanilla JS only. Wrap localStorage in try/catch. No Tailwind, no CDNs, no external scripts, no Node APIs, no Vite. Preserve structure and working behavior unless the user asks to change it. Keep Cozy custom elements (<cozy-*>) if present; do not strip the data-cozy-elements script.";

function grokKey(): string | null {
  return (process.env.XAI_API_KEY ?? "").trim() || null;
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
        temperature: 0.35,
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

export const getAiStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<AiStatus> => ({
    grok: Boolean(grokKey()),
    locked: Boolean(
      (process.env.GENERATE_ACCESS_TOKEN ?? process.env.API_SECRET ?? "").trim(),
    ),
  }),
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
    html: String(input?.html ?? "").slice(0, 16000),
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
      gateGenerate();
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

    const revising = Boolean(data.html);
    const system = revising ? REVISE_SYSTEM : CREATE_SYSTEM;
    const prompt = revising
      ? `Change request:\n${data.prompt || "Tighten the layout."}\n\nCurrent HTML:\n${data.html}`
      : data.prompt || "A calm personal studio landing page.";

    const xai = grokKey();
    if (!xai) {
      return { ok: false, error: "Grok API key (XAI_API_KEY) is not configured", status: 503 };
    }

    const grok = await complete({
      url: "https://api.x.ai/v1/chat/completions",
      key: xai,
      model: "grok-4.5",
      system,
      prompt,
      maxTokens: 4096,
      signal,
    });

    if (grok.ok) {
      const packed = pack(grok.text, "grok", "grok-4.5");
      if (packed.ok) return packed;
      return { ok: false, error: packed.error };
    }
    if (grok.aborted) {
      logGenerateAbort(signal);
      return { ok: false, error: "Cancelled", status: 499, aborted: true };
    }
    return { ok: false, error: grok.error };
  });
