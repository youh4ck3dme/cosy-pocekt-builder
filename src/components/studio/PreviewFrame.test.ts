import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { Idiomorph } from "idiomorph";
import {
  PREVIEW_SANDBOX,
  updatePreviewFrame,
  type PreviewFrameElement,
  type PreviewFrameState,
} from "../../lib/preview/preview-frame-controller.ts";

describe("PreviewFrame (src/components/studio/PreviewFrame.tsx)", () => {
  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  const originalDOMParser = (globalThis as unknown as { DOMParser?: unknown }).DOMParser;
  const originalMorph = Idiomorph.morph;

  let createdUrls: string[] = [];
  let revokedUrls: string[] = [];
  let nextUrlId = 1;

  beforeEach(() => {
    createdUrls = [];
    revokedUrls = [];
    nextUrlId = 1;

    URL.createObjectURL = (_blob: Blob) => {
      const url = `blob:http://localhost:8080/mock-uuid-${nextUrlId++}`;
      createdUrls.push(url);
      return url;
    };

    URL.revokeObjectURL = (url: string) => {
      revokedUrls.push(url);
    };

    class MockDOMParser {
      parseFromString(str: string) {
        return {
          body: { innerHTML: str },
          title: "Parsed Title",
          head: { appendChild: () => {} },
          documentElement: { appendChild: () => {} },
        };
      }
    }
    (globalThis as unknown as { DOMParser?: unknown }).DOMParser = MockDOMParser;

    Idiomorph.morph = () => {
      return {} as unknown as Element;
    };
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    if (originalDOMParser) {
      (globalThis as unknown as { DOMParser?: unknown }).DOMParser = originalDOMParser;
    } else {
      delete (globalThis as unknown as { DOMParser?: unknown }).DOMParser;
    }
    Idiomorph.morph = originalMorph;
  });

  function createMockIframe(): PreviewFrameElement {
    return {
      src: "",
      dataset: {},
      removeAttribute(attr: string) {
        if (attr === "src") {
          delete this.src;
        }
      },
      contentDocument: {
        body: {
          innerHTML: "<div>Existing Body</div>",
        },
        head: { appendChild: () => {} },
        getElementById: () => null,
        createElement: () => ({ id: "", textContent: "" }),
        title: "Current Title",
      } as unknown as Document,
    };
  }

  describe("1. PREVIEW_SANDBOX security rules", () => {
    it("never grants allow-same-origin next to allow-scripts", () => {
      const tokens = PREVIEW_SANDBOX.split(/\s+/);
      assert.equal(tokens.includes("allow-scripts"), true);
      assert.equal(tokens.includes("allow-forms"), true);
      assert.equal(tokens.includes("allow-same-origin"), false);
    });
  });

  describe("2. Initial rendering and full reload", () => {
    it("sets patch='reloaded' and patchReason='first' on initial HTML stream", () => {
      const iframe = createMockIframe();
      const state: PreviewFrameState = { currentUrl: "", previousHtml: "" };
      const initialHtml = "<html><head></head><body><h1>Hello World</h1></body></html>";

      updatePreviewFrame(iframe, initialHtml, state);

      assert.equal(iframe.dataset.patch, "reloaded");
      assert.equal(iframe.dataset.patchReason, "first");
      assert.ok(iframe.src?.startsWith("blob:"));
      assert.equal(state.currentUrl, iframe.src);
      assert.equal(state.previousHtml, initialHtml);
      assert.equal(createdUrls.length, 1);
    });
  });

  describe("3. Live DOM morphing without script changes", () => {
    it("morphs document in-place when scripts are identical", () => {
      const iframe = createMockIframe();
      const state: PreviewFrameState = { currentUrl: "", previousHtml: "" };

      const htmlV1 = '<div id="root"><h1>Counter: 0</h1></div><script>console.log("app");</script>';
      updatePreviewFrame(iframe, htmlV1, state);
      const firstUrl = iframe.src;

      const htmlV2 = '<div id="root"><h1>Counter: 1</h1><p>Incremented</p></div><script>console.log("app");</script>';
      updatePreviewFrame(iframe, htmlV2, state);

      assert.equal(iframe.dataset.patch, "morphed");
      assert.equal(iframe.dataset.patchReason, "html-changed");
      assert.equal(iframe.src, firstUrl, "Iframe src should not be reloaded during morphing");
      assert.equal(state.previousHtml, htmlV2);
      assert.equal(createdUrls.length, 1, "No new Blob URL should be created during morphing");
    });
  });

  describe("4. Reload fallback when scripts change", () => {
    it("reloads preview with patch='reloaded' and patchReason='html-changed' when scripts change", () => {
      const iframe = createMockIframe();
      const state: PreviewFrameState = { currentUrl: "", previousHtml: "" };

      const htmlV1 = '<div>Hello</div><script>console.log("v1");</script>';
      updatePreviewFrame(iframe, htmlV1, state);
      const urlV1 = state.currentUrl;

      const htmlV2 = '<div>Hello</div><script>console.log("v2 - new script content");</script>';
      updatePreviewFrame(iframe, htmlV2, state);
      const urlV2 = state.currentUrl;

      assert.equal(iframe.dataset.patch, "reloaded");
      assert.equal(iframe.dataset.patchReason, "html-changed");
      assert.notEqual(urlV1, urlV2);
      assert.equal(iframe.src, urlV2);
      // Memory leak prevention: previous URL must be revoked
      assert.ok(revokedUrls.includes(urlV1));
    });
  });

  describe("5. Cleanup upon empty HTML", () => {
    it("removes src and revokes active Blob URL when HTML is cleared", () => {
      const iframe = createMockIframe();
      const state: PreviewFrameState = { currentUrl: "", previousHtml: "" };

      updatePreviewFrame(iframe, "<div>Some content</div>", state);
      const activeUrl = state.currentUrl;
      assert.ok(activeUrl);

      // Now pass empty HTML
      updatePreviewFrame(iframe, "   ", state);

      assert.equal(iframe.src, undefined, "src attribute should be removed");
      assert.equal(state.currentUrl, "");
      assert.equal(state.previousHtml, "");
      assert.ok(revokedUrls.includes(activeUrl), "Active blob URL must be revoked");
    });
  });

  describe("6. Safe handling when contentDocument or body is missing", () => {
    it("falls back to full reload without crashing when contentDocument is null", () => {
      const iframe = createMockIframe();
      iframe.contentDocument = null; // simulate inaccessible cross-origin or unmounted document
      const state: PreviewFrameState = { currentUrl: "", previousHtml: "<div>old</div>" };

      assert.doesNotThrow(() => {
        updatePreviewFrame(iframe, "<div>new</div>", state);
      });

      assert.equal(iframe.dataset.patch, "reloaded");
      assert.ok(iframe.src?.startsWith("blob:"));
    });

    it("falls back to full reload without crashing when body is undefined", () => {
      const iframe = createMockIframe();
      iframe.contentDocument = { body: undefined };
      const state: PreviewFrameState = { currentUrl: "", previousHtml: "<div>old</div>" };

      assert.doesNotThrow(() => {
        updatePreviewFrame(iframe, "<div>new</div>", state);
      });

      assert.equal(iframe.dataset.patch, "reloaded");
    });
  });

  describe("7. Unmount cleanup", () => {
    it("returned cleanup function revokes active blob URL", () => {
      const iframe = createMockIframe();
      const state: PreviewFrameState = { currentUrl: "", previousHtml: "" };

      const cleanup = updatePreviewFrame(iframe, "<div>Mounted App</div>", state);
      assert.equal(typeof cleanup, "function");
      const activeUrl = state.currentUrl;

      cleanup?.();
      assert.ok(revokedUrls.includes(activeUrl));
      assert.equal(state.currentUrl, "");
    });
  });
});
