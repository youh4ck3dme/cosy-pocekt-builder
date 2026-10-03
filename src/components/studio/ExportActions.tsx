import { useState } from "react";
import { Copy, Download, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { tap } from "@/hooks/useHaptic";
import { buildPwaManifest, copyText, downloadHtml, downloadZip, prepareHtmlExport, slugFromTitle } from "@/lib/studio/export";

export function ExportActions({
  html,
  title,
  exportReady = true,
}: {
  html: string;
  title: string;
  exportReady?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const disabled = !html.trim() || !exportReady;

  async function onZip() {
    if (disabled || zipping) return;
    tap();
    const prepared = prepareHtmlExport(html);
    if (!prepared.ok) {
      setError(prepared.issues[0]?.message ?? "HTML export neprešiel validáciou.");
      return;
    }
    setError(null);
    setZipping(true);
    try {
      await downloadZip(slugFromTitle(title), prepared.html, buildPwaManifest(title));
      toast.success("ZIP balíček stiahnutý (index.html + manifest.json)");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ZIP sa nepodarilo vytvoriť.");
    } finally {
      setZipping(false);
    }
  }

  async function onCopy() {
    if (disabled) return;
    tap();
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
          tap();
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
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || zipping}
        aria-label="Stiahnuť ZIP balíček"
        onClick={() => void onZip()}
      >
        <Package className="size-3.5" />
        {zipping ? "ZIP…" : "ZIP"}
      </Button>
      {error ? <span className="max-w-48 text-right text-[10px] leading-tight text-rose-500">{error}</span> : null}
    </div>
  );
}
