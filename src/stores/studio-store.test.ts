import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { useStudioStore } from "./studio-store.ts";

describe("Studio Store & Generation Lifecycle (src/stores/studio-store.ts)", () => {
  const originalStorage = globalThis.localStorage;

  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k) => store.get(k) ?? null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
      length: 0,
      key: () => null,
    };
    useStudioStore.getState().reset();
  });

  afterEach(() => {
    if (originalStorage) {
      globalThis.localStorage = originalStorage;
    } else {
      // @ts-expect-error cleanup mock
      delete globalThis.localStorage;
    }
  });

  describe("1. beginGenerate behavior", () => {
    it("sets running to true, clears error, and returns an active AbortSignal", () => {
      const store = useStudioStore.getState();
      assert.equal(store.running, false);
      assert.equal(store.abortController, null);

      const signal = store.beginGenerate();

      const updated = useStudioStore.getState();
      assert.equal(updated.running, true);
      assert.equal(updated.error, null);
      assert.ok(updated.abortController instanceof AbortController);
      assert.ok(signal instanceof AbortSignal);
      assert.equal(signal.aborted, false);
    });

    it("automatically aborts previous controller when beginGenerate is called consecutively", () => {
      const store = useStudioStore.getState();
      const signal1 = store.beginGenerate();
      assert.equal(signal1.aborted, false);

      const signal2 = store.beginGenerate();
      assert.equal(signal1.aborted, true, "First generation signal must be aborted upon second call");
      assert.equal(signal2.aborted, false, "Second generation signal must be active");
    });
  });

  describe("2. stopGenerate abort and state preservation", () => {
    it("aborts active controller and preserves existing HTML, code, and title", () => {
      const store = useStudioStore.getState();
      // Setup existing generated app state
      store.applyResult({
        title: "E-Commerce Store",
        code: "<h1>Store</h1>",
        html: "<h1>Store</h1>",
        assistantText: "Initial store generated.",
        provider: "mistral",
      });

      // Start new generation revision
      const signal = store.beginGenerate();
      assert.equal(useStudioStore.getState().running, true);
      assert.equal(signal.aborted, false);

      // User clicks Stop
      store.stopGenerate();

      const afterStop = useStudioStore.getState();
      assert.equal(signal.aborted, true, "Signal must be aborted by stopGenerate");
      assert.equal(afterStop.running, false);
      assert.equal(afterStop.abortController, null);
      assert.equal(afterStop.error, "Cancelled");
      assert.equal(afterStop.messages.at(-1)?.text, "Stopped.");

      // CRITICAL VERIFICATION: existing HTML, code, and title must NOT be wiped
      assert.equal(afterStop.title, "E-Commerce Store");
      assert.equal(afterStop.html, "<h1>Store</h1>");
      assert.equal(afterStop.code, "<h1>Store</h1>");
      assert.equal(afterStop.provider, "mistral");
    });

    it("safely handles stopGenerate call when no generation is active", () => {
      const store = useStudioStore.getState();
      assert.equal(store.running, false);

      assert.doesNotThrow(() => {
        store.stopGenerate();
      });

      assert.equal(useStudioStore.getState().running, false);
      assert.equal(useStudioStore.getState().error, null);
    });
  });

  describe("3. applyResult state updates", () => {
    it("correctly applies new title, code, html, provider, and assistant response", () => {
      const store = useStudioStore.getState();
      store.beginGenerate();
      assert.equal(useStudioStore.getState().running, true);

      store.applyResult({
        title: "Portfolio Dashboard",
        code: "<main>Portfolio</main>",
        html: "<main>Portfolio</main>",
        assistantText: "Preview generated successfully.",
        provider: "gemini",
      });

      const updated = useStudioStore.getState();
      assert.equal(updated.title, "Portfolio Dashboard");
      assert.equal(updated.code, "<main>Portfolio</main>");
      assert.equal(updated.html, "<main>Portfolio</main>");
      assert.equal(updated.provider, "gemini");
      assert.equal(updated.running, false);
      assert.equal(updated.error, null);
      assert.equal(updated.abortController, null);

      const lastMessage = updated.messages.at(-1);
      assert.ok(lastMessage);
      assert.equal(lastMessage.role, "assistant");
      assert.equal(lastMessage.text, "Preview generated successfully.");
    });

    it("caps message history to maximum 24 items to prevent unbounded memory growth", () => {
      const store = useStudioStore.getState();
      for (let i = 0; i < 30; i++) {
        store.pushUser(`User question ${i}`);
        store.applyResult({
          title: `Title ${i}`,
          code: `<code>${i}</code>`,
          html: `<p>${i}</p>`,
          assistantText: `Answer ${i}`,
          provider: "mistral",
        });
      }

      const messages = useStudioStore.getState().messages;
      assert.ok(messages.length <= 24, `Messages count (${messages.length}) must not exceed 24`);
    });
  });

  describe("4. Race condition protection during consecutive generation runs", () => {
    it("discards responses from stale runId when subsequent run is started", async () => {
      let currentRunId = 0;
      let appliedHtml = "";

      async function simulatedGeneration(prompt: string, delayMs: number) {
        const id = ++currentRunId;
        const signal = useStudioStore.getState().beginGenerate();

        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, delayMs);
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            resolve();
          });
        });

        // Guard against race conditions: ignore if superseded or aborted
        if (id !== currentRunId || signal.aborted) {
          return;
        }

        useStudioStore.getState().applyResult({
          title: `Result for ${prompt}`,
          code: `<h1>${prompt}</h1>`,
          html: `<h1>${prompt}</h1>`,
          assistantText: `Generated ${prompt}`,
          provider: "mistral",
        });
        appliedHtml = `<h1>${prompt}</h1>`;
      }

      // Run 1 starts (slow, 60ms)
      const promise1 = simulatedGeneration("Slow prompt", 60);
      // Run 2 starts shortly after (fast, 10ms)
      const promise2 = simulatedGeneration("Fast prompt", 10);

      await Promise.all([promise1, promise2]);

      // Run 2 must win, and Run 1 must NOT overwrite Run 2
      assert.equal(appliedHtml, "<h1>Fast prompt</h1>");
      assert.equal(useStudioStore.getState().title, "Result for Fast prompt");
      assert.equal(useStudioStore.getState().html, "<h1>Fast prompt</h1>");
    });
  });

  describe("5. Empty prompt validation", () => {
    it("validates that empty or whitespace-only prompts do not trigger run", () => {
      function canTriggerRun(promptOverride?: string): boolean {
        const brief = useStudioStore.getState().brief;
        const prompt = (promptOverride ?? brief).trim();
        const running = useStudioStore.getState().running;
        if (!prompt || running) return false;
        return true;
      }

      assert.equal(canTriggerRun(""), false);
      assert.equal(canTriggerRun("   "), false);
      assert.equal(canTriggerRun("\n\t  "), false);
      assert.equal(canTriggerRun("Valid brief"), true);

      // If already running, further runs are blocked
      useStudioStore.getState().beginGenerate();
      assert.equal(canTriggerRun("Valid brief"), false);
    });
  });
});
