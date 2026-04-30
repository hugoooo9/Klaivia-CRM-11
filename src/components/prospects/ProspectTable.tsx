// Tableau des prospects — tri, inline edit du statut, bulk select + actions en masse
"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowUpDown, ChevronRight, Eye, Check, Trash2, Clock, X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { UrgencyDot } from "./UrgencyDot";
import { ScoreDots } from "./ScoreDots";
import { NextStepCell } from "./NextStepCell";
import {
  advanceProspectStatut, changeProspectStatut,
  bulkChangeStatut, bulkDeleteProspects, bulkSnooze,
} from "@/actions/prospects";
import {
  STATUTS_PROSPECT, type StatutProspect, type Urgence,
} from "@/lib/constants";

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
  budgetEstime: number | null;
  setupEstime: number | null;
  notes: string | null;
  source: string;
};

const COLUMNS: { key: string; label: string; sortable: boolean }[] = [
  { key: "_", label: "", sortable: false },
  { key: "nom", label: "Prospect", sortable: true },
  { key: "secteur", label: "Secteur", sortable: true },
  { key: "canal", label: "Canal", sortable: true },
  { key: "statut", label: "Statut", sortable: true },
  { key: "urgence", label: "Urgence", sortable: true },
  { key: "score", label: "Score", sortable: true },
  { key: "prochainStep", label: "Prochain step", sortable: true },
  { key: "packInteret", label: "Pack", sortable: false },
  { key: "notes", label: "Notes", sortable: false },
  { key: "actions", label: "", sortable: false },
];

