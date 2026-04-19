// Page liste des prospects — forecast pondéré + vues sauvegardées + table/kanban
import { Topbar } from "@/components/layout/Topbar";
import { db } from "@/lib/db";
import { ProspectsClient } from "@/components/prospects/ProspectsClient";
import type { Prisma } from "@prisma/client";
import {
  PACK_MRR, STATUT_PROBABILITY, type Pack, type StatutProspect,
} from "@/lib/constants";
import { fmtCHF } from "@/lib/format";
import { TrendingUp, Target, Flame, Handshake } from "lucide-react";

type SearchParams = Promise<{
  q?: string;
  secteur?: string;
  canal?: string;
  statut?: string;
  urgence?: string;
  sort?: string;
  dir?: "asc" | "desc";
  view?: string; // vue sauvegardée active
}>;

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  // Construction du where Prisma à partir des searchParams
  const where: Prisma.ProspectWhereInput = {};
  if (sp.secteur && sp.secteur !== "Tous") where.secteur = sp.secteur;
  if (sp.canal && sp.canal !== "Tous") where.canal = sp.canal;
  if (sp.statut && sp.statut !== "Tous") where.statut = sp.statut;
  if (sp.urgence && sp.urgence !== "Tous") where.urgence = sp.urgence;
  if (sp.q) {
    const term = sp.q;
    where.OR = [
      { prenom: { contains: term } },
      { nom: { contains: term } },
      { entreprise: { contains: term } },
      { ville: { contains: term } },
      { email: { contains: term } },
    ];
  }

  const sortField = sp.sort || "prochainStep";
  const sortDir = sp.dir || "asc";
  const orderBy: Prisma.ProspectOrderByWithRelationInput = { [sortField]: sortDir };

  const prospects = await db.prospect.findMany({
    where,
    orderBy,
    select: {
      id: true, prenom: true, nom: true, entreprise: true, ville: true,
      secteur: true, canal: true, statut: true, urgence: true, score: true,
      prochainStep: true, packInteret: true, notes: true,
    },
  });

  // ---- Forecast pondéré : Σ (packMRR × probabilité du statut) sur prospects actifs
  const activePipeline = prospects.filter(
    (p) => p.statut !== "Signé" && p.statut !== "Perdu"
  );
  const weightedForecast = activePipeline.reduce((sum, p) => {
    const pack = (p.packInteret ?? "Growth IA") as Pack;
    const baseMrr = PACK_MRR[pack] ?? PACK_MRR["Growth IA"];
    const prob = STATUT_PROBABILITY[p.statut as StatutProspect] ?? 0;
    return sum + baseMrr * prob;
  }, 0);
  const pipelineValue = activePipeline.reduce((sum, p) => {
    const pack = (p.packInteret ?? "Growth IA") as Pack;
    return sum + (PACK_MRR[pack] ?? PACK_MRR["Growth IA"]);
  }, 0);
  const hotCount = prospects.filter(
    (p) => p.statut === "Négociation" || p.statut === "Démo planifiée"
  ).length;
  const signedCount = prospects.filter((p) => p.statut === "Signé").length;

  const forecastCards = [
    {
      label: "Valeur pipeline",
      value: fmtCHF(pipelineValue),
      hint: `${activePipeline.length} prospects actifs`,
      icon: Target,
      iconBg: "bg-[color:var(--color-klaivia-violet-pale)]",
      iconColor: "text-[color:var(--color-klaivia-violet)]",
    },
    {
      label: "Forecast pondéré",
      value: fmtCHF(weightedForecast),
      hint: "MRR attendu (valeur × proba)",
      icon: TrendingUp,
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Deals chauds",
      value: hotCount,
      hint: "Démo + Négociation",
      icon: Flame,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
    },
    {
      label: "Closes",
      value: signedCount,
      hint: "Déjà signés",
      icon: Handshake,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-600",
    },
  ];

  return (
    <>
      <Topbar
        title="Prospects"
        subtitle={
          prospects.length === 0
            ? "Ton pipeline commercial — vide pour le moment"
            : `${prospects.length} prospect${prospects.length > 1 ? "s" : ""} dans le pipeline`
        }
      />
      <div className="p-8">
        {/* Forecast cards — masquées tant qu'il n'y a aucun prospect */}
        {prospects.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {forecastCards.map(({ label, value, hint, icon: Icon, iconBg, iconColor }) => (
              <div key={label} className="klaivia-card p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                      {label}
                    </span>
                    <div className="mt-1.5 text-2xl font-semibold leading-none tracking-tight text-foreground">
                      {value}
                    </div>
                  </div>
                  <div className={`flex size-8 shrink-0 items-center justify-center rounded-md ${iconBg}`}>
                    <Icon className={`size-4 ${iconColor}`} />
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
              </div>
            ))}
          </div>
        )}

        <ProspectsClient prospects={prospects} />
      </div>
    </>
  );
}
