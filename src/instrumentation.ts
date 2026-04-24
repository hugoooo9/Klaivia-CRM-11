// Instrumentation Next 16 — applique les migrations via SQL brut au boot (pas de CLI).
// Hostinger bloque `npx prisma migrate deploy`, donc on lit `prisma/migrations/*/migration.sql`
// et on exécute chaque statement via PrismaClient.$executeRawUnsafe.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_BOOT_MIGRATE === "true") return;

  const { PrismaClient } = await import("@prisma/client");
  const fs = await import("node:fs");
  const path = await import("node:path");

  const prisma = new PrismaClient();
  try {
    // 1. Détecte si les tables existent déjà (idempotent)
    const existing = (await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='Prospect'`,
    )) as { name: string }[];

    if (existing.length > 0) {
      console.log("[instrumentation] tables OK, skip migration");
      return;
    }

    // 2. Nettoie tables orphelines (new_*) laissées par un boot précédent qui a crashé
    const orphans = (await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'new_%'`,
    )) as { name: string }[];
    for (const o of orphans) {
      await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${o.name}"`);
      console.log(`[instrumentation] cleaned orphan table ${o.name}`);
    }

    // 3. Liste et trie les dossiers de migration (ordre chronologique par nom)
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

    console.log(`[instrumentation] applique ${dirs.length} migration(s)…`);

    for (const dir of dirs) {
      const sqlFile = path.join(migrationsDir, dir, "migration.sql");
      if (!fs.existsSync(sqlFile)) continue;

      const raw = fs.readFileSync(sqlFile, "utf-8");
      // Strip les lignes de commentaires SQL (--) AVANT le split, sinon elles
      // collent au début du premier statement et le filter les rejette en entier.
      const cleaned = raw
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n");

      const statements = cleaned
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      for (const stmt of statements) {
        await prisma.$executeRawUnsafe(stmt);
      }
      console.log(`[instrumentation] migration ${dir} appliquée (${statements.length} stmts)`);
    }

    console.log("[instrumentation] toutes les migrations OK");
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
    console.error("[instrumentation] migration failed:", msg);
  } finally {
    await prisma.$disconnect();
  }
}
