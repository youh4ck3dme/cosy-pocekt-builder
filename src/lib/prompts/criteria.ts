export type CriterionId =
  | "specification"
  | "technical"
  | "uxui"
  | "performance"
  | "testing"
  | "deployment"
  | "creativity";

export interface Criterion {
  id: CriterionId;
  name: string;
  short: string;
  description: string;
  weight: number;
  keywords: string[];
  checklist: string[];
  tip: string;
}

export const CRITERIA: readonly Criterion[] = [
  {
    id: "specification",
    name: "Špecifikácia",
    short: "Spec",
    description: "Jasnosť cieľa, cieľová skupina, rozsah funkcií, dátový model a akceptačné kritériá.",
    weight: 1.2,
    keywords: [
      "cieľ", "ciel", "používateľ", "pouzivatel", "sekcie", "funkcie",
      "požiadavky", "poziadavky", "rozsah", "výstup", "vystup",
      "goal", "scope", "requirements", "user", "entity", "model",
    ],
    checklist: [
      "Prompt definuje jednu jasnú hlavnú úlohu",
      "Je uvedená cieľová skupina a hlavný use-case",
      "Sú vymenované konkrétne sekcie alebo obrazovky",
      "Je popísaný dátový model alebo entity",
      "Existujú akceptačné kritériá („hotovo, keď…“)",
    ],
    tip: "Doplň merateľné akceptačné kritériá a vymenuj obrazovky menom.",
  },
  {
    id: "technical",
    name: "Technická presnosť",
    short: "Tech",
    description: "Konkrétny stack, architektúra, API, stavový manažment a bezpečnosť.",
    weight: 1.15,
    keywords: [
      "react", "typescript", "vite", "tailwind", "tanstack", "zustand", "radix",
      "supabase", "postgres", "api", "jwt", "auth", "service worker", "manifest",
      "schema", "rest", "endpoint", "fetch",
    ],
    checklist: [
      "Je určený framework a jazyk (napr. React + TypeScript)",
      "Je určený build tool a styling (Vite, Tailwind CSS)",
      "Je popísaný stavový manažment a autentifikácia",
      "Sú uvedené integrácie, formáty dát a API endpointy",
      "Sú spomenuté bezpečnostné pravidlá a validácia vstupov",
    ],
    tip: "Uveď verzie knižníc a explicitne popíš dátové kontrakty API.",
  },
  {
    id: "uxui",
    name: "UX / UI",
    short: "UX",
    description: "Vizuálny jazyk, dizajn systém, mikro-interakcie, responzivita a prístupnosť.",
    weight: 1.1,
    keywords: [
      "dizajn", "design", "farb", "paleta", "responz", "mobil", "layout",
      "typograf", "prístupnost", "pristupnost", "wcag", "kontrast", "dark",
      "komponent", "animác", "animac", "hover", "skeleton", "empty state",
    ],
    checklist: [
      "Je definovaná farebná paleta alebo semantické tokeny",
      "Je určená typografia a hierarchia písma",
      "Je uvedená plná mobilná responzivita (360–1920 px)",
      "Sú spomenuté stavy komponentov (hover, loading, empty, error)",
      "Je riešená prístupnosť (kontrast, klávesnica, ARIA)",
    ],
    tip: "Pridaj konkrétne farebné tokeny, typografiu a požiadavku WCAG AA.",
  },
  {
    id: "performance",
    name: "Výkon",
    short: "Perf",
    description: "Rýchlosť načítania, cachovanie, lazy loading a Lighthouse metriky.",
    weight: 1.0,
    keywords: [
      "výkon", "vykon", "performance", "lighthouse", "cache", "cachov",
      "lazy", "offline", "bundle", "lcp", "cls", "optimaliz", "web vitals",
      "webp", "pwa",
    ],
    checklist: [
      "Sú uvedené cieľové metriky (Lighthouse ≥ 90, Web Vitals)",
      "Je popísaná stratégia cachovania a ukladania dát",
      "Je spomenutý lazy loading a code splitting",
      "Je riešená optimalizácia obrázkov a assetov",
      "Je definovaný offline režim a PWA správanie",
    ],
    tip: "Nastav číselné ciele, napr. LCP < 2.5 s a Lighthouse ≥ 90.",
  },
  {
    id: "testing",
    name: "Testovanie",
    short: "Test",
    description: "Unit, integračné a E2E testy, pokrytie a validácia scenárov.",
    weight: 1.0,
    keywords: [
      "test", "vitest", "playwright", "pokrytie", "coverage", "e2e",
      "qa", "lint", "typecheck", "assert", "mock", "validác", "validac",
    ],
    checklist: [
      "Je uvedený testovací prístup alebo framework",
      "Sú definované kľúčové E2E scenáre a používateľské toky",
      "Je určené cieľové pokrytie alebo kritériá správnosti",
      "Je spomenutý linting a typecheck",
      "Sú popísané hraničné a chybové scenáre (edge cases)",
    ],
    tip: "Vymenuj kritické user flows, ktoré musia byť otestované.",
  },
  {
    id: "deployment",
    name: "Nasadenie",
    short: "Deploy",
    description: "CI/CD, prostredia, správa konfigurácie a hosting.",
    weight: 0.95,
    keywords: [
      "nasaden", "deploy", "ci", "cd", "vercel", "docker", "vps",
      "github actions", "monitoring", "env", "release", "hosting", "build",
    ],
    checklist: [
      "Je určený hosting alebo produkčná platforma",
      "Je popísaná CI/CD pipeline",
      "Sú definované prostredia (dev / staging / prod)",
      "Je riešená bezpečná správa env premenných a tajomstiev",
      "Je spomenutý monitoring a diagnostika",
    ],
    tip: "Doplň kroky pipeline: lint → typecheck → test → build → deploy.",
  },
  {
    id: "creativity",
    name: "Kreativita",
    short: "Idea",
    description: "Originalita, diferenciácia, wow efekt a pridaná hodnota riešenia.",
    weight: 0.85,
    keywords: [
      "originál", "original", "unikát", "unikat", "inovat", "kreativ",
      "mikro", "micro", "gamifik", "inšpir", "inspir", "štýl", "styl",
      "tón", "ton", "branding", "cosy", "wow",
    ],
    checklist: [
      "Prompt uvádza konkrétne referencie alebo vizuálnu inšpiráciu",
      "Je popísaný unikátny prvok produktu odlišujúci ho od konkurencie",
      "Sú spomenuté mikro-interakcie alebo jemné animácie",
      "Je definovaný tón komunikácie a copywritingu",
      "Je jasná bezprostredná pridaná hodnota pre používateľa",
    ],
    tip: "Popíš jeden nezameniteľný „wow“ prvok a referenčný vizuálny štýl.",
  },
] as const;

