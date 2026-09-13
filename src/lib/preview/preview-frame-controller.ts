import { injectCozyElements } from "./cozy-elements.ts";
import { PREVIEW_SANDBOX } from "./sandbox.ts";
import { morphIframeDocument } from "./live-morpher.ts";
import { shouldReloadPreview } from "./dom-patch-utils.ts";

export { PREVIEW_SANDBOX };

export type PreviewFrameState = {
  currentUrl: string;
  previousHtml: string;
};

export type PreviewFrameElement = {
  src?: string;
  dataset: Record<string, string | undefined>;
  removeAttribute(attr: string): void;
  contentDocument?: { body?: unknown } | null;
};

export function updatePreviewFrame(
  iframe: PreviewFrameElement | null,
  html: string,
  state: PreviewFrameState,
): (() => void) | void {
  if (!iframe) return;
  if (!html.trim()) {
    iframe.removeAttribute("src");
    if (state.currentUrl) {
      URL.revokeObjectURL(state.currentUrl);
      state.currentUrl = "";
    }
    state.previousHtml = "";
    return;
  }

  const next = injectCozyElements(html);
  const previous = state.previousHtml;
  if (
    iframe.contentDocument?.body &&
    previous &&
    !shouldReloadPreview(previous, html) &&
    morphIframeDocument(iframe as HTMLIFrameElement, html)
  ) {
    state.previousHtml = html;
    iframe.dataset.patch = "morphed";
    iframe.dataset.patchReason = "html-changed";
    return;
  }

  const blob = new Blob([next], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const previousUrl = state.currentUrl;
  state.currentUrl = url;
  state.previousHtml = html;
  iframe.dataset.patch = "reloaded";
  iframe.dataset.patchReason = previousUrl ? "html-changed" : "first";
  iframe.src = url;
  if (previousUrl) URL.revokeObjectURL(previousUrl);

  return () => {
    if (state.currentUrl === url) {
      URL.revokeObjectURL(url);
      state.currentUrl = "";
    }
  };
}
