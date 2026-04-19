// Tableau historique KPI + taux de conversion calculés
"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteKPI } from "@/actions/kpis";
import { fmtCHF } from "@/lib/format";

type KPIRow = {
  id: string;
  annee: number;
  semaine: number;
  dmEnvoyes: number;
  reponses: number;
  appels: number;
  demos: number;
  closes: number;
  mrr: number;
};

export function KPIHistory({ kpis }: { kpis: KPIRow[] }) {
  const [isPending, startTransition] = useTransition();

  if (kpis.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun KPI enregistré pour le moment — commence par saisir la semaine en cours.
      </p>
    );
  }

  const onDelete = (id: string, label: string) => {
    startTransition(async () => {
      try {
        await deleteKPI(id);
        toast.success(`${label} supprimé`);
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Erreur");
      }
    });
  };

  return (
    <div className={`overflow-x-auto ${isPending ? "opacity-60" : ""}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Semaine</th>
            <th className="py-2 pr-3 font-medium">DM</th>
            <th className="py-2 pr-3 font-medium">Réponses</th>
            <th className="py-2 pr-3 font-medium">Taux réponse</th>
            <th className="py-2 pr-3 font-medium">Appels</th>
            <th className="py-2 pr-3 font-medium">Démos</th>
            <th className="py-2 pr-3 font-medium">Closes</th>
            <th className="py-2 pr-3 font-medium">Taux close</th>
            <th className="py-2 pr-3 font-medium">MRR</th>
            <th className="py-2 pr-3 font-medium"></th>
          </tr>
        </thead>
        <tbody>
          {kpis.map((k) => {
            const tauxReponse = k.dmEnvoyes > 0 ? (k.reponses / k.dmEnvoyes) * 100 : 0;
            const tauxClose = k.demos > 0 ? (k.closes / k.demos) * 100 : 0;
            const label = `S${k.semaine}/${k.annee}`;
            return (
              <tr key={k.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 pr-3 font-medium">{label}</td>
                <td className="py-2 pr-3">{k.dmEnvoyes}</td>
                <td className="py-2 pr-3">{k.reponses}</td>
                <td className="py-2 pr-3 text-muted-foreground">{tauxReponse.toFixed(1)}%</td>
                <td className="py-2 pr-3">{k.appels}</td>
                <td className="py-2 pr-3">{k.demos}</td>
                <td className="py-2 pr-3">{k.closes}</td>
                <td className="py-2 pr-3 text-muted-foreground">{tauxClose.toFixed(1)}%</td>
                <td className="py-2 pr-3 text-[color:var(--color-klaivia-green)]">{fmtCHF(k.mrr)}</td>
                <td className="py-2 pr-3 text-right">
                  <Button
                    variant="ghost" size="icon" className="size-7 text-[color:var(--color-klaivia-red)]"
                    onClick={() => onDelete(k.id, label)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
