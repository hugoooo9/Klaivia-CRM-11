// Queue in-memory (p-queue) — remplace BullMQ tant qu'on reste sur SQLite.
// Limite la concurrence par type de job pour respecter les rate limits externes.

import PQueue from "p-queue";

// Import/enrichissement : séquentiel (respect 1 req/s Zefix + 1.5 req/s localCh)
export const enrichQueue = new PQueue({ concurrency: 1 });

// Scoring LLM : concurrence 3 (Claude tolère bien, on limite le coût)
export const scoringQueue = new PQueue({ concurrency: 3 });

// Métadonnées job en cours (pour UI /api/prospector/status)
export type JobStats = {
  pending: number;
  size: number;
  isPaused: boolean;
};

export function getStats() {
  return {
    enrich: { pending: enrichQueue.pending, size: enrichQueue.size, isPaused: enrichQueue.isPaused } as JobStats,
    scoring: { pending: scoringQueue.pending, size: scoringQueue.size, isPaused: scoringQueue.isPaused } as JobStats,
  };
}
