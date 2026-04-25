// Kanban 7 colonnes (1 par statut). Drag-and-drop = changement de statut.
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import {
  STATUTS_PROSPECT, STATUT_PROBABILITY, PACK_MRR,
  type StatutProspect, type Urgence, type Pack,
} from "@/lib/constants";
import { fmtCHF } from "@/lib/format";
import { UrgencyDot } from "./UrgencyDot";
import { ScoreDots } from "./ScoreDots";
import { NextStepCell } from "./NextStepCell";
import { changeProspectStatut } from "@/actions/prospects";

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
};

// Valeur pondérée d'un prospect = MRR du pack × proba du statut
function weightedValue(p: Prospect): number {
  const pack = (p.packInteret ?? "Growth IA") as Pack;
  const baseMrr = PACK_MRR[pack] ?? PACK_MRR["Growth IA"];
  const prob = STATUT_PROBABILITY[p.statut as StatutProspect] ?? 0;
  return baseMrr * prob;
}

export function KanbanView({ prospects }: { prospects: Prospect[] }) {
  const [, startTransition] = useTransition();

  // Optimistic state : on regroupe localement les prospects par statut
  // Prisma les renverra re-triés au prochain revalidatePath
  const [items, setItems] = useState<Prospect[]>(prospects);
  // Sync si props changent (filtres mis à jour)
  if (items !== prospects && items.length !== prospects.length) {
    setItems(prospects);
  }

  const columns: Record<StatutProspect, Prospect[]> = Object.fromEntries(
    STATUTS_PROSPECT.map((s) => [s, items.filter((p) => p.statut === s)])
  ) as Record<StatutProspect, Prospect[]>;

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const newStatut = destination.droppableId as StatutProspect;
    const prospect = items.find((p) => p.id === draggableId);
    if (!prospect) return;

    // MAJ optimiste
    setItems((prev) => prev.map((p) => (p.id === draggableId ? { ...p, statut: newStatut } : p)));

    startTransition(async () => {
      try {
        await changeProspectStatut(draggableId, newStatut);
        toast.success(`${prospect.entreprise ?? `${prospect.prenom} ${prospect.nom}`} → ${newStatut}`);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur mise à jour");
        // Rollback
        setItems((prev) =>
          prev.map((p) => (p.id === draggableId ? { ...p, statut: prospect.statut } : p))
        );
      }
    });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {STATUTS_PROSPECT.map((statut) => {
          const colProspects = columns[statut];
          return (
            <div
              key={statut}
              className="flex w-[280px] shrink-0 flex-col rounded-lg border border-border bg-muted/40"
            >
              <div className="rounded-t-lg border-b border-border bg-card/60 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
                    {statut}
                  </span>
                  <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                    {colProspects.length}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px]">
                  <span className="text-muted-foreground">
                    {Math.round((STATUT_PROBABILITY[statut] ?? 0) * 100)}% proba
                  </span>
                  <span className="font-semibold text-[color:var(--color-klaivia-violet)]">
                    {fmtCHF(colProspects.reduce((s, p) => s + weightedValue(p), 0))}
                  </span>
                </div>
              </div>

              <Droppable droppableId={statut}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex min-h-[120px] flex-1 flex-col gap-2 p-2 transition-colors ${
                      snapshot.isDraggingOver ? "bg-[color:var(--color-klaivia-orange-pale)]" : ""
                    }`}
                  >
                    {colProspects.map((p, idx) => (
                      <Draggable key={p.id} draggableId={p.id} index={idx}>
                        {(prov, snap) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className={`rounded-md border border-border bg-card p-3 text-xs shadow-sm transition-shadow hover:shadow-md ${
                              snap.isDragging ? "shadow-xl ring-2 ring-[color:var(--color-klaivia-orange)]" : ""
                            }`}
                          >
                            <div className="mb-1.5 flex items-start justify-between gap-2">
                              <Link
                                href={`/prospects/${p.id}`}
                                className="font-semibold text-foreground hover:text-[color:var(--color-klaivia-orange)]"
                              >
                                {p.entreprise ?? "—"}
                              </Link>
                              <UrgencyDot urgence={p.urgence as Urgence} className="mt-1 shrink-0" />
                            </div>
                            {[p.prenom, p.nom].filter((s) => s && s !== "—").join(" ").trim() && (
                              <div className="mb-1.5 truncate text-muted-foreground">
                                {[p.prenom, p.nom].filter((s) => s && s !== "—").join(" ")}
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <span className="rounded bg-muted px-1.5 py-0.5">{p.secteur}</span>
                              <span className="rounded bg-muted px-1.5 py-0.5">{p.canal}</span>
                            </div>
                            <div className="mt-2 flex items-center justify-between">
                              <ScoreDots score={p.score} />
                              <NextStepCell date={p.prochainStep} />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
}
