import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  analyzeCompetitorHtml,
  generateOptimizedPrompt,
} from "./competitor-cloner.ts";

describe("AI Competitor Cloner & Optimizer Engine", () => {
  const sampleCompetitorHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Konkurenčná Firma - Stavebné Práce</title>
        <meta name="description" content="Kvalitné stavebné práce a rekonštrukcie bytov.">
      </head>
      <body>
        <h1>Stavajte s nami výhodne</h1>
        <h2>Naše služby</h2>
        <h3>Rekonštrukcie</h3>
        <p>Staviamy rodinné domy.</p>
      </body>
    </html>
  `;

  describe("analyzeCompetitorHtml", () => {
    test("1. extracts page title, meta description, and headings", () => {
      const result = analyzeCompetitorHtml("https://konkurencia.sk", sampleCompetitorHtml);
      assert.equal(result.structure.title, "Konkurenčná Firma - Stavebné Práce");
      assert.equal(result.structure.metaDescription, "Kvalitné stavebné práce a rekonštrukcie bytov.");
      assert.equal(result.structure.headings.length, 3);
      assert.equal(result.structure.headings[0], "Stavajte s nami výhodne");
    });

    test("2. identifies UX flaws (missing CTA, missing form, missing viewport)", () => {
      const result = analyzeCompetitorHtml("https://konkurencia.sk", sampleCompetitorHtml);
      assert.ok(result.uxFlaws.length >= 2);
      assert.ok(result.uxFlaws.some((f) => f.category === "cta"));
      assert.ok(result.uxFlaws.some((f) => f.category === "trust"));
    });

    test("3. detects CTA buttons and forms when present", () => {
      const richHtml = `
        <html>
          <head><title>Rich Web</title><meta name="viewport" content="width=device-width"></head>
          <body>
            <h1>Nadpis</h1>
            <a class="btn-cta" href="/kontakt">Objednať teraz</a>
            <form action="/submit"><input type="email"></form>
            <div class="testimonial">Skvelá skúsenosť</div>
          </body>
        </html>
      `;
      const result = analyzeCompetitorHtml("https://rich.sk", richHtml);
      assert.equal(result.structure.hasForm, true);
      assert.equal(result.structure.hasTestimonials, true);
      assert.equal(result.structure.ctaButtons.length, 1);
      assert.equal(result.structure.ctaButtons[0], "Objednať teraz");
    });
  });

  describe("generateOptimizedPrompt", () => {
    test("4. constructs optimized prompt containing company info and UX recommendations", () => {
      const analysis = analyzeCompetitorHtml("https://konkurencia.sk", sampleCompetitorHtml);
      const prompt = generateOptimizedPrompt(analysis, {
        name: "Stavby Novák s.r.o.",
        industry: "Stavebníctvo",
        targetAudience: "Majitelia rodinných domov",
      });

      assert.ok(prompt.includes("Stavby Novák s.r.o."));
      assert.ok(prompt.includes("Stavebníctvo"));
      assert.ok(prompt.includes("Majitelia rodinných domov"));
      assert.ok(prompt.includes("KONKURENCIE"));
      assert.ok(prompt.includes("UX CHYBY"));
    });
  });
});
