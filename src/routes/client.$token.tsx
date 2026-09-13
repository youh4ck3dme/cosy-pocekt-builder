import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, LockKeyhole, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  decideClientApproval,
  openClientApproval,
  type ClientApprovalPreview,
} from "@/lib/client-approvals";
import { LivePreview } from "@/components/studio/LivePreview";

export const Route = createFileRoute("/client/$token")({
  component: ClientApprovalPage,
  ssr: false,
  head: () => ({ meta: [{ title: "Klientske schvalenie - Cozy" }] }),
});

function ClientApprovalPage() {
  const { token } = Route.useParams();
  const [pin, setPin] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState<ClientApprovalPreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function open(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const result = await openClientApproval({ data: { token, pin } });
      setPreview(result);
    } finally {
      setBusy(false);
    }
  }

  async function decide(decision: "approved" | "rejected") {
    setBusy(true);
    setMessage(null);
    try {
      const result = await decideClientApproval({ data: { token, pin, decision, note } });
      if (result.ok) {
        setMessage(decision === "approved" ? "Verzia je schvalena." : "Pripomienka je ulozena.");
        const next = await openClientApproval({ data: { token, pin } });
        setPreview(next);
      } else {
        setPreview(result);
      }
    } finally {
      setBusy(false);
    }
  }

  const opened = preview?.ok ? preview : null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-bg text-fg">
      <header className="flex min-h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4">
        <p className="font-serif text-base tracking-tight">Cosy client review</p>
        {opened ? <p className="truncate text-xs text-muted">{opened.contentHash.slice(0, 12)}</p> : null}
      </header>

      {!opened ? (
        <main className="grid min-h-0 flex-1 place-items-center p-5">
          <form className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5" onSubmit={(e) => void open(e)}>
            <span className="flex size-10 items-center justify-center rounded-xl bg-card text-accent">
              <LockKeyhole className="size-5" />
            </span>
            <h1 className="mt-4 font-serif text-2xl tracking-tight">Vstup pre klienta</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Zadajte 6-miestny PIN od studia. Link aj PIN je mozne kedykolvek zrusit vytvorenim novej verzie.
            </p>
            <label className="mt-5 block text-xs uppercase tracking-widest text-subtle" htmlFor="client-pin">
              PIN
            </label>
            <input
              id="client-pin"
              value={pin}
              onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              className="mt-2 h-11 w-full rounded-xl border border-border bg-card px-3 text-center font-mono text-lg tracking-widest text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              placeholder="000000"
            />
            {preview && !preview.ok ? <p className="mt-3 text-sm text-muted">{preview.error}</p> : null}
            <Button className="mt-5 w-full" type="submit" disabled={pin.length !== 6 || busy}>
              {busy ? "Overujem..." : "Otvorit nahlad"}
            </Button>
          </form>
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_22rem] lg:grid-rows-1">
          <section className="min-h-0 bg-canvas">
            <LivePreview html={opened.html} title={opened.title} />
          </section>
          <aside className="border-t border-border bg-surface p-4 lg:border-l lg:border-t-0">
            <p className="text-xs uppercase tracking-widest text-subtle">Verzia na schvalenie</p>
            <h1 className="mt-2 font-serif text-2xl tracking-tight">{opened.title}</h1>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Platne do {new Date(opened.expiresAt).toLocaleString("sk-SK")}. Schvalenie sa vztahuje iba na tuto presnu verziu.
            </p>
            {opened.approvedAt ? (
              <p className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-accent">
                <CheckCircle2 className="size-4" /> Schvalene
              </p>
            ) : opened.rejectedAt ? (
              <p className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm text-muted">
                <XCircle className="size-4" /> Vratene na upravu
              </p>
            ) : null}
            <label className="mt-5 block text-xs uppercase tracking-widest text-subtle" htmlFor="client-note">
              Poznamka
            </label>
            <textarea
              id="client-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={4}
              className="mt-2 w-full resize-none rounded-xl border border-border bg-card px-3 py-2 text-sm text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              placeholder="Co upravit, alebo kratke potvrdenie..."
            />
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <Button type="button" disabled={busy} onClick={() => void decide("approved")}>
                <CheckCircle2 className="size-4" /> Schvalit verziu
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => void decide("rejected")}>
                <XCircle className="size-4" /> Poslat pripomienku
              </Button>
            </div>
            {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
          </aside>
        </main>
      )}
    </div>
  );
}
