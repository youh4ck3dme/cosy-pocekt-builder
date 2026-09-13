import assert from "node:assert/strict";
import { test, describe } from "node:test";
import {
  injectCozyElements,
  cozyElementsScriptTag,
} from "./cozy-elements.ts";
import {
  scriptSignature,
  shouldReloadPreview,
} from "./dom-patch-utils.ts";
import { morphIframeDocument } from "./live-morpher.ts";

describe("Live Morpher & Cozy Elements Engine (18 Tests)", () => {
  describe("injectCozyElements", () => {
    test("1. injects cozy script tag before closing body tag when body exists", () => {
      const input = "<html><head></head><body><main>Content</main></body></html>";
      const result = injectCozyElements(input);
      assert.ok(result.includes("data-cozy-elements"));
      assert.ok(result.indexOf("data-cozy-elements") < result.indexOf("</body>"));
    });

    test("2. appends script tag at the end when closing body tag is absent", () => {
      const input = "<div>Fragment HTML without body tag</div>";
      const result = injectCozyElements(input);
      assert.ok(result.includes("data-cozy-elements"));
      assert.ok(result.endsWith("</script>"));
    });

    test("3. avoids duplicate injection if data-cozy-elements script tag exists", () => {
      const input = "<html><body><script data-cozy-elements>/* existing */</script></body></html>";
      const result = injectCozyElements(input);
      const matches = result.match(/data-cozy-elements/g);
      assert.equal(matches?.length, 1);
    });

    test("4. preserves surrounding markup and custom attributes", () => {
      const input = '<div id="app" data-theme="dark"><h1>Title</h1></div>';
      const result = injectCozyElements(input);
      assert.ok(result.includes('id="app"'));
      assert.ok(result.includes('data-theme="dark"'));
    });
  });

  describe("cozyElementsScriptTag", () => {
    test("5. produces a script tag with data-cozy-elements attribute", () => {
      const script = cozyElementsScriptTag();
      assert.ok(script.startsWith("<script data-cozy-elements>"));
      assert.ok(script.endsWith("</script>"));
    });

    test("6. contains window custom elements setup logic", () => {
      const script = cozyElementsScriptTag();
      assert.ok(script.length > 50);
      assert.ok(script.includes("customElements") || script.includes("window"));
    });
  });

  describe("scriptSignature", () => {
    test("7. returns empty string for markup with no script tags", () => {
      const html = "<div><p>Hello world</p><style>body { color: red; }</style></div>";
      assert.equal(scriptSignature(html), "");
    });

    test("8. extracts inline script content", () => {
      const html = '<div><script type="module">console.log("test");</script></div>';
      const sig = scriptSignature(html);
      assert.ok(sig.includes('type="module"'));
      assert.ok(sig.includes('console.log("test");'));
    });

    test("9. normalizes whitespace inside script attributes and body", () => {
      const html1 = '<script  src="app.js"   type="text/javascript" >  console.log(1);   </script>';
      const html2 = '<script src="app.js" type="text/javascript">console.log(1);</script>';
      assert.equal(scriptSignature(html1), scriptSignature(html2));
    });

    test("10. separates multiple script tags with newline separator", () => {
      const html = '<script>const a = 1;</script><div></div><script>const b = 2;</script>';
      const sig = scriptSignature(html);
      assert.ok(sig.includes(";;"));
      assert.equal(sig.split(";;").length, 2);
    });
  });

  describe("shouldReloadPreview", () => {
    test("11. returns true if previous HTML is empty", () => {
      assert.equal(shouldReloadPreview("", "<div>New</div>"), true);
    });

    test("12. returns true if next HTML is empty", () => {
      assert.equal(shouldReloadPreview("<div>Old</div>", ""), true);
    });

    test("13. returns false when scripts are identical and only DOM elements morphed", () => {
      const prev = '<script src="main.js"></script><h1>Version 1</h1>';
      const next = '<script src="main.js"></script><h1>Version 2</h1><p>New stream text</p>';
      assert.equal(shouldReloadPreview(prev, next), false);
    });

    test("14. returns true when a new script tag is streamed in", () => {
      const prev = "<h1>No scripts</h1>";
      const next = '<h1>No scripts</h1><script src="analytics.js"></script>';
      assert.equal(shouldReloadPreview(prev, next), true);
    });

    test("15. returns true when script src attribute changes", () => {
      const prev = '<script src="v1.js"></script>';
      const next = '<script src="v2.js"></script>';
      assert.equal(shouldReloadPreview(prev, next), true);
    });
  });

  describe("morphIframeDocument", () => {
    test("16. returns false safely when iframe has no contentDocument", () => {
      const fakeIframe = {} as HTMLIFrameElement;
      const result = morphIframeDocument(fakeIframe, "<div>Test</div>");
      assert.equal(result, false);
    });

    test("17. returns false when document has no body node", () => {
      const fakeIframe = {
        contentDocument: {} as Document,
      } as HTMLIFrameElement;
      const result = morphIframeDocument(fakeIframe, "<div>Test</div>");
      assert.equal(result, false);
    });

    test("18. handles null or undefined iframe reference without throwing errors", () => {
      // @ts-expect-error testing runtime robustness
      const result = morphIframeDocument(null, "<div>Test</div>");
      assert.equal(result, false);
    });
  });
});
