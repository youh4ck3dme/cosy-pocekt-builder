export type QualityCheck = {
  id: string;
  label: string;
  category: "a11y" | "seo" | "perf";
  pass: boolean;
  fixPrompt?: string;
};

export type QualityReport = {
  score: number;
  checks: QualityCheck[];
};

export function auditHtml(html: string): QualityReport {
  if (typeof window === "undefined" || !html) {
    return { score: 0, checks: [] };
  }
  const doc = new DOMParser().parseFromString(html, "text/html");

  const checks: QualityCheck[] = [];

  // SEO
  const title = doc.querySelector("title")?.textContent?.trim() || "";
  checks.push({
    id: "seo-title",
    label: "Title tag present",
    category: "seo",
    pass: title.length >= 10 && title.length <= 70,
    fixPrompt: "Add a descriptive <title> tag between 10 and 70 characters.",
  });
  const desc = doc.querySelector('meta[name="description"]')?.getAttribute("content") || "";
  checks.push({
    id: "seo-desc",
    label: "Meta description",
    category: "seo",
    pass: desc.length >= 50 && desc.length <= 170,
    fixPrompt: "Add a <meta name=\"description\"> tag between 50 and 170 characters.",
  });
  const og = doc.querySelector('meta[property^="og:"]');
  checks.push({
    id: "seo-og",
    label: "OpenGraph tags",
    category: "seo",
    pass: !!og,
    fixPrompt: "Add OpenGraph meta tags (og:title, og:description, og:type).",
  });
  const viewport = doc.querySelector('meta[name="viewport"]');
  checks.push({
    id: "seo-viewport",
    label: "Responsive viewport",
    category: "seo",
    pass: !!viewport,
    fixPrompt: "Add a responsive viewport meta tag.",
  });

  // A11y
  const h1s = doc.querySelectorAll("h1");
  checks.push({
    id: "a11y-h1",
    label: "Exactly one <h1>",
    category: "a11y",
    pass: h1s.length === 1,
    fixPrompt: "Ensure the page has exactly one <h1> heading.",
  });
  const imgs = Array.from(doc.querySelectorAll("img"));
  const missingAlt = imgs.filter((i) => !i.hasAttribute("alt"));
  checks.push({
    id: "a11y-alt",
    label: imgs.length ? `Image alt text (${imgs.length - missingAlt.length}/${imgs.length})` : "Image alt text",
    category: "a11y",
    pass: missingAlt.length === 0,
    fixPrompt: "Add descriptive alt attributes to all <img> tags.",
  });
  const buttons = Array.from(doc.querySelectorAll("button"));
  const namelessBtns = buttons.filter(
    (b) => !b.textContent?.trim() && !b.getAttribute("aria-label"),
  );
  checks.push({
    id: "a11y-btn",
    label: "Buttons have labels",
    category: "a11y",
    pass: namelessBtns.length === 0,
    fixPrompt: "Give every <button> visible text or an aria-label.",
  });
  const html2 = doc.documentElement;
  checks.push({
    id: "a11y-lang",
    label: "html[lang] set",
    category: "a11y",
    pass: !!html2.getAttribute("lang"),
    fixPrompt: "Add a lang attribute on the <html> element.",
  });

  // Perf
  const externalScripts = Array.from(doc.querySelectorAll("script[src]"));
  checks.push({
    id: "perf-ext-scripts",
    label: "No blocking external scripts",
    category: "perf",
    pass: externalScripts.length === 0,
    fixPrompt: "Remove or defer external <script src> tags; inline what's needed.",
  });
  const externalCss = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
  checks.push({
    id: "perf-ext-css",
    label: "No external stylesheets",
    category: "perf",
    pass: externalCss.length === 0,
    fixPrompt: "Inline CSS instead of using external stylesheets.",
  });
  const sizeKb = new Blob([html]).size / 1024;
  checks.push({
    id: "perf-size",
    label: `Page weight under 250 KB (${sizeKb.toFixed(0)} KB)`,
    category: "perf",
    pass: sizeKb < 250,
    fixPrompt: "Reduce HTML+CSS size to under 250 KB. Remove unused styles.",
  });

  const passed = checks.filter((c) => c.pass).length;
  const score = Math.round((passed / checks.length) * 100);
  return { score, checks };
}