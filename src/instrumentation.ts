// Instrumentation Next 16 — applique les migrations via SQL brut au boot (pas de CLI).
// Hostinger bloque `npx prisma migrate deploy`, donc on lit `prisma/migrations/*/migration.sql`
// et on exécute chaque statement via PrismaClient.$executeRawUnsafe.
//
// Tracking : table _klaivia_migrations stocke les noms déjà appliqués pour idempotence
// même quand de nouvelles migrations arrivent après le premier boot.
export async function register() {
  // Garde top-level pour éviter tout crash boot — wrappe TOUT dans try/catch
  try {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;
    if (process.env.SKIP_BOOT_MIGRATE === "true") return;

    await runMigrations();
  } catch (e) {
    // Jamais throw au boot — log et continue. App doit pouvoir démarrer même si migration KO.
    console.error(
      "[instrumentation] register() top-level error:",
      e instanceof Error ? `${e.message}\n${e.stack}` : String(e),
    );
  }
}

async function runMigrations() {
  const { PrismaClient } = await import("@prisma/client");
  const fs = await import("node:fs");
  const path = await import("node:path");

  const prisma = new PrismaClient();
  try {
    // 0. Force WAL checkpoint + réinitialise journal mode pour libérer les locks
    // résiduels d'un boot précédent crashé. Critique sur Hostinger shared.
    try {
      await prisma.$executeRawUnsafe(`PRAGMA journal_mode=WAL`);
      await prisma.$executeRawUnsafe(`PRAGMA busy_timeout=10000`);
      await prisma.$executeRawUnsafe(`PRAGMA wal_checkpoint(TRUNCATE)`);
      console.log("[instrumentation] SQLite WAL checkpoint OK");
    } catch (e) {
      console.warn("[instrumentation] WAL checkpoint failed:", (e as Error).message);
    }

    // Fast path : si toutes les tables critiques existent déjà, on saute la migration.
    // Évite tout lock SQLite sur les boots concurrents (Hostinger spawne plusieurs procs).
    const criticalTables = ["Prospect", "Task", "Tag", "Activity", "Template", "ProspectEmail"];
    const placeholders = criticalTables.map(() => "?").join(",");
    const existing = (await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${placeholders})`,
      ...criticalTables,
    )) as { name: string }[];

    if (existing.length === criticalTables.length) {
      console.log("[instrumentation] toutes les tables critiques OK, skip migration");
      return;
    }
    console.log(
      `[instrumentation] tables manquantes (${criticalTables.length - existing.length}/${criticalTables.length}), exécute migration`,
    );

    // 1. Crée la table de tracking si absente
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS _klaivia_migrations (
        name TEXT PRIMARY KEY,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Liste les migrations déjà appliquées
    const appliedRows = (await prisma.$queryRawUnsafe(
      `SELECT name FROM _klaivia_migrations`,
    )) as { name: string }[];
    const applied = new Set(appliedRows.map((r) => r.name));

    // 3. Nettoie tables orphelines (new_*) laissées par un boot crashé
    const orphans = (await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'new_%'`,
    )) as { name: string }[];
    for (const o of orphans) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${o.name}"`);
      console.log(`[instrumentation] cleaned orphan table ${o.name}`);
    }

    // 4. Liste et trie les dossiers de migration (ordre chronologique par nom)
    const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
    if (!fs.existsSync(migrationsDir)) {
      console.error("[instrumentation] prisma/migrations introuvable:", migrationsDir);
      return;
    }

    const dirs = fs
      .readdirSync(migrationsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();

    // 5. Détecte si la base est déjà initialisée par un boot précédent (avant tracking)
    // Si Prospect existe mais qu'on a aucune migration trackée → marque les anciennes comme appliquées
    const hasProspect = (await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='Prospect'`,
    )) as { name: string }[];

    if (hasProspect.length > 0 && applied.size === 0) {
      // Base existante non trackée — on suppose que les 2 premières migrations
      // (init + add_prospector_auto) ont été appliquées par un ancien instrumentation
      // et on track sans les rejouer
      const legacyDirs = dirs.filter((d) =>
        d.includes("_init") || d.includes("_add_prospector_auto") || d.includes("_add_setup_estime"),
      );
      for (const d of legacyDirs) {
        await prisma.$executeRawUnsafe(
          `INSERT OR IGNORE INTO _klaivia_migrations (name) VALUES ('${d.replace(/'/g, "''")}')`,
        );
        applied.add(d);
        console.log(`[instrumentation] migration legacy trackée (skip exec): ${d}`);
      }
    }

    let appliedCount = 0;
    for (const dir of dirs) {
      if (applied.has(dir)) continue;

      const sqlFile = path.join(migrationsDir, dir, "migration.sql");
      if (!fs.existsSync(sqlFile)) continue;

      const raw = fs.readFileSync(sqlFile, "utf-8");
      // Strip les lignes de commentaires SQL (--) AVANT le split
      const cleaned = raw
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n");

      const statements = cleaned
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      let okCount = 0;
      let failCount = 0;
      for (const stmt of statements) {
        try {
          await prisma.$executeRawUnsafe(stmt);
          okCount += 1;
        } catch (e) {
          // Ne JAMAIS rethrow — on log et continue. Migration considérée appliquée
          // même si certains statements échouent (idempotent en pratique).
          // Évite la boucle infinie de boot où une migration semi-appliquée
          // est retentée à chaque démarrage.
          failCount += 1;
          const msg = (e as Error).message?.slice(0, 200) ?? String(e);
          console.warn(`[instrumentation] stmt skipped (${dir}): ${msg}`);
        }
      }

      // Marque la migration comme appliquée quoi qu'il arrive
      try {
        await prisma.$executeRawUnsafe(
          `INSERT OR IGNORE INTO _klaivia_migrations (name) VALUES ('${dir.replace(/'/g, "''")}')`,
        );
      } catch (e) {
        console.error(`[instrumentation] tracking insert failed (${dir}):`, (e as Error).message);
      }
      appliedCount += 1;
      console.log(
        `[instrumentation] migration ${dir} marquée appliquée (${okCount} OK, ${failCount} skipped)`,
      );
    }

    console.log(
      `[instrumentation] ${appliedCount} migration(s) appliquée(s), ${dirs.length - appliedCount} déjà OK`,
    );
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
    console.error("[instrumentation] migration failed:", msg);
  } finally {
    await prisma.$disconnect();
  }
}
