import { useState, useMemo, useEffect } from "react";
import {
  tokenizeHtml,
  tokensToLines,
  extractStyles,
  extractScripts,
  extractMarkup,
  type TokenType,
} from "@/lib/studio/syntax";
import { copyText, downloadHtml, slugFromTitle } from "@/lib/studio/export";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Check,
  Code2,
  Copy,
  Download,
  Edit3,
  Eye,
  WrapText,
  Save,
} from "lucide-react";

interface CodeViewerProps {
  code: string;
  title: string;
  onUpdateCode?: (newCode: string) => void;
}

type ViewFilter = "all" | "html" | "css" | "js";

const TOKEN_CLASS: Record<TokenType, string> = {
  plain: "text-fg",
  comment: "text-subtle italic",
  doctype: "text-amber-500/90 font-medium italic",
  "tag-bracket": "text-muted/70",
  "tag-name": "text-rose-400 font-medium",
  "attr-name": "text-amber-300/90",
  "attr-value": "text-emerald-400",
  string: "text-emerald-400",
  keyword: "text-purple-400 font-medium",
  number: "text-orange-400",
  selector: "text-sky-400 font-medium",
  property: "text-cyan-300",
  value: "text-amber-200/90",
  punctuation: "text-muted",
};

export function CodeViewer({ code, title, onUpdateCode }: CodeViewerProps) {
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(code);
  const [copied, setCopied] = useState(false);
  const [wrap, setWrap] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    setEditValue(code);
  }, [code]);

  const activeText = useMemo(() => {
    if (isEditing) return editValue;
    if (!code) return "";
    switch (filter) {
      case "css":
        return extractStyles(code) || "/* Žiadne <style> bloky neboli nájdené */";
      case "js":
        return extractScripts(code) || "// Žiadne <script> bloky neboli nájdené";
      case "html":
        return extractMarkup(code);
      case "all":
      default:
        return code;
    }
  }, [code, filter, isEditing, editValue]);

  const lines = useMemo(() => {
    if (!activeText) return [];
    const tokens = tokenizeHtml(activeText);
    return tokensToLines(tokens);
  }, [activeText]);

  const lineCount = useMemo(() => {
    if (!activeText) return 0;
    return activeText.split("\n").length;
  }, [activeText]);

  const byteSize = useMemo(() => {
    if (!activeText) return "0 B";
    const bytes = new Blob([activeText]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  }, [activeText]);

  async function handleCopy() {
    if (!activeText) return;
    const ok = await copyText(activeText);
    if (!ok) return;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  function handleSave() {
    if (onUpdateCode && editValue !== code) {
      onUpdateCode(editValue);
      setSavedFeedback(true);
      window.setTimeout(() => setSavedFeedback(false), 1500);
    }
    setIsEditing(false);
  }

  if (!code && !isEditing) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-muted">
        <div className="mb-3 flex size-12 items-center justify-center rounded-2xl border border-border bg-card/40 text-subtle shadow-sm">
          <Code2 className="size-6" />
        </div>
        <p className="font-serif text-base text-fg">Žiadny kód zatiaľ</p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-subtle">
          Kód sa automaticky zobrazí a zvýrazní po vygenerovaní náhľadu v štúdiu.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-canvas text-fg">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface/50 px-3 py-1.5 text-xs">
        {/* Language Tabs */}
        {!isEditing ? (
          <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card/40 p-0.5">
            {(
              [
                ["all", "Všetko"],
                ["html", "HTML"],
                ["css", "CSS"],
                ["js", "JS"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  filter === key
                    ? "bg-accent text-accent-fg shadow-xs"
                    : "text-muted hover:text-fg",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <span className="inline-block size-2 rounded-full bg-accent animate-pulse" />
            <span>Režim úprav (HTML + CSS + JS)</span>
          </div>
        )}

        {/* Stats & Actions */}
        <div className="flex items-center gap-1">
          <span className="hidden text-[11px] text-subtle sm:inline-block mr-1">
            {lineCount} riadkov • {byteSize}
          </span>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setWrap((w) => !w)}
            aria-label={wrap ? "Vypnúť zalamovanie" : "Zalomiť riadky"}
            className={cn("h-7 px-2 text-xs", wrap ? "text-accent" : "text-muted")}
            title="Zalomiť riadky"
          >
            <WrapText className="size-3.5" />
            <span className="hidden md:inline text-[11px]">Wrap</span>
          </Button>

          {onUpdateCode ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isEditing) {
                  handleSave();
                } else {
                  setIsEditing(true);
                }
              }}
              className={cn(
                "h-7 px-2 text-xs",
                isEditing ? "bg-accent/20 text-accent font-medium" : "text-muted",
              )}
              title={isEditing ? "Uložiť a zobraziť zvýraznenie" : "Upraviť kód"}
            >
              {isEditing ? (
                <>
                  <Save className="size-3.5" />
                  <span className="text-[11px]">Uložiť</span>
                </>
              ) : (
                <>
                  <Edit3 className="size-3.5" />
                  <span className="hidden sm:inline text-[11px]">Upraviť</span>
                </>
              )}
            </Button>
          ) : null}

          {isEditing && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditValue(code);
                setIsEditing(false);
              }}
              className="h-7 px-2 text-xs text-muted hover:text-fg"
            >
              <Eye className="size-3.5" />
              <span className="text-[11px]">Zrušiť</span>
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleCopy()}
            className="h-7 px-2 text-xs text-muted hover:text-fg"
            title="Kopírovať kód"
          >
            {copied ? (
              <>
                <Check className="size-3.5 text-emerald-400" />
                <span className="text-[11px] text-emerald-400 font-medium">Skopírované</span>
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                <span className="hidden sm:inline text-[11px]">Kopírovať</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => downloadHtml(slugFromTitle(title), activeText)}
            className="h-7 px-2 text-xs text-muted hover:text-fg"
            title="Stiahnuť súbor"
          >
            <Download className="size-3.5" />
            <span className="text-[11px]">.html</span>
          </Button>
        </div>
      </div>

      {savedFeedback && (
        <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-3 py-1 text-center text-xs text-emerald-400">
          Zmeny boli úspešne uložené do živého náhľadu!
        </div>
      )}

      {/* Code Body Area */}
      <div className="relative min-h-0 flex-1 overflow-auto font-mono text-xs leading-relaxed selection:bg-accent/30 selection:text-fg">
        {isEditing ? (
          <div className="relative flex min-h-full">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "s") {
                  e.preventDefault();
                  handleSave();
                }
              }}
              spellCheck={false}
              autoCapitalize="off"
              autoComplete="off"
              autoCorrect="off"
              className={cn(
                "h-full w-full resize-none bg-canvas p-4 font-mono text-xs text-fg focus:outline-none",
                wrap ? "whitespace-pre-wrap wrap-break-word" : "whitespace-pre overflow-x-auto",
              )}
              placeholder="Vložte alebo upravte HTML kód..."
            />
          </div>
        ) : (
          <div className="flex min-w-full">
            {/* Gutter Line Numbers */}
            <div
              className="sticky left-0 z-10 shrink-0 select-none border-r border-border/40 bg-canvas/95 py-3 pr-3 text-right font-mono text-xs text-subtle/70"
              style={{ minWidth: `${Math.max(2.5, String(lines.length).length * 0.75 + 1)}rem` }}
              aria-hidden="true"
            >
              {lines.map((line) => (
                <div key={line.lineNumber} className="px-1 leading-5">
                  {line.lineNumber}
                </div>
              ))}
            </div>

            {/* Syntax Highlighted Lines */}
            <div
              className={cn(
                "min-w-0 flex-1 py-3 pl-3 pr-4 font-mono text-xs",
                wrap ? "whitespace-pre-wrap wrap-break-word" : "whitespace-pre overflow-x-auto",
              )}
            >
              {lines.map((line) => (
                <div
                  key={line.lineNumber}
                  className="group flex min-h-5 items-baseline leading-5 hover:bg-card/30"
                >
                  {line.tokens.length === 0 ? (
                    <span>&nbsp;</span>
                  ) : (
                    line.tokens.map((token, tIdx) => (
                      <span
                        key={tIdx}
                        className={TOKEN_CLASS[token.type] || "text-fg"}
                      >
                        {token.text}
                      </span>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
