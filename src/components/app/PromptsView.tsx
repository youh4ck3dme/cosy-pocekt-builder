import { useState, useMemo, lazy, Suspense } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useStudioStore } from "@/stores/studio-store";
import { useWorkspaceStore, type PromptItem } from "@/stores/workspace-store";
import {
  analyzePrompt,
  improvePrompt,
  CRITERIA,
  scoreBadgeClass,
  scoreColor,
} from "@/lib/prompts/criteria";
import { PROMPT_TEMPLATES, type PromptTemplate } from "@/lib/prompts/templates";
import { ScoreRing, CriteriaBars } from "@/components/prompts/ScoreVisuals";
import {
  Sparkles,
  Copy,
  Check,
  Search,
  Trash2,
} from "lucide-react";

const PromptDiffViewer = lazy(() =>
  import("@/components/prompts/PromptDiffViewer").then((m) => ({
    default: m.PromptDiffViewer,
  })),
);

type ActiveTab = "criteria" | "diff" | "templates" | "library";

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function WandIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m15 4-2 2M15 4l2 2M15 4v4M15 4h4M2 2l20 20" />
    </svg>
  );
}

export function PromptsView() {
  const prompts = useWorkspaceStore((s) => s.prompts);
  const addPrompt = useWorkspaceStore((s) => s.addPrompt);
  const removePrompt = useWorkspaceStore((s) => s.removePrompt);
  const setBrief = useStudioStore((s) => s.setBrief);
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [originalPrompt, setOriginalPrompt] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTab>("criteria");
  const [selectedCriterionId, setSelectedCriterionId] = useState<string | null>("specification");
  const [copied, setCopied] = useState(false);
  const [libraryQuery, setLibraryQuery] = useState("");

  const analysis = useMemo(() => analyzePrompt(prompt), [prompt]);

  const selectedCriterion = useMemo(() => {
    return CRITERIA.find((c) => c.id === selectedCriterionId) ?? CRITERIA[0];
  }, [selectedCriterionId]);

  const selectedCriterionScore = useMemo(() => {
    return analysis.scores.find((s) => s.id === selectedCriterion.id);
  }, [analysis, selectedCriterion]);

  function handleImprove() {
    if (!prompt.trim()) return;
    setOriginalPrompt(prompt);
    const improved = improvePrompt(prompt, analysis);
    setPrompt(improved);
    setActiveTab("diff");
  }

  function handleReset() {
    if (originalPrompt) {
      setPrompt(originalPrompt);
      setOriginalPrompt("");
    } else {
      setPrompt("");
      setTitle("");
    }
  }

  function handleSave() {
    if (!prompt.trim()) return;
    addPrompt(title, prompt);
    setTitle("");
  }

  function handleRunInStudio(text: string) {
    if (!text.trim()) return;
    setBrief(text);
    void navigate({ to: "/studio" });
  }

  async function handleCopy() {
    if (!prompt.trim()) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function applyTemplate(tpl: PromptTemplate) {
    setOriginalPrompt(prompt);
    setTitle(tpl.name);
    setPrompt(tpl.body);
    setActiveTab("criteria");
  }

  const filteredPrompts = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return prompts;
    return prompts.filter(
      (p) => p.title.toLowerCase().includes(q) || p.body.toLowerCase().includes(q),
    );
  }, [prompts, libraryQuery]);

  return (
    <div className="h-full overflow-y-auto px-5 py-6 sm:px-8">
      {/* Header section */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Architektúra & Prompt Forge</p>
          <h1 className="mt-1 font-serif text-3xl tracking-tight">Prompt Forge & Auditor</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
            Analyzuj prompt v reálnom čase podľa 7 kritérií softvérového inžinierstva, doplň chýbajúce špecifikácie a spusti čisté zadanie v Štúdiu.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!prompt.trim()}
          >
            {copied ? <Check className="size-4 text-emerald-400" /> : <Copy className="size-4" />}
            <span>{copied ? "Skopírované" : "Kopírovať"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!prompt.trim()}
          >
            <span>Uložiť do knižnice</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => handleRunInStudio(prompt)}
            disabled={!prompt.trim()}
          >
            <PlayIcon className="size-3.5 mr-1" />
            <span>Spustiť v Štúdiu</span>
          </Button>
        </div>
      </div>

      {/* Main Grid: Editor & Scoring Panel */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* Left: Interactive Prompt Editor */}
        <div className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="mb-3">
            <input
              id="prompt-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              placeholder="Názov zadania (napr. Rezervačný systém pre kaderníctvo)"
            />
          </div>

          <textarea
            id="prompt-body"
            rows={10}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full flex-1 resize-none rounded-xl border border-border bg-card p-3.5 font-mono text-xs leading-relaxed text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
            placeholder="Zadaj podrobný brief pre aplikáciu (cieľ, obrazovky, technológie, UX, dátový model)..."
          />

          {/* Editor Footer Toolbar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3 text-xs text-muted">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-card px-2.5 py-1 font-mono text-[11px]">
                {analysis.words} slov
              </span>
              <span className="rounded-lg bg-card px-2.5 py-1 font-mono text-[11px]">
                {analysis.chars} znakov
              </span>
              {originalPrompt && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 text-[11px] text-muted hover:text-fg"
                >
                  ↺ Vrátiť pôvodný
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleImprove}
                disabled={!prompt.trim()}
                className="border-accent/40 bg-accent/10 text-accent hover:bg-accent/20"
              >
                <WandIcon className="size-4" />
                <span>Vylepšiť prompt</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Right: Score Ring & Criteria Summary */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div>
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                Audit Skóre Promptu
              </span>
              <span className={`text-xs font-bold ${scoreColor(analysis.total)}`}>
                {analysis.total >= 80 ? "Pripravené na produkciu" : analysis.total >= 55 ? "Vyžaduje doplnenie" : "Nedostatočná špecifikácia"}
              </span>
            </div>

            <div className="my-5 flex flex-col items-center justify-center sm:flex-row sm:gap-6">
              <ScoreRing value={analysis.total} grade={analysis.grade} />
              <div className="mt-4 text-center sm:mt-0 sm:text-left">
                <p className="text-sm font-semibold text-fg">
                  {analysis.total >= 90
                    ? "Vynikajúci prompt"
                    : analysis.total >= 75
                      ? "Veľmi dobrý prompt"
                      : analysis.total >= 55
                        ? "Základná štruktúra"
                        : "Príliš stručný brief"}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {analysis.total >= 80
                    ? "Prompt obsahuje jasný cieľ, architektúru, komponenty aj akceptačné kritériá."
                    : "Pre dosiahnutie najlepších výsledkov v Štúdiu kliknite na „Vylepšiť prompt“."}
                </p>
              </div>
            </div>

            {/* Criteria Overview Bars */}
            <div className="mt-2 border-t border-border/60 pt-3">
              <CriteriaBars
                result={analysis}
                onSelectCriterion={(id) => {
                  setSelectedCriterionId(id);
                  setActiveTab("criteria");
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Section */}
      <div className="mt-8">
        <div className="flex border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("criteria")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "criteria"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            <span>Kritériá a Checklist</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("diff")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "diff"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            <span>Diff Porovnanie</span>
            {originalPrompt && (
              <span className="size-2 rounded-full bg-accent" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "templates"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            <span>Pripravené Šablóny</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("library")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
              activeTab === "library"
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            <span>Moja Knižnica ({prompts.length})</span>
          </button>
        </div>

        {/* Tab 1: Criteria & Checklist Breakdown */}
        {activeTab === "criteria" && (
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            {/* Criteria list selector */}
            <div className="space-y-1.5 rounded-2xl border border-border bg-surface p-3">
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                Vyberte kritérium
              </p>
              {CRITERIA.map((c) => {
                const s = analysis.scores.find((score) => score.id === c.id);
                const isSelected = selectedCriterion.id === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCriterionId(c.id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium transition ${
                      isSelected
                        ? "bg-accent/15 text-accent shadow-sm"
                        : "text-muted hover:bg-card hover:text-fg"
                    }`}
                  >
                    <span>{c.name}</span>
                    <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] ${scoreBadgeClass(s?.score ?? 0)}`}>
                      {s?.score ?? 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected criterion details */}
            <div className="rounded-2xl border border-border bg-surface p-5 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-fg">
                    {selectedCriterion.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-muted">
                    {selectedCriterion.description}
                  </p>
                </div>
                <span className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-bold ${scoreBadgeClass(selectedCriterionScore?.score ?? 0)}`}>
                  Skóre: {selectedCriterionScore?.score ?? 0} / 100
                </span>
              </div>

              {/* Checklist items */}
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                  Odporúčaný checklist
                </p>
                <ul className="mt-2.5 space-y-2 text-xs">
                  {selectedCriterion.checklist.map((item, i) => {
                    const isMissing = selectedCriterionScore?.missing.includes(item);
                    return (
                      <li
                        key={i}
                        className={`flex items-start gap-2.5 rounded-xl border p-2.5 ${
                          isMissing
                            ? "border-border/60 bg-card/40 text-muted"
                            : "border-emerald-500/20 bg-emerald-500/5 text-emerald-300"
                        }`}
                      >
                        <span className={`mt-0.5 font-bold ${isMissing ? "text-subtle" : "text-emerald-400"}`}>
                          {isMissing ? "○" : "✓"}
                        </span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Expert tip */}
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs text-accent">
                <Sparkles className="size-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Odborný tip: </span>
                  <span>{selectedCriterion.tip}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Diff Viewer */}
        {activeTab === "diff" && (
          <div className="mt-5 space-y-4">
            <Suspense fallback={<div className="py-6 text-center text-xs text-muted">Načítavam porovnanie...</div>}>
              <PromptDiffViewer
                original={originalPrompt}
                improved={prompt}
              />
            </Suspense>
          </div>
        )}

        {/* Tab 3: Curated Templates */}
        {activeTab === "templates" && (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {PROMPT_TEMPLATES.map((tpl) => (
              <div
                key={tpl.id}
                className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 transition hover:border-accent/40 hover:shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-md border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted">
                      {tpl.category}
                    </span>
                    <span className="text-[10px] font-medium text-accent">
                      {tpl.badge}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-sm font-semibold text-fg">{tpl.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    {tpl.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border/50">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => applyTemplate(tpl)}
                  >
                    Vložiť do editora
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleRunInStudio(tpl.body)}
                  >
                    <PlayIcon className="size-3.5 fill-current" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: User's Saved Prompts Library */}
        {activeTab === "library" && (
          <div className="mt-5 space-y-4">
            {prompts.length > 0 && (
              <div className="relative max-w-md">
                <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted" />
                <input
                  value={libraryQuery}
                  onChange={(e) => setLibraryQuery(e.target.value)}
                  placeholder="Hľadať v uložených promptoch..."
                  className="h-9 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-xs text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                />
              </div>
            )}

            {filteredPrompts.length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface/50 p-8 text-center text-xs text-muted">
                {prompts.length === 0
                  ? "Zatiaľ nemáte žiadne uložené prompty. Napíšte prompt a kliknite na „Uložiť do knižnice“."
                  : "Nenašli sa žiadne prompty vyhovujúce filtru."}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredPrompts.map((p: PromptItem) => (
                  <div
                    key={p.id}
                    className="flex flex-col justify-between rounded-2xl border border-border bg-surface p-4 transition hover:border-border/80"
                  >
                    <div>
                      <h4 className="text-sm font-semibold text-fg">{p.title}</h4>
                      <p className="mt-1 line-clamp-3 font-mono text-xs leading-relaxed text-muted">
                        {p.body}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTitle(p.title);
                            setPrompt(p.body);
                            setActiveTab("criteria");
                          }}
                        >
                          Načítať
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleRunInStudio(p.body)}
                        >
                          <PlayIcon className="size-3.5 fill-current mr-1" /> Štúdio
                        </Button>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removePrompt(p.id)}
                        className="text-muted hover:text-rose-400"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
