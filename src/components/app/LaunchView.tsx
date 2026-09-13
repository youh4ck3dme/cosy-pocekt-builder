import { useState, useEffect } from "react";
import JSZip from "jszip";
import {
  Rocket,
  Globe,
  Search,
  BarChart3,
  Server,
  ImagePlay,
  CheckCircle2,
  ExternalLink,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Key,
  AlertCircle,
  ShieldCheck,
  ListChecks,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useStudioStore } from "@/stores/studio-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { getAiStatus, type AiStatus } from "@/lib/ai/generate";
import { createClientApprovalLink, type ClientApprovalDraft } from "@/lib/client-approvals";
import { auditGeneratedHtml } from "@/lib/audit/static-audit";

// ─── helpers ──────────────────────────────────────────────────────────────────

function downloadFile(filename: string, content: string, mime = "text/html") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadZip(filename: string, zip: JSZip) {
  zip.generateAsync({ type: "blob" }).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function exportProjectAsZip(html: string, title: string) {
  const zip = new JSZip();
  
  // Add index.html
  zip.file("index.html", html);
  
  // Add README.md with instructions
  const readme = `# ${title}

Vygenerované pomocou **Cozy AI Studio**.

## Spustenie

1. Rozbaliť tento ZIP archív
2. Otvoriť súbor **index.html** v prehliadači
3. (Voliteľne) Nahrať na hosting (Vercel, Netlify, GitHub Pages, atď.)

## Generované

- "` + new Date().toISOString().slice(0, 10) + `"`;
  
  zip.file("README.md", readme);
  
  // Add a simple .gitignore
  zip.file(".gitignore", "node_modules\n.DS_Store\n");
  
  return zip;
}

function injectMeta(html: string, title: string, description: string): string {
  let out = html;
  if (title) out = out.replace(/<title>[^<]*<\/title>/i, `<title>${title}</title>`);
  out = out.replace(/<meta\s+name="description"[^>]*>/i, "");
  out = out.replace(
    /<\/head>/i,
    `<meta name="description" content="${description.replace(/"/g, "&quot;")}">\n  <meta property="og:title" content="${title.replace(/"/g, "&quot;")}">\n  <meta property="og:description" content="${description.replace(/"/g, "&quot;")}">\n</head>`,
  );
  return out;
}

function injectGtag(html: string, measurementId: string): string {
  const snippet = `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${measurementId}');
</script>`;
  return html.replace(/<\/head>/i, `${snippet}\n</head>`);
}

function safeSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "preview";
}

// ─── sub-card wrapper ─────────────────────────────────────────────────────────

function LaunchCard({
  id,
  icon: Icon,
  title,
  description,
  children,
  disabled,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  children?: React.ReactNode;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface transition-colors duration-150",
        disabled && "opacity-40",
      )}
    >
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-accent">
          <Icon className="size-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-fg">{title}</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">{description}</span>
        </span>
        {!disabled && (
          <span className="mt-1 shrink-0 text-subtle">
            {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </span>
        )}
      </button>

      {open && !disabled && (
        <div className="border-t border-border px-5 pb-5 pt-4">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── cards ────────────────────────────────────────────────────────────────────

function LiveVersionCard() {
  const html = useStudioStore((s) => s.html);
  const title = useStudioStore((s) => s.title);
  const projects = useWorkspaceStore((s) => s.projects);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  function handleDownload() {
    if (!html) return;
    downloadFile(`${safeSlug(title)}.html`, html);
  }

  async function handleCopy() {
    if (!html) return;
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore clipboard error
    }
  }

  function handleExportZip() {
    if (!html) return;
    setExporting(true);
    const zip = exportProjectAsZip(html, title);
    downloadZip(`${safeSlug(title)}-project.zip`, zip);
    setTimeout(() => setExporting(false), 1000);
  }

  return (
    <LaunchCard
      id="launch-live-version"
      icon={Rocket}
      title="Live App Version"
      description="Download or copy the current HTML — deploy it anywhere."
      disabled={!html}
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-subtle">Aktuálna verzia</p>
          <p className="mt-1 truncate text-sm font-medium text-fg">{title}</p>
          <p className="mt-0.5 text-xs text-muted">
            {projects.length} projektov v workspace •{" "}
            {(html.length / 1024).toFixed(1)} kB
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={handleDownload}>
            <Download className="size-3.5" />
            Stiahnuť HTML
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy}>
            <Copy className="size-3.5" />
            {copied ? "Skopírované!" : "Kopírovať HTML"}
          </Button>
          <Button 
            size="sm" 
            className="bg-card border border-border hover:bg-card/80"
            onClick={handleExportZip} 
            disabled={exporting}
          >
            <Download className="size-3.5" />
            {exporting ? "Exportuje..." : "Exportovať ZIP"}
          </Button>
        </div>
      </div>
    </LaunchCard>
  );
}

function ConnectedDomainsCard() {
  const KEY = "cozy-deploy-url";
  const [url, setUrl] = useState(() => localStorage.getItem(KEY) ?? "");
  const [saved, setSaved] = useState(false);

  function save() {
    try {
      localStorage.setItem(KEY, url.trim());
    } catch {
      // ignore localStorage quota error
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <LaunchCard
      id="launch-domains"
      icon={Globe}
      title="Connected Domains"
      description="Set a primary URL where your app lives."
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs uppercase tracking-widest text-subtle" htmlFor="deploy-url">
            Deploy URL
          </label>
          <input
            id="deploy-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://moja-plocha.vercel.app"
            className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} disabled={!url.trim()}>
            {saved ? <CheckCircle2 className="size-3.5" /> : null}
            {saved ? "Uložené" : "Uložiť URL"}
          </Button>
          {url.trim() && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => window.open(url.trim(), "_blank", "noopener")}
            >
              <ExternalLink className="size-3.5" />
              Otvoriť
            </Button>
          )}
        </div>
      </div>
    </LaunchCard>
  );
}

