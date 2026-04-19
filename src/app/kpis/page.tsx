// Page KPIs — saisie hebdomadaire + historique
import { Topbar } from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { KPIForm } from "@/components/kpis/KPIForm";
import { KPIHistory } from "@/components/kpis/KPIHistory";

export default async function KPIsPage() {
  const kpis = await db.kPI.findMany({
    orderBy: [{ annee: "desc" }, { semaine: "desc" }],
    take: 20,
  });

  // Calcule l'année + semaine ISO actuelle pour pré-remplir
  const now = new Date();
  const annee = now.getFullYear();
  const semaine = getISOWeek(now);

  // Dernière ligne pour afficher comme "valeurs précédentes" (hint)
  const latest = kpis[0];

  return (
    <>
      <Topbar
        title="Saisir mes KPIs"
        subtitle="Remplis chaque lundi tes chiffres de la semaine passée"
      />
      <div className="p-8 space-y-6">
        <div className="klaivia-card p-5">
          <h3 className="mb-4 text-base font-semibold text-foreground">
            Semaine en cours
          </h3>
          <KPIForm defaultAnnee={annee} defaultSemaine={semaine} latest={latest ?? null} />
        </div>

        <div className="klaivia-card p-5">
          <h3 className="mb-4 text-base font-semibold text-foreground">
            Historique · 20 dernières semaines
          </h3>
          <KPIHistory kpis={kpis.map((k) => ({
            id: k.id,
            annee: k.annee,
            semaine: k.semaine,
            dmEnvoyes: k.dmEnvoyes,
            reponses: k.reponses,
            appels: k.appels,
            demos: k.demos,
            closes: k.closes,
            mrr: k.mrr,
          }))} />
        </div>
      </div>
    </>
  );
}

// Calcul du numéro de semaine ISO
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
