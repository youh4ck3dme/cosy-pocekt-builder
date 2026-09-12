import { useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  FileText,
  FolderOpen,
  LayoutDashboard,
  Menu,
  Rocket,
  ScrollText,
  Settings,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/studio", label: "Projekty", icon: FolderOpen },
  { to: "/prompts", label: "Promty", icon: FileText },
  { to: "/blueprints", label: "Blueprinty", icon: ScrollText },
  { to: "/launch", label: "Launch", icon: Rocket },
  { to: "/settings", label: "Nastavenie", icon: Settings },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  return (
    <div
      className="flex h-dvh bg-bg text-fg"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {open ? (
        <button
          type="button"
          aria-label="Zavrieť menu"
          className="fixed inset-0 z-30 bg-canvas/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "z-40 flex w-56 shrink-0 flex-col border-r border-border bg-surface",
          "fixed inset-y-0 left-0 transition-transform duration-200 ease-out lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="inline-flex h-11 items-center font-serif text-lg tracking-tight"
          >
            Cozy
          </Link>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-xl text-muted lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Zavrieť"
          >
            <X className="size-4" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {NAV.map((item) => {
            const active =
              item.to === "/"
                ? pathname === "/"
                : pathname === item.to || pathname.startsWith(`${item.to}/`);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-150",
                  active
                    ? "bg-card text-fg"
                    : "text-muted hover:bg-card/70 hover:text-fg",
                )}
              >
                <item.icon className={cn("size-4", active ? "text-accent" : "")} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 lg:hidden">
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-xl text-fg"
            onClick={() => setOpen(true)}
            aria-label="Otvoriť menu"
          >
            <Menu className="size-5" />
          </button>
          <p className="font-serif text-base tracking-tight">Cozy</p>
        </header>
        <div className="min-h-0 min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
