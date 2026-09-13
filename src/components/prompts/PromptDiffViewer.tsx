import { diffLines, type DiffLine } from "@/lib/prompts/diff";
import { useMemo } from "react";

export function PromptDiffViewer({
  original,
  improved,
}: {
  original: string;
  improved: string;
}) {
  const diff = useMemo(() => {
    if (!original.trim() && !improved.trim()) return [];
    return diffLines(original, improved);
  }, [original, improved]);

  if (!diff.length) {
    return (
      <div className="py-8 text-center text-xs text-muted">
        Zatiaľ žiadne zmeny. Kliknite na tlačidlo „Vylepšiť prompt“ pre vygenerovanie návrhov.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/60 font-mono text-xs shadow-inner">
      <div className="flex items-center justify-between border-b border-border bg-surface/80 px-4 py-2 text-[11px] font-medium text-muted">
        <span>Riadkové porovnanie (LCS Diff)</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="size-2 rounded-full bg-emerald-500" /> Pridané
          </span>
          <span className="flex items-center gap-1 text-rose-400">
            <span className="size-2 rounded-full bg-rose-500" /> Odstránené
          </span>
        </div>
      </div>
      <div className="max-h-95 overflow-y-auto p-3 font-mono leading-relaxed">
        {diff.map((line: DiffLine, idx: number) => {
          if (line.type === "add") {
            return (
              <div
                key={idx}
                className="flex items-start gap-2 rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-300"
              >
                <span className="select-none font-bold text-emerald-400">+</span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap wrap-break-word">{line.text || " "}</span>
              </div>
            );
          }
          if (line.type === "remove") {
            return (
              <div
                key={idx}
                className="flex items-start gap-2 rounded bg-rose-500/10 px-2 py-0.5 text-rose-300 line-through opacity-70"
              >
                <span className="select-none font-bold text-rose-400">-</span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap wrap-break-word">{line.text || " "}</span>
              </div>
            );
          }
          return (
            <div key={idx} className="flex items-start gap-2 px-2 py-0.5 text-fg/80">
              <span className="select-none text-muted opacity-40">·</span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap wrap-break-word">{line.text || " "}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
