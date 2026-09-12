import { CodeViewer } from "@/components/studio/CodeViewer";
import { ExportActions } from "@/components/studio/ExportActions";
import { GenerateButton } from "@/components/studio/GenerateButton";
import { LivePreview } from "@/components/studio/LivePreview";
import { StopButton } from "@/components/studio/StopButton";
import { ThinkingStatus } from "@/components/studio/ThinkingStatus";
import { Button } from "@/components/ui/button";
import { isAbortError } from "@/lib/ai/abort-signal";
import { generatePreview, getAiStatus, type AiStatus } from "@/lib/ai/generate";
import { localPreviewHtml } from "@/lib/preview/local-templates";
import {
  clearOfflinePreview,
  persistOfflinePreview,
  readOfflinePreview,
} from "@/lib/pwa/offline";
import { useOnline } from "@/lib/pwa/use-online";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/stores/studio-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { Code2, Eye, MessageSquare } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MobilePanel = "chat" | "code" | "preview";

function providerLabel(status: AiStatus | null, used: string | null): string {
  if (used === "grok") return "Grok";
  if (used === "local") return "Local";
  if (status?.grok) return "Grok";
  return "Local";
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function StudioShell() {
  const brief = useStudioStore((s) => s.brief);
  const setBrief = useStudioStore((s) => s.setBrief);
  const running = useStudioStore((s) => s.running);
  const beginGenerate = useStudioStore((s) => s.beginGenerate);
  const stopGenerate = useStudioStore((s) => s.stopGenerate);
  const finishGenerate = useStudioStore((s) => s.finishGenerate);
  const failGenerate = useStudioStore((s) => s.failGenerate);
  const pushUser = useStudioStore((s) => s.pushUser);
  const pushAssistant = useStudioStore((s) => s.pushAssistant);
  const applyResult = useStudioStore((s) => s.applyResult);
  const setError = useStudioStore((s) => s.setError);
  const resetStore = useStudioStore((s) => s.reset);
  const hydratePreview = useStudioStore((s) => s.hydratePreview);
  const error = useStudioStore((s) => s.error);
  const messages = useStudioStore((s) => s.messages);
  const html = useStudioStore((s) => s.html);
  const code = useStudioStore((s) => s.code);
  const title = useStudioStore((s) => s.title);
  const provider = useStudioStore((s) => s.provider);
  const loadPreview = useStudioStore((s) => s.loadPreview);
  const updateCode = useStudioStore((s) => s.updateCode);
  const projects = useWorkspaceStore((s) => s.projects);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const setCurrentProjectId = useWorkspaceStore((s) => s.setCurrentProjectId);
  const upsertProject = useWorkspaceStore((s) => s.upsertProject);
  const removeProject = useWorkspaceStore((s) => s.removeProject);
  const [panel, setPanel] = useState<MobilePanel>("chat");
  const [showSource, setShowSource] = useState(false);
  const [status, setStatus] = useState<AiStatus | null>(null);
  const online = useOnline();
  const thinkRef = useRef<HTMLDivElement>(null);
  const runId = useRef(0);

  useEffect(() => {
    void getAiStatus().then(setStatus);
  }, []);

  useEffect(() => {
    if (!html) return;
    void persistOfflinePreview({ html, title, code });
  }, [html, title, code]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (cancelled || useStudioStore.getState().html) return;
      void readOfflinePreview().then((saved) => {
        if (!cancelled && saved?.html && !useStudioStore.getState().html) {
          hydratePreview(saved);
          setPanel("preview");
        }
      });
    }, 80);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hydratePreview]);

  useEffect(() => {
    if (!running) return;
    thinkRef.current?.scrollIntoView({ block: "nearest" });
  }, [running, messages.length]);

  useEffect(() => {
    return () => {
      const controller = useStudioStore.getState().abortController;
      controller?.abort();
      useStudioStore.setState({ abortController: null, running: false });
    };
  }, []);

  function stop() {
    runId.current += 1;
    stopGenerate();
  }

  function reset() {
    runId.current += 1;
    resetStore();
    setShowSource(false);
    setPanel("chat");
    setCurrentProjectId(null);
    void clearOfflinePreview();
  }

  async function run(promptOverride?: string, opts?: { fresh?: boolean }) {
    const prompt = (promptOverride ?? brief).trim();
    if (!prompt || running) return;
    if (promptOverride) setBrief(prompt);
    const currentHtml = useStudioStore.getState().html;
    const revising = Boolean(currentHtml) && !opts?.fresh;
    const id = ++runId.current;
    const signal = beginGenerate();
    pushUser(prompt);
    const started = Date.now();
    if (!online) {
      if (revising) {
        await sleep(Math.max(0, 700 - (Date.now() - started)));
        if (id !== runId.current || signal.aborted) return;
        pushAssistant("Offline. Preview unchanged.");
        return;
      }
      const local = localPreviewHtml(prompt);
      await sleep(Math.max(0, 900 - (Date.now() - started)));
      if (id !== runId.current || signal.aborted) return;
      applyResult({
        ...local,
        assistantText: "Offline. Local layout saved on this device.",
        provider: "local",
      });
      upsertProject({
        id: useWorkspaceStore.getState().currentProjectId ?? undefined,
        title: local.title,
        html: local.html,
        code: local.code,
      });
      setBrief("");
      setPanel("preview");
      return;
    }
    try {
      const remote = await generatePreview({
        data: { prompt, html: revising ? currentHtml : "" },
        signal,
      });
      if (id !== runId.current || signal.aborted) return;
      if (remote.ok) {
        applyResult({
          title: remote.title,
          code: remote.code,
          html: remote.html,
          assistantText: revising
            ? "Updated the board."
            : "Preview generated with Grok.",
          provider: remote.provider,
        });
        upsertProject({
          id: useWorkspaceStore.getState().currentProjectId ?? undefined,
          title: remote.title,
          html: remote.html,
          code: remote.code,
        });
        setBrief("");
        setPanel("preview");
        return;
      }
      if (remote.aborted) {
        stopGenerate();
        return;
      }
      if (revising || (remote.status && remote.status >= 400)) {
        const detail =
          remote.status === 429 && remote.retryAfter
            ? `${remote.error}. Skús znova o ${remote.retryAfter}s.`
            : remote.error;
        pushAssistant(
          revising ? `${remote.error}. Preview unchanged.` : remote.error,
        );
        setError(detail);
        finishGenerate();
        return;
      }
      const local = localPreviewHtml(prompt);
      await sleep(Math.max(0, 720 - (Date.now() - started)));
      if (id !== runId.current || signal.aborted) return;
      applyResult({
        ...local,
        assistantText: `${remote.error}. Local layout applied.`,
        provider: "local",
      });
      upsertProject({
        id: useWorkspaceStore.getState().currentProjectId ?? undefined,
        title: local.title,
        html: local.html,
        code: local.code,
      });
      setBrief("");
      setPanel("preview");
    } catch (e) {
      if (id !== runId.current) return;
      if (isAbortError(e) || signal.aborted) {
        if (useStudioStore.getState().error === "Cancelled") return;
        failGenerate("Timed out.");
        return;
      }
      const message = e instanceof Error ? e.message : "Generate failed";
      if (revising) {
        pushAssistant("Couldn't update. Preview unchanged.");
        setError(message);
        finishGenerate();
        return;
      }
      const local = localPreviewHtml(prompt);
      await sleep(Math.max(0, 720 - (Date.now() - started)));
      if (id !== runId.current || signal.aborted) return;
      applyResult({
        ...local,
        assistantText: "Generator unavailable. Local layout applied.",
        provider: "local",
      });
      upsertProject({
        id: useWorkspaceStore.getState().currentProjectId ?? undefined,
        title: local.title,
        html: local.html,
        code: local.code,
      });
      setError(message);
      setBrief("");
      setPanel("preview");
    }
  }

  const sourceText = code || html;

  function handleCodeUpdate(newCode: string) {
    updateCode(newCode);
    if (currentProjectId) {
      upsertProject({
        id: currentProjectId,
        title: title || "Project",
        html: newCode,
        code: newCode,
      });
    }
  }

  return (
    <div
      className="flex h-full flex-col bg-bg text-fg"
      data-studio-shell
    >
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-3 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <p className="font-serif text-base tracking-tight">Projekty</p>
          {html ? (
            <span className="hidden truncate text-xs text-muted sm:inline">{title}</span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {!online ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-xs uppercase tracking-wider text-muted">
              Offline
            </span>
          ) : (
            <p className="hidden text-xs tracking-wide text-subtle sm:block">
              {providerLabel(status, provider)}
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hidden lg:inline-flex"
            onClick={() => setShowSource((v) => !v)}
          >
            {showSource ? "Hide source" : "Source"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => reset()}>
            New
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section
          className={cn(
            "min-h-0 w-full flex-col border-r border-border bg-surface lg:flex lg:w-80 lg:shrink-0 lg:flex-none",
            panel === "chat" ? "flex min-h-0 flex-1" : "hidden lg:flex",
          )}
        >
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && !running ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-muted">
                  Napíš brief. Žiadne predpripravené šablóny — plocha vznikne
                  z tvojho textu, promptu alebo blueprintu.
                </p>
                {!online ? (
                  <p className="text-xs leading-relaxed text-subtle">
                    Offline. Posledný náhľad ostáva v tomto zariadení.
                  </p>
                ) : null}
                {projects.length > 0 ? (
                  <ul className="space-y-1">
                    {projects.slice(0, 8).map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentProjectId(p.id);
                            loadPreview({
                              title: p.title,
                              html: p.html,
                              code: p.code,
                            });
                            setPanel("preview");
                          }}
                          className={cn(
                            "flex min-h-11 w-full items-center truncate rounded-xl px-3 text-left text-sm",
                            currentProjectId === p.id
                              ? "bg-card text-fg"
                              : "text-muted hover:bg-card hover:text-fg",
                          )}
                        >
                          {p.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={cn(
                    "wrap-break-word rounded-xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "ml-6 bg-accent text-accent-fg"
                      : "mr-6 border border-border bg-card text-fg",
                  )}
                >
                  {m.text}
                </div>
              ))
            )}
            {running ? (
              <div ref={thinkRef}>
                <ThinkingStatus
                  brief={`${title} ${brief}`}
                  mode={html ? "revise" : "create"}
                />
              </div>
            ) : null}
            {!running && currentProjectId && html ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  removeProject(currentProjectId);
                  reset();
                }}
              >
                Zmazať projekt
              </Button>
            ) : null}
            {error ? <p className="text-xs text-muted">{error}</p> : null}
          </div>
          <form
            className="border-t border-border p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (running) stop();
              else void run();
            }}
          >
            <label className="sr-only" htmlFor="brief">
              Brief
            </label>
            <textarea
              id="brief"
              name="brief"
              rows={3}
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                  e.preventDefault();
                  if (!running) void run();
                }
              }}
              placeholder={
                html
                  ? "Make the columns narrower…"
                  : "Landing pre ateliér, cenník a kontakt…"
              }
              className="min-h-20 w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm leading-relaxed text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            />
            {running ? (
              <StopButton />
            ) : (
              <GenerateButton
                disabled={!brief.trim()}
                hasHtml={Boolean(html)}
                online={online}
              />
            )}
          </form>
        </section>

        <section
          className={cn(
            "min-h-0 min-w-0 flex-col border-r border-border bg-canvas",
            panel === "code" ? "flex min-h-0 flex-1" : "hidden",
            showSource ? "lg:flex lg:w-[45%] lg:shrink-0 lg:flex-none" : "lg:hidden",
          )}
        >
          <CodeViewer
            code={sourceText}
            title={title}
            onUpdateCode={handleCodeUpdate}
          />
        </section>

        <section
          className={cn(
            "min-h-0 min-w-0 flex-1 flex-col bg-canvas lg:flex",
            panel === "preview" ? "flex" : "hidden lg:flex",
          )}
        >
          <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border pl-3 pr-1">
            <p className="min-w-0 truncate text-xs uppercase tracking-widest text-subtle">
              {running
                ? html
                  ? "Upravujem"
                  : "Premýšľanie"
                : online
                  ? "Live preview"
                  : "Saved preview"}
            </p>
            <ExportActions html={html} title={title} />
          </div>
          {html ? (
            <div className="relative min-h-0 flex-1">
              <LivePreview html={html} title={title} />
              {running ? (
                <div className="pointer-events-none absolute bottom-4 left-4">
                  <ThinkingStatus
                    brief={`${title} ${brief}`}
                    variant="chip"
                    mode={html ? "revise" : "create"}
                  />
                </div>
              ) : null}
            </div>
          ) : running ? (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6">
              <ThinkingStatus brief={`${title} ${brief}`} variant="stage" mode="create" />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-sm text-muted">
                {online
                  ? "Napíš brief. Canvas sa vyplní po Generate."
                  : "Offline. Generate lokálny layout, alebo obnov posledný náhľad."}
              </p>
              <ol className="max-w-xs space-y-1.5 text-left text-xs leading-relaxed text-subtle">
                <li>1. Brief, prompt alebo blueprint</li>
                <li>2. Generate na serveri</li>
                <li>3. Upraviť bez vymazania canvasu</li>
              </ol>
            </div>
          )}
        </section>
      </div>

      <nav className="grid shrink-0 grid-cols-3 border-t border-border bg-surface lg:hidden">
        {(
          [
            ["chat", MessageSquare, "Brief"],
            ["code", Code2, "Code"],
            ["preview", Eye, "Preview"],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPanel(id)}
            aria-current={panel === id ? "page" : undefined}
            className={cn(
              "flex h-12 flex-col items-center justify-center gap-0.5 text-xs uppercase tracking-wider",
              panel === id ? "text-accent" : "text-muted",
            )}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
