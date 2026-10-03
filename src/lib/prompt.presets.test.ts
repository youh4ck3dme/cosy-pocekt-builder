import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PROMPT_PRESETS, findPreset, filterPresets } from "./prompt.presets.ts";

describe("prompt.presets (src/lib/prompt.presets.ts)", () => {
  it("1. every preset is structurally valid with unique ids and labels", () => {
    assert.ok(PROMPT_PRESETS.length > 0);
    const ids = new Set<string>();
    const labels = new Set<string>();
    for (const preset of PROMPT_PRESETS) {
      assert.equal(typeof preset.id, "string");
      assert.ok(preset.id.length > 0, "id must be non-empty");
      assert.ok(preset.label.startsWith("/"), `label ${preset.label} must start with '/'`);
      assert.ok(preset.hint.trim().length > 0, "hint must be non-empty");
      assert.ok(preset.template.trim().length > 0, "template must be non-empty");
      assert.ok(!ids.has(preset.id), `duplicate id ${preset.id}`);
      assert.ok(!labels.has(preset.label), `duplicate label ${preset.label}`);
      ids.add(preset.id);
      labels.add(preset.label);
    }
  });

  it("2. the WordPress / blank-canvas presets are present", () => {
    for (const id of ["pwa-app", "wp-card", "lead-gen"]) {
      assert.ok(
        PROMPT_PRESETS.some((p) => p.id === id),
        `expected preset "${id}" to exist`,
      );
    }
  });

  it("3. findPreset matches by full label and by bare name, case-insensitively", () => {
    assert.equal(findPreset("/landing")?.id, "landing");
    assert.equal(findPreset("landing")?.id, "landing");
    assert.equal(findPreset("/LANDING")?.id, "landing");
    assert.equal(findPreset("  /pricing  ")?.id, "pricing");
  });

  it("4. findPreset returns null for unknown slashes", () => {
    assert.equal(findPreset("/does-not-exist"), null);
    assert.equal(findPreset(""), null);
  });

  it("5. filterPresets returns all presets for an empty query", () => {
    assert.equal(filterPresets("").length, PROMPT_PRESETS.length);
    assert.equal(filterPresets("/").length, PROMPT_PRESETS.length);
  });

  it("6. filterPresets narrows by label and by hint", () => {
    const byLabel = filterPresets("/pric");
    assert.ok(byLabel.some((p) => p.id === "pricing"));
    assert.ok(!byLabel.some((p) => p.id === "landing"));

    const byHint = filterPresets("dashboard");
    assert.ok(byHint.some((p) => p.id === "dashboard"));
  });

  it("7. filterPresets returns an empty list when nothing matches", () => {
    assert.deepEqual(filterPresets("zzzznomatch"), []);
  });
});
