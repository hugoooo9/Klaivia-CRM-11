// Topbar — barre de recherche centrale + actions à droite (notifications, CTA)
"use client";

import { Bell, HelpCircle, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  subtitle?: string;
  onNewProspect?: () => void;
  onSearch?: () => void;
};

export function Topbar({ title, subtitle, onNewProspect, onSearch }: Props) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-8">
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
          className="inline-flex w-full max-w-sm items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-[color:var(--color-klaivia-gray)] hover:text-foreground"
        >
          <Search className="size-4" />
          <span className="flex-1 text-left">Rechercher un contact, un client…</span>
          <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
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

        <button
          type="button"
          className="relative hidden size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
          title="Notifications"
        >
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-[color:var(--color-klaivia-orange)]" />
        </button>

        {onNewProspect && (
          <Button
            onClick={onNewProspect}
            className="bg-[color:var(--color-klaivia-orange)] text-white shadow-sm hover:bg-[color:var(--color-klaivia-orange-light)]"
          >
            <Plus className="size-4" />
            Nouveau prospect
          </Button>
        )}

        {/* Avatar */}
        <div
          className="ml-1 flex size-9 items-center justify-center rounded-full bg-[color:var(--color-klaivia-navy)] text-sm font-semibold text-white"
          title="Compte"
        >
          EB
        </div>
      </div>
    </header>
  );
}
