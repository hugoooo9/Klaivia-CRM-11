// Stats globales affichées dans la Sidebar et le Dashboard
import { db } from "@/lib/db";

export type GlobalStats = {
  mrr: number;
  tauxConversion: number;
  totalProspects: number;
  signesCount: number;
  perdusCount: number;
  enRetard: number;
};

/**
 * Calcule les stats globales à afficher dans la Sidebar et le Dashboard.
 * MRR = somme des clients Actif.
 * Conversion = (signés + clients actifs) / (total prospects hors "Perdu").
 */
export async function getGlobalStats(): Promise<GlobalStats> {
  const now = new Date();

  const [clientsActifs, prospects, enRetard] = await Promise.all([
    db.client.findMany({ where: { statut: "Actif" }, select: { mrrCHF: true } }),
    db.prospect.findMany({ select: { statut: true } }),
    db.prospect.count({
      where: {
        prochainStep: { lt: now },
        statut: { notIn: ["Signé", "Perdu"] },
      },
    }),
  ]);

  const mrr = clientsActifs.reduce((acc, c) => acc + c.mrrCHF, 0);
  const totalProspects = prospects.length;
  const signesCount = prospects.filter((p) => p.statut === "Signé").length;
  const perdusCount = prospects.filter((p) => p.statut === "Perdu").length;
  const horsPerdus = totalProspects - perdusCount;
  const tauxConversion = horsPerdus > 0 ? (signesCount / horsPerdus) * 100 : 0;

  return { mrr, tauxConversion, totalProspects, signesCount, perdusCount, enRetard };
}
