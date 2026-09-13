import { useEffect, useRef } from "react";
import {
  PREVIEW_SANDBOX,
  updatePreviewFrame,
  type PreviewFrameState,
} from "@/lib/preview/preview-frame-controller";

export { PREVIEW_SANDBOX };

/** Opaque-origin blob preview. See PREVIEW_SANDBOX — no allow-same-origin. */

export function PreviewFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const urlRef = useRef("");
  const previousHtmlRef = useRef("");

  useEffect(() => {
    const state: PreviewFrameState = {
      get currentUrl() {
        return urlRef.current;
      },
      set currentUrl(val: string) {
        urlRef.current = val;
      },
      get previousHtml() {
        return previousHtmlRef.current;
      },
      set previousHtml(val: string) {
        previousHtmlRef.current = val;
      },
    };
    return updatePreviewFrame(ref.current, html, state);
  }, [html]);

  return (
    <iframe
      ref={ref}
      title={title}
      sandbox={PREVIEW_SANDBOX}
      referrerPolicy="no-referrer"
      className="h-full min-h-0 w-full border-0 bg-fg"
      data-preview="live"
    />
  );
}
