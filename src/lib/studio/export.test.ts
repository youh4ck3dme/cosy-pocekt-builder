import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { prepareHtmlExport, validateExportHtml } from "./export.ts";

const validHtml = `<!DOCTYPE html><html><head><title>Demo</title></head><body><main><section id="demo">Demo</section></main></body></html>`;

describe("HTML export validation", () => {
  it("rejects truncated tags", () => {
    const result = validateExportHtml(`${validHtml}<section class="`);
    assert.equal(result.ok, false);
    assert.ok(result.ok === false && result.issues.some((item) => item.code === "truncated"));
  });

  it("removes preview runtime before export", () => {
    const result = prepareHtmlExport(
      `${validHtml.replace("</body>", '<script data-cozy-elements>customElements CozyApp</script></body>')}`,
    );
    assert.equal(result.ok, true);
    assert.ok(result.ok && !/data-cozy-elements|customElements|CozyApp/i.test(result.html));
  });

  it("rejects blob URLs and unresolved anchors", () => {
    const result = validateExportHtml(
      validHtml.replace('href="#"', 'href="#demo"').replace("</main>", '<a href="#missing">Link</a></main>') +
        '<img src="blob:https://example.test/id">',
    );
    assert.equal(result.ok, false);
    assert.ok(result.ok === false && result.issues.some((item) => item.code === "forbidden-url"));
    assert.ok(result.ok === false && result.issues.some((item) => item.code === "anchor"));
  });

  it("rejects invalid manifest icon purposes", () => {
    const result = validateExportHtml(validHtml, JSON.stringify({
      icons: [{ src: "/icon.png", sizes: "192x192", type: "image/png", purpose: "invalid" }],
    }));
    assert.equal(result.ok, false);
    assert.ok(result.ok === false && result.issues.some((item) => item.code === "manifest"));
  });
});
