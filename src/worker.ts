// Worker standalone : lance le cron prospector.
// Lancer avec : npm run prospector:worker (tsx charge .env via --env-file)
// Garde le process vivant (ne pas killer pour que le cron reste actif).

import { startCron } from "./lib/prospector/cron";

console.log("[worker] Klaivia prospector worker starting…");
startCron();

// Keep-alive pour node-cron
process.on("SIGINT", () => {
  console.log("[worker] SIGINT — shutting down");
  process.exit(0);
});
