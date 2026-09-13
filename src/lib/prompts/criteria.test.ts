import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  analyzePrompt,
  improvePrompt,
  scoreColor,
  scoreBadgeClass,
  CRITERIA,
} from "./criteria.ts";

describe("Prompts Criteria & Scoring Engine (src/lib/prompts/criteria.ts)", () => {
  it("1. returns zero score and grade F for empty or whitespace-only prompt", () => {
    const emptyResult = analyzePrompt("");
    assert.equal(emptyResult.total, 0);
    assert.equal(emptyResult.grade, "F");
    assert.equal(emptyResult.words, 0);
    assert.equal(emptyResult.chars, 0);
    assert.equal(emptyResult.scores.length, CRITERIA.length);
    for (const score of emptyResult.scores) {
      assert.equal(score.score, 0);
      assert.equal(score.matched.length, 0);
    }

    const wsResult = analyzePrompt("   \n\t  ");
    assert.equal(wsResult.total, 0);
    assert.equal(wsResult.words, 0);
  });

  it("2. accurately calculates score and matches keywords for structured prompts", () => {
    const richPrompt = `
      Cieľ: Vytvor modernú PWA aplikáciu pre správu rezervácií salónu.
      Používateľ a rozsah: Klient si vyberie službu a termín, administrátor vidí kalendár.
      Technológie: React, TypeScript, Vite, Tailwind CSS a Zustand s lokálnou IndexedDB cache.
      UX/UI: Tmavá paleta s akcentovou farbou, responzívne zobrazenie pre mobil a desktop, WCAG kontrast.
      Výkon: Rýchle načítanie, Lighthouse skóre nad 90, offline podpora bez zbytočných assetov.
      Testovanie: Unit testy, Playwright E2E scenáre, typecheck a validácia formulárov.
      Nasadenie: Docker kontajner, CI/CD pipeline, Vercel hosting a bezpečné env premenné.
      Kreativita: Originálny dizajn s jemnými animáciami a wow efektom pre zákazníkov.
      Akceptačné kritériá: Všetky zmeny sa ukladajú okamžite a bez chýb.
    `;

    const result = analyzePrompt(richPrompt);
    assert.ok(result.total >= 75, `Expected score >= 75, got ${result.total}`);
    assert.ok(result.words > 30, `Expected words > 30, got ${result.words}`);
    assert.ok(["A", "B"].includes(result.grade));

    // Verify all 7 criteria are present
    assert.equal(result.scores.length, 7);
    for (const s of result.scores) {
      assert.ok(s.matched.length > 0, `Criterion ${s.id} should have matched keywords`);
      assert.ok(s.score > 0, `Criterion ${s.id} score should be > 0`);
    }

    // Verify suggestions list
    assert.ok(Array.isArray(result.suggestions));
    assert.ok(result.suggestions.length <= 4);
  });

  it("3. improves weak prompts by appending missing requirements and acceptance criteria", () => {
    const rawPrompt = "Urob jednoduchú aplikáciu pre poznámky.";
    const analysis = analyzePrompt(rawPrompt);
    const improved = improvePrompt(rawPrompt, analysis);

    assert.ok(improved.startsWith(rawPrompt));
    assert.ok(improved.includes("## Doplnené architektonické požiadavky"));
    assert.ok(improved.includes("## Akceptačné kritériá"));
    assert.ok(improved.includes("WCAG AA"));

    // Improved prompt should score substantially higher
    const improvedAnalysis = analyzePrompt(improved);
    assert.ok(
      improvedAnalysis.total > analysis.total,
      `Improved score (${improvedAnalysis.total}) should exceed original (${analysis.total})`,
    );
  });

  it("4. returns empty string when improving empty prompt", () => {
    const emptyAnalysis = analyzePrompt("");
    assert.equal(improvePrompt("", emptyAnalysis), "");
    assert.equal(improvePrompt("   ", emptyAnalysis), "");
  });

  it("5. correctly categorizes score colors and badges", () => {
    assert.equal(scoreColor(95), "text-emerald-500");
    assert.equal(scoreColor(80), "text-emerald-500");
    assert.equal(scoreColor(79), "text-amber-500");
    assert.equal(scoreColor(55), "text-amber-500");
    assert.equal(scoreColor(54), "text-rose-500");
    assert.equal(scoreColor(0), "text-rose-500");

    assert.ok(scoreBadgeClass(85).includes("emerald"));
    assert.ok(scoreBadgeClass(65).includes("amber"));
    assert.ok(scoreBadgeClass(30).includes("rose"));
  });
});