export interface CriterionScore {
  id: CriterionId;
  score: number;
  matched: string[];
  missing: string[];
}

export interface AnalysisResult {
  total: number;
  grade: "A" | "B" | "C" | "D" | "F";
  words: number;
  chars: number;
  scores: CriterionScore[];
  suggestions: string[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

/**
 * Analyzes a prompt across 7 software engineering & PWA criteria.
 * Fast, pure TypeScript scoring algorithm running 100% locally.
 */
export function analyzePrompt(prompt: string): AnalysisResult {
  const trimmed = prompt.trim();
  const text = norm(trimmed);
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const lengthBonus = Math.min(20, Math.round(words / 12));
  const structureBonus =
    (/\n\s*[-*•\d]/.test(prompt) ? 8 : 0) + (/:/.test(prompt) ? 4 : 0);

  const scores: CriterionScore[] = CRITERIA.map((c) => {
    const matched = c.keywords.filter((k) => text.includes(norm(k)));
    const coverage = Math.min(1, matched.length / 4);
    const raw = coverage * 68 + lengthBonus + structureBonus;
    const score = words === 0 ? 0 : Math.max(0, Math.min(100, Math.round(raw)));
    const missing =
      score >= 80 ? [] : c.checklist.slice(matched.length >= 3 ? 3 : matched.length);
    return { id: c.id, score, matched, missing };
  });

  const weightSum = CRITERIA.reduce((a, c) => a + c.weight, 0);
  const total =
    words === 0
      ? 0
      : Math.round(
          scores.reduce((a, s) => {
            const w = CRITERIA.find((c) => c.id === s.id)!.weight;
            return a + s.score * w;
          }, 0) / weightSum,
        );

  const grade: "A" | "B" | "C" | "D" | "F" =
    total >= 90 ? "A" : total >= 75 ? "B" : total >= 60 ? "C" : total >= 40 ? "D" : "F";

  const suggestions = scores
    .slice()
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map((s) => {
      const c = CRITERIA.find((x) => x.id === s.id)!;
      return `${c.name}: ${c.tip}`;
    });

  return { total, grade, words, chars: prompt.length, scores, suggestions };
}

/**
 * Automatically improves a prompt by appending structured sections
 * targeting any weak criteria (<80 score) and providing clear acceptance criteria.
 */
export function improvePrompt(prompt: string, result: AnalysisResult): string {
  if (!prompt.trim()) return "";
  const weak = result.scores.filter((s) => s.score < 80);
  const sections = weak.map((s) => {
    const c = CRITERIA.find((x) => x.id === s.id)!;
    return `### ${c.name}\n${c.checklist.map((item) => `- ${item}`).join("\n")}`;
  });

  return [
    prompt.trim(),
    "",
    "---",
    "## Doplnené architektonické požiadavky (auto-návrh)",
    ...sections,
    "",
    "## Akceptačné kritériá",
    "- Aplikácia je plne responzívna (mobilné zobrazenie aj desktop) s WCAG AA kontrastom",
    "- Všetky interaktívne stavy (loading, empty, error, hover) sú ošetrené",
    "- Dáta a stav sú perzistentne uchovávané a ošetrené proti výpadkom siete",
    "- Žiadne syntaktické ani runtime chyby v konzole prehliadača",
  ].join("\n");
}

export function scoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 55) return "text-amber-500";
  return "text-rose-500";
}

export function scoreBadgeClass(score: number): string {
  if (score >= 80) return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
  if (score >= 55) return "border-amber-500/30 bg-amber-500/10 text-amber-400";
  return "border-rose-500/30 bg-rose-500/10 text-rose-400";
}
