import assert from "node:assert/strict";
import test from "node:test";
import { redactWordPressError, validateWordPressUrl } from "./wordpress-validation.server.ts";

test("WordPress URL validation requires HTTPS and rejects local targets", async () => {
  await assert.rejects(() => validateWordPressUrl("http://example.com"), /HTTPS/);
  await assert.rejects(() => validateWordPressUrl("https://localhost"), /povolená/);
  await assert.rejects(() => validateWordPressUrl("https://127.0.0.1"), /nepovolenej/);
  await assert.rejects(() => validateWordPressUrl("https://192.168.1.10"), /nepovolenej/);
});

test("WordPress errors redact credentials and remote URLs", () => {
  const result = redactWordPressError(
    new Error("Basic dXNlcjpzZWNyZXQ= failed at https://example.com/wp-json"),
  );
  assert.equal(result, "Basic [redacted] failed at WordPress");
  assert.doesNotMatch(result, /secret|example\.com/);
});
