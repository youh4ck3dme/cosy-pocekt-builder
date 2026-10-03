import * as React from "react";
import { PROMPT_PRESETS, type PromptPreset } from "@/lib/prompt.presets";

export function SlashMenu({
  query,
  onPick,
  onClose,
}: {
  query: string;
  onPick: (preset: PromptPreset) => void;
  onClose: () => void;
}) {
  const q = query.replace(/^\//, "").toLowerCase();
  const items = PROMPT_PRESETS.filter(
    (p) => !q || p.id.includes(q) || p.label.slice(1).includes(q) || p.hint.toLowerCase().includes(q),
  );

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!items.length) return null;

  return (
    <div className="absolute bottom-[calc(100%+8px)] left-0 right-0 z-30 max-h-56 overflow-y-auto rounded-lg border border-border bg-card shadow-2xl">
      {items.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onPick(p)}
          className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-surface"
        >
          <span className="font-mono text-[11px]" style={{ color: "var(--color-accent)" }}>
            {p.label}
          </span>
          <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-muted">
            {p.hint}
          </span>
        </button>
      ))}
    </div>
  );
}
