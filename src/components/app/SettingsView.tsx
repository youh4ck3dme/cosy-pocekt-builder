import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getAiStatus, redeemGenerateAccess } from "@/lib/ai/generate";
import { authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  createWordPressConnection,
  deleteWordPressConnection,
  listWordPressConnections,
  testWordPressConnection,
  listWordPressContent,
  createWordPressContent,
  updateWordPressContent,
  deleteWordPressContent,
  listWordPressMedia,
  uploadWordPressMedia,
  type WordPressContent,
  type WordPressConnection,
} from "@/lib/wordpress";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { compressWordPressImage } from "@/lib/wordpress-media";

export function SettingsView() {
  const { user } = useCurrentUserState();
  const workspaceId = useWorkspaceStore((s) => s.workspaceId);
  const clearLocal = useWorkspaceStore((s) => s.clearLocal);
  const [copied, setCopied] = useState(false);
  const [locked, setLocked] = useState(false);
  const [token, setToken] = useState("");
  const [accessMsg, setAccessMsg] = useState<string | null>(null);
  const [wpSites, setWpSites] = useState<WordPressConnection[]>([]);
  const [wpSiteUrl, setWpSiteUrl] = useState("");
  const [wpUsername, setWpUsername] = useState("");
  const [wpPassword, setWpPassword] = useState("");
  const [wpLabel, setWpLabel] = useState("");
  const [wpMsg, setWpMsg] = useState<string | null>(null);
  const [wpBusy, setWpBusy] = useState(false);
  const [wpSelected, setWpSelected] = useState("");
  const [wpContent, setWpContent] = useState<WordPressContent[]>([]);
  const [wpMedia, setWpMedia] = useState<Array<{ id: number; link: string | null; title: string }>>([]);
  const [wpEditor, setWpEditor] = useState({ id: 0, type: "post" as "post" | "page", title: "", content: "", status: "draft" });

  useEffect(() => {
    void getAiStatus().then((s) => setLocked(s.locked));
    if (authEnabled && user?.id) {
      void listWordPressConnections().then(setWpSites).catch(() => setWpMsg("Pre správu pripojení sa prihláste."));
    }
  }, [user?.id]);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(workspaceId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  }

  async function redeem(e: FormEvent) {
    e.preventDefault();
    const result = await redeemGenerateAccess({ data: { token } });
    if (result.ok) {
      setToken("");
      setAccessMsg("Prístup uložený v httpOnly cookie.");
      return;
    }

    setAccessMsg(result.error);
  }

  async function connectWordPress(e: FormEvent) {
    e.preventDefault();
    setWpBusy(true);
    setWpMsg(null);
    try {
      const site = await createWordPressConnection({
        data: { siteUrl: wpSiteUrl, username: wpUsername, password: wpPassword, label: wpLabel },
      });
      setWpSites((current) => [site, ...current]);
      setWpSiteUrl("");
      setWpUsername("");
      setWpPassword("");
      setWpLabel("");
      setWpMsg("WordPress je pripojený. Heslo zostáva zašifrované iba na serveri.");
    } catch (error) {
      setWpMsg(error instanceof Error ? error.message : "Pripojenie sa nepodarilo.");
    } finally {
      setWpBusy(false);
    }

  }

  async function loadWordPressData(id: string) {
    setWpSelected(id);
    try {
      const [content, media] = await Promise.all([
        listWordPressContent({ data: { id } }),
        listWordPressMedia({ data: { id } }),
      ]);
      setWpContent(content);
      setWpMedia(media.map((item) => ({ id: item.id, link: item.link, title: item.title })));
    } catch (error) {
      setWpMsg(error instanceof Error ? error.message : "Obsah sa nepodarilo načítať.");
    }
  }

  async function saveWordPressContent(e: FormEvent) {
    e.preventDefault();
    if (!wpSelected) return;
    setWpBusy(true);
    try {
      const result = wpEditor.id
        ? await updateWordPressContent({ data: { ...wpEditor, id: wpSelected, contentId: wpEditor.id } })
        : await createWordPressContent({ data: { ...wpEditor, id: wpSelected } });
      setWpContent((items) => [result, ...items.filter((item) => item.id !== result.id || item.type !== result.type)]);
      setWpEditor({ id: result.id, type: result.type, title: result.title, content: result.content, status: result.status });
      setWpMsg("Obsah bol uložený vo WordPress.");
    } catch (error) {
      setWpMsg(error instanceof Error ? error.message : "Uloženie zlyhalo.");
    } finally {
      setWpBusy(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-5 py-6 sm:px-8">
      <p className="text-xs uppercase tracking-widest text-muted">Workspace</p>
      <h1 className="mt-2 font-serif text-3xl tracking-tight">Nastavenie</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        Lokálne dáta. Žiadny model picker — poskytovateľ sa volí na serveri.
      </p>

      <dl className="mt-8 max-w-lg space-y-4">
        <div className="rounded-3xl border border-border bg-surface p-5">
          <dt className="text-xs uppercase tracking-widest text-subtle">
            Workspace ID
          </dt>
          <dd className="mt-2 break-all font-mono text-xs text-fg">{workspaceId}</dd>
          <Button type="button" variant="outline" className="mt-4" onClick={() => void copyId()}>
            {copied ? "Skopírované" : "Kopírovať ID"}
          </Button>
        </div>
        {locked ? (
          <div className="rounded-3xl border border-border bg-surface p-5">
            <dt className="text-xs uppercase tracking-widest text-subtle">
              Prístup k generate
            </dt>
            <dd className="mt-2 text-sm leading-relaxed text-muted">
              Workspace je uzamknutý. Token sa overí na serveri a uloží ako
              httpOnly cookie — nie do JavaScriptu.
            </dd>
            <form className="mt-4 space-y-3" onSubmit={(e) => void redeem(e)}>
              <label className="sr-only" htmlFor="access-token">
                Prístupový token
              </label>
              <input
                id="access-token"
                type="password"
                autoComplete="off"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-fg placeholder:text-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                placeholder="Invite / access token"
              />
              <Button type="submit" disabled={!token.trim()}>
                Uložiť prístup
              </Button>
            </form>
            {accessMsg ? <p className="mt-2 text-xs text-muted">{accessMsg}</p> : null}
          </div>
        ) : null}
        <div className="rounded-3xl border border-border bg-surface p-5">
          <dt className="text-xs uppercase tracking-widest text-subtle">WordPress</dt>
          {!authEnabled ? (
            <dd className="mt-2 text-sm leading-relaxed text-muted">
              Pre pripojenie WordPressu sa najprv prihlás. Zapnite autentifikáciu v konfigurácii aplikácie — nikdy nepoužívame zdieľaného vývojového používateľa.
            </dd>
          ) : !user ? (
            <dd className="mt-2 text-sm leading-relaxed text-muted">
              Pre pripojenie WordPressu sa najprv prihlás.{" "}
              <Link className="text-accent underline-offset-4 hover:underline" to="/login">Prihlásiť sa</Link>
            </dd>
          ) : (
            <>
              <dd className="mt-2 text-sm leading-relaxed text-muted">
                Bezpečné HTTPS pripojenie. Použite aplikačné heslo WordPressu; tajné údaje sa do prehliadača nikdy nevracajú.
              </dd>
              <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(e) => void connectWordPress(e)}>
                <label className="text-xs text-muted sm:col-span-2">
                  Adresa webu
                  <input required type="url" value={wpSiteUrl} onChange={(e) => setWpSiteUrl(e.target.value)} placeholder="https://example.com" className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50" />
                </label>
                <label className="text-xs text-muted">
                  Používateľ
                  <input required autoComplete="username" value={wpUsername} onChange={(e) => setWpUsername(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50" />
                </label>
                <label className="text-xs text-muted">
                  Aplikačné heslo
                  <input required type="password" autoComplete="current-password" value={wpPassword} onChange={(e) => setWpPassword(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50" />
                </label>
                <label className="text-xs text-muted sm:col-span-2">
                  Názov (voliteľné)
                  <input value={wpLabel} onChange={(e) => setWpLabel(e.target.value)} placeholder="Môj blog" className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50" />
                </label>
                <Button type="submit" disabled={wpBusy || !wpSiteUrl || !wpUsername || !wpPassword}>
                  {wpBusy ? "Overujem…" : "Pripojiť WordPress"}
                </Button>
              </form>
              {wpSites.length ? (
                <ul className="mt-5 space-y-2">
                  {wpSites.map((site) => (
                    <li key={site.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 text-sm">
                      <span className="min-w-0">
                        <strong className="block truncate">{site.label || site.siteUrl}</strong>
                        <span className="text-xs text-muted">{site.username} · heslo uložené šifrovane</span>
                      </span>
                      <span className="flex gap-2">
                        <Button type="button" variant="outline" onClick={() => void testWordPressConnection({ data: { id: site.id } }).then(() => setWpMsg("Spojenie funguje.")).catch((e) => setWpMsg(e instanceof Error ? e.message : "Test zlyhal."))}>Testovať</Button>
                        <Button type="button" variant="outline" onClick={() => { if (window.confirm("Odpojiť tento WordPress?")) void deleteWordPressConnection({ data: { id: site.id } }).then(() => setWpSites((items) => items.filter((item) => item.id !== site.id))); }}>Odpojiť</Button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              {wpSites.length ? (
                <div className="mt-6 border-t border-border pt-5">
                  <label className="text-xs text-muted">Aktívny web
                    <select value={wpSelected} onChange={(e) => void loadWordPressData(e.target.value)} className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-fg">
                      <option value="">Vyberte pripojenie</option>
                      {wpSites.map((site) => <option key={site.id} value={site.id}>{site.label || site.siteUrl}</option>)}
                    </select>
                  </label>
                  {wpSelected ? (
                    <>
                      <form className="mt-4 grid gap-3" onSubmit={(e) => void saveWordPressContent(e)}>
                        <div className="flex gap-2">
                          <select value={wpEditor.type} onChange={(e) => setWpEditor((v) => ({ ...v, type: e.target.value as "post" | "page", id: 0 }))} className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-fg"><option value="post">Príspevok</option><option value="page">Stránka</option></select>
                          <select value={wpEditor.status} onChange={(e) => setWpEditor((v) => ({ ...v, status: e.target.value }))} className="h-10 rounded-xl border border-border bg-card px-3 text-sm text-fg"><option value="draft">Koncept</option><option value="publish">Publikovať</option></select>
                        </div>
                        <input value={wpEditor.title} onChange={(e) => setWpEditor((v) => ({ ...v, title: e.target.value }))} placeholder="Nadpis" required className="h-11 rounded-xl border border-border bg-card px-3 text-sm text-fg" />
                        <textarea value={wpEditor.content} onChange={(e) => setWpEditor((v) => ({ ...v, content: e.target.value }))} placeholder="Obsah (HTML alebo text)" rows={6} className="rounded-xl border border-border bg-card p-3 text-sm text-fg" />
                        <Button type="submit" disabled={wpBusy}>{wpBusy ? "Ukladám…" : wpEditor.id ? "Aktualizovať" : "Vytvoriť vo WordPress"}</Button>
                      </form>
                      <div className="mt-4 grid gap-2">
                        {wpContent.map((item) => <div key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 text-sm">
                          <button type="button" className="min-w-0 truncate text-left" onClick={() => setWpEditor({ id: item.id, type: item.type, title: item.title, content: item.content, status: item.status === "publish" ? "publish" : "draft" })}><span className="block truncate">{item.title || "(bez názvu)"}</span><span className="text-xs text-muted">{item.type === "post" ? "Príspevok" : "Stránka"} · {item.status}</span></button>
                          <Button type="button" variant="outline" onClick={() => void deleteWordPressContent({ data: { id: wpSelected, type: item.type, contentId: item.id } }).then(() => setWpContent((items) => items.filter((x) => x.id !== item.id || x.type !== item.type)))}>Zmazať</Button>
                        </div>)}
                      </div>
                      <div className="mt-5">
                        <p className="text-xs uppercase tracking-widest text-subtle">Médiá</p>
                        <label className="mt-2 inline-flex cursor-pointer rounded-xl border border-border px-3 py-2 text-sm text-muted">Nahrať súbor
                          <input type="file" accept="image/*" className="sr-only" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; void compressWordPressImage(file).then((compressed) => uploadWordPressMedia({ data: { id: wpSelected, filename: compressed.filename, mimeType: compressed.mimeType, contentBase64: compressed.contentBase64 } })).then(() => loadWordPressData(wpSelected)).catch((error) => setWpMsg(error instanceof Error ? error.message : "Nahrávanie zlyhalo.")); }} />
                        </label>
                        <div className="mt-2 flex flex-wrap gap-2">{wpMedia.map((media) => <a key={media.id} href={media.link ?? "#"} target="_blank" rel="noreferrer" className="rounded-lg border border-border px-2 py-1 text-xs text-muted">{media.title || `Médium #${media.id}`}</a>)}</div>
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
              {wpMsg ? <p className="mt-3 text-xs text-muted" role="status">{wpMsg}</p> : null}
            </>
          )}
        </div>
        <div className="rounded-3xl border border-border bg-surface p-5">
          <dt className="text-xs uppercase tracking-widest text-subtle">Úložisko</dt>
          <dd className="mt-2 text-sm leading-relaxed text-muted">
            Projekty, promty a blueprinty sú v tomto prehliadači. Vymazanie
            nenávratne zmaže lokálny stav.
          </dd>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={() => {
              if (window.confirm("Vymazať lokálne projekty, promty a blueprinty?")) {
                clearLocal();
              }
            }}
          >
            Vymazať lokálne dáta
          </Button>
        </div>
      </dl>
    </div>
  );
}
