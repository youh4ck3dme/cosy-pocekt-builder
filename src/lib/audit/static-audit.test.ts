import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { auditGeneratedHtml } from "./static-audit.ts";

describe("auditGeneratedHtml", () => {
  it("fails closed for an empty project", () => {
    const report = auditGeneratedHtml("");
    assert.equal(report.status, "fail");
    assert.equal(report.score, 0);
  });

  it("detects external resources and missing image alt text", () => {
    const report = auditGeneratedHtml(
      '<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width"><title>Demo</title></head><body><img src="https://example.com/a.jpg"><script></script></body></html>',
    );
    assert.equal(report.status, "fail");
    assert.ok(report.findings.some((item) => item.id === "external-url" && item.severity === "fail"));
    assert.ok(report.findings.some((item) => item.id === "image-alt" && item.severity === "fail"));
  });
});
