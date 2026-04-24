// Instrumentation Next 16 — crée les tables au boot via SQL brut (pas de CLI).
// Hostinger bloque `npx prisma migrate deploy` (PATH / permissions), donc on applique
// les fichiers `prisma/migrations/*/migration.sql` directement via PrismaClient.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SKIP_BOOT_MIGRATE === "true") return;

  const { PrismaClient } = await import("@prisma/client");
  const fs = await import("node:fs");
  const path = await import("node:path");

  const prisma = new PrismaClient();
  try {
    // 1. Détecte si les tables existent déjà via sqlite_master (idempotent)
    const existing = (await prisma.$queryRawUnsafe(
      `SELECT name FROM sqlite_master WHERE type='table' AND name='Prospect'`,
    )) as { name: string }[];

    if (existing.length > 0) {
      console.log("[instrumentation] tables OK, skip migration");
      return;
    }

    // 2. Liste et trie les dossiers de migration (ordre chronologique par nom)
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

      const sql = fs.readFileSync(sqlFile, "utf-8");
      // Split par ; tout en ignorant les lignes vides et commentaires SQL
      const statements = sql
        .split(";")
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith("--"));

      for (const stmt of statements) {
        await prisma.$executeRawUnsafe(stmt);
      }
      console.log(`[instrumentation] migration ${dir} appliquée`);
    }

    console.log("[instrumentation] toutes les migrations OK");
  } catch (e) {
    const msg = e instanceof Error ? `${e.message}\n${e.stack}` : String(e);
    console.error("[instrumentation] migration failed:", msg);
  } finally {
    await prisma.$disconnect();
  }
}
