import { GruppaArchitectureDiagram } from "@/components/cms/GruppaArchitectureDiagram";
import { Button } from "@/components/ui/button";
import { authEnabled } from "@/lib/auth/client";
import { RedirectToSignIn } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  createWordPressContent,
  deleteWordPressContent,
  exportToWordPress,
  listWordPressConnections,
  listWordPressContent,
  listWordPressMedia,
  syncGruppaTaxonomyToWordPress,
  uploadWordPressMedia,
  type WordPressConnection,
  type WordPressContent,
} from "@/lib/wordpress";
import { compressWordPressImage } from "@/lib/wordpress-media";
import { GRUPPA_DEFAULT_TAXONOMIES, GRUPPA_DEFAULT_TERMS } from "@/lib/wordpress/gruppa-schema";
import { useStudioStore } from "@/stores/studio-store";
import { Link } from "@tanstack/react-router";
import { Database, FileText, Globe, Image, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";

type Tab = "posts" | "pages" | "media" | "gruppa";

export function WordPressView() {
  const html = useStudioStore((s) => s.html);
  const title = useStudioStore((s) => s.title);
  const { user, isPending } = useCurrentUserState();
  const [connections, setConnections] = useState<WordPressConnection[]>([]);
  const [connectionId, setConnectionId] = useState("");
  const [tab, setTab] = useState<Tab>("posts");
  const [items, setItems] = useState<WordPressContent[]>([]);
  const [media, setMedia] = useState<Array<{ id: number; link: string | null; title: string }>>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<WordPressContent | null>(null);
  const [editor, setEditor] = useState({ title: "", slug: "", excerpt: "", content: "", status: "draft", featuredMedia: null as number | null });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async (id = connectionId, nextTab = tab) => {
    if (!id) return;
    setBusy(true);
    setMessage(null);
    try {
      if (nextTab === "media") {
        setMedia(await listWordPressMedia({ data: { id } }));
      } else {
        setItems(await listWordPressContent({ data: { id, type: nextTab === "posts" ? "post" : "page", status, search, page, perPage: 20 } }));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "WordPress sa nepodarilo načítať.");
    } finally {
      setBusy(false);
    }
  }, [connectionId, page, search, status, tab]);

  useEffect(() => {
    if (!authEnabled || !user?.id || isPending) return;
    void listWordPressConnections()
      .then((sites) => {
        setConnections(sites);
        if (sites[0]) {
          setConnectionId(sites[0].id);
          void refresh(sites[0].id, tab);
        }
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Prihlásenie je potrebné."));
  }, [isPending, refresh, tab, user?.id]);

  const filtered = useMemo(
    () => items.filter((item) => item.title.toLocaleLowerCase("sk").includes(search.toLocaleLowerCase("sk"))),
    [items, search],
  );

  if (isPending) {
    return <EmptyState title="Overujem prihlásenie" detail="Načítavam bezpečnú reláciu." />;
  }
  if (authEnabled && !user) {
    return <RedirectToSignIn />;
  }
  if (!authEnabled) {
    return <EmptyState title="Pre pripojenie WordPressu sa najprv prihlás" detail="Zapnite autentifikáciu, aby boli WordPress credentials oddelené podľa používateľa." />;
  }
  if (!connections.length) {
    return (
      <EmptyState
        title="Pripoj svoj WordPress web"
        detail="Spravuj články, stránky a médiá priamo z Cosy."
        action={<Link className="text-accent underline-offset-4 hover:underline" to="/settings">Prejsť do Nastavenia</Link>}
      />
    );
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!connectionId || !editor.title.trim()) return;
    setBusy(true);
    try {
      if (selected) {
        const { updateWordPressContent } = await import("@/lib/wordpress");
        await updateWordPressContent({ data: { id: connectionId, type: selected.type, contentId: selected.id, ...editor } });
        setMessage("Obsah aktualizovaný");
      } else {
        await createWordPressContent({ data: { id: connectionId, type: tab === "pages" ? "page" : "post", ...editor } });
        setMessage(editor.status === "publish" ? "Obsah publikovaný" : "Koncept uložený");
      }
      setSelected(null);
      setEditor({ title: "", slug: "", excerpt: "", content: "", status: "draft", featuredMedia: null });
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Uloženie zlyhalo.");
    } finally {
      setBusy(false);
    }
  }

  async function exportProject() {
    if (!html || !connectionId) return;
    setBusy(true);
    try {
      await exportToWordPress({ data: { id: connectionId, type: "post", title, content: html, publish: false } });
      setMessage("Projekt bol uložený ako koncept vo WordPress.");
      await refresh(connectionId, "posts");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export zlyhal.");
    } finally {
      setBusy(false);
    }

  }

  async function uploadMedia(file: File) {
      if (!connectionId || !file.type.startsWith("image/") || file.size > 15 * 1024 * 1024) {
        setMessage("Povolené sú iba obrázky do 15 MB pred kompresiou.");
        return;
      }
      setBusy(true);
      try {
        const compressed = await compressWordPressImage(file);
        await uploadWordPressMedia({ data: { id: connectionId, filename: compressed.filename, mimeType: compressed.mimeType, contentBase64: compressed.contentBase64 } });
        const savedPercent = Math.max(0, Math.round((1 - compressed.compressedBytes / compressed.originalBytes) * 100));
        setMessage(`Médium nahrané ako WebP${savedPercent > 0 ? ` (ušetrených ${savedPercent} %)` : ""}`);
        await refresh(connectionId, "media");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Nahrávanie zlyhalo.");
      } finally {
        setBusy(false);
      }
    }

  async function handleSyncGruppa() {
    if (!connectionId) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await syncGruppaTaxonomyToWordPress({
        data: {
          id: connectionId,
          taxonomies: GRUPPA_DEFAULT_TAXONOMIES,
          terms: GRUPPA_DEFAULT_TERMS,
        },
      });
      if (result.ok) {
        setMessage(`Úspešne synchronizovaných ${result.syncedTaxonomies} taxonómií a ${result.syncedTerms} termov priamo do JetEngine CCT.`);
      } else {
        setMessage(`Synchronizácia dokončená s chybami: ${result.errors.join("; ")}`);
      }
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Synchronizácia JetEngine CCT zlyhala.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto px-5 py-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 rounded-3xl border border-border bg-surface p-5 sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Connector</p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight">WordPress</h1>
            <p className="mt-2 text-sm text-muted">Články, stránky a médiá bezpečne z jedného workspace.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={connectionId} onChange={(event) => { setConnectionId(event.target.value); void refresh(event.target.value); }} className="h-11 rounded-xl border border-border bg-card px-3 text-sm">
              {connections.map((site) => <option key={site.id} value={site.id}>{site.label || site.siteUrl}</option>)}
            </select>
            <Button type="button" variant="outline" onClick={() => void refresh()} disabled={busy}><RefreshCw className="size-4" /> Obnoviť</Button>
            <Button type="button" onClick={() => void exportProject()} disabled={!html || busy}><Globe className="size-4" /> Exportovať projekt</Button>
          </div>
        </div>
        {message ? <p role="status" className="mt-4 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-muted">{message}</p> : null}
        <div className="mt-6 flex flex-wrap gap-2 border-b border-border">
          {([["posts", "Články", FileText], ["pages", "Stránky", FileText], ["media", "Médiá", Image], ["gruppa", "Gruppa CMS (CCT)", Database]] as const).map(([value, label, Icon]) => (
            <button key={value} type="button" onClick={() => { setTab(value); if (value !== "gruppa") void refresh(connectionId, value); }} className={`inline-flex min-h-11 items-center gap-2 border-b-2 px-4 text-sm ${tab === value ? "border-accent text-fg" : "border-transparent text-muted"}`}><Icon className="size-4" />{label}</button>
          ))}
        </div>
        {tab === "gruppa" ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card/60 p-4">
              <div>
                <h4 className="font-semibold text-fg">JetEngine CCT 1-Click Synchronizácia</h4>
                <p className="text-xs text-muted">Priamy zápis B05 Taxonomy a B06 Terms schém cez WordPress REST API.</p>
              </div>
              <Button type="button" disabled={busy || !connectionId} onClick={() => void handleSyncGruppa()}>
                <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} /> 1-Click Sync do WordPressu
              </Button>
            </div>
            <GruppaArchitectureDiagram />
          </div>
        ) : tab === "media" ? (
          <div className="mt-5">
            <label className="mb-4 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm hover:border-accent"><Upload className="size-4" /> Nahrať obrázok<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadMedia(file); event.currentTarget.value = ""; }} /></label>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {media.map((item) => <div key={item.id} className="rounded-2xl border border-border bg-surface p-3"><div className="flex h-28 items-center justify-center rounded-xl bg-card">{item.link ? <img src={item.link} alt={item.title} className="max-h-full max-w-full object-contain" /> : <Image className="text-subtle" />}</div><p className="mt-2 truncate text-xs text-muted">{item.title || "Médium"}</p></div>)}
            {!media.length && !busy ? <p className="col-span-full rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">Žiadne médiá.</p> : null}
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_360px]">
            <section>
              <div className="flex flex-wrap gap-2"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Hľadať ${tab === "posts" ? "články" : "stránky"}…`} className="h-11 min-w-52 flex-1 rounded-xl border border-border bg-card px-3 text-sm" /><Button type="button" onClick={() => { setSelected(null);               setEditor({ title: "", slug: "", excerpt: "", content: "", status: "draft", featuredMedia: null }); }}><Plus className="size-4" /> Nový</Button></div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <select aria-label="Filtrovať podľa statusu" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="h-11 rounded-xl border border-border bg-card px-3 text-sm"><option value="all">Všetky statusy</option><option value="publish">Publikované</option><option value="draft">Koncepty</option><option value="pending">Čakajúce</option><option value="private">Súkromné</option></select>
                  </div>
                  <div className="mt-4 space-y-2">{filtered.map((item) => <article key={`${item.type}-${item.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-4"><button type="button" className="min-w-0 text-left" onClick={() => { setSelected(item); setEditor({ title: item.title, slug: item.slug, excerpt: item.excerpt, content: item.content, status: item.status, featuredMedia: item.featuredMedia }); }}><strong className="block truncate">{item.title || "(bez názvu)"}</strong><span className="text-xs text-muted">{item.status} · {item.comments} komentárov · {item.modified ? new Date(item.modified).toLocaleDateString("sk-SK") : "bez dátumu"}</span></button><Button type="button" variant="ghost" size="icon" aria-label="Zmazať obsah" onClick={() => { if (window.confirm("Naozaj chceš zmazať tento obsah?")) void deleteWordPressContent({ data: { id: connectionId, type: item.type, contentId: item.id } }).then(() => void refresh()); }}><Trash2 className="size-4" /></Button></article>)}</div>
                  {!filtered.length && !busy ? <p className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted">Nenašli sa žiadne výsledky.</p> : null}
                  <div className="mt-4 flex justify-between"><Button type="button" variant="outline" disabled={page <= 1 || busy} onClick={() => setPage((value) => value - 1)}>Predchádzajúca</Button><span className="self-center text-sm text-muted">Strana {page}</span><Button type="button" variant="outline" disabled={items.length < 20 || busy} onClick={() => setPage((value) => value + 1)}>Ďalšia</Button></div>
                </section>
            <form onSubmit={(event) => void save(event)} className="rounded-3xl border border-border bg-surface p-5">
              <h2 className="font-semibold">{selected ? "Upraviť obsah" : `Nový ${tab === "posts" ? "článok" : "stránka"}`}</h2>
              <input required value={editor.title} onChange={(event) => setEditor({ ...editor, title: event.target.value })} placeholder="Nadpis" className="mt-4 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm" />
              <input value={editor.slug} onChange={(event) => setEditor({ ...editor, slug: event.target.value })} placeholder="Slug (voliteľné)" className="mt-3 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm" />
              <textarea value={editor.excerpt} onChange={(event) => setEditor({ ...editor, excerpt: event.target.value })} placeholder="Excerpt (voliteľný)" rows={3} className="mt-3 w-full rounded-xl border border-border bg-card p-3 text-sm" />
              <select value={editor.status} onChange={(event) => setEditor({ ...editor, status: event.target.value })} className="mt-3 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm"><option value="draft">Koncept</option><option value="publish">Publikovať</option><option value="pending">Čaká na schválenie</option><option value="private">Súkromné</option></select>
              <textarea value={editor.content} onChange={(event) => setEditor({ ...editor, content: event.target.value })} placeholder="HTML obsah" rows={12} className="mt-3 w-full rounded-xl border border-border bg-card p-3 font-mono text-xs" />
              <div className="mt-3 flex gap-2"><Button type="submit" disabled={busy} onClick={(event) => { if (editor.status === "publish" && !window.confirm("Naozaj chceš publikovať tento obsah na WordPress webe?")) event.preventDefault(); }}>{selected ? "Aktualizovať" : editor.status === "publish" ? "Publikovať" : "Uložiť koncept"}</Button><Button type="button" variant="ghost" onClick={() => { setSelected(null); setEditor({ title: "", slug: "", excerpt: "", content: "", status: "draft", featuredMedia: null }); }}>Zrušiť</Button></div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return <div className="flex h-full items-center justify-center p-6"><div className="max-w-md rounded-3xl border border-dashed border-border bg-surface p-10 text-center"><Globe className="mx-auto size-10 text-accent" /><h1 className="mt-4 font-serif text-2xl">{title}</h1><p className="mt-2 text-sm text-muted">{detail}</p>{action ? <div className="mt-5">{action}</div> : null}</div></div>;
}