function SeoSocialCard() {
  const html = useStudioStore((s) => s.html);
  const storeTitle = useStudioStore((s) => s.title);
  const upsertProject = useWorkspaceStore((s) => s.upsertProject);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const applyResult = useStudioStore((s) => s.applyResult);

  const [seoTitle, setSeoTitle] = useState(storeTitle);
  const [seoDesc, setSeoDesc] = useState("");
  const [saved, setSaved] = useState(false);

  function apply() {
    if (!html) return;
    const updated = injectMeta(html, seoTitle, seoDesc);
    applyResult({
      title: seoTitle,
      html: updated,
      code: updated,
      assistantText: "SEO meta tags updated.",
      provider: "local",
    });
    upsertProject({
      id: currentProjectId ?? undefined,
      title: seoTitle,
      html: updated,
      code: updated,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <LaunchCard
      id="launch-seo"
      icon={Search}
      title="SEO & Social"
      description="Nastav title a description — injektujú sa priamo do HTML."
      disabled={!html}
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs uppercase tracking-widest text-subtle" htmlFor="seo-title">
            Page Title
          </label>
          <input
            id="seo-title"
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            maxLength={70}
            className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-subtle" htmlFor="seo-desc">
            Description
          </label>
          <textarea
            id="seo-desc"
            rows={2}
            value={seoDesc}
            onChange={(e) => setSeoDesc(e.target.value)}
            maxLength={160}
            placeholder="Stručný popis stránky pre Google a sociálne siete…"
            className="mt-1.5 w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          />
          <p className="mt-1 text-right text-xs text-subtle">{seoDesc.length}/160</p>
        </div>
        <Button size="sm" onClick={apply} disabled={!seoTitle.trim()}>
          {saved ? <CheckCircle2 className="size-3.5" /> : null}
          {saved ? "Uložené" : "Použiť na HTML"}
        </Button>
      </div>
    </LaunchCard>
  );
}

function GoogleAdsCard() {
  const html = useStudioStore((s) => s.html);
  const storeTitle = useStudioStore((s) => s.title);
  const upsertProject = useWorkspaceStore((s) => s.upsertProject);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const applyResult = useStudioStore((s) => s.applyResult);

  const [measurementId, setMeasurementId] = useState("");
  const [saved, setSaved] = useState(false);

  function apply() {
    if (!html || !measurementId.trim()) return;
    const updated = injectGtag(html, measurementId.trim());
    applyResult({
      title: storeTitle,
      html: updated,
      code: updated,
      assistantText: "Google tag injected.",
      provider: "local",
    });
    upsertProject({
      id: currentProjectId ?? undefined,
      title: storeTitle,
      html: updated,
      code: updated,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  return (
    <LaunchCard
      id="launch-google-ads"
      icon={BarChart3}
      title="Google Ads / Analytics"
      description="Injektuj Google tag (gtag.js) do HTML pre tracking a konverzie."
      disabled={!html}
    >
      <div className="space-y-3">
        <div>
          <label className="block text-xs uppercase tracking-widest text-subtle" htmlFor="gtag-id">
            Measurement ID
          </label>
          <input
            id="gtag-id"
            value={measurementId}
            onChange={(e) => setMeasurementId(e.target.value)}
            placeholder="G-XXXXXXXXXX alebo AW-XXXXXXXXXX"
            className="mt-1.5 h-11 w-full rounded-xl border border-border bg-card px-3 font-mono text-sm text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          />
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Script sa vloží do <code className="text-fg">&lt;head&gt;</code> aktuálneho HTML projektu. Nič sa neposiela externe.
        </p>
        <Button size="sm" onClick={apply} disabled={!measurementId.trim() || !html}>
          {saved ? <CheckCircle2 className="size-3.5" /> : null}
          {saved ? "Injektovaný!" : "Injektovať tag"}
        </Button>
      </div>
    </LaunchCard>
  );
}

function ProductionResourcesCard() {
  const [status, setStatus] = useState<AiStatus | null>(null);

  useEffect(() => {
    void getAiStatus().then(setStatus);
  }, []);

  const rows = [
    {
      label: "MISTRAL_API_KEY",
      configured: status?.mistral ?? false,
    },
    {
      label: "Access Token",
      configured: status?.locked ?? false,
    },
  ];

  return (
    <LaunchCard
      id="launch-resources"
      icon={Server}
      title="Production Resources"
      description="Stav API kľúča a prístupových tokenov na serveri."
    >
      <div className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Key className="size-3.5 text-subtle" />
              <span className="font-mono text-xs text-fg">{row.label}</span>
            </div>
            {status === null ? (
              <span className="text-xs text-subtle">Načítavam…</span>
            ) : row.configured ? (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <CheckCircle2 className="size-3.5" /> Aktívny
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted">
                <AlertCircle className="size-3.5" /> Nenastavený
              </span>
            )}
          </div>
        ))}
        <p className="pt-1 text-xs leading-relaxed text-muted">
          API kľúč sa nastavuje cez env premennú MISTRAL_API_KEY na Vercel alebo v `.env.local` pri vývoji.
        </p>
      </div>
    </LaunchCard>
  );
}

function PromoAssetsCard() {
  const html = useStudioStore((s) => s.html);
  const title = useStudioStore((s) => s.title);
  const [copied, setCopied] = useState(false);

  const ogHtml = `<!-- Open Graph / Social Preview -->
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="Vytvorené s Cozy AI Studio.">
<meta property="og:image" content="https://moja-plocha.vercel.app/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">`;

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(ogHtml);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore clipboard error
    }
  }

  function downloadReadme() {
    const md = `# ${title}

Vygenerované pomocou **Cozy AI Studio**.

## Nasadenie

1. Stiahnite \`${safeSlug(title)}.html\`
2. Nahrajte na ľubovoľný hosting (Vercel, Netlify, GitHub Pages…)
3. Pridajte OG obrázok (\`og.png\`) do root adresára

## OG / Social Meta Tags

\`\`\`html
${ogHtml}
\`\`\`
`;
    downloadFile(`${safeSlug(title)}-readme.md`, md, "text/markdown");
  }

  return (
    <LaunchCard
      id="launch-promo"
      icon={ImagePlay}
      title="Promo Assets"
      description="OG meta snippet a README pre kampane a zdieľanie."
      disabled={!html}
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-canvas p-3">
          <pre className="overflow-x-auto text-xs leading-relaxed text-muted whitespace-pre-wrap">
            {ogHtml}
          </pre>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={copySnippet}>
            <Copy className="size-3.5" />
            {copied ? "Skopírované!" : "Kopírovať snippet"}
          </Button>
          <Button size="sm" variant="outline" onClick={downloadReadme}>
            <Download className="size-3.5" />
            README.md
          </Button>
        </div>
      </div>
    </LaunchCard>
  );
}

