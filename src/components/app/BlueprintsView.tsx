import { Button } from "@/components/ui/button";
import { useStudioStore } from "@/stores/studio-store";
import { useWorkspaceStore, type BlueprintItem } from "@/stores/workspace-store";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  Code2,
  Copy,
  Download,
  FileCode2,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type SortMode = "all" | "recent" | "az";

import {
  SMART_API_POWERUPS,
  safeFileName,
  applyPowerUp,
} from "@/lib/blueprints/powerups";

function downloadHtml(blueprint: BlueprintItem) {
  const blob = new Blob([blueprint.html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeFileName(blueprint.title);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function BlueprintsView() {
  const navigate = useNavigate();
  const html = useStudioStore((s) => s.html);
  const title = useStudioStore((s) => s.title);
  const applyResult = useStudioStore((s) => s.applyResult);
  const blueprints = useWorkspaceStore((s) => s.blueprints);
  const addBlueprint = useWorkspaceStore((s) => s.addBlueprint);
  const renameBlueprint = useWorkspaceStore((s) => s.renameBlueprint);
  const duplicateBlueprint = useWorkspaceStore((s) => s.duplicateBlueprint);
  const removeBlueprint = useWorkspaceStore((s) => s.removeBlueprint);
  const upsertProject = useWorkspaceStore((s) => s.upsertProject);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [notice, setNotice] = useState("");

  const visibleBlueprints = useMemo(() => {
    const filtered = blueprints.filter((blueprint) =>
      blueprint.title.toLocaleLowerCase("sk").includes(query.trim().toLocaleLowerCase("sk")),
    );
    return [...filtered].sort((a, b) => {
      if (sortMode === "az") return a.title.localeCompare(b.title, "sk");
      if (sortMode === "recent") return b.updatedAt - a.updatedAt;
      return 0;
    });
  }, [blueprints, query, sortMode]);

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2400);
  }

  function apply(blueprint: BlueprintItem) {
    applyResult({
      title: blueprint.title,
      html: blueprint.html,
      code: blueprint.html,
      assistantText: "Blueprint loaded.",
      provider: "local",
    });
    upsertProject({ title: blueprint.title, html: blueprint.html, code: blueprint.html });
  }

  function startRename(blueprint: BlueprintItem) {
    setEditingId(blueprint.id);
    setEditingTitle(blueprint.title);
  }

  function saveRename(blueprint: BlueprintItem) {
    const nextTitle = editingTitle.trim();
    if (!nextTitle) return;
    renameBlueprint(blueprint.id, nextTitle);
    setEditingId(null);
    showNotice("Blueprint premenovaný");
  }

  function confirmRemove(blueprint: BlueprintItem) {
    if (window.confirm(`Naozaj chceš zmazať blueprint „${blueprint.title}“?`)) {
      removeBlueprint(blueprint.id);
      showNotice("Blueprint zmazaný");
    }
  }

  function onApplyPowerUp(prompt: string) {
    applyPowerUp(prompt, (opts) => {
      void navigate(opts);
    });
  }

  return (
    <div className="h-full overflow-y-auto px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 rounded-3xl border border-border bg-surface p-5 sm:p-7">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Vlastné</p>
              <h1 className="mt-2 font-serif text-4xl tracking-tight">Blueprinty</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                Tvoja knižnica uložených návrhov. Upravuj, duplikuj a exportuj svoje
                najlepšie nápady bez opúšťania workspace.
              </p>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
              <Sparkles className="size-5 text-accent" />
              <div>
                <p className="text-2xl font-semibold tabular-nums">{blueprints.length}</p>
                <p className="text-xs text-muted">uložených blueprintov</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Hľadať blueprinty</span>
              <Search className="pointer-events-none absolute left-3 top-3 size-4 text-subtle" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Hľadať blueprinty…"
                className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm text-fg outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <div className="flex rounded-xl border border-border bg-card p-1" aria-label="Zoradenie blueprintov">
              {([
                ["all", "Všetky"],
                ["recent", "Nedávno upravené"],
                ["az", "A–Z"],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setSortMode(value)}
                  className={`rounded-lg px-3 py-2 text-xs transition focus:outline-none focus:ring-2 focus:ring-accent/50 ${
                    sortMode === value ? "bg-accent text-accent-fg" : "text-muted hover:text-fg"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button
              type="button"
              disabled={!html}
              onClick={() => {
                addBlueprint(title, html);
                showNotice("Blueprint uložený");
              }}
            >
              <Sparkles className="mr-2 size-4" />
              Uložiť aktuálny náhľad
            </Button>
          </div>
        </div>

        <section className="mt-5 rounded-3xl border border-accent/20 bg-accent/5 p-5 sm:p-7">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-accent">Smart API Power-Ups</p>
              <h2 className="mt-2 font-serif text-2xl tracking-tight">Pripravené integračné bloky</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                Jedným kliknutím vložíš otestovaný brief s bezpečnými loading a error stavmi do Projekty.
              </p>
            </div>
            <span className="text-xs text-subtle">1 klik → upraviť → Generate</span>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {SMART_API_POWERUPS.map((powerUp) => (
              <button
                key={powerUp.id}
                type="button"
                onClick={() => onApplyPowerUp(powerUp.prompt)}
                className="group rounded-2xl border border-border bg-surface p-4 text-left transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-lg hover:shadow-black/10 focus:outline-none focus:ring-2 focus:ring-accent/40"
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-accent/15 text-lg text-accent" aria-hidden="true">
                  {powerUp.icon}
                </span>
                <strong className="mt-3 block text-sm">{powerUp.title}</strong>
                <span className="mt-1 block text-xs leading-relaxed text-muted">{powerUp.detail}</span>
                <span className="mt-3 block text-xs font-medium text-accent group-hover:underline">Použiť power-up →</span>
              </button>
            ))}
          </div>
        </section>

        {!html ? (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-accent/30 bg-accent/10 p-4 text-sm text-muted">
            <Code2 className="size-5 shrink-0 text-accent" />
            <span>
              Najprv vygeneruj plochu v{" "}
              <Link to="/studio" className="font-medium text-accent underline-offset-4 hover:underline">
                Projektoch
              </Link>
              .
            </span>
          </div>
        ) : null}

        <div className="mt-7 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Zobrazené <span className="font-medium text-fg">{visibleBlueprints.length}</span> z{" "}
            <span className="font-medium text-fg">{blueprints.length}</span>
          </p>
          {notice ? (
            <p role="status" className="flex items-center gap-2 text-sm text-emerald-300">
              <Check className="size-4" />
              {notice}
            </p>
          ) : null}
        </div>

        {visibleBlueprints.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-dashed border-border bg-surface p-10 text-center">
            <FileCode2 className="mx-auto size-10 text-subtle" />
            <h2 className="mt-4 text-lg font-semibold">
              {blueprints.length ? "Nenašli sa žiadne blueprinty" : "Zatiaľ žiadne blueprinty"}
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">
              {blueprints.length
                ? "Skús upraviť vyhľadávanie alebo filter."
                : "Ulož si prvý návrh z Projekty a vytvor si vlastnú knižnicu."}
            </p>
            {blueprints.length ? (
              <Button type="button" variant="ghost" className="mt-5" onClick={() => {
                setQuery("");
                setSortMode("all");
              }}>
                Vymazať filter
              </Button>
            ) : (
              <Link to="/studio" className="mt-5 inline-flex text-sm font-medium text-accent hover:underline">
                Otvoriť Projekty <span aria-hidden="true" className="ml-1">→</span>
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleBlueprints.map((blueprint) => (
              <article
                key={blueprint.id}
                className="group flex min-h-60 flex-col rounded-3xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-xl hover:shadow-black/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-xl border border-border bg-card p-2 text-accent">
                      <FileCode2 className="size-5" />
                    </div>
                    {editingId === blueprint.id ? (
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={(event) => setEditingTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveRename(blueprint);
                          if (event.key === "Escape") setEditingId(null);
                        }}
                        aria-label="Nový názov blueprintu"
                        className="min-w-0 w-full rounded-lg border border-accent bg-card px-2 py-1 text-sm text-fg outline-none"
                      />
                    ) : (
                      <h2 className="truncate text-sm font-semibold">{blueprint.title}</h2>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-card px-2 py-1 text-[11px] text-muted">
                    HTML
                  </span>
                </div>

                <div className="mt-5 min-h-24 overflow-hidden rounded-2xl border border-border bg-canvas p-3">
                  <div className="flex items-center gap-2 text-xs text-subtle">
                    <Code2 className="size-3.5 text-accent" />
                    Náhľad HTML
                  </div>
                  <div className="mt-3 space-y-2 opacity-60">
                    <div className="h-2 w-3/4 rounded-full bg-accent/50" />
                    <div className="h-2 w-full rounded-full bg-border" />
                    <div className="h-2 w-5/6 rounded-full bg-border" />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-muted">
                  <span>{new Intl.NumberFormat("sk-SK").format(blueprint.html.length)} znakov</span>
                  <time dateTime={new Date(blueprint.updatedAt).toISOString()}>
                    {new Date(blueprint.updatedAt).toLocaleDateString("sk-SK")}
                  </time>
                </div>

                <div className="mt-auto flex flex-wrap gap-2 pt-4">
                  <Button type="button" size="sm" onClick={() => apply(blueprint)}>
                    Použiť
                  </Button>
                  {editingId === blueprint.id ? (
                    <>
                      <Button type="button" size="sm" variant="ghost" onClick={() => saveRename(blueprint)}>
                        <Check className="mr-1.5 size-3.5" /> Uložiť
                      </Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="mr-1.5 size-3.5" /> Zrušiť
                      </Button>
                    </>
                  ) : (
                    <Button type="button" size="sm" variant="ghost" onClick={() => startRename(blueprint)}>
                      <Pencil className="mr-1.5 size-3.5" /> Premenovať
                    </Button>
                  )}
                  <Button type="button" size="sm" variant="ghost" onClick={() => {
                    duplicateBlueprint(blueprint.id);
                    showNotice("Blueprint duplikovaný");
                  }}>
                    <Copy className="mr-1.5 size-3.5" /> Duplikovať
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => {
                    downloadHtml(blueprint);
                    showNotice("HTML exportovaný");
                  }}>
                    <Download className="mr-1.5 size-3.5" /> Exportovať HTML
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Zmazať blueprint ${blueprint.title}`}
                    onClick={() => confirmRemove(blueprint)}
                    className="text-red-300 hover:text-red-200"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
