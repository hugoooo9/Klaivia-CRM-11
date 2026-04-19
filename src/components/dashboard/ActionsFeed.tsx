// Feed des actions du jour sur le dashboard — prospects à relancer aujourd'hui ou en retard
"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Check, Clock, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UrgencyDot } from "@/components/prospects/UrgencyDot";
import { StatusBadge } from "@/components/prospects/StatusBadge";
import { advanceProspectStatut, snoozeProspect } from "@/actions/prospects";
import { stepStatus, fmtRelative } from "@/lib/format";
import type { StatutProspect, Urgence } from "@/lib/constants";

type ActionProspect = {
  id: string;
  prenom: string;
  nom: string;
  entreprise: string | null;
  statut: string;
  urgence: string;
  prochainStep: Date | null;
};

type Props = { prospects: ActionProspect[] };

export function ActionsFeed({ prospects }: Props) {
  const [isPending, startTransition] = useTransition();

  if (prospects.length === 0) {
    return (
      <div className="klaivia-card p-6 text-center text-sm text-muted-foreground">
        <Check className="mx-auto mb-2 size-6 text-[color:var(--color-klaivia-green)]" />
        Rien à relancer aujourd&apos;hui. Profite-en pour prospecter !
      </div>
    );
  }

  const onFait = (id: string, name: string) => {
    startTransition(async () => {
      try {
        await advanceProspectStatut(id);
        toast.success(`${name} avancé`);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  const onSnooze = (id: string, name: string, days: number) => {
    startTransition(async () => {
      try {
        await snoozeProspect(id, days);
        toast.success(`${name} reporté de ${days} jour${days > 1 ? "s" : ""}`);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  return (
    <ul className={`divide-y divide-border ${isPending ? "opacity-60" : ""}`}>
      {prospects.map((p) => {
        const fullName = `${p.prenom} ${p.nom}`;
        const status = stepStatus(p.prochainStep);
        return (
          <li key={p.id} className="flex items-center gap-3 py-3">
            <UrgencyDot urgence={p.urgence as Urgence} />
            <div className="min-w-0 flex-1">
              <Link
                href={`/prospects/${p.id}`}
                className="block truncate text-sm font-medium text-foreground hover:text-[color:var(--color-klaivia-orange)]"
              >
                {fullName}
                {p.entreprise && (
                  <span className="ml-1 text-xs text-muted-foreground">· {p.entreprise}</span>
                )}
              </Link>
              <div className="mt-1 flex items-center gap-2">
                <StatusBadge statut={p.statut as StatutProspect} />
                {p.prochainStep && (
                  <span
                    className={`text-xs ${
                      status === "overdue"
                        ? "text-[color:var(--color-klaivia-red)]"
                        : status === "today"
                        ? "text-[color:var(--color-klaivia-gold)]"
                        : "text-muted-foreground"
                    }`}
                  >
                    {status === "overdue" && "En retard · "}
                    {status === "today" && "Aujourd'hui · "}
                    {fmtRelative(p.prochainStep)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => onFait(p.id, fullName)}
                title="Marquer comme fait et avancer le statut"
              >
                <Check className="size-3" /> Fait
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => onSnooze(p.id, fullName, 3)}
                title="Reporter de 3 jours"
              >
                <Clock className="size-3" /> +3j
              </Button>
              <Link
                href={`/prospects/${p.id}`}
                className="ml-1 inline-flex size-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                title="Voir la fiche"
              >
                <ChevronRight className="size-3.5" />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
