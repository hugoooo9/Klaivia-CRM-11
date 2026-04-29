// Topbar — barre de recherche centrale + actions à droite (notifications, CTA)
"use client";

import { HelpCircle, LogOut, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsBell } from "@/components/layout/NotificationsBell";

type Props = {
  title: string;
  subtitle?: string;
  onNewProspect?: () => void;
  onSearch?: () => void;
};

export function Topbar({ title, subtitle, onNewProspect, onSearch }: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-card/95 px-8 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      {/* Titre + sous-titre */}
      <div className="min-w-0">
        <h1 className="truncate text-[22px] font-semibold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      {/* Recherche + actions */}
      <div className="flex flex-1 items-center justify-end gap-2">
        {/* Recherche globale centrée */}
        <button
          type="button"
          onClick={onSearch}
          className="inline-flex w-full max-w-sm items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground shadow-[inset_0_1px_2px_rgba(46,59,78,0.04)] transition-all hover:border-[color:var(--color-klaivia-violet-light)]/50 hover:bg-card hover:text-foreground hover:shadow-sm"
        >
          <Search className="size-4 text-muted-foreground" />
          <span className="flex-1 text-left">Rechercher un contact, un client…</span>
          <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted-foreground">
            Ctrl K
          </kbd>
        </button>

        <button
          type="button"
          className="hidden size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
          title="Aide"
        >
          <HelpCircle className="size-4" />
        </button>

        <NotificationsBell />

        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="hidden size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
            title="Se déconnecter"
          >
            <LogOut className="size-4" />
          </button>
        </form>

        {onNewProspect && (
          <Button
            onClick={onNewProspect}
            className="bg-[color:var(--color-klaivia-orange)] text-white shadow-sm hover:bg-[color:var(--color-klaivia-orange-light)]"
          >
            <Plus className="size-4" />
            Nouveau prospect
          </Button>
        )}
      </div>
    </header>
  );
}