function ClientApprovalCard() {
  const html = useStudioStore((s) => s.html);
  const code = useStudioStore((s) => s.code);
  const title = useStudioStore((s) => s.title);
  const [clientLabel, setClientLabel] = useState("");
  const [days, setDays] = useState(7);
  const [draft, setDraft] = useState<ClientApprovalDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createLink() {
    if (!html.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const next = await createClientApprovalLink({
        data: { title, html, code: code || html, clientLabel, days },
      });
      setDraft(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Link sa nepodarilo vytvorit.");
    } finally {
      setBusy(false);
    }
  }

  const absoluteUrl =
    draft && typeof window !== "undefined" ? new URL(draft.url, window.location.origin).toString() : "";

  return (
    <LaunchCard
      id="launch-client-approval"
      icon={ShieldCheck}
      title="Klientske schvalenie"
      description="Vytvor presnu verziu s expirovanym linkom a 6-miestnym PINom."
      disabled={!html}
    >
      <div className="space-y-3">
        <label className="block text-xs uppercase tracking-widest text-subtle" htmlFor="client-label">
          Klient alebo projekt
        </label>
        <input
          id="client-label"
          value={clientLabel}
          onChange={(event) => setClientLabel(event.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          placeholder="Nazov klienta"
        />
        <label className="block text-xs uppercase tracking-widest text-subtle" htmlFor="approval-days">
          Platnost linku
        </label>
        <select
          id="approval-days"
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
          className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
        >
          <option value={3}>3 dni</option>
          <option value={7}>7 dni</option>
          <option value={14}>14 dni</option>
          <option value={30}>30 dni</option>
        </select>
        <Button size="sm" onClick={() => void createLink()} disabled={busy || !html.trim()}>
          <ShieldCheck className="size-3.5" />
          {busy ? "Vytvaram..." : "Vytvorit review link"}
        </Button>
        {error ? <p className="text-xs text-muted">{error}</p> : null}
        {draft ? (
          <div className="space-y-2 rounded-xl border border-border bg-card p-3">
            <p className="text-xs text-subtle">Poslite klientovi link a PIN oddelene.</p>
            <p className="break-all font-mono text-xs text-fg">{absoluteUrl}</p>
            <p className="font-mono text-lg tracking-widest text-accent">{draft.pin}</p>
            <p className="text-xs text-muted">
              Plati do {new Date(draft.expiresAt).toLocaleString("sk-SK")}.
            </p>
          </div>
        ) : null}
      </div>
    </LaunchCard>
  );
}

function QualityGateCard() {
  const html = useStudioStore((s) => s.html);
  const report = auditGeneratedHtml(html);
  const tone =
    report.status === "pass"
      ? "text-accent"
      : report.status === "warning"
        ? "text-yellow-300"
        : "text-muted";

  return (
    <LaunchCard
      id="launch-quality-gate"
      icon={ListChecks}
      title="Quality gate"
      description="Deterministicka kontrola exportu pred klientom alebo publikovanim."
      disabled={!html}
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs text-subtle">Stav verzie</p>
          <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{report.score}/100</p>
          <p className="text-xs text-muted">
            {report.status === "pass"
              ? "Zakladne kontroly presli."
              : report.status === "warning"
                ? "Verzia je pouzitelna, ale ma upozornenia."
                : "Pred odoslanim klientovi opravte zlyhania."}
          </p>
        </div>
        <ul className="space-y-2">
          {report.findings.map((item) => (
            <li key={item.id} className="rounded-xl border border-border bg-card px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-fg">{item.label}</p>
                <span className="text-xs uppercase tracking-widest text-subtle">{item.severity}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted">{item.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </LaunchCard>
  );
}

// ─── main view ────────────────────────────────────────────────────────────────

export function LaunchView() {
  const html = useStudioStore((s) => s.html);
  const title = useStudioStore((s) => s.title);

  return (
    <div className="h-full overflow-y-auto px-5 py-6 sm:px-8">
      {/* Header */}
      <p className="text-xs uppercase tracking-widest text-muted">Publikovanie</p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight">Launch</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        Publikovanie sprístupní projekt a odomkne zdieľacie nástroje. Môžeš
        editovať aj po spustení.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        {/* Left — launch action */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-border bg-surface p-6">
            <span className="flex size-10 items-center justify-center rounded-xl bg-card text-accent">
              <Rocket className="size-5" />
            </span>
            <h2 className="mt-4 text-lg font-semibold tracking-tight">Spusti svoju plochu</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Stiahni HTML alebo ZIP archív, nasaď ho na ľubovoľný hosting a zdieľaj odkaz. Žiadna
              registrácia, žiadny vendor lock-in.
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button
                className="flex-1"
                disabled={!html}
                onClick={() => {
                  if (!html) return;
                  const blob = new Blob([html], { type: "text/html" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `${safeSlug(title)}.html`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="size-4" />
                Stiahnuť plochu
              </Button>
              <Button
                className="flex-1 bg-card border border-border hover:bg-card/80"
                disabled={!html}
                onClick={() => {
                  if (!html) return;
                  const zip = exportProjectAsZip(html, title);
                  downloadZip(`${safeSlug(title)}-project.zip`, zip);
                }}
              >
                <Download className="size-4" />
                Exportovať ZIP
              </Button>
            </div>
            {!html && (
              <p className="mt-2 text-center text-xs text-subtle">
                Otvor Projekty a napíš brief.
              </p>
            )}
          </div>

          {html && (
            <div className="rounded-2xl border border-border bg-surface px-5 py-4">
              <p className="text-xs uppercase tracking-widest text-subtle">Aktuálna plocha</p>
              <p className="mt-1 truncate text-sm font-medium text-fg">{title}</p>
              <p className="text-xs text-muted">{(html.length / 1024).toFixed(1)} kB HTML</p>
            </div>
          )}
        </div>

        {/* Right — 6 cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <LiveVersionCard />
          <ConnectedDomainsCard />
          <SeoSocialCard />
          <GoogleAdsCard />
          <QualityGateCard />
          <ClientApprovalCard />
          <ProductionResourcesCard />
          <PromoAssetsCard />
        </div>
      </div>
    </div>
  );
}
