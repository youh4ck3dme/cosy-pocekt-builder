import * as React from "react";
import { auditHtml, type QualityCheck } from "@/lib/html.quality";

const GOOD = "#5bbf7a";
const BAD = "#ef4444";

export function QualityPanel({
  html,
  onFix,
}: {
  html: string;
  onFix: (fixPrompt: string) => void;
}) {
  const report = React.useMemo(() => auditHtml(html), [html]);

  if (!html.trim()) {
    return (
      <div className="grid h-full place-items-center">
        <span className="font-mono text-[11px] uppercase tracking-widest text-muted">
          ▒▒▒ zatiaľ niet čo analyzovať ▒▒▒
        </span>
      </div>
    );
  }

  const groups: { key: QualityCheck["category"]; label: string }[] = [
    { key: "a11y", label: "Accessibility" },
    { key: "seo", label: "SEO" },
    { key: "perf", label: "Performance" },
  ];
  const failing = report.checks.filter((c) => !c.pass);
  const accent = report.score >= 80 ? GOOD : report.score >= 50 ? "var(--color-accent)" : BAD;

  return (
    <div className="h-full overflow-y-auto px-3 py-3">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2.5">
        <span className="font-mono text-2xl tabular-nums" style={{ color: accent }}>
          {report.score}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted">
            quality score
          </div>
          <div
            className="mt-1 h-[2px] w-full overflow-hidden rounded-full"
            style={{ background: "color-mix(in oklab, var(--color-fg) 8%, transparent)" }}
          >
            <div
              className="h-full transition-[width] duration-500"
              style={{ width: `${report.score}%`, background: accent, boxShadow: `0 0 8px -1px ${accent}` }}
            />
          </div>
        </div>
      </div>

      {failing.length > 0 && (
        <div className="mt-3">
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted">
            one-tap fixes
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {failing.map(
              (c) =>
                c.fixPrompt && (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onFix(c.fixPrompt!)}
                    className="rounded-md px-2 py-1 font-mono text-[10px] tracking-wide transition-colors"
                    style={{
                      background: "color-mix(in oklab, var(--color-accent) 18%, transparent)",
                      color: "var(--color-accent)",
                    }}
                  >
                    fix · {c.label}
                  </button>
                ),
            )}
          </div>
        </div>
      )}

      {groups.map((g) => {
        const items = report.checks.filter((c) => c.category === g.key);
        if (!items.length) return null;
        return (
          <div key={g.key} className="mt-3">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted">
              {g.label}
            </div>
            <ul className="mt-1 divide-y divide-white/5 rounded-lg border border-border bg-surface">
              {items.map((c) => (
                <li key={c.id} className="flex items-center gap-2 px-2.5 py-1.5">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{
                      background: c.pass ? GOOD : BAD,
                      boxShadow: c.pass ? `0 0 6px ${GOOD}` : "none",
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg/85">
                    {c.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
