// Default raised to 500s so long/complex PWA generations don't hit a premature
// abort. Server reads GENERATION_TIMEOUT_MS; the client bundle (where `process`
// is absent) falls back to the 500s default via the try/catch.
function resolveGenerateTimeout(): number {
  try {
    const raw = Number(process.env.GENERATION_TIMEOUT_MS);
    if (Number.isFinite(raw) && raw > 0) return raw;
  } catch {
    /* process is not defined in the client bundle — use the default below */
  }
  return 500_000;
}

export const GENERATE_TIMEOUT_MS = resolveGenerateTimeout();

export function combineAbortSignals(
  ...signals: AbortSignal[]
): AbortSignal {
  const live = signals.filter((signal) => Boolean(signal));
  if (live.length === 0) return new AbortController().signal;
  if (live.length === 1) return live[0]!;
  const anyFn = (AbortSignal as typeof AbortSignal & {
    any?: (input: AbortSignal[]) => AbortSignal;
  }).any;
  if (typeof anyFn === "function") return anyFn(live);
  const controller = new AbortController();
  const onAbort = (event: Event) => {
    const target = event.target as AbortSignal | null;
    controller.abort(target?.reason);
  };
  for (const signal of live) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  }
  return controller.signal;
}

export function withTimeout(
  signal: AbortSignal,
  ms = GENERATE_TIMEOUT_MS,
): AbortSignal {
  return combineAbortSignals(signal, AbortSignal.timeout(ms));
}

export function isAbortError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const name = "name" in error ? String(error.name) : "";
  const message = "message" in error ? String(error.message) : "";
  return (
    name === "AbortError" ||
    name === "TimeoutError" ||
    /aborted|abort|cancell?ed/i.test(message)
  );
}

export function abortKind(
  signal: AbortSignal | undefined,
): "timeout" | "cancel" | null {
  if (!signal?.aborted) return null;
  const reason = signal.reason;
  if (
    reason &&
    typeof reason === "object" &&
    "name" in reason &&
    String(reason.name) === "TimeoutError"
  ) {
    return "timeout";
  }
  return "cancel";
}
