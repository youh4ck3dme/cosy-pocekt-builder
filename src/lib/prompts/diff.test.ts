import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { diffLines } from "./diff.ts";

describe("Prompt LCS Line Diff (src/lib/prompts/diff.ts)", () => {
  it("1. returns 'same' for identical multiline texts", () => {
    const text = "Riadok 1\nRiadok 2\nRiadok 3";
    const result = diffLines(text, text);

    assert.equal(result.length, 3);
    assert.ok(result.every((line) => line.type === "same"));
    assert.equal(result[0]?.text, "Riadok 1");
    assert.equal(result[1]?.text, "Riadok 2");
    assert.equal(result[2]?.text, "Riadok 3");
  });

  it("2. detects added lines at start, middle, and end", () => {
    const original = "Riadok 1\nRiadok 2";
    const updated = "Úvod\nRiadok 1\nVložený\nRiadok 2\nZáver";
    const result = diffLines(original, updated);

    const adds = result.filter((l) => l.type === "add");
    const sames = result.filter((l) => l.type === "same");

    assert.equal(sames.length, 2);
    assert.equal(adds.length, 3);
    assert.ok(adds.some((l) => l.text === "Úvod"));
    assert.ok(adds.some((l) => l.text === "Vložený"));
    assert.ok(adds.some((l) => l.text === "Záver"));
  });

  it("3. detects removed lines correctly", () => {
    const original = "Zachovať 1\nZmazať\nZachovať 2";
    const updated = "Zachovať 1\nZachovať 2";
    const result = diffLines(original, updated);

    const removes = result.filter((l) => l.type === "remove");
    const sames = result.filter((l) => l.type === "same");

    assert.equal(sames.length, 2);
    assert.equal(removes.length, 1);
    assert.equal(removes[0]?.text, "Zmazať");
  });

  it("4. handles empty inputs gracefully", () => {
    const resBothEmpty = diffLines("", "");
    assert.equal(resBothEmpty.length, 1);
    assert.equal(resBothEmpty[0]?.type, "same");
    assert.equal(resBothEmpty[0]?.text, "");

    const resAddFromEmpty = diffLines("", "Nový riadok");
    assert.ok(resAddFromEmpty.some((l) => l.type === "add" && l.text === "Nový riadok"));
  });
});
