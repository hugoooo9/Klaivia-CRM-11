// Agrégations spécifiques au Dashboard (MRR, funnel, répartitions, actions du jour)
import { db } from "@/lib/db";
import { STATUTS_PROSPECT, SECTEURS, CANAUX } from "@/lib/constants";

export type MRRPoint = { label: string; mrr: number; closes: number };
export type FunnelPoint = { statut: string; count: number };
export type BreakdownPoint = { name: string; count: number };

// Série MRR sur les 12 dernières semaines (depuis la table KPI)
export async function getMRRSeries(): Promise<MRRPoint[]> {
  const kpis = await db.kPI.findMany({
    orderBy: [{ annee: "asc" }, { semaine: "asc" }],
    take: 12,
  });
  return kpis.map((k) => ({
    label: `S${k.semaine}`,
    mrr: k.mrr,
    closes: k.closes,
  }));
}

// Funnel : nombre de prospects par statut (dans l'ordre du pipeline)
export async function getFunnel(): Promise<FunnelPoint[]> {
  const grouped = await db.prospect.groupBy({
    by: ["statut"],
    _count: { _all: true },
  });
  const map = new Map(grouped.map((g) => [g.statut, g._count._all]));
  return STATUTS_PROSPECT.map((s) => ({
    statut: s,
    count: map.get(s) ?? 0,
  }));
}

// Répartition des prospects par secteur
export async function getBySecteur(): Promise<BreakdownPoint[]> {
  const grouped = await db.prospect.groupBy({
    by: ["secteur"],
    _count: { _all: true },
  });
  const map = new Map(grouped.map((g) => [g.secteur, g._count._all]));
  return SECTEURS.map((s) => ({ name: s, count: map.get(s) ?? 0 }));
}

// Répartition des prospects par canal d'acquisition
export async function getByCanal(): Promise<BreakdownPoint[]> {
  const grouped = await db.prospect.groupBy({
    by: ["canal"],
    _count: { _all: true },
  });
  const map = new Map(grouped.map((g) => [g.canal, g._count._all]));
  return CANAUX.map((c) => ({ name: c, count: map.get(c) ?? 0 }));
}

// Prospects à traiter aujourd'hui ou en retard — limité aux actions du jour
export async function getActionsDuJour(limit = 10) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  return db.prospect.findMany({
    where: {
      prochainStep: { lte: end },
      statut: { notIn: ["Signé", "Perdu"] },
    },
    orderBy: [{ urgence: "asc" }, { prochainStep: "asc" }],
    take: limit,
  });
}
