// Palette de commandes globale (Cmd+K / Ctrl+K) — recherche prospects, clients, navigation rapide
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard, Users, Flame, Trophy, LineChart, Plus,
  Mail, Building2,
} from "lucide-react";

type SearchProspect = {
  id: string;
  prenom: string;
  nom: string;
  entreprise: string | null;
  email: string | null;
  statut: string;
};

type SearchClient = {
  id: string;
  prospectId: string;
  prenom: string;
  nom: string;
  entreprise: string | null;
  pack: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prospects: SearchProspect[];
  clients: SearchClient[];
};

export function CommandPalette({ open, onOpenChange, prospects, clients }: Props) {
  const router = useRouter();

  // Raccourci global : Ctrl/Cmd + K ouvre la palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Recherche Klaivia" description="Cherche un prospect, un client ou navigue vers une page">
      <Command>
        <CommandInput placeholder="Rechercher un prospect, un client, une page…" />
        <CommandList>
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => go("/dashboard")}>
              <LayoutDashboard className="size-4" /> Dashboard
            </CommandItem>
            <CommandItem onSelect={() => go("/prospects")}>
              <Users className="size-4" /> Prospects
            </CommandItem>
            <CommandItem onSelect={() => go("/actions-du-jour")}>
              <Flame className="size-4" /> Actions du jour
            </CommandItem>
            <CommandItem onSelect={() => go("/clients")}>
              <Trophy className="size-4" /> Clients actifs
            </CommandItem>
            <CommandItem onSelect={() => go("/kpis")}>
              <LineChart className="size-4" /> Saisir mes KPIs
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          <CommandGroup heading="Actions rapides">
            <CommandItem onSelect={() => go("/prospects?new=1")}>
              <Plus className="size-4" /> Nouveau prospect
            </CommandItem>
          </CommandGroup>

          {prospects.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Prospects">
                {prospects.slice(0, 20).map((p) => (
                  <CommandItem
                    key={p.id}
                    value={`${p.prenom} ${p.nom} ${p.entreprise ?? ""} ${p.email ?? ""}`}
                    onSelect={() => go(`/prospects/${p.id}`)}
                  >
                    <Users className="size-4 text-[color:var(--color-klaivia-orange)]" />
                    <span>{p.prenom} {p.nom}</span>
                    {p.entreprise && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        <Building2 className="mr-1 inline size-3" />
                        {p.entreprise}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">{p.statut}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {clients.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Clients actifs">
                {clients.slice(0, 10).map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`${c.prenom} ${c.nom} ${c.entreprise ?? ""} client`}
                    onSelect={() => go(`/prospects/${c.prospectId}`)}
                  >
                    <Trophy className="size-4 text-[color:var(--color-klaivia-green)]" />
                    <span>{c.prenom} {c.nom}</span>
                    {c.entreprise && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        <Mail className="mr-1 inline size-3" />
                        {c.entreprise}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-[color:var(--color-klaivia-gold)]">{c.pack}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
