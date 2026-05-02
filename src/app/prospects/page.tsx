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
      prochainStep: true, packInteret: true, budgetEstime: true, setupEstime: true,
      notes: true, source: true,
    },
  });

  // ---- Forecast pondéré : Σ (MRR × probabilité du statut) sur prospects actifs
  // MRR par prospect = budgetEstime saisi (>0) sinon PACK_MRR du pack d'intérêt
  // Setup par prospect = setupEstime saisi (sinon 0 — variable selon scope client)
  const activePipeline = prospects.filter(
    (p) => p.statut !== "Signé" && p.statut !== "Perdu"
  );
  const mrrFor = (p: (typeof prospects)[number]): number => {
    if (p.budgetEstime && p.budgetEstime > 0) return p.budgetEstime;
    const pack = (p.packInteret ?? "Pack Agent IA") as Pack;
    return PACK_MRR[pack] ?? PACK_MRR["Pack Agent IA"];
  };
  const weightedForecast = activePipeline.reduce((sum, p) => {
    const prob = STATUT_PROBABILITY[p.statut as StatutProspect] ?? 0;
    return sum + mrrFor(p) * prob;
  }, 0);
  // Revenu annuel potentiel (non pondéré) = Σ (setup + MRR × 12) si tous signent
  const annualForecast = activePipeline.reduce((sum, p) => {
    const setup = p.setupEstime ?? 0;
    return sum + (setup + mrrFor(p) * 12);
  }, 0);
  const hotCount = prospects.filter(
    (p) => p.statut === "Négociation" || p.statut === "Démo planifiée"
  ).length;
  const signedCount = prospects.filter((p) => p.statut === "Signé").length;

  const forecastCards = [
    {
      label: "Bénéfice/mois espéré",
      value: fmtCHF(weightedForecast),
      hint: `${activePipeline.length} prospects actifs · pondéré`,
      icon: Target,
      iconBg: "bg-[color:var(--color-klaivia-violet-pale)]",
      iconColor: "text-[color:var(--color-klaivia-violet)]",
    },
    {
      label: "Revenu/an si tous signent",
      value: fmtCHF(annualForecast),
      hint: "Σ (setup + MRR × 12)",
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
              <div key={label} className="klaivia-card-elevated p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      {label}
                    </span>
                    <div className="mt-2 text-[26px] font-bold leading-none tracking-tight text-foreground tabular-nums">
                      {value}
                    </div>
                    <div className="mt-2 text-[11px] leading-tight text-muted-foreground">
                      {hint}
                    </div>
                  </div>
                  <div className={`flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-black/5 ${iconBg}`}>
                    <Icon className={`size-[18px] ${iconColor}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <ProspectsClient prospects={prospects} />
      </div>
    </>
  );
}
