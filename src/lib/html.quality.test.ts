import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import { auditHtml } from "./html.quality.ts";

// auditHtml relies on the browser DOMParser. These tests drive a configurable
// fake document so the real scoring/report logic is exercised without a full
// HTML parser — the parsing itself is the browser's responsibility, not ours.

type DocConfig = {
  title?: string;
  desc?: string | null;
  og?: boolean;
  viewport?: boolean;
  h1Count?: number;
  imgs?: Array<{ alt: boolean }>;
  buttons?: Array<{ text?: string; ariaLabel?: string | null }>;
  extScripts?: number;
  extCss?: number;
  lang?: string | null;
};

let currentConfig: DocConfig = {};

function fill(n: number): object[] {
  return Array.from({ length: n }, () => ({}));
}

function makeDoc(cfg: DocConfig) {
  return {
    querySelector(sel: string) {
      if (sel === "title") return { textContent: cfg.title ?? "" };
      if (sel === 'meta[name="description"]')
        return cfg.desc != null ? { getAttribute: () => cfg.desc } : null;
      if (sel === 'meta[property^="og:"]') return cfg.og ? {} : null;
      if (sel === 'meta[name="viewport"]') return cfg.viewport ? {} : null;
      return null;
    },
    querySelectorAll(sel: string) {
      if (sel === "h1") return fill(cfg.h1Count ?? 0);
      if (sel === "img")
        return (cfg.imgs ?? []).map((i) => ({
          hasAttribute: (a: string) => (a === "alt" ? i.alt : false),
        }));
      if (sel === "button")
        return (cfg.buttons ?? []).map((b) => ({
          textContent: b.text ?? "",
          getAttribute: (a: string) => (a === "aria-label" ? (b.ariaLabel ?? null) : null),
        }));
      if (sel === "script[src]") return fill(cfg.extScripts ?? 0);
      if (sel === 'link[rel="stylesheet"]') return fill(cfg.extCss ?? 0);
      return [];
    },
    documentElement: {
      getAttribute: (a: string) => (a === "lang" ? (cfg.lang ?? null) : null),
    },
  };
}

class MockDOMParser {
  parseFromString() {
    return makeDoc(currentConfig);
  }
}

const PERFECT: DocConfig = {
  title: "A good descriptive title",
  desc: "x".repeat(60),
  og: true,
  viewport: true,
  h1Count: 1,
  imgs: [{ alt: true }],
  buttons: [{ text: "Click me" }],
  extScripts: 0,
  extCss: 0,
  lang: "en",
};

describe("html.quality auditHtml (src/lib/html.quality.ts)", () => {
  const g = globalThis as unknown as { window?: unknown; DOMParser?: unknown };
  const originalWindow = g.window;
  const originalDOMParser = g.DOMParser;

  beforeEach(() => {
    g.window = g.window ?? {};
    g.DOMParser = MockDOMParser;
    currentConfig = {};
  });

  afterEach(() => {
    if (originalWindow === undefined) delete g.window;
    else g.window = originalWindow;
    if (originalDOMParser === undefined) delete g.DOMParser;
    else g.DOMParser = originalDOMParser;
    currentConfig = {};
  });

  it("1. is SSR-safe: returns an empty report when window is absent", () => {
    delete g.window;
    const report = auditHtml("<!doctype html><html><body></body></html>");
    assert.equal(report.score, 0);
    assert.deepEqual(report.checks, []);
  });

  it("2. returns an empty report for empty html", () => {
    const report = auditHtml("");
    assert.equal(report.score, 0);
    assert.deepEqual(report.checks, []);
  });

  it("3. a fully compliant document scores 100 with all checks passing", () => {
    currentConfig = { ...PERFECT };
    const report = auditHtml("<!doctype html><html lang=en><body></body></html>");
    assert.equal(report.score, 100);
    assert.equal(report.checks.length, 11);
    assert.ok(report.checks.every((c) => c.pass));
  });

  it("4. a fully non-compliant document scores 0 with every check failing", () => {
    currentConfig = {
      title: "",
      desc: null,
      og: false,
      viewport: false,
      h1Count: 0,
      imgs: [{ alt: false }],
      buttons: [{ text: "", ariaLabel: null }],
      extScripts: 1,
      extCss: 1,
      lang: null,
    };
    // A >250 KB document also fails the page-weight check.
    const report = auditHtml("x".repeat(260 * 1024));
    assert.equal(report.score, 0);
    assert.equal(report.checks.length, 11);
    assert.ok(report.checks.every((c) => !c.pass));
  });

  it("5. score is proportional to the number of passing checks", () => {
    currentConfig = { ...PERFECT, og: false, viewport: false }; // 9 of 11 pass
    const report = auditHtml("<!doctype html><html lang=en><body></body></html>");
    const passed = report.checks.filter((c) => c.pass).length;
    assert.equal(passed, 9);
    assert.equal(report.score, Math.round((9 / 11) * 100));
  });

  it("6. flags the title check when the title is too short or too long", () => {
    currentConfig = { ...PERFECT, title: "short" };
    const shortReport = auditHtml("<!doctype html><html><body></body></html>");
    assert.equal(shortReport.checks.find((c) => c.id === "seo-title")?.pass, false);

    currentConfig = { ...PERFECT, title: "t".repeat(80) };
    const longReport = auditHtml("<!doctype html><html><body></body></html>");
    assert.equal(longReport.checks.find((c) => c.id === "seo-title")?.pass, false);
  });

  it("7. flags missing alt text and counts images in the label", () => {
    currentConfig = { ...PERFECT, imgs: [{ alt: true }, { alt: false }, { alt: true }] };
    const report = auditHtml("<!doctype html><html lang=en><body></body></html>");
    const altCheck = report.checks.find((c) => c.id === "a11y-alt");
    assert.equal(altCheck?.pass, false);
    assert.match(altCheck?.label ?? "", /2\/3/);
  });

  it("8. flags the page-weight check for large documents", () => {
    currentConfig = { ...PERFECT };
    const report = auditHtml("x".repeat(260 * 1024));
    assert.equal(report.checks.find((c) => c.id === "perf-size")?.pass, false);
  });

  it("9. every check carries a category and a fix prompt", () => {
    currentConfig = { ...PERFECT, h1Count: 0 };
    const report = auditHtml("<!doctype html><html lang=en><body></body></html>");
    for (const check of report.checks) {
      assert.ok(["a11y", "seo", "perf"].includes(check.category));
      assert.equal(typeof check.fixPrompt, "string");
      assert.ok((check.fixPrompt ?? "").length > 0);
    }
  });
});
