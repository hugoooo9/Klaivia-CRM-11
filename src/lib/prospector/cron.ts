// Cron quotidien 03:00 Europe/Zurich — démarre UNIQUEMENT si PROSPECTOR_CRON=true.
// Importer et appeler startCron() depuis un script séparé (src/worker.ts), JAMAIS depuis Next.js runtime.

import cron from "node-cron";
import { runImport } from "./runImport";

let started = false;

export function startCron() {
  if (started) return;
  if (process.env.PROSPECTOR_CRON !== "true") {
    console.log("[prospector] PROSPECTOR_CRON!=true — cron désactivé");
    return;
  }
  // "0 3 * * *" = chaque jour à 03:00, fuseau configurable
  cron.schedule(
    "0 3 * * *",
    async () => {
      console.log("[prospector] cron 03:00 — start");
      try {
        const stats = await runImport();
        console.log("[prospector] cron stats:", stats);
      } catch (e) {
        console.error("[prospector] cron failed:", (e as Error).message);
      }
    },
    { timezone: "Europe/Zurich" },
  );
  started = true;
  console.log("[prospector] cron démarré — prochaine exécution : 03:00 Europe/Zurich");
}