export function ProspectTable({ prospects }: { prospects: Prospect[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const sort = searchParams.get("sort") || "prochainStep";
  const dir = (searchParams.get("dir") || "asc") as "asc" | "desc";

  const toggleSort = (key: string) => {
    const newDir = sort === key && dir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", key);
    params.set("dir", newDir);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allOnPageChecked =
    prospects.length > 0 && prospects.every((p) => selected.has(p.id));
  const toggleAll = () => {
    if (allOnPageChecked) {
      setSelected((prev) => {
        const next = new Set(prev);
        prospects.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        prospects.forEach((p) => next.add(p.id));
        return next;
      });
    }
  };

  const clearSelection = () => setSelected(new Set());

  const onAdvance = (id: string, name: string) => {
    startTransition(async () => {
      try {
        const updated = await advanceProspectStatut(id);
        toast.success(`${name} → ${updated.statut}`);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur avancement");
      }
    });
  };

  // Édition inline du statut (sans ouvrir la fiche)
  const onInlineStatut = (id: string, statut: StatutProspect) => {
    startTransition(async () => {
      try {
        await changeProspectStatut(id, statut);
        toast.success(`Statut → ${statut}`);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  // ---- Bulk actions ----
  const onBulkStatut = (statut: StatutProspect) => {
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        const { count } = await bulkChangeStatut(ids, statut);
        toast.success(`${count} prospect${count > 1 ? "s" : ""} → ${statut}`);
        clearSelection();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };
  const onBulkSnooze = (days: number) => {
    const ids = Array.from(selected);
    startTransition(async () => {
      try {
        const { count } = await bulkSnooze(ids, days);
        toast.success(`${count} prospect${count > 1 ? "s" : ""} reporté${count > 1 ? "s" : ""} +${days}j`);
        clearSelection();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };
  const onBulkDelete = () => {
    const ids = Array.from(selected);
    if (!confirm(`Supprimer ${ids.length} prospect(s) ? Cette action est définitive.`)) return;
    startTransition(async () => {
      try {
        const { count } = await bulkDeleteProspects(ids);
        toast.success(`${count} prospect${count > 1 ? "s" : ""} supprimé${count > 1 ? "s" : ""}`);
        clearSelection();
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  if (prospects.length === 0) {
    return (
      <div className="klaivia-card p-12 text-center text-sm text-muted-foreground">
        Aucun prospect ne correspond aux filtres actuels.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Barre d'actions en masse — apparaît quand ≥ 1 sélectionné */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[color:var(--color-klaivia-violet)]/30 bg-[color:var(--color-klaivia-violet-pale)] px-3 py-2">
          <span className="text-sm font-medium text-[color:var(--color-klaivia-violet)]">
            {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
          </span>
          <div className="mx-2 h-4 w-px bg-[color:var(--color-klaivia-violet)]/30" />

          <Select onValueChange={(v) => v && onBulkStatut(v as StatutProspect)}>
            <SelectTrigger className="h-7 w-auto gap-1 border-[color:var(--color-klaivia-violet)]/30 bg-card text-xs">
              Changer statut…
            </SelectTrigger>
            <SelectContent>
              {STATUTS_PROSPECT.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onBulkSnooze(3)}>
            <Clock className="size-3" /> +3j
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onBulkSnooze(7)}>
            <Clock className="size-3" /> +7j
          </Button>

          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs text-[color:var(--color-klaivia-red)] hover:bg-rose-50"
            onClick={onBulkDelete}
          >
            <Trash2 className="size-3" /> Supprimer
          </Button>

          <button
            type="button"
            onClick={clearSelection}
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            title="Annuler la sélection"
          >
            <X className="size-3" /> Tout désélectionner
          </button>
        </div>
      )}

      <div className="klaivia-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">
                <Checkbox checked={allOnPageChecked} onChange={toggleAll} />
              </TableHead>
              {COLUMNS.slice(1).map((col) => (
                <TableHead
                  key={col.key}
                  className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {col.sortable ? (
                    <button
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {col.label}
                      <ArrowUpDown className={`size-3 ${sort === col.key ? "text-[color:var(--color-klaivia-violet)]" : "opacity-40"}`} />
                    </button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {prospects.map((p) => {
              const isChecked = selected.has(p.id);
              return (
                <TableRow
                  key={p.id}
                  className={`border-border transition-colors hover:bg-muted/50 ${
                    isChecked ? "bg-[color:var(--color-klaivia-violet-pale)]/40" : ""
                  } ${isPending ? "opacity-60" : ""}`}
                >
                  <TableCell>
                    <Checkbox checked={isChecked} onChange={() => toggleOne(p.id)} />
                  </TableCell>
                  <TableCell>
                    <Link href={`/prospects/${p.id}`} className="group flex items-center gap-3">
                      <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold text-white shadow-sm ring-1 ring-inset ring-white/20 transition-transform group-hover:scale-105"
                        style={{
                          background:
                            "linear-gradient(135deg, var(--color-klaivia-violet) 0%, var(--color-klaivia-violet-light) 100%)",
                        }}
                      >
                        {(p.entreprise?.[0] ?? p.prenom?.[0] ?? "?").toUpperCase()}
                      </div>
                      <div className="flex flex-col leading-tight">
                        <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-[color:var(--color-klaivia-violet)]">
                          {p.entreprise ?? "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {[
                            [p.prenom, p.nom].filter((s) => s && s !== "—").join(" ").trim(),
                            p.ville,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </span>
                      </div>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">{p.secteur}</TableCell>
                  <TableCell className="text-sm">{p.canal}</TableCell>
                  {/* Statut éditable inline via Select */}
                  <TableCell>
                    <Select
                      value={p.statut}
                      onValueChange={(v) => v && onInlineStatut(p.id, v as StatutProspect)}
                    >
                      <SelectTrigger className="h-auto border-0 bg-transparent p-0 hover:opacity-80 focus:ring-0 [&>svg]:hidden">
                        <StatusBadge statut={p.statut as StatutProspect} />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUTS_PROSPECT.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><UrgencyDot urgence={p.urgence as Urgence} /></TableCell>
                  <TableCell><ScoreDots score={p.score} /></TableCell>
                  <TableCell><NextStepCell date={p.prochainStep} /></TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.packInteret ?? "—"}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                    {p.notes ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/prospects/${p.id}`}
                        title="Voir"
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Eye className="size-4" />
                      </Link>
                      <button
                        onClick={() => onAdvance(p.id, p.entreprise ?? `${p.prenom} ${p.nom}`)}
                        title="Avancer au statut suivant"
                        className="rounded p-1.5 text-muted-foreground hover:bg-[color:var(--color-klaivia-violet-pale)] hover:text-[color:var(--color-klaivia-violet)] disabled:opacity-40"
                        disabled={p.statut === "Signé" || p.statut === "Perdu" || isPending}
                      >
                        <ChevronRight className="size-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// Checkbox custom léger — évite de dépendre d'un composant shadcn si absent
function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex size-4 items-center justify-center rounded border transition-colors ${
        checked
          ? "border-[color:var(--color-klaivia-violet)] bg-[color:var(--color-klaivia-violet)] text-white"
          : "border-border bg-card hover:border-[color:var(--color-klaivia-violet)]"
      }`}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && <Check className="size-3" strokeWidth={3} />}
    </button>
  );
}
