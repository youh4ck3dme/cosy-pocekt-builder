import { useState } from "react";
import { Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyText, downloadHtml, prepareHtmlExport, slugFromTitle } from "@/lib/studio/export";

export function ExportActions({
  html,
  title,
}: {
  html: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = !html.trim();

  async function onCopy() {
    if (disabled) return;
    const prepared = prepareHtmlExport(html);
    if (!prepared.ok) {
      setError(prepared.issues[0]?.message ?? "HTML export neprešiel validáciou.");
      return;
    }
    setError(null);
    const ok = await copyText(prepared.html);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-label={copied ? "Copied" : "Copy HTML"}
        onClick={() => void onCopy()}
      >
        <Copy className="size-3.5" />
        {copied ? "Copied" : "Copy"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-label="Download HTML"
        onClick={() => {
          const prepared = prepareHtmlExport(html);
          if (!prepared.ok) {
            setError(prepared.issues[0]?.message ?? "HTML export neprešiel validáciou.");
            return;
          }
          setError(null);
          downloadHtml(slugFromTitle(title), prepared.html);
        }}
      >
        <Download className="size-3.5" />
        .html
      </Button>
      {error ? <span className="max-w-48 text-right text-[10px] leading-tight text-rose-500">{error}</span> : null}
    </div>
  );
}
