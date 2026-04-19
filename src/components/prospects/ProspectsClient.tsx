// Container client : vues sauvegardées + filtres + switch table/kanban + bulk actions
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { LayoutGrid, List, Plus, Upload, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SECTEURS, CANAUX, STATUTS_PROSPECT, URGENCES } from "@/lib/constants";
import { ProspectTable } from "./ProspectTable";
import { KanbanView } from "./KanbanView";
import { ProspectForm } from "./ProspectForm";
import { ImportDialog } from "./ImportDialog";

type Prospect = {
  id: string;
  prenom: string;
  nom: string;
  entreprise: string | null;
  ville: string | null;
  secteur: string;
  canal: string;
  statut: string;
  urgence: string;
  score: number;
  prochainStep: Date | null;
  packInteret: string | null;
  notes: string | null;
};

// Vues sauvegardées — chaque vue applique un jeu de filtres côté client uniquement
type SavedView = {
  id: string;
  label: string;
  count?: (all: Prospect[]) => number;
  filter: (p: Prospect) => boolean;
};

const SAVED_VIEWS: SavedView[] = [
  { id: "all", label: "Tous", filter: () => true },
  {
    id: "hot",
    label: "Chauds",
    filter: (p) => p.statut === "Démo planifiée" || p.statut === "Négociation",
  },
  {
    id: "overdue",
    label: "En retard",
    filter: (p) =>
      !!p.prochainStep &&
      p.prochainStep < new Date(new Date().setHours(0, 0, 0, 0)) &&
      p.statut !== "Signé" &&
      p.statut !== "Perdu",
  },
  {
    id: "this-week",
    label: "Cette semaine",
    filter: (p) => {
      if (!p.prochainStep) return false;
      const end = new Date();
      end.setDate(end.getDate() + 7);
      return p.prochainStep <= end;
    },
  },
  {
    id: "high-score",
    label: "Score ≥ 4",
    filter: (p) => p.score >= 4,
  },
  {
    id: "won",
    label: "Signés",
    filter: (p) => p.statut === "Signé",
  },
];

export function ProspectsClient({ prospects }: { prospects: Prospect[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [view, setView] = useState<"table" | "kanban">("table");
  const [searchInput, setSearchInput] = useState(searchParams.get("q") || "");
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [savedViewId, setSavedViewId] = useState<string>(searchParams.get("view") || "all");

  const updateParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "Tous" || value === "") params.delete(key);
    else params.set(key, value);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const onSearch = (val: string) => {
    setSearchInput(val);
    const params = new URLSearchParams(searchParams.toString());
    if (val) params.set("q", val);
    else params.delete("q");
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  // Application de la vue sauvegardée (filtrage côté client après récup DB)
  const currentView = SAVED_VIEWS.find((v) => v.id === savedViewId) ?? SAVED_VIEWS[0];
  const filtered = useMemo(
    () => prospects.filter(currentView.filter),
    [prospects, currentView]
  );

  // Base totalement vide → onboarding avec 3 CTAs clairs
  if (prospects.length === 0 && !searchParams.get("q") && !searchParams.get("secteur") && !searchParams.get("canal") && !searchParams.get("statut") && !searchParams.get("urgence")) {
    return (
      <>
        <div className="klaivia-card flex flex-col items-center p-12 text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-[color:var(--color-klaivia-violet-pale)]">
            <Users className="size-7 text-[color:var(--color-klaivia-violet)]" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Démarre ta prospection</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Tu n&apos;as encore aucun prospect. Ajoute-les un à un, ou importe un fichier existant.
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-[color:var(--color-klaivia-violet)] text-white hover:bg-[color:var(--color-klaivia-violet-light)]"
            >
              <Plus className="size-4" /> Nouveau prospect
            </Button>
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="size-4" /> Importer (CSV, Excel, PDF…)
            </Button>
          </div>
        </div>

        <ProspectForm open={createOpen} onOpenChange={setCreateOpen} />
        <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Onglets vues sauvegardées */}
      <div className="flex items-center gap-1 border-b border-border">
        {SAVED_VIEWS.map((v) => {
          const count = prospects.filter(v.filter).length;
          const active = savedViewId === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => setSavedViewId(v.id)}
              className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "text-[color:var(--color-klaivia-violet)]"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="inline-flex items-center gap-1.5">
                {v.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                    active
                      ? "bg-[color:var(--color-klaivia-violet-pale)] text-[color:var(--color-klaivia-violet)]"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {count}
                </span>
              </span>
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[color:var(--color-klaivia-violet)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Toolbar filtres + switch vue */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
        <Input
          placeholder="Rechercher (nom, entreprise, ville, email…)"
          value={searchInput}
          onChange={(e) => onSearch(e.target.value)}
          className="max-w-xs"
        />

        <Select
          value={searchParams.get("secteur") || "Tous"}
          onValueChange={(v) => updateParam("secteur", v)}
        >
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Secteur" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Tous secteurs</SelectItem>
            {SECTEURS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("canal") || "Tous"}
          onValueChange={(v) => updateParam("canal", v)}
        >
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Canal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Tous canaux</SelectItem>
            {CANAUX.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("statut") || "Tous"}
          onValueChange={(v) => updateParam("statut", v)}
        >
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Statut" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Tous statuts</SelectItem>
            {STATUTS_PROSPECT.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("urgence") || "Tous"}
          onValueChange={(v) => updateParam("urgence", v)}
        >
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Urgence" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Tous">Toutes</SelectItem>
            {URGENCES.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            size="sm"
            onClick={() => setCreateOpen(true)}
            className="bg-[color:var(--color-klaivia-violet)] text-white hover:bg-[color:var(--color-klaivia-violet-light)]"
          >
            <Plus className="size-3.5" /> Nouveau
          </Button>

          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="size-3.5" /> Importer
          </Button>

          <div className="flex rounded-md border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setView("table")}
              className={`rounded px-2 py-1 transition-colors ${view === "table" ? "bg-[color:var(--color-klaivia-violet)] text-white" : "text-muted-foreground hover:text-foreground"}`}
              title="Vue tableau"
            >
              <List className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("kanban")}
              className={`rounded px-2 py-1 transition-colors ${view === "kanban" ? "bg-[color:var(--color-klaivia-violet)] text-white" : "text-muted-foreground hover:text-foreground"}`}
              title="Vue kanban"
            >
              <LayoutGrid className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {view === "table" ? (
        <ProspectTable prospects={filtered} />
      ) : (
        <KanbanView prospects={filtered} />
      )}

      <ProspectForm open={createOpen} onOpenChange={setCreateOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
