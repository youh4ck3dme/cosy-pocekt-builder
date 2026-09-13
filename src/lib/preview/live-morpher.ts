import { Idiomorph } from "idiomorph";
import { ensureCozyElements, injectCozyElements } from "./cozy-elements.ts";

const MORPH_STYLE_TAG_ID = "cozy-live-morpher-styles";

const MORPH_STYLES = `
/* Micro-animations for live morphing elements */
* {
  transition: background-color 0.25s ease, border-color 0.25s ease, color 0.2s ease;
}

@keyframes cozyElementPop {
  0% {
    opacity: 0.6;
    transform: translateY(4px) scale(0.99);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.cozy-morph-new {
  animation: cozyElementPop 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
`;

/**
 * Injects morphing transition styles into the iframe target document.
 */
function ensureMorphStyles(doc: Document) {
  if (doc.getElementById(MORPH_STYLE_TAG_ID)) return;
  const style = doc.createElement("style");
  style.id = MORPH_STYLE_TAG_ID;
  style.textContent = MORPH_STYLES;
  (doc.head || doc.documentElement).appendChild(style);
}

/**
 * Performs smooth, zero-delay DOM morphing on an iframe content document.
 * Eliminates iframe reloads, white flashes, and scroll resets during AI streaming.
 */
export function morphIframeDocument(
  iframe: HTMLIFrameElement,
  html: string
): boolean {
  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc || !doc.body) {
      return false;
    }

    const preparedHtml = injectCozyElements(html);
    const parser = new DOMParser();
    const newDoc = parser.parseFromString(preparedHtml, "text/html");

    ensureMorphStyles(doc);
    ensureCozyElements(doc);

    // Morph body content with zero delay
    Idiomorph.morph(doc.body, newDoc.body, {
      morphStyle: "outerHTML",
      callbacks: {
        beforeNodeAdded(node) {
          if (node instanceof HTMLElement && node.nodeType === 1) {
            node.classList.add("cozy-morph-new");
          }
          return true;
        },
      },
    });

    // Sync head title if changed
    if (newDoc.title && doc.title !== newDoc.title) {
      doc.title = newDoc.title;
    }

    return true;
  } catch (err) {
    console.warn("[live-morpher] Fallback to standard render due to morph error:", err);
    return false;
  }
}
