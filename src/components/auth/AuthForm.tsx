import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { authClient, authEnabled } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";

type AuthMode = "login" | "register";

function errorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/invalid|credential|password|user|email/i.test(message)) {
    return "Prihlásenie sa nepodarilo. Skontroluj údaje a skús to znova.";
  }
  if (/already|exist|unique/i.test(message)) {
    return "Účet s týmto e-mailom už existuje.";
  }
  return "Požiadavku sa nepodarilo dokončiť. Skús to znova.";
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const { user, isPending } = useCurrentUserState();
  const [identifier, setIdentifier] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isRegister = mode === "register";

  if (isPending) {
    return <p className="text-sm text-muted">Načítavam reláciu…</p>;
  }
  if (user) {
    return <Navigate to="/" />;
  }
  if (!authEnabled) {
    return (
      <AuthLayout title="Prihlásenie nie je zapnuté">
        <p className="text-sm leading-6 text-muted">
          Pre lokálne alebo produkčné prihlásenie nastav na serveri
          <code className="mx-1 rounded bg-card px-1.5 py-0.5 text-xs text-fg">VITE_AUTH_ENABLED=true</code>
          a nakonfiguruj databázu a auth secret.
        </p>
      </AuthLayout>
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const normalizedIdentifier = identifier.trim().toLowerCase();
    const email = isRegister ? normalizedIdentifier : normalizedIdentifier.includes("@") ? normalizedIdentifier : "";
    const username = !isRegister && !normalizedIdentifier.includes("@") ? normalizedIdentifier : "";
    if (isRegister && !email.includes("@")) {
      setMessage("Zadaj platný e-mail.");
      return;
    }
    if (isRegister && name.trim().length < 3) {
      setMessage("Používateľské meno musí mať aspoň 3 znaky.");
      return;
    }
    if (!isRegister && !email && username.length < 3) {
      setMessage("Zadaj platný e-mail alebo používateľské meno (aspoň 3 znaky).");
      return;
    }
    if (password.length < 8) {
      setMessage("Heslo musí mať aspoň 8 znakov.");
      return;
    }
    if (isRegister && password !== confirmation) {
      setMessage("Heslá sa nezhodujú.");
      return;
    }
    setBusy(true);
    try {
      const result = isRegister
        ? await authClient.signUp.email({
            email,
            password,
            name: name.trim() || email.split("@")[0],
            username: name.trim(),
            callbackURL: "/",
          })
        : username
          ? await authClient.signIn.username({ username, password, callbackURL: "/" })
          : await authClient.signIn.email({ email, password, callbackURL: "/" });
      if (result.error) {
        setMessage(errorMessage(new Error(result.error.message)));
        return;
      }
      window.location.href = "/";
    } catch (error) {
      setMessage(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title={isRegister ? "Vytvoriť účet" : "Prihlásenie"}>
      <form className="space-y-4" onSubmit={submit} noValidate>
        {isRegister ? (
          <label className="block space-y-2 text-sm">
            <span className="text-muted">Používateľské meno</span>
            <input
              required
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            />
          </label>
        ) : null}
        <label className="block space-y-2 text-sm">
          <span className="text-muted">E-mail alebo používateľské meno</span>
          <input
            required
            type="email"
            autoComplete="email"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          />
        </label>
        <label className="block space-y-2 text-sm">
          <span className="text-muted">Heslo</span>
          <input
            required
            minLength={8}
            type="password"
            autoComplete={isRegister ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          />
        </label>
        {isRegister ? (
          <label className="block space-y-2 text-sm">
            <span className="text-muted">Potvrdenie hesla</span>
            <input
              required
              minLength={8}
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-bg px-3 text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            />
          </label>
        ) : null}
        {message ? (
          <p role="alert" className="rounded-xl border border-accent/40 bg-accent/10 px-3 py-2 text-sm text-fg">
            {message}
          </p>
        ) : null}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Spracúvam…" : isRegister ? "Vytvoriť účet" : "Prihlásiť sa"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        {isRegister ? "Už máš účet?" : "Ešte nemáš účet?"}{" "}
        <Link className="text-accent underline-offset-4 hover:underline" to={isRegister ? "/login" : "/register"}>
          {isRegister ? "Prihlásiť sa" : "Vytvoriť účet"}
        </Link>
      </p>
    </AuthLayout>
  );
}

function AuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="grid min-h-full place-items-center px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-border bg-surface p-6 shadow-2xl shadow-black/20 sm:p-8">
        <p className="mb-6 font-serif text-lg tracking-tight">Cozy</p>
        <h1 className="font-serif text-3xl tracking-tight">{title}</h1>
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}
