import { CRITERIA, scoreBadgeClass, type AnalysisResult } from "@/lib/prompts/criteria";

export function ScoreRing({ value, grade }: { value: number; grade?: string }) {
  const angle = Math.round((Math.max(0, Math.min(100, value)) / 100) * 360);
  const color =
    value >= 80 ? "#10b981" : value >= 55 ? "#f59e0b" : "#f43f5e";

  return (
    <div
      className="relative grid size-32 shrink-0 place-items-center rounded-full shadow-inner shadow-black/20"
      style={{
        background: `conic-gradient(${color} ${angle}deg, rgba(255, 255, 255, 0.08) ${angle}deg)`,
      }}
      role="img"
      aria-label={`Celkové skóre promptu ${value} zo 100`}
    >
      <div className="grid size-24 place-items-center rounded-full bg-surface text-center shadow-lg">
        <div>
          <div className="font-serif text-3xl font-bold tracking-tight text-fg">
            {value}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-muted">
            {grade ? `známka ${grade}` : "/ 100"}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CriteriaBars({
  result,
  onSelectCriterion,
}: {
  result: AnalysisResult;
  onSelectCriterion?: (id: string) => void;
}) {
  return (
    <ul className="space-y-3">
      {result.scores.map((s) => {
        const c = CRITERIA.find((x) => x.id === s.id)!;
        return (
          <li
            key={s.id}
            onClick={() => onSelectCriterion?.(s.id)}
            className="group cursor-pointer rounded-xl border border-transparent p-2 transition hover:border-border hover:bg-card/40"
          >
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-fg group-hover:text-accent">
                {c.name}
              </span>
              <div className="flex items-center gap-2">
                <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${scoreBadgeClass(s.score)}`}>
                  {s.score} / 100
                </span>
              </div>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/40">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  s.score >= 80 ? "bg-emerald-500" : s.score >= 55 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${Math.max(3, s.score)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
