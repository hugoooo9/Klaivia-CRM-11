// Orchestrateur : FETCH Zefix → FILTER ICP → UPSERT → queue enrich + score.
// Appelé par le cron 03:00 OU manuellement via POST /api/prospector/run.

import { searchZefixByCanton, applyIcpFilter, type ZefixCompany } from "./sources/zefix";
import { upsertFromZefix } from "./enrichment/dedupe";
import { enrichProspect } from "./enrichment/enrichProspect";
import { scoreProspect } from "./scoring/icpScorer";
import { enrichQueue, scoringQueue } from "./queue";
import { ROMAND_CANTONS, type RomandCanton } from "./constants";

export type ImportStats = {
  fetched: number;
  rejected: number;
  upsertedCreated: number;
  upsertedUpdated: number;
  rejectReasons: Record<string, number>;
};

/**
 * Run complet : parcourt les cantons romands, filtre, upsert, enqueue enrich+score.
 * Les étapes enrich/score sont asynchrones (retournent immédiatement, travail en background).
 */
export async function runImport(opts: { maxPerCanton?: number } = {}): Promise<ImportStats> {
  const { maxPerCanton = 50 } = opts;
  const stats: ImportStats = {
    fetched: 0,
    rejected: 0,
    upsertedCreated: 0,
    upsertedUpdated: 0,
    rejectReasons: {},
  };

  for (const canton of ROMAND_CANTONS as readonly RomandCanton[]) {
    let companies: ZefixCompany[] = [];
    try {
      companies = await searchZefixByCanton(canton, { maxResults: maxPerCanton });
    } catch (e) {
      console.error(`[prospector] Zefix ${canton} failed:`, (e as Error).message);
      continue;
    }
    stats.fetched += companies.length;

    for (const c of companies) {
      const r = applyIcpFilter(c);
      if (!r.accepted) {
        stats.rejected += 1;
        const key = r.reason?.split(":")[0] ?? "unknown";
        stats.rejectReasons[key] = (stats.rejectReasons[key] ?? 0) + 1;
        continue;
      }
      try {
        const { id, created } = await upsertFromZefix(c, r.nogaGuessed ?? null);
        if (created) stats.upsertedCreated += 1;
        else stats.upsertedUpdated += 1;

        // Enqueue enrich → puis score (chaîné)
        enrichQueue.add(async () => {
          try {
            const outcome = await enrichProspect(id);
            if (outcome.pipelineAuto === "ENRICHED") {
              scoringQueue.add(async () => {
                try {
                  await scoreProspect(id);
                } catch (e) {
                  console.warn(`[prospector] score ${id} failed:`, (e as Error).message);
                }
              });
            }
          } catch (e) {
            console.warn(`[prospector] enrich ${id} failed:`, (e as Error).message);
          }
        });
      } catch (e) {
        console.error(`[prospector] upsert ${c.uid} failed:`, (e as Error).message);
      }
    }
  }

  return stats;
}
